# Prerequisites Detailed

Complete prerequisites for running CIS M365 benchmark audits.

## Software Requirements

### Docker

**Version**: 20.0+ recommended

**Installation**:
- Mac: Docker Desktop for Mac
- Linux: Docker Engine + Docker Compose
- Windows: Docker Desktop for Windows (WSL2 backend recommended)

**Verification**:
```bash
docker --version
docker compose version
```

### Azure CLI

**Version**: 2.x (latest)

**Installation**:
```bash
# macOS (via Homebrew)
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Windows
winget install Microsoft.AzureCLI

# Manual downloads
# https://aka.ms/InstallAzureCLI
```

**Verification**:
```bash
az --version
az login --use-device-code --allow-no-subscriptions
```

## Microsoft 365 Access

### Required Roles

**Minimum role**: Security Administrator OR Global Reader with specific API permissions

**Recommended role**: Global Administrator (for comprehensive audit coverage)

**Role capabilities**:
- **Global Administrator** - Full access, can grant admin consent for API scopes
- **Security Administrator** - Read security configs, cannot modify
- **Global Reader** - Read-only access, may miss some security-specific APIs

### Licensing Requirements

**Basic audit** (Identity, Exchange, Teams):
- Microsoft 365 E3 OR Business Premium

**Advanced features**:
- **Microsoft Intune checks** (Section 4.x) - Requires Intune license
- **Access Review checks** (5.3.2) - Requires E5 OR Entra ID P2
- **Defender for Office 365** (6.x advanced) - Requires Defender P1/P2

**CIS v6.0.0 check distribution by license**:
- **E3/Business Premium**: ~60 checks (Identity, Exchange basic, Teams, SharePoint)
- **E5**: ~93 checks (full benchmark including Intune, Access Reviews, advanced Defender)

## Tenant Preparation

### Client Consent

**Before starting audit, obtain client consent for**:
1. Read-only access to M365 security configurations
2. Access to user account metadata (no PII, no email content)
3. Audit log access (to verify logging is enabled)
4. API access via service account or admin account
5. Excel report sharing (contains configuration findings)

**Sample consent language**:
```
This security assessment will perform read-only analysis of your Microsoft 365
security configurations against CIS Benchmark standards. The audit will:

- Access security policies, conditional access rules, and authentication settings
- Review mailbox audit settings and DLP policies
- Check Teams and SharePoint external sharing configurations
- Analyze user authentication methods (MFA enrollment)
- Generate an Excel report with pass/fail findings and remediation guidance

No data will be modified. No user emails or documents will be accessed.
Assessment duration: 30-60 minutes depending on tenant size.
```

### Admin Account Setup

**Dedicated audit account** (recommended):
```
Email: security-audit@client-corp.onmicrosoft.com
Role: Security Administrator
MFA: Required
Conditional Access: Exempt from location restrictions for assessment
```

**Using personal admin account**:
- Ensure MFA is enabled
- Verify account is not subject to conditional access that blocks assessment workstation
- Use dedicated browser profile or incognito mode for audit session

### Firewall/Network

**Required outbound access**:
- `*.microsoft.com` - Microsoft Graph API
- `*.microsoftonline.com` - Azure AD authentication
- `*.sharepoint.com` - SharePoint Online API
- `outlook.office365.com` - Exchange Online API
- `graph.microsoft.com` - Microsoft Graph endpoint

**Docker network**:
- Container uses host network mode (inherits host firewall rules)
- If corporate proxy is required, configure Docker proxy settings

## Disk Space

**Docker image size**: ~2-3 GB (PowerShell + modules)

**Output file size**: 5-50 MB (depends on tenant size and findings count)

**Recommended free space**: 10 GB minimum

## Timing Considerations

**Audit duration estimates**:
- Small tenant (<100 users): 15-30 minutes
- Medium tenant (100-1000 users): 30-60 minutes
- Large tenant (1000-10,000 users): 60-120 minutes
- Enterprise tenant (>10,000 users): 2-4 hours

**Factors affecting duration**:
- Number of mailboxes (auditing checks are slowest)
- Graph API rate limiting
- Conditional access policy count
- SharePoint site count

**Best time to run**:
- Off-hours (lower API load)
- Avoid month-end (audit log queries are heavier)
- Schedule 2-hour window minimum for first run

## Client Communication

**Before audit**:
- [ ] Share assessment scope and methodology
- [ ] Obtain written consent for read-only access
- [ ] Confirm admin account credentials and MFA setup
- [ ] Schedule audit window (coordinate with client IT)
- [ ] Verify network access to M365 APIs

**During audit**:
- [ ] Notify client when starting (in case API activity triggers alerts)
- [ ] Monitor progress and handle permission escalation requests
- [ ] Document any scope limitations (missing permissions, licensing)

**After audit**:
- [ ] Share Excel report with findings
- [ ] Schedule findings review meeting
- [ ] Provide remediation priority guidance
- [ ] Offer follow-up audit after remediation
