# Slug Generation

**Algorithm for creating descriptive feature slugs.**

## Rules

- Lowercase
- Hyphenated (kebab-case)
- Descriptive (not generic)
- Derived from core task/feature

## Good Examples

- `tanstack-migration`
- `user-auth-refactor`
- `asset-table-virtualization`
- `drawer-state-simplification`

## Bad Examples

- `review` (too generic)
- `task-1` (not descriptive)
- `temp` (not meaningful)
- `frontend_work` (wrong case)

## Algorithm

```typescript
function generateSlug(taskDescription: string): string {
  // Extract keywords
  const keywords = extractKeywords(taskDescription);

  // Take top 2-3 most meaningful words
  const slug = keywords.slice(0, 3).join('-');

  return slug.toLowerCase();
}
```

