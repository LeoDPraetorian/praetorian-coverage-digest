---
name: gateway-{domain}
description: Use when developing {domain} applications - access {categories}.
allowed-tools: Read
---

# {Domain} Development Gateway

## Understanding This Gateway

**How you got here**: You invoked this gateway via Skill tool:

```
skill: "gateway-{domain}"
```

**What this gateway provides**: A routing table of **library skills** with their paths.

**How to load library skills**: Use the Read tool with the full path:

```
Read(".claude/skill-library/path/to/SKILL.md")
```

## Critical: Two-Tier Skill System

| Tier             | Location                 | How to Invoke | Example                     |
| ---------------- | ------------------------ | ------------- | --------------------------- |
| **Core/Gateway** | `.claude/skills/`        | Skill tool    | `skill: "gateway-{domain}"` |
| **Library**      | `.claude/skill-library/` | Read tool     | `Read("path/to/SKILL.md")`  |

<IMPORTANT>
Library skills listed below are NOT available via Skill tool.
You MUST use Read tool to load them.

❌ WRONG: skill: "{domain}-skill-name" ← Will fail, not a core skill
✅ RIGHT: Read(".claude/skill-library/{category}/{domain}-skill-name/SKILL.md")
</IMPORTANT>

## How to Use This Gateway

1. **Find the skill** you need in the categorized sections below
2. **Copy the full path** shown next to the skill name
3. **Load via Read tool**: `Read("copied-path")`
4. **Follow the loaded skill's instructions**

---

## Routing Table: Library Skills

### {Category 1}

| Skill        | Path                                                     |
| ------------ | -------------------------------------------------------- |
| {Skill name} | `.claude/skill-library/{category}/{skill-name}/SKILL.md` |

### {Category 2}

| Skill        | Path                                                     |
| ------------ | -------------------------------------------------------- |
| {Skill name} | `.claude/skill-library/{category}/{skill-name}/SKILL.md` |

---

## Quick Lookup by Task

| When you need to... | Load this skill                                 |
| ------------------- | ----------------------------------------------- |
| {Task description}  | `Read(".claude/skill-library/{path}/SKILL.md")` |

---

## Related Gateways

Other gateways you can invoke via Skill tool:

| Gateway | Invoke With               | Use For   |
| ------- | ------------------------- | --------- |
| {Name}  | `skill: "gateway-{name}"` | {Purpose} |
