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

## Research & Discovery

**Integration Research**: `.claude/skill-library/development/integrations/integration-research/SKILL.md`
- Researching third-party APIs, documenting endpoints, understanding rate limits

## Implementation Patterns

**Integration Chariot Patterns**: `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md`
- Chariot-specific integration patterns, platform conventions, data mapping

## Testing & Validation

**Integration First Testing**: `.claude/skill-library/development/integrations/integration-first-testing/SKILL.md`
- Testing external API integrations, contract testing, mock strategies

**Integration Step Validator**: `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`
- Validating multi-step integration workflows, state machine patterns

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| Research new API | integration-research |
| Chariot conventions | integration-chariot-patterns |
| Test integrations | integration-first-testing |
| Validate workflows | integration-step-validator |

## When to Use This Gateway

Use this gateway skill when:
- Building a new third-party integration
- Maintaining existing integrations
- Researching external API capabilities
- Testing integration reliability
- Validating multi-step workflows

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Integration Development Workflow

When building integrations, follow this sequence:

1. **Research**: Use `integration-research` to understand the external API
2. **Design**: Apply `integration-chariot-patterns` for Chariot conventions
3. **Test**: Use `integration-first-testing` for reliable test coverage
4. **Validate**: Apply `integration-step-validator` for complex workflows

## Related Gateways

- **gateway-backend**: Backend patterns (error handling, concurrency)
- **gateway-mcp-tools**: MCP service wrappers (Linear, Praetorian CLI, Context7)
- **gateway-testing**: Testing patterns (mocking, contract validation)

## Third-Party Integrations

**Fastly Integration**: `.claude/skill-library/development/integrations/fastly-integration/SKILL.md`
- Use when integrating with Fastly CDN, edge compute, and API services - service creation, domain management, DDoS protection



