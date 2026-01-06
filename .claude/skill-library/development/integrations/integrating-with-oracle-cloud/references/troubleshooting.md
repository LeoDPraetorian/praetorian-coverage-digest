# OCI Troubleshooting Guide

**Common issues and solutions for Oracle Cloud Infrastructure integrations.**

Source: Official OCI Documentation, Community Support, Research Synthesis

---

## Authentication Issues

### Problem: `NotAuthenticated` Error

**Error Message:**

```
ServiceError: NotAuthenticated
Status: 401
Message: The required information to complete authentication was not provided.
```

**Possible Causes & Solutions:**

#### 1. Invalid API Key or Fingerprint

**Verify configuration:**

```bash
cat ~/.oci/config
```

**Check fingerprint matches:**

```bash
# Calculate fingerprint from private key
openssl rsa -in ~/.oci/oci_api_key.pem -pubout -outform DER | \
  openssl md5 -c | \
  awk '{print $2}'

# Compare with fingerprint in config file
grep fingerprint ~/.oci/config
```

**Fix:** If fingerprints don't match, regenerate and upload new public key to OCI Console.

#### 2. Wrong Config Profile

**Error:** Using wrong profile in multi-profile config.

**Solution:**

```bash
# Specify profile explicitly
export OCI_CLI_PROFILE=production

# Or in SDK
provider, _ := common.NewConfigurationProviderFromFile("~/.oci/config", "production")
```

#### 3. Expired Session Token

**Error:** Session token expired (default 60 minutes).

**Solution:**

```bash
# Refresh session token
oci session refresh

# Or re-authenticate
oci session authenticate
```

#### 4. Instance Principal Not Configured

**Error:** Running on OCI instance but instance principal auth fails.

**Check dynamic group membership:**

```bash
# Verify instance is in dynamic group
oci iam dynamic-group get --dynamic-group-id <group-ocid>

# Check matching rules
```

**Fix:** Add instance to dynamic group with IAM policies.

---

## Authorization Issues

### Problem: `NotAuthorizedOrNotFound` Error

**Error Message:**

```
ServiceError: NotAuthorizedOrNotFound
Status: 404
Message: Authorization failed or requested resource not found
```

**Note:** OCI returns 404 for both missing resources AND insufficient permissions (security by obscurity).

**Troubleshooting Steps:**

#### 1. Verify Resource Exists

```bash
# Check if resource OCID is correct
oci compute instance get --instance-id <ocid>
```

#### 2. Check IAM Policies

**For user authentication:**

```
# Required policy format
Allow group <group-name> to <verb> <resource-type> in compartment <compartment-name>

# Example
Allow group Developers to read instance-family in compartment Dev
```

**For instance principals:**

```
# Dynamic group must have policy
Allow dynamic-group <group-name> to <verb> <resource-type> in compartment <compartment-name>
```

**Common permission levels:**

- `inspect`: Read metadata only
- `read`: Read full resource details
- `use`: Read + limited write
- `manage`: Full control

#### 3. Verify Compartment

**Error:** Resource exists in different compartment.

**Solution:**

```python
# List all compartments
compartments = identity_client.list_compartments(
    compartment_id=tenancy_id,
    compartment_id_in_subtree=True
).data

# Search for resource in all compartments
for compartment in compartments:
    try:
        instances = compute_client.list_instances(compartment_id=compartment.id).data
        if instances:
            print(f"Found instances in {compartment.name}")
    except:
        pass
```

#### 4. Check Region

**Error:** Resource in different region.

**Solution:**

```go
// List regions
regions, _ := identity_client.ListRegionSubscriptions(ctx, identity.ListRegionSubscriptionsRequest{
    TenancyId: common.String(tenancyId),
})

// Try each region
for _, region := range regions.Items {
    client.SetRegion(*region.RegionName)
    instance, err := client.GetInstance(ctx, request)
    if err == nil {
        fmt.Printf("Found in region: %s\n", *region.RegionName)
    }
}
```

---

## Configuration Issues

### Problem: Config File Not Found

**Error:**

```
ConfigFileNotFound: Could not find config file at ~/.oci/config
```

**Solution:**

```bash
# Create config file
oci setup config

# Or specify custom location
export OCI_CONFIG_FILE=/path/to/config
```

### Problem: Invalid Key File

**Error:**

```
InvalidKeyFile: The key file at ~/.oci/oci_api_key.pem is not valid
```

**Possible Causes:**

#### 1. Wrong File Path

```bash
# Verify file exists
ls -la ~/.oci/oci_api_key.pem

# Update config if path is wrong
vi ~/.oci/config
```

#### 2. Incorrect Permissions

```bash
# Key file must be readable
chmod 600 ~/.oci/oci_api_key.pem
chmod 600 ~/.oci/config
```

#### 3. Corrupted Key File

**Solution:** Regenerate key pair and upload new public key.

---

## Network Issues

### Problem: Connection Timeout

**Error:**

```
ConnectionError: Connection to api.us-ashburn-1.oraclecloud.com timed out
```

**Troubleshooting:**

#### 1. Check Internet Connectivity

```bash
# Test DNS resolution
nslookup api.us-ashburn-1.oraclecloud.com

# Test HTTPS connectivity
curl -I https://api.us-ashburn-1.oraclecloud.com
```

#### 2. Verify Firewall Rules

```bash
# Ensure outbound HTTPS (443) is allowed
telnet api.us-ashburn-1.oraclecloud.com 443
```

#### 3. Check Proxy Settings

```bash
# If behind proxy, configure
export HTTPS_PROXY=http://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
```

**In SDK:**

```go
import "net/http"

// Configure HTTP client with proxy
httpClient := &http.Client{
    Transport: &http.Transport{
        Proxy: http.ProxyFromEnvironment,
    },
}
```

### Problem: SSL Certificate Verification Failed

**Error:**

```
SSLError: Certificate verification failed
```

**Causes:**

- Outdated CA certificates
- Corporate proxy with MITM inspection
- Clock skew

**Solutions:**

```bash
# Update CA certificates (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install --reinstall ca-certificates

# Update CA certificates (CentOS/RHEL)
sudo yum reinstall ca-certificates

# Sync system time
sudo ntpdate pool.ntp.org
```

**⚠️ Don't disable SSL verification in production!**

---

## SDK-Specific Issues

### Go SDK

#### Problem: Import Error

**Error:**

```
cannot find package "github.com/oracle/oci-go-sdk/v65/common"
```

**Solution:**

```bash
# Install SDK
go get github.com/oracle/oci-go-sdk/v65

# Ensure correct major version in imports
import "github.com/oracle/oci-go-sdk/v65/common"  # v65, not v49 or v44
```

#### Problem: Module Version Conflicts

**Error:**

```
go: inconsistent vendoring
```

**Solution:**

```bash
# Clean and reinstall
go clean -modcache
go mod tidy
go mod vendor
```

### Python SDK

#### Problem: Module Not Found

**Error:**

```
ModuleNotFoundError: No module named 'oci'
```

**Solution:**

```bash
# Install SDK
pip install oci

# Upgrade to latest
pip install --upgrade oci
```

#### Problem: Version Compatibility

**Error:** SDK functions not found.

**Solution:**

```bash
# Check installed version
pip show oci

# Upgrade if needed
pip install --upgrade oci

# Or specify version
pip install oci==2.78.0
```

### TypeScript SDK

#### Problem: Type Errors

**Error:**

```
Property 'compartmentId' does not exist on type 'ListInstancesRequest'
```

**Solution:**

```bash
# Install latest types
npm install oci-sdk@latest
npm install @types/node@latest

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Resource Issues

### Problem: Resource in Wrong State

**Error:**

```
IncorrectState: The resource is in an incorrect state for the requested operation
```

**Example:** Trying to attach volume to stopped instance.

**Solution:**

```python
# Wait for resource to reach desired state
import time

while True:
    instance = client.get_instance(instance_id=instance_id).data

    if instance.lifecycle_state == 'RUNNING':
        break

    if instance.lifecycle_state in ['TERMINATED', 'TERMINATING']:
        raise Exception("Instance terminated")

    print(f"Waiting for instance state: {instance.lifecycle_state}")
    time.Sleep(5)

# Now perform operation
client.attach_volume(...)
```

**Go with built-in waiter:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Wait for instance to reach RUNNING state
waiterRequest := core.GetInstanceRequest{
    InstanceId: common.String(instanceId),
}

_, err = client.GetInstance(context.Background(), waiterRequest)
// SDK automatically retries until state changes
```

### Problem: `LimitExceeded` Error

**Error:**

```
LimitExceeded: You have reached the limit for <resource-type> in this compartment
```

**Solutions:**

#### 1. Check Current Usage

```bash
# Check service limits
oci limits resource-availability get \
    --compartment-id <compartment-ocid> \
    --service-name compute \
    --limit-name standard-a1-core-count
```

#### 2. Request Limit Increase

```
OCI Console → Governance → Limits, Quotas and Usage → Request Service Limit Increase
```

#### 3. Use Different Shape/Region

```python
# Try different shape if current shape unavailable
shapes = ['VM.Standard2.1', 'VM.Standard.E4.Flex', 'VM.Standard3.Flex']

for shape in shapes:
    try:
        instance = client.launch_instance(
            LaunchInstanceDetails(shape=shape, ...)
        )
        print(f"Successfully launched with shape: {shape}")
        break
    except ServiceError as e:
        if e.code == 'LimitExceeded':
            print(f"{shape} unavailable, trying next...")
            continue
        raise
```

---

## Debugging Tips

### Enable SDK Debug Logging

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Enable debug logging
common.EnableDebugLog()
```

**Python:**

```python
import logging

# Enable SDK debug logging
logging.basicConfig(level=logging.DEBUG)
oci_logger = logging.getLogger('oci')
oci_logger.setLevel(logging.DEBUG)
```

### Capture Request/Response

**Go:**

```go
import "net/http/httputil"

// Create custom round tripper to log requests
type LoggingRoundTripper struct {
    Proxied http.RoundTripper
}

func (lrt *LoggingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    // Log request
    reqDump, _ := httputil.DumpRequest(req, true)
    fmt.Printf("REQUEST:\n%s\n", reqDump)

    // Execute request
    resp, err := lrt.Proxied.RoundTrip(req)

    // Log response
    if resp != nil {
        respDump, _ := httputil.DumpResponse(resp, true)
        fmt.Printf("RESPONSE:\n%s\n", respDump)
    }

    return resp, err
}
```

### Check OCI Service Health

**Service Health Dashboard:**

```
https://ocistatus.oraclecloud.com/
```

**Check specific region:**

```bash
# Test API endpoint accessibility
curl -I https://identity.us-ashburn-1.oraclecloud.com/20160918/
```

### Use OCI CLI for Verification

**Test authentication:**

```bash
oci iam region list
```

**Test permissions:**

```bash
oci compute instance list --compartment-id <compartment-ocid>
```

**Get detailed error info:**

```bash
oci compute instance get --instance-id <instance-ocid> --debug
```

---

## Common Pitfalls

| Issue                           | Problem                         | Solution                         |
| ------------------------------- | ------------------------------- | -------------------------------- |
| **Missing opc-next-page**       | Incomplete pagination           | Always check for next page token |
| **Hardcoded OCIDs**             | Brittle code, env-specific      | Use variables/parameters         |
| **No retry logic**              | Transient failures cause errors | Implement exponential backoff    |
| **Assuming 404 = not found**    | Could be permission denied      | Check IAM policies               |
| **Public IP for intra-region**  | Unnecessary costs               | Use private IPs                  |
| **Not checking resource state** | IncorrectState errors           | Wait for desired state           |
| **Ignoring request IDs**        | Hard to troubleshoot            | Log all request IDs              |
| **No timeout on operations**    | Hanging requests                | Set context timeout              |

---

## Getting Help

### Oracle Support

**Requirements:**

- OCI request ID (from error response)
- Timestamp of issue
- Tenancy OCID
- Region

**Open ticket:**

```
OCI Console → Support → Create Support Request
```

### Community Resources

- **OCI Forums**: https://cloudcustomerconnect.oracle.com/resources/oci
- **Stack Overflow**: Tag `oracle-cloud-infrastructure`
- **GitHub Issues**: SDK-specific issues on GitHub repos

### Debug Checklist

Before opening support ticket:

- [ ] Verify config file and API keys
- [ ] Check IAM policies
- [ ] Confirm resource exists in correct region/compartment
- [ ] Test with OCI CLI
- [ ] Enable SDK debug logging
- [ ] Capture request ID from error
- [ ] Check OCI service health dashboard
- [ ] Review recent OCI announcements for breaking changes

---

## References

- **Official Docs**: [Troubleshooting - OCI SDK](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_troubleshooting.htm)
- **Service Health**: [OCI Status Dashboard](https://ocistatus.oraclecloud.com/)
- **Community**: [Oracle Cloud Customer Connect](https://cloudcustomerconnect.oracle.com/resources/oci)
- **GitHub**: [OCI Go SDK Issues](https://github.com/oracle/oci-go-sdk/issues)
