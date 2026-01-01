# Protocol Parsing Tests

**Detailed patterns for testing binary protocol parsing functions.**

## BSON Parsing Tests

### Testing String Extraction

```go
func TestParseBSONString(t *testing.T) {
    tests := []struct {
        name     string
        bsonDoc  []byte
        key      string
        expected string
        found    bool
    }{
        {
            name: "valid_string",
            bsonDoc: []byte{
                31, 0, 0, 0, // document length
                2,           // type: string
                'v', 'e', 'r', 's', 'i', 'o', 'n', 0, // key: "version\0"
                8, 0, 0, 0,  // string length (including null terminator)
                '4', '.', '4', '.', '0', 0, // value: "4.4.0\0"
                0, // document terminator
            },
            key:      "version",
            expected: "4.4.0",
            found:    true,
        },
        {
            name:     "key_not_found",
            bsonDoc:  validBSONDoc(),
            key:      "nonexistent",
            expected: "",
            found:    false,
        },
        {
            name:     "empty_document",
            bsonDoc:  []byte{5, 0, 0, 0, 0}, // minimal BSON doc
            key:      "version",
            expected: "",
            found:    false,
        },
        {
            name:     "truncated_document",
            bsonDoc:  []byte{31, 0, 0, 0, 2}, // incomplete
            key:      "version",
            expected: "",
            found:    false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, found := parseBSONString(tt.bsonDoc, tt.key)
            assert.Equal(t, tt.expected, got)
            assert.Equal(t, tt.found, found)
        })
    }
}
```

### Testing Integer Extraction

```go
func TestParseBSONInt32(t *testing.T) {
    tests := []struct {
        name     string
        bsonDoc  []byte
        key      string
        expected int32
        found    bool
    }{
        {
            name: "valid_int32",
            bsonDoc: []byte{
                19, 0, 0, 0, // document length
                16,          // type: int32
                'm', 'a', 'x', 'W', 'i', 'r', 'e', 'V', 'e', 'r', 's', 'i', 'o', 'n', 0, // key
                7, 0, 0, 0, // value: 7
                0, // document terminator
            },
            key:      "maxWireVersion",
            expected: 7,
            found:    true,
        },
        {
            name:     "key_not_found",
            bsonDoc:  validBSONDoc(),
            key:      "missing",
            expected: 0,
            found:    false,
        },
        {
            name:     "wrong_type_field",
            bsonDoc:  bsonDocWithStringField(), // field exists but is string, not int32
            key:      "maxWireVersion",
            expected: 0,
            found:    false,
        },
        {
            name:     "empty_document",
            bsonDoc:  []byte{5, 0, 0, 0, 0},
            key:      "maxWireVersion",
            expected: 0,
            found:    false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, found := parseBSONInt32(tt.bsonDoc, tt.key)
            assert.Equal(t, tt.expected, got)
            assert.Equal(t, tt.found, found)
        })
    }
}
```

## Binary Protocol Parsing

### General Pattern

For any binary protocol parsing function:

1. **Valid input**: Well-formed data with expected values
2. **Missing field/marker**: Required data not present
3. **Wrong type**: Field exists but has unexpected type
4. **Truncated**: Incomplete data (stops mid-field)
5. **Malformed**: Invalid structure (wrong magic bytes, bad length, etc.)

### Example: Custom Protocol Header

```go
func TestParseCustomHeader(t *testing.T) {
    tests := []struct {
        name     string
        data     []byte
        expected Header
        wantErr  bool
    }{
        {
            name: "valid_header",
            data: []byte{
                0x12, 0x34, // magic bytes
                0x05, 0x00, 0x00, 0x00, // length: 5
                0x01, // version
            },
            expected: Header{Magic: 0x3412, Length: 5, Version: 1},
            wantErr:  false,
        },
        {
            name:     "truncated_header",
            data:     []byte{0x12, 0x34, 0x05}, // incomplete
            expected: Header{},
            wantErr:  true,
        },
        {
            name:     "wrong_magic",
            data:     []byte{0xFF, 0xFF, 0x05, 0x00, 0x00, 0x00, 0x01},
            expected: Header{},
            wantErr:  true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := parseCustomHeader(tt.data)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected, got)
            }
        })
    }
}
```

## Edge Cases Checklist

For every parsing function, test:

- [ ] Valid input (happy path)
- [ ] Empty input (nil, zero-length)
- [ ] Truncated input (incomplete data)
- [ ] Wrong type (field exists, wrong format)
- [ ] Missing field (field not present)
- [ ] Invalid values (out of range, malformed)
- [ ] Boundary conditions (max/min values, exact buffer size)

## Helper Functions for Test Data

Create reusable test data builders:

```go
// validBSONDoc returns a well-formed BSON document for testing
func validBSONDoc() []byte {
    return []byte{
        31, 0, 0, 0,
        2, 'v', 'e', 'r', 's', 'i', 'o', 'n', 0,
        8, 0, 0, 0, '4', '.', '4', '.', '0', 0,
        0,
    }
}

// bsonDocWithStringField returns BSON with maxWireVersion as string (wrong type)
func bsonDocWithStringField() []byte {
    return []byte{
        25, 0, 0, 0,
        2, 'm', 'a', 'x', 'W', 'i', 'r', 'e', 'V', 'e', 'r', 's', 'i', 'o', 'n', 0,
        2, 0, 0, 0, '7', 0, // "7" as string
        0,
    }
}
```

This improves test readability and reduces duplication.
