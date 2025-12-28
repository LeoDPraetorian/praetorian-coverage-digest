---
name: enforcing-evidence-based-analysis
description: Use when creating implementation plans or analyzing existing code - prevents hallucination by requiring source file verification before making claims about APIs, interfaces, or code structure
allowed-tools: Read, Grep, Glob, Bash
---

# Evidence-Based Planning

**Prevents hallucination during research and planning by requiring source verification before claims.**

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

### Phase 1: Discovery (BEFORE Planning)

For each file/API you will use or modify:

1. **READ** the actual source file with Read tool
2. **QUOTE** relevant code with exact line numbers
3. **DOCUMENT** in required format (see [Discovery Format](references/discovery-format.md))

**Example:**

```markdown
## Verified API: useWizard

**Source:** src/components/wizards/hooks/useWizard.ts (lines 45-80)

**Actual Return Type:**
\`\`\`typescript
// QUOTED FROM SOURCE (lines 72-77):
return {
  navigation: { goToNextStep, goToPreviousStep, ... },
  progress: { currentStep, totalSteps, ... },
  validation: { isValid, errors, ... },
}
\`\`\`

**My Planned Usage:**
\`\`\`typescript
const wizard = useWizard(config);
wizard.navigation.goToNextStep();  // ✅ Matches actual API
\`\`\`

**Verified Match:** ✅ Signatures match
```

### Phase 2: Planning (Only After Discovery)

Only after documenting APIs with evidence:

1. Create plan referencing verified findings
2. Show "Actual API" vs "My Usage" for each
3. List assumptions in dedicated section

---

## Anti-Hallucination Rules

| Rule | Why It Matters |
|------|----------------|
| **No quotes = No claims** | If you can't quote source, you don't know it |
| **Memory is suspect** | "I think it returns X" requires verification |
| **Patterns are assumptions** | "Most hooks return..." is NOT evidence |
| **Read before write** | Read the file before proposing changes |

**See:** [Complete Anti-Hallucination Rules](references/anti-hallucination-rules.md)

---

## Required Assumptions Section

Every analysis or plan MUST end with:

```markdown
## Assumptions (Not Directly Verified)

| Assumption | Why Unverified | Risk if Wrong |
|------------|----------------|---------------|
| [What] | [Why couldn't verify] | [Impact] |

If this section is empty: "All claims verified against source files."
```

**Why:** Forces transparency about what's verified vs. assumed.

---

## Red Flags - STOP Immediately

- About to describe an API without reading its source file
- Using "typically", "usually", "most X do Y"
- Providing interface definitions from memory
- Claiming file analysis without Read tool evidence
- Confident about code you haven't seen this session

---

## Verification Checklist

Before completing any plan, verify:

- [ ] I READ every file I reference (used Read tool, not memory)
- [ ] I QUOTED actual code with line numbers
- [ ] I did NOT assume API shapes from patterns
- [ ] I LISTED all assumptions in Assumptions section
- [ ] My example code uses APIs that ACTUALLY EXIST

---

## Why This Matters

From the wizard modal failure:

- 48KB "comprehensive" plan was fundamentally broken
- Every API call used wrong property names/signatures
- Agent claimed "analyzed 10 files" but never read them
- Three independent reviewers confirmed: won't compile
- Hours of implementation time would have been wasted

**The 30 seconds to read a file prevents 30 hours debugging a broken plan.**

---

## Common Rationalizations (DO NOT ACCEPT)

| Excuse | Reality |
|--------|---------|
| "I already know this API" | Knowledge cutoff is 18 months ago |
| "Common React pattern" | Patterns are assumptions, not facts |
| "Simple to verify later" | Later is too late - plan is written |
| "Just a quick analysis" | Quick = hallucination risk |
| "No time to read files" | 30 sec now prevents 30 hours later |

**See:** [Complete Rationalization Table](references/rationalizations.md)

---

## Progressive Disclosure

**Quick Start (5 min):**
- Read source files before referencing them
- Quote actual code with line numbers
- Mark assumptions explicitly

**Comprehensive (15 min):**
- [Discovery Format](references/discovery-format.md) - Required documentation structure
- [Anti-Hallucination Rules](references/anti-hallucination-rules.md) - Complete ruleset
- [Rationalizations](references/rationalizations.md) - How agents bypass rules

**Advanced (30 min):**
- [Pressure Scenarios](references/pressure-scenarios.md) - Time/authority/sunk-cost tests
- [Integration with Other Skills](references/integration.md) - How this fits workflow

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
