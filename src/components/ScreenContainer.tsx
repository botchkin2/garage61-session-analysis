import React from 'react';
import {StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Which edges to apply safe area. Default ['top'] so content clears status bar/notch; bottom is handled by BottomNavigation. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Wraps screen content with safe area insets so it doesn't sit under notches/status bar.
 * Use this as the root container for every screen instead of View + useSafeAreaInsets().
 */
const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  edges = ['top'],
}) => (
  <SafeAreaView style={[styles.container, style]} edges={edges}>
    {children}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
