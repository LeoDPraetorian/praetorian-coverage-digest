# Agent Escalation Protocol

**Single source of truth for agent escalation and handoff procedures.**

Referenced by: `creating-agents`, `updating-agents`, `auditing-agents`

---

## Quick Reference

All agents should have clear escalation boundaries defining:

1. When to stop and escalate
2. Who/what to recommend

---

## Template

Add this section to agent body:

```markdown
## Escalation Protocol

### Stop and Escalate When

- Task requires expertise outside this agent's domain
- Task requires human approval or decision
- Error persists after 2 debugging attempts
- Security concern identified that needs review
- Scope creep detected beyond original request

### Recommend

| Situation                       | Recommend                    |
| ------------------------------- | ---------------------------- |
| {Domain} architecture decisions | `{domain}-architect` agent   |
| Security concerns               | `security-lead` agent   |
| Cross-domain coordination       | `orchestrator` agent         |
| Human decision needed           | Ask user via AskUserQuestion |
| Unknown domain                  | Search for appropriate agent |
```

---

## Common Escalation Patterns

### By Domain

| Agent Domain | Escalate Architecture To | Escalate Security To       |
| ------------ | ------------------------ | -------------------------- |
| frontend     | frontend-architect       | frontend-security |
| backend      | backend-architect        | backend-security  |
| testing      | test-architect           | security-lead         |
| research     | -                        | security-lead         |

### By Situation

| Situation             | Action                                 |
| --------------------- | -------------------------------------- |
| Needs more context    | AskUserQuestion                        |
| Needs different tools | Recommend appropriate agent            |
| Needs human approval  | Stop, explain, await decision          |
| Security concern      | Immediate escalation to security agent |
| Scope creep           | Confirm with user before proceeding    |

---

## When NOT to Escalate

- Minor uncertainties (ask user instead)
- Tasks within agent's core competency
- Standard error handling (retry first)
- Documentation gaps (search first)

---

## Escalation Message Format

```
⚠️ ESCALATION NEEDED

Reason: {why escalating}
Current status: {what was accomplished}
Blocker: {what's preventing progress}

Recommended: {agent name or action}

Do you want me to:
1. Hand off to {recommended agent}
2. Continue with guidance from you
3. Stop here
```

---

## Verification

Check agent has:

1. Clear "Stop and Escalate When" conditions
2. Recommendation table for common situations
3. No ambiguous "maybe" escalation triggers

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- [Output Format](output-format.md)
