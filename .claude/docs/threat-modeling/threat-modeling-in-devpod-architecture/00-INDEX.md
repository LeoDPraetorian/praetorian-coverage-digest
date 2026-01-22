# Threat Modeling DevPod: Master Documentation Index

**Last Updated**: 2026-01-10 **Status**: Complete **Total Documents**: 6 + Index

---

## 📋 Overview

This documentation suite provides comprehensive architecture, implementation,
and security specifications for the cloud-based Threat Modeling DevPod
infrastructure. The system enables security engineers to launch pre-configured
development environments for analyzing customer codebases at scale, with
zero-trust security and multi-cloud support.

---

## 📚 Document Suite Summary

| Document                                                                     | Focus                             | Token Count | Read Time     | Prerequisites      |
| ---------------------------------------------------------------------------- | --------------------------------- | ----------- | ------------- | ------------------ |
| **[00-INDEX.md](00-INDEX.md)**                                               | Master table of contents          | ~3,000      | 8 min         | None               |
| **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)**               | System design & decisions         | ~5,400      | 10-15 min     | None (start here)  |
| **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)**                   | Secure credential handling        | ~12,500     | 25-30 min     | Document 01        |
| **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)**         | Implementation specifications     | ~18,000     | 40-50 min     | Documents 01-02    |
| **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)**                     | All P0/P1 fixes + P2 enhancements | ~15,000     | 35-45 min     | Documents 01-03    |
| **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)**               | Deployment & operations           | ~6,000      | 15-20 min     | Documents 01-04    |
| **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** | Training data & telemetry         | ~24,000     | 50-60 min     | Documents 01-05    |
| **TOTAL**                                                                    | Complete documentation            | **~83,900** | **3-4 hours** | Sequential reading |

---

## 🎯 Role-Based Reading Paths

### 🏗️ Backend Developer Path

**Goal**: Implement Lambda API, Orchestrator, and credential security

**Estimated Time**: 90-120 minutes | **Token Usage**: ~36,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (10-15 min)
   - Focus: System Flow Diagram → Component Interaction

2. **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** (25-30 min)
   - Focus: ALL sections (critical for security)
   - Deep dive: JIT Pattern, Memory-Only Injection, P0-2, P1-4, P1-11, P1-15

3. **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** (40-50
   min)
   - Focus: Component 1 (Backend API), Component 2 (Orchestrator)
   - Reference: Multi-Cloud Service Mapping

4. **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** (15-20 min)
   - Focus: P0-1 (Command Injection), P1-3 (IAM Scoping)
   - Reference: Security Testing Matrix

---

### 💻 Frontend Developer Path

**Goal**: Implement React UI with cloud provider selection and SSH key
generation

**Estimated Time**: 45-60 minutes | **Token Usage**: ~18,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (10 min)
   - Focus: System Flow Diagram, Architecture Highlights

2. **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** (30-40
   min)
   - Focus: Component 3 (Frontend Components) ONLY
   - Deep dive: React Hooks, ThreatModelLauncher, Cloud Provider UI

3. **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** (10 min)
   - Focus: Frontend Security Hardening section
   - CSP, SRI, Input Sanitization, P1-6 (Client SSH Keys)

---

### 🔒 Security Engineer Path

**Goal**: Review all security controls, prepare adversarial testing

**Estimated Time**: 120-150 minutes | **Token Usage**: ~38,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (15 min)
   - Focus: Architecture Highlights, Security Review History

2. **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** (30 min)
   - Focus: ALL credential security patterns (P0-2, P1-4, P1-11, P1-15)

3. **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** (40-50 min)
   - Focus: ALL 16 P0/P1 security fixes + 1 P2 enhancement (chroot)
   - Deep dive: Security Vulnerability Summary, all P1 sections

4. **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** (20 min)
   - Focus: Adversarial Test Matrix, Incident Response Procedures

---

### ☁️ DevOps Engineer Path

**Goal**: Deploy multi-cloud infrastructure with security controls

**Estimated Time**: 75-90 minutes | **Token Usage**: ~32,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (10 min)
   - Focus: Multi-Cloud Support, Cost Estimates

2. **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** (40-50
   min)
   - Focus: Component 4 (Terraform Multi-Cloud), Component 5 (DevPod Image)
   - Deep dive: AWS/GCP/Azure Terraform modules

3. **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** (15-20 min)
   - Focus: P1-2 (Network Firewall), P1-3 (IAM), P1-5 (IMDS), P1-14 (VPC
     Endpoints)

4. **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** (15-20 min)
   - Focus: Implementation Roadmap, Deployment Checklist, Cost Monitoring

---

### 📊 Data/ML Engineer Path

**Goal**: Implement training data capture pipeline for model fine-tuning

**Estimated Time**: 90-120 minutes | **Token Usage**: ~42,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (10 min)
   - Focus: System Flow Diagram, Architecture Highlights

2. **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** (20 min)
   - Focus: P1-4 (Byte-Based Secret Handling) - required for secure telemetry
   - Reference: Frontend Security Hardening

3. **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** (50-60 min)
   - Focus: ALL sections (core document)
   - Deep dive: Telemetry Service, Sanitization Patterns, Preference Pair Extraction
   - Reference: DPO/RLHF Training Configuration, Privacy Framework

4. **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** (15 min)
   - Focus: Deployment Checklist, Cost Monitoring

---

### 🤖 Orchestrator Agent Path

**Goal**: Understand architecture for automated implementation tasks

**Estimated Time**: 60-75 minutes | **Token Usage**: ~29,000 tokens

1. **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** (10-15 min)
   - Complete read: System design context

2. **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** (20-25 min)
   - Focus: SCM Integration Flow, Token Lifecycle Summary, Security Properties

3. **[03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)** (20-25
   min)
   - Focus: Component 1, Component 2, Multi-Cloud Service Mapping

4. **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** (10 min)
   - Focus: Implementation Roadmap

---

## 🗂️ Complete Table of Contents

### Document 01: Architecture Overview

- Executive Summary
- Problem Statement
  - Current State
  - Desired State
- Architecture Overview
  - System Flow Diagram
  - Component Interaction
- Architecture Highlights
  - Multi-Cloud Support
- Implementation Roadmap
  - Phase 1: Core Infrastructure (Week 1-2)
  - Phase 2: Backend API (Week 3)
  - Phase 3: Runtime Security (Week 4)
  - Phase 4: Frontend & Integration (Week 5)
  - Phase 5: Compliance & Operations (Week 6)
- Cost Estimates
  - Base Infrastructure
  - Usage-Based Costs
- Security Review History
- Next Steps

---

### Document 02: SCM Integration & Credential Security

- SCM Integration Flow
  - Prerequisites
  - How Tokens Are Stored
  - Token Retrieval Flow (JIT Pattern)
  - Security Properties
  - Sequence Diagram
- Implementation: getCustomerSCMIntegration
- Token Lifecycle Summary
- **P0-2: Memory-Only Credential Injection**
  - Problem
  - Solution (io.Pipe implementation)
  - Defense Layers
  - Adversarial Test Verification
- **P1-4: Byte-Based Secret Handling**
  - Problem (string immutability)
  - Solution ([]byte throughout)
  - Usage Pattern
  - Defense Properties
- **P1-11: Credential Rotation**
  - Problem
  - Solution (Multi-key pool strategy)
  - Rotation Lambda
  - Usage Monitoring (CloudWatch)
  - Rotation Properties
- **P1-15: Git Token Race Condition Fix**
  - Problem
  - Solution (GIT_ASKPASS pattern)
  - SSH Command (Remote Execution)
  - Defense Properties
  - Adversarial Test Verification
- Adversarial Testing for Credentials
- Summary: Credential Security Guarantees

---

### Document 03: Component Implementation Specifications

- **Component 1: Backend API (Lambda)**
  - Overview
  - Implementation (LaunchThreatModelEnvironment)
  - Security Controls Applied
- **Component 2: DevPod Orchestrator (Multi-Cloud)**
  - Overview
  - Instance Type Mapping
  - Orchestrator Implementation
  - Instance Type Reference
  - Cost Comparison
- **Component 3: Frontend Components**
  - Overview
  - React Hooks (useThreatModelWorkspace)
  - Launcher Component
  - Security Controls Applied
- **Component 4: Infrastructure (Terraform Multi-Cloud)**
  - Overview
  - AWS Terraform Module
  - GCP Terraform Module
- **Component 5: DevPod Image Specification**
  - Overview
  - Dockerfile
  - Entrypoint Script
  - Pre-configured Claude Skills
  - Build and Publish Pipeline
- Multi-Cloud Service Mapping
- Summary: What You've Implemented

---

### Document 04: Security Hardening Implementation

- Security Vulnerability Summary (16 P0/P1 fixes + 1 P2 enhancement)
- **P0 Security Fixes (Critical)**
  - **P0-1: Command Injection Fix**
    - Problem
    - Solution (InputValidator)
    - Defense Properties
    - Adversarial Test
  - **P0-2: Memory-Only Credential Injection** (see Document 02)
- **P1 Security Fixes (High Priority)**
  - **P1-1: Hardened Dockerfile** (see Document 03)
  - **P1-2: AWS Network Firewall Egress Filtering**
    - Problem
    - Solution (TLS Inspection + domain allowlist)
    - Architecture
    - Why TLS Inspection is Required
    - Allowed Domains
    - Cost & Justification
  - **P1-3: Scoped IAM Permissions**
    - Problem
    - Solution (Principle of least privilege)
    - Orchestrator IAM Policy
  - **P1-4: Byte-Based Secret Handling** (see Document 02)
  - **P1-5: IMDS Protection** (see Document 03)
  - **P1-6: Client-Generated SSH Keys** (see Document 03)
  - **P1-7: Runtime Security Monitoring**
    - Problem
    - Solution (Falco with custom rules)
    - Falco Rules for Threat Modeling
    - Integration with CloudWatch
    - Auto-Termination on CRITICAL Events
  - **P1-8: Package Installation Controls**
    - Problem
    - Solution (Artifactory + sandboxing + egress filtering)
    - Artifactory Setup
    - DevPod Configuration
    - Script Sandboxing
  - **P1-9: Session Recording** (see Document 03)
  - **P1-10: Orchestrator Isolation**
    - Problem
    - Solution (Shared vs. per-customer orchestrator)
    - Implementation
  - **P1-11: Credential Rotation** (see Document 02)
  - **P1-12: AI Agent Permission Hardening**
    - Problem (indirect prompt injection)
    - Solution (disabled dangerous tools + confirmation)
    - Claude Code Configuration
    - Prompt Injection Detection
  - **P1-13: Fail-Closed Falco Monitoring**
    - Problem
    - Solution (Health monitor + auto-terminate)
    - Implementation (falco-health-monitor.sh)
    - Systemd Service
  - **P1-14: AWS Service Endpoint Restriction**
    - Problem
    - Solution (VPC Endpoints for all services)
    - Terraform Implementation
    - Benefits
  - **P1-15: Git Token Race Condition Fix** (see Document 02)
  - **P1-16: LUKS Encryption for Customer Code at Rest**
    - Problem
    - Solution (LUKS with keys in Secrets Manager)
    - Implementation (setup-luks-workspace.sh)
    - Cleanup on Termination
    - Key Rotation
    - Benefits
- Frontend Security Hardening
  - Content Security Policy (CSP)
  - Subresource Integrity (SRI)
  - Input Sanitization
- CI/CD Security Enhancements
- Security Testing Matrix
- Summary: Security Guarantees

---

### Document 05: Deployment & Operations

- Implementation Roadmap
  - Phase 1: Core Infrastructure (Week 1-2)
  - Phase 2: Backend API & Orchestrator (Week 3)
  - Phase 3: Runtime Security (Week 4)
  - Phase 4: Frontend & Integration (Week 5)
  - Phase 5: Compliance & Operations (Week 6)
- **Adversarial Test Matrix**
  - Network & Infrastructure Tests
  - Credential & Secret Tests
  - AI Agent Security Tests
  - AWS Service Exfiltration Tests
  - Monitoring Failure Tests
  - Encryption & Data Protection Tests
  - Browser Security Tests
- Deployment Checklist
  - Infrastructure ✓
  - Security Controls ✓
  - Browser Security ✓
  - Adversarial Testing ✓
  - Compliance & Operations ✓
- Cost Monitoring
  - Monthly Cost Breakdown
  - Cost Alerts
  - Cost Optimization
- Incident Response Procedures
  - CRITICAL: Falco Alert Triggered
  - HIGH: Credential Rotation Failure
  - MEDIUM: Network Firewall Bypass Attempt
  - LOW: Cost Alert Threshold Exceeded
- References
  - Internal Documentation
  - Network Security
  - DevPod & Remote Development
  - Runtime Security
  - Credential & Secrets Management
  - Browser Security & Cryptography
  - AI Agent Security
  - Real-Time Communication
  - Compliance & Standards

---

### Document 06: Training Data Capture

- Executive Summary
  - Key Objectives
  - Value Proposition
  - Critical Issues Resolved
- Problem Statement
  - Current Gap
  - Opportunity
  - Critical Constraints
- Research Findings
  - AWS Kinesis Best Practices
  - DPO/RLHF Training Data Pipelines
  - PII Sanitization Techniques
- Chariot Codebase Patterns Analysis
  - Service Composition Pattern
  - Tenant Isolation Pattern
  - Lambda Handler Pattern
  - Singleton Client Pattern
- Architecture Overview
  - Simplified Pipeline
  - Architecture Comparison
- **Component Specifications**
  - Service Interface (Chariot Patterns)
  - P1-4 Compliant Secret Handling
  - Telemetry Service Implementation
  - Lambda Handler
  - TypeScript MCP Server
  - React TelemetryFeedback Component
  - SAM Template Integration
- Sanitization Patterns (40+ Patterns)
  - Code Detection Patterns
  - Pattern Coverage Summary
- Privacy & Consent Framework
  - Legal Basis
  - Engineer Consent
  - Customer Consent (MSA)
  - Opt-Out Implementation
  - Data Retention Policy
  - GDPR Data Subject Rights
- Preference Pair Extraction
- Training Data Quality Metrics
  - KPIs and Targets
  - Athena Analytics Queries
- Model Training Use Cases
  - DPO Fine-Tuning Configuration
  - Few-Shot Prompt Engineering
  - RAG Retrieval System
  - Cost Optimization Strategy
- Testing Strategy
  - Unit Tests
  - Adversarial Tests
- Implementation Roadmap
  - Phase 1: Foundation
  - Phase 2: Collection
  - Phase 3: Processing
  - Phase 4: Training
- Cost Analysis
- Deployment Checklist
- Monitoring & Alerts

---

## 🔍 Quick Reference Matrix

### "Where do I find..." table

| Question                                          | Document                        | Section                                   |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------- |
| **How to handle SCM credentials securely?**       | 02-SCM-CREDENTIAL-FLOW          | P0-2: Memory-Only Credential Injection    |
| **Lambda implementation for workspace launch?**   | 03-COMPONENT-IMPLEMENTATION     | Component 1: Backend API                  |
| **Multi-cloud orchestrator implementation?**      | 03-COMPONENT-IMPLEMENTATION     | Component 2: DevPod Orchestrator          |
| **Network firewall setup with TLS inspection?**   | 04-SECURITY-HARDENING           | P1-2: AWS Network Firewall                |
| **How to prevent command injection?**             | 04-SECURITY-HARDENING           | P0-1: Command Injection Fix               |
| **Falco runtime monitoring rules?**               | 04-SECURITY-HARDENING           | P1-7: Runtime Security Monitoring         |
| **React frontend with cloud provider selection?** | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend Components          |
| **SSH key generation in browser?**                | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend (useSSHKeyPair)     |
| **Terraform modules for AWS/GCP/Azure?**          | 03-COMPONENT-IMPLEMENTATION     | Component 4: Infrastructure               |
| **DevPod Docker image hardening?**                | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image Specification   |
| **IMDS protection implementation?**               | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image (entrypoint.sh) |
| **Git token race condition fix?**                 | 02-SCM-CREDENTIAL-FLOW          | P1-15: Git Token Race Condition Fix       |
| **AI agent security controls?**                   | 04-SECURITY-HARDENING           | P1-12: AI Agent Permission Hardening      |
| **LUKS encryption for customer code?**            | 04-SECURITY-HARDENING           | P1-16: LUKS Encryption                    |
| **Adversarial testing procedures?**               | 05-DEPLOYMENT-OPERATIONS        | Adversarial Test Matrix                   |
| **Deployment checklist?**                         | 05-DEPLOYMENT-OPERATIONS        | Deployment Checklist                      |
| **Cost estimates and monitoring?**                | 01-ARCHITECTURE-OVERVIEW        | Cost Estimates                            |
| **Incident response runbooks?**                   | 05-DEPLOYMENT-OPERATIONS        | Incident Response Procedures              |
| **Implementation timeline?**                      | 01-ARCHITECTURE-OVERVIEW        | Implementation Roadmap                    |
| **All security fixes summary?**                   | 04-SECURITY-HARDENING           | Security Vulnerability Summary            |
| **Training data capture pipeline?**               | 06-THREAT-MODELING-DATA-CAPTURE | Architecture Overview                     |
| **Telemetry service implementation?**             | 06-THREAT-MODELING-DATA-CAPTURE | Component Specifications                  |
| **DPO/RLHF training configuration?**              | 06-THREAT-MODELING-DATA-CAPTURE | Model Training Use Cases                  |
| **PII sanitization patterns?**                    | 06-THREAT-MODELING-DATA-CAPTURE | Sanitization Patterns                     |
| **Preference pair extraction?**                   | 06-THREAT-MODELING-DATA-CAPTURE | Preference Pair Extraction                |
| **Privacy consent framework (GDPR)?**             | 06-THREAT-MODELING-DATA-CAPTURE | Privacy & Consent Framework               |
| **Code detection patterns (40+)?**                | 06-THREAT-MODELING-DATA-CAPTURE | Code Detection Patterns                   |

---

## 📊 Document Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                      00-INDEX.md                                │
│                   (Start here - no dependencies)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              01-ARCHITECTURE-OVERVIEW.md                        │
│              (Foundation - read first)                          │
│              • System design                                    │
│              • Component overview                               │
│              • Cost estimates                                   │
└───────┬─────────────────────┬───────────────────────────────────┘
        │                     │
        ▼                     ▼
┌───────────────────┐  ┌─────────────────────────────────────────┐
│ 02-SCM-CREDENTIAL │  │  03-COMPONENT-IMPLEMENTATION            │
│        -FLOW      │  │  (Requires: 01, 02)                     │
│ (Requires: 01)    │  │  • Lambda API                           │
│ • JIT pattern     │  │  • Orchestrator                         │
│ • Memory-only     │  │  • Frontend                             │
│ • P0-2, P1-4,     │  │  • Terraform                            │
│   P1-11, P1-15    │  │  • DevPod image                         │
└───────┬───────────┘  └──────────┬──────────────────────────────┘
        │                         │
        └────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              04-SECURITY-HARDENING.md                           │
│              (Requires: 01, 02, 03)                             │
│              • All 16 P0/P1 fixes + 1 P2 enhancement            │
│              • Security testing                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              05-DEPLOYMENT-OPERATIONS.md                        │
│              (Requires: 01, 02, 03, 04)                         │
│              • Adversarial testing                              │
│              • Deployment checklist                             │
│              • Operations                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              06-THREAT-MODELING-DATA-CAPTURE.md                 │
│              (Requires: 01, 02, 03, 04, 05)                     │
│              • Training data pipeline                           │
│              • Telemetry & sanitization                         │
│              • DPO/RLHF configuration                           │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Reading Order

**Sequential (Complete Understanding)**:

1. 00-INDEX (this document)
2. 01-ARCHITECTURE-OVERVIEW
3. 02-SCM-CREDENTIAL-FLOW
4. 03-COMPONENT-IMPLEMENTATION
5. 04-SECURITY-HARDENING
6. 05-DEPLOYMENT-OPERATIONS
7. 06-THREAT-MODELING-DATA-CAPTURE

**Parallel (Team-Based)**:

- **Backend Team**: 01 → 02 → 03 (Components 1-2) → 04 (P0-1, P1-3)
- **Frontend Team**: 01 → 03 (Component 3) → 04 (Frontend Security)
- **DevOps Team**: 01 → 03 (Components 4-5) → 04 (P1-2, P1-5, P1-14) → 05
- **Security Team**: 01 → 02 → 04 → 05
- **Data/ML Team**: 01 → 04 (P1-4) → 06 → 05

---

## 📖 Alphabetical Index

| Topic                                    | Document                        | Section                                     |
| ---------------------------------------- | ------------------------------- | ------------------------------------------- |
| **ACM Private CA**                       | 04-SECURITY-HARDENING           | P1-2: Network Firewall (TLS Inspection)     |
| **AI Agent Security**                    | 04-SECURITY-HARDENING           | P1-12: AI Agent Permission Hardening        |
| **Anthropic API**                        | 02-SCM-CREDENTIAL-FLOW          | P1-11: Credential Rotation                  |
| **Athena Analytics**                     | 06-THREAT-MODELING-DATA-CAPTURE | Training Data Quality Metrics               |
| **Artifactory**                          | 04-SECURITY-HARDENING           | P1-8: Package Installation Controls         |
| **AWS Network Firewall**                 | 04-SECURITY-HARDENING           | P1-2: AWS Network Firewall Egress Filtering |
| **Azure**                                | 03-COMPONENT-IMPLEMENTATION     | Multi-Cloud Service Mapping                 |
| **Byte-Based Secrets**                   | 02-SCM-CREDENTIAL-FLOW          | P1-4: Byte-Based Secret Handling            |
| **Claude Code**                          | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image (Claude Skills)   |
| **CloudWatch**                           | 04-SECURITY-HARDENING           | P1-7: Runtime Security (Falco integration)  |
| **Code Detection Patterns**              | 06-THREAT-MODELING-DATA-CAPTURE | Sanitization Patterns                       |
| **Command Injection**                    | 04-SECURITY-HARDENING           | P0-1: Command Injection Fix                 |
| **Content Security Policy (CSP)**        | 04-SECURITY-HARDENING           | Frontend Security Hardening                 |
| **Cost Estimates**                       | 01-ARCHITECTURE-OVERVIEW        | Cost Estimates                              |
| **Credential Rotation**                  | 02-SCM-CREDENTIAL-FLOW          | P1-11: Credential Rotation                  |
| **Data Flywheel**                        | 06-THREAT-MODELING-DATA-CAPTURE | Executive Summary (Value Proposition)       |
| **DevPod**                               | 03-COMPONENT-IMPLEMENTATION     | Component 2: DevPod Orchestrator            |
| **DPO (Direct Preference Optimization)** | 06-THREAT-MODELING-DATA-CAPTURE | Model Training Use Cases                    |
| **Docker Image**                         | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image Specification     |
| **DynamoDB**                             | 03-COMPONENT-IMPLEMENTATION     | AWS Terraform Module (VPC Endpoints)        |
| **Egress Filtering**                     | 04-SECURITY-HARDENING           | P1-2: AWS Network Firewall                  |
| **Encryption at Rest**                   | 04-SECURITY-HARDENING           | P1-16: LUKS Encryption                      |
| **Falco**                                | 04-SECURITY-HARDENING           | P1-7: Runtime Security Monitoring           |
| **Fail-Closed**                          | 04-SECURITY-HARDENING           | P1-13: Fail-Closed Falco Monitoring         |
| **Frontend**                             | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend Components            |
| **GCP**                                  | 03-COMPONENT-IMPLEMENTATION     | GCP Terraform Module                        |
| **GDPR Compliance**                      | 06-THREAT-MODELING-DATA-CAPTURE | Privacy & Consent Framework                 |
| **Git Credentials**                      | 02-SCM-CREDENTIAL-FLOW          | P1-15: Git Token Race Condition Fix         |
| **GIT_ASKPASS**                          | 02-SCM-CREDENTIAL-FLOW          | P1-15: Git Token Race Condition Fix         |
| **IAM Permissions**                      | 04-SECURITY-HARDENING           | P1-3: Scoped IAM Permissions                |
| **IMDS Protection**                      | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image (IMDSv2)          |
| **Incident Response**                    | 05-DEPLOYMENT-OPERATIONS        | Incident Response Procedures                |
| **JIT Credentials**                      | 02-SCM-CREDENTIAL-FLOW          | Token Retrieval Flow (JIT Pattern)          |
| **Lambda**                               | 03-COMPONENT-IMPLEMENTATION     | Component 1: Backend API                    |
| **LUKS**                                 | 04-SECURITY-HARDENING           | P1-16: LUKS Encryption                      |
| **MCP Server (Telemetry)**               | 06-THREAT-MODELING-DATA-CAPTURE | Component Specifications (TypeScript)       |
| **Memory-Only Injection**                | 02-SCM-CREDENTIAL-FLOW          | P0-2: Memory-Only Credential Injection      |
| **Multi-Cloud**                          | 01-ARCHITECTURE-OVERVIEW        | Multi-Cloud Support                         |
| **Network Firewall**                     | 04-SECURITY-HARDENING           | P1-2: AWS Network Firewall                  |
| **OAuth**                                | 02-SCM-CREDENTIAL-FLOW          | SCM Integration Flow                        |
| **Orchestrator**                         | 03-COMPONENT-IMPLEMENTATION     | Component 2: DevPod Orchestrator            |
| **Orchestrator Isolation**               | 04-SECURITY-HARDENING           | P1-10: Orchestrator Isolation               |
| **Package Controls**                     | 04-SECURITY-HARDENING           | P1-8: Package Installation Controls         |
| **PII Sanitization**                     | 06-THREAT-MODELING-DATA-CAPTURE | Sanitization Patterns                       |
| **Preference Pairs**                     | 06-THREAT-MODELING-DATA-CAPTURE | Preference Pair Extraction                  |
| **Prompt Injection**                     | 04-SECURITY-HARDENING           | P1-12: AI Agent Permission Hardening        |
| **RAG Retrieval System**                 | 06-THREAT-MODELING-DATA-CAPTURE | Model Training Use Cases                    |
| **React**                                | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend Components            |
| **RLHF (Reinforcement Learning)**        | 06-THREAT-MODELING-DATA-CAPTURE | Model Training Use Cases                    |
| **SCM Integration**                      | 02-SCM-CREDENTIAL-FLOW          | SCM Integration Flow                        |
| **Secrets Manager**                      | 02-SCM-CREDENTIAL-FLOW          | How Tokens Are Stored                       |
| **Security Testing**                     | 05-DEPLOYMENT-OPERATIONS        | Adversarial Test Matrix                     |
| **Session Recording**                    | 03-COMPONENT-IMPLEMENTATION     | Component 5: DevPod Image (asciinema)       |
| **SNI Spoofing**                         | 04-SECURITY-HARDENING           | P1-2: Network Firewall (TLS Inspection)     |
| **SSH Keys**                             | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend (useSSHKeyPair)       |
| **Telemetry Service**                    | 06-THREAT-MODELING-DATA-CAPTURE | Component Specifications                    |
| **TelemetryFeedback Component**          | 06-THREAT-MODELING-DATA-CAPTURE | React TelemetryFeedback Component           |
| **Terraform**                            | 03-COMPONENT-IMPLEMENTATION     | Component 4: Infrastructure                 |
| **TLS Inspection**                       | 04-SECURITY-HARDENING           | P1-2: AWS Network Firewall                  |
| **Token Lifecycle**                      | 02-SCM-CREDENTIAL-FLOW          | Token Lifecycle Summary                     |
| **Training Data Pipeline**               | 06-THREAT-MODELING-DATA-CAPTURE | Architecture Overview                       |
| **VPC Endpoints**                        | 04-SECURITY-HARDENING           | P1-14: AWS Service Endpoint Restriction     |
| **Web Crypto API**                       | 03-COMPONENT-IMPLEMENTATION     | Component 3: Frontend (SSH key generation)  |

---

## 🏷️ Document Tags & Categories

### By Security Priority

**Critical (P0)**:

- Document 02: P0-1 (Command Injection), P0-2 (Memory-Only Credentials)
- Document 04: Complete P0 coverage

**High Priority (P1)**:

- Document 02: P1-4, P1-11, P1-15 (credential security)
- Document 03: P1-1, P1-5, P1-6, P1-7, P1-9 (implementation)
- Document 04: All 16 P0/P1 security fixes + 1 P2 enhancement (chroot)

### By Component Type

**Backend**:

- Document 02: Complete credential flow
- Document 03: Components 1-2 (Lambda, Orchestrator)

**Frontend**:

- Document 03: Component 3 (React UI)
- Document 04: Frontend Security Hardening

**Infrastructure**:

- Document 03: Component 4 (Terraform), Component 5 (DevPod Image)
- Document 04: P1-2, P1-3, P1-5, P1-14

**Operations**:

- Document 05: Complete operations guide

**Data/ML**:

- Document 06: Training data capture, telemetry, DPO/RLHF configuration

### By Cloud Provider

**Multi-Cloud**:

- Document 01: Multi-Cloud Support table
- Document 03: Multi-Cloud Service Mapping, AWS/GCP/Azure Terraform modules

**AWS-Specific**:

- Document 04: P1-2 (Network Firewall), P1-3 (IAM), P1-14 (VPC Endpoints)

**Cloud-Agnostic**:

- Document 02: Credential patterns (works across all clouds)
- Document 03: Orchestrator (supports all clouds)

---

## 🚀 Getting Started

### New to the Project?

1. Start with **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)**
   (10-15 minutes)
2. Follow your role-based reading path above
3. Reference this index for specific topics as needed

### Implementing a Specific Component?

1. Use the **Quick Reference Matrix** to find your topic
2. Read the relevant section in its document
3. Cross-reference security controls in Document 04

### Preparing for Deployment?

1. Complete the **Security Engineer Path** for comprehensive understanding
2. Read **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** in full
3. Execute the Deployment Checklist

### Building Training Pipeline?

1. Review **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** P1-4 (byte-based secrets)
2. Read **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** in full
3. Follow the Implementation Roadmap in Document 06
4. Reference Privacy & Consent Framework for compliance

### Troubleshooting?

1. Check the **Alphabetical Index** for specific topics
2. Review **Incident Response Procedures** in Document 05
3. Reference **Adversarial Test Matrix** for validation

---

## 📝 Document Change History

| Date       | Change                         | Impact                                 |
| ---------- | ------------------------------ | -------------------------------------- |
| 2026-01-10 | Initial index creation         | Improves navigation across 5 documents |
| 2026-01-10 | Added role-based reading paths | Optimizes for different stakeholders   |
| 2026-01-10 | Added quick reference matrix   | Faster topic lookup                    |
| 2026-01-10 | Added alphabetical index       | Complete topic coverage                |
| 2026-01-10 | Incorporated Document 06       | Adds training data capture (6 docs)    |

---

## 🔗 Navigation

**You are here**: 00-INDEX.md (Master Documentation Index)

**Start reading**: [01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)

**All documents**:

- [00-INDEX.md](00-INDEX.md) ← You are here
- [01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)
- [02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)
- [03-COMPONENT-IMPLEMENTATION.md](03-COMPONENT-IMPLEMENTATION.md)
- [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)
- [05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)
- [06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)

---

**Total Documentation**: 6 documents + index | ~83,900 tokens | 3-4 hours
complete read

**Ready to begin? Start with
[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)**
