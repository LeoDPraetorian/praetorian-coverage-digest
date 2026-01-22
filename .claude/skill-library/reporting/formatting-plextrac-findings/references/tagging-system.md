# PlexTrac Tagging System

**Tags control content placement in PlexTrac reports.** Missing required tags = content doesn't appear in rendered PDF.

## Critical Concept

Tags are heavily used in Praetorian's PlexTrac master template. Nearly every field and finding requires a tag to be placed properly in the report.

**The master template uses tagging to inject content into various report sections.**

---

## Required Tags (Findings)

### Phase Tags (`phase_*`)

**EVERY finding MUST have at least one `phase_` tag.**

These tags control which report section the finding appears in. Without a phase tag, the finding won't render in the PDF.

**Available phase tags:**

```
phase_internal       # Internal Network Assessment
phase_external       # External Network Assessment
phase_web            # Web Application Assessment
phase_mobile         # Mobile Application Assessment
phase_cloud          # Cloud Security Assessment
phase_desktop        # Desktop Application Assessment
phase_iot            # IoT Device Assessment
phase_llm            # LLM Application Assessment
phase_redteam        # Red Team Engagement
phase_purple         # Purple Team Engagement
```

**Important**: The phase tag must match a phase defined in Report Details → Tags. If your report doesn't have `phase_web` in Report Details, findings tagged with `phase_web` won't appear.

**Verification**: Check Report Details → Tags section to see which phase tags are active for your report.

---

## Conditional Tags (Findings)

### OWASP Tags (`owasp_*`)

**Required for**: ProdSec engagements (Web, Mobile, Desktop, IoT, LLM)

**Optional for**: CorpSec engagements (Internal, External, Red Team)

These tags populate the OWASP Top 10 comparison table in phase sections.

**Available OWASP tags:**

```
owasp_1     # OWASP Top 10 #1
owasp_2     # OWASP Top 10 #2
owasp_3     # OWASP Top 10 #3
owasp_4     # OWASP Top 10 #4
owasp_5     # OWASP Top 10 #5
owasp_6     # OWASP Top 10 #6
owasp_7     # OWASP Top 10 #7
owasp_8     # OWASP Top 10 #8
owasp_9     # OWASP Top 10 #9
owasp_10    # OWASP Top 10 #10
```

**Mapping examples** (Web Application):

- `owasp_1` → A01:2021 - Broken Access Control
- `owasp_2` → A02:2021 - Cryptographic Failures
- `owasp_3` → A03:2021 - Injection
- etc.

**Note**: OWASP Top 10 varies by category (Web, Mobile, IoT, LLM). Refer to the appropriate OWASP standard for your assessment type.

**If missing**: ProdSec reports may have incomplete OWASP tables, which affects report quality scoring.

---

## Optional Tags (Findings)

### Effective Control Tag

```
effective_control
```

**Purpose**: Include finding in the "Summary of Effective Controls" section within the phase.

**Use when**: The finding describes a security control that is working correctly (positive finding).

**Example use cases**:

- Strong MFA implementation
- Effective network segmentation
- Well-configured WAF rules
- Secure authentication flow

**Requires**: Both `phase_*` tag AND `effective_control` tag

**Example**:

```
Tags: phase_web, effective_control
```

This will place the finding in:

1. Web Application Assessment → Summary of Weaknesses (if severity > Info)
2. Web Application Assessment → Summary of Effective Controls

---

## Required Tags (Narratives)

### Executive Summary Tag (`es`)

**Required for**: Executive Summary sections (Business Impact, Engagement Scope, Effective Controls, Strategic Recommendations)

**NOT for**: Findings (use phase tags instead)

These narrative sections appear in the Executive Summary portion of the report, before the technical phase sections.

**Common ES narrative sections:**

```
Title: Business Impact
Tag: es

Title: Engagement Scope
Tag: es

Title: Effective Controls
Tag: es

Title: Strategic Recommendations
Tag: es
```

**Without `es` tag**: These sections won't appear in the Executive Summary.

---

## Conditional Tags (Narratives)

### Threat Model Tags (`threat_model`)

**Required for**: Threat modeling sections

**Use when**: Report includes threat modeling deliverables

**Common threat model sections:**

```
Title: System Diagram
Tag: threat_model

Title: User Roles
Tag: threat_model

Title: Critical Assets
Tag: threat_model

Title: Terminal Goals
Tag: threat_model

Title: Attack Surface
Tag: threat_model

Title: Attack Paths
Tag: threat_model

Title: Test Cases
Tag: threat_model
```

### Attack Narrative Tags (`attack_narrative`)

**Required for**: Attack narrative sections in Red Team engagements

**Use when**: Describing reconnaissance, initial access, lateral movement, etc.

**Common attack narrative sections:**

```
Title: Reconnaissance
Tag: attack_narrative

Title: Initial Access
Tag: attack_narrative

Title: Lateral Movement
Tag: attack_narrative

Title: Privilege Escalation
Tag: attack_narrative

Title: Data Exfiltration
Tag: attack_narrative
```

### Purple Team Tags (`purple_team`)

**Required for**: Purple team session documentation

**Use when**: Report documents purple team exercises

**Common purple team sections:**

```
Title: Purple Team Overview
Tag: purple_team

Title: Session 1 - Topic Name
Tag: purple_team

Title: Session 2 - Topic Name
Tag: purple_team
```

### Appendix Tag (`appendix`)

**Required for**: Custom appendix sections

**Use when**: Adding custom content to appendices (beyond standard scope, team, contact sections)

**Common appendix sections:**

```
Title: Scope
Tag: appendix

Title: Attribution and Deconfliction
Tag: appendix

Title: Indicators of Compromise
Tag: appendix

Title: Compromised Accounts Leveraged
Tag: appendix
```

---

## Tag Validation Checklist

Before exporting report, verify:

**Findings:**

- [ ] Every finding has at least one `phase_` tag
- [ ] Phase tags match Report Details → Tags configuration
- [ ] ProdSec findings have appropriate `owasp_` tags
- [ ] Effective controls have both `phase_*` and `effective_control` tags

**Narratives:**

- [ ] Executive Summary sections have `es` tag
- [ ] Threat model sections have `threat_model` tag (if applicable)
- [ ] Attack narratives have `attack_narrative` tag (if applicable)
- [ ] Custom appendices have `appendix` tag

---

## Common Tagging Mistakes

### Mistake 1: Missing Phase Tag

**Symptom**: Finding created but doesn't appear in rendered PDF

**Cause**: No `phase_` tag assigned

**Fix**: Add appropriate `phase_*` tag to finding

### Mistake 2: Wrong Phase Tag

**Symptom**: Finding appears in wrong section of report

**Cause**: Wrong `phase_` tag (e.g., `phase_web` but should be `phase_mobile`)

**Fix**: Update tag to correct phase

### Mistake 3: Phase Tag Not in Report

**Symptom**: Finding has `phase_` tag but still doesn't appear

**Cause**: Report Details → Tags doesn't include that phase

**Fix**: Add phase tag to Report Details → Tags, or change finding to use an existing phase tag

### Mistake 4: Missing OWASP Tags

**Symptom**: OWASP Top 10 table is incomplete in ProdSec report

**Cause**: Not all findings have `owasp_` tags

**Fix**: Add appropriate `owasp_*` tags to findings

### Mistake 5: Narrative Missing `es` Tag

**Symptom**: Business Impact or Strategic Recommendations don't appear in Executive Summary

**Cause**: Missing `es` tag on narrative sections

**Fix**: Add `es` tag to narrative

---

## Tag Usage Examples

### Example 1: Web Application Critical Finding

```
Name: SQL injection in user search endpoint
Severity: Critical
Tags: phase_web, owasp_3
```

**Result**: Appears in Web Application Assessment → Critical Findings, contributes to OWASP Top 10 #3 (Injection)

### Example 2: Internal Network Effective Control

```
Name: Strong network segmentation between production and development
Severity: Informational
Tags: phase_internal, effective_control
```

**Result**: Appears in Internal Network Assessment → Summary of Effective Controls

### Example 3: Mobile Finding with ASVS

```
Name: Weak cryptographic implementation for local data storage
Severity: High
Tags: phase_mobile, owasp_2
ASVS: V6: Stored Cryptography Verification
```

**Result**: Appears in Mobile Application Assessment → High Findings, contributes to OWASP Mobile Top 10 #2 (Insecure Data Storage), mapped to ASVS V6

### Example 4: Executive Summary Narrative

```
Title: Business Impact
Tag: es
Content: {Analysis of business risks from identified vulnerabilities}
```

**Result**: Appears in Executive Summary → Business Impact section

---

## Tag Management Tips

1. **Verify before creating finding**: Check Report Details → Tags to see which phases are active
2. **Use WriteupsDB tags**: When importing from WriteupsDB, findings may already have appropriate tags
3. **Tag search limitation**: WriteupsDB search only searches titles, not tags or content. Use tags liberally when creating WriteupsDB entries (`phase_internal`, `phase_redteam`) to aid discovery
4. **Bulk tag updates**: If you need to change tags on multiple findings, use PlexTrac's bulk edit feature (select multiple findings → Edit)
5. **Template consistency**: Ensure your report template and finding tags align (don't create findings for phases not in your template)

---

## Related Documentation

- PlexTrac Reporting Technical Overview (master template outline)
- 5. Creating a Finding (finding creation workflow)
- 2. Creating a New Report (report setup and phase configuration)
