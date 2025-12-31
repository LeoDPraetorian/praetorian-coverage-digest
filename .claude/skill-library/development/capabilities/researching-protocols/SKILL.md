---
name: researching-protocols
description: Use when researching network protocols before implementing fingerprintx modules - guides through lab setup, active probing, pattern identification, and detection strategy documentation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, TodoWrite, AskUserQuestion
---

# Researching Protocols

**Research methodology for fingerprinting network protocols and services.**

## When to Use

Use this skill when:

- Creating a new fingerprintx module for a service/protocol
- Researching how to detect a network service
- Documenting API response patterns for fingerprinting
- Before invoking `writing-fingerprintx-modules` skill

**Key Principle:** You cannot implement a fingerprint module without first understanding what makes the service unique. Research BEFORE implementation.

**You MUST use TodoWrite before starting to track all steps.**

## Quick Reference

| Phase                     | Purpose                            | Output                        |
| ------------------------- | ---------------------------------- | ----------------------------- |
| 1. Requirements           | Define scope and known information | Service name, known endpoints |
| 2. Documentation          | Gather official sources            | API docs, RFCs, GitHub repos  |
| 3. Lab Setup              | Create test environment            | Docker commands, local setup  |
| 4. Active Probing         | Capture real responses             | Headers, bodies, banners      |
| 5. Pattern Identification | Find unique markers                | JSON fields, ports, paths     |
| 6. Detection Strategy     | Design fingerprint logic           | Primary/secondary/tertiary    |
| 7. Research Document      | Produce structured output          | Markdown document             |

## Progress Tracking (MANDATORY)

**Create these todos at workflow start:**

```
1. "Gather requirements for {service}" (Phase 1)
2. "Research {service} documentation" (Phase 2)
3. "Set up {service} lab environment" (Phase 3)
4. "Probe {service} endpoints and capture responses" (Phase 4)
5. "Identify unique markers for {service}" (Phase 5)
6. "Design detection strategy for {service}" (Phase 6)
7. "Create research document for {service}" (Phase 7)
```

---

## Phase 1: Requirements Gathering

Ask via AskUserQuestion or gather from context:

| Question                         | Purpose                    |
| -------------------------------- | -------------------------- |
| What service/protocol?           | Define target              |
| Known default port?              | Starting point for probing |
| Official documentation URL?      | Primary research source    |
| Similar services to distinguish? | Avoid false positives      |
| Existing implementations?        | Learn from prior art       |

**Output:** Service name, suspected port, documentation links.

---

## Phase 2: Documentation Research

### 2.1 Web Search Queries

Execute these searches:

```bash
# Official documentation
WebSearch("{service} API documentation")
WebSearch("{service} default port")

# Protocol specifications
WebSearch("{service} wire protocol")
WebSearch("{service} RFC specification")

# Existing detection
WebSearch("{service} fingerprinting")
WebSearch("{service} detection nmap")
```

### 2.2 GitHub Research

```bash
# Find implementations
WebSearch("site:github.com {service} client library")
WebSearch("site:github.com {service} protocol parser")
```

### 2.3 Document Findings

Record in research document:

- Official documentation URLs
- Wire protocol format (binary vs text vs HTTP)
- Authentication requirements
- Version history (affects detection strategy)

---

## Phase 3: Lab Setup

### 3.1 Docker Setup (Preferred)

Find official Docker image:

```bash
WebSearch("docker hub {service} official image")
```

Standard setup pattern:

```bash
# Pull and run
docker run -d -p {PORT}:{PORT} --name {service}-test {image}

# Verify running
docker ps | grep {service}

# Check logs
docker logs {service}-test
```

### 3.2 Document Setup Commands

Record exact commands for reproducibility:

```markdown
## Lab Setup

| Service   | Docker Command                           | Port   |
| --------- | ---------------------------------------- | ------ |
| {service} | `docker run -d -p {PORT}:{PORT} {image}` | {PORT} |
```

### 3.3 Multiple Versions (If Relevant)

For version detection, set up multiple versions:

```bash
docker run -d -p {PORT1}:{PORT} --name {service}-v1 {image}:v1
docker run -d -p {PORT2}:{PORT} --name {service}-v2 {image}:v2
```

---

## Phase 4: Active Probing

### 4.1 Common Endpoint Probes

Execute against running service:

```bash
# Root endpoint
curl -s http://localhost:{PORT}/

# Health endpoints
curl -s http://localhost:{PORT}/health
curl -s http://localhost:{PORT}/healthz
curl -s http://localhost:{PORT}/ready

# Version endpoints
curl -s http://localhost:{PORT}/version
curl -s http://localhost:{PORT}/api/version

# API endpoints
curl -s http://localhost:{PORT}/v1/models
curl -s http://localhost:{PORT}/api/info
```

### 4.2 Capture Headers

```bash
curl -sI http://localhost:{PORT}/ | head -20
curl -sI http://localhost:{PORT}/health | head -20
```

### 4.3 Document Responses

For each successful probe, record:

| Endpoint   | Status | Content-Type     | Body Sample         | Unique Markers |
| ---------- | ------ | ---------------- | ------------------- | -------------- |
| `/`        | 200    | text/plain       | "Running"           | Banner text    |
| `/version` | 200    | application/json | `{"version":"x.x"}` | version field  |

### 4.4 Auth Scenarios

Test with and without authentication:

```bash
# Without auth (fingerprinting must work here)
curl -s http://localhost:{PORT}/api/endpoint

# With auth (for enrichment)
curl -s -H "Authorization: Bearer {token}" http://localhost:{PORT}/api/endpoint
```

**Key:** Detection should work without auth. Enrichment (version, metadata) may require auth.

---

## Phase 5: Pattern Identification

### 5.1 Unique Markers Checklist

| Marker Type    | Question                                    | Example                    |
| -------------- | ------------------------------------------- | -------------------------- |
| **Port**       | Is the default port unique to this service? | 11434 = Ollama             |
| **Banner**     | Does root return identifiable text?         | "Ollama is running"        |
| **Endpoint**   | Are there service-specific API paths?       | `/api/tags` = Ollama       |
| **JSON Field** | Are there unique fields in responses?       | `"models"` array           |
| **Header**     | Are there service-specific headers?         | `x-ollama-version`         |
| **Error**      | Do errors have identifiable format?         | `{"error": {"type": ...}}` |

### 5.2 Differentiation Matrix

If similar services exist, document differences:

| Feature      | Service A | Service B | Service C |
| ------------ | --------- | --------- | --------- |
| Default Port | 8000      | 8080      | 11434     |
| `/version`   | Yes       | No        | No        |
| `/api/tags`  | No        | No        | Yes       |
| `owned_by`   | "vllm"    | "localai" | N/A       |

### 5.3 Version Extraction

Identify how to extract version:

```markdown
## Version Extraction

- **Endpoint:** GET /api/version
- **Field:** `$.version`
- **Format:** Semantic versioning (x.y.z)
- **Example:** `{"version": "0.1.32"}`
```

---

## Phase 6: Detection Strategy

### 6.1 Probe Priority

Design detection with fallbacks:

| Priority  | Probe              | Confidence | Rationale                   |
| --------- | ------------------ | ---------- | --------------------------- |
| PRIMARY   | `GET /api/tags`    | High       | Service-specific endpoint   |
| SECONDARY | `GET /api/version` | Medium     | May exist on other services |
| TERTIARY  | `GET /` (banner)   | Low        | Fallback if API blocked     |

### 6.2 Detection Logic

```
IF /api/tags returns {"models": [...]} THEN
  DETECTED: {service}
  ENRICH: Extract models, get version from /api/version
ELSE IF /api/version returns {"version": "..."} THEN
  DETECTED: {service}
  ENRICH: Extract version
ELSE IF / returns "{service} is running" THEN
  DETECTED: {service} (no version)
ELSE
  NOT DETECTED
```

### 6.3 CPE Format

Define vulnerability tracking identifier:

```
cpe:2.3:a:{vendor}:{product}:{version}:*:*:*:*:*:*:*
```

Example: `cpe:2.3:a:ollama:ollama:0.1.32:*:*:*:*:*:*:*`

### 6.4 Priority Relative to Other Protocols

| Service   | Priority | Reason                        |
| --------- | -------- | ----------------------------- |
| {service} | 50       | Run before generic HTTP (100) |

---

## Phase 7: Research Document Output

### 7.1 Document Structure

Create `{service}-fingerprinting-research.md`:

```markdown
# Fingerprinting {Service}: Research Analysis

**Purpose:** Research findings for creating fingerprintx module.
**Date:** {date}

## Executive Summary

- Key finding: {unique detection approach}
- Default port: {port}
- Detection confidence: {high/medium/low}

## 1. Network-Level Detection

### 1.1 Default Ports

### 1.2 Service Banners

## 2. HTTP Response Headers

{if applicable}

## 3. API Endpoint Fingerprints

### 3.1 Common Endpoints

### 3.2 Detection Strategy

## 4. JSON Response Structure Fingerprints

{captured response examples with markers}

## 5. Implementation Checklist

- [ ] Phase 1: Detection logic
- [ ] Phase 2: Version extraction
- [ ] Phase 3: CPE generation
- [ ] Phase 4: Tests

## 6. Testing Strategy

### 6.1 Test Targets

{docker commands}

### 6.2 Verification Commands

{fingerprintx commands}
```

### 7.2 Gold Standard Example

See: `/Users/nathansportsman/chariot-development-platform3/fingerprintx-detecting-llms.md`

This 1200+ line document demonstrates comprehensive protocol research for 5 LLM services.

---

## Integration with fingerprintx Workflow

After completing research:

1. **Read:** `writing-fingerprintx-modules` skill
2. **Input:** Your research document
3. **Output:** Working fingerprintx plugin

The research document provides all inputs needed for implementation:

- Default port → `PortPriority()`
- Detection logic → `Run()` method
- Version extraction → Enrichment phase
- CPE format → `buildCPE()` function

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization              | Why It's Wrong                                         |
| ---------------------------- | ------------------------------------------------------ |
| "I know this protocol"       | You know usage, not wire-level fingerprinting          |
| "Just probe a few endpoints" | Missing probes = missed detection or false positives   |
| "Skip lab, use production"   | Can't capture all responses safely in production       |
| "Documentation is enough"    | Docs describe intended behavior, not actual responses  |
| "One version is enough"      | Version detection requires multiple version comparison |

---

## References

- [Probing Patterns](references/probing-patterns.md) - Common endpoint patterns by service type
- [Response Analysis](references/response-analysis.md) - JSON marker identification techniques
- [Lab Setup Templates](references/lab-setup-templates.md) - Docker commands for common services

## Related Skills

| Skill                          | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `writing-fingerprintx-modules` | Implementation after research complete  |
| `researching-skills`           | Parent router (future)                  |
| `gateway-capabilities`         | Routes to capability development skills |
