---
name: gateway-typescript
description: Routes TypeScript tasks to library skills. Intent detection + progressive loading.
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

# Gateway: TypeScript

Routes TypeScript tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~350 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                   | Route To                                   |
| --------------------------------------------- | ------------------------------------------ |
| "Zod" / "validation" / "schema"               | → `validating-with-zod-schemas`            |
| "Result" / "Either" / "error handling"        | → `implementing-result-either-pattern`     |
| "retry" / "backoff" / "resilience"            | → `implementing-retry-with-backoff`        |
| "branded types" / "nominal" / "IDs"           | → `implementing-branded-types-typescript`  |
| "pattern matching" / "discriminated unions"   | → `pattern-matching-typescript`            |
| "satisfies" / "type narrowing"                | → `using-typescript-satisfies-operator`    |
| "as const" / "const assertions"               | → `using-typescript-const-assertions`      |
| "sanitization" / "XSS" / "input security"     | → `sanitizing-inputs-securely`             |
| "TSDoc" / "documentation" / "comments"        | → `documenting-with-tsdoc`                 |
| "barrel files" / "imports" / "re-exports"     | → `avoiding-barrel-files`                  |
| "hexagonal" / "ports-adapters" / "clean arch" | → `structuring-hexagonal-typescript`       |
| "monorepo" / "workspace" / "packages"         | → `structuring-workspace-packages`         |
| "slow build" / "tsc" / "compiler"             | → `optimizing-typescript-performance`      |
| "MCP wrapper" / "token optimization"          | → `designing-progressive-loading-wrappers` |
| "LLM response" / "API filtering"              | → `optimizing-llm-api-responses`           |
| "React" / "frontend"                          | → also invoke `gateway-frontend`           |
| "testing" (general)                           | → also invoke `gateway-testing`            |
| "MCP tools"                                   | → also invoke `gateway-mcp-tools`          |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Validation & Types

| Skill              | Path                                                                                          | Triggers                     |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------- |
| Zod Schemas        | `.claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md`           | Zod, validation, schema      |
| Branded Types      | `.claude/skill-library/development/typescript/implementing-branded-types-typescript/SKILL.md` | branded, nominal, IDs        |
| Satisfies Operator | `.claude/skill-library/development/typescript/using-typescript-satisfies-operator/SKILL.md`   | satisfies, narrowing         |
| Const Assertions   | `.claude/skill-library/development/typescript/using-typescript-const-assertions/SKILL.md`     | as const, assertions         |
| Pattern Matching   | `.claude/skill-library/development/typescript/pattern-matching-typescript/SKILL.md`           | pattern match, discriminated |

### Error Handling & Resilience

| Skill                 | Path                                                                                       | Triggers                   |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| Result/Either Pattern | `.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md` | Result, Either, errors     |
| Retry with Backoff    | `.claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md`    | retry, backoff, resilience |

### Security & Documentation

| Skill               | Path                                                                               | Triggers                    |
| ------------------- | ---------------------------------------------------------------------------------- | --------------------------- |
| Input Sanitization  | `.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md` | sanitization, XSS, security |
| TSDoc Documentation | `.claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md`     | TSDoc, documentation        |

### Architecture & Performance

| Skill                  | Path                                                                                      | Triggers                    |
| ---------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| Avoiding Barrel Files  | `.claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md`             | barrel, imports, re-exports |
| Hexagonal Architecture | `.claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md`  | hexagonal, ports-adapters   |
| Workspace Packages     | `.claude/skill-library/development/typescript/structuring-workspace-packages/SKILL.md`    | monorepo, workspace         |
| Compiler Performance   | `.claude/skill-library/development/typescript/optimizing-typescript-performance/SKILL.md` | slow build, tsc, compiler   |

### LLM & MCP

| Skill                        | Path                                                                                           | Triggers                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| Progressive Loading Wrappers | `.claude/skill-library/development/typescript/designing-progressive-loading-wrappers/SKILL.md` | MCP wrapper, tokens         |
| LLM API Optimization         | `.claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md`           | LLM response, API filtering |

## Cross-Gateway Routing

| If Task Involves       | Also Invoke         |
| ---------------------- | ------------------- |
| React, components, UI  | `gateway-frontend`  |
| Go, Lambda, DynamoDB   | `gateway-backend`   |
| Testing, mocks, Vitest | `gateway-testing`   |
| MCP wrappers, tools    | `gateway-mcp-tools` |
| Auth, secrets, crypto  | `gateway-security`  |

## Loading Skills

**Path convention:** `.claude/skill-library/development/typescript/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/development/typescript/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
