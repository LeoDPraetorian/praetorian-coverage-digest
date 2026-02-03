# Batch Processing Patterns

Patterns for checking multiple credentials efficiently with filtering and error handling.

## API Key Filtering

**Before checking credentials, filter out API key patterns to avoid wasting API calls.**

### Complete Pattern List

| Category | Patterns |
|----------|----------|
| **AWS** | `AWS_SECRET`, `AWS_ACCESS`, `AKIA` |
| **Generic API** | `API_KEY`, `APIKEY`, `API_SECRET` |
| **Secrets/Tokens** | `SECRET`, `SECRET_KEY`, `TOKEN`, `AUTH_TOKEN` |
| **Private Keys** | `PRIVATE_KEY`, `PRIV_KEY` |
| **Client Creds** | `CLIENT_SECRET`, `CLIENT_ID` |
| **Service-Specific** | `GITHUB_TOKEN`, `STRIPE_KEY`, `SENDGRID`, `TWILIO`, `SLACK_TOKEN` |
| **Database** | `DATABASE_URL`, `DB_PASSWORD` |

### Implementation

```bash
#!/bin/bash
API_KEY_PATTERNS=(
    "AWS_SECRET"
    "AWS_ACCESS"
    "AKIA"
    "API_KEY"
    "APIKEY"
    "API_SECRET"
    "SECRET"
    "SECRET_KEY"
    "TOKEN"
    "AUTH_TOKEN"
    "ACCESS_TOKEN"
    "PRIVATE_KEY"
    "CLIENT_SECRET"
    "GITHUB_TOKEN"
    "STRIPE_KEY"
    "SENDGRID"
    "TWILIO"
    "SLACK_TOKEN"
    "DATABASE_URL"
    "DB_PASSWORD"
)

is_api_key() {
    local username="$1"
    local upper_username=$(echo "$username" | tr '[:lower:]' '[:upper:]')

    for pattern in "${API_KEY_PATTERNS[@]}"; do
        if [[ "$upper_username" == *"$pattern"* ]]; then
            return 0  # True - is API key
        fi
    done
    return 1  # False - not API key
}

# Usage
if is_api_key "AWS_SECRET_ACCESS_KEY"; then
    echo "API key detected - skip checking"
else
    echo "Not an API key - proceed with check"
fi
```

### Regex-Based Filtering

```bash
# Single regex pattern for efficiency
API_KEY_PATTERNS="AWS_SECRET|AWS_ACCESS|AKIA|API_KEY|SECRET_KEY|TOKEN|GITHUB_TOKEN|STRIPE"

if echo "$username" | grep -qiE "$API_KEY_PATTERNS"; then
    echo "⏭️  Skipped: $username (API key pattern)"
    continue
fi
```

## Batch Checking Workflow

### Input File Format

**credentials.txt:**
```
admin_password:Welcome2024!
AWS_SECRET_ACCESS_KEY:abc123xyz789
database_user:qwerty123
backup_service:P@ssw0rd123
GITHUB_TOKEN:ghp_abc123xyz
user_account:summer2024
```

### Complete Batch Implementation

```bash
#!/bin/bash
# Batch check credentials from file with filtering and progress

CREDS_FILE="credentials.txt"
API_KEY_PATTERNS="AWS_SECRET|AWS_ACCESS|AKIA|API_KEY|SECRET_KEY|TOKEN|GITHUB_TOKEN|STRIPE"

check_batch() {
    local total=0
    local skipped=0
    local breached=0
    local clean=0
    local errors=0

    echo "Starting batch credential check..."
    echo ""

    while IFS=':' read -r username password; do
        ((total++))

        # Skip empty lines
        if [ -z "$username" ] || [ -z "$password" ]; then
            continue
        fi

        # Filter API keys
        if echo "$username" | grep -qiE "$API_KEY_PATTERNS"; then
            echo "⏭️  [$total] $username: Skipped (API key pattern)"
            ((skipped++))
            continue
        fi

        # Check password via HIBP
        HASH=$(echo -n "$password" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
        PREFIX="${HASH:0:5}"
        SUFFIX="${HASH:5}"

        # Query with error handling
        RESPONSE=$(curl -s "https://api.pwnedpasswords.com/range/$PREFIX")

        if [ $? -ne 0 ]; then
            echo "❌ [$total] $username: ERROR (network failure)"
            ((errors++))
            continue
        fi

        if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
            COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
            echo "❌ [$total] $username: BREACHED ($COUNT times)"
            ((breached++))
        else
            echo "✅ [$total] $username: Clean"
            ((clean++))
        fi

        # Rate limit: HIBP Pwned Passwords has no rate limit
        # Optional: Add small delay for courtesy
        # sleep 0.1
    done < "$CREDS_FILE"

    echo ""
    echo "================================================"
    echo "Summary:"
    echo "================================================"
    echo "  Total: $total credentials"
    echo "  Skipped: $skipped (API key patterns)"
    echo "  Breached: $breached"
    echo "  Clean: $clean"
    echo "  Errors: $errors"
    echo ""

    if [ "$breached" -gt 0 ]; then
        echo "⚠️  WARNING: $breached breached credentials found!"
        return 1
    else
        echo "✅ All checked credentials are clean"
        return 0
    fi
}

# Execute batch check
check_batch
```

### Output Example

```
Starting batch credential check...

⏭️  [1] AWS_SECRET_ACCESS_KEY: Skipped (API key pattern)
❌ [2] admin_password: BREACHED (892 times)
❌ [3] database_user: BREACHED (156234 times)
❌ [4] backup_service: BREACHED (45891 times)
⏭️  [5] GITHUB_TOKEN: Skipped (API key pattern)
✅ [6] user_account: Clean

================================================
Summary:
================================================
  Total: 6 credentials
  Skipped: 2 (API key patterns)
  Breached: 3
  Clean: 1
  Errors: 0

⚠️  WARNING: 3 breached credentials found!
```

## Concurrency Patterns

### Parallel Checking with GNU Parallel

```bash
#!/bin/bash
# Parallel credential checking for speed

check_single() {
    local username="$1"
    local password="$2"

    # API key filtering
    if echo "$username" | grep -qiE "$API_KEY_PATTERNS"; then
        echo "⏭️  $username: Skipped (API key)"
        return
    fi

    # HIBP check
    HASH=$(echo -n "$password" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
    PREFIX="${HASH:0:5}"
    SUFFIX="${HASH:5}"
    RESPONSE=$(curl -s "https://api.pwnedpasswords.com/range/$PREFIX")

    if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
        COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
        echo "❌ $username: BREACHED ($COUNT times)"
    else
        echo "✅ $username: Clean"
    fi
}

export -f check_single
export API_KEY_PATTERNS="AWS_SECRET|API_KEY|TOKEN"

# Run parallel (10 concurrent jobs)
cat credentials.txt | parallel --colsep ':' -j 10 check_single {1} {2}
```

### Background Jobs (No GNU Parallel)

```bash
#!/bin/bash
# Parallel checking with background jobs

MAX_JOBS=10
CREDS_FILE="credentials.txt"

check_credential() {
    local username="$1"
    local password="$2"

    # Same logic as above
    # ...
}

JOBS=0
while IFS=':' read -r username password; do
    check_credential "$username" "$password" &

    ((JOBS++))

    # Wait if max jobs reached
    if [ "$JOBS" -ge "$MAX_JOBS" ]; then
        wait -n  # Wait for any job to finish
        ((JOBS--))
    fi
done < "$CREDS_FILE"

# Wait for remaining jobs
wait
```

## Progress Tracking

### With Progress Bar

```bash
#!/bin/bash
# Batch check with progress bar

CREDS_FILE="credentials.txt"
TOTAL_LINES=$(wc -l < "$CREDS_FILE")
CURRENT=0

check_with_progress() {
    while IFS=':' read -r username password; do
        ((CURRENT++))

        # Calculate progress
        PERCENT=$((CURRENT * 100 / TOTAL_LINES))

        # Progress bar (50 chars wide)
        BAR_WIDTH=50
        FILLED=$((PERCENT * BAR_WIDTH / 100))
        EMPTY=$((BAR_WIDTH - FILLED))

        printf "\r["
        printf "%${FILLED}s" | tr ' ' '='
        printf "%${EMPTY}s" | tr ' ' ' '
        printf "] %3d%% (%d/%d)" "$PERCENT" "$CURRENT" "$TOTAL_LINES"

        # Perform check
        # ... (same logic as above)

    done < "$CREDS_FILE"

    echo ""  # New line after progress bar
}

check_with_progress
```

### Output with Progress

```
[=========================                         ]  50% (3/6)
```

## Error Handling in Batches

### Retry Logic

```bash
#!/bin/bash
# Retry failed requests

check_with_retry() {
    local username="$1"
    local password="$2"
    local max_retries=3
    local retry=0

    while [ "$retry" -lt "$max_retries" ]; do
        HASH=$(echo -n "$password" | shasum -a 1 | tr '[:lower:]' '[:upper:]' | cut -d' ' -f1)
        PREFIX="${HASH:0:5}"
        SUFFIX="${HASH:5}"

        RESPONSE=$(curl -s --max-time 10 "https://api.pwnedpasswords.com/range/$PREFIX")

        if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
            # Success
            if echo "$RESPONSE" | grep -q "^$SUFFIX:"; then
                COUNT=$(echo "$RESPONSE" | grep "^$SUFFIX:" | cut -d':' -f2)
                echo "❌ $username: BREACHED ($COUNT times)"
            else
                echo "✅ $username: Clean"
            fi
            return 0
        else
            # Failure - retry
            ((retry++))
            if [ "$retry" -lt "$max_retries" ]; then
                echo "⚠️  $username: Retry $retry/$max_retries..."
                sleep 2
            fi
        fi
    done

    echo "❌ $username: ERROR (failed after $max_retries retries)"
    return 1
}
```

### Logging Failed Credentials

```bash
#!/bin/bash
# Log failures for later retry

FAILED_LOG="failed_checks.log"

check_batch_with_logging() {
    > "$FAILED_LOG"  # Clear log

    while IFS=':' read -r username password; do
        # ... perform check ...

        if [ $? -ne 0 ]; then
            # Log failure
            echo "$username:$password" >> "$FAILED_LOG"
        fi
    done < "$CREDS_FILE"

    if [ -s "$FAILED_LOG" ]; then
        echo ""
        echo "⚠️  Failed checks logged to: $FAILED_LOG"
        echo "   Retry with: bash check.sh < $FAILED_LOG"
    fi
}
```

## DeHashed Batch Checking

### With Rate Limiting

```bash
#!/bin/bash
# DeHashed batch check with 10 req/sec limit

DEHASHED_API_KEY="${DEHASHED_API_KEY:-}"

check_batch_dehashed() {
    local request_count=0
    local start_time=$(date +%s)

    while IFS=':' read -r username password; do
        # API key filtering
        if echo "$username" | grep -qiE "$API_KEY_PATTERNS"; then
            echo "⏭️  $username: Skipped (API key)"
            continue
        fi

        # Check password
        HASH=$(echo -n "$password" | shasum -a 256 | cut -d' ' -f1)
        RESPONSE=$(curl -s -X POST \
            -H "Dehashed-Api-Key: $DEHASHED_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"sha256_hashed_password\": \"$HASH\"}" \
            "https://api.dehashed.com/v2/search-password")

        RESULTS=$(echo "$RESPONSE" | jq -r '.results_found // 0')

        if [ "$RESULTS" -gt 0 ]; then
            echo "❌ $username: BREACHED ($RESULTS records)"
        else
            echo "✅ $username: Clean"
        fi

        ((request_count++))

        # Rate limit: 10 req/sec
        if [ $((request_count % 10)) -eq 0 ]; then
            current_time=$(date +%s)
            elapsed=$((current_time - start_time))
            if [ "$elapsed" -lt 1 ]; then
                sleep_time=$((1 - elapsed))
                sleep "$sleep_time"
            fi
            start_time=$(date +%s)
        fi
    done < "$CREDS_FILE"
}

check_batch_dehashed
```

## Summary Statistics

### Detailed Report Generation

```bash
#!/bin/bash
# Generate detailed report

generate_report() {
    local total="$1"
    local skipped="$2"
    local breached="$3"
    local clean="$4"
    local errors="$5"

    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local report_file="credential_report_$(date +%Y%m%d_%H%M%S).txt"

    cat > "$report_file" <<EOF
================================================
Credential Check Report
================================================
Timestamp: $timestamp
Input File: $CREDS_FILE

Results:
--------
Total Credentials:     $total
Skipped (API keys):    $skipped
Breached:              $breached
Clean:                 $clean
Errors:                $errors

Success Rate:          $(( (clean + skipped) * 100 / total ))%
Breach Rate:           $(( breached * 100 / (total - skipped - errors) ))%

Status:
-------
EOF

    if [ "$breached" -gt 0 ]; then
        echo "⚠️  CRITICAL: Breached credentials detected" >> "$report_file"
    else
        echo "✅ PASS: No breached credentials found" >> "$report_file"
    fi

    echo "================================================" >> "$report_file"

    echo "Report saved to: $report_file"
    cat "$report_file"
}
```

### CSV Export

```bash
#!/bin/bash
# Export results to CSV

CSV_FILE="results.csv"
echo "username,status,breach_count,timestamp" > "$CSV_FILE"

while IFS=':' read -r username password; do
    # ... perform check ...

    if [ "$STATUS" = "BREACHED" ]; then
        echo "$username,BREACHED,$COUNT,$(date -Iseconds)" >> "$CSV_FILE"
    else
        echo "$username,CLEAN,0,$(date -Iseconds)" >> "$CSV_FILE"
    fi
done < "$CREDS_FILE"

echo "Results exported to: $CSV_FILE"
```
