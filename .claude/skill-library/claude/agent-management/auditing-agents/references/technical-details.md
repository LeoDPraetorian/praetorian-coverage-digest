## Technical Details

### What CLI Checks

#### Critical Checks (Always Run)

These checks are **mandatory** and will cause audit failure if violated:

**1. Block Scalar Detection:**

```typescript
const pipePattern = /^description:\s*\|[-+]?\s*$/m;
const foldedPattern = /^description:\s*>[-+]?\s*$/m;
```

Detects YAML block scalars that break agent discovery.

**2. Description Validation:**

- Field exists in frontmatter
- Field has content (not empty string)
- Field is readable

**3. Name Consistency:**

- Frontmatter `name:` field
- Filename (without `.md` extension)
- Must match exactly (case-sensitive)

#### Extended Structural Checks (Recommended)

These checks verify agent file format and quality standards. Most are **warnings** except line count which **fails** audit:

**4. Description Trigger (Warning):**

- Description starts with "Use when" pattern
- Helps Claude match user intent to agent purpose
- **Status:** Warning if missing

**5. Has Examples (Warning):**

- Description contains `<example>` blocks
- Improves agent selection accuracy
- **Status:** Warning if missing

**6. Line Count (Failure):**

- Most agents: ≤300 lines
- Architecture/orchestrator: ≤400 lines
- Enforces lean agent pattern (delegate to skills)
- **Status:** Fails audit if exceeded

**7. Gateway Skill (Warning):**

- Has `gateway-*` skill in frontmatter for relevant agent types
- Examples: `gateway-frontend`, `gateway-backend`, `gateway-testing`
- Enables progressive skill loading
- **Status:** Warning if missing for development/testing agents

**8. Output Format (Warning):**

- Has "Output Format" section in body
- Defines standardized JSON response structure
- **Status:** Warning if missing

**9. Escalation Protocol (Warning):**

- Has "Escalation Protocol" section in body
- Defines when to stop and which agent to recommend
- **Status:** Warning if missing

**10. Explicit Skill Invocation - Phase 9 (Warning):**

- **What it checks:** Agents with `skills:` in frontmatter enforce explicit skill invocation
- **Distinction from Phase 4:** Phase 4 validates `skills:` frontmatter exists (availability); Phase 9 validates body enforces invocation (usage)
- **Requirements:**
  1. `EXTREMELY_IMPORTANT` block at top of agent prompt (after frontmatter, before role statement)
  2. "You MUST explicitly invoke" absolute language for each mandatory skill
  3. Explicit invocation syntax shown (e.g., `skill: "debugging-systematically"`)
  4. Anti-rationalization patterns listed (based on obra/superpowers)
  5. Validation warning about consequences if not invoked
- **Status:** Warning if missing for agents with mandatory skills
- **Why:** Agents bypass mandatory skills ~80% of the time without explicit enforcement. Having `skills:` in frontmatter makes skills available but does NOT auto-invoke them.
- **Testing:** Fresh session required (agent metadata caches at session start). Test should show explicit skill invocation in agent output (process compliance), not just behavioral compliance.

### Exit Codes

| Code | Meaning           | Action                          |
| ---- | ----------------- | ------------------------------- |
| 0    | All checks passed | Proceed with commit             |
| 1    | Issues found      | Fix issues and re-audit         |
| 2    | Tool error        | Check agent exists, verify path |

---
