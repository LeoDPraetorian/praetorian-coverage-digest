# Dynamic Field Validation

How to validate fields before using them in graph queries. **Never rely on memorized or hardcoded field lists.**

## Source of Truth

All valid filter fields are defined in:

```
modules/chariot/backend/pkg/query/allowed_columns.go
```

This file contains 200+ fields and is updated frequently as new entity types and properties are added.

## Validation Commands

### Check Single Field

```bash
# Does "fieldname" exist in allowed columns?
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go
```

If no output, the field is NOT valid.

### Search by Pattern

```bash
# Find all cloud-related fields
grep -i "cloud" modules/chariot/backend/pkg/query/allowed_columns.go

# Find all status-related fields
grep -i "status" modules/chariot/backend/pkg/query/allowed_columns.go

# Find all date/time fields
grep -iE "created|updated|visited|expires" modules/chariot/backend/pkg/query/allowed_columns.go
```

### Count Total Fields

```bash
grep "true" modules/chariot/backend/pkg/query/allowed_columns.go | wc -l
```

### List All Fields

```bash
grep "true" modules/chariot/backend/pkg/query/allowed_columns.go | \
  sed 's/"//g' | sed 's/:.*//g' | sed 's/^[[:space:]]*//' | sort
```

## Common Field Categories

### Status & State

- `status` - Entity status (A=Active, T=Triage, etc.)
- `created` - Creation timestamp
- `updated` - Last update timestamp
- `visited` - Last visited timestamp
- `expires` - Expiration date

### Identity & Classification

- `key` - Primary identifier
- `name` - Display name
- `class` - Entity class (domain, ipv4, cidr, etc.)
- `type` - Entity type
- `source` - Discovery source
- `origin` - Data origin

### Security Scoring

- `cvss` - CVSS score (0-10)
- `epss` - EPSS probability (0-1)
- `kev` - Known Exploited Vulnerability flag
- `exploit` - Exploit availability flag
- `priority` - Risk priority

### Cloud Resources

- `cloudService` - Cloud provider (aws, azure, gcp)
- `cloudAccount` - Cloud account ID
- `cloudId` - Cloud resource ID
- `cloudRoot` - Root cloud resource

### Network & DNS

- `dns` - DNS hostname
- `asname` - Autonomous System name
- `asnumber` - Autonomous System number
- `port` - Port number
- `protocol` - Network protocol

## Validation Workflow

### Before Writing a Query

1. **Identify fields you need**
2. **Validate each field exists:**
   ```bash
   grep -w "status" modules/chariot/backend/pkg/query/allowed_columns.go
   grep -w "cvss" modules/chariot/backend/pkg/query/allowed_columns.go
   ```
3. **If field not found:** Check for similar names or alternative fields
4. **Construct query** with validated fields only

### When You Get an Error

```
Error: "invalid filter column: badfield"
```

1. **Check the exact field name:**
   ```bash
   grep -w "badfield" modules/chariot/backend/pkg/query/allowed_columns.go
   ```

2. **If not found, search for similar:**
   ```bash
   grep -i "bad" modules/chariot/backend/pkg/query/allowed_columns.go
   ```

3. **Update your query** with a valid field

## Why Dynamic Validation?

1. **Fields change frequently** - New entity types add new fields
2. **Hardcoded lists drift** - The CLAUDE.md once had 45 fields, actual was 204
3. **Source file is authoritative** - It's what the backend actually validates against
4. **grep is fast** - Takes <1 second to verify

## Anti-Patterns

### Don't Memorize Field Lists

```typescript
// BAD: Assuming "foo" is valid because you remember it
{ field: 'foo', operator: '=', value: 'bar' }
```

### Don't Copy from Old Code Without Checking

```typescript
// BAD: Copying from old query without validating
// The field might have been renamed or removed
```

### Don't Skip Validation for "Common" Fields

```typescript
// BAD: Assuming common fields are always valid
// Even "status" could theoretically be renamed
```

## Best Practice

**Always grep before you query.** It takes 1 second and prevents debugging invalid field errors.
