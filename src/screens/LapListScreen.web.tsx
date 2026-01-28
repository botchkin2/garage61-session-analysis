import React from 'react';
import {View, StyleSheet} from 'react-native';
import {LapList} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {useNavigate} from 'react-router-dom';

const LapListScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleSessionAnalysis = (data: SessionData) => {
    navigate(`/session/${data.eventId || 'default'}`);
  };

  return (
    <View style={styles.container}>
      <LapList onSessionAnalysis={handleSessionAnalysis} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default LapListScreen;
