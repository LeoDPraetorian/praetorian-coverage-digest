# Integration Lead Prompt Template

**Phase 7 prompt for integration-lead agent designing integration architecture.**

---

## Integration Lead Prompt

```markdown
Task(
subagent_type: "integration-lead",
description: "Design integration architecture for {vendor}",
prompt: "

## Task: Design Integration Architecture for {vendor}

### Integration Request

{User's integration description}
Vendor: {vendor}
Type: {asset_discovery | vuln_sync | bidirectional_sync}

### Codebase Context

{From Phase 3 discovery.md - existing integration patterns, client structures}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before designing:

- adhering-to-dry
- adhering-to-yagni
- writing-plans
- gateway-integrations (routes to integration skills)
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')
- integrating-with-{vendor} (LIBRARY): Read('.claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md')

### P0 Requirements (MANDATORY - Design Must Address)

Your architecture MUST include approach for ALL 7 P0 requirements:

| #   | Requirement         | Architecture Decision                |
| --- | ------------------- | ------------------------------------ |
| 1   | VMFilter            | How assets will be filtered          |
| 2   | CheckAffiliation    | Real API query design (NOT stub)     |
| 3   | ValidateCredentials | First call in Invoke()               |
| 4   | errgroup Safety     | Concurrency limit + loop var capture |
| 5   | Pagination Safety   | maxPages OR API-provided limit       |
| 6   | Error Handling      | No ignored errors, wrapped with %w   |
| 7   | File Size           | Split strategy if >400 lines         |

### Your Deliverables

1. **Architecture Design** (.claude/.output/integrations/{workflow-id}/architecture-plan.md)
   - Client interface design
   - Collector flow diagram
   - Asset/risk mapping to Chariot schema
   - P0 compliance approach for each requirement
   - Rate limiting strategy
   - Pagination approach

2. **Implementation Tasks** (task decomposition)
   - Specific, actionable tasks
   - File paths for each task
   - Dependencies between tasks
   - P0 requirements addressed by each task

### File Structure

Standard integration files:
```

modules/chariot/backend/pkg/integrations/{vendor}/
├── {vendor}.go # Main integration logic
├── client.go # API client
├── collector.go # Asset/risk collection (may be in collector/ subdir)
├── types.go # Vendor-specific types
├── {vendor}\_test.go # Unit tests
└── testdata/ # Test fixtures
└── \*.json

```

### Constraints

- Follow existing integration patterns from {reference_integration}
- Use existing credential patterns from pkg/secrets
- Follow Go patterns from codebase
- Design for testability (mock server support)

### Scope

Architecture decisions only. Do NOT implement code.

### Output Format

{
'status': 'complete',
'architecture_file': '.claude/.output/integrations/{workflow-id}/architecture-plan.md',
'tasks': [
  { 'id': 'T001', 'description': 'Create client.go with API methods', 'file': 'pkg/integrations/{vendor}/client.go', 'depends_on': [], 'p0_requirements': ['rate_limiting'] },
  { 'id': 'T002', 'description': 'Implement collector with VMFilter', 'file': 'pkg/integrations/{vendor}/collector.go', 'depends_on': ['T001'], 'p0_requirements': ['VMFilter', 'errgroup', 'pagination'] },
  { 'id': 'T003', 'description': 'Implement CheckAffiliation with real API', 'file': 'pkg/integrations/{vendor}/{vendor}.go', 'depends_on': ['T001'], 'p0_requirements': ['CheckAffiliation'] }
],
'p0_compliance': {
  'VMFilter': 'collector.go - called before Job.Send()',
  'CheckAffiliation': '{vendor}.go - queries {api_endpoint}',
  'ValidateCredentials': '{vendor}.go - first call in Invoke()',
  'errgroup': 'collector.go - SetLimit(10), captured vars',
  'pagination': 'client.go - maxPages=100',
  'error_handling': 'all files - wrapped with %w',
  'file_size': 'split into 4 files if needed'
},
'risks': [],
'skills_invoked': ['adhering-to-dry', 'developing-integrations', 'integrating-with-{vendor}', ...]
}
"
)
```

---

## Related References

- [Phase 7: Architecture Plan](../phase-7-architecture-plan.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [P0 Compliance](../p0-compliance.md) - P0 requirements detail
