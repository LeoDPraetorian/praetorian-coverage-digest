# FeatureBase Custom Fields API Documentation

## Overview

The FeatureBase Custom Fields API allows you to define and manage custom metadata fields for users, companies, and other entities. Custom fields enable flexible data capture beyond the default FeatureBase schema, supporting use cases like plan tracking, MRR attribution, feature flags, and custom segmentation.

**Base URL**: `https://do.featurebase.app/v2/custom_fields`

**Authentication**: API Key authentication via `X-API-Key` header

**Response Format**: JSON

---

## Table of Contents

1. [Custom Fields Overview](#custom-fields-overview)
2. [Supported Field Types](#supported-field-types)
3. [API Endpoints](#api-endpoints)
4. [Usage with Users API](#usage-with-users-api)
5. [Usage with Companies API](#usage-with-companies-api)
6. [Data Models](#data-models)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

---

## Custom Fields Overview

Custom fields extend FeatureBase entities with organization-specific metadata:

**Common Use Cases**:
- **Subscription Plans**: Track user tier (free, pro, enterprise)
- **MRR/ARR**: Revenue attribution for prioritization
- **Feature Flags**: Enable/disable features per user
- **Custom IDs**: Map to external systems (CRM, billing, etc.)
- **Departments**: Organize users by team/department
- **Onboarding Status**: Track user journey stages

**Supported Entities**:
- Users
- Companies
- Posts (via metadata)

---

## Supported Field Types

### String Fields

```typescript
{
  "name": "subscription_plan",
  "type": "string",
  "options": ["free", "pro", "enterprise"]  // Optional enum values
}
```

**Use cases**: Plan names, status labels, category names

### Number Fields

```typescript
{
  "name": "monthly_recurring_revenue",
  "type": "number",
  "min": 0,
  "max": 1000000
}
```

**Use cases**: MRR, ARR, seat count, usage quotas

### Boolean Fields

```typescript
{
  "name": "beta_access_enabled",
  "type": "boolean"
}
```

**Use cases**: Feature flags, opt-in settings, access controls

### Date Fields

```typescript
{
  "name": "trial_expiration",
  "type": "date"
}
```

**Use cases**: Trial periods, contract dates, milestone tracking

### Array Fields

```typescript
{
  "name": "enabled_features",
  "type": "array",
  "itemType": "string"
}
```

**Use cases**: Feature lists, permissions, tags

---

## API Endpoints

### List Custom Fields

Retrieve all custom fields configured in your organization.

#### Endpoint

```
GET /v2/custom_fields
```

#### Request Parameters

No parameters required.

#### Response Schema

```typescript
{
  fields: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array';
    options?: string[];       // For enum-style string fields
    min?: number;             // For number fields
    max?: number;             // For number fields
    itemType?: string;        // For array fields
    required: boolean;
    createdAt: string;        // ISO 8601
    updatedAt: string;        // ISO 8601
  }>;
}
```

#### Response Example

```json
{
  "fields": [
    {
      "id": "cf_abc123",
      "name": "subscription_plan",
      "type": "string",
      "options": ["free", "pro", "enterprise"],
      "required": false,
      "createdAt": "2025-12-01T10:00:00Z",
      "updatedAt": "2025-12-01T10:00:00Z"
    },
    {
      "id": "cf_def456",
      "name": "mrr",
      "type": "number",
      "min": 0,
      "max": 1000000,
      "required": false,
      "createdAt": "2025-12-01T10:05:00Z",
      "updatedAt": "2025-12-01T10:05:00Z"
    },
    {
      "id": "cf_ghi789",
      "name": "beta_features_enabled",
      "type": "boolean",
      "required": false,
      "createdAt": "2025-12-05T14:30:00Z",
      "updatedAt": "2025-12-05T14:30:00Z"
    }
  ]
}
```

#### Code Example

```typescript
async function getAllCustomFields(client: HTTPPort) {
  const response = await client.request('get', '/v2/custom_fields');
  return response.fields;
}
```

---

### Create Custom Field

Define a new custom field schema.

#### Endpoint

```
POST /v2/custom_fields
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Field identifier (snake_case recommended) |
| `type` | string | Yes | Field type: `string`, `number`, `boolean`, `date`, `array` |
| `options` | string[] | No | Valid values for string enums |
| `min` | number | No | Minimum value for number fields |
| `max` | number | No | Maximum value for number fields |
| `itemType` | string | No | Type of array items (`string`, `number`) |
| `required` | boolean | No | Whether field is required (default: false) |

#### Request Example

```typescript
// String enum field
const planField = await client.request('post', '/v2/custom_fields', {
  name: 'subscription_plan',
  type: 'string',
  options: ['free', 'pro', 'enterprise'],
  required: false
});

// Number field with constraints
const mrrField = await client.request('post', '/v2/custom_fields', {
  name: 'mrr',
  type: 'number',
  min: 0,
  max: 1000000,
  required: false
});

// Boolean feature flag
const betaField = await client.request('post', '/v2/custom_fields', {
  name: 'beta_access',
  type: 'boolean',
  required: false
});
```

#### Response Example

```json
{
  "field": {
    "id": "cf_new123",
    "name": "subscription_plan",
    "type": "string",
    "options": ["free", "pro", "enterprise"],
    "required": false,
    "createdAt": "2026-01-17T15:00:00Z",
    "updatedAt": "2026-01-17T15:00:00Z"
  }
}
```

---

## Usage with Users API

Custom fields are attached to users via the Identify API.

### Setting Custom Fields

```typescript
import { identifyUser } from './featurebase';

await identifyUser.execute({
  userId: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  customFields: {
    subscription_plan: 'enterprise',
    mrr: 500,
    beta_access: true,
    department: 'engineering',
    onboarding_completed: true
  }
}, client);
```

### Updating Custom Fields

```typescript
// Update only specific custom fields
await identifyUser.execute({
  userId: 'user_123',
  customFields: {
    subscription_plan: 'pro',      // Downgrade
    mrr: 99                        // Updated MRR
    // Other fields remain unchanged
  }
}, client);
```

### Clearing Custom Fields

```typescript
// Set to null to clear
await identifyUser.execute({
  userId: 'user_123',
  customFields: {
    beta_access: null
  }
}, client);
```

---

## Usage with Companies API

Custom fields can also be attached to company entities.

### Setting Company Custom Fields

```typescript
await identifyUser.execute({
  userId: 'user_123',
  email: 'user@example.com',
  company: {
    id: 'company_456',
    name: 'Acme Corp',
    customFields: {
      industry: 'saas',
      employee_count: 250,
      arr: 500000,
      contract_tier: 'enterprise',
      support_level: 'priority'
    }
  }
}, client);
```

---

## Data Models

### CustomField Definition

```typescript
interface CustomFieldDefinition {
  id: string;                      // System-generated identifier
  name: string;                    // Field name (snake_case)
  type: FieldType;                 // Data type
  options?: string[];              // Enum values (string type only)
  min?: number;                    // Min value (number type only)
  max?: number;                    // Max value (number type only)
  itemType?: string;               // Array item type
  required: boolean;               // Validation requirement
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array';
```

### CustomField Value

```typescript
type CustomFieldValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | null;

interface CustomFieldValues {
  [fieldName: string]: CustomFieldValue;
}
```

---

## Code Examples

### Complete Custom Fields Workflow

```typescript
import { HTTPPort } from './types';

async function customFieldsWorkflow(client: HTTPPort) {
  // 1. Define custom field schema
  const fields = await client.request('post', '/v2/custom_fields', {
    name: 'onboarding_stage',
    type: 'string',
    options: ['signup', 'verified', 'configured', 'active'],
    required: false
  });

  console.log('Created field:', fields.field.id);

  // 2. Set custom field on user
  await client.request('post', '/v2/identify', {
    userId: 'user_123',
    email: 'user@example.com',
    customFields: {
      onboarding_stage: 'verified',
      trial_started_at: new Date().toISOString()
    }
  });

  // 3. Query users by custom field value
  const users = await client.request('get', '/v2/users', {
    customField: 'onboarding_stage',
    customFieldValue: 'verified',
    limit: 50
  });

  console.log(`Found ${users.totalCount} verified users`);

  // 4. Update custom field
  await client.request('post', '/v2/identify', {
    userId: 'user_123',
    customFields: {
      onboarding_stage: 'active'
    }
  });

  // 5. List all custom fields
  const allFields = await client.request('get', '/v2/custom_fields');
  console.log(`Organization has ${allFields.fields.length} custom fields`);
}
```

### Subscription Tier Tracking

```typescript
async function trackSubscriptionPlan(
  userId: string,
  email: string,
  plan: 'free' | 'pro' | 'enterprise',
  mrr: number,
  client: HTTPPort
) {
  await client.request('post', '/v2/identify', {
    userId,
    email,
    customFields: {
      subscription_plan: plan,
      mrr: mrr,
      plan_changed_at: new Date().toISOString()
    }
  });

  console.log(`User ${userId} set to ${plan} plan ($${mrr}/month)`);
}

// Usage
await trackSubscriptionPlan('user_456', 'enterprise@example.com', 'enterprise', 500, client);
```

### Feature Flag Management

```typescript
async function enableBetaFeature(
  userId: string,
  featureName: string,
  client: HTTPPort
) {
  // Get current feature flags
  const user = await client.request('get', `/v2/users/${userId}`);
  const enabledFeatures = user.customFields?.enabled_features || [];

  // Add new feature
  if (!enabledFeatures.includes(featureName)) {
    enabledFeatures.push(featureName);

    await client.request('post', '/v2/identify', {
      userId,
      customFields: {
        enabled_features: enabledFeatures
      }
    });

    console.log(`Enabled ${featureName} for user ${userId}`);
  }
}

// Usage
await enableBetaFeature('user_789', 'advanced_analytics', client);
```

### MRR Segmentation

```typescript
async function getUsersByMRR(
  minMRR: number,
  maxMRR: number,
  client: HTTPPort
) {
  // Note: Requires custom field filtering support in API
  const users = await client.request('get', '/v2/users', {
    limit: 100,
    sortBy: 'mrr',
    sortDirection: 'desc'
  });

  // Client-side filtering (if API doesn't support range queries)
  const filtered = users.results.filter(user => {
    const mrr = user.customFields?.mrr ?? 0;
    return mrr >= minMRR && mrr <= maxMRR;
  });

  return filtered;
}

// Find all users paying $100-$500/month
const midTierUsers = await getUsersByMRR(100, 500, client);
```

### Batch Update Custom Fields

```typescript
async function batchUpdatePlans(
  userUpdates: Array<{ userId: string; plan: string; mrr: number }>,
  client: HTTPPort
) {
  const results = await Promise.allSettled(
    userUpdates.map(({ userId, plan, mrr }) =>
      client.request('post', '/v2/identify', {
        userId,
        customFields: {
          subscription_plan: plan,
          mrr: mrr,
          updated_at: new Date().toISOString()
        }
      })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`Updated ${succeeded.length} users, ${failed.length} failed`);

  return { succeeded, failed };
}
```

---

## Best Practices

### 1. Field Naming Conventions

Use consistent naming:

```typescript
// Good: snake_case
'subscription_plan', 'mrr', 'onboarding_stage'

// Avoid: camelCase, spaces, hyphens
'subscriptionPlan', 'Subscription Plan', 'subscription-plan'
```

### 2. Type Consistency

Always use the correct type for data:

```typescript
// Correct
customFields: {
  mrr: 500,                    // number
  plan: 'enterprise',          // string
  beta_enabled: true           // boolean
}

// Incorrect - type mismatch
customFields: {
  mrr: '500',                  // ❌ Should be number
  beta_enabled: 'true'         // ❌ Should be boolean
}
```

### 3. Validation

Validate custom field values before sending:

```typescript
function validateCustomFields(
  fields: Record<string, any>,
  fieldDefinitions: CustomFieldDefinition[]
) {
  for (const [name, value] of Object.entries(fields)) {
    const def = fieldDefinitions.find(f => f.name === name);

    if (!def) {
      throw new Error(`Unknown custom field: ${name}`);
    }

    // Type validation
    if (def.type === 'number' && typeof value !== 'number') {
      throw new Error(`${name} must be a number`);
    }

    // Range validation
    if (def.type === 'number' && def.min !== undefined && value < def.min) {
      throw new Error(`${name} must be >= ${def.min}`);
    }

    // Enum validation
    if (def.type === 'string' && def.options && !def.options.includes(value)) {
      throw new Error(`${name} must be one of: ${def.options.join(', ')}`);
    }
  }
}
```

### 4. Null Handling

Use `null` to clear custom field values:

```typescript
// Clear a field
await client.request('post', '/v2/identify', {
  userId: 'user_123',
  customFields: {
    temporary_flag: null  // Removes the field
  }
});
```

### 5. Performance

Minimize custom field updates:

```typescript
// Bad: Multiple API calls
await updateCustomField('user_123', { plan: 'pro' });
await updateCustomField('user_123', { mrr: 99 });
await updateCustomField('user_123', { updated: new Date() });

// Good: Single API call
await client.request('post', '/v2/identify', {
  userId: 'user_123',
  customFields: {
    plan: 'pro',
    mrr: 99,
    updated: new Date().toISOString()
  }
});
```

### 6. Required Fields

Honor required field constraints:

```typescript
// If field is required, always provide a value
if (fieldDef.required && !(fieldName in customFields)) {
  throw new Error(`Required custom field missing: ${fieldName}`);
}
```

---

## Integration Patterns

### User Segmentation

```typescript
async function getUserSegments(client: HTTPPort) {
  const users = await client.request('get', '/v2/users', { limit: 100 });

  const segments = {
    enterprise: users.results.filter(u => u.customFields?.plan === 'enterprise'),
    pro: users.results.filter(u => u.customFields?.plan === 'pro'),
    free: users.results.filter(u => u.customFields?.plan === 'free'),
    highMRR: users.results.filter(u => (u.customFields?.mrr ?? 0) > 1000),
    beta: users.results.filter(u => u.customFields?.beta_access === true)
  };

  return segments;
}
```

### Analytics Tracking

```typescript
async function trackUserActivity(
  userId: string,
  activityType: string,
  client: HTTPPort
) {
  await client.request('post', '/v2/identify', {
    userId,
    customFields: {
      [`last_${activityType}_at`]: new Date().toISOString(),
      [`${activityType}_count`]: (currentCount ?? 0) + 1
    }
  });
}

// Track login activity
await trackUserActivity('user_123', 'login', client);
```

### A/B Test Cohorts

```typescript
async function assignABTestCohort(
  userId: string,
  testName: string,
  variant: 'A' | 'B',
  client: HTTPPort
) {
  await client.request('post', '/v2/identify', {
    userId,
    customFields: {
      [`ab_test_${testName}`]: variant,
      [`ab_test_${testName}_assigned_at`]: new Date().toISOString()
    }
  });
}

// Assign to test
await assignABTestCohort('user_456', 'new_dashboard', 'B', client);
```

---

## Error Handling

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid custom field value",
    "details": {
      "field": "subscription_plan",
      "value": "invalid_plan",
      "allowedValues": ["free", "pro", "enterprise"]
    }
  }
}
```

### Type Mismatch Errors

```json
{
  "error": {
    "code": "TYPE_ERROR",
    "message": "Custom field type mismatch",
    "details": {
      "field": "mrr",
      "expectedType": "number",
      "receivedType": "string"
    }
  }
}
```

### Unknown Field Errors

```json
{
  "error": {
    "code": "UNKNOWN_FIELD",
    "message": "Custom field not defined",
    "details": {
      "field": "undefined_field",
      "hint": "Create field definition first via POST /v2/custom_fields"
    }
  }
}
```

---

## Advanced Use Cases

### Dynamic Field Schema

```typescript
async function defineFieldSchema(client: HTTPPort) {
  const fieldDefinitions = [
    { name: 'industry', type: 'string', options: ['saas', 'ecommerce', 'fintech', 'healthcare'] },
    { name: 'employee_count', type: 'number', min: 1, max: 100000 },
    { name: 'annual_contract_value', type: 'number', min: 0 },
    { name: 'contract_start_date', type: 'date' },
    { name: 'features_enabled', type: 'array', itemType: 'string' },
    { name: 'priority_support', type: 'boolean' }
  ];

  const created = await Promise.all(
    fieldDefinitions.map(def =>
      client.request('post', '/v2/custom_fields', def)
    )
  );

  console.log(`Defined ${created.length} custom fields`);
  return created.map(r => r.field);
}
```

### Computed Fields

```typescript
async function updateComputedFields(userId: string, client: HTTPPort) {
  const user = await client.request('get', `/v2/users/${userId}`);
  const posts = await client.request('get', `/v2/posts`, { authorId: userId });
  const comments = await client.request('get', `/v2/comments`, { authorId: userId });

  // Compute engagement score
  const engagementScore =
    (posts.totalResults * 10) +
    (comments.totalResults * 2) +
    (user.upvotesGiven || 0);

  // Update computed fields
  await client.request('post', '/v2/identify', {
    userId,
    customFields: {
      total_posts: posts.totalResults,
      total_comments: comments.totalResults,
      engagement_score: engagementScore,
      last_active_at: new Date().toISOString()
    }
  });
}
```

### Migration from Legacy Fields

```typescript
async function migrateCustomFields(client: HTTPPort) {
  const users = await client.request('get', '/v2/users', { limit: 100 });

  for (const user of users.results) {
    const legacy = user.customFields;

    // Map old field names to new schema
    const migrated = {
      subscription_tier: legacy?.plan,           // Renamed
      monthly_revenue: legacy?.mrr,              // Renamed
      is_beta_user: legacy?.beta_access,         // Renamed
      // Drop deprecated fields
      legacy_id: undefined
    };

    await client.request('post', '/v2/identify', {
      userId: user.id,
      customFields: migrated
    });
  }

  console.log(`Migrated ${users.results.length} users`);
}
```

---

## Security Considerations

### 1. Sensitive Data

Avoid storing sensitive information in custom fields:

```typescript
// ❌ DON'T
customFields: {
  credit_card_number: '4111-1111-1111-1111',
  ssn: '123-45-6789',
  api_secret: 'sk_live_...'
}

// ✅ DO
customFields: {
  payment_method_type: 'visa',
  has_payment_method: true,
  billing_country: 'US'
}
```

### 2. PII Compliance

Mark PII fields and implement retention policies:

```typescript
customFields: {
  gdpr_consent: true,
  gdpr_consent_date: '2026-01-01T00:00:00Z',
  data_retention_days: 730
}
```

### 3. Input Validation

Always validate before setting:

```typescript
function sanitizeCustomFieldValue(value: any, type: string) {
  if (type === 'string' && typeof value === 'string') {
    // Prevent injection
    if (/[<>'";&|]/.test(value)) {
      throw new Error('Invalid characters in string value');
    }
  }

  if (type === 'number' && typeof value === 'number') {
    // Prevent NaN/Infinity
    if (!Number.isFinite(value)) {
      throw new Error('Invalid number value');
    }
  }

  return value;
}
```

---

## Performance Optimization

### Field Cardinality

Limit custom field schema size:

```typescript
// Recommended: <20 custom fields per entity
// Above 20 fields, consider:
// 1. Normalizing data to separate entities
// 2. Using tags instead of fields
// 3. Storing in external system with reference ID
```

### Indexing

For frequently queried fields, request indexing:

```typescript
// High-cardinality fields benefit from indexing
await client.request('post', '/v2/custom_fields', {
  name: 'company_id',
  type: 'string',
  indexed: true  // If API supports
});
```

### Caching

Cache custom field definitions to avoid repeated queries:

```typescript
let fieldDefinitionsCache: CustomFieldDefinition[] | null = null;

async function getFieldDefinitions(client: HTTPPort, forceRefresh = false) {
  if (!fieldDefinitionsCache || forceRefresh) {
    const response = await client.request('get', '/v2/custom_fields');
    fieldDefinitionsCache = response.fields;
  }

  return fieldDefinitionsCache;
}
```

---

## Related Documentation

- [Users API](./users-api.md) - Identify/upsert patterns with custom fields
- [Webhooks API](./webhooks-api.md) - Custom field change events
- [Posts API](./posts-api.md) - Post metadata custom fields

---

**Last Updated**: 2026-01-17

**Official Documentation**: [Custom Fields - FeatureBase API Reference](https://docs.featurebase.app/custom_fields)
