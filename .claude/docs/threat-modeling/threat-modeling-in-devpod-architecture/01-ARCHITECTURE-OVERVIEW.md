# Threat Modeling DevPod: Architecture Overview

**Document**: 1 of 6 - Architecture & Design Overview **Purpose**: High-level
system understanding and decision context for architects and planning agents
**Last Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| **Document ID**    | 01-ARCHITECTURE-OVERVIEW                            |
| **Token Count**    | ~5,400 tokens                                       |
| **Read Time**      | 10-15 minutes                                       |
| **Prerequisites**  | None (starting point)                               |
| **Next Documents** | 02-SCM-CREDENTIAL-FLOW, 03-COMPONENT-IMPLEMENTATION |

---

## Related Documents

This document is part of the Threat Modeling DevPod architecture series:

- **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** - Secure credential
  handling for repository access
- **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** -
  Implementation details for all components
- **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - All P0/P1 security
  fixes
- **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Testing and
  operations procedures
- **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** -
  Training data capture and telemetry pipeline

---

## Entry and Exit Criteria

### Entry Criteria

- None - this is the starting point for understanding the system

### Exit Criteria

After reading this document, you should understand:

- Why this system exists (problem statement)
- What components make up the system
- How components interact
- What cloud providers are supported
- High-level implementation phases
- Cost implications
- When to consult detailed implementation documents

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Problem Statement](#problem-statement)
- [Architecture Overview](#architecture-overview)
- [Architecture Highlights](#architecture-highlights)
- [Implementation Roadmap](#implementation-roadmap)
- [Cost Estimates](#cost-estimates)
- [Security Review History](#security-review-history)
- [Next Steps](#next-steps)

---

## Executive Summary

This document defines the architecture for cloud-based threat modeling
infrastructure. The system enables security engineers to launch pre-configured
development environments for analyzing customer codebases at scale, allows for a
conduit for proprietary model training, and all without exposing sensitive code
to local machines that do not have proper security governance in place.

---

## Problem Statement

### Current State

- Threat modeling 1M LOC codebase overwhelms local laptops (memory, CPU)
- Customer code on local machines violates security policy
- Manual environment setup per engagement is unnecessary overhead
- Inconsistent tooling across security engineers
- No way to centralize model or user activity to train proprietary models

### Desired State

- Click button in Chariot UI → Cursor opens in 2-3 minutes
- Customer code loaded from integrated SCM (never touches local disk)
- Beefy EC2 instance handles heavy analysis (32-64GB RAM, 16+ vCPUs)
- Pre-configured Claude Code with threat modeling skills/agents
- Tight access control + audit logging
- Auto-cleanup after engagement closes
- Conduit for passing session activity back to core Chariot for model
  refinement/training

---

## Architecture Overview

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Chariot UI - Engagement View                                    │
│                                                                 │
│  Engagement: "ACME Corp Code Review" [Status: Active]           │
│  └─ Services: Pen Test, Code Review, Threat Modeling            │
│     └─ [Launch Threat Model Environment] ←── Click here         │
│                                                                 │
│  Configuration:                                                 │
│  └─ Cloud Provider: [AWS ▼] [GCP] [Azure]                       │
│  └─ Region: [us-east-1 ▼]                                       │
│  └─ Repository: [acme/webapp ▼]                                 │
│                                                                 │
│  Active Workspaces:                                             │
│  └─ tm-ENG123-1734700800 [AWS/us-east-1] [Ready] [Connect]      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /launch (returns immediately)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ API: POST /engagements/{id}/threat-model/launch                 │
│                                                                 │
│ Request: { cloud_provider, region, repository_url, branch }     │
│                                                                 │
│ 1. Validate user authorization (security_engineer role)         │
│ 2. Check max workspace limit (1 per engineer)                   │
│ 3. Create workspace record (status: queued, cloud: aws|gcp|az)  │
│ 4. Publish provision request to message queue                   │
│ 5. Return 202 Accepted with workspace_id + SSE endpoint         │
│                                                                 │
│ Response time: <500ms                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Message Queue
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ DevPod Orchestrator                                             │
│                                                                 │
│ Components:                                                     │
│ - Message queue consumer                                        │
│ - DevPod CLI with all providers (aws, gcp, azure)               │
│ - Docker daemon running                                         │
│ - Multi-cloud credentials (IAM role / Service Account / MI)     │
│                                                                 │
│ Workflow:                                                       │
│ 1. Receive message with provision request + cloud_provider      │
│ 2. Update database: status = provisioning                       │
│ 3. Fetch SCM token from secrets manager (JIT)                   │
│ 4. Execute: devpod up --provider {aws|gcp|azure} ...            │
│ 5. Update database: status = initializing                       │
│ 6. Clone repository (token cleared after clone)                 │
│ 7. Update database: status = ready, ssh_config = {...}          │
│ 8. Send notification                                            │
│                                                                 │
│ Execution time: 2-3 minutes                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│     AWS       │  │     GCP       │  │    Azure      │
│               │  │               │  │               │
│ m5.4xlarge    │  │ n2-standard-16│  │ Standard_D16s │
│ us-east-1     │  │ us-central1   │  │ eastus        │
│ VPC + Bastion │  │ VPC + IAP     │  │ VNet + Bastion│
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Threat Modeling DevPod (any cloud, private network)             │
│                                                                 │
│ /workspace/                                                     │
│  ├── customer-code/           ← Cloned from SCM                 │
│  ├── .claude/                 ← Pre-configured skills/agents    │
│  └── engagement-context.json  ← Engagement metadata             │
│                                                                 │
│ Security Engineer runs:                                         │
│ $ /threat-model "Comprehensive threat model for ACME Corp"      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

1. **Chariot UI** (Frontend React application)
   - Engagement management interface
   - Cloud provider selection (AWS/GCP/Azure)
   - Workspace lifecycle controls (launch/connect/stop/terminate)
   - Real-time status updates via Server-Sent Events

2. **Backend API** (AWS Lambda)
   - Async workspace provisioning (202 Accepted pattern)
   - Authentication and authorization
   - Workspace limit enforcement
   - Database state management

3. **DevPod Orchestrator** (EC2/GCE/Azure VM)
   - Message queue consumer
   - Multi-cloud DevPod CLI integration
   - Just-In-Time credential fetching
   - Repository cloning and workspace initialization

4. **DevPod Environment** (Multi-cloud compute)
   - Isolated development environment
   - Pre-configured security tools and skills
   - Network-isolated with egress filtering
   - Runtime security monitoring (Falco)

**See**: [03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md) for
detailed implementation specifications

---

## Architecture Highlights

| Capability                 | Implementation                                         |
| -------------------------- | ------------------------------------------------------ |
| **Multi-cloud workspaces** | DevPod native providers (AWS, GCP, Azure)              |
| **Cloud-agnostic IaC**     | Terraform modules for orchestration infrastructure     |
| **Zero-trust security**    | Continuous auth, microsegmentation, mTLS               |
| **Data protection**        | Encryption at rest (LUKS), DLP egress filtering        |
| **Runtime security**       | Falco monitoring, seccomp, AppArmor, read-only FS      |
| **Incident response**      | Automated SOAR, forensics capture, SIEM integration    |
| **Supply chain security**  | Container scanning, SBOM, image signing (Cosign)       |
| **Compliance**             | SOC2, ISO27001, GDPR by design                         |
| **Async provisioning**     | Orchestrator + message queue (non-blocking API)        |
| **Real-time status**       | Server-Sent Events with polling fallback               |
| **Secure credentials**     | JIT injection, automatic rotation (Secrets Manager)    |
| **Workspace management**   | Full lifecycle UI (launch/connect/stop/terminate)      |
| **Network isolation**      | Private subnets, SSM Session Manager, Network Firewall |
| **Audit logging**          | Immutable logs (S3 Object Lock), session recording     |
| **Deception technology**   | Honeytokens, canary files, insider threat detection    |

### Multi-Cloud Support

The architecture supports three major cloud providers with equivalent security
controls:

| Feature               | AWS                   | GCP                           | Azure            |
| --------------------- | --------------------- | ----------------------------- | ---------------- |
| **Compute**           | EC2 m5.4xlarge        | Compute Engine n2-standard-16 | Standard_D16s_v3 |
| **Network Isolation** | VPC + Private Subnets | VPC + Private Subnets         | VNet + Subnets   |
| **Egress Filtering**  | Network Firewall      | Cloud Firewall                | Azure Firewall   |
| **Bastion Access**    | Session Manager       | Identity-Aware Proxy          | Bastion Host     |
| **Secret Management** | Secrets Manager       | Secret Manager                | Key Vault        |
| **Identity**          | IAM Roles             | Service Accounts              | Managed Identity |

**See**: [03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md) →
Section "Infrastructure (Terraform Multi-Cloud)" for Terraform module
implementations

---

## Implementation Roadmap

The implementation is divided into 5 phases over 6 weeks:

### Phase 1: Core Infrastructure & Network Security (Week 1-2)

**Deliverables**:

- VPC with public/private/firewall subnets
- NAT Gateway for private subnet egress
- AWS Network Firewall with SNI-based domain allowlist
- VPC endpoints for S3 and Secrets Manager
- Hardened DevPod Docker image
- Session recording setup
- IMDS protection via iptables

**Security Controls**: P1-1 (Hardened Dockerfile), P1-2 (Network Firewall), P1-5
(IMDS Protection), P1-8 (Package Controls), P1-9 (Session Recording)

### Phase 2: Backend API & Orchestrator (Week 3)

**Deliverables**:

- Lambda endpoints (launch, status, events, terminate)
- Secrets & credential management with JIT pattern
- EC2 Orchestrator service with SQS consumer
- DevPod CLI integration (multi-cloud)
- User SSH public key injection

**Security Controls**: P0-1 (Command Injection Fix), P0-2 (Memory-Only
Credentials), P1-4 (Byte-Based Secrets), P1-6 (Client SSH Keys), P1-11
(Credential Rotation)

### Phase 3: Runtime Security (Week 4)

**Deliverables**:

- Falco deployment with DevPod-specific rules
- CloudWatch integration for alerts
- Auto-termination triggers for CRITICAL events
- Artifactory deployment for package proxy
- Sandboxed script execution enforcement

**Security Controls**: P1-7 (Falco Monitoring), P1-8 (Package Controls), P1-13
(Falco Fail-Closed)

### Phase 4: Frontend & Integration (Week 5)

**Deliverables**:

- SSH keypair generation utilities (Web Crypto API)
- Cloud provider selection UI
- Enhanced error sanitization
- Session playback viewer
- End-to-end integration tests
- Adversarial test suite

**Security Controls**: P1-6 (Client SSH Keys), Frontend security hardening

### Phase 5: Compliance & Operations (Week 6)

**Deliverables**:

- CloudTrail log aggregation
- Session recording compliance reports
- Credential rotation audit trails
- Security dashboard
- Incident response procedures
- Cost optimization review

**Security Controls**: All P0/P1 controls validated via adversarial testing

**See**: [05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md) for detailed
deployment procedures and adversarial test matrix

---

## Cost Estimates

### Base Infrastructure

| Component                             | Monthly Cost | Notes                                            |
| ------------------------------------- | ------------ | ------------------------------------------------ |
| EC2 Orchestrator (shared)             | ~$25         | t3.medium always-on, multi-customer              |
| Dedicated orchestrator (per customer) | ~$25 each    | For sensitive engagements (P1-10)                |
| NAT Gateway                           | ~$35         | Data transfer dependent                          |
| **AWS Network Firewall (base)**       | ~$285        | **Required**: Fixed ($0.395/hr × 720hr)          |
| **Network Firewall data processing**  | ~$65-200     | $0.065/GB egress traffic                         |
| **TLS Inspection processing**         | ~$100-300    | **Required**: $0.10/GB (prevents SNI spoofing)   |
| **ACM Private CA**                    | ~$400        | **Required**: For TLS Inspection certificates    |
| **Artifactory (self-hosted)**         | ~$75         | t3.large for package proxy (P1-8)                |
| **Falco monitoring**                  | ~$15         | Included in orchestrator/DevPod instances (P1-7) |
| S3 storage (outputs)                  | ~$5          | Threat model outputs                             |
| S3 storage (sessions)                 | ~$10         | Session recordings (P1-9)                        |
| SQS                                   | <$1          | Low volume                                       |
| CloudWatch Logs                       | ~$10         | Falco alerts, session logs                       |
| VPC Endpoints (DynamoDB, etc.)        | ~$25         | Gateway + Interface endpoints (P1-14)            |

**Base infrastructure total**: $1,050-1,400/month

### Usage-Based Costs

| Resource                   | Cost      | Usage Pattern                     |
| -------------------------- | --------- | --------------------------------- |
| DevPod instances (small)   | $0.33/hr  | 8 vCPU, 32GB - typical engagement |
| DevPod instances (medium)  | $0.77/hr  | 16 vCPU, 64GB - large codebase    |
| DevPod instances (large)   | $1.54/hr  | 32 vCPU, 128GB - massive monorepo |
| Network Firewall data      | $0.065/GB | Egress traffic processing         |
| Credential rotation Lambda | <$1/month | Runs every 30 days                |

**Example engagement costs**:

- 8-hour engagement, medium instance: $0.77 × 8 = $6.16
- 40-hour week, large instance: $1.54 × 40 = $61.60

**Total estimated costs**:

- **Base**: $1,050-1,400/month
- **Per engagement**: $5-60 depending on duration and size

> **Critical Note - Cost Justification**: The combined AWS Network Firewall +
> TLS Inspection + ACM Private CA (~$850-1,000/month) is a **required security
> control**, not optional. TLS Inspection prevents SNI spoofing attacks that
> completely bypass domain filtering. Without it, attackers can exfiltrate
> customer code to any IP address by spoofing allowed domain names in the TLS
> handshake. The security guarantee justifies the cost for handling sensitive
> customer code.

**See**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) → Section "P1-2:
AWS Network Firewall Egress Filtering" for technical implementation

---

## Security Review History

| Date       | Reviewer             | Status    | Key Findings                            |
| ---------- | -------------------- | --------- | --------------------------------------- |
| 2025-12-20 | Security Engineering | HIGH RISK | 5 critical violations identified        |
| 2025-12-21 | Architecture Review  | ADDRESSED | All P0/P1 resolved (defense-in-depth)   |
| 2025-12-21 | Pedantic Audit       | UPDATED   | P1-12, P1-13, P1-14, P1-15 incorporated |
| 2025-12-21 | External Research    | ENHANCED  | P1-2, P1-11, P1-14, P1-16 added         |

### Security Audit Findings (2025-12-21)

The following critical issues were identified and incorporated into
requirements:

| Issue                      | Risk     | Resolution                      | Ref        |
| -------------------------- | -------- | ------------------------------- | ---------- |
| AI Agent dangerous tools   | HIGH     | Disabled + tool confirmation    | P1-12      |
| Network Egress wildcard    | CRITICAL | Mandatory VPC Endpoints         | P1-14      |
| Falco Fail-Open            | MED-HIGH | Health monitor + auto-terminate | P1-13      |
| Git Token disk persistence | MEDIUM   | GIT_ASKPASS pattern             | P1-15      |
| Normative Language         | LOW      | MUST/MUST NOT language          | Throughout |

### External Security Research Validation (2025-12-21)

Industry best practices research identified additional enhancements:

| Issue                     | Risk     | Resolution                   | Ref   |
| ------------------------- | -------- | ---------------------------- | ----- |
| SNI Spoofing Bypass       | CRITICAL | TLS Inspection + ACM PCA     | P1-2  |
| Missing DynamoDB Endpoint | MEDIUM   | DynamoDB Gateway + policy    | P1-14 |
| API Key Rotation          | MEDIUM   | Multi-key pool strategy      | P1-11 |
| Browser SSH Key XSS       | MEDIUM   | CSP, SRI, server alternative | P1-6  |
| Code Encryption at Rest   | MEDIUM   | LUKS + Secrets Manager keys  | P1-16 |
| Cost Estimate Undercount  | LOW      | Added TLS + ACM PCA costs    | Costs |

**See**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for complete
implementation details of all P0/P1 security fixes

---

## Next Steps

After understanding this architecture overview, proceed to:

### For Backend Developers

1. Read **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** - Understand
   secure credential handling patterns
2. Read **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** -
   Implement Lambda and Orchestrator components
3. Reference **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - Apply
   security controls during implementation

### For Frontend Developers

1. Read **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** →
   Section "Frontend Components"
2. Reference **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** → Section
   "Frontend Security Hardening"

### For Security Engineers

1. Read **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** - Deep dive
   into credential security
2. Read **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - Review all 16
   P0/P1 security fixes
3. Read **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Plan
   adversarial testing

### For DevOps Engineers

1. Read **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** →
   Section "Infrastructure (Terraform Multi-Cloud)"
2. Read **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** →
   Infrastructure security controls
3. Read **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Execute
   deployment checklist

### For Data/ML Engineers

1. Read **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** → Section "P1-4:
   Byte-Based Secret Handling" (required for secure telemetry)
2. Read **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** -
   Complete training data pipeline implementation
3. Reference **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** -
   Deployment checklist and monitoring

---

## Document Change History

| Date       | Change                                                      | Impact                                    |
| ---------- | ----------------------------------------------------------- | ----------------------------------------- |
| 2026-01-10 | Document split from monolithic THREAT-MODELING-IN-DEVPOD.md | Improved readability, reduced token count |
| 2026-01-10 | Added cross-references to related documents                 | Better navigation                         |
| 2026-01-10 | Added entry/exit criteria                                   | Clear learning objectives                 |

---

**End of Document 1 of 6**

**Continue to**: [02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md) for
secure credential handling patterns
