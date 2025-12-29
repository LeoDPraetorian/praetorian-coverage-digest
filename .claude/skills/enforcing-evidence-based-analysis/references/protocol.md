# Evidence-Based Protocol

## Phase 1: Discovery (BEFORE Planning)

For each file/API you will use or modify:

1. **READ** the actual source file with Read tool
2. **QUOTE** relevant code with exact line numbers
3. **DOCUMENT** in required format (see [Discovery Format](discovery-format.md))

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
wizard.navigation.goToNextStep(); // ✅ Matches actual API
\`\`\`

**Verified Match:** ✅ Signatures match
```

## Phase 2: Planning (Only After Discovery)

Only after documenting APIs with evidence:

1. Create plan referencing verified findings
2. Show "Actual API" vs "My Usage" for each
3. List assumptions in dedicated section

---

## Required Assumptions Section

Every analysis or plan MUST end with:

```markdown
## Assumptions (Not Directly Verified)

| Assumption | Why Unverified        | Risk if Wrong |
| ---------- | --------------------- | ------------- |
| [What]     | [Why couldn't verify] | [Impact]      |

If this section is empty: "All claims verified against source files."
```

**Why:** Forces transparency about what's verified vs. assumed.
