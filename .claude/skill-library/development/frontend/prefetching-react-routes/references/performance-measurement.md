# Performance Measurement

## Key Metrics

Track these metrics to validate prefetching effectiveness:

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Navigation timing | <100ms | Performance.now() before/after |
| Cache hit rate | >50% | Prefetched routes visited / Total predictions |
| Bandwidth overhead | <10% | Prefetched bytes / Total bandwidth |
| Core Web Vitals | Good | LCP, CLS during navigation |

## Navigation Timing Implementation

```typescript
// src/hooks/useNavigationTiming.ts
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useNavigationTiming() {
  const location = useLocation();
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [location.pathname]);

  useEffect(() => {
    // Wait for render to complete
    requestAnimationFrame(() => {
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - startTimeRef.current;

      // Log to console
      console.log(`[Navigation] ${location.pathname} took ${navigationTime.toFixed(2)}ms`);

      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'navigation_timing', {
          route: location.pathname,
          duration: Math.round(navigationTime),
          prefetched: /* track if route was prefetched */ true,
        });
      }

      // Track in monitoring service
      if (window.Sentry) {
        window.Sentry.addBreadcrumb({
          category: 'navigation',
          message: `Navigated to ${location.pathname}`,
          level: 'info',
          data: {
            duration: navigationTime,
          },
        });
      }
    });
  }, [location.pathname]);
}
```

## Cache Hit Rate Calculation

```typescript
// src/utils/prefetchAnalytics.ts
interface PrefetchStats {
  totalPrefetches: number;
  cacheHits: number;
  cacheMisses: number;
}

const prefetchStats: PrefetchStats = {
  totalPrefetches: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

export function trackPrefetch(route: string) {
  prefetchStats.totalPrefetches++;
  sessionStorage.setItem(`prefetch:${route}`, Date.now().toString());
}

export function trackNavigation(route: string) {
  const prefetchTime = sessionStorage.getItem(`prefetch:${route}`);

  if (prefetchTime) {
    prefetchStats.cacheHits++;
    sessionStorage.removeItem(`prefetch:${route}`);
  } else {
    prefetchStats.cacheMisses++;
  }
}

export function getCacheHitRate(): number {
  const { cacheHits, cacheMisses } = prefetchStats;
  const total = cacheHits + cacheMisses;
  return total > 0 ? (cacheHits / total) * 100 : 0;
}

// Usage in usePrefetchRoutes hook
export function usePrefetchRoutes() {
  const location = useLocation();

  useEffect(() => {
    const routesToPrefetch = ROUTE_PREFETCH_MAP[location.pathname] || [];

    routesToPrefetch.forEach(route => {
      trackPrefetch(route); // Track that we prefetched this route

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  }, [location.pathname]);

  // Track navigation
  useEffect(() => {
    trackNavigation(location.pathname);
  }, [location.pathname]);
}
```

## Bandwidth Overhead Measurement

```typescript
// src/utils/bandwidthTracking.ts
interface BandwidthStats {
  prefetchedBytes: number;
  totalBytes: number;
}

const bandwidthStats: BandwidthStats = {
  prefetchedBytes: 0,
  totalBytes: 0,
};

export function trackResourceSize(entry: PerformanceResourceTiming) {
  const isPrefetch = entry.initiatorType === 'link' &&
                     entry.name.includes('route-');

  if (isPrefetch) {
    bandwidthStats.prefetchedBytes += entry.transferSize;
  }

  bandwidthStats.totalBytes += entry.transferSize;
}

// Monitor all resources
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'resource') {
      trackResourceSize(entry as PerformanceResourceTiming);
    }
  }
});

observer.observe({ entryTypes: ['resource'] });

export function getBandwidthOverhead(): number {
  const { prefetchedBytes, totalBytes } = bandwidthStats;
  return totalBytes > 0 ? (prefetchedBytes / totalBytes) * 100 : 0;
}
```

## Core Web Vitals for Navigation

```typescript
// src/utils/navigationVitals.ts
import { onLCP, onCLS } from 'web-vitals';

export function trackNavigationVitals() {
  // Largest Contentful Paint
  onLCP((metric) => {
    console.log(`[LCP] ${metric.value}ms`);

    if (window.gtag) {
      window.gtag('event', 'navigation_lcp', {
        value: Math.round(metric.value),
      });
    }
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    console.log(`[CLS] ${metric.value}`);

    if (window.gtag) {
      window.gtag('event', 'navigation_cls', {
        value: metric.value,
      });
    }
  });
}
```

## Analytics Dashboard Setup

### Google Analytics 4 Custom Events

```javascript
// Track navigation timing
gtag('event', 'navigation_timing', {
  'event_category': 'Performance',
  'event_label': route,
  'value': navigationTime, // milliseconds
  'prefetched': isPrefetched,
});

// Track cache hit rate
gtag('event', 'prefetch_cache_hit', {
  'event_category': 'Performance',
  'event_label': route,
  'value': 1, // Hit = 1, Miss = 0
});
```

### Custom Dashboard Queries

**Average navigation timing:**

```
Event Name = navigation_timing
Metric = Average(value)
Dimension = prefetched (true/false)
```

**Cache hit rate:**

```
Event Name = prefetch_cache_hit
Metric = Count(value=1) / Count(*)
```

**Bandwidth overhead:**

```
Event Name = bandwidth_overhead
Metric = Average(value)
Target = <10%
```

## Before/After Comparison

Measure for 1 week before implementation, 1 week after:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg Navigation Time | 450ms | 75ms | 83% faster |
| p95 Navigation Time | 1200ms | 120ms | 90% faster |
| Cache Hit Rate | N/A | 62% | - |
| Bandwidth Overhead | N/A | 8% | Acceptable |

**Target improvements:**
- Navigation time: >70% reduction
- p95 navigation time: >80% reduction
- Cache hit rate: >50%
- Bandwidth overhead: <10%

## Monitoring Alerts

Set up alerts for regression:

```typescript
// Example: Alert if navigation timing exceeds threshold
export function checkNavigationThreshold(time: number, route: string) {
  const THRESHOLD = 200; // ms

  if (time > THRESHOLD) {
    console.warn(`[Performance] Slow navigation to ${route}: ${time}ms`);

    // Send to monitoring service
    if (window.Sentry) {
      window.Sentry.captureMessage(`Slow navigation: ${route}`, {
        level: 'warning',
        extra: { duration: time },
      });
    }
  }
}
```

## Related

- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)
