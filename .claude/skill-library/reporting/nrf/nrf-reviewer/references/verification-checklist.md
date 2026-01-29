# Verification Checklist

**Checklist for NRF compliance validation.**

## Quick Validation Commands

```bash
# Check for prohibited terms (expect zero)
grep -niE "(recommend|should|must|ensure)" output.md

# Check for impact enhancers (expect zero)
grep -nE "(critical|extensive|substantial|significant|systemic|systematic|fundamental|devastating|severe|widespread)" output.md

# Check for business impact terms (expect zero)
grep -niE "(revenue|financial|brand|reputation|customer trust|business)" output.md
```

## Compliance Categories

Refer to SKILL.md for detailed guidance on each category:

- **Language:** Prohibited terms removed, hedging applied appropriately
- **Style:** Technical impacts only, no business impacts
- **Structure:** Correct headers, LaTeX formatting for prelim obs
- **Content:** Client references templated, present participle in suggestions
