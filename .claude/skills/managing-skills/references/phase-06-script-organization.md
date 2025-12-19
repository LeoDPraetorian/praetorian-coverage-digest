# Phase 6: Script Organization

## What It Checks

- All scripts (.sh, .py, .ts, .js) in scripts/ directory
- No scripts at skill root
- Proper script directory structure

## Why It Matters

**Consistency**: All skills follow same organization pattern - scripts belong in scripts/ directory.

**npm workspaces**: Workspace pattern expects `skills/*/scripts/package.json` for TypeScript tools.

**Discoverability**: Users know where to find automation.

## Detection Patterns

### WARNING Issues

**1. Scripts at Root**
```
my-skill/
├── SKILL.md
├── helper.sh          # ❌ Should be in scripts/
└── validate.py        # ❌ Should be in scripts/
```

**2. Scripts in Wrong Subdirectory**
```
my-skill/
├── SKILL.md
└── tools/
    └── audit.sh       # ❌ Should be in scripts/
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can move scripts to scripts/ directory

**Fix logic:**
```typescript
// Move all .sh, .py, .ts, .js files to scripts/
if (file.endsWith('.sh') || file.endsWith('.py') ||
    file.endsWith('.ts') || file.endsWith('.js')) {
  moveToScripts(file);
}
```

## Examples

### Example 1: Simple Scripts

**Before:**
```
my-skill/
├── SKILL.md
├── validate.sh
└── helper.py
```

**After:**
```
my-skill/
├── SKILL.md
└── scripts/
    ├── validate.sh
    └── helper.py
```

### Example 2: TypeScript CLI

**Before:**
```
my-skill/
├── SKILL.md
├── cli.ts
├── audit.ts
└── package.json
```

**After:**
```
my-skill/
├── SKILL.md
└── scripts/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── cli.ts
        └── audit.ts
```

## Edge Cases

**1. Test Files**

Keep with scripts:
```
scripts/
├── src/
│   └── cli.ts
└── tests/
    └── cli.test.ts
```

**2. Config Files**

Script-related configs go in scripts/:
```
scripts/
├── package.json
├── tsconfig.json
└── .eslintrc.json
```

**3. Documentation Scripts**

If script generates docs:
```
scripts/
└── generate-docs.sh  # Outputs to .local/
```

## Manual Remediation

**After auto-move:**

1. Update any hardcoded paths in scripts
2. Test scripts still execute
3. Update SKILL.md if it references script locations

**For TypeScript projects:**
```bash
# After organizing, init npm workspace
cd scripts/
npm init -y
# Configure package.json, tsconfig.json
```

## Related Phases

- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - Scripts need proper TS config
- npm workspace pattern - Expects scripts/package.json

## Quick Reference

| Script Type | Location |
|-------------|----------|
| Bash (.sh) | scripts/ |
| Python (.py) | scripts/ |
| TypeScript (.ts) | scripts/src/ |
| JavaScript (.js) | scripts/ or scripts/src/ |
| Config files | scripts/ (if script-related) |
| Tests | scripts/tests/ or scripts/src/__tests__/ |
