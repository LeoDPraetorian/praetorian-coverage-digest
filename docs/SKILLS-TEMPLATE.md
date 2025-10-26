# Claude Skills Template for Chariot Platform

## How to Use This Template

1. Copy this file to a new directory: `.claude/skills/{skill-name}/SKILL.md`
2. Replace all `[PLACEHOLDERS]` with actual content
3. Keep the YAML frontmatter format exactly as shown
4. Write clear, actionable instructions in the body
5. Include examples and anti-patterns

## File Structure

```
.claude/skills/
└── my-skill/
    ├── SKILL.md              # Required: Main skill file (this template)
    ├── reference/            # Optional: Additional documentation
    │   ├── examples.md
    │   └── patterns.md
    ├── scripts/              # Optional: Helper scripts
    │   └── helper.sh
    └── resources/            # Optional: Data files, templates
        └── template.json
```

---

## SKILL.md Template

```yaml
---
name: [skill-name]  # Lowercase with hyphens (e.g., chariot-api-development)
description: [Comprehensive description of what this skill does and when Claude should use it. Be specific about trigger conditions. Include keywords that should activate this skill automatically. Example: "Use when creating AWS Lambda handlers in Go for the Chariot platform, implementing authentication middleware, accessing DynamoDB, or working with security data models."]
license: MIT  # or Apache 2.0, or source-available
allowed-tools: [Read, Write, Edit, Grep, Bash]  # Claude Code only
metadata:
  version: 1.0.0
  platform: chariot
  domains: [backend, frontend, testing, security]  # Relevant domains
  last-updated: 2025-10-26
  author: [Your Name]
  related-skills: [other-skill-name]  # Optional: related skills
---

# [Skill Name]

[Brief overview: What this skill provides and when to use it]

## When to Use This Skill

Use this skill when:
- [Trigger condition 1]
- [Trigger condition 2]
- [Trigger condition 3]

## Key Patterns

### Pattern 1: [Pattern Name]

[Description of the pattern]

```[language]
// Example code
[code example]
```

**Why**: [Explanation of why this pattern is important]

### Pattern 2: [Pattern Name]

[Description of the pattern]

```[language]
// Example code
[code example]
```

**Why**: [Explanation of why this pattern is important]

## Code Structure

### File Locations

- **[Entity Type]**: `path/to/files/`
- **[Another Type]**: `path/to/other/files/`

### Naming Conventions

- [Convention 1]
- [Convention 2]

### Required Imports

```[language]
import (
    // Required imports
)
```

## Common Workflows

### Workflow 1: [Workflow Name]

**Goal**: [What this workflow accomplishes]

**Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Example**:
```[language]
// Complete example
[code]
```

### Workflow 2: [Workflow Name]

[Similar structure]

## Best Practices

### ✅ Do This

1. **[Practice 1]**: [Explanation]
   ```[language]
   // Good example
   [code]
   ```

2. **[Practice 2]**: [Explanation]
   ```[language]
   // Good example
   [code]
   ```

### ❌ Don't Do This

1. **[Anti-pattern 1]**: [Why to avoid]
   ```[language]
   // Bad example
   [code]
   ```
   **Instead**: [Better approach]

2. **[Anti-pattern 2]**: [Why to avoid]
   ```[language]
   // Bad example
   [code]
   ```
   **Instead**: [Better approach]

## Testing Guidelines

### Unit Tests

[How to test components covered by this skill]

```[language]
// Test example
[code]
```

### Integration Tests

[How to test integrations]

### E2E Tests

[If applicable, how to test end-to-end]

## Security Considerations

1. **[Security Concern 1]**: [Mitigation]
2. **[Security Concern 2]**: [Mitigation]
3. **[Security Concern 3]**: [Mitigation]

## Performance Considerations

1. **[Performance Aspect 1]**: [Optimization]
2. **[Performance Aspect 2]**: [Optimization]

## Common Mistakes

### Mistake 1: [Mistake Description]

**Problem**: [What goes wrong]

**Solution**: [How to fix it]

**Example**:
```[language]
// Wrong
[bad code]

// Right
[good code]
```

### Mistake 2: [Mistake Description]

[Similar structure]

## Debugging Tips

### Issue 1: [Common Issue]

**Symptoms**: [How to identify]

**Diagnosis**: [How to investigate]

**Fix**: [How to resolve]

### Issue 2: [Common Issue]

[Similar structure]

## Reference Examples

### Complete Example 1: [Use Case]

[Full working example with context]

```[language]
// Complete, runnable example
[code]
```

### Complete Example 2: [Use Case]

[Another full example]

## References

- **Design Patterns**: `docs/DESIGN-PATTERNS.md`
- **Code Examples**: `path/to/examples/`
- **Related Documentation**: `path/to/docs/`
- **External Resources**: [URLs if applicable]

## Related Skills

When this skill is active, you might also need:

- **[related-skill-1]**: [When to use together]
- **[related-skill-2]**: [When to use together]

## Related Agents

This skill works well with these agents:

- **[agent-name-1]**: [How they complement each other]
- **[agent-name-2]**: [How they complement each other]

## Related MCP Servers

This skill may require these MCP servers:

- **[mcp-server-1]**: [What tools it provides]
- **[mcp-server-2]**: [What tools it provides]

## Changelog

### Version 1.0.0 (2025-10-26)
- Initial release
- [Key features included]

---

## Notes for Skill Maintainers

### Updating This Skill

1. Increment version in frontmatter metadata
2. Update `last-updated` date
3. Add changelog entry
4. Test automatic activation after changes

### Monitoring Effectiveness

Track these metrics:
- Activation accuracy (is it loading when expected?)
- Pattern adherence (are patterns being followed?)
- Developer feedback (is it helpful?)

### Review Schedule

- **Quarterly**: Review for accuracy and relevance
- **After major platform changes**: Update patterns
- **Based on feedback**: Address identified gaps
```

---

## Skill Development Checklist

Use this checklist when creating a new skill:

### Planning
- [ ] Identify the domain/workflow to standardize
- [ ] Review existing code patterns and documentation
- [ ] Identify common mistakes and edge cases
- [ ] Determine trigger conditions for automatic activation

### Writing
- [ ] Complete YAML frontmatter with accurate metadata
- [ ] Write comprehensive description for automatic activation
- [ ] Document all key patterns with examples
- [ ] Include both positive and negative examples
- [ ] Add security and performance considerations
- [ ] Provide complete, runnable code examples

### Testing
- [ ] Test automatic activation with various phrasings
- [ ] Verify skill loads with 2-5K token overhead
- [ ] Confirm patterns match existing codebase conventions
- [ ] Test integration with relevant agents
- [ ] Validate with team members

### Documentation
- [ ] Link to related skills, agents, and MCPs
- [ ] Reference relevant documentation and code
- [ ] Include changelog with version history
- [ ] Document maintenance procedures

### Review
- [ ] Peer review by domain expert
- [ ] Test in real development scenarios
- [ ] Gather initial feedback
- [ ] Iterate based on usage patterns

---

## Example: Minimal Skill

```yaml
---
name: example-minimal-skill
description: Use when demonstrating the absolute minimum required for a skill to work. This is the simplest possible skill structure.
---

# Example Minimal Skill

This is the simplest possible skill. It only requires:
1. YAML frontmatter with name and description
2. Markdown body with instructions

## Instructions

[Your instructions here]

## Examples

- Example 1
- Example 2
```

---

## Example: Comprehensive Skill

See `.claude/research/skills-integration-analysis.md` Appendix for the full `chariot-api-development` skill example, which demonstrates:

- Comprehensive trigger description
- Multiple pattern categories
- Code examples in context
- Security considerations
- Testing guidelines
- Common mistakes with fixes
- Reference links
- Related skills/agents/MCPs

---

## Tips for Writing Effective Skills

### 1. Write Comprehensive Descriptions

**Bad**:
```yaml
description: Use for API development
```

**Good**:
```yaml
description: Expert guidance for developing AWS Lambda handlers in Go for the Chariot security platform. Use when creating or modifying backend API endpoints, implementing authentication middleware, accessing DynamoDB, or working with security data models. Covers handler patterns, error handling, authentication, database access, and API response formatting.
```

### 2. Include Trigger Keywords

Mention specific files, patterns, or terms that should trigger activation:
- File paths: `backend/pkg/handler/`
- Imports: `aws-lambda-go`, `events.APIGatewayProxyRequest`
- Concepts: "Lambda handler", "REST API", "authentication"

### 3. Provide Context

Explain **why** patterns exist, not just what they are:
```markdown
### Why Use This Pattern

This pattern ensures:
1. Consistent authentication across all endpoints
2. Proper error handling without information leakage
3. Audit logging for security compliance
```

### 4. Show Both Good and Bad Examples

Always include anti-patterns:
```markdown
❌ Don't Do This:
```go
// Returns internal error details to client
return response.Error(err.Error())
```

✅ Do This Instead:
```go
// Log internally, return safe message
log.Printf("Error: %v", err)
return response.InternalError()
```
```

### 5. Keep It Focused

One skill = One clear purpose. Don't create "mega skills" that try to do everything.

### 6. Reference Existing Documentation

Link to authoritative sources rather than duplicating:
```markdown
## References

- Handler Examples: `backend/pkg/handler/handlers/`
- Design Patterns: `docs/DESIGN-PATTERNS.md`
- Authentication: `backend/pkg/auth/README.md`
```

### 7. Make It Actionable

Provide specific steps, not vague guidance:
```markdown
❌ Vague: "Implement proper error handling"
✅ Specific: "Log errors with context, return safe client responses using response.InternalError()"
```

### 8. Test Automatic Activation

Try various phrasings to ensure your description triggers correctly:
- "Create a Lambda handler for..."
- "Build an API endpoint that..."
- "Implement authentication for..."

All should activate the same skill if they're related.

---

## Skill Naming Conventions

### Format: `domain-specific-action`

**Good Names**:
- `chariot-api-development` (clear domain + action)
- `neo4j-graph-queries` (technology + purpose)
- `security-testing-patterns` (domain + focus)
- `dynamodb-single-table` (technology + pattern)

**Bad Names**:
- `backend-stuff` (too vague)
- `api` (not specific enough)
- `security` (too broad)
- `helper-utilities` (unclear purpose)

### Domain Prefixes

Use consistent prefixes for skill families:
- `chariot-*`: Platform-specific skills
- `security-*`: Security-focused skills
- `test-*`: Testing-related skills
- `doc-*`: Documentation skills

---

## Version Management

### Semantic Versioning

Use semantic versioning in metadata:

```yaml
metadata:
  version: 1.0.0  # MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes (incompatible updates)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Changelog Format

```markdown
## Changelog

### Version 1.2.1 (2025-11-15)
- Fixed: Corrected DynamoDB query example
- Updated: Authentication pattern for new auth service

### Version 1.2.0 (2025-11-01)
- Added: Rate limiting patterns
- Added: Batch operation examples
- Improved: Error handling documentation

### Version 1.0.0 (2025-10-26)
- Initial release
```

---

## Questions?

- **Skill not activating?** Make description more specific with trigger keywords
- **Token overhead too high?** Keep content focused, use reference files
- **Patterns outdated?** Schedule regular reviews, update promptly
- **Need help?** Check `.claude/research/skills-integration-analysis.md`

**Next Steps**: Copy this template and create your first custom skill!
