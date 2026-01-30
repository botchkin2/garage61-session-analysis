import {useQuery} from '@tanstack/react-query';
import {apiClient} from '@/utils/api';

// Query keys for consistent cache management
export const queryKeys = {
  user: ['user'] as const,
  laps: (params?: Record<string, any>) => {
    if (!params) return ['laps'];
    // Create a stable query key by sorting object keys and creating a string
    const sortedKeys = Object.keys(params).sort();
    const keyString = sortedKeys.map(key => `${key}:${params[key]}`).join('|');
    return ['laps', keyString];
  },
  telemetry: (lapId: string) => ['telemetry', lapId] as const,
};

// User data - cache longer (user info doesn't change often)
export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 60 * 60 * 1000, // 1 hour - increased
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - increased
    // Allow refetch on mount if no cached data, but prevent other refetches
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// Lap data with filters - aggressive caching to prevent redundant requests
export const useLaps = (
  params?: {
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
  },
  options?: {enabled?: boolean},
) => {
  return useQuery({
    queryKey: queryKeys.laps(params),
    queryFn: () => apiClient.getLaps(params),
    staleTime: 15 * 60 * 1000, // 15 minutes - increased
    gcTime: 60 * 60 * 1000, // 1 hour - increased
    // Allow refetch on mount if no cached data, but prevent other refetches
    refetchOnMount: false, // Changed to false to prevent automatic refetches
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: options?.enabled ?? !!params, // Only run if explicitly enabled
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
