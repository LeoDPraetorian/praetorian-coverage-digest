
To improve the system startup time, Windows 8 introduced a new feature called Fast Startup (also known as hybrid boot). In previous Windows editions, if the hardware supported the S4 system powerstate (see Chapter 6. of Part 1 for further details about the power manager), Windows allowed the user to put the system in Hibernation mode. To properly understand Fast Startup, a complete description of the Hibernation process is needed.

---

When a user or an application calls SetSuspendState API, a worker item is sent to the power manager. The worker item contains all the information needed by the kernel to initialize the power state transition. The power manager informs the prefetcher of the outstanding hibernation request and waits for all its pending I/Os to complete. It then calls the NSetSystemPowerState kernel API.

NtSetSystemPowerState is the key function that orchestrates the entire hibernation process. The routine checks that the caller token includes the Shutdown privilege, synchronizes with the Plug and Play manager, Registry, and power manager (in this way there is no risk that any other transactions could interfere in the meantime), and cycles against all the loaded drivers, sending an IRP_MIN_QUERY_ POWER hrp to each of them. In this way the power manager informs each driver that a power operation is started, so the driver's devices must not start any more I/O operations or take any other action that would prevent the successful completion of the hibernation process. If one of the requests fails (perhaps a driver is in the middle of an important I/O), the procedure is aborted.

The power manager uses an internal routine that modifies the system boot configuration data (BCD) to enable the Windows Resume boot application, which, as the name implies, attempts to resume the system after the hibernation. (For further details, see the section "The Windows Boot Manager" earlier in this chapter). The power manager:

- ■ Opens the BCD object used to boot the system and reads the associated Windows Resume
application GUID (stored in a special unnamed BCD element that has the value 0x23000003).
■ Searches the Resume object in the BCD store, opens it, and checks its description. Writes the
device and path BCD elements, linking them to the \Windows\System32\winresume.efi file lo-
cated in the boot disk, and propagates the boot settings from the main system BCD object (like
the boot debugger options). Finally, it adds the hibernation file path and device descriptor into
filepath and filedevice BCD elements.
■ Updates the root Boot Manager BCD object: writes the resumebject BCD element with the
GUID of the discovered Windows Resume boot application, sets the resume element to 1, and, in
case the hibernation is used for Fast Startup, sets the hibernboot element to 1.
Next, the power manager flushes the BCD data to disk, calculates all the physical memory ranges

that need to be written into the hibernation file (a complex operation not described here), and sends a

new power IRP to each driver (IRP_MN_SET_POWER function). This time the drivers must put their de vice to sleep and don't have the chance to fail the request and stop the hibernation process. The system

is now ready to hibernate, so the power manager starts a "sleeper" thread that has the sole purpose of

powering the machine down. It then waits for an event that will be signaled only when the resume is

completed (and the system is restarted by the user).

The sleeper thread halts all the CPUs (through DPC routines) except its own, captures the system

time, disables interrupts, and saves the CPU state. It finally invokes the power state handler routine

(implemented in the HAL), which executes the ACPI machine code needed to put the entire system to

sleep and calls the routine that actually writes all the physical memory pages to disk. The sleeper thread

uses the crash dump storage driver to emit the needed low-level disk I/Os for writing the data in the

hibernation file.

CHAPTER 12   Startup and shutdown      841


---

The Windows Boot Manager, in its earlier boot stages, recognizes the resume BCD element (stored in the Boot Manager BCD descriptor), opens the Windows Resume boot application BCD object, and reads the saved hibernation data. Finally, it transfers the execution to the Windows Resume boot application (Winresume.efi). HbMain, the entry point routine of Winresume, reinitializes the boot library and performs different checks on the hibernation file:

- • Verifies that the file has been written by the same executing processor architecture

• Checks whether a valid page file exists and has the correct size

• Checks whether the firmware has reported some hardware configuration changes (through the
FADT and FACS ACPI tables)

• Checks the hibernation file integrity
If one of these checks fails, Winresume ends the execution and returns control to the Boot Manager, which discards the hibernation file and restarts a standard cold boot. On the other hand, if all the previous checks pass, Winresume reads the hibernation file (using the UEFI boot library) and restores all the saved physical pages contents. Next, it rebuilds the needed page tables and memory data structures, copies the needed information to the OS context, and finally transfers the execution to the Windows kernel, restoring the original CPU context. The Windows kernel code restarts from the same power manager sleeper thread that originally hibernated the system. The power manager reenables interrupts and thaws all the other system CPUs. It then updates the system time, reading it from the CMOS, reabs all the system timers (and watchdogs), and sends another IRP_MN_SET_POWER Irp to each system driver, asking them to restart their devices. It finally restarts the prefetcher and sends it the boot loader log for further processing. The system is now fully functional; the system power state is S0 (fully on).

Fast Startup is a technology that's implemented using hibernation. When an application passes

the EWX_HYBRID_SHUTDOWN flag to the ExitWindowsEx API or when a user clicks the Shutdown

start menu button, if the system supports the S4 (hibernation) power state and has a hibernation file

enabled, it starts a hybrid shutdown. After Csrss has switched off all the interactive session processes,

session 0 services, and COM servers (see the "Shutdown" section for all the details about the actual

shutdown process), Winlogon detects that the shutdown request has the Hybrid flag set, and, instead

of waking up the shutdown code of Winnt, it goes into a different route. The new Winlogon state

uses the NtPowerInformation system API to switch off the monitor, it next informs LogonUI about the

outstanding hybrid shutdown, and finally calls the NtInitializePowerAction API, asking for a system

hibernation. The procedure from now on is the same as the system hibernation.

---

## EXPERIMENT: Understanding hybrid shutdown

You can see the effects of a hybrid shutdown by manually mounting the BCD store after the system has been switched off, using an external OS. First, make sure that your system has Fast Startup enabled. To do this, type Control Panel in the Start menu search box, select System and Security, and then select Power Options. After clicking Choose What The Power Button does, located in the upper-left side of the Power Options window, the following screen should appear:

![Figure](figures/Winternals7thPt2_page_874_figure_002.png)

As shown in the figure, make sure that the Turn On Fast Startup option is selected.

Otherwise, your system will perform a standard shutdown. You can shut down your workstation

using the power button located in the left side of the Start menu. Before the computer shuts

down, you should insert a DVD or USB flash drive that contains the external OS (a copy of a live

Linux should work well). For this experiment, you can't use the Windows Setup Program (or any

WinRE based environments) because the setup procedure clears all the hibernation data before

mounting the system volume.

CHAPTER 12 Startup and shutdown    843


---

When you switch on the workstation, perform the boot from an external DVD or USB drive.

This procedure varies between different PC manufacturers and usually requires accessing the

BIOS interface. For instructions on accessing the BIOS and performing the boot from an external

drive, check your workstation's user manual. (For example, in the Surface Pro and Surface Book

laptops, usually it's sufficient to press and hold the Volume Up button before pushing and releas ing the Power button for entering the BIOS configuration.) When the new OS is ready, mount

the main UEFI system partition with a partitioning tool (depending on the OS type). We don't

describe this procedure. After the system partition has been correctly mounted, copy the system

Boot Configuration Data file, located in EFI\Microsoft\Boot\BCD, to an external drive (or in the

same USB flash drive used for booting). Then you can restart your PC and wait for Windows to

resume from hibernation.

After your PC restarts, run the Registry Editor and open the root HKEY_LOCAL_MACHINE registry key. Then from the File menu, select Load Hive. Browse for your saved BCD file, select Open, and assign the BCD key name for the new loaded hive. Now you should identify the main Boot Manager BCD object. In all Windows systems, this root BCD object has the {9DEA862C5CDD-4E70-ACC1-F32834D4D795} GUID. Open the relative key and its Elements subkey. If the system has been correctly switched off with a hybrid shutdown, you should see the resume and hiberboot BCD elements (the corresponding keys names are 26000005 and 26000025; see Table 12-2 for further details) with their Element registry value set to 1.

To properly locate the BCD element that corresponds to your Windows Installation, use the displayorder element (key named 24000001), which lists all the installed OS boot entries. In the Element registry value, there is a list of all the GUIDs of the BCD objects that describe the installed operating systems loaders. Check the BCD object that describes the Windows Resume application, reading the GUID value of the resumeobject BCD element (which corresponds to the 23000006 key). The BCD object with this GUID includes the hibernation file path into the filepath element, which corresponds to the key named 22000002.

![Figure](figures/Winternals7thPt2_page_875_figure_003.png)

844      CHAPTER 12  Startup and shutdown


---

## Windows Recovery Environment (WinRE)

The Windows Recovery Environment provides an assortment of tools and automated repair technologies to fix the most common startup problems. It includes six main tools:

- ■ System Restore Allows restoring to a previous restore point in cases in which you can't boot
the Windows installation to do so, even in safe mode.
■ System Image Recover Called Complete PC Restore or Automated System Recovery (ASR) in
previous versions of Windows, this restores a Windows installation from a complete backup, not
just from a system restore point, which might not contain all damaged files and lost data.
■ Startup Repair An automated tool that detects the most common Windows startup prob-
lems and automatically attempts to repair them.
■ PC Reset A tool that removes all the applications and drivers that don't belong to the stan-
dard Windows installation, restores all the settings to their default, and brings back Windows to
its original state after the installation. The user can choose to maintain all personal data files or
remove everything. In the latter case, Windows will be automatically reinstalled from scratch.
■ Command Prompt For cases where troubleshooting or repair requires manual intervention
(such as copying files from another drive or manipulating the BCD), you can use the command
prompt to have a full Windows shell that can launch almost any Windows program (as long as
the required dependencies can be satisfied)—unlike the Recovery Console on earlier versions of
Windows, which only supported a limited set of specialized commands.
■ Windows Memory Diagnostic Tool Performs memory diagnostic tests that check for signs
of faulty RAM. Faulty RAM can be the reason for random kernel and application crashes and
erratic system behavior.
When you boot a system from the Windows DVD or boot disks, Windows Setup gives you the choice of installing Windows or repairing an existing installation. If you choose to repair an installation, the system displays a screen similar to the modern boot menu (shown in Figure 12-15), which provides different choices.

The user can select to boot from another device, use a different OS (if correctly registered in the

system BCD store), or choose a recovery tool. All the described recovery tools (except for the Memory

Diagnostic Tool) are located in the Troubleshoot section.

The Windows setup application also installs WinRE to a recovery partition on a clean system installation. You can access WinRE by keeping the Shift key pressed when rebooting the computer through the relative shutdown button located in the Start menu. If the system uses the Legacy Boot menu, WinRE can be started using the F8 key to access advanced boot options during Bootmgr execution. If you see the Repair Your Computer option, your machine has a local hard disk copy. Additionally, if your system failed to boot as the result of damaged files or for any other reason that Winload can understand, it instructs Bootmgr to automatically start WinRE at the next reboot cycle. Instead of the dialog box shown in Figure 12-15, the recovery environment automatically launches the Startup Repair tool, shown in Figure 12-16.

CHAPTER 12 Startup and shutdown 845


---

![Figure](figures/Winternals7thPt2_page_877_figure_000.png)

FIGURE 12-15 The Windows Recovery Environment startup screen.

![Figure](figures/Winternals7thPt2_page_877_figure_002.png)

FIGURE 12-16 The Startup Recovery tool.

At the end of the scan and repair cycle, the tool automatically attempts to fix any damage found, including replacing system files from the installation media. If the Startup Repair tool cannot automatically fix the damage, you get a chance to try other methods, and the System Recovery Options dialog box is displayed again.

The Windows Memory Diagnostics Tool can be launched from a working system or from a

Command Prompt opened in WinRE using the mdsched.exe executable. The tool asks the user if they

want to reboot the computer to run the test. If the system uses the Legacy Boot menu, the Memory

Diagnostics Tool can be executed using the Tab key to navigate to the T ools section.

846      CHAPTER 12   Startup and shutdown


---

## Safe mode

Perhaps the most common reason Windows systems become unbootable is that a device driver crashes the machine during the boot sequence. Because software or hardware configurations can change over time, latent bugs can surface in drivers at any time. Windows offers a way for an administrator to attack the problem: booting in safe mode. Safe mode is a boot configuration that consists of the minimal set of device drivers and services. By relying on only the drivers and services that are necessary for booting, Windows avoids loading third-party and other nonessential drivers that might crash.

There are different ways to enter safe mode:

- ■ Boot the system in WinRE and select Startup Settings in the Advanced options (see
Figure 12-17).
![Figure](figures/Winternals7thPt2_page_878_figure_004.png)

FIGURE 12-17 The Startup Settings screen, in which the user can select three different kinds of safe mode.

- ■ In multi-boot environments, select Change Defaults Or Choose Other Options in the modern

boot menu and go to the Troubleshoot section to select the Startup Settings button as in the

previous case.
■ If your system uses the Legacy Boot menu, press the F8 key to enter the Advanced Boot

Options menu.
---

You typically choose from three safe-mode variations: Safe mode, Safe mode with networking, and Safe mode with command prompt. Standard safe mode includes the minimum number of device drivers and services necessary to boot successfully. Networking-enabled safe mode adds network drivers and services to the drivers and services that standard safe mode includes. Finally, safe mode with command prompt is identical to standard safe mode except that Windows runs the Command Prompt application (Cmd.exe) instead of Windows Explorer as the shell when the system enables GUI mode.

Windows includes a fourth safe mode—Directory Services Restore mode—which is different from the standard and networking-enabled safe modes. You use Directory Services Restore mode to boot the system into a mode where the Active Directory service of a domain controller is offline and unopened. This allows you to perform repair operations on the database or restore it from backup media. All drivers and services, with the exception of the Active Directory service, load during a Directory Services Restore mode boot. In cases when you can't log on to a system because of Active Directory database corruption, this mode enables you to repair the corruption.

## Driver loading in safe mode

How does Windows know which device drivers and services are part of standard and networkingenabled safe mode? The answer lies in the HLKMSYSTEM\CurrentControlSet\ControlSafeBoot registry key. This key contains the Minimal and Network subkeys. Each subkey contains more subkeys that specify the names of device drivers or services or of groups of drivers. For example, the BasicDisplay.sys subkey identifies the Basic display device driver that the startup configuration includes. The Basic display driver provides basic graphics services for any PC-compatible display adapter. The system uses this driver as the safe-mode display driver in lieu of a driver that might take advantage of an adapter's advanced hardware features but that might also prevent the system from booting. Each subkey under the SafeBoot key has a default value that describes what the subkey identifies; the BasicDisplay.sys subkey's default value is Driver.

The Boot file system subkey has as its default value Driver Group. When developers design a device driver's installation script (.inf file), they can specify that the device driver belongs to a driver group. The driver groups that a system defines are listed in the List value of the HKLM\SYSTEM\CurrentControlSet\ Control\ServiceGroupOrder key. A developer specifies a driver as a member of a group to indicate to Windows at what point during the boot process the driver should start. The ServiceGroupOrder key's primary purpose is to define the order in which driver groups load; some driver types must load either before or after other driver types. The Group value beneath a driver's configuration registry key associates the driver with a group.

Driver and service configuration keys reside beneath HKLM\SYSTEM\CurrentControlSet\Services. If you look under this key, you'll find the BasicDisplay key for the basic display device driver, which you can see in the registry is a member of the Video group. Any file system drivers that Windows requires for access to the Windows system drive are automatically loaded as if part of the Boot file system group. Other file system drivers are part of the File System group, which the standard and networkingenabled safe-mode configurations also include.

When you boot into a safe-mode configuration, the boot loader (Winload) passes an associated switch to the kernel (Nosknl.exe) as a command-line parameter, along with any switches you've specified in the

---

BCD for the installation you're booting. If you boot into any safe mode, Winload sets the safeboot BCD option with a value describing the type of safe mode you select. For standard safe mode, Winload sets minimal, and for networking-enabled safe mode, it adds network. Winload adds minimal and sets alternateshell for safe mode with command prompt and dseapair for Directory Services Restore mode.

![Figure](figures/Winternals7thPt2_page_880_figure_001.png)

Note An exception exists regarding the drivers that safe mode excludes from a boot.

Winload, rather than the kernel, loads any drivers with a Start value of 0 in their registry key,

which specifies loading the drivers at boot time. Winload doesn’t check the SafeBoot registry

key because it assumes that any driver with a Start value of 0 is required for the system to

boot successfully. Because Winload does not check the SafeBoot registry key to identify which

drivers to load, Winload loads all boot-start drivers (and later Ntskrnl starts them).

The Windows kernel scans the boot parameters in search of the safe-mode switches at the end of

phase 1 of the boot process (Phase1InitializationDiscard, see the "Kernel initialization phase 1" section

earlier in this chapter), and sets the internal variable InitSafeBootMode to a value that reflects the switches

it finds. During the InitSafeBoot function, the kernel writes the InitSafeBootMode value to the registry

value HKLM\SYSTEM\CurrentControlSet\Control\SafeBoot\Option\OptionValue so that user-mode

components, such as the SCM, can determine what boot mode the system is in. In addition, if the system

is booting in safe mode with command prompt, the kernel sets the HKLM\SYSTEM\CurrentControlSet\

Control\SafeBoot\Option\UseAlternateShell value to 1. The kernel records the parameters that Winload

passes to it in the value HKLM\SYSTEM\CurrentControlSet\Control\SystemStartOptions.

When the I/O manager kernel subsystem loads device drivers that HKLM\SYSTEM\CurrentControlSet\ Services specifies, the /O manager executes the function IopLoadDriver. When the Plug and Play manger detects a new device and wants to dynamically load the device driver for the detected device, the Plug and Play manager executes the function PpiCallDriverAddDevice. Both these functions call the function IopSafebootDriverLoad before they load the driver in question. IopSafebootDriverLoad checks the value of InitSafeBootMode and determines whether the driver should load. For example, if the system boots in standard safe mode, IopSafebootDriverLoad looks for the driver's group, if the driver has one, under the Minimal subkey. If IopSafebootDriverLoad finds the driver's group listed, IopSafebootDriverLoad indicates to its caller that the driver can load. Otherwise, IopSafebootDriverLoad looks for the driver's name under the Minimal subkey. If the driver's name is listed as a subkey, the driver can load. If IopSafebootDriverLoad can't find the driver group or driver name subkeys, the driver will not be loaded. If the system boots in networking-enabled safe mode, IopSafebootDriverLoad performs the searches on the Network subkey. If the system doesn't boot in safe mode, IopSafebootDriverLoad lets all drivers load.

## Safe-mode-aware user programs

When the SCM user-mode component (which Services.exe implements) initializes during the

boot process, the SCM checks the value of HKLM\SYSTEM\CurrentControlSet\ControlSafeBoot\

Option\OptionValue to determine whether the system is performing a safe-mode boot. If so, the SCM

mirrors the actions of IosSafebootDriverLoad. Although the SCM processes the services listed under

HKLM\SYSTEM\CurrentControlSet\Services, it loads only services that the appropriate safe-mode

CHAPTER 12   Startup and shutdown     849


---

subkey specifies by name. You can find more information on the SCM initialization process in the section "Services" in Chapter 10.

Userinit, the component that initializes a user's environment when the user logs on (%SystemRoot%\System32\UserInit.exe), is another user-mode component that needs to know whether the system is booting in safe mode. It checks the value of HKLM\SYSTEM\CurrentControlSet\Control\SafeBoot\Option\UseAlternateShell. If this value is set, Userinit runs the program specified as the user's shell in the value HKLM\SYSTEM\CurrentControlSet\Control\SafeBoot\AlternateShell rather than executing Explorer.exe. Windows writes the program name Cmd.exe to the AlternateShell value during installation, making the Windows command prompt the default shell for safe mode with command prompt. Even though the command prompt is the shell, you can type Explorer.exe at the command prompt to start Windows Explorer, and you can run any other GUI program from the command prompt as well.

How does an application determine whether the system is booting in safe mode? By calling the Windows GetSystemMetrics(SM_CLEANBOOT) function. Batch scripts that need to perform certain operations when the system boots in safe mode look for the SAFEBOOT_OPTION environment variable because the system defines this environment variable only when booting in safe mode.

## Boot status file

Windows uses a boot status file (%SystemRoot%\Bootstat.dat) to record the fact that it has progressed through various stages of the system life cycle, including boot and shutdown. This allows the Boot Manager, Windows loader, and Startup Repair tool to detect abnormal shutdown or a failure to shut down cleanly and offer the user recovery and diagnostic boot options, like the Windows Recovery environment. This binary file contains information through which the system reports the success of the following phases of the system life cycle:

- ■ Boot

■ Shutdown and hybrid shutdown

■ Resume from hibernate or suspend
The boot status file also indicates whether a problem was detected the last time the user attempted to boot the operating system and the recovery options shown, indicating that the user has been made aware of the problem and taken action. Runtime Library APIs (Rtl) in Ndisll.dll contain the private interfaces that Windows uses to read from and write to the file. Like the BCD, it cannot be edited by users.

## Conclusion

In this chapter, we examined the detailed steps involved in starting and shutting down Windows (both normally and in error cases). A lot of new security technologies have been designed and implemented with the goal of keeping the system safe even in its earlier startup stages and rendering it immune from a variety of external attacks. We examined the overall structure of Windows and the core system mechanisms that get the system going, keep it running, and eventually shut it down, even in a fast way.

---

## APPENDIX  Contents of Windows Internals, Seventh Edition, Part 1

Introduction......xi

Chapter 1 Concepts and tools......1 Windows operating system versions......1 Windows 10 and future Windows versions......3 Windows 10 and OneCore......3 Foundation concepts and terms......4 Windows API......4 Services, functions, and routines......7 Processes......8 Threads......18 Jobs......20 Virtual memory......21 Kernel mode vs. user mode......23 Hypervisor......27 Firmware......29 Terminal Services and multiple sessions......29 Objects and handles......30 Security......31 Registry......32 Unicode......33 Digging into Windows internals......35 Performance Monitor and Resource Monitor......36 Kernel debugging......38 Windows Software Development Kit.......43 Windows Driver Kit......43 Sysinternals tools......44 Conclusion......44

851


---

Chapter 2 System architecture......45 Requirements and design goals......45 Operating system model......46 Architecture overview......47 Portability......50 Symmetric multiprocessing......51 Scalability......53 Differences between client and server versions......54 Checked build......57 Virtualization-based security architecture overview......59 Key system components......61 Environment subsystems and subsystem DLLs......62 Other subsystems......68 Executive......72 Kernel......75 Hardware abstraction layer......79 Device drivers......82 System processes......88 Conclusion......99

Chapter 3 Processes and jobs......101 Creating a process......101 CreateProcess* functions arguments......102 Creating Windows modern processes.......103 Creating other kinds of processes......104 Process internals......105 Protected processes......113 Protected Process Light (PPL)......115 Third-party PPL support......119 Minimal and Pico processes......120 Minimal processes......120 Pico processes......121 Trustlets (secure processes)......123 Trustlet structure......123

852     Contents of Windows Internals, Part 1, 7th Edition


---

Trustlet policy metadata......124 Trustlet attributes......125 System built-in Trustlets......125 Trustlet identity......126 Isolated user-mode services......127 Trustlet-accessible system calls......128 Flow of CreateProcess......129 Stage 1: Converting and validating parameters and flags......131 Stage 2: Opening the image to be executed......135 Stage 3: Creating the Windows executive process object......138 Stage 4: Creating the initial thread and its stack and context......144 Stage 5: Performing Windows subsystem-specific initialization......146 Stage 6: Starting execution of the initial thread......148 Stage 7: Performing process initialization in the context of the new process......148 Terminating a process......154 Image loader......155 Early process initialization......157 DLL name resolution and redirection......160 Loaded module database......164 Import parsing......168 Post-import process initialization......170 SwitchBack......171 API Sets......173 Jobs......176 Job limits......177 Working with a job......178 Nested jobs......179 Windows containers (server silos)......183 Conclusion......191

Chapter 4 Threads......193 Creating threads......193 Thread internals......194

Contents of Windows Internals, Part 1, 7th Edition     853


---

Data structures......194 Birth of a thread......206 Examining thread activity......207 Limitations on protected process threads......212 Thread scheduling......214 Overview of Windows scheduling......214 Priority levels......215 Thread states......223 Dispatcher database......228 Quantum......231 Priority boosts......238 Context switching......255 Scheduling scenarios......256 Idle threads......260 Thread suspension......264 (Deep) freeze......264 Thread selection......266 Multiprocessor systems......268 Thread selection on multiprocessor systems......283 Processor selection......284 Heterogeneous scheduling (big LITTLE)......286 Group-based scheduling......287 Dynamic fair share scheduling......289 CPU rate limits......292 Dynamic processor addition and replacement......295 Worker factories (thread pools)......297 Worker factory creation......298 Conclusion......300

Chapter 5 Memory management......301 Introduction to the memory manager......301 Memory manager components......302 Large and small pages......303 Examining memory usage......305

854      Contents of Windows Internals, Part 1, 7th Edition


---

Internal synchronization......308 Services provided by the memory manager......309 Page states and memory allocations......310 Commit charge and commit limit......313 Locking memory......314 Allocation granularity......314 Shared memory and mapped files......315 Protecting memory......317 Data Execution Prevention......319 Copy-on-write......321 Address Windowing Extensions......323 Kernel-mode heaps (system memory pools)......324 Pool sizes......325 Monitoring pool usage......327 Look-aside lists......331 Heap manager......332 Process heaps......333 Heap types......334 The NT heap......334 Heap synchronization......334 The low-fragmentation heap......335 The segment heap......336 Heap security features......341 Heap debugging features......342 Pageheap......343 Fault-tolerant heap......347 Virtual address space layouts......348 x86 address space layouts......349 x86 system address space layout......352 x86 session space......353 System page table entries......355 ARM address space layout......356 64-bit address space layout......357 x64 virtual addressing limitations......359 Dynamic system virtual address space management......359

Contents of Windows Internals, Part 1, 7th Edition     855


---

System virtual address space quotas......364 User address space layout......365 Address translation......371 x86 virtual address translation......371 Translation look-aside buffer......377 x64 virtual address translation......380 ARM virtual address translation......381 Page fault handling......383 Invalid PTEs......384 Prototype PTEs......385 In-paging I/O......386 Collided page faults......387 Clustered page faults......387 Page files......389 Commit charge and the system commit limit......394 Commit charge and page file size......397 Stacks......398 User stacks......399 Kernel stacks......400 DPC stack......401 Virtual address descriptors......401 Process VADs......402 Rotate VADs......403 NUMA......404 Section objects......405 Working sets......412 Demand paging......413 Logical prefetcher and ReadyBoot......413 Placement policy......416 Working set management......417 Balance set manager and swapper......421 System working sets......422 Memory notification events......423

856     Contents of Windows Internals, Part 1, 7th Edition


---

Page frame number database......425 Page list dynamics......428 Page priority......436 Modified page writer and mapped page writer......438 PFN data structures......440 Page file reservation......443 Physical memory limits......446 Windows client memory limits......447 Memory compression......449 Compression illustration......450 Compression architecture......453 Memory partitions......456 Memory combining......459 The search phase......460 The classification phase......461 The page combining phase......462 From private to shared PTE......462 Combined pages release......464 Memory enclaves......467 Programmatic interface......468 Memory enclave initializations......469 Enclave construction......469 Loading data into an enclave......471 Initializing an enclave......472 Proactive memory management (SuperFetch)......472 Components......473 Tracing and logging......474 Scenarios......475 Page priority and rebalancing......476 Robust performance......478 ReadyBoost......479 ReadyDrive......480 Process reflection......480 Conclusion......482

Contents of Windows Internals, Part 1, 7th Edition     857


---

Chapter 6   I/O system      483

I/O system components......483 The I/O manager......485 Typical I/O processing......486 Interrupt Request Levels and Deferred Procedure Calls......488 Interrupt Request Levels......488 Deferred Procedure Calls......490 Device drivers......492 Types of device drivers......492 Structure of a driver......498 Driver objects and device objects......500 Opening devices......507 I/O processing......510 Types of I/O......511 I/O request packets......513 I/O request to a single-layered hardware-based driver......525 I/O requests to layered drivers......533 Thread-agnostic I/O......536 I/O cancellation......537 I/O completion ports......541 I/O prioritization......546 Container notifications......552 Driver Verifier......552 I/O-related verification options......554 Memory-related verification options......555 The Plug and Play manager......559 Level of Plug and Play support......560 Device enumeration......561 Device stacks......563 Driver support for Plug and Play......569 Plug-and-play driver installation......571 General driver loading and installation......575 Driver loading......575 Driver installation......577

858      Contents of Windows Internals, Part 1, 7th Edition


---

The Windows Driver Foundation ......578 Kernel-Mode Driver Framework ......579 User-Mode Driver Framework......587 The power manager......590 Connected Standby and Modern Standby......594 Power manager operation......595 Driver power operation......596 Driver and application control of device power......599 Power management framework......600 Power availability requests......602 Conclusion......603

Chapter 7 Security 605 Security ratings......605 Trusted Computer System Evaluation Criteria......605 The Common Criteria......607 Security system components......608 Virtualization-based security......611 Credential Guard......612 Device Guard......617 Protecting objects......619 Access checks......621 Security identifiers......625 Virtual service accounts......646 Security descriptors and access control......650 Dynamic Access Control......666 The AuthZ API......666 Conditional ACEs......667 Account rights and privileges......668 Account rights......669 Privileges......670 Super privileges......675 Access tokens of processes and threads......677

Contents of Windows Internals, Part 1, 7th Edition     859


---

Security auditing......677 Object access auditing......679 Global audit policy......682 Advanced Audit Policy settings......683 AppContainers......684 Overview of UWP apps......685 The AppContainer......687 Logon......710 Winlogon initialization......711 User logon steps......713 Assured authentication......718 Windows Biometric Framework......719 Windows Hello......721 User Account Control and virtualization......722 File system and registry virtualization......722 Elevation......729 Exploit mitigations......735 Process-mitigation policies......735 Control Flow Integrity......740 Security assertions......752 Application Identification......756 AppLocker......757 Software Restriction Policies......762 Kernel Patch Protection......764 PatchGuard......765 HyperGuard......768 Conclusion......770

Index......771

---

## Index

### SYMBOLS

\ (root directory), 692

### NUMBERS

32-bit handle table entry, 147 64-bit DiT view, 34-35

### A

AAM (Application Activation Manager), 244 ACL (access control list), displaying, 153–154 ACM (authenticated code module), 805–806 Iacpirqarb command, 49 ActivationObject object, 129 ActivityReference object, 129 address-based pushlocks, 201 address-based waits, 202–203 ADK (Windows Assessment and Deployment Kit), 421 administrative command prompt, opening, 253, 261 AeDebug and AeDebugProtected root keys, WER (Windows Error Reporting), 540 AES (Advanced Encryption Standard), 711 allocators, ReFS (Resilient File System), 743–745 ALPC (Advanced Local Procedure Call), 209 lapc command, 224 ALPC message types, 211 ALPC ports, 129, 212–214 ALPC worker thread, 118 APC level, 40, 43, 62, 63, 65 Iacpirqarb command, 48


1

APCs (asynchronous procedure calls), 61-66 APIC, and PIC (Programmable Interrupt Controller), 37-38 APIC (Advanced Programmable Interrupt Controller), 35-36 !apc command, 37 APIC Timer, 67 APIs, 690 \AppContainer NamedObjects directory, 160 AppContainers, 243-244 AppExecution aliases, 263-264 apps, activating through command line, 261-262. See also packaged applications APT (Advanced Persistent Threats), 781 !arbiter command, 48 architectural system service dispatching, 92-95 \ArcName directory, 160 ARM32 simulation on ARM 64 platforms, 115 assembly code, 2 associative cache, 13 atomic execution, 207 attributes, resident and nonresident, 667-670 auto-expand pushlocks, 201 Autorun tool, 837 autosart services startup, 451-457 AWE (Address Windowing Extension), 201

### B

B+ Tree physical layout, RefS (Resilient File System), 742-743 background tasks and Broker Infrastructure, 256-258

---

Background Broker Infrastructure

Background Broker Infrastructure, 244, 256–258 backing up encrypted files, 716–717 bad-cluster recovery, NTFS recovery support, 703–706. See also clusters bad-cluster remapping, NTFS, 633 base named objects, looking at, 163–164. See also objects BaseNamedObjects directory, 160 BCD (Boot Configuration Database), 392, 398–399 BCD library for boot operations, 790–792 BCD options Windows hypervisor loader (Hvloader), 796–797 Windows OS Loader, 792–796 bcdedit command, 398–399 BI (Background Broker Infrastructure), 244, 256–258 BI (Broker Infrastructure), 238 BindFlt (Windows Bind minifilter driver), 248 BitLocker encryption offload, 717–718 recovery procedure, 801 turning on, 804 block volumes, DAX (Direct Access Disks), 728–730 BNO (Base Named Object) Isolation, 167 BOOLEAN status, 208 boot application, launching, 800–801 Boot Manager BCD objects, 798 overview, 785–799 and trusted execution, 805 boot menu, 799–800 boot process. See also Modern boot menu BIOS, 781 driver loading in safe mode, 848–849 hibernation and Fast Startup, 840–844 hypervisor loader, 811–813 images start automatically, 837 kernel and executive subsystems, 818–824

kernel initialization phase 1, 824-829 Measured Boot, 801-805 ReadyBoot, 835-836 safe mode, 847-850 Secure Boot, 781-784 Secure Launch, 816-818 shutdown, 837-840 Smss, Crss, Wininit, 830-835 trusted execution, 805-807 UEFI, 777-781 VSM (Virtual Secure Mode) startup policy, 813-816 Windows OS Loader, 808-810 WinRE (Windows Recovery Environment), 845 boot status file, 850 Bootim.exe command, 832 booting from iSCSI, 811 B PB (boot parameter block), 657 BTB (Branch Target Buffer), 11 bugcheck, 40

## C

C-states and timers, 76 cache copying to and from, 584 forcing to write through to disk, 595 cache coherency, 568–569 cache data structures, 576–582 cache manager in action, 591–594 centralized system cache, 567 disk I/O accounting, 600–601 features, 566–567 lazy writer, 622 mapping views of files, 573 memory manager, 567 memory partitions support, 571–572 NTFS MFT working set enhancements read-ahead thread, 622–623 recoverable file system support, 570

862     Index

---

commands

stream-based caching, 569 virtual block caching, 569 write-back cache with lazy write, 589 cache size, 574-576 cache virtual memory management, 572-573 cache-aware pushblocks, 200-201 caches and storage memory, 10 caching with DMA (direct memory access) interfaces, 584-585 with mapping and pinning interfaces, 584 caching and file systems disks, 565 partitions, 565 sectors, 565 volumes, 565-566 \Callback directory, 160 cd command, 144, 832 CDFS legacy format, 602 CEA (Common Event Aggregator), 238 Centennial applications, 246-249, 261 CFG (Control Flow Integrity), 343 Chain of Trust, 783-784 change journal file, NTFS on-disk structure, 675-679 change logging, NTFS, 637-638 check-disk and fast repair, NTFS recovery support, 707-710 checkpoint records, NTFS recovery support, 698 lchksvctbl command, 103 CHPE (Compile Hybrid Executable) bitmap, 115-118 CIM (Common Information Model), WMI (Windows Management Instrumentation), 488-495 CLFS (common logging file system), 403-404 Clipboard User Service, 472 clock time, 57 cloning ReFS files, 755 Close method, 141 clusters. See also bad-cluster recovery

defined, 566

NTFS on-disk structure, 655–656

cmd command, 253, 261, 275, 289, 312, 526, 832

COM-hosted task, 479, 484–486

command line, activating apps through, 261–262

Command Prompt, 833, 845

commands

!acpiirqarb, 49

!apc, 224

!acpiirqarb, 48

!apic, 37

!arbiter, 48

bcdedit, 398–399

Bootim.exe, 832

cd, 144, 832

!chksvctbl, 103

cmd, 253, 261, 275, 289, 312, 526, 832

db, 102

defrag.exe, 646

!devhandles, 151

!devnode, 49

!devobj, 48

dg, 7–8

dps, 102–103

dt, 7–8

dtrace, 527

.dumpdebug, 547

dx, 7, 35, 46, 137, 150, 190

enimtag, 547

eventvmr, 288, 449

!lexqueue, 83

fsutil resource, 693

futil storagereserve findById, 687

g, 124, 241

Get-FileStorageTier, 649

Get-VMPnemController, 737

!handle, 149

!idt, 34, 38, 46

!ioapic, 38

!irql, 41

Index 863


---

commands

commands (continued) k, 485 link.exe/dump/loadconfig, 379 !locks, 198 msinfo32, 312, 344 notepad.exe, 405 !object, 137-138, 151, 223 perfmon, 505, 519 !pic, 37 !process, 190 !qlocks, 176 !reg openkeys, 417 regedit.exe, 468, 484, 542 Runas, 397 Set-PhysicalDisk, 774 taskschd.msc, 479, 484 !thread, 75, 190 tss, 8 Wberntest, 491 wnfdump, 237 committing a transaction, 697 Composition object, 129 compressing nonsparse data, 673-674 sparse data, 671-672 compression and ghosting, RefS (Resilient File System), 769-770 compression and sparse files, NTFS, 637 condition variables, 205-206 connection ports, dumping, 223-224 container compaction, RefS (Resilient File System), 766-769 container isolation, support for, 626 contiguous file, 643 copying to and from cache, 584 encrypted files, 717 CoreMessaging object, 130 corruption record, NTFS recovery support, 708 CoverageSampler object, 129

CPL (Code Privilege Level), 6 CPU branch predictor, 11–12 CPU cache(s), 9–10, 12–13 crash dump files, WER (Windows Error Reporting), 543–548 crash dump generation, WER (Windows Error Reporting), 548–551 crash report generation, WER (Windows Error Reporting), 538–542 crashes, consequences of, 421 critical sections, 203–204 CS (Code Segment), 31 CSSrs, 830–835, 838–840

## D

data compression and sparse files, NTFS, 670-671 data redundancy and fault tolerance, 629-630 data streams, NTFS, 631-632 data structures, 184-189 DAX (Direct Access Disks). See also disks block volumes, 728-730 cached and noncached I/O in volume, 723-724 driver model, 721-722 file system filter driver, 730-731 large and huge pages support, 732-735 mapping executable images, 724-728 overview, 720-721 virtual PMs and storage spaces support, 736-739 volumes, 722-724 DAX file alignment, 733-735 DAX mode I/Os, flushing, 731 db command, 102 /debug switch, FsTool, 734 debugger breakpoints, 87-88 objects, 241-242 !pte extension, 735 !trueuf command, 148

---

enclave configuration, dumping

debugging. See also user-mode debugging object handles, 158 trustlets, 374–375 WoW64 in ARM64 environments, 122–124 decryption process, 715–716 defrag.exe command, 646 defragmentation, NTFS, 643–645 Delete method, 141 Dependency Mini Repository, 255 Desktop object, 129 Idevhandlevars command, 151 \Device directory, 161 device shims, 564 Idevnode command, 49 Idevobj command, 48 dg command, 4, 7–8 Directory object, 129 disk I/Os, counting, 601 disks, defined, 565. See also DAX (Direct Access Disks) dispatcher routine, 121 DLLs Hvloader.dll, 811 IUM (Isolated User Mode), 371–372 Ntevt.dll, 497 for Wow64, 104–105 DMA (Direct Memory Access), 50, 584–585 DMTF, WMI (Windows Management Instrumentation), 486, 489 DPC (dispatch or deferred procedure call) interrupts, 54–61, 71. See also software interrupts DPC Watchdog, 59 dps (dump pointer symbol) command, 102–103 drive-letter name resolution, 620 \Driver directory, 161 driver loading in safe mode, 848–849 driver objects, 451 driver shims, 560–563 \DriverStore(s) directory, 161 dt command, 7, 47

DTrace (dynamic tracing) ETW provider, 533–534 FBT (Function Boundary Tracing) provider, 531–533 initialization, 529–530 internal architecture, 528–534 overview, 525–527 PID (Process) provider, 531–533 symbol server, 535 syscall provider, 530 type library, 534–535 dtrace command, 527 .dump command, LiveKd, 545 dump files, 546–548 Dump method, 141 .dumpdebug command, 547 Duplicate object service, 136 DVRT (Dynamic Value Relocation Table), 23–24, 26 dx command, 7, 35, 46, 137, 150, 190 Dxgk* objects, 129 dynamic memory, tracing, 532–533 dynamic partitioning, NTFS, 646–647

## E

EFI (Extensible Firmware Interface), 777 EFS (Encrypting File System) architecture, 712 BitLocker encryption offload, 717–718 decryption process, 715–716 described, 640 first-time usage, 713–715 information and key entries, 713 online support, 719–720 overview, 710–712 recovery agents, 714 EFS information, viewing, 716 EIP program counter, 8 envelope configuration, dumping, 379–381

Index 865


---

encrypted files

encrypted files backing up, 716-717 copying, 717 encrypting file data, 714-715 encryption NTFS, 640 encryption support, online, 719-720 EnergyTracker object, 130 enhanced timers, 78-81. See also timers /enum command-line parameter, 786 .enuntag command, 547 Error Reporting. See WER (Windows Error Reporting) ETL file, decoding, 514-515 ETW (Event Tracing for Windows). See also tracing dynamic memory architecture, 500 consuming events, 512-515 events decoding, 513-515 Global logger and autologgers, 521 and high-frequency timers, 68-70 initialization, 501-502 listing processes activity, 510 logger thread, 511-512 overview, 499-500 providers, 506-509 providing events, 509-510 security, 522-525 security registry key, 503 sessions, 502-506 system loggers, 516-521 ETW provider, DTrace (dynamic tracing), 533-534 ETW providers, enumerating, 508 ETW sessions default security descriptor, 523-524 enumerating, 504-506 ETW_GUID_ENTRY data structure, 507 ETW_REG_ENTRY, 507 EtwConsumer object, 129 EtwRegistration object, 129 Event Log provider DLL, 497

Event object, 128

Event Viewer tool, 288

eventvwr command, 288, 449

ExAllocatePool function, 26

exception dispatching, 85–91

executive mutexes, 196–197

executive objects, 126–130

executive resources, 197–199

exFAT, 606

explicit file I/O, 619–622

export thunk, 117

lequeuxe command, 83

## F

F5 key, 124, 397 fast I/O, 585–586. See also I/O system fast mutexes, 196–197 fast repair and check-disk, NTFS recovery support, 707–710 Fast Startup and hibernation, 840–844 FAT12, FAT16, FAT32, 603–606 FAT64, 606 Fault Reporting process, WER (Windows Error Reporting), 540 fault tolerance and data redundancy, NTFS, 629–630 FCB (File Control Block), 571 FCB Headers, 201 feature settings and values, 22–23 FEK (File Encryption Key), 711 file data, encrypting, 714–715 file names, NTFS on-disk structure, 664–666 file namespaces, 664 File object, 128 file record numbers, NTFS on-disk structure, 660 file records, NTFS on-disk structure, 661–663 file system drivers, 583 file system formats, 566 file system interfaces, 582–585 File System Virtualization, 248

---

HKEY_PERFORMANCE_TEXT

file systems CDFS, 602 data-scan sections, 624–625 drivers architecture, 608 exFAT, 606 explicit file I/O, 619–622 FAT12, FAT16, FAT32, 603–606 filter drivers, 626 filter drivers and minifilters, 623–626 filtering named pipes and mailslots, 625 FSDs (file system drivers), 608–617 mapped page writers, 622 memory manager, 622 NTFS file system, 606–607 operations, 618 Process Monitor, 627–628 ReFS (Resilient File System), 608 remote FSDs, 610–617 reparse point behavior, 626 UDF (Universal Disk Format), 603 \FileSystem directory, 161 fill buffers, 17 Filter Manager, 626 FilterCommunicationPort object, 130 FilterConnectionPort object, 130 Flags, 132 flushing mapped files, 595–596 Foreshadow (LITF) attack, 16 fragmented file, 643 FSCTL (file system control) interface, 688 FSDs (file system drivers), 608–617 FsTool, /debug switch, 734 fsutil resource command, 693 fsutil storagereserve findById command, 687

## G

g command, 124, 241 gadgets, 15 GDI/User objects, 126-127. See also user-mode debugging

GDT (Global Descriptor Table), 2–5 Get-FileStorageT er command, 649 Get-VMPmemController command, 737 Gffx.exe, 554–557 GIT (Generic Interrupt Timer), 67 $\GLOBAL?? directory, 161 global flags, 554–557 global namespace, 167 GPA (guest physical address), 17 GPIO (General Purpose Input Output), 51 GSIV (global system interrupt vector), 32, 51 guarded mutexes, 196–197 GUI thread, 96

## H

HAM (Host Activity Manager), 244, 249-251 handle command, 149 Handle count, 132 handle lists, single instancing, 165 handle tables, 146, 149-150 handles creating maximum number of, 147 viewing, 144-145 hard links, NTFS, 634 hardware indirect branch controls, 21-23 hardware interrupt processing, 32-35 hardware side-channel vulnerabilities, 9-17 hibernation and Fast Startup, 840-844 high-IRQL synchronization, 172-177 hive handles, 410 hives. See also registry loading, 421 loading and unloading, 408 reorganization, 414-415 HKEY_CLASSES_ROOT, 397-398 HKEY_CURRENT_CONFIG, 400 HKEY_CURRENT_USER subkeys, 395 HKEY_LOCAL_MACHINE, 398-400 HKEY_PERFORMANCE_DATA, 401 HKEY_PERFORMANCE_TEXT, 401

In

From the LI

---

HKEY_USERS

HKEY_USERS, 396

HKLMSYSTEM\CurrentControlSet\Control\ SafeBoot registry key, 848

HPET (High Performance Event Timer), 67

hung program screen, 838

HungAppTimeout, 839

HVCI (Hypervisor Enforced Code Integrity), 358

hybrid code address range table, dumping,

117–118

hybrid shutdown, 843–844

hypercalls and hypervisor TLFS (Top Level

Functional Specification), 299–300

Hyper-V schedulers. See also Windows

hypervisor

classic, 289–290

core, 291–294

overview, 287–289

root scheduler, 294–298

SMT system, 292

hypervisor debugger, connecting, 275–277

hypervisor loader boot module, 811–813

## |

IBPS (Indirect Branch Predictor Barrier), 22, 25 IBRS (Indirect Branch Restricted Speculation), 21–22, 25 IDT (interrupt dispatch table), 32–35 lidt command, 34, 38, 46 images starting automatically, 837 Import Optimization and Retpoline, 23–26 indexing facility, NTFS, 633, 679–680 Info mask, 132 Inheritance object service, 136 integrated scheduler, 294 interlocked operations, 172 interrupt control flow, 45 interrupt dispatching hardware interrupt processing, 32–35 overview, 32 programmable interrupt controller architecture, 35–38

software IRQLs (interrupt request levels), 38–50 interrupt gate, 32 interrupt internals, examining, 46–50 interrupt objects, 43–50 interrupt steering, 52 interrupt vectors, 42 interrupts affinity and priority, 52–53 latency, 50 masking, 39 I/O system, components of, 652. See also Fast I/O IOAPIC (I/O Advanced Programmable Interrupt Controller), 32, 36 Iioapic command, 38 IoCompletion object, 128 IoCompletionReserve object, 128 Ionescu, Alex, 28 IRPs (I/O request packets), 567, 583, 585, 619, 621–624, 627, 718 IRQ affinity policies, 53 IRQ priorities, 53 IRQL (interrupt request levels), 347–348. See also software IRQLs (interrupt request levels) lirq command, 41 IRTimer object, 128 iSCSI, booting from, 811 isolation, NTFS on-disk structure, 689–690 ISR (interrupt service routine), 31 IST (Interrupt Stack Table), 7–9 IUM (Isolated User Mode) overview, 371–372 SDF (Secure Driver Framework), 376 secure companions, 376 secure devices, 376–378 SGRA (System Guard Runtime attestation), 386–390 trustlets creation, 372–375 VBS-based enclaves, 378–386

---

local procedure call

## J

jitted blocks, 115, 117 jitting and execution, 121–122 Job object, 128

## K

k command, 485 Kali Linus, 247 KeBugCheckEx system function, 32 KEK (Key Exchange Key), 783 kernel. See also Secure Kernel

dispatcher objects, 179-181 objects, 126 spinlocks, 174 synchronization mechanisms, 179 kernel addresses, mapping, 20 kernel debugger

!handle extension, 125 !locks command, 198 searching for open files with, 151-152 viewing handle table with, 149-150 kernel logger, tracing TCP/IP activity with, 519-520 Kernel Patch Protection, 24 kernel reports, WER (Windows Error Reporting), 551 kernel shims

database, 559-560 device shims, 564 driver shims, 560-563 engine initialization, 557-559 shim database, 559-560 witnessing, 561-563 kernel-based system call dispatching, 97 kernel-mode debugging events, 240 \KernelObjects directory, 161 Key object, 129 keyed events, 194-196 KeyedEvent object, 128 KilsrThunk, 33


1

KINTERPUIT object, 44, 46 \KnownDlls directory, 161 \KnownDlls32 directory, 161 KPCR (Kernel Processor Control Region), 4 KPCRB fields, timer processing, 72 KPTI (Kernel Page Table Isolation), 18 KTM (Kernel Transaction Manager), 157, 688 KVA Shadow, 18–21

## L

LTF (Foreshadow) attack, 16 LAPIC (Local Advanced Programmable Interrupt Controllers), 32 lazy jitter, 119 lazy segment loading, 6 lazy writing disabling, 595 and write-back caching, 589–595 LBA (logical block address), 589 LCNs (logical cluster numbers), 656–658 leak detections, RefS (Resilient File System), 761–762 leases, 614–615, 617 LFENCE, 23 LFS (log file service), 652, 695–697 line-based versus message signaled-based interrupts, 50–66 link tracking, NTFS, 639 link.exe tool, 117, 379 link.exe/dump/loadconfig command, 379 LiveKd., dump command, 545 load ports, 17 loader issues, troubleshooting, 556–557 Loader Parameter block, 819–821 local namespace, 167 local procedure call ALPC direct event attribute, 222 ALPC port ownership, 220 asynchronous operation, 214–215 attributes, 216–217 blobs, handles, and resources, 217–218

In

From the LI

---

local procedure call

local procedure call (continued) connection model, 210–212 debugging and tracing, 222–224 handle passing, 218–219 message model, 212–214 overview, 209–210 performance, 220–221 power management, 221 security, 219–220 views, regions, and sections, 215–216 Lock, 132 !locks command, kernel debugger, 198 log record types, NTFS recovery support, 697–699 $LOGGED_UTILITY_STREAM attribute, 663 logging implementation, NTFS on-disk structure, 693 Low-IRQL synchronization. See also synchronization address-based waits, 202–203 condition variables, 205–206 critical sections, 203–204 data structures, 184–194 executive resources, 197–202 kernel dispatcher objects, 179–181 keyed events, 194–196 mutexes, 196–197 object-less waiting (thread alerts), 183–184 overview, 177–179 run once initialization, 207–208 signalling objects, 181–183 (SRW) Slim Reader/Writer locks, 206–207 user-mode resources, 205 LRC parity and RAID 6, 773 LSASS (Local Security Authority Subsystem Service) process, 453, 465 LSN (logical sequence number), 570

## M

mailslots and named pipes, filtering, 625 Make permanent/temporary object service, 136

mapped files, flushing, 595–596 mapping and pinning interfaces, caching with, 584 masking interrupts, 39 MBEC (Mode Base Execution Controls), 93 MDL (Memory Descriptor List), 220 MDS (Microarchitectural Data Sampling), 17 Measured Boot, 801–805 media mixer, creating, 165 Meltdown attack, 14, 18 memory, sharing, 171 memory hierarchy, 10 memory manager modified and mapped page writer, 622 overview, 567 page fault handler, 622–623 memory partitions support, 571–572 metadata defined, 566, 570 metadata logging, NTFS recovery support, 695 MFT (Master File Table) NTFS metadata files in, 657 NTFS on-disk structure, 656–660 record for small file, 661 MFT file records, 668–669 MFT records, compressed file, 674 Microsoft Incremental linker (llink.exe)), 117 minifilter driver, Process Monitor, 627–628 Minstore architecture, RefS (Resilient File System), 740–742 Minstore I/O, RefS (Resilient File System), 746–748 Minstore write-ahead logging, 758 Modern Application Model, 249, 251, 262 modern boot menu, 832–833. See also boot process MOF (Managed Object Format), WMI (Windows Management Instrumentation), 488–495 MPS (Multiprocessor Specification), 35 Msconfig utility, 837

870      Index

---

NTFS recovery support

MSI (message signaled interrupts), 50-66 msinfo32 command, 312, 344 MSRs (model specific registers), 92 Mutex object, 128 mutexes, fast and guarded, 196-197 mutual exclusion, 170

## N

named pipes and mailslots, filtering, 625 namespace instancing, viewing, 169 \NLS directory, 161 nonarchitectural system service dispatching, 96-97 nonsparse data, compressing, 673-674 notepad.exe command, 405 notifications. See WNF (Windows Notification Facility) NT kernel, 18-19, 22 Ntldr version list, 106 Ntevt.dll, 497 NTFS bad-cluster recovery, 703-706 NTFS file system advanced features, 630 change logging, 637-638 compression and sparse files, 637 data redundancy, 629-630 data streams, 631-632 data structures, 654 defragmentation, 643-646 driver, 652-654 dynamic bad-cluster remapping, 633 dynamic partitioning, 646-647 encryption, 640 fault tolerance, 629-630 hard links, 634 high-end requirements, 628 indexing facility, 633 link tracking, 639 metadata files in MFT, 657 overview, 606-607 per-user volume quotas, 638-639

POSIX deletion, 641–643 recoverability, 629 recoverable file system support, 570 and related components, 653 security, 629 support for tiered volumes, 647–651 symbolic links and junctions, 634–636 Unicode-based names, 633 NTFS files, attributes for, 662–663 NTFS information, viewing, 660 NTFS MFT working set enhancements, 571 NTFS on-disk structure attributes, 667–670 change journal file, 675–679 clusters, 655–656 consolidated security, 682–683 data compression and sparse files, 670–674 on-disk implementation, 691–693 file names, 664–666 file record numbers, 660 file records, 661–663 indexing, 679–680 isolation, 689–690 logging implementation, 693 master file table, 656–660 object IDs, 681 overview, 654 quota tracking, 681–682 reparse points, 684–685 sparse files, 675 Storage Reserves and reservations, 685–688 transaction support, 688–689 transactional APIs, 690 tunneling, 666–667 volumes, 655 NTFS recovery support analysis pass, 700 bad clusters, 703–706 check-disk and fast repair, 707–710 design, 694–695 LFS (log file service), 695–697

Index 871


---

NTFS recovery support

NTFS recovery support (continued) log record types, 697-699 metadata logging, 695 recovery, 699-700 redo pass, 701 self-healing, 706-707 undo pass, 701-703 NTFS reservations and Storage Reserves, 685-688 Ntoskrnl and Winload, 818 NVMe (Non-volatile Memory disk), 565

## O

Iobject command, 137-138, 151, 223 Object Create Info, 132 object handles, 146, 158 object IDs, NTFS on-disk structure, 681 Object Manager executive objects, 127-130 overview, 125-127 resource accounting, 159 symbolic links, 166-170 Object type index, 132 object-less waiting (thread alerts), 183-184 objects. See also base named objects; private objects; reserve objects directories, 160-165 filtering, 170 flags, 134-135 handles and process handle table, 143-152 headers and bodies, 131-136 methods, 140-143 names, 159-160 reserves, 152-153 retention, 155-158 security, 153-155 services, 136 signalling, 181-183 structure, 131 temporary and permanent, 155 types, 126, 136-140

Index

ObjectTypes directory, 161 ODBC (Open Database Connectivity), WMI (Windows Management Instrumentation), 488 Okay to close method, 141 on-disk implementation, NTFS on-disk structure, 691-693 open files, searching for, 151-152 open handles, viewing, 144-145 Open method, 141 Openfiles/query command, 126 oplocks and FSDs, 611-612, 616 Optimize Drives tool, 644-645 OS/2 operating system, 130 out-of-order execution, 10-11

## P

packaged applications. See also apps activation, 259-264 BI (Background Broker Infrastructure), 256-258 bundles, 265 Centennial, 246-249 Dependency Mini Repository, 255 Host Activity Manager, 249-251 overview, 243-245 registration, 265-266 scheme of lifecycle, 250 setup and startup, 258 State Repository, 251-254 UWP, 245-246 page table, ReFS (Resilient File System), 745-746 PAN (Privileged Access Neven), 57 Parse method, 141 Partition object, 130 partitions caching and file systems, 565 defined, 565 Pc Reset, 845 PCIDs (Process-Context Identifiers), 20 

---

ReFS (Resilient File System)

PEB (process environment block), 104 per-file cache data structures, 579–582 perfmon command, 505, 519 per-user volume quotas, NTFS, 638–639 PFN database, physical memory removed from, 286 PIC (Programmable Interrupt Controller), 35–38 lpc command, 37 pinning and mapping interfaces, caching with, 584 pinning the bucket, RefS (Resilient File System), 743 PIT (Programmable Interrupt Timer), 66–67 PM (persistent memory), 736 Pointer count field, 132 pop thunk, 117 POSIX deletion, NTFS, 641–643 PowerRequest object, 129 private objects, looking at, 163–164. See also objects Proactive Scan maintenance task, 708–709 lprocessing command, 190 Process Explorer, 58, 89–91, 144–145, 147, 153–154, 165 169 Process Monitor, 591–594, 627–628, 725–728 Process object, 128, 137 processor execution model, 2–9 processor selection, 73–75 processor traps, 33 Profile object, 130 PSM (Process State Manager), 244 lpte extension of debugger, 735 PTEs (Page table entries), 16, 20 push thunk, 117 pushlocks, 200–202

## Q

Iqlocks command, 176

Query name method, 141

Query object service, 136

Query security object service, 136

queued spinlocks, 175-176 quota tracking, NTFS on-disk structure, 681-682

## R

RAID 6 and LRC parity, 773 RAM (Random Access Memory), 9-11 RawInputManager object, 130 RDCL (Rogue Data Cache load), 14 Read (R) access, 615 read-ahead and write-behind cache manager disk I/O accounting, 600-601 disabling lazy writing, 595 dynamic memory, 599-600 enhancements, 588-589 flushing mapped files, 595-596 forcing cache to write through disk, 595 intelligent read-ahead, 587-588 low-priority lazy writes, 598-599 overview, 586-587 system threads, 597-598 write throttling, 596-597 write-back caching and lazy writing, 589-594 reader/writer spinlocks, 176-177 ReadyBoost driver service settings, 810 ReadyBoot, 835-836 Reconciler, 419-420 recoverability, NTFS, 629 recoverable file system support, 570 recovery, NTFS recovery support, 699-700. See also WinRE (Windows Recovery Environment) redo pass, NTFS recovery support, 701 ReFS (Resilient File System) allocators, 743-745 architecture's scheme, 749 B+ tree physical layout, 742-743 compression and ghosting, 769-770 container compaction, 766-769

---

ReFS (Resilient File System)

ReFS (Resilient File System) (continued) data integrity scanner, 760 on-disk structure, 751–752 file integrity streams, 760 files and directories, 750 file's block cloning and spare VDL, 754–757 leak detections, 761–762 Minstore architecture, 740–742 Minstore I/O, 746–748 object IDs, 752–753 overview, 608, 739–740, 748–751 page table, 745–746 pinning the bucket, 743 recovery support, 759–761 security and change journal, 753–754 SMR (shingled magnetic recording) volumes, 762–766 snapshot support through HyperV, 756–757 tiered volumes, 764–766 write-through, 757–758 zap and salvage operations, 760 ReFS files, cloning, 755 Ireg openkeys command, 417 regedit.exe command, 468, 484, 542 registered file systems, 613–614 registry. See also hives application hives, 402–403 cell data types, 411–412 cell maps, 413–414 CLFS (common logging file system), 403–404 data types, 393–394 differencing hives, 424–425 filtering, 422 hive structure, 411–413 hives, 406–408 HKEY_CLASSES_ROOT, 397–398 HKEY_CURRENT_CONFIG, 400 HKEY_CURRENT_USER subkeys, 395 HKEY_LOCAL_MACHINE, 398–400 HKEY_PERFORMANCE_DATA, 401 HKEY_PERFORMANCE_TEXT, 401

HKEY_USERS, 396

HKLM\SYSTEM\CurrentControlSet\Control\ SafeBoot key, 848

incremental logging, 419-421

key control blocks, 417-418

logical structure, 394-401

modifying, 392-393

monitoring activity, 404

namespace and operation, 415-418

namespace redirection, 423

optimizations, 425-426

Process Monitor, 405-406

profile loading and unloading, 397

Reconciler, 419-420

remote BCD editing, 398-399

reorganization, 414-415

root keys, 394-395

ServiceGroupOrder key, 452

stable storage, 418-421

startup and process, 408-414

symbolic links, 410

TxR (Transactional Registry), 403-404

usage, 392-393

User Profiles, 396

viewing and changing, 391-392

virtualization, 422-425

RegistryTransaction object, 129

reparse points, 626, 684-685

reserve objects, 152-153. See also objects

resident and nonresident attributes, 667-670

resource manager information, querying,

692-693

Resource Monitor, 145

Restricted User Mode, 93

Retpoline and Import optimization, 23-26

RH (Read-Handle) access, 615

RISC (Reduced Instruction Set Computing), 113

root directory (\), 692

\RPC Control directory, 161

RSA (Rivest-Shamir-Adleman) public key

algorithm, 711

874      Index

---

side-channel attacks

RTC (Real Time Clock), 66-67 run once initialization, 207-208 Runos command, 397 runtime drivers, 24 RW (Read-Write) access, 615 RWH (Read-Write-Handle) access, 615

## S

safe mode, 847-850 SCM (Service Control Manager) network drive letters, 450 overview, 446-449 and Windows services, 426-428 SCM Storage driver model, 722 SCP (service control program), 426-427 SDB (shim database), 559-560 SDF (Secure Driver Framework), 376 searching for open files, 151-152 SEB (System Events Broker), 226, 238 second-chance notification, 88 Section object, 128 sectors

caching and file systems, 565 and clusters on disk, 566 defined, 565 secure boot, 781-784 Secure Kernel. See also kernel

APs (application processors) startup, 362-363 control over hypercalls, 349 hot patching, 368-371 HVCI (Hypervisor Enforced Code Integrity), 358 memory allocation, 367-368 memory manager, 363-368 NAR data structure, 365 overview, 345 page identity/secure PFN database, 366-367 secure intercepts, 348-349 secure IRQLs, 347-348

secure threads and scheduling, 356-358 Syscall selector number, 354 trustlet for normal call, 354 UEFI runtime virtualization, 358-360 virtual interrupts, 345-348 VSM startup, 360-363 VSM system calls, 349-355 Secure Launch, 816-818 security consolidation, NTFS on-disk structure, 682-683 Security descriptor field, 132 \Security directory, 161 Security method, 141 security reference monitor, 153 segmentation, 2-6 self-healing, NTFS recovery support, 706-707 Semaphore object, 128 service control programs, 450-451 service database, organization of, 447 service descriptor tables, 100-104 ServiceGroupOrder registry key, 452 services logging, enabling, 448-449 session namespace, 167-169 Session object, 130 \Sessions directory, 161 Set security object service, 136 \setbootorder command-line parameter, 788 Set-PhysicalDisk command, 774 SGRA (System Guard Runtime attestation), 386-390 SGX, 16 shadow page tables, 18-20 shim database, 559-560 shutdown process, 837-840 SID (security identifier), 162 side-channel attacks LITF (Foreshadow), 16 MDS (Microarchitectural Data Sampling), 17 Meltdown, 14 Spectre, 14-16 SSB (speculative store bypass), 16

Index 875


---
