# Component Optimization Guide

## 🎯 React.memo for Expensive Components

```typescript
const UserProfile = React.memo(() => {
  const {user, isLoading} = useAuth();
  // Expensive renders - memoize to prevent cascades
});

const AuthProvider = React.memo(({children}) => {
  const {data: user} = useUser();
  // Context providers - prevent unnecessary re-renders
});
```

## 🔄 useMemo for Computed Values

```typescript
const groupedEvents = useMemo(() => {
  if (!lapsResponse?.items) return [];
  return groupLapsByEvent(lapsResponse.items);
}, [lapsResponse, groupLapsByEvent]);
```

## 📊 useCallback for Event Handlers

```typescript
const handleSessionAnalysis = useCallback(
  (data: SessionData) => {
    navigation.navigate('SessionAnalysis', {sessionData: data});
  },
  [navigation],
);
```

## ⚡ State Batching

```typescript
// ✅ Batch related state updates
useEffect(() => {
  if (lapsResponse?.items) {
    setLaps(lapsResponse.items);
    setSelectedLapIds(
      new Set(lapsResponse.items.filter(lap => lap.clean).map(lap => lap.id)),
    );
  }
}, [lapsResponse]);
```

## 🏃‍♂️ Performance Checklist

- [ ] Expensive components wrapped with `React.memo()`
- [ ] Event handlers using `useCallback()`
- [ ] Computed values using `useMemo()`
- [ ] Related state updates batched together
- [ ] Props destructured to avoid object recreation

## 🚨 Anti-patterns to Avoid

- ❌ Inline object literals in props: `<Component style={{margin: 10}} />`
- ❌ Creating functions in render: `<Button onPress={() => doSomething()} />`
- ❌ Unnecessary context re-renders
- ❌ Missing dependency arrays in hooks
