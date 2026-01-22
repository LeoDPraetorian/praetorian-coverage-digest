# Phase 0: Setup

**Purpose:** Establish output directory structure and initialize workflow tracking before bug investigation begins.

## Prerequisites

Before starting this phase, invoke:

1. `persisting-agent-outputs` - Learn OUTPUT_DIR patterns
2. `using-todowrite` - Set up task tracking

## Step-by-Step Workflow

### 1. Create Output Directory

Create timestamped bug directory following persisting-agent-outputs conventions:

```bash
# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Sanitize bug name (lowercase, hyphens, remove special chars)
BUG_NAME="login-form-validation-error"  # example

# Create directory structure
OUTPUT_DIR=".claude/.output/bugs/${TIMESTAMP}-${BUG_NAME}"
mkdir -p "$OUTPUT_DIR"
```

### 2. Initialize Metadata

Create tracking file for phase progression:

```bash
cat > "$OUTPUT_DIR/metadata.json" <<'EOF'
{
  "skill": "orchestrating-bugfix",
  "bug_name": "login-form-validation-error",
  "created": "2026-01-15T10:30:00Z",
  "status": "phase_0_setup",
  "phases_completed": [],
  "current_phase": 0,
  "agents_spawned": [],
  "checkpoints": []
}
EOF
```

### 3. Initialize TodoWrite

Create comprehensive task list for all phases:

```javascript
TodoWrite([
  {
    content: "Phase 0: Setup output directory",
    status: "in_progress",
    activeForm: "Setting up output directory",
  },
  {
    content: "Phase 1-2: Bug scoping and discovery",
    status: "pending",
    activeForm: "Scoping and discovering bug",
  },
  {
    content: "Phase 3: Root cause investigation",
    status: "pending",
    activeForm: "Investigating root cause",
  },
  {
    content: "Phase 4: Implement fix with TDD",
    status: "pending",
    activeForm: "Implementing fix with TDD",
  },
  {
    content: "Phase 5: Verification and regression check",
    status: "pending",
    activeForm: "Verifying fix and checking regressions",
  },
]);
```

### 4. Document Bug Symptoms

Create initial bug report from user description:

```bash
cat > "$OUTPUT_DIR/bug-symptoms.md" <<'EOF'
# Bug Symptoms

## User Report

[Paste user's bug description here]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- Browser/Runtime: [if applicable]
- Version: [if applicable]
- OS: [if applicable]

## Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Error occurs]
EOF
```

## Output Files Created

After Phase 0:

```
.claude/.output/bugs/YYYYMMDD-HHMMSS-{bug-name}/
├── metadata.json           # Phase tracking
└── bug-symptoms.md         # Initial symptoms
```

## Validation

Before proceeding to Phase 1:

- [ ] OUTPUT_DIR exists
- [ ] metadata.json created with valid JSON
- [ ] TodoWrite initialized with all phases
- [ ] bug-symptoms.md contains user's description

## Common Issues

### Issue: Output directory already exists

**Symptom:** `mkdir: cannot create directory`

**Solution:** Use a more specific bug name or add microseconds to timestamp:

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S-%N | cut -c1-19)
```

### Issue: metadata.json format error

**Symptom:** Invalid JSON in metadata file

**Solution:** Validate JSON before writing:

```bash
echo "$JSON_CONTENT" | jq . > "$OUTPUT_DIR/metadata.json"
```

## Next Phase

Proceed to [Phase 1-2: Scoping and Discovery](phase-1-2-scoping-discovery.md)

## Related Patterns

- [persisting-agent-outputs](../../claude/skill-management/persisting-agent-outputs/SKILL.md) - Output directory conventions
- [using-todowrite](../../claude/using-todowrite/SKILL.md) - Task tracking patterns
