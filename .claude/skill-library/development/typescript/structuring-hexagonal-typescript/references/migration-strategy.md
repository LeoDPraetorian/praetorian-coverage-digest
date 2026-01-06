# Migration Strategy

**How to refactor existing monolithic TypeScript code into hexagonal architecture.**

## Overview

Migrating to hexagonal architecture is **incremental**, not big-bang. You don't rewrite everything at once.

**Key principle:** Start with one feature/module and refactor it completely before moving to the next.

---

## Step-by-Step Migration Path

### Step 1: Identify a Bounded Context

Pick one feature/module to refactor first:

**Good candidates:**

- User management (authentication, profiles)
- Order processing
- Payment handling
- Notification service

**Avoid starting with:**

- Shared utilities (refactor these last)
- Core infrastructure (database, logging)
- Features with high coupling to everything

**Choose a module that:**

- Has clear boundaries
- Has few dependencies on other modules
- Can be tested in isolation

---

### Step 2: Extract Domain Entities

Find the core business objects and extract them from infrastructure code.

**Before (monolithic):**

```typescript
// user.controller.ts (everything mixed together)
export class UserController {
  async createUser(req: Request, res: Response) {
    // Validation
    if (!req.body.email) return res.status(400).send("Email required");

    // Business logic
    const user = {
      id: uuid(),
      email: req.body.email,
      name: req.body.name,
      createdAt: new Date(),
    };

    // Persistence
    await db.query("INSERT INTO users...", [user.id, user.email, user.name]);

    // External API
    await sendWelcomeEmail(user.email);

    res.json(user);
  }
}
```

**After (domain extracted):**

```typescript
// core/domain/user.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly createdAt: Date
  ) {}

  static create(data: { email: string; name: string }): User {
    if (!data.email) throw new Error("Email required");
    return new User(uuid(), data.email, data.name, new Date());
  }
}
```

---

### Step 3: Define Ports (Interfaces)

Create interfaces for all external dependencies.

```typescript
// core/ports/user-repository.port.ts
export interface UserRepositoryPort {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

// core/ports/email-service.port.ts
export interface EmailServicePort {
  sendWelcome(email: string): Promise<void>;
}
```

---

### Step 4: Create Service Layer

Move business logic from controllers to services.

```typescript
// core/services/user.service.ts
export class UserService {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly emailService: EmailServicePort
  ) {}

  async createUser(data: { email: string; name: string }): Promise<User> {
    const user = User.create(data);
    await this.userRepo.save(user);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

---

### Step 5: Implement Adapters

Create concrete implementations of ports.

```typescript
// adapters/secondary/persistence/postgres-user.repository.ts
export class PostgresUserRepository implements UserRepositoryPort {
  constructor(private db: Database) {}

  async save(user: User): Promise<void> {
    await this.db.query("INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4)", [
      user.id,
      user.email,
      user.name,
      user.createdAt,
    ]);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return row ? this.mapToUser(row) : null;
  }

  private mapToUser(row: any): User {
    return new User(row.id, row.email, row.name, row.created_at);
  }
}
```

---

### Step 6: Thin the Controller

Make controller a thin adapter (HTTP → domain).

```typescript
// adapters/primary/http/user.controller.ts
export class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser(req: Request, res: Response) {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

---

### Step 7: Wire Dependencies in Composition Root

Update main.ts to wire the new architecture.

```typescript
// main.ts
import { PostgresUserRepository } from "./adapters/secondary/persistence/postgres-user.repository";
import { SendGridEmailService } from "./adapters/secondary/email/sendgrid-email.service";
import { UserService } from "./core/services/user.service";
import { UserController } from "./adapters/primary/http/user.controller";

// Infrastructure
const db = new Database(process.env.DATABASE_URL);

// Adapters
const userRepo = new PostgresUserRepository(db);
const emailService = new SendGridEmailService(process.env.SENDGRID_API_KEY);

// Core service
const userService = new UserService(userRepo, emailService);

// Primary adapter
const userController = new UserController(userService);

// Existing app
app.use("/api/users", userController.router);
```

---

### Step 8: Add Tests

Write unit tests for core service (now easy!).

```typescript
// core/services/user.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { UserService } from "./user.service";

describe("UserService", () => {
  it("creates user and sends welcome email", async () => {
    const mockRepo = {
      save: vi.fn(),
      findById: vi.fn(),
    };

    const mockEmail = {
      sendWelcome: vi.fn(),
    };

    const service = new UserService(mockRepo, mockEmail);

    await service.createUser({ email: "test@example.com", name: "Test" });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockEmail.sendWelcome).toHaveBeenCalledWith("test@example.com");
  });
});
```

---

### Step 9: Repeat for Next Module

Once one module is refactored and tested:

1. Pick next bounded context
2. Repeat steps 2-8
3. Gradually migrate entire application

---

## Handling Legacy Dependencies

### Problem: Existing code depends on old structure

**Solution: Adapter pattern for legacy code**

```typescript
// Legacy code still uses old UserService
import { OldUserService } from "./legacy/user.service";

// Create adapter that implements old interface but uses new architecture
export class UserServiceAdapter implements OldUserService {
  constructor(private newUserService: UserService) {}

  async createUser(data: any) {
    // Translate old API to new API
    const user = await this.newUserService.createUser({
      email: data.email,
      name: data.name,
    });

    // Return in old format
    return {
      user_id: user.id,
      email_address: user.email,
    };
  }
}
```

This allows legacy code to keep working while you migrate incrementally.

---

## Common Migration Pitfalls

### ❌ Pitfall 1: Big Bang Rewrite

**Problem:** Trying to refactor entire application at once.

**Solution:** Migrate one module at a time. Keep app working throughout.

---

### ❌ Pitfall 2: Over-Engineering Ports

**Problem:** Creating ports with dozens of methods upfront.

**Solution:** Start with minimal ports (2-3 methods). Add methods as needed.

---

### ❌ Pitfall 3: Skipping Tests

**Problem:** Refactoring without tests to verify behavior unchanged.

**Solution:** Write tests BEFORE refactoring (characterization tests). Ensure same behavior after.

---

### ❌ Pitfall 4: Breaking Existing Functionality

**Problem:** Migration breaks existing features.

**Solution:** Use feature flags to run old and new code side-by-side. Gradually cut over.

```typescript
if (featureFlags.useNewUserService) {
  return newUserService.createUser(data);
} else {
  return oldUserService.createUser(data);
}
```

---

## Migration Checklist

For each module:

- [ ] Identify bounded context and clear boundaries
- [ ] Extract domain entities from controllers/infrastructure
- [ ] Define ports (interfaces) for external dependencies
- [ ] Create service layer with business logic
- [ ] Implement adapters (repositories, external APIs)
- [ ] Thin controllers to become HTTP adapters
- [ ] Wire dependencies in composition root
- [ ] Add unit tests for core service
- [ ] Add integration tests for adapters
- [ ] Remove old code after verification
- [ ] Update documentation

---

## Timeline Estimation

| Codebase Size        | Modules to Migrate | Estimated Time |
| -------------------- | ------------------ | -------------- |
| Small (< 10k LOC)    | 3-5 modules        | 2-4 weeks      |
| Medium (10k-50k LOC) | 10-15 modules      | 2-3 months     |
| Large (> 50k LOC)    | 20+ modules        | 6-12 months    |

**Note:** These are incremental migrations - the application keeps running throughout.

---

## Success Criteria

You'll know the migration is successful when:

- ✅ Business logic is in core services (no infrastructure dependencies)
- ✅ Core services have 80%+ unit test coverage
- ✅ Adapters are thin (< 50 lines per method)
- ✅ Controllers have no business logic
- ✅ Can swap adapters (e.g., PostgreSQL → MongoDB) without touching core
- ✅ Tests run fast (< 1 second for unit tests)
- ✅ New features are easy to add (extend ports, add adapters)
