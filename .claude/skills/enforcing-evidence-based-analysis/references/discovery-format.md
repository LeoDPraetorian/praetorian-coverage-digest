# Discovery Format

**Required documentation structure when reading source files during planning.**

## Purpose

Standardizes how you document APIs/interfaces you've actually read, making it clear what's verified vs. assumed.

## Format Template

```markdown
## Verified API: [API/Component/Function Name]

**Source:** [file path] (lines X-Y)

**Actual Code:**
\`\`\`[language]
// QUOTED FROM SOURCE (lines X-Y):
[paste exact code from file]
\`\`\`

**My Planned Usage:**
\`\`\`[language]
[show how you plan to use it]
\`\`\`

**Verified Match:** ✅ Signatures match / ⚠️ Needs adaptation / ❌ Won't work
```

## Example: React Hook

```markdown
## Verified API: useWizard

**Source:** src/components/wizards/hooks/useWizard.ts (lines 45-80)

**Actual Return Type:**
\`\`\`typescript
// QUOTED FROM SOURCE (lines 72-77):
return {
navigation: {
goToNextStep: () => void,
goToPreviousStep: () => void,
goToStep: (stepId: string) => void,
},
progress: {
currentStep: number,
totalSteps: number,
percentComplete: number,
},
validation: {
isValid: boolean,
errors: Record<string, string>,
validate: () => boolean,
},
formData: TFormData,
}
\`\`\`

**My Planned Usage:**
\`\`\`typescript
const wizard = useWizard<AssetFormData>({
steps: ASSET_STEPS,
initialData: INITIAL_DATA,
});

// Access nested properties (correct)
wizard.navigation.goToNextStep();
wizard.progress.currentStep;
\`\`\`

**Verified Match:** ✅ Signatures match
```

## Example: Interface Definition

```markdown
## Verified Interface: WizardStep

**Source:** src/components/wizards/types.ts (lines 15-25)

**Actual Interface:**
\`\`\`typescript
// QUOTED FROM SOURCE (lines 15-22):
interface WizardStep<T> {
id: string;
title: string; // NOT 'label'
order: number; // REQUIRED
validate: (data: T) => boolean; // Returns boolean, NOT string
shouldSkip?: (data: T) => boolean;
}
\`\`\`

**My Planned Usage:**
\`\`\`typescript
const ASSET_STEPS: WizardStep<AssetFormData>[] = [
{
id: 'icon',
title: 'Choose Icon', // ✅ 'title' not 'label'
order: 1, // ✅ included
validate: (data) => !!data.icon, // ✅ returns boolean
},
];
\`\`\`

**Verified Match:** ✅ Signatures match
```

## What to Document

For each API/interface you use:

1. **Source location** - File path + line numbers
2. **Actual code** - Quoted verbatim from source
3. **Your usage** - How you plan to call/implement it
4. **Match status** - Does your usage match actual API?

## When to Use This Format

- Writing implementation plans
- Analyzing existing code
- Documenting system architecture
- Any time you reference file contents

## Verification

Match status meanings:

- ✅ **Signatures match** - Your usage is correct
- ⚠️ **Needs adaptation** - Minor changes required
- ❌ **Won't work** - Major mismatch, rethink approach
