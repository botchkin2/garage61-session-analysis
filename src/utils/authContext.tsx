import {useUser} from '@src/hooks/useApiQueries';
import {ApiError, Garage61User} from '@src/types';
import React, {createContext, ReactNode, useContext} from 'react';
import {Linking, Platform} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {fetchAuthLoginUrl, fetchAuthStatus, logoutAuth} from './auth';
import {clearStoredTokens, getStoredAccessToken} from './oauthStorage';

interface AuthContextType {
  user: Garage61User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when /me returned 401 (user not signed in or session invalid). Use to redirect to sign-in. */
  isUnauthorized: boolean;
  /** True when the user has an OAuth session (cookie on web, tokens on mobile). When false, show "Sign in with Garage 61" even if API works via fallback token. */
  hasOAuthSession: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = React.memo(
  ({children}) => {
    const queryClient = useQueryClient();
    const {data: user, isLoading, error, refetch} = useUser();

    // Web: do we have an OAuth session cookie? Mobile: do we have stored tokens?
    const {data: webHasSession} = useQuery({
      queryKey: ['authStatus'],
      queryFn: fetchAuthStatus,
      enabled: Platform.OS === 'web',
      staleTime: 60 * 1000,
    });
    const {data: mobileHasTokens} = useQuery({
      queryKey: ['authStorage'],
      queryFn: () => getStoredAccessToken().then(t => !!t),
      enabled: Platform.OS !== 'web',
      staleTime: 60 * 1000,
    });
    const hasOAuthSession =
      Platform.OS === 'web'
        ? webHasSession?.hasSession ?? false
        : mobileHasTokens ?? false;

    const refreshUser = async () => {
      await refetch();
    };

    const signIn = async () => {
      const {url} = await fetchAuthLoginUrl();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    };

    const signOut = async () => {
      await clearStoredTokens();
      await logoutAuth();
      await queryClient.invalidateQueries({queryKey: ['authStatus']});
      await queryClient.invalidateQueries({queryKey: ['authStorage']});
      await refetch();
    };

    // Handle the "API token not configured" case gracefully
    const isTokenNotConfigured = error?.message === 'API token not configured';
    const actualError = isTokenNotConfigured ? null : error?.message || null;
    const isUnauthorized = (error as ApiError | undefined)?.status === 401;

    const value: AuthContextType = {
      user: user || null,
      isLoading: isLoading && !isTokenNotConfigured,
      isAuthenticated: !!user,
      isUnauthorized,
      hasOAuthSession,
      error: actualError,
      refreshUser,
      signIn,
      signOut,
    };

    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  },
);

AuthProvider.displayName = 'AuthProvider';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
