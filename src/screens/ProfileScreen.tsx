import React from 'react';
import {View, StyleSheet} from 'react-native';
import {UserProfile} from '@/components';
import {RacingTheme} from '@/theme';

const ProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <UserProfile />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default ProfileScreen;
