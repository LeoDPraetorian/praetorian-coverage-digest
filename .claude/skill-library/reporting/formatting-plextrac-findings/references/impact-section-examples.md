# Impact Section Examples

**Real examples from VKB templates showing correct Impact section format.**

**NOTE TO MAINTAINERS:** These examples are extracted from actual VKB templates. Review periodically and remove/paraphrase if they become too identifiable or reference specific client contexts.

---

## Format Rules

**Correct Format:**
- Simple paragraph(s) in narrative style
- NO subsections with headers like "Security Impact:", "Business Impact:", etc.
- Attack-centric focus (what attacker can do, what happens as a result)
- Bullet points optional for multiple distinct consequences
- 1-3 paragraphs typical

**Incorrect Format (don't use):**
```markdown
### Impact

**Security Impact:** {text}
**Business Impact:** {text}
**Operational Impact:** {text}
**Compliance Impact:** {text}
```

---

## Example 1: Mobile - Hardcoded API Keys

**Source:** ~/owl/vkb-templates/mobile/high/hardcoded_api_keys.md

```markdown
#### Impact
The use of a hardcoded and an unprotected API key can result in an attacker
abusing the third-party API service while impersonating the victim company. The
following are some examples of the consequences from the attacker abusing the
service:

* If the service tracks analytics, the attacker could manipulate the data to
  their advantage or completely render the data useless.

* Depending on the services rendered by the third-party service, a monetary
  charge or penalty could be assessed to the victim company.
```

**Analysis:**
- First paragraph: Describes attacker capability (abuse API, impersonate company)
- Bullet points: Lists specific consequences
- No subsections - flows as narrative

---

## Example 2: Mobile - Sensitive Data Not Masked

**Source:** ~/owl/vkb-templates/mobile/high/sensitive_data_not_masked.md

```markdown
#### Impact
An attacker may be able to gain access to sensitive information via a lost or
stolen device since the application does not properly mask sensitive data.
```

**Analysis:**
- Single concise paragraph
- Describes attack scenario (lost/stolen device) and consequence (access to sensitive data)
- Very simple, direct format

---

## Example 3: Web - Missing Security Patches

**Source:** ~/owl/vkb-templates/web/00_uncategorized/missing_web_server_security_patch.md

```markdown
#### Impact
Systems missing security patches are more susceptible to a variety of
attacks (e.g., denial-of-service, information leakage, remote command
execution, etc.). The vulnerabilities created by missing security patches vary
in terms of their ease of exploitation; however, many are relatively easy to
exploit using publicly available software.
```

**Analysis:**
- First sentence: Broad consequence (susceptible to attacks)
- Parenthetical examples: Specific attack types
- Second sentence: Context about exploitability
- Two-sentence paragraph covering full impact

---

## Example 4: Web - Incorrect OAuth Authorization

**Source:** ~/owl/vkb-templates/web/04_access_control/incorrect_oauth_authentication.md

```markdown
#### Impact
OAuth is an industry-standard protocol used for authorization. The protocol is
specifically designed so that tokens can be used in place of username and
password credentials. Requiring a user to input the latter for a separate site
increases the exposure of those credentials, which in turn, increases the
potential for compromised credentials.
```

**Analysis:**
- Context paragraph: What OAuth is designed to do
- Consequence: Explains why deviation from standard increases risk
- Multi-sentence paragraph building logical flow

---

## Example 5: IoT - Debugging Utilities Found

**Source:** ~/owl/vkb-templates/iot/configuration/debugging_utilities_found.md

```markdown
#### Impact
By keeping debugging utilities and packages on production platforms, an
attacker will have a lower barrier-to-entry for debugging and follow-on
exploitation of a system.
```

**Analysis:**
- Single concise sentence
- Describes attacker advantage (lower barrier-to-entry)
- Consequence (easier debugging and exploitation)
- Minimal but complete

---

## Example 6: Cloud - Persistent GitHub Runners

**Source:** ~/owl/vkb-templates/cloud-security/findings/pipeline/github_persistent_github_runners.md

```markdown
#### Impact
An attacker with write access to any repository using the persistent runner could
steal secrets from other repositories using the runner as secrets were persisted
in memory. The impact of this vulnerability varies depending on the secrets in
other repositories. During the assessment, Praetorian identified secrets that
included private SSH keys. An attacker could abuse these SSH keys to compromise
the bastion host, giving them remote control of all hosts managed by the bastion
host.
```

**Analysis:**
- Paragraph 1: Primary attacker capability (steal secrets)
- Paragraph 2: Specific finding from assessment (SSH keys found)
- Paragraph 3: Consequence chain (SSH keys → bastion → all hosts)
- Multi-paragraph narrative building impact story

---

## Common Patterns

### Pattern 1: Simple Direct Impact
**Format:** Single paragraph describing attacker capability and consequence
**Example:** IoT debugging utilities (5 above)
**Use when:** Impact is straightforward and doesn't need elaboration

### Pattern 2: Context + Consequence
**Format:** Explain what should happen, then describe why deviation is harmful
**Example:** OAuth incorrect authorization (4 above)
**Use when:** Impact requires understanding of proper implementation first

### Pattern 3: Capability + Specific Examples
**Format:** Describe attacker capability, then list specific consequences
**Example:** Hardcoded API keys (1 above)
**Use when:** Multiple distinct consequences exist

### Pattern 4: Multi-Stage Impact Chain
**Format:** Build narrative showing progression of compromise
**Example:** GitHub runners (6 above) - secrets → SSH keys → bastion → all hosts
**Use when:** Exploitation enables cascading compromise

---

## Writing Guidelines

**DO:**
- Use active voice describing attacker actions
- Start with what attacker can do
- Include specific examples from the assessment when available
- Use bullet points for listing multiple consequences
- Keep narrative flow - make it readable

**DON'T:**
- Use subsection headers (Security Impact, Business Impact, etc.)
- Break into categorized buckets
- Make it a checklist of impact types
- Over-structure - keep it natural

**Test:** Read your Impact section aloud. Does it flow as a narrative story about what could happen? If it sounds like a form with categories, rewrite.

---

## Maintainer Notes

**This file contains real examples from VKB templates.** Review periodically:
- Remove examples if they reference specific client contexts
- Paraphrase if they become too identifiable
- Replace with newer examples as templates evolve
- Keep at least 4-6 diverse examples (mobile, web, IoT, cloud, different severity levels)

**Last reviewed:** 2026-01-13
