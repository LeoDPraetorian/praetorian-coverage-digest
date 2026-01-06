---
name: structuring-hexagonal-typescript
description: Use when designing TypeScript applications with clean architecture - covers ports and adapters pattern, dependency inversion, and testable architecture boundaries
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Structuring Hexagonal TypeScript Applications

**Design TypeScript applications with clean architecture using the Ports and Adapters pattern.**

## When to Use

Use this skill when:

- Designing new TypeScript applications from scratch
- Refactoring monolithic code into clean architecture
- Need to make business logic testable in isolation
- Want to decouple business logic from infrastructure
- Building applications with multiple adapters (REST, GraphQL, CLI, etc.)
- Need to swap implementations (mock DB in tests, switch from PostgreSQL to MongoDB, etc.)

## Core Concept

Hexagonal Architecture (Ports & Adapters) isolates business logic from external systems:

```
        [Primary Adapters]
              ↓
    [Ports] → CORE DOMAIN ← [Ports]
              ↑
       [Secondary Adapters]
```

**Key Principles:**

- **Core Domain** - Pure business logic (no I/O, no frameworks)
- **Ports** - Interfaces (contracts) defining how core communicates
- **Primary Adapters** - Driving adapters (HTTP controllers, CLI commands, GraphQL resolvers)
- **Secondary Adapters** - Driven adapters (databases, external APIs, file systems)

## Quick Reference

| Layer    | Purpose                          | Contains                              | Dependencies          |
| -------- | -------------------------------- | ------------------------------------- | --------------------- |
| Domain   | Business entities, value objects | User, Order, Email (value object)     | None                  |
| Ports    | Interface contracts              | UserRepository, EmailService (ports)  | Domain only           |
| Services | Business logic                   | UserService, OrderService             | Ports + Domain        |
| Adapters | Infrastructure implementations   | PostgresUserRepository, SendGridEmail | Ports + External libs |
| Main     | Composition root                 | Dependency injection, wiring          | Everything            |

## Directory Structure

```
src/
├── core/                    # Domain layer (pure, no I/O)
│   ├── domain/              # Entities, value objects
│   │   ├── user.ts
│   │   ├── order.ts
│   │   └── email.ts
│   ├── ports/               # Interfaces (contracts)
│   │   ├── user-repository.port.ts
│   │   ├── email-service.port.ts
│   │   └── payment-gateway.port.ts
│   └── services/            # Business logic
│       ├── user.service.ts
│       └── order.service.ts
├── adapters/                # Infrastructure implementations
│   ├── primary/             # Driving (API, CLI, etc.)
│   │   ├── http/
│   │   │   ├── user.controller.ts
│   │   │   └── order.controller.ts
│   │   └── cli/
│   │       └── commands.ts
│   └── secondary/           # Driven (DB, external APIs)
│       ├── persistence/
│       │   ├── postgres-user.repository.ts
│       │   └── postgres-order.repository.ts
│       ├── email/
│       │   └── sendgrid-email.service.ts
│       └── payment/
│           └── stripe-payment.gateway.ts
└── main.ts                  # Composition root
```

## Implementation Pattern

### 1. Define Domain Entity

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
    return new User(generateId(), data.email, data.name, new Date());
  }

  updateName(newName: string): User {
    return new User(this.id, this.email, newName, this.createdAt);
  }
}
```

### 2. Define Port (Interface)

```typescript
// core/ports/user-repository.port.ts
import { User } from "../domain/user";

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 3. Implement Service (Business Logic)

```typescript
// core/services/user.service.ts
import { User } from "../domain/user";
import { UserRepositoryPort } from "../ports/user-repository.port";
import { EmailServicePort } from "../ports/email-service.port";

export class UserService {
  constructor(
    private readonly userRepo: UserRepositoryPort, // Depends on PORT, not implementation
    private readonly emailService: EmailServicePort
  ) {}

  async createUser(data: { email: string; name: string }): Promise<User> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const user = User.create(data);
    await this.userRepo.save(user);
    await this.emailService.sendWelcome(user.email);

    return user;
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}
```

### 4. Implement Adapter (Infrastructure)

```typescript
// adapters/secondary/persistence/postgres-user.repository.ts
import { UserRepositoryPort } from "../../../core/ports/user-repository.port";
import { User } from "../../../core/domain/user";

export class PostgresUserRepository implements UserRepositoryPort {
  constructor(private readonly db: PostgresClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return row ? this.mapToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query("SELECT * FROM users WHERE email = $1", [email]);
    return row ? this.mapToUser(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db.query(
      "INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $3",
      [user.id, user.email, user.name, user.createdAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.query("DELETE FROM users WHERE id = $1", [id]);
  }

  private mapToUser(row: any): User {
    return new User(row.id, row.email, row.name, row.created_at);
  }
}
```

### 5. Composition Root (Dependency Injection)

```typescript
// main.ts
import { PostgresClient } from "./adapters/secondary/persistence/postgres-client";
import { PostgresUserRepository } from "./adapters/secondary/persistence/postgres-user.repository";
import { SendGridEmailService } from "./adapters/secondary/email/sendgrid-email.service";
import { UserService } from "./core/services/user.service";
import { UserController } from "./adapters/primary/http/user.controller";

// Infrastructure setup
const db = new PostgresClient(process.env.DATABASE_URL);
const emailApiKey = process.env.SENDGRID_API_KEY;

// Adapters
const userRepo = new PostgresUserRepository(db);
const emailService = new SendGridEmailService(emailApiKey);

// Core services
const userService = new UserService(userRepo, emailService);

// Primary adapters
const userController = new UserController(userService);

// Start application
const app = express();
app.use("/api/users", userController.router);
app.listen(3000);
```

## Testing Benefits

Hexagonal architecture makes unit testing trivial:

```typescript
// user.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { UserService } from "./user.service";
import { UserRepositoryPort } from "../ports/user-repository.port";
import { EmailServicePort } from "../ports/email-service.port";

describe("UserService", () => {
  it("creates user and sends welcome email", async () => {
    // Mock ports (no real DB, no real email API)
    const mockRepo: UserRepositoryPort = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      delete: vi.fn(),
    };

    const mockEmail: EmailServicePort = {
      sendWelcome: vi.fn(),
    };

    const service = new UserService(mockRepo, mockEmail);

    // Test business logic in isolation
    await service.createUser({ email: "test@example.com", name: "Test User" });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockEmail.sendWelcome).toHaveBeenCalledWith("test@example.com");
  });
});
```

**Key testing advantages:**

- ✅ No database required for unit tests
- ✅ No external API calls (instant tests)
- ✅ Test business logic in isolation
- ✅ Easy to test error scenarios
- ✅ Mocks are simple (just implement interface)

## Common Mistakes to Avoid

**See:** [references/common-mistakes.md](references/common-mistakes.md)

## Advanced Patterns

**See:** [references/advanced-patterns.md](references/advanced-patterns.md)

- Multiple primary adapters (HTTP + GraphQL + CLI)
- Event-driven architecture with ports
- CQRS with hexagonal architecture
- Handling cross-cutting concerns (logging, metrics)

## Migration Strategy

**See:** [references/migration-strategy.md](references/migration-strategy.md)

- How to refactor existing monolithic code
- Step-by-step migration path
- Handling legacy dependencies

## Related Skills

- `developing-with-tdd` - Write tests first to drive port design
- `adhering-to-dry` - Reuse patterns across adapters
- `implementing-result-either-pattern` - Error handling in core domain

## References

**External resources:**

- [Hexagonal Architecture by Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Hexagon (GitHub)](https://github.com/Sairyss/domain-driven-hexagon)
- [Ports and Adapters with TypeScript](https://betterprogramming.pub/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
