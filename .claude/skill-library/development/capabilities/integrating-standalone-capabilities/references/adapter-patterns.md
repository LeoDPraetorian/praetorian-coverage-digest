# Adapter Patterns

**Finding → Tabularium model translation patterns.**

## Overview

The adapter translates simple Finding structs into Tabularium models that Chariot understands.

## Main Dispatcher

```go
func translateFinding(f Finding, job model.Job) []model.Model {
    switch f.Type {
    case "asset":
        return translateAsset(f, job)
    case "risk":
        return translateRisk(f, job)
    case "attribute":
        return translateAttribute(f, job)
    default:
        return nil
    }
}
```

## Asset Translation

### Domain Assets

```go
func translateAsset(f Finding, job model.Job) []model.Model {
    if dns, ok := f.Data["dns"].(string); ok {
        asset := model.NewAsset(dns, "")
        asset.Class = "domain"
        if ip, ok := f.Data["ip"].(string); ok {
            asset.IP = ip
        }
        return []model.Model{&asset}
    }
    return nil
}
```

### IP Assets

```go
if ip, ok := f.Data["ip"].(string); ok {
    asset := model.NewAsset("", ip)
    asset.Class = "ipv4"  // or "ipv6"
    return []model.Model{&asset}
}
```

### Port Assets

```go
if port, ok := f.Data["port"].(int); ok {
    if ip, ok := f.Data["ip"].(string); ok {
        portAsset := model.NewPort(ip, port)
        portAsset.Protocol = f.Data["protocol"].(string)  // "tcp" or "udp"
        return []model.Model{&portAsset}
    }
}
```

## Risk Translation

```go
func translateRisk(f Finding, job model.Job) []model.Model {
    risk := model.NewRisk(job.Account)
    risk.Name = f.Data["name"].(string)
    risk.Description = f.Data["description"].(string)

    // Map severity
    switch f.Severity {
    case "critical":
        risk.Severity = model.Critical
    case "high":
        risk.Severity = model.High
    case "medium":
        risk.Severity = model.Medium
    case "low":
        risk.Severity = model.Low
    default:
        risk.Severity = model.Info
    }

    if cve, ok := f.Data["cve"].(string); ok {
        risk.CVE = cve
    }

    return []model.Model{&risk}
}
```

## Attribute Translation

```go
func translateAttribute(f Finding, job model.Job) []model.Model {
    attr := model.NewAttribute()
    attr.Key = f.Data["key"].(string)
    attr.Value = fmt.Sprintf("%v", f.Data["value"])

    if target, ok := f.Data["target"].(string); ok {
        attr.Target = target
    }

    return []model.Model{&attr}
}
```

## Per-Tool Customization

Each tool has unique output fields. The adapter maps them to appropriate Tabularium fields:

### Example: Subfinder

```go
// Subfinder outputs: {"host": "sub.example.com", "source": "crtsh"}
func translateAsset(f Finding, job model.Job) []model.Model {
    asset := model.NewAsset(f.Data["host"].(string), "")
    asset.Class = "domain"

    if source, ok := f.Data["source"].(string); ok {
        asset.Source = source  // Track which passive source found it
    }

    return []model.Model{&asset}
}
```

### Example: Nuclei

```go
// Nuclei outputs risks with template metadata
func translateRisk(f Finding, job model.Job) []model.Model {
    risk := model.NewRisk(job.Account)
    risk.Name = f.Data["template"].(string)
    risk.Description = f.Data["info"].(string)

    if tags, ok := f.Data["tags"].([]string); ok {
        risk.Tags = tags
    }

    return []model.Model{&risk}
}
```

## Type Assertions

Always use type assertions with ok checks:

```go
// ✅ CORRECT
if dns, ok := f.Data["dns"].(string); ok {
    // use dns
}

// ❌ WRONG (panics if type mismatch)
dns := f.Data["dns"].(string)
```

## Multiple Models

Some findings map to multiple Tabularium models:

```go
func translateAsset(f Finding, job model.Job) []model.Model {
    var models []model.Model

    // Create domain asset
    domain := model.NewAsset(f.Data["dns"].(string), "")
    domain.Class = "domain"
    models = append(models, &domain)

    // Also create IP asset if present
    if ip, ok := f.Data["ip"].(string); ok {
        ipAsset := model.NewAsset("", ip)
        ipAsset.Class = "ipv4"
        models = append(models, &ipAsset)
    }

    return models
}
```

## References

- [Simple Interface Spec](simple-interface-spec.md) - Finding struct definition
- [Tabularium Capability Interface](tabularium-capability-interface.md) - model.Model types
- `modules/tabularium/pkg/model/` - Tabularium model definitions
