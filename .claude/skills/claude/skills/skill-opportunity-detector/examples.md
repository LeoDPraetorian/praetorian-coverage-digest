# Case Studies - Good vs Bad Skill Candidates

Real-world examples of pattern evaluation with detailed analysis.

## Strong Candidates (5/5) - Create Immediately

### Case Study 1: OAuth Provider Integration

**Session Context:**
```
User integrated OAuth authentication for multiple providers:
1. GitHub OAuth (complete implementation)
2. Google OAuth (complete implementation)
3. Microsoft OAuth (complete implementation)

Each implementation included:
- Provider registration and app setup
- Authorization URL generation
- Callback handler with code exchange
- Token management
- User profile mapping to internal model
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 complete implementations in session
- Each was independent OAuth provider
- Not refinements, but separate integrations

**2. Generality:** ✓ YES
- OAuth 2.0 is industry standard
- Pattern applies to any OAuth provider
- Not specific to this codebase
- Common requirement across web applications

**3. Novelty:** ✓ YES
- No existing "oauth-provider-integration" skill
- "authentication-patterns" covers JWT/sessions, not OAuth
- Unique workflow: authorization → callback → token exchange

**4. Complexity:** ✓ YES
- Multi-step workflow (7+ steps)
- Requires OAuth 2.0 understanding
- Security considerations (CSRF, state param)
- Common pitfalls: token refresh, scope selection
- Configuration complexity for each provider

**5. Reusability:** ✓ YES
- Every modern web app uses OAuth
- Common developer task
- Saves significant time (2+ hours per integration)
- Best practices are non-obvious

**Score: 5/5** ✅

**Decision: CREATE SKILL**

**Proposed Skill:**
```markdown
---
name: oauth-provider-integration
description: Use when integrating OAuth 2.0 authentication providers (GitHub, Google, Microsoft, etc.) - covers provider registration, authorization flow, callback handling, token management, and user profile mapping
---
```

---

### Case Study 2: GraphQL Resolver Patterns

**Session Context:**
```
User built GraphQL API with multiple resolvers:
1. User resolver (queries + mutations + field resolvers)
2. Post resolver (queries + mutations + field resolvers)
3. Comment resolver (queries + mutations + field resolvers)

Common patterns:
- Authentication checks using context
- DataLoader for N+1 prevention
- Authorization per-field
- Error formatting for GraphQL spec
- Input validation with Zod
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 complete resolver implementations
- Each for different model
- Consistent pattern across all

**2. Generality:** ✓ YES
- GraphQL is widely adopted
- Resolver patterns are standard
- N+1 problem is universal
- Authorization patterns apply broadly

**3. Novelty:** ✓ YES
- No existing "graphql-resolver-patterns" skill
- "rest-api-patterns" doesn't cover GraphQL specifics
- Unique challenges: N+1, field-level auth, batching

**4. Complexity:** ✓ YES
- Requires GraphQL schema understanding
- DataLoader pattern is non-trivial
- Authorization logic is complex
- Error handling has GraphQL-specific requirements
- Performance optimization needed

**5. Reusability:** ✓ YES
- Growing GraphQL adoption
- Common pain points (N+1, auth)
- Saves hours of research and debugging
- Best practices evolving

**Score: 5/5** ✅

**Decision: CREATE SKILL**

---

## Good Candidates (4/5) - Likely Create

### Case Study 3: Data Validation Patterns

**Session Context:**
```
User implemented validation for multiple endpoints:
1. User registration validation (Pydantic schemas)
2. Product creation validation (Pydantic schemas)
3. Order submission validation (Pydantic schemas)

Common patterns:
- Pydantic BaseModel definitions
- Custom validators for business rules
- Error message formatting
- Nested validation
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 validation implementations
- Each for different model
- Consistent Pydantic usage

**2. Generality:** ✓ YES
- Pydantic is popular Python library
- Validation is universal requirement
- Patterns apply to any Python API

**3. Novelty:** ✗ NO (Borderline)
- Existing "data-validation-patterns" skill might exist
- BUT: Could be Python/Pydantic-specific version
- Decision depends on existing skill coverage

**4. Complexity:** ✓ YES
- Custom validators require understanding
- Nested validation is non-trivial
- Error handling patterns are valuable
- Type coercion edge cases

**5. Reusability:** ✓ YES
- Every API needs validation
- Pydantic is widely used
- Saves debugging time
- Best practices are valuable

**Score: 4/5** (NO on Novelty - need to check existing skills)

**Decision: EVALUATE**

**Next Steps:**
1. Check if "data-validation-patterns" exists
2. If exists: Review coverage of Pydantic-specific patterns
3. If gaps: Update existing skill
4. If no existing skill: Create "pydantic-validation-patterns"

---

### Case Study 4: Container Orchestration

**Session Context:**
```
User containerized multiple services:
1. API service (Dockerfile + docker-compose)
2. Worker service (Dockerfile + docker-compose)
3. Cron service (Dockerfile + docker-compose)

Common patterns:
- Multi-stage builds
- Health checks
- Resource limits
- Volume mounts
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 complete containerizations
- Each for different service type
- Consistent patterns

**2. Generality:** ✓ YES
- Docker is industry standard
- Patterns apply to any containerized app
- Multi-stage builds are universal
- Health checks are best practice

**3. Novelty:** ✓ YES
- No specific "service-containerization-patterns"
- Docker skills might exist but lack service-specific patterns
- Unique focus: service types and their needs

**4. Complexity:** ✓ YES
- Multi-stage builds require understanding
- Health check configuration is nuanced
- Resource limits need tuning
- Volume mount patterns are tricky

**5. Reusability:** ✗ NO (Borderline)
- Many teams have Docker expertise
- Well-documented elsewhere
- May not add much value beyond docs

**Score: 4/5** (NO on Reusability - common knowledge)

**Decision: EVALUATE**

**Tiebreaker:**
- Does this save >4 hours? Possibly for beginners
- Fills gap in skill library? Maybe
- User explicitly requested? Not yet

**Recommendation:** Document as internal runbook first, promote to skill if requested

---

## Weak Candidates (3/5 or less) - Don't Create

### Case Study 5: Chariot Tabularium Updates

**Session Context:**
```
User updated Chariot's data models:
1. Modified Asset model in tabularium
2. Updated Risk model in tabularium
3. Changed Attribute model in tabularium

Common patterns:
- Protobuf definition updates
- Code generation
- Neo4j schema sync
- DynamoDB table updates
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 model updates
- Each complete

**2. Generality:** ✗ NO
- Tabularium is Chariot-specific
- Protobuf + Neo4j + DynamoDB combo is unique
- Wouldn't apply to other codebases

**3. Novelty:** ✓ YES
- No existing skill for this
- Unique to Chariot

**4. Complexity:** ✓ YES
- Multiple systems to coordinate
- Code generation workflow
- Schema synchronization

**5. Reusability:** ✗ NO
- Only Chariot developers need this
- Not applicable elsewhere
- One codebase only

**Score: 3/5** ❌

**Decision: DON'T CREATE SKILL**

**Alternative:**
- Document in Chariot project wiki
- Create internal runbook
- Add to Chariot/CLAUDE.md

**Reasoning:**
- Too specific to Chariot
- Low reusability beyond team
- Better served by project documentation

---

### Case Study 6: Simple npm Commands

**Session Context:**
```
User installed npm packages:
1. npm install axios
2. npm install date-fns
3. npm install lodash

Then imported and used them.
```

**Evaluation:**

**1. Frequency:** ✓ YES
- 3 package installations

**2. Generality:** ✓ YES
- npm is universal for Node.js
- Package installation is standard

**3. Novelty:** ✓ YES
- No "npm-package-installation" skill

**4. Complexity:** ✗ NO
- Single command: npm install
- No domain knowledge required
- Trivial operation

**5. Reusability:** ✗ NO
- Everyone knows npm install
- No value added by skill
- Over-documenting basics

**Score: 3/5** ❌

**Decision: DON'T CREATE SKILL**

**Reasoning:**
- Too simple
- No complexity to document
- Better served by npm documentation
- Would clutter skill ecosystem

---

### Case Study 7: One-Time Data Migration

**Session Context:**
```
User performed data migration:
1. Export data from legacy system
2. Transform to new schema
3. Import to new system

This was a one-time migration for a specific project.
```

**Evaluation:**

**1. Frequency:** ✗ NO
- Single occurrence (3 steps of same migration)
- Not 3 separate migrations
- One-time operation

**2. Generality:** ✗ NO
- Specific to these two systems
- Schema transformation is unique
- Wouldn't apply elsewhere

**3. Novelty:** ✓ YES
- No existing skill

**4. Complexity:** ✓ YES
- Data transformation is complex
- Multiple steps required

**5. Reusability:** ✗ NO
- One-time operation
- Won't be repeated
- Others have different schemas

**Score: 2/5** ❌

**Decision: DON'T CREATE SKILL**

**Alternative:**
- Document migration steps for future reference
- Keep as project notes
- If general ETL pattern emerges later, reconsider

---

## Borderline Cases - Decision Examples

### Case Study 8: Terraform Multi-Cloud (4/5)

**Session Context:**
```
User deployed with Terraform:
1. AWS infrastructure (Lambda + DynamoDB)
2. Azure infrastructure (Functions + CosmosDB)
3. GCP infrastructure (Cloud Functions + Firestore)
```

**Evaluation:**
- Frequency: ✓ (3 deployments)
- Generality: ✓ (multi-cloud is common need)
- Novelty: ? (check for "terraform-multi-cloud" skill)
- Complexity: ✓ (provider differences, state management)
- Reusability: ✓ (many teams use multi-cloud)

**Score: 4/5 or 5/5** (depends on Novelty check)

**Decision Process:**

**Step 1: Check existing skills**
```bash
# Search for terraform skills
$ grep -r "terraform" .claude/skills/*/SKILL.md

# Found: "serverless-compute-decision-architecture"
# Covers: Compute decisions, not Terraform specifics
# Gap: Terraform implementation patterns not covered
```

**Step 2: Assess gap**
- Existing skill covers "what" (decisions)
- New skill would cover "how" (Terraform implementation)
- Complementary, not duplicate

**Step 3: Evaluate value**
- Terraform multi-cloud is complex
- State management across providers
- Provider-specific patterns
- Significant time savings

**Final Decision: CREATE SKILL** ✅

**Score: 5/5** (Novelty is YES after investigation)

---

### Case Study 9: React Form Patterns (4/5)

**Session Context:**
```
User built React forms:
1. User registration form (React Hook Form + Zod)
2. Product creation form (React Hook Form + Zod)
3. Order checkout form (React Hook Form + Zod)
```

**Evaluation:**
- Frequency: ✓ (3 forms)
- Generality: ✓ (forms are universal)
- Novelty: ? (check for form skills)
- Complexity: ✓ (validation, state, submission)
- Reusability: ✓ (every app has forms)

**Score: 4/5 or 5/5** (depends on Novelty)

**Decision Process:**

**Step 1: Check existing skills**
```bash
# Found: "react-modernization"
# Covers: Hooks, but not form-specific patterns
#
# Found: "react-performance-optimization"
# Covers: Performance, not forms
```

**Step 2: Assess specificity**
- Forms are substantial (validation, errors, loading, submission)
- React Hook Form + Zod is specific combination
- Could be section in existing skill vs new skill

**Step 3: Content volume estimate**
- Form patterns: ~500-800 words
- Examples and best practices: ~300 words
- Total: ~1000 words

**Decision Matrix:**
- If existing "react-patterns" skill: Add section (not enough for new skill)
- If no general React patterns skill: Create new "react-form-patterns"

**Final Decision: DEPENDS** ⚠️

**Recommendation:**
1. Check for general "react-patterns" skill
2. If exists: Update with forms section
3. If not: Create "react-form-patterns" skill

---

## Decision Summary Table

| Case Study | Freq | Gen | Nov | Complex | Reuse | Score | Decision |
|------------|------|-----|-----|---------|-------|-------|----------|
| OAuth Integration | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 | ✅ Create |
| GraphQL Resolvers | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 | ✅ Create |
| Data Validation | ✓ | ✓ | ✗ | ✓ | ✓ | 4/5 | ⚠️ Check existing |
| Containerization | ✓ | ✓ | ✓ | ✓ | ✗ | 4/5 | ⚠️ Document first |
| Tabularium Updates | ✓ | ✗ | ✓ | ✓ | ✗ | 3/5 | ❌ Project docs |
| npm Install | ✓ | ✓ | ✓ | ✗ | ✗ | 3/5 | ❌ Too simple |
| Data Migration | ✗ | ✗ | ✓ | ✓ | ✗ | 2/5 | ❌ One-time |
| Terraform Multi-Cloud | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 | ✅ Create |
| React Forms | ✓ | ✓ | ? | ✓ | ✓ | 4-5/5 | ⚠️ Investigate |

---

## Key Takeaways

**Strong Candidates:**
- Industry-standard patterns (OAuth, GraphQL)
- Universal problems with complex solutions
- Clear value proposition
- No existing coverage

**Weak Candidates:**
- Codebase-specific patterns
- Trivial operations
- One-time occurrences
- Already well-documented elsewhere

**Borderline Cases:**
- Require investigation of existing skills
- Need content volume estimation
- Consider update vs new skill
- Evaluate long-term value
