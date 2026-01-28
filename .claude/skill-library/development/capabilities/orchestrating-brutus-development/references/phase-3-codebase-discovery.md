# Phase 3: Codebase Discovery

**Explore Brutus codebase to identify patterns and protocol authentication requirements.**

---

## Overview

Discover:
1. Existing plugin patterns to reuse
2. Protocol-specific authentication methods
3. Error patterns for the target protocol
4. Dependencies needed

**Exit Criteria:** discovery.md and protocol-research.md created.

---

## Brutus-Specific Discovery

### Explore Areas

```bash
# Core interfaces
Read("pkg/brutus/brutus.go")

# Similar plugins
ls internal/plugins/

# Plugin patterns
Read("internal/plugins/ssh/ssh.go")
Read("internal/plugins/mysql/mysql.go")
```

### Protocol Research

Research the target protocol:
- Authentication mechanism
- Default port(s)
- Success/failure indicators
- Common error messages

---

## Output Files

1. **discovery.md** - Codebase patterns found
2. **protocol-research.md** - Protocol authentication details

---

## ⛔ COMPACTION GATE 1

Before proceeding to Phase 4, check token usage and run compaction if needed.

---

## Related

- [Phase 2: Triage](phase-2-triage.md) - Previous phase
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 1 protocol
