import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {QueryClientProvider} from '@tanstack/react-query';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import 'react-native-reanimated';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {useColorScheme} from '@hooks/use-color-scheme';
import {AuthProvider} from '@src/utils/authContext';
import {queryClient} from '@src/utils/queryClient';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <ThemeProvider
            value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack
              screenOptions={{
                headerShown: false, // Remove all headers to maximize space
              }}>
              <Stack.Screen name='index' />
              <Stack.Screen name='driver-profile' />
              <Stack.Screen name='session-analysis' />
              <Stack.Screen name='multi-lap-comparison' />
              <Stack.Screen name='cache-management' />
              <Stack.Screen name='modal' options={{presentation: 'modal'}} />
            </Stack>
            <StatusBar style='auto' />
          </ThemeProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
