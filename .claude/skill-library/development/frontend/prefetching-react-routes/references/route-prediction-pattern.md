# Route Prediction Pattern (Smart Prediction)

## Overview

Route prediction prefetches routes based on the current route and likely next navigation, using analytics to build a prediction map.

## When to Use

- High-traffic applications (>1000 DAU)
- Clear navigation patterns from analytics
- Mobile-first applications (works without hover)
- When intent-based prefetch doesn't meet performance targets

## Building the Prediction Map

### Step 1: Analyze Navigation Flows

Use analytics to identify common navigation patterns:

```sql
-- Example: Google Analytics BigQuery query
SELECT
  page_path AS current_route,
  LEAD(page_path) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) AS next_route,
  COUNT(*) AS navigation_count
FROM analytics_events
WHERE event_name = 'page_view'
GROUP BY current_route, next_route
ORDER BY current_route, navigation_count DESC
```

### Step 2: Create Prediction Map

Take top 2-3 next routes for each current route:

```typescript
// src/utils/routePrefetchMap.ts
export const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  // From /assets, users go to:
  // 1. /vulnerabilities (45%)
  // 2. /jobs (30%)
  // 3. /insights (15%)
  '/assets': ['/vulnerabilities', '/jobs'], // Only top 2

  // From /vulnerabilities, users go to:
  '/vulnerabilities': ['/assets', '/insights'],

  // From /insights, users go to:
  '/insights': ['/vulnerabilities', '/attacks'],

  // From /jobs, users go to:
  '/jobs': ['/assets', '/agents'],

  // From /attacks, users go to:
  '/attacks': ['/vulnerabilities', '/insights'],
};
```

**Critical:** Limit to 2-3 routes max per current route. More routes = more wasted bandwidth.

## Implementation

### usePrefetchRoutes Hook

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
        // Create prefetch hint
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);

        // Track that we prefetched this route
        console.log(`[Prefetch] Predicted navigation from ${location.pathname} to ${route}`);
      });
    }, 1000); // Wait 1 second after route load

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
```

### Add to Root Component

```typescript
// src/App.tsx
import { usePrefetchRoutes } from './hooks/usePrefetchRoutes';

function App() {
  usePrefetchRoutes();

  return <RouterProvider router={router} />;
}
```

## Why 1000ms Delay?

```typescript
setTimeout(() => {
  // Prefetch logic
}, 1000);
```

**Rationale:**

1. **Avoid blocking initial render:** Route component needs to render first
2. **Let critical resources load:** Page data, images, fonts take priority
3. **User likely hasn't navigated yet:** 1000ms is fast enough for next click
4. **Browser idle time:** Prefetch uses idle browser time

**Measurement:** If users navigate <1s after page load, reduce to 500ms. If users stay >3s, keep at 1000ms.

## Network Condition Integration

Already built into the hook above:

```typescript
// Respect user preferences
if (navigator.connection?.saveData) return;

// Avoid prefetch on 2g connections
if (navigator.connection?.effectiveType === '2g') return;
```

**Optional:** Also exclude 3g for very bandwidth-sensitive apps:

```typescript
if (navigator.connection?.effectiveType === '2g' || navigator.connection?.effectiveType === '3g') {
  return;
}
```

## Measuring Effectiveness

### Cache Hit Rate

Track how often predicted routes are actually visited:

```typescript
const prefetchStats = {
  predictions: 0,
  hits: 0,
};

// In usePrefetchRoutes hook
routesToPrefetch.forEach(route => {
  prefetchStats.predictions++;
  sessionStorage.setItem(`prefetch:${route}`, Date.now().toString());
});

// On navigation
useEffect(() => {
  const wasPrefetched = sessionStorage.getItem(`prefetch:${location.pathname}`);

  if (wasPrefetched) {
    prefetchStats.hits++;
    sessionStorage.removeItem(`prefetch:${location.pathname}`);
  }

  const hitRate = (prefetchStats.hits / prefetchStats.predictions) * 100;
  console.log(`[Prefetch] Cache hit rate: ${hitRate.toFixed(1)}%`);
}, [location.pathname]);
```

**Target:** >50% cache hit rate. If lower, your prediction map is too aggressive or inaccurate.

### Bandwidth Overhead

Calculate extra bandwidth from unused prefetches:

```typescript
// Use Resource Timing API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const resource = entry as PerformanceResourceTiming;

    if (resource.initiatorType === 'link' && resource.name.includes('route-')) {
      console.log(`[Prefetch] Downloaded ${resource.name}: ${resource.transferSize} bytes`);
    }
  }
});

observer.observe({ entryTypes: ['resource'] });
```

**Target:** <10% of total bandwidth should be unused prefetches.

## Chariot-Specific Example

Based on Chariot's actual navigation patterns:

```typescript
export const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  // Security workflow: Assets → Vulnerabilities → Insights
  '/assets': ['/vulnerabilities', '/jobs'],
  '/vulnerabilities': ['/assets', '/insights'],
  '/insights': ['/vulnerabilities', '/attacks'],

  // Job management: Jobs → Assets → Agents
  '/jobs': ['/assets', '/agents'],

  // Attack analysis: Attacks → Vulnerabilities → Insights
  '/attacks': ['/vulnerabilities', '/insights'],

  // Agent management: Agents → Jobs
  '/agents': ['/jobs'],

  // Settings always accessible from any auth route
  '/profile': ['/settings'],
  '/account': ['/settings'],
};
```

## Maintenance

Update prediction map quarterly based on analytics:

1. Export navigation flows from analytics
2. Calculate top next routes per current route
3. Update `ROUTE_PREFETCH_MAP`
4. Measure cache hit rate for 1 week
5. Adjust if hit rate <50%

## Trade-offs

| Aspect | Benefit | Cost |
|--------|---------|------|
| **Speed** | Instant navigation for predicted routes | Wasted bandwidth for wrong predictions |
| **Mobile** | Works on tap (no hover needed) | Uses mobile data even if user doesn't navigate |
| **Predictability** | Data-driven, measurable | Requires analytics and maintenance |
| **Complexity** | Medium (hook + map) | More code than intent-based |

## Related Patterns

- Link Prefetch (browser hint)
- Eager Loading (custom hook triggers import())
