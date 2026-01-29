# Anti-Patterns in NRF Document Review

Common mistakes to avoid when transforming documents for NRF compliance.

## ❌ Incomplete Transformation

**Wrong:** Apply only language changes, skip style enforcement.

**Why:** NRF guidelines require comprehensive compliance - language, style, format, and structure.

**Fix:** Complete all transformation phases (Language → Style → Structure → Content).

## ❌ Over-Hedging Verified Findings

**Wrong:** Add "may" and "could" to every single statement, even verified vulnerabilities.

**Example:**
- ❌ "Praetorian may have discovered what could potentially be a vulnerability"
- ✅ "Praetorian discovered a vulnerability" (when testing confirmed it exists)

**Why:** Hedging applies to potential impacts and business consequences, NOT to factually demonstrated vulnerabilities.

**Fix:** Hedge impact predictions, not verified technical findings.

## ❌ Removing Technical Detail

**Wrong:** Simplify technical descriptions to avoid complexity.

**Example:**
- ❌ "The system had security problems" (vague)
- ✅ "The GraphQL API authorization logic validated tenantId but not realmId parameters" (precise)

**Why:** Technical precision is required. Simplify language structure, not technical content.

**Fix:** Use plain language for sentence structure while preserving technical accuracy.

## ❌ Over-Neutralizing Attack Terminology

**Wrong:** Change "malicious actor" → "actor", "attacker" → "user", "harmful" → "unintended".

**Example:**
- ❌ "An actor could access the system" (loses threat context)
- ✅ "A malicious actor could access the system" (preserves security context)

**Why:** Attack terminology is acceptable and required for technical accuracy. Only remove business impact language and impact enhancers.

**Fix:** Preserve attack terminology when describing threat scenarios. Remove only:
- Business impact terms (revenue, reputation)
- Impact enhancers (critical, severe, devastating)
- Qualitative assessments ("significant damage")

## ❌ Over-Modification

**Wrong:** Rewrite compliant sentences, restructure paragraphs, or add unnecessary hedging.

**Example:**
- Original (compliant): "The API returned unauthorized data to the test user."
- ❌ Changed: "The API appeared to potentially return what may be unauthorized data to the test user."

**Why:** NRF review is about targeted compliance fixes, not comprehensive rewriting. If it's not broken, don't fix it.

**Fix:** Use the Minimal Change Principle - only modify what NRF guidelines specifically require.
