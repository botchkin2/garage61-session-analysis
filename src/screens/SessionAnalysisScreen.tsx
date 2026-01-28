import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SessionAnalysis} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';

type RootStackParamList = {
  Profile: undefined;
  Laps: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
};

type SessionAnalysisScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SessionAnalysis'
>;

type SessionAnalysisScreenRouteProp = RouteProp<
  RootStackParamList,
  'SessionAnalysis'
>;

interface Props {
  navigation: SessionAnalysisScreenNavigationProp;
  route: SessionAnalysisScreenRouteProp;
}

const SessionAnalysisScreen: React.FC<Props> = ({navigation, route}) => {
  const {sessionData} = route.params;

  const handleBackToLaps = () => {
    navigation.goBack();
  };

  const handleMultiLapComparison = (selectedLaps?: Set<string>) => {
    const selectedLapIds = selectedLaps ? Array.from(selectedLaps) : undefined;
    navigation.navigate('MultiLapComparison', {
      sessionData,
      selectedLapIds,
    });
  };

  return (
    <View style={styles.container}>
      <SessionAnalysis
        sessionData={sessionData}
        onBack={handleBackToLaps}
        onMultiLapComparison={handleMultiLapComparison}
      />
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
