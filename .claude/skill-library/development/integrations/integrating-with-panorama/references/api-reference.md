# Panorama API Reference

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

PAN-OS provides two APIs: the XML API for comprehensive configuration access and the REST API for modern JSON-based operations. This reference covers common parameters, request formats, and response structures.

## API Selection Guide

| Criteria              | REST API    | XML API     |
| --------------------- | ----------- | ----------- |
| Configuration Changes | Limited     | Full        |
| Commit Operations     | ❌ No       | ✅ Required |
| Device Monitoring     | Excellent   | Good        |
| Ease of Use           | JSON-native | XML parsing |
| Feature Coverage      | Subset      | Complete    |
| Performance           | 2-3x faster | Baseline    |

**Recommendation:** Use REST API for reads, XML API for writes and commits.

## XML API Reference

### Base URL Format

```
https://<panorama-ip>/api/?type=<type>&<parameters>&key=<api-key>
```

### Operation Types

| Type      | Purpose              | Common Parameters       |
| --------- | -------------------- | ----------------------- |
| `config`  | Configuration CRUD   | action, xpath, element  |
| `op`      | Operational commands | cmd, target             |
| `commit`  | Commit changes       | cmd (commit/commit-all) |
| `export`  | Export configuration | category                |
| `import`  | Import configuration | category                |
| `user-id` | User-ID operations   | cmd                     |
| `log`     | Log retrieval        | nlogs, query            |
| `report`  | Report generation    | reporttype, reportname  |
| `keygen`  | Generate API key     | user, password          |

### Configuration Actions

| Action     | Purpose                | Requires Element      |
| ---------- | ---------------------- | --------------------- |
| `get`      | Retrieve configuration | No                    |
| `show`     | Display running config | No                    |
| `set`      | Create or replace      | Yes                   |
| `edit`     | Update existing        | Yes                   |
| `delete`   | Remove configuration   | No                    |
| `rename`   | Rename object          | newname parameter     |
| `move`     | Reorder rules          | where, dst parameters |
| `clone`    | Duplicate object       | from, newname         |
| `override` | Template override      | Yes                   |

### Common Query Parameters

| Parameter | Type   | Description          | Example                  |
| --------- | ------ | -------------------- | ------------------------ |
| `type`    | string | Operation type       | `config`, `op`, `commit` |
| `action`  | string | Config action        | `get`, `set`, `delete`   |
| `xpath`   | string | Configuration path   | `/config/shared/address` |
| `element` | string | XML payload          | `<entry name="...">`     |
| `key`     | string | API key              | `LUFRPT...`              |
| `target`  | string | Target device serial | `007951000123456`        |

### XPath Quick Reference

**Shared Objects (Panorama):**

```xpath
/config/shared/address/entry[@name='object-name']
/config/shared/address-group/entry[@name='group-name']
/config/shared/service/entry[@name='service-name']
```

**Device Group Configuration:**

```xpath
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG-Name']/pre-rulebase/security/rules
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG-Name']/post-rulebase/security/rules
```

**Template Configuration:**

```xpath
/config/devices/entry[@name='localhost.localdomain']/template/entry[@name='TPL-Name']
/config/devices/entry[@name='localhost.localdomain']/template-stack/entry[@name='Stack-Name']
```

**Virtual System (Firewall):**

```xpath
/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address
/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/rulebase/security/rules
```

### Request Examples

**Get Configuration:**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=get&xpath=/config/shared/address&key=$KEY"
```

**Set Configuration:**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=set&xpath=/config/shared/address/entry[@name='web-server']&element=<entry name='web-server'><ip-netmask>10.0.0.1/32</ip-netmask></entry>&key=$KEY"
```

**Operational Command:**

```bash
curl -k -g "https://<panorama>/api/?type=op&cmd=<show><system><info></info></system></show>&key=$KEY"
```

### Response Format

**Success Response:**

```xml
<response status="success" code="20">
  <result>
    <!-- Response data -->
  </result>
</response>
```

**Error Response:**

```xml
<response status="error" code="7">
  <result>
    <msg>Object doesn't exist</msg>
  </result>
</response>
```

### Response Codes

| Code | Status  | Meaning                           |
| ---- | ------- | --------------------------------- |
| 19   | Success | Command succeeded (with warnings) |
| 20   | Success | Command succeeded                 |
| 1    | Error   | Unknown command                   |
| 6    | Error   | Bad XPath                         |
| 7    | Error   | Object doesn't exist              |
| 8    | Error   | Object not unique                 |
| 10   | Error   | Reference count not zero          |
| 12   | Error   | Invalid object                    |
| 16   | Error   | Unauthorized                      |
| 22   | Error   | Session timed out                 |

## REST API Reference

### Base URL Format

```
https://<panorama-ip>/restapi/<version>/<Category>/<Resource>?<parameters>
```

### API Versions

| PAN-OS Version | REST API Version  |
| -------------- | ----------------- |
| 10.0.x         | `/restapi/v10.0/` |
| 10.1.x         | `/restapi/v10.1/` |
| 10.2.x         | `/restapi/v10.2/` |
| 11.0.x         | `/restapi/v11.0/` |
| 11.1.x         | `/restapi/v11.1/` |

### Endpoint Categories

| Category   | Base Path                     | Purpose                    |
| ---------- | ----------------------------- | -------------------------- |
| Objects    | `/restapi/v{ver}/Objects/`    | Address, service objects   |
| Policies   | `/restapi/v{ver}/Policies/`   | Security, NAT rules        |
| Network    | `/restapi/v{ver}/Network/`    | Interfaces, zones, routing |
| Devices    | `/restapi/v{ver}/Devices/`    | Device groups, templates   |
| System     | `/restapi/v{ver}/System/`     | Jobs, commits, admin       |
| Monitoring | `/restapi/v{ver}/Monitoring/` | Status, logs               |

### Authentication

**Header (Recommended):**

```
X-PAN-KEY: <api-key>
```

### Location Parameters

| Parameter        | Description         | Example                          |
| ---------------- | ------------------- | -------------------------------- |
| `location`       | Configuration scope | `shared`, `device-group`, `vsys` |
| `device-group`   | Device group name   | `Production-DG`                  |
| `vsys`           | Virtual system      | `vsys1`                          |
| `template`       | Template name       | `Base-TPL`                       |
| `template-stack` | Template stack      | `Prod-Stack`                     |

**Location Patterns:**

```
?location=shared
?location=device-group&device-group=Production-DG
?location=vsys&vsys=vsys1
?location=template&template=Base-TPL
```

### HTTP Methods

| Method | Purpose                 |
| ------ | ----------------------- |
| GET    | Retrieve resource(s)    |
| POST   | Create new resource     |
| PUT    | Replace resource        |
| PATCH  | Partial update (v11.0+) |
| DELETE | Remove resource         |

### Common Endpoints

**Objects:**

```
GET    /restapi/v11.0/Objects/Addresses
POST   /restapi/v11.0/Objects/Addresses
GET    /restapi/v11.0/Objects/Addresses?name=web-server
DELETE /restapi/v11.0/Objects/Addresses?name=web-server
```

**Policies:**

```
GET    /restapi/v11.0/Policies/SecurityPreRules?location=device-group&device-group=DG1
POST   /restapi/v11.0/Policies/SecurityPreRules?location=device-group&device-group=DG1
```

**System:**

```
GET    /restapi/v11.0/System/Jobs
GET    /restapi/v11.0/System/Jobs/{job-id}
```

### Request/Response Format

**Request Body (POST/PUT):**

```json
{
  "entry": [
    {
      "@name": "object-name",
      "field1": "value1",
      "field2": {
        "member": ["value2a", "value2b"]
      }
    }
  ]
}
```

**Success Response:**

```json
{
  "@status": "success",
  "@code": "20",
  "msg": "command succeeded"
}
```

**Error Response:**

```json
{
  "@status": "error",
  "@code": "7",
  "msg": "Object doesn't exist"
}
```

### Pagination

**Request:**

```
GET /restapi/v11.0/Objects/Addresses?location=shared&offset=0&limit=100
```

**Response includes:**

```json
{
  "@total-count": "523",
  "@count": "100",
  "entry": [...]
}
```

## Go Client Examples

### XML API Client

```go
package panorama

import (
    "context"
    "encoding/xml"
    "fmt"
    "net/url"
)

// Get retrieves configuration at xpath
func (c *Client) Get(ctx context.Context, xpath string) ([]byte, error) {
    params := url.Values{
        "type":   {"config"},
        "action": {"get"},
        "xpath":  {xpath},
        "key":    {c.APIKey},
    }
    return c.makeRequest(ctx, params)
}

// Set creates or replaces configuration
func (c *Client) Set(ctx context.Context, xpath, element string) error {
    params := url.Values{
        "type":    {"config"},
        "action":  {"set"},
        "xpath":   {xpath},
        "element": {element},
        "key":     {c.APIKey},
    }
    _, err := c.makeRequest(ctx, params)
    return err
}

// Delete removes configuration
func (c *Client) Delete(ctx context.Context, xpath string) error {
    params := url.Values{
        "type":   {"config"},
        "action": {"delete"},
        "xpath":  {xpath},
        "key":    {c.APIKey},
    }
    _, err := c.makeRequest(ctx, params)
    return err
}

// Op executes operational command
func (c *Client) Op(ctx context.Context, cmd string) ([]byte, error) {
    params := url.Values{
        "type": {"op"},
        "cmd":  {cmd},
        "key":  {c.APIKey},
    }
    return c.makeRequest(ctx, params)
}
```

### REST API Client

```go
package panorama

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
)

// RESTClient for REST API operations
type RESTClient struct {
    baseURL    string
    apiKey     string
    version    string
    httpClient *http.Client
}

func (c *RESTClient) GetObjects(ctx context.Context, objectType, location string, params map[string]string) ([]byte, error) {
    endpoint := fmt.Sprintf("%s/restapi/%s/Objects/%s", c.baseURL, c.version, objectType)

    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    q := req.URL.Query()
    q.Set("location", location)
    for k, v := range params {
        q.Set(k, v)
    }
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}

func (c *RESTClient) CreateObject(ctx context.Context, objectType, location string, object interface{}) error {
    endpoint := fmt.Sprintf("%s/restapi/%s/Objects/%s", c.baseURL, c.version, objectType)

    body, err := json.Marshal(map[string]interface{}{
        "entry": []interface{}{object},
    })
    if err != nil {
        return err
    }

    req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("location", location)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
    }

    return nil
}
```

## Interactive API Documentation

Access device-hosted documentation for complete reference:

```
https://<panorama-ip>/restapi-doc/
https://<panorama-ip>/api/
```

Features:

- Complete endpoint catalog
- Interactive Swagger interface
- Try-it-out functionality
- Version-specific schemas

## Related References

- [REST API Reference](rest-api-reference.md) - Detailed REST endpoints
- [XML API Reference](xml-api-reference.md) - Complete XML operations
- [Authentication](authentication.md) - API key management
- [Error Handling](error-handling.md) - Response code details
