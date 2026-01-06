---
name: selecting-plugin-implementation-pattern
description: Use when deciding between YAML template-based detection (Nuclei templates, Augustus) and Go plugin-based detection (fingerprintx, janus capabilities) for new security capabilities - provides decision framework, criteria matrix, and routes to appropriate implementation skills
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Skill
---

# Selecting Plugin Implementation Pattern

**Decision framework for choosing between YAML template-based and Go plugin-based detection when building security capabilities.**

## When to Use

Use this skill when:

- Starting a new security capability/detector
- Choosing implementation approach (YAML vs Go)
- Evaluating whether to extend existing templates or write new plugins
- Deciding between Nuclei templates, Augustus probes, fingerprintx modules, or janus capabilities
- User asks "should I use YAML or Go for this detection?"

## Purpose

This is a **ROUTER skill** that guides developers to the appropriate implementation skill:

- **YAML path** → `implementing-yaml-template-engines`
- **Go path** → `implementing-detection-plugins`

It does NOT teach implementation - it helps you make the right choice.

## Quick Decision Matrix

| Question         | YAML Template                                                   | Go Plugin                                        |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| Detection logic  | Pattern matching (word, regex, status codes, binary signatures) | Algorithmic, timing-based, differential analysis |
| Protocol         | Standard (HTTP, DNS, SSL, TCP) with Nuclei support              | Custom/proprietary protocols                     |
| Multi-step flows | Simple sequences OR JavaScript flow field                       | Complex stateful flows with shared context       |
| State            | Stateless - each request independent                            | Stateful - track data across lifecycle           |
| Maintainers      | Security researchers (may not be developers)                    | Developers comfortable with Go                   |
| Iteration speed  | Fast (edit YAML, no compilation)                                | Slower (compile, test, deploy)                   |
| Community        | Leverage nuclei-templates (11k+ templates)                      | Internal team only                               |

## Decision Tree

```
START: New detection capability needed
  │
  ├─► Is detection pure pattern matching on response content?
  │     YES → YAML Template
  │     NO ↓
  │
  ├─► Does detection require timing-based or differential analysis?
  │     YES → Go Plugin
  │     NO ↓
  │
  ├─► Is protocol standard (HTTP/DNS/SSL/TCP) with Nuclei support?
  │     YES → YAML Template (consider JavaScript flow for complexity)
  │     NO → Go Plugin
  │
  ├─► Does detection need shared state across multiple requests?
  │     YES → Go Plugin
  │     NO → YAML Template
  │
  ├─► Will security researchers (non-developers) maintain this?
  │     YES → YAML Template
  │     NO → Either (choose based on other criteria)
  │
  └─► Does similar detection exist?
        Check nuclei-templates first → if similar exists, extend YAML
        Check fingerprintx/janus first → if similar exists, extend Go
```

## Detailed Criteria

### Use YAML Templates When

| Criteria               | Details                                                                                | Examples                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Detection logic**    | Pattern matching (word, regex, status code, binary signatures)                         | HTTP response contains "admin panel", status code 200 + specific header |
| **Protocol**           | Standard protocols (HTTP, DNS, SSL, TCP) with existing Nuclei support                  | Web apps, DNS records, SSL certificates, TCP services                   |
| **Multi-step flows**   | Simple sequences OR can use JavaScript 'flow' field for conditionals                   | Login flow, multi-page enumeration with conditional branching           |
| **State requirements** | Stateless - each request independent                                                   | Check if `/admin` returns 200, probe DNS for wildcard records           |
| **Author persona**     | Security researchers who may not be developers                                         | Security analysts writing detection logic                               |
| **Iteration speed**    | Need fast iteration (edit YAML, no compilation)                                        | Rapid prototyping, testing variations                                   |
| **Community**          | Want to leverage/contribute to nuclei-templates community (11k+ templates)             | Share detections publicly, benefit from community templates             |
| **Examples**           | Version fingerprinting, admin panel detection, CVE pattern matching, misconfigurations | Detect CVE-2024-1234 via specific HTTP response pattern                 |

### Use Go Plugins When

| Criteria               | Details                                                                                                                    | Examples                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Detection logic**    | Algorithmic, timing-based, differential analysis                                                                           | Blind SQLi timing attacks, protocol fingerprinting via response timing             |
| **Protocol**           | Custom/proprietary protocols not in Nuclei                                                                                 | Industrial control systems, proprietary TCP protocols, custom binary protocols     |
| **Multi-step flows**   | Complex stateful flows with shared context across requests                                                                 | OOB correlation (send payload, check external callback), session-based enumeration |
| **State requirements** | Stateful - needs to track data across detection lifecycle                                                                  | Track authentication tokens, correlate multiple probe responses                    |
| **System access**      | Requires file operations, OS-level checks, external tool integration                                                       | Read local files, execute system commands, integrate with external scanners        |
| **Performance**        | High-performance concurrent scanning with connection pooling                                                               | Scan thousands of services per second with optimized networking                    |
| **Examples**           | Blind SQLi timing attacks, protocol fingerprinting (fingerprintx), service enumeration, OOB correlation with complex logic | Detect MySQL via protocol handshake analysis                                       |

## Hybrid Approaches (Nuclei v3)

Nuclei v3 introduced middle-ground options for cases between pure YAML and full Go plugins:

### 1. JavaScript Protocol

Complex logic within YAML structure:

```yaml
- type: javascript
  code: |
    for (let i = 0; i < 10; i++) {
      let resp = http.get(`${target}/page${i}`);
      if (resp.body.includes("secret")) {
        return true;
      }
    }
```

**Use when**: Logic too complex for matchers but doesn't need Go performance

### 2. Flow Field

Orchestrate multiple protocol sections with JavaScript:

```yaml
flow: |
  http(1);
  if (response.status == 200) {
    http(2);
  }
```

**Use when**: Conditional multi-step workflows within Nuclei

### 3. Code Protocol

Execute external scripts from YAML:

```yaml
- type: code
  engine: bash
  source: |
    nmap -sV -p 443 {{target}}
```

**Use when**: Need external tool integration but want to stay in Nuclei ecosystem

### When to Use Hybrid

- Logic is too complex for pure YAML matchers
- But doesn't warrant a full Go plugin
- Want to stay in Nuclei ecosystem for community benefits
- Need conditional flows or algorithmic logic
- External tools can handle the complexity

## Chariot-Specific Guidance

| Module                         | Pattern   | Why                                                            |
| ------------------------------ | --------- | -------------------------------------------------------------- |
| **nuclei-templates**           | YAML      | Community templates, pattern matching, HTTP/DNS/SSL detections |
| **Augustus**                   | YAML      | Declarative probe templates for service fingerprinting         |
| **fingerprintx**               | Go Plugin | Protocol-specific fingerprinting, stateful handshake analysis  |
| **janus capabilities**         | Go Plugin | Complex tool orchestration, stateful workflows                 |
| **chariot-aegis-capabilities** | VQL       | Velociraptor-specific (separate decision framework)            |

## Anti-Patterns

### ❌ Don't use YAML when

- **Fighting the DSL**: You're writing complex JavaScript to work around YAML limitations → use Go instead
- **Packet-level crafting**: Need to construct custom network packets → use Go with raw sockets
- **Connection pooling**: Need optimized connection reuse → use Go with custom transport
- **Complex state**: Tracking state across dozens of requests → use Go with proper state management
- **Heavy computation**: CPU-intensive analysis → use Go for performance

### ❌ Don't use Go when

- **Simple pattern matching**: A Nuclei template could do it → over-engineering
- **Community contributions**: Want non-developers to contribute → YAML is more accessible
- **Standard protocols**: HTTP/DNS/SSL detection → leverage existing Nuclei support
- **Rapid iteration**: Need to test variations quickly → YAML has faster feedback loop

## Workflow

### Step 1: Analyze Your Detection Need

Answer these questions:

1. **What does the detection do?** (pattern match, timing analysis, protocol probe?)
2. **What protocol?** (HTTP, DNS, TCP, or custom?)
3. **Does it need state?** (track data across requests?)
4. **Who maintains it?** (security researchers or developers?)
5. **Is there similar detection?** (check nuclei-templates and fingerprintx first)

### Step 2: Apply Decision Tree

Follow the decision tree above to get initial recommendation.

### Step 3: Check for Existing Implementations

**Before writing new detection:**

```bash
# Check nuclei-templates
cd modules/nuclei-templates
grep -r "your-detection-pattern" .

# Check fingerprintx plugins
cd modules/fingerprintx/pkg/plugins
ls -la

# Check janus capabilities
cd modules/janus/capabilities
ls -la
```

**If similar exists**: Extend the existing implementation rather than creating new one.

### Step 4: Route to Implementation Skill

**If YAML path:**

```
Read(".claude/skill-library/development/capabilities/implementing-yaml-template-engines/SKILL.md")
```

**If Go path:**

```
Read(".claude/skill-library/development/capabilities/implementing-detection-plugins/SKILL.md")
```

## Common Scenarios

### Scenario 1: Version Fingerprinting

**Detection**: Identify software version from HTTP response headers or body content.

**Recommendation**: **YAML Template**

**Why**: Pattern matching on response content, standard HTTP protocol, stateless, rapid iteration for testing patterns.

**Example**: Nuclei template to detect WordPress version from meta generator tag.

---

### Scenario 2: Blind SQL Injection

**Detection**: Detect SQLi via differential timing analysis.

**Recommendation**: **Go Plugin**

**Why**: Timing-based analysis, needs precise timing measurements, algorithmic (measure response times, calculate variance), stateful (track baseline timing).

**Example**: janus capability that sends payloads with sleep(), measures response times, determines if DB query execution is affected.

---

### Scenario 3: Custom Protocol Fingerprinting

**Detection**: Identify proprietary industrial control system via binary protocol handshake.

**Recommendation**: **Go Plugin**

**Why**: Custom protocol (not in Nuclei), packet-level crafting, binary response parsing, stateful handshake.

**Example**: fingerprintx plugin for SCADA protocol detection.

---

### Scenario 4: Multi-Page Admin Panel Detection

**Detection**: Enumerate common admin paths, follow redirects, check for login forms.

**Recommendation**: **YAML Template with JavaScript Flow**

**Why**: HTTP protocol (supported), multi-step flow with conditionals, pattern matching on responses, but needs conditional logic.

**Example**: Nuclei template with flow field to orchestrate path enumeration and form detection.

---

### Scenario 5: OAuth Misconfiguration Detection

**Detection**: Test OAuth endpoints for common misconfigurations (redirect_uri validation bypass, token leakage).

**Recommendation**: **YAML Template**

**Why**: HTTP protocol, pattern matching on OAuth responses, standard endpoints, can use Nuclei's HTTP matcher expressions.

**Example**: Nuclei template testing various redirect_uri payloads and matching error messages.

## Integration

### Called By

- `orchestrating-capability-development` - Phase 2 (Planning) asks "YAML or Go?" before implementation
- `capability-lead` agent - During architecture phase
- Developers via direct invocation when starting new capability

### Requires (invoke before starting)

| Skill | When | Purpose                       |
| ----- | ---- | ----------------------------- |
| None  | -    | Standalone decision framework |

### Calls (during execution)

| Skill                                | Phase/Step            | Purpose                     |
| ------------------------------------ | --------------------- | --------------------------- |
| `implementing-yaml-template-engines` | Step 4 (if YAML path) | HOW to build YAML templates |
| `implementing-detection-plugins`     | Step 4 (if Go path)   | HOW to build Go plugins     |

### Pairs With (conditional)

| Skill                                  | Trigger                       | Purpose                                |
| -------------------------------------- | ----------------------------- | -------------------------------------- |
| `implementing-go-plugin-registries`    | If Go path + new plugin type  | Registry patterns for plugin discovery |
| `enforcing-go-capability-architecture` | If Go path + janus capability | Go capability organization tiers       |

## Related Skills

- `implementing-yaml-template-engines` - HOW to build YAML template engines (Nuclei, Augustus)
- `implementing-detection-plugins` - HOW to build Go detection plugins (fingerprintx, janus)
- `implementing-go-plugin-registries` - Registry patterns for Go plugins
- `enforcing-go-capability-architecture` - Go capability organization tiers (Tier 1/2/3)

## Sources and References

**Complete source documentation** in [references/sources.md](references/sources.md):

- ProjectDiscovery Nuclei v3 documentation
- nuclei-templates repository analysis (11k+ templates)
- fingerprintx architecture patterns
- janus framework capabilities
- Augustus probe template design

## Validation

**Before choosing YAML**, verify:

- [ ] Protocol is supported by Nuclei (HTTP/DNS/SSL/TCP)
- [ ] Detection is pattern-based (regex, word matching)
- [ ] No complex state tracking needed
- [ ] Security researchers will maintain this

**Before choosing Go**, verify:

- [ ] Detection requires algorithmic analysis OR custom protocol
- [ ] Performance requirements warrant compiled code
- [ ] Developers available for maintenance
- [ ] YAML hybrid approaches insufficient

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
