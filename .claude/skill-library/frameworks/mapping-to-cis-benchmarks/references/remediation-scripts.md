# CIS Benchmark Remediation Scripts

**Purpose**: Example remediation code for common CIS Benchmark findings

**Last Updated**: 2026-01-07

**Warning**: Always test remediation scripts in non-production environments first. Some changes may impact system availability or functionality.

---

## AWS CIS Foundations Benchmark

### Enable CloudTrail in All Regions (CIS AWS [CloudTrail.1])

**AWS CLI**:
```bash
# Create S3 bucket for CloudTrail logs
aws s3 mb s3://my-org-cloudtrail-logs --region us-east-1

# Enable bucket versioning
aws s3api put-bucket-versioning \
  --bucket my-org-cloudtrail-logs \
  --versioning-configuration Status=Enabled

# Create CloudTrail
aws cloudtrail create-trail \
  --name my-org-trail \
  --s3-bucket-name my-org-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name my-org-trail
```

**Terraform**:
```hcl
resource "aws_cloudtrail" "main" {
  name                          = "my-org-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}
```

### Enable EBS Default Encryption (CIS AWS [EC2.7])

**AWS CLI**:
```bash
# Enable EBS encryption by default
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# Set default KMS key (optional)
aws ec2 modify-ebs-default-kms-key-id \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abcd-1234 \
  --region us-east-1
```

**Terraform**:
```hcl
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}
```

### Block S3 Bucket Public Access (CIS AWS [S3.1], [S3.8])

**AWS CLI**:
```bash
# Block public access at account level
aws s3control put-public-access-block \
  --account-id 123456789012 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Block public access for specific bucket
aws s3api put-public-access-block \
  --bucket my-bucket \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

---

## Azure CIS Foundations Benchmark

### Enable Storage Account Secure Transfer (CIS Azure 3.1)

**Azure CLI**:
```bash
# Enable HTTPS-only access
az storage account update \
  --name mystorageaccount \
  --resource-group myresourcegroup \
  --https-only true
```

**PowerShell**:
```powershell
Set-AzStorageAccount `
  -ResourceGroupName "myresourcegroup" `
  -Name "mystorageaccount" `
  -EnableHttpsTrafficOnly $true
```

### Set Storage Minimum TLS Version 1.2 (CIS Azure 3.15)

**Azure CLI**:
```bash
az storage account update \
  --name mystorageaccount \
  --resource-group myresourcegroup \
  --min-tls-version TLS1_2
```

### Enable SQL Database TDE (CIS Azure 4.1.5)

**Azure CLI**:
```bash
# Enable TDE for SQL Database
az sql db tde set \
  --resource-group myresourcegroup \
  --server myserver \
  --database mydb \
  --status Enabled
```

---

## GCP CIS Foundations Benchmark

### Enable VPC Flow Logs (CIS GCP Logging)

**gcloud CLI**:
```bash
# Enable flow logs on subnet
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all
```

### Enforce Private IP for Cloud SQL (CIS GCP 6.2.9)

**gcloud CLI**:
```bash
# Create Cloud SQL instance with private IP only
gcloud sql instances create my-instance \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --network=projects/my-project/global/networks/my-vpc \
  --no-assign-ip
```

---

## Linux CIS Benchmarks

### Ensure SSH Protocol 2 (CIS Linux 5.2.1)

**Remediation**:
```bash
# Edit SSH configuration
sudo sed -i 's/#Protocol 2/Protocol 2/' /etc/ssh/sshd_config

# Or add if missing
if ! grep -q "^Protocol 2" /etc/ssh/sshd_config; then
  echo "Protocol 2" | sudo tee -a /etc/ssh/sshd_config
fi

# Restart SSH service
sudo systemctl restart sshd
```

### Disable Root Login Over SSH (CIS Linux 5.2.x)

**Remediation**:
```bash
# Disable root login
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH service
sudo systemctl restart sshd
```

### Configure Password Policy (CIS Linux 5.x)

**Ubuntu/Debian**:
```bash
# Install PAM password quality module
sudo apt-get install -y libpam-pwquality

# Configure password requirements
sudo tee /etc/security/pwquality.conf <<EOF
minlen = 14
minclass = 4
maxrepeat = 2
usercheck = 1
enforce_for_root
EOF
```

**RHEL/CentOS**:
```bash
# Edit PAM configuration
sudo authconfig --passminlen=14 \
  --passminclass=4 \
  --passmaxrepeat=2 \
  --enablereqlower \
  --enablerequpper \
  --enablereqdigit \
  --enablereqother \
  --update
```

### Enable auditd (CIS Linux 4.x)

**Remediation**:
```bash
# Install auditd
sudo apt-get install -y auditd audispd-plugins  # Ubuntu/Debian
sudo yum install -y audit audit-libs           # RHEL/CentOS

# Enable and start service
sudo systemctl enable auditd
sudo systemctl start auditd

# Configure audit rules (example)
sudo tee -a /etc/audit/rules.d/cis.rules <<EOF
# Log all authentication attempts
-w /var/log/auth.log -p wa -k auth
-w /var/log/secure -p wa -k auth

# Log privileged command execution
-a always,exit -F arch=b64 -S execve -F euid=0 -k root-commands
EOF

# Reload audit rules
sudo augenrules --load
```

---

## Windows Server CIS Benchmark

### Configure Password Policy (CIS Windows)

**Group Policy (PowerShell)**:
```powershell
# Minimum password length
secedit /export /cfg C:\secpol.cfg
(Get-Content C:\secpol.cfg).Replace("MinimumPasswordLength = 0", "MinimumPasswordLength = 14") | Set-Content C:\secpol.cfg
secedit /configure /db C:\Windows\security\local.sdb /cfg C:\secpol.cfg /areas SECURITYPOLICY

# Password complexity
secedit /export /cfg C:\secpol.cfg
(Get-Content C:\secpol.cfg).Replace("PasswordComplexity = 0", "PasswordComplexity = 1") | Set-Content C:\secpol.cfg
secedit /configure /db C:\Windows\security\local.sdb /cfg C:\secpol.cfg /areas SECURITYPOLICY
```

### Disable Guest Account (CIS Windows)

**PowerShell**:
```powershell
# Disable Guest account
Disable-LocalUser -Name "Guest"

# Verify
Get-LocalUser -Name "Guest" | Select-Object Name, Enabled
```

### Enable Windows Firewall (CIS Windows)

**PowerShell**:
```powershell
# Enable firewall for all profiles
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True

# Verify
Get-NetFirewallProfile | Select-Object Name, Enabled
```

---

## Kubernetes CIS Benchmark

### Ensure No Privileged Containers (CIS Kubernetes 5.2.1)

**Pod Security Policy**:
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restrictive-psp
spec:
  privileged: false  # No privileged containers
  hostNetwork: false # No host network
  hostIPC: false     # No host IPC
  hostPID: false     # No host PID
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
```

**Pod Security Standards (PSS) - Restricted**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Ensure Containers Run as Non-Root (CIS Kubernetes 5.2.6)

**Deployment Example**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: app
        image: myapp:latest
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
              - ALL
          readOnlyRootFilesystem: true
```

---

## Docker CIS Benchmark

### Create Non-Root User in Container (CIS Docker 4.x)

**Dockerfile**:
```dockerfile
FROM ubuntu:22.04

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy application files
COPY --chown=appuser:appuser . /app

# Switch to non-root user
USER appuser

# Run application
CMD ["/app/start.sh"]
```

### Enable Docker Content Trust (CIS Docker 2.x)

**Shell Configuration**:
```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Add to shell profile for persistence
echo 'export DOCKER_CONTENT_TRUST=1' >> ~/.bashrc
echo 'export DOCKER_CONTENT_TRUST=1' >> ~/.zshrc

# Push signed image
docker push myrepo/myimage:v1.0
```

### Limit Container Memory (CIS Docker 5.x)

**Docker Run**:
```bash
# Run container with memory limit
docker run --memory=512m --memory-swap=512m myimage:latest

# With CPU limits
docker run --memory=512m --cpus=1.0 myimage:latest
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    image: myimage:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## Automation with Ansible

### AWS CloudTrail Playbook

```yaml
---
- name: Enable CloudTrail in All Regions
  hosts: localhost
  connection: local
  tasks:
    - name: Create S3 bucket for CloudTrail logs
      amazon.aws.s3_bucket:
        name: "{{ cloudtrail_bucket }}"
        state: present
        versioning: yes
        region: us-east-1

    - name: Create CloudTrail
      community.aws.cloudtrail:
        state: present
        name: "{{ trail_name }}"
        s3_bucket_name: "{{ cloudtrail_bucket }}"
        is_multi_region_trail: true
        enable_log_file_validation: true
        include_global_events: true
```

### Linux SSH Hardening Playbook

```yaml
---
- name: Harden SSH Configuration
  hosts: all
  become: yes
  tasks:
    - name: Ensure SSH Protocol 2
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Protocol'
        line: 'Protocol 2'
        state: present

    - name: Disable root login
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin no'
        state: present

    - name: Disable password authentication
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PasswordAuthentication'
        line: 'PasswordAuthentication no'
        state: present

    - name: Restart SSH service
      systemd:
        name: sshd
        state: restarted
```

---

## Infrastructure as Code (IaC) Examples

### Terraform - AWS Secure Baseline

```hcl
# Enable EBS encryption by default
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}

# Create CloudTrail with all recommended settings
module "cloudtrail" {
  source  = "terraform-aws-modules/cloudtrail/aws"
  version = "~> 3.0"

  name                          = "organization-trail"
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true
  enable_logging                = true
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
}

# Block public access at account level
resource "aws_s3_account_public_access_block" "main" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

---

## Remediation Best Practices

### 1. Test Before Production

```bash
# WRONG: Apply directly to production
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# RIGHT: Test in non-production first
# 1. Apply to dev environment
aws ec2 enable-ebs-encryption-by-default --region us-east-1 --profile dev

# 2. Verify no operational impact
# 3. Document testing results
# 4. Then apply to production
aws ec2 enable-ebs-encryption-by-default --region us-east-1 --profile prod
```

### 2. Implement with Rollback Plan

```bash
# Before: Document current state
aws cloudtrail get-trail-status --name my-trail > trail-status-before.json

# Apply change
aws cloudtrail update-trail --name my-trail --enable-log-file-validation

# Verify success
aws cloudtrail get-trail-status --name my-trail

# Rollback if needed
aws cloudtrail update-trail --name my-trail --no-enable-log-file-validation
```

### 3. Use Configuration Management

**Prefer**:
- Terraform / CloudFormation / ARM templates
- Ansible / Chef / Puppet playbooks
- GitOps workflows with version control

**Over**:
- Manual CLI commands
- One-off scripts
- Undocumented changes

### 4. Validate After Remediation

```bash
# Apply remediation
./remediate-s3-public-access.sh

# Validate with CIS-CAT Pro or cloud-native tool
aws securityhub get-findings \
  --filters '{"ComplianceStatus": {"Value": "FAILED"}}'

# OR use automated scanner
ciscat-assessor.sh -b CIS_AWS_v3.0.0
```

---

## Key Principles

1. **Test First**: Always test in non-production
2. **Document**: Record current state before changes
3. **Rollback Plan**: Have a documented rollback procedure
4. **Automate**: Use IaC/configuration management for repeatability
5. **Validate**: Verify remediation with automated scanning
6. **Version Control**: Store remediation scripts in Git
7. **Audit Trail**: Log all remediation activities

---

## References

- [AWS CLI Command Reference](https://docs.aws.amazon.com/cli/latest/)
- [Azure CLI Documentation](https://learn.microsoft.com/en-us/cli/azure/)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
- [OpenSCAP Security Guide](https://github.com/ComplianceAsCode/content)
- [CIS Build Kits](https://www.cisecurity.org/cybersecurity-tools/cis-build-kits)
