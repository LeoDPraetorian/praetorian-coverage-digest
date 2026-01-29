# NoseyParker JSON Schema Reference

**Source**: Research synthesis from NoseyParker releases, GitHub discussions, and official documentation.

## Overview

NoseyParker uses a hierarchical data model: **Findings > Matches > Blobs**

A finding groups matches that share the same rule and capture groups. Each match is uniquely identified by rule, blob ID, start byte offset, and end byte offset.

## Schema Structure

```json
{
  "findings": [
    {
      "rule_text_id": "string",
      "rule_structural_id": "string",
      "structural_id": "string",
      "groups": ["base64-encoded-strings"],
      "matches": [
        {
          "blob_id": "sha1-digest",
          "start_byte": 0,
          "end_byte": 100,
          "provenance": [
            {
              "kind": "file",
              "path": "/path/to/file.js"
            }
          ],
          "snippet": {
            "before": "context before match",
            "matching": "the matched secret",
            "after": "context after match"
          }
        }
      ]
    }
  ]
}
```

## Field Reference

### Finding Level

| Field | Type | Description |
|-------|------|-------------|
| `rule_text_id` | string | Human-readable rule identifier |
| `rule_structural_id` | string | Internal rule identifier for deduplication |
| `structural_id` | string | Unique finding identifier |
| `groups` | string[] | Base64-encoded capture groups from regex |
| `matches` | array | Array of match objects |

### Match Level

| Field | Type | Description |
|-------|------|-------------|
| `blob_id` | string | SHA-1 digest of the blob (computed like git) |
| `start_byte` | number | Start byte offset in blob |
| `end_byte` | number | End byte offset in blob |
| `provenance` | array | Location metadata (max 3 by default) |
| `snippet` | object | Context around the match |

### Provenance Types

#### File Provenance
```json
{
  "kind": "file",
  "path": "/absolute/path/to/file.js"
}
```

#### Git Provenance
```json
{
  "kind": "git",
  "commit_oid": "abc123...",
  "pathname": "relative/path/in/repo.js"
}
```

#### Extended Provenance (v0.22.0+)
```json
{
  "kind": "extended",
  "payload": {
    "custom_field": "arbitrary JSON value"
  }
}
```

### Snippet Structure

| Field | Type | Description |
|-------|------|-------------|
| `before` | string | Context before match (default 256 bytes) |
| `matching` | string | The matched secret content |
| `after` | string | Context after match (default 256 bytes) |

**Configure snippet length**: `--snippet-length BYTES`

## AWS-Related Rules

Relevant NoseyParker rules for AWS secrets:

| Rule | Description |
|------|-------------|
| `aws-access-key-id` | AWS Access Key ID (AKIA...) |
| `aws-secret-access-key` | AWS Secret Access Key (40 chars) |
| `aws-account-id` | AWS Account ID (12 digits) |
| `aws-session-token` | AWS STS Session Token |

## Version Compatibility

### v0.17.0+ Changes
- `groups` field replaced `matching_input`
- Provenance is now an array (was single object)
- Added `rule_text_id`, `rule_structural_id`, `structural_id`

### v0.20.0+ Changes
- Extended enumerator support
- Custom provenance via `--enumerator=FILE`

### v0.22.0+ Changes
- Extended provenance wraps payload: `{"kind": "extended", "payload": {...}}`

### v0.23.0+ Changes
- Deduplication mechanism for matches with identical capture groups

## Parsing Recommendations

1. **Use lenient parsing** - ignore unknown fields for forward compatibility
2. **Plan for schema updates** - NoseyParker format is not officially stabilized
3. **Test parsers on upgrade** - format may change between minor versions
4. **Limit provenance processing** - default max 3 entries per match

## Example: Extracting AWS Findings

```python
import json
import base64

def extract_aws_findings(noseyparker_json):
    findings = []
    for finding in noseyparker_json.get("findings", []):
        rule = finding.get("rule_text_id", "")
        if "aws" in rule.lower():
            for match in finding.get("matches", []):
                findings.append({
                    "rule": rule,
                    "value": match.get("snippet", {}).get("matching", ""),
                    "file": match.get("provenance", [{}])[0].get("path", ""),
                    "groups": [base64.b64decode(g).decode() for g in finding.get("groups", [])]
                })
    return findings
```

## Sources

- https://github.com/praetorian-inc/noseyparker/releases
- https://github.com/praetorian-inc/noseyparker/issues/101
- https://github.com/praetorian-inc/noseyparker/discussions/138
- https://github.com/praetorian-inc/noseyparker/discussions/223
