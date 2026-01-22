## 2026-01-13 - Add Go-Specific Skills and Quality Guidelines

**Changes:**

1. Added Go-Specific Skills table in Step 2 referencing:
   - `implementing-golang-tests` (testify mandate)
   - `go-best-practices` (CLI structure, function org, early returns)
   - `adhering-to-yagni` (Go anti-patterns)

2. Expanded Code Quality section with:
   - Function organization (exported first, helpers last)
   - Early returns (max 2 levels nesting)
   - CLI structure (thin main.go + pkg/runner)

3. Added Testing Requirements section:
   - Testify mandate (ALWAYS use assert/require)
   - Never use t.Error/t.Errorf/t.Fatal/t.Fatalf

4. Added YAGNI Violations to Avoid section:
   - Interface compliance vars
   - Version scaffolding
   - Useless comments

**Why:**
Julius code review showed backend-developer producing code with:

- t.Error instead of testify
- Interface compliance vars
- Version scaffolding
- Useless comments
- Poor function organization

These additions make the agent aware of Praetorian Go patterns.
