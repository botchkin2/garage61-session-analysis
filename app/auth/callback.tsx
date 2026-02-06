import {RacingTheme} from '@src/theme';
import {
  exchangeCodeForSession,
  getAuthCallbackRedirectUri,
} from '@src/utils/auth';
import {useLocalSearchParams, useRouter} from 'expo-router';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * OAuth callback: Garage 61 redirects here with ?code=...&state=...
 * We exchange the code for a session (web) or show an error.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
  }>();
  const router = useRouter();
  const [status, setStatus] = useState<'exchanging' | 'done' | 'error'>(
    'exchanging',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const {code, state, error} = params;
    if (error) {
      setStatus('error');
      setMessage(
        error === 'access_denied' ? 'Sign in was cancelled.' : String(error),
      );
      return;
    }
    if (!code || !state) {
      setStatus('error');
      setMessage('Missing code or state from Garage 61.');
      return;
    }

    const redirectUri = getAuthCallbackRedirectUri();
    exchangeCodeForSession({code, redirect_uri: redirectUri, state})
      .then(({redirect}) => {
        setStatus('done');
        const target = redirect || '/';
        if (Platform.OS === 'web') {
          window.location.href = target;
        } else {
          router.replace(target as any);
        }
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message || 'Failed to complete sign in.');
      });
  }, [params.code, params.state, params.error, router]);

  return (
    <View style={styles.container}>
      {status === 'exchanging' && (
        <>
          <ActivityIndicator size='large' color={RacingTheme.colors.primary} />
          <Text style={styles.text}>Completing sign in...</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <Text style={styles.errorTitle}>Sign in failed</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <Text style={styles.link} onPress={() => router.replace('/')}>
            Return home
          </Text>
        </>
      )}
      {status === 'done' && <Text style={styles.text}>Redirecting...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RacingTheme.colors.background,
    padding: 24,
  },
  text: {
    marginTop: 16,
    color: RacingTheme.colors.text,
    fontSize: 16,
  },
  errorTitle: {
    color: RacingTheme.colors.error,
    fontSize: 18,
    fontWeight: '600',
  },
  errorMessage: {
    color: RacingTheme.colors.text,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  link: {
    marginTop: 16,
    color: RacingTheme.colors.primary,
    fontSize: 14,
  },
});
