# Admin Operations

Administrative user management operations for privileged operations using IAM credentials.

## Table of Contents

- [Admin Create User](#admin-create-user)
- [Admin Delete User](#admin-delete-user)
- [Admin Update User Attributes](#admin-update-user-attributes)
- [Admin Reset Password](#admin-reset-password)
- [Admin Group Management](#admin-group-management)
- [User Pool Management](#user-pool-management)

## Admin Create User

### Basic User Creation

```go
import (
    "context"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
    "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func (s *AdminService) CreateUser(ctx context.Context, email, name string) (*types.UserType, error) {
    output, err := s.client.AdminCreateUser(ctx, &cognitoidentityprovider.AdminCreateUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(email),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("email"), Value: aws.String(email)},
            {Name: aws.String("email_verified"), Value: aws.String("true")},
            {Name: aws.String("name"), Value: aws.String(name)},
        },
        // Options for initial password
        TemporaryPassword: aws.String(generateTempPassword()),
        MessageAction:     types.MessageActionTypeSuppress, // Don't send welcome email
    })

    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return output.User, nil
}
```

### With Custom Attributes

```go
func (s *AdminService) CreateUserWithTenant(ctx context.Context, email, name, tenantID, role string) (*types.UserType, error) {
    output, err := s.client.AdminCreateUser(ctx, &cognitoidentityprovider.AdminCreateUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(email),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("email"), Value: aws.String(email)},
            {Name: aws.String("email_verified"), Value: aws.String("true")},
            {Name: aws.String("name"), Value: aws.String(name)},
            {Name: aws.String("custom:tenant_id"), Value: aws.String(tenantID)},
            {Name: aws.String("custom:role"), Value: aws.String(role)},
        },
        DesiredDeliveryMediums: []types.DeliveryMediumType{
            types.DeliveryMediumTypeEmail,
        },
    })

    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return output.User, nil
}
```

### User States After Creation

| MessageAction | User State            | Next Step Required            |
| ------------- | --------------------- | ----------------------------- |
| (default)     | FORCE_CHANGE_PASSWORD | User must change password     |
| SUPPRESS      | FORCE_CHANGE_PASSWORD | Admin sets permanent password |
| RESEND        | FORCE_CHANGE_PASSWORD | Resend invitation             |

## Admin Delete User

### Delete User

```go
func (s *AdminService) DeleteUser(ctx context.Context, username string) error {
    _, err := s.client.AdminDeleteUser(ctx, &cognitoidentityprovider.AdminDeleteUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })

    if err != nil {
        var userNotFoundErr *types.UserNotFoundException
        if errors.As(err, &userNotFoundErr) {
            return nil // Already deleted, consider success
        }
        return fmt.Errorf("failed to delete user: %w", err)
    }

    return nil
}
```

### Soft Delete Pattern (Disable Instead)

```go
func (s *AdminService) SoftDeleteUser(ctx context.Context, username string) error {
    // Disable user instead of deleting
    _, err := s.client.AdminDisableUser(ctx, &cognitoidentityprovider.AdminDisableUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })

    if err != nil {
        return fmt.Errorf("failed to disable user: %w", err)
    }

    // Optionally update attributes to mark as deleted
    _, err = s.client.AdminUpdateUserAttributes(ctx, &cognitoidentityprovider.AdminUpdateUserAttributesInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("custom:deleted_at"), Value: aws.String(time.Now().Format(time.RFC3339))},
        },
    })

    return err
}
```

## Admin Update User Attributes

### Update Single Attribute

```go
func (s *AdminService) UpdateUserEmail(ctx context.Context, username, newEmail string) error {
    _, err := s.client.AdminUpdateUserAttributes(ctx, &cognitoidentityprovider.AdminUpdateUserAttributesInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("email"), Value: aws.String(newEmail)},
            {Name: aws.String("email_verified"), Value: aws.String("false")},
        },
    })

    return err
}
```

### Update Multiple Attributes

```go
type UserUpdateParams struct {
    Name      *string
    Email     *string
    Phone     *string
    TenantID  *string
    Role      *string
}

func (s *AdminService) UpdateUserAttributes(ctx context.Context, username string, params *UserUpdateParams) error {
    var attributes []types.AttributeType

    if params.Name != nil {
        attributes = append(attributes, types.AttributeType{
            Name: aws.String("name"), Value: params.Name,
        })
    }
    if params.Email != nil {
        attributes = append(attributes,
            types.AttributeType{Name: aws.String("email"), Value: params.Email},
            types.AttributeType{Name: aws.String("email_verified"), Value: aws.String("false")},
        )
    }
    if params.Phone != nil {
        attributes = append(attributes, types.AttributeType{
            Name: aws.String("phone_number"), Value: params.Phone,
        })
    }
    if params.TenantID != nil {
        attributes = append(attributes, types.AttributeType{
            Name: aws.String("custom:tenant_id"), Value: params.TenantID,
        })
    }
    if params.Role != nil {
        attributes = append(attributes, types.AttributeType{
            Name: aws.String("custom:role"), Value: params.Role,
        })
    }

    if len(attributes) == 0 {
        return nil
    }

    _, err := s.client.AdminUpdateUserAttributes(ctx, &cognitoidentityprovider.AdminUpdateUserAttributesInput{
        UserPoolId:     aws.String(s.userPoolId),
        Username:       aws.String(username),
        UserAttributes: attributes,
    })

    return err
}
```

## Admin Reset Password

### Set Permanent Password

```go
func (s *AdminService) SetUserPassword(ctx context.Context, username, password string, permanent bool) error {
    _, err := s.client.AdminSetUserPassword(ctx, &cognitoidentityprovider.AdminSetUserPasswordInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
        Password:   aws.String(password),
        Permanent:  permanent,
    })

    return err
}
```

### Force Password Reset

```go
func (s *AdminService) ForcePasswordReset(ctx context.Context, username string) error {
    _, err := s.client.AdminResetUserPassword(ctx, &cognitoidentityprovider.AdminResetUserPasswordInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })

    return err
}
```

### Complete User Setup (Create + Set Password)

```go
func (s *AdminService) CreateUserWithPassword(ctx context.Context, email, name, password string) error {
    // Step 1: Create user with suppressed email
    _, err := s.client.AdminCreateUser(ctx, &cognitoidentityprovider.AdminCreateUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(email),
        UserAttributes: []types.AttributeType{
            {Name: aws.String("email"), Value: aws.String(email)},
            {Name: aws.String("email_verified"), Value: aws.String("true")},
            {Name: aws.String("name"), Value: aws.String(name)},
        },
        MessageAction: types.MessageActionTypeSuppress,
    })

    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }

    // Step 2: Set permanent password (skips FORCE_CHANGE_PASSWORD state)
    _, err = s.client.AdminSetUserPassword(ctx, &cognitoidentityprovider.AdminSetUserPasswordInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(email),
        Password:   aws.String(password),
        Permanent:  true,
    })

    if err != nil {
        return fmt.Errorf("failed to set password: %w", err)
    }

    return nil
}
```

## Admin Group Management

### Add User to Group

```go
func (s *AdminService) AddUserToGroup(ctx context.Context, username, groupName string) error {
    _, err := s.client.AdminAddUserToGroup(ctx, &cognitoidentityprovider.AdminAddUserToGroupInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
        GroupName:  aws.String(groupName),
    })

    return err
}
```

### Remove User from Group

```go
func (s *AdminService) RemoveUserFromGroup(ctx context.Context, username, groupName string) error {
    _, err := s.client.AdminRemoveUserFromGroup(ctx, &cognitoidentityprovider.AdminRemoveUserFromGroupInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
        GroupName:  aws.String(groupName),
    })

    return err
}
```

### List User Groups

```go
func (s *AdminService) ListUserGroups(ctx context.Context, username string) ([]string, error) {
    output, err := s.client.AdminListGroupsForUser(ctx, &cognitoidentityprovider.AdminListGroupsForUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })

    if err != nil {
        return nil, err
    }

    groups := make([]string, len(output.Groups))
    for i, g := range output.Groups {
        groups[i] = aws.ToString(g.GroupName)
    }

    return groups, nil
}
```

### Create Group

```go
func (s *AdminService) CreateGroup(ctx context.Context, groupName, description string, precedence int32) error {
    _, err := s.client.CreateGroup(ctx, &cognitoidentityprovider.CreateGroupInput{
        UserPoolId:  aws.String(s.userPoolId),
        GroupName:   aws.String(groupName),
        Description: aws.String(description),
        Precedence:  aws.Int32(precedence), // Lower = higher priority
    })

    return err
}
```

## User Pool Management

### Get User

```go
func (s *AdminService) GetUser(ctx context.Context, username string) (*types.UserType, error) {
    output, err := s.client.AdminGetUser(ctx, &cognitoidentityprovider.AdminGetUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })

    if err != nil {
        return nil, err
    }

    return &types.UserType{
        Username:       output.Username,
        Enabled:        output.Enabled,
        UserStatus:     output.UserStatus,
        UserAttributes: output.UserAttributes,
        UserCreateDate: output.UserCreateDate,
    }, nil
}
```

### List Users

```go
func (s *AdminService) ListUsers(ctx context.Context, limit int32, paginationToken *string) ([]types.UserType, *string, error) {
    output, err := s.client.ListUsers(ctx, &cognitoidentityprovider.ListUsersInput{
        UserPoolId:      aws.String(s.userPoolId),
        Limit:           aws.Int32(limit),
        PaginationToken: paginationToken,
    })

    if err != nil {
        return nil, nil, err
    }

    return output.Users, output.PaginationToken, nil
}
```

### List Users with Filter

```go
func (s *AdminService) ListUsersByEmail(ctx context.Context, emailPrefix string) ([]types.UserType, error) {
    output, err := s.client.ListUsers(ctx, &cognitoidentityprovider.ListUsersInput{
        UserPoolId: aws.String(s.userPoolId),
        Filter:     aws.String(fmt.Sprintf(`email ^= "%s"`, emailPrefix)),
        Limit:      aws.Int32(60),
    })

    if err != nil {
        return nil, err
    }

    return output.Users, nil
}

// Filter examples:
// email = "user@example.com"     - Exact match
// email ^= "user"                - Starts with
// status = "Enabled"             - User status
// cognito:user_status = "CONFIRMED" - Confirmation status
```

### Enable/Disable User

```go
func (s *AdminService) SetUserEnabled(ctx context.Context, username string, enabled bool) error {
    if enabled {
        _, err := s.client.AdminEnableUser(ctx, &cognitoidentityprovider.AdminEnableUserInput{
            UserPoolId: aws.String(s.userPoolId),
            Username:   aws.String(username),
        })
        return err
    }

    _, err := s.client.AdminDisableUser(ctx, &cognitoidentityprovider.AdminDisableUserInput{
        UserPoolId: aws.String(s.userPoolId),
        Username:   aws.String(username),
    })
    return err
}
```

## Related References

- [User Operations](user-operations.md) - Self-service user operations
- [Custom Attributes](custom-attributes.md) - Custom attribute management
- [Error Handling](error-handling.md) - Admin operation errors
