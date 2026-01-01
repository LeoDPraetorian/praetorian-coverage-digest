---
name: writing-fingerprintx-tests
description: Use when writing unit tests for fingerprintx service detection plugins - guides through table-driven tests, protocol parsing validation, response checking, message building, and mock construction following established patterns from mysql_test.go and postgresql_test.go
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Writing Fingerprintx Tests

**Comprehensive unit testing patterns for fingerprintx service detection plugins.**

## When to Use

Use this skill when:

- Writing unit tests for a new fingerprintx plugin
- Adding test coverage to an existing plugin
- Testing protocol parsing functions (BSON, binary protocols)
- Validating response checking logic
- Testing message/query building functions
- Creating mock responses for protocol testing

**You MUST use TodoWrite** to track test implementation progress.

## Context

Fingerprintx is a service fingerprinting tool located at `/modules/fingerprintx`. Plugins implement the Plugin interface and live in `pkg/plugins/services/{service}/`. Many plugins lack comprehensive unit tests.

This skill ensures test coverage following patterns established in:

- `pkg/plugins/services/mongodb/mongodb_test.go` (24 test cases, table-driven)
- `pkg/plugins/services/mysql/mysql_test.go`
- `pkg/plugins/services/postgresql/postgresql_test.go`

## Integration with Fingerprintx Workflow

This skill is **Phase 4** of the fingerprintx development workflow:

1. `researching-protocols` - Research the protocol specification
2. `researching-version-markers` - Identify version detection markers
3. `writing-fingerprintx-modules` - Implement the plugin
4. **`writing-fingerprintx-tests`** - Write comprehensive tests (THIS SKILL)

## Quick Reference

| Test Category       | Purpose                                  | Example Functions                       |
| ------------------- | ---------------------------------------- | --------------------------------------- |
| Protocol Parsing    | Extract data from binary protocols       | `parseBSONString()`, `parseBSONInt32()` |
| Response Validation | Verify protocol response structure       | `checkMongoDBResponse()`                |
| Message Building    | Construct wire protocol messages         | `buildMongoDBQuery()`                   |
| Mock Construction   | Create realistic test responses          | `buildMockOPReply()`                    |
| Edge Cases          | Handle malformed/truncated/invalid input | Empty docs, wrong types, truncated data |

---

## Test File Structure

### Location and Package

```
pkg/plugins/services/{service}/{service}_test.go
```

**Package declaration**: Same as implementation (e.g., `package mongodb`)

### Required Imports

```go
import (
    "encoding/binary"
    "testing"
    "github.com/stretchr/testify/assert"
)
```

Additional imports depend on protocol requirements.

---

## Test Categories

### 1. Protocol Parsing Tests

For protocols using binary formats (BSON, custom wire protocols):

**What to test**:

- String extraction from binary documents
- Integer extraction (int32, int64)
- Edge cases: empty document, missing field, wrong type, truncated data

**Pattern**: Use table-driven tests with test cases covering valid, invalid, and edge case inputs.

**See**: [references/parsing-tests.md](references/parsing-tests.md) for complete examples including BSON parsing patterns.

### 2. Response Validation Tests

Test functions that validate protocol responses:

**What to test**:

- Response structure validation (opcodes, message length)
- Request ID matching
- Error conditions: too short, wrong opcode, mismatched requestID

**Pattern**: Create test responses with deliberate flaws, verify validation catches them.

**See**: [references/response-validation-tests.md](references/response-validation-tests.md) for MongoDB OP_REPLY and OP_MSG examples.

### 3. Message Building Tests

Test wire protocol message construction:

**What to test**:

- Message length calculation
- Opcode bytes placement
- Collection/database name encoding
- BSON document embedding

**Pattern**: Build message, verify byte-level structure matches protocol spec.

**See**: [references/message-building-tests.md](references/message-building-tests.md) for buildMongoDBQuery() and buildMongoDBMsgQuery() examples.

### 4. Mock Response Construction

Creating realistic mock responses for testing:

**Purpose**: Unit tests should NOT require live services. Mock responses enable isolated testing.

**Key principles**:

- Minimal valid structure (e.g., OP_REPLY requires 36+ bytes)
- Correct byte ordering (LittleEndian for most protocols)
- Valid protocol fields (length, opcode, request IDs)

**See**: [references/mock-construction.md](references/mock-construction.md) for buildMockOPReply() and similar patterns.

---

## Table-Driven Test Pattern

**Use table-driven tests for similar test cases with different inputs.**

### Structure

```go
func TestFunctionName(t *testing.T) {
    tests := []struct {
        name     string
        input    inputType
        expected outputType
        found    bool  // for functions returning (value, found)
    }{
        {"valid_case", validInput, expectedOutput, true},
        {"edge_case", edgeInput, defaultOutput, false},
        {"error_case", invalidInput, zeroValue, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, found := functionUnderTest(tt.input)
            assert.Equal(t, tt.expected, got)
            assert.Equal(t, tt.found, found)
        })
    }
}
```

**Benefits**:

- Easy to add new test cases
- Clear test case names
- Isolated test execution
- Standard pattern across plugins

---

## Mandatory Test Coverage

Every fingerprintx plugin MUST have tests for:

1. **All parsing functions** (if protocol uses binary/custom format)
2. **Response validation functions** (verify protocol structure)
3. **Message/query building functions** (construct wire protocol messages)
4. **Edge cases**:
   - Malformed input (wrong types, unexpected values)
   - Truncated data (message too short, incomplete documents)
   - Invalid data (empty documents, missing required fields)

**Coverage target**: 80%+ for parsing, validation, and message building logic.

---

## Anti-Patterns to Avoid

### ❌ Don't: Create integration tests requiring real services

```go
// WRONG: Requires running MongoDB instance
func TestRealMongoDB(t *testing.T) {
    conn, _ := net.Dial("tcp", "localhost:27017")
    // ...
}
```

**Integration tests belong in `{service}_integration_test.go` with build tags.**

### ❌ Don't: Test unexported functions without good reason

Only test unexported helpers if they contain complex logic that's hard to test through public API.

### ❌ Don't: Skip edge cases

```go
// WRONG: Only testing happy path
tests := []struct{...}{
    {"valid_input", validData, expected, true},
    // Missing: empty input, wrong type, truncated, etc.
}
```

### ❌ Don't: Use repetitive individual test functions

```go
// WRONG: Repetitive structure
func TestParseBSONInt32Valid(t *testing.T) { ... }
func TestParseBSONInt32NotFound(t *testing.T) { ... }
func TestParseBSONInt32Empty(t *testing.T) { ... }
```

**Use table-driven tests instead.**

---

## Workflow

1. **Identify functions to test**: Parsing, validation, message building
2. **Create test file**: `{service}_test.go` in same package
3. **Write table-driven tests**: Cover valid, invalid, edge cases
4. **Build mocks**: Create minimal valid protocol responses
5. **Run tests**: `go test ./pkg/plugins/services/{service}/`
6. **Verify coverage**: `go test -cover ./pkg/plugins/services/{service}/`

**Target**: 80%+ coverage for core plugin logic.

---

## Reference Files

Examine these for established patterns:

- `pkg/plugins/services/mongodb/mongodb_test.go` - 24 test cases, comprehensive coverage
- `pkg/plugins/services/mysql/mysql_test.go` - MySQL protocol testing patterns
- `pkg/plugins/services/postgresql/postgresql_test.go` - PostgreSQL protocol testing patterns

**Before implementing**: Read at least one reference file to understand the established testing style.

---

## Progressive Disclosure

**For detailed guidance:**

- [Parsing Tests](references/parsing-tests.md) - BSON and binary protocol parsing patterns
- [Response Validation Tests](references/response-validation-tests.md) - Protocol response verification
- [Message Building Tests](references/message-building-tests.md) - Wire protocol message construction
- [Mock Construction](references/mock-construction.md) - Building realistic test responses
- [Example Test File](examples/mongodb_test_annotated.md) - Annotated mongodb_test.go walkthrough

---

## Related Skills

- `researching-protocols` - Research protocol specifications before writing tests
- `researching-version-markers` - Identify version detection markers
- `writing-fingerprintx-modules` - Implement the plugin (Phase 3)
- `developing-with-tdd` - TDD methodology for test-first development
- `gateway-testing` - Access broader testing patterns and tools
