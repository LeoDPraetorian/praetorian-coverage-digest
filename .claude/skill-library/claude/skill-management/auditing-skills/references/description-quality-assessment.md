# Description Quality Assessment

**MANDATORY evaluation of skill descriptions during semantic review.**

> This assessment is NOT optional. Description quality directly impacts skill discoverability. A skill with poor description = invisible skill.

---

## 5-Criteria Framework

**You MUST evaluate every skill's description against these 5 criteria:**

| Criterion           | Question to Answer                                          | Failure Example                                          |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| **Accuracy**        | Does the description match what the skill actually does?    | Description says 'testing' but skill is about deployment |
| **Completeness**    | Does it explain both WHAT and WHEN?                         | Missing trigger scenarios                                |
| **Specificity**     | Is it specific enough to differentiate from similar skills? | 'Use when working with React' (too vague)                |
| **Discoverability** | Does it include terms users would actually search for?      | Missing key API names, error messages, or symptoms       |
| **Honesty**         | Does it avoid overpromising or misleading?                  | Claims 'comprehensive' but only covers basics            |

---

## How to Assess

1. Read the description from frontmatter
2. Skim the skill content (headers, key sections)
3. For each criterion, ask the question
4. If ANY criterion fails, add to semantic findings JSON:

```json
{
  "severity": "WARNING",
  "criterion": "Description Quality",
  "issue": "[Specific problem found]",
  "recommendation": "[Concrete fix suggestion]"
}
```

---

## Examples of Issues to Report

- **Inaccurate**: 'Description says TDD but skill focuses on debugging'
- **Missing trigger term**: 'skill handles useQuery errors but description doesn't mention useQuery'
- **Too generic**: '12 skills match this description, add specific use cases'
- **Overpromises**: 'claims complete coverage but missing X, Y, Z patterns'

---

## Severity Guidance

| Severity     | When to Use                                                             |
| ------------ | ----------------------------------------------------------------------- |
| **CRITICAL** | Description completely misrepresents skill (e.g., wrong domain/purpose) |
| **WARNING**  | Description is vague, missing key terms, or moderately misleading       |
| **INFO**     | Minor improvements possible but skill is still discoverable             |

---

## Integration with Semantic Review

This assessment is **item #1** in the Semantic Review Checklist. Complete it BEFORE moving to other criteria.

**Workflow:**

1. Run structural audit (CLI)
2. Begin semantic review
3. **FIRST**: Complete Description Quality Assessment (this document)
4. Continue with remaining 5 checklist items
5. Output findings as JSON
6. Invoke merge command

**⚠️ AUDIT IS INCOMPLETE** if you skip this assessment.
