import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  ProfileScreen,
  LapListScreen,
  ChartDemoScreen,
  SessionAnalysisScreen,
  MultiLapComparisonScreen,
} from '@/screens';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';

// Define the navigation types
type RootStackParamList = {
  MainTabs: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
};

type MainTabParamList = {
  Profile: undefined;
  Laps: undefined;
  Charts: undefined;
};

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator for the bottom tabs
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: RacingTheme.colors.surface,
          borderTopColor: RacingTheme.colors.surfaceElevated,
        },
        tabBarActiveTintColor: RacingTheme.colors.primary,
        tabBarInactiveTintColor: RacingTheme.colors.textSecondary,
        headerStyle: {
          backgroundColor: RacingTheme.colors.surface,
        },
        headerTintColor: RacingTheme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tab.Screen
        name='Profile'
        component={ProfileScreen}
        options={{
          title: '🏁 DRIVER',
          tabBarLabel: 'Driver',
        }}
      />
      <Tab.Screen
        name='Laps'
        component={LapListScreen}
        options={{
          title: '📊 ANALYSIS',
          tabBarLabel: 'Analysis',
        }}
      />
      <Tab.Screen
        name='Charts'
        component={ChartDemoScreen}
        options={{
          title: '📈 CHARTS',
          tabBarLabel: 'Charts',
        }}
      />
    </Tab.Navigator>
  );
};

// Main stack navigator
const AppNavigator = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: RacingTheme.colors.primary,
          background: RacingTheme.colors.background,
          card: RacingTheme.colors.surface,
          text: RacingTheme.colors.text,
          border: RacingTheme.colors.surfaceElevated,
          notification: RacingTheme.colors.primary,
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: RacingTheme.colors.surface,
          },
          headerTintColor: RacingTheme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name='MainTabs'
          component={MainTabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name='SessionAnalysis'
          component={SessionAnalysisScreen}
          options={{
            title: 'Session Analysis',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name='MultiLapComparison'
          component={MultiLapComparisonScreen}
          options={{
            title: 'Multi Lap Comparison',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
