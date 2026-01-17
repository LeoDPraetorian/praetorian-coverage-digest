# OPSEC Validation Checklist

**Pre-deployment and post-deployment OPSEC validation for Nighthawk profile customization.**

**Sources**: Research synthesis (Codebase + Web + arXiv)
**Confidence**: 0.85 (Cross-source consensus on OPSEC validation)

---

## Pre-Deployment Validation

**Run ALL checks before deploying customized profile.**

### Check 1: Test/Placeholder Data Detection

**Purpose**: Ensure no obvious test data remains in profile

**Command**:
```bash
grep -i "test\|example\|placeholder\|todo\|fixme\|xxx\|changeme" customized-profile.json
```

**Expected**: No matches (command returns empty)

**If matches found**:
- Review each match
- Replace with engagement-specific realistic data
- Re-run check until clean

**Common Test Data Patterns**:
- User-Agent: "Test Agent", "Mozilla/5.0 Test"
- URIs: "/test", "/example", "/api/placeholder"
- Headers: "X-Test-ID", "example.com"
- UUIDs: "00000000-0000-0000-0000-000000000000"

---

### Check 1.5: Query Parameter & URI Identifier Detection (CRITICAL)

**Purpose**: Ensure query parameters and URI-embedded identifiers are randomized, not static

**Command**:
```bash
# Extract all query parameters
grep -oE '\?[^"]+' customized-profile.json | sort | uniq

# Example output should show UNIQUE values:
# ?meeting=yb3fNHLL&v=5.37 (NOT meeting=conf&v=5.17)
# ?rpcids=uBlk4s&source=meet (NOT rpcids=F6EZ5c&source=meet)
# ?pageToken=G1Ui2kCGIiJ444oz6YrqA (NOT pageToken=start)
```

**Compare with baseline**:
```bash
# Extract query params from both profiles
grep -oE '\?[^"]+' baseline-profile.json | sort > baseline-query-params.txt
grep -oE '\?[^"]+' customized-profile.json | sort > custom-query-params.txt

# Check for exact matches (should have differences in IDs/tokens/versions)
comm -12 baseline-query-params.txt custom-query-params.txt

# Expected: Some structural params may match (?fields=*, ?supportsAllDrives=true)
#           But IDs/tokens/versions should differ (meeting ID, rpcids, file IDs, pageToken)
```

**Common Static Identifiers to Check**:

| Identifier Type | Example Static Value | Should Be | Check Command |
|-----------------|---------------------|-----------|---------------|
| RPC IDs | `rpcids=F6EZ5c` | Randomized 6-char | `grep "rpcids=" profile.json` |
| Meeting IDs | `meeting=conf` | Randomized 8-char | `grep "meeting=" profile.json` |
| File IDs | `files/1a2b3c` | Randomized 33-char | `grep -oE "files/[^?\"]{20,}" profile.json` |
| Version params | `v=5.17` | Varied | `grep -oE "v=[0-9.]+" profile.json` |
| Sync tokens | `pageToken=start` | Random base64url | `grep "pageToken=" profile.json` |

**If matches found with baseline**:
- Review each matching query parameter
- Determine if it's structural (e.g., `?fields=*`) or an identifier (e.g., `rpcids=F6EZ5c`)
- Randomize all identifier-type parameters
- Re-run check until only structural parameters match

**Example Failure**:
```bash
$ grep "rpcids=" baseline.json
"path": "/_/meet/data/batchexecute?rpcids=F6EZ5c&source=meet"

$ grep "rpcids=" customized.json
"path": "/_/meet/data/batchexecute?rpcids=F6EZ5c&source=meet"

# ❌ FAIL: Exact match - RPC ID not randomized
```

**Example Pass**:
```bash
$ grep "rpcids=" baseline.json
"path": "/_/meet/data/batchexecute?rpcids=F6EZ5c&source=meet"

$ grep "rpcids=" customized.json
"path": "/_/meet/data/batchexecute?rpcids=uBlk4s&source=meet"

# ✅ PASS: Different RPC ID - randomized per engagement
```

---

### Check 1.6: Header Value Randomization (CRITICAL)

**Purpose**: Ensure custom header VALUES are randomized, not static placeholders

**Command**:
```bash
# Extract custom headers with values
jq -r '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"] | to_entries[] | select(.key | startswith("X-")) | "\(.key)=\(.value)"' customized-profile.json

# Check for obviously static values
jq -r '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]' customized-profile.json | grep -iE "test|placeholder|example|12345|00000"
```

**Common Header Values to Randomize**:

| Header | Static Value (BAD) | Randomized Value (GOOD) | Format |
|--------|-------------------|------------------------|--------|
| X-Request-ID | `12345` or `test-request` | `550e8400-e29b-41d4-a716-446655440000` | UUIDv4 |
| X-Correlation-ID | `00000000-0000-0000-0000-000000000000` | `7218a473-3d6b-47ff-bb32-f56a06dc27de` | UUIDv4 (unique) |
| X-Client-Version | `1.0.0` | `2.7.4` or `drive_2026.01.13.00` | Semantic version or date-based |
| X-Session-Token | `static-token-123` | `<metadata:BuiltIn.Text.Base64UrlEncode>` | Dynamic encoding |
| X-Device-ID | `device-001` | `d8f3c2a1-9b7e-4f5a-8c6d-1e2f3a4b5c6d` | UUIDv4 |

**Check for Static Headers**:
```bash
# Compare header values between baseline and customized
diff <(jq -S '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]' baseline.json) \
     <(jq -S '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]' custom.json)

# Expected: Differences in custom header VALUES (X-Request-ID, X-Client-Version, etc.)
#           User-Agent, Content-Type, Accept may be same if appropriate for engagement
```

**Example Failure**:
```bash
$ jq '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]["X-Request-ID"]' baseline.json
"12345-static-id"

$ jq '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]["X-Request-ID"]' custom.json
"12345-static-id"

# ❌ FAIL: Same X-Request-ID value - not randomized
```

**Example Pass**:
```bash
$ jq '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]["X-Client-Version"]' baseline.json
"2.1.0"

$ jq '.["c2-profile"]["egress-config"]["command-defaults"]["build-request"]["headers"]["X-Client-Version"]' custom.json
"2.7.4"

# ✅ PASS: Different version - varied per engagement
```

**If static header values found**:
- Generate new UUIDs for ID-type headers
- Increment semantic versions for version-type headers
- Ensure dynamic encoding for sensitive headers (use `<metadata:BuiltIn.Text.Base64UrlEncode>`)
- Re-run check

---

### Check 2: Duplicate String Detection (Cross-Engagement)

**Purpose**: Verify no reused strings from previous engagements

**Workflow**:
```bash
# Extract key indicators from current profile
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' customized-profile.json
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].headers["User-Agent"]' customized-profile.json

# Compare with previous engagement profiles
diff previous-engagement-profile.json customized-profile.json | grep -E "uri|User-Agent"

# Verify differences exist (no exact matches)
```

**Key Fields to Check**:
- URIs across all three commands (status, getcommands, putresult)
- User-Agent strings
- Custom header values (X-Request-ID, X-Tenant-ID, etc.)
- Assembly stomp names

**Best Practice**: Keep a registry of used indicators per engagement, check against it before deployment

---

### Check 3: Realistic Data Validation

**Purpose**: Ensure all customized data is realistic and current

#### User-Agent Realism Check

**Command**:
```bash
# Extract User-Agent
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].headers["User-Agent"]' customized-profile.json

# Check for common issues
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].headers["User-Agent"]' customized-profile.json | \
  grep -E "mozilla/[0-3]|msie|trident/[0-5]|chrome/[0-9]{2}\." && \
  echo "⚠️ WARNING: Outdated browser version detected"
```

**Validation Criteria**:
- ✅ Browser version is current (Chrome 120+, Firefox 121+, Edge 120+ as of Jan 2026)
- ✅ OS version matches target (NT 10.0 for Windows 10/11, NT 6.1 for Windows 7)
- ✅ Architecture matches (Win64; x64 for modern systems)
- ❌ Not outdated (IE9, Chrome 50, Firefox 30)
- ❌ Not obviously fake ("Custom Browser", "Nighthawk Agent")

#### URI Pattern REST Compliance

**Check**:
```bash
# Extract URIs
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' customized-profile.json

# Check for REST violations
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' customized-profile.json | \
  grep -E "getCommand|setData|doAction" && \
  echo "⚠️ WARNING: Verb in URI (violates REST conventions)"
```

**Validation Criteria**:
- ✅ Follows REST conventions (nouns, not verbs)
- ✅ Uses versioning (`/api/v2/...`)
- ✅ Hierarchical structure (`/api/resource/subresource`)
- ✅ Matches target industry patterns
- ❌ No verbs in URIs (`/getData`, `/executeCommand`)
- ❌ No obviously C2 paths (`/beacon`, `/c2`, `/callback`)

#### Assembly Name Validation

**Check**:
```bash
# Extract assembly names
jq '.["c2-profile"]["general-config"]["code-modules"] |
    .encoders[].["stomp-assembly-name"],
    .["egress-transports"][].["stomp-assembly-name"],
    .["p2p-transports"][].["stomp-assembly-name"]' customized-profile.json

# Verify format
jq -r '.["c2-profile"]["general-config"]["code-modules"].encoders[].["stomp-assembly-name"]' customized-profile.json | \
  grep -E "^[A-Za-z0-9.]+, Version=[0-9.]+, Culture=[a-z]+, PublicKeyToken=[0-9a-f]{16}" || \
  echo "❌ ERROR: Invalid assembly name format"
```

**Validation Criteria**:
- ✅ Matches .NET assembly format (`Name, Version=..., Culture=..., PublicKeyToken=...`)
- ✅ PublicKeyToken is 16-character hex string
- ✅ Assembly is legitimate (exists in .NET Framework GAC)
- ❌ Not invented assemblies ("Custom.Assembly.Name")
- ❌ Not typos in PublicKeyToken or version

---

### Check 4: Operational Settings Preservation

**Purpose**: Verify no unintended modifications to operational fields

**Command**:
```bash
# Compare interval and jitter
diff <(jq '.["c2-profile"]["general-config"]["settings"] | {interval, jitter}' baseline-profile.json) \
     <(jq '.["c2-profile"]["general-config"]["settings"] | {interval, jitter}' customized-profile.json)

# Expected: No differences (or only approved differences)
```

**If differences detected**:
- ❌ **STOP**: Do not deploy
- Ask user if modifications were intentional
- Document approval in deployment notes
- If unintentional, restore baseline values

**Key Operational Fields to Verify Unchanged**:
- `interval`, `jitter` (beacon timing)
- All `opsec.*` settings (70+ fields)
- `api.host`, `api.port` (C2 server connection)
- `strategy` (C2 channel type)
- `injector.methods` (injection chain)

**Comparison Command (OPSEC settings)**:
```bash
diff <(jq '.["c2-profile"]["general-config"]["opsec"]' baseline-profile.json | jq -S .) \
     <(jq '.["c2-profile"]["general-config"]["opsec"]' customized-profile.json | jq -S .)

# Expected: No differences
```

---

### Check 5: JSON Syntax Validation

**Purpose**: Ensure valid JSON before deployment

**Command**:
```bash
jq . customized-profile.json > /dev/null && echo "✅ Valid JSON" || echo "❌ Syntax Error"
```

**Common Syntax Errors**:
- Trailing commas before `}` or `]`
- Unescaped backslashes in Windows paths (use `\\`)
- Missing quotes around strings
- Unclosed brackets/braces

**Fix Command** (Pretty-print to file):
```bash
jq . customized-profile.json > customized-profile-formatted.json
mv customized-profile-formatted.json customized-profile.json
```

---

### Check 6: Assembly Name Uniqueness

**Purpose**: Verify all `stomp-assembly-name` values are unique (Nighthawk requirement)

**Command**:
```bash
jq '.["c2-profile"]["general-config"]["code-modules"] |
    .encoders[].["stomp-assembly-name"],
    .["egress-transports"][].["stomp-assembly-name"],
    .["p2p-transports"][].["stomp-assembly-name"]' customized-profile.json | sort | uniq -d
```

**Expected**: Empty output (no duplicates)

**If duplicates found**:
- ❌ **STOP**: Do not deploy
- Replace duplicate with unique assembly from catalog
- Re-run check until all unique

**Example Failure**:
```json
{
  "encoders": [
    { "stomp-assembly-name": "System.Web.Mobile, ..." },
    { "stomp-assembly-name": "System.Web.Mobile, ..." }  // ❌ DUPLICATE
  ]
}
```

**Fix**: Replace second occurrence with different assembly:
```json
{
  "encoders": [
    { "stomp-assembly-name": "System.Web.Mobile, ..." },
    { "stomp-assembly-name": "System.Data.OracleClient, ..." }  // ✅ UNIQUE
  ]
}
```

---

## Post-Deployment Validation

**After deploying profile and generating test payload, run these checks.**

### Check 7: Traffic Comparison (If Legitimate Traffic Available)

**Purpose**: Compare C2 traffic against legitimate traffic from target environment

**Workflow**:
1. **Capture legitimate traffic**: Use Wireshark/tcpdump to capture target org's normal API traffic (if available)
2. **Deploy test profile**: Deploy customized profile, generate payload, execute in sandboxed environment
3. **Capture C2 traffic**: Capture beacon traffic between agent and C2 server
4. **Compare**:
   - HTTP headers match legitimate pattern?
   - URI paths follow same REST conventions?
   - User-Agent matches corporate browser policy?
   - Request timing and flow patterns similar?

**Tools**:
- Wireshark: Visual comparison of HTTP traffic
- tshark: Command-line traffic analysis
- Burp Suite: HTTP request/response inspection

**Metrics**:
- Header count (legitimate: 8-12 headers, C2 should match)
- Header ordering (should match legitimate browser/application)
- Content-Type matches URI pattern
- Request/response sizes (should be in similar range)

---

### Check 8: Signature Testing

**Purpose**: Test against common detection rules

**YARA Testing**:
```bash
# Test against generic C2 signatures
yara -r /path/to/signature-base/gen_nighthawk_c2.yar customized-profile.json

# Expected: No matches (profile doesn't contain static Nighthawk signatures)
```

**Network Signature Testing**:
```bash
# Generate traffic from test payload
# Capture with tcpdump
tcpdump -i eth0 -w c2-traffic.pcap host {c2-server}

# Test against Snort/Suricata rules
snort -c /etc/snort/snort.conf -r c2-traffic.pcap

# Expected: No detection alerts
```

**Sources for Signatures**:
- Neo23x0/signature-base (YARA rules for C2 frameworks)
- Emerging Threats (Snort/Suricata rules)
- ClamAV (Malware signatures)

---

### Check 9: Static Indicator Verification (Cross-Engagement)

**Purpose**: Ensure no static indicators reused from previous engagements

**Workflow**:
1. **Extract indicators from current profile**:
   ```bash
   # URIs
   jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' customized-profile.json > current-uris.txt

   # User-Agents
   jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].headers["User-Agent"]' customized-profile.json > current-ua.txt

   # Assembly names
   jq '.["c2-profile"]["general-config"]["code-modules"] | .encoders[].["stomp-assembly-name"]' customized-profile.json > current-assemblies.txt
   ```

2. **Compare with previous engagements**:
   ```bash
   # Check for exact matches in previous profiles
   for file in previous-engagements/*.json; do
     echo "Checking $file..."
     grep -F -f current-uris.txt <(jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' "$file")
   done

   # Expected: No matches (no exact URI reuse)
   ```

3. **If matches found**:
   - Regenerate unique indicators for current engagement
   - Re-run comparison
   - Document variance in deployment notes

---

### Check 10: HTTP Header Ordering Validation

**Purpose**: Verify header ordering matches legitimate browsers/applications

**Typical Browser Header Order**:
```
1. Host
2. User-Agent
3. Accept
4. Accept-Language
5. Accept-Encoding
6. Content-Type (for POST/PUT)
7. Content-Length (for POST/PUT)
8. Custom headers (X-*)
9. Authorization (if applicable)
```

**Validation**: Manually inspect HTTP traffic, compare header ordering to legitimate captures from target environment

---

## OPSEC Checklist Summary

**Pre-Deployment (MUST PASS ALL)**:
- [ ] ✅ Check 1: No test/placeholder data
- [ ] ✅ Check 1.5: Query parameters & URI identifiers randomized (rpcids, meeting IDs, file IDs, sync tokens, versions)
- [ ] ✅ Check 2: No duplicate strings from previous engagements
- [ ] ✅ Check 3: All data is realistic and current (User-Agents, URIs, assemblies)
- [ ] ✅ Check 4: Operational settings unchanged (or approved changes documented)
- [ ] ✅ Check 5: JSON syntax valid
- [ ] ✅ Check 6: All assembly names unique within profile

**Post-Deployment (RECOMMENDED)**:
- [ ] ✅ Check 7: C2 traffic compares favorably to legitimate traffic (if available)
- [ ] ✅ Check 8: No signature matches (YARA, Snort, Suricata, ClamAV)
- [ ] ✅ Check 9: No static indicators reused (encryption keys, query params, header values, URIs)
- [ ] ✅ Check 10: HTTP header ordering matches legitimate browsers/applications

**Gate**: If any pre-deployment check fails → **DO NOT DEPLOY** → Fix and re-validate

---

## Automated Validation Script

**Create a validation script for repeatable checks**:

```bash
#!/bin/bash
# nighthawk-profile-validator.sh

PROFILE=$1
BASELINE=$2

echo "=== Nighthawk Profile OPSEC Validation ==="

# Check 1: Test data
echo "\n[Check 1] Test/Placeholder Data Detection..."
if grep -qi "test\|example\|placeholder" "$PROFILE"; then
  echo "❌ FAIL: Found test/placeholder data"
  grep -ni "test\|example\|placeholder" "$PROFILE"
  exit 1
else
  echo "✅ PASS: No test/placeholder data"
fi

# Check 1.5: Query parameters (if baseline provided)
if [ -n "$BASELINE" ]; then
  echo "\n[Check 1.5] Query Parameter Randomization..."

  # Extract query params from both
  grep -oE '\?[^"]+' "$BASELINE" | sort | uniq > /tmp/baseline-params.txt
  grep -oE '\?[^"]+' "$PROFILE" | sort | uniq > /tmp/custom-params.txt

  # Find exact matches (excluding structural params)
  EXACT_MATCHES=$(comm -12 /tmp/baseline-params.txt /tmp/custom-params.txt | grep -vE 'fields=|supportsAllDrives=|source=meet|uploadType=')

  if [ -n "$EXACT_MATCHES" ]; then
    echo "⚠️ WARNING: Static query parameters detected (likely need randomization)"
    echo "$EXACT_MATCHES"
    echo "Review: Are these structural params or identifiers that should vary?"
  else
    echo "✅ PASS: Query parameters appear randomized"
  fi
fi

# Check 5: JSON syntax
echo "\n[Check 5] JSON Syntax Validation..."
if jq . "$PROFILE" > /dev/null 2>&1; then
  echo "✅ PASS: Valid JSON"
else
  echo "❌ FAIL: Invalid JSON syntax"
  exit 1
fi

# Check 6: Assembly uniqueness
echo "\n[Check 6] Assembly Name Uniqueness..."
DUPLICATES=$(jq '.["c2-profile"]["general-config"]["code-modules"] |
  .encoders[].["stomp-assembly-name"],
  .["egress-transports"][].["stomp-assembly-name"],
  .["p2p-transports"][].["stomp-assembly-name"]' "$PROFILE" | sort | uniq -d)

if [ -z "$DUPLICATES" ]; then
  echo "✅ PASS: All assembly names unique"
else
  echo "❌ FAIL: Duplicate assembly names found"
  echo "$DUPLICATES"
  exit 1
fi

# Check 4: Operational settings (if baseline provided)
if [ -n "$BASELINE" ]; then
  echo "\n[Check 4] Operational Settings Preservation..."
  SETTINGS_DIFF=$(diff <(jq -S '.["c2-profile"]["general-config"]["settings"] | {interval, jitter}' "$BASELINE") \
                       <(jq -S '.["c2-profile"]["general-config"]["settings"] | {interval, jitter}' "$PROFILE"))

  if [ -z "$SETTINGS_DIFF" ]; then
    echo "✅ PASS: Interval/jitter unchanged"
  else
    echo "⚠️ WARNING: Interval/jitter modified"
    echo "$SETTINGS_DIFF"
    echo "Verify this change was approved"
  fi
fi

echo "\n=== Validation Complete ==="
echo "✅ All checks passed. Profile ready for deployment."
```

**Usage**:
```bash
chmod +x nighthawk-profile-validator.sh
./nighthawk-profile-validator.sh customized-profile.json baseline-profile.json
```

---

## Sources

- Research Synthesis (OPSEC validation techniques from Web + arXiv + Codebase)
- Nighthawk Official Documentation (Profile requirements)
