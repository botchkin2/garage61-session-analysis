import {useQueryClient} from '@tanstack/react-query';
import {queryKeys} from './useApiQueries';
import {apiClient} from '@/utils/api';

export const useCacheManagement = () => {
  const queryClient = useQueryClient();

  return {
    // Refresh user data
    refreshUser: () =>
      queryClient.invalidateQueries({queryKey: queryKeys.user}),

    // Refresh all lap data
    refreshLaps: () => queryClient.invalidateQueries({queryKey: ['laps']}),

    // Refresh specific lap query
    refreshLapsWithFilters: (params?: Record<string, any>) =>
      queryClient.invalidateQueries({queryKey: queryKeys.laps(params)}),

    // Clear all cache
    clearAllCache: () => queryClient.clear(),

    // Prefetch data (useful for navigation)
    prefetchUser: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.user,
        queryFn: () => apiClient.getCurrentUser(),
        staleTime: 30 * 60 * 1000,
      }),

    // Update cached data optimistically
    updateCachedLaps: (updater: (oldData: any) => any) =>
      queryClient.setQueryData(queryKeys.laps(), updater),
  };
};
