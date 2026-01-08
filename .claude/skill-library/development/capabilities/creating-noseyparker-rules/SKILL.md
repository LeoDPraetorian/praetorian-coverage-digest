---
name: creating-noseyparker-rules
description: Use when creating new credential detection rules for NoseyParker secret scanner - guides complete workflow from format research through validation with human-in-the-loop GitHub validation
---

# Creating NoseyParker Rules

## When to Use

Use this skill when:
- User requests a new credential detection rule for NoseyParker
- User provides a credential type that needs detection (e.g., "create rule for Stripe API keys")
- User wants to add scanning capability for a specific secret format

## Workflow Overview

**8-Phase Semi-Automated Workflow** (~75% automated)

Human interaction points:
1. **Phase 4**: GitHub validation (5 minutes - structured feedback)
2. **Phase 10**: Final approval before integration

## Phase 1: Intake & Validation

### Input
User provides credential type name (e.g., "AWS Access Key", "Stripe API Key", "GitHub Token")

### Actions
```yaml
1. Validate input:
   - Confirm credential type is specific enough
   - Clarify if ambiguous (use AskUserQuestion)

2. Check for existing rules:
   - Search NoseyParker's 87 built-in rules
   - Location: modules/noseyparker/crates/noseyparker/data/default/builtin/rules/
   - If exists: Inform user, ask if updating or creating variant

3. Initialize TodoWrite with 8 phases:
   - Format research
   - Regex generation
   - GitHub validation (human-in-loop)
   - Example preparation
   - Documentation generation
   - Rule file creation
   - Validation testing
   - Final approval
```

### Output
Confirmed credential type + project plan

---

## Phase 2: Format Research

### Actions
```yaml
1. Use orchestrating-research skill:
   Query: "[Credential Type] format specification structure prefixes length character-set"
   Sources: Web search primary, Context7 if available

2. Extract from research:
   - Distinctive prefixes (e.g., AKIA, ghp_, sk-)
   - Fixed length requirements
   - Character set restrictions (alphanumeric, base64, hex)
   - Checksum algorithms if any
   - Official documentation URLs

3. Document findings:
   Format Specification:
   - Prefix: [value or "none"]
   - Length: [exact or range]
   - Character set: [allowed characters]
   - Structure: [description]
   - References: [URLs]
```

### Output
Format specification document saved to research output

---

## Phase 3: Regex Pattern Generation

### Input
Format specification from Phase 2

### Actions
```yaml
1. Generate initial regex pattern:

   Template Selection:
   - Prefix-based: \b{PREFIX}[{CHARSET}]{{LENGTH}}\b
   - Length-constrained: \b[{CHARSET}]{{MIN},{MAX}}\b
   - Multi-part: {PART1}:{PART2} or {PART1}[delimiter]{PART2}
   - Base64: [A-Za-z0-9+/]{{LENGTH}}={0,2}
   - UUID: [0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}

2. Apply NoseyParker requirements:
   - Add capture group: (?P<secret>PATTERN)
   - Add word boundaries if applicable
   - Use verbose mode for readability:
     (?x)
     \b
     (?P<key>PATTERN)  # Comment
     \b

3. Apply best practices:
   - Match distinctive prefixes when available
   - Use word boundaries \b to prevent partial matches
   - Include length constraints for exact formats
   - Prioritize readability over cleverness
```

### Example Output
```yaml
pattern: |
  (?x)
  \b
  (?P<key>AKIA[0-9A-Z]{16})  # AWS access key prefix + 16 chars
  \b
```

---

## Phase 4: GitHub Validation (Human-in-the-Loop)

### Input
Initial regex pattern from Phase 3

### Actions
```yaml
1. Generate GitHub search query:
   - Format: /{regex}/ language:python
   - Create URL: https://github.com/search?type=code&q={encoded_query}
   - Prepare alternative language searches (JavaScript, Go, Java)

2. Present to human via output message:
   "I've generated this regex for {Credential Type}:

   Pattern: {regex}

   Please validate on GitHub:

   Primary search (Python):
   {clickable_url_python}

   Alternative searches:
   - JavaScript: {clickable_url_js}
   - Go: {clickable_url_go}

   Instructions:
   1. Click the link to open GitHub code search
   2. Review the first 20-30 results
   3. I'll ask you some questions about what you found"

3. Collect structured feedback using AskUserQuestion:

   Questions:
   - question: "How many matches did you find?"
     header: "Match count"
     options:
       - label: "0-10 matches"
         description: "Very few matches - pattern may be too specific"
       - label: "10-100 matches"
         description: "Good amount - validates pattern usefulness"
       - label: "100-1000 matches"
         description: "Many matches - common credential type"
       - label: "1000+ matches"
         description: "Very common - ensure precision to avoid false positives"

   - question: "What percentage appear to be real credentials (vs test data, examples, placeholders)?"
     header: "Real creds %"
     options:
       - label: "0-25% real"
         description: "Mostly false positives - pattern needs significant refinement"
       - label: "25-50% real"
         description: "Some false positives - pattern needs refinement"
       - label: "50-75% real"
         description: "Good precision - may need minor refinement"
       - label: "75-100% real"
         description: "Excellent precision - ready to proceed"

   - question: "Please paste 3-5 example strings you found (copy from GitHub results):"
     header: "Examples"
     # Free text multiline input

   - question: "Did you notice any false positive patterns?"
     header: "FP patterns"
     options:
       - label: "No false positives observed"
         description: "All matches appeared to be real credentials"
       - label: "Yes, describe below"
         description: "I'll describe the false positive patterns I noticed"

   If "Yes, describe below":
   - question: "Describe the false positive patterns (e.g., 'base64 strings in comments', 'test placeholders like AKIATEST'):"
     header: "FP details"
     # Free text input

4. Process feedback:

   match_count = parse_match_count(feedback)
   real_cred_pct = parse_real_cred_percentage(feedback)
   examples = extract_examples(feedback)
   fp_patterns = extract_fp_patterns(feedback)

   Quality Gate Checks:
   - If match_count < 20:
     → Pattern too specific, consider broadening
     → Ask user if format spec might be incomplete

   - If real_cred_pct < 60%:
     → High false positive rate, trigger refinement
     → Proceed to Phase 5

   - If len(examples) < 3:
     → Request more examples
     → Cannot proceed without sufficient test data

   - If real_cred_pct >= 60% AND match_count >= 20:
     → Quality gates passed
     → Extract examples for YAML
     → Document FP patterns for negative examples
     → Proceed to Phase 6

5. Generate validation summary:
   "GitHub Validation Results:
   ✅ Matches found: {match_count}
   ✅ Real credential rate: {real_cred_pct}%
   ✅ Examples collected: {len(examples)}
   ⚠️  False positive patterns: {fp_patterns if any else 'None observed'}

   Status: {PASS/REFINE_NEEDED}"
```

### Output
- Validated regex (or flagged for refinement)
- Real-world examples (3-5 strings)
- False positive patterns identified
- Validation metrics

---

## Phase 5: Pattern Refinement (Conditional)

### Trigger
Only if Phase 4 quality gates failed (match_count < 20 OR real_cred_pct < 60%)

### Input
Human feedback from Phase 4

### Actions
```yaml
1. Analyze failure mode:

   If match_count < 20:
     - Pattern is too specific
     - Check if format spec was incomplete
     - Broaden character class or length constraints
     - Example: [A-Z0-9] → [A-Za-z0-9]

   If real_cred_pct < 60%:
     - High false positive rate
     - Add negative lookaheads for FP patterns
     - Add word boundary constraints
     - Add context requirements

2. Apply refinement strategies:

   For "test placeholder" FPs:
     - Add: (?!.*EXAMPLE|.*TEST|.*DEMO|.*SAMPLE)

   For "comment/documentation" FPs:
     - Require non-comment context
     - Add: (?<!#|//)

   For "repeated character" FPs:
     - Add: (?!.*(.)\1{5,})  # No 6+ repeated chars

   For "base64 in wrong context" FPs:
     - Add contextual anchors
     - Require variable assignment or API usage context

3. Document changes:
   "Refinement Applied:
   Issue: {problem}
   Solution: {regex_change}
   Reasoning: {explanation}"

4. Return to Phase 4 for re-validation:
   - Generate new GitHub search URL
   - Request human validation again
   - Apply quality gates
   - Max 3 iterations (if >3, flag for manual review)
```

### Output
Refined regex pattern + iteration notes

---

## Phase 6: Example Preparation

### Input
Examples from Phase 4 human feedback

### Actions
```yaml
1. Validate examples from human:
   for each example in examples:
     if regex.match(example):
       ✅ Example valid
     else:
       ⚠️  Example doesn't match pattern - investigate

2. Check if examples need mangling:
   - If examples contain EXAMPLE, TEST, DEMO, SAMPLE:
     → Already safe (from documentation)
   - If examples look like real credentials:
     → CRITICAL: Mangle while preserving structure

3. Mangling algorithm (if needed):

   def mangle_credential(cred, format_spec):
       if format_spec['type'] == 'prefix_based':
           prefix = format_spec['prefix']
           length = format_spec['length']
           charset = format_spec['charset']
           # Keep prefix, randomize rest with "EXAMPLE" marker
           return prefix + "EXAMPLE" + random_string(length - len(prefix) - 7, charset)

       elif format_spec['type'] == 'checksum':
           # Modify digits, invalidate checksum
           return invalidate_checksum(cred)

       elif format_spec['type'] == 'uuid':
           # Use standardized invalid UUID
           return "00000000-0000-0000-0000-000000000000"

       elif format_spec['type'] == 'generic':
           # Replace with random but marked as test
           return "TEST" + random_string(len(cred) - 4, charset)

4. Validate mangled examples still match:
   for each mangled_example:
     assert regex.match(mangled_example), "Mangling broke pattern match"

5. Select 2-3 best examples:
   - Show format variations if applicable
   - Include context examples (env var, config file)
```

### Example Output
```yaml
examples:
  - "AKIAIOSFODNN7EXAMPLE"
  - "export AWS_ACCESS_KEY_ID=ASIATESTACCESSKEY123"
  - "aws_access_key_id = AIDACKCEVSQ6C2EXAMPLE"
```

---

## Phase 7: Documentation & Rule Generation

### Input
- Validated regex pattern
- Safe test examples
- Format specification
- False positive patterns

### Actions
```yaml
1. Generate rule metadata:

   id: Generate unique ID
     Format: np.{provider}.{number}
     Example: np.aws.1, np.stripe.1, np.github.5
     Check existing IDs to avoid conflicts

   name: Human-readable title
     Format: "{Provider} {Credential Type}"
     Example: "AWS Access Key ID"

   description: Security impact explanation
     Template:
     "{Credential Type} used for {purpose}. An attacker with this
     credential can {capabilities}. Potential impact includes {risks}."

     Example:
     "AWS Access Key ID used for programmatic API authentication.
     An attacker with this key (and corresponding secret key) can
     access AWS resources and potentially exfiltrate data, launch
     instances, or modify infrastructure."

   references: Official documentation URLs
     From Phase 2 format research
     Include authentication docs, format specs, best practices

   categories: Apply relevant tags
     Options:
     - api: API authentication
     - secret: Secret value (not just identifier)
     - identifier: Identifier only (needs pairing)
     - hashed: Hashed/derived value
     - test: Test/development credential
     - fuzzy: Low confidence pattern
     - generic: Generic high-entropy detection

2. Generate negative examples from FP patterns:

   From Phase 4 FP feedback:
   - "Repeated padding" → "AKIA=================="
   - "Too short" → "AKIATEST"
   - "Comment context" → "# Set AWS_KEY=AKIAEXAMPLE"
   - "Placeholder text" → "YOUR_AWS_KEY_HERE"

3. Create complete YAML rule file:

```yaml
rules:
  - id: {generated_id}
    name: {generated_name}
    pattern: |
      {validated_regex_with_verbose_formatting}

    examples:
      {safe_examples_from_phase_6}

    negative_examples:
      {fp_patterns_from_phase_4}

    description: |
      {generated_description}

    references:
      {urls_from_format_research}

    categories:
      {applicable_categories}
```

4. Save rule file:
   Path: .claude/.output/noseyparker-rules/{timestamp}-{credential-type}/rule.yml
```

### Output
Complete YAML rule file

---

## Phase 8: Validation Testing

### Input
Complete rule file from Phase 7

### Actions
```yaml
1. Run NoseyParker validation:

   Command:
   noseyparker rules check --rules-path={rule_file_path}

   Validates:
   - ✅ All examples match the pattern
   - ✅ All negative_examples do NOT match
   - ✅ Rule structure is valid YAML
   - ✅ Pattern compiles successfully
   - ✅ Required fields present

2. Parse validation results:

   If PASS:
     → Proceed to Phase 10 (Final Approval)

   If FAIL:
     → Parse error messages
     → Identify issue:
       - Example doesn't match: Review examples in Phase 6
       - Negative example matches: Regex too broad, refine in Phase 5
       - Pattern invalid: Syntax error, fix pattern
       - YAML invalid: Fix structure

     → Fix issue
     → Re-run validation
     → Max 3 attempts (if >3, flag for manual review)

3. Generate validation report:
   "Validation Results:
   ✅ Examples tested: {count_examples}
   ✅ Examples passed: {passed}
   ✅ Negative examples tested: {count_negative}
   ✅ Negative examples passed: {passed_negative}
   ✅ Pattern compiles: {yes/no}
   ✅ YAML structure valid: {yes/no}

   Status: {PASS/FAIL}
   {error_details if FAIL}"
```

### Output
Validation pass/fail + error details if failed

---

## Phase 9: Negative Example Generation

### Input
False positive patterns from Phase 4

### Actions
```yaml
1. Generate negative examples from FP patterns:

   FP Pattern: "Test placeholders"
   → negative_examples:
       - "AKIATEST123"
       - "AKIAEXAMPLE123"
       - "AKIADEMO"

   FP Pattern: "Comments"
   → negative_examples:
       - "# Example: AKIAIOSFODNN7"
       - "// Set your AWS key: AKIATEST"

   FP Pattern: "Repeated characters"
   → negative_examples:
       - "AKIA================"
       - "AAAAAAAAAAAAAAAAAAAA"

2. Add to rule file negative_examples field

3. Re-run validation (Phase 8) to ensure negative examples don't match
```

### Output
Rule with false positive prevention

---

## Phase 10: Final Human Approval

### Input
Complete validated rule + all metrics

### Actions
```yaml
1. Present comprehensive summary:

   "NoseyParker Rule Creation Complete!

   📋 Rule Summary:
   - ID: {id}
   - Name: {name}
   - Pattern: {regex}

   ✅ Quality Metrics:
   - noseyparker rules check: PASSED
   - GitHub validation: {match_count} matches, {real_cred_pct}% real credentials
   - Examples: {count} validated
   - Negative examples: {count} patterns excluded
   - False positive rate: {fp_rate}%

   📝 Examples:
   {display_examples}

   🚫 Negative Examples:
   {display_negative_examples}

   📚 References:
   {display_references}

   📁 Rule file saved to:
   {file_path}"

2. Request final approval using AskUserQuestion:

   question: "Ready to integrate this rule into NoseyParker?"
   header: "Final approval"
   options:
     - label: "Approve - integrate rule"
       description: "Rule meets quality standards, proceed with integration"
     - label: "Refine - iterate on pattern"
       description: "Return to Phase 5 for pattern refinement"
     - label: "Reject - start over"
       description: "Restart from Phase 2 with different approach"
     - label: "Save for later - manual review"
       description: "Save rule file but don't integrate yet"

3. Handle user response:

   If "Approve":
     → Proceed to Phase 11 (Integration)

   If "Refine":
     → Return to Phase 5
     → Increment iteration counter

   If "Reject":
     → Document rejection reason
     → Return to Phase 2

   If "Save for later":
     → Save to manual review directory
     → Document current state
     → Provide file path for future work
```

### Output
User decision + next action

---

## Phase 11: Integration

### Input
Approved rule from Phase 10

### Actions
```yaml
1. Determine target location:

   NoseyParker built-in rules:
   modules/noseyparker/crates/noseyparker/data/default/builtin/rules/{provider}.yml

   Custom rules directory:
   modules/noseyparker/custom-rules/{credential-type}.yml

2. Check if provider file exists:

   If exists (e.g., aws.yml):
     → Append rule to existing rules array
     → Maintain alphabetical order by ID

   If not exists:
     → Create new file
     → Use proper YAML structure with rules array

3. Copy rule to target location:

   cp {rule_file_path} {target_path}

4. Run full NoseyParker test suite:

   Command:
   cd modules/noseyparker
   noseyparker rules check  # Validate all rules including new one
   cargo test               # Run Rust test suite

5. Document integration:

   Create integration notes:
   - Rule ID: {id}
   - Date: {timestamp}
   - File: {target_path}
   - Test results: {pass/fail}
   - GitHub validation: {metrics}

6. Suggest next steps:

   "✅ Rule integrated successfully!

   Next steps:
   1. Test rule against real codebase:
      noseyparker scan --rules-path={target_path} {test_repo_path}

   2. Monitor for false positives in production use

   3. Create PR if contributing to NoseyParker upstream:
      - Branch: add-{credential-type}-rule
      - Include: Rule file, test results, validation metrics
      - Reference: GitHub validation data (X matches, Y% precision)

   4. Document in team wiki:
      - New detection capability added
      - Expected match rate: {metrics}
      - False positive handling: {negative_examples}"
```

### Output
Integrated rule + next steps

---

## Error Handling

### Common Issues

**1. Format research returns no results**
- Fallback to manual format specification entry
- Ask user to provide format details
- Use generic high-entropy pattern as baseline

**2. GitHub validation finds 0 matches**
- Pattern may be too specific
- Check if credential type is rare or theoretical
- Consider if detection is needed at all

**3. GitHub validation finds >90% false positives**
- Format specification may be incorrect
- Credential type may be too generic
- Consider if regex-based detection is appropriate
- May need entropy + context analysis instead

**4. Validation fails repeatedly (>3 iterations)**
- Flag for manual expert review
- Save all iteration history
- Document where automated approach failed
- Provide recommendations for manual completion

**5. Human provides insufficient feedback**
- Re-prompt with clearer instructions
- Offer to show example GitHub search screenshots
- Provide template for feedback format

---

## Success Criteria

Rule creation is complete when:

- ✅ Phase 8 validation passes (noseyparker rules check)
- ✅ GitHub validation showed >20 matches
- ✅ Real credential rate >60%
- ✅ False positive rate <40%
- ✅ Minimum 3 examples validated
- ✅ Negative examples prevent known FP patterns
- ✅ Human final approval granted
- ✅ Rule integrated into target location
- ✅ Full test suite passes

---

## Time Estimates

Per rule:
- Phase 1 (Intake): 2 minutes
- Phase 2 (Research): 5-10 minutes (automated)
- Phase 3 (Regex Gen): 2 minutes (automated)
- Phase 4 (GitHub Validation): **5 minutes (human)** ⚠️
- Phase 5 (Refinement): 3 minutes if needed (automated)
- Phase 6 (Examples): 2 minutes (automated)
- Phase 7 (Documentation): 3 minutes (automated)
- Phase 8 (Validation): 1 minute (automated)
- Phase 9 (Negative Examples): 2 minutes (automated)
- Phase 10 (Approval): **2 minutes (human)** ⚠️
- Phase 11 (Integration): 2 minutes (automated)

**Total: 10-15 minutes per rule** (vs. 30-45 minutes fully manual)
**Human time: ~7 minutes** (GitHub search + final approval)
**Automation: ~75%**

---

## Related Skills

- `orchestrating-research`: Used in Phase 2 for format research
- `using-todowrite`: Track progress across 8 phases
- `persisting-agent-outputs`: Save intermediate results
- `verifying-before-completion`: Phase 8 validation checks

---

## Example Usage

```
User: "Create a NoseyParker rule for Stripe API keys"