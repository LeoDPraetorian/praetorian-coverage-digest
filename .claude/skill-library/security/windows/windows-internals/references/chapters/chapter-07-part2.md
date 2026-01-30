## EXPERIMENT: Launching a program at low integrity level

When you elevate a program, either by using the Run as Administrator option or because the

program is requesting it, the program is explicitly launched at high integrity level. However, it is

also possible to launch a program at low integrity level by using PStexec from Sysinternals:

1. Launch Notepad at low integrity level by using the following command:

```bash
c:\psexec -l notepad.exe
```

2. Try opening a file (such as one of the XML files) in the %SystemRoot%\System32 dire tory. Notice that you can browse the directory and open any file contained within it.

3. In Notepad, open the File menu and choose New.

---

4. Enter some text in the window and try saving it in the %SystemRoot%\System32 directory. Notepad displays a dialog box indicating a lack of permissions and suggests saving the file in the Documents folder.

![Figure](figures/Winternals7thPt1_page_659_figure_001.png)

5. Accept Notepad's suggestion. You will get the same message box again, and repeatedly for each attempt.

6. Now try saving the file in the Locallow directory of your user profile, shown in an experiment earlier in the chapter.

In the previous experiment, saving a file in the LocalLow directory worked because Notepad

was running with low integrity level, and only the LocalLow directory also had low integrity

level. All the other directories where you tried to save the file had an implicit medium integrity

level. (You can verify this with AccessChk.) However, reading from the %SystemRoot%\System32

directory, as well as opening files within it, did work, even though the directory and its file also

have an implicit medium integrity level.

## Impersonation

Impersonation is a powerful feature Windows uses frequently in its security model. Windows also uses impersonation in its client/server programming model. For example, a server application can provide access to resources such as files, printers, and databases. Clients wanting to access a resource send a request to the server. When the server receives the request, it must ensure that the client has permission to perform the desired operations on the resource. For example, if a user on a remote machine tries to delete a file on an NTFS share, the server exporting the share must determine whether the user is allowed to delete the file. The obvious way to determine whether a user has permission is for the server to query the user's account and group SIDs and scan the security attributes on the file. This approach is tedious to program, prone to errors, and wouldn't permit new security features to be supported transparently. Thus, Windows provides impersonation services to simplify the server's job.

Impersonation lets a server notify the SRM that the server is temporarily adopting the security profile of a client making a resource request. The server can then access resources on behalf of the client, and the SRM carries out the access validation, but it does so based on the impersonated client security context. Usually, a server has access to more resources than a client does and loses some of its security credentials during impersonation. However, the reverse can be true: The server can gain security credentials during impersonation.

A server impersonates a client only within the thread that makes the impersonation request.

Thread-control data structures contain an optional entry for an impersonation token. However, a

642      CHAPTER 7   Security


---

thread's primary token, which represents the thread's real security credentials, is always accessible in the process's control structure.

Windows makes impersonation available through several mechanisms. For example, if a server communicates with a client through a named pipe, the server can use the ImpersonateNamedPipeClient Windows API function to tell the SRM that it wants to impersonate the user on the other end of the pipe. If the server is communicating with the client through Dynamic Data Exchange (DDE) or RPC, it can make similar impersonation requests using DdeImpersonateClient and RpcImpersonateClient. A thread can create an impersonation token that's simply a copy of its process token with the

ImpersonateSelf function. The thread can then alter its impersonation token, perhaps to disable SIDs or privileges. A Security Support Provider Interface (SSPI) package can impersonate its clients with ImpersonateSecurityContext. SSPIs implement a network authentication protocol such as LAN Manager version 2 or Kerberos. Other interfaces such as COM expose impersonation through APIs of their own, such as CoImpersonateClient.

After the server thread finishes its task, it reverts to its primary security context. These forms of imper sonation are convenient for carrying out specific actions at the request of a client and for ensuring that

object accesses are audited correctly. (For example, the audit that is generated gives the identity of the

impersonated client rather than that of the server process.) The disadvantage to these forms of imperson ation is that they can’t execute an entire program in the context of a client. In addition, an impersonation

token can’t access files or printers on network shares unless it is a delegation-level impersonation (de scribed shortly) and has sufficient credentials to authenticate to the remote machine, or the file or printer

share supports null sessions. (A null session is one that results from an anonymous logon.)

If an entire application must execute in a client's security context or must access network resources without using impersonation, the client must be logged on to the system. The LogonUser Windows API function enables this action. LogonUser takes an account name, a password, a domain or computer name, a logon type (such as interactive, batch, or service), and a logon provider as input, and it returns a primary token. A server thread can adopt the token as an impersonation token, or the server can start a program that has the client's credentials as its primary token. From a security standpoint, a process created using the token returned from an interactive logon via LogonUser, such as with the CreateProcessAsUser API, looks like a program a user starts by logging on to the machine interactively. The disadvantage to this approach is that a server must obtain the user's account name and password. If the server transmits this information across the network, the server must encrypt it securely so that a malicious user snooping network traffic can't capture it.

To prevent the misuse of impersonation, Windows doesn't let servers perform impersonation without a client's consent. A client process can limit the level of impersonation that a server process can perform by specifying a security quality of service (SQoS) when connecting to the server. For instance, when opening a named pipe, a process can specify SECURITY_ANONYMOUS, SECURITY_IDENTIFICATION, SECURITY_IMPERSONATION, or SECURITY_DELETION as flags for the Windows CreateFile function. These same options apply to other impersonation-related functions listed earlier. Each level lets a server perform different types of operations with respect to the client's security context:

- ■ SecurityAnonymous This is the most restrictive level of impersonation. The server can't imper-

sonate or identify the client.
CHAPTER 7   Security      643


---

- ■ SecurityIdentification This lets the server obtain the identity (the SIDs) of the client and
the client's privileges, but the server can't impersonate the client.
■ SecurityImpersonation This lets the server identify and impersonate the client on the
local system.
■ SecurityDelegation This is the most permissive level of impersonation. It lets the server
impersonate the client on local and remote systems.
Other interfaces such as RPC use different constants with similar meanings (for example, RPC_C_


IMP_LEVEL_IMPERSONATE).


1

If the client doesn't set an impersonation level, Windows chooses the SecurityImpersonation

level by default. The CreateFile function also accepts SECURITY_EFFECTIVE_ONLY and SECURITY_

CONTEXT_TRACKING as modifiers for the impersonation setting:

- ■ SECURITY_EFFECTIVE_ONLY  This prevents a server from enabling or disabling a client's privi-
leges or groups while the server is impersonating.
■ SECURITY_CONTEXT_TRACKING  This specifies that any changes a client makes to its security con-
text are reflected in a server that is impersonating it. If this option isn't specified, the server adopts
the context of the client at the time of the impersonation and doesn't receive any changes. This
option is honored only when the client and server processes are on the same system.
To prevent spoofing scenarios in which a low-integrity process could create a user interface that captured user credentials and then used LogonUser to obtain that user's token, a special integrity policy applies to impersonation scenarios: a thread cannot impersonate a token of higher integrity than its own. For example, a low-integrity application cannot spoof a dialog box that queries administrative credentials and then attempt to launch a process at a higher privilege level. The integrity-mechanism policy for impersonation access tokens is that the integrity level of the access token that is returned by LSalogonUser must be no higher than the integrity level of the calling process.

## Restricted tokens

A restricted token is created from a primary or impersonation token using the CreateRestrictedToken

function. The restricted token is a copy of the token it's derived from, with the following possible

modifications:

- Privileges can be removed from the token's privilege array.

SIDs in the token can be marked as deny-only. These SIDs remove access to any resources for
which the SID's access is denied by using a matching access-denied ACE that would other-
wise be overridden by an ACE granting access to a group containing the SID earlier in the
security descriptor.

SIDs in the token can be marked as restricted. These SIDs are subject to a second pass of the
access-check algorithm, which will parse only the restricted SIDs in the token. The results of
both the first pass and the second pass must grant access to the resource or no access is granted
to the object.

APTEP 7 Security

From the Library of M
---

Restricted tokens are useful when an application wants to impersonate a client at a reduced security

level, primarily for safety reasons when running untrusted code. For example, the restricted token can

have the shutdown-system privilege removed from it to prevent code executed in the restricted token's

security context from rebooting the system.

## Filtered admin token

As you saw earlier, restricted tokens are also used by UAC to create the filtered admin token that all user applications will inherit. A filtered admin token has the following characteristics:

- The integrity level is set to medium.
The administrator and administrator-like SIDs mentioned previously are marked as deny-only
to prevent a security hole if the group were to be removed altogether. For example, if a file
had an access control list (ACL) that denied the Administrators group all access but granted
some access to another group the user belongs to, the user would be granted access if the
Administrators group was absent from the token, which would give the standard user version
of the user's identity more access than the user's administrator identity.
All privileges are stripped except Change Notify, Shutdown, Undock, Increase Working Set,
and Time Zone.
## EXPERIMENT: Looking at filtered admin tokens

You can make Explorer launch a process with either the standard user token or the administrator token by following these steps on a machine with UAC enabled:

- 1. Log on to an account that's a member of the Administrators group.

2. Open the Start menu, type command, right-click the Command Prompt option that

appears, and choose Run as Administrator to run an elevated command prompt.

3. Run a new instance of cmd.exe, but this time do it normally (that is, not elevated).

4. Run Process Explorer elevated, open the Properties dialog boxes for the two command

prompt processes, and click the Security tabs. Note that the standard user token con-

tains a deny-only SID and a medium mandatory label, and that it has only a couple of

privileges. The properties on the right in the following screenshot are from a command

prompt running with an administrator token, and the properties on the left are from

one running with the filtered administrator token:
---

![Figure](figures/Winternals7thPt1_page_663_figure_000.png)

## Virtual service accounts

Windows provides a specialized type of account known as a virtual service account (or simply virtual

account) to improve the security isolation and access control of Windows services with minimal ad ministrative effort. (See Chapter 9 in Part 2 for more information on Windows services.) Without this

mechanism, Windows services must run under one of the accounts defined by Windows for its built-in

services (such as Local Service or Network Service) or under a regular domain account. The accounts

such as Local Service are shared by many existing services and so offer limited granularity for privilege

and access control; furthermore, they cannot be managed across the domain. Domain accounts require

periodic password changes for security, and the availability of services during a password-change cycle

might be affected. Furthermore, for best isolation, each service should run under its own account, but

with ordinary accounts this multiplies the management effort.

With virtual service accounts, each service runs under its own account with its own security ID. The name of the account is always NT SERVICE! followed by the internal name of the service. Virtual service accounts can appear in access control lists and can be associated with privileges via Group Policy like any other account name. They cannot, however, be created or deleted through the usual accountmanagement tools, nor assigned to groups.

Windows automatically sets and periodically changes the password of the virtual service account. Similar to the Local System and Other Service Accounts, there is a password, but the password is unknown to the system administrators.

646 CHAPTER 7 Security


---

## EXPERIMENT: Using virtual service accounts

You can create a service that runs under a virtual service account by using the Service Control

(Sc.exe) tool. Follow these steps:

1. In an Administrator command prompt, type the create command in the Sc.exe commandline tool to create a service and a virtual account in which it will run. This example uses the srvany service from the Windows 2003 resource kit, which you can download here: https://www.microsoft.com/en-us/download/details.aspx?id=17657.

```bash
C:\Windows\system32-sc create srvany obj= "NT SERVICE\srvany" binPath=
"c:\temp\srvany.exe"
[SC] CreateService SUCCESS
```

2. The previous command created the service (in the registry and in the service controller

manager's internal list) and created the virtual service account. Now run the Services

MMC snap-in (services.msc), select the new service, and open its Properties dialog box.

![Figure](figures/Winternals7thPt1_page_664_figure_005.png)

3. Click the Log On tab

![Figure](figures/Winternals7thPt1_page_664_figure_007.png)

---

4. You can use the service's Properties dialog box to create a virtual service account for an existing service. To do so, change the account name to NT SERVICE servicename in the This Account field and clear both password fields. Note, however, that existing services might not run correctly under a virtual service account because the account might not have access to files or other resources needed by the service.

5. If you run Process Explorer and view the Security tab in the Properties dialog box for a service that uses a virtual account, you can observe the virtual account name and its security ID (SID). To try this, in the Properties dialog box of the srvany service, enter the command-line arguments notepad.exe. (srvany can be used to turn normal executables into services, so it must accept some executable on the command line.) Then click the Start button to start the service.

![Figure](figures/Winternals7thPt1_page_665_figure_002.png)

6. The virtual service account can appear in an access control entry for any object (such as

a file) the service needs to access. If you click the Security tab in a file's Properties dia log box and create an ACL that references the virtual service account, you will find that

the account name you typed (for example, NT SERVICE\srvany) is changed to simply the

service name (srvany) by the Check Names function, and it appears in the access control

list in this shortened form.

648    CHAPTER 7   Security


---

![Figure](figures/Winternals7thPt1_page_666_figure_000.png)

7. The virtual service account can be granted permissions (or user rights) via Group Policy.

In this example, the virtual account for the srvany service has been granted the right to

create a pagefile (using the Local Security Policy editor, secpol.msc).

![Figure](figures/Winternals7thPt1_page_666_figure_002.png)

CHAPTER 7   Security      649

---

8. You won't see the virtual service account in user-administration tools like uslmgr.msc because it is not stored in the SAM registry hive. However, if you examine the registry within the context of the built-in System account (as described previously), you will see evidence of the account in the HKLM\Security\Policy\Secrets key:

```bash
C:\>pexec -s -i -d regedit.exe
```

![Figure](figures/Winternals7thPt1_page_667_figure_002.png)

## Security descriptors and access control

Tokens, which identify a user's credentials, are only part of the object security equation. Another part of

the equation is the security information associated with an object, which specifies who can perform what

actions on the object. The data structure for this information is called a security descriptor. A security

descriptor consists of the following attributes:

- ■ Revision number This is the version of the SRM security model used to create the descriptor.
■ Flags These are optional modifiers that define the behavior or characteristics of the descriptor.
These flags are listed in Table 7-5 (most are documented in the Windows SDK).
■ Owner SID This is the owner's SID.
■ Group SID This is the SID of the primary group for the object (used only by the POSIX subsys-
tem, now unused since POSIX is no longer supported).
■ Discretionary access control list (DACL) This specifies who has what access to the object.
■ System access control list (SACL) This specifies which operations by which users should be
logged in the security audit log and the explicit integrity level of an object.
650 CHAPTER 7 Security

---

TABLE 7-5 Security descriptor flags

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>SE_OWNER_DEFAULTED</td><td>This indicates a security descriptor with a default owner security identifier (SID). Use this bit to find all the objects that have default owner permis-sions set.</td></tr><tr><td>SE_GROUP_DEFAULTED</td><td>This indicates a security descriptor with a default group SID. Use this bit to find all the objects that have default group permissions set.</td></tr><tr><td>SE DACL_PRESENT</td><td>This indicates a security descriptor that has a DACL. If this flag is not set, or if this flag is set and the DACL is NULL, the security descriptor allows full access to everyone.</td></tr><tr><td>SE DACL_DEFAULTED</td><td>This indicates a security descriptor with a default DACL. For example, if an object creator does not specify a DACL, the object receives the default DACL from the access token of the creator. This flag can affect how the sys-tem treats the DACL with respect to access control entry (ACE) inheritance. The system ignores this flag if the SE DACL_PRESENT flag is not set.</td></tr><tr><td>SE ACL_PRESENT</td><td>This indicates a security descriptor that has a system access control list (SACL).</td></tr><tr><td>SE ACL_DEFAULTED</td><td>This indicates a security descriptor with a default SACL. For example, if an object creator does not specify a DACL, the object receives the default SACL from the access token of the creator. This flag can affect how the sys-tem treats the DACL with respect to access control entry (ACE) inheritance. The system ignores this flag if the SE ACL_PRESENT flag is not set.</td></tr><tr><td>SE DACL_UNTRUSTED</td><td>This indicates the DACL pointed to by the DACL of the security descrip-tion was provided by an untrusted source. If this flag is set and a com-pound ACE is encountered, the system will substitute known valid SIDs for the server SIDs in the ACE.</td></tr><tr><td>SE SERVER_SECURITY</td><td>This requests that the provider for the object protected by the security descriptor be a server ACL based on the input ACL, regardless of its source (explicit or default). This is done by replacing all the GRANT ACBs with compound ACBs granting the current server access. This is flagged only if the security descriptor is protected.</td></tr><tr><td>SE DACL_AUTO_INHERITED_REQ</td><td>This requests that the provider for the object protected by the security descriptor automatically propagates the DACL to existing child objects. If the provider supports automatic inheritance, the DACL is propagated to any existing child objects, and the SE_DACL_AUTO_INHERITED bit in the security descriptors of the parent object and child objects is set.</td></tr><tr><td>SE DACL_AUTO_INHERITED_REQ</td><td>This request that the provider for the object protected by the DACL is set up to support automatic propagation of inheritable ACEs to existing child objects. The system sets this bit when it performs the automatic inheritance algorithm for the object and its existing child objects.</td></tr><tr><td>SE DACL_AUTO_INHERITED_REQ</td><td>This request that the provider for the object protected by the DACL is set up to support automatic propagation of inheritable ACEs to existing child objects. The system sets this bit when it performs the automatic inheritance algorithm for the object and its existing child objects.</td></tr><tr><td>SE DACL_PROTECTED</td><td>This prevents the DACL of a security descriptor from being modified by inheritable ACEs.</td></tr><tr><td>SE DACL_PROTECTED</td><td>This prevents the DACL of a security descriptor from being modified by inheritable ACEs.</td></tr></table>

CHAPTER 7 Security 651


---

TABLE 7-5 Security descriptor flags (continued)

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>SE_RM_CONTROL_VALID</td><td>This indicates that the resource control manager bits in the security descriptor are valid. The resource control manager bits are 8 bits in the security descriptor structure that contains information specific to the resource manager accessing the structure.</td></tr><tr><td>SE_SELF_RELATIVE</td><td>This indicates a security descriptor in self-relative format, with all the security information in a contiguous block of memory. If this flag is not set, the security descriptor is in absolute format.</td></tr></table>


Security descriptors (SDs) can be retrieved programmatically by using various functions, such as GetSecurityInfo, GetKernelObjectSecurity, GetFileSecurity, GetNamedSecurityInfo, and other more esoteric functions. After retrieval, the SD can be manipulated and then the relevant Set function called to make the change. Furthermore, a security descriptor can be constructed using a string in a language called Security Descriptor Definition Language (SDDL), which is capable of representing a security descriptor using a compact string. This string can be converted to a true SD by calling ConvertStringSecurityDescriptorToSecurityDescriptor. As you might expect, the converse function exists as well (ConvertSecurityDescriptorToStringSecurityDescriptor). See the Windows SDK for a detailed description of the SDDL.

An access control list (ACL) is made up of a header and zero or more access control entry (ACE) structures. There are two types of ACLs: DACLs and SACLs. In a DACL, each ACE contains a SID and an access mask (and a set of flags, explained shortly), which typically specifies the access rights (read, write, delete, and so forth) that are granted or denied to the holder of the SID. There are nine types of ACEs that can appear in a DACL: access allowed, access denied, allowed object, denied object, allowed callback, denied callback, allowed object callback, denied-object callback, and conditional claims. As you would expect, the access-allowed ACE grants access to a user, and the access-denied ACE denies the access rights specified in the access mask. The callback ACEs are used by applications that make use of the Auth2 API (described later) to register a callback that AuthZ will call when it performs an access check involving this ACE.

The difference between allowed object and access allowed, and between denied object and access denied, is that the object types are used only within Active Directory. ACEs of these types have a globally unique identifier (GUID) field that indicates that the ACE applies only to particular objects or subobjects (those that have GUID identifiers). (A GUID is a 128-bit identifier guaranteed to be universally unique.) In addition, another optional GUID indicates what type of child object will inherit the ACE when a child is created within an Active Directory container that has the ACE applied to it. The conditional claims ACE is stored in a*-callback type ACE structure and is described in the section on the Auth2 APIs.

The accumulation of access rights granted by individual ACEs forms the set of access rights granted

by an ACL. If no DACL is present (a null DACL) in a security descriptor, everyone has full access to the

object. If the DACL is empty (that is, it has zero ACEs), no user has access to the object.

---

The ACEs used in DACLs also have a set of flags that control and specify characteristics of the ACE related to inheritance. Some object namespaces have containers and objects. A container can hold other container objects and leaf objects, which are its child objects. Examples of containers are directories in the file system namespace and keys in the registry namespace. Certain flags in an ACE control how the ACE propagates to child objects of the container associated with the ACE. Table 7-6, reproduced in part from the Windows SDK, lists the inheritance rules for ACE flags.

TABLE 7-6 Inheritance rules for ACE flags

<table><tr><td>Flag</td><td>Inheritance Rule</td></tr><tr><td>CONTAINER_INHERIT_ACE</td><td>Child objects that are containers, such as directories, inherit the ACE as an effective ACE. The inherited ACE is inheritable unless the NO_PROPAGATE_INHERIT_ACE bit flag is also set.</td></tr><tr><td>INHERIT_ONLY_ACE</td><td>This flag indicates an inherit-only ACE that doesn&#x27;t control access to the object it&#x27;s attached to. If this flag is not set, the ACE controls access to the object to which it is attached.</td></tr><tr><td>INHERITED_ACE</td><td>This flag indicates that the ACE was inherited. The system sets this bit when it propagates an inheritable ACE to a child object.</td></tr><tr><td>NO_PROPAGATE_INHERIT_ACE</td><td>If the ACE is inherited by a child object, the system clears the OBJECT_INHERIT_ACE and CONTAINER_INHERIT_ACE flags in the inherited ACE. This action prevents the ACE from being inherited by subsequent generations of objects.</td></tr><tr><td>OBJECT_INHERIT_ACE</td><td>Non-container child objects inherit the ACE as an effective ACE. For child objects that are containers, the ACE is inherited as an inherit-only ACE unless the NO_PROPAGATE_INHERIT_ACE bit flag is also set.</td></tr></table>


A SACL contains two types of ACEs: system audit ACEs and system audit-object ACEs. These ACEs specify which operations performed on the object by specific users or groups should be audited. Audit information is stored in the system audit log. Both successful and unsuccessful attempts can be audited. Like their DACL object-specific ACE cousins, system audit-object ACEs specify a GUID indicating the types of objects or sub-objects that the ACE applies to and an optional GUID that controls propagation of the ACE to particular child object types. If a SACL is null, no auditing takes place on the object. (Security auditing is described later in this chapter.) The inheritance flags that apply to DACL ACEs also apply to system audit and system audit-object ACEs.

Figure 7-8 is a simplified picture of a file object and its DACL. As shown, the first ACE allows USER1 to read the file. The second ACE denies members of the group TEAM1 write access to the file. The third ACE grants all other users (Everyone) execute access.

![Figure](figures/Winternals7thPt1_page_670_figure_005.png)

FIGURE 7-8 Discretionary access control list (DACL).

---

## EXPERIMENT: Viewing a security descriptor

Most executive subsystems rely on the object manager's default security functionality to manage security descriptors for their objects. The object manager's default security functions use the security descriptor pointer to store security descriptors for such objects. For example, the process manager uses default security, so the object manager stores process and thread security descriptors in the object headers of process and thread objects, respectively. The security descriptor pointer of events, mutexes, and semaphores also store their security descriptors. You can use live kernel debugging to view the security descriptors of these objects once you locate their object header, as outlined in the following steps. (Note that both Process Explorer and AccessChk can also show security descriptors for processes.)

1. Start local kernel debugging.

2. T ype !process 0 0 explorer.exe to obtain process information about Explorer:

```bash
!kb !process 0 0 explorer.exe
PROCESS ffffe18304dfd780
    SessionId: 1 Cid: 23e4    Peb: 00c2a000  ParentCid: 2264
    DirBase: 2aa0f6000  ObjectTable: ffffcd82c72fcd80  HandleCount:
<Data Not Accessible>
    Image: explorer.exe
PROCESS ffffel830670a080
    SessionId: 1 Cid: 27b8    Peb: 00950000  ParentCid: 035c
    DirBase: 2cba97000  ObjectTable: ffffcd82c7ccc500  HandleCount:
<Data Not Accessible>
    Image: explorer.exe
```

3. If more than one instance of explorer is listed, choose one. (It doesn't matter which.)

Type I object with the address of the PROCESS in the output of the previous command

as the argument to show the object data structure:

```bash
!kb!_object ffffe18304dfd780
Object: ffffccc40dfd780 Type: (ffffe182f7496690) Process
    ObjectHeader: fffffe18304dfd750 (new version)
    HandleCount: 15   PointerCount: 504639
```

4. T ype dt_OBJECT_HEADER and the address of the object header field from the previ ous command's output to show the object header data structure, including the security

descriptor pointer value:

```bash
1kbd dt ntl_object_header ffffe18304dfd750
+0x000 PointerCount : O050448
+0x008 HandleCount : O1N5
+0x008 NextToFree      : 0x00000000'0000000f Void
+0x010 Lock                : _EX_PUSH_LOCK
+0x018 TypeIndex           : 0xE5  ''
+0x019 TraceFlags         : O ''
+0x019 DbgRefTrace       : 0yO
+0x019 DbgTracePermanent : 0yO
```

---

```bash
+0x01a InfoMask       : 0x88 ''
+0x01b Flags          : 0 ''
+0x01b NewObject      : 0y0
+0x01b KernelObject    : 0y0
+0x01b KernelOnlyAccess : 0y0
+0x01b ExclusiveObject   : 0y0
+0x01b PermanentObject : 0y0
+0x01b DefaultSecurityQuota : 0y0
+0x01b SingleHandleEntry : 0y0
+0x01b DeletedInline    : 0y0
+0x01c Reserved         : 0x30003100
+0x020 ObjectCreateInfo : 0xFFFFfe181'09e84ac0 _OBJECT_CREATE_INFORMATION
+0x020 QuotaBlockCharged : 0xFFFFfe183'09e84ac0 Void
+0x028 SecurityDescriptor : 0xfffffd82'cd0e97ed Void
+0x030 Body             : _QUAD
```

5. Finally, use the debugger's !sd command to dump the security descriptor. The security descriptor pointer in the object header uses some of the low-order bits as flags, and these must be zeroed before following the pointer. On 32-bit systems there are three flag bits, so use & -8 with the security descriptor address displayed in the object header structure, as follows. On 64-bit systems there are four flag bits, so you use & -10 instead.

```bash
!kdz !sd 0xfffffd82'dc0e97ed & -10
->Revision: 0x1
->Sbz1   : 0x0
->Control : 0x8814
        SE_DACL_PRESENT
        SE_SACL_PRESENT
        SE_SACL_AUTO_INHERITED
        SE_SFLE_RELATIVE
->Owner  : S-1-5-21-3537846094-3055369412-2967912182-1001
->Group  : S-1-5-21-3537846094-3055369412-2967912182-1001
->DacI   :      :
->DacI   :      :-AclRevision: 0x2
->DacI   :      :-Sbz1 : 0x0
->DacI   :      :-AclSize : 0x5c
->DacI   :      :-AceCount : 0x3
->DacI   :      :-SBZ1 : 0x0
->DacI   :      :-Ace[0] : -AceType: ACCESS_ALLOWED_ACE_TYPE
->DacI   :      :-Ace[0] : -AceFlags: 0x0
->DacI   :      :-Ace[0] : -AceSize: 0x24
->DacI   :      :-Ace[0] : -Mask : 0x001FFFFF
->DacI   :      :-Ace[0] :-SID: S-1-5-21-3537846094-3055369412-2967912182-
->DacI   :      :-Ace[1] : -AceType: ACCESS_ALLOWED_ACE_TYPE
->DacI   :      :-Ace[1] : -AceFlags: 0x0
->DacI   :      :-Ace[1] :-AceSize: 0x14
->DacI   :      :-Ace[1] : -Mask : 0x001FFFFF
->DacI   :      :-Ace[1] :-SID: S-1-5-18
->DacI   :      :-Ace[2] :-AceType: ACCESS_ALLOWED_ACE_TYPE
```

CHAPTER 7   Security      655

---

```bash
->Dac1 :  ->Ace[2] : ->AceFlags: 0x0
->Dac1 :  ->Ace[2] : ->AceSize: 0x1c
->Dac1 :  ->Ace[2] : ->Mask : 0x00121411
->Dac1 :  ->Ace[2] : ->SID: S-1-5-5-0-1745560
->Sac1 :
->Sac1 :  ->AclRevision: 0x2
->Sac1 :  ->Sb21 :    : 0x0
->Sac1 :  ->AclSize : 0x1c
->Sac1 :  ->AceCount : 0x1
->Sac1 :  ->Sb22 :    : 0x0
->Sac1 :  ->Ace[0] : ->AceType: SYSTEM_MANDATORY_LABEL_ACE_TYPE
->Sac1 :  ->Ace[0] : ->AceFlags: 0x0
->Sac1 :  ->Ace[0] : ->Acesize: 0x14
->Sac1 :  ->Ace[0] : ->Mask : 0x00000003
->Sac1 :  ->Ace[0] : ->SID: S-1-16-8192
```

The security descriptor contains three access-allowed ACES: one for the current user (S-1-5-213537846094-3055369412-2967912182-1001), one for the System account (S-1-5-18), and the last for the Logon SID (S-1-5-0-01745560). The system access control list has one entry (S-1-16-8192) labeling the process as medium integrity level.

## ACL assignment

To determine which DACL to assign to a new object, the security system uses the first applicable rule of the following four assignment rules:

- 1. If a caller explicitly provides a security descriptor when creating the object, the security system applies it to the object. If the object has a name and resides in a container object (for example, a named event object in the \BaseNamedObjects object manager namespace directory), the system merges any inheritable ACEs (ACEs that might propagate from the object's container) into the DACL unless the security descriptor has the SE_DACL_PROTECTED flag set, which prevents inheritance.

2. If a caller doesn't supply a security descriptor and the object has a name, the security system looks at the security descriptor in the container in which the new object name is stored. Some of the object directory's ACEs might be marked as inheritable, meaning they should be applied to new objects created in the object directory. If any of these inheritable ACEs are present, the security system forms them into an ACL, which it attaches to the new object. (Separate flags indicate ACEs that should be inherited only by container objects rather than by objects that aren't containers.)

3. If no security descriptor is specified and the object doesn't inherit any ACEs, the security system retrieves the default DACL from the caller's access token and applies it to the new object. Several subsystems on Windows have hard-coded DACLs that they assign on object creation (for example, services, LSA, and SAM objects).

4. If there is no specified descriptor, no inherited ACEs, and no default DACL, the system creates the object with no DACL, which allows everyone (all users and groups) full access to the object. This rule is the same as the third rule, in which a token contains a null default DACL.



CHAPTER 7   Security

From the Library of M
---

The rules the system uses when assigning a SACL to a new object are similar to those used for DACL

assignment, with some exceptions:

- <table><tr><td>•</td><td>Inherited system audit ACEs don’t propagate to objects with security descriptors marked with the SE_SACL_PROTECTED flag (similar to the SE_DACL_PROTECTED flag, which protects DACLs).</td></tr><tr><td>•</td><td>If there are no specified security audit ACEs and there is no inherited SACL, no SACL is applied to the object. This behavior is different from that used to apply default DACLs because tokens don’t have a default SACL.</td></tr></table>
When a new security descriptor containing inheritable ACEs is applied to a container, the system automatically propagates the inheritable ACEs to the security descriptors of child objects. (Note that a security descriptor's DACL doesn't accept inherited DACLACEs if its SE_DACL_PROTECTED flag is enabled, and its SACL doesn't inherit SACL ACEs if the descriptor has the SE_SACL_PROTECTED flag set.) The order in which inheritable ACEs are merged with an existing child object's security descriptor is such that any ACEs that were explicitly applied to the ACL are kept ahead of ACEs that the object inherits. The system uses the following rules for propagating inheritable ACEs:

- ■ If a child object with no DACL inherits an ACE, the result is a child object with a DACL containing
only the inherited ACE.

■ If a child object with an empty DACL inherits an ACE, the result is a child object with a DACL
containing only the inherited ACE.

■ For objects in Active Directory only, if an inheritable ACE is removed from a parent object, auto-
matic inheritance removes any copies of the ACE inherited by child objects.

■ For objects in Active Directory only, if automatic inheritance results in the removal of all ACEs
from a child object's DACL, the child object has an empty DACL rather than no DACL.
As you'll soon discover, the order of ACEs in an ACL is an important aspect of the Windows security model.

![Figure](figures/Winternals7thPt1_page_674_figure_005.png)

Note Inheritance is generally not directly supported by the object stores, such as file systems, the registry, or Active Directory. Windows APIs that support inheritance, including SetEntriesInAct, do so by invoking appropriate functions within the security inheritance support DLL (%SystemRoot%\System32\Ntmarta.dll) that know how to traverse those object stores.

## Trust ACEs

The advent of protected processes and Protected Processes Light (PPL, discussed in Chapter 3) created a need for such a process to make objects as accessible by protected processes only. This is important to protect certain resources such as the KnownD1.s registry key from tampering, even by admin-level code. Such ACEs are specified with well-known SIDs that provide the protection level and signer that is required to obtain access. Table 7-7 shows the SIDs and their level and meaning.

CHAPTER 7   Security      657


---

TABLE 7-7   Trust SIDs

<table><tr><td>SID</td><td>Protection Level</td><td>Protection Signer</td></tr><tr><td>1-19-512-0</td><td>Protected Light</td><td>None</td></tr><tr><td>1-19-512-4096</td><td>Protected Light</td><td>Windows</td></tr><tr><td>1-19-512-8192</td><td>Protected Light</td><td>WinTcb</td></tr><tr><td>1-19-1024-0</td><td>Protected</td><td>None</td></tr><tr><td>1-19-1024-4096</td><td>Protected</td><td>Windows</td></tr><tr><td>1-19-1024-8192</td><td>Protected</td><td>WinTcb</td></tr></table>


A trust SID is part of a token object that exists for tokens attached to protected or PPL processes.


The higher the SID number, the more powerful the token is. (remember that Protected is higher than


Protected Light).

## EXPERIMENT: Viewing trust SIDs

In this experiment, you'll look at trust SIDs in tokens of protected processes.

Start local kernel debugging.

List Csrss.exe processes with basic information:

```bash
!kb< !process 0 1 csrss.exe
PROCESS ffff8188e50b5780
    SessionId: 0 Cid: 0358    Peb: b3a9f5e000  ParentCid: 02ec
        DirBase: 1273a3000  ObjectTable: ffffbe0d829e2040  HandleCount:
 <Data Not Accessible>
        Image: csrss.exe
        VadRoot ffff8188e6ccc8e0 Vads 159 Clone 0 Private 324. Modified 4470.
        Locked 0.
        DeviceMap ffffbe0d70c15620
        Token                ffffbe0d829e7060
        ...
PROCESS ffff8188e7a92080
        SessionId: 1 Cid: 03d4    Peb: d5b0de4000  ParentCid: 03bc
        DirBase: 162d93000  ObjectTable: ffffbe0d8362d7c0  HandleCount:
 <Data Not Accessible>Modified 462372. Locked 0.
        DeviceMap ffffbe0d70c15620
        Token                ffffbe0d8362d060
        ...
```

Select one of the tokens and show its details:

```bash
!kb!_token ffffbe0d829e7060
_TOKEN 0xffffbe0d829e7060
TS Session ID: 0
User: S-1-5-18
...
Process Token TrustLevelSid: S-1-19-512-8192
```

That's a PPL with a WinTcb signer.

---

## Determining access

Two methods are used for determining access to an object:

- The mandatory integrity check, which determines whether the integrity level of the caller is
high enough to access the resource, based on the resource's own integrity level and its manda-
tory policy.
The discretionary access check, which determines the access that a specific user account has to
an object.
When a process tries to open an object, the integrity check takes place before the standard

Windows DACL check in the kernel's SeaSenseCheck function because it is faster to execute and can

quickly eliminate the need to perform the full discretionary access check. Given the default integrity

policies in its access token (TOKEN_MANDATORY_NO_WRITE_UP and TOKEN_MANDATORY_NEW_PROCESS_

MIN, described previously), a process can open an object for write access if its integrity level is equal to

or higher than the object's integrity level and the DACL also grants the process the accesses it desires.

For example, a low-integrity-level process cannot open a medium-integrity-level process for write ac cess, even if the DACL grants the process write access.

With the default integrity policies, processes can open any object—with the exception of process, thread, and token objects—for read access as long as the object's DACL grants them read access. That means a process running at low integrity level can open any files accessible to the user account in which it's running. Protected Mode Internet Explorer uses integrity levels to help prevent malware that infects it from modifying user account settings, but it does not stop malware from reading the user's documents.

Recall that process, thread, and token objects are exceptions because their integrity policy also includes No-Read-Up. That means a process integrity level must be equal to or higher than the integrity level of the process or thread it wants to open, and the DACL must grant it the access it wants for an attempt to open it to succeed. Assuming the DACLs allow the desired access, Table 7-8 shows the types of access that processes running at various integrity levels have to other processes and objects.

TABLE 7-8 Accessing objects and processes based on integrity level

<table><tr><td>Accessing Process</td><td>Access to Objects</td><td>Access to Other Processes</td></tr><tr><td>High integrity level</td><td>Read/write to all objects with integrity level of High or lowerRead access to objects with integrity level of System</td><td>Read/write access to all processes with High or lower integrity levelNo read/write access to processes with System integrity level</td></tr><tr><td>Medium integrity level</td><td>Read/write to all objects with integrity level of Medium or LowRead access to objects with integrity level of High or System</td><td>Read/write access to all processes with Medium or Low integrity levelNo read/write access to processes with High or System integrity level</td></tr><tr><td>Low integrity level</td><td>Read/write to all objects with integrity level of LowRead access to objects with integrity level of Medium or higher</td><td>Read/write access to all processes with Low integrity levelNo read/write access to processes with Medium or higher integrity level</td></tr></table>


---

![Figure](figures/Winternals7thPt1_page_677_figure_000.png)

Note The read access to a process described in this section means full read access, such as

reading the contents of the process address space. No-Read-Up does not prevent opening a

higher-integrity-level process from a lower one for a more limited access, such as PROCESS_

QUERY_LIMITED_INFORMATION, which provides only basic information about the process.

## User Interface Privilege Isolation

The Windows messaging subsystem also honors integrity levels to implement User Interface

Privilege Isolation (UIPI). The subsystem does this by preventing a process from sending window

messages to the windows owned by a process having a higher integrity level, with the following

informational messages being exceptions:

- ■ WM_NULL

■ WM_MOVE

■ WM_SIZE

■ WM_GETTEXT

■ WM_GETTEXTLENGTH

■ WM_GETTHOTKEY
- ■ WM_GETICON

■ WM_RENDERFORMAT

■ WM_DRAWCLIPBOARD

■ WM_CHANGECBCHAIN

■ WM_THEMECHANGED
This use of integrity levels prevents standard user processes from driving input into the windows

of elevated processes or from performing a shatter attack (such as sending the process mal formed messages that trigger internal buffer overflows, which can lead to the execution of code

at the elevated process's privilege level). UIPi also blocks window hooks (SetWi ndowsHookEx API)

from affecting the windows of higher-integrity-level processes so that a standard user process

can't log the keystrokes the user types into an administrative application, for example. Journal

hooks are also blocked in the same way to prevent lower-integrity-level processes from monitor ing the behavior of higher-integrity-level processes.

Processes (running with medium or higher integrity level only) can choose to allow additional

messages to pass the guard by calling the ChangeWindowMessageFilterEx API. This function

is typically used to add messages required by custom controls to communicate outside native

common controls in Windows. An older API, ChangeWindowMessageFilter, performs a similar

function, but it is per-process rather than per-window. With ChangeWindowMessageFilter, it is

possible for two custom controls inside the same process to be using the same internal window

messages, which could lead to one control's potentially malicious window message to be allowed

through, simply because it happens to be a query-only message for the other custom control.

Because accessibility applications such as the On-Screen Keyboard (Osk.exe) are subject to UIPI's restrictions (which would require the accessibility application to be executed for each kind of visible integrity-level process on the desktop), these processes can enable UI access. This flag

660 CHAPTER 7 Security


---

can be present in the manifest file of the image and will run the process at a slightly higher integrity level than medium (between 0x2000 and 0x3000) if launched from a standard user account, or at high integrity level if launched from an Administrator account. Note that in the second case, an elevation request won't actually be displayed. For a process to set this flag, its image must also be signed and in one of several secure locations, including %SystemRoot% and %ProgramFiles%.

After the integrity check is complete, and assuming the mandatory policy allows access to the

object based on the caller's integrity, one of two algorithms is used for the discretionary check to an

object, which will determine the outcome of the access check:

- ■ Determine the maximum access allowed to the object, a form of which is exported to user
mode using the AuthZ API (described in the section "The AuthZ API" later in this chapter) or
the older GetEffectiveRightsFromACI function. This is also used when a program specifies
a desired access of MAXIMUM_ALLOWED, which is what the legacy APIs that don't have a desired
access parameter use.

■ Determine whether a specific desired access is allowed, which can be done with the Windows
AccessCheck function or the AccessCheckByType function.
The first algorithm examines the entries in the DACL as follows:

- 1. If the object has no DACL (a null DACL), the object has no protection and the security sys-
tem grants all access, unless the access is from an AppContainer process (discussed in the
"AppContainers" section later in this chapter), which means access is denied.

2. If the caller has the take-ownership privilege, the security system grants write-owner access
before examining the DACL. (Take-ownership privilege and write-owner access are explained
in a moment.)

3. If the caller is the owner of the object, the system looks for an OWNER_RIGHTS SID and uses that SID
as the SID for the next steps. Otherwise, read-control and write-DACL access rights are granted.

4. For each access-denied ACE that contains a SID that matches one in the caller's access token,
the ACE's access mask is removed from the granted-access mask.

5. For each access-allowed ACE that contains a SID that matches one in the caller's access token,
the ACE's access mask is added to the granted-access mask being computed, unless that access
has already been denied.
When all the entries in the DACL have been examined, the computed granted-access mask is re turned to the caller as the maximum allowed access to the object. This mask represents the total set of

access types that the caller will be able to successfully request when opening the object.

The preceding description applies only to the kernel-mode form of the algorithm. The Windows version implemented by GetEffectiveRightsFromAC1 differs in that it doesn’t perform step 2, and it considers a single user or group SID rather than an access token.

CHAPTER 7   Security      661


---

## Owner Rights

Because owners of an object can normally override the security of an object by always being

granted read-control and write-DACL rights, a specialized method of controlling this behavior is

exposed by Windows: the Owner Rights SID.

The Owner Rights SID exists for two main reasons:

- ■ To improve service hardening in the operating system Whenever a service creates an
object at run time, the Owner SID associated with that object is the account the service is
running in (such as local system or local service) and not the actual service SID. This means
that any other service in the same account would have access to the object by being an
owner. The Owner Rights SID prevents that unwanted behavior.
■ To allow more flexibility for specific usage scenarios For example, suppose an admin-
istrator wants to allow users to create files and folders but not to modify the ACLs on those
objects. (Users could inadvertently or maliciously grant access to those files or folders to
unwanted accounts.) By using an inheritable Owner Rights SID, the users can be prevented
from editing or even viewing the ACL on the objects they create. A second usage scenario
relates to group changes. Suppose an employee has been part of some confidential or
sensitive group, has created several files while a member of that group, and has now been
moved from the group for business reasons. Because that employee is still a user, he
could continue accessing the sensitive files.
The second algorithm is used to determine whether a specific access request can be granted based on the caller's access token. Each open function in the Windows API that deal with securable objects has a parameter that specifies the desired access mask, which is the last component of the security equation. T o determine whether the caller has access, the following steps are performed:

1. If the object has no DACL (a null DACL), the object has no protection and the security system

grants the desired access.

2. If the caller has the take-ownership privilege, the security system grants write-owner access

if requested and then examines the DACL. However, if write-owner access was the only access

requested by a caller with take-ownership privilege, the security system grants that access and

never examines the DACL.

3. If the caller is the owner of the object, the system looks for an OOWNER_RIGHTS SID and uses that SID as the SID for the next steps. Otherwise, read-control and write-DACL access rights are granted. If these rights were the only access rights that the caller requested, access is granted without examining the DACL

4. Each ACE in the DACL is examined from first to last. An ACE is processed if one of the following conditions is satisfied:

- • The ACE is an access-deny ACE, and the SID in the ACE matches an enabled SID (SIDs can be

enabled or disabled) or a deny-only SID in the caller's access token.
---

- • The ACE is an access-allowed ACE, and the SID in the ACE matches an enabled SID in the
caller's token that isn't of type deny-only.

• It is the second pass through the descriptor for restricted-SID checks, and the SID in the ACE
matches a restricted SID in the caller's access token.

• The ACE isn't marked as inherit-only.
5. If it is an access-allowed ACE, the rights in the access mask in the ACE that were requested are

granted. If all the requested access rights have been granted, the access check succeeds. If it is

an access-denied ACE and any of the requested access rights are in the denied-access rights,

access is denied to the object.

6. If the end of the DACL is reached and some of the requested access rights still haven't been granted, access is denied.

7. If all accesses are granted but the caller's access token has at least one restricted SID, the system rescans the DACL's ACEs looking for ACEs with access-mask matches for the accesses the user is requesting and a match of the ACE's SID with any of the caller's restricted SIDs. Only if both scans of the DACL grant the requested access rights is the user granted access to the object.

The behavior of both access-validation algorithms depends on the relative ordering of allow and deny ACEs. Consider an object with only two ACEs: one that specifies that a certain user is allowed full access to an object and one that denies the user access. If the allow ACE precedes the deny ACE, the user can obtain full access to the object, but if the order is reversed, the user cannot gain any access to the object.

Several Windows functions, such as SetSecurityInfo and SetNamedSecurityInfo, apply ACEs

in the preferred order of explicit deny ACEs preceding explicit allow ACEs. For example, the security

editor dialog boxes with which you edit permissions on NTFS files and registry keys use these func tions. SetSecurityInfo and SetNamedSecurityInfo also apply ACE inheritance rules to the security

descriptor on which they are applied.

Figure 7-9 shows an example of access validation demonstrating the importance of ACE ordering. In the example, access is denied to a user wanting to open a file even though an ACE in the object's DACL grants the access. This is because the ACE denying the user access (by virtue of the user's membership in the Writers group) precedes the ACE granting access.

![Figure](figures/Winternals7thPt1_page_680_figure_007.png)

---

As stated, because it wouldn't be efficient for the security system to process the DACL every time a process uses a handle, the SRM makes this access check only when a handle is opened, not each time the handle is used. Thus, once a process successfully opens a handle, the security system can't revoke the access rights that have been granted, even if the object's DACL changes. Also keep in mind that because kernel-mode code uses pointers rather than handles to access objects, the access check isn't performed when the operating system uses objects. In other words, the Windows executive trusts itself (and all loaded drivers) in a security sense.

The fact that an object's owner is always granted write-DACL access to an object means that users

can never be prevented from accessing the objects they own. If, for some reason, an object had an

empty DACL (no access), the owner would still be able to open the object with write-DACL access and

then apply a new DACL with the desired access permissions.

## A warning regarding the GUI security editors

When you use the GUI permissions editors to modify security settings on a file, a registry, or an Active Directory object, or on another securable object, the main security dialog box shows you a potentially misleading view of the security that's applied to the object. If you allow Full Control to the Everyone group and deny the Administrator group Full Control, the list might lead you to believe that the Everyone group access-allowed ACE precedes the Administrator deny ACE because that's the order in which they appear. However, as we've said, the editors place deny ACEs before allow ACEs when they apply the ACL to the object.

![Figure](figures/Winternals7thPt1_page_681_figure_004.png)

The Permissions tab of the Advanced Security Settings dialog box shows the order of ACEs

in the DACL. However, even this dialog box can be confusing because a complex DACL can have

deny ACEs for various accesses followed by allow ACEs for other access types.

664 CHAPTER 7   Security


---

![Figure](figures/Winternals7thPt1_page_682_figure_000.png)

The only definitive way to know what access a particular user or group will have to an object (other than having that user or a member of the group try to access the object) is to use the Effective Access tab of the dialog box that is displayed when you click the Advanced button in the Properties dialog box. Enter the name of the user or group you want to check and the dialog box shows you what permissions they are allowed for the object.

![Figure](figures/Winternals7thPt1_page_682_figure_002.png)

CHAPTER 7   Security      665

---

### Dynamic Access Control

The discretionary access control mechanism discussed in previous sections has existed since the first Windows NT version and is useful in many scenarios. There are scenarios, however, where this scheme is not flexible enough. For example, consider a requirement that users accessing a shared file should be allowed to do so if they are using a computer in the workplace, but should not be allowed if accessing the file from their computer at home. There is no way to specify such a condition using an ACE.

Windows 8 and Server 2012 introduced Dynamic Access Control (DAC), a flexible mechanism that can be used to define rules based on custom attributes defined in Active Directory. DAC does not replace the existing mechanism, but adds to it. This means that for an operation to be allowed, both DAC and the classic DACL must grant the permission. Figure 7-10 shows the main aspects of Dynamic Access Control.

![Figure](figures/Winternals7thPt1_page_683_figure_003.png)

FIGURE 7-10  Dynamic Access Control components.

A claim is any piece of information about a user, device (computer in a domain), or resource (generic

attribute) that has been published by a domain controller. Examples of valid claims are a user's title and

department classification, or a file. Any combination of claims can be used in expressions for building

rules. These rules collectively become the central access policy.

DAC configuration is done in Active Directory and pushed through policy. The Kerberos tickets

protocol has been enhanced to support authenticated transport of user and device claims (known as

Kerberos armoring).

## The AuthZ API

The Auth2 Windows API provides authorization functions and implements the same security model as the security reference monitor (SRM), but it implements the model totally in user mode in the %SystemRoot%\System32\Auth2.dll library. This gives applications that want to protect their own private objects, such as database tables, the ability to leverage the Windows security model without incurring the cost of user mode-to-kernel mode transitions that they would make if they relied on the SRM.

The AuthZ API uses standard security descriptor data structures, SIDs, and privileges. Instead of

using tokens to represent clients, AuthZ uses AUTHZ_CLIENT_CONTEXT. AuthZ includes user-mode

equivalents of all access-check and Windows security functions—for example, AuthzAccessCheck is

the AuthZ version of the AccessCheck Windows API that uses the SeAccessCheck SRM function.

666 CHAPTER 7 Security

---

Another advantage available to applications that use AuthZ is that they can direct AuthZ to cache the results of security checks to improve subsequent checks that use the same client context and security descriptor. AuthZ is fully documented in the Windows SDK.

This type of access checking, using a SID and security group membership in a static, controlled environment, is known as Identity-Based Access Control (IBAC), and it requires that the security system know the identity of every possible accessor when the DACI is placed in an object's security descriptor.

Windows includes support for Claims Based Access Control (CBAC), where access is granted not based upon the accessor's identity or group membership, but upon arbitrary attributes assigned to the accessor and stored in the accessor's access token. Attributes are supplied by an attribute provider, such as AppLocker. The CBAC mechanism provides many benefits, including the ability to create a DACL for a user whose identity is not yet known or dynamically calculated user attributes. The CBAC ACE (also known as a conditional ACE) is stored in a ~cal1 back ACK structure, which is essentially private to AuthZ and is ignored by the system SeAccessCheck API. The kernel-mode routine SeSpAccessCheck does not understand conditional ACEs, so only applications calling the AuthZ APIs can make use of CBAC. The only system component that makes use of CBAC is AppLocker, for setting attributes such as path or publisher. Third-party applications can make use of CBAC by taking advantage of the CBAC AuthZ APIs.

Using CBAC security checks allows powerful management policies, such as the following:

- Run only applications approved by the corporate IT department.

Allow only approved applications to access your Microsoft Outlook contacts or calendar.

Allow only people in a particular building on a specific floor to access printers on that floor.

Allow access to an intranet website only to full-time employees (as opposed to contractors).
Attributes can be referenced in what is known as a conditional ACE, where the presence, absence, or

value of one or more attributes is checked. An attribute name can contain any alphanumeric Unicode

characters, as well as the following characters: colon ( : ), forward slash ( \ ), and underscore ( _ ). The value

of an attribute can be one of the following: 64-bit integer, Unicode string, byte string, or array.

## Conditional ACEs

The format of SDDL strings has been expanded to support ACEs with conditional expressions. The

new format of an SDDL string is this: AeceT ype;AeceFlags;Rights;ObjectGuid;InheritsObjectGuid;

AccountSid;(ConditionalExpression).

The AceType for a conditional ACE is either XA (for SDDL_CALLBACK_ACCESS_ALLOWEDED) or XD (for SDDL_CALLBACK_ACCESS_DENIED). Note that ACEs with conditional expressions are used for claimstype authorization (specifically, the AuthZ APIs and AppLocker) and are not recognized by the object manager or file systems.

A conditional expression can include any of the elements shown in Table 7-9.

---

TABLE 7-9 Acceptable Elements for a Conditional Expression

<table><tr><td>Expression Element</td><td>Description</td></tr><tr><td>AttributeName</td><td>Tests whether the specified attribute has a non-zero value.</td></tr><tr><td>existsAttributeName</td><td>Tests whether the specified attribute exists in the client context.</td></tr><tr><td>AttributeName Operator Value</td><td>Returns the result of the specified operation. The following operators are defined for use in conditional expressions to test the values of attributes. All these are binary operators (as opposed to unary) and are used in the form AttributeName Operator Value. The operators are Contains any_of, ==, !=, &lt;, &lt;=, &gt;, &gt;=.</td></tr><tr><td>ConditionalExpression || ConditionalExpression</td><td>Tests whether either of the specified conditional expressions is true.</td></tr><tr><td>ConditionalExpression &amp;amp; ConditionalExpression</td><td>Tests whether both of the specified conditional expressions are true.</td></tr><tr><td>!(ConditionalExpression)</td><td>The inverse of a conditional expression.</td></tr><tr><td>Member_of {SidArray}</td><td>Tests whether the SID_AND_ATTRIBUTES array of the client context contains all the security identifiers (SIDs) in the comma-separated list specified by $SidArray.</td></tr></table>


A conditional ACE can contain any number of conditions. It is ignored if the resultant evaluation of

the condition is false or applied if the result is true. A conditional ACE can be added to an object using

the AddConditionalAce API and checked using the AuthzAccessCheck API.

A conditional ACE could specify that access to certain data records within a program should be granted only to a user who meets the following criteria (for example):

- • Holds the Role attribute, with a value of Architect, Program Manager, or Development Lead,
and the Division attribute with a value of Windows

• Whose ManagementChain attribute contains the value John Smith

• Whose CommissionType attribute is Officer and whose PayGrade attribute is greater than 6
(that is, the rank of General Officer in the US military)
Windows does not include tools to view or edit conditional ACEs.

## Account rights and privileges

Many operations performed by processes as they execute cannot be authorized through object access protection because they do not involve interaction with a particular object. For example, the ability to bypass security checks when opening files for backup is an attribute of an account, not of a particular object. Windows uses both privileges and account rights to allow a system administrator to control what accounts can perform security-related operations.

A privilege is the right of an account to perform a particular system-related operation, such as shutting down the computer or changing the system time. An account right grants or denies the account to which it's assigned the ability to perform a particular type of logon, such as a local logon or interactive logon, to a computer.

668 CHAPTER 7 Security


---

A system administrator assigns privileges to groups and accounts using tools such as the Active Directory users and Groups MMC snap-in for domain accounts or the Local Security Policy editor (%SystemRoot%\System32\secpol.msc). Figure 7-11 shows the User Rights Assignment configuration in the Local Security Policy editor, which displays the complete list of privileges and account rights available on Windows. Note that the tool is the complete list of privileges and account rights on is account privilege.

FIGURE 7-11 Local Security Policy editor user rights assignment.

Account rights

Account rights are not enforced by the SRM, nor are they stored in tokens. The function responsible for logon is LsaLogOnList. Winlogon, for example, calls the LogonUser API when a user logs on interactively to a computer, and LogonUser calls LsaLogOnList. LogonUser takes a parameter that indicates the type of login being performed, which includes interactive, network, batch, service, and Terminal Server client.

CHAPTER 7 Security 669


---

In response to logon requests, the Local Security Authority (LSA) retrieves account rights assigned

to a user from the LSA policy database at the time that a user attempts to log on to the system. The LSA

checks the logon type against the account rights assigned to the user account logging on and denies

the logon if the account does not have the right that permits the logon type or if it has the right that

denies the logon type. Table 7-10 lists the user rights defined by Windows.

TABLE 7-10 Account rights

<table><tr><td>User Right</td><td>Role</td></tr><tr><td>Deny logon locally, allow logon locally</td><td>Used for interactive logons that originate on the local machine</td></tr><tr><td>Deny logon over the network, allow logon over the network</td><td>Used for logons that originate from a remote machine</td></tr><tr><td>Deny logon through Terminal Services, allow logon through Terminal Services</td><td>Used for logons through a Terminal Server client</td></tr><tr><td>Deny logon as a service, allow logon as a service</td><td>Used by the service control manager when starting a service in a particular user account</td></tr><tr><td>Deny logon as a batch job, allow logon as a batch job</td><td>Used when performing a logon of type batch</td></tr></table>


Windows applications can add and remove user rights from an account by using the LsaAddAccountRights and LsaRemoveAccountRights functions, and they can determine what rights are assigned to an account with LsaEnumerateAccountRights.

## Privileges

The number of privileges defined by the operating system has grown over time. Unlike user rights, which are enforced in one place by the LSA, different privileges are defined by different components and enforced by those components. For example, the debug privilege, which allows a process to bypass security checks when opening a handle to another process with the OpenProcess Windows API, is checked for by the process manager.

Table 7-1 is a full list of privileges and describes how and when system components check for them. Each privilege has a macro defined in the SDK headers, in the form SE_privilege_NAME, where

privilege is a privilege constant—for example, SE_DEBUG_NAME for the debug privilege. These macros are defined as strings that start with Se and end with Privileges, as in SeDebugPrivileges. This may seem to indicate that privileges are identified by strings, but in fact they are identified by LUIDs, which naturally are unique for the current boot. Every access to a privilege needs to lookup the correct LUID by calling the LookupPrivilegesLue function. Note, however, that Ntoll and kernel code can identify privileges with integer constants directly without going through a LUID.

TABLE 7-11 Privileges

<table><tr><td>Privilege</td><td>User Right</td><td>Privilege Usage</td></tr><tr><td>SeAssignPrimaryTokenPrivilege</td><td>Replace a process-level token</td><td>Checked for by various components, such as NtSetInformationJobObject, that set a process&#x27;s token.</td></tr><tr><td>SeAuditPrivilege</td><td>Generate security audits</td><td>Required to generate events for the Security event log with the ReportEvent API.</td></tr><tr><td colspan="3">CHAPTER 7 Security</td></tr><tr><td colspan="3">From the Library of</td></tr></table>


---

TABLE 7-11   Privileges (continued)

<table><tr><td>Privilege</td><td>User Right</td><td>Privilege Usage</td></tr><tr><td>SeBackupPrivilege</td><td>Back up files and directories</td><td>Causes NTFS to grant the following access to any file or directory, regardless of the security descriptor that's present: READ_CONTROL, ACCESS_SYSTEM, SECURITY, FILE_GENERIC_READ, and FILE_TRAVERSE. Note that when opening a file for backup, the caller must specify the FILE_FLAG_BACKUP, SEMANTICS flag. Also allows corresponding access to registry keys when using RegsaveKey.</td></tr><tr><td>SeChangeNotifyPrivilege</td><td>Bypass traverse checking</td><td>Used by NTFS to avoid checking permissions on intermediate directories of a multilevel directory lookup. Also used by file systems when applications register for notification of changes to the file system structure.</td></tr><tr><td>SeCreateGlobalPrivilege</td><td>Create global objects</td><td>Required for a process to create section and symbolic link objects in the directories of the object manager namespace that are assigned to a different session than the caller.</td></tr><tr><td>SeCreatePagefilePrivilege</td><td>Create a pagefile</td><td>Checked for by NtCreatePagingFile, which is the function used to create a new paging file.</td></tr><tr><td>SeCreatePermanentPrivilege</td><td>Create permanent shared objects</td><td>Checked for by the object manager when creating a permanent object (one that doesn't get deallocated when there are no more references to it).</td></tr><tr><td>SeCreateSymbolicLinkPrivilege</td><td>Create symbolic links</td><td>Checked for by NTFS when creating symbolic links on the file system with the CreateSymbolicLink API.</td></tr><tr><td>SeCreateTokenPrivilege</td><td>Create a token object</td><td>NtCreateToken, the function that creates a token object, checks for this privilege.</td></tr><tr><td>SeDebugPrivilege</td><td>Debug programs</td><td>If the caller has this privilege enabled, the process manager allows access to any process or thread using NtOpenProcess or NtOpenThread, regardless of the process or thread's security descriptor (except for protected processes).</td></tr><tr><td>SeEnableDelegationPrivilege</td><td>Enable computer and user accounts to be trusted for delegation</td><td>Used by Active Directory services to delegate authenticated credentials.</td></tr><tr><td>SeImpersonatePrivilege</td><td>Impersonate a client after authentication</td><td>The process manager checks for this when a thread wants to use a token for impersonation and the token represents a different user than that of the thread's process token.</td></tr><tr><td>SeIncreaseBasePriorityPrivilege</td><td>Increase scheduling priority</td><td>Checked for by the process manager and is required to raise the priority of a process.</td></tr><tr><td>SeIncreaseQuotaPrivilege</td><td>Adjust memory quotas for a process</td><td>Enforced when changing a process's working set thresholds, a process's tagged and nonpaged pool quotas, and a process's CPU rate quota.</td></tr><tr><td>SeIncreaseWorkingSetPrivilege</td><td>Increase a process working set</td><td>Required to call SetProcessWorkingSetSize to increase the minimum working set. This indirectly allows the process to lock up to the minimum working set of memory using VirtualLock.</td></tr></table>


CHAPTER 7   Security      671


---

TABLE 7-11  Privileges (continued)

<table><tr><td>Privilege</td><td>User Right</td><td>Privilege Usage</td></tr><tr><td>SeLoadDriverPrivilege</td><td>Load and unload device drivers</td><td>Checked for by the NtLoadDriver and NtLoadDriver driver functions.</td></tr><tr><td>SeLockMemoryPrivilege</td><td>Lock pages in memory</td><td>Checked for by NtLockVirtualMemory, the kernel implementation of VirtualLock.</td></tr><tr><td>SeMachineAccountPrivilege</td><td>Add workstations to the domain</td><td>Checked for by the Security Account Manager on a domain controller when creating a machine account in a domain.</td></tr><tr><td>SeManageVolumePrivilege</td><td>Perform volume maintenance tasks</td><td>Enforced by file system drivers during a volume open operation, which is required to perform disk-checking and defragmenting activities.</td></tr><tr><td>SeProfileSingleProcessPrivilege</td><td>Profile single process</td><td>Checked by Superfetch and the prefetcher when requesting information for an individual process through the NtQuerySystemInformation API.</td></tr><tr><td>SeRelabelPrivilege</td><td>Modify an object label</td><td>Checked for by the SMB when raising the integrity level of an object owned by another user, or when attempting to raise the integrity level of an object higher than that of the caller&#x27;s token.</td></tr><tr><td>SeRemoteShutdownPrivilege</td><td>Force shutdown from a remote system</td><td>Winlogon checks that remote callers of the IntateSystemShutdown function have this privilege.</td></tr><tr><td>SeRestorePrivilege</td><td>Restore files and directories</td><td>This privilege causes NTFS to grant the following access to any file or directory, regardless of the security descriptor that&#x27;s present: WRITE_DAC, WRITE_OWNER, ACCESS_SYSTEM_SECURITY, FILE_GENERIC_WRITE, FILE_WRITE_WRITE, FILE_WRITE_WRITE, FILE_WRITE_WRITE, FILE_WRITE_WRITE, FILE_WRITE_WRITE, FILE_WRITE</td></tr></table>


---

TABLE 7-11  Privileges (continued)

<table><tr><td>Privilege</td><td>User Right</td><td>Privilege Usage</td></tr><tr><td>SeTakeOwnershipPrivilege</td><td>Take ownership of files and other objects</td><td>Required to take ownership of an object without being granted discretionary access.</td></tr><tr><td>SeTcbPrivilege</td><td>Act as part of the operating system</td><td>Checked for by the SRM when the session ID is set in a token, by the Plug and Play manager for Plug and Play event creation and management, by Broccoli Event Manager for Broccoli Event Manager with BSM_ALLDESKTOPS, by LsaRegisterLogonProcess, and when specifying an application as a VDM with NtSetInformationProcess.</td></tr><tr><td>SeTimeZonePrivilege</td><td>Change the time zone</td><td>Required to change the time zone.</td></tr><tr><td>SeTrustedCredManAccessPrivilege</td><td>Access Credential Manager as a trusted caller</td><td>Checked by the Credential Manager to verify that it should trust the caller with credential information that can be queried in plaintext. It is granted only to Winlogon by default.</td></tr><tr><td>SeUndockPrivilege</td><td>Remove computer from a docking station</td><td>Checked for by the user-mode Plug and Play manager when either a computer unlock is initiated or a device eject request is made.</td></tr><tr><td>SeUnsolicitedInputPrivilege</td><td>Receive unsolicited data from a terminal device</td><td>This privilege isn&#x27;t currently used by Windows.</td></tr></table>


When a component wants to check a token to see whether a privilege is present, it uses the PrivilegeCheck or LsaEnumerateAccountRights APIs if running in user mode and SeSinglePrivilegeCheck or SePrivilegeCheck if running in kernel mode. The privilege-related APIs are not account-right aware, but the account-right APIs are privilege-aware.

Unlike account rights, privileges can be enabled and disabled. For a privilege check to succeed, the privilege must be in the specified token and it must be enabled. The idea behind this scheme is that privileges should be enabled only when their use is required so that a process cannot inadvertently perform a privileged security operation. Enabling or disabling privileges can be done with the AdjustTokenPrivileges function.

## EXPERIMENT: Seeing a privilege get enabled

By following these steps, you can see that the Date and Time Control Panel applet enables the

SeTimeZonePrivileges privilege in response to you using its interface to change the time zone

of the computer (Windows 10):

- 1. Run Process Explorer elevated.

2. Right-click the clock in the system tray in the taskbar and choose Adjust Date/Time.

Alternatively, open the Settings app and search for time to open the Date and Time

settings page.
CHAPTER 7   Security      673


---

3. Right-click the SystemSettings.exe process in Process Explorer and choose Properties.


Then click the Security tab in the Properties dialog box. You should see that the


SeTimeZonePreviewLege privilege is disabled.

![Figure](figures/Winternals7thPt1_page_691_figure_001.png)

4. Change the time zone, close the Properties dialog box and then open it again. On the

Security tab, you should now see that the SetTimeZonePrivileges privilege is enabled:

![Figure](figures/Winternals7thPt1_page_691_figure_003.png)

674    CHAPTER 7   Security


---

### EXPERIMENT: The Bypass Traverse Checking privilege

If you are a systems administrator, you must be aware of the Bypass Traverse Checking privilege (internally called SeNotifyPrivilege) and its implications. This experiment demonstrates that not understanding its behavior can lead to improperly applied security.

- 1. Create a folder and, within that folder, a new text file with some sample text.

2. Navigate in Explorer to the new file, open its Properties dialog box, and click the

Security tab.

3. Click the Advanced button.

4. Deselect the Inheritance check box.

5. Select Copy when you are prompted as to whether you want to remove or copy

inherited permissions.

6. Modify the security of the new folder so that your account does not have any access

to the folder. T
o do so, select your account and check all the Deny boxes in the permis-

sions list.

7. Run Notepad. Then open the File menu, choose Open, and browse to the new direc-

tory in the dialog box that appears. You should be denied access to the directory.

8. In the File Name field of the Open dialog box, type the full path of the new file. The file

should open.
If your account does not have the Bypass Traverse Checking privilege, NTFS performs an access check on each directory of the path to a file when you try to open a file, which results in you being denied access to the file in this example.

## Super privileges

Several privileges are so powerful that a user to which they are assigned is effectively a "super user" who has full control over a computer. These privileges can be used in an infinite number of ways to gain unauthorized access to otherwise off-limit resources and to perform unauthorized operations. However, we'll focus on using the privilege to execute code that grants the user privileges not assigned to the user, with the knowledge that this capability can be leveraged to perform any operation on the local machine that the user desires.

This section lists the privileges and discusses some of the ways they can be exploited. Other privileges, such as Lock Pages in Physical Memory (SeLockMemoryPrivileges), can be exploited for denialof-service attacks on a system, but these are not discussed. Note that on systems with UAC enabled, these privileges will be granted only to applications running at high integrity level or higher, even if the account possesses them:

CHAPTER 7   Security      675


---

- ■ Debug programs (SeDebugPrivilege) A user with this privilege can open any process on the
system (except for a protected process) without regard to the security descriptor present on the
process. For example, the user could implement a program that opens the Lsass process, copy
executable code into its address space, and then inject a thread with the CreateRemoteThread
Windows API to execute the injected code in a more-privileged security context. The code
could grant the user additional privileges and group memberships.
■ Take ownership (SeTakeOwnershipPrivilege) This privilege allows a holder to take owner-
ship of any securable object (even protected processes and threads) by writing his own SID into
the owner field of the object's security descriptor. Recall that an owner is always granted per-
mission to read and modify the DACL of the security descriptor, so a process with this privilege
could modify the DACL to grant itself full access to the object and then close and reopen the
object with full access. This would allow the owner to see sensitive data and to even replace sys-
tem files that execute as part of normal system operation, such as Lsass, with his own programs
that grant a user elevated privileges.
■ Restore files and directories (SeRestorePrivilege) A user assigned this privilege can re-
place any file on the system with her own. She could exploit this power by replacing system files
as described in the preceding paragraph.
■ Load and unload device drivers (SeLoadDriverPrivilege) A malicious user could use this
privilege to load a device driver into the system. Device drivers are considered trusted parts
of the operating system that can execute within it with System account credentials, so a driver
could launch privileged programs that assign the user other rights.
■ Create a token object (SeCreateTokenPrivilege) This privilege can be used in the obvious
way to generate tokens that represent arbitrary user accounts with arbitrary group membership
and privilege assignment.
■ Act as part of operating system (SeIcbPrivilege) LsaRegisterLogonProcess, the function
a process calls to establish a trusted connection to Lsass, checks for this privilege. A malicious user
with this privilege can establish a trusted-Lsass connection and then execute LsaLogonUser, a
function used to create new logon sessions. LsaLogonUser requires a valid user name and pass-
word and accepts an optional list of SIDs that it adds to the initial token created for a new logon
session. The user could therefore use her own user name and password to create a new logon
session that includes the SIDs of more privileged groups or users in the resulting token.
![Figure](figures/Winternals7thPt1_page_693_figure_001.png)

Note The use of an elevated privilege does not extend past the machine boundary to the network because any interaction with another computer requires authentication with a domain controller and validation of domain passwords. Domain passwords are not stored on a computer either in plaintext or encrypted form, so they are not accessible to malicious code.

---

Access tokens of processes and threads

Figure 7-12 brings together the concepts covered so far in this chapter by illustrating the basic process

and thread security structures. In the figure, notice that the process object and the thread objects have

ACLs, as do the access token objects themselves. Also in this figure, thread 2 and thread 3 each have an

impersonation token, whereas thread 1 uses the default process access token.

![Figure](figures/Winternals7thPt1_page_694_figure_002.png)

FIGURE 7-12 Process and thread security structures.

