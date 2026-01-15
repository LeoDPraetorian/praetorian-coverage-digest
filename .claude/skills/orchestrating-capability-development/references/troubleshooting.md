# Troubleshooting

Common issues and solutions for capability development orchestration.

## Phase 1: Brainstorming

### Issue: Capability type unclear

**Symptoms**:

- User request is vague ("detect security issues")
- Multiple capability types could apply

**Solution**:

1. Ask clarifying questions via AskUserQuestion:
   - "What is the input?" (system files → VQL, HTTP endpoints → Nuclei, etc.)
   - "What is the output?" (artifacts → VQL, vulnerabilities → Nuclei, etc.)
   - "Where does it run?" (endpoints → VQL, scanner → Nuclei, etc.)
2. Reference [Capability Types](capability-types.md) comparison matrix
3. Present recommendation with rationale

### Issue: Design too vague to proceed

**Symptoms**:

- Missing key requirements
- No edge cases identified
- Unclear detection logic

**Solution**:

1. Invoke `brainstorming` skill for deeper exploration
2. Ask specific questions about detection approach
3. Document assumptions explicitly in design.md
4. Get user confirmation before proceeding

## Phase 3: Discovery

### Issue: No similar capabilities found

**Symptoms**:

- Discovery report shows 0% reuse
- "Greenfield" justification weak

**Solution**:

1. Verify search methodology was exhaustive (minimum 5 different search patterns)
2. Broaden search to adjacent capability types
3. Search for general patterns (not just similar capabilities)
4. Document greenfield justification with evidence

### Issue: Discovered patterns are low quality (tech debt)

**Symptoms**:

- Patterns identified but implementation is poor
- Special-casing, tight coupling, no error handling

**Solution**:

1. Document patterns as "0% reusable due to quality issues"
2. Note patterns as anti-patterns (what NOT to do)
3. Proceed with greenfield implementation
4. Consider filing tech debt issue for cleanup

## Phase 4: Architecture

### Issue: Architecture doesn't get human approval

**Symptoms**:

- User rejects architecture plan
- Concerns about detection approach

**Solution**:

1. Collect specific feedback via AskUserQuestion
2. Re-invoke capability-lead with revision guidance:
   ```
   Revise architecture addressing:
   - User concern 1: ${concern}
   - User concern 2: ${concern}
   ```
3. Present updated architecture for re-approval
4. Do NOT proceed to implementation without approval

### Issue: Architecture too vague for implementation

**Symptoms**:

- Missing implementation details
- No code examples or pseudocode
- Unclear data flow

**Solution**:

1. Re-invoke capability-lead with specific guidance:
   ```
   Provide more implementation detail:
   - Code structure and file organization
   - Pseudocode for core detection logic
   - Specific libraries/APIs to use
   - Step-by-step implementation sequence
   ```

## Phase 5: Implementation

### Issue: Agent returns blocked (architecture_decision)

**Symptoms**:

- Implementation encounters ambiguous architecture requirement
- Multiple valid approaches possible

**Solution**:

1. Extract blocker details from agent output
2. Re-invoke capability-lead with decision request:

   ```
   Architecture decision needed:
   ${blocker_description}

   Options:
   - Option 1: ${description}
   - Option 2: ${description}

   Recommend approach and update architecture.md
   ```

3. After lead responds, re-invoke capability-developer with updated architecture

### Issue: Agent returns blocked (security_concern)

**Symptoms**:

- Implementation introduces security risk
- Needs security review before proceeding

**Solution**:

1. Invoke security-lead for assessment:

   ```
   Security concern in ${capabilityType} capability:
   ${concern_description}

   Assess risk and recommend mitigation.
   ```

2. After security-lead responds, incorporate mitigation into implementation
3. Re-invoke capability-developer with security requirements

### Issue: Implementation creates files in wrong location

**Symptoms**:

- Files not in expected module location
- Path structure incorrect

**Solution**:

1. Verify OUTPUT_DIRECTORY was passed to agent correctly
2. Check agent metadata for files_modified paths
3. Move files to correct location:
   ```bash
   mv ${wrong_path} ${correct_path}
   ```
4. Update implementation-log.md with correct paths

## Phase 7: Review

### Issue: Review fails repeatedly (>3 retries)

**Symptoms**:

- capability-reviewer returns CHANGES_REQUESTED four times
- Issues persist after fixes

**Solution**:

1. **DO NOT retry a fourth time** - escalate to user via AskUserQuestion:

   ```
   Review failed 3 times. Issues:

   Round 1: ${issues}
   Round 2: ${issues}

   Options:
   - Approve as-is (accept known issues)
   - Manual intervention (user fixes)
   - Revise architecture (plan needs adjustment)
   ```

2. Based on user choice, proceed accordingly
3. Document decision in metadata.json

### Issue: Review identifies architecture flaws

**Symptoms**:

- Implementation is correct but architecture plan was flawed
- Fundamental approach wrong

**Solution**:

1. Escalate to user: "Architecture plan needs revision"
2. If user approves revision:
   - Return to Phase 4 (Architecture)
   - Re-invoke capability-lead with feedback
   - After new architecture approved, return to Phase 5 (Implementation)
3. Update metadata.json to track phase regression

## Phase 8: Testing

### Issue: Tests failing (not implementation)

**Symptoms**:

- Implementation is correct but tests are wrong
- Test expectations don't match architecture

**Solution**:

1. Review test-plan.md against architecture.md
2. Identify mismatches
3. Re-invoke test-lead to revise test plan
4. Re-invoke capability-tester with updated plan

### Issue: Quality metrics not met

**Symptoms**:

- Detection accuracy < target
- False positive rate > target
- Coverage < target

**Solution**:

1. **Detection accuracy issue**: Return to Phase 5 (Implementation)
   - Detection logic needs improvement
   - Re-invoke capability-developer with quality targets
2. **False positive issue**: Return to Phase 5 (Implementation)
   - Matchers/filters too broad
   - Refine detection criteria
3. **Coverage issue**: Extend tests
   - Re-invoke capability-tester to add tests
   - Do NOT lower coverage target

### Issue: Test validation fails repeatedly (>3 retries)

**Symptoms**:

- test-lead returns CHANGES_REQUESTED four times
- Tests still don't meet plan

**Solution**:

1. **DO NOT retry a fourth time** - escalate to user
2. User options:
   - Approve tests as-is (accept lower quality)
   - Manual test writing (user intervenes)
   - Revise test plan (adjust expectations)

## Cross-Phase Issues

### Issue: Output directory not created

**Symptoms**:

- Agents cannot write files
- "Directory not found" errors

**Solution**:

1. Verify Phase 0 (Setup) completed correctly
2. Check OUTPUT_DIR was created:
   ```bash
   ls -la .claude/.output/capabilities/${CAPABILITY_ID}
   ```
3. If missing, create manually:
   ```bash
   mkdir -p ${OUTPUT_DIR}
   ```
4. Ensure all agent prompts include OUTPUT_DIRECTORY parameter

### Issue: Agent doesn't invoke mandatory skills

**Symptoms**:

- Agent output metadata missing required skills
- Compliance check fails

**Solution**:

1. Check agent output metadata.skills_invoked array
2. Compare against MANDATORY SKILLS list in agent prompt
3. If skills missing:
   - Agent failed to follow instructions
   - Re-invoke agent with explicit reminder:

     ```
     CRITICAL: You MUST invoke these skills before completing:
     - persisting-agent-outputs
     - gateway-capabilities

     Document in output metadata.
     ```

### Issue: Lost context between phases

**Symptoms**:

- Agent doesn't have context from previous phase
- Repeats work or misses key decisions

**Solution**:

1. Verify handoff format includes context field
2. Check previous agent output for handoff.context
3. Ensure next agent prompt includes:
   ```
   CONTEXT FROM ${PREVIOUS_PHASE}:
   ${handoff.context}
   ```
4. If context missing, reconstruct from phase output files

### Issue: Parallel agent spawning causes errors

**Symptoms**:

- Multiple agents spawned at once
- API rate limit errors (429)
- Timeout errors

**Solution**:

1. **This workflow is SEQUENTIAL** - do not parallelize
2. Spawn agents one at a time, wait for completion
3. If you accidentally parallelized, cancel and restart sequentially

## Recovery Strategies

### Full Workflow Reset

If orchestration is completely broken:

1. Review metadata.json to identify last successful phase
2. Resume from that phase:
   ```bash
   # Example: Resume from Phase 5 (Implementation)
   # All prior phases (1-3) completed successfully
   # Restart at Phase 5 with existing architecture.md
   ```
3. Do NOT restart from Phase 1 unless architecture is fundamentally wrong

### Partial Phase Retry

If a phase partially completed:

1. Check phase output files (design.md, discovery.md, etc.)
2. Determine what's salvageable
3. Re-invoke agent with context:

   ```
   Previous attempt partially completed:
   ${what_was_done}

   Complete remaining work:
   ${what_remains}
   ```

## Related

- [Agent Handoffs](agent-handoffs.md) - Blocked status handling
- [Quality Standards](quality-standards.md) - Quality metric troubleshooting
- [Capability Types](capability-types.md) - Type-specific issues
- [orchestrating-multi-agent-workflows](../../orchestrating-multi-agent-workflows/SKILL.md) - Agent routing for blocked status
