# Anti-Patterns and Failure Modes

## Common Mistakes to Avoid

### 1. Skipping Blog Potential Scoring

**Anti-pattern:** Immediately generating outline without scoring when user asks for blog post.

**Why this fails:** Weak vulnerabilities become weak blog posts. Wastes time outlining content that won't be published.

**Correct approach:** Score first using rubric. If below 7.0, ask user whether to proceed.

**Rationalization to watch for:** "User asked for outline, so I'll generate one" → NO, score first.

---

### 2. Ad-Hoc Anonymization Decisions

**Anti-pattern:** Preserving or redacting names based on intuition rather than systematic rubric application.

**Why this fails:** Inconsistent decisions across 104 posts/year create legal exposure. Client relationships damaged by inconsistent vendor naming.

**Correct approach:** Create anonymization decision log with Entity/Category/Decision/Reason columns. Apply rubric systematically.

**Rationalization to watch for:** "This vendor name seems OK to include" → Apply rubric, don't guess.

---

### 3. Missing Engineer Markers in Obvious Gaps

**Anti-pattern:** Leaving vague statements like "early 2022" or "millions of users" without markers.

**Why this fails:** Legal exposure from inaccurate claims. Credibility damage from lack of precision.

**Correct approach:** Insert `[ENGINEER TO COMPLETE: ...]` markers for:
- Disclosure timeline without specific dates
- Severity claims without CVSS
- User counts without source approval
- Technical claims without POC evidence

**Rationalization to watch for:** "Disclosure timeline mentioned, so we're good" → Vague ≠ complete.

---

### 4. Generic Publishing Checklists

**Anti-pattern:** Using same generic checklist (Technical review, Legal review, SEO, Marketing) for every post.

**Why this fails:** Doesn't account for client-specific approval requirements or vendor-specific legal gates.

**Correct approach:** Auto-populate checklist based on anonymization log and Phase 1 analysis:
- `client_approval_pending: true` → Legal gate flagged
- Engineer markers > 15 → HIGH_COMPLEXITY technical validation
- CVSS > 9.0 → HIGH_PRIORITY marketing

---

### 5. Ignoring Voice Consistency

**Anti-pattern:** Generic titles like "Security Flaw in Healthcare App" with corporate tone.

**Why this fails:** Praetorian blog has distinct voice. Generic titles don't engage target audience.

**Correct approach:** Generate 3 title options:
1. Narrative hook (RECOMMENDED): "We Reported This Three Years Ago. It's Still There."
2. Technical depth (SEO): "[Vulnerability] Against [Target]: [Technical Detail]"
3. Practitioner-focused: "How [Common Assumption] Fails"

---

### 6. Forgetting ANONYMIZED Version Generation

**Anti-pattern:** Only creating original version when anonymization was applied.

**Why this fails:** Internal version accidentally shared publicly. Client details exposed.

**Correct approach:** IF ANY anonymization applied → Generate BOTH versions:
- `blog-outline-{n}-{slug}.md` (INTERNAL)
- `blog-outline-{n}-{slug}-ANONYMIZED.md` (PUBLIC)

---

### 7. Publishing with Incomplete Engineer Markers

**Anti-pattern:** Blog post goes live with `[ENGINEER TO COMPLETE: ...]` markers still present.

**Prevention:** Pre-publish validation:
```bash
grep -r "\[ENGINEER TO COMPLETE:" blog-outline-*.md
# MUST return 0 results
```

---

### 8. Weak Title Crafting

**Anti-pattern:** Corporate titles like "Abbott MyFreeStyle Vulnerability Report"

**Correct approach:** Generate A/B test options targeting narrative hook, technical depth, and practitioner focus. Test: Does it intrigue a CISO scrolling LinkedIn?

---

### 9. Ignoring Blog Potential Threshold

**Anti-pattern:** Score is 4.2/10 but generating full outline anyway.

**Correct approach:** Present score with reasons, ask for user override, document override reason in YAML if proceeding.

**User override cases:** Part of series, fills content gap, trending topic.

---

### 10. Skipping verifying-before-completion

**Anti-pattern:** Claiming "Done!" without verifying all 4 phases completed.

**Correct approach:** Before claiming completion, invoke `skill: "verifying-before-completion"` with exit criteria:
- Phase 1: Transcript analyzed, blog potential scored
- Phase 2: Anonymization rubric applied, ANONYMIZED version created
- Phase 3: Outline generated with engineer markers
- Phase 4: Publishing checklist auto-populated

---

## Detection Checklist

**Before finalizing blog post outline, verify:**

- [ ] Blog potential scored (not skipped because user asked for outline)
- [ ] Anonymization rubric applied systematically (decision log exists)
- [ ] Engineer markers inserted for all identified gaps
- [ ] Publishing checklist customized (not generic template)
- [ ] Voice profile referenced (Praetorian tone in title/hook)
- [ ] ANONYMIZED version created (if any redaction applied)
- [ ] verifying-before-completion invoked before claiming done

**If ANY item unchecked → Anti-pattern present, fix before delivery.**
