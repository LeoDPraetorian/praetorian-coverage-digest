# External Documentation Links Pattern

**Standard for library skills that wrap external tools/libraries.**

## When to Add External Docs

Include a "## Related Resources" section when the skill wraps:

- npm packages (React, TanStack Query, Zod, React Hook Form)
- External APIs (GitHub, Linear, Jira)
- Third-party services (Chromatic, Playwright)
- Framework documentation (Next.js, Vite, Tailwind)

## Organization Decision Tree

**Follow Anthropic's progressive disclosure best practice:**

### Option 1: Brief List in SKILL.md (5-10 links)

Use when external documentation is straightforward and limited.

```markdown
## Related Resources

### Official Documentation

- **React 19 Release**: https://react.dev/blog/2024/12/05/react-19
- **useActionState**: https://react.dev/reference/react/useActionState
- **useOptimistic**: https://react.dev/reference/react/useOptimistic
- **useEffectEvent**: https://react.dev/reference/react/useEffectEvent
- **You Might Not Need an Effect**: https://react.dev/learn/you-might-not-need-an-effect
```

**Place at end of SKILL.md** before any existing "## References" section.

### Option 2: Comprehensive File (20+ links)

Use when skill wraps complex libraries with extensive documentation.

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

- **Topic 1**: https://...
- **Topic 2**: https://...

---

## Related Tools

### {Related Library 1}

- **Documentation**: https://...

---

## Community Resources

- **GitHub**: https://github.com/...
- **Discord**: https://discord.gg/...
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/...
```

Then reference from SKILL.md:

```markdown
## Related Resources

For comprehensive official documentation links, see [references/links-to-official-docs.md](references/links-to-official-docs.md).
```

## Guidelines

**Keep links current:**

- Include version information when relevant
- Link to stable documentation (not experimental/beta unless noted)
- Prefer official docs over third-party tutorials

**Organize by relevance:**

- Most important/frequently referenced links first
- Group related links together (Core, Advanced, Community)
- Use clear section headers

**Don't duplicate:**

- External docs go in "Related Resources"
- Internal references go in "References"
- Keep them separate

## Examples

**Skills with brief lists:**

- `using-modern-react-patterns` - 6 React 19 links in SKILL.md
- `optimizing-react-performance` - 7 key links in SKILL.md

**Skills with comprehensive files:**

- `implementing-react-hook-form-zod` - 50+ links in references/links-to-official-docs.md
- Complex integration skills with multiple service documentation
