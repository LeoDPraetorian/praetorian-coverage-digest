## EXPERIMENT: Kernel mode vs. user mode

You can use the Performance Monitor to see how much time your system spends executing in kernel mode versus in user mode. Follow these steps:

1. Open the Start menu and type Run Performance Monitor (it should be suggested before you finish typing) to run Performance Monitor.

2. Select the Performance Monitor node under Performance/Monitoring Tools in the tree on the left side.

3. To delete the default counter showing the total CPU time, click the Delete button on the toolbar or press the Delete key on the keyboard.

4. Click the Add (+) button on the toolbar.

5. Expand the Processor counter section, click the % Privileged Time counter, and, while holding down the Ctrl key, click the % User Time counter.

6. Click Add, and then click OK.

7. Open a command prompt and type dir \\%computername%s /s to run a directory

scan of your C drive.

![Figure](figures/Winternals7thPt1_page_043_figure_009.png)

8. When you're finished, close the tool.

---

You can also quickly see this by using Task Manager. Just click the Performance tab, rightclick the CPU graph, and select Show Kernel Times. The CPU usage bar will show kernel-mode CPU time usage in a darker shade of light blue.

To see how the Performance Monitor itself uses kernel time and user time, run it again, but add the individual process counters % User Time and % Privileged Time for every process in the system:

- 1. If it's not already running, run the Performance Monitor again. (If it is already running,
start with a blank display by right-clicking in the graph area and selecting Remove All
Counters.)

2. Click the Add button on the toolbar.

3. In the available counters area, expand the Process section.

4. Select the % Privileged Time and % User Time counters.

5. Select a few processes in the Instance box (such as mmc, csrss, and Idle).

6. Click Add, and then click OK.

7. Move the mouse rapidly back and forth.

8. Press Ctrl+H to turn on highlighting mode. This highlights the currently selected counter
in black.

9. Scroll through the counters at the bottom of the display to identify the processes whose
threads were running when you moved the mouse, and note whether they were running
in user mode or kernel mode.
When you move the mouse, you should see the kernel-mode and user-mode time increase

in the Instance column of the mmc process in the Process Monitor. This is because the process

is executing application code in user mode and calling Windows functions that run in kernel

mode. You'll also notice kernel-mode thread activity in a process named csrs when you move

the mouse. This activity occurs because the Windows subsystem's kernel-mode raw input thread,

which handles keyboard and mouse input, is attached to this process. (See Chapter 2 for more

information about system threads and subsystems). Finally, the Idle process that you see spend ing nearly 100 percent of its time in kernel mode isn't really a process—it's a fake process used to

account for idle CPU cycles. As you can observe from the mode in which the threads in the Idle

process run, when Windows has nothing to do, it does it in kernel mode.

## Hypervisor

Recent shifts in application and software models, such as the introduction of cloud-based services and the pervasiveness of IoT devices, have resulted in the need for operating systems and hardware vendors to figure out more efficient ways to virtualize other OS guests on the host hardware of the machine.

CHAPTER 1   Concepts and tools      27


---

whether to allow for hosting multiple tenants on a server farm and run 100 isolated websites on a single server or to permit developers to test dozens of different OS varieties without buying dedicated hardware. The need for fast, efficient, and secure virtualization has driven new models of computing and reasoning about software. In fact, today, certain software—such as Docker, which is supported in Windows 10 and Server 2016—runs in containers, which provide fully isolated virtual machines solely designed for running a single application stack or framework, pushing the boundaries of a guest/host even further.

To provide such virtualization services, almost all modern solutions employ the use of a hypervisor, which is a specialized and highly privileged component that allows for the virtualization and isolation of all resources on the machine, from virtual to physical memory, to device interrupts, and even to PCI and USB devices. Hyper-V is an example of such a hypervisor, which powers the Hyper-V client functionality exposed in Windows 8.1 and later. Competing products such as Xen, KVM, VMware, and VirtualBox all implement their own hypervisors, each with their own strengths and weaknesses.

Due to its highly privileged nature, and because it has access even greater than the kernel itself, a hypervisor has a distinct advantage that goes beyond merely running multiple guest instances of other operating systems: It can protect and monitor a single host instance to offer assurances and guarantees beyond what the kernel provides. In Windows 10, Microsoft now leverages the Hyper-V hypervisor to provide a new set of services known as virtualization-based security (VBS):

- ■ Device Guard This provides Hypervisor Code Integrity (HCVI) for stronger code-signing
guarantees over KMCS alone, and allows for the customization of the signature policy of the
Windows OS, for both user-mode and kernel-mode code.

■ Hyper Guard This protects key kernel-related and hypervisor-related data structures and
code.

■ Credential Guard This prevents unauthorized access to domain account credentials and
secrets, combined with secure biometrics.

■ Application Guard This provides an even stronger sandbox for the Microsoft Edge browser.

■ Host Guardian and Shielded Fabric These leverage a virtual TPM (v-TPM) to protect a
virtual machine from the infrastructure it's running on.
Additionally, the Hyper-V hypervisor enables certain key kernel mitigations against exploits and

other attackers. The key advantage of all these technologies is that unlike previous kernel-based secu rity improvements, they are not vulnerable to malicious or badly written drivers, regardless of whether

they are signed or not. This makes them highly resilient against today's advanced adversaries. This is

possible due to the hypervisor's implementation of Virtual Trust Levels (VTLs). Because the normal

operating system and its components are in a less privileged mode (VTL 0), but these VBS technolo gies run at VTL 1 (a higher privilege), they cannot be affected even by kernel mode code. As such, code

remains within the realm of the VTL 0 privilege space. In this way, you can think of VTUs as orthogonal

to the processor's privilege levels: kernel and user mode exist within each VTL, and the hypervisor man ages privileges across VTUs. Chapter 2 covers additional details on the hypervisor-assisted architecture,

and Chapter 7 discusses these VBS security mechanisms in detail.

---

## Firmware

Windows components increasingly rely on the security of the operating system and its kernel, and the latter now relies on the protection of the hypervisor. A question arises of what can ensure these components are loaded securely and can authenticate their contents. This is typically the job of the boot loader, but it, too, needs the same level of authenticity checking, creating an increasingly complicated hierarchy of trust.

What, then, provides a root chain of trust that can guarantee an unencumbered boot process? In modern Windows 8 and later systems, this falls under the purview of the system firmware, which must be UEFI-based on certified systems. As part of the UEFI standard, which Windows dictates (UEFI 2.3.1b; see http://www.uefi.org for more information), a secure boot implementation with strong guarantees and requirements around the signature qualities of the boot-related software must be present.

Through this verification process, Windows components are guaranteed to load securely from the very beginning of the boot process. In addition, technologies such as Trusted Platform Module (TPM) can measure the process to provide attestation (both local and remote). Through partnerships with the industry, Microsoft manages the whitelist and blacklist of the UEFI secure boot component in case of boot software errors or compromise, and Windows updates now include firmware updates as well.

Although we won’t talk about firmware again until Chapter 11, “Startup and shutdown,” in Part 2, it’s important now to state its significance in modern Windows architecture, through the guarantees its meant to provide.

## Terminal Services and multiple sessions

Terminal Services refers to the support in Windows for multiple interactive user sessions on a single system. With Windows Terminal Services, a remote user can establish a session on another machine, log in, and run applications on the server. The server transmits the graphical user interface (GUI) to the client (as well as other configurable resources such as audio and clipboard), and the client transmits the user's input back to the server. (Similar to the X Window System, Windows permits running individual applications on a server system with the display remoted to the client instead of remoting the entire desktop.)

The first session is considered the services session, or session zero, and contains system service hosting processes (explained in further detail in Chapter 9 in Part 2). The first login session at the physical console of the machine is session one, and additional sessions can be created through the use of the remote desktop connection program (Mstsc.exe) or through the use of fast user switching.

Windows client editions permit a single remote user to connect to the machine, but if someone is

logged in at the console, the workstation is locked. That is, someone can be using the system either

locally or remotely, but not at the same time. Windows editions that include Windows Media Center

allow one interactive session and up to four Windows Media Center Extender sessions.

Windows server systems support two simultaneous remote connections. This is to facilitate remote management—for example, using management tools that require you to be logged in to the machine being managed. They also support more than two remote sessions if appropriately licensed and configured as a terminal server.

CHAPTER 1 Concepts and tools     29


---

All Windows client editions support multiple sessions, created locally through a feature called fast user switching, that can be used one at a time. When a user chooses to disconnect their session instead of log off (for example, by clicking the Start button, clicking the current user, and choosing Switch Account from the submenu that appears or by holding down the Windows key, pressing L, and then clicking a different user in the bottom-left corner of the screen), the current session—that is, the processes running in that session and all the session-wide data structures that describe the session— remains active in the system and the system returns to the main logon screen (if it's not already there). If a new user logs in, a new session is created.

For applications that want to be aware of running in a terminal server session, there are a set of

Windows APIs for programmatically detecting that as well as for controlling various aspects of Terminal

Services. (See the Windows SDK and the Remote Desktop Services API for details.)

Chapter 2 briefly describes how sessions are created and contains some experiments showing how to view session information with various tools, including the kernel debugger. The "Object manager" section in Chapter 8 in Part 2 describes how the system namespace for objects is instantiated on a per-session basis and how applications that need to be aware of other instances of themselves on the same system can accomplish that. Finally, Chapter 5 covers how the memory manager sets up and manages session-wide data.

## Objects and handles

In the Windows OS, a kernel object is a single, run-time instance of a statically defined object type. An object type comprises a system-defined data type, functions that operate on instances of the data type, and a set of object attributes. If you write Windows applications, you might encounter process, thread, file, and event objects, to name just a few examples. These objects are based on lower-level objects that Windows creates and manages. In Windows, a process is an instance of the process object type, a file is an instance of the file object type, and so on.

An object attribute is a field of data in an object that partially defines the object's state. An object of type process, for example, would have attributes that include the process ID, a base scheduling priority, and a pointer to an access token object. Object methods, the means for manipulating objects, usually read or change object attributes. For example, the open method for a process would accept a process identifier as input and return a pointer to the object as output.

![Figure](figures/Winternals7thPt1_page_047_figure_006.png)

Note There is a parameter named objectAttributes that a caller supplies when creating

an object using the kernel object manager APIs. That parameter shouldn't be confused with

the more general meaning of the term as used in this book, however.

The most fundamental difference between an object and an ordinary data structure is that the

internal structure of an object is opaque. You must call an object service to get data out of or put data

into an object. You can't directly read or change data inside an object. This difference separates the

underlying implementation of the object from code that merely uses it, a technique that allows object

implementations to be changed easily over time.

30 CHAPTER 1 Concepts and tools


---

Objects, through the help of a kernel component called the object manager, provide a convenient means for accomplishing the following four important OS tasks:

- ■ Providing human-readable names for system resources

■ Sharing resources and data among processes

■ Protecting resources from unauthorized access

■ Reference tracking, which allows the system to recognize when an object is no longer in use so

that it can be automatically deallocated
Not all data structures in the Windows OS are objects. Only data that needs to be shared, protected, named, or made visible to user-mode programs (via system services) is placed in objects. Structures used by only one component of the OS to implement internal functions are not objects. Objects and handles (references to objects) are discussed in more detail in Chapter 8 in Part 2.

## Security

Windows was designed from the start to be secure and to meet the requirements of various formal government and industry security ratings, such as the Common Criteria for Information Technology Security Evaluation (CCITSE) specification. Achieving a government-approved security rating allows an OS to compete in that arena. Of course, many of these capabilities are advantageous features for any multiuser system.

The core security capabilities of Windows include:

- ■ Discretionary (need-to-know) and mandatory protection for all shareable system objects, such
as files, directories, processes, threads, and so forth

■ Security auditing for accountability of subjects, or users, and the actions they initiate

■ User authentication at logon

■ The prevention of one user from accessing uninitialized resources, such as free memory or disk
space, that another user has deallocated
Windows has three forms of access control over objects:

- ■ Discretionary access control This is the protection mechanism that most people think of
when they think of OS security. It's the method by which owners of objects (such as files or
printers) grant or deny access to others. When users log in, they are given a set of security
credentials, or a security context. When they attempt to access objects, their security context is
compared to the access control list on the object they are trying to access to determine whether
they have permission to perform the requested operation. With Windows Server 2012 and
Windows 8, this form of discretionary control is further improved by implementing attribute-
based access control (also called Dynamic Access Control). However, a resource's access control
list does not necessarily identify individual users and groups. Instead, it identifies required
CHAPTER 1     Concepts and tools      31


---

attributes or claims that grant access to a resource, such as "Clearance Level: Top Secret" or "Seniority: 10 Years." With the ability to populate such attributes automatically by parsing SQL databases and schemas through Active Directory, this significantly more elegant and flexible security model helps organizations avoid cumbersome manual group management and group hierarchies.

- ■ Privileged access control This is necessary for those times when discretionary access control
is not enough. It's a method of ensuring that someone can get to protected objects if the owner
isn't available. For example, if an employee leaves a company, the administrator needs a way to
gain access to files that might have been accessible only to that employee. In that case, under
Windows, the administrator can take ownership of the file so that they can manage its rights as
necessary.
■ Mandatory integrity control This is required when an additional level of security control is
needed to protect objects that are being accessed from within the same user account. It's used
for everything from providing part of the sandboxing technology for Windows Apps (see the
upcoming discussion), to isolating Protected Mode Internet Explorer (and other browsers) from
a user's configuration, to protecting objects created by an elevated administrator account from
access by a non-elevated administrator account. (See Chapter 7 for more information on User
Account Control.)
Starting with Windows 8, a sandbox called an AppContainer is used to host Windows Apps, which provides isolation with relation to other AppContainers and non-Windows Apps processes. Code in AppContainers can communicate with brokers (non-isolated processes running with the user's credentials) and sometimes other AppContainers or processes through well-defined contracts provided by the Windows Runtime. A canonical example is the Microsoft Edge browser that runs inside an AppContainer and thus provides better protection against malicious code running within its boundaries. Additionally, third-party developers can leverage AppContainers to isolate their own non-Windows Apps applications in similar ways. The AppContainer model forces a significant shift in traditional programming paradigms, moving from the traditional multithreaded single-process application implementation to a multi-process one.

Security pervades the interface of the Windows API. The Windows subsystem implements objectbased security in the same way the OS does: protecting shared Windows objects from unauthorized access by placing Windows security descriptors on them. The first time an application tries to access a shared object, the Windows subsystem verifies the application's right to do so. If the security check succeeds, the Windows subsystem allows the application to proceed.

For a comprehensive description of Windows security, see Chapter 7.

## Registry

If you've worked with Windows operating systems, you've probably heard about or looked at the registry. You can't talk much about Windows internals without referring to the registry because it's the system database that contains the information required to boot and configure the system, systemwide software settings that control the operation of Windows, the security database, and per-user

32    CHAPTER 1  Concepts and tools


---

configuration settings such as which screen saver to use. In addition, the registry provides a window into in-memory volatile data, such as the current hardware state of the system (what device drivers are loaded, the resources they are using, and so on) as well as the Windows performance counters. The performance counters, which aren't actually in the registry, can be accessed through the registry functions (although there is a newer, better API for accessing performance counters). See Chapter 9 in Part 2 for more on how performance counter information is accessed from the registry.

Although many Windows users and administrators will never need to look directly into the registry (because you can view or change most configuration settings with standard administrative utilities), it is still a useful source of Windows internals information because it contains many settings that affect system performance and behavior. You'll find references to individual registry keys throughout this book as they pertain to the component being described. Most registry keys referred to in this book are under the system-wide configuration hive, HKEY_LOCAL_MACHINE, which we'll abbreviate throughout as HKLM.

![Figure](figures/Winternals7thPt1_page_050_figure_002.png)

Caution If you decide to directly change registry settings, you must exercise extreme caution. Any changes might adversely affect system performance or, worse, cause the system to fail to boot successfully.

For further information on the registry and its internal structure, see Chapter 9 in Part 2.

## Unicode

Windows differs from most other operating systems in that most internal text strings are stored and processed as 16-bit-wide Unicode characters (technically UTF-16LE; when Unicode is mentioned in this book it refers to UTF-16LE unless otherwise stated). Unicode is an international character set standard that defines unique values for most of the world's known character sets, and provides 8, 16, and even 32-bit encodings for each character.

Because many applications deal with 8-bit (single-byte) ANSI character strings, many Windows functions that accept string parameters have two entry points: a Unicode (wide, 16-bit) version and an ANSI (narrow, 8-bit) version. If you call the narrow version of a Windows function, there is a slight performance impact as input string parameters are converted to Unicode before being processed by the system and output parameters are converted from Unicode to ANSI before being returned to the application. Thus, if you have an older service or piece of code that you need to run on Windows but this code is written using ANSI character text strings, Windows will convert the ANSI characters into Unicode for its own use. However, Windows never converts the data inside files—it's up to the application to decide whether to store data as Unicode or as ANSI.

Regardless of language, all versions of Windows contain the same functions. Instead of having separate language versions, Windows has a single worldwide binary so that a single installation can support multiple languages (through the addition of various language packs). Applications can also take advantage of Windows functions that allow single worldwide application binaries that can support multiple languages.

CHAPTER 1 Concepts and tools     33


---

![Figure](figures/Winternals7thPt1_page_051_figure_000.png)

Note The old Windows 9x operating systems did not support Unicode natively. This was yet another reason for the creation of two functions for ANSI and Unicode. For example, the Windows API function CreateFile is not a function at all; instead, it's a macro that expands to one of two functions: CreateFile (ANSI) or CreateFile (Unicode, where W stands for wide). The expansion is based on a compilation constant named UNICODE. It's defined by default in Visual Studio C++ projects because it's more beneficial to work with the Unicode functions. However, the explicit function name can be used in lieu of the appropriate macro. This following experiment shows these pairs of functions.

## EXPERIMENT: Viewing exported functions

In this experiment, you'll use the Dependency Walker tool to view exported functions from a Windows subsystem DLL.

- 1. Download Dependency Walker from http://www.dependencywalker.com. If you have a

32-bit system, download the 32-bit version of Download Dependency. Or, if you have

a 64-bit system, download the 64-bit version. Then extract the downloaded ZIP file to a

folder of your choice.

2. Run the tool (depends.exe). Then open the File menu and choose Open, navigate to the

C:\Windows\System32 folder (assuming Windows is installed on your C drive), locate the
kernel32.dll file and click Open.

3. Dependency Walker may show a warning message box. Disregard it and dismiss the

message box.

4. You'll see several views with vertical and horizontal splitter bars. Make sure the item

selected in the top-left tree view is kernel32.dll.

5. Look at the second view from the top on the right side. This view lists the exported

functions available in kernel32.dll. Click the Function list header to sort by name. Then

locate the function CreateFileA. You'll find CreateFileA not much farther down, as

shown here:
![Figure](figures/Winternals7thPt1_page_051_figure_005.png)

34    CHAPTER 1   Concepts and tools


---

- 6. As you can see, most functions that have at least one string type argument are

in fact pairs of functions. In the preceding graphic, the following are visible:

CreateFileMappingA/W, CreateFileTransactedA/W, and CreateFileMappingNumaA/W.

7. You can scroll the list to locate others. You can also open other system files, such as
user32.dll and advapi32.dll.
![Figure](figures/Winternals7thPt1_page_052_figure_001.png)

Note The COM-based APIs in Windows typically use Unicode strings, sometimes typed as BSTR. This is essentially a null-terminated array of Unicode characters with the length of the string in bytes stored 4 bytes before the start of the array of characters in memory. The Windows Runtime APIs use Unicode strings only, typed as HSTRING, which is an immutable array of Unicode characters.

For more information about Unicode, see http://www.unicode.org and the programming documentation in the MSDN Library.

## Digging into Windows internals

Although much of the information in this book is based on reading Windows source code and talking

to developers, you don't have to take everything on faith. Many details about the internals of Windows

can be exposed and demonstrated by using a variety of available tools, such as those that come with

Windows and the Windows debugging tools. These tool packages are briefly described later in this

section.

To encourage your exploration of Windows internals, we've included "Experiment" sidebars throughout the book that describe steps you can take to examine a particular aspect of Windows internal behavior. (You already saw a few of these sidebars earlier in this chapter.) We encourage you to try these experiments so you can see in action many of the internals topics described in this book.

Table 1-4 shows a list of the principal tools used in this book and where they come from.

TABLE 1-4 Tools for viewing Windows internals

<table><tr><td>Tool</td><td>Image Name</td><td>Origin</td></tr><tr><td>Startup Programs Viewer</td><td>AUTORUNS</td><td>Sysinternals</td></tr><tr><td>Access Check</td><td>ACCESSCHK</td><td>Sysinternals</td></tr><tr><td>Dependency Walker</td><td>DEPENDS</td><td>www.dependencywalker.com</td></tr><tr><td>Global Flags</td><td>GFLAGS</td><td>Debugging tools</td></tr><tr><td>Handle Viewer</td><td>HANDLE</td><td>Sysinternals</td></tr></table>


Continues...

CHAPTER 1    Concepts and tools      35


---

TABLE 1-4 Tools for viewing Windows internals (continued)

<table><tr><td>Tool</td><td>Image Name</td><td>Origin</td></tr><tr><td>Kernel debuggers</td><td>WINDBG_KD</td><td>WDK, Windows SDK</td></tr><tr><td>Object Viewer</td><td>WINOBJ</td><td>Sysinternals</td></tr><tr><td>Performance Monitor</td><td>PERFMON_MSC</td><td>Windows built-in tool</td></tr><tr><td>Pool Monitor</td><td>POOLMON</td><td>WDK</td></tr><tr><td>Process Explorer</td><td>PROCEXP</td><td>Sysinternals</td></tr><tr><td>Process Monitor</td><td>PROCMON</td><td>Sysinternals</td></tr><tr><td>Task (Process) List</td><td>TLIST</td><td>Debugging tools</td></tr><tr><td>Task Manager</td><td>TASKMGR</td><td>Windows built-in tool</td></tr></table>


## Performance Monitor and Resource Monitor

We refer to Performance Monitor—which you can access from the Administrative Tools folder in the Control Panel or by typing perfmon in the Run dialog box—throughout this book. Specifically, we focus on Performance Monitor and Resource Monitor.

![Figure](figures/Winternals7thPt1_page_053_figure_004.png)

Note Performance Monitor has three functions: system monitoring, viewing performance counter logs, and setting alerts (by using data collector sets, which also contain performance counter logs and trace and configuration data). For simplicity, when we refer to Performance Monitor, we mean the system-monitoring function within that tool.

Performance Monitor provides more information about how your system is operating than any

other single utility. It includes hundreds of base and extensible counters for various objects. For each

major topic described in this book, a table of the relevant Windows performance counters is included.

Performance Monitor contains a brief description for each counter. T o see the descriptions, select a

counter in the Add Counters window and select the Show Description check box.

Although all the low-level system monitoring we'll do in this book can be done with Performance Monitor, Windows also includes a Resource Monitor utility (accessible from the Start menu or from the Task Manager Performance tab) that shows four primary system resources: CPU, disk, network, and memory. In their basic states, these resources are displayed with the same level of information that you would find in Task Manager. However, they also provide sections that can be expanded for more information. Here's a typical view of Resource Monitor:

---

When expanded, the CPU tab shows information about per-process CPU usage, just like Task Manager. However, it adds a column for average CPU usage, which can give you a better idea of which processes are most active. The CPU tab also includes a separate display of services and their associated CPU usage and average. The service-hosting process is identified by the service group it is hosting. As with Process Explorer, selecting a process (by clicking its associated check box) will display a list of names handled opened by the process, as well as a list of modules (such as DLLs) that are loaded in the process address space. The Search Handles box can also be used to search for which processes have opened a handle to a given named resource.

The Memory tab displays much of the same information that one can obtain with Task Manager, but it is organized for the entire system. A physical memory bar graph displays the current organization of physical memory from either hardware-reserved, in-use, modified, standby, or free memory.


See Chapter 5 for the exact meaning of these terms.

The Disk tab, on the other hand, displays per-file information for I/O in a way that makes it easy to identify the most-accessed, the most-written, or the most-read from files the system. These results can be further filtered down by process.

The Network tab displays the active network connections, the processes that own them, and how much data is going through them. This information makes it possible to see background network activity that might be hard to detect otherwise. In addition, it shows the TCP connections that are active in the system, organized by process, with data such as the remote and local port and address and packet latency. Finally, it displays a list of listening ports by process, allowing an administrator to see which services or applications are currently waiting for connections on a given port. The protocol and firewall policy for each port and process is also shown.

CHAPTER 1 Concepts and tools 37


---

![Figure](figures/Winternals7thPt1_page_055_figure_000.png)

Note All Windows performance counters are accessible programmatically. For more information, search for "performance counters" in the MSDN documentation.

## Kernel debugging

Kernel debugging means examining internal kernel data structures and/or stepping through functions

in the kernel. It is a useful way to investigate Windows internals because you can display internal system

information not available through any other tools and get a clearer idea of code flows within the kernel.

Before describing the various ways in which you can debug the kernel, let's examine a set of files that

you'll need in order to perform any type of kernel debugging.

### Symbols for kernel debugging

Symbol files contain the names of functions and variables and the layout and format of data structures.

They are generated by the linker and used by debuggers to reference and display these names during

a debug session. This information is not usually stored in the binary image because it is not needed to

execute the code. This means binaries are smaller and faster. However, it also means that when debug ging, you must make sure the debugger can access the symbol files associated with the images you are

referencing during a debugging session.

To use any of the kernel-debugging tools to examine internal Windows kernel data structures such as the process list, thread blocks, loaded driver list, memory usage information, and so on, you must have the correct symbol files for at least the kernel image, Ntoskrnl.exe. (You can learn more about this file in the section "Architecture overview" in Chapter 2.) Symbol table files must match the version of the image from which they were taken. For example, if you install a Windows service pack or hot fix that updates the kernel, you must obtain the matching updated symbol files.

While it is possible to download and install symbols for various versions of Windows, updated symbols for hot fixes are not always available. The easiest way to obtain the correct version of symbols for debugging is to employ the Microsoft on-demand symbol server by using a special syntax for the symbol path that you specify in the debugger. For example, the following symbol path causes the debugging tools to load required symbols from the Internet symbol server and keep a local copy in the C:\symbols folder:

```bash
srv*c:\symbols*http://msdl.microsoft.com/download/symbols
```

### Debugging Tools for Windows

The Debugging Tools for Windows package contains advanced debugging tools, which are used in this

book to explore Windows internals. The latest version is included as part of the Windows SDK. (See

https://msdn.microsoft.com/en-us/library/windows/hardware//ff551063.aspx for more details about the

different installation types.) These tools can be used to debug user-mode processes as well as the kernel.

---

There are four debuggers included in the tools: cdb, ntsd, kd, and WinDbg. All are based on a single

debugging engine implemented in DbgEng.dll, which is documented fairly well in the help file for the

tools. Here's a brief overview of the debuggers:

- • cdb and ntsd are user-mode debuggers based on a console user interface. The only difference
between them is that ntsd opens a new console window if activated from an existing console
window, while cdb does not.

• kd is a kernel-mode debugger based on a console user interface.

• WinDbg can be used as a user-mode or kernel-mode debugger, but not both at the same time.
It provides a GUI for the user.

• The user-mode debuggers (cdb, ntsd, and WinDbg, when used as such) are essentially equivalent.
Usage of one or the other is a matter of preference.

• The kernel-mode debuggers (kd and WinDbg, when used as such) are equivalent as well.
User-mode debugging The debugging tools can also be used to attach to a user-mode process and to examine and/or change process memory. There are two options when attaching to a process:

- ■  Invasive  Unless specified otherwise, when you attach to a running process, you use the
DebugActiveProcess Windows function to establish a connection between the debugger and
the debugee. This permits you to examine and/or change process memory, set breakpoints, and
perform other debugging functions. Windows allows you to stop debugging without killing the
target process as long as the debugger is detached, not killed.

■  Noninvasive  With this option, the debugger simply opens the process with the OpenProcess
function. It does not attach to the process as a debugger. This allows you to examine and/or
change memory in the target process, but you cannot set breakpoints. This also means it's
possible to attach noninvasively even if another debugger is attached invasively.
You can also open user-mode process dump files with the debugging tools. User-mode dump files are explained in Chapter 8 in Part 2 in the section on exception dispatching.

Kernel-mode debugging As mentioned, there are two debuggers that can be used for kernel

debugging: a command-line version (Kd.exe) and a GUI version (Windbg.exe). You can perform three

types of kernel debugging with these tools:

- ■ Open a crash dump file created as a result of a Windows system crash. (See Chapter 15, "Crash
dump analysis," in Part 2 for more information on kernel crash dumps.)
■ Connect to a live, running system and examine the system state (or set breakpoints if you're
debugging device driver code). This operation requires two computers: a target (the system
being debugged) and a host (the system running the debugger). The target system can be con-
nected to the host via a null modem cable, an IEEE 1394 cable, a USB 2.0/3.0 debugging cable,
or the local network. The target system must be booted in debugging mode. You can configure
the system to boot in debugging mode using Bcdedit.exe or Msconfig.exe. (Note that you may
CHAPTER 1 Concepts and tools     39


---

have to disable secure boot in the UEFI BIOS settings.) You can also connect through a named pipe—which is useful when debugging Windows 7 or earlier versions through a virtual machine product such as Hyper-V, Virtual Box, or VMware Workstation—by exposing the guest operating system's serial port as a named pipe device. For Windows 8 and later guests, you should instead use local network debugging by exposing a host-only network using a virtual NIC in the guest operating system. This will result in 1000x performance gain.

- ■ Windows systems also allow you to connect to the local system and examine the system state.

This is called local kernel debugging. To initiate local kernel debugging with WinDbg, first make

sure the system is set to debug mode (for example, by running msconfig.exe, clicking the Boot

tab, selecting Advanced Options, selecting Debug, and restarting Windows). Launch WinDbg

with admin privileges and open the File menu, choose Kernel Debug, click the Local tab, and

then click OK (or use bcdedit.exe). Figure 1-6 shows a sample output screen on a 64-bit Windows

10 machine. Some kernel debugger commands do not work when used in local kernel debug-

ging mode, such as setting breakpoints or creating a memory dump with the .dump command.

However, the latter can be done with LiveEd, described later in this section.
![Figure](figures/Winternals7thPt1_page_057_figure_002.png)

FIGURE 1-6 Local kernel debugging

Once connected in kernel-debugging mode, you can use one of the many debugger extension

commands—also known as bang commands, which are commands that begin with an exclamation

point (!)—to display the contents of internal data structures such as threads, processes, I/O request

packets, and memory management information. Throughout this book, the relevant kernel debugger

commands and output are included as they apply to each topic being discussed. An excellent compan ion reference is the Debugger.chm help file, contained in the WinDbg installation folder, which docu ments all the kernel debugger functionality and extensions. In addition, the dt (display type) command

can format more than 1,000 kernel structures because the kernel symbol files for Windows contain type

information that the debugger can use to format structures.

40    CHAPTER 1  Concepts and tools


---

## EXPERIMENT: Displaying type information for kernel structures

To display the list of kernel structures whose type information is included in the kernel symbols, type dt ntl_* in the kernel debugger. A sample partial output is shown here. (ntrknlmp is the internal file name of the 64-bit kernel. For more details, see Chapter 2.)

```bash
!kds- dt ntl*_
    ntkrnn!mp1_KSYSTEM_TIME
    ntkrnn!p1_NT_PRODUCT_TYPE
    ntkrnn!p1_!ALTERNATIVE_ARCHITECTURE_TYPE
    ntkrnn!p1_KUSER_SHARED_DATA
    ntkrnn!p1_!ULARG_INTEGER
    ntkrnn!p1_TP_POOL
    ntkrnn!p1_TP_CLEANUP_GROUP
    ntkrnn!p1_ACTIVATION_CONTEXT
    ntkrnn!p1_TP_CALLBACK_INSTANCE
    ntkrnn!p1_TP_CALLBACK_PRIORITY
    ntkrnn!p1_TP_CALLBACK_ENVIRON_V3
    ntkrnn!p1_TEB
```

You can also use the dt command to search for specific structures by using its wildcard lookup

capability. For example, if you were looking for the structure name for an interrupt object, you

could type dt n!*_interrupt* .

```bash
!kds: dt ntl_interrupt*
        ntkrnnImpl_KINTERRUPT_MODE
        ntkrnnImpl_KINTERRUPT_POLARITY
        ntkrnnImpl_PEP_API_INTERRUPT_RESOURCE
        ntkrnnImpl_KINTERRUPT
        ntkrnnImpl_UNEXPECTED_INTERRUPT
        ntkrnnImpl_INTERRUPT_CONNECTION_DATA
        ntkrnnImpl_INTERRUPT_VECTOR_DATA
        ntkrnnImpl_INTERRUPT_HT_INTR_INFO
        ntkrnnImpl_INTERRUPT_REMAPPING_INFO
```

Then you can use dt to format a specific structure as shown next (the debugger treats structures

as case insensitive):

```bash
!kb>d dt nt!\_KINTERRUPT
  +0x000 Type        : Int2B
  +0x002 Size       : Int2B
  +0x008 InterruptListEntry : _LIST_ENTRY
  +0x018 ServiceRoutine : Ptr64   unsigned char
  +0x020 MessageServiceRoutine : Ptr64   unsigned char
  +0x028 MessageIndex    : Uint4B
  +0x030 ServiceContext : Ptr64 Void
  +0x038 SpinLock      : Uint8B
  +0x040 TickCount    : Uint4B
  +0x048 ActualLock   : Ptr64 Uint8B
  +0x050 DispatchAddress : Ptr64   void
  +0x058 Vector       : Uint4B
  +0x05c Irql        : UChar
```

CHAPTER 1 Concepts and tools     41


---

```bash
+0x05d SynchronizeIrq1  : UChar
+0x05e FloatingSave  : UChar
+0x05f Connected      : UChar
+0x060 Number        : Uint4B
+0x064 ShareVector    : UChar
+0x065 TemplateActiveBoth : UChar
+0x066 ActiveCount     : Uint2B
+0x068 InternalState   : Int4B
+0x06c Mode             : _KINTERRUPT_MODE
+0x070 Polarity       : _KINTERRUPT_POLARITY
+0x074 ServiceCount   : Uint4B
+0x078 DispatchCount : Uint4B
+0x080 PassiveEvent   : Ptr64 _KEVENT
+0x088 TrapFrame      : Ptr64 _KTRAP_FRAME
+0x090 DisconnectData : Ptr64 Void
+0x098 ServiceThread  : Ptr64 _CTHREAD
+0x0a0 ConnectionData : Ptr64 _INTERRUPT_CONNECTION_DATA
+0x0a8 IsrDpcEntry  : Ptr64 Void
+0x0b0 IsrDpcStats    : _ISRDPCSTATS
+0x0f0 RedirectObject : Ptr64 Void
+0x0f8 Padding       : [8] UChar
```

Note that dt does not show substructures (structures within structures) by default. To show substructures, use the -r or -b switches. For example, using one of these switches to display the kernel interrupt object shows the format of the _LIST_ENTRY structure stored in the InterruptListEntry field. (See the documentation for the exact differences between the -r and -b switches.)

```bash
!Id> dt nt!\_KINTERRUPT -r
    +0x000 Type        : Int28
    +0x002 Size        : Int28
    +0x008 InterruptListEntry : _LIST_ENTRY
        +0x000 Flnk        :  Ptr64._LIST_ENTRY
        +0x000 Flnk        :  Ptr64._LIST_ENTRY
        +0x008 Blink       :  Ptr64._LIST_ENTRY
        +0x008 Blink       :  Ptr64._LIST_ENTRY
        +0x000 Flnk        :  Ptr64._LIST_ENTRY
        +0x008 Blink        :  Ptr64._LIST_ENTRY
    +0x018 ServiceRoutine  :  Ptr64      unsigned char
```

The dt command even lets you specify the level of recursion of structures by appending a number

to the -r switch. The following example means one level of recursion:

```bash
!kd> dt nt!_KINTERRUPT -r1
```

The Debugging T ools for Windows help file explains how to set up and use kernel debuggers. For

additional details on using kernel debuggers aimed primarily at device-driver writers, see the WDK

documentation.

42      CHAPTER 1   Concepts and tools


---

### LiveKd tool

LiveKd is a free tool from Sysinternals that enables you to use the standard Microsoft kernel debuggers just described to examine the running system without booting the system in debugging mode. This approach might be useful when kernel-level troubleshooting is required on a machine that wasn't booted in debugging mode. Certain issues might be hard to reproduce reliably, so a reboot with the debug option enabled might not readily exhibit the error.

You run LiveKd just as you would WinDbg or kd. LiveKd passes any command-line options you

specify to the debugger you select. By default, LiveKd runs the command-line kernel debugger (kd).

To have it run WinDbg, use the -w switch. T o see the help files for LiveKd switches, use the -7 switch.

LiveKd presents a simulated crash dump file to the debugger so you can perform any operations

in LiveKd that are supported on a crash dump. Because LiveKd relies on physical memory to back the

simulated dump, the kernel debugger might run into situations in which data structures are in the middle

of being changed by the system and are inconsistent. Each time the debugger is launched, it starts with

a fresh view of the system state. If you want to refresh the snapshot, enter the q command to quit the

debugger. LiveKd will ask you whether you want to start it again. If the debugger enters a loop in printing

output, press Ctrl+C to interrupt the output and quit. If it hangs, press Ctrl+Break, which will terminate

the debugger process. LiveKd will then ask you whether you want to run the debugger again.

## Windows Software Development Kit

The Windows Software Development Kit (SDK) is available as part of the MSDN subscription program. You can also download it for free from https://developer.microsoft.com/en-US/windows/downloads/ windows-10-sdk. Visual Studio also provides the option of installing the SDK as part of VS installation. The versions contained in the Windows SDK always match the latest version of the Windows operating system, whereas the version that comes with Visual Studio might be an older version that was current when that version was released. Besides the Debugging Tools for Windows, it contains the C header files and the libraries necessary to compile and link Windows applications. From a Windows internals perspective, items of interest in the Windows SDK include the Windows API header files—for example, C:\Program Files (x86)\Windows Kits10\include—and the SDK tools (search for the Bin folder). Also of interest is the documentation. It's available online or can be downloaded for offline access. A few of these tools are also shipped as sample source code in both the Windows SDK and the MSDN Library.

## Windows Driver Kit

The Windows Driver Kit (WDK) is also available through the MSDN subscription program. Just like the Windows SDK, it is available for free download. The WDK documentation is included in the MSDN Library.

Although the WDK is aimed at developers of device drivers, it is an abundant source of Windows internals information. For example, although Chapter 6 describes the I/O system architecture, driver model, and basic device driver data structures, it does not describe the individual kernel support functions in detail. The WDK documentation contains a comprehensive description of all the Windows kernel support functions and mechanisms used by device drivers in both tutorial and reference form.

CHAPTER 1 Concepts and tools     43


---

In addition to including the documentation, the WDK contains header files (in particular, ntdk.h,

ntfs.h, and wdm.h) that define key internal data structures and constants as well as interfaces to many

internal system routines. These files are useful when exploring Windows internal data structures with

the kernel debugger because although the general layout and content of these structures are shown in

this book, detailed field-level descriptions (such as size and data types) are not. A number of these data

structures—such as object dispatcher headers, wait blocks, events, mutants, semaphores, and so on—

are, however, fully described in the WDK.

If you want to dig into the I/O system and driver model beyond what is presented in this book, read the WDK documentation—especially the Kernel-Mode Driver Architecture Design Guide and KernelMode Driver Reference manuals. You might also find useful Programming the Microsoft Windows Driver Model, Second Edition by Walter Oney (Microsoft Press, 2002) and Developing Drivers with the Windows Driver Foundation by Penny Orwick and Guy Smith (Microsoft Press, 2007).

## Sysinternals tools

Many experiments in this book use freeware tools that you can download from Sysinternals. Mark Russinovich, coauthor of this book, wrote most of these tools. The most popular tools include Process Explorer and Process Monitor. Note that many of these utilities involve the installation and execution of kernel-mode device drivers and thus require administrator, or elevated, privileges—although some of them can run with limited functionality and output on a standard, or non-elevated, user account.

Because the Sysinternals tools are updated frequently, be make sure you have the latest version.

To be notified of tool updates, you can follow the Sysinternals Site Blog (which has an RSS feed). For a

description of all the tools, a description of how to use them, and case studies of problems solved, see

Windows Sysinternals Administrator’s Reference by Mark Russinovich and Aaron Margosis (Microsoft

Press, 2011). For questions and discussions on the tools, use the Sysinternals Forums.

## Conclusion

This chapter introduced key Windows technical concepts and terms that will be used throughout the

book. It also offered a glimpse of the many useful tools available for digging into Windows internals.

Now you're ready to begin your exploration of the internal design of the system, beginning with an

overall view of the system architecture and its key components.

---

