# Deployment Workflow

**Complete workflow for deploying customized Nighthawk profiles with verification and rollback procedures.**

---

## Deployment Overview

**Tool**: `DeployTool.exe` (Nighthawk command-line deployment utility)

**Basic Command**:
```bash
DeployTool.exe --profile {profile-name}.json --server {ops-server-ip}:{port}
```

**Example**:
```bash
DeployTool.exe --profile acme-corp-2026-01-13.json --server 10.0.1.100:8888
```

---

## Five-Phase Deployment Process

### Phase 1: Pre-Deployment Validation

**Purpose**: Verify profile is deployment-ready

**Checklist** (See `opsec-checklist.md` for detailed commands):
1. ✅ JSON syntax valid
2. ✅ No test/placeholder data
3. ✅ No duplicate strings from previous engagements
4. ✅ All data realistic and current
5. ✅ Operational settings unchanged (or approved)
6. ✅ Assembly names unique

**Gate**: If any check fails → **DO NOT PROCEED** → Fix and re-validate

---

### Phase 2: Generate Deployment Documentation

**Purpose**: Document customizations for operational continuity

**Create Deployment Notes** (`deployment-notes-{client}-{date}.md`):

```markdown
# Deployment Notes: {Client Name} - {Date}

## Engagement Details
- **Client**: {Organization Name}
- **Industry**: {Financial|Healthcare|Tech|Manufacturing}
- **Engagement Dates**: {Start} - {End}
- **Profile Expiration**: {Expiration Date}

## Profile Customizations

### User-Agent
- **Value**: {Full User-Agent String}
- **Rationale**: Matches target's corporate browser policy (Chrome {version} on Windows 10)

### URI Paths
- **status**: {URI}
- **getcommands**: {URI}
- **putresult**: {URI}
- **Theme**: {Financial APIs|Healthcare FHIR|SaaS Telemetry}
- **Rationale**: Mimics target's internal API patterns

### HTTP Headers
- **X-Request-ID**: {UUID}
- **X-Client-Version**: {Semantic Version}
- **X-Correlation-ID**: {UUID}
- **Rationale**: {Why these headers were chosen}

### Assembly Names
- **Encoder 1**: {Assembly Name}
- **Encoder 2**: {Assembly Name}
- **Transport 1**: {Assembly Name}
- **Uniqueness**: ✅ Verified unique within profile

### Process Injection
- **spawn-to**: {Process Path}
- **parent-process**: {Process Name}
- **Rationale**: {Why these processes were chosen}

### Expiration
- **Unix Timestamp**: {Timestamp}
- **Human-Readable**: {Date and Time}
- **Buffer**: {Engagement End} + {N} days

## Validation Results
- ✅ JSON syntax valid (jq validation passed)
- ✅ OPSEC checklist complete (10/10 checks passed)
- ✅ No static indicators detected
- ✅ Assembly names unique
- ✅ Baseline operational settings preserved (interval=10, jitter=20)

## Deployment Information

### Command
DeployTool.exe --profile {profile-name}.json --server {ops-server-ip}:8888

### Expected C2 Endpoints
- **Status**: POST https://{domain}{status-uri}
- **GetCommands**: POST https://{domain}{getcommands-uri}
- **PutResult**: POST https://{domain}{putresult-uri}

### Verification Steps
1. Deploy profile to operations server
2. Verify profile appears in Nighthawk UI
3. Generate test payload with new profile
4. Execute in sandboxed environment (non-production)
5. Verify beacon appears in C2 UI
6. Inspect network traffic:
   - User-Agent matches customization
   - URIs match customization
   - Headers include custom headers
7. Validate no detection alerts in sandbox

### Rollback Plan
- **Baseline Profile**: {baseline-name}.json
- **Revert Command**: DeployTool.exe --profile {baseline-name}.json --server {ops-server-ip}:8888
- **Reason to Rollback**: If profile causes operational issues or detection

## Operational Notes
{Any additional notes for operators using this profile}
```

---

### Phase 3: Deploy Profile

**Command**:
```bash
DeployTool.exe --profile acme-corp-2026-01-13.json --server 10.0.1.100:8888
```

**Expected Output**:
```
Connecting to operations server 10.0.1.100:8888...
Connected.
Uploading profile acme-corp-2026-01-13.json...
Profile deployed successfully.
Profile ID: {profile-id}
```

**Error Handling**:
- Connection refused → Verify operations server is running, check host/port
- JSON parse error → Profile has syntax error (re-run validation)
- Deployment failed → Check Nighthawk server logs for specific error

---

### Phase 4: Verify Deployment

**Step 1: Verify Profile in Nighthawk UI**
- Log into Nighthawk operations server UI
- Navigate to Profiles section
- Confirm new profile appears in list
- Note Profile ID for payload generation

**Step 2: Generate Test Payload**
```bash
# Generate payload with customized profile
# (Command varies by Nighthawk version - consult docs)
```

**Step 3: Execute in Sandbox**
- Deploy payload to controlled test environment (non-production VM)
- Execute payload
- Wait for beacon (interval + jitter seconds)

**Step 4: Verify Beacon in C2 UI**
- Check Nighthawk UI for new agent beacon
- Verify agent details:
  - Profile ID matches deployed profile
  - Agent version correct
  - Callback times match interval

**Step 5: Inspect Network Traffic**
```bash
# Capture traffic from sandbox
tcpdump -i eth0 -w c2-traffic.pcap host {c2-server-ip}

# Analyze with Wireshark
wireshark c2-traffic.pcap

# Check:
# - User-Agent matches customization
# - URIs match customization
# - Headers include custom headers
# - No obvious C2 indicators
```

**Step 6: Validate No Detection Alerts**
- Check sandbox EDR/AV logs
- Verify no alerts or detections
- If alerts detected → investigate and adjust profile

---

### Phase 5: Post-Deployment Monitoring

**Monitor for**:
- Detection alerts (EDR, IDS/IPS, AV)
- Unusual network traffic patterns
- Beacon timing matches expectations
- C2 commands execute successfully

**If issues detected**:
- Document issue in deployment notes
- Assess whether profile caused issue
- Plan remediation (profile adjustment or rollback)

---

## Rollback Procedure

**When to Rollback**:
- Profile causes operational failures (agent crashes, no beacons)
- Profile triggers detection in production environment
- Customizations break C2 functionality
- Need to revert to baseline for testing

**Rollback Command**:
```bash
DeployTool.exe --profile baseline-profile.json --server 10.0.1.100:8888
```

**Post-Rollback**:
- Regenerate payloads with baseline profile
- Redeploy agents if necessary
- Document rollback reason
- Investigate what went wrong with customized profile

---

## Deployment Checklist

**Pre-Deployment**:
- [ ] All validation checks passed (opsec-checklist.md)
- [ ] Deployment notes generated and reviewed
- [ ] Baseline profile backed up
- [ ] Rollback plan documented
- [ ] Operations server accessible

**Deployment**:
- [ ] Profile deployed to operations server
- [ ] Deployment command successful (no errors)
- [ ] Profile appears in Nighthawk UI

**Verification**:
- [ ] Test payload generated with new profile
- [ ] Payload executed in sandbox environment
- [ ] Beacon appears in C2 UI
- [ ] Network traffic inspected and validated
- [ ] No detection alerts in sandbox
- [ ] Beacon timing matches expectations
- [ ] C2 commands execute successfully

**Post-Deployment**:
- [ ] Deployment notes archived
- [ ] Profile added to engagement documentation
- [ ] Team notified of new profile availability
- [ ] Monitoring enabled for detection alerts

---

## Sources

- Nighthawk Official Documentation (DeployTool reference)
- Research Synthesis (Deployment best practices)
