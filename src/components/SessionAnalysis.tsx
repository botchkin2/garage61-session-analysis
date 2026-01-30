import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  RacingCard,
  RacingButton,
  MetricCard,
  RacingDivider,
  LapTime,
} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData, Lap} from '@/types';
import {useLaps} from '@/hooks/useApiQueries';

interface SessionAnalysisProps {
  sessionData: SessionData;
  onBack: () => void;
  onMultiLapComparison?: (selectedLapIds: Set<string>) => void;
}

const SessionAnalysis: React.FC<SessionAnalysisProps> = ({
  sessionData,
  onBack,
  onMultiLapComparison,
}) => {
  // All hooks must be called before any conditional logic
  const [laps, setLaps] = useState<Lap[]>([]);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [selectedLapIds, setSelectedLapIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'time' | 'lapNumber'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedLaps, setExpandedLaps] = useState<Set<string>>(new Set());
  const [lapsSectionExpanded, setLapsSectionExpanded] =
    useState<boolean>(false);

  // Handle lap selection
  const toggleLapSelection = (lapId: string) => {
    setSelectedLapIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lapId)) {
        newSet.delete(lapId);
      } else {
        newSet.add(lapId);
      }
      return newSet;
    });
  };

  const selectAllLaps = () => {
    setSelectedLapIds(new Set(laps.map(lap => lap.id)));
  };

  const selectCleanLaps = () => {
    setSelectedLapIds(
      new Set(laps.filter(lap => lap.clean).map(lap => lap.id)),
    );
  };

  const clearSelection = () => {
    setSelectedLapIds(new Set());
  };

  // Handle sort change
  const handleSortChange = (newSortBy: 'time' | 'lapNumber') => {
    if (sortBy === newSortBy) {
      // Toggle direction if same sort type
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort type, default to ascending
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  };

  // Get selected laps for calculations
  const selectedLaps = laps.filter(lap => selectedLapIds.has(lap.id));

  // Calculate optimal sector times from all selected laps
  const getOptimalLapData = () => {
    const sectorMap = new Map<number, number>();

    // Find the best time for each sector across all selected laps
    selectedLaps.forEach(lap => {
      if (lap.sectors && Array.isArray(lap.sectors)) {
        lap.sectors.forEach((sector: any, sectorIndex: number) => {
          // Based on the API response, sectors are: {sectorTime: number, incomplete: boolean}
          if (
            sector &&
            typeof sector.sectorTime === 'number' &&
            sector.sectorTime > 0 &&
            !sector.incomplete
          ) {
            const sectorNum = sectorIndex; // Use array index as sector number (0-based)
            const currentBest = sectorMap.get(sectorNum);
            if (currentBest === undefined || sector.sectorTime < currentBest) {
              sectorMap.set(sectorNum, sector.sectorTime);
            }
          }
        });
      }
    });

    // Convert to sorted array for display (keep original sector numbers)
    const optimalSectors = Array.from(sectorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([sector, time]) => ({sector, time})); // Keep original 0-based internally

    // Calculate theoretical optimal lap time
    const optimalLapTime = optimalSectors.reduce(
      (sum, sector) => sum + sector.time,
      0,
    );

    return {optimalSectors, optimalLapTime};
  };

  // Calculate sector variance analysis
  const getSectorVarianceData = () => {
    const sectorStats = new Map<
      number,
      {
        times: number[];
        sum: number;
        sumSquares: number;
        count: number;
      }
    >();

    // Collect all valid sector times for each sector
    selectedLaps.forEach(lap => {
      if (lap.sectors && Array.isArray(lap.sectors)) {
        lap.sectors.forEach((sector: any, sectorIndex: number) => {
          if (
            sector &&
            typeof sector.sectorTime === 'number' &&
            sector.sectorTime > 0 &&
            !sector.incomplete
          ) {
            const sectorNum = sectorIndex;
            if (!sectorStats.has(sectorNum)) {
              sectorStats.set(sectorNum, {
                times: [],
                sum: 0,
                sumSquares: 0,
                count: 0,
              });
            }
            const stats = sectorStats.get(sectorNum)!;
            stats.times.push(sector.sectorTime);
            stats.sum += sector.sectorTime;
            stats.sumSquares += sector.sectorTime * sector.sectorTime;
            stats.count += 1;
          }
        });
      }
    });

    // Calculate variance and standard deviation for each sector
    const sectorVariances = Array.from(sectorStats.entries())
      .map(([sectorNum, stats]) => {
        const mean = stats.sum / stats.count;
        const variance = stats.sumSquares / stats.count - mean * mean;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean; // Lower is better consistency

        // Find best time for this sector
        const bestTime = Math.min(...stats.times);

        return {
          sector: sectorNum,
          mean,
          variance,
          stdDev,
          coefficientOfVariation,
          bestTime,
          lapCount: stats.count,
          times: stats.times,
          potentialImprovement: (mean - bestTime) * stats.count, // Total time lost due to inconsistency
        };
      })
      .sort((a, b) => b.coefficientOfVariation - a.coefficientOfVariation); // Sort by most inconsistent first

    return sectorVariances;
  };

  const {optimalSectors, optimalLapTime} = getOptimalLapData();
  const sectorVariances = getSectorVarianceData();

  // Function to format lap time delta
  const formatLapDelta = (delta: number): string => {
    if (delta === 0) {
      return '±0.000';
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  };

  // Function to get delta color
  const getDeltaColor = (delta: number) => {
    if (delta < 0) {
      return RacingTheme.colors.success;
    } // Faster than optimal
    if (delta > 0) {
      return RacingTheme.colors.error;
    } // Slower than optimal
    return RacingTheme.colors.textSecondary; // Equal to optimal
  };

  // Toggle lap expansion
  const toggleLapExpansion = (lapId: string) => {
    setExpandedLaps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lapId)) {
        newSet.delete(lapId);
      } else {
        newSet.add(lapId);
      }
      return newSet;
    });
  };

  // Memoize query parameters to ensure stable reference for React Query deduplication
  const lapsQueryParams = useMemo(
    () =>
      sessionData
        ? {
            limit: 1000,
            drivers: 'me',
            event: sessionData.eventId,
            unclean: true,
            group: 'none',
          }
        : undefined,
    [sessionData?.eventId],
  );

  // Use cached laps query - only when sessionData is available
  const {
    data: lapsResponse,
    isLoading,
    error,
  } = useLaps(lapsQueryParams, {enabled: !!lapsQueryParams});

  // Set laps and default selection when data loads
  useEffect(() => {
    if (lapsResponse?.items) {
      setLaps(lapsResponse.items);
      // Default to selecting all clean laps
      setSelectedLapIds(
        new Set(lapsResponse.items.filter(lap => lap.clean).map(lap => lap.id)),
      );
    }
  }, [lapsResponse]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: RacingTheme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Add null checks to prevent runtime errors - after all hooks are called
  if (!sessionData || !sessionData.car || !sessionData.track) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={RacingTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading session data...</Text>
      </View>
    );
  }

  // Determine if we should use mobile layout (screen width < 768px)
  const isMobile = dimensions.width < 768;

  const formatLapTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  const getSessionTypeName = (type: number): string => {
    switch (type) {
      case 1:
        return 'Practice';
      case 2:
        return 'Qualifying';
      case 3:
        return 'Race';
      default:
        return 'Unknown';
    }
  };

  if (isLoading && !lapsResponse) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size='large' color={RacingTheme.colors.primary} />
          <Text style={styles.loadingText}>LOADING SESSION LAPS...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>ERROR LOADING SESSION LAPS</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}>
        <Animated.View style={[{opacity: fadeAnim}]}>
          <View style={styles.container}>
            {/* Back Button */}
            <View style={styles.backButtonContainer}>
              <RacingButton
                title='⬅ BACK TO SESSIONS'
                onPress={onBack}
                style={styles.backButton}
              />
            </View>

            {/* Session Header */}
            <View style={styles.header}>
              <Text style={styles.title}>SESSION ANALYSIS</Text>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>
                  {sessionData.car.name} • {sessionData.track.name}
                </Text>
                <Text style={styles.sessionDetails}>
                  {getSessionTypeName(sessionData.sessionType)} •{' '}
                  {new Date(sessionData.startTime).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Summary Metrics */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title='BEST LAP'
                value={
                  selectedLaps.length > 0
                    ? formatLapTime(
                        Math.min(...selectedLaps.map(l => l.lapTime)),
                      )
                    : '--:--.---'
                }
                style={styles.metricCard}
              />
              <MetricCard
                title='AVG LAP'
                value={
                  selectedLaps.length > 0
                    ? formatLapTime(
                        selectedLaps.reduce((sum, l) => sum + l.lapTime, 0) /
                          selectedLaps.length,
                      )
                    : '--:--.---'
                }
                style={styles.metricCard}
              />
            </View>

            {/* Optimal Sector Analysis */}
            {optimalSectors.length > 0 && (
              <View style={styles.optimalSection}>
                <Text style={styles.sectionTitle}>OPTIMAL LAP ANALYSIS</Text>

                <View
                  style={
                    isMobile
                      ? styles.optimalCombinedRowMobile
                      : styles.optimalCombinedRow
                  }>
                  {/* Theoretical Optimal Lap */}
                  <RacingCard style={styles.optimalLapCard}>
                    <Text style={styles.optimalLapTitle}>
                      THEORETICAL BEST LAP
                    </Text>
                    <Text style={styles.optimalLapTime}>
                      {formatLapTime(optimalLapTime)}
                    </Text>
                    <Text style={styles.optimalLapLabel}>
                      Best sectors combined
                    </Text>
                  </RacingCard>

                  {/* Optimal Sector Times */}
                  <View style={styles.sectorsContainer}>
                    <Text style={styles.sectorsTitle}>BEST SECTOR TIMES</Text>
                    {isMobile ? (
                      <View style={styles.mobileSectorsList}>
                        {optimalSectors.map(sector => (
                          <View
                            key={sector.sector}
                            style={styles.mobileSectorItem}>
                            <View style={styles.mobileSectorHeader}>
                              <Text style={styles.mobileSectorNumber}>
                                S{sector.sector}
                              </Text>
                              <Text style={styles.mobileSectorTime}>
                                {formatLapTime(sector.time)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.desktopSectorsGrid}>
                        {optimalSectors.map(sector => (
                          <View
                            key={sector.sector}
                            style={styles.desktopSectorCard}>
                            <Text style={styles.desktopSectorNumber}>
                              S{sector.sector}
                            </Text>
                            <Text style={styles.desktopSectorTime}>
                              {formatLapTime(sector.time)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Lap Selection Controls */}
            <View style={styles.selectionSection}>
              <Text style={styles.sectionTitle}>LAP SELECTION</Text>
              <View style={styles.selectionControls}>
                <RacingButton
                  title='SELECT ALL'
                  onPress={selectAllLaps}
                  style={styles.selectionButton}
                />
                <RacingButton
                  title='CLEAN LAPS'
                  onPress={selectCleanLaps}
                  style={styles.selectionButton}
                />
                <RacingButton
                  title='CLEAR ALL'
                  onPress={clearSelection}
                  style={styles.selectionButton}
                />
                {onMultiLapComparison && selectedLaps.length > 0 && (
                  <RacingButton
                    title='📊 COMPARE LAPS'
                    onPress={() => onMultiLapComparison(selectedLapIds)}
                    style={
                      [styles.selectionButton, styles.compareButton] as any
                    }
                  />
                )}
              </View>
              <Text style={styles.selectionInfo}>
                {selectedLaps.length} of {laps.length} laps selected for
                analysis
              </Text>
            </View>

            {/* Lap Comparison */}
            <View style={styles.comparisonSection}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setLapsSectionExpanded(!lapsSectionExpanded)}
                activeOpacity={0.7}>
                <Text style={styles.sectionTitle}>
                  LAP COMPARISON ({laps.length} LAPS)
                </Text>
                <Text style={styles.collapseIcon}>
                  {lapsSectionExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {lapsSectionExpanded && (
                <>
                  {/* Sort Controls */}
                  <View style={styles.sortControls}>
                    <Text style={styles.sortLabel}>SORT BY:</Text>
                    <View style={styles.sortButtons}>
                      <TouchableOpacity
                        style={[
                          styles.sortButton,
                          sortBy === 'time' && styles.sortButtonActive,
                        ]}
                        onPress={() => handleSortChange('time')}>
                        <Text
                          style={[
                            styles.sortButtonText,
                            sortBy === 'time' && styles.sortButtonTextActive,
                          ]}>
                          TIME{' '}
                          {sortBy === 'time' &&
                            (sortDirection === 'asc' ? '↑' : '↓')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.sortButton,
                          sortBy === 'lapNumber' && styles.sortButtonActive,
                        ]}
                        onPress={() => handleSortChange('lapNumber')}>
                        <Text
                          style={[
                            styles.sortButtonText,
                            sortBy === 'lapNumber' &&
                              styles.sortButtonTextActive,
                          ]}>
                          LAP #{' '}
                          {sortBy === 'lapNumber' &&
                            (sortDirection === 'asc' ? '↑' : '↓')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isMobile ? (
                    /* Mobile Card Layout */
                    <View style={styles.mobileLapsContainer}>
                      {(() => {
                        // Sort laps based on current sort settings
                        const sortedLaps = [...laps].sort((a, b) => {
                          let comparison = 0;

                          if (sortBy === 'time') {
                            comparison = a.lapTime - b.lapTime;
                          } else if (sortBy === 'lapNumber') {
                            comparison = a.lapNumber - b.lapNumber;
                          }

                          return sortDirection === 'asc'
                            ? comparison
                            : -comparison;
                        });

                        return sortedLaps.map((lap, index) => {
                          const isSelected = selectedLapIds.has(lap.id);
                          const isExpanded = expandedLaps.has(lap.id);
                          const lapDelta =
                            optimalLapTime > 0
                              ? lap.lapTime - optimalLapTime
                              : 0;
                          return (
                            <View key={lap.id}>
                              <TouchableOpacity
                                onPress={() => toggleLapSelection(lap.id)}
                                activeOpacity={0.7}>
                                <RacingCard
                                  style={
                                    isSelected
                                      ? {
                                          ...styles.mobileLapCard,
                                          ...styles.mobileLapCardSelected,
                                        }
                                      : styles.mobileLapCard
                                  }>
                                  <View style={styles.mobileLapHeader}>
                                    <View
                                      style={[
                                        styles.mobileLapRank,
                                        isSelected &&
                                          styles.mobileLapRankSelected,
                                      ]}>
                                      <Text
                                        style={[
                                          styles.mobileLapRankText,
                                          isSelected &&
                                            styles.mobileLapRankTextSelected,
                                        ]}>
                                        #{index + 1}
                                      </Text>
                                    </View>
                                    <View style={styles.mobileLapStatus}>
                                      {lap.clean ? (
                                        <Text
                                          style={[
                                            styles.mobileStatusBadge,
                                            styles.mobileCleanBadge,
                                          ]}>
                                          ✓ CLEAN
                                        </Text>
                                      ) : (
                                        <Text
                                          style={[
                                            styles.mobileStatusBadge,
                                            styles.mobileUncleanBadge,
                                          ]}>
                                          ⚠ OFF-TRACK
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  <View style={styles.mobileLapDetails}>
                                    <View style={styles.mobileLapDetail}>
                                      <Text style={styles.mobileLapDetailLabel}>
                                        LAP NUMBER
                                      </Text>
                                      <Text style={styles.mobileLapDetailValue}>
                                        {lap.lapNumber}
                                      </Text>
                                    </View>
                                    <View style={styles.mobileLapDetail}>
                                      <View style={styles.mobileLapTimeHeader}>
                                        <Text
                                          style={styles.mobileLapDetailLabel}>
                                          LAP TIME
                                        </Text>
                                        <TouchableOpacity
                                          style={styles.mobileLapTimeExpand}
                                          onPress={() =>
                                            toggleLapExpansion(lap.id)
                                          }>
                                          <Text
                                            style={[
                                              styles.mobileLapTimeExpandIcon,
                                              isExpanded &&
                                                styles.mobileLapTimeExpandIconActive,
                                            ]}>
                                            {isExpanded ? '▼' : '▶'}
                                          </Text>
                                        </TouchableOpacity>
                                      </View>
                                      <View style={styles.mobileLapTimeRow}>
                                        <LapTime
                                          time={lap.lapTime}
                                          isBest={index === 0}
                                        />
                                        {optimalLapTime > 0 && (
                                          <Text
                                            style={[
                                              styles.mobileLapDelta,
                                              {color: getDeltaColor(lapDelta)},
                                            ]}>
                                            {formatLapDelta(lapDelta)}
                                          </Text>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                </RacingCard>
                              </TouchableOpacity>

                              {/* Expanded Sector Details */}
                              {isExpanded && (
                                <RacingCard style={styles.mobileExpandedCard}>
                                  <Text style={styles.mobileExpandedTitle}>
                                    SECTOR BREAKDOWN
                                  </Text>
                                  {lap.sectors &&
                                  Array.isArray(lap.sectors) &&
                                  lap.sectors.length > 0 ? (
                                    <View style={styles.mobileSectorBreakdown}>
                                      {lap.sectors.map(
                                        (sector: any, sectorIndex: number) => {
                                          if (
                                            !sector ||
                                            typeof sector.sectorTime !==
                                              'number' ||
                                            sector.incomplete
                                          ) {
                                            return null;
                                          }

                                          const sectorNum = sectorIndex; // Use array index as sector number
                                          const optimalSector =
                                            optimalSectors.find(
                                              s => s.sector === sectorNum,
                                            );
                                          const sectorDelta = optimalSector
                                            ? sector.sectorTime -
                                              optimalSector.time
                                            : 0;

                                          return (
                                            <View
                                              key={sectorNum}
                                              style={styles.mobileSectorRow}>
                                              <Text
                                                style={
                                                  styles.mobileSectorLabel
                                                }>
                                                S{sectorNum + 1}
                                              </Text>
                                              <Text
                                                style={styles.mobileSectorTime}>
                                                {formatLapTime(
                                                  sector.sectorTime,
                                                )}
                                              </Text>
                                              {optimalSector && (
                                                <Text
                                                  style={[
                                                    styles.mobileSectorDelta,
                                                    {
                                                      color:
                                                        getDeltaColor(
                                                          sectorDelta,
                                                        ),
                                                    },
                                                  ]}>
                                                  {formatLapDelta(sectorDelta)}
                                                </Text>
                                              )}
                                            </View>
                                          );
                                        },
                                      )}
                                    </View>
                                  ) : (
                                    <Text style={styles.mobileNoData}>
                                      No sector data available
                                    </Text>
                                  )}
                                </RacingCard>
                              )}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  ) : (
                    /* Desktop Table Layout */
                    <RacingCard style={styles.tableCard}>
                      {/* Comparison Table Header */}
                      <View style={styles.tableHeader}>
                        <Text style={styles.headerCell}>RANK</Text>
                        <TouchableOpacity
                          style={styles.headerCellTouchable}
                          onPress={() => handleSortChange('lapNumber')}>
                          <Text
                            style={[
                              styles.headerCell,
                              sortBy === 'lapNumber' && styles.headerCellActive,
                            ]}>
                            LAP #{' '}
                            {sortBy === 'lapNumber' &&
                              (sortDirection === 'asc' ? '↑' : '↓')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.headerCellTouchable}
                          onPress={() => handleSortChange('time')}>
                          <Text
                            style={[
                              styles.headerCell,
                              sortBy === 'time' && styles.headerCellActive,
                            ]}>
                            LAP TIME{' '}
                            {sortBy === 'time' &&
                              (sortDirection === 'asc' ? '↑' : '↓')}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.headerCell}>DELTA</Text>
                        <Text style={styles.headerCell}>STATUS</Text>
                      </View>

                      <RacingDivider />

                      {/* Comparison Table Rows */}
                      {(() => {
                        // Sort laps based on current sort settings
                        const sortedLaps = [...laps].sort((a, b) => {
                          let comparison = 0;

                          if (sortBy === 'time') {
                            comparison = a.lapTime - b.lapTime;
                          } else if (sortBy === 'lapNumber') {
                            comparison = a.lapNumber - b.lapNumber;
                          }

                          return sortDirection === 'asc'
                            ? comparison
                            : -comparison;
                        });

                        return sortedLaps.map((lap, index) => {
                          const isSelected = selectedLapIds.has(lap.id);
                          const isExpanded = expandedLaps.has(lap.id);
                          const lapDelta =
                            optimalLapTime > 0
                              ? lap.lapTime - optimalLapTime
                              : 0;
                          return (
                            <View key={lap.id}>
                              <View
                                style={
                                  isSelected
                                    ? {
                                        ...styles.tableRow,
                                        ...styles.tableRowSelected,
                                      }
                                    : styles.tableRow
                                }>
                                <TouchableOpacity
                                  style={styles.cell}
                                  onPress={() => toggleLapSelection(lap.id)}
                                  activeOpacity={0.7}>
                                  <Text
                                    style={[
                                      styles.cell,
                                      isSelected && styles.cellSelected,
                                    ]}>
                                    #{index + 1}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.tableRowContent,
                                    isExpanded &&
                                      styles.tableRowContentExpanded,
                                  ]}
                                  onPress={() => toggleLapExpansion(lap.id)}
                                  activeOpacity={0.7}>
                                  <Text
                                    style={[
                                      styles.cell,
                                      isSelected && styles.cellSelected,
                                    ]}>
                                    {lap.lapNumber}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.cell,
                                      isSelected && styles.cellSelected,
                                    ]}>
                                    <LapTime
                                      time={lap.lapTime}
                                      isBest={index === 0}
                                    />
                                  </Text>
                                  <Text
                                    style={[
                                      styles.cellDelta,
                                      isSelected && styles.cellSelected,
                                      {color: getDeltaColor(lapDelta)},
                                    ]}>
                                    {optimalLapTime > 0
                                      ? formatLapDelta(lapDelta)
                                      : '--'}
                                  </Text>
                                  <View style={styles.cell}>
                                    {lap.clean ? (
                                      <Text
                                        style={[
                                          styles.statusBadge,
                                          styles.cleanBadge,
                                        ]}>
                                        ✓ CLEAN
                                      </Text>
                                    ) : (
                                      <Text
                                        style={[
                                          styles.statusBadge,
                                          styles.uncleanBadge,
                                        ]}>
                                        ⚠ OFF-TRACK
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.expandCell}>
                                    <Text
                                      style={[
                                        styles.expandIcon,
                                        isExpanded && styles.expandIconExpanded,
                                      ]}>
                                      {isExpanded ? '▼' : '▶'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              </View>

                              {/* Expanded Sector Details for Desktop */}
                              {isExpanded && (
                                <View style={styles.expandedSectorRow}>
                                  <RacingDivider />
                                  <View style={styles.expandedSectorContent}>
                                    <Text style={styles.expandedSectorTitle}>
                                      SECTOR BREAKDOWN
                                    </Text>
                                    {lap.sectors &&
                                    Array.isArray(lap.sectors) &&
                                    lap.sectors.length > 0 ? (
                                      <View style={styles.expandedSectorGrid}>
                                        {lap.sectors.map(
                                          (
                                            sector: any,
                                            sectorIndex: number,
                                          ) => {
                                            if (
                                              !sector ||
                                              typeof sector.sectorTime !==
                                                'number' ||
                                              sector.incomplete
                                            ) {
                                              return null;
                                            }

                                            const sectorNum = sectorIndex; // Use array index as sector number
                                            const optimalSector =
                                              optimalSectors.find(
                                                s => s.sector === sectorNum,
                                              );
                                            const sectorDelta = optimalSector
                                              ? sector.sectorTime -
                                                optimalSector.time
                                              : 0;

                                            return (
                                              <View
                                                key={sectorNum}
                                                style={
                                                  styles.expandedSectorItem
                                                }>
                                                <Text
                                                  style={
                                                    styles.expandedSectorLabel
                                                  }>
                                                  S{sectorNum + 1}
                                                </Text>
                                                <Text
                                                  style={
                                                    styles.expandedSectorTime
                                                  }>
                                                  {formatLapTime(
                                                    sector.sectorTime,
                                                  )}
                                                </Text>
                                                {optimalSector && (
                                                  <Text
                                                    style={[
                                                      styles.expandedSectorDelta,
                                                      {
                                                        color:
                                                          getDeltaColor(
                                                            sectorDelta,
                                                          ),
                                                      },
                                                    ]}>
                                                    {formatLapDelta(
                                                      sectorDelta,
                                                    )}
                                                  </Text>
                                                )}
                                              </View>
                                            );
                                          },
                                        )}
                                      </View>
                                    ) : (
                                      <Text style={styles.expandedNoData}>
                                        No sector data available
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              )}

                              {index < sortedLaps.length - 1 && (
                                <RacingDivider />
                              )}
                            </View>
                          );
                        });
                      })()}
                    </RacingCard>
                  )}
                </>
              )}
            </View>

            {/* Sector Variance Analysis */}
            {sectorVariances.length > 0 && (
              <View style={styles.varianceSection}>
                <Text style={styles.sectionTitle}>
                  SECTOR CONSISTENCY ANALYSIS
                </Text>

                <View style={styles.varianceContent}>
                  {/* Most Inconsistent Sector Highlight */}
                  {sectorVariances.length > 0 && (
                    <RacingCard style={styles.varianceHighlightCard}>
                      <Text style={styles.varianceHighlightTitle}>
                        FOCUS ON THIS SECTOR
                      </Text>
                      <View style={styles.varianceHighlightContent}>
                        <View style={styles.varianceSectorBadge}>
                          <Text style={styles.varianceSectorNumber}>
                            S{sectorVariances[0].sector + 1}
                          </Text>
                        </View>
                        <View style={styles.varianceHighlightStats}>
                          <Text style={styles.varianceHighlightValue}>
                            {(
                              sectorVariances[0].coefficientOfVariation * 100
                            ).toFixed(1)}
                            %
                          </Text>
                          <Text style={styles.varianceHighlightLabel}>
                            INCONSISTENCY SCORE
                          </Text>
                          <Text style={styles.variancePotentialImpact}>
                            {sectorVariances[0].potentialImprovement.toFixed(3)}
                            s
                          </Text>
                          <Text style={styles.variancePotentialLabel}>
                            POTENTIAL TIME SAVINGS
                          </Text>
                        </View>
                      </View>
                    </RacingCard>
                  )}

                  {/* Sector Variance Rankings */}
                  <View style={styles.varianceRankings}>
                    <Text style={styles.varianceRankingsTitle}>
                      SECTOR CONSISTENCY RANKINGS
                    </Text>
                    <Text style={styles.varianceRankingsSubtitle}>
                      Lower % = more consistent • Higher % = where to focus
                    </Text>

                    {isMobile ? (
                      <View style={styles.mobileVarianceList}>
                        {sectorVariances.map((sector, index) => (
                          <View
                            key={sector.sector}
                            style={[
                              styles.mobileVarianceItem,
                              index === 0 && styles.mobileVarianceItemWorst,
                            ]}>
                            <View style={styles.mobileVarianceHeader}>
                              <Text style={styles.mobileVarianceRank}>
                                #{index + 1}
                              </Text>
                              <Text style={styles.mobileVarianceSector}>
                                S{sector.sector + 1}
                              </Text>
                              <Text style={styles.mobileVarianceValue}>
                                {(sector.coefficientOfVariation * 100).toFixed(
                                  1,
                                )}
                                %
                              </Text>
                            </View>
                            <View style={styles.mobileVarianceDetails}>
                              <Text style={styles.mobileVarianceDetail}>
                                Spread: {sector.stdDev.toFixed(3)}s
                              </Text>
                              <Text style={styles.mobileVarianceDetail}>
                                Avg: {formatLapTime(sector.mean)}
                              </Text>
                              <Text style={styles.mobileVarianceDetail}>
                                Potential:{' '}
                                {sector.potentialImprovement.toFixed(3)}s
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <RacingCard style={styles.desktopVarianceTable}>
                        <View style={styles.varianceTableHeader}>
                          <Text style={styles.varianceTableHeaderCell}>
                            RANK
                          </Text>
                          <Text style={styles.varianceTableHeaderCell}>
                            SECTOR
                          </Text>
                          <Text style={styles.varianceTableHeaderCell}>
                            INCONSISTENCY
                          </Text>
                          <Text style={styles.varianceTableHeaderCell}>
                            SPREAD
                          </Text>
                          <Text style={styles.varianceTableHeaderCell}>
                            AVG TIME
                          </Text>
                          <Text style={styles.varianceTableHeaderCell}>
                            TIME SAVINGS
                          </Text>
                        </View>
                        <RacingDivider />
                        {sectorVariances.map((sector, index) => (
                          <View key={sector.sector}>
                            <View
                              style={[
                                styles.varianceTableRow,
                                index === 0 && styles.varianceTableRowWorst,
                              ]}>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                #{index + 1}
                              </Text>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                S{sector.sector + 1}
                              </Text>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                {(sector.coefficientOfVariation * 100).toFixed(
                                  1,
                                )}
                                %
                              </Text>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                {sector.stdDev.toFixed(3)}s
                              </Text>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                {formatLapTime(sector.mean)}
                              </Text>
                              <Text
                                style={[
                                  styles.varianceTableCell,
                                  index === 0 && styles.varianceTableCellWorst,
                                ]}>
                                {sector.potentialImprovement.toFixed(3)}s
                              </Text>
                            </View>
                            {index < sectorVariances.length - 1 && (
                              <RacingDivider />
                            )}
                          </View>
                        ))}
                      </RacingCard>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.bottomSpacing} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RacingTheme.colors.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  container: {
    padding: RacingTheme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: RacingTheme.spacing.md,
    backgroundColor: RacingTheme.colors.background,
  },
  backButtonContainer: {
    marginBottom: RacingTheme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: RacingTheme.spacing.lg,
  },
  title: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    letterSpacing: 2,
    marginBottom: RacingTheme.spacing.sm,
  },
  sessionInfo: {
    backgroundColor: RacingTheme.colors.surface,
    padding: RacingTheme.spacing.md,
    borderRadius: RacingTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  sessionName: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    marginBottom: RacingTheme.spacing.xs,
  },
  sessionDetails: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
  },
  comparisonSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: RacingTheme.spacing.sm,
  },
  collapseIcon: {
    fontSize: RacingTheme.typography.h3,
    color: RacingTheme.colors.primary,
    fontWeight: RacingTheme.typography.bold as any,
  },
  tableCard: {
    padding: RacingTheme.spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: RacingTheme.spacing.sm,
  },
  headerCell: {
    flex: 1,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerCellTouchable: {
    flex: 1,
  },
  headerCellActive: {
    color: RacingTheme.colors.primary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: RacingTheme.spacing.sm,
  },
  cell: {
    flex: 1,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
  },
  statusBadge: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    textAlign: 'center',
    paddingHorizontal: RacingTheme.spacing.xs,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
  },
  cleanBadge: {
    backgroundColor: RacingTheme.colors.success,
    color: RacingTheme.colors.surface,
  },
  uncleanBadge: {
    backgroundColor: RacingTheme.colors.warning,
    color: RacingTheme.colors.surface,
  },
  loadingText: {
    marginTop: RacingTheme.spacing.md,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.primary,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.error,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.lg,
    letterSpacing: 1,
  },
  bottomSpacing: {
    height: RacingTheme.spacing.xxxl,
  },
  mobileLapsContainer: {
    gap: RacingTheme.spacing.md,
  },
  mobileLapCard: {
    padding: RacingTheme.spacing.md,
  },
  mobileLapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.md,
  },
  mobileLapRank: {
    backgroundColor: RacingTheme.colors.primary,
    borderRadius: RacingTheme.borderRadius.sm,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  mobileLapRankText: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.surface,
    textAlign: 'center',
  },
  mobileLapStatus: {
    alignItems: 'flex-end',
  },
  mobileStatusBadge: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    textAlign: 'center',
  },
  mobileCleanBadge: {
    backgroundColor: RacingTheme.colors.success,
    color: RacingTheme.colors.surface,
  },
  mobileUncleanBadge: {
    backgroundColor: RacingTheme.colors.warning,
    color: RacingTheme.colors.surface,
  },
  mobileLapDetails: {
    gap: RacingTheme.spacing.sm,
  },
  mobileLapDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileLapDetailLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  mobileLapDetailValue: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.text,
    textAlign: 'right',
    flex: 1,
  },
  mobileLapTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  mobileLapDelta: {
    fontSize: RacingTheme.typography.caption,
    fontFamily: RacingTheme.typography.mono,
    fontWeight: RacingTheme.typography.bold as any,
    marginLeft: RacingTheme.spacing.sm,
  },
  mobileLapTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: RacingTheme.spacing.xs,
  },
  mobileLapTimeExpand: {
    paddingHorizontal: RacingTheme.spacing.xs,
    paddingVertical: RacingTheme.spacing.xs,
  },
  mobileLapTimeExpandIcon: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
  },
  mobileLapTimeExpandIconActive: {
    color: RacingTheme.colors.secondary,
  },
  mobileExpandedCard: {
    marginTop: RacingTheme.spacing.xs,
    marginLeft: RacingTheme.spacing.lg,
    marginRight: RacingTheme.spacing.lg,
    padding: RacingTheme.spacing.md,
  },
  mobileExpandedTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.sm,
  },
  mobileSectorBreakdown: {
    gap: RacingTheme.spacing.xs,
  },
  mobileSectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: RacingTheme.spacing.xs,
    paddingHorizontal: RacingTheme.spacing.sm,
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.sm,
  },
  mobileSectorLabel: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
    minWidth: 30,
  },
  mobileSectorTime: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    fontFamily: RacingTheme.typography.mono,
    flex: 1,
    textAlign: 'center',
  },
  mobileSectorDelta: {
    fontSize: RacingTheme.typography.caption,
    fontFamily: RacingTheme.typography.mono,
    fontWeight: RacingTheme.typography.bold as any,
    minWidth: 50,
    textAlign: 'right',
  },
  mobileNoData: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Selection Controls Styles
  selectionSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  selectionControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RacingTheme.spacing.sm,
    marginBottom: RacingTheme.spacing.md,
  },
  selectionButton: {
    flex: 1,
    minWidth: 80,
  },
  selectionInfo: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Sort Controls Styles
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: RacingTheme.spacing.md,
    paddingHorizontal: RacingTheme.spacing.sm,
  },
  sortLabel: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: RacingTheme.spacing.sm,
  },
  sortButton: {
    backgroundColor: RacingTheme.colors.surface,
    paddingHorizontal: RacingTheme.spacing.md,
    paddingVertical: RacingTheme.spacing.sm,
    borderRadius: RacingTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  sortButtonActive: {
    backgroundColor: RacingTheme.colors.primary,
    borderColor: RacingTheme.colors.primary,
  },
  sortButtonText: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortButtonTextActive: {
    color: RacingTheme.colors.surface,
    fontWeight: RacingTheme.typography.bold as any,
  },
  // Selected State Styles
  mobileLapCardSelected: {
    borderColor: RacingTheme.colors.secondary,
    borderWidth: 2,
  },
  mobileLapRankSelected: {
    backgroundColor: RacingTheme.colors.secondary,
  },
  mobileLapRankTextSelected: {
    color: RacingTheme.colors.surface,
  },
  tableRowSelected: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
  },
  tableRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableRowContentExpanded: {
    backgroundColor: RacingTheme.colors.surface,
  },
  cellSelected: {
    color: RacingTheme.colors.secondary,
    fontWeight: RacingTheme.typography.bold as any,
  },
  cellDelta: {
    flex: 1,
    fontSize: RacingTheme.typography.caption,
    fontFamily: RacingTheme.typography.mono,
    fontWeight: RacingTheme.typography.bold as any,
    textAlign: 'center',
  },
  // Optimal Sector Analysis Styles
  optimalSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  optimalCombinedRow: {
    flexDirection: 'row',
    gap: RacingTheme.spacing.md,
    alignItems: 'flex-start',
  },
  optimalCombinedRowMobile: {
    flexDirection: 'column',
    gap: RacingTheme.spacing.md,
  },
  optimalLapCard: {
    alignItems: 'center',
    padding: RacingTheme.spacing.lg,
    flex: 1,
  },
  optimalLapTitle: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: RacingTheme.spacing.sm,
  },
  optimalLapTime: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.secondary,
    fontFamily: RacingTheme.typography.mono,
    marginBottom: RacingTheme.spacing.xs,
  },
  optimalLapLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
  },
  sectorsContainer: {
    flex: 2,
  },
  sectorsTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.sm,
  },
  // Mobile Sector Styles
  mobileSectorsList: {
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.md,
    padding: RacingTheme.spacing.md,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  mobileSectorItem: {
    paddingVertical: RacingTheme.spacing.sm,
  },
  mobileSectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileSectorNumber: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
  },
  // Desktop Sector Styles
  desktopSectorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RacingTheme.spacing.sm,
  },
  desktopSectorCard: {
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.md,
    padding: RacingTheme.spacing.lg,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
    alignItems: 'center',
    minWidth: 120,
    flex: 1,
  },
  desktopSectorNumber: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.xs,
  },
  desktopSectorTime: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
  },
  expandCell: {
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandCellActive: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderRadius: RacingTheme.borderRadius.sm,
  },
  expandIcon: {
    fontSize: RacingTheme.typography.h4,
    color: RacingTheme.colors.primary,
    fontWeight: RacingTheme.typography.bold as any,
  },
  expandIconExpanded: {
    color: RacingTheme.colors.secondary,
  },
  expandedSectorRow: {
    backgroundColor: RacingTheme.colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: RacingTheme.colors.primary,
    marginLeft: RacingTheme.spacing.xl,
    marginRight: RacingTheme.spacing.xl,
  },
  expandedSectorContent: {
    padding: RacingTheme.spacing.md,
  },
  expandedSectorTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.sm,
  },
  expandedSectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RacingTheme.spacing.sm,
  },
  expandedSectorItem: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderRadius: RacingTheme.borderRadius.sm,
    padding: RacingTheme.spacing.sm,
    alignItems: 'center',
    minWidth: 100,
  },
  expandedSectorLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
    fontWeight: RacingTheme.typography.bold as any,
    marginBottom: RacingTheme.spacing.xs,
  },
  expandedSectorTime: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    fontFamily: RacingTheme.typography.mono,
    marginBottom: RacingTheme.spacing.xs,
  },
  expandedSectorDelta: {
    fontSize: RacingTheme.typography.caption,
    fontFamily: RacingTheme.typography.mono,
    fontWeight: RacingTheme.typography.bold as any,
  },
  expandedNoData: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Sector Variance Analysis Styles
  varianceSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  varianceContent: {
    gap: RacingTheme.spacing.md,
  },
  varianceHighlightCard: {
    padding: RacingTheme.spacing.lg,
    alignItems: 'center',
  },
  varianceHighlightTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.md,
    textAlign: 'center',
  },
  varianceHighlightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RacingTheme.spacing.lg,
  },
  varianceSectorBadge: {
    backgroundColor: RacingTheme.colors.warning,
    borderRadius: RacingTheme.borderRadius.md,
    paddingHorizontal: RacingTheme.spacing.lg,
    paddingVertical: RacingTheme.spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  varianceSectorNumber: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.surface,
    fontFamily: RacingTheme.typography.mono,
  },
  varianceHighlightStats: {
    flex: 1,
    alignItems: 'center',
  },
  varianceHighlightValue: {
    fontSize: RacingTheme.typography.h1,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.warning,
    fontFamily: RacingTheme.typography.mono,
    marginBottom: RacingTheme.spacing.xs,
  },
  varianceHighlightLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  variancePotentialImpact: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.error,
    fontFamily: RacingTheme.typography.mono,
    marginBottom: RacingTheme.spacing.xs,
  },
  variancePotentialLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  varianceRankings: {
    flex: 1,
  },
  varianceRankingsTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.xs,
  },
  varianceRankingsSubtitle: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    marginBottom: RacingTheme.spacing.md,
    fontStyle: 'italic',
  },
  // Mobile Variance Styles
  mobileVarianceList: {
    gap: RacingTheme.spacing.sm,
  },
  mobileVarianceItem: {
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.md,
    padding: RacingTheme.spacing.md,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  mobileVarianceItemWorst: {
    borderColor: RacingTheme.colors.warning,
    borderWidth: 2,
  },
  mobileVarianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  mobileVarianceRank: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
  },
  mobileVarianceSector: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
  },
  mobileVarianceValue: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.warning,
    fontFamily: RacingTheme.typography.mono,
  },
  mobileVarianceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileVarianceDetail: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  // Desktop Variance Table Styles
  desktopVarianceTable: {
    padding: RacingTheme.spacing.md,
  },
  varianceTableHeader: {
    flexDirection: 'row',
    paddingVertical: RacingTheme.spacing.sm,
  },
  varianceTableHeaderCell: {
    flex: 1,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  varianceTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: RacingTheme.spacing.sm,
  },
  varianceTableRowWorst: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
  },
  varianceTableCell: {
    flex: 1,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
  },
  varianceTableCellWorst: {
    color: RacingTheme.colors.warning,
    fontWeight: RacingTheme.typography.bold as any,
  },
  // Metrics Styles
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: RacingTheme.spacing.lg,
  },
  metricCard: {
    width: '48%',
    marginBottom: RacingTheme.spacing.md,
  },
  compareButton: {
    backgroundColor: RacingTheme.colors.secondary,
  },
});

export default SessionAnalysis;
