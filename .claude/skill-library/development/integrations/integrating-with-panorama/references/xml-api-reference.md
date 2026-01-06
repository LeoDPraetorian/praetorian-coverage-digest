# Palo Alto Panorama XML API Complete Reference

**Last Updated:** January 2026
**Source:** Official PAN-OS documentation, pan.dev, and implementation patterns

---

## Quick Reference

The PAN-OS XML API provides comprehensive access to all firewall and Panorama configurations through tree-based XML structure with XPath node selection.

### API Request Structure

```
https://{host}/api/?type={type}&action={action}&xpath={xpath}&element={element}&key={api-key}
```

---

## Operation Types Reference

| Type        | Purpose              | Key Parameters          | Use Case                          |
| ----------- | -------------------- | ----------------------- | --------------------------------- |
| **config**  | Configuration CRUD   | action, xpath, element  | Create/read/update/delete objects |
| **op**      | Operational commands | cmd, target             | Runtime queries, diagnostics      |
| **commit**  | Commit changes       | cmd (commit/commit-all) | Apply pending changes             |
| **export**  | Export configuration | category                | Backup, migration                 |
| **import**  | Import configuration | category                | Restore, migration                |
| **user-id** | User-ID operations   | cmd                     | IP-to-user mapping                |
| **log**     | Log retrieval        | nlogs, query            | Audit, troubleshooting            |
| **report**  | Report generation    | reporttype, reportname  | Compliance, analytics             |

### Operation Type Details

#### config - Configuration Operations

```bash
# Read configuration
GET /api/?type=config&action=get&xpath=/config/...&key=API_KEY

# Modify configuration
GET /api/?type=config&action=set&xpath=/config/...&element=<xml>&key=API_KEY
```

#### op - Operational Commands

```bash
# Execute operational command
GET /api/?type=op&cmd=<show><system><info></info></system></show>&key=API_KEY

# Target specific firewall (from Panorama)
GET /api/?type=op&cmd=<cmd>&target=SERIAL_NUMBER&key=API_KEY
```

#### commit - Commit Operations

```bash
# Simple commit
GET /api/?type=commit&cmd=<commit></commit>&key=API_KEY

# Commit with description
GET /api/?type=commit&cmd=<commit><description>Change reason</description></commit>&key=API_KEY

# Commit-all (Panorama to managed devices)
GET /api/?type=commit&action=all&cmd=<commit-all><shared-policy><device-group><entry name="DG1"/></device-group></shared-policy></commit-all>&key=API_KEY
```

#### export/import - Configuration Backup

```bash
# Export running config
GET /api/?type=export&category=configuration&key=API_KEY

# Export named config
GET /api/?type=export&category=configuration&from=saved-config-name&key=API_KEY

# Import configuration
POST /api/?type=import&category=configuration&key=API_KEY
# (Include file in POST body)
```

#### user-id - User-ID Mapping

```bash
# Register IP-to-user mapping
GET /api/?type=user-id&cmd=<uid-message><payload><login><entry name="user@domain" ip="10.1.1.1"/></login></payload></uid-message>&key=API_KEY

# Unregister mapping
GET /api/?type=user-id&cmd=<uid-message><payload><logout><entry name="user@domain" ip="10.1.1.1"/></logout></payload></uid-message>&key=API_KEY
```

#### log - Log Retrieval

```bash
# Query traffic logs
GET /api/?type=log&log-type=traffic&nlogs=100&query=(addr.src in 10.0.0.0/8)&key=API_KEY

# Query threat logs
GET /api/?type=log&log-type=threat&nlogs=50&key=API_KEY
```

---

## Configuration Actions Reference

| Action           | Purpose                   | Requires Element | Key Parameters       |
| ---------------- | ------------------------- | ---------------- | -------------------- |
| **get**          | Retrieve candidate config | No               | xpath                |
| **show**         | Display running config    | No               | xpath                |
| **set**          | Create or replace object  | Yes              | xpath, element       |
| **edit**         | Update existing object    | Yes              | xpath, element       |
| **delete**       | Remove object             | No               | xpath                |
| **rename**       | Rename object             | No               | xpath, newname       |
| **move**         | Reorder rules             | No               | xpath, where, dst    |
| **clone**        | Duplicate object          | No               | xpath, from, newname |
| **override**     | Template override         | Yes              | xpath, element       |
| **multi-config** | Batch operations          | Yes              | element (XML batch)  |

### Action Details

#### get vs show

```bash
# get - Retrieves CANDIDATE configuration (uncommitted changes)
GET /api/?type=config&action=get&xpath=/config/devices/entry/vsys/entry[@name='vsys1']/address&key=API_KEY

# show - Retrieves RUNNING configuration (committed/active)
GET /api/?type=config&action=show&xpath=/config/devices/entry/vsys/entry[@name='vsys1']/address&key=API_KEY
```

#### set - Create or Replace

Creates a new object or replaces existing. Does NOT merge with existing content.

```bash
# Create address object
xpath="/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='web-server']"
element="<ip-netmask>192.168.1.10</ip-netmask><description>Web Server</description>"

GET /api/?type=config&action=set&xpath=$xpath&element=$element&key=API_KEY
```

#### edit - Partial Update

Updates specific elements within an existing object. Merges with existing content.

```bash
# Update only the description (preserves ip-netmask)
xpath="/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='web-server']"
element="<description>Updated description</description>"

GET /api/?type=config&action=edit&xpath=$xpath&element=$element&key=API_KEY
```

#### delete - Remove Object

```bash
# Delete address object
xpath="/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='web-server']"

GET /api/?type=config&action=delete&xpath=$xpath&key=API_KEY
```

#### rename - Rename Object

```bash
# Rename address object
xpath="/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='old-name']"
newname="new-name"

GET /api/?type=config&action=rename&xpath=$xpath&newname=$newname&key=API_KEY
```

#### move - Reorder Rules

```bash
# Move rule to top
xpath="/config/devices/entry/vsys/entry[@name='vsys1']/rulebase/security/rules/entry[@name='MyRule']"
GET /api/?type=config&action=move&xpath=$xpath&where=top&key=API_KEY

# Move rule before another
GET /api/?type=config&action=move&xpath=$xpath&where=before&dst=TargetRule&key=API_KEY

# Move rule after another
GET /api/?type=config&action=move&xpath=$xpath&where=after&dst=TargetRule&key=API_KEY

# Move rule to bottom
GET /api/?type=config&action=move&xpath=$xpath&where=bottom&key=API_KEY
```

#### clone - Duplicate Object

```bash
# Clone address object
xpath="/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address"
from="original-name"
newname="cloned-name"

GET /api/?type=config&action=clone&xpath=$xpath&from=$from&newname=$newname&key=API_KEY
```

---

## XPath Patterns Library

### Device Groups (Panorama)

```xpath
# All device groups
/config/devices/entry/device-group/entry

# Specific device group
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production-DG']

# Pre-rules for device group
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG1']/pre-rulebase/security/rules

# Post-rules for device group
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG1']/post-rulebase/security/rules

# Device group address objects
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG1']/address/entry[@name='server1']
```

### Shared Objects (Panorama)

```xpath
# Shared address objects
/config/shared/address/entry[@name='corporate-network']

# Shared address groups
/config/shared/address-group/entry[@name='internal-networks']

# Shared service objects
/config/shared/service/entry[@name='custom-app']

# Shared service groups
/config/shared/service-group/entry[@name='web-services']

# Shared application groups
/config/shared/application-group/entry[@name='allowed-apps']
```

### Virtual System Objects

```xpath
# Address objects in vsys
/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='web-server']

# All address objects (no specific name)
/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address

# Security rules
/config/devices/entry/vsys/entry[@name='vsys1']/rulebase/security/rules/entry[@name='Allow-Web']

# NAT rules
/config/devices/entry/vsys/entry[@name='vsys1']/rulebase/nat/rules/entry[@name='NAT-Rule-1']

# Zones
/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/zone/entry[@name='trust']
```

### Network Configuration

```xpath
# Ethernet interfaces
/config/devices/entry[@name='localhost.localdomain']/network/interface/ethernet/entry[@name='ethernet1/1']

# Virtual routers
/config/devices/entry[@name='localhost.localdomain']/network/virtual-router/entry[@name='default']

# IKE gateways
/config/devices/entry[@name='localhost.localdomain']/network/ike/gateway/entry[@name='ike-gw-1']

# IPSec tunnels
/config/devices/entry[@name='localhost.localdomain']/network/tunnel/ipsec/entry[@name='ipsec-tunnel-1']
```

### Templates and Template Stacks

```xpath
# Template configuration
/config/devices/entry[@name='localhost.localdomain']/template/entry[@name='BaseTemplate']

# Template stack
/config/devices/entry[@name='localhost.localdomain']/template-stack/entry[@name='Production-Stack']

# Template stack members
/config/devices/entry[@name='localhost.localdomain']/template-stack/entry[@name='Production-Stack']/templates
```

### Administrative Settings

```xpath
# Administrator accounts
/config/mgt-config/users/entry[@name='admin']

# Admin roles
/config/mgt-config/access-domain

# Device certificates
/config/shared/certificate/entry[@name='cert-name']

# Log forwarding profiles
/config/shared/log-settings/profiles/entry[@name='default']
```

---

## Multi-Config Batch Operations

Perform multiple configuration changes atomically in a single API call.

### Request Format

```bash
GET /api/?type=config&action=multi-config&element=<request>...</request>&key=API_KEY
```

### Batch XML Structure

```xml
<request>
  <set>
    <xpath>/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='server1']</xpath>
    <element><ip-netmask>10.1.1.10</ip-netmask></element>
  </set>
  <set>
    <xpath>/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='server2']</xpath>
    <element><ip-netmask>10.1.1.11</ip-netmask></element>
  </set>
  <delete>
    <xpath>/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='old-server']</xpath>
  </delete>
  <edit>
    <xpath>/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='existing-server']</xpath>
    <element><description>Updated via batch</description></element>
  </edit>
</request>
```

### Go Implementation for Batch Operations

```go
type MultiConfigRequest struct {
    XMLName xml.Name         `xml:"request"`
    Sets    []SetOperation   `xml:"set,omitempty"`
    Edits   []EditOperation  `xml:"edit,omitempty"`
    Deletes []DeleteOperation `xml:"delete,omitempty"`
}

type SetOperation struct {
    XPath   string `xml:"xpath"`
    Element string `xml:"element"`
}

type EditOperation struct {
    XPath   string `xml:"xpath"`
    Element string `xml:"element"`
}

type DeleteOperation struct {
    XPath string `xml:"xpath"`
}

func (c *Client) MultiConfig(req *MultiConfigRequest) error {
    xmlData, err := xml.Marshal(req)
    if err != nil {
        return fmt.Errorf("failed to marshal multi-config request: %w", err)
    }

    params := url.Values{
        "type":    []string{"config"},
        "action":  []string{"multi-config"},
        "element": []string{string(xmlData)},
        "key":     []string{c.APIKey},
    }

    _, err = c.makeRequest(params)
    return err
}

// Usage example
func batchCreateAddresses(client *Client, vsys string, addresses map[string]string) error {
    req := &MultiConfigRequest{}

    for name, ip := range addresses {
        xpath := fmt.Sprintf(
            "/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='%s']/address/entry[@name='%s']",
            vsys, name,
        )
        req.Sets = append(req.Sets, SetOperation{
            XPath:   xpath,
            Element: fmt.Sprintf("<ip-netmask>%s</ip-netmask>", ip),
        })
    }

    return client.MultiConfig(req)
}
```

---

## XML Response Parsing in Go

### Response Structure Types

```go
package panorama

import (
    "encoding/xml"
    "fmt"
)

// Response represents the standard PAN-OS API response
type Response struct {
    XMLName xml.Name `xml:"response"`
    Status  string   `xml:"status,attr"`
    Code    string   `xml:"code,attr,omitempty"`
    Result  Result   `xml:"result,omitempty"`
    Msg     *Message `xml:"msg,omitempty"`
}

// Result contains the response data
type Result struct {
    // Generic result content - use xml.Node for flexible parsing
    Content []byte `xml:",innerxml"`
    // Specific fields for common responses
    Job     string        `xml:"job,omitempty"`
    Entries []AddressEntry `xml:"entry,omitempty"`
}

// Message contains error information
type Message struct {
    Line string `xml:"line"`
}

// AddressEntry represents an address object
type AddressEntry struct {
    Name        string `xml:"name,attr"`
    IPNetmask   string `xml:"ip-netmask,omitempty"`
    IPRange     string `xml:"ip-range,omitempty"`
    FQDN        string `xml:"fqdn,omitempty"`
    Description string `xml:"description,omitempty"`
}

// SecurityRule represents a security policy rule
type SecurityRule struct {
    Name        string   `xml:"name,attr"`
    From        []string `xml:"from>member"`
    To          []string `xml:"to>member"`
    Source      []string `xml:"source>member"`
    Destination []string `xml:"destination>member"`
    Application []string `xml:"application>member"`
    Service     []string `xml:"service>member"`
    Action      string   `xml:"action"`
    Disabled    string   `xml:"disabled,omitempty"`
    Description string   `xml:"description,omitempty"`
}
```

### Generic Response Parser

```go
// ParseResponse parses an XML API response and checks for errors
func ParseResponse(data []byte) (*Response, error) {
    var resp Response
    if err := xml.Unmarshal(data, &resp); err != nil {
        return nil, fmt.Errorf("failed to parse XML response: %w", err)
    }

    if resp.Status == "error" {
        errMsg := "unknown error"
        if resp.Msg != nil {
            errMsg = resp.Msg.Line
        }
        return nil, &APIError{
            Code:    resp.Code,
            Message: errMsg,
        }
    }

    return &resp, nil
}

// APIError represents a PAN-OS API error
type APIError struct {
    Code    string
    Message string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("API error %s: %s", e.Code, e.Message)
}
```

### Parsing Address Objects

```go
// AddressListResponse for parsing address list responses
type AddressListResponse struct {
    XMLName xml.Name `xml:"response"`
    Status  string   `xml:"status,attr"`
    Result  struct {
        Address struct {
            Entries []AddressEntry `xml:"entry"`
        } `xml:"address"`
    } `xml:"result"`
}

func (c *Client) GetAddresses(vsys string) ([]AddressEntry, error) {
    xpath := fmt.Sprintf(
        "/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='%s']/address",
        vsys,
    )

    data, err := c.Get(xpath)
    if err != nil {
        return nil, err
    }

    var resp AddressListResponse
    if err := xml.Unmarshal(data, &resp); err != nil {
        return nil, fmt.Errorf("failed to parse address list: %w", err)
    }

    return resp.Result.Address.Entries, nil
}
```

### Parsing Security Rules

```go
// SecurityRulesResponse for parsing security rule responses
type SecurityRulesResponse struct {
    XMLName xml.Name `xml:"response"`
    Status  string   `xml:"status,attr"`
    Result  struct {
        Rules struct {
            Entries []SecurityRule `xml:"entry"`
        } `xml:"rules"`
    } `xml:"result"`
}

func (c *Client) GetSecurityRules(vsys string) ([]SecurityRule, error) {
    xpath := fmt.Sprintf(
        "/config/devices/entry/vsys/entry[@name='%s']/rulebase/security/rules",
        vsys,
    )

    data, err := c.Get(xpath)
    if err != nil {
        return nil, err
    }

    var resp SecurityRulesResponse
    if err := xml.Unmarshal(data, &resp); err != nil {
        return nil, fmt.Errorf("failed to parse security rules: %w", err)
    }

    return resp.Result.Rules.Entries, nil
}
```

### Parsing Commit Job Status

```go
// JobStatusResponse for parsing job status responses
type JobStatusResponse struct {
    XMLName xml.Name `xml:"response"`
    Status  string   `xml:"status,attr"`
    Result  struct {
        Job struct {
            ID       string `xml:"id"`
            Type     string `xml:"type"`
            Status   string `xml:"status"`   // ACT = Active, FIN = Finished
            Result   string `xml:"result"`   // PEND, OK, FAIL
            Progress string `xml:"progress"` // 0-100
            Details  struct {
                Line string `xml:"line"`
            } `xml:"details"`
        } `xml:"job"`
    } `xml:"result"`
}

func (c *Client) WaitForJob(jobID string, timeout time.Duration) error {
    start := time.Now()

    for time.Since(start) < timeout {
        cmd := fmt.Sprintf("<show><jobs><id>%s</id></jobs></show>", jobID)
        data, err := c.Op(cmd, "")
        if err != nil {
            return err
        }

        var resp JobStatusResponse
        if err := xml.Unmarshal(data, &resp); err != nil {
            return fmt.Errorf("failed to parse job status: %w", err)
        }

        switch resp.Result.Job.Status {
        case "FIN":
            if resp.Result.Job.Result == "OK" {
                return nil
            }
            return fmt.Errorf("job failed: %s", resp.Result.Job.Details.Line)
        case "ACT":
            // Still running, continue polling
            time.Sleep(2 * time.Second)
        default:
            return fmt.Errorf("unexpected job status: %s", resp.Result.Job.Status)
        }
    }

    return fmt.Errorf("job timeout after %v", timeout)
}
```

---

## Common Operational Commands

### System Information

```bash
# Show system info
cmd=<show><system><info></info></system></show>

# Show system resources
cmd=<show><system><resources></resources></system></show>

# Show high availability state
cmd=<show><high-availability><state></state></high-availability></show>
```

### Interface and Network

```bash
# Show all interfaces
cmd=<show><interface>all</interface></show>

# Show routing table
cmd=<show><routing><route></route></routing></show>

# Show ARP table
cmd=<show><arp><entry name='all'/></arp></show>
```

### Security and Policy

```bash
# Test security policy match
cmd=<test><security-policy-match><source>10.1.1.1</source><destination>8.8.8.8</destination><protocol>6</protocol><destination-port>443</destination-port></security-policy-match></test>

# Show rule hit counts
cmd=<show><rule-hit-count><vsys><vsys-name><entry name='vsys1'><rule-base><entry name='security'><rules><all></all></rules></entry></rule-base></entry></vsys-name></vsys></rule-hit-count></show>

# Show registered IPs (DAG state)
cmd=<show><object><registered-ip><all></all></registered-ip></object></show>
```

### Sessions and Traffic

```bash
# Show active sessions
cmd=<show><session><all></all></session></show>

# Show session by ID
cmd=<show><session><id>12345</id></session></show>

# Show traffic counters
cmd=<show><counter><global></global></counter></show>
```

---

## Error Codes Reference

| Code | Meaning              | Resolution                                      |
| ---- | -------------------- | ----------------------------------------------- |
| 1    | Unknown command      | Verify type/action parameters                   |
| 6    | Bad XPath            | Validate XPath syntax and structure             |
| 7    | Object not present   | Object doesn't exist - check before edit/delete |
| 12   | Object doesn't exist | Referenced object not found                     |
| 13   | Object not unique    | Duplicate name - use unique names               |
| 14   | Internal error       | System error - retry later                      |
| 16   | Reference not zero   | Remove all references before deleting           |
| 17   | Invalid object       | Object format/content invalid                   |
| 19   | Command succeeded    | Success (informational)                         |
| 20   | Command succeeded    | Success with modification                       |
| 22   | Session timed out    | Refresh API key                                 |

---

## Best Practices

1. **Use API Keys** - Generate dedicated API keys instead of username/password
2. **Use API Browser** - Navigate to `https://[firewall]/api` for XPath discovery
3. **Validate Before Commit** - Always run validation before committing changes
4. **Monitor Commit Jobs** - Poll job status until completion
5. **Implement Idempotency** - Design operations to be safely repeatable
6. **Handle Errors Gracefully** - Distinguish retryable vs non-retryable errors
7. **Use Shared Objects** - Prefer shared objects for better reusability
8. **Enable Debug Mode** - Use `debug cli on` to see API equivalents (dev only)
9. **Use Target Parameter** - Direct Panorama operations to specific firewalls
10. **Log All Operations** - Maintain audit trail of API operations

---

## Related Files

- `../SKILL.md` - Main Panorama integration skill
- `./authentication.md` - API key generation and management
- `./commit-operations.md` - Detailed commit workflow patterns
- `./error-handling.md` - Error handling strategies

## Research Source Files

For additional implementation details and examples, see:

- `.claude/.output/research/2026-01-03-165242-panorama-api-complete/perplexity-xml-api-catalog.md` (55KB comprehensive guide)
- `.claude/.output/research/2026-01-03-165242-panorama-api-complete/03-action-types.md` (43KB action reference)
- `.claude/.output/research/2026-01-03-165242-panorama-api-complete/06-response-parsing.md` (Response parsing patterns)
