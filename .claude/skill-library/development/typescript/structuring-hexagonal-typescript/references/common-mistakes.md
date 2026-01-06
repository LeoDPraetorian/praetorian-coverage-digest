# Common Mistakes to Avoid

## 1. Leaking Infrastructure into Core

**❌ WRONG:**

```typescript
// core/services/user.service.ts
import { PostgresClient } from "../../adapters/persistence/postgres";

export class UserService {
  constructor(private db: PostgresClient) {} // Concrete dependency!
}
```

**✅ RIGHT:**

```typescript
// core/services/user.service.ts
import { UserRepositoryPort } from "../ports/user-repository.port";

export class UserService {
  constructor(private repo: UserRepositoryPort) {} // Interface dependency
}
```

**Why:** Core should never know about PostgreSQL, MongoDB, or any specific technology. Use ports (interfaces) instead.

---

## 2. Business Logic in Adapters

**❌ WRONG:**

```typescript
// adapters/http/user.controller.ts
async createUser(req, res) {
  const existing = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
  if (existing) {
    return res.status(400).send('User exists');  // Business logic in controller!
  }
  // More business logic here...
}
```

**✅ RIGHT:**

```typescript
// adapters/http/user.controller.ts
async createUser(req, res) {
  try {
    const user = await this.userService.createUser(req.body);  // Delegate to service
    res.status(201).json(user);
  } catch (error) {
    res.status(400).send(error.message);
  }
}

// core/services/user.service.ts
async createUser(data) {
  const existing = await this.userRepo.findByEmail(data.email);
  if (existing) throw new Error('User exists');  // Business logic in service
  // ...
}
```

**Why:** Controllers should be thin - just translate HTTP to domain calls.

---

## 3. Port Methods That Are Too Specific

**❌ WRONG:**

```typescript
// core/ports/user-repository.port.ts
export interface UserRepositoryPort {
  executeSql(query: string, params: any[]): Promise<any>; // Leaks SQL!
}
```

**✅ RIGHT:**

```typescript
// core/ports/user-repository.port.ts
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

**Why:** Ports should be technology-agnostic. SQL knowledge should stay in adapters.

---

## 4. Anemic Domain Models

**❌ WRONG:**

```typescript
// Domain is just data (no behavior)
export class User {
  id: string;
  email: string;
  name: string;
}

// All logic in service (procedural)
export class UserService {
  updateUserName(userId: string, newName: string) {
    const user = await this.repo.findById(userId);
    user.name = newName; // Service mutates entity
    await this.repo.save(user);
  }
}
```

**✅ RIGHT:**

```typescript
// Domain has behavior
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string
  ) {}

  updateName(newName: string): User {
    return new User(this.id, this.email, newName); // Entity knows how to update itself
  }
}

// Service coordinates
export class UserService {
  async updateUserName(userId: string, newName: string) {
    const user = await this.repo.findById(userId);
    const updated = user.updateName(newName); // Entity handles logic
    await this.repo.save(updated);
  }
}
```

**Why:** Domain entities should contain business logic. Services coordinate entities but don't replace them.

---

## 5. Multiple Responsibilities in Services

**❌ WRONG:**

```typescript
export class UserService {
  async createUser(data) {
    /* ... */
  }
  async deleteUser(id) {
    /* ... */
  }
  async generateReport() {
    /* ... */
  } // Reporting?
  async exportToCsv() {
    /* ... */
  } // Export?
  async sendBulkEmails() {
    /* ... */
  } // Email campaign?
}
```

**✅ RIGHT:**

```typescript
// One service per aggregate/bounded context
export class UserService {
  async createUser(data) {
    /* ... */
  }
  async deleteUser(id) {
    /* ... */
  }
}

export class ReportingService {
  async generateUserReport() {
    /* ... */
  }
  async exportToCsv() {
    /* ... */
  }
}

export class EmailCampaignService {
  async sendBulkEmails() {
    /* ... */
  }
}
```

**Why:** Follow Single Responsibility Principle. Split services by business capability.

---

## 6. Testing Through Adapters

**❌ WRONG:**

```typescript
// Integration test disguised as unit test
describe("UserService", () => {
  it("creates user", async () => {
    const db = new PostgresClient(testDbUrl); // Real DB!
    const repo = new PostgresUserRepository(db);
    const service = new UserService(repo);
    // Slow, fragile test
  });
});
```

**✅ RIGHT:**

```typescript
// True unit test
describe("UserService", () => {
  it("creates user", async () => {
    const mockRepo = createMock<UserRepositoryPort>(); // Mock port
    const service = new UserService(mockRepo);
    // Fast, isolated test
  });
});
```

**Why:** Unit tests should test business logic without infrastructure. Integration tests are separate.

---

## 7. Fat Composition Root

**❌ WRONG:**

```typescript
// main.ts has business logic
const app = express();
app.post('/users', async (req, res) => {
  const existing = await db.query(...);  // Logic in main!
  if (existing) return res.status(400).send('Exists');
  // More logic...
});
```

**✅ RIGHT:**

```typescript
// main.ts only wires dependencies
const db = new PostgresClient(dbUrl);
const userRepo = new PostgresUserRepository(db);
const userService = new UserService(userRepo);
const userController = new UserController(userService);

const app = express();
app.use("/users", userController.router); // Clean wiring
```

**Why:** Composition root should only instantiate and wire dependencies, not contain logic.

---

## Summary

| Mistake                    | Problem                    | Solution                      |
| -------------------------- | -------------------------- | ----------------------------- |
| Infrastructure in core     | Can't test without real DB | Use ports (interfaces)        |
| Business logic in adapters | Logic scattered everywhere | Move to services/entities     |
| Technology-specific ports  | Can't swap implementations | Use domain language           |
| Anemic domain models       | Procedural code, not OOP   | Add behavior to entities      |
| God services               | Hard to understand/test    | Split by business capability  |
| Testing through adapters   | Slow, fragile tests        | Test core with mocks          |
| Fat composition root       | Logic leaks into wiring    | Only instantiate/wire in main |
