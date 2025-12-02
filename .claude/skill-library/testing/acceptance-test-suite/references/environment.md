# Environment Setup and Test Execution

This document covers environment configuration, test execution, and CI/CD integration for the Chariot acceptance test suite.

## Required Environment Variables

### Create `.env-acceptance` File

Location: `modules/chariot/acceptance/pkg/lib/env/.env-acceptance`

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Chariot API Configuration
API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_USER_POOL_ID=us-east-1_youruserid

# Compute Mode (for compute tests)
CHARIOT_MOCK_MODE=on

# Optional: HTTP Proxy for debugging (e.g., Burp Suite)
# HTTP_PROXY=http://localhost:8080
```

### Environment Variable Descriptions

| Variable | Purpose | Required For |
|----------|---------|--------------|
| `AWS_REGION` | AWS region for all services | All tests |
| `AWS_ACCESS_KEY_ID` | AWS credentials | All tests |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | All tests |
| `API_URL` | Chariot API Gateway endpoint | All tests |
| `COGNITO_CLIENT_ID` | User authentication client | All tests |
| `COGNITO_USER_POOL_ID` | User pool for test accounts | All tests |
| `CHARIOT_MOCK_MODE` | Enable mocked capability outputs | Compute tests |
| `HTTP_PROXY` | Proxy for request debugging | Optional |

---

## Test Execution Methods

### Method 1: CI/CD Script (Recommended)

**Script**: `scripts/run-acceptance-tests.sh`

```bash
# Full test suite (unit → API → compute)
./scripts/run-acceptance-tests.sh

# With verbose output
./scripts/run-acceptance-tests.sh -v

# Skip specific test categories
./scripts/run-acceptance-tests.sh --skip-unit
./scripts/run-acceptance-tests.sh --skip-api
./scripts/run-acceptance-tests.sh --skip-compute

# Run only compute tests
./scripts/run-acceptance-tests.sh --skip-unit --skip-api
```

**What the script does:**
1. Verifies `.env-acceptance` exists
2. Copies `.env` files from backend to acceptance test locations
3. Enables `CHARIOT_MOCK_MODE=on` for compute tests
4. Runs tests in order:
   - Unit tests: `go test ./pkg/...`
   - API tests: `go test ./tests/api/...` (parallel)
   - Compute tests: `go test ./tests/compute/...` (sequential)

### Method 2: Direct Go Test Execution

```bash
# Navigate to acceptance directory
cd modules/chariot/acceptance

# Run all tests
go test ./... -v -parallel 10

# Run specific package
go test ./tests/api/assets -v
go test ./tests/api/seeds -v
go test ./tests/compute -v

# Run single test function
go test ./tests/api/assets -run Test_AddAsset -v

# With custom timeout (default may be too short for compute)
go test ./... -v -timeout 30m

# With race detection
go test ./... -v -race

# With coverage
go test ./... -v -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Method 3: Debugging with Proxy

**Use case**: Capture HTTP traffic for debugging API calls

```bash
# Start proxy (e.g., Burp Suite on localhost:8080)
# Then run tests with HTTP_PROXY

HTTP_PROXY=http://localhost:8080 go test ./tests/api/assets -run Test_AddAsset -v
```

**What gets captured:**
- API Gateway requests
- Cognito authentication
- DynamoDB queries (via API)
- S3 presigned URL requests

---

## Test Execution Order

The CI/CD script enforces this execution order:

1. **Unit Tests** (`go test ./pkg/...`)
   - Fast package-level tests
   - No AWS service dependencies
   - Parallel execution

2. **API Tests** (`go test ./tests/api/...`)
   - Integration tests for API endpoints
   - Parallel execution with `t.Parallel()`
   - Each test gets isolated user + data

3. **Compute Tests** (`go test ./tests/compute/...`)
   - Sequential execution (shared worker pool)
   - Validates capability execution
   - Mock mode enabled

**Why this order:**
- Fast feedback (unit tests first)
- API tests can run concurrently
- Compute tests require sequential execution

---

## Directory Structure

```
modules/chariot/acceptance/
├── tests/
│   ├── api/              # API endpoint integration tests
│   │   ├── accounts/     # User/member/integration management
│   │   ├── assets/       # Asset CRUD operations
│   │   ├── seeds/        # Seed CRUD operations
│   │   ├── risks/        # Risk management
│   │   ├── files/        # File upload/download
│   │   ├── jobs/         # Job creation/queuing
│   │   └── export/       # Data export endpoints
│   ├── compute/          # Security capability execution tests
│   │   ├── compute_test.go      # Main capability test suite
│   │   ├── setup.go             # Worker setup and seed initialization
│   │   └── assertions/          # Capability validation helpers
│   └── lambda/           # Lambda function-specific tests
├── pkg/
│   ├── ops/              # TestHelper and operations (see acceptance-test-operations skill)
│   ├── assertors/        # Validation helpers (see acceptance-test-assertors skill)
│   ├── data/             # Test data generators
│   ├── lib/
│   │   ├── env/          # Environment configuration
│   │   │   └── .env-acceptance  # Configuration file
│   │   ├── job/          # Job key generation
│   │   └── compute/      # Mock capability execution
│   └── ...
└── scripts/
    └── run-acceptance-tests.sh   # CI/CD test runner
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Acceptance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  acceptance:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.24.6'

      - name: Create .env-acceptance
        run: |
          cat > modules/chariot/acceptance/pkg/lib/env/.env-acceptance << EOF
          AWS_REGION=${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}
          API_URL=${{ secrets.API_URL }}
          COGNITO_CLIENT_ID=${{ secrets.COGNITO_CLIENT_ID }}
          COGNITO_USER_POOL_ID=${{ secrets.COGNITO_USER_POOL_ID }}
          CHARIOT_MOCK_MODE=on
          EOF

      - name: Run Acceptance Tests
        run: |
          cd modules/chariot/acceptance
          ../../scripts/run-acceptance-tests.sh -v

      - name: Upload Coverage
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: modules/chariot/acceptance/coverage.out
```

### Required GitHub Secrets

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `API_URL`
- `COGNITO_CLIENT_ID`
- `COGNITO_USER_POOL_ID`

---

## Test Execution Examples

### Running Specific Test Categories

```bash
# API tests only (parallel)
go test ./tests/api/... -v -parallel 10

# Compute tests only (sequential)
go test ./tests/compute/... -v

# Lambda tests only
go test ./tests/lambda/... -v
```

### Running Specific Test Files

```bash
# Single test file
go test ./tests/api/assets/add_test.go -v

# All tests in directory
go test ./tests/api/assets/*.go -v
```

### Running with Filters

```bash
# Run tests matching pattern
go test ./tests/api/... -run Test_Add -v        # All Add* tests
go test ./tests/api/... -run Test_.*Asset -v    # All Asset tests
go test ./tests/api/... -run Test_AddAsset/add_domain -v  # Specific subtest
```

### Performance and Resource Monitoring

```bash
# With CPU profiling
go test ./tests/api/... -cpuprofile=cpu.prof -v
go tool pprof cpu.prof

# With memory profiling
go test ./tests/api/... -memprofile=mem.prof -v
go tool pprof mem.prof

# With execution tracing
go test ./tests/api/... -trace=trace.out -v
go tool trace trace.out
```

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "401 Unauthorized"
**Solution**: Check Cognito credentials in `.env-acceptance`

**Issue**: Tests timeout
**Solution**: Increase timeout: `go test ... -timeout 30m`

**Issue**: Compute tests fail
**Solution**: Ensure `CHARIOT_MOCK_MODE=on` in environment

**Issue**: Jobs not appearing in queue
**Solution**: Check SQS permissions and queue URLs

**Issue**: DynamoDB permission errors
**Solution**: Verify IAM role has table access permissions

### Debug Mode

```bash
# Enable verbose logging
CHARIOT_DEBUG=true go test ./tests/api/assets -v

# With HTTP proxy capture
HTTP_PROXY=http://localhost:8080 go test ./tests/api/assets -v

# With Go race detector
go test ./tests/api/... -race -v
```

### Cleanup Failed Tests

```bash
# If tests leave orphaned resources:
# 1. Delete test users from Cognito (username pattern: test-*)
# 2. Clear SQS queues
# 3. Clean DynamoDB test data
```

---

## Local Development Workflow

### Initial Setup

```bash
# 1. Clone repository with submodules
git clone --recurse-submodules https://github.com/praetorian-inc/chariot-development-platform.git
cd chariot-development-platform

# 2. Deploy Chariot stack
make chariot

# 3. Create .env-acceptance
cd modules/chariot/acceptance/pkg/lib/env
cp .env-acceptance.example .env-acceptance
# Edit with your AWS credentials

# 4. Run tests
cd ../../..
./scripts/run-acceptance-tests.sh -v
```

### Development Cycle

```bash
# 1. Write new test
vim tests/api/assets/new_test.go

# 2. Run test in isolation
go test ./tests/api/assets -run Test_NewFeature -v

# 3. Fix issues and rerun
go test ./tests/api/assets -run Test_NewFeature -v

# 4. Run full suite before commit
./scripts/run-acceptance-tests.sh
```

---

## Performance Optimization

### Parallel Execution Tuning

```bash
# Default parallelism (GOMAXPROCS)
go test ./tests/api/... -v

# Custom parallelism
go test ./tests/api/... -v -parallel 20

# Sequential execution (debugging)
go test ./tests/api/... -v -parallel 1
```

### Test Selection for Speed

```bash
# Fast iteration: Run only changed package
go test ./tests/api/assets -v

# Medium iteration: Run affected packages
go test ./tests/api/assets ./tests/api/seeds -v

# Full suite: Run everything (CI/CD)
./scripts/run-acceptance-tests.sh
```

---

## Summary

**Environment Setup:**
- Create `.env-acceptance` with AWS and Chariot credentials
- Enable `CHARIOT_MOCK_MODE=on` for compute tests
- Optional: Configure HTTP proxy for debugging

**Execution Methods:**
1. **CI/CD Script** - `./scripts/run-acceptance-tests.sh` (recommended)
2. **Direct Go Test** - `go test ./... -v`
3. **Filtered Execution** - `go test ./tests/api/assets -run Test_AddAsset -v`

**Test Order:**
1. Unit tests (fast, no AWS)
2. API tests (parallel)
3. Compute tests (sequential)

**Troubleshooting:**
- Check `.env-acceptance` for credentials
- Increase timeout for long-running tests
- Use HTTP proxy for request debugging
- Enable race detector for concurrency issues
