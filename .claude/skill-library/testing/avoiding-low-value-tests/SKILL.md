---
name: avoiding-low-value-tests
description: Use when writing or reviewing tests - prevents coverage-padding tests that don't catch bugs, enforces high-value patterns (behavior verification, edge cases, concurrency), provides mandatory checklist before completing test files
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Avoiding Low-Value Tests

**Ensure agents write tests that catch real bugs, not tests that inflate coverage metrics without providing value.**

## When to Use

Invoke this skill when:

- Writing new tests for any code
- Asked to "increase coverage" or "add tests"
- Reviewing test quality
- An agent produces tests that seem superficial

**You MUST use TodoWrite** to track test categories as you write them, checking off each category from the mandatory checklist.

## Quick Reference

| Test Type                         | Value | Action                          |
| --------------------------------- | ----- | ------------------------------- |
| Constant identity                 | LOW   | Remove                          |
| Trivial getter/setter             | LOW   | Remove unless logic exists      |
| Constructor field check           | LOW   | Remove unless validation exists |
| Length-only assertion             | LOW   | Add content verification        |
| Behavior verification             | HIGH  | Keep and expand                 |
| Edge case (nil, empty, not found) | HIGH  | Required                        |
| Concurrency test                  | HIGH  | Required if mutex/channels used |
| Error propagation                 | HIGH  | Required                        |

---

## Low-Value Test Patterns (AVOID)

### 1. Constant Identity Tests

```go
// BAD: Only fails if someone changes the constant
assert.Equal(t, NodeType("workflow"), NodeTypeWorkflow)
```

**Why it's useless**: If someone changes the constant intentionally, they'd also update the test. Catches nothing.

### 2. Trivial Getter/Setter Tests

```go
// BAD: No logic being tested
obj.SetFoo("bar")
assert.Equal(t, "bar", obj.GetFoo())
```

**Why it's useless**: Tests that the Go compiler works. No business logic verified.

### 3. Constructor Field Checks

```go
// BAD: Just verifies struct fields were assigned
node := NewNode("id", "name")
assert.Equal(t, "id", node.ID)
assert.Equal(t, "name", node.Name)
```

**Why it's useless**: Would only fail if constructor is completely broken, which would break everything else too.

### 4. Length-Only Assertions

```go
// BAD: Doesn't verify actual content
results := GetItems()
assert.Len(t, results, 3)
```

**Why it's useless**: Could return 3 wrong items and still pass.

### 5. Coverage-Driven Tests

Signs of coverage padding:

- Tests written solely to hit uncovered lines
- No meaningful assertions about behavior
- Would pass even if the code had bugs
- Test mirrors implementation rather than specification

---

## High-Value Test Patterns (REQUIRE)

### 1. Behavior Verification

```go
// GOOD: Tests actual behavior and relationships
g.AddNode(parent)
g.AddNode(child)
g.AddEdge(parent.ID(), child.ID())
assert.Equal(t, parent.ID(), child.Parent())
assert.Contains(t, g.Children(parent.ID()), child.ID())
```

**Why it's valuable**: Tests the contract, not the implementation. Would catch real bugs.

### 2. Edge Cases

```go
// GOOD: nil input, empty state, not found
result, ok := g.GetNode("nonexistent")
assert.False(t, ok)
assert.Nil(t, result)

// GOOD: nil map initialization
node := &Node{tags: nil}
node.AddTag("test") // should not panic
assert.True(t, node.HasTag("test"))
```

**Why it's valuable**: Edge cases are where bugs hide. Production code hits these paths.

### 3. Negative/Failure Cases

```go
// GOOD: What happens when things go wrong
_, err := Parse(invalidYAML)
assert.Error(t, err)
assert.Contains(t, err.Error(), "parsing")
```

**Why it's valuable**: Error handling is often untested and frequently buggy.

### 4. Concurrency Tests

```go
// GOOD: Verify thread safety (REQUIRED if code uses mutex/channels)
var wg sync.WaitGroup
for i := 0; i < 100; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        g.AddNode(NewNode(fmt.Sprintf("node-%d", id)))
    }(i)
}
wg.Wait()
assert.Equal(t, 100, g.NodeCount())
```

**Why it's valuable**: Race conditions are silent killers. If code has mutex, test it.

### 5. Integration/Roundtrip Tests

```go
// GOOD: Multiple operations together
yaml := `name: Build...`
graph, err := BuildGraph("owner/repo", "build.yml", []byte(yaml))
require.NoError(t, err)

path := FindPath(graph, "wf", func(n Node) bool {
    return n.HasTag(TagCheckout)
})
assert.Equal(t, []string{"wf", "job", "step"}, path)
```

**Why it's valuable**: Tests the actual user journey, not isolated units.

---

## Mandatory Test Categories Checklist

**Before completing ANY test file, verify coverage of:**

- [ ] **Happy path** - Normal successful operation
- [ ] **Empty/nil inputs** - Empty collections, nil pointers, zero values
- [ ] **Not found** - Missing keys, no matches, empty results
- [ ] **Invalid input** - Malformed data, wrong types, out of bounds
- [ ] **Boundary conditions** - Zero, one, max items
- [ ] **Concurrency** - If mutex/channels present, test parallel access
- [ ] **Error propagation** - Errors returned correctly with context

**If any checkbox is unchecked, the test file is incomplete.**

---

## Quality Over Coverage Rule

**Coverage is a side effect of good tests, not a goal.**

### When Asked to "Increase Coverage"

1. First identify what BEHAVIORS are untested
2. Write tests for those behaviors
3. Coverage will increase as a byproduct

**Never write tests just to hit lines.**

### Test Quality Questions

Before marking a test complete, ask:

1. "Would this test fail if the code had a bug?"
2. "Does this test verify behavior or just structure?"
3. "Is this testing logic or just exercising lines?"
4. "Would a broken implementation still pass this test?"

If any answer is concerning, rewrite the test.

---

## Anti-Pattern Detection

**Flag these as low-value when reviewing tests:**

| Pattern                                    | Problem                             |
| ------------------------------------------ | ----------------------------------- |
| `assert.Equal(t, constant, SameConstant)`  | Tests nothing                       |
| `assert.Len(t, x, n)` alone                | Doesn't verify content              |
| Tests with no assertions beyond "no panic" | Proves code runs, not that it works |
| Test mirrors implementation line-by-line   | Will pass even if impl is wrong     |
| Only happy path tested                     | Bugs hide in edge cases             |
| No error case tests                        | Error handling is untested          |
| Mutex present, no concurrency test         | Race conditions untested            |

---

## Common Rationalizations (Counter-Arguments)

### "We need to hit 80% coverage"

Coverage targets are met by testing behaviors, not lines. 80% meaningful tests beats 95% padding.

### "It's just a getter, doesn't need testing"

Correct. Don't test it. Don't write a useless test just to increase coverage.

### "The test documents the API"

Documentation belongs in comments or docs, not in test assertions that verify nothing.

### "It caught a bug once"

If a trivial test caught a bug, the bug was in not initializing a field - which would break everything, not just the getter.

---

## Related Skills

| Skill                      | Purpose                             |
| -------------------------- | ----------------------------------- |
| `developing-with-tdd`      | TDD methodology (write tests first) |
| `gateway-testing`          | Routes to all testing skills        |
| `debugging-systematically` | When tests fail unexpectedly        |
