# Description Templates

Proven patterns for writing rich, comprehensive Linear ticket descriptions.

## Epic Description Template

```markdown
## Overview

[2-3 sentence executive summary - what is being built and why]

## Vision

[Business context - what value does this deliver to users/company?]

## Sub-Issues (Implementation Phases)

### Phase 1: Foundation
- [ ] CHARIOT-XXXX: [Title] - [What it accomplishes]
- [ ] CHARIOT-XXXX: [Title] - [What it accomplishes]

### Phase 2: Core Implementation
- [ ] CHARIOT-XXXX: [Title] - [What it accomplishes]
- [ ] CHARIOT-XXXX: [Title] - [What it accomplishes]

### Phase 3: Integration & Testing
- [ ] CHARIOT-XXXX: [Title] - [What it accomplishes]

## Architecture

\`\`\`
[ASCII diagram showing system components and data flow]

Example:
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   Client    │──────→│   Backend    │──────→│  Database   │
│   (React)   │←──────│   (Go/Lambda)│←──────│  (DynamoDB) │
└─────────────┘       └──────────────┘       └─────────────┘
\`\`\`

## Implementation Phases

**Phase 1: Foundation (Week 1)**
[What gets built in phase 1]

**Phase 2: Core (Week 2-3)**
[What gets built in phase 2]

**Phase 3: Integration (Week 4)**
[What gets built in phase 3]

## Success Criteria

- [ ] Measurable criterion 1
- [ ] Measurable criterion 2
- [ ] Measurable criterion 3

## Related Work

- [Link to design doc]
- [Link to similar feature]
```

---

## Sub-Issue Description Template

```markdown
## Overview

[Clear statement of what this sub-issue accomplishes]

## Technical Approach

[High-level implementation strategy]

\`\`\`
[Optional diagram or workflow if helpful]
\`\`\`

## Components Involved

**Modified Files:**
- \`path/to/file1.ts\` - Purpose
- \`path/to/file2.go\` - Purpose

**New Files:**
- \`path/to/new-file.tsx\` - Purpose

## Dependencies

**Requires:**
- CHARIOT-XXXX: [Title] - [Why it's needed]

**Blocks:**
- CHARIOT-YYYY: [Title] - [What it enables]

## Implementation Steps

1. **Step 1: [Phase]**
   - Substep A
   - Substep B

2. **Step 2: [Phase]**
   - Substep C
   - Substep D

3. **Step 3: [Phase]**
   - Substep E

## Code Examples (Optional)

\`\`\`typescript
// Example implementation
const example = () => {
  // Helpful code snippet
};
\`\`\`

## Success Criteria

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Code reviewed
- [ ] Documentation updated

## Parent Epic

CHARIOT-XXXX: [Epic Title]
```

---

## Real Example: From Our Recent Work

**Epic: CHARIOT-1853**

```markdown
## Overview

The Nuclei Template Intelligence Platform is a comprehensive AI-powered system
for automated vulnerability template management. It enables continuous improvement
of detection accuracy through human-agent collaboration, third-party integration
mapping, and automated template generation.

## Vision

Transform vulnerability detection from static templates to an intelligent,
self-improving system that learns from analyst feedback, maps third-party findings,
and generates new templates when coverage gaps exist.

## Sub-Issues (Workflows)

### 1. Agent Sandbox Infrastructure [BUILD FIRST]
Isolated environment for template testing with Nuclei runtime and target instances.

### 2. FP Refinement Agent (CHARIOT-1852)
When analysts reject findings as false positives, refine templates through conversation.

... [5 more sub-issues]

## Architecture

\`\`\`
                         ┌─────────────────────────┐
                         │  Agent Sandbox          │
                         │  Infrastructure         │
                         └───────────┬─────────────┘
                                     │
         ┌───────────────────────────┼──────────────┐
         │                           │              │
         ▼                           ▼              ▼
┌─────────────────┐      ┌─────────────────┐      ┌──────────┐
│ FP Refine       │      │ 3rd Party       │      │ Template │
│ [CHARIOT-1852]  │      │ Mapping Engine  │      │ Generation│
└─────────────────┘      └─────────────────┘      └──────────┘
\`\`\`

## Implementation Phases

**Phase 1: Foundation**
- Agent Sandbox Infrastructure
- Human-in-the-Loop Chat Interface

**Phase 2: Core Workflows**
- FP Refinement Agent
- Third-Party Vulnerability Mapping

**Phase 3: Advanced Capabilities**
- Template Comparison & Validation
- Template Generation Agent

## Success Criteria

- [ ] Sandbox can spin up Nuclei + target instances on demand
- [ ] Agents can iterate on templates with request/response validation
- [ ] Human feedback loop enables template refinement conversation
- [ ] All workflows produce PRs to nuclei-templates repo
```

---

## Content Guidelines

### What Makes a Good Description

**✅ Good descriptions:**
- Start with clear overview (2-3 sentences)
- Include diagrams for complex architecture
- Show workflows with arrows and decision trees
- List concrete success criteria
- Provide code examples where helpful
- Use progressive disclosure (TOC + sections)

**❌ Poor descriptions:**
- Vague objectives ("improve the system")
- No technical details
- Missing diagrams for complex flows
- No success criteria
- Wall of text with no structure

### Length Guidelines

| Ticket Type | Target Length | Notes |
|-------------|---------------|-------|
| Epic | 500-1500 words | Comprehensive overview |
| Complex sub-issue | 300-700 words | Detailed implementation |
| Simple sub-issue | 100-300 words | Clear scope |

**Progressive Disclosure Pattern:**
- Overview (always visible)
- TOC with links (scannable)
- Detailed sections (read as needed)

### Markdown Tips

**Use headings for structure:**
```markdown
## Overview
## Technical Approach
## Success Criteria
```

**Use code blocks for examples:**
```markdown
\`\`\`typescript
const example = 'code here';
\`\`\`
```

**Use bullet lists for readability:**
```markdown
- Point 1
- Point 2
```

**Use checkboxes for criteria:**
```markdown
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## Anti-Patterns

### ❌ Generic Descriptions

```markdown
## Overview
Build the notification system.

## Tasks
- Do backend stuff
- Do frontend stuff
```

**Why it's bad:** No technical details, unclear scope, not actionable.

### ❌ Overly Detailed Technical Specs

```markdown
## Overview
[50 paragraphs of implementation details copied from code]
```

**Why it's bad:** Too much detail belongs in code comments, not tickets.

### ❌ Missing Success Criteria

```markdown
## Overview
Implement the feature.

[No success criteria section]
```

**Why it's bad:** Unclear when the ticket is "done".

---

## Template Selection Guide

| Situation | Use Template |
|-----------|--------------|
| Multi-phase initiative | Epic template |
| Infrastructure/setup work | Sub-issue template (simplified) |
| Feature implementation | Sub-issue template (full) |
| Bug fix | Simple sub-issue template |
| Spike/research | Research variant (add "Findings" section) |
