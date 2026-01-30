## CHAPTER 6 I/O system

The Windows I/O system consists of several executive components that, together, manage hardware devices and provide interfaces to hardware devices for applications and the system. This chapter lists the design goals of the I/O system, which have influenced its implementation. It then covers the components that make up the I/O system, including the I/O manager, Plug and Play (PnP) manager, and power manager. Then it examines the structure and components of the I/O system and the various types of device drivers. It discusses the key data structures that describe devices, device drivers, and I/O requests, after which it describes the steps necessary to complete I/O requests as they move through the system. Finally, it presents the way device detection, driver installation, and power management work.

### I/O system components

The design goals for the Windows I/O system are to provide an abstraction of devices, both hardware (physical) and software (virtual or logical), to applications with the following features:

- <table><tr><td>Uniform security and naming across devices to protect shareable resources. (See Chapter 7, “Security,” for a description of the Windows security model.)</td></tr><tr><td>High-performance asynchronous packet-based I/O to allow for the implementation of scalable applications.</td></tr><tr><td>Services that allow drivers to be written in a high-level language and easily ported between different machine architectures.</td></tr><tr><td>Layering and extensibility to allow for the addition of drivers that transparently modify the behavior of other drivers or devices, without requiring any changes to the driver whose behavior or device is modified.</td></tr><tr><td>Dynamic loading and unloading of device drivers so that drivers can be loaded on demand and not consume system resources when unneeded.</td></tr><tr><td>Support for Plug and Play, where the system locates and installs drivers for newly detected hardware, assigns them hardware resources they require, and allows applications to discover and activate device interfaces.</td></tr><tr><td>Support for power management so that the system or individual devices can enter low-power states.</td></tr></table>
483


---

- ● Support for multiple installable file systems, including FAT (and its variants, FAT32 and exFAT),
the CD-ROM file system (CDFS), the Universal Disk Format (UDF) file system, the Resilient File
System (RefS), and the Windows file system (NTFS). (See Chapter 13, “File systems,” in Part 2 of
this book for more specific information on file system types and architecture.)
● Windows Management Instrumentation (WMI) support and diagnosability so that drivers can
be managed and monitored through WMI applications and scripts. (WMI is described in Chap-
ter 9, “Management mechanisms,” in Part 2.)
To implement these features, the Windows I/O system consists of several executive components as

well as device drivers, which are shown in Figure 6-1.

![Figure](figures/Winternals7thPt1_page_501_figure_002.png)

FIGURE 6-1 I/O system components.

- ■ The I/O manager is the heart of the I/O system. It connects applications and system compo-
nents to virtual, logical, and physical devices, and it defines the infrastructure that supports
device drivers.
■ A device driver typically provides an I/O interface for a particular type of device. A driver is a
software module that interprets high-level commands, such as read or write commands, and
issues low-level, device-specific commands, such as writing to control registers. Device drivers
receive commands routed to them by the I/O manager that are directed at the devices they
manage, and they inform the I/O manager when those commands are complete. Device drivers
often use the I/O manager to forward I/O commands to other device drivers that share in the
implementation of a device's interface or control.
484 CHAPTER 6 I/O system


---

- The PnP manager works closely with the I/O manager and a type of device driver called a bus
driver to guide the allocation of hardware resources as well as to detect and respond to the
arrival and removal of hardware devices. The PnP manager and bus drivers are responsible for
loading a device's driver when the device is detected. When a device is added to a system that
doesn't have an appropriate device driver, the executive Plug and Play component calls on the
device-installation services of the user-mode PnP manager.
The power manager also works closely with the I/O manager and the PnP manager to guide the
system, as well as individual device drivers, through power-state transitions.
WMI support routines, called the Windows Driver Model (WDM) WMI provider, allow device
drivers to indirectly act as providers, using the WDM WMI provider as an intermediary to com-
municate with the WMI service in user mode.
The registry serves as a database that stores a description of basic hardware devices attached
to the system as well as driver initialization and configuration settings. (See the section "The
registry" in Chapter 9 in Part 2 for more information.)
INF files, which are designated by the .inf extension, are driver-installation files. INF files are the
link between a particular hardware device and the driver that assumes primary control of that
device. They are made up of script-like instructions describing the device they correspond to,
the source and target locations of driver files, required driver-installation registry modifications,
and driver-dependency information. Digital signatures that Windows uses to verify that a driver
file has passed testing by the Microsoft Windows Hardware Quality Labs (WHQL) are stored in
.cat files. Digital signatures are also used to prevent tampering of the driver or its INF file.
The hardware abstraction layer (HAL) insulates drivers from the specifics of the processor and
interrupt controller by providing APIs that hide differences between platforms. In essence, the
HAL is the bus driver for all the devices soldered onto the computer's motherboard that aren't
controlled by other drivers.
## The I/O manager

The I/O manager is the core of the I/O system. It defines the orderly framework, or model, within which I/O requests are delivered to device drivers. The I/O system is packet driven. Most I/O requests are represented by an I/O request packet (IRP), which is a data structure that contains information completely describing an I/O request. The IRP travels from one I/O system component to another. (As you'll discover in the section "Fast I/O," fast I/O is the exception; it doesn't use IRPs.) The design allows an individual application thread to manage multiple I/O requests concurrently. (For more information on IRPs, see the section "I/O request packets" later in this chapter.)

The I/O manager creates an IRP in memory to represent an I/O operation, passing a pointer to the IRP to the correct driver and disposing of the packet when the I/O operation is complete. In contrast, a driver receives an IRP, performs the operation the IRP specifies, and passes the IRP back to the I/O manager, either because the requested I/O operation has been completed or because it must be passed on to another driver for further processing.

CHAPTER 6 I/O system     485


---

In addition to creating and disposing of IRPs, the I/O manager supplies code that is common to different drivers and that the drivers can call to carry out their I/O processing. By consolidating common tasks in the I/O manager, individual drivers become simpler and more compact. For example, the I/O manager provides a function that allows one driver to call other drivers. It also manages buffers for I/O requests, provides timeout support for drivers, and records which installable file systems are loaded into the operating system. There are about 100 different routines in the I/O manager that can be called by device drivers.

The I/O manager also provides flexible I/O services that allow environment subsystems, such as

Windows and POSIX (the latter is no longer supported), to implement their respective I/O functions.

These services include support for asynchronous I/O that allow developers to build scalable, high performance server applications.

The uniform, modular interface that drivers present allows the I/O manager to call any driver without requiring any special knowledge of its structure or internal details. The operating system treats all I/O requests as if they were directed at a file; the driver converts the requests from requests made to a virtual file to hardware-specific requests. Drivers can also call each other (using the I/O manager) to achieve layered, independent processing of an I/O request.

Besides providing the normal open, close, read, and write functions, the Windows I/O system provides several advanced features, such as asynchronous, direct, buffered, and scatter/gather I/O, which are described in the "Types of I/O" section later in this chapter.

## Typical I/O processing

Most I/O operations don't involve all the components of the I/O system. A typical I/O request starts with an application executing an I/O-related function (for example, reading data from a device) that is processed by the I/O manager, one or more device drivers, and the HAL.

As mentioned, in Windows, threads perform I/O on virtual files. A virtual file refers to any source or destination for I/O that is treated as if it were a file (such as devices, files, directories, pipes, and mailslots). A typical user mode client calls the CreateFile or CreateFile2 functions to get a handle to a virtual file. The function name is a little misleading—it's not just about files, it's anything that is known as a symbolic link within the object manager's directory called GLOBAL?. The suffix "File" in the CreateFile* functions really means a virtual file object (FILE_OBJECT) that is the entity created by the executive as a result of these functions. Figure 6-2 shows a screenshot of the WinObj Sysinternals tool for the GLOBAL? directory.

As shown in Figure 6-2, a name such as C: is just a symbolic link to an internal name under the Device object manager directory (in this case, \Device\HarddiskVolume7). (See Chapter 8, "System mechanisms," in Part 2 for more on the object manager and the object manager namespace.) All the names in the GLOBAL?? directory are candidates for arguments to CreateFile(2). Kernel mode clients such as device drivers can use the similar ZwCreateFile to obtain a handle to a virtual file.

---

![Figure](figures/Winternals7thPt1_page_504_figure_000.png)

FIGURE 6-2 The object manager's GLOBAL?? directory.

![Figure](figures/Winternals7thPt1_page_504_figure_002.png)

Note Higher-level abstractions such as the .NET Framework and the Windows Runtime have their own APIs for working with files and devices (for example, the System.IO.File class in .NET or the Windows.Storage.IStorageFile class in WinRT), but these eventually call

CreateFile(2) to get the actual handle they hide under the covers.

![Figure](figures/Winternals7thPt1_page_504_figure_004.png)

Note The GLOBAL?? object manager directory is sometimes called DosDevices, which is

an older name. DosDevices still works because it’s defined as a symbolic link to GLOBAL?? in

the root of the object manager’s namespace. In driver code, the ?? string is typically used to

reference the GLOBAL?? directory.

The operating system abstracts all I/O requests as operations on a virtual file because the I/O manager has no knowledge of anything but files, therefore making it the responsibility of the driver to translate file-oriented comments (open, close, read, write) into device-specific commands. This abstraction thereby generalizes an application's interface to devices. User-mode applications call documented functions, which in turn call internal I/O system functions to read from a file, write to a file, and perform other operations. The I/O manager dynamically directs these virtual file requests to the appropriate device driver. Figure 6-3 illustrates the basic structure of a typical I/O read request flow. (Other types of I/O requests, such as write, are similar; they just use different APIs.)

CHAPTER 6 I/O system     487


---

![Figure](figures/Winternals7thPt1_page_505_figure_000.png)

FIGURE 6-3 The flow of a typical I/O request.

The following sections look at these components more closely, covering the various types of device

drivers, how they are structured, how they load and initialize, and how they process I/O requests. Then

we'll cover the operation and roles of the PnP manager and the power manager.

## Interrupt Request Levels and Deferred Procedure Calls

Before we proceed, we must introduce two very important concepts of the Windows kernel that play an important role within the I/O system: Interrupt Request Levels (IRQL) and Deferred Procedure Calls (DPC). A thorough discussion of these concepts is reserved for Chapter 8 in Part 2, but we'll provide enough information in this section to enable you to understand the mechanics of I/O processing that follow.

### Interrupt Request Levels

The IRQL has two somewhat distinct meanings, but they converge in certain situations:

- ■ An IRQL is a priority assigned to an interrupt source from a hardware device This num-
ber is set by the HAL (in conjunction with the interrupt controller to which devices that require
interrupt servicing are connected).

■ Each CPU has its own IRQL value It should be considered a register of the CPU (even though
current CPUs do not implement it as such).
488 CHAPTER 6 I/O system

---

The fundamental rule of IRQs is that lower IRQI code cannot interfere with higher IRQI code and vice versa—code with a higher IRQI can preempt code running at a lower IRQI. You'll see examples of how this works in practice in a moment. A list of IRQIs for the Windows-supported architectures is shown in Figure 6-4. Note that IRQIs are not the same as thread priorities. In fact, thread priorities have meaning only when the IRQI is less than 2.

![Figure](figures/Winternals7thPt1_page_506_figure_001.png)

FIGURE 6-4 IRQLs.

![Figure](figures/Winternals7thPt1_page_506_figure_003.png)

Note IRQL is not the same as IRQ (interrupt request). IRQs are hardware lines connecting

devices to an interrupt controller. See Chapter 8 in Part 2 for more on interrupts, IRQs, and

IRQs.

Normally, the IRQL of a processor is 0. This means "nothing special" is happening in that regard, and that the kernel's scheduler that schedules threads based on priorities and so on works as described in Chapter 4, "Threads." In user mode, the IRQL can only be 0. There is no way to raise IRQL from user mode. (That's why user-mode documentation never mentions the IRQL concept at all; there would be no point.)

Kernel-mode code can raise and lower the current CPU IRQL with the KeRainsIrql and KeLowerIrql functions. However, most of the time-specific functions are called with the IRQL raised to some expected level, as you'll see shortly when we discuss a typical I/O processing by a driver.

The most important IRQLs for this I/O-related discussions are the following:

- ■ Passive(). This is defined by the PASSIVE_LEVEL macro in the WDR header wdm.h. It is the
normal IRQL where the kernel scheduler is working normally, as described at length in Chapter 4.
---

■ Dispatch/DPC (2) (DISPATCH_LEVEL) This is the IRQL the kernel's scheduler works at. This

means if a thread raises the current IRQL to 2 (or higher), the thread has essentially an infinite

quantum and will not be preempted by another thread. Effectively, the scheduler cannot wake

up on the current CPU until the IRQL drops below 2. This implies a few things:

- ● With the IRQL at level 2 or above, any waiting on kernel dispatcher objects (such as mutexes,
semaphores, and events) would crash the system. This is because waiting implies that the
thread might enter a wait state and another should be scheduled on the same CPU. How-
ever, because the scheduler is not around at this level, this cannot happen; instead, the
system will bug-check (the only exception is if the wait timeout is zero, meaning no waiting
is requested, just getting back the signaled state of the object).

● No page faults can be handled. This is because a page fault would require a context switch
to one of the modified page writers. However, context switches are not allowed, so the
system would crash. This means code running at IRQL 2 or above can access only non-paged
memory—typically memory allocated from non-paged pool, which by definition is always
resident in physical memory.
• Device IRQL (3-26 on x68; 3-12 on x64 and ARM) (DIRQL) These are the levels assigned to hardware interrupts. When an interrupt arrives, the kernel's trap dispatcher calls the appropriate interrupt service routine (ISR) and raises its IRQL to that of the associated interrupt. Because this value is always higher than DISPATCH_LEVEL (2), all rules associated with IRQL 2 apply for DIRQL as well.

Running at a particular IRQL masks interrupts with that and lower IRQLs. For example, an ISR running with IRQL of 8 would not let any code interfere (on that CPU) with IRQL of 7 or lower. Specifically, no user mode code is able to run because it always runs at IRQL 0. This implies that running in highIRQL is not desirable in the general case; there are a few specific scenarios (which we'll look at in this chapter) where this makes sense and is in fact required for normal system operation.

## Deferred Procedure Calls

A Deferred Procedure Call (DPC) is an object that encapsulates calling a function at IRQL DPC_LEVEL (2). DPCs exist primarily for post-interrupt processing because running at DIRQL masks (and thus delays) other interrupts waiting to be serviced. A typical ISR would do the minimum work possible, mostly reading the state of the device and telling it to stop its interrupt signal and then deferring further processing to a lower IRQL (2) by requesting a DPC. The term Deferred means the DPC will not execute immediately—it can't because the current IRQL is higher than 2. However, when the ISR returns, if there are no pending interrupts waiting to be serviced, the CPU IRQL will drop to 2 and it will execute the DPCs that have accumulated (maybe just one). Figure 6-5 shows a simplified example of the sequence of events that may occur when interrupts from hardware devices (which are asynchronous in nature, meaning they can arrive at any time) occur while code executes normally at IRQL 0 on some CPU.

---

FIGURE 6-5 Example of interrupt and DPC processing.

Here is a rundown of the sequence events shown in Figure 6-5:

1. Some user-mode or kernel-mode code is executing while the CPU is at IRQL 0, which is the case most of the time. 2. A hardware interrupt with an IRQL of 5 (remember that Device IRQLs have a minimum value of 3). Because 5 is greater than zero (the current IRQL) the CPU state is saved. The IRQL is raised to 5, and the ISR associated with that interrupt is called. Note that there is no context switch; it's the same thread that now happens to execute the ISR code. (If the thread was in user mode, it switches to kernel mode whenever an interrupt arrives.) 3. ISR 1 starts executing while the CPU IRQL is 5. At this point, any interrupt with IRQL 5 or lower cannot interrupt. 4. Suppose another interrupt with an IRQL of 8. Assume the system decides that the same CPU should handle it. Because 8 is greater than 5, the code is interrupted again, the CPU state is saved, the IRQL is raised to 8, and the CPU jumps to ISR 2. Note again that it's the same thread. No context switch can happen because the thread scheduler cannot wake up if the IRQL is 2 or higher. 5. ISR 2 is executing. Before it's done, ISR 2 would like to do some more processing at a lower IRQL so that interrupts with IRQLs less than 8 could be services as well. 6. As its final act, ISR 2 inserts a DPC initialized properly to point to a driver routine that does processing after the interrupt is dismissed by calling the KeInsertQueueDpc function. (We'll discuss what this post-processing typically includes in the next section.) Then the ISR returns, restoring the CPU state saved before entering ISR 2. 7. At this point, the IRQL drops to its previous level (5) and the CPU continues execution of ISR 1 that was interrupted before.

CHAPTER 6  I/O system    491


---

- 8. Just before ISR 1 finishes, it queues a DPC of its own to do its required post-processing. These
DPCs are collected in a DPC queue that has not been examined yet. Then ISR 1 returns, restor-
ing the CPU state saved before ISR 1 started execution.

9. At this point, the IRQL would want to drop to the old value of zero before all the interrupt han-
dling began. However, the kernel notices that there are DPCs pending and so drops the IRQL to
level 2 (DPC_LEVEL) and enters a DPC processing loop that iterates over the accumulated DPCs
and calls each DPC routine in sequence. When the DPC queue is empty, DPC processing ends.

10. Finally, the IRQL can drop back to zero, restore the state of the CPU again, and resume execu-
tion of the original user or kernel code that got interrupted in the first place. Again, notice that
all the processing described was done by the same thread (whichever one that may be). This
fact implies that ISRs and DPC routines should not rely on any particular thread (and hence part
of a particular process) to execute their code. It could be any thread, the significance of which
will be discussed in the next section.
The preceding description is a bit simplified. It doesn't mention DPC importance, other CPUs that

may handle DPCs for quicker DPC processing, and more. These details are not important for the discus sion in this chapter. However, they are described fully in Chapter 8 in Part 2.

## Device drivers

To integrate with the I/O manager and other I/O system components, a device driver must conform to

implementation guidelines specific to the type of device it manages and the role it plays in managing

the device. This section discusses the types of device drivers Windows supports as well as the internal

structure of a device driver.

![Figure](figures/Winternals7thPt1_page_509_figure_004.png)

Note Most kernel-mode device drivers are written in C. Starting with the Windows Driver Kit 8.0, drivers can also be safely written in C++ due to specific support for kernel-mode C++ in the new compilers. Use of assembly language is highly discouraged because of the complexity it introduces and its effect of making a driver difficult to port between the hardware architectures supported by Windows (x86, x64, and ARM).

### Types of device drivers

Windows supports a wide range of device-driver types and programming environments. Even within a particular type of device driver, programming environments can differ depending on the specific type of device for which a driver is intended.

The broadest classification is a driver is whether it is a user-mode or kernel-mode driver. Windows supports a couple of types of user-mode drivers:

492    CHAPTER 6  I/O system


---

- ■ Windows subsystem printer drivers These translate device-independent graphics requests
to printer-specific commands. These commands are then typically forwarded to a kernel-mode
port driver such as the universal serial bus (USB) printer port driver (Usbprint.sys).
■ User-Mode Driver Framework (UMDF) drivers These are hardware device drivers that run
in user mode. They communicate to the kernel-mode UMDF support library through advanced
local procedure calls (ALPC). See the "User-Mode Driver Framework" section later in this chap-
ter for more information.
In this chapter, the focus is on kernel-mode device drivers. There are many types of kernel-mode drivers, which can be divided into the following basic categories:

- ■ File-system drivers These accept I/O requests to files and satisfy the requests by issuing their
own more explicit requests to mass storage or network device drivers.
■ Plug and Play drivers These work with hardware and integrate with the Windows power
manager and PnP manager. They include drivers for mass storage devices, video adapters, input
devices, and network adapters.
■ Non-Plug and Play drivers These include kernel extensions, which are drivers or modules
that extend the functionality of the system. They do not typically integrate with the PnP
manager or power manager because they usually do not manage an actual piece of hardware.
Examples include network API and protocol drivers. The Sysinternals tool Process Monitor has a
driver, and is an example of a non-PnP driver.
Within the category of kernel-mode drivers are further classifications based on the driver model to which the driver adheres and its role in servicing device requests.

## WDM drivers

WDM drivers are device drivers that adhere to the Windows Driver Model (WDM). WDM includes support for Windows power management, Plug and Play, and WMI, and most Plug and Play drivers adhere to WDM. There are three types of WDM drivers:

- ■ Bus drivers These manage a logical or physical bus. Examples of buses include PMCIA, PCI,
USB, and IEEE 1394. A bus driver is responsible for detecting and informing the PnP manager of
devices attached to the bus it controls and for managing the power setting of the bus. These are
typically provided by Microsoft out of the box.
■ Function drivers These manage a particular type of device. Bus drivers present devices to
function drivers via the PnP manager. The function driver is the driver that exports the opera-
tional interface of the device to the operating system. In general, it's the driver with the most
knowledge about the operation of the device.
■ Filter drivers These logically layer either above function drivers (these are called upper filters or
function filters) or above the bus driver (these are called lower filters or bus filters), augmenting or
changing the behavior of a device or another driver. For example, a keyboard-capture utility could
be implemented with a keyboard filter driver that layers above the keyboard function driver.

CHAPTER 6 I/O system 493

From the Library of Micha
---

Figure 6-6 shows a device node (also called a devnode ) with a bus driver that creates a physical device object (PDO), lower filters, a function driver that creates a functional device object (FDO), and upper filters. The only required layers are the PDO and FDO. The various filters may or may not exist.

![Figure](figures/Winternals7thPt1_page_511_figure_001.png)

FIGURE 6-6 WDM device node (devnode).

In WDM, no one driver is responsible for controlling all aspects of a particular device. The bus driver is responsible for detecting bus membership changes (device addition or removal), assisting the PnP manager in enumerating the devices on the bus, accessing bus-specific configuration registers, and, in some cases, controlling power to devices on the bus. The function driver is generally the only driver that accesses the device's hardware. The exact manner in which these devices came to be is described in "The Plug and Play manager" section later in this chapter.

## Layered drivers

Support for an individual piece of hardware is often divided among several drivers, each providing a

part of the functionality required to make the device work properly. In addition to WDM bus drivers,

function drivers, and filter drivers, hardware support might be split between the following components:

- ■ Class drivers These implement the I/O processing for a particular class of devices, such as
disk, keyboard, or CD-ROM, where the hardware interfaces have been standardized so one
driver can serve devices from a wide variety of manufacturers.
■ Miniclass drivers These implement I/O processing that is vendor-defined for a particular
class of devices. For example, although Microsoft has written a standardized battery class driver,
both interruptible power supplies (UPS) and laptop batteries have highly specific interfaces
that differ wildly between manufacturers, such that a miniclass is required from the vendor.
Miniclass drivers are essentially kernel-mode DLLs and do not perform IRP processing directly.
Instead, the class driver calls into them and they import functions from the class driver.
■ Port drivers These implement the processing of an I/O request specific to a type of I/O port,
such as SATA, and are implemented as kernel-mode libraries of functions rather than actual
device drivers. Port drivers are almost always written by Microsoft because the interfaces are
typically standardized in such a way that different vendors can still share the same port driver.

CHAPTER 6 I/O system

From the Library of
---

However, in certain cases, third parties may need to write their own for specialized hardware.

In some cases, the concept of I/O port extends to cover logical ports as well. For example,

Network Driver Interface Specification (NDIS) is the network "port" driver.

- ■ Miniport drivers These map a generic I/O request to a type of port into an adapter type,
such as a specific network adapter. Miniport drivers are actual device drivers that import the
functions supplied by a port driver. Miniport drivers are written by third parties, and they pro-
vide the interface for the port driver. Like miniclass drivers, they are kernel-mode DLLs and do
not perform IRP processing directly.
Figure 6-7 shows a simplified example for illustrative purposes that will help demonstrate how device drivers and layering work at a high level. As you can see, a file-system driver accepts a request to write data to a certain location within a particular file. It translates the request into a request to write a certain number of bytes to the disk at a particular (that is, the logical) location. It then passes this request (via the I/O manager) to a simple disk driver. The disk driver, in turn, translates the request into a physical location on the disk and communicates with the disk to write the data.

![Figure](figures/Winternals7thPt1_page_512_figure_003.png)

FIGURE 6-7 Layering of a file-system driver and a disk driver.

This figure illustrates the division of labor between two layered drivers. The I/O manager receives a write request that is relative to the beginning of a particular file. The I/O manager passes the request to the file-system driver, which translates the write operation from a file-relative operation to a starting location (a sector boundary on the disk) and a number of bytes to write. The file-system driver calls the I/O manager to pass the request to the disk driver, which translates the request to a physical disk location and transfers the data.

CHAPTER 6 I/O system 495


---

Because all drivers—both device drivers and file-system drivers—present the same framework to

the operating system, another driver can easily be inserted into the hierarchy without altering the exist ing drivers or the I/O system. For example, several disks can be made to seem like a very large single

disk by adding a driver. This logical volume manager driver is located between the file system and

the disk drivers, as shown in the conceptual simplified architectural diagram presented in Figure 6-8.

(For the actual storage driver stack diagram as well as volume manager drivers, see Chapter 12, "Storage

management" in Part 2.)

![Figure](figures/Winternals7thPt1_page_513_figure_001.png)

FIGURE 6-8 Adding a layered driver.

## EXPERIMENT: Viewing the loaded driver list

You can see a list of registered drivers by executing the Msiinfo32.exe utility from the Run dialog box, accessible from the Start menu. Select the System Drivers entry under Software Environment to see the list of drivers configured on the system. Those that are loaded contain the text Yes in the Started column, as shown here:

496 CHAPTER 6 I/O system

---

![Figure](figures/Winternals7thPt1_page_514_figure_000.png)

The list of drivers comes from the registry subkeys under HKLM\System\CurrentControlSet\ Services. This key is shared between drivers and services. Both can be started by the Service Control Manager (SCM). The way to distinguish between a driver and a service for each subkey is by looking at the T ype value. A small value (1, 2, 4, 8) indicates a driver, while 16 (0x10) and 32 (0x20) indicate a Windows service. For more information on the Services subkey, consult Chapter 9 in Part 2.

You can also view the list of loaded kernel-mode drivers with Process Explorer. Run Process


Explorer, select the System process, and select DLLs from the Lower Pane View menu entry in

the View menu:

![Figure](figures/Winternals7thPt1_page_514_figure_003.png)

Process Explorer lists the loaded drivers, their names, version information (including company

and description), and load address (assuming you have configured Process Explorer to display

the corresponding columns).

Finally, if you're looking at a crash dump (or live system) with the kernel debugger, you can get

a similar display with the kernel debugger !m -kv command:

```bash
kd> 1m kv
start   end     module name
80626000  80631000  kdcom           (deferred)
        Image path: kdcom.d7l
```

CHAPTER 6 I/O system 497


---

```bash
Image name: kdcom.dll
        Browse all global symbols  functions  data
        Timestamp:    Sat Jul 16 04:27:27 2016 (57898D7F)
        CheckSum:       0000821A
        ImageSize:      00008000
        Translations:    0000.04b0 0000.04e4 0409.04b0 0409.04e4
        81009000 81632000   nt           (pdb symbols)        e:\symbols\ntkrpamp.
        pdb\A54DF85668E54895982F873F58C984591\ntkrpamp.pdb
        Loaded symbol image file: ntkrpamp.exe
        Image path: ntkrpamp.exe
        Image name: ntkrpamp.exe
        Browse all global symbols functions  data
        Timestamp:    Wed Sep 07 07:35:39 2016 (57CF991B)
        CheckSum:      005C6B08
        ImageSize:      00629000
        Translations:    0000.04b0 0000.04e4 0409.04b0 0409.04e4
        81632000 81693000   ha1          (deferred)
        Image path: halmacpi.dll
        Image name: halmacpi.dll
        Browse all global symbols  functions  data
        Timestamp:    Sat Jul 16 04:27:33 2016 (57898D85)
        CheckSum:      00061469
        ImageSize:      00061000
        Translations:    0000.04b0 0000.04e4 0409.04b0 0409.04e4
        8a800000 8a84b000   FLTmgr      (deferred)
        Image path: \SystemRoot\System32\drivers\FLTmgr.SYS
        Image name: FLTmgr.SYS
        Browse all global symbols  functions  data
        Timestamp:    Sat Jul 16 04:27:37 2016 (57898D89)
        CheckSum:      00053890
        ImageSize:      00048000
        Translations:    0000.04b0 0000.04e4 0409.04b0 0409.04e4
        ...
```

## Structure of a driver

The I/O system drives the execution of device drivers. Device drivers consist of a set of routines that

are called to process the various stages of an I/O request. Figure 6-9 illustrates the key driver-function

routines, which are described next.

![Figure](figures/Winternals7thPt1_page_515_figure_003.png)

FIGURE 6-9 Primary device driver routines.

498    CHAPTER 6  I/O system


---

<table><tr><td>• An initialization routine</td><td>The A 0 manager executes a driver's initialization routine, which is set by the WDK to GSDriverEntry when it loads the driver into the operating system. GSDriverEntry initializes the compiler's protection against stack-overflow errors (called a cookie) and then calls DriverEntry, which is the driver writer must implement. The routine fills in system data structures to register the rest of the driver's routines with the I/O manager and performs any necessary global driver initialization. • An add-device routine</td><td>A driver that supports Plug and Play sends a notification to the driver via this routine whenever a device for which the driver is responsible is detected. In this routine, a driver typically creates a device object (described later in this chapter) to represent the device. • A set of dispatch routines</td><td>Dispatch routines are the main entry points that a driver places on the L/O process. When called on to perform an I/O operation, the L/O process generates an IRP and calls a driver through one of the driver's dispatch routines. • A start I/O routine</td><td>A driver can use a start I/O routine to initiate a data transfer to or from a device. This routine is defined only in drivers that rely on the I/O manager to queue their processes only one IRP at a time. Drivers can process multiple IRPs concurrently, but serialization is usually required for most devices because they cannot concurrently handle multiple I/O requests. • An interrupt service routine (ISR)</td><td>When a device interrupts, the kernel's interrupt dis-patcher transfers control to this routine. In the Windows I/O model, ISRs run at device interrupt request level (DIRQL), so they perform as little work as possible to avoid blocking lower DIRQL interrupts (as discussed in the previous section). An ISR usually queues a DPC, which runs at a lower IRQL (DPC/dispatch level) to execute the remainder of interrupt processing. Only drivers for interrupt-driven devices have ISRs; a file-system driver, for example, doesn't have one. • An interrupt-serving DPC routine</td><td>A DPC routine performs most of the work required in handling a device interrupt after the ISR executes. The DPC routine executes at IRQL 2, which is a "compromise" between the high DIRQL and the low passive level (0). A typical DPC routine initiates I/O connection and starts the next queued I/O operation on a device. • Although the following routines aren't shown in Figure 6-9, they're found in many types of device drives:

• One or more I/O completion routines</td><td>A 0 manager requires the I/O completion routine that notify it when a lower-level driver finishes processing an IRP. For example, the I/O manager calls a file-system driver's I/O completion routine after a device driver finishes transferring data to or from a file. The completion routine notifies the file-system driver about the operation's success, failure, or cancellation, and allows the file-system driver to perform cleanup operations. • A cancel I/O routine</td><td>If an I/O operation can be canceled, a driver can define one or more I/O operations when the driver receives an IRP for an I/O request that can be canceled, it assigns a cancel routine to the IRP. When the IRP goes through various stages of processing, this</td></tr></table>

CHAPTER 6 I/O system 499


---

routine can change or outright disappear if the current operation is not cancellable. If a thread that issues an I/O request exits before the request is completed or the operation is cancelled (for example, with the Cancel I/O or Cancel IoEx Windows functions), the I/O manager executes the IRP's cancel routine if one is assigned to it. A cancel routine is responsible for performing whatever steps are necessary to release any resources acquired during the processing that has already taken place for the IRP as well as for completing the IRP with a canceled status.

- ■ Fast-dispatch routines  Drivers that make use of the cache manager, such as file-system driv-
ers, typically provide these routines to allow the kernel to bypass typical I/O processing when
accessing the driver. (See Chapter 14, "Cache manager," in Part 2, for more information on the
cache manager.) For example, operations such as reading or writing can be quickly performed by
accessing the cached data directly instead of taking the I/O manager's usual path that generates
discrete I/O operations. Fast dispatch routines are also used as a mechanism for callbacks from the
memory manager and cache manager to file-system drivers. For instance, when creating a sec-
tion, the memory manager calls back into the file-system driver to acquire the file exclusively.

■ An unload routine  An unload routine releases any system resources a driver is using so that
the I/O manager can remove the driver from memory. Any resources acquired in the initializa-
tion routine (DriverEntry) are usually released in the unload routine. A driver can be loaded
and unloaded while the system is running if the driver supports it, but the unload routine will be
called only after all file handles to the device are closed.

■ A system shutdown notification routine  This routine allows driver cleanup on system
shutdown.

■ Error-logging routines  When unexpected errors occur (for example, when a disk block goes
bad), a driver's error-logging routines note the occurrence and notify the I/O manager. The I/O
manager then writes this information to an error log file.
## Driver objects and device objects

When a thread opens a handle to a file object (described in the "I/O processing" section later in this

chapter), the I/O manager must determine from the file object's name which driver it should call to

process the request. Furthermore, the I/O manager must be able to locate this information the next

time a thread uses the same file handle. The following system objects fill this need:

- ■ A driver object This represents an individual driver in the system (DRIVER_OBJECT structure).
The I/O manager obtains the address of each of the driver's dispatch routines (entry points)
from the driver object.
■ A device object This represents a physical or logical device on the system and describes its
characteristics (DEVICE_OBJECT structure), such as the alignment it requires for buffers and the
location of its device queue to hold incoming IRPs. It is the target for all I/O operations because
this object is what the handle communicates with.
The I/O manager creates a driver object when a driver is loaded into the system. It then calls the driver's initialization routine (Driverentry), which fills in the object attributes with the driver's entry points.

500 CHAPTER 6 I/O system


---

At any time after loading, a driver creates device objects to represent logical or physical devices—or even a logical interface or endpoint to the driver—by calling IoCreateDevice or IoCreateDeviceSecure. However, most Plug and Play drivers create devices in their add-device routine when the PnP manager informs them of the presence of a device for them to manage. Non-Plug and Play drivers, on the other hand, usually create device objects when the I/O manager invokes their initialization routine. The I/O manager unloads a driver when the driver's last device object has been deleted and no references to the driver remain.

The relationship between a driver object and its device objects is shown in Figure 6-10.

![Figure](figures/Winternals7thPt1_page_518_figure_002.png)

FIGURE 6-10 A driver object and its device objects.

A driver object holds a pointer to its first device object in the Deviceobject member. The second device object is pointed to by the NextDevice member of DEVICE_OBJECT until the last one points to NULL. Each device object points back to its driver object with the DriverObject member. All the arrows shown in Figure 6-10 are built by the device-creation functions (IoCreateDevice or IoCreateDeviceSecure). The Deviceextension pointer shown is a way a driver can allocate an extra piece of memory that is attached to each device object it manages.

![Figure](figures/Winternals7thPt1_page_518_figure_005.png)

Note It's important to distinguish driver objects from device objects. A driver object represents the behavior of a driver, while individual device objects represent communication endpoints. For example, on a system with four serial ports, there would be one driver object (and one driver binary) but four instances of device objects, each representing a single serial port, that can be opened individually with no effect on the other serial ports. For hardware devices, each device also represents a distinct set of hardware resources, such as I/O ports, memory-mapped I/O, and interrupt line. Windows is device-centric, rather than driver-centric.

When a driver creates a device object, the driver can optionally assign the device a name. A name

places the device object in the object manager namespace. A driver can either explicitly define a name

or let the I/O manager auto-generate one. By convention, device objects are placed in the \Device

directory in the namespace, which is inaccessible by applications using the Windows API.

CHAPTER 6   I/O system     501


---

![Figure](figures/Winternals7thPt1_page_519_figure_000.png)

Note Some drivers place device objects in directories other than \Device. For example, the IDE driver creates the device objects that represent IDE ports and channels in the \Device\ Ide directory. See Chapter 12 in Part 2 for a description of storage architecture, including the way storage drivers use device objects.

If a driver needs to make it possible for applications to open the device object, it must create a symbolic link in the [GLOBAL]? directory to the device object's name in the \Device directory. (The Iocreatesymboliclink function accomplishes this.) Non-Plug and Play and file-system drivers typically create a symbolic link with a well-known name (for example, \Device\HarddiskVolume2). Because well-known names don't work well in an environment in which hardware appears and disappear dynamically, PnP drivers expose one or more interfaces by calling the IoRegisterDeviceInterface function, specifying a globally unique identifier (GUID) that represents the type of functionality exposed. GUIDs are 128-bit values that can be generated by using tools such as ui gen and gui gen, which are included with the WDK and the Windows SDK. Given the range of values that 128 bits represents (and the formula used to generate them), it's statistically almost certain that each GUID generated will be forever and globally unique.

Poregisterdevice Interface generates the symbolic link associated with a device instance. However, a driver must call IoSetDeviceInterfaceState to enable the interface to the device before the I/O manager actually creates the link. Drivers usually do this when the PnP manager starts the device by sending the driver a start-device IRP—in this case, IRP_MJ_PNP (major function code) with IRP_MN_ START_DEVICE (minor function code). IRPs are discussed in the "I/O request packets" section later in this chapter.

An application that wants to open a device object whose interfaces are represented with a GUID can call Plug and Play setup functions in user space, such as Setupdienumdeviceinterfaces, to enumerate the interfaces present for a particular GUID and to obtain names of the symbolic links it can use to open the device objects. For each device reported by Setupdienumdeviceinterfaces, the application executes SetupDiGetDeviceInterfaceDetail to obtain additional information about the device, such as its auto-generated name. After obtaining a device's name from SetupDiGetDeviceInterfaceDetail, the application can execute the Windows function CreateFile or CreateFile2 to open the device and obtain a handle.

## EXPERIMENT: Looking at device objects

You can use the WinObj tool from Systemrains or the Object kernel debugger command to view the device names under \Device in the object manager namespace. The following screenshot shows an I/O manager—assigned symbolic link that points to a device object in \Device with an auto-generated name:

502 CHAPTER 6 I/O system


---

![Figure](figures/Winternals7thPt1_page_520_figure_000.png)

When you run the \object kernel debugger command and specify the \Device directory, you

should see output similar to the following:

```bash
1: kd> !object <device
Object: 820c530    Type: (8542b188) Directory
    ObjectHeader: 8200c518 (new version)
    HandleCount: 0 PointerCount: 231
    Directory Object: 82007d20  Name: Device
    Hash Address   Type
    ----- --------      --
    00 d024a448 Device      !
    959afc08 Device      !
    958beef0 Device      !
    854c69b8 Device      !
    8befc98 Device      !
    88f7c338 Device      !
    89d64500 Device      !
    8a24e250 SymbolicLink  !
    89dc180 Device      !
    89c15810 Device      !
    89c17408 Device      !
    01 854c6898 Device     !
    88f9a870 Device      !
    8a486ca68 Device     !
    89c2fe88 Device      !
    02 854c6778 Device     !
    8548fe0e Device     !
    8a214b78 SymbolicLink  !
    89c31038 Device      !
    03 9c205c40 Device     !
    854c6658 Device     !
    854d9d8d Device     !
    8d1143488 Device     !
    8a541030 Device     !
    89c323c8 Device     !
```

CHAPTER 6 I/O system 503


---

```bash
8554fb50  Device        KMDF0
  04 958b040  Device        ProcessManagement
  97ad9fe0  SymbolicLink    MailSlotRedirector
  854f0090  Device        00000036
  854c6538  Device        FakeVid5
  8bf14e98  Device        Video1
  8bf2fe20  Device        KeyboardClass1
  89c32a0a  Device        00000029
  89c05030  Device        VolMgrControl
  89c3a1a8  Device        VMBus
...
```

When you enter the object command and specify an object manager directory object, the kernel debugger dumps the contents of the directory according to the way the object manager organizes it internally. For fast lookups, a directory stores objects in a hash table based on a hash of the object names, so the output shows the objects stored in each bucket of the directory's hash table.

As Figure 6-10 illustrates, a device object points back to its driver object, which is how the I/O manager knows which driver routine to call when it receives an I/O request. It uses the device object to find the driver object representing the driver that services the device. It then indexes into the driver object by using the function code supplied in the original request. Each function code corresponds to a driver entry point (called a dispatch routine).

A driver object often has multiple device objects associated with it. When a driver is unloaded from

the system, the I/O manager uses the queue of device objects to determine which devices will be af fected by the removal of the driver.

EXPERIMENT: Displaying driver and device objects

You can display driver and device objects with the !drvobj and !devobj kernel debugger commands, respectively. In the following example, the driver object for the keyboard class driver is examined, and one of its device objects viewed:

```bash
1: kd> !drvobj kbdclass
Driver object (8a557520) is for:
  \Driver\kbdclass
Driver Extension List: {id , addr}
Device Object list:
9F509648  8bf2fe20 8a541030
1: kd> !dvobj 9F509648) is for:
KeyboardClass2 \Driver\kbdclass DriverObject 8a557520
Current IRP 00000000 RefCount 0 Type 0000000b Flags 00002044
Dac1 82090960 Devext 9f509700 DevObjExt 9f5097f0
ExtensionFlags {0x000000c0} DOE_SESSENCE_DEVICE, DOE_DEFAULT_SO_PRESENT
```

504    CHAPTER 6  I/O system


---

```bash
Characteristics (0x00000100)  FILE_DEVICE_SECURE_OPEN
  AttachedTo (Lower) 0f509848 <Driver\terminpt
  Device queue is not busy.
    Notice that the !devjob! command also shows you the addresses and names of any device objects
that the object you're viewing is layered over (the AttachedTo line). It can also show the device
objects layered on top of the object specified (the AttachedDevice line), although not in this case.
    The !devjob! command can accept an optional argument that indicates more information to
show. Here is an example with the most information to show:
1: kd- !devjob! kbdclass 7
  Driver object (8a557520) is for:
  \Driver\kbdclass
  Driver Extension List: (id , addr)
  Device Object List:
  9f509648  8bf2fe20 8a541030
  DriverEntry:   8c30a010   kbdcclass!GsDriverEntry
  DriverStartIo: 00000000
  DriverUnload: 00000000
  AddDevice:     8c307250   kbdcclass!KeyboardAddDevice
  Dispatch routines:
  [00] IRP_M1_CREATE                8c301d80   kbdcclass!KeyboardClassCreate
  [01] IRP_M1_CREATE_NAMED_PIPE      81142342   nt!TopInvalidDeviceRequest
  [02] IRP_M1_CLOSE                   8c301c90   kbdcclass!KeyboardClassClose
  [03] IRP_M1_READ                   8c302150   kbdcclass!KeyboardClassRead
  [04] IRP_M1_WRITE                   81142342   nt!TopInvalidDeviceRequest
  [05] IRP_M1_QUERY_INFORMATION       81142342   nt!TopInvalidDeviceRequest
  [06] IRP_M1_SET_INFORMATION       81142342   nt!TopInvalidDeviceRequest
  [07] IRP_M1_QUERY_EA             81142342   nt!TopInvalidDeviceRequest
  [08] IRP_M1_SET_EA             81142342   nt!TopInvalidDeviceRequest
  [09] IRP_M1_FLUSH_BUFFERS        8c303678   kbdcclass!KeyboardClassFlush
  [0a] IRP_M1_QUERY_VOLUME_INFORMATION  81142342   nt!TopInvalidDeviceRequest
  [0b] IRP_M1_SET_VOLUME_INFORMATION      81142342   nt!TopInvalidDeviceRequest
  [0c] IRP_M1_DIRECTORY_CONTROL      81142342   nt!TopInvalidDeviceRequest
  [0d] IRP_M1_FILE_SYSTEM_CONTROL    81142342   nt!TopInvalidDeviceRequest
  [0e] IRP_M1_DEVICE_CONTROL        8c3076d0   kbdcclass!KeyboardClassDevice
  Control
  [0f] IRP_M1_INTERNAL_DEVICE_CONTROL 8c307ff0   kbdcclass!KeyboardClassPass
  Through
  [10] IRP_M1_SHUTDOWN               81142342   nt!TopInvalidDeviceRequest
  [11] IRP_M1_LOCK_CONTROL             81142342   nt!TopInvalidDeviceRequest
  [12] IRP_M1_CLEANUP                 8c302260   kbdcclass!KeyboardClassCleanup
  [13] IRP_M1_CREATE_MAILSLOT       81142342   nt!TopInvalidDeviceRequest
  [14] IRP_M1_QUERY_SECURITY         81142342   nt!TopInvalidDeviceRequest
  [15] IRP_M1_SET_SECURITY         81142342   nt!TopInvalidDeviceRequest
  [16] IRP_M1_POWER                  8c301440   kbdcclass!KeyboardClassPower
  [17] IRP_M1_SYSTEM_CONTROL        8c307f40   kbdcclass!KeyboardClassSystem
  Control
```

CHAPTER 6 I/O system     505

---

```bash
[18] IRP_MJ_DEVICE_CHANGE        81142342    ntl!IopInvalidIDdeviceRequest
 [19] IRP_MJ_QUERY_QUOTA        81142342    ntl!IopInvalidIDdeviceRequest
 [1a] IRP_MJ_SET_QUOTA        81142342    ntl!IopInvalidIDdeviceRequest
 [1b] IRP_MJ_PNP          8c301870    kbcdclass:KeyboardPnP
```

The dispatch routines array is clearly shown, and will be discussed in the next section.


Note that operations that are not supported by the driver point to an I/O manager's routine


IopInvalidDeviceRequest.

The address to the drvobj command is for a DRIVER_OBJECT structure, and the address for

the devobj command is for a DEVICE_OBJECT. You can view these structures directly using the

debugger:

```bash
1: kd- dt ntl_driver_object $a557520
  +0x000 Type             : On4
  +0x002 Size             : On168
  +0x004 DeviceObject      : 0x9f509648 _DEVICE_OBJECT
  +0x008 Flags             : 0x412
  +0x00c DriverStart       : 0x8c300000 Void
  +0x010 DriverSize       : 0xe000
  +0x014 DriverSection      : 0x8a556ba8 Void
  +0x018 DriverExtension    : 0x8a5575c8 _DRIVER_EXTENSION
  +0x01c DriverName       : _UNICODE_STRING "\Driver\kbkdclass"
  +0x024 HardwareDatabase : 0x815c2c28 _UNICODE_STRING "\REGISTRY\MACHINE\HARDWARE\
DESCRIPTION\SYSTEM\
  +0x028 FastToIspatch   : (null)
  +0x02c DriverInit       : 0x8c30a010   long  +ffffffff8c30a010
  +0x030 DriverStartIo   : (null)
  +0x034 DriverUnload   : (null)
  +0x038 MajorFunction  : [28] 0x8c301d80   long  +ffffffff8c301d80
1: kd- dt ntl_device_object 9f509648
  +0x000 Type             : On3
  +0x002 Size             : 0x1a8
  +0x004 ReferenceCount : On0
  +0x008 DriverObject      : 0x8a557520 _DRIVER_OBJECT
  +0x00c NextDevice       : 0x8bf2fe20 _DEVICE_OBJECT
  +0x010 AttachedDevice : (null)
  +0x014 CurrentIrp      : (null)
  +0x018 Timer             : (null)
  +0x01c Flags             : 0x2044
  +0x020 Characteristics : 0x100
  +0x024 Vpb              : (null)
  +0x028 DeviceExtension : 0xf509700 Void
  +0x02c DeviceType       : 0xb
  +0x030 StackSize       : 7 ''
  +0x034 Queue             : <unnamed-tag>
  +0x05c AlignmentRequirement : 0
  +0x060 DeviceQueue       : _KDEVICE_QUEUE
  +0x074 Dpc              : _KDPC
  +0x094 ActiveThreadCount : 0
  +0x098 SecurityDescriptor : 0x82090930 Void
  ...
```

There are some interesting fields in these structures, which we'll discuss in the next section.

506    CHAPTER 6  I/O system


---

Using objects to record information about drivers means that the I/O manager doesn't need to know details about individual drivers. The I/O manager merely follows a pointer to locate a driver, thereby providing a layer of portability and allowing new drivers to be loaded easily.

## Opening devices

A file object is a kernel-mode data structure that represents a handle to a device. File objects clearly fit the criteria for objects in Windows: They are system resources that two or more user-mode processes can share; they can have names; they are protected by object-based security; and they support synchronization. Shared resources in the I/O system, like those in other components of the Windows executive, are manipulated as objects. (See Chapter 8 in Part 2 for more on object management.)

File objects provide a memory-based representation of resources that conform to an I/O-centric

interface, in which they can be read from or written to. T able 6-1 lists some of the file object's attributes.

For specific field declarations and sizes, see the structure definition for FILE_OBJECT in wdm.h.

TABLE 6-1 File object attributes

<table><tr><td>Attribute</td><td>Purpose</td></tr><tr><td>File name</td><td>This identifies the virtual file that the file object refers to, which was passed in to the CreateFile or CreateFile2 APIs.</td></tr><tr><td>Current byte offset</td><td>This identifies the current location in the file (valid only for synchronous I/O).</td></tr><tr><td>Share modes</td><td>These indicate whether other callers can open the file for read, write, or delete operations while the current caller is using it.</td></tr><tr><td>Open mode flags</td><td>These indicate whether I/O will be synchronous or asynchronous, cached or non-cached, sequential or random, and so on.</td></tr><tr><td>Pointer to device object</td><td>This indicates the type of device the file resides on.</td></tr><tr><td>Pointer to the volume parameter block (VPB)</td><td>This indicates the volume, or partition, that the file resides on (in the case of file system files).</td></tr><tr><td>Pointer to section object pointers</td><td>This indicates a root structure that describes a mapped/cached file. This structure also contains the shared cache map, which identifies which parts of the file are cached (or rather, mapped) by the cache manager and where they reside in the cache.</td></tr><tr><td>Pointer to private cache map</td><td>This is used to store per-handle caching information such as the read patterns for this handle or the page priority for the process. See Chapter 5, &quot;Memory management,&quot; for more information on page priority.</td></tr><tr><td>List of I/O request packets (IRPs)</td><td>If thread-agnostic I/O (described in the section &quot;Thread-agnostic I/O&quot; later in this chapter) is used and the file object is associated with a completion port (described in the section &quot;I/O completion ports&quot;), this is a list of all the I/O operations that are associated with this file object.</td></tr><tr><td>I/O completion context</td><td>This is context information for the current I/O completion port, if one is active.</td></tr><tr><td>File object extension</td><td>This stores the I/O priority (explained later in this chapter) for the file and whether share-access checks should be performed on the file object, and contains optional file object extensions that store context-specific information.</td></tr></table>


To maintain some level of opacity toward driver code that uses the file object, and to enable extending

the file object functionality without enlarging the structure, the file object also contains an extension

field, which allows for up to six different kinds of additional attributes, described in Table 6-2.

CHAPTER 6 I/O system     507


---

TABLE 6-2    File object extensions

<table><tr><td>Extension</td><td>Purpose</td></tr><tr><td>Transaction parameters</td><td>This contains the transaction parameter block, which contains information about a transacted file operation. It&#x27;s returned by IoGetTransactionParameterBlock.</td></tr><tr><td>Device object hint</td><td>This identifies the device object of the filter driver with which this file should be associated. It&#x27;s set with IoCreateFileEx or IoCreateFileSpecifyDeviceObjectHint.</td></tr><tr><td>I/O status block range</td><td>This allows applications to lock a user-mode buffer into kernel-mode memory to optimize asynchronous I/Os. It&#x27;s set with SetFileIOverlappedRange.</td></tr><tr><td>Generic</td><td>This contains filter driver-specific information, as well as extended create parameters (ECPs) that were added by the caller. It&#x27;s set with IoCreateFileEx.</td></tr><tr><td>Scheduled file I/O</td><td>This stores a file&#x27;s bandwidth reservation information, which is used by the storage system to optimize and guarantee throughput for multimedia applications. (See the section &quot;Bandwidth reservation (scheduled file I/O)&quot; later in this chapter.) It&#x27;s set with SetFileBandwidthReservation.</td></tr><tr><td>Symbolic link</td><td>This is added to the file object upon creation, when a mount point or directory junction is traversed (or a filter explicitly repares the path). It stores the caller-supplied path, including information about any intermediate junctions, so that if a relative symbolic link is hit, it can walk back through the junctions. See Chapter 13 in Part 2 for more information on NTFS symbolic links, mount points, and directory junctions.</td></tr></table>


When a caller opens a file or a simple device, the I/O manager returns a handle to a file object.


Before that happens, the driver responsible for the device in question is asked via its Create dispatch

routine (IRP_M1_CREATE) whether it's OK to open the device and allow the driver to perform any initial ization necessary if the open request is to succeed.

![Figure](figures/Winternals7thPt1_page_525_figure_003.png)

Note File objects represent open instances of files, not files themselves. Unlike UNIX systems, which use vnodes, Windows does not define the representation of a file; Windows file-system drivers define their own representations.

Similar to executive objects, files are protected by a security descriptor that contains an access control list (ACL). The I/O manager consults the security subsystem to determine whether a file's ACL allows the process to access the file in the way its thread is requesting. If it does, the object manager grants the access and associates the granted access rights with the file handle that it returns. If this thread or another thread in the process needs to perform additional operations not specified in the original request, the thread must open the same file again with a different request (or duplicate the handle with the requested access) to get another handle, which prompts another security check. (See Chapter 7 for more information about object protection.)

## EXPERIMENT: Viewing device handles

Any process that has an open handle to a device will have a file object in its handle table corresponding to the open instance. You can view these handles with Process Explorer by selecting a process and checking Handles in the LowerPane View submenu of the View menu. Sort by the Type column and scroll to where you see the handles that represent file objects, which are labeled as File.

508   CHAPTER 6  I/O system


---

![Figure](figures/Winternals7thPt1_page_526_figure_000.png)

In this example, the Desktop Windows Manager (dwm.exe) process has a handle open to a device created by the kernel security device driver (KSeccd.sys). You can look at the specific file object in the kernel debugger by first identifying the address of the object. The following command reports information on the highlighted handle (handle value 0x348) in the preceding screenshot, which is in the Dwm.exe process that has a process ID of 452 decimal:

```bash
!kds: !handle 348 f 0n452
PROCESS ffffc404b62fb780
    SessionId: 1  Cid: 01c4    Peb: b4c3db0000  ParentCid: 0364
        DirBase: 7e607000  ObjectTable: ffffe688fd1c38c0  HandleCount: <Data Not Accessible>
        Image: dwm.exe
Handle Error reading handle count.
0348: Object: ffffc404b6406ef0  GrantedAccess: 00100003 (Audit) Entry: ffffe688fd39d620
Object: ffffc404b6406ef0  Type: (ffffc404189bf20) File
        ObjectHeader: ffffc404b6406ec0 (new version)
        HandleCount: 1  PointerCount: 32767
   Because the object is a file object, you can get information about it with the !fileobj command
(notice it's also the same object address shown in Process Explorer):
!kds: !fileobj ffffc404b6406ef0
Device Object: 0xfffffc404b2fa7230  \Driver\KSecDD
Vpb is NULL
Event signalled
Flags: 0x40002
        Synchronous IO
        Handle Created
CurrentByteOffset: 0
```

CHAPTER 6 I/O system 509


---

Because a file object is a memory-based representation of a shareable resource and not the resource itself, it's different from other executive objects. A file object contains only data that is unique to an object handle, whereas the file itself contains the data or text to be shared. Each time a thread opens a file, a new file object is created with a new set of handle-specific attributes. For example, for files opened synchronously, the current byte offset attribute refers to the location in the file at which the next read or write operation using that handle will occur. Each handle to a file has a private byte offset even though the underlying file is shared. A file object is also unique to a process—except when a process duplicates a file handle to another process (by using the Windows Dup1cateHandle function) or when a child process inherits a file handle from a parent process. In these situations, the two processes have separate handles that refer to the same file object.

Although a file handle is unique to a process, the underlying physical resource is not. Therefore, as with any shared resource, threads must synchronize their access to shareable resources such as files, file directories, and devices. If a thread is writing to a file, for example, it should specify exclusive write access when opening the file to prevent other threads from writing to the file at the same time. Alternatively, by using the Windows LockF11 e function, the thread could lock a portion of the file while writing to it when exclusive access is required.

When a file is opened, the file name includes the name of the device object on which the file resides. For example, the name \Device\HarddiskVolume1\MyFile.dat may refer to the file MyFile.dat on the C: volume. The substring \Device\HarddiskVolume1 is the name of the internal Windows device object representing that volume. When opening MyFile.dat, the I/O manager creates a file object and stores a pointer to the HarddiskVolume1 device object in the file object and then returns a file handle to the caller. Thereafter, when the caller uses the file handle, the I/O manager can find the HarddiskVolume1 device object directly.

Keep in mind that internal Windows device names can't be used in Windows applications—instead, the device name must appear in a special directory in the object manager's namespace, which is \GLOBAL??. This directory contains symbolic links to the real, internal Windows device names. As was described earlier, device drivers are responsible for creating links in this directory so that their devices will be accessible to Windows applications. You can examine or even change these links programmatically with the Windows QueryDosDevice and DefineDosDevice functions.

## I/O processing

Now that we've covered the structure and types of drivers and the data structures that support them, let's look at how I/O requests flow through the system. I/O requests pass through several predictable stages of processing. The stages vary depending on whether the request is destined for a device operated by a single-layered driver or for a device reached through a multilayered driver. Processing varies further depending on whether the caller specified synchronous or asynchronous I/O, so we'll begin our discussion of I/O types with these two and then move on to others.

---

## Types of I/O

Applications have several options for the I/O requests they issue. Furthermore, the I/O manager gives

drivers the choice of implementing a shortcut I/O interface that can often mitigate IRP allocation for

I/O processing. In this section, we'll explain these options for I/O requests.

### Synchronous and asynchronous I/O

Most I/O operations issued by applications are synchronous (which is the default). That is, the application thread waits while the device performs the data operation and returns a status code when the I/O is complete. The program can then continue and access the transferred data immediately. When used in their simplest form, the Windows ReadFile and WriteFile functions are executed synchronously. They complete the I/O operation before returning control to the caller.

Asynchronous I/O allows an application to issue multiple I/O requests and continue executing while the device performs the I/O operation. This type of I/O can improve an application's throughput because it allows the application thread to continue with other work while an I/O operation is in progress. To use asynchronous I/O, you must specify the FILE_FLAG_OVERLAPPED flag when you call the Windows CreateF11e or CreateF11e2 functions. Of course, after issuing an asynchronous I/O operation, the thread must be careful not to access any data from the I/O operation until the device driver has finished the data operation. The thread must synchronize its execution with the completion of the I/O request by monitoring a handle of a synchronization object (whether that's an event object, an I/O completion port, or the file object itself) that will be signaled when the I/O is complete.

Regardless of the type of I/O request, I/O operations issued to a driver on behalf of the application are performed asynchronously. That is, once an I/O request has been initiated, the device driver must return to the I/O system as soon as possible. Whether or not the I/O system returns immediately to the caller depends on whether the handle was opened for synchronous or asynchronous I/O. Figure 6-3 illustrates the flow of control when a read operation is initiated. Notice that if a wait is done, which depends on the overlapped flag in the file object, it is done in kernel mode by the NtReadFile function.

You can test the status of a pending asynchronous I/O operation with the Windows HasOverlapped IoCompleted macro or get more details with the GetOverlappedResult(Ex) functions. If you're using

I/O completion ports (described in the "I/O completion ports" section later in this chapter), you can use

the GetQueuedCompletionStatus(Ex) function(s).

### Fast I/O

Fast I/O is a special mechanism that allows the I/O system to bypass the generation of an IRP and instead go directly to the driver stack to complete an I/O request. This mechanism is used for optimizing certain I/O paths, which are somewhat slower when using IRPs. (Fast I/O is described in detail in Chapter 13 and Chapter 14 in Part 2.) A driver registers its fast I/O entry points by entering them in a structure pointed to by the PFAST_IO_DISPATCH pointer in its driver object.

---

## EXPERIMENT: Looking at a driver's registered fast I/O routines

The !drvbj kernel debugger command can list the fast I/O routines that a driver registers in its

driver object. Typically, however, only file-system drivers have any use for fast I/O routines—

although there are exceptions, such as network protocol drivers and bus filter drivers. The following

output shows the fast I/O table for the NTFS file-system driver object:

```bash
!kds !drvobj \ filesystem\ntfs 2
Driver object (ffccc404b2fbf810) is for:
  \FileSystem\NTFS
  DriverEntry:    fFFFF80e5663a030                 NTFS!GsDriverEntry
  DriverStartIo: 00000000                          NTFS!GsDriverEntry
  DriverUnload:   00000000                          NTFS!GsDriverEntry
  AddDevice:     00000000                          NTFS!GsDriverEntry
Dispatch routines:
...
Fast I/O routines:
FastIoCheckIfPossible        fFFFF80e565d6750
NTFS!NtfsFastIoCheckIfImpossible
FastIoRead                     fFFFF80e56526430        NTFS!NtfsCopyReadA
FastIoWrite                    fFFFF80e56523310        NTFS!NtfsCopyWriteA
FastIoQueryBasicInfo         fFFFF80e56523140        NTFS!NtfsFastQueryBasicInfo
FastIoQueryStandardInfo      fFFFF80e5653420        NTFS!NtfsFastQueryStdInfo
FastIoLock                      fFFFF80e5651e610        NTFS!NtfsFastLock
FastIoUnlockSingle             fFFFF80e5651e3c0        NTFS!NtfsFastUnlockSingle
FastIoUnlockAll                fFFFF80e565d9e0        NTFS!NtfsFastUnlockAll
FastIoUnlockAllByKey            fFFFF80e565dc50        NTFS!NtfsFastUnlockAllByKey
NTFS!NtfsFastUnlockAllByKey
ReleaseFileForNtCCreateSection      fFFFF80e5644fd90        NTFS!NtfsReleaseForCreate
Section                       FFFFF80e56537750        NTFS!NtfsFastQueryNetwork
OpenInfo                       FFFFF80e56543e0c0        NTFS!NtfsFastQueryNetwork
AcquireForModWrite               fFFFF80e56543e0c0
NTFS!NtfsAcquireFileForModWrite      fFFFF80e5651e950        NTFS!NtfsMdIReadA
MdIRead                       fFFFF80e5651e950        NTFS!NtfsMdIReadA
MdIReadComplete               fFFFF802dc6b844        NTFS!NtfsMdIReadA
nt!Fs!MdIReadCompleteDev          fFFFF80e56541a10        NTFS!NtfsPrepareMdIWriteA
PrepareMdIWrite                  fFFFF80e56541a10        NTFS!NtfsPrepareMdIWriteA
MdIWriteComplete               fFFFF802dc676e48        NTFS!NtfsMdIWriteCompleteDev
nt!Fs!MdIWriteCompleteDev          fFFFF80e5653a520        NTFS!NtfsNetworkOpenCreate
FastIoQueryOpen                 fFFFF80e56543e20        NTFS!NtfsNetworkOpenCreate
ReleaseForModWrite               fFFFF80e56543e2c0        NTFS!NtfsReleaseFileForModWrite
NTFS!NtfsReleaseFileForModWrite      fFFFF80e5644ca60        NTFS!NtfsAcquireFileForCcFlush
ReaieseForCcFlush                 fFFFF80e56450cfc0        NTFS!NtfsReaieseFileForCcFlush
```

---

The output shows that NTFS has registered its NtFsCopyReadA routine as the fast I/O table's

FastIoRead entry. As the name of this fast I/O entry implies, the I/O manager calls this function

when issuing a read I/O request if the file is cached. If the call doesn't succeed, the standard IRP

path is selected.

## Mapped-file I/O and file caching

Mapped-file I/O is an important feature of the I/O system—one that the I/O system and the memory manager produce jointly. (See Chapter 5 for details on how mapped files are implemented.) Mappedfile I/O refers to the ability to view a file residing on disk as part of a process's virtual memory. A program can access the file as a large array without buffering data or performing disk I/O. The program accesses memory, and the memory manager uses its paging mechanism to load the correct page from the disk file. If the application writes to its virtual address space, the memory manager writes the changes back to the file as part of normal paging.

Mapped-file I/O is available in user mode through the Windows CreateFileMapping, MapViewOf File, and related functions. Within the operating system, mapped-file I/O is used for important

operations such as file caching and image activation (loading and running executable programs). The

other major consumer of mapped-file I/O is the cache manager. File systems use the cache manager to

map file data in virtual memory to provide better response time for I/O-bound programs. As the caller

uses the file, the memory manager brings accessed pages into memory. Whereas most caching systems

allocate a fixed number of bytes for caching files in memory, the Windows cache grows or shrinks de pending on how much memory is available. This size variability is possible because the cache manager

relies on the memory manager to automatically expand (or shrink) the size of the cache using the nor mal working set mechanisms explained in Chapter 5—in this case applied to the system working set. By

taking advantage of the memory manager's paging system, the cache manager avoids duplicating the

work that the memory manager already performs. (The workings of the cache manager are explained

in detail in Chapter 14 in Part 2.)

## Scatter/gather I/O

Windows supports a special kind of high-performance I/O called scatter/gather, available via the Windows ReadFileScatter and WriteFileGather functions. These functions allow an application to issue a single read or write from more than one buffer in virtual memory to a contiguous area of a file on disk instead of issuing a separate I/O request for each buffer. To use scatter/gather I/O, the file must be opened for non-cached I/O, the user buffers being used must be page-aligned, and the I/Os must be asynchronous (overlapped). Furthermore, if the I/O is directed at a mass storage device, the I/O must be aligned on a device sector boundary and have a length that is a multiple of the sector size.

