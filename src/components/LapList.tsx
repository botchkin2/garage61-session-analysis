import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import {apiClient} from '@/utils';
import {Lap, LapsResponse} from '@/types';
import {
  RacingCard,
  RacingButton,
  StatusBadge,
  LapTime,
  RacingDivider,
  TimeRangeSelector,
} from '@/components';
import {RacingTheme} from '@/theme';

interface EventGroup {
  eventId: string;
  eventName?: string;
  primaryCar: string;
  primaryTrack: string;
  laps: Lap[];
  bestLapTime: number;
  totalLaps: number;
  startTime: string;
  expanded: boolean;
  averageLapTime: number;
  sessionTypes: string[];
}

interface LapListProps {
  onSessionAnalysis?: (sessionData: import('@/types').SessionData) => void;
}

const LapList: React.FC<LapListProps> = ({onSessionAnalysis}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1); // Default to 1 day (24h)
  const [fadeAnim] = useState(new Animated.Value(0));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Group laps by event ID with racing metrics
  const groupLapsByEvent = useCallback((lapData: Lap[]): EventGroup[] => {
    const groups: {[key: string]: EventGroup} = {};

    lapData.forEach(lap => {
      const eventId = lap.event || 'No Event';
      const eventName = lap.event || 'Unknown Event';

      if (!groups[eventId]) {
        groups[eventId] = {
          eventId,
          eventName,
          primaryCar: lap.car.name,
          primaryTrack: lap.track.name,
          laps: [],
          bestLapTime: Infinity,
          totalLaps: 0,
          startTime: lap.startTime,
          expanded: false,
          averageLapTime: 0,
          sessionTypes: [],
        };
      }

      groups[eventId].laps.push(lap);
      groups[eventId].bestLapTime = Math.min(
        groups[eventId].bestLapTime,
        lap.lapTime,
      );
      groups[eventId].totalLaps++;

      // Track session types
      const sessionType = getSessionTypeName(lap.sessionType);
      if (!groups[eventId].sessionTypes.includes(sessionType)) {
        groups[eventId].sessionTypes.push(sessionType);
      }
    });

    // Calculate additional metrics and sort
    Object.values(groups).forEach(group => {
      // Sort laps by lap time (best first)
      group.laps.sort((a, b) => a.lapTime - b.lapTime);

      // Update primary car/track to match the best lap
      if (group.laps.length > 0) {
        const bestLap = group.laps[0];
        group.primaryCar = bestLap.car.name;
        group.primaryTrack = bestLap.track.name;
      }

      // Calculate average lap time (excluding outliers)
      const validLaps = group.laps.filter(lap => lap.lapTime > 0);
      if (validLaps.length > 0) {
        const totalTime = validLaps.reduce((sum, lap) => sum + lap.lapTime, 0);
        group.averageLapTime = totalTime / validLaps.length;
      }
    });

    // Sort events by most recent first
    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  }, []);

  const loadLaps = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Test API connectivity
        const canConnect = await apiClient.ping();
        if (!canConnect) {
          throw new Error(
            'Cannot connect to Garage 61 API. Check your token and network connection.',
          );
        }

        // Get laps from selected time range
        const response: LapsResponse = await apiClient.getLaps({
          limit: 200,
          age: selectedTimeRange,
          drivers: 'me',
          group: 'none',
        });

        console.log(
          'LapList: Successfully loaded',
          response.items.length,
          'laps out of',
          response.total,
        );

        // Group laps by event with enhanced metrics
        const groupedEvents = groupLapsByEvent(response.items);
        setEventGroups(groupedEvents);
        console.log('LapList: Grouped into', groupedEvents.length, 'events');
      } catch (err) {
        console.error('LapList: Error loading laps:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load lap data',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupLapsByEvent, selectedTimeRange],
  );

  const handleRefresh = () => {
    loadLaps(true);
  };

  useEffect(() => {
    loadLaps();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: RacingTheme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, loadLaps, selectedTimeRange]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Determine if we should use mobile layout (screen width < 768px)
  const isMobile = dimensions.width < 768;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeRange = (days: number): string => {
    if (days === 1) {
      return 'Last 24 Hours';
    }
    if (days === 3) {
      return 'Last 3 Days';
    }
    if (days === 7) {
      return 'Last 7 Days';
    }
    return `Last ${days} Days`;
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

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.fullHeightContainer}>
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size='large'
              color={RacingTheme.colors.primary}
            />
            <Text style={styles.loadingText}>LOADING TELEMETRY DATA...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.fullHeightContainer}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>TELEMETRY ERROR</Text>
            <Text style={styles.errorText}>{error}</Text>
            <RacingButton
              title='RETRY CONNECTION'
              onPress={() => loadLaps()}
              style={styles.refreshButton}
            />
          </View>
        </View>
      </View>
    );
  }

  const toggleEvent = (eventId: string) => {
    // Add haptic feedback and smooth animation
    setEventGroups(groups =>
      groups.map(group =>
        group.eventId === eventId
          ? {...group, expanded: !group.expanded}
          : group,
      ),
    );
  };

  const handleSessionAnalysis = (eventGroup: EventGroup) => {
    if (!onSessionAnalysis) {
      return;
    }

    // Get the primary session info from the best lap
    const bestLap = [...eventGroup.laps].sort(
      (a, b) => a.lapTime - b.lapTime,
    )[0];

    const sessionData = {
      eventId: eventGroup.eventId,
      eventName: eventGroup.eventName,
      session: bestLap.session,
      sessionType: bestLap.sessionType,
      laps: [], // Will be fetched in SessionAnalysis component
      track: bestLap.track,
      car: bestLap.car,
      startTime: eventGroup.startTime,
    };

    onSessionAnalysis(sessionData);
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}>
        <Animated.View style={[{opacity: fadeAnim}]}>
          <View style={styles.container}>
            {/* Racing Dashboard Header */}
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>RACING ANALYTICS</Text>
              <Text style={styles.dashboardSubtitle}>
                {formatTimeRange(selectedTimeRange)} Performance
              </Text>
            </View>

            {/* Time Range Selector */}
            <TimeRangeSelector
              selectedRange={selectedTimeRange}
              onRangeChange={setSelectedTimeRange}
              style={styles.timeRangeSelector}
            />

            {/* Refresh Button */}
            <RacingButton
              title='🔄 REFRESH TELEMETRY'
              onPress={handleRefresh}
              style={styles.refreshButton}
              disabled={refreshing}
            />

            {/* Event Sessions List */}
            <View style={styles.eventsSection}>
              <Text style={styles.sectionTitle}>SESSION ANALYSIS</Text>

              <FlatList
                data={eventGroups}
                renderItem={({item: event}) => (
                  <RacingCard key={event.eventId} style={styles.eventCard}>
                    {/* Event Header */}
                    <TouchableOpacity
                      style={
                        isMobile ? styles.mobileEventHeader : styles.eventHeader
                      }
                      onPress={() => toggleEvent(event.eventId)}>
                      {isMobile ? (
                        /* Mobile Layout */
                        <View style={styles.mobileEventContent}>
                          <View style={styles.mobileEventTopRow}>
                            <View style={styles.mobileEventMainInfo}>
                              <Text style={styles.mobileEventTitle}>
                                {event.primaryCar}
                              </Text>
                              <Text style={styles.mobileEventTrack}>
                                {event.primaryTrack}
                              </Text>
                            </View>
                            <View style={styles.mobileEventActions}>
                              {onSessionAnalysis && (
                                <TouchableOpacity
                                  style={styles.mobileAnalyzeButton}
                                  onPress={() => handleSessionAnalysis(event)}>
                                  <Text style={styles.analyzeIcon}>📊</Text>
                                </TouchableOpacity>
                              )}
                              <Text style={styles.mobileExpandIcon}>
                                {event.expanded ? '▼' : '▶'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.mobileEventStats}>
                            <View style={styles.mobileStatItem}>
                              <Text style={styles.mobileStatNumber}>
                                {event.totalLaps}
                              </Text>
                              <Text style={styles.mobileStatLabel}>LAPS</Text>
                            </View>
                            <View style={styles.mobileStatItem}>
                              <Text style={styles.mobileStatNumber}>
                                <LapTime time={event.bestLapTime} isBest />
                              </Text>
                              <Text style={styles.mobileStatLabel}>BEST</Text>
                            </View>
                          </View>

                          <View style={styles.mobileEventMeta}>
                            <Text style={styles.mobileEventDate}>
                              {formatDate(event.startTime)}
                            </Text>
                            <Text style={styles.mobileEventSessions}>
                              {event.sessionTypes.join(' • ')}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        /* Desktop Layout */
                        <>
                          <View style={styles.eventMainInfo}>
                            <View style={styles.eventTitleRow}>
                              <Text style={styles.eventTitle}>
                                {event.primaryCar}
                              </Text>
                              <Text style={styles.eventTrack}>
                                {event.primaryTrack}
                              </Text>
                            </View>
                            <View style={styles.eventMetaRow}>
                              <Text style={styles.eventDate}>
                                {formatDate(event.startTime)}
                              </Text>
                              <Text style={styles.eventSessions}>
                                {event.sessionTypes.join(' • ')}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.eventStats}>
                            <View style={styles.statItem}>
                              <Text style={styles.statNumber}>
                                {event.totalLaps}
                              </Text>
                              <Text style={styles.statLabel}>LAPS</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statNumber}>
                                <LapTime time={event.bestLapTime} isBest />
                              </Text>
                              <Text style={styles.statLabel}>BEST</Text>
                            </View>
                            {onSessionAnalysis && (
                              <TouchableOpacity
                                style={styles.analyzeButton}
                                onPress={() => handleSessionAnalysis(event)}>
                                <Text style={styles.analyzeIcon}>📊</Text>
                              </TouchableOpacity>
                            )}
                            <Text style={styles.expandIcon}>
                              {event.expanded ? '▼' : '▶'}
                            </Text>
                          </View>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Expanded Lap Details */}
                    {event.expanded && (
                      <View style={styles.expandedContent}>
                        <RacingDivider />

                        {isMobile ? (
                          /* Mobile Card Layout for Laps */
                          <View style={styles.mobileLapsContainer}>
                            {event.laps.map((lap, index) => (
                              <RacingCard
                                key={lap.id}
                                style={styles.mobileLapCard}>
                                <View style={styles.mobileLapHeader}>
                                  <View style={styles.mobileLapRank}>
                                    <Text style={styles.mobileLapRankText}>
                                      #{index + 1}
                                    </Text>
                                  </View>
                                  <View style={styles.mobileLapStatus}>
                                    {lap.clean && (
                                      <StatusBadge status='clean' />
                                    )}
                                    {lap.offtrack && (
                                      <StatusBadge status='offtrack' />
                                    )}
                                    {lap.pitlane && (
                                      <StatusBadge status='pit' />
                                    )}
                                    {lap.incomplete && (
                                      <StatusBadge status='incomplete' />
                                    )}
                                  </View>
                                </View>

                                <View style={styles.mobileLapDetails}>
                                  <View style={styles.mobileLapDetail}>
                                    <Text style={styles.mobileLapDetailLabel}>
                                      LAP TIME
                                    </Text>
                                    <LapTime
                                      time={lap.lapTime}
                                      isBest={index === 0}
                                    />
                                  </View>
                                  <View style={styles.mobileLapDetail}>
                                    <Text style={styles.mobileLapDetailLabel}>
                                      SESSION
                                    </Text>
                                    <Text style={styles.mobileLapDetailValue}>
                                      {getSessionTypeName(lap.sessionType)} #
                                      {lap.session}
                                    </Text>
                                  </View>
                                </View>
                              </RacingCard>
                            ))}
                          </View>
                        ) : (
                          /* Desktop Table Layout */
                          <>
                            {/* Lap List Header */}
                            <View style={styles.lapListHeader}>
                              <Text style={styles.lapHeaderRank}>RANK</Text>
                              <Text style={styles.lapHeaderTime}>LAP TIME</Text>
                              <Text style={styles.lapHeaderSession}>
                                SESSION
                              </Text>
                              <Text style={styles.lapHeaderStatus}>STATUS</Text>
                            </View>

                            <RacingDivider />

                            {/* Individual Laps */}
                            {event.laps.map((lap, index) => (
                              <View key={lap.id} style={styles.lapRow}>
                                <Text style={styles.lapRank}>#{index + 1}</Text>
                                <LapTime
                                  time={lap.lapTime}
                                  isBest={index === 0}
                                  style={styles.lapTimeCell}
                                />
                                <Text style={styles.lapSession}>
                                  {getSessionTypeName(lap.sessionType)} #
                                  {lap.session}
                                </Text>
                                <View style={styles.lapStatus}>
                                  {lap.clean && <StatusBadge status='clean' />}
                                  {lap.offtrack && (
                                    <StatusBadge status='offtrack' />
                                  )}
                                  {lap.pitlane && <StatusBadge status='pit' />}
                                  {lap.incomplete && (
                                    <StatusBadge status='incomplete' />
                                  )}
                                </View>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    )}
                  </RacingCard>
                )}
                keyExtractor={item => item.eventId}
                showsVerticalScrollIndicator={false}
                style={styles.eventsList}
              />

              {eventGroups.length === 0 && !loading && (
                <RacingCard style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🏁</Text>
                  <Text style={styles.emptyTitle}>NO RACING DATA</Text>
                  <Text style={styles.emptyMessage}>
                    No laps recorded in the{' '}
                    {formatTimeRange(selectedTimeRange).toLowerCase()}.{'\n'}
                    Hit the track and start analyzing your performance!
                  </Text>
                </RacingCard>
              )}
            </View>

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
  fullHeightContainer: {
    flex: 1,
    minHeight: '100vh' as any,
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
  dashboardHeader: {
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.lg,
  },
  dashboardTitle: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    letterSpacing: 2,
    marginBottom: RacingTheme.spacing.xs,
  },
  dashboardSubtitle: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeRangeSelector: {
    marginBottom: RacingTheme.spacing.lg,
    alignSelf: 'center',
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
  refreshButton: {
    marginBottom: RacingTheme.spacing.lg,
    alignSelf: 'center',
  },
  eventsSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  eventsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
  },
  eventCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: RacingTheme.spacing.md,
  },
  eventMainInfo: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.xs,
  },
  eventTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    marginRight: RacingTheme.spacing.sm,
  },
  eventTrack: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
  },
  eventMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
  },
  eventSessions: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.secondary,
    fontWeight: RacingTheme.typography.medium as any,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginRight: RacingTheme.spacing.md,
  },
  statNumber: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
  },
  statLabel: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandIcon: {
    fontSize: RacingTheme.typography.h4,
    color: RacingTheme.colors.primary,
  },
  analyzeButton: {
    marginRight: RacingTheme.spacing.sm,
    padding: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: RacingTheme.colors.secondary,
  },
  analyzeIcon: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.secondary,
  },
  expandedContent: {
    padding: RacingTheme.spacing.md,
  },
  lapListHeader: {
    flexDirection: 'row',
    paddingVertical: RacingTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: RacingTheme.colors.surfaceElevated,
  },
  lapHeaderRank: {
    flex: 1,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lapHeaderTime: {
    flex: 2,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lapHeaderSession: {
    flex: 3,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lapHeaderStatus: {
    flex: 2,
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: RacingTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: RacingTheme.colors.surfaceElevated,
  },
  lapRank: {
    flex: 1,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    fontFamily: RacingTheme.typography.mono,
  },
  lapTimeCell: {
    flex: 2,
  },
  lapSession: {
    flex: 3,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
  },
  lapStatus: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCard: {
    alignItems: 'center',
    padding: RacingTheme.spacing.xl,
  },
  emptyIcon: {
    fontSize: RacingTheme.typography.h1,
    marginBottom: RacingTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.sm,
  },
  emptyMessage: {
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
  bottomSpacing: {
    height: RacingTheme.spacing.xxxl, // Extra space for scrolling
  },
  // Mobile Event Card Styles
  mobileEventHeader: {
    padding: RacingTheme.spacing.md,
  },
  mobileEventContent: {
    gap: RacingTheme.spacing.md,
  },
  mobileEventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mobileEventMainInfo: {
    flex: 1,
  },
  mobileEventTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    marginBottom: RacingTheme.spacing.xs,
  },
  mobileEventTrack: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
  },
  mobileEventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RacingTheme.spacing.sm,
  },
  mobileAnalyzeButton: {
    padding: RacingTheme.spacing.sm,
    borderRadius: RacingTheme.borderRadius.sm,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: RacingTheme.colors.secondary,
  },
  mobileExpandIcon: {
    fontSize: RacingTheme.typography.h4,
    color: RacingTheme.colors.primary,
  },
  mobileEventStats: {
    flexDirection: 'row',
    gap: RacingTheme.spacing.lg,
  },
  mobileStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  mobileStatNumber: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.xs,
  },
  mobileStatLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileEventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileEventDate: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
  },
  mobileEventSessions: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.secondary,
    fontWeight: RacingTheme.typography.medium as any,
  },
  // Mobile Lap Cards Styles
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
    flexDirection: 'row',
    gap: RacingTheme.spacing.xs,
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
});

export default LapList;
