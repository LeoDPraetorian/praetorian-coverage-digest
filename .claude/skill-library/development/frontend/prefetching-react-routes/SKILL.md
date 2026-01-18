---
name: prefetching-react-routes
description: Optimizes React Router navigation performance through route prefetching strategies. Use when eliminating navigation delays with lazy-loaded routes or implementing route preloading patterns.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Prefetching React Routes

**Eliminates navigation delays in React Router 7 applications with lazy-loaded routes through systematic prefetching strategies.**

## When to Use

Use this skill when:

- React Router navigation feels sluggish with lazy-loaded routes
- Implementing route preloading for improved UX
- Optimizing navigation performance in high-traffic applications
- Balancing instant navigation against bandwidth costs
- Building navigation patterns with route prediction
- Respecting user network conditions (slow connections, data saver mode)

## Core Principle

**Start with `prefetch='intent'`, add prediction for high-traffic applications.**

React Router 7's built-in prefetching eliminates most custom implementation needs. Begin with hover/focus prefetching on navigation links, then layer intelligent prediction for common navigation paths.

## Quick Decision Tree

```
┌─ Do routes use React.lazy()? ──No──> No prefetch needed
│
Yes
│
├─ Are users complaining about delays? ──No──> Monitor, no action yet
│
Yes
│
├─ General navigation optimization? ──Yes──> Use prefetch='intent' on Links
│
├─ High-traffic app with known patterns? ──Yes──> Add route-based prediction
│
└─ Mobile/slow connections? ──Yes──> Check navigator.connection before prefetch
```

## React Router 7 Built-in Prefetching

React Router 7 provides prefetch support via the `Link` component's `prefetch` prop. This uses browser-native `<link rel='prefetch'>` for background downloads.

**Prefetch Modes:**

| Mode         | Behavior                            | When to Use                               |
| ------------ | ----------------------------------- | ----------------------------------------- |
| `'none'`     | No prefetching                      | Low bandwidth priority, rarely navigated  |
| `'intent'`   | Prefetch on hover/focus (RECOMMEND) | Most navigation links (best balance)      |
| `'render'`   | Prefetch when link renders          | High-probability next routes              |
| `'viewport'` | Prefetch when link enters viewport  | Long pages with many navigation links     |

**Basic implementation:**

```tsx
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      {/* Prefetch on hover/focus (recommended default) */}
      <Link to="/dashboard" prefetch="intent">Dashboard</Link>

      {/* Prefetch immediately when link renders */}
      <Link to="/settings" prefetch="render">Settings</Link>

      {/* No prefetch for rarely used routes */}
      <Link to="/archive" prefetch="none">Archive</Link>
    </nav>
  );
}
```

**Under the hood:** React Router inserts `<link rel='prefetch' href='/assets/route-chunk.js'>` which downloads at lowest browser priority without blocking.

## Three Prefetching Strategies

### 1. Link Prefetch (Browser Hint) - Built-in

**Uses `<link rel='prefetch'>` for lowest-priority background downloads.**

**Pros:**
- Zero custom code (React Router built-in)
- Browser-managed priority
- Works across all lazy-loaded routes

**Cons:**
- Depends on user hovering (200ms+ hover needed for impact)
- No download on mobile tap navigation
- Browser may ignore hints under resource pressure

**Best for:** General navigation optimization with minimal effort.

See [references/link-prefetch-pattern.md](references/link-prefetch-pattern.md) for browser hint details and fallback behavior.

### 2. Eager Loading on Hover/Focus - Custom Hook

**Triggers `import()` directly when user hovers over navigation links.**

**Pros:**
- Faster than browser hints (direct import)
- Works on hover events before click
- Full control over prefetch timing

**Cons:**
- Requires custom component wrapper
- Bypasses browser priority system
- More implementation complexity

**Best for:** Critical navigation paths where instant response matters.

See [references/eager-loading-pattern.md](references/eager-loading-pattern.md) for implementation with `usePrefetchRoutes` hook.

### 3. Route-Based Prefetch (Smart Prediction) - Predictive

**Prefetches based on current route and likely next navigation.**

**Pros:**
- Instant navigation for predicted routes
- Works without hover (mobile-friendly)
- Optimizes common user flows

**Cons:**
- Moderate bandwidth cost for wrong predictions
- Requires analytics to identify patterns
- Complexity in prediction map maintenance

**Best for:** High-traffic applications with known user flows.

See [references/route-prediction-pattern.md](references/route-prediction-pattern.md) for prediction map design.

## Implementation Workflow

### Step 1: Add Intent-Based Prefetch to Navigation

Update all navigation `Link` components with `prefetch='intent'`:

```tsx
// Before
<Link to="/vulnerabilities">Vulnerabilities</Link>

// After
<Link to="/vulnerabilities" prefetch="intent">Vulnerabilities</Link>
```

**Verification:**
1. Open DevTools Network tab
2. Hover over navigation link
3. Observe route chunk download with "Prefetch" initiator

### Step 2: Identify High-Traffic Routes (Optional)

For applications with >1000 DAU, analyze navigation patterns:

```typescript
// Example: Track navigation events
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function useNavigationTracking() {
  const location = useLocation();

  useEffect(() => {
    // Log route + timestamp to analytics
    console.log(`Navigated to ${location.pathname}`);
  }, [location.pathname]);
}
```

Build prediction map from top 3 most common next routes per current route.

### Step 3: Add Route-Based Prediction (Optional)

Create prediction map for common flows:

```typescript
// src/utils/routePrefetchMap.ts
export const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  '/assets': ['/vulnerabilities', '/jobs'],
  '/vulnerabilities': ['/assets', '/insights'],
  '/insights': ['/vulnerabilities', '/attacks'],
  '/jobs': ['/assets', '/agents'],
  '/attacks': ['/vulnerabilities', '/insights'],
};
```

Implement prefetch hook:

```typescript
// src/hooks/usePrefetchRoutes.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_PREFETCH_MAP } from '../utils/routePrefetchMap';

export function usePrefetchRoutes() {
  const location = useLocation();

  useEffect(() => {
    // Respect user preferences
    if (navigator.connection?.saveData) return;
    if (navigator.connection?.effectiveType === '2g') return;

    // Delay to avoid blocking initial render
    const timer = setTimeout(() => {
      const routesToPrefetch = ROUTE_PREFETCH_MAP[location.pathname] || [];
      routesToPrefetch.forEach(route => {
        // Trigger prefetch via link injection
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

See [references/implementation-checklist.md](references/implementation-checklist.md) for complete setup guide.

## Network Condition Checks

**Always respect user preferences before prefetching:**

```typescript
function shouldPrefetch(): boolean {
  // Check if user enabled data saver
  if (navigator.connection?.saveData) return false;

  // Avoid prefetch on 2g connections
  if (navigator.connection?.effectiveType === '2g') return false;

  return true;
}
```

**Why this matters:** Prefetching on slow connections or data saver mode wastes user bandwidth and can slow down critical requests.

See [references/network-conditions.md](references/network-conditions.md) for complete navigator.connection API reference.

## Trade-offs by Strategy

| Strategy               | Bandwidth Cost | Speed Gain       | Implementation |
| ---------------------- | -------------- | ---------------- | -------------- |
| Intent (hover/focus)   | Zero waste     | Fast (hover>200ms) | Trivial        |
| Predictive (2-3 routes)| Moderate       | Instant          | Medium         |
| Aggressive (all routes)| High           | Always instant   | Complex        |

**Recommendation:** Start with intent-based (`prefetch='intent'`). Add prediction only if analytics show >70% navigation accuracy for specific flows.

## Performance Measurement

Track these metrics to validate prefetching effectiveness:

```typescript
// Measure navigation timing
const navigationStart = performance.now();

// After route component renders
const navigationEnd = performance.now();
const navigationTime = navigationEnd - navigationStart;

console.log(`Navigation took ${navigationTime}ms`);
```

**Key metrics:**

- **Navigation timing:** Time from click to route render (target: <100ms)
- **Cache hit rate:** % of prefetched routes actually visited (target: >50%)
- **Bandwidth overhead:** Extra bytes from unused prefetches (target: <10% total)
- **Core Web Vitals:** LCP/CLS during navigation transitions

See [references/performance-measurement.md](references/performance-measurement.md) for instrumentation setup and monitoring dashboards.

## Integration with Code Splitting

Prefetching works seamlessly with `React.lazy()` and Vite code splitting:

```typescript
// Route configuration with lazy loading
const routes = [
  {
    path: '/dashboard',
    lazy: async () => {
      const { Dashboard } = await import('./routes/Dashboard');
      return { Component: Dashboard };
    },
  },
];
```

**Coordination with Vite:**

- Route splits create separate chunks (`route-dashboard-abc123.js`)
- Prefetching loads these chunks in background
- Vite's `manualChunks` optimizes vendor code separately

See [references/code-splitting-integration.md](references/code-splitting-integration.md) for Vite configuration patterns.

## Critical Rules

1. **Always check network conditions** before prefetching (respect `saveData` and `effectiveType`)
2. **Delay prefetching 1000ms** after page load to avoid blocking initial render
3. **Start with `prefetch='intent'`** - simplest implementation with best balance
4. **Measure before optimizing** - only add prediction if navigation timing is >200ms
5. **Limit prediction map** to 2-3 most common next routes per current route
6. **Never prefetch on 2g** connections or when `saveData` is enabled

## Verification Checklist

After implementing prefetching:

- [ ] Navigation links have `prefetch='intent'` prop
- [ ] DevTools Network shows route chunks downloading on hover
- [ ] Navigation timing improved (measure before/after)
- [ ] No prefetching on 2g connections
- [ ] No prefetching when `navigator.connection.saveData === true`
- [ ] Prediction map (if used) has <5 entries per route
- [ ] Cache hit rate >50% for predicted routes

## Integration

### Called By

- Frontend developers implementing React Router applications
- `optimizing-react-performance` skill (for navigation optimization)
- `optimizing-vite-builds` skill (coordination with code splitting)

### Requires (invoke before starting)

None - standalone optimization skill.

### Calls (during execution)

None - terminal skill providing implementation patterns.

### Pairs With (conditional)

| Skill                          | Trigger                               | Purpose                        |
| ------------------------------ | ------------------------------------- | ------------------------------ |
| `optimizing-react-performance` | General React performance optimization | Navigation is one optimization |
| `optimizing-vite-builds`       | Code splitting configuration          | Coordinate chunk strategy      |

## Related Skills

- `optimizing-react-performance` - Broader React optimization patterns (includes navigation)
- `optimizing-vite-builds` - Code splitting and bundle optimization (complements prefetching)
- `using-modern-react-patterns` - React 19 patterns including transitions and concurrent features
