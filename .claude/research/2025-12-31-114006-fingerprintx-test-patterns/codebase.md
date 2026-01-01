# Codebase Research: Fingerprintx Test Patterns

**Research Date**: 2025-12-31
**Target**: `modules/fingerprintx/pkg/plugins/services/`
**Purpose**: Identify established unit testing patterns for writing-fingerprintx-tests skill

---

## Executive Summary

Researched 3 reference test files to identify fingerprintx testing patterns:

1. **mongodb_test.go** (603 lines, 24 test cases) - **GOLD STANDARD for unit tests**
2. **mysql_test.go** (57 lines, 1 test case) - Integration test requiring Docker
3. **postgresql_test.go** (59 lines, 1 test case) - Integration test requiring Docker

**Key Finding**: mongodb_test.go demonstrates comprehensive unit testing with table-driven tests, inline mock builders, and systematic edge case coverage. MySQL/PostgreSQL files show integration test pattern (separate concern).

---

## File Analysis

### 1. mongodb_test.go - Gold Standard Unit Tests

**Location**: `modules/fingerprintx/pkg/plugins/services/mongodb/mongodb_test.go`

**Statistics**:
- 603 lines
- 6 test functions
- 24 total test cases
- 2 imports (encoding/binary, testing)
- 0 external dependencies

**Test Functions**:

| Function                       | Purpose                       | Cases | Lines     |
| ------------------------------ | ----------------------------- | ----- | --------- |
| `TestParseBSONInt32`           | Int32 extraction from BSON    | 7     | 23-189    |
| `TestParseBSONString`          | String extraction from BSON   | 4     | 192-263   |
| `TestCheckMongoDBResponse`     | OP_REPLY validation           | 4     | 266-385   |
| `TestCheckMongoDBMsgResponse`  | OP_MSG validation             | 3     | 388-475   |
| `TestBuildMongoDBQuery`        | OP_QUERY construction         | 3     | 478-534   |
| `TestBuildMongoDBMsgQuery`     | OP_MSG query construction     | 3     | 537-602   |

**Patterns Identified**:

1. **Table-Driven Test Structure** (all 6 functions)
2. **Inline BSON Document Builders** (anonymous functions)
3. **Systematic Edge Case Coverage** (empty, truncated, wrong type, missing field)
4. **Byte-Level Verification** (for message building tests)
5. **Dual-Output Testing** (value + found boolean)

### 2. mysql_test.go - Integration Test Pattern

**Location**: `modules/fingerprintx/pkg/plugins/services/mysql/mysql_test.go`

**Statistics**:
- 57 lines
- 1 test function (`TestMySQL`)
- 1 test case
- Uses `github.com/ory/dockertest/v3`

**Purpose**: Integration test that spins up actual MySQL 5.7.39 container

**Pattern**:

```go
testcases := []test.Testcase{
	{
		Description: "mysql",
		Port:        3306,
		Protocol:    plugins.TCP,
		Expected: func(res *plugins.Service) bool {
			return res != nil
		},
		RunConfig: dockertest.RunOptions{
			Repository: "mysql",
			Tag:        "5.7.39",
			Env:        []string{"MYSQL_ROOT_PASSWORD=my-secret-pw"},
		},
	},
}
```

**Key Difference**: This is an **integration test**, not a unit test. It requires Docker and external services.

### 3. postgresql_test.go - Integration Test Pattern

**Location**: `modules/fingerprintx/pkg/plugins/services/postgresql/postgresql_test.go`

**Statistics**:
- 59 lines
- 1 test function (`TestPostgreSQL`)
- 1 test case
- Uses `github.com/ory/dockertest/v3`

**Purpose**: Integration test that spins up actual PostgreSQL container

**Pattern**: Identical to mysql_test.go structure

---

## Discovered Patterns

### Pattern 1: Table-Driven Test Structure

**Found in**: All 6 mongodb_test.go functions

```go
func TestFunctionName(t *testing.T) {
	tests := []struct {
		name     string
		// input fields
		// expected output fields
	}{
		{name: "test case 1", /* ... */},
		{name: "test case 2", /* ... */},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// call function under test
			// verify outputs
		})
	}
}
```

**Benefits**:
- Easy to add new test cases
- Clear, descriptive test names
- Isolated execution
- Parallel execution possible

### Pattern 2: Inline Mock Builders

**Found in**: mongodb_test.go (BSON document construction)

```go
bsonDoc: func() []byte {
	doc := make([]byte, 0, 64)
	sizeBuf := make([]byte, 4)
	doc = append(doc, sizeBuf...)
	doc = append(doc, 0x10)  // Type: int32
	// ... build document ...
	binary.LittleEndian.PutUint32(doc[0:4], uint32(len(doc)))
	return doc
}(),
```

**Benefits**:
- Self-contained test cases
- No external builder functions
- Easy to create variations with specific flaws
- Explicit byte structure visible in test

### Pattern 3: Systematic Edge Case Coverage

**Found in**: TestParseBSONInt32, TestParseBSONString

**Edge cases tested**:
- ✅ Valid input (happy path)
- ✅ Empty document (`[]byte{0x05, 0x00, 0x00, 0x00, 0x00}`)
- ✅ Truncated document (`[]byte{0x01, 0x02}`)
- ✅ Wrong type (field exists but wrong format)
- ✅ Missing field (key not found)
- ✅ Multiple fields (target field in middle of document)
- ✅ Zero value (valid zero)

### Pattern 4: Byte-Level Message Verification

**Found in**: TestBuildMongoDBQuery, TestBuildMongoDBMsgQuery

**Verifications performed**:

```go
// 1. Check minimum length
if len(query) < 16 {
	t.Fatal("Query too short")
}

// 2. Verify messageLength field matches actual length
messageLength := binary.LittleEndian.Uint32(query[0:4])
if messageLength != uint32(len(query)) {
	t.Errorf("Message length mismatch: header says %d, actual %d",
		messageLength, len(query))
}

// 3. Verify request ID
requestID := binary.LittleEndian.Uint32(query[4:8])
if requestID != tt.requestID {
	t.Errorf("Request ID mismatch: got %d, want %d", requestID, tt.requestID)
}

// 4-N. Verify other protocol fields...
```

### Pattern 5: Dual-Output Testing

**Found in**: TestParseBSONInt32

```go
value, found := parseBSONInt32(tt.bsonDoc, tt.key)
if found != tt.found {
	t.Errorf("parseBSONInt32() found = %v, want %v", found, tt.found)
}
if value != tt.expected {
	t.Errorf("parseBSONInt32() value = %v, want %v", value, tt.expected)
}
```

**Pattern**: Functions return `(value, found bool)` tuple. Tests verify BOTH outputs.

---

## Naming Conventions

### Test File Names

- **Pattern**: `{service}_test.go`
- **Examples**: `mongodb_test.go`, `mysql_test.go`, `postgresql_test.go`

### Test Function Names

- **Pattern**: `Test{FunctionName}` or `Test{Concept}`
- **Examples**:
  - `TestParseBSONInt32` - tests `parseBSONInt32()` function
  - `TestCheckMongoDBResponse` - tests `checkMongoDBResponse()` function
  - `TestMySQL` - general plugin test

### Test Case Names (in table-driven tests)

- **Pattern**: Short, descriptive phrases (lowercase)
- **Examples**:
  - `"valid int32 value"`
  - `"key not found"`
  - `"document too short"`
  - `"wrong type (string instead of int32)"`
  - `"multiple fields with target int32"`

---

## Directory Structure

```
modules/fingerprintx/pkg/plugins/services/
├── mongodb/
│   ├── mongodb.go           # Implementation
│   └── mongodb_test.go      # Unit tests (603 lines, 24 cases)
├── mysql/
│   ├── mysql.go             # Implementation
│   └── mysql_test.go        # Integration test (Docker)
├── postgresql/
│   ├── postgresql.go        # Implementation
│   └── postgresql_test.go   # Integration test (Docker)
├── ftp/
│   ├── ftp.go
│   └── ftp_test.go
└── [other services]/
```

**Convention**: Test files in same package/directory as implementation

---

## Import Patterns

### Unit Tests (mongodb_test.go)

```go
import (
	"encoding/binary"
	"testing"
)
```

**Minimal imports**: Only standard library

### Integration Tests (mysql_test.go, postgresql_test.go)

```go
import (
	"testing"

	"github.com/ory/dockertest/v3"
	"github.com/praetorian-inc/fingerprintx/pkg/plugins"
	"github.com/praetorian-inc/fingerprintx/pkg/test"
)
```

**External dependencies**: Docker test infrastructure

---

## Error Handling Patterns

### Boolean + Error Return

```go
valid, err := checkMongoDBResponse(tt.response, tt.expectedRequestID)
if valid != tt.wantValid {
	t.Errorf("checkMongoDBResponse() valid = %v, want %v", valid, tt.wantValid)
}
if (err != nil) != tt.wantErr {
	t.Errorf("checkMongoDBResponse() error = %v, wantErr %v", err, tt.wantErr)
}
```

**Pattern**: Compare `(err != nil)` boolean with expected `tt.wantErr` boolean

---

## Anti-Patterns NOT Found

✅ **No integration tests in unit test files**
- mysql/postgresql use separate files with Docker dependencies
- mongodb_test.go is pure unit tests

✅ **No testing of unexported implementation details**
- Tests focus on exported parsing/validation functions

✅ **No skipped edge cases**
- Systematic coverage of empty, truncated, wrong type, missing field

✅ **No repetitive test functions**
- Uses table-driven approach, not individual functions per case

✅ **No hardcoded "magic" test data**
- All test data constructed programmatically with clear intent

---

## Recommendations for Skill Content

Based on codebase research:

1. **Emphasize mongodb_test.go as gold standard** (603 lines, comprehensive)
2. **Recommend table-driven test structure** (all 6 functions use it)
3. **Guide inline mock construction** (anonymous functions with explicit byte building)
4. **Mandate edge case coverage** (empty, truncated, wrong type, missing field, multiple fields)
5. **Show byte-level verification** for message building tests
6. **Clarify unit vs integration** (mongodb = unit, mysql/postgresql = integration)
7. **Use standard testing package** (no testify required, though could be added)
8. **Test dual outputs** (value + found boolean pattern)

---

## Code Examples for Skill

### Example 1: Table-Driven Test Structure

**Source**: `mongodb_test.go` - `func TestParseBSONInt32`

```go
tests := []struct {
	name     string
	bsonDoc  []byte
	key      string
	expected int32
	found    bool
}{
	{
		name:     "valid int32 value",
		bsonDoc:  buildValidDoc(),
		key:      "maxWireVersion",
		expected: 17,
		found:    true,
	},
	{
		name:     "key not found",
		bsonDoc:  buildValidDoc(),
		key:      "missing",
		expected: 0,
		found:    false,
	},
}

for _, tt := range tests {
	t.Run(tt.name, func(t *testing.T) {
		value, found := parseBSONInt32(tt.bsonDoc, tt.key)
		if found != tt.found {
			t.Errorf("parseBSONInt32() found = %v, want %v", found, tt.found)
		}
		if value != tt.expected {
			t.Errorf("parseBSONInt32() value = %v, want %v", value, tt.expected)
		}
	})
}
```

### Example 2: Inline Mock Construction

**Source**: `mongodb_test.go` - `TestCheckMongoDBResponse`

```go
response: func() []byte {
	resp := make([]byte, 0, 100)
	lengthBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(lengthBuf, 60)
	resp = append(resp, lengthBuf...)
	// ... build rest of response ...
	binary.LittleEndian.PutUint32(resp[0:4], uint32(len(resp)))
	return resp
}(),
```

### Example 3: Byte-Level Verification

**Source**: `mongodb_test.go` - `TestBuildMongoDBQuery`

```go
query := buildMongoDBQuery(tt.command, tt.requestID)

messageLength := binary.LittleEndian.Uint32(query[0:4])
if messageLength != uint32(len(query)) {
	t.Errorf("Message length mismatch: header says %d, actual %d",
		messageLength, len(query))
}

opCode := binary.LittleEndian.Uint32(query[12:16])
if opCode != OP_QUERY {
	t.Errorf("OpCode should be OP_QUERY (2004), got %d", opCode)
}
```

---

## Statistics Summary

| File                 | Lines | Functions | Cases | Type        | Dependencies       |
| -------------------- | ----- | --------- | ----- | ----------- | ------------------ |
| mongodb_test.go      | 603   | 6         | 24    | Unit        | Standard lib only  |
| mysql_test.go        | 57    | 1         | 1     | Integration | dockertest         |
| postgresql_test.go   | 59    | 1         | 1     | Integration | dockertest         |

**Conclusion**: mongodb_test.go is the **authoritative reference** for unit test patterns in fingerprintx plugins.
