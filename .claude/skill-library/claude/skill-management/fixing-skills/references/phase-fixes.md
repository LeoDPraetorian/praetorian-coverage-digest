# Phase-Specific Fix Details

Detailed examples for each auto-fixable and manual phase.

---

## Auto-Fixable Phases

### Phase 2: allowed-tools Field

**Issue:** Malformed tool list

```yaml
# ❌ Before
allowed-tools: Read Write Bash
```

**Fix:**

```yaml
# ✅ After
allowed-tools: Read, Write, Bash
```

**Edit:**

```typescript
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "allowed-tools: Read Write Bash",
  new_string: "allowed-tools: Read, Write, Bash"
}
```

---

### Phase 4: Broken Links

**Issue:** References to non-existent files

**Fix:** Create placeholder reference files

```bash
# Create missing reference
mkdir -p {skill-path}/references
cat > {skill-path}/references/workflow.md << 'EOF'
# {Skill Name} - Detailed Workflow

[Content to be added]
EOF
```

---

### Phase 5: Missing Structure

**Issue:** No references/ or examples/ directories

**Fix:** Create standard structure

```bash
mkdir -p {skill-path}/references
mkdir -p {skill-path}/examples
```

---

### Phase 6: Missing Scripts

**Issue:** scripts/ directory missing required files

**Fix:** Create boilerplate

```bash
mkdir -p {skill-path}/scripts/src
# Create package.json with dependencies
# Create tsconfig.json with compiler options
```

---

### Phase 7: Missing .output/.local

**Issue:** No output directories

**Fix:** Create gitignored directories

```bash
mkdir -p {skill-path}/.output
mkdir -p {skill-path}/.local
# Add to .gitignore if needed:
# echo ".output/" >> .gitignore
# echo ".local/" >> .gitignore
```

---

### Phase 10: Phantom References

**Issue:** References non-existent skill

**Fix:** Remove or update reference

```typescript
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "See the `non-existent-skill` skill for details.",
  new_string: "" // Remove reference
}
```

---

### Phase 12: CLI Error Handling

**Issue:** Script exits without proper error codes

**Fix:** Add error handling

```typescript
// In script file
if (error) {
  console.error("Error:", error.message);
  process.exit(1); // Add proper exit code
}

// Wrap async operations
try {
  await operation();
} catch (error) {
  console.error("Operation failed:", error.message);
  process.exit(1);
}
```

---

## Manual Fix Phases

### Phase 1: Description Format

**Issue:** Description doesn't follow pattern or >120 chars

**Guide:**

1. Ask user for skill's primary trigger and capabilities
2. Generate "Use when..." description
3. Ensure third-person voice
4. Keep <120 characters

**Example interaction:**

```
User input needed: What triggers this skill? (e.g., "creating React components")
User input needed: What does it help with? (e.g., "TypeScript patterns, hooks")

Generated: "Use when creating React components - TypeScript patterns, hooks, best practices"
Length: 89 characters ✅
```

**Common rewrites:**

```yaml
# ❌ Too long (145 chars)
description: This skill helps you when you need to create new skills from scratch by guiding you through the complete TDD workflow with validation and testing

# ✅ Compressed (98 chars)
description: Use when creating skills - TDD workflow (RED-GREEN-REFACTOR) with validation and testing
```

---

### Phase 3: Line Count >500

**Issue:** SKILL.md exceeds 500 lines

**Progressive disclosure strategy:**

1. Keep in SKILL.md: Overview, when-to-use, quick reference, high-level workflow
2. Extract to references/: Detailed steps, examples, troubleshooting, edge cases

**Example:**

```markdown
# In SKILL.md (summary)

## Workflow

1. **Step 1** - Brief description
2. **Step 2** - Brief description
3. **Step 3** - Brief description

See [Detailed Workflow](references/workflow.md) for step-by-step instructions.

# In references/workflow.md (full details)

## Step 1: Detailed Instructions

[Complete implementation guide with code examples...]
```

**Sections to extract** (in priority order):

1. Detailed workflow steps → `references/workflow.md`
2. API references → `references/api-reference.md`
3. Advanced patterns → `references/patterns.md`
4. Troubleshooting → `references/troubleshooting.md`
5. Complete examples → `examples/example-1.md`

---

### Phase 8: TypeScript Compilation

**Issue:** `tsc` fails

**Fix workflow:**

1. Run `tsc` to see errors:

```bash
cd {skill-path}/scripts
npm run build
```

2. Common TypeScript errors:

**Missing type imports:**

```typescript
// ❌ Error: Cannot find name 'z'
const schema = z.object({...});

// ✅ Fix
import { z } from 'zod';
const schema = z.object({...});
```

**Incorrect return types:**

```typescript
// ❌ Error: Type 'string | undefined' is not assignable to type 'string'
function getName(): string {
  return process.env.NAME;
}

// ✅ Fix
function getName(): string {
  return process.env.NAME || "default";
}
```

**Any type usage:**

```typescript
// ❌ Warning: Parameter 'data' implicitly has an 'any' type
function process(data) { ... }

// ✅ Fix
function process(data: unknown) { ... }
```

---

### Phase 9: Bash Script Migration

**Issue:** Skill uses bash scripts instead of TypeScript

**Migration workflow:**

1. **Identify bash script functionality:**

```bash
# Example: scripts/search.sh
#!/bin/bash
QUERY="$1"
find .claude/skills -name "*.md" | xargs grep -l "$QUERY"
```

2. **Create TypeScript equivalent:**

```typescript
// scripts/src/search.ts
import { glob } from "glob";
import { readFile } from "fs/promises";

export async function search(query: string): Promise<string[]> {
  const files = await glob(".claude/skills/**/*.md");
  const matches: string[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    if (content.includes(query)) {
      matches.push(file);
    }
  }

  return matches;
}
```

3. **Update package.json:**

```json
{
  "scripts": {
    "search": "tsx src/search.ts"
  }
}
```

4. **Archive bash script:**

```bash
mkdir -p {skill-path}/scripts/.archived
mv {skill-path}/scripts/search.sh {skill-path}/scripts/.archived/
```

---

### Phase 11: cd Command Patterns

**Issue:** Uses absolute paths or non-portable cd

**ROOT pattern:**

```bash
# ❌ Before: Absolute path
cd /Users/username/project/.claude/skills && npm run command

# ✅ After: ROOT pattern
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude/skills" && npm run command
```

**Why this works:**

- Single git command with both `--show-superproject-working-tree` and `--show-toplevel` flags
- Pipe to `head -1` automatically selects first non-empty result (super-repo root when in submodule)
- Works identically from any directory depth in the repository
- Works from any directory in the repository
- Portable across machines and users

---

### Phase 13: TodoWrite Missing

**Issue:** Multi-step skill doesn't mandate TodoWrite

**Add to skill:**

```markdown
**IMPORTANT**: Use TodoWrite to track phases. Steps get skipped without tracking.

## Workflow

| Phase      | Purpose                | Checkpoint         |
| ---------- | ---------------------- | ------------------ |
| 1. Setup   | Initialize environment | Environment ready  |
| 2. Execute | Run main operation     | Operation complete |
| 3. Verify  | Validate results       | All checks pass    |

Use TodoWrite to track each phase as you progress.
```

**Checklist template:**

```markdown
### Workflow Checklist

Copy this to TodoWrite:

- [ ] Phase 1: Setup
- [ ] Phase 2: Execute
- [ ] Phase 3: Verify
```

---

### Semantic Review: External Documentation Links

**Issue:** Library skill missing official documentation links (flagged in semantic review)

**Applies to:** Library skills wrapping external tools/libraries/frameworks (npm packages, APIs, services)

**Fix Strategy:**

1. **Identify link count needed** (research official docs):
   - Quick scan: ~5-10 key links (API ref, getting started, migration guide)
   - Comprehensive: 20+ links (hooks, components, examples, community)

2. **Choose organization approach:**

   | Link Count     | Location                               | Pattern            |
   | -------------- | -------------------------------------- | ------------------ |
   | **5-10 links** | End of SKILL.md                        | Brief list         |
   | **20+ links**  | `references/links-to-official-docs.md` | Comprehensive file |

**Fix Pattern 1: Brief List in SKILL.md (5-10 links)**

Add section before existing "## References" section:

```markdown
## Related Resources

### Official Documentation

- **{Library Name}**: https://...
- **API Reference**: https://...
- **Getting Started**: https://...
- **Migration Guide**: https://...

## References

- [references/patterns.md](references/patterns.md)
```

**Fix Pattern 2: Comprehensive File (20+ links)**

Create `references/links-to-official-docs.md`:

```markdown
# Links to Official Documentation

Organized links to official documentation and resources.

---

## {Library Name}

### Core Documentation

- **Main Site**: https://...
- **Get Started**: https://...
- **API Reference**: https://...

### Hooks/Components

- **Hook 1**: https://...
- **Hook 2**: https://...

### Advanced Usage

- **Feature 1**: https://...

---

## Related Tools

### {Related Library}

- **Documentation**: https://...

---

## Community Resources

- **GitHub**: https://github.com/...
- **Discord**: https://discord.gg/...
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/...
```

Then add reference in SKILL.md:

```markdown
## Related Resources

For comprehensive official documentation links, see [references/links-to-official-docs.md](references/links-to-official-docs.md).
```

**Template Reference:**

See `.claude/skill-library/claude/skill-management/creating-skills/references/skill-templates.md` (External Documentation Links Pattern section) for:

- Complete template examples
- Organization guidelines
- When to use brief vs comprehensive
- How to keep links current

**Decision Guide:**

| Skill Type                                           | Typical Link Count | Recommendation         |
| ---------------------------------------------------- | ------------------ | ---------------------- |
| Single library (Zod, Zustand)                        | 5-8                | Brief list in SKILL.md |
| Framework (React 19, Next.js)                        | 8-12               | Brief list in SKILL.md |
| Complex integration (React Hook Form + Zod + shadcn) | 30-50              | Comprehensive file     |
| Multiple services (Jira + GitHub + Linear)           | 20-30              | Comprehensive file     |
