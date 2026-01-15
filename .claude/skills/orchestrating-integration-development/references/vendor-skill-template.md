# Vendor Skill Creation Template

When creating a new `integrating-with-{vendor}` skill, use this template as the skill-manager prompt.

## Template

```
Create a new library skill at .claude/skill-library/development/integrations/integrating-with-{vendor}/ for integrating with the {Vendor Name} API.

## Required Research
Before creating the skill, research and document:
1. Official API documentation URL
2. Authentication methods supported (API key, OAuth2, JWT, etc.)
3. Rate limiting policies and headers
4. Pagination patterns used (token, page number, cursor)
5. Key endpoints for asset discovery
6. Response data structures

## Required Sections in SKILL.md

### Quick Reference Table
| Aspect | Details |
|--------|---------|
| Auth Method | {API key / OAuth2 / JWT / etc.} |
| Base URL | {API base URL} |
| Rate Limits | {requests per minute/hour} |
| Pagination | {token / page / cursor} |
| SDK Available | {Yes/No, with package name} |

### Authentication Patterns
- How to obtain credentials
- How to initialize client
- Token refresh (if applicable)
- Header format

### Pagination Patterns
- Pagination parameter names
- How to detect last page
- Recommended page size

### Data Mapping
| {Vendor} Entity | Chariot Model | Key Fields |
|-----------------|---------------|------------|
| {entity} | Asset/Risk/CloudResource | {fields} |

### Rate Limit Handling
- Rate limit headers to check
- Recommended backoff strategy
- Retry-After header handling

### Error Handling
- Common error codes and meanings
- Retryable vs non-retryable errors

### Example Code Snippets
- Client initialization
- Basic API call
- Pagination loop
- Error handling

## References Directory
Create references/ with:
- api-reference.md - Key endpoints documentation
- authentication.md - Auth flow details
- error-handling.md - Error codes and handling
- data-mapping.md - Tabularium mapping examples
```

## Usage Example

When Phase 2 detects no skill exists for a vendor:

```
1. Read references/vendor-skill-template.md
2. Fill in placeholders with vendor-specific details from Phase 1 brainstorming:
   - Replace {vendor} with actual vendor name (e.g., 'wiz', 'orca')
   - Replace {Vendor Name} with display name (e.g., 'Wiz', 'Orca Security')
   - Fill {API base URL} from brainstorming output
   - Fill {Auth Method} from Phase 1 discussions
   - Fill {Rate Limits} from API documentation review
   - Fill {Pagination} pattern identified
   - Fill {SDK Available} based on research
3. Run: Skill('skill-manager', args='create integrating-with-{vendor} "<filled-template>"')
```

## Cross-Reference

This template is populated with information gathered during Phase 1 (Brainstorming):
- Authentication method
- API endpoints
- Data to sync
- Rate limiting constraints
- Pagination approach
