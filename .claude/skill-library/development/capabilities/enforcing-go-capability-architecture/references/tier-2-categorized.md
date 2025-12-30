# Tier 2: Categorized Package Pattern

**When to use**: 10-30 capabilities, multiple logical categories.

## Structure

```go
pkg/probes/
├── probe.go          # Interface + base type
├── registry.go       # Registration logic
├── test/             # Test category
│   ├── blank.go
│   └── echo.go
├── jailbreak/        # Jailbreak category
│   ├── dan.go
│   └── grandma.go
└── probe_test.go
```

## Key Characteristics

- Subdirectories by category
- Shared interface at package root
- Each category is a subpackage
- Category-level test files

## Migration from Tier 1

1. Identify logical categories
2. Create subdirectories for categories
3. Move implementations
4. Update imports in consumers
