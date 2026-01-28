---
name: gateway-redteam
description: Routes red team tasks to library skills. Intent detection + progressive loading.
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

# Gateway: Red Team

Routes red team operational tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~2000 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent | Route To |
| --- | --- |
| "customizing Nighthawk" / "C2 profile" / "Nighthawk profile" | → `customizing-nighthawk-profiles` |
| "Cobalt Strike" / "malleable profile" | → `gateway-security` (for now, future: cobalt-strike skill) |
| "payload generation" / "implant" / "agent generation" | → Future skills (planned) |
| "OPSEC validation" / "red team OPSEC" | → `customizing-nighthawk-profiles` (Phase 4 checklist) |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for security/testing gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### C2 Frameworks

| Skill | Path | Triggers |
| --- | --- | --- |
| Customizing Nighthawk Profiles | `.claude/skill-library/redteam/customizing-nighthawk-profiles/SKILL.md` | "nighthawk", "c2 profile", "nighthawk profile", "malleable profile customization", "c2 customization" |

**Future Skills** (Planned):
- `customizing-cobalt-strike-profiles` - Malleable C2 profiles for Cobalt Strike
- `customizing-sliver-profiles` - Sliver C2 configuration
- `customizing-mythic-profiles` - Mythic C2 agent profiles

### Payload Generation

**Skills** (Planned):
- `generating-c2-payloads` - C2 payload/implant generation workflow
- `obfuscating-payloads` - Payload obfuscation techniques
- `signing-payloads` - Code signing for payload evasion

### OPSEC

| Skill | Path | Triggers |
| --- | --- | --- |
| (Part of C2 workflows) | See `customizing-nighthawk-profiles` Phase 4 | "opsec validation", "c2 opsec", "profile opsec" |

**Future Skills** (Planned):
- `validating-redteam-opsec` - General red team OPSEC validation
- `avoiding-detection-signatures` - Signature evasion techniques
- `testing-against-edr` - EDR evasion testing workflow

## Cross-Gateway Routing

| If Task Involves | Also Invoke |
| --- | --- |
| Security testing, threat modeling | `gateway-security` |
| Backend infrastructure, AWS Lambda | `gateway-backend` |
| Testing C2 profiles, validation | `gateway-testing` |

## Loading Skills

**Path convention:** `.claude/skill-library/redteam/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/redteam/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.

## Related Gateways

- `gateway-security` - Defensive security, threat modeling, security controls
- `gateway-capabilities` - Security scanners, VQL, Nuclei, Janus, nerva
- `gateway-testing` - Testing workflows (unit, integration, E2E, security testing)
