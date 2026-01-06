# Capability Development Rationalization Table

Extends [shared rationalization prevention](../../using-skills/references/rationalization-prevention.md).

## Phase-Specific Rationalizations

### Phase 1: Brainstorming

| Rationalization                               | Why It's Wrong                                          | Response                         |
| --------------------------------------------- | ------------------------------------------------------- | -------------------------------- |
| 'Capability type is obvious'                  | Type affects entire workflow (VQL vs Nuclei vs Janus)   | DENIED. Confirm type explicitly. |
| 'Similar to existing capability, skip design' | Similar != identical. Differences matter for detection. | DENIED. Complete brainstorming.  |

### Phase 2: Discovery

| Rationalization                         | Why It's Wrong                                     | Response                                        |
| --------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| 'No existing capabilities to reference' | Discovery finds patterns even in different domains | DENIED. Run Explore agent (very thorough mode). |
| 'I know the capability patterns'        | Discovery surfaces patterns you forgot             | DENIED. Run Explore agent (very thorough mode). |

### Phase 3: Architecture

| Rationalization                          | Why It's Wrong                                         | Response                              |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| 'Detection logic is straightforward'     | Security detection has edge cases that appear simple   | DENIED. Architecture review required. |
| 'VQL/Nuclei syntax is simple'            | Syntax simplicity != logic correctness                 | DENIED. capability-lead must review.  |
| 'Skip architecture for template updates' | Even updates need architecture review for side effects | DENIED. Architecture review required. |

### Phase 4: Implementation

| Rationalization                         | Why It's Wrong                               | Response                                    |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| 'Detection works in my test'            | Single test != comprehensive coverage        | DENIED. Implement full detection logic.     |
| 'False positives are acceptable for v1' | False positives erode user trust immediately | DENIED. False positive mitigation required. |
| 'Version detection can be added later'  | Version detection has ~10% follow-through    | DENIED. Implement version detection now.    |
| 'CPE format looks right'                | Must validate against CPE 2.3 spec           | NOT ACCEPTED. Validate CPE format.          |

### Phase 5: Review

| Rationalization                           | Why It's Wrong                                          | Response                                   |
| ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| 'Implementation matches my mental model'  | Review validates against architecture, not mental model | DENIED. capability-reviewer must validate. |
| 'One retry failed, detection still works' | Repeated failures indicate design issues                | DENIED. Escalate via AskUserQuestion.      |
| 'Quality standards are suggestions'       | Quality standards prevent production failures           | DENIED. Meet all quality standards.        |

### Phase 6: Testing

| Rationalization                         | Why It's Wrong                             | Response                               |
| --------------------------------------- | ------------------------------------------ | -------------------------------------- |
| 'Tests pass, skip test-lead validation' | Tests may not cover plan requirements      | DENIED. test-lead validation required. |
| 'Edge cases are rare'                   | Security edge cases are actively exploited | DENIED. Test all edge cases.           |
| 'Detection accuracy is good enough'     | 'Good enough' degrades over time           | DENIED. Meet accuracy requirements.    |

## Capability-Type Specific Rationalizations

### VQL Capabilities

| Rationalization                 | Why It's Wrong                                       | Response                                     |
| ------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| 'VQL is like SQL, I know it'    | VQL has Velociraptor-specific behaviors              | DENIED. Follow VQL patterns in codebase.     |
| 'Artifact collection is simple' | Artifact collection has permission/timing edge cases | DENIED. Test artifact collection thoroughly. |

### Nuclei Templates

| Rationalization                 | Why It's Wrong                           | Response                                   |
| ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| 'Template syntax is YAML, easy' | Matcher logic and extraction are complex | DENIED. Follow template standards.         |
| 'One matcher is enough'         | Multiple matchers reduce false positives | DENIED. Implement comprehensive matchers.  |
| 'CVE detection is boolean'      | Version ranges affect CVE applicability  | DENIED. Implement version-aware detection. |

### Janus Tool Chains

| Rationalization                          | Why It's Wrong                                | Response                               |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------- |
| 'Pipeline is linear, simple'             | Error handling and retry logic add complexity | DENIED. Implement full pipeline logic. |
| 'Tool output parsing is straightforward' | External tools have inconsistent output       | DENIED. Handle all output variations.  |

### Fingerprintx Modules

| Rationalization                        | Why It's Wrong                           | Response                                            |
| -------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| 'Protocol is well-documented'          | Documentation != implementation behavior | DENIED. Use orchestrating-fingerprintx-development. |
| 'Banner parsing is enough for version' | Banners are often spoofed or missing     | DENIED. Implement proper version detection.         |

### Scanner Integrations

| Rationalization                        | Why It's Wrong                                       | Response                                |
| -------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| 'API is RESTful, standard integration' | Each scanner has unique error handling               | DENIED. Handle scanner-specific errors. |
| 'Result normalization is mapping'      | Result normalization requires semantic understanding | DENIED. Validate result mapping.        |

## Cross-Phase Rationalizations

| Rationalization                             | Why It's Wrong                                   | Response                            |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| 'Sequential execution is slow, parallelize' | Capability development is sequential for quality | DENIED. Follow sequential workflow. |
| 'Human checkpoint is formality'             | Human checkpoints catch security design flaws    | DENIED. Wait for human approval.    |
| 'Quality metrics are aspirational'          | Quality metrics are requirements                 | DENIED. Meet all quality metrics.   |
