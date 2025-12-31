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

## Mandatory Skills by Role

**Load mandatory skills based on your role before starting work.**

### Role Filter

| Your Role              | Mandatory Sections                                                     |
| ---------------------- | ---------------------------------------------------------------------- |
| **Capability Dev**     | ALL ROLES + GO ARCHITECTURE + FINGERPRINTX DEVELOPMENT (if applicable) |
| **VQL Developer**      | ALL ROLES + VQL DEVELOPMENT                                            |
| **Template Author**    | ALL ROLES + TEMPLATE DEVELOPMENT                                       |
| **Scanner Integrator** | ALL ROLES + SCANNER INTEGRATION                                        |
| **Tool Porter**        | ALL ROLES + GO ARCHITECTURE + GO PORTING                               |
| **Lead/Architect**     | ALL ROLES + GO ARCHITECTURE + GO PORTING                               |
| **Reviewer**           | ALL ROLES + GO ARCHITECTURE                                            |
| **Tester**             | ALL ROLES (also invoke `gateway-testing`)                              |

**Note:** All skills remain available to any role via the routing tables below. The table shows what you MUST load upfront—not what you're limited to.

**For Testers:** You MUST also invoke `gateway-testing` for general testing patterns (mocking, test infrastructure, anti-patterns).

---

### ALL ROLES (Everyone Must Read)

**1. Go Capability Architecture (BLOCKING)**

`.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`

File structure standards for Go capability/plugin systems. Complexity-based tiers (1-4), interface patterns, registry conventions. **Essential for understanding how capabilities are organized. Blocks PRs with incorrect structure.**

---

### GO ARCHITECTURE (Mandatory: Capability Dev, Tool Porter, Lead, Reviewer)

**2. Standalone Tool Integration**

`.claude/skill-library/development/capabilities/integrating-standalone-capabilities/SKILL.md`

Patterns for wrapping CLI tools (subfinder, httpx, nuclei) and integrating new Go tools. **Required when adding new tools to the Chariot platform.**

---

### GO PORTING (Mandatory: Tool Porter, Lead/Architect)

**3. Python Dependencies to Go**

`.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md`

Systematic dependency mapping through mandatory web research. Prevents false "no equivalent" claims. **Required before starting any Python→Go port.**

**4. Python Idioms to Go**

`.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`

Pattern dictionary for converting Python classes, decorators, generators, exceptions to idiomatic Go. **Required during active Python→Go translation work.**

---

### VQL DEVELOPMENT (Mandatory: VQL Developer)

**5. VQL Artifact Development**

`.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md`

VQL artifact structure, Aegis capability definitions, testing and deployment. **Required for all Velociraptor Query Language work.**

---

### TEMPLATE DEVELOPMENT (Mandatory: Template Author)

**6. Nuclei Template Creation**

`.claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md`

Nuclei template YAML syntax, matchers, extractors, testing, metadata. **Required for vulnerability detection template work.**

---

### SCANNER INTEGRATION (Mandatory: Scanner Integrator)

**7. Scanner Integration Patterns**

`.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md`

Security tool integration, output parsing, error handling, result storage. **Required when integrating new security scanners.**

**8. Janus Chain Orchestration**

`.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md`

Janus framework workflow design, chain composition, state management. **Required when building multi-tool orchestration workflows.**

---

### FINGERPRINTX DEVELOPMENT (Mandatory: Capability Dev creating fingerprintx modules)

**9. Protocol Research (BLOCKING - MUST BE FIRST)**

`.claude/skill-library/development/capabilities/researching-protocols/SKILL.md`

Research methodology before implementation - lab setup, active probing, pattern identification, detection strategy documentation. **You cannot write correct detection logic without first researching the protocol. MUST complete before writing any code.**

**10. Fingerprintx Module Implementation (AFTER research)**

`.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md`

Plugin interface (5 methods), type system integration, two-phase detection, CPE generation. **Requires research document as input. Do not start implementation without completing Protocol Research first.**

---

### Workflow

1. Identify your role from the Role Filter table above
2. Read ALL ROLES skill (1 skill)
3. Based on your role, also read:
   - Capability Dev: GO ARCHITECTURE (1 skill) + FINGERPRINTX DEVELOPMENT (2 skills, if building fingerprintx modules)
   - VQL Developer: VQL DEVELOPMENT (1 skill)
   - Template Author: TEMPLATE DEVELOPMENT (1 skill)
   - Scanner Integrator: SCANNER INTEGRATION (2 skills)
   - Tool Porter: GO ARCHITECTURE + GO PORTING (3 skills)
   - Lead/Architect: GO ARCHITECTURE + GO PORTING (3 skills)
   - Reviewer: GO ARCHITECTURE (1 skill)
   - Tester: invoke `gateway-testing`
4. Then load task-specific skills from the routing tables below

**Remember:** These are mandatory minimums. Any role can load any skill from the routing tables when relevant to their task.

## Overview

This gateway provides access to skills for building offensive security capabilities:

- **VQL Development**: Velociraptor Query Language artifacts and capabilities
- **Scanner Integration**: Nuclei, Nmap, and custom security tool integration
- **Tool Orchestration**: Janus framework chains and workflow automation
- **Capability Testing**: Security scanning validation and testing patterns

## Quick Reference

**⭐ = Mandatory ALL ROLES | 🏗️ = GO ARCHITECTURE | 🔧 = GO PORTING | 📜 = VQL | 📋 = TEMPLATES | 🔌 = SCANNERS | 🔍 = FINGERPRINTX**

| Task                           | Skill Path                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| ⭐ Go capability architecture  | `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md` |
| 🏗️ Standalone tool integration | `.claude/skill-library/development/capabilities/integrating-standalone-capabilities/SKILL.md`  |
| 🔧 Python→Go dependencies      | `.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md`    |
| 🔧 Python→Go idioms            | `.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`      |
| 📜 VQL artifact development    | `.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md`         |
| 📋 Nuclei template creation    | `.claude/skill-library/development/capabilities/capabilities-nuclei-templates/SKILL.md`        |
| 🔌 Scanner integration         | `.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md`     |
| 🔌 Janus chain orchestration   | `.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md`            |
| 🔍 Protocol research (FIRST)   | `.claude/skill-library/development/capabilities/researching-protocols/SKILL.md`                |
| 🔍 Fingerprintx implementation | `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md`         |

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
- Porting Python security tools to Go
- Designing Go plugin/capability architectures
- Mapping Python dependencies to Go equivalents

## How to Use

**You MUST use TodoWrite before starting to track all workflow steps.** The capability development workflows involve multiple phases that must be completed in order. Create todos for each step to ensure nothing is missed.

### Step 1: Identify Your Task

Match your task to the appropriate capability skill:

- **VQL Development** → Load `capabilities-vql-development`
- **Nuclei Templates** → Load `capabilities-nuclei-templates`
- **Scanner Integration** → Load `capabilities-scanner-integration`
- **Janus Chains** → Load `capabilities-janus-chains`
- **Fingerprintx Plugins** → Load `researching-protocols` first, then `writing-fingerprintx-modules`
- **Standalone Tool Integration** → Load `integrating-standalone-capabilities`
- **Go Plugin Architecture** → Load `enforcing-go-capability-architecture`
- **Python→Go Porting** → Load `mapping-python-dependencies-to-go` + `translating-python-idioms-to-go`

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

### Integrating Standalone Capabilities

**Path**: `.claude/skill-library/development/capabilities/integrating-standalone-capabilities/SKILL.md`

Covers:

- Wrapping existing CLI tools (subfinder, httpx, nuclei)
- Integrating new Go tools with simple interface pattern
- Generating capability wrappers, adapters, parsers
- Zero Tabularium exposure for tool authors
- Per-tool customized integration code
- Alternative to Capability SDK approach

### Go Porting / Python-to-Go Migration

These skills support porting Python security tools to Go for capability development.

**Go Capability Architecture**: `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`

Covers:

- File structure standards for Go capability/plugin systems
- Complexity-based tiers (1-4) for organizing extensible tools
- Interface patterns and registry conventions
- Migration strategies between architecture tiers

**Python Dependencies to Go**: `.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md`

Covers:

- Systematic dependency mapping through mandatory web research
- Prevents false "no equivalent" claims when porting
- Go standard library alternatives
- Third-party Go package discovery

**Python Idioms to Go**: `.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`

Covers:

- Pattern dictionary for converting Python to idiomatic Go
- Classes → structs with methods
- Decorators → middleware/wrapper functions
- Generators → iter.Seq (Go 1.23+)
- Exceptions → error handling with errgroup
- Context managers → defer patterns

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

## Quick Decision Guide

**What are you trying to do?**

```
Building a new capability?
├── VQL/Aegis artifact → capabilities-vql-development 📜
├── Nuclei template → capabilities-nuclei-templates 📋
├── Integrate existing scanner → capabilities-scanner-integration 🔌
├── Chain multiple tools → capabilities-janus-chains 🔌
├── Fingerprint services → researching-protocols 🔍 THEN writing-fingerprintx-modules 🔍
└── Wrap CLI tool → integrating-standalone-capabilities 🏗️

Porting Python tool to Go?
├── First: Map dependencies → mapping-python-dependencies-to-go 🔧
├── During: Translate idioms → translating-python-idioms-to-go 🔧
└── Structure: Architecture tiers → enforcing-go-capability-architecture ⭐

Designing capability architecture?
├── File structure decisions → enforcing-go-capability-architecture ⭐
├── Plugin system design → enforcing-go-capability-architecture ⭐
├── Integration patterns → integrating-standalone-capabilities 🏗️
└── Workflow orchestration → capabilities-janus-chains 🔌

Testing capabilities?
├── General test patterns → invoke gateway-testing
├── Capability-specific → (see individual skill references)
└── Integration tests → invoke gateway-testing

Reviewing capability code?
├── Architecture compliance → enforcing-go-capability-architecture ⭐
├── Go idioms (if ported) → translating-python-idioms-to-go 🔧
└── Integration patterns → integrating-standalone-capabilities 🏗️
```

## Troubleshooting

### "Skill not found" or "Cannot read file"

**Problem:** Read tool returns error when loading a skill path.

**Solutions:**

1. **Verify the path exists** - Copy the EXACT path from this gateway, don't modify it
2. **Check for typos** - Library paths are long; ensure you copied completely
3. **Skill may have moved** - Run `npm run search -- "<skill-name>"` from `.claude/` to find current location
4. **Report broken link** - Use `/skill-manager audit gateway-capabilities` to detect broken paths

### "Which skill should I use?"

**Problem:** Multiple skills seem relevant to your task.

**Solutions:**

1. **Start with ALL ROLES** - Always load `enforcing-go-capability-architecture` first
2. **Match your role** - Use the Role Filter table to identify mandatory skills
3. **Use decision tree** - Follow the Quick Decision Guide above
4. **Layer skills** - It's valid to load multiple skills (e.g., scanner + janus for orchestrated scanning)

### "Porting Python and don't know where to start"

**Problem:** Python→Go port seems overwhelming.

**Solutions:**

1. **Load both porting skills** - `mapping-python-dependencies-to-go` AND `translating-python-idioms-to-go`
2. **Start with dependencies** - Map all imports/packages BEFORE writing any Go code
3. **Follow the architecture skill** - Use `enforcing-go-capability-architecture` for structure
4. **One module at a time** - Don't try to port everything at once

### "I'm still confused about core vs library"

**Quick reference:**

- **Core skills** (~25): In `.claude/skills/` → Use `skill: "name"`
- **Library skills** (~120): In `.claude/skill-library/` → Use `Read("full/path")`
- **This gateway**: Core skill that helps you find library skills
- **Rule**: If path contains `skill-library`, you MUST use Read tool

## Related Gateways

Other domain gateways you can invoke via Skill tool:

| Gateway      | Invoke With                     | Use For                                           |
| ------------ | ------------------------------- | ------------------------------------------------- |
| Backend      | `skill: "gateway-backend"`      | Go, AWS Lambda, DynamoDB, Infrastructure          |
| Frontend     | `skill: "gateway-frontend"`     | React, TypeScript, UI components                  |
| Testing      | `skill: "gateway-testing"`      | API tests, E2E, Mocking, Performance              |
| Security     | `skill: "gateway-security"`     | Auth, Secrets, Cryptography, Defense              |
| Integrations | `skill: "gateway-integrations"` | Third-party APIs, Jira, HackerOne, MS Defender    |
| MCP Tools    | `skill: "gateway-mcp-tools"`    | Linear, Praetorian CLI, Context7, Chrome DevTools |
| Claude       | `skill: "gateway-claude"`       | Skills, Agents, Commands, MCP wrappers            |

## References

- [SKILLS-ARCHITECTURE.md](../../../docs/SKILLS-ARCHITECTURE.md) - Gateway pattern documentation
- [DESIGN-PATTERNS.md](../../../docs/DESIGN-PATTERNS.md) - Attack surface management patterns
- [modules/janus-framework/](../../../modules/janus-framework/) - Janus framework source
- [modules/chariot-aegis-capabilities/](../../../modules/chariot-aegis-capabilities/) - VQL capabilities
- [modules/nuclei-templates/](../../../modules/nuclei-templates/) - Nuclei template library
- [modules/tabularium/](../../../modules/tabularium/) - Data schema definitions
