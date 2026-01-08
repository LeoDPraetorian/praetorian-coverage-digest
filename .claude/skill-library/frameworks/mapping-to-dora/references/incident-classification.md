# DORA Incident Classification and Reporting

**Article 19 implementation guidance for major ICT-related incident classification and reporting timelines.**

## Quantitative Classification Thresholds

**Any ONE of these triggers major incident classification:**

| Threshold Type  | Value                      | Measurement                                  |
| --------------- | -------------------------- | -------------------------------------------- |
| Financial Impact| >€500,000                  | Direct/indirect losses, recovery costs       |
| Client Impact   | >5% of client base         | Number of clients with affected services     |
| Downtime        | >2 hours                   | Duration critical/important function unavailable |
| Data Breach     | >50,000 records compromised| Personal, financial, or sensitive data       |

## Qualitative Assessment Criteria

**EBA RTS criteria for classification (assess even if quantitative thresholds not met):**

1. **Service Impact**
   - Availability of critical/important functions
   - Integrity of systems and data
   - Confidentiality breaches
   - Authentication or authorization failures

2. **Client Impact**
   - Number and type of clients affected
   - Impact on client financial interests
   - Geographic distribution
   - Vulnerable client populations (retail vs institutional)

3. **Duration and Recovery**
   - Length of disruption
   - Time to restore normal operations
   - Ongoing impact after initial containment

4. **Geographic Spread**
   - Number of EU member states affected
   - Cross-border implications
   - Systemic impact potential

5. **Data Losses**
   - Types of data compromised (personal, financial, proprietary)
   - Volume and sensitivity
   - Potential for identity theft or fraud
   - Regulatory breach implications (GDPR)

6. **Criticality to Financial Stability**
   - Impact on financial markets
   - Contagion risk to other institutions
   - Market confidence effects

7. **Economic Impact**
   - Financial losses (direct and indirect)
   - Reputational damage
   - Legal and regulatory costs
   - Client remediation expenses

## Automatic Classification Triggers

**These incidents ALWAYS classify as major, regardless of quantitative thresholds:**

- **Successful unauthorized access** to production systems
- **Ransomware attack** affecting critical/important functions
- **Data breach of customer financial data** (payment cards, account numbers, credentials)
- **Payment system outage** affecting multiple institutions or clearing systems
- **Third-party provider failure** impacting critical services

## Three-Stage Reporting Process

### Initial Notification (4 hours / 24 hours)

**Timeline:**
- **4 hours** after incident classified as major
- No later than **24 hours** after incident detected (if classification takes time)

**Required Content:**
- Incident description and type
- Classification rationale (which threshold(s) triggered)
- Time of occurrence and detection
- Affected systems and services
- Initial impact assessment
- Current status and containment actions
- Estimated resolution time (if known)
- Contact information for incident lead

**Submission:**
- Via competent authority's incident reporting portal
- 24/7 availability required
- Immediate acknowledgment from authority

### Intermediate Report (72 hours)

**Timeline:**
- **72 hours** after incident classification

**Required Content (expanding initial report):**
- Detailed impact analysis (clients, systems, data)
- Root cause investigation progress
- Complete timeline of events
- Remediation actions taken and planned
- Updated recovery estimates
- Third-party involvement (if applicable)
- Lessons learned to date
- Changes in classification (if warranted)

**Analysis Depth:**
- Technical root cause analysis
- Control failures identified
- Detection mechanism effectiveness
- Response effectiveness assessment

### Final Report (1 month)

**Timeline:**
- **1 month** (30 days) after incident classification

**Required Content (comprehensive post-incident report):**
- Complete root cause analysis (technical and procedural)
- Full incident timeline with evidence
- Impact assessment (financial, operational, reputational)
- Control failures and gaps identified
- Remediation actions completed
- Preventive controls implemented
- Lessons learned and knowledge sharing
- Testing and validation of fixes
- Cost analysis (incident, remediation, losses)
- Regulatory coordination (if cross-border)

**Post-Incident Review:**
- Management review and sign-off required
- Board notification (for significant incidents)
- Update to risk register
- Policy and procedure updates
- Training and awareness enhancements

## Client Notification Requirements

**Mandatory notification when:**
- Incident affects client financial interests
- Client data compromised
- Service availability impacts client operations
- Regulatory requirement (GDPR for personal data)

**Notification Timeline:**
- **Without undue delay** after classification
- Coordinate with competent authority
- May be delayed if law enforcement investigation

**Notification Content:**
- Nature of incident and affected services
- Impact on client (specific where possible)
- Actions taken to mitigate
- Actions client should take (if any)
- Contact information for questions
- Ongoing updates commitment

## Regulatory Harmonization

### NIS2 Directive Alignment

DORA incident timelines harmonized with NIS2 (Network and Information Security Directive):
- Initial notification: 24 hours (DORA allows 4h if classification fast)
- Incident update: 72 hours
- Final report: 1 month

**Coordination:**
- Same reporting channels for entities under both regimes
- Avoid duplicate reporting burden
- Cross-reference to NIS2 reports

### GDPR Coordination

**Personal data breaches require parallel reporting:**

| Regulation | Authority         | Timeline    | Trigger                     |
| ---------- | ----------------- | ----------- | --------------------------- |
| DORA       | Financial regulator| 4h/24h/72h/1m| Major ICT incident        |
| GDPR       | Data protection   | 72 hours    | Personal data breach        |

**Best Practice:**
- Use DORA initial report for GDPR 72-hour notification
- Coordinate with both authorities
- Ensure consistent information

## Cross-Border Coordination

**For entities operating in multiple EU member states:**

1. **Home Authority Principle:**
   - Report to home member state competent authority
   - Home authority coordinates with host authorities

2. **Significant Cross-Border Impact:**
   - ESAs (EBA, ESMA, EIOPA) may coordinate
   - Information sharing between national authorities
   - Harmonized regulatory response

3. **Critical Provider Incidents:**
   - If CTPP involved, ESAs directly informed
   - Enhanced coordination for systemic risks

## Enforcement and Penalties

**Non-compliance sanctions:**
- Fines up to **2% of annual worldwide turnover**
- Public warnings and disclosure
- Remediation mandates
- Enhanced supervision

**Aggravating Factors:**
- Delayed reporting (beyond timelines)
- Incomplete or inaccurate information
- Failure to implement remediation
- Repeat incidents (same root cause)

## Practical Implementation

### Incident Classification Workflow

```
1. Incident Detected
   ↓
2. Preliminary Assessment (< 1 hour)
   - Could this meet any threshold?
   - What's the potential impact?
   ↓
3. Classify as Major? (decision point)
   ↓ YES → Continue
   ↓ NO → Internal incident management only
   ↓
4. Trigger 4-Hour Countdown
   - Notify incident response team
   - Activate reporting process
   - Begin initial report preparation
   ↓
5. Submit Initial Report (within 4 hours of classification)
   ↓
6. Ongoing Investigation and Containment
   ↓
7. Submit Intermediate Report (72 hours after classification)
   ↓
8. Complete Remediation and Analysis
   ↓
9. Submit Final Report (30 days after classification)
   ↓
10. Post-Incident Activities
    - Lessons learned
    - Control enhancements
    - Board reporting
```

### Tool Requirements

**Incident Management Platform should support:**
- Automated classification decision trees
- Threshold monitoring (financial impact, clients, downtime, data)
- Countdown timers (4h, 72h, 30 days)
- Reporting template auto-population
- Stakeholder notification routing
- Evidence collection and timeline logging
- Competent authority portal integration
- Status tracking and compliance monitoring

## Common Classification Mistakes

| Mistake                        | Consequence                          | Prevention                              |
| ------------------------------ | ------------------------------------ | --------------------------------------- |
| Delaying classification        | Missed 4-hour window                 | Pre-classify when in doubt, can reclassify later|
| Underestimating client impact  | Non-compliance, penalties            | Conservative assessment, err on side of reporting|
| Ignoring qualitative factors   | Missing systemic risk incidents      | Use qualitative criteria even if thresholds not met|
| Incomplete initial reports     | Regulatory scrutiny, follow-up demands| Use template, submit what's known, update at 72h|
| Not updating classification    | Inaccurate risk assessment           | Re-evaluate as investigation progresses |

## References

- EBA Consultation Paper: RTS on Major ICT-Related Incident Reporting
- DORA Article 19 (Official Text): [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2554/oj)
- NIS2 Directive (coordination): [NIS2 Text](https://eur-lex.europa.eu/eli/dir/2022/2555/oj)
- GDPR Article 33 (data breach notification)
- National competent authority incident reporting portals (jurisdiction-specific)
