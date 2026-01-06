# Panorama Security Policies

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Security policies (rules) are the core of PAN-OS firewall configuration. They define what traffic is allowed, denied, or inspected. Panorama manages policies through a hierarchical rulebase with pre-rules, local rules, and post-rules.

## Quick Reference

### Rule Hierarchy (Evaluation Order)

```
1. Pre-rules (Panorama)     - Evaluated first, admin-enforced
2. Local rules (Firewall)   - Device-specific rules
3. Post-rules (Panorama)    - Evaluated last, catch-all rules
```

### API Endpoints

| Rulebase    | REST API                      | XML API XPath                      |
| ----------- | ----------------------------- | ---------------------------------- |
| Pre-rules   | `/Policies/SecurityPreRules`  | `.../pre-rulebase/security/rules`  |
| Post-rules  | `/Policies/SecurityPostRules` | `.../post-rulebase/security/rules` |
| Local rules | `/Policies/SecurityRules`     | `.../rulebase/security/rules`      |

### Rule Actions

| Action         | Description             |
| -------------- | ----------------------- |
| `allow`        | Permit traffic          |
| `deny`         | Block traffic silently  |
| `drop`         | Block and don't respond |
| `reset-client` | Send RST to client      |
| `reset-server` | Send RST to server      |
| `reset-both`   | Send RST to both        |

## Security Rule Structure

### Rule Fields

| Field             | Required | Description                        |
| ----------------- | -------- | ---------------------------------- |
| `name`            | Yes      | Rule name (unique within rulebase) |
| `from`            | Yes      | Source zones                       |
| `to`              | Yes      | Destination zones                  |
| `source`          | Yes      | Source addresses/groups            |
| `destination`     | Yes      | Destination addresses/groups       |
| `application`     | Yes      | Applications or `any`              |
| `service`         | Yes      | Services or `application-default`  |
| `action`          | Yes      | allow/deny/drop/reset              |
| `disabled`        | No       | Rule enabled/disabled              |
| `log-start`       | No       | Log session start                  |
| `log-end`         | No       | Log session end                    |
| `profile-setting` | No       | Security profiles                  |
| `tag`             | No       | Rule tags                          |
| `description`     | No       | Rule description                   |

## Go Implementation

### Security Rule Types

```go
package panorama

// SecurityRule represents a PAN-OS security rule
type SecurityRule struct {
    Name            string          `json:"@name" xml:"name,attr"`
    From            Members         `json:"from" xml:"from"`
    To              Members         `json:"to" xml:"to"`
    Source          Members         `json:"source" xml:"source"`
    Destination     Members         `json:"destination" xml:"destination"`
    Application     Members         `json:"application" xml:"application"`
    Service         Members         `json:"service" xml:"service"`
    Action          string          `json:"action" xml:"action"`
    Disabled        string          `json:"disabled,omitempty" xml:"disabled,omitempty"`
    LogStart        string          `json:"log-start,omitempty" xml:"log-start,omitempty"`
    LogEnd          string          `json:"log-end,omitempty" xml:"log-end,omitempty"`
    LogSetting      string          `json:"log-setting,omitempty" xml:"log-setting,omitempty"`
    Description     string          `json:"description,omitempty" xml:"description,omitempty"`
    ProfileSetting  *ProfileSetting `json:"profile-setting,omitempty" xml:"profile-setting,omitempty"`
    Tag             Members         `json:"tag,omitempty" xml:"tag,omitempty"`
}

// Members represents a list of member values
type Members struct {
    Member []string `json:"member" xml:"member"`
}

// ProfileSetting defines security profile attachments
type ProfileSetting struct {
    Group    *Members          `json:"group,omitempty" xml:"group,omitempty"`
    Profiles *SecurityProfiles `json:"profiles,omitempty" xml:"profiles,omitempty"`
}

// SecurityProfiles defines individual profile types
type SecurityProfiles struct {
    Virus         *Members `json:"virus,omitempty" xml:"virus,omitempty"`
    Spyware       *Members `json:"spyware,omitempty" xml:"spyware,omitempty"`
    Vulnerability *Members `json:"vulnerability,omitempty" xml:"vulnerability,omitempty"`
    URLFiltering  *Members `json:"url-filtering,omitempty" xml:"url-filtering,omitempty"`
    FileBlocking  *Members `json:"file-blocking,omitempty" xml:"file-blocking,omitempty"`
    WildFire      *Members `json:"wildfire-analysis,omitempty" xml:"wildfire-analysis,omitempty"`
}

// NewSecurityRule creates a basic security rule
func NewSecurityRule(name string) *SecurityRule {
    return &SecurityRule{
        Name:        name,
        From:        Members{Member: []string{"any"}},
        To:          Members{Member: []string{"any"}},
        Source:      Members{Member: []string{"any"}},
        Destination: Members{Member: []string{"any"}},
        Application: Members{Member: []string{"any"}},
        Service:     Members{Member: []string{"application-default"}},
        Action:      "allow",
        LogEnd:      "yes",
    }
}

// WithZones sets source and destination zones
func (r *SecurityRule) WithZones(from, to []string) *SecurityRule {
    r.From = Members{Member: from}
    r.To = Members{Member: to}
    return r
}

// WithAddresses sets source and destination addresses
func (r *SecurityRule) WithAddresses(source, destination []string) *SecurityRule {
    r.Source = Members{Member: source}
    r.Destination = Members{Member: destination}
    return r
}

// WithApplications sets allowed applications
func (r *SecurityRule) WithApplications(apps []string) *SecurityRule {
    r.Application = Members{Member: apps}
    return r
}

// WithAction sets the rule action
func (r *SecurityRule) WithAction(action string) *SecurityRule {
    r.Action = action
    return r
}

// WithSecurityProfiles attaches security profiles
func (r *SecurityRule) WithSecurityProfiles(virus, spyware, vuln string) *SecurityRule {
    r.ProfileSetting = &ProfileSetting{
        Profiles: &SecurityProfiles{
            Virus:         &Members{Member: []string{virus}},
            Spyware:       &Members{Member: []string{spyware}},
            Vulnerability: &Members{Member: []string{vuln}},
        },
    }
    return r
}
```

### CRUD Operations

```go
// CreateSecurityRule creates a new security rule
func (c *Client) CreateSecurityRule(ctx context.Context, deviceGroup, rulebase string, rule *SecurityRule) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Policies/Security%sRules", c.baseURL, rulebase)

    body := map[string]interface{}{
        "entry": []interface{}{rule},
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
    q.Set("location", "device-group")
    q.Set("device-group", deviceGroup)
    q.Set("name", rule.Name)
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

// ListSecurityRules retrieves all rules in a rulebase
func (c *Client) ListSecurityRules(ctx context.Context, deviceGroup, rulebase string) ([]SecurityRule, error) {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Policies/Security%sRules", c.baseURL, rulebase)

    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    q := req.URL.Query()
    q.Set("location", "device-group")
    q.Set("device-group", deviceGroup)
    req.URL.RawQuery = q.Encode()

    req.Header.Set("X-PAN-KEY", c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Entry []SecurityRule `json:"entry"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Entry, nil
}

// DeleteSecurityRule removes a rule
func (c *Client) DeleteSecurityRule(ctx context.Context, deviceGroup, rulebase, name string) error {
    endpoint := fmt.Sprintf("%s/restapi/v11.0/Policies/Security%sRules", c.baseURL, rulebase)

    req, err := http.NewRequestWithContext(ctx, "DELETE", endpoint, nil)
    if err != nil {
        return err
    }

    q := req.URL.Query()
    q.Set("location", "device-group")
    q.Set("device-group", deviceGroup)
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

### Rule Movement

```go
// MoveRule changes rule position in rulebase
func (c *Client) MoveRule(ctx context.Context, deviceGroup, rulebase, ruleName, where, destination string) error {
    // where: "before", "after", "top", "bottom"
    // destination: target rule name (for before/after)

    xpath := fmt.Sprintf(
        "/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='%s']/%s-rulebase/security/rules/entry[@name='%s']",
        deviceGroup, rulebase, ruleName,
    )

    params := url.Values{
        "type":   {"config"},
        "action": {"move"},
        "xpath":  {xpath},
        "where":  {where},
        "key":    {c.apiKey},
    }

    if destination != "" && (where == "before" || where == "after") {
        params.Set("dst", destination)
    }

    _, err := c.makeXMLRequest(ctx, params)
    return err
}

// MoveRuleToTop moves rule to top of rulebase
func (c *Client) MoveRuleToTop(ctx context.Context, deviceGroup, rulebase, ruleName string) error {
    return c.MoveRule(ctx, deviceGroup, rulebase, ruleName, "top", "")
}

// MoveRuleToBottom moves rule to bottom of rulebase
func (c *Client) MoveRuleToBottom(ctx context.Context, deviceGroup, rulebase, ruleName string) error {
    return c.MoveRule(ctx, deviceGroup, rulebase, ruleName, "bottom", "")
}
```

## REST API Examples

### Create Security Rule

```bash
curl -k -X POST \
  'https://<panorama>/restapi/v11.0/Policies/SecurityPreRules?location=device-group&device-group=Production-DG&name=Allow-HTTPS' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Allow-HTTPS",
      "from": {"member": ["trust"]},
      "to": {"member": ["untrust"]},
      "source": {"member": ["internal-users"]},
      "destination": {"member": ["any"]},
      "application": {"member": ["ssl", "web-browsing"]},
      "service": {"member": ["application-default"]},
      "action": "allow",
      "log-end": "yes",
      "profile-setting": {
        "profiles": {
          "virus": {"member": ["default"]},
          "spyware": {"member": ["default"]},
          "vulnerability": {"member": ["default"]}
        }
      }
    }]
  }'
```

### List Rules

```bash
# List pre-rules
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Policies/SecurityPreRules?location=device-group&device-group=Production-DG' \
  -H 'X-PAN-KEY: YOUR_API_KEY'

# List post-rules
curl -k -X GET \
  'https://<panorama>/restapi/v11.0/Policies/SecurityPostRules?location=device-group&device-group=Production-DG' \
  -H 'X-PAN-KEY: YOUR_API_KEY'
```

### Disable Rule

```bash
curl -k -X PUT \
  'https://<panorama>/restapi/v11.0/Policies/SecurityPreRules?location=device-group&device-group=Production-DG&name=Allow-HTTPS' \
  -H 'X-PAN-KEY: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "@name": "Allow-HTTPS",
      "disabled": "yes"
    }]
  }'
```

## XML API Examples

### Create Rule via XML API

```bash
curl -k -g "https://<panorama>/api/?type=config&action=set&xpath=/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production-DG']/pre-rulebase/security/rules/entry[@name='Block-Bad-IPs']&element=<entry name='Block-Bad-IPs'><from><member>any</member></from><to><member>any</member></to><source><member>blocked-ips</member></source><destination><member>any</member></destination><application><member>any</member></application><service><member>any</member></service><action>deny</action><log-end>yes</log-end></entry>&key=$KEY"
```

### Move Rule

```bash
# Move to top
curl -k -g "https://<panorama>/api/?type=config&action=move&xpath=/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production-DG']/pre-rulebase/security/rules/entry[@name='Block-Bad-IPs']&where=top&key=$KEY"

# Move before specific rule
curl -k -g "https://<panorama>/api/?type=config&action=move&xpath=/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production-DG']/pre-rulebase/security/rules/entry[@name='New-Rule']&where=before&dst=Existing-Rule&key=$KEY"
```

## Chariot Integration Patterns

### Create Blocking Rules from Vulnerabilities

```go
// CreateBlockingRuleFromRisk creates a rule to block traffic to vulnerable asset
func (s *SyncService) CreateBlockingRuleFromRisk(ctx context.Context, risk chariot.Risk) error {
    // Get asset details
    asset, err := s.chariotClient.GetAsset(ctx, risk.AssetKey)
    if err != nil {
        return err
    }

    // Create address object if needed
    addrName := fmt.Sprintf("vuln-asset-%s", risk.Key[:8])
    addr := &AddressObject{
        Name:        addrName,
        IPNetmask:   asset.DNS + "/32",
        Description: fmt.Sprintf("Vulnerable: %s", risk.Name),
    }

    if err := s.panoramaClient.CreateAddress(ctx, "shared", addr); err != nil {
        // Ignore if exists
        if !strings.Contains(err.Error(), "Object not unique") {
            return err
        }
    }

    // Create blocking rule
    rule := NewSecurityRule(fmt.Sprintf("Block-Vuln-%s", risk.Key[:8])).
        WithZones([]string{"any"}, []string{"any"}).
        WithAddresses([]string{"any"}, []string{addrName}).
        WithAction("deny")

    rule.Description = fmt.Sprintf("Auto-block for %s (Chariot risk: %s)", risk.Name, risk.Key)
    rule.LogEnd = "yes"

    if err := s.panoramaClient.CreateSecurityRule(ctx, s.deviceGroup, "Pre", rule); err != nil {
        return err
    }

    // Move to top for immediate effect
    return s.panoramaClient.MoveRuleToTop(ctx, s.deviceGroup, "pre", rule.Name)
}
```

### Policy Validation Against Vulnerabilities

```go
// ValidatePolicyForRisk checks if existing policies protect against a risk
func (s *SyncService) ValidatePolicyForRisk(ctx context.Context, risk chariot.Risk) (*PolicyValidation, error) {
    validation := &PolicyValidation{
        RiskKey:   risk.Key,
        Protected: false,
    }

    // Get asset
    asset, err := s.chariotClient.GetAsset(ctx, risk.AssetKey)
    if err != nil {
        return nil, err
    }

    // Get all security rules
    preRules, err := s.panoramaClient.ListSecurityRules(ctx, s.deviceGroup, "Pre")
    if err != nil {
        return nil, err
    }

    postRules, err := s.panoramaClient.ListSecurityRules(ctx, s.deviceGroup, "Post")
    if err != nil {
        return nil, err
    }

    allRules := append(preRules, postRules...)

    // Check if asset is protected
    for _, rule := range allRules {
        if rule.Action == "deny" || rule.Action == "drop" {
            if s.ruleMatchesAsset(rule, asset) {
                validation.Protected = true
                validation.ProtectingRule = rule.Name
                break
            }
        }
    }

    // Check for security profiles on allow rules
    if !validation.Protected {
        for _, rule := range allRules {
            if rule.Action == "allow" && s.ruleMatchesAsset(rule, asset) {
                if rule.ProfileSetting != nil && rule.ProfileSetting.Profiles != nil {
                    if rule.ProfileSetting.Profiles.Vulnerability != nil {
                        validation.HasVulnProfile = true
                    }
                }
            }
        }
    }

    return validation, nil
}

type PolicyValidation struct {
    RiskKey        string
    Protected      bool
    ProtectingRule string
    HasVulnProfile bool
}
```

## Best Practices

1. **Use pre-rules for enforcement** - Admin-controlled, can't be overridden locally
2. **Use post-rules for catch-all** - Default deny at bottom
3. **Order matters** - More specific rules higher, general rules lower
4. **Always attach security profiles** - Enable threat prevention
5. **Enable logging** - At minimum log-end for visibility
6. **Use tags** - Organize rules for management
7. **Document rules** - Use description field

## Common Issues

| Issue                     | Cause                     | Solution                           |
| ------------------------- | ------------------------- | ---------------------------------- |
| Rule not matching traffic | Wrong zone/address        | Verify traffic flow matches rule   |
| Rule shadowed             | Higher rule matches first | Move rule up or make more specific |
| Can't delete rule         | Commit required first     | Commit before delete operations    |
| Profile not applying      | Profile doesn't exist     | Create profile before referencing  |

## Related References

- [Address Objects](address-objects.md) - Creating address objects for rules
- [Device Management](device-management.md) - Device group hierarchy
- [Commit Operations](commit-operations.md) - Applying policy changes
- [API Reference](api-reference.md) - REST/XML API details
