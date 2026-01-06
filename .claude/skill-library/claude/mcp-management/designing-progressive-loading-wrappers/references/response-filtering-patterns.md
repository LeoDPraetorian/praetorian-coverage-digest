# Response Filtering Patterns

Advanced techniques for reducing token consumption in API responses.

## Core Filtering Strategies

### 1. Summary + Limited Items Pattern

The most impactful pattern for collection endpoints:

```typescript
interface FilteredResponse<T> {
  summary: {
    total_count: number;
    returned_count: number;
    has_more: boolean;
    filter_applied?: string;
  };
  items: T[];
  pagination?: {
    cursor?: string;
    next_page?: number;
  };
}

async function listWithSummary<T>(
  fetcher: () => Promise<T[]>,
  options: { limit?: number; offset?: number } = {}
): Promise<FilteredResponse<T>> {
  const { limit = 20, offset = 0 } = options;
  const allItems = await fetcher();

  return {
    summary: {
      total_count: allItems.length,
      returned_count: Math.min(limit, allItems.length - offset),
      has_more: offset + limit < allItems.length,
    },
    items: allItems.slice(offset, offset + limit),
  };
}

// Usage
async function listIssues(args: { limit?: number; offset?: number }) {
  return listWithSummary(() => linearClient.issues(), { limit: args.limit, offset: args.offset });
}
```

### 2. Field Selection Pattern

Allow callers to specify which fields to include:

```typescript
interface FieldSelectionOptions {
  fields?: string[];
  exclude?: string[];
}

function selectFields<T extends object>(obj: T, options: FieldSelectionOptions): Partial<T> {
  const { fields, exclude = [] } = options;

  if (fields) {
    // Whitelist: only include specified fields
    return fields.reduce((acc, field) => {
      if (field in obj) {
        acc[field as keyof T] = obj[field as keyof T];
      }
      return acc;
    }, {} as Partial<T>);
  }

  // Blacklist: exclude specified fields
  return Object.keys(obj).reduce((acc, key) => {
    if (!exclude.includes(key)) {
      acc[key as keyof T] = obj[key as keyof T];
    }
    return acc;
  }, {} as Partial<T>);
}

// Usage
async function getIssue(args: { id: string; fields?: string[] }) {
  const issue = await linearClient.issue(args.id);
  return selectFields(issue, { fields: args.fields });
}
```

### 3. Field Truncation Pattern

Truncate large text fields with visibility into truncation:

```typescript
interface TruncationConfig {
  maxLength: number;
  fields: string[];
  suffix: string;
  preserveWords?: boolean;
}

const DEFAULT_TRUNCATION: TruncationConfig = {
  maxLength: 500,
  fields: ["description", "body", "content", "message", "notes"],
  suffix: "... [truncated]",
  preserveWords: true,
};

function truncateFields<T extends object>(
  obj: T,
  config: TruncationConfig = DEFAULT_TRUNCATION
): T & { _truncated?: string[] } {
  const result = { ...obj } as T & { _truncated?: string[] };
  const truncatedFields: string[] = [];

  for (const field of config.fields) {
    const value = (obj as any)[field];
    if (typeof value === "string" && value.length > config.maxLength) {
      let truncated = value.slice(0, config.maxLength);

      // Preserve word boundaries if configured
      if (config.preserveWords) {
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > config.maxLength * 0.8) {
          truncated = truncated.slice(0, lastSpace);
        }
      }

      (result as any)[field] = truncated + config.suffix;
      truncatedFields.push(field);
    }
  }

  if (truncatedFields.length > 0) {
    result._truncated = truncatedFields;
  }

  return result;
}
```

### 4. Nested Resource Suppression

Flatten or remove nested relationships:

```typescript
interface SuppressionConfig {
  // Fields to completely remove
  remove: string[];
  // Fields to replace with ID reference only
  idOnly: string[];
  // Fields to flatten (extract specific subfields)
  flatten: Record<string, string[]>;
}

const DEFAULT_SUPPRESSION: SuppressionConfig = {
  remove: ["__typename", "_links", "metadata"],
  idOnly: ["project", "team", "creator", "assignee", "parent"],
  flatten: {
    state: ["id", "name", "color"],
    labels: ["id", "name"],
  },
};

function suppressNested<T extends object>(
  obj: T,
  config: SuppressionConfig = DEFAULT_SUPPRESSION
): any {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Remove specified fields
    if (config.remove.includes(key)) {
      continue;
    }

    // Replace with ID only
    if (config.idOnly.includes(key) && value && typeof value === "object") {
      result[key] = { id: (value as any).id };
      continue;
    }

    // Flatten to specific subfields
    if (key in config.flatten && value && typeof value === "object") {
      const allowedFields = config.flatten[key];
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          allowedFields.reduce((acc, field) => {
            if (field in item) acc[field] = item[field];
            return acc;
          }, {} as any)
        );
      } else {
        result[key] = allowedFields.reduce((acc, field) => {
          if (field in value) acc[field] = (value as any)[field];
          return acc;
        }, {} as any);
      }
      continue;
    }

    // Pass through unchanged
    result[key] = value;
  }

  return result;
}
```

## Combining Patterns

Create a unified filter pipeline:

```typescript
interface FilterPipeline<T> {
  truncation?: TruncationConfig;
  suppression?: SuppressionConfig;
  fieldSelection?: FieldSelectionOptions;
  limit?: number;
}

function applyFilters<T extends object>(data: T | T[], pipeline: FilterPipeline<T>): any {
  let result = data;

  // Handle arrays with limit
  if (Array.isArray(result) && pipeline.limit) {
    const summary = {
      total_count: result.length,
      returned_count: Math.min(pipeline.limit, result.length),
      has_more: result.length > pipeline.limit,
    };
    result = result.slice(0, pipeline.limit) as any;

    // Apply item-level filters
    result = (result as T[]).map((item) => applyItemFilters(item, pipeline)) as any;

    return { summary, items: result };
  }

  return applyItemFilters(result as T, pipeline);
}

function applyItemFilters<T extends object>(item: T, pipeline: FilterPipeline<T>): any {
  let result: any = item;

  if (pipeline.suppression) {
    result = suppressNested(result, pipeline.suppression);
  }

  if (pipeline.truncation) {
    result = truncateFields(result, pipeline.truncation);
  }

  if (pipeline.fieldSelection) {
    result = selectFields(result, pipeline.fieldSelection);
  }

  return result;
}
```

## Token Reduction by Pattern

| Pattern                     | Typical Reduction | Best For                       |
| --------------------------- | ----------------- | ------------------------------ |
| Summary + Limited Items     | 90-99%            | List endpoints, collections    |
| Field Selection             | 30-70%            | Large objects, customization   |
| Field Truncation            | 50-80%            | Text-heavy responses           |
| Nested Resource Suppression | 60-90%            | Graph APIs, relationship-heavy |
| Combined Pipeline           | 95-99%            | Complex APIs                   |

## Implementation Checklist

- [ ] All list endpoints use Summary + Limited Items
- [ ] Default limit set (20-50 items)
- [ ] Large text fields truncated (500 char default)
- [ ] Nested resources suppressed or ID-only
- [ ] `_truncated` metadata included when fields truncated
- [ ] Pagination cursor/offset supported for accessing more items
- [ ] Field selection available for customization

## Related Patterns

- [Progressive Loading Examples](progressive-loading-examples.md) - Load tools lazily
- [Token Estimation](token-estimation.md) - Measure impact
- [Validation Checklist](validation-checklist.md) - Verify implementation
