# Phase Details: Claude-Automated Phases (15-25)

Parent: [phase-details-overview.md](phase-details-overview.md)

These phases require Claude semantic reasoning. Automated detection flags candidates, Claude classifies based on context.

## Phase 15: Code Block Quality

**Category:** Claude-Automated (Two-layer architecture)

**Checks:**

- Missing language tags on code blocks
- Mismatched language tags (content doesn't match tag)
- Unknown language tags
- Lines excessively long (>120 chars)

**Severity:**

- INFO for missing/mismatched tags (candidates for Claude review)
- WARNING for long lines (deterministic)

**Auto-fix:** No - Requires semantic understanding of context

**Architecture:**

- **Layer 1 (Automated Detection):** Flags CANDIDATES (missing tags, potential mismatches)
- **Layer 2 (Claude):** Semantic classification using [phase-15-semantic-review.md](phase-15-semantic-review.md)

**Rationale:**

Context matters. The same missing language tag can be:

- Genuine issue (real code needs syntax highlighting)
- Template code (intentional placeholder for users)
- Bad practice example (showing what NOT to do)
- Console output (command results, not code)
- Pseudo-code (algorithm steps, not executable)
- Meta-discussion (discussing code blocks themselves)

Automated detection flags patterns but cannot understand context. Claude classifies each candidate based on surrounding text, file name, and purpose.

**Common failures:**

````markdown
# ❌ GENUINE ISSUE: Missing tag on real code

```
async function fetchData() {
  return await fetch(url);
}
```

→ Should be: ```typescript

# ✅ NOT AN ISSUE: Console output (intentionally untagged)

Output:

```
✓ Phase 1: passed
✓ Phase 2: passed
Done in 2.3s
```

→ This is console output, not code

# ✅ NOT AN ISSUE: Bad practice example

❌ WRONG:

```
Phase 3.5: Extra validation
```

→ Showing what NOT to do, intentionally incorrect
````

**See also:** [phase-15-semantic-review.md](phase-15-semantic-review.md) for complete classification guide.

## Phase 16: Header Hierarchy

**Checks:**

- Single H1 (`#` Title) at top
- No skipped levels (H1 → H3 without H2)
- Consistent ATX style (`#` not underlines)
- No orphan headers (header with no following content)

**Severity:** INFO

**Auto-fix:** No - Restructuring headers risks breaking content

**Common failures:**

```markdown
# Title

### Section # ❌ WRONG: Skipped H2

# Title

## Section # ✅ CORRECT: Proper nesting
```

## Phase 17: Prose Phase References

**Checks:** Prose phase references match canonical phase list

**What it detects:**

- Stale references like "Phase 4 (implementation)" when Phase 4 is now "Architecture"
- Missing phase numbers referenced in text
- Name hints that don't match the canonical phase name

**Example failure:**

```markdown
Return to Phase 4 (implementation) to fix.
```

When Phase 4 is actually "Architecture" (implementation moved to Phase 5).

**Why:** After phase renumbering (adding/removing phases), prose references become stale while markdown links get caught by Phase 4 (Broken Links).

**Severity:** WARNING (doesn't break functionality)

**Fix:** Validation-Only - requires semantic understanding to fix correctly

**Exclusions:**

- `.history/CHANGELOG` files (historical)
- Code blocks (examples)
- Cross-skill references

## Phase 18: Orphan Detection

**Checks:** Library skills have a discovery path (gateway or agent reference)

**Severity:** WARNING

**Auto-fix:** No - Requires semantic judgment

**Rationale:** Skills without discovery paths are invisible in the two-tier system

**What it detects:**

- Library skills NOT listed in any gateway
- Library skills NOT referenced by any agent
- Suggests appropriate gateways based on skill domain

**Common failures:**

```
Skill: .claude/skill-library/frontend/my-component-skill/SKILL.md
Issue: No gateway lists this skill
Recommendation: Add to gateway-frontend routing table
```

## Phase 19: Windows Paths

**Checks:** All paths use forward slashes (POSIX-style)

**What it detects:**

- No Windows-style backslash paths (`C:\path\to\file`)
- No relative backslash paths (`.\folder\file`)
- Cross-platform path compatibility

**Severity:** WARNING

**Auto-fix:** Yes - Converts backslashes to forward slashes

**Rationale:** Forward slashes work on ALL platforms (including Windows), backslashes only work on Windows

**Pattern Detection:**

```typescript
// Matches: C:\path, .\path, \path
const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
```

**Common failures:**

```bash
# ❌ WRONG: Absolute Windows paths
See the config at C:\Users\dev\project\.claude\skills\

# ❌ WRONG: Relative backslash paths
Reference: .\references\patterns.md

# ❌ WRONG: Mixed backslash paths
Path: .claude\skills\my-skill\SKILL.md

# ✅ CORRECT: Unix-style paths (work everywhere)
cd .claude/skills/my-skill
Reference: ./references/patterns.md
```

**Edge Cases:**

**1. Escape Sequences (Not Paths)**

```markdown
Use `\n` for newlines and `\t` for tabs.
```

These are NOT converted - they're escape sequences, not paths.

**2. Regex Patterns**

```typescript
const pattern = /path\\to\\file/;
```

Backslashes in regex are intentional - review manually.

**3. Windows-Specific Documentation**

If documenting Windows behavior specifically, backslash paths may be intentional. Add comment:

```markdown
<!-- Windows-specific example, backslashes intentional -->

C:\Program Files\MyApp
```

## Phase 20: Gateway Structure

**Checks:** Gateway skills explain the two-tier system

**Severity:** CRITICAL

**Auto-fix:** No - Requires manual documentation

**Gateway-only:** Only applies to `gateway-*` skills

**Validates:**

- Has `<EXTREMELY-IMPORTANT>` block with 1% Rule and Skill Announcement
- Has "Progressive Disclosure" section with 3-tier explanation
- Has "Intent Detection" table (Task Intent | Route To)
- Has "Routing Algorithm" numbered steps
- Has "Skill Registry" tables with Skill | Path | Triggers columns
- Has "Cross-Gateway Routing" table
- Has "Loading Skills" section with Read tool example

**Rationale:** Gateway skills must teach agents how to use the two-tier system

## Phase 21: Routing Table Format

**Checks:** Gateway routing tables show full paths, not just skill names

**Severity:** WARNING

**Auto-fix:** Yes - Expands skill names to full paths

**Gateway-only:** Only applies to `gateway-*` skills

**Common failures:**

```markdown
# ❌ WRONG: Just skill name

| Need    | Skill               |
| ------- | ------------------- |
| Testing | testing-with-vitest |

# ✅ CORRECT: Full path

| Need    | Skill Path                                                 |
| ------- | ---------------------------------------------------------- |
| Testing | .claude/skill-library/testing/testing-with-vitest/SKILL.md |
```

## Phase 22: Path Resolution

**Checks:** All paths in gateway routing tables exist on filesystem

**Severity:** WARNING

**Auto-fix:** Hybrid - Fuzzy match broken paths, suggest corrections

**Gateway-only:** Only applies to `gateway-*` skills

**Hybrid behavior:**

- No deterministic auto-fix (removal could break gateway)
- Fuzzy match against existing skill paths
- Options: fix to similar path, remove entry, mark for creation

**Example ambiguous case:**

```
Path: .claude/skill-library/testing/vitest-testing/SKILL.md
Issue: Path not found
Similar paths:
  1. .claude/skill-library/testing/testing-with-vitest/SKILL.md (score: 0.85)
  2. .claude/skill-library/testing/vitest-mocking/SKILL.md (score: 0.72)
```

## Phase 23: Coverage Check

**Checks:** All library skills appear in exactly one gateway (no orphans, no duplicates)

**Severity:** INFO

**Auto-fix:** No - Requires human judgment

**Gateway-only:** Only applies to `gateway-*` skills

**Rationale:** Ensures every library skill is discoverable through exactly one gateway

**What it detects:**

- Library skills listed in multiple gateways
- Library skills not listed in any gateway
- Gateway coverage gaps by domain

## Phase 24: Line Number References

**Category:** Claude-Automated

**Checks:** No hardcoded line numbers in file references (semantic classification required)

**Severity:** INFO (candidates) - Automated detection flags patterns, Claude classifies

**Auto-fix:** No - Claude reasoning determines genuine issues vs teaching content

**Rationale:** Line numbers drift with every code change, creating maintenance debt

**Two-Layer Architecture:**

- **Layer 1 (Automated Detection)**: Flag CANDIDATES with line number patterns
  - Detects `file.go:123` or `file.go:123-456` patterns
  - Provides context: surrounding lines, file name, WRONG markers
  - Severity: INFO (not WARNING)
- **Layer 2 (Claude)**: Classify each candidate semantically
  - Genuine hardcoded line number → FLAG
  - Bad practice example (after WRONG/❌) → IGNORE
  - Teaching content (discussing line numbers) → IGNORE
  - Template/placeholder (using :LINE) → IGNORE
  - Historical reference (was at line X) → IGNORE
  - Tool output example (grep, stack trace) → IGNORE

**What it detects:**

- `file.go:123` patterns
- `file.ext:456-789` patterns (any file extension)
- Line number ranges in references

**False positives avoided:**

- Bad practice examples showing what NOT to do
- Teaching content discussing why line numbers are problematic
- Template patterns using placeholders like `:LINE`
- Historical references ("was at line 89, now refactored")
- Tool output examples (grep results, stack traces)

**Recommended patterns:**

```markdown
# ❌ WRONG: Line numbers become outdated

See file.go:123-127 for implementation

# ✅ CORRECT: Structural descriptions are durable

See file.go - func (t \*Type) MethodName(...)
See file.go (between Match() and Invoke() methods)
```

**Reference:** See [phase-24-semantic-review.md](phase-24-semantic-review.md) for classification guide

## Phase 25: Context7 Staleness

**Checks:** Context7-sourced documentation is <30 days old

**Severity:** WARNING

**Auto-fix:** No - Requires re-fetching documentation

**Rationale:** Frontend/backend libraries evolve rapidly, stale docs lead to outdated recommendations

**What it validates:**

- `.local/context7-source.json` exists and has valid `fetchedAt` date
- Documentation age is ≤30 days

**Resolution:**

1. Use context7 MCP tool to fetch fresh documentation
2. Update skill with new data via `updating-skills` workflow:
   ```typescript
   Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md");
   ```
3. Update `.local/context7-source.json` with new `fetchedAt` timestamp
