# Custom Attributes

Schema design, creation, and limitations for Cognito custom attributes.

## Table of Contents

- [Schema Design](#schema-design)
- [Creating Custom Attributes](#creating-custom-attributes)
- [Reading Custom Attributes](#reading-custom-attributes)
- [Updating Custom Attributes](#updating-custom-attributes)
- [Limitations](#limitations)

## Schema Design

### Planning Custom Attributes

**Critical:** Custom attributes **cannot be deleted or modified** after creation. Plan carefully.

| Attribute Type | Cognito Type | JWT Representation | Notes                     |
| -------------- | ------------ | ------------------ | ------------------------- |
| String         | String       | String             | Max 2048 characters       |
| Number         | Number       | String             | Stored as string in JWT   |
| Boolean        | String       | "true"/"false"     | Use string "true"/"false" |
| DateTime       | String       | ISO 8601           | Store as RFC3339 string   |

### Common Patterns

```go
// Multi-tenant pattern
"custom:tenant_id"       // Required for tenant isolation
"custom:tenant_role"     // Role within tenant

// Feature flags
"custom:beta_features"   // "feature1,feature2"
"custom:plan_tier"       // "free", "pro", "enterprise"

// User metadata
"custom:timezone"        // "America/New_York"
"custom:locale"          // "en-US"
"custom:referral_code"   // User acquisition tracking

// Business logic
"custom:account_type"    // "individual", "business"
"custom:onboarding_step" // "1", "2", "completed"
```

### Token Size Optimization

Custom attributes are included in JWT tokens. Plan for size:

| Data Type           | Recommendation                    |
| ------------------- | --------------------------------- |
| Small identifiers   | Store directly (tenant_id)        |
| Large arrays        | Store reference, fetch separately |
| Frequently changing | Don't put in token (use DB)       |
| Auth-required       | Store in token                    |

## Creating Custom Attributes

### Via AWS Console

1. Navigate to Cognito User Pool → User attributes
2. Click "Add custom attribute"
3. Configure:
   - Name (without `custom:` prefix)
   - Type (String or Number)
   - Mutable (can be changed by user)
   - Min/Max length (String) or Min/Max value (Number)

### Via AWS CLI

```bash
aws cognito-idp add-custom-user-pool-attribute \
    --user-pool-id us-east-1_XXXXX \
    --custom-attribute Name=tenant_id,AttributeDataType=String,Mutable=true,StringAttributeConstraints="{MinLength=1,MaxLength=50}"
```

### Via CloudFormation/SAM

```yaml
UserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: MyUserPool
    Schema:
      - Name: tenant_id
        AttributeDataType: String
        Mutable: true
        Required: false
        StringAttributeConstraints:
          MinLength: "1"
          MaxLength: "50"
      - Name: role
        AttributeDataType: String
        Mutable: true
        Required: false
        StringAttributeConstraints:
          MinLength: "1"
          MaxLength: "20"
```

### Via SDK (User Pool Creation Only)

```go
// Custom attributes must be defined at user pool creation
// or added via AddCustomAttributes API after
_, err := client.CreateUserPool(ctx, &cognitoidentityprovider.CreateUserPoolInput{
    PoolName: aws.String("MyUserPool"),
    Schema: []types.SchemaAttributeType{
        {
            Name:                     aws.String("tenant_id"),
            AttributeDataType:        types.AttributeDataTypeString,
            Mutable:                  aws.Bool(true),
            Required:                 aws.Bool(false),
            StringAttributeConstraints: &types.StringAttributeConstraintsType{
                MinLength: aws.String("1"),
                MaxLength: aws.String("50"),
            },
        },
    },
})
```

## Reading Custom Attributes

### From JWT Token

```go
type CustomClaims struct {
    TenantID string `json:"custom:tenant_id"`
    Role     string `json:"custom:role"`
    jwt.RegisteredClaims
}

func ExtractCustomAttributes(tokenString string, validator *JWTValidator) (*CustomClaims, error) {
    token, err := validator.Validate(tokenString)
    if err != nil {
        return nil, err
    }

    claims, ok := token.Claims.(*CustomClaims)
    if !ok {
        return nil, errors.New("invalid claims type")
    }

    return claims, nil
}
```

### From API Response

```go
func GetUserCustomAttributes(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, username string) (map[string]string, error) {

    output, err := client.AdminGetUser(ctx, &cognitoidentityprovider.AdminGetUserInput{
        UserPoolId: aws.String(userPoolId),
        Username:   aws.String(username),
    })
    if err != nil {
        return nil, err
    }

    attrs := make(map[string]string)
    for _, attr := range output.UserAttributes {
        name := aws.ToString(attr.Name)
        if strings.HasPrefix(name, "custom:") {
            attrs[name] = aws.ToString(attr.Value)
        }
    }

    return attrs, nil
}
```

### Extract Specific Attribute

```go
func GetCustomAttribute(attributes []types.AttributeType, name string) string {
    fullName := "custom:" + name
    for _, attr := range attributes {
        if aws.ToString(attr.Name) == fullName {
            return aws.ToString(attr.Value)
        }
    }
    return ""
}

// Usage
tenantID := GetCustomAttribute(user.UserAttributes, "tenant_id")
```

## Updating Custom Attributes

### Admin Update

```go
func UpdateCustomAttribute(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, username, attrName, attrValue string) error {

    _, err := client.AdminUpdateUserAttributes(ctx, &cognitoidentityprovider.AdminUpdateUserAttributesInput{
        UserPoolId: aws.String(userPoolId),
        Username:   aws.String(username),
        UserAttributes: []types.AttributeType{
            {
                Name:  aws.String("custom:" + attrName),
                Value: aws.String(attrValue),
            },
        },
    })

    return err
}
```

### User Self-Update (If Mutable)

```go
func UserUpdateCustomAttribute(ctx context.Context, client *cognitoidentityprovider.Client,
    accessToken, attrName, attrValue string) error {

    _, err := client.UpdateUserAttributes(ctx, &cognitoidentityprovider.UpdateUserAttributesInput{
        AccessToken: aws.String(accessToken),
        UserAttributes: []types.AttributeType{
            {
                Name:  aws.String("custom:" + attrName),
                Value: aws.String(attrValue),
            },
        },
    })

    return err
}
```

### Batch Update Multiple Attributes

```go
type CustomAttributeUpdate struct {
    Name  string
    Value string
}

func BatchUpdateCustomAttributes(ctx context.Context, client *cognitoidentityprovider.Client,
    userPoolId, username string, updates []CustomAttributeUpdate) error {

    attrs := make([]types.AttributeType, len(updates))
    for i, u := range updates {
        attrs[i] = types.AttributeType{
            Name:  aws.String("custom:" + u.Name),
            Value: aws.String(u.Value),
        }
    }

    _, err := client.AdminUpdateUserAttributes(ctx, &cognitoidentityprovider.AdminUpdateUserAttributesInput{
        UserPoolId:     aws.String(userPoolId),
        Username:       aws.String(username),
        UserAttributes: attrs,
    })

    return err
}
```

## Limitations

### Hard Limits

| Limit                      | Value            | Notes                      |
| -------------------------- | ---------------- | -------------------------- |
| Max custom attributes      | 50 per user pool | Plan carefully             |
| Max attribute value length | 2048 characters  | String type                |
| Attribute name format      | `custom:name`    | Prefix added automatically |
| Attribute name max length  | 20 characters    | Excluding `custom:` prefix |

### Immutable Properties

**Cannot change after creation:**

- Attribute name
- Attribute data type (String/Number)
- Mutable → Immutable (can only go one direction)
- Delete attribute entirely

### Mutable vs Immutable

| Property  | Mutable = true                 | Mutable = false         |
| --------- | ------------------------------ | ----------------------- |
| Admin API | Can update                     | Can update              |
| User API  | Can update (with access token) | Cannot update           |
| Use case  | User preferences               | Tenant ID, account type |

### Token Inclusion

```go
// App client configuration controls which attributes appear in tokens
// Via AWS Console: App client → Token configuration → Custom attributes
// Via CloudFormation:
AppClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ReadAttributes:
      - custom:tenant_id
      - custom:role
    WriteAttributes:
      - custom:timezone  # User can modify
```

### Common Gotchas

1. **Boolean values:** Must be strings "true" or "false", not actual boolean
2. **Number values:** Stored as strings in JWT tokens
3. **Empty values:** Cannot set empty string, use null/omit instead
4. **Case sensitivity:** Attribute names are case-sensitive
5. **Pre-token trigger:** Required to add custom attributes to tokens from external sources

### Best Practices

1. **Plan ahead:** Create all attributes before production use
2. **Use conventions:** `custom:app_feature` or `custom:tenant_feature`
3. **Document purpose:** Track what each attribute is for
4. **Minimize token size:** Only include auth-required data
5. **Use mutable sparingly:** Default to immutable for security

## Related References

- [Admin Operations](admin-operations.md) - Admin attribute management
- [User Operations](user-operations.md) - User self-service updates
- [Lambda Triggers](lambda-triggers.md) - Pre-token generation
