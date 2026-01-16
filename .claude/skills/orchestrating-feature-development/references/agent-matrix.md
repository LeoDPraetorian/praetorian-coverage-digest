# Agent Matrix by Feature Type

| Type       | Discovery (Phase 3)                         | Leads (Phase 5)               | Developers (Phase 6) | Reviewers (Phase 8)                   | Planner (Phase 9) | Testers (Phase 10) | Validator (Phase 11) |
| ---------- | ------------------------------------------- | ----------------------------- | -------------------- | ------------------------------------- | ----------------- | ------------------ | -------------------- |
| Frontend   | discovering-codebases-for-planning (1-10 agents) | frontend-lead + security-lead | frontend-developer   | frontend-reviewer + frontend-security | test-lead         | frontend-tester ×3 | test-lead            |
| Backend    | discovering-codebases-for-planning (1-10 agents) | backend-lead + security-lead  | backend-developer    | backend-reviewer + backend-security   | test-lead         | backend-tester ×3  | test-lead            |
| Full-stack | discovering-codebases-for-planning (1-10 agents) | All 4 leads                   | Both developers      | All 4 reviewers                       | test-lead         | All 6 testers      | test-lead            |

**Rule**: Match agents to feature domain. Discovery uses `discovering-codebases-for-planning` skill which dynamically spawns 1-10 Explore agents based on feature context and codebase size. Full-stack features spawn ALL agents in parallel for phases 5-10.
