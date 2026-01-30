## CHAPTER 8  System mechanisms

The Windows operating system provides several base mechanisms that kernel-mode components such as the executive, the kernel, and device drivers use. This chapter explains the following system mechanisms and describes how they are used:

- ●  Processor execution model, including ring levels, segmentation, task states, trap dispatching,
including interrupts, deferred procedure calls (DPCs), asynchronous procedure calls (APCs),
timers, system worker threads, exception dispatching, and system service dispatching

●  Speculative execution barriers and other software-side channel mitigations

●  The executive Object Manager

●  Synchronization, including spinlocks, kernel dispatcher objects, wait dispatching, and user-
mode-specific synchronization primitives such as address-based waits, conditional variables,
and slim reader-writer (SRW) locks

●  Advanced Local Procedure Call (ALPC) subsystem

●  Windows Notification Facility (WNF)

●  WoW64

●  User-mode debugging framework
Additionally, this chapter also includes detailed information on the Universal Windows Platform

(UWP) and the set of user-mode and kernel-mode services that power it, such as the following:

- ●  Packaged Applications and the AppX Deployment Service

●  Centennial Applications and the Windows Desktop Bridge

●  Process State Management (PSM) and the Process Lifetime Manager (PLM)

●  Host Activity Moderator (HAM) and Background Activity Moderator (BAM)
1


---

Processor execution model

This section takes a deep look at the internal mechanics of Intel 1386-based processor architecture and its extension, the AMD64-based architecture used on modern systems. Although the two respective companies first came up with these designs, it's worth noting that both vendors now implement each other's designs, so although you may still see these suffix attached to Windows files and registry keys, the terms x86 (32-bit) and x64 (64-bit) are more common in today's usage.

We discuss concepts such as segmentation, tasks, and ring levels, which are critical mechanisms, and we discuss the concept of traps, interrupts, and system calls.

## Segmentation

High-level programming languages such as C/C++ and Rust are compiled down to machine-level code, often called assembler or assembly code. In this low-level language, processor registers are accessed directly, and there are often three primary types of registers that programs access (which are visible when debugging code):

- The Program Counter (PC), which in x86/x64 architecture is called the Instruction Pointer (IP)
and is represented by the EIP (x86) and RIP (x64) register. This register always points to the line
of assembly code that is executing (except for certain 32-bit ARM architectures).
The Stack Pointer (SP), which is represented by the ESP (x86) and RSP (x64) register. This register
points to the location in memory that is holding the current stack location.
Other General Purpose Registers (GPRS) include registers such as EAX/RAX, ECX/RCX, EDX/RDX,
ESI/RSI and R8, R14, just to name a few examples.
Although these registers can contain address values that point to memory, additional registers

are involved when accessing these memory locations as part of a mechanism called protected mode

segmentation. This works by checking against various segment registers, also called selectors:

- ■ All accesses to the program counter are first verified by checking against the code
segment (CS) register.
■ All accesses to the stack pointer are first verified by checking against the stack
segment (SS) register.
■ Accesses to other registers are determined by a segment override, which encoding can be used
to force checking against a specific register such as the data segment (DS), extended segment
(ES), or F segment (FS).
These selectors live in 16-bit segment registers and are looked up in a data structure called the

Global Descriptor Table (GDT). To locate the GDT, the processor uses yet another CPU register, the GDT

Register, or GDTR. The format of these selectors is as shown in Figure 8-1.

---

![Figure](figures/Winternals7thPt2_page_034_figure_000.png)

FIGURE 8-1 Format of an x86 segment selector.

The offset located in the segment selector is thus looked up in the GDT, unless the TI bit is set, in which case a different structure, the Local Descriptor Table is used, which is identified by the LDTR register instead and is not used anymore in the modern Windows OS. The result is in a segment entry being discovered—or alternatively, an invalid entry, which will issue a General Protection Fault (#GP) or Segment Fault (#SF) exception.

This entry, called segment descriptor in modern operating systems, serves two critical purposes:

■ For a code segment, it indicates the ring level, also called the Code Privilege Level (CPL) at which code running with this segment selector loaded will execute. This ring level, which can be from 0 to 3, is then cached in the bottom two bits of the actual selector, as was shown in Figure 8-1. Operating systems such as Windows use Ring 0 to run kernel mode components and drivers, and Ring 3 to run applications and services.

Furthermore, on x64 systems, the code segment also indicates whether this is a Long Mode or

Compatibility Mode segment. The former is used to allow the native execution of x64 code,

whereas the latter activates legacy compatibility with x86. A similar mechanism exists on x86

systems, where a segment can be marked as a 16-bit segment or a 32-bit segment.

For other segments, it indicates the ring level, also called the Descriptor Privilege Level (DPL), that is required to access this segment. Although largely an anachronistic check in today's modern systems, the processor still enforces (and applications still expect) this to be set up correctly.

Finally, on x86 systems, segment entries can also have a 32-bit base address, which will add that value

to any value already loaded in a register that is referencing this segment with an override. A correspond ing segment limit is then used to check if the underlying register value is beyond a fixed cap. Because this

base address was set to 0 (and limit to 0xFFFFFFFF) on most operating systems, the x64 architecture does

away with this concept, apart from the FS and GS selectors, which operate a little bit differently:

- ■ If the Code Segment is a Long Mode code segment, then get the base address for the FS seg-
ment from the FS_BASE Model Specific Register (MSR)—0C000010h. For the GS segment, look
at the current swap state, which can be modified with the swapps instruction, and load either
the GS_BASE MSR—0C000010h or the GS_SWAP MSR—0C000010zh.

If the TI bit is set in the FS or GS segment selector register, then get its value from the LDT entry
at the appropriate offset, which is limited to a 32-bit base address only. This is done for compat-
ibility reasons with certain operating systems, and the limit is ignored.

■ If the Code Segment is a Compatibility Mode segment, then read the base address as normal
from the appropriate GDT entry (or LDT entry if the TI bit is set). The limit is enforced and vali-
dated against the offset in the register following the segment override.
---

This interesting behavior of the FS and GS segments is used by operating systems such as Windows

to achieve a sort of thread-local register effect, where specific data structures can be pointed to by the

segment base address, allowing simple access to specific offsets/fields within it.

For example, Windows stores the address of the Thread Environment Block (TEB), which was described in Part 1, Chapter 3, "Processes and jobs," in the FS segment on x86 and in the GS (swapped) segment on x64. Then, while executing kernel-mode code on x86 systems, the FS segment is manually modified to a different segment entry that contains the address of the Kernel Processor Control Region (KPCR) instead, whereas on x64, the GS (non-swapped) segment stores this address.

Therefore, segmentation is used to achieve these two effects on Windows—encode and enforce the

level of privilege that a piece of code can execute with at the processor level and provide direct access to

the TEB and KPCR data structures from user-mode and/or kernel-mode code, as appropriate. Note that

since the GDT is pointed to by a CPU register—the DDR—each CPU can have its own GDT. In fact, this is

exactly what Windows uses to make sure the appropriate per-processor KPCR is loaded for each GDT, and

that the TEB of the currently executing thread on the current processor is equally present in its segment.

## EXPERIMENT: Viewing the GDT on an x64 system

You can view the contents of the GDT, including the state of all segments and their base addresses (when relevant) by using the dg debugger command, if you are doing remote debugging or analyzing a crash dump (which is also the case when using Lived). This command accepts the starting segment and the ending segment, which will be 10 and 50 in this example:

```bash
0: kb> dg 10 50
Sel      Base        Limit      Type      P Si Gr Pr Lo
----------------------
0010 ......00000000 ......00000000 ......00000000 Code RE Ac 0 Nb By P  Lo 0000029b
0018 ......00000000 ......00000000 ......00000000 Data AW Rc 0 Bg By P  Nl 0000493
0020 ......00000000 ......00000000 ......00000000 Fffffffff Code RE Ac 3 Bg By P  Nl 0000cfb
0028 ......00000000 ......00000000 ......00000000 Fffffffff Code AW Rc 3 Bg By P  Nl 0000cf3
0030 ......00000000 ......00000000 ......00000000 ......00000000 Code RE Ac 3 Nb By P  Lo 00002fb
0050 ......00000000 ......00000000 ......00000000 ......00003c00 Data AW Rc 3 Bg By P  Nl 00004f3
```

The key segments here are 10h, 18h, 20h, 28h, 30h, and 50h. (This output was cleaned up a bit to remove entries that are not relevant to this discussion.)

At 10h (KGDT64_R0_CODE), you can see a Ring 0 Long Mode code segment, identified by the number 0 under the PI column , the letters "Lo" under the Long column, and the type being Code RE. Similarly, at 20h (KGDT64_R3_CODE), you'll note a Ring 3 NI segment (not long—i.e. compatibility mode), which is the segment used for executing x86 code under the WoW64 subsystem, while at 30h (KGDT64_R3_CODE), you'll find an equivalent Long Mode segment. Next, note the 18h (KGDT64_R3_DATA) and 28h (KGDT64_R3_DATA) segments, which correspond to the stack, data, and extended segment.

---

There's one last segment at 50h (KGD.T_R3_CMTEB), which typically has a base address of zero, unless you're running some x86 code under WoW64 while dumping the GDT. This is where the base address of the TEB will be stored when running under compatibility mode, as was explained earlier.

To see the 64-bit TEB and KPCR segments, you'd have to dump the respective MSRs instead, which can be done with the following commands if you are doing local or remote kernel debugging (these commands will not work with a crash dump):

```bash
!kds- rdmsr c0000101
msr[c0000101] = ffff8401 a3b80000
!kds- rdmsr c0000102
msr[c0000102] = 000000e5'6dbe9000
```

You can compare these values with those of @$pcr and @$eb, which should show you the same values, as below:

```bash
lkd> dx -r0 @$pcr
@$pcr             : 0xffffb401a3b80000 [Type: _KPCR *]
lkd> dx -r0 @$teb
@$teb             : 0xe56dbe9000 [Type: _TEB *]
```

## EXPERIMENT: Viewing the GDT on an x86 system

On an x86 system, the GDT is laid out with similar segments, but at different selectors, additionally, due to usage of a dual FS segment instead of the swapgs functionality, and due to the lack of Long Mode, the number of selectors is a little different, as you can see here:

```bash
kd> dg 8 38
Sel   Base    Limit   Type   I ze an es ng Flags
----------------------
0003 00000000 FFFFFFFF Code RE Ac 0 Bg Pq P N 1N 0000c0b
0010 00000000 FFFFFFFF Data Rw Ac 0 Bg Pq P N 1N 0000c03
0018 00000000 FFFFFFFF Code RE 3 Bg Pq P N 1N 0000cfa
0020 00000000 FFFFFFFF Data Rw Ac 3 Bg Pq P N 1N 0000cf3
0030 80a8e000 00006020 Data Rw Ac 0 Bq Pq P N 1N 0000493
0038 00000000 00000ff0 Data Rw 3 Bq Pq P N 1N 00004f2
```

The key segments here are 8h, 10h, 18h, 20h, 30h, and 38h. At 08h (KGDT_R0_CODE), you can see a Ring 0 code segment. Similarly, at 18h (KGDT_R3_CODE), note a Ring 3 segment. Next, note the 10h (KGDT_R3_DATA) and 20h (KGDT_R3_DATA) segments, which correspond to the stack, data, and extended segment.

On x86, you'll find at segment 30h (KGD T_R0_PCR) the base address of the KPCR, and at segment 39h (KGD T_R3_TEB), the base address of the current thread's TEB. There are no MSRs used for segmentation on these systems.

---

### Lazy segment loading

Based on the description and values of the segments described earlier, it may be surprising to investigate the values of DS and ES on an x86 and/or x64 system and find that they do not necessarily match the defined values for their respective ring levels. For example, an x86 user-mode thread would have the following segments:

$$CS=1 Bh(18 ~h \mid 3)$$

$$ES, DS = 23 (20h | 3)$$

$$FS=3Bh(38h|3)$$

Yet, during a system call in Ring 0, the following segments would be found:

$$CS=08 ~h(08 ~h \quad 0)$$

$$ES, DS = 23 (20h | 3)$$

$$FS=30 ~h(30 ~h \mid 0)$$

Similarly, an x64 thread executing in kernel mode would also have its ES and DS segments set to 28h (28h | 3). This discrepancy is due to a feature known as lazy segment loading and reflects the meaninglessness of the Descriptor Privilege Level (DPL) of a data segment when the current Code Privilege Level (CPL) is 0 combined with a system operating under a flat memory model. Since a higher CPL can always access data of a lower DPL—but not the contrary—setting DS and/or ES to their "proper" values upon entering the kernel would also require restoring them when returning to user mode.

Although the MOV DS, 10h instruction seems trivial, the processor's microcode needs to perform a number of selector correctness checks when encountering it, which would add significant processing costs to system call and interrupt handling. As such, Windows always uses the Ring 3 data segment values, avoiding these associated costs.

## Task state segments

Other than the code and data segment registers, there is an additional special register on both x86 and x64 architectures: the Task Register (TR), which is also another 16-bit selector that acts as an offset in the GDT. In this case, however, the segment entry is not associated with code or data, but rather with a task. This represents, to the processor's internal state, the current executing piece of code, which is called the Task State—in the case of Windows, the current thread. These task states, represented by segments (Task State Segment, or TSS), are used in modern x86 operating systems to construct a variety of tasks that can be associated with critical processor traps (which we'll see in the upcoming section). At minimum, a TSS represents a page directory (through the CR3 register), such as a PML4 on x64 systems (see Part 1, Chapter 5, "Memory management," for more information on paging), a Code Segment, a Stack Segment, an Instruction Pointer, and up to four Stack Pointers (one for each ring level). Such TSSs are used in the following scenarios:

- ■ To represent the current execution state when there is no specific trap occurring. This is then
used by the processor to correctly handle interrupts and exceptions by loading the Ring 0 stack
from the TSS if the processor was currently running in Ring 3.
6      CHAPTER 8   System mechanisms


---

- ■ To work around an architectural race condition when dealing with Debug Faults (#DB), which
requires a dedicated TSS with a custom debug fault handler and kernel stack.
■ To represent the execution state that should be loaded when a Double Fault (#DF) trap occurs.
This is used to switch to the Double Fault handler on a safe (backup) kernel stack instead of the
current thread's kernel stack, which may be the reason why a fault has happened.
■ To represent the execution state that should be loaded when a Non Maskable Interrupt (#NMI)
occurs. Similarly, this is used to load the NMI handler on a safe kernel stack.
■ Finally, to a similar task that is also used during Machine Check Exceptions (#MCE), which, for
the same reasons, can run on a dedicated, safe, kernel stack.
On x86 systems, you'll find the main (current) TSS at selector 28h in the GDT, which explains why the TR register will be 28h during normal Windows execution. Additionally, the #DF TSS is at 58h, the NMI TSS is at 50h, and the #MCE TSS is at a0h. Finally, the #DB TSS is at 08h.

On x64 systems, the ability to have multiple TSSs was removed because the functionality had been

relegated to mostly this one need of executing trap handlers that run on a dedicated kernel stack. As

such, only a single TSS is now used (in the case of Windows, at 040h), which now has an array of eight

possible stack pointers, called the Interrupt Stack Table (IST). Each of the preceding traps is now associ ated with an IST Index instead of a custom TSS. In the next section, as we dump a few IDT entries, you

will see the difference between x68 and x64 systems and their handling of these traps.

## EXPERIMENT: Viewing the TSSs on an x86 system

On an x86 system, we can look at the system-wide TSS at 28h by using the same dg command utilized earlier:

```bash
kd> =g 28 28
Sel  Base  Limit  Type  I  S1  Gr  Pr  Lo  ng Flags
00028 8116e400 000020ab T5532 Busy 0 Nb By P  N1 0000008b
```

This returns the virtual address of the _KTSS data structure, which can then be dumped with the dx or dt commands:

```bash
kd> dx (ntl::KTSS=0x8116e400
(nt::KTSS=0x8116e400
                          : 0x8116e400 [Type:_KTSS *]
[+0x000] Backlink        : 0x0 [Type: unsigned short]
[+0x002] Reserved0      : 0x0 [Type: unsigned short]
[+0x004] Esp0           : 0x81174000 [Type: unsigned long]
[+0x008] Ss0           : 0x10 [Type: unsigned short]
```

Note that the only fields that are set in the structure are the ESp0 and Ss0 fields because

Windows never uses hardware-based task switching outside of the trap conditions described

earlier. As such, the only use for this particular TSS is to load the appropriate kernel stack during

a hardware interrupt.

---

As you'll see in the "Trap dispatching" section, on systems that do not suffer from the "Meltdown" architectural processor vulnerability, this stack pointer will be the kernel stack pointer of the current thread (based on the KTHREAD structure seen in Part 1, Chapter 5), whereas on systems that are vulnerable, this will point to the transition stack inside of the Processor Descriptor Area. Meanwhile, the Stack Segment is always set to 10h, or kgdt_r3_data.

Another TSS is used for Machine Check Exceptions (#MC) as described above. We can use dg to look at it:

```bash
kd> dg a0 a0
----------------------
Sel   Base     Limit     Type  l ze an es ng Flags
----------------------
OOA 81170590 0000067 TSS32 Avl  O Nb By P Nl 0000089
```

This time, however, we'll use the .ts command instead of dx, which will format the various

fields in the _KTSS structure and display the task as if it were the currently executing thread. In this

case, the input parameter is the task selector (A0h).

```bash
kd> .tss a0
eax=00000000 ebx=00000000 ecx=00000000 edx=00000000 esi=00000000 edi=00000000
eip=81ea718 esp=820f5470 ebp=00000000 iopl=0      nv up di p1 nz na po nc
cs=0008 ss=0010 ds=0023 es=0023 fs=0030 gs=0000             efl=00000000
hall!HalpMcaExceptionHandlerWrapper:
81ea718 fa             cli
```

Note how the segment registers are set up as described in the "Lazy segment loading" section earlier, and how the program counter (EIP) is pointing to the handler for #MC. Additionally, the stack is configured to point to a safe stack in the kernel binary that should be free from memory corruption. Finally, although not visible in the .tss output, CR3 is configured to the System Page Directory. In the "Trap dispatching" section, we revisit this TSS when using the !idt command.

## EXPERIMENT: Viewing the TSS and the IST on an x64 system

On an x64 system, the dg command unfortunately has a bug that does not correctly show 64-bit

segment base addresses, so obtaining the TSS segment (40h) base address requires dumping

what appear to be two segments, and combining the high, middle, and low base address bytes:

```bash
O: kd\ dg 40 48
----------------------
Sel      Base             Limit      Type      Type
----------------------
0040 00000000 7074d00 00000000 00000067 TSS32 Busy 0 Nb By P N1 0000008b
0048 00000000 00000000 00000000 00000f802 <Reserved> 0 Nb By P N1 00000000
```

---

In this example, the KTS564 is therefore at 0xFFFFF8027074D000. To showcase yet another way of obtaining it, note that the KPCR of each processor has a field called TssBase, which contains a pointer to the KTS564 as well:

```bash
0: kd> dx @lpcr->tsbBase
:   0x0000 ->tsbBase
      :   0xffff8027074d000 [Type: .KTSS64 *]
      (+0x000) Reserved0
      :   0x0 [Type: unsigned long]
      (+0x004) Rsp0
      :   0xffff80270757c90 [Type: unsigned __int64]
```

Note how the virtual address is the same as the one visible in the GDT. Next, you'll also notice how all the fields are zero except for RSP0, which, similarly to x86, contains the address of the kernel stack for the current thread (on systems without the "Meltdown" hardware vulnerability) or the address of the transition stack in the Processor Descriptor Area.

On the system on which this experiment was done, a 10th Generation Intel processor was used; therefore, RSP0 is the current kernel stack:

```bash
0: dx := 0; 0<Thread->Tcb.InitialStack
0<Thread->Tcb.InitialStack : Oxfffff80270757c90 [Type: void *]
```

Finally, by looking at the Interrupt Stack T able, we can see the various stacks that are associated with the #DF, #MC, #DB, and NMI traps, and in the T wrap Dispatching section, we'll see how the Interrupt Dispatch T able (IDT) references these stacks:

```bash
0: kd dx 0lpcr->TssBase->lst
    @lpcr->tssBase->lst      [Type: unsigned __int64 [8]]
[0]             : 0x000000000000 int64
[1]             : 0xffff00270768000 [Type: unsigned __int64]
[2]             : 0xffff0027076a000 [Type: unsigned __int64]
[3]             : 0xffff0027076a000 [Type: unsigned __int64]
[4]             : 0xffff0027076e000 [Type: unsigned __int64]
```

Now that the relationship between ring level, code execution, and some of the key segments in the GDT has been clarified, we'll take a look at the actual transitions that can occur between different code segments (and their ring level) in the upcoming section on trap dispatching. Before discussing trap dispatching, however, let's analyze how the TSS configuration changes in systems that are vulnerable to the Meltdown hardware side-channels attack.

## Hardware side-channel vulnerabilities

Modern CPUs can compute and move data between their internal registers very quickly (in the order of pico-seconds). A processor's registers are a scarce resource. So, the OS and applications' code always instruct the CPU to move data from the CPU registers into the main memory and vice versa. There are different kinds of memory that are accessible from the main CPU. Memory located inside the CPU package and accessible directly from the CPU execution engine is called cache and has the characteristic of being fast and expensive. Memory that is accessible from the CPU through an external bus is usually the RAM (Random Access Memory) and has the characteristic of being slower, cheaper, and big

CHAPTER 8 System mechanisms      9


---

in size. The locality of the memory in respect to the CPU defines a so-called memory hierarchy based on memories of different speeds and sizes (the more memory is closer to the CPU, the more memory is faster and smaller in size). As shown in Figure 8-2, CPUs of modern computers usually include three different levels of fast cache memory, which is directly accessible by the execution engine of each physical core: L1, L2, and L3 cache. L1 and L2 caches are the closest to a CPU's core and are private per each core. L3 cache is the farthest one and is always shared between all CPU's cores (note that on embedded processors, the L3 cache usually does not exist).

![Figure](figures/Winternals7thPt2_page_041_figure_001.png)

FIGURE 8-2 Caches and storage memory of modern CPUs and their average size and access time.

One of main characteristics of cache is its access time, which is comparable to CPU's registers (even though it is still slower). Access time to the main memory is instead a hundred times slower. This means that in case the CPU executes all the instructions in order, many times there would be huge slowdowns due to instructions accessing data located in the main memory. To overcome this problem, modern CPUs implement various strategies. Historically, those strategies have led to the discovery of side-channel attacks (also known as speculative attacks), which have been proven to be very effective against the overall security of the end-user systems.

To correctly describe side-channel hardware attacks and how Windows mitigates them, we should discuss some basic concepts regarding how the CPU works internally.

## Out-of-order execution

A modern microprocessor executes machine instructions thanks to its pipeline. The pipeline contains many stages, including instruction fetch, decoding, register allocation and renaming, instructions reordering, execution, and retirement. A common strategy used by the CPUs to bypass the memory slowdown problem is the capability of their execution engine to execute instructions out of order as soon as the required resources are available. This means that the CPU does not execute the instructions in a strictly sequential order, maximizing the utilization of all the execution units of the CPU core as exhaustive as possible. A modern processor can execute hundreds of instructions speculatively before it is certain that those instructions will be needed and committed (retired).

One problem of the described out-of-order execution regards branch instructions. A conditional branch instruction defines two possible paths in the machine code. The correct path to be taken depends on the previously executed instructions. When calculating the condition depends on previous

10      CHAPTER 8    System mechanisms


---

instructions that access slow RAM memory, there can be slowdowns. In that case, the execution engine waits for the retirement of the instructions defining the conditions (which means waiting for the memory bus to complete the memory access) before being able to continue in the out-of-order execution of the following instructions belonging to the correct path. A similar problem happens in the case of indirect branches. In this case, the execution engine of the CPU does not know the target of a branch (usually a jump or a call) because the address must be fetched from the main memory. In this context, the term speculative execution means that the CPU's pipeline decodes and executes multiple instructions in parallel or in an out-of-order way, but the results are not retired into permanent registers, and memory writes remain pending until the branch instruction is finally resolved.

## The CPU branch predictor

How does the CPU know which branch (path) should be executed before the branch condition has been completely evaluated? (The issue is similar with indirect branches, where the target address is not known). The answer lies in two components located in the CPU package: the branch predictor and the branch target predictor.

The branch predictor is a complex digital circuit of a CPU that tries to guess which path a branch will go before it is known definitively. In a similar way, the branch target predictor is the part of the CPU that tries to predict the target of indirect branches before it is known. While the actual hardware implementation heavily depends on the CPU manufacturer, the two components both use an internal cache called Branch Target Buffer (BTB), which records the target address of branches (or information about what the conditional branch has previously done in the past) using an address tag generated through an indexing function, similar to how the cache generates the tag, as explained in the next section. The target address is stored in the BTB the first time a branch instruction is executed. Usually, at the first time, the execution pipeline is stalled, forcing the CPU to wait for the condition or target address to be fetched from the main memory. The second time the same branch is executed, the target address in the BTB is used for fetching the predicted target into the pipeline. Figure 8-3 shows a simple scheme of an example branch target predictor.

![Figure](figures/Winternals7thPt2_page_042_figure_004.png)

FIGURE 8-3 The scheme of a sample CPU branch predictor.

In case the prediction was wrong, and the wrong path was executed speculatively, then the instruction pipeline is flushed, and the results of the speculative execution are discarded. The other path is fed into the CPU pipeline and the execution restarts from the correct branch. This case is called branch

CHAPTER 8 System mechanisms     11


---

misprediction. The total number of wasted CPU cycles is not worse than an in-order execution waiting for the result of a branch condition or indirect address evaluation. However, different side effects of the speculative execution can still happen in the CPU, like the pollution of the CPU cache lines. Unfortunately, some of these side effects can be measured and exploited by attackers, compromising the overall security of the system.

## The CPU cache(s)

As introduced in the previous section, the CPU cache is a fast memory that reduces the time needed for

data or instructions fetch and store. Data is transferred between memory and cache in blocks of fixed

sizes (usually 64 or 128 bytes) called lines or cache blocks. When a cache line is copied from memory

into the cache, a cache entry is created. The cache entry will include the copied data as well as a tag

identifying the requested memory location. Unlike the branch target predictor, the cache is always in dexed through physical addresses (otherwise, it would be complex to deal with multiple mappings and

changes of address spaces). From the cache perspective, a physical address is split in different parts.

Whereas the higher bits usually represent the tag, the lower bits represent the cache line and the offset

into the line. A tag is used to uniquely identify which memory address the cache block belongs to, as

shown in Figure 8-4.

When the CPU reads or writes a location in memory, it first checks for a corresponding entry in the cache (in any cache lines that might contain data from that address. Some caches have different ways indeed, as explained later in this section). If the processor finds that the memory content from that location is in the cache, a cache hit has occurred, and the processor immediately reads or writes the data from/in the cache line. Otherwise, a cache miss has occurred. In this case, the CPU allocates a new entry in the cache and copies data from main memory before accessing it.

![Figure](figures/Winternals7thPt2_page_043_figure_004.png)

FIGURE 8-4 A sample 48-bit one-way CPU cache.

In Figure 8-4, a one-way CPU cache is shown, and it's capable of addressing a maximum 48-bits of virtual address space. In the sample, the CPU is reading 48 bytes of data located at virtual address 0x019f566030. The memory content is initially read from the main memory into the cache block 0x60. The block is entirely filled, but the requested data is located at offset 0x30. The sample cache has just

---

256 blocks of 256 bytes, so multiple physical addresses can fill block number 0x60. The tag (0x019f56) uniquely identifies the physical address where data is stored in the main memory.

In a similar way, when the CPU is instructed to write some new content to a memory address, it first updates the cache line(s) that the memory address belongs to. At some point, the CPU writes the data back to the physical RAM as well, depending on the caching type (write-back, write-through, uncached, and so on) applied to the memory page. (Note that this has an important implication in multiprocessor systems: A cache coherency protocol must be designed to prevent situations in which another CPU will operate on stale data after the main CPU has updated a cache block. (Multiple CPU cache coherency algorithms exist and are not covered in this book.)

To make room for new entries on cache misses, the CPU sometimes should evict one of the existing cache blocks. The algorithm the cache uses to choose which entry to evict (which means which block will host the new data) is called the placement policy. If the placement policy can replace only one block for a particular virtual address, the cache is called direct mapped (the cache in Figure 8-4 has only one way and is direct mapped). Otherwise, if the cache is free to choose any entry (with the same block number) to hold the new data, the cache is called fully associative. Many caches implement a compromise in which each entry in main memory can go to any one of N places in the cache and are described as N-ways set associative. A way is thus a subdivision of a cache, with each way being of equal size and indexed in the same fashion. Figure 8-5 shows a four-way set associative cache. The cache in the figure can store data belonging to four different physical addresses indexing the same cache block (with different tags) in four different cache sets.

![Figure](figures/Winternals7thPt2_page_044_figure_003.png)

FIGURE 8-5 A four-way set associative cache.

## Side-channel attacks

As discussed in the previous sections, the execution engine of modern CPUs does not write the result of

the computation until the instructions are actually retired. This means that, although multiple instruc tions are executed out of order and do not have any visible architectural effects on CPU registers and

memory, they have microarchitectural side effects, especially on the CPU cache. At the end of the year

CHAPTER 8 System mechanisms     13


---

2017, novel attacks were demonstrated against the CPU out-of-order engines and their branch predictors. These attacks relied on the fact that microarchitectural side effects can be measured, even though they are not directly accessible by any software code.

The two most destructive and effective hardware side-channel attacks were named Meltdown

and Spectre.

## Meltdown

Meltdown (which has been later called Rogue Data Cache load, or RDI) allowed a malicious usermode process to read all memory, even kernel memory, when it was not authorized to do so. The attack exploited the out-of-order execution engine of the processor and an inner race condition between the memory access and privilege check during a memory access instruction processing.

In the Meltdown attack, a malicious user-mode process starts by flushing the entire cache (instructions that do so are callable from user mode). The process then executes an illegal kernel memory access followed by instructions that fill the cache in a controlled way (using a probe array). The process cannot access the kernel memory, so an exception is generated by the processor. The exception is caught by the application. Otherwise, it would result in the termination of the process. However, due to the out-of-order execution, the CPU has already executed (but not retired, meaning that no architectural effects are observable in any CPU registers or RAM) the instructions following the illegal memory access that have filled the cache with the illegally requested kernel memory content.

The malicious application then probes the entire cache by measuring the time needed to access each page of the array used for filling the CPU cache's block. If the access time is behind a certain threshold, the data is in the cache line, so the attacker can infer the exact byte read from the kernel memory. Figure 8-6, which is taken from the original Meltdown research paper (available at the https://meltdownattack.com/ web page), shows the access time of a 1 MB probe array (composed of 256 64KB pages):

![Figure](figures/Winternals7thPt2_page_045_figure_006.png)

FIGURE 8-6 CPU time employed for accessing a 16MB probe array.

Figure 8-6 shows that the access time is similar for each page, except for one. Assuming that secret data can be read one byte per time and one byte can have only 256 values, knowing the exact page in the array that led to a cache hit allows the attacker to know which byte is stored in the kernel memory.

## Spectre

The Spectre attack is similar to Meltdown, meaning that it still relies on the out-of-order execution flaw explained in the previous section, but the main CPU components exploited by Spectre are the branch predictor and branch target predictor. Two variants of the Spectre attack were initially presented. Both are summarized by three phases:

---

1. In the setup phase, from a low-privileged process (which is attacker-controlled), the attacker performs multiple repetitive operations that mistrain the CPU branch predictor. The goal is to train the CPU to execute a (legit) path of a conditional branch or a well-defined target of an indirect branch.

2. In the second phase, the attacker forces a victim high-privileged application (or the same process) to speculatively execute instructions that are part of a mispredicted branch. Those instructions usually transfer confidential information from the victim context into a microarchitectural channel (usually the CPU cache).

3. In the final phase, from the low-privileged process, the attacker recovers the sensitive information stored in the CPU cache (microarchitectural channel) by probing the entire cache (the same methods employed in the Meltdown attack). This reveals secrets that should be secured in the victim high-privileged address space.

The first variant of the Spectre attack can recover secrets in a victim process's address space (which can be the same or different than the address space that the attacker controls), by forcing the CPU branch predictor to execute the wrong branch of a conditional branch speculatively. The branch is usually part of a function that performs a bound check before accessing some nonsecret data contained in a memory buffer. If the buffer is located adjacent to some secret data, and if the attacker controls the offset supplied to the branch condition, she can repetitively train the branch predator supplying legal offset values, which satisfies the bound check and allows the CPU to execute the correct path.

The attacker then prepares a well-defined way the CPU cache (such that the size of the memory buffer used for the bound check wouldn't be in the cache) and supplies an illegal offset to the function that implements the bound check branch. The CPU branch predictor is trained to always follow the initial logn path. However, this time, the CPU would be wrong (the other should be taken). The instructions accessing the memory buffer are thus speculatively executed and result in a read outside the boundary, which targets the secret data. The attacker can thus read back the secrets by probing the entire cache (similar to the Meltdown attack).

The second variant of Spectre exploits the CPU branch target predictor; indirect branches can be poisoned by an attacker. The mispredicted path of an indirect branch can be used to read arbitrary memory of a victim process (or the OS kernel) from an attacker-controlled context. As shown in Figure 8-7, for variant 2, the attacker mistrain the branch predictor with malicious destination, allowing the CPU to build enough information in the BTB to execute instructions located at an address chosen by the attacker. In the victim address space, that address should point to a gadget. A gadget is a group of instructions that access a secret and store it in a buffer that is cached in a controlled way (the attacker needs to indirectly control the content of one or more CPU registers in the victim, which is a common case when an API accepts untrusted input data).

After the attacker has trained the branch target predictor, she flushes the CPU cache and invokes a service provided by the target higher-privileged entity (a process or the OS kernel). The code that implements the service must implement similar indirect branches as the attacker-controlled process. The CPU branch target predictor in this case speculatively executes the gadget located at the wrong target address. This, as for Variant 1 and Meltdown, creates microarchitectural side effects in the CPU cache, which can be read from the low-privileged context.

CHAPTER 8 System mechanisms

15


---

![Figure](figures/Winternals7thPt2_page_047_figure_000.png)

FIGURE 8-7 A scheme of Spectre attack Variant 2.

## Other side-channel attacks

After Spectre and Meltdown attacks were originally publicly released, multiple similar side-channel

hardware attacks were discovered. Even though they were less destructive and effective compared to

Meltdown and Spectre, it is important to at least understand the overall methodology of those new

side-channel attacks.

Speculative store bypass (SSB) arises due to a CPU optimization that can allow a load instruction, which the CPU evaluated not to be dependent on a previous store, to be speculatively executed before the results of the store are retired. If the prediction is not correct, this can result in the load operation reading stale data, which can potentially store secrets. The data can be forwarded to other operations executed during speculation. Those operations can access memory and generate microarchitectural side effects (usually in the CPU cache). An attacker can thus measure the side effects and recover the secret value.

The Foreshadow (also known as L1TF) is a more severe attack that was originally designed for

stealing secrets from a hardware enclave (SGX) and then generalized also for normal user-mode

software executing in a non-privileged context. Foreshadow exploited two hardware flaws of the

speculative execution engine of modern CPUs. In particular:

- ■ Speculation on inaccessible virtual memory. In this scenario, when the CPU accesses some data
stored at a virtual address described by a Page table entry (PTE) that does not include the pres-
ent bit (meaning that the address is is not valid) an exception is correctly generated. However,
if the entry contains a valid address translation, the CPU can speculatively execute the instruc-
tions that depend on the read data. As for all the other side-channel attacks, those instructions
are not retired by the processor, but they produce measurable side effects. In this scenario, a
user-mode application would be able to read secret data stored in kernel memory. More seri-
ously, the application, under certain circumstances, would also be able to read data belonging
---

to another virtual machine: when the CPU encounters a nonpresent entry in the Second Level Address Translation table (SLAT) while translating a guest physical address (GPA), the same side effects can happen. (More information on the SLAT, GPAs, and translation mechanisms are present in Chapter 5 of Part 1 and in Chapter 9, "Virtualization technologies").

■ Speculation on the logical (hyper-threaded) processors of a CPU's core. Modern CPUs can have more than one execution pipeline per physical core, which can execute in an out-of-order way multiple instruction streams using a single shared execution engine (this is Symmetric multithreading, or SMT, as explained later in Chapter 9). In those processors, two logical processors (LPs) share a single cache. Thus, while an LP is executing some code in a high-privileged context, the other sibling LP can read the side effects produced by the high-privileged code executed by the other LP. This has very severe effects on the global security posture of a system. Similar to the first Foreshadow variant, an LP executing the attacker code on a low-privileged context can even spoil secrets stored in another high-security virtual-machine just by waiting for the virtual machine code that will be scheduled for execution by the sibling LP. This variant of Foreshadow is part of the Group 4 vulnerabilities.

Microarchitectural side effects are not always targeting the CPU cache. Intel CPUs use other intermediate high-speed buffers with the goal to better access cached and noncached memory and reorder micro-instructions. (Describing all those buffers is outside the scope of this book.) The Microarchitectural Data Sampling (MDS) group of attacks exposes secrets data located in the following microarchitectural structures:

- ■ Store buffers While performing store operations, processors write data into an internal tem-
porary microarchitectural structure called store buffer, enabling the CPU to continue to execute
instructions before the data is actually written in the cache or main memory (for noncached
memory access). When a load operation reads data from the same memory address as an ear-
lier store, the processor may be able to forward data directly from the store buffer.
■ Fill buffers A fill buffer is an internal processor structure used to gather (or write) data on a
first level data cache miss (and on I/O or special registers operations). Fill buffers are the inter-
mediary between the CPU cache and the CPU out-of-order execution engine. They may retain
data from prior memory requests, which may be speculatively forwarded to a load operation.
■ Load ports Load ports are temporary internal CPU structures used to perform load opera-
tions from memory or I/O ports.
Microarchitectural buffers usually belong to a single CPU core and are shared between SMT threads. This implies that, even if attacks on those structures are hard to achieve in a reliable way, the speculative extraction of secret data stored into them is also potentially possible across SMT threads (under specific conditions).

In general, the outcome of all the hardware side-channel vulnerabilities is the same: secrets will be

spoiled from the victim address space. Windows implements various mitigations for protecting against

Spectre, Meltdown, and almost all the described side-channel attacks.

---

## Side-channel mitigations in Windows

This section takes a peek at how Windows implements various mitigations for defending against sidechannel attacks. In general, some side-channel mitigations are implemented by CPU manufacturers through microcode updates. Not all of them are always available, though; some mitigations need to be enabled by the software (Windows kernel).

### KVA Shadow

Kernel virtual address shadowing, also known as KVA shadow (or KPTI in the Linux world, which stands

for Kernel Page Table Isolation) mitigates the Meltdown attack by creating a distinct separation be tween the kernel and user page tables. Speculative execution allows the CPU to spoil kernel data when

the processor is not at the correct privilege level to access it, but it requires that a valid page frame

number be present in the page table translating the target kernel page. The kernel memory targeted

by the Meltdown attack is generally translated by a valid leaf entry in the system page table, which

indicates only supervisor privilege level is allowed. (Page tables and virtual address translation are cov ered in Chapter 5 of Part 1.) When KVA shadow is enabled, the system allocates and uses two top-level

page tables for each process:

- ■ The kernel page tables map the entire process address space, including kernel and user pages.

In Windows, user pages are mapped as nonexecutable to prevent kernel code to execute mem-

ory allocated in user mode (an effect similar to the one brought by the hardware SMEP feature).

■ The User page tables (also called shadow page tables) map only user pages and a minimal set

of kernel pages, which do not contain any sort of secrets and are used to provide a minimal

functionality for switching page tables, kernel stacks, and to handle interrupts, system calls, and

other transitions and traps. This set of kernel pages is called transition address space.
In the transition address space, the NT kernel usually maps a data structure included in the processor's PROC, called KPROCESSOR_DESCRIPTOR_AREA, which includes data that needs to be shared between the user (or shadow) and kernel page tables, like the processor's TSS, GDT, and a copy of the kernel mode GS segment base address. Furthermore, the transition address space includes all the shadow trap handlers located in the "KVASCODE" section of the NT kernel image.

A system with KVA shadow enabled runs unprivileged user-mode threads (i.e., running without

Administrator-level privileges) in processes that do not have mapped any kernel page that may contain

secrets. The Meltdown attack is not effective anymore; kernel pages are not mapped as valid in the

process's page table, and any sort of speculation in the CPU targeting those pages simply cannot

happen. When the user process invokes a system call, or when an interrupt happens while the CPU is

executing code in the user-mode process, the CPU builds a trap frame on a transition stack, which, as

specified before, is mapped in both the user and kernel page tables. The CPU then executes the code

of the shadow trap handler that handles the interrupt or system call. The latter normally switches to

the kernel page tables, copies the trap frame on the kernel stack, and then jumps to the original trap

handler (this implies that a well-defined algorithm for flushing stale entries in the TLB must be properly

implemented. The TLB flushing algorithm is described later in this section.) The original trap handler is

executed with the entire address space mapped.

CHAPTER 8 System mechanisms

---

## Initialization

The NT kernel determines whether the CPU is susceptible to Meltdown attack early in phase -1 of its initialization, after the processor feature bits are calculated, using the internal Kidetectkvaleakage routine. The latter obtains processor's information and sets the internal KiKvALeakage variable to 1 for all Intel processors except Atoms (which are in-order processors).

In case the internal Kikvaleakage variable is set, KVA shadowing is enabled by the system via the

Kienablekvashadowing routine, which prepares the processor's TSS (Task State Segment) and transition

stacks. The RSP0 (kernel) and IST stacks of the processor's TSS are set to point to the proper transition

stacks. Transition stacks (which are 512 bytes in size) are prepared by writing a small data structure,

called KIST_BASE_FRAME on the base of the stack. The data structure allows the transition stack to be

linked against its nontransition kernel stack (accessible only after the page tables have been switched),

as illustrated by Figure 8-8. Note that the data structure is not needed for the regular non-IST kernel

stacks. The OS obtains all the needed data for the user-to-kernel switch from the CPU's PRCB. Each

thread has a proper kernel stack. The scheduler set a kernel stack as active by linking it in the processor

PRCB when a new thread is selected to be executed. This is a key difference compared to the IST stacks,

which exist as one per processor.

![Figure](figures/Winternals7thPt2_page_050_figure_003.png)

FIGURE 8-8 Configuration of the CPU's Task State Segment (TSS) when KVA shadowing is active.

The Kienablekvashadowing routine also has the important duty of determining the proper TLB flush algorithm (explained later in this section). The result of the determination (global entries or PCIDs) is stored in the global Kikvashadowmode variable. Finally, for non-boot processors, the routine invokes KiShadowProcessorAllocation, which maps the per-processor shared data structures in the shadow page tables. For the BSP processor, the mapping is performed later in phase 1, after the SYSTEM process and its shadow page tables are created (and the IRQL is dropped to passive level). The shadow trap handlers are mapped in the user page tables only in this case (they are global and not per-processor specific).

## Shadow page tables

Shadow (or user) page tables are allocated by the memory manager using the internal MiAllocate

ProcessShadow routine only when a process's address space is being created. The shadow page tables

for the new process are initially created empty. The memory manager then copies all the kernel

shadow top-level page table entries of the SYSTEM process in the new process shadow page table.

CHAPTER 8    System mechanisms      19


---

This allows the OS to quickly map the entire transition address space (which lives in kernel and is

shared between all user-mode processes) in the new process. For the SYSTEM process, the shadow

page tables remain empty. As introduced in the previous section, they will be filled thanks to the

KiShadowProcessorAllocation routine, which uses memory manager services to map individual chunks

of memory in the shadow page tables and to rebuild the entire page hierarchy.

The shadow page tables are updated by the memory manager only in specific cases. Only the kernel can write in the process page tables to map or unmap chunks of memory. When a request to allocate or map new memory into a user process address space, it may happen that the top-level page table entry for a particular address would be missing. In this case, the memory manager allocates all the pages for the entire page-table hierarchy and stores the new top-level PTE in the kernel page tables. However, in case KVA shadow is enabled, this is not enough; the memory manager must also write the top-level PTE on the shadow page table. Otherwise, the address will be not present in the user-mapping after the trap handler correctly switches the page tables before returning to user mode.

Kernel addresses are mapped in a different way in the transition address space compared to the

kernel page tables. To prevent false sharing of addresses close to the chunk of memory being mapped

in the transition address space, the memory manager always recreates the page table hierarchy map ping for the PTE(s) being shared. This implies that every time the kernel needs to map some new pages

in the transition address space of a process, it must replicate the mapping in all the processes shadow

page tables (the internal Micopytoplevelmappings routine performs exactly this operation).

## TLB flushing algorithm

In the x86 architecture, switching page tables usually results in the flushing of the current processor's TLB (translation look-aside buffer). The TLB is a cache used by the processor to quickly translate the virtual addresses that are used while executing code or accessing data. A valid entry in the TLB allows the processor to avoid consulting the page tables chain, making execution faster. In systems without KVA shadow, the entries in the TLB that translate kernel addresses do not need to be explicitly flushed; in Windows, the kernel address space is mostly unique and shared between all processes. Intel and AMD introduced different techniques to avoid flushing kernel entries on every page table switching, like the global/non-global bit and the Process-Context Identifiers (PCIDs). The TLB and its flushing methodologies are described in detail in the Intel and AMD architecture manuals and are not further discussed in this book.

Using the new CPU features, the operating system is able to only flush user entries and keep performance fast. This is clearly not acceptable in KVA shadow scenarios where a thread is obliged to switch page tables even when entering or exiting the kernel. In systems with KVA enabled, Windows employs an algorithm able to explicitly flush kernel and user TLB entries only when needed, achieving the following two goals:

- ● No valid kernel entries will be ever maintained in the TLB when executing a thread user-code.
Otherwise, this could be leveraged by an attacker with the same speculation techniques used in
Meltdown, which could lead her to read secret kernel data.

● Only the minimum amount of TLB entries will be flushed when switching page tables. This will
keep the performance degradation introduced by KVA shadowing acceptable.
---

The TLB flushing algorithm is implemented in mainly three scenarios: context switch, trap entry, and trap exit. It can run on a system that either supports only the global/non-global bit or also PCIDs. In the former case, differently from the non-KVA shadow configurations, all the kernel pages are labelled as non-global, whereas the transition and user pages are labelled as global. Global pages are not flushed while a page table switch happens (the system changes the value of the CR3 register). Systems with PCID support labels kernel pages with PCID 2, whereas user pages are labelled with PCID 1. The global and non-global bits are ignored in this case.

When the current-executing thread ends its quantum, a context switch is initialized. When the kernel schedules execution for a thread belonging to another process address space, the TLB algorithm assures that all the user pages are removed from the TLB (which means that in systems with global/ non-global bit a full TLB flush is needed. User pages are indeed marked as global). On kernel trap exits (when the kernel finishes code execution and returns to user mode) the algorithm assures that all the kernel entries are removed (or invalidated) from the TLB. This is easily achievable: on processors with global/non-global bit support, just a reload of the page tables forces the processor to invalidate all the non-global pages, whereas on systems with PCID support, the user-page tables are reloaded using the User PCID, which automatically invalidates all the stale kernel TLB entries.

The strategy allows kernel trap entries, which can happen when an interrupt is generated while the

system was executing user code or when a thread invokes a system call, not to invalidate anything in

the TLB. A scheme of the described TLB flushing algorithm is represented in Table 8-1.

TABLE 8-1 KVA shadowing TLB flushing strategies

<table><tr><td>Configuration Type</td><td>User Pages</td><td>Kernel Pages</td><td>Transition Pages</td></tr><tr><td>KVA shadowing disabled</td><td>Non-global</td><td>Global</td><td>N / D</td></tr><tr><td>KVA shadowing enabled, PCID strategy</td><td>PCID 1, non-global</td><td>PCID 2, non-global</td><td>PCID 1, non-global</td></tr><tr><td>KVA shadowing enabled, global/non-global strategy</td><td>Global</td><td>Non-global</td><td>Global</td></tr></table>


## Hardware indirect branch controls (IBRS, IBPB, STIBP, SSBD)

Processor manufacturers have designed hardware mitigations for various side-channel attacks. Those mitigations have been designed to be used with the software ones. The hardware mitigations for sidechannel attacks are mainly implemented in the following indirect branch controls mechanisms, which are usually exposed through a bit in CPU model-specific registers (MSR):

- • Indirect Branch Restricted Speculation (IBRS) completely disables the branch predictor (and
clears the branch predictor buffer) on switches to a different security context (user vs kernel
mode or VM root vs VM non-root). If the OS sets IBRS after a transition to a more privileged
mode, predicted targets of indirect branches cannot be controlled by software that was ex-
ecuted in a less privileged mode. Additionally, when IBRS is on, the predicted targets of indirect
branches cannot be controlled by another logical processor. The OS usually sets IBRS to 1 and
keeps it on until it returns to a less privileged security context.
The implementation of IBRS depends on the CPU manufacturer; some CPUs completely disable branch predictors buffers when IBRS is set to on (describing an inhibit behavior), while some

CHAPTER 8    System mechanisms      21


---

others just flush the prediction buffers (describing a flush behavior). In those CPUs the IBRS mitigation control works in a very similar way to IBPB, so usually the CPU implements only IBRS.

- ■ Indirect Branch Predictor Barrier (IBPB) flushes the content of the branch predictors when
it is set to 1, creating a barrier that prevents software that executed previously from controlling
the predicted targets of indirect branches on the same logical processor.

■ Single Thread Indirect Branch Predictors (STBP) restricts the sharing of branch prediction
between logical processors on a physical CPU core. Setting STBP to 1 on a logical processor
prevents the predicted targets of indirect branches on a current executing logical processor
from being controlled by software that executes (or executed previously) on another logical
processor of the same core.

■ Speculative Store Bypass Disable (SSBD) instructs the processor to not speculatively execute
loads until the addresses of all older stores are known. This ensures that a load operation does
not speculatively consume stale data values due to bypassing an older store on the same logi-
cal processor, thus protecting against Speculative Store Bypass attack (described earlier in the
"Other side-channel attacks" section).
The NT kernel employs a complex algorithm to determine the value of the described indirect branch

controls, which usually changes in the same scenarios described for KVA shadowing: context switches,

trap entries, and trap exits. On compatible systems, the system runs kernel code with IBRS always on (ex cept when Retpoline is enabled). When no IBRS is available (but IBPB and STIBP are supported), the kernel

runs with STIBP on, flushing the branch predictor buffers (with an IBPB) on every trap entry (in that way

the branch predictor can't be influenced by code running in user mode or by a sibling thread running in

another security context). SSBD, when supported by the CPU, is always enabled in kernel mode.

For performance reasons, user-mode threads are generally executed with no hardware speculation

mitigations enabled or just with STIPB on (depending on STIPB pairing being enabled, as explained in

the next section). The protection against Speculative Store Bypass must be manually enabled if needed

through the global or per-process Speculation feature. Indeed, all the speculation mitigations can be

fine-tuned through the global HKLM\System\CurrentControlSet\Control\Session Manager\Memory

Management\FeatureSettings registry value. The value is a 32-bit bitmask, where each bit corresponds

to an individual setting. Table 8-2 describes individual feature settings and their meaning.

TABLE 8-2 Feature settings and their values

<table><tr><td>Name</td><td>Value</td><td>Meaning</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_IBRS_EXCEPT_HVROOT</td><td>0x1</td><td>Disable IBRS except for non-nested root partition (default setting for Server SKUs)</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_KVA_SHADOW</td><td>0x2</td><td>Force KVA shadowing to be disabled</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_IBRS</td><td>0x4</td><td>Disable IBRS, regardless of machine configuration</td></tr><tr><td>FEATURE_SETTINGS_SET_SSBD_ALWAYS</td><td>0x8</td><td>Always set SSBD in kernel and user</td></tr><tr><td>FEATURE_SETTINGS_SET_SSBD_IN_KERNEL</td><td>0x10</td><td>Set SSBD only in kernel mode (leaving user-mode code to be vulnerable to SSB attacks)</td></tr><tr><td>FEATURE_SETTINGS_USER_STIBP_ALWAYS</td><td>0x20</td><td>Always keep STIBP on for user-threads, regardless of STIBP pairing</td></tr></table>


---

<table><tr><td>Name</td><td>Value</td><td>Meaning</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_USER_TO_USER</td><td>0x40</td><td>Disables the default speculation mitigation strategy (for AMD systems only) and enables the user-to-user only mitigation. When this flag is set, no speculation controls are set when running in kernel mode.</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_STBP_PAIRING</td><td>0x80</td><td>Always disable STBP pairing</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_RETPOLINE</td><td>0x100</td><td>Always disable Repoline</td></tr><tr><td>FEATURE_SETTINGS_FORCE_ENABLE_RETPOLINE</td><td>0x200</td><td>Enable Repoline regardless of the CPU support of IBP8 or IBRS (Retpoline needs at least IBP8 to prop-erly protect against Spectre v2)</td></tr><tr><td>FEATURE_SETTINGS_DISABLE_IMPORT_LINKING</td><td>0x200000</td><td>Disable Import Optimization regardless of Repoline</td></tr></table>


## Retpoline and import optimization

Keeping hardware mitigations enabled has strong performance penalties for the system, simply because the CPU's branch predictor is limited or disabled when the mitigations are enabled. This was not acceptable for games and mission-critical applications, which were running with a lot of performance degradation. The mitigation that was bringing most of the performance degradation was IBRS (or IBBP), while used for protecting against Spectre. Protecting against the first variant of Spectre was possible without using any hardware mitigations thanks to the memory fence instructions. A good example is the LFENCE, available in the x86 architecture. Those instructions force the processor not to execute any new operations speculatively before the fence itself completes. Only when the fence completes (and all the instructions located before it have been retired) will the processor's pipeline restart to execute (and to speculate) new opcodes. The second variant of Spectre was still requiring hardware mitigations, though, which implies all the performance problems brought by IBRS and IBBP.

To overcome the problem, Google engineers designed a novel binary-modification technique called Retpoline. The Retpoline sequence, shown in Figure 8-9, allows indirect branches to be isolated from speculative execution. Instead of performing a vulnerable indirect call, the processor jumps to a safe control sequence, which dynamically modifies the stack, captures eventual speculation, and lands to the new target thanks to a "return" operation.

```bash
Trampoline:
    call SetupTarget     ; push address of CaptureSpec on the stack
CaptureSpec:
    int 3                ; Breakpoint to capture speculation
    jmp CaptureSpec       ; (similar to a LFENCE barrier)
SetupTarget:
    mov QBWORD PTR [rsp], r10 ; Overwrite return address on the stack
    ret                        ; Return
```

FIGURE 8-9 Retpoline code sequence of x86 CPUs.

In Windows, Retpoline is implemented in the NT kernel, which can apply the Retpoline code sequence to itself and to external driver images dynamically through the Dynamic Value Relocation Table (DVRT). When a kernel image is compiled with Retpoline enabled (through a compatible compiler), the

---

compiler inserts an entry in the image's DVRT for each indirect branch that exists in the code, describing its address and type. The opcode that performs the indirect branch is kept as it is in the final code but augmented with a variable size padding. The entry in the DVRT includes all the information that the NT kernel needs to modify the indirect branch's opcode dynamically. This architecture ensures that external drivers compiled with Repoline support can run also on older OS versions, which will simply skip parsing the entries in the DVRT table.

Note The DVRT was originally developed for supporting kernel ASLR (Address Space Layout Randomization, discussed in Chapter 5 of Part 1). The table was later extended to include Retpoline descriptors. The system can identify which version of the table an image includes.

In phase -1 of its initialization, the kernel detects whether the processor is vulnerable to Spectre, and, in case the system is compatible and enough hardware mitigations are available, it enables Retpoline and applies it to the NT kernel image and the HAL. The RtlPerformRetpolineRelocationsOnImage routine scans the DVRT and replaces each indirect branch described by an entry in the table with a direct branch, which is not vulnerable to speculative attacks, targeting the Retpoline code sequence. The original target address of the indirect branch is saved in a CPU register (RIO in AMD and Intel processors), with a single instruction that overwrites the padding generated by the compiler. The Retpoline code sequence is stored in the RETPOL section of the NT kernel's image. The page backing the section is mapped in the end of each driver's image.

Before being started, boot drivers are physically relocated by the internal MlReloadBootLoadedDrivers routine, which also applies the needed fixes to each driver's image, including Retpoline. All the boot drivers, the NT kernel, and HAL images are allocated in a contiguous virtual address space by the Windows Loader and do not have an associated control area, rendering them not pageable. This means that all the memory backing the images is always resident, and the NT kernel can use the same RtlPerformRetpolineRelocationsOnImage function to modify each indirect branch in the code directly. If HVC1 is enabled, the system must call the Secure Kernel to apply Retpoline (through the PERFORMANCE_ RETPOLINE_RELOCATIONS secure call). Indeed, in that scenario, the driver's executable memory is protected against any modification, following the W*X principle described in Chapter 9. Only the Secure Kernel is allowed to perform the modification.

Note Retpoline and Import Optimization fixups are applied by the kernel to boot drivers before Patchguard (also known as Kernel Patch Protection; see Part 1, Chapter 7, "Security," for further details) initializes and protects some of them. It is illegal for drivers and the NT kernel itself to modify code sections of protected drivers.

Runtime drivers, as explained in Chapter 5 of Part 1, are loaded by the NT memory manager, which creates a section object backed by the driver's image file. This implies that a control area, including a prototype PTEs array, is created to track the pages of the memory section. For driver sections, some of the physical pages are initially brought in memory just for code integrity verification and then moved in the standby list. When the section is later mapped and the driver's pages are accessed for the first

---

time, physical pages from the standby list (or from the backing file) are materialized on-demand by the page fault handler. Windows applies Retpoline on the shared pages pointed by the prototype PTEs. If the same section is also mapped by a user-mode application, the memory manager creates new private pages and copies the content of the shared pages in the private ones, reverting Retpoline (and import Optimization) fixups.

![Figure](figures/Winternals7thPt2_page_056_figure_001.png)

Note Some newer Intel processors also speculate on "return" instructions. For those CPUs, Retpoline cannot be enabled because it would not be able to protect against Spectre v2. In this situation, only hardware mitigations can be applied. Enhanced IBRS (a new hardware mitigation) solves the performance problems of IBRS.

