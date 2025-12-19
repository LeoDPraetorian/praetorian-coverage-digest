# Phase 3: Word Count Validation

## What It Checks

**Skill type classification** (auto-detected or frontmatter override):
- **Reasoning Skills**: Process-driven, Claude is the engine (1000-2000 words optimal)
- **Tool Wrapper Skills**: CLI-driven, Claude just executes (200-600 words optimal)
- **Hybrid Skills**: Mix of reasoning and tools (600-1200 words optimal)

**Word count thresholds** (type-specific):
- Critical max: Skill exceeds maximum for its type
- Optimal range: Target range based on skill type
- Warning min: Below minimum for effective guidance

## Why Different Thresholds Matter

**Code vs. Context Trade-off**: When logic moves from prompt (Claude's context) to TypeScript (CLI scripts), word count requirements change dramatically.

### Reasoning Skills (1000-2000 words)

**Characteristics:**
- Logic lives in the prompt
- Claude is the processing engine
- Needs detailed philosophy, edge cases, step-by-step guides
- Multi-phase workflows with decision points

**Examples:** debugging-systematically, developing-with-tdd, brainstorming

**Why high word count:** Claude needs comprehensive context to reason through complex, multi-step processes. The skill IS the implementation.

### Tool Wrapper Skills (200-600 words)

**Characteristics:**
- Logic lives in TypeScript/scripts
- Claude just pushes buttons (runs CLI commands)
- Needs command syntax, CLI flags, example output
- Error recovery for CLI failures only

**Examples:** claude-skill-compliance, claude-skill-search, mcp-code-create

**Why low word count:** The CLI handles 99% of the work. Bloating SKILL.md with "how it works" explanations wastes tokens when Claude just needs to know: "Run this command with these flags."

**Anti-pattern:** Adding 1000 words explaining what `npm run audit` does internally. The code already handles it.

### Hybrid Skills (600-1200 words)

**Characteristics:**
- Mix of reasoning AND tool execution
- Some workflow guidance + CLI helpers
- Decision points that determine which tool to run
- Interpretation of CLI output required

**Examples:** claude-skill-write, claude-agent-compliance

**Why medium word count:** Balances process guidance with tool instructions. Claude needs workflow logic + how to use tools correctly.

## Detection Heuristics

Phase 3 auto-detects skill type based on content analysis:

### Tool Wrapper Indicators

**Strong indicators (all must be present):**
- CLI execution patterns: `npm run audit`, `npm run fix`, `scripts/*.ts`
- Scripts directory references: `scripts/src/cli.ts`
- Command block patterns: "Run: ```bash\n npm run audit```"

**Detection logic:**
```typescript
if (hasCliPatterns && hasScriptsDirectory && hasCommandBlocks) {
  return 'tool-wrapper';
}
```

### Reasoning Skill Indicators

**Strong indicators:**
- Process section headers: `## Process`, `## Workflow`, `## Steps`, `## Phase 1`
- TDD patterns: `RED`, `GREEN`, `REFACTOR`
- Sequential language: "first", "then", "next", "finally", "step 1"

**Detection logic:**
```typescript
if (hasReasoningPatterns && !hasCliPatterns) {
  return 'reasoning';
}
```

### Hybrid Detection

**When both patterns present:**
```typescript
if (hasReasoningPatterns && hasCliPatterns) {
  return 'hybrid';
}
```

### Frontmatter Override

**Force specific type:**
```yaml
---
name: my-skill
skill-type: tool-wrapper  # Override auto-detection
---
```

**When to override:**
- False positive: Skill detected as wrong type
- False negative: Skill not detected correctly
- Edge case: Doesn't fit detection heuristics

## Severity Matrix

| Skill Type | Word Count | Threshold | Severity | Rationale |
|------------|------------|-----------|----------|-----------|
| Reasoning | <800 | Warning min | WARNING | Insufficient guidance for complex reasoning |
| Reasoning | 1000-2000 | Optimal | PASS | Appropriate detail for process-driven |
| Reasoning | >2500 | Critical max | CRITICAL | Needs progressive disclosure |
| Tool Wrapper | <150 | Warning min | WARNING | Missing essential CLI documentation |
| Tool Wrapper | 200-600 | Optimal | PASS | Concise, high signal-to-noise |
| Tool Wrapper | >800 | Critical max | CRITICAL | Over-explaining automated logic |
| Hybrid | <400 | Warning min | WARNING | Insufficient for mixed approach |
| Hybrid | 600-1200 | Optimal | PASS | Balanced reasoning + tools |
| Hybrid | >1500 | Critical max | CRITICAL | Extract to references/ |

## Examples

### Example 1: Tool Wrapper (claude-skill-compliance)

**Content analysis:**
- Has `npm run audit`, `npm run fix`, `scripts/src/cli.ts`
- Has `Run: npm run audit -- --skill my-skill`
- Has scripts/ directory references

**Detection:** tool-wrapper
**Word count:** 1401 words
**Threshold:** 200-600 optimal
**Status:** WARNING (too verbose for tool wrapper)
**Recommendation:** Remove implementation details already handled by CLI

### Example 2: Reasoning Skill (debugging-systematically)

**Content analysis:**
- Has `## Phase 1`, `## Phase 2`, `## Phase 3`, `## Phase 4`
- Has "RED", "GREEN", "REFACTOR" workflow
- Sequential process with decision points

**Detection:** reasoning
**Word count:** 2400 words
**Threshold:** 1000-2000 optimal
**Status:** WARNING (slightly over optimal)
**Recommendation:** Extract advanced patterns to references/

### Example 3: Hybrid (claude-skill-write)

**Content analysis:**
- Has `## RED-GREEN-REFACTOR Workflow` (process)
- Has `npm run -w @chariot/skill-search search` (CLI tool)
- Mix of reasoning and tool execution

**Detection:** hybrid
**Word count:** 3800 words
**Threshold:** 600-1200 optimal
**Status:** CRITICAL (way over for hybrid)
**Recommendation:** Extract to references/ (progressive disclosure)

## Manual Fixes

**For tool wrappers flagged as too verbose:**
1. Remove explanations of internal CLI logic
2. Focus on: command syntax, flags, error recovery
3. Move "how it works" to references/ if needed
4. Keep troubleshooting for unhandled CLI errors

**For reasoning skills flagged as too short:**
1. Add decision point explanations
2. Include edge case handling
3. Expand workflow rationale
4. Add "Common Mistakes" section

**For any skill flagged as too long:**
1. Extract detailed content to references/
2. Keep SKILL.md as high-level guide
3. Link to references with clear descriptions
4. Use progressive disclosure pattern

## Related Phases

- [Phase 1: Description Format](phase-01-description.md) - Description should match skill type
- [Phase 6: Script Organization](phase-06-script-organization.md) - Tool wrappers need scripts/
- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - TypeScript CLI tool setup

## Quick Reference

### Type Detection Patterns

| Pattern | Indicates | Type |
|---------|-----------|------|
| `npm run audit/fix`, `scripts/src/` | CLI-driven | tool-wrapper |
| `## Phase 1`, `RED-GREEN-REFACTOR` | Process-driven | reasoning |
| Both patterns present | Mixed approach | hybrid |

### Word Count Thresholds

| Skill Type | Optimal Range | Critical Max | Warning Min |
|------------|---------------|--------------|-------------|
| Tool Wrapper | 200-600 | 800 | 150 |
| Reasoning | 1000-2000 | 2500 | 800 |
| Hybrid | 600-1200 | 1500 | 400 |

### Common Actions

| Issue | Action | Tool |
|-------|--------|------|
| Tool wrapper too verbose | Remove implementation details | Edit SKILL.md |
| Reasoning skill too short | Add decision guidance | Edit SKILL.md |
| Any skill too long | Extract to references/ | Edit + Create |
| Type detection wrong | Add frontmatter override | Edit frontmatter |

### Example Commands

```bash
# Audit single skill with type detection
npm run audit -- --skill my-skill --phase 3

# See type detection results for all skills
npm run audit -- --phase 3 | grep "Skill type"

# Override type detection in frontmatter
cat <<EOF > skills/my-skill/SKILL.md
---
name: my-skill
skill-type: tool-wrapper
---
...
EOF
```
