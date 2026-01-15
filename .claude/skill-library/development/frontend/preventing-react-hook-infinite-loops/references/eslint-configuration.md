# ESLint Configuration for React Hooks

**Complete setup guide for eslint-plugin-react-hooks with exhaustive-deps rule.**

---

## Installation

```bash
npm install --save-dev eslint eslint-plugin-react-hooks
```

---

## Configuration (ESLint 9+ Flat Config)

```javascript
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn' // or 'error' for strict
    }
  }
];
```

---

## Configuration (Legacy .eslintrc)

```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## Rule Details

### rules-of-hooks

Enforces Rules of Hooks:
- Only call hooks at top level
- Only call hooks from React functions
- Don't call hooks in loops, conditions, or nested functions

**Example violations**:
```typescript
// ❌ Hook in condition
function Component({ show }) {
  if (show) {
    useEffect(() => {}); // Error!
  }
}

// ❌ Hook in loop
function Component({ items }) {
  items.forEach(item => {
    useState(item); // Error!
  });
}
```

---

### exhaustive-deps

Validates dependency arrays:
- Warns about missing dependencies
- Warns about unnecessary dependencies
- Suggests fixes (with autofix capability)

**Example violations**:
```typescript
// ❌ Missing dependency
function Component({ userId }) {
  useEffect(() => {
    fetchUser(userId);
  }, []); // Warning: userId missing from deps
}

// ❌ Object/function without memoization
function Component() {
  const config = { api: '/endpoint' };
  useEffect(() => {}, [config]); // Warning: new reference every render
}
```

---

## Custom Hook Validation

Tell ESLint about custom hooks:

```javascript
// eslint.config.js
export default [
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          'additionalHooks': '(useMyCustomHook|useAnotherHook)'
        }
      ]
    }
  }
];
```

---

## Disabling Rules (When Necessary)

Only disable with documented reason:

```typescript
// Disable for specific line
useEffect(() => {
  // Intentionally runs only once
  initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Disable for entire file (rarely needed)
/* eslint-disable react-hooks/exhaustive-deps */
```

---

## CI/CD Integration

```json
// package.json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

```yaml
# GitHub Actions
- name: Lint
  run: npm run lint
```

---

## Pre-commit Hooks

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

---

## Known Issues

1. **Autofix can introduce bugs** (Issues #15084, #15204)
   - Review autofix suggestions carefully
   - Don't blindly accept

2. **Anonymous defaults not caught**
   - ESLint misses `items = []` pattern
   - Requires manual code review

3. **ESLint 9 migration complexity**
   - Flat config requires different syntax
   - See [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide)

---

## Sources

- [eslint-plugin-react-hooks](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- GitHub Issues: #15084, #15204

---

**Last Updated**: 2026-01-14
**Confidence**: 0.95
