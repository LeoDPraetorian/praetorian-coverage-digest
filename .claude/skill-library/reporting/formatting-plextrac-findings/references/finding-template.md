# PlexTrac Finding Template

**Copy/paste template for manual finding creation in PlexTrac.**

---

## Standard Finding Template

```markdown
## {Finding Name}

**Severity:** {Critical/High/Medium/Low/Informational}
**CVSS:** {Base Score} ({Severity})
**CVSS Vector:** {Full CVSS 4.0 vector string}
**Tags:** {phase_tag}, {optional tags}

### Description

{Detailed explanation of the vulnerability}

{Paragraph 1: What is the vulnerability and where does it occur?}

{Paragraph 2: Why does this vulnerability exist? (Root cause, misconfiguration, design flaw)}

{Paragraph 3: What are the security implications? (Impact, risk, potential for exploitation)}

### Verification and Attack Information

{Step-by-step instructions to reproduce or exploit the vulnerability}

1. {Step 1 - Initial setup or prerequisites}
2. {Step 2 - Exploitation action}
3. {Step 3 - Observed behavior}
4. {Step 4 - Confirmation of success}

**Expected Result:**
{What should happen during exploitation}

**Observed Result:**
{What actually happened, proving the vulnerability}

### Systems Impacted

{Specific systems, endpoints, or assets affected by this vulnerability}

**System/Endpoint:** {URL, IP address, hostname, or asset identifier}
**Component:** {Specific component, module, or function affected}
**Scope:** {How widespread is the vulnerability? Single endpoint, entire platform, specific user role?}

### Evidence

{Screenshots, logs, request/response captures proving the vulnerability}

![Description of what this image shows](path/to/screenshot.png)
_Caption: {Explanation of the screenshot}_

**HTTP Request:**
\`\`\`http
POST /api/search HTTP/1.1
Host: example.com
Content-Type: application/json

{
"query": "' OR '1'='1"
}
\`\`\`

**HTTP Response:**
\`\`\`http
HTTP/1.1 200 OK
Content-Type: application/json

{
"users": [
{"id": 1, "username": "admin"},
{"id": 2, "username": "testuser"}
]
}
\`\`\`

**Additional Evidence:**
{Command output, log excerpts, or other supporting data}

### Remediation

{Specific, actionable steps to fix the vulnerability}

**Immediate Actions** (stop the bleeding):

1. {Quick fix or workaround}
2. {Disable vulnerable feature if necessary}

**Long-Term Solutions** (address root cause):

1. {Implement proper input validation}
2. {Apply security patch or configuration change}
3. {Refactor code or redesign architecture}

**Validation Steps** (confirm fix works):

1. {Re-test the vulnerability}
2. {Verify no regression}
3. {Check related functionality}

**Effort:** {Low (<1 day) / Medium (1-5 days) / High (>5 days)}
**Priority:** {P1 (0-30 days) / P2 (30-90 days) / P3 (90+ days)}

### References

- {Link to relevant documentation, framework, or standard}
- {Link to CVE, security advisory, or vendor bulletin}
- {Link to OWASP, CWE, or other security resource}
```

---

## Field-by-Field Guidance

### Name

**Purpose**: Short, actionable title for the finding

**Format**:

- Sentence case (not title case)
- 50-80 characters ideal
- Specific enough to identify the issue

**Good examples**:

- "SQL injection in user search endpoint"
- "Weak password policy allows credential attacks"
- "Unencrypted transmission of authentication tokens"

**Bad examples**:

- "SQL Injection Vulnerability" (too generic, title case)
- "Security Issue" (not specific)
- "The application suffers from SQL injection in the search functionality which allows attackers to..." (too long, description belongs in Description field)

### Severity

**Auto-calculated from CVSS base score**:

- Critical: 9.0-10.0
- High: 7.0-8.9
- Medium: 4.0-6.9
- Low: 0.1-3.9
- Informational: 0.0

**PlexTrac auto-adopts severity from CVSS score**. If severity seems wrong:

1. Re-evaluate CVSS vectors (did you score correctly?)
2. Adjust CVSS vectors if warranted
3. Don't manually override severity unless you have a strong reason

### CVSS & Vector

**Use CVSS 4.0** (PlexTrac default)

**Calculator**: https://www.first.org/cvss/calculator/4.0

**Must include**:

- Base score (numeric)
- Full vector string (e.g., `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`)

**Invoke `scoring-cvss-findings` skill** for interactive CVSS scoring guidance.

**Environmental Metrics**: If business value of the vulnerable system is low, use Environmental Metrics to reflect the specific impact to the system under test.

### Tags

**Required**: At least one `phase_` tag

**Format**: Comma-separated

**Example**: `phase_web, owasp_3`

**See**: [tagging-system.md](tagging-system.md) for complete tag catalog

### Description

**Purpose**: Explain what, why, and impact

**Structure**:

1. **What**: The vulnerability and where it occurs
2. **Why**: Root cause or why it exists
3. **Impact**: Security implications

**Length**: 2-4 paragraphs typical

**Avoid**:

- Don't repeat the title
- Don't include remediation (that's a separate field)
- Don't paste evidence here (use Evidence field)

### Verification and Attack Information

**Purpose**: Prove the vulnerability is exploitable with step-by-step reproduction

**Format**: Numbered list

**Include**:

- Prerequisites (authenticated user, specific tool, etc.)
- Exact steps to reproduce
- Expected vs observed behavior

**Write for**: Someone unfamiliar with the vulnerability should be able to reproduce it following your steps

### Systems Impacted

**Purpose**: Identify specific assets affected

**Include**:

- URLs, IPs, hostnames
- Specific components or modules
- Scope (single endpoint, entire platform, etc.)

**Format**:

```
**System/Endpoint:** https://app.example.com/search
**Component:** User search API
**Scope:** All authenticated users
```

### Evidence

**Purpose**: Prove the vulnerability with concrete data

**Include**:

- Screenshots (with outlines for light images)
- HTTP request/response pairs
- Command output
- Log excerpts
- Code snippets (if source code review)

**Image best practices**:

- Add black outlines to light-colored images (PlexTrac has white background)
- Annotate key areas with arrows/boxes
- Caption each image clearly
- Use tools like Skitch for annotation

### Remediation

**Purpose**: Tell the client exactly how to fix the issue

**Structure**:

1. Immediate actions (quick wins)
2. Long-term solutions (root cause fixes)
3. Validation steps (how to verify the fix)

**Include**:

- Code examples (if applicable)
- Configuration changes (specific settings)
- References to documentation

**Don't**:

- Be vague ("Improve input validation")
- Just say "patch the software"
- Forget to include validation steps

**Effort**: Estimate time to implement

- Low: <1 day
- Medium: 1-5 days
- High: >5 days

**Priority**: Based on risk + business context

- P1: Fix in 0-30 days
- P2: Fix in 30-90 days
- P3: Fix in 90+ days

### References

**Purpose**: Link to external resources

**Include**:

- OWASP articles
- CVE entries
- Vendor security advisories
- CWE definitions
- Framework documentation

**Format**: Bulleted list of hyperlinks

---

## ASVS Field (Mobile/Web Only)

For Mobile and Web findings, PlexTrac includes ASVS category selection.

**Not a text field** - it's a dropdown in PlexTrac UI.

**Add via**: Report Details → Findings Layout = VKB, then "Add custom fields from layout" → select ASVS

**Categories**:

- V1: Architecture, Design and Threat Modeling
- V2: Authentication Verification
- V3: Session Management Verification
- V4: Access Control Verification
- V5: Validation, Sanitization and Encoding
- V6: Stored Cryptography Verification
- V7: Error Handling and Logging
- V8: Data Protection
- V9: Communication
- V10: Malicious Code
- V11: Business Logic
- V12: Files and Resources
- V13: API and Web Service
- V14: Configuration

**Not required for**: Cloud, Desktop, IoT, Internal/External assessments (delete if present)

---

## Template Variations

### Short Template (Low/Informational Findings)

For low-severity or informational findings, you can condense:

```markdown
## {Finding Name}

**Severity:** {Low/Informational}
**CVSS:** {Base Score} ({Severity})
**Tags:** {phase_tag}

### Description

{Brief explanation}

### Evidence

{Screenshot or log excerpt}

### Remediation

{Concise fix steps}

**Effort:** Low
**Priority:** P3
```

### Effective Control Template

For positive findings (things working well):

```markdown
## {Control Name}

**Severity:** Informational
**Tags:** {phase_tag}, effective_control

### Description

{What security control is in place and why it's effective}

### Implementation Details

{How the control is implemented}

### Verification

{How you confirmed it's working}

### Recommendations

{Optional: Suggestions for minor improvements}
```

---

## Copy/Paste Workflow

1. **Copy this template**
2. **Fill in placeholders** (replace all {curly brace} items)
3. **Remove unused sections** (e.g., ASVS for cloud findings)
4. **Add evidence** (screenshots, logs)
5. **Navigate to PlexTrac** → Findings tab
6. **Click "Add Findings"** → "Create Finding"
7. **Set Name and Severity**
8. **Paste content** into appropriate fields
9. **Add tags** in Tags field
10. **Save finding**

---

## Related Documentation

- [field-specifications.md](field-specifications.md) - Detailed field requirements
- [tagging-system.md](tagging-system.md) - Complete tag catalog
- [vkb-layout.md](vkb-layout.md) - VKB custom field details
- [cvss-guidance.md](cvss-guidance.md) - CVSS 4.0 scoring for PlexTrac
