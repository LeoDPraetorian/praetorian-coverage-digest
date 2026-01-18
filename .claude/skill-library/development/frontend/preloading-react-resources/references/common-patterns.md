# Common Patterns for React Resource Preloading

## Pattern 1: Critical Fonts in Root Layout

Load app-wide fonts at the highest level:

```typescript
import { preload } from 'react-dom';

function RootLayout({ children }) {
  // Preload all critical fonts used app-wide
  preload('/fonts/Inter-Variable.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });

  preload('/fonts/JetBrainsMono-Variable.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });

  return <div className="app">{children}</div>;
}
```

**Why this works**: Fonts are loaded at app initialization, preventing FOUT/FOIT on any route.

## Pattern 2: Third-Party Domains in App Shell

Establish connections to known external services:

```typescript
import { prefetchDNS, preconnect } from 'react-dom';

function AppShell({ children }) {
  // DNS prefetch for non-critical domains
  prefetchDNS('https://cdn.example.com');
  prefetchDNS('https://analytics.google.com');
  prefetchDNS('https://cdn.segment.com');

  // Preconnect for critical API
  preconnect('https://api.example.com', {
    crossOrigin: 'use-credentials',
  });

  return <Shell>{children}</Shell>;
}
```

**Why this works**: Connection overhead is eliminated before first API call or CDN resource request.

## Pattern 3: Conditional Script Loading

Load scripts based on feature flags or user permissions:

```typescript
import { preinit } from 'react-dom';

function FeatureToggle({ feature, children }) {
  if (feature === 'video-player') {
    preinit('https://cdn.example.com/video-player.js', {
      as: 'script',
    });
  }

  if (feature === 'live-chat') {
    preinit('https://cdn.example.com/chat-widget.js', {
      as: 'script',
    });
  }

  return children;
}
```

**Why this works**: Heavy scripts only load for users who have access, reducing bundle size for others.

## Pattern 4: Route-Specific Resource Preloading

Combine with React Router for route-aware preloading:

```typescript
import { preload } from 'react-dom';
import { Link } from 'react-router-dom';

function Navigation() {
  const handleDashboardHover = () => {
    // Preload dashboard-specific fonts
    preload('/fonts/dashboard-icons.woff2', {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });

    // Preload dashboard hero image
    preload('/images/dashboard-hero.webp', {
      as: 'image',
      fetchPriority: 'high',
    });
  };

  return (
    <Link
      to="/dashboard"
      prefetch="intent"
      onMouseEnter={handleDashboardHover}
    >
      Dashboard
    </Link>
  );
}
```

**Why this works**: Resources load on hover intent, combining React Router's route chunk prefetching with resource preloading.

## Pattern 5: Progressive Enhancement with User Preferences

Respect user preferences for data usage:

```typescript
import { preload, prefetchDNS } from 'react-dom';

function DataAwarePreloader() {
  const { connection } = navigator;
  const isSlowConnection =
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g';

  if (!isSlowConnection) {
    // Only preload on fast connections
    preload('/images/hero-background.webp', {
      as: 'image',
    });

    prefetchDNS('https://cdn.example.com');
  }

  return null;
}
```

**Why this works**: Respects user bandwidth constraints, avoiding wasted data on slow connections.

## Pattern 6: Analytics and Monitoring Scripts

Load monitoring tools with appropriate priority:

```typescript
import { preinit, preload } from 'react-dom';

function MonitoringProvider({ children }) {
  // Critical: Error tracking (must be available immediately)
  preinit('https://cdn.example.com/error-tracking.js', {
    as: 'script',
    fetchPriority: 'high',
  });

  // Non-critical: Analytics (can load later)
  preload('https://cdn.example.com/analytics.js', {
    as: 'script',
    fetchPriority: 'low',
  });

  return children;
}
```

**Why this works**: Error tracking loads immediately to catch startup errors, while analytics loads without blocking.

## Pattern 7: Multi-Stage Connection Establishment

Progressively establish connections based on user journey:

```typescript
import { prefetchDNS, preconnect } from 'react-dom';
import { useEffect } from 'react';

function ProgressiveConnectionManager() {
  // Stage 1: App shell loads
  prefetchDNS('https://api.example.com');
  prefetchDNS('https://cdn.example.com');

  useEffect(() => {
    // Stage 2: After initial render (non-blocking)
    const timer = setTimeout(() => {
      preconnect('https://api.example.com', {
        crossOrigin: 'use-credentials',
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
```

**Why this works**: DNS resolution happens immediately, full connection establishment deferred until after first paint.

## Pattern 8: Image Preloading with Responsive Hints

Preload responsive images with srcset:

```typescript
import { preload } from 'react-dom';

function HeroImage() {
  preload('/images/hero-large.webp', {
    as: 'image',
    imageSrcSet: `
      /images/hero-small.webp 640w,
      /images/hero-medium.webp 1024w,
      /images/hero-large.webp 1920w
    `,
    imageSizes: '100vw',
    fetchPriority: 'high',
  });

  return (
    <picture>
      <source srcSet="/images/hero-large.webp" />
      <img src="/images/hero-large.webp" alt="Hero" />
    </picture>
  );
}
```

**Why this works**: Browser preloads the correct image size based on viewport, avoiding double downloads.

## Pattern 9: Authenticated API Preconnection

Establish authenticated connections for protected APIs:

```typescript
import { preconnect } from 'react-dom';
import { useAuth } from './auth';

function AuthenticatedPreconnect() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    // Only preconnect if user is authenticated
    preconnect('https://api.example.com', {
      crossOrigin: 'use-credentials',
    });
  }

  return null;
}
```

**Why this works**: Avoids wasted connections for unauthenticated users, establishes connection for authenticated API calls.

## Pattern 10: Critical CSS Preinitialization

Load critical CSS immediately in app root:

```typescript
import { preinit } from 'react-dom';

function CriticalStylesLoader() {
  preinit('/styles/critical.css', {
    as: 'style',
    precedence: 'high',
  });

  preinit('/styles/fonts.css', {
    as: 'style',
    precedence: 'medium',
  });

  return null;
}
```

**Why this works**: Critical styles inserted before first paint, preventing FOUC while maintaining CSS loading order.

## Pattern 11: ESM Module Conditional Loading

Load ESM modules based on runtime conditions:

```typescript
import { preloadModule, preinitModule } from 'react-dom';

function DynamicFeatureLoader({ userPlan }) {
  if (userPlan === 'enterprise') {
    // Load but don't execute yet
    preloadModule('/modules/enterprise-features.js');
  }

  const handleEnterpriseFeature = () => {
    if (userPlan === 'enterprise') {
      // Execute on demand
      preinitModule('/modules/enterprise-features.js');
    }
  };

  return <Button onClick={handleEnterpriseFeature}>Advanced Tools</Button>;
}
```

**Why this works**: Module is preloaded for eligible users, executed only when needed.

## Pattern 12: Prioritized Script Loading Sequence

Load multiple scripts with defined priority order:

```typescript
import { preinit, preload } from 'react-dom';

function ScriptPriorityManager() {
  // P0: Critical security monitoring
  preinit('https://cdn.example.com/security.js', {
    as: 'script',
    fetchPriority: 'high',
  });

  // P1: Error tracking (important but not blocking)
  preinit('https://cdn.example.com/errors.js', {
    as: 'script',
  });

  // P2: Analytics (low priority, non-blocking)
  preload('https://cdn.example.com/analytics.js', {
    as: 'script',
    fetchPriority: 'low',
  });

  return null;
}
```

**Why this works**: Scripts execute in defined priority order, critical scripts don't wait for analytics.

## Chariot-Specific Patterns

### Pattern 13: Asset Discovery Icon Fonts

```typescript
import { preload } from 'react-dom';

function ChariotAssetDiscovery() {
  // Preload Chariot icon fonts used in asset visualization
  preload('/fonts/chariot-asset-icons.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });

  return <AssetExplorer />;
}
```

### Pattern 14: CloudFront CDN Preconnection

```typescript
import { prefetchDNS, preconnect } from 'react-dom';

function ChariotCDNManager() {
  // DNS prefetch for CloudFront distributions
  prefetchDNS('https://d1234567890.cloudfront.net');

  // Preconnect for frequently accessed assets
  preconnect('https://assets.chariot.praetorian.com', {
    crossOrigin: 'anonymous',
  });

  return null;
}
```

### Pattern 15: Vulnerability Data Lazy Loading

```typescript
import { preconnect } from 'react-dom';
import { useEffect } from 'react';

function VulnerabilityDataPreloader({ assetId }) {
  useEffect(() => {
    if (assetId) {
      // Preconnect to vulnerability API when asset selected
      preconnect('https://vulnerabilities-api.chariot.com', {
        crossOrigin: 'use-credentials',
      });
    }
  }, [assetId]);

  return null;
}
```

## Anti-Pattern Examples

### ❌ Anti-Pattern 1: Over-Preloading

```typescript
// DON'T: Preload entire font family (blocks rendering)
function BadFontLoader() {
  preload('/fonts/Inter-Thin.woff2', { as: 'font', crossOrigin: 'anonymous' });
  preload('/fonts/Inter-Light.woff2', { as: 'font', crossOrigin: 'anonymous' });
  preload('/fonts/Inter-Regular.woff2', {
    as: 'font',
    crossOrigin: 'anonymous',
  });
  preload('/fonts/Inter-Medium.woff2', { as: 'font', crossOrigin: 'anonymous' });
  preload('/fonts/Inter-Bold.woff2', { as: 'font', crossOrigin: 'anonymous' });
  preload('/fonts/Inter-Black.woff2', { as: 'font', crossOrigin: 'anonymous' });
}
```

**Fix**: Preload only 1-2 critical weights (usually Regular + Bold).

### ❌ Anti-Pattern 2: Using High Priority for Everything

```typescript
// DON'T: Everything high priority = nothing is priority
function BadPriorityManager() {
  preinit('/script1.js', { as: 'script', fetchPriority: 'high' });
  preinit('/script2.js', { as: 'script', fetchPriority: 'high' });
  preinit('/script3.js', { as: 'script', fetchPriority: 'high' });
  preinit('/script4.js', { as: 'script', fetchPriority: 'high' });
}
```

**Fix**: Reserve high priority for truly critical resources, use default or low for others.

### ❌ Anti-Pattern 3: Preloading Without Measurement

```typescript
// DON'T: Blindly preload without measuring impact
function UnmeasuredPreloader() {
  preload('/images/large-background.png', { as: 'image' }); // Is this helping?
  preload('/videos/intro.mp4', { as: 'video' }); // Is this hurting?
}
```

**Fix**: Always measure with Chrome DevTools and Lighthouse before/after.
