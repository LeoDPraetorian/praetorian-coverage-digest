# Advanced Performance Profiling

## Overview

Comprehensive profiling techniques for React 19 applications covering development tools, production builds, monitoring, and quality metrics.

## Profiler API: actualDuration vs baseDuration

### Understanding the Metrics

The React Profiler component provides two key timing metrics:

```typescript
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,      // Time spent rendering with memoization
  baseDuration: number,         // Time if nothing was memoized
  startTime: number,
  commitTime: number
) {
  const memoizationBenefit = baseDuration - actualDuration;
  const improvementPercent = ((baseDuration - actualDuration) / baseDuration) * 100;

  console.log(`Component: ${id}`);
  console.log(`Actual time: ${actualDuration}ms (with memoization)`);
  console.log(`Base time: ${baseDuration}ms (without memoization)`);
  console.log(`Memoization saved: ${memoizationBenefit}ms (${improvementPercent.toFixed(1)}%)`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </Profiler>
  );
}
```

### When Memoization is Working

**Ideal scenario:**
```
actualDuration: 5ms
baseDuration: 50ms
Savings: 45ms (90% improvement)
```

This indicates memoization is highly effective - React skipped re-rendering 90% of the component tree.

### When Memoization is Failing

**Problem scenario:**
```
actualDuration: 48ms
baseDuration: 50ms
Savings: 2ms (4% improvement)
```

This indicates memoization is barely working - almost everything is re-rendering despite attempts to optimize.

**Common causes:**
1. **Unstable dependencies**: Props/state changing on every render
2. **Inline objects/functions**: New references bypass memoization
3. **Context changes**: Context updates force re-renders regardless of memo
4. **Missing memoization**: Critical paths not memoized

### Debugging Poor Memoization

```typescript
function onRenderCallback(id, phase, actualDuration, baseDuration) {
  if (phase === "update") {
    const efficiency = (actualDuration / baseDuration) * 100;

    if (efficiency > 80) {
      console.warn(`⚠️ Poor memoization in ${id}: ${efficiency.toFixed(0)}% of tree re-rendered`);
      console.warn('Check for unstable dependencies or missing memoization');
    } else if (efficiency < 20) {
      console.log(`✅ Excellent memoization in ${id}: Only ${efficiency.toFixed(0)}% re-rendered`);
    }
  }
}
```

### Production Usage

```typescript
// Only enable in development or with feature flag
const shouldProfile = process.env.NODE_ENV === 'development' ||
                      window.ENABLE_PROFILING;

function App() {
  if (shouldProfile) {
    return (
      <Profiler id="App" onRender={onRenderCallback}>
        <MainContent />
      </Profiler>
    );
  }

  return <MainContent />;
}
```

## React Performance Tracks (DevTools)

### Overview

React DevTools Performance tab now shows detailed work prioritization through the Scheduler track with four priority subtracks.

### Opening Performance Tracks

1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Record interaction or page load
4. Look for "Scheduler" track (new in React 19+)

### Four Priority Subtracks

#### 1. Blocking (Highest Priority)

**What it is**: Urgent updates that block user input

**Examples:**
- Direct user input (typing, clicking)
- Animations that must stay smooth
- Critical UI updates

**Visual indicator**: Red/orange bars in Scheduler track

**When to use:**
```typescript
// Default state updates are blocking
const [value, setValue] = useState('');

function handleChange(e) {
  setValue(e.target.value); // Blocking - runs immediately
}
```

**Performance tip**: Most updates should NOT be blocking. Reserve for truly urgent work.

#### 2. Transition (Lower Priority)

**What it is**: Non-urgent updates that can be interrupted

**Examples:**
- Search filtering
- Tab switching
- Data table sorting
- Complex calculations

**Visual indicator**: Blue/green bars in Scheduler track

**When to use:**
```typescript
import { useTransition } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value) {
    setQuery(value); // Blocking - update input immediately

    startTransition(() => {
      const filtered = expensiveFilter(value);
      setResults(filtered); // Transition - can be interrupted
    });
  }
}
```

**Performance benefit**: User input stays responsive even during expensive operations.

#### 3. Suspense (Data Loading Priority)

**What it is**: Priority for loading states and data fetching

**Examples:**
- Component lazy loading
- Data fetching with Suspense
- Streaming server components

**Visual indicator**: Purple bars in Scheduler track

**When to use:**
```typescript
import { Suspense, lazy } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**What you'll see in Scheduler**:
- Suspense work shows when fallbacks render
- Shows when real content replaces fallback
- Helps identify slow data fetching

#### 4. Idle (Lowest Priority)

**What it is**: Work that runs when browser is idle

**Examples:**
- Analytics tracking
- Prefetching
- Non-critical logging
- Background data sync

**Visual indicator**: Gray bars in Scheduler track

**When to use:**
```typescript
import { useEffect } from 'react';

function Analytics() {
  useEffect(() => {
    // Run analytics during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        trackPageView();
        trackUserBehavior();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        trackPageView();
        trackUserBehavior();
      }, 0);
    }
  }, []);
}
```

### Interpreting the Scheduler Track

**Healthy pattern:**
```
Blocking:    ▓░░░░░░░░░     (Minimal, only critical updates)
Transition:  ░░▓▓▓▓░░░░     (Most work here)
Suspense:    ░░░░▓░░░░░     (Occasional loading)
Idle:        ░░░░░░░░▓░     (Background tasks)
```

**Problem pattern:**
```
Blocking:    ▓▓▓▓▓▓▓▓▓▓     (Too much blocking work!)
Transition:  ░░░░░░░░░░     (Not using transitions)
Suspense:    ░░░░░░░░░░
Idle:        ░░░░░░░░░░
```

**Why it matters**: If Scheduler track shows mostly red/orange (Blocking), your UI will feel unresponsive. Move expensive work to Transition priority.

### Using Scheduler Track to Debug

**Scenario 1: Laggy input**

1. Record typing in input field
2. Check Scheduler track
3. If you see long Blocking bars → Move expensive work to Transition

**Scenario 2: Slow page transitions**

1. Record clicking between tabs
2. Check Scheduler track
3. If you see delayed Transition work → Reduce amount of work or optimize components

**Scenario 3: Slow initial load**

1. Record page load
2. Check Suspense bars
3. If Suspense bars are very long → Data fetching is slow, consider streaming

## Production Profiling

### Why Development Profiling Misleads

**Development builds include:**
- Extra validation logic
- Detailed error messages
- Hot module replacement overhead
- Source map processing
- Strict mode double-rendering

**Result**: Development measurements are 2-5× slower than production.

### Using react-dom/profiling Build

#### 1. Install Profiling Build

```bash
npm install --save-dev react-dom@profiling
```

#### 2. Configure Webpack/Vite

**Webpack:**

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    }
  }
};
```

**Vite:**

```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      'react-dom': 'react-dom/profiling',
    }
  },
  build: {
    minify: false, // Keep readable for profiling
  }
});
```

#### 3. Build for Production Profiling

```bash
# Build with profiling enabled
NODE_ENV=production PROFILING=true npm run build

# Serve the build
npx serve -s dist
```

#### 4. Profile with React DevTools

1. Load production build in browser
2. Open React DevTools → Profiler tab
3. Record interaction
4. Analyze with accurate production timing

### Comparing Dev vs Production Measurements

**Example component timing:**

| Environment | Render Time | Notes |
|------------|-------------|-------|
| Development | 45ms | Includes validation overhead |
| Production (standard) | ❌ No profiling | Cannot measure |
| Production (profiling build) | 12ms | Accurate measurement |

**Key insight**: If component takes 45ms in dev, it likely takes 10-15ms in production. Always verify with profiling build.

### When to Use Production Profiling

- **Before launch**: Verify performance meets targets
- **Performance regression**: Measure production impact
- **Optimization validation**: Confirm improvements work in production
- **Benchmarking**: Compare performance across versions

## Production Monitoring

### Why Real User Monitoring (RUM) Matters

**Synthetic tests don't capture:**
- Real user devices (low-end phones, old browsers)
- Real network conditions (slow 3G, intermittent connections)
- Real usage patterns (edge cases, power users)
- Geographic variations (CDN effectiveness, latency)

**RUM provides:**
- Actual user experience data
- Performance percentiles (p50, p95, p99)
- Regression detection before widespread impact
- Device/browser/location breakdowns

### Tool Comparison

#### Sentry Performance

**Best for**: Full-stack monitoring with error tracking

**Setup:**

```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "your-dsn",
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1, // Sample 10% of transactions

  // Custom performance tracking
  beforeSend(event) {
    // Add custom context
    event.contexts = event.contexts || {};
    event.contexts.device = {
      memory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
    };
    return event;
  }
});
```

**Tracks:**
- Page load times
- Route transitions
- API response times
- Component render times (with Profiler integration)
- Errors correlated with performance issues

**Pricing**: Free tier (10k events/month), paid plans start $26/month

#### LogRocket

**Best for**: Session replay + performance

**Setup:**

```typescript
import LogRocket from 'logrocket';

LogRocket.init('your-app-id', {
  console: {
    shouldAggregateConsoleErrors: true
  },
  network: {
    requestSanitizer: request => {
      // Sanitize sensitive data
      if (request.headers['Authorization']) {
        request.headers['Authorization'] = '[REDACTED]';
      }
      return request;
    }
  }
});

// Track custom performance metrics
LogRocket.track('SlowRender', {
  component: 'AssetTable',
  duration: 150,
  itemCount: 5000
});
```

**Features:**
- Session replay (watch actual user interactions)
- Performance timeline
- Network waterfall
- Redux/Zustand state inspection
- Console logs and errors

**Pricing**: Free tier (1k sessions/month), paid plans start $99/month

#### Web Vitals Monitoring

**Best for**: Lightweight Core Web Vitals tracking

**Setup:**

```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    })
  });
}

// Track all Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Why use this**:
- Zero-dependency option
- Reports exact metrics Google uses for rankings
- Can send to any analytics platform

### Setting Performance Budgets

**Alert thresholds (p95):**

```javascript
const performanceBudgets = {
  // Core Web Vitals
  LCP: 2500,  // Largest Contentful Paint
  FID: 100,   // First Input Delay
  CLS: 0.1,   // Cumulative Layout Shift

  // Custom metrics
  initialLoad: 3000,      // Time to interactive
  routeTransition: 500,   // Navigation time
  apiResponse: 1000,      // API latency
  componentRender: 50,    // Individual component
};

// Alert if exceeded
function checkBudget(metric, value) {
  if (value > performanceBudgets[metric]) {
    alertTeam(`Performance budget exceeded: ${metric} = ${value}ms (limit: ${performanceBudgets[metric]}ms)`);
  }
}
```

### Regression Detection

**Example: Automated regression alerts**

```javascript
// Compare current performance to last 7 days
const currentP95 = 2800; // Current 95th percentile
const lastWeekP95 = 2100;
const threshold = 0.2; // 20% regression

if ((currentP95 - lastWeekP95) / lastWeekP95 > threshold) {
  alertTeam(`🚨 Performance regression detected: LCP increased ${Math.round((currentP95 - lastWeekP95) / lastWeekP95 * 100)}%`);
}
```

## Lighthouse Score Targets

### Score Categories

Lighthouse audits four categories, each weighted differently:

| Category | Target | Weight | Impact |
|----------|--------|--------|--------|
| **Performance** | 90+ | High | SEO, user retention |
| **Accessibility** | 100 | Medium | Legal compliance, UX |
| **Best Practices** | 90+ | Medium | Security, reliability |
| **SEO** | 90+ | Low | Search rankings |

### Performance Score Breakdown (0-100)

**Weighted metrics:**

```
First Contentful Paint (FCP)     - 10%
Speed Index                       - 10%
Largest Contentful Paint (LCP)    - 25% (HIGHEST WEIGHT)
Time to Interactive (TTI)         - 10%
Total Blocking Time (TBT)         - 30% (HIGHEST WEIGHT)
Cumulative Layout Shift (CLS)     - 15%
```

**Score calculation:**

- 90-100: Green (Excellent)
- 50-89: Orange (Needs improvement)
- 0-49: Red (Poor)

### Achieving 90+ Performance

**Target values for 90+ score:**

| Metric | Target | Weighted Score |
|--------|--------|----------------|
| FCP | <1.8s | 10/10 |
| LCP | <2.5s | 25/25 |
| TBT | <200ms | 30/30 |
| CLS | <0.1 | 15/15 |
| Speed Index | <3.4s | 10/10 |
| TTI | <3.8s | 10/10 |

**Total**: 100/100 (if all targets met)

### Common Performance Killers

**1. Large JavaScript bundles**

```
Problem: Initial bundle 800KB
Impact:  LCP +2s, TBT +500ms
Fix:     Code splitting → 200KB initial bundle
Result:  LCP 2.1s → 1.6s (Score: 70 → 92)
```

**2. Unoptimized images**

```
Problem: Hero image 2MB PNG
Impact:  LCP +3s
Fix:     WebP with srcset → 150KB
Result:  LCP 3.8s → 1.9s (Score: 45 → 95)
```

**3. Render-blocking resources**

```
Problem: 6 CSS files in <head>
Impact:  FCP +800ms
Fix:     Inline critical CSS, defer non-critical
Result:  FCP 2.2s → 1.4s (Score: 75 → 98)
```

**4. Main thread blocking**

```
Problem: Synchronous data processing on load
Impact:  TBT 450ms
Fix:     useTransition for heavy processing
Result:  TBT 450ms → 120ms (Score: 65 → 93)
```

### Achieving 100 Accessibility

**Critical requirements:**

- [ ] All images have alt text
- [ ] Color contrast ≥4.5:1 (text), ≥3:1 (UI)
- [ ] Interactive elements keyboard accessible
- [ ] Form inputs have associated labels
- [ ] ARIA roles used correctly
- [ ] Focus indicators visible
- [ ] Semantic HTML (<button> not <div onClick>)
- [ ] Heading hierarchy (h1 → h2 → h3)

**Common failures:**

```typescript
// ❌ FAILS: Missing alt text
<img src="logo.png" />

// ✅ PASSES: Descriptive alt
<img src="logo.png" alt="Chariot Security Platform" />

// ❌ FAILS: Low contrast (gray on light gray)
<p style={{ color: '#999', background: '#f5f5f5' }}>Text</p>

// ✅ PASSES: Sufficient contrast
<p style={{ color: '#333', background: '#fff' }}>Text</p>

// ❌ FAILS: Not keyboard accessible
<div onClick={handleClick}>Click me</div>

// ✅ PASSES: Semantic button
<button onClick={handleClick}>Click me</button>
```

### Achieving 90+ Best Practices

**Requirements:**

- [ ] HTTPS enabled
- [ ] No console errors or warnings
- [ ] Images have correct aspect ratio
- [ ] No vulnerable JavaScript libraries
- [ ] Proper CSP (Content Security Policy)
- [ ] No geolocation on page load
- [ ] No document.write usage

**Quick wins:**

1. **Fix console errors**: Clear all console.error() calls
2. **Update dependencies**: Run `npm audit fix`
3. **Add CSP header**: Prevent XSS attacks
4. **Use passive event listeners**: Improve scroll performance

### Continuous Lighthouse Monitoring

**CI/CD Integration:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

**Budget enforcement:**

```javascript
// lighthouserc.json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "performance": ["error", { "minScore": 0.9 }],
        "accessibility": ["error", { "minScore": 1.0 }],
        "best-practices": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }]
      }
    }
  }
}
```

**Result**: PRs fail if Lighthouse scores drop below targets.

## Related Resources

- [React Profiler API](https://react.dev/reference/react/Profiler)
- [React DevTools Performance](https://react.dev/learn/react-developer-tools#profiler)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [LogRocket Documentation](https://docs.logrocket.com/)
