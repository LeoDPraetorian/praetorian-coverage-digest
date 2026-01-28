# Phase 5: Complexity

**Assess technical complexity and determine execution strategy.**

---

## Brutus Plugin Complexity Factors

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Protocol complexity | Simple auth | Multi-step auth | Stateful + options |
| Library availability | Pure Go exists | Need adaptation | No library |
| Error patterns | Well documented | Partial docs | Requires research |
| Optional interfaces | None | KeyPlugin | Multiple |

---

## Typical Complexity

| Plugin Type | Tier | Example |
|-------------|------|---------|
| Simple TCP | SIMPLE | Redis, Telnet |
| Database | MODERATE | MySQL, PostgreSQL |
| Complex | COMPLEX | LDAP, SMB |
| Key-based | COMPLEX | SSH with KeyPlugin |

---

## Execution Strategy

Based on tier:
- SIMPLE: Single batch, minimal checkpoints
- MODERATE: 2-3 batches, standard checkpoints
- COMPLEX: Multiple batches, frequent checkpoints

---

## Related

- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Previous phase
- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Next phase (LARGE only)
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Next phase (MEDIUM+)
