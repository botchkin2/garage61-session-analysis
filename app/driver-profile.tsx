import React from 'react';
import {View, StyleSheet} from 'react-native';
import {UserProfile, BottomNavigation} from '@src/components';
import {RacingTheme} from '@src/theme';

const DriverProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <UserProfile />
      <BottomNavigation currentScreen='driver' />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default DriverProfileScreen;
