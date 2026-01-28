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
  ChartDemoScreen,
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
    if (pathname === '/charts') {
      return 'charts';
    }
    return 'profile';
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs = [
    {key: 'profile', label: '🏁 DRIVER', path: '/'},
    {key: 'laps', label: '📊 ANALYSIS', path: '/laps'},
    {key: 'charts', label: '📈 CHARTS', path: '/charts'},
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
            <Route path='/charts' element={<ChartDemoScreen />} />
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
    borderBottomWidth: 1,
    borderBottomColor: RacingTheme.colors.surfaceElevated,
  },
  tab: {
    flex: 1,
    paddingVertical: RacingTheme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
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
    textDecoration: 'none',
    flex: 1,
  },
});

export default AppNavigator;
