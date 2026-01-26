import React, {createContext, useContext, ReactNode} from 'react';
import {useUser} from '@/hooks/useApiQueries';
import {Garage61User} from '@/types';

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

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const {data: user, isLoading, error, refetch} = useUser();

  const refreshUser = async () => {
    await refetch();
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    error: error?.message || null,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
