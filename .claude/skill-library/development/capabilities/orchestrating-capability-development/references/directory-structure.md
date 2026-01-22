# Directory Structure

**Capability workspace organization for orchestrated development.**

## Capability Directory Layout

```
.worktrees/{capability-name}/
├── .capability-development/           # Orchestration artifacts
│   ├── MANIFEST.yaml               # Capability metadata, status, metrics
│   ├── progress.md                 # Session progress tracking
│   ├── skill-manifest.yaml         # Phase 4: Technology-to-skill mapping
│   ├── discovery.md                # Phase 3: Codebase patterns
│   ├── architecture-plan.md        # Phase 7: Technical design (Part 1)
│   ├── plan.md                     # Phase 7: Implementation tasks (Part 2)
│   ├── feedback-scratchpad.md      # Tight feedback loop iteration history
│   ├── spec-compliance-review.md   # Phase 11: Stage 1 review output
│   ├── capability-review.md        # Phase 11: Stage 2 capability review
│   ├── test-plan.md                # Phase 12: Test strategy
│   ├── coverage-report.md          # Phase 14: Coverage verification
│   └── agents/                     # Individual agent outputs
│       ├── capability-lead.md
│       ├── security-lead.md
│       ├── capability-developer.md
│       ├── capability-reviewer.md
│       └── ...
└── [capability artifacts]          # Actual implementation files (VQL/YAML/Go)
```

## MANIFEST.yaml Structure

```yaml
capability:
  name: "s3-credential-scanner"
  description: "Detect exposed AWS credentials in S3 buckets"
  type: "VQL" # VQL | Nuclei | Janus | Fingerprintx | Scanner
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
  agent_spawns: 9
  retry_count: 1

technologies_detected:
  - "VQL"
  - "Go (collector)"
  - "Velociraptor artifacts"

quality:
  detection_accuracy: 0.96
  false_positive_rate: 0.03
  platform_coverage: ["windows", "linux"]

review:
  stage1:
    verdict: "SPEC_COMPLIANT"
    agent: "capability-reviewer"
  stage2:
    quality:
      verdict: "APPROVED"
      score: 88
```

## File Naming Conventions

| File Type       | Pattern                   | Example                     |
| --------------- | ------------------------- | --------------------------- |
| Phase output    | `phase-{N}-{name}.md`     | `phase-7-architecture.md`   |
| Agent output    | `{agent-type}.md`         | `capability-developer.md`   |
| Review output   | `{review-type}-review.md` | `capability-review.md`      |
| Capability file | `{capability-name}.{ext}` | `s3-credential-scanner.vql` |

## Output Directory Discovery

**Phase 1 discovers the output directory using `persisting-agent-outputs` skill:**

```bash
# Standard location for capability-development artifacts
OUTPUT_DIR=".capability-development"

# Verify exists
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/agents"
```

**Note:** All orchestration artifacts are stored in `.capability-development/` to keep them separate from the actual capability implementation files.

## Phase Output Mapping

| Phase | Primary Output         | Location                          |
| ----- | ---------------------- | --------------------------------- |
| 3     | Codebase discovery     | `discovery.md`                    |
| 4     | Skill manifest         | `skill-manifest.yaml`             |
| 7     | Architecture + Plan    | `architecture-plan.md`, `plan.md` |
| 8     | Implementation summary | `agents/capability-developer.md`  |
| 11    | Review results         | `*-review.md` files               |
| 12    | Test plan              | `test-plan.md`                    |
| 14    | Coverage report        | `coverage-report.md`              |

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Initial directory creation
- [Progress Persistence](progress-persistence.md) - Cross-session state tracking
- [MANIFEST.yaml Updates](phase-16-completion.md) - Final status updates
