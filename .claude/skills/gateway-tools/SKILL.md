---
name: gateway-tools
description: Routes tool tasks to library skills. Intent detection + progressive loading.
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

# Gateway: Tools

Routes tool tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~200 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

**Token savings:** Minimal context load until specific tool skill is needed.

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                               | Route To                             |
| ----------------------------------------- | ------------------------------------ |
| "transcribe" / "audio" / "speech-to-text" | → `transcribing-audio`               |
| "Whisper" / "transcription" / "voice"     | → `transcribing-audio`               |
| "recording" / "capture audio" / "record"  | → `recording-audio`                  |
| "FFmpeg" / "microphone" / "audio input"   | → `recording-audio`                  |
| "Docker tool" / "containerized utility"   | → Check Docker Tools section         |
| "CLI wrapper" / "command-line tool"       | → Check CLI Utilities section        |
| "system utility" / "system-level tool"    | → Check System Tools section         |
| "testing" (tool tests)                    | → also invoke `gateway-testing`      |
| "integration" (third-party tools)         | → also invoke `gateway-integrations` |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Audio/Video Tools

| Skill              | Path                                                      | Triggers                                                                           |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Recording Audio    | `.claude/skill-library/tools/recording-audio/SKILL.md`    | record, recording, capture audio, FFmpeg, microphone, audio input, voice recording |
| Transcribing Audio | `.claude/skill-library/tools/transcribing-audio/SKILL.md` | transcribe, audio, speech-to-text, Whisper, voice, transcription                   |

### Docker Tools

| Skill              | Path                                                      | Triggers                             |
| ------------------ | --------------------------------------------------------- | ------------------------------------ |
| Transcribing Audio | `.claude/skill-library/tools/transcribing-audio/SKILL.md` | Docker transcription, Whisper Docker |

### CLI Utilities

| Skill              | Path                                                      | Triggers                    |
| ------------------ | --------------------------------------------------------- | --------------------------- |
| Transcribing Audio | `.claude/skill-library/tools/transcribing-audio/SKILL.md` | Whisper CLI, audio CLI tool |

### System Tools

| Skill                                                   | Path | Triggers |
| ------------------------------------------------------- | ---- | -------- |
| _(Future: video processing, file conversion utilities)_ |      |          |

## Cross-Gateway Routing

| If Task Involves                            | Also Invoke            |
| ------------------------------------------- | ---------------------- |
| testing (unit, integration, E2E tests)      | `gateway-testing`      |
| integrations (third-party service APIs)     | `gateway-integrations` |
| backend (Go patterns, infrastructure)       | `gateway-backend`      |
| MCP tools (wrapping external services)      | `gateway-mcp-tools`    |
| security (security patterns, threat models) | `gateway-security`     |

## Loading Skills

**Path convention:** `.claude/skill-library/tools/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/tools/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.

## Example Usage

**User:** "Transcribe this audio file for me"

**Claude:**

1. Parse task → keyword "transcribe" detected
2. Intent Detection → matches "transcribe" / "audio" → route to `transcribing-audio`
3. Load skill:
   ```
   Read(".claude/skill-library/tools/transcribing-audio/SKILL.md")
   ```
4. Follow skill instructions (verify Docker, run Whisper, return transcript)

## Future Tool Skills

The tools category is designed to expand with:

- **Video processing** - ffmpeg wrappers, video conversion utilities
- **File conversion** - Format converters, compression tools
- **Image processing** - Image manipulation, optimization
- **Document processing** - PDF, DOCX, PPTX utilities
- **Database tools** - Database CLI wrappers, query builders
- **Network tools** - Network diagnostics, API testing utilities

As these skills are created, they will be added to this gateway's routing table.

## Related Gateways

- `gateway-mcp-tools` - For MCP server wrappers (TypeScript with TDD)
- `gateway-integrations` - For third-party service integrations
- `gateway-backend` - For Go backend patterns and infrastructure
- `gateway-testing` - For test frameworks and patterns
