# Structured Logging for Security Observability

**Chariot's slog-based logging patterns with consistent field names for CloudWatch Logs Insights queries.**

---

## Pattern: slog with Consistent Field Names

**Chariot Standard:**

```go
import "log/slog"

// Success operations (Info level)
slog.Info("deleting item", "key", key, "tenant", t.Partition)

// Business logic (Debug level)
slog.Debug("conditional check failed",
    "code", "ConditionalCheckFailedException",
    "item", item,
)

// Errors (Error level with structured fields)
slog.Error("failed to insert item",
    "error", err,
    "table", tableName,
    "item", item,
    "tenant", t.Username,
)

// Security events (Warn level)
slog.Warn("unauthorized access attempt",
    "user", user.Username,
    "tenant", t.Partition,
    "resource", resourceKey,
)
```

---

## Consistent Field Names

| Field       | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `tenant`    | string | Tenant identifier (Username/Partition) |
| `user`      | string | Calling user (for audit)               |
| `error`     | error  | Go error object                        |
| `key`       | string | DynamoDB sort key                      |
| `table`     | string | DynamoDB table name                    |
| `file`      | string | S3 key                                 |
| `bucket`    | string | S3 bucket                              |
| `requestID` | string | AWS request ID                         |

---

## CloudWatch Logs Insights Query

```
fields @timestamp, tenant, user, @message
| filter tenant = "customer-123"
| filter @message like /failed/
| sort @timestamp desc
| limit 100
```

---

## Related Patterns

- [chariot-patterns.md](chariot-patterns.md) - Multi-tenant patterns overview
- [error-handling.md](error-handling.md) - AWS error handling patterns

---

**Source:** `modules/chariot/backend/pkg/cloud/service/services/`
