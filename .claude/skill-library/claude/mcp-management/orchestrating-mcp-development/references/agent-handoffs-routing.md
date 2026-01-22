# Agent Handoff Handling & Validation

Routing logic and validation patterns for processing agent handoffs.

## Handling Handoffs

### On Receiving Handoff

```typescript
// Read handoff from previous agent
const handoff = previousAgentResult.handoff;

// Check status
if (previousAgentResult.status === "blocked") {
  console.log("Previous phase blocked:");
  console.log(`Reason: ${previousAgentResult.blocked_reason}`);
  console.log("Attempted solutions:");
  previousAgentResult.attempted.forEach((a) => console.log(`- ${a}`));

  handoff.blockers.forEach((b) => console.log(`- ${b.description}`));

  // Route to appropriate agent using orchestrating-multi-agent-workflows skill
  const nextAgent = routeBlockedAgent(previousAgentResult.blocked_reason);
  await spawnRecoveryAgent(nextAgent, handoff);
}

// Use context in next agent prompt
const nextAgentPrompt = `
  ${basePrompt}

  CONTEXT FROM ${previousAgentResult.phase.toUpperCase()} PHASE:
  ${handoff.context}

  FILES MODIFIED:
  ${previousAgentResult.files_modified.join("\n")}

  ARTIFACTS TO REFERENCE:
  ${previousAgentResult.artifacts.join("\n")}
`;
```

## Validating Handoffs

```typescript
function validateHandoff(handoff: AgentHandoff): boolean {
  // Required fields
  if (!handoff.status) return false;
  if (!handoff.phase) return false;
  if (!handoff.summary) return false;

  // Blocked-specific validation
  if (handoff.status === "blocked") {
    if (!handoff.blocked_reason) return false;
    if (!handoff.attempted || handoff.attempted.length === 0) return false;
    if (handoff.handoff.next_agent !== null) return false; // Must be null when blocked
    if (!handoff.handoff.blockers || handoff.handoff.blockers.length === 0) return false;
  }

  // Context required unless status is complete at end
  if (handoff.handoff.next_phase !== "complete" && !handoff.handoff.context) {
    return false;
  }

  return true;
}
```

## Blocked Agent Routing

When `status: "blocked"`, the orchestrator uses the `orchestrating-multi-agent-workflows` skill's routing table (lines 166-172) to determine next agent based on `blocked_reason`:

### Routing Table

| blocked_reason            | Route To         | Purpose                                     |
| ------------------------- | ---------------- | ------------------------------------------- |
| `security_concern`        | `security-lead`  | Security expert reviews concern             |
| `architecture_decision`   | `tool-lead`      | Lead architect makes design decision        |
| `missing_requirements`    | Ask user         | Gather missing information from user        |
| `test_failures`           | `tool-tester`    | Test expert debugs failing tests            |
| `out_of_scope`            | Escalate to user | Task exceeds current workflow scope         |
| `schema_discovery_failed` | Ask user         | Manual intervention or alternative approach |
| `unknown`                 | Escalate to user | Unknown blocker requires human judgment     |

### Routing Implementation

```typescript
function routeBlockedAgent(blocked_reason: string): string | "user" {
  const routing = {
    security_concern: "security-lead",
    architecture_decision: "tool-lead",
    missing_requirements: "user",
    test_failures: "tool-tester",
    out_of_scope: "user",
    schema_discovery_failed: "user",
    unknown: "user",
  };

  return routing[blocked_reason] || "user";
}
```

### Recovery Patterns

#### Security Concern → Security Lead

```typescript
if (blocked_reason === "security_concern") {
  await Task({
    subagent_type: "security-lead",
    prompt: `
      Review security concern from ${previousAgent}:

      Blocker: ${handoff.blockers[0].description}
      Context: ${handoff.context}

      Attempted solutions:
      ${previousAgentResult.attempted.join("\n")}

      Provide security assessment and recommended approach.
    `,
  });
}
```

#### Architecture Decision → Tool Lead

```typescript
if (blocked_reason === "architecture_decision") {
  await Task({
    subagent_type: "tool-lead",
    prompt: `
      Make architecture decision for blocked agent:

      Decision needed: ${handoff.blockers[0].description}
      Options considered: ${previousAgentResult.attempted.join(", ")}

      Context: ${handoff.context}

      Decide on approach and update architecture document.
    `,
  });
}
```

#### Test Failures → Tool Tester

```typescript
if (blocked_reason === "test_failures") {
  await Task({
    subagent_type: "tool-tester",
    prompt: `
      Debug failing tests from tool-developer:

      Test failures: ${handoff.verification.command_output}

      Implementation: [attach implementation file]
      Architecture: [attach architecture file]

      Attempted fixes:
      ${previousAgentResult.attempted.join("\n")}

      Debug test failures and provide guidance.
    `,
  });
}
```

#### Missing Requirements → Ask User

```typescript
if (blocked_reason === "missing_requirements") {
  const answer = await AskUserQuestion({
    questions: [
      {
        header: "Missing Requirements",
        question: handoff.blockers[0].description,
        type: "text",
      },
    ],
  });

  // Resume workflow with user's answer
  await resumeWorkflow(answer);
}
```

## Handoff Quality Checks

### Good Handoff Characteristics

✅ **Clear context**: Next agent knows exactly what to do
✅ **Complete verification**: Evidence provided for claims
✅ **Specific summaries**: Concrete details, not vague statements
✅ **Rich blockers**: Detailed description + resolution path
✅ **Attempted list**: Shows debugging steps already taken

### Poor Handoff Characteristics

❌ **Vague context**: "Some work done, continue"
❌ **Missing verification**: "Tests pass" without output
❌ **Generic summaries**: "Completed phase 5"
❌ **Shallow blockers**: "Something wrong"
❌ **Empty attempted**: No debugging information

### Quality Scoring

```typescript
function scoreHandoffQuality(handoff: AgentHandoff): number {
  let score = 0;

  // Context quality (0-40 points)
  if (handoff.handoff.context?.length > 100) score += 20; // Detailed
  if (handoff.handoff.context?.includes("Follow") || handoff.handoff.context?.includes("Use"))
    score += 20; // Actionable

  // Summary quality (0-20 points)
  if (handoff.summary?.length > 50) score += 10; // Specific
  if (/\d+/.test(handoff.summary)) score += 10; // Quantified

  // Verification quality (0-20 points)
  if (handoff.verification?.command_output) score += 10;
  if (Object.keys(handoff.verification || {}).length >= 3) score += 10;

  // Blocker quality (0-20 points, when blocked)
  if (handoff.status === "blocked") {
    if (handoff.handoff.blockers?.length > 0) score += 10;
    if (handoff.attempted?.length >= 3) score += 10;
  } else {
    score += 20; // Full points if not blocked
  }

  return score; // 0-100
}
```

**Target**: ≥80 points for production-quality handoffs

## Related References

- [Handoff Examples](agent-handoffs-examples.md) - Complete examples
- [Core Protocol](agent-handoffs.md) - Format and field definitions
- [Critical Rules](critical-rules.md) - Blocked agent routing table (deprecated - see orchestrating-multi-agent-workflows)
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
