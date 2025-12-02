---
description: Create detailed implementation plan with bite-sized tasks
model: sonnet
allowed-tools: Skill, Read, Write
---

Use the writing-plans skill exactly as written

---

## Example Usage

**Example 1: Plan for simple feature**
```
> /plan-write "Add user profile settings page"

→ Analyzes feature scope and dependencies
→ Breaks into 8 bite-sized tasks:
   1. Create ProfileSettings component
   2. Add profile API endpoint
   3. Implement form validation
   4. Add unit tests
   5. Add integration tests
   6. Add E2E tests
   7. Update documentation
   8. Deploy to staging
→ Saves: docs/plans/2025-01-15-profile-settings.md
→ Reports: Ready to execute with /plan-execute
```

**Example 2: Complex multi-domain feature**
```
> /plan-write "Real-time vulnerability notifications with WebSocket"

→ Analyzes: Frontend + Backend + Infrastructure
→ Creates 24 tasks organized by domain:
   - Backend (8 tasks): WebSocket server, auth, message routing
   - Frontend (10 tasks): Connection management, UI updates, error handling
   - Testing (6 tasks): Unit, integration, E2E tests
→ Includes exact commands and file paths
→ Estimates: 3 days with 2 developers
→ Saves detailed plan with TDD workflow per task
```

**Example 3: From architecture document**
```
> /plan-write "docs/architecture/2025-01-10-dashboard-optimization.md"

→ Reads architecture decisions
→ Translates decisions into implementation tasks
→ 15 tasks with clear acceptance criteria
→ References architectural constraints
→ Includes performance validation steps
→ Saves implementation-ready plan
```
