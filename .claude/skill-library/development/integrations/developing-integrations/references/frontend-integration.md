# Frontend Integration Requirements

**Every Chariot backend integration needs corresponding UI components for user configuration and status display.**

---

## Overview

Backend integrations are surfaced in the Chariot UI through:

1. **Integration definition** - TypeScript definition file with form configuration
2. **Integration logos** (dark mode and light mode)
3. **Dynamic form rendering** via IntegrationForm.tsx

**Note**: As of 2026, the Chariot UI uses a **registry-based dynamic form system** instead of hardcoded integration cards. Integration definitions live in `modules/chariot/ui/src/features/integrations/definitions/`.

---

## Current Architecture (2026)

### Directory Structure

```
modules/chariot/ui/src/features/integrations/
├── IntegrationForm.tsx              # Dynamic form renderer
├── IntegrationSetupModal.tsx        # Modal wrapper
├── utils/
│   ├── IntegrationRegistry.ts       # Singleton registry
│   └── fieldBuilders.ts             # 13 factory functions for form fields
└── definitions/
    ├── cloud/
    │   ├── aws.integration.ts
    │   ├── azure.integration.ts
    │   └── gcp.integration.ts
    ├── security/
    │   ├── wiz.integration.ts
    │   ├── crowdstrike.integration.ts
    │   └── qualys.integration.ts
    └── scm/
        ├── github.integration.ts
        └── gitlab.integration.ts
```

### Legacy Paths (Pre-2026 - DEPRECATED)

**DO NOT use these paths anymore:**

- ❌ `modules/chariot/ui/src/hooks/useIntegration.tsx` (deprecated)
- ❌ `modules/chariot/ui/src/types.ts` - `IntegrationName` enum (deprecated for form system)

**New integrations should:**

- ✅ Create definition file in `definitions/{category}/{service}.integration.ts`
- ✅ Use `IntegrationRegistry.register()` for auto-discovery
- ✅ Use field builders from `utils/fieldBuilders.ts`

**All three components are required** for the integration to appear in the UI.

---

## Step 1: Add Enum to Types

**File**: `modules/chariot/ui/src/types.ts`

**Action**: Add integration name to `IntegrationName` enum

**Critical Rule**: Enum name MUST match backend `Name()` method (lowercase)

### Example

**Backend (`integration-name.go`):**

```go
func (t *ShodanTask) Name() string {
    return "shodan" // lowercase
}
```

**Frontend (`types.ts`):**

```typescript
export enum IntegrationName {
  // ... existing integrations
  SHODAN = "shodan", // MUST match backend Name() - lowercase
}
```

**Why This Matters**: The frontend queries backend API with enum values. Mismatch causes 404 errors when fetching integration configuration.

---

## Step 2: Add Logos (Dark and Light)

**Directories**:

- Dark mode: `modules/chariot/ui/src/assets/integrations/icons/dark/`
- Light mode: `modules/chariot/ui/src/assets/integrations/icons/light/`

**File naming**: `{integration-name}.svg` (lowercase, matching enum)

**Requirements**:

- SVG format (preferred for scalability)
- Square aspect ratio (e.g., 128x128, 256x256)
- Transparent background
- Dark mode logo: light-colored for visibility on dark backgrounds
- Light mode logo: dark-colored for visibility on light backgrounds

### Example

```
modules/chariot/ui/src/assets/integrations/icons/dark/shodan.svg
modules/chariot/ui/src/assets/integrations/icons/light/shodan.svg
```

**Logo Sources**:

- Vendor website (usually at `/press`, `/brand`, or `/media`)
- [Simple Icons](https://simpleicons.org/) - SVG logos for popular services
- [Brand Guidelines](https://www.google.com/search?q=vendor+brand+guidelines) - official vendor logos

**Why Both Modes**: Chariot UI supports dark and light themes. Without both logos, integration appears broken in one theme.

---

## Step 3: Update Integration Hook

**File**: `modules/chariot/ui/src/hooks/useIntegration.tsx`

**Action**: Add integration to routing logic

### Example Pattern

```typescript
// Find the integration configuration section
const integrationConfigs = {
  // ... existing integrations
  [IntegrationName.SHODAN]: {
    name: "Shodan",
    description: "Internet-connected device search engine",
    category: "External", // or "Cloud", "Security", etc.
    configFields: [
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        helpText: "Your Shodan API key from account.shodan.io",
      },
    ],
  },
};
```

**Common Config Field Types**:

- `text` - Plain text input
- `password` - Password input (masked)
- `select` - Dropdown selection
- `checkbox` - Boolean toggle
- `url` - URL input with validation

### Validation Settings

**CRITICAL**: The `linkOnValidateFailure` setting controls credential validation enforcement.

```typescript
{
  validate: true,                   // ✅ Enable credential validation
  linkOnValidateFailure: false,     // ✅ DEFAULT - Reject invalid credentials
  // OR
  linkOnValidateFailure: true,      // ⚠️ DANGER - Allow invalid credentials
}
```

**Default Behavior (Recommended)**:

- `validate: true` - Calls backend `ValidateCredentials()` method
- `linkOnValidateFailure: false` (or omitted) - Rejects integration if validation fails
- User sees error message, integration NOT linked

**Bypass Behavior (Use Sparingly)**:

- `linkOnValidateFailure: true` - Links integration even if `ValidateCredentials()` fails
- User sees warning but integration IS linked anyway
- **Security risk**: Invalid credentials accepted, integration may fail at runtime

**When to Use `linkOnValidateFailure: true`**:

1. ✅ Testing/development environments where validation endpoint is unavailable
2. ✅ Staged rollout where backend is deployed before validation endpoint exists
3. ✅ Degraded mode where service is down but customers need to link integrations
4. ❌ **NEVER in production for new integrations**

**Example - Standard Integration (Most Cases)**:

```typescript
shodan: {
  name: 'Shodan',
  validate: true,
  // linkOnValidateFailure: omitted (defaults to false)
  inputs: [...]
}
```

**Example - Bypass Mode (Rare)**:

```typescript
fastly: {
  name: 'Fastly',
  validate: true,
  linkOnValidateFailure: true,  // ⚠️ Documented exception
  inputs: [...],
  // Document why bypass is needed:
  // "Fastly validation requires global scope which not all customers have"
}
```

---

## Step 4: Verification

### Manual Testing

1. **Start UI dev server**:

```bash
cd modules/chariot/ui
npm start
```

2. **Navigate to Integrations page**: `/settings/integrations`

3. **Verify**:
   - [ ] Integration card appears in list
   - [ ] Logo displays correctly in dark mode
   - [ ] Logo displays correctly in light mode
   - [ ] Clicking card opens configuration modal
   - [ ] Config fields render correctly
   - [ ] Submitting config calls backend API

### Automated Testing (E2E)

```bash
cd modules/chariot/e2e
npx playwright test integrations.spec.ts
```

**Test coverage**:

- Integration appears in list
- Configuration modal opens
- Invalid config shows validation errors
- Valid config saves successfully
- Enabled integration shows status badge

---

## Common Issues

### Issue: Integration Card Not Appearing

**Symptoms**: Integration works in backend but doesn't appear in UI

**Causes**:

1. Enum name mismatch (frontend != backend `Name()`)
2. Missing logos (dark or light)
3. Integration not added to `useIntegration.tsx` config

**Fix**: Verify all three components (enum, logos, hook) are present and names match exactly.

### Issue: Logo Not Displaying

**Symptoms**: Broken image icon instead of logo

**Causes**:

1. File path incorrect (wrong directory or filename)
2. SVG syntax error (invalid XML)
3. Missing logo for current theme (dark vs light)

**Fix**:

```bash
# Verify logo files exist
ls modules/chariot/ui/src/assets/integrations/icons/dark/shodan.svg
ls modules/chariot/ui/src/assets/integrations/icons/light/shodan.svg

# Validate SVG syntax
xmllint --noout modules/chariot/ui/src/assets/integrations/icons/dark/shodan.svg
```

### Issue: Config Fields Not Saving

**Symptoms**: Configuration form submits but values don't persist

**Causes**:

1. Backend integration struct doesn't have corresponding fields
2. JSON marshaling tags missing on backend struct
3. Frontend field names don't match backend struct field names

**Fix**: Verify backend struct has JSON tags matching frontend field names:

```go
type ShodanConfig struct {
    APIKey string `json:"apiKey"` // Matches frontend "apiKey" field
}
```

---

## Checklist

Before submitting PR:

- [ ] Enum added to `types.ts` (lowercase, matching backend `Name()`)
- [ ] Dark mode logo added (`icons/dark/{name}.svg`)
- [ ] Light mode logo added (`icons/light/{name}.svg`)
- [ ] Integration config added to `useIntegration.tsx`
- [ ] Config fields match backend struct (JSON tags)
- [ ] **`linkOnValidateFailure` is NOT set (unless explicitly documented exception)**
- [ ] `validate: true` is set to enable credential validation
- [ ] Manual testing: integration appears and configures correctly
- [ ] Manual testing: **invalid credentials are rejected** (validation works)
- [ ] Manual testing: valid credentials are accepted
- [ ] UI renders in both dark and light themes
- [ ] E2E tests pass (if integration flow is testable)

---

## Related Files

- `modules/chariot/ui/src/types.ts` - Enum definitions
- `modules/chariot/ui/src/hooks/useIntegration.tsx` - Integration configuration
- `modules/chariot/ui/src/assets/integrations/icons/dark/` - Dark theme logos
- `modules/chariot/ui/src/assets/integrations/icons/light/` - Light theme logos
- `modules/chariot/ui/src/pages/Integrations.tsx` - Integrations list page
- `modules/chariot/backend/pkg/tasks/integrations/` - Backend integration implementations
