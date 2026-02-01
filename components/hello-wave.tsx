import Animated from 'react-native-reanimated';
import {StyleSheet} from 'react-native';

export function HelloWave() {
  return <Animated.Text style={styles.text}>👋</Animated.Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
