# Rationalization Prevention (Shared Reference)

Extracted from [shared rationalization prevention](.claude/skills/using-skills/references/rationalization-prevention.md) to avoid deep relative path dependencies.

## Why This Exists

Agents rationalize skipping steps. They generate plausible-sounding reasons to bypass gates, skip research, or shortcut workflows. This document provides:

1. **Statistical evidence** - Hard numbers that counter "it'll be fine" thinking
2. **Phrase detection** - Warning signs that rationalization is occurring
3. **Override protocol** - The ONLY valid way to bypass a gate

---

## Statistical Evidence

These numbers come from observed failure patterns. Use them to counter rationalization.

| Metric                            | Value | Implication                                    |
| --------------------------------- | ----- | ---------------------------------------------- |
| Technical debt fix rate           | ~10%  | "I'll fix it later" means it won't get fixed   |
| "Later" completion rate           | ~5%   | Deferred work has 95% abandonment rate         |
| "Simple" tasks that were complex  | ~40%  | Simplicity estimates are wrong 40% of the time |
| Post-merge refactoring completion | ~8%   | "Refactor after merging" = never refactored    |
| Skipped test follow-up rate       | ~12%  | "Add tests later" = no tests                   |

**Key insight**: Anything deferred has ~10% completion rate. Complete it now or accept it won't happen.

---

## Phrase Detection Patterns

**When you see these phrases in your thinking, STOP. You are rationalizing.**

### Deferral Phrases

- "I'll fix it later"
- "Let's come back to this"
- "We can add that after"
- "TODO for next iteration"
- "Post-merge cleanup"

### Minimization Phrases

- "This is probably optional"
- "Close enough"
- "Good enough for now"
- "Minor detail"
- "Edge case we can ignore"

### False Confidence Phrases

- "I'm confident about..."
- "I know this well"
- "This is straightforward"
- "Simple case"
- "Obviously..."

**Response when detected**: Return to the current step. Complete it fully before proceeding.
