# Lambda Triggers

Cognito Lambda trigger types and event handling patterns.

## Table of Contents

- [Trigger Types](#trigger-types)
- [Pre Sign-Up](#pre-sign-up)
- [Pre Authentication](#pre-authentication)
- [Post Authentication](#post-authentication)
- [Pre Token Generation](#pre-token-generation)
- [Custom Message](#custom-message)
- [User Migration](#user-migration)

## Trigger Types

| Trigger               | When Invoked                    | Common Use Cases                       |
| --------------------- | ------------------------------- | -------------------------------------- |
| Pre Sign-Up           | Before user registration        | Validation, auto-confirm, domain check |
| Post Confirmation     | After email/phone verification  | Welcome email, create related records  |
| Pre Authentication    | Before credential validation    | Custom auth checks, device tracking    |
| Post Authentication   | After successful authentication | Logging, analytics, update last login  |
| Pre Token Generation  | Before tokens are generated     | Add/modify claims, tenant injection    |
| Custom Message        | When sending email/SMS          | Custom templates, localization         |
| User Migration        | When user not found (sign-in)   | Migrate from legacy auth system        |
| Define Auth Challenge | Custom auth flow                | Passwordless, OTP, CAPTCHA             |
| Create Auth Challenge | Custom auth flow                | Generate challenge                     |
| Verify Auth Challenge | Custom auth flow                | Validate response                      |

## Pre Sign-Up

### Event Structure

```go
type PreSignUpEvent struct {
    Version    string              `json:"version"`
    Region     string              `json:"region"`
    UserPoolID string              `json:"userPoolId"`
    UserName   string              `json:"userName"`
    CallerContext CallerContext    `json:"callerContext"`
    Request    PreSignUpRequest    `json:"request"`
    Response   PreSignUpResponse   `json:"response"`
}

type PreSignUpRequest struct {
    UserAttributes map[string]string `json:"userAttributes"`
    ValidationData map[string]string `json:"validationData"`
    ClientMetadata map[string]string `json:"clientMetadata"`
}

type PreSignUpResponse struct {
    AutoConfirmUser bool `json:"autoConfirmUser"`
    AutoVerifyPhone bool `json:"autoVerifyPhone"`
    AutoVerifyEmail bool `json:"autoVerifyEmail"`
}
```

### Handler Example

```go
func handlePreSignUp(ctx context.Context, event events.CognitoEventUserPoolsPreSignup) (events.CognitoEventUserPoolsPreSignup, error) {
    email := event.Request.UserAttributes["email"]

    // Validate email domain
    allowedDomains := []string{"company.com", "partner.com"}
    if !isAllowedDomain(email, allowedDomains) {
        return event, fmt.Errorf("email domain not allowed")
    }

    // Auto-confirm users from trusted domains
    if strings.HasSuffix(email, "@company.com") {
        event.Response.AutoConfirmUser = true
        event.Response.AutoVerifyEmail = true
    }

    return event, nil
}

func isAllowedDomain(email string, domains []string) bool {
    for _, domain := range domains {
        if strings.HasSuffix(email, "@"+domain) {
            return true
        }
    }
    return false
}
```

## Pre Authentication

### Event Structure

```go
type PreAuthenticationRequest struct {
    UserAttributes map[string]string `json:"userAttributes"`
    ValidationData map[string]string `json:"validationData"`
    UserNotFound   bool              `json:"userNotFound"`
}
```

### Handler Example

```go
func handlePreAuth(ctx context.Context, event events.CognitoEventUserPoolsPreAuthentication) (events.CognitoEventUserPoolsPreAuthentication, error) {
    username := event.UserName

    // Check if user is blocked
    blocked, err := isUserBlocked(ctx, username)
    if err != nil {
        return event, fmt.Errorf("failed to check block status: %w", err)
    }
    if blocked {
        return event, errors.New("user account is blocked")
    }

    // Log authentication attempt
    logAuthAttempt(ctx, username, event.Request.UserAttributes)

    return event, nil
}
```

## Post Authentication

### Event Structure

```go
type PostAuthenticationRequest struct {
    UserAttributes map[string]string `json:"userAttributes"`
    NewDeviceUsed  bool              `json:"newDeviceUsed"`
    ClientMetadata map[string]string `json:"clientMetadata"`
}
```

### Handler Example

```go
func handlePostAuth(ctx context.Context, event events.CognitoEventUserPoolsPostAuthentication) (events.CognitoEventUserPoolsPostAuthentication, error) {
    username := event.UserName
    email := event.Request.UserAttributes["email"]

    // Update last login timestamp
    if err := updateLastLogin(ctx, username); err != nil {
        log.Printf("Warning: failed to update last login: %v", err)
        // Don't fail auth for logging errors
    }

    // Track new device
    if event.Request.NewDeviceUsed {
        if err := notifyNewDevice(ctx, email); err != nil {
            log.Printf("Warning: failed to notify new device: %v", err)
        }
    }

    return event, nil
}
```

## Pre Token Generation

### Event Structure

```go
type PreTokenGenerationRequest struct {
    UserAttributes     map[string]string `json:"userAttributes"`
    GroupConfiguration GroupConfig       `json:"groupConfiguration"`
    ClientMetadata     map[string]string `json:"clientMetadata"`
}

type PreTokenGenerationResponse struct {
    ClaimsOverrideDetails ClaimsOverride `json:"claimsOverrideDetails"`
}

type ClaimsOverride struct {
    ClaimsToAddOrOverride map[string]string `json:"claimsToAddOrOverride"`
    ClaimsToSuppress      []string          `json:"claimsToSuppress"`
    GroupOverrideDetails  *GroupOverride    `json:"groupOverrideDetails"`
}
```

### Handler Example - Add Custom Claims

```go
func handlePreTokenGen(ctx context.Context, event events.CognitoEventUserPoolsPreTokenGen) (events.CognitoEventUserPoolsPreTokenGen, error) {
    username := event.UserName
    tenantID := event.Request.UserAttributes["custom:tenant_id"]

    // Fetch additional user data from database
    userData, err := getUserData(ctx, username)
    if err != nil {
        return event, fmt.Errorf("failed to get user data: %w", err)
    }

    // Add custom claims
    event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride = map[string]string{
        "tenant_id":     tenantID,
        "permissions":   strings.Join(userData.Permissions, ","),
        "subscription":  userData.SubscriptionTier,
    }

    // Suppress sensitive claims
    event.Response.ClaimsOverrideDetails.ClaimsToSuppress = []string{
        "custom:internal_id",
    }

    return event, nil
}
```

## Custom Message

### Event Structure

```go
type CustomMessageRequest struct {
    UserAttributes map[string]string `json:"userAttributes"`
    CodeParameter  string            `json:"codeParameter"`
    UsernameParameter string         `json:"usernameParameter"`
    ClientMetadata map[string]string `json:"clientMetadata"`
}

type CustomMessageResponse struct {
    SMSMessage   string `json:"smsMessage"`
    EmailMessage string `json:"emailMessage"`
    EmailSubject string `json:"emailSubject"`
}
```

### Handler Example

```go
func handleCustomMessage(ctx context.Context, event events.CognitoEventUserPoolsCustomMessage) (events.CognitoEventUserPoolsCustomMessage, error) {
    email := event.Request.UserAttributes["email"]
    name := event.Request.UserAttributes["name"]
    code := event.Request.CodeParameter

    switch event.TriggerSource {
    case "CustomMessage_SignUp":
        event.Response.EmailSubject = "Welcome to Our App - Verify Your Email"
        event.Response.EmailMessage = fmt.Sprintf(
            "Hi %s,\n\nWelcome! Your verification code is: %s\n\nThis code expires in 24 hours.",
            name, code)

    case "CustomMessage_ForgotPassword":
        event.Response.EmailSubject = "Password Reset Request"
        event.Response.EmailMessage = fmt.Sprintf(
            "Hi %s,\n\nYour password reset code is: %s\n\nIf you didn't request this, ignore this email.",
            name, code)

    case "CustomMessage_ResendCode":
        event.Response.EmailSubject = "Your New Verification Code"
        event.Response.EmailMessage = fmt.Sprintf(
            "Hi %s,\n\nYour new verification code is: %s",
            name, code)
    }

    return event, nil
}
```

## User Migration

### Event Structure

```go
type UserMigrationRequest struct {
    Password       string            `json:"password"`
    ValidationData map[string]string `json:"validationData"`
    ClientMetadata map[string]string `json:"clientMetadata"`
}

type UserMigrationResponse struct {
    UserAttributes        map[string]string `json:"userAttributes"`
    FinalUserStatus       string            `json:"finalUserStatus"`
    MessageAction         string            `json:"messageAction"`
    DesiredDeliveryMediums []string         `json:"desiredDeliveryMediums"`
    ForceAliasCreation    bool              `json:"forceAliasCreation"`
}
```

### Handler Example

```go
func handleUserMigration(ctx context.Context, event events.CognitoEventUserPoolsMigrateUser) (events.CognitoEventUserPoolsMigrateUser, error) {
    username := event.UserName
    password := event.Request.Password

    switch event.TriggerSource {
    case "UserMigration_Authentication":
        // Verify credentials against legacy system
        legacyUser, err := authenticateLegacyUser(ctx, username, password)
        if err != nil {
            return event, err // Return error to reject migration
        }

        // Set user attributes for new Cognito user
        event.Response.UserAttributes = map[string]string{
            "email":          legacyUser.Email,
            "email_verified": "true",
            "name":           legacyUser.Name,
            "custom:legacy_id": legacyUser.ID,
        }
        event.Response.FinalUserStatus = "CONFIRMED"
        event.Response.MessageAction = "SUPPRESS"

    case "UserMigration_ForgotPassword":
        // Check if user exists in legacy system
        legacyUser, err := findLegacyUser(ctx, username)
        if err != nil {
            return event, err
        }

        event.Response.UserAttributes = map[string]string{
            "email":          legacyUser.Email,
            "email_verified": "true",
        }
        event.Response.MessageAction = "SUPPRESS"
    }

    return event, nil
}

type LegacyUser struct {
    ID    string
    Email string
    Name  string
}

func authenticateLegacyUser(ctx context.Context, username, password string) (*LegacyUser, error) {
    // Implement legacy authentication
    // Return error if credentials invalid
    return &LegacyUser{}, nil
}
```

## Best Practices

### Error Handling

```go
// Return error to reject the operation
func handler(ctx context.Context, event Event) (Event, error) {
    if !isValid(event) {
        return event, errors.New("validation failed")
    }
    return event, nil
}
```

### Timeout Configuration

```yaml
# SAM template
CognitoTriggerFunction:
  Type: AWS::Serverless::Function
  Properties:
    Timeout: 5 # Cognito has 5-second timeout for triggers
    MemorySize: 256
```

### Idempotency

```go
// Triggers can be retried - make operations idempotent
func handlePostConfirmation(ctx context.Context, event Event) (Event, error) {
    // Use transaction or check-before-create pattern
    exists, err := recordExists(ctx, event.UserName)
    if err != nil {
        return event, err
    }
    if !exists {
        if err := createRecord(ctx, event.UserName); err != nil {
            return event, err
        }
    }
    return event, nil
}
```

## Related References

- [Auth Flows](auth-flows.md) - Custom auth flow triggers
- [Custom Attributes](custom-attributes.md) - Pre-token claim injection
- [Error Handling](error-handling.md) - Trigger error responses
