---
name: preloading-react-resources
description: Use when optimizing React 19 performance with resource preloading APIs for fonts, scripts, stylesheets, and images
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Preloading React Resources

**Optimize page load performance using React 19's declarative resource preloading APIs.**

## When to Use

Use this skill when:

- Optimizing React 19 application initial load performance
- Implementing critical font preloading strategies
- Prefetching CDN domains or third-party API connections
- Evaluating external scripts or stylesheets with priority control
- Distinguishing between resource preloading and route prefetching
- Combining resource preloading with React Router prefetching strategies
- User asks "How do I preload fonts in React 19?"
- User asks "What's the difference between prefetchDNS and preconnect?"
- User asks "How do I optimize third-party script loading?"

**Do NOT use this skill for:**

- Route prefetching (use `prefetching-react-routes` skill instead)
- Server-side rendering optimizations
- React component lazy loading (use React.lazy() documentation)
- General bundle size optimization (use `optimizing-vite-builds` skill)

## Core Principle

**React 19 provides six declarative APIs from `react-dom` for browser resource preloading:**

```typescript
import { prefetchDNS, preconnect, preload, preinit, preloadModule, preinitModule } from "react-dom";
```

These APIs give you **declarative control** over browser resource loading **within React components**, eliminating manual DOM manipulation while optimizing load performance.

**Critical distinction**: These APIs preload **resources** (fonts, scripts, stylesheets). Route prefetching (handled separately by React Router) preloads **route chunks**. Use BOTH for comprehensive optimization.

## Quick Decision Tree

```
What do you want to optimize?

├─ DNS resolution for domain (know domain, not specific resources)
│  └─ Use: prefetchDNS(url)
│
├─ Connection to server (will use resources soon)
│  └─ Use: preconnect(url, options?)
│
├─ Fetch resource WITHOUT executing/inserting
│  ├─ Standard resource (font, image, stylesheet, script)
│  │  └─ Use: preload(url, options)
│  └─ ESM module
│     └─ Use: preloadModule(url, options?)
│
└─ Fetch resource AND execute/insert immediately
   ├─ Script or stylesheet
   │  └─ Use: preinit(url, options)
   └─ ESM module
      └─ Use: preinitModule(url, options?)
```

## API Quick Reference

All APIs are imported from `react-dom`:

```typescript
import { prefetchDNS, preconnect, preload, preinit, preloadModule, preinitModule } from "react-dom";
```

| API             | Priority | Purpose                       | Example                                  |
| --------------- | -------- | ----------------------------- | ---------------------------------------- |
| `prefetchDNS`   | Lowest   | DNS resolution only           | `prefetchDNS('https://cdn.example.com')` |
| `preconnect`    | Low      | DNS + TCP + TLS               | `preconnect('https://api.example.com')`  |
| `preload`       | Medium   | Fetch resource, don't execute | `preload('/font.woff2', {as: 'font'})`   |
| `preinit`       | Highest  | Fetch + execute immediately   | `preinit('/script.js', {as: 'script'})`  |
| `preloadModule` | Medium   | Fetch ESM, don't execute      | `preloadModule('/module.js')`            |
| `preinitModule` | Highest  | Fetch + execute ESM           | `preinitModule('/module.js')`            |

**See**: [Complete API Reference](references/api-reference.md) for detailed signatures, parameters, usage examples, and Chariot-specific patterns for all six APIs

## Resource Priority Relationships

**Execution Order** (highest to lowest priority):

1. **preinit / preinitModule** - Fetch + execute/insert immediately
2. **preload / preloadModule** - Fetch only, don't execute
3. **preconnect** - Establish connection (DNS + TCP + TLS)
4. **prefetchDNS** - DNS resolution only

**Browser Behavior**:

- Higher priority resources **block** lower priority
- Multiple `preinit` calls execute in **call order**
- `preload` fetches in parallel but doesn't block rendering
- `prefetchDNS` and `preconnect` are hints, not guarantees

**Rule**: Use the **lowest priority API** that meets your needs. Over-prioritization (e.g., using `preinit` when `preload` suffices) can block rendering.

## Integration with Route Prefetching

React 19 resource preloading works **alongside** React Router route prefetching. Use both for comprehensive optimization.

**Two complementary systems**:

| System                     | Preloads     | Example                     |
| -------------------------- | ------------ | --------------------------- |
| React 19 APIs (this skill) | Resources    | Fonts, scripts, stylesheets |
| React Router               | Route chunks | Lazy-loaded components      |

**Integration pattern**:

```typescript
import { preload, prefetchDNS } from 'react-dom';
import { Link } from 'react-router-dom';

function Navigation() {
  // Resource preloading (fonts needed on dashboard)
  const handleDashboardHover = () => {
    preload('/fonts/dashboard-icons.woff2', {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });
  };

  return (
    <nav>
      {/* Route prefetching (handled by React Router) */}
      <Link
        to="/dashboard"
        prefetch="intent" // React Router prefetches route chunk
        onMouseEnter={handleDashboardHover} // We preload resources
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

**See**: `prefetching-react-routes` skill for React Router prefetching strategies.

## Framework Integration Notes

**Next.js / Remix**: These frameworks often handle resource preloading automatically. Check framework documentation before manually preloading:

- **Next.js**: Automatically preloads fonts in `next/font`
- **Remix**: Handles resource hints via Links export
- **Vite + React Router**: Manual preloading (this skill applies)

**When to use manual preloading**:

- Custom Vite + React setup (no framework)
- Framework doesn't preload specific resource type
- Fine-grained control over priority/timing

## Performance Impact & Measurement

**Expected gains**:

| Optimization           | Typical Improvement          |
| ---------------------- | ---------------------------- |
| Font preloading        | 200-500ms faster text render |
| DNS prefetch           | 20-120ms per domain          |
| Preconnect             | 100-300ms per domain         |
| Script preinit         | Earlier script execution     |
| Combined optimizations | 500ms-1s faster FCP/LCP      |

**See**: [Performance Measurement](references/performance-measurement.md) for:

- Core Web Vitals measurement (FCP, LCP, CLS)
- Resource Timing API analysis
- Chrome DevTools profiling techniques
- Lighthouse integration
- A/B testing performance improvements
- Real User Monitoring (RUM) setup
- CI/CD performance regression detection

## Common Patterns

**See**: [Common Patterns](references/common-patterns.md) for 15+ production-ready patterns including:

- Critical fonts in root layout
- Third-party domain prefetching
- Conditional script loading
- Route-specific resource preloading
- Progressive enhancement with connection awareness
- Chariot-specific CDN and API patterns
- Anti-pattern examples and fixes

## Anti-Patterns

**❌ DON'T: Preload too many resources**

```typescript
// BAD: Over-preloading blocks rendering
function BadExample() {
  preload("/fonts/font1.woff2", { as: "font", crossOrigin: "anonymous" });
  preload("/fonts/font2.woff2", { as: "font", crossOrigin: "anonymous" });
  preload("/fonts/font3.woff2", { as: "font", crossOrigin: "anonymous" });
  preload("/fonts/font4.woff2", { as: "font", crossOrigin: "anonymous" });
  // ... (renders blocked by 4+ font downloads)
}
```

**✅ DO: Preload only critical resources (1-2 fonts max)**

```typescript
// GOOD: Only preload critical fonts
function GoodExample() {
  preload("/fonts/Inter-Variable.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
}
```

**❌ DON'T: Use preinit when preload suffices**

```typescript
// BAD: Script executes immediately, blocks rendering
function BadExample() {
  preinit("https://cdn.example.com/non-critical-analytics.js", {
    as: "script",
  });
}
```

**✅ DO: Use preload for non-critical scripts**

```typescript
// GOOD: Fetch script but don't execute yet
function GoodExample() {
  preload("https://cdn.example.com/analytics.js", {
    as: "script",
  });
}
```

**❌ DON'T: Forget crossOrigin for fonts**

```typescript
// BAD: Font won't load (CORS failure)
preload("/fonts/font.woff2", { as: "font" });
```

**✅ DO: Always include crossOrigin for fonts**

```typescript
// GOOD: Font loads correctly
preload("/fonts/font.woff2", {
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous",
});
```

## Verification Checklist

Before completing resource preloading implementation:

- [ ] Using React 19's declarative APIs (NOT manual `<link>` tags)
- [ ] Imported APIs from `react-dom` (NOT `react`)
- [ ] Using correct API for priority level (preinit > preload > preconnect > prefetchDNS)
- [ ] Preloading ≤2 critical fonts (not entire font family)
- [ ] Including `crossOrigin: "anonymous"` for all fonts
- [ ] Limiting preconnect to 4-6 domains (browser connection limits)
- [ ] Using `as` parameter correctly (font, script, style, image)
- [ ] Combining with route prefetching for complete optimization
- [ ] Measuring performance impact (Chrome DevTools, Lighthouse)
- [ ] Not confusing resource preloading with route prefetching

## Integration

### Called By

- Frontend developers during performance optimization
- `gateway-frontend` when routing optimization tasks
- `prefetching-react-routes` (complementary route prefetching)

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - terminal skill

### Pairs With (conditional)

| Skill                          | Trigger                                 | Purpose                                 |
| ------------------------------ | --------------------------------------- | --------------------------------------- |
| `prefetching-react-routes`     | Comprehensive performance optimization  | Route chunk prefetching (React Router)  |
| `optimizing-vite-builds`       | Bundle size issues alongside preloading | Reduce initial bundle size              |
| `optimizing-react-performance` | General performance optimization        | Component-level optimization strategies |

## Related Skills

- `prefetching-react-routes` - React Router route chunk prefetching (complementary)
- `optimizing-react-performance` - Component-level performance optimization
- `optimizing-vite-builds` - Build-time bundle optimization
- `gateway-frontend` - Frontend skill router (invokes this skill)

## Sources

This skill is based on official React 19 documentation and community best practices:

- [React 19 Release Announcement](https://react.dev/blog/2024/12/05/react-19)
- [prefetchDNS API Reference](https://react.dev/reference/react-dom/prefetchDNS)
- [preload API Reference](https://react.dev/reference/react-dom/preload)
- [Callstack React 19 Guide](https://www.callstack.com/blog/the-complete-developer-guide-to-react-19-part-3-upgraded-support)
- [Vercel React 19 Overview](https://vercel.com/blog/whats-new-in-react-19)
