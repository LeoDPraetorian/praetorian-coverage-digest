# Version Fingerprint Matrix Template

**Copy-paste template for Version Fingerprint Matrix output.**

---

## Version Fingerprint Matrix: {Protocol Name}

**Generated:** {YYYY-MM-DD}
**Releases Analyzed:** {N} releases over {Y} years
**Repository:** {owner}/{repo} ({URL})
**Analyst:** {Your name or "Claude AI"}

---

### Executive Summary

- **Distinguishable versions:** {count}
- **Highest confidence range:** {version range}
- **Primary marker type:** {Capability Flags / Default Configs / etc.}
- **Enrichment success rate:** {estimated % based on confidence levels}

---

### Detection Flow

```
START
  │
  ├──[Probe: Handshake]
  │    │
  │    ├──[Has CLIENT_DEPRECATE_EOF?]
  │    │    ├─YES─► [Check default_auth]
  │    │    │         ├─caching_sha2_password─► 8.0.4+
  │    │    │         └─mysql_native_password─► 8.0.0-8.0.3
  │    │    └─NO──► 5.7.x or earlier
  │
  └──[Probe: Feature Commands]
       ├──[COM_RESET_CONNECTION supported?]
       │    ├─YES─► 5.7.3+
       │    └─NO──► 5.6.x or earlier
       │
       └──[Fallback: Parse Banner]
            └─► Extract version string
```

---

### Version Fingerprint Matrix

| Version Range | Marker Type     | Probe          | Response Pattern                          | Confidence | Notes                       |
| ------------- | --------------- | -------------- | ----------------------------------------- | ---------- | --------------------------- |
| 8.0.23+       | Default Config  | Handshake      | `default_auth=caching_sha2_password`      | High       | Introduced in 8.0.4, stable |
| 8.0.4-8.0.22  | Default Config  | Handshake      | `default_auth=mysql_native`, has EOF flag | High       | Transition period           |
| 8.0.0-8.0.3   | Capability Flag | Handshake      | Has `CLIENT_DEPRECATE_EOF` flag           | High       | Early 8.0 releases          |
| 5.7.3+        | New Feature     | COM_RESET_CONN | Command recognized                        | Medium     | Requires extra round trip   |
| 5.7.0-5.7.2   | Capability Flag | Handshake      | Has `CLIENT_CONNECT_ATTRS`                | Medium     | Early 5.7 releases          |
| 5.6.x         | Banner          | Handshake      | Version string starts with '5.6'          | Low        | Fallback method             |
| 5.5.x         | Banner          | Handshake      | Version string starts with '5.5'          | Low        | Legacy, rarely encountered  |

---

### Implementation Guidance

#### Go Code Snippet

```go
package {protocol}

import (
    "encoding/binary"
    "net"
    "time"
)

// enrichProtocol extracts version information using the fingerprint matrix
func enrichProtocol(conn net.Conn, timeout time.Duration) (string, map[string]interface{}) {
    // Phase 1: Parse handshake
    handshake, err := readHandshake(conn, timeout)
    if err != nil {
        return "", nil
    }

    // Phase 2: Check capability flags (HIGH confidence)
    caps := binary.LittleEndian.Uint32(handshake[13:17])
    const CLIENT_DEPRECATE_EOF = 0x1000000

    if caps & CLIENT_DEPRECATE_EOF != 0 {
        // Phase 3: Check default auth (HIGH confidence)
        authPlugin := extractAuthPlugin(handshake)
        if authPlugin == "caching_sha2_password" {
            return "8.0.23+", map[string]interface{}{"marker": "default_auth"}
        }
        return "8.0.0-8.0.22", map[string]interface{}{"marker": "deprecate_eof"}
    }

    // Phase 4: Try feature detection (MEDIUM confidence)
    if supportsResetConnection(conn, timeout) {
        return "5.7.3+", map[string]interface{}{"marker": "reset_conn"}
    }

    // Phase 5: Fallback to banner (LOW confidence)
    version := parseBanner(handshake)
    return version, map[string]interface{}{"marker": "banner"}
}

func extractAuthPlugin(handshake []byte) string {
    // Implementation depends on protocol
    // ...
}

func supportsResetConnection(conn net.Conn, timeout time.Duration) bool {
    // Send COM_RESET_CONNECTION command
    // ...
}

func parseBanner(handshake []byte) string {
    // Extract version string from handshake
    // ...
}
```

---

### CPE Generation

```go
func buildCPE(version string) string {
    if version == "" {
        return ""
    }

    // Parse version string
    // version = "8.0.23+" → "8.0.23"
    cleanVersion := strings.TrimSuffix(version, "+")

    // Format: cpe:2.3:a:{vendor}:{product}:{version}:*:*:*:*:*:*:*
    return fmt.Sprintf("cpe:2.3:a:{vendor}:{product}:%s:*:*:*:*:*:*:*", cleanVersion)
}
```

**Example CPEs:**

- `cpe:2.3:a:oracle:mysql:8.0.23:*:*:*:*:*:*:*` (precise)
- `cpe:2.3:a:oracle:mysql:8.0:*:*:*:*:*:*:*` (minor version)
- `cpe:2.3:a:oracle:mysql:*:*:*:*:*:*:*:*` (any version - avoid this)

---

### Validation Results

| Version Tested | Docker Image       | Probe Result       | Matrix Prediction | Match? | Notes             |
| -------------- | ------------------ | ------------------ | ----------------- | ------ | ----------------- |
| 8.0.40         | `mysql:8.0.40`     | caching_sha2       | 8.0.23+           | ✅     | Correct           |
| 8.0.3          | `mysql:8.0.3`      | mysql_native + EOF | 8.0.0-8.0.3       | ✅     | Correct           |
| 5.7.44         | `mysql:5.7.44`     | no EOF flag        | 5.7.x             | ✅     | Correct           |
| 5.6.51         | `mysql:5.6.51`     | banner parse       | 5.6.x             | ✅     | Fallback worked   |
| Custom build   | `mysql:8.0-custom` | mysql_native + EOF | 8.0.0-8.0.3       | ⚠️     | Config overridden |

**Validation success rate:** 80% (4/5 exact matches, 1 config override)

---

### Caveats and Limitations

1. **Forks may differ**
   - Community forks (MariaDB, Percona) have different version schemes
   - Always verify repository is official/canonical

2. **Custom builds may have patches**
   - Backported features change marker reliability
   - Document known patched versions

3. **Configuration can override defaults**
   - `default_authentication_plugin` can be configured
   - Combine multiple markers for robustness

4. **Banners can be modified**
   - Compile-time options can change banner
   - Use capability flags over banners when possible

5. **Authentication may be required**
   - Some probes need valid credentials
   - Document which markers work pre-auth

---

### Source Analysis Summary

| Release | Date       | Handler Files Changed              | Key Changes                        |
| ------- | ---------- | ---------------------------------- | ---------------------------------- |
| 8.0.4   | 2018-04-19 | `sql/auth/sha2_password_common.cc` | caching_sha2 became default        |
| 8.0.0   | 2018-04-16 | `sql/protocol_classic.cc`          | CLIENT_DEPRECATE_EOF added         |
| 5.7.3   | 2014-08-14 | `sql/sql_parse.cc`                 | COM_RESET_CONNECTION command added |

---

### Next Steps

1. **Implement enrichment phase** in `writing-fingerprintx-modules`
2. **Add CPE generation** using precise version strings
3. **Test against Docker containers** for validation
4. **Document fallback strategy** when markers fail
5. **Update when new versions release** (add to matrix)

---

### References

- [MySQL Protocol Documentation](https://dev.mysql.com/doc/dev/mysql-server/latest/PAGE_PROTOCOL.html)
- [Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/)
- [GitHub Repository](https://github.com/mysql/mysql-server)
- [Fingerprintx Plugin PR #123](https://github.com/praetorian-inc/fingerprintx/pull/123)

---

## Template Usage Notes

**Replace all {placeholders} with actual data:**

- `{Protocol Name}` - MySQL, PostgreSQL, Redis, etc.
- `{YYYY-MM-DD}` - Date matrix was generated
- `{N}` and `{Y}` - Release analysis parameters
- `{owner}/{repo}` - GitHub repository
- `{vendor}` and `{product}` - CPE vendor/product names

**Customize sections based on protocol:**

- Detection flow will vary by protocol complexity
- Matrix rows depend on version boundaries discovered
- Validation results should match your test environment

**Keep updated:**

- Add new version ranges as releases occur
- Update validation results with new Docker images
- Document any newly discovered caveats
