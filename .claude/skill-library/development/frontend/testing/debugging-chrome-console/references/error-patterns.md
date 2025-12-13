# Common Error Patterns

Quick reference guide for identifying and fixing common frontend errors encountered during autonomous browser debugging.

## Table of Contents

- [React Errors](#react-errors)
- [JavaScript Errors](#javascript-errors)
- [API/Network Errors](#apinetwork-errors)
- [Import/Module Errors](#importmodule-errors)
- [TypeScript Errors](#typescript-errors)
- [Build/Bundle Errors](#buildbundle-errors)

---

## React Errors

### Error: "Cannot read properties of undefined"

**Console message:**
```
TypeError: Cannot read properties of undefined (reading 'name')
```

**Root cause**: Accessing property on undefined/null object.

**Fix pattern:**

```typescript
// ❌ Before
<div>{user.name}</div>

// ✅ Option 1: Optional chaining
<div>{user?.name}</div>

// ✅ Option 2: Default value
<div>{user?.name ?? 'Unknown'}</div>

// ✅ Option 3: Guard clause
{user && <div>{user.name}</div>}
```

---

### Error: "Objects are not valid as a React child"

**Console message:**
```
Error: Objects are not valid as a React child (found: object with keys {id, name})
```

**Root cause**: Trying to render an object directly instead of extracting properties.

**Fix pattern:**

```typescript
// ❌ Before
<div>{user}</div>

// ✅ After
<div>{user.name}</div>

// ✅ Or JSON.stringify for debugging
<div>{JSON.stringify(user)}</div>
```

---

### Error: "Too many re-renders"

**Console message:**
```
Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**Root cause**: `setState` called directly in render, causing render loop.

**Fix pattern:**

```typescript
// ❌ Before (infinite loop)
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1);  // ❌ Called every render
  return <div>{count}</div>;
}

// ✅ After (event handler)
function Component() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ✅ After (useEffect with dependency)
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(1);  // Only on mount
  }, []);  // Empty deps array
  return <div>{count}</div>;
}
```

---

### Error: "React Hook called conditionally"

**Console message:**
```
Error: React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render.
```

**Root cause**: Hook called inside `if`, loop, or nested function.

**Fix pattern:**

```typescript
// ❌ Before
function Component({ show }) {
  if (show) {
    const [count, setCount] = useState(0);  // ❌ Conditional hook
  }
}

// ✅ After (move hook to top level)
function Component({ show }) {
  const [count, setCount] = useState(0);  // ✅ Always called
  if (show) {
    return <div>{count}</div>;
  }
  return null;
}
```

---

### Error: "Cannot update a component while rendering"

**Console message:**
```
Warning: Cannot update a component (`Parent`) while rendering a different component (`Child`)
```

**Root cause**: Calling parent's `setState` during child's render.

**Fix pattern:**

```typescript
// ❌ Before
function Child({ setParentState }) {
  setParentState('value');  // ❌ Called during render
  return <div>Child</div>;
}

// ✅ After (use useEffect)
function Child({ setParentState }) {
  useEffect(() => {
    setParentState('value');  // ✅ Called after render
  }, [setParentState]);
  return <div>Child</div>;
}

// ✅ Or use callback
function Child({ setParentState }) {
  return <button onClick={() => setParentState('value')}>Update</button>;
}
```

---

## JavaScript Errors

### Error: "ReferenceError: X is not defined"

**Console message:**
```
ReferenceError: myFunction is not defined
```

**Root cause**: Variable/function used before declaration or not imported.

**Fix pattern:**

```typescript
// ❌ Before
const result = myFunction();  // ❌ Not defined

// ✅ Option 1: Import it
import { myFunction } from './utils';
const result = myFunction();

// ✅ Option 2: Define it
function myFunction() { return 42; }
const result = myFunction();
```

---

### Error: "TypeError: X is not a function"

**Console message:**
```
TypeError: user.getName is not a function
```

**Root cause**: Trying to call non-function as function.

**Fix pattern:**

```typescript
// ❌ Before
const name = user.getName();  // getName doesn't exist or is not a function

// ✅ Check if function exists
const name = typeof user.getName === 'function' ? user.getName() : user.name;

// ✅ Or use optional chaining
const name = user.getName?.();
```

---

### Error: "null is not an object"

**Console message:**
```
TypeError: null is not an object (evaluating 'user.name')
```

**Root cause**: Accessing property on `null`.

**Fix pattern:**

```typescript
// ❌ Before
const name = user.name;  // user is null

// ✅ After
const name = user?.name;

// ✅ Or guard clause
if (user === null) return <Loading />;
return <div>{user.name}</div>;
```

---

## API/Network Errors

### Error: "Failed to fetch"

**Console message:**
```
TypeError: Failed to fetch
```

**Root cause**: Network request failed (CORS, 404, 500, no connection).

**Fix pattern:**

```typescript
// ❌ Before (no error handling)
const data = await fetch('/api/users').then(r => r.json());

// ✅ After (with error handling)
try {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Fetch failed:', error);
  // Handle error (show message, retry, etc.)
}
```

**Check network tab:**
```bash
# Use list_network_requests to see failed requests
npx tsx -e "(async () => {
  const { listNetworkRequests } = await import('./.claude/tools/chrome-devtools/list-network-requests.ts');
  const result = await listNetworkRequests.execute({});
  const failed = result.requests.filter(r => r.status >= 400);
  console.log('Failed requests:', JSON.stringify(failed, null, 2));
})();" 2>/dev/null
```

---

### Error: "CORS policy blocked"

**Console message:**
```
Access to fetch at 'http://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Root cause**: Backend doesn't allow requests from your origin.

**Fix pattern:**

**Backend fix (Express example):**
```typescript
// Add CORS headers
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

**Proxy fix (Vite):**
```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://api.example.com',
        changeOrigin: true
      }
    }
  }
}
```

---

### Error: "Unexpected token in JSON"

**Console message:**
```
SyntaxError: Unexpected token < in JSON at position 0
```

**Root cause**: API returned HTML (error page) instead of JSON.

**Fix pattern:**

```typescript
// ❌ Before
const data = await fetch('/api/users').then(r => r.json());

// ✅ After (check content type)
const response = await fetch('/api/users');
const contentType = response.headers.get('content-type');

if (contentType && contentType.includes('application/json')) {
  const data = await response.json();
} else {
  const text = await response.text();
  console.error('Expected JSON, got:', text);
}
```

---

## Import/Module Errors

### Error: "Module not found"

**Console message:**
```
Module not found: Can't resolve './Button'
```

**Root cause**: Import path is incorrect or file doesn't exist.

**Fix pattern:**

```typescript
// ❌ Before
import { Button } from './Button';  // Wrong path

// ✅ Check file location
// src/components/Button.tsx
import { Button } from '@/components/Button';  // Alias
import { Button } from '../components/Button';  // Relative
```

**Debugging:**
```bash
# Find the file
find . -name "Button.tsx"

# Check import aliases
cat tsconfig.json | grep paths
```

---

### Error: "Attempted import error"

**Console message:**
```
Attempted import error: 'Button' is not exported from './components'
```

**Root cause**: Named export doesn't exist.

**Fix pattern:**

```typescript
// ❌ Before
import { Button } from './components';  // Named export

// ✅ Check what's exported
// If default export:
import Button from './components';

// If named export with different name:
import { ButtonComponent as Button } from './components';
```

---

## TypeScript Errors

### Error: "Property does not exist on type"

**Console message:**
```
Error: Property 'name' does not exist on type 'User'
```

**Root cause**: TypeScript type doesn't match actual object structure.

**Fix pattern:**

```typescript
// ❌ Before
interface User {
  id: number;
}
const name = user.name;  // 'name' doesn't exist on User

// ✅ After (add to interface)
interface User {
  id: number;
  name: string;
}
const name = user.name;

// ✅ Or use type assertion (if you know better)
const name = (user as any).name;
```

---

### Error: "Argument of type X is not assignable to type Y"

**Console message:**
```
Error: Argument of type 'string | undefined' is not assignable to parameter of type 'string'
```

**Root cause**: Passing nullable value where non-nullable expected.

**Fix pattern:**

```typescript
// ❌ Before
function greet(name: string) { ... }
greet(user.name);  // user.name might be undefined

// ✅ After (non-null assertion)
greet(user.name!);  // If you're SURE it's not null

// ✅ Better (default value)
greet(user.name ?? 'Guest');

// ✅ Best (guard clause)
if (user.name) {
  greet(user.name);
}
```

---

## Build/Bundle Errors

### Error: "Module parse failed: Unexpected token"

**Console message:**
```
Module parse failed: Unexpected token (1:0)
You may need an appropriate loader to handle this file type
```

**Root cause**: Webpack/Vite doesn't know how to handle file type.

**Fix pattern:**

**For Vite:**
```typescript
// vite.config.ts
export default {
  assetsInclude: ['**/*.md']  // Allow importing .md files
}
```

**For images/assets:**
```typescript
// ❌ Before
import logo from './logo.svg';  // May fail

// ✅ After (add type declaration)
// vite-env.d.ts
declare module '*.svg' {
  const content: any;
  export default content;
}
```

---

### Error: "Cannot find module" (build time)

**Console message:**
```
Error: Cannot find module '@/components/Button'
```

**Root cause**: TypeScript can't resolve path alias.

**Fix pattern:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

```typescript
// vite.config.ts
export default {
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}
```

---

## Debugging Checklist

When encountering an error:

1. **Read the full error message** - includes file/line number
2. **Check the stack trace** - shows call chain that led to error
3. **Identify error category** - React? JS? Network? Import?
4. **Apply pattern from this guide** - match error to fix pattern
5. **Verify fix in browser** - reload and check console
6. **Iterate if needed** - fix may reveal new errors

---

## Related References

- [Autonomous Debugging Workflow](workflow.md) - Complete debugging process
- [Chrome DevTools MCP Tools](chrome-devtools-tools.md) - Tool reference
- [Iterative Fix Loop](iterative-loop.md) - How to iterate until clean
