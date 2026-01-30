## Executive

The Windows executive is the upper layer of Ntoskrnl.exe. (The kernel is the lower layer.) The executive

includes the following types of functions:

- ■ Functions that are exported and callable from user mode These functions are called
system services and are exported via Ntdll.dll (such as NtCreateFile from the previous experi-
ment). Most of the services are accessible through the Windows API or the APIs of another
environment subsystem. A few services, however, aren't available through any documented
subsystem function. (Examples include ALPC and various query functions such as NtQuery-
InformationProcess, specialized functions such as NtCreatePagingFile, and so on.)
---

- ■ Device driver functions that are called through the DeviceIoControl function This provides a
general interface from user mode to kernel mode to call functions in device drivers that are not
associated with a read or write. The driver used for Process Explorer and Process Monitor from
Sysinternals are good examples of that as is the console driver (ConDrv.sys) mentioned earlier.
■ Functions that can be called only from kernel mode that are exported and documented
in the WDK These include various support routines, such as the I/O manager (start with Io),
general executive functions (Ex) and more, needed for device driver developers.
■ Functions that are exported and can be called from kernel mode but are not documented
in the WDK These include the functions called by the boot video driver, which start with Inbv.
■ Functions that are defined as global symbols but are not exported These include internal
support functions called within Ntoskrnl.exe, such as those that start with Top (internal I/O
manager support functions) or M$ (internal memory management support functions).
■ Functions that are internal to a module that are not defined as global symbols These
functions are used exclusively by the executive and kernel.
The executive contains the following major components, each of which is covered in detail in a subsequent chapter of this book:

- ■ Configuration manager The configuration manager, explained in Chapter 9 in Part 2, is
responsible for implementing and managing the system registry.
■ Process manager The process manager, explained in Chapter 3 and Chapter 4, creates and
terminates processes and threads. The underlying support for processes and threads is imple-
mented in the Windows kernel; the executive adds additional semantics and functions to these
lower-level objects.
■ Security Reference Monitor (SRM) The SRM, described in Chapter 7, enforces security
policies on the local computer. It guards OS resources, performing run-time object protection
and auditing.
■ I/O manager The I/O manager, discussed in Chapter 6, implements device-independent I/O
and is responsible for dispatching to the appropriate device drivers for further processing.
■ Plug and Play (PnP) manager The PnP manager, covered in Chapter 6, determines which driv-
ers are required to support a particular device and loads those drivers. It retrieves the hardware
resource requirements for each device during enumeration. Based on the resource requirements
of each device, the PnP manager assigns the appropriate hardware resources such as I/O ports,
IRQs, DMA channels, and memory locations. It is also responsible for sending proper event notifi-
cation for device changes (the addition or removal of a device) on the system.
■ Power manager The power manager (explained in Chapter 6), processor power management
(PPM), and power management framework (PoFx) coordinate power events and generate
power management I/O notifications to device drivers. When the system is idle, the PPM can
be configured to reduce power consumption by putting the CPU to sleep. Changes in power
CHAPTER 2   System architecture      73


---

consumption by individual devices are handled by device drivers but are coordinated by the

power manager and PoFx. On certain classes of devices, the terminal timeout manager also

manages physical display timeouts based on device usage and proximity.

- ■ Windows Driver Model (WDM) Windows Management Instrumentation (WMI) routines
These routines, discussed in Chapter 9 in Part 2, enable device drivers to publish performance
and configuration information and receive commands from the user-mode WMI service.
Consumers of WMI information can be on the local machine or remote across the network.
■ Memory manager The memory manager, discussed in Chapter 5, implements virtual
memory; a memory management scheme that provides a large private address space for each
process that can exceed available physical memory. The memory manager also provides the
underlying support for the cache manager. It is assisted by the prefetcher and Store Manager,
also explained in Chapter 5.
■ Cache manager The cache manager, discussed in Chapter 14, "Cache manager," in Part 2,
improves the performance of file-based I/O by causing recently referenced disk data to reside
in main memory for quick access. It also achieves this by deferring disk writes by holding the
updates in memory for a short time before sending them to the disk. As you'll see, it does this
by using the memory manager's support for mapped files.
In addition, the executive contains four main groups of support functions that are used by the

executive components just listed. About a third of these support functions are documented in the WDK

because device drivers also use them. These are the four categories of support functions:

- ■ Object manager The object manager creates, manages, and deletes Windows executive ob-
jects and abstract data types that are used to represent OS resources such as processes, threads,
and the various synchronization objects. The object manager is explained in Chapter 8 in Part 2.
■ Asynchronous LPC (ALPC) facility The ALPC facility, explained in Chapter 8 in Part 2, passes
messages between a client process and a server process on the same computer. Among other
things, ALPC is used as a local transport for remote procedure call (RPC), the Windows imple-
mentation of an industry-standard communication facility for client and server processes across
a network.
■ Run-time library functions These include string processing, arithmetic operations, data type
conversion, and security structure processing.
■ Executive support routines These include system memory allocation (paged and non-paged
pool), interlocked memory access, as well as special types of synchronization mechanisms such
as executive resources, fast mutexes, and pushlocks.
The executive also contains a variety of other infrastructure routines, some of which are mentioned only briefly in this book:

- ■ Kernel debugger library This allows debugging of the kernel from a debugger supporting
KD, a portable protocol supported over a variety of transports such as USB, Ethernet, and IEEE
1394, and implemented by WinDbg and the Kd.exe debuggers.
---

- ⊠User-Mode Debugging Framework This is responsible for sending events to the user-mode
debugging API and allowing breakpoints and stepping through code to work, as well as for
changing contexts of running threads.

⊠Hypervisor library and VBS library These provide kernel support for the secure virtual
machine environment and optimize certain parts of the code when the system knows it's
running in a client partition (virtual environment).

⊠Errata manager The errata manager provides workarounds for nonstandard or noncompliant
hardware devices.

⊠Driver Verifier The Driver Verifier implements optional integrity checks of kernel-mode
drivers and code (described in Chapter 6).

⊠Event Tracing for Windows (ETW) ETW provides helper routines for system-wide event
tracing for kernel-mode and user-mode components.

⊠Windows Diagnostic Infrastructure (WDI) The WDI enables intelligent tracing of system
activity based on diagnostic scenarios.

⊠Windows Hardware Error Architecture (WHEA) support routines These routines provide
a common framework for reporting hardware errors.

⊠File-System Runtime Library (FSRTL) The FSRTL provides common support routines for file
system drivers.

⊠Kernel Shim Engine (KSE) The KSE provides driver-compatibility shims and additional device
errata support. It leverages the shim infrastructure and database described in Chapter 8 in Part 2.
## Kernel

The kernel consists of a set of functions in Ntoskrnl.exe that provides fundamental mechanisms. These include thread-scheduling and synchronization services, used by the executive components, and lowlevel hardware architecture–dependent support, such as interrupt and exception dispatching, which is different on each processor architecture. The kernel code is written primarily in C, with assembly code reserved for those tasks that require access to specialized processor instructions and registers not easily accessible from C.

Like the various executive support functions mentioned in the preceding section, a number of functions in the kernel are documented in the WDK (and can be found by searching for functions beginning with Ke) because they are needed to implement device drivers.

### Kernel objects

The kernel provides a low-level base of well-defined, predictable OS primitives and mechanisms that allow higher-level components of the executive to do what they need to do. The kernel separates itself from the rest of the executive by implementing OS mechanisms and avoiding policy making. It leaves nearly all policy decisions to the executive, with the exception of thread scheduling and dispatching, which the kernel implements.

---

Outside the kernel, the executive represents threads and other shareable resources as objects. These objects require some policy overhead, such as object handles to manipulate them, security checks to protect them, and resource quotas to be deducted when they are created. This overhead is eliminated in the kernel, which implements a set of simpler objects, called kernel objects, that help the kernel control central processing and support the creation of executive objects. Most executive-level objects encapsulate one or more kernel objects, incorporating their kernel-defined attributes.

One set of kernel objects, called control objects, establishes semantics for controlling various OS

functions. This set includes the Asynchronous Procedure Call (APC) object, the Deferred Procedure

Call (DPC) object, and several objects the I/O manager uses, such as the interrupt object.

Another set of kernel objects, known as dispatcher objects, incorporates synchronization capabilities that alter or affect thread scheduling. The dispatcher objects include the kernel thread, mutex (called mutant in kernel terminology), event, kernel event pair, semaphore, timer, and wailable timer. The executive uses kernel functions to create instances of kernel objects, to manipulate them, and to construct the more complex objects it provides to user mode. Objects are explained in more detail in Chapter 8 in Part 2, and processes and threads are described in Chapter 3 and Chapter 4, respectively.

## Kernel processor control region and control block

The kernel uses a data structure called the kernel processor control region (KPCR) to store processorspecific data. The KPCR contains basic information such as the processor's interrupt dispatch table (IDT), task state segment (TSS), and global descriptor table (GDT). It also includes the interrupt controller state, which it shares with other modules, such as the ACPI driver and the HAL. To provide easy access to the KPCR, the kernel stores a pointer to it in the fs register on 32-bit Windows and in the gs register on an x64 Windows system.

The KPCR also contains an embedded data structure called the kernel processor control block

(KPRCB). Unlike the KPCR, which is documented for third-party drivers and other internal Windows

kernel components, the KPRCB is a private structure used only by the kernel code in Ntoskrnl.exe. It

contains the following:

- ■ Scheduling information such as the current, next, and idle threads scheduled for execution on
the processor

■ The dispatcher database for the processor, which includes the ready queues for each priority
level

■ The DPC queue

■ CPU vendor and identifier information, such as the model, stepping, speed, and feature bits

■ CPU and NUMA topology, such as node information, cores per package, logical processors per
core, and so on

■ Cache sizes

■ Time accounting information, such as the DPC and interrupt time.
---

The KPRCB also contains all the statistics for the processor, such as:

- ■ I/O statistics

■ Cache manager statistics (see Chapter 14 in Part 2 for a description of these)

■ DPC statistics

■ Memory manager statistics (see Chapter 5 for more information)
Finally, the KPRCB is sometimes used to store cache-aligned, per-processor structures to optimize memory access, especially on NUMA systems. For example, the non-paged and paged-pool system look-aside lists are stored in the KPRCB.

## EXPERIMENT: Viewing the KPCR and KPRCB

You can view the contents of the KPCR and KPRCB by using the !pcr and !prcb kernel debugger commands. For the latter, if you don’t include flags, the debugger will display information for CPU 0 by default. Otherwise, you can specify a CPU by adding its number after the command—for example, !prcb 2 . The former command, on the other hand, will always display information on the current processor, which you can change in a remote debugging session. If doing local debugging, you can obtain the address of the KPCR by using the !pcr extension, followed by the CPU number, then replacing @5pcr with that address. Do not use any of the other output shown in the !pcr command. This extension is deprecated and shows incorrect data. The following example shows what the output of the dt_n1_KPCR @5pcr and !prcb commands looks like (Windows 10 x64):

```bash
t!kd: dt nt!\KPCR @$\pcr
+0x000 NtTib
+0x000 GdtBase
+0x008 TssBase
+0x010 UserRsp
+0x018 Self
+0x020 CurrentPrcb
+0x028 LockArray
+0x030 Used_Self
+0x038 IdtBase
+0x040 Unused
+0x050 Irgl
+0x051 SecondLevelCacheAssociativity : 0x10 ''
+0x052 ObsoleteNumber : 0 ''
+0x053 F1T10
+0x054 UnusedD0
+0x060 MajorVersion : 1
+0x062 MinorVersion : 1
+0x064 StallScalefactor : 0x8a0
+0x068 UnusedD1
+0x080 KernelReserved : [15] 0
+0x0bc SecondLevelCacheSize : 0x400000
+0x0c0 HaReserved
+0x100 UnusedD2
+0x108 KdVersionBlock
: (null)
```

CHAPTER 2 System architecture     77


---

```bash
+0x110 UnusedD      : (null)
  +0x118 PcrAlign1    : [24] 0
  +0x180 Prcb       : _KPRCB
7kb_!prcb
PRCB for Processor 0 at ffff803c3b23180:
Current IRQL -- 0
Threads--  Current ffffe0020535a800 Next 0000000000000000 Idle ffff803c3b99740
Processor Index 0 Number (0, 0) GroupSetMember 1
Interrupt Count -- 0010d637
Times -- Dpc     000000f4 Interrupt 00000119
        Kernel 00000952 User      0000425d
```

You can also use the dt command to directly dump the KRPCB data structures because the

debugger command gives you the address of the structure (shown in bold for clarity in the previ ous output). For example, if you wanted to determine the speed of the processor as detected at

boot, you could look at the MHz field with the following command:

```bash
1kdt-dt_nt_LxPRCB_FFFFF803c3b23180 MHz
+0x5f484  MHz:  0x893
1kdt-7  0x893
Evaluate expression: 2195 = 00000000*00000893
```

On this machine, the processor was running at about 2.2 GHz during boot-up.

## Hardware support

The other major job of the kernel is to abstract or isolate the executive and device drivers from variations between the hardware architectures supported by Windows. This job includes handling variations in functions such as interrupt handling, exception dispatching, and multiprocessor synchronization.

Even for these hardware-related functions, the design of the kernel attempts to maximize the

amount of common code. The kernel supports a set of interfaces that are portable and semantically

identical across architectures. Most of the code that implements these portable interfaces is also identi cal across architectures.

Some of these interfaces are implemented differently on different architectures or are partially implemented with architecture-specific code. These architecturally independent interfaces can be called on any machine, and the semantics of the interface will be the same regardless of whether the code varies by architecture. Some kernel interfaces, such as spinlock routines, described in Chapter 8 in Part 2, are actually implemented in the HAL (described in the next section) because their implementation can vary for systems within the same architecture family.

The kernel also contains a small amount of code with x86-specific interfaces needed to support

old 16-bit MS-DOS programs (on 32-bit systems). These x86 interfaces aren't portable in the sense

that they can't be called on a machine based on any other architecture; they won't be present. This

x86-specific code, for example, supports calls to use Virtual 8086 mode, required for the emulation

of certain real-mode code on older video cards.

---

Other examples of architecture-specific code in the kernel include the interfaces to provide translation buffer and CPU cache support. This support requires different code for the different architectures because of the way caches are implemented.

Another example is context switching. Although at a high level the same algorithm is used for thread selection and context switching (the context of the previous thread is saved, the context of the new thread is loaded, and the new thread is started), there are architectural differences among the implementations on different processors. Because the context is described by the processor state (registers and so on), what is saved and loaded varies depending on the architecture.

## Hardware abstraction layer

As mentioned at the beginning of this chapter, one of the crucial elements of the Windows design is its portability across a variety of hardware platforms. With OneCore and the myriad device form factors available, this is more important than ever. The hardware abstraction layer (HAL) is a key part of making this portability possible. The HAL is a loadable kernel-mode module (Hal dll) that provides the lowlevel interface to the hardware platform on which Windows is running. It hides hardware-dependent details such as I/O interfaces, interrupt controllers, and multiprocessor communication mechanisms— any functions that are both architecture-specific and machine-dependent.

So rather than access hardware directly, Windows internal components and user-written device

drivers maintain portability by calling the HAL routines when they need platform-dependent informa tion. For this reason, many HAL routines are documented in the WDK. To find out more about the HAL

and its use by device drivers, refer to the WDK.

Although a couple of x86 HALs are included in a standard desktop Windows installation (as shown in Table 2-4), Windows has the ability to detect at boot-up time which HAL should be used, eliminating the problem that existed on earlier versions of Windows when attempting to boot a Windows installation on a different kind of system.

TABLE 2-4 List of x86 HALs

<table><tr><td>HAL File Name</td><td>Systems Supported</td></tr><tr><td>Halacpi.dll</td><td>Advanced Configuration and Power Interface (ACPI) PCs. Implies uniprocessor-only machine, without APIC support. (The presence of either one would make the system use the HAL below instead.)</td></tr><tr><td>Halmacpi.dll</td><td>Advanced Programmable Interrupt Controller (APIC) PCs with an ACPI. The existence of an APIC implies SMP support.</td></tr></table>


On x64 and ARM machines, there is only one HAL image, called Hal.dll. This results from all x64 machines having the same motherboard configuration, because the processors require ACPI and APIC support. Therefore, there is no need to support machines without ACPI or with a standard PIC. Similarly, all ARM systems have ACPI and use interrupt controllers, which are similar to a standard APIC. Once again, a single HAL can support this.

On the other hand, although such interrupt controllers are similar, they are not identical. Additionally, the actual timer and memory/DMA controllers on some ARM systems are different from others.

CHAPTER 2 System architecture     79


---

Finally, in the IoT world, certain standard PC hardware such as the Intel DMA controller may not be present and might require support for a different controller, even on PC-based systems. Older versions of Windows handled this by forcing each vendor to ship a custom HAL for each possible platform combination. This is no longer realistic, however, and results in significant amounts of duplicated code. Instead, Windows now supports modules known as HAL extensions, which are additional DLLs on disk that the boot loader may load if specific hardware requiring them is needed (usually through ACPI and registrybased configuration). Your desktop Windows 10 system is likely to include a HalExtPLO80.dll and HalExtIncpioDMA.dll, the latter of which is used on certain low-power Intel platforms, for example.

Creating HAL extensions requires collaboration with Microsoft, and such files must be custom

signed with a special HAL extension certificate available only to hardware vendors. Additionally, they

are highly limited in the APIs they can use and interact through a limited import/export table mecha nism that does not use the traditional PE image mechanism. For example, the following experiment will

not show you any functions if you try to use it on a HAL extension.

## EXPERIMENT: Viewing Ntoskrnl.exe and HAL image dependencies

You can view the relationship of the kernel and HAL images by using the Dependency Walker tool (Depends.exe) to examine their export and import tables. To examine an image in the Dependency Walker, open the File menu, choose Open, and select the desired image file.

Here is a sample of output you can see by viewing the dependencies of Ntoskrnl.exe using this tool (for now, disregard the errors displayed by Dependency Walker's inability to parse the API sets):

![Figure](figures/Winternals7thPt1_page_097_figure_005.png)

Notice that Ntskrnl.exe is linked against the HAL, which is in turn linked against Ntskrnl.exe. (They both use functions in each other.) Ntskrnl.exe is also linked to the following binaries:

- ■ Pshed.dll The Platform-Specific Hardware Error Driver (PSHED) provides an abstraction of

the hardware error reporting facilities of the underlying platform. It does this by hiding the

details of a platform's error-handling mechanisms from the OS and exposing a consistent

interface to the Windows OS.
---

■ Bootvid.dll The Boot Video Driver on x86 systems (Bootvid) provides support for the VGA commands required to display boot text and the boot logo during startup. ■ Kdcom.dll This is the Kernel Debugger Protocol (KD) communications library. ■ C.idl This is the integrity library. (See Chapter 8 in Part 2 for more information on code integrity.) ■ Mspc.sys The Microsoft Remote Procedure Call (RPC) client driver for kernel mode allows the kernel (and other drivers) to communicate with user-mode services through RPC or to marshal MES-encoded assets. For example, the kernel uses this to marshal data to and from the user-mode Plug-and-Play service.

For a detailed description of the information displayed by this tool, see the Dependency Walker help file (Depends.hlp).

We ask you to disregard the errors that Dependency Walker has parsing API Sets because its authors have not updated it to correctly handle this mechanism. While the implementation of API Sets will be described in Chapter 3 in the "Image loader" section, you should use the Dependency Walker output to review what other dependencies the kernel may potentially have, depending on SKU, as these API Sets indeed point to real modules. Note that when dealing with API Sets, they are described in terms of contracts, not DLLs or libraries. It's important to realize that any number (or even all) of these contracts might be absent from your machine. Their presence depends on a combination of factors: SKU, platform, and vendor.

■ Werkernel contract This provides support for Windows Error Reporting (WER) in the kernel, such as with live kernel dump creation.

■ Tm contract This is the kernel transaction manager (KTM), described in Chapter 8 in Part 2.

■ Kcminitcfg contract This is responsible for the custom initial registry configuration that may be needed on specific platforms.

■ Ksr contract This handles Kernel Soft Reboot (KSR) and the required persistence of certain memory ranges to support it, specifically on certain mobile and IoT platforms.

■ Security contract This contains additional policies for AppContainer processes (that is, Windows Apps) running in user mode on certain devices and SKUs.

■ Ksigningpolicy contract This contains additional policies for user-mode code integrity (UMCI) to either support non-AppContainer processes on certain SKUs or FURTHER configure Device Guard and/or App Locker security features on certain platforms/SKUs.

■ Ucode contract This is the microcode update library for platforms that can support processor microcode updates, such as Intel and AMD.

■ Cifs contract This is the Common Log File System driver, used by (among other things) the Transactional Registry (TxR). For more information on TxR, see Chapter 8 in Part 2.

CHAPTER 2 System architecture 81


---

- • Ium Contract These are additional policies for IUM Trustlets running on the system,
which may be needed on certain SKUs, such as for providing shielded VMs on Datacenter
Server. Trustlets are described further in Chapter 3.
## Device drivers

Although device drivers are explained in detail in Chapter 6, this section provides a brief overview of the types of drivers and explains how to list the drivers installed and loaded on your system.

Windows supports kernel-mode and user-mode drivers, but this section discussed the kernel drivers only. The term device driver implies a hardware device, but there are other device driver types that are not directly related to hardware (listed momentarily). This section focuses on device drivers that are related to controlling a hardware device.

Device drivers are loadable kernel-mode modules (files typically ending with the .sys extension) that

interface between the I/O manager and the relevant hardware. They run in kernel mode in one of three

contexts:

- ■ In the context of the user thread that initiated an I/O function (such as a read operation)

■ In the context of a kernel-mode system thread (such as a request from the Plug and Play manager)

■ As a result of an interrupt and therefore not in the context of any particular thread but rather of

whichever thread was current when the interrupt occurred
As stated in the preceding section, device drivers in Windows don't manipulate hardware directly. Rather, they call functions in the HAL to interface with the hardware. Drivers are typically written in C and/or C++. Therefore, with proper use of HAL routines, they can be source-code portable across the CPU architectures supported by Windows and binary portable within an architecture family.

There are several types of device drivers:

- ■ Hardware device drivers These use the HAL to manipulate hardware to write output to or
retrieve input from a physical device or network. There are many types of hardware device
drivers, such as bus drivers, human interface drivers, mass storage drivers, and so on.
■ File system drivers These are Windows drivers that accept file-oriented I/O requests and
translate them into I/O requests bound for a particular device.
■ File system filter drivers These include drivers that perform disk mirroring and encryption
or scanning to locate viruses, intercept I/O requests, and perform some added-value processing
before passing the I/O to the next layer (or in some cases rejecting the operation).
■ Network redirectors and servers These are file system drivers that transmit file system I/O
requests to a machine on the network and receive such requests, respectively.
■ Protocol drivers These implement a networking protocol such as TCP/IP, NetBEUI, and IPX/SPX.
---

- ■ Kernel streaming filter drivers These are chained together to perform signal processing on
data streams, such as recording or displaying audio and video.

■ Software drivers These are kernel modules that perform operations that can only be done
in kernel mode on behalf of some user-mode process. Many utilities from Sysinternals such as
Process Explorer and Process Monitor use drivers to get information or perform operations that
are not possible to do from user-mode APIs.
## Windows driver model

The original driver model was created in the first NT version (3.1) and did not support the concept of Plug and Play (PnP) because it was not yet available. This remained the case until Windows 2000 came along (and Windows 95/98 on the consumer Windows side).

Windows 2000 added support for PnP, Power Options, and an extension to the Windows NT driver model called the Windows Driver Model (WDM). Windows 2000 and later can run legacy Windows NT 4 drivers, but because these don’t support PnP and Power Options, systems running these drivers will have reduced capabilities in these two areas.

Originally, WDM provided a common driver model that was (almost) source compatible between

Windows 2000/XP and Windows 98/ME. This was done to make it easier to write drivers for hardware

devices, since a single code base was needed instead of two. WDM was simulated on Windows 98/ME.

Once these operating systems were no longer used, WDM remained the base model for writing drivers

for hardware devices for Windows 2000 and later versions.

From the WDM perspective, there are three kinds of drivers:

- ■ Bus drivers A bus driver services a bus controller, adapter, bridge, or any device that has child
devices. Bus drivers are required drivers, and Microsoft generally provides them. Each type of
bus (such as PCI, PCMCIA, and USB) on a system has one bus driver. Third parties can write bus
drivers to provide support for new buses, such as VMDBus, Multibus, and Futurebus.

■ Function drivers A function driver is the main device driver and provides the operational
interface for its device. It is a required driver unless the device is used raw, an implementation in
which I/O is done by the bus driver and any bus filter drivers, such as SCSI PassThru. A function
driver is by definition the driver that knows the most about a particular device, and it is usually
the only driver that accesses device-specific registers.

■ Filter drivers A filter driver is used to add functionality to a device or existing driver, or to
modify I/O requests or responses from other drivers. It is often used to fix hardware that pro-
vides incorrect information about its hardware resource requirements. Filter drivers are optional
and can exist in any number, placed above or below a function driver and above a bus driver.
Usually, system original equipment manufacturers (OEMs) or independent hardware vendors
(IHVs) supply filter drivers.
In the WDM driver environment, no single driver controls all aspects of a device. A bus driver is

concerned with reporting the devices on its bus to PnP manager, while a function driver manipulates

the device.

CHAPTER 2 System architecture     83


---

In most cases, lower-level filter drivers modify the behavior of device hardware. For example, if a device reports to its bus driver that it requires 4 I/O ports when it actually requires 16 I/O ports, a lowerlevel, device-specific function filter driver could intercept the list of hardware resources reported by the bus driver to the PnP manager and update the count of I/O ports.

Upper-level filter drivers usually provide added-value features for a device. For example, an upperlevel device filter driver for a disk can enforce additional security checks.

Interrupt processing is explained in Chapter 8 in Part 2 and in the narrow context of device drivers, in Chapter 6. Further details about the I/O manager, WDM, Plug and Play, and power management are also covered in Chapter 6.

## Windows Driver Foundation

The Windows Driver Foundation (WDF) simplifies Windows driver development by providing two frameworks: the Kernel-Mode Driver Framework (KMDF) and the User-Mode Driver Framework (UMDF). Developers can use KMDF to write drivers for Windows 2000 SP4 and later, while UMDF supports Windows XP and later.

KMDF provides a simple interface to WDM and hides its complexity from the driver writer without

modifying the underlying bus/function/filter model. KMDF drivers respond to events that they can

register and call into the KMDF library to perform work that isn't specific to the hardware they are

managing, such as generic power management or synchronization. (Previously, each driver had to

implement this on its own.) In some cases, more than 200 lines of WDM code can be replaced by a

single KMDF function call.

UMDF enables certain classes of drivers—mostly USB-based or other high-latency protocol buses, such as those for video cameras, MP3 players, cell phones, and printers—to be implemented as usermode drivers. UMDF runs each user-mode driver in what is essentially a user-mode service, and it uses ALPC to communicate to a kernel-mode wrapper driver that provides actual access to hardware. If a UMDF driver crashes, the process dies and usually restarts. That way, the system doesn’t become unstable; the device simply becomes unavailable while the service hosting the driver restarts.

UMDF has two major versions: version 1.x is available for all OS versions that support UMDF, the latest and last being version 1.11, available in Windows 10. This version uses C++ and COM for driver writing, which is rather convenient for user-mode programmers, but it makes the UMDF model different from KMDF. Version 2.0 of UMDF, introduced in Windows 8.1, is based around the same object model as KMDF, making the two frameworks very similar in their programming model. Finally, WDF has been open-sourced by Microsoft, and at the time of this writing is available on GitHub at https://github.com/Microsoft/Windows-Driver-Frameworks.

---

## Universal Windows drivers

Starting with Windows 10, the term Universal Windows drivers refers to the ability to write device drivers once that share APIs and Device Driver Interfaces (DDIs) provided by the Windows 10 common core. These drivers are binary-compatible for a specific CPU architecture (x86, x64, ARM) and can be used as is on a variety of form factors, from IoT devices, to phones, to the HoloLens and Xbox One, to laptops and desktops. Universal drivers can use KMDF, UDMF 2.x, or WDM as their driver model.

## EXPERIMENT: Viewing the installed device drivers

To list the installed drivers, run the System Information tool (Msinfo32.exe). To launch this tool, click Start and then type Mfsinfo32 to locate it. Under System Summary, expand Software Environment and open System Drivers. Here's an example output of the list of installed drivers:

![Figure](figures/Winternals7thPt1_page_102_figure_004.png)

This window displays the list of device drivers defined in the registry, their type, and their state (Running or Stopped). Device drivers and Windows service processes are both defined in the same place: HKLM\SYSTEM\CurrentControlSet\Services. However, they are distinguished by a type code. For example, type 1 is a kernel-mode device driver. For a complete list of the information stored in the registry for device drivers, see Chapter 9 in Part 2.

Alternatively, you can list the currently loaded device drivers by selecting the System process

in Process Explorer and opening the DLL view. Here's a sample output. (To get the extra columns,

right-click a column header and click Select Columns to see all the available columns for modules

in the DLL tab.)

---

![Figure](figures/Winternals7thPt1_page_103_figure_000.png)

## Peering into undocumented interfaces

Examining the names of the exported or global symbols in key system images (such as Ntskrnl. exe, Hal.dll, or Ntlld.dll) can be enlightening—you can get an idea of the kinds of things Windows can do versus what happens to be documented and supported today. Of course, just because you know the names of these functions doesn’t mean that you can or should call them—the interfaces are undocumented and are subject to change. We suggest that you look at these functions purely to gain more insight into the kinds of internal functions Windows performs, not to bypass supported interfaces.

For example, looking at the list of functions in Ntll.dll gives you the list of all the system services that Windows provides to user-mode subsystem DLLs versus the subset that each subsystem exposes. Although many of these functions map clearly to documented and supported Windows functions, several are not exposed via the Windows API.

Conversely, it's also interesting to examine the imports of Windows subsystem DLLs (such as kernel32.dll or Advapi32.dll) and which functions they call in Ndisll.dll.

Another interesting image to dump is Ntlskrnl.exe—although many of the exported routines that kernel-mode device drivers use are documented in the WDK, quite a few are not. You might also find it interesting to take a look at the import table for Ntlskrnl.exe and the HAL; this table shows the list of functions in the HAL that Ntlskrnl.exe uses and vice versa.

Table 2-5 lists most of the commonly used function name prefixes for the executive components. Each of these major executive components also uses a variation of the prefix to denote internal functions—either the first letter of the prefix followed by an i (for internal) or the full prefix followed by a p (for private). For example, Ki represents internal kernel functions, and PsP refers to internal process support functions.

86 CHAPTER 2 System architecture


---

TABLE 2-5 Commonly Used Prefixes

<table><tr><td>Prefix</td><td>Component</td></tr><tr><td>A1pc</td><td>Advanced Local Procedure Calls</td></tr><tr><td>Cc</td><td>Common Cache</td></tr><tr><td>Cm</td><td>Configuration manager</td></tr><tr><td>Dbg</td><td>Kernel debug support</td></tr><tr><td>Dbgk</td><td>Debugging Framework for user mode</td></tr><tr><td>Em</td><td>Errata manager</td></tr><tr><td>Etw</td><td>Event Tracing for Windows</td></tr><tr><td>Ex</td><td>Executive support routines</td></tr><tr><td>FsRt1</td><td>File System Runtime Library</td></tr><tr><td>Hv</td><td>Hive library</td></tr><tr><td>Hv1</td><td>Hypervisor library</td></tr><tr><td>Io</td><td>I/O manager</td></tr><tr><td>Kd</td><td>Kernel debugger</td></tr><tr><td>Ke</td><td>Kernel</td></tr><tr><td>Kse</td><td>Kernel Shim Engine</td></tr><tr><td>Lsa</td><td>Local Security Authority</td></tr><tr><td>Mm</td><td>Memory manager</td></tr><tr><td>Nt</td><td>NT system services (accessible from user mode through system calls)</td></tr><tr><td>Ob</td><td>Object manager</td></tr><tr><td>Pf</td><td>Prefetcher</td></tr><tr><td>Po</td><td>Power manager</td></tr><tr><td>PoFx</td><td>Power framework</td></tr><tr><td>Pp</td><td>PnP manager</td></tr><tr><td>Ppm</td><td>Processor power manager</td></tr><tr><td>Ps</td><td>Process support</td></tr><tr><td>Rt1</td><td>Run-time library</td></tr><tr><td>Se</td><td>Security Reference Monitor</td></tr><tr><td>Sm</td><td>Store Manager</td></tr><tr><td>Tm</td><td>Transaction manager</td></tr><tr><td>Ttm</td><td>Terminal timeout manager</td></tr><tr><td>Vf</td><td>Driver Verifier</td></tr></table>


CHAPTER 2    System architecture      87


---

TABLE 2-5 Commonly Used Prefixes (Continued)

<table><tr><td>Prefix</td><td>Component</td></tr><tr><td>Vsl</td><td>Virtual Secure Mode library</td></tr><tr><td>Wdi</td><td>Windows Diagnostic Infrastructure</td></tr><tr><td>Wfp</td><td>Windows FingerPrint</td></tr><tr><td>Whea</td><td>Windows Hardware Error Architecture</td></tr><tr><td>Wmi</td><td>Windows Management Instrumentation</td></tr><tr><td>Zw</td><td>Mirer entry point for system services (beginning with Nt) that sets previous access mode to kernel, which eliminates parameter validation, because Nt system services validate parameters only if previous access mode is user</td></tr></table>


You can decipher the names of these exported functions more easily if you understand the

naming convention for Windows system routines. The general format is

```bash
<Prefix>Operation><Object>
```

In this format, Prefix is the internal component that exports the routine, Operation tells what is

being done to the object or resource, and Object identifies what is being operated on.

For example, ExAlllocatePoolWithT ag is the executive support routine to allocate from

a paged or non-paged pool. KeInitializeThread is the routine that allocates and sets up a

kernel thread object.

## System processes

The following system processes appear on every Windows 10 system. One of these (Idle) is not a process at all, and three of them—System, Secure System, and Memory Compression—are not full processes because they are not running a user-mode executable. These types of processes are called minimal processes and are described in Chapter 3.

- ■ Idle process This contains one thread per CPU to account for idle CPU time.
■ System process This contains the majority of the kernel-mode system threads and handles.
■ Secure System process This contains the address space of the secure kernel in VTL 1, if running.
■ Memory Compression process This contains the compressed working set of user-mode
processes, as described in Chapter 5.
■ Session manager (Smss.exe).
■ Windows subsystem (Csrss.exe).
■ Session 0 initialization (Wininit.exe).
■ Logon process (Winlogon.exe).

APTER 2 System architecture

From the Library of I
---

- ■ Service Control Manager (Services.exe) and the child service processes it creates such as the

system-supplied generic service-host process (Svchost.exe).

■ Local Security Authentication Service (Lsas.exe), and if Credential Guard is active, the

Isolated Local Security Authentication Server (Lsaiso.exe).
To understand how these processes are related, it is helpful to view the process tree—that is, the parent/child relationship between processes. Seeing which process created each process helps to understand where each process comes from. Figure 2-6 shows the process tree following a Process Monitor boot trace. To conduct a boot trace, open the Process Monitor Options menu and select Enable Boot Logging. Then restart the system, open Process Monitor again, and open the Tools menu and choose Process Tree or press Ctrl+T. Using Process Monitor enables you to see processes that have since exited, indicated by the faded icon.

![Figure](figures/Winternals7thPt1_page_106_figure_002.png)

FIGURE 2-6 The initial system process tree.

The next sections explain the key system processes shown in Figure 2-6. Although these sections

briefly indicate the order of process startup, Chapter 11 in Part 2, contains a detailed description of the

steps involved in booting and starting Windows.

## System idle process

The first process listed in Figure 2-6 is the Idle process. As discussed in Chapter 3, processes are identified by their image name. However, this process—as well as the System, Secure System, and Memory Compression processes—isn't running a real user-mode image. That is, there is no "System Idle Process.exe" in the Windows directory. In addition, because of implementation details, the name shown for this process differs from utility to utility. The Idle process accounts for idle time. That's why the number of "threads" in this "process" is the number of logical processors on the system. Table 2-6 lists several of the names given to the Idle process (process ID 0). The Idle process is explained in detail in Chapter 3.

CHAPTER 2 System architecture 89

From the Library of Mich

---

TABLE 2-6 Names for process ID 0 in various utilities

<table><tr><td>Utility</td><td>Name for Process ID 0</td></tr><tr><td>Task Manager</td><td>System idle process</td></tr><tr><td>Process Status (Pstat.exe)</td><td>Idle process</td></tr><tr><td>Process Explorer (Proexp.exe)</td><td>System idle process</td></tr><tr><td>Task List (Tasklist.exe)</td><td>System idle process</td></tr><tr><td>Tlist (Tlist.exe)</td><td>System process</td></tr></table>


Now let's look at system threads and the purpose of each of the system processes that are running real images.

## System process and system threads

The System process (process ID 4) is the home for a special kind of thread that runs only in kernel mode: a kernel-mode system thread. System threads have all the attributes and contexts of regular user-mode threads such as a hardware context, priority, and so on, but differ in that they run only in kernel-mode executing code loaded in system space, whether that is in Ntsoskrnl.exe or in any other loaded device driver. In addition, system threads don't have a user process address space and hence must allocate any dynamic storage from OS memory heaps, such as a paged or non-paged pool.

![Figure](figures/Winternals7thPt1_page_107_figure_005.png)

Note On Windows 10 Version 1511, Task Manager calls the System process System and Compressed Memory. This is because of a new feature in Windows 10 that compresses memory to save more process information in memory rather than page it out to disk. This mechanism is further described in Chapter 5. Just remember that the term System process refers to this one, no matter the exact name displayed by this tool or another. Windows 10 Version 1607 and Server 2016 revert the name of the System process to System. This is because a new process called Memory Compression is used for compressing memory. Chapter 5 discusses this process in more detail.

System threads are created by the PscCreateSystemThread or IoCreateSystemThread functions, both documented in the WDK. These threads can be called only from kernel mode. Windows, as well as various device drivers, create system threads during system initialization to perform operations that require thread context, such as issuing and waiting for I/Os or other objects or polling a device. For example, the memory manager uses system threads to implement such functions as writing dirty pages to the page file or mapped files, swapping processes in and out of memory, and so forth. The kernel creates a system thread called the balance set manager that wakes up once per second to possibly initiate various scheduling and memory-management related events. The cache manager also uses system threads to implement both read-ahead and write-behind I/Os. The file server device driver (Srv2.sys) uses system threads to respond to network I/O requests for file data on disk partitions shared to the network. Even the floppy driver has a system thread to poll the floppy device. (Polling is more efficient in this case because an interrupt-driven floppy driver consumes a large amount of system

90 CHAPTER 2 System architecture


---

resources.) Further information on specific system threads is included in the chapters in which the corresponding component is described.

By default, system threads are owned by the System process, but a device driver can create a system thread in any process. For example, the Windows subsystem device driver (Win32x.sys) creates a system thread inside the Canonical Display Driver (Cdd.dll) part of the Windows subsystem process (Csrss.exe) so that it can easily access data in the user-mode address space of that process.

When you're troubleshooting or going through a system analysis, it's useful to be able to map the execution of individual system threads back to the driver or even to the subroutine that contains the code. For example, on a heavily loaded file server, the System process will likely consume considerable CPU time. But knowing that when the System process is running, "some system thread" is running isn't enough to determine which device driver or OS component is running.

So if threads in the System process are running, first determine which ones are running (for example, with the Performance Monitor or Process Explorer tools). Once you find the thread (or threads) that is running, look up in which driver the system thread began execution. This at least tells you which driver likely created the thread. For example, in Process Explorer, right-click the System process and select Properties. Then, in the Threads tab, click the CPU column header to view the most active thread at the top. Select this thread and click the Module button to see the file from which the code on the top of stack is running. Because the System process is protected in recent versions of Windows, Process Explorer is unable to show a call stack.

## Secure System process

The Secure System process (variable process ID) is technically the home of the VTL 1 secure kernel address space, handles, and system threads. That being said, because scheduling, object management, and memory management are owned by the VTL 0 kernel, no such actual entities will be associated with this process. Its only real use is to provide a visual indicator to users (for example, in tools such as Task Manager and Process Explorer) that VBS is currently active (providing at least one of the features that leverages it).

## Memory Compression process

The Memory Compression process uses its user-mode address space to store the compressed pages of memory that correspond to standby memory that's been evicted from the working sets of certain processes, as described in Chapter 5. Unlike the Secure System process, the Memory Compression process does actually host a number of system threads, usually seen as SmKmStoreHandlePer-worker and SmSTreadThread. Both of these belong to the Store Manager that manages memory compression.

Additionally, unlike the other System processes in this list, this process actually stores its memory in

the user-mode address space. This means it is subject to working set trimming and will potentially have

large visible memory usage in system-monitoring tools. In fact, if you view the Performance tab in T ask

Manager, which now shows both in-use and compressed memory, you should see that the size of the

Memory Compression process's working set is equal to the amount of compressed memory.

---

## Session Manager

The Session Manager (%SystemRoot%\System32\Smss.exe) is the first user-mode process created in

the system. The kernel-mode system thread that performs the final phase of the initialization of the

executive and kernel creates this process. It is created as a Protected Process Light (PPL), as described

in Chapter 3.

When Smss.exe starts, it checks whether it is the first instance (the master Smss.exe) or an instance of itself that the master Smss.exe launched to create a session. If command-line arguments are present, it is the latter. By creating multiple instances of itself during boot-up and Terminal Services session creation, Smss.exe can create multiple sessions at the same time—as many as four concurrent sessions, plus one more for each extra CPU beyond one. This ability enhances logon performance on Terminal Server systems where multiple users connect at the same time. Once a session finishes initializing, the copy of Smss.exe terminates. As a result, only the initial Smss.exe process remains active. (For a description of Terminal Services, see the section "Terminal Services and multiple sessions" in Chapter 1.)

The master Smss.exe performs the following one-time initialization steps:

- 1. It marks the process and the initial thread as critical. If a process or thread marked critical exits
for any reason, Windows crashes. See Chapter 3 for more information.

2. It causes the process to treat certain errors as critical, such as invalid handle usage and heap
corruption, and enables the Disable Dynamic Code Execution process mitigation.

3. It increases the process base priority to 11.

4. If the system supports hot processor add, it enables automatic processor affinity updates. That
way, if new processors are added, new sessions will take advantage of the new processors. For
more information about dynamic processor additions, see Chapter 4.

5. It initializes a thread pool to handle ALPC commands and other work items.

6. It creates an ALPC port named \SmApiPort to receive commands.

7. It initializes a local copy of the NUMA topology of the system.

8. It creates a mutex named PendingRenameMutex to synchronize file-rename operations.

9. It creates the initial process environment block and updates the Safe Mode variable if needed.

10. Based on the ProtectionMode value in the HKLM\SYSTEM\CurrentControlSet\Control\Session
Manager key, it creates the security descriptors that will be used for various system resources.

11. Based on the ObjectDirectory value in the HKLM\SYSTEM\CurrentControlSet\Control\
Session Manager key, it creates the object manager directories that are described, such as \
RPC Control and Windows. It also saves the programs listed under the values BootExecute,
BootExecuteNoPnpSync, and SetupExecute.

12. It saves the program path listed in the $O\text{InitialCommand value under the HKLM\SYSTEM\
CurrentControlSet\Control\Session Manager key.
---

13. It reads the NumberOfInitialSessions value from the HKLM\SYSTEM\CurrentControlSet\ Control\SessionManager key, but ignores it if the system is in manufacturing mode.

14. It reads the file rename operations listed under the PendingFileRenameOperations2 values from the HKLM\SYSTEM\CurrentControlSet\Control\ Session Manager key.

15. It reads the value of the AllowProtectedRenames, ClearTempFiles, CurrentDirectory, and DisableIwptExecution values in the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager key.

16. It reads the list of DLLs in the ExcludeKnownDtls list value found under the HKLM\SYSTEM\ CurrentControlSet\Control\SessionManager key.

17. It reads the paging file information stored in the HKLM\SYSTEM\CurrentControlSet\Control\ Session Manager\Memory Management key, such as the PagingFiles and ExistingPagesFiles list values and the PageFileOnVsVolume and WaitForPagingFiles configuration values.

18. It reads and saves the value stored in the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\DNS Devices key.

19. It reads and saves the KnowDlls value list stored in the HKLM\SYSTEM\CurrentControlSet\ Control\Session Manager key.

20. It creates system-wide environment variables as defined in HKLM\SYSTEM\CurrentControlSet\ Control\SessionManager\Environment.

21. It creates the \KnownDlls directory, as well as \KnownDlls32 on 64-bit systems with WoW64.

22. It creates symbolic links for devices defined in HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Global?? directory under the \Global?? directory in the object manager namespace.

23. It creates a root \Sessions directory in the object manager namespace.

24. It creates protected mailslot and named pipe prefixes to protect service applications from spoofing attacks that could occur if a malicious user-mode application executes before a service does.

25. It runs the programs part of the BootExecute and BootExecuteNoPnpSync lists parsed earlier. (The default is Autochk.exe, which performs a disk check.)

26. It initializes the rest of the registry (HKLM software, SAM, and security hives).

27. Unless disabled by the registry, it executes the Windows Platform Binary Table (WPBT) binary registered in the respective ACPI table. This is often used by anti-theft vendors to force the execution of a very early native Windows binary that can call home or set up other services for execution, even on a freshly installed system. These processes must link with Ntstdll only (that is, belong to the native subsystem).

28. It processes pending file renames specified in the registry keys seen earlier unless this is a Windows Recovery Environment boot.

CHAPTER 2 System architecture 93


---

29. It initializes paging file(s) and dedicated dump file information based on the HKLM\System\_

CurrentControlSet[Control]Session Manager Memory Management and HKLM\SystemCurrentControls\Control\CrashControl keys.

30. It checks the system's compatibility with memory cooling technology, used on NUMA systems.

31. It saves the old paging file, creates the dedicated crash dump file, and creates new paging files as needed based on previous crash information.

32. It creates additional dynamic environment variables, such as PROCESSOR_ARCHITECTURE,

PROCESSOR_LEVEL, PROCESSOR_IDENTIFIER, and PROCESSOR_REVISION, which are based on

registry settings and system information queried from the kernel.

33. It runs the programs in HKLM\SYSTEM\CurrentControlSet\Control\SessionManager\SetupExecute. The rules for these executables are the same as for Boot\Execute in step 11.

34. It creates an unnamed section object that is shared by child processes (for example, Css.exe)

for information exchanged with Sms.exe. The handle to this section is passed to child processes

via handle inheritance. For more on handle inheritance, see Chapter 8 in Part 2.

35. It opens known DLLs and maps them as permanent sections (mapped files) except those listed

as exclusions in the earlier registry checks (none listed by default).

36. It creates a thread to respond to session create requests.

37. It creates the Smss.exe instance to initialize session 0 (non-interactive session).

38. It creates the Smss.exe instance to initialize session 1 (interactive session) and, if configured in the registry, creates additional Smss.exe instances for extra interactive sessions to prepare itself in advance for potential future user logons. When Smss.exe creates these instances, it requests the explicit creation of a new session ID using the PROCESS_CREATE_NEW_SESSION flag in NtCreateUserProcess each time. This has the effect of calling the internal memory manager function MsiSessionCreate, which creates the required kernel-mode session data structures (such as the Session object) and sets up the Session Space virtual address range that is used by the kernel-mode part of the Windows subsystem (Win32k.sys) and other session-space device drivers. See Chapter 5 for more details.

After these steps have been completed, $mss.exe waits forever on the handle to the session 0

instance of Cssr.exe. Because Cssr.exe is marked as a critical process (and is also a protected process;

see Chapter 3), if Cssr.exe exits, this wait will never complete because the system will crash.

A session startup instance of Smss.exe does the following:

- ■ It creates the subsystem process(es) for the session (by default, the Windows subsystem Css.exe).
■ It creates an instance of Winlogon (interactive sessions) or the Session 0 Initial Command, which
is Wininit (for session 0) by default unless modified by the registry values seen in the preceding
steps. See the upcoming paragraphs for more information on these two processes.
---

Finally, this intermediate Smss.exe process exits, leaving the subsystem processes and Winlogon or Wininit as parent-less processes.

Windows initialization process

The Wininit.exe process performs the following system initialization functions:

1. It marks itself and the main thread critical so that if it exits prematurely and the system is booted in debugging mode, it will break into the debugger. (Otherwise the system will crash.)

2. It causes the process to treat certain errors as critical, such as invalid handle usage and heap corruption.

3. It initializes for state separation, if the SKU supports it.

4. It creates an event named Global\FirstLogonCheck (this can be observed in Process Explorer or WinObj under the \BaseNamedObjects directory) for use by Winlogon processes to detect which Winlogon is first to launch.

5. It creates a WinlogonLogoff event in the \BaseNamedObjects object manager directory to be used by Winlogon instances. This event is signaled (set) when a Winlogon operation starts.

6. It increases its own process priority to high (13) and its main thread's priority to 15.

7. Unless configured otherwise with the NoDebugThread registry value in the HKLM\Software\ Microsoft\Windows NT\CurrentVersion\Winlogon key, it creates a periodic time queue, which will break into any user-mode process as specified by the kernel debugger. This enables remote kernel debuggers to cause Winlogon to attach and break into other user-mode applications.

8. It sets the machine name in the environment variable COMPUTEPNAME and then updates and configures TCP/IP-related information such as the domain name and host name

9. It sets the default profile environment variables USERPROFILE, ALLUSERSPROFILE, PUBLIC, and ProgramData.

10. It creates the temp directory by expanding %SystemRoot%\Temp (for example, C:\Windows\ Temp).

11. It sets up font loading and DWM if session 0 is an interactive session, which depends on the SKU.

12. It creates the initial terminal, which is composed of a window station (always named Winsta0) and two desktops (Winlogon and Default) for processes to run on in session 0.

13. It initializes the LSA machine encryption key, depending on whether it's stored locally or if it must be entered interactively. See Chapter 7 for more information on how local authentication keys are stored.

14. It creates the Service Control Manager (SCM or Services.exe). See the upcoming paragraphs for a brief description and Chapter 9 in Part 2 for more details.

CHAPTER 2 System architecture 95


---

- 15. It starts the Local Security Authentication Subsystem Service (Lsas.exe) and, if Credential Guard
is enabled, the Isolated LSA Trustlet (Lsaiso.exe). This also requires querying the VBS provision-
ing key from UEFI. See Chapter 7 for more information on Lsas.exe and Lsaiso.exe.

16. If Setup is currently pending (that is, if this is the first boot during a fresh install or an update to
a new major OS build or Insider Preview), it launches the setup program.

17. It waits forever for a request for system shutdown or for one of the aforementioned system
processes to terminate (unless the DontWatchSysProcs registry value is set in the Winlogon
key mentioned in step 7). In either case, it shuts down the system.
## Service control manager

Recall that with Windows, services can refer to either a server process or a device driver. This section deals with services that are user-mode processes. Services are like Linux daemon processes in that they can be configured to start automatically at system boot time without requiring an interactive logon. They can also be started manually, such as by running the Services administrative tool, using the sc.exe tool, or calling the Windows Start Service function. Typically, services do not interact with the logged-on user, although there are special conditions when this is possible. Additionally, while most services run in special service accounts (such as SYSTEM or LOCAL SERVICE), others can run with the same security context as logged-in user accounts. (For more, see Chapter 9 in Part 2.)

The Service Control Manager (SCM) is a special system process running the image %SystemRoot%\ System32\Services.exe that is responsible for starting, stopping, and interacting with service processes. It is also a protected process, making it difficult to tamper with. Service programs are really just Windows images that call special Windows functions to interact with the SCM to perform such actions as registering the service's successful startup, responding to status requests, or pausing or shutting down the service. Services are defined in the registry under HKLM\SYSTEM\CurrentControlSet\Services.

Keep in mind that services have three names: the process name you see running on the system, the internal name in the registry, and the display name shown in the Services administrative tool. (Not all services have a display name—if a service doesn’t have a display name, the internal name is shown.) Services can also have a description field that further details what the service does.

To map a service process to the services contained in that process, use the tlist /s (from Debugging Tools for Windows) or tasklist /svc (built-in Windows tool) command. Note that there isn't always one-to-one mapping between service processes and running services, however, because some services share a process with other services. In the registry, the T ype value under the service's key indicates whether the service runs in its own process or shares a process with other services in the image.

A number of Windows components are implemented as services, such as the Print Spooler, Event


Log, Task Scheduler, and various networking components. For more details on services, see Chapter 9

in Part 2.

---

## EXPERIMENT: Listing installed services

To list the installed services, open the Control Panel, select Administrative Tools, and select Services. Alternatively, click Start and run services.msc. You should see output like this:

![Figure](figures/Winternals7thPt1_page_114_figure_002.png)

To see the detailed properties of a service, right-click the service and select Properties.


For example, here are the properties of the Windows Update service:


1

![Figure](figures/Winternals7thPt1_page_114_figure_004.png)

Notice that the Path to Executable field identifies the program that contains this service and its command line. Remember that some services share a process with other services. Mapping isn't always one-to-one.

CHAPTER 2 System architecture 97

---

## EXPERIMENT: Viewing service details inside service processes

Process Explorer highlights processes hosting one service or more. (These processes are shaded pink color by default, but you can change this by opening the Options menu and choosing Configure Colors.) If you double-click a service-hosting process, you will see a Services tab that lists the services inside the process, the name of the registry key that defines the service, the display name seen by the administrator, the description text for that service (if present), and for Svchost. exe services, the path to the DLL that implements the service. For example, listing the services in one of the Svchost.exe processes running under the System account appears as follows:

![Figure](figures/Winternals7thPt1_page_115_figure_002.png)

## Winlogon, LogonUI, and Userinit

The Windows logon process (%SystemRoot%\System32\Winlogon.exe) handles interactive user logons and logoffs. Winlogon.exe is notified of a user logon request when the user enters the secure attention sequence (SAS) keystroke combination. The default SAS on Windows is Ctrl+Alt+Delete. The reason for the SAS is to protect users from password-capture programs that simulate the logon process because this keyboard sequence cannot be intercepted by a user-mode application.

The identification and authentication aspects of the logon process are implemented through DLLs

called credential providers. The standard Windows credential providers implement the default Windows

authentication interfaces: password and smartcard. Windows 10 provides a biometric credential pro vider: face recognition, known as Windows Hello. However, developers can provide their own credential

providers to implement other identification and authentication mechanisms instead of the standard

Windows user name/password method, such as one based on a voice print or a biometric device such

as a fingerprint reader. Because Winlogon.exe is a critical system process on which the system depends,

credential providers and the UI to display the logon dialog box run inside a child process of Winlogon.exe.

98 CHAPTER 2 System architecture

---

called LogonUI.exe. When Winlogon.exe detects the SAS, it launches this process, which initializes the credential providers. When the user enters their credentials (as required by the provider) or dismisses the logon interface, the LogonUI.exe process terminates. Winlogon.exe can also load additional network provider DLLs that need to perform secondary authentication. This capability allows multiple network providers to gather identification and authentication information all at one time during normal logon.

After the user name and password (or another information bundle as the credential provider requires) have been captured, they are sent to the Local Security Authentication Service process (Lsass.

exe, described in Chapter 7) to be authenticated. Lsass.exe calls the appropriate authentication pack age, implemented as a DLL, to perform the actual verification, such as checking whether a password

matches what is stored in the Active Directory or the SAM (the part of the registry that contains the

definition of the local users and groups). If Credential Guard is enabled, and this is a domain logon,

Lsass.exe will communicate with the Isolated LSA Trustlet (Lsaiso.exe, described in Chapter 7) to obtain

the machine key required to authenticate the legitimacy of the authentication request.

Upon successful authentication, Lsass.exe calls a function in the SRM (for example, NtCreateToken) to generate an access token object that contains the user's security profile. If User Account Control (UAC) is used and the user logging on is a member of the administrators group or has administrator privileges, Lsass.exe will create a second, restricted version of the token. This access token is then used by Winlogon to create the initial process(es) in the user's session. The initial process(es) are stored in the Userint registry value under the HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon registry key. The default is Userinit.exe, but there can be more than one image in the list.

Userinit.exe performs some initialization of the user environment, such as running the login script

and reestablishing network connections. It then looks in the registry at the Shell value (under the

same Winlogon key mentioned previously) and creates a process to run the system-defined shell (by

default, Explorer.exe). Then Userinit exits. This is why Explorer is shown with no parent. Its parent has

exited, and as explained in Chapter 1, tlist.exe and Process Explorer left-justify processes whose parent

isn't running. Another way of looking at it is that Explorer is the grandchild of Winlogon.exe.

Winlogon.exe is active not only during user logon and logout, but also whenever it intercepts the SAS from the keyboard. For example, when you press Ctrl+Alt+Delete while logged on, the Windows Security screen comes up, providing the options to log off, start the Task Manager, lock the workstation, shut down the system, and so forth. Winlogon.exe and LogonUI.exe are the processes that handle this interaction.

For a complete description of the steps involved in the logon process, see Chapter 11 in Part 2. For

more details on security authentication, see Chapter 7. For details on the callable functions that inter face with LSass.exe (the functions that start with Lsa), see the documentation in the Windows SDK.

## Conclusion

This chapter takes a broad look at the overall system architecture of Windows. It examines the key components of Windows and shows how they interrelate. In the next chapter, we'll look in more detail at processes, which are one of the most basic entities in Windows.

---

This page intentionally left blank


---

