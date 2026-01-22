# Capability Types

**Comprehensive comparison of VQL, Nuclei, Janus, Fingerprintx, and Scanner capability types.**

---

## Overview

Security capabilities in Chariot span multiple technologies and frameworks. Each capability type has distinct:

- Architecture patterns
- Development workflows
- Testing requirements
- Quality metrics

---

## Capability Type Comparison

| Type         | Lead Focus                       | Developer Focus                | Test Focus                    |
| ------------ | -------------------------------- | ------------------------------ | ----------------------------- |
| VQL          | Query structure, artifacts       | Velociraptor queries           | Query parsing, detection      |
| Nuclei       | Template structure, matchers     | YAML templates, detection      | False positives, CVE coverage |
| Janus        | Pipeline design, tool chain      | Go integration, orchestration  | Pipeline flow, error handling |
| Fingerprintx | Probe design, protocol           | Go modules, response parsing   | Service detection accuracy    |
| Scanner      | API design, result normalization | Go/Python client, data mapping | Integration, error cases      |

---

## VQL Capabilities

**Framework:** Velociraptor Query Language

### Architecture Focus

- Query structure and optimization
- Artifact definition schemas
- Cross-platform support (Windows/Linux/macOS)
- Output field mapping to Tabularium schema

### Development Patterns

- VQL syntax for endpoint data collection
- Artifact definitions with parameters
- Collector integration patterns
- Performance optimization for large result sets

### Testing Focus

- Query syntax validation
- Detection accuracy on test samples
- False positive rate measurement
- Platform coverage verification

### Key Files

- Location: `chariot-aegis-capabilities/vql/`
- Pattern: `*.vql` artifact definitions
- Tests: `*_test.vql` or Go-based test harness

---

## Nuclei Templates

**Framework:** ProjectDiscovery Nuclei

### Architecture Focus

- YAML template structure
- Matcher design (status, word, regex)
- CVE metadata completeness
- Request count optimization

### Development Patterns

- Template structure with id, info, requests
- Conditional matchers with DSL
- Extraction patterns for evidence
- Severity classification (info, low, medium, high, critical)

### Testing Focus

- Template syntax validation
- False positive rate (target: <=2%)
- CVE coverage verification
- Known-vulnerable target testing

### Key Files

- Location: `nuclei-templates/` or similar
- Pattern: `*.yaml` template definitions
- Naming: `CVE-YYYY-NNNNN.yaml` for CVE-specific

---

## Janus Tool Chains

**Framework:** Chariot Janus Security Framework

### Architecture Focus

- Pipeline design (tool sequencing)
- Tool interface implementation
- Error propagation patterns
- Result aggregation

### Development Patterns

- Go implementation of `janus.Tool` interface
- Input/output marshaling
- Timeout and cancellation handling
- Tool dependency declaration

### Testing Focus

- Pipeline execution flow
- Error handling and recovery
- Integration with downstream tools
- Performance under load

### Key Files

- Location: `modules/janus/` or integration points
- Pattern: `*.go` implementing Tool interface
- Interface: `janus.Tool`

---

## Fingerprintx Modules

**Framework:** Praetorian Fingerprintx Service Detection

### Architecture Focus

- Probe design for service detection
- Protocol-specific parsing
- Response signature analysis
- Multi-probe strategies

### Development Patterns

- Go plugin implementation
- Service fingerprint matching
- Protocol negotiation handling
- Confidence scoring

### Testing Focus

- Service detection accuracy (target: >=98%)
- Protocol edge cases
- Timeout handling
- Multi-service port scenarios

### Key Files

- Location: `fingerprintx/plugins/`
- Pattern: `*.go` plugin implementations
- Interface: `Plugin` with `Probe()` method

---

## Scanner Integrations

**Framework:** Third-party scanner API integrations

### Architecture Focus

- API client design
- Result normalization to Tabularium
- Rate limiting compliance
- Error recovery patterns

### Development Patterns

- Go or Python client implementation
- OAuth/API key authentication
- Pagination handling
- Async result polling

### Testing Focus

- API integration correctness
- Rate limit compliance
- Error handling (4xx, 5xx responses)
- Data mapping accuracy

### Key Files

- Location: `modules/chariot/backend/pkg/scanner/` or integration points
- Pattern: `*.go` scanner client implementations

---

## Type Selection Guide

| If you need to...                           | Use Type     |
| ------------------------------------------- | ------------ |
| Collect endpoint data via Velociraptor      | VQL          |
| Detect web vulnerabilities with HTTP probes | Nuclei       |
| Chain multiple security tools in sequence   | Janus        |
| Identify services on network ports          | Fingerprintx |
| Integrate third-party scanner API           | Scanner      |

---

## Related References

- [Agent Matrix](agent-matrix.md) - Agent selection by capability type
- [Quality Standards](quality-standards.md) - Quality metrics per type
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - P0 requirements per type
- [P0 Compliance](p0-compliance.md) - Validation commands per type
