## Complete Resource List Requirement

**CRITICAL**: For findings with multiple affected resources, you MUST provide complete lists in the report. Saying "26 policies" without listing them prevents user verification.

**Mandatory Resource Lists**:

1. **IAM Policies** (privilege escalation, admin access, etc.)
   - List ALL policy names or ARNs
   - Include policy type (Customer Managed vs AWS Managed)
   - Example: "26 policies: analytics-drone-runner-policy-20250213142214901300000002, AnalyticsTeamLambdaRwAccess, ..."

2. **Lambda Functions** (secrets in variables, public access, etc.)
   - List ALL function names
   - Include region if multi-region
   - Example: "80 functions: auth-orch-delete-auth, cmd-runner-prod, datadog-forwarder, ..."

3. **S3 Buckets** (public access, logging disabled, etc.)
   - List ALL bucket names
   - Include verification status for each
   - Example: "4 buckets: arduino-arduino-certifications-prod-hare (✅ VERIFIED), arduino.tips (❌ FALSE POSITIVE), ..."

4. **Security Groups** (0.0.0.0/0 ingress, etc.)
   - List ALL SG IDs with attachment status
   - Example: "7 groups: sg-0fb17acaa2eed52ef (unused), sg-006c081603fca6f6a (attached to 3 running instances), ..."

5. **Route53 Records** (dangling IPs, etc.)
   - List ALL affected DNS records with IPs
   - Include verification status
   - Example: "7 subdomains: dashboard-coap.oniudra.cc → 35.169.153.65 (✅ VERIFIED DANGLING), ..."

**Format for Large Lists** (>20 items):

If listing all resources would exceed 50 lines, provide:
1. Full list in appendix or separate section
2. Summary with top 10 by risk score
3. Grouping by verification status (verified vulnerable vs false positive vs pending)

**Wrong Example**:
```
Finding 5: IAM Policies Allow Privilege Escalation (26 policies)
```

**Correct Example**:
```
Finding 5: IAM Policies Allow Privilege Escalation (26 policies)

Affected Policies:
1. analytics-arduino-events-ingest-update_partition_table-20241010105844383800000003
2. analytics-drone-runner-policy-20250213142214901300000002
3. AnalyticsTeamLambdaRwAccess
... (full list provided)
```

---

## Verification Workflow Summary

**For each critical finding**:

1. **Extract ALL resource identifiers** from Prowler CSV (column 22: `RESOURCE_UID`)
2. **Run verification command** appropriate for the check type FOR EACH resource
3. **Analyze output** against false positive patterns
4. **Update finding status** WITH COMPLETE RESOURCE LISTS:
   - ✅ **Verified Vulnerable** → Include in report with evidence and full resource list
   - ❌ **False Positive** → Exclude from report, document reasoning
   - ⚠️ **Needs Manual Review** → Flag for human verification

**Documentation Template**:

```markdown
### Finding: <Check Title> (<Total Count>)

**Prowler Status**: FAIL (Severity: <critical/high>)

**Affected Resources** (<count>):
1. <resource-1> - <verification status>
2. <resource-2> - <verification status>
... (complete list)

**Verification Performed** (sample for resource-1):
```bash
$ aws <service> <command> --resource <id>
<output>
```

**Analysis**: <Explain verification results>

**Validation Outcome**:
- ✅ Verified Vulnerable: X resources
- ❌ False Positive: Y resources
- ⚠️ Manual Review: Z resources

**Risk Score**: <Recalculated based on verification>
```

**Verification Statistics to Report**:

```markdown
## Verification Summary

- **Total Critical/High Findings**: 100
- **Verified Vulnerable**: 75 (75%)
- **False Positives**: 20 (20%)
- **Pending Manual Review**: 5 (5%)
- **Verification Rate**: 95%
```
