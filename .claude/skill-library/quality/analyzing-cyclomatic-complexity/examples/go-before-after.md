# Go Refactoring Examples

Real-world refactorings reducing cyclomatic complexity in Go backend code.

## Example 1: API Handler with Multiple Checks

### Before (Complexity: 12)

```go
func HandleAssetRequest(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        if r.Method == http.MethodPost {
            if r.Body == nil {
                http.Error(w, "Empty body", http.StatusBadRequest)
                return
            }
            var asset Asset
            if err := json.NewDecoder(r.Body).Decode(&asset); err != nil {
                http.Error(w, "Invalid JSON", http.StatusBadRequest)
                return
            }
            if asset.Name == "" {
                http.Error(w, "Missing name", http.StatusBadRequest)
                return
            }
            // ... handle POST
        } else {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
    }

    assetID := r.URL.Query().Get("id")
    if assetID == "" {
        http.Error(w, "Missing ID", http.StatusBadRequest)
        return
    }

    asset, err := GetAsset(r.Context(), assetID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            http.Error(w, "Not found", http.StatusNotFound)
            return
        }
        http.Error(w, "Server error", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(asset)
}
```

### After (Complexity: 3 per handler)

```go
func HandleAssetGet(w http.ResponseWriter, r *http.Request) {
    assetID := r.URL.Query().Get("id")
    if assetID == "" {
        http.Error(w, "Missing ID", http.StatusBadRequest)
        return
    }

    asset, err := GetAsset(r.Context(), assetID)
    if err != nil {
        handleError(w, err)
        return
    }

    json.NewEncoder(w).Encode(asset)
}
// Complexity: 3

func HandleAssetPost(w http.ResponseWriter, r *http.Request) {
    if r.Body == nil {
        http.Error(w, "Empty body", http.StatusBadRequest)
        return
    }

    var asset Asset
    if err := json.NewDecoder(r.Body).Decode(&asset); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    if asset.Name == "" {
        http.Error(w, "Missing name", http.StatusBadRequest)
        return
    }

    // ... handle POST logic
}
// Complexity: 3

func handleError(w http.ResponseWriter, err error) {
    if errors.Is(err, ErrNotFound) {
        http.Error(w, "Not found", http.StatusNotFound)
        return
    }
    http.Error(w, "Server error", http.StatusInternalServerError)
}
// Complexity: 1
```

**Improvements:**
- Separate handlers per HTTP method
- Shared error handling
- Aligns with Go idioms (method-specific handlers)

---

## Example 2: Asset Processing with Complex Logic

### Before (Complexity: 14)

```go
func ProcessAsset(ctx context.Context, asset *Asset) error {
    if asset == nil {
        return errors.New("nil asset")
    }

    if !asset.IsValid() {
        return errors.New("invalid asset")
    }

    switch asset.Type {
    case "domain":
        if asset.HasSSL {
            if asset.CertExpiry.Before(time.Now()) {
                if err := RenewCertificate(ctx, asset); err != nil {
                    return err
                }
            }
        }
        if asset.DNSRecords == nil {
            if err := FetchDNSRecords(ctx, asset); err != nil {
                return err
            }
        }
        return ScanDomain(ctx, asset)

    case "ip":
        if asset.IsPublic {
            if asset.Ports == nil {
                if err := ScanPorts(ctx, asset); err != nil {
                    return err
                }
            }
            return ScanPublicIP(ctx, asset)
        }
        return ScanPrivateIP(ctx, asset)

    case "cloud":
        if asset.CloudProvider == "" {
            return errors.New("missing cloud provider")
        }
        return ScanCloud(ctx, asset)

    default:
        return errors.New("unknown asset type")
    }
}
```

### After (Complexity: 2 per processor, 3 main)

```go
type AssetProcessor interface {
    Process(ctx context.Context, asset *Asset) error
}

var processors = map[string]AssetProcessor{
    "domain": &DomainProcessor{},
    "ip":     &IPProcessor{},
    "cloud":  &CloudProcessor{},
}

func ProcessAsset(ctx context.Context, asset *Asset) error {
    if asset == nil {
        return errors.New("nil asset")
    }

    if !asset.IsValid() {
        return errors.New("invalid asset")
    }

    processor, ok := processors[asset.Type]
    if !ok {
        return errors.New("unknown asset type")
    }

    return processor.Process(ctx, asset)
}
// Complexity: 3

type DomainProcessor struct{}

func (p *DomainProcessor) Process(ctx context.Context, asset *Asset) error {
    if err := p.ensureSSL(ctx, asset); err != nil {
        return err
    }
    if err := p.ensureDNS(ctx, asset); err != nil {
        return err
    }
    return ScanDomain(ctx, asset)
}
// Complexity: 2

func (p *DomainProcessor) ensureSSL(ctx context.Context, asset *Asset) error {
    if !asset.HasSSL {
        return nil
    }
    if asset.CertExpiry.After(time.Now()) {
        return nil
    }
    return RenewCertificate(ctx, asset)
}
// Complexity: 2

func (p *DomainProcessor) ensureDNS(ctx context.Context, asset *Asset) error {
    if asset.DNSRecords != nil {
        return nil
    }
    return FetchDNSRecords(ctx, asset)
}
// Complexity: 1

type IPProcessor struct{}

func (p *IPProcessor) Process(ctx context.Context, asset *Asset) error {
    if asset.IsPublic {
        if err := p.ensurePorts(ctx, asset); err != nil {
            return err
        }
        return ScanPublicIP(ctx, asset)
    }
    return ScanPrivateIP(ctx, asset)
}
// Complexity: 2

func (p *IPProcessor) ensurePorts(ctx context.Context, asset *Asset) error {
    if asset.Ports != nil {
        return nil
    }
    return ScanPorts(ctx, asset)
}
// Complexity: 1

type CloudProcessor struct{}

func (p *CloudProcessor) Process(ctx context.Context, asset *Asset) error {
    if asset.CloudProvider == "" {
        return errors.New("missing cloud provider")
    }
    return ScanCloud(ctx, asset)
}
// Complexity: 1
```

**Improvements:**
- Strategy pattern eliminates switch
- Each processor focused on one asset type
- Easy to add new asset types
- Testable in isolation

---

## Example 3: Validation with Many Rules

### Before (Complexity: 11)

```go
func ValidateSeed(seed *Seed) error {
    if seed == nil {
        return errors.New("nil seed")
    }

    if seed.Name == "" {
        return errors.New("missing name")
    }

    if len(seed.Name) < 3 {
        return errors.New("name too short")
    }

    if len(seed.Name) > 100 {
        return errors.New("name too long")
    }

    if seed.Value == "" {
        return errors.New("missing value")
    }

    if seed.Type == "domain" {
        if !isValidDomain(seed.Value) {
            return errors.New("invalid domain")
        }
    } else if seed.Type == "ip" {
        if !isValidIP(seed.Value) {
            return errors.New("invalid IP")
        }
    } else if seed.Type == "cidr" {
        if !isValidCIDR(seed.Value) {
            return errors.New("invalid CIDR")
        }
    } else {
        return errors.New("unknown seed type")
    }

    return nil
}
```

### After (Complexity: 1 per validator, 2 main)

```go
type Validator func(*Seed) error

var validators = []Validator{
    validateNotNil,
    validateName,
    validateValue,
    validateType,
}

func ValidateSeed(seed *Seed) error {
    for _, validator := range validators {
        if err := validator(seed); err != nil {
            return err
        }
    }
    return nil
}
// Complexity: 2 (for loop + if)

func validateNotNil(seed *Seed) error {
    if seed == nil {
        return errors.New("nil seed")
    }
    return nil
}
// Complexity: 1

func validateName(seed *Seed) error {
    if seed.Name == "" {
        return errors.New("missing name")
    }
    if len(seed.Name) < 3 {
        return errors.New("name too short")
    }
    if len(seed.Name) > 100 {
        return errors.New("name too long")
    }
    return nil
}
// Complexity: 3

func validateValue(seed *Seed) error {
    if seed.Value == "" {
        return errors.New("missing value")
    }
    return nil
}
// Complexity: 1

var typeValidators = map[string]func(string) bool{
    "domain": isValidDomain,
    "ip":     isValidIP,
    "cidr":   isValidCIDR,
}

func validateType(seed *Seed) error {
    validator, ok := typeValidators[seed.Type]
    if !ok {
        return errors.New("unknown seed type")
    }

    if !validator(seed.Value) {
        return fmt.Errorf("invalid %s format", seed.Type)
    }

    return nil
}
// Complexity: 2
```

**Improvements:**
- Composable validators
- Easy to add/remove validation rules
- Clear error messages
- Each validator independently testable

---

## Example 4: Error Handling Chain

### Before (Complexity: 8)

```go
func GetAssetWithDetails(ctx context.Context, id string) (*Asset, error) {
    asset, err := GetAsset(ctx, id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return nil, errors.New("asset not found")
        } else if errors.Is(err, ErrForbidden) {
            return nil, errors.New("access denied")
        } else {
            return nil, errors.New("failed to get asset")
        }
    }

    attrs, err := GetAssetAttributes(ctx, id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return asset, nil // Attributes optional
        } else {
            return nil, errors.New("failed to get attributes")
        }
    }

    asset.Attributes = attrs
    return asset, nil
}
```

### After (Complexity: 2)

```go
func GetAssetWithDetails(ctx context.Context, id string) (*Asset, error) {
    asset, err := GetAsset(ctx, id)
    if err != nil {
        return nil, wrapAssetError(err)
    }

    attrs, err := GetAssetAttributes(ctx, id)
    if err != nil && !errors.Is(err, ErrNotFound) {
        return nil, fmt.Errorf("get attributes: %w", err)
    }

    asset.Attributes = attrs
    return asset, nil
}
// Complexity: 2

func wrapAssetError(err error) error {
    switch {
    case errors.Is(err, ErrNotFound):
        return errors.New("asset not found")
    case errors.Is(err, ErrForbidden):
        return errors.New("access denied")
    default:
        return errors.New("failed to get asset")
    }
}
// Complexity: 1 (switch with type matching, not conditionals)
```

**Improvements:**
- Separate error wrapping
- Go 1.13+ error wrapping (`%w`)
- Clearer main logic
- Reusable error handling

---

## Key Takeaways

1. **Separate Handlers**: Split by HTTP method or use case
2. **Strategy Pattern**: Replace switch statements with interfaces
3. **Validator Chain**: Compose simple validators
4. **Error Wrapping**: Go 1.13+ wrapping instead of nested if/else
5. **Guard Clauses**: Return early with Go's explicit error handling
