# Panorama Device Management

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Panorama manages firewalls through device groups (for policies/objects) and templates (for network/device configuration). Understanding this hierarchy is essential for proper integration architecture.

## Quick Reference

### Management Hierarchy

```
Panorama
├── Device Groups (Policies & Objects)
│   ├── Parent Device Group
│   │   └── Child Device Group
│   └── Shared (Global objects)
└── Template Stacks (Network Config)
    ├── Template Stack
    │   ├── Template 1 (Higher priority)
    │   └── Template 2 (Lower priority)
    └── Templates
```

### API Endpoints

| Resource        | REST API                  | Purpose                   |
| --------------- | ------------------------- | ------------------------- |
| Device Groups   | `/Devices/DeviceGroups`   | Policy/object inheritance |
| Templates       | `/Devices/Templates`      | Network configuration     |
| Template Stacks | `/Devices/TemplateStacks` | Template composition      |
| Managed Devices | `/Devices/ManagedDevices` | Firewall inventory        |

## Device Groups

### Concept

Device groups organize firewalls for centralized policy management:

- **Policies**: Pre-rules and post-rules apply to all devices in the group
- **Objects**: Address objects, services, etc. are inherited
- **Hierarchy**: Child groups inherit from parent groups

### Create Device Group

**REST API:**

```bash
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Devices/DeviceGroups?name=Production-DG' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Production-DG",
      "description": "Production firewall device group"
    }]
  }'
```

**XML API:**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=set&xpath=/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production-DG']&element=<entry name='Production-DG'><description>Production firewall device group</description></entry>&key=$KEY"
```

### Create Child Device Group

```bash
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Devices/DeviceGroups?name=Production-Web-DG' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Production-Web-DG",
      "description": "Web tier firewalls",
      "parent-dg": "Production-DG"
    }]
  }'
```

### List Device Groups

```bash
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Devices/DeviceGroups' \
  -H 'X-PAN-KEY: YOUR_API_KEY'
```

## Templates and Template Stacks

### Templates

Templates define network configuration (interfaces, zones, routing):

```bash
# Create template
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Devices/Templates?name=Base-Network-TPL' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Base-Network-TPL",
      "description": "Base network configuration"
    }]
  }'
```

### Template Stacks

Template stacks combine multiple templates with priority:

```bash
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Devices/TemplateStacks?name=Production-Stack' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Production-Stack",
      "description": "Production template stack",
      "templates": {
        "member": ["Site-Specific-TPL", "Base-Network-TPL"]
      }
    }]
  }'
```

## Managed Devices

### List Managed Firewalls

```bash
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Devices/ManagedDevices' \
  -H 'X-PAN-KEY: YOUR_API_KEY'
```

### Get Device Status (XML API)

```bash
curl -k -g "https://<panorama>/api/?type=op&cmd=<show><devices><all></all></devices></show>&key=$KEY"
```

**Response includes:**

- Serial number
- Hostname
- IP address
- Connection status
- Software version
- Device group membership
- Template stack assignment

## Go Implementation

### Device Group Types

```go
package panorama

// DeviceGroup represents a Panorama device group
type DeviceGroup struct {
    Name        string `json:"@name" xml:"name,attr"`
    Description string `json:"description,omitempty" xml:"description,omitempty"`
    ParentDG    string `json:"parent-dg,omitempty" xml:"parent-dg,omitempty"`
    Devices     []Device `json:"-" xml:"-"` // Populated separately
}

// Template represents a Panorama template
type Template struct {
    Name        string `json:"@name" xml:"name,attr"`
    Description string `json:"description,omitempty" xml:"description,omitempty"`
}

// TemplateStack represents a Panorama template stack
type TemplateStack struct {
    Name        string   `json:"@name" xml:"name,attr"`
    Description string   `json:"description,omitempty" xml:"description,omitempty"`
    Templates   []string `json:"-" xml:"-"` // Template names in priority order
}

// ManagedDevice represents a firewall managed by Panorama
type ManagedDevice struct {
    Serial         string `json:"serial" xml:"serial"`
    Hostname       string `json:"hostname" xml:"hostname"`
    IPAddress      string `json:"ip-address" xml:"ip-address"`
    Connected      string `json:"connected" xml:"connected"`
    SWVersion      string `json:"sw-version" xml:"sw-version"`
    DeviceGroup    string `json:"device-group" xml:"device-group"`
    TemplateStack  string `json:"template-stack" xml:"template-stack"`
    Model          string `json:"model" xml:"model"`
    HAState        string `json:"ha-state,omitempty" xml:"ha-state,omitempty"`
    OperationalMode string `json:"operational-mode" xml:"operational-mode"`
}
```

### Device Group Operations

```go
// CreateDeviceGroup creates a new device group
func (c *Client) CreateDeviceGroup(ctx context.Context, dg *DeviceGroup) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Devices/DeviceGroups", c.baseURL)

    body := map[string]interface{}{
        "entry": []map[string]interface{}{
            {
                "@name":       dg.Name,
                "description": dg.Description,
            },
        },
    }

    if dg.ParentDG != "" {
        body["entry"].([]map[string]interface{})[0]["parent-dg"] = dg.ParentDG
    }

    jsonBody, err := json.Marshal(body)
    if err != nil {
        return err
    }

    req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBody))
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("name", dg.Name)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return c.parseResponse(resp)
}

// ListDeviceGroups retrieves all device groups
func (c *Client) ListDeviceGroups(ctx context.Context) ([]DeviceGroup, error) {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Devices/DeviceGroups", c.baseURL)

    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Entry []DeviceGroup `json:"entry"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Entry, nil
}

// GetDeviceGroup retrieves a specific device group
func (c *Client) GetDeviceGroup(ctx context.Context, name string) (*DeviceGroup, error) {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Devices/DeviceGroups", c.baseURL)

    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    q := req.URL.Query()
    q.Set("name", name)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Entry []DeviceGroup `json:"entry"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    if len(result.Entry) == 0 {
        return nil, ErrNotFound
    }

    return &result.Entry[0], nil
}

// DeleteDeviceGroup removes a device group
func (c *Client) DeleteDeviceGroup(ctx context.Context, name string) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Devices/DeviceGroups", c.baseURL)

    req, err := http.NewRequestWithContext(ctx, "DELETE", endpoint, nil)
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("name", name)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return c.parseResponse(resp)
}
```

### Managed Device Operations

```go
// ListManagedDevices retrieves all managed firewalls
func (c *Client) ListManagedDevices(ctx context.Context) ([]ManagedDevice, error) {
    // Use XML API for comprehensive device info
    cmd := "<show><devices><all></all></devices></show>"

    params := url.Values{
        "type": {"op"},
        "cmd":  {cmd},
        "key":  {c.apiKey},
    }

    resp, err := c.makeXMLRequest(ctx, params)
    if err != nil {
        return nil, err
    }

    // Parse XML response
    var result struct {
        Result struct {
            Devices struct {
                Entry []ManagedDevice `xml:"entry"`
            } `xml:"devices"`
        } `xml:"result"`
    }

    if err := xml.Unmarshal(resp, &result); err != nil {
        return nil, err
    }

    return result.Result.Devices.Entry, nil
}

// GetDeviceBySerial retrieves a specific device
func (c *Client) GetDeviceBySerial(ctx context.Context, serial string) (*ManagedDevice, error) {
    devices, err := c.ListManagedDevices(ctx)
    if err != nil {
        return nil, err
    }

    for _, d := range devices {
        if d.Serial == serial {
            return &d, nil
        }
    }

    return nil, ErrNotFound
}

// GetDevicesByGroup retrieves devices in a device group
func (c *Client) GetDevicesByGroup(ctx context.Context, deviceGroup string) ([]ManagedDevice, error) {
    devices, err := c.ListManagedDevices(ctx)
    if err != nil {
        return nil, err
    }

    var result []ManagedDevice
    for _, d := range devices {
        if d.DeviceGroup == deviceGroup {
            result = append(result, d)
        }
    }

    return result, nil
}
```

### Template Stack Operations

```go
// CreateTemplateStack creates a new template stack
func (c *Client) CreateTemplateStack(ctx context.Context, stack *TemplateStack) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Devices/TemplateStacks", c.baseURL)

    body := map[string]interface{}{
        "entry": []map[string]interface{}{
            {
                "@name":       stack.Name,
                "description": stack.Description,
                "templates": map[string]interface{}{
                    "member": stack.Templates,
                },
            },
        },
    }

    jsonBody, err := json.Marshal(body)
    if err != nil {
        return err
    }

    req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBody))
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("name", stack.Name)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return c.parseResponse(resp)
}

// AssignDeviceToGroup assigns a firewall to a device group
func (c *Client) AssignDeviceToGroup(ctx context.Context, serial, deviceGroup string) error {
    xpath := fmt.Sprintf(
        "/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='%s']/devices",
        deviceGroup,
    )

    element := fmt.Sprintf("<entry name='%s'/>", serial)

    params := url.Values{
        "type":    {"config"},
        "action":  {"set"},
        "xpath":   {xpath},
        "element": {element},
        "key":     {c.apiKey},
    }

    _, err := c.makeXMLRequest(ctx, params)
    return err
}

// AssignTemplateStack assigns a template stack to a device
func (c *Client) AssignTemplateStack(ctx context.Context, serial, templateStack string) error {
    xpath := fmt.Sprintf(
        "/config/devices/entry[@name='localhost.localdomain']/template-stack/entry[@name='%s']/devices",
        templateStack,
    )

    element := fmt.Sprintf("<entry name='%s'/>", serial)

    params := url.Values{
        "type":    {"config"},
        "action":  {"set"},
        "xpath":   {xpath},
        "element": {element},
        "key":     {c.apiKey},
    }

    _, err := c.makeXMLRequest(ctx, params)
    return err
}
```

## Chariot Integration Patterns

### Multi-Tenant Device Group Mapping

```go
// TenantMapping maps Chariot accounts to Panorama device groups
type TenantMapping struct {
    ChariotAccountKey string
    DeviceGroup       string
    TemplateStack     string
}

// GetOrCreateDeviceGroup ensures device group exists for tenant
func (s *SyncService) GetOrCreateDeviceGroup(ctx context.Context, accountKey string) (string, error) {
    dgName := fmt.Sprintf("chariot-%s", accountKey[:8])

    // Check if exists
    _, err := s.panoramaClient.GetDeviceGroup(ctx, dgName)
    if err == nil {
        return dgName, nil
    }

    if !errors.Is(err, ErrNotFound) {
        return "", err
    }

    // Create new device group
    dg := &DeviceGroup{
        Name:        dgName,
        Description: fmt.Sprintf("Chariot tenant: %s", accountKey),
        ParentDG:    s.parentDeviceGroup, // Inherit from master DG
    }

    if err := s.panoramaClient.CreateDeviceGroup(ctx, dg); err != nil {
        return "", err
    }

    return dgName, nil
}
```

### Device Inventory Sync

```go
// SyncDeviceInventory updates Chariot with Panorama device information
func (s *SyncService) SyncDeviceInventory(ctx context.Context) error {
    devices, err := s.panoramaClient.ListManagedDevices(ctx)
    if err != nil {
        return err
    }

    for _, device := range devices {
        // Create Chariot asset for each managed firewall
        asset := chariot.Asset{
            DNS:         device.IPAddress,
            Name:        device.Hostname,
            Class:       "firewall",
            Source:      "panorama-integration",
            Attributes: map[string]string{
                "serial":         device.Serial,
                "model":          device.Model,
                "sw_version":     device.SWVersion,
                "device_group":   device.DeviceGroup,
                "template_stack": device.TemplateStack,
                "ha_state":       device.HAState,
                "connected":      device.Connected,
            },
        }

        if err := s.chariotClient.UpsertAsset(ctx, &asset); err != nil {
            return fmt.Errorf("sync device %s: %w", device.Serial, err)
        }
    }

    return nil
}
```

### Device Health Monitoring

```go
// MonitorDeviceHealth checks device connectivity and alerts
func (s *SyncService) MonitorDeviceHealth(ctx context.Context) error {
    devices, err := s.panoramaClient.ListManagedDevices(ctx)
    if err != nil {
        return err
    }

    for _, device := range devices {
        if device.Connected != "yes" {
            // Create Chariot risk for disconnected device
            risk := chariot.Risk{
                Name:     fmt.Sprintf("Firewall %s disconnected from Panorama", device.Hostname),
                Severity: "high",
                Source:   "panorama-integration",
                AssetKey: s.getAssetKeyForDevice(device.Serial),
                Details: map[string]string{
                    "serial":      device.Serial,
                    "last_status": device.Connected,
                    "device_group": device.DeviceGroup,
                },
            }

            if err := s.chariotClient.CreateRisk(ctx, &risk); err != nil {
                return fmt.Errorf("create risk for %s: %w", device.Serial, err)
            }
        }
    }

    return nil
}
```

## Best Practices

1. **Plan hierarchy** - Design device group structure before implementation
2. **Use inheritance** - Put common objects/policies in parent groups
3. **Minimize local rules** - Prefer Panorama-managed pre/post rules
4. **Template layering** - Use template stacks for configuration reuse
5. **Document assignments** - Track device-to-group mappings
6. **Monitor connectivity** - Alert on disconnected devices

## Common Issues

| Issue                     | Cause                | Solution                      |
| ------------------------- | -------------------- | ----------------------------- |
| "Device not connected"    | Network/cert issue   | Check management connectivity |
| Can't delete device group | Contains devices     | Remove devices first          |
| Config not pushing        | Device disconnected  | Verify connectivity           |
| Template conflict         | Overlapping settings | Check template priority       |

## Related References

- [Security Policies](security-policies.md) - Policy management in device groups
- [Address Objects](address-objects.md) - Object inheritance
- [Commit Operations](commit-operations.md) - Push to device groups
- [API Reference](api-reference.md) - REST/XML API details
