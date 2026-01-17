---
name: customizing-nighthawk-profiles
description: Customizes Nighthawk C2 profiles per-engagement with legitimate data to remove static indicators. Use when preparing Nighthawk profiles for red team operations or need to vary C2 configurations across engagements.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Customizing Nighthawk Profiles

**AI-assisted workflow for customizing Nighthawk C2 profiles per-engagement, removing static indicators and generating unique configurations with legitimate-looking data.**

## When to Use

Use this skill when:

- Preparing a Nighthawk C2 profile for a new red team engagement
- Need to remove static indicators from baseline profiles
- Want to generate engagement-specific customizations (User-Agents, URIs, assembly names, etc.)
- Customizing HTTP malleable profiles with legitimate traffic patterns
- Implementing domain fronting to mimic specific services (Zoom, Google Meet, Slack, Teams)
- Ensuring OPSEC by varying C2 configurations across operations
- Validating profile modifications don't break operational functionality

## Quick Reference

| Phase                 | Purpose                                       | Key Actions                             |
| --------------------- | --------------------------------------------- | --------------------------------------- |
| 1. Baseline Load      | Import template profile                       | Read JSON, validate structure           |
| 2. Engagement Context | Gather client/engagement details              | Collect industry, target info, timeline |
| 3. Customization      | Generate realistic, engagement-specific data  | Modify headers, URIs, User-Agents, etc. |
| 4. OPSEC Validation   | Verify operational security                   | Check for static indicators             |
| 5. Profile Validation | Ensure JSON integrity and functional settings | Syntax check, validate critical fields  |
| 6. Output             | Write customized profile                      | Save JSON, generate deployment notes    |

## Prerequisites

**Before using this skill:**

1. **Nighthawk Documentation**: Have access to Nighthawk profile documentation (typically `/Assets/StaticFiles/agent/Profile/index.html`)
2. **Baseline Profile**: Start with a working template profile (not an empty/broken one)
3. **Engagement Information**: Know the target organization, industry, and operational context
4. **OPSEC Requirements**: Understand which indicators need customization for this engagement

**Not required but helpful:**

- Previous engagement profiles for reference
- Target organization's legitimate web traffic patterns
- Industry-specific User-Agent strings and HTTP headers

## Core Workflow

### Phase 1: Baseline Load and Validation

**Purpose**: Load the template profile and understand its structure before making modifications.

```bash
# Read the baseline profile
cat /path/to/baseline-profile.json

# Validate JSON syntax
jq . /path/to/baseline-profile.json > /dev/null && echo "Valid JSON"
```

**Critical validation checks:**

- JSON is well-formed (no syntax errors)
- Contains required top-level sections: `c2-profile.api`, `c2-profile.strategy`, `c2-profile.general-config`
- Has either `egress-config` or `p2p-config` (depending on agent type)

**See**: [references/profile-structure.md](references/profile-structure.md) for complete Nighthawk profile anatomy

### Phase 2: Gather Engagement Context

**Use AskUserQuestion to collect:**

1. **Client/Target Information**:
   - Organization name
   - Industry vertical (finance, healthcare, tech, manufacturing, etc.)
   - Geographic location

2. **Engagement Details**:
   - Engagement code name or identifier
   - Timeline (start/end dates for `expire-after` field)
   - Specific OPSEC requirements

3. **Customization Scope**:
   - Which profile sections need modification?
   - Any static indicators from previous engagements to avoid?
   - Specific traffic patterns to mimic?

**See**: [references/engagement-questionnaire.md](references/engagement-questionnaire.md) for complete question template

### Phase 3: Profile Customization

**Critical Rule**: Modify ONLY cosmetic/indicator fields. **NEVER** change operational settings without user confirmation.

#### 3.1 Safe-to-Modify Fields (Indicators)

**CRITICAL**: Static indicators include **BOTH** top-level fields **AND** identifiers embedded in URIs (query parameters, file IDs, RPC IDs, sync tokens, meeting IDs, version numbers).

**HTTP Profile Customization** (`c2-profile.egress-config` or `c2-profile.server-config`):

```json
{
  "egress-config": {
    "commands": {
      "status": {
        "build-request": {
          "uri": "/api/v2/telemetry/status",  // ← Customize path AND query params
          "method": "POST",
          "headers": {
            "User-Agent": "...",  // ← Customize
            "Content-Type": "application/json",
            "X-Client-Version": "2.1.4"  // ← Customize
          }
        }
      }
    }
  }
}
```

**⚠️ Query Parameters & URI Identifiers** (Often Overlooked):
```json
// ❌ WRONG: Reusing same query parameters across engagements
{
  "path": "/_/meet/data/poll?meeting=conf&v=5.17"  // Static: meeting=conf, v=5.17
  "path": "/drive/v3/files/1abc123?fields=*"       // Static: fileId=1abc123
}

// ✅ CORRECT: Randomize per engagement
{
  "path": "/_/meet/data/poll?meeting=yb3fNHLL&v=5.37"  // Unique meeting ID, varied version
  "path": "/drive/v3/files/qJmPQubl1EbZ0Bt?fields=*"  // Unique file ID
}
```

**Assembly Names** (`.NET execution stomping):

```json
{
  "general-config": {
    "code-modules": {
      "encoders": [{
        "stomp-assembly-name": "System.Web.Mobile, Version=4.0.0.0, ..."  // ← Customize
      }]
    }
  }
}
```

**Spawn-to Processes**:

```json
{
  "general-config": {
    "injector": {
      "spawn-to": "c:\\windows\\system32\\rundll32.exe",  // ← Customize
      "parent-process": "explorer.exe"  // ← Customize
    }
  }
}
```

**See**: [references/customizable-fields.md](references/customizable-fields.md) for complete field catalog

#### 3.2 Fields to NEVER Modify (Operational)

❌ **DO NOT modify without explicit user approval:**

- `interval`, `jitter` - Affects beacon timing
- `expire-after` - Unless setting engagement-specific expiration
- `opsec.*` - Operational security settings (syscalls, encryption, etc.)
- `api.host`, `api.port` - Operations server connection
- `strategy` - C2 channel type

**See**: [references/operational-fields.md](references/operational-fields.md) for complete list and explanations

#### 3.3 Generating Legitimate Data

**User-Agent Strings**: Match target industry and timeframe

```
Financial Services:
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

Healthcare (older systems):
  "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko"

Tech Company (modern):
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
```

**URI Paths**: Industry-appropriate API patterns

```
Finance: /api/v2/accounts/balance, /services/banking/transfer
Healthcare: /fhir/r4/Patient, /api/ehr/records
SaaS: /api/telemetry/metrics, /v1/analytics/events
Manufacturing: /scada/telemetry, /api/inventory/status
```

**Custom Headers**: Match organizational patterns

```
X-Request-ID: {uuid}
X-Client-Version: {semantic-version}
X-Correlation-ID: {uuid}
X-Tenant-ID: {engagement-specific-identifier}
```

**Assembly Stomp Names**: Use legitimate .NET assemblies

```
System.Web.Mobile, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a
System.Data.OracleClient, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089
System.ServiceModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089
```

**See**: [references/data-generation.md](references/data-generation.md) for comprehensive data generation patterns

### Phase 4: OPSEC Validation

**Before finalizing, check for static indicators:**

1. **Grep for test/placeholder data:**
   ```bash
   grep -i "test\|example\|placeholder\|todo" customized-profile.json
   ```

2. **Check for duplicate strings across engagements:**
   - Compare with previous profiles to ensure uniqueness
   - Verify no reused UUIDs, timestamps, or identifiers

3. **Validate realistic data:**
   - User-Agents match legitimate browsers (current versions)
   - URIs follow REST/API conventions for target industry
   - Assembly names are real .NET assemblies

4. **Verify operational settings unchanged:**
   - `interval`, `jitter` match baseline
   - OPSEC settings (`syscalls`, `unhook-dlls`, etc.) preserved
   - Encryption and evasion configurations intact

**See**: [references/opsec-checklist.md](references/opsec-checklist.md) for complete validation checklist

### Phase 5: Profile Validation

**JSON Integrity:**

```bash
# Validate JSON syntax
jq . customized-profile.json > /dev/null && echo "✅ Valid JSON" || echo "❌ Syntax Error"

# Check required sections exist
jq '.["c2-profile"].api, .["c2-profile"].strategy, .["c2-profile"]["general-config"]' customized-profile.json
```

**Functional Validation:**

- All UUIDs are valid v4 format
- Timestamps are valid Unix time
- Semantic versions follow `major.minor.patch` format
- File paths use correct separators (Windows: `\\`, forward-refs: `/`)

**Common Errors:**

| Error                      | Cause                     | Fix                      |
| -------------------------- | ------------------------- | ------------------------ |
| Trailing comma in JSON     | Extra `,` before `}`      | Remove trailing commas   |
| Unescaped backslashes      | Single `\` in strings     | Use `\\` for Windows paths |
| Missing required fields    | Deleted operational field | Restore from baseline    |
| Invalid assembly name      | Typo in `PublicKeyToken`  | Verify against real .NET assembly |

**See**: [references/validation-patterns.md](references/validation-patterns.md) for advanced validation techniques

### Phase 6: Output and Documentation

**Save customized profile:**

```bash
# Save with engagement-specific name
cp customized-profile.json /path/to/engagements/{client-name}-{date}-profile.json
```

**Generate deployment notes:**

Create a `deployment-notes.md` file documenting:

1. **Customizations Made**:
   - Which fields were modified
   - Rationale for specific choices (e.g., "Used Chrome 120 User-Agent to match target's corporate browser policy")

2. **Validation Results**:
   - JSON syntax check passed
   - OPSEC checklist completed
   - No static indicators detected

3. **Deployment Instructions**:
   - Command to deploy profile: `DeployTool.exe --profile {profile-name}.json --server {ops-server}`
   - Expected C2 listener endpoints
   - Verification steps (test beacon connectivity)

**See**: [references/deployment-workflow.md](references/deployment-workflow.md) for deployment best practices

## Critical Rules

1. **JSON Integrity**: Always validate JSON syntax after modifications. Broken JSON will prevent profile deployment.

2. **Operational Settings**: NEVER modify operational fields (`interval`, `jitter`, `opsec.*`) without explicit user confirmation. These affect C2 functionality.

3. **Assembly Uniqueness**: All `.NET` assembly stomp names must be unique within the profile to avoid conflicts.

4. **Randomize ALL Identifiers**: Static indicators include encryption keys, assembly names, **AND** identifiers in URIs (query parameters like `rpcids=`, `meeting=`, `v=`, file IDs, sync tokens). Randomize per engagement.

5. **Realistic Data**: Use legitimate, current data (User-Agents, URIs, headers). Avoid obviously synthetic values like "test.com" or "example.org".

6. **Engagement-Specific**: Customize based on actual engagement context (industry, target, timeline). Don't reuse profiles across engagements.

7. **OPSEC Validation**: Always run the OPSEC checklist before finalizing. Static indicators compromise operations.

8. **Baseline Preservation**: Keep original baseline profile intact. Work on a copy for engagement-specific modifications.

9. **Documentation**: Document all customizations in deployment notes. Future operators need to understand your choices.

## Common Anti-Patterns

**See**: [references/anti-patterns.md](references/anti-patterns.md) for detailed explanations

❌ **"Good enough" data**: Using obvious test values like "Mozilla/5.0 Test Agent"
✅ **Correct**: Research legitimate User-Agent strings for target environment

❌ **Blind modification**: Changing fields without understanding their operational impact
✅ **Correct**: Consult profile documentation, modify only cosmetic fields

❌ **Reusing profiles**: Copy-pasting previous engagement profiles without customization
✅ **Correct**: Generate unique data per engagement, even from same baseline

❌ **Skipping validation**: Assuming modifications won't break JSON syntax
✅ **Correct**: Run `jq` validation after every edit, check OPSEC checklist

❌ **No documentation**: Deploying without deployment notes or rationale
✅ **Correct**: Document customizations for operational continuity

## Integration

### Called By

- `/nighthawk` command (to be created) - CLI command for profile customization
- Manual invocation when red team operators prepare for engagements
- Integration with engagement planning workflows

### Requires (invoke before starting)

None - standalone skill. However, these skills enhance the workflow:

| Skill                  | When             | Purpose                              |
| ---------------------- | ---------------- | ------------------------------------ |
| `using-skills`         | First invocation | Understanding how to invoke skills   |
| `verifying-before-completion` | Phase 6  | Final validation before deployment   |

### Calls (during execution)

| Skill | Phase | Purpose |
| ----- | ----- | ------- |
| None  | N/A   | Self-contained workflow |

### Pairs With (conditional)

| Skill                           | Trigger                      | Purpose                          |
| ------------------------------- | ---------------------------- | -------------------------------- |
| `orchestrating-research`        | Need industry traffic patterns | Research legitimate User-Agents, URIs |
| `developing-with-tdd`           | Creating validation scripts  | TDD for profile validation tools |

## Examples

**See**: [examples/](examples/) for complete examples:

- `examples/finance-engagement.md` - Financial services engagement profile customization
- `examples/healthcare-engagement.md` - Healthcare industry profile with legacy User-Agents
- `examples/saas-engagement.md` - Modern SaaS company profile

## Related Skills

- `orchestrating-research` - Research legitimate traffic patterns and industry-specific data
- `verifying-before-completion` - Final validation checklist before deployment
- `developing-with-tdd` - Create validation scripts with TDD methodology

## References

- [references/profile-structure.md](references/profile-structure.md) - Nighthawk profile anatomy
- [references/customizable-fields.md](references/customizable-fields.md) - Safe-to-modify field catalog
- [references/operational-fields.md](references/operational-fields.md) - Never-modify field catalog
- [references/data-generation.md](references/data-generation.md) - Generating legitimate data patterns
- [references/opsec-checklist.md](references/opsec-checklist.md) - Operational security validation
- [references/validation-patterns.md](references/validation-patterns.md) - Advanced validation techniques
- [references/deployment-workflow.md](references/deployment-workflow.md) - Deployment best practices
- [references/anti-patterns.md](references/anti-patterns.md) - Common mistakes and how to avoid them
- [references/engagement-questionnaire.md](references/engagement-questionnaire.md) - Context gathering template

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
