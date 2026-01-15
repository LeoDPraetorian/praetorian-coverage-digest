# File Size Verification

**Purpose**: Verify that integration files stay under 400 lines for maintainability.

## Requirements

1. Main integration file MUST be under 400 lines
2. If exceeding 400 lines, MUST split into separate files
3. Each split file MUST also be under 400 lines
4. Split files use naming convention: `vendor_types.go`, `vendor_client.go`, etc.

## Verification Commands

```bash
# Count lines in main integration file
wc -l modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Count all Go files in integration directory
wc -l modules/chariot/backend/pkg/tasks/integrations/{vendor}/*.go

# Check for split files
ls modules/chariot/backend/pkg/tasks/integrations/{vendor}/ | grep -E "_types|_client|_utils|_transform"

# Find all integrations over 400 lines
for dir in modules/chariot/backend/pkg/tasks/integrations/*/; do
  vendor=$(basename "$dir")
  mainfile="$dir${vendor}.go"
  if [ -f "$mainfile" ]; then
    lines=$(wc -l < "$mainfile")
    if [ "$lines" -gt 400 ]; then
      echo "$lines $vendor"
    fi
  fi
done | sort -rn
```

## File Organization Pattern

### Under 400 Lines (Single File)
```
vendor/
├── vendor.go          # All code in one file
├── vendor_test.go     # Tests
└── match_test.go      # Match() tests (if applicable)
```

### Over 400 Lines (Split Required)
```
vendor/
├── vendor.go          # ~250 lines - Main struct, Invoke(), CheckAffiliation()
├── vendor_types.go    # ~200 lines - API response structs, enums
├── vendor_client.go   # ~150 lines - HTTP client, auth, API methods
├── vendor_transform.go # ~100 lines - Asset/Risk transformations
├── vendor_test.go     # Tests
└── match_test.go      # Match() tests
```

## Split File Contents

### vendor.go (Main File)
```go
// Package documentation
package vendor

// Imports

// Main integration struct
type Vendor struct {
    // Fields
}

// Constructor
func NewVendor(job *model.Job, asset *model.Integration) *Vendor

// Required interface methods
func (v *Vendor) Name() string
func (v *Vendor) Title() string
func (v *Vendor) Description() string
func (v *Vendor) Invoke() error
func (v *Vendor) Match(job *model.Job, integration *model.Integration) bool
func (v *Vendor) CheckAffiliation(asset model.Asset) (bool, error)
func (v *Vendor) ValidateCredentials() error
```

### vendor_types.go (API Types)
```go
package vendor

// API response structs
type VendorResponse struct { ... }
type VendorAsset struct { ... }
type VendorVulnerability struct { ... }

// Enums and constants
const (
    StatusActive = "active"
    StatusInactive = "inactive"
)

// Nested types
type VendorPagination struct { ... }
type VendorMetadata struct { ... }
```

### vendor_client.go (HTTP Client)
```go
package vendor

// Client initialization
func (v *Vendor) initClient() error

// Authentication
func (v *Vendor) authenticate() error
func (v *Vendor) refreshToken() error

// API methods
func (v *Vendor) listAssets(page int) ([]VendorAsset, error)
func (v *Vendor) getAssetDetails(id string) (*VendorAsset, error)
func (v *Vendor) listVulnerabilities(assetID string) ([]VendorVulnerability, error)
```

### vendor_transform.go (Transformations)
```go
package vendor

// Asset transformation
func (v *Vendor) transformAsset(va VendorAsset) model.Asset

// Risk transformation
func (v *Vendor) transformVulnerability(vv VendorVulnerability) model.Risk

// Helper transformations
func formatSeverity(severity string) string
func extractDNS(hostnames []string) string
```

## Evidence Format

**PASS Example**:
```
✅ File Size
Evidence: vendor.go - 285 lines
Status: Under 400 line limit
```

**PASS Example (Split Files)**:
```
✅ File Size
Evidence: vendor.go - 250 lines
Evidence: vendor_types.go - 180 lines
Evidence: vendor_client.go - 145 lines
Status: All files under 400 lines, properly split
```

**FAIL Example**:
```
❌ File Size
Evidence: vendor.go - 914 lines (228% over limit)
Issue: Main file exceeds 400 line limit by 514 lines
Required: Split into vendor.go, vendor_types.go, vendor_client.go
Recommendation: Extract 13 API types to vendor_types.go (~250 lines)
Recommendation: Extract GraphQL client methods to vendor_client.go (~200 lines)
```

## Known Violations (from codebase research)

| Rank | Integration | Lines | Over Limit | Severity |
|------|-------------|-------|-----------|----------|
| 1 | wiz.go | 914 | +228% | CRITICAL |
| 2 | bitbucket.go | 610 | +153% | CRITICAL |
| 3 | crowdstrike.go | 569 | +142% | CRITICAL |
| 4 | xpanse.go | 509 | +127% | CRITICAL |
| 5 | pingone.go | 508 | +127% | CRITICAL |
| 6 | tenable_vm.go | 486 | +122% | WARNING |
| 7 | amazon.go | 481 | +120% | WARNING |
| 8 | qualys.go | 474 | +119% | WARNING |
| 9 | okta.go | 460 | +115% | WARNING |
| 10 | microsoft_defender.go | 442 | +111% | WARNING |

**Statistics**:
- Compliant (<400): 34/44 (77%)
- Violations (≥400): 10/44 (23%)
- Split files used: 0/44 (0%)

## Split Strategy by File Size

| Lines | Status | Action |
|-------|--------|--------|
| <350 | Safe | No action needed |
| 350-400 | Caution | Consider splitting |
| 400-500 | Warning | Should split |
| 500+ | Critical | Must split immediately |

## Wiz.go Split Example

**Current (914 lines)**:
- Wiz struct (lines 27-32)
- 13+ API response types (WizOAuth, WizQuery, WizVulnerability, etc.)
- GraphQL query methods
- CheckAffiliation, ValidateCredentials, Invoke

**Recommended Split**:
- **wiz.go** (~250 lines): Main struct, Invoke, CheckAffiliation, ValidateCredentials
- **wiz_types.go** (~250 lines): All API response structs
- **wiz_client.go** (~150 lines): GraphQL client, OAuth, query methods
- **wiz_transform.go** (~150 lines): Asset/Risk transformations

## Compliance Checklist

- [ ] Main integration file under 400 lines
- [ ] If over 400, split into appropriate files
- [ ] vendor_types.go for API structs (if needed)
- [ ] vendor_client.go for HTTP/auth logic (if needed)
- [ ] vendor_transform.go for data transformations (if needed)
- [ ] All split files under 400 lines
- [ ] Package declaration consistent across split files
