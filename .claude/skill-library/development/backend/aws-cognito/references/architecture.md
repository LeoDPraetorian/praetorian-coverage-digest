# AWS Cognito Architecture

This document explains AWS Cognito's architecture, components, and how they work together.

## Table of Contents

- [Overview](#overview)
- [User Pools vs Identity Pools](#user-pools-vs-identity-pools)
- [Token Types](#token-types)
- [Authentication Flows](#authentication-flows)
- [Security Model](#security-model)

## Overview

AWS Cognito provides authentication, authorization, and user management for web and mobile applications. It consists of two main components:

1. **User Pools**: User directories with sign-up/sign-in functionality
2. **Identity Pools**: Provide AWS credentials for accessing AWS services

For Chariot, we primarily use **User Pools** for authentication and authorization.

## User Pools vs Identity Pools

### User Pools (What Chariot Uses)

**Purpose**: Manage user authentication and identity

**Features**:

- User registration and sign-in
- Password policies and MFA
- JWT token issuance
- Custom attributes
- Lambda triggers for customization
- User groups for RBAC

**Use Cases**:

- API authentication
- User management
- Role-based access control

### Identity Pools

**Purpose**: Provide temporary AWS credentials

**Features**:

- Federated identity access
- AWS service authorization
- Temporary credentials via STS

**Use Cases** (Not currently used in Chariot):

- Direct S3 access from mobile apps
- DynamoDB access from client
- AWS service delegation

## Token Types

Cognito issues three types of JWT tokens after successful authentication:

### 1. ID Token

**Purpose**: User identity information

**Contains**:

- `sub` (subject) - Unique user ID
- `cognito:username` - Username
- `email` - User email
- Custom attributes
- Token metadata (iss, aud, exp, iat)

**Usage**: Pass user identity to application

**Example Claims**:

```json
{
  "sub": "f8c3f9e4-1234-5678-90ab-cdef12345678",
  "cognito:username": "user@example.com",
  "email": "user@example.com",
  "custom:account_id": "acc_123",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123",
  "token_use": "id",
  "exp": 1704067200
}
```

### 2. Access Token

**Purpose**: Authorize API requests

**Contains**:

- `sub` - User ID
- `cognito:groups` - User groups
- `scope` - OAuth scopes
- Token metadata

**Usage**: Validate API requests

**Example Claims**:

```json
{
  "sub": "f8c3f9e4-1234-5678-90ab-cdef12345678",
  "cognito:groups": ["admin", "power-users"],
  "scope": "openid email profile",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123",
  "token_use": "access",
  "exp": 1704067200
}
```

### 3. Refresh Token

**Purpose**: Obtain new access/id tokens without re-authentication

**Characteristics**:

- Opaque (not JWT, can't decode)
- Long-lived (default 30 days, configurable up to 10 years)
- Can be revoked
- Single-use in strict token revocation mode

**Usage**: Refresh expired tokens

## Authentication Flows

### Flow 1: USER_PASSWORD_AUTH

**Standard username/password authentication**

```
Client → InitiateAuth(username, password)
Cognito → Validate credentials
Cognito → Return tokens (id, access, refresh)
Client → Store tokens
```

**Use Case**: Standard user login

**Implementation**: See [User Operations](user-operations.md)

### Flow 2: REFRESH_TOKEN_AUTH

**Refresh expired access tokens**

```
Client → InitiateAuth(refresh_token)
Cognito → Validate refresh token
Cognito → Return new id/access tokens
Client → Update stored tokens
```

**Use Case**: Token refresh before expiration

**Implementation**: See [Auth Flows](auth-flows.md)

### Flow 3: CUSTOM_AUTH

**Custom authentication challenge**

```
Client → InitiateAuth(custom challenge)
Cognito → Trigger Lambda (DefineAuthChallenge)
Lambda → Define challenge type
Cognito → Return challenge to client
Client → RespondToAuthChallenge(answer)
Cognito → Verify answer
Cognito → Return tokens
```

**Use Case**: Custom auth flows (email links, passwordless, etc.)

**Implementation**: See [Lambda Triggers](lambda-triggers.md)

## Security Model

### Token Validation Chain

```
1. Extract token from Authorization header
2. Decode JWT without verification (to get kid)
3. Fetch JWK Set from Cognito
4. Find matching key by kid
5. Verify signature using public key
6. Verify claims (iss, exp, token_use)
7. Extract user identity
```

**Why Each Step Matters**:

- **Signature verification**: Proves token issued by Cognito
- **Expiration check**: Prevents replay attacks
- **Issuer verification**: Prevents token substitution
- **token_use check**: Ensures correct token type

See [JWT Validation](jwt-validation.md) for implementation.

### JWK Sets (JSON Web Key Sets)

**What**: Public keys used to verify JWT signatures

**Location**:

```
https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
```

**Structure**:

```json
{
  "keys": [
    {
      "kid": "abc123...",
      "kty": "RSA",
      "n": "...",
      "e": "AQAB",
      "use": "sig"
    }
  ]
}
```

**Caching Strategy**:

- Cache JWK Set locally (reduce latency)
- Refresh every 6-24 hours
- Force refresh if `kid` not found

### Security Best Practices

1. **Always validate tokens** - Never trust without verification
2. **Use HTTPS** - Encrypt all Cognito API calls
3. **Implement rate limiting** - Protect against brute force
4. **Enable MFA** - Additional security layer
5. **Use short token lifetimes** - Reduce exposure window (1 hour typical)
6. **Rotate refresh tokens** - Detect compromised tokens
7. **Monitor auth events** - CloudWatch logs for suspicious activity

## Chariot-Specific Architecture

### User Pool Configuration

- **User Pool ID**: Stored in environment variable `COGNITO_USER_POOL_ID`
- **Region**: `us-east-1` (primary)
- **Client ID**: Stored in `COGNITO_CLIENT_ID`

### Custom Attributes

Chariot stores platform-specific data in Cognito custom attributes:

- `custom:account_id` - Chariot account association
- `custom:org_id` - Organization ID
- `custom:roles` - Comma-separated role list

See [Custom Attributes](custom-attributes.md) for schema details.

### User Groups

Chariot uses Cognito groups for RBAC:

- `admin` - Full platform access
- `power-users` - Advanced features
- `viewers` - Read-only access

See [Chariot Patterns](chariot-patterns.md) for authorization logic.

## Related References

- [JWT Validation](jwt-validation.md) - Token verification implementation
- [Auth Flows](auth-flows.md) - Detailed flow diagrams
- [User Operations](user-operations.md) - API operations
- [Chariot Patterns](chariot-patterns.md) - Platform integration
