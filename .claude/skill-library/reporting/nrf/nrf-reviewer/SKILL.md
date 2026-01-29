---
name: nrf-reviewer
description: Use when reviewing findings or preliminary observations for Norton Rose Fulbright (NRF) engagements - applies prophylactic legal style, defensive writing, and NRF-specific formatting requirements to markdown documents
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# NRF Document Reviewer

**Transforms security findings and preliminary observations to comply with Norton Rose Fulbright legal writing guidelines.**

## When to Use

Use this skill when:

- Reviewing a finding or preliminary observation markdown file for NRF engagement
- Converting draft security documentation to NRF-compliant format
- User says "review this for NRF" or "apply NRF guidelines"
- Preparing deliverables for Norton Rose Fulbright client engagements

**You MUST use TodoWrite** to track all review phases.

## Quick Reference

| Phase             | Purpose                                      | Key Actions                                         |
| ----------------- | -------------------------------------------- | --------------------------------------------------- |
| 1. Read Document  | Load and analyze original content            | Read file, identify document type (finding/prelim)  |
| 2. Apply Language | Transform prohibited → preferred terminology | Remove "recommend", add hedging, fix impact phrases |
| 3. Apply Style    | Enforce legal writing principles             | Remove qualifiers, focus technical not business     |
| 4. Apply Format   | Ensure structural compliance                 | Headers, confidentiality notices, client references |
| 5. Verify         | Validate against checklist                   | Run through compliance checklist                    |
| 6. Output         | Write transformed document                   | Generate compliant markdown file                    |

---

## Phase 0: Document Type Detection

**Determine document type from context:**

- **Branch-based detection**: Check current git branch name
  - Contains "preliminary-observations", "prelim-obs", or similar → Preliminary Observation
  - Main branch or other → Finding
- **Content-based detection**: Read file and check for indicators
  - Has "Preliminary Observation" headers → Preliminary Observation
  - Has "Vulnerability Description" → Finding (in main branch)
  - Has "#### Vulnerability Description" header → Finding (needs conversion if in prelim branch)

**Terminology mapping:**

| Branch Type       | Primary Term              | Section Header            |
| ----------------- | ------------------------- | ------------------------- |
| Main              | "finding"                 | Vulnerability Description |
| Preliminary       | "preliminary observation" | Preliminary Observation   |

---

## Phase 1: Language Transformation

### 1.1 Prohibited → Preferred Language

Apply these transformations systematically:

**Critical substitutions (NEVER skip these):**

| ❌ NEVER Use      | ✅ USE Instead                      |
| ----------------- | ----------------------------------- |
| "recommend"       | "suggest {{client_short}} consider" |
| "Recommendation(s)" | "Areas for Improvement"           |
| "Impact"          | "Potential Impact"                  |
| "should"          | "may wish to consider"              |
| "must"            | "suggest...consider"                |
| "ensure"          | "may reduce the likelihood"         |
| "severe"          | "notable"                           |

**See:** [references/language-rules.md](references/language-rules.md) for quick reference summary.

### 1.2 Remove Impact Enhancers

Delete or replace these qualifiers:

- ❌ "critical" (except as synonym for "important")
- ❌ "extensive", "substantial", "significant", "significantly"
- ❌ "complete" (except as synonym for "finish")
- ❌ "systemic", "systematic", "fundamental"
- ❌ "devastating", "severe"
- ❌ "widespread" (use "multiple" or specific count)

### 1.3 Attack Terminology (Context-Dependent)

Attack terminology (attacker, malicious actor, adversary, exploit) is generally acceptable but NRF reviewers may vary. Preserve attack terms when describing threat scenarios - don't over-neutralize by removing "attacker" or "malicious".

**See:** [references/language-rules.md § Attack Terminology](references/language-rules.md#attack-terminology-context-dependent) for complete guidance on when to use vs avoid attack terminology.

### 1.4 Minimal Change Principle

**Only modify what NRF guidelines specifically require. Do NOT over-edit.**

- ✅ Change "recommend" → "suggest {{client_short}} consider"
- ✅ Remove impact enhancers (critical, significant, widespread)
- ✅ Remove business impact language (revenue, reputation)
- ❌ Do NOT rewrite sentences that are already compliant
- ❌ Do NOT change technical terminology unnecessarily
- ❌ Do NOT add hedging to already-hedged statements
- ❌ Do NOT restructure paragraphs unless required

**Goal:** The minimum number of edits needed for NRF compliance. If a sentence doesn't violate NRF guidelines, leave it unchanged.

### 1.5 Add Hedging Language

Insert hedging where claims are not definitively proven:

- "may allow" instead of "allows"
- "could potentially" instead of "will"
- "appears to" instead of definitive assertions
- "indicated" instead of "provided strong indication"

**When NOT to hedge:**
- Vulnerabilities definitively verified by testing team
- Specific technical configurations observed
- Factual testing results

### 1.6 Finding vs Vulnerability Terminology

**Use "finding" instead of "vulnerability" throughout the document body.**

| Context                                  | ✅ Correct Term       | ❌ Avoid               |
| ---------------------------------------- | --------------------- | ---------------------- |
| General references in text               | "this finding"        | "this vulnerability"   |
| Cross-references to other issues         | "related findings"    | "related vulnerabilities" |
| Impact descriptions                      | "this finding allows" | "this vulnerability allows" |
| **EXCEPTION: Section header**            | "#### Vulnerability Description" | (keep unchanged) |
| **EXCEPTION: Preliminary observations**  | "preliminary observation" | "vulnerability" or "finding" |

**Why**: NRF wiki explicitly requires "finding" terminology except for the "Vulnerability Description" section header which remains unchanged.

**Examples:**

- ✅ "Praetorian discovered this finding while testing the authentication workflow"
- ❌ "Praetorian discovered this vulnerability while testing the authentication workflow"
- ✅ "This finding is related to the session management finding described earlier"
- ❌ "This vulnerability is related to the session management vulnerability described earlier"
- ✅ "#### Vulnerability Description" (section header - correct as-is)

**Preliminary observations:** Use "preliminary observation" throughout, never "finding" or "vulnerability" in prelim documents.

---

## Phase 2: Style Enforcement

### 2.1 Prophylactic Legal Style

- **Objective/Neutral Tone**: Remove subjective qualifiers
- **Factual vs. Conclusory**: State observable facts, not characterizations
- **Plain Language**: Replace commas with "and" for clarity
- **Understatement**: Favor understatement over overstatement
- **Technical Precision**: Specific technical terms over general descriptors

### 2.2 Technical vs. Business Impact

**Always describe technical impacts, NEVER business impacts:**

✅ **Technical (correct):**
- "This vulnerability may result in service unavailability"
- "An attacker could potentially access sensitive user data"
- "This allows unauthorized access to administrative functions"

❌ **Business (prohibited):**
- "This could lead to loss of revenue"
- "This may result in regulatory fines"
- "This could damage brand reputation"
- "This impacts business operations"

### 2.3 Brevity and Directness

- Be concise, succinct, direct, non-verbose
- Less words is better
- Prioritize clarity over elaborate language
- Remove unnecessary adjectives and adverbs

---

## Phase 3: Structural Compliance

### 3.1 Required Headers and LaTeX Formatting

Every document must include confidentiality notices. Preliminary observations require full LaTeX template with vertical margin text and footer. Findings use markdown headers or LaTeX based on delivery context.

**See:** [references/latex-formatting.md](references/latex-formatting.md) for complete LaTeX templates, placement instructions, and verification steps.

### 3.2 Section Headers

Transform section headers to NRF format:

- "#### Impact" → "#### Potential Impact"
- "#### Recommendation" or "#### Recommendations" → "#### Areas for Improvement"
- "#### Vulnerability Description" → Keep in main branch
- "#### Vulnerability Description" → "#### Preliminary Observation" (in prelim branch)

### 3.3 Present Participle in Areas for Improvement

Always use verb + -ing form in improvement suggestions:

- ✅ "Praetorian suggests {{client_short}} consider implementing..."
- ❌ "Praetorian suggests {{client_short}} consider implement..."

### 3.4 Client Reference Format

Replace all client mentions:

- ❌ "Praetorian performed this service for [Client]"
- ✅ "Praetorian performed this service for Counsel on behalf of [Client]"

---

## Phase 4: Content-Specific Transformations

### 4.1 Preliminary Observations

When document type is "preliminary observation":

1. Add "Potential Impact" section (if missing)
2. Focus exclusively on technical impacts
3. Use "preliminary observation" throughout (not "finding" or "vulnerability")
4. **Remove risk ratings section** - Preliminary observations do not include CVSS scores or risk rating metadata
5. **Optional no-ToC format** - Per May 2025 NRF request, some engagements require preliminary observations without table of contents

**No-ToC format example** (when requested):

```markdown
\AddToShipoutPictureBG{...}  # Confidentiality LaTeX
\lofoot*{...}

\inject{$report_path$/phases/web/findings/finding1.md}
\pagebreak
\inject{$report_path$/phases/web/findings/finding2.md}
\pagebreak
```

**Standard format with ToC** (default):

```markdown
\AddToShipoutPictureBG{...}  # Confidentiality LaTeX
\lofoot*{...}
\MakeTOCPage

## Summary of Preliminary Observations
\inject{$report_path$/phases/web/findings/finding1.md}
...
```

### 4.2 Executive Summaries

If document has executive summary section:

```markdown
Norton Rose Fulbright US LLP (Counsel or NRF) engaged Praetorian on behalf of {CUSTOMER}
to assist Counsel in providing legal advice to {CUSTOMER} and in anticipation of any
litigation or regulatory investigation that may arise from Praetorian's observations.
```

### 4.3 Risk Rating Appendix

- Remove third column: "Recommended Time Frame for Action Plan Development"
- Change title from "Severity Ratings" to "Ratings"

### 4.4 Retest Engagements

When reviewing findings that have been retested, add status-specific boilerplate to three sections based on remediation status.

#### Retest Status Detection

Determine finding status from retest context:
- **Fixed**: Client fully remediated, Praetorian verified resolution
- **Partially Fixed**: Client addressed some aspects, residual risk remains
- **Not Fixed**: Issue persists unchanged after retest

#### Section 1: Potential Impact (Conclusory Paragraph)

Add ONE of these paragraphs at the END of the Potential Impact section:

**Fixed:**
```
Note: A retest was subsequently conducted following the identification of the issue. The reported finding has since been resolved, and as a result, the previously noted impact is no longer applicable.
```

**Partially Fixed:**
```
Note: A retest was conducted following the identification of the issue. The reported finding has been partially resolved, resulting in a reduction of the previously noted impact.
```

**Not Fixed:**
```
Note: During the retesting phase, Praetorian confirmed that the issue persists, and as such, the initial impact remains unchanged.
```

#### Section 2: Verification and Attack Information (Introductory Paragraph)

Add ONE of these paragraphs at the BEGINNING of the Verification section:

**Fixed:**
```
The following Verification and Attack Information details the initial testing process followed by Praetorian to identify and verify this finding. As noted previously, during the subsequent retesting phase, this finding has been remediated by {{client_short}} and verified as fixed by Praetorian.
```

**Partially Fixed:**
```
The following Verification and Attack Information details the initial testing process followed by Praetorian to identify and verify this finding. As noted previously, during the subsequent retesting phase, though the finding has been partially remediated by {{client_short}}, this finding still presents some risk to the application.
```

**Not Fixed:**
```
The following Verification and Attack Information details the initial testing process followed by Praetorian to identify and verify this finding. During the subsequent retesting phase, Praetorian confirmed this finding has not yet been fully mitigated.
```

#### Section 3: Areas for Improvement (Introductory Paragraph)

Add ONE of these paragraphs at the BEGINNING of the Areas for Improvement section:

**Fixed:**
```
The following was developed based on observations from our initial security assessment. While subsequent testing has confirmed that this finding has been successfully remediated, we encourage maintaining these best practices for future development efforts to prevent similar issues from recurring.
```

**Partially Fixed:**
```
The following was developed based on observations from our initial security assessment. While subsequent testing has confirmed that this finding has been partially remediated, we encourage maintaining these best practices for future development efforts to prevent similar issues from recurring.
```

**Not Fixed:**
```
The following was formulated during our initial security assessment and remain relevant, as this finding has not yet been fully mitigated. Implementing these suggested improvements will help address the identified security gaps and strengthen the overall security posture of the application.
```

#### Retest Comments in Italics

For partially fixed or not fixed findings, add italicized retest-specific observations at the BEGINNING of each finding document (after LaTeX/frontmatter, before "#### Vulnerability Description"):

```markdown
*During retest on [DATE], Praetorian observed [specific changes made by client]. However, [residual risk or unchanged behavior].*
```

---

## Phase 5: Verification Checklist

Run through complete checklist before finalizing:

**See:** [references/verification-checklist.md](references/verification-checklist.md) for compliance validation commands and categories.

**Quick validation:**

```bash
# Check for prohibited terms
grep -E "(recommend|should|must|ensure|critical|extensive|substantial|significant|systemic|systematic|fundamental|devastating|severe|widespread)" output.md

# Should return zero matches (except "critical" used as "important")
```

---

## Phase 6: Output Generation

### 6.1 File Naming Convention

Preserve original filename or use pattern:

- Original: `finding-name.md` → `finding-name-nrf.md`
- Preserve YAML frontmatter exactly (finding_data, risk_data, taxonomies, cvss)
- Preserve LaTeX figure commands exactly

### 6.2 Write Transformed Document

Use Write tool to create NRF-compliant version:

```
Write(
  file_path: "{original-dir}/{original-name}-nrf.md",
  content: {transformed content}
)
```

### 6.3 Present Changes Summary

Provide user with:
- Count of transformations applied
- List of major changes by category
- Path to output file

---

## Integration

### Called By

- User direct request: "Review this for NRF", "Apply NRF guidelines"
- Skill invocation: `Read(".claude/skill-library/reporting/nrf/nrf-reviewer/SKILL.md")`

### Requires (invoke before starting)

None - standalone skill with embedded guidelines

### Calls (during execution)

None - self-contained transformation skill

### Pairs With (conditional)

- **`praetorian-cloud-finding-format`** (LIBRARY) - When creating Praetorian Cloud findings before NRF review
  - `Read(".claude/skill-library/reporting/praetorian-cloud-finding-format/SKILL.md")`
- **`formatting-plextrac-findings`** (LIBRARY) - When also formatting for PlexTrac after NRF review
  - `Read(".claude/skill-library/reporting/formatting-plextrac-findings/SKILL.md")`

---

## Anti-Patterns

Common mistakes when transforming NRF documents: incomplete transformations, over-hedging verified findings, removing technical detail, over-neutralizing attack terminology, and over-modification of compliant content.

**See:** [references/anti-patterns.md](references/anti-patterns.md) for detailed examples, explanations, and fixes for each anti-pattern.

---

## Examples

**See:** [references/transformation-examples.md](references/transformation-examples.md) for:
- Complete before/after finding example: [references/examples/authz-initial.md](references/examples/authz-initial.md) → [references/examples/authz-reviewed.md](references/examples/authz-reviewed.md)
- Complete before/after preliminary observation example: [references/examples/phishing-initial.md](references/examples/phishing-initial.md) → [references/examples/phishing-reviewed.md](references/examples/phishing-reviewed.md)
- Line-by-line transformation annotations

---

## Quick Start Checklist

Before starting any NRF review:

- [ ] TodoWrite with 6 phases
- [ ] Detect document type (finding vs preliminary observation)
- [ ] Read original document completely
- [ ] Apply language transformations (prohibited → preferred)
- [ ] Apply style enforcement (technical impacts only)
- [ ] Apply structural compliance (headers, format)
- [ ] Run verification checklist
- [ ] Write output file
- [ ] Present changes summary to user

**If any checklist item fails, document the blocker and ask user for guidance.**

---

## Related Skills

| Skill                                       | Purpose                                       | Access Method                                                                                      |
| ------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **`praetorian-cloud-finding-format`**       | Format findings with CVSS, 6-section structure | `Read(".claude/skill-library/reporting/praetorian-cloud-finding-format/SKILL.md")` (LIBRARY)       |
| **`formatting-plextrac-findings`**          | Convert findings to PlexTrac format           | `Read(".claude/skill-library/reporting/formatting-plextrac-findings/SKILL.md")` (LIBRARY)          |
| **`generating-security-test-instructions`** | Generate security test plans from findings    | `Read(".claude/skill-library/reporting/generating-security-test-instructions/SKILL.md")` (LIBRARY) |
