# Phase 4: Security Controls Mapping Workflow

**Detailed workflow for orchestrating Phase 4 of threat modeling.**

## Overview

Phase 4 identifies existing security mechanisms and gaps through **granular batched parallel execution** where each security concern (derived from Phase 3 architecture) gets a dedicated investigation agent, batched strictly by severity level.

**Key Innovation:** Instead of parallelizing by control category, we parallelize by **individual security concerns** for precise, concern-focused control mapping. Security concerns are derived from Phase 3 architecture artifacts (entry points, data flows, trust boundaries, components).

## Execution Strategy

**RECOMMENDED: Batched Parallel by Security Concern**

This is the primary execution strategy. See [phase-4-batched-execution.md](phase-4-batched-execution.md) for complete details.

### Quick Overview

1. **Derive concerns from Phase 3 architecture** - Analyze entry points, data flows, trust boundaries, and components to identify security concerns with severity ratings
2. **Execute in severity-ordered batches** - CRITICAL → HIGH → MEDIUM → LOW → INFO
3. **One agent per concern** - Each concern gets dedicated investigation
4. **Batch size = concern count** - 12 CRITICAL concerns = 12 agents in Batch 1
5. **Consolidate after each batch** - Cumulative updates to control category files
6. **Checkpoint between batches** - User approval before next severity level

### Example Execution Flow

```markdown
Phase 4 derived 41 concerns from Phase 3 architecture:

- 12 CRITICAL (e.g., unauthenticated API endpoints, data flows crossing trust boundaries)
- 13 HIGH (e.g., components handling crown jewels without encryption)
- 3 MEDIUM (e.g., incomplete input validation on entry points)
- 8 LOW (e.g., missing audit logging)
- 5 INFO (e.g., opportunities for security hardening)

Execution:
Batch 1: Launch 12 agents (CRITICAL) → consolidate → checkpoint
Batch 2: Launch 13 agents (HIGH) → consolidate → checkpoint
Batch 3: Launch 3 agents (MEDIUM) → consolidate → checkpoint
Batch 4: Launch 8 agents (LOW) → consolidate → checkpoint
Batch 5: Launch 5 agents (INFO) → consolidate → checkpoint
```

### Legacy Strategy: Parallel by Control Category

**For backward compatibility or smaller codebases (<10 concerns):**

Spawn agents per control category for thorough analysis:

```
Task("security-controls-mapper", "Map authentication controls in {scope}")
Task("security-controls-mapper", "Map authorization controls in {scope}")
Task("security-controls-mapper", "Map input validation in {scope}")
Task("security-controls-mapper", "Map cryptography usage in {scope}")
Task("security-controls-mapper", "Map audit logging in {scope}")
```

**Note:** This approach produces standard control category files but lacks the per-concern investigation context that Phase 5/6 benefit from.

### Sequential (Smaller Codebases)

Single agent with all categories:

```
Task("security-controls-mapper", "Map all security controls in {scope}. Categories: authentication, authorization, input-validation, cryptography, audit-logging, rate-limiting")
```

## Required Artifacts

### Standard Control Category Files (For Phase 5/6)

| Artifact                   | Description                               | Maps to STRIDE         |
| -------------------------- | ----------------------------------------- | ---------------------- |
| `authentication.json`      | Auth mechanisms                           | Spoofing               |
| `authorization.json`       | RBAC, ABAC, permissions                   | Elevation of Privilege |
| `input-validation.json`    | Validation patterns                       | Tampering              |
| `output-encoding.json`     | XSS prevention                            | Info Disclosure        |
| `cryptography.json`        | Encryption, hashing                       | Info Disclosure        |
| `secrets-management.json`  | Secret storage                            | Info Disclosure        |
| `audit-logging.json`       | Security events                           | Repudiation            |
| `rate-limiting.json`       | DoS protection                            | Denial of Service      |
| `cors-csp.json`            | Browser security policies                 | Multiple               |
| `dependency-security.json` | Third-party component risks               | Multiple               |
| `control-gaps.json`        | Consolidated gaps with source attribution | All categories         |
| `summary.md`               | Compressed handoff                        | <2000 tokens           |

### Investigation Files (Batched Execution)

Per-concern investigation files are organized by severity (critical/, high/, medium/, low/, info/) under `phase-4/investigations/`. See [investigation-file-schema.md](investigation-file-schema.md) for complete schema and structure.

## Control Detection Patterns

Use grep patterns to find control implementations:

- **Authentication:** jwt, token, session, cookie, auth, login, cognito, oauth
- **Authorization:** rbac, role, permission, policy, guard, middleware, authorize
- **Input Validation:** validate, sanitize, schema, zod, joi, express-validator
- **Cryptography:** encrypt, decrypt, hash, bcrypt, argon, aes, rsa, hmac

## Control Gap Analysis

For each component from Phase 3, check which control categories are present, identify missing controls, assess control strength (strong/weak/missing), and document in `control-gaps.json` with component, category, severity, description, and recommendation fields.

## Related Documentation

- **[phase-4-batched-execution.md](phase-4-batched-execution.md)** - Complete batched execution protocol, agent prompts, checkpoints, error recovery
- **[investigation-file-schema.md](investigation-file-schema.md)** - Per-concern investigation JSON schema
- **[consolidation-algorithm.md](consolidation-algorithm.md)** - How investigations map to control categories
- **[phase-4-to-5-compatibility.md](phase-4-to-5-compatibility.md)** - Integration with Phase 5/6
