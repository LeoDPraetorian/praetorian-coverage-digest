# Testing Strategy

**Comprehensive testing strategy for Chariot backend integrations with race detection and coverage requirements.**

---

## Testing Philosophy

**Goal**: Catch P0 violations (VMFilter, CheckAffiliation, errgroup races, pagination loops) BEFORE code review.

**Approach**:

1. **Unit tests** for integration logic (no external API calls)
2. **Race detection** for concurrency bugs
3. **Coverage targets** (minimum 80%)
4. **Mock external APIs** (deterministic tests)

---

## Test Coverage Requirements

### Minimum Coverage: 80%

```bash
go test -cover ./modules/chariot/backend/pkg/tasks/integrations/

# Expected output:
# ok      github.com/praetorian-inc/chariot/backend/pkg/tasks/integrations    2.451s  coverage: 84.2% of statements
```

**If coverage <80%**: Add tests for uncovered code paths before PR submission.

---

## Required Test Cases

### 1. ValidateCredentials Tests

**Purpose**: Verify credential validation prevents processing with invalid credentials.

```go
func TestValidateCredentials_Success(t *testing.T) {
    // Mock API client returning success
    mockClient := &MockShodanClient{
        GetInfoFunc: func() (*Info, error) {
            return &Info{Username: "test"}, nil
        },
    }

    task := &ShodanTask{client: mockClient}
    err := task.ValidateCredentials()
    assert.NoError(t, err)
}

func TestValidateCredentials_InvalidAPIKey(t *testing.T) {
    // Mock API client returning 401 Unauthorized
    mockClient := &MockShodanClient{
        GetInfoFunc: func() (*Info, error) {
            return nil, &APIError{StatusCode: 401}
        },
    }

    task := &ShodanTask{client: mockClient}
    err := task.ValidateCredentials()
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "invalid credentials")
}
```

**Coverage**: Success case, invalid API key, network error, timeout

### 2. CheckAffiliation Tests

**Purpose**: Verify asset ownership verification queries external API correctly.

```go
func TestCheckAffiliation_Affiliated(t *testing.T) {
    mockClient := &MockShodanClient{
        GetHostFunc: func(ip string) (*Host, error) {
            return &Host{IP: ip, Data: []Service{{Port: 443}}}, nil
        },
    }

    task := &ShodanTask{client: mockClient}
    asset := model.Asset{Key: "1.2.3.4", DNS: "example.com"}

    affiliated, err := task.CheckAffiliation(asset)
    assert.NoError(t, err)
    assert.True(t, affiliated)
}

func TestCheckAffiliation_NotAffiliated(t *testing.T) {
    mockClient := &MockShodanClient{
        GetHostFunc: func(ip string) (*Host, error) {
            return nil, &APIError{StatusCode: 404} // Host not found
        },
    }

    task := &ShodanTask{client: mockClient}
    asset := model.Asset{Key: "1.2.3.4", DNS: "example.com"}

    affiliated, err := task.CheckAffiliation(asset)
    assert.NoError(t, err)
    assert.False(t, affiliated)
}

func TestCheckAffiliation_APIError(t *testing.T) {
    mockClient := &MockShodanClient{
        GetHostFunc: func(ip string) (*Host, error) {
            return nil, fmt.Errorf("API unreachable")
        },
    }

    task := &ShodanTask{client: mockClient}
    asset := model.Asset{Key: "1.2.3.4", DNS: "example.com"}

    affiliated, err := task.CheckAffiliation(asset)
    assert.Error(t, err)
    assert.False(t, affiliated)
}
```

**Coverage**: Affiliated, not affiliated (404), API error, timeout

### 3. VMFilter Tests

**Purpose**: Verify VMFilter is applied to all Asset/Risk emissions.

```go
func TestVMFilter_AppliedToAssets(t *testing.T) {
    // Mock job.Send() to capture emitted assets
    var emittedAssets []model.Asset
    mockJob := &model.Job{
        Username: "test-user",
        SendFunc: func(asset *model.Asset) {
            emittedAssets = append(emittedAssets, *asset)
        },
    }

    task := &ShodanTask{
        Job:    *mockJob,
        Filter: filter.NewVMFilter(mockJob.Username),
    }

    // Emit asset
    asset := model.Asset{Key: "1.2.3.4", DNS: "example.com"}
    task.Filter.Asset(&asset)
    task.Job.Send(&asset)

    // Verify asset was filtered and emitted
    require.Len(t, emittedAssets, 1)
    assert.Equal(t, "test-user", emittedAssets[0].Username)
}

func TestVMFilter_NotSkipped(t *testing.T) {
    // Verify Filter.Asset() is called before Job.Send()
    // This test uses instrumentation to detect ordering violations

    callOrder := []string{}

    mockFilter := &MockVMFilter{
        AssetFunc: func(asset *model.Asset) {
            callOrder = append(callOrder, "Filter.Asset")
        },
    }

    mockJob := &model.Job{
        SendFunc: func(asset *model.Asset) {
            callOrder = append(callOrder, "Job.Send")
        },
    }

    task := &ShodanTask{Job: *mockJob, Filter: mockFilter}

    asset := model.Asset{Key: "1.2.3.4"}
    task.Filter.Asset(&asset)
    task.Job.Send(&asset)

    // Verify Filter.Asset called BEFORE Job.Send
    assert.Equal(t, []string{"Filter.Asset", "Job.Send"}, callOrder)
}
```

**Coverage**: VMFilter applied to assets, VMFilter applied to risks, VMFilter not skipped

### 4. Pagination Safety Tests

**Purpose**: Verify pagination loops terminate at maxPages limit.

```go
func TestPagination_TerminatesAtMaxPages(t *testing.T) {
    const maxPages = 10

    // Mock API that always returns nextToken (buggy API)
    callCount := 0
    mockClient := &MockShodanClient{
        SearchFunc: func(query string, page int) (*SearchResult, error) {
            callCount++
            return &SearchResult{
                Total:     1000,
                Matches:   []Host{{IP: "1.2.3.4"}},
                NextToken: "always-has-more", // Buggy API
            }, nil
        },
    }

    task := &ShodanTask{client: mockClient}
    err := task.enumerateAssets(context.Background())

    assert.NoError(t, err)
    assert.Equal(t, maxPages, callCount, "should stop at maxPages")
}

func TestPagination_TerminatesOnEmptyResponse(t *testing.T) {
    mockClient := &MockShodanClient{
        SearchFunc: func(query string, page int) (*SearchResult, error) {
            if page == 0 {
                return &SearchResult{
                    Total:     10,
                    Matches:   []Host{{IP: "1.2.3.4"}},
                    NextToken: "page2",
                }, nil
            }
            // Second page is empty
            return &SearchResult{
                Total:     10,
                Matches:   []Host{},
                NextToken: "",
            }, nil
        },
    }

    task := &ShodanTask{client: mockClient}
    err := task.enumerateAssets(context.Background())
    assert.NoError(t, err)
}
```

**Coverage**: maxPages termination, empty response termination, no nextToken termination

### 5. errgroup Race Detection Tests

**Purpose**: Detect race conditions in concurrent processing.

**Run with `-race` flag**:

```bash
go test -race ./modules/chariot/backend/pkg/tasks/integrations/
```

**Test concurrent processing**:

```go
func TestConcurrentProcessing_NoRaceCondition(t *testing.T) {
    mockClient := &MockShodanClient{
        GetHostFunc: func(ip string) (*Host, error) {
            // Simulate network delay
            time.Sleep(10 * time.Millisecond)
            return &Host{IP: ip}, nil
        },
    }

    task := &ShodanTask{client: mockClient}

    // Process 100 IPs concurrently
    ips := make([]string, 100)
    for i := 0; i < 100; i++ {
        ips[i] = fmt.Sprintf("1.2.3.%d", i)
    }

    g, ctx := errgroup.WithContext(context.Background())
    g.SetLimit(10) // REQUIRED

    for _, ip := range ips {
        ip := ip // REQUIRED - capture loop variable
        g.Go(func() error {
            _, err := mockClient.GetHost(ip)
            return err
        })
    }

    err := g.Wait()
    assert.NoError(t, err)
}
```

**If race detected**:

```
WARNING: DATA RACE
Write at 0x00c0001a2000 by goroutine 8:
  integration_test.go:45 +0x123

Previous read at 0x00c0001a2000 by goroutine 7:
  integration_test.go:45 +0x98
```

**Fix**: Capture loop variable (`ip := ip`) and use `g.SetLimit()`

### 6. Error Propagation Tests

**Purpose**: Verify errors are propagated (not silently swallowed).

```go
func TestErrorPropagation_NoSilentFailures(t *testing.T) {
    // Mock API that returns error for specific IP
    mockClient := &MockShodanClient{
        GetHostFunc: func(ip string) (*Host, error) {
            if ip == "1.2.3.100" {
                return nil, fmt.Errorf("rate limit exceeded")
            }
            return &Host{IP: ip}, nil
        },
    }

    task := &ShodanTask{client: mockClient}

    ips := []string{"1.2.3.1", "1.2.3.100", "1.2.3.2"}

    g, ctx := errgroup.WithContext(context.Background())
    g.SetLimit(10)

    for _, ip := range ips {
        ip := ip
        g.Go(func() error {
            _, err := mockClient.GetHost(ip)
            if err != nil {
                // REQUIRED: propagate error, don't return nil
                return fmt.Errorf("fetching host %s: %w", ip, err)
            }
            return nil
        })
    }

    err := g.Wait()
    assert.Error(t, err, "should propagate error from goroutine")
    assert.Contains(t, err.Error(), "rate limit exceeded")
}
```

**Coverage**: Single goroutine error, multiple goroutine errors, all succeed

---

## Mock Patterns

### HTTP Client Mocking

```go
type MockShodanClient struct {
    GetHostFunc   func(ip string) (*Host, error)
    SearchFunc    func(query string, page int) (*SearchResult, error)
    GetInfoFunc   func() (*Info, error)
}

func (m *MockShodanClient) GetHost(ip string) (*Host, error) {
    if m.GetHostFunc != nil {
        return m.GetHostFunc(ip)
    }
    return nil, fmt.Errorf("GetHost not mocked")
}
```

**Benefits**:

- No network calls (fast tests)
- Deterministic responses (no flakiness)
- Error injection (test error paths)

### Table-Driven Tests

```go
func TestCheckAffiliation(t *testing.T) {
    tests := []struct {
        name          string
        mockResponse  *Host
        mockError     error
        expectedAffil bool
        expectedError bool
    }{
        {
            name:          "affiliated",
            mockResponse:  &Host{IP: "1.2.3.4"},
            expectedAffil: true,
        },
        {
            name:          "not found",
            mockError:     &APIError{StatusCode: 404},
            expectedAffil: false,
        },
        {
            name:          "API error",
            mockError:     fmt.Errorf("timeout"),
            expectedAffil: false,
            expectedError: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockClient := &MockShodanClient{
                GetHostFunc: func(ip string) (*Host, error) {
                    return tt.mockResponse, tt.mockError
                },
            }

            task := &ShodanTask{client: mockClient}
            asset := model.Asset{Key: "1.2.3.4"}

            affil, err := task.CheckAffiliation(asset)

            assert.Equal(t, tt.expectedAffil, affil)
            if tt.expectedError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

---

## Test Execution

### Run All Tests

```bash
cd modules/chariot/backend
go test ./pkg/tasks/integrations/...
```

### Run with Race Detection (REQUIRED)

```bash
go test -race ./pkg/tasks/integrations/...
```

### Run with Coverage

```bash
go test -cover ./pkg/tasks/integrations/...
```

### Run Specific Test

```bash
go test -run TestCheckAffiliation ./pkg/tasks/integrations/...
```

### Verbose Output

```bash
go test -v ./pkg/tasks/integrations/...
```

---

## CI/CD Integration

**GitHub Actions workflow** (example):

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.24"

      - name: Run tests with race detection
        run: go test -race -cover ./modules/chariot/backend/pkg/tasks/integrations/...

      - name: Verify coverage >80%
        run: |
          coverage=$(go test -cover ./pkg/tasks/integrations/... | grep -oP '\d+\.\d+(?=%)')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80%"
            exit 1
          fi
```

---

## Checklist

Before submitting PR:

- [ ] ValidateCredentials tests (success, invalid key, network error)
- [ ] CheckAffiliation tests (affiliated, not affiliated, API error)
- [ ] VMFilter tests (applied to assets, applied to risks, not skipped)
- [ ] Pagination safety tests (maxPages termination, empty response)
- [ ] errgroup race detection tests (100+ concurrent operations)
- [ ] Error propagation tests (no silent failures)
- [ ] All tests pass: `go test ./pkg/tasks/integrations/...`
- [ ] Race detection passes: `go test -race ./pkg/tasks/integrations/...`
- [ ] Coverage >80%: `go test -cover ./pkg/tasks/integrations/...`

**ALL items must be checked before PR approval.**
