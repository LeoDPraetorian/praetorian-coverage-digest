# Implementation Checklist

## Phase 1: Add Intent-Based Prefetch (15 minutes)

### Step 1.1: Update Navigation Links

Find all `<Link>` components and add `prefetch='intent'`:

```bash
# Find all Link components
grep -r "import.*Link.*from.*react-router" src/
```

**Before:**
```tsx
<Link to="/dashboard">Dashboard</Link>
```

**After:**
```tsx
<Link to="/dashboard" prefetch="intent">Dashboard</Link>
```

### Step 1.2: Identify Rarely Used Routes

Add `prefetch='none'` to routes accessed <5% of the time:

```tsx
<Link to="/admin/logs" prefetch="none">Admin Logs</Link>
<Link to="/archive" prefetch="none">Archive</Link>
```

### Step 1.3: Verify in DevTools

1. Open Chrome DevTools → Network tab
2. Clear network log (trash icon)
3. Hover over navigation link
4. Confirm route chunk downloads with "Prefetch" initiator
5. Click link → should be instant (loaded from cache)

**Expected behavior:**
- Hover → chunk downloads (low priority)
- Click → no additional network request (cache hit)

---

## Phase 2: Add Route-Based Prediction (Optional, 1-2 hours)

**Only proceed if:**
- Intent-based prefetch doesn't meet performance targets
- You have analytics showing clear navigation patterns
- App has >1000 DAU

### Step 2.1: Analyze Navigation Patterns

Use analytics to identify top 3 next routes from each current route:

```typescript
// Example: From Google Analytics or custom tracking
// Current route: /assets
// Top 3 next routes: /vulnerabilities (45%), /jobs (30%), /insights (15%)
```

Build prediction map:

```typescript
// src/utils/routePrefetchMap.ts
export const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  '/assets': ['/vulnerabilities', '/jobs'], // Top 2 only
  '/vulnerabilities': ['/assets', '/insights'],
  '/insights': ['/vulnerabilities', '/attacks'],
  '/jobs': ['/assets', '/agents'],
};
```

### Step 2.2: Create Prefetch Hook

```typescript
// src/hooks/usePrefetchRoutes.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_PREFETCH_MAP } from '../utils/routePrefetchMap';

export function usePrefetchRoutes() {
  const location = useLocation();

  useEffect(() => {
    // Network condition checks (MANDATORY)
    if (navigator.connection?.saveData) return;
    if (navigator.connection?.effectiveType === '2g') return;

    // Delay to avoid blocking initial render
    const timer = setTimeout(() => {
      const routesToPrefetch = ROUTE_PREFETCH_MAP[location.pathname] || [];

      routesToPrefetch.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
```

### Step 2.3: Add to Root Component

```typescript
// src/App.tsx
import { usePrefetchRoutes } from './hooks/usePrefetchRoutes';

function App() {
  usePrefetchRoutes(); // Add prediction

  return <RouterProvider router={router} />;
}
```

### Step 2.4: Verify Prediction Works

1. Navigate to route with predictions (e.g., `/assets`)
2. Wait 1 second
3. Check Network tab for prefetch requests
4. Navigate to predicted route → should be instant

---

## Phase 3: Performance Measurement (30 minutes)

### Step 3.1: Add Navigation Timing

```typescript
// src/hooks/useNavigationTiming.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useNavigationTiming() {
  const location = useLocation();

  useEffect(() => {
    const navigationStart = performance.now();

    requestAnimationFrame(() => {
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - navigationStart;

      console.log(`[Navigation] ${location.pathname} took ${navigationTime}ms`);

      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'navigation_timing', {
          route: location.pathname,
          duration: navigationTime,
        });
      }
    });
  }, [location.pathname]);
}
```

### Step 3.2: Add to Root Component

```typescript
function App() {
  usePrefetchRoutes();
  useNavigationTiming(); // Add timing

  return <RouterProvider router={router} />;
}
```

### Step 3.3: Define Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Navigation timing | <100ms | useNavigationTiming hook |
| Cache hit rate | >50% | Predicted routes visited / Total predictions |
| Bandwidth overhead | <10% | Prefetched bytes / Total bandwidth |

### Step 3.4: Monitor Over Time

Track metrics for 1-2 weeks:

```typescript
// Calculate cache hit rate
const predictedRouteVisits = 450; // Routes that were prefetched + visited
const totalPredictions = 850; // All predictions made
const hitRate = (predictedRouteVisits / totalPredictions) * 100;
// Target: >50%
```

If hit rate <50%, revise prediction map to only include highest-probability routes.

---

## Verification Checklist

Before marking complete:

- [ ] All navigation links have `prefetch='intent'` or explicit mode
- [ ] DevTools shows route chunks prefetching on hover
- [ ] Navigation timing <100ms for prefetched routes
- [ ] Network condition checks prevent prefetch on 2g
- [ ] Network condition checks respect `saveData`
- [ ] Prediction map (if used) has ≤3 routes per current route
- [ ] Cache hit rate (if using prediction) >50%
- [ ] No console errors related to prefetching
- [ ] Mobile navigation works (no hover benefit, but no breakage)

---

## Common Issues

### Issue: Prefetch not triggering

**Symptoms:** No network requests on hover, DevTools shows nothing

**Solutions:**
1. Verify React Router version >=7.0: `npm list react-router-dom`
2. Check for event handler conflicts: Remove custom hover handlers
3. Ensure route uses lazy loading: `lazy: () => import('./Route')`

### Issue: Prefetch working but navigation still slow

**Symptoms:** Chunks prefetch, but click still shows delay

**Solutions:**
1. Check cache: Prefetched chunks should show "(from cache)" in DevTools
2. Verify chunk size: Large chunks (>500KB) may be slow even when cached
3. Check React component render time: Use React DevTools Profiler

### Issue: Excessive bandwidth usage

**Symptoms:** User complaints, high data transfer in analytics

**Solutions:**
1. Reduce prediction map: Only prefetch top 1-2 routes per current route
2. Add more aggressive network checks: Exclude 3g connections
3. Use `prefetch='intent'` only, remove prediction entirely

### Issue: Prediction not working on mobile

**Symptoms:** Desktop fast, mobile still slow

**Expected behavior:** `prefetch='intent'` doesn't benefit mobile (no hover)

**Solutions:**
1. This is expected - hover doesn't exist on touch devices
2. Route prediction IS mobile-friendly (works on tap)
3. Consider `prefetch='viewport'` for visible links
