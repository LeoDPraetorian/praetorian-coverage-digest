# Frontend Developer Agent Prompt Template (Phase 7)

**Agent**: frontend-developer
**Phase**: 7 (Frontend Integration - CONDITIONAL)
**Purpose**: Add UI configuration for integrations requiring user credentials or settings

## Prompt Template

```markdown
Task: Implement frontend integration for {vendor}

You are in Phase 7 of integration development. Your goal is to add UI components for the {vendor} integration so users can configure credentials and settings.

**IMPORTANT**: This phase only runs if integration requires user-provided credentials or configuration. Service account integrations skip this phase.

## Input Files

1. **architecture.md** (Phase 3): Frontend Requirements section with UI specifications
2. **design.md** (Phase 1): Authentication method and configuration fields

## Implementation Tasks

### Task 1: Add UI Enum

**File**: `modules/chariot/ui/src/types.ts`

**Action**: Add integration to IntegrationType enum

```typescript
export enum IntegrationType {
  // ... existing integrations
  {VENDOR_UPPER} = '{vendor_lower}',  // Add new integration
}
```

**Naming convention**:
- Enum name: UPPERCASE with underscores (e.g., SHODAN, WIZ_SECURITY)
- Enum value: lowercase with underscores (e.g., 'shodan', 'wiz_security')

### Task 2: Add Integration Logos

**Files**:
- `modules/chariot/ui/public/integrations/{vendor}-dark.svg`
- `modules/chariot/ui/public/integrations/{vendor}-light.svg`

**Requirements**:
- SVG format
- 48x48px artboard
- Dark mode variant (light icon on dark background)
- Light mode variant (dark icon on light background)
- Vendor's official brand colors if available

**SVG template**:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <!-- Icon content -->
  <!-- Use vendor's official logo or create simple icon -->
</svg>
```

### Task 3: Configure Integration Hook

**File**: `modules/chariot/ui/src/hooks/useIntegration.tsx`

**Action**: Add case to switch statement

```typescript
case IntegrationType.{VENDOR_UPPER}:
  return {
    name: '{Vendor Display Name}',
    description: '{Brief description of integration}',
    logo: {
      dark: '/integrations/{vendor}-dark.svg',
      light: '/integrations/{vendor}-light.svg',
    },
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your {Vendor} API key',
        helpText: 'Find your API key at {vendor_url}/settings/api',
      },
      // Additional fields from architecture.md Frontend Requirements
      {
        name: 'organizationId',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'Optional: Filter by organization',
      },
    ],
    documentationUrl: '{vendor_api_docs_url}',
    setupInstructions: [
      'Create an API key in your {Vendor} account settings',
      'Copy the API key',
      'Paste it in the field above',
      'Click Save to enable the integration',
    ],
  };
```

### Task 4: Create Custom Configuration UI (OPTIONAL)

**Only if**: Integration has complex configuration beyond simple form fields

**File**: `modules/chariot/ui/src/components/integrations/{Vendor}Config.tsx`

**When needed**:
- Custom validation logic
- Multi-step configuration
- Preview/test connection button
- Advanced settings with toggles

**Otherwise**: Skip this task, useIntegration fields are sufficient.

## Field Type Reference

| Field Type | When to Use | Example |
|------------|-------------|---------|
| password | API keys, secrets | API Key, Client Secret |
| text | Plain text config | Organization ID, Project Name |
| select | Dropdown options | Region, Scan Type |
| checkbox | Boolean toggles | Enable feature |
| number | Numeric config | Page size, Timeout |

## Frontend Integration Checklist

From architecture.md Frontend Requirements section:

- [ ] Needs UI: {YES | NO} - Verify this is YES or phase shouldn't run
- [ ] Enum name: IntegrationType.{VENDOR_UPPER}
- [ ] Logo requirements: dark.svg + light.svg
- [ ] Configuration fields: {list from architecture}
- [ ] Documentation URL: {vendor API docs}
- [ ] Setup instructions: {step-by-step}

## Verification

After implementing, verify:

```bash
cd modules/chariot/ui

# TypeScript compiles
npm run build

# Linting passes
npm run lint

# Type check
npx tsc --noEmit
```

## MANDATORY SKILLS

- using-skills: Skill discovery workflow
- gateway-frontend: Frontend patterns
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: frontend-integration-log.md

COMPLIANCE: Document invoked skills in output metadata.

## Output Format: frontend-integration-log.md

```markdown
# Frontend Integration Log: {vendor}

## Files Modified

1. modules/chariot/ui/src/types.ts
   - Added: IntegrationType.{VENDOR_UPPER} = '{vendor_lower}'

2. modules/chariot/ui/public/integrations/{vendor}-dark.svg
   - Created: Dark mode logo (48x48px SVG)

3. modules/chariot/ui/public/integrations/{vendor}-light.svg
   - Created: Light mode logo (48x48px SVG)

4. modules/chariot/ui/src/hooks/useIntegration.tsx
   - Added: Integration configuration case
   - Fields: {list of fields}

## Configuration Details

### Fields Added
- apiKey (password, required): {Vendor} API key
{... other fields}

### Setup Instructions
1. {step 1}
2. {step 2}
{... all steps}

## Verification Results

```bash
$ npm run build
✓ Build successful

$ npm run lint
✓ No linting errors

$ npx tsc --noEmit
✓ No type errors
```

## Next Phase

Frontend integration complete. Ready for Phase 8 (Completion).

{Include JSON metadata block}
```

## Success Criteria

Frontend integration is complete when:
- [ ] UI enum added to types.ts
- [ ] Dark and light logos added (SVG)
- [ ] useIntegration.tsx updated with fields
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Types check: `tsc --noEmit`
- [ ] frontend-integration-log.md created
```
