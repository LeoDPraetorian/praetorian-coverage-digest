# Filter Operators Reference

Complete reference for all filter operators available in Chariot graph queries.

## Operator Details

### Equality: `=`

Exact match comparison.

```typescript
{ field: 'status', operator: '=', value: 'A' }
{ field: 'class', operator: '=', value: 'domain' }
{ field: 'cvss', operator: '=', value: 9.8 }
```

### Contains: `CONTAINS`

Case-insensitive substring match.

```typescript
{ field: 'name', operator: 'CONTAINS', value: 'prod' }
{ field: 'dns', operator: 'CONTAINS', value: 'api' }
```

### Comparison: `<`, `<=`, `>`, `>=`

Numeric and date comparisons.

```typescript
{ field: 'cvss', operator: '>=', value: 7 }
{ field: 'epss', operator: '>', value: 0.5 }
{ field: 'created', operator: '>=', value: '2024-01-01' }
```

### String Prefix/Suffix: `STARTS WITH`, `ENDS WITH`

```typescript
{ field: 'dns', operator: 'STARTS WITH', value: 'api.' }
{ field: 'dns', operator: 'ENDS WITH', value: '.com' }
{ field: 'email', operator: 'ENDS WITH', value: '@company.com' }
```

### Array Membership: `IN`

Check if value is in a list.

```typescript
{ field: 'class', operator: 'IN', value: ['ipv4', 'domain', 'cidr'] }
{ field: 'status', operator: 'IN', value: ['A', 'T'] }
{ field: 'source', operator: 'IN', value: ['nuclei', 'burp'] }
```

### Null Checks: `IS NULL`, `IS NOT NULL`

Check field existence.

```typescript
{ field: 'cvss', operator: 'IS NOT NULL', value: null }
{ field: 'exploit', operator: 'IS NULL', value: null }
```

### Logical: `OR`, `AND`

Combine multiple filters.

**OR Example:**

```typescript
{
  operator: 'OR',
  value: [
    { field: 'class', operator: '=', value: 'domain' },
    { field: 'class', operator: '=', value: 'ipv4' }
  ]
}
```

**AND with OR:**

```typescript
// Status is active AND (high CVSS OR known exploited)
filters: [
  { field: "status", operator: "=", value: "T" },
  {
    operator: "OR",
    value: [
      { field: "cvss", operator: ">=", value: 9 },
      { field: "kev", operator: "=", value: true },
    ],
  },
];
```

### Negation: `not` flag

Negate any filter.

```typescript
{ field: 'source', operator: '=', value: 'manual', not: true }
// Equivalent to: source != 'manual'

{ field: 'class', operator: 'IN', value: ['internal'], not: true }
// Equivalent to: class NOT IN ['internal']
```

## Operator Source

Operators are defined in:

```
modules/tabularium/pkg/model/filters/filter.go:81-96
```

```go
const (
    OperatorEqual              = "="
    OperatorContains           = "CONTAINS"
    OperatorLike               = "LIKE"
    OperatorLessThan           = "<"
    OperatorLessThanEqualTo    = "<="
    OperatorGreaterThan        = ">"
    OperatorGreaterThanEqualTo = ">="
    OperatorStartsWith         = "STARTS WITH"
    OperatorEndsWith           = "ENDS WITH"
    OperatorOr                 = "OR"
    OperatorAnd                = "AND"
    OperatorIn                 = "IN"
    OperatorIsNotNull          = "IS NOT NULL"
    OperatorIsNull             = "IS NULL"
)
```
