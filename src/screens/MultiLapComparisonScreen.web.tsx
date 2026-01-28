import React from 'react';
import {View, StyleSheet} from 'react-native';
import {MultiLapComparison} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {useNavigate, useParams, useLocation} from 'react-router-dom';

const MultiLapComparisonScreen: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // For demo purposes, use sample data - in real app this would come from route params or API
  const sessionData: SessionData = {
    eventId: params.sessionId || 'sample',
    eventName: 'Sample Event',
    session: 1,
    sessionType: 1,
    laps: [],
    track: {
      id: 1,
      name: 'Sample Track',
    },
    car: {
      id: 1,
      name: 'Sample Car',
    },
    startTime: new Date().toISOString(),
  };

  const selectedLapIds = location.state?.selectedLapIds || [];
  const selectedLapIdsSet = new Set(selectedLapIds);

  const handleBackToSessionAnalysis = () => {
    navigate(`/session/${sessionData.id}`);
  };

  return (
    <View style={styles.container}>
      <MultiLapComparison
        sessionData={sessionData}
        onBack={handleBackToSessionAnalysis}
        selectedLapIds={selectedLapIdsSet}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
});

export default MultiLapComparisonScreen;
