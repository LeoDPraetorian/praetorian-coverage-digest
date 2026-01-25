# Fix Pattern: Inline Event Handlers

**Problem**: Event handler is called immediately during render instead of waiting for user interaction.

## Root Cause

```typescript
<button onClick={setCount(1)}>
  // setCount(1) executes IMMEDIATELY during render
  // → triggers re-render → executes again → infinite loop
</button>
```

React executes the expression in curly braces during render. `setCount(1)` is a function **call**, not a function **reference**.

---

## Fix Pattern 1: Pass Function Reference

**When to use**: Simple state setter, no arguments needed.

### Before (Broken)

```typescript
<button onClick={setCount(0)}>Reset</button>
// Executes setCount(0) during render
```

### After (Fixed)

```typescript
<button onClick={() => setCount(0)}>Reset</button>
// Passes arrow function, executes on click
```

**Why it works**: Arrow function creates a callback. `setCount(0)` only runs when button clicked.

---

## Fix Pattern 2: Use Function Without Parentheses

**When to use**: Handler function takes event as argument.

### Before (Broken)

```typescript
const handleClick = (e) => {
  console.log('Clicked', e.target);
};

<button onClick={handleClick()}>Click</button>
// Calls handleClick() immediately, returns undefined
```

### After (Fixed)

```typescript
const handleClick = (e) => {
  console.log('Clicked', e.target);
};

<button onClick={handleClick}>Click</button>
// Passes function reference, React calls it with event
```

**Why it works**: `handleClick` (no parentheses) is a function reference, not a call.

---

## Fix Pattern 3: Pass Arguments to Handler

**When to use**: Handler needs specific arguments.

### Before (Broken)

```typescript
<button onClick={updateItem(item.id, 'active')}>Activate</button>
// Calls updateItem immediately
```

### After (Fixed)

```typescript
<button onClick={() => updateItem(item.id, 'active')}>Activate</button>
// Arrow function defers execution until click
```

**Why it works**: Arrow function captures arguments in closure, executes on click.

---

## Fix Pattern 4: Move State Update to Handler Function

**When to use**: Logic is more complex than simple state update.

### Before (Broken)

```typescript
<button onClick={setCount(count + 1)}>Increment</button>
```

### After (Fixed)

```typescript
const handleIncrement = () => {
  setCount(prev => prev + 1);
};

<button onClick={handleIncrement}>Increment</button>
```

**Why it works**: Named handler is cleaner, more maintainable, and clearly a reference.

---

## Verification

After fix, confirm:

- [ ] Button doesn't trigger action during render (before clicking)
- [ ] Click handler only runs when user actually clicks
- [ ] No "Too many re-renders" error
- [ ] Console logs show handler called once per click, not continuously
