import React from 'react';
import {StatusBar} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider, queryClient} from '@/utils';
import {AppNavigator} from '@/navigation';
import {RacingTheme} from '@/theme';

const App = (): React.JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar
          barStyle='light-content'
          backgroundColor={RacingTheme.colors.background}
        />
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
