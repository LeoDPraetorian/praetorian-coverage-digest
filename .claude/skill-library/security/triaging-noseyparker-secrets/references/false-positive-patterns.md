# AWS Secret False Positive Patterns

**Source**: Research synthesis from git-secrets, TruffleHog, NoseyParker, and AWS documentation.

## Overview

False positives in AWS secret scanning fall into predictable categories. This reference provides comprehensive patterns for filtering FPs from scan results.

**Key statistic**: Format validation alone eliminates ~40% of false positives. Combined with pattern matching and optional API verification, 90%+ FP reduction is achievable.

## Primary False Positives

### AWS Documentation Examples

These appear in 500+ AWS documentation pages and are the #1 source of false positives:

| Type | Value | Notes |
|------|-------|-------|
| Access Key | `AKIAIOSFODNN7EXAMPLE` | Official AWS example |
| Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Official AWS example |

**Detection**: Substring match for `EXAMPLE`

### Placeholder Suffixes

| Pattern | Examples |
|---------|----------|
| `EXAMPLE` | `AKIAEXAMPLE123456789` |
| `SAMPLE` | `AKIASAMPLE123456789` |
| `PLACEHOLDER` | `AWS_PLACEHOLDER_KEY` |
| `DUMMY` | `DUMMY_ACCESS_KEY` |
| `FAKE` | `FAKE_AWS_KEY` |
| `TEST` | `TEST_CREDENTIALS` |
| `MOCK` | `MOCK_AWS_ACCESS_KEY` |

**Detection**: Case-insensitive keyword matching

### Environment Variable Placeholders

| Pattern | Description |
|---------|-------------|
| `${AWS_ACCESS_KEY_ID}` | Shell variable syntax |
| `${AWS_SECRET_ACCESS_KEY}` | Shell variable syntax |
| `$AWS_ACCESS_KEY_ID` | Simple variable |
| `<YOUR_KEY_HERE>` | Documentation placeholder |
| `<INSERT_KEY>` | Tutorial placeholder |
| `[YOUR_AWS_KEY]` | Bracket placeholder |
| `AWS_ACCESS_KEY_ID=''` | Empty string assignment |
| `AWS_ACCESS_KEY_ID=""` | Empty string assignment |

**Detection**: Regex patterns for variable syntax

### Test Context Indicators

Look for these in file paths or surrounding context:

| Indicator | Examples |
|-----------|----------|
| File paths | `test/`, `tests/`, `spec/`, `__tests__/`, `mock/` |
| File names | `*_test.py`, `*_spec.js`, `*.test.ts`, `mock_*.py` |
| Variables | `test_key`, `mock_credentials`, `fake_secret` |
| Comments | `// test credentials`, `# mock AWS key` |

**Detection**: Path analysis + context keyword matching

### Dummy Password Values

| Pattern | Description |
|---------|-------------|
| `password` | Literal word "password" |
| `changeme` | Default placeholder |
| `xxx`, `XXX` | Placeholder pattern |
| `***` | Masked placeholder |
| `your_password_here` | Documentation placeholder |
| `<password>` | XML/template placeholder |

**Detection**: Exact match against known dummy values

## Format Validation (Tier 1)

### Invalid Access Key ID Patterns

| Issue | Example | Why Invalid |
|-------|---------|-------------|
| Wrong length | `AKIA12345` | Must be 20 characters |
| Invalid prefix | `ABCD1234567890123456` | Must start with AKIA/ASIA/etc |
| Invalid characters | `AKIA0189ABCDEFGHIJKL` | 0,1,8,9 not in base32 charset |
| Lowercase | `akiaiosfodnn7example` | Must be uppercase |

**Valid character set**: `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`

### Regex for Format Validation

```regex
# Strict access key (AKIA/ASIA only)
^(AKIA|ASIA)[A-Z234567]{16}$

# All AWS prefixes
^(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}$

# Secret key
^[A-Za-z0-9+/]{40}$
```

## Pattern Matching (Tier 2)

### Regex Patterns for FP Detection

```regex
# Contains EXAMPLE/SAMPLE/etc
(?i)(example|sample|placeholder|dummy|fake|test|mock)

# Environment variable placeholder
\$\{[A-Z_]+\}|\$[A-Z_]+|<[A-Z_]+>|\[[A-Z_]+\]

# Empty assignment
(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*=\s*['"]?\s*['"]?

# Test file paths
(test|spec|mock|__tests__)/
```

### Context Analysis

Check 256 bytes before/after the match for:

1. **Comments indicating test/example**
   - `// example`, `# test`, `/* mock */`

2. **Variable assignments suggesting placeholder**
   - `const EXAMPLE_KEY =`, `let testKey =`

3. **Function/class names**
   - `def test_aws_auth()`, `class MockAWSClient`

## API Verification (Tier 3)

### GetCallerIdentity Approach

For high-confidence validation, call AWS STS API:

```bash
aws sts get-caller-identity \
  --access-key-id AKIAEXAMPLE \
  --secret-access-key <secret>
```

**Results**:
- Success (200) → Valid, active credential
- InvalidClientTokenId → Invalid/inactive key
- SignatureDoesNotMatch → Key exists but wrong secret

**Note**: Requires the secret access key, not just the key ID.

### GetAccessKeyInfo Approach

For key ID validation only (no secret required):

```bash
aws sts get-access-key-info --access-key-id AKIAEXAMPLE
```

**Returns**: Account ID if valid format, error if invalid.

### Codebase Integration

The Nebula `access-key-to-account-id` tool (`.claude/tools/nebula/`) can be used for bulk key validation.

## False Positive Decision Tree

```
For each AWS secret finding:
│
├─ Is format invalid? (wrong length, bad chars, wrong prefix)
│  └─ YES → FP: "Invalid AWS key format"
│
├─ Contains EXAMPLE/SAMPLE/PLACEHOLDER/etc?
│  └─ YES → FP: "Documentation placeholder"
│
├─ Matches known AWS example keys?
│  └─ YES → FP: "AWS documentation example"
│
├─ Is environment variable placeholder?
│  └─ YES → FP: "Environment variable placeholder"
│
├─ Is in test file or test context?
│  └─ YES → FP: "Test/mock credential"
│
├─ Is dummy password value?
│  └─ YES → FP: "Placeholder password"
│
├─ (Optional) API verification fails?
│  └─ YES → FP: "Invalid/inactive credential"
│
└─ ELSE → VALID: "Requires investigation"
```

## Known False Positive Database

### AWS Documentation Keys

| Access Key ID | Secret Access Key |
|---------------|-------------------|
| `AKIAIOSFODNN7EXAMPLE` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### Common Test Patterns

| Pattern | Regex |
|---------|-------|
| aws_test_* | `aws_test_[a-z_]+` |
| mock_aws_* | `mock_aws_[a-z_]+` |
| fake_* | `fake_[a-z_]+` |
| test_credentials | exact match |

### Git Commit SHA Misidentification

40-character hex strings (git SHAs) can be misidentified as secret keys:

```regex
# Git SHA pattern (to exclude)
^[a-f0-9]{40}$
```

**Note**: AWS secret keys use base64, which includes uppercase and +/= characters.

## Sources

- https://github.com/awslabs/git-secrets
- https://github.com/trufflesecurity/trufflehog
- https://trufflesecurity.com/blog/how-trufflehog-verifies-secrets
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- https://www.checkov.io/2.Basics/Scanning%20Credentials%20and%20Secrets.html
