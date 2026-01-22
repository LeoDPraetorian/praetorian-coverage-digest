---
name: enforcing-evidence-based-analysis
description: Use when creating implementation plans or analyzing existing code - prevents hallucination by requiring source file verification before making claims about APIs, interfaces, or code structure
allowed-tools: Read, Grep, Glob, Bash
---

# Evidence-Based Planning

**Prevents hallucination during research and planning by requiring source verification before claims.**

> **You MUST use TodoWrite** before starting analysis or planning tasks to track which files you've verified and which claims need evidence. This prevents skipping verification steps.

## Core Principle

**If you didn't READ the file, you cannot claim to KNOW its contents.**

This skill is complementary to `verifying-before-completion`:

- **verifying-before-completion**: Verifies OUTPUTS (tests pass, build succeeds) at END of work
- **enforcing-evidence-based-analysis**: Verifies INPUTS (source code, APIs) at BEGINNING of work

Together: Evidence-based inputs → Work → Verified outputs

---

## When This Skill Applies

Use this skill when:

- Creating implementation plans that modify existing code
- Analyzing codebases or architectures
- Documenting how systems work
- Writing code that uses existing APIs/interfaces
- Making claims about file contents or API shapes

**DO NOT skip this skill.** See [Why This Matters](#why-this-matters).

---

## The Problem This Solves

Agents claim to know file contents, API shapes, and interface definitions WITHOUT actually reading the source files. They hallucinate plausible-looking code based on "common patterns."

**Real failure:** A frontend-lead created a 48KB implementation plan claiming to have "analyzed 10 files" and provided detailed TypeScript types. Every single API call was wrong - the agent ASSUMED what `useWizard` returns based on patterns instead of READING `useWizard.ts`. Three reviewers confirmed the plan wouldn't compile.

**Cost:** Hours of wasted implementation time, destroyed trust, broken plans.

---

## The Evidence-Based Protocol

**Two-phase workflow:** Discovery (read and document) → Planning (reference verified APIs).

**See:** [Complete Protocol](references/protocol.md) for detailed steps, examples, and documentation format.

**Key steps:**

1. **READ** source files with Read tool
2. **QUOTE** actual code with line numbers
3. **DOCUMENT** findings before planning
4. **REFERENCE** verified APIs in your plan

---

## Anti-Hallucination Rules

| Rule                         | Why It Matters                               |
| ---------------------------- | -------------------------------------------- |
| **No quotes = No claims**    | If you can't quote source, you don't know it |
| **Memory is suspect**        | "I think it returns X" requires verification |
| **Patterns are assumptions** | "Most hooks return..." is NOT evidence       |
| **Read before write**        | Read the file before proposing changes       |

**See:** [Complete Anti-Hallucination Rules](references/anti-hallucination-rules.md)

---

## Red Flags - STOP Immediately

- About to describe an API without reading its source file
- Using "typically", "usually", "most X do Y"
- Providing interface definitions from memory
- Claiming file analysis without Read tool evidence
- Confident about code you haven't seen this session

**See:** [Why This Matters](references/why-this-matters.md) for the real cost of skipping verification and the verification checklist.

---

## Common Rationalizations (DO NOT ACCEPT)

**DO NOT accept excuses like:**

- "I already know this API" → Knowledge cutoff is 18 months ago
- "Common React pattern" → Patterns are assumptions, not facts
- "No time to read files" → 30 sec now prevents 30 hours later

**See:** [Complete Rationalization Table](references/rationalizations.md) for the full list and why each fails.

---

## Integration

### Called By

- `orchestrating-integration-development` (architect, developer, and reviewer phases)
- `preferring-simple-solutions` - Verify stdlib capabilities before claiming dependencies needed
- Any agent or skill creating implementation plans or analyzing existing code

### Requires (invoke before starting)

None - This is a foundational workflow skill that can be invoked directly.

### Calls (during execution)

None - This skill provides a protocol/workflow. It does not invoke other skills during execution.

### Pairs With (conditional)

| Skill                         | Trigger                      | Purpose                                  |
| ----------------------------- | ---------------------------- | ---------------------------------------- |
| `verifying-before-completion` | After implementation         | Verify outputs after evidence-based work |
| `writing-plans`               | Creating implementation plan | Structure plan with verified APIs        |
| `developing-with-tdd`         | TDD workflow                 | Verify test/code uses actual APIs        |
| `debugging-systematically`    | Debugging                    | Verify hypotheses against actual code    |

---

## Related Skills

- **verifying-before-completion** - Verifies outputs at end (complementary)
- **writing-plans** - Plan structure and format
- **developing-with-tdd** - Test-first methodology
- **debugging-systematically** - Root cause investigation

---

## The Bottom Line

**Read the source. Quote the code. Then make the claim.**

This is non-negotiable.
