import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { apiClient } from '@/utils';
import { Lap, LapsResponse } from '@/types';
import { RacingCard, RacingButton, StatusBadge, MetricCard, LapTime, RacingDivider } from '@/components';
import { RacingTheme } from '@/theme';

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

const LapList: React.FC = () => {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLaps, setTotalLaps] = useState(0);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Group laps by event ID with racing metrics
  const groupLapsByEvent = (lapData: Lap[]): EventGroup[] => {
    const groups: { [key: string]: EventGroup } = {};

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
      groups[eventId].bestLapTime = Math.min(groups[eventId].bestLapTime, lap.lapTime);
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
    return Object.values(groups).sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  };

  const loadLaps = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('LapList: Starting to load laps...');

      // Test API connectivity
      const canConnect = await apiClient.ping();
      if (!canConnect) {
        throw new Error('Cannot connect to Garage 61 API. Check your token and network connection.');
      }

      // Get laps from last 24 hours
      const response: LapsResponse = await apiClient.getLaps({
        limit: 200,
        age: 1,
        drivers: 'me',
        group: 'none',
      });

      console.log('LapList: Successfully loaded', response.items.length, 'laps out of', response.total);
      setLaps(response.items);
      setTotalLaps(response.total);

      // Group laps by event with enhanced metrics
      const eventGroups = groupLapsByEvent(response.items);
      setEventGroups(eventGroups);
      console.log('LapList: Grouped into', eventGroups.length, 'events');
    } catch (err) {
      console.error('LapList: Error loading laps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lap data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadLaps(true);
  };

  // Test direct fetch to isolate CORS vs other issues
  const testDirectFetch = async () => {
    try {
      console.log('Testing direct fetch to Garage 61 API...');
      const token = process.env.GARAGE61_API_TOKEN;
      if (!token) {
        console.error('No API token found in environment');
        return;
      }

      const response = await fetch('https://garage61.net/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Direct fetch status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Direct fetch success:', data);
      } else {
        console.log('Direct fetch error:', await response.text());
      }
    } catch (error) {
      console.error('Direct fetch failed:', error);
    }
  };

  useEffect(() => {
    // Test direct fetch on component mount to isolate issues
    testDirectFetch();

    // Then try loading laps
    loadLaps();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: RacingTheme.animations.normal,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatLapTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSessionTypeName = (type: number): string => {
    switch (type) {
      case 1: return 'Practice';
      case 2: return 'Qualifying';
      case 3: return 'Race';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={RacingTheme.colors.primary} />
        <Text style={styles.loadingText}>LOADING TELEMETRY DATA...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>TELEMETRY ERROR</Text>
        <Text style={styles.errorText}>
          {error}
        </Text>
        <RacingButton
          title="RETRY CONNECTION"
          onPress={() => loadLaps()}
          style={styles.refreshButton}
        />
      </View>
    );
  }

  const toggleEvent = (eventId: string) => {
    // Add haptic feedback and smooth animation
    setEventGroups(groups =>
      groups.map(group =>
        group.eventId === eventId
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  // Calculate summary statistics
  const totalEvents = eventGroups.length;
  const bestOverallTime = Math.min(...eventGroups.map(g => g.bestLapTime));
  const averageOverallTime = eventGroups.reduce((sum, g) => sum + g.averageLapTime, 0) / totalEvents;

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Animated.View style={[{ opacity: fadeAnim }]}>
          <View style={styles.container}>
      {/* Racing Dashboard Header */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>RACING ANALYTICS</Text>
        <Text style={styles.dashboardSubtitle}>Last 24 Hours Performance</Text>
      </View>

      {/* Performance Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="TOTAL LAPS"
          value={laps.length.toString()}
          style={styles.metricCard}
        />
        <MetricCard
          title="SESSIONS"
          value={totalEvents.toString()}
          style={styles.metricCard}
        />
        <MetricCard
          title="BEST LAP"
          value={bestOverallTime === Infinity ? '--:--.---' : formatLapTime(bestOverallTime)}
          style={styles.metricCard}
        />
        <MetricCard
          title="AVG LAP"
          value={isNaN(averageOverallTime) ? '--:--.---' : formatLapTime(averageOverallTime)}
          style={styles.metricCard}
        />
      </View>

      {/* Refresh Button */}
      <RacingButton
        title="🔄 REFRESH TELEMETRY"
        onPress={handleRefresh}
        style={styles.refreshButton}
        disabled={refreshing}
      />

      {/* Event Sessions List */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>SESSION ANALYSIS</Text>

        <FlatList
          data={eventGroups}
          renderItem={({ item: event }) => (
          <RacingCard key={event.eventId} style={styles.eventCard}>
            {/* Event Header */}
            <TouchableOpacity
              style={styles.eventHeader}
              onPress={() => toggleEvent(event.eventId)}
            >
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
                  <Text style={styles.eventDate}>{formatDate(event.startTime)}</Text>
                  <Text style={styles.eventSessions}>
                    {event.sessionTypes.join(' • ')}
                  </Text>
                </View>
              </View>

              <View style={styles.eventStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{event.totalLaps}</Text>
                  <Text style={styles.statLabel}>LAPS</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    <LapTime time={event.bestLapTime} isBest />
                  </Text>
                  <Text style={styles.statLabel}>BEST</Text>
                </View>
                <Text style={styles.expandIcon}>
                  {event.expanded ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expanded Lap Details */}
            {event.expanded && (
              <View style={styles.expandedContent}>
                <RacingDivider />

                {/* Lap List Header */}
                <View style={styles.lapListHeader}>
                  <Text style={styles.lapHeaderRank}>RANK</Text>
                  <Text style={styles.lapHeaderTime}>LAP TIME</Text>
                  <Text style={styles.lapHeaderSession}>SESSION</Text>
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
                      {getSessionTypeName(lap.sessionType)} #{lap.session}
                    </Text>
                    <View style={styles.lapStatus}>
                      {lap.clean && <StatusBadge status="clean" />}
                      {lap.offtrack && <StatusBadge status="offtrack" />}
                      {lap.pitlane && <StatusBadge status="pit" />}
                      {lap.incomplete && <StatusBadge status="incomplete" />}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </RacingCard>
          )}
          keyExtractor={(item) => item.eventId}
          showsVerticalScrollIndicator={false}
          style={styles.eventsList}
        />

        {eventGroups.length === 0 && !loading && (
          <RacingCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏁</Text>
            <Text style={styles.emptyTitle}>NO RACING DATA</Text>
            <Text style={styles.emptyMessage}>
              No laps recorded in the last 24 hours.{'\n'}
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
});

export default LapList;