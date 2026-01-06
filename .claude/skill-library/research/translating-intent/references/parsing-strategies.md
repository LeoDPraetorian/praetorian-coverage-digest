# Parsing Strategies

**Detailed patterns for decomposing vague requests into structured components.**

## Overview

Parsing is the first phase of intent translation. This reference provides research-backed strategies for breaking down ambiguous requests into actionable components.

## Extraction Patterns

### 1. Explicit Requirements

Requirements stated directly in the request.

**Pattern:** Extract nouns (entities), verbs (actions), adjectives (qualities).

```
Request: "Add secure user authentication with email verification"

Extracted:
- Entity: user, email
- Action: add, authenticate, verify
- Quality: secure
- Implicit: database, password storage, session management
```

### 2. Implicit Requirements

Requirements implied but not stated. Research shows 50% of defects stem from missing implicit requirements.

**Pattern:** Domain-knowledge inference based on action + entity combination.

| Action + Entity      | Implicit Requirements                                      |
| -------------------- | ---------------------------------------------------------- |
| "add authentication" | User model, password storage, session management, login UI |
| "implement search"   | Index, ranking algorithm, query parsing, result display    |
| "create API"         | Endpoints, validation, error handling, documentation       |

### 3. Decomposition for Complex Requests

Based on Plan-and-Solve Prompting (ACL 2023) and Haystack query decomposition.

**Pattern:** Identify compound requests and break into sub-tasks.

```
Complex: "Create a login page with email validation and password reset"

Decomposed:
1. Create login page UI component
2. Implement email input with validation
3. Implement password input with rules
4. Create password reset flow
5. Connect authentication backend
```

## Parsing Pipeline

Based on research from GitHub (Instructor, Pydantic-AI) and arxiv (JointBERT):

```
User Input
    ↓
[Lexical Analysis]
- Tokenization
- Keyword extraction
- Entity recognition
    ↓
[Syntactic Analysis]
- Structure identification
- Completeness check
- Dependency mapping
    ↓
[Semantic Analysis]
- Intent classification
- Slot filling
- Context integration
    ↓
[Pragmatic Analysis]
- Implied needs
- Domain conventions
- User history
```

## Schema-Driven Parsing

Modern approach using Pydantic models (from Instructor library, 12K GitHub stars):

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ParsedRequest(BaseModel):
    """Schema for parsed user request."""

    action: Literal["create", "read", "update", "delete", "search", "navigate"]
    target: str = Field(description="Primary entity being acted upon")
    parameters: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    implicit_requirements: List[str] = Field(default_factory=list)
```

## Dependency Mapping

From research on requirements decomposition:

```
Request: "Build a dashboard with real-time data and export functionality"

Dependency Graph:
├── Dashboard (container)
│   ├── Data fetching (requires API)
│   │   └── Real-time updates (requires WebSocket or polling)
│   ├── Visualization components
│   │   └── Charts/tables (requires data)
│   └── Export functionality
│       ├── Format selection (CSV, PDF, Excel)
│       └── Download mechanism
```

## Related References

- [gap-analysis.md](gap-analysis.md) - Identifying missing information
- [assumption-patterns.md](assumption-patterns.md) - Documenting implicit assumptions
- [clarification-templates.md](clarification-templates.md) - Question generation
