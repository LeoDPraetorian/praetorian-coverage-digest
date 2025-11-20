---
name: skill-opportunity-detector
description: Use when reviewing a session to identify repetitive patterns that should be captured as reusable skills - analyzes conversation history for repeated workflows, evaluates skill-worthiness using systematic criteria, and proposes skill candidates for creation with writing-skills
---

# Skill Opportunity Detector

Systematically identify patterns in development sessions that should be captured as reusable skills.

## When to Use This Skill

**Trigger this skill when:**
- Completing a long development session with multiple similar tasks
- Noticing you've implemented the same type of feature multiple times
- Wondering "should this pattern be a skill?"
- Reviewing work to capture institutional knowledge
- Building up the skill ecosystem proactively

**User phrases that trigger this:**
- "Review this session for skill opportunities"
- "Are there any patterns worth capturing as skills?"
- "Should this be a skill?"
- "We've done this multiple times now"

## The Process

### Step 1: Analyze Session History

Review the current conversation for repetitive patterns:

**Task Repetition:**
- Same type of task performed 3+ times
- Similar workflows with minor variations
- Repeated use of same domain knowledge

**Examples:**
- "Create GraphQL resolver for User/Post/Comment" (3 similar tasks)
- "Implement OAuth for GitHub/Google/Microsoft" (repeated integration pattern)
- "Add CRUD API for Users/Products/Orders" (standard workflow)

**Code Pattern Repetition:**
- Created 3+ files with similar structure
- Repeated similar git commits
- Modified same types of files multiple times

**Tool/Command Repetition:**
- Same bash command patterns × 3+
- Similar tool usage sequences
- Consistent problem-solving approaches

### Step 2: Extract Pattern Candidates

For each detected pattern, document:

**Pattern Name:** What should this be called?
- Example: "graphql-resolver-patterns"
- Example: "oauth-provider-integration"
- Example: "crud-api-generator"

**Occurrence Count:** How many times in this session?
- Minimum threshold: 3 occurrences
- Sweet spot: 3-5 occurrences shows clear pattern

**Common Elements:** What stays the same?
- File structure
- Code patterns
- Workflow steps
- Configuration needs

**Variable Elements:** What changes each time?
- Model names
- Provider names
- Specific configurations

### Step 3: Evaluate Skill-Worthiness

Use the evaluation rubric from @evaluation-rubric.md:

**Quick Checklist:**
1. ✓ **Frequency**: Repeated 3+ times in session?
2. ✓ **Generality**: Applies beyond this codebase?
3. ✓ **Novelty**: Not covered by existing skills?
4. ✓ **Complexity**: Multi-step workflow with domain knowledge?
5. ✓ **Reusability**: Would benefit other users/sessions?

**Scoring:**
- 5/5 yes → Strong skill candidate, create immediately
- 4/5 yes → Likely valuable, evaluate tradeoffs
- 3/5 or less → Not skill-worthy yet, document as notes

**See @evaluation-rubric.md for detailed criteria and edge cases.**

### Step 4: Propose Skill Creation

For approved candidates, provide structured proposal:

```markdown
## Skill Proposal: {skill-name}

**Pattern Detected:**
{Description of what pattern was observed}

**Occurrences in Session:**
- Task 1: {description}
- Task 2: {description}
- Task 3: {description}

**Evaluation Score:** {X}/5
- ✓ Frequency: {reasoning}
- ✓ Generality: {reasoning}
- ✓ Novelty: {reasoning}
- ✓ Complexity: {reasoning}
- ✓ Reusability: {reasoning}

**Proposed Skill Scope:**
- What it covers: {key workflows}
- What it doesn't: {boundaries}
- Related skills: {existing skills to reference}

**Recommendation:** {Create / Wait / Document Only}
```

### Step 5: Handoff to Skill Creation

If approved for creation:

**Use the writing-skills skill to create the new skill.**

Provide the proposal as input:
- Pattern description
- Key workflows to document
- Examples from this session
- Related skills to reference

## Common Patterns to Watch For

### Pattern Category: API Development

**Indicators:**
- Created 3+ REST endpoints with similar structure
- Implemented 3+ GraphQL resolvers
- Built 3+ service integrations

**Potential Skills:**
- "rest-api-patterns"
- "graphql-resolver-patterns"
- "third-party-integration-workflow"

### Pattern Category: Infrastructure

**Indicators:**
- Deployed to 3+ cloud providers
- Configured 3+ similar services
- Set up 3+ similar environments

**Potential Skills:**
- "multi-cloud-deployment"
- "service-configuration-patterns"
- "environment-setup-workflow"

### Pattern Category: Testing

**Indicators:**
- Wrote 3+ similar test suites
- Implemented 3+ testing patterns
- Created 3+ mock patterns

**Potential Skills:**
- "integration-test-patterns"
- "mock-factory-patterns"
- "e2e-test-workflow"

**See @detection-patterns.md for comprehensive pattern catalog.**

## Anti-Patterns (Not Skill-Worthy)

**One-off tasks:**
- Only done once in session
- Unlikely to repeat

**Too specific:**
- Only applies to this exact codebase
- Hard-coded to specific context

**Already covered:**
- Existing skill handles this
- Better to update existing skill

**Too simple:**
- Single command or trivial operation
- No domain knowledge required

**See @examples.md for good vs bad skill candidates with explanations.**

## Output Format

### For Skill-Worthy Patterns

```markdown
🎯 **Skill Opportunity Detected**

**Pattern:** {name}
**Occurrences:** {count} times in this session
**Score:** {X}/5 (Recommended: Create)

**What it would cover:**
- {Workflow step 1}
- {Workflow step 2}
- {Workflow step 3}

**Next step:** Use writing-skills to create this skill?
```

### For Not-Yet-Worthy Patterns

```markdown
📝 **Pattern Observed** (Not Skill-Worthy Yet)

**Pattern:** {name}
**Occurrences:** {count} times
**Score:** {X}/5 (Recommendation: Document as notes)

**Why not a skill:**
- {Specific reason from rubric}

**Suggested action:** Keep notes, revisit after {condition}
```

## Integration with Existing Skills

**This skill works with:**

**writing-skills:**
- Handoff skill candidates for creation
- Provides pattern analysis as input
- Ensures CSO compliance for new skills

**Existing domain skills:**
- Check if pattern already covered
- Propose updates vs new skills
- Avoid duplication

## Best Practices

1. **Review periodically**: Don't wait until end of session
2. **Lower threshold in exploratory work**: New domain = more patterns
3. **Consider combinations**: Multiple small patterns might form one skill
4. **Think ecosystem**: How does this fit with existing skills?
5. **Document everything**: Even rejected patterns inform future decisions

## Quick Start

**To use this skill:**

1. Say: "Review this session for skill opportunities"
2. Agent analyzes conversation history
3. Reviews proposed patterns and scores
4. Approves valuable candidates
5. Agent uses writing-skills to create skill

**Example usage:**
```
User: "Review for skill opportunities"

Agent: "Analyzing session...

Found 2 patterns:

1. GraphQL Resolver Pattern (5/5) - RECOMMEND CREATE
   - Created resolvers for User, Post, Comment
   - All follow same structure with authentication

2. Database Migration Pattern (3/5) - DOCUMENT ONLY
   - Only 2 migrations, not enough evidence yet

Should I create 'graphql-resolver-patterns' skill?"
```

## Reference Files

- **@detection-patterns.md**: Comprehensive catalog of detectable patterns with examples
- **@evaluation-rubric.md**: Detailed skill-worthiness criteria and scoring
- **@examples.md**: Case studies of good vs bad skill candidates

## Related Skills

- **writing-skills**: Use for actually creating detected skill opportunities
- **skill-creator**: (deprecated, use writing-skills instead)
