# Task Domain Detection - Baseline Testing (RED Phase)

## Purpose

Test how agents naturally classify implementation tasks WITHOUT the task-domain-detection skill.

Goal: Identify gaps, mistakes, and patterns in domain detection to inform skill creation.

## Test Scenarios

### Scenario 1: Ambiguous Full-Stack Request

```markdown
IMPORTANT: This is a real task. Analyze and spawn appropriate agents.

Task: "Add authentication to the platform"

Requirements:
- Users should be able to log in
- Protect routes that require authentication
- Store user sessions securely

Which agent(s) do you spawn? Be specific about which agents and why.
```

**Expected behavior WITHOUT skill:**
- Agent may only spawn one agent (e.g., react-developer OR go-api-developer)
- May not recognize this requires both frontend and backend work
- May struggle to determine which domains are involved

### Scenario 2: Keyword Ambiguity

```markdown
IMPORTANT: This is a real task. Analyze and spawn appropriate agents.

Task: "Add a filter dropdown to the assets page"

Requirements:
- Users can filter by status, type, and tags
- Filters should persist in URL query params
- Backend API already supports filtering

Which agent(s) do you spawn? Be specific about which agents and why.
```

**Expected behavior WITHOUT skill:**
- May spawn both frontend AND backend agents unnecessarily
- May not recognize backend already supports filtering (frontend-only task)
- May struggle with keyword "API" triggering wrong classification

### Scenario 3: Infrastructure Request

```markdown
IMPORTANT: This is a real task. Analyze and spawn appropriate agents.

Task: "Set up CI/CD pipeline for automated testing"

Requirements:
- Run tests on every PR
- Deploy to staging on merge to main
- Use GitHub Actions

Which agent(s) do you spawn? Be specific about which agents and why.
```

**Expected behavior WITHOUT skill:**
- May spawn general-purpose developer instead of yaml-developer
- May not recognize GitHub Actions requires YAML expertise
- May choose wrong specialist

### Scenario 4: Multi-Domain Request

```markdown
IMPORTANT: This is a real task. Analyze and spawn appropriate agents.

Task: "Add real-time notifications when scans complete"

Requirements:
- Backend should send notifications via WebSocket
- Frontend should display toast notifications
- Update Makefile to include WebSocket dependencies

Which agent(s) do you spawn? Be specific about which agents and why.
```

**Expected behavior WITHOUT skill:**
- May not identify all three domains (Go backend, React frontend, Makefile)
- May spawn agents sequentially instead of in parallel
- May miss Makefile requirement entirely

### Scenario 5: Database Schema Request

```markdown
IMPORTANT: This is a real task. Analyze and spawn appropriate agents.

Task: "Add a new 'comments' table to the database"

Requirements:
- PostgreSQL database
- Table should link to users and assets
- Include created_at and updated_at timestamps

Which agent(s) do you spawn? Be specific about which agents and why.
```

**Expected behavior WITHOUT skill:**
- May spawn go-developer instead of database architect
- May not recognize this is primarily a schema design task
- May choose general-purpose instead of specialist

## Baseline Test Execution

**Instructions for running baseline:**

1. Copy each scenario into a fresh conversation WITHOUT task-domain-detection skill
2. Use Task tool with subagent_type='general-purpose' to run scenario
3. Document agent's EXACT response:
   - Which agents did they choose?
   - What was their reasoning?
   - Did they identify all relevant domains?
   - Did they spawn agents in parallel or sequentially?
4. Note any patterns:
   - Common misclassifications
   - Keywords that trigger wrong domains
   - Missing domain detections
   - Confidence indicators

## Expected Patterns to Document

**Classification errors:**
- [ ] Full-stack tasks spawning only one agent
- [ ] Frontend-only tasks spawning backend agents
- [ ] Infrastructure tasks spawning wrong specialists
- [ ] Multi-domain tasks missing some domains

**Keyword confusion:**
- [ ] "API" triggering backend when frontend-only
- [ ] "database" triggering go-developer instead of architect
- [ ] "testing" triggering wrong test agent type

**Parallelization issues:**
- [ ] Multi-domain tasks spawned sequentially
- [ ] Missed opportunity for parallel execution

**Confidence issues:**
- [ ] No confidence scores provided
- [ ] Unclear reasoning for agent selection
- [ ] No justification for domain choices

## Success Criteria

Baseline test is complete when you have:
- [ ] Documented exact agent responses for all 5 scenarios
- [ ] Identified 5+ common classification errors
- [ ] Noted keyword patterns that cause confusion
- [ ] Captured agent reasoning verbatim
- [ ] Identified gaps where skill should help
