# Customizable Fields Catalog

**Complete catalog of safe-to-modify Nighthawk profile fields with industry-specific examples and OPSEC guidance.**

---

## Field Classification Principles

**SAFE TO CUSTOMIZE** = Cosmetic indicators that don't affect C2 functionality:
- User-Agent strings
- URI paths
- Custom HTTP headers (X-*)
- Content-Type (must match URI pattern)
- Assembly stomp names
- Spawn-to processes
- Parent processes

**NEVER MODIFY** = Operational settings that affect C2 behavior:
- Beacon timing (interval, jitter)
- OPSEC settings (70+ flags)
- C2 connection details (api host/port)
- HTTP methods and command structure

**When in doubt**: Ask user before modifying. Err on side of caution.

---

## HTTP/Network Level Fields

### egress-config.commands.*.build-request.uri

**Purpose**: Request URI path for C2 communications

**Location**: `c2-profile.egress-config.commands.{status|getcommands|putresult}.build-request.uri`

**Current Values (Baseline)**:
```json
{
  "status": { "build-request": { "uri": "/api/v2/telemetry/status" } },
  "getcommands": { "build-request": { "uri": "/api/v2/commands/fetch" } },
  "putresult": { "build-request": { "uri": "/api/v2/results/submit" } }
}
```

**Customization Strategy**: Match target industry's API patterns

#### Industry-Specific URI Examples

**Financial Services** (Modern Banking APIs):
```json
{
  "status": { "build-request": { "uri": "/api/v2/accounts/status" } },
  "getcommands": { "build-request": { "uri": "/services/trading/orders" } },
  "putresult": { "build-request": { "uri": "/api/v1/transactions/confirm" } }
}
```

**Healthcare** (FHIR/HL7 APIs):
```json
{
  "status": { "build-request": { "uri": "/fhir/r4/Patient/status" } },
  "getcommands": { "build-request": { "uri": "/api/ehr/appointments" } },
  "putresult": { "build-request": { "uri": "/hl7/messages/inbound" } }
}
```

**Tech/SaaS** (Telemetry & Analytics):
```json
{
  "status": { "build-request": { "uri": "/api/telemetry/health" } },
  "getcommands": { "build-request": { "uri": "/v1/analytics/events" } },
  "putresult": { "build-request": { "uri": "/api/monitoring/metrics" } }
}
```

**Manufacturing/Industrial** (SCADA & IoT):
```json
{
  "status": { "build-request": { "uri": "/scada/devices/status" } },
  "getcommands": { "build-request": { "uri": "/api/plc/commands" } },
  "putresult": { "build-request": { "uri": "/iot/sensors/data" } }
}
```

**REST Compliance Principles**:
- Use versioned APIs (`/api/v1/`, `/api/v2/`)
- Follow resource naming (nouns, not verbs): `/api/accounts` not `/api/getAccounts`
- Use appropriate HTTP methods (POST for mutations, GET for retrieval)
- Include hierarchical paths (`/api/resource/subresource`)

### egress-config.commands.*.build-request.headers["User-Agent"]

**Purpose**: HTTP User-Agent header identifying browser/client

**Location**: `c2-profile.egress-config.commands.*.build-request.headers["User-Agent"]`

**Customization Strategy**: Match target environment's browser demographics

#### User-Agent Generation by Industry

**Financial Services** (Modern Corporate Browsers):
```
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"

"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
```

**Healthcare** (Legacy Systems with IE11):
```
"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko"

"Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko"

"Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
```

**Tech/SaaS** (Latest Browsers):
```
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
```

**Manufacturing** (Embedded/SCADA Systems):
```
"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"

"Mozilla/5.0 (Windows Embedded Compact; rv:11.0) like Gecko"
```

**Service-Specific User-Agents** (Mimic Legitimate SaaS):
```
Slack: "Slack/4.23.0 (Mac OS X 10.15.7)"
Discord: "Discord/1.0 (Linux; Android 10; Scale/3.0)"
Teams: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Teams/1.6.00.4472"
```

**Best Practices**:
- ✅ Use **current** browser versions (as of engagement date)
- ✅ Match OS version to target (NT 10.0 for modern Windows 10/11, NT 6.1 for legacy Windows 7)
- ✅ Match architecture (Win64; x64 for 64-bit, WOW64 for 32-bit on 64-bit OS)
- ❌ Avoid outdated versions unless matching legacy target environment
- ❌ Never use obviously synthetic values ("Test Agent", "Custom Browser")

### egress-config.commands.*.build-request.headers["Content-Type"]

**Purpose**: HTTP Content-Type header specifying request body format

**Location**: `c2-profile.egress-config.commands.*.build-request.headers["Content-Type"]`

**Customization Strategy**: Match URI pattern and industry norms

**Examples by API Pattern**:
```
REST API (JSON):
  "Content-Type": "application/json"

REST API (XML):
  "Content-Type": "application/xml"

Form Data:
  "Content-Type": "application/x-www-form-urlencoded"

File Upload:
  "Content-Type": "multipart/form-data"

Binary Data:
  "Content-Type": "application/octet-stream"
```

**Industry Patterns**:
- **Financial/SaaS/Tech**: `application/json` (modern REST APIs)
- **Healthcare**: `application/fhir+json` (FHIR APIs) or `application/xml` (HL7 v2)
- **Manufacturing**: `application/json` (modern) or `application/xml` (legacy SCADA)

**Best Practices**:
- ✅ Match Content-Type to URI pattern (banking API → JSON, healthcare FHIR → fhir+json)
- ✅ Consistency across commands (if using JSON, all commands should use JSON)
- ❌ Don't mix Content-Types randomly (confusing, suspicious)

### URI-Embedded Identifiers (OFTEN OVERLOOKED - CRITICAL)

**Purpose**: Randomize identifiers embedded in URI paths and query parameters

**Location**: Within `path` field values

**CRITICAL INSIGHT**: Query parameter VALUES and path-embedded IDs are static indicators just like encryption keys. They MUST be randomized per engagement.

#### Common URI Identifier Types

**Query Parameter Values**:
```
?rpcids={6-char-alphanumeric}     // Google Meet RPC IDs
?meeting={meeting-id}              // Meeting/conference identifiers
?v={version}                       // API version numbers (vary to prevent fingerprinting)
?pageToken={sync-token}            // Pagination/sync tokens
?uploadId={upload-id}              // Upload session identifiers
```

**Path-Embedded IDs**:
```
/drive/v3/files/{fileId}           // File identifiers (28-44 chars)
/api/meetings/{meetingId}          // Resource identifiers
/calendars/{calendarId}/events     // Entity identifiers
```

#### Randomization Examples

**Google Meet RPC IDs** (6-character alphanumeric):
```bash
# Generate random 6-char RPC ID
openssl rand -base64 6 | tr -d '/+=' | head -c 6
# Example outputs: uBlk4s, 8V0Wgd, mXp9Kq
```

**Before**:
```json
{
  "path": "/_/meet/data/batchexecute?rpcids=F6EZ5c&source=meet"
}
```

**After** (per engagement):
```json
{
  "path": "/_/meet/data/batchexecute?rpcids=uBlk4s&source=meet"
}
```

**Google Drive File IDs** (33-character alphanumeric):
```bash
# Generate random 33-char file ID
openssl rand -base64 32 | tr -d '/+=' | head -c 33
# Example: qJmPQubl1EbZ0BtSWnsoDFrXTJvMysLxm
```

**Before**:
```json
{
  "path": "/drive/v3/files/1a2b3c4d5e6f?fields=*"
}
```

**After** (per engagement):
```json
{
  "path": "/drive/v3/files/qJmPQubl1EbZ0BtSWnsoDFrXTJvMysLxm?fields=*"
}
```

**Meeting/Conference IDs** (8-character alphanumeric):
```bash
# Generate random meeting ID
openssl rand -base64 8 | tr -d '/+=' | head -c 8
# Example: yb3fNHLL
```

**Before**:
```json
{
  "path": "/_/meet/data/poll?meeting=conf&v=5.17"
}
```

**After** (per engagement):
```json
{
  "path": "/_/meet/data/poll?meeting=yb3fNHLL&v=5.37"
}
```

**Version Numbers** (Vary to prevent fingerprinting):
```bash
# Vary version number
echo "5.$((RANDOM % 30 + 10))"  # Random between 5.10 and 5.39
# Example: 5.37, 5.22, 5.31
```

**Sync Tokens** (base64url format):
```bash
# Generate random sync token
openssl rand -base64 16 | tr '+/' '-_' | tr -d '='
# Example: G1Ui2k-CGIiJ444oz6YrqA
```

#### Validation: Check for Reused Query Parameters

**Command**:
```bash
# Extract all query parameters from profile
grep -oE '\?[^"]+' customized-profile.json | sort | uniq

# Compare with baseline or previous engagements
grep -oE '\?[^"]+' baseline-profile.json > baseline-params.txt
grep -oE '\?[^"]+' customized-profile.json > custom-params.txt
diff baseline-params.txt custom-params.txt

# Expected: Differences in parameter VALUES (IDs, tokens, versions)
```

**Common Static Query Parameters to Randomize**:

| Service | Query Parameter | Format | Generation Method |
|---------|----------------|--------|-------------------|
| Google Meet | `rpcids={id}` | 6-char alphanumeric | `openssl rand -base64 6 \| tr -d '/+=' \| head -c 6` |
| Google Meet | `meeting={id}` | 4-12 char alphanumeric | `openssl rand -base64 8 \| tr -d '/+=' \| head -c 8` |
| Google Meet | `v={version}` | Semantic version | `5.$((RANDOM % 30 + 10))` |
| Google Drive | `pageToken={token}` | base64url | `openssl rand -base64 16 \| tr '+/' '-_' \| tr -d '='` |
| Slack | `channel={id}` | 9-char uppercase | `C` + random 8-char hex |
| Any API | `{resource}Id={id}` | UUID or alphanumeric | Service-specific format |

**Best Practices for URI Identifiers**:
- ✅ Extract all query parameters and path IDs from URIs
- ✅ Generate random values matching the format of legitimate identifiers
- ✅ Vary across engagements (never reuse same meeting ID, file ID, RPC ID)
- ✅ Match character length and format to legitimate service (Google Meet RPC = 6 chars, Drive file ID = 33 chars)
- ❌ Don't reuse baseline query parameters unchanged
- ❌ Don't assume query parameters are "part of the API structure" and leave them static

### egress-config.commands.*.build-request.headers[Custom Headers]

**Purpose**: Custom HTTP headers for mimicking legitimate services

**Location**: `c2-profile.egress-config.commands.*.build-request.headers["X-*"]`

**Customization Strategy**: Include headers that match target organization's API patterns

#### Standard Custom Headers

**Request Tracking**:
```json
{
  "X-Request-ID": "{uuid}",
  "X-Correlation-ID": "{uuid}",
  "X-Trace-ID": "{trace-id}"
}
```

**Client Identification**:
```json
{
  "X-Client-Version": "2.1.4",
  "X-App-Version": "4.7.2",
  "X-Platform": "Windows",
  "X-Device-ID": "{uuid}"
}
```

**Tenant/Organization**:
```json
{
  "X-Tenant-ID": "acme-corp-prod",
  "X-Organization-ID": "{uuid}",
  "X-Environment": "production"
}
```

#### Service-Specific Header Examples

**Slack API Mimicry**:
```json
{
  "User-Agent": "Slack/4.23.0 (Mac OS X 10.15.7)",
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "X-Slack-Request-Id": "{uuid}",
  "Authorization": "Bearer xoxb-{token-format}"
}
```

**Discord API Mimicry**:
```json
{
  "User-Agent": "Discord/1.0 (Linux; Android 10; Scale/3.0)",
  "Content-Type": "application/json",
  "Authorization": "Bot {token}",
  "X-RateLimit-Precision": "millisecond",
  "X-Discord-Locale": "en-US"
}
```

**Generic Internal API**:
```json
{
  "User-Agent": "InternalClient/3.2.1",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-API-Key": "{api-key-format}",
  "X-Request-ID": "{uuid}",
  "X-Client-Version": "3.2.1"
}
```

**Best Practices**:
- ✅ Use UUIDs for request IDs (realistic, unique per request)
- ✅ Use semantic versioning for client versions (e.g., "2.1.4")
- ✅ Include 2-4 custom headers (not too few, not excessive)
- ✅ Match header names to target organization's API conventions
- ❌ Don't use static UUIDs (generate unique per engagement or per request if possible)
- ❌ Don't create headers that don't exist in legitimate traffic (`X-C2-ID`, `X-Beacon-Number`)

---

## .NET Evasion Level Fields

### code-modules.*.stomp-assembly-name

**Purpose**: .NET assembly names for evasion via assembly stomping

**Location**: Multiple locations (any code module):
- `c2-profile.general-config.code-modules.encoders[*]["stomp-assembly-name"]`
- `c2-profile.general-config.code-modules.egress-transports[*]["stomp-assembly-name"]`
- `c2-profile.general-config.code-modules.p2p-transports[*]["stomp-assembly-name"]`
- `c2-profile.general-config.opsec["--inproc-stomp-assembly-name"]`

**CRITICAL RULE**: **ALL assembly names must be UNIQUE** throughout the entire profile

**Customization Strategy**: Select legitimate .NET assemblies, ensure uniqueness

#### Legitimate .NET Assembly Catalog

**System Assemblies** (Always available on Windows):
```
System.Web.Mobile, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Data.OracleClient, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL

System.ServiceModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL

System.Messaging, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.DirectoryServices, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Management, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Configuration.Install, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.EnterpriseServices, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Transactions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL

System.Runtime.Remoting, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL
```

**Server-Only Assemblies** (May not exist on all systems):
```
System.Web, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Web.Services, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.IdentityModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL
```

#### Uniqueness Verification

**Before deploying**, verify no duplicate assembly names:

```bash
# Extract all stomp-assembly-name values
jq '.["c2-profile"]["general-config"]["code-modules"] |
    .encoders[].["stomp-assembly-name"],
    .["egress-transports"][].["stomp-assembly-name"],
    .["p2p-transports"][].["stomp-assembly-name"]' profile.json | sort

# Check for duplicates
jq '.["c2-profile"]["general-config"]["code-modules"] |
    .encoders[].["stomp-assembly-name"],
    .["egress-transports"][].["stomp-assembly-name"],
    .["p2p-transports"][].["stomp-assembly-name"]' profile.json | sort | uniq -d

# If output is empty: ✅ All unique
# If output exists: ❌ Duplicates found - must fix before deployment
```

#### Example: Profile with 3 Encoders + 1 Egress Transport = 4 Unique Assemblies Required

```json
{
  "code-modules": {
    "encoders": [
      { "stomp-assembly-name": "System.Web.Mobile, Version=4.0.0.0, ..." },
      { "stomp-assembly-name": "System.Data.OracleClient, Version=4.0.0.0, ..." },
      { "stomp-assembly-name": "System.ServiceModel, Version=4.0.0.0, ..." }
    ],
    "egress-transports": [
      { "stomp-assembly-name": "System.Messaging, Version=4.0.0.0, ..." }
    ]
  }
}
```

✅ All unique - deployment will succeed
❌ If any are duplicated - profile will fail with conflicts

**Best Practices**:
- ✅ Select from legitimate .NET assembly catalog
- ✅ Verify assembly exists on target systems (desktop vs. server assemblies)
- ✅ Use different assemblies across engagements (vary indicators)
- ✅ Document assembly selection rationale in deployment notes
- ❌ Never reuse assembly names within same profile
- ❌ Don't invent assembly names (must be real .NET assemblies)

---

## Process/Injection Level Fields

### general-config.injector.spawn-to

**Purpose**: Default process to spawn for code injection

**Location**: `c2-profile.general-config.injector["spawn-to"]`

**Format**: Full Windows path with escaped backslashes (`\\`)

**Default**: `"c:\\windows\\system32\\rundll32.exe"`

**Customization Strategy**: Select process that:
1. Exists on target systems
2. Is commonly running or benign to spawn
3. Matches target environment (corporate applications, system utilities)
4. Avoids known IOCs (rundll32, regsvr32 are common C2 targets - vary when possible)

#### Spawn-To Examples by Industry

**Generic System Utilities**:
```
"c:\\windows\\system32\\notepad.exe"
"c:\\windows\\system32\\calc.exe"
"c:\\windows\\system32\\mmc.exe"
"c:\\windows\\system32\\dllhost.exe"
"c:\\windows\\system32\\SearchProtocolHost.exe"
```

**Financial Services**:
```
"c:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE"
"c:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE"
"c:\\Program Files (x86)\\Bloomberg\\Terminal\\blpapi3.exe"
"c:\\Program Files\\Refinitiv\\Eikon\\Eikon.exe"
```

**Healthcare**:
```
"c:\\Program Files (x86)\\Epic\\EpicCare.exe"
"c:\\Program Files\\Cerner\\Millennium\\CernerClient.exe"
"c:\\Program Files (x86)\\Allscripts\\Professional\\TouchWorks.exe"
```

**Tech/SaaS**:
```
"c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
"c:\\Program Files\\Mozilla Firefox\\firefox.exe"
"c:\\Program Files\\Microsoft VS Code\\Code.exe"
"c:\\Users\\{user}\\AppData\\Local\\slack\\app-4.23.0\\slack.exe"
```

**Manufacturing/Industrial**:
```
"c:\\Program Files\\Rockwell Automation\\RSLinx\\Rslinx.exe"
"c:\\Program Files (x86)\\Siemens\\Step7\\S7bin\\s7tgtopx.exe"
"c:\\Program Files\\Wonderware\\InTouch\\view.exe"
```

**Validation**:
```bash
# Before deployment, verify process exists on target
# (Requires prior recon or knowledge of target environment)
ls "c:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE"
```

**Best Practices**:
- ✅ Use processes commonly found in target environment
- ✅ Verify process exists before deployment (via recon)
- ✅ Vary across engagements (don't always use same spawn-to)
- ❌ Don't use obviously suspicious processes (cmd.exe, powershell.exe)
- ❌ Don't use known LOLBins unless operationally justified (rundll32, regsvr32, mshta)

### general-config.injector.parent-process

**Purpose**: Process name to use as parent for PPID spoofing

**Location**: `c2-profile.general-config.injector["parent-process"]`

**Format**: Process name only (not full path): `"explorer.exe"`

**Default**: `"explorer.exe"`

**Customization Strategy**: Select parent process that:
1. Is commonly running on target systems
2. Matches expected parent for spawn-to process
3. Provides defensive plausibility (e.g., Office apps often spawned by explorer.exe)

#### Parent-Process Examples

**Generic System Parents**:
```
"explorer.exe"          // Windows shell - most common
"svchost.exe"           // Service host - common for system processes
"services.exe"          // Service Control Manager
"lsass.exe"             // Local Security Authority (less common, more suspicious)
```

**Application-Specific Parents**:
```
If spawn-to = EXCEL.EXE:
  parent-process = "explorer.exe" (user launched from Explorer)
  OR
  parent-process = "OUTLOOK.EXE" (launched from Outlook attachment/link)

If spawn-to = chrome.exe:
  parent-process = "explorer.exe" (user launched from desktop/start menu)

If spawn-to = slack.exe:
  parent-process = "explorer.exe" (launched via Start menu or desktop shortcut)
```

**Best Practices**:
- ✅ Use plausible parents (explorer.exe is always safe)
- ✅ Match parent to spawn-to process context (Office apps → explorer.exe)
- ✅ Verify parent process is running on target (via recon)
- ❌ Don't use suspicious parents (cmd.exe parent of Excel is unusual)
- ❌ Don't use parents that wouldn't spawn the child (svchost parent of chrome.exe is implausible)

### general-config.opsec.thread-start-addresses

**Purpose**: Spoof thread start addresses to appear legitimate

**Location**: `c2-profile.general-config.opsec["thread-start-addresses"]`

**Format**: Array of `dll_name!export_name` strings

**Default**: `["ntdll!RtlUserThreadStart"]`

**Customization Strategy**: Select legitimate DLL exports for thread start address spoofing

**Examples**:
```json
{
  "thread-start-addresses": ["ntdll!RtlUserThreadStart"]
}

// Alternative legitimate exports:
{
  "thread-start-addresses": ["kernel32!BaseThreadInitThunk"]
}

{
  "thread-start-addresses": ["ntdll!RtlExitUserThread"]
}
```

**Purpose of Spoofing**: Make threads created by agent appear to originate from valid DLLs rather than virtual memory, bypassing Get-InjectedThread and similar detection tools.

**Classification**: **CUSTOMIZABLE (Advanced)** - Can vary if testing different spoofing targets, but default is usually sufficient

**Best Practices**:
- ✅ Use legitimate ntdll or kernel32 exports
- ✅ Verify export exists on target OS version
- ❌ Don't use non-existent exports (breaks functionality)
- ❌ Don't use exports from application DLLs (may not be loaded)

---

## Expiration Level Fields

### general-config.settings.expire-after

**Purpose**: Unix timestamp after which agent will not execute

**Location**: `c2-profile.general-config.settings["expire-after"]`

**Format**: Unix timestamp (seconds since epoch)

**Default**: Varies by baseline profile

**Customization Strategy**: Set to engagement end date + buffer period

**Calculation**:
```bash
# Calculate Unix timestamp for specific date
date -j -f "%Y-%m-%d %H:%M:%S" "2026-03-31 23:59:59" +%s
# Output: 1743465599

# Or use online converter: https://www.unixtimestamp.com/
```

**Examples**:
```
Engagement: Jan 15 - Feb 15, 2026
expire-after: Feb 15, 2026 23:59:59 + 30 days = March 17, 2026 23:59:59
Unix: 1742169599 + (30 * 86400) = 1744761599
```

**Best Practices**:
- ✅ Set to engagement end date + 30-90 day buffer
- ✅ Use 23:59:59 on final day (not 00:00:00 - gives full day)
- ✅ Document expiration date in deployment notes (for operator awareness)
- ❌ Don't use far-future dates (year 2099) unless operationally justified
- ❌ Don't use past dates (agent won't execute)
- ❌ Don't forget to customize (leaving baseline expiration can cause premature agent death)

**Validation**:
```bash
# Convert Unix timestamp back to human-readable
date -r 1744761599
# Output: Mon Mar 17 23:59:59 PDT 2026

# Verify expiration is after engagement end
```

---

## Customization Workflow

**For each field category, follow this workflow**:

1. **Identify Baseline Value**: Read from baseline profile
2. **Determine Customization Need**: Based on engagement context (industry, timeline, OPSEC requirements)
3. **Generate Realistic Value**: Use industry examples, legitimate patterns
4. **Validate**:
   - Syntax correct (escaped backslashes, valid UUIDs, etc.)
   - Realistic (current browser versions, plausible processes, real assemblies)
   - Unique (assembly names, engagement-specific identifiers)
5. **Document**: Record customization rationale in deployment notes

---

## Customization Safety Levels

| Field | Safety Level | Pre-Deployment Validation |
|-------|--------------|---------------------------|
| URIs | High | ✅ Follow REST conventions, match industry |
| User-Agent | High | ✅ Current browser version, match target environment |
| Custom Headers | High | ✅ Realistic values (UUIDs, semantic versions) |
| Content-Type | Medium | ✅ Must match URI pattern (JSON API → application/json) |
| Assembly Names | Medium | ✅ Must be unique, must be legitimate .NET assemblies |
| spawn-to | Medium | ✅ Verify process exists on target systems (via recon) |
| parent-process | Medium | ✅ Verify process commonly running, plausible parent |
| expire-after | Low | ✅ Verify date is after engagement end, not in past |

---

## Complete Customizable Fields Checklist

**Before finalizing customizations, verify**:

**HTTP/Network**:
- [ ] All URI paths follow REST/API conventions
- [ ] All URI paths match target industry patterns
- [ ] User-Agent is current and realistic
- [ ] Custom headers include realistic values (UUIDs, semantic versions)
- [ ] Content-Type matches URI pattern (JSON API → application/json)
- [ ] No test/placeholder data (grep for "test", "example", "placeholder")

**.NET Evasion**:
- [ ] All `stomp-assembly-name` values are **unique** (run uniqueness check)
- [ ] All assembly names are legitimate .NET assemblies (not invented)
- [ ] Assembly names match target environment (server vs. desktop)

**Process/Injection**:
- [ ] spawn-to process exists on target systems (via recon)
- [ ] spawn-to process is appropriate for target environment
- [ ] parent-process is commonly running
- [ ] parent-process is plausible parent for spawn-to child

**Expiration**:
- [ ] expire-after is set to engagement timeline + buffer
- [ ] expire-after is not in the past
- [ ] expire-after date documented in deployment notes

**General**:
- [ ] All file paths use escaped backslashes (`\\`)
- [ ] All UUIDs are valid v4 format
- [ ] All semantic versions follow `major.minor.patch` format
- [ ] JSON syntax valid (no trailing commas)

---

## Sources

- Nighthawk Official Documentation (Profile section)
- Research Synthesis (Industry patterns, OPSEC best practices)
- Codebase Skill (customizing-nighthawk-profiles examples)
