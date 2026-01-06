# Panorama Authentication

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

PAN-OS supports multiple authentication methods for API access. API key authentication is recommended for production integrations due to its security and ease of rotation. Session-based authentication is available but requires additional state management.

## Quick Reference

| Method            | Use Case                            | Recommended |
| ----------------- | ----------------------------------- | ----------- |
| API Key           | Production integrations, automation | ✅ Yes      |
| Username/Password | Initial key generation, testing     | ⚠️ Limited  |
| Certificate-based | High-security environments          | ✅ Yes      |
| SAML/OAuth        | Enterprise SSO integration          | ✅ Yes      |

## API Key Authentication

### Generating an API Key

**Method 1: Via XML API (Recommended)**

```bash
curl -k -X POST \
  'https://<panorama>/api/?type=keygen&user=<username>&password=<password>'
```

**Response:**

```xml
<response status="success">
  <result>
    <key>LUFRPT1234567890ABCDEFGHIJKLMNOP==</key>
  </result>
</response>
```

**Method 2: Via Web UI**

1. Navigate to Panorama Web UI
2. Go to **Device** → **Administrators** → select admin account
3. Click **API Key** tab
4. Click **Generate** (one-time display)
5. Copy and store securely

### Using API Keys

**REST API (Header):**

```bash
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared' \
  -H 'X-PAN-KEY: LUFRPT1234567890ABCDEFGHIJKLMNOP=='
```

**XML API (Query Parameter):**

```bash
curl -k -g \
  'https://<panorama>/api/?key=LUFRPT1234567890ABCDEFGHIJKLMNOP==&type=config&action=get&xpath=/config/shared/address'
```

**REST API (Query Parameter - Deprecated):**

```bash
# Still works but not recommended
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&key=LUFRPT...'
```

## Go Client Implementation

### Client Structure

```go
package panorama

import (
    "context"
    "crypto/tls"
    "fmt"
    "net/http"
    "net/url"
    "time"
)

// AuthMethod defines supported authentication methods
type AuthMethod int

const (
    AuthAPIKey AuthMethod = iota
    AuthBasic
    AuthCertificate
)

// Credentials holds authentication credentials
type Credentials struct {
    Method      AuthMethod
    APIKey      string
    Username    string
    Password    string
    Certificate *tls.Certificate
}

// ClientConfig configures the Panorama client
type ClientConfig struct {
    BaseURL     string
    Credentials Credentials
    Timeout     time.Duration
    TLSConfig   *tls.Config
}

// Client represents a Panorama API client
type Client struct {
    baseURL     string
    credentials Credentials
    httpClient  *http.Client
}

// NewClient creates a new Panorama client
func NewClient(config ClientConfig) (*Client, error) {
    if config.BaseURL == "" {
        return nil, fmt.Errorf("base URL is required")
    }

    tlsConfig := config.TLSConfig
    if tlsConfig == nil {
        tlsConfig = &tls.Config{
            MinVersion: tls.VersionTLS12,
        }
    }

    // Add client certificate if using certificate auth
    if config.Credentials.Method == AuthCertificate && config.Credentials.Certificate != nil {
        tlsConfig.Certificates = []tls.Certificate{*config.Credentials.Certificate}
    }

    timeout := config.Timeout
    if timeout == 0 {
        timeout = 30 * time.Second
    }

    return &Client{
        baseURL:     config.BaseURL,
        credentials: config.Credentials,
        httpClient: &http.Client{
            Timeout: timeout,
            Transport: &http.Transport{
                TLSClientConfig: tlsConfig,
            },
        },
    }, nil
}
```

### Authentication Methods

```go
// applyAuth adds authentication to an HTTP request
func (c *Client) applyAuth(req *http.Request) error {
    switch c.credentials.Method {
    case AuthAPIKey:
        req.Header.Set("X-PAN-KEY", c.credentials.APIKey)

    case AuthBasic:
        req.SetBasicAuth(c.credentials.Username, c.credentials.Password)

    case AuthCertificate:
        // Certificate is applied via TLS config, nothing to do here

    default:
        return fmt.Errorf("unsupported auth method: %d", c.credentials.Method)
    }
    return nil
}

// GenerateAPIKey generates a new API key using username/password
func (c *Client) GenerateAPIKey(ctx context.Context, username, password string) (string, error) {
    params := url.Values{
        "type":     {"keygen"},
        "user":     {username},
        "password": {password},
    }

    req, err := http.NewRequestWithContext(ctx, "POST",
        c.baseURL+"/api/?"+params.Encode(), nil)
    if err != nil {
        return "", err
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("keygen request failed: %w", err)
    }
    defer resp.Body.Close()

    // Parse XML response to extract key
    var keygenResp struct {
        Status string `xml:"status,attr"`
        Result struct {
            Key string `xml:"key"`
        } `xml:"result"`
    }

    if err := xml.NewDecoder(resp.Body).Decode(&keygenResp); err != nil {
        return "", fmt.Errorf("failed to parse keygen response: %w", err)
    }

    if keygenResp.Status != "success" {
        return "", fmt.Errorf("keygen failed")
    }

    return keygenResp.Result.Key, nil
}
```

### Credential Management

```go
package panorama

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// CredentialStore interface for credential retrieval
type CredentialStore interface {
    GetCredentials(ctx context.Context, secretName string) (*Credentials, error)
}

// AWSSecretsStore retrieves credentials from AWS Secrets Manager
type AWSSecretsStore struct {
    client *secretsmanager.Client
}

// NewAWSSecretsStore creates a credential store using AWS Secrets Manager
func NewAWSSecretsStore(ctx context.Context) (*AWSSecretsStore, error) {
    cfg, err := config.LoadDefaultConfig(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    return &AWSSecretsStore{
        client: secretsmanager.NewFromConfig(cfg),
    }, nil
}

// GetCredentials retrieves Panorama credentials from Secrets Manager
func (s *AWSSecretsStore) GetCredentials(ctx context.Context, secretName string) (*Credentials, error) {
    result, err := s.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to get secret: %w", err)
    }

    var secret struct {
        APIKey   string `json:"api_key"`
        Username string `json:"username"`
        Password string `json:"password"`
    }

    if err := json.Unmarshal([]byte(*result.SecretString), &secret); err != nil {
        return nil, fmt.Errorf("failed to parse secret: %w", err)
    }

    creds := &Credentials{}
    if secret.APIKey != "" {
        creds.Method = AuthAPIKey
        creds.APIKey = secret.APIKey
    } else if secret.Username != "" && secret.Password != "" {
        creds.Method = AuthBasic
        creds.Username = secret.Username
        creds.Password = secret.Password
    } else {
        return nil, fmt.Errorf("secret must contain either api_key or username/password")
    }

    return creds, nil
}

// EnvironmentStore retrieves credentials from environment variables
type EnvironmentStore struct{}

func (s *EnvironmentStore) GetCredentials(ctx context.Context, _ string) (*Credentials, error) {
    apiKey := os.Getenv("PANORAMA_API_KEY")
    if apiKey != "" {
        return &Credentials{
            Method: AuthAPIKey,
            APIKey: apiKey,
        }, nil
    }

    username := os.Getenv("PANORAMA_USERNAME")
    password := os.Getenv("PANORAMA_PASSWORD")
    if username != "" && password != "" {
        return &Credentials{
            Method:   AuthBasic,
            Username: username,
            Password: password,
        }, nil
    }

    return nil, fmt.Errorf("no credentials found in environment")
}
```

## API Key Rotation

### Rotation Procedure

```bash
#!/bin/bash
# rotate-panorama-key.sh

set -euo pipefail

PANORAMA_HOST="${PANORAMA_HOST:?PANORAMA_HOST required}"
SECRET_NAME="${SECRET_NAME:-prod/panorama/api-key}"
ADMIN_USER="${ADMIN_USER:-api-automation}"

echo "=== Panorama API Key Rotation ==="

# Step 1: Get current credentials to generate new key
echo "1. Retrieving current credentials..."
CURRENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --query SecretString \
  --output text)

USERNAME=$(echo "$CURRENT_SECRET" | jq -r '.username')
PASSWORD=$(echo "$CURRENT_SECRET" | jq -r '.password')

# Step 2: Generate new API key
echo "2. Generating new API key..."
NEW_KEY=$(curl -sk -X POST \
  "https://${PANORAMA_HOST}/api/?type=keygen&user=${USERNAME}&password=${PASSWORD}" \
  | xmllint --xpath "string(//key)" -)

if [ -z "$NEW_KEY" ]; then
  echo "ERROR: Failed to generate new API key"
  exit 1
fi

echo "   New key generated successfully"

# Step 3: Verify new key works
echo "3. Verifying new key..."
VERIFY=$(curl -sk -X GET \
  "https://${PANORAMA_HOST}/restapi/v11.0/System/Info" \
  -H "X-PAN-KEY: ${NEW_KEY}" \
  -w "%{http_code}" \
  -o /dev/null)

if [ "$VERIFY" != "200" ]; then
  echo "ERROR: New key verification failed (HTTP $VERIFY)"
  exit 1
fi

echo "   New key verified"

# Step 4: Update secret in Secrets Manager
echo "4. Updating secret in AWS Secrets Manager..."
NEW_SECRET=$(echo "$CURRENT_SECRET" | jq --arg key "$NEW_KEY" '.api_key = $key')

aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME" \
  --secret-string "$NEW_SECRET"

echo "   Secret updated"

# Step 5: Trigger service restart (optional)
echo "5. Triggering service refresh..."
# kubectl rollout restart deployment/panorama-sync -n prod
# or: aws lambda update-function-configuration --function-name panorama-sync --environment ...

echo "=== Rotation Complete ==="
echo "New API key has been deployed. Old key may still work until cache expires."
```

### Automated Rotation with AWS Lambda

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type RotationEvent struct {
    SecretId string `json:"SecretId"`
    Step     string `json:"Step"`
    Token    string `json:"ClientRequestToken"`
}

func handler(ctx context.Context, event RotationEvent) error {
    cfg, _ := config.LoadDefaultConfig(ctx)
    sm := secretsmanager.NewFromConfig(cfg)

    switch event.Step {
    case "createSecret":
        return createSecret(ctx, sm, event)
    case "setSecret":
        return setSecret(ctx, sm, event)
    case "testSecret":
        return testSecret(ctx, sm, event)
    case "finishSecret":
        return finishSecret(ctx, sm, event)
    default:
        return fmt.Errorf("unknown step: %s", event.Step)
    }
}

func createSecret(ctx context.Context, sm *secretsmanager.Client, event RotationEvent) error {
    // Get current secret
    current, _ := sm.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId:     &event.SecretId,
        VersionStage: aws.String("AWSCURRENT"),
    })

    var creds struct {
        APIKey   string `json:"api_key"`
        Host     string `json:"host"`
        Username string `json:"username"`
        Password string `json:"password"`
    }
    json.Unmarshal([]byte(*current.SecretString), &creds)

    // Generate new API key
    client, _ := panorama.NewClient(panorama.ClientConfig{
        BaseURL: creds.Host,
        Credentials: panorama.Credentials{
            Method:   panorama.AuthBasic,
            Username: creds.Username,
            Password: creds.Password,
        },
    })

    newKey, _ := client.GenerateAPIKey(ctx, creds.Username, creds.Password)
    creds.APIKey = newKey

    // Store as pending
    newSecret, _ := json.Marshal(creds)
    sm.PutSecretValue(ctx, &secretsmanager.PutSecretValueInput{
        SecretId:           &event.SecretId,
        ClientRequestToken: &event.Token,
        SecretString:       aws.String(string(newSecret)),
        VersionStages:      []string{"AWSPENDING"},
    })

    return nil
}

func main() {
    lambda.Start(handler)
}
```

## Security Best Practices

### 1. Credential Storage

| Environment | Storage Method        | Example                                        |
| ----------- | --------------------- | ---------------------------------------------- |
| Development | Environment variables | `export PANORAMA_API_KEY=...`                  |
| CI/CD       | Pipeline secrets      | GitHub Secrets, GitLab CI Variables            |
| Production  | Secrets manager       | AWS Secrets Manager, HashiCorp Vault           |
| Kubernetes  | K8s secrets           | `kubectl create secret generic panorama-creds` |

### 2. Least Privilege

Create dedicated admin accounts for API access with minimal permissions:

```xml
<!-- Custom admin role with limited permissions -->
<admin-role>
  <name>api-read-only</name>
  <permissions>
    <config>
      <admin>
        <access>read</access>
      </admin>
      <device-and-network>
        <access>read</access>
      </device-and-network>
      <policy>
        <access>read</access>
      </policy>
    </config>
  </permissions>
</admin-role>
```

### 3. Credential Masking in Logs

```go
// ✅ CORRECT: Mask credentials in logs
func logRequest(req *http.Request) {
    auth := req.Header.Get("X-PAN-KEY")
    if auth != "" {
        auth = auth[:8] + "..." + auth[len(auth)-4:]
    }

    log.Info("API request",
        "method", req.Method,
        "url", req.URL.Path,
        "auth", auth, // Masked
    )
}

// ❌ WRONG: Log full credentials
func logRequest(req *http.Request) {
    log.Info("API request",
        "auth", req.Header.Get("X-PAN-KEY"), // EXPOSES KEY!
    )
}
```

### 4. TLS Configuration

```go
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS12,
    CipherSuites: []uint16{
        tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
    },
    // For self-signed certs in lab environments only
    // InsecureSkipVerify: true,
}
```

### 5. IP Whitelisting

Configure Panorama to only accept API requests from known IPs:

1. Navigate to **Device** → **Setup** → **Management** → **Management Interface Settings**
2. Add permitted IP addresses/ranges
3. Enable **Restrict Administrator Access**

## Troubleshooting

| Issue            | Cause                    | Solution                                    |
| ---------------- | ------------------------ | ------------------------------------------- |
| 401 Unauthorized | Invalid API key          | Regenerate key, check for copy/paste errors |
| 403 Forbidden    | Insufficient permissions | Check admin role, verify API access enabled |
| Key not working  | Key expired or revoked   | Generate new key, check key status in UI    |
| SSL errors       | Certificate issues       | Verify TLS config, check cert validity      |
| Session timeout  | Inactivity               | Use API key instead of session auth         |

## Related References

- [Error Handling](error-handling.md) - Authentication error codes
- [Rate Limiting](rate-limiting.md) - Request limits
- [Security Best Practices](security.md) - Credential management
