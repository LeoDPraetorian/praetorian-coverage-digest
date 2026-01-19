# FeatureBase Users/Identify API Documentation

## Overview

The FeatureBase Identify API allows you to add, update, retrieve, and delete user data in FeatureBase, including your own customer IDs, custom fields, company associations, and MRR (Monthly Recurring Revenue) tracking. This API supports upsert behavior, user pagination, and comprehensive user management capabilities.

**Base URL**: `https://do.featurebase.app`

**Authentication**: API Key authentication via `X-API-Key` header

**API Version**: v2

**Key Feature**: Automatic upsert behavior - calling identify with an existing user's email or userId will update that user instead of creating a duplicate.

---

## Authentication Configuration

All identify API requests use the HTTPPort client with the following configuration:

```typescript
import { createFeaturebaseClient } from '.claude/tools/featurebase';

// Create authenticated client
const client = createFeaturebaseClient({
  apiKey: 'your-api-key-here'
});

// Or load from config
const client = createFeaturebaseClient(); // Loads from .claude/tools/config/
```

**HTTP Client Configuration**:
- Base URL: `https://do.featurebase.app`
- Authentication: API key in `X-API-Key` header
- Timeout: 30 seconds
- Retry: 3 attempts on 408, 429, 5xx errors
- Methods: GET, POST, DELETE

---

## User Model

The user model contains comprehensive information about a user:

```typescript
interface User {
  // Identity
  email?: string;                // User email (required if userId not provided)
  userId?: string;               // Your system's user ID (required if email not provided)
  name?: string;                 // User's display name

  // Custom fields (flexible schema)
  customFields?: Record<string, any>;

  // Company association
  companies?: Array<{
    id: string;                  // Your company ID
    name: string;                // Company name
    monthlySpend?: number;       // MRR (Monthly Recurring Revenue)
    customFields?: Record<string, any>;
  }>;

  // Metadata
  createdAt?: string;            // ISO 8601 timestamp
  lastActivity?: string;         // ISO 8601 timestamp
  totalPosts?: number;           // Number of posts created
  totalComments?: number;        // Number of comments made
  totalUpvotes?: number;         // Number of upvotes given
}
```

---

## Identify User (Add/Update)

**Endpoint**: `POST /v2/organization/identifyUser`

**Purpose**: Add additional data to your users in FeatureBase or update existing user data. When your user data changes, call this endpoint again with the same email or userId, and FeatureBase will automatically update the data (upsert behavior).

### Request Parameters

```typescript
interface IdentifyUserInput {
  // Identity (at least one required)
  email?: string;                // User email
  userId?: string;               // Your system's user ID

  // Basic info
  name?: string;                 // User's display name

  // Custom fields (any additional data)
  customFields?: Record<string, any>;

  // Company association
  companies?: Array<{
    id: string;                  // Your company ID
    name: string;                // Company name
    monthlySpend?: number;       // MRR tracking
    customFields?: Record<string, any>;
  }>;
}
```

**Field Details**:
- `email` OR `userId`: At least one is required for identification
- `name`: Optional, user's display name
- `customFields`: Optional, any custom data you want to track (flexible schema)
- `companies`: Optional, associate user with one or more companies with MRR tracking

### Request JSON

```json
{
  "email": "alice@example.com",
  "userId": "user_12345",
  "name": "Alice Johnson",
  "customFields": {
    "plan": "enterprise",
    "accountType": "premium",
    "region": "us-west",
    "signupDate": "2025-01-15",
    "features": ["api-access", "sso", "priority-support"]
  },
  "companies": [
    {
      "id": "company_abc",
      "name": "Acme Corporation",
      "monthlySpend": 5000,
      "customFields": {
        "industry": "technology",
        "size": "enterprise",
        "tier": "platinum"
      }
    }
  ]
}
```

### Upsert Behavior

The identify endpoint uses **upsert** logic:

```typescript
// First call - creates new user
await identify({
  email: "alice@example.com",
  name: "Alice Johnson",
  customFields: { plan: "starter" }
});
// Result: User created

// Second call with same email - updates existing user
await identify({
  email: "alice@example.com",
  customFields: { plan: "enterprise" }
});
// Result: User updated (plan changed from "starter" to "enterprise")
```

### Response Schema

```typescript
interface IdentifyUserResponse {
  success: boolean;
  user: {
    email: string;
    userId?: string;
    name?: string;
    customFields?: Record<string, any>;
    companies?: Array<{
      id: string;
      name: string;
      monthlySpend?: number;
      customFields?: Record<string, any>;
    }>;
    createdAt: string;
    updatedAt: string;
  };
  action: 'created' | 'updated';  // Indicates if user was created or updated
}
```

### Code Example - Basic Identification

```typescript
const identifyUser = async (email: string, name: string) => {
  const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
    method: 'POST',
    headers: {
      'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name })
  });

  if (!response.ok) {
    throw new Error(`Failed to identify user: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`User ${result.action}: ${result.user.email}`);
  return result;
};

// Usage
await identifyUser('alice@example.com', 'Alice Johnson');
```

### Code Example - With Custom Fields

```typescript
const identifyUserWithCustomFields = async (
  email: string,
  customFields: Record<string, any>
) => {
  const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
    method: 'POST',
    headers: {
      'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      customFields
    })
  });

  const result = await response.json();
  console.log(`User ${result.action}: ${result.user.email}`);
  console.log(`Custom fields:`, result.user.customFields);
  return result;
};

// Usage
await identifyUserWithCustomFields('alice@example.com', {
  plan: 'enterprise',
  accountType: 'premium',
  region: 'us-west',
  lastLogin: new Date().toISOString()
});
```

### Code Example - With Company and MRR

```typescript
const identifyUserWithCompany = async (
  email: string,
  companyId: string,
  companyName: string,
  monthlySpend: number
) => {
  const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
    method: 'POST',
    headers: {
      'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      companies: [{
        id: companyId,
        name: companyName,
        monthlySpend,
        customFields: {
          industry: 'technology',
          size: 'enterprise'
        }
      }]
    })
  });

  const result = await response.json();
  console.log(`User ${result.action}: ${result.user.email}`);
  console.log(`Company: ${result.user.companies[0].name}`);
  console.log(`MRR: $${result.user.companies[0].monthlySpend}`);
  return result;
};

// Usage
await identifyUserWithCompany(
  'alice@example.com',
  'company_abc',
  'Acme Corporation',
  5000
);
```

### Code Example - Using UserId Instead of Email

```typescript
const identifyByUserId = async (userId: string, name: string) => {
  const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
    method: 'POST',
    headers: {
      'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      name,
      customFields: {
        internalId: userId,
        source: 'api'
      }
    })
  });

  const result = await response.json();
  console.log(`User ${result.action}: ${result.user.userId}`);
  return result;
};

// Usage
await identifyByUserId('user_12345', 'Alice Johnson');
```

---

## Get User Information

**Endpoint**: `GET /v2/organization/identifyUser`

**Purpose**: Retrieve an identified user's information by email or userId. Pass email or userId as query parameters.

### Request Parameters

```typescript
interface GetUserInput {
  email?: string;                // User email
  userId?: string;               // Your system's user ID
}
```

**Field Details**:
- `email` OR `userId`: At least one is required for lookup

### Query String Construction

```typescript
// By email
const searchParams = new URLSearchParams();
searchParams.append('email', 'alice@example.com');

// By userId
const searchParams = new URLSearchParams();
searchParams.append('userId', 'user_12345');
```

### Request URL Pattern

```
GET https://do.featurebase.app/v2/organization/identifyUser?email=alice@example.com
GET https://do.featurebase.app/v2/organization/identifyUser?userId=user_12345
```

### Response Schema

```typescript
interface GetUserResponse {
  user: {
    email: string;
    userId?: string;
    name?: string;
    customFields?: Record<string, any>;
    companies?: Array<{
      id: string;
      name: string;
      monthlySpend?: number;
      customFields?: Record<string, any>;
    }>;
    createdAt: string;
    lastActivity?: string;
    totalPosts?: number;
    totalComments?: number;
    totalUpvotes?: number;
  };
}
```

### Code Example - Get by Email

```typescript
const getUserByEmail = async (email: string) => {
  const searchParams = new URLSearchParams({ email });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/identifyUser?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      console.log('User not found');
      return null;
    }
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`User: ${result.user.email}`);
  console.log(`Total posts: ${result.user.totalPosts}`);
  console.log(`Total comments: ${result.user.totalComments}`);
  console.log(`Last activity: ${result.user.lastActivity}`);
  return result.user;
};

// Usage
const user = await getUserByEmail('alice@example.com');
```

### Code Example - Get by UserId

```typescript
const getUserByUserId = async (userId: string) => {
  const searchParams = new URLSearchParams({ userId });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/identifyUser?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      console.log('User not found');
      return null;
    }
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  const result = await response.json();
  return result.user;
};

// Usage
const user = await getUserByUserId('user_12345');
```

---

## List All Users (Pagination)

**Endpoint**: `GET /v2/organization/identifyUser/query`

**Purpose**: Paginate through all identified users in your organization with filtering and sorting options.

### Request Parameters

```typescript
interface ListUsersInput {
  page?: number;                 // Page number (default: 1)
  limit?: number;                // Users per page (default: 10, max: 100)
  sortBy?: 'topPosters' | 'topCommenters' | 'lastActivity';  // Sort field
  q?: string;                    // Search by name or email
}
```

**Parameter Details**:
- `page`: Page number to fetch. Default: 1
- `limit`: Number of users to fetch per page. Default: 10, max: 100
- `sortBy`: Sort order (topPosters, topCommenters, lastActivity). Default: lastActivity
- `q`: Search query string to filter users by name or email

### Query String Construction

```typescript
const searchParams = new URLSearchParams({
  page: '1',
  limit: '20',
  sortBy: 'lastActivity'
});

if (query) {
  searchParams.append('q', query);
}
```

### Request URL Pattern

```
GET https://do.featurebase.app/v2/organization/identifyUser/query?page=1&limit=20&sortBy=lastActivity
GET https://do.featurebase.app/v2/organization/identifyUser/query?page=1&limit=20&q=alice
```

### Response Schema

```typescript
interface ListUsersResponse {
  users: Array<{
    email: string;
    userId?: string;
    name?: string;
    customFields?: Record<string, any>;
    companies?: Array<{
      id: string;
      name: string;
      monthlySpend?: number;
    }>;
    createdAt: string;
    lastActivity?: string;
    totalPosts?: number;
    totalComments?: number;
    totalUpvotes?: number;
  }>;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
```

### Code Example - List All Users

```typescript
const listUsers = async (page: number = 1, limit: number = 20) => {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy: 'lastActivity'
  });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/identifyUser/query?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Found ${result.totalResults} users (page ${result.page}/${result.totalPages})`);

  result.users.forEach(user => {
    console.log(`- ${user.email} (${user.name})`);
    console.log(`  Posts: ${user.totalPosts}, Comments: ${user.totalComments}`);
    console.log(`  Last activity: ${user.lastActivity}`);
  });

  return result;
};

// Usage
await listUsers(1, 20);
```

### Code Example - Search Users

```typescript
const searchUsers = async (query: string) => {
  const searchParams = new URLSearchParams({
    page: '1',
    limit: '50',
    q: query
  });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/identifyUser/query?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  const result = await response.json();
  console.log(`Found ${result.totalResults} users matching "${query}"`);
  return result.users;
};

// Usage
const users = await searchUsers('alice');
```

### Code Example - Get Top Contributors

```typescript
const getTopPosters = async (limit: number = 10) => {
  const searchParams = new URLSearchParams({
    page: '1',
    limit: limit.toString(),
    sortBy: 'topPosters'
  });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/identifyUser/query?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  const result = await response.json();
  console.log(`Top ${limit} posters:`);

  result.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email})`);
    console.log(`   Posts: ${user.totalPosts}`);
  });

  return result.users;
};

// Usage
await getTopPosters(10);
```

### Code Example - Paginate Through All Users

```typescript
const getAllUsers = async () => {
  const allUsers: User[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: '100'  // Max per page
    });

    const response = await fetch(
      `https://do.featurebase.app/v2/organization/identifyUser/query?${searchParams}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
        }
      }
    );

    const result = await response.json();
    allUsers.push(...result.users);

    totalPages = result.totalPages;
    console.log(`Fetched page ${page}/${totalPages} (${result.users.length} users)`);

    page++;
  } while (page <= totalPages);

  console.log(`Total users: ${allUsers.length}`);
  return allUsers;
};

// Usage
const users = await getAllUsers();
```

---

## Delete User

**Endpoint**: `DELETE /v2/organization/deleteUser`

**Purpose**: Delete a user from your organization, removing all data associated with this user from your FeatureBase account.

### Request Parameters

```typescript
interface DeleteUserInput {
  email?: string;                // User email
  userId?: string;               // Your system's user ID
}
```

**Field Details**:
- `email` OR `userId`: At least one is required for identification

### Query String Construction

```typescript
// By email
const searchParams = new URLSearchParams();
searchParams.append('email', 'alice@example.com');

// By userId
const searchParams = new URLSearchParams();
searchParams.append('userId', 'user_12345');
```

### Request URL Pattern

```
DELETE https://do.featurebase.app/v2/organization/deleteUser?email=alice@example.com
DELETE https://do.featurebase.app/v2/organization/deleteUser?userId=user_12345
```

### Response Schema

```typescript
interface DeleteUserResponse {
  success: boolean;
  email?: string;
  userId?: string;
}
```

### Code Example - Delete by Email

```typescript
const deleteUserByEmail = async (email: string) => {
  const searchParams = new URLSearchParams({ email });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/deleteUser?${searchParams}`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      console.log('User not found');
      return false;
    }
    throw new Error(`Failed to delete user: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Deleted user: ${result.email}`);
  return result.success;
};

// Usage
await deleteUserByEmail('alice@example.com');
```

### Code Example - Delete by UserId

```typescript
const deleteUserByUserId = async (userId: string) => {
  const searchParams = new URLSearchParams({ userId });

  const response = await fetch(
    `https://do.featurebase.app/v2/organization/deleteUser?${searchParams}`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Deleted user: ${result.userId}`);
  return result.success;
};

// Usage
await deleteUserByUserId('user_12345');
```

---

## Complete Workflow Example

### User Lifecycle Management

```typescript
const manageUserLifecycle = async () => {
  const apiKey = process.env.FEATUREBASE_API_KEY;
  const baseUrl = 'https://do.featurebase.app/v2/organization/identifyUser';

  // 1. Identify new user
  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': `${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'alice@example.com',
      userId: 'user_12345',
      name: 'Alice Johnson',
      customFields: {
        plan: 'starter',
        signupDate: new Date().toISOString()
      }
    })
  });

  let result = await response.json();
  console.log(`User ${result.action}: ${result.user.email}`);

  // 2. Update user (upgrade plan)
  response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': `${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'alice@example.com',
      customFields: {
        plan: 'enterprise',
        upgradeDate: new Date().toISOString()
      },
      companies: [{
        id: 'company_abc',
        name: 'Acme Corporation',
        monthlySpend: 5000
      }]
    })
  });

  result = await response.json();
  console.log(`User updated - new plan: ${result.user.customFields.plan}`);
  console.log(`Company MRR: $${result.user.companies[0].monthlySpend}`);

  // 3. Get user information
  const searchParams = new URLSearchParams({ email: 'alice@example.com' });
  response = await fetch(`${baseUrl}?${searchParams}`, {
    method: 'GET',
    headers: { 'X-API-Key': `${apiKey}` }
  });

  result = await response.json();
  console.log(`User activity:`);
  console.log(`- Total posts: ${result.user.totalPosts}`);
  console.log(`- Total comments: ${result.user.totalComments}`);
  console.log(`- Last activity: ${result.user.lastActivity}`);

  // 4. List all users
  response = await fetch(`${baseUrl}/users?page=1&limit=10&sortBy=lastActivity`, {
    method: 'GET',
    headers: { 'X-API-Key': `${apiKey}` }
  });

  result = await response.json();
  console.log(`Total users in organization: ${result.totalResults}`);

  // 5. Delete user (optional)
  // response = await fetch(`${baseUrl}?${searchParams}`, {
  //   method: 'DELETE',
  //   headers: { 'X-API-Key': `${apiKey}` }
  // });
  //
  // result = await response.json();
  // console.log(`User deleted: ${result.success}`);
};

manageUserLifecycle().catch(console.error);
```

---

## MRR Tracking Example

### Track Revenue Per User

```typescript
const trackUserRevenue = async (
  email: string,
  companyId: string,
  companyName: string,
  monthlySpend: number
) => {
  const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
    method: 'POST',
    headers: {
      'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      companies: [{
        id: companyId,
        name: companyName,
        monthlySpend
      }]
    })
  });

  const result = await response.json();
  console.log(`Tracked MRR for ${email}: $${monthlySpend}`);
  return result;
};

// Track initial spend
await trackUserRevenue('alice@example.com', 'company_abc', 'Acme Corp', 1000);

// Update spend (upsert)
await trackUserRevenue('alice@example.com', 'company_abc', 'Acme Corp', 5000);
```

---

## Error Handling

### Common Errors

```typescript
// 400 Bad Request - Missing required fields
{
  error: "email or userId is required"
}

// 404 Not Found - User doesn't exist
{
  error: "User not found"
}

// 401 Unauthorized - Invalid API key
{
  error: "Invalid API key"
}
```

### Error Handling Pattern

```typescript
const identifyUserSafe = async (userData: IdentifyUserInput) => {
  try {
    const response = await fetch('https://do.featurebase.app/v2/organization/identifyUser', {
      method: 'POST',
      headers: {
        'X-API-Key': `${process.env.FEATUREBASE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      switch (response.status) {
        case 400:
          throw new Error(`Invalid request: ${error.error || 'Bad request'}`);
        case 401:
          throw new Error('Authentication failed: Invalid API key');
        case 404:
          throw new Error('User not found');
        default:
          throw new Error(`API error ${response.status}: ${error.error || 'Unknown error'}`);
      }
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to identify user:', error.message);
    throw error;
  }
};
```

---

## Best Practices

### 1. Use Upsert Behavior for Updates

```typescript
// Don't check if user exists - just identify again
// The API will automatically update if user exists
await identify({
  email: 'alice@example.com',
  customFields: { plan: 'enterprise' }
});
```

### 2. Track MRR with Company Association

```typescript
// Always include monthlySpend when identifying users
await identify({
  email: 'alice@example.com',
  companies: [{
    id: 'company_abc',
    name: 'Acme Corp',
    monthlySpend: 5000  // Track revenue
  }]
});
```

### 3. Use Custom Fields for Flexible Schema

```typescript
// Store any data you need without schema constraints
await identify({
  email: 'alice@example.com',
  customFields: {
    plan: 'enterprise',
    accountType: 'premium',
    features: ['api-access', 'sso'],
    metadata: {
      source: 'web',
      campaign: 'spring-2026'
    }
  }
});
```

### 4. Paginate Through Large User Lists

```typescript
// Use pagination to handle large datasets
const getAllUsers = async () => {
  let page = 1;
  let hasMore = true;
  const allUsers = [];

  while (hasMore) {
    const result = await listUsers(page, 100);
    allUsers.push(...result.users);
    hasMore = page < result.totalPages;
    page++;
  }

  return allUsers;
};
```

### 5. Validate Input Before Identifying

```typescript
const validateIdentifyInput = (input: IdentifyUserInput): boolean => {
  if (!input.email && !input.userId) {
    throw new Error('Either email or userId is required');
  }
  return true;
};
```

---

## Summary

The FeatureBase Users/Identify API provides:

1. **Identify**: Add or update user data with automatic upsert behavior
2. **Get**: Retrieve user information by email or userId
3. **List**: Paginate through all users with filtering and sorting
4. **Delete**: Remove user and all associated data

**Key Features**:
- Automatic upsert behavior (no duplicate users)
- Custom fields with flexible schema
- Company associations with MRR tracking
- User activity metrics (posts, comments, upvotes)
- Pagination with search and sorting
- Support for both email and userId identification

**Use Cases**:
- Sync user data from your system to FeatureBase
- Track customer revenue (MRR) per user
- Associate users with companies
- Store custom metadata and properties
- Analyze user engagement and activity
- Segment users by custom attributes

**Best Practices**:
- Use email OR userId (at least one required)
- Leverage upsert behavior for updates
- Track MRR via company associations
- Use custom fields for flexible data storage
- Paginate when fetching large user lists
- Validate input before API calls
