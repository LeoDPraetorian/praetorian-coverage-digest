## Virtualization-based security (VBS)

As discussed in the previous section, Hyper-V provides the services needed for managing and running virtual machines on Windows systems. The hypervisor guarantees the necessary isolation between each partition. In this way, a virtual machine can't interfere with the execution of another one. In this section, we describe another important component of the Windows virtualization infrastructure: the Secure Kernel, which provides the basic services for the virtualization-based security.

First, we list the services provided by the Secure Kernel and its requirements, and then we describe

its architecture and basic components. Furthermore, we present some of its basic internal data struc tures. Then we discuss the Secure Kernel and Virtual Secure Mode startup method, describing its high

dependency on the hypervisor. We conclude by analyzing the components that are built on the top

of Secure Kernel, like the Isolated User Mode, Hypervisor Enforced Code Integrity, the secure software

enclaves, secure devices, and Windows kernel hot-patching and microcode services.

### Virtual trust levels (VTLs) and Virtual Secure Mode (VSM)

As discussed in the previous section, the hypervisor uses the SLAT to maintain each partition in its

own memory space. The operating system that runs in a partition accesses memory using the stan dard way (guest virtual addresses are translated in guest physical addresses by using page tables).

Under the cover, the hardware translates all the partition GPs to real SPAs and then performs the

actual memory access. This last translation layer is maintained by the hypervisor, which uses a sepa rate SLAT table per partition. In a similar way, the hypervisor can use SLAT to create different security

domains in a single partition. Thanks to this feature, Microsoft designed the Secure Kernel, which is

the base of the Virtual Secure Mode.

Traditionally, the operating system has had a single physical address space, and the software running at ring 0 (that is, kernel mode) could have access to any physical memory address. Thus, if any software running in supervisor mode (kernel, drivers, and so on) becomes compromised, the entire system becomes compromised too. Virtual secure mode leverages the hypervisor to provide new trust boundaries for systems software. With VSM, security boundaries (described by the hypervisor using SLAT) can be put in place that limit the resources supervisor mode code can access. Thus, with VSM, even if supervisor mode code is compromised, the entire system is not compromised.

VSM provides these boundaries through the concept of virtual trust levels (VTLs). At its core, a VTL is a set of access protections on physical memory. Each VTL can have a different set of access protections. In this way, VTLs can be used to provide memory isolation. A VTLs memory access protections can be

---

configured to limit what physical memory a VTL can access. With VSM, a virtual processor is always running at a particular VTL and can access only physical memory that is marked as accessible through the hypervisor SLAT. For example, if a processor is running at VTL 0, it can only access memory as controlled by the memory access protections associated with VTL 0. This memory access enforcement happens at the guest physical memory translation level and thus cannot be changed by supervisor mode code in the partition.

VTLs are organized as a hierarchy. Higher levels are more privileged than lower levels, and higher levels can adjust the memory access protections for lower levels. Thus, software running at VTL 1 can adjust the memory access protections of VTL 0 to limit what memory VTL 0 can access. This allows software at VTL 1 to hide (isolate) memory from VTL 0. This is an important concept that is the basis of the VSM. Currently the hypervisor supports only two VTLs: VTL 0 represents the Normal OS execution environment, which the user interacts with; VTL 1 represents the Secure Mode, where the Secure Kernel and Isolated User Mode (IUM) runs. Because VTL 0 is the environment in which the standard operating system and applications run, it is often referred to as the normal mode.

![Figure](figures/Winternals7thPt2_page_372_figure_002.png)

Note The VSM architecture was initially designed to support a maximum of 16 VTs. At the time of this writing, only 2 VTs are supported by the hypervisor. In the future, it could be possible that Microsoft will add one or more new VTs. For example, latest versions of Windows Server running in Azure also support Confidential VMs, which run their Host Compatibility Layer (HCL) in VTL2.

Each VTL has the following characteristics associated with it:

- ■ Memory access protection As already discussed, each virtual trust level has a set of guest
physical memory access protections, which defines how the software can access memory.
■ Virtual processor state A virtual processor in the hypervisor share some registers with each
VTL, whereas some other registers are private per each VTL. The private virtual processor state
for a VTL cannot be accessed by software running at a lower VTL. This allows for isolation of the
processor state between VTLS.
■ Interrupt subsystem Each VTL has a unique interrupt subsystem (managed by the hypervi-
sor synthetic interrupt controller). A VTL's interrupt subsystem cannot be accessed by software
running at a lower VTL. This allows for interrupts to be managed securely at a particular VTL
without risk of a lower VTL generating unexpected interrupts or masking interrupts.
Figure 9-30 shows a scheme of the memory protection provided by the hypervisor to the Virtual Secure Mode. The hypervisor represents each VTL of the virtual processor through a different VMCS data structure (see the previous section for more details), which includes a specific SLAT table. In this way, software that runs in a particular VTL can access just the physical memory pages assigned to its level. The important concept is that the SLAT protection is applied to the physical pages and not to the virtual pages, which are protected by the standard page tables.

CHAPTER 9 Virtualization technologies      341


---

![Figure](figures/Winternals7thPt2_page_373_figure_000.png)

FIGURE 9-30 Scheme of the memory protection architecture provided by the hypervisor to VSM.

## Services provided by the VSM and requirements

Virtual Secure Mode, which is built on the top of the hypervisor, provides the following services to the

Windows ecosystem:

- ■ Isolation IUM provides a hardware-based isolated environment for each software that runs
in VTL 1. Secure devices managed by the Secure Kernel are isolated from the rest of the system
and run in VTL 1 user mode. Software that runs in VTL 1 usually stores secrets that can't be inter-
cepted or revealed in VTL 0. This service is used heavily by Credential Guard. Credential Guard
is the feature that stores all the system credentials in the memory address space of the Lsalo
trustlet, which runs in VTL 1 user mode.
■ Control over VTL 0 The Hypervisor Enforced Code Integrity (HNCI) checks the integrity and
the signing of each module that the normal OS loads and runs. The integrity check is done
entirely in VTL 1 (which has access to all the VTL 0 physical memory). No VTL 0 software can in-
terfere with the signing check. Furthermore, HNCI guarantees that all the normal mode memory
pages that contain executable code are marked as not writable (this feature is called W^X. Both
HNCI and W^X have been discussed in Chapter 7 of Part 1).
---

- ■ Secure intercepts VSM provides a mechanism to allow a higher VTL to lock down critical sys-
tem resources and prevent access to them by lower VTUs. Secure intercepts are used extensively
by HyperGuard, which provides another protection layer for the VTL 0 kernel by stopping mali-
cious modifications of critical components of the operating systems.
■ VBS-based enclaves A security enclave is an isolated region of memory within the address
space of a user mode process. The enclave memory region is not accessible even to higher
privilege levels. The original implementation of this technology was using hardware facilities
to properly encrypt memory belonging to a process. A VBS-based enclave is a secure enclave
whose isolation guarantees are provided using VSM.
■ Kernel Control Flow Guard VSM, when HVCI is enabled, provides Control Flow Guard
(CFG) to each kernel module loaded in the normal world (and to the NT kernel itself). Kernel
mode software running in normal world has read-only access to the bitmap, so an exploit
can't potentially modify it. Thanks to this reason, kernel CFG in Windows is also known as
Secure Kernel CFG (SKCFG).
![Figure](figures/Winternals7thPt2_page_374_figure_001.png)

Note CFG is the Microsoft implementation of Control Flow Integrity, a technique that prevents a wide variety of malicious attacks from redirecting the flow of the execution of a program. Both user mode and Kernel mode CFG have been discussed extensively in Chapter 7 of Part 1.

- ■ Secure devices Secure devices are a new kind of devices that are mapped and managed en-
tirely by the Secure Kernel in VTL 1. Drivers for these kinds of devices work entirely in VTL 1 user
mode and use services provided by the Secure Kernel to map the device I/O space.
To be properly enabled and work correctly, the VSM has some hardware requirements. The host system must support virtualization extensions (Intel VT-x, AMD, SMM, or ARM TrustZone) and the SLAT. VSM won't work if one of the previous hardware features is not present in the system processor. Some other hardware features are not strictly necessary, but in case they are not present, some security premises of VSM may not be guaranteed:

- ■ An IOMMU is needed to protect against physical device DMA attacks. If the system processors

don't have an IOMMU, VSM can still work but is vulnerable to these physical device attacks.

■ A UEFI BIOS with Secure Boot enabled is needed for protecting the boot chain that leads to

the startup of the hypervisor and the Secure Kernel. If Secure Boot is not enabled, the system is

vulnerable to boot attacks, which can modify the integrity of the hypervisor and Secure Kernel

before they have the chances to get executed.
Some other components are optional, but when they're present they increase the overall security and responsiveness of the system. The TPM presence is a good example. It is used by the Secure Kernel to store the Master Encryption key and to perform Secure Launch (also known as DRTM; see Chapter 12 for more details). Another hardware component that can improve VSM responsiveness is the processor's Mode-Based Execute Control (MBEC) hardware support: MBEC is used when HVCI is enabled to protect the execution state of user mode pages in kernel mode. With Hardware MBEC, the hypervisor

CHAPTER 9 Virtualization technologies      343


---

can set the executable state of a physical memory page based on the CPL (kernel or user) domain of the specific VTL. In this way, memory that belongs to user mode application can be physically marked executable only by user mode code (kernel exploits can no longer execute their own code located in the memory of a user mode application). In case hardware MBEC is not present, the hypervisor needs to emulate it, by using two different SLAT tables for VTL 0 and switching them when the code execution changes the CPL security domain (going from user mode to kernel mode and vice versa produces a VMEXIT in this case). More details on HVCI have been already discussed in Chapter 7 of Part 1.

## EXPERIMENT: Detecting VBS and its provided services

In Chapter 12, we discuss the VSM startup policy and provide the instructions to manually enable or disable Virtualization-Based Security. In this experiment, we determine the state of the different features provided by the hypervisor and the Secure Kernel. VBS is a technology that is not directly visible to the user. The System Information tool distributed with the base Windows installation is able to show the details about the Secure Kernel and its related technologies. You can start it by typing minfo32 in the Cortana search box. Be sure to run it as Administrator; certain details require a full-privileged user account.

In the following figure, VBS is enabled and includes HVCI (specified as Hypervisor Enforced Code Integrity), UEFI runtime virtualization (specified as UEFI ReadyOn), MBEC (specified as Mode Based Execution Control). However, the system described in the example does not include an enabled Secure Boot and does not have a working IOMMU (specified as DMA Protection in the Virtualization-Based Security Available Security Properties line).

![Figure](figures/Winternals7thPt2_page_375_figure_004.png)

More details about how to enable, disable, and lock the VBS configuration are available in the "Understanding the VSM policy" experiment of Chapter 12.

---

## The Secure Kernel

The Secure Kernel is implemented mainly in the securekernel.exe file and is launched by the Windows

Loader after the hypervisor has already been successfully started. As shown in Figure 9-31, the Secure

Kernel is a minimal OS that works strictly with the normal kernel, which resides in VTL 0. As for any

normal OS, the Secure Kernel runs in CPL 0 (also known as ring 0 or kernel mode) of VTL 1 and provides

services (the majority of them through system calls) to the Isolated User Mode (IUM), which lives

in CPL 3 (also known as ring 3 or user mode) of VTL 1. The Secure Kernel has been designed to be

as small as possible with the goal to reduce the external attack surface. It's not extensible with exter nal device drivers like the normal kernel. The only kernel modules that extend their functionality are

loaded by the Windows Loader before VSM is launched and are imported from securekernel.exe:

- ■ Skci.dll Implements the Hypervisor Enforced Code Integrity part of the Secure Kernel

■ Cng.sys Provides the cryptographic engine to the Secure Kernel

■ Vmsvcext.dll Provides support for the attestation of the Secure Kernel components in

Intel TXT (Trusted Boot) environments (more information about Trusted Boot is available

in Chapter 12)
While the Secure Kernel is not extensible, the Isolated User Mode includes specialized processes

called Trustlets. Trustlets are isolated among each other and have specialized digital signature require ments. They can communicate with the Secure Kernel through syscalls and with the normal world

through Mailslots and ALPC. Isolated User Mode is discussed later in this chapter.

![Figure](figures/Winternals7thPt2_page_376_figure_004.png)

FIGURE 9-31 Virtual Secure Mode Architecture scheme, built on top of the hypervisor.

## Virtual interrupts

When the hypervisor configures the underlying virtual partitions, it requires that the physical processors produce a VMEXIT every time an external interrupt is raised by the CPU physical APIC (Advanced Programmable Interrupt Controller). The hardware's virtual machine extensions allow the hypervisor to inject virtual interrupts to the guest partitions (more details are in the Intel, AMD, and ARM user

CHAPTER 9 Virtualization technologies      345


---

manuals). Thanks to these two facts, the hypervisor implements the concept of a Synthetic Interrupt Controller (SynIC). A SynIC can manage two kind of interrupts. Virtual interrupts are interrupts delivered to a guest partition's virtual APIC. A virtual interrupt can represent and be associated with a physical hardware interrupt, which is generated by the real hardware. Otherwise, a virtual interrupt can represent a synthetic interrupt, which is generated by the hypervisor itself in response to certain kinds of events. The SynIC Can map physical interrupts to virtual ones. A VTL has a SynIC associated with each virtual processor in which the VTL runs. At the time of this writing, the hypervisor has been designed to support 16 different synthetic interrupt vectors (only 2 are actually in use, though).

When the system starts (phase 1 of the NT kernel's initialization) the ACPI driver maps each interrupt to the correct vector using services provided by the HAL. The NT HAL is enlightened and knows whether it's running under VSM. In that case, it calls into the hypervisor for mapping each physical interrupt to its own VTL. Even the Secure Kernel could do the same. At the time of this writing, though, no physical interrupts are associated with the Secure Kernel (this can change in the future; the hypervisor already supports this feature). The Secure Kernel instead asks the hypervisor to receive only the following virtual interrupts: Secure Timers, Virtual Interrupt Notification Assist (VINA), and Secure Intervals.

![Figure](figures/Winternals7thPt2_page_377_figure_002.png)

Note It's important to understand that the hypervisor requires the underlying hardware to produce a VMEXIT while managing interrupts that are only of external types. Exceptions are still managed in the same VTL the processor is executing at (no VMEXIT is generated). If an instruction causes an exception, the latter is still managed by the structured exception handling (SEH) code located in the current VTL.

To understand the three kinds of virtual interrupts, we must first introduce how interrupts are managed by the hypervisor.

In the hypervisor, each VTL has been designed to securely receive interrupts from devices associated with its own VTL, to have a secure timer facility which can't be interfered with by less secure VTUs, and to be able to prevent interrupts directed to lower VTUs while executing code at a higher VTL. Furthermore, a VTL should be able to send IPI interrupts to other processors. This design produces the following scenarios:

- When running at a particular VTL, reception of interrupts targeted at the current VTL results in
standard interrupt handling (as determined by the virtual APIC controller of the VP).

When an interrupt is received that is targeted at a higher VTL receipt of the interrupt results in
a switch to the higher VTL to which the interrupt is targeted if the IRQL value for the higher VTL
would allow the interrupt to be presented. If the IRQL value of the higher VTL does not allow
the interrupt to be delivered, the interrupt is queued without switching the current VTL. This
behavior allows a higher VTL to selectively mask interrupts when returning to a lower VTL. This
could be useful if the higher VTL is running an interrupt service routine and needs to return to a
lower VTL for assistance in processing the interrupt.

When an interrupt is received that is targeted at a lower VTL than the current executing VTL
of a virtual processor, the interrupt is queued for future delivery to the lower VTL. An interrupt
targeted at a lower VTL will never preempt execution of the current VTL. Instead, the interrupt is
presented when the virtual processor next transitions to the targeted VTL.

CHAPTER 9 Virtualization technologies

---

Preventing interrupts directed to lower VTUs is not always a great solution. In many cases, it could lead to the slowing down of the normal OS execution (especially in mission-critical or game environments). To better manage these conditions, the VINA has been introduced. As part of its normal event dispatch loop, the hypervisor checks whether there are pending interrupts queued to a lower VTL. If so, the hypervisor injects a VINA interrupt to the current executing VTL. The Secure Kernel has a handler registered for the VINA vector in its virtual IDT. The handler (ShvVinaHandler function) executes a normal call (NORMALKERNEL_VINA) to VTL 0. (Normal and Secure Calls are discussed later in this chapter.) This call forces the hypervisor to switch to the normal kernel (VTL 0). As long as the VTL is switched, all the queued interrupts will be correctly dispatched. The normal kernel will reenter VTL 1 by emitting a SECUREKERNEL resumedTHREAD Secure Call.

## Secure IRQLs

The VINA handler will not always be executed in VTL. Similar to the NT kernel, this depends on the

actual IRQL the code is executing into. The current executing code's IRQL masks all the interrupts that are

associated with an IRQL that's less than or equal to it. The mapping between an interrupt vector and the

IRQL is maintained by the Task Priority Register (TPR) of the virtual APIC, like in case of real physical APICs

(consult the Intel Architecture Manual for more information). As shown in Figure 9-32, the Secure Kernel

supports different levels of IRQL compared to the normal kernel. Those IRQL are called Secure IRQL.

![Figure](figures/Winternals7thPt2_page_378_figure_003.png)

FIGURE 9-32 Secure Kernel interrupts request levels (IRQL).

The first three secure IRQL are managed by the Secure Kernel in a way similar to the normal world. Normal APCS and DPCs (targeting VTL 0) still can't preempt code executing in VTL 1 through the hypervisor, but the VINA interrupt is still delivered to the Secure Kernel (the operating system manages the three software interrupts by writing in the target processor's APIC Task-Priority Register, an operation that causes a VMEEXIT to the hypervisor. For more information about the APIC TPR, see the Intel, AMD, or ARM manuals). This means that if a normal-mode DPC is targeted at a processor while it is executing VTL 1 code (at a compatible secure IRQL, which should be less than Dispatch), the VINA interrupt will be delivered and will switch the execution context to VTL 0. As a matter of fact, this executes the DPC in the normal world and raises for a while the normal kernel's IRQL to dispatch level. When the DPC queue is drained, the normal kernel's IRQL drops. Execution flow returns to the Secure Kernel thanks to

CHAPTER 9 Virtualization technologies      347


---

the VSM communication loop code that is located in the VsEnteriumSecureMode routine. The loop processes each normal call originated from the Secure Kernel.

The Secure Kernel maps the first three secure IRQs to the same IRQL of the normal world. When a Secure call is made from code executing at a particular IRQL (still less or equal to dispatch) in the normal world, the Secure Kernel switches its own secure IRQL to the same level. Vice versa, when the Secure Kernel executes a normal call to enter the NT kernel, it switches the normal kernel's IRQL to the same level as its own. This works only for the first three levels.

The normal raised level is used when the NT kernel enters the secure world at an IRQL higher than the DPC level. In those cases, the Secure Kernel maps all of the normal-world IRQLs, which are above DPC, to its normal raised secure level. Secure Kernel code executing at this level can't receive any VINA for any kind of software IRQLs in the normal kernel (but it can still receive a VINA for hardware interrupts). Every time the NT kernel enters the secure world at a normal IRQL above DPC, the Secure Kernel raises its secure IRQL to normal raised.

Secure IRQs equal to or higher than VINA can never be preempted by any code in the normal world. This explains why the Secure Kernel supports the concept of secure, nonpreemptable timers and Secure Intermpts. Secure timers are generated from the hypervisor's clock interrupt service routine (ISR). This ISR, before injecting a synthetic clock interrupt to the NT kernel, checks whether there are one or more secure timers that are expired. If so, it injects a synthetic secure timer interrupt to VT1. Then it proceeds to forward the clock tick interrupt to the normal VTL.

## Secure intercepts

There are cases where the Secure Kernel may need to prevent the NT kernel, which executes at a lower VTL from accessing certain critical system resources. For example, writes to some processor's MSRs could potentially be used to mount an attack that would disable the hypervisor or subvert some of its protections. VSM provides a mechanism to allow a higher VTL to lock down critical system resources and prevent access to them by lower VTUs. The mechanism is called secure intercepts.

Secure intercepts are implemented in the Secure Kernel by registering a synthetic interrupt, which

is provided by the hypervisor (remapped in the Secure Kernel to vector 0xF0). The hypervisor, when

certain events cause a VMEXIT, injects a synthetic interrupt to the higher VTL on the virtual processor

that triggered the interrupt. At the time of this writing, the Secure Kernel registers with the hypervisor

for the following types of intercepted events:

- Write to some vital processor's MSRs (Star, Lstar, Cstar, Efer, Syesenter, Ia32Misc, and APIC base
on AMD64 architectures) and special registers (GDT, IDT, LDT)

■ Write to certain control registers (CR0, CR4, and XCR0)

■ Write to some I/O ports (ports 0xCF8 and 0xCFC are good examples; the intercept manages the
reconfiguration of PCI devices)

■ Invalid access to protected guest physical memory
---

When VTL 0 software causes an intercept that will be raised in VTL 1, the Secure Kernel needs to recognize the intercept type from its interrupt service routine. For this purpose, the Secure Kernel uses the message queue allocated by the SynIC for the "Intercept" synthetic interrupt source (see the "Interpartition communication" section previously in this section for more details about the SynIC and SINT). The Secure Kernel is able to discover and map the physical memory page by checking the SIMP synthetic MSR, which is virtualized by the hypervisor. The mapping of the physical page is executed at the Secure Kernel initialization time in VTL 1. The Secure Kernel's startup is described later in this chapter.

Intercepts are used extensively by HyperGuard with the goal to protect sensitive parts of the normal NT kernel. If a malicious rootkit installed in the NT kernel tries to modify the system by writing a particular value to a protected register (for example to the syscall handlers, CSTAR and LSTAR, or modelspecific registers), the Secure Kernel intercept handler (ShvlInterceptHandler) filters the new register's value, and, if it discovers that the value is not acceptable, it injects a General Protection Fault (GPF) nomaskable exception to the NT kernel in VLT 0. This causes an immediate bufcheck resulting in the system being stopped. If the value is acceptable, the Secure Kernel writes the new value of the register using the hypervisor through the HvSetVpRegisters hypercall (in this case, the Secure Kernel is proxying the access to the register).

## Control over hypercalls

The last intercept type that the Secure Kernel registers with the hypervisor is the hypercell intercept. The hypercell intercept's handler checks that the hypercell emitted by the VTL 0 code to the hypervisor is legit and is originated from the operating system itself, and not through some external modules. Every time in any VTL a hypercell is emitted, it causes a VMEXIT in the hypervisor (by design). Hypercells are the base service used by kernel components of each VTL to request services between each other (and to the hypervisor itself). The hypervisor injects a synthetic intercept interrupt to the higher VTL only for hypercells used to request services directly to the hypervisor, skipping all the hypercells used for secure and normal calls to and from the Secure Kernel.

If the hypercall is not recognized as valid, it won't be executed: the Secure Kernel in this case

updates the lower VTL's registers with the goal to signal the hypercall error. The system is not crashed

(although this behavior can change in the future); the calling code can decide how to manage the error.

## VSM system calls

As we have introduced in the previous sections, VSM uses hypercalls to request services to and from the Secure Kernel. Hypercalls were originally designed as a way to request services to the hypervisor, but in VSM the model has been extended to support new types of system calls:

- • Secure calls are emitted by the normal NT kernel in VTL 0 to require services to the Secure Kernel.

• Normal calls are requested by the Secure Kernel in VTL 1 when it needs services provided by

the NT kernel, which runs in VTL 0. Furthermore, some of them are used by secure processes

(trustlets) running in Isolated User Mode (IUM) to request services from the Secure Kernel or

the normal NT kernel.
CHAPTER 9 Virtualization technologies      349


---

These kinds of system calls are implemented in the hypervisor, the Secure Kernel, and the normal NT kernel. The hypervisor defines two hypercalls for switching between different VTUs: HvViTCall and HvViTReturn. The Secure Kernel and NT kernel define the dispatch loop used for dispatching Secure and Normal Calls.

Furthermore, the Secure Kernel implements another type of system call: secure system calls. They

provide services only to secure processes (trustlets), which run in IUM. These system calls are not exposed

to the normal NT kernel. The hypervisor is not involved at all while processing secure system calls.

## Virtual processor state

Before delving into the Secure and Normal calls architecture, it is necessary to analyze how the virtual processor manages the VTL transition. Secure VTUs always operate in long mode (which is the execution model of AMD64 processors where the CPU accesses 64-bit-only instructions and registers), with paging enabled. Any other execution model is not supported. This simplifies launch and management of secure VTUs and also provides an extra level of protection for code running in secure mode. (Some other important implications are discussed later in the chapter.)

For efficiency, a virtual processor has some registers that are shared between VTUs and some other registers that are private to each VTL. The state of the shared registers does not change when switching between VTUs. This allows a quick passing of a small amount of information between VTUs, and it also reduces the context switch overhead when switching between VTUs. Each VTL has its own instance of private registers, which could only be accessed by that VTL. The hypervisor handles saving and restoring the contents of private registers when switching between VTUs. Thus, when entering a VTL on a virtual processor, the state of the private registers contains the same values as when the virtual processor last ran that VTL.

Most of a virtual processor's register state is shared between VTLs. Specifically, general purpose registers, vector registers, and floating-point registers are shared between all VTLs with a few exceptions, such as the RIP and the RSP registers. Private registers include some control registers, some architectural registers, and hypervisor virtual MSRs. The secure intercept mechanism (see the previous section for details) is used to allow the Secure environment to control which MSR can be accessed by the normal mode environment. Table 9-3 summarizes which registers are shared between VTLs and which are private to each VTL.

---

TABLE 9-3 Virtual processor per-VTL register states

<table><tr><td>Type</td><td>General Registers</td><td>MSRs</td></tr><tr><td rowspan="14">Shared</td><td>Rax, Rbx, Rcx, Rdx, Rxi, Rdi, Rbp</td><td>HV_X64_MSR_TSC_FREQUENCY</td></tr><tr><td>CR2</td><td>HV_X64_MSR_VF_INDEX</td></tr><tr><td>CR3 - R15</td><td>HV_X64_MSR_VF_RUNTIME</td></tr><tr><td>DR0 - DR5</td><td>HV_X64_MSR_RESET</td></tr><tr><td>X87 floating point state</td><td>HV_X64_MSR_TIME_REF_COUNT</td></tr><tr><td>XMM registers</td><td>HV_X64_MSR_GUEST_IDLE</td></tr><tr><td>AVX registers</td><td>HV_X64_MSR_DEBUG_DEVICE_OPTIONS</td></tr><tr><td>XCRO (XFEM)</td><td>HV_X64_MSR_MORE_LOW_IMB_PAGE</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_STATS_PARTITION_RETAIL_PAGE</td></tr><tr><td>MTRG</td><td>MTRG_CAP</td></tr><tr><td>MCG_CAP</td><td>MCG_STATUS</td></tr><tr><td>RIP, RSP</td><td>SYSENTER_CS_SYSENGER_ESR_SYSENGER_EIP_STAR_LSTAR_CSTAR,</td></tr><tr><td>RFLAGS</td><td>SFMASK_EFER_KERNEL_GSBASE_FS_BASE.GS_BASE</td></tr><tr><td>CR0, CR3, CR4</td><td>HV_X64_MSR_hyperCALL</td></tr><tr><td>DR7</td><td>HV_X64_MSR_GUEST_OS_ID</td></tr><tr><td>IDTR, GDTR</td><td>HV_X64_MSR_REFERENCE_TSC</td></tr><tr><td>CS, DS, ES, FS, GS, SS, TR, LDTR</td><td>HV_X64_MSR_APIC_FREQUENCY</td></tr><tr><td>TSC</td><td>HV_X64_MSR_EOI</td></tr><tr><td rowspan="11">Private</td><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_ICR</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_ICR</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_APICassist_PAGE</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_NPIER_CONFIG</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_SIRBP</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_SCONTROL</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_SVERSION</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_SIMP</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_EOM</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_SINTO - HV_X64_MSR_SINT15</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_STIMER0_CONFIG - HV_X64_MSR_STIMER3_CONFIG</td></tr><tr><td>DR6 (processor-dependent)</td><td>HV_X64_MSR_STIMER0_COUNT - HV_X64_MSR_STIMER3_COUNT</td></tr><tr><td colspan="2">Local APIC registers (including CRB/TPR)</td><td></td></tr></table>


## Secure calls

When the NT kernel needs services provided by the Secure Kernel, it uses a special function,

VspEnteriumSecureMode. The routine accepts a 104-byte data structure (called SKCALL), which is used

to describe the kind of operation (invoke service, flush TB, resume thread, or call enclave), the secure

call number, and a maximum of twelve 8-byte parameters. The function raises the processor's IRQL,

if necessary, and determines the value of the Secure Thread cookie. This value communicates to the

Secure Kernel which secure thread will process the request. It then (re)starts the secure calls dispatch

loop. The executability state of each VTL is a state machine that depends on the other VTL.

The loop described by the Vp6EntryIumSecureMode function manages all the operations shown on the left side of Figure 9-33 in VTLO (except the case of Secure Interrupts). The NT kernel can decide to enter the Secure Kernel, and the Secure Kernel can decide to enter the normal NT kernel. The loop starts by entering the Secure Kernel through the HviSwitchToXmVIrt routine (specifying the operation requested by the caller). The latter function, which returns only if the Secure Kernel requests a VTL switch, saves all the shared registers and copies the entire SICALL data structure in some well-defined CPU registers: RBX and the SSE registers XMM10 through XMM15. Finally, it emits an HviVtlCall hypercall to the hypervisor. The hypervisor switches to the target VTL (by loading the saved per-VTL VMCS) and

CHAPTER 9 Virtualization technologies      351


---

writes a VTL secure call entry reason to the VTL control page. Indeed, to be able to determine why a secure VTL was entered, the hypervisor maintains an informational memory page that is shared by each secure VTL. This page is used for bidirectional communication between the hypervisor and the code running in a secure VTL on a virtual processor.

![Figure](figures/Winternals7thPt2_page_383_figure_001.png)

FIGURE 9-33 The VSM dispatch loop.

The virtual processor restarts the execution in VTL 1 context, in the SkCallNormalMode function of the Secure Kernel. The code reads the VTL entry reason; if it's not a Secure Interrupt, it loads the current processor SKPRCB (Secure Kernel processor control block), selects a thread on which to run (starting from the secure thread cookie), and copies the content of the SKCALL data structure from the CPU shared registers to a memory buffer. Finally, it calls the IumInvokeSecureService dispatcher routine, which will process the requested secure call, by dispatching the call to the correct function (and implements part of the dispatch loop in VTL 1).

An important concept to understand is that the Secure Kernel can map and access VTL0 memory, so there's no need to marshal and copy any eventual data structure, pointed by one or more parameters, to the VTL1 memory. This concept won't apply to a normal call, as we will discuss in the next section.

As we have seen in the previous section, Secure Interrupts (and interrupts) are dispatched by the hypervisor, which preempts any code executing in VTL0. In this case, when the VTL1 code starts the execution, it dispatches the interrupt to the right ISR. After the ISR finishes, the Secure Kernel immediately emits a HVTlReturn hypercall. As a result, the code in VTL0 restarts the execution at the point in which it has been previously interrupted, which is not located in the secure calls dispatch loop. Therefore, Secure Interrupts are not part of the dispatch loop even if they still produce a VTL switch.

## Normal calls

Normal calls are managed similarly to the secure calls (with an analogous dispatch loop located in VTL,1 called normal calls loop), but with some important differences:

- ■ All the shared VTL registers are securely cleaned up by the Secure Kernel before emitting the
HvVtlReturn to the hypervisor for switching the VTL. This prevents leaking any kind of secure
data to normal mode.
---

- ■ The normal NT kernel can't read secure VTL1 memory. For correctly passing the syscall param-
eters and data structures needed for the normal call, a memory buffer that both the Secure
Kernel and the normal kernel can share is required. The Secure Kernel allocates this shared
buffer using the ALLOCATE_VM normal call (which does not require passing any pointer as a pa-
rameter). The latter is dispatched to the MmAllocateVirtualMemory function in the NT normal
kernel. The allocated memory is remapped in the Secure Kernel at the same virtual address and
has become part of the Secure process's shared memory pool.
■ As we will discuss later in the chapter, the Isolated User Mode (IUM) was originally designed
to be able to execute special Win32 executables, which should have been capable of running
indifferently in the normal world or in the secure world. The standard unmodified Ntdll.dll and
KernelBase.dll libraries are mapped even in IUM. This fact has the important consequence of
requiring almost all the native NT APIs (which Kernel32.dll and many other user mode libraries
depend on) to be proxied by the Secure Kernel.
To correctly deal with the described problems, the Secure Kernel includes a marshaler, which identifies and correctly copies the data structures pointed by the parameters of an NT API in the shared buffer. The marshaler is also able to determine the size of the shared buffer, which will be allocated from the secure process memory pool. The Secure Kernel defines three types of normal calls:

- ■ A disabled normal call is not implemented in the Secure Kernel and, if called from IUM, it
simply fails with a STATUS_INVALID_SYSTEM_SERVICE exit code. This kind of call can't be called
directly by the Secure Kernel itself.
■ An enabled normal call is implemented only in the NT kernel and is callable from IUM in its
original Nt or Zw version (through Ndtll.dll). Even the Secure Kernel can request an enabled
normal call—but only through a little stub code that loads the normal call number—set the
highest bit in the number, and call the normal call dispatcher (IumGenericSyscall routine). The
highest bit identifies the normal call as required by the Secure Kernel itself and not by the
Ndtll.dll module loaded in IUM.
■ A special normal call is implemented partially or completely in Secure Kernel (VTL 1), which
can filter the original function's results or entirely redesign its code.
Enabled and special normal calls can be marked as KernelOnly. In the latter case, the normal call

can be requested only from the Secure Kernel itself (and not from secure processes). We've already

provided the list of enabled and special normal calls (which are callable from software running in VSM)

in Chapter 3 of Part 1, in the section named "Trustlet-accessible system calls."

Figure 9-34 shows an example of a special normal call. In the example, the Lsalo trustlet has called the NtQueryInformationProcess native API to request information of a particular process. The NtDll.dll mapped in JUM prepares the syscall number and executes a SVSCALL instruction, which transfers the execution flow to the KISystemServiceStart global system call dispatcher, residing in the Secure Kernel (VTL 1). The global system call dispatcher recognizes that the system call number belongs to a normal call and uses the number to access the lumSyscallDispatchTable array, which represents the normal calls dispatch table.

CHAPTER 9 Virtualization technologies      353


---

The normal calls dispatch table contains an array of compared entries, which are generated in phase 0 of the Secure Kernel startup (discussed later in this chapter). Each entry contains an offset to a target function (calculated relative to the table itself) and the number of its arguments (with some flags). All the offsets in the table are initially calculated to point to the normal call dispatcher routine (umGenericSyscall). After the first initialization cycle, the Secure Kernel startup routine patches each entry that represents a special call. The new offset is pointed to the part of code that implements the normal call in the Secure Kernel.

![Figure](figures/Winternals7thPt2_page_385_figure_001.png)

FIGURE 9-34 A trustlet performing a special normal call to the NtQueryInformationProcess API.

As a result, in Figure 9-34, the global system calls dispatcher transfers execution to the

NIQueryInformationProcess function's part implemented in the Secure Kernel. The latter checks

whether the requested information class is one of the small subsets exposed to the Secure Kernel and, if

so, uses a small stub code to call the normal call dispatcher routine (IumGenericSyscall).

Figure 9-35 shows the syscall selector number for the NTQueryInformationProcess API. Note that the stub sets the highest bit (N bit) of the syscall number to indicate that the normal call is requested by the Secure Kernel. The normal call dispatcher checks the parameters and calls the marshaler, which is able to marshal each argument and copy it in the right offset of the shared buffer. There is another bit in the selector that further differentiates between a normal call or a secure system call, which is discussed later in this chapter.

![Figure](figures/Winternals7thPt2_page_385_figure_005.png)

FIGURE 9-35 The Syscall selector number of the Secure Kernel.

---

The marshaler works thanks to two important arrays that describe each normal call: the descriptors array (shown in the right side of Figure 9-34) and the arguments descriptors array. From these arrays, the marshaler can fetch all the information that it needs: normal call type, marshalling function index, argument type, size, and type of data pointed to (if the argument is a pointer).

After the shared buffer has been correctly filled by the marshaler, the Secure Kernel compiles the

SKCALL data structure and enters the normal call dispatcher loop (SKCallNormalMode). This part

of the loop saves and clears all the shared virtual CPU registers, disables interrupts, and moves the

thread context to the PRCB thread (more about thread scheduling later in the chapter). It then copies

the content of the SKCALL data structure in some shared register. As a final stage, it calls the hypervi sor through the HvVtlReturn hypercall.

Then the code execution resumes in the secure call dispatch loop in VTL 0. If there are some pending

interrupts in the queue, they are processed as normal (only if the IRQL allows it). The loop recognizes

the normal call operation request and calls the NtQueryInformationProcess function implemented in

VTL 0. After the latter function finished its processing, the loop restarts and reenters the Secure Kernel

again (as for Secure Calls), still through the HviSwitchToVsmVtlI routine, but with a different operation

request: Resume thread. This, as the name implies, allows the Secure Kernel to switch to the original

secure thread and to continue the execution that has been preempted for executing the normal call.

The implementation of enabled normal calls is the same except for the fact that those calls have their entries in the normal calls dispatch table, which point directly to the normal call dispatcher routine, LumGenericSyscall. In this way, the code will transfer directly to the handler, skipping any API implementation code in the Secure Kernel.

## Secure system calls

The last type of system calls available in the Secure Kernel is similar to standard system calls provided by the NT kernel to VTLD user mode software. The secure system calls are used for providing services only to the secure processes (trustlets), VTLD 0 software can't emit secure system calls in any way. As we will discuss in the "Isolated User Mode" section later in this chapter, every trustlet maps the IUM Native Layer Dll (lumdll.dll) in its address space. Iumdll.dll has the same job as its counterpart in VTLD 0, NtDll.dll: implement the native syscall stub functions for user mode application. The stub copies the syscall number in a register and emits the _SYSCALL instruction (the instruction uses different opcodes depending on the platform).

Secure system calls numbers always have the twenty-eighth bit set to 1 (on AMD64 architectures,

whereas ARM64 uses the sixteenth bit). In this way, the global system call dispatcher (K/SystemServiceStart)

recognizes that the syscall number belongs to a secure system call (and not a normal call) and switches

to the SkiSecureServiceTable, which represents the secure system calls dispatch table. As in the case of

normal calls, the global dispatcher verifies that the call number is in the limit, allocates stack space for

the arguments (if needed), calculates the system call final address, and transfers the code execution to it.

Overall, the code execution remains in VTL 1, but the current privilege level of the virtual processor

raises from 3 (user mode) to 0 (kernel mode). The dispatch table for secure system calls is compacted—


similarly to the normal calls dispatch table—at phase 0 of the Secure Kernel startup. However, entries in

this table are all valid and point to functions implemented in the Secure Kernel.

CHAPTER 9 Virtualization technologies      355


---

## Secure threads and scheduling

As we will describe in the "Isolated User Mode" section, the execution units in VSM are the secure threads, which live in the address space described by a secure process. Secure threads can be kernel mode or user mode threads. VSM maintains a strict correspondence between each user mode secure thread and normal thread living in VTL 0.

Indeed, the Secure Kernel thread scheduling depends completely on the normal NT kernel; the Secure Kernel doesn't include a proprietary scheduler (by design, the Secure Kernel attack surface needs to be small). In Chapter 3 of Part 1, we described how the NT kernel creates a process and the relative initial thread. In the section that describes Stage 4, "Creating the initial thread and its stack and context," we explain that a thread creation is performed in two parts:

- ■ The executive thread object is created; its kernel and user stack are allocated. The
KelInitThread routine is called for setting up the initial thread context for user mode threads.
KiStartUserThread is the first routine that will be executed in the context of the new thread,
which will lower the thread's iRQL and call PspUserThreadStartup.

■ The execution control is then returned to NTCreateUserProcess, which, at a later stage, calls
PspInsertThread to complete the initialization of the thread and insert it into the object man-
ager namespace.
As a part of its work, when PSpInserThread detects that the thread belongs to a secure process, it calls VsiCreateSecureThread, which, as the name implies, uses the Create Thread secure service call to ask to the Secure Kernel to create an associated secure thread. The Secure Kernel verifies the parameters and gets the process's secure image data structure (more details about this later in this chapter). It then allocates the secure thread object and its TEB, creates the initial thread context (the first routine that will run is SkpUserThreadStartup), and finally makes the thread schedulable. Furthermore, the secure service handler in VTL 1, after marking the thread as ready to run, returns a specific thread cookie, which is stored in the ETHEAD data structure.

The new secure thread still starts in VTL 0. As described in the "Stage 7" section of Chapter 3 of Part 1, PspUserThreadStartup performs the final initialization of the user thread in the new context. In case it determines that the thread's owning process is a trustlet, PspUserThreadStartup calls the VslStartSecureThread function, which invokes the secure calls dispatch loop through the VslpEnterium SecureMode routine in VTL 0 (passing the secure thread cookie returned by the Create Thread secure service handler). The first operation that the dispatch loop requests to the Secure Kernel is to resume the execution of the secure thread (still through the HvUILibc hypercall).

The Secure Kernel, before the switch to VTL 0, was executing code in the normal call dispatcher loop (SkCallNormalMode). The hypercall executed by the normal kernel restarts the execution in the same loop routine. The VTL 1 dispatcher loop recognizes the new thread resume request; it switches its execution context to the new secure thread, attaches to its address spaces, and makes it runnable. As part of the context switching, a new stack is selected (which has been previously initialized by the Create Thread secure call). The latter contains the address of the first secure thread system function, SkpUserThreadStartup, which, similarly to the case of normal NT threads, sets up the initial thunk context to run the image-loader initialization routine (LdrInitializeThunk in Ntllld.dll).

---

After it has started, the new secure thread can return to normal mode for two main reasons: it emits a normal call, which needs to be processed in VTL 0, or the VINA interrupts preempt the code execution. Even though the two cases are processed in a slightly different way, they both result in executing the normal call dispatcher loop ($kCallNormalMode).

As previously discussed in Part 1, Chapter 4, "Threads," the NT scheduler works thanks to the processor clock, which generates an interrupt every time the system clock fires (usually every 15.6 milliseconds). The clock interrupt service routine updates the processor times and calculates whether the thread quantum expires. The interrupt is targeted to VTLO, so, when the virtual processor is executing code in VT L 1, the hypervisor injects a VINA interrupt to the Secure Kernel, as shown in Figure 9-36. The VINA interrupt preempts the current executing code, lowers the IRQL to the previous preempted code's IRQL value, and emits the VINA normal call for entering VT L 0.

![Figure](figures/Winternals7thPt2_page_388_figure_002.png)

FIGURE 9-36 Secure threads scheduling scheme.

CHAPTER 9 Virtualization technologies      357


---

As the standard process of normal call dispatching, before the Secure Kernel emits the HvVllReturn hypercall, it deselects the current execution thread from the virtual processor's PRCB. This is important: The VP in VT1 is not tied to any thread context anymore and, on the next loop cycle, the Secure Kernel can switch to a different thread or decide to reschedule the execution of the current one.

After the VTL switch, the NT kernel resumes the execution in the secure calls dispatch loop and still

in the context of the new thread. Before it has any chance to execute any code, the code is preempted

by the clock interrupt service routine, which can calculate the new quantum value and, if the latter has

expired, switch the execution of another thread. When a context switch occurs, and another thread

enters VTL 1, the normal call dispatch loop schedules a different secure thread depending on the value

of the secure thread cookie:

- ■ A secure thread from the secure thread pool if the normal NT kernel has entered VTL 1 for dis-
patching a secure call (in this case, the secure thread cookie is 0).

■ The newly created secure thread if the thread has been rescheduled for execution (the secure
thread cookie is a valid value). As shown in Figure 9-36, the new thread can be also rescheduled
by another virtual processor (VP 3 in the example).
With the described schema, all the scheduling decisions are performed only in VTL 0. The secure call loop and normal call loops cooperate to correctly switch the secure thread context in VTL 1. All the secure threads have an associated a thread in the normal kernel. The opposite is not true, though; if a normal thread in VTL 0 decides to emit a secure call, the Secure Kernel dispatches the request by using an arbitrary thread context from a thread pool.

## The Hypervisor Enforced Code Integrity

Hypervisor Enforced Code Integrity (HCVI) is the feature that powers Device Guard and provides the W*X (pronounced double-you xor ex) characteristic of the VTL 0 kernel memory. The NT kernel can't map and executes any kind of executable memory in kernel mode without the aid of the Secure Kernel. The Secure Kernel allows only proper digitally signed drivers to run in the machine's kernel. As we discuss in the next section, the Secure Kernel keeps track of every virtual page allocated in the normal NT kernel; memory pages marked as executable in the NT kernel are considered privileged pages. Only the Secure Kernel can write to them after the SKI module has correctly verified their content.

You can read more about HVCI in Chapter 7 of Part 1, in the “Device Guard” and “Credential

Guard” sections.

## UEFI runtime virtualization

Another service provided by the Secure Kernel (when HVCI is enabled) is the ability to virtualize and protect the UEFI runtime services. As we discuss in Chapter 12, the UEFI firmware services are mainly implemented by using a big table of function pointers. Part of the table will be deleted from memory after the OS takes control and calls the ExitBootServices function, but another part of the table, which represents the Runtime services, will remain mapped even after the OS has already taken full control of the machine. Indeed, this is necessary because sometimes the OS needs to interact with the UEFI configuration and services.


CHAPTER 9 Virtualization technologies




---

Every hardware vendor implements its own UEFI firmware. With HVCI, the firmware should cooperate to provide the nonwritable state of each of its executable memory pages (no firmware page can be mapped in VTL 0 with read, write, and execute state). The memory range in which the UEFI firmware resides is described by multiple MEMORY_DESCRIPTOR data structures located in the EFI memory map. The Windows Loader parses this data with the goal to properly protect the UEFI firmware's memory. Unfortunately, in the original implementation of UEFI, the code and data were stored mixed in a single section (or multiple sections) and were described by relative memory descriptors. Furthermore, some device drivers read or write configuration data directly from the UEFI's memory regions. This clearly was not compatible with HVCI.

For overcoming this problem, the Secure Kernel employs the following two strategies:

- ■ New versions of the UEFI firmware (which adhere to UEFI 2.6 and higher specifications) main-
tain a new configuration table (linked in the boot services table), called memory attribute table
(MAT). The MAT defines fine-grained sections of the UEFI Memory region, which are subsec-
tions of the memory descriptors defined by the EFI memory map. Each section never has both
the executable and writable protection attribute.
■ For old firmware, the Secure Kernel maps in VTL 0 the entire UEFI firmware region's physical
memory with a read-only access right.
In the first strategy, at boot time, the Windows Loader merges the information found both in the EFI memory map and in the MAT, creating an array of memory descriptors that precisely describe the entire firmware region. It then copies them in a reserved buffer located in VTL 1 (used in the hibernation path) and verifies that each firmware's section doesn't violate the W/X assumption. If so, when the Secure Kernel starts, it applies a proper SLAT protection for every page that belongs to the underlying UEFI firmware region. The physical pages are protected by the SLAT, but their virtual address space in VTL 0 is still entirely marked as RWX. Keeping the virtual memory's RWX protection is important because the Secure Kernel must support resume-from-hibernation in a scenario where the protection applied in the MAT entries can change. Furthermore, this maintains the compatibility with older drivers, which read or write directly from the UEFI memory region, assuming that the write is performed in the correct sections. (Also, the EFI code should be able to write in its own memory, which is mapped in VTL 0.) This strategy allows the Secure Kernel to avoid mapping any firmware code in VTL 1; the only part of the firmware that remains in VTL 1 is the Runtime function table itself. Keeping the table in VTL 1 allows the resume-fromhibernation code to update the UEFI runtime services' function pointer directly.

The second strategy is not optimal and is used only for allowing old systems to run with HVCI

enabled. When the Secure Kernel doesn't find any MAT in the firmware, it has no choice except to map

the entire UEFI runtime services code in VTL1. Historically, multiple bugs have been discovered in the

UEFI firmware code (in SMM especially). Mapping the firmware in VTL 1 could be dangerous, but it's the

only solution compatible with HVCI. (New systems, as stated before, never map any UEFI firmware code

in VTL 1.) At startup time, the NT Hal detects that HVCI is on and that the firmware is entirely mapped

in VTL 1. So, it switches its internal EFI service table's pointer to a new table, called UEFI wrapper table.

Entries of the wrapper table contain stub routines that use the INVOKE_EFI_RUNTIME_SERVICE secure

call to enter in VTL 1. The Secure Kernel marshals the parameters, executes the firmware call, and yields

the results to VTL 0. In this case, all the physical memory that describes the entire UEFI firmware is still

CHAPTER 9 Virtualization technologies      359


---

mapped in read-only mode in VTL 0. The goal is to allow drivers to correctly read information from the UEFI firmware memory region (like ACPI tables, for example). Old drivers that directly write into UEFI memory regions are not compatible with HVCI in this scenario.

When the Secure Kernel resumes from hibernation, it updates the in-memory UEFI service table to point to the new services’ location. Furthermore, in systems that have the new UEFI firmware, the Secure Kernel reappplies the SLAT protection on each memory region mapped in VTL 0 (the Windows Loader is able to change the regions’ virtual addresses if needed).

## VSM startup

Although we describe the entire Windows startup and shutdown mechanism in Chapter 12, this section describes the way in which the Secure Kernel and all the VSM infrastructure is started. The Secure Kernel is dependent on the hypervisor, the Windows Loader, and the NT kernel to properly start up. We discuss the Windows Loader, the hypervisor loader, and the preliminary phases by which the Secure Kernel is initialized in VTL 0 by these two modules in Chapter 12. In this section, we focus on the VSM startup method, which is implemented in the securekernel.exe binary.

The first code executed by the securekernel.exe binary is still running in VTL 0; the hypervisor already

has been started, and the page tables used for VTL 1 have been built. The Secure Kernel initializes the

following components in VTL 0:

- ■ The memory manager's initialization function stores the PFN of the VTL 0 root-level page-
level structure, saves the code integrity data, and enables HVCI, MBEC (Mode-Based Execution
Control), kernel CFG, and hot patching.
■ Shared architecture-specific CPU components, like the GDT and IDT.
■ Normal calls and secure system calls dispatch tables (initialization and compaction).
■ The boot processor. The process of starting the boot processor requires the Secure Kernel to
allocate its kernel and interrupt stacks; initialize the architecture-specific components, which
can't be shared between different processors (like the TSS); and finally allocate the processor's
SKPRCB. The latter is an important data structure, which, like the PRCB data structure in VTL 0, is
used to store important information associated to each CPU.
The Secure Kernel initialization code is ready to enter VTL 1 for the first time. The hypervisor subsystem initialization function (shellInitSystem routine) connects to the hypervisor (through the hypervisor CPUID classes; see the previous section for more details) and checks the supported enlightments. Then it saves the VTL 1's page table (previously created by the Windows Loader) and the allocated hypercall pages (used for holding hypercall parameters). It finally initializes and enters VTL 1 in the following way:

- 1. Enables VTL 1 for the current hypervisor partition through the HvEnablePartitionVtl hypercall.
The hypervisor copies the existing SLAT table of normal VTL to VTL 1 and enables MBEC and
the new VTL 1 for the partition.

2. Enables VTL 1 for the boot processor through HvEnableVmVtl hypercall. The hypervisor initial-
izes a new per-level VMCS data structure, compiles it, and sets the SLAT table.
---

3. Asks the hypervisor for the location of the platform-dependent VtICall and VtIReturn hypercall

code. The CPU opcodes needed for performing VSM calls are hidden from the Secure Kernel

implementation. This allows most of the Secure Kernel's code to be platform-independent.

Finally, the Secure Kernel executes the transition to VTL 1, through the HvITCall hypercall. The

hypervisor loads the VMCS for the new VTL and switches to it (making it active). This basically

renders the new VTL runnable.

The Secure Kernel starts a complex initialization procedure in VTL 1, which still depends on the

Windows Loader and also on the NT kernel. It is worth noting that, at this stage, VTL 1 memory is still

identity-mapped in VTL 0; the Secure Kernel and its dependent modules are still accessible to the nor mal world. After the switch to VTL 1, the Secure Kernel initializes the boot processor:

1. Gets the virtual address of the Synthetic Interrupt controller shared page, TSC, and VP assist page, which are provided by the hypervisor for sharing data between the hypervisor and VTL 1 code. Maps in VTL 1 the Hypercall page.

2. Blocks the possibility for other system virtual processors to be started by a lower VTL and requests the memory to be zero-filled on reboot to the hypervisor.

3. Initializes and fills the boot processor Interrupt Descriptor Table (IDT). Configures the IPI, callbacks, and secure timer interrupt handlers and sets the current secure thread as the default SKPRCB thread.

4. Starts the VTL 1 secure memory manager, which creates the boot table mapping and maps the boot loader's memory in VTL 1, creates the secure PFN database and system hyperspace, initializes the secure memory pool support, and reads the VTL 0 loader block to copy the module descriptors of the Secure Kernel's imported images ($kci.dll, Cn.fys, and Vmsvcext.sys). It finally walks the NT loaded module list to establish each driver state, creating a NAR (normal address range) data structure for each one and compiling an Normal Table Entry (NTE) for every page composing the boot driver's sections. Furthermore, the secure memory manager initialization function applies the correct VTL 0 SLAT protection to each driver's sections.

5. Initializes the HAL, the secure threads pool, the process subsystem, the synthetic APIC, Secure PNP, and Secure PCI.

6. Applies a read-only VTL 0 SLAT protection for the Secure Kernel pages, configures MBEC, and enables the VINA virtual interrupt on the boot processor.

When this part of the initialization ends, the Secure Kernel unmaps the boot-loaded memory. The secure memory manager, as we discuss in the next section, depends on the VTL 0 memory manager for being able to allocate and free VTL 1 memory. VTL 1 does not own any physical memory; at this stage, it relies on some previously allocated (by the Windows Loader) physical pages for being able to satisfy memory allocation requests. When the NT kernel later starts, the Secure Kernel performs normal calls for requesting memory services to the VTL 0 memory manager. As a result, some parts of the Secure Kernel initialization must be deferred after the NT kernel is started. Execution flow returns to the Windows Loader in VTL 0. The latter loads and starts the NT kernel. The last part of the Secure Kernel initialization happens in phase 0 and phase 1 of the NT kernel initialization (see Chapter 12 for further details).

CHAPTER 9 Virtualization technologies      361


---

Phase 0 of the NT kernel initialization still has no memory services available, but this is the last

moment in which the Secure Kernel fully trusts the normal world. Boot-loaded drivers still have not

been initialized and the initial boot process should have been already protected by Secure Boot. The

PHASE3_INIT secure call handler modifies the SLAT protections of all the physical pages belonging

to Secure Kernel and to its depended modules, rendering them inaccessible to VT L/O. Furthermore, it

applies a read-only protection to the kernel CFG bitmaps. At this stage, the Secure Kernel enables the

support for pagefile integrity, creates the initial system process and its address space, and saves all the

"trusted" values of the shared CPU registers (like IDT, GDT, Syscall MSR, and so on). The data structures

that the shared registers point to are verified (thanks to the NTE database). Finally, the secure thread

pool is started and the object manager, the secure code integrity module (Skci.dll), and HyperGuard

are initialized (more details on HyperGuard are available in Chapter 7 of Part 1).

When the execution flow is returned to VTL 0, the NT kernel can then start all the other application

processors (APs). When the Secure Kernel is enabled, the AP's initialization happens in a slightly differ ent way (we discuss AP initialization in the next section).

As part of the phase 1 of the NT kernel initialization, the system starts the I/O manager. The I/O manager, as discussed in Part 1, Chapter 6, "I/O system, " is the core of the I/O system and defines the model within which I/O requests are delivered to device drivers. One of the duties of the I/O manager is to initialize and start the boot-loaded and ELAM drivers. Before creating the special sections for mapping the user mode system DLLs, the I/O manager initialization function emits a PHASE4_INIT secure call to start the last initialization phase of the Secure Kernel. At this stage, the Secure Kernel does not trust the VTL 0 anymore, but it can use the services provided by the NT memory manager. The Secure Kernel initializes the content of the Secure User Shared data page (which is mapped both in VTL 1 user mode and kernel mode) and finalizes the executive subsystem initialization. It reclaims any resources that were reserved during the boot process, calls each of its own dependent module entry points (in particular, crg.sys and msvcext.sys, which start before any normal boot drivers). It allocates the necessary resources for the encryption of the hibernation, crash-dump, paging files, and memory-page integrity. It finally reads and maps the API set schema file in VTL 1 memory. At this stage, VSM is completely initialized.

## Application processors (APs) startup

One of the security features provided by the Secure Kernel is the startup of the application processors

(APs), which are the ones not used to boot up the system. When the system starts, the Intel and AMD

specifications of the x86 and AMD64 architectures define a precise algorithm that chooses the boot

strap processor (BSP) in multiprocessor systems. The boot processor always starts in 16-bit real mode

(where it's able to access only 1 MB of physical memory) and usually executes the machine's firmware

code (UEFI in most cases), which needs to be located at a specific physical memory location (the location is called reset vector). The boot processor executes almost all of the initialization of the OS, hyper visor, and Secure Kernel. For starting other non-boot processors, the system needs to send a special IPI

(inter-processor interrupt) to the local APIs belonging to each processor. The startup IPI (SIFI) vector

contains the physical memory address of the processor start block, a block of code that includes the

instructions for performing the following basic operations:

- 1. Load a GDT and switch from 16-bit real-mode to 32-bit protected mode (with no paging enabled).
362      CHAPTER 9   Virtualization technologies


---

- 2. Set a basic page table, enable paging, and enter 64-bit long mode.

3. Load the 64-bit IDT and GDT, set the proper processor registers, and jump to the OS startup

function (K/SystemStartup).
This process is vulnerable to malicious attacks. The processor startup code could be modified by external entities while it is executing on the AP processor (the NT kernel has no control at this point). In this case, all the security promises brought by VSM could be easily fooled. When the hypervisor and the Secure Kernel are enabled, the application processors are still started by the NT kernel but using the hypervisor.

KeStartAllProcessors, which is the function called by phase 1 of the NT kernel initialization (see Chapter 12 for more details), with the goal of starting all the APs, builds a shared IDT and enumerates all the available processors by consulting the Multiple APIC Description Table (MADT) ACPI table. For each discovered processor, it allocates memory for the PRCB and all the private CPU data structures for the kernel and DPC stack. If the VSM is enabled, it then starts the AP by sending a START_PROCESSOR secure call to the Secure Kernel. The latter validates that all the data structures allocated and filled for the new processor are valid, including the initial values of the processor registers and the startup routine (KSystemStartup) and ensures that the APs startups happen sequentially and only once per processor. It then initializes the VTL 1 data structures needed for the new application processor (the SKPRCB in particular). The PRCB thread, which is used for dispatching the Secure Calls in the context of the new processor, is started, and the VTL 0 CPU data structures are protected by using the SLAT. The Secure Kernel finally enables VTL 1 for the new application processor and starts it by using the HxStartVirtualProcessor hypercall. The hypervisor starts the AP in a similar way described in the beginning of this section (by sending the startup IP). In this case, however, the AP starts its execution in the hypervisor context, switches to 64-bit long mode execution, and returns to VTL 1.

The first function executed by the application processor resides in VTL1. The Secure Kernel's CPU

initialization routine maps the per-processor VP assist page and SyncControl page, configures MBEC,

and enables the VINA. It then returns to VTL0 through the HvVtoReturn hypercall. The first routine exe cuted in VTL0 is KiSystemStartup, which initializes the data structures needed by the NT kernel to man age the AP, initializes the HAL, and jumps to the idle loop (read more details in Chapter 12). The Secure

Call dispatch loop is initialized later by the normal NT kernel when the first secure call is executed.

An attacker in this case can't modify the processor startup block or any initial value of the CPU's registers and data structures. With the described secure AP start-up, any modification would have been detected by the Secure Kernel and the system bug checked to defeat any attack effort.

## The Secure Kernel memory manager

The Secure Kernel memory manager heavily depends on the NT memory manager (and on the Windows Loader memory manager for its startup code). Entirely describing the Secure Kernel memory manager is outside the scope of this book. Here we discuss only the most important concepts and data structures used by the Secure Kernel.

CHAPTER 9  Virtualization technologies      363


---

As mentioned in the previous section, the Secure Kernel memory manager initialization is divided into three phases. In phase 1, the most important, the memory manager performs the following:

- 1. Maps the boot loader firmware memory descriptor list in VTL, scans the list, and determines
the first physical page that it can use for allocating the memory needed for its initial startup
(this memory type is called SLAB). Maps the VTL 0's page tables in a virtual address that is
located exactly 512 GB before the VTL 1s page table. This allows the Secure Kernel to perform
a fast conversion between an NT virtual address and one from the Secure Kernel.

2. Initializes the PTE range data structures. A PTE range contains a bitmap that describes each
chunk of allocated virtual address range and helps the Secure Kernel to allocate PTEs for its
own address space.

3. Creates the Secure PFN database and initializes the Memory pool.

4. Initializes the sparse NT address table. For each boot-loaded driver, it creates and fills a NAR,
verifies the integrity of the binary, fills the hot patch information, and, if HVCI is on, protects
each executable section of driver using the SLAT. It then cycles between each FTE of the
memory image and writes an NT Address Table Entry (NTE) in the NT address table.

5. Initializes the page bundles.
The Secure Kernel keeps track of the memory that the normal NT kernel uses. The Secure Kernel

memory manager uses the NAR data structure for describing a kernel virtual address range that

contains executable code. The NAR contains some information of the range (such as its base address

and size) and a pointer to a SECURE_IMAGE data structure, which is used for describing runtime drivers

(in general, images verified using Secure HVCI, including user mode images used for trustlets) loaded

in VTL 0. Boot-loaded drivers do not use the SECURE_IMAGE data structure because they are treated

by the NT memory manager as private pages that contain executable code. The latter data structure

contains information regarding a loaded image in the NT kernel (which is verified by SKCI), like the ad dress of its entry point, a copy of its relocation tables (used also for dealing with Retpoline and Import

Optimization), the pointer to its shared prototype PTEs, hot-patch information, and a data structure

that specifies the authorized use of its memory pages. The SECURE_IMAGE data structure is very

important because it's used by the Secure Kernel to track and verify the shared memory pages that

are used by runtime drivers.

For tracking VTL 0 kernel private pages, the Secure Kernel uses the NTE data structure. An NTE exists for every virtual page in the VTL 0 address space that requires supervision from the Secure Kernel; it's often used for private pages. An NTE tracks a VTL 0 virtual page's PTE and stores the page state and protection. When HVCI is enabled, the NTE table divides all the virtual pages between privileged and non-privileged. A privileged page represents a memory page that the NT kernel is not able to touch on its own because it's protected through SLAT and usually corresponds to an executable page or to a kernel CFG read-only page. A nonprivileged page represents all the other types of memory pages that the NT kernel has full control over. The Secure Kernel uses invalid NTEs to represent nonprivileged pages. When HVCI is off, all the private pages are nonprivileged (the NT kernel has full control of all its pages indeed).

In HVC4-enabled systems, the NT memory manager can't modify any protected pages. Otherwise, an EPT violation exception will raise in the hypervisor, resulting in a system crash. After those systems

364      CHAPTER 9   Virtualization technologies


---

complete their boot phase, the Secure Kernel has already processed all the nonexecutable physical

pages by SLAT protecting them only for read and write access. In this scenario, new executable pages

can be allocated only if the target code has been verified by Secure HPCI.

When the system, an application, or the Plug and Play manager require the loading of a new runtime driver, a complex procedure starts that involves the NT and the Secure Kernel memory manager, summarized here:

- 1. The NT memory manager creates a section object, allocates and fills a new Control area (more
details about the NT memory manager are available in Chapter 5 of Part 1), reads the first page
of the binary, and calls the Secure Kernel with the goal to create the relative secure image,
which describe the new loaded module.

2. The Secure Kernel creates the SECURE_IMAGE data structure, parses all the sections of the
binary file, and fills the secure prototype PTEs array.

3. The NT kernel reads the entire binary in nonexecutable shared memory (pointed by the
prototype PTEs of the control area). Calls the Secure Kernel, which, using Secure HVCI, cycles
between each section of the binary image and calculates the final image hash.

4. If the calculated file hash matches the one stored in the digital signature, the NT memory walks
the entire image and for each page calls the Secure Kernel, which validates the page (each page
hash has been already calculated in the previous phase), applies the needed relocations (ASLR,
Retpoline, and Import Optimization), and applies the new SLAT protection, allowing the page
to be executable but not writable anymore.

5. The Section object has been created. The NT memory manager needs to map the driver in its
address space. It calls the Secure Kernel for allocating the needed privileged PTEs for describ-
ing the driver's virtual address range. The Secure Kernel creates the NAR data structure. It
then maps the physical pages of the driver, which have been previously verified, using the
MiMapSystemImage routine.
![Figure](figures/Winternals7thPt2_page_396_figure_003.png)

Note When a NARs is initialized for a runtime driver, part of the NTE table is filled for describing the new driver address space. The NTEs are not used for keeping track of a runtime driver's virtual address range (its virtual pages are shared and not private), so the relative part of the NT address table is filled with invalid "reserved" NTEs.

While VT1.0 kernel virtual address ranges are represented using the NAR data structure, the Secure Kernel uses secure VADs (virtual address descriptors) to track user-mode virtual addresses in VT1.


Secure VADs are created every time a new private virtual allocation is made, a binary image is mapped in the address space of a trustlet (secure process), and when a VBS-enclave is created or a module is mapped into its address space. A secure VAD is similar to the NT kernel VAD and contains a descriptor of the VA range, a reference counter, some flags, and a pointer to the Secure section, which has been created by SKCI. (The secure section pointer is set to 0 in case of secure VADs describing private virtual allocations.) More details about Trustlets and VBS-based enclaves will be discussed later in this chapter.

CHAPTER 9 Virtualization technologies      365


---

## Page identity and the secure PFN database

After a driver is loaded and mapped correctly into VTLO memory, the NT memory manager needs to be able to manage its memory pages (for various reasons, like the paging out of a pageable driver's section, the creation of private pages, the application of private fixups, and so on; see Chapter 5 in Part 1 for more details). Every time the NT memory manager operates on protected memory, it needs the cooperation of the Secure Kernel. Two main kinds of secure services are offered to the NT memory manager for operating with privileged memory: protected pages copy and protected pages removal.

A PAGE_IDENTITY data structure is the glue that allows the Secure Kernel to keep track of all the

different kinds of pages. The data structure is composed of two fields: an Address Context and a Virtual

Address. Every time the NT kernel calls the Secure Kernel for operating on privileged pages, it needs

to specify the physical page number along with a valid PAGE_IDENTITY data structure describing what

the physical page is used for. Through this data structure, the Secure Kernel can verify the requested

page usage and decide whether to allow the request.

Table 9-4 shows the PAGE_IDENTITY data structure (second and third columns), and all the types of verification performed by the Secure Kernel on different memory pages:

- ■ If the Secure Kernel receives a request to copy or to release a shared executable page of a
runtime driver, it validates the secure image handle (specified by the caller) and gets its relative
data structure (SECURE_IMAGE). It then uses the relative virtual address (RVA) as an index into
the secure prototype array to obtain the physical page frame (PFN) of the driver's shared page.
If the found PFN is equal to the caller's specified one, the Secure Kernel allows the request;
otherwise it blocks it.

■ In a similar way, if the NT kernel requests to operate on a trustlet or an enclave page (more
details about trustlets and secure encrudes are provided later in this chapter), the Secure Kernel
uses the caller's specified virtual address to verify that the secure PTE in the secure process page
table contains the correct PFN.

■ As introduced earlier in the section "The Secure Kernel memory manager", for private kernel
pages, the Secure Kernel locates the NTE starting from the caller's specified virtual address and
verifies that it contains a valid PFN, which must be the same as the caller's specified one.

■ Placeholder pages are free pages that are SLAT protected. The Secure Kernel verifies the state of
a placeholder page by using the PFN database.
TABLE 9-4 Different page identities managed by the Secure Kernel

<table><tr><td>Page Type</td><td>Address Context</td><td>Virtual Address</td><td>Verification Structure</td></tr><tr><td>Kernel Shared</td><td>Secure Image Handle</td><td>RVA of the page</td><td>Secure Prototype PTE</td></tr><tr><td>Trustlet/Enclave</td><td>Secure Process Handle</td><td>Virtual Address of the Secure Process</td><td>Secure PTE</td></tr><tr><td>Kernel Private</td><td>0</td><td>Kernel Virtual Address of the page</td><td>NT address table entry (NTE)</td></tr><tr><td>Placeholder</td><td>0</td><td>0</td><td>PFN entry</td></tr></table>


---

The Secure Kernel memory manager maintains a PFN database to represent the state of each physical page. A PFN entry in the Secure Kernel is much smaller compared to its NT equivalent; it basically contains the page state and the share counter. A physical page, from the Secure Kernel perspective, can be in one of the following states: invalid, free, shared, I/O, secured, or image (secured NT private).

The secured state is used for physical pages that are private to the Secure Kernel (the NT kernel can

never claim them) or for physical pages that have been allocated by the NT kernel and later SLAT protected by the Secure Kernel for storing executable code verified by Secure HVCI. Only secured

nonprivate physical pages have a page identity.

When the NT kernel is going to page out a protected page, it asks the Secure Kernel for a page removal operation. The Secure Kernel analyzes the specified page identity and does its verification (as explained earlier). In case the page identity refers to an enclave or a trustlet page, the Secure Kernel encrypts the page's content before releasing it to the NT kernel, which will then store the page in the paging file. In this way, the NT kernel still has no chance to intercept the real content of the private memory.

## Secure memory allocation

As discussed in previous sections, when the Secure Kernel initially starts, it parses the firmware's memory descriptor lists, with the goal of being able to allocate physical memory for its own use. In phase 1 of its initialization, the Secure Kernel can't use the memory services provided by the NT kernel (the NT kernel indeed is still not initialized), so it uses free entries of the firmware's memory descriptor lists for reserving 2-MB SLABS. A SLAB is a 2-MB contiguous physical memory, which is mapped by a single nested page table directory entry in the hypervisor. All the SLAB pages have the same SLAT protection. SLABS have been designed for performance considerations. By mapping a 2-MB chunk of physical memory using a single nested page entry in the hypervisor, the additional hardware memory address translation is faster and results in less cache misses on the SLAT table.

The first Secure Kernel page bundle is filled with 1 MB of the allocated SLAB memory. A page bundle is the data structure shown in Figure 9-37, which contains a list of contiguous free physical page frame numbers (PFNs). When the Secure Kernel needs memory for its own purposes, it allocates physical pages from a page bundle by removing one or more free page frames from the tail of the bundle's PFNs array. In this case, the Secure Kernel doesn't need to check the firmware memory descriptors list until the bundle has been entirely consumed. When the phase 3 of the Secure Kernel initialization is done, memory services of the NT kernel become available, and so the Secure Kernel frees any boot memory descriptor lists, retaining physical memory pages previously located in bundles.

Future secure memory allocations use normal calls provided by the NT kernel. Page bundles have been designed to minimize the number of normal calls needed for memory allocation. When a bundle gets fully allocated, it contains no pages (all its pages are currently assigned), and a new one will be generated by asking the NT kernel for 1 MB of contiguous physical pages (through the ALLOC_PHYSICAL _PAGES normal call). The physical memory will be allocated by the NT kernel from the proper SLAB.

CHAPTER 9  Virtualization technologies      367


---

In the same way, every time the Secure Kernel frees some of its private memory, it stores the corresponding physical pages in the correct bundle by growing its PFN array until the limit of 256 free pages. When the array is entirely filled, and the bundle becomes free, a new work item is queued. The work item will zero-out all the pages and will emit a FREE_PHYSICAL_PAGES normal call, which ends up in executing the MmFreePagesFromMdl function of the NT memory manager.

Every time enough pages are moved into and out of a bundle, they are fully protected in VTL 0 by

using the SLAT (this procedure is called "securing the bundle"). The Secure Kernel supports three kinds

of bundles, which all allocate memory from different SLABs: No access, Read-only, and Read-Execute.

![Figure](figures/Winternals7thPt2_page_399_figure_002.png)

FIGURE 9-37 A secure page bundle with 80 available pages. A bundle is composed of a header and a free PFN array.

## Hot patching

Several years ago, the 32-bit versions of Windows were supporting the hot patch of the operatingsystem's components. Patchable functions contained a redundant 2-byte opcode in their prolog and some padding bytes located before the function itself. This allowed the NT kernel to dynamically replace the initial opcode with an indirect jump, which uses the free space provided by the padding, to divert the code to a patched function residing in a different module. The feature was heavily used by Windows Update, which allowed the system to be updated without the need for an immediate reboot of the machine. When moving to 64-bit architectures, this was no longer possible due to various problems. Kernel patch protection was a good example; there was no longer a reliable way to modify a protected kernel mode binary and to allow PatchGuard to be updated without exposing some of its private interfaces, and exposed PatchGuard interfaces could have been easily exploited by an attacker with the goal to defeat the protection.

---

The Secure Kernel has solved all the problems related to 64-bit architectures and has reintroduced

to the OS the ability of hot patching kernel binaries. While the Secure Kernel is enabled, the following

types of executable images can be hot patched:

- ● VTL0 user-mode modules (both executables and libraries)

● Kernel mode drivers, HAL, and the NT kernel binary, protected or not by PatchGuard

● The Secure Kernel binary and its dependent modules, which run in VTL1 Kernel mode

● The hypervisor (Intel, AMD, and the ARM version).
Patch binaries created for targeting software running in VTL 0 are called normal patches, whereas the others are called secure patches. If the Secure Kernel is not enabled, only user mode applications can be patched.

A hot patch image is a standard Portable Executable (PE) binary that includes the hot patch table, the data structure used for tracking the patch functions. The hot patch table is linked in the binary through the image load configuration data directory. It contains one or more descriptors that describe each patchable base image, which is identified by its checksum and time date stamp. (In this way, a hot patch is compatible only with the correct base images. The system can't apply a patch to the wrong image.) The hot patch table also includes a list of functions or global data chunks that needs to be updated in the base or in the patch image; we describe the patch engine shortly. Every entry in this list contains the functions' offsets in the base and patch images and the original bytes of the base function that will be replaced.

Multiple patches can be applied to a base image, but the patch application is idempotent. The same patch may be applied multiple times, or different patches may be applied in sequence. Regardless, the last applied patch will be the active patch for the base image. When the system needs to apply a hot patch, it uses the NtManageHotPatch system call, which is employed to install, remove, or manage hot patches. (The system call supports different "patch information" classes for describing all the possible operations.) A hot patch can be installed globally for the entire system, or if a patch is for user mode code (VTL 0), for all the processes that belong to a specific user session.

When the system requests the application of a patch, the NT kernel locates the hot patch table in the patch binary and validates it. It then uses the DETERMINE_HOT_PATCH_TYPE secure call to securely determine the type of patch. In the case of a secure patch, only the Secure Kernel can apply it, so the APPLY_HOT_PATCH secure call is used; no other processing by the NT kernel is needed. In all the other cases, the NT kernel first tries to apply the patch to a kernel driver. It cycles between each loaded kernel module, searching for a base image that has the same checksum described by one of the patch image's hot patch descriptors.

Hot patching is enabled only if the HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control

\SessionManager\MemoryManagement\HotPatchTableSize registry value is a multiple of a standard

memory page size (4.096). Indeed, when hot patching is enabled, every image that is mapped in the

virtual address space needs to have a certain amount of virtual address space reserved immediately

after the image itself. This reserved space is used for the image's hot patch address table (HPAT, not to

be confused with the hot patch table). The HPAT is used to minimize the amount of padding neces sary for each function to be patched by storing the address of the new function in the patched image.

CHAPTER 9 Virtualization technologies      369


---

When patching a function, the HPAT location will be used to perform an indirect jump from the original

function in the base image to the patched function in the patch image (note that for Repoline compat ibility, another kind of Repoline routine is used instead of an indirect jump).

When the NT kernel finds a kernel mode driver suitable for the patch, it loads and maps the patch

binary in the kernel address space and creates the related loader data table entry (for more details,

see Chapter 12). It then scans each memory page of both the base and the patch images and locks in

memory the ones involved in the hot patch (this is important; in this way, the pages can't be paged out

to disk while the patch application is in progress). It finally ends the APPLY_HOT_PATCH secure call.

The real patch application process starts in the Secure Kernel. The latter captures and verifies the hot

patch table of the patch image (by remapping the patch image also in VTL 1) and locates the base im age's NAR (see the previous section, "The Secure Kernel memory manager" for more details about the

NARs), which also tells the Secure Kernel whether the image is protected by PatchGuard. The Secure

Kernel then verifies whether enough reserved space is available in the image HPAT. If so, it allocates

one or more free physical pages (getting them from the secure bundle or using the ALLOC_PHYSICAL_

PAGES normal call) that will be mapped in the reserved space. At this point, if the base image is pro tected, the Secure Kernel starts a complex process that updates the PatchGuard's internal state for the

new patched image and finally calls the patch engine.

The kernel's patch engine performs the following high-level operations, which are all described by a

different entry type in the hot patch table:

- 1. Patches all calls from patched functions in the patch image with the goal to jump to the cor-
responding functions in the base image. This ensures that all unpatched code always executes
in the original base image. For example, if function A calls B in the base image and the patch
changes function A but not function B, then the patch engine will update function B in the
patch to jump to function B in the base image.

2. Patches the necessary references to global variables in patched functions to point to the cor-
responding global variables in the base image.

3. Patches the necessary import address table (IAT) references in the patch image by copying the
corresponding IAT entries from the base image.

4. Atomically patches the necessary functions in the base image to jump to the corresponding func-
tion in the patch image. As soon as this is done for a given function in the base image, all new in-
vocations of that function will execute the new patched function code in the patch image. When
the patched function returns, it will return to the caller of the original function in the base image.
Since the pointers of the new functions are 64 bits (8 bytes) wide, the patch engine inserts each

pointer in the HPAT, which is located at the end of the binary. In this way, it needs only 5 bytes for plac ing the indirect jump in the padding space located in the beginning of each function (the process has

been simplified. Retpoline compatible hot-patches requires a compatible Retpoline. Furthermore, the

HPAT is split in code and data page).

As shown in Figure 9-38, the patch engine is compatible with different kinds of binaries. If the NT kernel has not found any patchable kernel mode module, it restarts the search through all the user

---

mode processes and applies a procedure similar to properly hot patching a compatible user mode

executable or library.

![Figure](figures/Winternals7thPt2_page_402_figure_001.png)

FIGURE 9-38 A schema of the hot patch engine executing on different types of binaries.

