# React 19 Security

**Security considerations specific to React 19 and Server Components.**

---

## Critical Security Alert

### CVE-2025-55182 (React2Shell)

**CVSS Score: 10.0 (Critical)**

| Detail | Value |
|--------|-------|
| **Vulnerability** | Remote Code Execution via insecure deserialization |
| **Affected Versions** | React 19.0.0 - 19.2.2 |
| **Patched Versions** | 19.0.3, 19.1.4, 19.2.3 |
| **Exploitation** | Active in the wild |
| **Threat Actors** | State-nexus groups (Earth Lamia, Jackpot Panda) |

**Immediate Action Required:**

```bash
# Check current version
npm list react

# Upgrade to patched version
npm install react@19.2.3 react-dom@19.2.3
```

### Related CVEs

| CVE | CVSS | Impact | Fixed In |
|-----|------|--------|----------|
| CVE-2025-55184 | 7.5 | Denial of Service | 19.0.3, 19.1.4, 19.2.3 |
| CVE-2025-55183 | 5.3 | Source Code Exposure | 19.0.3, 19.1.4, 19.2.3 |
| CVE-2025-67779 | 7.5 | DoS (bypass of 55184) | 19.0.3, 19.1.4, 19.2.3 |

---

## Server Components Security

### Data Exposure Risk

Server Components can access backend data directly. Be careful about what gets serialized to the client.

```typescript
// ❌ VULNERABLE: Exposing sensitive data
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  // This entire object is serialized to client!
  return <div>{JSON.stringify(user)}</div>; // Includes passwordHash!
}

// ✅ SECURE: Select only public fields
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      // NOT passwordHash, NOT internalNotes
    },
  });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Environment Variable Exposure

```typescript
// ❌ VULNERABLE: Secret in Server Component output
async function Config() {
  // This gets serialized to client!
  const apiKey = process.env.API_SECRET;
  return <div data-config={apiKey}>...</div>;
}

// ✅ SECURE: Never include secrets in rendered output
async function Config() {
  // Use secret server-side only
  const data = await fetchWithSecret(process.env.API_SECRET);
  // Return only public data
  return <div>{data.publicField}</div>;
}
```

---

## Server Actions Security

### Authentication Check

```typescript
'use server';

import { auth } from '@/lib/auth';

// ❌ VULNERABLE: No authentication check
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
}

// ✅ SECURE: Always verify authentication
export async function deleteUser(userId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!session.user.roles.includes('admin')) {
    throw new Error('Forbidden');
  }

  await db.user.delete({ where: { id: userId } });
}
```

### Input Validation

```typescript
'use server';

import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

// ❌ VULNERABLE: No input validation
export async function updateProfile(data: { name: string; bio?: string }) {
  await db.user.update({
    where: { id: currentUser.id },
    data,
  });
}

// ✅ SECURE: Validate all inputs
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const rawData = {
    name: formData.get('name'),
    bio: formData.get('bio'),
  };

  // Validate with Zod
  const validated = updateProfileSchema.parse(rawData);

  await db.user.update({
    where: { id: session.user.id },
    data: validated,
  });
}
```

### Rate Limiting

```typescript
'use server';

import { rateLimit } from '@/lib/rate-limit';

export async function submitForm(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  // Rate limit by user ID
  const { success } = await rateLimit.check(session.user.id, {
    limit: 10,
    window: '1m',
  });

  if (!success) {
    throw new Error('Too many requests');
  }

  // Process form...
}
```

---

## use() Hook Security

The new `use()` hook can read promises and context.

```typescript
// ❌ VULNERABLE: Trusting client-provided promise
function UserData({ userPromise }) {
  const user = use(userPromise); // Who created this promise?
  return <div>{user.name}</div>;
}

// ✅ SECURE: Create promise from trusted source
async function UserPage({ userId }) {
  // Promise created server-side from validated input
  const userPromise = fetchUser(userId);

  return (
    <Suspense fallback={<Loading />}>
      <UserData userPromise={userPromise} />
    </Suspense>
  );
}
```

---

## Streaming Security

Server Components support streaming, which has security implications.

```typescript
// Be aware that partial content is visible during streaming
async function SensitiveReport() {
  // During streaming, early content is visible before later content
  return (
    <div>
      <h1>Report</h1>
      {/* This shows immediately */}
      <Suspense fallback={<Loading />}>
        <SensitiveData />
        {/* This streams later - user sees loading state first */}
      </Suspense>
    </div>
  );
}

// Ensure authentication happens BEFORE any content streams
async function ProtectedPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
    return null; // Never reached, but TypeScript needs it
  }

  // Now safe to render protected content
  return <SensitiveReport />;
}
```

---

## Next.js Middleware Security

### CVE-2025-29927 (Authorization Bypass)

Middleware-only auth was bypassable.

```typescript
// ❌ VULNERABLE: Middleware-only protection
// middleware.ts
export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// ✅ SECURE: Defense in depth
// middleware.ts (first layer)
export function middleware(request: NextRequest) {
  // Middleware for UX, not security
  const session = request.cookies.get('session');
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// page.tsx (second layer - the actual security)
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.roles.includes('admin')) {
    notFound(); // or redirect
  }
  return <AdminDashboard />;
}
```

---

## Security Checklist for React 19

- [ ] Upgraded to patched React version (19.0.3+)
- [ ] Server Components only expose public data
- [ ] Server Actions validate authentication
- [ ] Server Actions validate and sanitize all inputs
- [ ] Rate limiting on Server Actions
- [ ] No secrets in rendered output
- [ ] Middleware + page-level auth (defense in depth)
- [ ] Next.js upgraded to patched version

---

## Related Resources

- [React Security Advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/authentication)
- [Vercel Security Bulletin](https://vercel.com/security)
