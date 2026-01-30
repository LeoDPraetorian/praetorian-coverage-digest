## Security auditing

The object manager can generate audit events as a result of an access check, and Windows functions available to user applications can generate them directly. Kernel-mode code is always allowed to generate an audit event. Two privileges, SeSecurityPrivilege and SeAuditPrivilege, relate to auditing. A process must have the SeSecurityPrivilege privilege to manage the security event log and to view or set an object's SACL. Processes that call audit system services, however, must have the SeAuditPrivilege privilege to successfully generate an audit record.

The audit policy of the local system controls the decision to audit a particular type of security event.

The audit policy, also called the Local Security Policy, is one part of the security policy Leas maintains

on the local system. It is configured with the Local Security Policy editor as shown in Figure 7-13. The

audit policy configuration (both the basic settings under Local Policies and the Advanced Audit Policy

Configuration) is stored in the registry as a bitmapped value in the HKEY_LOCAL_MACHINE\SECURITY\ Policy\PolAdtEv key.

---

![Figure](figures/Winternals7thPt1_page_695_figure_000.png)

FIGURE 7-13 Local Security Policy editor audit policy configuration.

Lsass sends messages to the SRM to inform it of the auditing policy at system-initialization time and when the policy changes. Lsass is responsible for receiving audit records generated based on the audit events from the SRM, editing the records, and sending them to the event logger. Lsass (instead of the SRM) sends these records because it adds pertinent details, such as the information needed to more completely identify the process that is being audited.

The SRM sends audit records via its ALPC connection to Lsass. The event logger then writes the

audit record to the security event log. In addition to audit records the SRM passes, both Lsass and the

SAM generate audit records that Lsass sends directly to the event logger, and the AuthZ APIs allow for

applications to generate application-defined audits. Figure 7-14 depicts this overall flow.

![Figure](figures/Winternals7thPt1_page_695_figure_004.png)

FIGURE 7-14 Flow of security audit records.

678    CHAPTER 7   Security


---

Audit records are put on a queue to be sent to the LSA as they are received. They are not submitted in batches. The audit records are moved from the SRM to the security subsystem in one of two ways. If the audit record is small (less than the maximum ALPC message size), it is sent as an ALPC message. The audit records are copied from the address space of the SRM to the address space of the Lsass process. If the audit record is large, the SRM uses shared memory to make the message available to Lsass and simply passes a pointer in an ALPC message.

## Object access auditing

An important use of the auditing mechanism in many environments is to maintain a log of accesses to secured objects—in particular, files. To do this, the Audit object access policy must be enabled, and there must be audit ACEs in system access control lists that enable auditing for the objects in question.

When an accessor attempts to open a handle to an object, the SRM first determines whether the attempt is allowed or denied. If object access auditing is enabled, the SRM then scans the system ACL of the object. There are two types of audit ACEs: access allowed and access denied. An audit ACE must match any of the security IDs held by the accessor, it must match any of the access methods requested, and its type (access allowed or access denied) must match the result of the access check to generate an object access audit record.

Object access audit records include not just the fact of access allowed or denied, but also the reason for the success or failure. This "reason for access" reporting generally takes the form of an access control entry, specified in Security Descriptor Definition Language (SDDL) in the audit record. This allows for a diagnosis of scenarios in which an object to which you believe access should be denied is being permitted, or vice versa, by identifying the specific access control entry that caused the attempted access to succeed or fail.

As was shown in Figure 7-13, object access auditing is disabled by default (as are all other auditing policies).

### EXPERIMENT: Object access auditing

You can observe object access auditing by following these steps:

- 1. In Explorer, navigate to a file to which you would normally have access (such as a
text file), open its Properties dialog box, click the Security tab, and then select the
Advanced settings.

2. Click the Auditing tab and click through the administrative privileges warning. The
resulting dialog box allows you to add auditing of access control entries to the file's
system access control list.
---

![Figure](figures/Winternals7thPt1_page_697_figure_000.png)

3. Click the Add button and choose Select a Principal.

4. In the resulting Select User or Group dialog box, enter your own user name or a group to which you belong, such as Everyone. Click Check Names and then click OK. This presents a dialog box for creating an Audit access control entry for this user or group for this file.

![Figure](figures/Winternals7thPt1_page_697_figure_003.png)

5. Click OK three times to close the file Properties dialog box.

6. In Explorer, double-click the file to open it with its associated program (for example,

Notepad for a text file).

7. Click the Start menu, type event, and choose Event Viewer.

680 CHAPTER 7 Security


---

- 8. Navigate to the Security log. Note that there is no entry for access to the file. This is

because the audit policy for object access is not yet configured.

9. In the Local Security Policy editor, navigate to Local Policies and choose Audit Policy.

10. Double-click Audit Object Access and click Success to enable auditing of successful

access to files.

11. In Event Viewer, click Action (from the menu) and Refresh. Note that the changes to

audit policy resulted in audit records.

12. In Explorer, double-click the file to open it again.

13. In Event Viewer, click Action and Refresh. Note that several file access audit records are

now present.

14. Find one of the file access audit records for event ID 4656. This shows up as "a handle

to an object was requested." (You can use the Find option to search for the file name

you opened.)

15. Scroll down in the text box to find the Access Reasons section. The following example

shows that two access methods, READ_CONTROL, SYNCHRONIZE, and ReadAttributes,

ReadEA (extended attributes), and ReadData were requested. READ_CONTROL was granted

because the accessor was the owner of the file. The others were granted because of the

indicated access control entry.
![Figure](figures/Winternals7thPt1_page_698_figure_001.png)

CHAPTER 7   Security      681


---

## Global audit policy

In addition to object-access ACEs on individual objects, a global audit policy can be defined for the system that enables object-access auditing for all file-system objects, all registry keys, or for both. A security auditor can therefore be certain that the desired auditing will be performed, without having to set or examine SACLs on all the individual objects of interest.

An administrator can set or query the global audit policy via the AuditTop1 command with the /resourceSACL option. This can also be done programmatically by calling the Audit tSetGlobal1ac1 and AuditQueryGlobal1Sac1 APIs. As with changes to objects' SACLs, changing these global SACLs requires SeSecurityPrivilege.

EXPERIMENT: Setting global audit policy

You can use the AuditPol command to enable global audit policy.

1. If you didn't already do so in the previous experiment, open the Local Security Policy editor, navigate to the Audit Policy settings (refer to Figure 7-13), double-click Audit Object Access, and enable auditing for both success and failure. On most systems, SACIs specifying object access auditing are uncommon, so few if any object-access audit records will be produced at this point.

2. In an elevated command prompt window, enter the following command. This will produce a summary of the commands for setting and querying global audit policy.

```bash
C:\> auditpol /resourceSACL
```

3. In the same elevated command prompt window, enter the following commands. On a typical system, each of these commands will report that no global SACL exists for the respective resource type. (Note that the File and Key keywords are case-sensitive.)

```bash
C:\> auditpol\resourceSACL\type\File\view
C:\> auditpol\resourceSACL\type\key\view
```

4. In the same elevated command prompt window, enter the following command. This will set a global audit policy such that all attempts to open files for write access (W) by the indicated user will result in audit records, whether the open attempts succeed or fail. The user name can be a specific user name on the system, a group such as Everyone, a domain-qualified user name such as domainname@username, or a SID.

```bash
C:\> auditpol\resourceSACL /set /type:File /user:yourusername /success
/ failure: /access:fw
```

5. While running under the user name indicated, use Explorer or other tools to open a file. Then look at the security log in the system event log to find the audit records.

6. At the end of the experiment, use the audi tpo1 command to remove the global SACL

you created in step 4, as follows:

```bash
C:\> auditpol /resourceSACL /remove /type:File /user:yourusername
```

---

The global audit policy is stored in the registry as a pair of system access control lists in HKLM\SCURITY\Policy\GlobalSaclNameFile and HKLM\SECURITY\Policy\GlobalSaclNameKey. You can examine these keys by running Regedit.exe under the System account, as described in the “Security system components” section earlier in this chapter. These keys will not exist until the corresponding global SACLs have been set at least once.

The global audit policy cannot be overridden by SACLs on objects, but object-specific SACLs can allow for additional auditing. For example, global audit policy could require auditing of read access by all users to all files, but SACLs on individual files could add auditing of write access to those files by specific users or by more specific user groups.

Global audit policy can also be configured via the Local Security Policy editor in the Advanced Audit Policy settings, described in the next section.

## Advanced Audit Policy settings

In addition to the Audit Policy settings described previously, the Local Security Policy editor offers a much more fine-grained set of audit controls under the Advanced Audit Policy Configuration heading, shown in Figure 7-15.

![Figure](figures/Winternals7thPt1_page_700_figure_005.png)

FIGURE 7-15 The Local Security Policy editor's Advanced Audit Policy Configuration settings.

CHAPTER 7   Security      683


---

Each of the nine audit policy settings under Local Policies (refer to Figure 7-13) maps to a group of settings here that provide more detailed control. For example, while the Audit Object Access settings under Local Policies allow access to all objects to be audited, the settings here allow auditing of access to various types of objects to be controlled individually. Enabling one of the audit policy settings under Local Policies implicitly enables all the corresponding advanced audit policy events, but if finer control over the contents of the audit log is desired, the advanced settings can be set individually. The standard settings then become a product of the advanced settings. However, this is not visible in the Local Security Policy editor. Attempts to specify audit settings by using both the basic and the advanced options can cause unexpected results.

You can use the Global Object Access Auditing option under Advanced Audit Policy Configuration

to configure the global SACLs described in the previous section, using a graphical interface identical to

that seen in Explorer or the Registry editor for security descriptors in the file system or the registry.

## AppContainers

Windows 8 introduced a new security sandbox called an AppContainer. Although it was created primarily to host UWP processes, AppContainers can actually be used for "normal" processes as well (although there is no built-in tool to do that). This section will mostly cover the attributes of packaged AppContainers, which is the term that refers to AppContainers associated with UWP processes and their resulting .Appx format. A complete treatment of UWP apps is beyond the scope of this chapter. You can find more information in Chapter 3 of this book, and in Chapters 8 and 9 in Part 2. Here we'll concentrate on the security aspects of AppContainers and their typical usage as hosts of UWP apps.

Note The term Universal Windows Platform (UWP) app is the latest used to describe processes that host the Windows Runtime. Older names include immersive app, modern app, metro app, and sometimes simply Windows app. The Universal part indicates the ability of such apps to be deployed and run on various Windows 10 editions and form factors, from IoT core, to mobile, desktop, to Xbox, to HoloLens. However, they are essentially the same as the ones first introduced in Windows 8. Therefore, the concept of AppContainers discussed in this section is relevant to Windows 8 and later versions of Windows. Note that Universal Application Platform (UAP) is sometimes used instead of UWP; it's the same thing.

Note The original codename for AppContainer was LowBox. You may see this term come up in many of the API names and data structures throughout this section. They refer to the same concept.

---

## Overview of UWP apps

The mobile device revolution established new ways of obtaining and running software. Mobile devices normally get their applications from a central store, with automatic installation and updates, all with little user intervention. Once a user selects an app from the store, she can see the permissions the app requires to function correctly. These permissions are called capabilities and are declared as part of the package when it's submitted to the store. This way, the user can decide whether these capabilities are acceptable.

Figure 7-16 shows an example of a capabilities list for a UWP game (Minecraft, Windows 10 beta edition). The game requires internet access as a client and as a server and access to the local home or work network. Once the user downloads the game, she implicitly agrees the game may exercise these capabilities. Conversely, the user can be confident that the game uses only those capabilities. That is, there is no way the game could use other unapproved capabilities, such as accessing the camera on the device.

![Figure](figures/Winternals7thPt1_page_702_figure_003.png)

FIGURE 7-16 Part of an app's page in the store, showing capabilities, among other things.

To get a sense of the differences between UWP apps and desktop (classic) apps at a high level, consult Table 7-12. From a developer's perspective, the Windows platform can be seen as shown in Figure 7-17.

---

TABLE 7-12 High-level comparison of UWP and desktop apps

<table><tr><td></td><td>UWP App</td><td>Desktop (Classic) App</td></tr><tr><td>Device Support</td><td>Runs on all Windows device families</td><td>Runs on PCs only</td></tr><tr><td>APIs</td><td>Can access WinRT, subset of COM, and subset of Win32 APIs</td><td>Can access COM, Win32, and subset of WinRT APIs</td></tr><tr><td>Identity</td><td>Strong app identity (static and dynamic)</td><td>Raw EXEs and processes</td></tr><tr><td>Information</td><td>Declarative APFX manifest</td><td>Opaque binaries</td></tr><tr><td>Installation</td><td>Self-contained APFX package</td><td>Loose files or MSI</td></tr><tr><td>App Data</td><td>Isolated per-user/per-app storage (local and roaming)</td><td>Shared user profile</td></tr><tr><td>Lifecycle</td><td>Participates in app resource management and PLM</td><td>Process-level lifecycle</td></tr><tr><td>Instancing</td><td>Single instance only</td><td>Any number of instances</td></tr></table>


![Figure](figures/Winternals7thPt1_page_703_figure_002.png)

FIGURE 7-17 The Windows platform landscape.

A few items in Figure 7-17 are worth elaborating on:

- ■ UWP apps can produce normal executables, just like desktop apps. Wwahost.exe (%SystemRoot%\System32\wwahost.exe) is used to host HTML/JavaScript-based UWP apps, as those produce a DLL, not an executable.
■ The UWP is implemented by the Windows Runtime APIs, which are based on an enhanced version of COM. Language projections are provided for C++ (through proprietary language extensions known as C++/CX), .NET languages, and JavaScript. These projections make it relatively easy to access WinRT types, methods, properties, and events from developers' familiar environments.
■ Several bridging technologies are available, which can transform other types of applications into UWP. See the MSDN documentation for more information on utilizing these technologies.
■ The Windows Runtime is layered on top of the Windows subsystem DLLs, just like the .NET Framework. It has no kernel components and is not part of a different subsystem because it still leverages the same Win32 APIs that the system offers. However, some policies are implemented in the kernel, as well as the general support for AppContainers.
APTER 7 Security

From the Library of
---

- ■ The Windows Runtime APIs are implemented in DLLs residing in the %SystemRoot%\System32
directory, with names in the form Windows.Xxx.Yyy...DLL, where the file name usually indicates
the Windows Runtime API namespace implemented. For example, Windows.Globalization.DLL
implements the classes residing in the windows.Globalization namespace. (See the MSDN
documentation for the complete WinRT API reference.)
## The AppContainer

We've seen the steps required to create processes back in Chapter 3; we've also seen some of the extra steps required to create UWP processes. The initiation of creation is performed by the DCOMLaunch service, because UWP packages support a set of protocols, one of which is the Launch protocol. The resulting process gets to run inside an AppContainer. Here are several characteristics of packaged processes running inside an AppContainer:

- ■ The process token integrity level is set to Low, which automatically restricts access to many
objects and limits access to certain APIs or functionality for the process, as discussed earlier
in this chapter.
■ UWP processes are always created inside a job (one job per UWP app). This job manages the
UWP process and any background processes that execute on its behalf (through nested jobs).
The jobs allow the Process State Manager (PSM) to suspend or resume the app or background
processing in a single stroke.
■ The token for UWP processes has an AppContainer SID, which represents a distinct identity
based on the SHA-2 hash of the UWP package name. As you'll see, this SID is used by the system
and other applications to explicitly allow access to files and other kernel objects. This SID is part
of the APPLICATION_PACKAGE AUTHORITY instead of the NT AUTHORITY you've mostly seen so
far in this chapter. Thus, it begins with S-1-15-2-in its string format, corresponding to SECURITY_
APP_PACKAGE_BASE_RID (15) and SECURITY_APP_PACKAGE_BASE_RID (2). Because a SHA-2
hash is 32 bytes, there are a total of eight RIDs (recall that a RID is the size of a 4-byte ULONG) in
the remainder of the SID.
■ The token may contain a set of capabilities, each represented with a SID. These capabilities are
declared in the application manifest and shown on the app's page in the store. Stored in the ca-
pability section of the manifest, they are converted to SID format using rules we'll see shortly, and
belong to the same SID authority as in the previous bullet, but using the well-known SECURITY_
CAPABILITY_BASE_RID (3) instead. Various components in the Windows Runtime, user-mode
device-access classes, and kernel can look for capabilities to allow or deny certain operations.
■ The token may only contain the following privileges: SeChangeNotifyPrivilege, SeIncrease-
WorkingSetPrivilege, SeShutdownPrivilege, SetTimeZonePrivilege, and SetIndockPrivilege.
These are the default set of privileges associated with standard user accounts. Additionally, the
AppContainerPrivilegesEnabledExt function part of the ms-win-ntos-ksecurity API Set
contract extension can be present on certain devices to further restrict which privileges are
enabled by default.
CHAPTER 7   Security      687


---

- ■ The token will contain up to four security attributes (see the section on attribute-based access
control earlier in this chapter) that identify this token as being associated with a UWP packaged
application. These attributes are added by the DcomLaunch service as indicated earlier, which is
responsible for the activation of UWP applications. They are as follows:

• WIN://PKG This identifies this token as belonging to a UWP packaged application. It con-
tains an integer value with the application's origin as well as some flags. See Table 7-13 and
Table 7-14 for these values.

• WIN://SYSSPID This contains the application identifiers (called package monikers or string
names) as an array of Unicode string values.

• WIN://PKGHOSTID This identifies the UWP package host ID for packages that have an ex-
plicit host through an integer value.

• WIN://BGKD This is only used for background hosts (such as the generic background task
host BackgroundTaskHost.exe) that can store packaged UWP services running as COM pro-
viders. The attribute's name stands for background and contains an integer value that stores
its explicit host ID.
The TOKEN_LOWBOX (0x4000) flag will be set in the token's Flags member, which can be queried with various Windows and kernel APIs (such as GetTokenInformation). This allows components to identify and operate differently under the presence of an AppContainer token.

![Figure](figures/Winternals7thPt1_page_705_figure_002.png)

Note A second type of AppContainer exists: a child AppContainer. This is used when a UWP

AppContainer (or parent AppContainer) wishes to create its own nested AppContainer to further

lock down the security of the application. Instead of eight RIDs, a child AppContainer has four

additional RIDs (the first eight match the parents') to uniquely identify it.

TABLE 7-13 Package origins

<table><tr><td>Origin</td><td>Meaning</td></tr><tr><td>Unknown (0)</td><td>The package origin is unknown.</td></tr><tr><td>Unsigned (1)</td><td>The package is unsigned.</td></tr><tr><td>Inbox (2)</td><td>The package is associated with a built-in (inbox) Windows application.</td></tr><tr><td>Store (3)</td><td>The package is associated with a UWP application downloaded from the store. This origin is validated by checking if the DACL of the file associated with the main UWP application's executable contains a trust ACE.</td></tr><tr><td>Developer Unsigned (4)</td><td>The package is associated with an unsigned developer key.</td></tr><tr><td>Developer Signed (5)</td><td>The package is associated with a signed developer key.</td></tr><tr><td>Line-of-Business (6)</td><td>The package is associated with a side-loaded line-of-business (LOB) application.</td></tr></table>


---

TABLE 7-14 Package flags

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>PSM_ACTIVATION_TOKEN_PACKAGED_APPLICATION (0x1)</td><td>This indicates that the AppContainer UWP application is stored in AppX packaged format. This is the default.</td></tr><tr><td>PSM_ACTIVATION_TOKEN_SHARED_ENTITY (0x2)</td><td>This indicates that this token is being used for multiple executables all part of the same AppX packaged UWP application.</td></tr><tr><td>PSM_ACTIVATION_TOKEN_FULL_TRUST (0x4)</td><td>This indicates that this AppContainer token is being used to host a Project Centennial (Windows Bridge for Desktop) converted Win32 application.</td></tr><tr><td>PSM_ACTIVATION_TOKEN_NATIVE_SERVICE (0x8)</td><td>This indicates that this AppContainer token is being used to host a packaged service created by the Service Control Manager (SCM)&#x27;s Resource Manager. See Chapter 9 in Part 2 for more information on services.</td></tr><tr><td>PSM_ACTIVATION_TOKEN_DEVELOPMENT_APP (0x10)</td><td>This indicates that this is an internal development application. Not used on retail systems.</td></tr><tr><td>BREAKAWAY_INHIBITED (0x20)</td><td>The package cannot create a process that is not itself packaged as well. This is set by using the PROC_THREAD_ATTRIBUTE_DESKTOP_APP_POLICY process-creation attribute. (See Chapter 3 for more information.)</td></tr></table>


## EXPERIMENT: Viewing UWP process information

There are several ways to look at UWP processes, some more obvious than others. Process Explorer can highlight processes that use the Windows Runtime in color (cyan by default). To see this in action, open Process Explorer, open the Options menu, and choose Configure Colors. Then make sure the Immersive Processes check box is selected.

![Figure](figures/Winternals7thPt1_page_706_figure_004.png)

CHAPTER 7   Security      689


---

Immersive process is the original term used to describe WinRT (now UWP) apps in Windows 8.

(They were mostly full screen, and therefore "immersive.") This distinction is available by calling

the IsImmersiveProcess API.

Run Calc.exe and switch to Process Explorer. You should see several processes highlighted in cyan, including Calculator.exe. Now minimize the Calculator app and notice that the cyan highlight has turned gray. This is because Calculator has been suspended. Restore Calculator's window, and it's back to cyan.

You should have similar experiences with other apps—for example, Cortana (SearchUI.exe). Click or tap the Cortana icon on the taskbar and then close it. You should see the gray to cyan and back to gray transition. Or, click or tap the Start button. ShellExperienceHost.exe highlights in a similar fashion.

The presence of some cyan-highlighted processes might surprise you, such as Explorer.exe, TaskMgr.Exe, and RuntimeBroker.exe. These are not really apps, but use Windows Runtime APIs, and so are classified as immersive. (The role of RuntimeBroker will be discussed shortly.)

Finally, make sure the Integrity column is visible in Process Explorer and sort by that column. You'll find processes such as Calculator.exe and SearchUI.exe with AppContainer integrity level. Notice that Explorer and TaskMgr are not there, clearly showing they are not UWP processes, and so live under different rules.

![Figure](figures/Winternals7thPt1_page_707_figure_005.png)

## EXPERIMENT: Viewing an AppContainer token

You can look at the properties of an AppContainer hosted process with several tools. In Process Explorer, the Security tab shows the capabilities associated with the token. Here's the Security tab for Calculator.exe:

---

![Figure](figures/Winternals7thPt1_page_708_figure_000.png)

Notice two interesting pieces of information: the AppContainer SID, shown in the Flags column as AppContainer, and a single capability, right underneath the AppContainer SID. Except for the base RID (SECURITY_APP_PACKAGE_BASE_RID versus SECURITY_CAPABILITY_BASE_RID), the remaining eight RIDs are identical, and both refer to the package name in SHA-2 format as is discussed. This shows you that there will always be one implicit capability, the capability of being the package itself, which really means Calculator requires no capabilities at all. The upcoming capabilities section covers a much more complex example.

## EXPERIMENT: Viewing AppContainer token attributes

You can obtain similar information on the command line by using the AccessChk Sysinternals tool while also adding a full list of all of the token's attributes. For example, running AccessChk with the -p -f switches followed by the process ID for SearchUI.exe, which hosts Cortana, shows the following:

```bash
C:\>accesschk -p -f 3728
```

Accessch v6.10 - Reports effective permissions for sealurable objects Copyright © 2006-2010 Yoshua Broyer, novich Intestinals - http://www.internals.com/

```bash
[7416] SearchUI.exe
```

CHAPTER 7   Security      691


---

```bash
\rW DESKTOP-DD6KTPM\aione
    \rW NT AUTHORITY\SYSTEM
    \rW Package
  \S-1-15-2-1861897761-1695161497-2927542615-642690995-327840285-2659745135-2630312742
    Token security:
    \rW DESKTOP-DD6KTPM\aione
    \rW NT AUTHORITY\SYSTEM
    \rW DESKTOP-DD6KTPM\aione-S-1-5-5-0-459087
    \rW Package:
  \S-1-15-2-1861897761-1695161497-2927542615-642690995-327840285-2659745135-2630312742
    R BUILTIN\Administrators
    Token contents:
      User:
        DESKTOP-DD6KTPM\aione
      AppContainer:
      Package
  \S-1-15-2-1861897761-1695161497-2927542615-642690995-327840285-2659745135-2630312742
    Groups:
      Mandatory Label\Low Mandatory Level
              INTEGRITY
              Everyone
              MANDATORY
    \rW AUTHORITY\Local account and member of Administrators group DENY
      ...
    Security Attributes:
      WIN://PKCHOSTID
        TOKEN_SECURITY_ATTRIBUTE_TYPE_UINT64
        [0] 1794402976530433
      WIN://SYSSAPID
        TOKEN_SECURITY_ATTRIBUTE_TYPE_STRING
        [0] Microsoft.Windows.Cortana_1.8.3.14986_neutral_neutral_cw5n1h2txyewy
        [1] CortanaUI
        [2] Microsoft.Windows.Cortana_cw5n1h2txyewy
      WIN://PRG
        TOKEN_SECURITY_ATTRIBUTE_TYPE_UINT64
        [0] 131073
      TSA://ProChuInque
        [TOKEN_SECURITY_ATTRIBUTE_NON_INHERITABLE]
        [TOKEN_SECURITY_ATTRIBUTE_COMPARE_IGNORE]
        TOKEN_SECURITY_ATTRIBUTE_TYPE_UINT64
        [0] 204
        [1] 24566825
```

First is the package host ID, converted to hex: 0x66000000000001. Because all package host IDs begin with 0x66, this means Cortana is using the first available host identifier: 1. Next are the system application IDs, which contain three strings: the strong package moniker, the friendly application name, and the simplified package name. Finally, you have the package claim, which is 0x20001 in hex. Based on the Table 7-13 and Table 7-14 fields you saw, this indicates an origin of Inbox (2) and flags set to PSM_ACTIVATION_TOKEN_PACKAGED_APPLICATION, confirming that Cortana is part of an AppX package.

692 CHAPTER 7 Security

---

## AppContainer security environment

One of the biggest side-effects caused by the presence of an AppContainer SID and related flags is that

the access check algorithm you saw in the "Access checks" section earlier in this chapter is modified to

essentially ignore all regular user and group SIDs that the token may contain, essentially treating them

as deny-only SIDs. This means that even though Calculator may be launched by a user John Doe be longing to the Users and Everyone groups, it will fail any access checks that grant access to John Doe's

SID, the Users group SID, or the Everyone group SID. In fact, the only SIDs that are checked during the

discretionary access check algorithm will be that of the AppContainer SID, followed by the capability

access check algorithm, which will look at any capability SIDs part of the token.

Taking things even further than merely treating the discretionary SIDs as deny-only, AppContainer

tokens effect one further critical security change to the access check algorithm: a NULL DACL, typically

treated as an allow-anyone situation due to the lack of any information (recall that this is different from

an empty DACL, which is a deny-everyone situation due to explicit allow rules), is ignored and treated

as a deny situation. To make matters simple, the only types of securable objects that an AppContainer

can access are those that explicitly have an allow ACE for its AppContainer SID or for one of its capabili ties. Even unsecured (NULL DACL) objects are out of the game.

This situation causes compatibility problems. Without access to even the most basic file system, registry, and object manager resources, how can an application even function? Windows takes this into account by preparing a custom execution environment, or "jail" if you will, specifically for each AppContainer. These jails are as follows:

![Figure](figures/Winternals7thPt1_page_710_figure_004.png)

Note So far we've implied that each UWP packaged application corresponds to one AppContainer token. However, this doesn't necessarily imply that only a single executable file can be associated with an AppContainer. UWP packages can contain multiple executable files, which all belong to the same AppContainer. This allows them to share the same SID and capabilities and exchange data between each other, such as a micro-service back-end executable and a foreground front-end executable.

- ■ The AppContainer SID's string representation is used to create a subdirectory in the object
manager's namespace under \Sessions\\AppDataContainerNamedObjects. This becomes the pri-
vate directory of named kernel objects. This specific subdirectory object is then ACLed with the
AppContainer SID associated with the AppContainer that has an allow-all access mask. This is in
contrast to desktop apps, which all use the \Sessions\BaselineNamedObjects subdirectory (within
the same session x). We'll discuss the implications of that shortly, as well as the requirement for
the token to now store handles.
■ The token will contain a LowBox number, which is a unique identifier into an array of LowBox
Number Entry structures that the kernel stores in the g_SessionLowboxArray global variable.
Each of these maps to a SEP_LOWBOX_NUMBER_ENTRY structure that, most importantly, contains
an atom table unique to this AppContainer, because the Windows Subsystem Kernel Mode
Driver (Win32k.sys) does not allow AppContainers access to the global atom table.
CHAPTER 7   Security      693


---

- ■ The file system contains a directory in %LOCALAPPDATA% called Packages. Inside it are the
package monikers (the string version of the AppContainer SID—that is, the package name) of
all the installed UWP applications. Each of these application directories contains application-
specific directories, such as TempState, RoamingState, Settings, LocalCache, and others, which
are all ACLed with the specific AppContainer SID corresponding to the application, set to an
allow-all access mask.
■ Within the Settings directory is a Settings.dat file, which is a registry hive file that is loaded as
an application hive. (You will learn more about application hives in Chapter 9 in Part 2.) The hive
acts as the local registry for the application, where WinRT APIs store the various persistent state
of the application. Once again, the ACL on the registry keys explicitly grants allow-all access to
the associated AppContainer SID.
These four jails allow AppContainers to securely, and locally, store their file system, registry, and atom table without requiring access to sensitive user and system areas on the system. That being said, what about the ability to access, at least in read-only mode, critical system files (such as Ntdll.dll and Kernel32.dll) or registry keys (such as the ones these libraries will need), or even named objects (such as the \RPCControl\DNSResolver ALPC port used for DNS lookups)? it would not make sense, on each UWP application or uninstallation, to re-ACL entire directories, registry keys, and object namespaces to add or remove various SIDs.

To solve this problem, the security subsystem understands a specific group SID called ALL APPLICATION PACKAGES, which automatically binds itself to any AppContainer token. Many critical system locations, such as %SystemRoot%\System32 and HKLM\Software\Microsoft\Windows\CurrentVersion, will have this SID as part of their DACL, typically with a read or read-and-execute access mask. Certain objects in the object manager namespace will have this as well, such as the DNSResolver ALPC port in the \RPC Control object manager directory. Other examples include certain COM objects, which grant the execute right. Although not officially documented, third-party developers, as they create non-UWP applications, can also allow interactions with UWP applications by also applying this SID to their own resources.

Unfortunately, because UWP applications can technically load almost any Win32 DLL as part of their WinRT needs (because WinRT is built on top of Win32, as you saw), and because it's hard to predict what an individual UWP application might need, many system resources have the ALL APPLICATION PACKAGES SID associated with their DACL as a precaution. This now means there is no way for a UWP developer, for example, to prevent DNS lookups from their application. This greater-than-needed access is also helpful for exploit writers, which could leverage it to escape from the AppContainer sandbox. Newer versions of Windows 10, starting with version 1607 (Anniversary Update), contain an additional element of security to combat this risk: Restricted AppContainers.

By using the PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY process attribute

and setting it to PROCESS_CREATION_ALL_APPLICATION_PACKAGES_OPT_OUT during process creation

(see Chapter 3 for more information on process attributes), the token will not be associated with any

ACEs that specify the ALL_APPLICATION_PACKAGES SID, cutting off access to many system resources

that would otherwise be accessible. Such tokens can be identified by the presence of a fourth token

attribute named WIN: //NOALLAPPPKG,with an integer value set to 1.

694 CHAPTER 7 Security


---

Of course, this takes us back to the same problem: How would such an application even be able to load NtDll.dll, which is key to any process initialization? Windows 10 version 1607 introduces a new group, called ALL RESTRICTED APPLICATION PACKAGES, which takes care of this problem. For example, the System32 directory now also contains this SID, also set to allow read and execute permissions, because loading DLLs in this directory is key even to the most sandboxed process. However, the DNSResolver ALPC port does not, so such an AppContainer would lose access to DNS.

## EXPERIMENT: Viewing AppContainer security attributes

In this experiment, we'll look at the security attributes of some of the directories mentioned in the previous section.

- 1. Make sure Calculator is running.

2. Open WinObj elevated from Sysinternals and navigate to the object directory corre-

sponding to Calculator’s AppContainer SID. (You saw it in a previous experiment.)
![Figure](figures/Winternals7thPt1_page_712_figure_004.png)

CHAPTER 7   Security      695


---

3. Right-click the directory, select Properties, and click the Security tab. You should see

something like the following screenshot. Calculator's AppContainer SID has permission

to list, add object, and add subdirectory (among others scrolled out of view), which

simply means Calculator can create kernel objects under this directory.

![Figure](figures/Winternals7thPt1_page_713_figure_001.png)

4. Open Calculator's local folder by navigating to %LOCALAPPDATA%\Packages\ Microsoft.WindowsCalculator_8wekyb3d8bbwe. Then right-click the Settings subdirectory, select Properties, and click the Security tab. You should see Calculator's AppContainer SID having full permissions for the folder:

![Figure](figures/Winternals7thPt1_page_713_figure_003.png)

5. In Explorer, open the %SystemRoot% directory (for example, C:\Windows), right-click the System32 directory, select Properties, and click the Security tab. You should see the read and execute permissions for all application packages and all restricted application packages (if using Windows 10 version 1607 or later):

696    CHAPTER 7   Security


---

![Figure](figures/Winternals7thPt1_page_714_figure_000.png)

As an alternative, you can use the AccessChk Sysinternals command-line tool to view the same information.

## EXPERIMENT: Viewing the AppContainer atom table

An atom table is a hash table of integers to strings that's used by the windowing system for various identification purposes, such as Window Class registration (RegisterClassEx) and custom Windows messages. The AppContainer private atom table can be viewed with the kernel debugger:

1. Run Calculator, open WinDbg, and start local kernel debugging.

2. Find the Calculator process:

```bash
!kb: !process 0 1 calculator.exe
PROCESS ffff828c9ed1080
    SessionId: 1  Cid: 4bd8   Peb: d040bbc000  ParentCid: 03a4
    DeepFreeze
     DirBase: 5fccaa000  ObjectTable: ffff950ad9fa2800  HandleCount:
<Data Not Accessible>
     Image: Calculator.exe
     _     VadRoot ffff8f828c2b96a0 Vads 168 Clone 0 Private 2938. Modified 3332.
Locked 0.
     DeviceMap ffff950aad2cd2f0
     Token                     ffff950adb313060
     ...
```

3. Use the token value with the following expressions:

```bash
!kbd r? @$t1 = @$0-->NumberOfPackets
!kbd r? @t0 = (ntl_RTL_ATOM_TABLE)((ntl__token*)0xffff950adb313060) ->
!LowboxNumberEntry=AtomTable
!kbd .for (r @$t3 = 0; @$t3 < @$1; r @$t3 = @$3 + 1) { ?? (wchar_t*)0$t0->
```

CHAPTER 7   Security      697


---

```bash
﻿    >Buckets[0$t3]->Name }
    wchar_t * 0xfffff950a'ac39b78a
        "Protocols"
    wchar_t * 0xfffff950a'ac17b7aa
        "Topics"
    wchar_t * 0xfffff950a'b2fd282a
        "TaskbarDPL_Deskband"
    wchar_t * 0xfffff950a'b3e2b47a
        "Static"
    wchar_t * 0xfffff950a'b3c9458a
        "SysTreeView32"
    wchar_t * 0xfffff950a'ac34143a
        "UxSubClassInfo"
    wchar_t * 0xfffff950a'ac5520fa
        "StdShowItem"
    wchar_t * 0xfffff950a'abc6762a
        "SysSetRedraw"
    wchar_t * 0xfffff950a'b4a5340a
        "UIA_WindowVisibilityOverridden"
    wchar_t * 0xfffff950a'ab2c536a
        "True"
        ...
    wchar_t * 0xfffff950a'b492c3ea
        "tooltips_class"
    wchar_t * 0xfffff950a'ac23f46a
        "Save"
    wchar_t * 0xfffff950a'ac29568a
        "MSDraw"
    wchar_t * 0xfffff950a'ac54f32a
        "StdNewDocument"
    wchar_t * 0xfffff950a'b546127a
        "{FB2E3E59-8442-4858-9128-2319BF8DE3B0}"
    wchar_t * 0xfffff950a'ac2e6f4a
        "Status"
    wchar_t * 0xfffff950a'ad9426da
        "ThemePropScrollBarCtl"
    wchar_t * 0xfffff950a'b3edf5ba
        "Edit"
    wchar_t * 0xfffff950a'ab02e32a
        "System"
    wchar_t * 0xfffff950a'b3e6c53a
        "MDIClient"
    wchar_t * 0xfffff950a'ac17a6ca
        "StdDocumentName"
    wchar_t * 0xfffff950a'ac6cbeea
        "StdExit"
    wchar_t * 0xfffff950a'b033c70a
        "[C56C5799-4B83-7FAE-7FAD-4D82F6A53EEF]"
    wchar_t * 0xfffff950a'ab0360fa
        "MicrosoftTabletPenServiceProperty"
    wchar_t * 0xfffff950a'ac2f8fea
        "OLEsystem"
CHAPTER 7  Security
From the Library of
```

---

AppContainer capabilities

As you've just seen, UWP applications have very restricted access rights. So how, for example, is the Microsoft Edge application able to parse the local file system and open PDF files in the user's Documents folder? Similarly, how can the Music application play MP3 files from the Music directory? Whether done directly through kernel access checks or by brokers (which you'll see in the next section), the key lies in capability SIDs. Let's see where these come from, how they are used.

First, UWP developers begin by creating an application manifest that specifies many details of their application, such as the package name, logo, resources, supported devices, and more. One of the key elements for capability management is the list of capabilities in the manifest. For example, let's take a look at Cortana's application manifest, located in %SystemRoot%\SystemApps\Microsoft.Windows. Cortana_cw5nh2txwyey\AppxManifest.xml:

<Capabilities>

<wincap:Capability Name="packageContents"/> <!-- Needed for resolving MRT strings --> <wincap:Capability Name="cortanaSettings"/> <wincap:Capability Name="cloudstore"/> <wincap:Capability Name="visualElementsSystem"/> <wincap:Capability Name="perceptionSystem"/> <wincap:Capability Name="internetClient"/> <wincap:Capability Name="internetClientServer"/> <wincap:Capability Name="privateNetworkClientServer"/> <wincap:Capability Name="enterpriseAuthentication"/> <wincap:Capability Name="musicLibrary"/> <wincap:Capability Name="phoneCall"/> <wincap:Capability Name="picturesLibrary"/> <wincap:Capability Name="sharedUserCertificates"/> <rescap:Capability Name="locationHistory"/> <rescap:Capability Name="userDataSystem"/> <rescap:Capability Name="contactsSystem"/> <rescap:Capability Name="phoneCallHistorySystem"/> <rescap:Capability Name="appointmentsSystem"/> <rescap:Capability Name="chatSystem"/> <rescap:Capability Name="smsSend"/> <rescap:Capability Name="emailSystem"/> <rescap:Capability Name="packageQuery"/> <rescap:Capability Name="slapiLicenseValue"/> <rescap:Capability Name="secondaryAuthenticationFactor"/> <DeviceCapability Name="microphone"/> <DeviceCapability Name="location"/> <DeviceCapability Name="WiFiControl"/> </Capabilities>

You'll see many types of entries in this list. For example, the Capability entries contain the wellknown SIDS associated with the original capability set that was implemented in Windows 8. These begin with SECURITY_CAPABILITY—for example, SECURITY_CAPABILITY_INTERNET_CLIENT, which is part of the capability RID under the APPLICATION PACKAGE Authority. This gives us a SID of S-1-15-3-1 in string format.

CHAPTER 7 Security 699


---

Other entries are prefixed with uap, rescap, and wnicap. One of these (rescap) refers to restricted capabilities. These are capabilities that require special onboarding from Microsoft and custom approvals before being allowed on the store. In Cortana's case, these include capabilities such as accessing SMS text messages, emails, contacts, location, and user data. Windows capabilities, on the other hand, refer to capabilities that are reserved for Windows and system applications. No store application can use these. Finally, UAP capabilities refer to standard capabilities that anyone can request on the store. (Recall that UAP is the older name for UWV.)

Unlike the first set of capabilities, which map to hard-coded RIDs, these capabilities are implemented in a different fashion. This ensures a list of well-known RIDs doesn’t have to be constantly maintained. Instead, with this mode, capabilities can be fully custom and updated on the fly. T o do this, they simply take the capability string, convert it to full upper-case format, and take a SHA-2 hash of the resulting string, much like AppContainer package SIDs are the SHA-2 hash of the package moniker. Again, since SHA-2 hashes are 32 bytes, this results in 8 RIDs for each capability, following the wellknown SECURITY_CAPABILITY_BASE_RID (3).

Finally, you'll notice a few Devi ceCapacity entries. These refer to device classes that the UWP application will need to access, and can be identified either through well-known strings such as the ones you see above or directly by a GUID that identifies the device class. Rather than using one of the two methods of SID creation already described, this one uses yet a third! For these types of capabilities, the GUID is converted into a binary format and then mapped out into four RIDs (because a GUID is 16 bytes). On the other hand, if a well-known name was specified instead, it must first be converted to a GUID. This is done by looking at the HKLM\Software\Microsoft\Windows\CurrentVersion\DeviceAccess\CapabilityMappings registry key, which contains a list of registry keys associated with device capabilities and a list of GUIDs that map to these capabilities. The GUIDs are then converted to a SID as you've just seen.

![Figure](figures/Winternals7thPt1_page_717_figure_003.png)

Note For an up-to-date list of supported capabilities, see https://msdn.microsoft.com/enus/windows/uwp/packaging/app-capability-declarations.

As part of encoding all of these capabilities into the token, two additional rules are applied:

- ■ As you may have seen in the earlier experiment, each AppContainer token contains its own

package SID encoded as a capability. This can be used by the capability system to specifically

lock down access to a particular app through a common security check instead of obtaining and

validating the package SID separately.

■ Each capability is re-encoded as a group SID through the use of the SECURITY_CAPABILITY_APP_

RID (1024) RID as an additional sub-authority preceding the regular eight-capability hash RIDs.
After the capabilities are encoded into the token, various components of the system will read them to determine whether an operation being performed by an AppContainer should be permitted. You'll note most of the APIs are undocumented, as communication and interoperability with UWP applications is not officially supported and best left to broker services, inbox drivers, or kernel components. For example, the kernel and drivers can use the RtlCapabilityCheck API to authenticate access to certain hardware interfaces or APIs.

700    CHAPTER 7   Security


---

As an example, the Power Manager checks for the ID_CAP_SCREENOFF capability before allowing a request to shut off the screen from an AppContainer. The Bluetooth port driver checks for the

bluetoothagnostic capability, while the application identity driver checks for Enterprise Data Protection (EDP) support through the enterpriseDataServicePolicy capability. In user mode, the documented

CheckTokenCapability API can be used, although it must know the capability SID instead of providing the name (the undocumented RidDeviceCapabilitySidFromName can generate this, however). Another option is the undocumented CapabilityCheck API, which does accept a string.

Finally, many RPC services leverage the RpcClientCapabilityCheck API, which is a helper function

that takes care of retrieving the token and requires only the capability string. This function is very com monly used by many of the WinRT-enlightened services and brokers, which utilize RPC to communicate

with UWP client applications.

## EXPERIMENT: Viewing AppContainer capabilities

To clearly demonstrate all these various capability combinations and their population in the

token, let's look at the capabilities for a complex app such as Cortana. You've already seen its

manifest, so you can use that output to compare with the UI. First, looking at the Security tab for

SearchUI.exe shows the following (sorted by the Flags column):

![Figure](figures/Winternals7thPt1_page_718_figure_004.png)

Clearly, Cortana has obtained many capabilities—all the ones in its manifest. Some are those that were originally in Windows 8 and are known to functions like ISEW11KnownSID, for which Process Explorer shows a friendly name. Other capabilities are just shown using their SID, as they represent either hashes or GUIDs, as discussed.

CHAPTER 7   Security      701


---

To get the details of the package from which the UWP process was created, you can use the

UIPList tool provided with the downloadable resources for this book. It can show all immersive

processes on the system or a single process based on its ID:

```bash
C:\Windows\Internals\UwpList.exe 3728
List UWP Processes - version 1.1 (C)2016 by Pavel Yosifovich
Building capabilities map... done.
Process ID:   3728
----------------------
Image name: C:\Windows\SystemApps\Microsoft.Windows.Cortana_cw5lh2txyew\SearchUI.exe
Package name: Microsoft.Windows.Cortana
Publisher: C:\Microsoft Windows, O=\Microsoft Corporation, L=Redmond, S=Washington, C=US
Published ID: cw5lh2txyew
Architecture: Neutral
Version: 1.7.0.14393
AppContainer SID: S-1-15-3-1861897761-1695161497-2927542615-642690995-327840285-
2659745135-2630312742
Lowbox Number: 3
Capabilities: 32
cortanaSettings (S-1-15-3-1024-1216833578-114521899-3977640588-1343180512-
2500559295-473916851-3379430393-3088591068) (ENABLED)
visualElementsSystem (S-1-15-3-1024-329925270-1847605585-2201808924-710406709-
3613095291-87328683-3101090833-2655911836) (ENABLED)
perceptionSystem (S-1-15-3-1024-34359262-2669769421-2130994847-3068338639-
3284271446-2009814230-2411358368-814686955) (ENABLED)
internetClient (S-1-15-3-1) (ENABLED)
internetClientServer (S-1-15-3-2) (ENABLED)
privateNetworkClientServer (S-1-15-3-3) (ENABLED)
enterpriseAuthentication (S-1-15-3-8) (ENABLED)
musicLibrary (S-1-15-3-6) (ENABLED)
phoneCall (S-1-15-3-1024-383293015-3350740429-1839969850-1819881064-1569454686-
4198502490-78857879-413643331) (ENABLED)
picturesLibrary (S-1-15-3-4) (ENABLED)
sharedUserCertificates (S-1-15-3-9) (ENABLED)
locationHistory (S-1-15-3-1024-3029335854-3332959268-2610968494-1944663922-
1098717379-267808753-129235239-2860040626) (ENABLED)
userDataSystem (S-1-15-3-1024-3242773698-3647103388-1207114580-2173246572-
4287945184-2279574858-157813651-6013457015) (ENABLED)
contactsSystem (S-1-15-3-1024-2897291008-3029319760-3330334796-465461623-3782203132-
742823505-3649274736-3650177846) (ENABLED)
phoneCallHistorySystem (S-1-15-3-1024-2442212369-1516598453-2330995131-346986071-
605735848-2536508394-3691267241-2105387825) (ENABLED)
appointmentsSystem (S-1-15-3-1024-2643354558-482754284-283940418-2629559125-
2595130947-54775827-81840453-1102480765) (ENABLED)
chatSystem (S-1-15-3-1024-221086543-3515987149-1329579022-3761842879-1342652231-
37191945-418085147-4248464962) (ENABLED)
smsSend (S-1-15-3-1024-128185722-850430189-1529384825-139260814-329499951-
1660931883-3499805559-3019957964) (ENABLED)
emailSystem (S-1-15-3-1024-2357373614-1717914693-1151184220-2820539834-3900626439-
4045196508-2174624583-3459390060) (ENABLED)
CHAPTER 7  Security
From the Library
```

---

```bash
package Query (S-1-15-3-1024-196284981-68847262-357141782-3628679630-802580238-
192256387-206211640-333523193) (ENABLED)
s!apiQuerylicenseValue (S-1-15-3-1024-3578070928-3742718786-7859573-1930844942-
2947999617-2910175080-1780299064-4154191454) (ENABLED)
S-1-15-3-1861897761-1695161497-2927542615-642609995-327840285-2659745135-2630312742
(ENABLED)
S-1-15-3-787448254-1207927858-3558633622-1059886964 (ENABLED)
S-1-15-3-3215430884-1339816292-89257616-1145811019 (ENABLED)
S-1-15-3-3071617654-1314403908-1117750160-3581451107 (ENABLED)
S-1-15-3-593192589-1214558892-284007604-3553228420 (ENABLED)
S-1-15-3-3870105118-1154309966-1696731070-4111176952 (ENABLED)
S-1-15-3-2105443330-1210154068-4021178019-2481794518 (ENABLED)
S-1-15-3-2145035983-1170044712-735049875-288301087 (ENABLED)
S-1-15-3-3633849274-1266774400-1199443125-2736873758 (ENABLED)
S-1-15-3-256930672-1095266119-53537203-2109375796 (ENABLED)
S-1-15-3-2452736844-1257488215-2818397580-3305426111 (ENABLED)
```

The output shows the package full name, executable directory, AppContainer SID, publisher information, version, and list of capabilities. Also shown is the LowBox number, which is just a local index of the app.

Lastly, you can inspect these properties in the kernel debugger with the !token command.

Some UWP apps are called trusted, and although they use the Windows Runtime platform like

other UWP apps, they do not run inside an AppContainer, and have an integrity level higher than

Low. The canonical example is the System Settings app (%SystemRoot%\ImmersiveControlPanel\

SystemSettings.exe); this seems reasonable, as the Settings app must be able to make changes to the

system that would be impossible to do from an AppContainer-hosted process. If you look at its token,

you will see the same three attributes—PKG, SYSAPPID, and PKGDISTID—which confirm that it’s still a

packaged application, even without the AppContainer token present.

## AppContainer and object namespace
