---
name: researching-version-markers
description: Use when researching open-source codebases to identify version-specific markers for precise version fingerprinting - analyzes source code across releases to build Version Fingerprint Matrices for fingerprintx enrichment phase
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebSearch, WebFetch, TodoWrite, AskUserQuestion
---

# Researching Version Markers

**Research open-source codebases to identify version-specific markers that enable precise version fingerprinting in fingerprintx modules.**

## When to Use

Use this skill when:

- Target software is open-source with accessible repository (GitHub, GitLab, etc.)
- Need version-specific detection, not just protocol identification
- Want precise CPE generation (e.g., `cpe:2.3:a:oracle:mysql:8.0.23` vs `mysql:8.0.x` vs `mysql:*`)
- Building fingerprintx module enrichment phase
- **AFTER completing researching-protocols** (protocol detection strategy must exist first)

## When NOT to Use

- Target is closed-source (use black-box probing only)
- Only need protocol detection without version granularity
- Haven't completed researching-protocols yet (this skill requires protocol detection strategy as input)
- For non-fingerprinting research (use researching-github directly)

## Prerequisites

1. Completed `researching-protocols` skill for the target
2. Protocol detection strategy document exists
3. Know or can find the source repository URL
4. Understanding of target's release cadence (frequent patches vs rare releases)

## Key Insight

**Protocol detection is stable** (wire formats rarely change) → `researching-protocols` handles this

**Version detection changes constantly** (every release) → THIS SKILL handles this

For open-source projects, we can analyze source code to build precise version fingerprint matrices instead of relying solely on black-box probing.

## Quick Reference

| Phase                     | Purpose                          | Output                   | Time   |
| ------------------------- | -------------------------------- | ------------------------ | ------ |
| 1. Repository Setup       | Locate source, identify handlers | Handler file paths       | 5 min  |
| 2. Release Strategy       | Define N releases, Y timeframe   | Release enumeration plan | 3 min  |
| 3. Release Enumeration    | List releases to analyze         | Tag list with dates      | 5 min  |
| 4. Handler Identification | Find protocol/wire code          | File paths per release   | 10 min |
| 5. Cross-Version Diff     | Compare code across releases     | Change log               | 15 min |
| 6. Marker Categorization  | Classify detectable changes      | Categorized markers      | 10 min |
| 7. Matrix Construction    | Build version fingerprint matrix | Implementation guide     | 15 min |
| 8. Validation             | Test against live versions       | Verified matrix          | 20 min |

**Total time**: 60-90 minutes

## Progress Tracking (MANDATORY)

**You MUST use TodoWrite before starting:**

```
1. "Set up repository access for {protocol}" (Phase 1)
2. "Define release strategy for {protocol}" (Phase 2)
3. "Enumerate releases for {protocol}" (Phase 3)
4. "Identify handler files for {protocol}" (Phase 4)
5. "Analyze cross-version diffs for {protocol}" (Phase 5)
6. "Categorize version markers for {protocol}" (Phase 6)
7. "Construct version fingerprint matrix for {protocol}" (Phase 7)
8. "Validate matrix against live services for {protocol}" (Phase 8)
```

---

## Workflow

### Phase 1: Repository Setup

**Goal:** Locate the official source repository and identify protocol handler files.

1. **Invoke researching-github skill** to locate source repository:

   ```
   Read(".claude/skill-library/claude/skill-management/researching-github/SKILL.md")
   ```

2. **Validate repository is official/canonical** (not a fork):
   - Check star count, contributors, last commit
   - Verify organization ownership (e.g., `mysql/mysql-server` not `random-user/mysql-fork`)

3. **Identify protocol handler file paths**:
   - Common patterns: `protocol.c`, `wire.go`, `handler.rs`, `server.py`, `conn.c`
   - Use `gh search code` or browse repository structure
   - See [Common Protocol Handlers](references/common-protocol-handlers.md)

4. **Document**:
   - Repository URL
   - Default branch (main/master/develop)
   - Handler file paths

### Phase 2: Release Strategy

**Goal:** Define parameters for release analysis.

**Define parameters:**

| Parameter           | Default | Range  | Guidance                                                     |
| ------------------- | ------- | ------ | ------------------------------------------------------------ |
| N (releases)        | 15-20   | 10-30  | More for fast-releasing projects (MySQL releases frequently) |
| Y (years)           | 3       | 2-5    | Enterprise environments run 3-5 year old versions            |
| Include patches     | Yes     | Yes/No | Yes for granular detection (8.0.23 vs 8.0.22)                |
| Include prereleases | No      | Yes/No | Only for bleeding-edge detection                             |

**Consider release cadence:**

- MySQL: Frequent patches → include more releases
- PostgreSQL: Slower cadence → focus on minor versions
- Redis: Major version boundaries more important

**Document rationale** for parameter choices.

### Phase 3: Release Enumeration

**Goal:** List releases to analyze, ordered newest to oldest.

Use gh CLI to list release tags:

```bash
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | head -20
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[].tag_name' | head -20
```

**Filter to N releases within Y timeframe:**

- Parse dates from release metadata
- Skip prereleases unless requested
- Note major version boundaries (e.g., 8.0.0, 5.7.0)

**Output:** Ordered list from newest to oldest

See [Release Enumeration Patterns](references/release-enumeration-patterns.md) for GitHub, GitLab, and Bitbucket commands.

### Phase 4: Handler Identification

**Goal:** For each major version, identify protocol handler files.

**Common file patterns by language:**

| Language | Patterns                                                  |
| -------- | --------------------------------------------------------- |
| C/C++    | `protocol.c`, `wire.c`, `conn.c`, `handler.c`, `server.c` |
| Go       | `protocol.go`, `wire.go`, `handler.go`, `conn.go`         |
| Rust     | `protocol.rs`, `wire.rs`, `handler.rs`                    |
| Python   | `protocol.py`, `handler.py`, `server.py`                  |

**Use gh search code:**

```bash
gh search code "protocol handshake" --repo={owner}/{repo}
gh search code "wire format" --repo={owner}/{repo}
```

**Document:**

- File paths (may change between major versions)
- Any file renames or restructures

See [Common Protocol Handlers](references/common-protocol-handlers.md) for detailed patterns.

### Phase 5: Cross-Version Diff Analysis

**Goal:** Identify behavioral changes between release pairs.

**For each release pair (v[n] vs v[n-1]):**

1. Fetch handler files at each tag:

   ```bash
   gh api repos/{owner}/{repo}/contents/{path}?ref={tag-v1}
   gh api repos/{owner}/{repo}/contents/{path}?ref={tag-v2}
   ```

2. Diff for behavioral changes:
   - Response construction
   - Capability flags
   - Default values
   - Error handling

3. Document changes with commit references

**Focus on:** Changes that affect observable behavior (responses, flags, defaults), not internal refactors.

### Phase 6: Marker Categorization

**Goal:** Classify discovered changes into marker categories.

| Category                | Description                        | Example                                        | Detection Method        |
| ----------------------- | ---------------------------------- | ---------------------------------------------- | ----------------------- |
| **Capability Flags**    | Bit flags in handshake/negotiation | `CLIENT_DEPRECATE_EOF` in MySQL 8.0            | Check specific bits     |
| **Default Configs**     | Default auth, charset, modes       | `caching_sha2_password` default in MySQL 8.0.4 | Parse config fields     |
| **New Features**        | Commands, protocol extensions      | `COM_RESET_CONNECTION` in MySQL 5.7.3          | Probe for feature       |
| **Error Formats**       | Error codes, message wording       | New error codes per version                    | Trigger and parse error |
| **Banner Strings**      | Version embedded in responses      | `'5.7.44-log'` vs `'8.0.23'`                   | Parse banner/greeting   |
| **Protocol Extensions** | Optional capabilities              | X Protocol in MySQL 8.0+                       | Negotiate extension     |

**For each marker:**

- Document which versions it applies to
- Document the probe needed to reveal it
- Document the expected response pattern
- Note confidence level (high/medium/low)

See [Marker Categories](references/marker-categories.md) for deep dive on each category with examples.

### Phase 7: Matrix Construction

**Goal:** Build the Version Fingerprint Matrix.

Use the template from [Version Matrix Template](references/version-matrix-template.md).

**Matrix structure:**

````markdown
## Version Fingerprint Matrix: {Protocol}

**Generated:** {date}
**Releases Analyzed:** {N} releases over {Y} years
**Repository:** {url}

### Detection Flow

[Decision tree showing probe order]

### Matrix

| Version Range | Marker Type     | Probe     | Response Pattern                             | Confidence |
| ------------- | --------------- | --------- | -------------------------------------------- | ---------- |
| 8.0.23+       | Default Config  | Handshake | default_auth=caching_sha2_password           | High       |
| 8.0.4-8.0.22  | Default Config  | Handshake | default_auth=mysql_native, has DEPRECATE_EOF | High       |
| 8.0.0-8.0.3   | Capability Flag | Handshake | has DEPRECATE_EOF, default_auth=mysql_native | High       |
| 5.7.x         | Capability Flag | Handshake | no DEPRECATE_EOF flag                        | High       |
| 5.6.x         | Banner          | Handshake | version string starts with '5.6'             | Medium     |

### Implementation Guidance

```go
func enrichMySQL(conn net.Conn, timeout time.Duration) (string, map[string]interface{}) {
    handshake := parseHandshake(response)

    if handshake.DefaultAuth == "caching_sha2_password" {
        return "8.0.23+", nil
    }
    if handshake.Capabilities & CLIENT_DEPRECATE_EOF != 0 {
        return "8.0.4-8.0.22", nil
    }
    // ... continue decision tree
}
```
````

### Caveats

- Forks may differ from upstream
- Custom builds may have patches
- Configuration can override defaults

````

**Output feeds directly into `writing-fingerprintx-modules` enrichment phase.**

### Phase 8: Validation

**Goal:** Test matrix against real services.

1. **Spin up Docker containers** for representative versions:
   ```bash
   docker run -d -p 3306:3306 --name mysql-8.0.23 mysql:8.0.23
   docker run -d -p 3307:3306 --name mysql-5.7.44 mysql:5.7.44
````

2. **Test each probe** from the matrix:
   - Connect to service
   - Send probe
   - Verify response pattern matches prediction

3. **Document any discrepancies**:
   - Patches that change behavior
   - Compile flags that affect responses
   - Configuration overrides

4. **Update matrix** with validation status

---

## Integration Points

- **Invokes:** `researching-github` skill (for repository discovery and source analysis)
- **Input from:** `researching-protocols` (protocol detection strategy, must exist)
- **Output to:** `writing-fingerprintx-modules` (Version Fingerprint Matrix feeds enrichment phase)

## Output Artifacts

1. **Version Fingerprint Matrix** (primary deliverable)
   - Structured table of version → marker → probe → response
   - Detection flow/decision tree
   - Implementation code snippets

2. **Research Notes** (supporting)
   - Repository analysis notes
   - Release enumeration
   - Raw diff findings

---

## Example: MySQL Version Fingerprinting

Walk through a concrete example:

1. **Repository:** `mysql/mysql-server` on GitHub
2. **Handler files:** `sql/protocol_classic.cc`, `sql/auth/...`
3. **Releases:** mysql-8.0.40 down to mysql-5.7.0 (15 releases over 3 years)
4. **Key findings:**
   - 8.0.4: `caching_sha2_password` became default auth
   - 8.0.0: `CLIENT_DEPRECATE_EOF` flag added
   - 5.7.3: `COM_RESET_CONNECTION` added
5. **Matrix enables:** Distinguish 8.0.23+ vs 8.0.4-8.0.22 vs 8.0.0-8.0.3 vs 5.7.x vs 5.6.x

**This level of precision enables CPEs like:**

- `cpe:2.3:a:oracle:mysql:8.0.23:*:*:*:*:*:*:*` (specific patch)
- vs `cpe:2.3:a:oracle:mysql:8.0:*:*:*:*:*:*:*` (generic minor)
- vs `cpe:2.3:a:oracle:mysql:*:*:*:*:*:*:*:*` (any version)

---

## Common Rationalizations (DO NOT SKIP STEPS)

| Rationalization                     | Why It's Wrong                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| "I can just probe a few versions"   | Source analysis reveals markers you'd never discover via probing             |
| "Version detection isn't important" | Precise CPEs enable vulnerability correlation                                |
| "The banner has the version"        | Banners can be spoofed, compiled out, or configured; capability flags cannot |
| "This is too much work"             | One-time research enables permanent version detection                        |
| "I'll analyze all 100 releases"     | Diminishing returns; focus on version boundaries where behavior changes      |
| "3 years is too far back"           | Enterprise environments commonly run 3-5 year old software                   |
| "Just use the latest release"       | You need to know what OLD versions look like to detect them                  |

---

## Related Skills

| Skill                            | Access Method                                                                                  | Purpose                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **researching-protocols**        | `Read(".claude/skill-library/research/researching-protocols/SKILL.md")`                        | Protocol detection research (BEFORE this skill) |
| **writing-fingerprintx-modules** | `Read(".claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md")` | Implementation (AFTER this skill)               |
| **researching-github**           | `Read(".claude/skill-library/claude/skill-management/researching-github/SKILL.md")`            | Repository discovery and source analysis        |
| **gateway-capabilities**         | `skill: "gateway-capabilities"`                                                                | Routes to capability development skills         |

---

## References

- [Release Enumeration Patterns](references/release-enumeration-patterns.md) - gh CLI commands for different forges
- [Marker Categories](references/marker-categories.md) - Deep dive on each marker type with examples
- [Version Matrix Template](references/version-matrix-template.md) - Copy-paste template for output
- [Common Protocol Handlers](references/common-protocol-handlers.md) - Where to find protocol code by language
