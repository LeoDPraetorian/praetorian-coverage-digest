## I/O request packets

An I/O request packet (IRP) is where the I/O system stores information it needs to process an I/O request. When a thread calls an I/O API, the I/O manager constructs an IRP to represent the operation as it progresses through the I/O system. If possible, the I/O manager allocates IRPs from one of three per-processor IRP non-paged look-aside lists:

---

- ■ The small-IRP look-aside list This stores IRPs with one stack location. (IRP stack locations are
described shortly.)
■ The medium-IRP look-aside list This contains IRPs with four stack locations (which can also
be used for IRPs that require only two or three stack locations).
■ The large-IRP look-aside list This contains IRPs with more than four stack locations. By
default, the system stores IRPs with 14 stack locations on the large-IRP look-aside list, but once
per minute, the system adjusts the number of stack locations allocated and can increase it up to
a maximum of 20, based on how many stack locations have been recently required.
These lists are also backed by global look-aside lists as well, allowing efficient cross-CPU IRP flow. If an IRP requires more stack locations than are contained in the IRPs on the large-IRP look-aside list, the I/O manager allocates IRPs from non-paged pool. The I/O manager allocates IRPs with the IoA1locateIrp function, which is also available for device-driver developers, because in some cases a driver may want to initiate an I/O request directly by creating and initializing its own IRPs. After allocating and initializing an IRP, the I/O manager stores a pointer to the caller's file object in the IRP.

![Figure](figures/Winternals7thPt1_page_531_figure_002.png)

Note If defined, the DWORD registry value LargeIRpStackLocations in the HKLM\ System\CurrentControlSet\SessionManager\IO System key specifies how many stack

locations are contained in IRPs stored on the large-IRP look-aside list. Similarly, the

MediumIRpStackLocations value in the same key can be used to change the size of IRP stack

locations on the medium-IRP look-aside list.

Figure 6-11 shows some of the important members of the IRP structure. It is always accompanied by one or more IDO_STACK_LOCATION objects (described in the next section).

![Figure](figures/Winternals7thPt1_page_531_figure_005.png)

FIGURE 6-11 Important members of the IRP structure.

514   CHAPTER 6  I/O system


---

Here is a quick rundown of the members:

- ■   IoStatus  This is the status of the IRP, consisting of two members: Status, which is the actual
code itself and Information, a polymorphic value that has meaning in some cases. For ex-
ample, for a read or write operation, this value (set by the driver) indicates the number of bytes
read or written. This same value is the one reported as an output value from the functions
ReadFile and WriteFile.

■   MdlAddress  This is an optional pointer to a memory descriptor list (MDL). An MDL is a struc-
ture that represents information for a buffer in physical memory. We'll discuss its main usage in
device drivers in the next section. If an MDL was not requested, the value is NULL.

■   I/O stack locations count and current stack location  These store the total number of trail-
ing I/O stack location objects and point to the current one that this driver layer should look at,
respectively. The next section discusses I/O stack locations in detail.

■   User buffer  This is the pointer to the buffer provided by the client that initiated the I/O op-
eration. For example, it is the buffer provided to the ReadFile or WriteFile functions.

■   User event  This is the kernel event object that was used with an overlapped (asynchronous)
I/O operation (if any). An event is one way to be notified when the I/O operation completes.

■   Cancel routine  This is the function to be called by the I/O manager in case the IRP is can-
celled.

■   AssociatedIrp  This is a union of one of three fields. The SystemBuffer member is used in case
the I/O manager used the buffered I/O technique for passing the user's buffer to the driver. The
next section discusses buffered I/O, as well as other options for passing user mode buffers to
drivers. The MasterIrp member provides a way to create a "master IRP" that splits its work into
sub-IRPs, where the master is considered complete only when all its sub-IRPs have completed.
## I/O stack locations

An IRP is always followed by one or more I/O stack locations. The number of stack locations is equal to the number of layered devices in the device node the IRP is destined for. The I/O operation information is split between the IRP body (the main structure) and the current I/O stack location, where current means the one set up for the particular layer of devices. Figure 6-12 shows the important fields of an I/O stack location. When an IRP is created, the number of requested I/O stack locations is passed to IoAllocateIrp. The I/O manager then initializes the IRP body and the first I/O stack location only, destined for the topmost device in the device node. Each layer in the device node is responsible for initializing the next I/O stack location if it decides to pass the IRP down to the next device.

Here is a rundown of the members shown in Figure 6-12:

- ■ Major function This is the primary code that indicates the type of request (read, write, create,

Plug and Play, and so on), also known as dispatch routine code. It's one of 28 constants (0 to 27)

starting with IRP_M3_in wdm.h. This index is used by the I/O manager into the MajorFunction

array of function pointers in the driver object to jump to the appropriate routine within a driver.
---

Most drivers specify dispatch routines to handle only a subset of possible major function codes, including create (open), read, write, device I/O control, power, Plug and Play, system control (for WMI commands), cleanup, and close. File-system drivers are an example of a driver type that often fills in most or all of its dispatch entry points with functions. In contrast, a driver for a simple USB device would probably fill in only the routines needed for open, close, read, write, and sending I/O control codes. The I/O manager sets any dispatch entry points that a driver doesn’t fill to point to its own TopInv11Dev1cRequest, which completes the IRP with an error status indicating that the major function specified in the IRP is invalid for that device.

- ■ Minor function This is used to augment the major function code for some functions. For
example, IRP_MJ_READ (read) and IRP_MJ_WRITE (write) have no minor functions. But Plug and
Play and Power IRPs always have a minor IRP code that specializes the general major code. For
example, the Plug and Play IRP_MJ_PNP major code is too generic; the exact instruction is given
by the minor IRP, such as IRP_MN_START_DEVICE, IRP_MN_REMOVE_DEVICE, and so on.

■ Parameters This is a monstrous union of structures, each of which valid for a particular
major function code or a combination of major/minor codes. For example, for a read operation
(IRP_MJ_READ), the Parameters.Read structure holds information on the read request, such as
the buffer size.

■ File object and Device object These point to the associated FILE_OBJECT and DEVICE_
OBJECT for this I/O request.

■ Completion routine This is an optional function that a driver can register with the
IoSetCompletionRoutine(Ex) IDI, to be called when the IRP is completed by a lower layer
driver. At that point, the driver can look at the completion status of the IRP and do any needed
post-processing. It can even undo the completion (by returning the special value STATUS_MORE_
PROCESSING_REQUIRED from the function) and resend the IRP (perhaps with modified param-
eters) to the device node—or even a different device node—again.

■ Context This is an arbitrary value set with the IoSetCompletionRoutine(Ex) call that is
passed, as is, to the completion routine.
![Figure](figures/Winternals7thPt1_page_533_figure_002.png)

FIGURE 6-12 Important members of the IO_STACK_LOCATION structure.

516   CHAPTER 6  I/O system

---

The split of information between the IRP body and its I/O stack location allows for the changing of I/O stack location parameters for the next device in the device stack, while keeping the original request parameters. For example, a read IRP targeted at a USB device is often changed by the function driver to a device I/O control IRP where the input buffer argument of the device control points to a USB request packet (URB) that is understood by the lower-layer USB bus driver. Also, note that completion routines can be registered by any layer (except the bottom-most one), each having its own place in an I/O stack location (the completion routine is stored in the next lower I/O stack location).

## EXPERIMENT: Looking at driver dispatch routines

You can obtain a list of the functions a driver has defined for its dispatch routines by using bit 1 (value of 2) with the !drv0 kernel debugger command. The following output shows the major function codes supported by the NTFS driver. (This is the same experiment as with fast I/O.)

```bash
17kd: !drvobj !filesystem\ntfs 2
  Driver object (ffffc404b2fbf810) is for:
  \FileSystem\NTFS
  DriverEntry:       fFFFF80e5663a030        NTFS!GsDriverEntry
  DriverStartio:      00000000
  DriverUnload:      00000000
  AddDevice:        00000000
  Dispatch routines:
  [00] IRP_MI_CREATE                 fFFFFF80e565278e0    NTFS!NtfsFsdCreate
  [01] IRP_MI_CREATE_NAMED_PIPE        fFFFFF802dc762c80    nt!IopInvalidDeviceRequest
  [02] IRP_MI_CLOSE                   fFFFFF80e565258c0    NTFS!NtfsFsdClose
  [03] IRP_MI_READ                   fFFFFF80e56430600    NTFS!NtfsFsdRead
  [04] IRP_MI_WRITE                   fFFFFF80e564461d0    NTFS!NtfsFsdWrite
  [05] IRP_MI_QUERY_INFORMATION        fFFFFF80e565275f0    NTFS!NtfsFsdDispatchWait
  [06] IRP_MI_SET_INFORMATION        fFFFFF80e564eb80    NTFS!NtfsFsdSetInformation
  [07] IRP_MI_QUERY_EA                 fFFFFF80e565275f0    NTFS!NtfsFsdDispatchWait
  [08] IRP_MI_SET_LEA                 fFFFFF80e565275f0    NTFS!NtfsFsdDispatchWait
  [09] IRP_MI_FLUSH_BUFFERS           fFFFFF80e5653c9a0    NTFS!NtfsFsdFlushBuffers
  [0a] IRP_MI_QUERY_VOLUME_INFORMATION  fFFFFF80e56538d10    NTFS!NtfsFsdDispatch
  [0b] IRP_MI_SET_VOLUME_INFORMATION     fFFFFF80e56538d10    NTFS!NtfsFsdDispatch
  [0c] IRP_MI_DIRECTORY_CONTROL         fFFFFF80e564d7080
  NTFS!NtfsFsdDirectoryControl1
  [0d] IRP_MI_FILE_SYSTEM_CONTROL       fFFFFF80e56524b20
  NTFS!NtfsFsdFileSystemControl1
  [0e] IRP_MI_DEVICE_CONTROL          fFFFFF80e564f9de0    NTFS!NtfsFsdDeviceControl1
  [0f] IRP_MI_INTERNAL_DEVICE_CONTROL   fFFFFF802dc726c80    nt!IopInvalidDeviceRequest
  [10] IRP_MI_SHUTDOWN                    fFFFFF80e565e6f50    NTFS!NtfsFsdShutdown
  [11] IRP_MI_LOCK_CONTROL             fFFFFF80e564c870    NTFS!NtfsFsdLockControl1
  [12] IRP_MI_CLEANUP                      fFFFFF80e56525580    NTFS!NtfsFsdCleanup
  [13] IRP_MI_CREATE_MAILSLOT         fFFFFF802dc762c80    nt!IopInvalidDeviceRequest
  [14] IRP_MI_QUERY_SECURITY            fFFFFF80e56538d10    NTFS!NtfsFsdDispatch
  [15] IRP_MI_SET_SECURITY            fFFFFF80e56538d10    NTFS!NtfsFsdDispatch
  [16] IRP_MI_POWER                       fFFFFF802dc762c80    nt!IopInvalidDeviceRequest
  [17] IRP_MI_SYSTEM_CONTROL           fFFFFF802dc762c80    nt!IopInvalidDeviceRequest
  [18] IRP_MI_DEVICE_CHANGE             fFFFFF802dc762c80    nt!IopInvalidDeviceRequest
```

CHAPTER 6   I/O system     517


---

```bash
[19] IRP_MJ_QUERY_QUOTA        fFFFF80e565275f0    NTFS!NtfsFsdDispatchWait
  [1a] IRP_MJ_SET_QUOTA        fFFFF80e565275f0    NTFS!NtfsFsdDispatchWait
  [1b] IRP_MJ_PNP          fFFFF80e56566230    NTFS!NtfsFsdPnp
  Fast I/O routines:
  :::
```

While active, each IRP is usually queried in an IRP list associated with the thread that requested the I/O. (Otherwise, it is stored in the file object when performing thread-agnostic I/O, which is described in the "Thread agnostic I/O" section, later in this chapter.) This allows the I/O system to find and cancel any outstanding IRPs if a thread terminates with I/O requests that have not been completed. Additionally, paging I/O IRPs are also associated with the faulting thread (although they are not cancellable). This allows Windows to use the thread-agnostic I/O optimization—when an asynchronous procedure call (APC) is not used to complete I/O if the current thread is the initiating thread. This means page faults occur inline instead of requiring APC delivery.

## EXPERIMENT: Looking at a thread's outstanding IRPs

The !thread command prints any IRPs associated with the thread. The !process command

does this as well, if requested. Run the kernel debugger with local or live debugging and list the

threads of an explorer process:

```bash
!Id> !process 0 7 explorer.exe
PROCESS ffffc404b673c780
    SessionId: 1 Cid: 10b0    Pcb: 00cbb000  ParentCid: 1038
        DirBase: 8895f000  ObjectTable: ffffe689011b71c0 HandleCount: <Data Not
Accessible>
        Image: explorer.exe
        VadRoot ffffc404b672b900 Vads 569 Clone 0 Private 7260. Modified 366527. Locked 784.
        DeviceMap fffffe688fd7a5d30
        Token                fffffe68900024920
        ElapsedTime            18:48:28.375
        UserTime               00:00:17.500
        KernelTime             00:00:13.484
        ...
        MemoryPriority           BACKGROUND
        BasePriority             8
        CommitCharge           10789
        Job                   ffffc404b6075060
        THREAD ffffc404b673a080  Cid 10b0.10b4  Teb: 0000000000cbc000 Win32Thread:
 ffffc404b6e7090 WAIT: (WrlUserRequest) UserMode Non-Alertable
                    ffffc404b6760740 SynchronizationEvent
                    Not impersonating
    ...
        THREAD ffffc404b613c7c0  Cid 153c.15a8  Teb: 00000000006a3000 Win32Thread:
 ffffc404b6a83910 WAIT: (UserRequest) UserMode Non-Alertable
```

518   CHAPTER 6  I/O system


---

```bash
ffffc404b58d0d60  SynchronizationEvent
        ffffc404b56f310  SynchronizationEvent
        IRP List:
        ffffc404b69ad920: (0006,02c8) Flags: 00060800  Md1: 00000000
   ...
```

You should see many threads, with most of them having IRPs reported in the IRP List section

of the thread information (note that the debugger will show only the first 17 IRPs for a thread that

has more than 17 outstanding I/O requests). Choose an IRP and examine it with the !irp command:

```bash
1kds !irp ffffc404b69a0920
   Irp is active with 2 stacks 1 is current (= 0xffffc404b69ad9f0)
   No Mdl: No System Buffer: Thread ffffc404b613c7c0: Irp stack trace.
     cmd flg c1 Device File    Completion-Context
  >[IRP_MJ_FILE_SYSTEM_CONTROL(d), N/A(0)]
             5 e1 ffffc404b53cc90 ffffc404b5685620 fffff80e55752ed0>ffffc404b63c0e00
   Success Error Cancel pending
     >\FileSystem\Wprfs      FLTMgr!FtPassThroughCompletion
               Args: 00000000 00000000 00110008 00000000
  [IRP_MJ_FILE_SYSTEM_CONTROL(d), N/A(0)]
             5       0 ffffc404b3cda00 ffffc404b5685620 00000000 -00000000
     \FileSystem\FLTMgr:
               Args: 00000000 00000000 00110008 00000000
```

The IRP has two stack locations and is targeted at a device owned by the Named Pipe File System (NPS) driver. (NPS is described in Chapter 10, “Networking,” in Part 2.)

## IRP flow

IRPs are typically created by the /O manager, and then sent to the first device on the target device

node. Figure 6-13 shows a typical IRP flow for hardware-based device drivers.

![Figure](figures/Winternals7thPt1_page_536_figure_006.png)

FIGURE 6-13  IRP flow.

CHAPTER 6   I/O system     519


---

The I/O manager is not the only entity that creates IRPs. The Plug and Play manager and the Power

manager are also responsible for creating IRPs with major function code TRP_MJ_PNP and IRP_MJ_

POWER, respectively.

Figure 6-13 shows an example device node with six layered device objects: two upper filters, the FDO, two lower filters, and the PDO. This means an IRP targeted at this devnode is created with six I/O stack locations—one for each layer. An IRP is always delivered to the highest layered device, even if a handle was opened to a named device that is lower in the device stack.

A driver that receives an IRP can do one of the following:

- ■ It can complete the IRP then and there by calling IoCompleteRequest. This could be because
the IRP has some invalid parameters (for example, insufficient buffer size or bad I/O control
code), or because the operation requested is quick and can be accomplished immediately, such
as getting some status from the device or reading a value from the registry. The driver calls
IoGetCurrentIrpStackLocation to get a pointer to the stack location that it should refer to.
■ The driver can forward the IRP to the next layer after optionally doing some processing. For
example, an upper filter can do some logging of the operation and send the IRP down to be
executed normally. Before sending the request down, the driver must prepare the next I/O stack
location that would be looked at by the next driver in line. It can use the IoSkipCurrentIrp-
StackLocation macro if it does not wish to make changes, or it can make a copy with IoCopy-
IrpStackLocationToNext and make changes to the copied stack location by getting a pointer
with IoGetNextIrpStackLocation and making appropriate changes. Once the next I/O stack
location is prepared, the driver calls IoCallDriver to do the actual IRP forwarding.
■ As an extension of the previous point, the driver can also register for a completion routine
by calling IoSetCompletionRoutine(Ex) before passing down the IRP. Any layer except the
bottom-most one can register a completion routine (there is no point in registering for the
bottom-most layer since that driver must complete the IRP, so no callback is needed). After
IoCompleteRequest is called by a lower-layer driver, the IRP travels up (refer to Figure 6-13),
calling any completion routines on the way up in reverse order of registration. In fact, the IRP
originator (I/O manager, PnP manager, or power manager) use this mechanism to do any post-
IRP processing and finally free the IRP.
![Figure](figures/Winternals7thPt1_page_537_figure_004.png)

Note Because the number of devices on a given stack is known in advance, the I/O manager allocates one stack location per device driver on the stack. However, there are situations in which an IRP might be directed into a new driver stack. This can happen in scenarios involving the filter manager, which allows one filter to redirect an IRP to another filter (for example, going from a local file system to a network file system). The I/O manager exposes an API,

IAdjustStackSizeForRedirection, that enables this functionality by adding the required stack locations because of devices present on the redirected stack.

520 CHAPTER 6 I/O system


---

## EXPERIMENT: Viewing a device stack

The !devstack kernel debugger command shows you the device stack of layered device objects

associated with a specified device object. This example shows the device stack associated with a

device object, {device|keyboardclass0}, which is owned by the keyboard class driver:

```bash
tkd< !devstack keyboardClass0
!DevObj        !DevObj        !DevExt          ObjectName
> ffff9fc80c044440  <Driver\kbdclass> ffff9fc80c0424590 KeyboardClass0
> ffff9fc80c042470 <Driver\kbddh> ffff9fc80c0424910
> ffff9fc80c041406 <Driver\mshdkmdf> ffff9fc80c04141b0 0000003f
!DevNode    ffff9fc80c0414430 :
  DeviceInst is "HID\MSHWO029&Co101\5&1599b1c7&0&00000"
  ServiceName is "kbddh"
```

The output highlights the entry associated with KeyboardClass0 with the < character in the first column. The entries above that line are drivers layered above the keyboard class driver, and those below are layered beneath it.

## EXPERIMENT: Examining IRPs

In this experiment, you'll find an uncompleted IRP on the system, and will determine the IRP type, the device at which it's directed, the driver that manages the device, the thread that issued the IRP, and what process the thread belongs to. This experiment is best performed on a 32-bit system with non-local kernel debugging. It will work with local kernel debugging as well, but IRPs may complete during the period between when commands are issued, so some instability of data should be expected.

At any point in time, there are at least a few uncompleted IRPs on a system. This occurs because there are many devices to which applications can issue IRPs that a driver will complete only when a particular event occurs, such as data becoming available. One example is a blocking read from a network endpoint. You can see the outstanding IRPs on a system with the !irpfind kernel debugger command (this may take some time; you can stop after some IRPs appear):

```bash
kd> lirfind
Scanning large pool allocation table for tag 0x3f707249 (Irp?) (a5000000 : a5200000)
   Irp     [Thread ] irpStack: (Mj,Mn)   DevObj   [Driver]       MDL Process
9515ad68 [aa0c04c0] irpStack: ( e,5)  8bcb2ca0 [ |Driver|AFD] 0xa1a3540
8bd5c548 [91deeb80] irpStack: ( e,20)  8bcb2ca0 [ |Driver|AFD] 0x91da5c40
Searching nonpaged pool (80000000 : ffc00000) for tag 0x3f707249 (Irp?)
86264a20 [86262040] irpStack: ( e,0)  8a7b4ef0 [ |Driver|vmbus]
86278720 [91d96b08] irpStack: (e,20)  8bcb2ca0 [ |Driver|AFD] 0x86270040
86279e48 [91d96b08] irpStack: (e,20)  8bcb2ca0 [ |Driver|AFD] 0x86270040
862a1868 [86297c80] irpStack: ( d,0)  8bec4030 [ |FileSystem|Npfs]
```

---

```bash
862a24c0 [86297040] irpStack: ( d, 0)   8bca4030 [ \FileSystem\Npfs]
  862c3218 [9c25f740] irpStack: ( c, 2)   8b127018 [ \FileSystem\NTFS]
  862c4988 [a14fb800] irpStack: (e, 5)   8cbb2cba0 [ \Driver\AFD] 0xa1a3540
  862c57d8 [a8ef84c0] irpStack: (d, 0)   8b127018 [ \FileSystem\NTFS] 0xa8e6f040
  862c91c0 [99ac9040] irpStack: (3, 0)   8a7ace48 [ \Driver\vmbus] 0x9517ac40
  862d2098 [9fd456c0] irpStack: (e, 5)   8cbb2cba0 [ \Driver\AFD] 0xf1c11780
  862d6528 [9aded800] irpStack: (c, 2)   8b127018 [ \FileSystem\NTFS]
  862e3230 [00000000] Irp is complete (CurrentLocation 2 > StackCount 1)
  862e2c48 [862e2040] irpStack: (d, 0)   8bca4030 [ \FileSystem\Npfs]
  862f7d0 [91d0800] irpStack: (d, 0)   8bca4030 [ \FileSystem\Npfs]
  863011f8 [00000000] Irp is complete (CurrentLocation 2 > StackCount 1)
  86327008 [00000000] Irp is complete (CurrentLocation 43 > StackCount 42)
  86328008 [00000000] Irp is complete (CurrentLocation 43 > StackCount 42)
  86328960 [00000000] Irp is complete (CurrentLocation 43 > StackCount 42)
  86329008 [00000000] Irp is complete (CurrentLocation 43 > StackCount 42)
  863296d8 [00000000] Irp is complete (CurrentLocation 2 > StackCount 1)
  86329960 [00000000] Irp is complete (CurrentLocation 43 > StackCount 42)
  89feeaa0 [00000000] irpStack: (e, 0)   8a765030 [ \Driver\ACPI]
  86ad85d8 [99aa1040] irpStack: (d, 0)   8b127018 [ \FileSystem\NTFS] 0x00000000
  86ade828 [8bc758c0] irpStack: (4, 0)   8b127018 [ \FileSystem\NTFS] 0x00000000
  86fad428 [8bc728c0] irpStack: (4, 34)   8b0b8030 [ \Driver\disk] 0x00000000
  86a6f4d28 [8632e60c0] irpStack: (4, 34)   8b0b8030 [ \Driver\disk] 0x00000000
  8a767d98 [00000000] Irp is complete (CurrentLocation 6 > StackCount 5)
  8a788d98 [00000000] irpStack: (f, 0)   00000000 [00000000: Could not read device
  object or _DEVICE_OBJECT not found
  8a7911a8 [9fdb4040] irpStack: (e, 0)   86325768 [ \Driver\DeviceApi]
  8b03cf88 [00000000] Irp is complete (CurrentLocation 2 > StackCount 1)
  8b0bb8c8 [863d6040] irpStack: (e, 0)   8a78f030 [ \Driver\vmbus]
  8b0c48c0 [91da0800] irpStack: (e, 5)   8cbb2cba0 [ \Driver\AFD] 0xa1a3540
  8b118d98 [00000000] Irp is complete (CurrentLocation 9 > StackCount 8)
  8b1263b8 [00000000] Irp is complete (CurrentLocation 8 > StackCount 7)
  8b174008 [aa0aa80] irpStack: (4, 0)   8b127018 [ \FileSystem\NTFS] 0xa15e1c40
  8b194008 [aa0aa80] irpStack: (4, 0)   8b127018 [ \FileSystem\NTFS] 0xa15e1c40
  8b196370 [8b131880] irpStack: (e,31)   8cbb2cba0 [ \Driver\AFD]
  8b1a8470 [00000000] Irp is complete (CurrentLocation 2 > StackCount 1)
  8b1b3510 [9fdc1040] irpStack: (e, 0)   86325768 [ \Driver\DeviceApi]
  8b1h35b0 [a4009b0] irpStack: (e, 0)   86325768 [ \Driver\DeviceApi]
  8b1cd188 [5c3be040] irpStack: (e, 0)   8bc73648 [ \Driver\Beep]
  --
    Some IRPs are complete, and may be de-allocated very soon, or they have been de-allocated,
but because the allocation from lookaside lists, the IRP has not yet been replaced with a new one.
    For each IRP its address is given, followed by the thread that issued the request. Next, the
major and minor function codes for the current stack location are shown in parentheses. You can
examine any IRP with the !irp command:
```

Some IRPs are complete, and may be de-allocated very soon, or they have been de-allocated, but because the allocation from lookside lists, the IRP has not yet been replaced with a new one.

For each IRP, its address is given, followed by the thread that issued the request. Next, the

major and minor function codes for the current stack location are shown in parentheses. You can

examine any IRP with the !irp command:

```bash
__kc> lirp 8a6f4d28
Irp is active with 15 stacks 6 is current (= 0x8a6f4e4c)
  Mdl=8b14b250: No System Buffer: Thread 8632e6c0: Irp stack trace.
      cmd  flg cl Device   File     Completion-Context
CHAPTER 6 I/O system
From the Library of
```

---

```bash
[N/A(0), N/A(0)]
          0  0 0000000 00000000 00000000-00000000
                          Args: 0000000 00000000 00000000 00000000
[ N/A(0), N/A(0)]
          0  0 0000000 00000000 00000000-00000000
                          Args: 00000000 00000000 00000000 00000000
[ N/A(0), N/A(0)]
          0  0 0000000 00000000 00000000-00000000
                          Args: 00000000 00000000 00000000 00000000
[ N/A(0), N/A(0)]
          0  0 0000000 00000000 00000000-00000000
                          Args: 00000000 00000000 00000000 00000000
[IRP_MJ_WRITE(4), N/A(34)]
          14 e0 8b0b8030 00000000 876c2ef0-00000000 Success Error Cancel
             \Driver\disk      partmgr!PmIoCompletion
                Args: 0004b000 00000000 4b3a0000 00000002
[IRP_MJ_WRITE(4), N/A(3]]
          14 e0 8b0fc058 00000000 876c36a0-00000000 Success Error Cancel
             \Driver\partmgr    partmgr!PartiationIoCompletion
                Args: 4b49ac4 00000000 4b3a0000 00000002
[IRP_MJ_WRITE(4), N/A(0)]
          14 e0 8b121498 00000000 87531110-8b121a30 Success Error Cancel
             \Driver\partmgr     volmgr!VmpReadWriteCompletionRoutine
                Args: 0004b000 00000000 2bea0000 00000002
[IRP_MJ_WRITE(4), N/A(0)]
          4 e0 8b121978 00000000 82d103e0-8b1220d9 Success Error Cancel
             \Driver\volmgr     fvevo1!FvePassThroughCompletionRdpLevel2
                Args: 0004ab000 00000000 4b49acdff 00000000
[IRP_MJ_WRITE(4), N/A(0)]
          4 e0 8b122020 00000000 82801a40-00000000 Success Error Cancel
             \Driver\fivevo1    rdyboost!SmkdReadWriteCompletion
                Args: 0004b000 00000000 2bea0000 00000002
[IRP_MJ_WRITE(4), N/A(0)]
          4 e1 4b118538 00000000 828637d0-00000000 Success Error Cancel pending
             \Driver\rdyboost    iorate!IoRateReadWriteCompletion
                Args: 0004b000 3ffffffff 2bea0000 00000002
[IRP_MJ_WRITE(4), N/A(0)]
          4 e0 8b11a8b0 00000000 82da1610-8b1240d8 Success Error Cancel
             \Driver\iorate      volsnap!VspRefCountCompletionRoutine
                Args: 0004b000 00000000 2bea0000 00000002
[IRP_MJ_WRITE(4), N/A(0)]
          4 e1 8b124020 00000000 87886ada-89aec208 Success Error Cancel pending
             \Driver\volsnap      NTFS!NtfsMasterIrpSyncCompletionRoutine
                Args: 0004b000 00000000 2bea0000 00000002
```

CHAPTER 6 I/O system     523


---

```bash
[IRP_M)_WRITE(4), N/A(0)]
        4 e0 8b127018 a6de4bb8 871227b2-9ef8eba8 Success Error Cancel
            \FileSystem\NTFS
                          FLTMgr!FltPassThroughCompletion
                Args:  0004b000 00000000 00034000 00000000
[IRP_M)_WRITE(4), N/A(0)]
        4 1 8b12a3a0 a6de4bb8 00000000-00000000 pending
            \FileSystem\FltMgr
                Args:  0004b000 00000000 00034000 00000000
```

Irp Extension present at 0x8a6f4fb4:

This is a monstrous IRP with 15 stack locations (6 is current, shown in bold above, and is also specified by the debugger with the > character). The major and minor functions are shown for each stack location along with information on the device object and completion routines addresses.

The next step is to see what device object the IRP is targeting by executing the !devobj

command on the device object address in the active stack location:

```bash
kd> !devobj 8b0b8030
Device object (8b0b8030) is for:
    DRO /DriverDisk DriverObject 8b0a7e30
    Current Irp 00000000 RefCount 1 Type 00000007 Flags 01000050
    Vpb 8b0fc420 SecurityDescriptor 87da1b58 DevExt 8b0b80e8 DevObjExt 8b0b8578 Dope
    8b0fc3d0
ExtensionFlags (0x00000800)  DOE_DEFAULT_SD_PRESENT
Characteristics (0x00000100)  FILE_DEVICE_SECURE_OPEN
AttachedDevIce (Upper) 8b0fc058 /Driver\partmgr
AttachedIo (Lower) 8b0a4d10 /Driver\storflt
Device queue is not busy.
```

Finally, you can see details about the thread and process that issued the IRP by using the !thread command:

```bash
kd> !thread 8632e6c0
THREAD 8632e6c0 Cid 0004.0058 Teb: 00000000 Win32Thread: 00000000 WAIT:
(Executive) KernelMode Non-Alertable
    89ae2c0c NotificationEvent
IRP List:
    8a6f4d28: (0006.02d4) Flags: 00060043 Md1: 8b14b250
Not impersonating
DeviceMap        87c025b0
Owning Process      86264280       Image:            System
Attached Process      N/A             Image:            N/A
Wait Start TickCount   8083             Ticks: 1 (0:00:00:00.015)
Context Switch Count    2223             IdealTProcessor: 0
UserTime              00:00:00.000
KernelTime                00:00:00.046
Win32 Start Address nt!ExpWorkerThread (0x81e68710)
Stack Int 89aec09 Current 89aebeb4 Base 89aed00 Limit 89aae00 0000000
Priority 13 BasePriority 13 PriorityDecrement 0 IoPriority 2 PagePriority 5
```

524    CHAPTER 6  I/O system


---

## I/O request to a single-layered hardware-based driver

This section traces I/O requests to a single-layered kernel-mode device driver. Figure 6-14 shows a typical IRP processing scenario for such a driver.

![Figure](figures/Winternals7thPt1_page_542_figure_002.png)

FIGURE 6-14 Typical single layer I/O request processing for hardware drivers.

Before we dig into the various steps outlined in Figure 6-14, some general comments are in order:

■ There are two types of horizontal divider lines. The first (solid line) is the usual user-mode/ kernel-mode divider. The second (dotted line) separates code that runs in the requesting thread context versus the arbitrary thread context. These contexts are defined as follows:

- • The requesting thread context region indicates that the executing thread is the original one
that requested the I/O operation. This is important because if the thread is the one that made
the original call, it means the process context is the original process, and so the user-mode ad-
dress space that contains the user's buffer supplied to the I/O operation is directly accessible.
• The arbitrary thread context region indicates that the thread running those functions
can be any thread. More specifically, it's most likely not the requesting thread, and so the
user-mode process address space visible is not likely to be the original one. In this context,
accessing the user's buffer with a user-mode address can be disastrous. You'll see in the next
section how this issue is handled.
![Figure](figures/Winternals7thPt1_page_542_figure_007.png)

Note The explanations for the steps outlined in Figure 6-14 will prove why the divider lines reside where they are.

CHAPTER 6   I/O system     525


---

- ■ The large rectangle consisting of the four blocks (labeled Dispatch Routine, Start I/O Routine,
ISR, and DPC Routine) represents the driver-provided code. All other blocks are provided by the
system.
■ The figure assumes the hardware device can handle one operation at a time, which is true of
many types of devices. Even if the device can handle multiple requests, the basic flow of opera-
tions is still the same.
Here is the sequence of events as outlined in Figure 6-14:

- 1. A client application calls a Windows API such as ReadFile. ReadFile calls the native NtReadFile
(in Ntdll.dll), which makes the thread transition to kernel mode to the executive NtReadFile
(these steps have already been discussed earlier in this chapter).

2. The I/O manager, in its NtReadFile implementation, performs some sanity checks on the
request, such as whether the buffer provided by the client is accessible with the right page
protection. Next, the I/O manager locates the associated driver (using the file handle provided),
allocates and initializes an IRP, and calls the driver into the appropriate dispatch routine (in this
case, corresponding to the IRP_MJ_READ index) using IoCallDriver with the IRP.

3. This is the first time the driver sees the IRP. This call is usually invoked using the requesting
thread; the only way for that not to happen is if an upper filter held on to the IRP and called
IoCallDriver later from a different thread. For the sake of this discussion, we'll assume this
is not the case (and in most cases involving hardware devices, this does not happen; even if
there are upper filters, they do some processing and call the lower driver immediately from the
same thread). The dispatch read callback in the driver has two tasks on its hand: first, it should
perform more checking that the I/O manager can't do because it has no idea what the request
really means. For example, the driver could check if the buffer provided to a read or write op-
eration is large enough; or for a DeviceIoControl operation, the driver would check whether
the I/O control code provided is a supported one. If any such check fails, the driver completes
the IRP (IoCompleteRequest) with the failed status and returns immediately. If the checks turn
up OK, the driver calls its Start I/O routine to initiate the operation. However, if the hardware
device is currently busy (handling a previous IRP), then the IRP should be inserted into a queue
managed by the driver and a STATUS_PENDING is returned without completing the IRP. The I/O
manager caters for such a scenario with the IoStartPacket function, that checks a busy bit in
the device object and, if the device is busy, inserts the IRP into a queue (also part of the device
object structure). If the device is not busy, it sets the device bit as busy and calls the registered
Start I/O routine (recall that there is such a member in the driver object that would have been
initialized in DriverEntry). Even if a driver chooses not to use IoStartPacket, it would still
follow similar logic.

4. If the device is not busy, the Start I/O routine is called from the dispatch routine directly—
meaning it's still the requesting thread that is making the call. Figure 6-14, however, shows that
the Start I/O routine is called in an arbitrary thread context; this will be proven to be true in the
general case when we look at the DPC routine in step 8. The purpose of the Start I/O routine is
to take the IRP relevant parameters and use them to program the hardware device (for example,

CHAPTER 6 1/O system

From the Library of
---

by writing to its ports or registers using HAL hardware access routines such as WRITE_PORT_UCHAR, WRITE_REGISTER_ULONG, etc.). After the Start /O completes, the call returns, and no particular code is running in the driver; the hardware is working and "does its thing." While the hardware device is working, more requests can come in to the device by the same thread (if using asynchronous operations) or other threads that also opened handles to the device. In this case the dispatch routine would realize the device is busy and insert the IRP into the IRP queue (as mentioned, one way to achieve this is with a call to IoStartPacket).

5. When the device is done with the current operation, it raises an interrupt. The kernel trap

handler saves the CPU context for whatever thread was running on the CPU that was selected

to handle the interrupt, raises the IRQL of that CPU to the IRQL associated with the interrupt

(DIRQL) and jumps to the registered ISR for the device.

6. The ISR, running at Device IRQL (above 2) does as little work as possible, telling the device to stop the interrupt signal and getting the status or other required information from the hardware device. As its last act, the ISR queues a DPC for further processing at a lower IRQL. The advantage of using a DPC to perform most of the device servicing is that any blocked interrupt whose IRQL lies between the Device IRQL and the DPC/dispatch IRQL (2) is allowed to occur before the lower-priority DPC processing occurs. Intermediate-level interrupts are thus serviced more promptly than they otherwise would be, and this reduces latency on the system.

7. After the interrupt is dismissed, the kernel notices that the DPC queue is not empty and so uses a software interrupt at IRQD_DEC_LEVEL (2) to jump to the DPC processing loop.

8. Eventually, the DPC is de-queued and executes at IRQL 2, typically performing two main operations:

- • It gets the next IRP in the queue (if any) and starts the new operation for the device. This is done
first to prevent the device from being idle for too long. If the dispatch routine used IoStart-
Packet, then the DPC routine would call its counterpart, IoStartNextPacket, which does
just that. If an IRP is available, the Start I/O routine is called from the DPC. This is why in the
general case, the Start I/O routine is called in an arbitrary thread context. If there are no IRPs
in the queue, the device is marked not busy—that is, ready for the next request that comes in.
• It completes the IRP, whose operation has just finished by the driver by calling IoCompleteIe-
Request. From that point, the driver is no longer responsible for the IRP and it shouldn't
be touched, as it can be freed at any moment after the call. IoCompleteRequest calls any
completion routines that have been registered. Finally, the I/O manager frees the IRP (it's
actually using a completion routine of its own to do that).
9. The original requesting thread needs to be notified of the completion. Because the current

thread executing the DPC is arbitrary, it's not the original thread with its original process ad dress space. To execute code in the context of the requesting thread, a special kernel APC is

issued to the thread. An APC is a function that is forced to execute in the context of a particular

thread. When the requesting thread gets CPU time, the special kernel APC executes first (at IRQLOC_LEVEL=1). It does what's needed, such as releasing the thread from waiting, signaling

an event that was registered in an asynchronous operation, and so on. (For more on APDs, see

Chapter 8 in Part 2.)

---

A final note about I/O completion: the asynchronous I/O functions ReadFileEx and WriteFileEx

allow a caller to supply a callback function as a parameter. If the caller does so, the I/O manager queues

a user mode APC to the caller's thread APC queue as the last step of I/O completion. This feature allows

a caller to specify a subroutine to be called when an I/O request is completed or canceled. User-mode

APC completion routines execute in the context of the requesting thread and are delivered only when

the thread enters an alertable wait state (by calling functions such as SleepEx, WaitForSingleObjectEx,

or WaitForMultipleObjectsEx).

## User address space buffer access

As shown in Figure 6-14, there are four main driver functions involved in processing an IRP. Some or all of these routines may need to access the buffer in user space provided by the client application. When an application or a device driver indirectly creates an IRP by using the NtReadFile, NtWriteFile, or NtDeviceIoContr01File system services (or the Windows API functions corresponding to these services, which are ReadFile, WriteFile, and DevicIoContr01), the pointer to the user's buffer is provided in the UserBuffer member of the IRP body. However, accessing this buffer directly can be done only in the requesting thread context (the client's process address space is visible) and in IRQL 0 (paging can be handled normally).

As discussed in the previous section, only the dispatch routine meets the criteria of running in the

requesting thread context and in IRQL 0. And even this is not always the case—it's possible for an

upper filter to hold on to the IRP and not pass it down immediately, possibly passing it down later on

using a different thread, and could even be done when the CPU IRQL is 2 or higher.

The other three functions (Start /O, ISR, DPC) clearly run on an arbitrary thread (could be any thread), and with IRQL 2 (DIRQL for the ISR). Accessing the user's buffer directly from any of these routine is mostly fatal. Here's why:

- ■ Because the IROL is 2 or higher, paging is not allowed. Since the user's buffer (or part of it) may
be paged out, accessing the non-resident memory would crash the system.
■ Because the thread executing these functions could be any thread, and thus a random process
address space would be visible, the original user's address has no meaning and would likely lead
to an access violation, or worse—accessing data from some random process (the parent process
of whatever thread was running at the time).
Clearly, there must be a safe way to access the user's buffer in any of these routines. The I/O manager provides two options, for which it does the heavy lifting. These are known as Buffered I/O and Direct I/O. A third option, which is not really an option, is called Neither I/O, in which the I/O manager does nothing special and lets the driver handle the problem on its own.

A driver selects the method in the following way:

- ■ For read and write requests (IRP_M_READ and IRP_M_WRITE), it sets the Flags member (with
an OR boolean operation so as not to disturb other flags) of the device object (DEVICE_OBJECT)
to DO_BUFFERED_IO (for buffered I/O) or DO_DIRECT_IO (for direct I/O). If neither flag is set,
neither I/O is implied. (DO is short for device object.)
---

- ■ For device I/O control requests (IRP_MJ_DEVICE_CONTROL), each control code is constructed
using the CTL_CODE macro, where some of the bits indicate the buffering method. This means
the buffering method can be set on a control code-by-control code basis, which is very useful.
The following sections describe each buffering method in detail.

Buffered I/O With buffered I/O, the I/O manager allocates a mirror buffer that is the same size as the user's buffer in non-paged pool and stores the pointer to the new buffer in the AssociatedIrp. SystemBuffer member of the IRP body. Figure 6-15 shows the main stages in buffered I/O for a read operation (write is similar).

![Figure](figures/Winternals7thPt1_page_546_figure_003.png)

FIGURE 6-15   Buffered I/O.

The driver can access the system buffer (address q in Figure 6-15) from any thread and any IRQ:

- The address is in system space, meaning it's valid in any process context.
The buffer is allocated from non-paged pool, so a page fault will not happen.
For write operations, the I/O manager copies the caller's buffer data into the allocated buffer when creating the IRP. For read operations, the I/O manager copies data from the allocated buffer to the user's buffer when the IRP completes (using a special kernel APC) and then frees the allocated buffer.

Buffered I/O clearly is very simple to use because the I/O manager does practically everything. Its

main downside is that it always requires copying, which is inefficient for large buffers. Buffered I/O is

commonly used when the buffer size is no larger than one page (4 KB) and when the device does not

CHAPTER 6 I/O system   529


---

support direct memory access (DMA), because DMA is used to transfer data from a device to RAM or vice versa without CPU intervention—but with buffered I/O, there is always copying done with the CPU, which makes DMA pointless.

Direct I/O Direct I/O provides a way for a driver to access the user's buffer directly without any need for copying. Figure 6-16 shows the main stages in direct I/O for a read or write operation.

![Figure](figures/Winternals7thPt1_page_547_figure_002.png)

FIGURE 6-16   Direct I/O.

When the I/O manager creates the IRP, it locks the user's buffer into memory (that is, makes it nonpageable) by calling the MmProbeAndLockPages function (documented in the WDK). The I/O manager stores a description of the memory in the form of a memory descriptor list (MDL), which is a structure that describes the physical memory occupied by a buffer. Its address is stored in the MdlAddress member of the IRP body. Devices that perform DMA require only physical descriptions of buffers, so an MDL is sufficient for the operation of such devices. If a driver must access the contents of a buffer, however, it can map the buffer into the system's address space using the MmGetSys temAddressFunMdlSafe function, passing in the provided MDL. The resulting pointer (p in Figure 6-16) is safe to use in any thread context (it's a system address) and in any IRQL (the buffer cannot be paged out). The user's buffer is effectively double-mapped, where the user's direct address (p in Figure 6-16) is usable only from the original process context, but the second mapping into system space is usable in any context. Once the IRP is complete, the I/O manager unlocks the buffer (making it pageable again) by calling MnlUnlockPages (documented in the WDK).

Direct I/O is useful for large buffers (more than one page) because no copying is done, especially for DMA transfers (for the same reason).

530 CHAPTER 6 I/O system


---

Neither I/O With neither I/O, the I/O manager doesn't perform any buffer management. Instead, buffer management is left to the discretion of the device driver, which can choose to manually perform the steps the I/O manager performs with the other buffer-management types. In some cases, accessing the buffer in the dispatch routine is sufficient, so the driver may get away with neither I/O. The main advantage of neither I/O is its zero overhead.

Drivers that use neither I/O to access buffers that might be located in user space must take special care

to ensure that buffer addresses are valid and do not reference kernel-mode memory. Scalar values,

however, are perfectly safe to pass, although very few drivers have only a scalar value to pass around.

Failure to do so could result in crashes or in security vulnerabilities, where applications have access to

kernel-mode memory or can inject code into the kernel. The ProbeForRead and ProbeForWinTie func tions that the kernel makes available to drivers verify that a buffer resides entirely in the user-mode

portion of the address space. To avoid a crash from referencing an invalid user-mode address, drivers

can access user-mode buffers protected with structured exception handling (SEH), expressed with __try/__except blocks in C/C++. that catch any invalid memory faults and translate them into error

codes to return to the application. (See Chapter 8 in Part 2 for more information on SEH.) Additionally,

drivers should also capture all input data into a kernel buffer instead of relying on user-mode addresses

because the caller could always modify the data behind the driver's back, even if the memory address

itself is still valid.

## Synchronization

Drivers must synchronize their access to global driver data and hardware registers for two reasons:

- ■ The execution of a driver can be preempted by higher-priority threads and time-slice (or quan-
tum) expiration or can be interrupted by higher IRQL interrupts.
■ On multiprocessor systems (the norm), Windows can run driver code simultaneously on more
than one processor.
Without synchronization, corruption could occur—for example, device-driver code running at passive IRQ 0 (say, a dispatch routine) when a caller initiates an I/O operation can be interrupted by a device interrupt, causing the device driver's ISR to execute while its own device driver is already running. If the device driver was modifying data that its ISR also modifies—such as device registers, heap storage, or static data—the data can become corrupted when the ISR executes.

To avoid this situation, a device driver written for Windows must synchronize its access to any data

that can be accessed at more than one IRQL. Before attempting to update shared data, the device

driver must lock out all other threads (or, in the case of a multiprocessor system, CPUs) to prevent them

from updating the same data structure.

On a single-CPU system, synchronizing between two or more functions that run at different IRQs is easy enough. Such function just needs to raise the IRQ (keRaiseIrQ1) to the highest IRQ these functions execute in. For example, to synchronize between a dispatch routine (IRQI 0) and a DPC routine (IRQL 2), the dispatch routine needs to raise IRQI to 2 before accessing the shared data. If synchronization between a DPC and ISR is required, the DPC would raise IRQI to the Device IRQI (this information is provided to the driver when the PnP manager informs the driver of the hardware resources a device

CHAPTER 6 I/O system 531


---

is connected to.) On multiprocessing systems, raising IRQL is not enough because the other routine— for example, ISR—could be serviced on another CPU (remember that IRQL is a CPU attribute, and not a global system attribute).

To allow high IRLQ synchronization across CPUs, the kernel provides a specialized synchronization

object: the spinlock. Here, we'll take a brief look at spinlocks as they apply to driver synchronization.

(A full treatment of spinlocks is reserved for Chapter 8 in Part 2.) In principle, a spinlock resembles a

mutex (also discussed in detail in Chapter 8 in Part 2) in the sense that it allows one piece of code to

access shared data, but it works and is used quite differently. Table 6-3 summarizes the differences

between mutexes and spinlocks.

TABLE 6-3 Mutexes versus spinlocks

<table><tr><td></td><td>Mutex</td><td>Spinlock</td></tr><tr><td>Synchronization nature</td><td>One thread out of any number of threads that is allowed enters a critical region and accesses shared data.</td><td>One CPU out of any number of CPUs that is allowed enters a critical region and accesses shared data.</td></tr><tr><td>Usable at IRQL</td><td>&lt; DISPATCH_LEVEL (2)</td><td>&gt;= DISPATCH_LEVEL (2)</td></tr><tr><td>Wait kind</td><td>Normal. That is, it does not waste CPU cycles while waiting.</td><td>Busy. That is, the CPU is constantly testing the spinlock bit until it&#x27;s free.</td></tr><tr><td>Ownership</td><td>The owner thread is tracked, and recursive acquisition is allowed.</td><td>The CPU owner is not tracked, and recursive acquisition will cause a deadlock.</td></tr></table>


A spinlock is just a bit in memory that is accessed by an atomic test and modify operation. A spinlock may be owned by a CPU or free (unowned). As shown in Table 6-3, spinlocks are necessary when synchronization is needed in high IRLQIs (>=2), because a mutex can't be used in these cases as a scheduler is needed, but as we've seen the scheduler cannot wake up on a CPU whose IRLQI is 2 or higher. This is why waiting for a spinlock is a busy wait operation: The thread cannot go to a normal wait state because that implies the scheduler waking up and switching to another thread on that CPU.

Acquiring a spinlock by a CPU is always a two-step operation. First, the IRQL is raised to the associated IRQL on which synchronization is to occur—that is, the highest IRQL on which the function that needs to synchronize executes. For example, synchronizing between a dispatch routine (IRQL 0) and a DPC (2) would need to raise IRQL to 2; synchronizing between DPC (2) and ISR (DIRQL) would need to raise IRQL to DIRQL (the IRQL for that particular interrupt). Second, the spinlock is attempted acquisition by atomically testing and setting the spinlock bit.

![Figure](figures/Winternals7thPt1_page_549_figure_006.png)

Note The steps outlined for spinlock acquisition are simplified and omit some details that are not important for this discussion. The complete spinlock story is described in Chapter 8 in Part 2.

The functions that acquire spinlocks determine the IRQL on which to synchronize, as we shall see in a moment.

Figure 6-17 shows a simplified view of the two-step process of acquiring a spinlock.

532 CHAPTER 6 I/O system


---

![Figure](figures/Winternals7thPt1_page_550_figure_000.png)

FIGURE 6-17 Spinlock acquisition.

When synchronizing at IRQL 2—for example, between a dispatch routine and a DPC or between a DPC and another DPC (running on another CPU, of course)—the kernel provides the KeAcquireSpinLock and KeReILeaseSpinLock functions (there are other variations that are discussed in Chapter 8 in Part 2). These functions perform the steps in Figure 6-17 where the "associated IRQL" is 2. The driver in this case must allocate a spinlock (KSPIN_LOCK, which is just 4 bytes on 32-bit systems and 8 bytes on 64-bit systems), typically in the device extension (where driver-managed data for the device is kept) and initialize it with KeInitializeSpinLock.

For synchronizing between any function (such as DPC or a dispatch routine) and the ISR, different functions must be used. Every interrupt object (KINTERRUPT) holds inside it a spinlock, which is acquired before the ISR executes (this implies that the same ISR cannot run concurrently on other CPUs). Synchronization in this case would be with that particular spinlock (no need to allocate another one), which can be acquired indirectly with the KeAcquireInterruptSpinlock function and released with KeReleaseInterruptSpinlock. Another option is to use the KeSynchronizeExecution function, which accepts a callback function the driver provides that is called between the acquisition and release of the interrupt spinlock.

By now, you should realize that although ISRs require special attention, any data that a device driver uses is subject to being accessed by the same device driver (one of its functions) running on another processor. Therefore, it's critical for device-driver code to synchronize its use of any global or shared data or any accesses to the physical device itself.

## I/O requests to layered drivers

The "IRP flow" section showed the general options drivers have for dealing with IRPs, with a focus on a standard WDM device node. The preceding section showed how an I/O request to a simple device controlled by a single device driver is handled. I/O processing for file-based devices or for requests to other layered drivers happens in much the same way, but it's worthwhile to take a closer look at a request targeted at file-system drivers. Figure 6-18 shows a very simplified illustrative example of how an asynchronous I/O request might travel through layered drivers for non-hardware based devices as primary targets. It uses as an example a disk controlled by a file system.

---

![Figure](figures/Winternals7thPt1_page_551_figure_000.png)

FIGURE 6-18 Queuing an asynchronous request to layered drivers.

Once again, the I/O manager receives the request and creates an IRP to represent it. This time, however, it delivers the packet to a file-system driver. The file-system driver exercises great control over the I/O operation at that point. Depending on the type of request the caller made, the file system can send the same IRP to the disk driver or it can generate additional IRPs and send them separately to the disk driver.

The file system is most likely to reuse an IRP if the request it receives translates into a single straightforward request to a device. For example, if an application issues a read request for the first 512 bytes in a file stored on a volume, the NTFS file system would simply call the volume manager driver, asking it to read one sector from the volume, beginning at the file's starting location.

After the disk controller's DMA adapter finishes a data transfer, the disk controller interrupts the

host, causing the ISR for the disk controller to run, which requests a DPC callback completing the IRP, as

shown in Figure 6-19.

As an alternative to reusing a single IRP, a file system can establish a group of associated IRPs that

work in parallel on a single I/O request. For example, if the data to be read from a file is dispersed

across the disk, the file-system driver might create several IRPs, each of which reads some portion of

the request from a different sector. This queuing is illustrated in Figure 6-20.

---

![Figure](figures/Winternals7thPt1_page_552_figure_000.png)

FIGURE 6-19 Completing a layered I/O request.

![Figure](figures/Winternals7thPt1_page_552_figure_002.png)

FIGURE 6-20 Queuing associated IRPs

CHAPTER 6 I/O system 535


---

The file-system driver delivers the associated IRPs to the volume manager, which in turn sends them

to the disk-device driver, which queues them to the disk device. They are processed one at a time, and

the file-system driver keeps track of the returned data. When all the associated IRPs complete, the I/O

system completes the original IRP and returns to the caller, as shown in Figure 6-21.

![Figure](figures/Winternals7thPt1_page_553_figure_001.png)

FIGURE 6-21 Completing associated IRPs.

![Figure](figures/Winternals7thPt1_page_553_figure_003.png)

Note All Windows file-system drivers that manage disk-based file systems are part of a stack of drivers that is at least three layers deep. The file-system driver sits at the top, a volume manager in the middle, and a disk driver at the bottom. In addition, any number of filter drivers can be interspersed above and below these drivers. For clarity, the preceding example of layered I/O requests includes only a file-system driver and the volume-manager driver. See Chapter 12 in Part 2 for more information.

## Thread-agnostic I/O

In the I/O models described thus far, IRPs are queued to the thread that initiated the I/O and are completed by the I/O manager issuing an APC to that thread so that process-specific and thread-specific context are accessible by completion processing. Thread-specific I/O processing is usually sufficient for the performance and scalability needs of most applications, but Windows also includes support for thread-agnostic I/O via two mechanisms:

536 CHAPTER 6 I/O system

---

- ■ I/O completion ports, which are described at length in the section "I/O completion ports" later
in this chapter

■ Locking the user buffer into memory and mapping it into the system address space
With I/O completion ports, the application decides when it wants to check for the completion of I/O.


Therefore, the thread that happens to have issued an I/O request is not necessarily relevant because any

other thread can perform the completion request. As such, instead of completing the IRP inside the specific


thread's context, it can be completed in the context of any thread that has access to the completion port.

Likewise, with a locked and kernel-mapped version of the user buffer, there's no need to be in the

same memory address space as the issuing thread because the kernel can access the memory from

arbitrary contexts. Applications can enable this mechanism by using SetFileToOverlappedRange as

long as they have the SeLockMemoryPrivilege.

With both completion port I/O and I/O on file buffers set by SetFileIOverlappedRange, the I/O

manager associates the IRPs with the file object to which they have been issued instead of with the issu ing thread. The !fileObj extension in WinDbg shows an IRP list for file objects that are used with these

mechanisms.

In the next sections, you'll see how thread-agnostic I/O increases the reliability and performance of applications in Windows.

## I/O cancellation

While there are many ways in which IRP processing occurs and various methods to complete an I/O request, a great many I/O processing operations actually end in cancellation rather than completion. For example, a device may require removal while IRPs are still active, or the user might cancel a longrunning operation to a device—for example, a network operation. Another situation that requires I/O cancellation support is thread and process termination. When a thread exits, the I/Os associated with the thread must be cancelled. This is because the I/O operations are no longer relevant and the thread cannot be deleted until the outstanding I/Os have completed.

The Windows I/O manager, working with drivers, must deal with these requests efficiently and reliably to provide a smooth user experience. Drivers manage this need by registering a cancel routine, by calling IoSetCancelRoutine, for their cancellable I/O operations (typically, those operations that are still sequenced and not yet in progress), which is invoked by the I/O manager to cancel an I/O operation. When drivers fail to play their role in these scenarios, users may experience unkillable processes, which have disappeared visually but linger and still appear in Task Manager or Process Explorer.

### User-initiated I/O cancellation

Most software uses one thread to handle user interface (UI) input and one or more threads to perform

work, including I/O. In some cases, when a user wants to abort an operation that was initiated in the

UI, an application might need to cancel outstanding I/O operations. Operations that complete quickly

might not require cancellation, but for operations that take arbitrary amounts of time—like large data

transfers or network operations—Windows provides support for cancelling both synchronous and

asynchronous operations.

CHAPTER 6 I/O system     537


---

- ■ Cancelling synchronous I/Os A thread can call Cancel SynchronousIO. This enables even
create (open) operations to be cancelled when supported by a device driver. Several drivers in
Windows support this functionality. These include drivers that manage network file systems (for
example, MUP, DFS, and SMB), which can cancel open operations to network paths.
■ Cancelling asynchronous I/Os A thread can cancel its own outstanding asynchronous I/Os
by calling Cancel I/O. It can cancel all asynchronous I/Os issued to a specific file handle, regard-
less of which thread initiated them, in the same process with Cancel I/Oex. Cancel I/Oex also
works on operations associated with I/O completion ports through the aforementioned thread-
agnostic support in Windows. This is because the I/O system keeps track of a completion port's
outstanding I/Os by linking them with the completion port.
Figure 6-22 and Figure 6-23 show synchronous and asynchronous I/O cancellation. (To a driver, all cancel processing looks the same.)

![Figure](figures/Winternals7thPt1_page_555_figure_002.png)

FIGURE 6-22 Synchronous I/O cancellation.

![Figure](figures/Winternals7thPt1_page_555_figure_004.png)

FIGURE 6-23 Asynchronous I/O cancellation.

538    CHAPTER 6  I/O system


---

## I/O cancellation for thread termination

The other scenario in which I/Os must be cancelled is when a thread exits, either directly or as a result of

its process terminating (which causes the threads of the process to terminate). Because every thread has a

list of IRPs associated with it, the I/O manager can walk this list, look for cancellable IRPs, and cancel them.

Unlike Cancel IoEx, which does not wait for an IRP to be cancelled before returning, the process manager

will not allow thread termination to proceed until all I/Os have been cancelled. As a result, if a driver fails

to cancel an IRP, the process and thread object will remain allocated until the system shuts down.

![Figure](figures/Winternals7thPt1_page_556_figure_002.png)

Note Only IRPs for which a driver sets a cancel routine are cancellable. The process manager waits until all I/Os associated with a thread are either cancelled or completed before deleting the thread.

## EXPERIMENT: Debugging an unkillable process

In this experiment, we'll use Notmyfault from Sysinternals to force an unkillable process by causing the Myfault.sys driver, which Notmyfault.exe uses, to indefinitely hold an IRP without having registered a cancel routine for it. (Notmyfault is covered in detail in the "Crash dump analysis" section of Chapter 15, "Crash dump analysis," in Part 2.) Follow these steps:

1. Run Notmyfault.exe.

2. The Not My Fault dialog box appears. Click the Hang tab and choose Hang with IRP, as shown in the following screenshot. Then click the Hang button.

![Figure](figures/Winternals7thPt1_page_556_figure_008.png)

3. You shouldn't see anything happen, and you should be able to click the Cancel button to

quit the application. However, you should still see the Notmyfault process in Task Manager or

Process Explorer. Attempts to terminate the process will fail because Windows will wait

forever for the IRP to complete given that the Myfault driver doesn't register a cancel routine.

CHAPTER 6 I/O system 539


---

4. To debug an issue such as this, you can use WinDbg to look at what the thread is currently doing. Open a local kernel debugger session and start by listing the information about the Notmyfault.exe process with the !process command (notmyfault64 is the 64-bit version):

```bash
!kdo !process 0 7 notmyfault64.exe
PROCESS ffff8c0b88c823c0
    SessionId: 1  Cid: 2004  Pte: 5e5c9f4000  ParentCid: 0d40
        DirBase: 3edfa00  ObjectTable: ffffdf08dd140900 HandleTeCount: <Data Not
Accessible>
    Image: notmyfault64.exe
        VadRoot ffff8c0b863ed190 Vads 81 Clone 0 Private 493. Modified 8. Locked
0...
        THREAD ffff8c0b85377300  Cid 2b04.2714  Tue: 0000004e5c808000
Win32Thread: 0000000000000000 WAIT: (UserRequest) UserMode Non-Alertable
        ffff8f80a4c944018  SynchronizationEvent
        IRP List:
            Ffff8c0b84f1d130: (0006,0118) Flags: 00060000 Mdl: 00000000
        Not impersonating
        DeviceMap        ffffdf08ef4d7d20
        Owning Process      ffff8c0b88c823c0       Image:
notmyfault64.exe
...     Child-SP           RetAddr                : Args to Child
: Call Site
        ffff881'3ecf74a0 ffff802'fcf38a1c  : 00000000'00000100
        00000000'00000000 00000000'00000000 00000000'00000000 :
nt!KiSwapContext+0x76
        ffff881'3ecf75e0 ffff802'fcf384b  : 00000000'00000000
        00000000'00000000 00000000'00000000 00000000'00000000 :
nt!KiSwapThread+0x17c
        ffff881'3ecf7690 ffff802'fcf3a287  : 00000000'00000000
        00000000'00000000 00000000'00000000 00000000'00000000 :
nt!KiCommitThreadWait+0x1af
        ffff881'3ecf7730 ffff80a'4c941fce  : ffff80a'4c944018
        ffff802'0000006 00000000'00000000 00000000'00000000 :
nt!KeWaitForSingleObject+0x377
        ffff881'3ecf77e0 ffff802'd067430 : ffff8c0b'88d2b550
        00000000'0000001 00000001'00000000'00000000 : myfault+0x1fce
        ffff881'3ecf7820 ffff802'd066314 : ffff8c0b'00000000
        ffff8c0b'88d2b504 00000000'00000000 ffff881'3ecf7b80 : nt!OipSynchronousSer
viceTail+0x1a0
        ffff881'3ecf78e0 ffff802'd065f96 : 00000000'00000000
        00000000'00000000'00000000'00000000'00000000 :
nt!IpXxxControlFile+0x674
        ffff881'3ecf7a20 ffff802'cfd57f93 : ffff8c0b'85377300
        ffff802'fcfb9640 00000000'00000000' ffff802'd005b32f :
nt!NTDeviceIoControlFile+0x56
        ffff881'3ecf7a90 00007fffe'c1564f34 : 00000000'00000000
        00000000'00000000 00000000'00000000 00000000'00000000 :
nt!KiISystemServiceCopyEnd+0x13 (TrapFrame @ ffff881'3ecf7b00)
```

---

5. From the stack trace, you can see that the thread that initiated the I/O is now waiting

for cancellation or completion. The next step is to use the same debugger extension

command used in the previous experiments, !rp, and attempt to analyze the problem.

Copy the IRP pointer, and examine it with !rp:

```bash
!kb !irp ffff8c0b84f1d130
Ip is active with 1 stacks 1 is current (= 0xffff8c0b84f1d200)
  No Mdl: No System Buffer: Thread ffff8c0b85377300:  Irp stack trace.
     cmd flg cl Device     File      Completion-Context
<IRP_MJ_DEVICE_CONTROL(e), N/A(O)>
    S  0 ffff8c0b8b6b5590 ffff8c0b8ad2b550 00000000-00000000
       \Driver\MYFAULT
        Args: 00000000 00000000 83360020 00000000
```

6. From this output, it is obvious who the culprit driver is: \DriverMYFAULT, or Myfault.sys.

The name of the driver highlights the fact that the only way this situation can occur is

through a driver problem—not a buggy application. Unfortunately, although you now

know which driver caused the problem, there isn’t much you can do about it apart from

rebooting the system. This is necessary because Windows can never safely assume it is

OK to ignore the fact that cancellation hasn’t yet occurred. The IRP could return at any

time and cause corruption of system memory.

![Figure](figures/Winternals7thPt1_page_558_figure_003.png)

Tip: If you encounter this situation in practice, you should check for a newer

version of the driver, which might include a fix for the bug.

