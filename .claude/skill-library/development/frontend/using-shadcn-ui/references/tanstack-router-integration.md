# TanStack Router Integration with shadcn/ui

Complete guide for integrating shadcn/ui components with TanStack Router for type-safe, file-based routing in React applications.

## Overview

TanStack Router is a fully type-safe router for React with built-in caching, first-class search-param APIs, and client-side cache integration. When combined with shadcn/ui, it provides a powerful foundation for modern React applications.

**Official Documentation:**
- [shadcn/ui TanStack Router Installation](https://ui.shadcn.com/docs/installation/tanstack-router)
- [TanStack Router Docs](https://tanstack.com/router/latest/docs/framework/react/overview)
- [How to Integrate Shadcn/ui](https://tanstack.com/router/latest/docs/framework/react/how-to/integrate-shadcn-ui)

## Installation

### 1. Create New Project with TanStack Router

```bash
# Scaffold project with file-based routing
npx create-tsrouter-app@latest my-app --template file-router
cd my-app

# Initialize shadcn/ui
npx shadcn@latest init
```

### 2. Add to Existing Project

```bash
# Install TanStack Router
npm install @tanstack/react-router

# Install file-based routing plugin (Vite)
npm install -D @tanstack/router-vite-plugin

# Initialize shadcn/ui
npx shadcn@latest init
```

## File-Based Routing Structure

TanStack Router uses file-based routing similar to Next.js:

```typescript
src/
├── routes/              // Route definitions
│   ├── __root.tsx      // Root layout (wraps all routes)
│   ├── index.tsx       // Home page (/)
│   ├── about.tsx       // About page (/about)
│   ├── posts/          // Posts section
│   │   ├── index.tsx   // Posts list (/posts)
│   │   └── $postId.tsx // Post detail (/posts/:postId)
│   ├── dashboard/      // Dashboard section
│   │   ├── index.tsx   // Dashboard home
│   │   ├── settings.tsx
│   │   └── profile.tsx
│   └── _layout/        // Pathless layout (groups routes)
│       ├── route-a.tsx
│       └── route-b.tsx
```

## Core Patterns

### Root Layout with shadcn/ui Components

```typescript
// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink
} from '@/components/ui/navigation-menu'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation with shadcn/ui */}
      <header className="border-b">
        <div className="container mx-auto p-4">
          <NavigationMenu>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink>Home</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/posts">
                <NavigationMenuLink>Posts</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/dashboard">
                <NavigationMenuLink>Dashboard</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenu>
        </div>
      </header>

      {/* Main content area - child routes render here */}
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>

      {/* Global toast notifications */}
      <Toaster />
    </div>
  )
}
```

### Page Route with Data Loading

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Type-safe data fetching
async function fetchPost(postId: string) {
  const response = await fetch(`https://api.example.com/posts/${postId}`)
  if (!response.ok) throw new Error('Failed to fetch post')
  return response.json()
}

export const Route = createFileRoute('/posts/$postId')({
  // Data loader - runs before component renders
  loader: async ({ params }) => {
    return await fetchPost(params.postId)
  },

  // Loading component (shown during data fetch)
  pendingComponent: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  ),

  // Error component (shown on error)
  errorComponent: ({ error }) => (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Error Loading Post</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{error.message}</p>
      </CardContent>
    </Card>
  ),

  // Main component
  component: PostDetail,
})

function PostDetail() {
  const post = Route.useLoaderData()
  const navigate = Route.useNavigate()

  const handleDelete = async () => {
    try {
      await deletePost(post.id)
      toast.success('Post deleted successfully')
      navigate({ to: '/posts' })
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{post.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{post.content}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate({ to: '/posts/$postId/edit', params: { postId: post.id } })}>
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Dashboard Layout Pattern

```typescript
// src/routes/dashboard/_layout.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarProvider
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/_layout')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <Link to="/dashboard">
                <Button variant="ghost" className="w-full justify-start">
                  Overview
                </Button>
              </Link>
              <Link to="/dashboard/settings">
                <Button variant="ghost" className="w-full justify-start">
                  Settings
                </Button>
              </Link>
              <Link to="/dashboard/profile">
                <Button variant="ghost" className="w-full justify-start">
                  Profile
                </Button>
              </Link>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
```

### Form with Navigation

```typescript
// src/routes/posts/create.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
})

type PostFormData = z.infer<typeof postSchema>

export const Route = createFileRoute('/posts/create')({
  component: CreatePost,
})

function CreatePost() {
  const navigate = Route.useNavigate()

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  })

  const onSubmit = async (data: PostFormData) => {
    try {
      const response = await createPost(data)
      toast.success('Post created successfully')
      navigate({ to: '/posts/$postId', params: { postId: response.id } })
    } catch (error) {
      toast.error('Failed to create post')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter post title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter post content"
                    className="min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit">Create Post</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/posts' })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

## Common Issues & Solutions

### Issue: Sheet Component Animation Problems

**Problem:** shadcn/ui Sheet components can have animation issues when used with TanStack Router.

**Solution:** Use a wrapper component:

```typescript
// src/components/router-sheet.tsx
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useEffect, useState } from 'react'

export function RouterSheet({ children, trigger, ...props }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Sheet {...props}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>{children}</SheetContent>
    </Sheet>
  )
}
```

### Issue: Type-Safe Navigation with Dynamic Routes

**Problem:** Maintaining type safety when navigating to routes with parameters.

**Solution:** Use TanStack Router's Link component with type inference:

```typescript
import { Link } from '@tanstack/react-router'

// ✅ Type-safe - params are inferred
<Link
  to="/posts/$postId"
  params={{ postId: '123' }}
>
  View Post
</Link>

// ❌ Not type-safe
<a href={`/posts/${postId}`}>View Post</a>
```

## Best Practices

### 1. Use Type-Safe Navigation

Always use TanStack Router's `Link` component or `navigate` function for type-safe routing:

```typescript
// ✅ Good
import { Link } from '@tanstack/react-router'
<Link to="/posts/$postId" params={{ postId: post.id }}>
  {post.title}
</Link>

// ❌ Bad
<a href={`/posts/${post.id}`}>{post.title}</a>
```

### 2. Leverage Data Loaders

Use loaders for data fetching to enable prefetching and caching:

```typescript
export const Route = createFileRoute('/posts')({
  loader: async () => {
    return await fetchPosts()
  },
  component: Posts,
})
```

### 3. Implement Error Boundaries

Always provide error components for graceful error handling:

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: fetchPost,
  errorComponent: ({ error }) => (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  ),
  component: PostDetail,
})
```

### 4. Use Skeleton Loading States

Provide pending components with shadcn/ui Skeleton for better UX:

```typescript
export const Route = createFileRoute('/posts')({
  loader: fetchPosts,
  pendingComponent: () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  ),
  component: Posts,
})
```

## Integration with TanStack Query

Combine TanStack Router and TanStack Query for optimal data management:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  if (isLoading) return <Skeleton className="h-48" />

  return (
    <div className="space-y-4">
      {data.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
```

## Related Resources

- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [File-Based Routing Guide](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Type-Safe Navigation](https://tanstack.com/router/latest/docs/framework/react/guide/navigation)
