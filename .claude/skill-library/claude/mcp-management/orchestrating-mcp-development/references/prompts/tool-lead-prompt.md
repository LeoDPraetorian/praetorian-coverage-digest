# MCP Tool Lead Prompt Template

Use this template when dispatching tool-lead subagents in Phase 5 (Architecture).

## Usage

```typescript
Task({
  subagent_type: "tool-lead",
  description: "Design architecture for MCP wrapper [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing: Architecture for MCP Wrapper {SERVICE}/{TOOL}

## Task Description

Design the architecture for a TypeScript MCP wrapper that optimizes token usage while maintaining security and correctness.

Service: {SERVICE}
Tool: {TOOL}
Schema Discovery: {PASTE schema-discovery.md content}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your architecture to: `{OUTPUT_DIRECTORY}/{TOOL}/architecture.md`

## File Locking Protocol (Phase 5 Only)

**CRITICAL FOR PHASE 3 SHARED ARCHITECTURE**: When updating MANIFEST.yaml, use lock protocol to prevent race conditions with security-lead agent.

Your exclusive file: `architecture-shared.md` (write freely)
Shared file: `MANIFEST.yaml` (use lock protocol below)

### Lock Protocol for MANIFEST.yaml

1. Before writing MANIFEST.yaml:

   ```bash
   LOCK_FILE="$OUTPUT_DIR/locks/manifest.lock"
   MAX_WAIT=60  # seconds
   ELAPSED=0

   while [ -f "$LOCK_FILE" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
     sleep 1
     ELAPSED=$((ELAPSED + 1))
   done

   if [ $ELAPSED -ge $MAX_WAIT ]; then
     echo "Lock timeout on MANIFEST.yaml. Another agent may be stuck."
     exit 1
   fi

   echo "$$@$(date +%s)" > "$LOCK_FILE"
   ```

2. Update MANIFEST.yaml (you now hold the lock)

3. After writing, release lock:
   ```bash
   rm -f "$LOCK_FILE"
   ```

**CRITICAL:** Always release lock, even if errors occur. Use trap for cleanup.

**See:** [file-locking-phase3.md](../file-locking-phase3.md) for complete protocol details, conflict resolution, and verification steps.

## MANDATORY SKILLS (invoke ALL via Read tool before designing)

You MUST load these skills before starting architecture design:

1. **designing-progressive-loading-wrappers** (.claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md)
2. **optimizing-llm-api-responses** (.claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md)
3. **implementing-result-either-pattern** (.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md)
4. **validating-with-zod-schemas** (.claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md)
5. **implementing-retry-with-backoff** (.claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md)
6. **sanitizing-inputs-securely** (.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md)
7. **structuring-hexagonal-typescript** (.claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md)

## STEP 0: Clarification (MANDATORY)

**Before ANY architecture design**, review the schema discovery document and identify gaps using progressive disclosure:

### Level 1: Scope Verification

"My understanding of scope: Design architecture.md covering token optimization, response filtering, error handling, validation, and security for {SERVICE}/{TOOL} wrapper"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Discovery Analysis Verification

"Discovery analysis findings:

- Original response size: {X} tokens
- Target token reduction: ≥80% (target: {Y} tokens)
- Fields to include: {list essential fields}
- Fields to filter: {list verbose fields}
- Required inputs: {list input parameters}
- Optional inputs: {list optional parameters}"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Decision Points Identification

"Architecture decisions I need to make:

1. Token optimization strategy: {approach}
2. Response filtering rules: {which fields to keep/remove}
3. Error handling pattern: Result<T, E> or throw?
4. Retry strategy: Retry on timeout? How many attempts?
5. Validation approach: Zod schemas for input/output
6. Security: Which inputs need sanitization?"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Alternative Perspectives

"I will verify my decisions by:

1. Considering alternative approaches for each decision
2. Evaluating trade-offs explicitly
3. Documenting why I chose one approach over another
4. Checking for consistency across all decisions"

If clear: Begin architecture design

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|discovery|decisions|alternatives",
  "verified_so_far": ["Items I'm confident about"],
  "questions": [
    {
      "category": "requirement|dependency|scope|assumption",
      "question": "Specific question text",
      "options": ["Option A", "Option B", "Option C"],
      "default_assumption": "What I'll assume if no answer",
      "impact": "What happens if this assumption is wrong"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the schema discovery document and have no clarifying questions.

My understanding:

- Original response: {X} tokens
- Target response: {Y} tokens ({Z}% reduction)
- Essential fields: {list}
- Filtering strategy: {approach}
- Error handling: Result<T, E> pattern
- Security: Sanitize all user inputs

Proceeding with architecture design."

### DO NOT

- Assume token counts without referencing discovery doc
- Make filtering decisions without justification
- Skip alternative analysis for each decision
- Proceed if discovery doc is incomplete or unclear

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Analyze schema discovery document**
   - Identify token counts (original and target)
   - List essential vs verbose fields
   - Map input parameters

2. **Make architecture decisions using chain-of-thought**
   - For EACH decision: state problem, list options, analyze trade-offs, recommend with reasoning
   - Use self-consistency: verify decisions from alternative perspective
   - See [tool-lead-examples.md](tool-lead-examples.md) for decision chain templates

3. **Document architecture in architecture.md**
   - Token optimization strategy
   - Response filtering rules
   - Error handling pattern
   - Zod schema designs
   - Security validation layers
   - Implementation checklist

4. **Self-review before reporting back**
   - See [tool-lead-requirements.md](tool-lead-requirements.md) for self-review checklist

## Architecture Decision Chain-of-Thought Pattern

For EACH significant decision, follow this chain:

### Decision Chain Template

#### Step 1: State the decision point

"Decision: {What needs to be decided}"

#### Step 2: List constraints from requirements

- Constraint 1: {from discovery or security requirements}
- Constraint 2: {from discovery or security requirements}
- Constraint 3: {from discovery or security requirements}

#### Step 3: Enumerate options (minimum 2)

**Option A**: {Description}
**Option B**: {Description}
**Option C**: {Description} (if applicable)

#### Step 4: Analyze each option against constraints

**Option A - {Name}**:

- Constraint 1: ✓/✗ {How it satisfies or fails}
- Constraint 2: ✓/✗ {How it satisfies or fails}
- Constraint 3: ✓/✗ {How it satisfies or fails}
- Additional: {Other considerations}

**Option B - {Name}**:

- Constraint 1: ✓/✗ {How it satisfies or fails}
- Constraint 2: ✓/✗ {How it satisfies or fails}
- Constraint 3: ✓/✗ {How it satisfies or fails}
- Additional: {Other considerations}

#### Step 5: Recommend with explicit reasoning

"Recommendation: Option {X}

Reasoning:

1. {Why it meets constraints best}
2. {Additional benefits}
3. {Trade-offs accepted}

What would change this: {Conditions that would favor different option}"

---

## References

- [Decision Chain Examples](tool-lead-examples.md) - Token optimization, error handling, response filtering examples
- [Architecture Requirements](tool-lead-requirements.md) - Document requirements, self-review checklist, output format

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "tool-lead",
  "output_type": "architecture",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "designing-progressive-loading-wrappers",
    "optimizing-llm-api-responses",
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "implementing-retry-with-backoff",
    "sanitizing-inputs-securely",
    "structuring-hexagonal-typescript"
  ],
  "status": "complete",
  "files_created": ["{OUTPUT_DIRECTORY}/{TOOL}/architecture.md"],
  "files_modified": [],
  "architecture_decisions": {
    "token_optimization": "Field-based filtering",
    "error_handling": "Result<T, E> pattern",
    "validation": "Zod schemas",
    "security": "Three-layer validation"
  },
  "token_targets": {
    "original": 2347,
    "target": 450,
    "reduction_pct": 81
  },
  "handoff": {
    "next_agent": "tool-tester",
    "context": "Architecture complete with 81% token reduction target, ready for test planning"
  }
}
```

## If Blocked

If you cannot complete this task, return blocked status with questions.

See [tool-lead-requirements.md](tool-lead-requirements.md) for blocked format template.
````
