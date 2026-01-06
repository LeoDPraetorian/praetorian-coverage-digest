---
name: integrating-with-panorama
description: Use when integrating Chariot with Palo Alto Panorama firewall management platform - provides authentication patterns, API reference, security policy synchronization, and device management workflows for comprehensive firewall integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch
---

# Integrating with Palo Alto Panorama

**Comprehensive guide for integrating Chariot attack surface management with Palo Alto Panorama centralized firewall management platform.**

## When to Use

Use this skill when:

- Integrating Chariot with Palo Alto Panorama for bi-directional security data synchronization
- Building API clients to query Panorama for firewall rules, security policies, or device configurations
- Implementing authentication and authorization for Panorama REST API or XML API access
- Correlating Chariot's discovered vulnerabilities with Panorama's firewall configurations
- Automating security posture assessment using Panorama's centralized management capabilities

## Quick Reference

| Component               | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| **Authentication**      | API keys, username/password, certificate-based auth          |
| **REST API**            | Modern JSON-based API for device management and monitoring   |
| **XML API**             | Legacy XML-based API with broader feature coverage           |
| **Device Groups**       | Hierarchical organization for multi-tenant firewall policies |
| **Template Stacks**     | Network and device configuration inheritance                 |
| **Security Policies**   | Rule-based traffic control across device groups              |
| **Address Objects**     | IP addresses, FQDNs, and network ranges for policy rules     |
| **Application Filters** | Application-based security policies (App-ID)                 |
| **Threat Prevention**   | IPS, antivirus, anti-spyware, vulnerability protection       |
| **Commit Operations**   | Push configuration changes to managed devices                |

## Architecture Overview

### Panorama Components

**For detailed architecture diagrams and component relationships, see:** [references/architecture.md](references/architecture.md)

Panorama manages firewall devices through:

1. **Device Groups**: Logical grouping of firewalls with shared security policies
2. **Template Stacks**: Network configuration templates applied to device groups
3. **Shared Objects**: Address objects, service objects, and application groups shared across device groups
4. **Log Collectors**: Centralized logging for security events and traffic analysis
5. **Management Plane**: Centralized configuration and monitoring interface

### Integration Patterns

**Chariot ↔ Panorama Integration Models:**

| Pattern                   | Use Case                                                        | Complexity |
| ------------------------- | --------------------------------------------------------------- | ---------- |
| **Read-Only Discovery**   | Query Panorama for firewall configurations to enrich asset data | Low        |
| **Bi-Directional Sync**   | Sync Chariot assets with Panorama address objects               | Medium     |
| **Policy Validation**     | Validate security policies against Chariot vulnerability data   | High       |
| **Automated Remediation** | Auto-create firewall rules based on Chariot findings            | High       |
| **Compliance Reporting**  | Audit firewall configurations for security compliance           | Medium     |

## Authentication

### API Key Authentication (Recommended)

**For complete authentication setup, error handling, and key rotation strategies, see:** [references/authentication.md](references/authentication.md)

```go
// Example: API key authentication
client := &PanoramaClient{
    BaseURL: "https://panorama.example.com",
    APIKey:  os.Getenv("PANORAMA_API_KEY"),
}

// API key is passed in X-PAN-KEY header
req.Header.Set("X-PAN-KEY", client.APIKey)
```

**Key Generation:**

1. Navigate to Panorama Web UI → Admin → API Keys
2. Generate new API key (one-time display)
3. Store securely in environment variable or secrets manager

### Username/Password Authentication

**For session management and credential rotation, see:** [references/authentication.md](references/authentication.md)

```go
// Example: Session-based authentication
session, err := client.Authenticate(username, password)
// Session key returned, use for subsequent requests
```

## API Selection: REST vs XML

### Decision Matrix

| Criteria                  | REST API    | XML API     | Recommendation                    |
| ------------------------- | ----------- | ----------- | --------------------------------- |
| **Configuration Changes** | Limited     | Full        | Use XML API for policy management |
| **Commit Operations**     | ❌ No       | ✅ Required | XML API mandatory for commits     |
| **Device Monitoring**     | Excellent   | Good        | Use REST API for real-time data   |
| **Ease of Use**           | JSON-native | XML parsing | REST API preferred                |
| **Feature Coverage**      | Subset      | Complete    | XML API for comprehensive control |
| **Performance**           | 2-3x faster | Baseline    | REST API for high-frequency calls |
| **Documentation**         | Modern      | Extensive   | Both well-documented              |

**For complete REST API endpoint catalog (all categories, schemas, code examples), see:** [references/rest-api-reference.md](references/rest-api-reference.md)

**For complete XML API operations reference (all types, XPath patterns, implementations), see:** [references/xml-api-reference.md](references/xml-api-reference.md)

**Research:** 160KB+ of comprehensive API documentation covering all REST endpoints, all XML operations, XPath patterns, code examples in Python/Go/TypeScript, error handling, and production patterns.

### REST API Example

```go
// Example: Fetch device inventory via REST API
resp, err := client.Get("/restapi/v10.0/Panorama/Devices")
var devices []Device
json.Unmarshal(resp.Body, &devices)
```

### XML API Example

```go
// Example: Fetch security policies via XML API
params := url.Values{}
params.Set("type", "config")
params.Set("action", "get")
params.Set("xpath", "/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG1']/pre-rulebase/security/rules")

resp, err := client.Get("/api/?" + params.Encode())
// Parse XML response
```

## Core API Operations

### 1. Device Management

**For complete device lifecycle workflows, health monitoring, and bulk operations, see:** [references/device-management.md](references/device-management.md)

```go
// List all managed devices
devices, err := panoramaClient.GetDevices()

// Get device details by serial number
device, err := panoramaClient.GetDevice(serialNumber)

// Check device connectivity status
status, err := panoramaClient.GetDeviceStatus(serialNumber)
```

### 2. Security Policy Queries

**For policy structure, rule prioritization, and conflict detection, see:** [references/security-policies.md](references/security-policies.md)

```go
// Get security policies for a device group
policies, err := panoramaClient.GetSecurityPolicies(deviceGroup)

// Search for rules matching specific criteria
rules, err := panoramaClient.SearchRules(SearchCriteria{
    SourceZone:      "trust",
    DestinationZone: "untrust",
    Application:     "web-browsing",
})
```

### 3. Address Object Management

**For address object CRUD operations, object groups, and dynamic address objects, see:** [references/address-objects.md](references/address-objects.md)

```go
// Create address object from Chariot asset
addressObj := &AddressObject{
    Name:        "chariot-asset-123",
    Type:        "ip-netmask",
    Value:       "192.168.1.100/32",
    Description: "Discovered by Chariot",
}
err := panoramaClient.CreateAddressObject(deviceGroup, addressObj)
```

### 4. Commit and Push Operations

**For complete commit workflows, validation, partial commits, and rollback procedures, see:** [references/commit-operations.md](references/commit-operations.md)

**Critical Understanding**: Panorama API requires a **mandatory two-step workflow** (cannot be combined like GUI):

1. **Commit to Panorama**: Validate and save configuration to management server (returns job ID)
2. **Push to Devices (Commit-All)**: Deploy validated configuration to managed firewalls (returns job ID)

**Both operations are asynchronous** - they return job IDs that must be polled for completion.

```go
// Complete commit and push workflow with job monitoring
func DeployConfiguration(client *PanoramaClient, deviceGroup string) error {
    // Step 1: Commit to Panorama
    commitResp, err := client.XMLAPICall("type=commit&cmd=<commit></commit>")
    if err != nil {
        return fmt.Errorf("commit API call failed: %w", err)
    }

    commitJobID := extractJobID(commitResp)

    // Step 2: Poll commit job until completion
    if err := pollJobCompletion(client, commitJobID, 30*time.Minute); err != nil {
        return fmt.Errorf("commit failed: %w", err)
    }

    // Step 3: Push to device group
    pushCmd := fmt.Sprintf(`<commit-all>
        <shared-policy>
            <device-group>
                <entry name="%s"/>
            </device-group>
        </shared-policy>
    </commit-all>`, deviceGroup)

    pushResp, err := client.XMLAPICall(fmt.Sprintf("type=commit&action=all&cmd=%s", url.QueryEscape(pushCmd)))
    if err != nil {
        return fmt.Errorf("push API call failed: %w", err)
    }

    pushJobID := extractJobID(pushResp)

    // Step 4: Poll push job until completion
    if err := pollJobCompletion(client, pushJobID, 30*time.Minute); err != nil {
        return fmt.Errorf("push to devices failed: %w", err)
    }

    return nil
}

// Job polling implementation
func pollJobCompletion(client *PanoramaClient, jobID string, timeout time.Duration) error {
    deadline := time.After(timeout)
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-deadline:
            return fmt.Errorf("job %s timeout after %v", jobID, timeout)
        case <-ticker.C:
            jobResp, err := client.XMLAPICall(fmt.Sprintf("type=op&cmd=<show><jobs><id>%s</id></jobs></show>", jobID))
            if err != nil {
                return fmt.Errorf("job status check failed: %w", err)
            }

            // Parse job status: PEND (pending), ACT (active), FIN (finished)
            status := extractJobStatus(jobResp)

            if status == "FIN" {
                result := extractJobResult(jobResp) // OK or FAIL
                if result == "OK" {
                    return nil
                }
                errorMsg := extractJobError(jobResp)
                return fmt.Errorf("job %s failed: %s", jobID, errorMsg)
            }
            // Continue polling if PEND or ACT
        }
    }
}

// Rollback on failure
func RollbackConfiguration(client *PanoramaClient) error {
    // Panorama auto-saves running-config.xml before each commit
    loadCmd := "<load><config><from>running-config.xml</from></config></load>"
    _, err := client.XMLAPICall(fmt.Sprintf("type=op&cmd=%s", url.QueryEscape(loadCmd)))
    if err != nil {
        return fmt.Errorf("rollback failed: %w", err)
    }

    // Must commit the rollback
    return DeployConfiguration(client, "") // Empty deviceGroup = Panorama only
}
```

## Error Handling

### Common Error Patterns

**For comprehensive error code reference, retry strategies, and debugging techniques, see:** [references/error-handling.md](references/error-handling.md)

| Error Code | Meaning                 | Handling Strategy                |
| ---------- | ----------------------- | -------------------------------- |
| 400        | Invalid request syntax  | Validate request parameters      |
| 403        | Authentication failed   | Refresh API key or session token |
| 404        | Resource not found      | Verify device group/object name  |
| 409        | Concurrent modification | Implement optimistic locking     |
| 500        | Internal server error   | Retry with exponential backoff   |

```go
// Example: Retry logic with exponential backoff
func (c *PanoramaClient) RetryableRequest(req *http.Request) (*http.Response, error) {
    maxRetries := 3
    backoff := 1 * time.Second

    for i := 0; i < maxRetries; i++ {
        resp, err := c.httpClient.Do(req)
        if err == nil && resp.StatusCode < 500 {
            return resp, nil
        }
        time.Sleep(backoff)
        backoff *= 2
    }
    return nil, errors.New("max retries exceeded")
}
```

## Rate Limiting

**Panorama API rate limits vary by deployment size and license tier.**

**For rate limit detection, backoff strategies, and quota management, see:** [references/rate-limiting.md](references/rate-limiting.md)

### Best Practices

1. **Implement exponential backoff** for 429 responses
2. **Batch operations** when possible (bulk address object creation)
3. **Cache frequently accessed data** (device inventory, static policies)
4. **Use webhooks** for event-driven updates instead of polling

## Chariot Integration Patterns

### Pattern 1: Asset Discovery Enrichment

**For complete implementation with code examples, see:** [examples/asset-discovery-enrichment.md](examples/asset-discovery-enrichment.md)

**Workflow:**

1. Chariot discovers external-facing assets (IP addresses, domains)
2. Query Panorama for existing address objects matching discovered assets
3. Enrich Chariot asset metadata with firewall policy information
4. Flag assets without firewall protection for remediation

### Pattern 2: Automated Address Object Sync

**For complete implementation with code examples, see:** [examples/automated-address-sync.md](examples/automated-address-sync.md)

**Workflow:**

1. Chariot discovers new asset
2. Create corresponding address object in Panorama
3. Associate with appropriate device group based on asset classification
4. Trigger commit and push operations
5. Update Chariot with Panorama object ID for bi-directional linking

### Pattern 3: Security Policy Validation

**For complete implementation with code examples, see:** [examples/security-policy-validation.md](examples/security-policy-validation.md)

**Workflow:**

1. Chariot identifies vulnerability on asset
2. Query Panorama for security policies affecting the asset
3. Validate if existing policies adequately protect against the vulnerability
4. Generate remediation recommendations (policy updates, IPS signatures)
5. Optionally auto-create remediation policies

## Testing Strategies

**For unit testing, integration testing, and E2E testing patterns, see:** [references/testing.md](references/testing.md)

### Mock Panorama Responses

```go
// Example: Mock Panorama client for unit testing
type MockPanoramaClient struct {
    Devices         []Device
    SecurityPolicies []SecurityPolicy
}

func (m *MockPanoramaClient) GetDevices() ([]Device, error) {
    return m.Devices, nil
}
```

### Integration Testing

Use Panorama's sandbox environment or lab instance for safe integration testing:

```bash
# Set environment variables for test environment
export PANORAMA_BASE_URL="https://panorama-lab.example.com"
export PANORAMA_API_KEY="test-api-key-12345"

# Run integration tests
go test ./integrations/panorama -tags=integration
```

## Security Considerations

**For comprehensive security hardening, credential management, and audit logging, see:** [references/security.md](references/security.md)

1. **Never log API keys** in application logs or error messages
2. **Use least-privilege API keys** with minimal required permissions
3. **Rotate API keys regularly** (recommend 90-day rotation)
4. **Validate SSL certificates** for Panorama API connections
5. **Implement request signing** for sensitive operations (commit, push)
6. **Audit all configuration changes** made through the integration

## Performance Optimization

**For caching strategies, bulk operations, and query optimization, see:** [references/performance.md](references/performance.md)

### Caching Strategy

```go
// Example: Cache device inventory with TTL
type DeviceCache struct {
    devices   []Device
    expiresAt time.Time
    ttl       time.Duration
}

func (c *DeviceCache) Get() ([]Device, bool) {
    if time.Now().After(c.expiresAt) {
        return nil, false
    }
    return c.devices, true
}
```

### Bulk Operations

```go
// Example: Batch address object creation
func (c *PanoramaClient) BulkCreateAddressObjects(deviceGroup string, objects []*AddressObject) error {
    // Create multi-config XML payload
    payload := buildBatchPayload(objects)

    // Single API call for multiple objects
    return c.SetConfig(deviceGroup, payload)
}
```

## Compliance and Auditing

**For compliance frameworks, audit log parsing, and reporting templates, see:** [references/compliance.md](references/compliance.md)

Track all integration activities for compliance reporting:

1. **Log all API calls** with timestamps, user context, and results
2. **Maintain change history** for address objects and policies
3. **Generate audit reports** for security review and compliance validation
4. **Implement approval workflows** for high-risk operations (policy modifications)

## Troubleshooting

**For detailed troubleshooting guides, common issues, and diagnostic tools, see:** [references/troubleshooting.md](references/troubleshooting.md)

### Common Issues

| Issue                      | Diagnosis                                  | Solution                                 |
| -------------------------- | ------------------------------------------ | ---------------------------------------- |
| Authentication failures    | Invalid API key or expired session         | Regenerate API key, verify permissions   |
| Slow API responses         | Large policy rulebase or device count      | Implement pagination, use caching        |
| Commit failures            | Configuration validation errors            | Review error details, fix invalid config |
| Device connectivity issues | Network connectivity or certificate errors | Verify network paths, update certs       |
| Rate limit exceeded        | Too many API calls in short time window    | Implement backoff, reduce call frequency |

## Related Skills

| Skill                               | Purpose                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| **integrating-with-github**         | GitHub integration patterns applicable to webhook-based sync |
| **implementing-graphql-clients**    | REST API client patterns for Panorama REST API               |
| **burp-integration**                | Generic API extraction patterns useful for Panorama XML API  |
| **implementing-retry-with-backoff** | Retry logic for Panorama rate limiting                       |
| **sanitizing-inputs-securely**      | Input validation for user-provided device group names        |

## References

For detailed documentation on specific topics:

- [Authentication and Authorization](references/authentication.md)
- [API Reference (REST and XML)](references/api-reference.md)
- [Architecture and Components](references/architecture.md)
- [Device Management](references/device-management.md)
- [Security Policies](references/security-policies.md)
- [Address Objects](references/address-objects.md)
- [Commit Operations](references/commit-operations.md)
- [Error Handling](references/error-handling.md)
- [Rate Limiting](references/rate-limiting.md)
- [Testing Strategies](references/testing.md)
- [Security Best Practices](references/security.md)
- [Performance Optimization](references/performance.md)
- [Compliance and Auditing](references/compliance.md)
- [Troubleshooting Guide](references/troubleshooting.md)

## Examples

For complete implementation examples:

- [Asset Discovery Enrichment](examples/asset-discovery-enrichment.md)
- [Automated Address Object Sync](examples/automated-address-sync.md)
- [Security Policy Validation](examples/security-policy-validation.md)
