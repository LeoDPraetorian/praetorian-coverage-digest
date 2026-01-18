# Network Conditions API

## Navigator.connection API

The Network Information API provides network connection details for adaptive prefetching.

## API Reference

### connection.effectiveType

**Type:** `'slow-2g' | '2g' | '3g' | '4g'`

Estimated effective connection type based on recently observed RTT and downlink values.

```typescript
if (navigator.connection?.effectiveType === '2g') {
  // Skip prefetching on 2G
  return;
}
```

**Values:**

| Type | RTT (ms) | Downlink (Mbps) | Use Case |
|------|----------|-----------------|----------|
| `'slow-2g'` | >2000 | <0.05 | Never prefetch |
| `'2g'` | 1400-2000 | 0.05-0.07 | Never prefetch |
| `'3g'` | 270-1400 | 0.4-0.7 | Consider skipping |
| `'4g'` | 0-270 | >0.7 | Safe to prefetch |

### connection.saveData

**Type:** `boolean`

User has enabled data saver mode in their browser.

```typescript
if (navigator.connection?.saveData) {
  // User explicitly wants to save data
  return;
}
```

**Browser Settings:**

- Chrome: Settings → Lite mode / Data Saver
- Firefox: about:config → network.http.throttle.enable
- Edge: Settings → Data savings

**When true:** User is on limited data plan or wants to minimize usage.

### connection.downlink

**Type:** `number` (Mbps)

Effective bandwidth estimate.

```typescript
if (navigator.connection?.downlink < 1.5) {
  // Slow connection (<1.5 Mbps)
  return;
}
```

### connection.rtt

**Type:** `number` (milliseconds)

Estimated round-trip time.

```typescript
if (navigator.connection?.rtt > 500) {
  // High latency (>500ms)
  return;
}
```

## Complete Prefetch Guard

```typescript
function shouldPrefetch(): boolean {
  // Browser doesn't support Network Information API
  if (!navigator.connection) {
    // Default to allowing prefetch on unknown connections
    return true;
  }

  const { effectiveType, saveData, downlink, rtt } = navigator.connection;

  // User explicitly enabled data saver
  if (saveData) return false;

  // Very slow connections
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;

  // Optional: Skip 3G connections
  if (effectiveType === '3g' && downlink < 1) return false;

  // Optional: High latency check
  if (rtt && rtt > 1000) return false;

  return true;
}
```

## Browser Support

| Browser | effectiveType | saveData | downlink | rtt |
|---------|---------------|----------|----------|-----|
| Chrome 61+ | ✅ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ❌ | ❌ |
| Safari | ❌ | ❌ | ❌ | ❌ |

**Fallback:** If API not supported, allow prefetching (optimistic approach).

## Testing

### Simulate Network Conditions (Chrome DevTools)

1. Open DevTools → Network tab
2. Click "No throttling" dropdown
3. Select "Slow 3G" or "Fast 3G"
4. Check `navigator.connection.effectiveType` in console

### Simulate Data Saver

**Chrome:**
1. Settings → Performance → Lite mode
2. Enable "Lite mode" or "Data saver"
3. Check `navigator.connection.saveData` → should be `true`

**Firefox:**
1. about:config
2. Search for `network.http.throttle.enable`
3. Set to `true`

## Event Listener

Monitor network changes:

```typescript
function usePrefetchOnGoodConnection() {
  const [shouldPrefetch, setShouldPrefetch] = useState(
    checkNetworkConditions()
  );

  useEffect(() => {
    if (!navigator.connection) return;

    const handleChange = () => {
      setShouldPrefetch(checkNetworkConditions());
    };

    navigator.connection.addEventListener('change', handleChange);

    return () => {
      navigator.connection.removeEventListener('change', handleChange);
    };
  }, []);

  return shouldPrefetch;
}
```

**Use case:** User switches from WiFi to cellular → stop prefetching.

## Related

- [MDN: Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Can I Use: Network Information API](https://caniuse.com/netinfo)
