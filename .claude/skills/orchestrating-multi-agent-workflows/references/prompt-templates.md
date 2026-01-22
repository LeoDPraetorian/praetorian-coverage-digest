# Prompt Templates

**Agent prompt templates for orchestrated workflows.**

Templates define how orchestrators communicate with specialized agents. This file provides the generic structure; domain orchestrations provide specific templates in their `references/prompts/` directories.

---

## Template Index (Generic)

| Template              | Used In Phase  | Agent Type   | Purpose                                 |
| --------------------- | -------------- | ------------ | --------------------------------------- |
| `explore-prompt.md`   | Discovery      | Explore      | Codebase analysis and pattern detection |
| `architect-prompt.md` | Architecture   | \*-lead      | Design decisions and technical planning |
| `developer-prompt.md` | Implementation | \*-developer | Code implementation                     |
| `reviewer-prompt.md`  | Verification   | \*-reviewer  | Spec compliance and quality review      |
| `tester-prompt.md`    | Testing        | \*-tester    | Test implementation                     |
| `test-lead-prompt.md` | Test Planning  | test-lead    | Test strategy and validation            |

**Domain orchestrations extend this** with domain-specific templates (e.g., `p0-validator-prompt.md`, `security-prompt.md`).

---

## Template Requirements

Each prompt template MUST include these sections:

### 1. OUTPUT_DIRECTORY

Path from Phase 1 setup where agent writes outputs:

```markdown
OUTPUT_DIRECTORY: {OUTPUT_DIR from Phase 1}
```

### 2. MANDATORY SKILLS

Skills the agent must invoke before starting work:

| Skill                         | Required For                |
| ----------------------------- | --------------------------- |
| `persisting-agent-outputs`    | All agents                  |
| `gateway-{domain}`            | Domain-specific agents      |
| `developing-with-tdd`         | Developer, tester agents    |
| `verifying-before-completion` | All agents before returning |

**Format in prompt:**

```markdown
## MANDATORY SKILLS

You MUST invoke these skills before starting:

1. `persisting-agent-outputs` - For output format and MANIFEST updates
2. `gateway-{domain}` - For domain-specific patterns
```

### 3. INPUT FILES

Context files from previous phases that agent must read:

```markdown
## INPUT FILES

Read these files before starting:

- design.md (from Phase 2/Brainstorming)
- architecture.md (from Phase 7/Architecture)
- {previous-phase-output}.md
```

### 4. OUTPUT FILES

Expected deliverables with descriptions:

```markdown
## OUTPUT FILES

Create these files in OUTPUT_DIRECTORY:

- implementation-log.md: Progress log with decisions
- {deliverable}.{ext}: Primary deliverable
```

### 5. COMPLIANCE

Instruction to document skill invocations:

```markdown
## COMPLIANCE

Document all invoked skills in your output metadata:

- skills_invoked: [list of core skills]
- library_skills_read: [list of library skill paths]
```

---

## Agent Output Schema

ALL agent prompts MUST include the output schema from [agent-output-validation.md](agent-output-validation.md):

**Required fields in agent response:**

- `agent`: Agent type
- `task`: Original task description
- `skills_invoked`: Array of core skill names
- `library_skills_read`: Array of library skill file paths
- `files_modified`: Array of file paths
- `status`: 'complete' | 'blocked' | 'needs_review'

Orchestrator MUST verify this schema before marking any phase complete.

---

## Prompt Structure Template

```markdown
# {Agent Type} Prompt - Phase {N}

## Task

{Clear objective - what to accomplish}

## OUTPUT_DIRECTORY

{path}

## MANDATORY SKILLS

{list with purposes}

## INPUT FILES

{files to read with descriptions}

## Context from Prior Phases

- {Key decision 1}
- {Key decision 2}
- {Relevant constraints}

## Scope

**DO:** {what agent should do}
**DO NOT:** {what agent should NOT do}

## Expected Output

{deliverable descriptions}

## Output Format

{JSON schema for structured return}
```

---

## Library Skills Reference

Prompts should reference these library skills for domain-specific patterns:

| Skill                           | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `orchestration-prompt-patterns` | Prompt engineering patterns for agent communication     |
| Domain gateway skills           | Domain-specific patterns (e.g., `gateway-integrations`) |

Prompt templates implement patterns from `orchestration-prompt-patterns`.

---

## Context Awareness in Prompts

### Token Thresholds

Before spawning agents, check current token usage:

| Threshold | Action                                            |
| --------- | ------------------------------------------------- |
| <75%      | Proceed normally                                  |
| 75-80%    | SHOULD compact - proactive compaction recommended |
| 80-85%    | MUST compact - compact NOW before spawning        |
| >85%      | Hook BLOCKS agent spawning until /compact         |

**See:** [context-monitoring.md](context-monitoring.md) for measurement.

### Agent Prompt Context Size

Keep agent prompts focused:

| Agent Type   | Max Context | Include                          | Exclude               |
| ------------ | ----------- | -------------------------------- | --------------------- |
| Architecture | 2000 tokens | Requirements, constraints        | Full discovery output |
| Developer    | 3000 tokens | Architecture summary, file paths | Other domain details  |
| Reviewer     | 2000 tokens | Plan, implementation files       | Discovery, rationale  |
| Tester       | 2000 tokens | Test plan, file locations        | Implementation logs   |

### Fresh Agent Principle

Each `Task()` spawns a NEW agent instance:

- No context pollution from previous agents
- Include ALL necessary context in the prompt
- Reference files instead of inlining content
- Never ask agent to "continue" previous work

---

## Creating Domain-Specific Templates

When adding templates to a domain orchestration:

1. Copy generic template structure from this file
2. Add domain-specific sections (P0 requirements, quality standards, etc.)
3. Add to domain's `references/prompts/` directory
4. Update domain's prompt-templates.md index (if exists)
5. Test with a sample workflow

---

## Related References

- [agent-output-validation.md](agent-output-validation.md) - Output schema validation
- [delegation-templates.md](delegation-templates.md) - Task delegation patterns
- [agent-handoffs.md](agent-handoffs.md) - Blocked status and handoff protocol
- [context-monitoring.md](context-monitoring.md) - Token measurement
