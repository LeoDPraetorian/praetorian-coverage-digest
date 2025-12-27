---
name: gateway-integrations
description: Use when building third-party integrations (Jira, Microsoft Defender, HackerOne) - access API research, Chariot patterns, and validation workflows.
allowed-tools: Read
---

# Integrations Gateway

## Understanding This Gateway

Chariot uses a **two-tier skill system**:

1. **Core Skills** (~25): High-frequency skills in `.claude/skills/` - auto-discovered by Claude Code
2. **Library Skills** (~120): Specialized skills in `.claude/skill-library/` - loaded on-demand via Read tool

**This gateway is a core skill** that routes you to specialized library skills for integration development. The gateway itself does NOT contain implementation details - it serves as a directory.

**How to invoke this gateway:**

```
skill: "gateway-integrations"
```

**How to load a library skill from this gateway:**

```
Read(".claude/skill-library/development/integrations/jira-integration/SKILL.md")
```

<IMPORTANT>
DO NOT work from this gateway alone. This is a routing table, not an implementation guide.

After identifying the skill you need:

1. Use the Read tool with the EXACT path shown below
2. Follow the loaded skill's instructions completely
3. The library skill contains the actual patterns and implementation details

❌ WRONG: "I'll use gateway-integrations to build the Jira integration"
✅ RIGHT: "I'll load jira-integration via Read tool and follow its instructions"
</IMPORTANT>

## Quick Reference

| Need                           | Skill Path                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Chariot conventions            | `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md` |
| Test integrations              | `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`               |
| Validate workflows             | `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`   |
| Jira Cloud integration         | `.claude/skill-library/development/integrations/jira-integration/SKILL.md`             |
| Microsoft Defender integration | `.claude/skill-library/development/integrations/ms-defender-integration/SKILL.md`      |
| HackerOne integration          | `.claude/skill-library/development/integrations/hackerone-integration/SKILL.md`        |

## Implementation Patterns

**Integration Chariot Patterns**: `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md`

- Chariot-specific integration patterns, platform conventions, data mapping

## Testing & Validation

**Integration First Testing**: `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`

- Testing external API integrations, contract testing, mock strategies

**Integration Step Validator**: `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`

- Validating multi-step integration workflows, state machine patterns

## Third-Party Integrations

**Jira Cloud Integration**: `.claude/skill-library/development/integrations/jira-integration/SKILL.md`

- Integrate Jira Cloud with Chariot platform for issue tracking and security findings sync

**Microsoft Defender Integration**: `.claude/skill-library/development/integrations/ms-defender-integration/SKILL.md`

- Integrate Microsoft Defender for Endpoint with Chariot platform for threat detection, vulnerability management, and device inventory sync

**HackerOne Integration**: `.claude/skill-library/development/integrations/hackerone-integration/SKILL.md`

- Integrate HackerOne bug bounty platform with Chariot for vulnerability report ingestion, researcher collaboration, and bounty management

## When to Use This Gateway

Use this gateway skill when:

- Building a new third-party integration
- Maintaining existing integrations
- Testing integration reliability
- Validating multi-step workflows

## Integration Development Workflow

You MUST use TodoWrite before starting to track all workflow steps.

When building integrations, follow this sequence:

1. **Design**: Load and apply `integration-chariot-patterns` for Chariot conventions
2. **Test**: Load and use `writing-integration-tests-first` for reliable test coverage
3. **Validate**: Load and apply `integration-step-validator` for complex workflows

## Related Gateways

- **gateway-backend**: Backend patterns (error handling, concurrency) - use for Go implementation details
- **gateway-mcp-tools**: MCP service wrappers (Linear, Praetorian CLI, Context7)
- **gateway-testing**: Testing patterns (mocking, contract validation)
