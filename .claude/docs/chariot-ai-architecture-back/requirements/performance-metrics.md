[ Back to Overview](../OVERVIEW.md)

# Performance Metrics Requirements

This document contains all AI performance measurement requirements for the Chariot AI Architecture platform, including effectiveness, efficiency, stability, safety, and generalization metrics.

## Summary

| Status      | Count |
| ----------- | ----- |
| Not Started | 5     |
| **Total**   | **5** |

---

## AI Effectiveness Metrics

### REQ-PERF-001

**Measure AI Effectiveness**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Priority** | High        |

**Description:**

#### Success Rate

Percentage of tasks or challenges completed successfully (e.g., vulnerability exploited, flag captured).

| Metric        | Details                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| **Source**    | Core metric in AIRTBench (flag submission %) and NYU CTF Bench (task completion)       |
| **Rationale** | Addresses over-optimism in multistage attacks                                          |
| **Method**    | Track via Validator Framework outputs; compute as (successful runs / total runs) x 100 |
| **Target**    | >70% for N-day exploits (Q4FY25 baseline)                                              |

#### Attack Graph Progress

Percentage of attack graph nodes compromised or paths explored.

| Metric        | Details                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| **Source**    | From MHBench (e.g., % nodes reached)                                    |
| **Rationale** | Quantifies partial successes in complex scenarios like lateral movement |
| **Method**    | Query Attack Graph Service post-run                                     |
| **Target**    | >50% progress in multi-host simulations                                 |

#### Vulnerability Detection Precision/Recall/F1 Score

Precision (true positives / predicted positives), Recall (true positives / actual positives), F1 (harmonic mean).

| Metric        | Details                                                            |
| ------------- | ------------------------------------------------------------------ |
| **Source**    | Standard in Evidently AI guide and HackSynth for detection tasks   |
| **Rationale** | Reduces false positives in zero-day hypothesis (Q2FY26)            |
| **Method**    | Compare agent findings to ground truth (e.g., via HITL validation) |
| **Target**    | F1 >0.85 for high-impact vulns like SQLi                           |

---

## AI Efficiency Metrics

### REQ-PERF-002

**Measure AI Efficiency**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Priority** | High        |

**Description:**

#### Cost per Run

Monetary cost (e.g., API calls to LLMs) or token count (input/output tokens).

| Metric        | Details                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Source**    | Highlighted in white paper ($0.10-$11.64 per run) and "Benchmarking Practices" (token counts for cost estimation) |
| **Rationale** | Ensures scalability for BAS market disruption                                                                     |
| **Method**    | Log via structured logging; integrate with SageMaker billing                                                      |
| **Target**    | <$5 per multistage assessment                                                                                     |

#### Time to Completion

Average time from goal input to final output (e.g., minutes per attack chain).

| Metric        | Details                                         |
| ------------- | ----------------------------------------------- |
| **Source**    | In AIRTBench and MHBench (e.g., 14-70 minutes)  |
| **Rationale** | Critical for real-time operator empowerment     |
| **Method**    | Timestamp workflow executions                   |
| **Target**    | <30 minutes for recon-to-exploitation workflows |

#### Actions/Steps per Task

Number of capabilities or sub-tasks invoked.

| Metric        | Details                                               |
| ------------- | ----------------------------------------------------- |
| **Source**    | From 3CB and AutoPenBench                             |
| **Rationale** | Minimizes inefficiency in hierarchical agents (HPTSA) |
| **Method**    | Count via Capabilities Registry logs (Agora)          |
| **Target**    | <20 steps for simple N-day exploits                   |

---

## AI Stability Metrics

### REQ-PERF-003

**Measure AI Stability**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Priority** | High        |

**Description:**

#### Consistency Across Runs

Variance in success rates over multiple identical runs (e.g., standard deviation).

| Metric        | Details                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Source**    | Addresses nondeterminism in white paper and "Benchmarking Practices" (e.g., prompt sensitivity) |
| **Rationale** | Ensures reproducible results in bug bounties                                                    |
| **Method**    | Run agents 10x per scenario; compute SD                                                         |
| **Target**    | SD <10% for core workflows                                                                      |

#### Hallucination Rate

Percentage of outputs that are factually incorrect or irrelevant (e.g., invalid commands).

| Metric        | Details                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| **Source**    | From MHBench (irrelevant commands 47-90%) and Confident AI's red teaming guide |
| **Rationale** | Mitigates risks in Planner Agent logic                                         |
| **Method**    | Automated checks via validators + manual HITL sampling                         |
| **Target**    | <15% in zero-day hypothesis generation                                         |

#### Error Recovery Rate

Percentage of failures from which the agent successfully recovers (e.g., via replanning).

| Metric        | Details                                              |
| ------------- | ---------------------------------------------------- |
| **Source**    | In Singer's paper (cascading failures) and HackSynth |
| **Rationale** | Supports Dual-Tool Logic                             |
| **Method**    | Log failures and recoveries in Workflow Engine       |
| **Target**    | >60% recovery in noisy environments                  |

---

## AI Safety Metrics

### REQ-PERF-004

**Measure AI Safety**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Priority** | High        |

**Description:**

#### Adherence to Safety Prompts

Percentage of runs where agents respect ethical constraints (e.g., no unintended exploits).

| Metric        | Details                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| **Source**    | From white paper (safety ignoring risks) and CYBERSEC.EVAL 2 (compliance >70% failure) |
| **Rationale** | Aligns with dual-use concerns                                                          |
| **Method**    | Inject safety tests; audit logs (NFRs)                                                 |
| **Target**    | 100% compliance in production                                                          |

#### False Positive Rate

Percentage of reported findings that are invalid.

| Metric        | Details                                                    |
| ------------- | ---------------------------------------------------------- |
| **Source**    | Standard security metric                                   |
| **Rationale** | Reduces noise and maintains operator trust                 |
| **Method**    | Compare agent findings to ground truth via HITL validation |
| **Target**    | <10% for validated findings                                |

#### Bias Score

Measure of fairness in vulnerability prioritization (e.g., across asset types).

| Metric        | Details                                          |
| ------------- | ------------------------------------------------ |
| **Source**    | From Confident AI red teaming (bias detection)   |
| **Rationale** | Ensures ethical AI                               |
| **Method**    | Use tools like fairness audits on scoring engine |
| **Target**    | >90% equity in diverse benchmarks                |

---

## AI Generalization Metrics

### REQ-PERF-005

**Measure AI Generalization**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Priority** | High        |

**Description:**

#### Novel Scenario Success Rate

Success in unseen environments (e.g., new network topologies).

| Metric        | Details                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| **Source**    | Core in NYU CTF Bench (adaptive learning) and MHBench (generalization gaps) |
| **Rationale** | Critical for zero-days                                                      |
| **Method**    | Test on held-out datasets like simulated bug bounties                       |
| **Target**    | >40% on novel CTFs                                                          |

#### Transfer Learning Improvement

Percentage improvement after fine-tuning on proprietary data.

| Metric        | Details                                      |
| ------------- | -------------------------------------------- |
| **Source**    | From Galileo AI and HackSynth                |
| **Rationale** | Tracks evergreen development                 |
| **Method**    | Pre/post fine-tuning comparisons (SageMaker) |
| **Target**    | +20% success post-loop                       |

#### Benchmark Alignment Score

Composite score against external benchmarks (e.g., % of AIRTBench challenges solved).

| Metric        | Details                                  |
| ------------- | ---------------------------------------- |
| **Source**    | Directly from AIRTBench/MHBench          |
| **Rationale** | Enables market disruption claims         |
| **Method**    | Periodic runs on open benchmarks         |
| **Target**    | Top-quartile performance vs. SOTA agents |

---

## Metrics Summary Table

| Category           | Metric                        | Target                                |
| ------------------ | ----------------------------- | ------------------------------------- |
| **Effectiveness**  | Success Rate                  | >70% for N-day exploits               |
| **Effectiveness**  | Attack Graph Progress         | >50% in multi-host simulations        |
| **Effectiveness**  | F1 Score                      | >0.85 for high-impact vulns           |
| **Efficiency**     | Cost per Run                  | <$5 per multistage assessment         |
| **Efficiency**     | Time to Completion            | <30 minutes for recon-to-exploitation |
| **Efficiency**     | Actions/Steps per Task        | <20 steps for simple N-day exploits   |
| **Stability**      | Consistency Across Runs       | SD <10% for core workflows            |
| **Stability**      | Hallucination Rate            | <15% in zero-day hypothesis           |
| **Stability**      | Error Recovery Rate           | >60% in noisy environments            |
| **Safety**         | Adherence to Safety Prompts   | 100% compliance in production         |
| **Safety**         | False Positive Rate           | <10% for validated findings           |
| **Safety**         | Bias Score                    | >90% equity in diverse benchmarks     |
| **Generalization** | Novel Scenario Success Rate   | >40% on novel CTFs                    |
| **Generalization** | Transfer Learning Improvement | +20% success post-loop                |
| **Generalization** | Benchmark Alignment Score     | Top-quartile vs. SOTA agents          |

---

## Related Requirements

- [REQ-AGENT-012](agents.md#req-agent-012) - Planner Agent Performance Metrics
- [REQ-UI-014](ui.md#req-ui-014) - AI Performance Dashboard
- [REQ-DATA-004](data.md#req-data-004) - Agent & Task Interaction Logging
- [NFR-OBS-001](non-functional.md#nfr-obs-001) - Observability (Metrics & Tracing)
