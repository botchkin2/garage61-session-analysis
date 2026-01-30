# React Query Best Practices

## 🔑 Query Key Stability

```typescript
export const queryKeys = {
  user: ['user'] as const,
  laps: (params?: Record<string, any>) => {
    if (!params) return ['laps'];
    // Sort keys for consistency
    const sortedKeys = Object.keys(params).sort();
    const keyString = sortedKeys.map(key => `${key}:${params[key]}`).join('|');
    return ['laps', keyString];
  },
};
```

## ⚙️ Aggressive Caching

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 60 * 60 * 1000, // 1 hour cache
      refetchOnMount: true, // Allow if no cache
      refetchOnWindowFocus: false, // Prevent background refetches
      refetchOnReconnect: false,
    },
  },
});
```

## 📦 Memoized Parameters

```typescript
const lapsQueryParams = useMemo(
  () => ({
    limit: 200,
    age: selectedTimeRange,
    drivers: 'me',
    group: 'none',
  }),
  [selectedTimeRange],
);
```

## 🎛️ Controlled Query Execution

```typescript
const useLaps = (params, options) => {
  return useQuery({
    queryKey: queryKeys.laps(params),
    queryFn: () => apiClient.getLaps(params),
    enabled: options?.enabled ?? !!params, // Control when to run
  });
};
```

## 🚨 Common Pitfalls

- ❌ Creating new objects in query keys
- ❌ Missing memoization of query parameters
- ❌ Not handling query enabling properly
- ❌ Ignoring staleTime/gcTime settings
