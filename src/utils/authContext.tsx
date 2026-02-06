import {useUser} from '@src/hooks/useApiQueries';
import {Garage61User} from '@src/types';
import React, {createContext, ReactNode, useContext} from 'react';
import {Linking, Platform} from 'react-native';
import {fetchAuthLoginUrl, logoutAuth} from './auth';

interface AuthContextType {
  user: Garage61User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
    const {data: user, isLoading, error, refetch} = useUser();

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
      await refetch();
    };

    // Handle the "API token not configured" case gracefully
    const isTokenNotConfigured = error?.message === 'API token not configured';
    const actualError = isTokenNotConfigured ? null : error?.message || null;

    const value: AuthContextType = {
      user: user || null,
      isLoading: isLoading && !isTokenNotConfigured,
      isAuthenticated: !!user,
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
