# Integration Patterns for Branded Types

**How to integrate branded types with existing Chariot code at system boundaries.**

## API Boundary Integration

### Express Routes

```typescript
// Pattern 1: Cast at boundary (quick, less safe)
app.get("/api/assets/:key", (req, res) => {
  const key = req.params.key as AssetKey;
  const asset = getAsset(key);
  res.json(asset);
});

// Pattern 2: Validate at boundary (recommended)
app.get("/api/assets/:key", (req, res) => {
  try {
    const key = createAssetKey(req.params.key);
    const asset = getAsset(key);
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pattern 3: Middleware validation
const validateAssetKey = (req, res, next) => {
  try {
    req.brandedKey = createAssetKey(req.params.key);
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid asset key" });
  }
};

app.get("/api/assets/:key", validateAssetKey, (req, res) => {
  const asset = getAsset(req.brandedKey);
  res.json(asset);
});
```

### GraphQL Resolvers

```typescript
// Define custom scalar for branded type
const AssetKeyScalar = new GraphQLScalarType({
  name: "AssetKey",
  description: "Branded asset key",

  // Serialize: Brand to primitive for transport
  serialize(value: AssetKey): string {
    return value as string;
  },

  // Parse from client: Primitive to brand
  parseValue(value: string): AssetKey {
    return createAssetKey(value);
  },

  // Parse from query literals
  parseLiteral(ast): AssetKey {
    if (ast.kind === Kind.STRING) {
      return createAssetKey(ast.value);
    }
    throw new Error("AssetKey must be a string");
  },
});

// Use in schema
const typeDefs = gql`
  scalar AssetKey

  type Asset {
    key: AssetKey!
    name: String!
  }

  type Query {
    asset(key: AssetKey!): Asset
  }
`;

// Resolvers use branded types internally
const resolvers = {
  AssetKey: AssetKeyScalar,

  Query: {
    asset: (_: unknown, { key }: { key: AssetKey }) => {
      // key is already branded and validated
      return getAsset(key);
    },
  },

  Asset: {
    key: (asset: Asset): AssetKey => asset.key, // Already branded
  },
};
```

## Database Layer Integration

### DynamoDB

```typescript
// DynamoDB returns generic primitives
interface DynamoDBAsset {
  pk: string; // Partition key
  sk: string; // Sort key
  name: string;
  status: string;
}

// Transform to domain types with branded keys
function toDomainAsset(item: DynamoDBAsset): Asset {
  return {
    key: item.pk as AssetKey, // Cast at data layer
    name: item.name,
    status: item.status,
  };
}

// Or validate format during transformation
function toDomainAssetSafe(item: DynamoDBAsset): Asset {
  return {
    key: createAssetKey(item.pk), // Validate format
    name: item.name,
    status: item.status,
  };
}

// Reverse: Domain to DynamoDB
function toDynamoDBAsset(asset: Asset): DynamoDBAsset {
  return {
    pk: asset.key as string, // Cast back to primitive
    sk: `ASSET#${asset.key}`,
    name: asset.name,
    status: asset.status,
  };
}
```

### Neo4j Graph Queries

```typescript
// Chariot uses Neo4j for graph relationships
interface GraphQueryResult {
  nodes: Array<{
    key: string;
    labels: string[];
  }>;
}

// Transform graph results to domain types
function parseGraphAsset(node: GraphQueryResult["nodes"][0]): Asset {
  if (!node.labels.includes("Asset")) {
    throw new Error("Node is not an Asset");
  }

  return {
    key: createAssetKey(node.key), // Validate + brand
    // ... other fields
  };
}

// Query with branded types
async function getRelatedAssets(key: AssetKey): Promise<Asset[]> {
  const query = `
    MATCH (a:Asset {key: $key})-[:RELATES_TO]->(related:Asset)
    RETURN related
  `;

  const result = await neo4j.run(query, { key: key as string });
  return result.records.map((r) => parseGraphAsset(r.get("related")));
}
```

## TanStack Query Integration

```typescript
// Query keys use branded types
const assetQueries = {
  all: ["assets"] as const,
  detail: (key: AssetKey) => ["assets", key] as const,
  related: (key: AssetKey) => ["assets", key, "related"] as const,
};

// Query functions receive branded keys
function useAsset(key: AssetKey) {
  return useQuery({
    queryKey: assetQueries.detail(key),
    queryFn: () => getAsset(key),
  });
}

// Mutations validate at boundary
function useUpdateAsset() {
  return useMutation({
    mutationFn: ({ key, updates }: { key: string; updates: Partial<Asset> }) => {
      const brandedKey = createAssetKey(key); // Validate
      return updateAsset(brandedKey, updates);
    },
  });
}
```

## React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod schema with branded type validation
const assetFormSchema = z.object({
  key: z.string().refine(
    (val) => {
      try {
        createAssetKey(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid asset key format' }
  ),
  name: z.string().min(1),
});

type AssetForm = z.infer<typeof assetFormSchema>;

// Form component
function AssetEditForm({ asset }: { asset: Asset }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetForm>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      key: asset.key as string,  // Cast for form
      name: asset.name,
    },
  });

  const onSubmit = (data: AssetForm) => {
    const brandedKey = createAssetKey(data.key);  // Re-brand after validation
    updateAsset(brandedKey, { name: data.name });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('key')} />
      {errors.key && <span>{errors.key.message}</span>}
      <input {...register('name')} />
      <button type="submit">Save</button>
    </form>
  );
}
```

## localStorage Integration

```typescript
// Serialize branded types for storage
function saveRecentAssets(keys: AssetKey[]) {
  const serialized = keys.map((k) => k as string);
  localStorage.setItem("recentAssets", JSON.stringify(serialized));
}

// Deserialize with validation
function loadRecentAssets(): AssetKey[] {
  const stored = localStorage.getItem("recentAssets");
  if (!stored) return [];

  const parsed = JSON.parse(stored) as string[];
  return parsed.map((k) => createAssetKey(k)); // Validate on load
}
```

## Migration Strategy

### Phase 1: Add Branded Types (Non-Breaking)

```typescript
// Add branded types alongside existing string types
type AssetKey = Brand<string, 'AssetKey'>;
type RiskKey = Brand<string, 'RiskKey'>;

// Update type definitions (backward compatible)
interface Asset {
  key: AssetKey | string;  // Accept both during migration
}

// New functions use branded types
function getAssetBranded(key: AssetKey): Asset { ... }

// Old functions still work
function getAsset(key: string): Asset {
  return getAssetBranded(key as AssetKey);
}
```

### Phase 2: Migrate Call Sites

```typescript
// Update call sites one module at a time
const asset = getAssetBranded(createAssetKey("asset#123"));
```

### Phase 3: Remove Old API

```typescript
// Once all call sites migrated, remove string overloads
interface Asset {
  key: AssetKey;  // Remove `| string`
}

function getAsset(key: AssetKey): Asset { ... }  // Remove old version
```

## Testing Branded Types

```typescript
// Test that brands prevent mixing
describe("Branded types", () => {
  it("should prevent mixing Asset and Risk keys", () => {
    const assetKey = createAssetKey("asset#123");
    const riskKey = createRiskKey("risk#456");

    // @ts-expect-error - Should not compile
    const asset = getAsset(riskKey);
  });

  it("should validate format at boundaries", () => {
    expect(() => createAssetKey("invalid")).toThrow();
    expect(() => createAssetKey("asset#123")).not.toThrow();
  });
});
```
