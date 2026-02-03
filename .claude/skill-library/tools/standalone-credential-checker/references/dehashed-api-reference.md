# DeHashed API Reference

Complete reference for DeHashed API integration with curl/bash.

## Overview

DeHashed provides two main endpoints:
1. **Password Search** (`/v2/search-password`) - Free, no credits
2. **Rich Search** (`/v2/search`) - 1 credit per query

## Password Search API (Free)

### Endpoint
```
POST https://api.dehashed.com/v2/search-password
```

### Request Headers
```bash
-H "Dehashed-Api-Key: your-api-key-here"
-H "Content-Type: application/json"
```

### Request Body

**JSON format:**
```json
{
  "sha256_hashed_password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
}
```

**Complete example:**
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

### Response Format

**Success (200):**
```json
{
  "results_found": 892,
  "message": "Password found in breach databases"
}
```

**Not found (200):**
```json
{
  "results_found": 0,
  "message": "Password not found"
}
```

**Parsing:**
```bash
# Extract count
RESULTS=$(echo "$RESPONSE" | jq -r '.results_found // 0')

# Check if found
if [ "$RESULTS" -gt 0 ]; then
    echo "Password compromised: $RESULTS records"
fi
```

### Privacy Consideration

**Full hash is sent to DeHashed** - less private than HIBP k-anonymity protocol.

### Function Implementation

```bash
#!/bin/bash
check_password_dehashed() {
    local password="$1"
    local api_key="$2"

    # Generate SHA-256 (lowercase)
    local hash=$(echo -n "$password" | shasum -a 256 | cut -d' ' -f1)

    # Query API
    local response=$(curl -s -X POST \
        -H "Dehashed-Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "{\"sha256_hashed_password\": \"$hash\"}" \
        "https://api.dehashed.com/v2/search-password")

    # Parse results
    local count=$(echo "$response" | jq -r '.results_found // 0')
    echo "$count"
}

# Usage
COUNT=$(check_password_dehashed "Welcome2024!" "$DEHASHED_API_KEY")

if [ "$COUNT" -gt 0 ]; then
    echo "❌ Password found in $COUNT breach records"
else
    echo "✅ Password not found in DeHashed"
fi
```

## Rich Search API (1 Credit)

### Endpoint
```
POST https://api.dehashed.com/v2/search
```

### Request Headers
```bash
-H "Dehashed-Api-Key: your-api-key-here"
-H "Content-Type: application/json"
```

### Request Body

**JSON format:**
```json
{
  "query": "email:admin@example.com",
  "size": 100,
  "page": 1,
  "de_dupe": true
}
```

### Query Syntax

| Field | Query Example | Description |
|-------|---------------|-------------|
| Email | `email:user@domain.com` | Search by email address |
| Username | `username:admin` | Search by username |
| Password | `password:Welcome123` | Search by plaintext password |
| IP | `ip_address:192.168.1.1` | Search by IP address |
| Name | `name:"John Doe"` | Search by name |
| Phone | `phone:555-1234` | Search by phone number |
| Hash | `hashed_password:abc123...` | Search by password hash |
| Database | `database_name:linkedin` | Filter by breach source |

**Combining queries:**
```json
{
  "query": "email:admin@example.com AND database_name:adobe"
}
```

### Request Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `query` | string | Search query using field syntax | Required |
| `size` | integer | Results per page (max 10,000) | 100 |
| `page` | integer | Page number (1-indexed) | 1 |
| `de_dupe` | boolean | Remove duplicate entries | false |

### Complete Request Example

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

### Response Format

**Success (200):**
```json
{
  "balance": 1570,
  "entries": [
    {
      "id": "1234567890",
      "email": ["admin@example.com"],
      "username": ["admin"],
      "password": ["Welcome123"],
      "hashed_password": [],
      "name": ["John Admin"],
      "ip_address": ["192.168.1.1"],
      "address": [],
      "phone": [],
      "database_name": "Adobe (2013)"
    }
  ],
  "success": true,
  "took": "45ms",
  "total": 3,
  "results_found": 3
}
```

**Field details:**

| Field | Type | Description |
|-------|------|-------------|
| `balance` | integer | Remaining API credits |
| `entries` | array | Breach records (arrays for each field) |
| `total` | integer | Total matching records |
| `results_found` | integer | Records in this response |
| `took` | string | Query execution time |

### Parsing Response Data

**Extract breach databases:**
```bash
echo "$RESPONSE" | jq -r '.entries[] | .database_name' | sort -u
```

**Extract usernames:**
```bash
echo "$RESPONSE" | jq -r '.entries[].username[]? // empty' | sort -u
```

**Extract passwords (if available):**
```bash
echo "$RESPONSE" | jq -r '.entries[].password[]? // empty' | sort -u
```

**Full structured output:**
```bash
echo "$RESPONSE" | jq -r '.entries[] |
  "Database: \(.database_name)\n" +
  "  Email: \(.email | join(", "))\n" +
  "  Username: \(.username | join(", "))\n" +
  "  Password: \(.password | join(", "))\n"'
```

### Function Implementation

```bash
#!/bin/bash
search_email_dehashed() {
    local email="$1"
    local api_key="$2"

    local response=$(curl -s -X POST \
        -H "Dehashed-Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"email:$email\",
            \"size\": 100,
            \"page\": 1,
            \"de_dupe\": true
        }" \
        "https://api.dehashed.com/v2/search")

    local total=$(echo "$response" | jq -r '.total // 0')
    local balance=$(echo "$response" | jq -r '.balance // 0')

    if [ "$total" -gt 0 ]; then
        echo "Found in $total breach records (Credits remaining: $balance)"
        echo ""
        echo "Breach databases:"
        echo "$response" | jq -r '.entries[] | "  - \(.database_name)"' | sort -u
        echo ""
        echo "Associated usernames:"
        echo "$response" | jq -r '.entries[].username[]? // empty' | sort -u | head -5
        echo ""
        echo "Warning: This search consumed 1 credit"
    else
        echo "Email not found in DeHashed (Credits remaining: $balance)"
    fi
}

# Usage
search_email_dehashed "admin@example.com" "$DEHASHED_API_KEY"
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Check authentication format |
| 401 | Unauthorized | Verify API key and subscription |
| 403 | Insufficient credits | Purchase credits |
| 429 | Too many requests | Slow down, max 10 req/sec |

### Complete Error Handling

```bash
check_dehashed_safe() {
    local password="$1"
    local api_key="$2"

    local hash=$(echo -n "$password" | shasum -a 256 | cut -d' ' -f1)

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Dehashed-Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "{\"sha256_hashed_password\": \"$hash\"}" \
        "https://api.dehashed.com/v2/search-password")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    case $http_code in
        200)
            local count=$(echo "$body" | jq -r '.results_found // 0')
            echo "FOUND:$count"
            return 0
            ;;
        400)
            echo "ERROR: Bad request - check API key format" >&2
            return 1
            ;;
        401)
            echo "ERROR: Unauthorized - verify subscription" >&2
            return 1
            ;;
        403)
            echo "ERROR: Insufficient credits" >&2
            return 1
            ;;
        429)
            echo "ERROR: Rate limit exceeded (max 10 req/sec)" >&2
            return 1
            ;;
        *)
            echo "ERROR: HTTP $http_code" >&2
            echo "$body" >&2
            return 1
            ;;
    esac
}
```

## Rate Limiting

**DeHashed rate limits:**
- Maximum: 10 requests per second
- Applies to all endpoints

**Implementation:**
```bash
# Add delay between requests
sleep 0.1  # 100ms delay = safe for 10 req/sec limit

# Or use rate limiter
for cred in "${CREDS[@]}"; do
    check_dehashed "$cred" "$API_KEY"
    sleep 0.1
done
```

## Credit Usage

| Endpoint | Credit Cost | Notes |
|----------|-------------|-------|
| `/v2/search-password` | Free | Password hash lookup only |
| `/v2/search` | 1 credit | Full search with breach context |

**Check remaining balance:**
```bash
BALANCE=$(echo "$RESPONSE" | jq -r '.balance // 0')
echo "Credits remaining: $BALANCE"
```

## Getting an API Key

**DeHashed API Key:**
- URL: https://dehashed.com
- Requires: Paid subscription
- Plans: Various credit packages available
- Key location: Account dashboard after subscription

**Key storage:**
```bash
# Environment variable
export DEHASHED_API_KEY="your-key-here"

# Use in scripts
DEHASHED_API_KEY="${DEHASHED_API_KEY:-default-key}"
```

## Complete Working Example

```bash
#!/bin/bash
# Complete DeHashed credential checker

DEHASHED_API_KEY="${DEHASHED_API_KEY:-}"

check_password() {
    local password="$1"
    local api_key="$2"

    if [ -z "$api_key" ]; then
        echo "❌ Error: API key required"
        return 1
    fi

    # Generate SHA-256
    local hash=$(echo -n "$password" | shasum -a 256 | cut -d' ' -f1)

    # Query API
    local response=$(curl -s -X POST \
        -H "Dehashed-Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "{\"sha256_hashed_password\": \"$hash\"}" \
        "https://api.dehashed.com/v2/search-password")

    local count=$(echo "$response" | jq -r '.results_found // 0')

    if [ "$count" -gt 0 ]; then
        echo "❌ Password found in $count breach records"
        return 1
    else
        echo "✅ Password not found"
        return 0
    fi
}

search_email() {
    local email="$1"
    local api_key="$2"

    if [ -z "$api_key" ]; then
        echo "❌ Error: API key required"
        return 1
    fi

    local response=$(curl -s -X POST \
        -H "Dehashed-Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"email:$email\",
            \"size\": 100,
            \"page\": 1,
            \"de_dupe\": true
        }" \
        "https://api.dehashed.com/v2/search")

    local total=$(echo "$response" | jq -r '.total // 0')
    local balance=$(echo "$response" | jq -r '.balance // 0')

    if [ "$total" -gt 0 ]; then
        echo "❌ Email found in $total records"
        echo "📊 Credits remaining: $balance"
        echo "$response" | jq -r '.entries[] | .database_name' | sort -u
        return 1
    else
        echo "✅ Email not found"
        echo "📊 Credits remaining: $balance"
        return 0
    fi
}

# Usage examples
check_password "Welcome2024!" "$DEHASHED_API_KEY"
sleep 0.1  # Rate limit protection
search_email "test@example.com" "$DEHASHED_API_KEY"
```
