# Cyclomatic Complexity - Calculation Methods

Detailed explanation of how cyclomatic complexity is calculated using different methods.

## Basic Formula (Decision-Based)

**McCabe's original formula:**

```
Complexity = (number of decision points) + 1
```

**Decision points include:**

- `if` statements
- `while` loops
- `for` loops
- `case` clauses in switch statements
- `&&` and `||` boolean operators (in some tools)
- `? :` ternary operators (in some tools)
- `catch` clauses (in some tools)

**Example:**

```typescript
function example(x: number) {
  // +1 (function entry)
  if (x > 0) {
    // +1 (if)
    for (let i = 0; i < x; i++) {
      // +1 (for loop)
      console.log(i);
    }
  } else if (x < 0) {
    // +1 (else if)
    return -1;
  }
  return 0;
}
// Total complexity: 4
```

## Simplified Formula

```
Complexity = 1 + ifs + loops + cases
```

Where:

- **1** = function entry point
- **ifs** = number of `if`, `else if` statements
- **loops** = number of `while`, `for`, `do-while` loops
- **cases** = number of `case` labels in `switch` (excluding `default`)

**Example:**

```go
func processAsset(asset *Asset) error {  // +1 (entry)
    if asset == nil {                    // +1 (if)
        return errors.New("nil asset")
    }

    switch asset.Type {                   // +0 (switch itself)
        case "domain":                    // +1 (case)
            return scanDomain(asset)
        case "ip":                        // +1 (case)
            return scanIP(asset)
        default:                          // +0 (default - not counted)
            return errors.New("unknown type")
    }
}
// Total complexity: 4
```

## Graph-Based Formula (Control Flow Graph)

The formal mathematical definition uses control flow graphs:

```
M = E - N + 2P
```

Where:

- **M** = cyclomatic complexity
- **E** = number of edges in the control flow graph
- **N** = number of nodes in the control flow graph
- **P** = number of connected components (usually 1)

**For a single function (P = 1):**

```
M = E - N + 2
```

### Constructing a Control Flow Graph

**Example function:**

```python
def calculate_discount(price, membership):
    if membership == 'gold':
        discount = 0.20
    elif membership == 'silver':
        discount = 0.10
    else:
        discount = 0

    return price * (1 - discount)
```

**Control Flow Graph:**

```
    START (N1)
      ↓
    Entry (N2)
      ↓
  membership == 'gold'? (N3)
    /              \
  Yes (E1)        No (E2)
   |                |
discount=0.20 (N4)  membership == 'silver'? (N5)
   |               /              \
   |            Yes (E3)         No (E4)
   |             |                 |
   |      discount=0.10 (N6)    discount=0 (N7)
   |             |                 |
   \             |                 /
    \            |                /
     \-----------+-----------------
               |
          calculate (N8)
               |
          return (N9)
               ↓
             END (N10)
```

**Counting:**

- **Nodes (N)**: 10
- **Edges (E)**: 13
- **Connected components (P)**: 1

**Calculation:**

```
M = E - N + 2P
M = 13 - 10 + 2(1)
M = 13 - 10 + 2
M = 5
```

**Verification with decision-based formula:**

```
M = 1 + 1 (if) + 1 (elif) + 1 (implied else) + 1 (return path merge)
M = 4
```

**Note**: Slight difference due to how graph edges are counted vs decision points. Most tools use the decision-based approach for simplicity.

## Alternative Formula (Path-Based)

```
M = Number of linearly independent paths
```

A **linearly independent path** is a path through the program that introduces at least one new edge not covered by other paths.

**Example:**

```typescript
function validate(x: number, y: number) {
  if (x > 0) {
    // Decision 1
    if (y > 0) {
      // Decision 2
      return true;
    }
  }
  return false;
}
```

**Possible paths:**

1. `x ≤ 0` → return false
2. `x > 0` AND `y ≤ 0` → return false
3. `x > 0` AND `y > 0` → return true

**Linearly independent paths: 3**
**Complexity: 3** (matches 1 + 2 decisions)

## Boolean Operator Handling

**Strict counting** (some tools):

```typescript
if (a && b && c) {
  // Complexity +3 (one for each &&)
  doSomething();
}
```

**Lenient counting** (most tools):

```typescript
if (a && b && c) {
  // Complexity +1 (entire condition as one decision)
  doSomething();
}
```

**Best practice**: Be consistent with your tool's approach. Most modern tools use lenient counting unless explicitly configured otherwise.

## Edge Cases

### Exception Handling

```typescript
try {
  riskyOperation(); // +0 (no decision)
} catch (e) {
  // +1 (exception path)
  handleError(e);
} finally {
  // +0 (always executes)
  cleanup();
}
// Complexity: 2 (entry + catch)
```

### Short-Circuit Evaluation

```typescript
if (user && user.isActive && user.hasPermission) {
  // +1 or +3?
  allow();
}
```

**Tools vary**:

- **ESLint**: +1 (treats entire condition as one decision)
- **Lizard**: +3 (counts each `&&` as separate decision)
- **gocyclo**: +1 (Go-specific, treats as single condition)

### Ternary Operators

```typescript
const result = condition ? valueA : valueB; // +1 in most tools
```

Treated as equivalent to:

```typescript
let result;
if (condition) {
  // +1
  result = valueA;
} else {
  result = valueB;
}
```

## Worked Example: Complex Function

```go
func ProcessOrder(order *Order) error {
    // Entry point: +1

    if order == nil {                              // +1
        return errors.New("nil order")
    }

    if !order.IsValid() {                          // +1
        return errors.New("invalid order")
    }

    switch order.Type {                            // +0 (switch itself)
        case "standard":                           // +1
            if order.IsPriority {                  // +1
                return processStandardPriority(order)
            }
            return processStandard(order)
        case "express":                            // +1
            return processExpress(order)
        case "bulk":                               // +1
            for _, item := range order.Items {     // +1
                if err := validateItem(item); err != nil {  // +1
                    return err
                }
            }
            return processBulk(order)
        default:
            return errors.New("unknown order type")
    }
}
```

**Calculation:**

```
Complexity = 1 (entry)
           + 1 (if order == nil)
           + 1 (if !order.IsValid)
           + 1 (case "standard")
           + 1 (if order.IsPriority)
           + 1 (case "express")
           + 1 (case "bulk")
           + 1 (for loop)
           + 1 (if err != nil)
           = 9
```

**Assessment**: Just under the threshold of 10. Acceptable if logic is clear, but consider refactoring if this function changes frequently.

## Tool Comparison

| Tool      | Boolean Operators       | Ternary | Exception Handling  | Switch Cases   |
| --------- | ----------------------- | ------- | ------------------- | -------------- |
| Lizard    | Counts each `&&`/`\|\|` | +1      | catch = +1          | Each case = +1 |
| ESLint    | Single condition        | +1      | catch = +1          | Each case = +1 |
| gocyclo   | Single condition        | +1      | Not applicable (Go) | Each case = +1 |
| radon     | Counts each `and`/`or`  | +1      | except = +1         | Each case = +1 |
| SonarQube | Configurable            | +1      | catch = +1          | Each case = +1 |

**Recommendation**: Use the same tool consistently. Don't compare absolute values across tools.

## References

- McCabe, T.J. (1976). "A Complexity Measure". IEEE Transactions on Software Engineering.
- [NIST 500-235: Structured Testing: A Testing Methodology Using the Cyclomatic Complexity Metric](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication500-235.pdf)
- [Wikipedia: Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
