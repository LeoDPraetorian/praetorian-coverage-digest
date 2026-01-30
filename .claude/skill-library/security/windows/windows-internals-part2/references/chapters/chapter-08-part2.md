## The Retpoline bitmap

One of the original design goals (restraints) of the Retpoline implementation in Windows was to support a mixed environment composed of drivers compatible with Retpoline and drivers not compatible with it, while maintaining the overall system protection against Spectre v2. This implies that drivers that do not support Retpoline should be executed with IBRS on (or STIBP followed by an IBPP on kernel entry, as discussed previously in the "Hardware indirect branch controls" section), whereas others can run without any hardware speculation mitigations enabled (the protection is brought by the Retpoline code sequences and memory fences).

To dynamically achieve compatibility with older drivers, in the phase 0 of its initialization, the NT kernel allocates and initializes a dynamic bitmap that keeps track of each 64 KB chunk that compose the entire kernel address space. In this model, a bit set to 1 indicates that the 64-KB chunk of address space contains ReptoIne compatible code; a 0 means the opposite. The NT kernel then sets to 1 the bits referring to the address spaces of the HAL and NT images (which are always ReptoIne compatible). Every time a new kernel image is loaded, the system tries to apply ReptoIne to it. If the application succeeds, the respective bits in the ReptoIne bitmap are set to 1.

The Retpoline code sequence is augmented to include a bitmap check: Every time an indirect branch is performed, the system checks whether the original call target resides in a Retpoline-compatible module. In case the check succeeds (and the relative bit is 1), the system executes the Retpoline code sequence (shown in Figure 8-9) and lands in the target address securely. Otherwise (when the bit in the Retpoline bitmap is 0), a Retpoline exit sequence is initialized. The RUNNING_NON_RETPOLINE_CODE flag is set in the current CPU's PRCB (needed for context switches), IBRS is enabled (or STIBP, depending on the hardware configuration), an IBPN and LFENCE are emitted if needed, and the SPEC_CONTROL kernel event is generated. Finally, the processor lands on the target address, still in a secure way (hardware mitigations provide the needed protection).

When the thread quantum ends, and the scheduler selects a new thread, it saves the Retpoline status (represented by the presence of the RUNNING_NON_RETPOLINE_CODE flag) of the current processors in the KTHREAD data structure of the old thread. In this way, when the old thread is selected again for execution (or a kernel trap entry happens), the system knows that it needs to re-enable the needed hardware speculation mitigations with the goal of keeping the system always protected.

CHAPTER 8 System mechanisms 25


---

## Import optimization

Retpoline entries in the DVRT also describe indirect branches targeting imported functions. An inported control transfer entry in the DVRT describes this kind of branch by using an index referring to the correct entry in the IAT. (The IAT is the Image Import Address Table, an array of imported functions' pointers compiled by the loader). After the Windows loader has compiled the IAT, it is unlikely that its content would have changed (excluding some rare scenarios). As shown in Figure 8-10, it turns out that it is not needed to transform an indirect branch targeting an imported function to a Retpoline one because the NT kernel can ensure that the virtual addresses of the two images (caller and callee) are close enough to directly invoke the target (less than 2 GB).

```bash
StandardCall:
    call QWORD PTR [IAT+ExAllocatePoolOffset] ; 7 bytes
    nop DWORD PTR [RAX;RAX]     ; 5 bytes
ImportOptimizedCall:
    mov RIO,QWORD PTR [IAT+ExAllocatePoolOffset] ; 7 bytes
    call EXAllocatePool
RetpolineOnly:
    mov RIO,QWORD PTR [IAT+ExAllocatePoolOffset] ; 7 bytes
        call _retpoline_import_rio ; Direct call (5 bytes)
```

FIGURE 8-10 Different indirect branches on the ExAllocatePool function.

Import optimization (internally also known as "import linking") is the feature that uses Reptroline

dynamic relocations to transform indirect calls targeting imported functions into direct branches. If

a direct branch is used to divert code execution to an imported function, there is no need to apply

Reptroline because direct branches are not vulnerable to speculation attacks. The NT kernel ap plies Import Optimization at the same time it applies Reptroline, and even though the two features

can be configured independently, they use the same DVRT entries to work correctly. With Import

Optimization, Windows has been able to gain a performance boost even on systems that are not vul nerable to Spectra v2. (A direct branch does not require any additional memory access.)

## STIBP pairing

In hyperthreaded systems, for protecting user-mode code against Spectre v2, the system should run user threads with at least STBP on. On nonhyperthreaded systems, this is not needed: protection against a previous user-mode thread speculation is already achieved thanks to the IBRS being enabled while previously executing kernel-mode code. In case Retpoline is enabled, the needed IBPR is emitted in the first kernel trap return executed after a cross-process thread switch. This ensures that the CPU branch prediction buffer is empty before executing the code of the user thread.

Leaving STIBP enabled in a hyper-threaded system has a performance penalty, so by default it is disabled for user-mode threads, leaving a thread to be potentially vulnerable by speculation from a sibling SMT thread. The end-user can manually enable STIBP for user threads through the

---

USER_STIP_ALWAYS feature setting (see the "Hardware Indirect Branch Controls" section previously

in this chapter for more details) or through the RESTRICT_INDIRECT_BRANCH_PREDICTION process

mitigation option.

The described scenario is not ideal. A better solution is implemented in the STIBP pairing mechanism. STIBP pairing is enabled by the I/O manager in phase 1 of the NT kernel initialization (using the KeOptimizeSpecCtrlSettings function) only under certain conditions. The system should have hyperthreading enabled, and the CPU should support IBRS and STIBP. Furthermore, STIBP pairing is compatible only on non-nested virtualized environments or when Hyper-V is disabled (refer to Chapter 9 for further details.)

In an STIBP pairing scenario, the system assigns to each process a security domain identifier (stored

in the EPROCESS data structure), which is represented by a 64-bit number. The system security domain

identifier (which equals 0) is assigned only to processes running under the System or a fully admin istrative token. Nonsense security domains are assigned at process creation time (by the internal

PsInitializeProcessSecurity function) following these rules:

- ■ If the new process is created without a new primary token explicitly assigned to it, it obtains the
same security domain of the parent process that creates it.
■ In case a new primary token is explicitly specified for the new process (by using the
CreateProcessAsUser or CreateProcessWithLogon APIs, for example), a new user security domain
ID is generated for the new process, starting from the internal PssNextSecurityDomain symbol.
The latter is incremented every time a new domain ID is generated (this ensures that during the
system lifetime, no security domains can collide).
■ Note that a new primary token can be also assigned using the NtSetInformationProcess API
(with the ProcessAccessToken information class) after the process has been initially created. For
the API to succeed, the process should have been created as suspended (no threads run in it). At
this stage, the process still has its original token in an unfrozen state. A new security domain is
assigned following the same rules described earlier.
Security domains can also be assigned manually to different processes belonging to the

same group. An application can replace the security domain of a process with another one

of a process belonging to the same group using the NtSetInformationProcess API with the

ProcessCombineSecurityDomainsInformation class. The API accepts two process handles and replaces

the security domain of the first process only if the two tokens are frozen, and the two processes can

open each other with the PROCESS_VM_WRITE and PROCESS_VM_OPERATION access rights.

Security domains allow the STIBP pairing mechanism to work. STIBP pairing links a logical proces sor (LP) with its sibling (both share the same physical core. In this section, we use the term LP and CPU

interchangeably). Two LPs are paired by the STIBP pairing algorithm (implemented in the internal

KillUpdateStibpPairing function) only when the security domain of the local CPU is the same as the one

of the remote CPU, or one of the two LPs is idle. In these cases, both the LPs can run without STIBP be ing set and still be implicitly protected against speculation (there is no advantage in attacking a sibling

CPU running in the same security context).

---

The STIBP pairing algorithm is implemented in the KLUpdateStibpPairing function and includes a full state machine. The routine is invoked by the trap exit handler (invoked when the system exits the kernel for executing a user-mode thread) only in case the pairing state stored in the CPU's PRCB is stale. The pairing state of an LP can become stale mainly for two reasons:

- ■ The NT scheduler has selected a new thread to be executed in the current CPU. If the new thread
security domain is different than the previous one, the CPU's PCRB pairing state is marked as stale.
This allows the STIBP pairing algorithm to re-evaluate the pairing state of the two.

■ When the sibling CPU exits from its idle state, it requests the remote CPU to re-evaluate its
STIBP pairing state.
Note that when an LP is running code with STIBP enabled, it is protected from the sibling CPU speculation. STIBP pairing has been developed based also on the opposite notion: when an LP executes with STIBP enabled, it is guaranteed that its sibling CPU is protected against itself. This implies that when a context switches to a different security domain, there is no need to interrupt the sibling CPU even though it is running user-mode code with STIBP disabled.

The described scenario is not true only when the scheduler selects a VP-dispatch thread (backing a virtual processor of a VM in case the Root scheduler is enabled; see Chapter 9 for further details) belonging to the VMMEM process. In this case, the system immediately sends an IP1 to the sibling thread for updating its STIBP pairing state. Indeed, a VP-dispatch thread runs guest-VM code, which can always decide to disable STIBP, moving the sibling thread in an unprotected state (both runs with STIBP disabled).

## EXPERIMENT: Querying system side-channel mitigation status

Windows exposes side-channel mitigation information through the SystemSpeculationControl

Information and SystemSecureSpeculationControlInformation information classes used by the

NIQuerySystemInformation native API. Multiple tools exist that interface with this API and show

to the end user the system side-channel mitigation status:

- ■ The SpeculationControl PowerShell script, developed by Matt Miller and officially
supported by Microsoft, which is open source and available at the following GitHub
repository: https://github.com/microsoft/SpeculationControl

■ The SpecuCheck tool, developed by Alex Ionescu (one of the authors of this book),
which is open source and available at the following GitHub repository:
https://github.com/ionescu007/SpecuCheck

■ The SkTool, developed by Andrea Alliivi (one of the authors of this book) and distributed
(at the time of this writing) in newer Insider releases of Windows.
All of the three tools yield more or less the same results. Only the SkTool is able to show the side-channel mitigations implemented in the Secure Kernel, though (the hypervisor and the Secure Kernel are described in detail in Chapter 9). In this experiment, you will understand which

---

mitigations have been enabled in your system. Download SpecuCheck and execute it by opening a command prompt window (type cmd in the Cortana search box). You should get output like the following:

SpecCheck v1.1.0 - (Copyright © 2018 Alex Ionescu) https://ioneşcu007.github.io/SpecuCheck - #ionale


1

```bash
Mitigations for CVE-2017-5754 [rogue data cache load]
-------------------------------------------------------------------
 [-] Kernel VA Shadowing Enabled:                     yes
   > Unnecessary due lack of CPU vulnerability:     no
   > With User Pages Marked Global:               no
   > With PCID Support:                              yes
   > With PCID Flushing Optimization (INVPCID):    yes
Mitigations for CVE-2018-3620 [L1 terminal fault]
[-] LIFT Mitigation Enabled:                     yes
   > Unnecessary due lack of CPU vulnerability:     no
   > CPU Microcode Supports Data Cache Flush:    yes
   > With KVA Shadow and Invalid PTE Bit:        yes
```

(The output has been trimmed for space reasons.)

You can also download the latest Windows Insider release and try the SkTool. When launched

with no command-line arguments, by default the tool displays the status of the hypervisor and

Secure Kernel. To show the status of all the side-channel mitigations, you should invoke the tool

with the /mitigations command-line argument:

```bash
Hypervisor / Secure Kernel / Secure Mitigations Parser Tool 1.0
Querying Speculation Features... Success!
    This system supports Secure Speculation Controls.
System Speculation Features.
    Enabled: 1
    Hardware support: 1
    IBRS Present: 1
    STIBP Present: 1
    SMEP Enabled: 1
    Speculative Store Bypass Disable (SSBD) Available: 1
    Speculative Store Bypass Disable (SSBB) Supported by OS: 1
    Branch Buffer Buffer (BBB) flushed on Kernel/User transition: 1
    Runtime Enabled: 1
    Import Optimization Enabled: 1
    SystemGuard (Secure Launch) Enabled: 0 (Capable: 0)
    SystemGuard SMM Protection (Intel) PPAM / AMD SMI monitor) Enabled: 0
Secure system Speculation Features.
    KVA Shadow supported: 1
    KVA Shadow enabled: 1
    KVA Shadow TLB flushing strategy: PCIDs
    Minimum IBPB Hardware support: 0
    IBRS Present: 0 (Enhanced IBRS: 0)
```

---

```bash
STIBP Present: 0
    SSBD Available: 0 (Required: 0)
    Branch Predictor Buffer (BPS) flushed on Kernel/User transition: 0
    Branch Predictor Buffer (BPB) flushed on User/Kernel and VTL 1 transition: 0
    LTF mitigation: 0
    Microarchitectural Buffers clearing: 1
```

## Trap dispatching

Interrupts and exceptions are operating system conditions that divert the processor to code outside

the normal flow of control. Either hardware or software can generate them. The term trap refers to a

processor's mechanism for capturing an executing thread when an exception or an interrupt occurs

and transferring control to a fixed location in the operating system. In Windows, the processor transfers

control to a trap handler, which is a function specific to a particular interrupt or exception. Figure 8-11

illustrates some of the conditions that activate trap handlers.

The kernel distinguishes between interrupts and exceptions in the following way. An interrupt is an asynchronous event (one that can occur at any time) that is typically unrelated to what the processor is executing. Interrupts are generated primarily by I/O devices, processor clocks, or timers, and they can be enabled (turned on) or disabled (turned off). An exception, in contrast, is a synchronous condition that usually results from the execution of a specific instruction. (Aborts, such as machine checks, are a type of processor exception that's typically not associated with instruction execution.) Both exceptions and aborts are sometimes called faults, such as when taking about a page fault or a double fault. Running a program for a second time with the same data under the same conditions can reproduce exceptions. Examples of exceptions include memory-access violations, certain debugger instructions, and divide-by-zero errors. The kernel also regards system service calls as exceptions (although technically they're system traps).

![Figure](figures/Winternals7thPt2_page_061_figure_004.png)

FIGURE 8-11 Trap dispatching.

30      CHAPTER 8    System mechanisms


---

Either hardware or software can generate exceptions and interrupts. For example, a bus error exception is caused by a hardware problem, whereas a divide-by-zero exception is the result of a software bug. Likewise, an I/O device can generate an interrupt, or the kernel itself can issue a software interrupt (such as an APC or DPC, both of which are described later in this chapter).

When a hardware exception or interrupt is generated, x86 and x64 processors first check whether the current Code Segment (CS) is in CPU 0 or below (i.e., if the current thread was running in kernel mode or user mode). In the case where the thread was already running in Ring 0, the processor saves (or pushes) on the current stack the following information, which represents a kernel-to-kernel transition.

- ■ The current processor flags (EFLAGS/RLAPS)
■ The current code segment (CS)
■ The current program counter (EIP/RIP)
■ Optionally, for certain kind of exceptions, an error code
In situations where the processor was actually running user-mode code in Ring 3, the processor first looks up the current TSS based on the Task Register (TR) and switches to the SSO/ESSO on x86 or simply RSP0 on x64, as described in the "Task state segments" section earlier in this chapter. Now that the processor is executing on the kernel stack, it saves the previous SS (the user-mode value) and the previous ESP (the user-mode stack) first and then saves the same data as during kernel-to-kernel transitions.

Saving this data has a twofold benefit. First, it records enough machine state on the kernel stack to return to the original point in the current thread's control flow and continue execution as if nothing had happened. Second, it allows the operating system to know (based on the saved CS value) where the trap came from—for example, to know if an exception came from user-mode code or from a kernel system call.

Because the processor saves only enough information to restore control flow, the rest of the machine state—including registers such as EAX, EBX, ECX, EDI, and so on is saved in a trap frame, a data structure allocated by Windows in the thread's kernel stack. The trap frame stores the execution state of the thread, and is a superset of a thread's complete context, with additional state information. You can view its definition by using the dt _nt!_KTRAP_FRAME command in the kernel debugger, or, alternatively, by downloading the Windows Driver Kit (WDK) and examining the NTDDK.H header file, which contains the definition with additional commentary. (Thread context is described in Chapter 5 of Part 1.) The kernel handles software interrupts either as part of hardware interrupt handling or synchronously when a thread invokes kernel functions related to the software interrupt.

In most cases, the kernel installs front-end, trap-handling functions that perform general traphandling tasks before and after transferring control to other functions that field the trap. For example, if the condition was a device interrupt, a kernel hardware interrupt trap handler transfers control to the interrupt service routine (ISR) that the device driver provided for the interrupting device. If the condition was caused by a call to a system service, the general system service trap handler transfers control to the specified system service function in the executive.

In unusual situations, the kernel can also receive traps or interrupts that it doesn't expect to see or handle. These are sometimes called spurious or unexpected traps. The trap handlers typically execute

CHAPTER 8    System mechanisms      31


---

the system function KeBugCheckEx, which halts the computer when the kernel detects problematic

or incorrect behavior that, if left unchecked, could result in data corruption. The following sections

describe interrupt, exception, and system service dispatching in greater detail.

## Interrupt dispatching

Hardware-generated interrupts typically originate from I/O devices that must notify the processor when they need service. Interrupt-driven devices allow the operating system to get the maximum use out of the processor by overlapping central processing with I/O operations. A thread starts an I/O transfer to or from a device and then can execute other useful work while the device completes the transfer. When the device is finished, it interrupts the processor for service. Pointing devices, printers, keyboards, disk drives, and network cards are generally interrupt driven.

System software can also generate interrupts. For example, the kernel can issue a software interrupt

to initiate thread dispatching and to break into the execution of a thread asynchronously. The kernel can

also disable interrupts so that the processor isn't interrupted, but it does so only infrequently—at critical

moments while it's programming an interrupt controller or dispatching an exception, for example.

The kernel installs interrupt trap handlers to respond to device interrupts. Interrupt trap handlers transfer control either to an external routine (the ISR) that handles the interrupt or to an internal kernel routine that responds to the interrupt. Device drivers supply ISRs to service device interrupts, and the kernel provides interrupt-handling routines for other types of interrupts.

In the following subsections, you'll find out how the hardware notifies the processor of device interrupts, the types of interrupts the kernel supports, how device drivers interact with the kernel (as a part of interrupt processing), and the software interrupts the kernel recognizes (plus the kernel objects that are used to implement them).

### Hardware interrupt processing

On the hardware platforms supported by Windows, external I/O interrupts come into one of the inputs

on an interrupt controller, for example an I/O Advanced Programmable Interrupt Controller (IOAPIC).

The controller, in turn, interrupts one or more processors' Local Advanced Programmable Interrupt

Controllers (LAPIC), which ultimately interrupt the processor on a single input line.

Once the processor is interrupted, it queries the controller to get the global system interrupt vector

(GSIV), which is sometimes represented as an interrupt request (IRQ) number. The interrupt controller

translates the GSIV to a processor interrupt vector, which is then used as an index into a data structure

called the interrupt dispatch table (IDT) that is stored in the CPU's IDT Register, or IDTR, which returns

the matching IDT entry for the interrupt vector.

Based on the information in the IDT entry, the processor can transfer control to an appropriate inter rupt dispatch routine running in Ring 0 (following the process described at the start of this section), or

it can even load a new TSS and update the Task Register (TR), using a process called an interrupt gate.

---

In the case of Windows, at system boot time, the kernel fills with pointers to both dedicated kernel and HAL routines called KilsrThunk, that handle external interrupts that third-party device drivers can register for. On x86 and x64-based processor architectures, the first 32 IDT entries, associated with interrupt vectors 0–31 are marked as reserved for processor traps, which are described in Table 8-3.

TABLE 8-3 Processor traps

<table><tr><td>Vector (Mnemonic)</td><td>Meaning</td></tr><tr><td>0 (#DE)</td><td>Divide error</td></tr><tr><td>1 (#DB)</td><td>Debug trap</td></tr><tr><td>2 (NMI)</td><td>Nonmaskable interrupt</td></tr><tr><td>3 (#BP)</td><td>Breakpoint trap</td></tr><tr><td>4 (#OF)</td><td>Overflow fault</td></tr><tr><td>5 (#BR)</td><td>Bound fault</td></tr><tr><td>6 (#UD)</td><td>Undefined opcode fault</td></tr><tr><td>7 (#NM)</td><td>FPU error</td></tr><tr><td>8 (#DF)</td><td>Double fault</td></tr><tr><td>9 (#MF)</td><td>Coprocessor fault (no longer used)</td></tr><tr><td>10 (#TS)</td><td>TSS fault</td></tr><tr><td>11 (#NP)</td><td>Segment fault</td></tr><tr><td>12 (#SS)</td><td>Stack fault</td></tr><tr><td>13 (#GP)</td><td>General protection fault</td></tr><tr><td>14 (#PF)</td><td>Page fault</td></tr><tr><td>15</td><td>Reserved</td></tr><tr><td>16 (#MF)</td><td>Floating point fault</td></tr><tr><td>17 (#AC)</td><td>Alignment check fault</td></tr><tr><td>18 (#MC)</td><td>Machine check abort</td></tr><tr><td>19 (#XM)</td><td>SIMD fault</td></tr><tr><td>20 (#VE)</td><td>Virtualization exception</td></tr><tr><td>21 (#CP)</td><td>Control protection exception</td></tr><tr><td>22-37</td><td>Reserved</td></tr></table>

The remainder of the IDT entries are based on a combination of hardcoded values (for example, vectors 30 to 34 are always used for Hyper-V-related VM/Bus interrupts) as well as negotiated values between the device drivers, hardware, interrupt controller(s), and platform software such as ACPI. For example, a keyboard controller might send interrupt vector 82 on one particular Windows system and 67 on a different one.

CHAPTER 8 System mechanisms 33


---

## EXPERIMENT: Viewing the 64-bit IDT

You can view the contents of the IDT, including information on what trap handlers Windows has assigned to interrupts (including exceptions and IRQs), using the !idt kernel debugger command. The !idt command with no flags shows simplified output that includes only registered hardware interrupts (and, on 64-bit machines, the processor trap handlers).

The following example shows what the output of the !idt command looks like on an x64 system:

```bash
0: kdt :!idt
Dumping IDT: ffff8f027074c000
00:       ffff8f026e1bc700 nt!KiDivideErrorFault
01:       ffff8f026e1bc0a0 nt!KiDebugTrapOfFault    Stack = 0xFFFF8f027076E000
02:       ffff8f026e1bc0c0 nt!KiNmiInterrupt        Stack = 0xFFFF8f027076A000
03:       ffff8f026e1bd80 nt!KiIiBreakpointTrap
04:       ffff8f026e1bd680 nt!KiIOverflowTrap
05:       ffff8f026e1bd980 nt!KiIiBoundFault
06:       ffff8f026e1dde80 nt!KiIiInvalidOpCodeFault
07:       ffff8f026e1de340 nt!KiINpxNotAvailableFault
08:       ffff8f026e1de600 nt!KiIiDoubleFaultAbort    Stack = 0xFFFF8f0270768000
09:       ffff8f026e1be8c0 nt!KiINpxSegmentNoRevertAbort
0a:       ffff8f026e1be880 nt!KiIiInvaliddllsfault
0b:       ffff8f026e1bee40 nt!KiISegmentNotPresentFault
0c:       ffff8f026e1bf1c0 nt!KiIi5StackFault
0d:       ffff8f026e1bf500 nt!KiIiGeneralProtectionFault
0e:       ffff8f026e1bf840 nt!KiIiPageFault
10:      ffff8f026e1bf680 nt!KiIiFloatingErrorFault
11:       ffff8f026e1c0200 nt!KiIiAligmen fault
12:       ffff8f026e1c0500 nt!KiIiMCheckAbort      Stack = 0xFFFF8f027076C000
13:       ffff8f026e1c0fc0 nt!KiIiXmmException
14:       ffff8f026e1c1380 nt!KiIiVirtualizationException
15:       ffff8f026e1c1840 nt!KiIiControlProtectionFault
1f:       ffff8f026e1b5f50 nt!KiIiApcInterrupt
20:       ffff8f026e1b7b00 nt!KiIiSwInterrupt
29:       ffff8f026e1c1d00 nt!KiIiRaiseSecurityCheckFailure
2c:       ffff8f026e1c2c400 nt!KiIiRaiseAssertion
2d:       ffff8f026e1c2380 nt!KiIiDebugServiceTrap
2f:       ffff8f026e1b80a0 nt!KiIiDpcInterrupt
30:       ffff8f026e1b6400 nt!KiIiHvInterrupt
31:       ffff8f026e1b6760 nt!KiIiVmibusInterrupt0
32:       ffff8f026e1b6a90 nt!KiIiVmibusInterrupt1
33:       ffff8f026e1b6d70 nt!KiIiVmibusInterrupt2
34:       ffff8f026e1b7050 nt!KiIiVmibusInterrupt3
35:       ffff8f026e1b4b50 ha!Hal!InterpUnterruptCmciservice (KINTERRUPT ffff8026ea59fe0)
b0:       ffff8f026e1b4e490 ACIPIACIInterruptServiceRoutine (KINTERRUPT ffff8b8062898dc0)
ce:       ffff8f026e1b4b80 ha!Hal!HimmoInterruptRoutine (KINTERRUPT ffff8f026ea5a9e0)
d1:       ffff8f026e1b4a99 ha!Hal!TimerClockInterrupt ffff8f026ea5ae0e0)
d2:       ffff8f026e1b4da0 ha!Hal!PimerClockIpiRoutine (KINTERRUPT ffff8f026aea5ae0e0)
d7:       ffff8f026e1b4dc3 ha!Hal!InterpInterruptReobService (KINTERRUPT ffff8f026ea5ae0e0)
d8:       ffff8f026e1b4d00 ha!Hal!InterpInterruptStubService (KINTERRUPT ffff8f026ea5ae2e0)
d9:       ffff8f026e1b4e48 ha!Hal!InterpInterruptSpuriousService (KINTERRUPT ffff8f026ea5ae1e0)
e1:       ffff8f026e1b570 nt!KiIiP1Interrupt
e2:       ffff8f026e1b4e20 ha!Hal!InterpInterruptLocalErrorService (KINTERRUPT ffff8f026ea5a3e0)
```

---

```bash
e3:       fFFFF8026e1b4e28  ha!Hal!PrinterInterruptDeferredRecoveryService
                          (KINTERRUPT ffff8026ea5a0b)
fd:        fFFFF8026e1b4e28  ha!Hal!PrinterProfileFileInterrupt (KINTERRUPT ffff8026ea5a8e0)
fe:        fFFFF8026e1b4f00  ha!Hal!PrinterInterrupt (KINTERRUPT ffff8026ea5a5e0)
```

On the system used to provide the output for this experiment, the ACPI SCI ISR is at interrupt

number 80h. You can also see that interrupt 14 (0Eh) corresponds to KiPageFault, which is a type

of predefined CPU trap, as explained earlier.

You can also note that some of the interrupts—specifically 1, 2, 8, and 12—have a Stack pointer next to them. These correspond to the traps explained in the section on “Task state segments” from earlier, which require dedicated safe kernel stacks for processing. The debugger knows these stack pointers by dumping the IDT entry, which you can do as well by using the dx command and dereferencing one of the interrupt vectors in the IDT. Although you can obtain the IDT from the processor’s IDTR, you can also obtain it from the kernel’s KPCR structure, which has a pointer to it in a field called IdtBase.

```bash
0: kds- dx 03pcr-1dBase[2].1stIndex
0: 03pcr-1dBase[2].1stIndex = 0x3 [Type: unsigned short]
0: dx ds 03pcr-1dBase[0x12].1stIndex
0: 03pcr-1dBase[0x12].1stIndex = 0x2 [Type: unsigned short]
```

If you compare the JDT Indexes seen here with the previous experiment on dumping the x64 TSS, you should find the matching kernel stack pointers associated with this experiment.

Each processor has a separate IDT (pointed to by their own IDTR) so that different processors can

run different ISRs, if appropriate. For example, in a multiprocessor system, each processor receives the

clock interrupt, but only one processor updates the system clock in response to this interrupt. All the

processors, however, use the interrupt to measure thread quantum and to initiate rescheduling when a

thread's quantum ends. Similarly, some system configurations might require that a particular processor

handle certain device interrupts.

## Programmable interrupt controller architecture

Traditional x86 systems relied on the i8259A Programmable Interrupt Controller (PIC), a standard that originated with the original IBM PC. The i8259A PIC worked only with uniprocessor systems and had only eight interrupt lines. However, the IBM PC architecture defined the addition of a second PIC, called the secondary, whose interrupts are multiplexed into one of the primary PIC's interrupt lines. This provided 15 total interrupts (7 on the primary and 8 on the secondary, multiplexed through the master's eighth interrupt line). Because PICs had such a quirky way of handling more than 8 devices, and because even 15 became a bottleneck, as well as due to various electrical issues (they were prone to spurious interrupts) and the limitations of uniprocessor support, modern systems eventually phased out this type of interrupt controller, replacing it with a variant called the i82489 Advanced Programmable Interrupt Controller (APIC).

Because APIs work with multiprocessor systems, Intel and other companies defined the Multiprocessor

Specification (MPS), a design standard for x86 multiprocessor systems that centered on the use of

CHAPTER 8 System mechanisms 35


---

APIC and the integration of both an I/O APIC (IOAPIC) connected to external hardware devices to a Local APIC (LAPIC), connected to the processor core. With time, the MPS standard was folded into the Advanced Configuration and Power Interface (ACPI)—a similar acronym to APIC by chance. To provide compatibility with uniprocessor operating systems and boot code that starts a multiprocessor system in uniprocessor mode, APIs C support a PIC compatibility mode with 15 interrupts and delivery of interrupts to only the primary processor. Figure 8-12 depicts the APIC architecture.

As mentioned, the APIC consists of several components: an I/O APIC that receives interrupts from devices, local APICs that receive interrupts from the I/O APIC on the bus and that interrupt the CPU they are associated with, and an i8259A-compatible interrupt controller that translates APIC input into PIC-equivalent signals. Because there can be multiple I/O APICs on the system, motherboard typically have a piece of core logic that sits between them and the processors. This logic is responsible for implementing interrupt routing algorithms that both balance the device interrupt load across processors and attempt to take advantage of locality, delivering device interrupts to the same processor that has just fielded a previous interrupt of the same type. Software programs can reprogram the I/O APICs with a fixed routing algorithm that bypasses this piece of chipset logic. In most cases, Windows will reprogram the I/O APIC with its own routing logic to support various features such as interrupt steering, but device drivers and firmware also have a say.

Because the x64 architecture is compatible with x86 operating systems, x64 systems must provide

the same interrupt controllers as the x86. A significant difference, however, is that the x64 versions of

Windows refused to run on systems that did not have an APIC because they use the APIC for inter rupt control, whereas x86 versions of Windows supported both PIC and APIC hardware. This changed

with Windows 8 and later versions, which only run on APIC hardware regardless of CPU architecture.

Another difference on x64 systems is that the APIC's Task Priority Register, or TPR, is now directly tied

to the processor's Control Register 8 (CRR). Modern operating systems, including Windows, now use

this register to store the current software interrupt priority level (in the case of Windows, called the

IRQI) and to inform the IOAPIC when it makes routing decisions. More information on IRQI handling

will follow shortly.

![Figure](figures/Winternals7thPt2_page_067_figure_003.png)

FIGURE 8-12 APIC architecture.

36      CHAPTER 8    System mechanisms


---

EXPERIMENT: Viewing the PIC and APIC

You can view the configuration of the PIC on a uniprocessor and the current local APIC on a multiprocessor by using the !pic and !apic kernel debugger commands, respectively. Here's the output of the !pic command on a uniprocessor. Note that even on a system with an APIC, this command still works because APIC systems always have an associated PIC-equivalent for emulating legacy hardware.

1kb! pic

----- IOU Number ----- 00 01 02 03 04 05 06 07 08 09 0A 08 0C 0D 0E 0F

Physically in service: Y . . . . . . . . . . Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y Y YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YY YYYY YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

---

The various numbers following the Vec labels indicate the associated vector in the IDT with

the given command. For example, in this output, interrupt number 0x1F is associated with the

Interrupt Processor Interrupt (PI) vector, and interrupt number 0xE2 handles APIC errors. Going

back to the lfdt output from the earlier experiment, you can notice that 0x1F is the kernel's APC

Interrupt (meaning that an IPI was recently used to send an APC from one processor to another),

and 0xE2 is the HAL's Local APIC Error Handler, as expected.

The following output is for the lioapic command, which displays the configuration of the I/O

APICs, the interrupt controller components connected to devices. For example, note how GSIV /

IRQ 9 (the System Control Interrupt, or SCI) is associated with vector B0h, which in the Iddt output

from the earlier experiment was associated with ACPI.SYS.

```bash
0: kd> :!toapic
Controller at 0xffff7a8c0000898 I/O APIC at VA 0xffff7a8c0012000
IoApic @ FEC00000 ID:8 (11) Arb:0
Int100:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int101:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int102:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int103:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int104:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int105:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high
Int106:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high m
Int107:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high m
Int108:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high m
Int109:: ff000000 000089b0 Vec:B0 LowestDL Lg:ff000000    lvl high
Int10A:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high m
Int10B:: 00000000 0001000ff Vec:FF FixedDel Ph:00000000   edg high m
```

## Software interrupt request levels (IRQs)

Although interrupt controllers perform interrupt prioritization, Windows imposes its own interrupt priority scheme known as interrupt request levels (IRQLs). The kernel represents IRQLs internally as a number from 0 through 31 on x86 and from 0 to 15 on x64 (ARM/ARM64), with higher numbers representing higher-priority interrupts. Although the kernel defines the standard set of IRQLs for software interrupts, the HAL maps hardware-interrupt numbers to the IRQLs. Figure 8-13 shows IRQLs defined for the x86 architecture and for the x64 (and ARM/ARM64) architecture.

Interrupts are serviced in priority order, and a higher-priority interrupt precepts the servicing of a lower-priority interrupt. When a high-priority interrupt occurs, the processor saves the interrupted thread's state and invokes the trap dispatchers associated with the interrupt. The trap dispatcher raises the IRQL and calls the interrupt's service routine. After the service routine executes, the interrupt dispatcher lowers the processor's IRQL to where it was before the interrupt occurred and then loads the saved machine state. The interrupted thread resumes executing where it left off. When the kernel lowers the IRQL, lower-priority interrupts that were masked might materialize. If this happens, the kernel repeats the process to handle the new interrupts.

---

![Figure](figures/Winternals7thPt2_page_070_figure_000.png)

FIGURE 8-13 x86 and x64 interrupt request levels (IRQLs).

IRQL priority levels have a completely different meaning than thread-scheduling priorities (which are described in Chapter 5 of Part 1). A scheduling priority is an attribute of a thread, whereas an IRQL is an attribute of an interrupt source, such as a keyboard or a mouse. In addition, each processor has an IRQL setting that changes as operating system code executes. As mentioned earlier, on x64 systems, the IRQL is stored in the CRB register that maps back to the TPR on the APIC.

Each processor's IRQL setting determines which interrupts that processor can receive. IRQLs are also used to synchronize access to kernel-mode data structures. (You'll find out more about synchronization later in this chapter.) As a kernel-mode thread runs, it raises or lowers the processor's IRQL directly by calling KeRaiseIrql and KeLowerIrql or, more commonly, indirectly via calls to functions that acquire kernel synchronization objects. As Figure 8-14 illustrates, interrupts from a source with an IRQL above the current level interrupt the processor, whereas interrupts from sources with IRQLs equal to or below the current level are masked until an executing thread lowers the IRQL.

![Figure](figures/Winternals7thPt2_page_070_figure_004.png)

FIGURE 8-14 Masking interrupts.

CHAPTER 8    System mechanisms      39


---

A kernel-mode thread raises and lowers the IRQL of the processor on which it's running, depending on what it's trying to do. For example, when an interrupt occurs, the trap handler (or perhaps the processor, depending on its architecture) raises the processor's IRQL to the assigned IRQL of the interrupt source. This elevation masks all interrupts at and below that IRQL (on that processor only), which ensures that the processor servicing the interrupt isn't waylayed by an interrupt at the same level or a lower level. The masked interrupts are either handled by another processor or held back until the IRQL drops. Therefore, all components of the system, including the kernel and device drivers, attempt to keep the IRQL at passive level (sometimes called low level). They do this because device drivers can respond to hardware interrupts in a timelier manner if the IRQL isn't kept unnecessarily elevated for long periods. Thus, when the system is not performing any interrupt work (or needs to synchronize with it) or handling a software interrupt such as a DPC or APC, the IRQL is always 0. This obviously includes any user-mode processing because allowing user-mode code to touch the IRQL would have significant effects on system operation. In fact, returning to a user-mode thread with the IRQL above 0 results in an immediate system crash (bugcheck) and is a serious driver bug.

Finally, note that dispatcher operations themselves—such as context switching from one thread to another due to preemption—run at IRQL 2 (hence the name dispatch level), meaning that the processor behaves in a single-threaded, cooperative fashion at this level and above. It is, for example, illegal to wait on a dispatcher object (more on this in the "Synchronization" section that follows) at this IRQL, as a context switch to a different thread (or the idle thread) would never occur. Another restriction is that only nonpaged memory can be accessed at IRQL DPC/dispatch level or higher.

This rule is actually a side effect of the first restriction because attempting to access memory that isn't resident results in a page fault. When a page fault occurs, the memory manager initiates a disk I/O and then needs to wait for the file system driver to read the page from disk. This wait would, in turn, require the scheduler to perform a context switch (perhaps to the idle thread if no user thread is waiting to run), thus violating the rule that the scheduler can't be invoked (because the IQL is still DPC/dispatch level or higher at the time of the disk read). A further problem results in the fact that I/O completion typically occurs at APC_LEVEL, so even in cases where a wait wouldn't be required, the I/O would never complete because the completion APC would not get a chance to run.

If either of these two restrictions is violated, the system crashes with an IRQL_NOT_LESS_OR_EQUAL or a DRIVER_IRQL_NOT_LESS_OR_EQUAL crash code. (See Chapter 10, "Management, diagnostics, and tracing" for a thorough discussion of system crashes.) Violating these restrictions is a common bug in device drivers. The Windows Driver Verifier has an option you can set to assist in finding this particular type of bug.

Conversely, this also means that when working at IRQL1 (also called APC level), preemption is still active and context switching can occur. This makes IRQL1 essentially behave as a thread-local IRQL instead of a processor-local IRQL, since a wait operation or preemption operation at IRQL1 will cause the scheduler to save the current IRQL in the thread's control block (in the KTHREAD structure, as seen in Chapter 5), and restore the processor's IRQL to that of the newly executed thread. This means that a thread at passive level (IRQL 0) can still preempt a thread running at APC level (IRQL 1), because below IRQL 2, the scheduler decides which thread controls the processor.

---

## EXPERIMENT: Viewing the IRQL

You can view a processor's saved IRQL with the firql debugger command. The saved IRQL represents the IRQL at the time just before the break-in to the debugger, which raises the IRQL to a static, meaningless value:

```bash
kdz /-rdr
Debugger saved IRQL for processor 0x0 -- 0 (LOW_LEVEL)
```

Note that the lRQL value is saved in two locations. The first, which represents the current lRQL, is the processor control region (PCR), whereas its extension, the processor region control block (PRCB), contains the saved lRQL in the DebuggerSavedlRQL field. This trick is used because using a remote kernel debugger will raise the lRQL to HIGH_LEVEL to stop any and all asynchronous processor operations while the user is debugging the machine, which would cause the output of !rnl to be meaningless. This "saved" value is thus used to indicate the lRQL right before the debugger is attached.

Each interrupt level has a specific purpose. For example, the kernel issues an interprocessor in terrupt (IPI) to request that another processor perform an action, such as dispatching a particular

thread for execution or updating its translation look-aside buffer (TLB) cache. The system clock

generates an interrupt at regular intervals, and the kernel responds by updating the clock and

measuring thread execution time. The HAL provides interrupt levels for use by interrupt-driven

devices; the exact number varies with the processor and system configuration. The kernel uses

software interrupts (described later in this chapter) to initiate thread scheduling and to asynchro nously break into a thread's execution.

### Mapping interrupt vectors to IRQLs

On systems without an APIC-based architecture, the mapping between the GSIV/IRQ and the IRQ had to be strict. To avoid situations where the interrupt controller might think an interrupt line is of higher priority than another, when in Windows's world, the IRQs reflected an opposite situation. Thankfully, with APICS, Windows can easily expose the IRQ as part of the APIC's TPR, which in turn can be used by the APIC to make better delivery decisions. Further, on APIC systems, the priority of each hardware interrupt is not tied to its GSIV/IRQ, but rather to the interrupt vector: the upper 4 bits of the vector map back to the priority. Since the IDT can have up to 256 entries, this gives a space of 16 possible priorities (for example, vector 0x40 would be priority 4), which are the same 16 numbers that the TPR can hold, which map back to the same 16 IRQs that Windows implements!

Therefore, for Windows to determine what IRQL to assign to an interrupt, it must first determine the appropriate interrupt vector for the interrupt, and program the IOAPIC to use that vector for the associated hardware GSV. Or, conversely, if a specific IRQL is needed for a hardware device, Windows must choose an interrupt vector that maps back to that priority. These decisions are performed by the Plug and Play manager working in concert with a type of device driver called a bus driver, which determines the presence of devices on its bus (PCI, USB, and so on) and what interrupts can be assigned to a device.

CHAPTER 8    System mechanisms      41


---

The bus driver reports this information to the Plug and Play manager, which decides—after taking into account the acceptable interrupt assignments for all other devices—which interrupt will be assigned to each device. Then it calls a Plug and Play interrupt arbiter, which maps interrupts to IRQLs. This arbiter is exposed by the HAL, which also works with the ACPI bus driver and the PCI bus driver to collectively determine the appropriate mapping. In most cases, the ultimate vector number is selected in a roundrobin fashion, so there is no computable way to figure it out ahead of time. However, an experiment later in this section shows how the debugger can query this information from the interrupt arbiter.

Outside of arbitered interrupt vectors associated with hardware interrupts, Windows also has a number of predefined interrupt vectors that are always at the same index in the IDT, which are defined in Table 8-4.

TABLE 8-4 Predefined interrupt vectors

<table><tr><td>Vector</td><td>Usage</td></tr><tr><td>0x1F</td><td>AFC interrupt</td></tr><tr><td>0x2F</td><td>DPC interrupt</td></tr><tr><td>0x30</td><td>Hypervisor interrupt</td></tr><tr><td>0x31-0x34</td><td>VMBus interrupt(s)</td></tr><tr><td>0x35</td><td>CMCI interrupt</td></tr><tr><td>0xCD</td><td>Thermal interrupt</td></tr><tr><td>0xCE</td><td>IOMMU interrupt</td></tr><tr><td>0xCF</td><td>DMA interrupt</td></tr><tr><td>0xD1</td><td>Clock timer interrupt</td></tr><tr><td>0xD2</td><td>Clock IPI interrupt</td></tr><tr><td>0xD3</td><td>Clock always on interrupt</td></tr><tr><td>0xD7</td><td>Reboot interrupt</td></tr><tr><td>0xD8</td><td>Stub interrupt</td></tr><tr><td>0xD9</td><td>Test interrupt</td></tr><tr><td>0xDF</td><td>Spurious interrupt</td></tr><tr><td>0xE1</td><td>IPI interrupt</td></tr><tr><td>0xE2</td><td>LAPIC error interrupt</td></tr><tr><td>0xE3</td><td>DRS interrupt</td></tr><tr><td>0xF0</td><td>Watchdog interrupt</td></tr><tr><td>0xFB</td><td>Hypervisor HFIET interrupt</td></tr><tr><td>0xFD</td><td>Profile interrupt</td></tr><tr><td>0xFE</td><td>Performance interrupt</td></tr></table>


You'll note that the vector number's parity (recall that this is stored in the upper 4 bits, or nible) typically matches the IRQLs shown in the Figure 8-14—for example, the APC interrupt is the DPC

42      CHAPTER 8    System mechanisms


---

interrupt is 2, while the IPI interrupt is 14, and the profile interrupt is 15. On this topic, let's see what the

predicted IRQLs are on a modern Windows system.

## Predefined IRQLs

Let's take a closer look at the use of the predefined IRQLs, starting from the highest level shown in Figure 8-13:

- ■ The kernel typically uses high level only when it's halting the system in KeBugCheckEx and mask-
ing out all interrupts or when a remote kernel debugger is attached. The profile level shares the
same value on non-x86 systems, which is where the profile timer runs when this functionality is
enabled. The performance interrupt, associated with such features as Intel Processor Trace (Intel
PT) and other hardware performance monitoring unit (PMU) capabilities, also runs at this level.
■ Interprocessor interrupt level is used to request another processor to perform an action, such
as updating the processor's TLB cache or modifying a control register on all processors. The
Deferred Recovery Service (DRS) level also shares the same value and is used on x64 systems
by the Windows Hardware Error Architecture (WHEA) for performing recovery from certain
Machine Check Errors (MCE).
■ Clock level is used for the system's clock, which the kernel uses to track the time of day as well as
to measure and allot CPU time to threads.
■ The synchronization IRQL is internally used by the dispatcher and scheduler code to protect
access to global thread scheduling and wait/synchronization code. It is typically defined as the
highest level right after the device IRQLs.
■ The device IRQLs are used to prioritize device interrupts. (See the previous section for how hard-
ware interrupt levels are mapped to IRQLs.)
■ The corrected machine check interrupt level is used to signal the operating system after a serious
but corrected hardware condition or error that was reported by the CPU or firmware through
the Machine Check Error (MCE) interface.
■ DPC/dispatch-level and APC-level interrupts are software interrupts that the kernel and device
drivers generate. (DPCs and APCs are explained in more detail later in this chapter.)
■ The lowest IRQL passive level, isn't really an interrupt level at all; it's the setting at which normal
thread execution takes place and all interrupts can occur.
## Interrupt objects

The kernel provides a portable mechanism—a kernel control object called an interrupt object, or

KINTERRUPT—that allows device drivers to register ISRs for their devices. An interrupt object contains

all the information the kernel needs to associate a device ISR with a particular hardware interrupt,

including the address of the ISR, the polarity and trigger mode of the interrupt, the IRQL at which the

device interrupts, sharing state, the GSIV and other interrupt controller data, as well as a host of perfor mance statistics.

---

These interrupt objects are allocated from a common pool of memory, and when a device driver registers an interrupt (with IoConnectInterrupt or IoConnectInterruptEx), one is initialized with all the necessary information. Based on the number of processors eligible to receive the interrupt (which is indicated by the device driver when specifying the interrupt affinity), a KINTERRUPT object is allocated for each one—in the typical case, this means for every processor on the machine. Next, once an interrupt vector has been selected, an array in the KPRCB (called InterruptObject ) of each eligible processor is updated to point to the allocated KINTERRUPT object that’s specific to it.

As the KINTERRUPT is allocated, a check is made to validate whether the chosen interrupt vector is a

shareable vector, and if so, whether an existing KINTERRUPT has already claimed the vector. If yes, the

kernel updates the DispatchAddress field (of the KINTERRUPT data structure) to point to the function

KiChainedDispatch and adds this KINTERRUPT to a linked list (InterruptListEntry) contained in the first

existing KINTERRUPT already associated with the vector. If this is an exclusive vector, on the other hand,

then KiInterruptDispatch is used instead.

The interrupt object also stores the IRQ associated with the interrupt so that KillinterruptDispatch or

KiChainedDispatch can raise the IRQ to the correct level before calling the ISR and then lower the IRQ

after the ISR has returned. This two-step process is required because there's no way to pass a pointer

to the interrupt object (or any other argument for that matter) on the initial dispatch because the initial

dispatch is done by hardware.

When an interrupt occurs, the IDT points to one of 256 copies of the KIldrThunk function, each one

having a different line of assembly code that pushes the interrupt vector on the kernel stack (because

this is not provided by the processor) and then calling a shared KIldrLinkage function, which does the

rest of the processing. Among other things, the function builds an appropriate trap frame as explained

previously, and eventually calls the dispatch address stored in the KINTERRUPT (one of the two func tions above). It finds the KINTERRUPT by reading the current KPCRB's InterruptObject array and using

the interrupt vector on the stack as an index, dereferencing the matching pointer. On the other hand,

if a KINTERRUPT is not present, then this interrupt is treated as an unexpected interrupt. Based on the

value of the registry value BugCheckUnexpectedInterrupts in the HKLM\SYSTEM\CurrentControlSet\ Control\Session Manager\Kernel key, the system might either crash with KeBugCheckEx, or the inter rupt is silently ignored, and execution is restored back to the original control point.

On x64 Windows systems, the kernel optimizes interrupt dispatch by using specific routines that

save processor cycles by omitting functionality that isn't needed, such as K!interruptDispatchNoLock,

which is used for interrupts that do not have an associated kernel-managed spinlock (typically used by

drivers that want to synchronize with their ISRs), K!interruptDispatchNoLockNoEtw for interrupts that do

not want ETW performance tracing, and K!spuriousDispatchNoEIOI for interrupts that are not required

to send an end-of-interrupt signal since they are spurious.

Finally, K!InterruptDispatchNoEOI, which is used for interrupts that have programmed the APIC in Auto-End-of-Interrupt (Auto-EOI) mode—because the interrupt controller will send the EOI signal automatically, the kernel does not need the extra code to perform the EOI itself. For example, many HAL interrupt routines take advantage of the "no-lock" dispatch code because the HAL does not require the kernel to synchronize with its ISR.

---

Another kernel interrupt handler is KifFloatingDispatch, which is used for interrupts that require saving the floating-point state. Unlike kernel-mode code, which typically is not allowed to use floatingpoint (MMX, SSE, 3DNow!) operations because these registers won't be saved across context switches, ISRs might need to use these registers (such as the video card ISR performing a quick drawing operation). When connecting an interrupt, drivers can set the FloatingSave argument to TRUE, requesting that the kernel use the floating-point dispatch routine, which will save the floating registers. (However, this greatly increases interrupt latency.) Note that this is supported only on 32-bit systems.

Regardless of which dispatch routine is used, ultimately a call to the ServiceRoutine field in the

KINTERRUPT will be made, which is where the driver's ISR is stored. Alternatively, for message signaled

interrupts (MSI), which are explained later, this is a pointer to KInterruptMessageDispatch, which will

then call the MessageServiceRoutine pointer in KINTERRUPT instead. Note that in some cases, such as

when dealing with Kernel Mode Driver Framework (KMDF) drivers, or certain miniport drivers such as

those based on NDIS or StorPort (more on driver frameworks is explained in Chapter 6 of Part 1, "I/O

system"), these routines might be specific to the framework and/or port driver, which will do further

processing before calling the final underlying driver.

Figure 8-15 shows typical interrupt control flow for interrupts associated with interrupt objects.

![Figure](figures/Winternals7thPt2_page_076_figure_003.png)

FIGURE 8-15 Typical interrupt control flow.

CHAPTER 8 System mechanisms 45


---

Associating an ISR with a particular level of interrupt is called connecting an interrupt object, and dissociating an ISR from an IDT entry is called disconnecting an interrupt object. These operations, accomplished by calling the kernel functions IoConnectInterruptEx and IoDisconnectInterruptEx, allow a device driver to "turn on" an ISR when the driver is loaded into the system and to "turn off" the ISR if the driver is unloaded.

As was shown earlier, using the interrupt object to register an ISR prevents device drivers from fidding directly with interrupt hardware (which differs among processor architectures) and from needing to know any details about the IDT. This kernel feature aids in creating portable device drivers because it eliminates the need to code in assembly language or to reflect processor differences in device drivers. Interrupt objects provide other benefits as well. By using the interrupt object, the kernel can synchronize the execution of the ISR with other parts of a device driver that might share data with the ISR. (See Chapter 6 in Part 1 for more information about how device drivers respond to interrupts.)

We also described the concept of a chained dispatch, which allows the kernel to easily call more than one ISR for any interrupt level. If multiple device drivers create interrupt objects and connect them to the same IDT entry, the KiChainedDispatch routine calls each ISR when an interrupt occurs at the specified interrupt line. This capability allows the kernel to easily support daisy-chain configurations, in which several devices share the same interrupt line. The chain breaks when one of the ISRs claims ownership for the interrupt by returning a status to the interrupt dispatcher.

If multiple devices sharing the same interrupt require service at the same time, devices not acknowledged by their ISRs will interrupt the system again once the interrupt dispatcher has lowered the IRQL.

Chaining is permitted only if all the device drivers wanting to use the same interrupt indicate to the ker nel that they can share the interrupt (indicated by the ShareVector field in the KINTERRUPT object); if

they can't, the Plug and Play manager reorganizes their interrupt assignments to ensure that it honors

the sharing requirements of each.

## EXPERIMENT: Examining interrupt internals

Using the kernel debugger, you can view details of an interrupt object, including its IRQ, ISR address, and custom interrupt-dispatching code. First, execute the !idt debugger command and check whether you can locate an entry that includes a reference to 18042KeyboardInterruptService, the ISR routine for the PS2 keyboard device. Alternatively, you can look for entries pointing to

Storvme.sys or Scrispt.sys or any other third-party driver you recognize. In a Hyper-V virtual machine, you may simply want to use the Aci.py.sys entry. Here's a system with a PS2 keyboard device entry:

```bash
70:      fffff8045675a600 i8042prt!I8042KeyboardInterruptService (KINTERRUPT ffff8e01cb3b280)
```

To view the contents of the interrupt object associated with the interrupt, you can simply click

on the link that the debugger offers, which uses the dt command, or you can manually use the

dx command as well. Here's the KINTERRUPT from the machine used in the experiment:

```bash
6: kd> dt nt!_KINTERRUPT ffff8e01ceb3280
    +0x000 Type        : On22
    +0x002 Size       : On256
    -0x008 InterruptListEntry : _LIST_ENTRY | 000000000'00000000 - 0x00000000'00000000
```

---

+0x08 ServiceRoutine : 0xffff804'65e56820 unsigned char i8042Prt!8042KeyboardInterruptService

+0x020 MessageServiceRoutine : (null)

+0x028 MessageIndex : 0

+0x030 ServiceContext : 0xfffffe50F'9dfe9040 Void

+0x038 SpinLock : 0

+0x040 TickCount : 0

+0x048 Actuallock : 0xfffffe50F'9dfe91a0 > 0

+0x050 DispatchAddress : 0xfffffe50F'565ca320 void nt!KiInterruptDispatch+0

+0x058 Vector : 0x70

+0x05c Irgl : 0x7 ''

+0x05d SynchronizeIrql : 0x7 ''

+0x05e FloatingSave : 0 ''

+0x05f Connected : 0x1 ''

+0x060 Number : 6

+0x064 ShareVector : 0 ''

+0x065 emulateActiveBoth : 0 ''

+0x066 ActiveCount : 0

+0x068 InternalState : 0m4

+0x06c Mode : 1 ( Latched )

+0x070 Polarity : 0 ( InterruptPolarityUnknown )

+0x074 ServiceCount : 0

+0x078 DispatchCount : 0

+0x080 PassiveEvent : (null)

+0x088 TrapFrame : (null)

+0x090 DisconnectData : (null)

+0x098 ServiceThread : (null)

+0x0a0 ConnectionData : 0xfffffe50F'9db3bd90 INTERRUPT_CONNECTION_DATA

+0x0a8 IntrackEntry : 0xfffffe50F'9dd91d90 Void

+0x0bf IsrDpcStats : _1SRDPCTSATs

+0x0f0 RedirectObject : (null)

+0x0f8 Padding : 0x8 '"

In this example, the IRQL that Windows assigned to the interrupt is 7, which matches the fact that the interrupt vector is 0x70 (and hence the upper 4 bits are 7). Furthermore, you can see from the DispatchAddress field that this is a regular KInterruptDispatch-style interrupt with no additional optimizations or sharing.

If you wanted to see which GSIV (IRQ) was associated with the interrupt, there are two ways in which you can obtain this data. First, recent versions of Windows now store this data as an INSTALL_CONNECTION_DATA structure embedded in the ConnectionData field of the INSTALLATION, shown in the preceding output. You can use the dt command to dump the pointer from your system as follows:

6: kd> dt 0xfffffe50f'9db3bd90 __INTERRUPT_CONNECTION_DATA_Vectors[0]..

nt!__INSTALL_CONNECTION_DATA

+0x008 Vectors : 0[]

+0x000 Type : 0 ( InterruptTypeControllerInput )

+0x004 Vector : 0x70

+0x008 Irgl : 0x7 ''

+0x008 Polarity : 1 ( InterruptActiveHigh )

+0x00c Polarity : 1 ( Latched )

+0x010 Mode : 1 ( Latched )

+0x018 TargetProcessors :

CHAPTER 8 System mechanisms 47



---

```bash
+0x000 Mask        : 0xff
  +0x008 Group        : 0
  +0x00a Reserved      : {3} 0
+0x028 IntRemapInfo :
  +0x000 IrtIndex   : 0y0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

The Type indicates that this is a traditional line/controller-based input, and the Vector and Irf1 fields confirm earlier data seen in the KINTERRUPT already. Next, by looking at the ControllerInput structure, you can see that the GSIV is 1 (i.e., IRQ 1). If you'd been looking at a different kind of interrupt, such as a Message Signed Interrupt (more on this later), you would deference the MessageRequest field instead, for example.

Another way to map GSIV to interrupt vectors is to recall that Windows keeps track of this

translation when managing device resources through what are called arbiters. For each resource

type, an arbiter maintains the relationship between virtual resource usage (such as an interrupt

vector) and physical resources (such as an interrupt line). As such, you can query the ACPI IRQ

arbiter and obtain this mapping. Use the !apcirqarb command to obtain information on the

ACPI IRQ arbiter:

```bash
6: kd> !acpiirqarb
Processor 0 (0, 0):
Device Object: 0000000000000000
Current IDT Allocation:
...
   000000070 - 00000070  D  ffffe50f9959baf0 (i8042prt) A:ffffffffce0717950280 IRQ(GSIV):1
```

Note that the GSIV for the keyboard is IRQ 1, which is a legacy number from back in the IBM PC/AT days that has persisted to this day. You can also use larbiter 4 (4 tells the debugger to display only IRQ arbiters) to see the specific entry underneath the ACPI IRQ arbiter:

```bash
6: kd> |arbiter 4
DEVNODE ffffe50f97445c70 (ACPI_HAL\PNPOC08\0)
        Interrupt Arbiter "ACPI_IIRQ" at ffff#804575415a0
        Allocated ranges:
            0000000000000000 - 0000000000000000 - ffff50f9959baf0 (i8042prt)
```

In this case, note that the range represents the GSIV (IRQ), not the interrupt vector. Further, note that in either output, you are given the owner of the vector, in the type of a device object (in this case, 0xFFFF5F0959BAF0). You can then use the devobj command to get information on the i8042prt device in this example (which corresponds to the PS/2 driver):

```bash
6: kd <- 1DevObj 0FFFFFE0F8995BA0
dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <- 1dev <-
```

---

```bash
Current Irp 00000000 Refcount 1 Type 00000032 Flags 00001040
SecurityDescriptor ffffce7011e8ef3e0 DevExt ffffce5f9f95573f0 DevObjExt ffffce5f9f959bc40
DevNode ffffce5f9f959e670
ExtensionFlags (0x00000000) DOE_DEFAULT_SD_PRESENT
TransactionList(1 0000000080) FILE_AUTogenerated_DEVICE_NAME
AttachedDevice(1 0000000080) <driver>8042prt
Device queue is not busy.
```

The device object is associated to a device node, which stores all the device's physical resources. You can now dump these resources with the !devnode command, and using the 0xF flag to ask for both raw and translated resource information:

```bash
6: kd -!devnode ffffe50f9595e670 f
DevNode 0xfffffe50f9595e670 for PDD 0xfffffe50f9595baf0
  InstancePath is "ACPI\LEN0071\4836899b7b50"
  ServiceName is "8042prt"
  TargetDeviceNotify List - f 0xfffffe0717307b20 - b 0xfffffe0717307b20
  State = DeviceNodeStarted (0x308)
  Previous State = DeviceNodeEnumerateCompletion (0x30d)
  CmResourceList at 0xfffffe0713518330 Version 1.1 Interface 0xf Bus #0
  Entry 0 - Port (0x1) Device Exclusive (0x1)
    Flags (PORT_MEMORY PORT_IO_16_BIT decode
    Range starts at 0x60 for 0x1 bytes
    Entry 1 - Port (0x1) Device Exclusive (0x1)
    Flags (PORT_MEMORY PORT_IO_16_BIT decode
    Range starts at 0x64 for 0x1 bytes
    Entry 2 - Interrupt (0x2) Device Exclusive (0x1)
    Flags (LATCHED
    Level 0x1, Vector 0x1, Group 0, Affinity 0xffffffff
...
  TranslatedResourceList at 0xfffffe0713517bb0 Version 1.1 Interface 0xf Bus #0
    Entry 0 - Port (0x1) Device Exclusive (0x1)
    Flags (PORT_MEMORY PORT_IO_16_BIT decode
    Range starts at 0x60 for 0x1 bytes
    Entry 1 - Port (0x1) Device Exclusive (0x1)
    Flags (PORT_MEMORY PORT_IO_16_BIT decode
    Range starts at 0x64 for 0x1 bytes
    Entry 2 - Interrupt (0x2) Device Exclusive (0x1)
    Flags (LATCHED
    Level 0x7, Vector 0x70, Group 0, Affinity 0xff
```

The device node tells you that this device has a resource list with three entries, one of which

is an interrupt entry corresponding to IRQ 1. (The level and vector numbers represent the GSIV

rather than the interrupt vector.) Further down, the translated resource list now indicates the

IRQ0 as 7 (this is the level number) and the interrupt vector as 0x70.

On ACPI systems, you can also obtain this information in a slightly easier way by reading the

extended output of the lacpiirqarb command introduced earlier. As part of its output, it displays

the IRQ to IDT mapping table:

```bash
Interrupt Controller (Inputs: 0x0-0x77):
    (01)Cur+ID-70 Ref-1 Boot-0 edg hi   Pos:IDT-00 Ref-0 Boot-0 lev unk
    (02)Cur+ID-80 Ref-1 Boot-1 edg hi   Pos:IDT-00 Ref-0 Boot-1 lev unk
    (03)Cur+ID-90 Ref-1 Boot-0 edg hi   Pos:IDT-00 Ref-0 Boot-0 lev unk
```

CHAPTER 8 System mechanisms      49


---

```bash
(00)Sur-IDT-b0 Ref-1 Boot-0 10v hi    Pos:IDT-00 Ref-0 Boot-0 10v unk
(0e)Sur-IDT-a0 Ref-1 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(10)Sur-IDT-b5 Ref-2 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(11)Sur-IDT-a5 Ref-1 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(12)Sur-IDT-95 Ref-1 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(13)Sur-IDT-b5 Ref-2 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(14)Sur-IDT-a5 Ref-1 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(1f)Sur-IDT-a6 Ref-1 Boot-0 10v low    Pos:IDT-00 Ref-0 Boot-0 10v unk
(1h)Sur-IDT-a96 Ref-1 Boot-0 10v edg hi    Pos:IDT-00 Ref-0 Boot-0 10v unk
```

As expected, IRQ is associated with IDT entry 0x70. For more information on device objects, resources, and other related concepts, see Chapter 6 in Part 1.

## Line-based versus message signaled-based interrupts

Shared interrupts are often the cause of high interrupt latency and can also cause stability issues. They are typically undesirable and a side effect of the limited number of physical interrupt lines on a computer. For example, in the case of a 4-in-1 media card reader that can handle USB, Compact Flash, Sony Memory Stick, Secure Digital, and other formats, all the controllers that are part of the same physical device would typically be connected to a single interrupt line, which is then configured by the different device drivers as a shared interrupt vector. This adds latency as each one is called in a sequence to determine the actual controller that is sending the interrupt for the media device.

A much better solution is for each device controller to have its own interrupt and for one driver to manage the different interrupts, knowing which device they came from. However, consuming four traditional IRQ lines for a single device quickly leads to IRQ line exhaustion. Additionally, PCI devices are each connected to only one IRQ line anyway, so the media card reader cannot use more than one IRQ in the first place even if it wanted to.

Other problems with generating interrupts through an IRQ line is that incorrect management of the IRQ signal can lead to interrupt storms or other kinds of deadlocks on the machine because the signal is driven “high” or “low” until the ISR acknowledges it. (Furthermore, the interrupt controller must typically receive an EOI signal as well); If either of these does not happen due to a bug, the system can end up in an interrupt state forever, further interrupts could be masked away, or both. Finally, line-based interrupts provide poor scalability in multiprocessor environments. In many cases, the hardware has the final decision as to which processor will be interrupted out of the possible set that the Plug and Play manager selected for this interrupt, and device drivers can do little about it.

A solution to all these problems was first introduced in the PCI 2.2 standard called message-signaled

interrupts (MSI). Although it was an optional component of the standard that was seldom found in

client machines (and mostly found on servers for network card and storage controller performance),

most modern systems, thanks to PCI Express 3.0 and later, fully embrace this model. In the MSI world, a

device delivers a message to its driver by writing to a specific memory address over the PCI bus; in fact,

this is essentially treated like a Direct Memory Access (DMA) operation as far as hardware is concerned.

This action causes an interrupt, and Windows then calls the ISR with the message content (value) and

---

the address where the message was delivered. A device can also deliver multiple messages (up to 32) to the memory address, delivering different payloads based on the event.

For even more performance and latency-sensitive systems, MSI-X, an extension to the MSI model, which is introduced in PCI 3.0, adds support for 32-bit messages (instead of 16-bit), a maximum of 2048 different messages (instead of just 32), and more importantly, the ability to use a different address (which can be dynamically determined) for each of the MSI payloads. Using a different address allows the MSI payload to be written to a different physical address range that belongs to a different processor, or a different set of target processors, effectively enabling nonuniform memory access (NUMA)aware interrupt delivery by sending the interrupt to the processor that initiated the related device request. This improves latency and scalability by monitoring both load and the closest NUMA node during interrupt completion.

In either model, because communication is based across a memory value, and because the content

is delivered with the interrupt, the need for IRQ lines is removed (making the total system limit of MSIs

equal to the number of interrupt vectors, not IRQ lines), as is the need for a driver ISR to query the

device for data related to the interrupt, decreasing latency. Due to the large number of device inter rupts available through this model, this effectively nullifies any benefit of sharing interrupts, decreasing

latency further by directly delivering the interrupt data to the concerned ISR.

This is also one of the reasons why you've seen this text, as well as most of the debugger commands, utilize the term "GSIV" instead of IRQ because it more generically describes an MSI vector (which is identified by a negative number), a traditional IRQ-based line, or even a General Purpose Input Output (GPIO) pin on an embedded device. And, additionally, on ARM and ARM64 systems, neither of these models are used, and a Generic Interrupt Controller, or GIC, architecture is leveraged instead. In Figure 8-16, you can see the Device Manager on two computer systems showing both traditional IRQ-based GSIV assignments, as well as MSI values, which are negative.

![Figure](figures/Winternals7thPt2_page_082_figure_004.png)

FIGURE 8-16 IRQ and MSI-based GSIV assignment.

CHAPTER 8    System mechanisms      51


---

## Interrupt steering

On client (that is, excluding Server SKUs) systems that are not running virtualized, and which have between 2 and 16 processors in a single processor group, Windows enables a piece of functionality called interrupt steering to help with power and latency needs on modern consumer systems. Thanks to this feature, interrupt load can be spread across processors as needed to avoid bottlenecking a single CPU, and the core parking engine, which was described in Chapter 6 of Part 1, can also steer interrupts away from parked cores to avoid interrupt distribution from keeping too many processors awake at the same time.

Interrupt steering capabilities are dependent on interrupt controllers—for example, on ARM systems with a GIC, both level-sensitive and edge (latched) triggered interrupts can be steered, whereas on APIC systems (unless running under Hyper-V), only level-sensitive interrupts can be steered. Unfortunately, because MSIs are always level edge-triggered, this would reduce the benefits of the technology, which is why Windows also implements an additional interrupt redirection model to handle these situations.

When steering is enabled, the interrupt controller is simply reprogrammed to deliver the GSIV to a different processor's LAPIC (or equivalent in the ARM GIC world). When redirection must be used, then all processors are delivery targets for the GSIV, and whichever processor received the interrupt manually issues an IPI to the target processor to which the interrupt should be stored toward.

Outside of the core parking engine's use of interrupt steering, Windows also exposes the functionality through a system information class that is handled by KeInTSteerAssignCpuSetForGsv as part of the Real-Time Audio capabilities of Windows 10 and the CPU Set feature that was described in the "Thread scheduling" section in Chapter 4 of Part 1. This allows a particular GSIV to be steered to a specific group of processors that can be chosen by the user-mode application, as long as it has the Increase Base Priority privilege, which is normally only granted to administrators or local service accounts.

## Interrupt affinity and priority

Windows enables driver developers and administrators to somewhat control the processor affinity (selecting the processor or group of processors that receives the interrupt) and affinity policy (selecting how processors will be chosen and which processors in a group will be chosen). Furthermore, it enables a primitive mechanism of interrupt prioritization based on IRQL selection. Affinity policy is defined according to Table 8-5, and it's configurable through a registry value called InterruptPolicyValue in the Interrupt Management/Affinity Policy key under the device's instance key in the registry. Because of this, it does not require any code to configure--an administrator can add this value to a given driver's key to influence its behavior. Interrupt affinity is documented on Microsoft Docs at https://docs. microsoft.com/en-us/windows-hardware/drivers/kernel/interrupt-affinity-and-priority.

---

TABLE 8-5 IRQ affinity policies

<table><tr><td>Policy</td><td>Meaning</td></tr><tr><td>IrqPolicyMachineDefault</td><td>The device does not require a particular affinity policy. Windows uses the default machine policy, which (for machines with less than eight logical processors) is to select any available processor on the machine.</td></tr><tr><td>IrqPolicyAllCloseProcessors</td><td>On a NUMA machine, the Plug and Play manager assigns the interrupt to all the processors that are close to the device (on the same node). On non-NUMA machines, this is the same as IqrPolicyAllProcessorsInMachine.</td></tr><tr><td>IqrPolicyOneCloseProcessor</td><td>On a NUMA machine, the Plug and Play manager assigns the interrupt to one processor that is close to the device (on the same node). On non-NUMA machines, the chosen processor will be any available processor on the system.</td></tr><tr><td>IqrPolicyAllProcessorsInMachine</td><td>The interrupt is processed by any available processor on the machine.</td></tr><tr><td>IqrPolicySpecifiedProcessors</td><td>The interrupt is processed only by one of the processors specified in the affinity mask under the AssignmentSetOveride registry value.</td></tr><tr><td>IqrPolicySpreadMessagesAcrossAllProcessors</td><td>Different message-signaled interrupts are distributed across an optimal set of eligible processors, keeping track of NUMA topology issues, if possible. This requires MSI-X support on the device and platform.</td></tr><tr><td>IqrPolicyAllProcessorsInGroupWhenSteered</td><td>The interrupt is subject to interrupt starting, and as such, the interrupt should be assigned to all processor IDTs as the target processor will be dynamically selected based on steering rules.</td></tr></table>


Other than setting this affinity policy, another registry value can also be used to set the interrupt's priority, based on the values in Table 8-6.

TABLE 8-6 IRQ priorities

<table><tr><td>Priority</td><td>Meaning</td></tr><tr><td>IrqPriorityUndefined</td><td>No particular priority is required by the device. It receives the default priority (IrqPriorityNormal).</td></tr><tr><td>IrqPriorityLow</td><td>The device can tolerate high latency and should receive a lower IRQL than usual (3 or 4).</td></tr><tr><td>IrqPriorityNormal</td><td>The device expects average latency. It receives the default IRQL associated with its interrupt vector (5 to 11).</td></tr><tr><td>IrqPriorityHigh</td><td>The device requires as little latency as possible. It receives an elevated IRQL beyond its normal assignment (12).</td></tr></table>


As discussed earlier, it is important to note that Windows is not a real-time operating system, and as such, these IRQ priorities are hints given to the system that control only the IRQ associated with the interrupt and provide no extra priority other than the Windows IRQ priority-scheme mechanism. Because the IRQ priority is also stored in the registry, administrators are free to set these values for drivers should there be a requirement of lower latency for a driver not taking advantage of this feature.

---

## Software interrupts

Although hardware generates most interrupts, the Windows kernel also generates software interrupts for a variety of tasks, including these:

- ■ Initiating thread dispatching

■ Non-time-critical interrupt processing

■ Handling timer expiration

■ Asynchronously executing a procedure in the context of a particular thread

■ Supporting asynchronous I/O operations
These tasks are described in the following subsections.

