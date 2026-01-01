# Mock Response Construction

**Building realistic mock responses for protocol testing without live services.**

## Why Mock Responses?

**Unit tests should NOT require live services.** Mock responses enable:

- Fast test execution (no network delays)
- Deterministic tests (no service failures or timeouts)
- Comprehensive edge case testing (malformed responses, errors)
- CI/CD compatibility (no external dependencies)

## MongoDB OP_REPLY Mock

### Minimal Valid OP_REPLY (36+ bytes)

```go
// buildMockOPReply creates a minimal valid OP_REPLY response
//
// OP_REPLY structure:
// - Message header (16 bytes)
//   - messageLength (4 bytes)
//   - responseID (4 bytes)
//   - responseTo (4 bytes) - must match request ID
//   - opCode (4 bytes) - 1 for OP_REPLY
// - OP_REPLY fields (20 bytes)
//   - responseFlags (4 bytes)
//   - cursorID (8 bytes)
//   - startingFrom (4 bytes)
//   - numberReturned (4 bytes)
// - BSON documents (variable)
func buildMockOPReply(requestID uint32, bsonDoc []byte) []byte {
    if bsonDoc == nil {
        bsonDoc = []byte{5, 0, 0, 0, 0} // minimal empty BSON document
    }

    totalLen := 36 + len(bsonDoc)
    msg := make([]byte, totalLen)

    // Message header
    binary.LittleEndian.PutUint32(msg[0:4], uint32(totalLen)) // messageLength
    binary.LittleEndian.PutUint32(msg[4:8], 1)                // responseID (arbitrary)
    binary.LittleEndian.PutUint32(msg[8:12], requestID)       // responseTo (matches request)
    binary.LittleEndian.PutUint32(msg[12:16], 1)              // opCode: OP_REPLY

    // OP_REPLY fields
    binary.LittleEndian.PutUint32(msg[16:20], 0)  // responseFlags (0 = success)
    binary.LittleEndian.PutUint64(msg[20:28], 0)  // cursorID (0 = no cursor)
    binary.LittleEndian.PutUint32(msg[28:32], 0)  // startingFrom
    binary.LittleEndian.PutUint32(msg[32:36], 1)  // numberReturned (1 document)

    // BSON documents
    copy(msg[36:], bsonDoc)

    return msg
}
```

### Usage in Tests

```go
func TestParseOPReply(t *testing.T) {
    requestID := uint32(42)

    // Build BSON document with version info
    versionDoc := buildBSONWithString("version", "4.4.0")

    // Create mock OP_REPLY response
    response := buildMockOPReply(requestID, versionDoc)

    // Test parsing function
    version, err := parseVersionFromOPReply(response)
    assert.NoError(t, err)
    assert.Equal(t, "4.4.0", version)
}
```

## MongoDB OP_MSG Mock

### Minimal Valid OP_MSG (21+ bytes)

```go
// buildMockOPMsg creates a minimal valid OP_MSG response
//
// OP_MSG structure:
// - Message header (16 bytes)
//   - messageLength (4 bytes)
//   - responseID (4 bytes)
//   - responseTo (4 bytes)
//   - opCode (4 bytes) - 2013 for OP_MSG
// - OP_MSG fields (5+ bytes)
//   - flagBits (4 bytes)
//   - sections (variable)
//     - kind (1 byte) - 0 for body
//     - BSON document (variable)
func buildMockOPMsg(requestID uint32, bsonDoc []byte) []byte {
    if bsonDoc == nil {
        bsonDoc = []byte{5, 0, 0, 0, 0}
    }

    totalLen := 21 + len(bsonDoc)
    msg := make([]byte, totalLen)

    // Message header
    binary.LittleEndian.PutUint32(msg[0:4], uint32(totalLen)) // messageLength
    binary.LittleEndian.PutUint32(msg[4:8], 1)                // responseID
    binary.LittleEndian.PutUint32(msg[8:12], requestID)       // responseTo
    binary.LittleEndian.PutUint32(msg[12:16], 2013)           // opCode: OP_MSG

    // OP_MSG fields
    binary.LittleEndian.PutUint32(msg[16:20], 0)  // flagBits (0 = standard response)
    msg[20] = 0                                    // section kind: body (type 0)

    // BSON document
    copy(msg[21:], bsonDoc)

    return msg
}
```

## Generic Protocol Mock Builder

### Template for Custom Protocols

```go
// MockResponseBuilder provides flexible mock construction
type MockResponseBuilder struct {
    magic      []byte
    version    byte
    msgType    byte
    statusCode uint16
    payload    []byte
    checksum   bool
}

func NewMockResponse() *MockResponseBuilder {
    return &MockResponseBuilder{
        magic:      []byte{0x12, 0x34},
        version:    1,
        msgType:    0x01,
        statusCode: 200,
        payload:    []byte{},
        checksum:   false,
    }
}

func (b *MockResponseBuilder) WithStatusCode(code uint16) *MockResponseBuilder {
    b.statusCode = code
    return b
}

func (b *MockResponseBuilder) WithPayload(payload []byte) *MockResponseBuilder {
    b.payload = payload
    return b
}

func (b *MockResponseBuilder) WithChecksum() *MockResponseBuilder {
    b.checksum = true
    return b
}

func (b *MockResponseBuilder) Build() []byte {
    // Calculate total length
    headerLen := 2 + 1 + 1 + 2 + 4 // magic + version + type + status + payload length
    totalLen := headerLen + len(b.payload)
    if b.checksum {
        totalLen += 4 // add checksum field
    }

    msg := make([]byte, totalLen)

    // Build header
    copy(msg[0:2], b.magic)
    msg[2] = b.version
    msg[3] = b.msgType
    binary.BigEndian.PutUint16(msg[4:6], b.statusCode)
    binary.BigEndian.PutUint32(msg[6:10], uint32(len(b.payload)))

    // Add payload
    copy(msg[10:], b.payload)

    // Add checksum if requested
    if b.checksum {
        checksumVal := calculateChecksum(msg[:len(msg)-4])
        binary.BigEndian.PutUint32(msg[len(msg)-4:], checksumVal)
    }

    return msg
}

// Usage in tests:
// successResponse := NewMockResponse().WithPayload([]byte("OK")).Build()
// errorResponse := NewMockResponse().WithStatusCode(500).Build()
// validChecksumResponse := NewMockResponse().WithChecksum().Build()
```

## Mock Strategy Patterns

### Pattern 1: Default + Variations

Start with a valid default, then create variations with specific flaws:

```go
func defaultMockResponse(requestID uint32) []byte {
    return buildMockOPReply(requestID, validBSONDoc())
}

func tooShortResponse() []byte {
    return []byte{1, 2, 3} // truncated
}

func wrongOpcodeResponse(requestID uint32) []byte {
    resp := defaultMockResponse(requestID)
    binary.LittleEndian.PutUint32(resp[12:16], 999) // invalid opcode
    return resp
}

func mismatchedRequestIDResponse(requestID uint32) []byte {
    return buildMockOPReply(requestID+1, validBSONDoc()) // different request ID
}
```

### Pattern 2: Parameterized Mock Factory

Create a factory that accepts parameters for flexibility:

```go
type MockResponseParams struct {
    RequestID  uint32
    Opcode     uint32
    StatusOK   bool
    BSONDoc    []byte
    Truncate   int // if > 0, truncate to this length
}

func buildMockWithParams(params MockResponseParams) []byte {
    if params.BSONDoc == nil {
        params.BSONDoc = validBSONDoc()
    }

    msg := buildMockOPReply(params.RequestID, params.BSONDoc)

    // Override opcode if specified
    if params.Opcode != 0 {
        binary.LittleEndian.PutUint32(msg[12:16], params.Opcode)
    }

    // Set error flag if not OK
    if !params.StatusOK {
        binary.LittleEndian.PutUint32(msg[16:20], 1) // set error flag
    }

    // Truncate if requested
    if params.Truncate > 0 && params.Truncate < len(msg) {
        return msg[:params.Truncate]
    }

    return msg
}

// Usage:
// validResponse := buildMockWithParams(MockResponseParams{RequestID: 42, StatusOK: true})
// truncatedResponse := buildMockWithParams(MockResponseParams{RequestID: 42, Truncate: 10})
```

### Pattern 3: Realistic Response Corpus

For complex protocols, maintain a corpus of real-world response patterns:

```go
var (
    // Captured from real MongoDB 4.4.0
    realMongoDBHandshake = []byte{
        // ... actual bytes from wire capture ...
    }

    // Captured from real MongoDB 5.0.2
    realMongoDBHandshake502 = []byte{
        // ... actual bytes ...
    }
)

func TestAgainstRealResponses(t *testing.T) {
    tests := []struct {
        name     string
        response []byte
        expected string
    }{
        {"mongodb_4.4.0", realMongoDBHandshake, "4.4.0"},
        {"mongodb_5.0.2", realMongoDBHandshake502, "5.0.2"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            version, err := extractVersion(tt.response)
            assert.NoError(t, err)
            assert.Equal(t, tt.expected, version)
        })
    }
}
```

## BSON Document Mocks

### Common BSON Test Documents

```go
// emptyBSONDoc returns minimal empty BSON document
func emptyBSONDoc() []byte {
    return []byte{5, 0, 0, 0, 0}
}

// bsonWithVersion returns BSON with version field
func bsonWithVersion(version string) []byte {
    versionBytes := []byte(version)
    docLen := 4 + 1 + 8 + 4 + len(versionBytes) + 1 + 1 // length + type + "version\0" + str_len + str + null + terminator

    doc := make([]byte, docLen)
    binary.LittleEndian.PutUint32(doc[0:4], uint32(docLen))
    doc[4] = 2 // string type
    copy(doc[5:13], []byte("version\x00"))
    binary.LittleEndian.PutUint32(doc[13:17], uint32(len(versionBytes)+1))
    copy(doc[17:], versionBytes)
    doc[17+len(versionBytes)] = 0   // string null terminator
    doc[len(doc)-1] = 0              // document terminator

    return doc
}

// bsonWithMaxWireVersion returns BSON with maxWireVersion int32 field
func bsonWithMaxWireVersion(version int32) []byte {
    docLen := 4 + 1 + 16 + 4 + 1 // length + type + "maxWireVersion\0" + int32 + terminator

    doc := make([]byte, docLen)
    binary.LittleEndian.PutUint32(doc[0:4], uint32(docLen))
    doc[4] = 16 // int32 type
    copy(doc[5:21], []byte("maxWireVersion\x00"))
    binary.LittleEndian.PutUint32(doc[21:25], uint32(version))
    doc[25] = 0 // document terminator

    return doc
}
```

## Mock Validation

Always validate that your mocks are well-formed:

```go
func TestMockValidity(t *testing.T) {
    // Ensure mocks themselves are valid
    t.Run("mock_op_reply_valid", func(t *testing.T) {
        mock := buildMockOPReply(42, emptyBSONDoc())
        err := validateOPReply(mock)
        assert.NoError(t, err, "mock should be valid")
    })

    t.Run("mock_op_msg_valid", func(t *testing.T) {
        mock := buildMockOPMsg(42, emptyBSONDoc())
        err := validateOPMsg(mock)
        assert.NoError(t, err, "mock should be valid")
    })
}
```

**This prevents false negatives from broken mocks.**

## Best Practices

1. **Keep mocks minimal**: Only include required fields, not everything
2. **Parameterize request IDs**: Make mocks reusable with different IDs
3. **Test mock validity**: Ensure mocks are well-formed
4. **Use builder patterns**: Make it easy to create variations
5. **Document byte layouts**: Add comments explaining structure
6. **Avoid magic numbers**: Use constants for opcodes, flags, etc.
7. **Maintain real examples**: Keep captured real-world responses for validation
