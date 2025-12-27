# Test Fixtures and Factory Patterns

Comprehensive guide to creating reusable test data with factory patterns, builder pattern, and Fishery library.

## Table of Contents

- [Why Factory Pattern](#why-factory-pattern)
- [Fishery Library](#fishery-library)
- [Builder Pattern](#builder-pattern)
- [Test Data Builders](#test-data-builders)
- [Vitest Fixtures](#vitest-fixtures)
- [Best Practices](#best-practices)

## Why Factory Pattern

Factory patterns solve the "noise" problem in tests where most test data is irrelevant to what's being tested.

### The Problem: Test Noise

```typescript
// ❌ BAD: Lots of irrelevant data
test('displays user name', () => {
  const user = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    isActive: true,
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: true,
    },
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    },
  };

  // Only testing name!
  render(<UserProfile user={user} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

### The Solution: Factories

```typescript
// ✅ GOOD: Only specify what matters
test('displays user name', () => {
  const user = userFactory.build({ name: 'Alice' });

  render(<UserProfile user={user} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

### Benefits

- **Reduced noise:** Only specify relevant data
- **Reusability:** Share fixtures across tests
- **Maintainability:** Update defaults in one place
- **Type safety:** TypeScript ensures valid data

## Fishery Library

Fishery is the recommended TypeScript-first factory library.

### Installation

```bash
npm install -D fishery
```

### Basic Factory

```typescript
// src/test/factories/user.factory.ts
import { Factory } from "fishery";
import type { User } from "@/types";

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: `User ${sequence}`,
  email: `user${sequence}@example.com`,
  role: "user",
  createdAt: new Date(),
  isActive: true,
}));

// Usage
import { userFactory } from "@/test/factories/user.factory";

const user = userFactory.build(); // { id: 1, name: 'User 1', ... }
const alice = userFactory.build({ name: "Alice" }); // Override name
const users = userFactory.buildList(5); // Array of 5 users
```

### Sequences

Automatically increment values for unique data:

```typescript
export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence, // 1, 2, 3, ...
  name: `User ${sequence}`, // "User 1", "User 2", ...
  email: `user${sequence}@example.com`, // user1@..., user2@...
}));
```

### Transient Parameters

Parameters that don't appear in the result:

```typescript
type UserTransientParams = {
  isAdmin?: boolean;
};

export const userFactory = Factory.define<User, UserTransientParams>(
  ({ sequence, transientParams }) => ({
    id: sequence,
    name: `User ${sequence}`,
    role: transientParams.isAdmin ? "admin" : "user",
  })
);

// Usage
const admin = userFactory.build({}, { transient: { isAdmin: true } });
expect(admin.role).toBe("admin");
```

### Associations

Reference other factories:

```typescript
// Post factory with user association
export const postFactory = Factory.define<Post, {}, { author?: User }>(
  ({ sequence, associations }) => ({
    id: sequence,
    title: `Post ${sequence}`,
    content: "Lorem ipsum",
    author: associations.author || userFactory.build(),
  })
);

// Usage
const user = userFactory.build({ name: "Alice" });
const post = postFactory.build({ author: user });
expect(post.author.name).toBe("Alice");

// Or let factory create author
const postWithDefaultAuthor = postFactory.build();
```

### Traits

Pre-configured variations:

```typescript
export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: `User ${sequence}`,
  role: "user",
  isActive: true,
}));

// Define traits
userFactory.admin = userFactory.params({ role: "admin" });
userFactory.inactive = userFactory.params({ isActive: false });

// Usage
const admin = userFactory.admin.build();
const inactiveUser = userFactory.inactive.build();
const inactiveAdmin = userFactory.admin.inactive.build();
```

### Async Factories

For operations requiring async setup:

```typescript
export const userWithPostsFactory = Factory.define<User>(async ({ sequence }) => {
  const user = {
    id: sequence,
    name: `User ${sequence}`,
  };

  // Async operation (e.g., fetch related data)
  const posts = await fetchUserPosts(user.id);

  return { ...user, posts };
});

// Usage (must await)
const user = await userWithPostsFactory.build();
```

### Build Hooks

Execute code before/after building:

```typescript
export const userFactory = Factory.define<User>(({ sequence, onCreate }) => {
  onCreate((user) => {
    console.log("Created user:", user.id);
    // Side effects like API calls
  });

  return {
    id: sequence,
    name: `User ${sequence}`,
  };
});
```

## Builder Pattern

Alternative pattern using method chaining.

### Basic Builder

```typescript
// src/test/builders/UserBuilder.ts
export class UserBuilder {
  private user: Partial<User> = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    role: "user",
  };

  withName(name: string): this {
    this.user.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  asAdmin(): this {
    this.user.role = "admin";
    return this;
  }

  build(): User {
    return this.user as User;
  }
}

// Usage
const user = new UserBuilder().withName("Alice").asAdmin().build();
```

### Generic Builder

```typescript
export class Builder<T> {
  constructor(private template: T) {}

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.template[key] = value;
    return this;
  }

  build(): T {
    return { ...this.template };
  }
}

// Usage
const userTemplate: User = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
};

const alice = new Builder(userTemplate)
  .with("name", "Alice")
  .with("email", "alice@example.com")
  .build();
```

### When to Use Builder vs Factory

| Use Case             | Recommendation         |
| -------------------- | ---------------------- |
| TypeScript project   | Fishery (better types) |
| Need sequences       | Fishery (built-in)     |
| Complex associations | Fishery (associations) |
| Simple objects       | Builder (less setup)   |
| Procedural style     | Builder (no library)   |

## Test Data Builders

Specialized builders for common patterns.

### Object Mother Pattern

Central place for common test objects:

```typescript
// src/test/fixtures/users.ts
export const testUsers = {
  alice: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
  },
  bob: {
    id: 2,
    name: 'Bob',
    email: 'bob@example.com',
    role: 'user',
  },
  inactiveUser: {
    id: 3,
    name: 'Inactive',
    email: 'inactive@example.com',
    isActive: false,
  },
};

// Usage
import { testUsers } from '@/test/fixtures/users';

test('displays admin badge', () => {
  render(<UserProfile user={testUsers.alice} />);
  expect(screen.getByText('Admin')).toBeInTheDocument();
});
```

**Drawback:** Brittle - changes to fixtures affect all tests

### Fixture Builder Pattern

Combines Object Mother with Builder:

```typescript
// src/test/builders/fixtures.ts
export const fixtures = {
  user: (overrides?: Partial<User>) => ({
    id: 1,
    name: "Test User",
    email: "test@example.com",
    ...overrides,
  }),

  admin: () => fixtures.user({ role: "admin" }),

  post: (overrides?: Partial<Post>) => ({
    id: 1,
    title: "Test Post",
    author: fixtures.user(),
    ...overrides,
  }),
};

// Usage
const user = fixtures.user({ name: "Alice" });
const admin = fixtures.admin();
const postByAlice = fixtures.post({ author: fixtures.user({ name: "Alice" }) });
```

## Vitest Fixtures

Use Vitest's test context for fixtures.

### Basic Fixture

```typescript
import { test as base } from "vitest";

const test = base.extend({
  user: async ({}, use) => {
    const user = { id: 1, name: "Test User" };
    await use(user);
  },
});

// Usage
test("uses fixture", ({ user }) => {
  expect(user.name).toBe("Test User");
});
```

### Fixture with Setup/Teardown

```typescript
const test = base.extend({
  tempUser: async ({}, use) => {
    // Setup
    const user = await createTestUser();

    // Provide to test
    await use(user);

    // Teardown
    await deleteTestUser(user.id);
  },
});

test("with temp user", async ({ tempUser }) => {
  expect(tempUser.id).toBeDefined();
});
```

### Parameterized Fixtures

```typescript
const test = base.extend({
  userWithRole: async ({}, use, testInfo) => {
    const role = testInfo.title.includes("admin") ? "admin" : "user";
    await use({ id: 1, role });
  },
});

test("admin can delete", ({ userWithRole }) => {
  expect(userWithRole.role).toBe("admin");
});
```

## Best Practices

### 1. One Factory Per Entity

```typescript
// ✅ GOOD: Separate factories
export const userFactory = Factory.define<User>(...);
export const postFactory = Factory.define<Post>(...);
export const commentFactory = Factory.define<Comment>(...);

// ❌ BAD: Single mega-factory
export const factory = {
  user: () => ({ ... }),
  post: () => ({ ... }),
  comment: () => ({ ... }),
};
```

### 2. Use Sensible Defaults

```typescript
// ✅ GOOD: Defaults pass validations
export const userFactory = Factory.define<User>(() => ({
  id: 1,
  name: "Test User", // Valid name
  email: "test@example.com", // Valid email format
  password: "Password123!", // Meets requirements
}));

// ❌ BAD: Defaults cause errors
export const userFactory = Factory.define<User>(() => ({
  id: 1,
  name: "", // Invalid!
  email: "invalid", // Invalid!
}));
```

### 3. Keep Factories Simple

```typescript
// ✅ GOOD: Simple data structure
export const userFactory = Factory.define<User>(() => ({
  id: 1,
  name: "Test User",
}));

// ❌ BAD: Complex logic in factory
export const userFactory = Factory.define<User>(() => {
  const random = Math.random();
  const name = random > 0.5 ? "Alice" : "Bob";
  const date = new Date();
  date.setFullYear(date.getFullYear() - Math.floor(random * 50));

  return { id: 1, name, birthDate: date };
});
```

### 4. Co-locate Factories with Types

```typescript
// Directory structure
src/
  types/
    user.ts          # User type definition
  test/
    factories/
      user.factory.ts  # User factory
```

### 5. Use Faker for Realistic Data

```typescript
import { faker } from "@faker-js/faker";

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
  },
}));
```

### 6. Avoid Coupling to Database

```typescript
// ✅ GOOD: Returns plain objects
export const userFactory = Factory.define<User>(() => ({ ... }));

// ❌ BAD: Requires database
export const userFactory = Factory.define<User>(async () => {
  return await db.users.create({ ... }); // Don't do this!
});
```

### 7. Test Your Factories

```typescript
test("userFactory creates valid user", () => {
  const user = userFactory.build();

  expect(user.id).toBeTypeOf("number");
  expect(user.email).toMatch(/@/);
  expect(user.role).toMatch(/^(user|admin)$/);
});
```

## Factory Organization

### File Structure

```
src/test/factories/
  index.ts              # Export all factories
  user.factory.ts       # User factory
  post.factory.ts       # Post factory
  comment.factory.ts    # Comment factory
  associations.ts       # Cross-factory helpers
```

### Index File Pattern

```typescript
// src/test/factories/index.ts
export * from "./user.factory";
export * from "./post.factory";
export * from "./comment.factory";

// Usage - single import
import { userFactory, postFactory } from "@/test/factories";
```

## Related References

- [Fishery GitHub](https://github.com/thoughtbot/fishery)
- [Fishery Documentation](https://github.com/thoughtbot/fishery#readme)
- [Test Data Builders Pattern](http://www.natpryce.com/articles/000714.html)
- [Builder Pattern Guide - Ardalis](https://ardalis.com/improve-tests-with-the-builder-pattern-for-test-data/)
- [Stepping up Test Fixture Game with Fishery](https://medium.com/leaselock-engineering/stepping-up-our-test-fixture-game-with-fishery-be22b76d1f22)
