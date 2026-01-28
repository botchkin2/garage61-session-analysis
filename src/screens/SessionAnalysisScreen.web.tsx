import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {SessionAnalysis} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {useNavigate, useParams} from 'react-router-dom';

const SessionAnalysisScreen: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();

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

  const handleBackToLaps = () => {
    navigate('/laps');
  };

  const handleMultiLapComparison = (selectedLaps?: Set<string>) => {
    const selectedLapIds = selectedLaps ? Array.from(selectedLaps) : undefined;
    navigate(`/comparison/${sessionData.eventId}`, {state: {selectedLapIds}});
  };

  return (
    <View style={styles.container}>
      <SessionAnalysis
        sessionData={sessionData}
        onBack={handleBackToLaps}
        onMultiLapComparison={handleMultiLapComparison}
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

export default SessionAnalysisScreen;
