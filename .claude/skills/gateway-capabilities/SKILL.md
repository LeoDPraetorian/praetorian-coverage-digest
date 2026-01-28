---
name: gateway-capabilities
description: Use when developing capabilities - routes to VQL, Nuclei templates, scanner integration, and security tool skills via progressive loading.
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

# Gateway: Capabilities

Routes capability development tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~350 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                                                                                                                                           | Route To                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| "orchestrate capability" / "develop capability" / "capability workflow" / "VQL development" / "Nuclei development" / "Janus development" / "Nerva development" | → `orchestrating-capability-development`    |
| "review capability" / "code review" / "VQL review" / "Nuclei review" / "Janus review" / "nerva review"                                                         | → `reviewing-capability-implementations`    |
| "YAML or Go?" / "template vs plugin" / "Nuclei vs nerva" / "implementation pattern" / "decision framework"                                                     | → `selecting-plugin-implementation-pattern` |
| "CLI" / "command-line" / "Cobra" / "Kong" / "Viper" / "Koanf" / "POSIX"                                                                                               | → `implementing-go-cli-applications`        |
| "Go architecture" / "capability structure"                                                                                                                            | → `enforcing-go-capability-architecture`    |
| "plugin registry" / "init() registration" / "factory pattern" / "sync.RWMutex"                                                                                        | → `implementing-go-plugin-registries`       |
| "VQL" / "Aegis" / "Velociraptor"                                                                                                                                      | → `capabilities-vql-development`            |
| "Nuclei" / "template" / "CVE detection"                                                                                                                               | → `writing-nuclei-signatures`               |
| "YAML template engine" / "template parser"                                                                                                                            | → `implementing-yaml-template-engines`      |
| "scanner" / "tool chain"                                                                                                                                              | → `capabilities-scanner-integration`        |
| "scanner performance" / "optimize" / "throughput" / "40K items/hour"                                                                                                  | → `optimizing-go-scanner-performance`       |
| "web crawler" / "Colly" / "Katana"                                                                                                                                    | → `building-web-crawlers`                   |
| "Janus" / "chain" / "pipeline"                                                                                                                                        | → `capabilities-janus-chains`               |
| "nerva" / "service detection"                                                                                                                                  | → `orchestrating-nerva-development`  |
| "SCTP" / "Diameter" / "SIGTRAN" / "S1AP" / "NGAP" / "telecom protocols" / "5G protocols"                                                                              | → `writing-nerva-sctp-modules`              |
| "live validation" / "Shodan" / "metrics"                                                                                                                              | → `validating-live-with-shodan`             |
| "protocol" / "banner" / "handshake"                                                                                                                                   | → `researching-protocols`                   |
| "version marker" / "fingerprint"                                                                                                                                      | → `researching-version-markers`             |
| "CISA KEV" / "known exploited" / "exploited vulnerability" / "CVE research"                                                                                           | → `researching-cisa-kev`                    |
| "NVD" / "CVSS" / "CPE" / "CVE details" / "vulnerability database"                                                                                                     | → `researching-nvd`                         |
| "NoseyParker" / "secret scanning" / "credential detection" / "creating rules"                                                                                         | → `creating-noseyparker-rules`              |
| "standalone" / "tool integration"                                                                                                                                     | → `integrating-standalone-capabilities`     |
| "detection plugin" / "XSS" / "SQLi"                                                                                                                                   | → `implementing-detection-plugins`          |
| "port" / "porting" / "Python to Go" / "porting capabilities" / "translate capability"                                                                                 | → `porting-python-capabilities-to-go`       |
| "Python to Go" / "dependency mapping"                                                                                                                                 | → `mapping-python-dependencies-to-go`       |
| "Python idioms" / "Go translation"                                                                                                                                    | → `translating-python-idioms-to-go`         |
| "port equivalence" / "behavior parity"                                                                                                                                | → `verifying-port-equivalence`              |
| "CWE" / "which CWE" / "vulnerability tag"                                                                                                                             | → `mapping-to-cwe`                          |
| "Top 25" / "priority" / "risk ranking" / "KEV"                                                                                                                        | → `mapping-to-sans-top-25`                  |
| "MITRE ATT&CK" / "technique" / "tactic" / "TTP" / "kill chain"                                                                                                        | → `mapping-to-mitre-attack`                 |
| "GitHub SEO" / "repository optimization"                                                                                                                              | → `optimizing-github-seo`                   |
| "testing" (general)                                                                                                                                                   | → also invoke `gateway-testing`             |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Capability Architecture

| Skill                               | Path                                                                                              | Triggers                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability Development Orchestrator | `.claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md`    | orchestrate capability, develop capability, capability workflow, VQL development, Nuclei development, Janus development, Nerva development |
| Reviewing Implementations           | `.claude/skill-library/development/capabilities/reviewing-capability-implementations/SKILL.md`    | review capability, code review, VQL review, Nuclei review, Janus review, nerva review                                                      |
| Plugin Implementation Pattern       | `.claude/skill-library/development/capabilities/selecting-plugin-implementation-pattern/SKILL.md` | YAML or Go, template vs plugin, Nuclei vs nerva, implementation pattern, decision framework                                                |
| Go CLI Applications                 | `.claude/skill-library/development/capabilities/implementing-go-cli-applications/SKILL.md`        | CLI, command-line, Cobra, Kong, Viper, Koanf, POSIX                                                                                               |
| Go Capability Architecture          | `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`    | Go architecture, structure                                                                                                                        |
| Go Plugin Registries                | `.claude/skill-library/development/capabilities/implementing-go-plugin-registries/SKILL.md`       | plugin registry, init() registration, factory pattern, sync.RWMutex                                                                               |
| Standalone Integration              | `.claude/skill-library/development/capabilities/integrating-standalone-capabilities/SKILL.md`     | standalone, tool integration                                                                                                                      |

### VQL & Templates

| Skill                 | Path                                                                                         | Triggers                          |
| --------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| VQL Development       | `.claude/skill-library/development/capabilities/capabilities-vql-development/SKILL.md`       | VQL, Aegis, Velociraptor          |
| Nuclei Templates      | `.claude/skill-library/development/capabilities/writing-nuclei-signatures/SKILL.md`          | Nuclei, template, CVE             |
| YAML Template Engines | `.claude/skill-library/development/capabilities/implementing-yaml-template-engines/SKILL.md` | YAML parser, template engine, DSL |

### Scanners & Chains

| Skill               | Path                                                                                        | Triggers                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Scanner Integration | `.claude/skill-library/development/capabilities/capabilities-scanner-integration/SKILL.md`  | scanner, tool chain                                       |
| Scanner Performance | `.claude/skill-library/development/capabilities/optimizing-go-scanner-performance/SKILL.md` | scanner performance, optimize, throughput, 40K items/hour |
| Web Crawlers        | `.claude/skill-library/development/capabilities/building-web-crawlers/SKILL.md`             | web crawler, Colly, Katana, scraping                      |
| Janus Chains        | `.claude/skill-library/development/capabilities/capabilities-janus-chains/SKILL.md`         | Janus, chain, pipeline                                    |
| Detection Plugins   | `.claude/skill-library/development/capabilities/implementing-detection-plugins/SKILL.md`    | detection plugin, XSS, SQLi, SSRF, OWASP                  |
| NoseyParker Rules   | `.claude/skill-library/development/capabilities/creating-noseyparker-rules/SKILL.md`        | NoseyParker, secret scanning, credential detection        |

### Nerva

| Skill                                 | Path                                                                                                | Triggers                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Nerva Development Orchestrator | `.claude/skill-library/development/capabilities/nerva/orchestrating-nerva-development/SKILL.md`    | nerva, service detection, create                                |
| SCTP Nerva Modules             | `.claude/skill-library/development/capabilities/nerva/writing-nerva-sctp-modules/SKILL.md`                | SCTP, Diameter, SIGTRAN, S1AP, NGAP, telecom, 5G, protocol over SCTP  |
| Nerva Live Validate            | `.claude/skill-library/development/capabilities/validating-live-with-shodan/SKILL.md`               | live validation, Shodan, metrics                                       |
| Protocol Research                     | `.claude/skill-library/research/researching-protocols/SKILL.md`                                     | protocol, banner, handshake                                            |
| Version Markers                       | `.claude/skill-library/research/researching-version-markers/SKILL.md`                               | version marker, fingerprint                                            |
| CISA KEV Research                     | `.claude/skill-library/research/researching-cisa-kev/SKILL.md`                                      | CISA KEV, known exploited, CVE                                         |
| NVD Research                          | `.claude/skill-library/research/researching-nvd/SKILL.md`                                           | NVD, CVSS, CPE, CVE details                                            |

### Go Porting

| Skill                         | Path                                                                                        | Triggers                            |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Porting Python Capabilities   | `.claude/skill-library/development/capabilities/porting-python-capabilities-to-go/SKILL.md` | Python to Go, porting, capabilities |
| Python Dependency Mapping     | `.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md` | Python to Go, dependencies          |
| Python Idiom Translation      | `.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`   | Python idioms, Go translation       |
| Port Equivalence Verification | `.claude/skill-library/development/capabilities/verifying-port-equivalence/SKILL.md`        | port equivalence, parity            |

### Security Framework Mapping

| Skill                | Path                                                                | Triggers                                                        |
| -------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| CWE Mapping          | `.claude/skill-library/frameworks/mapping-to-cwe/SKILL.md`          | CWE, which CWE, vulnerability tagging                           |
| SANS/CWE Top 25      | `.claude/skill-library/frameworks/mapping-to-sans-top-25/SKILL.md`  | Top 25, priority, risk ranking, KEV, criticality                |
| MITRE ATT&CK Mapping | `.claude/skill-library/frameworks/mapping-to-mitre-attack/SKILL.md` | ATT&CK, technique, tactic, TTP, kill chain, threat intelligence |

### Repository Optimization

| Skill                   | Path                                                             | Triggers                                                  |
| ----------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| GitHub SEO Optimization | `.claude/skill-library/documents/optimizing-github-seo/SKILL.md` | GitHub SEO, repository optimization, AEO, discoverability |

### Testing Quality (Mandatory)

**Load these skills for ANY testing task** - they prevent low-value tests that inflate coverage without catching bugs.

| Skill                      | Path                                                                        | Triggers              |
| -------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Avoiding Low-Value Tests   | `.claude/skill-library/testing/avoiding-low-value-tests/SKILL.md`           | any test task         |
| Testing Anti-Patterns      | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | any test task         |
| Behavior vs Implementation | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | any test task         |
| Condition-Based Waiting    | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | async, flaky, timeout |

## Cross-Gateway Routing

| If Task Involves  | Also Invoke        |
| ----------------- | ------------------ |
| Go patterns       | `gateway-backend`  |
| Testing patterns  | `gateway-testing`  |
| Security patterns | `gateway-security` |

## Loading Skills

**Path convention:** `.claude/skill-library/development/capabilities/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/development/capabilities/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
