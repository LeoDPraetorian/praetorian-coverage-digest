# Agent Recommendation Patterns

> **Single Source of Truth** for skill-to-agent matching algorithm (Phase 15).

## Purpose

When a new skill is created, this algorithm recommends which agents should incorporate it, preventing:

- **Orphaned skills** - Skills no agent can discover
- **Ecosystem fragmentation** - Capabilities not propagated to relevant agents
- **Manual discovery burden** - No need to search 55+ agents manually

## Match Score Algorithm

### Scoring Model

```typescript
interface MatchScore {
  agent: string;
  score: number; // 0-100
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  action: string; // Recommended integration approach
}

// Confidence thresholds
// HIGH: score >= 70 (definitely should use)
// MEDIUM: score >= 40 (consider using)
// LOW: score < 40 (unlikely match)
```

### Factor Weights

| Factor             | Weight | Description                                   |
| ------------------ | ------ | --------------------------------------------- |
| Domain Match       | 40%    | Skill domain aligns with agent's domain       |
| Trigger Overlap    | 30%    | Skill triggers overlap with agent's use cases |
| Tool Compatibility | 15%    | Skill's tools available to agent              |
| Similar Skills     | 15%    | Agent already uses related skills             |

### Factor Calculation

#### 1. Domain Match (40 points max)

Extract domain from skill path and match against agent domain.

```typescript
function calculateDomainScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillDomain = extractDomain(skill.path);
  const agentDomain = extractDomain(agent.path);

  // Exact match: 40 points
  if (skillDomain === agentDomain) return 40;

  // Parent/child relationship: 30 points
  if (isParentDomain(skillDomain, agentDomain) || isParentDomain(agentDomain, skillDomain))
    return 30;

  // Adjacent domains (testing ↔ development): 20 points
  if (areAdjacentDomains(skillDomain, agentDomain)) return 20;

  // No relationship: 0 points
  return 0;
}

// Domain hierarchy
const DOMAIN_HIERARCHY = {
  development: ["frontend", "backend", "python"],
  testing: ["frontend-testing", "backend-testing", "e2e"],
  quality: ["review", "analysis"],
  architecture: ["frontend-architecture", "backend-architecture", "security"],
  claude: ["skill-management", "agent-management"],
};

// Adjacent domain pairs
const ADJACENT_DOMAINS = [
  ["development", "testing"],
  ["development", "quality"],
  ["architecture", "development"],
  ["security", "testing"],
];
```

#### 2. Trigger Overlap (30 points max)

Compare skill description triggers with agent triggers.

```typescript
function calculateTriggerScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillTriggers = extractTriggers(skill.description);
  const agentTriggers = extractTriggers(agent.description);

  // Calculate Jaccard similarity
  const intersection = skillTriggers.filter((t) => agentTriggers.some((at) => fuzzyMatch(t, at)));
  const union = new Set([...skillTriggers, ...agentTriggers]);

  const similarity = intersection.length / union.size;
  return Math.round(similarity * 30);
}

function extractTriggers(description: string): string[] {
  // Extract key phrases after "Use when"
  const useWhenMatch = description.match(/Use when (.+?)(?:\s*[-–—]|$)/i);
  if (!useWhenMatch) return [];

  const triggers = useWhenMatch[1]
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2);

  return triggers;
}

function fuzzyMatch(a: string, b: string): boolean {
  // Check for substring match or synonym match
  if (a.includes(b) || b.includes(a)) return true;

  // Check synonym groups
  const SYNONYMS = [
    ["test", "testing", "tests"],
    ["component", "components", "UI"],
    ["api", "endpoint", "REST"],
    ["state", "data", "store"],
    ["debug", "debugging", "troubleshoot"],
    ["style", "styling", "CSS", "tailwind"],
  ];

  return SYNONYMS.some(
    (group) => group.some((s) => a.includes(s)) && group.some((s) => b.includes(s))
  );
}
```

#### 3. Tool Compatibility (15 points max)

Check if agent has access to tools required by skill.

```typescript
function calculateToolScore(skill: SkillMetadata, agent: AgentMetadata): number {
  if (!skill.allowedTools || skill.allowedTools.length === 0) {
    return 15; // No tool requirements = compatible with all
  }

  if (!agent.tools || agent.tools.length === 0) {
    return 0; // Agent has no tools
  }

  // Calculate overlap
  const requiredTools = skill.allowedTools;
  const agentTools = new Set(agent.tools);

  const compatible = requiredTools.filter((t) => agentTools.has(t));
  const compatibility = compatible.length / requiredTools.length;

  return Math.round(compatibility * 15);
}
```

#### 4. Similar Skills (15 points max)

Check if agent already uses skills in same category.

```typescript
function calculateSimilarSkillsScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillCategory = skill.path.split("/").slice(-3, -1).join("/");

  // Get skills agent already references
  const agentSkills = extractSkillReferences(agent.content);

  // Check if any are in same category
  const sameCategory = agentSkills.filter(
    (s) => s.includes(skillCategory) || areSiblingSkills(s, skill.name)
  );

  if (sameCategory.length >= 3) return 15;
  if (sameCategory.length >= 2) return 10;
  if (sameCategory.length >= 1) return 5;
  return 0;
}

function areSiblingSkills(skillA: string, skillB: string): boolean {
  // Skills with same prefix are siblings
  // e.g., "using-tanstack-query" and "using-tanstack-table"
  const prefixA = skillA.split("-").slice(0, 2).join("-");
  const prefixB = skillB.split("-").slice(0, 2).join("-");
  return prefixA === prefixB;
}
```

### Confidence Calculation

```typescript
function calculateConfidence(score: number, factors: FactorScores): Confidence {
  // High confidence requires both high score AND strong domain match
  if (score >= 70 && factors.domain >= 30) return "HIGH";

  // Medium confidence for moderate scores
  if (score >= 40) return "MEDIUM";

  // Low confidence for weak matches
  return "LOW";
}
```

### Action Recommendations

Based on match type, recommend specific integration:

```typescript
function recommendAction(score: MatchScore, agent: AgentMetadata): string {
  if (score.confidence === "HIGH") {
    // High confidence: ensure gateway routing
    if (isGateway(agent)) {
      return `Add to ${agent.name} routing table`;
    }
    return `Reference in ${agent.name} instructions`;
  }

  if (score.confidence === "MEDIUM") {
    return `Consider adding to ${agent.name} (review recommended)`;
  }

  return `Not recommended for ${agent.name}`;
}
```

## Orphan Detection

A skill is "orphaned" if it has no path to discovery:

```typescript
function isOrphanedSkill(skill: SkillMetadata): boolean {
  // Check 1: Is it in a gateway routing table?
  const inGateway = gateways.some((g) => g.routingTable.includes(skill.name));

  // Check 2: Is it referenced in any agent?
  const inAgent = agents.some((a) => a.content.includes(skill.name));

  // Check 3: Is it a core skill (always discoverable)?
  const isCoreSkill = skill.path.includes("/skills/") && !skill.path.includes("/skill-library/");

  return !inGateway && !inAgent && !isCoreSkill;
}
```

## Integration Points

### In `creating-skills` Workflow

After skill creation, automatically run agent recommendation:

```markdown
### Phase 7: Agent Recommendation (After Creation)

1. Run agent matching algorithm
2. Display recommendations:
   - HIGH confidence matches (action required)
   - MEDIUM confidence matches (review suggested)
3. Update gateway routing if needed
4. Document integration decisions in skill's .history/CHANGELOG
```

### In `auditing-skills` Phase 15

Add orphan detection to audit:

```typescript
// Phase 15: Orphan Detection
function auditPhase15(skill: SkillMetadata): AuditResult {
  const isOrphaned = isOrphanedSkill(skill);

  if (isOrphaned) {
    return {
      severity: "WARNING",
      message: `Skill "${skill.name}" has no agent discovery path`,
      suggestion: "Run agent recommendation to find integration points",
    };
  }

  return { severity: "INFO", message: "Skill has agent discovery path" };
}
```

## Example Output

```
Agent Recommendation Analysis
═══════════════════════════════════════════════════════════════

Skill: using-tanstack-query
Domain: development/frontend
Triggers: data fetching, server state, caching

───────────────────────────────────────────────────────────────
HIGH CONFIDENCE (should definitely use):

├── frontend-developer
│   Score: 85/100
│   Domain: 40/40 (exact match: development/frontend)
│   Triggers: 25/30 (matches: data fetching, state)
│   Tools: 15/15 (all tools available)
│   Similar: 5/15 (uses: using-react-query)
│   Action: Ensure gateway-frontend routes to this skill
│
├── frontend-architect
│   Score: 78/100
│   Domain: 30/40 (parent: architecture → development)
│   Triggers: 28/30 (matches: state management)
│   Tools: 15/15 (all tools available)
│   Similar: 5/15 (uses: using-zustand)
│   Action: Reference in architecture decisions section
│
└── frontend-integration-test-engineer
    Score: 72/100
    Domain: 20/40 (adjacent: testing ↔ development)
    Triggers: 27/30 (matches: API integration, data)
    Tools: 15/15 (all tools available)
    Similar: 10/15 (uses: testing-msw, testing-tanstack)
    Action: Add to testing workflow for mocking guidance

───────────────────────────────────────────────────────────────
MEDIUM CONFIDENCE (consider using):

├── frontend-reviewer
│   Score: 55/100
│   Domain: 30/40 (parent: quality → development)
│   Triggers: 15/30 (weak: general frontend)
│   Tools: 10/15 (missing: Bash)
│   Similar: 0/15 (no related skills)
│   Action: Consider adding to review criteria

───────────────────────────────────────────────────────────────
Summary:
  HIGH matches:   3 agents
  MEDIUM matches: 1 agent
  Orphan status:  Not orphaned (gateway-frontend routes)

Next steps:
  1. Verify gateway-frontend includes this skill
  2. Consider updating frontend-developer description
  3. Add to frontend-architect's state management section
═══════════════════════════════════════════════════════════════
```

## Claude Reasoning Layer

When presenting agent recommendations, Claude provides human-readable explanations that go beyond the raw scores.

### Explanation Template

For each HIGH confidence match, generate:

```markdown
**{agent-name}** (Score: {score}/100) - HIGH CONFIDENCE

**Why this agent should use `{skill-name}`:**

- {Domain explanation}: The skill's domain ({skill-domain}) directly aligns with this agent's focus on {agent-focus}
- {Trigger explanation}: Key triggers "{trigger-1}", "{trigger-2}" match the agent's use cases
- {Existing pattern}: This agent already uses {similar-skill}, so {skill-name} fits naturally

**Recommended integration:**
{Specific action based on agent type - gateway routing vs instruction reference}

**What this enables:**
{1-2 sentences on capability gain}
```

### Reasoning Prompts

Use these prompts when generating explanations:

#### For Domain Matches

- "This skill lives in `{path}` which is the same domain as `{agent-name}`'s focus area"
- "Both handle {shared-concept}, making integration natural"

#### For Trigger Overlaps

- "When users ask about {trigger}, both this skill and `{agent-name}` are relevant"
- "The 'Use when' patterns overlap on: {overlap-list}"

#### For Tool Compatibility

- "This skill requires {tools} which `{agent-name}` has access to"
- "No tool conflicts - agent can execute skill instructions directly"

#### For Similar Skills

- "`{agent-name}` already uses `{similar-skill}` for {purpose}, so adding `{skill-name}` extends that capability"
- "This is a sibling skill to `{existing}` - same family, complementary function"

### Actionable Output

After reasoning, provide concrete next steps:

```markdown
## Recommended Actions

### Immediate (HIGH confidence)

1. [ ] Verify `gateway-{domain}` routing table includes `{skill-name}`
2. [ ] Update `{agent-name}` skill list in frontmatter (if direct reference needed)

### Review (MEDIUM confidence)

3. [ ] Consider adding `{skill-name}` to `{agent-name}` - {reason for review}

### Documentation

4. [ ] Update skill's Related Skills section with agent references
5. [ ] Add to CHANGELOG: "Integrated with {agent-list}"
```

### Integration Checklist

When integrating a skill with an agent:

```markdown
## Integration Checklist for {skill-name} → {agent-name}

- [ ] **Gateway routing** (if library skill)
  - Skill appears in appropriate gateway routing table
  - Gateway description mentions skill's capability

- [ ] **Agent frontmatter** (if direct reference)
  - Added to `skills:` list in agent frontmatter
  - Skills list still <10 items (avoid bloat)

- [ ] **Agent instructions** (if workflow reference)
  - Skill mentioned in relevant section (e.g., "Tier 3: Triggered by Task Type")
  - Context provided for when to use

- [ ] **Skill documentation**
  - Related Skills section lists agent
  - CHANGELOG updated with integration

- [ ] **Verification**
  - Agent can discover skill through normal workflow
  - Skill appears in searching-skills results for "{keyword}"
```

## Related Files

- [Skill Compliance Contract](../skill-compliance-contract.md) - Overall compliance requirements
- [File Organization](../file-organization.md) - Path conventions for domain extraction
- [Phase 15: Agent Integration](../phase-15-agent-integration.md) - Audit phase specification (TODO)
