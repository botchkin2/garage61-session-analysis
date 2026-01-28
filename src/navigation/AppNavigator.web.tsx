import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  ProfileScreen,
  LapListScreen,
  SessionAnalysisScreen,
  MultiLapComparisonScreen,
} from '@/screens';
import {RacingTheme} from '@/theme';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

// Web Tab Bar Component
const WebTabBar = () => {
  const location = useLocation();

  const getActiveTab = (pathname: string) => {
    if (pathname === '/' || pathname === '/profile') {
      return 'profile';
    }
    if (pathname === '/laps') {
      return 'laps';
    }
    return 'profile';
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs = [
    {key: 'profile', label: '🏁 DRIVER', path: '/'},
    {key: 'laps', label: '📊 ANALYSIS', path: '/laps'},
  ];

  // Hide tab bar on session/comparison screens
  if (
    location.pathname.startsWith('/session') ||
    location.pathname.startsWith('/comparison')
  ) {
    return null;
  }

  return (
    <View style={styles.tabContainer}>
      {tabs.map(tab => (
        <Link key={tab.key} to={tab.path} style={styles.link}>
          <TouchableOpacity
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  );
};

// Main web navigation component
const AppNavigator = () => {
  return (
    <Router>
      <View style={styles.container}>
        <WebTabBar />
        <View style={styles.contentContainer}>
          <Routes>
            <Route path='/' element={<ProfileScreen />} />
            <Route path='/profile' element={<ProfileScreen />} />
            <Route path='/laps' element={<LapListScreen />} />
            <Route
              path='/session/:sessionId'
              element={<SessionAnalysisScreen />}
            />
            <Route
              path='/comparison/:sessionId'
              element={<MultiLapComparisonScreen />}
            />
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
        </View>
      </View>
    </Router>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: RacingTheme.colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: RacingTheme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    borderRadius: RacingTheme.borderRadius.md,
    marginHorizontal: RacingTheme.spacing.sm,
    marginVertical: RacingTheme.spacing.xs,
  },
  activeTab: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
    shadowColor: RacingTheme.colors.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: RacingTheme.colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  link: {
    flex: 1,
  },
});

export default AppNavigator;
