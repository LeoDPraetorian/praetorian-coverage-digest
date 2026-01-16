# Output Artifacts

**Complete structure and format specifications for all generated artifacts.**

## Output Directory Structure

```
.claude/.output/bugs/{timestamp}-{bug-name}/
├── MANIFEST.yaml                 # Workflow metadata
├── bug-scoping-report.json       # Stage 1 output
├── discovery-{component}.md      # Stage 2 per-agent outputs
├── discovery-{component}.md
├── discovery-{component}.md
└── candidate-locations.md        # Stage 2 consolidated output
```

## MANIFEST.yaml

**Purpose**: Workflow metadata for tracking and auditing

**Format**:

```yaml
workflow: discovering-bugs-for-fixing
bug_name: user-profile-stale-data
timestamp: 2026-01-15T10:30:00Z
stages_completed:
  - stage_1_bug_scoping
  - stage_2_discovery
status: completed
output_files:
  - bug-scoping-report.json
  - discovery-useUserProfile.md
  - discovery-ProfilePage.md
  - candidate-locations.md
handoff_to: debugger
handoff_file: candidate-locations.md
```

## bug-scoping-report.json

**Purpose**: Stage 1 output - scoping analysis and agent strategy

**Schema**:

```json
{
  "bug_description": "string",
  "symptoms": ["string"],
  "grep_findings": [
    {
      "pattern": "string",
      "files": "number",
      "locations": ["string"]
    }
  ],
  "candidate_locations": [
    {
      "path": "string",
      "confidence": "high|medium|low",
      "rationale": "string"
    }
  ],
  "strategy": {
    "agent_count": "number",
    "mode": "quick|medium",
    "skip_discovery": "boolean",
    "rationale": "string"
  }
}
```

**Example**:

```json
{
  "bug_description": "User profile shows stale data after navigation",
  "symptoms": [
    "Previous user data appears briefly when navigating to another user's profile",
    "Happens consistently after initial load",
    "Refresh fixes the issue temporarily"
  ],
  "grep_findings": [
    {
      "pattern": "useUserProfile",
      "files": 3,
      "locations": [
        "src/hooks/useUserProfile.ts",
        "src/features/profile/ProfilePage.tsx",
        "src/features/dashboard/UserWidget.tsx"
      ]
    },
    {
      "pattern": "stale",
      "files": 1,
      "locations": ["src/utils/cache.ts"]
    }
  ],
  "candidate_locations": [
    {
      "path": "src/hooks/useUserProfile.ts",
      "confidence": "high",
      "rationale": "Hook name matches symptom, likely handles profile data fetching/caching"
    },
    {
      "path": "src/features/profile/ProfilePage.tsx",
      "confidence": "medium",
      "rationale": "Consumes the hook, may have state management issues"
    }
  ],
  "strategy": {
    "agent_count": 2,
    "mode": "quick",
    "skip_discovery": false,
    "rationale": "Two clear candidates identified, parallel investigation will be efficient"
  }
}
```

## discovery-{component}.md

**Purpose**: Per-agent output from Stage 2 Explore agents

**Format**:

```markdown
# Discovery: {component_name}

## Component

{component_path}

## Investigation Scope

{scope_description}

## Findings

### File: {file_path}

**Lines**: {line_range}
**Relevance**: high|medium|low
**Why**: {1-sentence explanation}

**Code Path**:

1. {step_1}
2. {step_2}
3. {step_3}

**Related Files**:

- {file_1}
- {file_2}

### File: {file_path}

[repeat structure]

## Test Files

- {test_file_1} - {what it tests}
- {test_file_2} - {coverage gap noted}

## TODO/FIXME Comments

- {file}:{line} - {comment_text}

## Notes

{any additional observations}
```

**Example**:

```markdown
# Discovery: useUserProfile Hook

## Component

src/hooks/useUserProfile.ts

## Investigation Scope

Hook for fetching user profile data, including imports, consumers, and related cache configuration.

## Findings

### File: src/hooks/useUserProfile.ts

**Lines**: 34-67
**Relevance**: high
**Why**: Hook doesn't invalidate query cache on userId change, causing stale data

**Code Path**:

1. useQuery called with userId as dependency
2. Query key is `['user', userId]`
3. When userId changes, new query is made BUT old cache entry persists
4. React Query returns stale data during refetch window
5. No explicit invalidation on userId change

**Related Files**:

- src/features/profile/ProfilePage.tsx (primary consumer)
- src/utils/queryClient.ts (cache configuration)
- src/types/user.ts (User type definition)

### File: src/utils/queryClient.ts

**Lines**: 89-102
**Relevance**: medium
**Why**: staleTime set to 5 minutes, may be too aggressive for user profile data

**Code Path**:

1. queryClient configured with default staleTime: 300000 (5 min)
2. useUserProfile inherits this default
3. Navigation within 5 min window serves cached data

## Test Files

- tests/hooks/useUserProfile.test.ts - Tests initial fetch, loading states
- **Coverage Gap**: No test for userId change scenario

## TODO/FIXME Comments

None found related to this bug.

## Notes

- Similar pattern in src/hooks/useOrgProfile.ts may have same issue
- Consider adding `refetchOnMount: true` or explicit invalidation on userId change
```

## candidate-locations.md

**Purpose**: Stage 2 consolidated output - all agent findings merged and prioritized

**Format**:

```markdown
# Bug Discovery Results

## Bug Description

{bug_description}

## Symptoms

- {symptom_1}
- {symptom_2}
- {symptom_3}

## Candidate Locations (by confidence)

### High Confidence

#### {file_path} (lines {range})

**Relevance**: High
**Why**: {1-sentence explanation}

**Code Path**:

1. {step}
2. {step}

**Related Files**:

- {file}
- {file}

**Test Files**:

- {test_file} - {note}

### Medium Confidence

[repeat structure]

### Low Confidence

[repeat structure]

## Recommended Investigation Order

1. Start with: {file_1}
2. Verify in: {file_2}
3. Check tests: {test_file}

## Notes

- {observation_1}
- {observation_2}

## Discovery Metadata

- **Stage 1 Duration**: {duration}
- **Stage 2 Agent Count**: {count}
- **Stage 2 Duration**: {duration}
- **Total Candidates Investigated**: {count}
- **High Confidence Results**: {count}
```

**Example**: See [stage-2-discovery.md](stage-2-discovery.md#step-25-consolidate-results) for full example.

## File Naming Conventions

### Timestamp Format

```
YYYY-MM-DDTHH-MM-SS
Example: 2026-01-15T10-30-00
```

### Bug Name Slug

```
Convert spaces to hyphens, lowercase, remove special chars
"User profile shows stale data" → "user-profile-stale-data"
```

### Component Name Slug

```
Use PascalCase component name or file basename
src/hooks/useUserProfile.ts → "useUserProfile"
src/features/profile/ProfilePage.tsx → "ProfilePage"
```

## Size Guidelines

| File                     | Typical Size | Max Size | Notes                    |
| ------------------------ | ------------ | -------- | ------------------------ |
| bug-scoping-report.json  | 1-2 KB       | 10 KB    | Grows with grep findings |
| discovery-{component}.md | 2-5 KB       | 20 KB    | Per-agent, keep focused  |
| candidate-locations.md   | 5-10 KB      | 50 KB    | Consolidated, all agents |
| MANIFEST.yaml            | <1 KB        | 2 KB     | Metadata only            |

**If exceeding max size**: Discovery too comprehensive (violates "quick mode"). Focus on bug-relevant code only.

## Artifact Retention

**Workflow artifacts persist for debugging continuity:**

```bash
# Artifacts remain until bug is fixed
.claude/.output/bugs/{timestamp}-{bug-name}/

# After fix, optionally archive
mv .claude/.output/bugs/{timestamp}-{bug-name} \
   .claude/.output/bugs/archive/{bug-name}-resolved-{date}
```

**Do not delete** until:

1. Bug is verified fixed
2. Root cause is documented
3. Tests are added for regression prevention

## Integration with persisting-agent-outputs

This skill follows the [persisting-agent-outputs](../../claude/skill-management/persisting-agent-outputs/SKILL.md) pattern:

```
OUTPUT_DIR = .claude/.output/bugs/{timestamp}-{bug-name}/
```

**All agents spawned in Stage 2 receive**:

```
OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs
```

## Related Documentation

- [persisting-agent-outputs](../../claude/skill-management/persisting-agent-outputs/SKILL.md) - OUTPUT_DIR protocol
- [stage-1-bug-scoping.md](stage-1-bug-scoping.md) - Stage 1 workflow
- [stage-2-discovery.md](stage-2-discovery.md) - Stage 2 workflow
