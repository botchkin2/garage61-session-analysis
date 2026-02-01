import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {LapList, BottomNavigation} from '@src/components';
import {RacingTheme} from '@src/theme';
import {SessionData} from '@src/types';

const AnalysisScreen: React.FC = () => {
  const router = useRouter();

  const handleSessionAnalysis = (data: SessionData) => {
    router.push({
      pathname: '/session-analysis',
      params: {sessionData: JSON.stringify(data)},
    });
  };

  return (
    <View style={styles.container}>
      <LapList onSessionAnalysis={handleSessionAnalysis} />
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

export default AnalysisScreen;
