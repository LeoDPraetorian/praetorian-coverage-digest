# Phase 1: Brainstorming

Clarify capability requirements and determine capability type before architecture.

## Purpose

Transform rough capability requests into well-defined designs by:

- Determining implementation pattern (YAML template vs Go plugin)
- Determining capability type (VQL, Nuclei, Janus, Fingerprintx, Scanner)
- Exploring detection approaches
- Identifying constraints and edge cases
- Validating security assumptions

## Workflow

### Step 0: Determine Implementation Pattern (NEW)

**Before asking about capability type**, invoke the decision skill to determine if this is a YAML template or Go plugin situation:

```
Read: .claude/skill-library/development/capabilities/selecting-plugin-implementation-pattern/SKILL.md
```

This skill provides a decision tree based on:

- Detection logic complexity (pattern matching vs algorithmic)
- Protocol support (standard vs custom)
- State requirements (stateless vs stateful)
- Author persona (security researcher vs developer)

**Decision outcomes:**

- **YAML Template** → Likely Nuclei template or Augustus probe
- **Go Plugin** → Likely Fingerprintx module, Janus tool chain, or Scanner integration
- **VQL** → Velociraptor-specific (separate path)

### Step 1: Determine Capability Type

Use AskUserQuestion to clarify if not already clear:

```
What type of security capability are you creating?

Options:
1. VQL Capability - Velociraptor Query Language for artifact collection
2. Nuclei Template - YAML-based vulnerability detection
3. Janus Tool Chain - Security scanner orchestration pipeline
4. Fingerprintx Module - Service detection and fingerprinting
5. Scanner Integration - External security scanner integration
```

### Step 2: Gather Type-Specific Requirements

Based on capability type, ask focused questions:

#### For VQL Capabilities

- What artifact(s) are you collecting? (files, registry, network, process)
- What detection logic identifies the security issue?
- What data needs to be extracted for reporting?
- Are there performance constraints? (large file sets, memory usage)

#### For Nuclei Templates

- What vulnerability or misconfiguration are you detecting?
- What HTTP requests/responses indicate the issue?
- What matchers validate successful detection?
- What is the CVE/CWE identifier (if applicable)?

#### For Janus Tool Chains

- What security tools are being orchestrated?
- What is the input to the chain? (domain, IP, file)
- How should results be aggregated?
- What error handling is needed between tools?

#### For Fingerprintx Modules

- What service/protocol are you fingerprinting?
- What is the default port?
- Is source code available for version analysis?
- What similar protocols need to be distinguished?

#### For Scanner Integrations

- What external scanner is being integrated?
- What API/CLI does it expose?
- How do results map to Chariot data model?
- What authentication is required?

### Step 3: Invoke Brainstorming Skill (Optional)

If design needs exploration, invoke brainstorming skill:

```
skill: "brainstorming"
```

This uses Socratic method to explore alternatives and edge cases.

### Step 4: Document Design

Save refined design to capability workspace:

```bash
cat > ${OUTPUT_DIR}/design.md << 'EOF'
# {Capability Name} - Design

## Capability Type
{VQL | Nuclei | Janus | Fingerprintx | Scanner}

## Overview
{refined description}

## Detection Logic
{how the capability identifies the security issue}

## Key Decisions
- Decision 1: {rationale}
- Decision 2: {rationale}

## Alternatives Considered
- Alternative 1: {why rejected}

## Constraints
- Constraint 1
- Constraint 2

## Edge Cases
- Edge case 1: {handling strategy}
- Edge case 2: {handling strategy}
EOF
```

### Step 5: Human Checkpoint (MANDATORY)

Use AskUserQuestion:

```
The brainstorming phase produced this refined design:

{summary of design.md}

Capability type: {type}
Detection approach: {approach}

Key decisions:
- {decision 1}
- {decision 2}

Do you approve this design before we proceed to discovery?

Options:
- Yes, proceed to discovery phase
- No, let's refine the design further
- Pause - I need to think about this
```

### Step 6: Update Progress

Update `${OUTPUT_DIR}/metadata.json`:

```json
{
  "phases": {
    "brainstorming": {
      "status": "complete",
      "approved": true,
      "capability_type": "vql|nuclei|janus|fingerprintx|scanner",
      "design_file": "design.md",
      "completed_at": "2026-01-04T14:35:00Z"
    },
    "discovery": {
      "status": "in_progress"
    }
  },
  "current_phase": "discovery"
}
```

### Step 7: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 1: Brainstorming" as completed
TodoWrite: Mark "Phase 2: Discovery" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 2 when:

- Capability type determined
- Design documented in `design.md`
- User explicitly approves design
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- User hasn't approved
- Capability type unclear
- Detection logic undefined
- Constraints not identified

## Common Issues

### "User says capability type is unclear"

**Solution**: Ask more specific questions about the security use case. "What are you trying to detect?" often clarifies the type.

### "Should I skip brainstorming for simple capabilities?"

**Answer**: No. Even "simple" capabilities benefit from 5-10 minutes of design clarification. Prevents mid-implementation surprises about edge cases.

### "Brainstorming is taking too long"

**Solution**: Use AskUserQuestion to timebox: "We've spent 15 minutes refining. Should we proceed with current design or continue exploring?"

## Related References

- [Phase 2: Discovery](phase-2-discovery.md) - Next phase
- [Capability Types](capability-types.md) - Detailed comparison of capability types
- [Agent Handoffs](agent-handoffs.md) - Handoff format to discovery phase
