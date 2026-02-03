---
name: standalone-credential-checker
description: Use when checking credentials against breach databases via direct HIBP/DeHashed API calls - curl/bash examples with k-anonymity, no external CLI dependencies
allowed-tools: Bash, Read, Write
---

# Standalone Credential Checking via Direct API Calls

**Check credentials against breach databases using curl/bash - no external CLI dependencies required.**

## When to Use This Skill

Use this skill when:

- User provides credentials and wants breach checking via direct API calls
- No external CLI tools available (frumentarii, hibp-cli not installed)
- Need standalone bash/curl examples for credential checking
- Want to understand raw HTTP API workflows for HIBP/DeHashed
- Building custom integration scripts

**Triggers:**

- "Check these credentials with HIBP API"
- "Use curl to check passwords against DeHashed"
- "Show me how to call HIBP directly"
- "I don't have frumentarii - check credentials anyway"
- "Direct API call for password breach checking"

**DO NOT use this skill when:**

- User has other preferred credential checking tools already configured
- Different breach database APIs are explicitly requested

## Problem This Solves

**Context:** Sometimes engineers need to check credentials but don't have dedicated CLI tools installed, or they want to understand the underlying HTTP API workflows for custom integrations.

**This skill provides:**

- Direct curl commands for HIBP and DeHashed APIs
- Bash examples with error handling
- Raw HTTP request/response formats
- No binary dependencies (just curl + bash)
- API key pattern filtering logic
- Flexible API key storage (1Password, env vars, or inline)

## Choosing Between HIBP and DeHashed

| Feature | HIBP | DeHashed |
|---------|------|----------|
| **Password check** | k-anonymity (SHA-1, 5-char prefix) | Full hash sent (SHA-256) |
| **Privacy** | Server never sees full hash | Server sees full hash |
| **Password check cost** | Free (rate limited) | FREE - no credits needed |
| **Email/username search** | API key required | 1 credit per search |
| **Response data** | Occurrence count only | Count + full breach records |
| **Breach source** | Not revealed | Database name included |
| **Rate limit** | No rate limit on Pwned Passwords | 10 req/second |

**Use HIBP when:**

- Privacy is paramount (client credentials)
- Just need yes/no answer on passwords
- No API key available (free tier)

**Use DeHashed when:**

- Need to know which breach contained the credential
- Want full context (associated emails, usernames, database)
- Have DeHashed API key and credits for rich searches

## 1Password Integration

Store API keys securely using 1Password `op://` references:

```bash
# Install 1Password CLI (if not already installed)
brew install 1password-cli

# Sign in to 1Password
op signin

# Store your API keys in 1Password, then use op:// references:
export HIBP_API_KEY="op://Security Tools/HIBP API Key/password"
export DEHASHED_API_KEY="op://Security Tools/DeHashed API Key/password"

# Resolve secrets before using in curl (Method 1: op run)
op run -- bash -c 'curl -H "hibp-api-key: $HIBP_API_KEY" ...'

# Method 2: op read for single values
HIBP_API_KEY=$(op read "op://Security Tools/HIBP API Key/password")
curl -H "hibp-api-key: $HIBP_API_KEY" ...
```

**Benefits:**
- API keys never appear in shell history or config files
- Centralized key management and rotation
- Audit trail of secret access
- Team sharing via 1Password vaults

**See:** [references/hibp-api-reference.md](references/hibp-api-reference.md) for complete examples with 1Password integration.

## Quick Start

### HIBP Password Check (Free, No API Key)

```bash
#!/bin/bash
PASSWORD="password123"

# Generate SHA-1 hash (uppercase)
HASH=$(echo -n "$PASSWORD" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)

# Extract first 5 characters (prefix)
PREFIX="${HASH:0:5}"
SUFFIX="${HASH:5}"

# Query HIBP API with prefix only
RESPONSE=$(curl -s "https://api.pwnedpasswords.com/range/$PREFIX")

# Check if full hash suffix appears in results
if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
    COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
    echo "❌ Password found in breaches: $COUNT times"
else
    echo "✅ Password not found in HIBP database"
fi
```

**See:** [references/hibp-api-reference.md](references/hibp-api-reference.md) for complete curl examples, k-anonymity protocol details, and response handling.

### HIBP Email Breach Check (Requires API Key)

```bash
#!/bin/bash
EMAIL="test@example.com"
HIBP_API_KEY="${HIBP_API_KEY:-your-key-here}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "hibp-api-key: $HIBP_API_KEY" \
  -H "user-agent: Praetorian-Credential-Checker" \
  "https://haveibeenpwned.com/api/v3/breachedaccount/$EMAIL?truncateResponse=false")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

case $HTTP_CODE in
  200)
    echo "❌ Email found in breaches:"
    echo "$BODY" | jq -r '.[] | "  - \(.Name) (\(.BreachDate))"'
    ;;
  404)
    echo "✅ Email not found in any breaches"
    ;;
  401|429)
    echo "❌ Error: HTTP $HTTP_CODE"
    ;;
esac
```

**See:** [references/hibp-api-reference.md](references/hibp-api-reference.md) for error codes, rate limiting, and retry logic.

### DeHashed Password Check (Free, No Credits)

```bash
#!/bin/bash
PASSWORD="Welcome2024!"
DEHASHED_API_KEY="${DEHASHED_API_KEY:-your-key-here}"

# Generate SHA-256 hash (lowercase)
HASH=$(echo -n "$PASSWORD" | shasum -a 256 | cut -d' ' -f1)

RESPONSE=$(curl -s -X POST \
  -H "Dehashed-Api-Key: $DEHASHED_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sha256_hashed_password\": \"$HASH\"}" \
  "https://api.dehashed.com/v2/search-password")

RESULTS=$(echo "$RESPONSE" | jq -r '.results_found // 0')

if [ "$RESULTS" -gt 0 ]; then
    echo "❌ Password found in $RESULTS DeHashed records"
else
    echo "✅ Password not found in DeHashed database"
fi
```

**See:** [references/dehashed-api-reference.md](references/dehashed-api-reference.md) for rich search API, query syntax, and credit usage.

### DeHashed Rich Search (1 Credit)

```bash
#!/bin/bash
EMAIL="admin@example.com"
DEHASHED_API_KEY="${DEHASHED_API_KEY:-your-key-here}"

RESPONSE=$(curl -s -X POST \
  -H "Dehashed-Api-Key: $DEHASHED_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"email:$EMAIL\",
    \"size\": 100,
    \"page\": 1,
    \"de_dupe\": true
  }" \
  "https://api.dehashed.com/v2/search")

TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0')
BALANCE=$(echo "$RESPONSE" | jq -r '.balance // 0')

if [ "$TOTAL" -gt 0 ]; then
    echo "❌ Email found in $TOTAL breach records"
    echo "📊 Remaining credits: $BALANCE"
    echo ""
    echo "Breach databases:"
    echo "$RESPONSE" | jq -r '.entries[] | "  - \(.database_name)"' | sort -u
else
    echo "✅ Email not found in DeHashed database"
fi
```

**See:** [references/dehashed-api-reference.md](references/dehashed-api-reference.md) for query field syntax, pagination, and response parsing.

## Core Workflows

### Workflow 1: HIBP k-Anonymity Password Check

**The k-anonymity protocol ensures HIBP never sees your full password hash.**

**Overview:**

1. Hash password with SHA-1 (40-character hex)
2. Take first 5 characters (prefix)
3. Send only prefix to API
4. API returns ~800 hash suffixes matching that prefix
5. Check if your full hash suffix appears in results

**See:** [references/hibp-api-reference.md](references/hibp-api-reference.md) for complete k-anonymity implementation with function examples.

### Workflow 2: DeHashed Password Search (Free)

**DeHashed offers free password checking but sends the full hash (no k-anonymity).**

**Overview:**

1. Hash password with SHA-256 (64-character hex)
2. Send full hash to API
3. API returns count of matches
4. No credit charged for this endpoint

**See:** [references/dehashed-api-reference.md](references/dehashed-api-reference.md) for complete implementation and privacy considerations.

### Workflow 3: Batch Credential Checking

**Check multiple credentials with filtering and progress tracking.**

**Overview:**

1. Read credentials from file (format: username:password)
2. Filter out API key patterns to avoid waste
3. Check each password via HIBP or DeHashed
4. Track statistics (breached, clean, skipped, errors)

**See:** [references/batch-processing-patterns.md](references/batch-processing-patterns.md) for complete batch implementation, concurrency patterns, and progress tracking.

### Workflow 4: DeHashed Rich Search for Context

**Get full breach details including database names and associated data.**

**Overview:**

1. Query DeHashed with email/username (costs 1 credit)
2. Receive full breach context (database names, passwords, IPs)
3. Parse structured results
4. Check remaining credit balance

**See:** [references/dehashed-api-reference.md](references/dehashed-api-reference.md) for query syntax, field extraction, and response parsing.

## API Key Filtering

**Before checking credentials, filter out API key patterns to avoid wasting API calls.**

**Common patterns to filter:**

| Category | Patterns |
|----------|----------|
| **AWS** | `AWS_SECRET`, `AWS_ACCESS`, `AKIA` |
| **Generic** | `API_KEY`, `APIKEY`, `SECRET_KEY`, `TOKEN` |
| **Services** | `GITHUB_TOKEN`, `STRIPE_KEY`, `SLACK_TOKEN` |
| **Database** | `DATABASE_URL`, `DB_PASSWORD` |

**Quick implementation:**

```bash
API_KEY_PATTERNS="AWS_SECRET|AWS_ACCESS|API_KEY|SECRET_KEY|TOKEN|GITHUB_TOKEN"

if echo "$username" | grep -qiE "$API_KEY_PATTERNS"; then
    echo "⏭️  Skipped: $username (API key pattern)"
    continue
fi
```

**See:** [references/batch-processing-patterns.md](references/batch-processing-patterns.md) for complete pattern list and filtering implementations.

## Error Handling

### HIBP HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 404 | Not found | Account/password not in breaches |
| 401 | Unauthorized | Check API key (for email lookups) |
| 403 | Forbidden | Add user-agent header |
| 429 | Rate limited | Check retry-after header |

### DeHashed HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Check authentication format |
| 401 | Unauthorized | Verify API key and subscription |
| 403 | Insufficient credits | Purchase credits |
| 429 | Too many requests | Slow down, max 10 req/sec |

**See:** [references/hibp-api-reference.md](references/hibp-api-reference.md) and [references/dehashed-api-reference.md](references/dehashed-api-reference.md) for complete error handling implementations with retry logic.

## Integration

### Called By

- Ad-hoc security checks by engineers
- Custom bash scripts for credential validation
- CI/CD pipelines without frumentarii installed
- Learning/demonstration of breach checking APIs
- `gateway-integrations` - Discovery routing for breach checking needs

### Requires (invoke before starting)

None - Entry point skill with no skill prerequisites

**External dependencies** (not skills):
- `curl` - HTTP client
- `jq` - JSON parsing (optional but recommended)
- `shasum` or `sha1sum` - SHA-1 hashing
- `sha256sum` or `shasum -a 256` - SHA-256 hashing

**API keys** (not skills):
- HIBP API key: Optional for password checks, required for email checks (https://haveibeenpwned.com/API/Key)
- DeHashed API key: Required for all DeHashed endpoints (https://dehashed.com)

### Calls (during execution)

None - This skill provides bash/curl examples, does not invoke other skills

**External APIs called** (not skills):
- `api.pwnedpasswords.com` - HIBP Pwned Passwords (k-anonymity)
- `haveibeenpwned.com/api/v3` - HIBP breach data (email lookups)
- `api.dehashed.com/v2` - DeHashed search APIs

### Pairs With (conditional)

| Skill                    | Trigger           | Purpose                                    |
| ------------------------ | ----------------- | ------------------------------------------ |
| `gateway-security`       | Security context  | Authentication and secrets management      |
| `gateway-integrations`   | API patterns      | Third-party API integration guidance       |
| `gateway-tools`          | Tool discovery    | MCP wrapper patterns and tool integration  |

## Examples

### Example 1: Batch Check with Filtering

**User:** "Check these credentials via curl: admin:password123, AWS_SECRET:abc, db_user:qwerty"

```bash
declare -a CREDS=(
    "admin:password123"
    "AWS_SECRET:abc"
    "db_user:qwerty"
)

API_KEY_PATTERNS="AWS_SECRET|AWS_ACCESS|API_KEY|SECRET_KEY|TOKEN"

for cred in "${CREDS[@]}"; do
    USERNAME=$(echo "$cred" | cut -d':' -f1)
    PASSWORD=$(echo "$cred" | cut -d':' -f2)

    # Filter API keys
    if echo "$USERNAME" | grep -qiE "$API_KEY_PATTERNS"; then
        echo "⏭️  $USERNAME: Skipped (API key pattern)"
        continue
    fi

    # Check via HIBP
    HASH=$(echo -n "$PASSWORD" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
    PREFIX="${HASH:0:5}"
    SUFFIX="${HASH:5}"

    RESPONSE=$(curl -s "https://api.pwnedpasswords.com/range/$PREFIX")

    if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
        COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
        echo "❌ $USERNAME: BREACHED ($COUNT times)"
    else
        echo "✅ $USERNAME: Clean"
    fi
done
```

**Output:**
```
⏭️  AWS_SECRET: Skipped (API key pattern)
❌ admin: BREACHED (3861493 times)
❌ db_user: BREACHED (3912816 times)
```

**See:** [references/batch-processing-patterns.md](references/batch-processing-patterns.md) for advanced batch patterns with concurrency and progress tracking.

## Summary

**This skill provides:**

- Direct curl/bash examples for HIBP and DeHashed
- No external CLI dependencies (just standard unix tools)
- k-anonymity protocol implementation
- API key pattern filtering
- Error handling and rate limit management
- Batch checking capabilities

**Key principles:**

1. **Privacy-aware** - Use HIBP k-anonymity when possible
2. **Cost-conscious** - Filter API keys, use free endpoints
3. **Error-resilient** - Handle HTTP errors gracefully
4. **Standalone** - No binaries required, pure bash/curl

**When to use:**

- Ad-hoc credential checks without external CLI tools
- Learning API workflows
- Custom integration scripting
- Environments where only standard unix tools are available
- Building custom credential checking scripts

**When NOT to use:**

- User has other preferred credential checking tools configured
- Different breach database APIs are explicitly requested

## Reference Documentation

- [HIBP API Reference](references/hibp-api-reference.md) - Complete k-anonymity protocol, curl examples, error handling
- [DeHashed API Reference](references/dehashed-api-reference.md) - Password search, rich search, query syntax, credit usage
- [Batch Processing Patterns](references/batch-processing-patterns.md) - API key filtering, concurrency, progress tracking, retry logic
