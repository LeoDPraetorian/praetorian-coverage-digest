---
name: sanitizing-inputs-securely
description: Use when implementing input validation for security - covers OWASP allowlist patterns, injection prevention, context-aware escaping, and defense-in-depth strategies
allowed-tools: Read, Glob, Grep
---

# Sanitizing Inputs Securely

**Defense against injection attacks through OWASP-compliant input validation.**

## When to Use

Use this skill when:

- Implementing input validation at API boundaries
- Building authentication or authorization systems
- Handling user-provided data (forms, query params, file uploads)
- Working with data that flows into SQL, shell commands, or HTML
- Reviewing code for security vulnerabilities

**Critical contexts:**

- User registration/login
- File upload handlers
- Search functionality
- Admin panels
- Data import/export

## OWASP Core Principles

### 1. Allowlist Over Denylist

**The denylist trap:**

```typescript
// ❌ WRONG: Denylist approach (attackers find bypasses)
function sanitizeHTML(input: string): string {
  return input
    .replace(/<script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror=/gi, "");
}

// Bypass: <ScRiPt>, %3Cscript%3E, <img src=x onerror=alert(1)>
```

**The allowlist solution:**

```typescript
// ✅ CORRECT: Allowlist what's allowed
function validateUsername(input: string): boolean {
  // Only alphanumeric, underscore, hyphen, 3-20 chars
  return /^[a-zA-Z0-9_-]{3,20}$/.test(input);
}

function validateEmail(input: string): boolean {
  // RFC 5322 simplified
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
}
```

### 2. Validate Early, Escape Late

**Separation of concerns:**

```typescript
// At entry point: validate structure
function handleUserInput(req: Request): Result<User, Error> {
  const result = UserSchema.safeParse(req.body); // Early validation
  if (!result.success) {
    return Err(new Error("Invalid input"));
  }

  const user = processUser(result.data);

  // At exit point: escape for context
  return Ok({
    ...user,
    bio: escapeHTML(user.bio), // Late escaping
  });
}
```

### 3. Defense in Depth

Layer multiple security controls:

```typescript
// Layer 1: Schema validation
const inputSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
});

// Layer 2: Allowlist validation
function validateSafe(input: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(input);
}

// Layer 3: Context-aware escaping
function escapeForHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Layer 4: Parameterized queries
db.query("SELECT * FROM users WHERE id = ?", [userId]);
```

## Security Validators

### Path Traversal Prevention

```typescript
export function validateNoPathTraversal(input: string): boolean {
  // Prevent ../, ..\, //, \\
  if (input.includes("..")) return false;
  if (input.includes("//")) return false;
  if (input.includes("\\")) return false;

  // Prevent absolute paths
  if (input.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(input)) return false; // Windows drive

  return true;
}

// Usage
function readUserFile(filename: string): Result<string, Error> {
  if (!validateNoPathTraversal(filename)) {
    return Err(new Error("Invalid filename"));
  }

  const safePath = path.join(UPLOAD_DIR, path.basename(filename));
  return readFile(safePath);
}
```

### Command Injection Prevention

```typescript
export function validateNoCommandInjection(input: string): boolean {
  // Dangerous shell metacharacters
  const dangerous = [";", "|", "&", "`", "$", "(", ")", "<", ">", "\n", "\r"];
  return !dangerous.some((char) => input.includes(char));
}

// Better: Don't use shell at all
function runCommand(userInput: string): Result<string, Error> {
  // ❌ NEVER do this
  // exec(`git log --author="${userInput}"`);

  // ✅ Use spawn with args array
  const result = spawnSync("git", ["log", "--author", userInput], {
    shell: false, // Critical: disable shell
  });

  return result.error ? Err(result.error) : Ok(result.stdout.toString());
}
```

### SQL Injection Prevention

```typescript
// ❌ NEVER concatenate SQL
function getUser(id: string) {
  return db.query(`SELECT * FROM users WHERE id = '${id}'`);
  // Attack: id = "1' OR '1'='1"
}

// ✅ Use parameterized queries
function getUser(id: string) {
  return db.query("SELECT * FROM users WHERE id = ?", [id]);
}

// ✅ Use query builders
function getUser(id: string) {
  return db.select("*").from("users").where({ id }).first();
}
```

### Control Character Prevention

```typescript
export function validateNoControlChars(input: string): boolean {
  // Control chars: 0x00-0x1F, 0x7F
  return !/[\x00-\x1F\x7F]/.test(input);
}

// Also check for Unicode control chars
export function validateNoUnicodeControlChars(input: string): boolean {
  // Unicode control ranges
  return !/[\u0000-\u001F\u007F-\u009F\u2028-\u2029]/.test(input);
}
```

## Context-Aware Escaping

### HTML Context

```typescript
function escapeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;'); // Forward slash for </script>
}

// React does this automatically for JSX content
<div>{userInput}</div> // Safe

// But NOT for dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: escapeHTML(userInput) }} /> // Now safe
```

### URL Context

```typescript
function buildURL(base: string, params: Record<string, string>): string {
  const url = new URL(base);

  // ✅ Automatically handles encoding
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

// Or manually
function encodeURLParam(input: string): string {
  return encodeURIComponent(input);
}
```

### JavaScript Context

```typescript
// ❌ NEVER inject user data into JavaScript
function renderScript(userId: string) {
  return `<script>var userId = "${userId}";</script>`;
  // Attack: "; alert(1); "
}

// ✅ Use JSON encoding
function renderScript(userId: string) {
  return `<script>var userId = ${JSON.stringify(userId)};</script>`;
}

// ✅ Better: Use data attributes
function renderComponent(userId: string) {
  return `<div data-user-id="${escapeHTML(userId)}"></div>`;
}
```

## Validation Patterns

### Email Validation

```typescript
const emailSchema = z.string().email().max(255);

// Or custom
function isValidEmail(email: string): boolean {
  // Basic RFC 5322
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
```

### Password Requirements

```typescript
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^a-zA-Z0-9]/, "Must contain special character");
```

### File Upload Validation

```typescript
function validateUpload(file: File): Result<File, string> {
  // Size limit
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return Err("File too large");
  }

  // Extension allowlist
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Err("Invalid file type");
  }

  // MIME type validation
  const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
  if (!ALLOWED_MIMES.includes(file.type)) {
    return Err("Invalid MIME type");
  }

  return Ok(file);
}
```

## Common Pitfalls

### Trusting Client-Side Validation

```typescript
// ❌ WRONG: Only client-side validation
<input type="email" required />

// ✅ CORRECT: Also validate on server
function handleSubmit(data: unknown) {
  const result = emailSchema.safeParse(data);
  if (!result.success) {
    return Err('Invalid email');
  }
  // ...
}
```

### Double Encoding

```typescript
// ❌ WRONG: Double escaping
const escaped = escapeHTML(escapeHTML(userInput)); // &amp;lt; instead of &lt;

// ✅ CORRECT: Escape once at output
function render(data: string) {
  return escapeHTML(data); // Escape only when rendering
}
```

### Inconsistent Validation

```typescript
// ❌ WRONG: Different rules in different places
function validateUsername1(name: string) {
  return /^[a-z0-9_]{3,20}$/.test(name);
}

function validateUsername2(name: string) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(name); // Different!
}

// ✅ CORRECT: Single source of truth
const usernameSchema = z.string().regex(/^[a-zA-Z0-9_-]{3,20}$/);
```

## References

For implementation details:

- [Injection Prevention](references/injection-prevention.md) - SQL, command, LDAP, XPath injection
- [OWASP Cheat Sheets](references/owasp-cheatsheets.md) - Links and summaries
- [Library Usage](references/library-usage.md) - validator.js, DOMPurify, sanitize-html

## External Resources

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
