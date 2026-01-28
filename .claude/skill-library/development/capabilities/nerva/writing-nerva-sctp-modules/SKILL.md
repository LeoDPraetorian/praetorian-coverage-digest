---
name: writing-nerva-sctp-modules
description: Use when creating SCTP-based fingerprintx plugins for telecom/5G protocols - guides through plugin interface, SCTP semantics, and platform-specific patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Writing SCTP Fingerprintx Modules

**Create service fingerprinting plugins for SCTP-based protocols (Diameter, SIGTRAN, S1AP, NGAP).**

> **You MUST use TodoWrite** to track implementation progress when creating SCTP plugins to ensure no steps are skipped.

## When to Use

Use this skill when:

- Creating plugins for SCTP-based telecom protocols
- Fingerprinting Diameter servers over SCTP
- Implementing SIGTRAN protocol detection (M2PA, M2UA, M3UA)
- Detecting 5G network interfaces (S1AP, NGAP, X2AP)

**Location:** `modules/nerva/pkg/plugins/services/{protocol}/`

## Platform Support

| Platform | Library | Features |
|----------|---------|----------|
| Linux | ishidawataru/sctp | Full SCTP features, multi-homing, multi-streaming |
| Mac/Windows | N/A | Returns clear error - SCTP requires Linux kernel |

**Important:** SCTP scanning requires the Linux kernel SCTP module (`modprobe sctp`). On non-Linux platforms, scanning returns `ErrSCTPNotSupported`.

## Quick Reference

| Step | Action | Files Modified |
|------|--------|----------------|
| 1 | Create plugin directory | `pkg/plugins/services/{protocol}/` |
| 2 | Implement Plugin interface | `{protocol}.go` |
| 3 | Add type constants | `pkg/plugins/types.go` |
| 4 | Register plugin import | `pkg/scan/plugin_list.go` |
| 5 | Test against real service | Manual verification (Linux only) |

## Plugin Interface (5 Methods)

Every SCTP plugin must implement:

```go
type Plugin interface {
    // Main fingerprinting logic
    Run(conn net.Conn, timeout time.Duration, target Target) (*Service, error)

    // Returns true if port is default for this protocol
    PortPriority(port uint16) bool

    // Protocol name (e.g., "diameter-sctp")
    Name() string

    // MUST return plugins.SCTP
    Type() Protocol

    // Execution order (lower = higher priority)
    Priority() int
}
```

## SCTP vs TCP Differences

| Concept | TCP | SCTP |
|---------|-----|------|
| Connection unit | Stream (byte-oriented) | Association (message-oriented) |
| Data boundaries | None (byte stream) | Preserved (messages) |
| Multi-homing | Not supported | Supported (multiple IPs per association) |
| Multi-streaming | Not supported | Supported (multiple streams per association) |
| Head-of-line blocking | Yes | No (per-stream ordering) |

### Key Implications for Plugins

1. **Message boundaries**: SCTP preserves message boundaries - you receive complete protocol messages, not arbitrary byte chunks
2. **Connection reuse**: Don't assume connection state persists like TCP - SCTP associations may have different lifetimes
3. **Error handling**: SCTP provides more detailed error information than TCP

## Plugin Template

```go
package diametersctp

import (
    "net"
    "time"

    "github.com/praetorian-inc/nerva/pkg/plugins"
    utils "github.com/praetorian-inc/nerva/pkg/plugins/pluginutils"
)

const PROTOCOL_NAME = "diameter-sctp"
const DEFAULT_PORT = 3868

type Plugin struct{}

func init() {
    plugins.RegisterPlugin(&Plugin{})
}

func (p *Plugin) Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error) {
    // Phase 1: Detection
    detected, err := detectDiameter(conn, timeout)
    if err != nil || !detected {
        return nil, err
    }

    // Phase 2: Enrichment
    version, metadata := enrichDiameter(conn, timeout)

    return plugins.CreateServiceFrom(
        target,
        metadata,
        false,           // TLS (SCTP doesn't use TLS in same way)
        version,
        plugins.SCTP,    // Transport type
    ), nil
}

func (p *Plugin) PortPriority(port uint16) bool {
    return port == DEFAULT_PORT
}

func (p *Plugin) Name() string {
    return PROTOCOL_NAME
}

func (p *Plugin) Type() plugins.Protocol {
    return plugins.SCTP  // CRITICAL: Must return SCTP
}

func (p *Plugin) Priority() int {
    return 100
}
```

## Two-Phase Detection Pattern

Follow the same pattern as TCP plugins:

### Phase 1: Detection

```go
func detectDiameter(conn net.Conn, timeout time.Duration) (bool, error) {
    // Build Diameter CER (Capabilities-Exchange-Request)
    probe := buildDiameterCER()

    // Send probe and receive response
    response, err := utils.SendRecv(conn, probe, timeout)
    if err != nil {
        return false, err
    }

    // Validate response is Diameter CEA
    if !isValidDiameterCEA(response) {
        return false, &utils.InvalidResponseError{Service: PROTOCOL_NAME}
    }

    return true, nil
}
```

### Phase 2: Enrichment

```go
func enrichDiameter(conn net.Conn, timeout time.Duration) (string, *ServiceDiameterSCTP) {
    metadata := &ServiceDiameterSCTP{}

    // Extract vendor/product from CEA response
    // May need additional commands for version

    return version, metadata
}
```

## Type System Integration

**Path:** `pkg/plugins/types.go`

Add service metadata struct:

```go
// In types.go const block (alphabetical order)
const ProtoDiameterSCTP = "diameter-sctp"

// Service metadata struct
type ServiceDiameterSCTP struct {
    CPEs    []string `json:"cpes,omitempty"`
    Version string   `json:"version,omitempty"`
    Vendor  string   `json:"vendor,omitempty"`
    Product string   `json:"product,omitempty"`
}

func (e ServiceDiameterSCTP) Type() string { return ProtoDiameterSCTP }

// In Metadata() switch, add case
case ProtoDiameterSCTP:
    var p ServiceDiameterSCTP
    _ = json.Unmarshal(e.Raw, &p)
    return p
```

## Testing Considerations

### Unit Tests (All Platforms)

```go
func TestDiameterSCTPProtocolParsing(t *testing.T) {
    // Test protocol parsing logic with mock data
    // No network required - works on all platforms
}

func TestDiameterSCTPMessageBuilding(t *testing.T) {
    // Test CER message construction
    cer := buildDiameterCER()
    assert.Equal(t, expectedLength, len(cer))
}
```

### Integration Tests (Linux Only)

```go
//go:build linux

package diametersctp

import (
    "testing"
)

func TestDiameterSCTPRealConnection(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping SCTP integration test in short mode")
    }

    // Requires Linux with SCTP kernel module
    // and a running Diameter server
}
```

### CI Configuration

```yaml
jobs:
  test-linux:
    runs-on: ubuntu-latest
    steps:
      - name: Enable SCTP kernel module
        run: sudo modprobe sctp
      - name: Run tests
        run: go test ./...

  test-mac:
    runs-on: macos-latest
    steps:
      - name: Run tests (SCTP tests skipped)
        run: go test ./... -short
```

## Common SCTP Ports

| Protocol | Port | Description |
|----------|------|-------------|
| Diameter | 3868 | AAA protocol for LTE/IMS |
| M2PA | 3565 | MTP2 User Peer-to-Peer Adaptation |
| M2UA | 2904 | MTP2 User Adaptation Layer |
| M3UA | 2905 | MTP3 User Adaptation Layer |
| SUA | 14001 | SCCP User Adaptation |
| S1AP | 36412 | LTE S1 Application Protocol |
| X2AP | 36422 | LTE X2 Application Protocol |
| NGAP | 38412 | 5G N2 Application Protocol |

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Assuming byte-stream semantics | SCTP preserves message boundaries - read complete messages |
| Forgetting platform check | Use `//go:build linux` for Linux-only tests |
| Not returning `plugins.SCTP` | Type() MUST return `plugins.SCTP`, not `plugins.TCP` |
| Ignoring multi-homing | Connection may come from different source IP than expected |
| Missing CPE generation | REQUIRED - implement buildCPE() for vulnerability tracking |
| Skipping version extraction | REQUIRED - extract version for accurate fingerprinting |

## CPE Generation

```go
func buildCPE(vendor, product, version string) string {
    if version == "" {
        return ""
    }
    // Format: cpe:2.3:a:{vendor}:{product}:{version}:*:*:*:*:*:*:*
    return fmt.Sprintf("cpe:2.3:a:%s:%s:%s:*:*:*:*:*:*:*",
        vendor, product, version)
}
```

## Priority Guidelines

| Priority | Use When |
|----------|----------|
| -1 | Protocol may coexist with TCP/HTTP on same port |
| 0-50 | High-priority telecom protocols |
| 100 | Default for most SCTP protocols |
| 200+ | Low-priority, try after others |

## Example: Diameter-SCTP Plugin Structure

```
pkg/plugins/services/diametersctp/
├── diametersctp.go        # Main plugin implementation
├── diametersctp_test.go   # Unit tests
├── detection.go           # Phase 1: detection logic
├── enrichment.go          # Phase 2: version/metadata extraction
└── messages.go            # Diameter message building helpers
```

## Related Skills

| Skill | Purpose |
|-------|---------|
| `writing-nerva-tcp-udp-modules` | Base patterns (TCP/UDP version) |
| `writing-nerva-tests` | Test patterns |
| `gateway-capabilities` | Capability development routing |
| `developing-with-tdd` | TDD methodology |

## Integration

### Called By

- `orchestrating-nerva-development` - SCTP plugin development workflow
- `orchestrating-capability-development` - General capability workflow

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - terminal skill providing patterns and templates

### Pairs With

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `writing-nerva-tests` | Test implementation | SCTP-specific test patterns |
| `developing-with-tdd` | Implementation | Test-first development |
| `verifying-before-completion` | PR ready | Final validation |
