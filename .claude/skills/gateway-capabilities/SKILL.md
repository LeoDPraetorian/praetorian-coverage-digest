---
name: gateway-capabilities
description: Use when developing offensive security capabilities - VQL, Nuclei templates, scanner integration, Janus chains
allowed-tools: Read, Bash
---

# Gateway: Capabilities Development

Single entry point for offensive security capability development within the Chariot platform. This gateway routes to specialized skills in `.claude/skill-library/development/capabilities/` for VQL development, scanner integration, and security tool orchestration.

## Overview

This gateway provides access to skills for building offensive security capabilities:
- **VQL Development**: Velociraptor Query Language artifacts and capabilities
- **Scanner Integration**: Nuclei, Nmap, and custom security tool integration
- **Tool Orchestration**: Janus framework chains and workflow automation
- **Capability Testing**: Security scanning validation and testing patterns

## Quick Reference

| Task | Skill to Load |
|------|---------------|
| VQL artifact development | `.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md` |
| Nuclei template creation | `.claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md` |
| Scanner integration | `.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md` |
| Janus chain orchestration | `.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md` |

## When to Use

Use this gateway when:
- Developing new VQL artifacts for Aegis agents
- Creating Nuclei templates for vulnerability scanning
- Integrating security scanners (Nmap, Masscan, custom tools)
- Building Janus framework chains for tool orchestration
- Testing security capabilities end-to-end
- Writing custom detection logic for attack surface management
- Automating security assessment workflows

## How to Use

**You MUST use TodoWrite before starting to track all workflow steps.** The capability development workflows involve multiple phases that must be completed in order. Create todos for each step to ensure nothing is missed.

### Step 1: Identify Your Task

Match your task to the appropriate capability skill:

- **VQL Development** → Load `capabilities-vql-development`
- **Nuclei Templates** → Load `capabilities-nuclei-templates`
- **Scanner Integration** → Load `capabilities-scanner-integration`
- **Janus Chains** → Load `capabilities-janus-chains`

### Step 2: Load the Specific Skill

Use the Read tool to load the skill from the library:

```bash
# Example: VQL development
Read: .claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md
```

### Step 3: Follow the Loaded Skill

The loaded skill provides:
- Detailed implementation patterns
- Code examples and templates
- Testing and validation workflows
- Security best practices

## Available Capabilities Skills

### VQL Development
**Path**: `.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md`

Covers:
- VQL artifact structure and syntax
- Aegis capability definitions
- Testing VQL artifacts locally
- Deployment to Chariot platform
- Query optimization techniques
- Error handling in VQL

### Nuclei Templates
**Path**: `.claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md`

Covers:
- Nuclei template YAML syntax
- Matchers and extractors
- Template testing and validation
- Custom vulnerability detection
- Template metadata and severity ratings
- False positive reduction strategies

### Scanner Integration
**Path**: `.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md`

Covers:
- Security tool integration patterns
- Output parsing and normalization
- Error handling and retries
- Result storage in DynamoDB/Neo4j
- Rate limiting and throttling
- Credential management for scanners

### Janus Chain Orchestration
**Path**: `.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md`

Covers:
- Janus framework workflow design
- Chain composition and execution
- State management between tools
- Parallel and sequential execution patterns
- Error recovery and retry logic
- Resource cleanup and lifecycle management

## Chariot Capability Architecture

Understanding how capabilities fit into the Chariot platform:

### Capability Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    1. Development                            │
│  Write VQL artifacts, Nuclei templates, or scanner configs  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    2. Testing                                │
│  Local validation, unit tests, integration tests            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    3. Deployment                             │
│  Upload to S3, register in DynamoDB, configure triggers     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    4. Execution                              │
│  Aegis agents run capabilities, results flow to Kinesis     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    5. Results Processing                     │
│  Assets created, risks identified, attributes enriched      │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points

| Component | Purpose | Location |
|-----------|---------|----------|
| **Aegis Agents** | Execute VQL capabilities on targets | `modules/chariot-aegis-capabilities/` |
| **Janus Framework** | Chain security tools into workflows | `modules/janus-framework/` |
| **Nuclei Templates** | Define vulnerability detection rules | `modules/nuclei-templates/` |
| **Tabularium** | Data schemas for capability results | `modules/tabularium/` |

### Data Flow

Capabilities produce results that flow through the Chariot pipeline:

1. **Capability executes** → Produces raw output (JSON, XML, text)
2. **Parser normalizes** → Converts to Tabularium schema
3. **Handler processes** → Creates/updates Assets, Risks, Attributes
4. **Graph updates** → Neo4j relationships established
5. **Notifications sent** → Alerts triggered based on severity

## Common Workflows

### Creating a New Scanner Capability

1. **Research the scanner** - Understand output format, CLI options
2. **Load scanner integration skill** - Get patterns for your scanner type
3. **Write the integration** - Parser, executor, error handling
4. **Create Janus chain** - Orchestrate with other tools if needed
5. **Write tests** - Unit tests, integration tests
6. **Deploy** - Register capability in Chariot

### Creating a Vulnerability Detection Template

1. **Identify the vulnerability** - CVE, technique, or custom detection
2. **Load Nuclei templates skill** - Get YAML patterns
3. **Write the template** - Requests, matchers, extractors
4. **Test locally** - Run against known vulnerable/safe targets
5. **Add to templates repo** - Submit PR to `modules/nuclei-templates/`

### Developing an Aegis Capability

1. **Define the capability** - What data to collect, from where
2. **Load VQL development skill** - Get artifact patterns
3. **Write VQL artifact** - Queries, preconditions, parameters
4. **Test locally** - Use Velociraptor client for testing
5. **Deploy to Aegis** - Upload to `modules/chariot-aegis-capabilities/`

## Security Considerations

When developing capabilities, always consider:

- **Authorization**: Capabilities run with elevated privileges - validate scope
- **Rate Limiting**: Don't overwhelm targets or get blocked
- **Credential Handling**: Never hardcode secrets, use secure injection
- **Error Messages**: Don't leak sensitive information in errors
- **Resource Limits**: Set timeouts and memory limits to prevent runaway processes
- **Audit Logging**: Log capability execution for compliance

## Progressive Loading

This gateway follows the progressive disclosure pattern:
1. **Gateway loads fast** (<500 lines, minimal tokens)
2. **Specific skills load on-demand** via Read tool
3. **Detailed content loads only when needed**

This prevents attention degradation while maintaining full capability access.

## Discovery

If you don't see a skill for your specific task, search the library:

```bash
cd .claude && npm run -w @chariot/skill-search search -- "your-query"
```

Example searches:
- `npm run -w @chariot/skill-search search -- "vql"`
- `npm run -w @chariot/skill-search search -- "nuclei"`
- `npm run -w @chariot/skill-search search -- "janus"`
- `npm run -w @chariot/skill-search search -- "scanner"`
- `npm run -w @chariot/skill-search search -- "capability"`

## References

- [SKILLS-ARCHITECTURE.md](../../../docs/SKILLS-ARCHITECTURE.md) - Gateway pattern documentation
- [DESIGN-PATTERNS.md](../../../docs/DESIGN-PATTERNS.md) - Attack surface management patterns
- [modules/janus-framework/](../../../modules/janus-framework/) - Janus framework source
- [modules/chariot-aegis-capabilities/](../../../modules/chariot-aegis-capabilities/) - VQL capabilities
- [modules/nuclei-templates/](../../../modules/nuclei-templates/) - Nuclei template library
- [modules/tabularium/](../../../modules/tabularium/) - Data schema definitions
