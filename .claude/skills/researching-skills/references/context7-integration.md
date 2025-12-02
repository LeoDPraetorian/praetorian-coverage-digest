# Context7 Integration

## Overview

Context7 is a documentation index that provides structured access to library documentation. This skill uses Context7 MCP wrappers to search and fetch documentation.

## MCP Wrappers Used

### resolve-library-id

**Location**: `.claude/tools/context7/resolve-library-id.ts`

**Purpose**: Search for packages matching a topic.

**Input**:
```typescript
interface Input {
  libraryName: string;  // Search query
}
```

**Output**:
```typescript
interface Output {
  libraries: Array<{
    id: string;          // e.g., "/npm/@tanstack/react-query"
    name: string;        // e.g., "@tanstack/react-query"
    version: string;     // e.g., "5.0.0"
    pageCount: number;   // Documentation page count
    description: string; // Package description
  }>;
}
```

### get-library-docs

**Location**: `.claude/tools/context7/get-library-docs.ts`

**Purpose**: Fetch full documentation for a package.

**Input**:
```typescript
interface Input {
  libraryId: string;  // Package ID from resolve-library-id
}
```

**Output**:
```typescript
interface Output {
  libraryName: string;
  version: string;
  content: string;  // Full markdown documentation
}
```

## Package Status Determination

Packages are assigned status based on metadata analysis:

### Recommended
- Main package for the library
- Stable version (no alpha/beta/rc)
- Not marked deprecated

### Caution
- Internal/core packages (name contains `-core` or `-internal`)
- Pre-release versions (alpha, beta, rc)
- May require advanced knowledge

### Deprecated
- Name or description contains "deprecated"
- Should not be used for new projects

```typescript
function determinePackageStatus(lib: any): 'recommended' | 'caution' | 'deprecated' {
  const name = (lib.name || '').toLowerCase();
  const description = (lib.description || '').toLowerCase();

  if (name.includes('deprecated') || description.includes('deprecated')) {
    return 'deprecated';
  }

  const version = lib.version || '';
  if (version.includes('alpha') || version.includes('beta') || version.includes('rc')) {
    return 'caution';
  }

  if (name.includes('-core') || name.includes('-internal')) {
    return 'caution';
  }

  return 'recommended';
}
```

## Documentation Parsing

### Section Detection

Content is split by markdown headings:

```typescript
const headingRegex = /^(#{1,2})\s+(.+)$/gm;
```

### Section Types

Sections are categorized by title keywords:

| Type | Keywords |
|------|----------|
| api | "api", "reference" |
| guide | "guide", "tutorial", "getting started", "quick start" |
| example | "example", "usage" |
| migration | "migrat", "upgrade" |
| other | Default |

### Code Block Extraction

Code blocks are extracted with context:

```typescript
const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
```

Each block includes:
- `language`: Programming language (from fence)
- `code`: The code content
- `context`: Last 3 lines before the code block

## Error Handling

### Search Failures
- Return empty array
- Log error to console
- Let caller decide how to proceed

### Documentation Fetch Failures
- Return null
- Log error with package ID
- Skip failed packages, continue with others

## Usage Example

```typescript
import { searchContext7, fetchContext7Docs } from './sources/context7.js';

// Search for packages
const packages = await searchContext7('tanstack query');
console.log(`Found ${packages.length} packages`);

// Filter recommended packages
const recommended = packages.filter(p => p.status === 'recommended');

// Fetch documentation
for (const pkg of recommended) {
  const docs = await fetchContext7Docs(pkg.id);
  if (docs) {
    console.log(`Fetched ${docs.sections.length} sections for ${pkg.name}`);
  }
}
```

## Timeout Configuration

| Operation | Timeout | Rationale |
|-----------|---------|-----------|
| Search | 30s | Quick lookup |
| Fetch docs | 60s | Large documentation |

## Buffer Configuration

Documentation fetch uses a 10MB buffer to handle large packages:

```typescript
maxBuffer: 10 * 1024 * 1024  // 10MB
```

## Testing

To test Context7 integration without making real calls:

```typescript
// Mock the project root
import { _setProjectRoot } from './sources/context7.js';
_setProjectRoot('/mock/project');

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue(JSON.stringify({
    libraries: [/* mock data */]
  }))
}));
```
