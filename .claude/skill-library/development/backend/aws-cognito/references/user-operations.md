# User Operations

Complete guide for user management operations with AWS Cognito using Go SDK v2.

## Table of Contents

- [Sign Up](#sign-up)
- [Confirm Sign Up](#confirm-sign-up)
- [Sign In](#sign-in)
- [Password Management](#password-management)
- [MFA Operations](#mfa-operations)
- [Secret Hash Computation](#secret-hash-computation)

## Sign Up

### Basic Registration

```go
import (
    "context"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

type User struct {
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"password"`
}

func (s *CognitoStore) SignUp(ctx context.Context, user *User) error {
    input := &cognitoidentityprovider.SignUpInput{
        ClientId: aws.String(s.clientId),
        Password: aws.String(user.Password),
        Username: aws.String(user.Email),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("name"), Value: aws.String(user.Name)},
            {Name: aws.String("email"), Value: aws.String(user.Email)},
        },
        SecretHash: aws.String(s.generateSecretHash(user.Email)),
    }

    _, err := s.client.SignUp(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to sign up: %w", err)
    }

    return nil
}
```

### With Custom Attributes

```go
func SignUpWithCustomAttributes(ctx context.Context, user *User) error {
    input := &cognitoidentityprovider.SignUpInput{
        ClientId: aws.String(clientId),
        Username: aws.String(user.Email),
        Password: aws.String(user.Password),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("name"), Value: aws.String(user.Name)},
            {Name: aws.String("email"), Value: aws.String(user.Email)},
            // Custom attributes MUST be prefixed with "custom:"
            {Name: aws.String("custom:tenant_id"), Value: aws.String(user.TenantId)},
            {Name: aws.String("custom:role"), Value: aws.String(user.Role)},
        },
    }

    _, err := client.SignUp(ctx, input)
    return err
}
```

**User Attributes:**

- Standard attributes: `name`, `email`, `phone_number`, `given_name`, `family_name`
- Custom attributes: Must be prefixed with `custom:` (e.g., `custom:tenant_id`)
- Email/Phone: At least one must be provided for verification

## Confirm Sign Up

### Email Confirmation

```go
type ConfirmationParams struct {
    Email string `json:"email"`
    Code  string `json:"code"`
}

func (s *CognitoStore) ConfirmAccount(ctx context.Context, params *ConfirmationParams) error {
    _, err := s.client.ConfirmSignUp(ctx, &cognitoidentityprovider.ConfirmSignUpInput{
        ClientId:         aws.String(s.clientId),
        ConfirmationCode: aws.String(params.Code),
        Username:         aws.String(params.Email),
        SecretHash:       aws.String(s.generateSecretHash(params.Email)),
    })

    if err != nil {
        return fmt.Errorf("failed to confirm account: %w", err)
    }

    return nil
}
```

### Phone Verification

```go
func VerifyPhoneNumber(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken, verificationCode string) error {

    input := &cognitoidentityprovider.VerifyUserAttributeInput{
        AccessToken:   aws.String(accessToken),
        AttributeName: aws.String("phone_number"),
        Code:          aws.String(verificationCode),
    }

    _, err := client.VerifyUserAttribute(ctx, input)
    return err
}

func RequestPhoneVerificationCode(ctx context.Context,
    client *cognitoidentityprovider.Client, accessToken string) error {

    input := &cognitoidentityprovider.GetUserAttributeVerificationCodeInput{
        AccessToken:   aws.String(accessToken),
        AttributeName: aws.String("phone_number"),
    }

    _, err := client.GetUserAttributeVerificationCode(ctx, input)
    return err
}
```

**Verification Code Details:**

- Email codes: Cannot customize length
- SMS codes: Always 6 digits
- Validity: Approximately 3 minutes for SMS codes
- Delivery: Via Amazon SES (email) or SNS (SMS)

## Sign In

### USER_PASSWORD_AUTH Flow

The simplest authentication flow using username and password directly.

```go
type LoginParams struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type AuthResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int32  `json:"expires_in"`
}

func (s *CognitoStore) Login(ctx context.Context, params *LoginParams) (*AuthResponse, error) {
    output, err := s.client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow: types.AuthFlowTypeUserPasswordAuth,
        ClientId: aws.String(s.clientId),
        AuthParameters: map[string]string{
            "USERNAME":    params.Email,
            "PASSWORD":    params.Password,
            "SECRET_HASH": s.generateSecretHash(params.Email),
        },
    })

    if err != nil {
        return nil, fmt.Errorf("authentication failed: %w", err)
    }

    result := output.AuthenticationResult
    if result == nil {
        return nil, errors.New("invalid authentication result")
    }

    return &AuthResponse{
        AccessToken:  aws.ToString(result.AccessToken),
        RefreshToken: aws.ToString(result.RefreshToken),
        ExpiresIn:    result.ExpiresIn,
    }, nil
}
```

**Configuration Required:**

- Enable `ALLOW_USER_PASSWORD_AUTH` in Cognito app client settings
- This is a non-SRP flow suitable for server-side applications

### Refresh Token Flow

```go
func RefreshAccessToken(ctx context.Context, client *cognitoidentityprovider.Client,
    clientId, refreshToken string) (*types.AuthenticationResultType, error) {

    output, err := client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow: types.AuthFlowTypeRefreshTokenAuth,
        ClientId: aws.String(clientId),
        AuthParameters: map[string]string{
            "REFRESH_TOKEN": refreshToken,
        },
    })

    if err != nil {
        return nil, fmt.Errorf("failed to refresh token: %w", err)
    }

    return output.AuthenticationResult, nil
}
```

**Token Lifetime:**

- Access tokens: Short-lived (typically 5-60 minutes)
- Refresh tokens: Long-lived (typically 1-30 days)
- ID tokens: Short-lived (same as access tokens)

## Password Management

### Change Password

```go
func ChangePassword(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken, previousPassword, proposedPassword string) error {

    _, err := client.ChangePassword(ctx, &cognitoidentityprovider.ChangePasswordInput{
        AccessToken:      aws.String(accessToken),
        PreviousPassword: aws.String(previousPassword),
        ProposedPassword: aws.String(proposedPassword),
    })

    return err
}
```

### Forgot Password Flow

```go
// Step 1: Initiate password reset
func ForgotPassword(ctx context.Context, client *cognitoidentityprovider.Client,
    clientId, clientSecret, username string) error {

    _, err := client.ForgotPassword(ctx, &cognitoidentityprovider.ForgotPasswordInput{
        ClientId:   aws.String(clientId),
        Username:   aws.String(username),
        SecretHash: aws.String(generateSecretHash(username, clientId, clientSecret)),
    })

    return err
}

// Step 2: Confirm with code and new password
func ConfirmForgotPassword(ctx context.Context, client *cognitoidentityprovider.Client,
    clientId, clientSecret, username, code, newPassword string) error {

    _, err := client.ConfirmForgotPassword(ctx, &cognitoidentityprovider.ConfirmForgotPasswordInput{
        ClientId:         aws.String(clientId),
        Username:         aws.String(username),
        ConfirmationCode: aws.String(code),
        Password:         aws.String(newPassword),
        SecretHash:       aws.String(generateSecretHash(username, clientId, clientSecret)),
    })

    return err
}
```

## MFA Operations

### Set Up TOTP MFA

```go
// Step 1: Associate software token
func AssociateSoftwareToken(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken string) (string, error) {

    output, err := client.AssociateSoftwareToken(ctx, &cognitoidentityprovider.AssociateSoftwareTokenInput{
        AccessToken: aws.String(accessToken),
    })

    if err != nil {
        return "", fmt.Errorf("failed to associate software token: %w", err)
    }

    return aws.ToString(output.SecretCode), nil
}

// Step 2: Verify the TOTP code
func VerifySoftwareToken(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken, userCode, friendlyDeviceName string) error {

    _, err := client.VerifySoftwareToken(ctx, &cognitoidentityprovider.VerifySoftwareTokenInput{
        AccessToken:        aws.String(accessToken),
        UserCode:           aws.String(userCode),
        FriendlyDeviceName: aws.String(friendlyDeviceName),
    })

    return err
}

// Step 3: Set MFA preference
func SetUserMFAPreference(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken string, enableTOTP bool) error {

    _, err := client.SetUserMFAPreference(ctx, &cognitoidentityprovider.SetUserMFAPreferenceInput{
        AccessToken: aws.String(accessToken),
        SoftwareTokenMfaSettings: &types.SoftwareTokenMfaSettingsType{
            Enabled:      enableTOTP,
            PreferredMfa: enableTOTP,
        },
    })

    return err
}
```

### Handle MFA Challenge

```go
func RespondToMFAChallenge(ctx context.Context, client *cognitoidentityprovider.Client,
    session, mfaCode, username, clientId string) (*types.AuthenticationResultType, error) {

    output, err := client.RespondToAuthChallenge(ctx, &cognitoidentityprovider.RespondToAuthChallengeInput{
        ChallengeName: types.ChallengeNameTypeSoftwareTokenMfa,
        ClientId:      aws.String(clientId),
        Session:       aws.String(session),
        ChallengeResponses: map[string]string{
            "USERNAME":                 username,
            "SOFTWARE_TOKEN_MFA_CODE":  mfaCode,
        },
    })

    if err != nil {
        return nil, fmt.Errorf("MFA verification failed: %w", err)
    }

    return output.AuthenticationResult, nil
}
```

**MFA Types:**

| Type               | Description                | Security Level     |
| ------------------ | -------------------------- | ------------------ |
| SMS_MFA            | SMS-based codes            | Medium             |
| SOFTWARE_TOKEN_MFA | TOTP via authenticator app | High (Recommended) |

## Secret Hash Computation

When using a Cognito app client with a client secret, you must compute a secret hash.

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
)

func generateSecretHash(username, clientId, clientSecret string) string {
    h := hmac.New(sha256.New, []byte(clientSecret))
    h.Write([]byte(username + clientId))
    return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
```

**Formula:** `Base64(HMAC-SHA256(ClientSecret, Username + ClientId))`

**When Required:**

- SignUp
- ConfirmSignUp
- InitiateAuth (USER_PASSWORD_AUTH)
- ForgotPassword
- ConfirmForgotPassword

**When NOT Required:**

- App client has no secret configured
- Using SRP authentication with cognito-srp library
- Admin operations (use IAM credentials)

## Related References

- [Auth Flows](auth-flows.md) - Authentication flow details
- [JWT Validation](jwt-validation.md) - Token verification
- [Error Handling](error-handling.md) - Error types and retry strategies
