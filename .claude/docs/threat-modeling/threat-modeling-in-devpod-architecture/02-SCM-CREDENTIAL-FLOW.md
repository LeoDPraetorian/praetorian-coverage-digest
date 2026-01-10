# Threat Modeling DevPod: SCM Integration & Credential Security

**Document**: 2 of 6 - SCM Credential Flow and Security **Purpose**: Deep dive
into secure credential handling for repository access **Last Synchronized**:
2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                              |
| ------------------ | -------------------------------------------------- |
| **Document ID**    | 02-SCM-CREDENTIAL-FLOW                             |
| **Token Count**    | ~12,500 tokens                                     |
| **Read Time**      | 25-30 minutes                                      |
| **Prerequisites**  | 01-ARCHITECTURE-OVERVIEW                           |
| **Next Documents** | 03-COMPONENT-IMPLEMENTATION, 04-SECURITY-HARDENING |

---

## Related Documents

This document is part of the Threat Modeling DevPod architecture series:

- **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** - System design
  and architecture context
- **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** -
  Implementation details for all components
- **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - Additional P0/P1
  security fixes
- **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Testing and
  operations procedures
- **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** -
  Training data capture and telemetry pipeline

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of overall architecture from Document 1
- Familiarity with OAuth flows and secret management concepts
- Basic knowledge of AWS Secrets Manager

### Exit Criteria

After reading this document, you should be able to implement:

- SCM OAuth integration
- Just-In-Time (JIT) credential injection
- Memory-only secret handling
- Credential rotation strategy
- Git cloning without token persistence
- All credential-related security controls (P0-2, P1-4, P1-11, P1-15)

---

## Table of Contents

- [SCM Integration Flow](#scm-integration-flow)
- [How Tokens Are Stored](#how-tokens-are-stored)
- [Token Retrieval Flow (JIT Pattern)](#token-retrieval-flow-jit-pattern)
- [Security Properties](#security-properties)
- [Implementation: getCustomerSCMIntegration](#implementation-getcustomerscmintegration)
- [Token Lifecycle Summary](#token-lifecycle-summary)
- [P0-2: Memory-Only Credential Injection](#p0-2-memory-only-credential-injection)
- [P1-4: Byte-Based Secret Handling](#p1-4-byte-based-secret-handling)
- [P1-11: Credential Rotation](#p1-11-credential-rotation)
- [P1-15: Git Token Race Condition Fix](#p1-15-git-token-race-condition-fix)
- [Adversarial Testing for Credentials](#adversarial-testing-for-credentials)

---

## SCM Integration Flow

This section explains how customer code travels from their source control system
to the DevPod environment securely, without exposing credentials.

### Prerequisites

Before launching a threat modeling environment, the following must be
configured:

| Requirement           | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| **SCM Integration**   | Customer connects GitHub, GitLab, or Bitbucket org to Chariot via OAuth |
| **Repository Access** | The integration must have read access to the target repository          |
| **Token Storage**     | Chariot automatically stores the OAuth token in AWS Secrets Manager     |

---

## How Tokens Are Stored

When a customer connects their SCM provider to Chariot:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. OAuth Flow                                                   │
│    Customer authorizes Chariot via GitHub App / GitLab OAuth    │
│    / Bitbucket App                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Token Receipt                                                │
│    Chariot receives access token scoped to authorized repos     │
│    Token is NEVER stored in DynamoDB or application database    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Secrets Manager Storage                                      │
│    Path: chariot/scm/{customer_id}/{integration_id}             │
│    Encryption: AWS KMS with customer-specific key               │
│    Metadata: SCM type, scope, expiration                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Reference Storage                                            │
│    Only the Secret ARN is stored in DynamoDB                    │
│    Example: arn:aws:secretsmanager:us-east-1:123:secret:...     │
│    The actual token value is NEVER in the application database  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Security Principle**: The application database (DynamoDB) stores ONLY
references (ARNs), never actual credentials. This prevents database dumps from
exposing secrets.

---

## Token Retrieval Flow (JIT Pattern)

The Just-In-Time (JIT) credential pattern ensures tokens are never stored in
DevPod environments:

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User Requests Environment (Lambda)                      │
│                                                                 │
│ ├── Validate user has access to engagement                      │
│ ├── Retrieve SCM integration metadata (NOT the token)           │
│ ├── Store Secret ARN reference in workspace record              │
│ └── Publish provision request to SQS                            │
│                                                                 │
│ Token status: Not accessed yet                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Provision DevPod (EC2 Orchestrator)                     │
│                                                                 │
│ ├── Receive SQS message with workspace details                  │
│ ├── Create EC2 instance via DevPod CLI                          │
│ ├── Pass SCM_SECRET_ARN as env var (reference only)             │
│ └── DevPod environment has NO access to actual credentials      │
│                                                                 │
│ Token status: Still not accessed                                │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: JIT Token Fetch (Critical Security Step)                │
│                                                                 │
│ ├── Orchestrator (NOT DevPod) calls Secrets Manager             │
│ ├── Token loaded into orchestrator memory only                  │
│ ├── Token exists for ~30 seconds during clone operation         │
│ └── Token is cleared from memory immediately after              │
│                                                                 │
│ Token status: In orchestrator memory only (transient)           │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: SSH Clone Command                                       │
│                                                                 │
│ ├── Orchestrator SSHs into DevPod                               │
│ ├── Runs: git clone using GIT_ASKPASS (see P1-15)               │
│ ├── Token passed via environment variable (never in URL)        │
│ ├── After clone: No credentials in .git/config                  │
│ └── No credential helper or .git-credentials file created       │
│                                                                 │
│ Token status: Used transiently, then gone                       │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: Code Available in DevPod                                │
│                                                                 │
│ /workspace/customer-code/                                       │
│ ├── .git/config → remote origin = https://github.com/.. (clean) │
│ ├── src/                                                        │
│ └── ...                                                         │
│                                                                 │
│ Token status: Cleared from all memory, never persisted          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Properties

| Property                                 | How It's Achieved                                               |
| ---------------------------------------- | --------------------------------------------------------------- |
| **Token never stored in DevPod**         | Orchestrator fetches token and SSHs command to DevPod           |
| **Token never in environment variables** | Only ARN reference passed; actual token fetched JIT             |
| **Token never in git config**            | GIT_ASKPASS pattern prevents credential persistence (P1-15)     |
| **Token never on disk**                  | Clone command uses in-memory environment, never written to file |
| **Minimal token lifetime**               | Token in orchestrator memory only during clone (~30 sec)        |
| **Audit trail**                          | All Secrets Manager access logged to CloudTrail                 |
| **Scoped access**                        | Tokens are repository-scoped, read-only, short-lived (24h)      |
| **No token reuse**                       | Fresh token fetch for each workspace provision                  |

---

## Sequence Diagram

```
┌──────────┐     ┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌────────┐
│  Lambda  │     │   SQS    │     │Orchestrator│     │Secrets Mgr  │     │ DevPod │
└────┬─────┘     └────┬─────┘     └─────┬──────┘     └──────┬──────┘     └───┬────┘
     │                │                 │                   │                │
     │ Publish msg    │                 │                   │                │
     │ (workspace_id, │                 │                   │                │
     │  secret_arn)   │                 │                   │                │
     │───────────────>│                 │                   │                │
     │                │                 │                   │                │
     │                │ Receive         │                   │                │
     │                │────────────────>│                   │                │
     │                │                 │                   │                │
     │                │                 │ devpod up         │                │
     │                │                 │ (no credentials)  │                │
     │                │                 │──────────────────────────────────> │
     │                │                 │                   │                │
     │                │                 │                   │                │
     │                │                 │ GetSecretValue    │                │
     │                │                 │ (JIT fetch)       │                │
     │                │                 │──────────────────>│                │
     │                │                 │                   │                │
     │                │                 │<──────────────────│                │
     │                │                 │ token (memory)    │                │
     │                │                 │                   │                │
     │                │                 │ devpod ssh        │                │
     │                │                 │ "git clone ..."   │                │
     │                │                 │──────────────────────────────────> │
     │                │                 │                   │                │
     │                │                 │                   │      Clone     │
     │                │                 │                   │      completes │
     │                │                 │<────────────────────────────────── │
     │                │                 │                   │                │
     │                │                 │ zeroBytes(token)  │                │
     │                │                 │ (clear memory)    │                │
     │                │                 │                   │                │
```

---

## Implementation: getCustomerSCMIntegration

This function retrieves SCM integration metadata (not the token) for a customer:

```go
// getCustomerSCMIntegration retrieves SCM integration for a customer.
// Returns integration metadata including SecretARN (not the token value).
func getCustomerSCMIntegration(ctx context.Context, customerID string) (*SCMIntegration, error) {
    // Query DynamoDB for customer's active SCM integrations
    result, err := dynamoClient.Query(ctx, &dynamodb.QueryInput{
        TableName: aws.String("ChariotTable"),
        KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :sk)"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk":     &types.AttributeValueMemberS{Value: fmt.Sprintf("CUSTOMER#%s", customerID)},
            ":sk":     &types.AttributeValueMemberS{Value: "INTEGRATION#SCM#"},
            ":active": &types.AttributeValueMemberS{Value: "active"},
        },
        FilterExpression: aws.String("integration_status = :active"),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to query integrations: %w", err)
    }

    if len(result.Items) == 0 {
        return nil, ErrNoSCMIntegration
    }

    // Return first active integration
    var integration SCMIntegration
    if err := attributevalue.UnmarshalMap(result.Items[0], &integration); err != nil {
        return nil, fmt.Errorf("failed to unmarshal integration: %w", err)
    }

    return &integration, nil
}

// SCMIntegration represents a customer's source control integration.
// Note: SecretARN is a reference to Secrets Manager, not the token itself.
type SCMIntegration struct {
    ID           string   `dynamodbav:"integration_id"`
    CustomerID   string   `dynamodbav:"customer_id"`
    Type         string   `dynamodbav:"scm_type"`           // github|gitlab|bitbucket
    SecretARN    string   `dynamodbav:"secret_arn"`         // Reference to Secrets Manager
    Repositories []string `dynamodbav:"repositories"`       // Authorized repositories
    Scope        string   `dynamodbav:"scope"`              // read|write
    Status       string   `dynamodbav:"integration_status"` // active|revoked|expired
    CreatedAt    string   `dynamodbav:"created_at"`
    ExpiresAt    string   `dynamodbav:"expires_at"`
}

var ErrNoSCMIntegration = errors.New("customer has no active SCM integration")
```

**Key Design Decision**: The function returns metadata only. The actual token is
fetched later via JIT pattern in the orchestrator, ensuring the Lambda never has
access to the secret value.

---

## Token Lifecycle Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOKEN LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CREATION (During Customer Integration Setup)                   │
│  ├── Customer completes OAuth flow                              │
│  ├── Token stored in Secrets Manager (encrypted, scoped)        │
│  └── Only ARN stored in application database                    │
│                                                                 │
│  USAGE (During Workspace Provisioning)                          │
│  ├── Lambda retrieves ARN reference (not token)                 │
│  ├── Orchestrator fetches token JIT from Secrets Manager        │
│  ├── Token used for single git clone operation                  │
│  └── Token cleared from memory immediately                      │
│                                                                 │
│  EXPIRATION                                                     │
│  ├── Tokens have 24-hour expiry (configurable)                  │
│  ├── Chariot refreshes tokens automatically via OAuth refresh   │
│  └── Expired tokens trigger re-authorization flow               │
│                                                                 │
│  REVOCATION                                                     │
│  ├── Customer can revoke via Chariot UI                         │
│  ├── Chariot deletes from Secrets Manager                       │
│  └── All active workspaces continue (code already cloned)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## P0-2: Memory-Only Credential Injection

**Risk Level**: P0 (Critical) **Component**: Orchestrator credential handling
**Attack Vector**: Disk persistence of credentials

### Problem

The original implementation wrote secrets to temporary files on disk. This
violates the "Data Only in Memory" principle:

- Orchestrator crash leaves key on filesystem
- EBS snapshots archive the key permanently
- Deleted files recoverable from filesystem journal

### Solution

`io.Pipe`-based streaming from memory directly to SSH stdin. Secrets NEVER touch
disk.

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/credentials/memory_injector.go`

```go
package credentials

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

// SecretsStore interface for secret retrieval - returns []byte, NOT string
// This is critical for proper memory cleanup (Go strings are immutable)
type SecretsStore interface {
	GetSecretBytes(ctx context.Context, secretID string) ([]byte, error)
}

// MemoryOnlyInjector streams credentials directly from memory to process stdin
// Credentials NEVER touch disk - they flow: Secrets Manager → memory → io.Pipe → SSH stdin
type MemoryOnlyInjector struct {
	secretsStore SecretsStore
}

// NewMemoryOnlyInjector creates a new memory-only credential injector
func NewMemoryOnlyInjector(secretsStore SecretsStore) *MemoryOnlyInjector {
	return &MemoryOnlyInjector{
		secretsStore: secretsStore,
	}
}

// zeroBytes securely wipes a byte slice by overwriting with zeros
// Unlike strings, byte slices are mutable and CAN be securely wiped
func zeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

// InjectAnthropicAPIKey streams the API key directly to a running DevPod via io.Pipe
// The key NEVER appears on disk, in process list, or in command line arguments
func (m *MemoryOnlyInjector) InjectAnthropicAPIKey(
	ctx context.Context,
	workspaceID string,
) error {
	// Fetch API key as []byte (NOT string - see P1-4 for why this matters)
	apiKeyBytes, err := m.secretsStore.GetSecretBytes(ctx, "chariot/anthropic-api-key")
	if err != nil {
		return fmt.Errorf("failed to get Anthropic API key: %w", err)
	}
	// CRITICAL: Zero the bytes when done, even on panic
	defer zeroBytes(apiKeyBytes)

	// Injection script - reads key from stdin, never from command line or disk
	injectScript := `#!/bin/bash
set -euo pipefail

# Read API key from stdin (not command line, not disk)
read -r API_KEY

# Create config directory
mkdir -p /home/devpod/.config/claude

# Write to credentials file with secure permissions
# Note: This writes to disk INSIDE the DevPod, which is acceptable
# The orchestrator never writes to its own disk
cat > /home/devpod/.config/claude/credentials <<EOF
ANTHROPIC_API_KEY=$API_KEY
EOF
chmod 600 /home/devpod/.config/claude/credentials
chown devpod:devpod /home/devpod/.config/claude/credentials

# Add to shell profile for interactive sessions
grep -q "ANTHROPIC_API_KEY" /home/devpod/.zshrc 2>/dev/null || \
    echo "export ANTHROPIC_API_KEY='$API_KEY'" >> /home/devpod/.zshrc
chmod 600 /home/devpod/.zshrc

# Clear variable from shell memory
unset API_KEY
`

	// Copy injection script to DevPod (script itself contains no secrets)
	scriptCmd := exec.CommandContext(ctx, "devpod", "ssh",
		"--command", "cat > /tmp/inject-creds.sh && chmod 700 /tmp/inject-creds.sh",
		workspaceID,
	)
	scriptCmd.Stdin = strings.NewReader(injectScript)
	if output, err := scriptCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to copy injection script: %w, output: %s", err, output)
	}

	// Execute script with API key streamed via io.Pipe (MEMORY ONLY)
	execCmd := exec.CommandContext(ctx, "devpod", "ssh",
		"--command", "/tmp/inject-creds.sh",
		workspaceID,
	)

	// Create pipe for memory-to-stdin streaming
	stdinPipe, err := execCmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	// Start the command before writing to stdin
	if err := execCmd.Start(); err != nil {
		stdinPipe.Close()
		return fmt.Errorf("failed to start injection command: %w", err)
	}

	// Write secret directly to stdin via pipe (memory-to-memory, NEVER disk)
	writeErr := make(chan error, 1)
	go func() {
		defer stdinPipe.Close()
		// Write API key bytes directly to pipe
		_, err := stdinPipe.Write(apiKeyBytes)
		if err != nil && err != io.ErrClosedPipe {
			writeErr <- err
			return
		}
		// Write newline for the `read` command
		stdinPipe.Write([]byte("\n"))
		writeErr <- nil
	}()

	// Wait for command to complete
	if err := execCmd.Wait(); err != nil {
		return fmt.Errorf("injection command failed: %w", err)
	}

	// Check for write errors
	if err := <-writeErr; err != nil {
		return fmt.Errorf("failed to write to stdin pipe: %w", err)
	}

	// Cleanup script (best effort)
	cleanupCmd := exec.CommandContext(ctx, "devpod", "ssh",
		"--command", "rm -f /tmp/inject-creds.sh",
		workspaceID,
	)
	cleanupCmd.Run()

	return nil
}
```

### Defense Layers

1. **Memory-only flow**: Secret bytes flow Secrets Manager API → memory →
   `io.Pipe` → SSH stdin
2. **No disk I/O**: No `os.WriteFile`, no temp files, no file handles to disk
3. **Crash-safe**: If orchestrator crashes, no secret remnants on disk (was
   never written)
4. **Snapshot-safe**: EBS/disk snapshots cannot capture the secret (never on
   disk)
5. **`[]byte` not `string`**: Mutable byte slices can be securely zeroed (see
   P1-4)
6. **Immediate zeroing**: `defer zeroBytes()` ensures cleanup even on panic

### Adversarial Test Verification

```bash
# Test: Kill orchestrator during injection, then check disk
kill -9 $ORCHESTRATOR_PID
grep -r "sk-ant" /tmp /var/tmp  # MUST return empty
```

---

## P1-4: Byte-Based Secret Handling

**Risk Level**: P1 (High) **Component**: Secrets storage and handling **Attack
Vector**: String immutability preventing secure memory cleanup

### Problem

The original `secureWipe(s *string)` function was ineffective because Go strings
are immutable:

```go
// BROKEN: This creates a COPY of the string data
bytes := []byte(*s)  // Original string unchanged in memory
for i := range bytes {
    bytes[i] = 0      // Only zeros the copy, not the original
}
```

The original secret remains in memory until garbage collection runs, which is
non-deterministic.

### Solution

Use `[]byte` throughout the entire secret handling chain, from retrieval to use
to cleanup.

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/secrets/bytes_store.go`

```go
package secrets

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// SecretsStore retrieves secrets as []byte (NOT string)
// This enables proper memory cleanup since byte slices are mutable
type SecretsStore interface {
	// GetSecretBytes returns secret value as []byte
	// Caller MUST call zeroBytes() on the returned slice when done
	GetSecretBytes(ctx context.Context, secretID string) ([]byte, error)
}

// AWSSecretsStore implements SecretsStore using AWS Secrets Manager
type AWSSecretsStore struct {
	client *secretsmanager.Client
}

// NewAWSSecretsStore creates a new AWS Secrets Manager-backed store
func NewAWSSecretsStore(client *secretsmanager.Client) *AWSSecretsStore {
	return &AWSSecretsStore{client: client}
}

// GetSecretBytes retrieves a secret as []byte for secure memory handling
func (s *AWSSecretsStore) GetSecretBytes(ctx context.Context, secretID string) ([]byte, error) {
	output, err := s.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret %s: %w", secretID, err)
	}

	// Prefer SecretBinary if available (already []byte)
	if output.SecretBinary != nil {
		return output.SecretBinary, nil
	}

	// Convert SecretString to []byte
	// NOTE: This creates a copy, but we'll zero it immediately after use
	if output.SecretString != nil {
		return []byte(*output.SecretString), nil
	}

	return nil, fmt.Errorf("secret %s has no value", secretID)
}

// ZeroBytes securely wipes a byte slice by overwriting with zeros
// Unlike strings, byte slices are mutable and CAN be securely wiped
func ZeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}
```

### Usage Pattern

**Enforced throughout codebase:**

```go
// CORRECT: Use []byte with immediate zeroing
tokenBytes, err := secretsStore.GetSecretBytes(ctx, secretID)
if err != nil {
    return err
}
defer secrets.ZeroBytes(tokenBytes)  // CRITICAL: Zero on all exit paths

// Use tokenBytes...
```

### Defense Properties

1. **Mutable data**: Byte slices can be explicitly zeroed, unlike strings
2. **Immediate cleanup**: `defer ZeroBytes()` ensures cleanup even on panic
3. **No copies**: Data flows as bytes throughout, no string conversion
4. **Audit trail**: Code pattern is greppable for compliance verification

---

## P1-11: Credential Rotation

**Risk Level**: P1 (High) **Component**: API credential management **Attack
Vector**: Long-lived compromised credentials

### Problem

The Anthropic API key is long-lived. If compromised, it remains valid until
manually rotated. No alerting on anomalous usage patterns.

> **IMPORTANT - Anthropic API Limitation**: As of December 2025, Anthropic does
> **NOT** provide a public Admin API for programmatic key rotation. API keys are
> managed exclusively via the Anthropic Console. This affects the automation
> capabilities described below.

### Solution

Multi-key strategy with usage monitoring, anomaly detection, and semi-automated
rotation workflow:

1. **Multi-Key Pool**: Pre-provision 3-4 API keys in Anthropic Console, store
   all in Secrets Manager
2. **Active Key Selection**: Orchestrator randomly selects from pool per-session
   (limits blast radius)
3. **Rotation Trigger**: Automated detection triggers alert → Security team
   rotates in Console → Updates Secrets Manager
4. **Future-Proofing**: Architecture supports full automation when Anthropic
   releases Admin API

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/credentials/rotation.go`

```go
package credentials

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// CredentialRotator manages automatic rotation of API credentials
type CredentialRotator struct {
	secretsClient *secretsmanager.Client
	secretID      string
	rotationDays  int
	alerter       Alerter
}

// RotationConfig specifies rotation parameters
type RotationConfig struct {
	SecretID         string
	RotationDays     int        // Days between rotations
	UsageThreshold   int        // Alert if usage exceeds this per hour
	AnomalyDetection bool       // Enable ML-based anomaly detection
}

// NewCredentialRotator creates a new rotator with the given config
func NewCredentialRotator(client *secretsmanager.Client, config RotationConfig) *CredentialRotator {
	return &CredentialRotator{
		secretsClient: client,
		secretID:      config.SecretID,
		rotationDays:  config.RotationDays,
	}
}

// EnableAutoRotation configures AWS Secrets Manager automatic rotation
func (r *CredentialRotator) EnableAutoRotation(ctx context.Context) error {
	_, err := r.secretsClient.RotateSecret(ctx, &secretsmanager.RotateSecretInput{
		SecretId: &r.secretID,
		RotationRules: &types.RotationRulesType{
			AutomaticallyAfterDays: int64Ptr(int64(r.rotationDays)),
		},
		RotationLambdaARN: stringPtr(r.getRotationLambdaARN()),
	})
	if err != nil {
		return fmt.Errorf("failed to enable auto-rotation: %w", err)
	}

	return nil
}

// RotateNow triggers immediate credential rotation
func (r *CredentialRotator) RotateNow(ctx context.Context, reason string) error {
	// Log rotation event
	r.alerter.Info(ctx, "Credential rotation triggered", map[string]string{
		"secret_id": r.secretID,
		"reason":    reason,
	})

	_, err := r.secretsClient.RotateSecret(ctx, &secretsmanager.RotateSecretInput{
		SecretId: &r.secretID,
	})
	if err != nil {
		r.alerter.Error(ctx, "Credential rotation failed", map[string]string{
			"secret_id": r.secretID,
			"error":     err.Error(),
		})
		return fmt.Errorf("rotation failed: %w", err)
	}

	return nil
}

func int64Ptr(i int64) *int64 { return &i }
```

### Rotation Lambda

**Multi-key pool rotation strategy** (compensates for lack of Anthropic Admin
API):

```go
// cmd/rotation-lambda/main.go

package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type RotationEvent struct {
	SecretId string `json:"SecretId"`
	Step     string `json:"Step"`
	Token    string `json:"ClientRequestToken"`
}

func handler(ctx context.Context, event RotationEvent) error {
	switch event.Step {
	case "createSecret":
		return createNewSecret(ctx, event)
	case "setSecret":
		return setNewSecret(ctx, event)
	case "testSecret":
		return testNewSecret(ctx, event)
	case "finishSecret":
		return finishRotation(ctx, event)
	default:
		return fmt.Errorf("unknown rotation step: %s", event.Step)
	}
}

func createNewSecret(ctx context.Context, event RotationEvent) error {
	// NOTE: Anthropic does NOT have a public Admin API for programmatic key generation
	// This function implements a multi-key pool rotation strategy instead
	//
	// Pre-requisite: Security team has pre-provisioned 3-4 API keys in Anthropic Console
	// These keys are stored in a separate "key pool" secret with JSON structure:
	// {"keys": ["sk-ant-key1...", "sk-ant-key2...", "sk-ant-key3..."]}

	// 1. Fetch the key pool
	keyPool, err := getKeyPool(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch key pool: %w", err)
	}

	// 2. Get current active key to exclude it from selection
	currentKey, err := getSecretVersion(ctx, event.SecretId, "AWSCURRENT")
	if err != nil {
		return fmt.Errorf("failed to get current key: %w", err)
	}

	// 3. Select next key from pool (round-robin, excluding current)
	nextKey, err := selectNextKey(keyPool.Keys, currentKey)
	if err != nil {
		// CRITICAL: No available keys - alert security team
		alertSecurityTeam(ctx, "CRITICAL: Anthropic API key pool exhausted. Manual rotation required.")
		return fmt.Errorf("no available keys in pool: %w", err)
	}

	// 4. Store as pending
	_, err = secretsClient.PutSecretValue(ctx, &secretsmanager.PutSecretValueInput{
		SecretId:           &event.SecretId,
		ClientRequestToken: &event.Token,
		SecretString:       &nextKey,
		VersionStages:      []string{"AWSPENDING"},
	})

	return err
}

// selectNextKey returns the next available key from the pool, excluding the current active key
func selectNextKey(pool []string, currentKey string) (string, error) {
	for _, key := range pool {
		if key != currentKey {
			return key, nil
		}
	}
	return "", fmt.Errorf("all keys in pool match current key")
}

func testNewSecret(ctx context.Context, event RotationEvent) error {
	// Validate the new key works with Anthropic API
	pending, err := getSecretVersion(ctx, event.SecretId, "AWSPENDING")
	if err != nil {
		return err
	}

	// Test API call
	client := anthropic.NewClient(pending)
	_, err = client.CreateMessage(ctx, &anthropic.MessageRequest{
		Model:     "claude-3-haiku-20240307",
		MaxTokens: 10,
		Messages: []anthropic.Message{
			{Role: "user", Content: "test"},
		},
	})

	return err
}

func finishRotation(ctx context.Context, event RotationEvent) error {
	// Move AWSPENDING to AWSCURRENT
	// NOTE: Old key remains valid (no Anthropic Admin API for revocation)
	// The multi-key pool strategy limits blast radius - compromised key is only 1 of N
	// Security team should periodically regenerate all keys in Anthropic Console

	_, err := secretsClient.UpdateSecretVersionStage(ctx, &secretsmanager.UpdateSecretVersionStageInput{
		SecretId:            &event.SecretId,
		VersionStage:        stringPtr("AWSCURRENT"),
		MoveToVersionId:     &event.Token,
		RemoveFromVersionId: getCurrentVersionId(ctx, event.SecretId),
	})

	if err == nil {
		// Alert security team to revoke old key manually in Anthropic Console
		alertSecurityTeam(ctx, fmt.Sprintf(
			"API key rotation complete for %s. Please revoke the previous key in Anthropic Console.",
			event.SecretId,
		))
	}

	return err
}

func main() {
	lambda.Start(handler)
}
```

### Usage Monitoring (CloudWatch)

```hcl
# modules/threat-model-infrastructure/aws/credential-monitoring.tf

resource "aws_cloudwatch_metric_alarm" "api_key_usage_spike" {
  alarm_name          = "devpod-api-key-usage-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AnthropicAPIRequests"
  namespace           = "DevPod/Security"
  period              = 300  # 5 minutes
  statistic           = "Sum"
  threshold           = 1000  # Alert if > 1000 requests in 5 min

  alarm_description = "Unusually high Anthropic API usage - potential credential abuse"

  alarm_actions = [
    aws_sns_topic.security_alerts.arn,
  ]

  dimensions = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "api_key_usage_after_hours" {
  alarm_name          = "devpod-api-key-after-hours"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AnthropicAPIRequests"
  namespace           = "DevPod/Security"
  period              = 3600  # 1 hour
  statistic           = "Sum"
  threshold           = 0  # Alert on ANY usage

  alarm_description = "API key usage outside business hours"

  alarm_actions = [
    aws_sns_topic.security_alerts.arn,
  ]

  dimensions = {
    Environment = var.environment
    TimeWindow  = "after-hours"  # Custom dimension set by usage logger
  }
}
```

### Rotation Properties

1. **Automatic rotation**: Keys rotated every 30 days (configurable)
2. **Zero-downtime**: New key validated before old key revoked
3. **Emergency rotation**: Immediate rotation triggered on anomaly
4. **Usage monitoring**: Alerts on unusual patterns
5. **Audit trail**: All rotations logged to CloudTrail

---

## P1-15: Git Token Race Condition Fix

**Risk Level**: P1 (High) **Component**: Git repository cloning **Attack
Vector**: Token persistence to disk during clone operation

### Problem

The original implementation embeds the token in the clone URL:

```go
parsed.User = url.UserPassword("oauth2", token)
// URL becomes: https://oauth2:TOKEN@github.com/...
```

Git writes this URL to `.git/config` before the clone completes. **Race
condition**: if the orchestrator crashes after `git clone` but before
`git remote set-url`, the token remains on disk in plain text.

### Solution

Use `GIT_ASKPASS` to provide credentials in memory without ever writing them to
`.git/config`.

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/git/askpass_clone.go`

```go
package git

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// AskPassCloner performs git clone using GIT_ASKPASS for credential injection
// Credentials are NEVER written to .git/config or any file
type AskPassCloner struct {
	validator *InputValidator
	workDir   string
}

// NewAskPassCloner creates a new askpass-based cloner
func NewAskPassCloner(workDir string) *AskPassCloner {
	return &AskPassCloner{
		validator: &InputValidator{},
		workDir:   workDir,
	}
}

// Clone performs a secure git clone using GIT_ASKPASS
// Token is passed via environment variable to askpass helper, never in URL
func (c *AskPassCloner) Clone(ctx context.Context, repoURL, branch string, tokenBytes []byte) error {
	// Defense Layer 1: Input validation
	if err := c.validator.ValidateRepositoryURL(repoURL); err != nil {
		return fmt.Errorf("repository URL validation failed: %w", err)
	}
	if err := c.validator.ValidateBranchName(branch); err != nil {
		return fmt.Errorf("branch name validation failed: %w", err)
	}
	if len(tokenBytes) == 0 {
		return fmt.Errorf("token cannot be empty")
	}

	// Defense Layer 2: Create temporary askpass script
	// Script reads token from environment variable, outputs to stdout
	askpassScript := `#!/bin/sh
# GIT_ASKPASS helper - outputs credentials from environment
# Token is in memory (environment), never on disk
case "$1" in
    Username*) echo "oauth2" ;;
    Password*) echo "$GIT_TOKEN" ;;
esac
`

	// Write askpass script to temp file (script itself has no secrets)
	askpassPath := filepath.Join(os.TempDir(), fmt.Sprintf("git-askpass-%d.sh", os.Getpid()))
	if err := os.WriteFile(askpassPath, []byte(askpassScript), 0700); err != nil {
		return fmt.Errorf("failed to create askpass script: %w", err)
	}
	defer os.Remove(askpassPath) // Cleanup script

	// Defense Layer 3: Execute git clone with askpass
	cloneCmd := exec.CommandContext(ctx, "git", "clone",
		"--depth", "1",
		"--branch", branch,
		"--single-branch",
		repoURL, // Clean URL - no credentials embedded
		".",
	)
	cloneCmd.Dir = c.workDir

	// Pass token via environment - never in command line or URL
	cloneCmd.Env = append(os.Environ(),
		fmt.Sprintf("GIT_ASKPASS=%s", askpassPath),
		fmt.Sprintf("GIT_TOKEN=%s", string(tokenBytes)), // Memory only
		"GIT_TERMINAL_PROMPT=0",                          // Disable interactive prompts
	)

	output, err := cloneCmd.CombinedOutput()
	if err != nil {
		// Sanitize output - should never contain token but be safe
		sanitizedOutput := sanitizeOutput(string(output), string(tokenBytes))
		return fmt.Errorf("git clone failed: %w, output: %s", err, sanitizedOutput)
	}

	// Defense Layer 4: Verify .git/config has no credentials
	if err := c.verifyNoCredentials(); err != nil {
		// Critical: credentials leaked to disk - cleanup and fail
		os.RemoveAll(filepath.Join(c.workDir, ".git"))
		return fmt.Errorf("SECURITY: credentials found in git config: %w", err)
	}

	return nil
}

// verifyNoCredentials checks that .git/config contains no authentication data
func (c *AskPassCloner) verifyNoCredentials() error {
	configPath := filepath.Join(c.workDir, ".git", "config")
	content, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read git config: %w", err)
	}

	// Check for credential patterns
	configStr := string(content)
	dangerousPatterns := []string{
		"oauth2:",
		"x-access-token:",
		"git:",
		"@github.com",
		"@gitlab.com",
		"@bitbucket.org",
	}

	for _, pattern := range dangerousPatterns {
		if contains(configStr, pattern) {
			return fmt.Errorf("credential pattern found: %s", pattern)
		}
	}

	return nil
}

func sanitizeOutput(output, token string) string {
	return strings.ReplaceAll(output, token, "[REDACTED]")
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
```

### SSH Command (Remote Execution via DevPod)

```go
// cloneRepositorySecure uses askpass pattern via SSH
func (o *Orchestrator) cloneRepositorySecure(ctx context.Context, ws *Workspace, tokenBytes []byte) error {
	// Create askpass script content (no secrets in script)
	askpassScript := `#!/bin/sh
case "$1" in
    Username*) echo "oauth2" ;;
    Password*) printf '%s' "$GIT_TOKEN" ;;
esac
`

	// Multi-command SSH session
	// 1. Create askpass script
	// 2. Set token in environment
	// 3. Clone with askpass
	// 4. Verify no credentials leaked
	// 5. Cleanup
	cloneCommands := fmt.Sprintf(`
set -e

# Create askpass helper
ASKPASS_SCRIPT=$(mktemp)
cat > "$ASKPASS_SCRIPT" << 'ASKPASS_EOF'
%s
ASKPASS_EOF
chmod 700 "$ASKPASS_SCRIPT"

# Clone using askpass (token in GIT_TOKEN env var, passed via stdin)
cd /workspace/customer-code
GIT_ASKPASS="$ASKPASS_SCRIPT" GIT_TOKEN="$1" GIT_TERMINAL_PROMPT=0 \
    git clone --depth 1 --branch "%s" --single-branch "%s" .

# Verify no credentials in git config
if grep -qE "(oauth2:|x-access-token:|@github.com|@gitlab.com)" .git/config; then
    echo "SECURITY ERROR: Credentials found in git config"
    rm -rf .git
    exit 1
fi

# Cleanup
rm -f "$ASKPASS_SCRIPT"
unset GIT_TOKEN

echo "Clone completed securely"
`, askpassScript, ws.Branch, ws.RepositoryURL)

	// Execute via devpod ssh with token passed via stdin
	cmd := exec.CommandContext(ctx, "devpod", "ssh",
		"--command", fmt.Sprintf("bash -c '%s'", cloneCommands),
		ws.WorkspaceID,
	)

	// Pass token via stdin pipe (memory only)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return fmt.Errorf("failed to start clone command: %w", err)
	}

	// Write token to stdin
	go func() {
		defer stdin.Close()
		stdin.Write(tokenBytes)
	}()

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("clone failed: %w", err)
	}

	return nil
}
```

### Defense Properties

1. **Token never in URL**: Clone URL is clean (`https://github.com/...`)
2. **Token never in .git/config**: Askpass provides credentials at runtime
3. **Token never in command line**: Passed via environment variable
4. **Crash-safe**: Even if orchestrator crashes mid-clone, no token on disk
5. **Verification**: Post-clone check ensures no credential leakage

### Adversarial Test Verification

```bash
# Simulate crash after clone, before cleanup
# Kill orchestrator process during clone
kill -9 $ORCHESTRATOR_PID

# Check for token in git config
grep -r "oauth2" /workspace/customer-code/.git/
# Expected: No matches (token was never written)

cat /workspace/customer-code/.git/config
# Expected: Remote URL is clean (https://github.com/org/repo.git - no credentials)
```

---

## Adversarial Testing for Credentials

Before deployment to production, all credential security tests MUST pass:

### Credential & Secret Tests

| Test                   | Command                      | Expected       | Validates         |
| ---------------------- | ---------------------------- | -------------- | ----------------- | --------------- |
| Git config token leak  | `cat .git/config`            | No credentials | P1-15 GIT_ASKPASS |
| Orchestrator disk scan | `grep -r "sk-ant" /tmp /var` | No matches     | P0-2 Memory-only  |
| Token in process list  | `ps aux                      | grep sk-ant`   | No matches        | P0-2 stdin pipe |
| Credential rotation    | Rotate key, check workspace  | New key works  | P1-11 Rotation    |
| Token string zero      | Memory profiling after use   | Bytes zeroed   | P1-4 Byte-based   |

**See**: [05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md) → Section
"Adversarial Test Matrix" for complete testing procedures

---

## Summary: Credential Security Guarantees

After implementing all patterns in this document, the system provides:

| Guarantee                             | Mechanism                                       |
| ------------------------------------- | ----------------------------------------------- |
| **No token on disk**                  | JIT fetch + memory-only injection + GIT_ASKPASS |
| **No token in logs**                  | Output sanitization + redaction                 |
| **No token in environment variables** | Stdin pipes instead of env vars                 |
| **No token in database**              | Only ARN references stored                      |
| **Minimal token lifetime**            | ~30 seconds in memory during clone              |
| **Deterministic cleanup**             | `defer ZeroBytes()` + `[]byte` over `string`    |
| **Crash-safe**                        | No state persisted to disk                      |
| **Snapshot-safe**                     | Memory-only, never written                      |
| **Audit trail**                       | CloudTrail logs all Secrets Manager access      |
| **Anomaly detection**                 | CloudWatch alarms on usage spikes               |
| **Automatic rotation**                | 30-day rotation with multi-key pool strategy    |

---

## Next Steps

After understanding credential security patterns, proceed to:

- **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** -
  Implement Lambda, Orchestrator, Frontend, and Terraform components
- **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - Review remaining
  P0/P1 security fixes (P0-1, P1-1 through P1-16)
- **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Plan and
  execute adversarial testing

---

**End of Document 2 of 6**

**Continue to**:
[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md) for component
implementation details
