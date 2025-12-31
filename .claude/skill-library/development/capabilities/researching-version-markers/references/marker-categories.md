# Marker Categories

**Deep dive on each version marker category with examples from common protocols.**

## Category 1: Capability Flags

**What:** Bit flags in handshake/negotiation packets that indicate protocol features.

**Why reliable:** Flags are part of the protocol specification and cannot be easily spoofed without breaking the protocol.

### Examples

| Protocol   | Version | Flag                               | Detection                        |
| ---------- | ------- | ---------------------------------- | -------------------------------- |
| MySQL      | 8.0.0+  | `CLIENT_DEPRECATE_EOF` (0x1000000) | Check bit 24 in capability flags |
| MySQL      | 5.7.0+  | `CLIENT_CONNECT_ATTRS` (0x100000)  | Check bit 20 in capability flags |
| PostgreSQL | 9.0+    | SSL support                        | Check for SSLRequest response    |

### How to Detect

```go
// MySQL example
func detectMySQLVersion(handshake []byte) string {
    caps := binary.LittleEndian.Uint32(handshake[13:17])

    const CLIENT_DEPRECATE_EOF = 0x1000000
    const CLIENT_CONNECT_ATTRS = 0x100000

    if caps & CLIENT_DEPRECATE_EOF != 0 {
        return "8.0.0+"
    }
    if caps & CLIENT_CONNECT_ATTRS != 0 {
        return "5.7.0+"
    }
    return "5.6.x or earlier"
}
```

### Confidence: HIGH

Capability flags are:

- Part of wire protocol specification
- Cannot be disabled without breaking clients
- Reliably indicate minimum version

---

## Category 2: Default Configs

**What:** Default values for authentication, character sets, modes, etc.

**Why reliable:** Defaults change between versions and are observable in handshake or initial connection.

### Examples

| Protocol   | Version | Default Change          | Detection              |
| ---------- | ------- | ----------------------- | ---------------------- |
| MySQL      | 8.0.4+  | `caching_sha2_password` | Parse auth plugin name |
| MySQL      | 5.7.x   | `mysql_native_password` | Parse auth plugin name |
| PostgreSQL | 10.0+   | `scram-sha-256`         | Check auth method      |

### How to Detect

```go
// MySQL auth plugin detection
func detectMySQLAuth(handshake []byte) string {
    // Parse auth plugin name from handshake packet
    authPlugin := extractAuthPlugin(handshake)

    switch authPlugin {
    case "caching_sha2_password":
        return "8.0.4+"
    case "mysql_native_password":
        return "5.7.x or 8.0.0-8.0.3"
    case "mysql_old_password":
        return "5.0.x or earlier"
    }
    return "unknown"
}
```

### Confidence: HIGH

Default configs are:

- Documented in release notes
- Observable without authentication
- Change predictably between versions

### Caveats

- Can be overridden by configuration
- Custom builds may change defaults
- Need to combine with other markers for precision

---

## Category 3: New Features

**What:** Commands, protocol extensions, or capabilities added in specific versions.

**Why reliable:** Feature presence indicates minimum version.

### Examples

| Protocol | Version | Feature                | Detection                            |
| -------- | ------- | ---------------------- | ------------------------------------ |
| MySQL    | 5.7.3+  | `COM_RESET_CONNECTION` | Send command, check response         |
| Redis    | 6.0+    | ACL commands           | Try `ACL LIST`                       |
| MongoDB  | 4.4+    | `hello` command        | Send `hello`, fallback to `isMaster` |

### How to Detect

```go
// MySQL COM_RESET_CONNECTION
func supportsResetConnection(conn net.Conn) bool {
    // Send COM_RESET_CONNECTION (0x1f)
    packet := []byte{0x01, 0x00, 0x00, 0x00, 0x1f}
    _, err := conn.Write(packet)
    if err != nil {
        return false
    }

    // If command is recognized, server responds
    response := make([]byte, 1024)
    n, err := conn.Read(response)
    if err != nil || n == 0 {
        return false
    }

    // OK packet or error packet (not "unknown command")
    return response[4] == 0x00 || (response[4] == 0xff && !isUnknownCommandError(response))
}
```

### Confidence: MEDIUM-HIGH

Feature detection is reliable but:

- May require authentication
- Adds extra round trip
- Could be disabled by configuration

---

## Category 4: Error Formats

**What:** Error code ranges, message formats, or error packet structures.

**Why reliable:** Error handling changes between versions.

### Examples

| Protocol   | Version | Error Change                      | Detection                 |
| ---------- | ------- | --------------------------------- | ------------------------- |
| MySQL      | 8.0+    | New error codes (3500-3999 range) | Trigger error, check code |
| PostgreSQL | 12.0+   | New error codes (XX\*\*\* range)  | Parse error response      |

### How to Detect

```go
// Trigger a deliberate error and parse response
func detectByError(conn net.Conn) string {
    // Send invalid SQL to trigger error
    _, err := conn.Write(buildQuery("SELECT INVALID_SYNTAX"))

    response := readPacket(conn)
    if response[0] == 0xff {  // Error packet
        errorCode := binary.LittleEndian.Uint16(response[1:3])

        if errorCode >= 3500 && errorCode <= 3999 {
            return "8.0+"
        }
    }
    return "unknown"
}
```

### Confidence: MEDIUM

Error detection is:

- Requires triggering errors (adds complexity)
- May require authentication
- Error codes can overlap between versions

---

## Category 5: Banner Strings

**What:** Version information embedded in greeting messages or responses.

**Why use cautiously:** Banners can be modified.

### Examples

| Protocol   | Version | Banner Format          | Detection            |
| ---------- | ------- | ---------------------- | -------------------- |
| MySQL      | Various | `5.7.44-log`           | Parse version string |
| PostgreSQL | Various | `PostgreSQL 15.3`      | Parse version string |
| Redis      | Various | `Redis server v=6.2.7` | Parse INFO response  |

### How to Detect

```go
// MySQL handshake banner
func parseVersion(handshake []byte) string {
    // Skip protocol version byte
    version := extractNullTerminatedString(handshake[1:])
    // version = "8.0.23-log" or "5.7.44"

    parts := strings.Split(version, ".")
    if len(parts) >= 2 {
        return fmt.Sprintf("%s.%s.x", parts[0], parts[1])
    }
    return "unknown"
}
```

### Confidence: LOW-MEDIUM

Banner strings are:

- Easy to parse
- Often available without authentication
- **But can be spoofed or compiled out**

Use banners as fallback only.

---

## Category 6: Protocol Extensions

**What:** Optional protocol features that can be negotiated.

**Why reliable:** Extensions indicate version ranges that support them.

### Examples

| Protocol   | Version | Extension               | Detection                          |
| ---------- | ------- | ----------------------- | ---------------------------------- |
| MySQL      | 8.0+    | X Protocol (port 33060) | Try connection on X Protocol port  |
| PostgreSQL | 9.1+    | Streaming replication   | Check for replication slot support |

### How to Detect

```go
// MySQL X Protocol detection
func supportsXProtocol(host string) bool {
    conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:33060", host), 5*time.Second)
    if err != nil {
        return false
    }
    defer conn.Close()

    // Try X Protocol handshake
    // If successful, version is 8.0+
    return true
}
```

### Confidence: MEDIUM

Protocol extensions are:

- Clear indicators of minimum version
- May require separate ports or negotiation
- Could be disabled by configuration

---

## Combining Markers

**Best practice:** Use multiple marker categories to build a decision tree.

```go
func detectPreciseVersion(conn net.Conn) string {
    handshake := readHandshake(conn)

    // 1. Check capability flags (HIGH confidence)
    if hasCapability(handshake, CLIENT_DEPRECATE_EOF) {
        // 2. Check default auth (HIGH confidence)
        auth := getDefaultAuth(handshake)
        if auth == "caching_sha2_password" {
            return "8.0.4+"
        }
        return "8.0.0-8.0.3"
    }

    // 3. Check for 5.7 features (MEDIUM confidence)
    if supportsResetConnection(conn) {
        return "5.7.3+"
    }

    // 4. Fallback to banner (LOW confidence)
    return parseBanner(handshake)
}
```

---

## Confidence Matrix

| Category            | Confidence | Pros                         | Cons                               |
| ------------------- | ---------- | ---------------------------- | ---------------------------------- |
| Capability Flags    | HIGH       | Protocol-level, cannot spoof | Requires parsing binary protocol   |
| Default Configs     | HIGH       | Observable without auth      | Can be overridden                  |
| New Features        | MEDIUM     | Clear version indicator      | May require auth, extra round trip |
| Error Formats       | MEDIUM     | Reliable when triggered      | Requires triggering errors         |
| Banner Strings      | LOW-MEDIUM | Easy to parse                | Can be spoofed/modified            |
| Protocol Extensions | MEDIUM     | Clear indicator              | May require separate connections   |

---

## Detection Reliability by Protocol

### MySQL: VERY HIGH

- Rich capability flags
- Well-documented default changes
- Strong version signals

### PostgreSQL: HIGH

- Clear feature boundaries
- Documented protocol changes
- Reliable error codes

### Redis: MEDIUM

- Relies heavily on INFO command (requires auth)
- Version in banner (can be modified)
- Feature detection works but requires auth

### MongoDB: MEDIUM-HIGH

- `hello` vs `isMaster` commands
- Wire protocol opcodes (OP_MSG vs OP_QUERY)
- Reliable but requires protocol knowledge
