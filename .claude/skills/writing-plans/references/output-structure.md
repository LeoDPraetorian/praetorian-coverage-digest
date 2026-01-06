# Output Directory Structure and Metadata

Complete guide to the `.claude/.output/plans/` directory structure, MANIFEST.yaml format, and metadata requirements.

## Output Directory Creation

**Phase 0: Create output directory BEFORE writing any plan content**

**YOU MUST run the actual `date` command — DO NOT approximate or invent timestamps.**

```bash
# Step 1: Get repository root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"

# Step 2: Get EXACT timestamp by running this command
date +"%Y-%m-%d-%H%M%S"
# Example output: 2026-01-04-152847

# Step 3: Generate slug from feature name (lowercase, hyphenated, 2-4 words)
# Examples: user-auth-refactor, tanstack-migration, asset-discovery-api

# Step 4: Create directory with EXACT timestamp from Step 2
mkdir -p "$ROOT/.claude/.output/plans/2026-01-04-152847-your-feature-slug"
```

**WRONG:** Guessing `143000` (rounded to 14:30:00)
**RIGHT:** Using actual output like `152847` (15:28:47)

**One-liner alternative:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && \
SLUG="your-feature-slug" && \
OUTPUT_DIR="$ROOT/.claude/.output/plans/$(date +%Y-%m-%d-%H%M%S)-${SLUG}" && \
mkdir -p "$OUTPUT_DIR"
```

**Store OUTPUT_DIR** - you will use it for all file writes.

## MANIFEST.yaml Structure

**Every plan directory MUST contain a MANIFEST.yaml:**

```yaml
feature_name: "User Authentication Refactor"
feature_slug: "user-auth-refactor"
created_at: "2026-01-04T14:30:22Z"
created_by: "writing-plans"
description: |
  Implementation plan for refactoring user authentication
  to use OAuth 2.0 with PKCE flow.

status: "complete" # or "in-progress" while writing

plan_type: "single-file" # or "phased"
phases: 1 # Number of phases (1 for single-file)
task_count: 15 # Total tasks across all phases

artifacts:
  - path: "implementation-plan.md"
    type: "implementation-plan"
    created_at: "2026-01-04T14:30:22Z"
```

**For phased plans:**

```yaml
plan_type: "phased"
phases: 4
task_count: 48

artifacts:
  - path: "PLAN.md"
    type: "plan-manifest"
    created_at: "2026-01-04T14:30:22Z"
  - path: "phase-0-foundation.md"
    type: "phase-plan"
    created_at: "2026-01-04T14:30:22Z"
  - path: "phase-1-component-a.md"
    type: "phase-plan"
    created_at: "2026-01-04T14:30:22Z"
  - path: "phase-2-component-b.md"
    type: "phase-plan"
    created_at: "2026-01-04T14:30:22Z"
  - path: "phase-3-integration.md"
    type: "phase-plan"
    created_at: "2026-01-04T14:30:22Z"
```

## Plan File Metadata Block

**Every plan file (including phase files) MUST end with a metadata JSON block:**

````markdown
... plan content here ...

---

## Metadata

```json
{
  "skill": "writing-plans",
  "output_type": "implementation-plan",
  "timestamp": "2026-01-04T14:30:22Z",
  "plan_directory": ".claude/.output/plans/2026-01-04-143022-user-auth-refactor",
  "skills_invoked": ["enforcing-evidence-based-analysis", "brainstorming"],
  "source_files_verified": ["src/auth/handler.go:45-120", "src/middleware/auth.ts:15-89"],
  "plan_type": "single-file",
  "task_count": 15,
  "phases": 1,
  "status": "complete"
}
```
````

**For phase files, include phase-specific metadata:**

```json
{
  "skill": "writing-plans",
  "output_type": "phase-plan",
  "phase_number": 0,
  "phase_name": "foundation",
  "timestamp": "2026-01-04T14:30:22Z",
  "plan_directory": ".claude/.output/plans/2026-01-04-143022-feature-name",
  "task_count": 12,
  "status": "complete"
}
```

## Directory Structure Examples

**Single-file plan:**

```
.claude/.output/plans/2026-01-04-143022-user-auth-refactor/
├── MANIFEST.yaml
└── implementation-plan.md           # The plan content with metadata block
```

**Phased plan:**

```
.claude/.output/plans/2026-01-04-143022-tanstack-migration/
├── MANIFEST.yaml
├── PLAN.md                          # Manifest of phases with metadata block
├── phase-0-foundation.md            # Phase plan with metadata block
├── phase-1-component-a.md           # Phase plan with metadata block
├── phase-2-component-b.md           # Phase plan with metadata block
└── phase-3-integration.md           # Phase plan with metadata block
```

## Implementation Checklist

When writing plans, follow this sequence:

1. ✅ Run `date +"%Y-%m-%d-%H%M%S"` to get EXACT timestamp
2. ✅ Generate feature slug (lowercase, hyphenated, 2-4 words)
3. ✅ Create directory: `.claude/.output/plans/{timestamp}-{slug}/`
4. ✅ Create MANIFEST.yaml with feature metadata
5. ✅ Write plan file(s) to the directory
6. ✅ Add metadata JSON block to EACH plan file
7. ✅ Update MANIFEST.yaml artifacts array
8. ✅ Return directory path (not file path) with contents summary

## Output Anti-Patterns

| Anti-Pattern                      | Why Wrong                                | Correct Approach                         |
| --------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Saving to `docs/plans/`           | Doesn't match other outputs              | Use `.claude/.output/plans/`             |
| Using date-only format YYYY-MM-DD | Collisions, hard to sort chronologically | Use full timestamp YYYY-MM-DD-HHMMSS     |
| Approximating timestamp (143000)  | Not the actual creation time             | Run `date +"%Y-%m-%d-%H%M%S"`            |
| Skipping MANIFEST.yaml            | No feature metadata, hard to discover    | ALWAYS create MANIFEST.yaml first        |
| No metadata block in plan files   | Can't track lineage/skills               | Add JSON metadata to EVERY file          |
| Returning file path               | Doesn't show directory structure         | Return directory path with contents list |

## References

This pattern follows:

- orchestrating-research skill (lines 306-336: timestamp creation)
- persisting-agent-outputs skill (lines 156-176: timestamp creation, lines 222-253: MANIFEST structure, lines 261-286: metadata format)
- Existing outputs in .claude/.output/features/ and .claude/.output/research/

The goal is consistency: ALL agent/skill outputs use the same directory structure, timestamp format, and metadata patterns.
