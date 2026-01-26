---
name: generate-blogpost
description: Use when creating blog posts from GitHub repos - analyzes source code, captures author voice from reference materials, researches existing content, and synthesizes technically accurate posts with authentic voice
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, WebFetch, WebSearch, Skill
---

# Generating Blog Posts

**Systematic workflow for creating blog posts that combine technical accuracy with authentic author voice.**

## When to Use

Use this skill when:

- Creating a blog post about a tool, library, or codebase
- Need to capture and maintain an author's writing style
- Want to incorporate research on existing content
- Building technical content with personality and narrative flow

## Quick Reference

| Phase                      | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| 1. Source Analysis         | Understand the tool/project being written about         |
| 2. Voice Capture (Optional | Analyze author's previous writing for style             |
| 3. Research Execution      | Find existing content and related work                  |
| 4. Content Synthesis       | Combine technical details with voice and research       |
| 5. Draft Generation        | Create structured blog post with narrative flow         |
| 6. Verification            | Validate technical accuracy and voice consistency       |

**For detailed phase workflows, see:** [references/workflow-phases.md](references/workflow-phases.md)

---

## Overview

This skill provides a systematic approach to blog post generation that addresses three core challenges:

1. **Technical Accuracy**: Understanding the tool/project deeply enough to explain it correctly
2. **Voice Authenticity**: Capturing and maintaining an author's unique writing style
3. **Research Integration**: Incorporating context from existing work and related content

**What makes this different from ad-hoc prompting:**
- Structured workflow prevents missing critical steps
- Voice capture methodology analyzes multiple dimensions (tone, technical depth, humor)
- Research is systematic rather than opportunistic
- Output validation ensures both accuracy and style consistency

---

## Workflow

### Phase 1: Source Analysis

**Goal**: Understand what you're writing about.

See [references/source-analysis.md](references/source-analysis.md) for complete workflow including:
- Repository structure analysis
- README/documentation parsing
- Source code examination patterns
- Key concept identification

**Quick steps:**
1. Read README and primary documentation
2. Identify core functionality from source code
3. Extract key technical concepts and mechanisms
4. Document user workflow and use cases

**TodoWrite**: Create task "Analyze source code and documentation"

### Phase 2: Voice Capture (Optional)

**Goal**: Learn the author's writing style from their previous work.

**Decision point**: Ask user if they want to provide reference blog posts for voice capture.

If yes, see [references/voice-capture.md](references/voice-capture.md) for:
- Multi-dimensional style analysis (tone, technical depth, structure, personality)
- Code example patterns
- Humor and narrative techniques
- Concept introduction strategies

**Quick steps:**
1. Collect 2-4 reference blog posts (URLs or files)
2. Use WebFetch to analyze each post
3. Document style patterns across dimensions
4. Create voice profile for drafting phase

**TodoWrite**: Create task "Capture author voice from reference materials"

### Phase 3: Research Execution

**Goal**: Understand the landscape - what exists, what's been said, what gaps remain.

Use `orchestrating-research` skill (LIBRARY) for systematic research across:
- Existing blog posts on the topic
- Related academic/technical papers
- Community discussions and prior art
- Alternative approaches and tools

**See:** [references/research-strategy.md](references/research-strategy.md)

**Quick steps:**
1. Invoke `orchestrating-research` with research prompt
2. Review synthesized findings
3. Identify unique angles and gaps
4. Note credit attribution requirements

**TodoWrite**: Create task "Research existing content and related work"

### Phase 4: Content Synthesis

**Goal**: Combine technical understanding, voice, and research into a coherent structure.

**See:** [references/content-synthesis.md](references/content-synthesis.md) for:
- Narrative arc patterns
- Technical-to-accessible translation
- Voice application strategies
- Research integration techniques

**Quick steps:**
1. Choose narrative structure (problem→solution, journey, deep-dive)
2. Map technical concepts to narrative beats
3. Identify where research/attribution fits
4. Plan code examples and visuals

**TodoWrite**: Create task "Synthesize content structure and narrative"

### Phase 5: Draft Generation

**Goal**: Write the actual blog post.

**See:** [references/draft-generation.md](references/draft-generation.md) for:
- Section-by-section writing strategy
- Voice consistency techniques
- Technical accuracy checkpoints
- Example code formatting

**Output location**: `.claude/.output/blog-posts/{timestamp}-{slug}/draft.md`

**Key principles:**
- Write in complete sections (don't outline then fill)
- Apply voice patterns actively (reference voice profile frequently)
- Integrate research citations naturally
- Maintain narrative momentum

**TodoWrite**: Create task "Generate complete blog post draft"

### Phase 6: Verification

**Goal**: Validate technical accuracy and voice consistency.

**See:** [references/verification.md](references/verification.md)

**Checklist:**
- [ ] Technical claims verified against source code
- [ ] Voice consistency across sections
- [ ] Research properly attributed
- [ ] Code examples tested/validated
- [ ] Narrative flow maintained
- [ ] Key points from user requirements covered

**TodoWrite**: Create task "Verify draft for accuracy and voice"

---

## Output Format

Blog posts are saved to: `.claude/.output/blog-posts/{timestamp}-{slug}/`

**Files created:**
- `draft.md` - The blog post
- `voice-profile.md` - Voice analysis (if Phase 2 executed)
- `research-summary.md` - Key findings from research
- `MANIFEST.yaml` - Metadata about the generation process

**MANIFEST.yaml structure:**
```yaml
artifacts:
  - path: draft.md
    type: blogpost
    metadata:
      subject: <tool/project name>
      author_references: [<URLs>]
      research_conducted: true/false
      word_count: <number>
```

---

## Integration

### Called By

- Users directly when creating blog content
- Content generation workflows
- Documentation teams

### Requires (invoke before starting)

None - standalone workflow

### Calls (during execution)

- **`orchestrating-research`** (LIBRARY) - Phase 3 - Research existing content
  - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`
- **`persisting-agent-outputs`** (LIBRARY) - Output management - Directory structure and MANIFEST
  - `Read(".claude/skill-library/claude/persisting-agent-outputs/SKILL.md")`

### Pairs With (conditional)

- `brainstorming` (CORE) - When user is still defining what to write about
  - `skill: "brainstorming"`
- `verifying-before-completion` (CORE) - Before finalizing the draft
  - `skill: "verifying-before-completion"`

---

## Related Skills

| Skill                      | Access Method                                                                    | Purpose                             |
| -------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| **orchestrating-research** | `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` (LIBRARY) | Systematic multi-source research    |
| **persisting-agent-outputs** | `Read(".claude/skill-library/claude/persisting-agent-outputs/SKILL.md")` (LIBRARY) | Output directory management         |
| **brainstorming**          | `skill: "brainstorming"` (CORE)                                                  | Idea refinement before writing      |
| **verifying-before-completion** | `skill: "verifying-before-completion"` (CORE)                                    | Final validation before delivery    |

---

## Examples

**Example 1: Tool blog post with voice capture**
```
User: "Write a blog post about the swarmer tool. Here are my previous posts for voice reference: <URLs>"

1. Analyze swarmer/ directory (README, source code)
2. Fetch and analyze reference blog posts for voice
3. Research Windows registry persistence techniques
4. Synthesize narrative: EDR evasion + forgotten Windows internals
5. Generate draft matching author's conversational-yet-technical style
6. Verify technical claims against source code
```

**Example 2: Library announcement without voice capture**
```
User: "Write a blog post announcing our new React component library. Skip voice capture."

1. Analyze library documentation and source
2. Skip Phase 2 (voice capture)
3. Research existing React component libraries
4. Synthesize narrative: problem space + our approach
5. Generate draft with professional technical tone
6. Verify API examples work correctly
```

---

## Anti-Patterns

**See:** [references/anti-patterns.md](references/anti-patterns.md) for common failure modes including:
- Skipping source analysis and guessing implementation details
- Generic "blog voice" instead of capturing author's actual style
- Shallow research that misses key prior art
- Technical inaccuracy from not verifying against source code
- Losing narrative thread in technical detail

---

## Domain-Specific Guidance

### Offensive Security Tool Posts

When writing about red team tools, penetration testing utilities, or security research tools, apply these additional principles:

#### 1. Operational Model > Implementation Details

| Include | Exclude |
|---------|---------|
| What happens at runtime | How the code is built |
| What defender sees vs attacker controls | Crypto implementation details |
| Sandbox/detection evasion mechanisms | Template tables and option lists |

**Why:** Practitioners care about operational behavior, not build internals. Save implementation deep-dives for follow-up posts or README files.

#### 2. Kill "Completeness" Sections

Skip these sections entirely for practitioner audiences:
- **"Use Cases"** - Red teamers know their use cases
- **"Security Considerations"** - Reads like legal disclaimers
- **"Building from Source"** - Belongs in README
- **Author bio** - Optional, often unnecessary

**Test:** "Would the reader miss this if it wasn't here?" If no, don't write it.

#### 3. Frame Through Attacker Lens

| Generic (avoid) | Attacker-focused (prefer) |
|-----------------|---------------------------|
| "Provides obfuscation" | "Sandboxes that time out before WASM initializes see only the decoy" |
| "Bypasses security controls" | "The password travels out-of-band—defenders see nothing actionable" |
| "Encrypted content" | "No `crypto.subtle.decrypt()` calls to fingerprint" |

Explain the asymmetry: what does each side see, and why does the timing/mechanism create advantage?

#### 4. Memorable Examples > Generic Ones

| Generic | Memorable |
|---------|-----------|
| `-password "MySecretPassword!"` | `-trigger "up up down down left right left right"` |
| `go build -o tool ./cmd/main` | `make build` |
| Multiple command variations | Single minimal invocation |

Use examples that stick in memory. Respect the reader's time with the simplest viable command.

#### 5. Include Practitioner Tips

Add at least one "field tip" that wouldn't appear in formal documentation:
- Integration with other tools ("we've had success with vite-plugin-singlefile")
- Workarounds for common issues
- Non-obvious operational patterns

This is tribal knowledge—the "I wish someone told me this" advice.

#### 6. Connect to Contemporary Techniques

Reference current attack patterns the tool supports, even if not explicitly designed for them:
- Link to threat intel on techniques (ClickFix, HTML smuggling campaigns)
- Explain how the tool fits operational workflows
- Note detection/evasion implications

#### 7. End Clean

- Close with repo link and feedback invitation
- Skip "clever" callbacks or forced humor
- Don't trail off with disclaimers

**See also:** [references/anti-patterns.md](references/anti-patterns.md) for additional offensive tool anti-patterns.

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
