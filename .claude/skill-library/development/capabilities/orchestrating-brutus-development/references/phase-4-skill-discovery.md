# Phase 4: Skill Discovery

**Map technologies to skills for agent prompt construction.**

---

## Brutus-Relevant Skills

| Technology | Skill |
|------------|-------|
| Go plugins | `implementing-go-plugin-registries` |
| Go architecture | `enforcing-go-capability-architecture` |
| TDD | `developing-with-tdd` |

---

## Output

Create `skill-manifest.yaml`:

```yaml
skills_by_domain:
  go_plugins:
    - implementing-go-plugin-registries
    - enforcing-go-capability-architecture
  testing:
    - developing-with-tdd
    - avoiding-low-value-tests
```

---

## Related

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Previous phase
- [Phase 5: Complexity](phase-5-complexity.md) - Next phase
