# CIS Benchmark Profile Selection Guidance

**Purpose**: Help organizations select the appropriate CIS profile level (Level 1, Level 2, or STIG)

**Last Updated**: 2026-01-07

---

## Profile Overview

CIS Benchmarks organize controls into **three profile levels** with cumulative requirements:

- **Level 1**: Baseline security (standalone)
- **Level 2**: Level 1 + enhanced controls (cumulative)
- **STIG Profile**: Level 1 + Level 2 + government-specific (cumulative)

**Key Principle**: You cannot skip levels. Level 2 requires Level 1. STIG requires Level 1 + Level 2.

---

## Level 1 Profile

### Definition

**Baseline security recommendations** that can be implemented with minimal business disruption while lowering the attack surface.

### Characteristics

- **Implementation Complexity**: Low to moderate
- **Business Impact**: Minimal
- **Performance Impact**: Negligible
- **Resource Requirements**: Limited IT staff, basic expertise
- **Deployment Speed**: Quick (days to weeks)
- **Usability Impact**: Does not hinder business functionality

### Target Environments

✅ **Use Level 1 for**:
- All organizations as baseline minimum
- Development and test environments
- Non-mission-critical systems
- Organizations with limited security resources
- Small to mid-sized businesses
- General-purpose workstations and servers

### Example Controls

**AWS**:
- Root user MFA enabled
- S3 block public access enabled
- CloudTrail enabled in all regions
- IAM password policy minimum 14 characters

**Azure**:
- Secure transfer required for storage accounts
- SQL TDE encryption enabled
- NSG Flow Logs captured
- RDP/SSH access from internet restricted

**Linux**:
- Basic password policies
- Firewall enabled and configured
- Unnecessary services disabled
- System logging configured

**Kubernetes**:
- No privileged containers
- No containers running as root
- No hostNetwork usage
- Basic RBAC policies

### Compliance Alignment

Level 1 satisfies baseline requirements for:
- PCI DSS (basic requirements)
- HIPAA (baseline security)
- General industry best practices
- Cyber insurance minimum requirements

### When Level 1 Is Sufficient

✅ **Proceed with Level 1 only when**:
1. Risk assessment shows low to moderate risk
2. No sensitive data processed or stored
3. No regulatory requirements for defense-in-depth
4. Limited security budget and resources
5. Organization is starting security journey

---

## Level 2 Profile

### Definition

**"Defense in depth" controls** for environments where security is paramount, potentially introducing operational complexity or reducing usability.

### Characteristics

- **Implementation Complexity**: Moderate to high
- **Business Impact**: May affect workflows
- **Performance Impact**: Noticeable (additional auth steps, logging overhead)
- **Resource Requirements**: Skilled IT professionals, security expertise
- **Deployment Speed**: Slower (weeks to months)
- **Usability Impact**: May introduce operational tradeoffs
- **Testing Required**: Extensive testing in non-production first

### Cumulative Nature

**Level 2 = All Level 1 controls + Level 2-specific controls**

Organizations must implement Level 1 before adding Level 2 controls.

### Target Environments

✅ **Use Level 2 for**:
- High-security environments
- Sensitive data processing (PII, PHI, financial data)
- Regulated industries (healthcare, finance, government)
- Mission-critical systems
- Organizations with robust IT capabilities
- Environments requiring defense-in-depth

### Example Controls (Level 2-Specific)

**AWS**:
- Hardware MFA for root user (not just virtual MFA)
- S3 MFA delete enabled
- CloudTrail S3 bucket access logging
- VPC flow logging in all VPCs
- CloudTrail encryption at-rest

**Azure**:
- Storage encrypted with customer-managed keys (CMK)
- SQL TDE protector encrypted with CMK
- PostgreSQL infrastructure double encryption
- Key Vault RBAC permission model
- VM unattached disks encrypted with CMK

**Linux**:
- Advanced audit logging (auditd)
- Mandatory access controls (AppArmor/SELinux enforcing)
- Encrypted filesystems (LUKS)
- Kernel parameter hardening
- NTP with authentication

**Kubernetes**:
- PSP/PSS restrictive policies enforced
- Secrets encryption at rest
- Network policies enforced
- Image vulnerability scanning in CI/CD
- Runtime security monitoring

### Compliance Alignment

Level 2 addresses requirements for:
- **NIST Cybersecurity Framework (CSF)** - Comprehensive protection
- **FedRAMP** - Federal cloud security
- **ISO 27001** - Information security management
- **PCI DSS** (stringent requirements)
- **HIPAA** (strict PHI protection)
- **SOC 2** (comprehensive controls)

### Potential Impacts (Plan for These)

⚠️ **Performance**:
- Increased authentication time (MFA, hardware tokens)
- Storage overhead (extensive logging, encryption)
- Network latency (VPC flow logs, NSG flow logs)

⚠️ **Usability**:
- Additional authentication steps may delay workflows
- Stricter access controls may require approval processes
- Encrypted storage may complicate key management

⚠️ **Operational**:
- Increased monitoring and log analysis workload
- More complex disaster recovery (encrypted backups)
- Higher training requirements for staff

### When Level 2 Is Required

✅ **Level 2 is necessary when**:
1. Processing sensitive data (PII, PHI, PCI, financial)
2. Subject to regulatory compliance (NIST, FedRAMP, ISO 27001)
3. High-value target (e.g., financial services, healthcare)
4. Previous security incidents or high threat landscape
5. Contractual requirements from customers/partners
6. Cyber insurance policy requirements

---

## STIG Profile

### Definition

**DoD Security Technical Implementation Guides (STIG)** requirements mapped to CIS Benchmarks, addressing government and military-grade security baselines.

### Characteristics

- **Implementation Complexity**: High
- **Business Impact**: May significantly affect operations
- **Prescriptive Requirements**: Mandatory for federal systems
- **Resource Requirements**: Government security expertise
- **Deployment Speed**: Slow (months)
- **Usability Impact**: Strict operational constraints

### Cumulative Nature

**STIG Profile = Level 1 + Level 2 + STIG-specific controls**

Organizations must implement both Level 1 and Level 2 before adding STIG-specific controls.

### Target Environments

✅ **Use STIG Profile for**:
- Department of Defense (DoD) systems
- Federal information systems
- DoD contractors connecting to DoD networks
- FedRAMP High environments
- Systems processing classified information
- Organizations with military contracts

### STIG vs CIS Comparison

| Aspect                 | CIS Benchmarks                | DISA STIGs                       |
| ---------------------- | ----------------------------- | -------------------------------- |
| **Origin**             | Consensus-based, industry-driven | DoD/military-focused             |
| **Categorization**     | Level 1 / Level 2 (impact-based) | CAT I / CAT II / CAT III (severity) |
| **Flexibility**        | Adaptable to various industries | Strict compliance requirements   |
| **Applicability**      | Cross-industry, broad functionality | Government/defense sector        |
| **Legal Requirement**  | Voluntary best practice       | Legally required for DoDIN       |

### STIG Severity Categories

| Category | Severity      | Risk Level                                  |
| -------- | ------------- | ------------------------------------------- |
| CAT I    | High          | Immediate exploitation risk, data loss      |
| CAT II   | Medium        | Exploitable but lower immediate risk        |
| CAT III  | Low           | Vulnerabilities without immediate failure   |

### When STIG Profile Is Required

✅ **STIG Profile is mandatory when**:
1. Part of DoD Information Networks (DoDIN)
2. Federal entity subject to FISMA requirements
3. DoD contractor connecting to DoD systems
4. FedRAMP High authorization required
5. Processing classified or controlled unclassified information (CUI)
6. Military systems and networks

### Hybrid Approach: CIS + STIG

Many organizations "blend both" frameworks:
- **CIS**: Broad cloud and application security (AWS, Azure, GCP, Kubernetes)
- **STIG**: Specific endpoint hardening (Windows, Linux baseline configurations)

**Example Architecture**:
```
Cloud Infrastructure (AWS/Azure/GCP)
    ↓
CIS Cloud Benchmarks (comprehensive cloud controls)
    ↓
Compute Instances (EC2, VMs)
    ↓
STIG OS Benchmarks (endpoint-specific hardening)
```

---

## Profile Selection Decision Tree

### Step 1: Federal/DoD Requirement?

```
Are you subject to DoD or federal security requirements?
    ├─ YES → STIG Profile (mandatory)
    └─ NO → Continue to Step 2
```

### Step 2: Data Sensitivity Assessment

```
What data do you process?
    ├─ Classified, CUI → STIG Profile
    ├─ PII, PHI, PCI, Financial → Level 2
    └─ General business data → Continue to Step 3
```

### Step 3: Regulatory Compliance Requirements

```
Which regulations apply?
    ├─ FedRAMP, NIST 800-171 → STIG Profile or Level 2
    ├─ ISO 27001, SOC 2, HIPAA, PCI DSS → Level 2
    └─ General industry standards → Continue to Step 4
```

### Step 4: Risk Assessment

```
What is your threat profile?
    ├─ High (financial services, healthcare, critical infrastructure) → Level 2
    ├─ Moderate (e-commerce, professional services) → Level 1 + select Level 2 controls
    └─ Low (internal development, low-value data) → Level 1
```

### Step 5: Resource Assessment

```
What are your security resources?
    ├─ Robust IT team, security expertise → Level 2 (if needed by Steps 2-4)
    ├─ Moderate IT capability → Level 1 + select Level 2 controls
    └─ Limited resources → Level 1
```

---

## Implementation Phasing

### Phase 1: Level 1 Baseline (Weeks 1-4)

**Activities**:
1. Test environment deployment
2. Automated scan with CIS-CAT Pro / cloud-native tools
3. Prioritize failed checks
4. Implement Level 1 controls
5. Verify with automated scanning

**Success Criteria**: 95%+ Level 1 automated checks passing

### Phase 2: Level 1 Production Rollout (Weeks 5-8)

**Activities**:
1. Pilot with non-critical systems
2. Monitor for operational impact
3. Refine implementation based on feedback
4. Gradual production rollout
5. Configuration drift monitoring

**Success Criteria**: All production systems at Level 1

### Phase 3: Level 2 Assessment (if applicable)

**Activities**:
1. Risk assessment to determine Level 2 necessity
2. Impact analysis for Level 2 controls
3. Business case and stakeholder approval
4. Resource allocation planning

**Decision Point**: Proceed with Level 2 only if justified by Steps 2-5 above

### Phase 4: Level 2 Implementation (if proceeding)

**Activities**:
1. Test environment deployment
2. Performance and usability impact testing
3. User training for new controls (MFA, encryption)
4. Incremental control implementation
5. Continuous monitoring and adjustment

**Timeline**: 2-6 months depending on environment size

### Phase 5: STIG Alignment (if required)

**Activities**:
1. STIG-specific control mapping
2. CAT I controls prioritized first
3. Automated SCAP scanning
4. Manual verification for non-automatable controls
5. Authority to Operate (ATO) documentation

**Timeline**: 6-12 months for initial ATO

---

## Common Mistakes to Avoid

### ❌ Skipping Level 1

**Mistake**: "We need high security, so let's go straight to Level 2."

**Why it fails**: Level 2 assumes Level 1 baseline. Skipping creates security gaps.

**Correct approach**: Implement Level 1 first, then add Level 2.

### ❌ Implementing Without Testing

**Mistake**: "Let's deploy Level 2 to production immediately."

**Why it fails**: Level 2 can break applications, disrupt workflows, impact performance.

**Correct approach**: Test extensively in non-production first.

### ❌ Ignoring Operational Impact

**Mistake**: "Security is paramount; operations will adapt."

**Why it fails**: Excessive friction leads to workarounds, shadow IT, or control rollback.

**Correct approach**: Balance security with usability; involve operations early.

### ❌ All-or-Nothing Approach

**Mistake**: "We must implement 100% of Level 2 controls."

**Why it fails**: Some Level 2 controls may not be relevant to specific environments.

**Correct approach**: Risk-based implementation. Prioritize relevant Level 2 controls.

### ❌ No Continuous Monitoring

**Mistake**: "We passed the assessment; we're done."

**Why it fails**: Configuration drift occurs quickly without monitoring.

**Correct approach**: Automated continuous compliance monitoring (CIS-CAT Pro, cloud-native tools).

---

## Profile Selection Examples

### Example 1: Small SaaS Startup

**Context**:
- 50 employees
- Processes customer data (email, names)
- Hosted on AWS
- No regulatory requirements
- Limited security budget

**Profile Selection**: **Level 1**

**Rationale**:
- Risk assessment shows moderate risk
- No PII, PHI, or financial data
- No compliance requirements beyond general best practices
- Limited resources for complex controls
- Level 1 provides solid baseline

**Implementation**: AWS Security Hub CIS Level 1, automated scanning weekly

---

### Example 2: Healthcare Provider

**Context**:
- 500 employees
- Processes Protected Health Information (PHI)
- Multi-cloud (AWS + Azure)
- HIPAA compliance required
- Dedicated security team

**Profile Selection**: **Level 2**

**Rationale**:
- PHI processing requires defense-in-depth
- HIPAA requires strict security controls
- Budget supports advanced controls
- Security team can manage complexity

**Implementation**: CIS Level 2 across all systems, CIS-CAT Pro + cloud-native tools, quarterly audits

---

### Example 3: Defense Contractor

**Context**:
- 200 employees
- Processes Controlled Unclassified Information (CUI)
- Connects to DoD networks
- NIST 800-171 / CMMC Level 3 required
- Government security team

**Profile Selection**: **STIG Profile**

**Rationale**:
- Legal requirement for DoD contractors
- CUI processing mandates STIG compliance
- NIST 800-171 aligns with STIG requirements
- CMMC Level 3 requires government-grade security

**Implementation**: CIS STIG Benchmark + DISA STIGs, SCAP scanning, ACAS vulnerability management, quarterly ATO reviews

---

## Key Takeaways

1. **Start with Level 1**: All organizations should implement Level 1 as baseline minimum
2. **Cumulative Profiles**: Level 2 includes Level 1. STIG includes Level 1 + Level 2.
3. **Risk-Based Selection**: Choose profile based on data sensitivity, not organization size
4. **Test First**: Always test Level 2 controls in non-production before deployment
5. **Continuous Monitoring**: Implement automated compliance scanning to detect drift
6. **Phased Implementation**: Deploy incrementally; don't attempt all controls simultaneously
7. **Balance Security and Usability**: Excessive friction leads to workarounds
8. **Document Exceptions**: Not all controls may apply; document justifications

---

## References

- [CIS Benchmarks FAQ](https://www.cisecurity.org/cis-benchmarks/cis-benchmarks-faq)
- [CIS Level 1 vs Level 2 Explained - Scalefusion](https://blog.scalefusion.com/cis-level-1-vs-cis-level-2/)
- [STIG vs CIS Comparison - Tufin](https://www.tufin.com/blog/stig-vs-cis-landscape-security-baselines)
- [CIS Benchmarks Compliance Guide - Puppet](https://www.puppet.com/blog/cis-benchmarks)
