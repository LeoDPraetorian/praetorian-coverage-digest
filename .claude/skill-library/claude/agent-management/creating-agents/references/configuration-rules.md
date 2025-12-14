# Configuration Rules (Phase 4)

Detailed validation rules for description generation, tool selection, skill selection, and model choice.

## 4.1 Description Generation

Ask (3 questions simultaneously):
1. Trigger phrase ("Use when {developing/designing/testing/etc.}...")
2. Key capabilities (2-3, multiSelect)
3. Custom wording or generated?

**Format**: `"Use when {trigger} {domain} - {cap1}, {cap2}, {cap3}.\n\n<example>...\n</example>"`

**CRITICAL**: Single-line with `\n` escapes (NO `|` or `>`).

### Agent Descriptions vs Skill Descriptions

**IMPORTANT**: Agent descriptions follow a DIFFERENT pattern than skill descriptions:

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Purpose** | Trigger for `skill-search` CLI discovery | Trigger for Claude's agent selection via Task tool |
| **Style** | Can be longer, explanatory (process workflows) | Must be action-oriented summaries |
| **Main Description** | No strict character limit | 80-150 chars before `\n\n<example>` |
| **Total Limit** | No hard limit (progressive disclosure if >500 lines) | 1024 chars (hard limit) |
| **Use When** | "Use when" triggers search by keyword matching | "Use when" triggers agent selection by task type |

**Why Agent Descriptions Must Be Concise**:
- Agents are selected by Claude Code based on description matching task intent
- Long descriptions dilute signal-to-noise ratio for agent selection
- Main description (before examples) should be scannable in 2-3 seconds
- Examples provide detail; main description provides quick classification

**Examples**:

✅ **GOOD Agent Description** (89 chars before example):
```
Use when developing React frontend - components, UI bugs, performance, API integration.

<example>...</example>
```

❌ **BAD Agent Description** (verbose, skill-like):
```
Use when developing React applications. This agent specializes in creating reusable components using modern React patterns including hooks, context, and state management. It handles UI bugs by systematically debugging component hierarchies and prop flows. For performance optimization, it implements memoization strategies, lazy loading patterns, and code splitting techniques. When integrating with APIs, it uses TanStack Query for data fetching, caching, and synchronization. The agent follows React 19 best practices and TypeScript strict mode guidelines.

<example>...</example>
```

**Character Count Guidance for Agents**:
- **Ideal**: 80-100 chars (trigger phrase)
- **Acceptable**: 100-150 chars (approaching warning)
- **Warning**: 150-200 chars (suggests over-explaining)
- **Error**: >1024 chars total (hard limit)

### Action Verb Validation

After "Use when" prefix, **MUST validate the next word is an action verb**:

**Valid action verbs** (ending in -ing):
- developing
- designing
- testing
- reviewing
- analyzing
- researching
- orchestrating
- integrating
- creating
- building
- implementing
- debugging
- deploying
- managing
- configuring
- monitoring
- optimizing
- refactoring
- documenting
- architecting

**Validation Steps**:

1. Extract first word after "Use when "
2. Check if it ends in "-ing" and is in the action verb list
3. If NOT an action verb:
   ```
   ❌ ERROR: Description must start with action verb

   Current: "Use when {word} ..."

   Valid patterns:
   - "Use when developing..." (creating/writing code)
   - "Use when testing..." (validating functionality)
   - "Use when reviewing..." (evaluating code quality)
   - "Use when analyzing..." (examining data/patterns)
   - "Use when orchestrating..." (coordinating tasks)

   Suggested alternatives for your use case:
   - {alternative1}
   - {alternative2}
   - {alternative3}

   Please revise the description to start with an action verb.
   ```

**Pattern**: `"Use when {action-verb}ing..."`

**Examples**:
- ✅ "Use when developing React components with TypeScript..."
- ✅ "Use when testing API endpoints with integration tests..."
- ✅ "Use when reviewing Go backend code for security issues..."
- ❌ "Use when you need to create..." (no action verb)
- ❌ "Use when users want..." (no action verb)
- ❌ "Use when there is a bug..." (no action verb)

**Cannot proceed without valid action verb** ✅

### Description Length Validation

After description is generated/confirmed, **MUST validate length**:

1. Count total characters (including `\n` escape sequences)
2. Count trigger phrase portion (text before `\n\n<example>`)
3. Show character counts to user:
   ```
   Description Length: {total} characters
   Trigger Phrase: {trigger_length} characters
   ```

### Validation Rules

**Hard Limits**:
- ✅ Total ≤ 1024 characters (MANDATORY - cannot proceed if exceeded)

**Trigger Phrase Guidelines** (text before `\n\n<example>`):
- ✅ **Ideal**: 80-100 chars - Concise, scannable, action-oriented
- ✅ **Acceptable**: 100-150 chars - Still effective for agent selection
- ⚠️ **Warning**: 150-200 chars - Approaching verbose territory
- ❌ **Problem**: >200 chars - Dilutes signal for agent selection

**Total Description Guidelines**:
- ⚠️ Total > 800 characters (warning - consider shortening examples)

### Violation Handling

**If violations detected**:

1. **Hard limit (>1024)**: Show error, MUST shorten before proceeding
   - "Description exceeds 1024 character limit ({total} chars). Please shorten."
   - Cannot proceed until under limit ✅

2. **Trigger phrase warnings** (text before `\n\n<example>`):
   - **>150 chars**: "⚠️ Trigger phrase is {trigger_length} characters (ideal: 80-100). Agent descriptions should be action-oriented summaries, not verbose explanations. Consider shortening for better agent selection."
   - **>200 chars**: "❌ Trigger phrase is {trigger_length} characters. This is too verbose for effective agent selection. Remember: Skills can be explanatory; Agents must be concise summaries. Please shorten to <150 chars."

3. **Total description warnings**:
   - "Description is {total} characters (>800). Consider shortening examples for readability."
   - Ask: "Proceed with current description or revise?"

### Character Count Display

```
Example:
Description: "Use when developing React frontend - components, UI bugs, performance, API integration.\n\n<example>...</example>"
Total: 427 characters ✅
Trigger Phrase: "Use when developing React frontend - components, UI bugs, performance, API integration." (89 characters) ✅ IDEAL
```

**Remember**: Agent descriptions are for Claude's agent selection (concise summaries). Skill descriptions are for search discovery (can be more detailed).

**Cannot proceed with description >1024 characters** ✅

## 4.2 Tool Selection

Show required tools for type, ask for additional:
- Task (spawn agents)
- Skill (invoke skills)
- WebFetch/WebSearch (for research)

**Alphabetize final list**.

### Alphabetization Validation

After collecting tools, **MUST validate alphabetical order**:

1. Check if current list is alphabetically sorted
2. If NOT sorted:
   - Show current (unsorted) list
   - Auto-sort alphabetically
   - Show sorted list
   - Note: "Tools auto-sorted for audit compliance"
3. If already sorted: Proceed silently

**CRITICAL**: Tools MUST be alphabetically sorted (Phase 2 audit requirement). Auto-sort if needed - do not ask user.

### Known Available Tools

Complete list of valid tools:
```
AskUserQuestion
Bash
Edit
Glob
Grep
KillShell
MultiEdit
NotebookEdit
Read
Skill
Task
TodoWrite
WebFetch
WebSearch
Write
```

### Tool Validation Steps

1. **Check each tool against available tools list**:
   ```
   For each tool in selected tools:
     If tool NOT in available tools list:
       → Add to invalid_tools list
   ```

2. **If invalid tools found**:
   ```
   ❌ ERROR: Invalid tool names detected

   Invalid tools: {tool1}, {tool2}

   Valid tools are:
   - AskUserQuestion - Ask user questions with multiple choice options
   - Bash - Execute shell commands
   - Edit - Edit existing files with string replacement
   - Glob - Find files by pattern matching
   - Grep - Search file contents with regex
   - KillShell - Terminate background shell processes
   - MultiEdit - Edit multiple files simultaneously
   - NotebookEdit - Edit Jupyter notebook cells
   - Read - Read file contents
   - Skill - Invoke skills from library
   - Task - Spawn sub-agents
   - TodoWrite - Manage task lists
   - WebFetch - Fetch web content
   - WebSearch - Search the web
   - Write - Create new files

   Please correct tool names and re-select.
   ```

### Required Tools by Agent Type

| Agent Type | Required Tools | Rationale |
|-----------|----------------|-----------|
| architecture | Read, Glob, Grep | Must read codebase for design |
| development | Read, Write, Edit | Must read and modify code |
| testing | Read, Write, Bash | Must read code, write tests, run them |
| quality | Read, Glob, Grep | Must read code for review |
| analysis | Read, Glob, Grep | Must read code for analysis |
| research | Read, WebFetch, WebSearch | Must fetch documentation |
| orchestrator | Task, TodoWrite | Must spawn agents and track tasks |
| mcp-tools | Read | Must read MCP tool schemas |

### Missing Required Tools

**If required tools missing**:
```
⚠️ WARNING: Missing required tools for {agent-type} agent

Required: {required_tool1}, {required_tool2}
Selected: {current_tools}
Missing: {missing_tool1}, {missing_tool2}

{Agent-type} agents typically need these tools because:
- {required_tool1}: {rationale}
- {required_tool2}: {rationale}
```

**Ask User** via AskUserQuestion:
```
Question: Required tools missing for {agent-type}. Add them automatically?
Header: Tool Requirements
Options:
  - Yes - Add required tools ({tool1}, {tool2})
  - No - Proceed without (I have a specific reason)
  - Clarify - Why are these tools required?
```

**If "Clarify"**: Show detailed rationale for each required tool, then re-prompt.

### Tool Validation Checklist

- [ ] All tool names valid (exist in available tools list)
- [ ] Required tools for type included
- [ ] Tools alphabetically sorted
- [ ] No duplicate tools

**Cannot proceed with invalid tool names** ✅

**Why this matters**:
- Prevents runtime errors from non-existent tools
- Ensures agents have minimum required capabilities
- Catches typos at creation time (vs failing at runtime)
- Validates against Claude Code's actual available tools

## 4.3 Skill Selection

Recommend gateway based on type, ask confirmation.

**Alphabetize if multiple**.

### Alphabetization Validation

After collecting skills, **MUST validate alphabetical order**:

1. Check if current list is alphabetically sorted
2. If NOT sorted:
   - Show current (unsorted) list
   - Auto-sort alphabetically
   - Show sorted list
   - Note: "Skills auto-sorted for audit compliance"
3. If already sorted: Proceed silently

**CRITICAL**: Skills MUST be alphabetically sorted (Phase 2 audit requirement). Auto-sort if needed - do not ask user.

## 4.4 Model Selection

Ask: "What type of agent is this?"

### Decision Matrix

- **Development/Testing/MCP Tools** → `inherit` (user controls speed vs quality trade-off)
- **Architecture/Security/Code Review** → `opus` (non-negotiable reasoning quality)
- **Orchestration/Infrastructure** → `sonnet` (speed beneficial for coordination)
- **Very Simple Tasks** → `haiku` (rare)

**IMPORTANT**:
- `model` controls MODEL selection, not context
- Context is ALWAYS isolated for sub-agents (not configurable)
- `inherit` means "use the same model as the main session"

**Detailed decision framework**: Read `references/frontmatter-reference.md` - model section
