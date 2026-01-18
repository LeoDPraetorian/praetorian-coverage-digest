# React 19 Resource Preloading API Reference

Complete API documentation for all six resource preloading functions from `react-dom`.

## Import Statement

```typescript
import {
  prefetchDNS,
  preconnect,
  preload,
  preinit,
  preloadModule,
  preinitModule,
} from 'react-dom';
```

## prefetchDNS

### Purpose

Resolve DNS for a domain when you'll connect but don't know which resources yet.

### Priority Level

**Lowest** - Connection preparation only (DNS resolution)

### Signature

```typescript
function prefetchDNS(href: string): void;
```

### Parameters

- `href` (string): The domain URL to prefetch DNS for

### Usage Examples

```typescript
import { prefetchDNS } from 'react-dom';

function AppShell() {
  // Prefetch DNS for third-party domains
  prefetchDNS('https://cdn.example.com');
  prefetchDNS('https://analytics.google.com');
  prefetchDNS('https://fonts.googleapis.com');

  return <div>{/* ... */}</div>;
}
```

### When to Use

- Known third-party domains (CDNs, analytics, tracking)
- Resources needed later in user journey
- Lightweight optimization for many domains (unlimited)
- Domain connections that aren't immediately critical

### Chariot Examples

```typescript
// Example 1: CloudFront CDN prefetching
function ChariotApp() {
  prefetchDNS('https://d1234567890.cloudfront.net');
  prefetchDNS('https://assets.chariot.praetorian.com');

  return <Router />;
}

// Example 2: Third-party service prefetching
function ChariotAnalytics() {
  prefetchDNS('https://analytics.chariot.com');
  prefetchDNS('https://cdn.segment.com');

  return null;
}
```

### Browser Behavior

- Performs DNS lookup only (no TCP or TLS)
- Non-blocking (doesn't affect page load)
- Cached for subsequent requests to the domain
- Very lightweight (~1-2ms overhead)

---

## preconnect

### Purpose

Establish full connection (DNS + TCP + TLS) to server before requesting resources.

### Priority Level

**Low** - Connection preparation (heavier than prefetchDNS)

### Signature

```typescript
function preconnect(href: string, options?: { crossOrigin?: string }): void;
```

### Parameters

- `href` (string): The domain URL to connect to
- `options` (optional object):
  - `crossOrigin` (string): CORS mode - `"anonymous"`, `"use-credentials"`, or omit

### Usage Examples

```typescript
import { preconnect } from 'react-dom';

function AuthenticatedLayout() {
  // Connect to API server with credentials
  preconnect('https://api.example.com', {
    crossOrigin: 'use-credentials',
  });

  // Connect to CDN (anonymous)
  preconnect('https://cdn.example.com', {
    crossOrigin: 'anonymous',
  });

  return <Dashboard />;
}
```

### When to Use

- API domains where requests will happen soon
- Critical third-party services
- Resources that will be fetched with known credentials
- **Limit to 4-6 connections** (browser connection pool limits)

### Chariot Examples

```typescript
// Example 1: Authenticated API preconnection
function ChariotAuthenticatedShell() {
  preconnect('https://api.chariot.praetorian.com', {
    crossOrigin: 'use-credentials',
  });

  return <Layout />;
}

// Example 2: Asset CDN preconnection
function ChariotAssetLoader() {
  preconnect('https://assets.chariot.praetorian.com', {
    crossOrigin: 'anonymous',
  });

  return null;
}
```

### Browser Behavior

- Performs DNS + TCP handshake + TLS negotiation
- Connection ready for immediate use
- More expensive than prefetchDNS (~100-300ms)
- Connections may timeout if unused (~10s-30s)

### Best Practices

- Use for domains you'll connect to within 10 seconds
- Don't preconnect to >6 domains (wastes connections)
- Include `crossOrigin` if resources require CORS
- Prefer `prefetchDNS` if connection timing is uncertain

---

## preload

### Purpose

Fetch resource (stylesheet, font, image, script) with high priority but don't execute/insert.

### Priority Level

**Medium-high** - Fetch for later use (doesn't block rendering)

### Signature

```typescript
function preload(
  href: string,
  options: {
    as: string; // Required
    crossOrigin?: string;
    integrity?: string;
    type?: string;
    nonce?: string;
    fetchPriority?: 'high' | 'low' | 'auto';
    imageSrcSet?: string;
    imageSizes?: string;
    referrerPolicy?: string;
  }
): void;
```

### Parameters

- `href` (string): Resource URL
- `options` (object):
  - `as` (string, **required**): Resource type - `"image"`, `"font"`, `"script"`, `"style"`, `"fetch"`
  - `crossOrigin` (string): CORS mode
  - `integrity` (string): Subresource Integrity hash
  - `type` (string): MIME type (e.g., `"font/woff2"`)
  - `nonce` (string): CSP nonce
  - `fetchPriority` (string): `"high"`, `"low"`, or `"auto"`
  - `imageSrcSet` (string): Responsive image srcset
  - `imageSizes` (string): Responsive image sizes
  - `referrerPolicy` (string): Referrer policy

### Usage Examples

```typescript
import { preload } from 'react-dom';

// Example 1: Preload critical font
function TypographyProvider() {
  preload('https://cdn.example.com/fonts/Inter-Variable.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous', // REQUIRED for fonts
  });

  return <ThemeProvider />;
}

// Example 2: Preload hero image
function LandingPage() {
  preload('/images/hero-image.webp', {
    as: 'image',
    fetchPriority: 'high',
  });

  return <Hero />;
}

// Example 3: Preload stylesheet
function StyledComponent() {
  preload('/styles/theme.css', {
    as: 'style',
  });

  return <App />;
}

// Example 4: Preload responsive image
function ResponsiveHero() {
  preload('/images/hero.webp', {
    as: 'image',
    imageSrcSet: `
      /images/hero-small.webp 640w,
      /images/hero-medium.webp 1024w,
      /images/hero-large.webp 1920w
    `,
    imageSizes: '100vw',
    fetchPriority: 'high',
  });

  return <picture>{/* ... */}</picture>;
}
```

### When to Use

- Critical fonts in layout components (1-2 fonts max)
- Hero images on landing pages
- Stylesheets for above-the-fold content
- Resources with known exact URLs needed soon

### Chariot Examples

```typescript
// Example 1: Icon font preloading
function ChariotLayout() {
  preload('/fonts/chariot-icons.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });

  return <Shell />;
}

// Example 2: Asset visualization icons
function ChariotAssetExplorer() {
  preload('/images/asset-type-icons.svg', {
    as: 'image',
    fetchPriority: 'high',
  });

  return <AssetGrid />;
}
```

### Browser Behavior

- Fetches resource in parallel with other requests
- Doesn't execute scripts or insert stylesheets
- Resource cached for later use
- Priority can be controlled with `fetchPriority`

### Critical Rules

- **ALWAYS use `crossOrigin: "anonymous"` for fonts** (CORS requirement)
- **Limit to 1-2 fonts** (more blocks rendering)
- **Use `type` for fonts** (helps browser optimize)
- **Include `fetchPriority: "high"` for LCP images**

---

## preinit

### Purpose

Fetch and immediately execute script OR insert stylesheet.

### Priority Level

**Highest** - Immediate execution/insertion (blocks rendering if stylesheet)

### Signature

```typescript
function preinit(
  href: string,
  options: {
    as: 'script' | 'style';
    crossOrigin?: string;
    integrity?: string;
    nonce?: string;
    fetchPriority?: 'high' | 'low' | 'auto';
    precedence?: string; // For stylesheets only
  }
): void;
```

### Parameters

- `href` (string): Resource URL
- `options` (object):
  - `as` (string, **required**): `"script"` or `"style"`
  - `crossOrigin` (string): CORS mode
  - `integrity` (string): Subresource Integrity hash
  - `nonce` (string): CSP nonce
  - `fetchPriority` (string): Priority hint
  - `precedence` (string): Stylesheet loading order (stylesheets only)

### Usage Examples

```typescript
import { preinit } from 'react-dom';

// Example 1: Execute analytics script immediately
function AnalyticsProvider() {
  preinit('https://analytics.example.com/tracker.js', {
    as: 'script',
    crossOrigin: 'anonymous',
  });

  return <App />;
}

// Example 2: Insert critical stylesheet
function StyledApp() {
  preinit('/styles/critical.css', {
    as: 'style',
    precedence: 'high',
  });

  return <App />;
}

// Example 3: Multiple stylesheets with precedence
function MultiStyleApp() {
  preinit('/styles/reset.css', {
    as: 'style',
    precedence: 'high', // Loads first
  });

  preinit('/styles/theme.css', {
    as: 'style',
    precedence: 'medium', // Loads second
  });

  preinit('/styles/components.css', {
    as: 'style',
    precedence: 'low', // Loads third
  });

  return <App />;
}
```

### When to Use

- Analytics/monitoring scripts in root component
- Critical stylesheets required before first paint
- Third-party scripts that must execute early
- Error tracking scripts (catch startup errors)

### Chariot Examples

```typescript
// Example 1: Analytics script initialization
function ChariotRoot() {
  preinit('https://cdn.chariot.com/analytics.js', {
    as: 'script',
  });

  return <ChariotApp />;
}

// Example 2: Security monitoring script
function ChariotSecurityMonitor() {
  preinit('https://cdn.chariot.com/security-monitor.js', {
    as: 'script',
    fetchPriority: 'high',
  });

  return null;
}

// Example 3: Critical UI stylesheet
function ChariotUIShell() {
  preinit('/styles/chariot-critical.css', {
    as: 'style',
    precedence: 'high',
  });

  return <Shell />;
}
```

### Browser Behavior

- **Scripts**: Fetches and executes immediately
- **Stylesheets**: Fetches and inserts in `<head>` (blocks rendering)
- Highest priority loading
- Multiple calls execute in call order

### Best Practices

- Use sparingly (blocks rendering)
- Reserve for truly critical resources
- Prefer `preload` if immediate execution not needed
- Use `precedence` to control stylesheet order

---

## preloadModule

### Purpose

Fetch ESM module without executing.

### Priority Level

**Medium** - Fetch for later use (module-specific preload)

### Signature

```typescript
function preloadModule(
  href: string,
  options?: {
    as?: string;
    crossOrigin?: string;
    integrity?: string;
    nonce?: string;
  }
): void;
```

### Parameters

- `href` (string): ESM module URL
- `options` (optional object):
  - `as` (string): Resource type (usually `"script"`)
  - `crossOrigin` (string): CORS mode
  - `integrity` (string): Subresource Integrity hash
  - `nonce` (string): CSP nonce

### Usage Examples

```typescript
import { preloadModule } from 'react-dom';

// Example 1: Preload feature module
function FeatureGate({ hasFeature }) {
  if (hasFeature('advanced-editor')) {
    preloadModule('/modules/advanced-editor.js', {
      as: 'script',
    });
  }

  return <Editor />;
}

// Example 2: Preload dynamic import
function DynamicFeature() {
  const handleClick = async () => {
    const module = await import('/modules/feature.js');
    module.init();
  };

  // Preload on mount
  preloadModule('/modules/feature.js');

  return <button onClick={handleClick}>Load Feature</button>;
}
```

### When to Use

- Conditional feature modules
- Dynamic imports that will happen soon
- ESM-based microfrontends
- Code-split features with known triggers

### Chariot Examples

```typescript
// Example 1: Vulnerability scanner module
function ChariotVulnScanner({ assetId }) {
  if (assetId) {
    preloadModule('/modules/vuln-scanner.js');
  }

  return <ScannerUI />;
}

// Example 2: Report generator module
function ChariotReportGenerator() {
  const handleGenerateReport = async () => {
    const { generateReport } = await import('/modules/report-gen.js');
    generateReport();
  };

  // Preload on hover
  const handleHover = () => {
    preloadModule('/modules/report-gen.js');
  };

  return <button onMouseEnter={handleHover} onClick={handleGenerateReport}>
    Generate Report
  </button>;
}
```

### Browser Behavior

- Fetches ESM module file
- Parses module but doesn't execute
- Resolves module dependencies
- Module ready for immediate `import()`

---

## preinitModule

### Purpose

Fetch and immediately execute ESM module.

### Priority Level

**Highest** - Immediate execution (module-specific preinit)

### Signature

```typescript
function preinitModule(
  href: string,
  options?: {
    as?: string;
    crossOrigin?: string;
    integrity?: string;
    nonce?: string;
  }
): void;
```

### Parameters

- `href` (string): ESM module URL
- `options` (optional object):
  - `as` (string): Resource type (usually `"script"`)
  - `crossOrigin` (string): CORS mode
  - `integrity` (string): Subresource Integrity hash
  - `nonce` (string): CSP nonce

### Usage Examples

```typescript
import { preinitModule } from 'react-dom';

// Example 1: Initialize WebSocket module immediately
function RealTimeFeatures() {
  preinitModule('/modules/websocket-client.js');

  return <LiveDashboard />;
}

// Example 2: Initialize monitoring module
function MonitoringProvider() {
  preinitModule('/modules/error-tracking.js');

  return <App />;
}
```

### When to Use

- Critical ESM modules required immediately
- Real-time features (WebSockets, SSE)
- Module initialization that must happen early
- Feature flags that enable early module loading

### Chariot Examples

```typescript
// Example 1: Real-time vulnerability feed
function ChariotLiveFeed() {
  preinitModule('/modules/realtime-vuln-feed.js');

  return <VulnerabilityFeed />;
}

// Example 2: Asset discovery engine
function ChariotAssetDiscovery() {
  preinitModule('/modules/discovery-engine.js');

  return <DiscoveryDashboard />;
}
```

### Browser Behavior

- Fetches and parses ESM module
- Executes module immediately
- Resolves and executes dependencies
- Top-level await supported

---

## API Comparison Table

| API              | Priority | Action                  | Use Case                        |
| ---------------- | -------- | ----------------------- | ------------------------------- |
| `prefetchDNS`    | Lowest   | DNS only                | Future domain connections       |
| `preconnect`     | Low      | DNS + TCP + TLS         | Soon-to-use domains             |
| `preload`        | Medium   | Fetch only              | Critical resources (fonts, images) |
| `preinit`        | Highest  | Fetch + execute/insert  | Critical scripts/styles         |
| `preloadModule`  | Medium   | Fetch ESM only          | Feature modules (conditional)   |
| `preinitModule`  | Highest  | Fetch + execute ESM     | Critical ESM modules            |

## Priority Relationships

**Execution order** (highest to lowest):

1. **preinit / preinitModule** → Immediate
2. **preload / preloadModule** → High priority fetch
3. **preconnect** → Connection setup
4. **prefetchDNS** → DNS resolution

**Rule**: Use the **lowest priority API** that meets your needs.

## Common Parameter Patterns

### crossOrigin

```typescript
// For fonts (REQUIRED)
crossOrigin: 'anonymous';

// For authenticated APIs
crossOrigin: 'use-credentials';

// For public resources (optional but recommended)
crossOrigin: 'anonymous';
```

### fetchPriority

```typescript
// LCP images
fetchPriority: 'high';

// Non-critical analytics
fetchPriority: 'low';

// Default
fetchPriority: 'auto'; // or omit
```

### as Parameter Values

```typescript
as: 'font'; // Fonts (.woff2, .woff, .ttf)
as: 'image'; // Images (.webp, .png, .jpg)
as: 'script'; // Scripts (.js)
as: 'style'; // Stylesheets (.css)
as: 'fetch'; // Fetch requests (JSON, API data)
```

## Type Definitions

Full TypeScript types for all APIs:

```typescript
// prefetchDNS
declare function prefetchDNS(href: string): void;

// preconnect
declare function preconnect(
  href: string,
  options?: {
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
  }
): void;

// preload
declare function preload(
  href: string,
  options: {
    as: 'image' | 'font' | 'script' | 'style' | 'fetch';
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    integrity?: string;
    type?: string;
    nonce?: string;
    fetchPriority?: 'high' | 'low' | 'auto';
    imageSrcSet?: string;
    imageSizes?: string;
    referrerPolicy?:
      | 'no-referrer'
      | 'no-referrer-when-downgrade'
      | 'origin'
      | 'origin-when-cross-origin'
      | 'same-origin'
      | 'strict-origin'
      | 'strict-origin-when-cross-origin'
      | 'unsafe-url';
  }
): void;

// preinit
declare function preinit(
  href: string,
  options: {
    as: 'script' | 'style';
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    integrity?: string;
    nonce?: string;
    fetchPriority?: 'high' | 'low' | 'auto';
    precedence?: string;
  }
): void;

// preloadModule
declare function preloadModule(
  href: string,
  options?: {
    as?: string;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    integrity?: string;
    nonce?: string;
  }
): void;

// preinitModule
declare function preinitModule(
  href: string,
  options?: {
    as?: string;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    integrity?: string;
    nonce?: string;
  }
): void;
```
