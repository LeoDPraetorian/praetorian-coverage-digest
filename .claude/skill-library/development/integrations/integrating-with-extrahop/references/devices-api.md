# ExtraHop Devices API

## Overview

The Devices API enables discovery and management of network devices detected by ExtraHop sensors. Devices include clients, servers, routers, load balancers, gateways, and any other network-connected endpoints.

## Endpoints

### List Devices

```
GET /api/v1/devices
```

**Query Parameters:**

| Parameter      | Type   | Description                                     |
| -------------- | ------ | ----------------------------------------------- |
| `limit`        | int    | Maximum devices to return (default: 1000)       |
| `offset`       | int    | Number of devices to skip for pagination        |
| `active_from`  | int    | Unix timestamp - devices active since this time |
| `active_until` | int    | Unix timestamp - devices active until this time |
| `search_type`  | string | Type of search (e.g., "any")                    |

**Example:**

```bash
curl -X GET "https://extrahop/api/v1/devices?limit=200&offset=0" \
  -H "Authorization: ExtraHop apikey=YOUR_KEY"
```

### Search Devices

```
POST /api/v1/devices/search
```

**Request Body:**

```json
{
  "filter": {
    "field": "ipaddr",
    "operator": "=",
    "value": "192.168.1.100"
  },
  "active_from": 1609459200000,
  "active_until": 0,
  "limit": 200,
  "offset": 0,
  "sort": [
    {
      "direction": "desc",
      "field": "mod_time"
    }
  ]
}
```

**Filter Operators:**

| Operator     | Description                   |
| ------------ | ----------------------------- |
| `=`          | Equals                        |
| `!=`         | Not equals                    |
| `~`          | Contains (string fields)      |
| `!~`         | Does not contain              |
| `startswith` | Starts with                   |
| `>`          | Greater than (numeric fields) |
| `<`          | Less than                     |
| `>=`         | Greater than or equal         |
| `<=`         | Less than or equal            |

**Filterable Fields:**

| Field           | Type   | Description                           |
| --------------- | ------ | ------------------------------------- |
| `ipaddr`        | string | IPv4 or IPv6 address                  |
| `macaddr`       | string | MAC address                           |
| `name`          | string | Device name                           |
| `display_name`  | string | Friendly display name                 |
| `vendor`        | string | Hardware vendor                       |
| `role`          | string | Device role (client, server, gateway) |
| `software`      | string | Operating system/software             |
| `tag`           | string | Custom tag                            |
| `vlan`          | int    | VLAN ID                               |
| `activity`      | string | Protocol activity type                |
| `discover_time` | int    | Unix timestamp of first discovery     |
| `mod_time`      | int    | Unix timestamp of last modification   |

### Get Device

```
GET /api/v1/devices/{id}
```

**Response:**

```json
{
  "id": 12345,
  "display_name": "web-server-01",
  "ipaddr4": "192.168.1.100",
  "ipaddr6": null,
  "macaddr": "00:1A:2B:3C:4D:5E",
  "vendor": "VMware",
  "role": "server",
  "device_class": "node",
  "analysis": "advanced",
  "analysis_level": 2,
  "auto_role": true,
  "cloud_instance_type": null,
  "critical": false,
  "custom_criticality": null,
  "custom_make": null,
  "custom_model": null,
  "custom_name": null,
  "custom_type": null,
  "default_name": "VMware Virtual Machine",
  "description": "",
  "discover_time": 1609459200000,
  "extrahop_id": "abc123def456",
  "is_l3": true,
  "mod_time": 1640995200000,
  "on_watchlist": false,
  "parent_id": null,
  "user_mod_time": 1640995200000,
  "vlans": [10, 20]
}
```

### Get Device Activity

```
GET /api/v1/devices/{id}/activity
```

Returns protocol activity for a device.

**Response:**

```json
{
  "client_protocols": ["HTTP", "HTTPS", "DNS", "NTP"],
  "server_protocols": ["HTTP", "HTTPS"]
}
```

### Tag Device

```
POST /api/v1/devices/{id}/tags
```

**Request Body:**

```json
{
  "tag": "production"
}
```

### Get Device Peers

```
GET /api/v1/devices/{id}/peers
```

**Query Parameters:**

| Parameter     | Type   | Description                         |
| ------------- | ------ | ----------------------------------- |
| `query_from`  | int    | Start of query period (Unix ms)     |
| `query_until` | int    | End of query period (Unix ms)       |
| `protocol`    | string | Filter by protocol (e.g., "HTTP")   |
| `peer_role`   | string | Filter by peer role (client/server) |

## Go Implementation

```go
package extrahop

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strconv"
)

type Device struct {
    ID              int64    `json:"id"`
    DisplayName     string   `json:"display_name"`
    IPAddr4         string   `json:"ipaddr4"`
    IPAddr6         string   `json:"ipaddr6"`
    Macaddr         string   `json:"macaddr"`
    Vendor          string   `json:"vendor"`
    Role            string   `json:"role"`
    DeviceClass     string   `json:"device_class"`
    Analysis        string   `json:"analysis"`
    AnalysisLevel   int      `json:"analysis_level"`
    Critical        bool     `json:"critical"`
    DiscoverTime    int64    `json:"discover_time"`
    ModTime         int64    `json:"mod_time"`
    OnWatchlist     bool     `json:"on_watchlist"`
    VLANs           []int    `json:"vlans"`
    ExtraHopID      string   `json:"extrahop_id"`
}

type DeviceSearchRequest struct {
    Filter      *DeviceFilter `json:"filter,omitempty"`
    ActiveFrom  int64         `json:"active_from,omitempty"`
    ActiveUntil int64         `json:"active_until,omitempty"`
    Limit       int           `json:"limit,omitempty"`
    Offset      int           `json:"offset,omitempty"`
    Sort        []SortSpec    `json:"sort,omitempty"`
}

type DeviceFilter struct {
    Field    string      `json:"field"`
    Operator string      `json:"operator"`
    Value    interface{} `json:"value"`
}

type SortSpec struct {
    Field     string `json:"field"`
    Direction string `json:"direction"` // "asc" or "desc"
}

type DeviceActivity struct {
    ClientProtocols []string `json:"client_protocols"`
    ServerProtocols []string `json:"server_protocols"`
}

func (c *Client) ListDevices(ctx context.Context, limit, offset int) ([]Device, error) {
    params := url.Values{}
    params.Set("limit", strconv.Itoa(limit))
    params.Set("offset", strconv.Itoa(offset))

    resp, err := c.doRequest(ctx, http.MethodGet, "/api/v1/devices?"+params.Encode(), nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var devices []Device
    if err := json.NewDecoder(resp.Body).Decode(&devices); err != nil {
        return nil, fmt.Errorf("decode devices: %w", err)
    }

    return devices, nil
}

func (c *Client) SearchDevices(ctx context.Context, req *DeviceSearchRequest) ([]Device, error) {
    body, err := json.Marshal(req)
    if err != nil {
        return nil, fmt.Errorf("marshal request: %w", err)
    }

    resp, err := c.doRequest(ctx, http.MethodPost, "/api/v1/devices/search", bytes.NewReader(body))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var devices []Device
    if err := json.NewDecoder(resp.Body).Decode(&devices); err != nil {
        return nil, fmt.Errorf("decode devices: %w", err)
    }

    return devices, nil
}

func (c *Client) GetDevice(ctx context.Context, id int64) (*Device, error) {
    path := fmt.Sprintf("/api/v1/devices/%d", id)
    resp, err := c.doRequest(ctx, http.MethodGet, path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var device Device
    if err := json.NewDecoder(resp.Body).Decode(&device); err != nil {
        return nil, fmt.Errorf("decode device: %w", err)
    }

    return &device, nil
}

func (c *Client) GetDeviceActivity(ctx context.Context, id int64) (*DeviceActivity, error) {
    path := fmt.Sprintf("/api/v1/devices/%d/activity", id)
    resp, err := c.doRequest(ctx, http.MethodGet, path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var activity DeviceActivity
    if err := json.NewDecoder(resp.Body).Decode(&activity); err != nil {
        return nil, fmt.Errorf("decode activity: %w", err)
    }

    return &activity, nil
}

// FetchAllDevices retrieves all devices with pagination
func (c *Client) FetchAllDevices(ctx context.Context) ([]Device, error) {
    var allDevices []Device
    offset := 0
    limit := 200

    for {
        devices, err := c.ListDevices(ctx, limit, offset)
        if err != nil {
            return nil, fmt.Errorf("fetch page offset=%d: %w", offset, err)
        }

        allDevices = append(allDevices, devices...)

        if len(devices) < limit {
            break
        }
        offset += limit
    }

    return allDevices, nil
}
```

## Device Analysis Levels

| Level | Name      | Description                                   |
| ----- | --------- | --------------------------------------------- |
| 0     | Discovery | Basic discovery only                          |
| 1     | Standard  | Standard analysis with limited metrics        |
| 2     | Advanced  | Full analysis with all metrics and detections |

## Device Roles

| Role     | Description                  |
| -------- | ---------------------------- |
| client   | Device initiates connections |
| server   | Device accepts connections   |
| gateway  | Network gateway or router    |
| dhcp     | DHCP server                  |
| dns      | DNS server                   |
| ntp      | NTP server                   |
| database | Database server              |
| file     | File server                  |
| mail     | Mail server                  |
| web      | Web server                   |
| other    | Other device type            |

## Converting to Chariot Assets

```go
func convertDeviceToAsset(device Device) model.Asset {
    // Use IP address as primary identifier, fall back to MAC
    value := device.IPAddr4
    class := "ipv4"
    if value == "" && device.IPAddr6 != "" {
        value = device.IPAddr6
        class = "ipv6"
    }
    if value == "" && device.Macaddr != "" {
        value = device.Macaddr
        class = "mac"
    }

    asset := model.NewAsset(class, value)
    asset.Name = device.DisplayName
    asset.Source = "extrahop"

    // Add attributes
    if device.Macaddr != "" {
        asset.AddAttribute("mac", device.Macaddr)
    }
    if device.Vendor != "" {
        asset.AddAttribute("vendor", device.Vendor)
    }
    if device.Role != "" {
        asset.AddAttribute("role", device.Role)
    }
    if device.Analysis != "" {
        asset.AddAttribute("analysis_level", device.Analysis)
    }
    if device.Critical {
        asset.AddAttribute("critical", "true")
    }
    if device.OnWatchlist {
        asset.AddAttribute("on_watchlist", "true")
    }

    return asset
}
```
