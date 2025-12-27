# Factory Pattern Example with Fishery

Complete implementation of test data factories using Fishery library.

## Directory Structure

```
src/
├── types/
│   └── index.ts              # Type definitions
├── test/
│   └── factories/
│       ├── index.ts          # Export all factories
│       ├── user.factory.ts   # User factory
│       ├── post.factory.ts   # Post factory
│       └── comment.factory.ts # Comment factory
└── components/
    └── UserProfile.test.tsx  # Usage example
```

## Type Definitions

### src/types/index.ts

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: Date;
  posts?: Post[];
}

export interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  author?: User;
  comments?: Comment[];
  publishedAt: Date;
}

export interface Comment {
  id: number;
  content: string;
  postId: number;
  userId: number;
  user?: User;
  createdAt: Date;
}
```

## Factory Implementations

### src/test/factories/user.factory.ts

```typescript
import { Factory } from "fishery";
import type { User } from "@/types";

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: `User ${sequence}`,
  email: `user${sequence}@example.com`,
  role: "user",
  isActive: true,
  createdAt: new Date("2024-01-01"),
}));

// Define traits
userFactory.admin = userFactory.params({ role: "admin" });
userFactory.inactive = userFactory.params({ isActive: false });

// Example: Build methods
// userFactory.build()                    - Single user
// userFactory.buildList(5)               - Array of 5 users
// userFactory.admin.build()              - Admin user
// userFactory.build({ name: 'Alice' })   - Override specific fields
```

### src/test/factories/post.factory.ts

```typescript
import { Factory } from "fishery";
import type { Post, User } from "@/types";
import { userFactory } from "./user.factory";

type PostTransientParams = {
  withComments?: boolean;
};

export const postFactory = Factory.define<Post, PostTransientParams, { author?: User }>(
  ({ sequence, transientParams, associations }) => ({
    id: sequence,
    title: `Post ${sequence}`,
    content: "Lorem ipsum dolor sit amet",
    authorId: associations.author?.id || sequence,
    author: associations.author || userFactory.build(),
    publishedAt: new Date("2024-01-01"),
    // Conditionally include comments based on transient param
    ...(transientParams.withComments && {
      comments: commentFactory.buildList(3),
    }),
  })
);

// Usage:
// postFactory.build()                          - Post with default author
// postFactory.build({ author: myUser })        - Post with specific author
// postFactory.build({}, { transient: { withComments: true } }) - With comments
```

### src/test/factories/comment.factory.ts

```typescript
import { Factory } from "fishery";
import type { Comment, User } from "@/types";
import { userFactory } from "./user.factory";

export const commentFactory = Factory.define<Comment, {}, { user?: User }>(
  ({ sequence, associations }) => ({
    id: sequence,
    content: `Comment ${sequence}`,
    postId: 1,
    userId: associations.user?.id || sequence,
    user: associations.user,
    createdAt: new Date("2024-01-01"),
  })
);
```

### src/test/factories/index.ts

```typescript
export * from "./user.factory";
export * from "./post.factory";
export * from "./comment.factory";
```

## Usage Examples

### Basic Usage

```typescript
import { userFactory, postFactory } from "@/test/factories";

// Create single user
const user = userFactory.build();

// Create multiple users
const users = userFactory.buildList(5);

// Override specific fields
const alice = userFactory.build({
  name: "Alice",
  email: "alice@example.com",
});

// Use traits
const admin = userFactory.admin.build();
const inactiveAdmin = userFactory.admin.inactive.build();
```

### Associations

```typescript
import { userFactory, postFactory } from "@/test/factories";

// Post with specific author
const author = userFactory.build({ name: "Alice" });
const post = postFactory.build({ author });

// User with posts
const userWithPosts = userFactory.build({
  posts: postFactory.buildList(3),
});
```

### Transient Parameters

```typescript
// Post with comments (using transient param)
const postWithComments = postFactory.build({}, { transient: { withComments: true } });

expect(postWithComments.comments).toHaveLength(3);
```

## Test Examples

### Testing User Profile Component

```typescript
import { render, screen } from '@testing-library/react';
import { userFactory } from '@/test/factories';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  test('displays user information', () => {
    const user = userFactory.build({
      name: 'Alice',
      email: 'alice@example.com',
    });

    render(<UserProfile user={user} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  test('shows admin badge for admin users', () => {
    const admin = userFactory.admin.build();

    render(<UserProfile user={admin} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('shows inactive badge for inactive users', () => {
    const inactiveUser = userFactory.inactive.build();

    render(<UserProfile user={inactiveUser} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
```

### Testing with Relationships

```typescript
import { render, screen } from '@testing-library/react';
import { userFactory, postFactory } from '@/test/factories';
import { PostList } from './PostList';

describe('PostList', () => {
  test('displays posts with author names', () => {
    const alice = userFactory.build({ name: 'Alice' });
    const bob = userFactory.build({ name: 'Bob' });

    const posts = [
      postFactory.build({ title: 'Post 1', author: alice }),
      postFactory.build({ title: 'Post 2', author: bob }),
    ];

    render(<PostList posts={posts} />);

    expect(screen.getByText('Post 1')).toBeInTheDocument();
    expect(screen.getByText('by Alice')).toBeInTheDocument();
    expect(screen.getByText('Post 2')).toBeInTheDocument();
    expect(screen.getByText('by Bob')).toBeInTheDocument();
  });
});
```

### Testing with Fixtures

```typescript
import { userFactory } from "@/test/factories";

describe("User permissions", () => {
  test("admin can delete users", () => {
    const admin = userFactory.admin.build();
    const user = userFactory.build();

    expect(canDelete(admin, user)).toBe(true);
  });

  test("user cannot delete other users", () => {
    const user1 = userFactory.build();
    const user2 = userFactory.build();

    expect(canDelete(user1, user2)).toBe(false);
  });
});
```

## Advanced Patterns

### Sequences for Unique Data

```typescript
// Each build increments sequence
const users = userFactory.buildList(3);

console.log(users);
// [
//   { id: 1, email: 'user1@example.com' },
//   { id: 2, email: 'user2@example.com' },
//   { id: 3, email: 'user3@example.com' },
// ]
```

### Build Hooks

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

### Nested Factories

```typescript
// Complex data structure
const threadWithReplies = postFactory.build({
  comments: commentFactory.buildList(3, {
    user: userFactory.admin.build(),
  }),
});
```

## Best Practices

1. **One factory per entity** - Separate concerns
2. **Use sensible defaults** - Defaults should pass validation
3. **Use traits for variations** - Admin, inactive, etc.
4. **Keep factories simple** - Avoid complex logic
5. **Use transient params** - For conditional includes
6. **Test your factories** - Ensure they create valid data

## Benefits

- **Reduced test noise** - Only specify relevant fields
- **Reusability** - Share fixtures across tests
- **Type safety** - TypeScript ensures valid data
- **Maintainability** - Update defaults in one place
- **Readability** - Clear intent in tests

## Related Resources

- [Fishery GitHub](https://github.com/thoughtbot/fishery)
- [Stepping up Test Fixture Game with Fishery](https://medium.com/leaselock-engineering/stepping-up-our-test-fixture-game-with-fishery-be22b76d1f22)
