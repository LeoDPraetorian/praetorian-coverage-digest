---
name: gateway-frontend
description: Use when developing frontend applications - access React, State, UI, and Testing patterns.
allowed-tools: Read
---

# Frontend Development Gateway

## How to Use

This skill serves as a master directory for all frontend development skills in the Chariot platform. When you need frontend guidance:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## UI Components & Styling

**Frontend Animation Designer**: `.claude/skill-library/development/frontend/ui/frontend-animation-designer/SKILL.md`
- Animation patterns, motion design, and interactive UI effects

**Frontend React Component Generator**: `.claude/skill-library/development/frontend/ui/frontend-react-component-generator/SKILL.md`
- Component creation patterns and React best practices

**Frontend Shadcn UI**: `.claude/skill-library/development/frontend/ui/frontend-shadcn-ui/SKILL.md`
- Shadcn/UI component library integration and patterns

**Frontend Visual Testing Advanced**: `.claude/skill-library/development/frontend/ui/frontend-visual-testing-advanced/SKILL.md`
- Visual regression testing and screenshot comparison

## State Management

**Frontend React State Management**: `.claude/skill-library/development/frontend/state/frontend-react-state-management/SKILL.md`
- React hooks, Context API, and state patterns

**Frontend TanStack**: `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`
- TanStack Query (React Query) for server state management

**Frontend Zustand State Management**: `.claude/skill-library/development/frontend/state/frontend-zustand-state-management/SKILL.md`
- Zustand library for client state management

## Testing

**Frontend E2E Testing Patterns**: `.claude/skill-library/development/frontend/testing/frontend-e2e-testing-patterns/SKILL.md`
- End-to-end testing with Playwright

**Frontend Interactive Form Testing**: `.claude/skill-library/development/frontend/testing/frontend-interactive-form-testing/SKILL.md`
- Form validation and user interaction testing

**Frontend Testing Patterns**: `.claude/skill-library/development/frontend/testing/frontend-testing-patterns/SKILL.md`
- General testing patterns for React components

## Patterns & Architecture

**Chariot Brand Guidelines**: `.claude/skill-library/development/frontend/patterns/chariot-brand-guidelines/SKILL.md`
- Chariot-specific UI/UX patterns and brand standards

**Frontend Information Architecture**: `.claude/skill-library/development/frontend/patterns/frontend-information-architecture/SKILL.md`
- Application structure and navigation patterns

**Frontend Performance Optimization**: `.claude/skill-library/development/frontend/patterns/frontend-performance-optimization/SKILL.md`
- Performance tuning, lazy loading, and optimization techniques

**Frontend React Modernization**: `.claude/skill-library/development/frontend/patterns/frontend-react-modernization/SKILL.md`
- Upgrading React applications and modern patterns

## Forms & Validation

**Frontend React Hook Form Zod**: `.claude/skill-library/development/frontend/frontend-react-hook-form-zod/SKILL.md`
- React Hook Form with Zod schema validation

## Development Tools

**Frontend Smart ESLint**: `.claude/skill-library/development/frontend/using-eslint/SKILL.md`
- ESLint configuration and linting strategies for TypeScript/React

## Shared Standards & Architecture

These foundational skills apply across all frontend development:

**Testing Anti-Patterns**: `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`
- Common testing mistakes to avoid and proper patterns

**DRY Refactoring**: `.claude/skill-library/architecture/dry-refactor/SKILL.md`
- Don't Repeat Yourself principles and refactoring techniques



## Usage Example

```typescript
// If you need to implement TanStack Query:
// 1. Read: .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md
// 2. Follow the patterns in the skill
// 3. Reference the API documentation provided

// If you need to write E2E tests:
// 1. Read: .claude/skill-library/development/frontend/testing/frontend-e2e-testing-patterns/SKILL.md
// 2. Follow the Playwright patterns
// 3. Check testing anti-patterns to avoid common mistakes
```

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| React components | frontend-react-component-generator |
| Server state (API calls) | frontend-tanstack |
| Client state | frontend-zustand-state-management |
| E2E testing | frontend-e2e-testing-patterns |
| Form handling | frontend-react-hook-form-zod |
| Performance issues | frontend-performance-optimization |
| UI animations | frontend-animation-designer |
| Shadcn components | frontend-shadcn-ui |
| Code quality | using-eslint |

## When to Use This Gateway

Use this gateway skill when:
- Starting frontend development work
- Unsure which frontend skill to use
- Need overview of available frontend resources
- Want to discover relevant patterns for your task

For specific implementations, always load the individual skill rather than working from this gateway alone.
