# Complete Reference File from Research - Example

**Scenario:** Creating `advanced-patterns.md` for a TanStack Query skill after research

## Source Files Available

- `SYNTHESIS.md` - Cross-interpretation patterns section
- `github-tanstack-examples.md` - Open-source implementations
- `codebase-chariot-hooks.md` - Local usage patterns

## Resulting advanced-patterns.md (78 lines)

```markdown
# Advanced TanStack Query Patterns

**Source:** Research conducted 2026-01-12

## Optimistic Updates with Rollback

**Pattern from github-tanstack-examples.md:**

\`\`\`typescript
const mutation = useMutation({
mutationFn: updateUser,
onMutate: async (newUser) => {
// Cancel outgoing refetches
await queryClient.cancelQueries({ queryKey: ['users'] })

    // Snapshot previous value
    const previousUsers = queryClient.getQueryData(['users'])

    // Optimistically update
    queryClient.setQueryData(['users'], (old) => [...old, newUser])

    return { previousUsers }

},
onError: (err, newUser, context) => {
// Rollback on error
queryClient.setQueryData(['users'], context.previousUsers)
},
})
\`\`\`

**Used in codebase:** `modules/chariot/ui/src/mutations/useUpdateAsset.ts:45-67`

## Dependent Queries

**Pattern from SYNTHESIS.md Cross-Interpretation Patterns:**

\`\`\`typescript
const { data: user } = useQuery({
queryKey: ['user', userId],
queryFn: () => fetchUser(userId),
})

const { data: projects } = useQuery({
queryKey: ['projects', user?.id],
queryFn: () => fetchProjects(user.id),
enabled: !!user?.id, // Only run when user exists
})
\`\`\`

**Best practice (from web research):** Always use `enabled` option to prevent unnecessary requests.

## Infinite Queries for Pagination

**Pattern from github-tanstack-examples.md:**

\`\`\`typescript
const {
data,
fetchNextPage,
hasNextPage,
isFetchingNextPage,
} = useInfiniteQuery({
queryKey: ['projects'],
queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
})
\`\`\`

**Performance note (from SYNTHESIS.md):** Use `maxPages` option to limit memory usage for very long lists.

## Prefetching Strategies

**Pattern from codebase-chariot-hooks.md:**

\`\`\`typescript
// Prefetch on hover (modules/chariot/ui/src/components/AssetCard.tsx)
<Card
onMouseEnter={() => {
queryClient.prefetchQuery({
queryKey: ['asset', asset.id],
queryFn: () => fetchAssetDetails(asset.id),
})
}}
/>
\`\`\`

**When to use (from web research):** Prefetch for likely next actions, but avoid prefetching everything (wastes bandwidth).

## Related Patterns

- [TanStack Query Official Docs](https://tanstack.com/query/v5/docs) - Latest API
- [Codebase hooks](../../modules/chariot/ui/src/hooks/) - Local implementations
```

## Key Characteristics of This Example

- 78 lines (well over 50-line minimum)
- Cites specific research sources ("from github-tanstack-examples.md")
- References actual codebase files with locations
- Includes real code examples (not placeholders)
- Provides context for when to use each pattern
