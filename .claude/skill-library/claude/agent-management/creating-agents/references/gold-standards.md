# Gold Standard Agents

**Purpose**: Analysis of exemplar agents to understand what makes them excellent

**When to read**: During agent creation to understand quality patterns, or when customizing templates

---

## What Makes an Agent "Gold Standard"

**Criteria**:

1. **Lean** - Appropriate size for agent type (150-280 lines)
2. **Complete** - All required sections present
3. **Compliant** - Passes all audit phases
4. **Tested** - Proven in production use
5. **Clear** - Instructions unambiguous
6. **Effective** - Actually solves problems well

---

## The Four Gold Standard Agents

### Overview

| Agent                  | Type         | Lines | Location                                           | Key Features                                           |
| ---------------------- | ------------ | ----- | -------------------------------------------------- | ------------------------------------------------------ |
| **frontend-lead**      | architecture | 151   | `.claude/agents/architecture/frontend-lead.md`     | Step 1/2/3, Core Responsibilities, 6-point Anti-Bypass |
| **frontend-tester**    | testing      | 277   | `.claude/agents/testing/frontend-tester.md`        | Mode-based structure, comprehensive test guidance      |
| **security-lead**      | architecture | 185   | `.claude/agents/architecture/security-lead.md`     | Security-specific responsibilities, threat modeling    |
| **frontend-developer** | development  | 160   | `.claude/agents/development/frontend-developer.md` | Implementation focus, TDD enforcement                  |

**These agents represent the ACTUAL pattern.** They are the source of truth, not documentation that has drifted.

---

## Gold Standard #1: frontend-lead (Architecture Pattern)

**Location**: `.claude/agents/architecture/frontend-lead.md`
**Size**: 151 lines
**Type**: architecture
**Model**: opus
**Pattern**: Step 1/2/3 Skill Loading Protocol

### Why It's a Gold Standard

**1. Two-Tier Skill System (CRITICAL PATTERN)**

FROM frontend-lead.md lines 34-37:

```markdown
- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

**Library skill paths come FROM the gateway—do NOT hardcode them.**
```

This is **NOT** "Read() for all skills" - it's a **TWO-TIER** system.

**2. Step 1/2/3 Structure (NOT Tier 1/2/3)**

FROM frontend-lead.md lines 40-91:

```markdown
### Step 1: Always Invoke First

**Every architecture task requires these (in order):**

| Skill                               | Why Always Invoke                                  |
| ----------------------------------- | -------------------------------------------------- |
| `calibrating-time-estimates`        | Prevents "no time to read skills" rationalization  |
| `gateway-frontend`                  | Routes to mandatory + task-specific library skills |
| `brainstorming`                     | MANDATORY for architects - explore alternatives    |
| `writing-plans`                     | Document architectural decisions                   |
| `enforcing-evidence-based-analysis` | Read source files before designing                 |
| `verifying-before-completion`       | Ensures outputs are verified before claiming done  |

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger                            | Skill                               | When to Invoke                                    |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------- |
| Creating implementation plan       | `enforcing-evidence-based-analysis` | BEFORE planning - read all relevant source files  |
| Evaluating multiple approaches     | `brainstorming`                     | Exploring alternatives before recommending        |
| Documenting architecture decisions | `writing-plans`                     | Creating formal design artifacts                  |
| Bug, error, unexpected behavior    | `debugging-systematically`          | Investigating issues before fixing                |
| Multi-step task (≥2 steps)         | `using-todowrite`                   | Track architecture decisions and validation steps |

### Step 3: Load Library Skills from Gateway

The gateway provides:

1. **Mandatory library skills** - Read ALL skills in "Mandatory" section for architects
2. **Task-specific routing** - Use routing tables to find relevant library skills
   ...
```

**3. Core Responsibilities Section**

FROM frontend-lead.md lines 16-31:

```markdown
## Core Responsibilities

### Architecture for New Features

- Design component hierarchies
- Define state management strategy (TanStack Query vs Zustand vs Context)
- Plan file organization and module boundaries
- Specify performance requirements
- Document architectural decisions

### Architecture Review for Refactoring

- Analyze existing code structure
- Identify technical debt and architectural smells
- Design refactoring approach with minimal risk
- Plan incremental migration strategy
- Document trade-offs and alternatives considered
```

**4. Anti-Bypass with 6 Detailed Points**

FROM frontend-lead.md lines 93-99:

```markdown
## Anti-Bypass

Do NOT rationalize skipping skills:

- "No time" → calibrating-time-estimates exists precisely because this rationalization is a trap. You are 100x faster than a human
- "Simple task" → Step 1 + verifying-before-completion still apply
- "I already know this" → Your training data is stale, you are often not up to date on the latest libraries and patterns, read current skills
- "Solution is obvious" → That's coder thinking, not lead thinking - explore alternatives with brainstorming
- "Just this once" → "Just this once" becomes "every time" - follow the workflow
- "I'm confident I know the code. Code is constantly evolving" → `enforcing-evidence-based-analysis` exists because confidence without evidence = **hallucination**
```

NOT "3 brief bullet points."

**5. Output Format with Two Arrays**

FROM frontend-lead.md lines 133-145:

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was done",
  "skills_invoked": ["writing-plans", "brainstorming", "gateway-frontend"],
  "library_skills_read": [".claude/skill-library/architecture/frontend/..."],
  "architecture": {
    "components": ["ComponentA", "ComponentB"],
    "state_management": "TanStack Query + Zustand",
    "file_organization": "Feature-based with shared UI",
    "trade_offs": {
      "chosen_approach": "...",
      "alternatives_considered": ["..."],
      "reasoning": "..."
    }
  },
  ...
}
```

NOT a single `skills_read` array.

### Lessons from frontend-lead

- ✅ Use Step 1/2/3 structure (NOT Tier 1/2/3)
- ✅ Document two-tier skill system explicitly
- ✅ Include Core Responsibilities with subsections
- ✅ 6 detailed Anti-Bypass points with explanations
- ✅ Output format with `skills_invoked` + `library_skills_read`
- ✅ Table format for Step 1 (Skill | Why Always Invoke)
- ✅ Table format for Step 2 (Trigger | Skill | When to Invoke)

---

## Gold Standard #2: frontend-tester (Testing Pattern)

**Location**: `.claude/agents/testing/frontend-tester.md`
**Size**: 277 lines
**Type**: testing
**Model**: sonnet
**Pattern**: Mode-based with Step 1/2/3

### Why It's a Gold Standard

**1. Higher Line Count for Testing Agents**

Testing agents have 200-280 lines because they need mode-specific guidance:

- Unit testing mode
- Integration testing mode
- E2E testing mode

Each mode has specific patterns, tools, and verification steps.

**2. Same Core Structure as frontend-lead**

- Two-tier skill system documented
- Step 1/2/3 structure
- Core Responsibilities section
- Detailed Anti-Bypass
- Output with `skills_invoked` + `library_skills_read`

**3. Mode-Specific Sections**

```markdown
## Unit Testing Mode

[Specific guidance for unit tests with Vitest]

## Integration Testing Mode

[Specific guidance for integration tests with MSW]

## E2E Testing Mode

[Specific guidance for E2E tests with Playwright]
```

### Lessons from frontend-tester

- ✅ Testing agents need more lines (200-280) for mode-specific content
- ✅ Same core structure applies to all agent types
- ✅ Mode-based organization for agents with multiple operational contexts

---

## Gold Standard #3: security-lead (Architecture + Security Pattern)

**Location**: `.claude/agents/architecture/security-lead.md`
**Size**: 185 lines
**Type**: architecture
**Model**: opus
**Pattern**: Step 1/2/3 with security focus

### Why It's a Gold Standard

**1. Security-Specific Core Responsibilities**

```markdown
## Core Responsibilities

### Threat Modeling

- Identify attack surfaces and trust boundaries
- Enumerate potential threat actors and motivations
- Map attack vectors and exploitation paths
- Prioritize threats by business impact

### Security Architecture Design

- Design authentication and authorization flows
- Specify encryption and key management strategies
- Define secure coding practices and validation requirements
```

**2. Security-Focused Step 1 Skills**

Different mandatory skills for security domain:

| Skill                               | Why Always Invoke                                      |
| ----------------------------------- | ------------------------------------------------------ |
| `calibrating-time-estimates`        | Security work takes time - prevent rushed decisions    |
| `gateway-security`                  | Routes to auth, crypto, threat modeling library skills |
| `brainstorming`                     | MANDATORY - explore attack vectors and mitigations     |
| `enforcing-evidence-based-analysis` | Security claims require evidence                       |

**3. Domain-Specific Anti-Bypass**

```markdown
- "I'm confident this is secure" → enforcing-evidence-based-analysis exists because confidence without evidence = **security vulnerability**
- "Standard pattern is fine" → Security patterns evolve - read current skills
```

### Lessons from security-lead

- ✅ Core structure applies to all domains
- ✅ Customize Core Responsibilities for domain
- ✅ Adjust Step 1 skills for domain requirements
- ✅ Add domain-specific Anti-Bypass counters

---

## Gold Standard #4: frontend-developer (Development Pattern)

**Location**: `.claude/agents/development/frontend-developer.md`
**Size**: 160 lines
**Type**: development
**Model**: opus
**Pattern**: Step 1/2/3 with development focus

### Why It's a Gold Standard

**1. Development-Specific Step 1 Skills**

| Skill                         | Why Always Invoke                                   |
| ----------------------------- | --------------------------------------------------- |
| `calibrating-time-estimates`  | Prevents "no time to read skills" rationalization   |
| `gateway-frontend`            | Routes to React patterns, testing, state management |
| `developing-with-tdd`         | Write test FIRST - RED → GREEN → REFACTOR           |
| `adhering-to-yagni`           | Build only what's needed, not what might be needed  |
| `verifying-before-completion` | Run tests and build before claiming done            |

**2. Implementation-Focused Output**

```json
{
  "status": "complete",
  "summary": "Implemented UserProfile component with TDD",
  "skills_invoked": ["developing-with-tdd", "gateway-frontend"],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md"
  ],
  "files_modified": ["src/components/UserProfile.tsx", "src/components/UserProfile.test.tsx"],
  "verification": {
    "tests_passed": true,
    "test_command": "npm test UserProfile",
    "test_output": "✓ renders user data\n✓ handles loading state",
    "build_success": true,
    "build_command": "npm run build"
  }
}
```

### Lessons from frontend-developer

- ✅ Development agents need TDD enforcement in Step 1
- ✅ Verification section in output is mandatory
- ✅ files_modified tracks implementation

---

## Common Patterns Across All Gold Standards

### 1. Two-Tier Skill System (UNIVERSAL)

**ALL gold standard agents document this:**

```markdown
- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`
```

**This is NOT "Read() for all skills."**

### 2. Step 1/2/3 Structure (UNIVERSAL)

**Step 1**: Always Invoke First (table: Skill | Why Always Invoke)
**Step 2**: Invoke Core Skills Based on Task Context (table: Trigger | Skill | When to Invoke)
**Step 3**: Load Library Skills from Gateway

**NOT "Tier 1/2/3".**

### 3. Core Responsibilities Section (UNIVERSAL)

**2-4 subsections** defining what the agent does.

### 4. Anti-Bypass with 5-6 Detailed Points (UNIVERSAL)

Each point has:

- Rationalization: "I already know this"
- Counter: → Your training data is stale, read current skills

**NOT "3 brief bullet points."**

### 5. Output Format with Two Arrays (UNIVERSAL)

```json
{
  "skills_invoked": ["core-skill-1", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"]
}
```

**NOT a single `skills_read` array.**

### 6. Multi-Example Descriptions (UNIVERSAL)

All gold standards have **2-3 examples** in description showing diverse use cases.

---

## Anti-Patterns (What Gold Standards Avoid)

### ❌ WRONG: "Read() for all skills"

**Bad**: Documentation that says "Use Read() for ALL skills. Do NOT use Skill tool."

**Good**: Two-tier system - Skill tool for core, Read for library.

**Why**: Core skills are available via Skill tool. Documentation saying otherwise is factually incorrect.

---

### ❌ WRONG: Single skills_read Array

**Bad**:

```json
{
  "skills_read": ["all", "skills", "together"]
}
```

**Good**:

```json
{
  "skills_invoked": ["core-skills"],
  "library_skills_read": ["library-skills"]
}
```

**Why**: Different invocation methods require separate tracking.

---

### ❌ WRONG: Tier 1/2/3 Structure

**Bad**: "### Tier 1: Always Read (Every Task)"

**Good**: "### Step 1: Always Invoke First"

**Why**: Actual gold standard agents use Step 1/2/3 terminology.

---

### ❌ WRONG: 3 Brief Anti-Bypass Points

**Bad**:

```markdown
## Anti-Bypass

- Simple task → Step 1 applies
- No time → Read skills
- I know this → Training stale
```

**Good**: 5-6 points with full explanations (see frontend-lead example above).

**Why**: Brief points don't provide effective counters to rationalization.

---

### ❌ WRONG: Unrealistic Line Count Targets

**Bad**: "All agents: <150 lines"

**Good**:

- Architecture: 150-200 lines
- Development: 150-180 lines
- Testing: 200-280 lines
- Analysis: 120-160 lines

**Why**: Actual gold standard agents are 151-277 lines depending on type.

---

## Applying Gold Standard Patterns

### When Creating New Agent

1. **Use agent-templates.md** (now aligned with gold standards)
2. **Add 2-3 examples in description**
3. **Include Core Responsibilities with 2-4 subsections**
4. **Use Step 1/2/3 structure (NOT Tier 1/2/3)**
5. **Document two-tier skill system**
6. **6 detailed Anti-Bypass points**
7. **Output with skills_invoked + library_skills_read**
8. **Aim for type-appropriate line count**

### When Reviewing Existing Agent

**Compare to gold standards**:

- Step 1/2/3 structure? (NOT Tier 1/2/3)
- Two-tier skill system documented?
- Core Responsibilities with subsections?
- 5-6 detailed Anti-Bypass points?
- Output has both skill arrays?
- Line count appropriate for type?

**If gaps**: Update to match gold standard pattern.

---

## Gold Standard Checklist

**An agent is gold standard quality when**:

### Structure (MANDATORY)

- [ ] Two-tier skill system documented (Skill tool for core, Read for library)
- [ ] Step 1/2/3 structure (NOT Tier 1/2/3)
- [ ] **3 mandatory universal skills in Step 1**: `calibrating-time-estimates`, `enforcing-evidence-based-analysis`, `verifying-before-completion`
- [ ] Core Responsibilities section with 2-4 subsections
- [ ] Anti-Bypass with 5-6 detailed points
- [ ] Output format with `skills_invoked` + `library_skills_read`

### Content (MANDATORY)

- [ ] Description: 2-3 examples, <1024 chars, single-line
- [ ] Frontmatter: All fields correct, alphabetized
- [ ] Step 1 table: Skill | Why Always Invoke
- [ ] Step 2 table: Trigger | Skill | When to Invoke
- [ ] Escalation Protocol: Clear handoff guidance

### Size (TYPE-DEPENDENT)

- [ ] Architecture: 150-200 lines
- [ ] Development: 150-180 lines
- [ ] Testing: 200-280 lines
- [ ] Analysis: 120-160 lines

**All checkboxes = production-ready gold standard agent** ✅

---

## Related Documents

- **`agent-templates.md`** - Templates aligned with gold standards
- **`../SKILL.md`** - Agent creation workflow
- **Gold standard agents**: frontend-lead (151L), frontend-tester (277L), security-lead (185L), frontend-developer (160L)
