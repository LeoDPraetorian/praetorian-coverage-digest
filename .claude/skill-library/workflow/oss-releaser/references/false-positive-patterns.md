# False Positive Patterns

**Common secret scanner false positives and how to handle them.**

## Test Fixtures

**Pattern:** Hardcoded credentials in test files

**Indicators:**
- File in `tests/`, `testdata/`, `fixtures/` directory
- Variable names like `fake_`, `mock_`, `test_`
- Comments indicating it's test data

**Validation:**
- Verify credential doesn't work in production
- Check if it matches any real system format
- Document in .gitleaksignore

## Documentation Examples

**Pattern:** API keys/tokens in README, docs/

**Indicators:**
- Placeholder text: "your-api-key-here", "REPLACE_ME"
- Context makes it clear it's an example
- Instructional text around it

**Action:** No action if clearly example, but consider making it more obviously fake

## Variable Names

**Pattern:** Variables named "secret", "password", "token"

**Indicators:**
- Just the variable name, no actual value
- In type definitions or interfaces

**Example:**
```go
type Config struct {
    APIKey string  // False positive: just a field name
}

const APIKey = "sk_live_..."  // Real issue: hardcoded value
```

## Internal Package Names

**Pattern:** Package/module named "internal"

**Indicators:**
- Go's `internal/` directory pattern
- Python package structure

**Action:** Not a security issue, just code organization

## Comments and Documentation

**Pattern:** Word "internal" or "secret" in comments

**Example:**
```go
// This function handles internal routing logic
func RouteRequest() {}  // False positive
```

## Public Email Addresses

**Pattern:** `@praetorian.com` email addresses

**Validation:**
- Public emails (security@, opensource@, hello@) → OK
- Individual employee emails → Consider genericizing

## Algorithm/Crypto Constants

**Pattern:** Hex strings that look like keys

**Indicators:**
- Part of test vectors for crypto algorithms
- Standard test data (e.g., SHA256 test vectors)

**Example:**
```python
# SHA256 test vector from RFC
expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```
