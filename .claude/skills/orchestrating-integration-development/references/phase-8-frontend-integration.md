# Phase 8: Frontend Integration (CONDITIONAL)

## When to Run This Phase

This phase is CONDITIONAL. Run it when:
- User must provide credentials via UI
- User configures integration settings
- Integration needs to appear in UI integration picker

Skip this phase when:
- Integration uses service account (configured server-side)
- Integration runs automatically without user interaction
- Integration is internal-only (no UI exposure)

The decision should be made in Phase 3 (Architecture) and documented in architecture.md.

## Decision Criteria

Use this table to evaluate whether Phase 8 is needed:

| Criterion | Needs Frontend? | Example |
|-----------|-----------------|---------|
| User provides API credentials | YES | Shodan API key, Wiz client ID/secret |
| User configures integration settings | YES | Scan frequency, asset filters |
| Integration uses OAuth2 with user consent | YES | GitHub App installation |
| Integration uses service account only | NO | AWS cross-account role (configured in backend) |
| Integration is seed-based with no config | NO | DNS enumeration from seeds |

## Decision Protocol

After Phase 7 completes, before starting Phase 8:

1. Read architecture.md from Phase 3 output
2. Check 'Frontend Requirements' section
3. If 'Needs UI: YES' → Proceed to Phase 8
4. If 'Needs UI: NO' → Skip to Phase 9
5. If section missing → Ask user via AskUserQuestion:
   "Does this integration need UI configuration (credentials, settings)?"

## Phase 8 Decision Checkpoint

**Location**: Between Phase 7 completion and Phase 8 start

**Orchestrator Action**:
```bash
# Read Phase 3 architecture output
architecture_md=$(cat .claude/.output/integrations/${TIMESTAMP}-${VENDOR}/architecture.md)

# Check for Frontend Requirements section
if grep -q "## Frontend Requirements" <<< "$architecture_md"; then
  needs_ui=$(grep "Needs UI:" <<< "$architecture_md" | awk '{print $3}')

  if [ "$needs_ui" = "YES" ]; then
    echo "Phase 8 REQUIRED - Proceeding to frontend integration"
    # Spawn frontend-developer agent
  elif [ "$needs_ui" = "NO" ]; then
    echo "Phase 8 SKIPPED - No UI configuration needed"
    # Update metadata.json with skip reason
    # Skip to Phase 9
  fi
else
  # Frontend Requirements section missing - ask user
  # Use AskUserQuestion: "Does this integration need UI configuration?"
fi
```

## What Phase 8 Implements

When Phase 8 runs, the `frontend-developer` agent creates:

### 1. UI Enum Registration

File: `modules/chariot/ui/src/types.ts`

```typescript
export enum IntegrationType {
  // ... existing integrations
  VENDOR_NAME = 'vendor_name',  // Add new integration
}
```

### 2. Integration Logos

Files:
- `modules/chariot/ui/public/integrations/vendor-dark.svg`
- `modules/chariot/ui/public/integrations/vendor-light.svg`

**Requirements**:
- SVG format
- Dark mode and light mode variants
- Consistent sizing (recommend 48x48px artboard)

### 3. Integration Hook Configuration

File: `modules/chariot/ui/src/hooks/useIntegration.tsx`

```typescript
case IntegrationType.VENDOR_NAME:
  return {
    name: 'Vendor Name',
    description: 'Brief description of what this integration does',
    logo: {
      dark: '/integrations/vendor-dark.svg',
      light: '/integrations/vendor-light.svg',
    },
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your Vendor API key',
      },
      // Additional config fields
    ],
  };
```

### 4. Optional: Custom Configuration UI

If integration has complex configuration (beyond simple form fields), create dedicated React components:

```
modules/chariot/ui/src/components/integrations/VendorConfig.tsx
modules/chariot/ui/src/components/integrations/VendorConfig.test.tsx
```

## Metadata Tracking

When Phase 8 is SKIPPED, update `metadata.json`:

```json
{
  "phases": {
    "phase-7": {
      "status": "skipped",
      "skip_reason": "service account only, no user config needed",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "timestamp": "2025-01-14T12:00:00Z"
    }
  }
}
```

When Phase 8 RUNS, update `metadata.json`:

```json
{
  "phases": {
    "phase-7": {
      "status": "complete",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "files_created": [
        "modules/chariot/ui/src/types.ts (enum added)",
        "modules/chariot/ui/public/integrations/vendor-dark.svg",
        "modules/chariot/ui/public/integrations/vendor-light.svg",
        "modules/chariot/ui/src/hooks/useIntegration.tsx (case added)"
      ],
      "timestamp": "2025-01-14T12:30:00Z"
    }
  }
}
```

## Common Patterns

### Pattern 1: API Key Authentication

**Needs Frontend**: YES

User must provide their API key via UI form. Backend reads from credential store.

### Pattern 2: OAuth2 with User Consent

**Needs Frontend**: YES

User must authorize the integration via OAuth2 flow. UI provides "Connect" button and handles callback.

### Pattern 3: Service Account (Cross-Account Role)

**Needs Frontend**: NO

Integration uses pre-configured service account. No user credentials needed. Configuration happens in backend/infrastructure.

### Pattern 4: Seed-Based Discovery

**Needs Frontend**: NO

Integration discovers assets from existing seeds (domains, IP ranges). No integration-specific UI needed.

## Troubleshooting

### Problem: Unclear if Phase 8 is needed

**Solution**: Check auth method from Phase 1 brainstorming:
- API key → YES
- OAuth2 → YES
- Service account → NO
- Seed-based → NO

### Problem: Frontend Requirements section missing from architecture.md

**Solution**: Return to Phase 3, update architecture.md to include Frontend Requirements section with YES/NO decision and rationale.

### Problem: Integration needs partial UI (view-only, no config)

**Solution**:
- If integration appears in UI integration picker → Phase 8 REQUIRED (even if read-only)
- If integration is completely internal → Phase 8 SKIPPED

## Related References

- [Phase 3: Architecture](./phase-3-architecture.md) - Where Frontend Requirements are documented
- [Phase 9: Completion](./phase-9-completion.md) - Final verification includes frontend verification if Phase 8 ran
- [Agent Handoffs](./agent-handoffs.md) - Structured JSON format for agent communication

## Exit Criteria

Phase 8 is complete when:

**If Phase 8 RUNS**:
- [ ] UI enum added to `types.ts`
- [ ] Dark and light logos added (SVG format)
- [ ] `useIntegration.tsx` updated with integration configuration
- [ ] Frontend tests pass (if custom components were added)
- [ ] `frontend-integration-log.md` created with changes summary

**If Phase 8 SKIPPED**:
- [ ] Skip decision documented in metadata.json
- [ ] Skip reason matches Frontend Requirements from Phase 3
- [ ] Orchestrator proceeds directly to Phase 9
