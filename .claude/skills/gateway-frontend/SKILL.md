---
name: gateway-frontend
description: Routes frontend tasks to library skills. Intent detection + progressive loading.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Gateway: Frontend

Routes frontend tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~400 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                                | Route To                                 |
| ---------------------------------------------------------- | ---------------------------------------- |
| "React 19" / "conventions" / "best practice"               | → `enforcing-react-19-conventions`       |
| "modern patterns" / "hooks" / "composition"                | → `using-modern-react-patterns`          |
| "infinite loop" / "useEffect" / "dependency"               | → `preventing-react-hook-infinite-loops` |
| "TanStack Query" / "server state" / "cache"                | → `using-tanstack-query`                 |
| "TanStack Table" / "data table" / "grid"                   | → `using-tanstack-table`                 |
| "TanStack Router" / "routing" / "navigation"               | → `using-tanstack-router`                |
| "Zustand" / "client state" / "store"                       | → `using-zustand-state-management`       |
| "Context API" / "provider" / "global state"                | → `using-context-api`                    |
| "form" / "validation" / "react-hook-form"                  | → `implementing-react-hook-form-zod`     |
| "Shadcn" / "UI components" / "radix"                       | → `using-shadcn-ui`                      |
| "performance" / "optimize" / "slow render"                 | → `optimizing-react-performance`         |
| "prefetch" / "route loading" / "navigation delay"          | → `prefetching-react-routes`             |
| "preload" / "resource" / "font" / "script" / "CDN"         | → `preloading-react-resources`           |
| "large data" / "1000+" / "virtualization"                  | → `optimizing-large-data-visualization`  |
| "interference" / "competing systems" / "async conflict"    | → `coordinating-competing-systems`       |
| "Sigma.js" / "graph viz" / "WebGL graph"                   | → `working-with-sigma-js`                |
| "E2E" / "Playwright" / "browser test"                      | → `frontend-e2e-testing-patterns`        |
| "component test" / "vitest" / "unit test"                  | → `frontend-testing-patterns`            |
| "styling" / "brand" / "colors" / "design"                  | → `chariot-brand-guidelines`             |
| "security" / "XSS" / "auth"                                | → `securing-react-implementations`       |
| "graph query" / "Neo4j" / "filter"                         | → `constructing-graph-queries`           |
| "Neo4j performance" / "slow query" / "PROFILE" / "db hits" | → `optimizing-neo4j-queries`             |
| "migrate" / "query builder" / "old format"                 | → `migrating-saved-queries`              |
| "architecture" / "state design"                            | → `architecting-state-management`        |
| "review" / "code review" / "PR review"                     | → `reviewing-frontend-implementations`   |
| "lint" / "eslint" / "code quality" / "before commit"       | → `using-eslint`                         |
| "testing" (general)                                        | → also invoke `gateway-testing`          |
| "TypeScript" / "types" / "Zod"                             | → also invoke `gateway-typescript`       |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Core Patterns

| Skill                          | Path                                                                                               | Triggers                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| React 19 Conventions           | `.claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md`               | React 19, conventions, RSC                                                  |
| Modern React Patterns          | `.claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md`                  | hooks, composition, patterns                                                |
| React Hook Infinite Loops      | `.claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md`         | infinite loop, useEffect, dependency                                        |
| React Performance              | `.claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md`                 | performance, optimize, slow                                                 |
| Prefetching React Routes       | `.claude/skill-library/development/frontend/prefetching-react-routes/SKILL.md`                     | prefetch, route loading, navigation delay, React Router                     |
| Preloading React Resources     | `.claude/skill-library/development/frontend/preloading-react-resources/SKILL.md`                   | preload, resource, font, script, CDN, prefetchDNS, preconnect               |
| Vite Build Optimization        | `.claude/skill-library/development/frontend/optimizing-vite-builds/SKILL.md`                       | vite, bundle, manualChunks, vendor, build, chunk                            |
| Large Data Visualization       | `.claude/skill-library/development/frontend/graphing/optimizing-large-data-visualization/SKILL.md` | large data, 1000+, virtualization, LOD                                      |
| Coordinating Competing Systems | `.claude/skill-library/development/frontend/graphing/coordinating-competing-systems/SKILL.md`      | interference, competing systems, async conflict, guard patterns, sequencing |
| Sigma.js Graph Visualization   | `.claude/skill-library/development/frontend/graphing/working-with-sigma-js/SKILL.md`               | Sigma.js, graph, WebGL, camera, layout                                      |

### State Management

| Skill                | Path                                                                                  | Triggers                         |
| -------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| TanStack Query       | `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md`            | TanStack Query, cache, fetch     |
| TanStack Table       | `.claude/skill-library/development/frontend/using-tanstack-table/SKILL.md`            | TanStack Table, grid, data table |
| TanStack Router      | `.claude/skill-library/development/frontend/using-tanstack-router/SKILL.md`           | TanStack Router, routing         |
| Zustand State        | `.claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md`  | Zustand, store, client state     |
| Context API          | `.claude/skill-library/development/frontend/using-context-api/SKILL.md`               | Context, provider, global state  |
| State Architecture   | `.claude/skill-library/development/frontend/architecting-state-management/SKILL.md`   | architecture, state design       |
| TanStack Integration | `.claude/skill-library/development/frontend/integrating-tanstack-components/SKILL.md` | TanStack, integration            |

### Forms & UI

| Skill                    | Path                                                                                     | Triggers                 |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------ |
| React Hook Form + Zod    | `.claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md`   | form, validation, zod    |
| Shadcn UI                | `.claude/skill-library/development/frontend/using-shadcn-ui/SKILL.md`                    | Shadcn, UI, radix        |
| Brand Guidelines         | `.claude/skill-library/development/frontend/chariot-brand-guidelines/SKILL.md`           | brand, colors, styling   |
| Animation Designer       | `.claude/skill-library/development/frontend/frontend-animation-designer/SKILL.md`        | animation, motion        |
| UI Component Migration   | `.claude/skill-library/development/frontend/migrating-chariot-ui-components/SKILL.md`    | migration, components    |
| Information Architecture | `.claude/skill-library/development/frontend/enforcing-information-architecture/SKILL.md` | IA, structure, hierarchy |

### Testing

| Skill                    | Path                                                                                | Triggers                 |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------ |
| E2E Testing Patterns     | `.claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md`     | E2E, Playwright, browser |
| Component Testing        | `.claude/skill-library/testing/frontend/frontend-testing-patterns/SKILL.md`         | component test, vitest   |
| Form Testing             | `.claude/skill-library/testing/frontend/frontend-interactive-form-testing/SKILL.md` | form test, input test    |
| Security E2E Testing     | `.claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md`   | security test, auth test |
| React Query Debugging    | `.claude/skill-library/testing/frontend/react-query-cache-debugging/SKILL.md`       | cache debug, query debug |
| Chrome Console Debugging | `.claude/skill-library/testing/frontend/debugging-chrome-console/SKILL.md`          | console, DevTools, debug |

### Testing Quality (Mandatory)

**Load these skills for ANY testing task** - they prevent low-value tests that inflate coverage without catching bugs.

| Skill                      | Path                                                                        | Triggers              |
| -------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Avoiding Low-Value Tests   | `.claude/skill-library/testing/avoiding-low-value-tests/SKILL.md`           | any test task         |
| Testing Anti-Patterns      | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | any test task         |
| Behavior vs Implementation | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | any test task         |
| Condition-Based Waiting    | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | async, flaky, timeout |

### Security & Data

| Skill                   | Path                                                                                 | Triggers                                        |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Securing React          | `.claude/skill-library/development/frontend/securing-react-implementations/SKILL.md` | security, XSS, CSRF                             |
| Graph Queries           | `.claude/skill-library/development/frontend/constructing-graph-queries/SKILL.md`     | graph, Neo4j, query                             |
| Neo4j Optimization      | `.claude/skill-library/development/neo4j/optimizing-neo4j-queries/SKILL.md`          | Neo4j performance, PROFILE, db hits, slow query |
| Migrating Saved Queries | `.claude/skill-library/development/frontend/migrating-saved-queries/SKILL.md`        | migrate, query builder, old format              |

### Code Quality

| Skill        | Path                                                               | Triggers                                  |
| ------------ | ------------------------------------------------------------------ | ----------------------------------------- |
| Using ESLint | `.claude/skill-library/development/frontend/using-eslint/SKILL.md` | lint, eslint, code quality, before commit |

### Code Review

| Skill                              | Path                                                                                     | Triggers                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| Reviewing Frontend Implementations | `.claude/skill-library/development/frontend/reviewing-frontend-implementations/SKILL.md` | review, code review, PR review |

## Cross-Gateway Routing

| If Task Involves        | Also Invoke          |
| ----------------------- | -------------------- |
| Go, Lambda, DynamoDB    | `gateway-backend`    |
| Testing patterns        | `gateway-testing`    |
| TypeScript, Zod, types  | `gateway-typescript` |
| Auth, secrets, security | `gateway-security`   |
| MCP wrappers, tools     | `gateway-mcp-tools`  |

## Loading Skills

**Path convention:** `.claude/skill-library/development/frontend/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/development/frontend/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
