# Skill Consolidation Plan: writing-agents + updating-agents

**Date**: 2025-11-18
**Reason**: 70% overlap, both apply TDD to agent work
**Status**: Ready for next session

---

## Current State Analysis

### writing-agents
- **Purpose**: Creating new agent definitions
- **Content**: Frontmatter structure, agent types, TDD for creation
- **Lines**: ~300
- **Unique content**: 30% (frontmatter specs, agent types)

### updating-agents
- **Purpose**: Modifying existing agents
- **Content**: TDD for updates, gap patterns, architecture limitations
- **Lines**: ~580
- **Unique content**: 30% (gap identification, update patterns, architecture)
- **Recent addition**: Agent architecture limitations (critical)

### Overlap (70%)
- Both use TDD (RED-GREEN-REFACTOR)
- Both reference test-driven-development + writing-skills
- Both have testing sections
- Both have examples
- Both cover when to use vs not

---

## Proposed Consolidated Structure

### New writing-agents SKILL.md

**Sections:**

1. **Overview** - TDD for agent definitions (create + update)

2. **Agent vs Skill** - When to create agent vs skill

3. **Agent Architecture** - CRITICAL NEW SECTION
   - Flat delegation model
   - Agents cannot spawn agents (Task tool excluded)
   - Correct recommendation patterns
   - Evidence: GitHub #4182, #4993

4. **Creating New Agents** - From writing-agents
   - Frontmatter structure
   - Agent types
   - Description examples
   - TDD for new agents

5. **Updating Existing Agents** - From updating-agents
   - Gap identification patterns
   - When to update vs create new
   - Common update patterns
   - TDD for updates

6. **Common Mistakes** - Merged from both
   - Task() in delegation sections (NEW from session)
   - Missing discovery protocols
   - Domain mismatch
   - Over-engineering fixes

7. **TDD Process** - Consolidated
   - RED-GREEN-REFACTOR for both create and update
   - Testing methodology
   - Pressure testing

---

## Migration Strategy

### Phase 1: Merge Content
1. Read both skills completely
2. Extract unique sections from each
3. Merge overlapping sections
4. Add agent architecture section prominently
5. Write consolidated writing-agents

### Phase 2: Update Description
```yaml
name: writing-agents
description: Use when creating new agent definitions or updating existing agents - applies TDD to ensure agents work before deployment, includes architecture limitations (agents cannot spawn other agents), frontmatter structure, and gap identification patterns
```

### Phase 3: Validate
- Test prevents Task() mistake (from session)
- Test covers creation scenarios
- Test covers update scenarios
- Verify no content lost

### Phase 4: Deploy
- Commit new consolidated writing-agents
- Delete old updating-agents (content merged)
- Update any references to updating-agents

---

## Benefits of Consolidation

**Reduces cognitive load:**
- One skill to reference for agent work (not two)
- Covers full lifecycle (create + maintain)

**Eliminates redundancy:**
- 70% overlap removed
- Single TDD process (not duplicated)

**Adds critical knowledge:**
- Agent architecture limitations
- Unified create/update methodology

**Better discovery:**
- Description covers both creation and updating
- All agent work in one place

---

## Evidence This Session

**We used both skills:**
- writing-agents: For creating agent skill reference structure
- updating-agents: For TDD agent updates (12 agents)

**We discovered:**
- Agent architecture limitation (agents can't spawn)
- Added to updating-agents
- Should be in unified skill

**Pattern**: Both skills needed for agent work, should be unified.

---

## Execution Checklist (Next Session)

- [ ] Read writing-agents completely
- [ ] Read updating-agents completely
- [ ] Identify unique content from each
- [ ] Merge into consolidated structure
- [ ] Add agent architecture section prominently
- [ ] Update description for discovery
- [ ] Test consolidated skill (RED phase exists - Task() mistake)
- [ ] Commit new writing-agents
- [ ] Delete updating-agents
- [ ] Update cross-references

**Estimated time**: 30-45 minutes

---

**Ready for next session execution.**
