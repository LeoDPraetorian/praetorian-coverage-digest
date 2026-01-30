## What Makes an Administrator User?

If you come from a Unix background, you'll know user ID 0 as the administrator account, or root. As root, you can access any resource and configure the system however you'd like. When you install Windows, the first account you configure will also be an administrator. However, unlike root, the account won't have a special SID that the system treats differently. So, what makes an administrator account on Windows?

122    Chapter 4

---

The basic answer is that Windows is configured to give certain groups and privileges special access. Administrator access is inherently discretionary, meaning it's possible to be an administrator but still be locked out of resources; there is no real equivalent of a root account (although the SYSTEM user comes close).

Administrators generally have three characteristics. First, when you configure a user to be an administrator, you typically add them to the BUILTIN Administrators group, then configure Windows to allow access to the group when performing an access check. For example, the system folders, such as


C:\Windows, are configured to allow the group to create new files and directories.

Second, administrators are granted access to additional privileges, which effectively circumvent the system's security controls. For example,

$DebugPrivilege allows a user to get full access to any other process or thread on the system, no matter what security it has been assigned. With full access to a process, it's possible to inject code into it to gain the privileges of a different user.

Third, administrators typically run at the @high integrity level, whereas system services run at the System level. By increasing the administrator's integrity level, we make it harder to accidentally leave administrator resources (especially processes and threads) accessible to non-administrators. Weak access control to resources is a common misconfiguration; however, if the resource is also marked with an integrity level above Medium, then nonadministrator users won't be able to write to the resource.

A quick way to verify whether a token is an administrator is to check the Elevated property on the token object. This property indicates whether the token has certain groups and available privileges found in a fixed list in the kernel. Listing 4-22 shows an example for a non-administrator.

```bash
PS> $token = Get-NtToken
PS> $token.Elevated
False
```

Listing 4-22: The Elevated property for a non-administrator

If the token has one of the following privileges, it's automatically considered elevated:

- • SeCreateTokenPrivilege

• SeTcbPrivilege

• SeTakeOwnershipPrivilege

• SeLoadDriverPrivilege

• SeBackupPrivilege

• SeRestorePrivilege

• SeDebugPrivilege

• SeImpersonatePrivilege

• SeRelabelPrivilege

• SeDelegateSessionUserImpersonatePrivilege
---

The privilege doesn't have to be enabled, just available in the token.

For elevated groups, the kernel doesn't have a fixed list of SIDs; instead, it inspects only the last RID of the SID. If the RID is set to one of the following values, then the SID is considered elevated: 114, 498, 512, 516, 517, 518, 519, 520, 521, 544, 547, 548, 549, 550, 551, 553, 554, 556, or 569. For example, the SID of the BUILTIN\Administrators group is 5-1-4-32-544. As 544 is in this list, the SID is considered elevated. (Note that the SID 5-1-2-3-4-544 would also be considered elevated, even though there is nothing special about it.)

### HIGH INTEGRITY LEVEL DOESN'T EQUAL ADMINISTRATOR

It's a common misconception that if a token has a High integrity level, it's an administrator token. However, the Elevated property doesn't check a token's integrity level, just its privileges and groups. The BUILTIN\Administrators group would still function with a lower integrity level, allowing access to resources such as the Windows filesystem directory. The only restriction is that certain high-level privileges, such as SeDebugPrivilege, can't be enabled if the integrity level is less than High.

It is also possible for a non-administrator to run with a High integrity level, as in the case of UI access processes, which sometimes run at this integrity level but are not granted any special privileges or groups to make them an administrator.

## User Account Control

I mentioned that when you install a new copy of Windows, the first user you create is always an administrator. It's important to configure the user in this way; otherwise, it would be impossible to modify the system and install new software.

However, prior to Windows Vista, this default behavior was a massive security liability, because average consumers would install the default account and likely never change it. This meant that most people used a full administrator account for everyday activities like surfing the web. If a malicious attacker were able to exploit a security issue in the user's browser, the attacker would get full control over the Windows machine. In the days prior to widespread sandboxing, this threat proved serious.

In Vista, Microsoft changed this default behavior by introducing User Account Control (UAC) and the split-token administrator. In this model, the default user remains an administrator; however, by default, all programs run with a token whose administrator groups and privileges have been removed. When a user needs to perform an administrative task, the system

124      Chapter 4

---

elevates a process to a full administrator and shows a prompt, like the one in Figure 4-3, requesting the user's confirmation before continuing.

![Figure](figures/WindowsSecurityInternals_page_155_figure_001.png)

Figure 4-3: The UAC consent dialog for privilege elevation

To make using Windows easier for users, you can configure a program to force this elevation when it's started. A program's elevation property is stored in a manifest XML file embedded in the executable image. Run the example in Listing 4-23 to get the manifest information for all the executables in the System32 directory.

```bash
PS> ls C:\Windows\System32\*.exe | Get-Win32ModuleManifest
Name                     UserAccess      AutoElevate      ExecutionLevel
---- ---------------------- ---------------------- --------------------
aiStatic.exe          False       False        asInvoker
alg.exe                 False       False        asInvoker
appdictorecheck.exe      False       False        asInvoker
appdipolicyconverter.exe    False       False        asInvoker
ApplicationFrameHost.exe    False       False        asInvoker
appverif.exe              False       False        highestAvailable
----snip--
```

Listing 4-23: Querying executable manifest information

If it's a special, Microsoft-approved program, the manifest can specify whether the program should be automatically, and silently, elevated (indicated by a True value in the AutoElevate column). The manifest also indicates

---

whether the process can run with UI access, a topic we'll discuss later on page 129. There are three possible values for the ExecutionLevel column:

asInvoker Run the process as the user who created it. This is the default setting.

highestAvailable If the user is a split-token administrator, then force elevation to the administrator token. If not, then run as the user who created the process.

requireAdministrator Force elevation, whether the user is a split-token administrator or not. If the user is not an administrator, they'll be prompted for a password for an administrator account.

When something creates an executable with an elevated execution level, the shell calls the RPC method RAllaunchAdminProcess. This method checks the manifest and starts the elevation process, including showing the consent dialog. It's also possible to manually elevate any application by using the ShellExecute API, introduced in “Shell APIs” on page 89, and requesting the zunas operation. PowerShell exposes this behavior using the Start-Process command, as shown here:

```bash
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
PS> Start-Process notepad -Verb runas
```

When you run this command, you should see the UAC prompt. If you click Yes in the consent dialog, notepad.exe should run as an administrator on the desktop.

## Linked Tokens and Elevation Type

When an administrator authenticates to the desktop, the system tracks two tokens for the user:

Limited  The unelevated token used for most running processes

Full The full administrator token, used only after elevation

The name split-token administrator comes from these two tokens, as the user's granted access is split between the limited and full tokens.

The Token object has a field used to link the two tokens together. The linked token can be queried using the @MgetyInformationToken system call and the TokenLinkedToken information class. In Listing 4-24, we inspect some of the properties of these linked tokens using PowerShell.

```bash
#! PS> Use-NtObject($token = Get-NtToken -linked) {
        Format-NtToken $token -Group -Privilege -Integrity -Information
    }
  GROUP SID INFORMATION
  --------------------
     Name                          Attributes
  --------------------
● BUILTIN\Administrators       Mandatory, EnabledByDefault, Enabled, Owner
  --snip--
```

---

```bash
PRIVILEGE INFORMATION
  --------------------
  Name                    Luid             Enabled
  ---------                ---                ---------
  SeIncreaseQuotaPrivilege    00000000-00000005  False
  ♦ SeSecurityPrivilege        00000000-00000008  False
  SeTakeOwnershipPrivilege   00000000-00000009  False
  --snip---
  INTEGRITY LEVEL
  -----------------
  ♦ High
  TOKEN INFORMATION
  -----------------
  ♦ Type        : Impersonation
  ♦ User Level      : Identification
  Auth ID        : 00000000-0009361f
  ♦ Elevated      : True
  ♦ Elevation Type: Full
  Flags        : NotLow
```

Listing 4-24: Displaying properties of the linked token

We access the linked token by passing the Linked parameter to Get#tToken, ❶ and we format the token to display its groups, privileges, integrity level, and token information. In the list of groups, we can see the BUILTIN\Administrators group enabled ❹. We can also see that the list of privileges contains some high-level ones, such as $SecurityPrivilege ❸. The combination of groups and privileges confirms that this is an administrator token.

The integrity level of the token is set to High ❶ , which, as we discussed earlier, prevents the token from accidentally leaving sensitive resources accessible to non-administrator users. In the token information, we can see that there's an impersonation token at Identification level ❸ . To get a token that can create a new process, the caller needs the SetcPrivileges privilege, which means only system services, such as the Application Information service, can get the token. Finally, we can see that the token is marked as elevated ❹ and that the token elevation type indicates this is the full token ❹ . Let's compare this with the limited token (Listing 4 - 25 ).

```bash
#! PS> Use-NtObject($token = Get-NtToken) {
        Format-NtToken $token -Group -Privilege -Integrity -Information
    }
  GROUP SID INFORMATION
  --------------------
     Name                     Attributes
  --------------------
#! BUILTIN\Administrators      UseForDenyOnly
    --snip--
```

---

```bash
PRIVILEGE INFORMATION
  --------------------
     Name                          Luid             Enabled
     ----                          -----             -----
● SeShutdownPrivilege        00000000-00000013 False
     SeChangeNotifyPrivilege      00000000-00000017 True
     SeUndockPrivilege          00000000-00000019 False
     SeIncreaseWorkingSetPrivilege 00000000-00000021 False
     SeTimeZonePrivilege         00000000-00000022 False
  INTEGRITY LEVEL
  --------------------
● Medium
  TOKEN INFORMATION
  --------------------
  Type            : Primary
  Auth ID           : 00000000-00093698
● Elevated           : False
● Elevation Type: Limited
● Flags           : VirtualizeAllowed, IsFiltered, NotLow
```

Listing 4-25: Displaying properties of the limited token

We first get a handle to the current token and format it with the same formatting we used in Listing 4-24 . In the list of groups, we can see that

BUILTIN\Administrators has been converted to a User@Nony group . Any other group that would match the elevated RID check would be converted in the same way.

The list of privileges shows only five items ❶ . These are the only five privileges that the limited token can have. The integrity level of the token is set to Medium , down from High in the full token ❷ . In the token information, we can see that the token is not elevated ❸ , and the elevation type indicates that this is the limited token ❸ .

Finally, note that the flags contain the value IsFiltered . This flag indicates the token has been filtered using the NtfilterToken system call. This is because, to create the limited token, LSASS will first create a new full token so that its authentication ID has a unique value. (If you compare the Auth ID values in Listings 4-24 and 4-25, you'll notice they are indeed different.) This allows the SRM to consider the two tokens to be in separate logon sessions. LSASS then passes the token to NtfilterToken with the luaToken parameter flag to convert any elevated group to UserDeniedly and delete all privileges other than the five permitted ones. NtfilterToken does not drop the integrity level from High to Medium, though; that must be done separately. Lastly, LSASS calls NtsetInformationToken to link the two tokens together using the TokenLinkedToken information class.

There is a third type of elevation, default, used for any token not associated with a split-token administrator:

```bash
PS> Use-NTObject($token = Get-NTToken - Anonymous) { $token.ElevationType }
Default:
```

128    Chapter 4

---

In this example, the anonymous user is not a split-token administrator, so the token has the default creation type.

## UI Access

One of the other security features introduced in Windows Vista is User Interface Privacy Isolation (UIPI), which prevents a lower-privileged process from programmatically interacting with the user interface of a more privileged process. This is enforced using integrity levels, and it's another reason UAC administrators run at a high integrity level.

But UIP1 presents a problem for applications that are designed to interact with the user interface, such as screen readers and touch keyboards. To get around this limitation without granting the process too much privilege, a token can set a UI access flag. Whether a process is granted UI access depends on the uiAccess setting in the executable's manifest file.

This UI access flag signals to the desktop environment that it should disable the UIPI checks. In Listing 4-26, we query for this flag in a suitable process, the On-Screen Keyboard (OSK).

```bash
PS> $process = Start-Process "osk.exe" -PassThru
PS> $token = Get-NTToken -ProcessId $process.Id
PS> $token.UIAccess
True
```

Listing 4-26: Querying the UI access flag in the On-Screen Keyboard primary token

We start the OSK and open its Token object to query the UI access flag. To set this flag, the caller needs the SetcBPrivilege privilege. The only way to create a UI access process as a normal user is to use the UAC service. Therefore, any UI access process needs to be started with ShellExecute, which is why we used Start-Process in Listing 4-26. This all happens behind the scenes when you create the UI access application.

## Virtualization

Another problem introduced in Vista because of UAC is the question of how to handle legacy applications, which expect to be able to write to administrator-only locations such as the Windows directory or the local machine registry hive. Vista implemented a special workaround: if a virtualization flag is enabled on the primary token, it will silently redirect writes from these locations to a per-user store. This made it seem to the process as if it had successfully added resources to secure locations.

By default, the virtualization flag is enabled on legacy applications automatically. However, you can specify it manually by setting a property on the primary token. Run the commands in Listing 4-27 in a non-administrator shell.

```bash
# PS: $file = New-NTFile -Win32Path C:\Windows\Hello.txt -Access GenericWrite
New-NTfile - (0x00000022) - (Access Denied)
  A process has requested access to an object, but has not been granted those
  access rights.
```

Security Access Tokens   129

---

```bash
PS> $token = Get-NTToken
  @ PS> $token.VirtualizationEnabled = $true
  @ PS> $file = New-NTfile -Win32Path C:\Windows\hello.txt -Access GenericWrite
  @ PS> $file\Win32PathName
  C:\Users\user\AppData\Local\VirtualStore\Windows\hello.txt
```

Listing 4-27: Enabling virtualization on the Token object and creating a file in C:\Windows

In this listing, we first try to create a writable file. C:\Windows\hello.txt ❶. This operation fails with an access denied exception. We then get the current primary token and set the VirtualizationEnabled property to True ❷. When we repeat the file creation operation, it now succeeds ❸. If we query the location of the file, we find it's under the user's directory in a virtual store ❹. Only normal, unprivileged tokens can enable virtualization; system service and administrator tokens have virtualization disabled. You can learn whether virtualization is permitted by querying the VirtualizationAllowed property on the Token object.

## Security Attributes

A token's security attributes are a list of name/value pairs that provide arbitrary data. There are three types of security attributes associated with a token: local , user claims , and device claims . Each security attribute can have one or more values, which must all be of the same type. Table 4-5 shows the valid types for a security attribute.

Table 4-5: Security Attribute Types

<table><tr><td>Type name</td><td>Description</td></tr><tr><td>Int64</td><td>A signed 64-bit integer</td></tr><tr><td>UInt64</td><td>An unsigned 64-bit integer</td></tr><tr><td>String</td><td>A Unicode string</td></tr><tr><td>Fqbn</td><td>A fully qualified binary name; contains a version number and a Unicode string</td></tr><tr><td>Sid</td><td>A SID</td></tr><tr><td>Boolean</td><td>A true or false value, stored as an Int64, with 0 being false and 1 being true</td></tr><tr><td>OctetString</td><td>An arbitrary array of bytes</td></tr></table>


A set of flags can be assigned to the security attribute to change aspects of its behavior, such as whether new tokens can inherit it. Table 4-6 shows the defined flags.

130    Chapter 4

---

Table 4-6: Security Attribute Flags

<table><tr><td>Flag name</td><td>Description</td></tr><tr><td>NonInheritable</td><td>The security attribute can&#x27;t be inherited by a child process token.</td></tr><tr><td>CaseSensitive</td><td>If the security attribute contains a string value, the comparison should be case sensitive.</td></tr><tr><td>UseForDenyOnly</td><td>The security attribute is used only when checking for denied access.</td></tr><tr><td>DisabledByDefault</td><td>The security attribute is disabled by default.</td></tr><tr><td>Disabled</td><td>The security attribute is disabled.</td></tr><tr><td>Mandatory</td><td>The security attribute is mandatory.</td></tr><tr><td>Unique</td><td>The security attribute should be unique on the local system.</td></tr><tr><td>InheritOnce</td><td>The security attribute can be inherited once by a child, then should be set NonInheritable.</td></tr></table>


Almost every process token has the TSA::/ProcNoDebug security attribute. This security attribute contains a unique LUID allocated during process creation. We can display its value for the effective token using Show-NToken Effective, as shown in Listing 4-28.

```bash
PS> Show-MitTokenEffective -SecurityAttributes
SECURITY ATTRIBUTES
----------------------
Name        Flags            ValueType Values
----------------------
TSA://ProcUnique NonInheritable, Unique UInt64 {133, 1592482}
```

Listing 4-28: Querying the security attributes for the current process

From the output, we can see that the name of the attribute is TSA://


ProcName. It has two UInt64 values, which form a LUID when combined.


Finally, it has two flags: NonInheritable, which means the security attribute won't be passed to new process tokens, and Unique, which means the kernel shouldn't try to merge the security attribute with any other attribute on the system with the same name.

To set local security attributes, the caller needs to have the SetCh Privilege privilege before calling NtSetInformationToken. User and device claims must be set during token creation, which we discuss in the next section.

## Creating Tokens

Typically, LSASS creates tokens when a user authenticates to the computer. However, it can also create tokens for users that don't exist, such as virtual accounts used for services. These tokens might be interactive, for use in a console session, or they could be network tokens for use over the local

Security Access Tokens      131

---

network. A locally authenticated user can create another user's token by calling a Win32 API such as LogonUser, which calls into LSASS to perform the token creation.

We won't discuss LSASS at length until Chapter 10. However, it's worth understanding how LSASS creates tokens. To do so, LSASS calls the NtCreateToken system call. As I mentioned earlier, this system call requires the SeCreateTokenPrivilege privilege, which is granted to a limited number of processes. This privilege is about as privileged as it gets, as you can use it to create arbitrary tokens with any group or user SID and access any resource on the local machine.

While you won't often have to call NtCreateToken from PowerShell, you can do so through the New-NtToken command so long as you have SeCreateTokenPrivilege enabled. The NtCreateToken system call takes the following parameters:

Token type   Either primary or impersonation

Authentication ID The LUID authentication ID; can be set to any value you'd like

Expiration time  Allows the token to expire after a set period

User The user SID

Groups The list of group SIDs

Privileges   The list of privileges

Owner    The owner SID

Primary group The primary group SID

Source The source information name

In addition, Windows 8 introduced the following new features to the system call, which you can access through the %state%token system call:

Device groups   A list of additional SIDs for the device

Device claim attributes A list of security attributes to define device claims

User claim attributes A list of security attributes to define user claims.

A policy A set of flags that indicate the token's mandatory integrity policy

Anything not in these two lists can be configured only by calling


TSetInformationToken after the new token has been created. Depending on

what token property is being set, you might need a different privilege, such

as SefcbPrivilege. Let's demonstrate how to create a new token using the script in Listing 4-29, which you must run as an administrator.

```bash
PS> Enable-NtTokenPrivilege SeDebugPrivilege
  ©   $imp = Use-NtObject($p = Get-NtProcess -Name lsass.exe) {
     Get-NtToken -Process $p -Duplicate
  } PS> Enable-NtTokenPrivilege SeCreateTokenPrivilege -Token $imp
  } PS> $token = Invoke-NtToken $imp
```

132    Chapter 4

---

```bash
New-NtToken -User "S-1-0-0" -Group "S-1-1-0"
  PS> Format-NtToken $token -User -Group
  USER INFORMATION
  --------------------
     Name     Sid
     ----     ----
❶ NULL SID S-1-0-0
  GROUP SID INFORMATION
  --------------------
     Name                          Attributes
     ----                          ---
```

Listing 4-29: Creating a new token

A normal administrator does not have the SetCreateTokenPrivilege privilege by default. Therefore, we need to borrow a token from another process that does. In most cases, the easiest process to borrow from is LSASS.

We open the LSASS process and its token, duplicating it to an impersonation token ❶ . Next, we ensure that SetCreateTokenPrivilege is enabled on the token ❷ . We can then impersonate the token and call New-rtToken , passing it a SID for the user and a single group ❸ . Finally, we can print out the details for the new token, including its user SID set ❻ and group set ❹ . The New-rt Token command also adds a default system integrity level SID that you can see in the group list.

## Token Assignment

If a normal user account could assign arbitrary primary or impersonation tokens, it could elevate its privileges to access the resources of other users. This would be especially problematic when it comes to impersonation, as another user account would need only open a named pipe to inadvertently allow the server to get an impersonation token.

For that reason, the SRM imposes limits on what a normal user can do without the SeAssignPrimaryTokenPrivilege and Se impersonatePrivilege privileges. Let's take a look at the criteria that must be met to assign a token for a normal user.

### Assigning a Primary Token

A new process can be assigned a primary token in one of three ways:

- • It can inherit the token from the parent process.

• The token can be assigned during process creation (for example, using
the CreateProcessAsUser API).

• The token can be set after process creation using NtSetInformationProcess,
before the process starts.
Security Access Tokens   133

---

Inheriting the token from the parent is by far the most common means of token assignment. For example, when you start an application from the Windows Start menu, the new process will inherit the token from the Explorer process.

If a process does not inherit a token from its parent, the process will be passed the token as a handle that must have the AssignPrimary access right. If the access to the Token object is granted, the SRM imposes further criteria on the token to prevent the assignment of a more privileged token (unless the caller's primary token has SetAssignPrimaryTokenPrivilege enabled).

The kernel function SetTokenAssignableToProcess imposes the token criteria. First it checks that the assigned token has an integrity level less than or equal to that of the current process's primary token. If that criterion is met, it then checks whether the token meets either of the criteria shown in Figure 4-4; namely, that the token is either a child of the caller's primary token or a sibling of the primary token.

![Figure](figures/WindowsSecurityInternals_page_164_figure_003.png)

Figure 4-4: The SeIsTokenAssignableToProcess primary token assignment criteria

Let's first cover the case of a child token. A user process can create a new token based on an existing one. When this occurs, the ParentTokenId property in the new token's kernel object is set to the ID of the parent token. If the new token's ParentTokenId matches the current primary token's ID value, then the assignment is granted. Restricted tokens are examples of child tokens; when you create a restricted token using #filterToken, the new token's parent token ID is set to the ID of the original token.

A sibling token is a token created as part of the same authentication session as the existing token. To test this criterion, the function compares the parent token ID and the authentication IDs of the two tokens. If they're the same, then the token can be assigned. This check also tests whether the authentication sessions are special sibling sessions set by the kernel (a rare configuration). Common examples of a sibling token include tokens duplicated from the current process token and lowbox tokens.

134    Chapter 4

---

Note that the function doesn't check the user that the token represents, and if the token matches one of the criteria, it's possible to assign it to a new process. If it doesn't match the criteria, then the STATUS_PRIVILEGE_NOT _INCLUDED error will be returned during token assignment.

How does the runas utility create a new process as a normal user with these restrictions? It uses the CreateProcessWithLogon API, which authentiates a user and starts the process from a system service that has the required privileges to bypass these checks.

If we try to assign a process token, we'll see how easily the operation can fail, even when we're assigning tokens for the same user. Run the code in Listing 4-30 as a non-administrator user.

```bash
PS> $token = Get-NtToken -Filtered -Flags DisableMaxPrivileges
  @ PS> $proc = New-Win32Process notepad -Token $token} {
     $proc | Out-Host
  } Process         : notepad.exe
  Thread            : thread:11236 - process:9572
  Pid             : 9572
  Tid             : 11236
  TerminateOnDispose : False
  ExitStatus       : 259
  ExitNtStatus      : STATUS_PENDING
  @ PS> $token = Get-NtToken -Filtered -Flags DisableMaxPrivileges -Token $token
  @ PS> $proc = New-Win32Process notepad -Token $token
  Exception calling "CreateProcess" with "1" argument(s): "A required privilege
   is not held by the client"
```

Listing 4-30: Creating a process using restricted tokens

Here, we create two restricted tokens and use them to create an instance of Notepad. In the first attempt, we create the token based on the current primary token ❶ . The parent token ID field in the new token is set to the primary token's ID, and when we use the token during process creation, the operation succeeds.

In the second attempt, we create another token but base it on the one we created previously ❸ . Creating a process with this token fails with a privilege error ❹ . This is because the second token's parent token ID is set to the ID of the crafted token, not the primary token. As the token doesn't meet either the child or sibling criterion, this operation will fail during assignment.

You can set the token after creating the process by using the #tSet

InformationProcess system call or ProcessAccessToken, which PowerShell

exposes with the Set-NTToken command (demonstrated in Listing 4-31).

```bash
PS> $proc = Get-NProcess -Current
PS> $token = Get-NToken -Duplicate -TokenType Primary
PS> $set-NToken -Process $proc -Token $token
Set-NToken : (0xCCCCCCBB) - The request is not supported.
```

Listing 4-31: Setting an access token after a process has started

Security Access Tokens   135

---

This assignment operation does not circumvent any of the assignment checks we've discussed. Once the process's initial thread starts executing, the option to set the primary token is disabled, so when we try to set the token on a started process we get the STATUS_UNSUPPORTED error.

## Assigning an Impersonation Token

As with primary tokens, the SRM requires that an assigned impersonation token meet a specific set of criteria; otherwise, it will reject the assignment of the token to a thread. Interestingly, the criteria are not the same as those for the assignment of primary tokens. This can lead to situations in which it's possible to assign an impersonation token but not a primary token, and vice versa.

If the token is specified explicitly, then the handle must have the

Impersonate access right. If the impersonation happens implicitly, then the kernel is already maintaining the token, and it requires no specific access right.

The SetTokenCanImpersonate function in the kernel handles the check for the impersonation criteria. As shown in Figure 4-5, this check is significantly more complex than that for assigning primary tokens.

![Figure](figures/WindowsSecurityInternals_page_166_figure_005.png)

Figure 4-5: The SeTokenCanImpersonate impersonation token checks

Let's walk through each check and describe what it considers on both the impersonation and the primary token. Note that, because it's possible to assign an impersonation token to a thread in another process (if you have an appropriate handle to that thread), the primary token being checked is the one assigned to the process that encapsulates the thread, and not the primary token of the calling thread. The function performs the following verification steps:

- 1. Check for an Identification or Anonymous impersonation level. If the
impersonation token has one of these levels, assigning it to the thread
isn't a security risk, and the SRM immediately allows the assignment.
This check also allows assignment if the impersonation token repre-
sents the anonymous user based on its authentication ID.
136    Chapter 4

---

2. Check for the impersonate privilege. If SeImpersonatePrivilege is enabled, the SRM again immediately allows the assignment.

3. Compare integrity levels of the primary and impersonation tokens. If the primary token's integrity level is less than that of the impersonation token, the assignment is denied. If it's the same or greater, the checks continue.

4. Check that the authentication ID equals the origin ID. If the origin logon identifier of the impersonation token equals the authentication identifier of the primary token, the SRM allows the assignment. Otherwise, it continues making checks.

Note that this check has an interesting consequence. As discussed earlier in this chapter, the origin logon identifier of normal user tokens is set to the authentication identifier of the SYSTEM user. This is because the authenticating process runs as the SYSTEM user. Therefore, the SYSTEM user can impersonate any other token on the system if it meets the integrity level requirement, even if the SeImpersonatePrivilege privilege is not enabled.

5. Check that the user SIDs are equal. If the primary token's user SID does not equal the impersonation token's user SID, the SRM denies the assignment. Otherwise, it continues making checks. This criterion allows a user to impersonate their own user account but blocks them from impersonating another user unless they have the other user's credentials. When authenticating the other user, LSASS returns an impersonation token with the origin logon identifier set to the caller's authentication identifier, so the token will pass the previous check and the user SIDs will never be compared.

6. Check for the Elevated flag. This check ensures that the caller can't impersonate a more privileged token for the same user. If the impersonation token has the Elevated flag set but the primary token does not, the impersonation will be denied. Versions of Windows prior to 10 did not perform this check, so previously it was possible to impersonate a UAC administrator token if you first reduced the integrity level.

7. Check for sandboxing. This check ensures that the caller can't impersonate a less-sandboxed token. To impersonate a lowbox token, the new token must either match the package SID or be a restricted package SID of the primary token; otherwise, impersonation will be denied. No check is made on the list of capabilities. For a restricted token, it's enough that the new token is also a restricted token, even if the list of restricted SIDs is different. The same applies to write-restricted tokens. The SRM has various hardening mechanisms to make it difficult to get hold of a more privileged sandbox token.

8. Check the console session. This final step checks whether the console session is session 0 or not. This prevents a user from impersonating a token in session 0, which can grant elevated privileges (such as being able to create global Section objects).

Security Access Tokens   137

---

You might assume that if the function denies the assignment it will return a STATUS_PRIVILEGE_NOT_HELD error, but that is not the case. Instead, the SRM duplicates the impersonation token as an Identification-level token and assigns it. This means that even if the impersonation assignment fails, the thread can still inspect the properties of the token.

You can check whether you can impersonate a token using the Test -MtTokenImpersonation PowerShell command. This command impersonates the token and reopens it from the thread. It then compares the impersonation level of the original token and the reopened token and returns a Boolean result. In Listing 4-32, we run through a simple example that would fall foul of the integrity level check. Note that it's best not to run this script in a PowerShell process you care about, as you won't be able to restore the original integrity level.

```bash
PS> $token = Get-NtToken -Duplicate
PS> Test-NtTokenImpersonation $token
True
PS> Set-NtTokenIntegrityLevel -IntegrityLevel Low
PS> Test-NtTokenImpersonation $token
False
PS> Test-NtTokenImpersonation $token -ImpersonationLevel Identification
True
```

Listing 4-32: Checking token impersonation

These checks are quite simple. First we get a duplicate of the current process token and pass it to Test-NTokenImpersonation. The result is True, indicating that we could impersonate the token at Impersonation level. For the next check, we lower the integrity level of the current process's primary token to 100 and run the test again. This time it returns false, as it's no longer possible to impersonate the token at the Impersonation level. Finally, we check if we can impersonate the token at the Identification level, which also returns True.

## Worked Examples

Let's walk through some worked examples so you can see how to use the various commands presented in this chapter for security research or systems analysis.

### Finding UI Access Processes

It' s sometimes useful to enumerate all the processes you can access and check the properties of their primary tokens. This can help you find processes running as specific users or with certain properties. For example, you could identify processes with the UI access flag set. Earlier in this chapter,

138    Chapter 4

---

we discussed how to check the UI access flag in isolation. In Listing 4-33, we'll perform the check for all processes we can access.

```bash
PS $ps = Get-NtProcess -Access QueryLimitedInformation -FilterScript {
    Use-NtObject($token = Get-NtToken -Process $_ -Access Query) {
      $token.UIAccess
} }
PS  $ps
Handle Name        NtTypeName Inherit ProtectFromClose
------ --------- -------------------------------
3120   ctfmon.exe Process    False   False
3740   TabTip.exe Process     False   False
PS> $ps.Close()
```

Listing 4-33: Finding processes with UI access

We start by calling the Get-NRProcess command to open all processes with QueryLimitedInformation access. We also provide a filter script. If the script returns True, the command will return the process; otherwise, it will close the handle to the process.

In the script, we open the process's token for jQuery access and return the UIAccess property. The result filters the process list to only processes running with UI access tokens. We display the processes we've found.

## Finding Token Handles to Impersonate

There are several official ways of getting access to a token to impersonate, such as using a remote procedure call or opening the process's primary token. Another approach is to find existing handles to Token objects that you can duplicate and use for impersonation.

This technique can be useful if you're running as a non-administrator user with the $usernameprivate$ privilege (as in the case of a service account such as LOCAL_SERVICE), or to evaluate the security of a sandbox to make sure the sandbox can't open and impersonate a more privileged token. You can also use this technique to access another user's resources by waiting for them to connect to the Windows machine, such as over the network. If you grab the user's token, you can reuse their identity without needing to know their password. Listing 4-34 shows a simple implementation of this idea:

```bash
PS> function Get-ImpersonationTokens {
  @ $hs = Get-NtHandle -ObjectType Token
  foreach($h in $hs) {
    try {
      # Use-NtObject($token = Copy-NtObject -Handle $h) {
        # if (Test-NtTokenImpersonation -Token $token) {
          Copy-NtObject -Object $token
        }
    }
```

---

```bash
} catch {
        }
    }
@ PS> $tokens = Get-ImpersonationTokens
@ PS> $tokens | Where-Object Elevated
```

Listing 4-34: Finding elevated Token handles to impersonate

In the Get-PersonationTokens function, we get a list of all handles of type Token using the Get-NtHandle command ❶ . Then, for each handle, we try to duplicate the handle to the current process using the Copy-NtObject command ❷ . If this succeeds, we test whether we can successfully impersonate the token; if so, we make another copy of the token so it doesn't get closed ❸ .

Running the Get-ImpersonationTokens function returns all accessible token handles that can be impersonated . With these token objects, we can query for properties of interest. For example, we can check whether the token is elevated or not , which might indicate that we could use the token to gain additional privileged groups through impersonation.

## Removing Administrator Privileges

One thing you might want to do while running a program as an administrator is temporarily drop your privileges so that you can perform some operation without damaging the computer, such as accidentally deleting system files. To perform the operation, you can use the same approach that UAC uses to create a filtered, lower-privileged token. Run the code in Listing 4-35 as an administrator.

```bash
PS> $token = Get-NToken -Filtered -Flags luaToken
PS> Set-NTokenIntegrityLevel Medium -Token $token
PS> $token.Elevated
False
PS> "Admin" > "$env:windir\admin.txt"
PS> Invoke-NToken $token { "User" > "$env:windir\user.txt" }
out-file : Access to the path 'C:\WINDOWS\user.txt' is denied.
PS> $token.Close()
```

Listing 4-35: Removing administrator privileges

We start by filtering the current token and specifying the luaToken flag. This flag removes all administrator groups and the additional privileges that a limited token is not allowed to have. The luaToken flag does not lower the integrity level of the token, so we must set it to Medium manually. We can verify the token is no longer considered an administrator by checking that the Elevated property is false.

To see the effect in action, we can now write a file to an administratoronly location, such as the Windows directory. When we try this using the current process token, the operation succeeds. However, when we try to perform the operation while impersonating the token, it fails with an

140    Chapter 4

---

access denied error. You could also use the token with the New-Win32Process PowerShell command to start a new process with the lower-privileged token.

## Wrapping Up

This chapter introduced the two main types of tokens: primary tokens, which are associated with a process, and impersonation tokens, which are associated with a thread and allow a process to temporarily impersonate a different user. We looked at the important properties of both types of tokens, such as groups, privileges, and integrity levels, and how those properties affect the security identity that the token exposes. We then discussed the two types of sandbox tokens (restricted and lowbox), which applications such as web browsers and document readers use to limit the damage of a potential remote code execution exploit.

Next, we considered how tokens are used to represent administrator privilege, including how Windows implements User Account Control and split-token administrators for normal desktop users. As part of this discussion, we explored the specifics of what the operating system considers to be an administrator or elevated token.

Finally, we discussed the steps involved in assigning tokens to processes and threads. We defined the specific criteria that need to be met for a normal user to assign a token and how the checks for primary tokens and impersonation tokens differ.

In the next chapter we're going to discuss security descriptors. These define what access will be granted to a resource based on the identity and groups present in the caller's access token.

---



---

