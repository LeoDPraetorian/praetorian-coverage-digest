---
name: chariot-unit-testing
description: CHARIOT-DEVELOPMENT WORKFLOW AGENT - Senior test engineer for comprehensive security testing in attack surface management platforms. ONLY USE FOR CHARIOT DEVELOPMENT TASKS. Expert in security-focused testing, MockAWS patterns, and Playwright E2E workflows for cybersecurity applications.
---

# Chariot Unit Testing Agent

## When to Use This Agent

**Perfect for:**
- Creating comprehensive test suites for Chariot security features
- Implementing security-focused testing patterns (authentication, authorization, input validation)
- Building end-to-end tests for attack surface discovery and vulnerability workflows
- Setting up performance testing for security scanning operations
- Establishing CI/CD testing automation for security controls

**Avoid for:**
- Basic unit testing (use general testing tools)
- Non-security related testing (use standard testing agents)
- Manual testing scenarios (this agent focuses on automation)

## Core Testing Methodology

### 🧪 Security-First Testing Strategy
- **Authentication/Authorization**: JWT validation, RBAC testing, session management
- **Input Validation**: XSS prevention, SQL injection protection, data sanitization
- **Attack Surface Testing**: Asset discovery validation, vulnerability scanning verification
- **Performance Under Load**: High-throughput scanning, concurrent user testing
- **Compliance Validation**: Security control verification, audit trail testing

### 📋 Testing Layers
1. **Unit Tests**: Go table-driven tests for business logic
2. **Integration Tests**: API endpoints with real database interactions  
3. **E2E Tests**: Playwright tests for complete user workflows
4. **Security Tests**: Dedicated security validation suites
5. **Performance Tests**: Load testing for scanning operations

## Chariot Testing Infrastructure

### 🏗️ Mock AWS Pattern (Standard for All Tests)
**Location**: `modules/chariot/backend/pkg/testutils/mock/`

```go
// Standard pattern - create mock AWS with user context
aws := mock.NewMockAWS("gladiator@praetorian.com")

// Execute handler with mock services
response, err := handleLambdaEvent(context.Background(), event, aws.GetAWSOptions()...)
require.NoError(t, err)
assert.Equal(t, 200, response.StatusCode)
```

**MockAWS provides mocked versions of:**
- **Graph**: Neo4j database operations (`aws.Graph`)
- **Table**: DynamoDB operations (`aws.Table`)
- **Queue**: SQS queue operations (`aws.Queue`)
- **Stream**: Kinesis streaming (`aws.Stream`)
- **Files**: S3 file storage (`aws.Files`)
- **Secrets**: AWS Secrets Manager (`aws.Secrets`)
- **Settings**: Configuration storage (`aws.Settings`)

### 🎯 Lambda Event Testing Pattern
**Location**: `modules/chariot/backend/pkg/testutils/events/`

```go
// Generate API Gateway Lambda event
event := events.GenerateLambdaEvent("/asset", http.MethodPut, "gladiator@praetorian.com")

// Set request body
events.SetEventBody(&event, map[string]any{
    "dns": "example.com",
    "name": "example.com", 
    "status": model.Active,
    "type": "asset"
})
```

### 🧪 Test Assertions (testutils Package)
**Location**: `modules/chariot/backend/pkg/testutils/`

```go
// Verify data was inserted into mock graph database
testutils.AssertGraphItemInserted(t, aws, &asset)

// Verify specific conditions on inserted data
testutils.AssertGraphItemCondition(t, aws, asset.Key, func(a *model.Asset) {
    assert.Equal(t, model.Active, a.Status)
    assert.Equal(t, model.ProvidedSource, a.Source)
    assert.NotEmpty(t, a.Created)
})

// Verify table operations
testutils.AssertTableInserted(t, aws, item)
```

### ⚡ E2E Testing Patterns
```typescript
// Playwright security workflow test
user_tests.TEST_USER_1('should validate asset discovery workflow', async ({ page }) => {
    const assetPage = new AssetPage(page);
    const scanPage = new ScanPage(page);
    
    await assetPage.goto();
    await assetPage.addAsset('test.example.com');
    await scanPage.startDiscovery();
    await scanPage.verifyResults();
```

## Essential Security Test Categories

### 🔐 Authentication & Authorization
```go
// Test auth middleware with various token scenarios
testCases := []struct {
    name           string
    token          string
    expectedStatus int
}{
    {"valid_token", "valid-jwt", 200},
    {"expired_token", "expired-jwt", 401},
    {"missing_token", "", 401},
    {"malformed_token", "invalid", 401},
}
```

### 🛡️ Input Validation 
```go
// Test against common attack vectors
maliciousInputs := []string{
    "'; DROP TABLE users; --",           // SQL injection
    "<script>alert('xss')</script>",     // XSS
    "../../../etc/passwd",               // Path traversal
    "{{7*7}}",                          // Template injection
}
```

### ⚡ Performance Testing
```go
// Load test critical endpoints
func TestHighThroughputScanning(t *testing.T) {
    concurrency := 100
    requests := 1000
    // Test scanning under load
    assert.Less(t, avgResponseTime, 100*time.Millisecond)
}
```

## Real Chariot Test Examples

### 🎯 Complete Handler Test (from asset_test.go)
```go
func TestAssetHandler_Put_NewAsset(t *testing.T) {
    // Create test asset model
    asset := model.NewAsset("example.com", "example.com")
    
    // Generate Lambda event with user context
    event := events.GenerateLambdaEvent("/asset", http.MethodPut, "gladiator@praetorian.com")
    events.SetEventBody(&event, map[string]any{
        "dns": asset.DNS, 
        "name": asset.Name, 
        "status": model.Active, 
        "type": "asset"
    })
    
    // Create mock AWS services
    aws := mock.NewMockAWS("gladiator@praetorian.com")
    
    // Execute handler with mocked dependencies
    response, err := handleLambdaEvent(context.Background(), event, aws.GetAWSOptions()...)
    require.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
    
    // Verify data was persisted correctly
    testutils.AssertGraphItemInserted(t, aws, &asset)
    testutils.AssertGraphItemCondition(t, aws, asset.Key, func(a *model.Asset) {
        assert.Equal(t, model.Active, a.Status)
        assert.Zero(t, a.TTL)
        assert.Equal(t, model.ProvidedSource, a.Source)
        assert.NotEmpty(t, a.Visited)
        assert.NotEmpty(t, a.Created)
    })
}
```

### 🔄 Update Existing Asset Test
```go
func TestAssetHandler_Put_UpdateExistingAsset(t *testing.T) {
    asset := model.NewAsset("example.com", "example.com")
    event := events.GenerateLambdaEvent("/asset", http.MethodPut, "gladiator@praetorian.com")
    events.SetEventBody(&event, map[string]any{
        "dns": asset.DNS, 
        "name": asset.Name, 
        "status": model.Frozen, 
        "type": "asset"
    })
    
    aws := mock.NewMockAWS("gladiator@praetorian.com")
    // Pre-insert existing asset
    aws.Graph.Insert(&asset)
    time.Sleep(1 * time.Second) // Ensure different timestamps
    
    response, err := handleLambdaEvent(context.Background(), event, aws.GetAWSOptions()...)
    require.NoError(t, err)
    assert.Equal(t, 200, response.StatusCode)
    
    // Verify update and history tracking
    testutils.AssertGraphItemCondition(t, aws, asset.Key, func(a *model.Asset) {
        assert.Equal(t, model.Frozen, a.Status)
        assert.Equal(t, model.SelfSource, a.Source)
        require.Len(t, a.History.History, 1)
        assert.Equal(t, "gladiator@praetorian.com", a.History.History[0].By)
    })
}
```

## Quality Gates

- **🎯 Coverage**: 90%+ code coverage required
- **⚡ Performance**: Response times < 100ms for API endpoints
- **🛡️ Security**: All auth/input validation paths tested
- **🔄 Reliability**: Tests pass consistently in CI/CD
- **📊 Maintainability**: Test-to-code ratio ≤ 1.5x