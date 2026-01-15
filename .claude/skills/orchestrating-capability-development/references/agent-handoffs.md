# Agent Handoffs

Structured JSON format for passing context between capability development phases.

## Purpose

Enable clean coordination between phases by:

- Standardizing agent output format
- Providing context for next phase
- Tracking completion status
- Handling blocked states

## Standard Handoff Format

All Task agents **MUST** follow the `persisting-agent-outputs` skill for output format.

The metadata JSON block at the end of each agent output file serves as the handoff:

```json
{
  "agent": "capability-developer",
  "output_type": "implementation",
  "timestamp": "2026-01-04T15:00:00Z",
  "capability_directory": ".claude/.output/capabilities/...",
  "capability_type": "vql|nuclei|janus|fingerprintx|scanner",
  "skills_invoked": ["persisting-agent-outputs", "gateway-capabilities", "gateway-backend"],
  "library_skills_read": [],
  "source_files_verified": ["modules/chariot-aegis-capabilities/vql/s3-exposure.vql"],
  "status": "complete|blocked|needs_review",
  "blocked_reason": "security_concern|architecture_decision|missing_requirements|test_failures|out_of_scope|unknown",
  "attempted": ["What agent tried before blocking"],
  "handoff": {
    "next_agent": "capability-reviewer|null",
    "context": "Key information for next phase"
  }
}
```

**Key rules:**

- When `status` is `blocked`: include `blocked_reason` and `attempted`
- When `status` is `blocked`: set `handoff.next_agent` to `null` (orchestrator decides routing)
- When `status` is `complete`: `handoff.next_agent` can suggest next phase agent

See `persisting-agent-outputs` skill for complete field definitions.

## Field Descriptions

### status

| Value          | When to Use                                                |
| -------------- | ---------------------------------------------------------- |
| `complete`     | All work finished successfully, ready for next phase       |
| `blocked`      | Cannot proceed - include `blocked_reason` and `attempted`  |
| `needs_review` | Work complete but requires user approval before next phase |

### blocked_reason (required when status=blocked)

| Value                   | When to Use                                | Routing (via orchestrating-multi-agent-workflows) |
| ----------------------- | ------------------------------------------ | ------------------------------------------------- |
| `security_concern`      | Security issue needs security agent review | → security-lead                                   |
| `architecture_decision` | Design decision needs lead agent input     | → capability-lead                                 |
| `missing_requirements`  | Cannot proceed without more information    | → AskUserQuestion                                 |
| `test_failures`         | Tests failing, needs debugging             | → capability-tester                               |
| `out_of_scope`          | Task exceeds agent's domain                | → AskUserQuestion                                 |
| `unknown`               | Blocker doesn't fit other categories       | → AskUserQuestion                                 |

The orchestrator uses `orchestrating-multi-agent-workflows` skill's agent routing table to determine next steps based on `blocked_reason`.

## Example Handoffs

### Phase 1 (Brainstorming) → Phase 3 (Discovery)

```json
{
  "agent": "brainstorming",
  "phase": "brainstorming",
  "status": "complete",
  "summary": "Refined VQL capability design for S3 bucket exposure detection",
  "output_file": "design.md",
  "handoff": {
    "next_phase": "discovery",
    "next_agent": "Explore",
    "context": "VQL capability for detecting S3 credentials in files. Search for similar VQL capabilities that parse files for credentials or cloud provider patterns. Focus on artifact collection patterns and regex matching. Use very thorough mode."
  }
}
```

### Phase 3 (Discovery) → Phase 4 (Architecture)

```json
{
  "agent": "Explore",
  "phase": "discovery",
  "status": "complete",
  "summary": "Found 3 similar VQL capabilities (60% reusable) with file parsing patterns",
  "output_file": "discovery.md",
  "handoff": {
    "next_phase": "architecture",
    "next_agent": "capability-lead",
    "context": "Discovered reusable patterns: VQL file collection (modules/chariot-aegis-capabilities/vql/file-parser.vql), regex credential matching (cred-scanner.vql). Recommend extending file-parser pattern with S3-specific regex. 60% reuse, 40% new detection logic."
  }
}
```

### Phase 4 (Architecture) → Phase 5 (Implementation)

```json
{
  "agent": "capability-lead",
  "phase": "architecture",
  "status": "complete",
  "summary": "Designed VQL capability with file collection, regex matching, and S3 credential validation",
  "output_file": "architecture.md",
  "artifacts": ["architecture.md"],
  "verification": {
    "patterns_referenced": true,
    "decisions_documented": true,
    "edge_cases_addressed": true
  },
  "handoff": {
    "next_phase": "implementation",
    "next_agent": "capability-developer",
    "context": "Implement VQL capability using file-parser.vql pattern as base. Query structure: (1) Collect files matching *.config, *.env, *.json (2) Apply regex for AWS access keys (3) Validate S3 bucket accessibility. Edge cases: large files (>100MB), binary files, permission denied. Output: JSON artifacts with file path, matched credentials, validation status."
  }
}
```

### Phase 5 (Implementation) → Phase 7 (Review)

```json
{
  "agent": "capability-developer",
  "phase": "implementation",
  "status": "complete",
  "summary": "Implemented VQL capability with file collection, S3 credential detection, and validation logic",
  "files_modified": ["modules/chariot-aegis-capabilities/vql/s3-bucket-exposure.vql"],
  "output_file": "implementation-log.md",
  "handoff": {
    "next_phase": "review",
    "next_agent": "capability-reviewer",
    "context": "VQL capability implemented at modules/chariot-aegis-capabilities/vql/s3-bucket-exposure.vql. Key logic: file collection (*.config, *.env, *.json), regex matching (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), S3 bucket validation via boto3. Edge cases handled: large file skipping (>100MB), binary file filtering, permission errors logged. Ready for review against architecture.md."
  }
}
```

### Phase 7 (Review) → Phase 8 (Testing)

```json
{
  "agent": "capability-reviewer",
  "phase": "review",
  "status": "complete",
  "summary": "Implementation approved. Matches architecture plan, quality standards met.",
  "output_file": "review.md",
  "handoff": {
    "next_phase": "testing",
    "next_agent": "test-lead",
    "context": "VQL capability approved. Detection logic: file → regex → validation. Critical test cases: (1) Valid S3 credentials in .env file (2) False positive: non-AWS keys (3) Edge case: >100MB file skipped (4) Permission denied handling. Target coverage: 85%, detection accuracy: 95%, false positive rate: <5%."
  }
}
```

### Blocked Handoff (Implementation)

```json
{
  "agent": "capability-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2026-01-04T15:00:00Z",
  "capability_directory": ".claude/.output/capabilities/20260104-143000-s3-exposure",
  "capability_type": "vql",
  "skills_invoked": ["persisting-agent-outputs", "gateway-capabilities"],
  "status": "blocked",
  "blocked_reason": "architecture_decision",
  "attempted": [
    "Tried implementing S3 bucket validation via boto3",
    "Encountered issue: VQL cannot import Python libraries",
    "Searched for alternative validation approaches"
  ],
  "handoff": {
    "next_agent": null,
    "context": "Cannot implement S3 bucket validation in VQL. VQL does not support Python imports. Need architecture decision: (1) Remove validation requirement (2) Use external validator tool (3) Switch to Janus tool chain with Python component."
  }
}
```

Note: `handoff.next_agent` is `null` because the orchestrator determines routing using the agent routing table from `orchestrating-multi-agent-workflows`. For `architecture_decision` blocker, route to capability-lead.

## Handling Handoffs

### On Receiving Handoff

```typescript
// Read handoff from previous agent
const handoff = previousAgentResult.handoff;

// Check status
if (previousAgentResult.status === "blocked") {
  console.log("Previous phase blocked:");
  console.log(`Reason: ${previousAgentResult.blocked_reason}`);
  console.log(`Attempted: ${previousAgentResult.attempted.join(", ")}`);

  // Route based on blocked_reason using orchestrating-multi-agent-workflows routing table
  const nextAgent = routeBlockedAgent(previousAgentResult.blocked_reason);
  // Invoke appropriate agent
}

// Use context in next agent prompt
const nextAgentPrompt = `
  ${basePrompt}

  CONTEXT FROM ${previousAgentResult.phase.toUpperCase()} PHASE:
  ${handoff.context}

  FILES MODIFIED:
  ${previousAgentResult.files_modified.join("\n")}
`;
```

### Validating Handoffs

```typescript
function validateHandoff(handoff: AgentHandoff): boolean {
  // Required fields
  if (!handoff.status) return false;
  if (!handoff.phase) return false;
  if (!handoff.summary) return false;

  // Context required unless status is complete at end
  if (handoff.handoff.next_phase !== "complete" && !handoff.handoff.context) {
    return false;
  }

  // Blocked reason and attempted required if status is blocked
  if (handoff.status === "blocked") {
    if (!handoff.blocked_reason) return false;
    if (!handoff.attempted || handoff.attempted.length === 0) return false;
  }

  return true;
}
```

## Related References

- [persisting-agent-outputs](../../persisting-agent-outputs/SKILL.md) - Complete metadata format
- [orchestrating-multi-agent-workflows](../../orchestrating-multi-agent-workflows/SKILL.md) - Agent routing table for blocked status
- [Phase 4: Architecture](phase-4-architecture.md) - Architect handoffs
- [Phase 5: Implementation](phase-5-implementation.md) - Developer handoffs
- [Phase 7: Review](phase-7-review.md) - Reviewer handoffs
- [Phase 8: Testing](phase-8-testing.md) - Test engineer handoffs
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
