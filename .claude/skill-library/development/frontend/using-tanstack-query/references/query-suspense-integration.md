# Suspense Integration

## useSuspenseQuery

Suspense-enabled query hook where data is guaranteed defined:

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";

function TodoList() {
  // data is GUARANTEED defined - no isPending check needed
  const { data } = useSuspenseQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  return (
    <ul>
      {data.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}

// Parent with Suspense boundary
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <TodoList />
    </Suspense>
  );
}
```

## QueryErrorResetBoundary

Provides error recovery for Suspense queries:

```tsx
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div>
              Something went wrong!
              <button onClick={resetErrorBoundary}>Retry</button>
            </div>
          )}
        >
          <Suspense fallback={<Loading />}>
            <TodoList />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

## useSuspenseQueries - Parallel Fetching

**Critical:** Multiple `useSuspenseQuery` hooks create request waterfalls. Use `useSuspenseQueries` for parallel:

```tsx
// ❌ WATERFALL - Sequential fetching
function Bad() {
  const { data: users } = useSuspenseQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const { data: teams } = useSuspenseQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  // teams waits for users to complete
}

// ✅ PARALLEL - Concurrent fetching
function Good() {
  const [usersQuery, teamsQuery] = useSuspenseQueries({
    queries: [
      { queryKey: ["users"], queryFn: fetchUsers },
      { queryKey: ["teams"], queryFn: fetchTeams },
    ],
  });
  // Both fetch simultaneously
}
```

## Benefits

- **TypeScript**: Data is guaranteed defined (no `| undefined`)
- **Cleaner components**: No loading/error checks in component
- **Declarative**: React handles loading states via Suspense boundaries
- **Composable**: Nest Suspense boundaries for granular loading states

## When to Use

| Use Case                     | Hook                               |
| ---------------------------- | ---------------------------------- |
| Single query with Suspense   | `useSuspenseQuery`                 |
| Multiple parallel queries    | `useSuspenseQueries`               |
| Infinite query with Suspense | `useSuspenseInfiniteQuery`         |
| Traditional loading states   | `useQuery` (keep isPending checks) |
