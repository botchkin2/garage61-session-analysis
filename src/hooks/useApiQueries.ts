import {useQuery} from '@tanstack/react-query';
import {apiClient} from '@/utils/api';

// Query keys for consistent cache management
export const queryKeys = {
  user: ['user'] as const,
  laps: (params?: Record<string, any>) => ['laps', params] as const,
  telemetry: (lapId: string) => ['telemetry', lapId] as const,
};

// User data - cache longer (user info doesn't change often)
export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Lap data with filters - 5 minutes default
export const useLaps = (params?: {
  limit?: number;
  offset?: number;
  age?: number;
  drivers?: string;
  cars?: number[];
  tracks?: number[];
  sessionTypes?: number[];
  event?: string;
  unclean?: boolean;
  minLapTime?: number;
  maxLapTime?: number;
  group?: 'driver' | 'driver-car' | 'none';
}) => {
  return useQuery({
    queryKey: queryKeys.laps(params),
    queryFn: () => apiClient.getLaps(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Telemetry data - cache for 7 days (expensive to fetch, rarely changes)
export const useTelemetry = (lapId: string) => {
  return useQuery({
    queryKey: queryKeys.telemetry(lapId),
    queryFn: async () => {
      // Fetch CSV directly from the API endpoint
      const csvText = await apiClient.getCsv(`/laps/${lapId}/csv`);
      return csvText;
    },
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days (keep in cache for 7 days)
    enabled: !!lapId, // Only run if lapId exists
  });
};
