# Account Assumption with RBAC

**Pattern for Managed Service Providers (MSPs) to assume customer accounts while maintaining audit trail.**

---

## Problem Statement

Managed Service Providers (MSPs) need to assume customer accounts for security monitoring while:
- Maintaining clear audit trail of who accessed what
- Enforcing role-based access control (RBAC)
- Preventing unauthorized cross-tenant access

---

## Solution: Separate Username from User

**Key Insight:** Distinguish between the **tenant being accessed** (Username) and the **calling user** (User).

```go
type DynamoDBTable struct {
    Client   *dynamodb.Client

    // Username: The tenant we're operating in (may be assumed)
    Username string

    // User: The actual calling user (for audit)
    User *model.User

    // Authorized users map for cross-tenant RBAC
    authorizedUsers map[string]bool
}

// Example: MSP user "msp-admin" assumes "customer-123" account
table := NewDynamoDBTable(cfg, "customer-123")
table.User = &model.User{Username: "msp-admin", Email: "admin@msp.com"}
table.authorizedUsers = map[string]bool{
    "msp-admin":   true,
    "msp-analyst": true,
}
```

---

## Audit Log Entry

```json
{
  "timestamp": "2024-01-04T10:30:00Z",
  "action": "DeleteAsset",
  "callingUser": "msp-admin@msp.com",
  "assumedTenant": "customer-123",
  "assetKey": "asset#456",
  "authorized": true
}
```

---

## Query Authorization Check

```go
func (t *DynamoDBTable) isAuthorized(user *model.User) bool {
    // User operating in their own tenant - always authorized
    if user.Username == t.Username {
        return true
    }

    // Cross-tenant access - check authorized users list
    return t.authorizedUsers[user.Username]
}

func (t *DynamoDBTable) Query(search query.TableSearch) *query.TableSearch {
    if !t.isAuthorized(t.User) {
        slog.Warn("unauthorized cross-tenant access attempt",
            "user", t.User.Username,
            "tenant", t.Username,
        )
        return &query.TableSearch{Error: ErrUnauthorized}
    }

    // Proceed with tenant-scoped query
    // ...
}
```

---

## Related Patterns

- [chariot-patterns.md](chariot-patterns.md) - Multi-tenant patterns overview
- [security-patterns.md](security-patterns.md) - IAM and security best practices
- [logging-patterns.md](logging-patterns.md) - Audit logging patterns

---

**Source:** `modules/chariot/backend/pkg/cloud/service/services/dynamodb/dynamodb.go`
