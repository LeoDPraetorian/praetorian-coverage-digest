# Anti-Patterns in Security Test Case Generation

**Common failures when generating test case documentation and how to avoid them.**

---

## Critical Anti-Patterns

### ❌ Anti-Pattern 1: Skipping Scoping Questions

**Bad Example:**
```
Agent sees CLAUDE.md mentions "Go backend" and "Burp Suite"
Agent assumes these are available
Agent generates Burp-specific instructions
```

**Why This Fails:**
- User may not have Burp Suite Professional license
- Assessment may be on client laptop with limited tooling
- User constraints (time, budget, access) not reflected in repository docs

**Impact:**
- Generated instructions are unusable
- User must rewrite all commands
- Wastes assessment time

**Fix:**
Always ask via AskUserQuestion:
```
Question: What security testing tools are available?
Options:
1. Burp Suite Professional
2. Burp Community + curl
3. curl + Postman only
4. Browser DevTools + curl
```

**Evidence This Works:**
In RED phase testing, agent created Burp-heavy instructions. User's actual tools were "Burp Suite, Postman, curl" - mismatch required manual adaptation.

---

### ❌ Anti-Pattern 2: Generic Placeholder Content

**Bad Example:**
```markdown
## Test Steps

### Step 1: Configure the tool
[Configure the tool appropriately based on your environment]

### Step 2: Run the test
[Execute the test and observe the results]

### Step 3: Document findings
[Record any issues discovered]
```

**Why This Fails:**
- Not actionable - requires complete rewrite
- No copy-paste commands
- No clear pass/fail criteria
- User must figure out HOW to configure, run, document

**Impact:**
- Testing takes 3x longer (user invents everything)
- Inconsistent execution across test cases
- Missing critical steps

**Fix:**
Provide specific commands even if they need minor customization:

```markdown
## Test Steps

### Step 1: Query OAuth Discovery Endpoint

**Command:**
\`\`\`bash
TENANT="oauth-service.example.com"  # User customizes domain
curl -s "https://${TENANT}/oauth2/default/.well-known/openid-configuration" | jq .
\`\`\`

**Expected Output:**
\`\`\`json
{
  "grant_types_supported": ["authorization_code", "refresh_token"],
  ...
}
\`\`\`

**Pass Criteria:** ✅ `implicit` NOT in `grant_types_supported`
**Fail Criteria:** ❌ `implicit` present → DEPRECATED grant type enabled
```

**Key Principle:** Provide 90% complete commands. User customizes 10% (URLs, domains).

---

### ❌ Anti-Pattern 3: Assuming Assessment Duration

**Bad Example:**
```
User says: "2-3 day OAuth assessment"
Agent generates: 5 test cases × 500 lines each = 2,500 lines of documentation
Agent includes: Full automation suite, edge cases, advanced attack scenarios
Reality: User can't read 2,500 lines in 2-3 days, let alone execute
```

**Why This Fails:**
- Mismatch between documentation detail and available time
- User overwhelmed by content
- Critical paths buried in comprehensive instructions

**Impact:**
- User skips steps due to time pressure
- Important tests not executed
- Assessment scope not completed

**Fix:**
Use Phase 2.2 timeframe answer to calibrate:

| Timeframe | Lines per TC | Automation | Edge Cases |
|-----------|--------------|------------|------------|
| 1-2 days | 100-150 | No | No |
| 3-5 days | 200-300 | Optional | Some |
| 1+ week | 300-500 | Yes | Yes |

**Example Calibration:**
- **1-2 days:** "Test implicit flow" → 3 critical steps, 150 lines
- **3-5 days:** "Test implicit flow" → 5 steps + automation, 250 lines
- **1+ week:** "Test implicit flow" → 8 steps + edge cases + full automation, 400 lines

---

### ❌ Anti-Pattern 4: Missing Time Estimates

**Bad Example:**
```markdown
# TC-1: Test API Authentication

## Test Steps
[15 detailed steps with complex commands]

[No time estimate provided]
```

**Why This Fails:**
- User can't plan assessment schedule
- Risk of running out of time mid-assessment
- No prioritization guidance if time-limited

**Impact:**
- User completes TC-1-3, skips TC-4-5 due to time
- TC-4-5 might have been higher priority
- Assessment deliverables incomplete

**Fix:**
Include time estimate in every test case:

```markdown
# TC-1: Test API Authentication

**Time Estimate:**
- Manual execution: 15-20 minutes
- Automated execution: 3-5 minutes
- Documentation: 5 minutes
- **Total:** 20-25 minutes (manual) | 8-10 minutes (automated)

**Priority:** HIGH (complete first)
```

**Calibration Guide:**
- Simple API test: 10-15 min
- Complex authentication flow: 20-30 min
- Load testing: 30-45 min
- Browser-based testing: 15-25 min

---

## Medium-Severity Anti-Patterns

### ❌ Anti-Pattern 5: Tool Availability Assumptions

**Bad:**
Assume Python 3, Burp Suite Professional, Postman, AWS CLI all available

**Fix:**
Ask Phase 2.1 question, then generate commands ONLY for available tools

If user says "curl only":
- ❌ Don't include: Burp Repeater steps
- ❌ Don't include: Python automation scripts
- ✅ Do include: Pure curl commands with detailed flags
- ✅ Do include: jq parsing for response validation

---

### ❌ Anti-Pattern 6: Inconsistent Finding Templates

**Bad:**
- TC-1 uses PlexTrac format with CVSS
- TC-2 uses simple markdown
- TC-3 uses SARIF JSON
- User now has 3 different finding formats to consolidate

**Fix:**
Ask Phase 2.4 (output format preference) once, apply consistently

```
Question: What finding format?
Options:
1. PlexTrac-compatible (CVSS, Impact, Remediation)
2. Simple markdown (Title, Description, Fix)
3. SARIF JSON (machine-readable)

[Apply chosen format to ALL test cases]
```

---

### ❌ Anti-Pattern 7: Ignoring Existing Templates

**Bad:**
User says: "I have existing test case format we use"
Agent: "OK, generating standard format anyway"
Result: User must reformat everything to match their template

**Fix:**
Ask Phase 2.5:

```
Question: Do you have existing templates to follow?
Options:
1. Yes (I'll provide examples)
2. No (use standard format)

If "Yes":
- Ask for example file path
- Read example file
- Extract format patterns (section order, naming, finding structure)
- Apply extracted patterns to all generated test cases
```

---

### ❌ Anti-Pattern 8: No Master README

**Bad:**
Generate TC-1.md, TC-2.md, TC-3.md, TC-4.md, TC-5.md
No overview, no prerequisites, no execution order
User: "Where do I start? What order? What tools do I need?"

**Fix:**
Always generate README.md with:
- Test case overview table
- Prerequisites (tools, access, environment)
- Recommended execution order
- Total time estimate
- Finding documentation guidance

---

### ❌ Anti-Pattern 9: Automation Without Justification

**Bad:**
1-2 day assessment
Generate 200-line Python automation scripts for every test case
User never has time to review/execute automation

**Fix:**
**Automation criteria:**
- ✅ Include if: Timeframe ≥ 3 days AND saves >50% time
- ❌ Skip if: Timeframe < 3 days OR tool not available
- ⚠️ Optional if: User specifically requests it

**Example:**
- 1-2 day assessment: Manual curl commands only
- 3-5 day assessment: Optional Python scripts for repetitive tests
- 1+ week assessment: Full automation suite with CI/CD integration

---

## Low-Severity Anti-Patterns

### ❌ Anti-Pattern 10: Overly Verbose Output

**Bad:**
Create 132KB of documentation for 3 simple test cases (from RED phase)

**Fix:**
Target line counts based on complexity:
- Simple test (API call with assertion): 100-150 lines
- Medium test (multi-step with browser): 200-300 lines
- Complex test (stateful flow with automation): 300-500 lines

---

### ❌ Anti-Pattern 11: No Compliance Mapping

**Bad:**
User doing SOC 2 audit
No mapping to NIST 800-53 or SOC 2 trust service criteria
User must manually map each finding

**Fix:**
If Assessment Type = "Compliance":
- Include compliance mapping table in README
- Add control references to each test case
- Link findings to specific control requirements

---

### ❌ Anti-Pattern 12: Hardcoded Values

**Bad:**
```bash
curl "https://hardcoded-service.example.com/api/v1/users"
```

User must find and replace every hardcoded value in every file

**Fix:**
```bash
TENANT="oauth-service.example.com"  # User sets once at top of file
curl "https://${TENANT}/api/v1/users"
```

**Convention:**
- Use environment variables for repeated values
- Provide clear substitution markers like `{TENANT}` or `${VARIABLE}`
- Include setup section at top of README

---

## Rationalization Detection

### Red Flag Phrases

| Phrase | What It Really Means | Fix |
|--------|---------------------|-----|
| "I'll infer from context" | Skipping scoping questions | Ask via AskUserQuestion |
| "Standard format should work" | Ignoring user preferences | Ask Phase 2.4 (format) |
| "They probably have Burp" | Assuming tool availability | Ask Phase 2.1 (tools) |
| "Add placeholders for now" | Creating unusable content | Provide specific commands |
| "This is comprehensive" | Ignoring timeframe constraints | Check Phase 2.2 (timeframe) |
| "Close enough to reuse" | Not reading user's existing templates | Read and extract patterns |

### Verification Checklist

Before marking Phase 6 complete:

- [ ] All Phase 2 scoping questions asked (5 questions)
- [ ] Tool-specific commands match available tools answer
- [ ] Detail level matches timeframe answer (1-2 days = concise)
- [ ] Finding templates match format preference answer
- [ ] Existing templates analyzed if provided
- [ ] Every test case has time estimate
- [ ] README.md created with prerequisites and execution order
- [ ] No placeholder content (all commands actionable)
- [ ] Automation scripts only if timeframe ≥ 3 days

---

## Recovery from Anti-Patterns

### If You Realize You Skipped Scoping

**Symptom:** Generated test cases, then realized you assumed tools

**Recovery:**
1. Stop immediately
2. Ask Phase 2 scoping questions NOW
3. Compare answers to generated content
4. Regenerate test cases matching actual constraints
5. Update changelog documenting the fix

**Do NOT:** Continue with mismatched content hoping user won't notice

---

### If You Generated Placeholders

**Symptom:** Test cases full of `[TODO]`, `[CUSTOMIZE]`, `[INSERT COMMAND]`

**Recovery:**
1. Identify all placeholder sections
2. Replace with specific commands (even if they need minor URL customization)
3. If you lack domain knowledge: mark clearly as `[USER: Customize endpoint URL]`
4. Verify >90% of content is actionable

---

### If You Mis-Calibrated Detail Level

**Symptom:** Created 500-line test cases for 1-2 day assessment

**Recovery:**
1. Extract critical path (3-5 most important steps)
2. Create condensed version (100-150 lines)
3. Save comprehensive version as `TC-X-comprehensive.md` (optional reference)
4. Update README to reference condensed versions

---

## Success Patterns (Do This Instead)

### ✅ Success Pattern: Systematic Scoping

1. Ask ALL Phase 2 questions (no shortcuts)
2. Document answers in variables (TOOLS, TIMEFRAME, ASSESSMENT_TYPE, FORMAT)
3. Use answers to drive every generation decision
4. Verify consistency in Phase 6.2

### ✅ Success Pattern: Actionable Content

- 90% complete commands (user customizes URLs/domains)
- Clear pass/fail criteria
- Copy-paste ready
- Minimal "TODO" sections

### ✅ Success Pattern: Calibrated Detail

- 1-2 days: Focus on critical paths, concise instructions
- 3-5 days: Balanced detail with optional automation
- 1+ week: Comprehensive with full automation suite

### ✅ Success Pattern: Consistent Format

- Ask format preference once (Phase 2.4)
- Apply to ALL test cases
- Same section order, same finding structure
- Easy for user to navigate and consolidate

---
