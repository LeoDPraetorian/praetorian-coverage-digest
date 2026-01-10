# Chain-of-Thought Patterns for Orchestration

Structured reasoning patterns that prevent skipped steps and improve decision quality.

## Reviewer Agent: Spec Compliance Verification

Include this block in spec compliance review prompts:

```markdown
## Spec Compliance Verification (Chain-of-Thought)

For EACH requirement in the plan, follow this reasoning chain:

### Step 1: State the requirement exactly

"Requirement R1: The filter dropdown must show all asset statuses"

### Step 2: Locate claimed implementation

"Developer claims: 'Implemented filter dropdown in AssetFilters.tsx'"

### Step 3: Verify independently (DO NOT TRUST CLAIM)

"Reading AssetFilters.tsx lines 45-67...
Found: <Select options={STATUSES.filter(s => s.active)} />
Observation: Only active statuses shown, not all statuses"

### Step 4: Compare against requirement

"Requirement: ALL statuses
Implementation: Only ACTIVE statuses
Verdict: NOT_COMPLIANT - missing inactive statuses"

### Step 5: Document evidence

"File: src/components/AssetFilters.tsx:52
Expected: STATUSES (all)
Actual: STATUSES.filter(s => s.active)
Gap: Inactive statuses excluded"

---

### Full Verification Chain Example

**Requirement**: "Add pagination with 25 items per page default"

**Chain**:

1. **Requirement stated**: Pagination, 25 items default
2. **Developer claim**: "Added pagination to asset list"
3. **Independent verification**:
   - AssetList.tsx line 34: `const [pageSize] = useState(10)`
   - API call line 56: `fetch(`/api/assets?limit=${pageSize}`)`
   - Pagination component line 78: `<Pagination pageSize={pageSize} />`
4. **Comparison**:
   - Required: 25 items default
   - Actual: 10 items default
   - Gap: Wrong default value
5. **Evidence**:
   - File: AssetList.tsx:34
   - Expected: useState(25)
   - Actual: useState(10)
   - Verdict: NOT_COMPLIANT

---

**CRITICAL**: Complete ALL 5 steps for EVERY requirement. Do not batch or skip.
```

## Architect Agent: Decision Chain

Include this block in architecture lead prompts:

```markdown
## Architecture Decision Chain-of-Thought

For each significant decision, follow this chain:

### Step 1: State the decision point

"Decision: How should we store user session state?"

### Step 2: List constraints from requirements

- Must work across multiple server instances (load balanced)
- Must survive server restarts
- Must support 10K concurrent users
- Session data includes: user ID, roles, preferences (~2KB)

### Step 3: Enumerate options (minimum 2)

**Option A**: Server-side sessions with Redis
**Option B**: JWT tokens (stateless)
**Option C**: Database-backed sessions

### Step 4: Analyze each option against constraints

**Option A - Redis Sessions**:

- Multi-instance: ✓ Centralized Redis
- Survives restart: ✓ Redis persistence
- 10K users: ✓ Redis handles easily
- 2KB data: ✓ Fits well
- Additional: Requires Redis infrastructure

**Option B - JWT Tokens**:

- Multi-instance: ✓ Stateless
- Survives restart: ✓ No server state
- 10K users: ✓ No server storage
- 2KB data: ⚠️ Large tokens, sent every request
- Additional: Cannot revoke without blacklist

**Option C - Database Sessions**:

- Multi-instance: ✓ Centralized DB
- Survives restart: ✓ Persistent
- 10K users: ⚠️ DB load concern
- 2KB data: ✓ Fits well
- Additional: Uses existing infrastructure

### Step 5: Recommend with explicit reasoning

"Recommendation: Option A (Redis Sessions)

Reasoning:

1. Meets all hard constraints
2. Redis is purpose-built for this use case
3. Enables session revocation (security requirement implicit)
4. Team has Redis experience (discovered in discovery phase)

What would change this: If Redis infrastructure is blocked by ops, fall back to Option C."

---

**Complete this chain for: state management, data flow, error handling, API design**
```

## Synthesis Agent: Conflict Detection Chain

Include this block in research synthesis prompts:

```markdown
## Conflict Detection Chain-of-Thought

When synthesizing multiple sources, follow this chain:

### Step 1: Group findings by claim

"Claim: Optimal JWT expiration time"

Sources making this claim:

- Source A (blog): "15 minutes"
- Source B (OWASP): "5-15 minutes"
- Source C (tutorial): "1 hour"
- Source D (GitHub): "30 minutes"

### Step 2: Identify agreement vs disagreement

Agreement: All say < 24 hours
Disagreement: Specific values range 5 min to 1 hour

### Step 3: Analyze WHY sources disagree

- Source A context: High-security financial app
- Source B context: Security best practice (conservative)
- Source C context: Developer convenience tutorial
- Source D context: Internal enterprise app

### Step 4: Synthesize with nuance

"JWT expiration recommendations vary by security context:

- High security (financial, healthcare): 5-15 minutes (Sources A, B)
- Standard web apps: 15-30 minutes (Sources B, D)
- Low-risk internal tools: Up to 1 hour acceptable (Source C)

Conflict resolved by: Context-dependent recommendation rather than single value."

### Step 5: Adjust confidence based on conflict

- If sources agree: confidence 0.9+
- If sources disagree but explainable: confidence 0.7-0.8
- If sources contradict with no resolution: confidence 0.5-0.6, flag for user

---

**Apply this chain to every claim where 2+ sources provide input.**
```
