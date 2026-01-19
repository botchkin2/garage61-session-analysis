import React, { useState } from 'react';
import {SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, Text, View} from 'react-native';
import { AuthProvider } from '@/utils';
import { UserProfile, LapList } from '@/components';

const App = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<'profile' | 'laps'>('profile');

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'laps' && styles.activeTab]}
            onPress={() => setActiveTab('laps')}
          >
            <Text style={[styles.tabText, activeTab === 'laps' && styles.activeTabText]}>
              Analysis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'profile' ? <UserProfile /> : <LapList />}
      </SafeAreaView>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default App;
