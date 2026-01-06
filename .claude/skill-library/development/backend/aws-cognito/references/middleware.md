# Middleware Implementation

Auth middleware patterns for Lambda handlers and API Gateway.

## Table of Contents

- [Lambda Handler Middleware](#lambda-handler-middleware)
- [JWT Validation Middleware](#jwt-validation-middleware)
- [Context Injection](#context-injection)
- [Performance Optimization](#performance-optimization)

## Lambda Handler Middleware

### Basic Handler Wrapper

```go
import (
    "context"
    "github.com/aws/aws-lambda-go/events"
)

type AuthenticatedHandler func(ctx context.Context, claims *Claims, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

func AuthMiddleware(jwtValidator *JWTValidator) func(AuthenticatedHandler) func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    return func(handler AuthenticatedHandler) func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
            // Extract token from Authorization header
            token, err := extractToken(req.Headers)
            if err != nil {
                return unauthorizedResponse("Missing or invalid authorization header"), nil
            }

            // Validate JWT and extract claims
            claims, err := jwtValidator.Validate(token)
            if err != nil {
                return unauthorizedResponse("Invalid token"), nil
            }

            // Call the authenticated handler
            return handler(ctx, claims, req)
        }
    }
}

func extractToken(headers map[string]string) (string, error) {
    auth := headers["Authorization"]
    if auth == "" {
        auth = headers["authorization"] // Case-insensitive fallback
    }

    if !strings.HasPrefix(auth, "Bearer ") {
        return "", errors.New("missing Bearer token")
    }

    return strings.TrimPrefix(auth, "Bearer "), nil
}

func unauthorizedResponse(message string) events.APIGatewayProxyResponse {
    return events.APIGatewayProxyResponse{
        StatusCode: 401,
        Body:       fmt.Sprintf(`{"error": "%s"}`, message),
        Headers:    map[string]string{"Content-Type": "application/json"},
    }
}
```

### Usage Example

```go
func main() {
    validator := NewJWTValidator(region, userPoolId)
    authMiddleware := AuthMiddleware(validator)

    lambda.Start(authMiddleware(handleProtectedRequest))
}

func handleProtectedRequest(ctx context.Context, claims *Claims, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    userID := claims.Subject
    // Process authenticated request
    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       fmt.Sprintf(`{"user_id": "%s"}`, userID),
    }, nil
}
```

## JWT Validation Middleware

### JWKS-Based Validator

```go
import (
    "context"
    "sync"
    "time"
    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/v2/jwk"
)

type JWTValidator struct {
    jwksURL    string
    issuer     string
    clientID   string
    jwksCache  jwk.Set
    cacheMu    sync.RWMutex
    cacheTime  time.Time
    cacheTTL   time.Duration
}

type Claims struct {
    Subject   string   `json:"sub"`
    Email     string   `json:"email"`
    Username  string   `json:"cognito:username"`
    Groups    []string `json:"cognito:groups"`
    TokenUse  string   `json:"token_use"`
    jwt.RegisteredClaims
}

func NewJWTValidator(region, userPoolId string) *JWTValidator {
    return &JWTValidator{
        jwksURL:  fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", region, userPoolId),
        issuer:   fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", region, userPoolId),
        cacheTTL: 6 * time.Hour,
    }
}

func (v *JWTValidator) Validate(tokenString string) (*Claims, error) {
    // Get JWKS (with caching)
    jwks, err := v.getJWKS()
    if err != nil {
        return nil, fmt.Errorf("failed to get JWKS: %w", err)
    }

    // Parse and validate token
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method is RSA
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }

        // Get key ID from token header
        kid, ok := token.Header["kid"].(string)
        if !ok {
            return nil, errors.New("kid not found in token header")
        }

        // Find matching key
        key, found := jwks.LookupKeyID(kid)
        if !found {
            return nil, fmt.Errorf("key %s not found", kid)
        }

        // Extract public key
        var pubKey interface{}
        if err := key.Raw(&pubKey); err != nil {
            return nil, fmt.Errorf("failed to get public key: %w", err)
        }

        return pubKey, nil
    })

    if err != nil {
        return nil, fmt.Errorf("token validation failed: %w", err)
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, errors.New("invalid claims")
    }

    // Verify issuer
    if claims.Issuer != v.issuer {
        return nil, fmt.Errorf("invalid issuer: %s", claims.Issuer)
    }

    return claims, nil
}

func (v *JWTValidator) getJWKS() (jwk.Set, error) {
    v.cacheMu.RLock()
    if v.jwksCache != nil && time.Since(v.cacheTime) < v.cacheTTL {
        defer v.cacheMu.RUnlock()
        return v.jwksCache, nil
    }
    v.cacheMu.RUnlock()

    // Fetch new JWKS
    v.cacheMu.Lock()
    defer v.cacheMu.Unlock()

    // Double-check after acquiring write lock
    if v.jwksCache != nil && time.Since(v.cacheTime) < v.cacheTTL {
        return v.jwksCache, nil
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    jwks, err := jwk.Fetch(ctx, v.jwksURL)
    if err != nil {
        return nil, err
    }

    v.jwksCache = jwks
    v.cacheTime = time.Now()
    return jwks, nil
}
```

### Lambda Init Caching (Critical for Performance)

```go
var (
    jwtValidator *JWTValidator
)

func init() {
    // Cache JWKS during cold start (~200-300ms)
    region := os.Getenv("AWS_REGION")
    userPoolId := os.Getenv("COGNITO_USER_POOL_ID")

    jwtValidator = NewJWTValidator(region, userPoolId)

    // Pre-warm cache
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if _, err := jwtValidator.getJWKS(); err != nil {
        log.Printf("Warning: Failed to pre-warm JWKS cache: %v", err)
    }
}

func main() {
    lambda.Start(AuthMiddleware(jwtValidator)(handler))
}
```

## Context Injection

### User Context Pattern

```go
type contextKey string

const (
    UserContextKey contextKey = "user"
)

type UserContext struct {
    UserID    string
    Email     string
    Username  string
    Groups    []string
    TenantID  string // Custom attribute
}

func InjectUserContext(ctx context.Context, claims *Claims) context.Context {
    user := &UserContext{
        UserID:   claims.Subject,
        Email:    claims.Email,
        Username: claims.Username,
        Groups:   claims.Groups,
    }

    // Extract custom attributes if present
    if tenantID, ok := claims.Extra["custom:tenant_id"].(string); ok {
        user.TenantID = tenantID
    }

    return context.WithValue(ctx, UserContextKey, user)
}

func GetUserFromContext(ctx context.Context) (*UserContext, error) {
    user, ok := ctx.Value(UserContextKey).(*UserContext)
    if !ok {
        return nil, errors.New("user not found in context")
    }
    return user, nil
}
```

### Group-Based Authorization

```go
func RequireGroup(groups ...string) func(AuthenticatedHandler) AuthenticatedHandler {
    return func(next AuthenticatedHandler) AuthenticatedHandler {
        return func(ctx context.Context, claims *Claims, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
            if !hasAnyGroup(claims.Groups, groups) {
                return events.APIGatewayProxyResponse{
                    StatusCode: 403,
                    Body:       `{"error": "Insufficient permissions"}`,
                }, nil
            }
            return next(ctx, claims, req)
        }
    }
}

func hasAnyGroup(userGroups []string, requiredGroups []string) bool {
    groupSet := make(map[string]struct{})
    for _, g := range userGroups {
        groupSet[g] = struct{}{}
    }
    for _, required := range requiredGroups {
        if _, ok := groupSet[required]; ok {
            return true
        }
    }
    return false
}

// Usage
lambda.Start(
    AuthMiddleware(validator)(
        RequireGroup("admin", "power-users")(adminHandler),
    ),
)
```

## Performance Optimization

### JWKS Caching Strategy

| Strategy           | Cold Start | Per-Request | Cost Impact |
| ------------------ | ---------- | ----------- | ----------- |
| No caching         | N/A        | 100-200ms   | High        |
| Init caching       | 200-300ms  | 5-15ms      | Low         |
| Background refresh | 200-300ms  | 5-15ms      | Lowest      |

### Background JWKS Refresh

```go
type JWTValidatorWithRefresh struct {
    *JWTValidator
    refreshInterval time.Duration
    stopChan        chan struct{}
}

func NewJWTValidatorWithRefresh(region, userPoolId string) *JWTValidatorWithRefresh {
    v := &JWTValidatorWithRefresh{
        JWTValidator:    NewJWTValidator(region, userPoolId),
        refreshInterval: 1 * time.Hour,
        stopChan:        make(chan struct{}),
    }

    go v.backgroundRefresh()
    return v
}

func (v *JWTValidatorWithRefresh) backgroundRefresh() {
    ticker := time.NewTicker(v.refreshInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
            _, _ = v.getJWKS() // Refresh cache
            cancel()
        case <-v.stopChan:
            return
        }
    }
}

func (v *JWTValidatorWithRefresh) Stop() {
    close(v.stopChan)
}
```

### Lambda Memory Configuration

| Memory (MB) | Cold Start | Validation | Timeout Rate |
| ----------- | ---------- | ---------- | ------------ |
| 256         | 280ms      | 35ms       | 8%           |
| 512         | 200ms      | 5-15ms     | <1%          |
| 1024        | 150ms      | 5-10ms     | <0.1%        |

**Recommendation:** Use 512 MB minimum for auth Lambda functions.

### API Gateway Caching

```yaml
# SAM template
AuthorizerFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: authorizer
    Runtime: provided.al2
    MemorySize: 512
    Timeout: 10

ApiGateway:
  Type: AWS::Serverless::Api
  Properties:
    Auth:
      DefaultAuthorizer: CognitoAuthorizer
      Authorizers:
        CognitoAuthorizer:
          FunctionArn: !GetAtt AuthorizerFunction.Arn
          AuthorizationResultTtl: 300 # 5 minutes cache
```

**Cache TTL Impact:**

- 0 seconds: No caching, every request invokes authorizer
- 300 seconds: 80-95% reduction in authorizer invocations
- 3600 seconds: Maximum caching, requires careful invalidation strategy

## Related References

- [JWT Validation](jwt-validation.md) - Token verification details
- [Auth Flows](auth-flows.md) - Authentication flow diagrams
- [Error Handling](error-handling.md) - Error response patterns
