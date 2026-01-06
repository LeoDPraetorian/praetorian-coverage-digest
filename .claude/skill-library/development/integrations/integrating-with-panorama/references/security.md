# Panorama Security Best Practices

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Securing Panorama API integrations requires defense in depth: credential management, network security, audit logging, and least-privilege access. This guide covers security controls for production integrations.

## Security Checklist

### Critical (Must Have)

- [ ] API keys stored in secrets manager (not code/config files)
- [ ] TLS 1.2+ enforced for all API connections
- [ ] Dedicated service account with minimal permissions
- [ ] Credentials never logged
- [ ] API key rotation procedure documented
- [ ] Network access restricted to required endpoints

### High Priority

- [ ] IP whitelisting configured on Panorama
- [ ] Audit logging enabled for API operations
- [ ] Rate limiting implemented client-side
- [ ] Circuit breaker for fault tolerance
- [ ] Alerting on authentication failures

### Recommended

- [ ] Separate API keys per environment
- [ ] Automated credential rotation
- [ ] Request signing for sensitive operations
- [ ] Penetration testing of integration

## Credential Management

### Secure Storage

**AWS Secrets Manager (Recommended):**

```go
package panorama

import (
    "context"
    "encoding/json"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type PanoramaCredentials struct {
    APIKEY   string `json:"api_key"`
    URL      string `json:"url"`
    Username string `json:"username,omitempty"`
    Password string `json:"password,omitempty"`
}

func GetCredentials(ctx context.Context, secretName string) (*PanoramaCredentials, error) {
    cfg, err := config.LoadDefaultConfig(ctx)
    if err != nil {
        return nil, err
    }

    client := secretsmanager.NewFromConfig(cfg)
    result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    })
    if err != nil {
        return nil, err
    }

    var creds PanoramaCredentials
    if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
        return nil, err
    }

    return &creds, nil
}
```

**HashiCorp Vault:**

```go
func GetCredentialsFromVault(ctx context.Context, path string) (*PanoramaCredentials, error) {
    client, err := vault.NewClient(vault.DefaultConfig())
    if err != nil {
        return nil, err
    }

    secret, err := client.KVv2("secret").Get(ctx, path)
    if err != nil {
        return nil, err
    }

    return &PanoramaCredentials{
        APIKey: secret.Data["api_key"].(string),
        URL:    secret.Data["url"].(string),
    }, nil
}
```

### Credential Rotation

**Automated Rotation Script:**

```bash
#!/bin/bash
set -euo pipefail

# Configuration
PANORAMA_HOST="${PANORAMA_HOST:?Required}"
SECRET_NAME="${SECRET_NAME:-prod/panorama/api-key}"
ROTATION_DAYS="${ROTATION_DAYS:-30}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

log "Starting API key rotation for $PANORAMA_HOST"

# Get current credentials
CURRENT=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query SecretString --output text)

USERNAME=$(echo "$CURRENT" | jq -r '.username')
PASSWORD=$(echo "$CURRENT" | jq -r '.password')
OLD_KEY=$(echo "$CURRENT" | jq -r '.api_key')

# Generate new API key
log "Generating new API key..."
NEW_KEY=$(curl -sk -X POST \
    "https://${PANORAMA_HOST}/api/?type=keygen&user=${USERNAME}&password=${PASSWORD}" \
    | xmllint --xpath "string(//key)" -)

if [ -z "$NEW_KEY" ]; then
    log "ERROR: Failed to generate new key"
    exit 1
fi

# Verify new key
log "Verifying new key..."
HTTP_CODE=$(curl -sk -w "%{http_code}" -o /dev/null \
    -H "X-PAN-KEY: ${NEW_KEY}" \
    "https://${PANORAMA_HOST}/restapi/v11.0/System/Info")

if [ "$HTTP_CODE" != "200" ]; then
    log "ERROR: New key verification failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Update secret
log "Updating secret in Secrets Manager..."
NEW_SECRET=$(echo "$CURRENT" | jq --arg key "$NEW_KEY" '.api_key = $key')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$NEW_SECRET"

# Tag with rotation metadata
aws secretsmanager tag-resource \
    --secret-id "$SECRET_NAME" \
    --tags "Key=LastRotated,Value=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log "Rotation complete. Services will pick up new key on next credential fetch."
```

**AWS Lambda Rotation:**

```go
// Lambda handler for Secrets Manager rotation
func handleRotation(ctx context.Context, event secretsmanager.RotationEvent) error {
    switch event.Step {
    case "createSecret":
        return createNewSecret(ctx, event)
    case "setSecret":
        return setSecretInPanorama(ctx, event)
    case "testSecret":
        return testNewSecret(ctx, event)
    case "finishSecret":
        return finishRotation(ctx, event)
    }
    return nil
}

func createNewSecret(ctx context.Context, event secretsmanager.RotationEvent) error {
    // Get current credentials
    current, _ := getSecretValue(ctx, event.SecretId, "AWSCURRENT")

    // Generate new API key from Panorama
    newKey, err := generatePanoramaAPIKey(current.URL, current.Username, current.Password)
    if err != nil {
        return err
    }

    // Store as pending
    newCreds := current
    newCreds.APIKey = newKey

    return putSecretValue(ctx, event.SecretId, event.ClientRequestToken, newCreds, "AWSPENDING")
}
```

### Environment Separation

```
Production:
  - Secret: prod/panorama/api-key
  - Admin role: api-prod-automation
  - Permissions: Full policy management

Staging:
  - Secret: staging/panorama/api-key
  - Admin role: api-staging-automation
  - Permissions: Limited to staging device groups

Development:
  - Secret: dev/panorama/api-key
  - Admin role: api-dev-automation
  - Permissions: Read-only + lab device groups
```

## Network Security

### TLS Configuration

```go
func NewSecureClient(config ClientConfig) (*Client, error) {
    tlsConfig := &tls.Config{
        MinVersion: tls.VersionTLS12,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        },
        // For production, set to false and add CA cert
        InsecureSkipVerify: false,
    }

    // Add custom CA if using self-signed certs
    if config.CACertPath != "" {
        caCert, err := os.ReadFile(config.CACertPath)
        if err != nil {
            return nil, err
        }

        caCertPool := x509.NewCertPool()
        caCertPool.AppendCertsFromPEM(caCert)
        tlsConfig.RootCAs = caCertPool
    }

    transport := &http.Transport{
        TLSClientConfig: tlsConfig,
        // Prevent SSRF
        DialContext: (&net.Dialer{
            Timeout: 10 * time.Second,
        }).DialContext,
    }

    return &Client{
        httpClient: &http.Client{
            Transport: transport,
            Timeout:   30 * time.Second,
        },
    }, nil
}
```

### IP Whitelisting

Configure Panorama to only accept API requests from known IPs:

1. Navigate to **Device** → **Setup** → **Management** → **Management Interface Settings**
2. Add permitted IP addresses/ranges
3. Enable **Restrict Administrator Access**

```bash
# Verify your integration's source IP
curl -s https://checkip.amazonaws.com

# Test connectivity
curl -v -k "https://<panorama>/api/?type=version"
```

### Network Isolation

```yaml
# AWS Security Group for Integration Service
SecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Panorama Integration
    VpcId: !Ref VPC
    SecurityGroupEgress:
      # Panorama API only
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 10.0.0.50/32 # Panorama IP
        Description: Panorama API
      # Chariot API
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0 # Or specific Chariot endpoint
        Description: Chariot API
    # No inbound rules - poll-based architecture
    SecurityGroupIngress: []
```

## Access Control

### Least Privilege Admin Role

Create a dedicated admin role for API access:

```xml
<!-- Custom API admin role with minimal permissions -->
<admin-role>
  <name>api-integration</name>
  <permissions>
    <config>
      <admin>
        <access>read</access>
      </admin>
      <device-and-network>
        <access>read</access>
      </device-and-network>
      <policy>
        <access>read-write</access>  <!-- Only if needed -->
      </policy>
      <objects>
        <access>read-write</access>
      </objects>
    </config>
    <operational-commands>
      <commit>
        <access>enable</access>
      </commit>
    </operational-commands>
  </permissions>
</admin-role>
```

### Role-Based API Keys

```go
type APIKeyRole string

const (
    RoleReadOnly    APIKeyRole = "read-only"
    RoleReadWrite   APIKeyRole = "read-write"
    RoleFullAccess  APIKeyRole = "full-access"
)

// GetAPIKeyForOperation selects appropriate key based on operation
func (c *Client) GetAPIKeyForOperation(op OperationType) string {
    switch op {
    case OpRead:
        return c.credentials.ReadOnlyKey
    case OpWrite:
        return c.credentials.ReadWriteKey
    case OpCommit:
        return c.credentials.CommitKey
    default:
        return c.credentials.ReadOnlyKey
    }
}
```

## Audit Logging

### Request Logging

```go
// AuditLogger logs all API operations
type AuditLogger struct {
    logger *slog.Logger
}

func (a *AuditLogger) LogRequest(req *http.Request, operation string, user string) {
    // Mask sensitive data
    maskedHeaders := maskHeaders(req.Header)

    a.logger.Info("Panorama API request",
        "operation", operation,
        "method", req.Method,
        "path", req.URL.Path,
        "user", user,
        "source_ip", getSourceIP(),
        "timestamp", time.Now().UTC().Format(time.RFC3339),
        "headers", maskedHeaders,
    )
}

func (a *AuditLogger) LogResponse(resp *http.Response, duration time.Duration, err error) {
    level := slog.LevelInfo
    if resp.StatusCode >= 400 || err != nil {
        level = slog.LevelWarn
    }

    a.logger.Log(context.Background(), level, "Panorama API response",
        "status_code", resp.StatusCode,
        "duration_ms", duration.Milliseconds(),
        "error", err,
    )
}

func maskHeaders(headers http.Header) map[string]string {
    masked := make(map[string]string)
    for k, v := range headers {
        if k == "X-PAN-KEY" || k == "Authorization" {
            if len(v) > 0 && len(v[0]) > 8 {
                masked[k] = v[0][:4] + "..." + v[0][len(v[0])-4:]
            } else {
                masked[k] = "[REDACTED]"
            }
        } else {
            masked[k] = strings.Join(v, ", ")
        }
    }
    return masked
}
```

### Panorama Audit Logs

Enable and monitor Panorama configuration logs:

```bash
# Query Panorama config audit logs via API
curl -k -g "https://<panorama>/api/?type=log&log-type=config&query=(admin eq 'api-integration')&nlogs=100&key=$KEY"
```

### CloudWatch Logs Insights Queries

```sql
-- Authentication failures
fields @timestamp, @message
| filter @message like /401|403|Unauthorized/
| sort @timestamp desc
| limit 100

-- High-volume API usage
fields @timestamp, operation, source_ip
| stats count() as request_count by operation, source_ip
| sort request_count desc

-- Slow requests
fields @timestamp, operation, duration_ms
| filter duration_ms > 5000
| sort duration_ms desc
| limit 50

-- Configuration changes
fields @timestamp, operation, user
| filter operation like /set|delete|edit/
| sort @timestamp desc
```

## Input Validation

### XPath Injection Prevention

```go
// ValidateXPath sanitizes XPath input to prevent injection
func ValidateXPath(xpath string) error {
    // Disallow dangerous patterns
    dangerousPatterns := []string{
        "//",           // Recursive descent
        "..",           // Parent navigation
        "/*",           // Wildcard root
        "text()",       // Text extraction
        "comment()",    // Comment extraction
        "processing-instruction()",
    }

    for _, pattern := range dangerousPatterns {
        if strings.Contains(xpath, pattern) {
            return fmt.Errorf("invalid xpath: contains dangerous pattern '%s'", pattern)
        }
    }

    // Validate structure
    if !strings.HasPrefix(xpath, "/config") {
        return errors.New("xpath must start with /config")
    }

    return nil
}

// SafeXPath constructs XPath safely
func SafeXPath(base string, parts ...string) string {
    var builder strings.Builder
    builder.WriteString(base)

    for _, part := range parts {
        // Escape special characters
        escaped := escapeXPathValue(part)
        builder.WriteString("/")
        builder.WriteString(escaped)
    }

    return builder.String()
}

func escapeXPathValue(s string) string {
    // Replace quotes and special chars
    s = strings.ReplaceAll(s, "'", "\\'")
    s = strings.ReplaceAll(s, "\"", "\\\"")
    s = strings.ReplaceAll(s, "<", "&lt;")
    s = strings.ReplaceAll(s, ">", "&gt;")
    return s
}
```

### Object Name Validation

```go
// ValidateObjectName ensures object names are safe
func ValidateObjectName(name string) error {
    // PAN-OS naming rules
    if len(name) == 0 {
        return errors.New("name cannot be empty")
    }

    if len(name) > 63 {
        return errors.New("name cannot exceed 63 characters")
    }

    // Must start with alphanumeric
    if !unicode.IsLetter(rune(name[0])) && !unicode.IsDigit(rune(name[0])) {
        return errors.New("name must start with letter or digit")
    }

    // Only alphanumeric, hyphen, underscore, period
    validChars := regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)
    if !validChars.MatchString(name) {
        return errors.New("name contains invalid characters")
    }

    return nil
}
```

## Incident Response

### Credential Compromise Response

```
IMMEDIATE (< 5 minutes):
1. Revoke compromised API key via Panorama UI
2. Generate new API key
3. Update secrets manager
4. Restart integration services

INVESTIGATION (< 1 hour):
1. Review Panorama config audit logs
2. Check CloudTrail for secret access
3. Identify scope of compromise
4. Document timeline

REMEDIATION (< 24 hours):
1. Rotate all related credentials
2. Review and tighten IP whitelisting
3. Implement additional monitoring
4. Update incident runbook
```

### Security Alerts

```go
// SecurityMonitor watches for suspicious activity
type SecurityMonitor struct {
    authFailureCount  int
    rateLimitCount    int
    alertThreshold    int
    alertCallback     func(string)
}

func (m *SecurityMonitor) RecordAuthFailure() {
    m.authFailureCount++
    if m.authFailureCount >= m.alertThreshold {
        m.alertCallback("High authentication failure rate detected")
        m.authFailureCount = 0
    }
}

func (m *SecurityMonitor) RecordRateLimit() {
    m.rateLimitCount++
    if m.rateLimitCount >= m.alertThreshold {
        m.alertCallback("Excessive rate limiting detected")
        m.rateLimitCount = 0
    }
}
```

## Compliance

### SOC 2 Controls

| Control           | Implementation                          |
| ----------------- | --------------------------------------- |
| Access Control    | API keys per environment, RBAC roles    |
| Encryption        | TLS 1.2+ for all API traffic            |
| Audit Logging     | All operations logged to CloudWatch     |
| Incident Response | Automated alerting, documented runbooks |
| Change Management | Git-tracked configuration, PR reviews   |

### GDPR Considerations

- Avoid storing PII in address object descriptions
- Implement data retention policies for logs
- Enable right-to-erasure for synced data
- Document data flows in privacy impact assessment

## Related References

- [Authentication](authentication.md) - Credential setup
- [Architecture](architecture.md) - Security architecture diagrams
- [Troubleshooting](troubleshooting.md) - Security debugging
- [Error Handling](error-handling.md) - Auth error handling
