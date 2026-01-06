# Security Library Usage Guide

## validator.js

**Purpose:** String validation and sanitization

```typescript
import validator from "validator";

// Validation
validator.isEmail("test@example.com"); // true
validator.isURL("https://example.com"); // true
validator.isUUID("a3bb189e-8bf9-3888-9912-ace4e6543002"); // true
validator.isIP("192.168.1.1"); // true
validator.isMobilePhone("+14155552671", "en-US"); // true

// Sanitization
validator.escape("<script>alert(1)</script>"); // &lt;script&gt;alert(1)&lt;&#x2F;script&gt;
validator.trim("  hello  "); // 'hello'
validator.normalizeEmail("Test@Example.COM"); // 'test@example.com'
validator.stripLow("hello\x00world"); // 'helloworld' (removes control chars)
```

**Common patterns:**

```typescript
// Email validation + normalization
function validateEmail(email: string): Result<string, string> {
  if (!validator.isEmail(email)) {
    return Err("Invalid email");
  }
  return Ok(validator.normalizeEmail(email) || email);
}

// URL validation
function validateURL(url: string): Result<string, string> {
  if (!validator.isURL(url, { protocols: ["https"], require_protocol: true })) {
    return Err("Invalid URL");
  }
  return Ok(url);
}
```

## DOMPurify

**Purpose:** HTML sanitization (XSS prevention)

```typescript
import DOMPurify from "isomorphic-dompurify";

// Basic sanitization
const dirty = "<img src=x onerror=alert(1)>";
const clean = DOMPurify.sanitize(dirty);
// Result: <img src="x">

// Allowlist specific tags
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["p", "br", "strong", "em"],
  ALLOWED_ATTR: ["href", "target"],
});

// Strip all HTML
const textOnly = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
```

**React integration:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

## sanitize-html

**Purpose:** HTML sanitization with more control than DOMPurify

```typescript
import sanitizeHtml from "sanitize-html";

const dirty = "<div>Hello <script>alert(1)</script></div>";

// Default sanitization
const clean = sanitizeHtml(dirty);
// Result: <div>Hello </div>

// Custom configuration
const clean = sanitizeHtml(dirty, {
  allowedTags: ["p", "br", "strong", "em", "a"],
  allowedAttributes: {
    a: ["href", "target"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Force all links to open in new tab
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
  },
});
```

## xss (js-xss)

**Purpose:** Lightweight XSS filter

```typescript
import { filterXSS } from "xss";

const dirty = "<script>alert(1)</script><p>Hello</p>";
const clean = filterXSS(dirty);
// Result: <p>Hello</p>

// Custom whitelist
const clean = filterXSS(dirty, {
  whiteList: {
    p: ["class", "id"],
    a: ["href", "title", "target"],
  },
  stripIgnoreTag: true, // Remove tags not in whitelist
  stripIgnoreTagBody: ["script"], // Remove script tag and contents
});
```

## sql-template-strings

**Purpose:** Safe SQL query building

```typescript
import SQL from "sql-template-strings";

// ✅ Automatically parameterizes
const userId = "1' OR '1'='1";
const query = SQL`SELECT * FROM users WHERE id = ${userId}`;
// Results in: { text: 'SELECT * FROM users WHERE id = ?', values: ["1' OR '1'='1"] }

db.query(query);

// Composing queries
const filters = SQL`WHERE status = ${"active"}`;
const query = SQL`SELECT * FROM users `.append(filters);
```

## helmet

**Purpose:** Security headers middleware (Express/Node.js)

```typescript
import helmet from "helmet";
import express from "express";

const app = express();

// Apply all security headers
app.use(helmet());

// Or customize
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "trusted-cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

## bcrypt

**Purpose:** Password hashing

```typescript
import bcrypt from "bcrypt";

// Hash password
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Cost factor (higher = slower = more secure)
  return bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

## zxcvbn

**Purpose:** Password strength estimation

```typescript
import zxcvbn from "zxcvbn";

function checkPasswordStrength(password: string) {
  const result = zxcvbn(password);

  return {
    score: result.score, // 0-4 (0 = weak, 4 = strong)
    feedback: result.feedback,
    crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
  };
}

// Example
const check = checkPasswordStrength("password123");
// score: 0
// feedback: { warning: 'This is a top-10 common password', suggestions: [...] }
```

## Comparison Matrix

| Library       | Purpose              | Best For                      | Bundle Size |
| ------------- | -------------------- | ----------------------------- | ----------- |
| validator.js  | String validation    | API input validation          | ~30KB       |
| DOMPurify     | HTML sanitization    | React dangerouslySetInnerHTML | ~20KB       |
| sanitize-html | HTML sanitization    | Node.js HTML processing       | ~50KB       |
| xss (js-xss)  | XSS filtering        | Lightweight alternative       | ~10KB       |
| sql-template  | SQL parameterization | Building safe SQL queries     | ~3KB        |
| helmet        | Security headers     | Express.js apps               | ~15KB       |
| bcrypt        | Password hashing     | User authentication           | ~50KB       |
| zxcvbn        | Password strength    | Registration forms            | ~400KB      |

## When to Use Each

### validator.js

- Validating user registration forms
- API endpoint input validation
- Before storing data in database

### DOMPurify

- Rendering user-generated HTML in React
- Rich text editor output
- Displaying markdown-to-HTML content

### sql-template-strings

- Building dynamic SQL queries
- When you can't use an ORM
- Legacy codebases with raw SQL

### helmet

- Every Express.js application
- Production Node.js servers
- API servers serving web clients
