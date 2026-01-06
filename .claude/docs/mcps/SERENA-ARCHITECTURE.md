# Serena MCP Architecture

## The Problem

The Chariot Development Platform is a **super-repository** containing 16 Git submodules across 4 languages (Go, TypeScript, Python, Rust). This creates a fundamental conflict with Serena's architecture:

**Serena's Limitation** (GitHub Issue #474): Serena only supports **one active project at a time**. You cannot query multiple modules simultaneouslyswitching projects requires killing and respawning the LSP connection.

**Super-Repo Reality**: A single conversation may touch code in `modules/chariot` (Go + TypeScript), `modules/nebula` (Go), `modules/noseyparker` (Rust), and `.claude/tools/` (TypeScript) within minutes.

**Without Optimization**:

- Every module switch = 5-15 second cold start (LSP initialization)
- No intelligent routing = 60-second timeout as Serena searches entire super-repo
- Path confusion = Serena errors on super-repo infrastructure files (`.claude/`, `docs/`)

**The Core Challenge**: Make Serena feel like a unified semantic code tool across 16 modules despite its single-project constraint.

---

## The Solution: Super-Repo Serena Architecture

We implemented a three-layer architecture that makes Serena work efficiently in super-repo contexts:

```

                          Claude Code Session
                         (User or Agent Request)

                       "Find the Asset handler in the backend"


                    Layer 1: Serena Enforcement Hook
                    (.claude/hooks/enforce-serena.sh)

   Intercepts Grep/Search on code files (*.ts, *.go, *.py, etc.)
   Blocks with guidance: "Use Serena find_symbol instead"
   Auto-generates semanticContext from search parameters
   100% deterministic enforcement via PreToolUse hook

                       Agent calls Serena wrapper with semanticContext


                    Layer 2: Semantic Router
                    (.claude/tools/serena/semantic-router.ts)

   Analyzes semanticContext to determine target module
   Scoring: module name (+20) > routing hints (+10) > concerns (+5)
   Falls back to default_module (chariot) if no match
   Returns scoped --project argument for Serena

                       Routed to: modules/chariot (matched: "backend", "handler")


                    Layer 3: Connection Pool
                    (.claude/tools/config/lib/serena-pool.ts)

   Maintains warm connection with module affinity
   Same module call: ~2ms (reuse connection)
   Different module: ~3-5s (kill, respawn, re-index)
   Circuit breaker: Opens after 5 failures  60s cooldown
   TTL cleanup: 5 minutes idle  release resources

                       Warm connection to chariot module


                    Serena MCP Server
                    (uvx serena start-mcp-server)

   LSP-based semantic code analysis (pyright, gopls, tsserver)
   Symbol operations: find, reference, rename, replace
   Project memory: persistent knowledge across sessions
   Single-project constraint: only one module indexed at a time

```

### Performance Impact

| Scenario                | Without Architecture | With Architecture | Improvement  |
| ----------------------- | -------------------- | ----------------- | ------------ |
| Cold start (first call) | 60s timeout          | 5-10s (routed)    | 6-12x        |
| Warm call (same module) | 5-15s                | ~2ms              | 2500-7500x   |
| 10 calls to same module | 50-150s              | ~5s               | 10-30x       |
| Cross-module workflow   | Timeout/fail         | 15-30s            | Works at all |

---

## Layer 1: Serena Enforcement Hook

### Purpose

Ensure all code searches use Serena's semantic capabilities instead of text-based Grep/Search.

### Location

`.claude/hooks/enforce-serena.sh` - Registered as PreToolUse hook in `.claude/settings.json`

### How It Works

```

                         PreToolUse Hook Flow


  1. Claude calls Grep with pattern="handleAsset", glob="*.go"

  2. Hook intercepts (matcher: "Grep|Search")

  3. Hook analyzes:
      Is glob a code extension? (.ts, .go, .py, etc.)  YES
      Is path in source directory? (/src/, /pkg/, etc.)  YES
      Is pattern code-like? (func, class, interface)  YES

  4. Hook BLOCKS with permissionDecision: "deny"

  5. Hook provides guidance:

      Code searches must use Serena MCP for semantic search.

      Use: serena.find_symbol({
        name_path_pattern: "handleAsset",
        semanticContext: "Find handleAsset in Go backend"
      })


  6. Claude retries with Serena wrapper  SUCCESS


```

### Detection Heuristics

The hook uses three layers of detection to identify code searches:

| Layer               | Check                  | Examples                                                 |
| ------------------- | ---------------------- | -------------------------------------------------------- |
| **Glob pattern**    | File extension regex   | `*.ts`, `*.go`, `*.py`, `*.java`, `*.rs`                 |
| **Path pattern**    | Source directory names | `/src/`, `/lib/`, `/pkg/`, `/cmd/`, `/components/`       |
| **Pattern content** | Code-like keywords     | `class `, `interface `, `function `, `const `, `export ` |

### Configuration

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Grep|Search",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/enforce-serena.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Layer 2: Semantic Router

### Purpose

Analyze user/agent intent to determine which module should be queried, enabling intelligent routing in a super-repo.

### Location

`.claude/tools/serena/semantic-router.ts`

### Routing Algorithm

```typescript
// Scoring weights (higher = stronger signal)
const WEIGHTS = {
  MODULE_NAME_MENTION: 20, // "fix the chariot backend"
  ROUTING_HINT_KEYWORD: 10, // "react"  chariot (from routing_hints)
  CONCERN_MATCH: 5, // "frontend"  chariot (from concerns)
  LANGUAGE_MENTION: 3, // "typescript"  modules with TS
};

// Analysis flow
function analyzeIntent(query: string, config: SuperRepoConfig): ModuleScope[] {
  const scores = new Map<string, number>();

  for (const [moduleName, module] of Object.entries(config.modules)) {
    let score = 0;

    // Direct module name mention (strongest signal)
    if (query.toLowerCase().includes(moduleName)) {
      score += WEIGHTS.MODULE_NAME_MENTION;
    }

    // Routing hint keywords
    for (const [keyword, modules] of Object.entries(config.routing_hints)) {
      if (query.includes(keyword) && modules.includes(moduleName)) {
        score += WEIGHTS.ROUTING_HINT_KEYWORD;
      }
    }

    // Concern matching
    for (const concern of module.concerns) {
      if (query.includes(concern)) {
        score += WEIGHTS.CONCERN_MATCH;
      }
    }

    // Language mention
    for (const lang of module.languages) {
      if (query.includes(lang)) {
        score += WEIGHTS.LANGUAGE_MENTION;
      }
    }

    scores.set(moduleName, score);
  }

  // Return sorted by score, filter zero scores
  return [...scores.entries()]
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score, ...config.modules[name] }));
}
```

### Routing Examples

| Query                                 | Matched Module               | Score Breakdown                           |
| ------------------------------------- | ---------------------------- | ----------------------------------------- |
| "Find Asset class in chariot backend" | `chariot`                    | name(+20) + concern "backend"(+5) = 25    |
| "Fix React component rendering"       | `chariot`                    | routing_hint "react"(+10) = 10            |
| "Update VQL capability"               | `chariot-aegis-capabilities` | routing_hint "vql"(+10) = 10              |
| "Debug cloud scanning issue"          | `nebula`                     | concern "cloud"(+5) + "scanning"(+5) = 10 |
| "Fix secret detection"                | `noseyparker`                | routing_hint "secret"(+10) = 10           |
| "Generic code question"               | `chariot`                    | default_module fallback                   |

### Configuration

```yaml
# .serena/project.yml
name: chariot-development-platform
type: super-repo
default_module: chariot

modules:
  chariot:
    path: modules/chariot
    languages: [go, typescript]
    concerns: [backend, frontend, api, lambda, dynamodb, neo4j, react, ui]

  nebula:
    path: modules/nebula
    languages: [go]
    concerns: [cloud, scanning, aws, azure, gcp, security]

  noseyparker:
    path: modules/noseyparker
    languages: [rust]
    concerns: [secrets, scanning, detection]

  chariot-aegis-capabilities:
    path: modules/chariot-aegis-capabilities
    languages: [vql]
    concerns: [capabilities, velociraptor, security]

  claude:
    path: .claude
    languages: [typescript]
    concerns: [mcp, tools, skills, agents]

  # ... 16 total modules

routing_hints:
  react: [chariot]
  lambda: [chariot]
  dynamodb: [chariot]
  neo4j: [chariot]
  cloud: [nebula]
  aws: [nebula]
  azure: [nebula]
  gcp: [nebula]
  secret: [noseyparker, noseyparkerplusplus]
  vql: [chariot-aegis-capabilities]
  mcp: [claude]
  wrapper: [claude]
```

---

## Layer 3: Connection Pool

### Purpose

Maintain warm connections to Serena to avoid cold start latency on every call.

### Location

`.claude/tools/config/lib/serena-pool.ts`

### Architecture

```

                         Connection Pool State Machine



           disconnected
       (no active connection)

                   acquire(targetModule)


            connecting          error
       (spawning uvx serena)
       (initializing LSP)

                   connected


               idle
      (awaiting next call)
      currentModule: chariot




       same module            different module

     in_use              switching
    (fast path)      (kill + respawn)
      ~2ms              ~3-5s


          release()


              expired
       (5 consecutive errors
        OR 5 min idle timeout
        OR 1000 calls limit)



```

### Key Features

| Feature               | Implementation           | Purpose                               |
| --------------------- | ------------------------ | ------------------------------------- |
| **Module Affinity**   | `currentModule` tracking | Reuse warm connection for same module |
| **Async Mutex**       | `async-mutex` package    | Serialize concurrent acquire calls    |
| **TTL Cleanup**       | 5-minute idle timeout    | Release resources when not in use     |
| **Circuit Breaker**   | Opens after 5 failures   | Prevent cascade failures              |
| **Max Calls**         | 1000 per connection      | Prevent memory leaks                  |
| **Health Check**      | Transport validation     | Detect dead connections               |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers  | Clean process exit                    |

### Circuit Breaker Pattern

```typescript
// Protection against cascade failures
class SerenaPoolImpl {
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  async acquire(targetModule: string): Promise<Client> {
    // Check circuit breaker
    if (Date.now() < this.circuitOpenUntil) {
      throw new Error(`Circuit breaker OPEN until ${new Date(this.circuitOpenUntil)}`);
    }

    try {
      const client = await this.connect(targetModule);
      this.consecutiveFailures = 0; // Reset on success
      return client;
    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 5) {
        this.circuitOpenUntil = Date.now() + 60_000; // Open for 60s
        throw new Error("Circuit breaker OPENED after 5 consecutive failures");
      }

      throw error;
    }
  }
}
```

### Performance Characteristics

| Metric                    | Value      | Notes                         |
| ------------------------- | ---------- | ----------------------------- |
| Cold start                | 5-15s      | LSP initialization per module |
| Warm call (same module)   | ~2ms       | Connection reuse              |
| Module switch             | 3-5s       | Kill + respawn + re-index     |
| Circuit breaker threshold | 5 failures | Opens for 60 seconds          |
| Idle TTL                  | 5 minutes  | Releases after inactivity     |
| Max calls per connection  | 1000       | Prevents memory leaks         |

### Path-Based Routing (2026-01-04)

The connection pool now uses **absolute paths** for Serena CLI invocation instead of project names. This enables routing to any module defined in `.serena/project.yml` without requiring pre-registration in Serena's global config.

#### Before (broken)

```typescript
// serena-pool.ts (line 374)
'--project', targetModule,  // Module NAME (e.g., "fingerprintx")
```

- Pool passed module NAME to `--project` flag
- Serena expected name in `~/.serena/serena_config.yml`
- **Error**: `"Project 'fingerprintx' not found"`
- Only worked for pre-registered projects (chariot, nebula, tabularium)

#### After (fixed)

```typescript
// serena-pool.ts
async acquire(
  targetModule: string,    // For affinity tracking
  targetPath: string,      // For Serena CLI
  env: Record<string, string>
): Promise<Client>

// createConnection()
'--project', targetPath,  // Absolute PATH (e.g., "/path/to/modules/fingerprintx")
```

- Pool passes absolute PATH to `--project` flag
- Serena accepts paths directly
- **Works for all 21+ modules** without pre-registration
- Module name still used for connection affinity tracking

#### Implementation

```typescript
// mcp-client.ts: Computes absolute path from routing result
const routing = routeToSerena(semanticContext, projectRoot);
const targetModule = routing.primaryModule; // Name for affinity
const targetPath =
  routing.allMatches.length > 0
    ? path.join(projectRoot, routing.allMatches[0].path) // Absolute path
    : projectRoot; // Fallback

await serenaPool.acquire(targetModule, targetPath, env);
```

#### Design Rationale

| Decision                        | Rationale                                                 |
| ------------------------------- | --------------------------------------------------------- |
| Keep NAME for affinity tracking | Pool uses name to detect same-module calls for warm reuse |
| Add PATH for Serena CLI         | Absolute paths work without pre-registration              |
| Minimal API change              | Add `targetPath` parameter, don't replace `targetModule`  |
| Fallback to projectRoot         | If routing returns no matches, use project root path      |

---

## Path Guard

### Purpose

Prevent confusing Serena errors on super-repo infrastructure paths that aren't part of any module.

### Location

`.claude/tools/serena/path-guard.ts`

### Protected Paths

```typescript
export const SUPER_REPO_PREFIXES = [
  "docs/", // Documentation (not code)
  "scripts/", // Shell scripts (not LSP-indexable)
  ".serena/", // Serena config (meta, not code)
  ".github/", // GitHub workflows
  ".githooks/", // Git hooks
] as const;
```

### What's NOT Protected

The following paths ARE valid Serena targets:

| Path              | Module   | Reason                               |
| ----------------- | -------- | ------------------------------------ |
| `.claude/tools/`  | `claude` | TypeScript wrappers - valid code     |
| `.claude/skills/` | `claude` | Skill definitions with code examples |
| `modules/*`       | Various  | All submodule code                   |

### Guard Logic

```typescript
export function isSuperRepoPath(path: string): boolean {
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");

  // Check for explicit super-repo prefixes
  if (SUPER_REPO_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return true;
  }

  // Check for root-level files (not in modules)
  if (!normalizedPath.includes("/") && !normalizedPath.startsWith(".claude")) {
    return true; // e.g., go.work, Makefile, CLAUDE.md
  }

  return false;
}
```

---

## Serena Wrappers

### Location

`.claude/tools/serena/` - 23 TypeScript wrappers

### Wrapper Categories

| Category              | Wrappers                                                                                                                                                 | Purpose                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Symbol Operations** | `find-symbol`, `get-symbols-overview`, `find-referencing-symbols`, `replace-symbol-body`, `insert-after-symbol`, `insert-before-symbol`, `rename-symbol` | LSP-based semantic code navigation and editing |
| **Memory System**     | `write-memory`, `read-memory`, `list-memories`, `delete-memory`, `edit-memory`                                                                           | Persistent project knowledge across sessions   |
| **File/Search**       | `list-dir`, `find-file`, `search-for-pattern`                                                                                                            | Project-aware file operations                  |
| **Config**            | `activate-project`, `get-current-config`                                                                                                                 | Project switching and status                   |
| **Workflow**          | `onboarding`, `initial-instructions`, `check-onboarding-performed`, `think-about-collected-information`, `think-about-task`, `think-about-verification`  | Guided analysis and reasoning helpers          |

### Wrapper Anatomy

```typescript
// .claude/tools/serena/find-symbol.ts

import { z } from "zod";
import { callMCPTool } from "../config/lib/mcp-client.js";
import { validateNoPathTraversal, validateNoControlChars } from "../config/lib/sanitize.js";
import { createPathGuardRefinement } from "./path-guard.js";

// 1. Input validation with security checks
const InputSchema = z.object({
  name_path_pattern: z
    .string()
    .min(1, "name_path_pattern cannot be empty")
    .refine((val) => {
      validateNoPathTraversal(val); // Security: block ../
      validateNoControlChars(val); // Security: block null bytes
      return true;
    }),
  relative_path: z.string().optional().superRefine(createPathGuardRefinement("find_symbol")), // Super-repo guard
  semanticContext: z.string().optional(), // For routing
  include_body: z.boolean().optional().default(false),
  include_kinds: z.array(z.number()).optional(),
  depth: z.number().optional().default(0),
});

// 2. LSP Symbol Kind mapping
export const SymbolKind = {
  File: 1,
  Module: 2,
  Namespace: 3,
  Package: 4,
  Class: 5,
  Method: 6,
  Property: 7,
  Field: 8,
  Constructor: 9,
  Enum: 10,
  Interface: 11,
  Function: 12,
  Variable: 13,
  Constant: 14,
  String: 15,
  Number: 16,
  Boolean: 17,
  Array: 18,
  Object: 19,
} as const;

// 3. Exported wrapper
export const findSymbol = {
  name: "serena.find_symbol",
  description: "Find symbols matching a name/path pattern using LSP semantic search",
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>) {
    const validated = InputSchema.parse(input);

    // 4. Call MCP through connection pool with semantic routing
    const result = await callMCPTool(
      "serena", // MCP server name
      "find_symbol", // Tool name
      {
        name_path_pattern: validated.name_path_pattern,
        relative_path: validated.relative_path,
        include_body: validated.include_body,
        depth: validated.depth,
      },
      {
        semanticContext: validated.semanticContext, // For router
      }
    );

    // 5. Filter and return (token optimization)
    return {
      symbols: result.symbols.map((s) => ({
        name_path: s.name_path,
        kind: s.kind,
        kindName: SymbolKind[s.kind] ?? "Unknown",
        relative_path: s.relative_path,
        body_location: s.body_location,
        body: validated.include_body ? s.body : undefined,
      })),
      tokenEstimate: estimateTokens(result),
    };
  },
};
```

### semanticContext Parameter

The `semanticContext` parameter is **critical** for super-repo routing:

```typescript
// Without semanticContext: Serena searches ALL modules (60s timeout)
await findSymbol.execute({
  name_path_pattern: "Asset",
});

// With semanticContext: Router targets specific module (5-10s)
await findSymbol.execute({
  name_path_pattern: "Asset",
  semanticContext: "Find Asset class in chariot backend API handlers",
});
```

| Pattern             | Best Practice                              |
| ------------------- | ------------------------------------------ |
| Include module name | "Find X in **chariot** backend"            |
| Include technology  | "Find **React** component for Y"           |
| Include domain      | "Find **cloud scanning** function"         |
| Be specific         | "Asset handler in Go API" not "find asset" |

---

## Testing Infrastructure

### Location

`.claude/lib/testing/` - Shared testing utilities

### Serena-Specific Test Utilities

```typescript
// Response builders for Serena mocks
import { SerenaResponses } from "@claude/testing";

// Symbol search results
const symbols = SerenaResponses.findSymbol([
  { name_path: "Asset/GetByID", kind: 6, relative_path: "pkg/asset/handler.go" },
  { name_path: "Asset/Create", kind: 6, relative_path: "pkg/asset/handler.go" },
]);

// Empty search results
const empty = SerenaResponses.emptySymbolSearch();

// Symbol with body content
const withBody = SerenaResponses.symbolWithBody(
  "handleAsset",
  "func handleAsset(ctx context.Context) error { ... }"
);

// Onboarding status
const onboarding = SerenaResponses.onboardingPerformed(true);
```

### Running Serena Tests

```bash
cd .claude

# All Serena wrapper tests
npm run test:run -- tools/serena

# Specific wrapper
npm run test:run -- tools/serena/find-symbol

# With coverage
npm run test:coverage -- tools/serena
```

### Test Categories

| Category               | Purpose                   | Example                        |
| ---------------------- | ------------------------- | ------------------------------ |
| **Input Validation**   | Zod schema enforcement    | Empty pattern rejection        |
| **Security**           | Path traversal, injection | `../../../etc/passwd` blocked  |
| **Path Guard**         | Super-repo protection     | `.github/` paths blocked       |
| **Response Filtering** | Token optimization        | Only requested fields returned |
| **Error Handling**     | MCP failures              | Timeout, connection errors     |
| **Edge Cases**         | Unicode, special chars    | Non-ASCII symbol names         |

---

## Session Warm-Up

### Purpose

Pre-warm Serena connection at session start to reduce first-call latency.

### Location

`.claude/hooks/serena-warmup.sh` - Spawned by `session-start.sh`

### How It Works

```bash
# session-start.sh sets SERENA_HOME to project-local config FIRST
# This ensures warmup uses shared, version-controlled settings
export SERENA_HOME="${SCRIPT_DIR_EARLY}/../.serena"

# Then spawns warmup in background (non-blocking)
(nohup "${SCRIPT_DIR}/serena-warmup.sh" &>/dev/null &)

# serena-warmup.sh calls Serena to populate caches
# Serena reads config from $SERENA_HOME (project-local, not ~/.serena/)
uvx serena start-mcp-server \
  --context claude-code \
  --project "${PROJECT_ROOT}/modules/chariot"
```

### SERENA_HOME Integration

The `SERENA_HOME` environment variable is set **before** the warmup spawns, ensuring:

| Aspect         | Behavior                                            |
| -------------- | --------------------------------------------------- |
| Config source  | `.claude/.serena/serena_config.yml` (project-local) |
| Logs location  | `.claude/.serena/logs/` (gitignored)                |
| Settings       | Shared between all developers                       |
| Setup required | None - automatic via session hook                   |

### Limitations

| What It Warms          | What It Can't Warm                  |
| ---------------------- | ----------------------------------- |
| `uvx` package cache    | Claude's TypeScript connection pool |
| Python dependencies    | Node.js singleton state             |
| LSP for default module | Connections for other modules       |

### Log Location

`.claude/.serena-warmup.log` - Contains timing and status

---

## Security Considerations

### Input Validation

All Serena wrappers validate inputs using Zod + security helpers:

```typescript
import { validateNoPathTraversal, validateNoControlChars } from "../config/lib/sanitize.js";

const InputSchema = z.object({
  name_path_pattern: z.string().refine((val) => {
    validateNoPathTraversal(val); // Blocks: ../../../etc/passwd
    validateNoControlChars(val); // Blocks: null bytes, control chars
    return true;
  }),
});
```

### Path Guard Protection

Super-repo infrastructure is protected from accidental Serena queries:

| Protected  | Not Protected     | Reason                         |
| ---------- | ----------------- | ------------------------------ |
| `docs/`    | `.claude/tools/`  | Docs aren't code; tools are    |
| `.github/` | `modules/*`       | Workflows aren't LSP-indexable |
| `scripts/` | `.claude/skills/` | Shell scripts vs TypeScript    |

### Response Size Limits

```typescript
// .claude/tools/config/lib/mcp-client.ts
export const SERVICE_SIZE_LIMITS: Record<string, number> = {
  serena: 5_000_000, // 5MB - symbol bodies can be large
};
```

### Timeout Protection

All Serena calls have a 30-second timeout to prevent hanging:

```typescript
const result = await withTimeout(
  callMCPTool("serena", "find_symbol", params),
  30_000, // 30 seconds
  "Serena find_symbol timed out"
);
```

---

## Configuration Reference

### Configuration Files Relationship

There are **three configuration files** in the Serena architecture:

| File                                | Location        | Purpose                                                 | Version Controlled |
| ----------------------------------- | --------------- | ------------------------------------------------------- | ------------------ |
| `.serena/project.yml`               | Super-repo root | Semantic routing - maps modules to keywords/concerns    | Yes                |
| `.claude/.serena/serena_config.yml` | Project         | Shared Serena settings (log level, dashboard, timeouts) | Yes                |
| `~/.serena/serena_config.yml`       | User home       | User-specific overrides (optional)                      | No                 |

**Project-Local Config via SERENA_HOME (2026-01-04):**

The `session-start.sh` hook sets `SERENA_HOME` to `.claude/.serena/`, making Serena use project-local config:

```bash
# .claude/hooks/session-start.sh
export SERENA_HOME="${SCRIPT_DIR_EARLY}/../.serena"
```

This ensures:

- **Version controlled** - settings travel with the codebase
- **Shared between developers** - consistent configuration
- **No manual setup** - automatic via session hook

**Configuration flow:**

```

                         Configuration Flow


  1. Session starts  hook sets SERENA_HOME=.claude/.serena/

  2. User query: "Find Asset in chariot backend"

  3. Semantic Router reads .serena/project.yml (routing config)
      Matches "chariot" + "backend"  chariot module
      Returns: { name: "chariot", path: "modules/chariot" }

  4. Connection Pool computes absolute path
      /path/to/chariot-development-platform/modules/chariot

  5. Serena CLI receives --project /absolute/path/to/chariot
      Auto-registers project, then activates (path-based routing)

  6. Serena reads settings from .claude/.serena/serena_config.yml


```

**What's version controlled:**

| File                                | Contents                                      | Shared |
| ----------------------------------- | --------------------------------------------- | ------ |
| `.serena/project.yml`               | Module routing rules, keywords, concerns      |        |
| `.claude/.serena/serena_config.yml` | Log level, dashboard, timeouts, tool settings |        |

**What's NOT version controlled:**

| Directory                           | Contents     | Why               |
| ----------------------------------- | ------------ | ----------------- |
| `.claude/.serena/logs/`             | Session logs | Machine-specific  |
| `.claude/.serena/*.db`              | Caches       | Machine-specific  |
| `.claude/.serena/language_servers/` | LSP binaries | Platform-specific |

**Note on projects list:**

The `projects: []` list in the shared config is intentionally empty. With path-based routing, projects auto-register on first access. This avoids hardcoding absolute paths that differ between developers.

---

### .serena/project.yml

Complete super-repo configuration:

```yaml
name: chariot-development-platform
type: super-repo
default_module: chariot

modules:
  # Core platform
  chariot:
    path: modules/chariot
    languages: [go, typescript]
    concerns: [backend, frontend, api, lambda, dynamodb, neo4j, react, ui, security]

  # Cloud scanning
  nebula:
    path: modules/nebula
    languages: [go]
    concerns: [cloud, scanning, aws, azure, gcp, security, posture]

  # Secret detection
  noseyparker:
    path: modules/noseyparker
    languages: [rust]
    concerns: [secrets, scanning, detection, regex]

  noseyparkerplusplus:
    path: modules/noseyparkerplusplus
    languages: [rust]
    concerns: [secrets, scanning, enhanced]

  # Security capabilities
  chariot-aegis-capabilities:
    path: modules/chariot-aegis-capabilities
    languages: [vql]
    concerns: [capabilities, velociraptor, security, scanning]

  # Tool framework
  janus:
    path: modules/janus
    languages: [go]
    concerns: [tools, orchestration, framework]

  janus-framework:
    path: modules/janus-framework
    languages: [go]
    concerns: [framework, library, tools]

  # Data schema
  tabularium:
    path: modules/tabularium
    languages: [go, typescript, python]
    concerns: [schema, models, codegen]

  # CLI
  praetorian-cli:
    path: modules/praetorian-cli
    languages: [python]
    concerns: [cli, sdk, api]

  # Claude infrastructure
  claude:
    path: .claude
    languages: [typescript]
    concerns: [mcp, tools, skills, agents, wrappers]

  # ... additional modules

routing_hints:
  # Technology  Module mapping
  react: [chariot]
  lambda: [chariot]
  dynamodb: [chariot]
  neo4j: [chariot]

  # Cloud  Nebula
  cloud: [nebula]
  aws: [nebula]
  azure: [nebula]
  gcp: [nebula]

  # Secrets  Noseyparker
  secret: [noseyparker, noseyparkerplusplus]

  # Security  Aegis
  vql: [chariot-aegis-capabilities]
  velociraptor: [chariot-aegis-capabilities]
  capability: [chariot-aegis-capabilities]

  # MCP  Claude
  mcp: [claude]
  wrapper: [claude]
  skill: [claude]
```

### .claude/settings.json (Hooks)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Grep|Search",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/enforce-serena.sh"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting

### Common Issues

| Issue                       | Cause                              | Solution                                                       |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| 60-second timeout           | No `semanticContext` provided      | Add descriptive context to wrapper call                        |
| "Circuit breaker OPEN"      | 5 consecutive failures             | Wait 60s or check Serena installation                          |
| Path guard rejection        | Querying super-repo infrastructure | Use relative path within module                                |
| Wrong module targeted       | Ambiguous `semanticContext`        | Be more specific (include module name)                         |
| Cold start every call       | Module switching frequently        | Batch calls to same module                                     |
| ~~"Project 'X' not found"~~ | ~~Module not in global config~~    | **Fixed** (2026-01-04): Path-based routing uses absolute paths |

### Debugging

```bash
# Check Serena warmup status
cat .claude/.serena-warmup.log

# Test semantic router
npx tsx -e "
  import { routeToSerena } from './.claude/tools/serena/semantic-router.ts';
  const result = routeToSerena('find Asset in backend', '.');
  console.log(JSON.stringify(result, null, 2));
"

# Check connection pool health
# (Add healthCheck() call to wrapper)
```

### Performance Monitoring

| Metric                | How to Check              | Target |
| --------------------- | ------------------------- | ------ |
| First call latency    | Warmup log timestamp      | <10s   |
| Warm call latency     | Console timing            | <100ms |
| Module switch time    | Log delta between modules | <5s    |
| Circuit breaker trips | Error logs                | 0      |

---

## References

### Internal Documentation

- **MCP Tools Architecture**: `.claude/docs/mcps/MCP-TOOLS-ARCHITECTURE.md`
- **Connection Pool Design**: `.claude/tools/serena/CONNECTION-POOL-DESIGN.md`
- **Semantic Router**: `.claude/tools/serena/semantic-router.ts`
- **Path Guard**: `.claude/tools/serena/path-guard.ts`
- **Serena Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md`
- **Enforcement Hook**: `.claude/hooks/enforce-serena.sh`
- **Super-repo Config**: `.serena/project.yml`

### External Documentation

- [Serena GitHub Repository](https://github.com/oraios/serena)
- [Serena Issue #474 - Multi-project support](https://github.com/oraios/serena/issues/474)
- [Serena Issue #890 - Large codebase performance](https://github.com/oraios/serena/issues/890)
- [Serena Documentation](https://oraios.github.io/serena/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

### Research

- **Enforcing Serena Usage**: `.claude/.output/research/2026-01-01-172725-enforcing-serena-usage/`
- **Agent Integration Practices**: `.claude/.output/research/2026-01-01-121439-serena-mcp-agent-integration-practices/`
- **Monorepo Performance**: `.claude/.output/research/2026-01-01-141505-serena-mcp-monorepo-performance/`

---

## Current Issues & Challenges (2026-01-04)

### Status: SERENA DISABLED

Serena MCP integration has been **temporarily disabled** due to unresolved performance and architectural issues in the super-repo context.

**Disabled in:**

- `.claude/hooks/session-start.sh` - Startup commented out
- `.claude/settings.json` - `enforce-serena.sh` hook removed

### Root Cause Analysis

A systematic debugging investigation revealed fundamental architectural problems:

#### Issue 1: Process Lifecycle Mismatch (CRITICAL)

**The Designed Architecture (Assumed):**

```
Long-running Node.js process

Singleton pool persists across calls

Connection reuse  ~2ms warm calls
```

**The Actual Architecture (Reality):**

```
Each wrapper call: npx tsx -e "..."

Fresh Node.js process (pool = null)

Fresh Serena connection  5-60s EVERY call
```

**Evidence:**

- `serena-pool.ts:567-584` - Singleton is process-scoped (`let _singletonPool: SerenaPoolImpl | null = null`)
- Wrapper execution pattern: `npx tsx -e "(async () => { ... })()"`
- Each tool call spawns new process pool never persists warm starts impossible

**Impact:** The entire connection pool architecture is non-functional. Every call pays full cold start penalty.

#### Issue 2: gopls Performance Degradation (SEVERE)

Even with `GOWORK=off` and HTTP transport, Go queries had catastrophic performance:

| Metric       | Expected | Actual                   |
| ------------ | -------- | ------------------------ |
| Cold start   | 5-10s    | 60s+                     |
| Warm call    | 50-200ms | 30-60s (always cold)     |
| Simple query | <1s      | **38 minutes** (timeout) |

**Root Cause:**

- gopls requires `go.mod` at project root
- `modules/chariot` has NO `go.mod` (it's in `modules/chariot/backend/`)
- gopls walks up to super-repo root, finds `.git`, fails to initialize
- Even with correct path (`modules/chariot/backend`), queries returned 0 results or timed out

**Logs showed:**

```
ERROR: go: cannot find main module, but found .git/config in /Users/nathansportsman/chariot-development-platform2
ERROR: [Errno 48] address already in use (port conflicts)
INFO: Language server initialization completed in 1.477 seconds (TypeScript )
ERROR: TimeoutError after 38 minutes (Go )
```

### Attempted Fix: Streamable HTTP Transport

**Implementation Summary:**

- Migrated from subprocess spawning to HTTP-based persistent server
- Used Serena's `--transport streamable-http` mode
- Created `serena-http-client.ts` with session management
- Modified `mcp-client.ts` to use HTTP instead of pool

**Files Created/Modified:**

- `.claude/tools/config/lib/serena-http-client.ts` - HTTP client (21 tests passing)
- `.claude/tools/config/lib/mcp-client.ts` - Serena path using HTTP
- `.claude/hooks/session-start.sh` - Start Serena in Streamable HTTP mode
- `.claude/tools/config/lib/serena-pool.ts` - Deprecated

**Validation Results:**

| Component          | Status  | Performance                |
| ------------------ | ------- | -------------------------- |
| HTTP transport     | Working | 37ms health check          |
| Session management | Working | Session ID tracked         |
| TypeScript queries | Working | **~2s per query**          |
| Go queries         | Failed  | 0 results or 38min timeout |

**Why TypeScript worked but was still slow:**

- Node.js process startup: ~1s per call
- HTTP request overhead: ~0.5s
- Serena processing: ~0.5s
- **Total: ~2s per query** (vs expected 50-200ms)

The HTTP transport IS functional, but Node.js wrapper overhead prevents achieving the designed <200ms warm calls.

### Why Disabled

**Decision rationale:**

1. **Complexity not justified** - TypeScript queries work, but ~2s is only marginally better than Grep (~0.5-1s)
2. **Go support broken** - Primary use case (semantic Go code search) doesn't work
3. **Maintenance burden** - Complex HTTP client, session management, routing logic for minimal benefit
4. **Process model conflict** - Wrapper pattern fundamentally incompatible with warm connections

**Token efficiency vs performance trade-off:**

- Serena saves ~70% tokens (semantic vs full-file reading)
- But adds ~1-2s latency per query
- For small/medium files, Grep + Read is faster overall

### What Would Be Needed to Fix

To make Serena viable in this super-repo, we would need:

#### Option A: Native MCP Integration (Simple, Loses Wrapper Benefits)

```json
// .mcp.json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--project",
        "${workspaceFolder}/modules/chariot/ui",
        "--transport",
        "streamable-http"
      ]
    }
  }
}
```

**Trade-offs:**

- True warm connections (Claude manages process)
- ~50-200ms calls (no Node.js overhead)
- All tool schemas loaded upfront (~50-100K tokens)
- No response filtering (full responses)
- No semantic routing (manual `activate_project`)

#### Option B: Fix gopls for Super-Repo (Complex, Go-Specific)

**Required changes:**

1. Create `go.mod` at `modules/chariot/` root
2. OR configure gopls via `ls_specific_settings` to handle nested modules
3. OR run separate Serena instances per Go module
4. AND fix super-repo module resolution

**Effort:** High, Go tooling expertise required

#### Option C: Disable Go, TypeScript-Only (Pragmatic, Limited Scope)

- Keep HTTP transport for TypeScript
- Accept ~2s latency (vs 60s+ Go failures)
- Use standard Grep/Read for Go code

This was attempted but still deemed not worth the complexity.

### Lessons Learned

| Assumption                        | Reality                              | Impact                    |
| --------------------------------- | ------------------------------------ | ------------------------- |
| Process persists across calls     | Each call = new process              | Pool useless              |
| `GOWORK=off` fixes gopls          | gopls needs `go.mod` at root         | Go queries fail           |
| HTTP transport enables warm calls | Node.js overhead still ~1s           | Only marginal improvement |
| Token savings justify complexity  | 2s latency negates 70% token savings | Not worth it              |

### Recommendation

**For now:** Use standard Grep/Search/Read tools. They're simpler, faster for small files, and just work.

**For future:** If token efficiency becomes critical (huge files, limited context), revisit with:

- Native MCP integration (accept trade-offs)
- Or gopls-specific super-repo configuration
- Or TypeScript-only with native MCP

### Alternative: When Serena Is Worth It

Serena provides value when:

1. **Large files** - Reading 1000+ line files vs getting symbol overview
2. **Precise symbol editing** - Editing by symbol name vs line numbers
3. **Cross-session memory** - Persistent project knowledge
4. **Refactoring** - Rename symbol across codebase

For Chariot's current workflow (small targeted changes, documented architecture), standard tools suffice.

---

## Changelog

| Date       | Change                                                                                                        | Author            |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| 2025-01-04 | Initial architecture document                                                                                 | Claude (Opus 4.5) |
| 2025-01-04 | Resolved path guard conflict - `.claude/` now allowed                                                         | Claude (Opus 4.5) |
| 2025-01-04 | Added session warm-up implementation                                                                          | Claude (Opus 4.5) |
| 2026-01-04 | Path-based routing fix - pass absolute paths instead of module names                                          | Claude (Opus 4.5) |
| 2026-01-04 | Added configuration files relationship documentation                                                          | Claude (Opus 4.5) |
| 2026-01-04 | Project-local config via SERENA_HOME - version controlled, shared between developers                          | Claude (Opus 4.5) |
| 2026-01-04 | Updated Session Warm-Up section to document SERENA_HOME integration                                           | Claude (Opus 4.5) |
| 2026-01-04 | Added "Project not found" fix to Troubleshooting table                                                        | Claude (Opus 4.5) |
| 2026-01-04 | **SERENA DISABLED** - Added "Current Issues & Challenges" section documenting root causes and attempted fixes | Claude (Opus 4.5) |
