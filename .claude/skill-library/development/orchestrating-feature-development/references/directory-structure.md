# Directory Structure

**Feature workspace organization for orchestrated development.**

## Feature Directory Layout

```
.worktrees/{feature-name}/
├── .feature-development/           # Orchestration artifacts
│   ├── MANIFEST.yaml               # Feature metadata, status, metrics
│   ├── progress.md                 # Session progress tracking
│   ├── skill-manifest.yaml         # Phase 4: Technology-to-skill mapping
│   ├── discovery.md                # Phase 3: Codebase patterns
│   ├── architecture-plan.md        # Phase 7: Technical design (Part 1)
│   ├── plan.md                     # Phase 7: Implementation tasks (Part 2)
│   ├── feedback-scratchpad.md      # Tight feedback loop iteration history
│   ├── spec-compliance-review.md   # Phase 11: Stage 1 review output
│   ├── code-quality-review.md      # Phase 11: Stage 2 quality review
│   ├── security-review.md          # Phase 11: Stage 2 security review
│   ├── test-plan.md                # Phase 12: Test strategy
│   ├── coverage-report.md          # Phase 14: Coverage verification
│   └── agents/                     # Individual agent outputs
│       ├── frontend-lead.md
│       ├── backend-lead.md
│       ├── security-lead.md
│       ├── frontend-developer.md
│       ├── backend-developer.md
│       ├── frontend-reviewer.md
│       └── ...
└── [feature code]                  # Actual implementation files
```

## MANIFEST.yaml Structure

```yaml
feature:
  name: "asset-filtering"
  description: "Add advanced filtering to asset list"
  type: "Frontend" # Frontend | Backend | Full-Stack
  work_type: "MEDIUM" # BUGFIX | SMALL | MEDIUM | LARGE

created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T14:30:00Z"

phases:
  1_setup:
    status: "complete"
    completed_at: "2024-01-15T10:05:00Z"
  2_triage:
    status: "complete"
    completed_at: "2024-01-15T10:10:00Z"
    work_type: "MEDIUM"
  # ... phases 3-16

current_phase: 8
current_phase_name: "Implementation"

metrics:
  total_tokens: 45000
  estimated_cost: "$0.45"
  agent_spawns: 12
  retry_count: 2

technologies_detected:
  - "React"
  - "TypeScript"
  - "TanStack Query"

review:
  stage1:
    verdict: "SPEC_COMPLIANT"
    agent: "frontend-reviewer"
  stage2:
    quality:
      verdict: "APPROVED"
      score: 85
    security:
      verdict: "APPROVED"
      vulnerabilities: 0
```

## File Naming Conventions

| File Type     | Pattern                   | Example                   |
| ------------- | ------------------------- | ------------------------- |
| Phase output  | `phase-{N}-{name}.md`     | `phase-7-architecture.md` |
| Agent output  | `{agent-type}.md`         | `frontend-developer.md`   |
| Review output | `{review-type}-review.md` | `security-review.md`      |

## Output Directory Discovery

**Phase 1 discovers the output directory using `persisting-agent-outputs` skill:**

```bash
# Standard location
OUTPUT_DIR=".feature-development"

# Verify exists
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/agents"
```

## Phase Output Mapping

| Phase | Primary Output         | Location                          |
| ----- | ---------------------- | --------------------------------- |
| 3     | Codebase discovery     | `discovery.md`                    |
| 4     | Skill manifest         | `skill-manifest.yaml`             |
| 7     | Architecture + Plan    | `architecture-plan.md`, `plan.md` |
| 8     | Implementation summary | `agents/{domain}-developer.md`    |
| 11    | Review results         | `*-review.md` files               |
| 12    | Test plan              | `test-plan.md`                    |
| 14    | Coverage report        | `coverage-report.md`              |

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Initial directory creation
- [Progress Persistence](progress-persistence.md) - Cross-session state tracking
- [MANIFEST.yaml Updates](phase-16-completion.md) - Final status updates
