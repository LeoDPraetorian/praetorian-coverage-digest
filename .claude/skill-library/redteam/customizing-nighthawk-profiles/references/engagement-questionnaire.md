# Engagement Questionnaire

**Context-gathering template for Nighthawk profile customization. Use AskUserQuestion to collect this information before customizing profiles.**

**Sources**: Codebase skill (Phase 2 workflow) + Research synthesis (Industry patterns)

---

## Question Set 1: Client/Target Information

### Q1: Organization Name

**Question**: "What is the target organization's name?"

**Purpose**: Used for:
- Tenant IDs (`X-Tenant-ID: "acme-corp-prod"`)
- Profile naming (`acme-corp-2026-01-13.json`)
- Deployment notes documentation

**Format**: Organization name (e.g., "ACME Corporation", "BigCorp Industries")

---

### Q2: Industry Vertical

**Question**: "Which industry does the target organization operate in?"

**Options**:
- Financial Services (banking, trading, fintech)
- Healthcare (hospitals, healthcare providers, pharma)
- Technology/SaaS (software companies, cloud providers)
- Manufacturing/Industrial (factories, SCADA, IoT)
- Government/Defense
- Retail/E-Commerce
- Other (specify)

**Purpose**: Determines:
- URI path patterns (financial APIs vs. healthcare FHIR vs. SCADA)
- User-Agent selection (modern browsers vs. legacy)
- Custom header patterns (industry-specific identifiers)

---

### Q3: Geographic Location

**Question**: "What is the target organization's primary geographic location?"

**Options**:
- North America (US, Canada)
- Europe (EU)
- Asia Pacific (APAC)
- Other (specify)

**Purpose**: Used for:
- Timezone considerations (expiration timestamps)
- Locale headers (Accept-Language, X-Locale)
- Regional compliance patterns

---

## Question Set 2: Technical Environment

### Q4: Operating System Demographics

**Question**: "What operating systems are commonly used in the target environment?"

**Options** (multiSelect):
- Modern Windows (Windows 10/11)
- Legacy Windows (Windows 7/8.1)
- macOS
- Linux
- Embedded/SCADA systems
- Unknown (will use modern Windows assumption)

**Purpose**: Determines:
- User-Agent OS version (NT 10.0 vs. NT 6.1)
- spawn-to process selection (modern vs. legacy applications)
- Architecture considerations (x64 vs. x86)

---

### Q5: Browser Policy

**Question**: "What browsers are used in the target environment? (Select all that apply)"

**Options** (multiSelect):
- Google Chrome (most common corporate browser)
- Microsoft Edge (Microsoft-centric environments)
- Mozilla Firefox (privacy-focused organizations)
- Internet Explorer 11 (legacy healthcare/industrial)
- Safari (macOS environments)
- Unknown (will use Chrome assumption)

**Purpose**: Determines User-Agent selection and version

---

### Q6: Known Applications

**Question**: "Are there specific applications commonly used in the target environment that we should mimic for spawn-to/parent-process?"

**Examples**:
- Microsoft Office (Excel, Outlook, Word)
- Industry-specific applications (Bloomberg Terminal, Epic EpicCare, Salesforce)
- Communication tools (Slack, Teams, Zoom)
- Development tools (VS Code, Visual Studio, IntelliJ)

**Purpose**: Determines:
- spawn-to process path
- parent-process selection
- Application-specific traffic patterns to mimic

---

## Question Set 3: Engagement Details

### Q7: Engagement Timeline

**Question**: "What are the engagement start and end dates?"

**Format**: "Start: YYYY-MM-DD, End: YYYY-MM-DD"

**Purpose**: Calculates:
- `expire-after` timestamp (end date + buffer)
- User-Agent version selection (current as of engagement date)

**Example**:
```
Input: "Start: 2026-01-15, End: 2026-02-15"
expire-after calculation: 2026-02-15 + 30 days = 2026-03-17 23:59:59
Unix timestamp: 1742255999
```

---

### Q8: Engagement Code Name or Identifier

**Question**: "What is the internal code name or identifier for this engagement?"

**Purpose**: Used for:
- Profile filename (`{code-name}-2026-01-13.json`)
- Deployment notes header
- X-Tenant-ID or X-Organization-ID values (if using engagement-specific identifiers)

**Examples**: "Operation Alpha", "Acme-Corp-Q1-2026", "Engagement-2026-001"

---

### Q9: Specific OPSEC Requirements

**Question**: "Are there specific OPSEC requirements or constraints for this engagement?"

**Examples**:
- "Must avoid triggering EDR product X"
- "Client has network IDS monitoring for C2 patterns"
- "Need to blend with existing Slack traffic"
- "Target has strict browser policy (Chrome only)"
- "Must mimic specific internal API ({api-pattern})"

**Purpose**: Determines:
- Customization priorities (focus on blending with specific traffic)
- Additional validation steps (test against specific detection systems)
- Extra caution on certain fields

---

## Question Set 4: Customization Scope

### Q10: Profile Sections to Customize

**Question**: "Which profile sections need customization?"

**Options** (multiSelect):
- HTTP indicators (User-Agents, URIs, headers) ← **Recommended for all**
- Assembly stomp names (.NET evasion) ← **Recommended for all**
- Process injection targets (spawn-to, parent-process)
- Expiration date ← **Recommended for all**
- Beacon timing (interval, jitter) ← Requires approval
- OPSEC settings ← Requires strong justification

**Default**: HTTP indicators + Assembly names + Expiration (minimal safe customization)

**Purpose**: Determines scope of customization effort

---

### Q11: Baseline Profile

**Question**: "Which baseline profile should be used as the starting point?"

**Options**:
- Default Nighthawk profile (standard OPSEC settings)
- Previous engagement profile from same industry (with modifications)
- Custom baseline for this client
- Other (specify path)

**Purpose**: Determines starting point for customizations

---

### Q12: Static Indicators to Avoid

**Question**: "Are there any known static indicators from previous engagements that should be avoided?"

**Examples**:
- "Don't use /api/v2/status URI (used in previous engagement)"
- "Avoid System.Web.Mobile assembly (used before)"
- "Don't use Chrome 120 User-Agent (used in last 3 engagements)"

**Purpose**: Ensures variation across engagements, prevents fingerprinting

---

## Question Set 5: Traffic Patterns (Optional)

### Q13: Specific Traffic to Mimic

**Question**: "Should the profile mimic specific legitimate traffic in the target environment?"

**Examples**:
- "Mimic internal Slack traffic"
- "Mimic Bloomberg Terminal API calls"
- "Mimic Microsoft Teams telemetry"
- "Mimic internal monitoring API (Datadog/Splunk)"

**Purpose**: If yes, research specific traffic patterns and match:
- User-Agents used by that service
- URI patterns
- Custom headers
- Request/response timing

---

## Questionnaire Workflow (Using AskUserQuestion)

**Step 1: Core Questions (Required)**:
```javascript
AskUserQuestion({
  questions: [
    {
      header: "Target Org",
      question: "What is the target organization name and industry?",
      options: [
        { label: "Financial Services", description: "Banking, trading, fintech" },
        { label: "Healthcare", description: "Hospitals, healthcare providers" },
        { label: "Technology/SaaS", description: "Software companies, cloud providers" },
        { label: "Manufacturing/Industrial", description: "Factories, SCADA, IoT" },
      ],
    },
    {
      header: "Timeline",
      question: "What are the engagement dates? (I'll calculate expiration)",
      options: [
        { label: "Let me type the dates", description: "Provide start and end dates" },
      ],
    },
  ],
});
```

**Step 2: Technical Environment** (Recommended):
```javascript
AskUserQuestion({
  questions: [
    {
      header: "OS Environment",
      question: "What operating systems are common in target environment?",
      multiSelect: true,
      options: [
        { label: "Modern Windows (10/11)", description: "Current corporate standard" },
        { label: "Legacy Windows (7/8.1)", description: "Healthcare/industrial legacy systems" },
        { label: "macOS", description: "Apple-centric environments" },
        { label: "Unknown", description: "Assume modern Windows" },
      ],
    },
    {
      header: "Browsers",
      question: "Which browsers are used? (Select all)",
      multiSelect: true,
      options: [
        { label: "Chrome (Recommended)", description: "Most common corporate browser" },
        { label: "Edge", description: "Microsoft-centric environments" },
        { label: "Firefox", description: "Privacy-focused organizations" },
        { label: "IE11", description: "Legacy healthcare/industrial" },
      ],
    },
  ],
});
```

**Step 3: Customization Scope** (Optional but helpful):
```javascript
AskUserQuestion({
  questions: [
    {
      header: "Customization",
      question: "Which sections should be customized?",
      multiSelect: true,
      options: [
        { label: "HTTP indicators (Recommended)", description: "User-Agents, URIs, headers" },
        { label: "Assembly names (Recommended)", description: ".NET evasion assemblies" },
        { label: "Expiration date (Recommended)", description: "Set to engagement timeline" },
        { label: "Process injection", description: "spawn-to, parent-process" },
      ],
    },
  ],
});
```

---

## Questionnaire Output

**After collecting answers, generate summary**:

```markdown
## Engagement Context Summary

**Target**: {Organization Name}
**Industry**: {Industry Vertical}
**Location**: {Geographic Region}

**Technical Environment**:
- OS: {Windows 10/11, Windows 7, macOS, Linux}
- Browsers: {Chrome, Edge, Firefox, IE11}
- Known Applications: {Office, Bloomberg, Epic, etc.}

**Engagement Details**:
- Timeline: {Start Date} to {End Date}
- Code Name: {Identifier}
- OPSEC Requirements: {Specific constraints}

**Customization Scope**:
- HTTP indicators: ✅
- Assembly names: ✅
- Expiration: ✅
- Process injection: {Yes/No}
- Beacon timing: {Yes/No - requires approval}

**Customization Strategy**:
- User-Agent: {Chrome 122 on Windows 10} (matches modern corporate environment)
- URI Theme: {Financial APIs} (matches industry)
- Headers: {Standard REST API headers + X-Request-ID, X-Client-Version}
- Assembly Names: {3 unique} (System.Web.Mobile, System.Data.OracleClient, System.ServiceModel)
- Expiration: {2026-03-17 23:59:59} (engagement end + 30 day buffer)
```

This summary guides all customization decisions.

---

## Sources

- Codebase Skill (Phase 2 engagement context gathering)
- Research Synthesis (Industry patterns for targeted questions)
