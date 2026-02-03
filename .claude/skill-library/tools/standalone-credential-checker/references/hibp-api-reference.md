# HIBP API Reference

Complete reference for Have I Been Pwned (HIBP) API integration with curl/bash.

## k-Anonymity Protocol

**The k-anonymity protocol ensures HIBP never sees your full password hash.**

### Protocol Steps

1. Hash password with SHA-1 (40-character hex)
2. Take first 5 characters (prefix)
3. Send only prefix to API: `GET https://api.pwnedpasswords.com/range/{prefix}`
4. API returns ~800 hash suffixes matching that prefix
5. Check if your full hash suffix appears in results
6. Extract occurrence count

**Privacy guarantee:** HIBP API only receives "21BD1" (prefix), never the full hash or password.

### Complete Implementation

```bash
#!/bin/bash
check_password_hibp() {
    local password="$1"

    # Generate SHA-1 (uppercase)
    local hash=$(echo -n "$password" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
    local prefix="${hash:0:5}"
    local suffix="${hash:5}"

    # Query API (no authentication needed)
    local response=$(curl -s "https://api.pwnedpasswords.com/range/$prefix")

    # Search for suffix in results
    if echo "$response" | grep -q "^$suffix:"; then
        local count=$(echo "$response" | grep "^$suffix:" | cut -d':' -f2)
        echo "FOUND:$count"
    else
        echo "NOT_FOUND:0"
    fi
}

# Usage
RESULT=$(check_password_hibp "password123")
STATUS=$(echo "$RESULT" | cut -d':' -f1)
COUNT=$(echo "$RESULT" | cut -d':' -f2)

if [ "$STATUS" = "FOUND" ]; then
    echo "❌ Password breached: $COUNT occurrences"
else
    echo "✅ Password not in HIBP database"
fi
```

## Pwned Passwords API (No API Key)

### Endpoint
```
GET https://api.pwnedpasswords.com/range/{hash-prefix}
```

### Request Headers
```bash
# No authentication required
# No user-agent required (but recommended)
curl -s "https://api.pwnedpasswords.com/range/21BD1"
```

### Response Format

**Success (200):**
```
00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2
011053FD0102E94D6AE2F8B83D76FAF94F6:1
012A7CA357541F0AC487871FEEC1891C49C:2
...
```

Each line contains:
- Hash suffix (35 characters)
- Colon separator
- Occurrence count

**Response parsing:**
```bash
PREFIX="21BD1"
SUFFIX="2F4A0B45389FB7E83C2CC10B63B7D49C9E6"

RESPONSE=$(curl -s "https://api.pwnedpasswords.com/range/$PREFIX")

if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
    COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
    echo "Found: $COUNT times"
else
    echo "Not found"
fi
```

### Rate Limiting

**No rate limit on Pwned Passwords API** - check as many passwords as needed.

## Breached Account API (Requires API Key)

### Endpoint
```
GET https://haveibeenpwned.com/api/v3/breachedaccount/{account}
```

### Request Headers
```bash
# Required headers
-H "hibp-api-key: your-api-key-here"
-H "user-agent: YourApp-SecurityCheck"
```

### Complete Request Example

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
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `truncateResponse` | boolean | `false` = full breach details, `true` = minimal |
| `domain` | string | Filter breaches by domain |
| `includeUnverified` | boolean | Include unverified breaches (default: false) |

**Example with parameters:**
```bash
curl -s \
  -H "hibp-api-key: $HIBP_API_KEY" \
  -H "user-agent: MyApp" \
  "https://haveibeenpwned.com/api/v3/breachedaccount/$EMAIL?truncateResponse=false&includeUnverified=true"
```

### Response Formats

**200 OK - Account found in breaches:**
```json
[
  {
    "Name": "Adobe",
    "Title": "Adobe",
    "Domain": "adobe.com",
    "BreachDate": "2013-10-04",
    "AddedDate": "2013-12-04T00:00:00Z",
    "ModifiedDate": "2022-05-15T23:52:49Z",
    "PwnCount": 152445165,
    "Description": "In October 2013, 153 million Adobe accounts were breached...",
    "LogoPath": "https://haveibeenpwned.com/Content/Images/PwnedLogos/Adobe.png",
    "DataClasses": [
      "Email addresses",
      "Password hints",
      "Passwords",
      "Usernames"
    ],
    "IsVerified": true,
    "IsFabricated": false,
    "IsSensitive": false,
    "IsRetired": false,
    "IsSpamList": false,
    "IsMalware": false
  }
]
```

**404 Not Found - Account not in breaches:**
```
(empty body)
```

**Parsing examples:**
```bash
# Extract breach names only
echo "$BODY" | jq -r '.[] | .Name'

# Extract with dates and counts
echo "$BODY" | jq -r '.[] | "\(.Name) (\(.BreachDate)) - \(.PwnCount) accounts"'

# Filter sensitive breaches
echo "$BODY" | jq -r '.[] | select(.IsSensitive == true) | .Name'

# Get data classes exposed
echo "$BODY" | jq -r '.[] | "\(.Name): \(.DataClasses | join(", "))"'
```

### Error Handling

**Complete error handling implementation:**

```bash
check_email_hibp_safe() {
    local email="$1"
    local api_key="$2"

    local response=$(curl -s -w "\n%{http_code}" \
        -H "hibp-api-key: $api_key" \
        -H "user-agent: Praetorian-Security-Check" \
        "https://haveibeenpwned.com/api/v3/breachedaccount/$email")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    case $http_code in
        200)
            echo "BREACHED"
            echo "$body" | jq -r '.[] | .Name'
            return 0
            ;;
        404)
            echo "CLEAN"
            return 0
            ;;
        401)
            echo "ERROR: Invalid API key" >&2
            return 1
            ;;
        403)
            echo "ERROR: Missing user-agent header" >&2
            return 1
            ;;
        429)
            local retry=$(echo "$body" | grep -i "retry-after" | cut -d':' -f2 | tr -d ' ')
            echo "ERROR: Rate limited. Retry after $retry seconds" >&2
            return 1
            ;;
        *)
            echo "ERROR: HTTP $http_code" >&2
            return 1
            ;;
    esac
}
```

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response - account found in breaches |
| 404 | Not found | Account not in any breaches |
| 401 | Unauthorized | Check API key validity |
| 403 | Forbidden | Add user-agent header |
| 429 | Rate limited | Check retry-after header, wait before retry |

### Rate Limiting

**Breach account API has rate limits:**

- Check `Retry-After` header in 429 responses
- Typically 1-2 seconds between requests recommended
- No limit on Pwned Passwords API

**Extract retry delay:**
```bash
RETRY_AFTER=$(curl -s -i \
  -H "hibp-api-key: $API_KEY" \
  -H "user-agent: MyApp" \
  "https://haveibeenpwned.com/api/v3/breachedaccount/$EMAIL" \
  | grep -i "retry-after" | cut -d':' -f2 | tr -d ' ')

echo "Wait $RETRY_AFTER seconds"
```

## Getting an API Key

**HIBP API Key:**
- URL: https://haveibeenpwned.com/API/Key
- Cost: $3.50/month subscription
- Required for: Email/username breach lookups
- Not required for: Password checks (Pwned Passwords)

**Key storage:**
```bash
# Environment variable
export HIBP_API_KEY="your-key-here"

# Use in scripts
HIBP_API_KEY="${HIBP_API_KEY:-default-key}"
```

## Complete Working Example

```bash
#!/bin/bash
# Complete HIBP credential checker

HIBP_API_KEY="${HIBP_API_KEY:-}"

check_password() {
    local password="$1"

    # Generate SHA-1
    local hash=$(echo -n "$password" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
    local prefix="${hash:0:5}"
    local suffix="${hash:5}"

    # Query API
    local response=$(curl -s "https://api.pwnedpasswords.com/range/$prefix")

    if echo "$response" | grep -q "^$suffix:"; then
        local count=$(echo "$response" | grep "^$suffix:" | cut -d':' -f2)
        echo "❌ Password breached: $count times"
        return 1
    else
        echo "✅ Password not in breaches"
        return 0
    fi
}

check_email() {
    local email="$1"
    local api_key="$2"

    if [ -z "$api_key" ]; then
        echo "❌ Error: API key required for email checks"
        return 1
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -H "hibp-api-key: $api_key" \
        -H "user-agent: Credential-Checker" \
        "https://haveibeenpwned.com/api/v3/breachedaccount/$email")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    case $http_code in
        200)
            echo "❌ Email found in breaches:"
            echo "$body" | jq -r '.[] | "  - \(.Name) (\(.BreachDate))"'
            return 1
            ;;
        404)
            echo "✅ Email not in breaches"
            return 0
            ;;
        *)
            echo "❌ Error: HTTP $http_code"
            return 1
            ;;
    esac
}

# Usage examples
check_password "password123"
check_email "test@example.com" "$HIBP_API_KEY"
```
