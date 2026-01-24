# DynamoDB Conditional Expression Patterns

**Complex business logic in DynamoDB conditions for Chariot's job processing system.**

---

## Problem Statement

Job insertion with retry/rescan logic requires conditional writes to prevent duplicate work while enabling automatic retries.

---

## Pattern: Complex Business Logic in DynamoDB Conditions

**Chariot Solution:**

```go
func (t *DynamoDBTable) InsertJob(job model.Job) error {
    getBackwardsDate := func(duration time.Duration) string {
        return time.Now().Add(duration).Format(time.RFC3339)
    }

    rerunThreshold := getBackwardsDate(-12 * time.Hour)
    backupOverwriteThreshold := getBackwardsDate(-2 * 24 * time.Hour)

    condition, _ := expression.NewBuilder().WithCondition(expression.Or(
        // Condition 1: Job doesn't exist yet
        expression.AttributeNotExists(expression.Name("key")),

        // Condition 2: Previous job failed
        expression.BeginsWith(expression.Name("status"), model.Fail),

        // Condition 3: This is a returning async job
        IsReturningAsyncJob(job.GetStatus()),

        // Condition 4: Previous job > 12 hours old and passed
        expression.And(
            expression.BeginsWith(expression.Name("status"), model.Pass),
            expression.LessThan(expression.Name("created"), expression.Value(rerunThreshold)),
        ),

        // Condition 5: Previous job marked as repeatable
        expression.Equal(expression.Name("allowRepeat"), expression.Value(true)),

        // Condition 6: Safety net - force re-queue if > 2 days old
        expression.LessThan(expression.Name("created"), expression.Value(backupOverwriteThreshold)),
    )).Build()

    return t.InsertWithCondition(&job, condition)
}

func IsReturningAsyncJob(inboundStatus string) expression.ConditionBuilder {
    preexistingStatus := "NOMATCH"
    if inboundStatus == model.AsyncReturning {
        preexistingStatus = model.AsyncRunning
    }
    return expression.BeginsWith(expression.Name("status"), preexistingStatus)
}
```

---

## Why This Matters

1. **Prevents duplicate work:** Condition check ensures job not re-queued unnecessarily
2. **Enables retry logic:** Failed jobs can be retried without manual intervention
3. **Supports rescans:** allowRepeat flag for security monitoring
4. **Safety net:** 2-day threshold prevents stuck jobs

---

## Conditional Error Handling

```go
func (t *DynamoDBTable) InsertWithCondition(item model.TableModel, cond expression.Expression) error {
    err := t.save(item, cond)

    // Conditional check failures are business logic, not errors
    if err != nil && !conditional(err) {
        slog.Error("failed to insert item", "error", err, "item", item)
    }

    return err
}

func conditional(err error) bool {
    if err == nil {
        return false
    }
    var condErr *types.ConditionalCheckFailedException
    return errors.As(err, &condErr)
}
```

---

## Related Patterns

- [chariot-patterns.md](chariot-patterns.md) - Multi-tenant patterns overview
- [error-handling.md](error-handling.md) - AWS error handling patterns

---

**Source:** `modules/chariot/backend/pkg/cloud/service/services/dynamodb/dynamodb.go`
