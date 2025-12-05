import { describe, it, expect } from 'vitest';
import { formatMarkdownTables, hasUnformattedTables } from '../format-tables.js';

describe('formatMarkdownTables', () => {
  it('should format simple table with aligned columns', () => {
    const input = `
| Name | Age |
|---|---|
| Alice | 30 |
| Bob | 25 |
`.trim();

    const expected = `
| Name  | Age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should handle tables with varying cell widths', () => {
    const input = `
| Short | Very Long Header |
|---|---|
| A | B |
| Long text | C |
`.trim();

    const expected = `
| Short     | Very Long Header |
|-----------|------------------|
| A         | B                |
| Long text | C                |
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should preserve alignment markers in separator rows', () => {
    const input = `
| Left | Center | Right |
|:---|:---:|---:|
| A | B | C |
`.trim();

    const expected = `
| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should handle multiple tables in same content', () => {
    const input = `
Some text before

| Table 1 | Col 2 |
|---|---|
| A | B |

Text between tables

| Table 2 | Col 2 |
|---|---|
| X | Y |

Text after
`.trim();

    const result = formatMarkdownTables(input);

    // Verify both tables are formatted
    expect(result).toContain('| Table 1 | Col 2 |');
    expect(result).toContain('| Table 2 | Col 2 |');
    // Verify non-table content preserved
    expect(result).toContain('Some text before');
    expect(result).toContain('Text between tables');
    expect(result).toContain('Text after');
  });

  it('should preserve non-table content unchanged', () => {
    const input = `
# Heading

Regular paragraph text.

- List item 1
- List item 2

\`\`\`typescript
const code = "not a table";
\`\`\`
`.trim();

    expect(formatMarkdownTables(input)).toBe(input);
  });

  it('should handle empty tables', () => {
    const input = `
| Header |
|--------|
`.trim();

    const expected = `
| Header |
|--------|
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should handle tables with empty cells', () => {
    const input = `
| Name | Value |
|---|---|
| A | |
| | B |
`.trim();

    const expected = `
| Name | Value |
|------|-------|
| A    |       |
|      | B     |
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should handle mixed content with inline pipes', () => {
    const input = `
Text with | pipe character

| Real | Table |
|---|---|
| A | B |

Code with \`array.filter(x => x | 0)\`
`.trim();

    const result = formatMarkdownTables(input);

    // Table should be formatted
    expect(result).toContain('| Real | Table |');
    expect(result).toContain('|------|-------|');
    expect(result).toContain('| A    | B     |');
    // Non-table pipes preserved
    expect(result).toContain('Text with | pipe character');
    expect(result).toContain('Code with `array.filter(x => x | 0)`');
  });

  it('should handle tables with special characters', () => {
    const input = `
| Name | Special |
|---|---|
| Test | <tag> |
| Data | "quotes" |
`.trim();

    const expected = `
| Name | Special  |
|------|----------|
| Test | <tag>    |
| Data | "quotes" |
`.trim();

    expect(formatMarkdownTables(input)).toBe(expected);
  });

  it('should handle already formatted tables', () => {
    const input = `
| Name  | Age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
`.trim();

    // Should return unchanged
    expect(formatMarkdownTables(input)).toBe(input);
  });

  it('should handle table at start of content', () => {
    const input = `| First | Table |
|---|---|
| A | B |

Text after`;

    const result = formatMarkdownTables(input);
    expect(result).toContain('| First | Table |');
  });

  it('should handle table at end of content', () => {
    const input = `Text before

| Last | Table |
|---|---|
| A | B |`;

    const result = formatMarkdownTables(input);
    expect(result).toContain('| Last | Table |');
    expect(result).toContain('|------|-------|');
    expect(result).toContain('| A    | B     |');
  });
});

describe('hasUnformattedTables', () => {
  it('should return true for unformatted tables', () => {
    const unformatted = `
| Name | Age |
|---|---|
| Alice | 30 |
`.trim();

    expect(hasUnformattedTables(unformatted)).toBe(true);
  });

  it('should return false for formatted tables', () => {
    const formatted = `
| Name  | Age |
|-------|-----|
| Alice | 30  |
`.trim();

    expect(hasUnformattedTables(formatted)).toBe(false);
  });

  it('should return false for content without tables', () => {
    const noTables = `
# Heading

Regular text content.
`.trim();

    expect(hasUnformattedTables(noTables)).toBe(false);
  });

  it('should return true for mixed formatted and unformatted tables', () => {
    const mixed = `
| Formatted | Table |
|-----------|-------|
| A         | B     |

| Unformatted | Table |
|---|---|
| C | D |
`.trim();

    expect(hasUnformattedTables(mixed)).toBe(true);
  });
});
