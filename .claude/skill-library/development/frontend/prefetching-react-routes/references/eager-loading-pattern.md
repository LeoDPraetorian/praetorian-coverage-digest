# Eager Loading Pattern (Custom Hook)

## Overview

Eager loading triggers `import()` directly when users hover over navigation links, bypassing browser hint priority for faster prefetch.

## When to Use

- Critical navigation paths where instant response matters
- Desktop-focused applications (hover works better on desktop)
- When browser hint prefetching is too slow for your targets

## Implementation

### Custom PrefetchLink Component

```typescript
// src/components/PrefetchLink.tsx
import { Link, LinkProps } from 'react-router-dom';
import { useCallback } from 'react';

interface PrefetchLinkProps extends LinkProps {
  onPrefetch?: () => void;
}

export function PrefetchLink({ to, onPrefetch, children, ...props }: PrefetchLinkProps) {
  const handleMouseEnter = useCallback(() => {
    if (onPrefetch) {
      onPrefetch();
    } else {
      // Default: prefetch the route component
      // Note: This requires mapping route paths to lazy imports
      console.log(`Prefetching ${to}`);
    }
  }, [to, onPrefetch]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  );
}
```

### Route Import Map

```typescript
// src/utils/routeImportMap.ts
export const ROUTE_IMPORT_MAP: Record<string, () => Promise<any>> = {
  '/dashboard': () => import('../routes/Dashboard'),
  '/vulnerabilities': () => import('../routes/Vulnerabilities'),
  '/assets': () => import('../routes/Assets'),
  '/jobs': () => import('../routes/Jobs'),
};

export function prefetchRoute(path: string) {
  const importFn = ROUTE_IMPORT_MAP[path];

  if (importFn) {
    importFn().catch(err => {
      console.warn(`Failed to prefetch ${path}:`, err);
    });
  }
}
```

### Usage

```typescript
import { PrefetchLink } from './components/PrefetchLink';
import { prefetchRoute } from './utils/routeImportMap';

function Navigation() {
  return (
    <nav>
      <PrefetchLink
        to="/dashboard"
        onPrefetch={() => prefetchRoute('/dashboard')}
      >
        Dashboard
      </PrefetchLink>

      <PrefetchLink
        to="/vulnerabilities"
        onPrefetch={() => prefetchRoute('/vulnerabilities')}
      >
        Vulnerabilities
      </PrefetchLink>
    </nav>
  );
}
```

## Comparison to Built-in Prefetch

| Aspect | Built-in (`prefetch='intent'`) | Eager Loading (Custom Hook) |
|--------|--------------------------------|------------------------------|
| **Implementation** | One prop | Custom component + import map |
| **Priority** | Browser lowest priority | Direct import (higher) |
| **Speed** | Slower (low priority) | Faster (immediate) |
| **Complexity** | Trivial | Medium (maintain import map) |
| **Browser Management** | Yes (respects resource pressure) | No (always runs) |

**Recommendation:** Start with built-in `prefetch='intent'`. Only use eager loading if measurements show built-in is insufficient.

## Mobile Support

Add `onTouchStart` for touch devices:

```typescript
export function PrefetchLink({ to, onPrefetch, children, ...props }: PrefetchLinkProps) {
  const handlePrefetch = useCallback(() => {
    if (onPrefetch) {
      onPrefetch();
    }
  }, [onPrefetch]);

  return (
    <Link
      to={to}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch} // Mobile support
      {...props}
    >
      {children}
    </Link>
  );
}
```

**Note:** `onTouchStart` fires on tap (too late for prefetch benefit on first tap). Useful for multi-page flows where user taps multiple times.

## Network Condition Integration

```typescript
import { shouldPrefetch } from '../utils/networkConditions';

export function PrefetchLink({ to, onPrefetch, children, ...props }: PrefetchLinkProps) {
  const handlePrefetch = useCallback(() => {
    // Respect network conditions
    if (!shouldPrefetch()) return;

    if (onPrefetch) {
      onPrefetch();
    }
  }, [onPrefetch]);

  return (
    <Link
      to={to}
      onMouseEnter={handlePrefetch}
      {...props}
    >
      {children}
    </Link>
  );
}
```

## Related Patterns

- Link Prefetch (browser hint)
- Route Prediction (prefetch based on current route)
