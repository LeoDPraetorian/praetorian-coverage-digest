---
name: gateway-mcp-tools
description: Use when working with MCP tools - routes to wrapper development, Linear, Perplexity, Context7, and CLI integration skills.
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

# Gateway: MCP Tools

Routes MCP tool tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~300 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

**Token savings:** 0 tokens at session start (was 71.8k with native MCP)

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                   | Route To                                   |
| --------------------------------------------- | ------------------------------------------ |
| "Chariot assets" / "risks" / "jobs"           | → `mcp-tools-praetorian-cli`               |
| "Linear issues" / "projects" / "tickets"      | → `mcp-tools-linear`                       |
| "Featurebase" / "changelog" / "feedback"      | → `mcp-tools-featurebase`                  |
| "library docs" / "Context7" / "documentation" | → `mcp-tools-context7`                     |
| "AI search" / "Perplexity" / "research"       | → `mcp-tools-perplexity`                   |
| "browser" / "Playwright" / "screenshot"       | → `mcp-tools-chrome-devtools`              |
| "CI metrics" / "Currents" / "test runs"       | → `mcp-tools-currents`                     |
| "Chariot platform" / "graph query"            | → `mcp-tools-chariot`                      |
| "cloud security" / "Nebula" / "AWS scan"      | → `mcp-tools-nebula`                       |
| "semantic code" / "Serena" / "LSP"            | → `mcp-tools-serena`                       |
| "Shodan" / "host search" / "recon"            | → `mcp-tools-shodan-api`                   |
| "tool discovery" / "MCP registry"             | → `mcp-tools-registry`                     |
| "list tools" / "what MCP tools" / "available" | → `listing-tools`                          |
| "wrapper architecture" / "token optimization" | → `designing-progressive-loading-wrappers` |
| "review wrapper" / "validate implementation"  | → `reviewing-mcp-wrappers`                 |
| "audit wrapper" / "validate compliance"       | → `auditing-tool-wrappers`                 |
| "fix wrapper" / "remediate compliance"        | → `fixing-tool-wrappers`                   |
| "update wrapper" / "modify wrapper"           | → `updating-tool-wrappers`                 |
| "MCP setup" / "server config"                 | → `setting-up-mcp-servers`                 |
| "create wrapper" / "new MCP tool"             | → `orchestrating-mcp-development`          |
| "orchestrate MCP" / "complete wrapper flow"   | → `orchestrating-mcp-development`          |
| "orchestrate API" / "REST API wrapper"        | → `orchestrating-api-tool-development`     |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
6. Execute wrapper via `npx tsx` as documented in skill
```

## Skill Registry

### Chariot Platform

| Skill          | Path                                                                       | Triggers                   |
| -------------- | -------------------------------------------------------------------------- | -------------------------- |
| Praetorian CLI | `.claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/SKILL.md` | assets, risks, jobs, seeds |
| Chariot Graph  | `.claude/skill-library/claude/mcp-tools/mcp-tools-chariot/SKILL.md`        | graph query, platform      |

### Issue Tracking

| Skill  | Path                                                               | Triggers                  |
| ------ | ------------------------------------------------------------------ | ------------------------- |
| Linear | `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md` | issues, projects, tickets |

### Feedback & Content Management

| Skill       | Path                                                                    | Triggers                              |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Featurebase | `.claude/skill-library/claude/mcp-tools/mcp-tools-featurebase/SKILL.md` | feedback, changelog, articles, posts  |

### Documentation

| Skill    | Path                                                                 | Triggers                    |
| -------- | -------------------------------------------------------------------- | --------------------------- |
| Context7 | `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md` | library docs, API reference |

### Search & Research

| Skill      | Path                                                                   | Triggers            |
| ---------- | ---------------------------------------------------------------------- | ------------------- |
| Perplexity | `.claude/skill-library/claude/mcp-tools/mcp-tools-perplexity/SKILL.md` | AI search, research |

### Browser Automation

| Skill           | Path                                                                        | Triggers                 |
| --------------- | --------------------------------------------------------------------------- | ------------------------ |
| Chrome DevTools | `.claude/skill-library/claude/mcp-tools/mcp-tools-chrome-devtools/SKILL.md` | browser, screenshot, DOM |

### CI/CD

| Skill    | Path                                                                 | Triggers              |
| -------- | -------------------------------------------------------------------- | --------------------- |
| Currents | `.claude/skill-library/claude/mcp-tools/mcp-tools-currents/SKILL.md` | test runs, CI metrics |

### Cloud Security

| Skill  | Path                                                               | Triggers                 |
| ------ | ------------------------------------------------------------------ | ------------------------ |
| Nebula | `.claude/skill-library/claude/mcp-tools/mcp-tools-nebula/SKILL.md` | AWS scan, cloud security |

### Reconnaissance

| Skill      | Path                                                                   | Triggers                              |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------- |
| Shodan API | `.claude/skill-library/claude/mcp-tools/mcp-tools-shodan-api/SKILL.md` | Shodan, host search, recon, IP lookup |

### Code Analysis

| Skill  | Path                                                               | Triggers                    |
| ------ | ------------------------------------------------------------------ | --------------------------- |
| Serena | `.claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md` | semantic code, LSP, symbols |

### Infrastructure

| Skill         | Path                                                                          | Triggers              |
| ------------- | ----------------------------------------------------------------------------- | --------------------- |
| MCP Registry  | `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/SKILL.md`          | tool discovery        |
| MCP Setup     | `.claude/skill-library/claude/mcp-management/setting-up-mcp-servers/SKILL.md` | server config         |
| Listing Tools | `.claude/skill-library/claude/mcp-management/listing-tools/SKILL.md`          | list tools, available |

### Development

| Skill                | Path                                                                                          | Triggers                        |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| Orchestrating MCP    | `.claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md`          | new wrapper, TDD, orchestration |
| Orchestrating API    | `.claude/skill-library/claude/mcp-management/orchestrating-api-tool-development/SKILL.md`     | REST API, HTTP wrappers         |
| Wrapper Architecture | `.claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md` | token optimization              |
| Reviewing Wrappers   | `.claude/skill-library/claude/mcp-management/reviewing-mcp-wrappers/SKILL.md`                 | review, validate, code review   |
| Auditing Wrappers    | `.claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md`                 | audit, compliance, 12-phase     |
| Fixing Wrappers      | `.claude/skill-library/claude/mcp-management/fixing-tool-wrappers/SKILL.md`                   | fix, remediate, auto-fix        |
| Updating Wrappers    | `.claude/skill-library/claude/mcp-management/updating-tool-wrappers/SKILL.md`                 | update, modify, change          |

## Cross-Gateway Routing

| If Task Involves       | Also Invoke          |
| ---------------------- | -------------------- |
| TypeScript, Zod, types | `gateway-typescript` |
| Testing wrappers       | `gateway-testing`    |

## Loading Skills

**Path convention:** `.claude/skill-library/claude/mcp-tools/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/claude/mcp-tools/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.

## Execution Pattern

All wrappers execute via Bash with `npx tsx`:

```bash
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/service/tool-name.ts');
  const result = await toolName.execute({ params });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```
