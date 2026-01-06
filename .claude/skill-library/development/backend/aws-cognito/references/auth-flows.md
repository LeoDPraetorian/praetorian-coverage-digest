# Authentication Flows

Detailed documentation for Cognito authentication flows with Go SDK v2 implementation.

## Table of Contents

- [USER_PASSWORD_AUTH](#user_password_auth)
- [USER_SRP_AUTH](#user_srp_auth)
- [REFRESH_TOKEN_AUTH](#refresh_token_auth)
- [CUSTOM_AUTH](#custom_auth)
- [Flow Selection Guide](#flow-selection-guide)
- [Challenge Handling](#challenge-handling)

## USER_PASSWORD_AUTH

Standard username/password authentication. Password is sent over TLS.

### Flow Diagram

```
Client                          Cognito
  |                                |
  |------ InitiateAuth ----------->|
  |       (username, password)     |
  |                                |
  |<----- AuthenticationResult ----|
  |       (tokens or challenge)    |
```

### Implementation

```go
func (s *AuthService) LoginWithPassword(ctx context.Context, email, password string) (*AuthResult, error) {
    output, err := s.client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow: types.AuthFlowTypeUserPasswordAuth,
        ClientId: aws.String(s.clientId),
        AuthParameters: map[string]string{
            "USERNAME":    email,
            "PASSWORD":    password,
            "SECRET_HASH": s.generateSecretHash(email),
        },
    })

    if err != nil {
        return nil, fmt.Errorf("authentication failed: %w", err)
    }

    // Check if MFA challenge is required
    if output.ChallengeName != "" {
        return &AuthResult{
            Challenge:  string(output.ChallengeName),
            Session:    aws.ToString(output.Session),
        }, nil
    }

    return &AuthResult{
        AccessToken:  aws.ToString(output.AuthenticationResult.AccessToken),
        RefreshToken: aws.ToString(output.AuthenticationResult.RefreshToken),
        IdToken:      aws.ToString(output.AuthenticationResult.IdToken),
        ExpiresIn:    output.AuthenticationResult.ExpiresIn,
    }, nil
}
```

### Configuration

Enable in Cognito app client settings:

- `ALLOW_USER_PASSWORD_AUTH`: Required for this flow

**Security Note:** Password is transmitted (over TLS). For higher security, use USER_SRP_AUTH.

## USER_SRP_AUTH

Secure Remote Password authentication. Password is never transmitted.

### Flow Diagram

```
Client                          Cognito
  |                                |
  |------ InitiateAuth ----------->|
  |       (SRP_A, username)        |
  |                                |
  |<----- PASSWORD_VERIFIER -------|
  |       (challenge params)       |
  |                                |
  |------ RespondToAuthChallenge ->|
  |       (SRP_M1)                 |
  |                                |
  |<----- AuthenticationResult ----|
  |       (tokens)                 |
```

### Implementation

```go
import (
    "context"
    "time"
    cognitosrp "github.com/alexrudd/cognito-srp/v4"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func AuthenticateWithSRP(ctx context.Context, client *cognitoidentityprovider.Client,
    username, password, poolId, clientId string) (*types.AuthenticationResultType, error) {

    // Create SRP client
    csrp, err := cognitosrp.NewCognitoSRP(username, password, poolId, clientId, nil)
    if err != nil {
        return nil, fmt.Errorf("failed to create SRP client: %w", err)
    }

    // Step 1: Initiate auth with SRP parameters
    initOutput, err := client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow:       types.AuthFlowTypeUserSrpAuth,
        ClientId:       aws.String(csrp.GetClientId()),
        AuthParameters: csrp.GetAuthParams(),
    })
    if err != nil {
        return nil, fmt.Errorf("InitiateAuth failed: %w", err)
    }

    // Step 2: Handle password verifier challenge
    if initOutput.ChallengeName != types.ChallengeNameTypePasswordVerifier {
        return nil, fmt.Errorf("unexpected challenge: %s", initOutput.ChallengeName)
    }

    challengeResponses, err := csrp.PasswordVerifierChallenge(
        initOutput.ChallengeParameters, time.Now())
    if err != nil {
        return nil, fmt.Errorf("failed to compute verifier: %w", err)
    }

    // Step 3: Respond to challenge
    challengeOutput, err := client.RespondToAuthChallenge(ctx,
        &cognitoidentityprovider.RespondToAuthChallengeInput{
            ChallengeName:      types.ChallengeNameTypePasswordVerifier,
            ChallengeResponses: challengeResponses,
            ClientId:           aws.String(csrp.GetClientId()),
        })
    if err != nil {
        return nil, fmt.Errorf("RespondToAuthChallenge failed: %w", err)
    }

    return challengeOutput.AuthenticationResult, nil
}
```

### Library

- **Package:** `github.com/alexrudd/cognito-srp/v4`
- **Version:** v4.1.0 (current)
- **License:** Apache 2.0

**Why Use SRP:**

| Aspect         | USER_PASSWORD_AUTH | USER_SRP_AUTH     |
| -------------- | ------------------ | ----------------- |
| Password Sent  | Yes (over TLS)     | Never transmitted |
| Security Level | Medium             | High              |
| Complexity     | Simple             | More complex      |
| Best For       | Server-side apps   | Mobile/native     |

## REFRESH_TOKEN_AUTH

Refresh access tokens without requiring re-authentication.

### Flow Diagram

```
Client                          Cognito
  |                                |
  |------ InitiateAuth ----------->|
  |       (refresh_token)          |
  |                                |
  |<----- AuthenticationResult ----|
  |       (new access/id tokens)   |
```

### Implementation

```go
func (s *AuthService) RefreshTokens(ctx context.Context, refreshToken string) (*AuthResult, error) {
    output, err := s.client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow: types.AuthFlowTypeRefreshTokenAuth,
        ClientId: aws.String(s.clientId),
        AuthParameters: map[string]string{
            "REFRESH_TOKEN": refreshToken,
        },
    })

    if err != nil {
        return nil, fmt.Errorf("token refresh failed: %w", err)
    }

    result := output.AuthenticationResult
    return &AuthResult{
        AccessToken: aws.ToString(result.AccessToken),
        IdToken:     aws.ToString(result.IdToken),
        ExpiresIn:   result.ExpiresIn,
        // Note: Refresh token may or may not be returned
        RefreshToken: aws.ToString(result.RefreshToken),
    }, nil
}
```

### Token Lifetimes

| Token Type    | Default Lifetime | Configurable Range |
| ------------- | ---------------- | ------------------ |
| Access Token  | 60 minutes       | 5 min - 24 hours   |
| ID Token      | 60 minutes       | 5 min - 24 hours   |
| Refresh Token | 30 days          | 60 min - 10 years  |

### Best Practices

- Refresh tokens at 75% of access token lifetime
- Handle refresh token rotation if enabled
- Store refresh tokens securely (encrypted at rest)

## CUSTOM_AUTH

Custom authentication challenges defined by Lambda triggers.

### Flow Diagram

```
Client                          Cognito                   Lambda
  |                                |                         |
  |------ InitiateAuth ----------->|                         |
  |       (CUSTOM_AUTH)            |                         |
  |                                |--- DefineAuthChallenge->|
  |                                |<-- Challenge response --|
  |<----- Custom Challenge --------|                         |
  |                                |                         |
  |------ RespondToAuthChallenge ->|                         |
  |       (answer)                 |                         |
  |                                |--- VerifyAuthChallenge->|
  |                                |<-- Verification result -|
  |<----- AuthenticationResult ----|                         |
```

### Implementation

```go
func (s *AuthService) InitiateCustomAuth(ctx context.Context, username string,
    challengeParams map[string]string) (*AuthResult, error) {

    authParams := map[string]string{
        "USERNAME": username,
    }
    // Add custom parameters
    for k, v := range challengeParams {
        authParams[k] = v
    }

    output, err := s.client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
        AuthFlow:       types.AuthFlowTypeCustomAuth,
        ClientId:       aws.String(s.clientId),
        AuthParameters: authParams,
    })

    if err != nil {
        return nil, fmt.Errorf("custom auth initiation failed: %w", err)
    }

    if output.ChallengeName != "" {
        return &AuthResult{
            Challenge:           string(output.ChallengeName),
            Session:             aws.ToString(output.Session),
            ChallengeParameters: output.ChallengeParameters,
        }, nil
    }

    return &AuthResult{
        AccessToken:  aws.ToString(output.AuthenticationResult.AccessToken),
        RefreshToken: aws.ToString(output.AuthenticationResult.RefreshToken),
        IdToken:      aws.ToString(output.AuthenticationResult.IdToken),
    }, nil
}

func (s *AuthService) RespondToCustomChallenge(ctx context.Context,
    session string, responses map[string]string) (*AuthResult, error) {

    output, err := s.client.RespondToAuthChallenge(ctx,
        &cognitoidentityprovider.RespondToAuthChallengeInput{
            ChallengeName:      types.ChallengeNameTypeCustomChallenge,
            ClientId:           aws.String(s.clientId),
            Session:            aws.String(session),
            ChallengeResponses: responses,
        })

    if err != nil {
        return nil, fmt.Errorf("challenge response failed: %w", err)
    }

    // May need additional challenges
    if output.ChallengeName != "" {
        return &AuthResult{
            Challenge:           string(output.ChallengeName),
            Session:             aws.ToString(output.Session),
            ChallengeParameters: output.ChallengeParameters,
        }, nil
    }

    return &AuthResult{
        AccessToken:  aws.ToString(output.AuthenticationResult.AccessToken),
        RefreshToken: aws.ToString(output.AuthenticationResult.RefreshToken),
        IdToken:      aws.ToString(output.AuthenticationResult.IdToken),
    }, nil
}
```

### Use Cases

- Passwordless authentication (email/SMS OTP)
- CAPTCHA verification
- Custom MFA implementations
- Risk-based authentication

## Flow Selection Guide

| Flow               | Security | Complexity | Best For                     |
| ------------------ | -------- | ---------- | ---------------------------- |
| USER_PASSWORD_AUTH | Medium   | Low        | Server-side apps, migrations |
| USER_SRP_AUTH      | High     | Medium     | Mobile/native apps (default) |
| REFRESH_TOKEN_AUTH | High     | Low        | Token renewal                |
| CUSTOM_AUTH        | Variable | High       | Custom flows, passwordless   |

**Decision Tree:**

```
Is this token refresh?
├─ YES → REFRESH_TOKEN_AUTH
└─ NO → Is password transmitted acceptable?
        ├─ YES → USER_PASSWORD_AUTH (simpler)
        └─ NO → Is custom flow needed?
                ├─ YES → CUSTOM_AUTH
                └─ NO → USER_SRP_AUTH (recommended)
```

## Challenge Handling

### Common Challenge Types

```go
const (
    ChallengeSMSMFA           = types.ChallengeNameTypeSmsMfa
    ChallengeTOTPMFA          = types.ChallengeNameTypeSoftwareTokenMfa
    ChallengeNewPasswordReq   = types.ChallengeNameTypeNewPasswordRequired
    ChallengePasswordVerifier = types.ChallengeNameTypePasswordVerifier
    ChallengeCustom           = types.ChallengeNameTypeCustomChallenge
)
```

### MFA Challenge Handler

```go
func (s *AuthService) HandleMFAChallenge(ctx context.Context,
    session, mfaCode, username string, isSMS bool) (*AuthResult, error) {

    challengeName := types.ChallengeNameTypeSoftwareTokenMfa
    codeKey := "SOFTWARE_TOKEN_MFA_CODE"
    if isSMS {
        challengeName = types.ChallengeNameTypeSmsMfa
        codeKey = "SMS_MFA_CODE"
    }

    output, err := s.client.RespondToAuthChallenge(ctx,
        &cognitoidentityprovider.RespondToAuthChallengeInput{
            ChallengeName: challengeName,
            ClientId:      aws.String(s.clientId),
            Session:       aws.String(session),
            ChallengeResponses: map[string]string{
                "USERNAME": username,
                codeKey:    mfaCode,
            },
        })

    if err != nil {
        return nil, fmt.Errorf("MFA challenge failed: %w", err)
    }

    return &AuthResult{
        AccessToken:  aws.ToString(output.AuthenticationResult.AccessToken),
        RefreshToken: aws.ToString(output.AuthenticationResult.RefreshToken),
        IdToken:      aws.ToString(output.AuthenticationResult.IdToken),
    }, nil
}
```

### New Password Required Challenge

```go
func (s *AuthService) HandleNewPasswordChallenge(ctx context.Context,
    session, username, newPassword string) (*AuthResult, error) {

    output, err := s.client.RespondToAuthChallenge(ctx,
        &cognitoidentityprovider.RespondToAuthChallengeInput{
            ChallengeName: types.ChallengeNameTypeNewPasswordRequired,
            ClientId:      aws.String(s.clientId),
            Session:       aws.String(session),
            ChallengeResponses: map[string]string{
                "USERNAME":     username,
                "NEW_PASSWORD": newPassword,
            },
        })

    if err != nil {
        return nil, fmt.Errorf("new password challenge failed: %w", err)
    }

    return &AuthResult{
        AccessToken:  aws.ToString(output.AuthenticationResult.AccessToken),
        RefreshToken: aws.ToString(output.AuthenticationResult.RefreshToken),
        IdToken:      aws.ToString(output.AuthenticationResult.IdToken),
    }, nil
}
```

## Related References

- [User Operations](user-operations.md) - SignUp, SignIn details
- [JWT Validation](jwt-validation.md) - Token verification
- [Lambda Triggers](lambda-triggers.md) - Custom auth triggers
- [Error Handling](error-handling.md) - Auth error handling
