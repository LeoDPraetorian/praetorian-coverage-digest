---
name: gateway-capabilities
description: Use when developing offensive security capabilities - VQL, Nuclei templates, scanner integration, Janus chains
allowed-tools: Read, Bash
---

# Gateway: Capabilities Development

## Understanding This Gateway

**This is a gateway skill in Chariot's two-tier skill architecture.**

The two-tier system organizes skills into:

- **Core skills** (~25 skills in `.claude/skills/`) - High-frequency skills auto-discovered by Claude Code's Skill tool
- **Library skills** (~120 skills in `.claude/skill-library/`) - Specialized skills loaded on-demand via Read tool

**Gateways are routing indices, not implementation guides.** They exist in core to help you discover and load library skills.

<IMPORTANT>
**Library skills cannot be invoked with the Skill tool.** You MUST use the Read tool to load them.

### Common Anti-Patterns

```bash
# ❌ WRONG: Trying to use Skill tool for library skills
skill: "capabilities-vql-development"  # FAILS - library skills are NOT in Skill tool

# ❌ WRONG: Guessing or shortening paths
Read(".claude/skill-library/capabilities-vql-development/...")  # FAILS - missing nested folders

# ❌ WRONG: Using skill name instead of full path
Read("capabilities-vql-development")  # FAILS - must be full path

# ❌ WRONG: Looking in core /skills/ instead of /skill-library/
Read(".claude/skills/capabilities-vql-development/...")  # FAILS - library skills are NOT in /skills/
```

### Correct Patterns

```bash
# ✅ CORRECT: Use gateway to find skill, then Read with FULL path
Read(".claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md")

# ✅ CORRECT: Copy path exactly as shown in this gateway
Read(".claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md")

# ✅ CORRECT: Core skills (this gateway) use Skill tool
skill: "gateway-capabilities"  # Core skills work with Skill tool
```

**Workflow:**

1. Invoke this gateway: `skill: "gateway-capabilities"`
2. Find the skill you need in the Quick Reference table below
3. Copy the EXACT path shown (do not modify or shorten)
4. Use Read tool with that path
5. Follow the loaded skill's instructions

</IMPORTANT>

Single entry point for offensive security capability development within the Chariot platform. This gateway routes to specialized skills in `.claude/skill-library/development/capabilities/` for VQL development, scanner integration, and security tool orchestration.

## Overview

This gateway provides access to skills for building offensive security capabilities:

- **VQL Development**: Velociraptor Query Language artifacts and capabilities
- **Scanner Integration**: Nuclei, Nmap, and custom security tool integration
- **Tool Orchestration**: Janus framework chains and workflow automation
- **Capability Testing**: Security scanning validation and testing patterns

## Quick Reference

| Task                       | Skill Path                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| VQL artifact development   | `.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md`     |
| Nuclei template creation   | `.claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md`    |
| Scanner integration        | `.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md` |
| Janus chain orchestration  | `.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md`        |
| Fingerprintx plugin dev    | `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md`     |

## When to Use

Use this gateway when:

- Developing new VQL artifacts for Aegis agents
- Creating Nuclei templates for vulnerability scanning
- Integrating security scanners (Nmap, Masscan, custom tools)
- Building Janus framework chains for tool orchestration
- Testing security capabilities end-to-end
- Writing custom detection logic for attack surface management
- Automating security assessment workflows
- Creating fingerprintx service fingerprinting plugins

## How to Use

**You MUST use TodoWrite before starting to track all workflow steps.** The capability development workflows involve multiple phases that must be completed in order. Create todos for each step to ensure nothing is missed.

### Step 1: Identify Your Task

Match your task to the appropriate capability skill:

- **VQL Development** → Load `capabilities-vql-development`
- **Nuclei Templates** → Load `capabilities-nuclei-templates`
- **Scanner Integration** → Load `capabilities-scanner-integration`
- **Janus Chains** → Load `capabilities-janus-chains`
- **Fingerprintx Plugins** → Load `writing-fingerprintx-modules`

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

### Fingerprintx Plugin Development

**Path**: `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md`

Covers:

- Plugin interface implementation (5 methods)
- Type system integration (types.go, plugin_list.go)
- Two-phase detection strategy (detect then enrich)
- Wire protocol parsing (binary and text)
- CPE generation for vulnerability tracking
- Network I/O patterns with pluginutils
- Priority and PortPriority configuration

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

Capabilities integrate with these Chariot platform components:

- **Aegis Agents** (`modules/chariot-aegis-capabilities/`) - Execute VQL capabilities on targets
- **Janus Framework** (`modules/janus-framework/`) - Chain security tools into workflows
- **Nuclei Templates** (`modules/nuclei-templates/`) - Define vulnerability detection rules
- **Tabularium** (`modules/tabularium/`) - Data schemas for capability results

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
cd .claude && npm run -w @chariot/auditing-skills search -- "your-query"
```

Example searches:

- `npm run -w @chariot/auditing-skills search -- "vql"`
- `npm run -w @chariot/auditing-skills search -- "nuclei"`
- `npm run -w @chariot/auditing-skills search -- "janus"`
- `npm run -w @chariot/auditing-skills search -- "scanner"`
- `npm run -w @chariot/auditing-skills search -- "capability"`

## References

- [SKILLS-ARCHITECTURE.md](../../../docs/SKILLS-ARCHITECTURE.md) - Gateway pattern documentation
- [DESIGN-PATTERNS.md](../../../docs/DESIGN-PATTERNS.md) - Attack surface management patterns
- [modules/janus-framework/](../../../modules/janus-framework/) - Janus framework source
- [modules/chariot-aegis-capabilities/](../../../modules/chariot-aegis-capabilities/) - VQL capabilities
- [modules/nuclei-templates/](../../../modules/nuclei-templates/) - Nuclei template library
- [modules/tabularium/](../../../modules/tabularium/) - Data schema definitions
