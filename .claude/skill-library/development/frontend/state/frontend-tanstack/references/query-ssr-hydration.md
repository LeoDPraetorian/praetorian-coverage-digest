# SSR and Hydration

## Core Principle

**Create QueryClient per-request** to avoid cache sharing between users.

## Next.js App Router Pattern

### 1. Client Provider

```tsx
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // Avoid immediate refetch
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 2. Server Component with Prefetch

```tsx
// app/posts/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function PostsPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

### 3. Client Component

```tsx
// app/posts/posts-list.tsx
'use client'
import { useQuery } from '@tanstack/react-query'

export function PostsList() {
  // Data already hydrated - no loading flash on first render
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  return <ul>{data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## Pages Router Pattern

```tsx
// pages/posts.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export async function getStaticProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

export default function PostsPage({ dehydratedState }) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `dehydrate(queryClient)` | Serialize cache state for transfer |
| `HydrationBoundary` | Restore cache state on client |
| `prefetchQuery` | Fetch data on server before render |

## Important Notes

1. **Fresh QueryClient per request** - Never share between users
2. **Set staleTime > 0** - Prevents immediate refetch on client
3. **Match query keys** - Server and client must use identical keys
4. **Error handling** - Prefetch errors won't throw; handle on client
