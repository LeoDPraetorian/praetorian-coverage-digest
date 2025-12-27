# Hybrid and Human-Required Fix Instructions

**Detailed procedures for Hybrid phases (4-5, 10-11, 17) and Human-Required phases (7-8, 12-13, 18).**

---

## Hybrid Fixes (Phases 4-5, 10-11, 17)

These have deterministic parts that Claude handles automatically, but ambiguous cases require user confirmation.

### Phase 4-5: Gateway Enforcement / Frontmatter Skill Location

**Deterministic part:** Detect library skills in frontmatter.

**Ambiguous part:** Which gateway to use?

```typescript
AskUserQuestion({
  questions: [{
    question: "Found library skill 'using-react-patterns' in frontmatter. Replace with which gateway?",
    header: "Gateway Fix",
    multiSelect: false,
    options: [
      { label: "gateway-frontend", description: "Frontend/React/UI patterns" },
      { label: "gateway-backend", description: "Backend/Go/API patterns" },
      { label: "gateway-testing", description: "Testing patterns" },
      { label: "gateway-security", description: "Security/Auth/Crypto patterns" },
      { label: "gateway-integrations", description: "Third-party API integrations" },
      { label: "Keep as-is", description: "Has specific justification" }
    ]
  }]
});
```

**Gateway selection logic:**
- Name contains `react`, `ui`, `frontend` → `gateway-frontend`
- Name contains `go`, `api`, `backend` → `gateway-backend`
- Name contains `test`, `playwright`, `vitest` → `gateway-testing`
- Name contains `auth`, `security`, `crypto` → `gateway-security`
- Name contains `integration`, `webhook`, `oauth` → `gateway-integrations`

---

### Phase 10-11: Library Skills in Frontmatter / Incorrect Invocations

**Deterministic part:** Detect `skill: "library-skill"` invocations that will fail at runtime.

**Ambiguous part:** Replace or keep for specific reason?

```typescript
AskUserQuestion({
  questions: [{
    question: "Agent uses 'skill: \"using-tanstack-query\"' which will fail (library skill). Fix how?",
    header: "Invocation Fix",
    multiSelect: false,
    options: [
      { label: "Replace with Read() syntax", description: "Read('.claude/skill-library/.../SKILL.md')" },
      { label: "Add to gateway-frontend", description: "Use gateway instead" },
      { label: "Remove reference", description: "Not needed for this agent" }
    ]
  }]
});
```

**Fix patterns:**
- **Replace with Read():** For one-off skill usage
- **Add gateway:** For domain-wide skill access
- **Remove:** For unnecessary references

---

### Phase 17: Skill Content Duplication

**Deterministic part:** Detect agent body content (>100 chars) that duplicates skill content using semantic search.

**Ambiguous part:** Delete section entirely or refactor to agent-specific summary?

**Detection process:**
1. Read agent body sections (>100 chars)
2. Search for matching skills: `npm run search -- "{content keywords}"`
3. Read candidate skill files to confirm overlap
4. If ≥80% overlap detected, present options

```typescript
AskUserQuestion({
  questions: [{
    question: "Agent duplicates content from 'developing-with-tdd' skill (lines 89-145). How to fix?",
    header: "Duplication",
    multiSelect: false,
    options: [
      { label: "Delete section + add Tier 3 trigger", description: "Remove duplication entirely (Recommended)" },
      { label: "Refactor to brief summary", description: "Keep agent-specific twist" },
      { label: "Keep as-is", description: "Justification for duplication exists" }
    ]
  }]
});
```

**Decision factors:**
- **Delete:** When skill covers 100% of content
- **Refactor:** When agent adds specific context/examples
- **Keep:** When duplication serves agent-specific pedagogical purpose

---

## Human-Required Fixes (Phases 7-8, 12-13, 18)

These require genuine human judgment that cannot be automated.

### Phase 7-8: Phantom / Deprecated Skills

**Issue:** Reference to non-existent or deprecated skill

**Guidance process:**
1. Search for similar skills:
   ```bash
   npm run search -- "{skill-name}"
   ```
2. Review search results and identify appropriate replacements
3. Ask user to choose replacement:
   ```typescript
   AskUserQuestion({
     questions: [{
       question: "Phantom skill 'old-react-patterns' not found. Replace with?",
       header: "Replacement",
       multiSelect: false,
       options: [
         { label: "using-modern-react-patterns", description: "Found in library (score: 95)" },
         { label: "gateway-frontend", description: "Use gateway instead" },
         { label: "Remove reference", description: "No longer needed" }
       ]
     }]
   });
   ```
4. Apply user's choice with Edit tool

**Why human-required:** Domain knowledge needed to evaluate whether suggested replacement actually serves the same purpose.

---

### Phase 12-13: Gateway Coverage / Skill Gap Analysis

**Issue:** Agent missing recommended gateway or mandatory universal skills

**Guidance process:**
1. Review agent's domain (from name, type, tools)
2. Identify appropriate gateway based on domain
3. Present skill recommendations:
   ```typescript
   AskUserQuestion({
     questions: [{
       question: "Agent 'frontend-developer' missing gateway-frontend. Add it?",
       header: "Gateway",
       multiSelect: false,
       options: [
         { label: "Yes, add to frontmatter + Tier 1", description: "Appropriate for this agent (Recommended)" },
         { label: "No, agent is intentionally narrow", description: "Skip this suggestion" }
       ]
     }]
   });
   ```
4. If accepted:
   - Add gateway to frontmatter `skills:` field
   - Add to Tier 1 of Skill Loading Protocol (if exists)
   - Generate Skill Loading Protocol if missing (Phase 9)

**For MANDATORY universal skills** (verifying-before-completion, calibrating-time-estimates):
- These MUST be added for ALL agents
- Present as requirement, not suggestion

**Why human-required:** Architectural decision about which skills/gateways fit agent's intended scope.

---

### Phase 18: New Skill Discovery

**Issue:** Missing applicable skills from gateways, orphaned skills, miscategorization

**Guidance process:**
1. Run 3-tier skill discovery analysis (see Phase 18 in workflow-manual-checks.md)
2. For each suggested skill, ask user:
   ```typescript
   AskUserQuestion({
     questions: [{
       question: "Skill 'using-tanstack-query' applies to this agent (frontend domain). Add it?",
       header: "Skill Discovery",
       multiSelect: true,
       options: [
         { label: "Add to Tier 3 (triggered)", description: "Load when specific task detected (Recommended)" },
         { label: "Add to frontmatter (always)", description: "Always available" },
         { label: "Skip", description: "Not applicable to this agent" }
       ]
     }]
   });
   ```
3. Apply accepted additions:
   - Tier 3 → Add to Skill Loading Protocol trigger table
   - Frontmatter → Add to `skills:` field + Tier 1

**Analysis tiers:**
1. **Gateway coverage** - Skills in agent's gateway(s) not yet referenced
2. **Orphaned skills** - Library skills with matching domain not in any gateway
3. **Miscategorization** - Skills in wrong gateway that should be in agent's gateway

**Why human-required:** Requires understanding skill ecosystem and agent's specific needs. Suggestions may not all be appropriate.

---

## Summary

**Hybrid fixes** - Claude detects, user confirms strategy (5 phases)
**Human-required fixes** - User provides domain knowledge and judgment (4 phases)

**For categorization of all phases, see:** [Phase Categorization](../phase-categorization.md)
