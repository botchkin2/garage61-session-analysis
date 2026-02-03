import {RacingButton} from '@src/components';
import {RacingTheme} from '@src/theme';
import {Lap} from '@src/types';
import React from 'react';
import {Text, View} from 'react-native';

interface LapSelectionControlsProps {
  laps: Lap[];
  selectedLaps: Lap[];
  onSelectAllLaps: () => void;
  onSelectCleanLaps: () => void;
  onClearSelection: () => void;
  onMultiLapComparison?: (selectedLapIds: Set<string>) => void;
}

const LapSelectionControls: React.FC<LapSelectionControlsProps> = ({
  laps,
  selectedLaps,
  onSelectAllLaps,
  onSelectCleanLaps,
  onClearSelection,
  onMultiLapComparison,
}) => {
  return (
    <View style={styles.selectionSection}>
      <Text style={styles.sectionTitle}>LAP SELECTION</Text>
      <View style={styles.selectionControls}>
        <RacingButton
          title='SELECT ALL'
          onPress={onSelectAllLaps}
          style={styles.selectionButton}
        />
        <RacingButton
          title='CLEAN LAPS'
          onPress={onSelectCleanLaps}
          style={styles.selectionButton}
        />
        <RacingButton
          title='CLEAR ALL'
          onPress={onClearSelection}
          style={styles.selectionButton}
        />
        {onMultiLapComparison && selectedLaps.length > 0 && (
          <RacingButton
            title='📊 COMPARE LAPS'
            onPress={() =>
              onMultiLapComparison(new Set(selectedLaps.map(lap => lap.id)))
            }
            style={[styles.selectionButton, styles.compareButton] as any}
          />
        )}
      </View>
      <Text style={styles.selectionInfo}>
        {selectedLaps.length} of {laps.length} laps selected for analysis
      </Text>
    </View>
  );
};

const styles = {
  selectionSection: {
    marginBottom: RacingTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: RacingTheme.typography.h4,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.text,
    marginBottom: RacingTheme.spacing.md,
    letterSpacing: 1,
  },
  selectionControls: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: RacingTheme.spacing.sm,
    marginBottom: RacingTheme.spacing.md,
  },
  selectionButton: {
    flex: 1,
    minWidth: 80,
  },
  selectionInfo: {
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.textSecondary,
    textAlign: 'center' as const,
    fontStyle: 'italic',
  },
  compareButton: {
    backgroundColor: RacingTheme.colors.secondary,
  },
};

export default LapSelectionControls;
