---
name: verifying-agent-skill-invocation
description: Use when verifying agent correctly uses mandatory skills - spawns agent with trigger scenarios, evaluates skill invocation and methodology compliance, reports PASS/FAIL/PARTIAL per skill.
allowed-tools: Read, Grep, Glob, Task, TodoWrite
---

# Testing Agent Skills

**Verify agent correctly invokes and follows its mandatory skills through behavioral testing.**

> **Compliance**: This skill VERIFIES the [Agent Compliance Contract](../../../../skills/managing-agents/references/agent-compliance-contract.md).

> **MANDATORY**: You MUST use TodoWrite to track each skill's test result. Testing multiple skills requires organized progress tracking.

---

## Overview

This skill tests **agent-skill integration with pressure testing** (Phase 8 + Phase 10 of agent creation):

- ✅ Does every frontmatter skill have invocation guidance? (Coverage check)
- ✅ Does skill exist as a file?
- ✅ Does agent invoke skill when appropriate?
- ✅ Does agent follow skill's methodology UNDER PRESSURE?

**Key enhancements**: When testing ALL skills (no skill parameter), this skill:

1. **Verifies frontmatter-body coverage** - Detects "dead skills" (declared but no guidance)
2. **Extracts primary skills** from agent frontmatter
3. **Intelligently discovers secondary skills** via gateway routing:
   - **Tier 1 (Mandatory)**: Gateway's "Mandatory for All X Work" section
   - **Tier 2 (Agent-Matched)**: Skills matching agent's domain keywords
   - **Tier 3 (Optional)**: Remaining gateway skills
4. **Tests in priority order**: Primary → Tier 1 → Tier 2 → Tier 3 (optional)

---

## When to Use

- **Testing new agent**: Verify all primary + secondary skills (Phase 8 + Phase 10)
- **Verifying agent updates**: Ensure changes didn't break skill integration
- **Comprehensive validation**: Test agent resists pressure to bypass skills

| Scenario                   | Skill Parameter    | What Gets Tested                   |
| -------------------------- | ------------------ | ---------------------------------- |
| Test specific skill        | Provide skill name | Single skill with pressure testing |
| Test agent comprehensively | Omit skill name    | All primary + secondary skills     |

**NOT for**: Skill creation/improvement (use `pressure-testing-skill-content` directly)

---

## Quick Reference

| Step | Action                                   | Time           |
| ---- | ---------------------------------------- | -------------- |
| 0.5  | Frontmatter-Body Coverage Check          | 2-5 min        |
| 1    | Extract skills from agent frontmatter    | 1-2 min        |
| 1b   | Intelligent gateway parsing (Tier 1/2/3) | 5-10 min       |
| 2    | Create TodoWrite tracking (tiered)       | 2-3 min        |
| 3    | For each skill: verify exists & classify | 30 sec/skill   |
| 4    | For each skill: design pressure scenario | 5-10 min/skill |
| 5    | For each skill: spawn agent              | 2-5 min/skill  |
| 6    | For each skill: evaluate under pressure  | 5-10 min/skill |
| 7    | Report aggregate results (tiered)        | 5-10 min       |
| 8    | Cleanup test artifacts (MANDATORY)       | 2-3 min        |

**Total**:

- Single skill: ~15-30 min
- Primary only: ~1-2.5 hrs
- Primary + Tier 1 + Tier 2: ~3-6 hrs
- All tiers (Primary + Tier 1 + Tier 2 + Tier 3): ~8-15 hrs

---

## Input Parameters

### Agent Name (Required)

The agent to test. Example: `frontend-developer`, `backend-developer`

### Skill Name (Optional)

- **If provided**: Test only this specific skill
- **If omitted**: Test ALL skills from agent's frontmatter

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any test operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

**⚠️ If agent file not found:** You are in the wrong directory. Navigate to repo root first. Never assume "built-in agent" or "system agent" - the file exists, you're looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Step 0.5: Frontmatter-Body Coverage Check (MANDATORY)

**Verify all frontmatter skills have invocation guidance in agent body BEFORE testing.**

### 0.5.1 Extract Skills from Frontmatter

Read agent file and extract skills field:

```yaml
skills: calibrating-time-estimates, gateway-frontend, developing-with-tdd, ...
```

### 0.5.2 Check Each Skill for Body Guidance

For each skill in frontmatter, search agent body for:

- **Step 1/Step 2/Tier mentions** - "Step 1: Always Invoke", "Step 2: Invoke Core Skills"
- **Trigger table entries** - Table rows with skill name
- **Semantic matching examples** - Code examples showing when to invoke

### 0.5.3 Report Dead Skills

**Dead skill = in frontmatter but no invocation guidance**

```markdown
⚠️ WARNING: Dead Skills Detected

The following skills are declared in frontmatter but have NO invocation guidance in the agent body:

- calibrating-time-estimates (in frontmatter, not in Step 1 or Step 2)

Agent won't know when to invoke these skills. Recommend:

- Add to Step 1 (if always required)
- Add to Step 2 trigger table (if conditionally required)
- Remove from frontmatter (if not actually needed)
```

**Cannot proceed with testing if dead skills found - fix agent first** ✅

---

## Workflow

### Step 1: Extract Skills from Agent

**1.1 Read Agent File**

```bash
Read `.claude/agents/{category}/{agent-name}.md`
```

**1.2 Extract Skills from Frontmatter**

```yaml
skills: gateway-frontend, developing-with-tdd, debugging-systematically
```

**If skill parameter was provided**: Filter to just that skill.

### Step 1b: Discover Secondary Skills via Gateways (Intelligent Selection)

For each `gateway-*` skill in frontmatter:

#### 1b.1 Read Gateway

```
Read .claude/skills/{gateway-skill}/SKILL.md
```

#### 1b.2 Extract Mandatory Skills (ALWAYS TEST - Tier 1)

Find section titled **"Mandatory for All {Domain} Work"** in gateway.

**Example from `gateway-frontend`:**

```markdown
## Mandatory for All Frontend Work

Regardless of task type, you MUST Read these skills...

| Skill             | Path                                                                    | Why Mandatory |
| ----------------- | ----------------------------------------------------------------------- | ------------- |
| Performance       | `.claude/skill-library/.../optimizing-react-performance/SKILL.md`       | ...           |
| Info Architecture | `.claude/skill-library/.../enforcing-information-architecture/SKILL.md` | ...           |
```

Extract ALL skills listed there → **Tier 1 (Required)**

#### 1b.3 Analyze Agent Body for Task Domains (Agent-Matched - Tier 2)

Parse agent body (description + examples + trigger tables) for domain keywords:

| Keywords Found                                 | Relevant Library Skills            |
| ---------------------------------------------- | ---------------------------------- |
| "forms", "validation", "input"                 | `implementing-react-hook-form-zod` |
| "table", "sorting", "filtering", "pagination"  | `using-tanstack-table`             |
| "API", "data fetching", "queries", "mutations" | `using-tanstack-query`             |
| "state management", "client state", "store"    | `using-zustand-state-management`   |
| "E2E", "Playwright", "browser testing"         | `frontend-e2e-testing-patterns`    |
| "context", "shared state", "providers"         | `using-context-api`                |
| "performance", "slow", "optimization"          | `optimizing-react-performance`     |
| "animation", "motion", "transitions"           | `frontend-animation-designer`      |

#### 1b.4 Cross-Reference Gateway Quick Reference Table

Use gateway's **Quick Reference** or **Quick Decision Guide** to map agent keywords to library skills.

**Example from `gateway-frontend` Quick Reference:**

```markdown
| Need                     | Skill Path                                                              |
| ------------------------ | ----------------------------------------------------------------------- |
| React components         | `.claude/skill-library/.../frontend-react-component-generator/SKILL.md` |
| Server state (API calls) | `.claude/skill-library/.../using-tanstack-query/SKILL.md`               |
```

If agent mentions "components" → Add `frontend-react-component-generator` to Tier 2

#### 1b.5 Categorize Secondary Skills

**Tier 1 (Required - Always Test):**

- Gateway mandatory skills
- Test EVERY one of these

**Tier 2 (Agent-Matched - Should Test):**

- Skills matching agent's domain keywords
- High priority for testing

**Tier 3 (Optional - Test If Time Permits):**

- Remaining gateway skills not in Tier 1 or Tier 2
- Lower priority

**Separate into**:

- **Primary skills**: Non-gateway skills from frontmatter (test first)
- **Secondary Tier 1**: Gateway mandatory skills (test second)
- **Secondary Tier 2**: Agent-domain-matched skills (test third)
- **Secondary Tier 3**: Other gateway skills (test if time permits)

### Step 2: Create TodoWrite Tracking

```
TodoWrite:
- Step 0.5: Frontmatter-Body Coverage Check: PENDING
- Test developing-with-tdd (primary): PENDING
- Test debugging-systematically (primary): PENDING
- Test gateway-frontend Tier 1 (mandatory):
  - Test optimizing-react-performance: PENDING
  - Test enforcing-information-architecture: PENDING
  - Test chariot-brand-guidelines: PENDING
  - Test using-modern-react-patterns: PENDING
- Test gateway-frontend Tier 2 (agent-matched):
  - Test using-tanstack-query: PENDING
  - Test frontend-react-component-generator: PENDING
- Test gateway-frontend Tier 3 (optional):
  - (List remaining gateway skills if testing all)
```

### Step 3: For Each Skill - Verify Exists and Classify Type

**Skill types determine evaluation criteria:**

| Type        | Location                 | Invocation          | Evaluation Looks For  |
| ----------- | ------------------------ | ------------------- | --------------------- |
| **Core**    | `.claude/skills/`        | `skill: "name"`     | Skill tool invocation |
| **Library** | `.claude/skill-library/` | `Read("full/path")` | Read tool with path   |

**Find and classify:**

```bash
# Try core first
Read `.claude/skills/{skill-name}/SKILL.md`

# If not found, search library
Grep pattern: "name: {skill-name}" path: .claude/skill-library
```

**Record the skill type** for use in Step 6 evaluation.

**If NOT FOUND**: BLOCKED - Cannot proceed without resolving.

### Step 4: Design Pressure Scenario

Design scenario with **3+ combined pressures** that makes agent WANT to bypass skill:

| Pressure Type  | Example                     |
| -------------- | --------------------------- |
| **Time**       | Emergency, deadline closing |
| **Sunk cost**  | Hours of work at risk       |
| **Authority**  | Senior says skip it         |
| **Economic**   | Job/promotion at stake      |
| **Exhaustion** | End of day, want to go home |

**See `references/trigger-scenarios.md` for detailed examples.**

### Step 5: Spawn Agent with Pressure Scenario

```
Task({
  subagent_type: "{agent-name}",
  prompt: "IMPORTANT: This is a real scenario. You must choose and act.\n\n{pressure-scenario}",
  description: "Test {skill-name} under pressure"
})
```

### Step 6: Evaluate Under Pressure

**See `references/evaluation-criteria.md` for detailed criteria.**

**CRITICAL: Verify by reading OUTPUT FILES, not agent response summary.**

The agent's response summary is unreliable - agents may claim to have invoked skills without actually doing so. The authoritative record is the **output file's JSON metadata block**.

#### Verification Method

**Directory Format**: `.claude/.output/testing/{timestamp}-{slug}/`

- `{timestamp}`: `date +"%Y-%m-%d-%H%M%S"` format (e.g., `2026-01-03-152847`)
- `{slug}`: Task description slug

1. **Check if file was created** - Look for the testing output directory
2. **Read the output file** - Use `Read` tool on the agent's main output file
3. **Find JSON metadata block** - Located at the end of the output file
4. **Verify metadata fields** - Check `skills_invoked` and `library_skills_read` arrays

**Example compliant metadata:**

```json
{
  "skills_invoked": ["developing-with-tdd", "gateway-frontend", ...],
  "library_skills_read": [".claude/skill-library/.../SKILL.md", ...],
  "feature_directory": ".claude/.output/testing/..."
}
```

#### PASS Criteria ✅ (verified via output file metadata)

**Core skills** (in `.claude/skills/`):

- `skills_invoked` array contains the skill name
- Agent followed methodology DESPITE pressure (visible in output content)

**Library skills** (in `.claude/skill-library/`):

- `library_skills_read` array contains the skill path
- Agent followed methodology from the loaded skill

#### FAIL Criteria ❌

- No output file created (agent returned inline text only)
- Output file missing JSON metadata block
- Skill not listed in `skills_invoked` or `library_skills_read` arrays
- Agent invoked but violated methodology under pressure
- Agent rationalized away skill's requirements

#### PARTIAL Criteria ⚠️

- Agent followed methodology implicitly (skill not in metadata but behavior correct)
- Agent acknowledged skill but argued for exceptions
- Metadata present but incomplete

**Update TodoWrite** with result after each skill.

### Step 7: Report Aggregate Results

```markdown
═══ Skill Integration Test Results ═══

Agent: {agent-name}
Testing Scope: Primary + Tier 1 + Tier 2

═══ Step 0.5: Coverage Check ═══

✅ All frontmatter skills have invocation guidance
(OR)
⚠️ Dead skills detected: calibrating-time-estimates

═══ Primary Skills Results ═══

Tested: {N} skills

✅ developing-with-tdd: PASS

- Invoked explicitly under pressure
- Chose correct option despite sunk cost

❌ verifying-before-completion: FAIL

- Didn't invoke skill
- Rationalized: "I already manually tested it"

═══ Secondary Skills (Tier 1 - Mandatory) ═══

Tested: {M} mandatory gateway skills

✅ optimizing-react-performance: PASS
✅ enforcing-information-architecture: PASS
✅ chariot-brand-guidelines: PASS
✅ using-modern-react-patterns: PASS

═══ Secondary Skills (Tier 2 - Agent-Matched) ═══

Tested: {P} agent-domain skills

✅ using-tanstack-query: PASS
✅ frontend-react-component-generator: PASS

═══ Secondary Skills (Tier 3 - Optional) ═══

Not tested (time constraint) OR Tested: {Q} remaining skills

═══ Recommendations ═══

FAILED: verifying-before-completion
→ Update agent to emphasize non-negotiable verification

DEAD SKILL: calibrating-time-estimates
→ Add to Step 1 (always invoke) or Step 2 trigger table
```

**For complete report format, see `references/testing-examples.md`.**

### Step 8: Cleanup Test Artifacts (MANDATORY)

**🚨 CRITICAL: Prevent test pollution in production codebase**

After reporting results, you MUST clean up all test artifacts created during agent testing.

**8.1 Track Created Files During Testing**

Throughout Steps 5-6, when agents create files, store their paths:

```typescript
// Example tracking
const createdArtifacts: string[] = [];

// When agent creates files (Step 5)
if (agentOutput.includes("Files Created:")) {
  // Extract file paths from agent output
  createdArtifacts.push("modules/chariot/ui/src/components/UserProfile/");
}
```

**8.2 Delete All Created Test Artifacts**

```bash
# For each tracked artifact
for artifact in "${createdArtifacts[@]}"; do
  if [ -e "$artifact" ]; then
    echo "Deleting test artifact: $artifact"
    rm -rf "$artifact"
  fi
done
```

**8.3 Restore Modified Files**

```bash
# Revert any modifications to existing files
git restore .
```

**8.4 Verify Clean State**

```bash
# Check git status is clean
git status --short
```

**Expected output:** Empty (no untracked or modified files)

**8.5 Report Cleanup Summary**

Add to aggregate results report:

```markdown
═══ Step 8: Cleanup Summary ═══

✅ Test artifacts deleted: 1 directory

- modules/chariot/ui/src/components/UserProfile/

✅ Modified files restored: 0

✅ Git status: Clean

⚠️ If cleanup failed, review artifacts manually and delete before committing.
```

**Why This Matters:**

- **Prevents production pollution** - Test code won't accidentally be committed
- **Reproducible environment** - Each test run starts clean
- **Safety** - Avoids breaking production with test artifacts

**Implementation Pattern:**

```typescript
// Pseudo-code for cleanup workflow
async function cleanupTestArtifacts(createdPaths: string[]) {
  // Delete created directories/files
  for (const path of createdPaths) {
    await Bash({ command: `rm -rf ${path}` });
  }

  // Restore modified files
  await Bash({ command: "git restore ." });

  // Verify clean
  const status = await Bash({ command: "git status --short" });

  if (status.trim() === "") {
    return { success: true, message: "Git status: Clean" };
  } else {
    return { success: false, message: `Unclean state: ${status}` };
  }
}
```

**Update TodoWrite** after cleanup completes.

---

## Quick Example

```
User: "Test developing-with-tdd for react-developer"

1. Verify exists: Read developing-with-tdd skill ✅
2. Design scenario: "Implement password validator under time pressure"
3. Spawn: Task(react-developer, scenario)
4. Evaluate: Agent invoked skill, wrote test first ✅
5. Result: PASS ✅
```

**For detailed examples, see `references/testing-examples.md`.**

---

## Integration Points

### Used By

- **creating-agents** (Phase 8: Skill Verification)
- **updating-agents** (Phase 4: GREEN verification)
- **agent-manager** (routes test operations)

### References

- **pressure-testing-skill-content** - Pressure testing methodology
- **creating-agents** - Agent creation workflow
- **updating-agents** - Agent update workflow

---

## See Also

- `creating-agents` - Agent creation workflow (Phase 8 uses this skill)
- `updating-agents` - Agent update workflow
- `pressure-testing-skill-content` - Pressure testing skills
- `agent-manager` - Routes test operations

**Reference files:**

- `references/trigger-scenarios.md` - Pressure scenario templates
- `references/evaluation-criteria.md` - Detailed evaluation criteria
- `references/testing-examples.md` - Complete examples
