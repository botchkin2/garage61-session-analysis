import {Platform} from 'react-native';
import {SessionData} from '@/types';

// Export types for use in screens
export type RootStackParamList = {
  MainTabs: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
};

export type MainTabParamList = {
  Profile: undefined;
  Laps: undefined;
};

// Import platform-specific navigation
const AppNavigator = Platform.select({
  web: () => require('./AppNavigator.web').default,
  default: () => require('./AppNavigator.native').default,
})();

export default AppNavigator;
