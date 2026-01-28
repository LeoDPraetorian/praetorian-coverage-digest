# Wire Protocol Patterns

**Binary protocol parsing patterns for fingerprintx plugins.**

## Message Structure Parsing

### Little-Endian Integer Reading

Most protocols use little-endian byte order:

```go
import "encoding/binary"

// Read 32-bit integer
messageLength := binary.LittleEndian.Uint32(response[0:4])

// Read 16-bit integer
port := binary.LittleEndian.Uint16(response[4:6])

// Read 64-bit integer
cursorID := binary.LittleEndian.Uint64(response[8:16])
```

### Big-Endian (Network Byte Order)

Some protocols (DNS, etc.) use big-endian:

```go
transactionID := binary.BigEndian.Uint16(response[0:2])
```

## Common Message Patterns

### Header + Body Pattern

```
┌─────────────────────────────────────┐
│ Header (fixed size)                 │
├─────────────────────────────────────┤
│ - Message Length (4 bytes)          │
│ - Request ID (4 bytes)              │
│ - Response To (4 bytes)             │
│ - OpCode (4 bytes)                  │
├─────────────────────────────────────┤
│ Body (variable size)                │
├─────────────────────────────────────┤
│ - Protocol-specific data            │
└─────────────────────────────────────┘
```

### Length-Prefixed Strings

```go
// Read length-prefixed string
func readLengthPrefixedString(data []byte, offset int) (string, int) {
    if offset+4 > len(data) {
        return "", offset
    }
    strLen := binary.LittleEndian.Uint32(data[offset : offset+4])
    offset += 4

    if offset+int(strLen) > len(data) {
        return "", offset
    }

    // Most include null terminator in length
    str := string(data[offset : offset+int(strLen)-1])
    return str, offset + int(strLen)
}
```

### Null-Terminated Strings (C-strings)

```go
func readCString(data []byte, offset int) (string, int) {
    end := offset
    for end < len(data) && data[end] != 0x00 {
        end++
    }
    if end >= len(data) {
        return "", len(data)
    }
    return string(data[offset:end]), end + 1
}
```

## BSON Parsing (MongoDB-style)

### Document Structure

```
┌─────────────────────────────────────┐
│ Document Size (4 bytes, int32)      │
├─────────────────────────────────────┤
│ Element 1                           │
│ - Type (1 byte)                     │
│ - Key (cstring)                     │
│ - Value (type-dependent)            │
├─────────────────────────────────────┤
│ Element 2...                        │
├─────────────────────────────────────┤
│ Terminator (1 byte, 0x00)           │
└─────────────────────────────────────┘
```

### BSON Type Codes

| Type      | Code | Value Format                          |
| --------- | ---- | ------------------------------------- |
| Double    | 0x01 | 8 bytes (IEEE 754)                    |
| String    | 0x02 | int32 length + string + null          |
| Document  | 0x03 | Nested BSON document                  |
| Array     | 0x04 | BSON document with "0", "1", ... keys |
| Binary    | 0x05 | int32 length + subtype + bytes        |
| ObjectId  | 0x07 | 12 bytes                              |
| Boolean   | 0x08 | 1 byte (0x00 or 0x01)                 |
| DateTime  | 0x09 | int64 (milliseconds since epoch)      |
| Null      | 0x0A | No value                              |
| Int32     | 0x10 | 4 bytes                               |
| Timestamp | 0x11 | 8 bytes                               |
| Int64     | 0x12 | 8 bytes                               |

### Minimal BSON String Parser

```go
func parseBSONString(bsonDoc []byte, key string) string {
    if len(bsonDoc) < 5 {
        return ""
    }

    docSize := binary.LittleEndian.Uint32(bsonDoc[0:4])
    if docSize > uint32(len(bsonDoc)) {
        return ""
    }

    pos := 4 // Start after size field
    for pos < len(bsonDoc)-1 {
        if bsonDoc[pos] == 0x00 {
            break // Document terminator
        }

        elementType := bsonDoc[pos]
        pos++

        // Read key (null-terminated)
        keyStart := pos
        for pos < len(bsonDoc) && bsonDoc[pos] != 0x00 {
            pos++
        }
        if pos >= len(bsonDoc) {
            return ""
        }
        elementKey := string(bsonDoc[keyStart:pos])
        pos++ // Skip null terminator

        // Check if this is our target key
        if elementKey == key && elementType == 0x02 {
            if pos+4 > len(bsonDoc) {
                return ""
            }
            strLen := binary.LittleEndian.Uint32(bsonDoc[pos : pos+4])
            pos += 4
            if pos+int(strLen) > len(bsonDoc) || strLen == 0 {
                return ""
            }
            return string(bsonDoc[pos : pos+int(strLen)-1])
        }

        // Skip value based on type
        pos = skipBSONValue(bsonDoc, pos, elementType)
        if pos < 0 {
            return ""
        }
    }
    return ""
}

func skipBSONValue(data []byte, pos int, elementType byte) int {
    switch elementType {
    case 0x01: // double
        return pos + 8
    case 0x02: // string
        if pos+4 > len(data) {
            return -1
        }
        strLen := binary.LittleEndian.Uint32(data[pos : pos+4])
        return pos + 4 + int(strLen)
    case 0x03, 0x04: // document, array
        if pos+4 > len(data) {
            return -1
        }
        docLen := binary.LittleEndian.Uint32(data[pos : pos+4])
        return pos + int(docLen)
    case 0x05: // binary
        if pos+5 > len(data) {
            return -1
        }
        binLen := binary.LittleEndian.Uint32(data[pos : pos+4])
        return pos + 5 + int(binLen)
    case 0x07: // ObjectId
        return pos + 12
    case 0x08: // boolean
        return pos + 1
    case 0x09: // UTC datetime
        return pos + 8
    case 0x0A: // null
        return pos
    case 0x10: // int32
        return pos + 4
    case 0x11, 0x12: // timestamp, int64
        return pos + 8
    default:
        return -1 // Unknown type
    }
}
```

## Text Protocol Patterns

### Line-Based Protocols (Redis, SMTP, FTP)

```go
func readLine(conn net.Conn, timeout time.Duration) (string, error) {
    conn.SetReadDeadline(time.Now().Add(timeout))

    reader := bufio.NewReader(conn)
    line, err := reader.ReadString('\n')
    if err != nil {
        return "", err
    }

    return strings.TrimRight(line, "\r\n"), nil
}
```

### Redis RESP Protocol

```go
// Simple string: +OK\r\n
// Error: -ERR message\r\n
// Integer: :1000\r\n
// Bulk string: $6\r\nfoobar\r\n
// Array: *2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n

func parseRESP(data []byte) (interface{}, error) {
    if len(data) == 0 {
        return nil, errors.New("empty response")
    }

    switch data[0] {
    case '+': // Simple string
        return parseSimpleString(data)
    case '-': // Error
        return parseError(data)
    case ':': // Integer
        return parseInteger(data)
    case '$': // Bulk string
        return parseBulkString(data)
    case '*': // Array
        return parseArray(data)
    default:
        return nil, errors.New("unknown RESP type")
    }
}
```

## Validation Patterns

### Magic Byte Validation

```go
var MAGIC_BYTES = []byte{0x47, 0x45, 0x54} // "GET" for HTTP

func validateMagic(response []byte) bool {
    if len(response) < len(MAGIC_BYTES) {
        return false
    }
    return bytes.Equal(response[:len(MAGIC_BYTES)], MAGIC_BYTES)
}
```

### Opcode Validation

```go
const (
    OP_REPLY = 1
    OP_QUERY = 2004
    OP_MSG   = 2013
)

func validateOpcode(response []byte) (uint32, error) {
    if len(response) < 16 {
        return 0, errors.New("response too short for opcode")
    }

    opcode := binary.LittleEndian.Uint32(response[12:16])

    switch opcode {
    case OP_REPLY, OP_MSG:
        return opcode, nil
    default:
        return 0, fmt.Errorf("unexpected opcode: %d", opcode)
    }
}
```

### Request ID Correlation

```go
func validateRequestID(response []byte, expectedID uint32) error {
    if len(response) < 12 {
        return errors.New("response too short")
    }

    responseTo := binary.LittleEndian.Uint32(response[8:12])
    if responseTo != expectedID {
        return fmt.Errorf("request ID mismatch: expected %d, got %d",
            expectedID, responseTo)
    }

    return nil
}
```

## Building Request Messages

### MongoDB OP_QUERY Example

```go
func buildOPQuery(command string, requestID uint32) []byte {
    // Build BSON document: {command: 1}
    bsonDoc := buildBSONDocument(command, 1.0)

    msg := make([]byte, 0, 64)

    // Header placeholder (will set length at end)
    msg = append(msg, 0, 0, 0, 0) // messageLength

    // Request ID
    reqID := make([]byte, 4)
    binary.LittleEndian.PutUint32(reqID, requestID)
    msg = append(msg, reqID...)

    // Response To (0)
    msg = append(msg, 0, 0, 0, 0)

    // OpCode (2004 = OP_QUERY)
    msg = append(msg, 0xd4, 0x07, 0x00, 0x00)

    // Flags
    msg = append(msg, 0, 0, 0, 0)

    // Collection name
    msg = append(msg, []byte("admin.$cmd")...)
    msg = append(msg, 0x00)

    // NumberToSkip
    msg = append(msg, 0, 0, 0, 0)

    // NumberToReturn (-1)
    msg = append(msg, 0xFF, 0xFF, 0xFF, 0xFF)

    // BSON document
    msg = append(msg, bsonDoc...)

    // Set message length
    binary.LittleEndian.PutUint32(msg[0:4], uint32(len(msg)))

    return msg
}
```
