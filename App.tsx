import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import { AuthProvider } from '@/utils';
import { UserProfile } from '@/components';

const App = (): React.JSX.Element => {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <UserProfile />
      </SafeAreaView>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
