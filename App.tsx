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
import {UserProfile, LapList} from '@/components';
import {RacingTheme} from '@/theme';

const App = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<'profile' | 'laps'>('profile');
  const [tabAnimation] = useState(new Animated.Value(0));

  const switchTab = (newTab: 'profile' | 'laps') => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      // Animate tab switch
      Animated.timing(tabAnimation, {
        toValue: newTab === 'profile' ? 0 : 1,
        duration: RacingTheme.animations.normal,
        useNativeDriver: false,
      }).start();
    }
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

        {/* Racing-inspired Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => switchTab('profile')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'profile' && styles.activeTabText,
              ]}>
              🏁 DRIVER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'laps' && styles.activeTab]}
            onPress={() => switchTab('laps')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'laps' && styles.activeTabText,
              ]}>
              📊 ANALYSIS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content with racing aesthetic */}
        <View style={styles.contentContainer}>
          {activeTab === 'profile' ? <UserProfile /> : <LapList />}
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
