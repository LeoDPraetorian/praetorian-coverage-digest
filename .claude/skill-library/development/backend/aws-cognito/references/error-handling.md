# Error Handling

Cognito-specific error handling and retry strategies for Go SDK v2.

## Table of Contents

- [Cognito Error Types](#cognito-error-types)
- [Retry Strategies](#retry-strategies)
- [Error Response Format](#error-response-format)
- [Common Error Scenarios](#common-error-scenarios)
- [Production Patterns](#production-patterns)

## Cognito Error Types

### Authentication Errors

| Exception                      | HTTP | Cause                         | User Action              |
| ------------------------------ | ---- | ----------------------------- | ------------------------ |
| NotAuthorizedException         | 401  | Invalid credentials           | Re-enter credentials     |
| UserNotFoundException          | 404  | User doesn't exist            | Check email/register     |
| UserNotConfirmedException      | 403  | Email not verified            | Check verification email |
| PasswordResetRequiredException | 403  | Admin requires password reset | Reset password           |
| InvalidPasswordException       | 400  | Password policy violation     | Use stronger password    |

### Verification Errors

| Exception              | HTTP | Cause                   | User Action       |
| ---------------------- | ---- | ----------------------- | ----------------- |
| CodeMismatchException  | 400  | Wrong verification code | Re-enter code     |
| ExpiredCodeException   | 400  | Code expired            | Request new code  |
| LimitExceededException | 400  | Too many code requests  | Wait before retry |

### Registration Errors

| Exception                 | HTTP | Cause                | User Action         |
| ------------------------- | ---- | -------------------- | ------------------- |
| UsernameExistsException   | 409  | Email already in use | Use different email |
| InvalidParameterException | 400  | Invalid input format | Fix input data      |

### Rate Limiting

| Exception                      | HTTP | Cause               | Action              |
| ------------------------------ | ---- | ------------------- | ------------------- |
| TooManyRequestsException       | 429  | Rate limit exceeded | Exponential backoff |
| TooManyFailedAttemptsException | 429  | Too many failures   | Wait/reset password |

## Retry Strategies

### Typed Error Handling

```go
import (
    "errors"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
    output, err := s.client.InitiateAuth(ctx, input)
    if err != nil {
        return nil, s.handleAuthError(err)
    }
    return parseAuthResult(output), nil
}

func (s *AuthService) handleAuthError(err error) error {
    // Authentication errors (don't retry)
    var notAuthErr *types.NotAuthorizedException
    if errors.As(err, &notAuthErr) {
        return &AuthError{Code: 401, Message: "Invalid email or password", Retry: false}
    }

    var userNotFoundErr *types.UserNotFoundException
    if errors.As(err, &userNotFoundErr) {
        // Return same message to prevent user enumeration
        return &AuthError{Code: 401, Message: "Invalid email or password", Retry: false}
    }

    var notConfirmedErr *types.UserNotConfirmedException
    if errors.As(err, &notConfirmedErr) {
        return &AuthError{Code: 403, Message: "Please verify your email first", Retry: false}
    }

    // Rate limiting (retry with backoff)
    var tooManyErr *types.TooManyRequestsException
    if errors.As(err, &tooManyErr) {
        return &AuthError{Code: 429, Message: "Too many requests, try again later", Retry: true}
    }

    // Generic error
    return &AuthError{Code: 500, Message: "Authentication service unavailable", Retry: true}
}
```

### Exponential Backoff

```go
import (
    "math"
    "math/rand"
    "time"
)

type RetryConfig struct {
    MaxAttempts int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
}

func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxAttempts: 3,
        BaseDelay:   100 * time.Millisecond,
        MaxDelay:    5 * time.Second,
    }
}

func (c RetryConfig) Backoff(attempt int) time.Duration {
    delay := float64(c.BaseDelay) * math.Pow(2, float64(attempt))

    // Add jitter (0-25% of delay)
    jitter := delay * 0.25 * rand.Float64()
    delay += jitter

    if time.Duration(delay) > c.MaxDelay {
        return c.MaxDelay
    }
    return time.Duration(delay)
}

func (s *AuthService) LoginWithRetry(ctx context.Context, email, password string) (*AuthResult, error) {
    cfg := DefaultRetryConfig()

    var lastErr error
    for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
        result, err := s.Login(ctx, email, password)
        if err == nil {
            return result, nil
        }

        // Check if error is retryable
        var authErr *AuthError
        if errors.As(err, &authErr) && !authErr.Retry {
            return nil, err
        }

        lastErr = err

        // Wait before retry
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(cfg.Backoff(attempt)):
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}
```

### SDK Built-in Retry

```go
import (
    "github.com/aws/aws-sdk-go-v2/aws/retry"
    "github.com/aws/aws-sdk-go-v2/config"
)

func NewClientWithRetry(ctx context.Context) (*cognitoidentityprovider.Client, error) {
    cfg, err := config.LoadDefaultConfig(ctx,
        config.WithRetryer(func() aws.Retryer {
            return retry.NewStandard(func(o *retry.StandardOptions) {
                o.MaxAttempts = 5
                o.MaxBackoff = 30 * time.Second
                // Add custom retryable error codes
                o.Retryables = append(o.Retryables,
                    retry.IsErrorRetryableFunc(func(err error) aws.Ternary {
                        var tooMany *types.TooManyRequestsException
                        if errors.As(err, &tooMany) {
                            return aws.TrueTernary
                        }
                        return aws.UnknownTernary
                    }),
                )
            })
        }),
    )
    if err != nil {
        return nil, err
    }

    return cognitoidentityprovider.NewFromConfig(cfg), nil
}
```

## Error Response Format

### Structured Error Type

```go
type AuthError struct {
    Code       int    `json:"code"`
    Message    string `json:"message"`
    InternalError error `json:"-"`
    Retry      bool   `json:"-"`
}

func (e *AuthError) Error() string {
    return e.Message
}

func (e *AuthError) Unwrap() error {
    return e.InternalError
}
```

### API Response Format

```go
type APIErrorResponse struct {
    Error   string `json:"error"`
    Code    string `json:"code,omitempty"`
    Details string `json:"details,omitempty"`
}

func (s *AuthService) HandleHTTPError(w http.ResponseWriter, err error) {
    var authErr *AuthError
    if errors.As(err, &authErr) {
        w.WriteHeader(authErr.Code)
        json.NewEncoder(w).Encode(APIErrorResponse{
            Error: authErr.Message,
        })
        return
    }

    // Default 500 error
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(APIErrorResponse{
        Error: "Internal server error",
    })
}
```

## Common Error Scenarios

### Scenario 1: Invalid Credentials

```go
func handleLogin(ctx context.Context, email, password string) error {
    _, err := client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow: types.AuthFlowTypeUserPasswordAuth,
        ClientId: aws.String(clientId),
        AuthParameters: map[string]string{
            "USERNAME": email,
            "PASSWORD": password,
        },
    })

    if err != nil {
        var notAuthErr *types.NotAuthorizedException
        var userNotFoundErr *types.UserNotFoundException

        // Return same error for both to prevent user enumeration
        if errors.As(err, &notAuthErr) || errors.As(err, &userNotFoundErr) {
            return errors.New("invalid email or password")
        }

        return fmt.Errorf("authentication failed: %w", err)
    }
    return nil
}
```

### Scenario 2: Rate Limiting

```go
func handleRateLimit(err error) (shouldRetry bool, waitTime time.Duration) {
    var tooManyErr *types.TooManyRequestsException
    if errors.As(err, &tooManyErr) {
        return true, 5 * time.Second
    }

    var limitErr *types.LimitExceededException
    if errors.As(err, &limitErr) {
        return true, 30 * time.Second
    }

    return false, 0
}
```

### Scenario 3: Verification Code Errors

```go
func handleConfirmSignUp(ctx context.Context, email, code string) error {
    _, err := client.ConfirmSignUp(ctx, &cognitoidentityprovider.ConfirmSignUpInput{
        ClientId:         aws.String(clientId),
        Username:         aws.String(email),
        ConfirmationCode: aws.String(code),
    })

    if err != nil {
        var codeMismatchErr *types.CodeMismatchException
        if errors.As(err, &codeMismatchErr) {
            return errors.New("invalid verification code")
        }

        var expiredCodeErr *types.ExpiredCodeException
        if errors.As(err, &expiredCodeErr) {
            return errors.New("verification code expired, please request a new one")
        }

        return fmt.Errorf("confirmation failed: %w", err)
    }
    return nil
}
```

## Production Patterns

### Centralized Error Handler

```go
type CognitoErrorHandler struct {
    logger *slog.Logger
}

func (h *CognitoErrorHandler) Handle(err error, operation string) *AuthError {
    // Log internal error details
    h.logger.Error("Cognito operation failed",
        "operation", operation,
        "error", err.Error(),
    )

    // Return user-safe error
    return h.classifyError(err)
}

func (h *CognitoErrorHandler) classifyError(err error) *AuthError {
    errorMap := []struct {
        check   func(error) bool
        result  *AuthError
    }{
        {
            check: func(e error) bool {
                var err *types.NotAuthorizedException
                return errors.As(e, &err)
            },
            result: &AuthError{Code: 401, Message: "Invalid credentials"},
        },
        {
            check: func(e error) bool {
                var err *types.UserNotFoundException
                return errors.As(e, &err)
            },
            result: &AuthError{Code: 401, Message: "Invalid credentials"},
        },
        {
            check: func(e error) bool {
                var err *types.TooManyRequestsException
                return errors.As(e, &err)
            },
            result: &AuthError{Code: 429, Message: "Too many requests", Retry: true},
        },
    }

    for _, em := range errorMap {
        if em.check(err) {
            em.result.InternalError = err
            return em.result
        }
    }

    return &AuthError{Code: 500, Message: "Service unavailable", Retry: true, InternalError: err}
}
```

### Security Best Practices

1. **Never expose internal errors** - Log details, return generic messages
2. **Prevent user enumeration** - Same error for "not found" and "wrong password"
3. **Rate limit handling** - Implement exponential backoff
4. **Timeout protection** - Always use context with timeout
5. **Error logging** - Log for debugging, sanitize for users

```go
func sanitizeForLogging(email string) string {
    if len(email) < 4 {
        return "***"
    }
    return email[:2] + "***" + email[len(email)-2:]
}

func (s *AuthService) logError(ctx context.Context, operation string, email string, err error) {
    s.logger.ErrorContext(ctx, "Authentication error",
        "operation", operation,
        "user", sanitizeForLogging(email),
        "error_type", fmt.Sprintf("%T", err),
        // Never log full error message in production
    )
}
```

## Related References

- [SDK Reference](sdk-reference.md) - SDK error types
- [Auth Flows](auth-flows.md) - Flow-specific errors
- [User Operations](user-operations.md) - Operation examples
