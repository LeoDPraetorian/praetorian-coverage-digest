# Output Persistence

**Detailed specification for output directory structure and MANIFEST.yaml format.**

---

## Directory Structure

All outputs persist to:

```
.claude/.output/large-artifact-processing/
  {timestamp}-{artifact-name}/
    MANIFEST.yaml
    assessment.json          # Phase 1 results
    boundary-map.json        # Phase 2 results
    agent-outputs/           # Phase 3 raw outputs
      section-01.json
      section-02.json
      ...
    final/                   # Phase 4 deliverables
      summary.md             # analyze mode
      00-INDEX.md            # split mode
      gap-report.md          # verify mode
      {split-files}          # split mode outputs
```

---

## MANIFEST.yaml Structure

Complete schema for workflow metadata:

```yaml
artifact:
  name: "{original filename}"
  path: "{original path}"
  size_lines: n
  size_tokens_est: n
  type: "markdown|code|pdf|docx|pptx|json|xml"

mode: "analyze|split|verify"
timestamp: "{ISO 8601}"

decomposition:
  sections: n
  strategy: "by_heading|by_lines|by_pages|by_function"
  boundaries:
    - section: 1
      start: n
      end: n
      title: "..."
    - section: 2
      start: n
      end: n
      title: "..."

agents:
  - id: 1
    status: "pending|running|complete|failed"
    start_time: "{ISO 8601}"
    end_time: "{ISO 8601}"
    output_file: "agent-outputs/section-01.json"
    token_estimate: n
  - id: 2
    status: "pending|running|complete|failed"
    start_time: "{ISO 8601}"
    end_time: "{ISO 8601}"
    output_file: "agent-outputs/section-02.json"
    token_estimate: n

synthesis:
  status: "pending|complete|failed"
  output_file: "final/..."
  coverage_percent: n # For verify mode
  gaps: ["..."] # For verify mode
  notes: "..."
```

---

## Phase 1: assessment.json

Created after measuring artifact and calculating decomposition strategy:

```json
{
  "artifact": {
    "name": "THREAT-MODEL.md",
    "path": "/path/to/THREAT-MODEL.md",
    "size_lines": 6925,
    "size_tokens_est": 62325,
    "type": "markdown"
  },
  "token_budget": {
    "agent_context": 150000,
    "system_prompts": 10000,
    "agent_instructions": 5000,
    "tool_overhead": 15000,
    "output_reserve": 20000,
    "usable_content": 100000,
    "safe_target_per_agent": 50000
  },
  "decomposition": {
    "sections_calculated": 2,
    "sections_actual": 5,
    "reason": "Natural H1 boundaries align better with content structure",
    "strategy": "by_heading"
  },
  "timestamp": "2026-01-10T12:34:56Z"
}
```

---

## Phase 2: boundary-map.json

Created after identifying natural section boundaries:

```json
{
  "boundaries": [
    {
      "section": 1,
      "start_line": 1,
      "end_line": 1385,
      "title": "Architecture and Data Flow",
      "heading_level": 1,
      "token_estimate": 12465
    },
    {
      "section": 2,
      "start_line": 1386,
      "end_line": 2770,
      "title": "SCM Integration Flow",
      "heading_level": 1,
      "token_estimate": 12465
    },
    {
      "section": 3,
      "start_line": 2771,
      "end_line": 4155,
      "title": "Component Trust Boundaries",
      "heading_level": 1,
      "token_estimate": 12465
    },
    {
      "section": 4,
      "start_line": 4156,
      "end_line": 5540,
      "title": "Security Controls",
      "heading_level": 1,
      "token_estimate": 12465
    },
    {
      "section": 5,
      "start_line": 5541,
      "end_line": 6925,
      "title": "Deployment Architecture",
      "heading_level": 1,
      "token_estimate": 12465
    }
  ],
  "strategy": "by_heading",
  "total_sections": 5,
  "timestamp": "2026-01-10T12:35:23Z"
}
```

---

## Phase 3: agent-outputs/section-{n}.json

Each agent writes output in mode-specific format.

### Analyze Mode Output

```json
{
  "section": 1,
  "line_range": "1-1385",
  "headings": [
    "# Architecture and Data Flow",
    "## System Components",
    "## Trust Boundaries",
    "### External Trust Boundary",
    "### Internal Trust Boundary"
  ],
  "key_points": [
    "System uses layered architecture with clear trust boundaries",
    "External boundary at API Gateway enforces authentication",
    "Internal boundary between UI and backend validates session tokens",
    "Database access restricted to backend services only",
    "Neo4j graph contains sensitive relationship data"
  ],
  "cross_references": [
    "References 'Security Controls' section for authentication details",
    "Mentions 'Deployment Architecture' for infrastructure context",
    "Depends on 'Component Trust Boundaries' definitions"
  ],
  "summary": "Establishes core architectural patterns with emphasis on trust boundary enforcement. External traffic flows through API Gateway with JWT validation. Backend services communicate via internal network with mutual TLS. Data layer isolated with strict access controls.",
  "confidence": "high"
}
```

### Split Mode Output

```json
{
  "section": 1,
  "input_lines": "1-1385",
  "output_file": "/path/to/output/01-ARCHITECTURE.md",
  "title": "Architecture and Data Flow",
  "headings_preserved": [
    "# Architecture and Data Flow",
    "## System Components",
    "## Trust Boundaries"
  ],
  "word_count": 2847,
  "notes": "Section boundary cleanly splits at H1 heading. No cross-section dependencies found."
}
```

### Verify Mode Output

```json
{
  "section": 1,
  "split_file": "/path/to/output/01-ARCHITECTURE.md",
  "original_lines": "1-1385",
  "items_checked": 47,
  "found": 45,
  "missing_from_original": [],
  "gaps_in_split": [
    "Diagram ASCII art (lines 234-256) not preserved",
    "Table formatting (lines 678-692) appears truncated"
  ],
  "coverage_percent": 96,
  "status": "minor gaps",
  "notes": "ASCII diagrams and complex tables need manual verification. All headings, text content, and code blocks successfully preserved."
}
```

---

## Phase 4: final/ Deliverables

### Analyze Mode: summary.md

```markdown
# Summary: THREAT-MODEL.md Analysis

**Analyzed:** 2026-01-10 12:40:15
**Sections:** 5
**Total Lines:** 6,925
**Estimated Tokens:** 62,325

---

## Executive Summary

[High-level overview synthesized from all sections]

---

## Section 1: Architecture and Data Flow (lines 1-1385)

**Key Findings:**

- [Bullet points from section 1 agent]

**Cross-references:**

- [Links to other sections]

---

## Section 2: SCM Integration Flow (lines 1386-2770)

[... repeat for all sections ...]

---

## Cross-Section Insights

[Patterns and connections identified across multiple sections]

---

## Confidence Assessment

- High confidence sections: 1, 2, 4, 5
- Medium confidence: 3 (boundary split logical unit)
- Low confidence: None
```

### Split Mode: 00-INDEX.md

```markdown
# Index: THREAT-MODEL.md Split

**Original:** THREAT-MODEL.md (6,925 lines)
**Split Date:** 2026-01-10
**Sections:** 5

---

## Navigation

1. [Architecture and Data Flow](01-ARCHITECTURE.md) - Lines 1-1385
2. [SCM Integration Flow](02-SCM-FLOW.md) - Lines 1386-2770
3. [Component Trust Boundaries](03-COMPONENTS.md) - Lines 2771-4155
4. [Security Controls](04-SECURITY.md) - Lines 4156-5540
5. [Deployment Architecture](05-DEPLOYMENT.md) - Lines 5541-6925

---

## Section Details

### 01-ARCHITECTURE.md

- **Lines:** 1-1385
- **Word Count:** 2,847
- **Topics:** System components, trust boundaries, data flow

[... repeat for all sections ...]

---

## Notes

- All sections verified with 95%+ coverage
- Minor gaps in ASCII diagrams (manual verification needed)
- Cross-references updated with relative links
```

### Verify Mode: gap-report.md

```markdown
# Gap Report: THREAT-MODEL.md Split Verification

**Verified:** 2026-01-10 12:45:30
**Original:** THREAT-MODEL.md (6,925 lines)
**Split Files:** 5

---

## Overall Coverage

| Section | File               | Coverage | Status     |
| ------- | ------------------ | -------- | ---------- |
| 1       | 01-ARCHITECTURE.md | 96%      | Minor gaps |
| 2       | 02-SCM-FLOW.md     | 100%     | Complete   |
| 3       | 03-COMPONENTS.md   | 95%      | Minor gaps |
| 4       | 04-SECURITY.md     | 100%     | Complete   |
| 5       | 05-DEPLOYMENT.md   | 97%      | Minor gaps |

**Total Coverage:** 97.6%

---

## Gaps Identified

### Section 1: 01-ARCHITECTURE.md

- **Missing:** Diagram ASCII art (lines 234-256)
- **Impact:** Visual representation lost, textual description preserved
- **Recommendation:** Manually review and recreate diagram

[... repeat for all sections with gaps ...]

---

## Recommendations

1. Manual review of ASCII diagrams in sections 1, 3, 5
2. Verify table formatting in section 1
3. All text content and code blocks successfully preserved
4. Cross-references intact

---

## Verification Methodology

- Extracted all H2/H3 headings
- Verified all code blocks (first line matching)
- Checked 10 unique technical terms per section
- Compared numerical values, URLs, file paths
```

---

## Directory Creation Workflow

Orchestrator creates directory structure before dispatching agents:

```bash
# 1. Create output directory
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
ARTIFACT_NAME=$(basename "$ARTIFACT_PATH" | sed 's/\.[^.]*$//')
OUTPUT_DIR=".claude/.output/large-artifact-processing/${TIMESTAMP}-${ARTIFACT_NAME}"

mkdir -p "$OUTPUT_DIR/agent-outputs"
mkdir -p "$OUTPUT_DIR/final"

# 2. Initialize MANIFEST.yaml with artifact info
cat > "$OUTPUT_DIR/MANIFEST.yaml" <<EOF
artifact:
  name: "$(basename "$ARTIFACT_PATH")"
  path: "$ARTIFACT_PATH"
  size_lines: $(wc -l < "$ARTIFACT_PATH")
  size_tokens_est: $TOKEN_ESTIMATE

mode: "$MODE"
timestamp: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
EOF

# 3. Pass OUTPUT_DIR to all agents
# Agents write to: $OUTPUT_DIR/agent-outputs/section-{i}.json
```

---

## Synthesis Workflow

After collecting all agent outputs:

```bash
# 1. Read all agent outputs
jq -s '.' "$OUTPUT_DIR/agent-outputs"/section-*.json > combined.json

# 2. Update MANIFEST.yaml with agent status
# (Update agents array with complete status)

# 3. Generate final deliverable based on mode
if [ "$MODE" = "analyze" ]; then
  # Synthesize summary.md from all agent outputs
elif [ "$MODE" = "split" ]; then
  # Generate 00-INDEX.md with navigation
elif [ "$MODE" = "verify" ]; then
  # Generate gap-report.md with coverage matrix
fi

# 4. Update MANIFEST.yaml synthesis section
```
