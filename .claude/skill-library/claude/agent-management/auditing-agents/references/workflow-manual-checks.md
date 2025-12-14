# Manual Check Procedures

Detailed procedures for the 5 instruction-based manual checks that Claude performs after running TypeScript audit tools.

---

## Phase 9: Explicit Skill Invocation

**When**: After running TypeScript tools, for agents with `skills:` in frontmatter

**Procedure:**

a. **Read the agent file:**
   ```
   Read .claude/agents/{category}/{agent-name}.md
   ```

b. **Check if agent has `skills:` in frontmatter:**
   - If NO `skills:` field → Phase 9 is N/A  
   - If YES `skills:` field → Continue with Phase 9 check

c. **Search for EXTREMELY_IMPORTANT block:**
   - Use Grep or Read to find `<EXTREMELY_IMPORTANT>` in agent body
   - Block should appear after frontmatter, before role statement

d. **Verify block contains all required elements:**
   - [ ] "You MUST explicitly invoke" absolute language
   - [ ] Explicit invocation syntax for each mandatory skill (e.g., `skill: "debugging-systematically"`)
   - [ ] Anti-rationalization patterns (common shortcuts with counters)
   - [ ] Validation warning about consequences

e. **Report Phase 9 result:**
   - ✅ **PASS**: Block exists with all required elements
   - ⚠️ **WARNING**: Missing block (agent has `skills:` but no enforcement)
   - ✅ **N/A**: No `skills:` field in frontmatter

**Why manual?** Simple text matching that Claude can do by reading the file. No complex regex needed.

---

## Phase 8: Deprecated Skills Detection

**When**: After Phase 9 check

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
   - ✅ **PASS**: Uses gateway-* skills only
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
      Path: .claude/skill-library/development/frontend/patterns/using-modern-react-patterns/
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

g. **Report Phase 3 result:**
   - ✅ **PASS**: All required tools present, no forbidden tools
   - ❌ **ERROR**: Missing required tools or has forbidden tools
   - List each violation with the tool name

h. **Example output:**
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
   1. `name:`
   2. `description:`
   3. `type:`
   4. `permissionMode:`
   5. `tools:`
   6. `skills:`
   7. `model:`
   8. `color:`

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
