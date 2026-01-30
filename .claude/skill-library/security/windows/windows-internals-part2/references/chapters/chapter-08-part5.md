## WoW64 (Windows-on-Windows)

WoW64 (Win32 emulation on 64-bit Windows) refers to the software that permits the execution of 32-bit applications on 64-bit platforms (which can also belong to a different architecture). WoW64 was originally a research project for running x86 code in old alpha and MIPS version of Windows NT 3.51. It has drastically evolved since then (that was around the year 1995). When Microsoft released Windows XP 64-bit edition in 2001, WoW64 was included in the OS for running old x86 32-bit applications in the new 64-bit OS. In modern Windows releases, WoW64 has been expanded to support also running ARM32 applications and x86 applications on ARM64 systems.

WoW64 core is implemented as a set of user-mode DLLs, with some support from the kernel for creating the target's architecture versions of what would normally only be 64-bit native data structures, such as the process environment block (PEB) and thread environment block (TEB). Changing WoW64 contexts through Get/SetThreadContext is also implemented by the kernel. Here are the core usermode DLLs responsible for WoW64:

104      CHAPTER 8    System mechanisms


---

- ■ Wow64.dll Implements the WoW64 core in user mode. Creates the thin software layer that

acts as a kind of intermediary kernel for 32-bit applications and starts the simulation. Handles

CPU context state changes and base system calls exported by Ntoskrnl.exe. It also implements

file-system redirection and registry redirection.

■ Wow64win.dll Implements thinking (conversion) for GUI system calls exported by Win32k.

sys. Both Wow64win.dll and Wow64.dll include thinking code, which converts a calling conven-

tion from an architecture to another one.
Some other modules are architecture-specific and are used for translating machine code that belongs to a different architecture. In some cases (like for ARM64) the machine code needs to be emulated or jittered. In this book, we use the term jittering to refer to the just-in-time compilation technique that involves compilation of small code blocks (called compilation units) at runtime instead of emulating and executing one instruction at a time.

Here are the DLLs that are responsible in translating, emulating, or jittering the machine code, allowing it to be run by the target operating system:

- • Wow64cpu.dll Implements the CPU simulator for running x86 32-bit code in AMD64 op-
erating systems. Manages the 32-bit CPU context of each running thread inside WoW64 and
provides processor architecture-specific support for switching CPU mode from 32-bit to 64-bit
and vice versa.
• Wowarmh.wdII Implements the CPU simulator for running ARM32 (AArch32) applications on
ARM64 systems. It represents the ARM64 equivalent of the Wow64cpu.dll used in x86 systems.
• Xtajit.dll Implements the CPU emulator for running x86 32-bit applications on ARM64
systems. Includes a full x86 emulator, a jitter (code compiler), and the communication protocol
between the jitter and the XTA cache server. The jitter can create compilation blocks including
ARM64 code translated from the x86 image. Those blocks are stored in a local cache.
The relationship of the WoW64 user-mode libraries (together with other core WoW64 components) is shown in Figure 8-28.

![Figure](figures/Winternals7thPt2_page_136_figure_005.png)

FIGURE 8-28 The WoW64 architecture.

---

![Figure](figures/Winternals7thPt2_page_137_figure_000.png)

Note Older Windows versions designed to run in Itanium machines included a full x86 emulator integrated in the WoW64 layer called Wowia32x.dll. Itanium processors were not able to natively execute x86 32-bit instructions in an efficient manner, so an emulator was needed.


The Itanium architecture was officially discontinued in January 2019.

A newer Insider release version of Windows also supports executing 64-bit x86 code on

ARM64 systems. A new jitter has been designed for that reason. However emulating AMD64

code in ARM systems is not performed through WoW64. Describing the architecture of the

AMD64 emulator is outside the scope of this release of this book.

## The WoW64 core

As introduced in the previous section, the WoW64 core is platform independent: It creates a software

layer for managing the execution of 32-bit code in 64-bit operating systems. The actual translation is

performed by another component called Simulator (also known as Binary Translator), which is platform

specific. In this section, we will discuss the role of the WoW64 core and how it interoperates with the

Simulator. While the core of WoW64 is almost entirely implemented in user mode (in the Wow64.dll

library), small parts of it reside in the NT kernel.

### WoW64 core in the NT kernel

During system startup (phase 1), the I/O manager invokes the PssLocateSystemDlls routine, which maps all the system DLLs supported by the system (and stores their base addresses in a global array) in the System process user address space. This also includes WoW64 versions of Ntllid, as described by Table 8-13. Phase 2 of the process manager (PS) startup resolves some entry points of those DLLs, which are stored in internal kernel variables. One of the exports, LdrSystemDllInitBlock, is used to transfer WoW64 information and function pointers to new WoW64 processes.

TABLE 8-13 Different Ntdll version list

<table><tr><td>Path</td><td>Internal Name</td><td>Description</td></tr><tr><td>c:\windows\system32\ntdll.dll</td><td>ntdll.dll</td><td>The system Ntdll mapped in every user process (except for minimal processes). This is the only version marked as required.</td></tr><tr><td>c:\windows\SysWow64\ntdll.dll</td><td>ntdll32.dll</td><td>32-bit x86 Ntdll mapped in WoW64 processes running in 64-bit x86 host systems.</td></tr><tr><td>c:\windows\SysArm32\ntdll.dll</td><td>ntdll32.dll</td><td>32-bit ARM Ntdll mapped in WoW64 processes running in 64-bit ARM host systems.</td></tr><tr><td>c:\windows\SyChpe32\ntdll.dll</td><td>ntdllwow.dll</td><td>32-bit x86 CHPE Ntdll mapped in WoW64 processes running in 64-bit ARM host systems.</td></tr></table>


When a process is initially created, the kernel determines whether it would run under WoW64 using an algorithm that analyzes the main process executable PE image and checks whether the correct Ntllll version is mapped in the system. In case the system has determined that the process is WoW64, when the kernel initializes its address space, it maps both the native Ntllll and the correct WoW64 version.

---

As explained in Chapter 3 of Part 1, each nonminimal process has a PEB data structure that is accessible from user mode. For WoW64 processes, the kernel also allocates the 32-bit version of the PEB and stores a pointer to it in a small data structure (EWOW64PROCESS) linked to the main EPROCESS representing the new process. The kernel then fills the data structure described by the 32-bit version of the LdrSystemDllInitBlock symbol, including pointers of Wow64 Ndtll exports.

When a thread is allocated for the process, the kernel goes through a similar process: along with the thread initial user stack (its initial size is specified in the PE header of the main image), another stack is allocated for executing 32-bit code. The new stack is called the thread's WoW64 stack. When the thread's TEB is built, the kernel will allocate enough memory to store both the 64-bit TEB, followed by a 32-bit TEB.

Furthermore, a small data structure (called WoW64 CPU Area Information) is allocated at the base of the 64-bit stack. The latter is composed of the target images machine identifier, a platform-dependent 32-bit CPU context (X86_NT5_CONTEXT or ARM_CONTEXT data structures, depending on the target architecture), and a pointer of the per-thread WoW64 CPU shared data, which can be used by the

Simulator. A pointer to this small data structure is stored also in the thread's TLS slot 1 for fast referencing by the binary translator. Figure 8-29 shows the final configuration of a WoW64 process that contains an initial single thread.

![Figure](figures/Winternals7thPt2_page_138_figure_003.png)

FIGURE 8-29 Internal configuration of a WoW64 process with only a single thread.

CHAPTER 8    System mechanisms      107


---

## User-mode WoW64 core

Aside from the differences described in the previous section, the birth of the process and its initial thread happen in the same way as for non-WoW64 processes, until the main thread starts its execution by invoking the loader initialization function, LdrpInitialize, in the native version of Ntdll. When the loader detects that the thread is the first to be executed in the context of the new process, it invokes the process initialization routine, LdrpInitializeProcess, which, along with a lot of different things (see the "Early process initialization" section of Chapter 3 in Part 1 for further details), determines whether the process is a WoW64 one, based on the presence of the 32-bit TEB (located after the native TEB and linked to it). In case the check succeeded, the native Ntdll sets the internal UseWoW64 global variable to 1, builds the path of the WoW64 core library, wow64.dll, and maps it above the 4 GB virtual address space limit (in that way it can't interfere with the simulated 32-bit address space of the process.) It then gets the address of some WoW64 functions that deal with process/thread suspension and APC and exception dispatching and stores them in some of its internal variables.

When the process initialization routine ends, the Windows loader transfers the execution to the

WoW64 Core via the exported Wow64 drpInitialize routine, which will never return. From now on, each

new thread starts through that entry point (instead of the classical RtlUserThreadStart). The WoW64

core obtains a pointer to the CPU WoW64 area stored by the kernel at the TLS slot 1. In case the thread

is the first of the process, it invokes the WoW64 process initialization routine, which performs the fol lowing steps:

- 1. Tries to load the WoW64 Thunk Logging DLL (wow64log.dll). The DLL is used for logging
WoW64 calls and is not included in commercial Windows releases, so it is simply skipped.

2. Looks up the Ntdll32 base address and function pointers thanks to the LdrSystemDllinitBlock
filled by the NT kernel.

3. Initializes the files system and registry redirection. File system and registry redirection are
implemented in the Syscall layer of WoW64 core, which intercepts 32-bit registry and files sys-
tem requests and translates their path before invoking the native system calls.

4. Initializes the WoW64 service tables, which contains pointers to system services belonging to
the NT kernel and Win32k GUI subsystem (similar to the standard kernel system services), but
also Console and NLS service call (both WoW64 system service calls and redirection are cov-
ered later in this chapter)

5. Fills the 32-bit version of the process's PEB allocated by the NT kernel and loads the correct CPU
simulator, based on the process main image's architecture. The system queries the "default"
registry value of the HKLM\SOFTWARE\Microsoft\Wow64\arch> key (where <arch> can be
x86 or arm, depending on the target architecture), which contains the simulator's main DLL
name. The simulator is then loaded and mapped in the process's address space. Some of its
exported functions are resolved and stored in an internal array called BtFuncs. The array is the
key that links the platform-specific binary translator to the WoW64 subsystem: WoW64 invokes
simulator's functions only through it. The BtCpuProcessInit function, for example, represents
the simulator's process initialization routine.
---

- 6. The thunking cross-process mechanism is initialized by allocating and mapping a 16 KB shared

section. A synthesized work item is posted on the section when a WoW64 process calls an

API targeting another 32-bit process (this operation propagates thunk operations across

different processes).

7. The WoW64 layer informs the simulator (by invoking the exported BtCpuNotifyMapViewOfSection)

that the main module, and the 32-bit version of Ndtll have been mapped in the address space.

8. Finally, the WoW64 core stores a pointer to the 32-bit system call dispatcher into the

Wow64Transition exported variable of the 32-bit version of Ndtll. This allows the system call

dispatcher to work.
When the process initialization routine ends, the thread is ready to start the CPU simulation. It

invokes the Simulator's thread initialization function and prepares the new 32-bit context, translating

the 64-bit one initially filled by the NT kernel. Finally, based on the new context, it prepares the 32-bit

stack for executing the 32-bit version of the LdrInitializeThunk function. The simulation is started via the

simulator's BTCpuSimulate exported function, which will never return to the caller (unless a critical error

in the simulator happens).

## File system redirection

To maintain application compatibility and to reduce the effort of porting applications from Win32 to

64-bit Windows, system directory names were kept the same. Therefore, the WindowsSystem32 folder

contains native 64-bit images. WoW64, as it intercepts all the system calls, translates all the path re lated APIs and replaces various system paths with the WoW64 equivalent (which depends on the target

process's architecture), as listed in Table 8-14. The table also shows paths redirected through the use of

system environment variables. (For example, the %PROGRAMFILES% variable is also set to \Program Files

(x86) for 32-bit applications, whereas it is set to the \Program Files folder for 64-bit applications.)

TABLE 8-14 WoW64 redirected paths

<table><tr><td>Path</td><td>Architecture</td><td>Redirected Location</td></tr><tr><td rowspan="3">c:\windows\system32</td><td>XB6 on AMD64</td><td>C:\Windows\SysWow64</td></tr><tr><td>XB6 on ARM64</td><td>C:\Windows\SyChpe32 (or C:\Windows\SysWow64 if the target file does not exist in SyChpe32)</td></tr><tr><td>ARM32</td><td>C:\Windows\SysArm32</td></tr><tr><td rowspan="3">%ProgramFiles%</td><td>Native</td><td>C:\Program Files</td></tr><tr><td>XB6</td><td>C:\Program Files (x86)</td></tr><tr><td>ARM32</td><td>C:\Program Files (Arm)</td></tr><tr><td rowspan="3">%CommonProgramFiles%</td><td>Native</td><td>C:\Program Files\Common Files</td></tr><tr><td>XB6</td><td>C:\Program Files (x86)</td></tr><tr><td>ARM32</td><td>C:\Program Files (Arm)\Common Files</td></tr></table>


---

<table><tr><td rowspan="2">C:\Windows\regedit.exe</td><td>X86</td><td>C:\Windows\SysWow64\regedit.exe</td></tr><tr><td>ARM32</td><td>C:\Windows\Sys Arm32\regedit.exe</td></tr><tr><td rowspan="2">C:\Windows\LastGood\System32</td><td>X86</td><td>C:\Windows\LastGood\SysWow64</td></tr><tr><td>ARM32</td><td>C:\Windows\LastGood\Sys Arm32</td></tr></table>


There are a few subdirectories of Windows/System32 that, for compatibility and security reasons,

are exempted from being redirected such that access attempts to them made by 32-bit applications

actually access the real one. These directories include the following:

- ■ %windir%\system32\catroot and %windir%\system32\catroot2

■ %windir%\system32\driverstore

■ %windir%\system32\drivers\etc

■ %windir%\system32\hostdriverstore

■ %windir%\system32\logfiles

■ %windir%\system32\spool
Finally, WoW64 provides a mechanism to control the file system redirection built into WoW64 on a

per-thread basis through the Wow64DisableWow64FsRedirection and Wow64RevertWow64FsRedirection

functions. This mechanism works by storing an enabled/disabled value on the TLS index 8, which is

consulted by the internal Wow64 RedirectPath function. However, the mechanism can have issues

with delay-loaded DLLs, opening files through the common file dialog and even internationalization—

because once redirection is disabled, the system no longer uses it during internal loading either, and

certain 64-bit-only files would then fail to be found. Using the %SystemRoot%\Sysnative path or some of

the other consistent paths introduced earlier is usually a safer methodology for developers to use.

![Figure](figures/Winternals7thPt2_page_141_figure_004.png)

Note Because certain 32-bit applications might indeed be aware and able to deal with 64-bit images, a virtual directory, WindowsSysnative, allows any I/Os originating from a 32-bit application to this directory to be exempted from file redirection. This directory doesn't actually exist—it is a virtual path that allows access to the real System32 directory, even from an application running under WoW64.

## Registry redirection

Applications and components store their configuration data in the registry. Components usually write their configuration data in the registry when they are registered during installation. If the same component is installed and registered both as a 32-bit binary and a 64-bit binary, the last component registered will override the registration of the previous component because they both write to the same location in the registry.

110      CHAPTER 8    System mechanisms


---

To help solve this problem transparently without introducing any code changes to 32-bit components, the registry is split into two portions: Native and WoW64. By default, 32-bit components access the 32-bit view, and 64-bit components access the 64-bit view. This provides a safe execution environment for 32-bit and 64-bit components and separates the 32-bit application state from the 64-bit one, if it exists.

As discussed later in the "System calls" section, the WoW64 system call layer intercepts all the system calls invoked by a 32-bit process. When WoW64 intercepts the registry system calls that open or create a registry key, it translates the key path to point to the WoW64 view of the registry (unless the caller explicitly asks for the 64-bit view). WoW64 can keep track of the redirected keys thanks to multiple tree data structures, which store a list of shared and split registry keys and subkeys (an anchor tree node defines where the system should begin the redirection). WoW64 redirects the registry at these points:

- ● HKLM\SOFTWARE

● HKEY\CLASSES_ROOT
Not the entire hive is split. Subkeys belonging to those root keys can be stored in the private

WoW64 part of the registry (in this case, the subkey is a split key). Otherwise, the subkey can be kept

shared between 32-bit and 64-bit apps (in this case, the subkey is a shared key). Under each of the split

keys (in the position tracked by an anchor node), WoW64 creates a key called WoW6432Node (for x86

application) or WowA432Node (for ARM32 applications). Under this key is stored 32-bit configuration

information. All other portions of the registry are shared between 32-bit and 64-bit applications (for

example, HLKM\SYSTEM).

As extra help, if an x86 32-bit application writes a REG_SZ or REG_EXPAND_SZ value that starts with the data "%ProgramFiles%" or "%CommonProgramFiles%" to the registry, WoW64 modifies the actual values to "%ProgramFiles(x86)% and "%CommonProgramFiles(x86)%" to match the file system redirection and layout explained earlier. The 32-bit application must write exactly these strings using this case—any other data will be ignored and written normally.

For applications that need to explicitly specify a registry key for a certain view, the following flags on the RegOpenKeyEx, RegCreateKeyEx, RegOpenKeyTransacted, RegCreateKeyTransected, and RegDeleteKeyEx functions permit this:

- KEY WoW64_64KEY Explicitly opens a 64-bit key from either a 32-bit or 64-bit application

and disables the REG_SZ or REG_EXPAND_SZ interception explained earlier

KEY WoW64_32KEY Explicitly opens a 32-bit key from either a 32-bit or 64-bit application
## X86 simulation on AMD64 platforms

The interface of the x86 simulator for AMD64 platforms (Wow64cpu.dll) is pretty simple. The simulator process initialization function enables the fast system call interface, depending on the presence of software MBEC (Mode Based Execute Control is discussed in Chapter 9). When the WoW64 core starts the simulation by invoking the BtCPUSimulate simulator's interface, the simulator builds the WoW64 stack frame (based on the 32-bit CPU context provided by the WoW64 core), initializes the Turbo thunks

CHAPTER 8    System mechanisms      111


---

array for dispatching fast system calls, and prepares the FS segment register to point to the thread's 32-bit TEB. It finally sets up a call gate targeting a 32-bit segment (usually the segment 0x20), switches the stacks, and emits a far jump to the final 32-bit entry point (at the first execution, the entry point is set to the 32-bit version of the LdrInitializeThunk loader function). When the CPU executes the far jump, it detects that the call gate targets a 32-bit segment, thus it changes the CPU execution mode to 32-bit. The code execution exits 32-bit mode only in case of an interrupt or a system call being dispatched. More details about call gates are available in the Intel and AMD software development manuals.

![Figure](figures/Winternals7thPt2_page_143_figure_001.png)

Note During the first switch to 32-bit mode, the simulator uses the IRET opcode instead of a far call. This is because all the 32-bit registers, including volatile registers and EFLAGS, need to be initialized.

## System calls

For 32-bit applications, the WoW64 layer acts similarly to the NT kernel: special 32-bit versions of Ntllll.

dll, User32.dll, and Gdi32.dll are located in the WindowsSyswow64 folder (as well as certain other

DLLs that perform interprocess communication, such as Rpcrt4.dll). When a 32-bit application requires

assistance from the OS, it invokes functions located in the special 32-bit versions of the OS libraries.

Like their 64-bit counterparts, the OS routines can perform their job directly in user mode, or they can

require assistance from the NT kernel. In the latter case, they invoke system calls through stub func tions like the one implemented in the regular 64-bit NtDll. The stub places the system call index into a

register, but instead of issuing the native 32-bit system call instruction, it invokes the WoW64 system

call dispatcher (through the Wow64Transition variable compiled by the WoW64 core).

The WoW64 system call dispatcher is implemented in the platform-specific simulator (wow64cpu.dll). It emits another far jump for transitioning to the native 64-bit execution mode, exiting from the simulation. The binary translator switches the stack to the 64-bit one and saves the old CPU's context. It then captures the parameters associated with the system call and converts them. The conversion process is called "thunking" and allows machine code executed following the 32-bit ABI to interoperate with 64-bit code. The calling convention (which is described by the ABI) defines how data structure, pointers, and values are passed in parameters of each function and accessed through the machine code.

Thinking is performed in the simulator using two strategies. For APIs that do not interoperate with complex data structures provided by the client (but deal with simple input and output values), the Turbo thunks (small conversion routines implemented in the simulator) take care of the conversion and directly invoke the native 64-bit API. Other complex APIs need the Wow64SystemServiceEx routine's assistance, which extracts the correct WoW64 system call table number from the system call index and inves the correct WoW64 system call function. WoW64 system calls are implemented in the WoW64 core library and in Wow64win.dll and have the same name as the native system calls but with the wh- prefix. (So, for example, the WNTCreateFile WoW64 API is called wNTCreateFile.)

After the conversion has been correctly performed, the simulator issues the corresponding native 64-bit system call. When the native system call returns, WoW64 converts (or thunks) any output parameters if necessary, from 64-bit to 32-bit formats, and restarts the simulation.

112      CHAPTER 8    System mechanisms


---

### Exception dispatching

Similar to WoW64 system calls, exception dispatching forces the CPU simulation to exit. When an exception happens, the NT kernel determines whether it has been generated by a thread executing usermode code. If so, the NT kernel builds an extended exception frame on the active stack and dispatches the exception by returning to the user-mode KiUserExceptionDispatcher function in the 64-bit Ntdll (for more information about exceptions, refer to the "Exception dispatching" section earlier in this chapter).

Note that a 64-bit exception frame (which includes the captured CPU context) is allocated in the 32-bit stack that was currently active when the exception was generated. Thus, it needs to be converted before being dispatched to the CPU simulator. This is exactly the role of the


Wow64PrepareForException function (exported by the WoW64 core library), which allocates space on the native 64-bit stack and copies the native exception frame from the 32-bit stack in it. It then switches to the 64-bit stack and converts both the native exception and context records to their relative 32-bit counterpart, storing the result on the 32-bit stack (replacing the 64-bit exception frame). At this point, the WoW64 Core can restart the simulation from the 32-bit version of the KIUserExceptionDispatcher function, which dispatches the exception in the same way the native 32-bit Ntldll would.

32-bit user-mode APC delivery follows a similar implementation. A regular user-mode APC is

delivered through the native Ntll's KIUserApcDispatcher. When the 64-bit kernel is about to dispatch

a user-mode APC to a WoW64 process, it maps the 32-bit APC address to a higher range of 64-bit ad dress space. The 64-bit Ntll then invokes the Wow64ApcRoutine runtime exported by the WoW64 core

library, which captures the native APC and context record in user mode and maps it back in the 32-bit

stack. It then prepares a 32-bit user-mode APC and context record and restarts the CPU simulation

from the 32-bit version of the KIUserApcDispatcher function, which dispatches the APC the same way

the native 32-bit Ntll would.

## ARM

ARM is a family of Reduced Instruction Set Computing (RISC) architectures originally designed by the ARM Holding company. The company, unlike Intel and AMD, designs the CPU's architecture and licenses it to other companies, such as Qualcomm and Samsung, which produce the final CPUs. As a result, there have been multiple releases and versions of the ARM architecture, which have quickly evolved during the years, starting from very simple 32-bit CPUs, initially brought by the ARMv3 generation in the year 1993, up to the latest ARMv8. The latest ARM64v8.2 CPUs natively support multiple execution modes (or states), most commonly AArch32, Thumb-2, and AArch64.

- ■ AArch32 is the most classical execution mode, where the CPU executes 32-bit code only and
transfers data to and from the main memory through a 32-bit bus using 32-bit registers.
■ Thumb-2 is an execution state that is a subset of the AArch32 mode. The Thumb instruction set has
been designed for improving code density in low-power embedded systems. In this mode, the CPU
can execute a mix of 16-bit and 32-bit instructions, while still accessing 32-bit registers and memory.
■ AArch64 is the modern execution mode. The CPU in this execution state has access to 64-bit
general purpose registers and can transfer data to and from the main memory through a
64-bit bus.
---

Windows 10 for ARM64 systems can operate in the AArch64 or Thumb-2 execution mode (AArch32 is generally not used). Thumb-2 was especially used in old Windows RT systems. The current state of an ARM64 processor is determined also by the current Exception level (EL), which defines different levels of privilege: ARM currently defines three exception levels and two security states. They are both discussed more in depth in Chapter 9 and in the ARM Architecture Reference Manual.

## Memory models

In the "Hardware side-channel vulnerabilities" earlier in this chapter, we introduced the concept of a cache coherency protocol, which guarantees that the same data located in a CPU's core cache is observed while accessed by multiple processors (MESI is one of the most famous cache coherency protocols). Like the cache coherency protocol, modern CPUs also should provide a memory consistency (or ordering) model for solving another problem that can arise in multiprocessor environments: memory reordering. Some architectures (ARM64 is an example) are indeed free to re-order memory accesses with the goal to make more efficient use of the memory subsystem and parallelize memory access instructions (achieving better performance while accessing the slower memory bus). This kind of architecture follows a weak memory model, unlike the AMD64 architecture, which follows a strong memory model, in which memory access instructions are generally executed in program order. Weak models allow the processor to be faster and access the memory in a more efficient way but bring a lot of synchronization issues when developing multiprocessor software. In contrast, a strong model is more intuitive and stable, but it has the big drawback of being slower.

CPUs that can do memory reordering (following the weak model) provide some machine instructions that act as memory barriers . A barrier prevents the processor from reordering memory accesses before and after the barrier, helping multiprocessors synchronization issues. Memory barriers are slow; thus, they are used only when strictly needed by critical multiprocessor code in Windows, especially in synchronization primitives (like spinlocks, mutexes, pushlocks, and so on).

As we describe in the next section, the ARM64 jitter always makes use of memory barriers while translating x86 code in a multiprocessor environment. Indeed, it can't infer whether the code that will execute could be run by multiple threads in parallel at the same time (and thus have potential synchronization issues. X86 follows a strong memory model, so it does not have the reordering issue, a part of generic out-of-order execution as explained in the previous section).

![Figure](figures/Winternals7thPt2_page_145_figure_005.png)

Note Other than the CPU, memory reordering can also affect the compiler, which, during compilation time, can reorder (and possibly remove) memory references in the source code for efficiency and speed reasons. This kind of reordering is called compiler reordering, whereas the type described in the previous section is processor reordering.

---

## ARM32 simulation on ARM64 platforms

The simulation of ARM32 applications under ARM64 is performed in a very similar way as for x86 under AMD64. As discussed in the previous section, an ARM64v8 CPU is capable of dynamic switching between the AArch64 and Thumb-2 execution state (so it can execute 32-bit instructions directly in hardware). However, unlike AMD64 systems, the CPU can't switch execution mode in user mode via a specific intruction, so the WoWe64 layer needs to invoke the NT kernel to request the execution mode switch. To do this, the BtCpuSimulate function, exported by the ARM-on-ARM64 CPU simulator (Wowarmfw.dll), saves the nonvolatile AArch64 registers in the 64-bit stack, restores the 32-bit context stored in WoW64 CPU area, and finally emits a well-defined system call (which has an invalid syscall number, -1).

The NT kernel exception handler (which, on ARM64, is the same as the syscall handler), detects that the exception has been raised due to a system call, thus it checks the syscall number. In case the number is the special -1, the NT kernel knows that the request is due to an execution mode change coming from WoW64. In that case, it invokes the KiEnter32BitMode routine, which sets the new execution state for the lower EL (exception level) to AArch32, dismisses the exception, and returns to user mode.

The code starts the execution in AArch32 state. Like the x86 simulator for AMD64 systems, the execution controls return to the simulator only in case an exception is raised or a system call is invoked. Both exceptions and system calls are dispatched in an identical way as for the x86 simulator under AMD64.

## X86 simulation on ARM64 platforms

The x86-on-ARM64 CPU simulator (Xatjit.dll) is different from other binary translators described in the

previous sections, mostly because it cannot directly execute x86 instructions using the hardware. The

ARM64 processor is simply not able to understand any x86 instruction. Thus, the x86-on-ARM simula tor implements a full x86 emulator and a jitter, which can translate blocks of x86 opcodes in AArch64

code and execute the translated blocks directly.

When the simulator process initialization function (BtCPUProcessInit) is invoked for a new WoW64 process, it builds the jitter main registry key for the process by combining the HKLM\SOFTWARE\Microsoft\ Wow64\x86.xrtajit path with the name of the main process image. If the key exists, the simulator queries multiple configuration information from it (most common are the multiprocessor compatibility and JIT block threshold size. Note that the simulator also queries configuration settings from the application compatibility database.) The simulator then allocates and compiles the Syscall page, which, as the name implies, is used for emitting x86 syscalls (the page is then linked to Ntall thanks to the Wow64Transition variable). At this point, the simulator determines whether the process can use the XTA cache.

The simulator uses two different caches for storing precompiled code blocks: The internal cache is allocated per-thread and contains code blocks generated by the simulator while compiling x86 code executed by the thread (those code blocks are called jitted blocks); the external XTA cache is managed by the XtaCache service and contains all the jittered blocks generated lazily for an x86 image by the XTaCache service. The per-image XTA cache is stored in an external cache file (more details provided later in this chapter.) The process initialization routine allocates also the Compile Hybrid Executable (CHPE) bitmap, which covers the entire 4-GB address space potentially used by a 32-bit process. The bitmap uses a single bit to indicate that a page of memory contains CHPE code (CHPE is described later in this chapter.)

CHAPTER 8    System mechanisms      115


---

The simulator thread initialization routine (BTCcuThreadInit) initializes the compiler and allocates the per-thread CPU state on the native stack, an important data structure that contains the per-thread compiler state, including the x86 thread context, the x86 code emitter state, the internal code cache, and the configuration of the emulated x86 CPU (sigmoid registers, FPU state, emulated CPUIDs).

## Simulator's image load notification

Unlike any other binary translator, the x86-on-ARM64 CPU simulator must be informed any time a new image is mapped in the process address space, including for the CHPE Ntdll. This is achieved thanks to the WoW64 core, which intercepts when the NtMapViewOfSection native API is called from the 32-bit code and informs the Xtajit simulator through the exported BTCPUNotifyMapViewOfSection routine. It is important that the notification happen because the simulator needs to update the internal compiler data, such as

- The CHPE bitmap (which needs to be updated by setting bits to 1 when the target image

contains CHPE code pages)

The internal emulated CFG (Control Flow Guard) state

The XTA cache state for the image
In particular, whenever a new x86 or CHPE image is loaded, the simulator determines whether it should use the XTA cache for the module (through registry and application compatibility shim.) In case the check succeeded, the simulator updates the global per-process XTA cache state by requesting to the XtaCache service the updated cache for the image. In case the XtaCache service is able to identify and open an updated cache file for the image, it returns a section object to the simulator, which can be used to speed up the execution of the image. (The section contains precompiled ARM64 code blocks.)

## Compiled Hybrid Portable Executables (CHPE)

Jiting an x86 process in ARM64 environments is challenging because the compiler should keep enough performance to maintain the application responsiveness. One of the major issues is tied to the memory ordering differences between the two architectures. The x86 emulator does not know how the original x86 code has been designed, so it is obliged to aggressively use memory barriers between each memory access made by the x86 image. Executing memory barriers is a slow operation. On average, about 40% of many applications' time is spent running operating system code. This meant that not emulating OS libraries would have allowed a gain in a lot of overall applications' performance.

These are the motivations behind the design of Compiled Hybrid Portable Executables (CHPE). A

CHPE binary is a special hybrid executable that contains both x86 and ARM64-compatible code, which

has been generated with full awareness of the original source code (the compiler knew exactly where

to use memory barriers). The ARM64-compatible machine code is called hybrid (or CHPE) code: it is

still executed in AArch64 mode but is generated following the 32-bit ABI for a better interoperability

with x86 code.

CHPE binaries are created as standard x86 executables (the machine ID is still 014C as for x86); the

main difference is that they include hybrid code, described by a table in the Hybrid Image metadata

(stored as part of the image load configuration directory). When a CHPE binary is loaded into the

---

WoW64 process's address space, the simulator updates the CHPE bitmap by setting a bit to 1 for each page containing hybrid code described by the Hybrid metadata. When the jitter compiles the x86 code block and detects that the code is trying to invoke a hybrid function, it directly executes it (using the 32-bit stack), without wasting any time in any compilation.

The jitted x86 code is executed following a custom ABI, which means that there is a nonstandard

convention on how the ARM64 registers are used and how parameters are passed between functions.

CHPE code does not follow the same register conventions as jittered code (although hybrid code still

follows a 32-bit ABI). This means that directly invoking CHPE code from the jittered blocks built by the

compiler is not directly possible. To overcome this problem, CHPE binaries also include three different

kinds of thunk functions, which allow the interoperability of CHPE with x86 code:

- ■ A pop thunk allows x86 code to invoke a hybrid function by converting incoming (or outgo-
ing) arguments from the guest (x86) caller to the CHPE convention and by directly transferring
execution to the hybrid code.
■ A push thunk allows CHPE code to invoke an x86 routine by converting incoming (or outgoing)
arguments from the hybrid code to the guest (x86) convention and by calling the emulator to
resume execution on the x86 code.
■ An export thunk is a compatibility thunk created for supporting applications that detour x86
functions exported from OS modules with the goal of modifying their functionality. Functions
exported from CHPE modules still contain a little amount of x86 code (usually 8 bytes), which
semantically does not provide any sort of functionality but allows detours to be inserted by the
external application.
The x86-on-ARM simulator makes the best effort to always load CHPE system binaries instead of standard x86 ones, but this is not always possible. In case a CHPE binary does not exist, the simulator will load the standard x86 one from the SysWow64 folder. In this case, the OS module will be jitted entirely.

## EXPERIMENT: Dumping the hybrid code address range table

The Microsoft Incremental linker (link.exe) tool included in the Windows SDK and WDK is able to

show some information stored in the hybrid metadata of the Image load configuration directory

of a CHPE image. More information about the tool and how to install it are available in Chapter 9.

In this experiment, you will dump the hybrid metadata of kernelbase.dll, a system library that also has been compiled with CHPE support. You also can try the experiment with other CHPE libraries. After having installed the SDK or WDK on a ARM64 machine, open the Visual Studio Developer Command Prompt (or start the LaunchBuildEnv.cmd script file in case you are using the EWDK's Iso image.) Move to the CHPE folder and dump the image load configuration directory of the kernelbase.dll file through the following commands:

```bash
cd c:\Windows\ScChara32
link /dump /loadconfig kernelbase.dll > kernelbase_loadconfig.txt
```

---

Note that in the example, the command output has been redirected to the kernelbase_loadconfig.txt text file because it was too large to be easily displayed in the console. Open the text file with Notepad and scroll down until you reach the following text:

Section contains the following hybrid metadata:

```bash
4 Version
102D900C Address of WowA64 exception handler function pointer
102D900D Address of WowA64 dispatch call function pointer
102D9004 Address of WowA64 dispatch indirect call function pointer
102D900B Address of WowA64 dispatch indirect call function pointer (with CFG check)
102D9010 Address of WowA64 dispatch return function pointer
102D9011 Address of WowA64 return function pointer
102D9018 Address of WowA64 dispatch jump function pointer
102E000E Address of WowA64 auxiliary import address table pointer
1011DAC8 Hybrid code address range table
        4 Hybrid code address range count
```

Hybrid Code Address Range Table

```bash
Address Range
        -------------------
x86      10001000 - 1000828F (00001000 - 0000828F)
arm64      1011E2E0 - 1019E09E (0011E2E0 - 0029E09E)
x86      1028A000 - 1028B865 (0028A000 - 0028B865)
arm64      1028C000 - 102C0097 (0028C000 - 002C0097)
```

The tool confirms that kernelsbase.dll has four different ranges in the Hybrid code address range table: two sections contain x86 code (actually not used by the simulator), and two contain CHPE code (the tool shows the term "arm64" erroneously.)

## The XTA cache

As introduced in the previous sections, the x86-on-ARM64 simulator, other than its internal per-thread cache, uses an external global cache called XTA cache, managed by the XtaCache protected service, which implements the lazy jitter. The service is an automatic start service, which, when started, opens (or creates) the C-WindowsXtaCache folder and protects it through a proper ACL (only the XtaCache service and members of the Administrators group have access to the folder). The service starts its own ALPC server through the {BEC19D6F-D7B2-41A8-860C-8787BB964F2D} connection port. It then allocates the ALPC and lazy jit worker threads before exiting.

The ALPC worker thread is responsible in dispatching all the incoming requests to the ALPC server. In particular, when the simulator (the client), running in the context of a WoW64 process, connects to the XtaCache service, a new data structure tracking the x86 process is created and stored in an internal list, together with a 128 KB memory mapped section, which is shared between the client and XtaCache (the memory backing the section is internally called Trace buffer). The section is used by the simulator to send hints about the x86 code that has been jittered to execute the application and was not present in any cache, together with the module ID to which they belong. The information stored in the section is

---

processed every 1 second by the Xta cache or in case the buffer becomes full. Based on the number of valid entries in the list, the XtaCache can decide to directly start the lazy jitter.

When a new image is mapped into an x86 process, the WoW64 layer informs the simulator, which sends a message to the XtaCache looking for an already-existing XTA cache file. To find the cache file, the XtaCache service should first open the executable image, map it, and calculate its hashes. Two hashes are generated based on the executable image path and its internal binary data. The hashes are important because they avoid the execution of jitted blocks compiled for an old stale version of the executable image. The XTA cache file name is then generated using the following name scheme: <module name>.<module header hash>.<module path hash>.<multi/uniproc>.<cache file version>.jc. The cache file contains all the precompiled code blocks, which can be directly executed by the simulator. Thus, in case a valid cache file exists, the XtaCache creates a file-mapped section and injects it into the client WoW64 process.

The lazy jitter is the engine of the XtaCache. When the service decides to invoke it, a new version of the cache file representing the jitted x86 module is created and initialized. The lazy jitter then starts the lazy compilation by invoking the XTA offline compiler (xtc.exe). The compiler is started in a protected low-privileged environment (AppContainer process), which runs in low-priority mode. The only job of the compiler is to compile the x86 code executed by the simulator. The new code blocks are added to the ones located in the old version of the cache file (if one exists) and stored in a new version of the cache file.

## EXPERIMENT: Witnessing the XTA cache

Newer versions of Process Monitor can run natively on ARM64 environments. You can use Process Monitor to observe how an XTA cache file is generated and used for an x86 process. In this experiment, you need an ARM64 system running at least Windows 10 May 2019 update (1903). Initially, you need to be sure that the x86 application used for the experiment has never before been executed by the system. In this example, we will install an old x86 version of MPC-HC media player, which can be downloaded from https://sourceforge.net/projects/mpc-hc/files/latest/download. Any x86 application is well suited for this experiment though.

Install MPC-HC (or your preferred x86 application), but, before running it, open Process Monitor and add a filter on the XtaCache service's process name (XtaCache.exe, as the service runs in its own process; it is not shared.) The filter should be configured as in the following figure:

![Figure](figures/Winternals7thPt2_page_150_figure_006.png)

CHAPTER 8    System mechanisms      119

---

If not already done, start the events capturing by selecting Capture Events from the File menu. Then launch MPC-HC and try to play some video. Exit MPC-HC and stop the event capturing in Process Monitor. The number of events displayed by Process Monitor are significant. You can filter them by removing the registry activity by clicking the corresponding icon on the toolbar (in this experiment, you are not interested in the registry).

If you scroll the event list, you will find that the XtaCache service first tried to open the MPCHC cache file, but it failed because the file didn't exist. This meant that the simulator started to compile the x86 image on its own and periodically sent information to the XtaCache. Later, the lazy jitter would have been invoked by a worker thread in the XtaCache. The latter created a new version of the Xta cache file and invoked the Xtac compiler, mapping the cache file section to both itself and Xtac:

![Figure](figures/Winternals7thPt2_page_151_figure_002.png)

If you restart the experiment, you would see different events in Process Monitor: The cache file will be immediately mapped into the MPC-HC.WoW64 process. In that way, the emulator can execute it directly. As a result, the execution time should be faster. You can also try to delete the generated XTA cache file. The XtaCache service automatically regenerates it after you launch the MPC-HC x86 application again.

However, remember that the %SystemRoot%\XtaCache folder is protected through a welldefined ACL owned by the XtaCache service itself. To access it, you should open an administrative command prompt window and insert the following commands:

```bash
takeown /c:\windows\XtaCache
icacls c:\Windows\XtaCache /grant Administrators:F
```

---

## Jitting and execution

To start the guest process, the x86-on-ARM64 CPU simulator has no other chances than interpreting or jittering the x86 code. Interpreting the guest code means translating and executing one machine instruction at time, which is a slow process, so the emulator supports only the jittering strategy: it dynamically compiles x86 code to ARM64 and stores the result in a guest "code block" until certain conditions happen:

- ■ An illegal opcode or a data or instruction breakpoint have been detected.

■ A branch instruction targeting an already-visited block has been encountered.

■ The block is bigger than a predetermined limit (512 bytes).
The simulation engine works by first checking in the local and XTA cache whether a code block (indexed by its RVA) already exists. If the block exists in the cache, the simulator directly executes it using a dispatcher routine, which builds the ARM64 context (containing the host registers values) and stores it in the 64-bit stack, switches to the 32-bit stack, and prepares it for the guest x86 thread state. Furthermore, it also prepares the ARM64 registers to run the jitted x86 code (storing the x86 context in them). Note that a well-defined non-standard calling convention exists: the dispatcher is similar to a pop thunk used for transferring the execution from a CPIPE to an x86 context.

When the execution of the code block ends, the dispatcher does the opposite: It saves the new x86

context in the 32-bit stack, switches to the 64-bit stack, and restores the old ARM64 context containing

the state of the simulator. When the dispatcher exits, the simulator knows the exact x86 virtual address

where the execution was interrupted. It can then restart the emulation starting from that new memory

address. Similar to cached entries, the simulator checks whether the target address points to a memory

page containing CHPE code (it knows this information thanks to the global CHPE bitmap). If that is the

case, the simulator resolves the pop thunk for the target function, adds its address to the thread's local

cache, and directly executes it.

In case one of the two described conditions verifies, the simulator can have performances similar to

executing native images. Otherwise, it needs to invoke the compiler for building the native translated

code block. The compilation process is split into three phases:

- 1. The parsing stage builds instructions descriptors for each opcode that needs to be added in

the code block.

2. The optimization stage optimizes the instruction flow.

3. Finally, the code generation phase writes the final ARM64 machine code in the new code block.
The generated code block is then added to the per-thread local cache. Note that the simulator cannot add it in the XTA cache, mainly for security and performance reasons. Otherwise, an attacker would be allowed to pollute the cache of a higher-privileged process (as a result, the malicious code could have potentially been executed in the context of the higher-privileged process.) Furthermore, the simulator does not have enough CPU time to generate highly optimized code (even though there is an optimization stage) while maintaining the application's responsiveness.

---

However, information about the compiled x86 blocks, together with the ID of the binary hosting

the x86 code, are inserted into the list mapped by the shared Trace buffer. The lazy jitter of the XTA

cache knows that it needs to compile the x86 code jitted by the simulator thanks to the Trace buffer. As

a result, it generates optimized code blocks and adds them in the XTA cache file for the module, which

will be directly executed by the simulator. Only the first execution of the x86 process is generally slower

than the others.

## System calls and exception dispatching

Under the x86-on-ARM64 CPU simulator, when an x86 thread performs a system call, it invokes the code located in the syscall page allocated by the simulator, which raises the exception 0x2E. Each x86 exception forces the code block to exit. The dispatcher, while exiting from the code block, dispatches the exception through an internal function that ends up in invoking the standard WoW64 exception handler or system call dispatcher (depending on the exception vector number).Those have been already discussed in the previous X86 simulation on AMD64 platforms section of this chapter.

## EXPERIMENT: Debugging WoW64 in ARM64 environments

Newer releases of WinDbg (the Windows Debugger) are able to debug machine code run under any simulator. This means that in ARM64 systems, you will be able to debug native ARM64, ARM Thumb-2, and x86 applications, whereas in AMD64 systems, you can debug only 32- and 64-bit x86 programs. The debugger is also able to easily switch between the native 64-bit and 32-bit stacks, which allows the user to debug both native (including the WoW64 layer and the emulator) and guest code (furthermore, the debugger also supports CHPE.)

In this experiment, you will open an x86 application using an ARM64 machine and switch between three execution modes: ARM64, ARM Thumb-2, and x86. For this experiment, you need to install a recent version of the Debugging tools, which you can find in the WDK or SDK. After installing one of the kits, open the ARM64 version of Windog (available from the Start menu.)

Before starting the debug session, you should disable the exceptions that the Xatllt emulator generates, like Data Misaligned and in-page I/O errors (these exceptions are already handled by the emulator itself). From the Debug menu, click Event Filters. From the list, select the Data Misaligned event and check the Ignore option box from the Execution group. Repeat the same for the In-page I/O error. At the end, your configuration should look similar to the one in following figure:

---

FIGURE 10-52

Click Close, and then from the main debugger interface, select Open Executable from the File menu. Choose one of the 32-bit x86 executables located in %SystemRoot%\SysWOW64 folder. (In this example, we are using notepad.exe, but any x86 application works.) Also open the Assembly window by selecting it through the View menu. If your symbols are configured correctly (refer to the https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/ symbol-path webpage for instructions on how to configure symbols), you should see the first native Ndtll breakpoint, which can be confirmed by displaying the stack with the k command:

0:000> k

# Child-Sp RetAddr Call Site

00 000000 '001ec70 00007ffb b47de00 ntd11ldrpD0DebuggerBreak=0x2c

01 000000 '001ec90 00007ffb b47133c ntd11ldrpInitializeProcess=0x1da8

02 000000 '001ef580 00007ffb b428180 ntd11ldrpInitialize+0x491ac

03 000000 '001ef660 00007ffb b428134 ntd11ldrpInitialize=0x38

04 000000 '001ef680 00000000 ntd11ldrpInitializeThunk=0x14

The simulator is still not loaded at this time: The native and CHPE Ndtll have been loaded by the target binary by the NT kernel, while the NT64 core binaries have been loaded by enumerating the currently loaded modules (via the lm command) and by moving to the next frame in the stack via the .f+ command. In the disassembly window, you should see the invocation of the LdrpLoadWow64 routine:

00007ffb'bd47dde4 97fed31b b1 ntdll!LdrpLoadWow64 (00007ffb: bd432a50)

CHAPTER 8 System mechanisms 123


---

Now resume the execution with the g command (or F5 key). You should see multiple modules

being loaded in the process address space and another breakpoint raising, this time under the


x86 context. If you again display the stack via the k command, you can notice that a new column

is displayed. Furthermore, the debugger added the x86 word in its prompt:

```bash
0:0001x86> k
#  Arch ChildDBP RetAddr
#   x86 00acf7c0  77006f8b  ntdll_76ec0000!LdrpD0DebuggerBreak+0x2
#  01  CHPE 00acf7c0  77006f8b  ntdll_76ec0000!LdrpD0DebuggerBreak+$u
#  02  CHPE 00acf820 76f40454  ntdll_76ec0000!LdrpInitializeProcess-
#  03  CHPE 00acfad0 76f43e9c  ntdll_76ec0000!LdrpInitializeIz0x1a4
#  04  CHPE 00acfb60 76f43e34  ntdll_76ec0000!LdrpInitializeIz0x3c
#  05  CHPE 00acf8b0 76ffc3cc  ntdll_76ec0000!LdrpInitializeThunk=0x14
```

If you compare the new stack to the old one, you will see that the stack addresses have drastically changed (because the process is now executing using the 32-bit stack). Note also that some functions have the # symbol preceding them: WinDbg uses that symbol to represent functions containing CHPE code. At this point, you can step into and over x86 code, as in regular x86 operating systems. The simulator takes care of the emulation and hides all the details. To observe how the simulator is running, you should move to the 64-bit context through the .effmac command. The command accepts different parameters: x86 for the 32-bit x86 context; arm64 or amd64 for the native 64-bit context (depending on the target platform); arm for the 32-bit ARM Thumb2 context; CHPE for the 32-bit CHPE context. Switching to the 64-bit stack in this case is achieved via the arm64 parameter:

```bash
0:000x1c86>._effmach arm64
Effective machine: ARM 64-bit (Aarch64) (arm64)
0:000> k
# Child-SP
00 0000000 00aa8df30 000007ff bdf372a4 80w64!Wow64pNotifyDebugger+0x18f54
01 00000000 00aa8df60 000007ffb bdf372a4 80w64!Wow64pDispatchException+0x108
02 00000000 00aa8e2e0 00000000 76e1e9dc 80w64R4RaiseException+0x84
03 00000000 00aa8e400 00000000 76e0eb8d xjtj4!BTcpuSuspendLocalThread+0x24c
04 00000000 00aa8e480 00000000 76e0eb8d xjtj4!BTcpuSuspendLocalThread+0x24c
05 00000000 00aa8e530 00000000 76edbbaf xjtj4!BTcpuSlopePhe1F1b2x908b
06 00000000 00aa8e640 000007ffb bdf555c2 xjtj4!BTcpuSImulate+0x9be
07 00000000 00aa8e600 000007ffb bdf53788 80w64!RunCpuSimulation+0x14
08 00000000 00aa8e6c0 000007ffb bdf47de38 80w64!Wow64ldprInitialize+0x138
09 00000000 00aa8e980 000007ffb bdf47133c 80d11!ldprInitializeProcess+0x01de 0
10 00000000 00aa8f270 000007ffb bdf428180 80d11!ldprInitialize+0x491ac
0b 00000000 00aa8f350 000007ffb bdf428134 80d11!ldprInitialize+0x38
0c 00000000 00aa8f370 00000000 00000000 80d11!ldprInitializeThunk+0x14
```

From the two stacks, you can see that the emulator was executing CHPE code, and then a push

thunk has been invoked to restart the simulation to the LdrpDoDebugger x86 function,

which caused an exception (managed through the native Wow64RaiseException) notified to the

debugger via the Wow64NotifyDebugger routine. With Windbg and the .elfmach command,

you can effectively debug multiple contexts: native, CHPE, and x86 code. Using the @$exen try command, you can move to the x86 entry point of Notepad and continue the debug session

of x86 code or the emulator itself. You can restart this experiment also in different environments,

debugging an app located in SysArm32, for example.

---

Object Manager

As mentioned in Chapter 2 of Part 1, "System architecture," Windows implements an object model to provide consistent and secure access to the various internal services implemented in the executive. This section describes the Windows Object Manager, the executive component responsible for creating, deleting, protecting, and tracking objects. The Object Manager centralizes resource control operations that otherwise would be scattered throughout the operating system. It was designed to meet the goals listed after the experiment.

## EXPERIMENT: Exploring the Object Manager

Throughout this section, you'll find experiments that show you how to peer into the Object Manager database. These experiments use the following tools, which you should become familiar with if you aren't already:

- ■ WinObj (available from Sysinternals) displays the internal Object Manager's namespace and
information about objects (such as the reference count, the number of open handles, secu-
rity descriptors, and so forth). WinObjEx64, available on GitHub, is a similar tool with more
advanced functionality and is open source but not endorsed or signed by Microsoft.
■ Process Explorer and Handle from Sysinternals, as well as Resource Monitor (introduced in
Chapter 1 of Part 1) display the open handles for a process. Process Hacker is another tool
that shows open handles and can show additional details for certain kinds of objects.
■ The kernel debugger !handle extension displays the open handles for a process, as does the
Io.Handles data model object underneath a Process such as @curprocess.
WinObj and WinObjEx64 provide a way to traverse the namespace that the Object Manager maintains. (As we'll explain later, not all objects have names.) Run either of them and examine the layout, as shown in the figure.

![Figure](figures/Winternals7thPt2_page_156_figure_006.png)

---

The Windows Openfiles/query command, which lists local and remote files currently opened in the system, requires that a Windows global flag called maintain objects list be enabled. (See the "Windows global flags" section later in Chapter 10 for more details about global flags.) If you type Openfiles/Local, it tells you whether the flag is enabled. You can enable it with the Openfiles/ Local ON command, but you still need to reboot the system for the setting to take effect. Process Explorer, Handle, and Resource Monitor do not require object tracking to be turned on because they query all system handles and create a per-process object list. Process Hacker queries per-process handles using a mode-recent Windows API and also does not require the flag.

The Object Manager was designed to meet the following goals:

- ■ Provide a common, uniform mechanism for using system resources.
■ Isolate object protection to one location in the operating system to ensure uniform and consis-
tent object access policy.
■ Provide a mechanism to charge processes for their use of objects so that limits can be placed on
the usage of system resources.
■ Establish an object-naming scheme that can readily incorporate existing objects, such as the
devices, files, and directories of a file system or other independent collections of objects.
■ Support the requirements of various operating system environments, such as the ability of a
process to inherit resources from a parent process (needed by Windows and Subsystem for
UNIX Applications) and the ability to create case-sensitive file names (needed by Subsystem
for UNIX Applications). Although Subsystem for UNIX Applications no longer exists, these facili-
ties were also useful for the later development of the Windows Subsystem for Linux.
■ Establish uniform rules for object retention (that is, for keeping an object available until all pro-
cesses have finished using it).
■ Provide the ability to isolate objects for a specific session to allow for both local and global
objects in the namespace.
■ Allow redirection of object names and paths through symbolic links and allow object owners,
such as the file system, to implement their own type of redirection mechanisms (such as NTFS
junction points). Combined, these redirection mechanisms compose what is called reparsing.
Internally, Windows has three primary types of objects: executive objects, kernel objects, and GDI/

User objects. Executive objects are objects implemented by various components of the executive

(such as the process manager, memory manager, I/O subsystem, and so on). Kernel objects are a more

primitive set of objects implemented by the Windows kernel. These objects are not visible to user mode code but are created and used only within the executive. Kernel objects provide fundamental

capabilities, such as synchronization, on which executive objects are built. Thus, many executive objects

contain (encapsulate) one or more kernel objects, as shown in Figure 8-30.

---

![Figure](figures/Winternals7thPt2_page_158_figure_000.png)

Note The vast majority of GDI/User objects, on the other hand, belong to the Windows subsystem (Win32k.sys) and do not interact with the kernel. For this reason, they are outside the scope of this book, but you can get more information on them from the Windows SDK. Two exceptions are the Desktop and Windows Station User objects, which are wrapped in executive objects, as well as the majority of DirectX objects (Shaders, Surfaces, Compositions), which are also wrapped as executive objects.

![Figure](figures/Winternals7thPt2_page_158_figure_002.png)

FIGURE 8-30 Executive objects that contain kernel objects.

Details about the structure of kernel objects and how they are used to implement synchronization

are given later in this chapter. The remainder of this section focuses on how the Object Manager works

and on the structure of executive objects, handles, and handle tables. We just briefly describe how

objects are involved in implementing Windows security access checking: Chapter 7 of Part 1 thoroughly

covers that topic.

