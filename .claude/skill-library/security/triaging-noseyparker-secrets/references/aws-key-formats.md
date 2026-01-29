# AWS Key Format Reference

**Source**: Research synthesis from AWS documentation, security research by Aidan Steele, Summit Route, and Hacking The Cloud.

## Access Key ID Format

### Structure

AWS Access Key IDs are 20 characters with this structure:

| Position | Content | Description |
|----------|---------|-------------|
| 1-4 | Prefix | Type identifier (AKIA, ASIA, etc.) |
| 5-12 | Account ID | Base32-encoded AWS account ID |
| 13 | Parity | Error checking bit |
| 14-20 | Random | Padding/uniqueness |

### Character Set

**Allowed characters**: `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`

This is base32 encoding, which deliberately excludes:
- `0` (zero) - confused with `O`
- `1` (one) - confused with `I` or `L`
- `8` and `9` - not in base32

**Bits per character**: 5 (32 possible values = 2^5)

### Length Constraints

| Constraint | Value |
|------------|-------|
| Standard length | 20 characters |
| Minimum length | 16 characters |
| Maximum length | 128 characters |

### Prefixes

| Prefix | Resource Type | Description |
|--------|---------------|-------------|
| `AKIA` | Access Key | Long-term IAM user credentials |
| `ASIA` | Access Key | Temporary STS session credentials |
| `AIDA` | User ID | IAM user unique identifier |
| `AROA` | Role ID | IAM role unique identifier |
| `AIPA` | Instance Profile | EC2 instance profile ID |
| `AGPA` | Group ID | IAM group unique identifier |
| `ANPA` | Policy ID | Managed policy unique identifier |
| `ANVA` | Policy Version | Version in managed policy |
| `A3T` | Legacy | Older key format |

### Validation Regex

```regex
# Strict AKIA/ASIA only (most common)
^(AKIA|ASIA)[A-Z234567]{16}$

# All known prefixes
^(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}$

# Lenient (any valid-looking key)
^[A-Z0-9]{20}$
```

### Account ID Extraction

The account ID is encoded in characters 5-12. It can be extracted via base32 decoding:

```python
import base64

def extract_account_id(access_key_id):
    """Extract AWS account ID from access key ID."""
    # Characters 5-12 contain the account ID
    encoded = access_key_id[4:12]
    # Pad to multiple of 8 for base32
    padded = encoded + "=" * (8 - len(encoded) % 8)
    try:
        decoded = base64.b32decode(padded)
        return str(int.from_bytes(decoded, 'big'))
    except:
        return None
```

**Note**: This works for modern keys (v0.17.0+). Older keys may not follow this structure.

## Secret Access Key Format

### Structure

| Property | Value |
|----------|-------|
| Length | 40 characters |
| Encoding | Base64 |
| Decoded size | 30 bytes (240 bits) |

### Character Set

**Allowed characters**: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`

This is standard base64, which includes:
- Uppercase A-Z
- Lowercase a-z
- Digits 0-9
- Plus `+`, forward slash `/`, equals `=` (padding)

### Validation Regex

```regex
# Standard (exactly 40 chars)
^[A-Za-z0-9+/]{40}$

# With optional padding
^[A-Za-z0-9+/]{40}={0,2}$

# Boundary-aware (in larger text)
(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])
```

### Distinguishing from Git SHAs

Git commit SHAs are also 40 characters but use only hex:

| Type | Character Set | Example |
|------|---------------|---------|
| AWS Secret Key | Base64 (A-Za-z0-9+/=) | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| Git SHA | Hex (a-f0-9) | `a1b2c3d4e5f6789012345678901234567890abcd` |

**Detection**: If string matches `^[a-f0-9]{40}$`, it's likely a git SHA, not an AWS secret.

## Session Token Format

AWS STS session tokens (for temporary credentials):

| Property | Value |
|----------|-------|
| Length | Variable (typically 300-400+ characters) |
| Encoding | Base64 |
| Prefix | Often starts with `FwoGZX...` or `IQoJb3...` |

### Validation

```regex
# Minimum viable session token pattern
^[A-Za-z0-9+/=]{100,}$
```

## API Verification

### GetAccessKeyInfo

Verify key format without needing the secret:

```bash
aws sts get-access-key-info --access-key-id AKIAIOSFODNN7EXAMPLE
```

**Returns**:
```json
{
    "Account": "123456789012"
}
```

**Errors**:
- `InvalidClientTokenId`: Invalid format or doesn't exist
- `AccessDenied`: Valid format but no permission

### GetCallerIdentity

Verify active credentials (requires secret):

```bash
AWS_ACCESS_KEY_ID=AKIAEXAMPLE \
AWS_SECRET_ACCESS_KEY=secret \
aws sts get-caller-identity
```

**Returns** (if valid):
```json
{
    "UserId": "AIDAEXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/username"
}
```

## Quick Reference Table

| Credential Type | Length | Character Set | Prefix |
|-----------------|--------|---------------|--------|
| Access Key ID | 20 | A-Z, 2-7 | AKIA/ASIA/etc |
| Secret Access Key | 40 | Base64 | None |
| Session Token | 300+ | Base64 | Varies |
| Account ID | 12 | 0-9 | None |
| User ID | 20 | A-Z, 0-9 | AIDA |
| Role ID | 20 | A-Z, 0-9 | AROA |

## Sources

- https://awsteele.com/blog/2020/09/26/aws-access-key-format.html
- https://summitroute.com/blog/2018/06/20/aws_security_credential_formats/
- https://hackingthe.cloud/aws/general-knowledge/iam-key-identifiers/
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- https://docs.aws.amazon.com/STS/latest/APIReference/API_GetAccessKeyInfo.html
