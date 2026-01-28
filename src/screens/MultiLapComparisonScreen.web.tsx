import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {MultiLapComparison} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {useNavigate, useParams, useLocation} from 'react-router-dom';

const MultiLapComparisonScreen: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Validate sessionId - redirect to /laps if undefined or the string "undefined"
  useEffect(() => {
    const sessionId = params.sessionId;
    if (!sessionId || sessionId === 'undefined') {
      navigate('/laps', {replace: true});
    }
  }, [params.sessionId, navigate]);

  // Early return if sessionId is invalid (will redirect via useEffect)
  const sessionId = params.sessionId;
  if (!sessionId || sessionId === 'undefined') {
    return null;
  }

  // For demo purposes, use sample data - in real app this would come from route params or API
  const sessionData: SessionData = {
    eventId: sessionId,
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
    // Use eventId instead of id, and validate it exists
    if (sessionData.eventId && sessionData.eventId !== 'undefined') {
      navigate(`/session/${sessionData.eventId}`);
    } else {
      navigate('/laps');
    }
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
