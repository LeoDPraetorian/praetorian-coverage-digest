# Annotated mongodb_test.go Example

**Source**: `modules/fingerprintx/pkg/plugins/services/mongodb/mongodb_test.go`

This file demonstrates comprehensive unit testing patterns for fingerprintx plugins. It contains 24 test cases across 6 test functions.

---

## File Structure

```go
package mongodb

import (
	"encoding/binary"
	"testing"
)
```

**Observations**:

- **Package**: Same as implementation (`package mongodb`)
- **Imports**: Minimal - only `encoding/binary` and `testing`
- **No external test frameworks**: Uses standard `testing` package
- **No testify/assert**: Uses `t.Errorf()` directly (could be enhanced with testify)

---

## Test 1: TestParseBSONInt32 (Lines 23-189)

**Purpose**: Test int32 extraction from BSON documents

### Structure

```go
func TestParseBSONInt32(t *testing.T) {
	tests := []struct {
		name     string
		bsonDoc  []byte
		key      string
		expected int32
		found    bool
	}{
		// Test cases...
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
}
```

**Pattern**: Classic table-driven test with struct containing:

- `name` - descriptive test case name
- Input parameters (`bsonDoc`, `key`)
- Expected outputs (`expected`, `found`)

### Test Cases (7 total)

| Case                 | Purpose                                    | Line |
| -------------------- | ------------------------------------------ | ---- |
| "valid int32 value"  | Happy path - extract maxWireVersion=17     | 32   |
| "zero value"         | Edge case - valid zero value               | 59   |
| "key not found"      | Field doesn't exist in document            | 79   |
| "empty document"     | Minimal valid BSON document (5 bytes)      | 99   |
| "document too short" | Truncated data (2 bytes)                   | 106  |
| "wrong type"         | Field exists but is string, not int32      | 113  |
| "multiple fields"    | Document with 3 fields, extract middle one | 136  |

### BSON Document Construction Pattern

**Inline builder functions**:

```go
bsonDoc: func() []byte {
	doc := make([]byte, 0, 64)
	sizeBuf := make([]byte, 4)
	doc = append(doc, sizeBuf...)      // Placeholder for size
	doc = append(doc, 0x10)            // Type: int32
	doc = append(doc, []byte("maxWireVersion")...)
	doc = append(doc, 0x00)            // Null terminator
	valBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(valBuf, 17)
	doc = append(doc, valBuf...)
	doc = append(doc, 0x00)            // Document terminator
	binary.LittleEndian.PutUint32(doc[0:4], uint32(len(doc)))
	return doc
}(),
```

**Benefits**:

- Self-contained - no external builder functions needed
- Explicit - shows exact byte structure
- Flexible - easy to create variations with flaws

---

## Test 2: TestParseBSONString (Lines 192-263)

**Purpose**: Test string extraction from BSON documents

### Test Cases (4 total)

| Case                 | Purpose                 | Line |
| -------------------- | ----------------------- | ---- |
| "valid string value" | Extract msg="isdbgrid"  | 200  |
| "version string"     | Extract version="8.0.4" | 221  |
| "key not found"      | Field doesn't exist     | 242  |
| "empty document"     | Empty input (edge case) | 248  |

**Differences from TestParseBSONInt32**:

- Uses simpler struct (no `found` boolean, just empty string for not found)
- Fewer test cases (4 vs 7) but still covers edge cases
- No "wrong type" test case (could be added)

---

## Test 3: TestCheckMongoDBResponse (Lines 266-385)

**Purpose**: Test OP_REPLY response validation

### Test Cases (4 total)

| Case                    | Purpose                                      | Line | wantValid | wantErr |
| ----------------------- | -------------------------------------------- | ---- | --------- | ------- |
| "valid OP_REPLY"        | Well-formed response with correct request ID | 275  | true      | false   |
| "response too short"    | Truncated data (3 bytes)                     | 313  | false     | true    |
| "wrong opcode"          | OP_MSG instead of OP_REPLY                   | 320  | false     | true    |
| "mismatched request ID" | responseTo doesn't match expectedRequestID   | 347  | false     | true    |

### Mock Response Construction

**Complete OP_REPLY builder** (Lines 276-307):

```go
response: func() []byte {
	resp := make([]byte, 0, 100)

	// Message header (16 bytes)
	lengthBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(lengthBuf, 60)
	resp = append(resp, lengthBuf...)

	reqIDBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(reqIDBuf, 123)
	resp = append(resp, reqIDBuf...)

	respToBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(respToBuf, 100)  // Expected request ID
	resp = append(resp, respToBuf...)

	opcodeBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(opcodeBuf, OP_REPLY)  // Opcode = 1
	resp = append(resp, opcodeBuf...)

	// OP_REPLY fields (20 bytes)
	resp = append(resp, 0x00, 0x00, 0x00, 0x00)  // Response flags
	resp = append(resp, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)  // CursorID
	resp = append(resp, 0x00, 0x00, 0x00, 0x00)  // StartingFrom
	resp = append(resp, 0x01, 0x00, 0x00, 0x00)  // NumberReturned

	// Minimal BSON document (5 bytes)
	resp = append(resp, 0x05, 0x00, 0x00, 0x00, 0x00)

	// Update length field
	binary.LittleEndian.PutUint32(resp[0:4], uint32(len(resp)))
	return resp
}(),
```

**Total size**: 36 bytes (header) + 5 bytes (BSON) = 41 bytes

---

## Test 4: TestCheckMongoDBMsgResponse (Lines 388-475)

**Purpose**: Test OP_MSG response validation

### Test Cases (3 total)

| Case                 | Purpose                     | Line | wantValid | wantErr |
| -------------------- | --------------------------- | ---- | --------- | ------- |
| "valid OP_MSG"       | Well-formed OP_MSG response | 397  | true      | false   |
| "response too short" | Truncated data (2 bytes)    | 430  | false     | true    |
| "wrong section kind" | Section kind 1 instead of 0 | 437  | false     | true    |

**Notable**: OP_MSG has different structure than OP_REPLY:

- Opcode: 2013 (vs 1 for OP_REPLY)
- Has `flagBits` field (4 bytes)
- Has section kind (1 byte) - must be 0 for body
- Minimal size: 21 bytes (vs 36 for OP_REPLY)

---

## Test 5: TestBuildMongoDBQuery (Lines 478-534)

**Purpose**: Test OP_QUERY message construction

### Test Cases (3 total)

All test cases use the same structure with different commands:

| Command     | Request ID | Line |
| ----------- | ---------- | ---- |
| "hello"     | 1          | 485  |
| "isMaster"  | 2          | 490  |
| "buildInfo" | 100        | 495  |

### Verification Approach

```go
for _, tt := range tests {
	t.Run(tt.name, func(t *testing.T) {
		query := buildMongoDBQuery(tt.command, tt.requestID)

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

		// 4. Verify responseTo is 0 (this is a query, not a response)
		responseTo := binary.LittleEndian.Uint32(query[8:12])
		if responseTo != 0 {
			t.Errorf("ResponseTo should be 0, got %d", responseTo)
		}

		// 5. Verify opCode is OP_QUERY (2004)
		opCode := binary.LittleEndian.Uint32(query[12:16])
		if opCode != OP_QUERY {
			t.Errorf("OpCode should be OP_QUERY (2004), got %d", opCode)
		}
	})
}
```

**Pattern**: Byte-level verification of message structure, not just "does it work?"

---

## Test 6: TestBuildMongoDBMsgQuery (Lines 537-602)

**Purpose**: Test OP_MSG query construction

### Test Cases (3 total)

Same commands as Test 5, but building OP_MSG format:

| Command     | Request ID | Line |
| ----------- | ---------- | ---- |
| "hello"     | 3          | 544  |
| "isMaster"  | 4          | 549  |
| "buildInfo" | 101        | 554  |

**Additional verification** (vs OP_QUERY):

- OpCode must be OP_MSG (2013)
- Section kind must be 0 (byte at offset 20)

---

## Key Patterns Identified

### 1. Table-Driven Test Structure

**Every test function uses this pattern**:

```go
func TestFunctionName(t *testing.T) {
	tests := []struct {
		name string
		// inputs
		// expected outputs
	}{
		// test cases
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// call function
			// verify outputs
		})
	}
}
```

**Benefits**:

- Easy to add new test cases
- Clear test case names
- Parallel execution possible with `t.Parallel()`
- Isolation between test cases

### 2. Inline BSON Document Builders

**Pattern**:

```go
bsonDoc: func() []byte {
	// Build document inline
	return doc
}(),
```

**Why**:

- Self-contained test cases
- No external builder functions needed
- Easy to create variations with specific flaws

### 3. Edge Case Coverage

**Every parsing/validation function tests**:

- ✅ Valid input (happy path)
- ✅ Empty/minimal input
- ✅ Truncated input (too short)
- ✅ Wrong type (field exists but wrong format)
- ✅ Missing field
- ✅ Multiple fields (target in middle)

### 4. Byte-Level Verification

**Message building tests verify**:

- Total message length
- Length field matches actual length
- Request ID placement
- Opcode correctness
- Protocol-specific fields (flags, section kind, etc.)

### 5. Consistent Error Checking

```go
if (err != nil) != tt.wantErr {
	t.Errorf("function() error = %v, wantErr %v", err, tt.wantErr)
}
```

**Pattern**: Compare boolean `(err != nil)` with expected `wantErr` boolean

---

## Anti-Patterns NOT Present

✅ **No integration tests requiring Docker/services**
✅ **No testing of unexported implementation details** (only tests exported parsing functions)
✅ **No skipped edge cases**
✅ **No repetitive test functions** (uses table-driven approach)
✅ **No hardcoded "magic" test data** (all constructed programmatically with clear intent)

---

## Recommendations for New Plugin Tests

Based on mongodb_test.go patterns:

1. **Use table-driven tests** for all similar test cases
2. **Build test data inline** with anonymous functions
3. **Test edge cases systematically**: empty, truncated, wrong type, missing field
4. **Verify byte-level structure** for message building functions
5. **Use descriptive test case names**: "valid int32 value", "key not found", etc.
6. **Keep unit tests separate** from integration tests (no Docker dependencies)
7. **Test both success and failure paths** with `wantErr` boolean
8. **Verify length fields** match actual message lengths

---

## File Statistics

- **Total lines**: 603
- **Test functions**: 6
- **Test cases**: 24 (7 + 4 + 4 + 3 + 3 + 3)
- **Imports**: 2 (encoding/binary, testing)
- **No external dependencies**: Pure Go standard library

This file serves as the **gold standard** for fingerprintx plugin unit testing.
