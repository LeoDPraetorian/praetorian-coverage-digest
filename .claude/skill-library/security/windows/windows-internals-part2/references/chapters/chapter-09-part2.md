
Windows increasingly uses Hyper-V's hypervisor for providing functionality not only related to running traditional VMs. In particular, as we will discuss discuss in the second part of this chapter, VSM, an important security component of modern Windows versions, leverages the hypervisor to enforce a higher level of isolation for features that provide critical system services or handle secrets such as passwords. Enabling these features requires that the hypervisor is running by default on a machine.

External virtualization products, like VMware, Qemu, VirtualBox, Android Emulator, and many others use the virtualization extensions provided by the hardware to build their own hypervisors, which is needed for allowing them to correctly run. This is clearly not compatible with Hyper-V, which launches its hypervisor before the Windows kernel starts up in the root partition (the Windows hypervisor is a native, or bare-metal hypervisor).

As for Hyper-V, external virtualization solutions are also composed of a hypervisor, which provides

generic low-level abstractions for the processor's execution and memory management of the VM, and a

virtualization stack, which refers to the components of the virtualization solution that provide the emu lated environment for the VM (like its motherboard, firmware, storage controllers, devices, and so on).

The Windows Hypervisor Platform API, which is documented at https://docs.microsoft.com/en-us

/virtualization/api/, has the main goal to enable running third-party virtualization solutions on the

Windows hypervisor. Specifically, a third-party virtualization product should be able to create, delete,

start, and stop VMs with characteristics (firmware, emulated devices, storage controllers) defined by its

---

own virtualization stack. The third-party virtualization stack, with its management interfaces, continues to run on Windows in the root partition, which allows for an unchanged use of its VMs by their client.

As shown in Figure 9-19, all the Windows hypervisor platform's APIs run in user mode and are

implemented on the top of the VID and WinHvr driver in two libraries: WinHvPlatform.dll and

WinHvEmulation.dll (the latter implements the instruction emulator for MMIO).

![Figure](figures/Winternals7thPt2_page_336_figure_002.png)

FIGURE 9-19 The Windows hypervisor platform API architecture.

A user mode application that wants to create a VM and its relative virtual processors usually should do the following:

- 1. Create the partition in the VID library (Vid.dll) with the WHvCreatePartition API.

2. Configure various internal partition's properties—like its virtual processor count, the APIC emula-

tion mode, the kind of requested VMEXITs, and so on—using the WHvSetPartitionProperty API.

3. Create the partition in the VID driver and the hypervisor using the WHvSetupPartition API. (This

kind of partition in the hypervisor is called an EXO partition, as described shortly.) The API also

creates the partition's virtual processors, which are created in a suspended state.

4. Create the corresponding virtual processor(s) in the VID library through the WHvCreateVirtual-

Processor API. This step is important because the API sets up and maps a message buffer into

the user mode application, which is used for asynchronous communication with the hypervisor

and the thread running the virtual CPUs.

5. Allocate the address space of the partition by reserving a big range of virtual memory with the

classic VirtualAlloc function (read more details in Chapter 5 of Part 1) and map it in the hy-

pervisor through the WHvMapGpaRange API. A fine-grained protection of the guest physical

memory can be specified when allocating guest physical memory in the guest virtual address

space by committing different ranges of the reserved virtual memory.
CHAPTER 9 Virtualization technologies      305


---

- 6. Create the page-tables and copy the initial firmware code in the committed memory.

7. Set the initial VP's registers content using the WHvSetVirtualProcessorRegisters API.

8. Run the virtual processor by calling the WHvRunVirtualProcessor blocking API. The function

returns only when the guest code executes an operation that requires handling in the virtual-

ization stack (a VMEXIT in the hypervisor has been explicitly required to be managed by the

third-party virtualization stack) or because of an external request (like the destroying of the

virtual processor, for example).
The Windows hypervisor platform APIs are usually able to call services in the hypervisor by sending different IOCTLs to the \Device\vdExo device object, which is created by the VID driver at initialization time, only if the HKLM\System\CurrentControlSet\Services\vdId\Parameters\ExoDeviceEnabled registry value is set to 1. Otherwise, the system does not enable any support for the hypervisor APIs.

Some performance-sensitive hypervisor platform APIs (a good example is provided by WHvRun


VirtualProcessor) can instead call directly into the hypervisor from user mode thanks to the Doorbell

page, which is a special invalid guest physical page, that, when accessed, always causes a VMEXIT. The

Windows hypervisor platform API obtains the address of the doorbell page from the VID driver. It

writes to the doorbell page every time it emits a hypercall from user mode. The fault is identified and

treated differently by the hypervisor thanks to the doorbell page's physical address, which is marked

as "special" in the SLAT page table. The hypervisor reads the hypercall's code and parameters from the

VP's registers as per normal hypercalls, and ultimately transfers the execution to the hypercall's handler

routine. When the latter finishes its execution, the hypervisor finally performs a VMENTRY, landing on

the instruction following the faulty one. This saves a lot of clock cycles to the thread backing the guest

VP, which no longer has a need to enter the kernel for emitting a hypercall. Furthermore, the VMCALL

and similar opcodes always require kernel privileges to be executed.

The virtual processors of the new third-party VM are dispatched using the root scheduler. In case

the root scheduler is disabled, any function of the hypervisor platform API can't run. The created parti tion in the hypervisor is an EXO partition. EXO partitions are minimal partitions that don't include any

synthetic functionality and have certain characteristics ideal for creating third-party VMs:

- ■ They are always VA-backed types. (More details about VA-backed or micro VMs are provided
later in the "Virtualization stack" section.) The partition's memory-hosting process is the user
mode application, which created the VM, and not a new instance of the VMMEM process.
■ They do not have any partition's privilege or support any VTL (virtual trust level) other than 0.
All of a classical partition's privileges refer to synthetic functionality, which is usually exposed
by the hypervisor to the Hyper-V virtualization stack. EXO partitions are used for third-party
virtualization stacks. They do not need the functionality brought by any of the classical parti-
tion’s privilege.
■ They manually manage timing. The hypervisor does not provide any virtual clock interrupt
source for EXO partition. The third-party virtualization stack must take over the responsibil-
ity of providing this. This means that every attempt to read the virtual processor's time-stamp
counter will cause a VMEXIT in the hypervisor, which will route the intercept to the user mode
thread that runs the VP.
CHAPTER 9 Virtualization technologies


---

![Figure](figures/Winternals7thPt2_page_338_figure_000.png)

Note EXO partitions include other minor differences compared to classical hypervisor partitions. For the sake of the discussion, however, those minor differences are irrelevant, so they are not mentioned in this book.

## Nested virtualization

Large servers and cloud providers sometimes need to be able to run containers or additional virtual machines inside a guest partition. Figure 9-20 describes this scenario: The hypervisor that runs on the top of the bare-metal hardware, identified as the L0 hypervisor (L0 stands for Level 0), uses the virtualization extensions provided by the hardware to create a guest VM. Furthermore, the L0 hypervisor emulates the processor's virtualization extensions and exposes them to the guest VM (the ability to expose virtualization extensions is called nested virtualization). The guest VM can decide to run another instance of the hypervisor (which, in this case, is identified as L1 hypervisor, where L1 stands for Level 1), by using the emulated virtualization extensions exposed by the L0 hypervisor. The L1 hypervisor creates the nested root partition and starts the L2 root operating system in it. In the same way, the L2 root can orchestrate with the L1 hypervisor to launch a nested guest VM. The final guest VM in this configuration takes the name of L2 guest.

![Figure](figures/Winternals7thPt2_page_338_figure_004.png)

FIGURE 9-20 Nested virtualization scheme.

Nested virtualization is a software construction: the hypervisor must be able to emulate and manage virtualization extensions. Each virtualization instruction, while executed by the L1 guest VM, causes a VMEXIT to the L0 hypervisor, which, through its emulator, can reconstruct the instruction and perform the needed work to emulate it. At the time of this writing, only Intel and AMD hardware is supported. The nested virtualization capability should be explicitly enabled for the L1 virtual machine;

CHAPTER 9 Virtualization technologies      307


---

otherwise, the L0 hypervisor injects a general protection exception in the VM in case a virtualization

instruction is executed by the guest operating system.

On Intel hardware, Hyper-V allows nested virtualization to work thanks to two main concepts:

- ■ Emulation of the VT-x virtualization extensions

■ Nested address translation
As discussed previously in this section, for Intel hardware, the basic data structure that describes a virtual machine is the virtual machine control structure (VMCS). Other than the standard physical VMCS representing the L1 VM, when the L0 hypervisor creates a VP belonging to a partition that supports nested virtualization, it allocates some nested VMCS data structures (not to be confused with a virtual VMCS, which is a different concept). The nested VMCS is a software descriptor that contains all the information needed by the L0 hypervisor to start and run a nested VP for a L2 partition. As briefly introduced in the "Hypervisor startup" section, when the L1 hypervisor boots, it detects whether it's running in a virtualized environment and, if so, enables various nested enlightments, like the enlightened VMCS or the direct virtual flush (discussed later in this section).

As shown in Figure 9-21, for each nested VMCS, the L0 hypervisor also allocates a Virtual VMCS and a hardware physical VMCS, two similar data structures representing a VP running the L2 virtual machine. The virtual VMCS is important because it has the key role in maintaining the nested virtualized data. The physical VMCS instead is loaded by the L0 hypervisor when the L2 virtual machine is started; this happens when the L0 hypervisor intercepts a VMLaunch instruction executed by the L1 hypervisor.

![Figure](figures/Winternals7thPt2_page_339_figure_005.png)

FIGURE 9-21 A L0 hypervisor running a L2 VM by virtual processor 2.

In the sample picture, the L0 hypervisor has scheduled the VP 2 for running a L2 VM managed by the L1 hypervisor (through the nested virtual processor 1). The L1 hypervisor can operate only on virtualization data replicated in the virtual VMCS.

308      CHAPTER 9  Virtualization technologies


---

## Emulation of the VT-x virtualization extensions

On Intel hardware, the L0 hypervisor supports both enlightened and nonenlightened L1 hypervisors. The only official supported configuration is Hyper-V running on the top of Hyper-V, though.

In a nonenlightened hypervisor, all the VT-x instructions executed in the L1 quest causes a VMEXIT. After the L1 hypervisor has allocated the guest physical VMCS for describing the new L2 VM, it usually marks it as active (through the VMPTRLD instruction on Intel hardware). The L0 hypervisor intercepts the operation and associates an allocated nested VMCS with the guest physical VMCS specified by the L1 hypervisor. Furthermore, it fills the initial values for the virtual VMCS and sets the nested VMCS as active for the current VP. (It does not switch the physical VMCS though; the execution context should remain the L1 hypervisor). Each subsequent read or write to the physical VMCS performed by the L1 hypervisor is always intercepted by the L0 hypervisor and redirected to the virtual VMCS (refer to Figure 9-21).

When the L1 hypervisor launches the VM (performing an operation called VMENTRY), it executes a specific hardware instruction (VMLaunch on Intel hardware), which is intercepted by the L0 hypervisor. For nonenlightened scenarios, the L0 hypervisor copies all the guest fields of the virtual VMCS to another physical VMCS representing the L2 VM, writes the host fields by pointing them to L0 hypervisor's entry points, and sets it as active (by using the hardware VMPTRLD instruction on Intel platforms). In case the L1 hypervisor uses the second level address translation (EPT for Intel hardware), the L0 hypervisor then shadows the currently active L1 extended page tables (see the following section for more details). Finally, it performs the actual VMENTRY by executing the specific hardware instruction. As a result, the hardware executes the L2 VM's code.

While executing the L2 VM, each operation that causes a VMEXIT switches the execution context back to the L0 hypervisor (instead of the L1). As a response, the L0 hypervisor performs another VMENTRY on the original physical VMCS representing the L1 hypervisor context, injecting a synthetic VMEXIT event. The L1 hypervisor restarts the execution and handles the intercepted event as for regular non-nested VMEXITs. When the L1 completes the internal handling of the synthetic VMEXIT event, it executes a VMRESUME operation, which will be intercepted again by the L0 hypervisor and managed in a similar way of the initial VMENTRY operation described earlier.

Producing a VMEXIT each time the L1 hypervisor executes a virtualization instruction is an expensive operation, which could definitively contribute in the general slowdown of the L2 VM. For overcoming this problem, the Hyper-V hypervisor supports the enlightened VMCS, an optimization that, when enabled, allows the L1 hypervisor to load, read, and write virtualization data from a memory page shared between the L1 and L0 hypervisor (instead of a physical VMCS). The shared page is called enlightened VMCS. When the L1 hypervisor manipulates the virtualization data belonging to a L2 VM, instead of using hardware instructions, which cause a VMEXIT into the L0 hypervisor, it directly reads and writes from the enlightened VMCS. This significantly improves the performance of the L2 VM.

In enlightened scenarios, the L0 hypervisor intercepts only VMENTRY and VMEXIT operations (and some others that are not relevant for this discussion). The L0 hypervisor manages VMENTRY in a similar way to the nonenlightened scenario, but, before doing anything described previously, it copies the virtualization data located in the shared enlightened VMCS memory page to the virtual VMCS representing the L2 VM.

CHAPTER 9 Virtualization technologies     309


---

![Figure](figures/Winternals7thPt2_page_341_figure_000.png)

Note It is worth mentioning that for nonenlightened scenarios, the L0 Hypervisor supports

another technique for preventing VMEXITs while managing nested virtualization data, called

shadow VMCS. Shadow VMCS is a hardware optimization very similar to the enlightened VMCS.

## Nested address translation

As previously discussed in the "Partitions" physical address space" section, the hypervisor uses the SLAT for providing an isolated guest physical address space to a VM and to translate GPMs to real SPAs. Nested virtual machines would require another hardware layer of translation on top of the two already existing. For supporting nested virtualization, the new layer should have been able to translate L2 GPMs to L1 GPAs. Due to the increased complexity in the electronics needed to build a processor's MMU that manages three layers of translations, the Hyper-V hypervisor adopted another strategy for providing the additional layer of address translation, called shadow nested page tables. Shadow nested page tables use a technique similar to the shadow paging (see the previous section) for directly translating L2 GPMs to SPAs.

When a partition that supports nested virtualization is created, the L0 hypervisor allocates and initializes a nested page table shadowing domain. The data structure is used for storing a list of shadow nested page tables associated with the different L2 VMs created in the partition. Furthermore, it stores the partition’s active domain generation number (discussed later in this section) and nested memory statistics.

When the L0 hypervisor performs the initial VMENTRY for starting a L2 VM, it allocates the shadow nested page table associated with the VM and initializes it with empty values (the resulting physical address space is empty). When the L2 VM begins code execution, it immediately produces a VMEXIT to the L0 hypervisor due to a nested page fault (EPT violation in Intel hardware). The L0 hypervisor, instead of injecting the fault in the L1, walks the guest's nested page tables built by the L1 hypervisor. If it finds a valid entry for the specified L2 GPA, it reads the corresponding L1 GPA, translates it to an SPA, and creates the needed shadow nested page table hierarchy to map it in the L2 VM. It then fills the leaf table entry with the valid SPA (the hypervisor uses large pages for mapping shadow nested pages) and resumes the execution directly to the L2 VM by setting the nested VMCS that describes it as active.

For the nested address translation to work correctly, the L0 hypervisor should be aware of any modifications that happen to the L1 nested page tables; otherwise, the L2 VM could run with stale entries. This implementation is platform specific; usually hypervisors protect the L2 nested page table for readonly access. In that way they can be informed when the L1 hypervisor modifies it. The Hyper-V hypervitor adopts another smart strategy, though. It guarantees that the shadow nested page table describing the L2 VM is always updated because of the following two premises:

- When the L1 hypervisor adds new entries in the L2 nested page table, it does not perform any
other action for the nested VM (no intercepts are generated in the L0 hypervisor). An entry in
the shadow nested page table is added only when a nested page fault causes a VMEXIT in the
L0 hypervisor (the scenario described previously).
As for non-nested VM, when an entry in the nested page table is modified or deleted, the
hypervisor should always emit a TLB flush for correctly invalidating the hardware TLB. In case
---

of nested virtualization, when the L1 hypervisor emits a TLB flush, the L0 intercepts the request

and completely invalidates the shadow nested page table. The L0 hypervisor maintains a virtual

TLB concept thanks to the generation IDs stored in both the shadow VMCS and the nested

page table shadowing domain. (Describing the virtual TLB architecture is outside the scope

of the book.)

Completely invalidating the shadow nested page table for a single address changed seems to be redundant, but it's dictated by the hardware support. (The INVEPT instruction on Intel hardware does not allow specifying which single GPA to remove from the TLB.) In classical VMs, this is not a problem because modifications on the physical address space don't happen very often. When a classical VM is started, all its memory is already allocated. (The "Virtualization stack" section will provide more details.) This is not true for VA-backed VMs and VSM, though.

For improving performance in nonclassical nested VMs and VSM scenarios (see the next section for details), the hypervisor supports the "direct virtual flush" enlightenment, which provides to the L1 hypervisor two hypercalls to directly invalidate the TLB. In particular, the HvFlushGuestPhysicalAddress List hypercall (documented in the TLFS) allows the L1 hypervisor to invalidate a single entry in the shadow nested page table, removing the performance penalties associated with the flushing of the entire shadow nested page table and the multiple VMEXIT needed to reconstruct it.

## EXPERIMENT: Enabling nested virtualization on Hyper-V

As explained in this section, for running a virtual machine into a L1 Hyper-V VM, you should first enable the nested virtualization feature in the host system. For this experiment, you need a workstation with an Intel or AMD CPU and Windows 10 or Windows Server 2019 installed (Anniversary Update R51 minimum version). You should create a Type-2 VM using the Hyper-V Manager or Windows PowerShell with at least 4 GB of memory. In the experiment, you're creating a nested L2 VM into the created VM, so enough memory needs to be assigned.

After the first startup of the VM and the initial configuration, you should shut down the VM and open an administrative PowerShell window (type Windows PowerShell in the Cortana search box. Then right-click the PowerShell icon and select Run As Administrator). You should then type the following command, where the term "<VmName>" must be replaced by your virtual machine name:

```bash
Set-VMProcessor -VmName "<VmName>" -ExposeVirtualizationExtension $true
```

To properly verify that the nested virtualization feature is correctly enabled, the command

```bash
$(Get-VMProcessor -VMName "<VmName>").ExposeVirtualizationExtensions
```

should return True.

After the nested virtualization feature has been enabled, you can restart your VM. Before being able to run the L1 hypervisor in the virtual machine, you should add the necessary component through the Control panel. In the VM, search Control Panel in the Cortana box, open it, click Programs, and the select Turn Windows Features On Or Off. You should check the entire Hyper-V tree, as shown in the next figure.

CHAPTER 9 Virtualization technologies      311


---

![Figure](figures/Winternals7thPt2_page_343_figure_000.png)

Click OK. After the procedure finishes, click Restart to reboot the virtual machine (this step is needed). After the VM restarts, you can verify the presence of the LI hypervisor through the System Information application (type msinfo32 in the Cortana search box. Refer to the “Detecting VBS and its provided services” experiment later in this chapter for further details). If the hypervisor has not been started for some reason, you can force it to start by opening an administrative command prompt in the VM (type cmd in the Cortana search box and select Run As Administrator) and insert the following command:

```bash
bcdedit /set {current} hypervisorlaunchtype Auto
```

At this stage, you can use the Hyper-V Manager or Windows PowerShell to create a L2 guest VM directly in your virtual machine. The result can be something similar to the following figure:

![Figure](figures/Winternals7thPt2_page_343_figure_004.png)

312      CHAPTER 9   Virtualization technologies


---

From the L2 root partition, you can also enable the L1 hypervisor debugger, in a similar way as explained in the "Connecting the hypervisor debugger" experiment previously in this chapter. The only limitation at the time of this writing is that you can't use the network debugging in nested configurations; the only supported configuration for debugging the L1 hypervisor is through serial port. This means that in the host system, you should enable two virtual serial ports in the L1 VM (one for the hypervisor and the other one for the L2 root partition) and attach them to named pipes. For type-2 virtual machines, you should use the following PowerShell commands to set the two serial ports in the L1 VM (as with the previous commands, you should replace the term "<VMName>" with the name of your virtual machine):

```bash
Set-VMCompPort -VMName "<vVMName>" Number 1 -Path \".\.\!pipeHV.dbg"
Set-VMCompPort -VMName "<vVMName>" Number 2 -Path \".\.\!pipeNT.dbg"
```

After that, you should configure the hypervisor debugger to be attached to the COM1 serial

port; while the NT kernel debugger should be attached to the COM2 (see the previous experi ment for more details).

## The Windows hypervisor on ARM64

Unlike the x86 and AMD64 architectures, where the hardware virtualization support was added long after their original design, the ARM64 architecture has been designed with hardware virtualization support. In particular, as shown in Figure 9-22, the ARM64 execution environment has been split in three different security domains (called Exception Levels). The EL determines the level of privilege; the higher the EL, the more privilege the executing code has. Although all the user mode applications run in EL0, the NT kernel (and kernel mode drivers) usually runs in EL1. In general, a piece of software runs only in a single exception level. EL2 is the privilege level designed for running the hypervisor (which, in ARM64 is also called “virtual machine manager”) and is an exception to this rule. The hypervisor provides virtualization services and can run in Nonsecure World both in EL2 and EL1. (EL2 does not exist in the Secure World. ARM TrustZone will be discussed later in this section.)

![Figure](figures/Winternals7thPt2_page_344_figure_005.png)

FIGURE 9-22 The ARM64 execution environment.

CHAPTER 9 Virtualization technologies      313


---

Unlike from the AMD64 architecture, where the CPU enters the root mode (the execution domain

in which the hypervisor runs) only from the kernel context and under certain assumptions, when a

standard ARM64 device boots, the UEFI firmware and the boot manager begin their execution in EL2.

On those devices, the hypervisor loader (or Secure Launcher, depending on the boot flow) is able to

start the hypervisor directly and, at later time, drop the exception level to EL1 (by emitting an exception

return instruction, also known as ERET).

On the top of the exception levels, TrustZone technology enables the system to be partitioned between two execution security states: secure and non-secure. Secure software can generally access both secure and non-secure memory and resources, whereas normal software can only access non-secure memory and resources. The non-secure state is also referred to as the Normal World. This enables an OS to run in parallel with a trusted OS on the same hardware and provides protection against certain software attacks and hardware attacks. The secure state, also referred as Secure World, usually runs secure devices (their firmware and IOMMU ranges) and, in general, everything that requires the processor to be in the secure state.

To correctly communicate with the Secure World, the non-secure OS emits secure method calls (SMC), which provide a mechanism similar to standard OS syscalls. SMC are managed by the TrustZone. TrustZone usually provides separation between the Normal and the Secure Worlds through a thin memory protection layer, which is provided by well-defined hardware memory protection units (Qualcomm calls these XPUs). The XPUs are configured by the firmware to allow only specific execution environments to access specific memory locations. (Secure World memory can't be accessed by Normal World software.)

In ARM64 server machines, Windows is able to directly start the hypervisor. Client machines often do not have XPUs, even though TrustZone is enabled. (The majority of the ARM64 client devices in which Windows can run are provided by Qualcomm.) In those client devices, the separation between the Secure and Normal Worlds is provided by a proprietary hypervisor, named QHEE, which provides memory isolation using stage-2 memory translation (this layer is the same as the SLAT layer used by the Windows hypervisor). QHEE intercepts each SMC emitted by the running OS: it can forward the SMC directly to TrustZone (after having verified the necessary access rights) or do some work on its behalf. In these devices, TrustZone also has the important responsibility to load and verify the authenticity of the machine firmware and coordinates with QHEE for correctly executing the Secure Launch boot method.

Although in Windows the Secure World is generally not used (a distinction between Secure/Non secure world is already provided by the hypervisor through VTL levels), the Hyper-V hypervisor still runs in EL2. This is not compatible with the QHEE hypervisor, which runs in EL2, too. T o solve the problem correctly, Windows adopts a particular boot strategy; the Secure launch process is orchestrated with the aid of QHEE. When the Secure Launch terminates, the QHEE hypervisor unloads and gives up execution to the Windows hypervisor, which has been loaded as part of the Secure Launch. In later boot stages, after the Secure Kernel has been launched and the SMSS is creating the first user mode session, a new special trustlet is created (Qualcomm named it as “QCExt”). The trustlet acts as the original ARM64 hypervisor; it intercepts all the SMC requests, verifies the integrity of them, provides the needed memory isolations (through the services exposed by the Secure Kernel) and is able to send and receive commands from the Secure Monitor in EL3.

---

The SMC interception architecture is implemented in both the NT kernel and the ARM64 trustlet

and is outside the scope of this book. The introduction of the new trustlet has allowed the majority of

the client ARM64 machines to boot with Secure Launch and Virtual Secure Mode enabled by default.

(VSM is discussed later in this chapter.)

## The virtualization stack

Although the hypervisor provides isolation and the low-level services that manage the virtualization hardware, all the high-level implementation of virtual machines is provided by the virtualization stack. The virtualization stack manages the states of the VMs, provides memory to them, and virtualizes the hardware by providing a virtual motherboard, the system firmware, and multiple kind of virtual devices (emulated, synthetic, and direct access). The virtualization stack also includes VMBus, an important component that provides a high-speed communication channel between a guest VM and the root partition and can be accessed through the kernel mode client library (KMCL) abstraction layer.

In this section, we discuss some important services provided by the virtualization stack and analyze its components. Figure 9-23 shows the main components of the virtualization stack.

![Figure](figures/Winternals7thPt2_page_346_figure_004.png)

FIGURE 9-23 Components of the virtualization stack.

### Virtual machine manager service and worker processes

The virtual machine manager service (Vmms.exe) is responsible for providing the Windows Management Instrumentation (WMI) interface to the root partition, which allows managing the child partitions through a Microsoft Management Console (MMC) plug-in or through PowerShell. The VMMS service manages the requests received through the WMI interface on behalf of a VM (identified internally through a GUID), like start, power off, shutdown, pause, resume, reboot, and so on. It controls settings such as which devices are visible to child partitions and how the memory and

CHAPTER 9 Virtualization technologies      315


---

processor allocation for each partition is defined. The VMMS manages the addition and removal of devices. When a virtual machine is started, the VMVM Service also has the crucial role of creating a corresponding Virtual Machine Worker Process (VMWP.exe). The VMMS manages the VM snapshots by redirecting the snapshot requests to the VMWP process in case the VM is running or by taking the snapshot itself in the opposite case.

The VMWP performs various virtualization work that a typical monolithic hypervisor would perform (similar to the work of a software-based virtualization solution). This means managing the state machine for a given child partition (to allow support for features such as snapshots and state transitions), responding to various notifications coming in from the hypervisor, performing the emulation of certain devices exposed to child partitions (called emulated devices), and collaborating with the VM service and configuration component. The Worker process has the important role to start the virtual motherboard and to maintain the state of each virtual device that belongs to the VM. It also includes components responsible for remote management of the virtualization stack, as well as an RDP component that allows using the remote desktop client to connect to any child partition and remotely view its user interface and interact with it. The VM Worker process exposes the COM objects that provide the interface used by the Vmms (and the VmCompute service) to communicate with the VMWP instance that represents a particular virtual machine.

The VM host compute service (implemented in the Vmcompute.exe and Vmcompute.dll binaries) is

another important component that hosts most of the computation-intensive operations that are not

implemented in the VM Manager Service. Operation like the analysis of a VM's memory report (for

dynamic memory), management of VHd and VHDX files, and creation of the base layers for containers

are implemented in the VM host compute service. The Worker Process and Vmms can communicate

with the host compute service thanks the COM objects that it exposes.

The Virtual Machine Manager Service, the Worker Process, and the VM compute service are able to

open and parse multiple configuration files that expose a list of all the virtual machines created in the

system, and the configuration of each of them. In particular:

- ■ The configuration repository stores the list of virtual machines installed in the system, their
names, configuration file and GUID in the data\vmcx file located in C:\ProgramData\Microsoft
Windows Hyper-V.

■ The VM Data Store repository (part of the VM host compute service) is able to open, read, and
write the configuration file (usually with ".vmcx" extension) of a VM, which contains the list of
virtual devices and the virtual hardware's configuration.
The VM data store repository is also used to read and write the VM Save State file. The VM State file

is generated while pausing a VM and contains the save state of the running VM that can be restored

at a later time (state of the partition, content of the VM's memory, state of each virtual device). The

configuration files are formatted using an XML representation of key/value pairs. The plain XML data

is stored compressed using a proprietary binary format, which adds a write-journal logic to make it

resilient against power failures. Documenting the binary format is outside the scope of this book.

---

## The VID driver and the virtualization stack memory manager

The Virtual Infrastructure Driver (VID.sys) is probably one of the most important components of the virtualization stack. It provides partition, memory, and processor management services for the virtual machines running in the child partition, exposing them to the VM Worker process, which lives in the root. The VM Worker process and the VMMs services use the VID driver to communicate with the hypervisor, thanks to the interfaces implemented in the Windows hypervisor interface driver (WinHvsys and WinHvrs.sys), which the VID driver imports. These interfaces include all the code to support the hypervisor's hypercall management and allow the operating system (or generic kernel mode drivers) to access the hypervisor using standard Windows API calls instead of hypercalls.

The VID driver also includes the virtualization stack memory manager. In the previous section, we described the hypervisor memory manager, which manages the physical and virtual memory of the hypervisor itself. The guest physical memory of a VM is allocated and managed by the virtualization stack's memory manager. When a VM is started, the spawned VM Worker process (VMW.exe) invokes the services of the memory manager (defined in the IMemoryManager COM interface) for constructing the guest VM's RAM. Allocating memory for a VM is a two-step process:

- 1. The VM Worker process obtains a report of the global system's memory state (by using services
from the Memory Balancer in the VMS process), and, based on the available system memory,
determines the size of the physical memory blocks to request to the VID driver (through the
VID_RESERVED IOCTL, Sizes of the block vary from 64 MB up to 4 GB). The blocks are allocated by
the VID driver using MDL management functions (MdnAllocatePartitionNodePagesForMDeX in
particular). For performance reasons, and to avoid memory fragmentation, the VID driver imple-
ments a best-effort algorithm to allocate huge and large physical pages (1 GB and 2 MB) before
relying on standard small pages. After the memory blocks are allocated, their pages are depos-
ited to an internal "reserve" bucket maintained by the VID driver. The bucket contains page lists
ordered in an array based on their quality of service (QOS). The QOS is determined based on the
page type (huge, large, and small) and the NUMA node they belong to. This process in the VID
nomenclature is called "reserving physical memory" (not to be confused with the term "reserving
virtual memory," a concept of the NT memory manager).

2. From the virtualization stack perspective, physical memory commitment is the process of
emptying the reserved pages in the bucket and moving them in a VID memory block (VSMN_
MEMORY BLOCK data structure), which is created and owned by the VM Worker process
using the VID driver's services. In the process of creating a memory block, the VID driver
first deposits additional physical pages in the hypervisor (through the Winhvr driver and the
HvdDepositMemory hypercall). The additional pages are needed for creating the SLAT table
page hierarchy of the VM. The VID driver then requests to the hypervisor to map the physical
pages describing the entire guest partition's RAM. The hypervisor inserts valid entries in the
SLAT table and sets their proper permissions. The guest physical address space of the partition
is created. The GPA range is inserted in a list belonging to the VID partition. The VID memory
block is owned by the VM Worker process. It's also used for tracking guest memory and in DAX
file-backed memory blocks. (See Chapter 11, "Caching and file system support," for more details
about DAX volumes and PMEM.) The VM Worker process can later use the memory block for
multiple purposes—for example, to access some pages while managing emulated devices.
CHAPTER 9 Virtualization technologies      317


---

## The birth of a Virtual Machine (VM)

The process of starting up a virtual machine is managed primarily by the VMMS and VMWP process. When a request to start a VM (internally identified by a GUID) is delivered to the VMMS service (through PowerShell or the Hyper-V Manager GUI application), the VMMS service begins the starting process by reading the VM's configuration from the data store repository, which includes the VM's GUID and the list of all the virtual devices (VDEVs) comprising its virtual hardware. It then verifies that the path containing the VHD (or VHDX) representing the VM's virtual hard disk has the correct access control list (ACL, more details provided later). In case the ACL is not correct, if specified by the VM configuration, the VMMS service (which runs under a SYSTEM account) rewrites a new one, which is compatible with the new VMWP process instance. The VMMS uses COM services to communicate with the Host Compute Service to spawn a new VMWP process instance.

The Host Compute Service gets the path of the VM Worker process by querying its COM registration data located in the Windows registry (HKCU\CLSID\{f3463e0-7d59-11d9-9916-0008744f5f13} key). It then creates the new process using a well-defined access token, which is built using the virtual machine SID as the owner. Indeed, the NT Authority of the Windows Security model defines a wellknown subauthority value (83) to identify VMs (more information on system security components are available in Part 1, Chapter 7, "Security"). The Host Compute Service waits for the VMWP process to complete its initialization (in this way the exposed COM interfaces become ready). The execution returns to the VMMS service, which can finally request the starting of the VM to the VMWP process (through the exposed IVirtualMachine COM interface).

As shown in Figure 9-24, the VM Worker process performs a "cold start" state transition for the VM. In the VM Worker process, the entire VM is managed through services exposed by the "Virtual Motherboard." The Virtual Motherboard emulates an Intel i440BX motherboard on Generation 1 VMs, whereas on Generation 2, it emulates a proprietary motherboard. It manages and maintains the list of virtual devices and performs the state transitions for each of them. As covered in the next section, each virtual device is implemented as a COM object (exposing the IVirtualDevice interface) in a DLL. The Virtual Motherboard enumerates each virtual device from the VM's configuration and loads the relative COM object representing the device.

The VM Worker process begins the startup procedure by reserving the resources needed by each

virtual device. It then constructs the VM guest physical address space (virtual RAM) by allocating physi cal memory from the root partition through the VID driver. At this stage, it can power up the virtual

motherboard, which will cycle between each VDEV and power it up. The power-up procedure is differ ent for each device: for example, synthetic devices usually communicate with their own Virtualization

Service Provider (VSP) for the initial setup.

One virtual device that deserves a deeper discussion is the virtual BIOS (implemented in the Vmchispecit.dll library). Its power-up method allows the VM to include the initial firmware executed when the bootstrap VP is started. The BIOS VDEV extracts the correct firmware for the VM (legacy BIOS in the case of Generation 1 VMs; UEFI otherwise) from the resource section of its own backing library, builds the volatile configuration part of the firmware (like the ACPI and the SRAT table), and injects it in the proper guest physical memory by using services provided by the VID driver. The VID driver is indeed able to map memory ranges described by the VID memory block in user mode memory, accessible by the VM Worker process (this procedure is internally called “memory aperture creation”).

CHAPTER 9 Virtualization technologies

---

![Figure](figures/Winternals7thPt2_page_350_figure_000.png)

FIGURE 9-24 The VM Worker process and its interface for performing a "cold start" of a VM.

After all the virtual devices have been successfully powered up, the VM Worker process can start the

bootstrap virtual processor of the VM by sending a proper IOCTL to the VID driver, which will start the VP

and its message pump (used for exchanging messages between the VID driver and the VM Worker process).

## EXPERIMENT: Understanding the security of the VM Worker process and the virtual hard disk files

In the previous section, we discussed how the VM Worker process is launched by the Host Compute service (Vmcompute.exe) when a request to start a VM is delivered to the VMMS process (through WMI). Before communicating with the Host Compute Service, the VMMS generates a security token for the new Worker process instance.

Three new entities have been added to the Windows security model to properly support virtual machines (the Windows Security model has been extensively discussed in Chapter 7 of Part I):

- ■ A "virtual machines" security group, identified with the S-1-5-83-0 security identifier.
■ A virtual machine security identifier (SID), based on the VM's unique identifier (GUID). The
VM SID becomes the owner of the security token generated for the VM Worker process.
■ A VM Worker process security capability used to give applications running in
AppContainers access to Hyper-V services required by the VM Worker process.
CHAPTER 9 Virtualization technologies      319


---

In this experiment, you will create a new virtual machine through the Hyper-V manager in a location that's accessible only to the current user and to the administrators group, and you will check how the security of the VM files and the VM Worker process change accordingly.

First, open an administrative command prompt and create a folder in one of the workstation's

volumes (in the example we used C:\TestVm), using the following command:

```bash
md c:\TestVm
```

Then you need to strip off all the inherited ACEs (Access control entries; see Chapter 7 of Part 1 for further details) and add full access ACEs for the administrators group and the current loggedon user. The following commands perform the described actions (you need to replace %TestVm with the path of your directory and <UserName> with your currently logged-on user name):

```bash
icacls c:\TestVm \:inheritance:
icacls c:\TestVm \grant Administrators\CI\OI\F
icacls c:\TestVm \grant <UserName>:\CI\OIF
```

To verify that the folder has the correct ACL, you should open File Explorer (by pressing Win+E

on your keyboard), right-click the folder, select Properties, and finally click the Security tab. You

should see a window like the following one:

![Figure](figures/Winternals7thPt2_page_351_figure_006.png)

Open the Hyper-V Manager, create a VM (and its relative virtual disk), and store it in the newly

created folder (procedure available at the following page: https://docs.microsoft.com/en-us

/virtualization/hyper-v-on-windows/quick-start/create-virtual-machine). For this experiment, you

don’t really need to install an OS on the VM. After the New Virtual Machine Wizard ends, you

should start your VM (in the example, the VM is VM1).

---

Open a Process Explorer as administrator and locate the vmwp.exe process. Right-click it

and select Properties. As expected, you can see that the parent process is vmcompute.exe (Host

Compute Service). If you click the Security tab, you should see that the VM SID is set as the

owner of the process, and the token belongs to the Virtual Machines group:

![Figure](figures/Winternals7thPt2_page_352_figure_001.png)

The SID is composed by reflecting the VM GUID. In the example, the VM's GUID is {F156B244AE6-4291-8A6D-EDFE0960A1CE}. (You can verify it also by using PowerShell, as explained in the "Playing with the Root scheduler" experiment earlier in this chapter). A GUID is a sequence of 16-bytes, organized as one 32-bit (4 bytes) integer, two 16-bit (2 bytes) integers, and 8 final bytes. The GUID in the example is organized as:

- ■ 0xF156842C as the first 32-bit integer, which, in decimal, is 4048991276.
■ 0x4AE6 and 0x4291 as the two 16-bit integers, which, combined as one 32-bit value, is
0x42914AE6, or 111681850 in decimal (remember that the system is little endian, so the less
significant byte is located at the lower address).
■ The final byte sequence is 0x8A, 0xD6, 0xED, 0xFE, 0x09, 0x60, 0xA1 and 0xCE (the third
part of the shown human readable GUID. 8AD6, is a byte sequence, and not a 16-bit value),
which, combined as two 32-bit values is 0xFEEDD68A and 0xCAE16009, or 4276999818 and
3466682377 in decimal.
CHAPTER 9 Virtualization technologies      321


---

If you combine all the calculated decimal numbers with a general SID identifier emitted by the

NT authority (S-1-5) and the VM base RID (83), you should obtain the same SID shown in Process

Explorer (in the example, S-1-5-83-4048991276-116618150-4276999818-3466682377).

As you can see from Process Explorer, the VMWP process's security token does not include the Administrators group, and it hasn't been created on behalf of the logged-on user. So how is it possible that the VM Worker process can access the virtual hard disk and the VM configuration files?

The answer resides in the VMMS process, which, at VM creation time, scans each component

of the VM’s path and modifies the DACL of the needed folders and files. In particular, the root

folder of the VM (the root folder has the same name of the VM, so you should find a subfolder in

the created directory with the same name of your VM) is accessible thanks to the added virtual

machines security group ACE. The virtual hard disk file is instead accessible thanks to an access allowed ACE targeting the virtual machine’s SID.

You can verify this by using File Explorer: Open the VM's virtual hard disk folder (called Virtual

Hard Disks and located in the VM root folder), right-click the VHDX (or VHD) file, select Properties,

and then click the Security page. You should see two new ACEs other than the one set initially. (One

is the virtual machine ACE; the other one is the VmWorker process Capability for AppContainers.)

![Figure](figures/Winternals7thPt2_page_353_figure_004.png)

If you stop the VM and you try to delete the virtual machine ACE from the file, you will see that the VM is not able to start anymore. For restoring the correct ACL for the virtual hard disk, you can run a PowerShell script available at https://gallery.technet.microsoft.com/ Hyper-V-Restore-ACL-e64dee58.

322      CHAPTER 9  Virtualization technologies


---

## VMBus

VMBus is the mechanism exposed by the Hyper-V virtualization stack to provide interpartition communication between VMs. It is a virtual bus device that sets up channels between the guest and the host. These channels provide the capability to share data between partitions and set up paravirtualized (also known as synthetic) devices.

The root partition hosts Virtualization Service Providers (VSPs) that communicate over VMBoS to handle device requests from child partitions. On the other end, child partitions (or guests) use Virtualization Service Consumers (VSCs) to redirect device requests to the VSP over VMBus. Child partitions require VMBoS and VSC drivers to use the paravirtualized device stacks (more details on virtual hardware support are provided later in this chapter in the "virtual hardware support" section). VMBoS channels allow VSCs and VSPs to transfer data primarily through two ring buffers: upstream and downstream. These ring buffers are mapped into both partitions thanks to the hypervisor, which, as discussed in the previous section, also provides interpation communication services through the SynIC.

One of the first virtual devices (VDEV) that the Worker process starts while powering up a VM is the VMBus VDEV (implemented in Vmbusdev.dll). Its power-on runtime connects the VM Worker process to the VMBus root driver (Vmbusr.sys) by sending VMBUS_VDEV_SETUP IOCTL to the VMBus root device (named \DeviceRootVmBus). The VMBus root driver orchestrates the parent endpoint of the bidirectional communication to the child VM. Its initial setup routine, which is invoked at the time the target VM isn't still powered on, has the important role to create an XPartition data structure, which is used to represent the VMBus instance of the child VM and to connect the needed Sync synthetic interupt sources (also known as SINT, see the "Synthetic Interrupt Controller" section earlier in this chapter for more details). In the root partition, VMBus uses two synthetic interrupt sources: one for the initial message handshaking (which happens before the channel is created) and another one for the synthetic events signaled by the ring buffers. Child partitions use only one SINT, though. The Setup routine allocates the main message port in the child VM and the corresponding connection in the root, and, for each virtual processor belonging to the VM, allocates an event port and its connection (used for receiving synthetic events from the child VM).

The two synthetic interrupt sources are mapped using two ISR routines, named klvmbusInterrupt0

and klvmbusInterrupt1. Thanks to these two routines, the root partition is ready to receive synthetic

interrupts and messages from the child VM. When a message (or event) is received, the ISR queues a

deferred procedure call (DPC), which checks whether the message is valid; if so, it queues a work item,

which will be processed later by the system running at passive IRQL level (which has further implica tions on the message queue).

Once VMBus in the root partition is ready, each VSP driver in the root can use the services exposed by the VMBus kernel mode client library to allocate and offer a VMBus channel to the child VM. The VMBus kernel mode client library (abbreviated as KMCL) represents a VMBus channel through an opaque KMODE_CLIENT_CONTEXT data structure, which is allocated and initialized at channel creation time (when a VSP calls the VmbChannelAllocate API). The root VSP then normally offers the channel to the child VM by calling the VmbChannelEnabled API (this function in the child establishes the actual connection to the root by opening the channel). KMCL is implemented in two drivers: one running in the root partition (Vmkbmclr.sys) and one loaded in child partitions (Vmkbmclr.sys).

CHAPTER 9 Virtualization technologies      323


---

Offering a channel in the root is a relatively complex operation that involves the following steps:

- 1. The KMCL driver communicates with the VMBus root driver through the file object initialized in
the VDEV power-up routine. The VMBus driver obtains the XPartition data structure represent-
ing the child partition and starts the channel offering process.

2. Lower-level services provided by the VMBus driver allocate and initialize a LOCAL_OFFER data
structure representing a single "channel offer" and preallocate some Sync predefined messages.
VMBus then creates the synthetic event port in the root, from which the child can connect to
signal events after writing data to the ring buffer. The LOCAL_OFFER data structure represent-
ing the offered channel is added to an internal server channels list.

3. After VMBus has created the channel, it tries to send the OfferChannel message to the child
with the goal to inform it of the new channel. However, at this stage, VMBus fails because the
other end (the child VM) is not ready yet and has not started the initial message handshake.
After all the VSPs have completed the channel offering, and all the VDEV have been powered up

(see the previous section for details), the VM Worker process starts the VM. For channels to be com pletely initialized, and their relative connections to be started, the guest partition should load and start

the VMBus child driver (Vmbus.sys).

## Initial VMBus message handshaking

In Windows, the VMBus child driver is a WDF bus driver enumerated and started by the Pnp manager and located in the ACPI root enumerator. (Another version of the VMBus child driver is also available for Linux. VMBus for Linux is not covered in this book, though.) When the NT kernel starts in the child VM, the VMBus driver begins its execution by initializing its own internal state (which means allocating the needed data structure and work items) and by creating the \Device\VmBus root functional device object (FDO). The Pnp manager then calls the VMBus's resource assignment handler routine. The latter configures the correct SINT source (by emitting a HwSetVpRegisters hypercall on one of the HwRegisterSint registers, with the help of the WinHw driver) and connects it to the KiVmbusInterrupt2 ISR. Furthermore, it obtains the SIMP page, used for sending and receiving synthetic messages to and from the root partition (see the "Synthetic Interrupt Controller" section earlier in this chapter for more details), and creates the XPartition data structure representing the parent (root) partition.

When the request of starting the VMbus' FDO comes from the Pnp manager, the VMbus driver starts the initial message handshaking. At this stage, each message is sent by emitting the HvPostMessage hypercall (with the help of the WinHv driver), which allows the hypervisor to inject a synthetic interrupt to a target partition (in this case, the target is the partition). The receiver acquires the message by simply reading from the SIMP page; the receiver signals that the message has been read from the queue by setting the new message type to MessageTypeNone. (See the hypervisor TLFS for more details.) The reader can think of the initial message handshake, which is represented in Figure 9-25, as a process divided in two phases.

---

![Figure](figures/Winternals7thPt2_page_356_figure_000.png)

FIGURE 9-25 VMBus initial message handshake.

The first phase is represented by the Initiate Contact message, which is delivered once in the lifetime

of the VM. This message is sent from the child VM to the root with the goal to negotiate the VMBo

protocol version supported by both sides. At the time of this writing, there are five main VMBo pro tocol versions, with some additional slight variations. The root partition parses the message, asks the

hypervisor to map the monitor pages allocated by the client (if supported by the protocol), and replies

by accepting the proposed protocol version. Note that if this is not the case (which happens when the

Windows version running in the root partition is lower than the one running in the child VM), the child

VM restarts the process by downgrading the VMBo protocol version until a compatible version is es tablished. At this point, the child is ready to send the Request Offers message, which causes the root

partition to send the list of all the channels already offered by the VSPs. This allows the child partition

to open the channels later in the handshaking protocol.

Figure 9-25 highlights the different synthetic messages delivered through the hypervisor for settig up the VMBus channel or channels. The root partition walks the list of the offered channels located in the Server Channels list (LOCAL_OFFER data structure, as discussed previously), and, for each of them, sends an Offer Channel message to the child VM. The message is the same as the one sent at the final stage of the channel offering protocol, which we discussed previously in the "VMBus" section. So, while

CHAPTER 9 Virtualization technologies      325


---

the first phase of the initial message handshake happens only once per lifetime of the VM, the second phase can start any time when a channel is offered. The Offer Channel message includes important data used to uniquely identify the channel, like the channel type and instance GUIDs. For VDEV channels, these two GUIDs are used by the PnP Manager to properly identify the associated virtual device.

The child responds to the message by allocating the client LOCAL_OFFER data structure representing the channel and the relative Xinterrupt object, and by determining whether the channel requires a physical device object (PDO) to be created, which is usually always true for VDEVs' channels. In this case, the VMBus driver creates an instance PDO representing the new channel. The created device is protected through a security descriptor that renders it accessible only from system and administrative accounts. The VMBus standard device interface, which is attached to the new PDO, maintains the association between the new VMBus channel (through the LOCAL_OFFER data structure) and the device object. After the PDO is created, the PnP Manager is able to identify and load the correct VSC driver through the VDEV type and instance GUIDs included in the Offer Channel message. These interfaces become part of the new PDO and are visible through the Device Manager. See the following experiment for details. When the VSC driver is then loaded, it usually calls the VmbEnableChannel API (exposed by KMCL, as discussed previously) to "open" the channel and create the final ring buffer.

## EXPERIMENT: Listing virtual devices (VDEVs) exposed through VMBus

Each VMBus channel is identified through a type and instance GUID. For channels belonging to VDEVs, the type and instance GUID also identifies the exposed device. When the VMBus child driver creates the instance PDOs, it includes the type and instance GUID of the channel in multiple devices' properties, like the instance path, hardware ID, and compatible ID. This experiment shows how to enumerate all the VDEVs built on the top of VMBus.

For this experiment, you should build and start a Windows 10 virtual machine through the Hyper-V Manager. When the virtual machine is started and runs, open the Device Manager (by typing its name in the Cortana search box, for example). In the Device Manager applet, click the View menu, and select Device by Connection. The VMBus bus driver is enumerated and started through the ACPI enumerator, so you should expand the ACPI x64-based PC root node and then the ACPI Module Device located in the Microsoft ACPI-Compliant System child node, as shown in the following figure:

---

![Figure](figures/Winternals7thPt2_page_358_figure_000.png)

By opening the ACPI Module Device, you should find another node, called Microsoft Hyper-V Virtual Machine Bus, which represents the root VMBus PDO. Under that node, the Device Manager shows all the instance devices created by the VMBus FDO after their relative VMBus channels have been offered from the root partition.

Now right-click one of the Hyper-V devices, such as the Microsoft Hyper-V Video device, and

select Properties. For showing the type and instance GUIDs of the VMBus channel backing the

virtual device, open the Details tab of the Properties window. Three device properties include

the channel's type and instance GUID (exposed in different formats): Device Instance path,

Hardware ID, and Compatible ID. Although the compatible ID contains only the VMBus channel

type GUID ((da0a7802-e377-4aac-8e77-0555eb703f8) in the figure), the hardware ID and device

instance path contain both the type and instance GUIDs.

## Opening a VMBus channel and creating the ring buffer

For correctly starting the interpartition communication and creating the ring buffer, a channel must be opened. Usually VSCs, after having allocated the client side of the channel (still through VmbChannelAllocate), call the VmbChannelEnable API exported from the KMCL driver. As introduced in the previous section, this API in the child partitions opens a VMBus channel, which has already been offered by the root. The KMCL driver communicates with the VMBus driver, obtains the channel parameters (like the channel's type, instance GUID, and used MMIO space), and creates

CHAPTER 9 Virtualization technologies      327


---

a work item for the received packets. It then allocates the ring buffer, which is shown in Figure 9-26.

The size of the ring buffer is usually specified by the VSC through a call to the KMCL exported

VmbClientChannelInitSetRingBufferPageCount API.

![Figure](figures/Winternals7thPt2_page_359_figure_001.png)

FIGURE 9-26 An example of a 16-page ring buffer allocated in the child partition.

The ring buffer is allocated from the child VM's non-paged pool and is mapped through a memory descriptor list (MDL) using a technique called double mapping. (MDLs are described in Chapter 5 of Part 1.) In this technique, the allocated MDL describes a double number of the incoming (or outgoing) buffer's physical pages. The PFN array of the MDL is filled by including the physical pages of the buffer twice: one time in the first half of the array and one time in the second half. This creates a "ring buffer."

For example, in Figure 9-26, the incoming and outgoing buffers are 16 pages (0x10) large. The outgoing buffer is mapped at address 0xFFFFCA803D8C0000. If the sender writes a 1-KB VMBus packet to a position close to the end of the buffer, let's say at offset 0xFF00, the write succeeds (no access violation exception is raised), but the data will be written partially in the end of the buffer and partially in the beginning. In Figure 9-26, only 256 (0x100) bytes are written at the end of the buffer, whereas the remaining 768 (0x300) bytes are written in the start.

Both the incoming and outgoing buffers are surrounded by a control page. The page is shared between the two endpoints and composes the VM ring control block. This data structure is used to keep track of the position of the last packet written in the ring buffer. It furthermore contains some bits to control whether to send an interrupt when a packet needs to be delivered.

After the ring buffer has been created, the KMCL driver sends an IOCTL to VMBus, requesting the creation of a GPA descriptor list (GPADL). A GPADL is a data structure very similar to an MDL and is used for describing a chunk of physical memory. Differently from an MDL, the GPADL contains an array of guest physical addresses (GPAs, which are always expressed as 64-bit numbers, differently from the PFNs included in a MDL). The VMBus driver sends different messages to the root partition for transferring the entire GPADL describing both the incoming and outcoming ring buffers. (The maximum size of a synthetic message is 240 bytes, as discussed earlier.) The root partition reconstructs the entire

328      CHAPTER 9   Virtualization technologies


---

GPADL and stores it in an internal list. The GPADL is mapped in the root when the child VM sends the final Open Channel message. The root VMBus driver parses the received GPADL and maps it in its own physical address space by using services provided by the VID driver (which maintains the list of memory block ranges that comprise the VM physical address space).

At this stage the channel is ready: the child and the root partition can communicate by simply reading or writing data to the ring buffer. When a sender finishes writing its data, it calls the VmbChannelSend

SynchronousRequest API exposed by the KMCL driver. The API invokes VMBus services to signal an event in the monitor page of the Xinterrupt object associated with the channel (old versions of the VMBus protocol used an interrupt page, which contained a bit corresponding to each channel). Alternatively, VMBus can signal an event directly in the channel's event port, which depends only on the required latency.

Other than VSCs, other components use VMBuses to implement higher-level interfaces. Good examples are provided by the VMBus pipes, which are implemented in two kernel mode libraries (Vmbsnpipe.dll and Vmbusspiper.dll) and rely on services exposed by the VMBus driver (through IOCTLs). Hyper-V Sockets (also known as HvSockets) allow high-speed interpartition communication using standard network interfaces (sockets). A client connects an AF_HYPERV socket type to a target VM by specifying the target VM's GUID and a GUID of the Hyper-V socket's service registration (to use HvSockets, both endpoints must be registered in the HKLM\SOFTWARE\Microsoft\Windows\NT\CurrentVersion\Virtualization\ GuestCommunicationServices registry key) instead of the target IP address and port. Hyper-V Sockets are implemented in multiple drivers; HvSocket.sys is the transport driver, which exposes low-level services used by the socket infrastructure; HvSocketControl.sys is the provider control driver used to load the HvSocket provider in case the VMBus interface is not present in the system; HvSocket.dll is a library that exposes supplementary socket interfaces (tied to Hyper-V sockets) callable from user mode applications. Describing the internal infrastructure of both Hyper-V Sockets and VMBus pipes is outside the scope of this book, but both are documented in Microsoft Docs.

## Virtual hardware support

For properly run virtual machines, the virtualization stack needs to support virtualized devices. Hyper-V supports different kinds of virtual devices, which are implemented in multiple components of the virtualization stack. I/O to and from virtual devices is orchestrated mainly in the root OS. I/O includes storage, networking, keyboard, mouse, serial ports and GPU (graphics processing unit). The virtualization stack exposes three kinds of devices to the guest VMs.

- Emulated devices, also known—in industry-standard form—as fully virtualized devices

Synthetic devices, also known as paravirtualized devices

Hardware-accelerated devices, also known as direct-access devices
For performing I/O to physical devices, the processor usually reads and writes data from input and output ports (I/O ports), which belong to a device. The CPU can access I/O ports in two ways:

- ■ Through a separate I/O address space, which is distinct from the physical memory address
space and, on AMD64 platforms, consists of 64 thousand individually addressable I/O ports.
This method is old and generally used for legacy devices.
CHAPTER 9 Virtualization technologies      329


---

- ■ Through memory mapped I/O. Devices that respond like memory components can be accessed
through the processor's physical memory address space. This means that the CPU accesses
memory through standard instructions: the underlying physical memory is mapped to a device.
Figure 9-27 shows an example of an emulated device (the virtual IDE controller used in Generation 1 VMs), which uses memory-mapped I/O for transferring data to and from the virtual processor.

![Figure](figures/Winternals7thPt2_page_361_figure_002.png)

FIGURE 9-27 The virtual IDE controller, which uses emulated I/O to perform data transfer.

In this model, every time the virtual processor reads or writes to the device MMIO space or emits instructions to access the I/O ports, it causes a VMEXIT to the hypervisor. The hypervisor calls the proper intercept routine, which is dispatched to the VID driver. The VID driver builds a VID message and enqueues it in an internal queue. The queue is drained by an internal VMWP's thread, which waits and dispatches the VP's messages received from the VID driver; this thread is called the message pump thread and belongs to an internal thread pool initialized at VMWP creation time. The VM Worker process identifies the physical address causing the VMEXIT, which is associated with the proper virtual device (VDEV), and calls into one of the VDEV callbacks (usually read or write callback). The VDEV code uses the services provided by the instruction emulator to execute the faulting instruction and properly emulate the virtual device (an IDE controller in the example).

![Figure](figures/Winternals7thPt2_page_361_figure_005.png)

NOTE The full instructions emulator located in the VM Worker process is also used for other different purposes, such as to speed up cases of intercept-intensive code in a child partition. The emulator in this case allows the execution context to stay in the Worker process between intercepts, as VMEXITs have serious performance overhead. Older versions of the hardware virtualization extensions prohibit executing real-mode code in a virtual machine, for those cases, the virtualization stack was using the emulator for executing real-mode code in a VM.

---

## Paravirtualized devices

While emulated devices always produce VMEXITs and are quite slow, Figure 9-28 shows an example of a synthetic or paravirtualized device: the synthetic storage adapter. Synthetic devices know to run in a virtualized environment; this reduces the complexity of the virtual device and allows it to achieve higher performance. Some synthetic virtual devices exist only in virtual form and don't emulate any real physical hardware (an example is synthetic RDP).

![Figure](figures/Winternals7thPt2_page_362_figure_002.png)

FIGURE 9-28 The storage controller paravirtualized device.

Paravirtualized devices generally require three main components:

- ■ A virtualization service provider (VSP) driver runs in the root partition and exposes virtualiza-
tion-specific interfaces to the guest thanks to the services provided by VMBus (see the previous
section for details on VMBus).

■ A synthetic VDEV is mapped in the VM Worker process and usually cooperates only in the start-
up, teardown, save, and restore of the virtual device. It is generally not used during the regular
work of the device. The synthetic VDEV initializes and allocates device-specific resources (in the
example, the SynthStor VDEV initializes the virtual storage adapter), but most importantly allows
the VSP to offer a VMBus communication channel to the guest VSC. The channel will be used for
communication with the root and for signaling device-specific notifications via the hypervisor.

■ A virtualization service consumer (VSC) driver runs in the child partition, understands the vir-
tualization-specific interfaces exposed by the VSP, and reads/writes messages and notifications
from the shared memory exposed through VMBus by the VSP. This allows the virtual device to
run in the child VM faster than an emulated device.

CHAPTER 9 Virtualization technologies 331

---

## Hardware-accelerated devices

On server SKUs, hardware-accelerated devices (also known as direct-access devices) allow physical devices to be remapped in the guest partition, thanks to the services exposed by the VPCI infrastructure. When a physical device supports technologies like single-root input/output virtualization (SR IOV) or Discrete Device Assignment (DDA), it can be mapped to a guest partition. The guest partition can directly access the MIMIO space associated with the device and can perform DMA to and from the guest memory directly without any interception by the hypervisor. The IOMMU provides the needed security and ensures that the device can initiate DMA transfers only in the physical memory that belong to the virtual machine.

Figure 9-29 shows the components responsible in managing the hardware-accelerated devices:

- ■ The VPCi VDEV (Vpcierv.dll) runs in the VM Worker process. Its rule is to extract the list of
hardware-accelerated devices from the VM configuration file, set up the VPCI virtual bus, and
assign a device to the VSP.
■ The PCI Proxy driver (Pcip.sys) is responsible for dismounting and mounting a DDA-compatible
physical device from the root partition. Furthermore, it has the key role in obtaining the list of
resources used by the device (through the SR-IOV protocol) like the MMIO space and interrupts.
The proxy driver provides access to the physical configuration space of the device and renders
an "unmounted" device inaccessible to the host OS.
■ The VPCI virtual service provider (Vpcivsp.sys) creates and maintains the virtual bus object,
which is associated to one or more hardware-accelerated devices (which in the VPCI VSP are
called virtual devices). The virtual devices are exposed to the guest VM through a VMBus chan-
nel created by the VSP and offered to the VSC in the guest partition.
■ The VPCI virtual service client (Vpci.sys) is a WDF bus driver that runs in the guest VM. It con-
nects to the VMBus channel exposed by the VSP, receives the list of the direct access devices
exposed to the VM and their resources, and creates a PDO (physical device object) for each of
them. The devices driver can then attach to the created PDOs in the same way as they do in
nonvirtualized environments.
When a user wants to map a hardware-accelerated device to a VM, it uses some PowerShell commands (see the following experiment for further details), which start by "unmounting" the device from the root partition. This action forces the VMMS service to communicate with the standard PCI driver (through its exposed device, called PciControl). The VMMS service sends a PCIDRIVE_ADD _VMPROPATH IOCTL to the PCI driver by providing the device descriptor (in form of bus, device, and function ID). The PCI driver checks the descriptor, and, if the verification succeeded, adds it in the HKLM\System\CurrentControlSet\Control\PrnP.PciVmProxy registry value. The VMMS then starts a PNP device (re)enumeration by using services exposed by the PNP manager. In the enumeration phase, the PCI driver finds the new proxy device and loads the PCI proxy driver (Pcip.sys), which marks the device as reserved for the virtualization stack and renders it invisible to the host operating system.

---

![Figure](figures/Winternals7thPt2_page_364_figure_000.png)

FIGURE 9-29 Hardware-accelerated devices.

The second step requires assigning the device to a VM. In this case, the VMMS writes the device descriptor in the VM configuration file. When the VM is started, the VPCI VDEV (vcpicedv.devll) reads the direct-access device's descriptor from the VM configuration, and starts a complex configuration phase that is orchestrated mainly by the VPCI VSP (Vpcivsp.sys). Indeed, in its "power on" callback, the VPCI VDEV sends different IOCTLs to the VPCI VSP (which runs in the root partition), with the goal to perform the creation of the virtual bus and the assignment of hardware-accelerated devices to the guest VM.

A "virtual bus" is a data structure used by the VPCI infrastructure as a "glue" to maintain the connection between the root partition, the guest VM, and the direct-access devices assigned to it. The VPCI VSP allocates and starts the VMBus channel offered to the guest VM and encapsulates it in the virtual bus. Furthermore, the virtual bus includes some pointers to important data structures, like some allocated VMBus packets used for the bidirectional communication, the guest power state, and so on. After the virtual bus is created, the VPCI VSP performs the device assignment.

A hardware-accelerated device is internally identified by a LUID and is represented by a virtual device object, which is allocated by the VPCI VSP. Based on the device's LUID, the VPCI VSP locates the proper proxy driver, which is also known as Mux driver—it's usually Pcip.sys). The VPCI VSP queries the SR-IOV or DDA interfaces from the proxy driver and uses them to obtain the Plug and Play information (hardware descriptor) of the direct-access device and to collect the resource requirements (MMIO space, BAR registers, and DMA channels). At this point, the device is ready to be attached to the guest VM: the VPCI VSP uses the services exposed by the WinHvr driver to emit the HvAttachDevice hypercall to the hypervisor, which reconfigures the system IOMMU for mapping the device's address space in the guest partition.

The guest VM is aware of the mapped device thanks to the VPCI VSC (Vpci.S). The VPCI VSC is a WDBF bus driver enumerated and launched by the VMBus bus driver located in the guest VM. It is

CHAPTER 9 Virtualization technologies      333


---

composed of two main components: a FDO (functional device object) created at VM boot time, and one or more PDOs (physical device objects) representing the physical direct-access devices remapped in the guest VM. When the VPCI VSC bus driver is executed in the guest VM, it creates and starts the client part of the VMBus channel used to exchange messages with the VSP. "Send bus relations" is the first message sent by the VPCI VSC thorough the VMBus channel. The VSP in the root partition responds by sending the list of hardware IDs describing the hardware-accelerated devices currently attached to the VM. When the PNP manager requires the new device relations to the VPCI VSC, the latter creates a new PDO for each discovered direct-access device. The VSC driver sends another message to the VSP with the goal of requesting the resources used by the PDO.

After the initial setup is done, the VSC and VSP are rarely involved in the device management. The

specific hardware-accelerated device’s driver in the guest VM attaches to the relative PDO and man ages the peripheral as if it had been installed on a physical machine.

## EXPERIMENT: Mapping a hardware-accelerated NVMe disk to a VM

As explained in the previous section, physical devices that support SR-IOV and DDE technologies can be directly mapped in a guest VM running in a Windows Server 2019 host. In this experiment, we are mapping an NVMe disk, which is connected to the system through the PCI-Ex bus and supports DDE, to a Windows 10 VM. (Windows Server 2019 also supports the direct assignment of a graphics card, but this is outside the scope of this experiment.)

As explained at https://docs.microsoft.com/en-us/virtualization/community/team-blog/2015/2015120-discrete-device-assignment-machines-and-devices, for being able to be reassigned, a device should have certain characteristics, such as supporting message-signaled interrupts and memory-mapped I/O. Furthermore, the machine in which the hypervisor runs should support SR-IOV and have a proper I/O MMU. For this experiment, you should start by verifying that the SR-IOV standard is enabled in the system BIOS (not explained here; the procedure varies based on the manufacturer of your machine).

The next step is to download a PowerShell script that verifies whether your NVMe controller is compatible with Discrete Device Assignment. You should download the survey-dda.ps1

PowerShell script from https://github.com/MicrosoftDocs/Virtualization-Documentation/tree

/master/hyper-services/benam-powershell/DDA. Open an administrative PowerShell window

(by typing PowerShell in the Cortana search box and selecting Run As Administrator) and

check whether the PowerShell script execution policy is set to unrestricted by running the Get ExecutionPolicy command. If the command yields some output different than Unrestricted,

you should type the following: Set-ExecutionPolicy -Scope LocalMachine -ExecutionPolicy

Unrestricted, press Enter, and confirm with Y.

If you execute the downloaded survey-dda.ps script, its output should highlight whether your NVMe device can be reassigned to the guest VM. Here is a valid output example:

```bash
Standard NVM Express Controller
Express Endpoint -- more secure.
And its interrupts are message-based, assignment can work.
    PCI000T(0)#PCI(0302)#PCI(0000)
```

---

Take note of the location path (the PCIROOT()0)PCI(032)PCI(0000) string in the example.


Now we will set the automatic stop action for the target VM as turned-off (a required step for

DDA) and dismount the device. In our example, the VM is called “Vibranium.” Write the following

commands in your PowerShell window (by replacing the sample VM name and device location

with your own):

```bash
Set-VM -Name "Vibranium" -AutomaticStopAction TurnOff
Dismount-VMHomeAssignableDevice -LocationPoint "PCIOKIT(0)#PCI(0302)#PCI(0000)"
```

In case the last command yields an operation failed error, it is likely that you haven't disabled the device. Open the Device Manager, locate your NVMe controller (Standard NVMe Express Controller in this example), right-click it, and select Disable Device. Then you can type the last command again. It should succeed this time. Then assign the device to your VM by typing the following:

```bash
Add-VMAssignableDevice -LocationPath "PCIROOT(0)#PCI(0302)#PCI(0000)" -VMName  "Vibranium"
```

The last command should have completely removed the NVMe controller from the host. You should verify this by checking the Device Manager in the host system. Now it's time to power up the VM. You can use the Hyper-V Manager tool or PowerShell. If you start the VM and get an error like the following, your BIOS is not properly configured to expose SR-IOV, or your I/O MMU doesn't have the required characteristics (most likely it does not support I/O remapping).

![Figure](figures/Winternals7thPt2_page_366_figure_005.png)

Otherwise, the VM should simply boot as expected. In this case, you should be able to see both the NVMe controller and the NVMe disk listed in the Device Manager applet of the child VM. You can use the disk management tool to create partitions in the child VM in the same way you do in the host OS. The NVMe disk will run at full speed with no performance penalties (you can confirm this by using any disk benchmark tool).

To properly remove the device from the VM and remount it in the host OS, you should first

shut down the VM and then use the following commands (remember to always change the vir tual machine name and NVMe controller location):

```bash
Remove-VMAssistableDevice -LocationPath "PC\BOOT\0\IPC(3032)\PC\0000" -VPName
VBMT-VMHostAssignableDevice -LocationPath "PC\BOOT\0\IPC(3032)\PC\0000"
```

After the last command, the NVMe conroller should reappear listed in the Device Manager of the host OS. You just need to reenable it for restarting to use the NVMe disk in the host.

CHAPTER 9 Virtualization technologies      335


---

## VA-backed virtual machines

Virtual machines are being used for multiple purposes. One of them is to properly run traditional software in isolated environments, called containers. (Server and application silos, which are two types of containers, have been introduced in Part 1, Chapter 3, "Processes and jobs. ") Fully isolated containers (internally named Xenon and Krypton) require a fast-startup type, low overhead, and the possibility of getting the lowest possible memory footprint. Guest physical memory of this type of VM is generally shared between multiple containers. Good examples of containers are provided by Windows Defender Application Guard, which uses a container to provide the full isolation of the browser, or by Windows Sandbox, which uses containers to provide a fully isolated virtual environment. Usually a container shares the same VM's firmware, operating system, and, often, also some applications running in it (the shared components compose the base layer of a container). Running each container in its private guest physical memory space would not be feasible and would result in a high waste of physical memory.

To solve the problem, the virtualization stack provides support for VA-backed virtual machines. VA-backed VMs use the host's operating system's memory manager to provide to the guest partition's physical memory advanced features like memory deduplication, memory trimming, direct maps, memory cloning and, most important, paging (all these concepts have been extensively covered in Chapter 5 of Part 1). For traditional VMs, guest memory is assigned by the VID driver by statically allocating system physical pages from the host and mapping them in the GPA space of the VM before any virtual processor has the chance to execute, but for VA-backed VMs, a new layer of indirection is added between the GPA space and SPA space. Instead of mapping SPA pages directly into the GPA space, the VID creates a GPA space that is initially blank, creates a user mode minimal process (called VMMEM) for hosting a VA space, and sets up GPA to VA mappings using MicroVM. MicroVM is a new component of the NT kernel tightly integrated with the NT memory manager that is ultimately responsible for managing the GPA to SPA mapping by composing the GPA to VA mapping (maintained by the VID) with the VA to SPA mapping (maintained by the NT memory manager).

The new layer of indirection allows VA-backed VMs to take advantage of most memory management features that are exposed to Windows processes. As discussed in the previous section, the VM Worker process, when it starts the VM, asks the VID driver to create the partition's memory block. In case the VM is VA-backed, it creates the Memory Block Range GPA mapping bitmap, which is used to keep track of the allocated virtual pages backing the new VM's RAM. It then creates the partition's RAM memory, backed by a big range of VA space. The VA space is usually as big as the allocated amount of VM's RAM memory (note that this is not a necessary condition: different VA-ranges can be mapped as different GPA ranges) and is reserved in the context of the VMMEM process using the native NTAllocateVirtualMemory API.

If the "deferred commit" optimization is not enabled (see the next section for more details), the VID driver performs another call to the NtAllocateVirtualMemory API with the goal of committing the entire VA range. As discussed in Chapter 5 of Part 1, committing memory charges the system commit limit but still doesn't allocate any physical page (all the PTE entries describing the entire range are invalid demand-zero PTEs). The VID driver at this stage uses Winhvr to ask the hypervisor to map the entire partition's GPA space to a special invalid SPA (by using the same HVMapGpaPages hypercall used for standard partitions). When the guest partition accesses guest physical memory that is mapped in the

---

SLAT table by the special invalid SPA, it causes a VMEXIT to the hypervisor, which recognizes the special value and injects a memory intercept to the root partition.

The VID driver finally notifies MicroVM of the new VA-backed GPA range by invoking the VmCreate

MemoryRange routine (MicroVM services are exposed by the NT kernel to the VID driver through a

Kernel Extension). MicroVM allocates and initializes a VM_PROCESS_CONTEXT data structure, which

contains two important RB trees: one describing the allocated GPA ranges in the VM and one describ ing the corresponding system virtual address (SVA) ranges in the root partition. A pointer to the allocated data structure is then stored in the EPROCESS of the VMMEM instance.

When the VM Worker process wants to write into the memory of the VA-backed VM, or when a memory intercept is generated due to an invalid GPA to SPA translation, the VID driver calls into the MicroVM page fault handler (VmAccessFault). The handler performs two important operations: first, it resolves the fault by inserting a valid PTE in the page table describing the faulting virtual page (more details in Chapter 5 of Part 1) and then updates the SLAT table of the child VM (by calling the WinHvr driver, which emits another HvMapGpaPages hypercall). Afterward, the VM's guest physical pages can be paged out simply because private process memory is normally pageable. This has the important implication that it requires the majority of the MicroVM's function to operate at passive IRQL.

Multiple services of the NT memory manager can be used for VA-backed VMs. In particular, clone

templates allow the memory of two different VA-backed VMs to be quickly cloned; direct map allows

shared executable images or data files to have their section objects mapped into the VMMEM process

and into a GPA range pointing to that VA region. The underlying physical pages can be shared between

different VMs and host processes, leading to improved memory density.

## VA-backed VMs optimizations

As introduced in the previous section, the cost of a guest access to dynamically backed memory that

isn't currently backed, or does not grant the required permissions, can be quite expensive: when a

guest access attempt is made to inaccessible memory, a VMEXIT occurs, which requires the hypervisor

to suspend the guest VP, schedule the root partition's VP, and inject a memory intercept message to

it. The VID's intercept callback handler is invoked at high IRQL, but processing the request and call ing into MicroVM requires running at PASSIVE_LEVEL. Thus, a DPC is queued. The DPC routine sets an

event that wakes up the appropriate thread in charge of processing the interrupt. After the MicroVM

page fault handler has resolved the fault and called the hypervisor to update the SLAT entry (through

another hypercall, which produces another VMEXIT), it resumes the guest's VP.

Large numbers of memory intercepts generated at runtime result in big performance penalties.


With the goal to avoid this, multiple optimizations have been implemented in the form of guest


enlightenments (or simple configurations):

- ■ Memory zeroing enlightments

■ Memory access hints

■ Enlightened page fault

■ Deferred commit and other optimizations
CHAPTER 9 Virtualization technologies      337


---

## Memory-zeroing enlightenments

To avoid information disclosure to a VM of memory artifacts previously in use by the root partition or another VM, memory-backing guest RAM is zeroed before being mapped for access by the guest. Typically, an operating system zeroes all physical memory during boot because on a physical system the contents are nondeterministic. For a VM, this means that memory may be zeroed twice: once by the virtualization host and again by the guest operating system. For physically backed VMs, this is at best a waste of CPU cycles. For VA-backed VMs, the zeroing by the guest OS generates costly memory intercepts. To avoid the wasted intercepts, the hypervisor exposes the memory-zeroing enlightenments.

When the Windows Loader loads the main operating system, it uses services provided by the UEFI firmware to get the machine's physical memory map. When the hypervisor starts a VA-backed VM, it exposes the HvGetBootZeroedMemory hypercall, which the Windows Loader can use to query the list of physical memory ranges that are actually already zeroed. Before transferring the execution to the NT kernel, the Windows Loader merges the obtained zeroed ranges with the list of physical memory descriptors obtained through EFI services and stored in the Loader block (further details on startup mechanisms are available in Chapter 12). The NT kernel inserts the merged descriptor directly in the zeroed pages list by skipping the initial memory zereing.

In a similar way, the hypervisor supports the hot-add memory zeroing enlightenment with a simple implementation: When the dynamic memory VSC driver (dmvc.sys) initiates the request to add physical memory to the NT kernel, it specifies the MM_ADD_PHYSICAL_MEMORY_ALREADY_ZEROED flag, which hints the Memory Manager (MM) to add the new pages directly to the zeroed pages list.

## Memory access hints

For physically backed VMs, the root partition has very limited information about how guest VM intends to use its physical pages. For these VMs, the information is mostly irrelevant because almost all memory and GPA mappings are created when the VM is started, and they remain statically mapped. For VA-backed VMs, this information can instead be very useful because the host memory manager manages the working set of the minimal process that contains the VM's memory (VMMEM).

The hot hint allows the guest to indicate that a set of physical pages should be mapped into the

guest because they will be accessed soon or frequently. This implies that the pages are added to the

working set of the minimal process. The VID handles the hint by telling MicroVM to fault in the physical

pages immediately and not to remove them from the VMMEM process's working set.

In a similar way, the cold hint allows the guest to indicate that a set of physical pages should be un mapped from the guest because it will not be used soon. The VID driver handles the hint by forwarding

it to MicroVM, which immediately removes the pages from the working set. T ypically, the guest uses

the cold hint for pages that have been zeroed by the background zero page thread (see Chapter 5 of

Part 1 for more details).

The VA-backed guest partition specifies a memory hint for a page by using the HvMemoryHeatHint

hypercall.

---

## Enlightened page fault (EPF)

Enlightened page fault (EPF) handling is a feature that allows the VA-backed guest partition to reschedule threads on a VP that caused a memory interrupt for a VA-backed GPA page. Normally, a memory interrupt for such a page is handled by synchronously resolving the access fault in the root partition and resuming the VP upon access fault completion. When EPF is enabled and a memory interrupt occurs for a VA-backed GPA page, the VID driver in the root partition creates a background worker thread that calls the MicroVM page fault handler and delivers a synchronous exception (not to be confused by an asynchronous interrupt) to the guest's VP, with the goal to let it know that the current thread caused a memory interrupt.

The guest reschedules the thread; meanwhile, the host is handling the access fault. Once the access fault has been completed, the VID driver will add the original faulting GPA to a completion queue and deliver an asynchronous interrupt to the guest. The interrupt causes the guest to check the completion queue and unblock any threads that were waiting on EPU completion.

## Deferred commit and other optimizations

Deferred commit is an optimization that, if enabled, forces the VID driver not to commit each backing page until first access. This potentially allows more VMs to run simultaneously without increasing the size of the page file, but, since the backing VA space is only reserved, and not committed, the VMs may crash at runtime due to the commitment limit being reached in the root partition. In this case, there is no more free memory available.

Other optimizations are available to set the size of the pages which will be allocated by the MicroVM

page fault handler (small versus large) and to pin the backing pages upon first access. This prevents

aging and trimming, generally resulting in more consistent performance, but consumes more memory

and reduces the memory density.

## The VMMEM process

The VMMEM process exists mainly for two main reasons:

- ■ Hosts the VP-dispatch thread loop when the root scheduler is enabled, which represents the
guest VP schedulable unit

■ Hosts the VA space for the VA-backed VMs
The VMMEM process is created by the VID driver while creating the VM's partition. As for regular partitions (see the previous section for details), the VM Worker process initializes the VM setup through the VID.dll library, which calls into the VID through an IOCTL. If the VID driver detects that the new partition is VA-backed, it calls into the MicroVM (through the VsmNTsllatMemoryProcessCreate function) to create the minimal process. MicroVM uses the PscCreateMinimalProcess function, which allocates the process, creates its address space, and inserts the process into the process list. It then reserves the bottom 4 GB of address space to ensure that no direct-mapped images end up there (this can reduce the entropy and security for the guest). The VID driver applies a specific security descriptor to the new VMMEM process; only the SYSTEM and the VM Worker process can access it. (The VM Worker process is launched with a specific token; the token's owner is set to a SID generated from the VM's unique

CHAPTER 9 Virtualization technologies      339


---

GUID.) This is important because the virtual address space of the VMMEM process could have been accessible to anyone otherwise. By reading the process virtual memory, a malicious user could read the VM private guest physical memory.

