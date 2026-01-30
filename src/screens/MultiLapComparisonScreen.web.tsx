import React, {useEffect, useMemo} from 'react';
import {View, StyleSheet, Text, ActivityIndicator} from 'react-native';
import {MultiLapComparison, RacingButton} from '@/components';
import {RacingTheme} from '@/theme';
import {SessionData} from '@/types';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import {useLaps} from '@/hooks/useApiQueries';

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

  // Fetch laps for this specific event (must be before early return)
  const {
    data: lapsResponse,
    isLoading: lapsLoading,
    error: lapsError,
  } = useLaps(
    {
      event: sessionId,
      limit: 200,
      group: 'none',
    },
    {enabled: !!sessionId && sessionId !== 'undefined'},
  );

  // Construct session data from fetched laps
  const sessionData: SessionData | null = useMemo(() => {
    if (!lapsResponse?.items || lapsResponse.items.length === 0) {
      return null;
    }

    const laps = lapsResponse.items;
    const firstLap = laps[0];

    // Find the best lap (lowest lap time)
    const bestLap = laps.reduce((best, current) =>
      current.lapTime < best.lapTime ? current : best,
    );

    return {
      eventId: sessionId,
      eventName: firstLap.event || 'Unknown Event',
      session: bestLap.session,
      sessionType: bestLap.sessionType,
      laps: laps,
      track: bestLap.track,
      car: bestLap.car,
      startTime: firstLap.startTime,
    };
  }, [lapsResponse, sessionId]);

  const selectedLapIds = location.state?.selectedLapIds || [];
  const selectedLapIdsSet = new Set(
    Array.isArray(selectedLapIds)
      ? selectedLapIds.filter((id): id is string => typeof id === 'string')
      : [],
  );

  const handleBackToSessionAnalysis = () => {
    if (sessionData?.eventId && sessionData.eventId !== 'undefined') {
      navigate(`/session/${sessionData.eventId}`);
    } else {
      navigate('/laps');
    }
  };

  // Show loading state
  if (lapsLoading || !sessionData) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size='large' color={RacingTheme.colors.primary} />
          <Text style={styles.loadingText}>
            {lapsLoading ? 'LOADING SESSION DATA...' : 'NO SESSION DATA FOUND'}
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (lapsError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>SESSION ERROR</Text>
          <Text style={styles.errorText}>{(lapsError as Error).message}</Text>
          <RacingButton
            title='RETRY CONNECTION'
            onPress={() => window.location.reload()}
            style={styles.refreshButton}
          />
        </View>
      </View>
    );
  }

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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: RacingTheme.spacing.md,
    backgroundColor: RacingTheme.colors.background,
  },
  loadingText: {
    marginTop: RacingTheme.spacing.md,
    fontSize: RacingTheme.typography.caption,
    color: RacingTheme.colors.primary,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: RacingTheme.typography.h2,
    fontWeight: RacingTheme.typography.bold as any,
    color: RacingTheme.colors.error,
    textAlign: 'center',
    marginBottom: RacingTheme.spacing.lg,
    letterSpacing: 1,
  },
  refreshButton: {
    marginTop: RacingTheme.spacing.lg,
  },
});

export default MultiLapComparisonScreen;
