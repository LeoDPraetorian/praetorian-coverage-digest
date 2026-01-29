# Transformation Examples

**Complete before/after examples available at:**
- [examples/authz-initial.md](examples/authz-initial.md) → [examples/authz-reviewed.md](examples/authz-reviewed.md)
- [examples/phishing-initial.md](examples/phishing-initial.md) → [examples/phishing-reviewed.md](examples/phishing-reviewed.md)

## Key Transformation Patterns

### Pattern 1: Recommendation Structure
Before: `Praetorian recommends [Client] implement X.`
After: `Praetorian suggests {{client_short}} consider implementing X.`

### Pattern 2: Impact Enhancer Removal
Before: `critical vulnerability...significant impact...extensive authentication...widespread access`
After: `vulnerability...impacted...authentication...access to multiple endpoints`

### Pattern 3: Hedging and Impact Reduction
Before: `Attackers could exploit this to gain complete control`
After: `Attackers may be able to gain administrative access`

### Pattern 4: Technical vs. Business Impact
Before: `could result in financial losses and brand damage`
After: `could allow unauthorized access to payment data`

Refer to the example files in `examples/` for complete line-by-line transformations.
