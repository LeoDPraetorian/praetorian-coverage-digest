---
finding_data:
 title: Authorization Bypass via Insecure Direct Object Reference (IDOR)
 attack_category: Access Control

risk_data:
 - name: access_vector
   shorthand: Av
   result: (3) External
 - name: attack_feasibility
   shorthand: Af
   result: (3) Demonstrated
 - name: authentication
   shorthand: Au
   result: (2) User
 - name: compromise_impact
   shorthand: Ci
   result: (3) Complete
 - name: business_value
   shorthand: Bv
   result: (3) Crucial

taxonomies:
 tax_wasc: 02
 tax_cwe: 639
 tax_owasp_web: 1
 tax_asvs_web: 4.1.3

cvss: CVSS:4.0/AV:N/AC:L/AT:N/PR:H/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N

---

#### Vulnerability Description
The {{target}} platform's GraphQL API contained a widespread authorization bypass that could allow authenticated users to access resources belonging to other tenants. The authorization mechanism validated only the `tenantId` parameter but did not verify access rights to specific resource identifiers such as `realmId`, `accountId`, and other object references.

The vulnerability arose from authorization logic that granted access based solely on the validity of the provided `tenantId`, without verifying that the requested resources belonged to the same tenant. When processing API requests, the system checked whether the user had legitimate access to the specified tenant but did not validate that subsequent resource identifiers in the same request were actually owned by that tenant. This may allow attackers to combine a legitimate `tenantId` with unauthorized resource identifiers from other tenants, effectively bypassing tenant isolation boundaries.

This finding affected numerous GraphQL endpoints with varying privilege requirements. While some read operations required only basic authentication to exploit, some state-changing operations such as realm decommissioning or permission management required administrative or realm owner privileges within the attacker's tenant.

#### Impact
This authorization bypass could allow authenticated users to access resources across tenant boundaries, with the scope of potential actions determined by their privilege level within their own tenant. Any authenticated user may be able to exploit this finding to read sensitive information from other tenants, including realm configurations, account details, and user role assignments.

Users with administrative or realm owner privileges in their tenant could perform state-changing operations on other tenants' resources. These privileged attackers may be able to decommission realms belonging to other organizations, manipulate access controls by assigning or removing permissions, and accept or reject approval workflows in other tenants.

#### Systems Impacted
- {{target}} GraphQL endpoint: `{{endpoint}}/graphql`

#### Verification and Attack Information
Praetorian identified this finding by analyzing the GraphQL API's authorization logic and testing cross-tenant resource access patterns. The team authenticated as a user in Tenant A and methodically tested API endpoints by manipulating resource identifiers while maintaining a valid `tenantId` parameter.

Initial testing focused on read operations. When querying the `getRealmInstanceDetails` endpoint, Praetorian provided a legitimate Tenant A ID combined with a `realmId` belonging to Tenant B. The API returned realm configuration details for the Tenant B resource, confirming the authorization bypass.

\FigureInPlace[Unauthorized access to Tenant B realm details using Tenant A credentials with manipulated \texttt{realmId} parameter.]{$report_path$/phases/web/images/realmdetails.png}

This pattern was validated across multiple endpoints. The `accountQuery`, `accountUsersQuery`, and `getUserRolesForAccounts` endpoints returned data from unauthorized tenants when provided with manipulated resource identifiers. Additionally, the `userActionsQuery`, `getRealmBudgetApprovalRequests`, and `getAccountDeleteHistory` endpoints exhibited improper authorization behavior by returning empty responses instead of authorization errors, indicating the access control checks were bypassed even when no data was available to return.

Praetorian then escalated testing to state-changing operations using an account with administrative privileges in Tenant A. The team successfully executed cross-tenant modifications by maintaining the authorized Tenant A `tenantId` in the request while substituting resource identifiers from other tenants. This technique allowed an administrator from Tenant A, who had no assigned permissions or visibility in Tenant C, to decommission realms belonging to Tenant C. The API processed these requests based solely on the valid `tenantId` parameter without verifying that the requesting user had any authorization to manage resources in the target tenant.

\FigureInPlace[Successful cross-tenant realm decommission request showing acceptance of unauthorized operation.]{$report_path$/phases/web/images/realmdecom.png}

Permission manipulation operations exhibited the same behavior. The `assignPermissionSet` mutation allowed users to grant themselves elevated permissions to cloud accounts in other tenants. This provided administrative access to the target cloud account, potentially enabling control over cloud infrastructure outside the user's authorized tenant.

\FigureInPlace[Unauthorized permission assignment granting elevated access to cross-tenant cloud account.]{$report_path$/phases/web/images/perms.png}

Additional state-changing operations exhibited the same pattern. The `updateRealmAccountSet` mutation allowed modification of realm configurations across tenant boundaries. The `removePermissionSet` mutation could enable attackers to revoke legitimate users' permissions in other tenants. The approval workflow mutations, including `rejectCreateRealmApprovalRequest` and its corresponding acceptance endpoint, could allow attackers to approve or reject realm creation requests.

#### Areas for Improvement
Praetorian suggests {{client_short}} consider implementing comprehensive object-level authorization checks that validate both tenant ownership and resource access rights for every API request. When processing requests, Praetorian suggests the authorization system should verify that all resource identifiers (including `realmId`, `accountId`, and other object references) belong to the same tenant as specified in the `tenantId` parameter and that the requesting user has appropriate permissions for the specific operation on that resource.

#### References
[OWASP: Guide to Authorization](https://www.owasp.org/index.php/Guide_to_Authorization) \
[OWASP: Insecure Direct Object References Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) \
[OWASP: Authorization](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authorization_Cheat_Sheet.md) \
[WASC: Insufficient Authorization](http://projects.webappsec.org/w/page/13246940/Insufficient%20Authorization) \
