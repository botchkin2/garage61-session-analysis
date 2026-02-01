import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {SessionAnalysis, BottomNavigation} from '@src/components';
import {RacingTheme} from '@src/theme';
import {SessionData} from '@src/types';

const SessionAnalysisScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionData: SessionData = JSON.parse(params.sessionData as string);

  const handleBackToLaps = () => {
    router.back();
  };

  const handleMultiLapComparison = (selectedLaps?: Set<string>) => {
    const selectedLapIds = selectedLaps ? Array.from(selectedLaps) : undefined;
    router.push({
      pathname: '/multi-lap-comparison',
      params: {
        sessionData: JSON.stringify(sessionData),
        selectedLapIds: selectedLapIds
          ? JSON.stringify(selectedLapIds)
          : undefined,
      },
    });
  };

  return (
    <View style={styles.container}>
      <SessionAnalysis
        sessionData={sessionData}
        onBack={handleBackToLaps}
        onMultiLapComparison={handleMultiLapComparison}
      />
      <BottomNavigation currentScreen='index' />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default SessionAnalysisScreen;
