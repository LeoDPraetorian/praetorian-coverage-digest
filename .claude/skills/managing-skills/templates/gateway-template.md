---
name: gateway-{domain}
description: Routes {domain} tasks to library skills. Intent detection + progressive loading.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Gateway: {Domain}

Routes {domain} tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~{token-estimate} tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                 | Route To                            |
| --------------------------- | ----------------------------------- |
| "{keyword1}" / "{keyword2}" | → `{skill-name-1}`                  |
| "{keyword3}" / "{keyword4}" | → `{skill-name-2}`                  |
| "{cross-domain-keyword}"    | → `gateway-{other}` (cross-gateway) |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### {Category 1}

| Skill          | Path                                                       | Triggers           |
| -------------- | ---------------------------------------------------------- | ------------------ |
| {Skill Name 1} | `.claude/skill-library/{category}/{skill-name-1}/SKILL.md` | {trigger keywords} |
| {Skill Name 2} | `.claude/skill-library/{category}/{skill-name-2}/SKILL.md` | {trigger keywords} |

### {Category 2}

| Skill          | Path                                                       | Triggers           |
| -------------- | ---------------------------------------------------------- | ------------------ |
| {Skill Name 3} | `.claude/skill-library/{category}/{skill-name-3}/SKILL.md` | {trigger keywords} |

## Cross-Gateway Routing

| If Task Involves   | Also Invoke         |
| ------------------ | ------------------- |
| {domain1 keywords} | `gateway-{domain1}` |
| {domain2 keywords} | `gateway-{domain2}` |

## Loading Skills

**Path convention:** `.claude/skill-library/{category}/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/{category}/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
