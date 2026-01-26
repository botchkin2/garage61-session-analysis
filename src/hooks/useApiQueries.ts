import {useQuery} from '@tanstack/react-query';
import {apiClient} from '@/utils/api';
import {TelemetryInfo} from '@/types';

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

// Telemetry data - cache longer (expensive to fetch)
export const useTelemetry = (lapId: string) => {
  return useQuery({
    queryKey: queryKeys.telemetry(lapId),
    queryFn: async () => {
      // First get telemetry info
      const telemetryInfo: TelemetryInfo = await apiClient.get(
        `/laps/${lapId}/telemetry`,
      );
      // If telemetry URL exists, fetch the actual data
      if (telemetryInfo.url) {
        return await apiClient.get(telemetryInfo.url);
      }
      return null;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!lapId, // Only run if lapId exists
  });
};
