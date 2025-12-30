---
name: gateway-frontend
description: Use when developing frontend applications with React/TypeScript. Invoke when building React components, implementing forms with validation, debugging UI issues, styling with Tailwind/Shadcn, managing state (TanStack Query for server state, Zustand for client state), writing E2E tests with Playwright, optimizing performance, or applying UI/UX design patterns. This gateway routes to 25 specialized library skills for component generation, state management, testing, and architecture patterns.
allowed-tools: Read
---

# Frontend Development Gateway

## Understanding This Gateway

**This is a gateway skill in Chariot's two-tier skill architecture.**

The two-tier system organizes skills into:

- **Core skills** (are in `.claude/skills/`) - High-frequency skills auto-discovered by Claude Code's Skill tool
- **Library skills** (are in `.claude/skill-library/`) - Specialized skills loaded on-demand via Read tool

**Gateways are routing indices, not implementation guides.** They exist in core to help you discover and load library skills.

## Critical: Two-Tier Skill System

| Tier             | Location                 | How to Invoke | Example                     |
| ---------------- | ------------------------ | ------------- | --------------------------- |
| **Core/Gateway** | `.claude/skills/`        | Skill tool    | `skill: "gateway-frontend"` |
| **Library**      | `.claude/skill-library/` | Read tool     | `Read("path/to/SKILL.md")`  |

<EXTREMELY_IMPORTANT>
**Library skills cannot be invoked with the Skill tool.** You MUST use the Read tool to load them.

### Common Anti-Patterns

```typescript
// ❌ WRONG: Trying to use Skill tool for library skills
skill: "using-tanstack-query"; // FAILS - library skills are NOT in Skill tool

// ❌ WRONG: Guessing or shortening paths (missing nested folders)
Read(".claude/skill-library/using-tanstack-query/..."); // FAILS - wrong path structure

// ❌ WRONG: Using skill name instead of full path
Read("using-tanstack-query"); // FAILS - must be full path

// ❌ WRONG: Looking in core /skills/ instead of /skill-library/
Read(".claude/skills/using-tanstack-query/..."); // FAILS - library skills are NOT in /skills/
```

### Correct Patterns

```typescript
// ✅ CORRECT: Use gateway to find skill, then Read with FULL path
Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md");

// ✅ CORRECT: Copy path exactly as shown in this gateway
Read(".claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md");

// ✅ CORRECT: Core skills (this gateway) use Skill tool
skill: "gateway-frontend"; // Core skills work with Skill tool
```

**Workflow:**

1. Invoke this gateway: `skill: "gateway-frontend"`
2. Find the skill you need in the categorized list below
3. Copy the EXACT path shown (do not modify or shorten)
4. Use Read tool with that path
5. Follow the loaded skill's instructions

</EXTREMELY_IMPORTANT>

## Mandatory Skills by Role

**Load mandatory skills based on your role before starting work.**

### Role Filter

| Your Role              | Mandatory Sections                                                |
| ---------------------- | ----------------------------------------------------------------- |
| **Developer**          | ALL ROLES + UI STYLING                                            |
| **Lead/Architect**     | ALL ROLES + UI STYLING + ARCHITECTURE PATTERNS                    |
| **E2E Tester**         | ALL ROLES + E2E TESTING (also invoke `gateway-testing`)           |
| **Unit Tester**        | ALL ROLES + UNIT TESTING (also invoke `gateway-testing`)          |
| **Integration Tester** | ALL ROLES + INTEGRATION TESTING (also invoke `gateway-testing`)   |
| **Reviewer**           | ALL ROLES + UI STYLING                                            |
| **Security**           | ALL ROLES (security-specific skills come from `gateway-security`) |
| **Designer**           | ALL ROLES + UI STYLING                                            |

**Note:** All skills remain available to any role via the routing tables below. The table shows what you MUST load upfront—not what you're limited to.

**For Testers:** You MUST also invoke `gateway-testing` for general testing patterns (anti-patterns, behavior testing, condition-based waiting).

---

### ALL ROLES (Everyone Must Read)

**1. React 19 Conventions (BLOCKING)**

`.claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md`

BLOCKS PRs for anti-patterns: React.FC, forwardRef, useEffect setState, Zustand without selectors, data fetching in useEffect. Provides reviewer checklist. **Essential for understanding what patterns are valid/invalid.**

**2. Modern React Patterns**

`.claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md`

React 19 patterns - useOptimistic, Suspense boundaries, concurrent features, compiler compatibility. **Required to understand what you're building/testing/reviewing.**

**3. Performance Optimization**

`.claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md`

React 19 paradigm - write clean code, let compiler optimize. Covers virtualization, concurrent features. **Applies to all roles - don't introduce performance regressions.**

**4. Information Architecture**

`.claude/skill-library/architecture/frontend/enforcing-information-architecture/SKILL.md`

File structure, import order, file length limits, component organization. **Only needed when creating/modifying production files.**

---

### UI STYLING (Mandatory: Developer, Lead, Reviewer, Designer)

**5. Brand Guidelines**

`.claude/skill-library/development/frontend/chariot-brand-guidelines/SKILL.md`

Colors, typography, theme classes (never hardcode colors). **Required when building or reviewing UI. Testers/Security can load if inspecting styling issues.**

---

### ARCHITECTURE PATTERNS (Mandatory: Lead/Architect)

**6. Architecting State Management**

`.claude/skill-library/architecture/frontend/architecting-state-management/SKILL.md`

Decision framework for selecting state management approach (TanStack Query vs Context vs Zustand vs useReducer). Four-tier architecture, trade-off analysis, anti-patterns. **Required for architects creating implementation plans. Developers/Reviewers can load when working with complex state decisions.**

**7. Integrating TanStack Components**

`.claude/skill-library/architecture/frontend/integrating-tanstack-components/SKILL.md`

Architecture patterns for integrating TanStack Router + Query + Table + Virtual together. Data flow patterns, cache key strategies, virtualization with tables. **Required for architects designing multi-library features. Developers can load when implementing complex integrations.**

---

### E2E TESTING (Mandatory: E2E Tester)

**8. Frontend E2E Testing Patterns**

`.claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md`

Playwright patterns for end-to-end testing - page objects, selectors, fixtures, authentication flows, CI configuration. **Required for E2E testers. Developers can load when writing E2E tests for their features.**

**9. Testing Security with E2E Tests**

`.claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md`

Security-focused E2E testing - XSS prevention, CSRF protection, authentication flows, authorization boundaries, input validation. **Required for E2E testers to catch security regressions.**

---

### UNIT TESTING (Mandatory: Unit Tester)

**10. Frontend Testing Patterns**

`.claude/skill-library/testing/frontend/frontend-testing-patterns/SKILL.md`

React Testing Library patterns for component testing - render utilities, user events, async testing, accessibility queries. **Required for unit testers. Developers can load when writing component tests.**

**11. Frontend Interactive Form Testing**

`.claude/skill-library/testing/frontend/frontend-interactive-form-testing/SKILL.md`

Form testing patterns - validation testing, user interaction simulation, error state handling, submission flows. **Required for testing form-heavy features.**

---

### INTEGRATION TESTING (Mandatory: Integration Tester)

**12. React Query Cache Debugging**

`.claude/skill-library/testing/frontend/react-query-cache-debugging/SKILL.md`

TanStack Query testing and debugging - cache state investigation, invalidation patterns, optimistic update testing. **Required for integration testers working with server state.**

**13. Creating Mocks (via gateway-testing)**

For MSW handlers and API mocking patterns, invoke `gateway-testing` and read:
`.claude/skill-library/testing/creating-mocks/SKILL.md`

Mock service worker setup, request handlers, response factories. **Required for integration testers mocking API boundaries.**

---

### Workflow

1. Identify your role from the Role Filter table above
2. Read ALL ROLES skills (4 skills)
3. Based on your role, also read:
   - Developer/Reviewer/Designer: UI STYLING (1 skill)
   - Lead/Architect: UI STYLING + ARCHITECTURE PATTERNS (3 skills)
   - E2E Tester: E2E TESTING (2 skills) + invoke `gateway-testing`
   - Unit Tester: UNIT TESTING (2 skills) + invoke `gateway-testing`
   - Integration Tester: INTEGRATION TESTING (2 skills) + invoke `gateway-testing`
4. Then load task-specific skills from the routing tables below

**Remember:** These are mandatory minimums. Any role can load any skill from the routing tables when relevant to their task.

## How to Use

This skill serves as a master directory for all frontend development skills in the Chariot platform. When you need frontend guidance:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## UI Components & Styling

**Migrating Chariot UI Components**: `.claude/skill-library/development/frontend/migrating-chariot-ui-components/SKILL.md`

- Component source selection and migration from deprecated @praetorian-chariot/ui to local components

**Frontend Animation Designer**: `.claude/skill-library/development/frontend/frontend-animation-designer/SKILL.md`

- Animation patterns, motion design, and interactive UI effects

**Frontend Shadcn UI**: `.claude/skill-library/development/frontend/using-shadcn-ui/SKILL.md`

- Shadcn/UI component library integration and patterns

**Frontend Visual Testing Advanced**: `.claude/skill-library/testing/frontend/frontend-visual-testing-advanced/SKILL.md`

- Visual regression testing and screenshot comparison

## State Management

**Architecting State Management**: `.claude/skill-library/architecture/frontend/architecting-state-management/SKILL.md`

- Decision framework for selecting appropriate state management (TanStack Query, Context, Zustand, useReducer) - four-tier architecture, trade-off analysis, anti-patterns

**Frontend TanStack Query**: `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md`

- TanStack Query v5 - **implementing, reviewing, or architecting** server state, data fetching patterns, caching strategies, mutations, query key design

**Constructing Graph Queries**: `.claude/skill-library/development/frontend/constructing-graph-queries/SKILL.md`

- Neo4j graph queries for useMy/useGraphQuery hooks - Query/Node/Relationship/Filter structure, filter operators, dynamic field validation, query patterns

**Frontend TanStack Table**: `.claude/skill-library/development/frontend/using-tanstack-table/SKILL.md`

- TanStack Table v8 - **implementing, reviewing, or architecting** column definitions, pagination, sorting, filtering, row selection, virtualization

**Frontend TanStack Router**: `.claude/skill-library/development/frontend/using-tanstack-router/SKILL.md`

- TanStack Router - **implementing, reviewing, or architecting** type-safe routing, loaders, search params, navigation patterns, React Router migration

**Integrating TanStack Components**: `.claude/skill-library/architecture/frontend/integrating-tanstack-components/SKILL.md`

- Architecture patterns for integrating TanStack Router + Query + Table + Virtual together - data flow, cache key patterns, virtualization with tables, type-safe integration

**React Query Cache Debugging**: `.claude/skill-library/testing/frontend/react-query-cache-debugging/SKILL.md`

- Debugging TanStack Query cache issues, invalidation patterns, and cache state investigation

**Frontend Zustand State Management**: `.claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md`

- Zustand - **implementing, reviewing, or architecting** store patterns, selectors, TypeScript types, persistence, SSR hydration

**React Context API**: `.claude/skill-library/development/frontend/using-context-api/SKILL.md`

- React Context API - **React 19 Provider syntax** (`<Context>` replaces `<Context.Provider>`), `use()` hook for conditional context, when to use vs Zustand/TanStack Query, performance optimization, TypeScript patterns

## Testing

**IMPORTANT: For general testing patterns, also invoke `skill: "gateway-testing"`.**

This section covers React-specific testing patterns. gateway-testing provides:

- Behavior vs Implementation testing (prevents brittle tests)
- Condition-Based Waiting (prevents flaky tests)
- Testing Anti-Patterns (avoid common mistakes)
- Test Infrastructure Discovery (find existing fixtures)

**For frontend testing, invoke BOTH gateways:**

```
skill: "gateway-testing"    # General testing patterns
skill: "gateway-frontend"   # React-specific patterns (this gateway)
```

**Debugging Chrome Console**: `.claude/skill-library/testing/frontend/debugging-chrome-console/SKILL.md`

- Autonomous browser debugging workflow - launches Chrome, analyzes console logs, iteratively fixes errors

**Frontend E2E Testing Patterns**: `.claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md`

- End-to-end testing with Playwright

**Frontend Interactive Form Testing**: `.claude/skill-library/testing/frontend/frontend-interactive-form-testing/SKILL.md`

- Form validation and user interaction testing

**Frontend Testing Patterns**: `.claude/skill-library/testing/frontend/frontend-testing-patterns/SKILL.md`

- General testing patterns for React components

**Testing Security with E2E Tests**: `.claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md`

- E2E security testing for React frontends with Playwright - XSS prevention, authentication flows, authorization boundaries, CSRF protection, input validation, secure redirect handling, security regression testing

## Patterns & Architecture

**Mandatory skills (already listed above):** React 19 Conventions, Modern React Patterns, Performance Optimization, Information Architecture, Brand Guidelines - see "Mandatory Skills by Role" section.

**Additional pattern skills:**

**Adhering to UI/UX Laws**: `.claude/skill-library/quality/adhering-to-uiux-laws/SKILL.md`

- Applies 31 cognitive psychology and UX laws (Hick's, Fitts', Miller's, Gestalt, Nielsen's heuristics) to interface design

**Securing React Implementations**: `.claude/skill-library/development/frontend/securing-react-implementations/SKILL.md`

- Security patterns for React 19 applications - XSS prevention (DOMPurify, dangerouslySetInnerHTML), CSRF protection, authentication patterns, authorization validation, Server Components/Actions security, input sanitization, security libraries (DOMPurify, helmet, validator), CVE-2025-55182 critical vulnerability mitigation

## Forms & Validation

**Frontend React Hook Form Zod**: `.claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md`

- React Hook Form with Zod schema validation

## Development Tools

**Frontend Smart ESLint**: `.claude/skill-library/development/frontend/using-eslint/SKILL.md`

- ESLint configuration and linting strategies for TypeScript/React

**Frontend TanStack Router**: `.claude/skill-library/development/frontend/using-tanstack-router/SKILL.md`

- TanStack Router - **implementing, reviewing, or architecting** type-safe routing, loaders, search params, navigation patterns, React Router migration

**Frontend TanStack Table**: `.claude/skill-library/development/frontend/using-tanstack-table/SKILL.md`

- TanStack Table v8 - **implementing, reviewing, or architecting** column definitions, pagination, sorting, filtering, row selection, virtualization

## Code Quality Metrics

**Analyzing Cyclomatic Complexity**: `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`

- Measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD

## Shared Standards & Architecture

These foundational skills apply across all frontend development:

**Testing Anti-Patterns**: `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`

- Common testing mistakes to avoid and proper patterns

## Usage Examples

### Example 1: Implementing TanStack Query

1. Find the skill in the State Management section above
2. Load it: `Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md")`
3. Follow the patterns in the loaded skill
4. Reference the API documentation provided in the skill's references folder

### Example 2: Writing E2E Tests

1. Find the skill in the Testing section above
2. Load it: `Read(".claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md")`
3. Follow the Playwright patterns
4. Also load testing anti-patterns to avoid common mistakes:
   `Read(".claude/skill-library/testing/testing-anti-patterns/SKILL.md")`

## Quick Reference

**⭐ = Mandatory for ALL ROLES | 🎨 = Mandatory for UI STYLING | 🏗️ = Mandatory for ARCHITECTURE PATTERNS**
**🧪 = Mandatory for E2E TESTING | 🔬 = Mandatory for UNIT TESTING | 🔗 = Mandatory for INTEGRATION TESTING**

| Need                      | Skill Path                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| ⭐ React 19 conventions   | `.claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md`      |
| ⭐ Modern React patterns  | `.claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md`         |
| ⭐ Performance            | `.claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md`        |
| ⭐ Info architecture      | `.claude/skill-library/architecture/frontend/enforcing-information-architecture/SKILL.md` |
| 🎨 Brand guidelines       | `.claude/skill-library/development/frontend/chariot-brand-guidelines/SKILL.md`            |
| 🏗️ State management arch  | `.claude/skill-library/architecture/frontend/architecting-state-management/SKILL.md`      |
| 🏗️ TanStack integration   | `.claude/skill-library/architecture/frontend/integrating-tanstack-components/SKILL.md`    |
| 🧪 E2E testing            | `.claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md`           |
| 🧪 E2E security testing   | `.claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md`         |
| 🔬 Component testing      | `.claude/skill-library/testing/frontend/frontend-testing-patterns/SKILL.md`               |
| 🔬 Form testing           | `.claude/skill-library/testing/frontend/frontend-interactive-form-testing/SKILL.md`       |
| 🔗 Query cache debugging  | `.claude/skill-library/testing/frontend/react-query-cache-debugging/SKILL.md`             |
| Component migration       | `.claude/skill-library/development/frontend/migrating-chariot-ui-components/SKILL.md`     |
| Server state (API calls)  | `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md`                |
| Client state (complex)    | `.claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md`      |
| Shared state (theme/auth) | `.claude/skill-library/development/frontend/using-context-api/SKILL.md`                   |
| Context Provider syntax   | `.claude/skill-library/development/frontend/using-context-api/SKILL.md`                   |
| Browser console debugging | `.claude/skill-library/testing/frontend/debugging-chrome-console/SKILL.md`                |
| Form handling             | `.claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md`    |
| UI animations             | `.claude/skill-library/development/frontend/frontend-animation-designer/SKILL.md`         |
| Shadcn components         | `.claude/skill-library/development/frontend/using-shadcn-ui/SKILL.md`                     |
| UI/UX design laws         | `.claude/skill-library/quality/adhering-to-uiux-laws/SKILL.md`                            |
| Code quality (linting)    | `.claude/skill-library/development/frontend/using-eslint/SKILL.md`                        |
| Code complexity metrics   | `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`              |
| Security patterns         | `.claude/skill-library/development/frontend/securing-react-implementations/SKILL.md`      |

## When to Use This Gateway

Use this gateway skill when:

- Starting frontend development work
- Unsure which frontend skill to use
- Need overview of available frontend resources
- Want to discover relevant patterns for your task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Quick Decision Guide

**What are you trying to do?**

```
Architecting a feature? (Lead/Architect role)
├── State management decisions → architecting-state-management 🏗️
├── tanstack component integration → integrating-tanstack-components 🏗️
├── File organization → enforcing-information-architecture
└── Component hierarchy → (use brainstorming + writing-plans core skills)

Building UI components?
├── Using @praetorian-chariot/ui → migrating-chariot-ui-components (migrate to local first!)
├── Using Shadcn/UI library → using-shadcn-ui
├── Adding animations → frontend-animation-designer
└── Styling/Tailwind → chariot-brand-guidelines

Managing data/state?
├── Server data (API calls) → using-tanstack-query
├── Table UI (sorting, filtering) → using-tanstack-table
├── Routing (loaders, params) → using-tanstack-router
├── Router + Query + Table + Virtual together → integrating-tanstack-components
├── Client-only state (complex) → using-zustand-state-management
├── Context Provider syntax (<Context> vs .Provider) → using-context-api
└── Shared state (theme, auth, flags) → using-context-api

Working with forms?
└── Form + validation → implementing-react-hook-form-zod

Testing? (Also invoke gateway-testing for general patterns)
├── E2E Testing (Playwright)
│   ├── Page objects, fixtures → frontend-e2e-testing-patterns 🧪
│   └── Security E2E → testing-security-with-e2e-tests 🧪
├── Unit Testing (RTL)
│   ├── Component tests → frontend-testing-patterns 🔬
│   └── Form interaction → frontend-interactive-form-testing 🔬
├── Integration Testing
│   ├── Query cache → react-query-cache-debugging 🔗
│   └── API mocking → creating-mocks (via gateway-testing)
└── Browser debugging → debugging-chrome-console

Performance issues?
├── Slow rendering → optimizing-react-performance
└── Complex logic → analyzing-cyclomatic-complexity

Code quality?
├── Linting errors → using-eslint (frontend-smart-eslint)
├── Duplicate code → adhering-to-dry
└── Bad test patterns → testing-anti-patterns

Code review?
└── React 19 patterns → enforcing-react-19-conventions
```

## Troubleshooting

### "Skill not found" or "Cannot read file"

**Problem:** Read tool returns error when loading a skill path.

**Solutions:**

1. **Verify the path exists** - Copy the EXACT path from this gateway, don't modify it
2. **Check for typos** - Library paths are long; ensure you copied completely
3. **Skill may have moved** - Run `npm run search -- "<skill-name>"` from `.claude/` to find current location
4. **Report broken link** - Use `/skill-manager audit gateway-frontend` to detect broken paths

### "Which skill should I use?"

**Problem:** Multiple skills seem relevant to your task.

**Solutions:**

1. **Start specific** - Choose the skill most closely matching your exact task
2. **Layer skills** - It's valid to load multiple skills (e.g., TanStack + testing patterns)
3. **Check Quick Reference table** - The table above maps common needs to skills
4. **Use decision tree** - Follow the Quick Decision Guide above

### "Skill doesn't cover my use case"

**Problem:** Loaded skill doesn't address your specific scenario.

**Solutions:**

1. **Check related skills** - Skills often reference other skills for advanced cases
2. **Combine skills** - Load multiple complementary skills
3. **Try Shared Standards** - `testing-anti-patterns` and `adhering-to-dry` apply broadly
4. **Search library** - Run `npm run search -- "<keyword>"` to find specialized skills

### "I'm still confused about core vs library"

**Quick reference:**

- **Core skills** (~25): In `.claude/skills/` → Use `skill: "name"`
- **Library skills** (~120): In `.claude/skill-library/` → Use `Read("full/path")`
- **This gateway**: Core skill that helps you find library skills
- **Rule**: If path contains `skill-library`, you MUST use Read tool

## Related Gateways

Other domain gateways you can invoke via Skill tool:

| Gateway      | Invoke With                     | Use For                                           |
| ------------ | ------------------------------- | ------------------------------------------------- |
| Backend      | `skill: "gateway-backend"`      | Go, AWS Lambda, DynamoDB, Infrastructure          |
| Testing      | `skill: "gateway-testing"`      | API tests, E2E, Mocking, Performance              |
| MCP Tools    | `skill: "gateway-mcp-tools"`    | Linear, Praetorian CLI, Context7, Chrome DevTools |
| Security     | `skill: "gateway-security"`     | Auth, Secrets, Cryptography, Defense              |
| Integrations | `skill: "gateway-integrations"` | Third-party APIs, Jira, HackerOne, MS Defender    |
| Capabilities | `skill: "gateway-capabilities"` | VQL, Nuclei templates, Scanner integration        |
| Claude       | `skill: "gateway-claude"`       | Skills, Agents, Commands, MCP wrappers            |
