# React Server Components (RSC)

## Overview

React Server Components are components that render on the server without sending JavaScript to the client. They're a major performance feature that reduces bundle size by 40-60% in large applications while maintaining interactivity where needed.

**Key benefit**: Zero client-side JavaScript for non-interactive UI.

## Performance Benefits

- **40-60% bundle size reduction** in typical large apps
- **62% reduction in one case study** - sites rendering 3× faster
- **Improved Core Web Vitals** - Better FCP, LCP scores
- **Reduced client-side hydration** - Less JavaScript to parse/execute

## Server vs Client Components

### Server Components (Default)

**When to use:**

- Data fetching from APIs or databases
- Non-interactive UI (text, images, layout)
- Components with no state or effects
- Heavy dependencies that don't need client-side

**Benefits:**

- Zero client JavaScript
- Direct backend access (databases, secrets)
- Faster initial page load

**Example:**

```typescript
// Server Component (default - no directive needed)
async function UserProfile({ userId }: { userId: string }) {
  // Can directly access database
  const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Client Components

**When to use:**

- Interactivity (onClick, onChange)
- React hooks (useState, useEffect, useContext)
- Browser APIs (window, localStorage)
- Event listeners

**Mark with `"use client"` directive:**

```typescript
'use client'; // Must be at top of file

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

## The "use client" Directive

Marks boundary where components become client-side:

```typescript
'use client'; // Everything in this file is client-side

import { useState } from 'react';

// This and all child components are client components
export function Interactive() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

**Important**: The directive applies to the entire file and its imports.

## The "use server" Directive

Marks server actions that can be called from client components:

```typescript
"use server";

export async function updateUser(formData: FormData) {
  const name = formData.get("name");
  // Direct database access from server
  await db.user.update({
    where: { id: userId },
    data: { name },
  });
}
```

Used in client components:

```typescript
'use client';

import { updateUser } from './actions';

export function EditForm() {
  return (
    <form action={updateUser}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Hybrid Component Strategy

Mix server and client components for optimal performance:

```typescript
// Server Component (no directive)
async function Dashboard() {
  const data = await fetchDashboardData(); // Server-side fetch

  return (
    <div>
      {/* Server-rendered static header */}
      <Header title="Dashboard" />

      {/* Client component for interactivity */}
      <InteractiveChart data={data} />

      {/* Server-rendered list */}
      <StaticList items={data.items} />
    </div>
  );
}

// Client component for chart interaction
'use client';
function InteractiveChart({ data }: { data: ChartData }) {
  const [view, setView] = useState('bar');
  return <Chart data={data} viewType={view} onViewChange={setView} />;
}
```

**Strategy**: Keep heavy, non-interactive UI as server components. Only mark interactive parts as client components.

## Streaming with Suspense Boundaries

Load parts of the page progressively while streaming others:

```typescript
// Server Component
async function Page() {
  return (
    <div>
      {/* Renders immediately */}
      <Header />

      {/* Streams in when ready */}
      <Suspense fallback={<Skeleton />}>
        <SlowData />
      </Suspense>

      {/* Renders immediately */}
      <Footer />
    </div>
  );
}

async function SlowData() {
  const data = await slowAPICall(); // Takes 2 seconds
  return <DataDisplay data={data} />;
}
```

**How it works:**

1. Server sends shell HTML immediately (Header, Skeleton, Footer)
2. User sees page layout instantly
3. When `SlowData` finishes, server streams updated HTML
4. React replaces Skeleton with real content

### Multiple Suspense Boundaries

Stream different sections independently:

```typescript
async function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* User info streams first (fast) */}
      <Suspense fallback={<UserSkeleton />}>
        <UserInfo />
      </Suspense>

      {/* Charts stream second (medium) */}
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsCharts />
      </Suspense>

      {/* Table streams last (slow) */}
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}
```

## Composition Patterns

### Pass Client Components as Props

Server components can compose client components:

```typescript
// Server Component
function ServerLayout({ children }: { children: React.ReactNode }) {
  const data = await fetchData();

  return (
    <div>
      <ServerHeader data={data} />
      {children} {/* Can be client component */}
      <ServerFooter />
    </div>
  );
}

// Usage
<ServerLayout>
  <ClientInteractive /> {/* Client component as child */}
</ServerLayout>
```

### Avoid Client-to-Server Nesting

```typescript
// ❌ WRONG: Can't import server component into client
'use client';
import { ServerComponent } from './server'; // ERROR

function ClientComponent() {
  return <ServerComponent />; // Won't work
}

// ✅ RIGHT: Pass server component as prop
'use client';
function ClientComponent({ serverContent }: { serverContent: React.ReactNode }) {
  return <div>{serverContent}</div>;
}

// Then in server component:
<ClientComponent serverContent={<ServerComponent />} />
```

## Common Pitfalls

### 1. Improper Suspense Boundaries

```typescript
// ❌ BAD: Too granular, causes layout shift
<Suspense fallback={<div>Loading name...</div>}>
  <UserName />
</Suspense>
<Suspense fallback={<div>Loading email...</div>}>
  <UserEmail />
</Suspense>

// ✅ GOOD: Logical grouping, stable layout
<Suspense fallback={<UserCardSkeleton />}>
  <UserCard /> {/* Renders name and email together */}
</Suspense>
```

**Why**: Too many boundaries cause waterfall loading and layout shifts, making performance worse.

### 2. Over-Using "use client"

```typescript
// ❌ BAD: Entire page is client-side
'use client';

export default function Page() {
  const [filter, setFilter] = useState('');
  return (
    <div>
      <Header /> {/* Doesn't need client-side */}
      <FilterInput value={filter} onChange={setFilter} />
      <DataList filter={filter} /> {/* Could be server-side */}
    </div>
  );
}

// ✅ GOOD: Only interactive part is client
export default async function Page() {
  return (
    <div>
      <Header /> {/* Server component */}
      <FilterableList /> {/* Client component with filter state */}
    </div>
  );
}
```

### 3. Missing "use client" Directive

```typescript
// ❌ ERROR: useState in server component
export function Component() {
  const [state, setState] = useState(0); // CRASH
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}

// ✅ CORRECT: Add directive
'use client';
export function Component() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}
```

### 4. Async Client Components

```typescript
// ❌ ERROR: Client components can't be async
'use client';
export async function Component() { // ERROR
  const data = await fetch('/api');
  return <div>{data}</div>;
}

// ✅ CORRECT: Use server component for async or useEffect in client
export async function Component() { // Server component
  const data = await fetch('/api');
  return <div>{data}</div>;
}
```

## Migration Strategy

### Phase 1: Audit Components

Categorize components:

- **Pure server**: No interactivity, no hooks, no browser APIs
- **Pure client**: Interactive, uses hooks
- **Mixed**: Could be split

### Phase 2: Start with Layout

Convert layouts to server components first:

```typescript
// app/layout.tsx (Server Component)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Header /> {/* Server component */}
        {children}
        <Footer /> {/* Server component */}
      </body>
    </html>
  );
}
```

### Phase 3: Add Client Boundaries

Mark interactive components:

```typescript
// components/SearchBar.tsx
"use client";
export function SearchBar() {
  const [query, setQuery] = useState("");
  // ... interactive logic
}
```

### Phase 4: Optimize with Suspense

Add streaming for slow data:

```typescript
<Suspense fallback={<LoadingSkeleton />}>
  <ExpensiveDataComponent />
</Suspense>
```

## Framework Support

### Next.js App Router

Default behavior in App Router:

```typescript
// app/page.tsx - Server Component by default
export default async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <DataDisplay data={data} />;
}

// components/Interactive.tsx - Mark as client
'use client';
export function Interactive() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

## Performance Measurement

### Before/After Metrics

Track these improvements:

| Metric          | Before RSC | After RSC | Improvement |
| --------------- | ---------- | --------- | ----------- |
| **Bundle size** | 500KB      | 200KB     | -60%        |
| **FCP**         | 2.1s       | 1.3s      | -38%        |
| **LCP**         | 3.5s       | 2.2s      | -37%        |
| **TTI**         | 4.2s       | 2.8s      | -33%        |

### Tools

- **Next.js Bundle Analyzer** - Measure JavaScript sent to client
- **Lighthouse** - Track Core Web Vitals improvement
- **React DevTools** - Profile client-side components only

## When NOT to Use RSC

RSC may not help when:

- **Highly interactive apps** - Most UI needs client-side state (games, editors)
- **Real-time apps** - Constant WebSocket updates require client components
- **Small apps** - Overhead not worth it for simple sites
- **Static sites** - Static generation simpler for content-only sites

## Related Patterns

- **Edge Rendering** - Deploy server components to edge for lower latency
- **Incremental Static Regeneration** - Cache server component output
- **Parallel Routes** - Load multiple server components concurrently

## Additional Resources

- [React Server Components Documentation](https://react.dev/reference/rsc/server-components)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Performance Optimization Guide](./performance.md)
