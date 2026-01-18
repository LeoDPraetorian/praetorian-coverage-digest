# Performance Measurement for Resource Preloading

## Overview

Measuring the impact of resource preloading is critical to avoid over-optimization (which can hurt performance) and to validate that preloading strategies are working as expected.

## Core Web Vitals

React resource preloading primarily impacts these metrics:

### 1. First Contentful Paint (FCP)

**What it measures**: Time until first text/image renders.

**How preloading helps**:

- `preload` for critical fonts prevents FOUT
- `prefetchDNS` / `preconnect` reduces connection latency
- `preinit` for critical CSS eliminates render-blocking

**Measurement**:

```typescript
// Using PerformanceObserver API
const fcpObserver = new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');

  if (fcp) {
    console.log('FCP:', fcp.startTime, 'ms');
  }
});

fcpObserver.observe({ type: 'paint', buffered: true });
```

**Target**: < 1.8s (good), < 3.0s (needs improvement)

### 2. Largest Contentful Paint (LCP)

**What it measures**: Time until largest visible element renders.

**How preloading helps**:

- `preload` for hero images with `fetchPriority: "high"`
- `preconnect` for API domains serving above-the-fold data
- `preinit` for critical stylesheets

**Measurement**:

```typescript
const lcpObserver = new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime, 'ms');
});

lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
```

**Target**: < 2.5s (good), < 4.0s (needs improvement)

### 3. Cumulative Layout Shift (CLS)

**What it measures**: Visual stability (unexpected layout shifts).

**How preloading helps**:

- Preloading fonts prevents FOUT/FOIT shifts
- Preloading images with dimensions prevents reflow

**Measurement**:

```typescript
let clsScore = 0;
const clsObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (!(entry as any).hadRecentInput) {
      clsScore += (entry as any).value;
    }
  }
  console.log('CLS:', clsScore);
});

clsObserver.observe({ type: 'layout-shift', buffered: true });
```

**Target**: < 0.1 (good), < 0.25 (needs improvement)

## Resource Timing API

### Measuring Individual Resource Load Times

```typescript
function measureResourceTiming(resourceUrl: string) {
  const entries = performance.getEntriesByName(resourceUrl, 'resource');

  entries.forEach((entry) => {
    console.log({
      name: entry.name,
      // DNS lookup time
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      // TCP connection time
      tcpTime: entry.connectEnd - entry.connectStart,
      // TLS negotiation time
      tlsTime: entry.secureConnectionStart
        ? entry.connectEnd - entry.secureConnectionStart
        : 0,
      // Time to first byte
      ttfb: entry.responseStart - entry.requestStart,
      // Download time
      downloadTime: entry.responseEnd - entry.responseStart,
      // Total duration
      duration: entry.duration,
      // Transfer size
      transferSize: entry.transferSize,
      // Decoded body size
      decodedBodySize: entry.decodedBodySize,
    });
  });
}

// Usage:
measureResourceTiming('https://cdn.example.com/fonts/Inter-Variable.woff2');
```

### Comparing Before/After Preloading

```typescript
// Before adding preload
function measureBaseline() {
  const fontEntry = performance
    .getEntriesByType('resource')
    .find((e) => e.name.includes('Inter-Variable.woff2'));

  console.log('Baseline font load:', fontEntry?.duration);
}

// After adding preload
function measureOptimized() {
  const fontEntry = performance
    .getEntriesByType('resource')
    .find((e) => e.name.includes('Inter-Variable.woff2'));

  console.log('Optimized font load:', fontEntry?.duration);
}
```

**Expected improvement**: 30-50% reduction in font load time.

## Chrome DevTools Performance Profiling

### Network Panel Analysis

**Steps**:

1. Open DevTools → Network tab
2. Clear cache (important!)
3. Reload page with Slow 3G throttling
4. Look for:
   - Preload resources show `(high)` priority
   - DNS lookup times reduced for preconnect domains
   - Fonts load earlier in waterfall

**Key indicators**:

- **Priority column**: `Highest` for preinit, `High` for preload
- **Initiator column**: Shows `preload` instead of `parser`
- **Waterfall**: Preloaded resources start earlier

### Performance Panel Analysis

**Steps**:

1. Open DevTools → Performance tab
2. Start recording
3. Reload page
4. Stop recording after page load
5. Analyze:
   - Main thread activity (less blocking = better)
   - Network requests timeline
   - Paint events (FCP, LCP markers)

**Look for**:

- Reduced blocking time on main thread
- Parallel resource loading (not sequential)
- Earlier LCP element rendering

## Lighthouse Audits

### Running Lighthouse

```bash
# CLI (in project root)
npx lighthouse https://localhost:3000 \
  --view \
  --preset=desktop \
  --only-categories=performance
```

**Key metrics from Lighthouse**:

| Metric                            | Weight | Target |
| --------------------------------- | ------ | ------ |
| First Contentful Paint            | 10%    | < 1.8s |
| Largest Contentful Paint          | 25%    | < 2.5s |
| Total Blocking Time               | 30%    | < 200ms |
| Cumulative Layout Shift           | 25%    | < 0.1  |
| Speed Index                       | 10%    | < 3.4s |

### Interpreting Opportunities Section

Lighthouse flags missed optimization opportunities:

- **"Preconnect to required origins"**: Add `preconnect` for these domains
- **"Preload key requests"**: Add `preload` for critical resources
- **"Eliminate render-blocking resources"**: Use `preinit` or defer loading

## A/B Testing Performance

### Setup

```typescript
// Feature flag to enable/disable preloading
const ENABLE_PRELOADING = Math.random() > 0.5; // 50% split

function ConditionalPreloader() {
  if (ENABLE_PRELOADING) {
    preload('/fonts/Inter-Variable.woff2', {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });
  }

  return null;
}
```

### Measuring Cohorts

```typescript
// Send metrics to analytics
function sendMetrics(cohort: 'control' | 'treatment') {
  const lcpEntry = performance
    .getEntriesByType('largest-contentful-paint')
    .pop();

  if (lcpEntry) {
    analytics.track('performance_metrics', {
      cohort,
      lcp: lcpEntry.renderTime || lcpEntry.loadTime,
      timestamp: Date.now(),
    });
  }
}
```

**Statistical significance**: Need 1000+ samples per cohort.

## Real User Monitoring (RUM)

### Sending Metrics to Backend

```typescript
function sendRUMMetrics() {
  const metrics = {
    fcp: 0,
    lcp: 0,
    cls: 0,
    ttfb: 0,
    url: window.location.href,
    userAgent: navigator.userAgent,
    connectionType: (navigator as any).connection?.effectiveType,
  };

  // Collect FCP
  const fcpEntry = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
  if (fcpEntry) metrics.fcp = fcpEntry.startTime;

  // Collect LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    metrics.lcp = (lastEntry as any).renderTime || (lastEntry as any).loadTime;

    // Send to backend
    navigator.sendBeacon('/api/metrics', JSON.stringify(metrics));
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}

// Call after page load
window.addEventListener('load', () => {
  setTimeout(sendRUMMetrics, 0);
});
```

### Analyzing RUM Data

```sql
-- Average LCP by preloading status (example query)
SELECT
  has_preloading,
  AVG(lcp) as avg_lcp,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as p75_lcp
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY has_preloading;
```

## Connection Type Segmentation

Different connection types show different improvements:

```typescript
function measureByConnectionType() {
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || 'unknown';

  console.log('Connection type:', effectiveType);

  // Measure performance
  const lcpEntry = performance
    .getEntriesByType('largest-contentful-paint')
    .pop();

  analytics.track('performance_by_connection', {
    connectionType: effectiveType,
    lcp: lcpEntry?.renderTime || lcpEntry?.loadTime,
  });
}
```

**Expected improvements by connection type**:

| Connection | DNS Prefetch | Preconnect | Preload |
| ---------- | ------------ | ---------- | ------- |
| 4G         | 20-50ms      | 100-200ms  | 200-400ms |
| 3G         | 50-120ms     | 200-400ms  | 400-800ms |
| Slow 3G    | 100-300ms    | 400-800ms  | 800-1500ms |

## Automated Performance Regression Detection

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Serve
        run: npx serve -s build -l 3000 &

      - name: Run Lighthouse
        run: |
          npm install -g lighthouse
          lighthouse http://localhost:3000 \
            --output=json \
            --output-path=./lighthouse-report.json \
            --only-categories=performance

      - name: Check Performance Budget
        run: |
          SCORE=$(jq '.categories.performance.score' lighthouse-report.json)
          if (( $(echo "$SCORE < 0.9" | bc -l) )); then
            echo "Performance score $SCORE is below threshold 0.9"
            exit 1
          fi
```

## Comparative Metrics Table

**Typical improvements from resource preloading**:

| Metric     | Before Preloading | After Preloading | Improvement |
| ---------- | ----------------- | ---------------- | ----------- |
| FCP        | 2.1s              | 1.4s             | -33%        |
| LCP        | 3.5s              | 2.3s             | -34%        |
| TBT        | 450ms             | 280ms            | -38%        |
| CLS        | 0.15              | 0.05             | -67%        |
| Font FOUT  | 800ms             | 0ms (preloaded)  | -100%       |

**Note**: Results vary based on network conditions, asset sizes, and implementation.

## Debugging Performance Issues

### Issue: Preload Not Working

**Symptoms**: Resource loads at same time as before preload.

**Diagnosis**:

```typescript
// Check if preload link was created
const preloadLinks = document.querySelectorAll('link[rel="preload"]');
console.log('Preload links:', preloadLinks);

// Check resource timing
const fontEntry = performance
  .getEntriesByType('resource')
  .find((e) => e.name.includes('your-font.woff2'));
console.log('Font entry:', fontEntry);
```

**Common causes**:

- Missing `crossOrigin` for fonts
- Incorrect `as` attribute
- Browser cache hiding effect (clear cache!)

### Issue: Performance Regression After Preloading

**Symptoms**: Page slower after adding preload.

**Diagnosis**:

```typescript
// Count preload links
const preloadCount = document.querySelectorAll('link[rel="preload"]').length;
console.log('Preload count:', preloadCount);

// If > 5, you're over-preloading
```

**Fix**: Reduce to 1-2 critical resources only.

## Summary Checklist

Before deploying resource preloading:

- [ ] Measured baseline metrics (FCP, LCP, CLS)
- [ ] Implemented preloading strategically (≤2 fonts, ≤4 domains)
- [ ] Re-measured with Chrome DevTools
- [ ] Ran Lighthouse audit (score improvement ≥5 points)
- [ ] Tested on Slow 3G throttling
- [ ] Verified preload links in DOM
- [ ] Checked Resource Timing API for improvements
- [ ] Set up RUM if possible
- [ ] Documented expected improvements
- [ ] Added performance budget to CI/CD

## Tools Reference

| Tool                    | Purpose                              | Command/URL                         |
| ----------------------- | ------------------------------------ | ----------------------------------- |
| Chrome DevTools         | Network/Performance profiling        | F12 → Network/Performance tab       |
| Lighthouse              | Comprehensive audits                 | `npx lighthouse <url>`              |
| WebPageTest             | Real-world connection simulation     | https://www.webpagetest.org         |
| Performance Observer    | Programmatic metrics collection      | Browser API (code above)            |
| Resource Timing API     | Detailed resource load breakdown     | `performance.getEntriesByType()`    |
| web-vitals library      | Easy Core Web Vitals measurement     | `npm install web-vitals`            |
