# Palo Alto Panorama REST API Complete Reference

**Last Updated:** January 2026
**Coverage:** PAN-OS v10.x and v11.x REST API endpoints
**Source:** Official documentation and implementation patterns

---

## Quick Reference

The Panorama REST API provides resource-oriented endpoints for managing firewall configurations:

```
https://{panorama-host}/restapi/{version}/{Category}/{Resource}?location={location}&key={api-key}
```

### API Versions

| Version | Release  | Notes                                   |
| ------- | -------- | --------------------------------------- |
| v9.0    | Initial  | Basic REST API coverage                 |
| v10.0   | Extended | Improved schemas, wider coverage        |
| v10.1   | Enhanced | Additional network/monitoring endpoints |
| v10.2   | Device   | Enhanced device management              |
| v11.0   | Current  | PATCH support, expanded system APIs     |
| v11.1   | Latest   | Additional capabilities                 |

**Recommendation:** Use v11.0+ for new integrations. Access version-specific docs at `https://YOUR-PANORAMA/restapi-doc`.

### HTTP Methods

| Method | Purpose              | Notes                   |
| ------ | -------------------- | ----------------------- |
| GET    | Retrieve resource(s) | Idempotent              |
| POST   | Create new resource  | Requires unique name    |
| PUT    | Full resource update | Replaces entire object  |
| PATCH  | Partial update       | v11.0+ only             |
| DELETE | Remove resource      | Requires name parameter |

---

## Authentication

### API Key Generation

Generate via XML API:

```bash
curl -k "https://{panorama}/api/?type=keygen&user={username}&password={password}"
```

### Request Authentication

**Header Method (Recommended):**

```http
X-PAN-KEY: {api-key}
```

**Query Parameter Method:**

```
?key={api-key}
```

### Best Practices

- Create dedicated API accounts (not personal accounts)
- Rotate keys every 90 days
- Store keys in secret management systems (Vault, AWS Secrets Manager)
- URL-encode keys containing special characters

---

## Location Parameter Reference

| Location         | Required Parameters     | Use Case                      |
| ---------------- | ----------------------- | ----------------------------- |
| `device-group`   | `device-group={name}`   | Panorama managed configs      |
| `shared`         | None                    | Shared objects across all DGs |
| `vsys`           | `vsys={name}`           | Virtual system scope          |
| `template`       | `template={name}`       | Template configurations       |
| `template-stack` | `template-stack={name}` | Template stack configs        |

**Example:**

```
?location=device-group&device-group=Production
```

---

## Objects API

**Base Path:** `/restapi/v{version}/Objects/`

### Endpoint Reference

| Endpoint                         | Methods                | Description           |
| -------------------------------- | ---------------------- | --------------------- |
| `/Objects/Addresses`             | GET, POST, PUT, DELETE | IP/FQDN/range objects |
| `/Objects/AddressGroups`         | GET, POST, PUT, DELETE | Address grouping      |
| `/Objects/Services`              | GET, POST, PUT, DELETE | TCP/UDP port objects  |
| `/Objects/ServiceGroups`         | GET, POST, PUT, DELETE | Service grouping      |
| `/Objects/Applications`          | GET, POST, PUT, DELETE | Custom applications   |
| `/Objects/ApplicationGroups`     | GET, POST, PUT, DELETE | Application grouping  |
| `/Objects/Tags`                  | GET, POST, PUT, DELETE | Object classification |
| `/Objects/LogForwardingProfiles` | GET, POST, PUT, DELETE | Log forwarding        |

### Address Object Schema

**Create Request:**

```json
{
  "entry": {
    "@name": "malicious-ip",
    "@location": "device-group",
    "@device-group": "Production",
    "ip-netmask": "192.0.2.100",
    "description": "Known malicious IP",
    "tag": {
      "member": ["threat-intel", "blocked"]
    }
  }
}
```

**Address Types:**

```json
// IP with netmask
{ "ip-netmask": "192.0.2.0/24" }

// IP range
{ "ip-range": "192.0.2.1-192.0.2.254" }

// FQDN
{ "fqdn": "malicious.example.com" }

// Wildcard FQDN
{ "ip-wildcard": "*.malicious.com" }
```

**Response (Success):**

```json
{
  "@status": "success",
  "@code": "20",
  "result": {
    "@total-count": "1",
    "entry": {
      "@name": "malicious-ip",
      "ip-netmask": "192.0.2.100"
    }
  }
}
```

### Address Group Schema

**Static Group:**

```json
{
  "entry": {
    "@name": "blocked-ips",
    "static": {
      "member": ["malicious-ip-1", "malicious-ip-2"]
    },
    "description": "Blocked IP addresses"
  }
}
```

**Dynamic Group (Tag-Based):**

```json
{
  "entry": {
    "@name": "all-threats",
    "dynamic": {
      "filter": "'threat-intel'"
    },
    "description": "Dynamic group matching threat-intel tag"
  }
}
```

### Tag Schema

```json
{
  "entry": {
    "@name": "threat-intel",
    "color": "color1",
    "comments": "Threat intelligence indicators"
  }
}
```

**Available Colors:** `color1` through `color16`, `red`, `green`, `blue`, `yellow`, `copper`, `orange`, `purple`, `gray`, `light green`, `cyan`, `light gray`, `blue gray`, `lime`, `black`, `gold`, `brown`

---

## Policies API

**Base Path:** `/restapi/v{version}/Policies/`

### Endpoint Reference

| Endpoint                          | Methods                | Description                     |
| --------------------------------- | ---------------------- | ------------------------------- |
| `/Policies/SecurityPreRules`      | GET, POST, PUT, DELETE | Pre-rules (before device rules) |
| `/Policies/SecurityPostRules`     | GET, POST, PUT, DELETE | Post-rules (after device rules) |
| `/Policies/NATPreRules`           | GET, POST, PUT, DELETE | NAT pre-rules                   |
| `/Policies/NATPostRules`          | GET, POST, PUT, DELETE | NAT post-rules                  |
| `/Policies/QoSRules`              | GET, POST, PUT, DELETE | QoS policies                    |
| `/Policies/DecryptionRules`       | GET, POST, PUT, DELETE | SSL decryption                  |
| `/Policies/ApplicationOverride`   | GET, POST, PUT, DELETE | App override rules              |
| `/Policies/PolicyBasedForwarding` | GET, POST, PUT, DELETE | PBF rules                       |
| `/Policies/SDWANPreRules`         | GET, POST, PUT, DELETE | SD-WAN policies (v9.1+)         |

### Security Rule Schema

**Create Request:**

```json
{
  "entry": {
    "@name": "block-malicious",
    "from": { "member": ["any"] },
    "to": { "member": ["any"] },
    "source": { "member": ["malicious-ip"] },
    "destination": { "member": ["any"] },
    "source-user": { "member": ["any"] },
    "application": { "member": ["any"] },
    "service": { "member": ["any"] },
    "category": { "member": ["any"] },
    "action": "deny",
    "log-start": "yes",
    "log-end": "yes",
    "log-setting": "default-log-forwarding",
    "description": "Block known malicious IPs"
  }
}
```

**Action Values:** `allow`, `deny`, `drop`, `reset-client`, `reset-server`, `reset-both`

### NAT Rule Schema

**Source NAT:**

```json
{
  "entry": {
    "@name": "outbound-nat",
    "from": { "member": ["trust"] },
    "to": { "member": ["untrust"] },
    "source": { "member": ["internal-servers"] },
    "destination": { "member": ["any"] },
    "service": "any",
    "source-translation": {
      "dynamic-ip-and-port": {
        "interface-address": {
          "interface": "ethernet1/1"
        }
      }
    }
  }
}
```

---

## Network API

**Base Path:** `/restapi/v{version}/Network/`

### Endpoint Reference

| Endpoint                      | Methods                | Description         |
| ----------------------------- | ---------------------- | ------------------- |
| `/Network/EthernetInterfaces` | GET, POST, PUT, DELETE | Physical interfaces |
| `/Network/Zones`              | GET, POST, PUT, DELETE | Security zones      |
| `/Network/VirtualRouters`     | GET, POST, PUT, DELETE | Virtual routers     |
| `/Network/StaticRoutes`       | GET, POST, PUT, DELETE | Static routes       |
| `/Network/VLANs`              | GET, POST, PUT, DELETE | VLAN configuration  |
| `/Network/Tunnels`            | GET, POST, PUT, DELETE | VPN tunnels         |
| `/Network/IPSecTunnels`       | GET, POST, PUT, DELETE | IPSec tunnels       |
| `/Network/IKEGateways`        | GET, POST, PUT, DELETE | IKE gateways        |

### Zone Schema

```json
{
  "entry": {
    "@name": "trust",
    "network": {
      "layer3": {
        "member": ["ethernet1/1", "ethernet1/2"]
      }
    },
    "enable-user-identification": "yes"
  }
}
```

---

## Panorama API (Device Management)

**Base Path:** `/restapi/v{version}/Panorama/`

### Endpoint Reference

| Endpoint                   | Methods                | Description                |
| -------------------------- | ---------------------- | -------------------------- |
| `/Panorama/DeviceGroups`   | GET, POST, PUT, DELETE | Device group management    |
| `/Panorama/Templates`      | GET, POST, PUT, DELETE | Template management        |
| `/Panorama/TemplateStacks` | GET, POST, PUT, DELETE | Template stacks            |
| `/Panorama/ManagedDevices` | GET                    | Managed firewall inventory |

### Device Group Query

```bash
# List all device groups
GET /restapi/v10.1/Panorama/DeviceGroups

# Get specific device group
GET /restapi/v10.1/Panorama/DeviceGroups?name=Production
```

---

## System API

**Base Path:** `/restapi/v{version}/System/`

### Endpoint Reference

| Endpoint                 | Methods                | Description            |
| ------------------------ | ---------------------- | ---------------------- |
| `/System/Configuration`  | GET, PUT               | System configuration   |
| `/System/Administrators` | GET, POST, PUT, DELETE | Admin accounts         |
| `/System/Certificates`   | GET, POST, DELETE      | Certificate management |
| `/System/Logging`        | GET, PUT               | Log configuration      |

### Job Status Monitoring

```bash
# Query job status (operational command via XML API)
GET /api/?type=op&cmd=<show><jobs><id>{job_id}</id></jobs></show>&key={api-key}
```

**Job States:** `ACT` (active), `FIN` (finished), `PEND` (pending), `FAIL` (failed)

---

## Go Code Examples

### Client Structure

```go
package panorama

import (
    "bytes"
    "crypto/tls"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

type Client struct {
    Host       string
    APIKey     string
    Version    string
    HTTPClient *http.Client
}

type APIResponse struct {
    Status string `json:"@status"`
    Code   string `json:"@code"`
    Result struct {
        TotalCount string      `json:"@total-count,omitempty"`
        Entry      interface{} `json:"entry,omitempty"`
        Message    string      `json:"message,omitempty"`
    } `json:"result"`
}

func NewClient(host, apiKey string) *Client {
    return &Client{
        Host:    host,
        APIKey:  apiKey,
        Version: "v11.1",
        HTTPClient: &http.Client{
            Timeout: 30 * time.Second,
            Transport: &http.Transport{
                TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
            },
        },
    }
}

func (c *Client) buildURL(path string, params map[string]string) string {
    u := url.URL{
        Scheme: "https",
        Host:   c.Host,
        Path:   fmt.Sprintf("/restapi/%s/%s", c.Version, path),
    }

    q := u.Query()
    for k, v := range params {
        q.Set(k, v)
    }
    u.RawQuery = q.Encode()

    return u.String()
}

func (c *Client) doRequest(method, path string, params map[string]string, body interface{}) (*APIResponse, error) {
    var reqBody io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("marshal request body: %w", err)
        }
        reqBody = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequest(method, c.buildURL(path, params), reqBody)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    req.Header.Set("X-PAN-KEY", c.APIKey)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("execute request: %w", err)
    }
    defer resp.Body.Close()

    respBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("read response: %w", err)
    }

    var apiResp APIResponse
    if err := json.Unmarshal(respBody, &apiResp); err != nil {
        return nil, fmt.Errorf("unmarshal response: %w", err)
    }

    if apiResp.Status == "error" {
        return &apiResp, fmt.Errorf("API error %s: %s", apiResp.Code, apiResp.Result.Message)
    }

    return &apiResp, nil
}
```

### Address Object Operations

```go
type AddressEntry struct {
    Name        string     `json:"@name"`
    Location    string     `json:"@location,omitempty"`
    DeviceGroup string     `json:"@device-group,omitempty"`
    IPNetmask   string     `json:"ip-netmask,omitempty"`
    IPRange     string     `json:"ip-range,omitempty"`
    FQDN        string     `json:"fqdn,omitempty"`
    Description string     `json:"description,omitempty"`
    Tag         *MemberList `json:"tag,omitempty"`
}

type AddressRequest struct {
    Entry AddressEntry `json:"entry"`
}

type MemberList struct {
    Member []string `json:"member"`
}

func (c *Client) CreateAddressObject(deviceGroup, name, ip, description string, tags []string) error {
    entry := AddressEntry{
        Name:        name,
        Location:    "device-group",
        DeviceGroup: deviceGroup,
        IPNetmask:   ip,
        Description: description,
    }

    if len(tags) > 0 {
        entry.Tag = &MemberList{Member: tags}
    }

    params := map[string]string{
        "location":     "device-group",
        "device-group": deviceGroup,
        "name":         name,
    }

    _, err := c.doRequest("POST", "Objects/Addresses", params, AddressRequest{Entry: entry})
    return err
}

func (c *Client) GetAddressObject(deviceGroup, name string) (*AddressEntry, error) {
    params := map[string]string{
        "location":     "device-group",
        "device-group": deviceGroup,
        "name":         name,
    }

    resp, err := c.doRequest("GET", "Objects/Addresses", params, nil)
    if err != nil {
        return nil, err
    }

    // Parse entry from response
    entryData, err := json.Marshal(resp.Result.Entry)
    if err != nil {
        return nil, err
    }

    var entry AddressEntry
    if err := json.Unmarshal(entryData, &entry); err != nil {
        return nil, err
    }

    return &entry, nil
}

func (c *Client) DeleteAddressObject(deviceGroup, name string) error {
    params := map[string]string{
        "location":     "device-group",
        "device-group": deviceGroup,
        "name":         name,
    }

    _, err := c.doRequest("DELETE", "Objects/Addresses", params, nil)
    return err
}
```

### Security Rule Operations

```go
type SecurityRuleEntry struct {
    Name        string      `json:"@name"`
    From        MemberList  `json:"from"`
    To          MemberList  `json:"to"`
    Source      MemberList  `json:"source"`
    Destination MemberList  `json:"destination"`
    SourceUser  MemberList  `json:"source-user"`
    Application MemberList  `json:"application"`
    Service     MemberList  `json:"service"`
    Category    MemberList  `json:"category"`
    Action      string      `json:"action"`
    LogStart    string      `json:"log-start,omitempty"`
    LogEnd      string      `json:"log-end,omitempty"`
    LogSetting  string      `json:"log-setting,omitempty"`
    Description string      `json:"description,omitempty"`
}

type SecurityRuleRequest struct {
    Entry SecurityRuleEntry `json:"entry"`
}

func (c *Client) CreateSecurityPreRule(deviceGroup string, rule SecurityRuleEntry) error {
    params := map[string]string{
        "location":     "device-group",
        "device-group": deviceGroup,
        "name":         rule.Name,
    }

    _, err := c.doRequest("POST", "Policies/SecurityPreRules", params, SecurityRuleRequest{Entry: rule})
    return err
}

// BlockIP creates an address object and security rule to block an IP
func (c *Client) BlockIP(deviceGroup, ip, description string) error {
    name := fmt.Sprintf("blocked-%s", sanitizeName(ip))

    // Create address object
    if err := c.CreateAddressObject(deviceGroup, name, ip, description, []string{"blocked"}); err != nil {
        return fmt.Errorf("create address object: %w", err)
    }

    // Create security rule
    rule := SecurityRuleEntry{
        Name:        fmt.Sprintf("block-%s", sanitizeName(ip)),
        From:        MemberList{Member: []string{"any"}},
        To:          MemberList{Member: []string{"any"}},
        Source:      MemberList{Member: []string{name}},
        Destination: MemberList{Member: []string{"any"}},
        SourceUser:  MemberList{Member: []string{"any"}},
        Application: MemberList{Member: []string{"any"}},
        Service:     MemberList{Member: []string{"any"}},
        Category:    MemberList{Member: []string{"any"}},
        Action:      "deny",
        LogStart:    "yes",
        LogEnd:      "yes",
        Description: description,
    }

    if err := c.CreateSecurityPreRule(deviceGroup, rule); err != nil {
        return fmt.Errorf("create security rule: %w", err)
    }

    return nil
}

func sanitizeName(s string) string {
    return strings.ReplaceAll(strings.ReplaceAll(s, ".", "-"), "/", "-")
}
```

### Commit Operations (XML API)

```go
func (c *Client) CommitToPanorama() (string, error) {
    u := fmt.Sprintf("https://%s/api/?type=commit&cmd=<commit></commit>&key=%s",
        c.Host, url.QueryEscape(c.APIKey))

    resp, err := c.HTTPClient.Get(u)
    if err != nil {
        return "", fmt.Errorf("commit request: %w", err)
    }
    defer resp.Body.Close()

    // Parse XML response for job ID
    body, _ := io.ReadAll(resp.Body)
    // Extract job ID from: <job>12345</job>
    jobID := extractJobID(string(body))

    return jobID, nil
}

func (c *Client) PushToDeviceGroup(deviceGroup string) (string, error) {
    cmd := fmt.Sprintf("<commit-all><shared-policy><device-group><entry name='%s'/></device-group></shared-policy></commit-all>", deviceGroup)
    u := fmt.Sprintf("https://%s/api/?type=commit&action=all&cmd=%s&key=%s",
        c.Host, url.QueryEscape(cmd), url.QueryEscape(c.APIKey))

    resp, err := c.HTTPClient.Get(u)
    if err != nil {
        return "", fmt.Errorf("push request: %w", err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    jobID := extractJobID(string(body))

    return jobID, nil
}

func (c *Client) WaitForJob(jobID string, timeout time.Duration) error {
    deadline := time.Now().Add(timeout)
    interval := 2 * time.Second
    maxInterval := 30 * time.Second

    for time.Now().Before(deadline) {
        status, err := c.GetJobStatus(jobID)
        if err != nil {
            return err
        }

        switch status {
        case "FIN":
            return nil
        case "FAIL":
            return fmt.Errorf("job %s failed", jobID)
        }

        time.Sleep(interval)
        if interval < maxInterval {
            interval *= 2
        }
    }

    return fmt.Errorf("job %s timed out", jobID)
}
```

---

## Version Differences: v10.x vs v11.x

### v11.0+ New Features

| Feature               | v10.x         | v11.x                         |
| --------------------- | ------------- | ----------------------------- |
| PATCH method          | Not supported | Supported for partial updates |
| Monitoring endpoints  | Limited       | Expanded system status APIs   |
| Multi-config batching | Basic         | Enhanced performance          |
| Error messages        | Generic       | More detailed with codes      |

### Breaking Changes

| Area            | v10.x Behavior     | v11.x Behavior                |
| --------------- | ------------------ | ----------------------------- |
| Response format | Mixed formats      | Consistent JSON structure     |
| Error codes     | Numeric strings    | Standardized code system      |
| Required fields | Lenient validation | Strict `@` prefix enforcement |

### Migration Notes

```go
// v10.x - Some fields optional
entry := map[string]interface{}{
    "name": "test-ip",
    "ip-netmask": "192.0.2.1",
}

// v11.x - Strict field requirements
entry := map[string]interface{}{
    "@name": "test-ip",
    "@location": "device-group",
    "@device-group": "Production",
    "ip-netmask": "192.0.2.1",
}
```

---

## Error Handling Reference

### Common Error Codes

| Code | Description                | Resolution                                       |
| ---- | -------------------------- | ------------------------------------------------ |
| 3    | Missing required parameter | Add `@name` and `@location` to both URL and body |
| 7    | Object already exists      | Use PUT for updates or choose different name     |
| 10   | Invalid JSON syntax        | Validate JSON structure                          |
| 12   | Object not found           | Verify name and location parameters              |
| 13   | Invalid API version        | Check PAN-OS version compatibility               |
| 19   | Action not supported       | Use XML API for unsupported operations           |
| 20   | Invalid location           | Verify device-group/template exists              |

### Error Response Format

```json
{
  "@status": "error",
  "@code": "3",
  "result": {
    "message": "Invalid query parameter: missing required field '@name'"
  }
}
```

---

## Common Workflow Patterns

### Pattern 1: Block Threat IP

```
1. POST /Objects/Addresses (create address object)
2. POST /Policies/SecurityPreRules (create deny rule)
3. XML API: Commit to Panorama
4. Wait for job completion
5. XML API: Push to device group
6. Wait for job completion
```

### Pattern 2: Bulk Object Creation

```
1. Loop: POST /Objects/Addresses (create each object)
2. POST /Objects/AddressGroups (group all objects)
3. POST /Policies/SecurityPreRules (reference group)
4. Single commit + push operation
```

### Pattern 3: Idempotent Update

```go
func EnsureAddressObject(c *Client, dg, name, ip string) error {
    _, err := c.GetAddressObject(dg, name)
    if err != nil {
        // Object doesn't exist, create it
        return c.CreateAddressObject(dg, name, ip, "", nil)
    }
    // Object exists, update it
    return c.UpdateAddressObject(dg, name, ip, "", nil)
}
```

---

## Performance Best Practices

1. **Limit concurrent calls:** Maximum 5 concurrent API requests
2. **Batch commits:** Group changes, commit once
3. **Use address groups:** Reference groups in rules, not individual objects
4. **Connection reuse:** Use persistent HTTP connections
5. **Exponential backoff:** For job status polling (2s, 4s, 8s, 16s, 30s max)
6. **Cache device groups:** Cache infrequently changing data (5-minute TTL)

---

## Related Files

- `authentication.md` - Authentication patterns and API key management
- `xml-api-reference.md` - XML API for commit operations
- `../examples/` - Complete implementation examples
