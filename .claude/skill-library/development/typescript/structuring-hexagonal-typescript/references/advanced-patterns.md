# Advanced Patterns

## 1. Multiple Primary Adapters

Support different entry points (HTTP, GraphQL, CLI) using the same core:

```typescript
// Shared core service
export class UserService {
  constructor(private repo: UserRepositoryPort) {}

  async createUser(data: CreateUserDTO) {
    // Business logic (shared across all adapters)
  }
}

// HTTP adapter
export class UserController {
  constructor(private userService: UserService) {}

  async create(req: Request, res: Response) {
    const user = await this.userService.createUser(req.body);
    res.json(user);
  }
}

// GraphQL adapter
export const userResolvers = {
  Mutation: {
    createUser: (_, args, { userService }) => {
      return userService.createUser(args.input);
    },
  },
};

// CLI adapter
export class UserCommand {
  constructor(private userService: UserService) {}

  async execute(args: string[]) {
    const user = await this.userService.createUser({
      email: args[0],
      name: args[1],
    });
    console.log(`Created user: ${user.id}`);
  }
}
```

**Benefits:**

- Same business logic works across all interfaces
- Add new primary adapters without changing core
- Test business logic once, not per adapter

---

## 2. Event-Driven Architecture with Ports

Use ports for event publishing:

```typescript
// Event port (interface)
export interface EventPublisherPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
}

// Domain event
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date
  ) {}
}

// Service publishes events
export class UserService {
  constructor(
    private repo: UserRepositoryPort,
    private eventPublisher: EventPublisherPort
  ) {}

  async createUser(data: CreateUserDTO) {
    const user = User.create(data);
    await this.repo.save(user);

    // Publish domain event
    await this.eventPublisher.publish(new UserCreatedEvent(user.id, user.email, new Date()));

    return user;
  }
}

// Event adapter (AWS EventBridge)
export class EventBridgePublisher implements EventPublisherPort {
  async publish<T>(event: DomainEvent<T>) {
    await eventBridge.putEvents({
      Entries: [
        {
          Source: "user-service",
          DetailType: event.constructor.name,
          Detail: JSON.stringify(event),
        },
      ],
    });
  }
}

// Event adapter (in-memory for tests)
export class InMemoryEventPublisher implements EventPublisherPort {
  public events: DomainEvent<any>[] = [];

  async publish<T>(event: DomainEvent<T>) {
    this.events.push(event);
  }
}
```

---

## 3. CQRS with Hexagonal Architecture

Separate read and write models:

```typescript
// Write side (commands)
export interface UserWriteRepositoryPort {
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {}
}

export class UserCommandService {
  constructor(private repo: UserWriteRepositoryPort) {}

  async handle(command: CreateUserCommand) {
    const user = User.create(command);
    await this.repo.save(user);
  }
}

// Read side (queries)
export interface UserReadRepositoryPort {
  findById(id: string): Promise<UserView | null>;
  list(filters: UserFilters): Promise<UserView[]>;
}

export class UserView {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly orderCount: number, // Denormalized
    public readonly totalSpent: number // Denormalized
  ) {}
}

export class UserQueryService {
  constructor(private repo: UserReadRepositoryPort) {}

  async getUserById(id: string): Promise<UserView> {
    const user = await this.repo.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}
```

**Benefits:**

- Optimize reads separately from writes
- Different storage for commands and queries (PostgreSQL for writes, Elasticsearch for reads)
- Scale read and write workloads independently

---

## 4. Cross-Cutting Concerns (Logging, Metrics)

Use decorator pattern for ports:

```typescript
// Logging decorator
export class LoggingUserRepository implements UserRepositoryPort {
  constructor(
    private inner: UserRepositoryPort,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<User | null> {
    this.logger.info("Finding user", { id });
    const result = await this.inner.findById(id);
    this.logger.info("Found user", { id, exists: !!result });
    return result;
  }

  async save(user: User): Promise<void> {
    this.logger.info("Saving user", { userId: user.id });
    await this.inner.save(user);
    this.logger.info("Saved user", { userId: user.id });
  }
}

// Metrics decorator
export class MetricsUserRepository implements UserRepositoryPort {
  constructor(
    private inner: UserRepositoryPort,
    private metrics: MetricsClient
  ) {}

  async findById(id: string): Promise<User | null> {
    const start = Date.now();
    try {
      const result = await this.inner.findById(id);
      this.metrics.histogram("user_repo.find_by_id.duration", Date.now() - start);
      this.metrics.increment("user_repo.find_by_id.success");
      return result;
    } catch (error) {
      this.metrics.increment("user_repo.find_by_id.error");
      throw error;
    }
  }
}

// Composition with decorators
const baseRepo = new PostgresUserRepository(db);
const loggedRepo = new LoggingUserRepository(baseRepo, logger);
const metricsRepo = new MetricsUserRepository(loggedRepo, metrics);
const userService = new UserService(metricsRepo);
```

---

## 5. Transaction Management

Handle transactions across multiple operations:

```typescript
// Transaction port
export interface UnitOfWorkPort {
  execute<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

// Transaction context passed to repositories
export interface TransactionContext {
  userRepo: UserRepositoryPort;
  orderRepo: OrderRepositoryPort;
}

// Service uses unit of work
export class OrderService {
  constructor(private unitOfWork: UnitOfWorkPort) {}

  async createOrder(userId: string, items: OrderItem[]) {
    return this.unitOfWork.execute(async (tx) => {
      const user = await tx.userRepo.findById(userId);
      if (!user) throw new Error("User not found");

      const order = Order.create({ userId, items });
      await tx.orderRepo.save(order);

      // Both operations succeed or both fail
      return order;
    });
  }
}

// PostgreSQL adapter
export class PostgresUnitOfWork implements UnitOfWorkPort {
  constructor(private pool: Pool) {}

  async execute<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const tx: TransactionContext = {
        userRepo: new PostgresUserRepository(client),
        orderRepo: new PostgresOrderRepository(client),
      };

      const result = await work(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## 6. Handling Async Operations (Background Jobs)

Use ports for job scheduling:

```typescript
// Job scheduler port
export interface JobSchedulerPort {
  schedule<T>(job: Job<T>): Promise<void>;
}

export class Job<T> {
  constructor(
    public readonly type: string,
    public readonly payload: T,
    public readonly scheduleAt: Date
  ) {}
}

// Service schedules background work
export class UserService {
  constructor(
    private repo: UserRepositoryPort,
    private jobScheduler: JobSchedulerPort
  ) {}

  async createUser(data: CreateUserDTO) {
    const user = User.create(data);
    await this.repo.save(user);

    // Schedule async work
    await this.jobScheduler.schedule(
      new Job("send-welcome-email", { userId: user.id }, new Date())
    );

    return user;
  }
}

// AWS SQS adapter
export class SqsJobScheduler implements JobSchedulerPort {
  async schedule<T>(job: Job<T>) {
    await sqs.sendMessage({
      QueueUrl: process.env.JOB_QUEUE_URL,
      MessageBody: JSON.stringify(job),
    });
  }
}

// In-memory adapter (for tests)
export class InMemoryJobScheduler implements JobSchedulerPort {
  public jobs: Job<any>[] = [];

  async schedule<T>(job: Job<T>) {
    this.jobs.push(job);
  }
}
```

---

## 7. API Versioning

Support multiple API versions with same core:

```typescript
// Core service (version-agnostic)
export class UserService {
  async createUser(data: CreateUserDTO) {
    /* ... */
  }
}

// V1 adapter
export class UserControllerV1 {
  constructor(private userService: UserService) {}

  async create(req: Request, res: Response) {
    const user = await this.userService.createUser({
      email: req.body.email,
      name: req.body.name,
    });

    // V1 response format
    res.json({
      user_id: user.id,
      email_address: user.email,
    });
  }
}

// V2 adapter (new format)
export class UserControllerV2 {
  constructor(private userService: UserService) {}

  async create(req: Request, res: Response) {
    const user = await this.userService.createUser(req.body);

    // V2 response format (camelCase, more fields)
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });
  }
}
```

---

## Summary

| Pattern                   | Use Case                              | Benefit                             |
| ------------------------- | ------------------------------------- | ----------------------------------- |
| Multiple primary adapters | Support HTTP, GraphQL, CLI            | Reuse core across interfaces        |
| Event-driven architecture | Decouple services, async processing   | Loose coupling, scalability         |
| CQRS                      | Optimize reads separately from writes | Performance, scalability            |
| Decorators                | Add logging, metrics, caching         | Clean cross-cutting concerns        |
| Unit of Work              | Manage transactions                   | Atomic operations across aggregates |
| Job scheduling            | Background processing, async tasks    | Non-blocking operations             |
| API versioning            | Support multiple API versions         | Evolve API without breaking clients |
