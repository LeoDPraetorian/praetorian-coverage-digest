# Message Building Tests

**Patterns for testing wire protocol message construction functions.**

## MongoDB Query Building

### Example: buildMongoDBQuery() - OP_QUERY Construction

```go
func TestBuildMongoDBQuery(t *testing.T) {
    tests := []struct {
        name       string
        requestID  uint32
        collection string
        query      []byte
        wantLen    int // expected message length
    }{
        {
            name:       "simple_query",
            requestID:  42,
            collection: "admin.$cmd",
            query:      []byte{5, 0, 0, 0, 0}, // minimal BSON
            wantLen:    45, // 16 (header) + 4 (flags) + 4 (skip) + 4 (return) + 12 (collection name) + 5 (BSON)
        },
        {
            name:       "different_collection",
            requestID:  100,
            collection: "test.users",
            query:      []byte{5, 0, 0, 0, 0},
            wantLen:    42, // adjusted for shorter collection name
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            msg := buildMongoDBQuery(tt.requestID, tt.collection, tt.query)

            // Verify message length
            assert.Equal(t, tt.wantLen, len(msg))

            // Verify header
            messageLength := binary.LittleEndian.Uint32(msg[0:4])
            assert.Equal(t, uint32(len(msg)), messageLength)

            requestIDFromMsg := binary.LittleEndian.Uint32(msg[4:8])
            assert.Equal(t, tt.requestID, requestIDFromMsg)

            opcode := binary.LittleEndian.Uint32(msg[12:16])
            assert.Equal(t, uint32(2004), opcode) // OP_QUERY

            // Verify collection name is null-terminated
            collectionEndIndex := 16 + 4 + 4 + 4 + len(tt.collection)
            assert.Equal(t, byte(0), msg[collectionEndIndex])

            // Verify BSON document is embedded correctly
            bsonStart := collectionEndIndex + 1
            assert.Equal(t, tt.query, msg[bsonStart:bsonStart+len(tt.query)])
        })
    }
}
```

### Example: buildMongoDBMsgQuery() - OP_MSG Construction

```go
func TestBuildMongoDBMsgQuery(t *testing.T) {
    tests := []struct {
        name      string
        requestID uint32
        bsonDoc   []byte
        wantLen   int
    }{
        {
            name:      "minimal_msg",
            requestID: 42,
            bsonDoc:   []byte{5, 0, 0, 0, 0}, // minimal BSON
            wantLen:   21, // 16 (header) + 4 (flags) + 1 (section kind) + 5 (BSON)
        },
        {
            name:      "with_command",
            requestID: 100,
            bsonDoc:   buildBSONCommand("isMaster", 1),
            wantLen:   21 + len(buildBSONCommand("isMaster", 1)) - 5, // adjusted for actual BSON size
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            msg := buildMongoDBMsgQuery(tt.requestID, tt.bsonDoc)

            // Verify message length
            messageLength := binary.LittleEndian.Uint32(msg[0:4])
            assert.Equal(t, uint32(len(msg)), messageLength)

            // Verify request ID
            requestIDFromMsg := binary.LittleEndian.Uint32(msg[4:8])
            assert.Equal(t, tt.requestID, requestIDFromMsg)

            // Verify opcode
            opcode := binary.LittleEndian.Uint32(msg[12:16])
            assert.Equal(t, uint32(2013), opcode) // OP_MSG

            // Verify flag bits (should be 0)
            flags := binary.LittleEndian.Uint32(msg[16:20])
            assert.Equal(t, uint32(0), flags)

            // Verify section kind (0 = body)
            assert.Equal(t, byte(0), msg[20])

            // Verify BSON document
            assert.Equal(t, tt.bsonDoc, msg[21:])
        })
    }
}
```

## Generic Message Building Pattern

### Testing Custom Protocol Messages

```go
func TestBuildCustomMessage(t *testing.T) {
    tests := []struct {
        name    string
        msgType uint8
        payload []byte
        wantLen int
    }{
        {
            name:    "hello_message",
            msgType: 0x01,
            payload: []byte("HELLO"),
            wantLen: 10, // 2 (magic) + 1 (type) + 4 (length) + 5 (payload)
        },
        {
            name:    "empty_payload",
            msgType: 0x02,
            payload: []byte{},
            wantLen: 7, // header only
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            msg := buildCustomMessage(tt.msgType, tt.payload)

            // Verify total length
            assert.Equal(t, tt.wantLen, len(msg))

            // Verify magic bytes
            magic := binary.BigEndian.Uint16(msg[0:2])
            assert.Equal(t, uint16(0x1234), magic)

            // Verify message type
            assert.Equal(t, tt.msgType, msg[2])

            // Verify payload length
            payloadLen := binary.BigEndian.Uint32(msg[3:7])
            assert.Equal(t, uint32(len(tt.payload)), payloadLen)

            // Verify payload
            if len(tt.payload) > 0 {
                assert.Equal(t, tt.payload, msg[7:])
            }
        })
    }
}
```

## Message Building Test Checklist

For every message building function, verify:

- [ ] **Total message length** - Correct calculation and header field
- [ ] **Opcode/message type** - Correct identifier for message type
- [ ] **Request ID** - Correctly embedded in header
- [ ] **Flags/options** - Default values or specified values
- [ ] **String fields** - Null-terminated where required
- [ ] **Binary fields** - Correct byte ordering (LittleEndian/BigEndian)
- [ ] **Payload/body** - Correctly positioned and complete
- [ ] **Padding/alignment** - If protocol requires alignment

## Byte-Level Verification Helpers

Create helpers to verify specific byte ranges:

```go
// verifyHeader checks standard header fields
func verifyHeader(t *testing.T, msg []byte, expectedLen int, expectedOpcode uint32) {
    t.Helper()

    // Length
    msgLen := binary.LittleEndian.Uint32(msg[0:4])
    assert.Equal(t, uint32(expectedLen), msgLen, "message length mismatch")

    // Opcode
    opcode := binary.LittleEndian.Uint32(msg[12:16])
    assert.Equal(t, expectedOpcode, opcode, "opcode mismatch")
}

// verifyNullTerminatedString checks a string field is null-terminated
func verifyNullTerminatedString(t *testing.T, msg []byte, offset int, expected string) int {
    t.Helper()

    // Find null terminator
    endIdx := offset
    for endIdx < len(msg) && msg[endIdx] != 0 {
        endIdx++
    }

    actual := string(msg[offset:endIdx])
    assert.Equal(t, expected, actual, "string mismatch")
    assert.Equal(t, byte(0), msg[endIdx], "missing null terminator")

    return endIdx + 1 // return position after null terminator
}

// Usage in tests:
func TestBuildMessage(t *testing.T) {
    msg := buildMongoDBQuery(42, "admin.$cmd", bsonDoc)

    verifyHeader(t, msg, len(msg), 2004)
    nextOffset := verifyNullTerminatedString(t, msg, 28, "admin.$cmd")
    // Continue verification from nextOffset...
}
```

## BSON Document Builders

Create helpers for building test BSON documents:

```go
// buildBSONCommand creates a BSON command document
func buildBSONCommand(command string, value interface{}) []byte {
    // This is a simplified example - real implementation would be more robust
    switch v := value.(type) {
    case int:
        return buildBSONWithInt32(command, int32(v))
    case string:
        return buildBSONWithString(command, v)
    default:
        return []byte{5, 0, 0, 0, 0} // empty doc
    }
}

func buildBSONWithInt32(key string, value int32) []byte {
    keyBytes := []byte(key)
    docLen := 4 + 1 + len(keyBytes) + 1 + 4 + 1 // length + type + key + null + value + terminator

    doc := make([]byte, docLen)
    binary.LittleEndian.PutUint32(doc[0:4], uint32(docLen))
    doc[4] = 16 // int32 type
    copy(doc[5:], keyBytes)
    doc[5+len(keyBytes)] = 0 // null terminator
    binary.LittleEndian.PutUint32(doc[6+len(keyBytes):], uint32(value))
    doc[docLen-1] = 0 // document terminator

    return doc
}

// Usage:
// isMasterCmd := buildBSONCommand("isMaster", 1)
// msg := buildMongoDBMsgQuery(42, isMasterCmd)
```

## Testing Message Variations

Test different parameter combinations:

```go
func TestMessageVariations(t *testing.T) {
    baseQuery := []byte{5, 0, 0, 0, 0}

    tests := []struct {
        name       string
        collection string
    }{
        {"short_name", "a"},
        {"medium_name", "test.collection"},
        {"long_name", "verylongdatabase.verylongcollectionname"},
        {"with_special_chars", "db.$cmd"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            msg := buildMongoDBQuery(42, tt.collection, baseQuery)

            // Verify collection name is correctly embedded
            // (specific verification logic here)

            // Verify message is well-formed
            err := validateMessage(msg)
            assert.NoError(t, err)
        })
    }
}
```

This ensures the message builder handles edge cases in parameters correctly.
