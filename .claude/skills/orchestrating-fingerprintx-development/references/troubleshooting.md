# Troubleshooting

Common issues at each phase and how to resolve them.

## Phase 1: Requirements Gathering

### Issue: User doesn't know if source code is available

**Symptoms**: User says "I don't know" or "maybe" for source availability question

**Solution**:

1. Ask for protocol/service name
2. Search GitHub: `site:github.com "{protocol} server"` or `site:github.com "{service}"`
3. Check official website for "Source" or "Download" links
4. If found: Provide URL and mark as open-source
5. If not found after 5 minutes: Mark as closed-source, proceed with banner-only version detection

### Issue: Similar protocols unclear

**Symptoms**: User says "I don't know any similar protocols"

**Solution**:

1. Ask about the protocol category (database, message queue, cache, etc.)
2. Suggest common protocols in that category
3. If truly unique: Document "No similar protocols identified" and note this simplifies false positive mitigation

### Issue: No existing reference plugins

**Symptoms**: User says "This is the first plugin of this type"

**Solution**:

- Check existing plugins in `pkg/plugins/services/` for ANY similar pattern (TCP vs UDP, banner-based vs probe-based)
- Use the closest match as reference even if different protocol family
- Document "No direct reference plugins, using {closest-match} as pattern reference"

---

## Phase 2: Open-Source Decision

### Issue: Partial source availability

**Symptoms**: "Some versions are open-source, some are proprietary"

**Solution**:

- If ≥3 major versions are open-source: Treat as open-source, version research REQUIRED
- If <3 versions available: Treat as closed-source, version research SKIP
- Document the availability situation in requirements.md

### Issue: Source code exists but not in Git

**Symptoms**: "Source is in tarballs on the website, not GitHub"

**Solution**:

- Treat as open-source if you can access 3+ version source tarballs
- Use manual source comparison instead of `gh` CLI
- Document the manual process in version-matrix.md
- Increase time estimate for Phase 4 (manual analysis slower)

---

## Phase 3: Protocol Research Gate

### Issue: Docker container not available for protocol

**Symptoms**: "No official Docker image for {protocol}"

**Solution**:

1. Search Docker Hub for community images
2. Try `docker search {protocol}` and pick highest star count
3. If no Docker images: Use local installation or cloud service
4. Document non-Docker lab setup in protocol-research.md
5. Include setup commands for reproducibility

### Issue: Protocol doesn't respond to probes

**Symptoms**: Lab testing shows no response or timeout

**Solution**:

1. Verify service is actually running: `docker ps`, `docker logs`
2. Check port binding: `netstat -an | grep {port}`
3. Test with standard client first (e.g., `mysql -h localhost -P 3306`)
4. Some protocols require authentication handshake - document this
5. Update probe strategy to handle silent protocols

### Issue: Cannot distinguish from similar protocol

**Symptoms**: Both MySQL and MariaDB return similar responses

**Solution**:

1. Look for version-specific markers in handshake
2. Check capability flags (bit fields often differ)
3. Test behavior differences (send invalid command, compare errors)
4. If truly indistinguishable: Document best-effort detection with confidence level
5. May need Phase 4 version research to distinguish at version level

### Issue: Gate checklist incomplete but "close enough"

**Symptoms**: 4 out of 5 items complete, agent wants to proceed

**Response**: **DENIED**. Gate is all-or-nothing. Complete the missing item.

**Why**: "Close enough" gates are not gates. Missing items cause production failures.

---

## Phase 4: Version Marker Research Gate

### Issue: Source code analysis overwhelming

**Symptoms**: "There are 50+ versions, can't analyze them all"

**Solution**:

1. Focus on major version boundaries (5.x → 6.x → 7.x → 8.x)
2. Within major versions, sample every 5th minor version
3. Identify the version range where behavior changed, then binary search for exact change
4. Minimum 3 version ranges required (major.x, major-1.x, major-2.x)

### Issue: No distinguishing markers found

**Symptoms**: "All versions look the same in source code"

**Solution**:

1. Expand search: Check constants, defaults, feature flags, protocol changes
2. Look in different files: handshake code, configuration defaults, protocol implementation
3. Check release notes for "Breaking changes" or "New features"
4. If truly no markers after thorough analysis: Document and use banner-only detection
5. Consider if protocol is actually stable across versions (rare but possible)

### Issue: Markers have low confidence

**Symptoms**: "This marker works for 70% of cases, not 100%"

**Solution**:

- Mark as MEDIUM or LOW confidence, not HIGH
- Use multiple markers in decision tree (if marker_A AND marker_B → version X)
- Document the confidence level and uncertainty
- Fallback CPE with wildcard for uncertain cases: `cpe:2.3:a:vendor:product:*:::::::*`

### Issue: CPE vendor/product names unclear

**Symptoms**: "Is it 'mysql' or 'MySQL' or 'mysql-server'?"

**Solution**:

1. Search CPE database: https://nvd.nist.gov/products/cpe/search
2. Use exact vendor/product names from NVD
3. If not in NVD: Use lowercase, hyphenated form: `mysql`, `postgres`, `redis`
4. Document CPE research source

### Issue: Fewer than 3 version ranges distinguishable

**Symptoms**: "I can only distinguish 2 version ranges"

**Response**: **GATE FAILS**. Must have ≥3 ranges for useful version detection.

**Solution**:

1. Expand analysis to older versions
2. Look for minor version differences within major versions
3. If truly only 2 ranges: Document and proceed with 2, but note reduced precision
4. Gate override MAY be appropriate if truly impossible to distinguish 3+ ranges

---

## Phase 5: Implementation

### Issue: Plugin doesn't compile

**Symptoms**: `go build` fails with type errors

**Solution**:

1. Check if you imported plugin in `pkg/scan/plugin_list.go`
2. Verify type constant added to `pkg/plugins/types.go` (alphabetically)
3. Ensure plugin struct implements all 5 methods from interface
4. Check method signatures match interface exactly
5. Run `go vet` for suspicious constructs

### Issue: Not sure how to implement two-phase detection

**Symptoms**: "What's detect vs enrich?"

**Solution**:

- **Detect phase**: Minimal probe to confirm protocol (fast, no version)
- **Enrich phase**: Additional analysis for version/metadata (slower, optional)
- Pattern: `Detect()` returns basic protocol info, `Version()` returns version string
- See reference plugins: `mongodb`, `postgresql` for examples

### Issue: Version extraction not matching matrix predictions

**Symptoms**: "Matrix says version 8.x, but plugin detects 5.x"

**Solution**:

1. Verify you're testing against correct Docker image version
2. Check that marker detection logic matches matrix decision tree exactly
3. Add debug logging to see which branch of decision tree is taken
4. May need to refine matrix if real-world behavior differs from source analysis

---

## Phase 6: Validation Gate

### Issue: Tests pass but manual verification fails

**Symptoms**: `go test` passes, `fingerprintx -t` returns wrong protocol

**Solution**:

1. Check that tests are actually testing real detection logic (not mocked)
2. Manual verification uses different code path - may reveal untested cases
3. Add test case that reproduces manual failure
4. Fix detection logic, re-run both tests and manual verification

### Issue: Version detection accuracy below 80%

**Symptoms**: "7 out of 10 version tests pass"

**Solution**:

1. Identify which versions are failing
2. Check if failing versions are edge cases (very old, pre-release, etc.)
3. Refine decision tree for failing versions
4. Consider marking those versions as LOW confidence
5. If accuracy can't reach 80%: Document limitation and use fallback CPE

### Issue: CPE format invalid

**Symptoms**: CPE doesn't match `cpe:2.3:a:vendor:product:version:::::::*`

**Solution**:

- Check for typos: `cpe:2.3:a:` prefix required
- Verify vendor/product are lowercase, hyphenated
- Version should be exact version string (no wildcards unless unknown)
- Trailing `:::::::*` required for CPE 2.3 format
- Test CPE against validator: https://nvd.nist.gov/products/cpe

### Issue: "Just one TODO comment left, can I proceed?"

**Response**: **DENIED**. No TODO comments allowed for CPE or version detection.

**Why**: TODOs indicate incomplete implementation. Complete it now or it won't get completed.

---

## Phase 7: Integration & PR Preparation

### Issue: Type constant not alphabetically ordered

**Symptoms**: Lint check or code review flags ordering

**Solution**:

1. Open `pkg/plugins/types.go`
2. Find your constant in the list
3. Move it to correct alphabetical position
4. Same for import in `pkg/scan/plugin_list.go`

### Issue: Package comment missing or inadequate

**Symptoms**: "// Package {protocol}" is the only comment

**Solution**:

```go
// Package mysql provides service fingerprinting for MySQL database servers.
// Detection uses handshake packet analysis with capability flag validation.
// Version detection distinguishes MySQL 8.x, 5.7.x, and 5.6.x via default settings.
package mysql
```

### Issue: PR description missing research documents

**Symptoms**: User says "I'll attach them later"

**Response**: Attach them now. PR description must be self-contained.

**Solution**:

- Use `<details>` tags for long documents
- Inline protocol-research.md and version-matrix.md in PR description
- Alternatively: Link to `.claude/.output/capabilities/{YYYY-MM-DD-HHMMSS}-{protocol}-*/` directory

---

## Cross-Phase Issues

### Issue: Lost artifacts between phases

**Symptoms**: "I can't find the protocol-research.md file"

**Solution**:

1. Check `.claude/.output/capabilities/` for feature directories
2. Look for `{YYYY-MM-DD-HHMMSS}-{protocol}-fingerprintx/`
3. If lost: Regenerate from Phase 3 (research must be redone)
4. Use MANIFEST.yaml to track artifact locations

### Issue: Gate check unclear

**Symptoms**: "I think the gate should pass, but not sure"

**Solution**:

1. Review [references/gate-checklist.md](gate-checklist.md) for explicit criteria
2. Each gate item must be checkable - if uncertain, it's not complete
3. Ask user if override is appropriate (RARE)
4. When in doubt: Gate fails, return to phase and complete

### Issue: Time pressure to skip research

**Symptoms**: "Can we skip version research? We need this done today"

**Response**: **DENIED**. Research phases are non-negotiable.

**Why**: Skipping research causes 10x rework later. Fast + wrong is slower than thorough.

**Solution**:

1. Explain time cost of technical debt (~10% fix rate)
2. Estimate actual time: Phase 3 (2-3 hours), Phase 4 (3-4 hours)
3. Offer to proceed with proper workflow or delay feature
4. Gate override option (RARE) with explicit user acknowledgment

### Agent Blocked During Phase

When a phase agent returns `status: blocked`:

1. **Check `blocked_reason`** in agent output metadata
2. **Consult routing table** in `orchestrating-multi-agent-workflows` skill
3. **Common fingerprintx blockers**:
   - `missing_requirements` → Return to Phase 1 for more user input
   - `architecture_decision` → Consult capability-developer or security-lead
   - `out_of_scope` → Protocol may not be suitable for fingerprintx (document and escalate)

**Do NOT guess next agent** - use the routing table or escalate to user via AskUserQuestion.

---

## When to Restart vs Continue

### Restart if:

- Protocol research document is fundamentally flawed (wrong protocol analyzed)
- Version matrix is based on wrong source repository
- Implementation doesn't follow fingerprintx patterns at all

### Continue if:

- Minor corrections needed (typos, formatting)
- Additional version ranges can be added incrementally
- Gate checklist has 1-2 items missing (complete them, don't restart)

---

## Escalation

If you encounter issues not covered here:

1. Search existing fingerprintx plugins for similar patterns: `pkg/plugins/services/`
2. Review fingerprintx README: `modules/fingerprintx/README.md`
3. Check fingerprintx contribution guide (if exists)
4. Ask user for guidance on domain-specific protocol knowledge

**Do not proceed with uncertain gate passes** - blocked is better than wrong.
