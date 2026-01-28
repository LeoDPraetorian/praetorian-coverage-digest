# Phase 1: Setup

**Create isolated workspace and initialize orchestration metadata for Brutus plugin development.**

---

## Overview

Phase 1 establishes the foundation:
- Isolated git worktree
- Output directory for agent artifacts
- MANIFEST.yaml for cross-session persistence
- TodoWrite items for phase tracking

**Exit Criteria:** Worktree created, MANIFEST.yaml initialized, tests passing.

---

## Steps

### 1. Create Worktree

```bash
PROTOCOL="{protocol_name}"
git worktree add .worktrees/${PROTOCOL}-brutus -b feature/${PROTOCOL}-plugin
cd .worktrees/${PROTOCOL}-brutus
```

### 2. Create Output Directory

```bash
mkdir -p .brutus-development/agents
```

### 3. Initialize MANIFEST.yaml

```yaml
feature_name: "{Protocol} Brutus Plugin"
feature_slug: "{protocol}-brutus"
orchestration_skill: "orchestrating-brutus-development"
created_at: "{timestamp}"
description: |
  Create Brutus credential testing plugin for {protocol} protocol.

status: "in-progress"
current_phase: 1
work_type: "pending"

phases:
  1_setup:
    status: "complete"
    completed_at: "{timestamp}"
  # ... remaining phases pending

worktree:
  path: ".worktrees/{protocol}-brutus"
  pre_feature_commit: "{commit-sha}"
```

### 4. Initialize TodoWrite

Create items for all 16 phases.

### 5. Verify Baseline

```bash
cd {BRUTUS_ROOT}
go test -short ./...
```

---

## MANIFEST Update

```yaml
phases:
  1_setup:
    status: "complete"
    completed_at: "{timestamp}"
    worktree_path: ".worktrees/{protocol}-brutus"
```

---

## Related

- [Phase 2: Triage](phase-2-triage.md) - Next phase
- [Directory Structure](directory-structure.md) - Workspace organization
