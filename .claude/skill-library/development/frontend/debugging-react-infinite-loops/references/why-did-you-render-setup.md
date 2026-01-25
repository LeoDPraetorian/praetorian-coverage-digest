# why-did-you-render Setup Guide

**Most powerful tool for debugging React re-render issues, especially object reference changes.**

## What It Does

why-did-you-render monkey-patches React to notify you about:

- Components re-rendering despite identical props
- Object/array reference changes causing unnecessary renders
- Pure components that should be stable but aren't

**Output example:**

```
YourComponent:
  Re-rendered because prop 'data' changed:
    prev: { id: 1, name: 'Alice' }
    next: { id: 1, name: 'Alice' }
  ⚠️ Different objects with same content - use useMemo
```

---

## Installation

### Step 1: Install Package (Dev Only)

```bash
npm install @welldone-software/why-did-you-render --save-dev
```

**⚠️ CRITICAL**: Use `--save-dev`, never in production. This tool significantly slows React.

---

### Step 2: Create wdyr.js

Create `src/wdyr.js` or `wdyr.js` at project root:

```javascript
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true, // Track React.memo and PureComponent
    trackHooks: true, // Track custom hooks
    logOwnerReasons: true, // Show parent component reasons
    collapseGroups: true, // Collapse console groups for cleaner output
  });
}
```

**Configuration options:**

| Option                  | Default | Purpose                                    |
| ----------------------- | ------- | ------------------------------------------ |
| `trackAllPureComponents` | false   | Auto-track all React.memo/PureComponent    |
| `trackHooks`            | true    | Track hook changes (useState, useEffect)   |
| `logOwnerReasons`       | false   | Show why parent re-rendered                |
| `collapseGroups`        | false   | Collapse console output for readability    |
| `include`               | []      | Regex array of component names to track   |
| `exclude`               | []      | Regex array of component names to ignore  |

---

### Step 3: Import First in Your App

**For Create React App or Vite:**

In `src/index.js` or `src/main.tsx`:

```javascript
import './wdyr'; // ⚠️ MUST be first import

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Rest of your code
```

**For Next.js:**

In `pages/_app.js`:

```javascript
import '../wdyr'; // First import

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

---

## Usage

### Auto-Tracking All Pure Components

With `trackAllPureComponents: true`, no manual setup needed:

```typescript
// Automatically tracked
const UserProfile = React.memo(({ user }) => {
  return <div>{user.name}</div>;
});
```

### Manually Track Specific Components

For fine-grained control:

```typescript
// Add this property to any component
function MyComponent(props) {
  return <div>...</div>;
}

MyComponent.whyDidYouRender = true;
```

### Track Custom Hooks

```typescript
function useClusterManagement() {
  // hook logic
}

useClusterManagement.whyDidYouRender = true;
```

---

## Interpreting Output

### Example 1: Object Reference Change

```
UserList:
  Re-rendered because prop 'users' changed:
    prev: [{ id: 1, name: 'Alice' }]
    next: [{ id: 1, name: 'Alice' }]
  ⚠️ Different objects with same content
```

**Diagnosis**: `users` prop is new array instance despite identical content.

**Fix**: Parent component should memoize the array:

```typescript
const users = useMemo(() => [{ id: 1, name: 'Alice' }], []);
```

---

### Example 2: Function Reference Change

```
FilterPanel:
  Re-rendered because prop 'onChange' changed:
    prev: function onChange() {}
    next: function onChange() {}
  ⚠️ Different function references
```

**Diagnosis**: `onChange` callback recreated on every parent render.

**Fix**: Parent should use `useCallback`:

```typescript
const handleChange = useCallback((value) => {
  setFilter(value);
}, []);
```

---

### Example 3: Hook Dependency Change

```
useClusterManagement:
  Re-rendered because hook dependency 'config' changed:
    prev: { threshold: 10 }
    next: { threshold: 10 }
```

**Diagnosis**: `config` object recreated in component body.

**Fix**: Memoize config or extract primitive:

```typescript
const config = useMemo(() => ({ threshold: 10 }), []);
```

---

## Filtering Output

### Include Only Specific Components

```javascript
whyDidYouRender(React, {
  include: [/^UserProfile$/, /FilterPanel/],
  trackAllPureComponents: false,
});
```

Only tracks components matching regex patterns.

### Exclude Noisy Components

```javascript
whyDidYouRender(React, {
  exclude: [/^Button/, /Icon/],
  trackAllPureComponents: true,
});
```

Tracks all except Button/Icon variants.

---

## Advanced Patterns

### Custom Notification Handler

```javascript
whyDidYouRender(React, {
  onlyLogs: true, // Disable console.warn, use custom handler
  notifier: (updateInfo) => {
    if (updateInfo.reason.propsDifferences) {
      // Custom logic, e.g., send to analytics
      console.table(updateInfo.reason.propsDifferences);
    }
  },
});
```

### Track Redux Hooks

```javascript
import { useSelector } from 'react-redux';

whyDidYouRender(React, {
  trackExtraHooks: [
    [useSelector, 'useSelector'],
  ],
});
```

---

## Troubleshooting

### Issue: No Output Showing

**Check**:

1. `wdyr.js` imported first in entry file?
2. `NODE_ENV=development`?
3. Components are React.memo or marked with `whyDidYouRender = true`?

### Issue: Too Much Output

**Solutions**:

1. Set `trackAllPureComponents: false` and manually mark components
2. Use `exclude` regex to filter noisy components
3. Set `collapseGroups: true` for cleaner console

### Issue: Production Build Includes wdyr

**Fix**: Verify conditional import:

```javascript
if (process.env.NODE_ENV === 'development') {
  // Only imports in dev builds
}
```

---

## Removing After Debugging

1. Comment out import in entry file:
   ```javascript
   // import './wdyr';
   ```

2. Or uninstall package:
   ```bash
   npm uninstall @welldone-software/why-did-you-render
   ```

**Keep it installed** as dev dependency for future debugging sessions.

---

## Resources

- [GitHub: welldone-software/why-did-you-render](https://github.com/welldone-software/why-did-you-render)
- [LogRocket: Debugging with why-did-you-render](https://blog.logrocket.com/debugging-react-performance-issues-with-why-did-you-render/)
