import React from 'react';
import {View, StyleSheet} from 'react-native';
import {MultiLapComparison} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';

type RootStackParamList = {
  Profile: undefined;
  Laps: undefined;
  Charts: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
};

type MultiLapComparisonScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MultiLapComparison'
>;

type MultiLapComparisonScreenRouteProp = RouteProp<
  RootStackParamList,
  'MultiLapComparison'
>;

interface Props {
  navigation: MultiLapComparisonScreenNavigationProp;
  route: MultiLapComparisonScreenRouteProp;
}

const MultiLapComparisonScreen: React.FC<Props> = ({navigation, route}) => {
  const {sessionData, selectedLapIds} = route.params;
  const selectedLapIdsSet = selectedLapIds
    ? new Set(selectedLapIds)
    : new Set<string>();

  const handleBackToSessionAnalysis = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MultiLapComparison
        sessionData={sessionData}
        onBack={handleBackToSessionAnalysis}
        selectedLapIds={selectedLapIdsSet}
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

export default MultiLapComparisonScreen;
