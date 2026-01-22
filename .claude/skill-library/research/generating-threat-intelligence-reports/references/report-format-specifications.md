# Report Format Specifications

**Customer-facing threat intelligence report templates optimized for executive communication.**

**Research Source**: Based on 2026 executive security reporting best practices and dashboard design principles.

---

## Executive Summary Design Principles

### The 5-6 Metric Rule

**Research Finding** (2026 best practices):

- **Maximum metrics per dashboard**: 5-6 key indicators
- **Rationale**: Cognitive load limitation, executive time constraints
- **Progressive disclosure**: High-level overview → drill-down for details

**Application to Threat Intelligence Reports**:

- 5 Key Takeaways (bullets)
- Top 5 CVEs (priority table)
- Detection coverage summary (single percentage)

### Traffic Light System

**Visual communication standard**:
| Color | Meaning | Use in Reports |
|-------|---------|----------------|
| 🔴 **RED** | Critical/Urgent | Detection GAP + Nation-state threat |
| 🟡 **YELLOW** | Caution/Review | PARTIAL coverage or MEDIUM confidence attribution |
| 🟢 **GREEN** | Good/Monitored | COVERED by nuclei templates |

**Why traffic lights work**:

- Instant comprehension (no reading required)
- Universal understanding across cultures
- Draws attention to critical items

---

## Report Structure

### Part 1: Executive Summary (1 paragraph)

**Format**:

> Over the past {N} days, CISA added {X} vulnerabilities to the Known Exploited Vulnerabilities (KEV) catalog, with {Y} linked to nation-state actors and {Z} to ransomware campaigns. Chariot can detect {P}% of these threats, with {Q} critical detection gaps requiring immediate attention. The top priority is {CVE-ID}, exploited by {Threat Actor} and affecting {Product}.

**Character limit**: 300-400 characters (2-3 sentences)

**Purpose**: Set narrative context before presenting data

**Example**:

> Over the past 45 days, CISA added 24 vulnerabilities to the KEV catalog, with 8 linked to nation-state actors (APT28, APT29, APT41) and 5 to ransomware campaigns (LockBit 3.0, Black Basta). Chariot can detect 60% of these threats, with 2 critical detection gaps requiring immediate capability development. The top priority is CVE-2025-55182, exploited by APT28 (Russia) within 48 hours of disclosure, affecting React/Next.js applications.

---

### Part 2: Key Takeaways (5 Bullets)

**Mandatory format**:

> **Bold Title:** Single sentence explanation with supporting data.

**Required focus areas** (from Phase 5.1 in SKILL.md):

1. **Speed of Weaponization** - 0-day to KEV addition timeline
2. **Threat Actor Convergence** - Multiple groups using same CVE or targeting same sector
3. **Sector/Platform Targeting Patterns** - Which industries/technologies under attack
4. **Critical Patching Priorities** - Top 2-3 CVEs requiring immediate action
5. **Detection Coverage Status** - Summary of gaps requiring capability development

**Research-Backed Enhancement**:
Add **Cyber Risk Quantification (CRQ)** when possible:

- **From**: "We found 5 critical vulnerabilities"
- **To**: "We face $2.5M in potential ransomware exposure across 5 critical vulnerabilities"

**Example Set**:

> **Rapid Weaponization:** CVE-2025-55182 was weaponized within 48 hours of disclosure by APT28, indicating pre-knowledge and coordinated campaign targeting government agencies.

> **Multi-Actor Convergence:** Three separate threat groups (APT28, LockBit 3.0, and opportunistic actors) are exploiting CVE-2024-12345, signaling a high-value target with broad impact potential.

> **Web Infrastructure Under Siege:** 60% of KEV additions target web application frameworks (React, Apache, Cisco), reflecting attackers' focus on internet-facing attack surfaces.

> **Immediate Patching Required:** CVE-2025-55182 (React/Next.js) and CVE-2024-23456 (Cisco ASA) both have federal deadlines within 14 days and active nation-state exploitation campaigns.

> **Detection Coverage at 60%:** Chariot can detect 3 of 5 critical vulnerabilities, with 2 gaps (CVE-2025-55182, CVE-2024-77777) requiring nuclei template development to protect customer environments.

---

### Part 3: Priority Patching Recommendations Table

**Required columns**:
| Priority | CVE | Product | Threat Actor Attribution | Confidence | Detection Status |
|----------|-----|---------|-------------------------|------------|------------------|

**Extended version (for detailed reports)**:
| Priority | CVE | Product | Threat Actor | Confidence | Campaign | Deadline | CVSS | Detection |
|----------|-----|---------|--------------|-----------|----------|----------|------|-----------|

**Formatting rules**:

- **Priority**: CRITICAL/HIGH/MEDIUM (not P0/P1/P2)
- **CVE**: Hyperlinked to NVD or CISA KEV entry
- **Threat Actor**: Include country for nation-states (e.g., APT28 (Russia))
- **Confidence**: HIGH/MEDIUM/LOW/UNKNOWN
- **Detection Status**: Use emoji + text (❌ GAP, ⚠️ Partial, ✅ COVERED)

**Color coding (for PowerPoint/dashboard presentation)**:

- **Detection Status**:
  - 🔴 **RED**: GAP (white text on red background)
  - 🟡 **YELLOW**: Partial (black text on yellow background)
  - 🟢 **GREEN**: COVERED (white text on green background)
- **Priority**:
  - CRITICAL: Bold red text
  - HIGH: Bold orange text
  - MEDIUM: Bold text

**Example Table** (Markdown):

```markdown
| Priority     | CVE                                                               | Product            | Threat Actor Attribution | Confidence | Detection Status |
| ------------ | ----------------------------------------------------------------- | ------------------ | ------------------------ | ---------- | ---------------- |
| **CRITICAL** | [CVE-2025-55182](https://nvd.nist.gov/vuln/detail/CVE-2025-55182) | React/Next.js      | APT28 (Russia)           | HIGH       | ❌ **GAP**       |
| **HIGH**     | [CVE-2024-12345](https://nvd.nist.gov/vuln/detail/CVE-2024-12345) | Apache Struts      | LockBit 3.0              | HIGH       | ✅ COVERED       |
| **HIGH**     | [CVE-2024-23456](https://nvd.nist.gov/vuln/detail/CVE-2024-23456) | Cisco ASA          | APT41 (China)            | MEDIUM     | ✅ COVERED       |
| **MEDIUM**   | [CVE-2024-34567](https://nvd.nist.gov/vuln/detail/CVE-2024-34567) | VMware vCenter     | Opportunistic            | N/A        | ⚠️ Partial       |
| **MEDIUM**   | [CVE-2024-45678](https://nvd.nist.gov/vuln/detail/CVE-2024-45678) | Microsoft Exchange | Unknown                  | LOW        | ✅ COVERED       |
```

---

### Part 4: Threat Actor Attribution Cards (Detailed View)

**When to include**: For HIGH confidence nation-state or ransomware attributions

**Format per CVE**:

```markdown
### CVE-YYYY-NNNNN: {Vulnerability Name}

**Threat Actor:** {Group Name} ({Country if nation-state})
**Actor Type:** {Nation-state/Ransomware/Opportunistic}
**Attribution Confidence:** {HIGH/MEDIUM/LOW}
**Campaign:** {Named campaign or "Unnamed"}
**First Observed:** {Date} ({X} days after disclosure)
**Target Sectors:** {Comma-separated industries}
**Target Geographies:** {Countries/regions}
**Exploitation Method:** {Brief description}

**Evidence & Sources:**

1. [{Source 1 Name}]({URL}) - {Publication Date} - "{Relevant Quote}"
2. [{Source 2 Name}]({URL}) - {Publication Date} - "{Relevant Quote}"

**Business Impact:** {HIGH/MEDIUM/LOW} - {1 sentence justification}
**Recommended Action:** {Specific remediation guidance}
```

**Example**:

```markdown
### CVE-2025-55182: React Server Components Remote Code Execution

**Threat Actor:** APT28 (Fancy Bear)
**Actor Type:** Nation-state
**Country:** Russia
**Attribution Confidence:** HIGH
**Campaign:** Winter Vivern
**First Observed:** Jan 1, 2025 (48 hours after Dec 30, 2024 disclosure)
**Target Sectors:** Government (US, EU), Defense contractors, Financial services
**Target Geographies:** United States, European Union, NATO allies
**Exploitation Method:** Spearphishing emails with malicious RSC payloads, triggering server-side code execution

**Evidence & Sources:**

1. [Microsoft Threat Intelligence Center](https://microsoft.com/ti/apt28-rsc) - Jan 3, 2025 - "APT28 conducted widespread scanning for vulnerable React Server Component endpoints within 24 hours of CVE disclosure"
2. [Unit 42 Threat Brief](https://unit42.paloaltonetworks.com/apt28-rsc-campaign/) - Jan 5, 2025 - "Winter Vivern campaign targeted 18 US government agencies using CVE-2025-55182 exploit"

**Business Impact:** HIGH - React/Next.js frameworks are prevalent in customer web applications, affecting an estimated 40% of Chariot customer environments.
**Recommended Action:** Immediate patching to latest Next.js version (14.1.2+) AND implement WAF rules to block malicious RSC payloads as defense-in-depth until patching complete.
```

---

### Part 5: Detection Gap Analysis

**When to include**: When one or more CVEs have detection status = GAP

**Purpose**: Transparency about Chariot's current blind spots and roadmap for coverage improvement

**Format**:

```markdown
## Detection Gaps Identified

The following vulnerabilities are actively exploited but **not yet detectable** by Chariot:

### 1. CVE-YYYY-NNNNN - {Vulnerability Name}

- **Threat Actor:** {Actor} ({Type}) - {Confidence}
- **Exploitation:** Active since {Date}
- **Customer Exposure:** {HIGH/MEDIUM/LOW} ({% of customers or product prevalence})
- **Template Status:** No verified nuclei template available
- **Recommendation:** Create nuclei template (estimated {X}-{Y} hours)
- **Priority:** {CRITICAL/HIGH/MEDIUM} - {Justification}
- **Business Impact:** {1-2 sentences on customer risk}

### 2. CVE-YYYY-NNNNN - ...

---

**Detection Coverage Summary:**

- Total CVEs analyzed: {N}
- **COVERED** (Chariot can detect): {X} ({P}%)
- **PARTIAL** (Limited detection): {Y} ({P}%)
- **GAP** (Blind spot): {Z} ({P}%)

**Capability Development Recommendations:**

1. **Immediate** (P0): CVE-YYYY-NNNNN (nation-state + high customer exposure)
2. **High Priority** (P1): CVE-YYYY-NNNNN (ransomware + medium customer exposure)
3. **Standard Priority** (P2): CVE-YYYY-NNNNN (opportunistic + low customer exposure)
```

**Example**:

```markdown
## Detection Gaps Identified

The following vulnerabilities are actively exploited but **not yet detectable** by Chariot:

### 1. CVE-2025-55182 - React Server Components Remote Code Execution

- **Threat Actor:** APT28 (Russia) - Nation-state - HIGH confidence
- **Exploitation:** Active since Jan 1, 2025 (ongoing for 9 days)
- **Customer Exposure:** HIGH (React/Next.js in ~40% of customer web applications)
- **Template Status:** No verified nuclei template (AI-generated template exists but unverified)
- **Recommendation:** Create production-ready nuclei template (estimated 2-4 hours)
- **Priority:** CRITICAL - Nation-state threat + widespread customer exposure + no current detection
- **Business Impact:** Without detection capability, customers using React Server Components are vulnerable to APT28 exploitation with no visibility or alerting from Chariot platform.

### 2. CVE-2024-77777 - PostgreSQL Privilege Escalation

- **Threat Actor:** Opportunistic - LOW confidence
- **Exploitation:** Active since Dec 15, 2024
- **Customer Exposure:** MEDIUM (PostgreSQL in ~25% of customer databases)
- **Template Status:** No template available (network-based detection required)
- **Recommendation:** Create network protocol template (estimated 1-2 days for Postgres wire protocol analysis)
- **Priority:** HIGH - Moderate customer exposure + complex template development
- **Business Impact:** Database compromise could lead to data exfiltration in affected customer environments.

---

**Detection Coverage Summary:**

- Total CVEs analyzed: 5
- **COVERED** (Chariot can detect): 3 (60%)
- **PARTIAL** (Limited detection): 0 (0%)
- **GAP** (Blind spot): 2 (40%)

**Capability Development Recommendations:**

1. **Immediate** (P0): CVE-2025-55182 (APT28 nation-state + 40% customer exposure)
2. **High Priority** (P1): CVE-2024-77777 (moderate exposure + database criticality)
```

---

## Output File Structure

### Primary Report: REPORT.md

**Location**: `.claude/.output/threat-intelligence/{timestamp}-kev-{N}day-report/REPORT.md`

**Contents** (in order):

1. Report metadata (date generated, timeframe, CVE count)
2. Executive Summary (1 paragraph)
3. Key Takeaways (5 bullets)
4. Priority Patching Recommendations (table)
5. Threat Actor Attribution Cards (detailed, for HIGH confidence only)
6. Detection Gap Analysis (if gaps exist)
7. Appendices (optional):
   - Remediation timeline recommendations
   - MITRE ATT&CK technique mapping
   - Compliance impact (FCEB directives)

### Supporting File: ATTRIBUTION-SOURCES.md

**Location**: Same OUTPUT_DIR

**Purpose**: Citation transparency and verification

**Contents**:

```markdown
# Attribution Sources

## CVE-2025-55182

**Attribution:** APT28 (Russia) - Nation-state
**Confidence:** HIGH

### Sources:

1. **Microsoft Threat Intelligence Center**
   - URL: https://microsoft.com/ti/apt28-rsc
   - Date: Jan 3, 2025
   - Quote: "APT28 conducted widespread scanning for vulnerable React Server Component endpoints within 24 hours of CVE disclosure"
   - Tier: 2 (Vendor Threat Intelligence)

2. **Unit 42 Threat Brief**
   - URL: https://unit42.paloaltonetworks.com/apt28-rsc-campaign/
   - Date: Jan 5, 2025
   - Quote: "Winter Vivern campaign targeted 18 US government agencies using CVE-2025-55182 exploit"
   - Tier: 2 (Vendor Threat Intelligence)

---

## CVE-2024-12345

...
```

---

## Presentation Formats

### PowerPoint/Keynote Slides

**Slide 1: Executive Summary**

- Title: "Threat Intelligence Report - {Timeframe}"
- Body: Executive summary paragraph
- Footer: "Generated {Date} | Chariot Security Platform"

**Slide 2: Key Takeaways**

- Title: "5 Key Findings"
- Body: Bullets (with icons for visual appeal)
- Footer: Source citations

**Slide 3: Priority Patching Table**

- Title: "Top 5 Vulnerabilities Requiring Action"
- Body: Table with color-coded detection status
- Footer: "Color Key: 🔴 No Detection | 🟡 Limited | 🟢 Monitored"

**Slide 4-8: Attribution Cards** (one per slide for CRITICAL/HIGH priority)

- Title: "{CVE-ID}: {Vulnerability Name}"
- Body: Attribution card format
- Footer: Evidence sources

**Slide 9: Detection Coverage**

- Title: "Chariot Detection Coverage & Roadmap"
- Body: Pie chart (60% Covered, 40% Gap) + gap list
- Footer: Capability development timeline

### Dashboard Integration

**For Chariot UI integration** (future enhancement):

**Widget 1: Security Posture Score**

- Single number (0-100) calculated from:
  ```
  score = (100 - (critical_vulns * 10 + high_vulns * 5)) * (detection_coverage_percentage / 100)
  ```
- Traffic light indicator

**Widget 2: KEV Remediation Rate**

- Percentage of KEV vulns patched within federal deadlines
- Trend graph (6-month)

**Widget 3: Top 5 Risks**

- Mini version of priority patching table
- Click to drill down for details

**Widget 4: Threat Actor Heatmap**

- Geographic visualization of threat actor targeting
- Color intensity = number of active campaigns

**Widget 5: Detection Coverage Breakdown**

- Pie chart or stacked bar chart
- COVERED / PARTIAL / GAP percentages

---

## Language Translation Guidance

### From Technical to Business Language

**Research Finding**: Security metrics require translation to business language for executive communication

| Technical                 | Business Translation                                             |
| ------------------------- | ---------------------------------------------------------------- |
| "5 critical CVEs"         | "$2.5M in potential ransomware exposure"                         |
| "Nation-state APT28"      | "Russian government-sponsored hackers"                           |
| "Detection gap"           | "Blind spot in our security monitoring"                          |
| "KEV deadline in 14 days" | "Federal mandate requires patching by {Date}"                    |
| "CVSS 9.8 Critical"       | "Maximum severity vulnerability"                                 |
| "60% detection coverage"  | "We can detect 3 of 5 threats; 2 require capability development" |

**CRQ (Cyber Risk Quantification) Example**:

> "CVE-2025-55182 affects React applications representing $12M in annual revenue. Based on IBM X-Force ransomware data ($4.5M average ransom), this vulnerability poses $4.5M in potential financial exposure if exploited."

---

## Common Mistakes to Avoid

| Mistake                         | Why It's Wrong                              | Fix                              |
| ------------------------------- | ------------------------------------------- | -------------------------------- |
| **Too many metrics**            | Cognitive overload, executives skip reading | Stick to 5-6 key metrics         |
| **No visual cues**              | Text-heavy reports don't get read           | Use traffic lights, color coding |
| **Technical jargon**            | Executives don't understand CVE/CVSS        | Translate to business impact     |
| **Point-in-time snapshots**     | No context on improvement/degradation       | Show 6-12 month trends           |
| **Missing attribution sources** | Cannot verify claims                        | Include citation URLs + dates    |
| **All gaps equal priority**     | Wastes time on low-risk items               | Use prioritization algorithm     |

---

## Related References

- [Attribution Research Methodology](attribution-research-methodology.md) - How to gather attribution data
- [Prioritization Algorithm](prioritization-algorithm.md) - How to rank CVEs
- [Detection Coverage Analysis](detection-coverage-analysis.md) - How to determine coverage status
