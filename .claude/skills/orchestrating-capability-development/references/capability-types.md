# Capability Types

Comprehensive comparison of security capability types with implementation guidance.

## Overview

Chariot supports five types of security capabilities, each with different implementation patterns, quality metrics, and testing requirements.

## Type Comparison Matrix

| Aspect              | VQL Capability                    | Nuclei Template            | Janus Tool Chain              | Fingerprintx Module         | Scanner Integration            |
| ------------------- | --------------------------------- | -------------------------- | ----------------------------- | --------------------------- | ------------------------------ |
| **Purpose**         | Artifact collection & detection   | Vulnerability detection    | Tool orchestration            | Service fingerprinting      | External scanner integration   |
| **Language**        | VQL (Velociraptor Query Language) | YAML                       | Go                            | Go                          | Go or Python                   |
| **Runtime**         | Velociraptor agent                | Nuclei scanner             | Janus framework               | Fingerprintx tool           | Chariot backend                |
| **Input**           | System artifacts                  | HTTP endpoints             | Targets (domains, IPs)        | Network services            | Assets                         |
| **Output**          | Structured JSON artifacts         | Vulnerability findings     | Aggregated results            | Service metadata + CPE      | Normalized risk findings       |
| **Test Focus**      | Query parsing, artifact accuracy  | False positives, CVE match | Pipeline flow, error handling | Service detection accuracy  | API integration, normalization |
| **Typical LOC**     | 50-200 lines                      | 20-100 lines               | 200-500 lines                 | 150-400 lines               | 300-800 lines                  |
| **Module Location** | `chariot-aegis-capabilities/vql/` | `nuclei-templates/`        | `janus-framework/`, `janus/`  | `fingerprintx/pkg/plugins/` | `chariot/backend/pkg/scanner/` |

## VQL Capabilities

### What They Are

VQL capabilities use Velociraptor Query Language to collect and analyze system artifacts for security detection. They run on endpoints via Velociraptor agents.

### When to Use

- Detecting exposed credentials in files
- Identifying misconfigured system settings
- Collecting network connection data
- Scanning for malware indicators

### Architecture Focus (capability-lead)

- Query structure and performance
- Artifact schema design
- Collector configuration
- Output normalization

### Implementation Focus (capability-developer)

- VQL syntax and functions
- Artifact collection logic
- Data extraction and transformation
- Performance optimization (large file sets)

### Quality Metrics

- **Detection Accuracy**: % of true positives caught
- **False Positive Rate**: % of benign artifacts flagged
- **Performance**: Query execution time on large datasets
- **Coverage**: % of target environments supported (Windows/Linux/macOS)

### Example Capabilities

- S3 bucket credential detection
- SSH key exposure scanning
- Registry misconfiguration detection
- Process memory credential scanning

### Testing Requirements

- Query parsing validation
- Artifact collection accuracy
- Edge cases: empty files, large files, permission denied
- Multi-platform testing (if applicable)

## Nuclei Templates

### What They Are

YAML-based templates that define HTTP requests and response matchers for vulnerability detection. Run via Nuclei scanner.

### When to Use

- Detecting web application vulnerabilities
- Identifying misconfigurations in HTTP services
- Scanning for CVEs with HTTP attack vectors
- Checking for security headers

### Architecture Focus (capability-lead)

- Template structure and matchers
- Request sequences and workflows
- Extractor patterns
- Rate limiting and retry logic

### Implementation Focus (capability-developer)

- YAML syntax and structure
- HTTP request crafting
- Matcher conditions (regex, status, word)
- Dynamic variables and extractors

### Quality Metrics

- **Detection Accuracy**: % of vulnerable instances detected
- **False Positive Rate**: % of false alarms
- **CVE Coverage**: # of CVE variants detected
- **Performance**: Requests per target

### Example Templates

- CVE-2024-1234 detection
- Exposed admin panels
- CORS misconfiguration
- Security header validation

### Testing Requirements

- Matcher validation against vulnerable targets
- False positive testing on patched systems
- Edge cases: timeouts, redirects, WAF blocking
- Multi-version testing (if CVE-specific)

## Janus Tool Chains

### What They Are

Go-based orchestration pipelines that chain multiple security tools together, coordinating input/output between tools and aggregating results.

### When to Use

- Orchestrating multiple scanners (Nuclei + fingerprintx + custom)
- Complex workflows requiring tool sequencing
- Result aggregation from heterogeneous sources
- Custom security scanning pipelines

### Architecture Focus (capability-lead)

- Pipeline design and tool sequence
- Data flow between tools
- Error handling and retry logic
- Result aggregation strategy

### Implementation Focus (capability-developer)

- Go interfaces for tool integration
- Pipeline execution logic
- Error propagation and recovery
- Result parsing and normalization

### Quality Metrics

- **Pipeline Success Rate**: % of runs completing successfully
- **Error Handling**: % of tool failures handled gracefully
- **Result Accuracy**: % of tool outputs correctly aggregated
- **Performance**: Total pipeline execution time

### Example Tool Chains

- SSL scanner → Certificate analyzer → Vulnerability reporter
- Port scanner → Service fingerprinter → Exploit checker
- DNS enumerator → Subdomain validator → Asset recorder

### Testing Requirements

- Tool integration testing (mocked tools)
- Error handling validation
- Pipeline flow verification
- Result aggregation accuracy

## Fingerprintx Modules

### What They Are

Go plugins that fingerprint network services by sending probes and analyzing responses. Identify service type, version, and generate CPEs.

### When to Use

- Detecting custom protocols
- Service version identification
- Banner analysis and parsing
- CPE generation for asset inventory

### Architecture Focus (capability-lead)

- Probe design and protocol handling
- Version detection strategy
- Response parsing patterns
- CPE format generation

### Implementation Focus (capability-developer)

- Go plugin interface (5 methods)
- Network protocol implementation
- Version marker extraction
- Error handling for timeouts/malformed responses

### Quality Metrics

- **Detection Accuracy**: % of services correctly identified
- **Version Accuracy**: % of versions correctly extracted
- **False Positive Rate**: % of false service identifications
- **Protocol Correctness**: % of protocol interactions valid

### Example Modules

- MySQL fingerprinting (distinguishing from MariaDB)
- Redis version detection
- Memcached service identification
- Custom protocol fingerprinting

### Testing Requirements

- Service detection validation
- Version extraction accuracy
- Edge cases: timeouts, truncated responses, wrong ports
- Multi-version testing (Docker containers)

## Scanner Integrations

### What They Are

Go or Python clients that integrate external security scanners (Shodan, SecurityScorecard, etc.) into Chariot, normalizing results into the Chariot data model.

### When to Use

- Integrating third-party vulnerability scanners
- Connecting to external threat intelligence sources
- Importing scan results from commercial tools
- Bridging security platforms

### Architecture Focus (capability-lead)

- API design and authentication
- Result normalization strategy
- Rate limiting and pagination
- Error handling and retry logic

### Implementation Focus (capability-developer)

- Go/Python HTTP client
- API authentication (OAuth, API keys)
- Data mapping to Chariot models (Asset, Risk, Attribute)
- Pagination and batching logic

### Quality Metrics

- **API Integration**: % of API endpoints successfully called
- **Result Accuracy**: % of scan results correctly normalized
- **Rate Limit Handling**: % of rate limits handled gracefully
- **Data Completeness**: % of scanner fields mapped

### Example Integrations

- Shodan scanner integration
- SecurityScorecard API client
- Tenable.io vulnerability importer
- Custom scanner integration

### Testing Requirements

- API integration testing (mocked responses)
- Authentication validation
- Result normalization accuracy
- Error handling (rate limits, timeouts, auth failures)

## Implementation Pattern Decision

**Before selecting a capability type**, determine the implementation pattern:

```
Read: .claude/skill-library/development/capabilities/selecting-plugin-implementation-pattern/SKILL.md
```

This decision skill helps choose between:

| Pattern           | Capability Types             | When to Use                                                      |
| ----------------- | ---------------------------- | ---------------------------------------------------------------- |
| **YAML Template** | Nuclei, Augustus             | Pattern matching, declarative detection, community contributions |
| **Go Plugin**     | Fingerprintx, Janus, Scanner | Algorithmic detection, stateful flows, custom protocols          |
| **VQL**           | VQL Capability               | Velociraptor-specific endpoint detection                         |

### Decision Quick Reference

| Your Detection Needs           | → Pattern | → Type              |
| ------------------------------ | --------- | ------------------- |
| HTTP response pattern matching | YAML      | Nuclei Template     |
| Complex multi-step with state  | Go        | Janus Tool Chain    |
| Protocol fingerprinting        | Go        | Fingerprintx Module |
| External API integration       | Go        | Scanner Integration |
| Endpoint artifact collection   | VQL       | VQL Capability      |
| Declarative probes (Augustus)  | YAML      | Augustus Template   |

## Capability Selection Guide

### I need to detect system-level security issues

→ **VQL Capability**

Examples: exposed credentials in files, registry misconfigurations, process analysis

### I need to detect web application vulnerabilities

→ **Nuclei Template** (YAML) or **Go Plugin** (complex logic)

Use `selecting-plugin-implementation-pattern` to decide:

- Pattern matching on responses → Nuclei Template (YAML)
- Timing attacks, blind injection, OOB correlation → Go Plugin

Examples: CVEs, OWASP Top 10, security header issues

### I need to orchestrate multiple security tools

→ **Janus Tool Chain** (Go)

Examples: multi-tool workflows, result aggregation, complex scanning pipelines

### I need to identify network services and versions

→ **Fingerprintx Module** (Go)

Examples: service fingerprinting, version detection, CPE generation

### I need to integrate an external security scanner

→ **Scanner Integration** (Go/Python)

Examples: third-party API clients, result normalization, platform bridging

## Related

- [Phase 1: Brainstorming](phase-1-brainstorming.md) - Determining capability type
- [Phase 3: Discovery](phase-3-discovery.md) - Type-specific search patterns
- [Phase 4: Architecture](phase-4-architecture.md) - Type-specific architecture patterns
- [Quality Standards](quality-standards.md) - Type-specific quality metrics
