# Module Systems

Code splitting, lazy loading, barrel exports, and module boundaries.

## Code Splitting Strategies

### Route-Based Splitting

```typescript
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    component: lazy(() => import('./pages/Settings')),
  },
];
```

### Feature-Based Splitting

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts  # Public API
│   ├── users/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
```

## Barrel Exports

```typescript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';

// Usage
import { Button, Input, Modal } from '@/components';
```

## Module Boundaries

```typescript
// ✅ Clear boundaries
import { useAuth } from '@/features/auth';
import { UserList } from '@/features/users';

// ❌ Crossing boundaries
import { AuthContext } from '@/features/auth/context'; // Internal
```

## Related References

- [React 19 Patterns](react-19-patterns.md) - Component organization
- [Build Tools](build-tools.md) - Bundle configuration
