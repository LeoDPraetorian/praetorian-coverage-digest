# Panorama Address Objects

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Address objects are fundamental building blocks for security policies in PAN-OS. They define IP addresses, networks, FQDNs, and ranges that can be referenced in rules. This guide covers CRUD operations, grouping, dynamic address objects, and Chariot integration patterns.

## Quick Reference

### Address Object Types

| Type          | Format        | Example                     |
| ------------- | ------------- | --------------------------- |
| `ip-netmask`  | IP/CIDR       | `192.168.1.0/24`            |
| `ip-range`    | Start-End     | `192.168.1.1-192.168.1.100` |
| `ip-wildcard` | Wildcard mask | `10.20.1.0/0.0.248.255`     |
| `fqdn`        | Domain name   | `www.example.com`           |

### API Endpoints

| Operation | REST API                           | XML API                                    |
| --------- | ---------------------------------- | ------------------------------------------ |
| List      | `GET /Objects/Addresses`           | `action=get&xpath=.../address`             |
| Create    | `POST /Objects/Addresses`          | `action=set&xpath=...&element=...`         |
| Update    | `PUT /Objects/Addresses`           | `action=edit&xpath=...&element=...`        |
| Delete    | `DELETE /Objects/Addresses?name=X` | `action=delete&xpath=.../entry[@name='X']` |

## Address Object Operations

### Create Address Object

**REST API:**

```bash
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&name=web-server-01' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "web-server-01",
      "ip-netmask": "10.0.1.100/32",
      "description": "Production web server",
      "tag": {
        "member": ["production", "web"]
      }
    }]
  }'
```

**XML API:**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=set&xpath=/config/shared/address/entry[@name='web-server-01']&element=<entry name='web-server-01'><ip-netmask>10.0.1.100/32</ip-netmask><description>Production web server</description><tag><member>production</member><member>web</member></tag></entry>&key=$KEY"
```

### List Address Objects

**REST API:**

```bash
# List all shared addresses
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared' \
  -H 'X-PAN-KEY: YOUR_API_KEY'

# List with pagination
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&offset=0&limit=100' \
  -H 'X-PAN-KEY: YOUR_API_KEY'

# Get specific address
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&name=web-server-01' \
  -H 'X-PAN-KEY: YOUR_API_KEY'
```

**XML API:**

```bash
# List all shared addresses
curl -k -g "https://<panorama>/api/?type=config&action=get&xpath=/config/shared/address&key=$KEY"

# Get specific address
curl -k -g "https://<panorama>/api/?type=config&action=get&xpath=/config/shared/address/entry[@name='web-server-01']&key=$KEY"
```

### Update Address Object

**REST API:**

```bash
curl -k -X PUT \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&name=web-server-01' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "web-server-01",
      "ip-netmask": "10.0.1.101/32",
      "description": "Updated web server IP"
    }]
  }'
```

**XML API (edit action):**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=edit&xpath=/config/shared/address/entry[@name='web-server-01']/ip-netmask&element=<ip-netmask>10.0.1.101/32</ip-netmask>&key=$KEY"
```

### Delete Address Object

**REST API:**

```bash
curl -k -X DELETE \
  'https://<panorama>/restapi/v11.0/Objects/Addresses?location=shared&name=web-server-01' \
  -H 'X-PAN-KEY: YOUR_API_KEY'
```

**XML API:**

```bash
curl -k -g "https://<panorama>/api/?type=config&action=delete&xpath=/config/shared/address/entry[@name='web-server-01']&key=$KEY"
```

## Go Implementation

### Address Object Types

```go
package panorama

// AddressObject represents a PAN-OS address object
type AddressObject struct {
    Name        string   `json:"@name" xml:"name,attr"`
    IPNetmask   string   `json:"ip-netmask,omitempty" xml:"ip-netmask,omitempty"`
    IPRange     string   `json:"ip-range,omitempty" xml:"ip-range,omitempty"`
    IPWildcard  string   `json:"ip-wildcard,omitempty" xml:"ip-wildcard,omitempty"`
    FQDN        string   `json:"fqdn,omitempty" xml:"fqdn,omitempty"`
    Description string   `json:"description,omitempty" xml:"description,omitempty"`
    Tags        []string `json:"-" xml:"-"` // Handled separately
}

// AddressObjectRequest wraps address for API requests
type AddressObjectRequest struct {
    Entry []AddressObject `json:"entry"`
}

// Validate checks if the address object is valid
func (a *AddressObject) Validate() error {
    if a.Name == "" {
        return errors.New("name is required")
    }

    // Must have exactly one address type
    types := 0
    if a.IPNetmask != "" {
        types++
    }
    if a.IPRange != "" {
        types++
    }
    if a.IPWildcard != "" {
        types++
    }
    if a.FQDN != "" {
        types++
    }

    if types != 1 {
        return errors.New("exactly one address type required")
    }

    return nil
}

// Type returns the address type
func (a *AddressObject) Type() string {
    switch {
    case a.IPNetmask != "":
        return "ip-netmask"
    case a.IPRange != "":
        return "ip-range"
    case a.IPWildcard != "":
        return "ip-wildcard"
    case a.FQDN != "":
        return "fqdn"
    default:
        return "unknown"
    }
}

// Value returns the address value
func (a *AddressObject) Value() string {
    switch {
    case a.IPNetmask != "":
        return a.IPNetmask
    case a.IPRange != "":
        return a.IPRange
    case a.IPWildcard != "":
        return a.IPWildcard
    case a.FQDN != "":
        return a.FQDN
    default:
        return ""
    }
}
```

### CRUD Operations

```go
package panorama

import (
    "context"
    "encoding/json"
    "fmt"
    "net/url"
)

// CreateAddress creates a new address object
func (c *Client) CreateAddress(ctx context.Context, location string, addr *AddressObject) error {
    if err := addr.Validate(); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    // REST API approach
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/Addresses", c.baseURL)

    body, err := json.Marshal(AddressObjectRequest{
        Entry: []AddressObject{*addr},
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
    q.Set("name", addr.Name)
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

// GetAddress retrieves an address object by name
func (c *Client) GetAddress(ctx context.Context, location, name string) (*AddressObject, error) {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/Addresses", c.baseURL)

    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    q := req.URL.Query()
    q.Set("location", location)
    q.Set("name", name)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Entry []AddressObject `json:"entry"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    if len(result.Entry) == 0 {
        return nil, ErrNotFound
    }

    return &result.Entry[0], nil
}

// ListAddresses retrieves all address objects
func (c *Client) ListAddresses(ctx context.Context, location string) ([]AddressObject, error) {
    var allAddresses []AddressObject
    offset := 0
    limit := 100

    for {
        endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/Addresses", c.baseURL)

        req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
        if err != nil {
            return nil, err
        }

        q := req.URL.Query()
        q.Set("location", location)
        q.Set("offset", strconv.Itoa(offset))
        q.Set("limit", strconv.Itoa(limit))
        req.URL.RawQuery = q.Encode()

        req.Header.Set("X-PAN-KEY", c.apiKey)

        resp, err := c.httpClient.Do(req)
        if err != nil {
            return nil, err
        }

        var result struct {
            TotalCount string          `json:"@total-count"`
            Entry      []AddressObject `json:"entry"`
        }

        if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
            resp.Body.Close()
            return nil, err
        }
        resp.Body.Close()

        allAddresses = append(allAddresses, result.Entry...)

        totalCount, _ := strconv.Atoi(result.TotalCount)
        if len(allAddresses) >= totalCount || len(result.Entry) < limit {
            break
        }

        offset += limit
    }

    return allAddresses, nil
}

// UpdateAddress updates an existing address object
func (c *Client) UpdateAddress(ctx context.Context, location string, addr *AddressObject) error {
    if err := addr.Validate(); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/Addresses", c.baseURL)

    body, err := json.Marshal(AddressObjectRequest{
        Entry: []AddressObject{*addr},
    })
    if err != nil {
        return err
    }

    req, err := http.NewRequestWithContext(ctx, "PUT", endpoint, bytes.NewReader(body))
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("location", location)
    q.Set("name", addr.Name)
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

// DeleteAddress removes an address object
func (c *Client) DeleteAddress(ctx context.Context, location, name string) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/Addresses", c.baseURL)

    req, err := http.NewRequestWithContext(ctx, "DELETE", endpoint, nil)
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("location", location)
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

## Address Groups

### Create Address Group

```go
// AddressGroup represents a group of address objects
type AddressGroup struct {
    Name        string   `json:"@name" xml:"name,attr"`
    Description string   `json:"description,omitempty" xml:"description,omitempty"`
    Static      []string `json:"-" xml:"-"` // Static member list
    Dynamic     string   `json:"-" xml:"-"` // Dynamic filter expression
    Tags        []string `json:"-" xml:"-"`
}

// CreateAddressGroup creates a static address group
func (c *Client) CreateAddressGroup(ctx context.Context, location string, group *AddressGroup) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/AddressGroups", c.baseURL)

    body := map[string]interface{}{
        "entry": []map[string]interface{}{
            {
                "@name":       group.Name,
                "description": group.Description,
                "static": map[string]interface{}{
                    "member": group.Static,
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
    q.Set("location", location)
    q.Set("name", group.Name)
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
```

### Dynamic Address Groups

Dynamic address groups use tag-based filters:

```go
// CreateDynamicAddressGroup creates a tag-based dynamic group
func (c *Client) CreateDynamicAddressGroup(ctx context.Context, location string, name, filter string) error {
    // Filter examples:
    // 'production' and 'web'
    // 'dmz' or 'external'
    // 'app-server' and not 'deprecated'

    endpoint := fmt.Sprintf("%s/restapi/v11.0/Objects/AddressGroups", c.baseURL)

    body := map[string]interface{}{
        "entry": []map[string]interface{}{
            {
                "@name": name,
                "dynamic": map[string]interface{}{
                    "filter": filter,
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
    q.Set("location", location)
    q.Set("name", name)
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
```

## Chariot Integration Patterns

### Sync Chariot Assets to Panorama

```go
// SyncChariotAssets creates address objects from Chariot discovered assets
func (s *SyncService) SyncChariotAssets(ctx context.Context, assets []chariot.Asset) error {
    for _, asset := range assets {
        // Skip non-IP assets
        if asset.Class != "ipv4" && asset.Class != "ipv6" {
            continue
        }

        addr := &AddressObject{
            Name:        s.generateAddressName(asset),
            IPNetmask:   asset.DNS + "/32",
            Description: fmt.Sprintf("Chariot asset: %s", asset.Key),
        }

        // Check if exists
        existing, err := s.panoramaClient.GetAddress(ctx, "shared", addr.Name)
        if err == nil && existing != nil {
            // Update if changed
            if existing.IPNetmask != addr.IPNetmask {
                if err := s.panoramaClient.UpdateAddress(ctx, "shared", addr); err != nil {
                    return fmt.Errorf("update %s failed: %w", addr.Name, err)
                }
            }
        } else {
            // Create new
            if err := s.panoramaClient.CreateAddress(ctx, "shared", addr); err != nil {
                return fmt.Errorf("create %s failed: %w", addr.Name, err)
            }
        }
    }

    return nil
}

func (s *SyncService) generateAddressName(asset chariot.Asset) string {
    // Create deterministic name from asset key
    // Example: chariot-asset-a1b2c3d4
    hash := sha256.Sum256([]byte(asset.Key))
    return fmt.Sprintf("chariot-asset-%s", hex.EncodeToString(hash[:8]))
}
```

### Bulk Address Creation

```go
// BulkCreateAddresses creates multiple addresses efficiently
func (c *Client) BulkCreateAddresses(ctx context.Context, location string, addresses []AddressObject) error {
    const batchSize = 100

    for i := 0; i < len(addresses); i += batchSize {
        end := i + batchSize
        if end > len(addresses) {
            end = len(addresses)
        }

        batch := addresses[i:end]

        // Use XML API multi-config for efficiency
        var multiConfig strings.Builder
        multiConfig.WriteString("<multi-config>")

        for j, addr := range batch {
            xpath := fmt.Sprintf("/config/%s/address/entry[@name='%s']",
                locationToXPath(location), addr.Name)

            element := fmt.Sprintf(`<entry name="%s"><%s>%s</%s>`,
                addr.Name, addr.Type(), addr.Value(), addr.Type())

            if addr.Description != "" {
                element += fmt.Sprintf(`<description>%s</description>`, addr.Description)
            }
            element += `</entry>`

            multiConfig.WriteString(fmt.Sprintf(
                `<entry-%d><type>config</type><action>set</action><xpath>%s</xpath><element>%s</element></entry-%d>`,
                j, xpath, element, j,
            ))
        }

        multiConfig.WriteString("</multi-config>")

        params := url.Values{
            "type":    {"multi-config"},
            "element": {multiConfig.String()},
            "key":     {c.apiKey},
        }

        if _, err := c.makeXMLRequest(ctx, params); err != nil {
            return fmt.Errorf("batch %d-%d failed: %w", i, end, err)
        }
    }

    return nil
}
```

## Best Practices

1. **Use meaningful names** - Include purpose and owner in name
2. **Tag consistently** - Enable dynamic groups with proper tagging
3. **Prefer shared objects** - Reduces duplication across device groups
4. **Validate before create** - Check IP format and uniqueness
5. **Batch operations** - Use multi-config for bulk creates
6. **Handle references** - Can't delete objects in use by policies

## Common Issues

| Issue                           | Cause          | Solution                     |
| ------------------------------- | -------------- | ---------------------------- |
| "Object not unique"             | Duplicate name | Use unique naming convention |
| "Reference count not zero"      | Object in use  | Remove from policies first   |
| "Invalid object"                | Bad IP format  | Validate CIDR/range syntax   |
| Create succeeds but not visible | Wrong location | Check device-group vs shared |

## Related References

- [Security Policies](security-policies.md) - Using addresses in rules
- [API Reference](api-reference.md) - REST/XML API details
- [Commit Operations](commit-operations.md) - Applying changes
