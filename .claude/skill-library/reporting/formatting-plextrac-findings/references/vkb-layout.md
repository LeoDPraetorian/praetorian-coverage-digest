# VKB Layout and Custom Fields

**VKB (Vulnerability Knowledge Base) layout controls field ordering and custom fields in PlexTrac findings.**

## Critical Setup Requirement

**BEFORE creating findings:**

1. Navigate to **Report Details** → **Findings Layout**
2. Set layout to **"VKB"**
3. Use **"Add custom fields from layout"** button

**If you don't set VKB layout**: Custom fields won't render in the correct order in the PDF export.

---

## Why VKB Layout?

Praetorian's PlexTrac master template is built on the VKB layout. This layout:

- Defines custom field structure
- Controls field ordering in rendered PDF
- Ensures consistent finding format across all engagements
- Aligns with internal quality standards

**Other layouts exist** (Default, OWASP, etc.) but Praetorian uses VKB for all engagements.

---

## VKB Custom Fields

### Verification and Attack Information

**Purpose**: Step-by-step reproduction/exploitation instructions

**Required**: All findings (regardless of severity)

**Content type**: Markdown

**What to include**:
- Prerequisites (authentication, tools, access level)
- Numbered exploitation steps
- Expected vs observed behavior
- Command outputs or request/response pairs (inline or referenced in Evidence)

**Example**:
```markdown
### Verification and Attack Information

1. Navigate to https://app.example.com/search
2. Intercept the request with Burp Suite
3. Modify the `query` parameter to: `' OR '1'='1`
4. Forward the request
5. Observe that all user records are returned, bypassing search filtering

**Expected**: Only records matching the search query should be returned
**Observed**: All records in the database were returned
```

**Best practice**: Write clear enough that a junior engineer can reproduce the vulnerability following your steps.

### Systems Impacted

**Purpose**: Identify specific assets affected by the vulnerability

**Required**: All findings

**Content type**: Markdown

**What to include**:
- Specific URLs, IPs, hostnames
- Component or module names
- Scope (single endpoint vs platform-wide)
- User roles affected (all users, admins only, etc.)

**Example**:
```markdown
### Systems Impacted

**System/Endpoint:** https://app.example.com/api/search
**Component:** User search API (backend)
**Scope:** All authenticated users
**Impact:** Database-level access, potential data exfiltration
```

**For multiple systems**:
```markdown
### Systems Impacted

The following endpoints are vulnerable:

1. **https://app.example.com/api/search**
   - Component: User search API
   - Scope: All authenticated users

2. **https://app.example.com/api/reports**
   - Component: Reporting API
   - Scope: Admins only
```

### ASVS (Application Security Verification Standard)

**Purpose**: Map finding to ASVS category

**Required**: Mobile and Web application findings ONLY

**Content type**: Dropdown selection (not markdown)

**NOT required for**:
- Cloud security assessments
- Internal network assessments
- External network assessments
- Desktop applications
- IoT assessments
- Red team engagements

**How to add**:
1. In PlexTrac UI, edit the finding
2. Look for "ASVS" dropdown (added via VKB layout)
3. Select appropriate category

**ASVS Categories**:
- V1: Architecture, Design and Threat Modeling
- V2: Authentication Verification
- V3: Session Management Verification
- V4: Access Control Verification
- V5: Validation, Sanitization and Encoding
- V6: Stored Cryptography Verification
- V7: Error Handling and Logging Verification
- V8: Data Protection
- V9: Communication
- V10: Malicious Code
- V11: Business Logic
- V12: Files and Resources
- V13: API and Web Service
- V14: Configuration

**If you see ASVS field but don't need it**: Delete the field from the finding (Cloud/Internal/External assessments).

---

## Field Ordering in PDF

VKB layout ensures fields render in this order:

1. Finding Title (Name)
2. Severity badge
3. CVSS score and vector
4. Description
5. Verification and Attack Information
6. Systems Impacted
7. Evidence
8. Remediation
9. References
10. ASVS (if applicable)

**If fields appear out of order**: You likely didn't use "Add custom fields from layout" button. Manually created fields render in unpredictable order.

---

## Adding Custom Fields Correctly

### ✅ Correct Method

1. Set Findings Layout to "VKB" in Report Details
2. Click "Add custom fields from layout" button
3. PlexTrac automatically adds: Verification and Attack Information, Systems Impacted, ASVS (if applicable)
4. Fields render in correct PDF order

### ❌ Incorrect Method

1. Manually create custom fields by typing names
2. Fields may not match VKB layout names exactly
3. PDF renders fields in wrong order
4. Report fails quality checks

**Always use the layout button!**

---

## Troubleshooting VKB Layout Issues

### Issue: Custom Fields Not Showing in PDF

**Symptom**: "Verification and Attack Information" and "Systems Impacted" missing from rendered PDF

**Causes**:
1. Findings Layout not set to "VKB"
2. Custom fields not added via layout button
3. Custom field names don't match VKB layout exactly

**Solution**:
1. Go to Report Details → Findings Layout
2. Select "VKB"
3. Edit each finding
4. Use "Add custom fields from layout" button
5. Re-populate fields with content

### Issue: Fields in Wrong Order

**Symptom**: Evidence appears before Systems Impacted, or other ordering issues

**Cause**: Fields manually created instead of added via layout

**Solution**:
1. Delete manually created custom fields
2. Use "Add custom fields from layout" button
3. Copy/paste content back into correct fields

### Issue: ASVS Field Showing for Cloud Assessment

**Symptom**: ASVS dropdown present but not applicable

**Cause**: VKB layout includes ASVS by default

**Solution**: Delete the ASVS field from findings where it's not applicable (Cloud, Internal, External, Red Team)

### Issue: Can't Find "Add custom fields from layout" Button

**Symptom**: Button not visible when editing finding

**Cause**: Findings Layout not set to VKB at report level

**Solution**:
1. Exit finding editor
2. Go to Report Details → Findings Layout
3. Set to "VKB"
4. Re-open finding editor
5. Button should now appear

---

## VKB Layout vs Other Layouts

### VKB Layout (Praetorian Standard)
- Custom fields: Verification and Attack Information, Systems Impacted, ASVS
- Field order: Optimized for security assessment findings
- PDF rendering: Professional format
- **Use for**: All Praetorian engagements

### Default Layout
- Minimal custom fields
- Generic ordering
- **Use for**: Never (not Praetorian standard)

### OWASP Layout
- OWASP-specific fields
- Different rendering
- **Use for**: Never (Praetorian uses VKB with OWASP tags instead)

**Always use VKB layout for Praetorian reports.**

---

## Custom Field Content Guidelines

### Verification and Attack Information

**Length**: 100-300 words typical (depends on complexity)

**Tone**: Technical, step-by-step, reproducible

**Avoid**:
- Vague statements ("The application is vulnerable")
- Missing steps (assume reader has zero context)
- Assuming prior knowledge ("Do the obvious thing")

**Include**:
- Exact URLs, parameter names, payloads
- Tool names and versions
- Expected vs observed behavior
- Success indicators

### Systems Impacted

**Length**: 50-150 words typical

**Tone**: Specific, concise

**Avoid**:
- Generic statements ("The application")
- Omitting scope ("Some users")
- Missing identifiers (no URLs/IPs)

**Include**:
- Specific asset identifiers (URLs, IPs, hostnames)
- Component names (API, frontend, backend, service)
- Scope (all users, specific roles, geographic limitations)
- Impact summary (data exposure, account takeover, denial of service)

---

## Best Practices

1. **Set VKB layout first** - Before creating any findings
2. **Use layout button** - Don't manually create custom fields
3. **Delete unused fields** - Remove ASVS if not applicable
4. **Consistent naming** - Use exact field names from layout
5. **Validate before export** - Check field order in PDF preview
6. **Template reuse** - Use finding template to ensure consistency

---

## Related Documentation

- [finding-template.md](finding-template.md) - Copy/paste template with VKB fields
- [field-specifications.md](field-specifications.md) - Complete field requirements
- [tagging-system.md](tagging-system.md) - Tag catalog
- PlexTrac documentation: "5. Creating a Finding"
