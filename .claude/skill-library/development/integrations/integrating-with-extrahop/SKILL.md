---
name: integrating-with-extrahop
description: Use when integrating with ExtraHop APIs (REST API, RevealX 360), authentication (API keys, OAuth tokens), devices, detections, metrics, and activity maps - comprehensive patterns for secure ExtraHop NDR integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with ExtraHop

**Comprehensive guide for integrating with ExtraHop's REST APIs for network detection and response (NDR), device discovery, detections, metrics extraction, and activity maps.**

## Prerequisites

- ExtraHop sensor or console access (or RevealX 360 cloud subscription)
- API key (on-premise) or REST API credentials (RevealX 360)
- Understanding of network security concepts (devices, protocols, detections)
- API rate limit awareness (varies by deployment type)

## When to Use

Use this skill when:

- Building ExtraHop integrations (device discovery, detection sync, metrics export)
- Choosing authentication method (API Key vs OAuth/OIDC for RevealX 360)
- Implementing pagination for large device/detection datasets
- Extracting metrics for performance monitoring
- Creating activity maps for network visualization
- Handling ExtraHop webhooks/alert notifications

## Quick Reference

| Operation          | Method            | Best Practice                                   |
| ------------------ | ----------------- | ----------------------------------------------- |
| Authentication     | API Key           | Use for on-premise; OIDC tokens for RevealX 360 |
| Device Discovery   | GET /devices      | Use `limit` and `offset` for pagination         |
| Detections         | GET /detections   | Filter by `mod_time` for incremental sync       |
| Metrics Extraction | POST /metrics     | Specify `metric_specs` to reduce payload size   |
| Activity Maps      | GET /activitymaps | Use for network visualization                   |
| Rate Limiting      | Check response    | Implement exponential backoff on 429 errors     |

## ExtraHop Product Variants

| Product          | Deployment   | API Base URL                                      | Authentication   |
| ---------------- | ------------ | ------------------------------------------------- | ---------------- |
| ExtraHop Sensor  | On-premise   | `https://<hostname>/api/v1/`                      | API Key          |
| ExtraHop Console | On-premise   | `https://<hostname>/api/v1/`                      | API Key          |
| RevealX 360      | Cloud (SaaS) | `https://<region>.api.cloud.extrahop.com/api/v1/` | OAuth/OIDC Token |
| ExtraHop Explore | On-premise   | `https://<hostname>/api/v1/explore/`              | API Key          |
| ExtraHop Trace   | On-premise   | `https://<hostname>/api/v1/packets/`              | API Key          |

## Authentication Methods

### API Key Authentication (On-Premise)

For on-premise ExtraHop systems (sensors, consoles):

```bash
curl -i -X GET \
  --header "Accept: application/json" \
  --header "Authorization: ExtraHop apikey=YOUR_API_KEY" \
  "https://<hostname>/api/v1/extrahop"
```

**Go Implementation:**

```go
func (c *Client) authenticateOnPremise(req *http.Request) {
    req.Header.Set("Authorization", fmt.Sprintf("ExtraHop apikey=%s", c.apiKey))
    req.Header.Set("Accept", "application/json")
}
```

### OAuth/OIDC Token Authentication (RevealX 360)

For RevealX 360 cloud deployments:

**Step 1: Generate Access Token**

```bash
curl -X POST "https://<region>.api.cloud.extrahop.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 600
}
```

**Step 2: Use Token in Requests**

```bash
curl -X GET "https://<region>.api.cloud.extrahop.com/api/v1/devices" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Token Expiration**: Tokens are valid for 10 minutes (600 seconds). Implement token refresh before expiration.

**See:** [references/authentication-patterns.md](references/authentication-patterns.md) for complete implementation.

## API Resources

### Devices Resource

Discover and manage network devices.

| Operation           | Method                       | Description                           |
| ------------------- | ---------------------------- | ------------------------------------- |
| List Devices        | `GET /devices`               | Retrieve all devices with pagination  |
| Search Devices      | `POST /devices/search`       | Search by IP, MAC, name, role, vendor |
| Get Device          | `GET /devices/{id}`          | Retrieve specific device by ID        |
| Get Device Activity | `GET /devices/{id}/activity` | Get protocol activity for a device    |
| Tag Device          | `POST /devices/{id}/tags`    | Apply custom tags to a device         |

**Search Example:**

```go
type DeviceSearchRequest struct {
    Filter       DeviceFilter `json:"filter,omitempty"`
    ActiveFrom   int64        `json:"active_from,omitempty"`
    ActiveUntil  int64        `json:"active_until,omitempty"`
    Limit        int          `json:"limit,omitempty"`
    Offset       int          `json:"offset,omitempty"`
    Sort         []SortSpec   `json:"sort,omitempty"`
}

type DeviceFilter struct {
    Field    string      `json:"field"`
    Operator string      `json:"operator"`
    Value    interface{} `json:"value"`
}
```

**See:** [references/devices-api.md](references/devices-api.md) for complete device operations.

### Detections Resource

Retrieve security detections and threat information.

| Operation           | Method                       | Description                         |
| ------------------- | ---------------------------- | ----------------------------------- |
| List Detections     | `GET /detections`            | Retrieve detections with pagination |
| Get Detection       | `GET /detections/{id}`       | Retrieve specific detection by ID   |
| Update Detection    | `PATCH /detections/{id}`     | Update detection status/notes       |
| Get Detection Notes | `GET /detections/{id}/notes` | Retrieve investigation notes        |

**Pagination Parameters:**

```
limit:  Maximum 200 per request (default: 200)
offset: Skip N detections for pagination
sort:   Sort by field (risk_score, mod_time, etc.)
```

**Filter Example:**

```go
type DetectionFilter struct {
    From        int64    `json:"from,omitempty"`         // Unix timestamp
    Until       int64    `json:"until,omitempty"`        // Unix timestamp
    Limit       int      `json:"limit,omitempty"`        // Max 200
    Offset      int      `json:"offset,omitempty"`
    ModTime     int64    `json:"mod_time,omitempty"`     // For incremental sync
    Categories  []string `json:"categories,omitempty"`   // Filter by category
    Status      string   `json:"status,omitempty"`       // open, acknowledged, closed
}
```

**See:** [references/detections-api.md](references/detections-api.md) for detection categories and filtering.

### Metrics Resource

Extract performance and protocol metrics.

| Operation          | Method                      | Description                      |
| ------------------ | --------------------------- | -------------------------------- |
| Query Metrics      | `POST /metrics`             | Extract metrics for objects      |
| Get Metric Catalog | `GET /metrics/catalog`      | List available metric types      |
| Get Total Values   | `POST /metrics/totalvalues` | Aggregate metrics across objects |

**Metric Query Structure:**

```go
type MetricQuery struct {
    Cycle          string       `json:"cycle"`           // 30sec, 5min, 1hr, 24hr
    From           int64        `json:"from"`            // Unix timestamp (ms)
    Until          int64        `json:"until"`           // Unix timestamp (ms)
    MetricCategory string       `json:"metric_category"` // net, http, dns, etc.
    ObjectType     string       `json:"object_type"`     // device, application, etc.
    ObjectIDs      []int64      `json:"object_ids"`
    MetricSpecs    []MetricSpec `json:"metric_specs"`
}

type MetricSpec struct {
    Name string `json:"name"`  // e.g., "bytes_in", "rsp_time"
}
```

**See:** [references/metrics-api.md](references/metrics-api.md) for metric categories and extraction patterns.

### Activity Maps Resource

Generate network visualization maps.

| Operation           | Method                      | Description                       |
| ------------------- | --------------------------- | --------------------------------- |
| List Activity Maps  | `GET /activitymaps`         | Retrieve all saved activity maps  |
| Create Activity Map | `POST /activitymaps`        | Create new activity map           |
| Get Activity Map    | `GET /activitymaps/{id}`    | Retrieve specific activity map    |
| Update Activity Map | `PATCH /activitymaps/{id}`  | Update activity map configuration |
| Delete Activity Map | `DELETE /activitymaps/{id}` | Delete activity map               |

**See:** [references/activitymaps-api.md](references/activitymaps-api.md) for activity map creation.

### Alerts Resource

Configure and manage alert rules.

| Operation    | Method                | Description                       |
| ------------ | --------------------- | --------------------------------- |
| List Alerts  | `GET /alerts`         | Retrieve all alert configurations |
| Create Alert | `POST /alerts`        | Create new alert rule             |
| Get Alert    | `GET /alerts/{id}`    | Retrieve specific alert           |
| Update Alert | `PATCH /alerts/{id}`  | Update alert configuration        |
| Delete Alert | `DELETE /alerts/{id}` | Delete alert rule                 |

**Note:** Trend alerts cannot be configured through the REST API.

### Device Groups Resource

Organize devices into logical groups.

| Operation           | Method                           | Description                    |
| ------------------- | -------------------------------- | ------------------------------ |
| List Device Groups  | `GET /devicegroups`              | Retrieve all device groups     |
| Create Device Group | `POST /devicegroups`             | Create new device group        |
| Get Device Group    | `GET /devicegroups/{id}`         | Retrieve specific device group |
| Update Device Group | `PATCH /devicegroups/{id}`       | Update device group            |
| Get Group Devices   | `GET /devicegroups/{id}/devices` | List devices in group          |

### Networks Resource

Retrieve network configuration.

| Operation          | Method                      | Description                      |
| ------------------ | --------------------------- | -------------------------------- |
| List Networks      | `GET /networks`             | Retrieve all configured networks |
| Get Network        | `GET /networks/{id}`        | Retrieve specific network        |
| Get Network Alerts | `GET /networks/{id}/alerts` | Get alerts for a network         |

### Applications Resource

Manage application definitions for metrics collection.

| Operation          | Method                            | Description                           |
| ------------------ | --------------------------------- | ------------------------------------- |
| List Applications  | `GET /applications`               | Retrieve all applications             |
| Create Application | `POST /applications`              | Create new application                |
| Get Application    | `GET /applications/{id}`          | Retrieve specific application         |
| Get App Activity   | `GET /applications/{id}/activity` | Get protocol activity for application |

## Pagination Strategy

ExtraHop APIs use offset-based pagination with a maximum of 200 items per request.

```go
func (c *Client) FetchAllDevices(ctx context.Context) ([]Device, error) {
    var allDevices []Device
    offset := 0
    limit := 200

    for {
        params := url.Values{}
        params.Set("limit", strconv.Itoa(limit))
        params.Set("offset", strconv.Itoa(offset))

        devices, err := c.fetchDevicesPage(ctx, params)
        if err != nil {
            return nil, fmt.Errorf("fetch page offset=%d: %w", offset, err)
        }

        allDevices = append(allDevices, devices...)

        if len(devices) < limit {
            break // Last page
        }
        offset += limit
    }

    return allDevices, nil
}
```

**See:** [references/pagination-patterns.md](references/pagination-patterns.md) for pagination strategies.

## Rate Limiting

ExtraHop API rate limits vary by deployment type. Implement exponential backoff on 429 errors.

```go
func (c *Client) requestWithRetry(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
    maxRetries := 3
    baseDelay := time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        resp, err := c.doRequest(ctx, method, path, body)
        if err != nil {
            return nil, err
        }

        if resp.StatusCode == http.StatusTooManyRequests {
            delay := baseDelay * time.Duration(1<<attempt)
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(delay):
                continue
            }
        }

        return resp, nil
    }

    return nil, fmt.Errorf("max retries exceeded")
}
```

## Error Handling

| Status Code | Meaning             | Action                                   |
| ----------- | ------------------- | ---------------------------------------- |
| 400         | Bad Request         | Check request body/parameters            |
| 401         | Unauthorized        | Refresh token (RevealX 360) or check key |
| 403         | Forbidden           | Check API permissions                    |
| 404         | Not Found           | Verify resource exists                   |
| 429         | Rate Limit Exceeded | Implement exponential backoff            |
| 500/502/503 | Server Error        | Retry with exponential backoff           |

## Chariot Integration Pattern

For Chariot backend integration:

```go
package extrahop

import (
    "github.com/praetorian-inc/chariot/backend/pkg/tasks/base"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

type Extrahop struct {
    Job    model.Job
    Asset  model.Integration
    Filter model.Filter
    client *ExtraHopClient
    base.BaseCapability
}

func (task *Extrahop) Invoke() error {
    if err := task.ValidateCredentials(); err != nil {
        return err
    }

    // Fetch devices
    devices, err := task.client.FetchAllDevices(task.Job.Context())
    if err != nil {
        return fmt.Errorf("fetch devices: %w", err)
    }

    for _, device := range devices {
        if device.IPAddr == "" && device.Macaddr == "" {
            continue // Skip devices without identifiers
        }

        // Create asset for device
        asset := model.NewAsset("extrahop-device", device.IPAddr)
        asset.Name = device.DisplayName
        asset.AddAttribute("mac", device.Macaddr)
        asset.AddAttribute("vendor", device.Vendor)
        asset.AddAttribute("role", device.Role)

        // Check affiliation
        if affiliated, err := task.CheckAffiliation(asset); err != nil || !affiliated {
            continue
        }

        // Apply VM filter
        if !task.Filter.Include(asset) {
            continue
        }

        task.Job.Send(&asset)
    }

    return nil
}
```

## Common Use Cases

### Device Discovery Integration

```go
// Fetch devices and convert to Chariot assets
func (i *Integration) SyncDevices() error {
    devices, err := i.client.FetchAllDevices(ctx)
    if err != nil {
        return err
    }

    for _, d := range devices {
        asset := convertToAsset(d)
        i.Job.Send(&asset)
    }
    return nil
}
```

### Detection Sync Integration

```go
// Sync detections as Chariot risks
func (i *Integration) SyncDetections(since time.Time) error {
    detections, err := i.client.FetchDetections(ctx, since)
    if err != nil {
        return err
    }

    for _, d := range detections {
        risk := convertToRisk(d)
        i.Job.Send(&risk)
    }
    return nil
}
```

### Metrics Export

```go
// Export HTTP metrics for a device
func (i *Integration) ExportMetrics(deviceID int64, from, until time.Time) error {
    query := MetricQuery{
        Cycle:          "5min",
        From:           from.UnixMilli(),
        Until:          until.UnixMilli(),
        MetricCategory: "http",
        ObjectType:     "device",
        ObjectIDs:      []int64{deviceID},
        MetricSpecs:    []MetricSpec{{Name: "rsp_time"}, {Name: "req"}},
    }

    metrics, err := i.client.QueryMetrics(ctx, query)
    if err != nil {
        return err
    }

    // Process metrics...
    return nil
}
```

## Security Best Practices

1. **Token Storage**: Use secrets management (AWS Secrets Manager, HashiCorp Vault)
2. **Least Privilege**: Request minimum required API permissions
3. **HTTPS Only**: All API calls must use HTTPS
4. **Token Rotation**: Rotate API keys every 90 days for on-premise
5. **Audit Logging**: Log all API calls for security monitoring
6. **Rate Limit Handling**: Implement proper backoff to avoid lockout

## References

- [references/authentication-patterns.md](references/authentication-patterns.md) - API key and OAuth token patterns
- [references/devices-api.md](references/devices-api.md) - Complete device operations
- [references/detections-api.md](references/detections-api.md) - Detection categories and filtering
- [references/metrics-api.md](references/metrics-api.md) - Metric extraction patterns
- [references/activitymaps-api.md](references/activitymaps-api.md) - Activity map operations
- [references/pagination-patterns.md](references/pagination-patterns.md) - Pagination strategies
- [references/chariot-integration.md](references/chariot-integration.md) - Chariot-specific patterns

## External Documentation

- **ExtraHop REST API Guide**: https://docs.extrahop.com/current/rest-api-guide/
- **RevealX 360 REST API Guide**: https://docs.extrahop.com/current/rx360-rest-api/
- **ExtraHop Explore API Guide**: https://docs.extrahop.com/current/exa-rest-api-guide/
- **ExtraHop Code Examples**: https://github.com/ExtraHop/code-examples

## Related Skills

- `developing-integrations` - Chariot integration development patterns
- `validating-integrations` - P0 compliance verification
- `testing-integrations` - Integration testing patterns

## Integration

### Called By

- `orchestrating-integration-development` (Phase 3-4)
- Integration development when building ExtraHop connector

### Requires (invoke before starting)

None - this is a reference skill providing API documentation

### Pairs With (conditional)

| Skill                     | Trigger                      | Purpose                       |
| ------------------------- | ---------------------------- | ----------------------------- |
| `developing-integrations` | Building Chariot integration | P0 compliance patterns        |
| `validating-integrations` | Before review phase          | Verify implementation quality |
| `testing-integrations`    | Test development             | Mock server patterns          |
