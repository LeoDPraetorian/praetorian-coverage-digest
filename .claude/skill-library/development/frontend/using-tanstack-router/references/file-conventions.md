# File Naming Conventions

Complete reference for TanStack Router file-based routing conventions including dynamic params, layouts, route groups, exclusions, escaping, and special characters.

## Overview

TanStack Router uses **file naming conventions** to generate route paths. Understanding these conventions is critical for creating the exact URL structure you need.

**Key principle:** File name determines URL path. Special prefixes/suffixes modify routing behavior without affecting URLs.

---

## Complete Convention Reference

| Convention | Meaning | Example File | Generated Route | Notes |
|------------|---------|--------------|-----------------|-------|
| `$param` | Dynamic path parameter | `posts.$postId.tsx` | `/posts/:postId` | Captures dynamic segment |
| `_layout` (prefix) | Pathless layout | `_layout.tsx` | - | Wraps children without URL |
| `_suffix` | Exclude from parent | `settings_.tsx` | `/settings` | Breaks out of parent nesting |
| `(folder)` | Route group | `(auth)/login.tsx` | `/login` | Folder not in URL |
| `-prefix` | Exclude from routes | `-utils.tsx` | - | Not a route |
| `[x]` | Escape special chars | `[products].tsx` | `/[products]` | Literal brackets in URL |
| `.route.tsx` | Route at directory | `posts.route.tsx` | `/posts` | Index + directory |
| `index` | Index route | `index.tsx` | `/` | Matches parent exactly |
| `__root` | Root route | `__root.tsx` | - | App root (required) |
| `$` (alone) | Splat/catch-all | `$.tsx` | `/*` | Matches rest of path |
| `.lazy.tsx` | Lazy-loaded route | `posts.lazy.tsx` | `/posts` | Code-split UI |

---

## Dynamic Parameters (`$param`)

### Basic Dynamic Segment

```
routes/
├── posts/
│   └── $postId.tsx       # /posts/:postId
```

**Generated route:** `/posts/:postId`

**Example URLs:**
- `/posts/123` → matches, `postId = "123"`
- `/posts/my-first-post` → matches, `postId = "my-first-post"`
- `/posts` → doesn't match (postId missing)

**Accessing params:**

```typescript
// posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    console.log(params.postId)  // "123"
    return fetchPost(params.postId)
  },
})
```

### Multiple Dynamic Segments

```
routes/
├── users/
│   └── $userId/
│       └── posts/
│           └── $postId.tsx   # /users/:userId/posts/:postId
```

**Generated route:** `/users/:userId/posts/:postId`

**Example URLs:**
- `/users/alice/posts/hello` → matches
- `/users/123/posts/456` → matches

**Accessing multiple params:**

```typescript
export const Route = createFileRoute('/users/$userId/posts/$postId')({
  loader: async ({ params }) => {
    const { userId, postId } = params
    return { user: await fetchUser(userId), post: await fetchPost(postId) }
  },
})
```

---

## Pathless Layouts (`_layout`)

### Basic Pathless Layout

```
routes/
├── dashboard/
│   ├── _layout.tsx       # No URL segment
│   ├── index.tsx         # /dashboard
│   └── settings.tsx      # /dashboard/settings
```

**`_layout.tsx` behavior:**
- Wraps child routes with shared UI (sidebar, header, etc.)
- Does NOT add `/layout` to URL
- Children render inside `<Outlet />`

**Example:**

```typescript
// dashboard/_layout.tsx
export const Route = createFileRoute('/dashboard/_layout')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        <Outlet />  {/* Children render here */}
      </main>
    </div>
  )
}
```

### Nested Pathless Layouts

```
routes/
├── app/
│   ├── _layout.tsx           # Outer layout
│   └── settings/
│       ├── _layout.tsx       # Inner layout
│       ├── index.tsx         # /app/settings
│       └── profile.tsx       # /app/settings/profile
```

Both layouts wrap their children, neither adds URL segments.

---

## Route Groups (`(folder)`)

### Organize Without URL Impact

```
routes/
├── (marketing)/         # Route group (not in URL)
│   ├── about.tsx        # /about (NOT /(marketing)/about)
│   └── contact.tsx      # /contact
└── (app)/              # Route group (not in URL)
    ├── dashboard.tsx    # /dashboard (NOT /(app)/dashboard)
    └── settings.tsx     # /settings
```

**Benefit:** Organize files by concern without affecting URLs.

### Route Groups with Shared Layouts

```
routes/
├── (marketing)/
│   ├── _layout.tsx      # Shared marketing layout
│   ├── about.tsx        # /about with marketing layout
│   └── pricing.tsx      # /pricing with marketing layout
└── (app)/
    ├── _layout.tsx      # Shared app layout
    ├── dashboard.tsx    # /dashboard with app layout
    └── settings.tsx     # /settings with app layout
```

**Pattern:** Combine route groups with pathless layouts for section-specific UI.

---

## Excluding from Parent Nesting (`_suffix`)

### Break Out of Parent Path

```
routes/
├── settings/
│   ├── index.tsx        # /settings
│   └── advanced.tsx     # /settings/advanced
└── settings_.tsx        # /settings (sibling, not child)
```

**Without `_suffix`:** Both files would conflict (both trying to handle `/settings`)

**With `_suffix`:** `settings_.tsx` is a separate route, not nested under `settings/`

**Use case:** Separate implementation for same path (e.g., different layouts).

---

## Excluding Files (`-prefix`)

### Prevent File from Being a Route

```
routes/
├── dashboard.tsx        # ✅ Route: /dashboard
├── -utils.tsx           # ❌ Not a route (excluded)
└── -types.ts            # ❌ Not a route (excluded)
```

**Use for:**
- Utility functions
- Type definitions
- Helper modules
- Constants

**Alternative:** Configure `routeFileIgnorePrefix` in router config:

```typescript
const router = createRouter({
  routeTree,
  routeFileIgnorePrefix: '-',  // Ignore files starting with -
})
```

---

## Escaping Special Characters (`[x]`)

### Literal Special Chars in URLs

```
routes/
├── [products].tsx       # /[products] (literal brackets)
├── [$special].tsx       # /[$special] (literal $ and brackets)
```

**Generated routes:**
- `[products].tsx` → `/[products]` (not a dynamic param)
- `[$special].tsx` → `/[$special]` (not a dynamic param)

**Use case:** Rare. Most special chars don't need escaping (e.g., `-`, `_` work fine).

---

## Route at Directory (`.route.tsx`)

### Both Index and Directory Routes

```
routes/
├── posts.route.tsx      # /posts route
└── posts/
    ├── $postId.tsx      # /posts/:postId
    └── new.tsx          # /posts/new
```

**`posts.route.tsx` behavior:**
- Handles `/posts` path
- Parent for `/posts/` directory routes

**Without `.route.tsx`:** You'd need `posts/index.tsx` for `/posts` path.

---

## Index Routes (`index.tsx`)

### Match Parent Path Exactly

```
routes/
├── index.tsx            # / (root index)
├── dashboard/
│   ├── index.tsx        # /dashboard (dashboard index)
│   └── settings.tsx     # /dashboard/settings
```

**`index.tsx` behavior:**
- Matches parent path exactly
- Does NOT add `/index` to URL

**Example:**
- `routes/dashboard/index.tsx` → matches `/dashboard`
- `routes/dashboard/settings.tsx` → matches `/dashboard/settings`

---

## Root Route (`__root.tsx`)

### Application Root

```
routes/
└── __root.tsx           # App root (required)
```

**Required:** Every TanStack Router app must have a `__root.tsx` file.

**Purpose:**
- Wraps entire application
- Defines root context
- Handles global error/not-found components

**Example:**

```typescript
// __root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div>
      <Nav />
      <Outlet />  {/* All routes render here */}
      <Footer />
    </div>
  ),
})
```

---

## Splat/Catch-All (`$` or `_splat`)

### Match Remaining Path Segments

```
routes/
├── docs/
│   └── $.tsx            # /docs/* (matches everything under /docs)
```

**Newer syntax (preferred):**

```
routes/
├── docs/
│   └── _splat.tsx       # /docs/* (explicit splat route)
```

**Generated route:** `/docs/*`

**Example URLs:**
- `/docs/getting-started` → matches
- `/docs/api/reference` → matches
- `/docs/some/deep/path` → matches

**Accessing splat:**

```typescript
export const Route = createFileRoute('/docs/$')({
  loader: async ({ params }) => {
    console.log(params._splat)  // "getting-started" or "api/reference"
    return fetchDoc(params._splat)
  },
})
```

**Use case:** Documentation sites, dynamic catch-all routes.

---

## Lazy Routes (`.lazy.tsx`)

### Code-Split UI Components

```
routes/
├── dashboard.tsx        # Critical options (loader, beforeLoad)
└── dashboard.lazy.tsx   # Non-critical options (component, UI)
```

**See:** [code-splitting.md](code-splitting.md) for complete lazy loading patterns.

---

## Complete Example Directory Structure

```
src/routes/
├── __root.tsx                    # App root
├── index.tsx                     # / (home)
├── (marketing)/                  # Route group (not in URL)
│   ├── _layout.tsx               # Marketing layout
│   ├── about.tsx                 # /about
│   └── pricing.tsx               # /pricing
├── (app)/                        # Route group (not in URL)
│   ├── _layout.tsx               # App layout
│   ├── dashboard.tsx             # /dashboard
│   ├── dashboard.lazy.tsx        # Dashboard UI (lazy)
│   └── settings/
│       ├── _layout.tsx           # Settings layout
│       ├── index.tsx             # /settings
│       ├── profile.tsx           # /settings/profile
│       └── advanced.tsx          # /settings/advanced
├── assets/
│   ├── index.tsx                 # /assets
│   ├── $assetId.tsx              # /assets/:assetId
│   └── $assetId.lazy.tsx         # Asset detail UI (lazy)
├── users/
│   └── $userId/
│       └── posts/
│           └── $postId.tsx       # /users/:userId/posts/:postId
├── docs/
│   └── $.tsx                     # /docs/* (catch-all)
└── -utils/                       # Excluded from routing
    ├── -helpers.ts
    └── -types.ts
```

**Generated routes:**
- `/` (home)
- `/about`
- `/pricing`
- `/dashboard`
- `/settings`
- `/settings/profile`
- `/settings/advanced`
- `/assets`
- `/assets/:assetId`
- `/users/:userId/posts/:postId`
- `/docs/*`

---

## Best Practices

### 1. Use Route Groups for Organization

Group related routes without affecting URLs:

```
(marketing)/    # Public pages
(app)/         # Authenticated pages
(admin)/       # Admin-only pages
```

### 2. Combine Groups with Pathless Layouts

```
(app)/
├── _layout.tsx   # Shared app layout
├── dashboard.tsx
└── settings.tsx
```

### 3. Use `.route.tsx` for Complex Directories

When directory needs its own index route plus children:

```
posts.route.tsx  # /posts
posts/
├── $postId.tsx
└── new.tsx
```

### 4. Exclude Utilities with `-prefix`

Keep route directory clean:

```
routes/
├── dashboard.tsx
├── -helpers.ts      # Not a route
└── -types.ts        # Not a route
```

### 5. Prefer Explicit Names

Use descriptive names for clarity:

```
users/$userId.tsx        # ✅ Clear
users/$id.tsx            # ⚠️ Less clear
```

---

## Common Mistakes

### ❌ Forgetting `_layout` Prefix

```
settings/
└── layout.tsx     # Creates /settings/layout route (wrong!)
```

**Fix:** Use `_layout.tsx` for pathless layout.

### ❌ Using `.` in Param Names

```
posts/$post.id.tsx  # ❌ Invalid, creates /posts/:post with .id extension
```

**Fix:** Use `$postId.tsx` (no dots in param names).

### ❌ Route Group Without Parentheses

```
marketing/          # ❌ Creates /marketing path
  about.tsx         # Creates /marketing/about
```

**Fix:** Use `(marketing)/` for route group.

---

## Related

- [Main Skill](../SKILL.md) - Core TanStack Router patterns
- [router-routing-guide.md](router-routing-guide.md) - Comprehensive routing guide
- [code-splitting.md](code-splitting.md) - Lazy loading with `.lazy.tsx`

---

## References

- [File Naming Conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions)
- [File-Based Routing Guide](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Route Groups](https://tanstack.com/router/latest/docs/framework/react/guide/route-groups)
