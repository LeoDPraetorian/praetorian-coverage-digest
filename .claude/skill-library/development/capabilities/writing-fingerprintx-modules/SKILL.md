---
name: writing-fingerprintx-modules
description: Use when creating fingerprintx service fingerprinting plugins - guides through plugin interface, type system, wire protocols, and two-phase detection patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Writing Fingerprintx Modules

**Create service fingerprinting plugins for the fingerprintx tool.**

## When to Use

Use this skill when:

- Creating a new protocol detection plugin for fingerprintx
- Adding fingerprinting support for a new service (Memcached, Cassandra, etc.)
- Understanding the fingerprintx plugin architecture
- Implementing wire protocol parsing for service detection

**Location:** `modules/fingerprintx/`

## Quick Reference

| Step | Action | Files Modified |
|------|--------|----------------|
| 1 | Create plugin directory | `pkg/plugins/services/{protocol}/` |
| 2 | Implement Plugin interface | `{protocol}.go` |
| 3 | Add type constants | `pkg/plugins/types.go` |
| 4 | Register plugin import | `pkg/scan/plugin_list.go` |
| 5 | Test against real service | Manual verification |

## Plugin Interface (5 Methods)

Every plugin must implement these methods:

```go
type Plugin interface {
    // Main fingerprinting logic - returns Service on match, nil on no match
    Run(conn net.Conn, timeout time.Duration, target Target) (*Service, error)

    // Returns true if port is the default for this protocol
    PortPriority(port uint16) bool

    // Protocol name constant (e.g., "mongodb", "redis")
    Name() string

    // Protocol type: TCP, TCPTLS, or UDP
    Type() Protocol

    // Execution order (lower = higher priority, use -1 to run before HTTP)
    Priority() int
}
```

## File Checklist

### 1. Plugin Implementation

**Path:** `pkg/plugins/services/{protocol}/{protocol}.go`

```go
package {protocol}

import (
    "net"
    "time"

    "github.com/praetorian-inc/fingerprintx/pkg/plugins"
    utils "github.com/praetorian-inc/fingerprintx/pkg/plugins/pluginutils"
)

const PROTOCOL_NAME = "{protocol}"

type Plugin struct{}

func init() {
    plugins.RegisterPlugin(&Plugin{})
}

func (p *Plugin) Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error) {
    // Phase 1: Detection
    // Phase 2: Enrichment (version, metadata)
    // Return: plugins.CreateServiceFrom(target, payload, isTLS, version, plugins.TCP)
}

func (p *Plugin) PortPriority(port uint16) bool {
    return port == DEFAULT_PORT // e.g., 27017 for MongoDB
}

func (p *Plugin) Name() string {
    return PROTOCOL_NAME
}

func (p *Plugin) Type() plugins.Protocol {
    return plugins.TCP // or plugins.TCPTLS, plugins.UDP
}

func (p *Plugin) Priority() int {
    return 100 // Use -1 if protocol can coexist with HTTP on same port
}
```

### 2. Type System Integration

**Path:** `pkg/plugins/types.go`

Add three things:

```go
// 1. Protocol constant (alphabetical order in const block)
const (
    // ... existing constants ...
    Proto{Name} = "{protocol}"
    // ... existing constants ...
)

// 2. Service struct with metadata fields
type Service{Name} struct {
    CPEs    []string `json:"cpes,omitempty"`
    Version string   `json:"version,omitempty"`
    // Add protocol-specific fields
}

func (e Service{Name}) Type() string { return Proto{Name} }

// 3. Add case in Metadata() switch (around line 175)
case Proto{Name}:
    var p Service{Name}
    _ = json.Unmarshal(e.Raw, &p)
    return p
```

### 3. Plugin Registration

**Path:** `pkg/scan/plugin_list.go`

Add blank import (alphabetical order):

```go
import (
    // ... existing imports ...
    _ "github.com/praetorian-inc/fingerprintx/pkg/plugins/services/{protocol}"
    // ... existing imports ...
)
```

## Two-Phase Detection Strategy

Follow MongoDB's proven pattern:

### Phase 1: Detection

Determine if the service matches the protocol:

```go
func detect{Protocol}(conn net.Conn, timeout time.Duration) (bool, error) {
    // 1. Build protocol-specific probe
    probe := build{Protocol}Probe()

    // 2. Send probe and receive response
    response, err := utils.SendRecv(conn, probe, timeout)
    if err != nil {
        return false, err
    }

    // 3. Validate response structure
    if !isValid{Protocol}Response(response) {
        return false, &utils.InvalidResponseError{Service: PROTOCOL_NAME}
    }

    return true, nil
}
```

### Phase 2: Enrichment

Extract version and metadata (only after detection succeeds):

```go
func enrich{Protocol}(conn net.Conn, timeout time.Duration) (string, map[string]interface{}) {
    // Try to get version info (may fail if auth required)
    version := tryGetVersion(conn, timeout)

    // Extract additional metadata
    metadata := extractMetadata(conn, timeout)

    // Return empty values gracefully if enrichment fails
    return version, metadata
}
```

### Fallback Strategies

For protocols with multiple versions:

1. **Try modern command first** (e.g., `hello` for MongoDB 4.4+)
2. **Fall back to legacy command** (e.g., `isMaster` for older versions)
3. **Try alternate wire protocol** if available (e.g., OP_MSG vs OP_QUERY)

## Network I/O Patterns

### Request/Response

```go
// Combined send and receive
response, err := utils.SendRecv(conn, request, timeout)

// Separate operations (for multi-step protocols)
err := utils.Send(conn, request, timeout)
response, err := utils.Recv(conn, timeout)
```

### Response Validation

```go
func isValidResponse(response []byte) (bool, error) {
    // 1. Check minimum length
    if len(response) < MIN_RESPONSE_SIZE {
        return false, &utils.InvalidResponseErrorInfo{
            Service: PROTOCOL_NAME,
            Info:    "response too short",
        }
    }

    // 2. Validate magic bytes/opcodes
    if response[0] != EXPECTED_MAGIC {
        return false, &utils.InvalidResponseErrorInfo{
            Service: PROTOCOL_NAME,
            Info:    "invalid magic byte",
        }
    }

    // 3. Check message length field matches actual length
    declaredLen := binary.LittleEndian.Uint32(response[0:4])
    if len(response) < int(declaredLen) {
        return false, &utils.InvalidResponseErrorInfo{
            Service: PROTOCOL_NAME,
            Info:    "incomplete response",
        }
    }

    return true, nil
}
```

## CPE Generation

Generate Common Platform Enumeration strings for vulnerability tracking:

```go
func buildCPE(version string) string {
    if version == "" {
        return ""
    }
    // Format: cpe:2.3:a:{vendor}:{product}:{version}:*:*:*:*:*:*:*
    return fmt.Sprintf("cpe:2.3:a:{vendor}:{product}:%s:*:*:*:*:*:*:*", version)
}
```

## Priority Guidelines

| Priority | Use When |
|----------|----------|
| -1 | Protocol may coexist with HTTP on same port (MongoDB, some DBs) |
| 0-50 | High-priority protocols (SSH, common services) |
| 100 | Default for most protocols |
| 200+ | Low-priority, try after others |

## Protocol Type Reference

| Type | Description | Example Protocols |
|------|-------------|-------------------|
| `plugins.TCP` | Plain TCP connection | Redis, MongoDB, MySQL |
| `plugins.TCPTLS` | TLS-wrapped TCP | HTTPS, LDAPS, IMAPS |
| `plugins.UDP` | UDP datagram | DNS, SNMP, NTP |

## Example Plugins to Study

| Complexity | Plugin | Path | Pattern |
|------------|--------|------|---------|
| Simple | Redis | `pkg/plugins/services/redis/` | Text protocol, single probe |
| Complex | MongoDB | `pkg/plugins/services/mongodb/` | Binary protocol, two-phase, fallbacks |
| TLS | HTTPS | `pkg/plugins/services/https/` | TLS handling, Wappalyzer |
| UDP | DNS | `pkg/plugins/services/dns/` | UDP protocol handling |

## Testing Checklist (REQUIRED)

**All items are REQUIRED before PR submission. Not optional.**

Before submitting a new plugin:

- [ ] Test against multiple service versions
- [ ] Test auth-required scenarios (detection should still work)
- [ ] Test timeout handling (slow/unresponsive services)
- [ ] Test malformed response handling (graceful failures)
- [ ] **CPE generation implemented** (required for vulnerability tracking)
- [ ] **Version extraction implemented** (required for CPE)
- [ ] Run `go build ./...` to verify compilation
- [ ] Test with `fingerprintx -t localhost:{port} --json`

**Do NOT submit with "TODO: add CPE later" or "TODO: add version extraction".**
These are core requirements, not nice-to-haves.

## Documentation Requirements

Each plugin should include:

1. **Package comment** - Protocol overview and detection strategy
2. **Wire protocol documentation** - Message structures (see MongoDB example)
3. **Version compatibility matrix** - Which versions support which features
4. **Fallback explanation** - How older/newer versions are handled

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Forgetting to register in `plugin_list.go` | Plugin won't be discovered |
| Wrong priority (HTTP blocks detection) | Use -1 for DB protocols on HTTP ports |
| Not handling auth-required | Detection should succeed, enrichment can fail |
| Hardcoded timeouts | Always use the `timeout` parameter |
| Missing error types | Use `utils.InvalidResponseErrorInfo` |

## Common Rationalizations (DO NOT USE)

| Rationalization | Why It's Wrong |
|-----------------|----------------|
| "Older plugins don't have CPEs" | Legacy debt. New plugins must have CPE. |
| "CPE is marked `omitempty`" | That's for JSON output, not a license to skip. |
| "Ship it, iterate later" | TODOs have ~10% completion rate. Do it now. |
| "Two-phase is only for complex protocols" | It's the standard pattern. Detection + Enrichment always. |
| "It works manually, so it's done" | Working != Complete. Follow the checklist. |
| "Time pressure - merge now, fix later" | Technical debt compounds. Take the time. |

**If you catch yourself making these excuses, STOP.** Go back to the skill and complete all requirements.

## References

- [Wire Protocol Patterns](references/wire-protocol-patterns.md) - Binary protocol parsing
- [MongoDB PR #45](https://github.com/praetorian-inc/fingerprintx/pull/45) - Comprehensive example
- [Plugin Utils API](references/plugin-utils-api.md) - Network I/O helpers

## Related Skills

| Skill | Purpose |
|-------|---------|
| `gateway-backend` | Go development patterns |
| `gateway-capabilities` | Other security tool development |
| `developing-with-tdd` | Test-driven development workflow |
