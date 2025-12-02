/**
 * Formats markdown tables to have aligned columns.
 *
 * This function:
 * 1. Identifies markdown tables (consecutive lines starting with |)
 * 2. Calculates the maximum width needed for each column
 * 3. Pads cells with spaces to align columns
 * 4. Preserves non-table content unchanged
 *
 * @param content - Markdown content that may contain tables
 * @returns Formatted markdown with aligned tables
 *
 * @example
 * ```typescript
 * const input = `
 * | Name | Age |
 * |---|---|
 * | Alice | 30 |
 * | Bob | 25 |
 * `;
 *
 * const output = formatMarkdownTables(input);
 * // | Name  | Age |
 * // |-------|-----|
 * // | Alice | 30  |
 * // | Bob   | 25  |
 * ```
 */
export function formatMarkdownTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let currentTable: string[] = [];

  function isTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  }

  function formatTable(tableLines: string[]): string[] {
    if (tableLines.length === 0) return [];

    // Parse table into cells
    const rows = tableLines.map(line => {
      // Remove leading/trailing | and split
      const trimmed = line.trim().slice(1, -1);
      return trimmed.split('|').map(cell => cell.trim());
    });

    // Calculate max width for each column (excluding separator rows)
    const numCols = rows[0].length;
    const columnWidths = new Array(numCols).fill(0);

    for (const row of rows) {
      // Skip separator rows when calculating width
      const isSeparatorRow = row.every(cell => cell.match(/^:?-+:?$/));
      if (isSeparatorRow) continue;

      for (let i = 0; i < row.length; i++) {
        columnWidths[i] = Math.max(columnWidths[i], row[i].length);
      }
    }

    // Format each row
    return rows.map((row, rowIndex) => {
      // Check if this is a separator row (all cells are dashes)
      const isSeparatorRow = row.every(cell => cell.match(/^:?-+:?$/));

      const cells = row.map((cell, colIndex) => {
        const width = columnWidths[colIndex];

        // Special handling for separator rows (contains only dashes and optional colons)
        if (cell.match(/^:?-+:?$/)) {
          const leftAlign = cell.startsWith(':');
          const rightAlign = cell.endsWith(':');
          const centerAlign = leftAlign && rightAlign;

          // Separator width = content width + 2 (for leading/trailing spaces in normal rows)
          const separatorWidth = width + 2;

          let separator = '-'.repeat(separatorWidth);
          if (centerAlign) {
            separator = ':' + '-'.repeat(Math.max(1, separatorWidth - 2)) + ':';
          } else if (leftAlign) {
            separator = ':' + '-'.repeat(Math.max(1, separatorWidth - 1));
          } else if (rightAlign) {
            separator = '-'.repeat(Math.max(1, separatorWidth - 1)) + ':';
          }
          return separator;
        }

        // Regular cell - pad with spaces
        return cell.padEnd(width);
      });

      // Separator rows have no spaces around cells
      if (isSeparatorRow) {
        return `|${cells.join('|')}|`;
      }

      // Regular rows have spaces around cells
      return `| ${cells.join(' | ')} |`;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTableLine(line)) {
      // Add to current table
      currentTable.push(line);
    } else {
      // If we have a table, format and add it
      if (currentTable.length > 0) {
        result.push(...formatTable(currentTable));
        currentTable = [];
      }
      // Add the non-table line
      result.push(line);
    }
  }

  // Handle table at end of content
  if (currentTable.length > 0) {
    result.push(...formatTable(currentTable));
  }

  return result.join('\n');
}

/**
 * Checks if markdown content contains unformatted tables.
 * Returns true if tables exist but are not properly aligned.
 *
 * @param content - Markdown content to check
 * @returns True if unformatted tables detected
 */
export function hasUnformattedTables(content: string): boolean {
  const formatted = formatMarkdownTables(content);
  return formatted !== content;
}
