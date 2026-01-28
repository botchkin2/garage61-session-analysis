import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {RacingCard, RacingButton, RacingDivider} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData, Lap} from '@/types';
import {useLaps} from '@/hooks/useApiQueries';
import {MultiLapTimeSeriesChart} from './MultiLapTimeSeriesChart';

interface MultiLapComparisonProps {
  sessionData: SessionData;
  onBack: () => void;
  selectedLapIds?: Set<string>;
}

const MultiLapComparison: React.FC<MultiLapComparisonProps> = ({
  sessionData,
  onBack,
  selectedLapIds,
}) => {
  // All hooks must be called before any conditional logic
  const [laps, setLaps] = useState<Lap[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [_dimensions, _setDimensions] = useState(Dimensions.get('window'));
  const [internalSelectedLapIds, setInternalSelectedLapIds] = useState<
    Set<string>
  >(new Set());
  const [selectedSeries, setSelectedSeries] = useState<string[]>([
    'brake',
    'throttle',
  ]);
  const [sortBy, setSortBy] = useState<'time' | 'lapNumber'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Use cached laps query - only when sessionData is available
  const {
    data: lapsResponse,
    isLoading,
    error,
  } = useLaps(
    sessionData
      ? {
          limit: 1000,
          drivers: 'me',
          event: sessionData.eventId,
          unclean: true,
          group: 'none',
        }
      : undefined,
  );

  // Set laps and default selection when data loads
  useEffect(() => {
    if (lapsResponse?.items) {
      console.log(
        `MultiLapComparison: Loaded ${lapsResponse.items.length} laps for event`,
      );
      setLaps(lapsResponse.items);
      // Use passed selectedLapIds if available, otherwise default to selecting all clean laps
      if (selectedLapIds && selectedLapIds.size > 0) {
        setInternalSelectedLapIds(selectedLapIds);
      } else {
        setInternalSelectedLapIds(
          new Set(
            lapsResponse.items.filter(lap => lap.clean).map(lap => lap.id),
          ),
        );
      }
    }
  }, [lapsResponse, selectedLapIds]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: RacingTheme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      _setDimensions(window);
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

  // Handle lap selection
  const toggleLapSelection = (lapId: string) => {
    setInternalSelectedLapIds(prev => {
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
    setInternalSelectedLapIds(new Set(laps.map(lap => lap.id)));
  };

  const selectCleanLaps = () => {
    setInternalSelectedLapIds(
      new Set(laps.filter(lap => lap.clean).map(lap => lap.id)),
    );
  };

  const clearSelection = () => {
    setInternalSelectedLapIds(new Set());
  };

  // Handle sort change
  const handleSortChange = (newSortBy: 'time' | 'lapNumber') => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  };

  // Get selected laps
  const selectedLaps = laps
    .filter(lap => internalSelectedLapIds.has(lap.id))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'time') {
        comparison = a.lapTime - b.lapTime;
      } else if (sortBy === 'lapNumber') {
        comparison = a.lapNumber - b.lapNumber;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

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
                title='⬅ BACK TO SESSION ANALYSIS'
                onPress={onBack}
                style={styles.backButton}
              />
            </View>

            {/* Session Header */}
            <View style={styles.header}>
              <Text style={styles.title}>MULTI-LAP COMPARISON</Text>
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

            {/* Series Selection */}
            <View style={styles.seriesSection}>
              <Text style={styles.sectionTitle}>DATA SERIES</Text>
              <View style={styles.seriesButtons}>
                {[
                  {key: 'brake', label: 'Brake'},
                  {key: 'throttle', label: 'Throttle'},
                  {key: 'rpm', label: 'RPM'},
                  {key: 'steeringWheelAngle', label: 'Steering'},
                  {key: 'speed', label: 'Speed'},
                  {key: 'gear', label: 'Gear'},
                ].map(series => {
                  const isSelected = selectedSeries.includes(series.key);
                  return (
                    <TouchableOpacity
                      key={series.key}
                      style={[
                        styles.seriesButton,
                        isSelected && styles.seriesButtonActive,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          if (selectedSeries.length > 1) {
                            setSelectedSeries(
                              selectedSeries.filter(s => s !== series.key),
                            );
                          }
                        } else {
                          setSelectedSeries([...selectedSeries, series.key]);
                        }
                      }}>
                      <Text
                        style={[
                          styles.seriesButtonText,
                          isSelected && styles.seriesButtonTextActive,
                        ]}>
                        {isSelected ? '●' : '○'} {series.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

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
              </View>
              <Text style={styles.selectionInfo}>
                {selectedLaps.length} of {laps.length} laps selected for
                comparison
              </Text>
            </View>

            {/* Chart */}
            {selectedLaps.length > 0 && (
              <View style={styles.chartSection}>
                <MultiLapTimeSeriesChart
                  laps={selectedLaps}
                  selectedSeries={selectedSeries}
                  title='Lap Comparison'
                />
              </View>
            )}

            {/* Lap List */}
            <View style={styles.lapListSection}>
              <Text style={styles.sectionTitle}>
                LAP LIST ({laps.length} LAPS)
              </Text>

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
                        sortBy === 'lapNumber' && styles.sortButtonTextActive,
                      ]}>
                      LAP #{' '}
                      {sortBy === 'lapNumber' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lap Table */}
              <RacingCard style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={styles.headerCell}>SELECT</Text>
                  <TouchableOpacity
                    style={styles.headerCellTouchable}
                    onPress={() => handleSortChange('lapNumber')}>
                    <Text
                      style={[
                        styles.headerCell,
                        sortBy === 'lapNumber' && styles.headerCellActive,
                      ]}>
                      LAP#{' '}
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
                      TIME{' '}
                      {sortBy === 'time' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.headerCell}>STATUS</Text>
                </View>

                <RacingDivider />

                {laps
                  .sort((a, b) => {
                    let comparison = 0;
                    if (sortBy === 'time') {
                      comparison = a.lapTime - b.lapTime;
                    } else if (sortBy === 'lapNumber') {
                      comparison = a.lapNumber - b.lapNumber;
                    }
                    return sortDirection === 'asc' ? comparison : -comparison;
                  })
                  .map((lap, index) => {
                    const isSelected = internalSelectedLapIds.has(lap.id);
                    return (
                      <View key={lap.id}>
                        <View
                          style={[
                            styles.tableRow,
                            isSelected && styles.tableRowSelected,
                          ]}>
                          <TouchableOpacity
                            style={styles.cell}
                            onPress={() => toggleLapSelection(lap.id)}
                            activeOpacity={0.7}>
                            <Text
                              style={[
                                styles.cell,
                                isSelected && styles.cellSelected,
                              ]}>
                              {isSelected ? '✓' : '○'}
                            </Text>
                          </TouchableOpacity>
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
                            {formatLapTime(lap.lapTime)}
                          </Text>
                          <View style={styles.cell}>
                            {lap.clean ? (
                              <Text
                                style={[styles.statusBadge, styles.cleanBadge]}>
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
                        </View>
                        {index < laps.length - 1 && <RacingDivider />}
                      </View>
                    );
                  })}
              </RacingCard>
            </View>

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
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
  },
  seriesSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  seriesButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RacingTheme.spacing.sm,
  },
  seriesButton: {
    backgroundColor: RacingTheme.colors.surface,
    paddingHorizontal: RacingTheme.spacing.md,
    paddingVertical: RacingTheme.spacing.sm,
    borderRadius: RacingTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  seriesButtonActive: {
    backgroundColor: RacingTheme.colors.primary,
    borderColor: RacingTheme.colors.primary,
  },
  seriesButtonText: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seriesButtonTextActive: {
    color: RacingTheme.colors.surface,
    fontWeight: RacingTheme.typography.bold as any,
  },
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
  chartSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  lapListSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
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
  tableRowSelected: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
  },
  cell: {
    flex: 1,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
  },
  cellSelected: {
    color: RacingTheme.colors.secondary,
    fontWeight: RacingTheme.typography.bold as any,
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
});

export default MultiLapComparison;
