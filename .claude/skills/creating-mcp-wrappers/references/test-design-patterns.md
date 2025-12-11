# Test Design Patterns for MCP Wrappers

## Coverage Requirements

All MCP wrappers MUST achieve:
- **≥80% line coverage**
- **≥80% branch coverage**
- **≥80% function coverage**

---

## Test Categories

### Category 1: Input Validation (Required - ≥3 tests)

Test that Zod schema rejects invalid inputs:

```typescript
describe('Input Validation', () => {
  it('requires required fields', async () => {
    await expect(tool.execute({ /* missing required */ }))
      .rejects.toThrow(z.ZodError);
  });

  it('validates field types', async () => {
    await expect(tool.execute({ field: 123 })) // expect string
      .rejects.toThrow('Expected string');
  });

  it('validates constraints', async () => {
    await expect(tool.execute({ field: '' })) // min length
      .rejects.toThrow('String must contain at least 1 character');
  });
});
```

**Coverage target**: 100% of schema validation paths

---

### Category 2: MCP Integration (Required - ≥2 tests)

Test that wrapper calls MCP correctly:

```typescript
describe('MCP Integration', () => {
  it('calls MCP with correct tool name', async () => {
    const spy = vi.spyOn(mcpClient, 'callMCPTool');

    await tool.execute({ validInput: 'test' });

    expect(spy).toHaveBeenCalledWith({
      name: 'expected_tool_name',
      arguments: expect.any(Object)
    });
  });

  it('maps input parameters correctly', async () => {
    const spy = vi.spyOn(mcpClient, 'callMCPTool');

    await tool.execute({ inputField: 'value' });

    expect(spy).toHaveBeenCalledWith(
      'service-name',
      'tool-name',
      { mcpParameterName: 'value' } // Correct parameter mapping
    );
  });
});
```

**Coverage target**: 100% of MCP call paths

---

### Category 3: Response Filtering (Required - ≥2 tests)

Test that token reduction works:

```typescript
describe('Response Filtering', () => {
  it('includes essential fields only', async () => {
    const mockResponse = {
      id: '123',
      title: 'Test',
      metadata: { /* verbose data */ },
      _internal: { /* debug data */ }
    };

    vi.spyOn(mcpClient, 'callMCPTool').mockResolvedValue(mockResponse);

    const result = await tool.execute({ validInput: 'test' });

    // Only essential fields
    expect(result).toEqual({
      id: '123',
      title: 'Test'
    });
    // Verbose fields excluded
    expect(result).not.toHaveProperty('metadata');
    expect(result).not.toHaveProperty('_internal');
  });

  it('reduces tokens by ≥80%', async () => {
    const mockResponse = generateLargeResponse(); // 2500 tokens from discovery
    vi.spyOn(mcpClient, 'callMCPTool').mockResolvedValue(mockResponse);

    const result = await tool.execute({ validInput: 'test' });
    const tokenCount = JSON.stringify(result).length;

    // Target from discovery doc (e.g., 500 tokens for 80% reduction)
    expect(tokenCount).toBeLessThan(500);
  });
});
```

**Coverage target**: 100% of filtering logic

---

### Category 4: Security (Required - ≥4 tests)

Test protection against attacks:

```typescript
describe('Security', () => {
  it('blocks command injection', async () => {
    await expect(tool.execute({
      field: '; rm -rf /'
    })).rejects.toThrow('Invalid characters');
  });

  it('blocks path traversal', async () => {
    await expect(tool.execute({
      path: '../../../etc/passwd'
    })).rejects.toThrow('Path traversal detected');
  });

  it('blocks XSS attempts', async () => {
    await expect(tool.execute({
      field: '<script>alert("xss")</script>'
    })).rejects.toThrow('Invalid characters');
  });

  it('blocks control characters', async () => {
    await expect(tool.execute({
      field: 'test\x00null'
    })).rejects.toThrow('Control characters not allowed');
  });
});
```

**Coverage target**: 100% of validation checks

---

### Category 5: Edge Cases (Recommended - ≥4 tests)

Test boundary conditions:

```typescript
describe('Edge Cases', () => {
  it('handles empty string input', async () => {
    const result = await tool.execute({ field: '' });
    expect(result).toBeDefined();
  });

  it('handles very long input', async () => {
    const longString = 'a'.repeat(10000);
    const result = await tool.execute({ field: longString });
    expect(result).toBeDefined();
  });

  it('handles special characters', async () => {
    const result = await tool.execute({
      field: '!@#$%^&*()'
    });
    expect(result).toBeDefined();
  });

  it('handles unicode', async () => {
    const result = await tool.execute({
      field: '你好世界 🌍'
    });
    expect(result).toBeDefined();
  });
});
```

**Coverage target**: 80% of boundary conditions

---

### Category 6: Error Handling (Recommended - ≥3 tests)

Test graceful failures:

```typescript
describe('Error Handling', () => {
  it('handles MCP timeout', async () => {
    vi.spyOn(mcpClient, 'callMCPTool')
      .mockRejectedValue(new Error('Timeout'));

    await expect(tool.execute({ validInput: 'test' }))
      .rejects.toThrow('timed out');
  });

  it('handles MCP connection error', async () => {
    vi.spyOn(mcpClient, 'callMCPTool')
      .mockRejectedValue(new Error('Connection failed'));

    await expect(tool.execute({ validInput: 'test' }))
      .rejects.toThrow('connect');
  });

  it('handles malformed MCP response', async () => {
    vi.spyOn(mcpClient, 'callMCPTool')
      .mockResolvedValue({ unexpected: 'structure' });

    await expect(tool.execute({ validInput: 'test' }))
      .rejects.toThrow('Invalid response');
  });
});
```

**Coverage target**: 80% of error paths

---

## Test File Structure Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolName } from './tool-name.js';
import * as mcpClient from '../config/lib/mcp-client.js';

describe('toolName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Category 1: Input Validation (≥3 tests)
  describe('Input Validation', () => {
    it('requires required fields', async () => {
      // ...
    });

    it('validates field types', async () => {
      // ...
    });

    it('validates constraints', async () => {
      // ...
    });
  });

  // Category 2: MCP Integration (≥2 tests)
  describe('MCP Integration', () => {
    it('calls MCP with correct tool name', async () => {
      // ...
    });

    it('maps parameters correctly', async () => {
      // ...
    });
  });

  // Category 3: Response Filtering (≥2 tests)
  describe('Response Filtering', () => {
    it('includes essential fields only', async () => {
      // ...
    });

    it('reduces tokens by ≥80%', async () => {
      // ...
    });
  });

  // Category 4: Security (≥4 tests)
  describe('Security', () => {
    it('blocks command injection', async () => {
      // ...
    });

    it('blocks path traversal', async () => {
      // ...
    });

    it('blocks XSS', async () => {
      // ...
    });

    it('blocks control chars', async () => {
      // ...
    });
  });

  // Category 5: Edge Cases (≥4 tests)
  describe('Edge Cases', () => {
    it('handles empty strings', async () => {
      // ...
    });

    it('handles long input', async () => {
      // ...
    });

    it('handles special chars', async () => {
      // ...
    });

    it('handles unicode', async () => {
      // ...
    });
  });

  // Category 6: Error Handling (≥3 tests)
  describe('Error Handling', () => {
    it('handles timeout', async () => {
      // ...
    });

    it('handles connection error', async () => {
      // ...
    });

    it('handles malformed response', async () => {
      // ...
    });
  });
});
```

---

## Coverage Targets

| Test Category | Minimum Tests | Coverage Target |
|---------------|---------------|-----------------|
| Input Validation | 3 | 100% of schema fields |
| MCP Integration | 2 | 100% of MCP call paths |
| Response Filtering | 2 | 100% of filtering logic |
| Security | 4 | 100% of validation checks |
| Edge Cases | 4 | 80% of boundary conditions |
| Error Handling | 3 | 80% of error paths |

**Total Minimum**: 18 tests per wrapper

---

## Mocking Strategy

### Mock MCP Client

```typescript
// Good: Mock at module level
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn()
}));

// Use in tests
import { callMCPTool } from '../config/lib/mcp-client.js';

it('test', async () => {
  vi.mocked(callMCPTool).mockResolvedValue({ data: 'mocked' });
  // ... test code
});
```

### Mock Helpers

```typescript
// helpers/test-data.ts
export function generateValidInput() {
  return {
    requiredField: 'test',
    optionalField: 'value'
  };
}

export function generateLargeResponse() {
  return {
    id: '123',
    title: 'Test',
    metadata: { /* 2000 tokens of data */ },
    history: [ /* 500 tokens */ ]
  };
}
```

---

## Anti-Patterns

### ❌ Don't Test Implementation Details

```typescript
// Bad: Tests internal variable names
it('sets this.mcpClient', () => {
  expect(tool.mcpClient).toBeDefined();
});

// Good: Tests behavior
it('calls MCP tool', async () => {
  await tool.execute({ input: 'test' });
  expect(mcpClient.callTool).toHaveBeenCalled();
});
```

### ❌ Don't Mock What You're Testing

```typescript
// Bad: Mocking the tool itself
vi.spyOn(tool, 'execute').mockResolvedValue({ result: 'mocked' });

// Good: Mock dependencies, test actual code
vi.spyOn(mcpClient, 'callTool').mockResolvedValue({ /* response */ });
const result = await tool.execute({ input: 'test' });
```

### ❌ Don't Duplicate Logic in Tests

```typescript
// Bad: Reimplementing filtering logic in test
const expected = {
  id: response.id,
  title: response.title
  // This duplicates the wrapper's filtering logic
};

// Good: Test the outcome
expect(result).toEqual({
  id: expect.any(String),
  title: expect.any(String)
});
expect(result).not.toHaveProperty('metadata');
```

### ❌ Don't Use Arbitrary Test Values

```typescript
// Bad: Where did these numbers come from?
expect(tokenCount).toBeLessThan(1000);

// Good: Values from discovery doc
// Discovery: original 2347 tokens, target 450 (80% reduction)
expect(tokenCount).toBeLessThan(450);
```
