# File Organization and Structure

This document explains how test operations are organized within `pkg/ops/`.

## Directory Structure

```
pkg/ops/
├── helper.go        # TestHelper struct, initialization, cleanup
├── assets.go        # Asset CRUD operations
├── seeds.go         # Seed CRUD operations
├── risks.go         # Risk CRUD operations
├── accounts.go      # Account management operations
├── files.go         # File upload/download operations
├── jobs.go          # Job creation/management operations
├── users.go         # User management operations
├── capabilities.go  # Capability-related operations
├── export.go        # Data export operations
├── plextrac.go      # PlexTrac integration operations
└── async.go         # Async operation helpers
```

## File Metrics

| File              | Purpose                    | Lines      | Operations                                              |
| ----------------- | -------------------------- | ---------- | ------------------------------------------------------- |
| `helper.go`       | Core TestHelper definition | 126        | 1 (initialization)                                      |
| `assets.go`       | Asset operations           | 99         | 4 (Add, Get, Update, Delete)                            |
| `seeds.go`        | Seed operations            | 92         | 4 (Add, Get, Update, Delete)                            |
| `risks.go`        | Risk operations            | 118        | 4 (Add, Get, Update, Delete)                            |
| `accounts.go`     | Account operations         | 62         | 3 (Add, Get, Delete)                                    |
| `files.go`        | File operations            | 227        | 6 (Add, AddMultipart, Update, Delete, GetURL, Download) |
| `jobs.go`         | Job operations             | 66         | 3 (Create, Delete, Get)                                 |
| `users.go`        | User operations            | Variable   | Multiple                                                |
| `capabilities.go` | Capability operations      | Variable   | Multiple                                                |
| `export.go`       | Export operations          | Variable   | Multiple                                                |
| `plextrac.go`     | PlexTrac operations        | Variable   | Multiple                                                |
| `async.go`        | Async helpers              | Variable   | Multiple                                                |
| **Total**         | **All operations**         | **~1,100** | **30+**                                                 |

## Organization Principles

### 1. Domain Grouping

**Operations are grouped by business domain:**

- **Assets** (`assets.go`) - Asset lifecycle management
- **Seeds** (`seeds.go`) - Seed discovery management
- **Risks** (`risks.go`) - Vulnerability tracking
- **Accounts** (`accounts.go`) - Multi-tenant collaboration
- **Files** (`files.go`) - File storage operations
- **Jobs** (`jobs.go`) - Async job management

**Rationale:** Related operations stay together, making the codebase easier to navigate.

### 2. Alphabetical Order

**Files are alphabetically ordered in directory:**

```
accounts.go
assets.go
async.go
capabilities.go
export.go
files.go
helper.go
jobs.go
plextrac.go
risks.go
seeds.go
users.go
```

**Rationale:** Predictable ordering makes files easy to find.

### 3. Size Balance

**Target: Keep files under 300 lines**

- Most files stay well under 300 lines
- `files.go` is 227 lines (justified by multipart complexity)
- When approaching 300 lines, consider splitting by sub-domain

**Rationale:** Smaller files are easier to review and maintain.

### 4. Clear Naming

**File names match domain directly:**

- `assets.go` - Asset operations
- `seeds.go` - Seed operations
- `risks.go` - Risk operations

**Not:**

- ❌ `asset_operations.go` - Verbose
- ❌ `crud.go` - Too generic
- ❌ `helpers.go` - Unclear purpose

**Rationale:** Clear names enable quick file identification.

---

## helper.go - Core Structure

### Purpose

Defines the `TestHelper` struct and initialization methods.

### Key Components

```go
type TestHelper struct {
    User     users.User              // Cognito test user
    Client   *api.Client             // Authenticated API client
    Plextrac *plextrac.Manager       // PlexTrac integration client

    // Embedded data factory (methods promoted to TestHelper)
    *data.ModelDataFactory

    // Embedded assertors (methods promoted to TestHelper)
    *queue.QueueAssertor
    *data2.DataAssertor
    *table.TableAssertor
    *secrets.SecretsAssertor
    *files.FilesAssertor
    *users2.UsersAssertor
    *api2.APIAssertor
}
```

### Initialization Methods

```go
// NewTestHelper - For API tests (with queue monitoring)
func NewTestHelper(t *testing.T) (*TestHelper, error)

// NewPassiveTestHelper - For compute tests (no monitoring)
func NewPassiveTestHelper() (*TestHelper, error)
```

**Lines:** ~126 lines total

---

## Domain Files Pattern

### Standard CRUD File Structure

Each domain file follows this pattern:

```go
// 1. Package declaration and imports
package ops

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// 2. CREATE operation
func (h *TestHelper) AddResource(...) (..., error) {
    // Implementation
}

// 3. READ operation
func (h *TestHelper) GetResource(...) (..., error) {
    // Implementation
}

// 4. UPDATE operation
func (h *TestHelper) UpdateResource(...) (..., error) {
    // Implementation
}

// 5. DELETE operation
func (h *TestHelper) DeleteResource(...) (..., error) {
    // Implementation
}

// 6. Helper methods (if needed, private)
func (h *TestHelper) buildResourceBody(...) map[string]any {
    // Helper implementation
}
```

### Example: assets.go

```go
package ops

// ~25 lines per operation × 4 operations = ~100 lines total

func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // ~25 lines
}

func (h *TestHelper) GetAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // ~25 lines
}

func (h *TestHelper) UpdateAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // ~25 lines
}

func (h *TestHelper) DeleteAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // ~25 lines
}
```

**Total:** 99 lines

---

## Special Cases

### files.go - Complex Operations

**Larger file justified by:**

- Multipart upload complexity
- Parallel chunk management
- Multiple helper methods
- Presigned URL handling

```go
// Public operations
func (h *TestHelper) AddFile(file *model.File) error
func (h *TestHelper) AddFileMultipart(file *model.File) error
func (h *TestHelper) UpdateFile(file *model.File) error
func (h *TestHelper) DeleteFile(file *model.File) error
func (h *TestHelper) GetFileDownloadURL(fileName string) (string, error)
func (h *TestHelper) DownloadFile(fileName string) ([]byte, error)

// Private helpers
func (h *TestHelper) startMultipartUpload(...) (string, error)
func (h *TestHelper) uploadMultipartData(...) ([]MultipartUploadPart, error)
func (h *TestHelper) completeMultipartUpload(...) error
func (h *TestHelper) uploadPart(...) error
```

**Total:** 227 lines (justified complexity)

---

## Adding New Domain Files

### When to Create New File

Create a new domain file when:

1. **New domain emerges** - Doesn't fit existing domains
2. **Existing file too large** - Would exceed 300 lines
3. **Clear separation needed** - Distinct business area

### Naming Convention

```
{domain}.go
```

**Examples:**

- `webhooks.go` - Webhook operations
- `notifications.go` - Notification operations
- `integrations.go` - Integration operations

### Template for New Domain File

```go
// pkg/ops/newdomain.go
package ops

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// Add operations for the new domain

func (h *TestHelper) AddNewResource(...) (..., error) {
    // Implementation
}

func (h *TestHelper) GetNewResource(...) (..., error) {
    // Implementation
}

// Additional operations as needed
```

---

## File Size Guidelines

### Target Sizes

| Size Range    | Action                            |
| ------------- | --------------------------------- |
| 0-200 lines   | ✅ Optimal - easy to navigate     |
| 200-300 lines | ⚠️ Acceptable - monitor growth    |
| 300-400 lines | ⚠️ Consider splitting if possible |
| 400+ lines    | ❌ Should split unless justified  |

### When Large Files Are Justified

**Acceptable reasons for >300 lines:**

- Complex multipart operations (like `files.go`)
- Many related helper methods
- Extensive error handling requirements
- Domain naturally requires many operations

**Not acceptable reasons:**

- Mixed concerns from multiple domains
- Duplicate code that could be extracted
- Unnecessary verbosity
- Could be logically split

---

## Import Organization

### Standard Import Order

```go
package ops

import (
    // 1. Standard library
    "context"
    "fmt"
    "time"

    // 2. External dependencies
    "github.com/stretchr/testify/require"

    // 3. Internal dependencies (alphabetical)
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
    "github.com/praetorian-inc/tabularium/pkg/registry"
)
```

**Rationale:** Consistent import organization improves readability.

---

## Operation Ordering Within Files

### Recommended Order

1. **CREATE operations** - Add/Create methods
2. **READ operations** - Get/Query methods
3. **UPDATE operations** - Update/Modify methods
4. **DELETE operations** - Delete/Remove methods
5. **Helper methods** - Private utility functions

**Example:**

```go
// CREATE
func (h *TestHelper) AddAsset(...) {...}

// READ
func (h *TestHelper) GetAsset(...) {...}

// UPDATE
func (h *TestHelper) UpdateAsset(...) {...}

// DELETE
func (h *TestHelper) DeleteAsset(...) {...}

// HELPERS
func (h *TestHelper) buildAssetBody(...) {...}
```

**Rationale:** CRUD ordering is intuitive and matches resource lifecycle.

---

## Testing File Organization

### Test File Pattern

Each domain file has corresponding test file:

```
pkg/ops/
├── assets.go
├── assets_test.go    # Tests for assets.go
├── seeds.go
├── seeds_test.go     # Tests for seeds.go
├── risks.go
└── risks_test.go     # Tests for risks.go
```

### Test File Structure

```go
// pkg/ops/assets_test.go
package ops

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func Test_AddAsset(t *testing.T) {
    // Test implementation
}

func Test_GetAsset(t *testing.T) {
    // Test implementation
}

func Test_UpdateAsset(t *testing.T) {
    // Test implementation
}

func Test_DeleteAsset(t *testing.T) {
    // Test implementation
}
```

---

## Summary

**Organization principles:**

1. **Domain grouping** - Related operations together
2. **Alphabetical order** - Predictable file ordering
3. **Size balance** - Target under 300 lines
4. **Clear naming** - File name matches domain

**File structure:**

- `helper.go` - Core TestHelper definition
- `{domain}.go` - Domain-specific operations
- `{domain}_test.go` - Tests for domain operations

**Benefits:**

- Easy navigation
- Clear separation of concerns
- Maintainable codebase
- Scalable structure

**When adding operations:**

- Choose appropriate domain file
- Follow CRUD ordering pattern
- Keep files under 300 lines when possible
- Create new domain file if justified
