# Search Examples

Reference file for searching-agents - complete examples and advanced usage.

---

## Common Searches

### Search 1: Find by Capability

```
User: "Which agents handle React development?"

You:
1. cd .claude/skill-library/claude/agent-management/searching-agents/scripts
2. npm run search -- "react"
3. Interpret results:

   ✓ frontend-developer (development) [Score: 35]
   ✓ frontend-architect (architecture) [Score: 35]
   ✓ frontend-reviewer (quality) [Score: 35]

4. Recommend:
   "Found 3 React agents:
    - frontend-developer: Implementation and coding
    - frontend-architect: Architecture decisions
    - frontend-reviewer: Code review

    For building components, use frontend-developer."
```

### Search 2: Find by Domain with Filter

```
User: "Find testing agents that handle frontend"

You:
1. npm run search -- "frontend" --type testing
2. Results:

   ✓ frontend-browser-test-engineer (testing) [Score: 55]
   ✓ frontend-unit-test-engineer (testing) [Score: 55]
   ✓ frontend-integration-test-engineer (testing) [Score: 55]

3. Explain:
   "Found 3 frontend testing agents:
    - frontend-browser-test-engineer: E2E tests with Playwright
    - frontend-unit-test-engineer: Unit tests with Vitest
    - frontend-integration-test-engineer: API integration tests

    Choose based on test type needed."
```

### Search 3: Check Existence

```
User: "Do we have a Python development agent?"

You:
1. npm run search -- "python"
2. Results:

   ✓ python-developer (development) [Score: 130]
      Use when developing Python applications...

3. Answer: "Yes, python-developer handles Python development."
```

### Search 4: Broad Discovery

```
User: "What development agents do we have?"

You:
1. npm run search -- "" --type development
   (Empty query matches all in category)

2. Results: List of all development agents

3. Present: "Found 16 development agents: [list names with brief purpose]"
```

---

## Examples with Scoring Explanation

### Example 1: High Score Match

```
User: "Find the react-developer agent"

You:
1. npm run search -- "react-developer"
2. Results:

   ✓ frontend-developer (development) [Score: 135]
      Use when developing React frontend - components...

3. Explain scoring:
   "Score 135 breakdown:
    - Name substring: 50 ('react-developer' not exact name match)
    - Description match: 30 (mentions 'React')
    - Skills match: 10 (uses gateway-frontend)
    - Valid description: 5 (well-formed)

    Best match: frontend-developer
    Note: No exact 'react-developer' agent exists."
```

### Example 2: Multiple Matches

```
User: "Find agents for Go development"

You:
1. npm run search -- "go"
2. Results:

   ✓ backend-developer (development) [Score: 35]
      Use when developing Go backend...

   ✓ integration-developer (development) [Score: 35]
      Use when integrating...mentions Go...

3. Interpret:
   "Found 2 agents mentioning Go:
    - backend-developer: Primary Go development
    - integration-developer: API integrations

    For Go backend development, use backend-developer."
```

### Example 3: No Matches

```
User: "Find Java agents"

You:
1. npm run search -- "java"
2. Results:

   No agents found matching: "java"
   Try searching for: react, go, test, security, architecture

3. Report:
   "No Java agents found. Try broader terms:
    - 'backend' for backend development
    - 'development' for all development agents"
```

---

## Advanced Usage

### Combine Query Terms

```bash
# Search for multiple terms (finds agents matching either)
npm run search -- "react testing"

# Results include agents matching "react" OR "testing"
```

### Use Specific Terms

```bash
# Be specific to get better matches
npm run search -- "playwright"    # Better than "testing"
npm run search -- "typescript"    # Better than "frontend"
npm run search -- "security"      # Better than "review"
```

### Understand Score Context

**High scores (80+):**
- Strong match, likely what you want
- Name contains query or description very relevant

**Medium scores (30-79):**
- Partial match, review description
- Might be tangential to what you need

**Low scores (5-29):**
- Weak match, probably not what you want
- Only type/skills match, not capability

---

## Integration with Workflow

### Pattern 1: Search → Use

```
User: "I need to create E2E tests for the frontend"

You:
1. Search: npm run search -- "frontend e2e"
2. Find: frontend-browser-test-engineer (high score)
3. Use: Task("frontend-browser-test-engineer", "Create E2E tests for...")
```

### Pattern 2: Search → Multiple Options

```
User: "Help me with Go code"

You:
1. Search: npm run search -- "go"
2. Find multiple: backend-developer, integration-developer, go-architect (if exists)
3. Ask user:
   "Found 3 Go-related agents:
    - backend-developer: Implementation
    - integration-developer: API integrations
    - go-architect: Architecture design

    Which type of help do you need?"
```

### Pattern 3: Search → Not Found → Broader Search

```
User: "Find Rust agents"

You:
1. Search: npm run search -- "rust"
2. No matches
3. Broader: npm run search -- "development"
4. Present development agents, explain none specialize in Rust
```

---

## Tips for Effective Searching

### Tip 1: Start Specific

```
❌ "testing" → 20+ matches
✅ "playwright" → 2 specific matches
✅ "e2e frontend" → Most relevant matches first
```

### Tip 2: Use Category Filtering

```bash
# If you know the category
npm run search -- "security" --type analysis

# Faster than reviewing all security matches
```

### Tip 3: Check Multiple Terms

```
# If first search doesn't find it
npm run search -- "typescript"  # Try tech stack
npm run search -- "frontend"    # Try domain
npm run search -- "react"       # Try framework
```

### Tip 4: Understand Score Meaning

- **Score 100+**: Almost certainly what you want
- **Score 50-99**: Likely relevant, check description
- **Score 30-49**: Possibly relevant, might be tangential
- **Score <30**: Probably not what you need
