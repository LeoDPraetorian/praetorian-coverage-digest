# Network Mode

## networkMode Options

| Mode | Behavior |
|------|----------|
| `'online'` (default) | Pause fetching when offline |
| `'always'` | Always attempt fetch (for local APIs, service workers) |
| `'offlineFirst'` | Use cache first, sync when online |

## Global Configuration

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})
```

## Per-Query Configuration

```tsx
// Online only - wait for network
const { data } = useQuery({
  queryKey: ['realtime-data'],
  queryFn: fetchRealtimeData,
  networkMode: 'online',
})

// Always - for ServiceWorker-cached endpoints
const { data } = useQuery({
  queryKey: ['cached-data'],
  queryFn: fetchFromServiceWorker,
  networkMode: 'always',
})

// Offline first - show cached, sync later
const { data, isFetching } = useQuery({
  queryKey: ['user-settings'],
  queryFn: fetchSettings,
  networkMode: 'offlineFirst',
  staleTime: Infinity,
})
```

## Online Manager

```tsx
import { onlineManager } from '@tanstack/react-query'

// Check status
const isOnline = onlineManager.isOnline()

// Manual override (useful for testing)
onlineManager.setOnline(true)
onlineManager.setOnline(false)
```

## React Native Integration

```tsx
import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

## When to Use Each Mode

| Scenario | Mode |
|----------|------|
| Real-time data, security-critical | `'online'` |
| ServiceWorker caching | `'always'` |
| Offline-first apps | `'offlineFirst'` |
| Poor connectivity expected | `'offlineFirst'` |
| Static/config data | `'offlineFirst'` with high staleTime |

## fetchStatus States

When offline with `networkMode: 'online'`:
- `fetchStatus: 'paused'` - Query waiting for network
- `isPending: true` - If no cached data
- `data: cachedData` - If cached data exists
