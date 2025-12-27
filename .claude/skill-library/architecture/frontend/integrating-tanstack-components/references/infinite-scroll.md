# Infinite Scroll Patterns

**Integrating useInfiniteQuery with TanStack Virtual for infinite scrolling tables and lists.**

## Overview

Infinite scroll combines `useInfiniteQuery` (pagination) with `useVirtualizer` (virtualization) to efficiently render and load large datasets as users scroll.

## Basic Infinite Query + Virtual

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

function InfiniteList() {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam }) => fetchItems({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Flatten pages into single array
  const allItems = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })

  // Fetch more when approaching end
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems()
    const lastItem = virtualItems[virtualItems.length - 1]

    if (!lastItem) return

    if (
      lastItem.index >= allItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    allItems.length,
  ])

  return (
    <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allItems.length - 1
          const item = allItems[virtualRow.index]

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                hasNextPage ? (
                  <div>Loading more...</div>
                ) : (
                  <div>Nothing more to load</div>
                )
              ) : (
                <ItemRow item={item} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Infinite Table with Query + Table + Virtual

```typescript
function InfiniteTable() {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['users'],
    queryFn: ({ pageParam = 0 }) =>
      fetchUsers({ offset: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length * 50 : undefined
    },
  })

  const allUsers = useMemo(
    () => data?.pages.flatMap((page) => page.users) ?? [],
    [data]
  )

  const table = useReactTable({
    data: allUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  // Auto-fetch when scrolling near bottom
  useEffect(() => {
    const [lastVirtualItem] = [...rowVirtualizer.getVirtualItems()].reverse()

    if (!lastVirtualItem) return

    if (
      lastVirtualItem.index >= rows.length - 10 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [rowVirtualizer.getVirtualItems(), rows.length, hasNextPage, isFetchingNextPage])

  return (
    <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
      <table style={{ width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
          {/* Headers */}
        </thead>
      </table>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: virtualRow.size,
                width: '100%',
              }}
            >
              {/* Row content */}
            </div>
          )
        })}
        {isFetchingNextPage && (
          <div className="text-center py-4">Loading more...</div>
        )}
      </div>
    </div>
  )
}
```

## Bidirectional Infinite Scroll

```typescript
function BidirectionalInfiniteList() {
  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery({
    queryKey: ['messages'],
    queryFn: ({ pageParam }) => fetchMessages(pageParam),
    initialPageParam: { cursor: undefined, direction: 'forward' },
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ? { cursor: lastPage.nextCursor, direction: 'forward' } : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.prevCursor ? { cursor: firstPage.prevCursor, direction: 'backward' } : undefined,
  })

  const allMessages = useMemo(
    () => data?.pages.flatMap((page) => page.messages) ?? [],
    [data]
  )

  const rowVirtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  // Fetch previous when scrolling to top
  useEffect(() => {
    const firstItem = rowVirtualizer.getVirtualItems()[0]
    if (firstItem?.index === 0 && hasPreviousPage && !isFetchingPreviousPage) {
      fetchPreviousPage()
    }
  }, [rowVirtualizer.getVirtualItems()])

  // Fetch next when scrolling to bottom
  useEffect(() => {
    const lastItem = [...rowVirtualizer.getVirtualItems()].pop()
    if (
      lastItem?.index >= allMessages.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [rowVirtualizer.getVirtualItems()])

  return (/* Render list */)
}
```

## Performance Tips

### Prefetch Next Page

```typescript
// Prefetch when 80% through current data
useEffect(() => {
  const virtualItems = rowVirtualizer.getVirtualItems()
  const lastItem = virtualItems[virtualItems.length - 1]

  if (!lastItem) return

  const threshold = Math.floor(allItems.length * 0.8)
  if (lastItem.index >= threshold && hasNextPage && !isFetchingNextPage) {
    fetchNextPage()
  }
}, [/* deps */])
```

### Stable Row Keys

```typescript
// Use stable IDs, not array index
{rowVirtualizer.getVirtualItems().map((virtualRow) => {
  const item = allItems[virtualRow.index]
  return (
    <div key={item.id}> {/* ✅ Stable ID */}
      {/* Content */}
    </div>
  )
})}
```

## Related

- [Table + Virtual Integration](table-virtual-integration.md)
- [Server-Side Patterns](server-side-patterns.md)
