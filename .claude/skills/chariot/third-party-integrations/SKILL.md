---
name: third-party-integrations
description: Use when creating Chariot integrations with external APIs - provides step-by-step workflow for researching APIs with Context7 MCP, writing frontend integration cards, implementing backend stubs with credential validation, writing integration tests, and mapping external API types to tabularium data models
---

TODO: Add in Affiliation check

# Chariot Integration Development Workflow

Copy this checklist and check off items as you complete them:

```
Task Progress:
- [ ] Step 1: Research the external API (context7 mcp)
- [ ] Step 2: Write the frontend Integration card
- [ ] Step 3: Write the backend stub integration
- [ ] Step 4: Ask user for review and to setup run-integration
- [ ] Step 5: Write additional unit tests for Invoke() function
- [ ] Step 6: Write the backend Invoke() function
- [ ] Step 7: Verify tests pass
```

**Step 1: Research the external API using Context7 MCP**
Use the Context7 MCP server to explore the API’s schema, endpoints, and authentication model. Document available routes, response structures, and available data to guide backend design.
If context7 does not have any documentation or it is wildly out of date. Prompt the user to paste a link to the current documentation.

**Step 2: Write the frontend Integration card**
Create a new integration card in `modules/chariot/ui/src/hooks/useIntegration.tsx` that defines user inputs and connection fields.
Keep labels and defaults minimal to simplify setup.
Ensure that one input has a name of `value` and is an identifer like an API URL or ClientId, while the secret (password, api key, etc) can have any name.
You will also need to add the integration to the Integration enum in `modules/chariot/ui/src/types.ts`

**Step 3: Write the backend stub integration**
Implement a stub integration that strictly validates credentials. See `./stub-template.md` for the template to use.
You can review existing integrations in `modules/chariot/backend/pkg/tasks/integrations/serviceName.go`
Ensure before this step ends, you can build and run the basic tests on the stubbed integration.

**Step 4: Ask user for review and setup run-integration**
Share the stub implementation for review and confirm credentials or tokens are available.
Ask the user to ensure run-integration is setup to test the new integration. Provide them with a copy-pastable command (keep in mind ` class=<Return value of Name()`) and that `go generate ./pkg/tasks` has been run.
The user should respond with confirmation and what data we want to retrieve and transform to tabularium objects from this external API.

**Step 5: Write integration tests for backend integration**
Following Test Driven Development, write failing new unit tests for the integration.
For the unit tests, focus on testing functions that transform from the external type to the tabularium type or other helper functions.
Read `./tabularium-details.md` to get a better idea of the goals of each type.

**Step 6: Implement and Refine the Invoke() Function**

Follow this substep feedback loop until all tests pass:

1. **Write Invoke() Function:**  
   Implement real API calls and response parsing using the validated schema. Handle pagination, authentication, and error responses gracefully.
   Focus on filtering down and properly mapping the external API types to tabularium types.
   CRITICAL: We want to ensure whatever we pull from the external API makes sense in Chariot.

   - This means we focus mainly on Network Assets, Cloud, Webapplications.
   - We also want information about how to ACCESS these. If an asset has no information on how we can reach it from the Internet, it is useless.

2. **Run Tests:**  
   Execute the full suite of integration and unit tests for this integration.
   Use `go run modules/chariot/backend/cmd/tools/run-integration/main.go -class <class> -url <url>` to run the capability end-to-end and verify the output of the integration.

3. **Refine as Needed:**
   - If tests fail or data mapping issues arise, debug issues and revise the `Invoke()` implementation, response handling, or type mapping logic.
   - Repeat steps 1–3 until tests and data validation pass.

Once your changes pass all relevant tests and the data output is correct, proceed to the next step.

**Step 7: Add Asset Affiliation**
Write the `CheckAffiliation` function for the integration. `CheckAffiliation` efficiently checks if the supplied asset is currently enumerated within the external API.
See `modules/tabularium/pkg/model/model/capability.go` for the full interface (`CheckAffiliation(Asset) (bool, error)`)

**Important Notes**

- Keep in mind, some steps may already be done by a previous workflow run. Feel free to check them off and continue to the next one.
- Ensure these 2 values stay aligned between the frontend / backend.
  - Frontend ENUM name in `ui/src/types.ts`
  - Backend Capability name in the `Name()` function.
- Use external, open-source golang libraries for advanced requirements (especially if cyptographic). This reduces the maintainence load for Chariot to stay up to date.
- VMFilter is an important part of integrations. Run every Assetlike and Risk through them so that all integrations follow a consistent filtering mechanism.
  - Integrations can filter more themselves, but this provides us with a unified set as well.

```go
type Filter interface {
	Asset(asset *Asset) bool
	Risk(risk *Risk) bool
}
```
