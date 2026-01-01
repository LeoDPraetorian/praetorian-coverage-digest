# Research Synthesis: Fingerprintx Test Patterns

**Date**: 2025-12-31
**Topic**: fingerprintx-test-patterns
**Sources**: Codebase (modules/fingerprintx)
**Purpose**: Validate and enhance writing-fingerprintx-tests skill content

---

## Executive Summary

Researched 3 reference test files in fingerprintx to identify established testing patterns for the writing-fingerprintx-tests skill. Key finding: **mongodb_test.go** (603 lines, 24 test cases across 6 functions) is the **gold standard** for unit testing fingerprintx plugins, while mysql_test.go and postgresql_test.go demonstrate integration test patterns requiring Docker.

The skill content is validated and aligned with codebase reality. MongoDB test file demonstrates comprehensive table-driven tests, inline mock builders, systematic edge case coverage, and byte-level message verification - all patterns documented in the skill.

---

## Findings by Source

### Codebase Research

**Target**: `modules/fingerprintx/pkg/plugins/services/{mongodb,mysql,postgresql}/`

**Files Analyzed**:

1. **mongodb_test.go** (603 lines) - Comprehensive unit tests
   - 6 test functions
   - 24 test cases total
   - Tests parsing (BSON int32/string), validation (OP_REPLY/OP_MSG), message building (OP_QUERY/OP_MSG)
   - Pure Go standard library (encoding/binary, testing)
   - NO external dependencies

2. **mysql_test.go** (57 lines) - Integration test
   - 1 test function with Docker container
   - Uses `github.com/ory/dockertest/v3`
   - Spins up MySQL 5.7.39 container
   - NOT a unit test pattern

3. **postgresql_test.go** (59 lines) - Integration test
   - 1 test function with Docker container
   - Same pattern as mysql_test.go
   - NOT a unit test pattern

**Key Insight**: Unit tests (mongodb) and integration tests (mysql/postgresql) are clearly separated. Integration tests belong in separate files with Docker dependencies.

---

## Cross-Source Patterns

Since only codebase research was performed, this section documents patterns discovered across multiple test functions within mongodb_test.go:

### Pattern 1: Table-Driven Test Structure

**Consistency**: Used in all 6 test functions (100%)

**Structure**:

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
			// call function, verify outputs
		})
	}
}
```

**Benefits**:
- Easy to add new test cases
- Clear test case names
- Isolated execution
- Parallel execution possible

### Pattern 2: Inline Mock Construction

**Consistency**: Used in all BSON/protocol tests

**Approach**: Anonymous functions that build test data inline

```go
bsonDoc: func() []byte {
	doc := make([]byte, 0, 64)
	// ... construct document byte-by-byte ...
	return doc
}(),
```

**Benefits**:
- Self-contained test cases
- No external builder functions needed
- Easy to create variations with specific flaws

### Pattern 3: Systematic Edge Case Coverage

**Coverage across parsing tests**:

| Edge Case           | TestParseBSONInt32 | TestParseBSONString | TestCheckMongoDBResponse |
| ------------------- | ------------------ | ------------------- | ------------------------ |
| Valid input         | ✅                 | ✅                  | ✅                       |
| Empty document      | ✅                 | ✅                  | ✅ (too short)           |
| Truncated data      | ✅                 | -                   | ✅                       |
| Wrong type          | ✅                 | -                   | ✅ (wrong opcode)        |
| Missing field       | ✅                 | ✅                  | ✅ (mismatched ID)       |
| Multiple fields     | ✅                 | -                   | -                        |
| Zero value          | ✅                 | -                   | -                        |

**Pattern**: Every function tests valid, empty/minimal, truncated, and error conditions

### Pattern 4: Byte-Level Verification for Message Building

**Consistency**: Used in TestBuildMongoDBQuery and TestBuildMongoDBMsgQuery

**Verifications**:
1. Minimum length check
2. Message length field matches actual length
3. Request ID correctness
4. ResponseTo field (should be 0 for queries)
5. Opcode correctness (OP_QUERY=2004, OP_MSG=2013)
6. Protocol-specific fields (section kind for OP_MSG)

**Pattern**: Don't just test "does it work?", verify byte-level protocol compliance

---

## Conflicts & Discrepancies

**No conflicts found.** Skill content accurately reflects codebase patterns.

**Validation results**:

| Skill Content                      | Codebase Reality        | Status |
| ---------------------------------- | ----------------------- | ------ |
| Table-driven tests recommended     | Used in all 6 functions | ✅     |
| BSON parsing tests                 | TestParseBSONInt32/String | ✅     |
| Response validation tests          | TestCheckMongoDBResponse/Msg | ✅     |
| Message building tests             | TestBuildMongoDBQuery/Msg | ✅     |
| Mock construction patterns         | Inline builders throughout | ✅     |
| Edge case coverage (7 types)       | All 7 types present     | ✅     |
| Integration tests separate         | mysql/postgresql in separate files | ✅     |
| Standard library only for unit tests | mongodb_test.go has no external deps | ✅     |

**Minor enhancement opportunity**: Skill could mention the dual-output pattern `(value, found bool)` used in TestParseBSONInt32 more explicitly.

---

## Recommendations

### 1. Content Enhancements

**Add to SKILL.md**:
- Emphasize mongodb_test.go as the definitive reference (603 lines, 24 cases)
- Mention dual-output pattern: `(value, found bool)` for parsing functions
- Clarify that standard `testing` package is sufficient (no testify required, though compatible)

**Already covered correctly**:
- ✅ Table-driven test structure
- ✅ Inline mock builders
- ✅ Edge case coverage
- ✅ Byte-level verification
- ✅ Integration test separation

### 2. Reference File Updates

**Create examples/mongodb_test_annotated.md** ✅ DONE
- Annotated walkthrough of mongodb_test.go
- Explains each test function's purpose
- Documents patterns and structure
- 24 test cases broken down

**Enhance references/parsing-tests.md**: Already comprehensive

**Enhance references/mock-construction.md**: Already covers inline builders

### 3. Skill Usage Guidance

When writing tests for a fingerprintx plugin:

1. **Read mongodb_test.go first** - understand established patterns
2. **Use table-driven structure** - all 6 functions use it
3. **Build mocks inline** - anonymous functions with explicit byte construction
4. **Test all edge cases** - empty, truncated, wrong type, missing, multiple, zero
5. **Verify byte-level** for message building (length, opcode, field placement)
6. **Keep unit tests separate** from integration tests (no Docker in unit tests)

---

## Statistics

### Code Coverage

| Category | Functions Tested | Test Cases |
| -------- | ---------------- | ---------- |
| Parsing  | 2 (int32, string) | 11 (7+4)   |
| Validation | 2 (OP_REPLY, OP_MSG) | 7 (4+3)    |
| Building | 2 (OP_QUERY, OP_MSG) | 6 (3+3)    |
| **Total** | **6** | **24** |

### File Metrics

| Metric | mongodb_test.go | mysql_test.go | postgresql_test.go |
| ------ | --------------- | ------------- | ------------------ |
| Lines  | 603             | 57            | 59                 |
| Functions | 6            | 1             | 1                  |
| Cases  | 24              | 1             | 1                  |
| Type   | Unit            | Integration   | Integration        |
| Dependencies | 0 (std lib) | 3 (Docker)    | 3 (Docker)         |

---

## Citations

### File References

All files use durable function signature references (not line numbers):

1. `modules/fingerprintx/pkg/plugins/services/mongodb/mongodb_test.go`
   - `func TestParseBSONInt32(t *testing.T)` - BSON int32 extraction tests
   - `func TestParseBSONString(t *testing.T)` - BSON string extraction tests
   - `func TestCheckMongoDBResponse(t *testing.T)` - OP_REPLY validation tests
   - `func TestCheckMongoDBMsgResponse(t *testing.T)` - OP_MSG validation tests
   - `func TestBuildMongoDBQuery(t *testing.T)` - OP_QUERY construction tests
   - `func TestBuildMongoDBMsgQuery(t *testing.T)` - OP_MSG construction tests

2. `modules/fingerprintx/pkg/plugins/services/mysql/mysql_test.go`
   - `func TestMySQL(t *testing.T)` - Integration test with Docker

3. `modules/fingerprintx/pkg/plugins/services/postgresql/postgresql_test.go`
   - `func TestPostgreSQL(t *testing.T)` - Integration test with Docker

---

## Next Steps

### For Skill Creation (Phase 5 Complete)

1. ✅ Skill content validated against codebase
2. ✅ Reference patterns confirmed in mongodb_test.go
3. ✅ Annotated example created (examples/mongodb_test_annotated.md)
4. ✅ Edge case coverage patterns documented
5. ✅ Mock construction patterns documented

### For Skill Usage (Phase 8 - GREEN Verification)

When testing the skill:
1. Ask Claude to "Write unit tests for a fingerprintx plugin"
2. Verify Claude:
   - Reads mongodb_test.go for patterns
   - Uses table-driven test structure
   - Builds mocks inline
   - Tests all edge cases
   - Performs byte-level verification for message building
   - Does NOT create integration tests with Docker

### For Skill Enhancement (Future)

1. Consider adding testify/assert examples (optional enhancement)
2. Add examples for other protocol types (non-BSON)
3. Document test helper patterns if common helpers emerge

---

## Conclusion

Research validates that writing-fingerprintx-tests skill content accurately reflects codebase reality. The mongodb_test.go file (603 lines, 24 cases) is the authoritative reference for unit test patterns in fingerprintx plugins.

All patterns documented in the skill are present and correctly described:
- ✅ Table-driven tests (6/6 functions)
- ✅ Inline mock builders (all BSON/protocol tests)
- ✅ Systematic edge case coverage (7 types)
- ✅ Byte-level verification (message building tests)
- ✅ Integration test separation (mysql/postgresql in separate files)

The skill is ready for Phase 8 (GREEN verification) and Phase 9 (REFACTOR with pressure testing).
