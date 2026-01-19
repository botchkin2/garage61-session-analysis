import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiClient } from '@/utils';
import { Lap, LapsResponse } from '@/types';

const LapList: React.FC = () => {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLaps, setTotalLaps] = useState(0);
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('grouped');

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

      // Get laps from last 24 hours for current user, grouped by driver-car
      console.log('LapList: Searching for laps from last 24 hours (age: 1) with driver-car grouping');

      const response: LapsResponse = await apiClient.getLaps({
        limit: 100, // Get more laps for better grouping
        age: 1, // Laps driven in the last day (24 hours)
        drivers: 'me', // Only laps driven by current user
        group: 'driver-car', // Use API's built-in driver-car grouping
      });
      console.log('LapList: Successfully loaded', response.items.length, 'grouped laps out of', response.total);
      setLaps(response.items);
      setTotalLaps(response.total);
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

  const renderGroupedItem = ({ item }: { item: Lap }) => (
    <View style={styles.groupItem}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>
          {item.car.name} at {item.track.name}
        </Text>
        <Text style={styles.groupStats}>
          Personal Best: {formatLapTime(item.lapTime)}
        </Text>
      </View>

      <View style={styles.groupDetails}>
        <Text style={styles.detailText}>
          Driver: {item.driver?.nickName || item.driver?.firstName || 'Unknown'}
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Laps</Text>
      <Text style={styles.summary}>
        {viewMode === 'grouped'
          ? `Showing ${laps.length} personal best laps (API-grouped by driver-car)`
          : `Showing ${laps.length} of ${totalLaps} total laps from last 24 hours`
        }
      </Text>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'grouped' && styles.activeToggle]}
          onPress={() => setViewMode('grouped')}
        >
          <Text style={[styles.toggleText, viewMode === 'grouped' && styles.activeToggleText]}>
            Personal Bests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'individual' && styles.activeToggle]}
          onPress={() => setViewMode('individual')}
        >
          <Text style={[styles.toggleText, viewMode === 'individual' && styles.activeToggleText]}>
            Individual Laps
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.testButton} onPress={loadLaps}>
        <Text style={styles.testButtonText}>🔄 Refresh Laps</Text>
      </TouchableOpacity>

      {viewMode === 'grouped' ? (
        <FlatList
          data={laps}
          renderItem={renderGroupedItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={laps}
          renderItem={renderLapItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {laps.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lap data found</Text>
          <Text style={styles.emptySubtext}>
            No laps driven in the last 24 hours. Try adjusting the time range or check your API permissions.
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
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 20,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#ffffff',
  },
  groupItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  groupHeader: {
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  groupStats: {
    fontSize: 14,
    color: '#666666',
  },
  groupDetails: {
    marginBottom: 10,
  },
  recentLaps: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  },
  recentLapsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  recentLapTime: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreLaps: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
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