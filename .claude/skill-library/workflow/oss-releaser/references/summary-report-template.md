# OSS Release Summary Report Template

```markdown
# OSS Release Preparation Summary

**Repository:** {repository-name}
**Date:** {YYYY-MM-DD}
**Prepared By:** {your-name or "Automated"}
**Status:** {Ready for Release | Needs Review | Blocked}

## Executive Summary

{1-2 sentence summary of readiness state}

## Compliance Status

| Item               | Status | Notes                                   |
| ------------------ | ------ | --------------------------------------- |
| GitHub Description | ✓/✗    | {current description or "missing"}      |
| GitHub Topics      | ✓/✗    | {N topics} or "none set"                |
| LICENSE            | ✓/✗    | Apache 2.0 / {other} / missing          |
| README.md          | ✓/✗    | {sections: Installation, Usage, etc.}   |
| CONTRIBUTING.md    | ✓/✗    | {customized for stack} / missing        |
| CODE_OF_CONDUCT.md | ✓/✗    | Contributor Covenant v2.1 / missing     |
| SECURITY.md        | ✓/✗    | Vulnerability reporting / missing       |
| Copyright Headers  | ✓/✗    | {N/M files} ({percentage}%)             |
| Secret Scan        | ✓/✗    | {N findings} - {severity breakdown}     |
| Internal Refs      | ✓/✗    | {N findings} requiring manual review    |

## Copyright Headers

- **Total source files:** {count}
- **Headers added:** {count}
- **Headers updated:** {count}
- **Already present (skipped):** {count}
- **Errors:** {count}

**Languages processed:**
- Go: {count} files
- Python: {count} files
- TypeScript: {count} files
- JavaScript: {count} files
- Rust: {count} files

## Security Scan Results

### Secrets Detection (gitleaks)

**Status:** {PASS / REVIEW REQUIRED / FAIL}

- **Total findings:** {count}
- **High severity:** {count}
- **Medium severity:** {count}
- **Low severity / False positives:** {count}

**Files requiring review:**
1. `{file:line}` - {description}
2. `{file:line}` - {description}

### Internal References

**Status:** {PASS / REVIEW REQUIRED}

- **Total findings:** {count}
- **Internal domains:** {count}
- **Internal emails:** {count}
- **Do-not-share markers:** {count}

**Review required:** See `internal-references.txt` for full list

## Action Items

### 🔴 Critical (Must Fix Before Release)

- [ ] {item-1} - {reason why critical}
- [ ] {item-2} - {reason why critical}

**Blocker:** Cannot proceed to public release until these are resolved.

### 🟡 Recommended (Should Fix)

- [ ] {item-1} - {impact if not fixed}
- [ ] {item-2} - {impact if not fixed}

**Impact:** Can release but may affect discoverability/contributor experience.

### 🟢 Optional (Nice to Have)

- [ ] {item-1} - {benefit if implemented}
- [ ] {item-2} - {benefit if implemented}

**Impact:** Minor quality-of-life improvements.

## GitHub Metadata

### Repository Description

**Current:** `{current description or "not set"}`

**Recommendation:**
```
{suggested description optimized for SEO, 80-160 chars}
```

**Keywords included:** {keyword-1}, {keyword-2}, {keyword-3}

### Repository Topics

**Current:** {topic-1}, {topic-2}, ...  or "none set"

**Recommendation:**
```
{suggested topics, 5-8 total}
```

**Categories covered:**
- Primary function: {example}
- Technology stack: {example}
- Use case: {example}
- Domain: {example}

## Tech Stack Customization Status

**Detected Stack:** {Go | Python | TypeScript + React | Rust | etc.}

**CONTRIBUTING.md:**
- [ ] Prerequisites match detected stack
- [ ] Development setup commands verified
- [ ] Testing commands verified
- [ ] Domain-specific sections added (if applicable)

## Files Modified

### Created

- `LICENSE` - Apache 2.0
- `CODE_OF_CONDUCT.md` - Contributor Covenant v2.1
- `SECURITY.md` - Vulnerability reporting policy
- `CONTRIBUTING.md` - Contribution guidelines ({customized | needs customization})

### Modified

- `README.md` - Added license badge, contributing link
- {list other modified files}

### Copyright Headers Added

- {count} `.go` files
- {count} `.py` files
- {count} `.ts/.tsx` files
- {count} `.js/.jsx` files

## Verification Checklist

- [ ] All copyright headers added successfully
- [ ] LICENSE file validated (Apache 2.0)
- [ ] Required documentation present
- [ ] CONTRIBUTING.md customized for tech stack
- [ ] No high-severity secrets detected
- [ ] Internal references reviewed and resolved/documented
- [ ] GitHub description set (80-160 chars with keywords)
- [ ] GitHub topics set (5-8 relevant topics)
- [ ] README includes all required sections
- [ ] Build passes from clean checkout
- [ ] Tests pass (if applicable)

## Next Steps

1. **Review Action Items:** Address all Critical items, consider Recommended items
2. **Manual Review:** Review flagged secrets and internal references in detail
3. **Test Clean Build:** Clone fresh copy and verify build/test process works
4. **Stakeholder Review:**
   - Engineering lead sign-off
   - Legal review (if first OSS release)
   - Security team review (if sensitive domains)
5. **Final Approval:** Get explicit approval before making repository public
6. **Make Public:** Change repository visibility via GitHub settings or `gh repo edit --visibility public`
7. **Announce:** Update company blog, social media, relevant communities

## Notes

{Any additional context, special considerations, or gotchas}

## Artifacts Generated

- `oss-release-report-{date}.md` - This report
- `gitleaks-report.json` - Secret scan results
- `internal-references.txt` - Internal reference findings
- `backup/pre-oss-release-{date}` - Git branch with pre-modification state

---

**Report Generated:** {timestamp}
**Tool:** oss-releasing skill v1.0
```
