# TypeScript Refactoring Examples

Real-world refactorings reducing cyclomatic complexity in TypeScript/React code.

## Example 1: React Component with Conditional Rendering

### Before (Complexity: 9)

```typescript
function AssetTable({ assets, filters, user }: Props) {
  if (!assets) {
    return <div>Loading...</div>;
  }

  if (assets.length === 0) {
    return <EmptyState />;
  }

  if (!user.hasPermission('view_assets')) {
    return <AccessDenied />;
  }

  if (filters.type) {
    if (filters.type === 'domain') {
      return <DomainTable assets={assets.filter(a => a.type === 'domain')} />;
    } else if (filters.type === 'ip') {
      return <IPTable assets={assets.filter(a => a.type === 'ip')} />;
    } else if (filters.type === 'cloud') {
      if (filters.cloudProvider) {
        return <CloudTable
          assets={assets.filter(a =>
            a.type === 'cloud' && a.cloudProvider === filters.cloudProvider
          )}
        />;
      }
    }
  }

  return <GenericAssetTable assets={assets} />;
}
```

### After (Complexity: 2 per function, max 3)

```typescript
function AssetTable({ assets, filters, user }: Props) {
  if (!assets) return <div>Loading...</div>;
  if (assets.length === 0) return <EmptyState />;
  if (!user.hasPermission('view_assets')) return <AccessDenied />;

  const filteredAssets = applyFilters(assets, filters);
  const TableComponent = getTableComponent(filters.type);

  return <TableComponent assets={filteredAssets} />;
}

function applyFilters(assets: Asset[], filters: Filters): Asset[] {
  if (!filters.type) return assets;

  const filtered = assets.filter(a => a.type === filters.type);

  if (filters.type === 'cloud' && filters.cloudProvider) {
    return filtered.filter(a => a.cloudProvider === filters.cloudProvider);
  }

  return filtered;
}
// Complexity: 3

const tableComponents: Record<string, React.ComponentType<TableProps>> = {
  domain: DomainTable,
  ip: IPTable,
  cloud: CloudTable,
};

function getTableComponent(type?: string): React.ComponentType<TableProps> {
  return type && tableComponents[type] ? tableComponents[type] : GenericAssetTable;
}
// Complexity: 1
```

**Improvements:**
- Main component: 9 → 2
- Clear separation: guards, filtering, rendering
- Testable in isolation
- Easy to add new asset types

---

## Example 2: Data Fetching Hook

### Before (Complexity: 11)

```typescript
function useAssetData(assetId: string) {
  const [data, setData] = useState<Asset | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setError(new Error('No asset ID'));
      return;
    }

    setLoading(true);

    fetch(`/api/assets/${assetId}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Asset not found');
          } else if (res.status === 403) {
            throw new Error('Access denied');
          } else if (res.status >= 500) {
            throw new Error('Server error');
          } else {
            throw new Error('Unknown error');
          }
        }
        return res.json();
      })
      .then(data => {
        if (data.status === 'archived') {
          setError(new Error('Asset archived'));
        } else {
          setData(data);
        }
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assetId]);

  return { data, error, loading };
}
```

### After (Complexity: 2)

```typescript
function useAssetData(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!assetId,
  });
}

async function fetchAsset(assetId: string): Promise<Asset> {
  const res = await fetch(`/api/assets/${assetId}`);

  if (!res.ok) {
    throw handleFetchError(res);
  }

  const data = await res.json();

  if (data.status === 'archived') {
    throw new Error('Asset archived');
  }

  return data;
}
// Complexity: 2

function handleFetchError(res: Response): Error {
  const errorMessages: Record<number, string> = {
    404: 'Asset not found',
    403: 'Access denied',
  };

  return new Error(
    errorMessages[res.status] ||
    (res.status >= 500 ? 'Server error' : 'Unknown error')
  );
}
// Complexity: 1
```

**Improvements:**
- Leverages TanStack Query (Chariot standard)
- Separates concerns: fetching, error handling
- Automatic caching and retry
- Simpler testing

---

## Example 3: Form Validation

### Before (Complexity: 13)

```typescript
function validateSeedForm(data: SeedFormData): ValidationResult {
  const errors: string[] = [];

  if (!data.name) {
    errors.push('Name required');
  } else {
    if (data.name.length < 3) {
      errors.push('Name too short');
    }
    if (data.name.length > 100) {
      errors.push('Name too long');
    }
  }

  if (!data.value) {
    errors.push('Value required');
  } else {
    if (data.type === 'domain') {
      if (!/^[a-z0-9.-]+$/.test(data.value)) {
        errors.push('Invalid domain format');
      }
    } else if (data.type === 'ip') {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(data.value)) {
        errors.push('Invalid IP format');
      }
    } else if (data.type === 'cidr') {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(data.value)) {
        errors.push('Invalid CIDR format');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### After (Complexity: 3 per validator, 2 main)

```typescript
type Validator = (data: SeedFormData) => string | null;

const validators: Validator[] = [
  validateName,
  validateValue,
  validateTypeSpecific,
];

function validateSeedForm(data: SeedFormData): ValidationResult {
  const errors = validators
    .map(validator => validator(data))
    .filter((error): error is string => error !== null);

  return {
    valid: errors.length === 0,
    errors,
  };
}
// Complexity: 2

function validateName(data: SeedFormData): string | null {
  if (!data.name) return 'Name required';
  if (data.name.length < 3) return 'Name too short (min 3 chars)';
  if (data.name.length > 100) return 'Name too long (max 100 chars)';
  return null;
}
// Complexity: 3

function validateValue(data: SeedFormData): string | null {
  return data.value ? null : 'Value required';
}
// Complexity: 1

const typeValidators: Record<string, (value: string) => boolean> = {
  domain: (v) => /^[a-z0-9.-]+$/.test(v),
  ip: (v) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v),
  cidr: (v) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(v),
};

function validateTypeSpecific(data: SeedFormData): string | null {
  if (!data.value || !data.type) return null;

  const validator = typeValidators[data.type];
  if (!validator) return null;

  return validator(data.value) ? null : `Invalid ${data.type} format`;
}
// Complexity: 3
```

**Improvements:**
- Composable validators
- Easy to add new validation rules
- Each validator testable independently
- Clear error messages

---

## Example 4: API Response Handler

### Before (Complexity: 10)

```typescript
async function handleAssetResponse(res: Response): Promise<Asset> {
  if (res.status === 200) {
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    if (data.asset) {
      if (data.asset.id) {
        return data.asset;
      } else {
        throw new Error('Missing asset ID');
      }
    } else {
      throw new Error('Missing asset data');
    }
  } else if (res.status === 404) {
    throw new Error('Asset not found');
  } else if (res.status === 403) {
    throw new Error('Access denied');
  } else if (res.status >= 500) {
    throw new Error('Server error');
  } else {
    throw new Error(`Unexpected status: ${res.status}`);
  }
}
```

### After (Complexity: 2)

```typescript
async function handleAssetResponse(res: Response): Promise<Asset> {
  if (!res.ok) {
    throw createErrorFromResponse(res);
  }

  const data = await res.json();
  return validateAssetData(data);
}
// Complexity: 2

function createErrorFromResponse(res: Response): Error {
  const errorMap: Record<number, string> = {
    404: 'Asset not found',
    403: 'Access denied',
  };

  return new Error(
    errorMap[res.status] ||
    (res.status >= 500 ? 'Server error' : `Unexpected status: ${res.status}`)
  );
}
// Complexity: 1

function validateAssetData(data: any): Asset {
  if (data.error) throw new Error(data.error);
  if (!data.asset) throw new Error('Missing asset data');
  if (!data.asset.id) throw new Error('Missing asset ID');

  return data.asset;
}
// Complexity: 3
```

**Improvements:**
- Separation of concerns: HTTP errors vs data validation
- Guard clauses reduce nesting
- Lookup table for error messages
- Type-safe with proper Asset return

---

## Key Takeaways

1. **Extract Method**: Split large functions into focused, testable units
2. **Guard Clauses**: Use early returns to flatten nesting
3. **Lookup Tables**: Replace switch/if-else chains for mappings
4. **Composition**: Build complex logic from simple, reusable functions
5. **Type Safety**: TypeScript helps catch errors that complexity hides
