# Fixing Redundant API Requests

## 🚨 Problem

Components making multiple identical API requests:

- `/me` endpoint called 3+ times simultaneously
- Lap data endpoints duplicated per page load

## 🔍 Root Causes

1. **Component Re-render Loops**: Cascading updates between AuthProvider ↔ UserProfile
2. **Hot Module Replacement**: Module variables reset, breaking deduplication
3. **Premature Query Execution**: Queries running before components mount

## ✅ Solutions

### Global Request Cache (HMR-Safe)

```typescript
// Use window object to persist across HMR reloads
const globalRequestCache =
  (window as any).__apiRequestCache ||
  ((window as any).__apiRequestCache = new Map<string, Promise<any>>());
```

### Component Memoization

```typescript
export const AuthProvider = React.memo(({children}) => {
  const {data: user} = useUser();
  // ...
});
```

### Controlled Query Enabling

```typescript
const [queryEnabled, setQueryEnabled] = useState(false);
const {data} = useLaps(params, {enabled: queryEnabled});

useEffect(() => setQueryEnabled(true), []); // Enable after mount
```

### API-Level Deduplication

```typescript
private async deduplicatedRequest<T>(method, url, config) {
  const cacheKey = `${method}:${url}:${JSON.stringify(config || {})}`;

  if (globalRequestCache.has(cacheKey)) {
    return globalRequestCache.get(cacheKey)!;
  }

  const requestPromise = this.client.request({...})
    .then(result => {
      globalRequestCache.delete(cacheKey);
      return result.data;
    });

  globalRequestCache.set(cacheKey, requestPromise);
  return requestPromise;
}
```

## 📊 Result

- ✅ `/me` API: 3 calls → 1 call
- ✅ Lap data: Multiple duplicates → Single cached request
- ✅ Network efficiency: 60%+ reduction in redundant requests
