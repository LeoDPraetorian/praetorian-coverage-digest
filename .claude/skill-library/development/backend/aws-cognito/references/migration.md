# Migration Patterns

Strategies for migrating users from other authentication systems to Cognito.

## Table of Contents

- [Migration Strategies](#migration-strategies)
- [Bulk Import](#bulk-import)
- [Just-in-Time Migration](#just-in-time-migration)
- [Password Migration](#password-migration)
- [Testing Migration](#testing-migration)

## Migration Strategies

### Strategy Comparison

| Strategy      | User Experience | Complexity | Data Preservation     | Timeline  |
| ------------- | --------------- | ---------- | --------------------- | --------- |
| Bulk Import   | Password reset  | Low        | Attributes only       | Immediate |
| JIT Migration | Seamless        | Medium     | Full (incl. password) | Gradual   |
| Hybrid        | Mixed           | High       | Full                  | Phased    |

### Decision Guide

```
Do you have access to plaintext passwords?
├─ NO → Bulk Import (users reset passwords)
└─ YES → Are passwords in supported hash format?
        ├─ YES → Bulk Import with hash
        └─ NO → JIT Migration (verify on login)
```

## Bulk Import

### CSV Import Format

```csv
name,given_name,family_name,email,email_verified,phone_number,phone_number_verified,username,cognito:mfa_enabled,custom:tenant_id
John Doe,John,Doe,john@example.com,true,+12025551234,false,john.doe,false,tenant-123
Jane Smith,Jane,Smith,jane@example.com,true,+12025555678,true,jane.smith,true,tenant-456
```

### Import via CLI

```bash
# Create import job
aws cognito-idp create-user-import-job \
    --user-pool-id us-east-1_XXXXX \
    --job-name "migration-batch-1" \
    --cloud-watch-logs-role-arn arn:aws:iam::123456789:role/CognitoImportRole

# Get pre-signed URL for CSV upload
aws cognito-idp describe-user-import-job \
    --user-pool-id us-east-1_XXXXX \
    --job-id import-XXXXX

# Upload CSV to pre-signed URL
curl -X PUT -H "Content-Type: text/csv" \
    --data-binary @users.csv \
    "PRE_SIGNED_URL"

# Start import
aws cognito-idp start-user-import-job \
    --user-pool-id us-east-1_XXXXX \
    --job-id import-XXXXX
```

### Import via SDK

```go
func CreateImportJob(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, jobName, roleArn string) (*string, error) {

    output, err := client.CreateUserImportJob(ctx, &cognitoidentityprovider.CreateUserImportJobInput{
        UserPoolId:           aws.String(userPoolId),
        JobName:              aws.String(jobName),
        CloudWatchLogsRoleArn: aws.String(roleArn),
    })
    if err != nil {
        return nil, err
    }

    return output.UserImportJob.JobId, nil
}

func MonitorImportJob(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, jobId string) error {

    for {
        output, err := client.DescribeUserImportJob(ctx, &cognitoidentityprovider.DescribeUserImportJobInput{
            UserPoolId: aws.String(userPoolId),
            JobId:      aws.String(jobId),
        })
        if err != nil {
            return err
        }

        status := output.UserImportJob.Status
        log.Printf("Import status: %s, Imported: %d, Failed: %d",
            status,
            output.UserImportJob.ImportedUsers,
            output.UserImportJob.FailedUsers)

        switch status {
        case types.UserImportJobStatusTypeSucceeded:
            return nil
        case types.UserImportJobStatusTypeFailed:
            return errors.New("import job failed")
        case types.UserImportJobStatusTypeStopped:
            return errors.New("import job stopped")
        }

        time.Sleep(5 * time.Second)
    }
}
```

### Import Limits

| Limit                  | Value             |
| ---------------------- | ----------------- |
| Max CSV file size      | 100 MB            |
| Max users per CSV      | Unlimited (batch) |
| Concurrent import jobs | 1 per user pool   |
| CSV columns            | Must match schema |

## Just-in-Time Migration

### Lambda Trigger Setup

```yaml
# CloudFormation/SAM
UserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    LambdaConfig:
      UserMigration: !GetAtt MigrationFunction.Arn
```

### Migration Handler

```go
func handleUserMigration(ctx context.Context, event events.CognitoEventUserPoolsMigrateUser) (events.CognitoEventUserPoolsMigrateUser, error) {
    username := event.UserName
    password := event.Request.Password

    switch event.TriggerSource {
    case "UserMigration_Authentication":
        return handleAuthMigration(ctx, event, username, password)
    case "UserMigration_ForgotPassword":
        return handleForgotPasswordMigration(ctx, event, username)
    default:
        return event, fmt.Errorf("unknown trigger source: %s", event.TriggerSource)
    }
}

func handleAuthMigration(ctx context.Context, event events.CognitoEventUserPoolsMigrateUser,
    username, password string) (events.CognitoEventUserPoolsMigrateUser, error) {

    // Authenticate against legacy system
    legacyUser, err := legacyAuth.Authenticate(ctx, username, password)
    if err != nil {
        // Return error to reject - user stays in legacy system
        return event, fmt.Errorf("legacy authentication failed: %w", err)
    }

    // Build user attributes for Cognito
    event.Response.UserAttributes = map[string]string{
        "email":            legacyUser.Email,
        "email_verified":   "true", // Assuming verified in legacy system
        "name":             legacyUser.FullName,
        "custom:legacy_id": legacyUser.ID,
        "custom:migrated_at": time.Now().Format(time.RFC3339),
    }

    // User will be created with current password
    event.Response.FinalUserStatus = "CONFIRMED"
    event.Response.MessageAction = "SUPPRESS" // Don't send welcome email

    // Mark as migrated in legacy system (for tracking)
    if err := legacyAuth.MarkMigrated(ctx, legacyUser.ID); err != nil {
        log.Printf("Warning: failed to mark user as migrated: %v", err)
    }

    return event, nil
}

func handleForgotPasswordMigration(ctx context.Context, event events.CognitoEventUserPoolsMigrateUser,
    username string) (events.CognitoEventUserPoolsMigrateUser, error) {

    // Find user in legacy system (don't need password)
    legacyUser, err := legacyAuth.FindUser(ctx, username)
    if err != nil {
        return event, fmt.Errorf("user not found in legacy system: %w", err)
    }

    event.Response.UserAttributes = map[string]string{
        "email":          legacyUser.Email,
        "email_verified": "true",
        "name":           legacyUser.FullName,
    }

    return event, nil
}
```

### Tracking Migration Progress

```go
type MigrationTracker struct {
    db *sql.DB
}

func (t *MigrationTracker) RecordMigration(ctx context.Context, legacyID, cognitoID string) error {
    _, err := t.db.ExecContext(ctx, `
        INSERT INTO user_migrations (legacy_id, cognito_id, migrated_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE cognito_id = VALUES(cognito_id)
    `, legacyID, cognitoID)
    return err
}

func (t *MigrationTracker) GetMigrationStats(ctx context.Context) (*MigrationStats, error) {
    var stats MigrationStats
    err := t.db.QueryRowContext(ctx, `
        SELECT
            COUNT(*) as total_migrated,
            (SELECT COUNT(*) FROM legacy_users) as total_legacy,
            MIN(migrated_at) as first_migration,
            MAX(migrated_at) as last_migration
        FROM user_migrations
    `).Scan(&stats.Migrated, &stats.Total, &stats.FirstMigration, &stats.LastMigration)
    return &stats, err
}
```

## Password Migration

### Supported Hash Formats for Bulk Import

Cognito supports importing pre-hashed passwords in these formats:

| Format | Hash Algorithm | Salt Support |
| ------ | -------------- | ------------ |
| PBKDF2 | SHA256         | Yes          |
| Bcrypt | Bcrypt         | Built-in     |
| Scrypt | Scrypt         | Yes          |
| Argon2 | Argon2id       | Yes          |

### CSV with Hashed Passwords

```csv
name,email,cognito:password_hash,custom:tenant_id
John,john@example.com,"$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",tenant-1
```

### When Hashes Are Incompatible

If your legacy system uses an unsupported hash format:

1. **JIT Migration** - Verify password at login time
2. **Force Reset** - Import without password, force reset on first login
3. **Hash Conversion** - Re-hash to supported format (requires plaintext)

### Force Password Reset After Import

```go
func ForcePasswordResetForImportedUsers(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId string, users []string) error {

    for _, username := range users {
        _, err := client.AdminResetUserPassword(ctx, &cognitoidentityprovider.AdminResetUserPasswordInput{
            UserPoolId: aws.String(userPoolId),
            Username:   aws.String(username),
        })
        if err != nil {
            log.Printf("Failed to reset password for %s: %v", username, err)
            continue
        }
    }
    return nil
}
```

## Testing Migration

### Test Plan

```go
// migration_test.go
func TestUserMigrationFlow(t *testing.T) {
    tests := []struct {
        name           string
        legacyUser     LegacyUser
        password       string
        expectMigrated bool
        expectError    bool
    }{
        {
            name:           "valid user migrates successfully",
            legacyUser:     LegacyUser{Email: "test@example.com", Name: "Test"},
            password:       "validPassword123",
            expectMigrated: true,
        },
        {
            name:           "invalid password rejected",
            legacyUser:     LegacyUser{Email: "test@example.com", Name: "Test"},
            password:       "wrongPassword",
            expectMigrated: false,
            expectError:    true,
        },
        {
            name:           "disabled user rejected",
            legacyUser:     LegacyUser{Email: "disabled@example.com", Disabled: true},
            password:       "validPassword123",
            expectMigrated: false,
            expectError:    true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup mock legacy auth
            // Test migration trigger
            // Verify user in Cognito
        })
    }
}
```

### Validation Checklist

- [ ] Test with representative sample of legacy users
- [ ] Verify all custom attributes migrate correctly
- [ ] Test edge cases (special characters, long names)
- [ ] Verify email/phone verification status
- [ ] Test MFA migration if applicable
- [ ] Verify group membership migration
- [ ] Test forgot password flow for migrated users
- [ ] Monitor CloudWatch logs during migration
- [ ] Have rollback plan ready

## Related References

- [Admin Operations](admin-operations.md) - Bulk user management
- [Lambda Triggers](lambda-triggers.md) - Migration trigger details
- [Custom Attributes](custom-attributes.md) - Attribute mapping
