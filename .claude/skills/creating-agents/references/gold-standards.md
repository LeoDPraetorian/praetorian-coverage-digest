# Gold Standard Agents

**Purpose**: Analysis of exemplar agents to understand what makes them excellent

**When to read**: During agent creation to understand quality patterns, or when customizing templates

---

## What Makes an Agent "Gold Standard"

**Criteria**:
1. **Lean** - <300 lines (<400 if complex)
2. **Complete** - All required sections present
3. **Compliant** - Passes all audit phases
4. **Tested** - Proven in production use
5. **Clear** - Instructions unambiguous
6. **Effective** - Actually solves problems well

---

## Gold Standard #1: frontend-developer

**Location**: `.claude/agents/development/frontend-developer.md`
**Size**: 291 lines
**Type**: development
**Model**: opus

### Why It's Excellent

**1. Perfect Frontmatter**:
```yaml
name: frontend-developer
description: "Use when developing React frontend - components, UI bugs, performance, API integration, TypeScript/React codebases.\n\n<example>...\n</example>\n\n<example>...\n</example>\n\n<example>...\n</example>"
type: development
permissionMode: default
tools: Bash, Edit, Glob, Grep, MultiEdit, Read, TodoWrite, Write
skills: calibrating-time-estimates, debugging-systematically, developing-with-tdd, gateway-frontend, verifying-before-completion
model: opus
color: green
```

**Analysis**:
- ✅ Description has 3 examples (comprehensive trigger coverage)
- ✅ All 4 mandatory development skills (TDD, debugging, verifying, calibrating)
- ✅ gateway-frontend for domain patterns
- ✅ Skills alphabetically sorted
- ✅ Tools include MultiEdit (useful for bulk changes)
- ✅ Opus model (React development needs strong reasoning)

**2. Clear Skill Reference Table**:
```markdown
| Task | Skill to Read |
| ------------------------ | |
| File organization | `.claude/skill-library/development/frontend/patterns/frontend-information-architecture/SKILL.md` |
| Data fetching | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
...
```

**Analysis**:
- ✅ Maps 8 common tasks to specific skills
- ✅ Full paths (no guessing)
- ✅ Progressive disclosure (load when needed)

**3. Platform-Specific Critical Rules**:
```markdown
### Import Order (Strict)
// 1. React core
// 2. Local UI components
// 3. Platform utilities
// 4. Types

### File Length Limits
- Components: <300 lines
- Functions: <30 lines
- Hooks: <50 lines

### React 19 Optimization Philosophy
Write clean code. Let React Compiler optimize.
Manual optimization ONLY when truly needed.
```

**Analysis**:
- ✅ Specific to Chariot platform
- ✅ Concrete limits (not vague)
- ✅ Explains React 19 context

**4. All Mandatory Skills Explained**:
```markdown
## Mandatory Skills (Must Use)

1. **`developing-with-tdd`** - Write test FIRST (RED → GREEN → REFACTOR).
2. **`debugging-systematically`** - Investigate root cause before fixing.
3. **`verifying-before-completion`** - Run `npm test` and `npm run build`.
4. **`calibrating-time-estimates`** - Measure actual time (÷12 for implementation).
```

**Analysis**:
- ✅ All 4 skills listed
- ✅ Each has "when to use" guidance
- ✅ Specific tools/commands mentioned (npm test, npm run build)

**5. Chariot-Specific Patterns**:
Includes platform conventions (UI component priority, API integration pattern).

**6. Standardized Output Format**:
JSON with status, files_modified, verification, handoff.

### Lessons to Apply

- Include 2-3 examples in description (not just 1)
- Map 5-10 common tasks in Skill References
- Add platform-specific Critical Rules
- Explain each mandatory skill's purpose
- Use MultiEdit if bulk editing likely
- Consider opus model for domains needing reasoning

---

## Gold Standard #2: frontend-architect

**Location**: `.claude/agents/architecture/frontend-architect.md`
**Size**: 247 lines
**Type**: architecture
**Model**: opus

### Why It's Excellent

**1. Perfect Architecture Frontmatter**:
```yaml
name: frontend-architect
description: Use when making architectural decisions for React frontend applications - designing component hierarchies, file organization, state management strategies, performance architecture, or major refactoring decisions.\n\n<example>...\n</example>\n\n<example>...\n</example>\n\n<example>...\n</example>
type: architecture
permissionMode: plan
tools: Bash, Glob, Grep, Read, TodoWrite, WebFetch, WebSearch
skills: brainstorming, calibrating-time-estimates, debugging-systematically, gateway-frontend, verifying-before-completion, writing-plans
color: blue
model: opus
```

**Analysis**:
- ✅ permissionMode: plan (read-only during design)
- ✅ brainstorming skill (MANDATORY for architects)
- ✅ writing-plans (creates design docs)
- ✅ WebFetch/WebSearch (research during design)
- ✅ 3 examples showing different architectural scenarios
- ✅ Color: blue (architecture)

**2. Brainstorming Enforcement**:
```markdown
### Brainstorming Before Design

**Before recommending ANY architecture**, use the `brainstorming` skill.

**Critical steps**:
1. Understand requirements FIRST
2. Explore 2-3 alternative approaches
3. Validate approach BEFORE detailed design
4. No exceptions for "solution is obvious"

**Never**: Jump to first pattern without exploring alternatives.
```

**Analysis**:
- ✅ Makes brainstorming MANDATORY ("before ANY architecture")
- ✅ Explains process (requirements → alternatives → validation)
- ✅ Counters rationalization ("solution is obvious")
- ✅ "Never" statement adds emphasis

**3. Architecture Decision Framework**:
```markdown
### Complexity Tier Assessment

Before recommending file organization, assess complexity:
- Tier 1 (Simple): <10 files
- Tier 2 (Medium): 10-30 files
- Tier 3 (Complex): 30-80 files
- Tier 4 (Very Complex): 80+ files

[Different patterns for each tier]
```

**Analysis**:
- ✅ Concrete thresholds (not vague)
- ✅ Tier-specific recommendations
- ✅ Platform-specific (Chariot architecture pattern)

**4. Trade-Off Documentation**:
Output format includes:
```json
"trade-offs": {
  "pros": [...],
  "cons": [...]
},
"alternatives_considered": [...]
```

**Analysis**:
- ✅ Forces documentation of trade-offs
- ✅ Requires considering alternatives
- ✅ Output structured for review

### Lessons to Apply

- brainstorming is MANDATORY for architecture agents
- permissionMode: plan for design work
- Include decision frameworks (tiers, thresholds)
- Trade-offs in output format
- WebFetch/WebSearch for architecture research

---

## Gold Standard #3: backend-developer

**Location**: `.claude/agents/development/backend-developer.md`
**Size**: 228 lines
**Type**: development
**Model**: opus

### Why It's Excellent (Key Highlights)

**1. Concise but Complete**:
- Only 228 lines (well under 300 limit)
- All required sections present
- No bloat or unnecessary content

**2. Go-Specific Critical Rules**:
```markdown
### Error Handling
- Always wrap errors with context
- Use errors.Is() for type checking
- Return errors, don't panic

### Concurrency
- Use errgroup for concurrent operations
- Always handle context cancellation
- No naked goroutines (use structured concurrency)
```

**Analysis**:
- ✅ Language-specific best practices
- ✅ Concrete patterns (errgroup, context)
- ✅ Clear anti-patterns ("don't panic", "no naked goroutines")

**3. AWS Patterns**:
Includes Lambda-specific guidance, DynamoDB patterns, S3 operations.

### Lessons to Apply

- Can be lean (<250 lines) and still complete
- Domain-specific rules are valuable
- Concrete patterns > vague principles

---

## Common Patterns Across Gold Standards

### 1. Multi-Example Descriptions

All gold standards have **2-3 examples** in description:
- Shows diverse use cases
- Improves Claude's selection accuracy
- Examples cover range of complexity

---

### 2. Skill References Table

All include task → skill path mapping:
- 5-10 common tasks
- Direct paths (no searching needed)
- Progressive disclosure pattern

---

### 3. Mandatory Skills Explained

Not just listed, but explained:
- **When** to use the skill
- **What** it does
- **How** to invoke it

---

### 4. Platform-Specific Rules

All include Chariot platform conventions:
- File organization patterns
- API integration methods
- UI component guidelines
- Testing requirements

---

### 5. Standardized Output

All use JSON with:
- status (complete/blocked/needs_review)
- summary (1-2 sentences)
- Type-specific field (architecture/verification/review/etc.)
- handoff (next agent + context)

---

## Anti-Patterns (What Gold Standards Avoid)

### ❌ Don't: Vague Descriptions

**Bad**: `description: "Python development agent"`

**Good**: `description: "Use when developing Python applications - CLI tools, Lambda functions, pytest patterns.\n\n<example>..."`

**Why**: Specific triggers improve selection, examples guide usage.

---

### ❌ Don't: Embedded Patterns

**Bad**: Including full code examples, extensive documentation in agent file.

**Good**: Reference library skills for detailed patterns.

**Why**: Keeps agent lean, patterns load on-demand.

---

### ❌ Don't: Missing Mandatory Skills

**Bad**: development agent without `developing-with-tdd`

**Good**: All development agents include TDD, debugging, verifying, calibrating

**Why**: Mandatory skills enforce quality practices.

---

### ❌ Don't: Block Scalar Descriptions

**Bad**:
```yaml
description: |
  Use when...
```

**Good**:
```yaml
description: Use when...\n\n<example>...
```

**Why**: Block scalars break discovery.

---

## Applying Gold Standard Patterns

### When Creating New Agent

1. **Use templates from agent-templates.md** (based on gold standards)
2. **Add 2-3 examples in description** (like gold standards)
3. **Include Skill References table** (5-10 common tasks)
4. **Add platform-specific rules** (domain conventions)
5. **Explain mandatory skills** (when/how to use)
6. **Keep under 300 lines** (<400 if complex)

### When Reviewing Existing Agent

**Compare to gold standards**:
- Same number of sections?
- Similar level of detail?
- Platform-specific rules included?
- Mandatory skills present and explained?
- Skill References table complete?

**If gaps**: Add missing elements using gold standards as template.

---

## Gold Standard Checklist

**An agent is gold standard quality when**:

- [ ] Size: <300 lines (<400 for complex)
- [ ] Description: 2-3 examples, <1024 chars, single-line
- [ ] Frontmatter: All fields correct, alphabetized
- [ ] Core Responsibilities: 3-5 clear items
- [ ] Skill References: Table with 5-10 mappings
- [ ] Critical Rules: Platform-specific, concrete
- [ ] Mandatory Skills: All included and explained
- [ ] Type-Specific Section: Domain patterns present
- [ ] Output Format: JSON with handoff
- [ ] Escalation Protocol: 2-3 clear conditions
- [ ] Quality Checklist: 6-8 items

**All checkboxes for production-ready agent** ✅

---

## Related Documents

- **`agent-templates.md`** - Templates based on gold standards
- **`../SKILL.md`** - Quick reference to workflow
- **Gold standard agents**: frontend-developer, frontend-architect, backend-developer
