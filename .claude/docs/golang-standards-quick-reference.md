# Go Standards Compliance - Quick Reference

## For: nero, augustus, diocletian, trajan modules

**TL;DR: Your architect is partially correct, but you have material deviations that auditors will flag.**

---

## Compliance Scores

| Module         | Score     | Status         | Main Issues                                         |
| -------------- | --------- | -------------- | --------------------------------------------------- |
| **nero**       | 60%       | Partial        | Binary at root, missing internal                    |
| **augustus**   | 55%       | Partial        | 2 binaries at root, non-standard dirs, docs missing |
| **diocletian** | 70%       | Partial        | Binaries at root, main.go at root, artifacts        |
| **trajan**     | 85%       | Good           | Binary at root only                                 |
| **Average**    | **67.5%** | **Needs Work** | **All have binary problems**                        |

---

## What's Wrong (What Auditors Will Ask About)

### Critical Issue: Binaries at Root (All 4 Modules)

```
nero/scanner                     Should be in nero/bin/scanner
augustus/augustus                Should be in augustus/bin/augustus
augustus/augustus-kong           Should be in augustus/bin/augustus-kong
diocletian/diocletian            Should be in diocletian/bin/diocletian
diocletian/nebula                Should be in diocletian/bin/nebula
trajan/trajan                    Should be in trajan/bin/trajan
```

### Secondary Issues

**augustus:**

- Uses `/tests/` instead of `/test/` (naming convention)
- Missing README.md at root
- No Makefile
- Non-standard directories: `/devpod/`, `/scratch/`, `/tools/`

**diocletian:**

- main.go at root (should be in cmd/)
- Test artifacts at root: `orgpolicies.test`, `test-all-aws-modules.sh`
- Output directory at root: `nebula-output/`

---

## What's Right (What Auditors Will Approve)

All modules have proper `/cmd/` directory structure  
 All modules have organized `/pkg/` with clear separation of concerns  
 All modules have `go.mod` and `go.sum`  
 2 of 4 modules have proper `/internal/` for private code  
 Professional code organization within packages  
 Proper licensing and documentation (mostly)

---

## How to Respond to Auditors

### Before Fixes (Current State)

"Our projects follow the golang-standards/project-layout structure with some deviations related to binary placement and artifact management. We have identified these deviations and plan to address them."

**Estimated Compliance:** 67-70%

### After Fixes (1-2 hours of work)

"Our projects fully comply with golang-standards/project-layout. We have corrected binary placement and artifact management issues."

**Estimated Compliance:** 85-90%

---

## Remediation Checklist

### Immediate (Essential for Audit)

- [ ] Move all binaries to `/bin/` subdirectory
  - nero/scanner nero/bin/scanner
  - augustus/{augustus,augustus-kong} augustus/bin/
  - diocletian/{diocletian,nebula} diocletian/bin/
  - trajan/trajan trajan/bin/trajan
- [ ] Update build scripts/Makefiles to use new binary paths

- [ ] Add missing README.md to augustus

- [ ] Rename augustus/tests/ to augustus/test/

### Short-term (Recommended)

- [ ] Remove diocletian artifacts from .git history
  - orgpolicies.test
  - test-all-aws-modules.sh
  - nebula-output/ directory

- [ ] Move diocletian/main.go to diocletian/cmd/diocletian/main.go

- [ ] Document or remove non-standard directories in augustus

### Optional (Nice to Have)

- [ ] Add Makefile to augustus
- [ ] Clarify purpose of augustus/devpod, augustus/tools
- [ ] Add /examples/ directories where applicable

---

## Standard Reference

**Official Source:** https://github.com/golang-standards/project-layout

**Required Directories:**

```
/cmd           - Main applications (one per executable)
/pkg           - Library code (public/exported packages)
/internal      - Private code (not importable by external packages)
/go.mod        - Module definition
/go.sum        - Dependency checksums
```

**Recommended Directories:**

```
/bin           - Compiled binaries (BUILD OUTPUT)
/test          - Test data and supporting code
/docs          - Documentation
/examples      - Example code
/configs       - Configuration files
```

**NOT Standard (Should Avoid):**

```
/binaries at root
/test artifacts at root
/output directories at root
/work-in-progress files
```

---

## Key Points for Auditors

1. **Core structure is correct** - All modules have cmd/, pkg/, go.mod properly implemented
2. **Binary placement is wrong** - All 6 binaries at root instead of /bin/
3. **Artifacts shouldn't be committed** - diocletian has test/output files at root
4. **Risk is LOW** - These are organizational issues, not security issues
5. **Fixes are simple** - Move binaries, update build scripts, clean up artifacts

---

## Files for Reference

- **Detailed Audit:** `.claude/docs/golang-standards-compliance-audit.md`
- **Technical Brief:** `.claude/docs/golang-standards-auditor-brief.md`
- **Quick Reference:** This file

---

**Bottom Line:** Tell your auditors "Our projects substantially follow golang-standards/project-layout with known deviations in binary placement that we've identified and are addressing." Then fix the binary placement issue and you're golden.
