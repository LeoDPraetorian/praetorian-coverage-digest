---
name: running-cis-m365-benchmarks
description: Use when engineer needs to run CIS M365 benchmark audits - provides Docker-based workflow, authentication setup, parameter guidance, and troubleshooting patterns for Praetorian's m365-cis-benchmark-powershell-scripts
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Running CIS M365 Benchmarks

**Docker-based workflow for running CIS Microsoft 365 Foundations Benchmark audits using Praetorian's automated PowerShell framework.**

## When to Use

Use this skill when:

- Engineer asks "How do I run CIS M365 audit?" or "Help me audit M365 security"
- Starting a client M365 security assessment
- Need to run compliance checks against CIS benchmarks
- Troubleshooting M365 audit execution or permission issues
- Integrating M365 audit results into security workflows

## Quick Reference

| Phase                   | Purpose                                                  | Time     |
| ----------------------- | -------------------------------------------------------- | -------- |
| **1. Prerequisites**    | Verify Docker, Azure CLI, tenant access                  | 5 min    |
| **2. Repository Setup** | Clone Praetorian's m365-cis-benchmark-powershell-scripts | 2 min    |
| **3. Authentication**   | Azure CLI device code authentication                     | 3 min    |
| **4. Build Container**  | Docker image with PowerShell modules                     | 10-15 min |
| **5. Run Audit**        | Execute audit with parameters                            | 30-60 min |
| **6. Results Analysis** | Review Excel output and findings                         | Variable |

**Repository**: https://github.com/praetorian-inc/m365-cis-benchmark-powershell-scripts

---

## Core Workflow

### Phase 1: Prerequisites Verification

**Check these before starting:**

```bash
# Verify Docker is installed
docker --version  # Should show version 20+

# Verify Azure CLI is installed
az --version  # Should show version 2.x

# Verify you have tenant access information
# Required: Client's M365 tenant domain (e.g., "contoso.onmicrosoft.com")
```

**Required access levels:**
- Global Administrator OR Security Administrator role in M365 tenant
- Appropriate licenses (E3/E5 for advanced security features)
- Client consent for read-only security assessment

**See:** [references/prerequisites-detailed.md](references/prerequisites-detailed.md) for license requirements, permission scoping, and client consent templates.

---

### Phase 2: Repository Setup

**Clone the Praetorian repository:**

```bash
# Clone repository
git clone https://github.com/praetorian-inc/m365-cis-benchmark-powershell-scripts.git

# Navigate into repository
cd m365-cis-benchmark-powershell-scripts

# Verify structure
ls -la
# Should see: Dockerfile, docker-compose.yml, Run-CISBenchmarkAudit.ps1, checks/, scripts/
```

**Repository structure:**
- `Dockerfile` - Container definition with PowerShell modules
- `docker-compose.yml` - Volume mounting configuration
- `Run-CISBenchmarkAudit.ps1` - Main audit orchestration script
- `checks/` - Individual CIS check implementations
- `scripts/` - Helper scripts for permissions, authentication
- `*.xlsx` - CIS benchmark tracking files (v5, v6)

---

### Phase 3: Authentication Setup

**Use Azure CLI device code authentication (simplest approach):**

```bash
# Login with device code (works from any machine)
az login --use-device-code --allow-no-subscriptions

# Follow the prompts:
# 1. Visit https://microsoft.com/devicelogin
# 2. Enter the provided code
# 3. Authenticate with M365 admin credentials
# 4. Confirm "Azure CLI" app consent

# Verify authentication
az account show
# Should display tenant information
```

**Why device code authentication?**
- Works in containers without browser access
- Doesn't require storing credentials in environment variables
- Tokens are automatically obtained for Graph, Exchange, Teams, SharePoint
- Secure token storage in `~/.azure/` directory

**Alternative authentication methods:**
See [references/authentication-methods.md](references/authentication-methods.md) for broker authentication, service principals, and managed identities.

---

### Phase 4: Build Docker Container

**Build container with all required PowerShell modules:**

```bash
# Build from repository directory
docker compose build

# This installs:
# - PowerShell 7.4
# - ImportExcel module (for reporting)
# - Microsoft.Graph modules (API access)
# - ExchangeOnlineManagement module
# - MicrosoftTeams module
# - Microsoft.Online.SharePoint.PowerShell module
# - Azure CLI (for token authentication)

# Build time: 10-15 minutes (cached after first build)
```

**Build optimization:**
- Multi-stage Dockerfile caches PowerShell modules separately
- Rebuilds are fast unless modules need updates
- libgdiplus is included for Excel autosize functionality

**Troubleshooting build issues:**
See [references/troubleshooting.md](references/troubleshooting.md#build-failures) for module installation errors, network issues, and cache problems.

---

### Phase 5: Run the Audit

**Basic usage (auto-detects CIS version):**

```bash
# Run audit against client tenant
docker compose run --rm cis-m365-benchmark -Organization "client-corp.onmicrosoft.com"

# Results saved to:
# ./output/CIS_M365_Benchmark_v6_YYYYMMDD-HHMMSS.xlsx
```

**The audit process:**
1. Validates Azure CLI authentication
2. Tests M365 API permissions (pre-flight check)
3. Connects to Graph, Exchange, Teams, SharePoint
4. Executes 93 CIS checks (v6.0.0)
5. Generates Excel report with pass/fail status
6. Provides remediation guidance for failures

**Common parameters:**

```bash
# Run specific checks only
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -Checks "1.2.2,5.2.3.3,8.5.4"

# Skip problematic checks
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -SkipChecks "7.2.1,7.2.2"

# Skip SharePoint checks (if no access)
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -SkipSharePoint

# Use specific CIS version
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -Version "v5.0.0"
```

**See:** [references/parameters-reference.md](references/parameters-reference.md) for all available parameters, version management, and advanced configuration.

---

### Phase 6: Results Analysis

**Output location:**

```bash
# Results are saved to host machine via volume mount
ls -la ./output/

# Example output file
# CIS_M365_Benchmark_v6_20260121-044016.xlsx
```

**Excel report structure:**
- **Summary tab** - Overall compliance score, pass/fail counts
- **Per-check tabs** - Detailed findings, evidence, remediation steps
- **Color coding** - Green (pass), Red (fail), Yellow (manual review)

**Common findings categories:**
- Identity and authentication misconfigurations
- Guest access and external sharing issues
- Mailbox auditing gaps
- Conditional access policy weaknesses
- Data loss prevention (DLP) not enforced
- Mobile device management (Intune) not configured

**See:** [references/interpreting-results.md](references/interpreting-results.md) for reading Excel reports, prioritizing findings, and creating client deliverables.

---

## Permission Management

**The audit requires extensive M365 permissions. The framework includes automatic permission validation.**

### Pre-flight Permission Check

**The audit automatically tests permissions before execution:**

```bash
# Manual permission test (optional)
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -SkipConnection  # Test permissions without running audit
```

**Required Graph API scopes:**
- `Directory.Read.All` - Read directory data
- `Policy.Read.All` - Read security policies
- `RoleManagement.Read.Directory` - Read role assignments
- `UserAuthenticationMethod.Read.All` - Read MFA status
- `AuditLog.Read.All` - Read audit logs
- `Domain.Read.All` - Read domain configuration
- And 10+ more scopes (see full list in references)

**Admin consent required for:**
- `DeviceManagementConfiguration.Read.All` (Intune checks - requires Intune license)
- `AccessReview.Read.All` (Access review checks - requires E5 or Entra ID P2)
- `OrgSettings-*.Read.All` (Organization settings)

**If permissions are missing:**
1. Review permission gaps from pre-flight check
2. Request admin consent via Azure Portal
3. Re-run audit after consent granted
4. Document permission limitations in report

**See:** [references/permission-scoping.md](references/permission-scoping.md) for detailed permission requirements, admin consent workflows, and handling permission denials.

---

## Troubleshooting

**Common issues and solutions:**

### Authentication Errors

**Symptom:** "Failed to obtain token" or "Access denied"

**Solutions:**
1. Verify `az login` completed successfully: `az account show`
2. Check tenant domain is correct (must match M365 tenant)
3. Confirm admin account has appropriate roles
4. Re-authenticate: `az logout && az login --use-device-code --allow-no-subscriptions`

### Module Loading Failures

**Symptom:** "Module 'Microsoft.Graph' could not be loaded"

**Solutions:**
1. Rebuild Docker image: `docker compose build --no-cache`
2. Check internet connectivity during build
3. Verify Docker has sufficient disk space
4. Check PowerShell Gallery is accessible

### SharePoint Connection Issues

**Symptom:** "Connect-SPOService: Access denied"

**Solutions:**
1. Use `-SkipSharePoint` flag to bypass SharePoint checks
2. Verify SharePoint admin role is assigned
3. Check tenant has SharePoint Online license
4. SharePoint URL format: `https://clientcorp-admin.sharepoint.com`

### Partial Results

**Symptom:** Some checks show "Skipped" or "Not Run"

**Causes:**
- Missing admin consent for required Graph API scopes
- Licensing gaps (E5 features without E5 license)
- Service not enabled (Intune, Defender for Office 365)
- Network timeouts on large tenants

**Solutions:**
1. Review pre-flight permission check output
2. Document scope limitations in assessment report
3. Request additional consents from client
4. Re-run specific checks after consent: `-Checks "1.2.2,5.2.3.3"`

**For detailed troubleshooting workflows:**
See [references/troubleshooting.md](references/troubleshooting.md) for permission errors, module conflicts, timeout issues, and Docker problems.

---

## Integration

### Called By

- Security engineers starting M365 assessments
- `/research` command for M365 security methodologies
- Client engagement workflows requiring M365 compliance checks

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - this skill provides guidance, actual execution uses Docker/PowerShell

### Pairs With (conditional)

| Skill                                   | Trigger                                 | Purpose                                        |
| --------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `writing-security-findings`             | When generating client deliverable      | Format findings for client reports             |
| `praetorian-cloud-finding-format`       | When documenting security findings      | CVSS scoring and Praetorian report structure   |
| `integrating-chariot-security-data`     | When uploading to Chariot platform      | Correlate M365 findings with asset inventory   |
| `researching-m365-security-patterns`    | When unfamiliar with M365 controls      | Understanding CIS controls and configurations  |
| `debugging-systematically`              | When troubleshooting audit failures     | Root cause analysis for permission/module issues |

---

## Advanced Patterns

### Running Multiple Tenants

**For multi-tenant assessments:**

```bash
# Tenant 1
docker compose run --rm cis-m365-benchmark -Organization "client1.onmicrosoft.com"

# Re-authenticate for Tenant 2
az logout
az login --use-device-code --allow-no-subscriptions

# Tenant 2
docker compose run --rm cis-m365-benchmark -Organization "client2.onmicrosoft.com"
```

### Continuous Monitoring

**For recurring audits:**

```bash
# Schedule monthly audits (cron example)
0 1 1 * * cd /path/to/m365-cis-benchmark && docker compose run --rm cis-m365-benchmark -Organization "client.onmicrosoft.com"

# Compare results over time
diff output/CIS_M365_Benchmark_v6_20260101-*.xlsx output/CIS_M365_Benchmark_v6_20260201-*.xlsx
```

### Integration with CI/CD

**For automated security testing:**

```bash
# Run audit in CI pipeline
docker run --rm \
  -v ~/.azure:/root/.azure:rw \
  -v ./output:/app/output \
  cis-m365-benchmark:latest \
  -Organization "${M365_TENANT}" \
  -SkipSharePoint

# Exit code 0 = all checks passed
# Exit code 1 = some checks failed
```

**See:** [references/advanced-patterns.md](references/advanced-patterns.md) for multi-tenant workflows, continuous monitoring, CI/CD integration, and result comparison.

---

## MCP Integration

**The repository includes an MCP server for Claude Code integration.**

### MCP Tools Available

1. **run-audit** - Execute CIS M365 audit via Docker
2. **test-permissions** - Validate M365 permissions before audit
3. **list-checks** - List available CIS checks for a version
4. **build-image** - Build Docker image with PowerShell modules

### Using MCP Tools

**If MCP wrappers are configured in `.claude/tools/cis-m365-benchmarks/`:**

```typescript
// Example: Run audit via MCP
await mcp.runAudit({
  organization: "client-corp.onmicrosoft.com",
  skipSharePoint: true,
  checks: ["1.2.2", "5.2.3.3"]
});
```

**See:** [references/mcp-integration.md](references/mcp-integration.md) for MCP server setup, tool wrappers, and Claude Code automation patterns.

---

## Key Principles

1. **Docker First** - Use containerized approach, not manual PowerShell module installation
2. **Device Code Auth** - Azure CLI device code is simplest and most secure
3. **Pre-flight Validation** - Always run permission check before full audit
4. **Document Gaps** - Note missing permissions and licensing limitations in report
5. **Progressive Disclosure** - Start with basic audit, add specific checks as needed
6. **Volume Mounting** - Results saved to host via `./output` directory mount

---

## Related Skills

| Skill                                | Access Method                                                                            | Purpose                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **writing-security-findings**        | `Read(".claude/skill-library/reporting/writing-security-findings/SKILL.md")`             | Format M365 findings for client deliverables     |
| **praetorian-cloud-finding-format**  | `skill: "praetorian-cloud-finding-format"` (CORE)                                        | CVSS scoring and report structure                |
| **debugging-systematically**         | `skill: "debugging-systematically"` (CORE)                                               | Troubleshooting audit failures                   |
| **researching-m365-security**        | `Read(".claude/skill-library/security/researching-m365-security/SKILL.md")` (if exists)  | Understanding M365 security controls             |
| **integrating-chariot-data**         | `Read(".claude/skill-library/integrations/integrating-chariot-data/SKILL.md")` (if exists) | Upload findings to Chariot platform              |

---

## Changelog

See `.history/CHANGELOG` for version history and updates.
