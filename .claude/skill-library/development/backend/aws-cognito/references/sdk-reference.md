# AWS SDK for Go v2 Reference

API reference for Cognito operations using AWS SDK Go v2.

## Table of Contents

- [Client Setup](#client-setup)
- [Common Operations](#common-operations)
- [Error Handling](#error-handling)
- [Migration from SDK v1](#migration-from-sdk-v1)
- [Enumerations](#enumerations)

## Client Setup

### Basic Configuration

```go
import (
    "context"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
)

func NewCognitoClient(ctx context.Context) (*cognitoidentityprovider.Client, error) {
    cfg, err := config.LoadDefaultConfig(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    return cognitoidentityprovider.NewFromConfig(cfg), nil
}
```

### Custom Configuration

```go
func NewCognitoClientWithOptions(ctx context.Context, region string) (*cognitoidentityprovider.Client, error) {
    cfg, err := config.LoadDefaultConfig(ctx,
        config.WithRegion(region),
        config.WithRetryMaxAttempts(5),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    client := cognitoidentityprovider.NewFromConfig(cfg, func(o *cognitoidentityprovider.Options) {
        o.RetryMaxAttempts = 3
        o.RetryMode = aws.RetryModeStandard
    })

    return client, nil
}
```

### Service Wrapper Pattern

```go
type CognitoStore struct {
    client       *cognitoidentityprovider.Client
    userPoolId   string
    clientId     string
    clientSecret string
    region       string
}

type Config struct {
    Region       string
    UserPoolId   string
    ClientId     string
    ClientSecret string
}

func NewCognitoStore(ctx context.Context, config *Config) (*CognitoStore, error) {
    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(config.Region))
    if err != nil {
        return nil, fmt.Errorf("failed to load config: %w", err)
    }

    return &CognitoStore{
        client:       cognitoidentityprovider.NewFromConfig(cfg),
        userPoolId:   config.UserPoolId,
        clientId:     config.ClientId,
        clientSecret: config.ClientSecret,
        region:       config.Region,
    }, nil
}
```

### Required Imports

```go
import (
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)
```

## Common Operations

### User Operations

| Operation               | Method                  | Auth Required |
| ----------------------- | ----------------------- | ------------- |
| Register user           | `SignUp`                | No            |
| Confirm registration    | `ConfirmSignUp`         | No            |
| Sign in                 | `InitiateAuth`          | No            |
| Get user info           | `GetUser`               | Access Token  |
| Change password         | `ChangePassword`        | Access Token  |
| Forgot password         | `ForgotPassword`        | No            |
| Confirm forgot password | `ConfirmForgotPassword` | No            |
| Delete user             | `DeleteUser`            | Access Token  |
| Update attributes       | `UpdateUserAttributes`  | Access Token  |
| Verify attribute        | `VerifyUserAttribute`   | Access Token  |

### Admin Operations

| Operation            | Method                      | Auth Required |
| -------------------- | --------------------------- | ------------- |
| Create user          | `AdminCreateUser`           | IAM           |
| Delete user          | `AdminDeleteUser`           | IAM           |
| Get user             | `AdminGetUser`              | IAM           |
| Update attributes    | `AdminUpdateUserAttributes` | IAM           |
| Set password         | `AdminSetUserPassword`      | IAM           |
| Disable user         | `AdminDisableUser`          | IAM           |
| Enable user          | `AdminEnableUser`           | IAM           |
| Add user to group    | `AdminAddUserToGroup`       | IAM           |
| Remove from group    | `AdminRemoveUserFromGroup`  | IAM           |
| List groups for user | `AdminListGroupsForUser`    | IAM           |

### Token Operations

| Operation            | Method                   | Description              |
| -------------------- | ------------------------ | ------------------------ |
| Initiate auth        | `InitiateAuth`           | Start authentication     |
| Respond to challenge | `RespondToAuthChallenge` | Handle MFA/challenges    |
| Refresh tokens       | `InitiateAuth` (REFRESH) | Get new access token     |
| Revoke token         | `RevokeToken`            | Invalidate refresh token |
| Global sign out      | `GlobalSignOut`          | Revoke all tokens        |

## Error Handling

### Typed Error Handling (SDK v2 Pattern)

```go
import (
    "errors"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func handleCognitoError(err error) error {
    var notAuthErr *types.NotAuthorizedException
    if errors.As(err, &notAuthErr) {
        return fmt.Errorf("invalid credentials: %w", err)
    }

    var userNotFoundErr *types.UserNotFoundException
    if errors.As(err, &userNotFoundErr) {
        return fmt.Errorf("user not found: %w", err)
    }

    var usernameExistsErr *types.UsernameExistsException
    if errors.As(err, &usernameExistsErr) {
        return fmt.Errorf("username already exists: %w", err)
    }

    var codeMismatchErr *types.CodeMismatchException
    if errors.As(err, &codeMismatchErr) {
        return fmt.Errorf("invalid verification code: %w", err)
    }

    var expiredCodeErr *types.ExpiredCodeException
    if errors.As(err, &expiredCodeErr) {
        return fmt.Errorf("verification code expired: %w", err)
    }

    var invalidPasswordErr *types.InvalidPasswordException
    if errors.As(err, &invalidPasswordErr) {
        return fmt.Errorf("password does not meet requirements: %w", err)
    }

    var tooManyRequestsErr *types.TooManyRequestsException
    if errors.As(err, &tooManyRequestsErr) {
        return fmt.Errorf("rate limited, try again later: %w", err)
    }

    return err
}
```

### Error to HTTP Status Mapping

| Cognito Exception              | HTTP Status | User Message                  |
| ------------------------------ | ----------- | ----------------------------- |
| NotAuthorizedException         | 401         | Invalid email or password     |
| UserNotFoundException          | 404         | User not found                |
| UsernameExistsException        | 409         | Email already registered      |
| CodeMismatchException          | 400         | Invalid verification code     |
| ExpiredCodeException           | 400         | Code expired, request new one |
| InvalidPasswordException       | 400         | Password does not meet policy |
| TooManyRequestsException       | 429         | Too many requests             |
| InvalidParameterException      | 400         | Invalid input                 |
| UserNotConfirmedException      | 403         | Please verify your email      |
| PasswordResetRequiredException | 403         | Password reset required       |

## Migration from SDK v1

### Package Changes

```go
// SDK v1 (Deprecated - EOL July 31, 2025)
import "github.com/aws/aws-sdk-go/service/cognitoidentityprovider"

// SDK v2 (Current)
import "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
```

### Session/Config Migration

```go
// SDK v1
sess := session.Must(session.NewSession())
client := cognitoidentityprovider.New(sess)

// SDK v2
cfg, err := config.LoadDefaultConfig(ctx)
client := cognitoidentityprovider.NewFromConfig(cfg)
```

### Error Handling Migration

```go
// SDK v1
import "github.com/aws/aws-sdk-go/aws/awserr"

if aerr, ok := err.(awserr.Error); ok {
    switch aerr.Code() {
    case cognitoidentityprovider.ErrCodeNotAuthorizedException:
        // handle
    }
}

// SDK v2
import "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"

var notAuthErr *types.NotAuthorizedException
if errors.As(err, &notAuthErr) {
    // handle
}
```

### Pointer Simplification

```go
// SDK v1
input := &cognitoidentityprovider.SignUpInput{
    ClientId: aws.String(clientId),
    Username: aws.String(username),
}

// SDK v2 (same, but aws.String is in aws package)
import "github.com/aws/aws-sdk-go-v2/aws"
input := &cognitoidentityprovider.SignUpInput{
    ClientId: aws.String(clientId),
    Username: aws.String(username),
}
```

### Context Required

```go
// SDK v1 (optional context)
output, err := client.SignUp(input)
output, err := client.SignUpWithContext(ctx, input)

// SDK v2 (context always required)
output, err := client.SignUp(ctx, input)
```

## Enumerations

### AuthFlowType

```go
types.AuthFlowTypeUserPasswordAuth    // USER_PASSWORD_AUTH
types.AuthFlowTypeUserSrpAuth         // USER_SRP_AUTH
types.AuthFlowTypeRefreshTokenAuth    // REFRESH_TOKEN_AUTH
types.AuthFlowTypeRefreshToken        // REFRESH_TOKEN
types.AuthFlowTypeCustomAuth          // CUSTOM_AUTH
types.AuthFlowTypeAdminNoSrpAuth      // ADMIN_NO_SRP_AUTH
types.AuthFlowTypeAdminUserPasswordAuth // ADMIN_USER_PASSWORD_AUTH
```

### ChallengeNameType

```go
types.ChallengeNameTypeSmsMfa              // SMS_MFA
types.ChallengeNameTypeSoftwareTokenMfa    // SOFTWARE_TOKEN_MFA
types.ChallengeNameTypeSelectMfaType       // SELECT_MFA_TYPE
types.ChallengeNameTypeMfaSetup            // MFA_SETUP
types.ChallengeNameTypePasswordVerifier    // PASSWORD_VERIFIER
types.ChallengeNameTypeCustomChallenge     // CUSTOM_CHALLENGE
types.ChallengeNameTypeDeviceSrpAuth       // DEVICE_SRP_AUTH
types.ChallengeNameTypeDevicePasswordVerifier // DEVICE_PASSWORD_VERIFIER
types.ChallengeNameTypeNewPasswordRequired // NEW_PASSWORD_REQUIRED
```

### UserStatusType

```go
types.UserStatusTypeUnconfirmed         // UNCONFIRMED
types.UserStatusTypeConfirmed           // CONFIRMED
types.UserStatusTypeArchived            // ARCHIVED
types.UserStatusTypeCompromised         // COMPROMISED
types.UserStatusTypeUnknown             // UNKNOWN
types.UserStatusTypeResetRequired       // RESET_REQUIRED
types.UserStatusTypeForceChangePassword // FORCE_CHANGE_PASSWORD
```

## Retry Configuration

### Default Behavior

AWS SDK v2 uses adaptive retry by default:

- Max attempts: 3
- Max backoff: 20 seconds
- Jitter: Added automatically

### Custom Configuration

```go
cfg, err := config.LoadDefaultConfig(ctx,
    config.WithRetryMaxAttempts(5),
    config.WithRetryMode(aws.RetryModeAdaptive),
)

// Or per-client
client := cognitoidentityprovider.NewFromConfig(cfg, func(o *cognitoidentityprovider.Options) {
    o.RetryMaxAttempts = 5
    o.RetryMode = aws.RetryModeStandard
})
```

### Context Timeouts

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

output, err := client.SignUp(ctx, input)
if errors.Is(err, context.DeadlineExceeded) {
    // Handle timeout
}
```

## Related References

- [User Operations](user-operations.md) - User management examples
- [Auth Flows](auth-flows.md) - Authentication flow details
- [Error Handling](error-handling.md) - Comprehensive error handling
- [Admin Operations](admin-operations.md) - Admin API examples
