# Chariot Platform Integration

Platform-specific patterns for integrating AWS Cognito with Chariot.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [User-Account Mapping](#user-account-mapping)
- [Multi-Tenant RBAC](#multi-tenant-rbac)
- [Lambda Integration](#lambda-integration)
- [API Gateway Configuration](#api-gateway-configuration)

## Architecture Overview

### Chariot Auth Flow

```
User → Frontend → API Gateway → Lambda Authorizer → Lambda Handler → DynamoDB
                      ↓
                 Cognito JWT
                 Validation
                      ↓
               Extract: user_id, account_key, permissions
```

### Custom Attributes for Chariot

```yaml
# Required custom attributes in Cognito User Pool
custom:account_key     # Primary account identifier
custom:member_key      # User's member ID within account
custom:role            # User role (admin, analyst, viewer)
custom:permissions     # Comma-separated permission list
```

## User-Account Mapping

### Account Key Pattern

```go
// Extract account context from JWT claims
type ChariotClaims struct {
    Subject     string   `json:"sub"`
    Email       string   `json:"email"`
    AccountKey  string   `json:"custom:account_key"`
    MemberKey   string   `json:"custom:member_key"`
    Role        string   `json:"custom:role"`
    Permissions string   `json:"custom:permissions"`
    jwt.RegisteredClaims
}

func GetAccountContext(claims *ChariotClaims) *AccountContext {
    return &AccountContext{
        UserID:      claims.Subject,
        AccountKey:  claims.AccountKey,
        MemberKey:   claims.MemberKey,
        Role:        claims.Role,
        Permissions: strings.Split(claims.Permissions, ","),
    }
}
```

### User Creation with Account

```go
func CreateChariotUser(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId string, user *NewUserRequest) error {

    _, err := client.AdminCreateUser(ctx, &cognitoidentityprovider.AdminCreateUserInput{
        UserPoolId: aws.String(userPoolId),
        Username:   aws.String(user.Email),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("email"), Value: aws.String(user.Email)},
            {Name: aws.String("email_verified"), Value: aws.String("true")},
            {Name: aws.String("name"), Value: aws.String(user.Name)},
            {Name: aws.String("custom:account_key"), Value: aws.String(user.AccountKey)},
            {Name: aws.String("custom:member_key"), Value: aws.String(user.MemberKey)},
            {Name: aws.String("custom:role"), Value: aws.String(user.Role)},
            {Name: aws.String("custom:permissions"), Value: aws.String(strings.Join(user.Permissions, ","))},
        },
        MessageAction: types.MessageActionTypeSuppress,
    })

    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }

    // Set permanent password
    _, err = client.AdminSetUserPassword(ctx, &cognitoidentityprovider.AdminSetUserPasswordInput{
        UserPoolId: aws.String(userPoolId),
        Username:   aws.String(user.Email),
        Password:   aws.String(user.Password),
        Permanent:  true,
    })

    return err
}
```

## Multi-Tenant RBAC

### Role Definitions

```go
type Role string

const (
    RoleOwner   Role = "owner"
    RoleAdmin   Role = "admin"
    RoleAnalyst Role = "analyst"
    RoleViewer  Role = "viewer"
)

var RolePermissions = map[Role][]string{
    RoleOwner:   {"*"}, // All permissions
    RoleAdmin:   {"assets:*", "risks:*", "jobs:*", "users:read", "users:invite"},
    RoleAnalyst: {"assets:read", "assets:write", "risks:read", "risks:write", "jobs:read"},
    RoleViewer:  {"assets:read", "risks:read"},
}
```

### Permission Checking

```go
func HasPermission(claims *ChariotClaims, required string) bool {
    permissions := strings.Split(claims.Permissions, ",")
    for _, perm := range permissions {
        // Wildcard match
        if perm == "*" || perm == required {
            return true
        }
        // Category wildcard (e.g., "assets:*" matches "assets:read")
        if strings.HasSuffix(perm, ":*") {
            category := strings.TrimSuffix(perm, ":*")
            if strings.HasPrefix(required, category+":") {
                return true
            }
        }
    }
    return false
}

// Middleware
func RequirePermission(permission string) func(AuthHandler) AuthHandler {
    return func(next AuthHandler) AuthHandler {
        return func(ctx context.Context, claims *ChariotClaims, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
            if !HasPermission(claims, permission) {
                return events.APIGatewayProxyResponse{
                    StatusCode: 403,
                    Body:       `{"error": "Permission denied"}`,
                }, nil
            }
            return next(ctx, claims, req)
        }
    }
}
```

### Cognito Groups for RBAC

```go
// Use Cognito groups for role-based access
func AddUserToRoleGroup(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, username string, role Role) error {

    groupName := fmt.Sprintf("%s_%s", "role", string(role))
    _, err := client.AdminAddUserToGroup(ctx, &cognitoidentityprovider.AdminAddUserToGroupInput{
        UserPoolId: aws.String(userPoolId),
        Username:   aws.String(username),
        GroupName:  aws.String(groupName),
    })
    return err
}

// Pre-token trigger to add permissions based on groups
func AddPermissionsFromGroups(ctx context.Context, event events.CognitoEventUserPoolsPreTokenGen) (events.CognitoEventUserPoolsPreTokenGen, error) {
    groups := event.Request.GroupConfiguration.GroupsToOverride

    var allPermissions []string
    for _, group := range groups {
        if strings.HasPrefix(group, "role_") {
            role := Role(strings.TrimPrefix(group, "role_"))
            if perms, ok := RolePermissions[role]; ok {
                allPermissions = append(allPermissions, perms...)
            }
        }
    }

    // Deduplicate and add to token
    event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride = map[string]string{
        "permissions": strings.Join(uniqueStrings(allPermissions), ","),
    }

    return event, nil
}
```

## Lambda Integration

### Handler Pattern

```go
type ChariotHandler func(ctx context.Context, account *AccountContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

func ChariotMiddleware(validator *JWTValidator) func(ChariotHandler) func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    return func(handler ChariotHandler) func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
            // Extract token
            token, err := extractBearerToken(req.Headers)
            if err != nil {
                return errorResponse(401, "Missing authorization"), nil
            }

            // Validate JWT
            claims, err := validator.ValidateChariotToken(token)
            if err != nil {
                return errorResponse(401, "Invalid token"), nil
            }

            // Build account context
            account := &AccountContext{
                UserID:      claims.Subject,
                AccountKey:  claims.AccountKey,
                MemberKey:   claims.MemberKey,
                Role:        claims.Role,
                Permissions: strings.Split(claims.Permissions, ","),
            }

            // Add to context for downstream use
            ctx = context.WithValue(ctx, accountContextKey, account)

            return handler(ctx, account, req)
        }
    }
}
```

### Usage Example

```go
func main() {
    validator := NewJWTValidator(os.Getenv("AWS_REGION"), os.Getenv("USER_POOL_ID"))
    middleware := ChariotMiddleware(validator)

    lambda.Start(middleware(
        RequirePermission("assets:read")(handleListAssets),
    ))
}

func handleListAssets(ctx context.Context, account *AccountContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Query assets scoped to account
    assets, err := assetService.ListByAccount(ctx, account.AccountKey)
    if err != nil {
        return errorResponse(500, "Failed to list assets"), nil
    }

    return jsonResponse(200, assets), nil
}
```

## API Gateway Configuration

### SAM Template

```yaml
Globals:
  Function:
    Runtime: provided.al2
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        USER_POOL_ID: !Ref CognitoUserPool
        AWS_REGION: !Ref AWS::Region

Resources:
  CognitoUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: chariot-users
      Schema:
        - Name: account_key
          AttributeDataType: String
          Mutable: true
        - Name: member_key
          AttributeDataType: String
          Mutable: true
        - Name: role
          AttributeDataType: String
          Mutable: true
        - Name: permissions
          AttributeDataType: String
          Mutable: true

  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt CognitoUserPool.Arn
            AuthorizationScopes:
              - openid
              - email

  AssetsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: bootstrap
      Events:
        ListAssets:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /assets
            Method: GET
```

### Request Context Extraction

```go
// Extract Cognito claims from API Gateway context
func GetCognitoClaimsFromRequest(req events.APIGatewayProxyRequest) (*ChariotClaims, error) {
    authorizer, ok := req.RequestContext.Authorizer["claims"].(map[string]interface{})
    if !ok {
        return nil, errors.New("no claims in request context")
    }

    claims := &ChariotClaims{}
    claims.Subject, _ = authorizer["sub"].(string)
    claims.Email, _ = authorizer["email"].(string)
    claims.AccountKey, _ = authorizer["custom:account_key"].(string)
    claims.MemberKey, _ = authorizer["custom:member_key"].(string)
    claims.Role, _ = authorizer["custom:role"].(string)
    claims.Permissions, _ = authorizer["custom:permissions"].(string)

    return claims, nil
}
```

## Related References

- [JWT Validation](jwt-validation.md) - Token validation patterns
- [Custom Attributes](custom-attributes.md) - Attribute schema design
- [Admin Operations](admin-operations.md) - User management
- [Middleware](middleware.md) - Lambda middleware patterns
