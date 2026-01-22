# Security Lead Prompt Template

Use this template when dispatching security-lead subagents in Phase 5 (Architecture - parallel with tool-lead).

## Usage

```typescript
Task({
  subagent_type: "security-lead",
  description: "Assess security for MCP wrapper [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are assessing: Security for MCP Wrapper {SERVICE}/{TOOL}

## Task Description

Perform security assessment for an MCP wrapper, identifying attack surfaces, vulnerabilities, and required protections.

Service: {SERVICE}
Tool: {TOOL}
Schema Discovery: {PASTE schema-discovery.md content}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your assessment to: `{OUTPUT_DIRECTORY}/{TOOL}/security-assessment.md`

## File Locking Protocol (Phase 5 Only)

**CRITICAL FOR PHASE 3 SHARED ARCHITECTURE**: When updating MANIFEST.yaml, use lock protocol to prevent race conditions with tool-lead agent.

Your exclusive file: `security-assessment.md` (write freely)
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

## MANDATORY SKILLS (invoke via Read tool before assessing)

You MUST load this skill before starting security assessment:

1. **sanitizing-inputs-securely** (.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md)

## STEP 0: Clarification (MANDATORY)

**Before ANY security assessment**, review the schema discovery and identify security concerns using progressive disclosure:

### Level 1: Scope Verification

"My understanding of scope: Assess security for {SERVICE}/{TOOL} wrapper, identifying input validation requirements, output sanitization needs, and attack vectors"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Attack Surface Identification

"Attack surfaces I've identified:

- User-controlled inputs: {list input parameters from schema}
- External API calls: {MCP tool being called}
- Response data: {fields returned to user}
- Error messages: {what errors could leak information}"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Threat Categorization

"Threat categories for this wrapper:

- Input validation: {types of malicious inputs possible}
- Injection attacks: {command injection, XSS, SQL injection if applicable}
- Path traversal: {if file paths are inputs}
- Data exposure: {sensitive data in responses or errors}
- Authentication: {if auth tokens are handled}
- Rate limiting: {DoS potential}"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Control Requirements

"Security controls needed:

- Input sanitization: {which inputs, what to block}
- Output filtering: {which fields, what to sanitize}
- Validation: {Zod schema constraints}
- Error handling: {safe error messages}
- Rate limiting: {if needed}"

If clear: Begin security assessment

---

### If You Have Questions

Return immediately with structured JSON - see [security-lead-examples.md](security-lead-examples.md) for format

### If No Questions

State explicitly:

"I have reviewed the schema discovery document and have no clarifying questions.

My understanding:

- Assess security for {SERVICE}/{TOOL} wrapper
- Identify input validation requirements
- Define output sanitization needs
- Document attack vectors and mitigations

Proceeding with security assessment."

### DO NOT

- Assume security requirements without analyzing schema
- Skip threat analysis for any input
- Proceed if attack surface is unclear
- Make security decisions without justification

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Analyze attack surfaces**
   - Identify all user-controlled inputs
   - Map data flows from input to output
   - See [security-lead-examples.md](security-lead-examples.md) for chain-of-thought patterns

2. **Perform threat modeling**
   - Use security assessment chain-of-thought for each input/output
   - Document likelihood and impact for each threat
   - Define required controls

3. **Document security assessment**
   - Input validation requirements
   - Output sanitization needs
   - Attack vectors and mitigations
   - Security checklist for implementation

4. **Self-review before reporting back**

## Security Assessment Categories

Brief overview - see [security-lead-examples.md](security-lead-examples.md) for complete patterns:

1. **Input Validation** - Analyze all inputs for injection/traversal/XSS threats
2. **Output Sanitization** - Identify sensitive fields, user-generated content
3. **Authentication/Authorization** - Assess auth token handling
4. **Data Exposure** - Check for PII, credentials in responses/errors
5. **Rate Limiting** - Assess DoS potential
6. **Error Handling** - Ensure errors don't leak sensitive information

## References

- [Security Assessment Examples](security-lead-examples.md) - Chain-of-thought patterns, threat model, checklist
- [Sanitization Patterns](../../../../../../skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md) - Input sanitization skill

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "security-lead",
  "output_type": "security_assessment",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": ["sanitizing-inputs-securely"],
  "status": "complete",
  "files_created": ["{OUTPUT_DIRECTORY}/{TOOL}/security-assessment.md"],
  "files_modified": [],
  "threat_summary": {
    "critical_threats": 0,
    "high_threats": 1,
    "medium_threats": 2,
    "low_threats": 1
  },
  "controls_required": {
    "input_validation": true,
    "input_sanitization": true,
    "output_filtering": true,
    "safe_error_messages": true,
    "rate_limiting": false
  },
  "handoff": {
    "next_agent": "tool-developer",
    "context": "Security assessment complete, identified 4 threat categories with required controls"
  }
}
```

## If Blocked

If you cannot complete this task, return blocked status with questions.

See [security-lead-examples.md](security-lead-examples.md) for blocked format template.
````
