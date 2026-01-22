# Phase 8: Plan Completion Review

Verify ALL tools have been implemented before proceeding to GREEN gate.

## Overview

Before advancing to Phase 10 (Testing), the orchestrator MUST verify that every tool discovered in Phase 3 has been implemented.

This prevents incomplete service wrappers where some tools are missing.

## Tool Checklist Verification

### Step 1: Load Tools Manifest

Read the complete tool list from Phase 3:

```bash
cat .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools-manifest.json
```

Expected structure:

```json
{
  "service": "linear",
  "total_tools": 15,
  "selected_tools": 15,
  "tools": [
    { "name": "get-issue", "description": "Get issue by ID" },
    { "name": "list-issues", "description": "List issues" },
    { "name": "create-issue", "description": "Create new issue" }
    // ... 12 more tools
  ]
}
```

### Step 2: Verify Per-Tool Status

For each tool in the manifest, check MANIFEST.yaml for complete pipeline:

```json
{
  "per_tool": {
    "get-issue": {
      "schema_discovery": "complete",
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete",
      "implementation": "complete",
      "review": {
        "status": "complete",
        "overall_verdict": "APPROVED"
      }
    },
    "list-issues": {
      "schema_discovery": "complete",
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete",
      "implementation": "complete",
      "review": {
        "status": "complete",
        "overall_verdict": "APPROVED"
      }
    }
  }
}
```

### Step 3: Identify Missing/Incomplete Tools

Compare manifest to MANIFEST.yaml:

```typescript
// Pseudocode for verification
const manifest = JSON.parse(readFile("tools-manifest.json"));
const metadata = JSON.parse(readFile("MANIFEST.yaml"));

const incomplete_tools = [];

for (const tool of manifest.tools) {
  const status = metadata.per_tool[tool.name];

  if (!status) {
    incomplete_tools.push({
      tool: tool.name,
      reason: "Not started",
      missing_phases: "all",
    });
  } else {
    const missing = [];
    if (status.schema_discovery !== "complete") missing.push("schema_discovery");
    if (status.architecture !== "complete") missing.push("architecture");
    if (status.test_planning !== "complete") missing.push("test_planning");
    if (status.test_implementation !== "complete") missing.push("test_implementation");
    if (status.implementation !== "complete") missing.push("implementation");
    if (status.review?.overall_verdict !== "APPROVED") missing.push("review");

    if (missing.length > 0) {
      incomplete_tools.push({
        tool: tool.name,
        reason: "Partially complete",
        missing_phases: missing.join(", "),
      });
    }
  }
}
```

### Step 4: Status Classification

Classify each tool's status:

| Status          | Definition                         | Phases Complete                                                                                            |
| --------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **complete**    | All phases done, review APPROVED   | schema_discovery → architecture → test_planning → test_implementation → implementation → review (APPROVED) |
| **in_progress** | Some phases done, not yet reviewed | At least schema_discovery, missing implementation or review                                                |
| **blocked**     | Review failed max retries          | All phases done, review verdict NOT APPROVED                                                               |
| **deferred**    | User-approved skip                 | Explicitly marked as deferred in MANIFEST.yaml                                                             |
| **missing**     | Not in MANIFEST.yaml               | None                                                                                                       |

## User-Approved Deferral Protocol

### When to Defer Tools

Tools may be deferred (skipped) in these scenarios:

1. **Tool is deprecated** - MCP documentation indicates tool will be removed
2. **Tool requires unavailable resources** - Needs credentials/services not accessible
3. **Tool is experimental** - MCP marks as alpha/beta with instability warnings
4. **Tool is redundant** - Functionality fully covered by another tool
5. **User explicitly requests skip** - User decides not to wrap specific tools

### How to Document Deferral

When deferring a tool, update MANIFEST.yaml:

```json
{
  "per_tool": {
    "experimental-feature": {
      "status": "deferred",
      "deferred_at": "2025-01-11T15:30:00Z",
      "deferred_reason": "Tool marked as alpha with breaking changes expected",
      "deferred_by": "user",
      "justification": "MCP documentation warns against production use until stable release"
    }
  },
  "summary": {
    "tools_wrapped": 14,
    "tools_deferred": 1,
    "deferred_tools": ["experimental-feature"]
  }
}
```

### Deferral Justification Requirements

Every deferred tool MUST include:

- **deferred_reason**: Brief explanation (1 sentence)
- **deferred_by**: "user" (explicit request) or "orchestrator" (recommended, user approved)
- **justification**: Detailed reasoning (2-4 sentences) explaining why skipping is acceptable

### User Approval for Deferral

Orchestrator MUST get explicit approval:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Tool Deferral Request",
      question:
        "Tool '{tool}' is recommended for deferral.\n\n**Reason:** {reason}\n\n**Justification:** {justification}\n\n**Impact:** Service will have {N-1}/{N} tools wrapped ({percentage}% coverage).\n\nApprove deferral?",
      multiSelect: false,
      options: [
        {
          label: "Defer tool",
          description: "Skip this tool, continue with others",
        },
        {
          label: "Attempt implementation",
          description: "Try wrapping despite concerns",
        },
        {
          label: "Show tool details",
          description: "View schema discovery and documentation",
        },
      ],
    },
  ],
});
```

## Extended Examples and Automation

For complete examples (15-tool service, deferred tools, missing tools) automated verification scripts, incomplete plan handling, metadata updates, and workflow integration, see: [phase-6-plan-review-extended.md](phase-6-plan-review-extended.md)
