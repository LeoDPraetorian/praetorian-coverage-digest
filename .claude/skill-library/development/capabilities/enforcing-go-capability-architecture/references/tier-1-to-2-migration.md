# Tier 1 → Tier 2 Migration

**Trigger**: Package grows to 10+ capability files

## Steps

1. **Identify categories** - Group by logical function (test, jailbreak, injection)
2. **Create subdirectories** - `mkdir test/ jailbreak/ injection/`
3. **Move implementations** - Keep interface at root
4. **Update imports** - Fix all consumer imports
5. **Update tests** - Move or consolidate test files

## Example

Before:
```text
pkg/probes/
├── probe.go
├── blank.go
├── echo.go
├── dan.go
├── grandma.go
└── prompt.go
```

After:
```text
pkg/probes/
├── probe.go
├── test/
│   ├── blank.go
│   └── echo.go
└── jailbreak/
    ├── dan.go
    └── grandma.go
```
