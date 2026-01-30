
Desktop applications can easily share kernel objects by name. For example, suppose process A creates an event object by calling CreateEvent(Ex) with the name MyEvent. It gets back a handle it can later use to manipulate the event. Process B running in the same session can call CreateEvent(Ex) or OpenEvent with the same name, MyEvent, and (assuming it has appropriate permissions, which is usually the case if running under the same session) get back another handle to the same underlying event object. Now if process A calls SetEvent on the event object while process B was blocked in a call to

WaitForSingleObject on its event handle, process B's waiting thread would be released because it's the same event object. This sharing works because named objects are created in the object manager directory \Sessions\backNamedObjects, as shown in Figure 7-18 with the WinObj Sysinternals tool.

Furthermore, desktop apps can share objects between sessions by using a name prefixed with

Global\. This creates the object in the session 0 object directory located in \BaseNamedObjects (refer

to Figure 7-18).

CHAPTER 7   Security      703


---

![Figure](figures/Winternals7thPt1_page_721_figure_000.png)

FIGURE 7-18 Object manager directory for named objects.

AppContainer-based processes have their root object namespace under \Sessions\backslash\AppData NamedObjects\<AppContainerSID>. Since every AppContainer has a different AppContainer SID, there is no way two UWP apps can share kernel objects. The ability to create a named kernel object in the session 0 object namespace is not allowed for AppContainer processes. Figure 7-19 shows the object manager's directory for the Windows UWP Calculator app.

UWP apps that want to share data can do so using well-defined contracts, managed by the

Windows Runtime. (See the MSDN documentation for more information.)

Sharing kernel objects between desktop apps and UWP apps is possible, and often done by broker services. For example, when requesting access to a file in the Documents folder (and getting the right capability validated) from the file picker broker, the UWP app will receive a file handle that it can use for reads and writes directly, without the cost of marshalling requests back and forth. This is achieved by having the broker duplicate the file handle it obtained directly in the handle table of the UWP application. (More information on handle duplication appears in Chapter 8 in Part 2.) To simplify things even further, the ALPC subsystem (also described in Chapter 8) allows the automatic transfer of handles in this way through ALPC handle attributes, and the Remote Procedure Call (RPC) services that use ALPC as their underlying protocol can use this functionality as part of their interfaces. Marshallable handles in the IDL file will automatically be transferred in this way through the ALPC subsystem.

704    CHAPTER 7   Security


---

![Figure](figures/Winternals7thPt1_page_722_figure_000.png)

FIGURE 7-19 Object manager directory for Calculator.

Outside of official broker RPC services, a desktop app can create a named (or even unnamed) object

normally, and then use the Dup11 callHandle function to inject a handle to the same object into the UWP

process manually. This works because desktop apps typically run with medium integrity level and there's

nothing preventing them from duplicating handles into UWP processes—only the other way around.

![Figure](figures/Winternals7thPt1_page_722_figure_003.png)

Note Communication between a desktop app and a UWP is not usually required because a store app cannot have a desktop app companion, and cannot rely on such an app to exist on the device. The capability to inject handles into a UWP app may be needed in specialized cases such as using the desktop bridge (Centennial) to convert a desktop app to a UWP app and communicate with another desktop app that is known to exist.

## AppContainer handles

In a typical Win32 application, the presence of the session-local and global BaseNamedObjects directory is guaranteed by the Windows subsystem, as it creates this on boot and session creation. Unfortunately, the AppContainerBaseNamedObjects directory is actually created by the launch application itself. In the case of UWP activation, this is the trusted DComLaunch service, but recall that not all AppContainers are necessarily tied to UWP. They can also be manually created through the right process-creation attributes. (See Chapter 3 for more information on which ones to use.) In this case, it's possible for an untrusted application to have created the object directory (and required symbolic links within it), which would result

CHAPTER 7   Security      705


---

in the ability for this application to close the handles from underneath the AppContainer application.

Even without malicious intent, the original launching application might exit, cleaning up its handles and

destroying the AppContainer-specific object directory. To avoid this situation, AppContainer tokens have

the ability to store an array of handles that are guaranteed to exist throughout the lifetime of any applica tion using the token. These handles are initially passed in when the AppContainer token is being created

(through NtCreateLowBoxToken) and are duplicated as kernel handles.

Similar to the per-AppContainer atom table, a special SEP_CACHED_HANDLES_ENTRY structure is

used, this time based on a hash table that's stored in the logon session structure for this user.(See the

"Logon" section later in this chapter for more information on logon sessions.) This structure contains an

array of kernel handles that have been duplicated during the creation of the AppContainer token. They

will be closed either when this token is destroyed (because the application is exiting) or when the user

logs off (which will result in tearing down the logon session).

## EXPERIMENT: Viewing token stored handles

To view token stored handles, follow these steps:

1. Run Calculator and launch local kernel debugging.

2. Search for the calculator process:

```bash
!kb -lprocess 0 1 calculator.exe
PROCESS ffff828c9ed1080
    SessionId: 1  Cid: 4bd8   Peb: d040bbc000  ParentCid: 03a4
DeepFreeze
    DirBase: 5fccaa000  ObjectTable: ffff950ad9fa2800  HandleCount:
        <Data Not Accessible>
    Image: Calculator.exe
        VadRoot ffff828c2dc9b6a0 Vads 168 Clone 0 Private 2938. Modified 3332.
Locked 0.
        DeviceMap ffff950aad2cd2f0
        Token                          ffff950adb313060
        ElapsedTime                    1 Day 08:01:47.018
        UserTime                       00:00:00.015
        KernelTime                       00:00:00.031
        QuotaPoolUsage[PagedPool]   465880
        QuotaPoolUsage[NonPagedPool]   23288
        Working Set Sizes (now,min,max)   (7434, 50, 345) (29736KB, 200KB, 1380KB)
        PeakWorkingSetSize            11097
        VirtualSize                   303 Mb
        PeakVirtualSize                314 Mb
        PageFaultCount                 21281
        MemoryPriority               BACKGROUND
        BasePriority                 8
        CommitCharge                 4925
        Job                          ffff828c4d914060
```

706    CHAPTER 7   Security


---

3. Dump the token using the dt command. (Remember to mask the lower 3 or 4 bits if they are not zero.)

```bash
1k6d- dt nt1_token ffff950adb313060
+0x000 TokenSource    : _TOKEN_SOURCE
+0x010 TokenId        : _LUID
+0x018 AuthenticationId : _LUID
+0x020 ParentTokenId   : _LUID
...
+0x0c8 TokenFlags      : 0x4a00
+0x0cc TokenInUse      : 0x1 ''
+0x0d0 IntegrityLevelIndex : 1
+0x0d4 MandatoryPolicy    : 1
+0x0d8 LogonSession      : 0xffff950a'b4bb35c0 _SEP_LOGON_SESSION_REFERENCES
+0x0e0 OriginatingLogonSession : _LUID
+0x0e8 SidHash          : _SID_AND_ATTRIBUTES_HASH
+0x1f8 RestrictedSidHash : _SID_AND_ATTRIBUTES_HASH
+0x308 pSecurityAttributes : 0xffff950a'e4ff57f0 _AUTHZBASEP_SECURITY_
ATTRIBUTES_INFORMATION
+0x310 Package       : 0xffff950a'e0e0ed60d Void
+0x318 Capabilities      : 0xffff950a'e8e8fbc0 _SID_AND_ATTRIBUTES
+0x320 CapabilityCount : 1
+0x328 CapabilityHash : _SID_AND_ATTRIBUTES_HASH
+0x438 LowboxNumberEntry: 0xffff950a'b3fd55d0 _SEP_LOWBOX_NUMBER_ENTRY
+0x440 LowboxHandlesEntry: 0xffff950a'e6ff91d0 _SEP_LOWBOX_HANDLES_ENTRY
+0x448 pClaimAttributes : (null)
...
```

4. Dump the LowboxHandlesEntry member:

```bash
!kbd dt nt1_seq_lowbox_handles_entry 0xffff950a'e6ff91d0
+0x000 HashEntry        : =_RTL_DYNAMIC_HASH_TABLE_ENTRY
+0x018 ReferenceCount : 0n10
+0x020 PackageSid       : 0xffff950a'e6ff9208 Void
+0x028 HandleCount      : 6
+0x030 Handles        : 0xffff950a'e91d8490 -> 0xffffffff'800023cc Void
```

5. There are six handles. Let's dump their values:

```bash
!kbq-dk 0xf9ff950ea91d8490 L6
"ffffffff90a1e9d8490    ffffffff800023cc ffffffffffff80001e80
ffffffff90a1e9d84a0    ffffffff80004214 ffffffff800042c5
ffffffff90a1e9d84b0    ffffffff800028c8 ffffffff80001834
```

6. You can see that these handles are kernel handles—that is, handle values starting with 0xffffffff (64 bit). Now you can use the !handle command to look at individual handles. Here are two examples from the six handles above:

```bash
!kdo :!handle ffffffff'80001e80
PROCESS ffff828cd71b3600
    SessionId: 1 Cid: 27c4   Feb: 3fdbf2f000  ParentCid: 2324
```

CHAPTER 7   Security      707


---

```bash
DirBase: 80bb85000  ObjectTable: ffff950addabf7c0  HandleCount:
        <Data Not Accessible>      Image: windbg.exe
        Kernel handle Error reading handle count.
        80001e80: Object: ffff950ada206ea0  GrantedAccess: 0000000f (Protected)
        (Inherits) (Audit) Entry: ffff950ab5406a0
        Object: ffff90ada206ea0 Type: (ffff828cb6b33b0) Directory
            ObjectHeader: ffff950ada206e70 (new version)
            HandleCount: 1  PointerCount: 32770
            Directory Object: ffff950ad9a62950  Name: RPC Control
                Hash Address                Type                    Name
                            ....                          ....                          ....
                23  ffff828cb6ce6950 ALPC Port
        OLE376512B90BCASDE4208534E7732
        1kb> !handle fffffffff'800028c8
        PROCESS ffff828cd71b3600
            SessionId: 1  Cid: 27c4    Feb: 3fdfb2f000  ParentCid: 2324
            DirBase: 80db85000  ObjectTable: ffff950addabf7c0  HandleCount: <Data
        Not Accessible>      Image: windbg.exe
        Kernel handle Error reading handle count.
        800028c8: Object: ffff950ae7a8fa70  GrantedAccess: 000f0001 (Audit) Entry:
        ffff950acd42630
        Object: ffff90aa7a8fa70 Type: (ffff828cb66296f0) SymbolicLink
            ObjectHeader: ffff950aa7a8fa40 (new version)
            HandleCount: 1  PointerCount: 32769
            Directory Object: ffff950ad9a62950  Name: Session
            Flags: 00000000 (Local )
            Target String is '\Sessions\1AppContainerNamedObjects
        \S-1-15-2-466767348-3739614953-2700836392-1801644223-4227750657
        -1087833535-2488631167'
```

Finally, because the ability to restrict named objects to a particular object directory namespace

is a valuable security tool for sandboxing named object access, the upcoming (at the time of this

writing) Windows 10 Creators Update includes an additional token capability called BNO isolation

(where BNO refers to BaseNamedObjects). Using the same SEP_CACHE_HANDLES_ENTRY structure,

a new field, BnoIsolationHandlesEntry, is added to the TOKEN structure, with the type set to

SepCachedHandlesEntryBnoIsolation instead of SepCachedHandlesEntryLowBox. T o use this fea ture, a special process attribute must be used (see Chapter 3 for more information), which contains an

isolation prefix and a list of handles. At this point, the same LowBox mechanism is used, but instead of

an AppContainer SID object directory, a directory with the prefix indicated in the attribute is used.

---

## Brokers

Because AppContainer processes have almost no permissions except for those implicitly granted with capabilities, some common operations cannot be performed directly by the AppContainer and require help. (There are no capabilities for these, as these are too low level to be visible to users in the store, and difficult to manage.) Some examples include selecting files using the common File Open dialog box or printing with a Print dialog box. For these and other similar operations, Windows provides helper processes, called brokers, managed by the system broker process, RuntimeBroker.exe.

An AppContainer process that requires any of these services communicates with the Runtime Broker through a secure ALPC channel and Runtime Broker initiates the creation of the requested broker process. Examples are %SystemRoot%\PrintDialog%\PrintDialog.exe and %SystemRoot%\System32\PickerHost.exe.

EXPERIMENT: Brokers

The following steps show how broker processes are launched and terminated:

1. Click the Start button, type Photos, and select the Photos option to run the built-in

Windows 10 Photos application.

2. Open Process Explorer, switch the process list to a tree view, and locate the Microsoft.

Photos.exe process. Place both windows side by side.

3. In the Photos app, select a picture file, and click Print in the top ellipsis menu or rightclick the picture and choose Print from the menu that appears. The Print dialog box should open, and Process Explorer should show the newly created broker (PrintDialog. exe). Notice they are all children of the same Svchost process. (All UWP processes are launched by the DCOM-launch service hosted inside that process.)

![Figure](figures/Winternals7thPt1_page_726_figure_008.png)

4. Close the Print dialog box. The PrintDialog.exe process should exit.

---

Logon

Interactive logon (as opposed to network logon) occurs through the interaction of the following:

- ● The logon process (Winlogon.exe)

● The logon user interface process (LogonUI.exe) and its credential providers

● Lsass.exe

● One or more authentication packages

● SAM or Active Directory
Authentication packages are DLLs that perform authentication checks. Kerberos is the Windows

authentication package for interactive logon to a domain. MSV1_0 is the Windows authentication

package for interactive logon to a local computer, for domain logons to trusted pre-Windows 2000

domains, and for times when no domain controller is accessible.

Winlogon is a trusted process responsible for managing security-related user interactions. It coordinates logon, starts the user's first process at logon, and handles logoff. It also manages various other operations relevant to security, including launching LogonUI for entering passwords at logon, changing passwords, and locking and unlocking the workstation. The Winlogon process must ensure that operations relevant to security aren't visible to any other active processes. For example, Winlogon guarantees that an untrusted process can't get control of the desktop during one of these operations and thus gain access to the password.

Winlogon relies on the credential providers installed on the system to obtain a user's account name or password. Credential providers are COM objects located inside DLLs. The default providers are authui. dll, SmartcardCredentialProvider.dll, and FaceCredentialProvider.dll, which support password, smartcard PIN, and face-recognition authentication, respectively. Allowing other credential providers to be installed enables Windows to use different user-identification mechanisms. For example, a third party might supply a credential provider that uses a thumbprint-recognition device to identify users and extract their passwords from an encrypted database. Credential providers are listed in HKLM\SOFTWARE\Microsoft\ Windows\CurrentVersion\Authentication\Credential Providers, where each subkey identifies a credential provider class by its COM CLSID. (The CLSID itself must be registered at HKCR\CLSID like any other COM class.) You can use the CPlist.exe tool provided with the downloadable resources for this book to list the credential providers with their CLSID, friendly name, and implementation DLL.

To protect Winlogon's address space from bugs in credential providers that might cause the

Winlogon process to crash (which, in turn, will result in a system crash, because Winlogon is considered

a critical system process), a separate process, LogonUI.exe, is used to actually load the credential pro viders and display the Windows logon interface to users. This process is started on demand whenever

Winlogon needs to present a user interface to the user, and it exits after the action has finished. It also

allows Winlogon to simply restart a new LogonUI process should it crash for any reason.

Winlogon is the only process that intercepts logon requests from the keyboard. These are sent through an RPC message from Win32x.sys. Winlogon immediately launches the LogonUI application to

710    CHAPTER 7   Security


---

display the user interface for logon. After obtaining a user name and password from credential providers, Winlogon calls Lsass to authenticate the user attempting to log on. If the user is authenticated, the logon process activates a logon shell on behalf of that user. The interaction between the components involved in logon is illustrated in Figure 7-20.

![Figure](figures/Winternals7thPt1_page_728_figure_001.png)

FIGURE 7-20 Components involved in logon.

In addition to supporting alternative credential providers, LogonUI can load additional network provider DLLs that need to perform secondary authentication. This capability allows multiple network providers to gather identification and authentication information all at one time during normal logon. A user logging on to a Windows system might simultaneously be authenticated on a Linux server. That user would then be able to access resources of the UNIX server from the Windows machine without requiring additional authentication. Such a capability is known as one form of single sign-on.

## Winlogon initialization

During system initialization, before any user applications are active, Winlogon performs the following steps to ensure that it controls the workstation once the system is ready for user interaction:

- 1. It creates and opens an interactive window station (for example, \Sessions\1\Windows\
WindowStations\WinSta0 in the object manager namespace) to represent the keyboard,
mouse, and monitor. Winlogon creates a security descriptor for the station that has one and
only one ACE containing only the system SID. This unique security descriptor ensures that no
other process can access the workstation unless explicitly allowed by Winlogon.

2. It creates and opens two desktops: an application desktop (\Sessions\1\Windows\WinSta0\
Default, also known as the interactive desktop) and a Winlogon desktop (\Sessions\1\Windows\
WinSta0\Winlogon, also known as the Secure Desktop). The security on the Winlogon desk-
top is created so that only Winlogon can access that desktop. The other desktop allows both
CHAPTER 7   Security      711


---

Winlogon and users to access it. This arrangement means that any time the Winlogon desktop is active, no other process has access to any active code or data associated with the desktop. Windows uses this feature to protect the secure operations that involve passwords and locking and unlocking the desktop.

- 3. Before anyone logs on to a computer, the visible desktop is Winlogon's. After a user logs on,
pressing the SAS sequence (by default, Ctrl+Alt+Del) switches the desktop from Default to
Winlogon and launches LogonUI. (This explains why all the windows on your interactive desktop
seem to disappear when you press Ctrl+Alt+Del, and then return when you dismiss the Windows
Security dialog box.) Thus, the SAS always brings up a Secure Desktop controlled by Winlogon.

4. It establishes an ALPC connection with Lsas. This connection will be used for exchang-
ing information during logon, logoff, and password operations, and is made by calling
LsaRegisterLogonProcess.

5. It registers the Winlogon RPC message server, which listens for SAS, logoff, and workstation
lock notifications from Win32k. This measure prevents Trojan horse programs from gaining
control of the screen when the SAS is entered.
![Figure](figures/Winternals7thPt1_page_729_figure_002.png)

Note The Wininit process performs steps similar to steps 1 and 2 to allow legacy interactive services running on session 0 to display windows, but it does not perform any other steps because session 0 is not available for user logon.

## How SAS is implemented

The SAS is secure because no application can intercept the Ctrl+Alt+Del keystroke combination or prevent Winlogon from receiving it. Win32k.sys reserves the Ctrl+Alt+Del key combination so that whenever the Windows input system (implemented in the raw input thread in Win32k) sees the combination, it sends an RPC message to Winlogon's message server, which listens for such notifications. The keystrokes that map to a registered hot key are not sent to any process other than the one that registered it, and only the thread that registered a hot key can unregister it, so a Trojan horse application cannot deregister Winlogon's ownership of the SAS.

A Windows function, SetWindowsHookEx, enables an application to install a hook procedure that's invoked every time a keystroke is pressed, even before hot keys are processed, and allows the hook to squash keystrokes. However, the Windows hot key processing code contains a special case for Ctrl+Alt+Del that disables hooks so that the keystroke sequence can't be intercepted. In addition, if the interactive desktop is locked, only hot keys owned by Winlogon are processed.

Once the Winlogon desktop is created during initialization, it becomes the active desktop. When the Winlogon desktop is active, it is always locked. Winlogon unlocks its desktop only to switch to the application desktop or the screen-saver desktop. (Only the Winlogon process can lock or unlock a desktop.)

712 CHAPTER 7 Security


---

## User logon steps

Logon begins when a user presses the SAS (Ctrl+Alt+Del). After the SAS is pressed, Winlogon starts LogonUI, which calls the credential providers to obtain a user name and password. Winlogon also creates a unique local logon SID for this user, which it assigns to this instance of the desktop (keyboard, screen, and mouse). Winlogon passes this SID to L as part of the LsalogonUsr call. If the user is successfully logged on, this SID will be included in the logon process token—a step that protects access to the desktop. For example, another logon to the same account but on a different system will be unable to write to the first machine's desktop because this second logon won't be in the first logon's desktop token.

When the user name and password have been entered, Winlogon retrieves a handle to a package by calling the Lsa function LsaLookupAuthenticationPackage. Authentication packages are listed in the registry under HKLM\SYSTEM\CurrentControlSet\Control\Lsa. Winlogon passes logon information to the authentication package via LsaLogonUser. Once a package authenticates a user, Winlogon continues the logon process for that user. If none of the authentication packages indicates a successful logon, the logon process is aborted.

Windows uses two standard authentication packages for interactive username/password-based logons:

- ■ MSV1_0 The default authentication package on a stand-alone Windows system is MSV1_0
(Msv1_0.dll), an authentication package that implements LAN Manager 2 protocol. Lsas also
uses MSV1_0 on domain-member computers to authenticate to pre-Windows 2000 domains
and computers that can't locate a domain controller for authentication. (Computers that are
disconnected from the network fall into this latter category.)
■ Kerberos The Kerberos authentication package, Kerberos.dll, is used on computers that
are members of Windows domains. The Windows Kerberos package, with the cooperation
of Kerberos services running on a domain controller, supports the Kerberos protocol. This
protocol is based on Internet RFC 1510. (Visit the Internet Engineering Task Force [IETF] website
at http://www.ietf.org for detailed information on the Kerberos standard.)
## MSV1_0

The MSV1_0 authentication package takes the user name and a hashed version of the password and sends a request to the local SAM to retrieve the account information, which includes the hashed password, the groups to which the user belongs, and any account restrictions. MSV1_0 first checks the account restrictions, such as hours or type of accesses allowed. If the user can't log on because of the restrictions in the SAM database, the logon call fails and MSV1_0 returns a failure status to the LSA.

MSV1_0 then compares the hashed password and user name to that obtained from the SAM. In the case of a cached domain logon, MSV1_0 accesses the cached information by using Lsas functions that store and retrieve "secrets" from the LSA database (the SECURITY hive of the registry). If the information matches, MSV1_0 generates a LUID for the logon session and creates the logon session by calling Lsass, associating this unique identifier with the session and passing the information needed to ultimately create an access token for the user. (Recall that an access token includes the user's SID, group SIDs, and assigned privileges.)

CHAPTER 7   Security      713


---

![Figure](figures/Winternals7thPt1_page_731_figure_000.png)

Note MSV1_0 does not cache a user's entire password hash in the registry because that would enable someone with physical access to the system to easily compromise a user's domain account and gain access to encrypted files and to network resources the user is authorized to access. Instead, it caches half of the hash. The cached half-hash is sufficient to verify that a user's password is correct, but it isn't sufficient to gain access to EFS keys and to authenticate as the user on a domain because these actions require the full hash.

If MSV1_0 needs to authenticate using a remote system, as when a user logs on to a trusted preWindows 2000 domain, MSV1_0 uses the Netlogon service to communicate with an instance of Netlogon on the remote system. Netlogon on the remote system interacts with the MSV1_0 authentication package on that system, passing back authentication results to the system on which the logon is being performed.

## Kerberos

The basic control flow for Kerberos authentication is the same as the flow for MSV1_0. However, in most cases, domain logons are performed from member workstations or servers rather than on a domain controller, so the authentication package must communicate across the network as part of the authentication process. The package does so by communicating via the Kerberos TCP/IP port (port 88) with the Kerberos service on a domain controller. The Kerberos Key Distribution Center service (Kdcsvc.dll), which implements the Kerberos authentication protocol, runs in the Lsas process on domain controllers.

After validating hashed user-name and password information with Active Directory's user account objects (using the Active Directory server Ndsia.dll), Kdscvc returns domain credentials to Lsass, which returns the result of the authentication and the user's domain logon credentials (if the logon was successful) across the network to the system where the logon is taking place.

![Figure](figures/Winternals7thPt1_page_731_figure_006.png)

Note This description of Kerberos authentication is highly simplified, but it highlights the

roles of the various components involved. Although the Kerberos authentication protocol

plays a key role in distributed domain security in Windows, its details are outside the scope

of this book.

After a logon has been authenticated, Lsass looks in the local policy database for the user's allowed access, including interactive, network, batch, or service process. If the requested logon doesn't match the allowed access, the logon attempt will be terminated. Lsass deletes the newly created logon session by cleaning up any of its data structures and then returns failure to Winlogon, which in turn displays an appropriate message to the user. If the requested access is allowed, Lsass adds the appropriate additional security IDs (such as Everyone, Interactive, and the like). It then checks its policy database for any granted privileges for all the SIDs for this user and adds these privileges to the user's access token.

When Lsas has accumulated all the necessary information, it calls the executive to create the access token. The executive creates a primary access token for an interactive or service logon and an impersonation

714 CHAPTER 7 Security


---

token for a network token. After the access token is successfully created, Lsass duplicates the token, creating a handle that can be passed to Winlogon, and closes its own handle. If necessary, the logon operation is audited. At this point, Lsass returns success to Winlogon along with a handle to the access token, the LUID for the logon session, and the profile information, if any, that the authentication package returned.


EXPERIMENT: Using active logon sessions

As long as at least one token exists with a given logon session LUID, Windows considers the

logon session to be active. You can use the LogonSessions tool from Sysinternals, which uses

the LsaEnumerateLogonSessions function (documented in the Windows SDK) to list the active

logon sessions:

C:\WINDOWS\system32\logonsessions

LogonSessions v1.4 = Lists logon session information

Copyright (C) 2004-2016 Mark Russinovich

Sysinternals - www.sysinternals.com

[0] Logon session 00000000:00000037:

User name: WORKGROUP>ZODIAC5

Auth package: NTLM

Logon type: (none)

Session: 0

Sid: 5-1-5-18

Logon time: 09-Dec-16 15:22:31

Logon server:

UPN:

[1] Logon session 00000000:00000037:

User name: Workgroup:NTLM

Auth package: NTLM

Logon type: (none)

Session: 0

Sid: 5-1-5-18

Logon time: 09-Dec-16 15:22:31

Logon server:

DNS Domain:

UPN:

[2] Logon session 00000000:00000037:

User name: WorkGROUP:ZODIAC5

Auth package: Negotiate

Logon type: Service

Session: 0

Sid: 5-1-5-18

Logon time: 09-Dec-16 15:22:31

Logon server:

DNS Domain:

UPN:


CHAPTER 7 Security 715



---

```bash
[3] Logon session 00000000:00016239:
     User name:    Window Manager\DCM-1
     Auth package: Negotiate
     Logon type:    Interactive
     Session:      1
     Sid:          5-1-5-90-0-1
     Logon time:    09-Dec-16 15:22:32
     Logon server:
     DNS Domain:
     UPN:
[4] Logon session 00000000:00016265:
     User name:    Window Manager\DCM-1
     Auth package: Negotiate
     Logon type:    Interactive
     Session:      1
     Sid:          5-1-5-90-0-1
     Logon time:    09-Dec-16 15:22:32
     Logon server:
     DNS Domain:
     UPN:
[5] Logon session 00000000:000003e5:
     User name:    NT AUTHORITY\LOCAL SERVICE
     Auth package: Negotiate
     Logon type:    Service
     Session:      0
     Sid:          5-1-5-19
     Logon time:    09-Dec-16 15:22:32
     Logon server:
     DNS Domain:
     UPN:
...
[8] Logon session 00000000:0005c203:
     User name:    NT VIRTUAL MACHINE\AC9081B6-1E96-4BC8-8B3B-C609D4F85F7D
     Auth package: Negotiate
     Logon type:    Service
     Session:      0
     Sid:          5-1-5-83-1-2895151542-1271406230-163986315-2103441620
     Logon time:    09-Dec-16 15:22:35
     Logon server:
     DNS Domain:
     UPN:
[9] Logon session 00000000:0005d524:
     User name:    NT VIRTUAL MACHINE\B37F4A3A-21EF-422D-8B37-AB6B0A016ED8
     Auth package: Negotiate
     Logon type:    Service
     Session:      0
     Sid:          5-1-5-83-1-3011463738-1110254063-1806382987-3631087882
     Logon time:    09-Dec-16 15:22:35
CHAPTER 7 Security
From the Library of
```

---

```bash
Logon server:
   DNS Domain:
   UPN:
...
[12] Logon session 00000000:0429ab2c:
   User name:    IIS APPPOOL\DefaultAppPool
   Auth package: Negotiate
   Logon type:   Service
   Session:      0
   Sid:          S-1-5-82-3006700770-424185619-1745488364-794895919-4004696415
   Logon time:   09-Dec-16 22:33:03
   Logon server:
   DNS Domain:
   UPN:
```

Information reported for a session includes the SID and name of the user associated with the session, as well as the session's authentication package and logon time. Note that the Negotiate authentication package, seen in logon sessions 2 and 9 in the preceding output, will attempt to authenticate via Kerberos or NTLM, depending on which is most appropriate for the authentication request.

The LUID for a session is displayed on the Logon Session line of each session block. Using the Handle.exe utility (also from Sysinternals), you can find the tokens that represent a particular logon session. For example, to find the tokens for logon session 8 in the output just shown, you could enter this command:

```bash
C:\WINDOWS\system32\handle -a 5c203
Nthandle v4.1 - Handle viewer
Copyright (C) 1997-2016 Mark Russinovich
Sysinternals - www.sysinternals.com
System    pid: 4    type: Directory     1274: \Sessions\0\
DosDevices\00000000-0005c203
Tsass.exe    pid: 496    type: Token        D7C: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
Tsass.exe    pid: 496    type: Token        2350: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
Tsass.exe    pid: 496    type: Token        2390: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
svchost.exe    pid: 900    type: Token        804: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
svchost.exe    pid: 1468    type: Token        10EC: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
vmms.exe    pid: 4380    type: Token        A34: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
vmcmcompute.exe    pid: 6592    type: Token      200: NT VIRTUAL MACHINE\
AC90816B-1E96-4BC8-8B38-C609D4F8FD7D5c203
wmvp.exe    pid: 7136    type: WindowStation 168: \Windows\WindowStations\
Service-0x0-5c2033
wmvp.exe    pid: 7136    type: WindowStation 170: \Windows\WindowStations\
Service-0x0-5c2033
```

CHAPTER 7   Security      717


---

Winlogon then looks in the registry at the value HKLM\SOFTWARE\Microsoft\Windows NT\Current Version\Winlogon\UserInit and creates a process to run whatever the value of that string is. (This value can be several EXEs separated by commas.) The default value is UserInit.exe, which loads the user profile and then creates a process to run whatever the value of HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\Shell is, if that value exists. That value does not exist by default, however. If it doesn't exist, UserInit.exe does the same for HKLM\SOFTWARE\Microsoft\Windows NT\Current Version\Winlogon\Shell, which defaults to Explorer.exe. UserInit then exits (which is why Explorer.exe shows up as having no parent when examined in Process Explorer). For more information on the steps followed during the user logon process, see Chapter 11 in Part 2.

## Assured authentication

A fundamental problem with password-based authentication is that passwords can be revealed or stolen and used by malicious third parties. Windows includes a mechanism that tracks the authentication strength of how a user authenticated with the system, which allows objects to be protected from access if a user did not authenticate securely. (Smartcard authentication is considered to be a stronger form of authentication than password authentication.)

On systems that are joined to a domain, the domain administrator can specify a mapping between an object identifier (OID) (a unique numeric string representing a specific object type) on a certificate used for authenticating a user (such as on a smartcard or hardware security token) and a SID that is placed into the user's access token when the user successfully authenticates with the system. An ACE in a DACL on an object can specify such a SID be part of a user's token in order for the user to gain access to the object. Technically, this is known as a group claim. In other words, the user is claiming membership in a particular group, which is allowed certain access rights on specific objects, with the claim based upon the authentication mechanism. This feature is not enabled by default, and it must be configured by the domain administrator in a domain with certificate-based authentication.

Assured authentication builds on existing Windows security features in a way that provides a great deal of flexibility to IT administrators and anyone concerned with enterprise IT security. The enterprise decides which OIDs to embed in the certificates it uses for authenticating users and the mapping of particular OIDs to Active Directory universal groups (SIDs). A user's group membership can be used to identify whether a certificate was used during the logon operation. Different certificates can have different issuance policies and, thus, different levels of security, which can be used to protect highly sensitive objects (such as files or anything else that might have a security descriptor).

Authentication protocols (APs) retrieve OIDs from certificates during certificate-based authentication.

These OIDs must be mapped to SIDs, which are in turn processed during group membership expansion,

and placed in the access token. The mapping of OID to universal group is specified in Active Directory.

As an example, an organization might have several certificate-issuance policies named Contractor, Full Time Employee, and Senior Management, which map to the universal groups Contractor-Users, FTE-Users, and SM-Users, respectively. A user named Abby has a smartcard with a certificate issued using the Senior Management issuance policy. When she logs in using her smartcard, she receives an additional group membership (which is represented by a SID in her access token) indicating that she is a member of the SM-Users group. Permissions can be set on objects (using an ACL) such that only

---

members of the FTE-Users or SM-Users group (identified by their SIDs within an ACE) are granted access. If Abby logs in using her smartcard, she cannot access those objects because she will not have either the FTE-Users or SM-Users group in her access token. A user named Toby who logs in with a smartcard that has a certificate issued using the Contractor issuance policy would not be able to access an object that has an ACE requiring FTE-Users or SM-Users group membership.

Windows Biometric Framework

Windows provides a standardized mechanism for supporting certain types of biometric devices, such as fingerprint scanners, used to enable user identification via a fingerprint swipe: the Windows Biometric Framework (WBF). Like many other such frameworks, the WBF was developed to isolate the various functions involved in supporting such devices, so as to minimize the code required to implement a new device.

The primary components of the WBF are shown in Figure 7-21. Except as noted in the following list, all of these components are supplied by Windows:

• The Windows Bicometric Service (%SystemRoot%\System32\Wbupsrvc.dll This provides the process-execution environment in which one or more biometric services can execute.

• The Windows Bicometric Driver Interface (WBDI) This is a set of interface definitions (IRP major function codes, Dev iceToControl codes, and so forth) to which any driver for the biometric scanner device must conform if it is to be compatible with the Windows Biometric Service. WBDI drivers can be developed using any of the standard driver frameworks (WDMF, KMDF and WMD) However, UMDF is recommended to reduce code size and increase reliability. WBDI is described in the Windows Driver Kit documentation.

• The Windows Bicometric API This allows existing Windows components such as Winlogon and LogonUI to access the biometric service. Third-party applications have access to the Windows Biometric API and can use the biometric scanner for functions other than treating to win to Windows. An example of a function in this API is Win10PlusServiceProviders. The Biometric API is exposed by %SystemRoot%\System32\Win10.dll.

• The fingerprint biometric service provider This wraps the functions of biometric-typespecific adapters to present a common interface, independent of the type of biometric, to the Windows Biometric Service. In the future, additional types of biometrics, such as retinal scans or voiceprint analyzers, might be supported by additional biometric service providers. The biometric service provider in turn uses three adapters, which are user-mode DLLs:

• The sensor adapter This exposes the data-capture functionality of the scanner. The sensor adapter usually uses Windows I/O calls to access the scanner hardware. Windows provides a sensor adapter that can be used with simple sensors, those for which a WBDI driver exists. For more complex sensors, the sensor adapter is written by the sensor vendor.

• The engine adapter This exposes processing and comparison functionality specific to the scanner's raw data format and other features. The actual processing and communication might be performed within the engine adapter DLL, or the DLL might communicate with some other module. The engine adapter is always provided by the sensor vendor.

CHAPTER 7 Security 719



---

- ● The storage adapter This exposes a set of secure storage functions. These are used to
store and retrieve templates against which scanned biometric data is matched by the engine
adapter. Windows provides a storage adapter using Windows cryptography services and
standard disk file storage. A sensor vendor might provide a different storage adapter.
- ■ The functional device driver for the actual biometric scanner device This exposes the
WBDI at its upper edge. It usually uses the services of a lower-level bus driver, such as the USB
bus driver, to access the scanner device. This driver is always provided by the sensor vendor.
![Figure](figures/Winternals7thPt1_page_737_figure_002.png)

FIGURE 7-21 Windows Biometric Framework components and architecture.

A typical sequence of operations to support logging in via a fingerprint scan might be as follows:

- 1. After initialization, the sensor adapter receives from the service provider a request for cap-
ture data. The sensor adapter in turn sends a DeviceIoControl request with the IOCTL_
BIOMETRIC_CAPTURE_DATA control code to the WBDI driver for the fingerprint scanner device.

2. The WBDI driver puts the scanner into capture mode and queues the IOCTL_BIOMETRIC_
CAPTURE_DATA request until a fingerprint scan occurs.

3. A prospective user swipes a finger across the scanner. The WBDI driver receives notification of
this, obtains the raw scan data from the sensor, and returns this data to the sensor driver in a
buffer associated with the IOCTL_BIOMETRIC_CAPTURE_DATA request.

4. The sensor adapter provides the data to the fingerprint biometric service provider, which in
turn passes the data to the engine adapter.

5. The engine adapter processes the raw data into a form compatible with its template storage.

6. The fingerprint biometric service provider uses the storage adapter to obtain templates and
corresponding security IDs from secure storage. It invokes the engine adapter to compare each
template to the processed scan data. The engine adapter returns a status indicating whether it's
a match or not a match.

APTER 7 Security

From the Library of I
---

7. If a match is found, the Windows Biometric Service notifies Winlogon, via a credential provider DLL, of a successful login and passes it the security ID of the identified user. This notification is sent via an ALPC message, providing a path that cannot be spoofed.

## Windows Hello

Windows Hello, introduced in Windows 10, provides new ways to authenticate users based on biometric information. With this technology, users can log in effortlessly just by showing themselves to the device's camera or swiping their finger.

At the time of this writing, Windows Hello supports three types of biometric identification:

- ● Fingerprint

● Face

● Iris
The security aspect of biometrics needs to be considered first. What is the likelihood of someone being identified as you? What is the likelihood of you not being identified as you? These questions are parameterized by two factors:

- ■ False accept rate (uniqueness) This is the probability of another user having the same bio-
metric data as you. Microsoft's algorithms make sure the likelihood is 1 in 100,000.
■ False reject rate (reliability) This is the probability of you not being correctly recognized as
you (for example, in abnormal lighting conditions for face or iris recognition). Microsoft's imple-
mentation makes sure there is less than 1 percent chance of this happening. If it does happen,
the user can try again or use a PIN code instead.
Using a PIN code may seem less secure than using a full-blown password (the PIN can be as simple as a four-digit number). However, a PIN is more secure than a password for two main reasons:

- ■ The PIN code is local to the device and is never transmitted across the network. This means that
even if someone gets a hold of the PIN, they cannot use it to log in as the user from any other
device. Passwords, on the other hand, travel to the domain controller. If someone gets hold of
the password, they can log in from another machine into the domain.
■ The PIN code is stored in the Trusted Platform Module (TPM)—a piece of hardware that also
plays a part in Secure Boot (discussed in detail in Chapter 11 in Part 2)—so is difficult to access.
In any case, it requires physical access to the device, raising the bar considerably for a potential
security compromise.
Windows Hello is built upon the Windows Biometric Framework (WBF) (described in the previous

section). Current laptop devices support fingerprint and face biometrics, while iris is only supported

on the Microsoft Lumia 950 and 950 XL phones. (This will likely change and expand in future devices.)

Note that face recognition requires an infrared (IR) camera as well as a normal (RGB) one, and is sup ported on devices such as the Microsoft Surface Pro 4 and the Surface Book.

CHAPTER 7   Security      721


---

## User Account Control and virtualization

User Account Control (UAC) is meant to enable users to run with standard user rights as opposed to administrative rights. Without administrative rights, users cannot accidentally (or deliberately) modify system settings, malware can't normally alter system security settings or disable antivirus software, and users can't compromise the sensitive information of other users on shared computers. Running with standard user rights can thus mitigate the impact of malware and protect sensitive data on shared computers.

UAC had to address a couple of problems to make it practical for a user to run with a standard user account. First, because the Windows usage model has been one of assumed administrative rights, software developers assumed their programs would run with those rights and could therefore access and modify any file, registry key, or operating system setting. Second, users sometimes need administrative rights to perform such operations as installing software, changing the system time, and opening ports in the firewall.

The UAC solution to these problems is to run most applications with standard user rights, even

though the user is logged in to an account with administrative rights. At the same time, UAC makes it

possible for standard users to access administrative rights when they need them—whether for legacy

applications that require them or for changing certain system settings. As described, UAC accomplishes

this by creating a filtered admin token as well as the normal admin token when a user logs in to an

administrative account. All processes created under the user's session will normally have the filtered ad min token in effect so that applications that can run with standard user rights will do so. However, the

administrative user can run a program or perform other functions that require full Administrator rights

through UAC elevation.

Windows also allows certain tasks that were previously reserved for administrators to be performed

by standard users, enhancing the usability of the standard user environment. For example, Group

Policy settings exist that can enable standard users to install printers and other device drivers approved

by IT administrators and to install ActiveX controls from administrator-approved sites.

Finally, when software developers test in the UAC environment, they are encouraged to develop

applications that can run without administrative rights. Fundamentally, non-administrative programs

should not need to run with administrator privileges; programs that often require administrator privi leges are typically legacy programs using old APIs or techniques, and they should be updated.

Together, these changes obviate the need for users to run with administrative rights all the time.

### File system and registry virtualization

Although some software legitimately requires administrative rights, many programs needlessly store user data in system-global locations. When an application executes, it can be running in different user accounts, and it should therefore store user-specific data in the per-user %AppData% directory and save per-user settings in the user's registry profile under HKEY_CURRENT_USER\Software. Standard user accounts don't have write access to the %ProgramFiles% directory or HKEY_LOCAL_MACHINE\ Software, but because most Windows systems are single-user and most users have been administrators until UAC was implemented, applications that incorrectly saved user data and settings to these locations worked anyway.


CHAPTER 7 Security


From the Library of I

---

Windows enables these legacy applications to run in standard user accounts through the help of file system and registry namespace virtualization. When an application modifies a system-global location in the file system or registry and that operation fails because access is denied, Windows redirects the operation to a per-user area. When the application reads from a system-global location, Windows first checks for data in the per-user area and, if none is found, permits the read attempt from the global location.

Windows will always enable this type of virtualization unless:

- ■ The application is 64-bit Because virtualization is purely an application-compatibility tech-
nology meant to help legacy applications, it is enabled only for 32-bit applications. The world of
64-bit applications is relatively new and developers should follow the development guidelines
for creating standard user-compatible applications.

■ The application is already running with administrative rights In this case, there is no
need for any virtualization.

■ The operation came from a kernel-mode caller

■ The operation is being performed while the caller is impersonating For example, any
operations not originating from a process classified as legacy according to this definition,
including network file-sharing accesses, are not virtualized.

■ The executable image for the process has a UAC-compatible manifest Specifying a
requestedExecutionLevel setting, described in the next section.

■ The administrator does not have write access to the file or registry key This exception
exists to enforce backward compatibility because the legacy application would have failed
before UAC was implemented even if the application was run with administrative rights.
## ■ Services are never virtualized

You can see the virtualization status (the process virtualization status is stored as a flag in its token) of a process by adding the UAC Virtualization column to Task Manager's Details page, as shown in Figure 7-22. Most Windows components—including the Desktop Window Manager (Dwm.exe), the Client Server Run-Time Subsystem (Csrrs.exe), and Explorer—have virtualization disabled because they have a UAC-compatible manifest or are running with administrative rights and so do not allow virtualization. However, 32-bit Internet Explorer (iexplorer.exe) has virtualization enabled because it can host multiple ActiveX controls and scripts and must assume that they were not written to operate correctly with standard user rights. Note that, if required, virtualization can be completely disabled for a system using a Local Security Policy setting.

In addition to file system and registry virtualization, some applications require additional help to run correctly with standard user rights. For example, an application that tests the account in which it's running for membership in the Administrators group might otherwise work, but it won't run if it's not in that group. Windows defines a number of application-compatible shims to enable such applications to work anyway. The shims most commonly applied to legacy applications for operation with standard user rights are shown in Table 7-15.

CHAPTER 7   Security      723


---

![Figure](figures/Winternals7thPt1_page_741_figure_000.png)

FIGURE 7-22 Using Task Manager to view virtualization status.

TABLE 7-15 UAC virtualization shims

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>ElevateCreateProcess</td><td>This changes CreateProcess to handle ERROR_ELEVATION_REQUIRED errors by calling the application information service to prompt for elevation.</td></tr><tr><td>ForceAdminAccess</td><td>This spoofs queries of Administrator group membership.</td></tr><tr><td>VirtualizeDeleteFile</td><td>This spoofs successful deletion of global files and directories.</td></tr><tr><td>LocalMappedObject</td><td>This forces global section objects into the user&#x27;s namespace.</td></tr><tr><td>VirtualizeHKRLite</td><td>This redirects global registration of COM objects to a per-user location.</td></tr><tr><td>VirtualizeRegisterTypeLib</td><td>This converts per-machine type I b registrations to per-user registrations.</td></tr></table>


724    CHAPTER 7   Security


---

## File virtualization
