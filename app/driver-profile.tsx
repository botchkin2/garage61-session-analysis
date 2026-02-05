import {BottomNavigation, ScreenContainer, UserProfile} from '@src/components';
import {RacingTheme} from '@src/theme';
import React from 'react';
import {StyleSheet} from 'react-native';

const DriverProfileScreen: React.FC = () => (
  <ScreenContainer style={styles.container}>
    <UserProfile />
    <BottomNavigation currentScreen='driver' />
  </ScreenContainer>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default DriverProfileScreen;
