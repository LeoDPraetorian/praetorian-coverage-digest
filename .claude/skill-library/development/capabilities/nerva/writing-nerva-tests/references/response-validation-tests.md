# Response Validation Tests

**Patterns for testing protocol response validation functions.**

## MongoDB OP_REPLY Validation

### Example: checkMongoDBResponse()

This function validates MongoDB OP_REPLY responses (opcode 1).

```go
func TestCheckMongoDBResponse(t *testing.T) {
    requestID := uint32(42)

    tests := []struct {
        name      string
        response  []byte
        requestID uint32
        wantErr   bool
    }{
        {
            name:      "valid_response",
            response:  buildValidOPReply(requestID),
            requestID: requestID,
            wantErr:   false,
        },
        {
            name:      "too_short",
            response:  []byte{1, 2, 3}, // less than 36 bytes (minimum OP_REPLY size)
            requestID: requestID,
            wantErr:   true,
        },
        {
            name:      "wrong_opcode",
            response:  buildResponseWithOpcode(requestID, 2013), // OP_MSG instead of OP_REPLY
            requestID: requestID,
            wantErr:   true,
        },
        {
            name:      "mismatched_request_id",
            response:  buildValidOPReply(999), // different request ID
            requestID: requestID,
            wantErr:   true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := checkMongoDBResponse(tt.response, tt.requestID)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Helper: Build Valid OP_REPLY

```go
// buildValidOPReply creates a minimal valid OP_REPLY response
func buildValidOPReply(requestID uint32) []byte {
    bsonDoc := []byte{5, 0, 0, 0, 0} // minimal BSON document

    msg := make([]byte, 36+len(bsonDoc))

    // Message header
    binary.LittleEndian.PutUint32(msg[0:4], uint32(len(msg)))  // messageLength
    binary.LittleEndian.PutUint32(msg[4:8], 1)                 // responseID
    binary.LittleEndian.PutUint32(msg[8:12], requestID)        // responseTo
    binary.LittleEndian.PutUint32(msg[12:16], 1)               // opCode: OP_REPLY

    // OP_REPLY fields
    binary.LittleEndian.PutUint32(msg[16:20], 0)  // responseFlags
    binary.LittleEndian.PutUint64(msg[20:28], 0)  // cursorID
    binary.LittleEndian.PutUint32(msg[28:32], 0)  // startingFrom
    binary.LittleEndian.PutUint32(msg[32:36], 1)  // numberReturned

    // BSON document
    copy(msg[36:], bsonDoc)

    return msg
}
```

## MongoDB OP_MSG Validation

### Example: checkMongoDBMsgResponse()

This function validates MongoDB OP_MSG responses (opcode 2013).

```go
func TestCheckMongoDBMsgResponse(t *testing.T) {
    requestID := uint32(42)

    tests := []struct {
        name      string
        response  []byte
        requestID uint32
        wantErr   bool
    }{
        {
            name:      "valid_msg_response",
            response:  buildValidOPMsg(requestID),
            requestID: requestID,
            wantErr:   false,
        },
        {
            name:      "too_short",
            response:  []byte{1, 2, 3}, // less than minimum OP_MSG size
            requestID: requestID,
            wantErr:   true,
        },
        {
            name:      "wrong_opcode",
            response:  buildResponseWithOpcode(requestID, 1), // OP_REPLY instead of OP_MSG
            requestID: requestID,
            wantErr:   true,
        },
        {
            name:      "mismatched_request_id",
            response:  buildValidOPMsg(999),
            requestID: requestID,
            wantErr:   true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := checkMongoDBMsgResponse(tt.response, tt.requestID)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Helper: Build Valid OP_MSG

```go
// buildValidOPMsg creates a minimal valid OP_MSG response
func buildValidOPMsg(requestID uint32) []byte {
    bsonDoc := []byte{5, 0, 0, 0, 0} // minimal BSON document

    msg := make([]byte, 21+len(bsonDoc))

    // Message header
    binary.LittleEndian.PutUint32(msg[0:4], uint32(len(msg)))  // messageLength
    binary.LittleEndian.PutUint32(msg[4:8], 1)                 // responseID
    binary.LittleEndian.PutUint32(msg[8:12], requestID)        // responseTo
    binary.LittleEndian.PutUint32(msg[12:16], 2013)            // opCode: OP_MSG

    // OP_MSG fields
    binary.LittleEndian.PutUint32(msg[16:20], 0)  // flagBits
    msg[20] = 0                                    // section kind: body

    // BSON document
    copy(msg[21:], bsonDoc)

    return msg
}
```

## Generic Protocol Response Validation

### Pattern for Custom Protocols

```go
func TestValidateCustomResponse(t *testing.T) {
    tests := []struct {
        name     string
        response []byte
        wantErr  bool
        errMsg   string
    }{
        {
            name:     "valid_response",
            response: buildValidResponse(),
            wantErr:  false,
        },
        {
            name:     "too_short",
            response: []byte{0x01, 0x02},
            wantErr:  true,
            errMsg:   "response too short",
        },
        {
            name:     "invalid_magic",
            response: buildResponseWithMagic(0xDEADBEEF),
            wantErr:  true,
            errMsg:   "invalid magic bytes",
        },
        {
            name:     "checksum_mismatch",
            response: buildResponseWithBadChecksum(),
            wantErr:  true,
            errMsg:   "checksum mismatch",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateCustomResponse(tt.response)
            if tt.wantErr {
                assert.Error(t, err)
                if tt.errMsg != "" {
                    assert.Contains(t, err.Error(), tt.errMsg)
                }
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## Validation Test Checklist

For every response validation function, test:

- [ ] Valid response (well-formed, correct opcode/magic, matching request ID)
- [ ] Too short (less than minimum protocol size)
- [ ] Wrong opcode/type (different message type)
- [ ] Mismatched request ID (response for different request)
- [ ] Invalid header (bad magic bytes, wrong version)
- [ ] Checksum failure (if protocol uses checksums)
- [ ] Truncated response (incomplete message)

## Helper Builder Pattern

Create a flexible builder for test responses:

```go
// ResponseBuilder helps construct test responses
type ResponseBuilder struct {
    length    uint32
    responseID uint32
    requestID uint32
    opcode    uint32
    flags     uint32
    body      []byte
}

func newResponseBuilder() *ResponseBuilder {
    return &ResponseBuilder{
        responseID: 1,
        requestID:  42,
        opcode:     1,
        flags:      0,
        body:       []byte{5, 0, 0, 0, 0}, // minimal BSON
    }
}

func (b *ResponseBuilder) withOpcode(opcode uint32) *ResponseBuilder {
    b.opcode = opcode
    return b
}

func (b *ResponseBuilder) withRequestID(id uint32) *ResponseBuilder {
    b.requestID = id
    return b
}

func (b *ResponseBuilder) build() []byte {
    // Calculate total length
    totalLen := 16 + len(b.body) // header + body

    msg := make([]byte, totalLen)
    binary.LittleEndian.PutUint32(msg[0:4], uint32(totalLen))
    binary.LittleEndian.PutUint32(msg[4:8], b.responseID)
    binary.LittleEndian.PutUint32(msg[8:12], b.requestID)
    binary.LittleEndian.PutUint32(msg[12:16], b.opcode)
    copy(msg[16:], b.body)

    return msg
}

// Usage in tests:
// wrongOpcodeResponse := newResponseBuilder().withOpcode(999).build()
// mismatchedIDResponse := newResponseBuilder().withRequestID(123).build()
```

This builder pattern makes it easy to create test responses with specific flaws.
