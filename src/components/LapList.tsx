import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiClient } from '@/utils';
import { Lap, LapsResponse } from '@/types';

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
}

const LapList: React.FC = () => {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLaps, setTotalLaps] = useState(0);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);

  // Group laps by event ID
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
        };
      }

      groups[eventId].laps.push(lap);
      groups[eventId].bestLapTime = Math.min(groups[eventId].bestLapTime, lap.lapTime);
      groups[eventId].totalLaps++;
    });

    // Sort laps within each event by lap time (best first)
    Object.values(groups).forEach(group => {
      group.laps.sort((a, b) => a.lapTime - b.lapTime);
      // Update primary car/track to match the best lap
      if (group.laps.length > 0) {
        const bestLap = group.laps[0];
        group.primaryCar = bestLap.car.name;
        group.primaryTrack = bestLap.track.name;
      }
    });

    // Sort events by most recent first
    return Object.values(groups).sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  };

  const loadLaps = async () => {
    try {
      console.log('LapList: Starting to load laps...');
      setLoading(true);
      setError(null);

      // First test if we can reach the API at all
      console.log('LapList: Testing API connectivity...');
      const canConnect = await apiClient.ping();
      console.log('LapList: API connectivity test:', canConnect ? 'SUCCESS' : 'FAILED');

      if (!canConnect) {
        throw new Error('Cannot connect to Garage 61 API. Check your token and network connection.');
      }

      // Get ALL laps from last 24 hours for current user (no API grouping)
      console.log('LapList: Searching for all laps from last 24 hours (group: none)');

      const response: LapsResponse = await apiClient.getLaps({
        limit: 200, // Get more laps for comprehensive analysis
        age: 1, // Laps driven in the last day (24 hours)
        drivers: 'me', // Only laps driven by current user
        group: 'none', // Get all individual laps, no API grouping
      });
      console.log('LapList: Successfully loaded', response.items.length, 'laps out of', response.total);
      setLaps(response.items);
      setTotalLaps(response.total);

      // Group laps by event ID
      const eventGroups = groupLapsByEvent(response.items);
      setEventGroups(eventGroups);
      console.log('LapList: Grouped into', eventGroups.length, 'events');
    } catch (err) {
      console.error('LapList: Error loading laps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lap data');
    } finally {
      setLoading(false);
    }
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


  const renderLapItem = ({ item }: { item: Lap }) => (
    <View style={styles.lapItem}>
      <View style={styles.lapHeader}>
        <Text style={styles.lapTime}>{formatLapTime(item.lapTime)}</Text>
        <Text style={styles.lapNumber}>Lap #{item.lapNumber}</Text>
      </View>

      <View style={styles.lapDetails}>
        <Text style={styles.detailText}>
          {item.track.name} - {item.car.name}
        </Text>
        <Text style={styles.detailText}>
          {getSessionTypeName(item.sessionType)} Session #{item.session}
        </Text>
        <Text style={styles.detailText}>
          {formatDate(item.startTime)}
        </Text>
      </View>

      <View style={styles.lapFlags}>
        {item.clean && <Text style={[styles.flag, styles.cleanFlag]}>Clean</Text>}
        {item.offtrack && <Text style={[styles.flag, styles.offtrackFlag]}>Off Track</Text>}
        {item.pitlane && <Text style={[styles.flag, styles.pitFlag]}>Pit</Text>}
        {item.incomplete && <Text style={[styles.flag, styles.incompleteFlag]}>Incomplete</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading lap data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLaps}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleEvent = (eventId: string) => {
    setEventGroups(groups =>
      groups.map(group =>
        group.eventId === eventId
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Analysis</Text>
      <Text style={styles.summary}>
        {eventGroups.length} events • {laps.length} total laps from last 24 hours
      </Text>

      <TouchableOpacity style={styles.refreshButton} onPress={loadLaps}>
        <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
      </TouchableOpacity>

      <FlatList
        data={eventGroups}
        renderItem={({ item }) => (
          <View style={styles.eventContainer}>
            {/* Event Header */}
            <TouchableOpacity
              style={styles.eventHeader}
              onPress={() => toggleEvent(item.eventId)}
            >
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>
                  {item.primaryCar} at {item.primaryTrack}
                </Text>
                <Text style={styles.eventStats}>
                  {item.totalLaps} laps • Best: {formatLapTime(item.bestLapTime)}
                </Text>
                <Text style={styles.eventDate}>
                  {formatDate(item.startTime)}
                </Text>
              </View>
              <Text style={styles.expandIcon}>
                {item.expanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {/* Event Laps */}
            {item.expanded && (
              <View style={styles.eventLaps}>
                {item.laps.map((lap, index) => (
                  <View key={lap.id} style={styles.lapItem}>
                    <View style={styles.lapHeader}>
                      <Text style={styles.lapTime}>{formatLapTime(lap.lapTime)}</Text>
                      <Text style={styles.lapNumber}>#{index + 1}</Text>
                    </View>

                    <View style={styles.lapDetails}>
                      <Text style={styles.detailText}>
                        {lap.track.name} - {lap.car.name}
                      </Text>
                      <Text style={styles.detailText}>
                        {getSessionTypeName(lap.sessionType)} Session #{lap.session}
                      </Text>
                    </View>

                    <View style={styles.lapFlags}>
                      {lap.clean && <Text style={[styles.flag, styles.cleanFlag]}>Clean</Text>}
                      {lap.offtrack && <Text style={[styles.flag, styles.offtrackFlag]}>Off Track</Text>}
                      {lap.pitlane && <Text style={[styles.flag, styles.pitFlag]}>Pit</Text>}
                      {lap.incomplete && <Text style={[styles.flag, styles.incompleteFlag]}>Incomplete</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        keyExtractor={(item) => item.eventId}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {laps.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lap data found</Text>
          <Text style={styles.emptySubtext}>
            No laps driven in the last 24 hours. Try driving some laps in iRacing or check your API permissions.
          </Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  summary: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  lapItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  lapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lapTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  lapNumber: {
    fontSize: 14,
    color: '#666666',
  },
  lapDetails: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 2,
  },
  lapFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  flag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    marginRight: 4,
    marginBottom: 2,
  },
  cleanFlag: {
    backgroundColor: '#28a745',
    color: '#ffffff',
  },
  offtrackFlag: {
    backgroundColor: '#dc3545',
    color: '#ffffff',
  },
  pitFlag: {
    backgroundColor: '#ffc107',
    color: '#000000',
  },
  incompleteFlag: {
    backgroundColor: '#6c757d',
    color: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 20,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  eventContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  eventStats: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#999999',
  },
  expandIcon: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 10,
  },
  eventLaps: {
    padding: 10,
    backgroundColor: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LapList;