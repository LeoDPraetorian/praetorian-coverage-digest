---
name: generating-security-test-instructions
description: Use when generating step-by-step security test case instructions from a test case list - systematically asks scoping questions (tools, timeframe, format), generates practitioner-focused markdown files with finding templates and time estimates
allowed-tools: Read, Write, Bash, AskUserQuestion, TodoWrite, Grep
---

# Generating Security Test Instructions

**Systematic workflow for creating practitioner-focused, step-by-step security test case documentation from test case lists.**

---

## What This Skill Does

Converts security test cases (from threat models, assessment plans, or attack paths) into actionable testing instructions with:

- **Systematic scoping** - Asks about tools, timeframe, format preferences
- **Structured output** - Markdown files per test case with consistent format
- **Time estimates** - Manual and automated testing timelines
- **Finding templates** - Pre-formatted with severity ratings and remediation guidance
- **Tool-specific commands** - Burp Suite, curl, Postman, Python scripts
- **Master README** - Overview, prerequisites, workflow guidance

**Target audience:** Security practitioners (penetration testers, security engineers) performing time-boxed assessments.

---

## When to Use

- User provides a list of test cases (e.g., from threat model output)
- User says "create testing instructions for these test cases"
- User wants to convert attack paths into executable test plans
- User needs consistent test documentation format

**NOT for:**
- Threat modeling itself (use `threat-modeling-orchestrator`)
- Writing security findings after testing (use `formatting-plextrac-findings`)
- General documentation (use standard Write tool)

---

## Prerequisites

- Test case list (IDs, descriptions, objectives)
- Understanding of assessment scope (web app, API, cloud service, etc.)
- Output destination determined (`.claude/.output/{project-name}/`)

---

## Workflow Overview

**6 Phases:** Input Collection → Scoping Questions → Template Selection → Content Generation → Output Organization → Verification

**Total time:** 10-20 minutes depending on test case count

---

## Phase 0: Setup

Navigate to repository root and create output directory:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
mkdir -p .claude/.output/{project-name}-testing/
```

**Use TodoWrite** to track phases before starting.

---

## Phase 1: Input Collection

### 1.1 Capture Test Case List

Ask user: "Please provide the test case list with IDs and descriptions."

**Expected format examples:**

```
TC-1: Test API authentication token expiration
TC-2: Test CORS policy configuration
TC-3: Test rate limiting enforcement
```

OR

```
| TC-1.1: Enumerate OAuth grant types |
| TC-1.2: Test implicit flow exploitation |
| TC-1.3: Test authorization code interception |
```

**Minimum required:** Test case ID + brief objective

Store in variable for Phase 4 reference.

### 1.2 Count Test Cases

```bash
# Parse and count test cases
echo "$TEST_CASE_LIST" | grep -c "TC-"
```

**Use count to:**
- Estimate total time (time-per-case × count)
- Determine if batch processing needed (>10 cases)
- Set user expectations

### 1.3 Determine Attack Path Grouping (Optional)

If test cases share a common attack objective or are part of an attack path, organize them into ATK-X structure.

**Grouping indicators:**
- User mentions "ATK-X" or existing attack path examples
- Test cases build on each other or target same vulnerability class

**Structure:** `ATK-X/Execution Steps/` + `ATK-X/Execution Results/`

**For complete guidance:** See [references/attack-path-grouping.md](references/attack-path-grouping.md)

---

## Phase 2: Scoping Questions

### 2.0 Context Check (Before Scoping Questions)

Before asking scoping questions, check if context already provides answers:

**Check for existing patterns:**
1. **Existing examples/templates:** Does user provide reference files (e.g., "follow ATK-1 format")?
   - If YES → Read reference files, extract format patterns, match that structure
2. **Established assessment context:** Is this part of ongoing assessment with existing test cases?
   - If YES → Check existing files for tools, timeframe, format patterns
3. **Explicit parameters:** Are tools/timeframe/format already stated in request?
   - If YES → Confirm rather than ask open-ended questions

**Adapt scoping approach:**
- **All answers evident from context** → Skip Phase 2, proceed to Phase 3 with inferred parameters
- **Some answers evident** → Ask only questions without context
- **No context available** → Ask all questions below

**Anti-pattern:** User says "follow ATK-1 structure" → Asking "What tools should we use?" when ATK-1 README clearly documents Burp Suite + curl + Python

---

### 2.1 Tools Available

**Ask this question if:** No existing examples showing tool usage, user hasn't specified tools

```
Question: What security testing tools are available for this assessment?

Options:
1. Burp Suite Professional (Recommended)
   - Full interception, scanning, Repeater, Intruder

2. Burp Suite Community + curl
   - Basic interception, manual curl commands

3. curl + Postman only
   - Command-line and API client testing

4. Browser DevTools + curl
   - Browser-based testing with network inspection
```

**Impact:** Determines command examples in test case files.

### 2.2 Timeframe for Testing

```
Question: What is the timeframe for completing these test cases?

Options:
1. 1-2 days (Focused)
   - Concise instructions, prioritize critical paths

2. 3-5 days (Standard)
   - Detailed instructions, multiple approaches

3. 1+ week (Comprehensive)
   - Extensive instructions, automation scripts, edge cases
```

**Impact:** Determines detail level and inclusion of automation scripts.

### 2.3 Assessment Type

```
Question: What type of security assessment is this?

Options:
1. Penetration Test (Exploitation-focused)
   - Includes exploitation steps, attack scenarios

2. Security Audit (Configuration-focused)
   - Focuses on policy validation, misconfiguration

3. Compliance Assessment (Control-focused)
   - Maps to OWASP/CWE/NIST, includes control evidence

4. Vulnerability Assessment (Discovery-focused)
   - Enumerates issues, no exploitation required
```

**Impact:** Determines finding template format and emphasis.

### 2.4 Output Format Preferences

```
Question: What finding/output format do you prefer?

Options:
1. PlexTrac-compatible findings (Recommended for pentests)
   - Impact section, remediation, CVSS scoring

2. Simple markdown findings
   - Title, description, recommendation

3. SARIF format (for tooling integration)
   - Machine-readable JSON output

4. Custom format (specify in next question)
```

**Impact:** Determines finding template structure in test case files.

### 2.5 Existing Templates or Examples

Ask via AskUserQuestion: "Do you have existing test case documentation or templates you'd like me to follow?"

Options: "Yes (I'll provide examples)" or "No (use standard format)"

**If "Yes":** Ask user to provide example file paths, read them, extract format patterns.

---

## Phase 3: Template Selection

Based on scoping answers, select appropriate template:

**See:** [references/template-selection.md](references/template-selection.md) for complete template library with:
- Template variants by timeframe and assessment type
- Standard template structure with all required sections
- Tool-specific command examples
- Finding template formats

---

## Phase 4: Content Generation

### 4.1 Generate Files Per Test Case

For each test case in the list:

1. **Create filename:** `TC-{ID}-{kebab-case-title}.md`
2. **Populate template** with:
   - Test case ID and objective
   - Prerequisites (from Phase 2 scoping)
   - Tool-specific commands (based on tool selection)
   - Time estimates (based on timeframe)
   - Finding template (based on assessment type)

**Anti-pattern:** Do NOT create generic placeholders like `[INSERT COMMANDS HERE]`. If you lack domain knowledge, use Phase 2 examples or mark clearly as `[USER TO CUSTOMIZE]`.

### 4.2 Generate Master README

**See:** [references/readme-structure.md](references/readme-structure.md) for complete README template with all required sections (overview, test case table, prerequisites, execution order, tools, time estimates, severity guidelines, references).

### 4.3 Include Automation (Conditional)

**If timeframe ≥ 3 days AND tools include Python:**

Embed Python automation scripts in test case files:

```markdown
## Automation Script

\`\`\`python
#!/usr/bin/env python3
"""Automated test for TC-X"""

def test_feature():
    # Automation logic
    assert condition, "clear error message"

if __name__ == "__main__":
    test_feature()
\`\`\`

**Usage:**
\`\`\`bash
python3 TC-X-automation.py
\`\`\`
```

**Automation criteria:** Only include if it saves >50% time vs manual execution.

---

## Phase 5: Output Organization

### 5.1 File Structure

**For attack path grouping (ATK-X):**

```
ATK-X/
├── Execution Steps/              # Test instructions (generated by this skill)
│   ├── README.md                 # Attack path overview
│   ├── TC-X.1-{title}.md
│   ├── TC-X.2-{title}.md
│   └── TC-X.N-{title}.md
└── Execution Results/            # Evidence storage (tester populates)
    └── .gitkeep                  # Empty placeholder for git
```

**For standalone test cases (no attack path):**

```
.claude/.output/{project-name}-testing/
├── README.md                     # Master overview
├── TC-{ID}-{title}.md            # Per test case
├── TC-{ID}-{title}.md
├── ...
└── findings-template.md          # Blank finding template
```

**Create results directory:**

```bash
# For attack paths
mkdir -p ATK-X/Execution\ Results && touch ATK-X/Execution\ Results/.gitkeep

# Testers will populate this with:
# - TC-X.Y-results.md (finding documentation)
# - evidence/ (screenshots, logs, outputs)
# - findings/ (formatted vulnerability reports)
```

### 5.2 Verify Files Created

```bash
ls -lh .claude/.output/{project-name}-testing/
wc -l .claude/.output/{project-name}-testing/*.md
```

**Quality gates:**
- Each test case file >50 lines (not placeholder-heavy)
- README includes all test cases in table
- Filenames match TC IDs exactly

---

## Phase 6: Verification and Handoff

### 6.1 Generate Summary

Create message for user:

```
Created testing instructions for [N] test cases in:
.claude/.output/{project-name}-testing/

**Files:**
- README.md - Master overview and prerequisites
- TC-1-{title}.md - [Brief description]
- TC-2-{title}.md - [Brief description]
- ...

**Total estimated time:**
- Manual: [X hours]
- Automated: [Y hours] (if applicable)

**Quick start:**
```bash
cd .claude/.output/{project-name}-testing/
open README.md
```

**Next steps:**
1. Review README for prerequisites
2. Customize tool-specific commands if needed
3. Execute test cases in recommended order
4. Document findings using provided templates
```

### 6.2 Offer Customization

Ask user: "Would you like me to customize any test case files based on specific requirements or constraints?"

**Common customizations:**
- Add specific endpoint URLs
- Adjust time estimates
- Add client-specific context
- Modify finding severity thresholds

---

## Common Patterns

### Pattern 1: OAuth/OIDC Testing

Test case categories common in OAuth assessments:
- Grant type enumeration
- Token lifetime validation
- PKCE enforcement
- Redirect URI validation
- Scope validation

**See:** [references/oauth-testing-patterns.md](references/oauth-testing-patterns.md)

### Pattern 2: API Security Testing

Common API test categories:
- Authentication/authorization
- Input validation
- Rate limiting
- Error handling
- Data exposure

**See:** [references/api-testing-patterns.md](references/api-testing-patterns.md)

### Pattern 3: Web Application Testing

Common web app test categories:
- XSS (reflected, stored, DOM-based)
- CSRF
- Authentication bypass
- Session management
- Access control

**See:** [references/web-testing-patterns.md](references/web-testing-patterns.md)

---

## Anti-Patterns

**See:** [references/anti-patterns.md](references/anti-patterns.md) for complete anti-pattern catalog with fixes:
- Skipping scoping questions
- Generic placeholder content
- Assuming assessment duration
- Missing time estimates
- Tool availability assumptions

---

## Integration

### Called By

- Security engineers (manual invocation via Skill or Read tool)
- Threat modeling workflows (after threat identification)
- Assessment planning workflows

### Requires (invoke before starting)

| Skill | When | Purpose |
|-------|------|---------|
| None - standalone skill | N/A | Self-contained workflow |

### Calls (during execution)

| Tool | Phase | Purpose |
|------|-------|---------|
| `AskUserQuestion` | Phase 2 | Scoping questions |
| `TodoWrite` | Phase 0 | Track workflow phases |
| `Bash` | Phase 5 | Create directories and verify output |
| `Write` | Phase 4-5 | Generate test case files and README |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `threat-modeling-orchestrator` | After threat identification | Converts threats to test cases |
| `formatting-plextrac-findings` | After testing complete | Format discovered vulnerabilities |
| `scoring-cvss-findings` | Finding documentation | Calculate severity ratings |

---

## Related Skills

- `formatting-plextrac-findings` - Format findings after testing
- `scoring-cvss-findings` - Calculate CVSS scores for findings
- `threat-modeling-orchestrator` - Upstream threat identification

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
