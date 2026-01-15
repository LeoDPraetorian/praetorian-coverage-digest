# Phase 1: Brainstorming

**Purpose**: Clarify integration scope, requirements, and design constraints before any technical work begins.

## Overview

Phase 1 uses the `brainstorming` skill to refine the integration concept through Socratic questioning. This phase captures essential design decisions that inform all subsequent phases, including vendor selection, integration type, authentication method, and data mapping strategy.

**REQUIRED SUB-SKILL**: `brainstorming`

## Why Brainstorming First?

Integration development without clear requirements leads to:
- Rework when API capabilities don't match assumptions
- P0 compliance failures due to missing pagination/auth patterns
- Frontend work for integrations that don't need UI
- Wasted effort implementing features the API doesn't support

Brainstorming catches these issues **before** any code is written.

## Key Questions to Resolve

### 1. Vendor Identification

| Question | Why It Matters |
|----------|----------------|
| What vendor are we integrating with? | Determines API documentation source, SDK availability |
| Is there an existing `integrating-with-{vendor}` skill? | Reuse existing patterns vs. create new |
| What is the vendor's official API documentation URL? | Primary research source for Phase 2 |

### 2. Integration Type

| Type | Description | Data Flow | Example |
|------|-------------|-----------|---------|
| Asset Discovery | Import external assets into Chariot | Vendor → Chariot | Shodan, Censys |
| Vulnerability Sync | Import vulnerabilities for existing assets | Vendor → Chariot | Qualys, Tenable |
| Bidirectional Sync | Two-way sync of assets and findings | Vendor ↔ Chariot | Wiz, Orca |

**Question**: What type of integration is this?

### 3. Authentication Method

| Method | UI Required? | Credential Storage | Example |
|--------|--------------|-------------------|---------|
| API Key | YES | Job.Secret | Shodan, VirusTotal |
| OAuth2 Client Credentials | YES | Job.Secret (client_id, client_secret) | Wiz, CrowdStrike |
| OAuth2 Authorization Code | YES | Job.Secret + refresh flow | GitHub App |
| Service Account (IAM Role) | NO | Infrastructure config | AWS cross-account |
| Mutual TLS | NO | Certificate files | Internal services |

**Question**: How does authentication work?

### 4. API Capabilities

| Capability | Questions | Impact |
|------------|-----------|--------|
| Pagination | Token-based, page-based, or cursor? | Determines pagination loop pattern |
| Rate Limiting | Requests per minute/hour? Headers? | Determines concurrency limits |
| Bulk Operations | Batch endpoints available? | Affects performance strategy |
| Webhooks | Push notifications supported? | Real-time vs. polling |

### 5. Data to Sync

| Entity Type | Vendor Equivalent | Chariot Model | Key Fields |
|-------------|-------------------|---------------|------------|
| Hosts/IPs | Cloud resources, assets | Asset | dns, ip, class |
| Vulnerabilities | Findings, issues | Risk | severity, cve, description |
| Configurations | Settings, policies | Attribute | key-value pairs |

**Question**: What data entities will be synced?

### 6. Affiliation Verification

| Approach | Description | When to Use |
|----------|-------------|-------------|
| API Query | Query vendor API to verify asset exists | API supports individual lookups |
| Re-enumerate | Run full discovery, check if asset returned | No individual lookup endpoint |
| CheckAffiliationSimple | Use BaseCapability default | Simple integrations |

**Question**: How do we verify assets still belong to the customer?

## Brainstorming Workflow

### Step 1: Invoke Brainstorming Skill

```
skill: "brainstorming"
```

### Step 2: Answer Core Questions

Work through the questions above, documenting answers as you go.

### Step 3: Document design.md

Create `design.md` in the output directory with the following structure:

```markdown
# Integration Design: {Vendor Name}

## Overview
- **Vendor**: {name}
- **Integration Type**: {asset_discovery | vuln_sync | bidirectional_sync}
- **API Documentation**: {url}
- **SDK Available**: {Yes/No, package name if yes}

## Authentication
- **Method**: {API Key | OAuth2 | Service Account | mTLS}
- **Credential Fields**: {list of fields user provides}
- **Token Refresh**: {if applicable}

## API Capabilities
- **Base URL**: {url}
- **Rate Limits**: {requests per minute/hour}
- **Pagination**: {token | page | cursor}
- **Bulk Operations**: {yes/no}

## Data Mapping

### Assets
| Vendor Entity | Chariot Field | Transformation |
|---------------|---------------|----------------|
| {entity} | {field} | {notes} |

### Vulnerabilities (if applicable)
| Vendor Entity | Chariot Field | Transformation |
|---------------|---------------|----------------|
| {entity} | {field} | {notes} |

## Affiliation Strategy
- **Method**: {API Query | Re-enumerate | CheckAffiliationSimple}
- **Endpoint**: {if API Query}
- **Query Pattern**: {description}

## Out of Scope
- {items explicitly not included}

## Open Questions
- {unresolved items for user clarification}
```

## Cross-Reference to Phase 2

Information gathered in Phase 1 directly feeds Phase 2 (Skill Check + Discovery):

| Phase 1 Output | Phase 2 Usage |
|----------------|---------------|
| Vendor name | Check for `integrating-with-{vendor}` skill |
| Authentication method | Populate vendor skill template |
| API endpoints | Research targets for codebase discovery |
| Pagination pattern | Pattern search in existing integrations |
| Rate limits | Document in vendor skill |

If the `integrating-with-{vendor}` skill doesn't exist, Phase 1 information is used to populate the vendor skill template.

## Human Checkpoint

**🛑 Gate**: Design approval before proceeding to discovery

**Checkpoint Format**:

```markdown
Phase 1 Design Review:

Vendor: {vendor}
Type: {integration_type}
Auth: {auth_method}

Key design decisions:
1. {decision 1}
2. {decision 2}
3. {decision 3}

Proceed to Phase 2 (Skill Check + Discovery)?
```

Use AskUserQuestion with options:
- **Approve** - Proceed to Phase 2
- **Revise** - Return to brainstorming with specific feedback
- **Cancel** - Stop workflow

## Gate Checklist

Phase 1 is complete when:

- [ ] `brainstorming` skill invoked
- [ ] `design.md` created with all required sections
- [ ] Vendor name confirmed and documented
- [ ] Integration type decided (asset_discovery | vuln_sync | bidirectional_sync)
- [ ] Authentication method identified and documented
- [ ] Pagination pattern understood
- [ ] Rate limits documented (or noted as unknown)
- [ ] Data mapping tables populated
- [ ] Affiliation strategy decided
- [ ] Human approved design via AskUserQuestion
- [ ] MANIFEST.yaml updated with design.md entry
- [ ] metadata.json phase-1 status updated to 'complete'

## Common Issues

### Issue: Unknown API Capabilities

**Symptom**: Can't answer pagination or rate limit questions

**Solution**:
1. Check vendor's official API documentation
2. If undocumented, note in design.md "Open Questions" section
3. Phase 2 will research via codebase patterns and web search
4. Worst case: implement with conservative defaults, adjust after testing

### Issue: Multiple Integration Types

**Symptom**: Integration could be asset_discovery AND vuln_sync

**Solution**:
- Choose primary type based on user's stated goal
- Document secondary capabilities in design.md
- Consider splitting into multiple integrations if scope is large

### Issue: Auth Method Unclear

**Symptom**: API supports multiple auth methods

**Solution**:
- Prefer OAuth2 Client Credentials for service-to-service
- Prefer API Key for simplicity if available
- Document trade-offs and let user decide

## Related Phases

- **Phase 0 (Setup)**: Creates output directory where design.md is saved
- **Phase 2 (Skill Check + Discovery)**: Uses design.md to guide skill creation and pattern search
- **Phase 3 (Architecture)**: Reads design.md as primary input
- **Phase 7 (Frontend)**: Uses auth method to determine if UI needed

## Related Skills

- `brainstorming` - Socratic questioning methodology
- `translating-intent` - Clarify vague requirements
- `orchestrating-research` - If vendor research needed beyond brainstorming
