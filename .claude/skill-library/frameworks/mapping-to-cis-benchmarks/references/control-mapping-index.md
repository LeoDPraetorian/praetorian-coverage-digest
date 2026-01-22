# CIS Benchmark Control Mapping Index

**Purpose**: Quick reference for mapping security findings to CIS Benchmark control IDs

**Last Updated**: 2026-01-07

---

## How to Use This Index

1. **Identify finding type** (e.g., public S3 bucket, missing MFA, weak password policy)
2. **Locate platform** (AWS, Azure, GCP, Linux, Windows, Kubernetes, Docker)
3. **Find control ID** in the table for that platform
4. **Reference full benchmark** for detailed remediation

---

## AWS CIS Foundations Benchmark v3.0.0

### Identity and Access Management

| Finding Type                            | Control ID  | Control Title                                   | Profile |
| --------------------------------------- | ----------- | ----------------------------------------------- | ------- |
| Root user access key exists             | [IAM.4]     | IAM root user access key should not exist       | Level 1 |
| Root user MFA not enabled               | [IAM.9]     | MFA should be enabled for root user             | Level 1 |
| Root user hardware MFA not enabled      | [IAM.6]     | Hardware MFA should be enabled for root user    | Level 2 |
| Password policy < 14 characters         | [IAM.15]    | IAM password minimum 14 characters              | Level 1 |
| Password reuse allowed                  | [IAM.16]    | IAM password policy prevents reuse              | Level 1 |
| IAM user without MFA                    | [IAM.5]     | MFA enabled for IAM users with console password | Level 1 |
| IAM user credentials unused >45 days    | [IAM.22]    | IAM credentials unused 45 days removed          | Level 1 |
| IAM user access keys not rotated        | [IAM.3]     | IAM access keys rotated every 90 days           | Level 1 |
| IAM policies attached to users          | [IAM.2]     | IAM users should not have policies attached     | Level 1 |
| No support role exists                  | [IAM.17]    | Support role created for AWS Support incidents  | Level 1 |
| Expired SSL/TLS certificates in IAM     | [IAM.19]    | Expired SSL/TLS certificates removed            | Level 1 |
| IAM Access Analyzer not enabled         | [IAM.20]    | IAM Access Analyzer external access enabled     | Level 1 |
| AWSCloudShellFullAccess policy attached | [IAM.27]    | IAM identities without CloudShell full access   | Level 1 |
| Security contact info not provided      | [Account.1] | Security contact information provided           | Level 1 |

### Storage

| Finding Type                          | Control ID     | Control Title                          | Profile |
| ------------------------------------- | -------------- | -------------------------------------- | ------- |
| S3 bucket does not require SSL        | [S3.5]         | S3 buckets require SSL                 | Level 1 |
| S3 bucket MFA delete not enabled      | [S3.20]        | S3 MFA delete enabled                  | Level 2 |
| S3 bucket public access not blocked   | [S3.1], [S3.8] | S3 block public access enabled         | Level 1 |
| EBS default encryption not enabled    | [EC2.7]        | EBS default encryption enabled         | Level 1 |
| RDS encryption not enabled            | [RDS.3]        | RDS encryption at-rest enabled         | Level 1 |
| RDS automatic minor upgrades disabled | [RDS.13]       | RDS automatic minor upgrades enabled   | Level 1 |
| RDS DB publicly accessible            | [RDS.2]        | RDS prohibit public access             | Level 1 |
| EFS encryption not enabled            | [EFS.1]        | EFS encrypt file data at-rest with KMS | Level 1 |

### Logging and Monitoring

| Finding Type                             | Control ID     | Control Title                               | Profile |
| ---------------------------------------- | -------------- | ------------------------------------------- | ------- |
| CloudTrail not enabled in all regions    | [CloudTrail.1] | CloudTrail multi-region trail enabled       | Level 1 |
| CloudTrail log validation not enabled    | [CloudTrail.4] | CloudTrail log file validation enabled      | Level 1 |
| AWS Config not enabled                   | [Config.1]     | AWS Config enabled with service-linked role | Level 1 |
| CloudTrail S3 access logging not enabled | [CloudTrail.7] | CloudTrail S3 bucket access logging enabled | Level 2 |
| CloudTrail encryption not enabled        | [CloudTrail.2] | CloudTrail encryption at-rest enabled       | Level 2 |
| KMS key rotation not enabled             | [KMS.4]        | AWS KMS key rotation enabled                | Level 1 |
| VPC flow logging not enabled             | [EC2.6]        | VPC flow logging enabled in all VPCs        | Level 2 |

### Networking

| Finding Type                                   | Control ID         | Control Title                            | Profile |
| ---------------------------------------------- | ------------------ | ---------------------------------------- | ------- |
| NACL allows ingress from 0.0.0.0/0 to 22/3389  | [EC2.21]           | NACL no ingress 0.0.0.0/0 to admin ports | Level 1 |
| Security group allows 0.0.0.0/0 to admin ports | [EC2.53], [EC2.54] | Security group no 0.0.0.0/0 to admin     | Level 1 |
| VPC default security group allows traffic      | [EC2.2]            | VPC default security group no traffic    | Level 1 |
| EC2 instance not using IMDSv2                  | [EC2.8]            | EC2 instances use IMDSv2                 | Level 1 |

---

## Azure CIS Foundations Benchmark v2.0.0 / v5.0.0

### Identity and Access Management

| Finding Type                          | Control ID | Control Title                              | Profile |
| ------------------------------------- | ---------- | ------------------------------------------ | ------- |
| Guest users not reviewed regularly    | 1.5        | Guest users reviewed regularly             | Level 1 |
| Custom subscription admin roles exist | 1.23       | No custom subscription administrator roles | Level 1 |

### Microsoft Defender for Cloud

| Finding Type                             | Control ID | Control Title                              | Profile |
| ---------------------------------------- | ---------- | ------------------------------------------ | ------- |
| Defender for Servers not enabled         | 2.1.1      | Microsoft Defender for Servers enabled     | Level 1 |
| Defender for App Services not enabled    | 2.1.2      | Microsoft Defender for App Services        | Level 1 |
| Defender for Databases not enabled       | 2.1.3      | Microsoft Defender for Databases           | Level 1 |
| Defender for Azure SQL not enabled       | 2.1.4      | Microsoft Defender for Azure SQL Databases | Level 1 |
| Defender for SQL VMs not enabled         | 2.1.5      | Microsoft Defender for SQL on VMs          | Level 1 |
| Defender for open-source DBs not enabled | 2.1.6      | Microsoft Defender for PostgreSQL/MySQL    | Level 1 |
| Defender for Storage not enabled         | 2.1.7      | Microsoft Defender for Storage             | Level 1 |
| Defender for Containers not enabled      | 2.1.8      | Microsoft Defender for Containers          | Level 1 |
| Defender for Cosmos DB not enabled       | 2.1.9      | Microsoft Defender for Cosmos DB           | Level 1 |
| Defender for Key Vault not enabled       | 2.1.10     | Microsoft Defender for Key Vault           | Level 1 |

### Storage Security

| Finding Type                                  | Control ID | Control Title                              | Profile |
| --------------------------------------------- | ---------- | ------------------------------------------ | ------- |
| Storage account secure transfer not required  | 3.1        | Secure transfer required (HTTPS)           | Level 1 |
| Storage infrastructure encryption not enabled | 3.2        | Enable infrastructure encryption           | Level 2 |
| Blob container public access enabled          | 3.7        | Disable public access on blob containers   | Level 1 |
| Storage default network access not deny       | 3.8        | Default network access rule set to deny    | Level 1 |
| Storage private endpoints not used            | 3.10       | Use private endpoints for storage accounts | Level 2 |
| Storage not encrypted with CMK                | 3.12       | Encrypt with customer managed keys         | Level 2 |
| Storage TLS version < 1.2                     | 3.15       | Minimum TLS version 1.2                    | Level 1 |

### Database Security

| Finding Type                             | Control ID | Control Title                    | Profile |
| ---------------------------------------- | ---------- | -------------------------------- | ------- |
| SQL auditing not enabled                 | 4.1.1      | SQL auditing enabled             | Level 1 |
| SQL allows ingress from 0.0.0.0/0        | 4.1.2      | No ingress from 0.0.0.0/0        | Level 1 |
| SQL TDE not encrypted with CMK           | 4.1.3      | TDE protector encrypted with CMK | Level 2 |
| SQL Azure AD admin not configured        | 4.1.4      | Azure AD admin configured        | Level 1 |
| SQL TDE not enabled                      | 4.1.5      | Data encryption (TDE) enabled    | Level 1 |
| SQL audit retention < 90 days            | 4.1.6      | Auditing retention >90 days      | Level 1 |
| PostgreSQL SSL not enforced              | 4.3.1      | Enforce SSL connection           | Level 1 |
| PostgreSQL public network access enabled | 4.3.7      | Disable public network access    | Level 1 |

### Logging and Monitoring

| Finding Type                               | Control ID | Control Title                          | Profile |
| ------------------------------------------ | ---------- | -------------------------------------- | ------- |
| Activity Log diagnostic settings missing   | 5.1.2      | Activity Log captures categories       | Level 1 |
| Key Vault logging not enabled              | 5.1.5      | Key Vault logging enabled              | Level 1 |
| NSG Flow Logs not captured                 | 5.1.6      | NSG Flow Logs captured                 | Level 1 |
| Azure Monitor resource logging not enabled | 5.4        | Azure Monitor resource logging enabled | Level 1 |

### Networking

| Finding Type                            | Control ID | Control Title                       | Profile |
| --------------------------------------- | ---------- | ----------------------------------- | ------- |
| RDP access from internet not restricted | 6.1        | RDP access from internet restricted | Level 1 |
| SSH access from internet not restricted | 6.2        | SSH access from internet restricted | Level 1 |
| Network Watcher not enabled             | 6.6        | Network Watcher enabled             | Level 1 |

---

## GCP CIS Foundations Benchmark v2.0.0 / v4.0.0

### IAM and Identity

| Finding Type                    | Control ID | Control Title                | Profile |
| ------------------------------- | ---------- | ---------------------------- | ------- |
| Service account key not rotated | IAM 1.3    | Service account key rotation | Level 1 |

### Logging and Monitoring

| Finding Type                              | Control ID   | Control Title                         | Profile |
| ----------------------------------------- | ------------ | ------------------------------------- | ------- |
| Log retention policy not configured       | Logging 2.14 | Log retention policies                | Level 1 |
| HTTP(S) Load Balancer logging not enabled | Logging 2.16 | HTTP(S) Load Balancer logging enabled | Level 2 |

### Networking

| Finding Type                    | Control ID | Control Title                     | Profile |
| ------------------------------- | ---------- | --------------------------------- | ------- |
| VPC firewall rules allow public | VPC 4.x    | VPC firewall secure configuration | Level 1 |
| VPC flow logs not enabled       | VPC 4.x    | VPC flow logs enabled             | Level 2 |

### Cloud Storage

| Finding Type                              | Control ID  | Control Title                    | Profile |
| ----------------------------------------- | ----------- | -------------------------------- | ------- |
| Cloud Storage IAM not properly configured | Storage 5.x | Cloud Storage IAM configuration  | Level 1 |
| Cloud Storage encryption not enabled      | Storage 5.x | Cloud Storage encryption enabled | Level 1 |

### Cloud DNS

| Finding Type       | Control ID | Control Title                   | Profile |
| ------------------ | ---------- | ------------------------------- | ------- |
| DNSSEC not enabled | DNS 3.x    | DNSSEC validation for Cloud DNS | Level 1 |

### PostgreSQL

| Finding Type                  | Control ID | Control Title                    | Profile |
| ----------------------------- | ---------- | -------------------------------- | ------- |
| PostgreSQL public IP assigned | 6.2.9      | PostgreSQL private IP assignment | Level 1 |

---

## Linux CIS Benchmarks (Distribution-Agnostic Common Findings)

### System Maintenance

| Finding Type                   | Common Section | Description                 | Profile |
| ------------------------------ | -------------- | --------------------------- | ------- |
| Unnecessary packages installed | 1.x            | Remove unnecessary packages | Level 1 |
| Filesystem types not disabled  | 1.1.x          | Disable unused filesystems  | Level 1 |

### Services

| Finding Type                        | Common Section | Description                    | Profile |
| ----------------------------------- | -------------- | ------------------------------ | ------- |
| Time synchronization not configured | 2.x            | Configure time synchronization | Level 1 |
| Unnecessary services enabled        | 2.x            | Disable unnecessary services   | Level 1 |

### Network Configuration

| Finding Type            | Common Section | Description             | Profile |
| ----------------------- | -------------- | ----------------------- | ------- |
| IP forwarding enabled   | 3.x            | Disable IP forwarding   | Level 1 |
| ICMP redirects accepted | 3.x            | Disable ICMP redirects  | Level 1 |
| Firewall not configured | 3.x            | Configure host firewall | Level 1 |

### Logging and Auditing

| Finding Type                    | Common Section | Description                 | Profile |
| ------------------------------- | -------------- | --------------------------- | ------- |
| auditd not installed            | 4.x            | Install auditd              | Level 2 |
| System logging not configured   | 4.x            | Configure system logging    | Level 1 |
| Log files permissions incorrect | 4.x            | Secure log file permissions | Level 1 |

### Access Control

| Finding Type                   | Common Section | Description                 | Profile |
| ------------------------------ | -------------- | --------------------------- | ------- |
| Password policy not configured | 5.x            | Configure password policy   | Level 1 |
| Root login allowed over SSH    | 5.x            | Disable root login over SSH | Level 1 |
| SSH protocol 1 enabled         | 5.x            | Ensure SSH protocol 2       | Level 1 |
| sudo not configured properly   | 5.x            | Configure sudo properly     | Level 1 |

**Note**: Exact control IDs vary by distribution (Ubuntu vs RHEL vs SUSE). Consult distribution-specific benchmark for precise IDs.

---

## Windows Server CIS Benchmark

### Account Policies

| Finding Type                   | Common Area      | Description                      | Profile |
| ------------------------------ | ---------------- | -------------------------------- | ------- |
| Password policy too weak       | Account Policies | Configure strong password policy | Level 1 |
| Account lockout not configured | Account Policies | Configure account lockout        | Level 1 |

### Local Policies - Security Options

| Finding Type                      | Common Area      | Description                  | Profile |
| --------------------------------- | ---------------- | ---------------------------- | ------- |
| Guest account not disabled        | Security Options | Disable guest account        | Level 1 |
| Administrator account not renamed | Security Options | Rename administrator account | Level 1 |

### Windows Firewall

| Finding Type                    | Common Area      | Description                | Profile |
| ------------------------------- | ---------------- | -------------------------- | ------- |
| Windows Firewall not enabled    | Windows Firewall | Enable Windows Firewall    | Level 1 |
| Firewall logging not configured | Windows Firewall | Configure firewall logging | Level 1 |

### Audit Policy

| Finding Type                       | Common Area  | Description                          | Profile |
| ---------------------------------- | ------------ | ------------------------------------ | ------- |
| Audit policy not configured        | Audit Policy | Configure comprehensive audit policy | Level 1 |
| Object access auditing not enabled | Audit Policy | Enable object access auditing        | Level 2 |

**Note**: Windows benchmarks are GPO-based. Exact control IDs are in CIS Windows Server Benchmark PDF (specific to OS version).

---

## Kubernetes CIS Benchmark v1.9

### Pod Security Controls (Section 5.2)

| Finding Type                          | Control ID | Control Title                  | Profile |
| ------------------------------------- | ---------- | ------------------------------ | ------- |
| Privileged containers detected        | 5.2.1      | No privileged containers       | Level 1 |
| Container with hostPID detected       | 5.2.2      | No containers with hostPID     | Level 1 |
| Container with hostIPC detected       | 5.2.3      | No containers with hostIPC     | Level 1 |
| Container with hostNetwork detected   | 5.2.4      | No containers with hostNetwork | Level 1 |
| Container allows privilege escalation | 5.2.5      | No privilege escalation        | Level 1 |
| Container running as root             | 5.2.6      | Must run as non-root user      | Level 1 |
| Container with added capabilities     | 5.2.7-9    | Drop all capabilities          | Level 1 |

### Control Plane Configuration

| Finding Type                      | Control ID | Control Title                    | Profile |
| --------------------------------- | ---------- | -------------------------------- | ------- |
| API server insecure port enabled  | 1.2.x      | API server secure configuration  | Level 1 |
| API server anonymous auth enabled | 1.2.x      | Disable anonymous authentication | Level 1 |

### Worker Node Configuration

| Finding Type                   | Control ID | Control Title                    | Profile |
| ------------------------------ | ---------- | -------------------------------- | ------- |
| Kubelet anonymous auth enabled | 4.x        | Disable anonymous authentication | Level 1 |
| Kubelet read-only port enabled | 4.x        | Disable read-only port           | Level 1 |

---

## Docker CIS Benchmark v1.7.0

### Host Configuration

| Finding Type                              | Section | Description                       | Profile |
| ----------------------------------------- | ------- | --------------------------------- | ------- |
| Separate partition for containers missing | 1.x     | Separate partition for containers | Level 1 |
| Docker daemon not audited                 | 1.x     | Audit Docker daemon               | Level 1 |

### Docker Daemon Configuration

| Finding Type                       | Section | Description                   | Profile |
| ---------------------------------- | ------- | ----------------------------- | ------- |
| User namespace support not enabled | 2.x     | Enable user namespace support | Level 1 |
| Live restore enabled (in swarm)    | 2.x     | Restrict live restore         | Level 1 |
| Docker Content Trust not enabled   | 2.x     | Enable Docker Content Trust   | Level 2 |

### Container Images and Build Files (Section 4)

| Finding Type                          | Section | Description                         | Profile |
| ------------------------------------- | ------- | ----------------------------------- | ------- |
| Container running as root             | 4.x     | Create user for container           | Level 1 |
| Untrusted base image used             | 4.x     | Use trusted base images             | Level 1 |
| Unnecessary packages in image         | 4.x     | Do not install unnecessary packages | Level 1 |
| Image not scanned for vulnerabilities | 4.x     | Scan images for vulnerabilities     | Level 1 |
| HEALTHCHECK instruction missing       | 4.x     | Add HEALTHCHECK instruction         | Level 1 |

### Container Runtime (Section 5)

| Finding Type                             | Section | Description                         | Profile |
| ---------------------------------------- | ------- | ----------------------------------- | ------- |
| AppArmor profile not applied             | 5.x     | Verify AppArmor profile applied     | Level 1 |
| SELinux security options not set         | 5.x     | Verify SELinux security options     | Level 1 |
| Linux kernel capabilities not restricted | 5.x     | Restrict Linux kernel capabilities  | Level 1 |
| Container shares host network namespace  | 5.x     | Do not share host network namespace | Level 1 |
| Container memory not limited             | 5.x     | Limit memory usage for container    | Level 1 |

---

## Common Finding Types Across All Platforms

### Public Exposure

| Platform   | Finding                     | Control Example | Pattern                  |
| ---------- | --------------------------- | --------------- | ------------------------ |
| AWS        | Public S3 bucket            | [S3.1], [S3.8]  | Block public access      |
| Azure      | Public blob container       | 3.7             | Disable public access    |
| GCP        | Public Cloud Storage bucket | Storage 5.x     | Configure IAM properly   |
| All Clouds | 0.0.0.0/0 to admin ports    | Various         | Restrict to specific IPs |

### Encryption Missing

| Platform | Finding                     | Control Example | Pattern                    |
| -------- | --------------------------- | --------------- | -------------------------- |
| AWS      | EBS not encrypted           | [EC2.7]         | Enable default encryption  |
| Azure    | Storage not encrypted       | 3.2, 3.12       | Enable encryption with CMK |
| GCP      | Cloud Storage not encrypted | Storage 5.x     | Configure encryption       |
| Linux    | Filesystem not encrypted    | 1.1.x           | Use LUKS/dm-crypt          |

### Logging Not Enabled

| Platform | Finding                     | Control Example | Pattern                       |
| -------- | --------------------------- | --------------- | ----------------------------- |
| AWS      | CloudTrail not enabled      | [CloudTrail.1]  | Enable multi-region trail     |
| Azure    | Activity Log not configured | 5.1.2           | Configure diagnostic settings |
| GCP      | Cloud Logging not enabled   | Logging 2.x     | Enable Cloud Logging          |
| Linux    | auditd not configured       | 4.x             | Configure auditd              |

### MFA Not Enabled

| Platform | Finding               | Control Example  | Pattern                          |
| -------- | --------------------- | ---------------- | -------------------------------- |
| AWS      | Root user without MFA | [IAM.9]          | Enable MFA for root              |
| Azure    | Admin without MFA     | 1.x              | Require MFA for privileged users |
| GCP      | Admin without 2FA     | IAM 1.x          | Enforce 2FA for admin accounts   |
| Windows  | Admin without MFA     | Account Policies | Configure strong authentication  |

---

## Quick Reference: Control ID Format by Platform

| Platform   | Format           | Example                  | Notes                       |
| ---------- | ---------------- | ------------------------ | --------------------------- |
| AWS        | [Service.Number] | [CloudTrail.1], [IAM.15] | Service name in brackets    |
| Azure      | X.Y or X.Y.Z     | 1.23, 2.1.10, 4.3.7      | Hierarchical numbering      |
| GCP        | Category X.Y     | IAM 1.3, Logging 2.14    | Category prefix             |
| Linux      | X.Y.Z            | 1.1.4, 3.2.1             | Three-level hierarchy       |
| Windows    | Described in GPO | Account Policies         | GPO path rather than number |
| Kubernetes | X.Y.Z            | 5.2.1, 1.2.3             | Section.Subsection.Control  |
| Docker     | Section X        | 4.x, 5.x                 | Section-based               |

---

## Mapping Workflow

### Step 1: Identify Finding Category

1. Public exposure / network misconfiguration
2. Encryption missing / weak encryption
3. Logging not enabled / insufficient logging
4. MFA not enabled / weak authentication
5. Vulnerability management / patching issues
6. Configuration drift / insecure defaults

### Step 2: Determine Platform

- Cloud: AWS, Azure, GCP
- OS: Linux (distribution?), Windows (version?)
- Containers: Kubernetes, Docker

### Step 3: Lookup Control

1. Use this index to find control ID
2. Reference platform-specific benchmark for details
3. Include control ID, title, profile level, benchmark version in finding

### Step 4: Document in Finding

```json
{
  "cis_control_id": "[CloudTrail.1]",
  "cis_control_title": "CloudTrail enabled in all regions",
  "cis_profile": "Level 1",
  "cis_benchmark": "AWS Foundations v3.0.0"
}
```

---

## Limitations

1. **Exact Control IDs**: This index provides common patterns. Always consult platform-specific benchmark PDF for exact control IDs.
2. **Version Sensitivity**: Control IDs may change between benchmark versions. Use the version-specific benchmark.
3. **Distribution Differences**: Linux control IDs vary significantly by distribution (Ubuntu vs RHEL).
4. **Windows GPO Structure**: Windows uses Group Policy paths rather than simple numeric IDs.

---

## References

- [CIS Benchmarks Official](https://www.cisecurity.org/cis-benchmarks)
- [AWS Security Hub CIS v3.0](https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html)
- [Azure Policy CIS v2.0](https://learn.microsoft.com/en-us/azure/governance/policy/samples/cis-azure-2-0-0)
- [GCP Security Command Center](https://cloud.google.com/security-command-center/docs/compliance-management)
- Platform-specific benchmark PDFs from CIS.org
