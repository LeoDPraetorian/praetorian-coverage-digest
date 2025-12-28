# Manual Check Procedures

Detailed procedures for the 5 instruction-based manual checks that Claude performs after running TypeScript audit tools.

---

## Phase 9: Skill Loading Protocol

**Purpose**: Verify agent has Tiered Skill Loading Protocol.

**Verification Steps**:

1. Verify Skill Loading Protocol section exists:
   ```bash
   grep '## Skill Loading Protocol' .claude/agents/{type}/{name}.md
   ```

2. Verify 3 tiers present:
   ```bash
   grep -E '### Tier [123]' .claude/agents/{type}/{name}.md
   ```

3. Verify Anti-Bypass section:
   ```bash
   grep '## Anti-Bypass' .claude/agents/{type}/{name}.md
   ```

4. Verify output includes skills_read:
   ```bash
   grep 'skills_read' .claude/agents/{type}/{name}.md
   ```

5. Verify Tier 2 TodoWrite requirement (MANDATORY for ALL agents):
   ```bash
   # Check Tier 2 section mentions TodoWrite/using-todowrite
   grep -A 5 '### Tier 2' .claude/agents/{type}/{name}.md | grep -iE 'todowrite|using-todowrite'

   # Check language says "≥2 steps" not "≥3 steps"
   grep -A 5 '### Tier 2' .claude/agents/{type}/{name}.md | grep '≥2 steps'
   ```

**Results**:
- ✅ PASS: Tiered Skill Loading Protocol present and complete, Tier 2 has TodoWrite with ≥2 steps
- ⚠️ WARNING: Missing protocol (agent has skills: but no loading protocol)
- ❌ ERROR: Tier 2 missing TodoWrite or uses wrong threshold (≥3 steps instead of ≥2 steps)
- N/A: Agent has no skills: field

---

## Phase 10: Library Skills in Frontmatter

**When**: After Phase 9 check

**Purpose**: Verify no library skills are directly referenced in agent frontmatter `skills:` field.

**Procedure:**

a. **Read agent frontmatter skills: field:**

```bash
grep '^skills:' .claude/agents/{category}/{agent-name}.md
```

b. **Extract all skill names from comma-separated list:**

- Example: `skills: debugging-systematically, gateway-frontend, using-modern-react-patterns`
- Extracted: `['debugging-systematically', 'gateway-frontend', 'using-modern-react-patterns']`

c. **Verify each skill is core or gateway (NOT library):**

```bash
# For each skill name:

# 1. If starts with 'gateway-' → Gateway skill (✅ PASS)
if [[ "$skill_name" =~ ^gateway- ]]; then
  echo "✅ $skill_name - Gateway skill"
  continue
fi

# 2. Check if exists in core (.claude/skills/)
if [ -d ".claude/skills/$skill_name" ]; then
  echo "✅ $skill_name - Core skill"
  continue
fi

# 3. Check if exists in library (.claude/skill-library/)
if find .claude/skill-library -name "$skill_name" -type d | grep -q .; then
  echo "❌ $skill_name - Library skill (ERROR)"
  # Suggest appropriate gateway based on path
  skill_path=$(find .claude/skill-library -name "$skill_name" -type d)
  echo "   Path: $skill_path"
  echo "   Suggested gateway: gateway-{domain}"
fi
```

d. **Determine appropriate gateway for library skills:**

- `development/frontend/*` → `gateway-frontend`
- `development/backend/*` → `gateway-backend`
- `testing/*` → `gateway-testing`
- `security/*` → `gateway-security`
- `claude/mcp-tools/*` → `gateway-mcp-tools`
- `development/integrations/*` → `gateway-integrations`

e. **Report Phase 10 result:**

- ✅ **PASS**: All frontmatter skills are core or gateway
- ❌ **CRITICAL**: Library skill found in frontmatter
- For each violation: List skill name, path, and suggested gateway

**Why critical?** Library skills in frontmatter defeat progressive loading architecture. Frontmatter skills are loaded at session start (expensive), gateway skills load patterns on-demand (efficient).

---

## Phase 11: Incorrect Skill Invocations

**When**: After Phase 10 check

**Purpose**: Detect `skill: "library-skill"` invocations in agent body that will fail at runtime.

**Procedure:**

a. **Search agent body for skill: invocations:**

```bash
grep -n 'skill: "' .claude/agents/{category}/{agent-name}.md
```

b. **Extract skill names from matches:**

- From `skill: "using-tanstack-query"` → extract `using-tanstack-query`
- Create list of all invoked skill names

c. **For each invoked skill, verify it's a core skill:**

```bash
# Check if skill exists in core
if [ -d ".claude/skills/$skill_name" ]; then
  echo "✅ $skill_name - Core skill (valid invocation)"
else
  # Check if it's a library skill
  if find .claude/skill-library -name "$skill_name" -type d | grep -q .; then
    skill_path=$(find .claude/skill-library -name "$skill_name" -type d)
    echo "❌ $skill_name - Library skill (invalid invocation)"
    echo "   Path: $skill_path"
    echo "   Fix: Use Read tool instead: Read('$skill_path/SKILL.md')"
  fi
fi
```

d. **Report Phase 11 result:**

- ✅ **PASS**: All skill: invocations reference core skills
- ⚠️ **WARNING**: Library skill invoked with skill: tool
- For each violation: List skill name, line number, and correct Read syntax

**Why important?** Library skills cannot be invoked via Skill tool - they will fail at runtime. Must use Read tool instead.

---

## Phase 12: Gateway Coverage

**When**: After Phase 11 check

**Purpose**: Verify domain agents have appropriate gateway skills in frontmatter.

**Procedure:**

a. **Infer agent domain from name and type:**

```bash
# Extract agent name and type
agent_name="${agent_path##*/}"  # Remove path
agent_name="${agent_name%.md}"  # Remove .md
grep '^type:' .claude/agents/{category}/{agent-name}.md
```

b. **Domain detection patterns:**

| Pattern | Recommended Gateway |
|---------|---------------------|
| Name contains `frontend`, `react`, `ui` | `gateway-frontend` |
| Name contains `backend`, `go`, `api` | `gateway-backend` |
| Name contains `test`, `e2e`, `playwright` | `gateway-testing` |
| Name contains `security`, `auth`, `crypto` | `gateway-security` |
| Type is `development` + frontend keywords | `gateway-frontend` |
| Type is `development` + backend keywords | `gateway-backend` |

c. **Check if agent has recommended gateway:**

```bash
# For each recommended gateway
grep "^skills:" .claude/agents/{category}/{agent-name}.md | grep -q "$gateway_name"
```

d. **Report Phase 12 result:**

- ✅ **PASS**: Agent has appropriate gateway(s)
- ℹ️ **INFO**: Agent missing recommended gateway
- List each missing gateway with reasoning

**Example output:**

```
Phase 12: Gateway Coverage
Agent: frontend-developer.md
Type: development
Domain: frontend (inferred from name)

ℹ️ INFO: Missing gateway-frontend
   Reason: Agent name contains 'frontend' and type is 'development'
   Recommendation: Add 'gateway-frontend' to skills: field

Result: INFO (1 recommended gateway missing)
```

**Why info not warning?** Gateway recommendations are suggestions based on naming patterns. Agent may be intentionally narrow or delegate through other mechanisms.

---

## Phase 8: Deprecated Skills Detection

**When**: After Phase 12 check

**Procedure:**

a. **Grep for skill references in agent body:**

```bash
grep -o 'skill: "[^"]*"' .claude/agents/{category}/{agent-name}.md
grep -o 'gateway-[a-z-]*' .claude/agents/{category}/{agent-name}.md
```

b. **Extract skill names from matches:**

- From `skill: "debugging-systematically"` → extract `debugging-systematically`
- From `gateway-frontend` → extract `gateway-frontend`
- Create list of all skill names referenced

c. **Check against deprecation registries:**

```bash
# Check if skill exists in archived directories
find .claude/skills/.archived -name "{skill-name}" -type d 2>/dev/null
find .claude/skill-library/.archived -name "{skill-name}" -type d 2>/dev/null
```

d. **Check for known deprecated patterns:**

- Old naming conventions (e.g., `react-patterns` → `using-modern-react-patterns`)
- Renamed skills (check .claude/deprecated-skills.json if available)
- Skills moved to different locations

e. **Report deprecated skills:**

- ✅ **PASS**: No deprecated skill references found
- ⚠️ **WARNING**: Deprecated skill reference found
- For each deprecated skill: Provide migration suggestion

f. **Example output:**

```
Phase 8: Deprecated Skills Detection
Referenced skills: debugging-systematically, gateway-frontend, react-patterns
✅ debugging-systematically - Active
✅ gateway-frontend - Active
⚠️ react-patterns - DEPRECATED (found in .claude/skill-library/.archived/)
   Migration: Use 'using-modern-react-patterns' instead
Result: WARNING (1 deprecated skill found)
```

**Why manual?** Simple grep + directory existence check against archived locations.

**Why important?** Technical debt and broken functionality when deprecated skills are removed. Early detection prevents runtime failures.

---

## Phase 7: Phantom Skills Detection

**When**: After Phase 8 check

**Procedure:**

a. **Grep for skill invocation patterns:**

```bash
grep -o 'skill: "[^"]*"' .claude/agents/{category}/{agent-name}.md
```

b. **Extract skill names from matches:**

- From `skill: "debugging-systematically"` → extract `debugging-systematically`
- Create list of all skill names referenced

c. **Verify each skill file exists:**

```bash
# Check core skills
[ -f .claude/skills/{skill-name}/SKILL.md ] && echo "Found in core"

# Check library skills (if not in core)
find .claude/skill-library -name "{skill-name}" -type d
```

d. **Report phantom skills:**

- ✅ **PASS**: All referenced skills exist
- ❌ **ERROR**: Phantom skill found
- List each phantom skill with line number

e. **Example output:**

```
Phase 7: Phantom Skills Detection
Referenced skills: debugging-systematically, developing-with-tdd
✅ debugging-systematically - Found at .claude/skills/debugging-systematically/
✅ developing-with-tdd - Found at .claude/skills/developing-with-tdd/
Result: PASS (all skills exist)
```

**Why manual?** Simple grep + file existence check.

**Why critical?** Agents fail at runtime when invoking non-existent skills.

---

## Phase 4: Gateway Enforcement

**When**: After Phase 7 check (after confirming skills exist)

**Procedure:**

a. **Read agent frontmatter skills: field:**

```bash
grep '^skills:' .claude/agents/{category}/{agent-name}.md
```

b. **Check for direct library paths:**

- Path separators: `/` or `\`
- Direct references: `.claude/skill-library/`
- File extensions: `.md`

c. **Identify violations:**

- ❌ **ERROR**: `skills: .claude/skill-library/frontend/react-patterns/SKILL.md`
- ✅ **CORRECT**: `skills: gateway-frontend`

d. **Suggest appropriate gateway:**

- Frontend/React/UI → `gateway-frontend`
- Backend/Go/API/AWS → `gateway-backend`
- Testing/Playwright/Vitest → `gateway-testing`
- Security/Auth/Crypto → `gateway-security`
- MCP/Linear/CLI → `gateway-mcp-tools`
- Integration/Webhook/OAuth → `gateway-integrations`

e. **Report Phase 4 result:**

- ✅ **PASS**: Uses gateway-\* skills only
- ❌ **ERROR**: Uses direct library paths

**Why manual?** Simple text pattern check.

**Why critical?** Direct paths defeat progressive loading architecture.

---

## Phase 5: Frontmatter Skill Location

**When**: After Phase 4 check (after confirming no direct library paths)

**Procedure:**

a. **Read agent frontmatter skills: field:**

```bash
grep '^skills:' .claude/agents/{category}/{agent-name}.md
```

b. **Extract all skill names from comma-separated list:**

- Example: `skills: debugging-systematically, gateway-frontend, using-modern-react-patterns`
- Extracted: `['debugging-systematically', 'gateway-frontend', 'using-modern-react-patterns']`

c. **Verify each skill is core or gateway (NOT library):**

```bash
# For each skill name:

# 1. If starts with 'gateway-' → Gateway skill (✅ PASS)
if [[ "$skill_name" =~ ^gateway- ]]; then
  echo "✅ $skill_name - Gateway skill"
  continue
fi

# 2. Check if exists in core (.claude/skills/)
if [ -d ".claude/skills/$skill_name" ]; then
  echo "✅ $skill_name - Core skill"
  continue
fi

# 3. Check if exists in library (.claude/skill-library/)
if find .claude/skill-library -name "$skill_name" -type d | grep -q .; then
  echo "❌ $skill_name - Library skill (ERROR)"
  # Suggest appropriate gateway based on path
  skill_path=$(find .claude/skill-library -name "$skill_name" -type d)
  echo "   Path: $skill_path"
  echo "   Suggested gateway: gateway-{domain}"
fi
```

d. **Determine appropriate gateway for library skills:**

- `development/frontend/*` → `gateway-frontend`
- `development/backend/*` → `gateway-backend`
- `testing/*` → `gateway-testing`
- `security/*` → `gateway-security`
- `claude/mcp-tools/*` → `gateway-mcp-tools`
- `development/integrations/*` → `gateway-integrations`

e. **Report Phase 5 result:**

- ✅ **PASS**: All frontmatter skills are core or gateway
- ❌ **ERROR**: Library skill found in frontmatter
- For each violation: List skill name, path, and suggested gateway

f. **Example output:**

```
Phase 5: Frontmatter Skill Location
skills: debugging-systematically, gateway-frontend, using-modern-react-patterns

✅ debugging-systematically - Core skill (.claude/skills/debugging-systematically/)
✅ gateway-frontend - Gateway skill
❌ using-modern-react-patterns - Library skill (ERROR)
   Path: .claude/skill-library/development/frontend/using-modern-react-patterns/
   Suggested gateway: gateway-frontend

Result: ERROR - Replace 'using-modern-react-patterns' with 'gateway-frontend'
```

**Why manual?** Simple directory existence checks and path categorization.

**Why critical?** Library skills in frontmatter defeat progressive loading architecture. Frontmatter skills are loaded at session start (expensive), gateway skills load patterns on-demand (efficient).

**Key Distinction from Phase 4:**

- **Phase 4**: Checks for syntax violations (paths with `/`, `.claude/`, `.md`)
- **Phase 5**: Checks for location category violations (library skills referenced by NAME)

---

## Phase 6: Pattern Delegation

**When**: After Phase 5 check

**Procedure:**

a. **Read agent body and search for embedded workflow patterns:**

**Pattern 1: TDD Workflow (RED-GREEN-REFACTOR)**

- Keywords: "RED", "GREEN", "REFACTOR", "failing test first"
- Should delegate to: `developing-with-tdd` skill
- Threshold: >200 chars

**Pattern 2: Debugging Steps (Reproduce-Isolate-Fix-Verify)**

- Keywords: "Reproduce", "Isolate", "Fix", "Verify", "root cause"
- Should delegate to: `debugging-systematically` skill
- Threshold: >200 chars

**Pattern 3: Verification Checklists (>5 items)**

- Keywords: "verify", "confirm", "check that", "ensure"
- Should delegate to: `verifying-before-completion` skill
- Threshold: >200 chars

b. **Count pattern length:**
Only flag if >200 characters

c. **Report Phase 6 result:**

- ✅ **PASS**: No embedded patterns >200 chars
- ⚠️ **WARNING**: Embedded pattern found

**Why manual?** Simple text search + character counting.

**Why important?** Embedded patterns cause agent bloat and duplication.

---

## Phase 3: Tool Validation

**When**: After Phase 6 check

**Procedure:**

a. **Read agent frontmatter type: and tools: fields:**

```bash
grep '^type:' .claude/agents/{category}/{agent-name}.md
grep '^tools:' .claude/agents/{category}/{agent-name}.md
```

b. **Check required tools by agent type:**

**Type → Required Tools Mapping:**

- `development` → Must have: `Edit`, `Write`, `Bash`
- `testing` → Must have: `Bash`
- Other types → No required tools (optional)

c. **Check forbidden tools by agent type:**

**Type → Forbidden Tools Mapping:**

- `quality` → Must NOT have: `Edit`, `Write` (read-only reviewers)
- `analysis` → Must NOT have: `Edit`, `Write` (read-only analyzers)
- `architecture` → No forbidden tools (can use any)
- `development` → No forbidden tools (can use any)
- `testing` → No forbidden tools (can use any)
- `orchestrator` → No forbidden tools (can use any)
- `research` → No forbidden tools (can use any)
- `mcp-tools` → No forbidden tools (can use any)

d. **Check for missing required tools:**

- If `development` agent: Verify `Edit`, `Write`, and `Bash` are in tools list
- If `testing` agent: Verify `Bash` is in tools list
- Report each missing required tool as ERROR

e. **Check for forbidden tools:**

- If `quality` agent: Verify `Edit` and `Write` are NOT in tools list
- If `analysis` agent: Verify `Edit` and `Write` are NOT in tools list
- Report each forbidden tool as ERROR

f. **Optional: Suggest recommended tools:**

- `architecture` → Recommended: `Read`, `Glob`, `Grep`, `TodoWrite`
- `orchestrator` → Recommended: `Task`, `TodoWrite`
- Note: These are suggestions only, not requirements

g. **Check Skill tool requirement:**

**🚨 CRITICAL CHECK**: If agent has `skills:` field with values → `Skill` tool MUST be in `tools:` list

```bash
# Read frontmatter fields
skills=$(grep '^skills:' .claude/agents/{category}/{agent-name}.md)
tools=$(grep '^tools:' .claude/agents/{category}/{agent-name}.md)

# If skills field exists and has values (not empty)
if [ -n "$skills" ] && [[ "$skills" != "skills:" ]]; then
  # Check if Skill tool is present
  if ! echo "$tools" | grep -q "Skill"; then
    echo "❌ ERROR: Agent has skills but missing Skill tool"
    echo "   Skills: $skills"
    echo "   Tools: $tools"
    echo "   Fix: Add 'Skill' to tools list in alphabetical order"
    echo "   Reference: agent-compliance-contract.md Section 12"
  else
    echo "✅ Skill tool present (required when skills exist)"
  fi
else
  echo "ℹ️ No skills in frontmatter - Skill tool not required"
fi
```

**Why critical:** Core skills in frontmatter require Skill tool to invoke via `skill: "name"` syntax. Without it, agent cannot execute skill invocations → broken at runtime.

**Widespread issue:** This check catches 4+ currently broken agents (backend-architect, security-lead, backend-developer, backend-reviewer all have skills but no Skill tool).

**Gold standard:** See `frontend-developer.md` line 5 - shows correct pattern with Skill tool present.

h. **Report Phase 3 result:**

- ✅ **PASS**: All required tools present, no forbidden tools, Skill tool present when needed
- ❌ **ERROR**: Missing required/Skill tools or has forbidden tools
- List each violation with the tool name and reference to compliance contract Section 12

i. **Example output:**

```
Phase 3: Tool Validation
type: development
tools: Read, Glob, Grep, Edit, Write, Bash, TodoWrite

Required tools check:
✅ Edit - present
✅ Write - present
✅ Bash - present

Forbidden tools check:
N/A (development agents can have any tools)

Result: PASS
```

```
Phase 3: Tool Validation
type: quality
tools: Read, Glob, Grep, Edit, Write, TodoWrite

Required tools check:
N/A (quality agents have no required tools)

Forbidden tools check:
❌ Edit - forbidden (quality agents must be read-only)
❌ Write - forbidden (quality agents must be read-only)

Result: ERROR - Remove Edit and Write from tools list
```

```
Phase 3: Tool Validation
type: architecture
tools: Bash, Glob, Grep, Read, TodoWrite, Write
skills: brainstorming, debugging-systematically, gateway-backend, verifying-before-completion

Required tools check:
N/A (architecture agents have no type-specific required tools)

Forbidden tools check:
N/A (architecture agents have no forbidden tools)

Skill tool check:
❌ ERROR: Agent has skills but missing Skill tool
   Skills: skills: brainstorming, debugging-systematically, gateway-backend, verifying-before-completion
   Tools: tools: Bash, Glob, Grep, Read, TodoWrite, Write
   Fix: Add 'Skill' to tools list in alphabetical order
   Reference: agent-compliance-contract.md Section 12

Result: ERROR - Add Skill tool (required when skills exist)
```

**Why manual?** Simple field comparison and list checking.

**Why critical?** Type safety - ensures agents can only perform operations appropriate for their role (e.g., quality reviewers can't modify code they're reviewing).

---

## Phase 2: Frontmatter Organization

**When**: After Phase 3 check

**Procedure:**

a. **Read agent file raw frontmatter (before YAML parsing):**

```bash
# Extract frontmatter section (between --- markers)
sed -n '/^---$/,/^---$/p' .claude/agents/{category}/{agent-name}.md
```

b. **Extract field order from raw frontmatter:**

- Read line by line
- Identify field names (before `:` character)
- Record the order they appear

c. **Compare against canonical field order:**

**Canonical Order:**

1.  `name:`
2.  `description:`
3.  `type:`
4.  `permissionMode:`
5.  `tools:`
6.  `skills:`
7.  `model:`
8.  `color:`

d. **Check if fields appear in canonical order:**

- For each field present in the agent
- Verify it appears in the same relative order as canonical list
- Example: If agent has `name`, `type`, `description` → OUT OF ORDER (type before description)
- Example: If agent has `name`, `description`, `type` → IN ORDER

e. **Report out-of-order fields:**

- ✅ **PASS**: All fields in canonical order
- ⚠️ **WARNING**: Fields out of order
- List each field that's out of order with its actual vs expected position

f. **Explain benefit:**

- Consistent ordering reduces merge conflicts
- Improves readability and maintainability
- Makes diffs more predictable
- Easier to spot missing required fields

g. **Example output:**

```
Phase 2: Frontmatter Organization
Canonical order: name, description, type, permissionMode, tools, skills, model, color

Actual order:
1. name ✅
2. type ⚠️ (expected: description)
3. description ⚠️ (expected: type)
4. tools ✅
5. model ✅

Result: WARNING - Fields out of order (type and description swapped)

Recommended fix:
Move 'description' before 'type' to match canonical order
```

**Why manual?** Line-by-line parsing of raw YAML to check field order.

**Why important?** Maintenance and consistency - reduces merge conflicts and improves readability.

---

## Phase 1: PermissionMode Alignment

**When**: After Phase 2 check

**Procedure:**

a. **Read agent frontmatter type: and permissionMode: fields:**

```bash
grep '^type:' .claude/agents/{category}/{agent-name}.md
grep '^permissionMode:' .claude/agents/{category}/{agent-name}.md
```

b. **Check expected permissionMode by type:**

**Type → PermissionMode Mapping:**

- `architecture` → `plan` (read-only)
- `quality` → `plan` (read-only)
- `analysis` → `plan` (read-only)
- `development` → `default` (can edit/write)
- `testing` → `default` (can edit/write)
- `orchestrator` → `default` (can coordinate)
- `research` → `default` (can fetch/write)
- `mcp-tools` → `default` (can execute tools)

c. **Compare actual vs expected:**

- Read agent's `type:` value
- Read agent's `permissionMode:` value
- Check if they match the mapping

d. **Report Phase 1 result:**

- ✅ **PASS**: permissionMode matches expected
- ❌ **ERROR**: Mismatch detected (security risk)

e. **Explain security implications:**

- Architecture agent with `default` → Can make edits during planning (should be read-only)
- Development agent with `plan` → Cannot write code (incorrect constraint)

f. **Example output:**

```
Phase 1: PermissionMode Alignment
type: development
permissionMode: default
Expected: default
✅ Match - Correct permission level
Result: PASS
```

**Why manual?** Simple field comparison.

**Why critical?** Security risk - wrong permission level allows unauthorized operations.

---

## Phase 13: Skill Gap Analysis (MANDATORY Universal Skills Only)

**When**: After Phase 12 check

**Purpose**: Verify agent has MANDATORY universal skills that ALL agents must have.

**Procedure:**

a. **Check MANDATORY universal skills (ALL agents):**

**Universal Skills (MANDATORY for ALL agents):**

- `verifying-before-completion` - Final validation before claiming complete
- `calibrating-time-estimates` - Prevent 10-24x time overestimates

**These are NOT optional.** Every agent MUST have both skills in frontmatter or Tier 1.

**Verification:**

```bash
# Check for MANDATORY universal skills
for skill in verifying-before-completion calibrating-time-estimates; do
  if ! grep -q "$skill" .claude/agents/{category}/{agent-name}.md; then
    echo "⚠️ WARNING: Missing MANDATORY universal skill: $skill"
    echo "   All agents must have this skill in frontmatter or Tier 1"
  fi
done
```

b. **Report Phase 13 result:**

```
Phase 13: Skill Gap Analysis (MANDATORY Universal Skills Only)

MANDATORY universal skills (ALL agents):
⚠️ WARNING: Missing verifying-before-completion (MANDATORY for all agents)
⚠️ WARNING: Missing calibrating-time-estimates (MANDATORY for all agents)

Result: WARNING (2 mandatory skills missing)
```

OR

```
Phase 13: Skill Gap Analysis (MANDATORY Universal Skills Only)

MANDATORY universal skills (ALL agents):
✅ verifying-before-completion - present
✅ calibrating-time-estimates - present

Result: PASS
```

**Fix guidance:**

Add `verifying-before-completion` and `calibrating-time-estimates` to:
1. Frontmatter `skills:` field, AND
2. Tier 1 of Skill Loading Protocol section

**Why WARNING severity?** These skills are MANDATORY for all agents - they prevent incomplete work and time estimation errors.

**For comprehensive skill discovery** (type-based, domain-based, trigger analysis), use the `finding-skills-for-agents` skill which handles:
- Type-based recommended skills (development/testing/quality)
- Domain-based gateway suggestions (frontend/backend/testing)
- Body trigger analysis (TDD/debugging/planning patterns)
- Gateway coverage verification

Phase 13 focuses ONLY on universal requirements to keep auditing fast and focused.

---

## Phase 14: Deprecated Pattern Detection

**When**: After Phase 1 check

**Procedure:**

a. **Check for `<EXTREMELY_IMPORTANT>` blocks:**

```bash
grep -n '<EXTREMELY_IMPORTANT>' .claude/agents/{category}/{agent-name}.md
grep -n '</EXTREMELY_IMPORTANT>' .claude/agents/{category}/{agent-name}.md
```

**If found**: Record line numbers and flag as ERROR

b. **Check for "Mandatory Skills (Must Use)" section:**

```bash
grep -n '## Mandatory Skills (Must Use)' .claude/agents/{category}/{agent-name}.md
```

**If found**: Check if agent also has "## Skill Loading Protocol" section

```bash
grep -n '## Skill Loading Protocol' .claude/agents/{category}/{agent-name}.md
```

**If BOTH exist**: Flag as WARNING (duplication)

c. **Check for "Rationalization Table" section:**

```bash
grep -n '## Rationalization Table' .claude/agents/{category}/{agent-name}.md
```

**If found**: Check if agent also has "## Anti-Bypass" section

```bash
grep -n '## Anti-Bypass' .claude/agents/{category}/{agent-name}.md
```

**If BOTH exist**: Flag as WARNING (duplication)

d. **Check for duplicate skill trigger tables:**

Look for multiple sections with skill trigger mappings:
- "## Skill Loading Protocol" with "### Tier 3: Triggered by Task Type"
- "## Skill References (Load On-Demand via Gateway)"
- "## Architecture-Specific Skill Routing"
- "## Mandatory Skills" with trigger tables

**If multiple sections with trigger tables exist**: Flag as WARNING (duplication)

e. **Report Phase 13 result:**

```
Phase 13: Deprecated Pattern Detection

Checks performed:
❌ <EXTREMELY_IMPORTANT> block found (lines 12-89) - ERROR
   → Delete entire block, content covered by Skill Loading Protocol

⚠️ "Mandatory Skills (Must Use)" section found (lines 189-332) - WARNING
   → Consolidate into Skill Loading Protocol (duplicates Tier 1/2/3)

⚠️ "Rationalization Table" section found (lines 333-346) - WARNING
   → Consolidate into Anti-Bypass section

⚠️ Duplicate skill trigger mappings found - WARNING
   → Lines 127-136 (Skill Loading Protocol Tier 3)
   → Lines 148-188 (Skill References)
   → Remove duplication, keep only in Tier 3

Result: ERROR (1 critical issue, 3 warnings)
Deletable duplication: 77 + 144 + 14 + 41 = 276 lines
```

**Fix guidance:**

1. **`<EXTREMELY_IMPORTANT>` blocks**: Delete entirely. This pattern predates Tiered Skill Loading Protocol. All content should be in Protocol sections.

2. **"Mandatory Skills (Must Use)"**: Delete section. Skill explanations belong in Protocol Tier 1/2/3, not separate section.

3. **"Rationalization Table"**: Consolidate into "## Anti-Bypass" section (should be 5-10 concise bullet points).

4. **Duplicate trigger tables**: Keep only in "### Tier 3: Triggered by Task Type". Remove separate "Skill References" or routing sections.

**Why manual?** Simple text pattern matching with context awareness.

**Why critical?** These deprecated patterns cause massive duplication. Example: frontend-architect has 512 lines with 276 lines deletable (vs frontend-developer gold standard at 130 lines).

---

## Phase 15: Library Skill Path Validation

**When**: After Phase 14 check

**Procedure:**

a. **Extract all library skill paths from agent body:**

```bash
# Find all references to .claude/skill-library paths
grep -oE '\.claude/skill-library/[^)]+/SKILL\.md' .claude/agents/{category}/{agent-name}.md | sort -u
```

b. **For each extracted path, verify file exists:**

```bash
# For each path found
if [ ! -f "$path" ]; then
  echo "❌ ERROR: Invalid path - $path"
fi
```

c. **Check for known renamed skills:**

Common renames not yet in deprecation registry:
- `frontend-tanstack-query` → `using-tanstack-query`
- `frontend-tanstack-table` → Renamed to `using-tanstack-table`
- `frontend-tanstack-router` → Renamed to `using-tanstack-router`
- `frontend-react-hook-form-zod` → Check if renamed/removed
- `frontend-shadcn-ui` → Check if removed
- `frontend-architecture` → Check if removed/renamed
- `frontend-tanstack` → Check if parent skill removed

**Detection pattern:**

```bash
# If path contains old name but file doesn't exist
if grep -q 'frontend-tanstack-query' <<< "$path" && [ ! -f "$path" ]; then
  # Try to find correct path
  correct_path=$(find .claude/skill-library -name "using-tanstack-query" -type d 2>/dev/null)
  if [ -n "$correct_path" ]; then
    echo "❌ ERROR: Skill renamed"
    echo "   Old: $path"
    echo "   New: $correct_path/SKILL.md"
  fi
fi
```

d. **Suggest fixes for missing skills:**

```bash
# Extract skill name from path (parameter expansion - basename/dirname not in sandbox)
temp="${path%/SKILL.md}"; skill_name="${temp##*/}"

# Try to find skill elsewhere in skill-library
found=$(find .claude/skill-library -name "$skill_name" -type d 2>/dev/null)

if [ -n "$found" ]; then
  echo "⚠️ Skill found at different location: $found"
else
  echo "❌ Skill not found - check deprecation registry"
fi
```

e. **Report Phase 14 result:**

```
Phase 14: Library Skill Path Validation

Paths checked: 8 library skill references

✅ .claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md
✅ .claude/skill-library/architecture/frontend/enforcing-information-architecture/SKILL.md
✅ .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
✅ .claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md
✅ .claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md

Result: ERROR (2 invalid paths found)
```

**Fix guidance:**

1. **Renamed skills**: Update path to correct location. Search for skill by name in skill-library to find new location.

2. **Missing skills**: Check `.claude/skill-library/lib/deprecation-registry.json` for rename/removal information.

3. **Update references**: Use Edit tool to replace old paths with correct paths throughout agent body.

**Why manual?** File existence checks + path resolution require filesystem access.

**Why critical?** Agents with invalid paths will fail at runtime when trying to read non-existent skills. Prevents broken skill loading.

---

## Phase 16: Markdown Table Formatting

**When**: After Phase 15 check

**Procedure:**

a. **Find all markdown tables in agent file:**

```bash
# Extract lines that start with pipe (table rows)
grep -n '^|' .claude/agents/{category}/{agent-name}.md
```

b. **For each table block, validate structure:**

**Step 1: Identify table boundaries**

Tables are consecutive lines starting with `|`. A blank line or non-table line ends the table.

```bash
# Example table block at lines 42-45:
42: | Phase | Name | Status |
43: |---|---|---|
44: | 1 | Check | Pass |
45: | 2 | Fix | Pass |
```

**Step 2: Extract table components**

For each table:
- **Header row**: First line of table block
- **Separator row**: Second line (must match pattern `|---|---|...`)
- **Data rows**: Remaining lines in block

**Step 3: Count columns**

Count columns by counting pipe characters minus 1:

```bash
# Header: | Phase | Name | Status |
# Pipes: 1 2 3 4
# Columns: 4 - 1 = 3 columns

# Or count cells between pipes
# Cells: "Phase", "Name", "Status" = 3 columns
```

**Step 4: Validate separator format**

Separator row must use pattern: `|---|---|---|` (3+ dashes per cell)

```bash
# ✅ Valid separators
|---|---|---|
| --- | --- | --- |
|-------|-------|-------|

# ❌ Invalid separators
| - | - | - |           # Too short (< 3 dashes)
|-- |-- |-- |          # Too short (< 3 dashes)
|---|---                # Missing pipes or columns
```

**Step 5: Check column consistency**

All rows must have same column count as header:

```bash
# ✅ Consistent (all rows 3 columns)
| Phase | Name | Status |
|---|---|---|
| 1 | Check | Pass |
| 2 | Fix | Pass |

# ❌ Inconsistent (header 3, separator 2, row 4)
| Phase | Name | Status |
|---|---|
| 1 | Check | Pass | Extra |
```

**Step 6: Check Trigger Column Length (Tier 3 tables)**

For Tier 3 trigger tables specifically, validate trigger description length:

```bash
# For tables with "Trigger | Read Path" headers
# Extract trigger column content (first cell in data rows)
# Count characters in trigger description

# ⚠️ WARNING if trigger >30 characters
if [ trigger_length -gt 30 ]; then
  echo "⚠️ WARNING: Trigger too verbose (${trigger_length} chars, max 30)"
  echo "   Use 1-3 words: 'MSW mocking' not 'Creating MSW handlers, mocking API responses, test fixtures'"
fi
```

**Examples:**

```markdown
❌ TOO VERBOSE (60 chars):
| Creating MSW handlers, mocking API responses, test fixtures | ... |

✅ CONCISE (11 chars):
| MSW mocking | ... |

❌ TOO VERBOSE (55 chars):
| Async operations, waiting for state changes, flaky tests | ... |

✅ CONCISE (16 chars):
| Async operations | ... |
```

**Step 7: Check Combined Row Width**

Validate total row content length:

```bash
# For each data row, combine all cell content
total_width = trigger_length + path_length

# ⚠️ WARNING if combined >120 characters
if [ total_width -gt 120 ]; then
  echo "⚠️ WARNING: Row too wide (${total_width} chars, max 120)"
  echo "   Suggest: Split verbose triggers or use bullet list format"
fi
```

**Why 120 chars?** Maximum readable width before wrapping causes visual chaos in most editors/viewers.

**Step 8: Visual Readability Assessment**

Assess if table will render poorly:

```markdown
ℹ️ INFO checks:
- Long paths (>80 chars) combined with verbose triggers
- Table would wrap awkwardly in standard terminal (80-120 char width)
- Columns wouldn't visually align due to content length variance

Suggest: Consider alternative format for complex mappings:
- Bullet list with inline code paths
- Multiple tables split by category
- Abbreviate common path prefixes
```

c. **Report Phase 16 result:**

```
Phase 16: Markdown Table Formatting
Tables found: 3

Table 1 (lines 42-45):
✅ Header: 3 columns
✅ Separator: Valid format |---|---|---|
✅ Data rows: All have 3 columns (2 rows checked)
✅ Readability: All triggers <30 chars, combined width <120 chars
Result: PASS

Table 2 (lines 89-93) - Tier 3 trigger table:
✅ Header: 4 columns
⚠️  Separator: Uses single dash | - | - | - | - | (should use 3+ dashes)
✅ Data rows: All have 4 columns (3 rows checked)
⚠️  Trigger column: Row 2 has 60-char trigger (max 30)
    "Creating MSW handlers, mocking API responses, test fixtures"
    Suggest: "MSW mocking"
⚠️  Combined width: Row 2 has 142 chars (max 120)
Result: WARNING (separator format + readability issues)

Table 3 (lines 156-160):
⚠️  Header: 3 columns (missing trailing pipe)
❌ Separator: 2 columns (expected 3)
❌ Row 2: 4 columns (expected 3)
❌ Row 3: 2 columns (expected 3)
Result: ERROR (multiple inconsistencies)

Overall: WARNING (1 table with readability issues, 1 table with errors)
```

**Severity Levels:**

- ✅ **PASS**: All tables properly formatted
- ⚠️ **WARNING**: Minor formatting issues (separator style, trailing pipes)
- ❌ **ERROR**: Critical issues (column count mismatches)

**Common Issues:**

| Issue | Severity | Example |
|-------|----------|---------|
| Column count mismatch | ERROR | Header 3 cols, row has 4 |
| Trigger too verbose | WARNING | 60-char trigger vs 30-char max |
| Combined row width excessive | WARNING | Trigger + path = 142 chars vs 120 max |
| Separator too short | WARNING | Using `\| - \|` instead of `\|---\|` |
| Missing trailing pipe | WARNING | `\| A \| B \| C` (some parsers accept) |
| Visual alignment poor | INFO | Long content causes wrapping/chaos |
| Inconsistent spacing | INFO | Mixing `\|A\|B\|` and `\| A \| B \|` |

**Fix Guidance:**

1. **Column mismatches**: Add/remove columns to match header
2. **Verbose triggers**: Shorten to 1-3 words (e.g., "MSW mocking" not "Creating MSW handlers, mocking API responses, test fixtures")
3. **Excessive row width**: Shorten trigger descriptions to reduce combined length below 120 chars
4. **Separator format**: Replace with `|---|` pattern (3+ dashes)
5. **Trailing pipes**: Add if missing for consistency
6. **Visual alignment**: Consider bullet list format if table remains unreadable after shortening
7. **Spacing**: Choose one style and apply throughout

**Why Manual?**

Requires context-aware table parsing:
- Line-by-line analysis to identify table blocks
- Column counting logic
- Format validation
- Human judgment on parser compatibility

**Why Important?**

- **Practical readability**: Tables must be scannable - verbose triggers defeat the purpose
- **Documentation quality**: Professional tables improve credibility and usability
- **Maintainability**: Consistent structure easier to update
- **Parser compatibility**: Prevents rendering issues
- **User experience**: Better experience in source and rendered views

**Severity Guidelines:**

- **ERROR**: Structural failures (column count mismatches >1 between rows) - breaks parsing
- **WARNING**: Readability issues (verbose triggers, excessive width, separator format) - hurts usability
- **INFO**: Minor style inconsistencies (spacing, alignment suggestions) - cosmetic

Readability warnings should be fixed for quality, even though agents function with poorly formatted tables. Professional documentation requires scannable tables.

**Testing After Fix:**

1. Run Phase 16 check again
2. Verify all tables PASS or have only minor WARNINGs
3. Check that fixes maintain semantic meaning
4. Ensure no accidental content changes during formatting

---

## Phase 17: Skill Content Duplication Detection

**When**: After Phase 16 check

**Purpose**: Detect agent body content that duplicates information already covered by existing skills.

**Procedure:**

a. **Read agent body and identify instructional content:**

Read the agent body sections (everything after frontmatter) and identify:
- Patterns, workflows, or methodologies (>100 characters)
- Step-by-step processes or rules
- Technical guidance or best practices
- Checklist items or verification steps

Skip:
- Agent-specific context (description, examples, output format)
- Skill Loading Protocol section (defines WHICH skills, not duplicates CONTENT)
- Anti-Bypass section (short rationalization warnings)
- Escalation section (agent-specific boundaries)

b. **For each substantial instructional section (>100 chars), reason about skill coverage:**

For each identified section, ask:
- Does this content explain a pattern/workflow that a skill likely covers?
- Common duplication targets:
  - TDD workflow steps → `developing-with-tdd`
  - Debugging procedures → `debugging-systematically`
  - Verification checklists → `verifying-before-completion`
  - Refactoring patterns → `adhering-to-dry`
  - Scope discipline → `adhering-to-yagni`
  - Time estimation rules → `calibrating-time-estimates`
  - Planning workflows → `writing-plans`
  - Brainstorming process → `brainstorming`
  - React patterns → `using-modern-react-patterns`
  - State management → `using-zustand-state-management`, `using-tanstack-query`
  - Testing patterns → `frontend-testing-patterns`, `frontend-e2e-testing-patterns`

c. **Search for matching skills:**

Use skill-search CLI to find potentially matching skills:

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude"
npm run -w @chariot/auditing-skills search -- "QUERY"
```

Example queries based on content found:
- Agent has TDD steps → `npm run -w @chariot/auditing-skills search -- "TDD"`
- Agent has debugging flow → `npm run -w @chariot/auditing-skills search -- "debugging"`
- Agent has React patterns → `npm run -w @chariot/auditing-skills search -- "react patterns"`

d. **Read candidate skill SKILL.md files to confirm overlap:**

For each potential match from search:

```bash
# If search shows [CORE] skill
Read('.claude/skills/{skill-name}/SKILL.md')

# If search shows [LIB] skill
Read('.claude/skill-library/{domain}/{skill-name}/SKILL.md')
```

Compare:
- Does the skill cover the same workflow/pattern?
- Is the agent content a subset of what the skill provides?
- Would referencing the skill instead be sufficient?

e. **Report duplications found:**

For each confirmed duplication, report:
- Section location (line numbers in agent file)
- Overlapping skill path
- Fix suggestion (delete section + add Tier 3 trigger reference)

**Example analysis:**

```
Agent: frontend-developer.md

Section found (lines 89-145):
## React Component Patterns
- Use functional components with hooks
- Prefer composition over inheritance
- Extract reusable hooks when logic is shared
...

Search: npm run -w @chariot/auditing-skills search -- "react patterns"
Result: [LIB] using-modern-react-patterns (Score: 92)

Verification:
Read('.claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md')
→ Skill covers ALL patterns mentioned in agent section

DUPLICATION CONFIRMED:
- Agent lines 89-145 duplicates content from using-modern-react-patterns
- Fix: Delete section, add Tier 3 trigger:
  | React patterns | `.claude/skill-library/.../using-modern-react-patterns/SKILL.md` |
```

**Results:**

- ✅ **PASS**: No embedded content duplicating skills
- ⚠️ **WARNING**: Content duplicates skill - should reference skill instead

**Fix Guidance:**

1. **Delete duplicated section** from agent body
2. **Add skill to Tier 3** (if not already present):
   ```markdown
   ### Tier 3: Triggered by Task Type
   | Trigger | Read Path |
   |---------|-----------|
   | [task that needs this content] | `.claude/skill-library/.../SKILL.md` |
   ```
3. **Verify skill is accessible** via gateway (if library skill)

**Example Fix:**

```markdown
# Before (agent with embedded TDD workflow)
## Development Workflow
When implementing features:
1. Write failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while tests pass (REFACTOR)
...

# After (agent references skill instead)
### Tier 3: Triggered by Task Type
| Trigger | Read Path |
|---------|-----------|
| Implementing features | `.claude/skills/developing-with-tdd/SKILL.md` |
```

**Why Manual?**

This is a reasoning task that requires:
- Semantic understanding of what content "means"
- Judgment about whether content is truly duplicated vs agent-specific
- Knowledge of the skill ecosystem to find matches
- Decision-making about appropriate fixes

Cannot be automated with simple grep patterns - requires Claude's reasoning.

**Why Important?**

Content duplication causes:
- **Agent bloat**: Same content in multiple places (agent + skill)
- **Maintenance burden**: Updates must be made in multiple locations
- **Inconsistency**: Agent version may drift from skill version
- **Token waste**: Loading redundant content wastes context window
- **Architecture violation**: Agents should be lean coordinators, skills should hold detailed patterns

**Reference:** Lean agent pattern (<300 lines) depends on delegating detailed content to skills via Tier 3 triggers rather than embedding duplicates.

