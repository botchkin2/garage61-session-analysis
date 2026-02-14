/**
 * Listens for OAuth callback deep link (mobile): botracing61://auth/callback?code=...&state=...
 * Exchanges code for tokens and stores them, then invalidates user query.
 */
import {queryKeys} from '@src/hooks/useApiQueries';
import {
  exchangeCodeForTokens,
  getAuthCallbackRedirectUri,
} from '@src/utils/auth';
import {setStoredTokens} from '@src/utils/oauthStorage';
import {useQueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {Linking, Platform} from 'react-native';

function parseOAuthCallbackUrl(
  url: string,
): {code: string; state: string} | null {
  if (!url.includes('auth/callback')) return null;
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (code && state) return {code, state};
  } catch {
    return null;
  }
  return null;
}

export function OAuthDeepLinkHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (event: {url: string}) => {
      const params = parseOAuthCallbackUrl(event.url);
      if (!params) return;
      const redirectUri = getAuthCallbackRedirectUri();
      try {
        const tokens = await exchangeCodeForTokens({
          code: params.code,
          redirect_uri: redirectUri,
          state: params.state,
        });
        await setStoredTokens(tokens);
        await queryClient.invalidateQueries({queryKey: queryKeys.user});
      } catch (e) {
        console.warn('OAuth deep link exchange failed:', e);
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then(url => {
      if (url) handleUrl({url});
    });

    return () => sub.remove();
  }, [queryClient]);

  return null;
}
