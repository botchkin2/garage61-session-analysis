import {RacingCard} from '@src/components';
import {RacingTheme} from '@src/theme';
import React from 'react';
import {Text, View} from 'react-native';

interface OptimalSectorData {
  sector: number;
  time: number;
}

interface OptimalSectorAnalysisProps {
  optimalSectors: OptimalSectorData[];
  optimalLapTime: number;
  isMobile: boolean;
}

const OptimalSectorAnalysis: React.FC<OptimalSectorAnalysisProps> = ({
  optimalSectors,
  optimalLapTime,
  isMobile,
}) => {
  const formatLapTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  if (optimalSectors.length === 0) {
    return null;
  }

  return (
    <View style={styles.optimalSection}>
      <Text style={styles.sectionTitle}>OPTIMAL LAP ANALYSIS</Text>

      <View
        style={
          isMobile ? styles.optimalCombinedRowMobile : styles.optimalCombinedRow
        }>
        {/* Theoretical Optimal Lap */}
        <RacingCard style={styles.optimalLapCard}>
          <Text style={styles.optimalLapTitle}>THEORETICAL BEST LAP</Text>
          <Text style={styles.optimalLapTime}>
            {formatLapTime(optimalLapTime)}
          </Text>
          <Text style={styles.optimalLapLabel}>Best sectors combined</Text>
        </RacingCard>

        {/* Optimal Sector Times */}
        <View style={styles.sectorsContainer}>
          <Text style={styles.sectorsTitle}>BEST SECTOR TIMES</Text>
          {isMobile ? (
            <View style={styles.mobileSectorsList}>
              {optimalSectors.map(sector => (
                <View key={sector.sector} style={styles.mobileSectorItem}>
                  <View style={styles.mobileSectorHeader}>
                    <Text style={styles.mobileSectorNumber}>
                      S{sector.sector + 1}
                    </Text>
                    <Text style={styles.mobileSectorTime}>
                      {formatLapTime(sector.time)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.desktopSectorsGrid}>
              {optimalSectors.map(sector => (
                <View key={sector.sector} style={styles.desktopSectorCard}>
                  <Text style={styles.desktopSectorNumber}>
                    S{sector.sector + 1}
                  </Text>
                  <Text style={styles.desktopSectorTime}>
                    {formatLapTime(sector.time)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = {
  optimalSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
  },
  optimalCombinedRow: {
    flexDirection: 'row' as const,
    gap: RacingTheme.spacing.md,
    alignItems: 'flex-start',
  },
  optimalCombinedRowMobile: {
    flexDirection: 'column' as const,
    gap: RacingTheme.spacing.md,
  },
  optimalLapCard: {
    alignItems: 'center',
    padding: RacingTheme.spacing.lg,
    flex: 1,
  },
  optimalLapTitle: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: RacingTheme.spacing.sm,
  },
  optimalLapTime: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.secondary,
    fontFamily: RacingTheme.typography.mono,
    marginBottom: RacingTheme.spacing.xs,
  },
  optimalLapLabel: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textTertiary,
  },
  sectorsContainer: {
    flex: 2,
  },
  sectorsTitle: {
    fontSize: RacingTheme.typography.small,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.sm,
  },
  // Mobile Sector Styles
  mobileSectorsList: {
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.md,
    padding: RacingTheme.spacing.md,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
  },
  mobileSectorItem: {
    paddingVertical: RacingTheme.spacing.sm,
  },
  mobileSectorHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileSectorNumber: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
  },
  mobileSectorTime: {
    fontSize: RacingTheme.typography.body,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    fontFamily: RacingTheme.typography.mono,
  },
  // Desktop Sector Styles
  desktopSectorsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: RacingTheme.spacing.sm,
  },
  desktopSectorCard: {
    backgroundColor: RacingTheme.colors.surface,
    borderRadius: RacingTheme.borderRadius.md,
    padding: RacingTheme.spacing.lg,
    borderWidth: 1,
    borderColor: RacingTheme.colors.surfaceElevated,
    alignItems: 'center',
    minWidth: 120,
    flex: 1,
  },
  desktopSectorNumber: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: RacingTheme.spacing.xs,
  },
  desktopSectorTime: {
    fontSize: RacingTheme.typography.h3,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.primary,
    fontFamily: RacingTheme.typography.mono,
  },
};

export default OptimalSectorAnalysis;
