import React, {useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Animated,
} from 'react-native';
import {AuthProvider} from '@/utils';
import {UserProfile, LapList, SessionAnalysis} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';

const App = (): React.JSX.Element => {
  const [activeView, setActiveView] = useState<'profile' | 'laps' | 'session'>(
    'profile',
  );
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [tabAnimation] = useState(new Animated.Value(0));

  const switchView = (
    newView: 'profile' | 'laps' | 'session',
    data?: SessionData,
  ) => {
    if (newView !== activeView) {
      if (newView === 'session' && data) {
        setSessionData(data);
      }
      setActiveView(newView);
      // Animate view switch
      Animated.timing(tabAnimation, {
        toValue: newView === 'profile' ? 0 : newView === 'laps' ? 1 : 2,
        duration: RacingTheme.animations.normal,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleSessionAnalysis = (data: SessionData) => {
    switchView('session', data);
  };

  const handleBackToLaps = () => {
    switchView('laps');
    setSessionData(null);
  };

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={RacingTheme.colors.background}
        />

        {/* Racing-themed Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RACE ANALYTICS</Text>
          <View style={styles.headerAccent} />
        </View>

        {/* Racing-inspired Tab Navigation - Only show when not in session analysis */}
        {activeView !== 'session' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeView === 'profile' && styles.activeTab]}
              onPress={() => switchView('profile')}>
              <Text
                style={[
                  styles.tabText,
                  activeView === 'profile' && styles.activeTabText,
                ]}>
                🏁 DRIVER
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeView === 'laps' && styles.activeTab]}
              onPress={() => switchView('laps')}>
              <Text
                style={[
                  styles.tabText,
                  activeView === 'laps' && styles.activeTabText,
                ]}>
                📊 ANALYSIS
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content with racing aesthetic */}
        <View style={styles.contentContainer}>
          {activeView === 'profile' ? (
            <UserProfile />
          ) : activeView === 'session' && sessionData ? (
            <SessionAnalysis
              sessionData={sessionData}
              onBack={handleBackToLaps}
            />
          ) : (
            <LapList onSessionAnalysis={handleSessionAnalysis} />
          )}
        </View>
      </SafeAreaView>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  header: {
    backgroundColor: RacingTheme.colors.surface,
    paddingVertical: RacingTheme.spacing.lg,
    paddingHorizontal: RacingTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: RacingTheme.colors.surfaceElevated,
    ...RacingTheme.shadows.sm,
  },
  headerTitle: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold,
    color: RacingTheme.colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: RacingTheme.typography.primary,
  },
  headerAccent: {
    height: 2,
    backgroundColor: RacingTheme.colors.primary,
    marginTop: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    ...RacingTheme.shadows.glow,
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
    fontWeight: RacingTheme.typography.medium,
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: RacingTheme.colors.primary,
    fontWeight: RacingTheme.typography.bold,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default App;
