# Query Patterns Reference

Extended collection of graph query patterns for common use cases.

## Basic Patterns

### Pattern 1: Simple Entity Query

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [
      { field: 'status', operator: '=', value: 'A' }
    ]
  },
  limit: 100
}
```

### Pattern 2: Multiple Filters (AND)

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [
      { field: 'status', operator: '=', value: 'A' },
      { field: 'class', operator: '=', value: 'domain' },
      { field: 'source', operator: '=', value: 'nuclei' }
    ]
  }
}
```

### Pattern 3: Sorted Results

```typescript
{
  node: {
    labels: ['Risk'],
    filters: [{ field: 'status', operator: '=', value: 'T' }]
  },
  orderBy: 'cvss',
  descending: true,
  limit: 50
}
```

### Pattern 4: Paginated Query

```typescript
{
  node: { labels: ['Asset'] },
  limit: 100,
  page: 0  // First page
}

// Next page
{
  node: { labels: ['Asset'] },
  limit: 100,
  page: 1  // Second page (skips first 100)
}
```

## Relationship Patterns

### Pattern 5: Assets with Risks

```typescript
{
  node: {
    labels: ['Asset'],
    relationships: [{
      label: 'HAS',
      target: {
        labels: ['Risk'],
        filters: [{ field: 'cvss', operator: '>=', value: 7 }]
      }
    }]
  }
}
```

### Pattern 6: Optional Relationship (LEFT JOIN)

Returns assets even if they have no matching attributes.

```typescript
{
  node: {
    labels: ['Asset'],
    relationships: [{
      label: 'HAS',
      target: { labels: ['Attribute'] },
      optional: true
    }]
  }
}
```

### Pattern 7: Multiple Relationship Types

```typescript
{
  node: {
    labels: ['Asset'],
    relationships: [{
      label: ['HAS', 'CONTAINS'],  // Either relationship type
      target: { labels: ['Risk'] }
    }]
  }
}
```

### Pattern 8: Variable-Length Path

Find assets connected through up to 3 hops.

```typescript
{
  node: {
    labels: ['Asset'],
    relationships: [{
      label: 'CONNECTED_TO',
      target: { labels: ['Asset'] },
      length: 3  // 1 to 3 hops
    }]
  }
}
```

### Pattern 9: NOT EXISTS (Negative Pattern)

Find assets WITHOUT any risks.

```typescript
{
  node: {
    labels: ['Asset'],
    relationships: [{
      label: 'HAS',
      target: { labels: ['Risk'] },
      not_exists: true
    }]
  }
}
```

## Compound Filter Patterns

### Pattern 10: OR Filter

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [{
      operator: 'OR',
      value: [
        { field: 'class', operator: '=', value: 'domain' },
        { field: 'class', operator: '=', value: 'ipv4' },
        { field: 'class', operator: '=', value: 'cidr' }
      ]
    }]
  }
}
```

### Pattern 11: AND + OR Combined

```typescript
{
  node: {
    labels: ['Risk'],
    filters: [
      { field: 'status', operator: '=', value: 'T' },
      {
        operator: 'OR',
        value: [
          { field: 'cvss', operator: '>=', value: 9 },
          { field: 'kev', operator: '=', value: true },
          { field: 'exploit', operator: '=', value: true }
        ]
      }
    ]
  }
}
```

### Pattern 12: Negated Filter

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [{
      field: 'source',
      operator: '=',
      value: 'manual',
      not: true  // NOT source = 'manual'
    }]
  }
}
```

## Advanced Patterns

### Pattern 13: Aliased Nodes for Complex Filters

```typescript
{
  node: {
    alias: 'asset',
    labels: ['Asset'],
    relationships: [{
      label: 'HAS',
      target: {
        alias: 'risk',
        labels: ['Risk']
      }
    }]
  },
  filters: [
    { alias: 'asset', field: 'status', operator: '=', value: 'A' },
    { alias: 'risk', field: 'cvss', operator: '>=', value: 7 }
  ]
}
```

### Pattern 14: Cloud Resource Query

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [
      { field: 'cloudService', operator: '=', value: 'aws' },
      { field: 'cloudAccount', operator: 'IS NOT NULL', value: null }
    ]
  }
}
```

### Pattern 15: Text Search

```typescript
{
  node: {
    labels: ['Asset'],
    filters: [
      { field: 'dns', operator: 'CONTAINS', value: 'api' },
      { field: 'dns', operator: 'ENDS WITH', value: '.com' }
    ]
  }
}
```

## Frontend Hook Examples

### useMy with Graph Query

```typescript
const { data, fetchNextPage, hasNextPage, isLoading } = useMy({
  resource: 'asset',
  query: {
    node: {
      labels: ['Asset'],
      filters: [
        { field: 'status', operator: '=', value: 'A' },
        { field: 'class', operator: '=', value: 'domain' }
      ]
    },
    limit: 100,
    orderBy: 'created',
    descending: true
  }
});

// Handle pagination
useEffect(() => {
  if (hasNextPage && shouldLoadMore) {
    fetchNextPage();
  }
}, [hasNextPage, shouldLoadMore]);
```

### useGraphQuery for Complex Relationships

```typescript
const { data } = useGraphQuery({
  query: {
    node: {
      labels: ['Asset'],
      filters: [{ field: 'class', operator: '=', value: 'domain' }],
      relationships: [{
        label: 'HAS',
        target: {
          labels: ['Risk'],
          filters: [{ field: 'cvss', operator: '>=', value: 9 }]
        }
      }]
    },
    limit: 50
  },
  enabled: !!selectedDomain
});
```
