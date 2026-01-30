
The file system locations that are virtualized for legacy processes are %ProgramFiles%, %ProgramData%, and %SystemRoot%, excluding some specific subdirectories. However, any file with an executable extension—including .exe, .bat, .scr, .vbs, and others—is excluded from virtualization. This means that programs that update themselves from a standard user account fail instead of creating private versions of their executables that aren't visible to an administrator running a global updater.

![Figure](figures/Winternals7thPt1_page_742_figure_002.png)

Note To add extensions to the exception list, enter them in the HKLM\System\CurrentControlSet\Services\LuaVfParameters\ExcludedExtensionsAdd registry key and reboot. Use a multistring type to delimit multiple extensions, and do not include a leading dot in the extension name.

Modifications to virtualized directories by legacy processes are redirected to the user's virtual root

directory, %LocalAppData%\VirtualStore. The Local component of the path highlights the fact that

virtualized files don't roam with the rest of the profile when the account has a roaming profile.

The UAC File Virtualization filter driver (%SystemRoot%\System32\Drivers\Luaf.sys) implements file system virtualization. Because this is a file system filter driver, it sees all local file system operations, but it implements functionality only for operations from legacy processes. As shown in Figure 7-23, the filter driver changes the target file path for a legacy process that creates a file in a system-global location but does not for a non-virtualized process with standard user rights. Default permissions on the Windows directory deny access to the application written with UAC support, but the legacy process acts as though the operation succeeds when it really created the file in a location fully accessible by the user.

![Figure](figures/Winternals7thPt1_page_742_figure_006.png)

FIGURE 7-23 UAC File Virtualization filter driver operation.

CHAPTER 7   Security      725


---

## EXPERIMENT: File virtualization behavior

In this experiment, you will enable and disable virtualization on the command prompt and see several behaviors to demonstrate UAC file virtualization:

- 1. Open a non-elevated command prompt (you must have UAC enabled for this to work)
and enable virtualization for it. You can change the virtualization status of a pro-
cess by right-clicking the process in the Task Manager Details tab and selecting UAC
Virtualization from the shortcut menu that appears.

2. Navigate to the C:\Windows directory and use the following command to write a file:

echo hello-1 > test.txt

3. List the contents of the directory. You'll see that the file appears.

dir test.txt

4. Disable virtualization by right-clicking the process in the Task Manager Details tab and
deselecting UAC Virtualization. Then list the directory as in step 3. Notice that the file
is gone. However, a directory listing of the VirtualStore directory will reveal the file:

dir %LOCALAPPDATA%\VirtualStore\Windows\test.txt

5. Enable virtualization again for this process.

6. To look at a more complex scenario, create a new command prompt window, but
elevated this time. Then repeat steps 2 and 3 using the string hello-2.

7. Examine the text inside these files by using the following command in both command
prompts. The screenshots that follow show the expected output.

type test.txt
![Figure](figures/Winternals7thPt1_page_743_figure_003.png)

726 CHAPTER 7 Security


---

![Figure](figures/Winternals7thPt1_page_744_figure_000.png)

8. From your elevated command prompt, delete the test.txt file:

```bash
del test.txt
```

9. Repeat step 3 of the experiment in both windows. Notice that the elevated command

prompt cannot find the file anymore, while the standard user command prompt shows

the old contents of the file again. This demonstrates the failover mechanism described

earlier: Read operations look in the per-user virtual store location first, but if the file

doesn't exist, read access to the system location will be granted.

## Registry virtualization

Registry virtualization is implemented slightly differently from file system virtualization. Virtualized registry keys include most of the HKEY_LOCAL_MACHINE\Software branch, but there are numerous exceptions, such as the following:

- ● HKLM\Software\Microsoft\Windows

● HKLM\Software\Microsoft\Windows NT

● HKLM\Software\Classes
Only keys that are commonly modified by legacy applications, but that don’t introduce compatibility or interoperability problems, are virtualized. Windows redirects modifications of virtualized keys by a legacy application to a user’s registry virtual root at HKEY_CURRENT_USER\Software\Classes\ VirtualStore. The key is located in the user’s Classes hive, %LocalAppData%\Microsoft\Windows\ UsrClass.dat, which, like any other virtualized file data, does not roam with a roaming user profile. Instead of maintaining a fixed list of virtualized locations as Windows does for the file system, the virtualization status of a key is stored as a combination of flags, shown in Table 7-16.

You can use the Reg.exe utility included in Windows, with the flags option, to display the current virtualization state for a key or to set it. In Figure 7-24, note that the HKLM\Software key is fully virtualized, but the Windows subkey (and all its children) have only silent failure enabled.

CHAPTER 7   Security      727


---

TABLE 7-16 Registry virtualization flags

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>REG_KEY_DONT_VIRTUALIZE</td><td>This specifies whether virtualization is enabled for this key. If the flag is set, virtualization is disabled.</td></tr><tr><td>REG_KEY_DONT_SILENT_FAIL</td><td>If the REG_KEY_DONT_VIRTUALIZE flag is set (virtualization is disabled), this key specifies that a legacy application that would be denied access performing an operation on the key is instead granted MAXIMUM_ALLOWED rights to the key (any access the account is granted) instead of the rights the application requested. If this flag is set, it implicitly disables virtualization as well.</td></tr><tr><td>REG_KEY_RECURSE_FLAG</td><td>This determines whether the virtualization flags will propagate to the child keys (subkeys) of this key.</td></tr></table>


![Figure](figures/Winternals7thPt1_page_745_figure_002.png)

FIGURE 7-24 UAC registry virtualization flags on the Software and Windows keys.

Unlike file virtualization, which uses a filter driver, registry virtualization is implemented in the configuration manager. (See Chapter 9 in Part 2 for more information on the registry and the configuration manager.) As with file system virtualization, a legacy process creating a subkey of a virtualized key is redirected to the user's registry virtual root, but a UAC-compatible process is denied access by default permissions. This is shown in Figure 7-25.

![Figure](figures/Winternals7thPt1_page_745_figure_005.png)

FIGURE 7-25 UAC registry virtualization operation.

728 CHAPTER 7 Security


---

## Elevation

Even if users run only programs that are compatible with standard user rights, some operations still

require administrative rights. For example, the vast majority of software installations require adminis trative rights to create directories and registry keys in system-global locations or to install services or

device drivers. Modifying system-global Windows and application settings also requires administrative

rights, as does the parental controls feature. It would be possible to perform most of these operations

by switching to a dedicated administrator account, but the inconvenience of doing so would likely

result in most users remaining in the administrator account to perform their daily tasks, most of which

do not require administrative rights.

It's important to be aware that UAC elevations are conveniences and not security boundaries. A security boundary requires that security policy dictate what can pass through the boundary. User accounts are an example of a security boundary in Windows because one user can't access the data belonging to another user without having that user's permission.

Because elevations aren't security boundaries, there's no guarantee that malware running on a system with standard user rights can't compromise an elevated process to gain administrative rights. For example, elevation dialog boxes only identify the executable that will be elevated; they say nothing about what it will do when it executes.

## Running with administrative rights

Windows includes enhanced "run as" functionality so that standard users can conveniently launch processes with administrative rights. This functionality requires giving applications a way to identify operations for which the system can obtain administrative rights on behalf of the application, as necessary (we'll say more on this topic shortly).

To enable users acting as system administrators to run with standard user rights but not have to enter user names and passwords every time they want to access administrative rights, Windows makes use of a mechanism called Admin Approval Mode (AAM). This feature creates two identities for the user at logon: one with standard user rights and another with administrative rights. Since every user on a Windows system is either a standard user or acting for the most part as a standard user in AAM, developers must assume that all Windows users are standard users, which will result in more programs working with standard user rights without virtualization or shims.

Granting administrative rights to a process is called elevation. When elevation is performed by a standard user account (or by a user who is part of an administrative group but not the actual Administrators group), it's referred to as an over-the-shoulder (OTS) elevation because it requires the entry of credentials for an account that's a member of the Administrators group, something that's usually completed by a privileged user typing over the shoulder of a standard user. An elevation performed by an AAM user is called a consent elevation because the user simply has to approve the assignment of his administrative rights.

Stand-alone systems, which are typically home computers, and domain-joined systems treat AAM access by remote users differently because domain-connected computers can use domain administrative groups in their resource permissions. When a user accesses a stand-alone computer's file share,

CHAPTER 7   Security      729


---

Windows requests the remote user's standard user identity. But on domain-joined systems, Windows honors all the user's domain group memberships by requesting the user's administrative identity. Executing an image that requests administrative rights causes the application information service (AIS, contained in %SystemRoot%\System32\AppData.dll), which runs inside a standard service host process (SvcHost.exe), to launch %SystemRoot%\System32\Consent.exe. Consent captures a bitmap of the screen, applies a fade effect to it, switches to a desktop that's accessible only to the local system account (the Secure Desktop), paints the bitmap as the background, and displays an elevation dialog box that contains information about the executable. Displaying this dialog box on a separate desktop prevents any application present in the user's account from modifying the appearance of the dialog box.

If an image is a Windows component digitally signed (by Microsoft or another entity), the dialog box displays a light blue stripe across the top, as shown at the left of Figure 7-26 (the distinction between Microsoft signed images and other signers has been removed in Windows 10). If the image is unsigned, the stripe becomes yellow, and the prompt stresses the unknown origin of the image (see the right of Figure 7-26). The elevation dialog box shows the image's icon, description, and publisher for digitally signed images, but it shows only the file name and "Publisher: Unknown" for unsigned images. This difference makes it harder for malware to mimic the appearance of legitimate software. The Show More Details link at the bottom of the dialog box expands it to show the command line that will be passed to the executable if it launches.

![Figure](figures/Winternals7thPt1_page_747_figure_002.png)

FIGURE 7-26 AAC UAC elevation dialog boxes based on image signature.

The OTS consent dialog box, shown in Figure 7-27, is similar, but prompts for administrator credentials. It will list any accounts with administrator rights.

![Figure](figures/Winternals7thPt1_page_747_figure_005.png)

FIGURE 7-27 OTS consent dialog box.

730 CHAPTER 7 Security


---

If a user declines an elevation, Windows returns an access-denied error to the process that initiated the launch. When a user agrees to an elevation by either entering administrator credentials or clicking Yes, AIS calls CreateProcessAsUser to launch the process with the appropriate administrative identity. Although AIS is technically the parent of the elevated process, AIS uses new support in the CreateProcessAsUser API that sets the process's parent process ID to that of the process that originally launched it. That's why elevated processes don't appear as children of the AIS service-hosting process in tools such as Process Explorer that show process trees. Figure 7-28 shows the operations involved in launching an elevated process from a standard user account.

![Figure](figures/Winternals7thPt1_page_748_figure_001.png)

FIGURE 7-28 Launching an administrative application as a standard user.

## Requesting administrative rights

There are a number of ways the system and applications identify a need for administrative rights. One that shows up in the Explorer user interface is the Run as Administrator context menu command and shortcut option. These items also include a blue and gold shield icon that should be placed next to any button or menu item that will result in an elevation of rights when it is selected. Choosing the Run as Administrator command causes Explorer to call the ShellExecute API with the runas verb.

The vast majority of installation programs require administrative rights, so the image loader, which initiates the launch of an executable, includes installer-detection code to identify likely legacy installers. Some of the heuristics it uses are as simple as detecting internal version information or whether the image has the words setup, install, or update in its file name. More sophisticated means of detection involve scanning for byte sequences in the executable that are common to third-party installation wrapper utilities. The image loader also calls the application-compatible library to see if the target executable requires administrator rights. The library looks in the application-compatible database to see whether the executable has the RequireAdministrator or RunAsInvoker compatibility flag associated with it.

The most common way for an executable to request administrative rights is for it to include a

requestedExecutionLevel tag in its application manifest file. The element's level attribute can have

one of the three values shown in Table 7-17.

CHAPTER 7   Security      731


---

TABLE 7-17 Requested elevation levels

<table><tr><td>Elevation Level</td><td>Meaning</td><td>Usage</td></tr><tr><td>As invoker</td><td>No need for administrative rights; never ask for elevation.</td><td>Typical user applications that don&#x27;t need administrative privileges—for example, Notepad.</td></tr><tr><td>Highest available</td><td>Request approval for highest rights available. If the user is logged on as a standard user, the process will be launched as invoker; otherwise, an AAM elevation prompt will appear, and the process will run with full administrative rights.</td><td>Applications that can function without full administrative rights but expect users to want full access if it&#x27;s easily accessible. For example, the Registry Editor, Microsoft Management Console, and the Event Viewer use this level.</td></tr><tr><td>Require administrator</td><td>Always request administrative rights. An OTS elevation dialog box prompt will be shown for standard users; otherwise, AAM.</td><td>Applications that require administrative rights to work, such as the Firewall Settings Editor, which affects system-wide security.</td></tr></table>


The presence of the trustInfo element in a manifest (which you can see in the manifest

dump of eventwvr.exe) denotes an executable that was written with support for UAC and the

requestedExecutionLevel element nests within it. The uiAccess attribute is where accessibility

applications can use the UIPI bypass functionality mentioned earlier.

```bash
C:\>sigcheck -m c:\Windows\System32\eventwvr.exe
...
<trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
        <requestedPrivileges>
            <requestedExecutionLevel
                level="highestAvailable"
                uiAccess="false"
            />
        </requestedPrivileges>
        </security>
</trustInfo>
<asmv3:application>
    <asmv3:windowsSettings xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">
        <autoElevate>true</autoElevate>
    </asmv3:windowsSettings>
</asmv3:application>
    ...
```

## Auto-elevation

In the default configuration (see the next section for information on changing this), most Windows

executables and control panel appslet do not result in elevation prompts for administrative users, even

if they need administrative rights to run. This is because of a mechanism called auto-elevation. Auto elevation is intended to preclude administrative users from seeing elevation prompts for most of their

work; the programs will automatically run under the user's full administrative token.

Auto-elevation has several requirements. One is that the executable in question must be considered as a Windows executable. This means it must be signed by the Windows publisher (not just by Microsoft; oddly, they are not the same—Windows-signed is considered more privileged than Microsoft-signed). It must also be in one of several directories considered secure: %SystemRoot%

---

System32 and most of its subdirectories, %Systemroot%\Home, and a small number of directories under %ProgramFiles% (for example, those containing Windows Defender and Windows Journal).

There are additional requirements, depending on the type of executable. EXE files other than Mmc.

exe auto-elevate if they are requested via an autoElevate element in their manifest. The manifest

shown earlier of eventvrw.exe in the previous section illustrates this.

Mmc.exe is treated as a special case because whether it should auto-elevate or not depends on which system management snap-ins it is to load. Mmc.exe is normally invoked with a command line specifying an MSC file, which in turn specifies which snap-ins are to be loaded. When Mmc.exe is run from a protected administrator account (one running with the limited administrator token), it asks Windows for administrative rights. Windows validates that Mmc.exe is a Windows executable and then checks the MSC. The MSC must also pass the tests for a Windows executable, and furthermore must be on an internal list of auto-elevate MSCs. This list includes nearly all MSC files in Windows.

Finally, COM (out-of-process server) classes can request administrative rights within their registry

key. T o do so requires a subkey named ElEvation with a DWORD value named Enabled, having a

value of 1. Both the COM class and its instantiating executable must meet the Windows executable

requirements, although the executable need not have requested auto-elevation.

## Controlling UAC behavior

UAC can be modified via the dialog box shown in Figure 7-29. This dialog box is available under Change

User Account Control Settings. Figure 7-29 shows the control in its default position.

![Figure](figures/Winternals7thPt1_page_750_figure_006.png)

FIGURE 7-29 User Account Control Settings dialog box.

The four possible settings have the effects described in Table 7-18.

The third position is not recommended because the UAC elevation prompt appears not on the Secure Desktop but on the normal user's desktop. This could allow a malicious program running in the same session to change the appearance of the prompt. It is intended for use only in systems where the video subsystem takes a long time to dim the desktop or is otherwise unsuitable for the usual UAC display.

CHAPTER 7   Security      733


---

TABLE 7-18 UAC options

<table><tr><td>Slider Position</td><td colspan="2">When administrative user not running with administrative rights...</td><td>Remarks</td></tr><tr><td></td><td>... attempts to change Windows settings (for example, use certain Control Panel applets)</td><td>... attempts to install software or run a program whose manifest calls for elevation, or uses Run as Administrator</td><td></td></tr><tr><td>Highest position (Always Notify)</td><td>A UAC elevation prompt appears on the Secure Desktop.</td><td>A UAC elevation prompt appears on the Secure Desktop.</td><td>This was the Windows Vista behavior.</td></tr><tr><td>Second position</td><td>UAC elevation occurs automatically with no prompt or notification.</td><td>A UAC elevation prompt appears on the Secure Desktop.</td><td>Windows default setting.</td></tr><tr><td>Third position</td><td>UAC elevation occurs automatically with no prompt or notification.</td><td>A UAC elevation prompt appears on the user&#x27;s normal desktop.</td><td>Not recommended.</td></tr><tr><td>Lowest position (Never Notify)</td><td>UAC is turned off for administrative users.</td><td>UAC is turned off for administrative users.</td><td>Not recommended.</td></tr></table>


The lowest position is strongly discouraged because it turns UAC off completely as far as administrative accounts are concerned. Prior to Windows 8, all processes run by a user with an administrative account are run with the user's full administrative rights in effect; there is no filtered admin token. Starting with Windows 8, UAC cannot be turned off completely, because of the AppContainer model. Admin users won't be prompted for elevation, but processes will not elevate unless required to do so by the manifest or launched from an elevated process.

The UAC setting is stored in four values in the registry under HKLM\SOFTWARE\Microsoft\ Windows\CurrentVersion\Policies\System, as shown in Table 7-19. ConsentPromptBehaviorAdmin controls the UAC elevation prompt for administrators running with a filtered admin token, and ConsentPromptBehaviorUser controls the UAC prompt for users other than administrators.

TABLE 7-19 UAC registry values

<table><tr><td>Slider Position</td><td>ConsentPrompt BehaviorAdmin</td><td>ConsentPrompt BehaviorUser</td><td>EnableUA</td><td>PromptOnSecureDesktop</td></tr><tr><td>Highest position (Always Notify)</td><td>2 (display AAC UIAC elevation prompt)</td><td>3 (display OTS UIAC elevation prompt)</td><td>1 (enabled)</td><td>1 (enabled)</td></tr><tr><td>Second position</td><td>5 (display AAC UIAC elevation prompt, except for changes to Windows settings)</td><td>3</td><td>1</td><td>1</td></tr><tr><td>Third position</td><td>5</td><td>3</td><td>1</td><td>0 (disabled; UAC prompt appears on user&#x27;s normal desktop)</td></tr><tr><td>Lowest position (Never Notify)</td><td>0</td><td>3</td><td>0 (disabled; logins to administrative accounts do not create a restricted admin access token)</td><td>0</td></tr></table>


734    CHAPTER 7   Security


---

Exploit mitigations

Throughout this chapter, we've seen a number of technologies that help protect the user, guarantee the code-signing properties of executable code, and lock down access to resources through sandboxing. At the end of the day, however, all secure systems have failure points, all code has bugs, and attackers leverage increasingly complex attacks to exploit them. A security model in which all code is assumed to be bug-free, or in which a software developer assumes all bugs will eventually be found and fixed, is destined to fail. Additionally, many security features that provide code-execution "guarantees" do so at a cost of performance or compatibility, which may be unacceptable in such scenarios.

A much more successful approach is to identify the most common techniques used by attackers, as

well as employ an internal "red team" (that is, an internal team attacking its own software) to discover

new techniques before attackers do and to implement mitigations against such techniques. (These

mitigations can be as simple as moving some data around or as complex as employing Control Flow

Integrity [CFI] techniques.) Because vulnerabilities can number in the thousands in a complex code base

such as Windows, but exploit techniques are limited, the idea is to make large classes of bugs very dif ficult (or in some cases, impossible) to exploit, without worrying about finding all the bugs.

## Process-mitigation policies

While individual applications can implement various exploit mitigations on their own (such as Microsoft Edge, which leverages a mitigation called MemGC to avoid many classes of memory-corruption attacks), this section will cover mitigations that are provided by the operating system to all applications or to the system itself to reduce exploitable bug classes. Table 7-20 describes all mitigations in the latest version of Windows 10 Creators Update, the type of bug class they mitigate against, and mechanisms to activate them.

TABLE 7-20 Process mitigation options

<table><tr><td>Mitigation Name</td><td>Use Case</td><td>Enabling Mechanism</td></tr><tr><td>ASLR Bottom Up Randomization</td><td>This makes calls to VirtualIA1 loc subject to ASLR with 8-bit entropy, including stack-base randomization.</td><td>This is set with the PROCESS_CREATION_MITIGATION_POLICY_BOTTOM_UP_ASLR_ALWAYS_ON_PROCESS-creation attribute flag.</td></tr><tr><td>ASLR Force Relocate Images</td><td>This forces ASLR even on binaries that do not have the /DYNAMICBASE linker flag.</td><td>This is set with SetProcessMitigationPolicy_LOW_MORE_CREATION_MITIGATION_POLICY_FORCE_RELOCATE_IMAGES_ALWAYS_ON_PROCESS-creation flag.</td></tr><tr><td>High Entropy ASLR (HEASLR)</td><td>This significantly increases entropy of ASLR on 64-bit images, increasing bottom-up randomization to up to 1 TB of variance (that is, bottom-up allocations may start anywhere between 64 KB and 1 TB into the address space, giving 24 bits of entropy).</td><td>Must be set through /HIGHENTROPYAL at time or the PROCESS_CREATION_MITIGATION_POLICY_HIGH_HIGH_ENTROPY_ASLR_ALWAYS_ON_process-creation attribute flag.</td></tr></table>


---

TABLE 7-20 Process mitigation options (continued)

<table><tr><td>Mitigation Name</td><td>Use Case</td><td>Enabling Mechanism</td></tr><tr><td>ASLR Disallow Stripped Images</td><td>This blocks the load of any library without relocations (linked with the /FIXED flag) when combined with ASLR Force Relocate Images.</td><td>This is set with SetProcessMitigationPolicy with the PROCESS_CREATION_WITH_POLICY_FORCE_RELOCATE_IMAGES_ALWAYS_ON_REQ_RELOCES process-creation flag.</td></tr><tr><td>DEP: Permanent</td><td>This prevents the process from disabling DEP on itself. Only relevant on x686. Only relevant on 32-bit applications (and/or under WoW64).</td><td>This is set with the SetProcessMitigationPolicy, process-creation attribute or with SetProcessMPolicy.</td></tr><tr><td>DEP: Disable ATL Thunk Emulation</td><td>This prevents legacy ATL library code from executing ATL, thanks in the heap, even if a known compatibility issue could be resolved by adding applications (and/or under WoW64).</td><td>This is set with the SetProcessMitigationPolicy, process-creation attribute or with SetProcessMPolicy.</td></tr><tr><td>SEH Overwrite Protection (SEHOP)</td><td>This prevents structure exception handlers from being overwritten with incorrect ones, even if the image was not limited to a 32-bit (S32B). Only relevant on 32-bit applications (and/or under WoW64).</td><td>This can be set with SetProcessDEPPolicy or with the PROCESS_CREATION_MITIGATION_POLICY_SEHROP_ENABLE_PROCESS-creation flag.</td></tr><tr><td>Raise Exception on Invalid Handle</td><td>This helps catch handle reuse (use-after-handle close) attacks in which a process uses a handle that is no longer the handle it expected (for example: SetEvent on a mutex) by crashing the process instead of returning a failure that the process might ignore.</td><td>This is set with SetProcessMitigationPolicy or the PROCESS_CREATION_MITIGATION_POLICY_STRCT_HANDLE_CHECKS_ALWAYS_ON_PROCESS-creation attribute flag.</td></tr><tr><td>Raise Exception on Invalid Handle Close</td><td>This helps catch handle reuse (double-handle-close) attacks in which a process is attempting to close a handle that has already been closed, suggesting that a different handle may potentially be used in other scenarios, in which an exploit would be successful, ultimately limiting its universal effectiveness.</td><td>Undocumented, and can only be set through an undocumented API.</td></tr><tr><td>Disallow Win32k System Calls</td><td>This disables all access to the Win32 kernel-mode subsystem driver, which implements the Window Manager (GUI) and Graphics Device Interface (GDI) and DirectX. No system calls to this component will be possible.</td><td>This is set with SetProcessMitigationPolicy or the PROCESS_CREATION_MITIGATION_POLICY_WIN32K_SYSTEM_CALL_DISABLE_ALWAYS_ON_PROCESS-creation attribute flag.</td></tr><tr><td>Filter Win32k System Calls</td><td>This filters access to the Win32 kernel-mode subsystem driver only to certain APIs allowing simple GUI and Direct X access, mitigating many of the possible attacks, without completely disabling availability of the GUI/GDI services.</td><td>This is set through an internal process-creation attribute flag, which can define one out of three possible sets of Win32k filters that are enabled. However, because the filter sets are hard-coded, this mitigation is re-served for Microsoft internal usage.</td></tr></table>


---

TABLE 7-20 Process mitigation options (continued)

<table><tr><td>Mitigation Name</td><td>Use Case</td><td>Enabling Mechanism</td></tr><tr><td>Disable Extension Points</td><td>This prevents a process from loading an input method editor (IME), a Windows hook DLL (SetWinHookEx), an app initializator (DLL (AppInItD) is value in the registry), or a WinHook layered service provider (LSP).</td><td>This is set with SetProcessMitigationPolicy for the PROCESS_CREATION_MITIGATION_POLICY_EXTENSION_CONTROL_DISABLE_ALWAYS_ON_process-creation attribute flag.</td></tr><tr><td>Arbitrary Code Guard (CFG)</td><td>This prevents a process from allocating executable code or from changing the permission of existing executable code to make it writable. It can be configured to allow a particular thread inside the process to request this capability or to allow a remote process from disabling this mitigation, which are not supported from a security point of view.</td><td>This is set with SetProcessMitigationPolicy for the PROCESS_CREATION_MITIGATION_POLICY_PROHIBIT_DYNAMIC_CODE_ALWAYS_ON_PROCESS_CREATION_MITIGATION_POLICY_PROHIBIT_DYNAMIC_CODE_ALWAYS_ON_PROCESS-creation attribute flags.</td></tr><tr><td>Control Flow Guard (CFG)</td><td>This prevents memory corruption vulnerabilities from being used to hijack control flow by a process. The memory is not a copy of any indirect CALL or JMP instruction against a list of valid expected target functions. Part of Control Flow Integrity (CFI) mechanisms described in the next section.</td><td>The image must be compiled with the /guard: c.f option, and limited to the memory creation. It can be set with the PROCESS_CREATION_MITIGATION_POLICY_CONTROL_FLOW_GUARD_ALWAYS_ON_process-creation attribute flag in case the image does not support it. CFI engine will be disabled for other images loading in the process.</td></tr><tr><td>CFG Export Suppression</td><td>This strengthens CFG by suppressing indirect calls to the exported API table of the image.</td><td>The image must be compiled with /guard: export-suppress, and can also be configured through SetProcessMitigationPolicy or with the PROCESS_CREATION_MITIGATION_POLICY_CONTROL_FLOW_GUARD_EXPORT_SUPPRESSION process-creation attribute flag.</td></tr><tr><td>CFG Strict Mode</td><td>This prevents the loading of any image library within the current process that was not linked with the /guard: c.f option.</td><td>This is set through SetProcessMitigationPolicy or with the PROCESS_CREATION_MITIGATION_POLICY_STRCT_CONTROL_FLOW_GUARD_ALWAYS_ON_process-creation attribute flag.</td></tr><tr><td>Disable Non System Fonts</td><td>This prevents the loading of any font files that have not been registered by Winlogon at user logon time, after being installed in the C:\windows\fonts directory.</td><td>This is set through SetProcessMitigationPolicy or the PROCESS_CREATION_MITIGATION_POLICY_FONT_DISABLE_ALWAYS_ON_process-creation attribute flag.</td></tr><tr><td>Microsoft-Signed Binaries Only</td><td>This prevents the loading of any image library within the current process that has not been signed by a Microsoft CA—issued certificate.</td><td>This is set through the PROCESS_CREATION_MITIGATION_POLICY_BLOCK_NON_MICROSOFT_BINARIES_ALWAYS_ON_process-attribute flag at startup time.</td></tr></table>


CHAPTER 7   Security      737


---

TABLE 7-20 Process mitigation options (continued)

<table><tr><td>Mitigation Name</td><td>Use Case</td><td>Enabling Mechanism</td></tr><tr><td>Store-Signed Binaries Only</td><td>This prevents the loading of any image library within the current process that has not been signed by the Microsoft Store CA.</td><td>This is set through the PROCESS_CREATION, MITIGATION_POLICY_BLOCK_NON_MICROSOFT_BINARIES_ALLOW_STORE process attribute flag at startup time.</td></tr><tr><td>No Remote Images</td><td>This prevents the loading of any image library within the current process that is present on a non-local (UNC or WebDIN) path.</td><td>This is set through SETPROCESSMutationPolicy or the PROCESS_CREATION, MITIGATION_POLICY_IMAGE_LOAD_NO_LOW_LABEL_ALWAYS_ON process-creation attribute flag.</td></tr><tr><td>No Low IL Images</td><td>This prevents the loading of any image library within the current process that has a mandatory label below medium (0x2000).</td><td>This is set through SETPROCESSMutationPolicy or the PROCESS_CREATION, MITIGATION_POLICY_IMAGE_LOAD_NO_LOW_LABEL_ALWAYS_ON process-creation flag. It can also be set through a resource claim ACE called IMAGELOAD on the file of the process being loaded.</td></tr><tr><td>Prefer System32 Images</td><td>This modifies the loader&#x27;s search path to always look for the given image library being loaded (through a relative name in the %SystemRoot% System32 directory, regardless of the current search path.</td><td>This is set through SETPROCESSMutationPolicy or the PROCESS_CREATION, MITIGATION_POLICY_IMAGE_LOAD_PREFIX_SYSTEM32_ALWAYS_ON process-creation attribute flag.</td></tr><tr><td>Return Flow Guard (RFG)</td><td>This helps prevent additional classes of memory-corruption vulnerabilities that affect control flow by validating, before the execution of a function, that the function was not called through a return-oriented programming (ROP) exploit by not having begun its execution correctly or by executing on an invalid stack. This is part of the Control Flow Integrity (CFI) mechanisms.</td><td>Currently still being implemented in a robust and performant way, this mitigation is not yet available, but is included here for completeness.</td></tr><tr><td>Restrict Set Thread Context</td><td>This restricts the modification of the current thread&#x27;s context.</td><td>Currently disabled pending the availability of RFG, which makes the mitigation more robust, this modification may be included in a future version of Windows. It is included here for completeness.</td></tr><tr><td>Loader Continuity</td><td>This prohibits the process from dynamically loading any DLLs that do not have the same integrity level as the process, in cases where a signature policy mitigation above could not be enabled at startup time due to compatibility concerns. This specifically targets cases of DLL planting attacks.</td><td>This is set through SETPROCESSMutationPolicy or the PROCESS_CREATION, MITIGATION_POLICY2_LOAD_INTEGRITY_CONTINUITY_ALWAYS_ON process-creation attribute flag.</td></tr></table>


738    CHAPTER 7   Security


---

TABLE 7-20 Process mitigation options (continued)

<table><tr><td>Mitigation Name</td><td>Use Case</td><td>Enabling Mechanism</td></tr><tr><td>Heap Terminate On Corruption</td><td>This disables the Fault Tolerant Heap (FTH) and the raising of a controllable exception in the case of heap cor- ruption by terminating the process instead. This prevents the use of heap controlled exception handling from executing or in cases where the progra mmed process is not terminated.</td><td>This is set through PROCESS_CREATION_INFORMATION_OR_BY_USING_THE_CREATION_INFORMATION_POLICY_HEAD_TERMINATE_ALWAYS_ON_PROCESS-creation attribute flag.</td></tr><tr><td>Disable Child Process Creation</td><td>This prohibits the creation of child processes by marking the token with a restricted process restriction, which should stop any other component from creating a process while impersonating the to- ken of this process (for example, WMI process creation, or a kernel compo-nent)</td><td>This is set through the PROCESS_CREATION_INFORMATION_CREATION_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO_LEVEL_INFO

---

![Figure](figures/Winternals7thPt1_page_757_figure_000.png)

FIGURE 7-30 Customizing process-mitigation options.

## Control Flow Integrity

Data Execution Prevention (DEP) and Arbitrary Code Guard (ACG) make it hard for exploits to place executable code on the heap or stack, to allocate new executable code, or to change existing executable code. As a result, memory/data-only attacks have become more interesting. Such attacks allow the modification of portions of memory to redirect control flow, such as modifying return addresses on the stack or indirect function pointers stored in memory. Techniques such as return-oriented-programming (ROP) and jump-oriented-programming (JOP) are often used to violate the regular code flow of the program and redirect it to known locations of interesting code snippets ("gadgets").

Because such snippets are often present in the middle or end of various functions, when control

flow is redirected in this way, it must be redirected into the middle or end of a legitimate function. By

employing Control Flow Integrity (CFI) technologies—which can, for example, validate that the target

of an indirect JMP or CALL instruction is the beginning of a real function, or that a RET instruction is

pointing to an expected location, or that a RET instruction is issued after the function was entered

through its beginning—the operating system and compiler can detect and prevent most classes of

such exploits.

740 CHAPTER 7 Security

---

## Control Flow Guard

Control Flow Guard (CFG) is an exploit-mitigation mechanism first introduced in Windows 8.1 Update 3 that exists in enhanced version in Windows 10 and Server 2016, with further improvements released on various updates (up to and including the latest Creators Update). Originally implemented only for user-mode code, CFG now also exists as Kernel CFG (KCFG) on the Creators Update. CFG addresses the indirect CALL/JMP part of CFI by verifying that the target of an indirect call is at the start of a known function (more on that momentarily). If the target is not at the start of a known function, the process is simply terminated. Figure 7-31 shows the conceptual operation of CFG.

![Figure](figures/Winternals7thPt1_page_758_figure_002.png)

FIGURE 7-31 Conceptual view of Control Flow Guard.

CFG requires the cooperation of a supported compiler that will add the call to the validation code before indirect changes in control flow. The Visual C++ compiler has an option, /guard: c.f, that must be set for images (or even on a C/C++ source file level) to be built with CFG support (this option is also available in Visual Studio's GUI in the C/C++/Code Generation/Control Flow Guard setting in the project's properties). This setting should also be set in the linker settings, as both components of Visual Studio are required to collaborate to support CFG.

Once those settings are present, images (EXEs and DLLs) that are compiled with CFG-enabled

indicate this in their PE header. In addition, they contain a list of functions that are the valid indirect

control flow targets in a .gfids PE section (by default merged by the linker with the .rdata section). This

list is built by the linker and contains the relative virtual address (RVA) of all functions in the image. This

includes those that might not be called by an indirect call by the code present in the image because

there's no way of knowing if outside code does not somehow legitimately know the address of a func tion and is attempting to call it. This can be especially true of exported functions, which can be called

after obtaining their pointer through GetProcAddress.

That being said, programmers can use a technique called CFG suppression, which is supported

through the DECSPEC_GUARD_SUPRESS annotation, and which marks the function in the table of valid

functions with a special flag indicating that the programmer never expects such a function to be the

target of any indirect call or jump.

CHAPTER 7   Security      741


---

Now that a table of valid function targets exists, all that a simple validation function would need to do is to compare the target of the CALL or JMP instruction with one of the functions in the table. Algorithmically, this would result in an O(n) algorithm, where the number of functions needed to check would be equivalent, in the worst case, to the number of functions in the table. Clearly, linearly scanning an entire array during every single indirect change in control flow would bring a program to its knees, so operating system support is needed to perform CFG checks efficiently. We'll see in the next section how Windows can achieve this.

## EXPERIMENT: Control Flow Guard information

The DumpBin Visual Studio tool can show some basic CFG information. The following dumps header and loader configuration information for Smss:

```bash
c:\> dumpbin /headers /loadconfig c:\windows\system32\smss.exe
Microsoft (R) COFF PE Dumper Version 14.00.24215.1
Copyright (C) Microsoft Corporation.  All rights reserved.
Dump of file c:\windows\system32\smss.exe
PE signature found
File Type: EXECUTABLE IMAGE
FILE HEADER VALUES
            8664 machine (x64)
                6 number of sections
        57899A7D time date stamp Sat Jul 16 05:22:53 2016
            0 file pointer to symbol table
            0 number of symbols
            F0 size of optional header
            22 characteristics
                Executable
                Application can handle large (>2GB) addresses
OPTIONAL HEADER VALUES
            208 magic # (PE32+)
            14.00 linker version
            12800 size of code
             EC00 size of initialized data
             0 size of uninitialized data
             1080 entry point (0000000140001080) NtProcessStartupW
             1000 base of code
1400000000 image base (0000000140000000 to 0000000140024FFF)
             1000 section alignment
             200 file alignment
             10.00 operating system version
             10.00 image version
             10.00 subsystem version
             0 Win32 version
             25000 size of image
             400 size of headers
             270FD checksum
             1 subsystem (Native)
             4160 DLL characteristics
```

---

```bash
High Entropy Virtual Addresses
               Dynamic base
               NX compatible
               Control Flow Guard
  ...
Section contains the following load config:
            00000000 size
                0 time date stamp
                0.00 Version
                0 GlobalFlags Clear
                0 GlobalFlags Set
                0 Critical Section Default Timeout
                0 Decommit Free &lock Threshold
                0 Decommit Total Free Threshold
            00000000000000000000 Lock Prefix Table
                0 Maximum Allocation Size
                0 Virtual Memory Threshold
                0 Process Heap Flags
                0 Process Affinity Mask
                0 CSD Version
                0800 Dependent Load Flag
            0000000000000000 Edit List
            00000014002060 Security Cookie
            0000001400151C0 Guard CF address of check-function pointer
            0000001400151C8 Guard CF address of dispatch-function pointer
            0000001400151D0 Guard CF function table
                2A Guard CF function count
            00010500 Guard Flags
                    CF Instrumented
                    FID table present
                    Long jump target table present
            0000 Code Integrity Flags
            0000 Code Integrity Catalog
            00000000 Code Integrity Catalog Offset
            00000000 Code Integrity Reserved
            0000000000000000 Guard CF address taken IAT entry table
                0 Guard CF address taken IAT entry count
            0000000000000000 Guard CF long jump target table
                0 Guard CF long jump target count
            0000000000000000 Dynamic value relocation table
     Guard CF Function Table
           Address
          ---------
         000000140001010  _TTgEnableCallback
         000000140001070 SmpSessionComplete
         000000140001080 NtProcessStartupW
         000000140001B30 SmscLoadSubSystemsForMuSession
         000000140001D10  SmscExecuteInitialCommand
         000000140002F80 SmpExecPgm
```

CHAPTER 7   Security      743

---

```bash
0000000140003620 SmpStartCsr
    00000001400039F0 SmpApICallback
    0000000140004E90 SmpStopCsr
...
```

The CFG-related information is marked in bold in the preceding output. We will discuss that

shortly. For now, open Process Explorer, right-click the process column header, choose Select

Columns, Then, in the Process Image tab, select the Control Flow Guard check box. Also select

Virtual Size in the Process Memory tab. You should see something like this:

![Figure](figures/Winternals7thPt1_page_761_figure_002.png)

You should see most Microsoft-provided processes were built with CFG (including Smss, Cssr, Audiodg, Notepad, and many others). The virtual size for CFG-built processes is surprisingly high. Recall that the virtual size indicates the total address space used in the process, whether that memory is committed or reserved. In contrast, the Private Bytes column shows the private committed memory and is not even remotely close to the virtual size (although the virtual size includes non-private memory as well). For 64-bit processes, the virtual size is at least 2 TB, which we will shortly be able to rationalize.

## The CFG bitmap

As you saw earlier, forcing the program to iterate through a list of function calls every few instructions

would not be practical. Therefore, instead of an algorithm that requires linear time O(n), performance

requirements dictate that an O(1) algorithm be used instead—one where a constant lookup time is

used, regardless of how many functions are present in the table. This constant lookup time should be

as small as possible. A clear winner of such a requirement would be an array that is indexable by the tar get function’s address, which is an indication if this address is valid or not (such as a simple BOOL). With

a 128 TB of possible addresses, though, such an array would itself have to be 128 TB * s1260F(BOOL),

which is an unacceptable storage size—bigger than the address space itself. Can we do better?

744 CHAPTER 7 Security

---

First, we can leverage the fact that compilers ought to generate x64 function code on 16-byte boundaries. This reduces the size to the required array to only 8TB * sizeof(BOOL). But using an entire BOOL (which is 4 bytes in the worst case or 1 byte in the best) is extremely wasteful. We only need one state, valid or invalid, which only needs to use 1 bit. This makes the calculation 8 TB / 8, or simply 1TB. Unfortunately, however, there's a snag. There's no guarantee that the compiler will generate all functions on a 16-byte binary. Hand-crafted assembly code and certain optimizations might violate this rule. As such, we'll have to figure out a solution. One possible option is to simply use another bit to indicate if the function begins somewhere on the next 15 bytes instead of on the 16-byte boundary itself. Thus, we have the following possibilities:

- • (0, 0) No valid function begins inside this 16-byte boundary.
• (0, 0) A valid function begins exactly on this aligned 16-byte address.
• (1, 1) A valid function begins somewhere inside of this 16-byte address.
Thanks to this setup, if the attacker attempts to call inside a function that was marked as 16-byte

aligned by the linker, the 2-bit state will be (1, 0), while the required bits (that is, bits 3 and 4) in the

address will be (1, 1) as the address won't be 16-byte aligned. Therefore, an attacker will only be able to

call an arbitrary instruction in the first 16 bytes of the function if the linker did not generate the func tion aligned in the first place (bits would then be (1, 1), as shown above). Even then, this instruction must

somehow be useful to the attacker without crashing the function (typically some sort of stack pivot or

gadget that ends in a ret instruction).

With this understanding in mind, we can apply the following formulas to compute the size of the

CFG bitmap:

- ■ 32-bit application on x86 or x64
2 GB / 16 * 2 = 32 MB

■ 32-bit application with /LARGEADDRESSAWARE, booted in 3 GB mode on x86
2 = 48 MB

■ 64-bit application
128 TB / 16 * 2 = 2 TB

■ 32-bit application with /LARGEADDRESSAWARE, on x64
4 GB / 16 * 2 = 64 MB, plus the size
of the 64-bit bitmap, which is needed to protect 64-bit Ntdll.dll and WoW64 components, so
2 TB + 64MB
Allocating and filling out 2 TB of bits on every single process execution is still a tough performance

overhead to swallow. Even though we have fixed the execution cost of the indirect call itself, process

startup cannot be allowed to take so long, and 2 TB of committed memory would exhaust the commit

limit instantly. Therefore, two memory-saving and performance-helping tricks are used.

First, the memory manager will only reserve the bitmap, basing itself on the assumption that the

CFG validation function will treat an exception during CFG bitmap access as an indication that the bit

state is {0,0}. As such, as long as the region contains 4 KB of bit states that are all {0,0}, it can be left as

reserved, and only pages with at least one bit set {1,X} need to be committed.

Next, as described in the ASLR section of Chapter 5, "Memory management," the system performs the randomization/relocation of libraries typically only once at boot, as a performance-saving measure to avoid

CHAPTER 7   Security      745


---

repeated relocations. As such, after a library that supports ASLR has been loaded once at a given address, it will always be loaded at that same address. This also therefore means that once the relevant bitmap states have been calculated for the functions in that library, they will be identical in all other processes that also load the same binary. As such, the memory manager treats the CFG bitmaps as a region of pagefile-backed shareable memory, and the physical pages that correspond to the shared bits only exist in RAM once.

This reduces the cost of the committed pages in RAM and means that only the bits corresponding

to private memory need to be calculated. In regular applications, private memory is not executable ex cept in the copy-on-write case where someone has patched a library (but this will not happen at image

load), so the cost of loading an application, if it shares the same libraries as other previously launched

applications, is almost nil. The next experiment demonstrates this.

## EXPERIMENT: Control Flow Guard bitmap

Open the VMMap tool and select a Notepad process. You should see a large reserved block in the Sharable section like so:

![Figure](figures/Winternals7thPt1_page_763_figure_004.png)

You can sort the lower pane by size and quickly locate the large chunk used for the


CFGBitmap, as shown. Additionally, if you attach to the process and use the !address command

on the process, you will see WinDBG identifying the CFG bitmap for you:

```bash
+   7df5'ff530000  7df6'0118a000 0'01c5a000  MEM_MAPPED MEM_RESERVE
  Other  [CFG Bitmap]
    7df6'0118a000  7df6'011fb000 0'00071000  MEM_MAPPED MEM_COMMIT PAGE_NOACCESS
  Other  [CFG Bitmap]
    7df6'011fb000  7ff5'df530000 1ff'de335000 MEM_MAPPED MEMreserve
  Other  [CFG Bitmap]
CHAPTER 7 Security
From the Library of
```

---

```bash
$FF7'fd530000 7ff5'fd532000 0'00002000   MEM_MAPPED MEM_COMMIT PAGE_READONLY\
  Other      [CFG Bitmap]
```

Note how large regions are marked as MEMreserve, in between regions that are MEM_COMMIT, representing that at least one valid bit state (1,X) is set. Also, all (or almost all) the regions will be MEM_MAPPED, since they belong to the shared bitmap.

## CFG bitmap construction

Upon system initialization, the MInitializeConfig function is called to initialize support for CFG. The function creates one or two section objects (MmCreateSection) as reserved memory with size appropriate for the platform, as shown earlier. For 32-bit platforms, one bitmap is enough. For x64 platforms, two bitmaps are required—one for 64-bit processes and the other for Wow64 processes (32-bit applications). The section objects' pointers are stored in a substructure within the MState global variable.

After a process is created, the appropriate section is securely mapped into the process's address space. Securely here means that the section cannot be unmapped by code running within the process or have its protection changed. (Otherwise, malicious code could just unmap the memory, reallocate, and fill everything with 1 bits, effectively disabling CFG, or simply modify any bits by marking the region read/write.)

The user mode CFG bitmap(s) are populated in the following scenarios:

- ■ During image mapping, images that have been dynamically relocated due to ASLR (see Chapter
5, for more on ASLR) will have their indirect call target metadata extracted. If an image does
not have indirect call target metadata, meaning it was not compiled with CFG, it is assumed
that every address within the image can be called indirectly. As explained, because dynamically
relocated images are expected to load at the same address in every process, their metadata is
used to populate the shared section that is used for the CFG bitmap.
■ During image mapping, special care is needed for non-dynamically relocated images and imag-
es not being mapped at their preferred base. For these image mappings, the relevant pages of
the CFG bitmap are made private and are populated using the CFG metadata from the image.
For images whose CFG bits are present in the shared CFG bitmap, a check is made to ensure that
all the relevant CFG bitmap pages are still shared. If this is not the case, the bits of the private
CFG bitmap pages are populated using the CFG metadata from the image.
■ When virtual memory is allocated or re-protected as executable, the relevant pages of the CFG bit-
map are made private and initialized to all 1s by default. This is needed for cases such as just-in-time
(JIT) compilation, where code is generated on the fly and then executed (for example, .NET or Java).
## Strengthening CFG protection

Although CFG does an adequate job to prevent types of exploits that leverage indirect calls or jumps, it could be bypassed through the following ways:

CHAPTER 7   Security      747

---

- ■ If the process can be tricked or an existing JIT engine abused to allocate executable memory, all the
corresponding bits will be set to {1, 1}, meaning that all memory is considered a valid call target.
■ For 32-bit applications, if the expected call target is _stdcda11 (standard calling convention),
but an attacker is able to change the indirect call target to __cdecl (C calling convention), the
stack will become corrupt, as the C call function will not perform cleanup of the caller's argu-
ments, unlike a standard call function. Because CFG cannot differentiate between the different
calling conventions, this results in a corrupt stack, potentially with an attacker-controlled return
address, bypassing the CFG mitigation.
■ Similarly, compiler-generated set jmp /long jmp targets behave differently from true indirect
calls. CFG cannot differentiate between the two.
■ Certain indirect calls are harder to protect, such as the Import Address Table (IAT) or Delay-
Load Address Table, which is typically in a read-only section of the executable.
■ Exported functions may not be desirable indirect function calls.
Windows 10 introduces advancements to CFG that address all these issues. The first is to introduce a new flag to the VirtualIaoc function called PAGE_TARGETS_INVALID and one to VirtualProtect called PAGE_TARGETS_NO_UPDATE. With these flags set, JIT engines that allocate executable memory will not see all their allocations' bits set to the [1, 1] state. Instead, they must manually call the SetProcessVoidCallTargets function (which calls the native NtSetInformationVirtualMemory function), which will allow them to specify the actual function start addresses of their JITed code. Additionally, this function is marked as a suppressed call with DECLSPEC_GUARD_SUPPRESS, making sure that attackers cannot use an indirect CALL or JMP to redirect into it, even at its function start. (Because it's an inherently dangerous function, calling it with a controlled stack or registers could result in the bypassing of CFG.)

Next, improved CFG changes the default flow you saw in the beginning of this section with a more

refined flow. In this flow, the loader does not implement a simple "verify target, return" function, but

rather a "verify target, call target, check stack, return" function, which is used in a subset of places on

32-bit applications (and/or running under WoW64). This improved execution flow is shown in Figure 7-32.

Next, improved CFG adds additional tables inside of the executable, such as the Address Taken IAT

table and the Long Jump Address table. When longjmp and IAT CFG protection are enabled in the

compiler, these tables are used to store destination addresses for these specific types of indirect calls,

and the relevant functions are not placed in the regular function table, therefore not figuring in the

bitmap. This means that if code is attempting to redirect jump/call to one of these functions, it will be

treated as an illegal transition. Instead, the C Runtime and linker will validate the targets of, say, the

longjmp function, by manually checking this table. Although it's more inefficient than a bitmap, there

should be little to no functions in these tables, making the cost bearable.

Finally, improved CFG implements a feature called export suppression, which must be supported by the compiler and enabled by process-mitigation policy. (See the section "Process-mitigation policies" for more on process level mitigations.) With this feature enabled, a new bit state is implemented (recall that bulleted list had {0, 1} as an undefined state). This state indicates that the function is valid but export-suppressed, and it will be treated differently by the loader.

748    CHAPTER 7   Security


---

![Figure](figures/Winternals7thPt1_page_766_figure_000.png)

FIGURE 7-32 Improved CFG.

You can determine which features are present in a given binary by looking at the guard flags in

the Image Load Configuration Directory, which the DumpBin application used earlier can decode. For

reference, they are listed in Table 7-21.

TABLE 7-21 Control Flow Guard flags

<table><tr><td>Flag Symbol</td><td>Value</td><td>Description</td></tr><tr><td>IMAGE_GUARD_CF_INSTRUMENTED</td><td>0x100</td><td>This indicates CFG support is present for this module.</td></tr><tr><td>IMAGE_GUARD_CFW_INSTRUMENTED</td><td>0x200</td><td>This module performs CFG and write integrity checks.</td></tr><tr><td>IMAGE_GUARD_CF_FUNCTION_TABLE_PRESENT</td><td>0x400</td><td>This module contains CFG-aware function lists.</td></tr><tr><td>IMAGE_GUARD_SEURITY_COOKIE_UNUSED</td><td>0x800</td><td>This module does not make use of the security cookie emitted with the comp1er /65 flag.</td></tr><tr><td>IMAGE_GUARD_PROTECT_DELAYLOAD_IAT</td><td>0x1000</td><td>This module supports read-only delay-load Import Address Tables (IATs).</td></tr><tr><td>IMAGE_GUARD_DELAYLOAD_IAT_IN_ITS_OWN_SECTION</td><td>0x2000</td><td>Delay-load IAT is its own section, so it can be re-protected if desired.</td></tr><tr><td>IMAGE_GUARD_CF_EXPORT_SUPPRESSION_INFO_PRESENT</td><td>0x4000</td><td>This module contains suppressed export information.</td></tr><tr><td>IMAGE_GUARD_CF_ENABLE_EXPORT_SUPPRESSION</td><td>0x8000</td><td>This module enables suppression of exports.</td></tr><tr><td>IMAGE_GUARD_CF_LONGJUMP_TABLE_PRESENT</td><td>0x10000</td><td>This module contains long jmp target information.</td></tr></table>


CHAPTER 7   Security      749


---

## Loader interaction with CFG

Although it is the memory manager that builds the CFG bitmap, the user-mode loader (see Chapter 3 for more information) serves two purposes. The first is to dynamically enable CFG support only if the feature is enabled (for example, the caller may have requested no CFG for the child process, or the process itself might not have CFG support). This is done by the LdrpCfgProcessLoadConfig loader function, which is called to initialize CFG for each loaded module. If the module D1Characteristics flags in the optional header of the PE does not have the CFG flag set (IMAGE_DLLCHARACTERISTICS_ GUARD_CFG), the GuardFlags member of IMAGE_LOAD_CONFIG_DIRECTORY structure does not have the IMAGE_GUARD_CFG_INSTRUMENTED flag set, or the kernel has forcibly turned off CFG for this module, then there is nothing to do.

Second, if the module is indeed using CFG, LdrpCfgProcessLoadConfig gets the indirect checking function pointer retrieved from the image (the GuardCFCheckFunctionPointer member of IMAGE_LOAD_CONFIG_DIRECTORY structure) and sets it to either LdrpValidatedUserCallTarget or LdrpValidatedUserCallTargetES in NdisI, depending on whether export suppression is enabled. Additionally, the function first makes sure the indirect pointer has not been somehow modified to point outside the module itself.

Furthermore, if improved CFG was used to compile this binary, a second indirect routine is avail able, called the dispatch CFG routine. It is used to implement the enhanced execution flow described

earlier. If the image includes such a function pointer (in the GuardCFIDispatchFunctionPointer

member of the abovementioned structure), it is initialized to LdrpDispatchUserCallTarget, or

LdrpDispatchUserCallTargetES if export suppression is enabled.

![Figure](figures/Winternals7thPt1_page_767_figure_004.png)

Note In some cases, the kernel itself can emulate or perform indirect jumps or calls on

behalf of user mode. In situations where this is a possibility, the kernel implements its own

MνValidatUserCallTarget routine, which performs the same work as LdrpValidate UserCallTarget.

The code generated by the compiler when CFG is enabled issues an indirect call that lands in the

LdrpValidateCallTarget(ES) or LdrpDispatchUserCallTarget(ES) functions in Ntdll. This func tion uses the target branch address and checks the bit state value for the function:

- ■ If the bit state is (0, 0), the dispatch is potentially invalid.
■ If the bit state is (1, 0), and the address is 16-byte aligned, the dispatch is valid. Otherwise, it is
potentially invalid.
■ If the bit state is (1, 1), and the address is not 16-byte aligned, the dispatch is valid. Otherwise,
it is potentially invalid.
■ If the bit state is (0, 1), the dispatch is potentially invalid.
If the dispatch is potentially invalid, the RtlHandle1EnvalIdUserC1Target function will execute

to determine the appropriate action. First, it checks if suppressed calls are allowed in the process, which

is disabled by suppressing the call. If the check passes, the critical section of the driver will begin.

750    CHAPTER 7   Security


---

is an unusual application-compatible option that might be set if Application Verifier is enabled, or through the registry. If so, it will check if the address is suppressed, which is why it was not inserted into the bitmap (recall that a special flag in the guard function table entry indicates this). If this is the case, the call is allowed through. If the function is not valid at all (meaning it's not in the table), then the dispatch is aborted and the process terminated.

Second, a check is made to see if export suppression is enabled. If it is, the target address is checked against the list of export-suppressed addresses, which is once again indicated with another flag that is added in the guard function table entry. If this is the case, the loader validates that the target address is a forwarder reference to the export table of another DLL, which is the only allowed case of an indirect call toward an image with suppressed exports. This is done by a complex check that makes sure the target address is in a different image, that its image load directory has enabled export suppression, and that this address is in the import directory of that image. If these checks match, the kernel is called through the NtSetInformationVirtualMemory call described earlier, to change the bit state to (1, 0). If any of these checks fail, or export suppression is not enabled, then the process is terminated.

For 32-bit applications, an additional check is performed if DEP is enabled for the process. (See Chapter 5

for more on DEP). Otherwise, because there are no execution guarantees to begin with, the incorrect call is

allowed, as it may be an older application calling into the heap or stack for legitimate reasons.

Finally, because large sets of (0, 0) bit states are not committed to save space, if checking the CFG bitmap lands on a reserved page, an access violation exception occurs. On x86, where exception handling setup is expensive, instead of being handled as part of the verification code, it is left to propagate normally. (See Chapter 8 in Part 2 for more on exception dispatching.) The user-mode dispatcher handler, K1UserExceptionDispatcher, has specific checks for recognizing CFG bitmap access violation exceptions within the validation function and will automatically resume execution if the exception code was STATUS_IN_PAGE_ERROR. This simplifies the code in LdrpValidUserCa1Target (ES) and Ldrpb1spatchUserCa1Target (ES), which don't have to include exception handling code. On x64, where exception handlers are simply registered in tables, the LdrpCa1Handler handler runs instead, with the same logic as above.

## Kernel CFG

Although drivers compiled with Visual Studio and /guard:cf also ended up with the same binary properties as user-mode images, the first versions of Windows 10 did not do anything with this data. Unlike the user-mode CFG bitmap, which is protected by a higher, more trusted entity (the kernel), there is nothing that can truly "protect" the kernel CFG bitmap if one were to be created. A malicious exploit could simply edit the PTE that corresponded to the page containing the desired bits to modify, mark it as read/write, and proceed with the indirect call or jump. Therefore, the overhead of setting up such a trivially bypassable mitigation was simply not worth it.

With a greater number of users enabling VBS features, once again, the higher security boundary that VTL 1 provides can be leveraged. The SLAT page table entries come to the rescue by providing a second boundary against PTE page protection changes. While the bitmap is readable to VTL 0 because the SLAT entries are marked as read only, if a kernel attacker attempts to change the PTEs to mark them read/write, they cannot do the same to the SLAT entries. As such, this will be detected as an invalid

CHAPTER 7   Security      751


---

KCFG bitmap access which HyperGuard can act on (for telemetry reasons alone—since the bits can't be

changed anyway).

KCFG is implemented almost identically to regular CFG, except that export suppression is not enabled, nor is longjmp support, nor is the ability to dynamically request additional bits for JIT purposes. Kernel drivers should not be doing any of these things. Instead, the bits are set in the bitmap based on the "address taken IAT table" entries, if any are set; by the usual function entries in the guard table each time a driver image is loaded; and for the HAL and kernel during boot by Win11@1zeKerneICfg. If the hypervisor is not enabled, and SLAT support is not present, then none of this will be initialized, and Kernel CFG will be kept disabled.

Just like in the user-mode case, a dynamic pointer in the load configuration data directory is

updated, which in the enabled case will point to __guard_check_i call for the check function and

__guard_di spatch_call for the dispatch function in enhanced CFG mode. Additionally, a variable

named guard_i call_bitmap will hold the virtual address of the bitmap.

One last detail on Kernel CFG is that unfortunately, dynamic Driver Verifier settings will not be configurable (for more information on Driver Verifier, see Chapter 6, "I/O system"), as this would require adding dynamic kernel hooks and redirecting execution to functions that may not be in the bitmap. In this case, STATUS_VRF_CFG_ENABLED (0xc000049F) will be returned, and a reboot is required (at which time the bitmap can be built with the Verifier Driver Hooks in place).

## Security assertions

Earlier, we described how Control Flow Guard will terminate the process. We also explained how certain other mitigations or security features will raise an exception to kill the process. It is important to be accurate with what exactly happens during these security violations because both these descriptions hide important details about the mechanism.

In fact, when a security-related breach occurs, such as when CFG detects an incorrect indirect call or

jump, terminating the process through the standard TerminateProcess mechanism would not be an

adequate path. There would be no crash generated, and no telemetry sent to Microsoft. These are both

important tools for the administrator to understand that a potential exploit has executed or that an

application compatibility issue exists, as well as for Microsoft to track zero-day exploitation in the wild.

On the flip side, while raising an exception would achieve the desired result, exceptions are callbacks,

which can be:

- ■ Potentially hooked by attackers if /SAFESHEH and SEHOP mitigations are not enabled, causing the
security check to be the one that gives control to an attacker in the first place-or an attacker
can simply "swallow" the exception.
■ Potentially hooked by legitimate parts of the software through an unhandled exception filter or
vectored exception handler, both of which might accidentally swallow the exception.
■ Same as above, but intercepted by a third-party product that has injected its own library into
the process. Common to many security tools, this can also lead in the exception not being cor-
rectly delivered to Windows Error Reporting (WER).

CHAPTER 7 Security

From the Library of
---

- ■ A process might have an application recovery callback registered with WER. This might then
display a less clear UI to the user, and might restart the process in its current exploited state,
leading anywhere from a recursive crash/start loop to the exception being swallowed whole.
■ Likely in a C++-based product, caught by an outer exception handler as if "thrown" by the
program itself, which, once again, might swallow the exception or continue execution in an
unsafe manner.
Solving these issues requires a mechanism that can raise an exception that cannot be intercepted by any of the process's components outside of the WER service, which must itself be guaranteed to receive the exception. This is where security assertions come into play.

