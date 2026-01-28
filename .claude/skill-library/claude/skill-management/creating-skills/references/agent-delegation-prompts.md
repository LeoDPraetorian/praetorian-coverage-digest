# Agent Delegation Prompts

**Complete Task prompts for orchestrator delegation in creating-skills workflow.**

## Phase 5.2: Skill Generation Agent

```
Task(subagent_type: "general-purpose", prompt: "
  SKILL GENERATION TASK:
  - Skill name: {name}
  - Skill type: {type from Phase 4}
  - Location: {path from Phase 3}
  - RED failure summary: {from Phase 1.3}

  REFERENCES TO READ:
  - references/template-guidance.md for templates by skill type
  - /.claude/skills/managing-skills/references/skill-compliance-contract.md for compliance requirements
  - /.claude/skills/managing-skills/references/progressive-disclosure.md for structure patterns

  REQUIREMENTS:
  1. Generate SKILL.md following template for {type}
  2. Target <450 lines (hard limit 500)
  3. Include mandatory Integration section
  4. Use progressive disclosure (lean main file, detailed references/)
  5. Include placeholder sections for research content (Phase 6)
  6. Create .history/CHANGELOG with 'Initial Creation' entry including:
     - RED failure documentation (from input)
     - Category (library-category or core)
     - Skill type (process/library/integration/tool-wrapper)
     - Date and version
     - See: /.claude/skills/managing-skills/references/patterns/changelog-format.md

  Write SKILL.md to {skill-path}/SKILL.md
  Create {skill-path}/.history/CHANGELOG
  Write to {OUTPUT_DIR}/skill-generation.md: structure summary, line count, sections created

  Return: line count, sections created, compliance checklist status, changelog created
")
```

**Agent must return:** Line count (<500), sections included, Integration section confirmed, changelog created.

**Token savings:** ~5,000-8,000 tokens (orchestrator never holds full SKILL.md or reference files)

---

## Phase 6.2: Research Agent

```
Task(subagent_type: "general-purpose", prompt: "
  RESEARCH TASK:
  - Skill topic: {topic from Phase 1}
  - Skill type: {type from Phase 4}

  Execute: Read('.claude/skill-library/research/orchestrating-research/SKILL.md')
  Follow the orchestrating-research workflow completely.

  Write full research output to {OUTPUT_DIR}/research-output.md
  Write SYNTHESIS.md to {OUTPUT_DIR}/SYNTHESIS.md

  Return only:
  - SOURCES_CONSULTED: count
  - KEY_PATTERNS: 3-5 bullet summary
  - CONFLICTS_FOUND: count
  - SYNTHESIS_READY: true/false
")
```

**Token savings:** ~3,000-5,000 tokens (research output and sources not in orchestrator context)

---

## Phase 6.3: Reference File Generation Agent

```
Task(subagent_type: "general-purpose", prompt: "
  REFERENCE FILE GENERATION TASK:
  - Skill path: {skill-path}
  - Skill type: {type from Phase 4}

  Read: {OUTPUT_DIR}/SYNTHESIS.md
  Read: {skill-path}/SKILL.md (to understand skill structure)

  Generate reference files based on skill type:
  - Process skills: workflow.md, advanced-patterns.md, anti-patterns.md
  - Library skills: api-reference.md, examples.md, troubleshooting.md
  - Integration skills: setup.md, configuration.md, error-handling.md

  Each file must:
  - Be <400 lines (hard limit)
  - Contain >50 lines of substantive content (not placeholders)
  - Use content from SYNTHESIS.md research

  Write files to {skill-path}/references/
  Write summary to {OUTPUT_DIR}/reference-generation.md

  Return only:
  - FILES_CREATED: list of filenames
  - TOTAL_LINES: sum across all files
  - SYNTHESIS_INCORPORATED: true/false
")
```

**Token savings:** ~2,000-4,000 tokens (reference file content not in orchestrator context)

---

## Phase 8.4.1: Fix Audit Issues Agent

```
Task(subagent_type: "general-purpose", prompt: "
  FIX AUDIT ISSUES TASK:
  - Skill path: {skill-path}

  Read: {OUTPUT_DIR}/audit-results.md

  Fix all CRITICAL and HIGH issues in:
  - {skill-path}/SKILL.md
  - {skill-path}/references/*.md

  Common fixes:
  - Line count violations: extract to reference files
  - Missing Integration section: add with proper format
  - Broken links: correct paths
  - Phase numbering: use sequential integers

  Write fix summary to {OUTPUT_DIR}/fix-results.md

  Return only:
  - ISSUES_FIXED: count
  - REMAINING_ISSUES: count
  - LINE_COUNT_AFTER: SKILL.md line count
")
```

**Token savings:** ~1,000-2,000 tokens (edit operations and content not in orchestrator context)

---

## Phase 7.1: Gateway Analysis Agent

```
Task(subagent_type: "general-purpose", prompt: "
  GATEWAY ANALYSIS TASK:
  - New skill: {skill-name}
  - Skill path: {skill-path}
  - Skill purpose: {from Phase 4 + RED summary}

  ANALYSIS REQUIRED:
  1. Read {skill-path}/SKILL.md to understand its purpose
  2. Identify which agents would consume this skill (search .claude/agents/)
  3. For each potential consumer, check which gateway they invoke in Step 1
  4. Determine correct gateway(s) based on skill PURPOSE, not path

  DO NOT use deterministic path-to-gateway mapping.

  Write analysis to {OUTPUT_DIR}/gateway-analysis.md including:
  - Skill purpose summary
  - Potential consumer agents found
  - Gateway recommendation with reasoning

  Return: recommended gateway(s), consumer agents identified, confidence level
")
```

**Token savings:** ~2,000 tokens (agent definitions and gateway content not in orchestrator context)

---

## Phase 8.4: Audit Agent

```
Task(subagent_type: "general-purpose", prompt: "
  Run /skill-manager audit {skill-name}

  Write full audit report to {OUTPUT_DIR}/audit-results.md

  Return only:
  - VERDICT: pass/fail
  - Critical issues: count + one-line summaries
  - Warnings: count only
  - Blocking issues that must be fixed before proceeding
")
```

**Token savings:** ~1,500-2,500 tokens (full audit in file, only summary in orchestrator context)

---

## Total Token Savings

| Phase | Before (inline) | After (delegated) | Savings |
|-------|-----------------|-------------------|---------|
| 5.2   | ~5,500 tokens   | ~700 tokens       | ~5,000-8,000 |
| 5.4   | ~1,050 tokens   | 0 (bundled)       | ~500 |
| 7.1   | ~6,600 tokens   | ~1,200 tokens     | ~2,000 |
| 8.4   | ~20,500 tokens  | ~500 tokens       | ~1,500-2,500 |
| **Total** | ~33,650 tokens | ~2,400 tokens | **~9,000-13,000** |
