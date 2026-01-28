import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useAuth} from '@/utils';

// Web-specific types
declare const window: any;
import {RacingCard, RacingButton, StatusBadge} from '@/components';
import {RacingTheme} from '@/theme';

const UserProfile: React.FC = () => {
  const {user, isLoading, error, isAuthenticated} = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!isLoading && !error && isAuthenticated && user) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: RacingTheme.animations.normal,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, error, isAuthenticated, user, fadeAnim]);

  if (isLoading) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.fullHeightContainer}>
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size='large'
              color={RacingTheme.colors.primary}
            />
            <Text style={styles.loadingText}>
              INITIALIZING DRIVER PROFILE...
            </Text>
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
            <Text style={styles.errorText}>CONNECTION FAILED</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <RacingButton
              title='RETRY CONNECTION'
              onPress={() => window.location.reload()}
              style={styles.retryButton}
            />
          </View>
        </View>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.fullHeightContainer}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>NOT AUTHENTICATED</Text>
            <Text style={styles.errorSubtext}>
              Please check your GARAGE61_API_TOKEN in .env.local
            </Text>
          </View>
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
            {/* Driver Header Card */}
            <RacingCard style={styles.headerCard} glow>
              <View style={styles.driverHeader}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverInitial}>
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.driverNickname}>"{user.nickName}"</Text>
                  <Text style={styles.driverId}>ID: {user.id}</Text>
                </View>
              </View>
            </RacingCard>

            {/* Subscription Status */}
            <RacingCard style={styles.subscriptionCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💳</Text>
                <Text style={styles.cardTitle}>SUBSCRIPTION</Text>
              </View>
              <View style={styles.subscriptionContent}>
                <Text style={styles.subscriptionPlan}>
                  {user.subscriptionPlan}
                </Text>
                <StatusBadge status='clean' style={styles.subscriptionBadge} />
              </View>
            </RacingCard>

            {/* API Permissions */}
            <RacingCard style={styles.permissionsCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🔑</Text>
                <Text style={styles.cardTitle}>API ACCESS</Text>
              </View>
              <View style={styles.permissionsGrid}>
                {user.apiPermissions.map((permission, index) => (
                  <View key={index} style={styles.permissionChip}>
                    <Text style={styles.permissionText}>{permission}</Text>
                  </View>
                ))}
              </View>
            </RacingCard>

            {/* Teams */}
            {user.teams && user.teams.length > 0 && (
              <RacingCard style={styles.teamsCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🏎️</Text>
                  <Text style={styles.cardTitle}>RACING TEAMS</Text>
                </View>
                {user.teams.map((team, index) => (
                  <View key={index} style={styles.teamRow}>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{team.name}</Text>
                      <Text style={styles.teamRole}>{team.role}</Text>
                    </View>
                    <StatusBadge status='best' style={styles.teamBadge} />
                  </View>
                ))}
              </RacingCard>
            )}

            {/* Data Packs */}
            {user.subscribedDataPacks &&
              user.subscribedDataPacks.length > 0 && (
                <RacingCard style={styles.dataPacksCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>📊</Text>
                    <Text style={styles.cardTitle}>DATA PACKS</Text>
                  </View>
                  <Text style={styles.dataPackCount}>
                    {user.subscribedDataPacks.length} ACTIVE DATA PACK
                    {user.subscribedDataPacks.length !== 1 ? 'S' : ''}
                  </Text>
                  <StatusBadge status='clean' style={styles.dataPackBadge} />
                </RacingCard>
              )}

            {/* Driver Stats Footer */}
            <RacingCard style={styles.statsCard}>
              <Text style={styles.statsTitle}>DRIVER STATUS</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>ONLINE</Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user.slug}</Text>
                  <Text style={styles.statLabel}>Handle</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>READY</Text>
                  <Text style={styles.statLabel}>System</Text>
                </View>
              </View>
            </RacingCard>

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
    backgroundColor: RacingTheme.colors.background,
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
  headerCard: {
    marginBottom: RacingTheme.spacing.lg,
    padding: RacingTheme.spacing.lg,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: RacingTheme.borderRadius.full,
    backgroundColor: RacingTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: RacingTheme.spacing.lg,
    ...RacingTheme.shadows.glow,
  },
  driverInitial: {
    fontSize: RacingTheme.typography.h1,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.background,
    fontFamily: RacingTheme.typography.mono,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.xs,
  },
  driverNickname: {
    fontSize: RacingTheme.typography.body,
    color: RacingTheme.colors.primary,
    fontStyle: 'italic',
    marginBottom: RacingTheme.spacing.xs,
  },
  driverId: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
    fontFamily: RacingTheme.typography.mono,
  },
  subscriptionCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  permissionsCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  teamsCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  dataPacksCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  statsCard: {
    marginBottom: RacingTheme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RacingTheme.spacing.md,
  },
  cardIcon: {
    fontSize: RacingTheme.typography.h4,
    marginRight: RacingTheme.spacing.sm,
  },
  cardTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    letterSpacing: 1,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionPlan: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.secondary,
  },
  subscriptionBadge: {
    marginLeft: RacingTheme.spacing.sm,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionChip: {
    backgroundColor: RacingTheme.colors.surfaceElevated,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    margin: RacingTheme.spacing.xs,
    borderWidth: 1,
    borderColor: RacingTheme.colors.primary,
  },
  permissionText: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.primary,
    fontWeight: RacingTheme.typography.medium as any,
    fontFamily: RacingTheme.typography.mono,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: RacingTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: RacingTheme.colors.surfaceElevated,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.medium as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.xs,
  },
  teamRole: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    backgroundColor: RacingTheme.colors.surfaceElevated,
    paddingHorizontal: RacingTheme.spacing.sm,
    paddingVertical: RacingTheme.spacing.xs,
    borderRadius: RacingTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  teamBadge: {
    marginLeft: RacingTheme.spacing.sm,
  },
  dataPackCount: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    marginBottom: RacingTheme.spacing.sm,
  },
  dataPackBadge: {
    alignSelf: 'flex-start',
  },
  statsTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.lg,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.secondary,
    marginBottom: RacingTheme.spacing.xs,
  },
  statLabel: {
    fontSize: RacingTheme.typography.small,
    color: RacingTheme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    letterSpacing: 1,
    marginBottom: RacingTheme.spacing.sm,
  },
  errorSubtext: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.lg,
  },
  retryButton: {
    marginTop: RacingTheme.spacing.md,
  },
  bottomSpacing: {
    height: RacingTheme.spacing.xxxl,
  },
});

export default UserProfile;
