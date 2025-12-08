# Scalability Patterns

Team collaboration, conventions, folder structures, and code ownership.

## Folder Structure

### Feature-Based Organization

```
src/
├── sections/           # Feature-based page sections
│   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types.ts
│   │   └── index.tsx
│   ├── vulnerabilities/
│   └── insights/
├── components/        # Shared components
├── hooks/             # Shared hooks
├── utils/             # Shared utilities
└── types/             # Shared types
```

## Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAssets.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Types**: PascalCase (`UserType`)
- **Constants**: UPPER_SNAKE_CASE

## Code Ownership

```
src/sections/assets/
├── CODEOWNERS         # Define ownership
├── README.md          # Feature documentation
└── ...
```

## Testing Strategy

- **Unit tests**: 80%+ coverage for business logic
- **Integration tests**: Critical user paths
- **E2E tests**: End-to-end workflows

## Related References

- [React 19 Patterns](react-19-patterns.md) - Component best practices
- [Module Systems](module-systems.md) - Code organization
