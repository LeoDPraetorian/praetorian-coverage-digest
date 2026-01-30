## Compiler and OS support

When Microsoft libraries, programs, or kernel components encounter unusual security situations, or when mitigations recognize dangerous violations of security state, they now use a special compiler intrinsic supported by Visual Studio, called __fastfa1, which takes one parameter as input. Alternatively, they can call a runtime library (Rtl) function in Ndtll called RtlFa1Fast2, which itself contains a __fastfa1 intrinsic. In some cases, the WDK or SDK contain inline functions that call this intrinsic, such as when using the LST_ENTRY functions InsertTailList and RemoveEntryList. In other situations, it is the Universal CRT (UCRT) itself that has this intrinsic in its functions. In yet others, APIs will do certain checks when called by applications and may use this intrinsic as well.

Regardless of the situation, when the compiler sees this intrinsic, it generates assembly code that

takes the input parameter, moves it into the RCX (x64) or ECX (x86) register, and then issues a software

interrupt with the number 0x29. (For more information on interrupts, see Chapter 8 in Part 2.)

In Windows 8 and later, this software interrupt is registered in the Interrupt Dispatch Table (IDT) with the handler KriaisSecurityCheckFailure, which you can verify on your own by using the !dt.29 command in the debugger. This will result (for compatibility reasons) in KiFastFa1DIspatch being called with the STATUS_STACK_BUFFER_OVERFLOW status code (0xc0000409). This will then do regular exception dispatching through KriDispatchException, but treat this as a second-chance exception, which means that the debugger and process won't be notified.

This condition will be specifically recognized and an error message will be sent to the WER error

ALPC port as usual. WER will claim the exception as non-continuous, which will then cause the kernel

to terminate the process with the usual ZwTerminateProcess system call. This, therefore, guarantees

that once the interrupt is used, no return to user mode will ever be performed within this process again,

that WER will be notified, and that the process will be terminated (additionally, the error code will be

the exception code). When the exception record is generated, the first exception argument will be the

input parameter to __fastfail.

Kernel-mode code can also raise exceptions, but in this case KiBugCheckDispatch will be called in stead, which will result in a special kernel mode crash (bugcheck) with code 0x139 (KERNEL_SECURITY_

CHECK_FAILURE), where the first argument will be the input parameter to __fastcall.

CHAPTER 7   Security      753


---

## Fast fail/security assertion codes

Because the __fastfail intrinsic contains an input argument that is bubbled up to the exception

record or crash screen, it allows the failing check to identify what part of the system or process is not

working correctly or has encountered a security violation. T able 7-22 shows the various failure condi tions and their meaning or significance.

TABLE 7-22 __fastfail failure codes

<table><tr><td>Code</td><td>Meaning</td></tr><tr><td>Legacy OS Violation (0x0)</td><td>An older buffer security check present in a legacy binary has failed, and has been converted to a security assertion instead.</td></tr><tr><td>V-Table Guard Failure (0x1)</td><td>The Virtual Table Guard Mitigation in Internet Explorer 10 and higher has encountered a corrupted virtual function table pointer.</td></tr><tr><td>Stack Cookie Check Failure (0x2)</td><td>The stack cookie generated with the /GS compiler option (also called a stack canary) has been corrupted.</td></tr><tr><td>Corrupt List Entry (0x3)</td><td>One of the macros for manipulating LIST_ENTRY structures has detected an inconsistent listed list, where the grandparent or grandchild entry does not point to the parent or child entry of the item being manipulated.</td></tr><tr><td>Incorrect Stack (0x4)</td><td>A user-mode or kernel-mode API that is often potentially called from ROP-based exploits while operating on an attacker-controlled stack has been called, and the stack is therefore not the expected one.</td></tr><tr><td>Invalid Argument (0x5)</td><td>A user-mode CRT API (typically) or other sensitive function has been called with an invalid argument, suggesting potential ROP-based use or an otherwise corrupted stack.</td></tr><tr><td>Stack Cookie Init Failure (0x6)</td><td>The initialization of the stack cookie has failed, suggesting image patching or corruption.</td></tr><tr><td>Fatal App Exit (0x7)</td><td>The application has used the FatalAppExit user-mode API, which has been converted into a security assertion to grant it the advantages this has.</td></tr><tr><td>Range Check Failure (0x8)</td><td>Additional validation checks in certain fixed array buffers to check if the array element index is within expected bounds.</td></tr><tr><td>Unsafe Registry Access (0x9)</td><td>A kernel-mode driver is attempting to access registry data from a user-control-lable hive (such as an application hive or user profile hive) and is not using the RTL_QUERY_REGISTRY_TYPECHECK flag to protect itself.</td></tr><tr><td>CFG Indirect Call Failure (0xA)</td><td>Control Flow Guard has detected an indirect CALL or JMP instruction to a target address that is not a valid dispatch per the CFG bitmap.</td></tr><tr><td>CFG Write Check Failure (0xB)</td><td>Control Flow Guard with write protection has detected an invalid write to protected data. This feature (/guard/cfw) is not supported outside of testing at Microsoft.</td></tr><tr><td>Invalid Fiber Switch (0xC)</td><td>The SwiCtoFiber API was used on an invalid fiber or from a thread which has not been converted to a fiber.</td></tr><tr><td>Invalid Set of Context (0xD)</td><td>An invalid context record structure was detected while attempting to restore it (due to an exception or SetThreadContext API), in which the stack pointer is not valid. Checked only when CFG is active on the process.</td></tr><tr><td>Invalid Reference Count (0xE)</td><td>A reference counted object (such as the OBJECT_HEADER in kernel-mode or a Win32.sys GDI object) has underflowed its reference count below 0 or over-flowed beyond its maximum capacity back to 0.</td></tr><tr><td>Invalid Jump Buffer (0x12)</td><td>A long jmp attempt is being made with a jump buffer that contains an invalid stack address or invalid instruction pointer. Checked only when CFG is active on the process.</td></tr><tr><td colspan="2">CHAPTER 7 Security</td></tr><tr><td colspan="2">From the Library of</td></tr></table>


---

<table><tr><td>TABLE 7-22 __fastfail failure codes (continued)</td><td></td><td></td><td></td></tr><tr><td>Code</td><td>Meaning</td><td></td><td></td></tr><tr><td>MRDATA Modified (0x13)</td><td>The mutable-only data heap/section of the loader has been modified. Checked only when CFG is active on the process.</td><td></td><td></td></tr><tr><td>Certification Failure (0x14)</td><td>One or more Cryptographic Services APIs has encountered an issue parsing a certificate or an invalid ASN.1 stream.</td><td></td><td></td></tr><tr><td>Invalid Exception Chain (0x15)</td><td>An image linked with /SAFESEP, or with the SEHOP mitigation, has encountered an invalid exception handler dispatch.</td><td></td><td></td></tr><tr><td>Crypto Library (0x16)</td><td>CFG SYS, KSECCD.DYS, or their equivalent APIs in user mode have encountered some critical failure.</td><td></td><td></td></tr><tr><td>Invalid Call in DLL Callout (0x17)</td><td>An attempt to call dangerous functions while in the user-mode loader's notification callback has occurred.</td><td></td><td></td></tr><tr><td>Invalid Image Base (0x18)</td><td>An invalid value for __ImageBase (IMAGE_DOS_HEADER structure) was detected by the user-mode image loader.</td><td></td><td></td></tr><tr><td>Delay Load Protection Failure (0x19)</td><td>The delay-loaded IAT has been found to be corrupted while delayloading an imported function. Checked only when CFG is active on the process, and delay-loaded IAT protection is enabled.</td><td></td><td></td></tr><tr><td>Unsafe Extension Call (0x1A)</td><td>Checked when certain kernel-mode extension APIs are called, and the caller state is incorrect.</td><td></td><td></td></tr><tr><td>Deprecated Service Called (0x1B)</td><td>Checked when certain no-longer supported, and undocumented system calls, are called.</td><td></td><td></td></tr><tr><td>Invalid Buffer Access (0x1C)</td><td>Checked by the runtime library functions in NtDll and the kernel when a generic buffer structure is corrupt in some way.</td><td></td><td></td></tr><tr><td>Invalid Balanced Tree (0x1D)</td><td>Checked by the runtime library functions in NtDll and the kernel when an RTL_RB_TREE or RTL_AVL_TABLE structure has invalid nodes (where siblings and/or parent nodes do not match up with the grandparent's, similar to the LLIST_ENTRY check).</td><td></td><td></td></tr><tr><td>Invalid Next Thread (0x1E)</td><td>Checked by the kernel scheduler when the next thread to schedule in the KPRCB is invalid in some way.</td><td></td><td></td></tr><tr><td>CFG Call Suppressed (0x1F)</td><td>Checked when CFG is allowing a suppressed call due to compatibility concerns. In this situation, WER will mark the error as handled, and the kernel will not terminate the process, but telemetry will still be sent to Microsoft.</td><td></td><td></td></tr><tr><td>APCs Disabled (0x20)</td><td>Checked by the kernel when returning to user-mode and kernel APCs are still disabled.</td><td></td><td></td></tr><tr><td>Invalid Idle State (0x21)</td><td>Checked by the kernel power manager when the CPU is attempting to enter an invalid C-state.</td><td></td><td></td></tr><tr><td>MRDATA Protection Failure (0x22)</td><td>Checked by the user-mode loader when the Mutable Read-Only Heap Section has already been unprotected outside of the expected code path.</td><td></td><td></td></tr><tr><td>Unexpected Heap Exception (0x23)</td><td>Checked by the heap manager whenever the heap is corrupted in ways that indicate potential exploitation attempts.</td><td></td><td></td></tr><tr><td>Invalid Lock State (0x24)</td><td>Checked by the kernel when certain locks are not in their expected state, such as if an acquired lock is already in a released state.</td><td></td><td></td></tr><tr><td>Invalid Longjmp (0x25)</td><td>Checked by long jmp when called, and CFG is active on the process with Longjmp Protection enabled, but the Longjmp Table is corrupt or missing in some way.</td><td></td><td></td></tr><tr><td>Invalid Longjmp Target (0x26)</td><td>Same conditions as above, but the Longjmp Table indicates that this is not a valid Longjmp target function.</td><td></td><td></td></tr></table>

---

TABLE 7-22 __fastfail failure codes (continued)

<table><tr><td>Code</td><td>Meaning</td></tr><tr><td>Invalid Dispatch Context (0x27)</td><td>Checked by the exception handler in kernel-mode when an exception is attempted to be dispatched with an incorrect CONTEXT record.</td></tr><tr><td>Invalid Thread (0x28)</td><td>Checked by the scheduler in kernel-mode when the KTHREAD structure is corrupt during certain scheduling operations.</td></tr><tr><td>Invalid System Call Number (0x29)</td><td>Similar to Deprecated Service Called, but WER will mark the exception as handled, resulting in the process continuing and therefore only used for telemetry.</td></tr><tr><td>Invalid File Operation (0x2A)</td><td>Used by the I/O Manager and certain file systems, as another telemetry-type failure as above.</td></tr><tr><td>LPAC Access Denied (0x2B)</td><td>Used by the SRM&#x27;s access check function when a lower-privilege AppContainer attempts to access an object that does not have the ALL_RESTRICTED_APPLICATION_PACKAGES SID and tracing of such failures is enabled. Once more, results only in telemetry data, not a process crash.</td></tr><tr><td>RFG Stack Failure (0x2C)</td><td>Used by Return Flow Guard (RFG), although this feature is currently disabled.</td></tr><tr><td>Loader Continuity Failure (0x2D)</td><td>Used by the process-mitigation policy of the same name, shown earlier, to indicate that an unexpected image with a different signature or no signature has been loaded.</td></tr><tr><td>CFG Export Suppression Failure (0x2D)</td><td>Used by CFG when enabled with export suppression to indicate that a suppressed export has been the target of an indirect branch.</td></tr><tr><td>Invalid Control Stack (0x2E)</td><td>Used by RFG, although this feature is currently disabled.</td></tr><tr><td>Set Context Denied (0x2F)</td><td>Used by the process-mitigation policy of the same name, shown earlier, although this feature is currently disabled.</td></tr></table>


## Application Identification

Historically, security decisions in Windows have been based on a user's identity (in the form of the user's SID and group membership), but a growing number of security components (AppLocker, firewall, antivirus, anti-malware, Rights Management Services, and others) need to make security decisions based on what code is to be run. In the past, each of these security components used their own preprietary method for identifying applications, which led to inconsistent and overly complicated policy authoring. The purpose of Application Identification (AppID) is to bring consistency to how the security components recognize applications by providing a single set of APIs and data structures.

![Figure](figures/Winternals7thPt1_page_773_figure_004.png)

Note This is not the same as the AppID used by DOM/COM+ applications, where a GUID represents a process that is shared by multiple CLSIDs, nor is it related to UWP application ID.

Just as a user is identified when she logs in, an application is identified just before it is started by


generating the main program's AppID. An AppID can be generated from any of the following attributes


of the application:

- ■ Fields Fields within a code-signing certificate embedded within the file allow for different
combinations of publisher name, product name, file name, and version. APPID: //FQBN is a
756    CHAPTER 7   Security


---

fully qualified binary name, and it is a string in the following form: {Publisher,Product \

Filename,Version}. Publisher is the Subject field of the x.509 certificate used to sign the

code, using the following fields:

- ● O Organization

• L Locality

• S State or province

• C Country
• File hash there are several methods that can be used for hashing. The default is APID: // SHA256HASH. However, for backward compatibility with SRP and most x.509 certificates, SHA-1 (APID://SHA1HASH) is still supported. APID://SHA256HASH specifies the SHA-256 hash of the file.

■ The partial or complete path to the file APIDF://Path specifies a path with optional wildcard characters (*).

![Figure](figures/Winternals7thPt1_page_774_figure_004.png)

Note An AppID does not serve as a means for certifying the quality or security of an application. An AppID is simply a way of identifying an application so that administrators can reference the application in security policy decisions.

The AppID is stored in the process access token, allowing any security component to make authorization decisions based on a single consistent identification. AppLocker uses conditional ACEs (described earlier) for specifying whether a particular program is allowed to be run by the user.

When an ApiID is created for a signed file, the certificate from the file is cached and verified to a trusted root certificate. The certificate path is reverified daily to ensure the certificate path remains valid. Certificate caching and verification are recorded in the system event log at Application and Services Logs\Microsoft\Windows\AppData\Operational.

## AppLocker

Windows 8.1 and Windows 10 (Enterprise editions) and Windows Server 2012/RS/2016 support a feature known as AppLocker, which allows an administrator to lock down a system to prevent unauthorized programs from being run. Windows XP introduced Software Restriction Policies (SRP), which was the first step toward this capability, but SRP was difficult to manage, and it couldn't be applied to specific users or groups. (All users were affected by SRP rules.) AppLocker is a replacement for SRP, and yet coexists alongside SRP, with AppLocker's rules being stored separately from SRP's rules. If both AppLocker and SRP rules are in the same Group Policy object (GPO), only the AppLocker rules will be applied.

Another feature that makes AppLocker superior to SRP is AppLocker's auditing mode, which allows an administrator to create an AppLocker policy and examine the results (stored in the system event log) to determine whether the policy will perform as expected—without actually performing the

CHAPTER 7   Security      757


---

restrictions. AppLocker auditing mode can be used to monitor which applications are being used by one or more users on a system.

AppLocker allows an administrator to restrict the following types of files from being run:

- ● Executable images (EXE and COM)

● Dynamic-link libraries (DLL and OCX)

● Microsoft Software Installer (MSI and MSP) for both install and uninstall

● Scripts

● Windows PowerShell (PS1)

● Batch (BAT and CMD)

● VisualBasic Script (VBS)

● Java Script (JS)
AppLocker provides a simple GUI rule-based mechanism, which is very similar to network firewall

rules, for determining which applications or scripts are allowed to be run by specific users and groups,

using conditional ACEs and AppID attributes. There are two types of rules in AppLocker:

- ■ Allow the specified files to run, denying everything else.
■ Deny the specified files from being run, allowing everything else. Deny rules take precedence
over allow rules.
Each rule can also have a list of exceptions to exclude files from the rule. Using an exception, you

could create a rule to, for example, allow everything in the C:\Windows or C:\Program Files directories

to be run except RegEdit.exe.

AppLocker rules can be associated with a specific user or group. This allows an administrator to support compliance requirements by validating and enforcing which users can run specific applications. For example, you can create a rule to allow users in the Finance security group to run the finance lineof-business applications. This blocks everyone who is not in the Finance security group from running finance applications (including administrators) but still provides access for those who have a business need to run the applications. Another useful rule would be to prevent users in the Receptionists group from installing or running unapproved software.

AppLocker rules depend upon conditional ACEs and attributes defined by AppID. Rules can be created using the following criteria:

- ■ Fields within a code-signing certificate embedded within the file, allowing for different
combinations of publisher name, product name, file name, and version For example,
a rule could be created to allow all versions greater than 9.0 of Contoso Reader to run or allow
anyone in the Graphics group to run the installer or application from Contoso for GraphicsShop
as long as the version is 14.*. For example, the following SDDL string denies execute access to
---

any signed programs published by Contoso for the RestrictedUser user account (identified by the user's SID):

```bash
D:(XD;;:S-1-5-21-393273855-1129761602-2459801163-1028;((Exists APSSID://FQBN)
& ((APPID://FQBN) >= (("%=CONTOSO, INCORPORATED, L=REDMOND,
S=CHASHINTON, C=NS(^[^*]]0))))))
```

■ Directory path, allowing only files within a particular directory tree to run This can also be used to identify specific files. For example, the following SDDL string denies execute access to the programs in the directory C:\Tools for the RestrictedUser user account (identified by the user's SID):

```bash
D:(\DC):\f;;\S-1-21-339237855-1129761602-2459801163-1028{APPID://PATH
        "C:\SDRIVE\TOOLS\");
```

■ File hash Using a hash will also detect if a file has been modified and prevent it from running. This can also be a weakness if files are changed frequently because the hash rule will need to be updated frequently. File hashes are often used for scripts because few scripts are signed. For example, this SDDL string denies execute access to programs with the specified hash values for the RestrictedUser user account (identified by the user's ID):

```bash
D:\0X;;F\;;S-1-5-21-339273855-1129761602-2459801163-1028{\APPID:\SH2A26HASH
Any_of {\#7a3334d2b99da8448e38edf08dfca638ab3ba7bb40044496ee2ef82636599f1fb647,
#a287f27c6b9c4ece307dc52c338f02edbdfda38906674e35c68224a8a92a76b}}
```

AppLocker rules can be defined on the local machine using the Security Policy MMC snap-in (sepcol.

msc, see Figure 7-33) or a Windows PowerShell script, or they can be pushed to machines within a

domain using Group Policy. AppLocker rules are stored in multiple locations within the registry:

- ■ HKLM\Software\Policies\Microsoft\Windows\SrpV2 This key is also mirrored to
HKLM\SOFTWARE\Wow6432Node\Policies\Microsoft\Windows\SrpV2. The rules are stored
in XML format.
■ HKLM\SYSTEM\CurrentControlSet\Control\Srp\Gp\Exe The rules are stored as SDDL
and a binary ACE.
■ HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Group Policy
Objects\{GUID\Machine\Software\Policies\Microsoft\Windows\SrpV2 AppLocker policy
pushed down from a domain as part of a GPO are stored here in XML format.
Certificates for files that have been run are cached in the registry under the key HKLM\SYSTEM\CurrentControlSet\Control\ApID\certStore. AppLocker also builds a certificate chain (stored in HKLM\SYSTEM\CurrentControlSet\Control\ApID\CertChainStore) from the certificate found in a file back to a trusted root certificate.

There are also AppLocker-specific PowerShell commands (cmdlets) to enable deployment and testing via scripting. After using the Import-Module AppLocker to get AppLocker cmdlets into PowerShell, several cmdlets are available. These include Get-AppLockerFileInformation, Get-AppLockerPolicy, New-AppLockerPolicy, Set-AppLockerPolicy, and Test-AppLockerPolicy.

CHAPTER 7   Security      759


---

![Figure](figures/Winternals7thPt1_page_777_figure_000.png)

FIGURE 7-33 AppLocker configuration page in Local Security Policy.

The AppID and SRP services coexist in the same binary (AppIdSvc.dll), which runs within an SvCHost process. The service requests a registry change notification to monitor any changes under that key, which is written by either a GPO or the AppLocker UI in the Local Security Policy MMC snap-in. When a change is detected, the AppID service triggers a user-mode task (AppIdPolicyConverter.exe), which reads the new rules (described with XML) and translates them into binary format ACEs and SDDL strings, which are understandable by both the user-mode and kernel-mode AppID and AppLocker components. The task stores the translated rules under HKLM\SYSTEM\CurrentControlSet\Control\Scrp\ Gp. This key is writable only by System and Administrators, and it is marked read-only for authenticated users. Both user-mode and kernel-mode AppID components read the translated rules from the registry directly. The service also monitors the local machine trusted root certificate store, and it invokes a usermode task (AppIdCertStoreCheck.exe) to reverify the certificates at least once per day and whenever there is a change to the certificate store. The AppID kernel-mode driver (%SystemRoot%\System32\ drivers\AppId.sys) is notified about rule changes by the AppID service through an APPID_POLICY_ CHANGEDDeviceIoControl request.

An administrator can track which applications are being allowed or denied by looking at the

system event log using Event Viewer (once AppLocker has been configured and the service started).

See Figure 7-34.

760 CHAPTER 7 Security

---

![Figure](figures/Winternals7thPt1_page_778_figure_000.png)

FIGURE 7-34 Event Viewer showing AppLocker allowing and denying access to various applications. Event ID 8004 is denied. 8002 is allowed.

The implementations of AppID, AppLocker, and SRP are somewhat blurred and violate strict layering, with various logical components coexisting within the same executables, and the naming is not as consistent as one would like.

The AppID service runs as LocalService so that it has access to the Trusted Root Certificate Store

on the system. This also enables it to perform certificate verification. The AppID service is responsible

for the following:

- ■ Verification of publisher certificates

■ Adding new certificates to the cache

■ Detecting AppLocker rule updates and notifying the AppID driver
The AppID driver performs the majority of the AppLocker functionality and relies on communication (via DeviceIoControl requests) from the AppID service, so its device object is protected by an ACL, granting access only to the NT SERVICE\ApIDSvc, LOCAL SERVICE and BUILTIN\Administrators groups. Thus, the driver cannot be spoofed by malware.

When the AppID driver is first loaded, it requests a process-creation callback by calling PSetCreateProcessNotifyRoutineEx. When the notification routine is called, it is passed a PPS_

CREATE_NOTIFY_INFO structure (describing the process being created). It then gathers the AppID attributes that identify the executable image and writes them to the process's access token. Then it calls the undocumented routine SeSrpAccessCheck, which examines the process token and the conditional ACE AppLocker rules, and determines whether the process should be allowed to run. If the process should


CHAPTER 7 Security 761


From the Library of Micha

---

not be allowed to run, the driver writes STATUS_ACCESS_DISABLED_BY_POLICY_OTHER to the Status

field of the PPS_CREATE_NOTIFY_INFO structure, which causes the process creation to be canceled (and

sets the process's final completion status).

To perform DLL restriction, the image loader sends a DeviceIoControl request to the AppID driver whenever it loads a DLL into a process. The driver then checks the DLL's identity against the AppLocker conditional ACEs, just like it would for an executable.

![Figure](figures/Winternals7thPt1_page_779_figure_002.png)

Note Performing these checks for every DLL load is time-consuming and might be noticeable to end users. For this reason, DLL rules are normally disabled, and they must be specifically enabled via the Advanced tab in the AppLocker properties page in the Local Security Policy snap-in.

The scripting engines and the MSI installer have been modified to call the user-mode SRP APIs whenever they open a file, to check whether a file is allowed to be opened. The user-mode SRP APIs call the AuthZ APIs to perform the conditional ACE access check.

## Software Restriction Policies

Windows contains a user-mode mechanism called Software Restriction Policies (SRP) that enables administrators to control what images and scripts execute on their systems. The Software Restriction Policies node of the Local Security Policy editor, shown in Figure 7-35, serves as the management interface for a machine's code execution policies, although per-user policies are also possible using domain group policies.

![Figure](figures/Winternals7thPt1_page_779_figure_007.png)

FIGURE 7-35 Software Restriction Policy configuration.

762 CHAPTER 7 Security


---

Several global policy settings appear beneath the Software Restriction Policies node:

- ■ Enforcement This policy configures whether restriction policies apply to libraries, such as
DLLs, and whether policies apply to users only or to administrators as well.

■ Designated File Types This policy records the extensions for files that are considered
executable code.

■ Trusted Publishers This policy controls who can select which certificate publishers
are trusted.
When configuring a policy for a particular script or image, an administrator can direct the

system to recognize it using its path, its hash, its Internet zone (as defined by Internet Explorer),

or its cryptographic certificate, and can specify whether it is associated with the Disallowed or

Unrestricted security policy.

Enforcement of SRPs takes place within various components where files are treated as containing executable code. Some of these components are listed here:

- The user-mode Windows CreateProcess function in Kernel32.dll enforces it for
executable images.

• The DLL loading code in Ndtll enforces it for DLLs.

• The Windows command prompt (Cmd.exe) enforces it for batch file execution.

• Windows Scripting Host components that start scripts—Cscript.exe (for command-line scripts),
Wscript.exe (for UI scripts), and ScrobJ.dll (for script objects)—enforce it for script execution.

• The PowerShell host (PowerShell.exe) enforces it for PowerShell script execution.
Each of these components determines whether the restriction policies are enabled by reading the TransparentEnabled registry value in the HKLM\Software\Policies\Microsoft\Windows\SafeNet CodeIdentifiers key, which if set to 1 indicates that policies are in effect. Then it determines whether the code it's about to execute matches one of the rules specified in a subkey of the CodeIdentifiers key and, if so, whether the execution should be allowed. If there is no match, the default policy, as specified in the DefaultLevel value of the CodeIdentifiers key, determines whether the execution is allowed.

Software Restriction Policies are a powerful tool for preventing the unauthorized access of code and

scripts, but only if properly applied. Unless the default policy is set to disallow execution, a user can

make minor changes to an image that's been marked as disallowed so that he can bypass the rule and

execute it. For example, a user can change an innocuous byte of a process image so that a hash rule

fails to recognize it, or copy a file to a different location to avoid a path-based rule.

---

EXPERIMENT: Watching Software Restriction Policy enforcement

You can indirectly see SRPs being enforced by watching accesses to the registry when you

attempt to execute an image that you've disallowed.

- 1. Run secpol.msc to open the Local Security Policy editor and navigate to the Software

Restriction Policies node.

2. Choose Create New Policies from the context menu if no policies are defined.

3. Create a path-based disallow restriction policy (under the Additional Rules node) for

%SystemRoot%\System32\Notepad.exe.

4. Run Process Monitor and set an include a Path filter for Safer.

5. Open a command prompt and run Notepad from the prompt.
Your attempt to run Notepad should result in a message telling you that you cannot execute

the specified program, and Process Monitor should show the command prompt (cmd.exe) query ing the local machine restriction policies.

## Kernel Patch Protection

Some device drivers modify the behavior of Windows in unsupported ways. For example, they patch the system call table to intercept system calls or patch the kernel image in memory to add functionality to specific internal functions. Such modifications are inherently dangerous and can reduce system stability and security. Additionally, it is also possible for such modifications to be made with malicious intent, either by rogue drivers or through exploits due to vulnerabilities in Windows drivers.

Without the presence of a more privileged entity than the kernel itself, detecting and protecting

against kernel-based exploits or drivers from within the kernel itself is a tricky game. Because both the

detection/protection mechanism and the unwanted behavior operate in ring 0, it is not possible to de fine a security boundary in the true sense of the word, as the unwanted behavior could itself be used to

disable, patch, or fool the detection/prevention mechanism. That being said, even in such conditions, a

mechanism to react to such unwanted operations can still be useful in the following ways:

- By crashing the machine with a clearly identifiable kernel-mode crash dump, both users and ad-
ministrators can easily see that an unwanted behavior has been operating inside of their kernel
and they can take action. Additionally, it means that legitimate software vendors will not want
to take the risk of crashing their customers' systems and will find supported ways of extending
kernel functionality (such as by using the filter manager for file system filters or other callback-
based mechanisms).
---

<table><tr><td>■</td><td>Obfuscation (which is not a security boundary) can make it costly—either in time or in complex-ity—for the unwanted behavior to disable the detection mechanism. This added cost means that the unwanted behavior is more clearly identified as potentially malicious, and that its com-plexity results in additional costs to a potential attacker. By shifting the obfuscation techniques, it means that legitimate vendors will be better off taking the time to move away from their legacy extension mechanisms and implement supported techniques instead, without the risk of looking malware. ■</td><td>Randomization and non-documentation of which specification makes to ensure kernel integrity, and non-determinism of which check are executed, cripple the ability of attackers to ensure their exploits are reliable. It forces them to account for every possible non-deterministic variable and state transition that the mechanism has through static analysis, which obfuscation makes nearly impossible within the timeframe required before another obfuscation change is implemented in the mechanism. ■</td><td>Because kernel mode crash dumps are automatically submitted to Microsoft, it allows the company to receive telemetry of in-the-wild unwanted code, and to either identify software vendors whose code is unsupported and is crashinging systems, or to track the progress of mali-cious drivers in the wild, or even zero-day kernel-mode exploitations, and fix bugs that may not have been reported, but are actively exploited.</td></tr></table>

PatchGuard

Shortly after the release of 64-bit Windows for x64 and before a rich third-party ecosystem had developed, Microsoft saw an opportunity to preserve the stability of 64-bit Windows, and to add telemetry and exploit-cripling patch detection to the system, through a technology called Kernel Patch Protection (KPP), also referred to as PatchGuard. When Windows Mobile was released, which operates on a 32-bit ARM processor core, the feature was ported to such systems, too, and it will be present in 64-bit ARM (AArch64) systems as well. Due to the existence of too many legacy 32-bit drivers that still use unsupported and dangerous hooking techniques, however, this mechanism is not enabled on such systems, even on Windows 10 operating systems. Fortunately, usage of 32-bit systems is almost coming to an end, and server versions of Windows no longer support this architecture at all.

Although both Guard and Protection imply that the mechanism will protect the system, it is important to realize that the only guard/protection offered is the crashing of the machine, which prevents further execution of the unwanted attack. The mechanism does not prevent the attack in the first place, nor mitigate against it, nor undo it. Think of KPP as an Internet-connected video security system, or CCTV, with a loud alarm (the crash) inside the vault (the kernel), not as an impenetrable lock on the vault.

KPP has a variety of checks that it makes on protected systems, and documenting them all would both be impractical (due to the difficulty of static analysis) and valuable to potential attackers (reducing their research time). However, Microsoft does document certain checks, which we generalize in Table 7-23. When, where, and how KPP makes these checks, and which specific functions or data structures are affected, is outside of the scope of this analysis.

CHAPTER 7 Security 765


---

TABLE 7-23 Generalized description of elements protected by KPP

<table><tr><td>Component</td><td>Legitimate Usage</td><td>Potential Unwanted Usage</td></tr><tr><td>Executable code in the kernel, its dependencies, and core drivers, as well as the Import Address Table (IAT) of these components</td><td>Standard Windows components key to operation of kernel-mode usage.</td><td>Patching code in these components can modify their behavior and introduce unwanted back doors to the system, hide data or unwanted communications between them, as well as reduce the stability of the system, or even add additional vulnerabilities through buggy third-party code.</td></tr><tr><td>Global Descriptor Table (GDT)</td><td>CPU hardware protection for the implementation of ring privilege levels (ring 0 versus ring 3).</td><td>Modification of expected permissions and mappings between code and ring levels, allowing ring 3 code ring 0 access.</td></tr><tr><td>Interrupt Descriptor Table (IDT) or Interrupt Vector Table</td><td>Table read by the CPU to deliver interrupt vectors to the correct handling routine.</td><td>Hacking of keystrokes, network packets, paging mechanism, system calls, hypervisor communication, and more, which can be used for back-dooring, hiding malicious data or communications, or accidentally adding vulnerabilities through buggy third-party code.</td></tr><tr><td>System Service Descriptor Table (SSDT)</td><td>Table containing the array of pointers for each system call handler.</td><td>Hacking of all user-mode communications with the kernel. Same issues as above.</td></tr><tr><td>Critical CPU registers such as Control Registers, Vector Base Address Register, and Model Specific Registers</td><td>Used for system calls, virtualization, enabling CPU security features such as SMEP, and more.</td><td>Same as above, plus disabling of key CPU security features or hypervisor protection.</td></tr><tr><td>Various function pointers in the kernel</td><td>Used as indirect calls to various internal functionality.</td><td>Can be used to hook certain internal kernel operations, leading to back doors and/or instability.</td></tr><tr><td>Various global variables in the kernel</td><td>Used to configure various parts of the kernel, including certain security features.</td><td>Malicious code would disable these security features, such as through an exploit from user mode allowing arbitrary memory overwrites.</td></tr><tr><td>Process and module list</td><td>Used to show the user, in tools such as Task Manager, Process Explorer, and the Windows Debugger, which processes are active, and which drivers are loaded.</td><td>Malicious code can hide the existence of certain processes or drivers on the machine, making them invisible to the user and most applications such as security software.</td></tr><tr><td>Kernel stacks</td><td>Store function arguments, the call stack (where a function should return), and variables.</td><td>Operating on a non-standard kernel stack is often the sign of a return-oriented programming (ROP) exploit operating on a pivoted stack as part of the attack.</td></tr><tr><td>Window Manager, graphical system calls, callbacks, and more</td><td>Provides the GUI, GDI, and DirectX services.</td><td>Same hooking abilities as described earlier, but specifically targeting the graphics and window-management stack. Same issues as other types of hooks.</td></tr><tr><td>Object types</td><td>Definitions for the various objects (such as processes and files) that the system supports through the object manager.</td><td>Can be used as another hooking technique, which does not target indirect function pointers in binaries&#x27; data sections, nor patching code directly. Same issues.</td></tr><tr><td colspan="3">CHAPTER 7 Security</td></tr><tr><td colspan="3">From the Library of</td></tr></table>


---

TABLE 7-23 Generalized description of elements protected by KPP (continued)

<table><tr><td>Component</td><td>Legitimate Usage</td><td>Potential Unwanted Usage</td></tr><tr><td>Local APIC</td><td>Used to receive hardware interrupts on the processor, receive timer interrupts, and inter-processor interrupts (IPI).</td><td>Can be used to hook timer execution, IPIs, or interrupts, or as a way for persistent code to covertly maintain liveness on the machine, executing on a periodic basis.</td></tr><tr><td>Filter and third-party notification callbacks</td><td>Used by legitimate third-party security software (and Windows Defender) to receive notifications about system actions, and in some cases even block/defend against certain actions. Exists as the supported way to achieve much of what KPP prevents.</td><td>Could be used by malicious code to hook all the filterable operations, as well as maintain liveness on a machine, executing on a periodic basis.</td></tr><tr><td>Specialized configuration and flags</td><td>Various data structures, flags, and elements of legitimate components that provide security and/or mitigation guarantees to them.</td><td>Could be used by malicious code to bypass certain mitigations or violate certain guarantees or expectations that user-mode processes might have, such as unprotected a protected process.</td></tr><tr><td>KPP engine itself</td><td>Code related to bug-checking the system during a KPP violation, executing the callbacks associated with KPP, and more.</td><td>By modifying certain parts of the system used by KPP, unwanted components could attempt to silence, ignore, or otherwise cripple KPP.</td></tr></table>


As mentioned, when KPP detects unwanted code on the system, it crashes the system with an easily identifiable code. This corresponds to buchgeek code 0x109, which stands for CRITICAL_STRUCTURE_ CORRUPTION, and the Windows Debugger can be used to analyze this crash dump. (See Chapter 15, "Crash dump analysis," in Part 2 for more information.) The dump information will contain some information about the corrupted or scumptuously modified part of the kernel, but any additional data must be analyzed by Microsoft's Online Crash Analysis (OCA) and/or Windows Error Reporting (WER) teams and is not exposed to users.

For third-party developers who use techniques that KPP deters, the following supported techniques can be used:

- ■ File system (mini) filters Use these to hook all file operations, including loading image
files and DLLs, that can be intercepted to purge malicious code on-the-fly or block reading of
known bad executables or DLLs. (See Chapter 13, “File systems,” in Part 2 for more information
on these.)
■ Registry filter notifications Use these to hook all registry operations. (See Chapter 9 in Part
2 for more information on these notifications.) Security software can block modification of criti-
cal parts of the registry, as well as heuristically determine malicious software by registry access
patterns or known bad registry keys.
■ Process notifications Security software can monitor the execution and termination of
all processes and threads on the system, as well as DLLs being loaded or unloaded. With the
enhanced notifications added for antivirus and other security vendors, they also can block
process launch. (See Chapter 3 for more information on these notifications.)
CHAPTER 7   Security      767


---

- ● Object manager filtering Security software can remove certain access rights being granted
to processes and/or threads to defend their own utilities against certain operations. (These are
discussed in Chapter 8 in Part 2.)
● NDIS Lightweight Filters (LWF) and Windows Filtering Platform (WFP) filters Security
software can intercept all socket operations (accept, listen, connect, close, and so on) and even
the packets themselves. With LWF, security vendors have access to the raw Ethernet frame data
that is going from the network card (NIC) to the wire.
● Event Tracing for Windows (ETW) Through ETW, many types of operations that have
interesting security properties can be consumed by a user-mode component, which can then
react to data in near real-time. In certain cases, special secure ETW notifications are available to
anti-malware-protected processes under NDA with Microsoft and participation in various secu-
rity programs, which give access to a greater set of tracing data. (ETW is discussed in Chapter 8
in Part 2.)
## HyperGuard

On systems that run with virtualization-based security (described earlier in this chapter in the section

"Virtualization-based security"), it is no longer true that attackers with kernel-mode privileges are es sentially running at the same security boundary as a detection/prevention mechanism. In fact, such at tackers would operate at VTL 0, while a mechanism could be implemented in VTL 1. In the Anniversary

Update of Windows 10 (version 1607), such a mechanism does indeed exist, which is appropriately

named HyperGuard. HyperGuard has a few interesting properties that set it apart from PatchGuard:

- ■ It does not need to rely on obfuscation. The symbol files and function names that implement
HyperGuard are available for anyone to see, and the code is not obfuscated. Complete static
analysis is possible. This is because HyperGuard is a true security boundary.
■ It does not need to operate non-deterministically because this would provide no advantage
due to the preceding property. In fact, by operating deterministically, HyperGuard can crash
the system at the precise time unwanted behavior is detected. This means crash data will con-
tain clear and actionable data for the administrator (and Microsoft's analysis teams), such as the
kernel stack, which will show the code that performed the undesirable behavior.
■ Due to the preceding property, it can detect a wider variety of attacks, because the malicious
code does not have the chance to restore a value back to its correct value during a precise time
window, which is an unfortunate side-effect of PatchGuard's non-determinism.
HyperGuard is also used to extend PatchGuard's capabilities in certain ways, and to strengthen its

ability to run undetected by attackers trying to disable it. When HyperGuard detects an inconsistency,

it too will crash the system, albeit with a different code: 0x18C (HYPERGUARD_VIATION). As before, it

might be valuable to understand, at a generic level, what kind of things HyperGuard will detect, which

you can see in Table 7-24.

---

TABLE 7-24 Generalized description of elements protected by HyperGuard

<table><tr><td>Component</td><td>Legitimate Usage</td><td>Potential Unwanted Usage</td></tr><tr><td>Executable code in the kernel, its dependencies, and core drivers, as well as the Import Address Table (IAT) of these components</td><td>Refer to Table 7-23.</td><td>Refer to Table 7-23.</td></tr><tr><td>Global Descriptor Table (GDT)</td><td>Refer to Table 7-23.</td><td>Refer to Table 7-23.</td></tr><tr><td>Interrupt Descriptor Table (IDT) or Interrupt Vector Table</td><td>Refer to Table 7-23.</td><td>Refer to Table 7-23.</td></tr><tr><td>Critical CPU registers such as Control Registers, GDR, IDTR, Vector Base Address Register, and Model Specific Registers</td><td>Refer to Table 7-23.</td><td>Refer to Table 7-23.</td></tr><tr><td>Executable code, callbacks, and data regions in the Secure Kernel and its dependencies, including HyperGuard itself</td><td>Standard Windows components key to operation of VTL1 and secure kernel-mode usage.</td><td>Patching code in these components implies the attacker has access to some sort of vulnerability in VTL1, either through hardware or the hyper-visor. Could be used to subvert Device Guard, HyperGuard, and Credential Guard.</td></tr><tr><td>Structures and features used by Trustlets</td><td>Sharing data between one Trustlet to another, or Trustlets and the kernel, or Trustlets and VTL 0.</td><td>Implies that some vulnerability might exist in one or more Trustlets, which could be used to hamper features such as Credential Guard or Shielded Fabric/vTPM.</td></tr><tr><td>Hypervisor structures and regions</td><td>Used by the hypervisor to communicate with VTL1.</td><td>Implies a potential vulnerability in a VTL1 component or the hypervisor itself, which may be accessible from ring 0 in VTL 0.</td></tr><tr><td>Kernel CFG bitmap</td><td>Used to identify valid kernel functions that are the subject of indirect function calls or jumps, as described earlier.</td><td>Implies that an attacker has been able to perform a modification to the VTL1-protected KCFG bitmap through some sort of hardware or hypervisor exploit.</td></tr><tr><td>Page verification</td><td>Used to implement HVCI-related work for Device Guard.</td><td>Implies that an attacker has somehow attacked SKCI, which could result in Device Guard compromise or non-authorized IUM Trustlets.</td></tr><tr><td>NULL page</td><td>None.</td><td>Implies that an attacker has somehow coerced the kernel and/or secure kernel to allocate virtual page 0, which can be used to exploit NULL-page vulnerabilities in either VTL 0 or VTL 1.</td></tr></table>


On systems with VBS enabled, there is another security-related feature that is worth describing, which is implemented in the hypervisor itself: Non-Privileged Instruction Execution Prevention (NPIEP). This mitigation targets specific x64 instructions that can be used to leak the kernel-mode addresses of the GDT, IDT, and LDT, which are SGDT, SIDT, and SLDT. With NPIEP, these instructions are still allowed to execute (due to compatibility concerns), but will return a per-processor unique number that is not actually the kernel address of these structures. This serves as a mitigation against Kernel ASLR (KASLR) information leaks from local attackers.

Finally, note that there is no way to disable PatchGuard or HyperGuard once they are enabled.

However, because device-driver developers might need to make changes to a running system as part

of debugging, PatchGuard is not enabled when the system boots in debugging mode with an active

remote kernel-debugging connection. Similarly, HyperGuard is disabled if the hypervisor boots in

debugging mode with a remote debugger attached.

CHAPTER 7   Security      769


---

