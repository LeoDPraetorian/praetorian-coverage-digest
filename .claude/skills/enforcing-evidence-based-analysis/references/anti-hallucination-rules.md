# Anti-Hallucination Rules

**Complete ruleset for preventing fabricated claims about code.**

## The Four Core Rules

### Rule 1: No Quotes = No Claims

**Principle:** If you can't quote source code, you don't know what it contains.

**Examples:**

❌ **Violates Rule:**

```markdown
"The useWizard hook returns navigation, progress, and validation objects"
```

_No source quoted - this is from memory/patterns_

✅ **Follows Rule:**

```markdown
"The useWizard hook returns nested objects (lines 72-77 of useWizard.ts):
\`\`\`typescript
return {
navigation: { ... },
progress: { ... },
validation: { ... },
}
\`\`\`"
```

_Source quoted with line numbers - verified_

### Rule 2: Memory is Suspect

**Principle:** "I think it returns X" requires verification.

**Why:** Your knowledge cutoff is 18 months ago. Libraries change. APIs evolve.

**Trigger phrases that indicate memory-based claims:**

- "I think..."
- "It probably..."
- "Usually it..."
- "Based on my knowledge..."
- "Typically..."

**Action:** When you catch yourself using these phrases, STOP and read the actual source.

**Example:**

❌ **Memory-based:**

> "I think WizardStep has a `label` property for the step title"

✅ **Source-verified:**

> "WizardStep uses `title` property (not `label`), verified at types.ts:17"

### Rule 3: Patterns Are Assumptions

**Principle:** "Most hooks return..." is NOT evidence.

**Common pattern assumptions:**

| Assumption                                  | Reality                                  |
| ------------------------------------------- | ---------------------------------------- |
| "Most React hooks return flat objects"      | Many return nested structures            |
| "Validation usually returns strings"        | Some return booleans, objects, or arrays |
| "Step interfaces have `label`"              | Some use `title`, `name`, or `heading`   |
| "Config objects are passed as single param" | Some destructure into multiple params    |

**Example:**

❌ **Pattern assumption:**

> "Following common React patterns, useWizard likely returns `{ currentStep, goNext, goPrev }`"

✅ **Source-verified:**

> "useWizard returns nested object with `navigation.goToNextStep()` (verified at useWizard.ts:72-77)"

### Rule 4: Read Before Write

**Principle:** Read the file before proposing changes to it.

**Workflow:**

1. Identify file you'll modify
2. Read the actual current implementation
3. Quote relevant sections
4. Show proposed changes with context

**Example:**

❌ **Write without reading:**

```markdown
Update AssetModal.tsx to use the new BaseEntityWizardModal component.

Changes:

- Import BaseEntityWizardModal
- Pass entityConfig prop
- ...
```

_Didn't read AssetModal first - might not understand current structure_

✅ **Read before write:**

```markdown
**Current Implementation** (AssetModal.tsx, lines 45-80):
\`\`\`typescript
export function AssetModal() {
const wizard = useWizard({ ... });
// ...existing pattern
}
\`\`\`

**Proposed Change:**
\`\`\`typescript
export function AssetModal() {
return <BaseEntityWizardModal
entityConfig={assetConfig}
// ...
/>
}
\`\`\`
```

_Read current code first, showed exact change_

## Additional Rules

### Rule 5: Line Numbers Must Be Current

**DON'T:** Reference code with line numbers from memory
**DO:** Get line numbers by reading the file THIS SESSION

### Rule 6: Verify Imports and Exports

**DON'T:** Assume export patterns
**DO:** Check actual export statements in the file

**Example:**

```typescript
// File might export as:
export function useWizard() {} // Named export
// or
export default useWizard; // Default export
// or
module.exports = { useWizard }; // CommonJS

// READ THE FILE to see which pattern is used
```

### Rule 7: Check Type Imports

**DON'T:** Assume type import patterns
**DO:** Verify `import type` vs `import { type X }`

### Rule 8: Validate Tool Permissions

**DON'T:** Use APIs from packages not in allowed-tools
**DO:** Check your frontmatter `allowed-tools` before referencing APIs

## When Rules Apply

**Always apply before:**

- Writing implementation plans
- Describing how systems work
- Proposing code changes
- Claiming file analysis
- Documenting APIs

**Even apply when:**

- "Quick analysis" requested
- Time pressure exists
- You're "confident" you know the API
- The code "looks standard"

## How to Catch Violations

**Self-audit questions:**

1. Did I use Read tool on this file?
2. Did I quote actual code with line numbers?
3. Am I using "typically", "usually", "most"?
4. Did I verify imports/exports?
5. Is this from memory or from source?

**If answer to #1-2 is NO or #3-5 is YES:** Violation. Stop and read source.

## Integration with Other Skills

- **verifying-before-completion**: Checks you ran commands (outputs)
- **enforcing-evidence-based-analysis**: Checks you read files (inputs)
- Both required for complete verification

## The Bottom Line

**Every claim about code must be traceable to actual source.**

If challenged "where did you see that?", you must be able to answer with:

- Exact file path
- Line numbers
- Quoted code

If you can't, it's hallucination.
