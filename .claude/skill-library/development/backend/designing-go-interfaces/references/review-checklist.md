# Interface Design Code Review Checklist

This checklist provides structured review criteria for Go interface designs, based on research from production scanners (165K+ stars) and authoritative sources (Dave Cheney, Uber Go Style Guide, Go Blog).

---

## Pre-Review Context

Before reviewing interface design, establish context:

| Question                                 | Why It Matters                                     |
| ---------------------------------------- | -------------------------------------------------- |
| Is this a new interface or modification? | Modifications have backward compatibility concerns |
| How many implementations exist today?    | 0-1 = premature abstraction risk                   |
| What's the expected lifetime?            | Prototype vs long-term affects stability needs     |
| Who are the consumers?                   | Internal vs external affects compatibility         |

---

## 1. Interface Size and Cohesion

### ✅ Size Checks

- [ ] Interface has ≤3 methods (ideally 1-2)
- [ ] All methods serve the same high-level purpose
- [ ] Methods are at the same level of abstraction
- [ ] No "utility" methods mixed with core behavior

### ❌ Red Flags

| Pattern           | Problem          | Example                           |
| ----------------- | ---------------- | --------------------------------- |
| >5 methods        | God interface    | `CloudProvider` with 15+ methods  |
| Mixed concerns    | SRP violation    | `Read + Write + Config + Metrics` |
| Mixed abstraction | Unclear contract | `Scan() + GetInternalState()`     |
| Kitchen sink      | Unusable         | Everything in one interface       |

### Review Questions

> "Could this interface be split into 2-3 smaller interfaces?"

> "Do all implementations need all these methods?"

> "Are any methods optional (empty implementations in some impls)?"

**Source:** [Go Blog - Organizing Go Code](https://go.dev/blog/organizing-go-code) - "If in doubt, leave it out!"

---

## 2. Interface Necessity

### ✅ Valid Reasons for Interface

- [ ] Multiple implementations exist (or planned within 30 days)
- [ ] Testing requires mocking external dependencies
- [ ] Plugin/extension system with third-party implementers
- [ ] Dependency injection at architectural boundary
- [ ] Public API that consumers will implement

### ❌ Invalid Reasons

| Excuse                                 | Reality                             |
| -------------------------------------- | ----------------------------------- |
| "Interfaces are best practice"         | Without real need, they're overhead |
| "We might need it someday"             | YAGNI - add when actually needed    |
| "It makes code look professional"      | Complexity without benefit          |
| Single implementation, no testing need | Premature abstraction               |

### Review Questions

> "How many implementations exist? Show me."

> "Is testing blocked without this interface?"

> "Could we use concrete types and add interface later if needed?"

**Source:** [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html) - "Let callers define interfaces"

---

## 3. Type Safety

### ✅ Type Safety Checks

- [ ] No `interface{}` in method signatures
- [ ] Concrete types used for known data
- [ ] Generics used for type-safe flexibility (Go 1.18+)
- [ ] Return types are specific, not `interface{}`

### ❌ Red Flags

| Pattern                                       | Problem                      |
| --------------------------------------------- | ---------------------------- |
| `func Process(input interface{}) interface{}` | Zero type safety             |
| Type assertions in consumer code              | Runtime errors               |
| `switch v.(type)` chains                      | Brittle, hidden requirements |
| Documentation says "pass X type"              | Should be in signature       |

### Review Questions

> "Why is interface{} needed here instead of a concrete type?"

> "Could we use generics [T any] instead?"

> "What happens if caller passes wrong type?" (Runtime panic = bad)

**Source:** [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md) - interface{} is "tool of last resort"

---

## 4. Return Types

### ✅ Return Type Checks

- [ ] Functions return concrete types, not interfaces
- [ ] Constructor returns `*ConcreteType`, not `Interface`
- [ ] Concrete types allow access to implementation details when needed

### ❌ Red Flags

| Pattern                                       | Problem                |
| --------------------------------------------- | ---------------------- |
| `func NewService() ServiceInterface`          | Over-abstraction       |
| Callers cannot access concrete implementation | Locked out of features |
| Type assertions needed after construction     | API friction           |

### Review Questions

> "Why return interface instead of concrete type?"

> "Do callers need access to implementation-specific methods?"

> "Could we return concrete type and let callers use interface if they want?"

**Source:** [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html) - "Accept interfaces, return structs"

---

## 5. Interface Definition Location

### ✅ Location Checks

- [ ] Interface defined near consumer, not producer
- [ ] Multiple consumers define their own minimal interfaces
- [ ] Stdlib interfaces (io.Reader, etc.) used appropriately

### ❌ Red Flags

| Pattern                                              | Problem               |
| ---------------------------------------------------- | --------------------- |
| Interface in same package as only implementation     | Premature abstraction |
| Producer dictating interface shape                   | Forced coupling       |
| Large interface when consumers only need 1-2 methods | Over-specification    |

### Review Questions

> "Who consumes this interface? Show me usage."

> "Could consumers define this interface themselves?"

> "Are we forcing unnecessary methods on consumers?"

**Source:** Production scanners - 100% follow caller-defines-interface pattern

---

## 6. Performance Implications

### ✅ Performance Checks

- [ ] Interface use justified in hot paths (profiled)
- [ ] Concrete types used where performance critical
- [ ] Interface overhead measured if in tight loops

### ❌ Red Flags

| Pattern                                     | Impact              |
| ------------------------------------------- | ------------------- |
| Interface in inner loop (millions of calls) | 2.4x slower         |
| No performance testing/profiling done       | Unknown cost        |
| "Abstraction is worth any cost" mindset     | Wrong for hot paths |

### Review Questions

> "Is this code path performance-sensitive?"

> "Have we profiled to see if interface dispatch matters?"

> "Could we use concrete types in hot path and interfaces at boundaries?"

**Source:** Research benchmarks - Interface dispatch 2.4x slower than direct calls

---

## 7. Testing Considerations

### ✅ Testing Checks

- [ ] Interface enables testing without external dependencies
- [ ] Mock implementations are trivial to write (1-3 methods)
- [ ] Test interfaces are minimal (only methods tests use)

### ❌ Red Flags

| Pattern                                               | Problem             |
| ----------------------------------------------------- | ------------------- |
| Large mock structs with 10+ methods                   | Interface too large |
| Empty/panic mock methods for unused interface methods | Forced complexity   |
| Interface bigger than testing actually needs          | Over-design         |

### Review Questions

> "How many methods do tests actually call?"

> "Could test define smaller interface with just those methods?"

> "Is mocking really needed or could we use real implementation?"

---

## 8. Documentation

### ✅ Documentation Checks

- [ ] Interface purpose clearly stated
- [ ] Expected behavior documented
- [ ] Edge cases and error handling specified
- [ ] Examples showing usage

### ❌ Red Flags

| Pattern                                     | Problem                  |
| ------------------------------------------- | ------------------------ |
| No documentation on interface               | Contract unclear         |
| "Self-documenting code" excuse              | Lazy                     |
| Unclear contracts (call order, concurrency) | Implementation surprises |
| No examples                                 | Adoption barrier         |

### Review Questions

> "What contract does this interface define?"

> "What happens if method returns error?"

> "Can methods be called in any order? Concurrently?"

---

## Review Decision Matrix

| Criteria               | ✅ Go    | ⚠️ Caution | 🛑 Stop              |
| ---------------------- | -------- | ---------- | -------------------- |
| Method count           | ≤3       | 4-5        | >5                   |
| Implementations exist  | ≥2       | 1          | 0                    |
| Type safety            | Full     | Mixed      | None (`interface{}`) |
| Return concrete types  | Yes      | Mixed      | No                   |
| Caller-defined         | Yes      | Partial    | Library-forced       |
| Documentation          | Complete | Partial    | Missing              |
| Performance considered | Profiled | Estimated  | Ignored              |

**Decision:**

- **✅ Go:** Approve as-is
- **⚠️ Caution:** Request changes or strong justification
- **🛑 Stop:** Require redesign

---

## Example Review Comments

### Comment 1: Interface Too Large

```
❌ PROBLEM:
type CloudProvider interface {
    CreateVM(...) error
    DeleteVM(...) error
    CreateStorage(...) error
    DeleteStorage(...) error
    // 10+ more methods
}

💬 FEEDBACK:
This interface has 14 methods spanning multiple concerns (compute, storage, networking).

Research: All 5 production scanners (165K+ stars) use 1-3 methods per interface.

Recommended fix:
- ComputeManager (VM operations)
- StorageManager (storage operations)
- NetworkManager (network operations)

Compose if consumers need multiple:
type CloudProvider interface {
    ComputeManager
    StorageManager
}
```

### Comment 2: Unnecessary Interface

```
❌ PROBLEM:
type UserStore interface {
    GetUser(id string) (User, error)
}

type userStore struct { db *sql.DB }
// Only implementation, no mocks needed yet

💬 FEEDBACK:
Only one implementation exists. Return concrete type until abstraction is needed:

type UserStore struct { db *sql.DB }
func (s *UserStore) GetUser(id string) (User, error)

Let consumers define interfaces when they need them (Dave Cheney principle).
```

### Comment 3: interface{} Overuse

```
❌ PROBLEM:
func Process(input interface{}) interface{}

💬 FEEDBACK:
This loses all type safety. Zero of 5 production scanners use interface{} in core APIs.

Options:
1. Concrete types: func Process(input Request) Response
2. Generics (Go 1.18+): func Process[T any](input T) T
3. Interface constraint: func Process[T Processable](input T) T

Which approach fits the use case?
```

### Comment 4: Performance Concern

```
⚠️ CONCERN:
for _, item := range items {
    scanner.Scan(item)  // Interface call in loop
}

💬 FEEDBACK:
This is a hot path (100K+ calls/second). Interface dispatch is 2.4x slower than direct calls.

Have you profiled this? If interface{} dispatch is bottleneck, consider:
1. Concrete type in loop: scanner.(*ConcreteScanner).Scan(item)
2. Batch API: scanner.ScanBatch(items)
```

---

## Quick Reference Card

### Dave Cheney's Principles

1. **Accept interfaces, return structs** - Flexibility for callers
2. **Let callers define interfaces** - Avoid library-forced coupling
3. **Prefer small interfaces** - 1-3 methods ideal

### Production Scanner Patterns (165K+ stars)

| Scanner       | Interface | Methods |
| ------------- | --------- | ------- |
| TruffleHog    | Detector  | 3       |
| Trivy         | Scanner   | 1       |
| Nuclei        | Executor  | 2       |
| golangci-lint | Linter    | 1       |
| gosec         | Rule      | 2       |

**Average: 1.8 methods per interface**

### Numbers to Remember

| Metric                      | Value       |
| --------------------------- | ----------- |
| Ideal methods               | 1-3         |
| Max methods                 | 5           |
| interface{} appropriate     | <5% of APIs |
| Interface dispatch overhead | 2.4x slower |

---

## Final Checklist

Before approving interface design:

- [ ] Method count ≤3 (or strong justification)
- [ ] Multiple implementations exist or imminent
- [ ] Type safety maintained (no interface{} without reason)
- [ ] Return types are concrete
- [ ] Interface defined by consumer, not library
- [ ] Documentation complete
- [ ] Performance implications considered
- [ ] Tests validate interface contract

---

## References

1. [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html)
2. [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
3. [Go Blog - Organizing Go Code](https://go.dev/blog/organizing-go-code)
4. Research: Production scanner analysis (TruffleHog, Trivy, Nuclei, golangci-lint, gosec)
5. Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md`
