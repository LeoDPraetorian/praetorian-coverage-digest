---
name: aws-cognito
description: Provides AWS Cognito authentication and authorization patterns for Go backend. Use when integrating Cognito, implementing auth flows, or managing user pools.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# AWS Cognito for Go Backend

## When to Use This Skill

Use this skill when:
- Implementing authentication with AWS Cognito in Go
- Adding authorization logic with Cognito User Pools
- Working with Cognito JWT tokens and validation
- Managing user operations (signup, login, password reset)
- Integrating Cognito with the Chariot platform
- Troubleshooting Cognito integration issues

**Symptoms that indicate you need this skill:**
- "How do I validate Cognito JWT tokens in Go?"
- "What's the current Cognito SDK for Go?"
- "How do I implement user signup with Cognito?"
- "How does Chariot's auth middleware work with Cognito?"

## Quick Start

### Validating JWT Tokens

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
    "github.com/golang-jwt/jwt/v5"
)

// Basic JWT validation pattern
func ValidateToken(tokenString string, userPoolID string, region string) (*jwt.Token, error) {
    // See references/jwt-validation.md for complete implementation
}
```

### User Pool Operations

```go
client := cognitoidentityprovider.NewFromConfig(cfg)

// Common operations - see references/user-operations.md for details
// - SignUp
// - ConfirmSignUp
// - InitiateAuth
// - RespondToAuthChallenge
// - ForgotPassword
```

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Concepts
- **[Cognito Architecture](references/architecture.md)** - User Pools, Identity Pools, token types, auth flows
- **[JWT Token Validation](references/jwt-validation.md)** - Verifying tokens, JWK sets, token claims
- **[Auth Flows](references/auth-flows.md)** - USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH, custom auth

### API Reference
- **[AWS SDK for Go v2](references/sdk-reference.md)** - Current Cognito API operations and types
- **[User Operations](references/user-operations.md)** - Signup, login, password management, MFA
- **[Admin Operations](references/admin-operations.md)** - Admin-level user management

### Chariot Integration
- **[Chariot Auth Patterns](references/chariot-patterns.md)** - How Cognito integrates with Chariot platform
- **[Middleware Implementation](references/middleware.md)** - Auth middleware patterns for Lambda handlers
- **[Error Handling](references/error-handling.md)** - Cognito-specific error types and responses

### Advanced Topics
- **[Custom Attributes](references/custom-attributes.md)** - User pool schema extensions
- **[Lambda Triggers](references/lambda-triggers.md)** - Pre/post-authentication hooks
- **[Migration Patterns](references/migration.md)** - Migrating users from other auth systems

## Core Workflow

### 1. Authentication Flow

```
User Request → Validate JWT Token → Extract Claims → Authorize Action
```

**Steps:**
1. Extract token from Authorization header
2. Validate token signature using JWK Set (see [JWT Validation](references/jwt-validation.md))
3. Verify token claims (exp, iss, token_use)
4. Extract user identity (sub, cognito:username)
5. Check authorization (groups, custom claims)

### 2. User Registration Flow

```
Sign Up → Confirm Email → Complete Profile → Login
```

**Steps:**
1. Call `SignUp` API with username/password
2. Handle confirmation code delivery
3. Verify with `ConfirmSignUp`
4. Add custom attributes if needed
5. Initiate first login

See [User Operations](references/user-operations.md) for complete implementation.

### 3. Token Refresh Flow

```
Access Token Expires → Use Refresh Token → Get New Access Token
```

**Steps:**
1. Detect 401/expired token
2. Use `InitiateAuth` with REFRESH_TOKEN_AUTH
3. Update stored tokens
4. Retry original request

See [Auth Flows](references/auth-flows.md) for details.

## Best Practices

### ✅ Do This

- **Always validate JWT tokens** - Never trust tokens without verification
- **Use AWS SDK Go v2** - The current SDK (`github.com/aws/aws-sdk-go-v2`)
- **Cache JWK Sets** - Reduce latency by caching public keys (refresh periodically)
- **Handle token refresh** - Implement automatic refresh before expiration
- **Use custom attributes** - Store Chariot-specific data (account ID, roles)
- **Log auth events** - Track authentication attempts for security monitoring

### ❌ Don't Do This

- **Don't use AWS SDK Go v1** - Deprecated, use v2 instead
- **Don't skip token validation** - Security vulnerability
- **Don't store passwords** - Cognito handles password storage
- **Don't hardcode User Pool IDs** - Use environment variables/config
- **Don't ignore error codes** - Cognito errors have specific meanings
- **Don't implement custom crypto** - Use Cognito's built-in security

## Critical Rules

### Security Requirements (Non-Negotiable)

1. **JWT tokens MUST be validated on every request**
   - Verify signature using JWK Set
   - Check expiration (`exp` claim)
   - Verify issuer (`iss` claim matches User Pool)
   - Validate token_use (`access` vs `id` tokens)

2. **Never log sensitive data**
   - Don't log full tokens (log last 4 chars only)
   - Don't log passwords or temporary codes
   - Redact PII in error messages

3. **Use HTTPS for all Cognito API calls**
   - AWS SDK enforces this by default
   - Never disable TLS verification

4. **Implement rate limiting**
   - Cognito has API rate limits
   - Handle throttling errors gracefully
   - Implement exponential backoff

### Chariot Platform Requirements

1. **Use existing auth middleware** - Don't reinvent auth in each handler
2. **Follow Chariot error response format** - Consistent API errors
3. **Store account associations** - Link Cognito users to Chariot accounts
4. **Respect RBAC** - Use Cognito groups for role-based access

See [Chariot Patterns](references/chariot-patterns.md) for platform-specific requirements.

## Common Integration Patterns

### Pattern 1: Lambda Handler with Auth

```go
func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // 1. Validate token
    claims, err := auth.ValidateToken(req.Headers["Authorization"])
    if err != nil {
        return response.Unauthorized(), nil
    }

    // 2. Extract user identity
    userID := claims["sub"].(string)

    // 3. Business logic
    // ...
}
```

See [Middleware Implementation](references/middleware.md) for complete pattern.

### Pattern 2: User Registration with Custom Attributes

```go
// Add Chariot account ID to Cognito user
customAttrs := []types.AttributeType{
    {Name: aws.String("custom:account_id"), Value: aws.String(accountID)},
}

input := &cognitoidentityprovider.SignUpInput{
    ClientId:       aws.String(clientID),
    Username:       aws.String(email),
    Password:       aws.String(password),
    UserAttributes: customAttrs,
}
```

See [Custom Attributes](references/custom-attributes.md) for schema design.

## Troubleshooting

### Token Validation Fails

**Symptom:** `signature is invalid` or `token has expired`

**Solutions:**
1. Verify JWK Set URL matches User Pool region
2. Check system clock synchronization (NTP)
3. Ensure token hasn't expired (check `exp` claim)
4. Validate token_use claim matches expected type

See [JWT Validation](references/jwt-validation.md) for debugging steps.

### Rate Limiting Errors

**Symptom:** `TooManyRequestsException` or 429 errors

**Solutions:**
1. Implement exponential backoff with jitter
2. Cache frequently accessed data (JWK Sets, user info)
3. Use bulk operations where available
4. Review API call frequency

See [Error Handling](references/error-handling.md) for retry strategies.

### Migration Issues

**Symptom:** Existing users can't login after Cognito migration

**Solutions:**
1. Use Lambda trigger for user migration
2. Implement password migration flow
3. Verify custom attribute mapping
4. Test migration with subset of users first

See [Migration Patterns](references/migration.md) for strategies.

## SDK Versions and Compatibility

### Current (Recommended)

```go
// AWS SDK for Go v2 (current, actively maintained)
github.com/aws/aws-sdk-go-v2 v1.36.6
github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider v1.46.3

// JWT library (current)
github.com/golang-jwt/jwt/v5 v5.2.2
```

### Deprecated (Do Not Use)

- `github.com/aws/aws-sdk-go` (v1) - Use v2 instead
- `github.com/dgrijalva/jwt-go` - Unmaintained, use golang-jwt instead

See [SDK Reference](references/sdk-reference.md) for migration guide.

## Related Skills

### Backend Development
- `gateway-backend` - Go backend patterns, AWS integration
- `backend-api-design` - REST API design patterns
- `backend-error-handling` - Error handling strategies

### Security
- `gateway-security` - Security patterns and best practices
- `security/auth-implementation-patterns` - Authentication patterns
- `security/secrets-management` - Managing API keys and credentials

### Testing
- `backend-unit-test-engineer` - Unit testing Go code
- `testing/api-testing-patterns` - API testing strategies

## Next Steps

1. **Read Architecture** - Start with [Cognito Architecture](references/architecture.md) to understand the system
2. **Implement JWT Validation** - Follow [JWT Validation](references/jwt-validation.md) for production-ready validation
3. **Review Chariot Patterns** - See [Chariot Auth Patterns](references/chariot-patterns.md) for platform integration
4. **Test Your Implementation** - Use examples in `examples/` directory
