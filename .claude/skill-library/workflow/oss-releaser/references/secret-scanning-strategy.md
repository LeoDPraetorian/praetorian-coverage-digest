# Secret Scanning Strategy

**Comprehensive approach to detecting hardcoded secrets before OSS release using Nosey Parker.**

## Nosey Parker Overview

Nosey Parker is a command-line tool for finding secrets and sensitive information in textual data and Git repositories. It provides:

- **High Performance**: Fast scanning with parallelized git history analysis
- **130+ Built-in Rules**: Detects API keys, passwords, private keys, tokens
- **Low False Positive Rate**: Designed to minimize noise
- **Datastore Architecture**: Persistent results for incremental scanning
- **Multiple Report Formats**: Human-readable, JSON, SARIF

## Installation

```bash
# macOS (Homebrew)
brew install noseyparker

# Linux (from GitHub releases)
VERSION="v0.17.0"  # Check for latest at github.com/praetorian-inc/noseyparker/releases
curl -sSfL "https://github.com/praetorian-inc/noseyparker/releases/download/${VERSION}/noseyparker-${VERSION}-x86_64-unknown-linux-gnu.tar.gz" | tar -xz
sudo mv noseyparker /usr/local/bin/

# Using Cargo (Rust)
cargo install noseyparker

# Verify installation
noseyparker --version
```

## Basic Usage

### 1. Scan Repository

```bash
# Scan current directory (creates datastore)
noseyparker scan --datastore np-datastore .

# Scan with specific rules only
noseyparker scan --datastore np-datastore --rules "AWS,GitHub,Stripe" .

# Scan git history (default behavior for git repos)
noseyparker scan --datastore np-datastore /path/to/repo
```

### 2. Generate Reports

```bash
# Human-readable report
noseyparker report --datastore np-datastore

# JSON report (for automation)
noseyparker report --datastore np-datastore --format json > noseyparker-report.json

# SARIF report (for CI/CD integration)
noseyparker report --datastore np-datastore --format sarif > noseyparker.sarif
```

### 3. Summarize Results

```bash
# Quick summary
noseyparker summarize --datastore np-datastore

# Example output:
# Scanning Statistics:
# - Files scanned: 1,234
# - Git commits scanned: 567
# - Secrets found: 12
# - Rules triggered: 5
```

## Understanding Nosey Parker Output

### JSON Report Structure

```json
{
  "matches": [
    {
      "rule_name": "AWS Access Key",
      "blob_metadata": {
        "path": "config/aws.yml",
        "commit_metadata": {
          "commit_id": "abc123...",
          "author_name": "Engineer",
          "author_email": "engineer@example.com",
          "commit_timestamp": "2024-01-15T10:30:00Z"
        }
      },
      "snippet": {
        "matching_input": "AKIAIOSFODNN7EXAMPLE",
        "before": "aws_access_key_id: ",
        "after": "\naws_secret_access_key: ..."
      },
      "location": {
        "offset_span": {"start": 123, "end": 143}
      }
    }
  ],
  "rules_triggered": ["AWS Access Key", "Generic Secret"],
  "scan_stats": {
    "total_blobs": 1234,
    "bytes_scanned": 5678901
  }
}
```

### Key Fields

| Field           | Meaning                                       |
| --------------- | --------------------------------------------- |
| `rule_name`     | Type of secret detected                       |
| `path`          | File where secret was found                   |
| `commit_id`     | Git commit containing the secret              |
| `matching_input`| The actual secret string (partially redacted) |
| `snippet`       | Context around the match                      |

## Filtering and Analysis

### Show High-Risk Secrets

```bash
# Filter for production secrets
jq '.matches[] | select(.rule_name | test("AWS|GitHub|Stripe|Production"))' noseyparker-report.json

# Group by rule type
jq -r '.matches | group_by(.rule_name) | map({rule: .[0].rule_name, count: length}) | .[]' noseyparker-report.json
```

### Find Secrets in Specific Files

```bash
# Secrets in production configs
jq '.matches[] | select(.blob_metadata.path | test("prod|production"))' noseyparker-report.json

# Secrets NOT in tests or docs
jq '.matches[] | select(.blob_metadata.path | test("test|doc|example") | not)' noseyparker-report.json
```

### Show Commit History

```bash
# List commits with secrets
jq -r '.matches[].blob_metadata.commit_metadata.commit_id' noseyparker-report.json | sort | uniq

# Show who committed secrets
jq -r '.matches[].blob_metadata.commit_metadata | "\(.author_name) <\(.author_email)> - \(.commit_timestamp)"' noseyparker-report.json | sort | uniq
```

## Verification Workflow

For each finding:

1. **Check Context**
   - Is it in `tests/`, `testdata/`, `docs/`, `examples/`?
   - Is the file name like `fake_`, `mock_`, `test_`, `example_`?

2. **Verify Authenticity**
   - Does the pattern look real (correct format, length)?
   - Is it a placeholder (`your-key-here`, `REPLACE_ME`, `<token>`)?

3. **Assess Scope**
   - Production credentials?
   - Development/staging?
   - Test fixtures with fake data?

4. **Take Action**

| Context             | Appears Real | Action                               |
| ------------------- | ------------ | ------------------------------------ |
| Production code     | Yes          | **ROTATE IMMEDIATELY** 🔴            |
| Staging/dev code    | Yes          | **ROTATE BEFORE RELEASE** 🟡         |
| Test fixtures       | Maybe        | Verify it's fake, document if needed |
| Documentation       | Maybe        | Replace with obvious placeholder     |
| Historic commit     | Yes          | **ROTATE** (still valid in git history) |

## High-Risk Rule Types

**Always investigate these:**

- `AWS Access Key`
- `AWS Secret Key`
- `GitHub Token`
- `GitHub Personal Access Token`
- `Stripe API Key`
- `Google Cloud Service Account`
- `Private Key` (SSH, TLS)
- `Database Connection String`
- `Generic Secret` (high entropy strings)
- `Generic API Key`

## Custom Rules

Nosey Parker supports custom rules. Create `custom-rules.yml`:

```yaml
rules:
  - name: Praetorian API Key
    pattern: 'praetorian_[a-zA-Z0-9]{32}'
    examples:
      - 'praetorian_abc123def456ghi789jkl012mno345'

  - name: Internal Service Token
    pattern: 'internal_token_[a-f0-9]{64}'
    examples:
      - 'internal_token_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
```

Use custom rules:

```bash
noseyparker scan --datastore np-datastore --rules-path custom-rules.yml .
```

## False Positive Handling

### Common False Positives

```bash
# Placeholder in documentation
# File: docs/api-guide.md
api_key: "your-api-key-here"  # ✓ Obviously fake

# AWS example from documentation
# File: tests/fixtures/aws.json
{"AccessKeyId": "AKIAIOSFODNN7EXAMPLE"}  # ✓ AWS docs example

# Environment template
# File: .env.example
DATABASE_URL=postgres://user:password@localhost/db  # ✓ Template
```

### Ignoring Files/Paths

Create `.noseyparker.ignore` (gitignore-style):

```
# Test fixtures
tests/fixtures/
testdata/
**/test_*.json

# Documentation
docs/
*.md

# Examples and templates
*.example
*.template
.env.example
```

Use ignore file:

```bash
noseyparker scan --datastore np-datastore --ignore .noseyparker.ignore .
```

## Safe Examples in Documentation

**Make placeholders obviously fake:**

```bash
# ❌ BAD: Looks like real AWS key
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE123456"

# ✓ GOOD: Obviously fake
export AWS_ACCESS_KEY_ID="<your-aws-access-key-id>"
export AWS_ACCESS_KEY_ID="AKIA-REPLACE-WITH-YOUR-KEY"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Automated Workflow Script

```bash
#!/bin/bash
# scan-secrets.sh - Automated Nosey Parker scan for OSS prep

set -e

DATASTORE="np-datastore"
REPORT_JSON="noseyparker-report.json"

echo "==================================="
echo "Nosey Parker Secret Scan"
echo "==================================="

# Step 1: Scan repository
echo ""
echo "[1/3] Scanning repository for secrets..."
noseyparker scan --datastore "$DATASTORE" .

# Step 2: Generate JSON report
echo ""
echo "[2/3] Generating report..."
noseyparker report --datastore "$DATASTORE" --format json > "$REPORT_JSON"

# Step 3: Analyze results
echo ""
echo "[3/3] Analyzing results..."

total_matches=$(jq '.matches | length' "$REPORT_JSON")

if [ "$total_matches" -eq 0 ]; then
  echo "✓ SUCCESS: No secrets detected"
  exit 0
fi

# Count by rule type
echo ""
echo "Secrets found: $total_matches"
echo ""
echo "Breakdown by rule type:"
jq -r '.matches | group_by(.rule_name) | map("\(.| length) \(.[0].rule_name)") | .[]' "$REPORT_JSON"

# Show files with secrets (excluding tests/docs)
echo ""
echo "Files with secrets (excluding tests/docs):"
jq -r '.matches[] | select(.blob_metadata.path | test("test|doc|example") | not) | .blob_metadata.path' "$REPORT_JSON" | sort | uniq

# Critical findings
critical_rules="AWS|GitHub|Stripe|Generic Secret|Private Key"
critical_count=$(jq "[.matches[] | select(.rule_name | test(\"$critical_rules\"))] | length" "$REPORT_JSON")

echo ""
if [ "$critical_count" -gt 0 ]; then
  echo "🚨 CRITICAL: Found $critical_count high-risk secrets!"
  echo ""
  echo "High-risk findings:"
  jq -r ".matches[] | select(.rule_name | test(\"$critical_rules\")) | \"  - \(.rule_name): \(.blob_metadata.path)\"" "$REPORT_JSON"
  echo ""
  echo "⛔ DO NOT PROCEED WITH OSS RELEASE"
  echo ""
  echo "Required actions:"
  echo "1. Rotate all secrets found"
  echo "2. Remove secrets from code and git history"
  echo "3. Re-run scan to verify clean state"
  exit 1
else
  echo "⚠️  Found secrets but may be test data or false positives"
  echo "Manual review required: $REPORT_JSON"
  echo ""
  echo "Review each finding to determine if it's:"
  echo "- Test fixture (fake data)"
  echo "- Documentation example (placeholder)"
  echo "- Real secret requiring rotation"
  exit 0
fi
```

## Integration with OSS Release

### Phase 6 Summary Report

```markdown
## Security Scan Results

**Nosey Parker Scan:**
- **Total matches:** {total_count}
- **Unique files:** {file_count}
- **Git commits scanned:** {commit_count}
- **Rules triggered:** {rule_count}

### Findings by Rule Type

| Rule Name            | Count |
| -------------------- | ----- |
| AWS Access Key       | 3     |
| Generic Secret       | 5     |
| Private Key          | 1     |

### Critical Findings

{if critical_count > 0}
  ⛔ **CANNOT PROCEED WITH RELEASE**

  - AWS Access Key: `config/production.yml:12`
  - GitHub Token: `scripts/deploy.sh:45`

  **Required Actions:**
  1. Rotate all secrets immediately
  2. Remove from codebase
  3. Use git-filter-repo to remove from history if needed
  4. Re-scan to verify
{endif}

### Review Required

Files needing manual review:
- `tests/fixtures/fake_aws.json` - Verify test data
- `docs/api-examples.md` - Check if placeholders are obvious
```

## Advanced Features

### Scanning Multiple Repositories

```bash
# Scan multiple repos into same datastore
noseyparker scan --datastore shared-datastore /path/to/repo1
noseyparker scan --datastore shared-datastore /path/to/repo2

# Generate combined report
noseyparker report --datastore shared-datastore
```

### Incremental Scanning

```bash
# Initial scan
noseyparker scan --datastore np-datastore .

# Later: rescan only new/changed files
noseyparker scan --datastore np-datastore .

# Nosey Parker automatically handles incremental updates
```

### Git History Depth Control

```bash
# Scan only recent history (last 100 commits)
noseyparker scan --datastore np-datastore --max-depth 100 .

# Scan all history (default)
noseyparker scan --datastore np-datastore .
```

## When to Block Release

**Do NOT proceed with OSS release if Nosey Parker finds:**

- ✅ AWS access keys or secret keys
- ✅ GitHub personal access tokens or app tokens
- ✅ Stripe API keys (especially `sk_live_*`)
- ✅ Database connection strings with passwords
- ✅ Private keys (SSH, TLS, GPG)
- ✅ OAuth client secrets
- ✅ Any secrets in recent commits (< 30 days old)

**Safe to proceed (after review) if findings are:**

- Test fixtures with obviously fake data
- Documentation with `<placeholder>` or `your-key-here` style
- `.env.example` or `config.example` files
- Historical commits (> 1 year old) with rotated credentials

## Performance Tips

### Speed Up Scans

```bash
# Skip git history (filesystem only - much faster)
noseyparker scan --datastore np-datastore --no-git .

# Limit git depth
noseyparker scan --datastore np-datastore --max-depth 50 .

# Use multiple cores (default: all CPUs)
noseyparker scan --datastore np-datastore --num-threads 4 .
```

### Reduce Noise

```bash
# Scan with specific high-value rules only
noseyparker scan --datastore np-datastore \
  --rules "AWS,GitHub,Stripe,Generic Secret" .

# Use ignore file
noseyparker scan --datastore np-datastore --ignore .noseyparker.ignore .
```

## Troubleshooting

### "Datastore already exists" error

```bash
# Remove old datastore
rm -rf np-datastore

# Or use different name
noseyparker scan --datastore np-datastore-$(date +%Y%m%d) .
```

### Too many false positives from Generic Secret rule

```bash
# Exclude Generic Secret rule (use with caution)
noseyparker scan --datastore np-datastore \
  --rules "AWS,GitHub,Stripe,Private Key" .  # Note: no Generic Secret
```

### Need to search for specific string

```bash
# After scanning, grep the JSON
jq '.matches[] | select(.snippet.matching_input | contains("specific-string"))' noseyparker-report.json
```

## Git History Remediation

If secrets are found in git history:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove secrets from history
git-filter-repo --invert-paths --path config/secrets.yml

# Force push (ONLY for private repos, BEFORE going public)
git push --force origin main

# Verify secrets are gone
noseyparker scan --datastore np-datastore-verify .
```

**⚠️ WARNING**: Rewriting git history breaks existing clones. Only do this before going public.

## Resources

- Nosey Parker Repository: https://github.com/praetorian-inc/noseyparker
- Documentation: https://github.com/praetorian-inc/noseyparker/wiki
- Rule Catalog: https://github.com/praetorian-inc/noseyparker/blob/main/crates/noseyparker/data/default/rules/
- Praetorian Blog: https://www.praetorian.com/blog/
