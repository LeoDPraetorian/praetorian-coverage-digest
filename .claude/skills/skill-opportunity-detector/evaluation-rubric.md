# Skill-Worthiness Evaluation Rubric

Detailed criteria for evaluating whether a detected pattern should become a skill.

## The 5-Dimension Framework

Every pattern candidate is evaluated across 5 dimensions. Each dimension receives a yes/no score.

**Final Score:**
- 5/5 → **Create immediately** (strong candidate)
- 4/5 → **Likely valuable** (evaluate tradeoffs)
- 3/5 or less → **Not skill-worthy yet** (document only)

---

## Dimension 1: Frequency

**Question:** Has this pattern been repeated 3+ times in the session?

### Scoring Criteria

**YES (✓) if:**
- Pattern appeared 3 or more times
- Each occurrence was complete implementation
- Timing suggests genuine repetition, not iterative refinement

**NO (✗) if:**
- Pattern appeared only 1-2 times
- Occurrences were corrections/fixes of same work
- Single implementation with multiple attempts

### Examples

**✓ YES - Frequency Met:**
```
Session contains:
1. OAuth integration for GitHub (complete)
2. OAuth integration for Google (complete)
3. OAuth integration for Microsoft (complete)

Score: YES - 3 complete, independent implementations
```

**✗ NO - Frequency Not Met:**
```
Session contains:
1. OAuth integration for GitHub (complete)
2. OAuth integration for Google (incomplete, abandoned)

Score: NO - Only 1 complete implementation
```

**✗ NO - Refinement, Not Repetition:**
```
Session contains:
1. First attempt at GraphQL resolver (buggy)
2. Fixed GraphQL resolver (better)
3. Refactored GraphQL resolver (final)

Score: NO - Same implementation refined 3 times, not 3 separate implementations
```

### Edge Cases

**Partial implementations:**
- If 3rd occurrence is started but incomplete: Count it
- If 3rd occurrence is planned but not started: Don't count it

**Variations:**
- Minor variations (different model names) count as same pattern
- Major variations (different architecture) don't count

---

## Dimension 2: Generality

**Question:** Would this pattern apply beyond the current codebase/context?

### Scoring Criteria

**YES (✓) if:**
- Pattern uses industry-standard approaches
- Would apply to other similar projects
- Not tied to specific business logic
- Represents best practice or common workflow

**NO (✗) if:**
- Highly specific to current codebase
- Relies on unique business rules
- Hard-coded to specific context
- Wouldn't make sense elsewhere

### Examples

**✓ YES - General Pattern:**
```
Pattern: GraphQL resolver with authentication and DataLoader

Why general:
- GraphQL is industry standard
- Authentication patterns are universal
- DataLoader solves common N+1 problem
- Applies to any GraphQL API

Score: YES
```

**✗ NO - Codebase-Specific:**
```
Pattern: Update Chariot's tabularium Asset model, sync to Neo4j, invalidate specific cache keys

Why specific:
- Tabularium is Chariot-specific
- Neo4j integration is Chariot architecture
- Cache key logic is business-specific
- Wouldn't transfer to other projects

Score: NO
```

**✓ YES - Generalizable Despite Context:**
```
Pattern: Implement CRUD API with Pydantic validation in FastAPI

Why general:
- FastAPI is popular framework
- Pydantic validation is standard
- CRUD pattern is universal
- Could be used in any FastAPI project

Score: YES - Even though done in specific project, pattern itself is general
```

### Edge Cases

**Framework-specific patterns:**
- If framework is widely used (React, FastAPI): General
- If framework is niche/internal: Not general

**Domain-specific with general workflow:**
- Focus on workflow structure, not domain details
- If workflow applies across domains: General

---

## Dimension 3: Novelty

**Question:** Is this pattern NOT already covered by an existing skill?

### Scoring Criteria

**YES (✓) if:**
- No existing skill covers this pattern
- Existing skills have gaps this would fill
- Represents different approach/domain
- Would complement, not duplicate

**NO (✗) if:**
- Existing skill already covers this comprehensively
- Would be redundant
- Better served by updating existing skill
- Creates unnecessary duplication

### How to Check

**Step 1:** List existing skills that might overlap

**Step 2:** Read their descriptions and scope

**Step 3:** Identify gaps:
- Does existing skill cover this use case?
- Is there enough differentiation?
- Would users find both skills, or be confused?

### Examples

**✓ YES - Novel Pattern:**
```
Pattern: OAuth provider integration workflow

Existing skills:
- "authentication-patterns" (covers JWT, session auth, NOT OAuth)
- "third-party-api-integration" (generic API integration, not OAuth-specific)

Analysis: Gaps exist - OAuth has unique flow (authorization URL, callback, token exchange)

Score: YES - Novel enough to warrant new skill
```

**✗ NO - Already Covered:**
```
Pattern: React component with hooks and TypeScript

Existing skills:
- "react-modernization" (covers hooks migration and patterns)
- "react-testing" (covers component testing)

Analysis: Existing skills comprehensively cover this

Score: NO - Better to use/update existing skills
```

**? MAYBE - Partial Overlap:**
```
Pattern: GraphQL resolver with complex authorization logic

Existing skills:
- "graphql-resolver-patterns" (covers basic resolvers)

Analysis: Existing skill has basic patterns, but lacks advanced authorization

Decision options:
A) Update existing skill with authorization section
B) Create new "graphql-authorization-patterns" skill

Evaluate: How much content? If substantial (500+ words), create new. If minor (100 words), update existing.
```

### Edge Cases

**Skill updates vs new skills:**
- Small addition (<20% new content): Update existing
- Medium addition (20-50% new content): Judgment call
- Large addition (>50% new content): New skill

**Overlapping domains:**
- If 80%+ overlap: Not novel
- If 50-80% overlap: Consider updating existing
- If <50% overlap: Novel enough

---

## Dimension 4: Complexity

**Question:** Does this pattern require multiple steps or specialized domain knowledge?

### Scoring Criteria

**YES (✓) if:**
- Multi-step workflow (3+ steps)
- Requires domain knowledge
- Non-obvious best practices
- Common pitfalls to avoid
- Configuration complexities

**NO (✗) if:**
- Single command or trivial operation
- No domain knowledge required
- Obvious to anyone familiar with basics
- Well-documented elsewhere

### Examples

**✓ YES - Complex Pattern:**
```
Pattern: OAuth provider integration

Steps required:
1. Register application with provider
2. Configure redirect URLs
3. Generate authorization URL
4. Handle callback with code
5. Exchange code for tokens
6. Fetch user profile
7. Map to internal user model
8. Handle token refresh

Domain knowledge:
- OAuth 2.0 flow understanding
- Security considerations (CSRF, state param)
- Token storage best practices
- Scope selection

Score: YES - Multi-step with domain knowledge required
```

**✗ NO - Simple Operation:**
```
Pattern: Install npm package and import

Steps:
1. Run: npm install package-name
2. Import: import { thing } from 'package-name'

Domain knowledge: None - standard npm usage

Score: NO - Trivial operation, not skill-worthy
```

**✓ YES - Requires Domain Knowledge:**
```
Pattern: Implement pagination for large datasets

Complexity:
- Multiple approaches (offset vs cursor)
- Performance implications
- Edge cases (empty results, last page)
- Database query optimization
- API design considerations

Score: YES - Requires understanding of tradeoffs and best practices
```

### Edge Cases

**Well-documented patterns:**
- Even if documented elsewhere, if complex enough and frequently needed: YES
- Example: React hooks are well-documented but "react-modernization" skill still valuable

**Combining simple steps:**
- Individual steps might be simple
- But workflow/orchestration adds complexity
- Focus on overall complexity, not individual steps

---

## Dimension 5: Reusability

**Question:** Would other users or future sessions benefit from this skill?

### Scoring Criteria

**YES (✓) if:**
- Common task in software development
- Other teams/developers would face same problem
- Likely to be needed in future sessions
- Saves time for others
- Represents best practice worth sharing

**NO (✗) if:**
- Unique to specific situation
- Unlikely anyone else would need this
- One-time occurrence
- Too niche or obscure

### Examples

**✓ YES - High Reusability:**
```
Pattern: CRUD API implementation with validation

Why reusable:
- Every project needs CRUD operations
- Validation is universal requirement
- Best practices apply broadly
- Common pain points addressed
- Frequently implemented

Score: YES - High reusability across projects and developers
```

**✗ NO - Low Reusability:**
```
Pattern: Migrate legacy Chariot v1 data format to v2 schema

Why not reusable:
- Specific to Chariot's migration
- One-time operation
- No one else has this exact schema
- Won't be needed after migration

Score: NO - Too specific, low reusability
```

**✓ YES - Niche But Valuable:**
```
Pattern: Implement Neo4j Cypher queries for graph traversal

Why reusable:
- Neo4j is popular graph database
- Cypher queries are non-trivial
- Graph traversal patterns are reusable
- Growing use of graph databases

Score: YES - Niche technology but common enough to be valuable
```

### Edge Cases

**Emerging technologies:**
- If technology is gaining adoption: Reusable
- If technology is declining: Not reusable

**Domain-specific but broadly needed:**
- E-commerce patterns: Reusable (common domain)
- Aerospace calculations: Not reusable (niche domain)

**Internal tools:**
- If used by 10+ people: Reusable (within org)
- If used by 1-2 people: Not reusable

---

## Scoring Decision Matrix

### 5/5 - Create Immediately ✅

**Profile:**
- Repeated 5+ times in session
- Industry-standard pattern
- No existing coverage
- Multi-step with domain knowledge
- Broadly applicable

**Action:**
- Strong recommendation to create
- High confidence in value
- Proceed with writing-skills immediately

**Example:**
- OAuth provider integration (done 3 times, general, novel, complex, reusable)

---

### 4/5 - Likely Valuable ⚠️

**Profile:**
- Meets most criteria
- One dimension borderline
- Clear value but minor concerns

**Action:**
- Recommend creation with caveats
- Document the borderline dimension
- Consider mitigation strategies

**Example:**
- Custom validation patterns (3 times, general, novel, complex, but might update existing validation skill instead)

**Evaluation:**
- If NO on Novelty: Consider updating existing skill
- If NO on Generality: Document scope limitations
- If NO on Frequency: Wait for one more occurrence
- If NO on Complexity: Ensure there's enough to document
- If NO on Reusability: Clarify target audience

---

### 3/5 or Less - Not Skill-Worthy ❌

**Profile:**
- Fails multiple key criteria
- Pattern too specific or simple
- Likely won't provide value

**Action:**
- Do NOT create skill
- Document as project notes
- Watch for evolution into skill-worthy pattern

**Example:**
- Chariot-specific database migration (2 times, not general, novel but too specific, complex, low reusability)

**Alternative Actions:**
- Add to project wiki/documentation
- Create internal runbook
- Update existing related documentation
- Keep as personal notes

---

## Special Considerations

### Borderline Cases

**When score is 4/5 or 3/5 and uncertain:**

**Ask these tiebreaker questions:**

1. **Effort vs Value:**
   - Would this take <2 hours to document?
   - Would it save >4 hours across future uses?
   - If yes to both → Create

2. **Ecosystem Fit:**
   - Does this fill obvious gap in skill library?
   - Would users expect to find this?
   - If yes → Create

3. **User Request:**
   - Has someone explicitly asked for this?
   - Have multiple people needed this?
   - If yes → Create

### Evolution Path

**For patterns scoring 3/5:**

**Don't create yet, but:**
- Document pattern in notes
- Tag with "potential-skill"
- Revisit after:
  - 2 more occurrences (Frequency)
  - Generalization opportunity identified
  - Related skill gaps discovered

**When to promote:**
- Score improves to 4/5 or 5/5
- User explicitly requests
- Multiple sessions need it

---

## Evaluation Workflow

### Step 1: Score Each Dimension

```markdown
Pattern: {name}

1. Frequency: [✓/✗] {reasoning}
2. Generality: [✓/✗] {reasoning}
3. Novelty: [✓/✗] {reasoning}
4. Complexity: [✓/✗] {reasoning}
5. Reusability: [✓/✗] {reasoning}

Total Score: {X}/5
```

### Step 2: Apply Decision Matrix

- 5/5 → Create
- 4/5 → Evaluate borderline dimension
- 3/5 or less → Don't create

### Step 3: Document Decision

```markdown
**Decision:** {Create / Wait / Document Only}

**Reasoning:**
{Explanation based on scores and special considerations}

**Next Steps:**
{What to do - create skill, update existing, document as notes, etc.}
```

---

## Quality Checks

Before final approval, verify:

- [ ] Score is based on evidence from session, not assumptions
- [ ] Existing skills were checked for overlap
- [ ] Pattern is general enough for reuse
- [ ] Decision is documented with clear reasoning
- [ ] If borderline, tiebreaker questions were considered
