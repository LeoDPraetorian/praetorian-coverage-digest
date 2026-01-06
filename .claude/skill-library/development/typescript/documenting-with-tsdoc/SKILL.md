---
name: documenting-with-tsdoc
description: Use when documenting TypeScript APIs, libraries, or public interfaces - covers TSDoc syntax, TypeDoc generation, and documentation best practices
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Documenting with TSDoc

**Document TypeScript APIs using TSDoc syntax and generate HTML documentation with TypeDoc.**

## When to Use

Use this skill when:

- Documenting TypeScript libraries or public APIs
- Setting up TypeDoc for API documentation generation
- Need TSDoc syntax reference for doc comments
- Want to establish documentation standards for TypeScript projects
- Generating documentation websites from TypeScript source code

## Quick Reference

| Task                   | Syntax/Command                                      |
| ---------------------- | --------------------------------------------------- |
| Basic doc comment      | `/** Short description */`                          |
| Document parameter     | `@param name - Description`                         |
| Document return value  | `@returns Description`                              |
| Document exception     | `@throws {@link ErrorClass} Description`            |
| Add code example       | `@example` + code block                             |
| Link to another symbol | `{@link ClassName.methodName}`                      |
| Mark as deprecated     | `@deprecated Use {@link NewMethod} instead`         |
| Mark API visibility    | `@public`, `@internal`, `@private`                  |
| Install TypeDoc        | `npm install -D typedoc`                            |
| Generate HTML docs     | `npx typedoc --entryPoints src/index.ts --out docs` |

## TSDoc vs JSDoc

**Key Difference:** TSDoc is TypeScript-first. JSDoc type annotations are redundant in TypeScript.

### ❌ Don't Use JSDoc Types in TypeScript

```typescript
/**
 * @param {string} id - User ID (REDUNDANT - TypeScript has the type)
 * @returns {Promise<User | null>} (REDUNDANT)
 */
export async function getUser(id: string): Promise<User | null> {
  // ...
}
```

### ✅ Use TSDoc Syntax Instead

```typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * @param id - The user's unique identifier
 * @returns The user object or null if not found
 */
export async function getUser(id: string): Promise<User | null> {
  // ...
}
```

**Why:** TypeScript's type system already provides type information. TSDoc focuses on _describing behavior_, not duplicating types.

## Basic TSDoc Syntax

### Minimal Doc Comment

```typescript
/**
 * Calculates the total price including tax.
 */
export function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

### Complete Doc Comment

````typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * @remarks
 * This method queries the database and caches the result for 5 minutes.
 * Use {@link invalidateUserCache} to clear the cache manually.
 *
 * @param id - The user's unique identifier
 * @returns The user object or null if not found
 *
 * @throws {@link NotFoundError}
 * Thrown when the user ID doesn't exist in the database
 *
 * @throws {@link DatabaseError}
 * Thrown when the database connection fails
 *
 * @example
 * Basic usage:
 * ```typescript
 * const user = await getUser('abc123');
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 *
 * @example
 * With error handling:
 * ```typescript
 * try {
 *   const user = await getUser('abc123');
 * } catch (error) {
 *   if (error instanceof NotFoundError) {
 *     console.log('User not found');
 *   }
 * }
 * ```
 *
 * @public
 */
export async function getUser(id: string): Promise<User | null> {
  // Implementation
}
````

## Common TSDoc Tags

| Tag             | Purpose                             | Example                                        |
| --------------- | ----------------------------------- | ---------------------------------------------- |
| `@param`        | Document function parameter         | `@param id - User identifier`                  |
| `@returns`      | Document return value               | `@returns The user object`                     |
| `@throws`       | Document thrown exceptions          | `@throws {@link NotFoundError} When not found` |
| `@example`      | Provide code examples               | `@example` + code block                        |
| `@remarks`      | Extended description                | `@remarks Implementation details here`         |
| `@see`          | Cross-reference                     | `@see {@link deleteUser} for removal`          |
| `@deprecated`   | Mark as deprecated                  | `@deprecated Use {@link newMethod} instead`    |
| `@public`       | Public API (exported)               | `@public`                                      |
| `@internal`     | Internal API (not for external use) | `@internal`                                    |
| `@private`      | Private implementation detail       | `@private`                                     |
| `@readonly`     | Property is read-only               | `@readonly`                                    |
| `@experimental` | Experimental/unstable API           | `@experimental`                                |

**For complete tag reference, see:** [references/tsdoc-tags.md](references/tsdoc-tags.md)

## Linking

### Link to Another Symbol

```typescript
/**
 * Creates a new user.
 *
 * @remarks
 * Use {@link updateUser} to modify existing users.
 * Use {@link deleteUser} to remove users.
 *
 * @see {@link UserService.validateUser} for validation logic
 */
export function createUser(data: CreateUserDTO): User {
  // ...
}
```

### Link to External Documentation

```typescript
/**
 * Implements OAuth 2.0 authentication.
 *
 * @remarks
 * See the official specification: {@link https://oauth.net/2/ | OAuth 2.0}
 * For implementation details: {@link https://docs.example.com/auth | Auth Guide}
 */
export class OAuthProvider {
  // ...
}
```

## TypeDoc Generation

### Installation

```bash
# Install TypeDoc as dev dependency
npm install -D typedoc

# Verify installation
npx typedoc --version
```

### Basic Usage

```bash
# Generate HTML documentation
npx typedoc --entryPoints src/index.ts --out docs

# Generate JSON (for custom documentation sites)
npx typedoc --json docs/api.json

# Watch mode (regenerate on file changes)
npx typedoc --watch
```

### TypeDoc Configuration

Create `typedoc.json` in your project root:

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "excludePrivate": true,
  "excludeInternal": true,
  "excludeProtected": false,
  "categorizeByGroup": true,
  "defaultCategory": "Other",
  "categoryOrder": ["Core", "Utilities", "Types", "*"],
  "readme": "README.md",
  "theme": "default",
  "includeVersion": true
}
```

**For advanced TypeDoc configuration, see:** [references/typedoc-config.md](references/typedoc-config.md)

### Integration with npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "docs": "typedoc",
    "docs:json": "typedoc --json docs/api.json",
    "docs:watch": "typedoc --watch"
  }
}
```

Then run:

```bash
npm run docs          # Generate HTML docs
npm run docs:json     # Generate JSON
npm run docs:watch    # Watch mode
```

## Documentation Best Practices

### 1. Document All Public Exports

```typescript
// ✅ GOOD: Public function has documentation
/**
 * Validates user input before processing.
 *
 * @param input - User-provided data
 * @returns True if valid, false otherwise
 * @public
 */
export function validateInput(input: unknown): boolean {
  // ...
}

// ❌ BAD: Public function lacks documentation
export function processData(data: any): void {
  // No documentation
}
```

### 2. Include at Least One Example

````typescript
/**
 * Formats a date according to locale settings.
 *
 * @param date - The date to format
 * @param locale - Locale code (e.g., 'en-US', 'fr-FR')
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * const formatted = formatDate(new Date(), 'en-US');
 * console.log(formatted); // "12/31/2023"
 * ```
 *
 * @public
 */
export function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale);
}
````

### 3. Use @remarks for Implementation Details

```typescript
/**
 * Caches API responses for improved performance.
 *
 * @remarks
 * This cache uses an LRU strategy with a maximum size of 100 entries.
 * Entries expire after 5 minutes. Use {@link clearCache} to manually
 * invalidate all cached entries.
 *
 * @internal
 */
class ResponseCache {
  // ...
}
```

### 4. Link to Related Functions

```typescript
/**
 * Creates a new user account.
 *
 * @see {@link updateUser} - Modify existing users
 * @see {@link deleteUser} - Remove user accounts
 * @see {@link findUser} - Look up users
 *
 * @public
 */
export function createUser(data: UserData): User {
  // ...
}
```

### 5. Mark Internal APIs with @internal

```typescript
/**
 * Internal utility for validating email formats.
 *
 * @remarks
 * This function is used internally by {@link createUser} and {@link updateUser}.
 * External callers should use the public validation API instead.
 *
 * @internal
 */
export function _validateEmail(email: string): boolean {
  // ...
}
```

**For complete best practices, see:** [references/documentation-best-practices.md](references/documentation-best-practices.md)

## Common Mistakes to Avoid

**See:** [references/common-mistakes.md](references/common-mistakes.md)

- Duplicating type information from TypeScript signatures
- Missing @example blocks
- Verbose descriptions that just restate the code
- Inconsistent documentation across API surface
- Forgetting to mark internal APIs with @internal

## Advanced Patterns

**See:** [references/advanced-patterns.md](references/advanced-patterns.md)

- Documenting generic types
- Complex @throws scenarios
- Module-level documentation
- Grouping APIs with @category
- Custom TypeDoc themes

## Related Skills

- `structuring-hexagonal-typescript` - Architecture that benefits from clear API documentation
- `validating-with-zod-schemas` - Schema validation often needs API documentation
- `typescript-advanced` - Advanced TypeScript patterns that should be documented

## References

**Official Documentation:**

- [TSDoc Specification](https://tsdoc.org/)
- [TypeDoc Documentation](https://typedoc.org/)
- [TypeDoc Configuration](https://typedoc.org/guides/options/)

**Additional Resources:**

- [Cloudflare TypeScript Docs Guide](https://blog.cloudflare.com/typescript-documentation-guide/)
- [TSDoc Playground](https://microsoft.github.io/tsdoc/)
