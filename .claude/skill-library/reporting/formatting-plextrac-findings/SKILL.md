---
name: formatting-plextrac-findings
description: Use when formatting security findings for PlexTrac reports - provides structured field templates, required tagging (phase_, owasp_, effective_control), CVSS 4.0 scoring integration, VKB layout compliance, and API-ready output preparation for Praetorian's PlexTrac platform
allowed-tools: Read, Write, AskUserQuestion, TodoWrite, Skill
---

# Formatting PlexTrac Findings

**Structured finding formatter for PlexTrac with validation, tagging, and API-ready output.**

## What This Skill Does

Guides users through formatting security findings for Praetorian's PlexTrac reporting platform with:

- **Required field structure** - Name, Severity, CVSS 4.0, Description, Evidence, Remediation, etc.
- **Tagging system validation** - `phase_` (required), `owasp_` (ProdSec), `effective_control` (optional)
- **VKB layout compliance** - Custom fields like "Verification and Attack Information", "Systems Impacted"
- **CVSS 4.0 integration** - Links to `scoring-cvss-findings` skill for proper scoring
- **API-ready structure** - Fields organized for future PlexTrac API integration

**Current workflow**: Manual copy/paste into PlexTrac UI
**Future workflow**: Direct API integration (fields are prepared for this)

---

## When to Use

Use this skill when:

- Formatting a new security finding for a PlexTrac report
- Validating an existing finding has all required fields
- Preparing findings for import into PlexTrac
- Structuring findings for future API automation

**NOT for:**
- Creating findings in other formats (use generic finding templates)
- Threat modeling (use `threat-modeling` skill)
- Executive summaries or narratives (different PlexTrac sections)

---

## Quick Reference

### Required Fields (All Findings)

| Field | Type | Requirement | Notes |
|-------|------|-------------|-------|
| **Name** | Text | REQUIRED | Short, actionable title |
| **Severity** | Enum | REQUIRED | Critical/High/Medium/Low/Informational |
| **CVSS Score** | Number | REQUIRED | CVSS 4.0 base score (auto-calculates severity) |
| **CVSS Vector** | String | REQUIRED | Full CVSS 4.0 vector string |
| **Tags** | Array | REQUIRED | Must include at least one `phase_` tag |
| **Description** | Markdown | REQUIRED | Detailed explanation of vulnerability |
| **Impact** | Markdown | REQUIRED | Attacker capabilities and consequences (narrative paragraphs) |
| **Verification and Attack Information** | Markdown | REQUIRED | Evidence, reproduction steps, exploitation details |
| **Recommendations** | Markdown | REQUIRED | Specific, actionable fix steps |

### VKB Custom Fields (Layout-Specific)

| Field | When Required | Notes |
|-------|---------------|-------|
| **Verification and Attack Information** | All findings | How to reproduce/exploit |
| **Systems Impacted** | All findings | Specific assets/endpoints affected |
| **ASVS** | Mobile/Web findings | ASVS category selection |

### Required Tags

| Tag Pattern | Required For | Purpose |
|-------------|--------------|---------|
| `phase_*` | ALL findings | Controls report section placement |
| `owasp_*` | ProdSec engagements | OWASP Top 10 table population |
| `effective_control` | Optional | Long-form effective control section |
| `es` | Narratives only | Executive summary sections |

**Complete tag reference:** [references/tagging-system.md](references/tagging-system.md)

---

## Core Workflow

### Step 1: Gather Finding Information

**Collect from assessment activities:**

- Vulnerability description and root cause
- Affected systems/endpoints
- Exploitation steps and evidence
- Impact assessment
- Remediation guidance

**Use TodoWrite** to track finding creation progress.

### Step 2: Determine Severity with CVSS 4.0

**CRITICAL**: PlexTrac uses CVSS 4.0 by default (not 3.1).

**Invoke the CVSS scoring skill:**

```
Skill tool: "scoring-cvss-findings"
```

**Provide to the skill:**
- Vulnerability description
- Attack scenario
- Impact scope
- Exploitation requirements

**The skill will**:
- Guide you through CVSS 4.0 vector selection
- Calculate base score
- Provide severity rating
- Document justification

**Output**: CVSS 4.0 vector string + base score (e.g., `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N` → 9.3 Critical)

**Severity mapping**: Critical (9.0-10.0), High (7.0-8.9), Medium (4.0-6.9), Low (0.1-3.9), Informational (0.0)

**See:** [references/cvss-guidance.md](references/cvss-guidance.md) for PlexTrac-specific CVSS considerations.

### Step 3: Select Required Tags

**Every finding MUST have at least one `phase_` tag.**

**Common phase tags:**

```
phase_internal       # Internal network assessment
phase_external       # External network assessment
phase_web            # Web application assessment
phase_mobile         # Mobile application assessment
phase_cloud          # Cloud security assessment
phase_desktop        # Desktop application assessment
phase_iot            # IoT device assessment
phase_llm            # LLM application assessment
phase_redteam        # Red team engagement
phase_purple         # Purple team engagement
```

**ProdSec-specific tags (if applicable):**

```
owasp_1    # OWASP Top 10 #1
owasp_2    # OWASP Top 10 #2
...
owasp_10   # OWASP Top 10 #10
```

**Optional tags:**

```
effective_control    # Include in Effective Controls section
```

**Missing `phase_` tag = finding won't appear in the report!**

**See:** [references/tagging-system.md](references/tagging-system.md) for complete tag catalog.

### Step 4: Complete Required Fields

Use the template structure:

```markdown
## {Finding Name in Title Case}

**Severity:** {Critical/High/Medium/Low/Informational}
**CVSS:** {Base Score} ({Severity})
**CVSS Vector:** {Full vector string}
**Tags:** {phase_tag}, {optional tags}

### Description

{Detailed explanation of the vulnerability, root cause, and why it exists}

### Impact

{1-3 paragraphs describing what attacker can do and the consequences. Use narrative style focused on attacker capabilities and resulting harm. Include specific examples when applicable. No subsections - write as flowing paragraphs.}

**Example structure:**
- Paragraph 1: What attacker can do with this vulnerability
- Paragraph 2 (optional): Specific consequences or examples discovered during assessment
- Bullet points (optional): Multiple specific consequences when applicable

### Verification and Attack Information

{Step-by-step reproduction/exploitation instructions with embedded evidence}

1. {Step 1}
2. {Step 2}
3. {Observed behavior}

**Evidence:**

![Description of screenshot](path/to/image.png)

**Request:**
\`\`\`http
{HTTP request}
\`\`\`

**Response:**
\`\`\`http
{HTTP response}
\`\`\`

**Note:** Evidence should be embedded in this section, not separated. Screenshots, logs, API responses, and command output all belong here to prove the vulnerability exists and demonstrate exploitation.

### Systems Impacted

{Specific systems, endpoints, or assets affected}

- System/Endpoint: {details}
- Component: {details}

### Recommendations

{Specific, actionable steps to fix the vulnerability}

**Immediate (Within 14-30 Days):**
1. {Urgent fix step 1}
2. {Urgent fix step 2}

**Short-Term (Within 60-90 Days):**
1. {Important fix step 1}
2. {Important fix step 2}

**Long-Term (Within 6-12 Months):**
1. {Architectural improvement 1}
2. {Architectural improvement 2}

**Validation:**
1. {How to verify fix worked}

**Note:** Use descriptive timeline labels, NOT P0/P1/P2/P3 priority notation.

### References

- {Link to documentation}
- {Link to CVE or security advisory}
- {Link to vendor guidance}
```

**Full template:** [references/finding-template.md](references/finding-template.md)

### Step 5: Add VKB Custom Fields

**IMPORTANT**: Set "Findings Layout" to "VKB" in Report Details first.

In PlexTrac UI, use "Add custom fields from layout" to ensure fields render in correct order:

1. **Verification and Attack Information** - How to reproduce
2. **Systems Impacted** - Affected assets
3. **ASVS** (if applicable) - ASVS category

**Custom field details:** [references/vkb-layout.md](references/vkb-layout.md)

### Step 6: Validate and Format

**Pre-submission checklist:**

- [ ] Name is clear and actionable
- [ ] Severity matches CVSS 4.0 base score
- [ ] CVSS vector string is complete
- [ ] At least one `phase_` tag present
- [ ] `owasp_` tag present (if ProdSec engagement)
- [ ] Description explains the vulnerability clearly
- [ ] Evidence includes screenshots/logs
- [ ] Remediation is specific and actionable
- [ ] All custom fields populated

**Image formatting:**
- Add black outlines to light-colored images (PlexTrac has white background)
- Use tools like Skitch for image annotation
- See [references/image-formatting.md](references/image-formatting.md)

### Step 7: Output for PlexTrac

**Current Method: Manual Copy/Paste**

1. Copy formatted markdown
2. Navigate to PlexTrac report → Findings tab
3. Click "Add Findings" → "Create Finding"
4. Set Name and Severity
5. Paste content into appropriate fields
6. Add tags in the Tags field
7. Save finding

**Future Method: API Integration** (not yet implemented)

The field structure produced by this skill is designed to map directly to PlexTrac API endpoints. When API integration is added, the same field structure will be used.

**API preparation:** [references/api-preparation.md](references/api-preparation.md)

---

## Report Quality Standards

**CRITICAL:** Before finalizing findings, review quality standards to ensure professional, client-ready deliverables.

**Key Quality Checks:**

1. **Client Quote Handling** - Paraphrase all client statements, never use verbatim quotes
2. **Internal Reference Removal** - Remove all `.claude/`, `/Users/`, file paths and internal tracking references
3. **Priority Label Handling** - Policy priority OK (technical data), P0/P1/P2/P3 NOT OK (use descriptive timelines)
4. **Cross-Finding References** - Use descriptive titles, never "F01" or "Finding 9" notation
5. **Title Formatting** - Always use Title Case for finding titles
6. **Section Headers** - Use "Recommendations" (not "Remediation"), follow VKB layout field names
7. **Walkthrough Content** - Paraphrase all call content, remove timestamps and speaker names

**Complete standards and examples:** [references/report-quality-standards.md](references/report-quality-standards.md)

---

## Field Specifications

### Name Field

- **Format**: Short, actionable title (50-80 characters ideal)
- **Style**: Title Case (capitalize major words, lowercase articles/conjunctions/short prepositions)
- **Examples**:
  - ✅ "SQL Injection in User Search Endpoint"
  - ✅ "Weak Password Policy Allows Credential Attacks"
  - ❌ "sql injection in user search endpoint" (lowercase)
  - ❌ "The Application Suffers From SQL Injection in the Search Functionality" (too long, passive voice)

### Description Field

**Purpose**: Explain what the vulnerability is, why it exists, and its security implications.

**Structure**:
1. What: The vulnerability and where it occurs
2. Why: Root cause or configuration issue
3. Impact: Security implications

**Length**: 2-4 paragraphs typical

### Impact Field

**Purpose**: Describe what an attacker can do with this vulnerability and the resulting consequences.

**CRITICAL:** This field is MANDATORY and must appear between Description and Verification sections.

**Format**: Simple paragraph(s) - NO subsections with headers. Write in narrative style.

**Structure**:

1. **First paragraph**: Describe what attacker can do by exploiting this vulnerability
2. **Additional paragraphs (optional)**: Specific consequences, examples from assessment, or additional context
3. **Bullet points (optional)**: When there are multiple distinct consequences to list

**Length**: Typically 1-3 paragraphs

**Style**: Attack-centric narrative. Focus on attacker capabilities and resulting harm, not categorized impact types.

**Real examples from VKB templates:** See [references/impact-section-examples.md](references/impact-section-examples.md) for 6 complete examples from mobile, web, IoT, and cloud templates showing correct narrative paragraph format.

### Verification and Attack Information Field

**Purpose**: Prove the vulnerability exists with concrete data AND demonstrate exploitation steps.

**CRITICAL:** Evidence should be embedded in this section, NOT separated into an "Evidence" section.

**Include**:
- Step-by-step reproduction instructions
- Screenshots with annotations
- HTTP request/response pairs
- Log excerpts
- Command output (curl, dig, nmap, etc.)
- Code snippets (if source code review)
- API responses and policy configurations

**Structure**:
1. Reproduction steps (numbered list)
2. Embedded evidence (screenshots, code blocks, JSON) proving each step
3. Observed behavior
4. Attack scenario (if applicable)

**Image best practices**: Add outlines, annotate key areas, caption clearly

**Why This Matters:** PlexTrac VKB layout uses "Verification and Attack Information" as the field name. Splitting evidence into a separate section creates confusion and doesn't match the platform's structure.

### Recommendations Field

**Purpose**: Provide specific, actionable fix steps.

**CRITICAL:** Use "Recommendations" header, not "Remediation" (client preference for consultative tone).

**Structure**:
1. **Immediate (Within 14-30 Days)** - Urgent fixes to stop active exploitation
2. **Short-Term (Within 60-90 Days)** - Important security improvements
3. **Long-Term (Within 6-12 Months)** - Architectural changes and preventive controls
4. **Validation** - Steps to confirm fix works

**Include**:
- Code examples (if applicable)
- Configuration changes with specific settings
- Validation commands to test remediation
- Alternative approaches if primary solution has constraints

**Avoid**:
- ❌ P0/P1/P2/P3 priority notation (internal project management shorthand)
- ✅ Use descriptive timeline labels instead (Immediate, Short-Term, Long-Term, As Resources Permit)

**Complete field specifications:** [references/field-specifications.md](references/field-specifications.md)

---

## ASVS Integration (Mobile/Web Only)

For Mobile and Web application findings, PlexTrac includes ASVS (Application Security Verification Standard) categorization.

**See:** [references/asvs-integration.md](references/asvs-integration.md) for complete category list and usage guidance.

---

## Integration

### Called By

- Security engineers during report writing
- Assessment workflows (manual finding creation)
- Future: Automated finding importers (when API integration added)

### Requires (invoke before starting)

| Skill | When | Purpose |
|-------|------|---------|
| `scoring-cvss-findings` | Step 2 | CVSS 4.0 scoring with interactive guidance |

### Calls (during execution)

None - terminal skill (orchestrates user data collection and formatting only)

### Pairs With (conditional)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `reviewing-okta-configurations` | Okta findings | Use that skill's finding template, then format with this skill |
| `threat-modeling` | Threat-based findings | Convert threats to findings with this format |

---

## Troubleshooting

### Issue: Finding Doesn't Appear in Report

**Symptom**: Finding created but not visible in rendered PDF

**Causes**:
1. Missing `phase_` tag
2. Wrong phase tag for report template
3. Finding marked as "Hidden" in PlexTrac

**Solution**: Verify `phase_` tag matches a phase in Report Details → Tags

### Issue: CVSS Score Doesn't Match Severity

**Symptom**: CVSS calculated as 8.5 (High) but finding shows Medium

**Cause**: Severity dropdown manually changed after CVSS calculation

**Solution**: Re-calculate CVSS or manually adjust severity to match score

### Issue: Custom Fields Missing

**Symptom**: "Verification and Attack Information" not showing in PDF

**Causes**:
1. Report Details → Findings Layout not set to "VKB"
2. Custom field not added via "Add custom fields from layout"

**Solution**: Set layout to VKB, use layout button to add fields

### Issue: Images Have No Outline

**Symptom**: Light-colored screenshots hard to see on white background

**Cause**: PlexTrac doesn't add image borders automatically

**Solution**: Use image editing tool (Skitch) to add black outline before upload

---

## Related Skills

- `scoring-cvss-findings` - CVSS 4.0 interactive scoring (invoked in Step 2)
- `reviewing-okta-configurations` - Okta security findings (uses similar template)
- `threat-modeling` - Threat identification (findings are outputs)
- `orchestrating-research` - Research for finding details and remediation

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
