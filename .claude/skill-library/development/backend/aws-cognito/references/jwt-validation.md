# JWT Token Validation

Complete implementation guide for validating Cognito JWT tokens in Go.

## Table of Contents

- [Why Validate Tokens](#why-validate-tokens)
- [Validation Steps](#validation-steps)
- [Implementation](#implementation)
- [JWK Set Caching](#jwk-set-caching)
- [Debugging Token Issues](#debugging-token-issues)

## Why Validate Tokens

**Every API request MUST validate the JWT token.** Skipping validation is a critical security vulnerability.

**What can go wrong without validation:**
- ❌ Expired tokens accepted (replay attacks)
- ❌ Forged tokens accepted (impersonation)
- ❌ Tokens from other User Pools accepted
- ❌ Wrong token type used (id token instead of access token)

## Validation Steps

Complete validation requires 7 steps:

```
1. Extract token from Authorization header
2. Decode JWT header (get 'kid' field)
3. Fetch JWK Set from Cognito
4. Find matching public key by 'kid'
5. Verify signature using public key
6. Verify standard claims (exp, iss, token_use)
7. Extract and use identity claims
```

## Implementation

### Step 1: Extract Token from Header

```go
func ExtractToken(authHeader string) (string, error) {
    // Format: "Bearer {token}"
    parts := strings.Split(authHeader, " ")
    if len(parts) != 2 || parts[0] != "Bearer" {
        return "", fmt.Errorf("invalid authorization header format")
    }
    return parts[1], nil
}
```

### Step 2-5: Verify Token Signature

```go
import (
    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/jwk"
)

func ValidateToken(tokenString string, userPoolID string, region string) (*jwt.Token, error) {
    // 2. Decode token header to get 'kid'
    token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
    if err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)
    }

    kid, ok := token.Header["kid"].(string)
    if !ok {
        return nil, fmt.Errorf("kid not found in token header")
    }

    // 3. Fetch JWK Set (with caching - see below)
    jwksURL := fmt.Sprintf(
        "https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
        region, userPoolID,
    )

    jwkSet, err := fetchJWKSet(jwksURL) // Implement caching
    if err != nil {
        return nil, fmt.Errorf("failed to fetch JWK set: %w", err)
    }

    // 4. Find matching key
    key, found := jwkSet.LookupKeyID(kid)
    if !found {
        return nil, fmt.Errorf("key %s not found in JWK set", kid)
    }

    // 5. Verify signature
    var publicKey interface{}
    if err := key.Raw(&publicKey); err != nil {
        return nil, fmt.Errorf("failed to get public key: %w", err)
    }

    token, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return publicKey, nil
    })

    if err != nil {
        return nil, fmt.Errorf("token validation failed: %w", err)
    }

    return token, nil
}
```

### Step 6: Verify Claims

```go
func VerifyClaims(token *jwt.Token, userPoolID string, region string) error {
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return fmt.Errorf("invalid claims format")
    }

    // Verify issuer
    expectedIss := fmt.Sprintf(
        "https://cognito-idp.%s.amazonaws.com/%s",
        region, userPoolID,
    )
    if iss, ok := claims["iss"].(string); !ok || iss != expectedIss {
        return fmt.Errorf("invalid issuer: expected %s, got %s", expectedIss, iss)
    }

    // Verify token_use (access or id)
    tokenUse, ok := claims["token_use"].(string)
    if !ok {
        return fmt.Errorf("token_use claim missing")
    }
    if tokenUse != "access" && tokenUse != "id" {
        return fmt.Errorf("invalid token_use: %s", tokenUse)
    }

    // Verify expiration (jwt-go does this automatically, but explicit check is good)
    if exp, ok := claims["exp"].(float64); ok {
        if time.Now().Unix() > int64(exp) {
            return fmt.Errorf("token expired")
        }
    } else {
        return fmt.Errorf("exp claim missing")
    }

    return nil
}
```

### Step 7: Extract User Identity

```go
func ExtractUserID(token *jwt.Token) (string, error) {
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return "", fmt.Errorf("invalid claims")
    }

    sub, ok := claims["sub"].(string)
    if !ok {
        return "", fmt.Errorf("sub claim missing")
    }

    return sub, nil
}

func ExtractUsername(token *jwt.Token) (string, error) {
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return "", fmt.Errorf("invalid claims")
    }

    username, ok := claims["cognito:username"].(string)
    if !ok {
        return "", fmt.Errorf("cognito:username claim missing")
    }

    return username, nil
}

func ExtractGroups(token *jwt.Token) ([]string, error) {
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return nil, fmt.Errorf("invalid claims")
    }

    groupsInterface, ok := claims["cognito:groups"]
    if !ok {
        return []string{}, nil // No groups is valid
    }

    groupsArray, ok := groupsInterface.([]interface{})
    if !ok {
        return nil, fmt.Errorf("cognito:groups is not an array")
    }

    groups := make([]string, len(groupsArray))
    for i, g := range groupsArray {
        groups[i], ok = g.(string)
        if !ok {
            return nil, fmt.Errorf("group at index %d is not a string", i)
        }
    }

    return groups, nil
}
```

## JWK Set Caching

**Problem**: Fetching JWK Set on every request adds latency (100-500ms)

**Solution**: Cache JWK Sets locally, refresh periodically

### Implementation with sync.Map

```go
import (
    "sync"
    "time"
)

type jwkCache struct {
    mu      sync.RWMutex
    sets    map[string]*cachedJWKSet
}

type cachedJWKSet struct {
    jwkSet    jwk.Set
    fetchedAt time.Time
}

var (
    cache = &jwkCache{
        sets: make(map[string]*cachedJWKSet),
    }
    cacheTTL = 6 * time.Hour // Refresh every 6 hours
)

func fetchJWKSet(url string) (jwk.Set, error) {
    // Check cache first
    cache.mu.RLock()
    cached, exists := cache.sets[url]
    cache.mu.RUnlock()

    if exists && time.Since(cached.fetchedAt) < cacheTTL {
        return cached.jwkSet, nil
    }

    // Fetch from Cognito
    jwkSet, err := jwk.Fetch(context.Background(), url)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch JWK set: %w", err)
    }

    // Update cache
    cache.mu.Lock()
    cache.sets[url] = &cachedJWKSet{
        jwkSet:    jwkSet,
        fetchedAt: time.Now(),
    }
    cache.mu.Unlock()

    return jwkSet, nil
}
```

### Cache Strategy

| Scenario | TTL | Rationale |
|----------|-----|-----------|
| Normal operation | 6 hours | Balance between latency and freshness |
| Key not found | Force refresh | Key rotation may have occurred |
| Validation fails | Force refresh | JWK Set may be stale |
| First request | Fetch immediately | Populate cache |

## Debugging Token Issues

### Issue 1: "signature is invalid"

**Possible causes:**
1. JWK Set is stale (key rotated)
2. Token was modified/tampered
3. Using wrong User Pool ID

**Debug steps:**
```bash
# 1. Check token header
echo "eyJraWQ..." | cut -d. -f1 | base64 -d

# 2. Fetch JWK Set manually
curl https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/jwks.json

# 3. Verify kid exists in JWK Set
# Compare token header 'kid' with JWK Set 'kid' values

# 4. Force cache refresh
# Clear cache and retry validation
```

### Issue 2: "token has expired"

**Possible causes:**
1. Token actually expired (check `exp` claim)
2. System clock skew
3. Token not refreshed before expiration

**Debug steps:**
```bash
# 1. Decode token and check exp
echo "eyJraWQ..." | cut -d. -f2 | base64 -d | jq '.exp'

# 2. Compare with current time
date +%s

# 3. Check time difference (should be < 5 minutes)
```

### Issue 3: "issuer mismatch"

**Possible causes:**
1. Wrong User Pool ID in validation
2. Token from different environment (dev vs prod)
3. Region mismatch

**Debug steps:**
```bash
# 1. Check token issuer
echo "eyJraWQ..." | cut -d. -f2 | base64 -d | jq '.iss'

# 2. Verify User Pool ID
# Should match: https://cognito-idp.{region}.amazonaws.com/{userPoolId}

# 3. Check environment variables
echo $COGNITO_USER_POOL_ID
echo $AWS_REGION
```

## Complete Example

See `examples/jwt-validation-example.go` for a complete, production-ready implementation.

## Related References

- [Architecture](architecture.md) - Token types and flows
- [Chariot Patterns](chariot-patterns.md) - Middleware integration
- [Error Handling](error-handling.md) - Error response format
