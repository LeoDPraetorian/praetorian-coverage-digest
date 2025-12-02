# Integration Testing Guide

## Mocking External APIs

```go
type MockAPIClient struct {
	FetchAssetsFn func(ctx context.Context) ([]Asset, error)
}

func (m *MockAPIClient) FetchAssets(ctx context.Context) ([]Asset, error) {
	if m.FetchAssetsFn != nil {
		return m.FetchAssetsFn(ctx)
	}
	return []Asset{}, nil
}
```

## Credential Testing Patterns

```go
func TestCredentialValidation(t *testing.T) {
	tests := []struct{
		name string
		creds Credential
		wantErr bool
	}{
		{"valid", Credential{APIKey: "key", Secret: "secret"}, false},
		{"missing key", Credential{Secret: "secret"}, true},
	}
	// ... table-driven test
}
```

## Error Simulation

```go
mockClient := &MockAPIClient{
	FetchAssetsFn: func(ctx context.Context) ([]Asset, error) {
		return nil, fmt.Errorf("API rate limit exceeded")
	},
}
```

## CI Pipeline Setup

```yaml
# .github/workflows/test-integrations.yml
- name: Run integration tests
  run: go test -v -tags=integration ./pkg/capabilities/...
  env:
    TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
```
