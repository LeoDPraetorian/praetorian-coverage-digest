# Build Prerequisites

**Requirements for successful hypercube-ng extension builds.**

---

## System Requirements

**Required files in modules/hypercube-ng/:**

- Go 1.16+ installed (`go version` to verify)
- Firebase CLI authenticated (`firebase projects:list` to verify)
- Write access to `modules/hypercube-ng/` directory

**Recommended Go version:** 1.24+ for latest WASM features and optimizations

---

## Environment Verification

**Before starting build:**

```bash
# Verify Go installation
go version
# Expected: go version go1.24.x or higher

# Verify Firebase CLI authentication
firebase projects:list
# Should list accessible projects without errors

# Verify write access to build directory
touch modules/hypercube-ng/.write-test && rm modules/hypercube-ng/.write-test
# Should complete without permission errors
```

---

## Generated Files (gitignored)

**Agent will create these files during deployment:**

- `client.json` - Firebase web app credentials
- `serviceAccountKey.json` - Service account keys for operator proxy
- `output/<timestamp>/` - Build artifacts directory

**These files are automatically gitignored** and must not be committed to version control.

---

## Common Issues

**Go not installed:**
- Install from https://go.dev/dl/
- Ensure Go is in PATH: `echo $PATH | grep go`

**Firebase CLI not authenticated:**
- Run: `gcloud auth application-default login`
- Verify: `firebase projects:list`

**Write permission denied:**
- Check directory ownership: `ls -la modules/hypercube-ng/`
- May need to run with appropriate permissions
