# Authorization Patterns in React

**Role-based and permission-based access control patterns for React applications.**

---

## Core Principle

**Frontend authorization is for UX, not security.**

```
❌ WRONG: "If user can't see the button, they can't access the feature"
✅ RIGHT: "Hide the button for UX; server validates EVERY request"
```

All authorization decisions must be enforced server-side. Frontend checks improve user experience but are trivially bypassed.

---

## RBAC vs ABAC

| Pattern | Description | Best For |
|---------|-------------|----------|
| **RBAC** | Role-Based Access Control | Simple hierarchies (admin, user, guest) |
| **ABAC** | Attribute-Based Access Control | Complex rules (department + seniority + time) |
| **Permission-Based** | Action:Resource pairs | Fine-grained control |

---

## Permission-Based Pattern (Recommended)

More flexible than role-based conditionals.

```typescript
// Permission format: action:resource
type Permission = `${string}:${string}`;

interface User {
  id: string;
  permissions: Permission[];
}

// Permission checking hook
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}

// Multiple permissions
export function usePermissions(permissions: Permission[]): boolean[] {
  const { user } = useAuth();
  return permissions.map((p) => user?.permissions.includes(p) ?? false);
}

// Usage
function AdminPanel() {
  const canViewUsers = usePermission('read:users');
  const canDeleteUsers = usePermission('delete:users');

  if (!canViewUsers) return <AccessDenied />;

  return (
    <div>
      <UserList />
      {canDeleteUsers && <DeleteUsersButton />}
    </div>
  );
}
```

---

## Authorization Context

```typescript
import { createContext, useContext, useMemo } from 'react';

interface AuthzContextType {
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
}

const AuthzContext = createContext<AuthzContextType | null>(null);

export function AuthzProvider({ children, permissions }) {
  const value = useMemo(() => ({
    can: (p: string) => permissions.includes(p),
    canAny: (ps: string[]) => ps.some((p) => permissions.includes(p)),
    canAll: (ps: string[]) => ps.every((p) => permissions.includes(p)),
  }), [permissions]);

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz() {
  const context = useContext(AuthzContext);
  if (!context) throw new Error('useAuthz must be used within AuthzProvider');
  return context;
}
```

---

## Conditional Rendering Components

```typescript
interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useAuthz();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}

interface CanAnyProps {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAny({ permissions, children, fallback = null }: CanAnyProps) {
  const { canAny } = useAuthz();
  return canAny(permissions) ? <>{children}</> : <>{fallback}</>;
}

// Usage
function Dashboard() {
  return (
    <div>
      <Can permission="read:analytics">
        <AnalyticsWidget />
      </Can>

      <CanAny permissions={['write:posts', 'admin:posts']}>
        <CreatePostButton />
      </CanAny>

      <Can permission="admin:users" fallback={<UpgradePrompt />}>
        <AdminTools />
      </Can>
    </div>
  );
}
```

---

## Protected Routes with Authorization

```typescript
import { Navigate, Outlet } from 'react-router-dom';

interface AuthorizedRouteProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
}

export function AuthorizedRoute({
  permission,
  permissions,
  requireAll = false,
}: AuthorizedRouteProps) {
  const { can, canAny, canAll } = useAuthz();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  let authorized = true;

  if (permission) {
    authorized = can(permission);
  } else if (permissions) {
    authorized = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!authorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// Route configuration
<Routes>
  <Route element={<AuthorizedRoute permission="read:dashboard" />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>

  <Route element={<AuthorizedRoute permissions={['admin:users']} />}>
    <Route path="/admin/users" element={<UserAdmin />} />
  </Route>
</Routes>
```

---

## Server-Side Validation Pattern

**Every API call must validate authorization server-side.**

```typescript
// Frontend (UX only)
function DeleteUserButton({ userId }) {
  const { can } = useAuthz();

  if (!can('delete:users')) return null;

  return (
    <button onClick={() => deleteUser(userId)}>
      Delete User
    </button>
  );
}

// API call
async function deleteUser(userId: string) {
  const response = await api.delete(`/users/${userId}`);
  // Server validates: does the requesting user have delete:users permission?
  return response.data;
}

// Backend (security enforcement)
// DELETE /users/:id
async function handleDeleteUser(req, res) {
  const { userId } = req.params;
  const requestingUser = req.user;

  // ALWAYS validate on server
  if (!requestingUser.permissions.includes('delete:users')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.user.delete({ where: { id: userId } });
  res.status(204).send();
}
```

---

## Fetching Permissions

```typescript
// Fetch permissions once after login
async function fetchUserPermissions(): Promise<string[]> {
  const response = await api.get('/auth/permissions');
  return response.data.permissions;
}

// In AuthProvider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserPermissions().then(setPermissions);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <AuthzProvider permissions={permissions}>
        {children}
      </AuthzProvider>
    </AuthContext.Provider>
  );
}
```

---

## Common Mistakes

| Mistake | Risk | Fix |
|---------|------|-----|
| Frontend-only checks | Full bypass | Server-side enforcement |
| Role in JWT payload | Stale permissions | Fetch permissions on each session |
| Hardcoded role lists | Difficult updates | Permission-based checks |
| No loading state | Flash of unauthorized content | Show spinner while checking |

---

## Security Checklist

- [ ] All authorization enforced server-side
- [ ] Frontend checks are for UX only
- [ ] Permissions fetched after authentication
- [ ] API returns 403 for unauthorized requests
- [ ] No sensitive data in JWT claims
- [ ] Loading states prevent content flash

---

## Related Resources

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Permify - Open Source Authorization](https://permify.co/)
