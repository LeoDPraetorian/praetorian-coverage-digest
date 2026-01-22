# Phase 1: Setup

Create SERVICE workspace (not per-tool):

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
SERVICE="{service}"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
WRAPPER_DIR="$ROOT/.claude/.output/mcp-wrappers/${TIMESTAMP}-${SERVICE}"
mkdir -p "$WRAPPER_DIR/tools"
```

Initialize MANIFEST.yaml for multi-tool tracking:

```json
{
  "service": "{service}",
  "created": "2025-01-02T...",
  "status": "in_progress",
  "batch_size": 3,
  "tools_discovered": 0,
  "tools_selected": 0,
  "tools": [],
  "worktree": {
    "path": ".worktrees/mcp-{service}",
    "pre_feature_commit": "{commit-sha}",
    "branch": "feature/mcp-{service}-wrapper"
  },
  "phases": {
    "setup": { "status": "complete" },
    "git_workspace_mcp_setup": { "status": "pending" },
    "tool_discovery": { "status": "pending" },
    "shared_architecture": { "status": "pending", "human_approved": false },
    "per_tool": {},
    "red_gate": { "status": "pending" },
    "green_gate": { "status": "pending" },
    "audit": { "status": "pending" },
    "pre_completion": { "status": "pending" },
    "branch_finalization": { "status": "pending" }
  }
}
```

**Create service package.json** for tool discoverability:

You MUST create `.claude/tools/{service}/package.json` to ensure the service appears in listings-tools output.

**Ask user for service description:**

Use AskUserQuestion to get a 50-80 character description that focuses on WHAT the service does for users (NOT implementation details like "MCP wrappers" or "token reduction").

**Good descriptions:**

- "Issue tracking and project management via Linear API"
- "Web search, research, reasoning, and conversational AI"
- "Browser automation, network inspection, debugging"

**Bad descriptions (reject these):**

- "MCP wrappers for Linear" ← implementation detail
- "Token-optimized Linear tools" ← implementation detail
- "Wrapper service" ← not user-facing

**Create the file:**

```bash
mkdir -p "$ROOT/.claude/tools/${SERVICE}"
cat > "$ROOT/.claude/tools/${SERVICE}/package.json" <<EOF
{
  "name": "@claude-tools/${SERVICE}",
  "version": "1.0.0",
  "description": "{user-provided-description}",
  "type": "module",
  "main": "index.ts",
  "exports": {
    ".": "./index.ts",
    "./*": "./*.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "zod": "^3.24.1"
  }
}
EOF
```

**Verify description quality checkpoint:**

Before proceeding past Phase 1, confirm with user that description is:

- 50-80 characters
- User-facing (describes what it does)
- NOT implementation details ("wrappers", "MCP", "token reduction")

If description fails these criteria, ask user to provide a better one.

**Exit criteria verification:**

- [ ] package.json exists at .claude/tools/{service}/package.json
- [ ] description field is populated (not empty, not placeholder)
- [ ] description is 50-80 characters
- [ ] description focuses on user value, not implementation

**Output:** Service workspace at `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/` with package.json created

# Git Workspace + MCP Setup

# Phase 1: Git Workspace Setup + MCP Setup

**Purpose:** Create isolated git worktree for MCP development and configure MCP server

**Execution:** Sequential - worktree first, then MCP

**Output:**

- Worktree at .worktrees/mcp-{service}/
- Feature branch: feature/mcp-{service}-wrapper
- MCP configured in mcp-client.ts

**REQUIRED SUB-SKILL:** using-git-worktrees (LIBRARY) - `Read('.claude/skill-library/workflow/using-git-worktrees/SKILL.md')`

## Step 1.1: Create Isolated Worktree

Follow using-git-worktrees skill protocol:

```bash
# Generate service name from user request
SERVICE_NAME=$(echo "$SERVICE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-30)

# Create worktree with feature branch
git worktree add .worktrees/mcp-$SERVICE_NAME -b feature/mcp-$SERVICE_NAME-wrapper
cd .worktrees/mcp-$SERVICE_NAME

# Run project setup (auto-detected)
npm install  # if package.json in .claude/tools/
```

## Step 1.2: Record Starting Point

Record pre-feature commit for potential rollback:

```bash
PRE_FEATURE_COMMIT=$(git rev-parse HEAD)
# Store in MANIFEST.yaml worktree.pre_feature_commit
```

## Step 1.3: Configure MCP Server

Use setting-up-mcp-servers skill (existing Phase 1 content):

```
skill: 'setting-up-mcp-servers'
```

Configure MCP in mcp-client.ts per skill guidance.

## Step 1.4: Verify Clean Baseline

```bash
# Verify existing tests pass before starting
cd .claude/tools
npm test  # Should show baseline passing
```

**User Opt-Out (Rare):** If user explicitly requests no worktree, document in MANIFEST.yaml: `worktree: 'opted-out-by-user'` and proceed in main workspace.
