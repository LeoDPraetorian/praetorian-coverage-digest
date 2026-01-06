# Agent Templates

**Purpose**: Copy-paste template for creating lean agents following the gold standard pattern

**Usage**: Copy template → Replace [PLACEHOLDERS] → Customize sections

---

## Template Structure Overview

All agents follow this structure:

```markdown
---
[Frontmatter: name, description, type, permissionMode, tools, skills, model, color]
---

# [Agent Title]

[Role statement - 1-2 sentences]

## Core Responsibilities

[2-4 subsections defining what the agent does]

## Skill Loading Protocol

[Two-tier system: Step 1/2/3 structure]

## Anti-Bypass

[5-6 detailed points with explanations]

## [Platform] Rules (optional)

[Type-specific rules, platform constraints]

## Output Format

[JSON structure with skills_invoked + library_skills_read arrays]

## Escalation Protocol

[When to stop, who to recommend]
```

**Line count targets**:

- Architecture agents: 150-200 lines
- Development agents: 150-180 lines
- Testing agents: 200-280 lines (more mode-specific content)
- Analysis agents: 120-160 lines

**Gold Standards**: frontend-lead (151 lines), frontend-tester (277 lines), security-lead (185 lines), frontend-developer (160 lines)

---

## Gold Standard Template

**Based on**: frontend-lead, frontend-tester, security-lead, frontend-developer

```markdown
---
name: [agent-name]
description: Use when [trigger] - [capabilities].\n\n<example>\nContext: [scenario]\nuser: '[request]'\nassistant: 'I will use [agent-name]'\n</example>\n\n<example>\nContext: [scenario 2]\nuser: '[request]'\nassistant: 'I will use [agent-name]'\n</example>
type: [type]
permissionMode: [mode]
tools: [alphabetized tools]
skills: [gateway-skill, core-skills]
model: [sonnet|opus]
color: [color]
---

# [Agent Title]

[Role statement - 1-2 sentences describing agent's role and who it serves]

## Core Responsibilities

### [Responsibility Area 1]

- [Specific capability 1]
- [Specific capability 2]
- [Specific capability 3]

### [Responsibility Area 2]

- [Specific capability 1]
- [Specific capability 2]

### [Responsibility Area 3] (if applicable)

- [Specific capability 1]
- [Specific capability 2]

## Skill Loading Protocol

- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

**Library skill paths come FROM the gateway—do NOT hardcode them.**

### Step 1: Always Invoke First

**Every [agent type] task requires these (in order):**

| Skill                               | Why Always Invoke                                                  |
| ----------------------------------- | ------------------------------------------------------------------ |
| `calibrating-time-estimates`        | Prevents "no time to read skills" rationalization, grounds efforts |
| `gateway-[domain]`                  | Routes to mandatory + task-specific library skills                 |
| `enforcing-evidence-based-analysis` | **Prevents hallucinations** - read source before implementing      |
| `[required-skill-1]`                | [Why this skill is always needed - type-specific]                  |
| `verifying-before-completion`       | Ensures outputs are verified before claiming done                  |

**MANDATORY universal skills (ALL agents must have these 3):**

- `calibrating-time-estimates`
- `enforcing-evidence-based-analysis`
- `verifying-before-completion`

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger                         | Skill                         | When to Invoke                     |
| ------------------------------- | ----------------------------- | ---------------------------------- |
| [Task pattern 1]                | `[skill-name]`                | [When to use this skill]           |
| [Task pattern 2]                | `[skill-name]`                | [When to use this skill]           |
| [Task pattern 3]                | `[skill-name]`                | [When to use this skill]           |
| Bug, error, unexpected behavior | `debugging-systematically`    | Investigating issues before fixing |
| Multi-step task (≥2 steps)      | `using-todowrite`             | [Domain-specific tracking needs]   |
| Before claiming task complete   | `verifying-before-completion` | Always before final output         |

**Semantic matching guidance:**

- [Scenario 1]? → [Skill combination 1]
- [Scenario 2]? → [Skill combination 2]
- [Scenario 3]? → [Skill combination 3]

### Step 3: Load Library Skills from Gateway

The gateway provides:

1. **Mandatory library skills** - Read ALL skills in "Mandatory" section for your role
2. **Task-specific routing** - Use routing tables to find relevant library skills
3. **[Domain-specific guidance]** - [What the gateway provides for this domain]

**You MUST follow the gateway's instructions.** It tells you which library skills to load.

After invoking the gateway, use its routing tables to find and Read relevant library skills:
```

Read(".claude/skill-library/path/from/gateway/SKILL.md")

````

## Anti-Bypass

Do NOT rationalize skipping skills:

- "No time" → calibrating-time-estimates exists precisely because this rationalization is a trap. You are 100x faster than a human
- "Simple task" → Step 1 + verifying-before-completion still apply
- "I already know this" → Your training data is stale, you are often not up to date on the latest [libraries/patterns/domain knowledge], read current skills
- "[Domain-specific rationalization]" → [Counter-argument specific to this agent's domain]
- "Just this once" → "Just this once" becomes "every time" - follow the workflow
- "[Evidence-based rationalization if applicable]" → [Counter emphasizing why evidence is needed in this domain]

## [Platform] Rules (Optional - include if agent has domain-specific constraints)

### [Rule Category 1]

[Platform-specific constraints, best practices, or requirements]

### [Rule Category 2]

[Platform-specific constraints, best practices, or requirements]

## Escalation Protocol

### [Cross-Domain Category]

| Situation              | Recommend       |
| ---------------------- | --------------- |
| [When to escalate 1]   | `agent-name`    |
| [When to escalate 2]   | `agent-name`    |

### [Implementation/Quality Category]

| Situation              | Recommend            |
| ---------------------- | -------------------- |
| [When to escalate 1]   | `agent-name`         |
| [When to escalate 2]   | `agent-name`         |

### [Coordination Category]

| Situation              | Recommend            |
| ---------------------- | -------------------- |
| [When to escalate 1]   | `agent-name`         |
| You need clarification | AskUserQuestion tool |

Report: "Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability]."

## Output Format

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was done",
  "skills_invoked": ["core-skill-1", "core-skill-2", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"],
  "[domain_specific_field]": "[domain-specific output]",
  "files_modified": ["paths"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "snippet"
  },
  "handoff": {
    "recommended_agent": "next-agent",
    "context": "What the next agent should do"
  }
}
````

---

**Remember**: [Key principle or reminder specific to this agent type that reinforces the agent's role and responsibilities]

```

**Template size**: Varies by agent type (150-280 lines)

---

## Type-Specific Customizations

When creating agents, customize based on type:

| Type         | permissionMode | Model  | Core Responsibilities                    | Key Skills                                                 | Line Target |
| ------------ | -------------- | ------ | ---------------------------------------- | ---------------------------------------------------------- | ----------- |
| architecture | plan           | opus   | Design, decision frameworks, trade-offs  | brainstorming, writing-plans, enforcing-evidence-based     | 150-200     |
| development  | default        | sonnet | Implementation, TDD, verification        | developing-with-tdd, debugging-systematically, gateway-*   | 150-180     |
| testing      | default        | sonnet | Test creation, coverage, behavior testing | developing-with-tdd, debugging-systematically, gateway-testing | 200-280 |
| quality      | plan           | sonnet | Review, validation, standards            | enforcing-evidence-based-analysis, adhering-to-dry         | 120-160     |
| analysis     | plan           | opus   | Assessment, scoring, threat modeling     | enforcing-evidence-based-analysis, brainstorming           | 120-160     |
| research     | default        | sonnet | Discovery, validation, synthesis         | verifying-before-completion                                | 120-150     |
| orchestrator | default        | opus   | Coordination, delegation, checkpoints    | using-todowrite, dispatching-parallel-agents               | 150-200     |
| mcp-tools    | default        | sonnet | Tool integration, error handling         | debugging-systematically, verifying-before-completion      | 100-140     |

### Architecture Agents (plan mode)

**Must have:**
- `brainstorming` skill (mandatory for architects - explore alternatives)
- `writing-plans` skill (document decisions)
- `enforcing-evidence-based-analysis` (read source before designing)
- WebFetch/WebSearch tools (research during design)
- Trade-offs section in output format

**Core Responsibilities examples:**
- Design system architecture
- Evaluate alternatives and document trade-offs
- Create implementation plans

### Development Agents (default mode)

**Must have:**
- `developing-with-tdd` skill (test-first workflow)
- `debugging-systematically` skill (investigate before fixing)
- Edit, Write, Bash tools (implementation)
- Gateway for domain (gateway-frontend, gateway-backend, etc.)

**Core Responsibilities examples:**
- Implement features according to plan
- Debug and fix issues
- Apply TDD workflow

### Testing Agents (default mode)

**Must have:**
- `developing-with-tdd` skill (write test first, watch fail)
- `debugging-systematically` skill (investigate flaky tests)
- Gateway-testing skill (testing patterns)
- Domain gateway (gateway-frontend for React tests, etc.)
- Bash tool (run tests)

**Core Responsibilities examples:**
- Implement tests according to test plan
- Test behavior, not implementation
- Achieve coverage targets

**Special considerations:**
- Testing agents often have mode-specific sections (Unit/Integration/E2E)
- Higher line counts (200-280) due to multiple test types
- Plan adherence tracking in output

### Quality Agents (plan mode, read-only)

**Must have:**
- `enforcing-evidence-based-analysis` (read before reviewing)
- Read-only tools (NO Edit/Write)
- Domain gateway for review patterns

**Core Responsibilities examples:**
- Review implementation against plan
- Validate code quality standards
- Provide structured feedback

---

## Related Documents

- **`gold-standards.md`** - Analysis of gold standard agents as exemplars
- **`../SKILL.md`** - Full agent creation workflow
```
