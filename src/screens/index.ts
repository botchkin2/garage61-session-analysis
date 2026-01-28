// Export all screens from here for easier imports
export {default as ChartDemoScreen} from './ChartDemoScreen';
export {default as ProfileScreen} from './ProfileScreen';

// Platform-specific exports
import {Platform} from 'react-native';

export const LapListScreen = Platform.select({
  web: () => require('./LapListScreen.web').default,
  default: () => require('./LapListScreen').default,
})();

export const SessionAnalysisScreen = Platform.select({
  web: () => require('./SessionAnalysisScreen.web').default,
  default: () => require('./SessionAnalysisScreen').default,
})();

export const MultiLapComparisonScreen = Platform.select({
  web: () => require('./MultiLapComparisonScreen.web').default,
  default: () => require('./MultiLapComparisonScreen').default,
})();
