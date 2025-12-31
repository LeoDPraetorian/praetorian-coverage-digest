# MySQL Fingerprintx Module Walkthrough

Complete example showing the orchestrator in action for MySQL protocol.

## Starting Context

**User request**: "Create a new MySQL fingerprintx plugin"

**Agent response**: "I'll use the orchestrating-fingerprintx-development skill to guide us through the complete workflow with enforced gates."

---

## Phase 1: Requirements Gathering

**Agent uses AskUserQuestion**:

```
Question: What service/protocol are we fingerprinting?
Answer: MySQL database server

Question: What are the default ports?
Answer: 3306 (primary), 33060 (X Protocol secondary)

Question: Is source code available?
Answer: Yes, https://github.com/mysql/mysql-server

Question: Are there similar protocols we need to distinguish from?
Answer: MariaDB (MySQL fork), Percona Server (MySQL derivative)

Question: Existing fingerprintx plugins to reference?
Answer: mongodb, postgresql (both database protocols with version detection)
```

**Artifact created**: `mysql-requirements.md`

```markdown
# MySQL Fingerprintx Module Requirements

## Service/Protocol Information
- **Name**: MySQL Database Server
- **Common Abbreviation**: MySQL
- **Default Port(s)**: 3306, 33060
- **Protocol Type**: TCP

## Source Code Availability
- **Status**: Open-source
- **Repository URL**: https://github.com/mysql/mysql-server
- **License**: GPL 2.0
- **Version Range**: 5.6.x - 8.0.x

## Similar Protocols (False Positive Risks)
| Protocol | Similarity | Distinguishing Feature |
|----------|------------|------------------------|
| MariaDB | HIGH | Different capability flags, version string prefix |
| Percona Server | MEDIUM | Same protocol, different version strings |

## Existing Reference Plugins
- **mongodb** - Database protocol with handshake-based detection
- **postgresql** - Database protocol with version extraction from handshake

## Detection Goals
- [x] Detect protocol with ≥95% accuracy
- [x] Distinguish from MariaDB/Percona
- [x] Extract version information
- [x] Generate precise CPE

## Research Phase Determination
- **Version Research**: REQUIRED
- **Reason**: Source available at github.com/mysql/mysql-server
```

**TodoWrite status**: ✅ Phase 1 complete

---

## Phase 2: Open-Source Decision Point

**Decision logic**:
```
Source repository: https://github.com/mysql/mysql-server (provided)
→ version_research = REQUIRED
```

**Recorded decision**: "Version research REQUIRED - will proceed to Phase 4 after Phase 3"

**TodoWrite status**: ✅ Phase 2 complete

---

## Phase 3: Protocol Research (BLOCKING GATE)

**Agent invokes**: `Read('.claude/skill-library/development/capabilities/researching-protocols/SKILL.md')`

**Agent follows 7-phase researching-protocols workflow**:

1. **Codebase Review**: Check existing `mongodb` and `postgresql` plugins for patterns
2. **Documentation Review**: MySQL protocol documentation, handshake packet structure
3. **Lab Setup**: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=test mysql:8.0.40`
4. **Active Probing**: Send client handshake, capture server response
5. **Pattern Identification**: Capability flags, protocol version, server version string
6. **False Positive Mitigation**: Test against MariaDB, identify distinguishing features
7. **Documentation**: Create protocol research document

**Key findings**:
- MySQL sends initial handshake packet without client request
- Handshake contains: protocol version (0x0a), server version string, capability flags (2 bytes)
- MariaDB uses same handshake format but different capability flag values
- Distinguishing feature: `MARIADB_CLIENT_PROGRESS` flag only in MariaDB

**Artifact created**: `mysql-protocol-research.md`

<details>
<summary>mysql-protocol-research.md content</summary>

```markdown
# MySQL Protocol Research

## Detection Strategy Summary

MySQL detection uses initial server handshake packet analysis. Server sends handshake immediately upon connection without client request. Handshake contains protocol version, server version string, and capability flags. Distinguished from MariaDB via capability flag differences.

## Lab Environment

- **Docker Image**: mysql:8.0.40
- **Container Command**: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=test mysql:8.0.40`
- **Test Port**: 3306
- **Test Date**: 2025-12-30

## Detection Probes

### Primary Probe

**Description**: Connect to port 3306 and wait for initial handshake packet

**Sequence**:
```
(No data sent - server sends first)
```

**Expected Response** (hex dump):
```
0a                    # Protocol version (10)
38 2e 30 2e 34 30 00  # Server version "8.0.40\0"
...                   # Thread ID, salt, capabilities
ff f7                 # Capability flags (little-endian)
...                   # Character set, status, more capabilities
```

**Validation Pattern**:
- Byte 0 = 0x0a (protocol version 10)
- Null-terminated version string at bytes 1-N
- Capability flags at predictable offset

### Secondary Probe (Fallback)

**Description**: If no initial handshake, send client handshake and analyze response

**Sequence**:
```
(Standard MySQL client handshake packet)
```

**Expected Response**:
```
(Error packet with MySQL-specific error code)
```

## Response Validation Patterns

| Pattern Type | Bytes/Regex | Purpose |
|--------------|-------------|---------|
| Protocol Version | Byte 0 = 0x0a | Confirms MySQL protocol family |
| Version String | Bytes 1-N, null-terminated | Extract MySQL version |
| Capability Flags | Offset varies, 2-4 bytes | Feature detection, MariaDB distinction |

## False Positive Mitigation

### Similar Protocol: MariaDB

- **Risk Level**: HIGH
- **Distinguishing Feature**: Capability flags differ
  - MySQL 8.x: `CLIENT_DEPRECATE_EOF` (0x01000000) set
  - MariaDB 10.x: `MARIADB_CLIENT_PROGRESS` (0x00000020) set
- **Validation Check**: Check version string for "MariaDB" prefix, or capability flag differences

### Similar Protocol: Percona Server

- **Risk Level**: LOW
- **Distinguishing Feature**: Version string contains "Percona"
- **Validation Check**: Parse version string, check for "Percona" substring
- **Note**: Uses MySQL protocol, acceptable to identify as MySQL with Percona version

## Edge Cases

- **Case 1**: Very old MySQL (5.5.x and earlier) - may use different capability flag structure
  - **Handling**: Check protocol version byte, fallback to basic version string parsing
- **Case 2**: MySQL X Protocol (port 33060) - different handshake format
  - **Handling**: Separate detection logic for port 33060, or limit to port 3306
- **Case 3**: MySQL with SSL - handshake wrapped in SSL
  - **Handling**: Attempt both plaintext and SSL handshake

## Implementation Notes

- **Two-Phase Detection**:
  - Detect: Confirm MySQL protocol via handshake structure
  - Enrich: Extract version from version string and capability flags
- **Timeout Handling**: Wait 5s for initial handshake, timeout = not MySQL
- **Error Cases**: Connection refused = port closed (not MySQL), malformed response = investigate further
```

</details>

**Gate Check**:

- [x] Protocol detection strategy document exists
- [x] Detection probes identified (primary: wait for handshake, secondary: send client handshake)
- [x] Response validation patterns documented (protocol version, version string, capability flags)
- [x] Lab environment tested (Docker mysql:8.0.40, mariadb:10.11)
- [x] False positive mitigation addressed (MariaDB capability flags, Percona version string)

**Gate status**: ✅ PASS - All conditions met

**TodoWrite status**: ✅ Phase 3 complete

---

## Phase 4: Version Marker Research (CONDITIONAL GATE)

**Condition check**: `version_research = REQUIRED` → Proceed with Phase 4

**Agent invokes**: `Read('.claude/skill-library/development/capabilities/researching-version-markers/SKILL.md')`

**Agent follows 8-phase researching-version-markers workflow**:

1. **Source Repository Access**: Clone https://github.com/mysql/mysql-server
2. **Version Selection**: Select 8.0.40, 8.0.23, 8.0.4, 5.7.44, 5.6.51
3. **Source Code Analysis**: Search for capability flag changes, default value changes
4. **Version Comparison**: Diff between versions to find distinguishing markers
5. **Marker Extraction**: Document markers with confidence levels
6. **Matrix Construction**: Build decision tree for version classification
7. **Validation**: Test matrix against Docker containers
8. **Documentation**: Create version fingerprint matrix

**Key findings**:
- MySQL 8.0.23+ uses `caching_sha2_password` as default authentication plugin
- MySQL 8.0.4-8.0.22 uses `mysql_native_password` + `CLIENT_DEPRECATE_EOF` flag
- MySQL 5.7.x lacks `CLIENT_DEPRECATE_EOF` flag
- MySQL 5.6.x and earlier have older capability flag structure

**Artifact created**: `mysql-version-matrix.md`

<details>
<summary>mysql-version-matrix.md content</summary>

```markdown
# MySQL Version Fingerprint Matrix

## Source Repository

- **URL**: https://github.com/mysql/mysql-server
- **Analyzed Versions**: 8.0.40, 8.0.23, 8.0.4, 5.7.44, 5.6.51
- **Analysis Date**: 2025-12-30

## Version Ranges

### Version Range 1: 8.0.23 - 8.0.x (Latest)

**Distinguishing Markers**:

| Marker | Type | Confidence | Description |
|--------|------|------------|-------------|
| `caching_sha2_password` default | Default Value | HIGH | Default authentication plugin changed in 8.0.23 |
| `CLIENT_DEPRECATE_EOF` flag | Capability Flag | HIGH | Set in all 8.0.4+ versions |
| Version string prefix | Version String | HIGH | Starts with "8.0." |

**CPE Format**: `cpe:2.3:a:oracle:mysql:8.0.{minor}:::::::*`

**Example CPE**: `cpe:2.3:a:oracle:mysql:8.0.40:::::::*`

### Version Range 2: 8.0.4 - 8.0.22

**Distinguishing Markers**:

| Marker | Type | Confidence | Description |
|--------|------|------------|-------------|
| `mysql_native_password` default | Default Value | HIGH | Default authentication plugin before 8.0.23 |
| `CLIENT_DEPRECATE_EOF` flag | Capability Flag | HIGH | Set in all 8.0.4+ versions |
| Version string prefix | Version String | HIGH | Starts with "8.0." and minor version 4-22 |

**CPE Format**: `cpe:2.3:a:oracle:mysql:8.0.{minor}:::::::*`

**Example CPE**: `cpe:2.3:a:oracle:mysql:8.0.22:::::::*`

### Version Range 3: 5.7.x

**Distinguishing Markers**:

| Marker | Type | Confidence | Description |
|--------|------|------------|-------------|
| No `CLIENT_DEPRECATE_EOF` flag | Capability Flag | HIGH | Flag not present in 5.7.x |
| `mysql_native_password` default | Default Value | HIGH | Default authentication plugin |
| Version string prefix | Version String | HIGH | Starts with "5.7." |

**CPE Format**: `cpe:2.3:a:oracle:mysql:5.7.{minor}:::::::*`

**Example CPE**: `cpe:2.3:a:oracle:mysql:5.7.44:::::::*`

### Version Range 4: 5.6.x and earlier

**Distinguishing Markers**:

| Marker | Type | Confidence | Description |
|--------|------|------------|-------------|
| Older capability flag structure | Capability Flag | MEDIUM | Different flag layout |
| Version string prefix | Version String | HIGH | Starts with "5.6." or earlier |

**CPE Format**: `cpe:2.3:a:oracle:mysql:5.6.{minor}:::::::*`

**Example CPE**: `cpe:2.3:a:oracle:mysql:5.6.51:::::::*`

## Decision Tree

```
1. Parse version string from handshake
   ├── Starts with "8.0." → Check minor version
   │   ├── Minor >= 23 → Version Range 1 (8.0.23+)
   │   └── Minor < 23 → Version Range 2 (8.0.4-8.0.22)
   ├── Starts with "5.7." → Version Range 3 (5.7.x)
   └── Starts with "5.6." or earlier → Version Range 4 (5.6.x)

2. If version string parsing fails, use capability flags:
   ├── CLIENT_DEPRECATE_EOF present → 8.0.4+ (Check auth plugin)
   │   ├── caching_sha2_password → 8.0.23+
   │   └── mysql_native_password → 8.0.4-8.0.22
   └── CLIENT_DEPRECATE_EOF absent → 5.7.x or earlier
```

## Confidence Levels

- **HIGH**: Deterministic marker, always present in version range (version string, capability flags)
- **MEDIUM**: Probabilistic marker, usually present (default auth plugin - can be overridden)
- **LOW**: Heuristic marker, best guess (connection behavior, timing)

## Fallback CPE

When version cannot be determined: `cpe:2.3:a:oracle:mysql:*:::::::*`
```

</details>

**Gate Check**:

- [x] Version Fingerprint Matrix exists
- [x] At least 3 version ranges distinguishable (4 ranges: 8.0.23+, 8.0.4-8.0.22, 5.7.x, 5.6.x)
- [x] Marker categories documented (capability flags, defaults, version strings)
- [x] Confidence levels assigned (HIGH for version string, MEDIUM for auth plugin)
- [x] CPE format defined (cpe:2.3:a:oracle:mysql:{version}:::::::*)

**Gate status**: ✅ PASS - All conditions met

**TodoWrite status**: ✅ Phase 4 complete

---

## Phase 5: Implementation

**Agent invokes**: `Read('.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md')`

**Agent follows fingerprintx implementation patterns**:

**Files created/modified**:

1. `pkg/plugins/services/mysql/mysql.go` - Plugin implementation
2. `pkg/plugins/types.go` - Add `MYSQL = "mysql"` constant
3. `pkg/scan/plugin_list.go` - Register mysql plugin

**Key implementation details** (simplified):

```go
// pkg/plugins/services/mysql/mysql.go
package mysql

import (
    "net"
    "time"
)

type MYSQLPlugin struct{}

func (p *MYSQLPlugin) Name() string { return "mysql" }
func (p *MYSQLPlugin) PortPriority(port uint16) bool {
    return port == 3306
}
func (p *MYSQLPlugin) Type() string { return "MYSQL" }

// Detect phase: Confirm MySQL protocol
func (p *MYSQLPlugin) Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error) {
    // Wait for initial handshake packet from server
    response, err := plugins.Recv(conn, timeout)
    if err != nil {
        return nil, err
    }

    // Validate handshake structure
    if len(response) < 10 || response[0] != 0x0a {
        return nil, plugins.ErrNotMySQL
    }

    // Basic protocol confirmed
    service := &plugins.Service{
        Protocol: "mysql",
    }
    return service, nil
}

// Enrich phase: Extract version
func (p *MYSQLPlugin) Version(conn net.Conn, timeout time.Duration, target plugins.Target) (string, error) {
    // Re-read handshake for version extraction
    response, err := plugins.Recv(conn, timeout)
    if err != nil {
        return "", err
    }

    // Extract version string (null-terminated, starting at byte 1)
    versionBytes := []byte{}
    for i := 1; i < len(response); i++ {
        if response[i] == 0x00 {
            break
        }
        versionBytes = append(versionBytes, response[i])
    }

    version := string(versionBytes)

    // Check for MariaDB
    if strings.Contains(version, "MariaDB") {
        return "", plugins.ErrNotMySQL // Reject MariaDB
    }

    return version, nil
}

// CPE generation based on version matrix
func (p *MYSQLPlugin) CPE() string {
    // Will be populated with version from Version()
    // Format: cpe:2.3:a:oracle:mysql:{version}:::::::*
    return "cpe:2.3:a:oracle:mysql:*:::::::*" // Fallback
}
```

**Implementation Checklist**:

- [x] Plugin directory created: `pkg/plugins/services/mysql/`
- [x] Plugin struct with 5 methods implemented
- [x] Type constant added to `pkg/plugins/types.go` (alphabetically)
- [x] Plugin registered in `pkg/scan/plugin_list.go` (alphabetically)
- [x] Two-phase detection (detect in Run(), enrich in Version())
- [x] Version extraction using version string parsing
- [x] CPE generation with version substitution

**TodoWrite status**: ✅ Phase 5 complete

---

## Phase 6: Validation (BLOCKING GATE)

**Build verification**:

```bash
$ cd modules/fingerprintx
$ go build ./...
# No errors

$ go vet ./...
# No issues found
```

**Test execution**:

```bash
$ go test ./pkg/plugins/services/mysql/... -v
=== RUN   TestMYSQLDetect
--- PASS: TestMYSQLDetect (0.01s)
=== RUN   TestMYSQLVersion
--- PASS: TestMYSQLVersion (0.02s)
=== RUN   TestMYSQLFalsePositive_MariaDB
--- PASS: TestMYSQLFalsePositive_MariaDB (0.01s)
PASS
ok      fingerprintx/pkg/plugins/services/mysql 0.050s
```

**Manual verification** (multi-version testing):

```bash
# Test 1: MySQL 8.0.40
$ docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=test mysql:8.0.40
$ ./fingerprintx -t localhost:3306 --json
{
  "host": "localhost",
  "port": 3306,
  "protocol": "mysql",
  "version": "8.0.40",
  "cpe": "cpe:2.3:a:oracle:mysql:8.0.40:::::::*"
}
✅ PASS

# Test 2: MySQL 5.7.44
$ docker run -d -p 3307:3306 -e MYSQL_ROOT_PASSWORD=test mysql:5.7.44
$ ./fingerprintx -t localhost:3307 --json
{
  "host": "localhost",
  "port": 3307,
  "protocol": "mysql",
  "version": "5.7.44",
  "cpe": "cpe:2.3:a:oracle:mysql:5.7.44:::::::*"
}
✅ PASS

# Test 3: MySQL 5.6.51
$ docker run -d -p 3308:3306 -e MYSQL_ROOT_PASSWORD=test mysql:5.6.51
$ ./fingerprintx -t localhost:3308 --json
{
  "host": "localhost",
  "port": 3308,
  "protocol": "mysql",
  "version": "5.6.51",
  "cpe": "cpe:2.3:a:oracle:mysql:5.6.51:::::::*"
}
✅ PASS

# Test 4: MariaDB 10.11 (false positive test)
$ docker run -d -p 3309:3306 -e MYSQL_ROOT_PASSWORD=test mariadb:10.11
$ ./fingerprintx -t localhost:3309 --json
{
  "host": "localhost",
  "port": 3309,
  "protocol": "mariadb",  # Correctly rejected as not MySQL
  "version": "10.11.10-MariaDB",
  "cpe": "cpe:2.3:a:mariadb:mariadb:10.11.10:::::::*"
}
✅ PASS (false positive avoided)
```

**Version detection accuracy**: 4/4 = 100%

**Artifact created**: `mysql-validation-report.md`

**Gate Check**:

- [x] Code compiles without errors
- [x] Go vet passes
- [x] Tests pass (3/3)
- [x] Manual verification succeeds (4/4 versions)
- [x] Version detection matches matrix predictions (100% accuracy)
- [x] CPE generated correctly (validated against CPE 2.3 format)

**Gate status**: ✅ PASS - All conditions met

**TodoWrite status**: ✅ Phase 6 complete

---

## Phase 7: Integration & PR Preparation

**Final checklist**:

- [x] All files in correct locations (`pkg/plugins/services/mysql/`, types.go, plugin_list.go)
- [x] Type constants alphabetically ordered (MYSQL comes after MONGODB, before POSTGRESQL)
- [x] Plugin import alphabetically ordered (mysql import in correct position)
- [x] Package comment documents detection strategy
- [x] Version compatibility noted in comments (5.6.x - 8.0.x tested)
- [x] No TODO comments for CPE or version

**Artifact created**: `mysql-pr-description.md`

<details>
<summary>mysql-pr-description.md content</summary>

```markdown
## New Fingerprintx Plugin: MySQL

### Detection Strategy

- **Primary probe**: Wait for initial server handshake packet (MySQL sends first)
- **Fallback**: Send client handshake if no initial packet received
- **Validation**: Check protocol version byte (0x0a), parse version string, validate capability flags

### Version Detection

- **Versions distinguishable**: 8.0.23+, 8.0.4-8.0.22, 5.7.x, 5.6.x
- **Method**: Version string parsing (HIGH confidence) + capability flags (MEDIUM confidence)
- **Accuracy**: 100% across tested versions (4/4)

### Testing

- [x] Tested against MySQL 8.0.40
- [x] Tested against MySQL 5.7.44
- [x] Tested against MySQL 5.6.51
- [x] CPE generation verified
- [x] False positive mitigation tested (vs MariaDB)

### Research Documents

**Protocol Research**: [Inline below]

<details>
<summary>Protocol Research Document</summary>

{Contents of mysql-protocol-research.md}

</details>

**Version Matrix**: [Inline below]

<details>
<summary>Version Fingerprint Matrix</summary>

{Contents of mysql-version-matrix.md}

</details>

### Implementation Notes

- **Plugin location**: `pkg/plugins/services/mysql/mysql.go`
- **Type constant**: `MYSQL` (added to `pkg/plugins/types.go`)
- **Registration**: Added to `pkg/scan/plugin_list.go`
- **Two-phase detection**: Implemented (detect protocol in Run(), enrich with version in Version())

### Edge Cases Handled

- MariaDB false positive: Rejected via version string check ("MariaDB" substring)
- Percona Server: Identified as MySQL with Percona version string (acceptable)
- MySQL X Protocol (port 33060): Not handled (standard MySQL protocol only)
- SSL-wrapped handshake: Not handled (plaintext handshake only)

### Validation Report

See mysql-validation-report.md for complete test results.

**Summary**: 100% detection accuracy, 100% version accuracy, MariaDB false positive successfully avoided.
```

</details>

**TodoWrite status**: ✅ Phase 7 complete

---

## Workflow Complete

**All artifacts in** `.claude/features/2025-12-30-mysql-fingerprintx/`:

- `MANIFEST.yaml`
- `mysql-requirements.md`
- `mysql-protocol-research.md`
- `mysql-version-matrix.md`
- `mysql-validation-report.md`
- `mysql-pr-description.md`

**All gates passed**:
- ✅ Phase 3 (Protocol Research) - All 5 conditions met
- ✅ Phase 4 (Version Marker Research) - All 5 conditions met
- ✅ Phase 6 (Validation) - All 6 conditions met

**Plugin ready for PR**:
- Code compiles and tests pass
- 100% version detection accuracy
- False positive mitigation working
- Complete documentation

**Time invested**:
- Phase 1-2: 30 minutes (requirements gathering)
- Phase 3: 2 hours (protocol research with lab testing)
- Phase 4: 3 hours (version marker research with source analysis)
- Phase 5: 1.5 hours (implementation)
- Phase 6: 1 hour (validation)
- Phase 7: 30 minutes (PR preparation)
- **Total: ~8.5 hours** (within expected 6-10 hour range for open-source protocol)

**Prevented issues**:
- Without Phase 3: Would have missed MariaDB false positive (30% failure rate)
- Without Phase 4: Would have used wildcard CPE mysql:* (50% of value lost)
- Without Phase 6: Would have shipped with untested edge cases

**ROI of gates**: 8.5 hours invested prevented estimated 85 hours of debugging and technical debt fixes (10x multiplier).
