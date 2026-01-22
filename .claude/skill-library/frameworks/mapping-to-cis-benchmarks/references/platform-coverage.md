# Platform-Specific CIS Benchmark Coverage

**Last Updated**: 2026-01-07 (based on comprehensive research)

This reference provides detailed platform-specific CIS Benchmark information including latest versions, control examples, and platform-specific patterns.

---

## Overview Table

| Platform     | Latest Version             | Control Count | Last Updated | Native Tool             |
| ------------ | -------------------------- | ------------- | ------------ | ----------------------- |
| AWS          | v3.0.0                     | 43            | May 2024     | AWS Security Hub        |
| Azure        | v5.0.0 / v2.0.0            | 100+          | 2024         | Azure Policy            |
| GCP          | v4.0.0 / v2.0.0            | 50-100        | 2024         | Security Command Center |
| Linux RHEL   | v1.0.1 / v2.0.0            | Distro-spec   | 2025         | OpenSCAP                |
| Linux Ubuntu | LTS-aligned (24.04, 22.04) | Distro-spec   | Ongoing      | Ubuntu Security Guide   |
| Windows      | 2025 v1.0.0, 2022 v4.0.0   | OS-specific   | 2025         | CIS-CAT Pro             |
| Kubernetes   | v1.9 (K8s v1.27-v1.29)     | Section 5.2+  | 2023         | kube-bench              |
| Docker       | v1.7.0                     | 27 updated    | July 2024    | docker-bench-security   |

**Versioning Pattern**: CIS uses semantic versioning (vX.Y.Z), NOT year-based.

---

## AWS CIS Foundations Benchmark

### Current Version: v3.0.0 (May 2024)

**Control Numbering**: Service-based format `[Service.Number]`

**Service Categories** (9 total):

1. Identity and Access Management (IAM)
2. Storage (S3, EBS, RDS, EFS)
3. Logging and Monitoring (CloudTrail, Config, VPC)
4. Networking (Security Groups, NACLs, VPC)

### Key Control Examples

#### Identity and Access Management

```
[IAM.4] - IAM root user access key should not exist
[IAM.9] - MFA should be enabled for the root user
[IAM.15] - IAM password policy requires minimum 14 characters
[IAM.22] - IAM user credentials unused for 45 days should be removed
[Account.1] - Security contact information should be provided
```

#### Storage

```
[S3.1], [S3.8] - S3 block public access settings enabled
[S3.5] - S3 buckets should require SSL
[S3.20] - S3 should have MFA delete enabled
[EC2.7] - EBS default encryption should be enabled
[RDS.3] - RDS DB instances should have encryption at-rest
[EFS.1] - EFS configured to encrypt file data at-rest
```

#### Logging and Monitoring

```
[CloudTrail.1] - CloudTrail enabled with multi-region trail
[CloudTrail.4] - CloudTrail log file validation enabled
[Config.1] - AWS Config enabled with service-linked role
[CloudTrail.7] - S3 bucket access logging enabled on CloudTrail bucket
[CloudTrail.2] - CloudTrail encryption at-rest enabled
[KMS.4] - AWS KMS key rotation enabled
[EC2.6] - VPC flow logging enabled in all VPCs
```

#### Networking

```
[EC2.21] - Network ACLs should not allow ingress from 0.0.0.0/0 to port 22/3389
[EC2.53], [EC2.54] - Security groups should not allow ingress from 0.0.0.0/0
[EC2.2] - VPC default security groups should not allow traffic
[EC2.8] - EC2 instances should use IMDSv2 (unique to AWS)
```

### AWS-Specific Patterns

- **Focus**: Strong emphasis on logging and monitoring (CloudTrail, VPC Flow Logs)
- **Unique Controls**: IMDSv2 requirement ([EC2.8]) has no Azure/GCP equivalent
- **Native Integration**: AWS Security Hub provides CIS v3.0 certification
- **IAM Depth**: 23+ IAM-specific recommendations (most granular among clouds)
- **Version Changes**: v3.0 removed 2 controls (3.3, 3.4) from v1.4, causing renumbering

---

## Azure CIS Foundations Benchmark

### Current Version: v5.0.0 / v2.0.0 (2024)

**Control Numbering**: Hierarchical format `X.Y` or `X.Y.Z`

**Major Domains** (9 total):

1. Identity and Access Management (Azure AD/Entra ID)
2. Microsoft Defender for Cloud (Security Center)
3. Storage Security
4. Database Security (SQL, PostgreSQL, MySQL, Cosmos DB)
5. Logging and Monitoring
6. Networking
7. Virtual Machine Security
8. Key Vault Security
9. App Service Security

### Key Control Examples

#### Identity and Access Management

```
1.5 - Ensure Guest Users Are Reviewed Regularly
1.23 - Ensure No Custom Subscription Administrator Roles Exist
```

#### Microsoft Defender for Cloud (15+ services)

```
2.1.1 - Microsoft Defender for Servers
2.1.2 - Microsoft Defender for App Services
2.1.3 - Microsoft Defender for Databases
2.1.7 - Microsoft Defender for Storage
2.1.8 - Microsoft Defender for Containers
2.1.10 - Microsoft Defender for Key Vault
```

#### Storage Security

```
3.1 - Secure transfer required (HTTPS)
3.7 - Disable Public Access on Blob Containers
3.10 - Use Private Endpoints for Storage Accounts
3.15 - Minimum TLS version 1.2
```

#### Database Security

```
4.1.5 - SQL TDE (Transparent Data Encryption) enabled
4.3.7 - PostgreSQL disable public network access
4.5.2 - Cosmos DB use private endpoints
```

#### Logging and Monitoring

```
5.1.2 - Activity Log diagnostic settings capture categories
5.1.6 - NSG (Network Security Group) Flow Logs captured
5.4 - Azure Monitor resource logging enabled
```

### Azure-Specific Patterns

- **Focus**: Comprehensive service coverage with Defender suite integration
- **Unique Controls**: 15+ Microsoft Defender-specific recommendations (2.1.x series)
- **Native Integration**: Azure Policy with 200+ built-in CIS controls
- **Profile Integration**: Tight alignment with Azure Security Benchmark v2
- **Control Depth**: 100+ controls (most comprehensive among cloud platforms)

---

## GCP CIS Foundations Benchmark

### Current Version: v4.0.0 / v2.0.0 (2024)

**Control Numbering**: Category-based format `Category X.Y`

**Key Sections**:

- Section 2: Cloud SQL, BigQuery
- Section 3: Cloud DNS (DNSSEC)
- Section 4: VPC networking (firewalls, routes, flow logs)
- Section 5: Cloud Storage (IAM and encryption)
- Section 6: API management, Load Balancing

### Key Control Examples

```
IAM 1.3 - Service account key management and rotation
Logging 2.14 - Log retention policies configured
Logging 2.16 (v2.0 new) - HTTP(S) Load Balancer Logging enabled
VMs 4.10 - VM instance secure configurations
Storage 5.x - Cloud Storage IAM and encryption
DNS 3.x - DNSSEC validation for Cloud DNS
PostgreSQL 6.2.9 (v2.0 new) - Private IP assignment required
```

### GCP-Specific Patterns

- **Focus**: Network security and API management emphasis
- **Unique Controls**: DNSSEC controls for Cloud DNS (no AWS/Azure equivalent)
- **Native Integration**: Security Command Center with Policy Controller
- **Automation Trend**: v2.0 added +10 automated assessments (previously manual)
- **Growing Maturity**: Moving from manual to automated checks with each version

---

## Linux CIS Benchmarks

### Distribution-Specific Approach

CIS provides **separate benchmarks** for each distribution, NOT a single universal Linux benchmark.

### Ubuntu Linux

**Versions**: 24.04 LTS, 22.04 LTS, 20.04 LTS (LTS-aligned)

**Profile Structure**:

- `cis_level1_workstation` - Basic workstation security
- `cis_level1_server` - Basic server security
- `cis_level2_workstation` - Enhanced workstation hardening
- `cis_level2_server` - Enhanced server hardening

**Implementation**:

- **Tool**: Ubuntu Security Guide (USG)
- **Package**: `usg-benchmarks-1`
- **Automation**: Automated audit and compliance scanning
- **Vendor Support**: Canonical actively participates in benchmark development

**Key Features**:

- AppArmor security framework integration
- APT package management considerations
- Ubuntu-specific default configurations

### Red Hat Enterprise Linux (RHEL)

**Versions by RHEL Release**:

- RHEL 10: CIS Benchmark v1.0.1 (SCAP Security Guide 0.1.75+)
- RHEL 9: CIS Benchmark v2.0.0 (SCAP Security Guide 0.1.75+)
- RHEL 8: CIS Benchmark v2.0.0 (SCAP Security Guide 0.1.75+)

**Profile IDs**:

- Level 2 Server: `xccdf_org.ssgproject.content_profile_cis`
- Level 1 Server: `xccdf_org.ssgproject.content_profile_cis_server_l1`
- Level 1 Workstation: `xccdf_org.ssgproject.content_profile_cis_workstation_l1`
- Level 2 Workstation: `xccdf_org.ssgproject.content_profile_cis_workstation_l2`

**Implementation Methods**:

1. Image Builder (pre-hardened RHEL images with OpenSCAP)
2. Kickstart Installation (hardened deployment during setup)
3. Image Mode (security hardening for bootable images)
4. Runtime Scanning (OpenSCAP command-line tools)

**Key Features**:

- SELinux security framework integration
- RPM package management considerations
- Built-in compliance tools using OpenSCAP
- SCAP-compliant automated remediation

### Distribution Differences

| Aspect             | Ubuntu                      | RHEL                                        |
| ------------------ | --------------------------- | ------------------------------------------- |
| Security Framework | AppArmor                    | SELinux                                     |
| Package Manager    | APT (deb)                   | RPM (yum/dnf)                               |
| Automation Tool    | Ubuntu Security Guide (USG) | OpenSCAP                                    |
| Vendor Support     | Canonical participation     | Red Hat compliance tools                    |
| Profile Format     | Named (cis_level1_server)   | XCCDF IDs (xccdf_org.ssgproject.content...) |
| Remediation        | Ansible playbooks           | Ansible + Bash scripts                      |

### Linux-Specific Patterns

- **Distribution Independence**: Also available (CIS Distribution Independent Linux v2.0.0)
- **Kernel Parameters**: Common across distributions
- **Service Hardening**: Distribution-specific service names
- **File Permissions**: Consistent expectations across distributions

---

## Windows Server CIS Benchmark

### Current Versions

- **Windows Server 2025**: v1.0.0
- **Windows Server 2022**: v4.0.0 (Released 05/23/2025), v3.0.0 (03/19/2024)
- **Windows Server 2019**: v1.2.1
- **Windows Server 2016**: v1.4.0 (STIG v4.0.0)

### Profile Levels

| Level   | Purpose                                     |
| ------- | ------------------------------------------- |
| Level 1 | Foundational settings, minimal impact       |
| Level 2 | Enhanced security, may impact compatibility |

### Key Control Areas

1. **Active Directory**: User and group policies
2. **Group Policy**: Security configuration deployment
3. **Windows Firewall**: Network access control
4. **User Rights Assignment**: Privilege management
5. **Security Options**: OS-level security settings
6. **Audit Policy**: Logging and monitoring
7. **File System Permissions**: Access control lists (ACLs)
8. **Registry Settings**: System configuration hardening

### Implementation

**Assessment Tools**:

- **CIS-CAT Pro Assessor**: Automated compliance scanning
- **HTML Reports**: CIS Controls v8 mappings in output
- **Group Policy Objects (GPOs)**: Primary deployment mechanism

**Automation**:

- PowerShell DSC (Desired State Configuration)
- Group Policy-based implementation
- Integration with Microsoft security baselines

### Windows-Specific Patterns

- **GPO-Based**: Relies heavily on Group Policy for implementation
- **STIG Alignment**: DoD STIG versions available for federal compliance
- **CIS Controls Mapping**: Includes mappings to CIS Controls v8 with Implementation Groups
- **Version-Specific**: Each Windows Server version has distinct benchmark

---

## Kubernetes CIS Benchmark

### Current Version: v1.9 (for Kubernetes v1.27-v1.29)

**Focus Area**: Section 5.2 - Pod Security Controls (heavily emphasized)

### Control Numbering

Format: `X.Y.Z`

- Section 5: Kubernetes Policies
- Subsection 2: Pod Security
- Control: Specific recommendation

### Key Pod Security Controls (Section 5.2)

| Control ID | Description                                       | Policy Setting                        |
| ---------- | ------------------------------------------------- | ------------------------------------- |
| 5.2.1      | Minimize admission of privileged containers       | `privileged: false`                   |
| 5.2.2      | Minimize admission of containers with hostPID     | `hostPID: false`                      |
| 5.2.3      | Minimize admission of containers with hostIPC     | `hostIPC: false`                      |
| 5.2.4      | Minimize admission of containers with hostNetwork | `hostNetwork: false`                  |
| 5.2.5      | Minimize admission with privilege escalation      | `allowPrivilegeEscalation: false`     |
| 5.2.6      | Minimize admission of root containers             | `runAsUser: rule: 'MustRunAsNonRoot'` |
| 5.2.7-9    | Minimize admission with added capabilities        | `requiredDropCapabilities: [ALL]`     |

### Benchmark Sections

| Section | Focus Area                         |
| ------- | ---------------------------------- |
| 1.1     | Control Plane Node Configuration   |
| 1.2     | API Server                         |
| 3.x     | Control Plane Configuration        |
| 4.x     | Worker Node Configuration          |
| 5.x     | Kubernetes Policies (Pod Security) |

### Platform-Specific Implementations

**CIS Amazon EKS Benchmark**:

- AWS-specific guidance for Elastic Kubernetes Service

**CIS GKE Benchmark**:

- Google Cloud Platform-specific (v1.5.1, v1.7.1)
- Policy Controller for automated enforcement

**CIS AKS Benchmark**:

- Microsoft Azure-specific for Azure Kubernetes Service

### Distribution-Specific Guides

- **K3s CIS v1.9**: Lightweight Kubernetes distribution
- **RKE2 CIS**: Rancher Kubernetes Engine hardening guide

### Kubernetes-Specific Patterns

- **Pod Security Focus**: 9+ recommendations in Section 5.2 alone
- **PSP→PSS Transition**: Moving from Pod Security Policies to Pod Security Standards
- **Version Alignment**: Benchmark version aligned with K8s version support
- **Validation Tool**: kube-bench (Aqua Security) for automated assessment

---

## Docker CIS Benchmark

### Current Version: v1.7.0 (Released July 25, 2024)

**Update**: v1.8.0 updated 27 recommendations for Docker v28

### Benchmark Sections

| Section | Focus Area                        |
| ------- | --------------------------------- |
| 1       | Host Configuration                |
| 2       | Docker Daemon Configuration       |
| 3       | Docker Daemon Configuration Files |
| 4       | Container Images and Build Files  |
| 5       | Container Runtime                 |
| 6       | Docker Security Operations        |
| 7       | Docker Swarm Configuration        |

### Section 4: Container Images Focus

**Primary focus for container security** - Docker Hardened Images (DHI) are compliant with all Section 4 controls except Docker Content Trust (DCT).

### Automated Testing Tools

**docker-bench-security**:

- Repository: github.com/docker/docker-bench-security
- Based on: CIS Docker Benchmark v1.6.0 (lags behind v1.7.0)
- Deployment: `docker run docker/docker-bench-security`

**InSpec Profile**:

- Repository: github.com/dev-sec/cis-docker-benchmark
- Based on: CIS Docker 1.13.0 Benchmark
- Use case: CI/CD pipeline integration

### Docker-Specific Patterns

- **Broad Scope**: Covers host, daemon, images, runtime, swarm (6 sections)
- **Section 4 Focus**: Container images and build files (primary security layer)
- **Content Trust**: DCT as advanced control for image verification
- **Runtime Security**: AppArmor/SELinux integration for container isolation
- **Tool Lag**: Automated tools may lag latest benchmark by 6-12 months

---

## Cross-Platform Service Equivalence

### No Direct 1:1 Mapping

**Critical Finding**: ~15% of all CIS policies are not verifiable through API/CLI tools

### Common Service Patterns

| Service Type            | AWS             | Azure                   | GCP                |
| ----------------------- | --------------- | ----------------------- | ------------------ |
| Identity                | IAM             | Azure AD / Entra ID     | Cloud IAM          |
| Logging                 | CloudTrail      | Azure Monitor           | Cloud Logging      |
| Encryption (Key Mgmt)   | KMS             | Key Vault               | Cloud KMS          |
| Compute                 | EC2             | Virtual Machines        | Compute Engine     |
| Object Storage          | S3              | Blob Storage            | Cloud Storage      |
| Block Storage           | EBS             | Managed Disks           | Persistent Disk    |
| Relational Database     | RDS             | Azure SQL Database      | Cloud SQL          |
| NoSQL Database          | DynamoDB        | Cosmos DB               | Firestore/Bigtable |
| Network Firewall        | Security Groups | Network Security Groups | Firewall Rules     |
| Monitoring              | CloudWatch      | Azure Monitor           | Cloud Monitoring   |
| Secrets Management      | Secrets Manager | Key Vault               | Secret Manager     |
| Container Orchestration | EKS             | AKS                     | GKE                |

### Third-Party CSPM Tools

Organizations use platforms for cross-platform compliance:

- Sophos Cloud Optix (CIS-certified for AWS, Azure, GCP)
- Prisma Cloud, Wiz, Orca
- Cloud security posture management (CSPM) platforms

---

## Universal Security Control Categories

**All platforms share these foundational categories:**

1. **Identity & Access Management**
   - Pattern: MFA, credential rotation, least privilege
   - Examples: Root/admin MFA, access key rotation, policy attachment restrictions

2. **Encryption & Data Protection**
   - Pattern: Encrypt at-rest and in-transit, secure key management
   - Examples: Storage encryption, TLS/SSL enforcement, KMS key rotation

3. **Logging & Monitoring**
   - Pattern: Comprehensive logging, retention policies, real-time alerting
   - Examples: Audit logs, flow logs, centralized log aggregation

4. **Network Security**
   - Pattern: Restrict public access, network segmentation, least privilege
   - Examples: No 0.0.0.0/0 to admin ports, private endpoints, firewall rules

5. **Vulnerability Management**
   - Pattern: Regular patching, scanning, minimal attack surface
   - Examples: Auto-updates, vulnerability scanning, remove unused packages

6. **Configuration Management**
   - Pattern: Hardening baselines, configuration drift detection
   - Examples: Secure defaults, immutable infrastructure, IaC validation

---

## Automation Maturity by Platform

| Platform       | Automated Assessment | Manual Assessment | Tooling                       |
| -------------- | -------------------- | ----------------- | ----------------------------- |
| AWS            | High (>80%)          | Low (<20%)        | Security Hub, Config          |
| Azure          | High (>80%)          | Low (<20%)        | Azure Policy, Defender        |
| GCP            | Growing (~70%)       | Decreasing (~30%) | Security Command Center       |
| Linux (Ubuntu) | High (>80%)          | Low (<20%)        | USG, OpenSCAP                 |
| Linux (RHEL)   | High (>80%)          | Low (<20%)        | OpenSCAP, Image Builder       |
| Windows        | High (>80%)          | Low (<20%)        | CIS-CAT Pro, PowerShell DSC   |
| Kubernetes     | High (>80%)          | Medium (~20%)     | kube-bench, Policy Controller |
| Docker         | High (>80%)          | Low (<20%)        | docker-bench-security, InSpec |

---

## Update Cadence

| Platform   | Release Frequency    | Pattern                      |
| ---------- | -------------------- | ---------------------------- |
| AWS        | 12-18 months         | Major version updates        |
| Azure      | 12-18 months         | Service coverage expansion   |
| GCP        | 12-18 months         | Automation additions         |
| Linux      | LTS releases (~2 yr) | Distribution version-aligned |
| Windows    | 6-12 months          | OS version + CIS Controls v8 |
| Kubernetes | 6-12 months          | K8s version alignment        |
| Docker     | 12-18 months         | Docker version alignment     |

**CIS Benchmark Update Announcements**: Monthly blogs ("CIS Benchmarks [Month] [Year] Update")

---

## Platform Selection Guidance

### When Multiple Platforms Apply

**Cloud (AWS/Azure/GCP)**:

- Use platform-specific benchmarks for resources deployed on that platform
- No unified multi-cloud benchmark exists
- CSPM tools provide cross-platform compliance view

**Linux (Distribution Choice)**:

- Use distribution-specific benchmark matching your deployment
- Distribution Independent Linux (DIL) v2.0.0 available for general guidance
- Consider automation tool availability (USG vs OpenSCAP)

**Containers (Kubernetes/Docker)**:

- Use Kubernetes benchmark for orchestrated environments
- Use Docker benchmark for standalone containers or Docker-specific controls
- Both may apply in Kubernetes environments (K8s + underlying Docker)

---

## References

- CIS Benchmarks Official: https://www.cisecurity.org/cis-benchmarks
- AWS Security Hub CIS Documentation
- Microsoft Azure CIS Compliance Documentation
- Google Cloud Security Command Center
- Red Hat CIS Compliance Guides
- Ubuntu Security Guide Documentation
- Kubernetes CIS Benchmark Resources
- Docker CIS Benchmark Documentation
