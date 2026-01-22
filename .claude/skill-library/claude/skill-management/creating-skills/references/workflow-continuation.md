# Workflow Continuation Rules

**9 phases run automatically Phase 1 → 9. ONLY stop for:** AskUserQuestion prompts, Phase 8 GREEN approval, Phase 9 pressure test spawning.

## Research Continuation (MANDATORY)

When Phase 6 research is performed, continuation MUST happen automatically:

1. Sub-Phase 6.2 writes remaining phases (6.3, 7, 8, 9) to TodoWrite BEFORE invoking orchestrating-research
2. orchestrating-research completes and signals `WORKFLOW_CONTINUATION_REQUIRED`
3. Agent MUST check TodoWrite for next pending phase
4. Agent continues immediately to Sub-Phase 6.3 (Incorporate research)
5. Do NOT report "Research complete!" and stop
6. Do NOT wait for user to say "continue"
7. Continue Sub-Phase 6.3 → 7 → 8 → 9 automatically

## Examples

**WRONG:** Sub-Phase 6.2 → Research completes → "Research complete! Key findings..." → STOPS ❌

**RIGHT:** Sub-Phase 6.2 → Research completes → Check TodoWrite → Sub-Phase 6.3 → ... → Phase 9 → "Skill creation complete" ✅

## Why This Matters

Stopping after research breaks the workflow and requires user intervention to resume. The entire point of TodoWrite tracking is to enable automatic continuation across context switches like research invocation.
