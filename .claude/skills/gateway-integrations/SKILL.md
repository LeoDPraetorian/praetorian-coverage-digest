---
name: gateway-integrations
description: Use when building third-party integrations - access API research, Chariot patterns, and validation workflows.
allowed-tools: Read
---

# Integrations Gateway

## How to Use

This skill serves as a master directory for all integration development skills in the Chariot platform. When you need to build or maintain third-party integrations:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by workflow stage for easy discovery.

## Implementation Patterns

**Integration Chariot Patterns**: `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md`
- Chariot-specific integration patterns, platform conventions, data mapping

## Testing & Validation

**Integration First Testing**: `.claude/skill-library/testing/integration-first-testing/SKILL.md`
- Testing external API integrations, contract testing, mock strategies

**Integration Step Validator**: `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`
- Validating multi-step integration workflows, state machine patterns

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| Chariot conventions | integration-chariot-patterns |
| Test integrations | integration-first-testing |
| Validate workflows | integration-step-validator |
| Jira Cloud integration | jira-integration |
| Microsoft Defender integration | ms-defender-integration |

## When to Use This Gateway

Use this gateway skill when:
- Building a new third-party integration
- Maintaining existing integrations
- Testing integration reliability
- Validating multi-step workflows

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Integration Development Workflow

When building integrations, follow this sequence:

1. **Design**: Apply `integration-chariot-patterns` for Chariot conventions
2. **Test**: Use `integration-first-testing` for reliable test coverage
3. **Validate**: Apply `integration-step-validator` for complex workflows

## Related Gateways

- **gateway-backend**: Backend patterns (error handling, concurrency)
- **gateway-mcp-tools**: MCP service wrappers (Linear, Praetorian CLI, Context7)
- **gateway-testing**: Testing patterns (mocking, contract validation)

## Third-Party Integrations

**Jira Cloud Integration**: `.claude/skill-library/development/integrations/jira-integration/SKILL.md`
- Integrate Jira Cloud with Chariot platform for issue tracking and security findings sync

**Microsoft Defender Integration**: `.claude/skill-library/development/integrations/ms-defender-integration/SKILL.md`
- Integrate Microsoft Defender for Endpoint with Chariot platform for threat detection, vulnerability management, and device inventory sync

