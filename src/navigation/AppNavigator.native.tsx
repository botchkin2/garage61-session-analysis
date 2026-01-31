import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TouchableOpacity, Text} from 'react-native';
import {
  ProfileScreen,
  LapListScreen,
  SessionAnalysisScreen,
  MultiLapComparisonScreen,
  SettingsScreen,
} from '@/screens';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';

// Define the navigation types
type RootStackParamList = {
  MainTabs: undefined;
  SessionAnalysis: {sessionData: SessionData};
  MultiLapComparison: {sessionData: SessionData; selectedLapIds?: string[]};
  Settings: undefined;
};

type MainTabParamList = {
  Profile: undefined;
  Laps: undefined;
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
        options={({navigation}) => ({
          title: '🏁 DRIVER',
          tabBarLabel: 'Driver',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{padding: 10}}>
              <Text style={{fontSize: 20}}>⚙️</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen
        name='Laps'
        component={LapListScreen}
        options={{
          title: '📊 ANALYSIS',
          tabBarLabel: 'Analysis',
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
        fonts: {
          regular: {
            fontFamily: RacingTheme.typography.primary,
            fontWeight: RacingTheme.typography.regular,
          },
          medium: {
            fontFamily: RacingTheme.typography.primary,
            fontWeight: RacingTheme.typography.medium,
          },
          bold: {
            fontFamily: RacingTheme.typography.primary,
            fontWeight: RacingTheme.typography.bold,
          },
          heavy: {
            fontFamily: RacingTheme.typography.primary,
            fontWeight: RacingTheme.typography.bold,
          },
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
        <Stack.Screen
          name='Settings'
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
