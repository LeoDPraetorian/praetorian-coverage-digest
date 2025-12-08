// Real Cognito patterns from Chariot platform
// Source: modules/chariot/backend/pkg/cloud/service/services/cognito/cognito.go
// Source: modules/chariot/backend/pkg/handler/handlers/token/token.go

package examples

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

// Pattern 1: Client Initialization with Options
// Chariot uses functional options pattern for flexibility
type Cognito struct {
	Client *cognitoidentityprovider.Client
	pool   string
	client string
}

type Option func(*Cognito)

func NewCognito(cfg aws.Config, opts ...Option) *Cognito {
	c := Cognito{
		Client: cognitoidentityprovider.NewFromConfig(cfg),
		pool:   "your-pool-id",
		client: "your-client-id",
	}
	for _, opt := range opts {
		opt(&c)
	}
	return &c
}

func WithPool(pool string) Option {
	return func(c *Cognito) {
		c.pool = pool
	}
}

func WithClient(client string) Option {
	return func(c *Cognito) {
		c.client = client
	}
}

// Pattern 2: Admin User Creation with Attributes
// Used for programmatic user creation (not self-signup)
func (c *Cognito) CreateUser(username, email, password string) error {
	// Step 1: Create user with attributes
	input := &cognitoidentityprovider.AdminCreateUserInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("email"),
				Value: aws.String(email),
			},
			{
				Name:  aws.String("email_verified"),
				Value: aws.String("true"),
			},
		},
		MessageAction: types.MessageActionTypeSuppress, // Don't send welcome email
	}

	_, err := c.Client.AdminCreateUser(context.TODO(), input)
	if err != nil {
		return err
	}

	// Step 2: Set permanent password (skip temporary password flow)
	passwordInput := &cognitoidentityprovider.AdminSetUserPasswordInput{
		Password:   aws.String(password),
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
		Permanent:  true,
	}

	_, err = c.Client.AdminSetUserPassword(context.TODO(), passwordInput)
	return err
}

// Pattern 3: Authentication with AdminInitiateAuth
// Returns IdToken for API access
func (c *Cognito) Authenticate(username, password string) (*string, error) {
	input := &cognitoidentityprovider.AdminInitiateAuthInput{
		AuthFlow:   types.AuthFlowTypeAdminUserPasswordAuth,
		ClientId:   aws.String(c.client),
		UserPoolId: aws.String(c.pool),
		AuthParameters: map[string]string{
			"USERNAME": username,
			"PASSWORD": password,
		},
	}

	resp, err := c.Client.AdminInitiateAuth(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	// Return IdToken (contains user identity claims)
	if resp != nil && resp.AuthenticationResult != nil {
		return resp.AuthenticationResult.IdToken, nil
	}

	return nil, nil
}

// Pattern 4: User Deactivation with Signout
// Disables user AND revokes all tokens
func (c *Cognito) Deactivate(username string) error {
	// Step 1: Disable user
	disableInput := &cognitoidentityprovider.AdminDisableUserInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
	}

	_, err := c.Client.AdminDisableUser(context.TODO(), disableInput)
	if err != nil {
		return err
	}

	// Step 2: Sign out from all devices
	signoutInput := &cognitoidentityprovider.AdminUserGlobalSignOutInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
	}

	_, err = c.Client.AdminUserGlobalSignOut(context.TODO(), signoutInput)
	return err
}

// Pattern 5: List Users with Pagination
// Efficient pattern for large user pools
func (c *Cognito) Users(enabledOnly bool) []User {
	var users []User

	input := &cognitoidentityprovider.ListUsersInput{
		UserPoolId:      aws.String(c.pool),
		AttributesToGet: []string{"email"}, // Only fetch needed attributes
	}

	// Use paginator for automatic pagination
	paginator := cognitoidentityprovider.NewListUsersPaginator(c.Client, input)
	for paginator.HasMorePages() {
		output, err := paginator.NextPage(context.TODO())
		if err != nil {
			return users
		}

		for _, user := range output.Users {
			// Filter by enabled status if requested
			if enabledOnly && !user.Enabled {
				continue
			}

			// Extract attributes into map
			claims := make(map[string]any)
			for _, attr := range user.Attributes {
				claims[*attr.Name] = *attr.Value
			}

			if username, ok := claims["email"].(string); ok {
				users = append(users, User{Username: username})
			}
		}
	}

	return users
}

// Pattern 6: MFA Operations
// Disable MFA for recovery scenarios
func (c *Cognito) DisableMFA(username string) error {
	input := &cognitoidentityprovider.AdminSetUserMFAPreferenceInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
		SoftwareTokenMfaSettings: &types.SoftwareTokenMfaSettingsType{
			Enabled:      false,
			PreferredMfa: false,
		},
	}

	_, err := c.Client.AdminSetUserMFAPreference(context.TODO(), input)
	return err
}

// Pattern 7: Custom Attributes
// Set custom attributes for platform-specific data
func (c *Cognito) SetCustomAttribute(username, key, value string) error {
	input := &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(username),
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("custom:" + key), // Custom attributes must have "custom:" prefix
				Value: aws.String(value),
			},
		},
	}

	_, err := c.Client.AdminUpdateUserAttributes(context.TODO(), input)
	return err
}

// Pattern 8: User Existence Check with Error Handling
// Proper error handling for UserNotFoundException
func (c *Cognito) UserExists(email string) (bool, error) {
	input := &cognitoidentityprovider.AdminGetUserInput{
		UserPoolId: aws.String(c.pool),
		Username:   aws.String(email),
	}

	_, err := c.Client.AdminGetUser(context.TODO(), input)
	if err != nil {
		// Check if user not found (not an error, just doesn't exist)
		var userNotFound *types.UserNotFoundException
		if errors.As(err, &userNotFound) {
			return false, nil
		}
		return false, err // Other error
	}

	return true, nil
}

// Pattern 9: OIDC Identity Provider Integration
// Used for SSO with external providers
func (c *Cognito) TrustOIDCProvider(domain, clientID, clientSecret, issuer string) error {
	input := &cognitoidentityprovider.CreateIdentityProviderInput{
		ProviderDetails: map[string]string{
			"attributes_request_method": "POST",
			"authorize_scopes":          "openid profile email",
			"client_id":                 clientID,
			"client_secret":             clientSecret,
			"oidc_issuer":               issuer,
		},
		AttributeMapping: map[string]string{
			"email": "email",
			"name":  "name",
		},
		ProviderName: aws.String(domain),
		ProviderType: "OIDC",
		UserPoolId:   aws.String(c.pool),
		IdpIdentifiers: []string{
			domain,
		},
	}

	_, err := c.Client.CreateIdentityProvider(context.TODO(), input)
	return err
}

// Helper types
type User struct {
	Username string
}
