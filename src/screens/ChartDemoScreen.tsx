import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {TimeSeriesChart} from '@/components';
import {RacingTheme} from '@/theme';

const ChartDemoScreen: React.FC = () => {
  const chartConfigs = {
    brake: {
      title: 'Real-Time Brake Pressure',
      dataPoints: 1000,
      animationDuration: 1000,
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Brake Pressure Analysis</Text>
      </View>

      {/* Brake Chart */}
      <TimeSeriesChart {...chartConfigs.brake} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RacingTheme.colors.text,
  },
});

export default ChartDemoScreen;
