# GraphQL Optimization Patterns

**Field selection and query optimization for LLM-consumed GraphQL APIs.**

## Overview

GraphQL's field selection makes it naturally suited for token optimization. This reference covers patterns for designing GraphQL schemas and queries optimized for LLM consumption.

## Pattern 1: Dynamic Field Selection

```typescript
interface QueryOptions {
  fields: string[];
  limit?: number;
}

async function buildGraphQLQuery(options: QueryOptions) {
  const { fields, limit = 20 } = options;

  return `
    query GetAssets {
      assets(limit: ${limit}) {
        ${fields.join("\n        ")}
      }
    }
  `;
}

// Usage
const query = buildGraphQLQuery({
  fields: ["id", "name", "status"],
  limit: 20,
});
```

## Pattern 2: Fragment-Based Response Shaping

```typescript
// Define minimal and detailed fragments
const MINIMAL_ASSET = `
  fragment MinimalAsset on Asset {
    id
    name
    status
  }
`;

const DETAILED_ASSET = `
  fragment DetailedAsset on Asset {
    ...MinimalAsset
    description
    owner {
      id
      name
    }
  }
`;

// Use based on agent needs
const query = useMinimal
  ? `query { assets { ...MinimalAsset } } ${MINIMAL_ASSET}`
  : `query { assets { ...DetailedAsset } } ${DETAILED_ASSET}`;
```

## Pattern 3: Pagination with Token Awareness

```typescript
interface PaginationParams {
  maxTokens?: number;
  itemsPerPage?: number;
}

async function paginateQuery(params: PaginationParams) {
  const { maxTokens = 2000, itemsPerPage = 20 } = params;

  const query = `
    query GetAssets($limit: Int!) {
      assets(limit: $limit) {
        id
        name
        status
      }
      _meta {
        total
        estimatedTokensPerItem
      }
    }
  `;

  // Calculate safe page size
  const result = await client.query(query, { limit: 1 });
  const tokensPerItem = result._meta.estimatedTokensPerItem;
  const safeLimit = Math.min(itemsPerPage, Math.floor(maxTokens / tokensPerItem));

  return client.query(query, { limit: safeLimit });
}
```

## Pattern 4: Resolver-Level Filtering

```typescript
// In GraphQL resolver
const resolvers = {
  Query: {
    assets: async (_, { limit = 20 }, context) => {
      const assets = await context.db.getAssets();

      // Filter at resolver level for LLM consumption
      return assets.slice(0, limit).map((asset) => ({
        id: asset.id,
        name: asset.name,
        status: asset.status,
        // Omit internal fields
        _meta: {
          estimatedTokens: estimateTokens(asset),
        },
      }));
    },
  },
};
```

## Schema Design for Token Efficiency

```graphql
type Asset {
  # Essential fields (always include)
  id: ID!
  name: String!
  status: String!

  # Optional fields (only query when needed)
  description: String
  metadata: JSON
  owner: User

  # Token transparency
  _meta: ResponseMeta
}

type ResponseMeta {
  estimatedTokens: Int!
  truncated: Boolean
}

type Query {
  # Include limit as required parameter
  assets(limit: Int! = 20): [Asset!]!

  # Progressive disclosure queries
  assetSummary: AssetSummary!
  assetDetails(ids: [ID!]!): [Asset!]!
}
```

## Integration with Backend APIs

When designing GraphQL APIs for LLM consumption:

1. Make `limit` a required parameter with sensible defaults (≤20)
2. Use fragments for minimal vs detailed responses
3. Add `_meta` fields with token estimates
4. Filter internal fields at resolver level
5. Support field selection via arguments or fragments

## Checklist

- [ ] All list queries have `limit` parameter (default ≤20)
- [ ] Fragments defined for minimal and detailed responses
- [ ] `_meta` field includes token estimates
- [ ] Resolvers filter internal fields
- [ ] Schema documented with token efficiency notes

## Related

- Parent: [optimizing-llm-api-responses](../SKILL.md)
- See also: `implementing-graphql-clients` library skill
