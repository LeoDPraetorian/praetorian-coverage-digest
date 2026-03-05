# Blog Potential Scoring Methodology

## Scoring Rubric (0-10 Scale)

**Threshold: 7.0+ recommended for blog post development**

| Criteria                      | Weight | Scoring Guide                                                        |
| ----------------------------- | ------ | -------------------------------------------------------------------- |
| Technical novelty             | 3x     | Novel technique: 8-10; Known pattern: 4-7; Basic: 0-3                |
| Impact/severity               | 2.5x   | Critical data exposure: 8-10; Account takeover: 5-7; Low impact: 0-4 |
| Story quality                 | 2x     | Compelling narrative: 8-10; Standard: 4-7; Dry: 0-3                  |
| Proof-of-concept completeness | 1.5x   | Full POC with results: 8-10; Partial: 4-7; Theory: 0-3               |
| Audience relevance            | 1x     | Widely applicable: 8-10; Niche: 4-7; Narrow: 0-3                     |

## Detailed Scoring Guidelines

### Technical Novelty (Weight: 3x)

**8-10: Novel technique**

- New attack vector not documented in public research
- Creative chaining of known vulnerabilities in unexpected way
- Discovery of vulnerability class previously unknown
- Example: First public demonstration of specific authentication bypass pattern

**4-7: Known pattern**

- Well-documented vulnerability type but interesting implementation
- Standard attack with notable twist or variation
- Commonly seen in enterprise but underrepresented in blog content
- Example: IDOR with unusual business logic flaw

**0-3: Basic**

- Textbook vulnerability with no unique characteristics
- Commonly exploited and extensively documented
- No new insights for security practitioners
- Example: Basic SQL injection with standard payload

### Impact/Severity (Weight: 2.5x)

**8-10: Critical data exposure**

- Mass data exfiltration (PII, PHI, financial records)
- Complete system compromise
- Affects millions of users
- Example: Healthcare app exposing all patient records via unauthenticated API

**5-7: Account takeover**

- Single account or limited dataset compromise
- Authentication bypass affecting subset of users
- Privilege escalation within limited scope
- Example: OTP brute force enabling targeted account takeover

**0-4: Low impact**

- Information disclosure without sensitive data
- Denial of service without data exposure
- Theoretical vulnerability requiring unlikely conditions
- Example: Username enumeration on public registration page

### Story Quality (Weight: 2x)

**8-10: Compelling narrative**

- Clear progression from discovery to exploitation
- Real-world impact demonstrated
- Surprising or ironic elements (e.g., "reported 3 years ago, still vulnerable")
- Strong hook for non-technical audience
- Example: Medical device vulnerability that vendor ignored despite repeated disclosure

**4-7: Standard**

- Straightforward vulnerability discovery and exploitation
- Clear technical narrative but no dramatic elements
- Interesting to security practitioners but limited broader appeal
- Example: Standard penetration test finding with clean POC

**0-3: Dry**

- Purely technical description without context
- Lacks human element or real-world framing
- Difficult to explain impact to non-experts
- Example: Minor configuration weakness with limited exploitation path

### Proof-of-Concept Completeness (Weight: 1.5x)

**8-10: Full POC with results**

- Complete exploitation chain documented
- Actual test results with timing/success rates
- Screenshots showing successful exploitation
- Reproducible steps with specific tooling
- Example: "Brute-forced 6-digit OTP in 8 minutes with 100% success rate"

**4-7: Partial**

- Exploitation path documented but incomplete testing
- Theoretical reproduction steps without full validation
- Some evidence (logs, screenshots) but gaps in chain
- Example: "Identified vulnerable endpoint, demonstrated partial bypass"

**0-3: Theory**

- Conceptual vulnerability without working POC
- No actual exploitation attempted
- Based on code review or documentation analysis only
- Example: "This pattern could be exploited if attacker has X access"

### Audience Relevance (Weight: 1x)

**8-10: Widely applicable**

- Affects commonly deployed platforms/frameworks
- Teaches transferable security principles
- Relevant across multiple industries
- Example: AWS misconfiguration affecting thousands of deployments

**4-7: Niche**

- Industry-specific but significant within that domain
- Specialized technology with moderate adoption
- Useful case study for particular security discipline
- Example: Healthcare IoT device vulnerability (large vertical, specific tech)

**0-3: Narrow**

- Highly specific product with limited deployment
- Requires rare prerequisites or attacker capabilities
- Limited learning value beyond specific scenario
- Example: Obscure enterprise software with <1000 deployments

## Calculation Formula

```
Total Score = (
  (Technical Novelty × 3) +
  (Impact/Severity × 2.5) +
  (Story Quality × 2) +
  (POC Completeness × 1.5) +
  (Audience Relevance × 1)
) / 10
```

**Normalization**: Each criterion scored 0-10, then weighted and averaged.

## Decision Tree

```
Score ≥ 7.0 → Recommend proceeding with blog post
Score 5.0-6.9 → Ask user if part of series or strategic priority
Score < 5.0 → Recommend skipping unless exceptional circumstances
```

## Example Scoring

**Case 1: Abbott MyFreeStyle OTP Brute Force**

| Criterion          | Raw Score | Weight | Contribution |
| ------------------ | --------- | ------ | ------------ |
| Technical novelty  | 7         | 3x     | 2.1          |
| Impact/severity    | 9         | 2.5x   | 2.25         |
| Story quality      | 8         | 2x     | 1.6          |
| POC completeness   | 9         | 1.5x   | 1.35         |
| Audience relevance | 8         | 1x     | 0.8          |

**Total: 8.1/10** → Strong recommendation for blog post

**Case 2: Basic IDOR in Internal Admin Panel**

| Criterion          | Raw Score | Weight | Contribution |
| ------------------ | --------- | ------ | ------------ |
| Technical novelty  | 4         | 3x     | 1.2          |
| Impact/severity    | 6         | 2.5x   | 1.5          |
| Story quality      | 3         | 2x     | 0.6          |
| POC completeness   | 7         | 1.5x   | 1.05         |
| Audience relevance | 5         | 1x     | 0.5          |

**Total: 4.85/10** → Recommend skipping unless part of larger series

## Edge Cases

### User Override Protocol

If score < 7.0, present scoring breakdown and ask:

- "Is this part of a vulnerability series?"
- "Does this fill a content calendar gap?"
- "Is there strategic value not captured in scoring?"

Document override reason in MANIFEST.yaml:

```yaml
blog_potential_score: 5.8
user_override: true
override_reason: "Part 3 of IDOR series, completes narrative arc"
```

### Scoring Uncertainty

When transcript lacks detail for accurate scoring:

- Default to middle range (5.0) for unclear criteria
- Add engineer marker: `[ENGINEER TO COMPLETE: Verify {criterion} for accurate blog potential]`
- Note in MANIFEST: `scoring_confidence: LOW - insufficient transcript detail`

### Multiple Findings in Single Transcript

Score each finding independently:

- Present all scores to user
- Recommend highest-scoring finding for blog focus
- Note if multiple findings could be combined into single post
- Example: "Finding 1: 8.2/10 (OTP brute force) | Finding 2: 6.1/10 (hardcoded keys) → Recommend blog post combining both"
