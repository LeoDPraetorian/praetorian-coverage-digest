# Integration Skeleton - Complete Working Template

**Complete boilerplate for Chariot backend integrations with all required patterns.**

## Full Integration Template

```go
package integrations

import (
	"context"
	"fmt"
	"time"

	"github.com/praetorian-inc/chariot/pkg/attacksurface"
	"github.com/praetorian-inc/chariot/pkg/base"
	"github.com/praetorian-inc/chariot/pkg/filter"
	"github.com/praetorian-inc/chariot/pkg/lib/web"
	"github.com/praetorian-inc/chariot/pkg/model"
	"github.com/praetorian-inc/chariot/pkg/registries"
	"github.com/praetorian-inc/chariot/pkg/registry"
	"golang.org/x/sync/errgroup"
)

// ============================================================================
// 1. STRUCT DEFINITION (REQUIRED PATTERNS)
// ============================================================================

// VendorName integration task for discovering assets from VendorName API
type VendorName struct {
	Job    model.Job
	Asset  model.Integration  // NOTE: model.Integration, NOT model.Asset
	Filter model.Filter
	base.BaseCapability        // REQUIRED - provides GetClient(), AWS, Collectors
}

// ============================================================================
// 2. INIT REGISTRATION (REQUIRED)
// ============================================================================

func init() {
	// REQUIRED - registers integration with capability registry
	// Without this, integration is never discovered
	registries.RegisterChariotCapability(&VendorName{}, NewVendorName)
}

// ============================================================================
// 3. CONSTRUCTOR (REQUIRED PATTERN)
// ============================================================================

// NewVendorName creates new VendorName integration instance
// NOTE: Constructor signature uses *model.Integration (pointer)
func NewVendorName(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
	// Static IP compliance - use if integration makes external API calls
	opts = append(opts, base.WithStatic())

	// Create base capability with options
	baseCapability := base.NewBaseCapability(job, opts...)

	return &VendorName{
		Job:            job,
		Asset:          *asset,  // NOTE: Dereference pointer for struct field
		Filter:         filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors),
		BaseCapability: baseCapability,
	}
}

// ============================================================================
// 4. REQUIRED METHODS (ALL INTEGRATIONS)
// ============================================================================

// Integration returns true to distinguish from regular capabilities
// REQUIRED - without this, system treats as non-integration capability
func (t *VendorName) Integration() bool {
	return true
}

// Match validates asset class matches expected integration type
// REQUIRED - prevents integration from running on wrong asset types
func (t *VendorName) Match() error {
	expectedClass := "vendorname"  // Use lowercase vendor name
	if !t.Asset.IsClass(expectedClass) {
		return fmt.Errorf("expected class '%s', got '%s'", expectedClass, t.Asset.Class)
	}
	return nil
}

// Name returns integration identifier (lowercase)
// MUST match frontend enum in modules/chariot/ui/src/types.ts
func (t *VendorName) Name() string {
	return "vendorname"
}

// Timeout returns maximum execution duration
// See timeout guidelines in references/timeout-guidelines.md
func (t *VendorName) Timeout() time.Duration {
	return 60 * time.Second  // Standard VMs: 60s
}

// Surface returns attack surface category
func (t *VendorName) Surface() attacksurface.Surface {
	return attacksurface.External  // or Cloud, SCM
}

// ============================================================================
// 5. CREDENTIAL VALIDATION (P0 REQUIRED)
// ============================================================================

// ValidateCredentials verifies API credentials before processing
// REQUIRED - must be called in Invoke() before any API operations
func (t *VendorName) ValidateCredentials(ctx context.Context) error {
	// Example: Make lightweight API call to verify credentials
	type healthResponse struct {
		Status string `json:"status"`
	}

	resp, err := web.Request[healthResponse](ctx, t.GetClient(), web.RequestConfig{
		Method: "GET",
		URL:    "https://api.vendorname.com/health",
		Headers: map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", t.Asset.Secret["api_key"]),
		},
	})

	if err != nil {
		return fmt.Errorf("validating credentials: %w", err)
	}

	if resp.Status != "ok" {
		return fmt.Errorf("invalid credentials: API returned status '%s'", resp.Status)
	}

	return nil
}

// ============================================================================
// 6. AFFILIATION CHECK (P0 REQUIRED)
// ============================================================================

// CheckAffiliation verifies asset ownership
// REQUIRED - use Pattern A/B/C (see checkaffiliation-patterns.md)
func (t *VendorName) CheckAffiliation(asset model.Asset) (bool, error) {
	// PATTERN A: Direct API query (PREFERRED when available)
	type assetResponse struct {
		ID        string `json:"id"`
		DeletedAt string `json:"deleted_at"`
	}

	resp, err := web.Request[assetResponse](context.Background(), t.GetClient(), web.RequestConfig{
		Method: "GET",
		URL:    fmt.Sprintf("https://api.vendorname.com/assets/%s", asset.CloudId),
		Headers: map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", t.Asset.Secret["api_key"]),
		},
	})

	if err != nil {
		// 404 means asset doesn't exist (not affiliated)
		if isNotFoundError(err) {
			return false, nil
		}
		return false, fmt.Errorf("querying asset: %w", err)
	}

	// Asset exists and is not deleted
	return resp.ID != "" && resp.DeletedAt == "", nil
}

// ============================================================================
// 7. MAIN EXECUTION (INVOKE)
// ============================================================================

// Invoke executes integration discovery workflow
func (t *VendorName) Invoke(ctx context.Context) error {
	// Step 1: Validate credentials (P0 REQUIRED)
	if err := t.ValidateCredentials(ctx); err != nil {
		return fmt.Errorf("credential validation failed: %w", err)
	}

	// Step 2: Discover assets with pagination safety
	assets, err := t.discoverAssets(ctx)
	if err != nil {
		return fmt.Errorf("discovering assets: %w", err)
	}

	// Step 3: Process assets with errgroup concurrency limits
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10)  // P0 REQUIRED - prevent unlimited goroutines

	for _, asset := range assets {
		asset := asset  // P0 REQUIRED - capture loop variable
		g.Go(func() error {
			return t.processAsset(ctx, asset)
		})
	}

	if err := g.Wait(); err != nil {
		return fmt.Errorf("processing assets: %w", err)
	}

	return nil
}

// ============================================================================
// 8. HELPER METHODS
// ============================================================================

// discoverAssets fetches all assets from vendor API with pagination safety
func (t *VendorName) discoverAssets(ctx context.Context) ([]model.Asset, error) {
	const maxPages = 1000  // P0 REQUIRED - prevent infinite loops

	var allAssets []model.Asset
	pageToken := ""
	page := 0

	for {
		// Pagination safety check
		if page >= maxPages {
			t.Job.Log.Warn("reached maxPages limit, stopping pagination")
			break
		}

		// Make API request
		type listResponse struct {
			Assets    []assetData `json:"assets"`
			NextToken string      `json:"next_token"`
		}

		resp, err := web.Request[listResponse](ctx, t.GetClient(), web.RequestConfig{
			Method: "GET",
			URL:    fmt.Sprintf("https://api.vendorname.com/assets?page_token=%s", pageToken),
			Headers: map[string]string{
				"Authorization": fmt.Sprintf("Bearer %s", t.Asset.Secret["api_key"]),
			},
		})

		if err != nil {
			return nil, fmt.Errorf("listing assets (page %d): %w", page, err)
		}

		// Transform and collect assets
		for _, apiAsset := range resp.Assets {
			asset := t.transformAsset(apiAsset)
			allAssets = append(allAssets, asset)
		}

		// Check for more pages
		pageToken = resp.NextToken
		if pageToken == "" {
			break  // No more pages
		}

		page++
	}

	return allAssets, nil
}

// processAsset handles single asset with filtering and emission
func (t *VendorName) processAsset(ctx context.Context, asset model.Asset) error {
	// P0 REQUIRED - filter before emission
	t.Filter.Asset(&asset)

	// Emit filtered asset
	t.Job.Send(&asset)

	return nil
}

// transformAsset converts vendor API response to Chariot model
func (t *VendorName) transformAsset(apiAsset assetData) model.Asset {
	asset := model.NewAsset(
		t.Asset.Key,
		t.Asset.DNS,
		"ipv4",  // or "domain", "cloud", etc.
	)

	asset.CloudId = apiAsset.ID
	asset.Name = apiAsset.Name
	asset.Status = model.StatusA

	return asset
}

// ============================================================================
// 9. TYPE DEFINITIONS
// ============================================================================

// assetData represents vendor API asset response
type assetData struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	IP   string `json:"ip_address"`
}

// Helper to detect 404 errors
func isNotFoundError(err error) bool {
	// Implementation depends on HTTP client error types
	return false  // Placeholder
}
```

## Critical Pattern Summary

| Pattern                         | Location              | Why Required                                               |
| ------------------------------- | --------------------- | ---------------------------------------------------------- |
| `base.BaseCapability` embedding | Struct definition     | Provides GetClient(), AWS, Collectors                      |
| `init()` registration           | Top-level             | Capability discovery - integration never runs without this |
| `Integration() bool`            | Required method       | Distinguishes integrations from regular capabilities       |
| `Match() error`                 | Required method       | Class validation prevents wrong asset types                |
| `*model.Integration` param      | Constructor signature | Type system requirement                                    |
| `model.Integration` field       | Struct field          | Dereferenced from constructor pointer                      |

## Type Distinction Table

| Location              | Type                           | Example                                                  |
| --------------------- | ------------------------------ | -------------------------------------------------------- |
| Constructor parameter | `*model.Integration` (pointer) | `func New(job model.Job, asset *model.Integration, ...)` |
| Struct field          | `model.Integration` (value)    | `Asset model.Integration`                                |
| Constructor return    | Dereference pointer            | `Asset: *asset`                                          |

## Validation Checklist

Before submitting integration:

- [ ] Struct embeds `base.BaseCapability`
- [ ] `init()` calls `registries.RegisterChariotCapability()`
- [ ] `Integration()` returns `true`
- [ ] `Match()` validates class with `IsClass()`
- [ ] Constructor accepts `*model.Integration` pointer
- [ ] Struct field uses `model.Integration` value
- [ ] Constructor dereferences pointer: `Asset: *asset`
- [ ] `ValidateCredentials()` implemented and called
- [ ] `CheckAffiliation()` uses Pattern A/B/C
- [ ] VMFilter applied before emission
- [ ] errgroup has `SetLimit(10)`
- [ ] Pagination has `maxPages` safety
- [ ] No ignored errors (`_, _`)
- [ ] Timeout() appropriate for workload
- [ ] Surface() matches integration type
