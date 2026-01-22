# Gateway-Specific Sync Output Example

**Sample output from `--gateway <name>` operation.**

## Command

```
Use syncing-gateways skill with --gateway gateway-frontend flag
```

## Output

```
=== Gateway Sync - Single Gateway Mode ===

Target gateway: gateway-frontend

Phase 1: Discovery (filtered)
Discovering skills for gateway-frontend category...
Found 28 library skills matching pattern: development/frontend/*

Phase 2: Reading current state
Reading .claude/skills/gateway-frontend/SKILL.md... OK
Parsing routing table... OK (25 entries)

Phase 3: Comparison
Comparing discovered skills vs current routing table...

Additions found: 3
  - Frontend Performance
    Path: .claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md

  - Frontend Accessibility
    Path: .claude/skill-library/development/frontend/accessibility/frontend-accessibility/SKILL.md

  - Frontend Animation
    Path: .claude/skill-library/development/frontend/animation/frontend-animation/SKILL.md

Removals found: 1
  - Old React Skill
    Path: .claude/skill-library/development/frontend/old-react-skill/SKILL.md
    Reason: Path verification failed (file does not exist)

Phase 4: Application
Building new routing table...
  - Starting entries: 25
  - Removing: 1
  - Adding: 3
  - Final entries: 27

Sorting alphabetically... OK

Applying edit to gateway-frontend... OK

Phase 5: Verification
Reading updated file... OK
Verifying table format... OK
Verifying path format... OK (all paths valid)
Verifying sorting... OK (alphabetical order confirmed)
Verifying entry count... OK (27 entries)

---

=== Sync Complete for gateway-frontend ===

Changes applied:
  ✅ Added 3 skills
  ✅ Removed 1 skill (broken path)

New routing table has 27 entries (was 25)

Duration: 1.8 seconds
```

## Use Cases

**When to use `--gateway` flag:**

1. **Targeted updates** - Only one category changed (e.g., added 3 frontend skills)
2. **Quick fixes** - Fix one gateway without processing all 8
3. **Testing** - Verify sync logic works correctly before full sync
4. **Performance** - Faster execution when only one gateway needs updating

## Comparison: Gateway-Specific vs Full Sync

| Aspect             | `--gateway <name>`      | `--full-sync`               |
| ------------------ | ----------------------- | --------------------------- |
| Discovery scope    | Single category         | All categories              |
| Gateways processed | 1                       | 8                           |
| Time (typical)     | 2-3 seconds             | 5-10 seconds                |
| Use when           | Single category changed | Multiple categories changed |

## Example Workflow

**Scenario:** Just created 3 new frontend skills

```bash
# 1. Load syncing-gateways workflow
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")

# 2. Follow Phase 1-3 for gateway-frontend only

# 3. Verify all paths exist
grep "\.claude/skill-library" .claude/skills/gateway-frontend/SKILL.md | grep -oE '`[^`]+`' | tr -d '`' | while read path; do test -f "$path" || echo "✗ BROKEN: $path"; done
```

## Notes

- Gateway-specific sync is faster than full sync
- Still performs full verification on the target gateway
- Other gateways remain unchanged
- Safe to run multiple times (idempotent)
