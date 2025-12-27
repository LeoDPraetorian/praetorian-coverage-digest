# Source Quality Criteria

## Overview

Sources are scored using a weighted system that prioritizes official documentation and recognized experts.

## Scoring System

### Base Scores by Type

| Source Type     | Base Score | Decay Rate | Notes                       |
| --------------- | ---------- | ---------- | --------------------------- |
| Official Docs   | 100        | 0%         | Always authoritative        |
| GitHub Repo     | 95         | 0%         | Source code is ground truth |
| GitHub Examples | 92         | 0%         | Official examples           |
| Maintainer Blog | 85         | 5%/year    | Expert insights             |
| Quality Blog    | 70         | 10%/year   | Vetted content              |
| Article         | 50         | 15%/year   | General tutorials           |

### Score Modifiers

Modifiers are applied after base score calculation:

```typescript
interface ScoreModifier {
  reason: string; // Why this modifier was applied
  delta: number; // Points to add/subtract
}
```

### Trusted Domain Boosts

Known high-quality domains receive automatic boosts:

| Domain              | Boost | Rationale                       |
| ------------------- | ----- | ------------------------------- |
| tanstack.com        | +20   | Official TanStack documentation |
| react.dev           | +18   | Official React documentation    |
| github.com/tanstack | +15   | Official source code            |
| tkdodo.eu           | +15   | TanStack Query maintainer       |
| kentcdodds.com      | +12   | Testing Library creator         |
| joshwcomeau.com     | +10   | Renowned React educator         |

## Quality Indicators

### High Quality (Score >= 90)

- Official documentation
- GitHub repositories with active maintenance
- Maintainer blogs

Display: ✅

### Medium Quality (Score 70-89)

- Quality blogs from recognized experts
- Well-maintained community resources

Display: ⭐

### Lower Quality (Score < 70)

- General tutorials
- Older articles
- Unvetted sources

Display: ⚠️

## Filtering Strategy

### For Skill Generation

1. Auto-select sources with score >= 70
2. Prioritize official docs and maintainer content
3. Limit to 10 highest-scoring sources per category

### For User Review

1. Display all sources with scores
2. Highlight trusted domains
3. Show modifiers that affected score

## Implementation

```typescript
function scoreSource(source: WebSource): WebSource {
  const modifiers: ScoreModifier[] = [];
  let score = SOURCE_WEIGHTS[source.type].base;

  // Apply trusted domain boost
  for (const [domain, boost] of Object.entries(TRUSTED_DOMAINS)) {
    if (source.url.includes(domain)) {
      score += boost;
      modifiers.push({ reason: `Trusted domain: ${domain}`, delta: boost });
      break;
    }
  }

  // Apply age decay (future implementation)
  // const ageYears = getSourceAge(source);
  // const decay = SOURCE_WEIGHTS[source.type].decay * ageYears;
  // score -= decay;

  return { ...source, score, modifiers };
}
```

## Adding New Trusted Domains

When adding domains to the trusted list:

1. Verify the author/organization is recognized in the community
2. Check for consistent, high-quality content
3. Confirm active maintenance
4. Assign boost based on authority level:
   - Official docs/maintainers: +15-20
   - Recognized experts: +10-15
   - Quality content creators: +5-10
