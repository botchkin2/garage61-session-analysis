import React, {createContext, useContext, ReactNode} from 'react';
import {useUser} from '@src/hooks/useApiQueries';
import {Garage61User} from '@src/types';

interface AuthContextType {
  user: Garage61User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
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

    // Handle the "API token not configured" case gracefully
    const isTokenNotConfigured = error?.message === 'API token not configured';
    const actualError = isTokenNotConfigured ? null : error?.message || null;

    const value: AuthContextType = {
      user: user || null,
      isLoading: isLoading && !isTokenNotConfigured,
      isAuthenticated: !!user,
      error: actualError,
      refreshUser,
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
