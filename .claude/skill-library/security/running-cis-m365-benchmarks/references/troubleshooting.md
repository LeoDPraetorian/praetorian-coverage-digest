# Troubleshooting

Common issues and systematic solutions for CIS M365 benchmark audits.

## Authentication Issues

### "Failed to obtain token for Microsoft Graph"

**Symptoms**:
```
Error: Failed to obtain access token for https://graph.microsoft.com
AADSTS700016: Application with identifier 'xxxxxxxx' was not found
```

**Root causes**:
1. Azure CLI not authenticated
2. Wrong tenant context
3. Token expired
4. Device code authentication not completed

**Solutions**:

```bash
# 1. Check current authentication
az account show
# Should show tenant information

# 2. If not authenticated or wrong tenant, re-login
az logout
az login --use-device-code --allow-no-subscriptions

# 3. Verify correct tenant
az account show --query tenantId -o tsv

# 4. Clear Azure CLI cache if needed
rm -rf ~/.azure/msal_token_cache.json
az login --use-device-code --allow-no-subscriptions
```

**Prevention**:
- Always run `az account show` before starting audit
- Use `--use-device-code` for consistent authentication flow
- Keep Azure CLI updated: `az upgrade`

### "Access Denied" for Graph API

**Symptoms**:
```
Connect-MgGraph: Insufficient privileges to complete the operation
HTTP 403 Forbidden
```

**Root causes**:
1. Admin role not assigned to audit account
2. API permissions not granted
3. Conditional access policy blocking API access
4. Tenant-wide consent not granted

**Solutions**:

```bash
# 1. Verify your role assignments
az ad signed-in-user show --query '{UPN:userPrincipalName, ObjectId:id}'

# 2. Check if you're Global Admin or Security Admin
# (requires Azure Portal check or MS Graph API call)

# 3. Request admin consent for required scopes
# Azure Portal → Entra ID → Enterprise applications →
# "Microsoft Graph Command Line Tools" → Permissions → Grant admin consent

# 4. Check conditional access exclusions
# May need to add audit workstation IP to allowlist
```

**Required Graph API permissions** (for reference):
- Directory.Read.All
- Policy.Read.All
- RoleManagement.Read.Directory
- UserAuthenticationMethod.Read.All
- AuditLog.Read.All
- Domain.Read.All (admin consent)
- And 10+ more (see permission-scoping.md)

### SharePoint Connection Failures

**Symptoms**:
```
Connect-SPOService: The sign-in name or password does not match
Tenant admin URL not found
```

**Root causes**:
1. Incorrect SharePoint admin URL format
2. SharePoint admin role not assigned
3. SharePoint not licensed
4. Multi-geo tenant (different admin URL)

**Solutions**:

```bash
# 1. Verify SharePoint admin URL format
# Standard format: https://[tenant]-admin.sharepoint.com
# Example: https://contoso-admin.sharepoint.com

# 2. For multi-geo tenants, use primary geo admin URL
# Check: SharePoint Admin Center → Settings → Multi-geo

# 3. Skip SharePoint checks if not in scope
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -SkipSharePoint

# 4. Verify SharePoint admin role
# Entra ID → Users → [your account] → Assigned roles →
# Should have "SharePoint Administrator" or "Global Administrator"
```

## Docker Build Issues

### Module Installation Failures

**Symptoms**:
```
Install-Module: Unable to download from URI
NuGet provider not found
```

**Root causes**:
1. PowerShell Gallery unreachable
2. Corporate proxy blocking downloads
3. Insufficient disk space
4. NuGet package provider not installed

**Solutions**:

```bash
# 1. Build with no cache to retry downloads
docker compose build --no-cache

# 2. Configure Docker proxy (if corporate network)
# ~/.docker/config.json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.corp.com:8080",
      "httpsProxy": "http://proxy.corp.com:8080"
    }
  }
}

# 3. Check disk space
df -h
# Need at least 10 GB free for build

# 4. Test PowerShell Gallery connectivity
curl -I https://www.powershellgallery.com/api/v2/
# Should return 200 OK
```

### "libgdiplus not found"

**Symptoms**:
```
System.DllNotFoundException: Unable to load shared library 'libgdiplus'
Excel autosize failed
```

**Root cause**: libgdiplus not installed (required for ImportExcel module autosize)

**Solution**:
Already included in Dockerfile:
```dockerfile
RUN apt-get install -y libgdiplus libc6-dev
```

If still failing:
```bash
# Rebuild with no cache
docker compose build --no-cache

# Verify libgdiplus in container
docker compose run --rm cis-m365-benchmark pwsh -Command "ls /usr/lib/ | grep gdiplus"
```

## Audit Execution Issues

### Slow Performance / Timeouts

**Symptoms**:
- Audit runs for 4+ hours without completing
- "The operation has timed out" errors
- Mailbox checks take >10 minutes per user

**Root causes**:
1. Large tenant (10,000+ mailboxes)
2. Graph API rate limiting (429 errors)
3. Network latency
4. Concurrent admin operations

**Solutions**:

```bash
# 1. Run during off-hours (lower API load)
# Schedule between 10 PM - 6 AM client timezone

# 2. Skip checks for large mailbox audits
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -SkipChecks "6.1.2,6.1.3"  # Mailbox audit action checks

# 3. Run specific sections only
docker compose run --rm cis-m365-benchmark \
  -Organization "client-corp.onmicrosoft.com" \
  -Checks "1.1,1.2,1.3,2.1"  # Identity section only

# 4. Monitor progress
tail -f output/CIS_M365_Benchmark_v6_*.xlsx
# Excel file updates in real-time

# 5. For very large tenants, split into phases
# Phase 1: Identity (1.x, 2.x)
# Phase 2: Exchange (6.x)
# Phase 3: Teams/SharePoint (7.x, 8.x)
```

### Partial Results / Skipped Checks

**Symptoms**:
Excel report shows many checks as "Skipped" or "Not Run"

**Common causes**:

**Missing API permissions**:
```
Check 1.3.1 (Domain registration) - Requires Domain.Read.All (admin consent)
Check 4.1, 4.2 (Intune) - Requires DeviceManagementConfiguration.Read.All
Check 5.3.2 (Access Reviews) - Requires AccessReview.Read.All (E5 license)
```

**Solutions**:
1. Review pre-flight permission check output
2. Document missing permissions in report
3. Request admin consent from client
4. Note licensing limitations (E3 vs E5)
5. Re-run specific checks after consent granted

**Service not enabled**:
```
Check 4.x (Intune) - Client doesn't have Intune subscription
Check 6.5.x (Defender) - Defender for Office 365 not licensed
```

**Solutions**:
- Document service gaps in findings
- Mark as "N/A - Service Not Licensed" in report
- Recommend licensing upgrade if in scope

### "Module 'Microsoft.Graph' version mismatch"

**Symptoms**:
```
Import-Module: The specified module 'Microsoft.Graph' was not loaded
Version conflict detected
```

**Root cause**: Multiple Graph module versions in container

**Solution**:
```bash
# Rebuild container to get clean module state
docker compose down
docker compose build --no-cache
docker compose run --rm cis-m365-benchmark -Organization "tenant.onmicrosoft.com"
```

## Result Issues

### Excel File Not Generated

**Symptoms**:
- Audit completes but no file in `./output/`
- "Failed to export results" error

**Root causes**:
1. Volume mount not configured
2. Insufficient permissions on `./output/` directory
3. Excel template file missing
4. ImportExcel module failure

**Solutions**:

```bash
# 1. Verify volume mount in docker-compose.yml
grep "output" docker-compose.yml
# Should show: - ./output:/app/output

# 2. Check output directory exists and is writable
ls -la ./output/
chmod 755 ./output/

# 3. Create output directory if missing
mkdir -p ./output

# 4. Verify Excel template exists
ls -la *.xlsx
# Should show CIS_M365_Benchmark_v5.xlsx and v6.xlsx

# 5. Test ImportExcel module
docker compose run --rm cis-m365-benchmark pwsh -Command "Import-Module ImportExcel; Get-Module ImportExcel"
```

### Malformed Excel Output

**Symptoms**:
- Excel file opens with errors
- "File is corrupted" message
- Missing tabs or data

**Root cause**: Audit was interrupted before completion

**Solution**:
```bash
# 1. Delete partial output file
rm ./output/CIS_M365_Benchmark_*.xlsx

# 2. Re-run audit (ensure it completes)
docker compose run --rm cis-m365-benchmark -Organization "tenant.onmicrosoft.com"

# 3. Monitor for completion
tail -f output/CIS_M365_Benchmark_*.xlsx
# Wait for "Audit complete" message
```

## Permission Request Workflow

**When audit fails due to missing permissions:**

1. **Identify missing scopes** from error messages
2. **Request admin consent** via Azure Portal
3. **Re-authenticate** after consent granted
4. **Re-run audit** (or specific checks)

**Example workflow**:

```bash
# 1. Run audit and capture permission errors
docker compose run --rm cis-m365-benchmark -Organization "tenant.onmicrosoft.com" 2>&1 | tee audit.log

# 2. Extract missing permissions
grep "Forbidden" audit.log
grep "Insufficient privileges" audit.log

# 3. Request admin consent (send to client)
# "Please grant admin consent for the following Graph API scopes:
#  - Domain.Read.All (for check 1.3.1)
#  - DeviceManagementConfiguration.Read.All (for checks 4.1, 4.2)"

# 4. After consent granted, re-authenticate
az logout
az login --use-device-code --allow-no-subscriptions

# 5. Re-run only the previously failed checks
docker compose run --rm cis-m365-benchmark \
  -Organization "tenant.onmicrosoft.com" \
  -Checks "1.3.1,4.1,4.2"
```

## Getting Help

### Logging and Diagnostics

**Enable verbose logging**:
```bash
# PowerShell verbose output
docker compose run --rm cis-m365-benchmark \
  -Organization "tenant.onmicrosoft.com" \
  -Verbose

# Container logs
docker compose logs cis-m365-benchmark

# Azure CLI debug
az login --debug
```

**Collect diagnostic info**:
```bash
# Environment
docker --version
az --version
uname -a

# Authentication state
az account show

# Module versions (from container)
docker compose run --rm cis-m365-benchmark pwsh -Command "Get-Module -ListAvailable | Select Name,Version"

# Permission state
# Copy from pre-flight check output
```

### Common Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| AADSTS700016 | App not found | Re-authenticate with `az login` |
| AADSTS50076 | MFA required | Complete MFA challenge |
| AADSTS50126 | Invalid credentials | Verify username/password |
| HTTP 403 | Insufficient permissions | Request admin consent |
| HTTP 429 | Rate limit exceeded | Wait and retry, or run during off-hours |
| HTTP 500 | M365 service error | Check M365 service health, retry |
| HTTP 503 | Service unavailable | Temporary M365 outage, wait and retry |

### Escalation Path

1. **Check repository issues**: https://github.com/praetorian-inc/m365-cis-benchmark-powershell-scripts/issues
2. **Review CIS benchmark PDF**: For control interpretation questions
3. **Microsoft Graph docs**: https://learn.microsoft.com/en-us/graph/api/overview
4. **Internal team**: Escalate to senior security engineer or engagement lead
