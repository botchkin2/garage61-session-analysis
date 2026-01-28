import React from 'react';
import {View, StyleSheet} from 'react-native';
import {LapList} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type RootStackParamList = {
  Profile: undefined;
  Laps: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
};

type LapListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Laps'
>;

interface Props {
  navigation: LapListScreenNavigationProp;
}

const LapListScreen: React.FC<Props> = ({navigation}) => {
  const handleSessionAnalysis = (data: SessionData) => {
    navigation.navigate('SessionAnalysis', {sessionData: data});
  };

  return (
    <View style={styles.container}>
      <LapList onSessionAnalysis={handleSessionAnalysis} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default LapListScreen;
