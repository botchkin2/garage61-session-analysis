import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  RacingCard,
  RacingButton,
  MetricCard,
  RacingDivider,
  LapTime,
} from '@/components';
import {RacingTheme} from '@/theme';
import {
  SessionAnalysis as SessionAnalysisType,
  SectorAnalysis,
  SessionData,
  OptimalLapAnalysis,
} from '@/types';

interface SessionAnalysisProps {
  sessionData: SessionData;
  onBack: () => void;
}

const SessionAnalysis: React.FC<SessionAnalysisProps> = ({
  sessionData,
  onBack,
}) => {
  const [analysis, setAnalysis] = useState<SessionAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  const analyzeSession = useCallback(() => {
    setLoading(true);

    // Filter out laps without sector data
    const lapsWithSectors = sessionData.laps.filter(
      lap => lap.sectors && lap.sectors.length > 0 && lap.clean,
    );

    if (lapsWithSectors.length === 0) {
      const emptyOptimalAnalysis: OptimalLapAnalysis = {
        optimalLapTime: 0,
        optimalSectorTimes: [],
        lapComparisons: [],
        bestAchievableLap: null,
        averageTimeFromOptimal: 0,
      };

      setAnalysis({
        session: sessionData,
        sectorAnalysis: [],
        mostInconsistentSector: null,
        overallConsistency: 0,
        totalLaps: sessionData.laps.length,
        validSectorLaps: 0,
        optimalLapAnalysis: emptyOptimalAnalysis,
      });
      setLoading(false);
      return;
    }

    // Analyze each sector
    const sectorAnalysis: SectorAnalysis[] = [];
    const maxSectors = Math.max(
      ...lapsWithSectors.map(lap => lap.sectors!.length),
    );

    // First pass: find optimal sector times
    const optimalSectorTimes: number[] = [];
    for (let sectorIndex = 0; sectorIndex < maxSectors; sectorIndex++) {
      const sectorTimes: number[] = [];
      lapsWithSectors.forEach(lap => {
        if (lap.sectors && lap.sectors[sectorIndex]) {
          sectorTimes.push(lap.sectors[sectorIndex].sectorTime);
        }
      });

      if (sectorTimes.length > 0) {
        const optimalTime = Math.min(...sectorTimes);
        optimalSectorTimes.push(optimalTime);

        const bestTime = Math.min(...sectorTimes);
        const averageTime =
          sectorTimes.reduce((a, b) => a + b, 0) / sectorTimes.length;
        const variance =
          sectorTimes.reduce(
            (sum, time) => sum + Math.pow(time - averageTime, 2),
            0,
          ) / sectorTimes.length;
        const standardDeviation = Math.sqrt(variance);
        const consistency = (standardDeviation / averageTime) * 100; // Coefficient of variation as percentage

        // Calculate improvement potential
        const improvementPotential = averageTime - bestTime;
        const improvementPercentage =
          (improvementPotential / averageTime) * 100;

        // Simple trend analysis - compare first half vs second half of laps
        const midPoint = Math.floor(sectorTimes.length / 2);
        const firstHalf = sectorTimes.slice(0, midPoint);
        const secondHalf = sectorTimes.slice(midPoint);

        let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
        if (firstHalf.length > 0 && secondHalf.length > 0) {
          const firstHalfAvg =
            firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondHalfAvg =
            secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          const trendDiff = firstHalfAvg - secondHalfAvg; // Positive = improving

          if (trendDiff > 0.1) {
            // More than 0.1s improvement
            performanceTrend = 'improving';
          } else if (trendDiff < -0.1) {
            // More than 0.1s decline
            performanceTrend = 'declining';
          }
        }

        sectorAnalysis.push({
          sectorIndex,
          sectorNumber: sectorIndex + 1,
          bestTime,
          averageTime,
          standardDeviation,
          consistency,
          lapCount: sectorTimes.length,
          times: sectorTimes,
          optimalTime,
          improvementPotential,
          improvementPercentage,
          performanceTrend,
        });
      } else {
        optimalSectorTimes.push(0);
      }
    }

    // Calculate optimal lap time (sum of best sector times)
    const optimalLapTime = optimalSectorTimes.reduce(
      (sum, time) => sum + time,
      0,
    );

    // Create lap comparisons
    const lapComparisons: LapComparison[] = lapsWithSectors
      .map((lap, index) => {
        const sectorBreakdown = lap.sectors!.map((sector, sectorIndex) => ({
          sectorIndex,
          sectorTime: sector.sectorTime,
          optimalSectorTime: optimalSectorTimes[sectorIndex] || 0,
          timeFromOptimal:
            sector.sectorTime - (optimalSectorTimes[sectorIndex] || 0),
        }));

        const optimalLapTimeForThisLap = sectorBreakdown.reduce(
          (sum, sector) => sum + sector.optimalSectorTime,
          0,
        );

        return {
          lapId: lap.id,
          lapNumber: lap.lapNumber,
          lapTime: lap.lapTime,
          rank: index + 1,
          optimalLapTime: optimalLapTimeForThisLap,
          timeFromOptimal: lap.lapTime - optimalLapTimeForThisLap,
          sectorBreakdown,
        };
      })
      .sort((a, b) => a.lapTime - b.lapTime) // Sort by actual lap time
      .map((lap, index) => ({...lap, rank: index + 1})); // Update ranks

    // Find best achievable lap
    const bestAchievableLap =
      lapComparisons.length > 0
        ? lapComparisons.reduce((best, current) =>
            current.timeFromOptimal < best.timeFromOptimal ? current : best,
          )
        : null;

    // Calculate average time from optimal
    const averageTimeFromOptimal =
      lapComparisons.length > 0
        ? lapComparisons.reduce((sum, lap) => sum + lap.timeFromOptimal, 0) /
          lapComparisons.length
        : 0;

    const optimalLapAnalysis: OptimalLapAnalysis = {
      optimalLapTime,
      optimalSectorTimes,
      lapComparisons,
      bestAchievableLap,
      averageTimeFromOptimal,
    };

    // Find most inconsistent sector
    const sortedSectors = [...sectorAnalysis].sort(
      (a, b) => b.consistency - a.consistency,
    );
    const mostInconsistentSector =
      sortedSectors.length > 0 ? sortedSectors[0] : null;

    // Calculate overall consistency (average of sector consistencies)
    const overallConsistency =
      sectorAnalysis.length > 0
        ? sectorAnalysis.reduce((sum, sector) => sum + sector.consistency, 0) /
          sectorAnalysis.length
        : 0;

    setAnalysis({
      session: sessionData,
      sectorAnalysis,
      mostInconsistentSector,
      overallConsistency,
      totalLaps: sessionData.laps.length,
      validSectorLaps: lapsWithSectors.length,
      optimalLapAnalysis,
    });

    setLoading(false);
  }, [sessionData]);

  useEffect(() => {
    analyzeSession();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: RacingTheme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, [analyzeSession, fadeAnim]);

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

  const getConsistencyColor = (consistency: number): string => {
    if (consistency < 2) {
      return RacingTheme.colors.success;
    }
    if (consistency < 5) {
      return RacingTheme.colors.warning;
    }
    return RacingTheme.colors.error;
  };

  const getTrendIcon = (
    trend: 'improving' | 'declining' | 'stable',
  ): string => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (
    trend: 'improving' | 'declining' | 'stable',
  ): string => {
    switch (trend) {
      case 'improving':
        return RacingTheme.colors.success;
      case 'declining':
        return RacingTheme.colors.error;
      case 'stable':
        return RacingTheme.colors.textSecondary;
      default:
        return RacingTheme.colors.textSecondary;
    }
  };

  const getImprovementColor = (
    potential: number,
    maxPotential: number,
  ): string => {
    const ratio = potential / maxPotential;
    if (ratio >= 0.8) {
      return RacingTheme.colors.error;
    } // High potential = red (needs attention)
    if (ratio >= 0.5) {
      return RacingTheme.colors.warning;
    } // Medium potential = yellow
    return RacingTheme.colors.success; // Low potential = green (doing well)
  };

  const getConsistencyLabel = (consistency: number): string => {
    if (consistency < 2) {
      return 'Excellent';
    }
    if (consistency < 5) {
      return 'Good';
    }
    if (consistency < 10) {
      return 'Fair';
    }
    return 'Poor';
  };

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={RacingTheme.colors.primary} />
          <Text style={styles.loadingText}>ANALYZING SESSION DATA...</Text>
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>ANALYSIS ERROR</Text>
          <Text style={styles.errorMessage}>
            Failed to analyze session data.
          </Text>
          <RacingButton title="GO BACK" onPress={onBack} />
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
                title="⬅ BACK TO SESSIONS"
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
                  {getSessionTypeName(sessionData.sessionType)} #
                  {sessionData.session} •{' '}
                  {new Date(sessionData.startTime).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Summary Metrics */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title="TOTAL LAPS"
                value={analysis.totalLaps.toString()}
                style={styles.metricCard}
              />
              <MetricCard
                title="VALID SECTORS"
                value={analysis.validSectorLaps.toString()}
                style={styles.metricCard}
              />
              <MetricCard
                title="SECTIONS"
                value={analysis.sectorAnalysis.length.toString()}
                style={styles.metricCard}
              />
              <MetricCard
                title="OVERALL CONSISTENCY"
                value={`${analysis.overallConsistency.toFixed(1)}%`}
                style={[
                  styles.metricCard,
                  {
                    borderColor: getConsistencyColor(
                      analysis.overallConsistency,
                    ),
                  },
                ]}
              />
            </View>

            {analysis.sectorAnalysis.length === 0 ? (
              <RacingCard style={styles.noDataCard}>
                <Text style={styles.noDataIcon}>📊</Text>
                <Text style={styles.noDataTitle}>NO SECTOR DATA</Text>
                <Text style={styles.noDataMessage}>
                  This session doesn't have sector timing data available for
                  analysis. Sector data is required to measure section
                  variability.
                </Text>
              </RacingCard>
            ) : (
              <>
                {/* Optimal Lap Analysis */}
                {analysis.optimalLapAnalysis.optimalLapTime > 0 && (
                  <RacingCard style={styles.optimalCard}>
                    <View style={styles.optimalHeader}>
                      <Text style={styles.optimalTitle}>
                        🏁 OPTIMAL LAP ANALYSIS
                      </Text>
                      <Text style={styles.optimalBadge}>THEORETICAL BEST</Text>
                    </View>
                    <RacingDivider />
                    <View style={styles.optimalContent}>
                      <View style={styles.optimalMetrics}>
                        <View style={styles.optimalMetric}>
                          <Text style={styles.optimalMetricLabel}>
                            Optimal Lap Time
                          </Text>
                          <Text style={styles.optimalMetricValue}>
                            <LapTime
                              time={analysis.optimalLapAnalysis.optimalLapTime}
                            />
                          </Text>
                        </View>
                        <View style={styles.optimalMetric}>
                          <Text style={styles.optimalMetricLabel}>
                            Best Achievable
                          </Text>
                          <Text style={styles.optimalMetricValue}>
                            {analysis.optimalLapAnalysis.bestAchievableLap ? (
                              <>
                                <LapTime
                                  time={
                                    analysis.optimalLapAnalysis
                                      .bestAchievableLap.lapTime
                                  }
                                />
                                <Text style={styles.optimalGapText}>
                                  (+
                                  {formatLapTime(
                                    Math.abs(
                                      analysis.optimalLapAnalysis
                                        .bestAchievableLap.timeFromOptimal,
                                    ),
                                  )}
                                  )
                                </Text>
                              </>
                            ) : (
                              'N/A'
                            )}
                          </Text>
                        </View>
                        <View style={styles.optimalMetric}>
                          <Text style={styles.optimalMetricLabel}>
                            Avg Gap to Optimal
                          </Text>
                          <Text
                            style={[
                              styles.optimalMetricValue,
                              styles.gapValue,
                            ]}>
                            +
                            {formatLapTime(
                              analysis.optimalLapAnalysis
                                .averageTimeFromOptimal,
                            )}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optimalDescription}>
                        The optimal lap combines the best sector time from each
                        section across all laps. This represents the theoretical
                        fastest lap if you could perfectly combine your best
                        sector performances.
                      </Text>
                    </View>
                  </RacingCard>
                )}

                {/* Improvement Priority Section */}
                {analysis.sectorAnalysis.length > 0 && (
                  <RacingCard style={styles.priorityCard}>
                    <View style={styles.highlightHeader}>
                      <Text style={styles.highlightTitle}>
                        🎯 IMPROVEMENT PRIORITIES
                      </Text>
                      <Text style={styles.highlightBadge}>FOCUS AREAS</Text>
                    </View>
                    <RacingDivider />
                    <View style={styles.priorityContent}>
                      <Text style={styles.priorityTitle}>
                        Sections ranked by improvement potential:
                      </Text>

                      {analysis.sectorAnalysis
                        .sort(
                          (a, b) =>
                            b.improvementPotential - a.improvementPotential,
                        )
                        .slice(0, 3) // Top 3 improvement opportunities
                        .map((sector, index) => (
                          <View
                            key={sector.sectorIndex}
                            style={styles.priorityItem}>
                            <View style={styles.priorityRank}>
                              <Text style={styles.priorityNumber}>
                                #{index + 1}
                              </Text>
                            </View>
                            <View style={styles.priorityDetails}>
                              <Text style={styles.prioritySection}>
                                Section {sector.sectorNumber}
                              </Text>
                              <Text style={styles.priorityGap}>
                                {formatLapTime(sector.improvementPotential)}{' '}
                                faster possible (
                                {sector.improvementPercentage.toFixed(1)}%
                                improvement)
                              </Text>
                              <Text style={styles.priorityTrend}>
                                Trend: {sector.performanceTrend}{' '}
                                {getTrendIcon(sector.performanceTrend)}
                              </Text>
                            </View>
                          </View>
                        ))}

                      <View style={styles.prioritySummary}>
                        <Text style={styles.prioritySummaryText}>
                          🎯{' '}
                          <Text style={styles.boldText}>
                            Focus on these sections
                          </Text>{' '}
                          to gain the most lap time. Consistent improvement in
                          these areas could shave{' '}
                          <Text style={styles.boldText}>
                            {formatLapTime(
                              analysis.sectorAnalysis
                                .sort(
                                  (a, b) =>
                                    b.improvementPotential -
                                    a.improvementPotential,
                                )
                                .slice(0, 3)
                                .reduce(
                                  (sum, sector) =>
                                    sum + sector.improvementPotential,
                                  0,
                                ),
                            )}
                          </Text>{' '}
                          off your average lap time.
                        </Text>
                      </View>
                    </View>
                  </RacingCard>
                )}

                {/* Most Inconsistent Section */}
                {analysis.mostInconsistentSector && (
                  <RacingCard style={styles.highlightCard}>
                    <View style={styles.highlightHeader}>
                      <Text style={styles.highlightTitle}>
                        🚩 MOST INCONSISTENT SECTION
                      </Text>
                      <Text style={styles.highlightBadge}>CRITICAL</Text>
                    </View>
                    <RacingDivider />
                    <View style={styles.sectorDetails}>
                      <View style={styles.sectorMain}>
                        <Text style={styles.sectorNumber}>
                          Section {analysis.mostInconsistentSector.sectorNumber}
                        </Text>
                        <View style={styles.sectorStats}>
                          <View style={styles.stat}>
                            <Text style={styles.statLabel}>Best Time</Text>
                            <Text style={styles.statValue}>
                              <LapTime
                                time={analysis.mostInconsistentSector.bestTime}
                              />
                            </Text>
                          </View>
                          <View style={styles.stat}>
                            <Text style={styles.statLabel}>Average</Text>
                            <Text style={styles.statValue}>
                              {formatLapTime(
                                analysis.mostInconsistentSector.averageTime,
                              )}
                            </Text>
                          </View>
                          <View style={styles.stat}>
                            <Text style={styles.statLabel}>Consistency</Text>
                            <Text
                              style={[
                                styles.statValue,
                                {
                                  color: getConsistencyColor(
                                    analysis.mostInconsistentSector.consistency,
                                  ),
                                },
                              ]}>
                              {analysis.mostInconsistentSector.consistency.toFixed(
                                1,
                              )}
                              %
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.consistencyIndicator}>
                        <Text style={styles.consistencyText}>
                          {getConsistencyLabel(
                            analysis.mostInconsistentSector.consistency,
                          )}
                        </Text>
                      </View>
                    </View>
                  </RacingCard>
                )}

                {/* Lap Comparison Table */}
                {analysis.optimalLapAnalysis.lapComparisons.length > 0 && (
                  <View style={styles.comparisonSection}>
                    <Text style={styles.sectionTitle}>
                      LAP COMPARISON TO OPTIMAL
                    </Text>

                    <RacingCard style={styles.tableCard}>
                      {/* Comparison Table Header */}
                      <View style={styles.tableHeader}>
                        <Text style={styles.headerCell}>RANK</Text>
                        <Text style={styles.headerCell}>LAP #</Text>
                        <Text style={styles.headerCell}>LAP TIME</Text>
                        <Text style={styles.headerCell}>OPTIMAL</Text>
                        <Text style={styles.headerCell}>GAP</Text>
                      </View>

                      <RacingDivider />

                      {/* Comparison Table Rows */}
                      {analysis.optimalLapAnalysis.lapComparisons
                        .slice(0, 10) // Show top 10 laps
                        .map((lap, index) => (
                          <View key={lap.lapId}>
                            <View style={styles.tableRow}>
                              <Text style={styles.cell}>#{lap.rank}</Text>
                              <Text style={styles.cell}>{lap.lapNumber}</Text>
                              <Text style={styles.cell}>
                                <LapTime
                                  time={lap.lapTime}
                                  isBest={index === 0}
                                />
                              </Text>
                              <Text style={styles.cell}>
                                <LapTime time={lap.optimalLapTime} />
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  styles.gapCell,
                                  {
                                    color:
                                      lap.timeFromOptimal > 0
                                        ? RacingTheme.colors.error
                                        : lap.timeFromOptimal < 0
                                        ? RacingTheme.colors.success
                                        : RacingTheme.colors.textSecondary,
                                  },
                                ]}>
                                {lap.timeFromOptimal >= 0 ? '+' : ''}
                                {formatLapTime(Math.abs(lap.timeFromOptimal))}
                              </Text>
                            </View>
                            {index <
                              Math.min(
                                analysis.optimalLapAnalysis.lapComparisons
                                  .length - 1,
                                9,
                              ) && <RacingDivider />}
                          </View>
                        ))}

                      {analysis.optimalLapAnalysis.lapComparisons.length >
                        10 && (
                        <View style={styles.moreLapsIndicator}>
                          <Text style={styles.moreLapsText}>
                            ... and{' '}
                            {analysis.optimalLapAnalysis.lapComparisons.length -
                              10}{' '}
                            more laps
                          </Text>
                        </View>
                      )}
                    </RacingCard>
                  </View>
                )}

                {/* Improvement Potential Chart */}
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>
                    IMPROVEMENT POTENTIAL BY SECTION
                  </Text>
                  <Text style={styles.chartSubtitle}>
                    Bars show potential lap time gain (seconds)
                  </Text>

                  <RacingCard style={styles.chartCard}>
                    {analysis.sectorAnalysis
                      .sort(
                        (a, b) =>
                          b.improvementPotential - a.improvementPotential,
                      )
                      .map(sector => {
                        const maxPotential = Math.max(
                          ...analysis.sectorAnalysis.map(
                            s => s.improvementPotential,
                          ),
                        );
                        const barWidth =
                          maxPotential > 0
                            ? (sector.improvementPotential / maxPotential) * 100
                            : 0;

                        return (
                          <View
                            key={sector.sectorIndex}
                            style={styles.chartRow}>
                            <Text style={styles.chartLabel}>
                              #{sector.sectorNumber}
                            </Text>
                            <View style={styles.chartBar}>
                              <View
                                style={[
                                  styles.chartBarFill,
                                  {
                                    width: `${barWidth}%`,
                                    backgroundColor: getImprovementColor(
                                      sector.improvementPotential,
                                      maxPotential,
                                    ),
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.chartValue}>
                              -{formatLapTime(sector.improvementPotential)}
                            </Text>
                          </View>
                        );
                      })}
                  </RacingCard>
                </View>

                {/* Section Analysis Table */}
                <View style={styles.sectionsSection}>
                  <Text style={styles.sectionTitle}>
                    SECTION PERFORMANCE ANALYSIS
                  </Text>

                  <RacingCard style={styles.tableCard}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={styles.headerCell}>SECTION</Text>
                      <Text style={styles.headerCell}>BEST</Text>
                      <Text style={styles.headerCell}>AVG</Text>
                      <Text style={styles.headerCell}>IMPROVEMENT</Text>
                      <Text style={styles.headerCell}>TREND</Text>
                    </View>

                    <RacingDivider />

                    {/* Table Rows */}
                    {analysis.sectorAnalysis
                      .sort(
                        (a, b) =>
                          b.improvementPotential - a.improvementPotential,
                      ) // Most improvement potential first
                      .map((sector, index) => (
                        <View key={sector.sectorIndex}>
                          <View style={styles.tableRow}>
                            <Text style={styles.cell}>
                              #{sector.sectorNumber}
                            </Text>
                            <Text style={[styles.cell, styles.bestCell]}>
                              <LapTime time={sector.bestTime} />
                            </Text>
                            <Text style={styles.cell}>
                              {formatLapTime(sector.averageTime)}
                            </Text>
                            <Text style={[styles.cell, styles.improvementCell]}>
                              -{formatLapTime(sector.improvementPotential)}
                              <Text style={styles.improvementPercent}>
                                ({sector.improvementPercentage.toFixed(1)}%)
                              </Text>
                            </Text>
                            <Text
                              style={[
                                styles.cell,
                                styles.trendCell,
                                {
                                  color: getTrendColor(sector.performanceTrend),
                                },
                              ]}>
                              {getTrendIcon(sector.performanceTrend)}
                            </Text>
                          </View>
                          {index < analysis.sectorAnalysis.length - 1 && (
                            <RacingDivider />
                          )}
                        </View>
                      ))}
                  </RacingCard>
                </View>
              </>
            )}

            <View style={styles.bottomSpacing} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  scrollView: {
    flex: 1,
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
  highlightCard: {
    marginBottom: RacingTheme.spacing.lg,
    borderWidth: 2,
    borderColor: RacingTheme.colors.warning,
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  highlightTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.warning,
  },
  highlightBadge: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.warning,
    fontWeight: RacingTheme.typography.bold as any,
    backgroundColor: RacingTheme.colors.surface,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: RacingTheme.colors.warning,
  },
  sectorDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorMain: {
    flex: 1,
  },
  sectorNumber: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.sm,
  },
  sectorStats: {
    flexDirection: 'row',
    gap: RacingTheme.spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.xs,
  },
  statValue: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
  },
  consistencyIndicator: {
    alignItems: 'center',
  },
  consistencyText: {
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionsSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
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
  noDataCard: {
    alignItems: 'center',
    padding: RacingTheme.spacing.xl,
  },
  noDataIcon: {
    fontSize: RacingTheme.typography.h1,
    marginBottom: RacingTheme.spacing.md,
  },
  noDataTitle: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  noDataMessage: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  errorMessage: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.lg,
  },
  bottomSpacing: {
    height: RacingTheme.spacing.xxxl,
  },
  chartSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  chartSubtitle: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    marginBottom: RacingTheme.spacing.md,
    textAlign: 'center',
  },
  chartCard: {
    padding: RacingTheme.spacing.md,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  chartLabel: {
    width: 40,
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    textAlign: 'center',
  },
  chartBar: {
    flex: 1,
    height: 24,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderRadius: RacingTheme.borderRadius.sm,
    marginHorizontal: RacingTheme.spacing.sm,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: RacingTheme.borderRadius.sm,
  },
  chartValue: {
    width: 60,
    fontSize: RacingTheme.typography.caption,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.text,
    textAlign: 'right',
  },
  optimalCard: {
    marginBottom: RacingTheme.spacing.lg,
    borderWidth: 2,
    borderColor: RacingTheme.colors.success,
  },
  priorityCard: {
    marginBottom: RacingTheme.spacing.lg,
    borderWidth: 2,
    borderColor: RacingTheme.colors.primary,
  },
  optimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  optimalTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.success,
  },
  optimalBadge: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.success,
    fontWeight: RacingTheme.typography.bold as any,
    backgroundColor: RacingTheme.colors.surface,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: RacingTheme.colors.success,
  },
  optimalContent: {
    padding: RacingTheme.spacing.sm,
  },
  optimalMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: RacingTheme.spacing.md,
  },
  optimalMetric: {
    flex: 1,
    alignItems: 'center',
  },
  optimalMetricLabel: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.xs,
  },
  optimalMetricValue: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    textAlign: 'center',
  },
  gapValue: {
    color: RacingTheme.colors.warning,
  },
  optimalGapText: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    marginTop: RacingTheme.spacing.xs,
  },
  optimalDescription: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  priorityContent: {
    padding: RacingTheme.spacing.md,
  },
  priorityTitle: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.md,
    padding: RacingTheme.spacing.sm,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderRadius: RacingTheme.borderRadius.md,
  },
  priorityRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RacingTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: RacingTheme.spacing.md,
  },
  priorityNumber: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.surface,
  },
  priorityDetails: {
    flex: 1,
  },
  prioritySection: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    marginBottom: RacingTheme.spacing.xs,
  },
  priorityGap: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.success,
    fontWeight: RacingTheme.typography.medium as any,
    marginBottom: RacingTheme.spacing.xs,
  },
  priorityTrend: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
  },
  prioritySummary: {
    marginTop: RacingTheme.spacing.md,
    padding: RacingTheme.spacing.md,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderRadius: RacingTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: RacingTheme.colors.primary,
  },
  prioritySummaryText: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold' as any,
    color: RacingTheme.colors.primary,
  },
  comparisonSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  gapCell: {
    fontWeight: 'bold' as any,
    textAlign: 'right',
  },
  bestCell: {
    color: RacingTheme.colors.success,
    fontWeight: 'bold' as any,
  },
  improvementCell: {
    fontWeight: 'bold' as any,
  },
  improvementPercent: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    fontWeight: 'normal' as any,
  },
  trendCell: {
    fontSize: RacingTheme.typography.body,
    textAlign: 'center',
  },
  moreLapsIndicator: {
    padding: RacingTheme.spacing.sm,
    alignItems: 'center',
  },
  moreLapsText: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    fontStyle: 'italic',
  },
});

export default SessionAnalysis;
