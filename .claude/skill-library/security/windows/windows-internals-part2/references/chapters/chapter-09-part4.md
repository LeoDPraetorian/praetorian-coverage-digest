## Isolated User Mode

Isolated User Mode (IUM), the services provided by the Secure Kernel to its secure processes (trustlets), and the trustlets general architecture are covered in Chapter 3 of Part 1. In this section, we continue the discussion starting from there, and we move on to describe some services provided by the Isolated User Mode, like the secure devices and the VBS enclaves.

As introduced in Chapter 3 of Part 1, when a trustlet is created in VTL 1, it usually maps in its address space the following libraries:

- ■ lumdll.dll The IUM Native Layer DLL implements the secure system call stub. It's the equiva-
lent of Ntdll.dll of VTL 0.
■ lumbase.dll The IUM Base Layer DLL is the library that implements most of the secure APIs
that can be consumed exclusively by VTL 1 software. It provides various services to each secure
process, like secure identification, communication, cryptography, and secure memory manage-
ment. Trustlets do not usually call secure system calls directly, but they pass through lumbase.
dll, which is the equivalent of kernelbase.dll in VTL 0.
■ IumCrypt.dll Exposes public/private key encryption functions used for signing and integrity
verification. Most of the crypto functions exposed to VTL 1 are implemented in lumbase.dll; only a
small number of specialized encryption routines are implemented in IumCrypt. Lsalo is the main
consumer of the services exposed by IumCrypt, which is not loaded in many other trustlets.
■ Ntdll.dll, Kernelbase.dll, and Kernel32.dll A trustlet can be designed to run both in VTL
1 and VTL 0. In that case, it should only use routines implemented in the standard VTL 0 API
surface. Not all the services available to VTL 0 are also implemented in VTL 1. For example, a
trustlet can never do any registry I/O and any file I/O, but it can use synchronization routines,
ALPC, thread APIs, and structured exception handling, and it can manage virtual memory and

CHAPTER 9 Virtualization technologies 371

---

section objects. Almost all the services offered by the kernelbase and kernel32 libraries perform system calls through Ntdll.dll. In VTL 1, these kinds of system calls are "translated" in normal calls and redirected to the VTL 0 kernel. (We discussed normal calls in detail earlier in this chapter.) Normal calls are often used by iUM functions and by the Secure Kernel itself. This explains why ntdll.dll is always mapped in every trustlet.

- • Vertdll.dll The VSM enclave runtime DLL is the DLL that manages the lifetime of a VBS en-
clave. Only limited services are provided by software executing in a secure enclave. This library
implements all the enclave services exposed to the software enclave and is normally not loaded
for standard VTL 1 processes.
With this knowledge in mind, let's look at what is involved in the trustlet creation process, starting

from the CreateProcess API in VTL 0, for which its execution flow has already been described in detail

in Chapter 3.

## Trustlets creation

As discussed multiple times in the previous sections, the Secure Kernel depends on the NT kernel for performing various operations. Creating a trustlet follows the same rule: It is an operation that is managed by both the Secure Kernel and NT kernel. In Chapter 3 of Part 1, we presented the trustlet structure and its signing requirement, and we described its important policy metadata. Furthermore, we described the detailed flow of the CreateProcess API, which is still the starting point for the trustlet creation.

To properly create a trustlet, an application should specify the CREATE_SECURE_PROCESS creation flag when calling the CreateProcess API. Internally, the flag is converted to the PS_CP_SECURE_PROCESS NT attribute and passed to the NtCreateUserProcess native API. After the NtCreateUserProcess has successfully opened the image to be executed, it creates the section object of the image by specifying a special flag, which instructs the memory manager to use the Secure HVCI to validate its content. This allows the Secure Kernel to create the SECURE_IMAGE data structure used to describe the PE image verified through Secure HVCI.

The NT kernel creates the required process's data structures and initial VTL 0 address space (page directories, hyperspace, and working set) as for normal processes, and if the new process is a trustlet, it emits a CREATE_PROCESS secure call. The Secure Kernel manages the latter by creating the secure process object and relative data structure (named SEPROCESS). The Secure Kernel links the normal process object (EPROCESS) with the new secure one and creates the initial secure address space by allocating the secure page table and duplicating the root entries that describe the kernel portion of the secure address space in the upper half of it.

The NT kernel concludes the setup of the empty process address space and maps the Ntdll library

into it (see Stage 3d of Chapter 3 of Part 1 for more details). When doing so for secure processes, the

NT kernel invokes the /INITIALIZE_PROCESS secure call to finish the setup in VTL 1. The Secure Kernel

copies the trustlet identity and trustlet attributes specified at process creation time into the new secure

process, creates the secure handle table, and maps the secure shared page into the address space.

The last step needed for the secure process is the creation of the secure thread. The initial thread object is created as for normal processes in the NT kernel. When the NtCreateUserProcess calls

372      CHAPTER 9   Virtualization technologies


---

PSpInsertThread, it has already allocated the thread kernel stack and inserted the necessary data to start from the KIStartUserThread kernel function (see Stage 4 in Chapter 3 of Part 1 for further details). If the process is a trustlet, the NT kernel emits a CREATE_THREAD secure call for performing the final secure thread creation. The Secure Kernel attaches to the new secure process's address space and allocates and initializes a secure thread data structure, a thread's secure TEB, and kernel stack. The Secure Kernel fills the thread's kernel stack by inserting the thread-first initial kernel routine:

SPsUserThreadStart. It then initializes the machine-dependent hardware context for the secure thread, which specifies the actual image start address and the address of the first user mode routine. Finally, it associates the normal thread object with the new created secure one, inserts the thread into the secure threads list, and marks the thread as runnable.

When the normal thread object is selected to run by the NT kernel scheduler, the execution still starts in the KsStartUserThread function in VTL 0. The latter lowers the thread's IRQL and calls the system initial thread routine (PspUserThreadStartup). The execution proceeds as for normal threads, until the NT kernel sets up the initial thunk context. Instead of doing that, it starts the Secure Kernel dispatch loop by calling the VsjEnteriumSecureMode routine and specifying the RESUMETHREAD secure call. The loop will exit only when the thread is terminated. The initial secure call is processed by the normal call dispatcher loop in VTL 1, which identifies the "resume thread" entry reason to VTL 1, attaches to the new process's address space, and switches to the new secure thread stack. The Secure Kernel in this case does not call the lumInvokeSecureService dispatcher function because it knows that the initial thread function is on the stack, so it simply returns to the address located in the stack, which points to the VTL 1 secure initial routine, SkpUserThreadStart.

SkpUserThreadStart, similarly to standard VTL 0 threads, sets up the initial thunk context to run the image loader initialization routine (LdrInitializeThunk in Ntdll.dll), as well as the system-wide thread startup stub (RtlUserThreadStart in Ntdll.dll). These steps are done by editing the context of the thread in place and then issuing an exit from system service operation, which loads the specially crafted user context and returns to user mode. The newborn secure thread initialization proceeds as for normal VTL 0 threads; the LdrInitializeThunk routine initializes the loader and its needed data structures. Once the function returns, NtContinue restores the new user context. Thread execution now truly starts: RtlUserThreadStart uses the address of the actual image entry point and the start parameter and calls the application's entry point.

![Figure](figures/Winternals7thPt2_page_404_figure_003.png)

Note A careful reader may have noticed that the Secure Kernel doesn't do anything to protect the new trustlet's binary image. This is because the shared memory that describes the trustlet's base binary image is still accessible to VTL 0 by design.

Let's assume that a trustlet wants to write private data located in the image's global data. The PTEs that map the writable data section of the image global data are marked as copyon-write. So, an access fault will be generated by the processor. The fault belongs to a user mode address range (remember that no NAR are used to track shared pages). The Secure Kernel page fault handler transfers the execution to the NT kernel (through a normal call), which will allocate a new page, copy the content of the old one in it, and protect it through the SLAT (using a protected copy operation; see the section "The Secure Kernel memory manager" earlier in this chapter for further details).

CHAPTER 9 Virtualization technologies      373


---

EXPERIMENT: Debugging a trustlet

Debugging a trustlet with a user mode debugger is possible only if the trustlet explicitly allows it through its policy metadata (stored in the T policy section). In this experiment, we try to debug a trustlet through the kernel debugger. You need a kernel debugger attached to a test system (a local kernel debugger works, too), which must have VBS enabled. HVI is not strictly needed, though.

First, find the Lsalso.exe trustlet:

```bash
!kb: | process 0 0 lsaiso.exe
PROCESS FFFFF89F0D4DA080
SessionID: 0 1 Cid: 02e8      Feb: 8074164000  ParentCid: 0250
0184a253b9555  ObjectTable: ffff0b00f4dab00  HandleCount: 42.
Image: LsaIso.exe
```

Analyzing the process's PEB reveals that some information is set to 0 or unreadable:

```bash
!kbd .process /P ffff904dfdaa080
!kbd :pEb 807164000
PEB at 00000807416400
        InheritedAddressSpace:    No
        ReadImageFileExecOptions: No
        BeingDebugged:          Yes
        ImageBaseAddress:            00007ff708750000
        NtGlobalFlag:                0
        NtGlobalFlag2:              0
        *dr:                             0
        *** unable to read Ldr table at 0000000000000000
        SubSystemData:               0000000000000000
        ProcessHeap:                0000000000000000
        ProcessParameters:             0000026b5fa10000
        CurrentDirectory:           {\C:\Windows\system32\}
        WindowTitle: <^Name not readable> ..
        ImageFile:                 {'??:C:\Windows\system32\saiso.exe"
        CommandLine:                 {'??:C:\Windows\system32\saiso.exe"
        DllPath:                     <^Name not readable> .."!kd
```

Reading from the process image base address may succeed, but it depends on whether the

Lsalo image mapped in the VTL 0 address space has been already accessed. This is usually the

case just for the first page (remember that the shared memory of the main image is accessible in

VTL 0). In our system, the first page is mapped and valid, whereas the third one is invalid:

```bash
1kb+ db 0x7ff708750000 120
00007ff7 08750000 4d 5a 90 03 00 00 00 00 00-04 00 00 00 ff 00 00 MZ.........
00007fff 08750010 b8 00 00 00 00 00 00 00 00 00-40 00 00 00 00 00 00 00 00 ............0.........
1kb+ db (0x7ff708750000 + 2000) 120
00007fff 08752000  ... ? ? ? ? ? ? ? ? ? ? ? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -?? -
```

---

```bash
VA 00007ff708752000
  PXE at FFFF5EAF57AB7FS    PPE at FFFF05EAF56FFE0E    POE at FFFF05EAFDFDC218
  contains 0A0000003E58DB67  contains 0A0000003E58E867  contains 0A0000003E58FB67
  pfn 3e58d    ---DA--UWEV    pfn 3e58e    ---DA--UWEV    pfn 3e58f    ---DA--UWEV
  PTE at FFFF5D8FB843A90
  contains 00000000000000  not valid
```

Dumping the process's threads reveals important information that confirms what we have discussed in the previous sections:

```bash
!process ffff8904dfdaa080  2
PROCESS ffff8904dfdaa080
    SessionID: 0 Cid: 02e8      Pcb: 8074164000  ParentCid: 0250
        DirBase: 3e590002  ObjectTable: ffff8b0d0df4dab00  HandleCount: 42.
        Image: LsaIso.exe
        THREAD ffff8904dfdd9080  Cid 02e8.02f8  Teb: 0000008074165000
        Win32Thread: 0000000000000000  WAIT: (UserRequest) UserMode Non-Alertable
            ffff8904dfdc5ca0  NotificationEvent
        THREAD ffff8904e12ac040  Cid 02e8.0b84  Teb: 0000008074167000
        Win32Thread: 0000000000000000  WAIT: (WrQueue) UserMode Alertable
            ffff8904dfd7440  QueueObject
lkds -thread /p ffff8904e12ac040
Implicit thread is now ffff8904:e12ac040
Implicit process is now ffff8904'eddaa080
  .cache forcedcodeuser done
lkds -k
*** Stack trace for last set context - .thread/.cxr resets it
# Child-SP     RetAddr     Call Site
00 ffff0e09 1216c140 ffffff801 27564e17 ntKiSwapContext+0x76
01 ffff0e09 1216c280 ffffff801 27564989 ntKiSwapThread+0x297
02 ffff0e09 1216c340 ffffff801 275681f9 ntKiCommitThreadWait+0x549
03 ffff0e09 1216c3e0 ffffff801 27567369 ntKiRemoveQueueEx+0xb59
04 ffff0e09 1216c480 ffffff801 27568e2a ntKiRemoveIoCompletion+0x99
05 ffff0e09 1216c5bp ffffff801 2764d504 ntKiWaitForWork viaWorkerFactory+0x99a
06 ffff0e09 1216c7ee ffffff801 276db75f ntVslpDispatchImsCall+0x34
07 ffff0e09 1216c860 ffffff801 27bab7e4 ntVslpEnterImsecureMode+0x12098b
08 ffff0e09 1216c8d0 ffffff801 276586cc ntPspIpierThreadStartup+0x178704
09 ffff0e09 1216c9c0 ffffff801 27658640 ntKiStartUserThread+0x1c
0a ffff0e09 1216cbo0 00007fff d06f7a0b ntKiStartUserThreadReturn
00000080 7427e18 00000000 00000000 ntdllrtUtlUserThreadStart
```

The stack clearly shows that the execution begins in VT1_0 at the KIStartUserThread routine. PspUserThreadStartup has invoked the secure call dispatch loop, which never ended and has been interrupted by a wait operation. There is no way for the kernel debugger to show any Secure Kernel's data structures or trustee's private data.

CHAPTER 9 Virtualization technologies      375


---

## Secure devices

VBS provides the ability for drivers to run part of their code in the secure environment. The Secure Kernel itself can't be extended to support kernel drivers; its attack surface would become too large. Furthermore, Microsoft wouldn't allow external companies to introduce possible bugs in a component used primarily for security purposes.

The User-Mode Driver Framework (UMDF) solves the problem by introducing the concept of driver companions, which can run both in user mode VTL 0 or VTL 1. In this case, they take the name of secure companions. A secure companion takes the subset of the driver's code that needs to run in a different mode (in this case IUM) and loads it as an extension, or companion, of the main KMDF driver. Standard WDM drivers are also supported, though. The main driver, which still runs in VTL 0 kernel mode, continues to manage the device's PnP and power state, but it needs the ability to reach out to its companion to perform tasks that must be performed in IUM.

Although the Secure Driver Framework (SDF) mentioned in Chapter 3 is deprecated, Figure 9-39 shows the architecture of the new UMDF secure companion model, which is still built on top of the same UMDF core framework (WudfX2000 dll) used in VTLO user mode. The latter leverages services provided by the UMDF secure companion host (WUDFCompactionHost.exe) for loading and managing the driver companion, which is distributed through a DLL. The UMDF secure companion host manages the lifetime of the secure companion and encapsulates many UMDF functions that deal specifically with the IUM environment.

![Figure](figures/Winternals7thPt2_page_407_figure_004.png)

FIGURE 9-39 The WDF driver's secure companion architecture.

376 CHAPTER 9 Virtualization technologies


---

A secure companion usually comes associated with the main driver that runs in the VTL 0 kernel. It must be properly signed (including the LUM EKU in the signature, as for every trustlet) and must declare its capabilities in its metadata section. A secure companion has the full ownership of its managed device (this explains why the device is often called secure device). A secure device controller by a secure companion supports the following features:

- ■ Secure DMA The driver can instruct the device to perform DMA transfer directly in protected
VTL 1 memory, which is not accessible to VTL 0. The secure companion can process the data
sent or received through the DMA interface and can then transfer part of the data to the VTL 0
driver through the standard KMDF communication interface (ALPC). The IumGetDmaEnabler
and IumDmaMapMemory secure system calls, exposed through lumbase.dll, allow the secure
companion to map physical DMA memory ranges directly in VTL 1 user mode.
■ Memory mapped IO (MMIO) The secure companion can request the device to map its
accessible MMIO range in VTL 1 (user mode). It can then access the memory-mapped device's
registers directly in IUM. MapSecureIo and the ProtectSecureIo APIs expose this feature.
■ Secure sections The companion can create (through the CreateSecureSection API) and map
secure sections, which represent memory that can be shared between trustlets and the main
driver running in VTL 0. Furthermore, the secure companion can specify a different type of SLAT
protection in case the memory is accessed through the secure device (via DMA or MMIO).
A secure companion can't directly respond to device interrupts, which need to be mapped and managed by the associated kernel mode driver in VTL 0. In the same way, the kernel mode driver still needs to act as the high-level interface for the system and user mode applications by managing all the received IOCTLs. The main driver communicates with its secure companion by sending WDF tasks using the UMDF Task Queue object, which internally uses the ALPC facilities exposed by the WDF framework.

A typical KMDF driver registers its companion via INF directives. WDF automatically starts the driver's companion in the context of the driver's call to WdfDeviceCreate—which, for plug and play drivers usually happens in the AddDevice callback—by sending an ALPC message to the UMDF driver manager service, which spawns a new WUDFCompanionHost.exe trustlet by calling the NtCreateUserProcess native API. The UMDF secure companion host then loads the secure companion DLL in its address space. Another ALPC message is sent from the UMDF driver manager to the WUDFCompanionHost, with the goal to actually start the secure companion. The DriverEntry routine of the companion performs the driver's secure initialization and creates the WDFDRIVER object through the classic WdfDriverCreate API.

The framework then calls the AddDevice callback routine of the companion in YTL 1, which usually creates the companion's device through the new WdfDeviceCognitionCreate UMDF API. The latter transfers the execution to the Secure Kernel (through the lumCreateSecureDevice secure system call), which creates the new secure device. From this point on, the secure companion has full ownership of its managed device. Usually, the first thing that the companion does after the creation of the secure device is to create the task queue object (WDTASKQUEUE) used to process any incoming tasks delivered by its associated V1.0 driver. The execution control returns to the kernel mode driver, which can now send new tasks to its secure companion.

CHAPTER 9 Virtualization technologies      377


---

This model is also supported by WDM drivers. WDM drivers can use the KMDF's miniport mode to

interact with a special filter driver, WdmComparisonFilter.sys, which is attached in a lower-level position

of the device's stack. The Wdm Companion filter allows WDM drivers to use the task queue object for

sending tasks to the secure companion.

## VBS-based enclaves

In Chapter 5 of Part 1, we discuss the Software Guard Extension (SGX), a hardware technology that allows the creation of protected memory enclaves, which are secure zones in a process address space where code and data are protected (encrypted) by the hardware from code running outside the enclave. The technology, which was first introduced in the sixth generation Intel Core processors (Skylake), has suffered from some problems that prevented its broad adoption. (Furthermore, AMD released another technology called Secure Encrypted Virtualization, which is not compatible with SGX.)

To overcome these issues, Microsoft released VBS-based enclaves, which are secure enclaves whose isolation guarantees are provided using the VSM infrastructure. Code and data inside of a VBS-based enclave is visible only to the enclave itself (and the VSM Secure Kernel) and is inaccessible to the NT kernel, VT L 0 processes, and secure trustlets running in the system.

A secure VBS-based enclave is created by establishing a single virtual address range within a normal process. Code and data are then loaded into the enclave, after which the enclave is entered for the first time by transferring control to its entry point via the Secure Kernel. The Secure Kernel first verifies that all code and data are authentic and are authorized to run inside the enclave by using image signature verification on the enclave image. If the signature checks pass, then the execution control is transferred to the enclave entry point, which has access to all of the enclave's code and data. By default, the system only supports the execution of enclaves that are properly signed. This precludes the possibility that unsigned malware can execute on a system outside the view of anti-malware software, which is incapable of inspecting the contents of any enclave.

During execution, control can transfer back and forth between the enclave and its containing process. Code executing inside of an enclave has access to all data within the virtual address range of the enclave. Furthermore, it has read and write access of the containing unsecure process address space. All memory within the enclave's virtual address range will be inaccessible to the containing process. If multiple enclaves exist within a single host process, each enclave will be able to access only its own memory and the memory that is accessible to the host process.

As for hardware enclaves, when code is running in an enclave, it can obtain a sealed enclave report, which can be used by a third-party entity to validate that the code is running with the isolation guarantees of a VBS enclave, and which can further be used to validate the specific version of code running. This report includes information about the host system, the enclave itself, and all DLLs that may have been loaded into the enclave, as well as information indicating whether the enclave is executing with debugging capabilities enabled.

---

A VBS-based enclave is distributed as a DLL, which has certain specific characteristics:

- ■ It is signed with an authenticode signature, and the leaf certificate includes a valid EKU that per-
mits the image to be run as an enclave. The root authority that has emitted the digital certificate
should be Microsoft, or a third-party signing authority covered by a certificate manifest that's
countersigned by Microsoft. This implies that third-party companies could sign and run their own
enclaves. Valid digital signature EKUs are the IUM EKU (1.3.6.1.41.3110.3.37) for internal Windows-
signed enclaves or the Enclave EKU (1.3.6.1.41.3110.3.42) for all the third-party enclaves.
■ It includes an enclave configuration section (represented by an IMAGE_ENCLAVE_CONFIG data
structure), which describes information about the enclave and which is linked to its image's load
configuration data directory.
■ It includes the correct Control Flow Guard (CFG) instrumentation.
The enclave's configuration section is important because it includes important information needed to properly run and seal the enclave: the unique family ID and image ID, which are specified by the enclave's author and identify the enclave binary, the secure version number and the enclave's policy information (like the expected virtual size, the maximum number of threads that can run, and the debuggability of the enclave). Furthermore, the enclave's configuration section includes the list of images that may be imported by the enclave, included with their identity information. An enclave's imported module can be identified by a combination of the family ID and image ID, or by a combination of the generated unique ID, which is calculated starting from the hash of the binary, and author ID, which is derived from the certificate used to sign the enclave. (This value expresses the identity of who has constructed the enclave.) The imported module descriptor must also include the minimum secure version number.

The Secure Kernel offers some basic system services to enclaves through the VBS enclave runtime

DLL, Vertdll.dll, which is mapped in the enclave address space. These services include: a limited subset

of the standard C runtime library, the ability to allocate or free secure memory within the address range

of the enclave, synchronization services, structured exception handling support, basic cryptographic

functions, and the ability to seal data.

## EXPERIMENT: Dumping the enclave configuration

In this experiment, we use the Microsoft Incremental linker (link.exe) included in the Windows SDK and WDK to dump software enclave configuration data. Both packages are downloadable from the web. You can also use the EWDK, which contains all the necessary tools and does not require any installation. It's available at https://docs.microsoft.com/en-us/windows-hardware/ drivers/download-the-wdk.

Open the Visual Studio Developer Command Prompt through the Cortana search box or by executing the LaunchBuildEnv.csmt script file contained in the EWDK's Iso image. We will analyze the configuration data of the System Guard Routine Attestation enclave—which is shown in Figure 9-40 and will be described later in this chapter—with the link.exe /dump

/loadconfig command:

CHAPTER 9 Virtualization technologies      379


---

```bash
# 2017 WDK Build Env WDKContentRoot DJ Program File\Windows Kit\10\[
# --------------------------------------------------------------------------
** Visual Studio 2017 Developer Command Prompt v1.0
** Copyright (c) 2017 Microsoft Corporation
***************************************************************************
C:\>c:
C:\>md test
C:\>copy c:\Windows\System32\SprmEnclave_secure.dll c:\test
        1 file(s) copied.
C:\>cd test
C:\test\link /dump /loadconfig SprmEnclave_secure.dll > SprmEnclave_secure_loadconfig.txt
C:\test>_
```

The command's output is large. So, in the example shown in the preceding figure, we have redirected it to the SgrmEnclave_secure_loadconfig.txt file. If you open the new output file, you see that the binary image contains a CFG table and includes a valid enclave configuration pointer, which targets the following data:

```bash
Enclave Configuration
           00000050 size
           0000004C minimum required config size
           00000000 policy flags
           00000003 number of enclave import descriptors
           004FA04 RVA to enclave import descriptors
           00000050 size of an enclave import descriptor
           00000001 image version
           00000001 security version
         0000000010000000 enclave size
           00000008 number of threads
           00000001 enclave flags
     family ID : B1 35 7C 28 69 9F 47 F9 BB C9 4F 44 F2 S4 D8 9D
             image ID : 24 56 46 36 CD 4A D8 86 A2 F4 EC 25 A9 72 02
    ucrtbase_enclave.dll
          0 minimum security version
          0 reserved
          match type : image ID
             family ID : 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

380      CHAPTER 9  Virtualization technologies


---

```bash
0 minimum security version
        0 reserved
                match type : image ID
                family ID : 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 0
```

## Enclave lifecycle

In Chapter 5 of Part 1, we discussed the lifecycle of a hardware enclave (SGX-based). The lifecycle of a VBS-based enclave is similar; Microsoft has enhanced the already available enclave APIs to support the new type of VBS-based enclaves.

Step 1: Creation An application creates a VBS-based enclave by specifying the ENCLAVE_TYPE_VBS flag to the CreateEnclave API. The caller should specify an owner ID, which identifies the owner of the enclave. The enclave creation code, in the same way as for hardware enclaves, ends up calling the MlCreateEnclave in the kernel. The latter checks the parameters, copies the passed-in structures, and attaches to the target process in case the enclave is to be created in a different process than the caller's. The MlCreateEnclave function allocates an enclave-type VAD describing the enclave virtual memory range and selects a base virtual address if not specified by the caller. The kernel allocates the memory manager's VBS enclave data structure and the per-process enclave hash table, used for fast lookup of the enclave starting by its number. If the enclave is the first created for the process, the system also creates an empty secure process (which acts as a container for the enclaves) in VTL 1 by using the CREATE _PROCESS secure call (see the earlier section "Trustlets creation" for further details).

The CREATE_ENCLAVE secure call handler in VTL 1 performs the actual work of the enclave creation: it allocates the secure enclave key data structure (SKMI_ENCLAVE), sets the reference to the container secure process (which has just been created by the NT kernel), and creates the secure VAD describing the entire enclave virtual address space (the secure VAD contains similar information to its VTL 0 counterpart). This VAD is inserted in the containing process's VAD tree (and not in the enclave itself). An empty virtual address space for the enclave is created in the same way as for its containing process: the page table root is filled by system entries only.

CHAPTER 9 Virtualization technologies      381


---

Step 2: Loading modules into the enclave Differently from hardware-based enclaves, the parent process can load only modules into the enclave but not arbitrary data. This will cause each page of the image to be copied into the address space in VTL 1. Each image's page in the VTL 1 enclave will be a private copy. At least one module (which acts as the main enclave image) needs to be loaded into the enclave, otherwise, the enclave can't be initialized. After the VBS enclave has been created, an application calls the LoadEnclaveImage API, specifying the enclave base address and the name of the module that must be loaded in the enclave. The Windows Loader code (in Ntdll.dll) searches the specified DLL name, opens and validates its binary file, and creates a section object that is mapped with read-only access right in the calling process.

After the loader maps the section, it parses the image's import address table with the goal to create

a list of the dependent modules (imported, delay loaded, and forwarded). For each found module, the

loader checks whether there is enough space in the enclave for mapping it and calculates the correct

image base address. As shown in Figure 9-40, which represents the System Guard Runtime Attestation

enclave, modules in the enclave are mapped using a top-down strategy. This means that the main

image is mapped at the highest possible virtual address, and all the dependent ones are mapped in

lower addresses one next to each other. At this stage, for each module, the Windows Loader calls the

NtLoadEnclaveData kernel API.

![Figure](figures/Winternals7thPt2_page_413_figure_002.png)

FIGURE 9-40 The System Guard Runtime Attestation secure enclave (note the empty space at the base of the enclave).

---

For loading the specified image in the VBS enclave, the kernel starts a complex process that allows the shared pages of its section object to be copied in the private pages of the enclave in VTL 1. The MlMapImageForEnclaveUse function gets the control area of the section object and validates it through SKCI. If the validation fails, the process is interrupted, and an error is returned to the caller. (All the enclave's modules should be correctly signed as discussed previously.) Otherwise, the system attaches to the secure system process and maps the image's section object in its address space in VTL 0. The shared pages of the module at this time could be valid or invalid; see Chapter 5 of Part 1 for further details. It then commits the virtual address space of the module in the containing process. This creates private VTL 0 paging data structures for demand-zero PTEs, which will be later populated by the Secure Kernel when the image is loaded in VTL 1.

The LOAD_ENCLAVE_MODULE secure call handler in VTL 1 obtains the SECURE_IMAGE of the new module (created by SKCI) and verifies whether the image is suitable for use in a VBS-based enclave (by verifying the digital signature characteristics). It then attaches to the secure system process in VTL 1 and maps the secure image at the same virtual address previously mapped by the NT kernel. This allows the sharing of the prototype PTEs from VTL 0. The Secure Kernel then creates the secure VAD that describes the module and inserts it into the VTL 1 address space of the enclave. It finally cycles between each module's section prototype PTE. For each nonpresent prototype PTE, it attaches to the secure system process and uses the GET_PHYSICAL_PAGE normal call to invoke the NT page fault handler (MmAccessFault), which blends in memory the shared page. The Secure Kernel performs a similar process for the private enclave pages, which have been previously committed by the NT kernel in VTL 0 by demand-zero PTEs. The NT page fault handler in this case allocates zeroed pages. The Secure Kernel copies the content of each shared physical page into each new private page and applies the needed private relocations if needed.

The loading of the module in the VBS-based enclave is complete. The Secure Kernel applies the SLAT

protection to the private enclave pages (the NT kernel has no access to the image's code and data in

the enclave), unmaps the shared section from the secure system process, and yields the execution to

the NT kernel. The Loader can now proceed with the next module.

Step 3: Enclave initialization After all the modules have been loaded into the enclave, an application initializes the enclave using the InitializeEnclave API, and specifies the maximum number of threads supported by the enclave (which will be bound to threads able to perform enclave calls in the containing process). The Secure Kernel's INITIALIZE_ENCLAVE secure call's handler verifies that the policies specified during enclave creation are compatible with the policies expressed in the configuration information of the primary image, verifies that the enclave's platform library is loaded (Vertdl.dll), calculates the final 256-bit hash of the enclave (used for generating the enclave sealed report), and creates all the secure enclave threads. When the execution control is returned to the Windows Loader code in VT1.0, the system performs the first enclave call, which executes the initialization code of the platform DLL.

Step 4: Enclave calls (inbound and outbound) After the enclave has been correctly initialized, an application can make an arbitrary number of calls into the enclave. All the callable functions in the enclave need to be exported. An application can call the standard GetProcAddress API to get the address of the enclave's function and then use the CallEncIave routine for transferring the execution control to the secure enclave. In this scenario, which describes an inbound call, the NtClcEncIave kernel routine

CHAPTER 9 Virtualization technologies      383


---

performs the thread selection algorithm, which binds the calling VTL 0 thread to an enclave thread, according to the following rules:

- ■ If the normal thread was not previously called by the enclave (enclaves support nested calls),
then an arbitrary idle enclave thread is selected for execution. In case no idle enclave threads
are available, the call blocks until an enclave thread becomes available (if specified by the caller;
otherwise the call simply fails).

■ In case the normal thread was previously called by the enclave, then the call into the enclave is
made on the same enclave thread that issued the previous call to the host.
A list of enclave thread's descriptors is maintained by both the NT and Secure Kernel. When a normal thread is bound to an enclave thread, the enclave thread is inserted in another list, which is called the bound threads list. Enclave threads tracked by the latter are currently running and are not available anymore.

After the thread selection algorithm succeeds, the NT kernel emits the CALLENCEAVE secure call. The Secure Kernel creates a new stack frame for the enclave and returns to user mode. The first user mode function executed in the context of the enclave is RtlEnclaveCallDispatcher. The latter, in case the enclave call was the first one ever emitted, transfers the execution to the initialization routine of the VSM enclave runtime DLL (Vertdll.dll), which initializes the CRT, the loader, and all the services provided to the enclave; it finally calls the DllMain function of the enclave's main module and of all its dependent images (by specifying a DLL_PROCESS_ATTACH reason).

In normal situations, where the enclave platform DLL has been already initialized, the enclave dispatcher invokes the DllMain of each module by specifying a DLL_THREAD_ATTACH reason, verifies whether the specified address of the target enclave's function is valid, and, if so, finally calls the target function. When the target enclave's routine finishes its execution, it returns to VTL 0 by calling back into the containing process. For doing this, it still relies on the enclave platform DLL, which again calls the NtCallEnclave kernel routine. Even though the latter is implemented slightly differently in the Secure Kernel, it adopts a similar strategy for returning to VTL 0. The enclave itself can emit enclave calls for executing some function in the context of the unsecure containing process. In this scenario (which describes an outbound call), the enclave code uses the CallEnclave routine and specifies the address of an exported function in the containing process's main module.

Step 5: Termination and destruction When termination of an entire enclave is requested through the TerminateEnclave API, all threads executing inside the enclave will be forced to return to VTL0. Once termination of an enclave is requested, all further calls into the enclave will fail. As threads terminate, their VTL1 thread state (including thread stacks) is destroyed. Once all threads have stopped executing, the enclave can be destroyed. When the enclave is destroyed, all remaining VTL 1 state associated with the enclave is destroyed, too (including the entire enclave address space), and all pages are freed in VTL0. Finally, the enclave VAD is deleted and all committed enclave memory is freed. Destruction is triggered when the containing process calls VirtualFree with the base of the enclave's address range. Destruction is not possible unless the enclave has been terminated or was never initialized.

---

![Figure](figures/Winternals7thPt2_page_416_figure_000.png)

Note As we have discussed previously, all the memory pages that are mapped into the enclave address space are private. This has multiple implications. No memory pages that belong to the VTL 0 containing process are mapped in the enclave address space, though (and also no VADs describing the containing process's allocation is present). So how can the enclave access all the memory pages of the containing process?

The answer is in the Secure Kernel page fault handler (SkmmAccessFault). In its code, the fault handler checks whether the faulting process is an enclave. If it is, the fault handler checks whether the fault happens because the enclave tried to execute some code outside its region. In this case, it raises an access violation error. If the fault is due to a read or write access outside the enclave's address space, the secure page fault handler emits a GET_PHYSICAL_PAGE normal service, which results in the VTL 0 access fault handler to be called. The VTL 0 handler checks the containing process VAD tree, obtains the PFN of the page from its PTE—by bringing it in memory if needed—and returns it to VTL 1. At this stage, the Secure Kernel can create the necessary paging structures to map the physical page at the same virtual address (which is guaranteed to be available thanks to the property of the enclave itself) and resumes the execution. The page is now valid in the context of the secure enclave.

## Sealing and attestation

VBS-based enclaves, like hardware-based enclaves, support both the sealing and attestation of the data. The term sealing refers to the encryption of arbitrary data using one or more encryption keys that aren't visible to the enclave's code but are managed by the Secure Kernel and tied to the machine and to the enclave's identity. Enclaves will never have access to those keys; instead, the Secure Kernel offers services for sealing and unsealing arbitrary contents (through the EnclaveSealData and

EnclaveUnsealData APIs) using an appropriate key designated by the enclave. At the time the data is sealed, a set of parameters is supplied that controls which enclaves are permitted to unseal the data. The following policies are supported:

- ■ Security version number (SVN) of the Secure Kernel and of the primary image No en-
clave can unseal any data that was sealed by a later version of the enclave or the Secure Kernel.

■ Exact code The data can be unsealed only by an enclave that maps the same identical mod-
ules of the enclave that has sealed it. The Secure Kernel verifies the hash of the Unique ID of
every image mapped in the enclave to allow a proper unsealing.

■ Same image, family, or author The data can be unsealed only by an enclave that has the
same author ID, family ID, and/or image ID.

■ Runtime policy The data can be unsealed only if the unsealing enclave has the same debug-
ging policy of the original one (debuggable versus nondebuggable).
CHAPTER 9 Virtualization technologies      385


---

It is possible for every enclave to attest to any third party that it is running as a VBS enclave with all the protections offered by the VBS-enclave architecture. An enclave attestation report provides proof that a specific enclave is running under the control of the Secure Kernel. The attestation report contains the identity of all code loaded into the enclave as well as policies controlling how the enclave is executing.

Describing the internal details of the sealing and attestation operations is outside the scope of this

book. An enclave can generate an attestation report through the EnclaveGetAttestationReport API. The

memory buffer returned by the API can be transmitted to another enclave, which can "attest" the in tegrity of the environment in which the original enclave ran by verifying the attestation report through

the EnclaveVerifyAttestationReport function.

## System Guard runtime attestation

System Guard runtime attestation (SGRA) is an operating system integrity component that leverages the aforementioned VBS-enclaves—together with a remote attestation service component—to provide strong guarantees around its execution environment. This environment is used to assert sensitive system properties at runtime and allows for a relying party to observe violations of security promises that the system provides. The first implementation of this new technology was introduced in Windows 10 April 2018 Update (RS4).

SGRA allows an application to view a statement about the security posture of the device. This statement is composed of three parts:

- ■ A session report, which includes a security level describing the attestable boot-time properties

of the device

■ A runtime report, which describes the runtime state of the device

■ A signed session certificate, which can be used to verify the reports
The SGRA service, SgrmBroker.exe, hosts a component (SgrmEnclave_secure.dll) that runs in a VTL 1 as a VBS enclave that continually asserts the system for runtime violations of security features. These assertions are surfaced in the runtime report, which can be verified on the backend by a relying part. As the assertions run in a separate domain-of-trust, attacking the contents of the runtime report directly becomes difficult.

### SGRA internals

Figure 9-41 shows a high-level overview of the architecture of Windows Defender System Guard runtime attestation, which consists of the following client-side components:

- • The VTL-1 assertion engine: SgrmEnclave_secure.dll

• A VTL-0 kernel mode agent: SgrmAgent.sys

• A VTL-0 WinTCB Protected broker process hosting the assertion engine: SgrmBroker.exe

• A VTL-0 LPAC process used by the WinTCBPP broker process to interact with the networking

stack: SgrmLpac.exe
---

![Figure](figures/Winternals7thPt2_page_418_figure_000.png)

FIGURE 9-41 Windows Defender System Guard runtime attestation's architecture.

To be able to rapidly respond to threats, SGRA includes a dynamic scripting engine (Lua) forming the core of the assertion mechanism that executes in a VTL 1 enclave—an approach that allows frequent assertion logic updates.

Due to the isolation provided by the VBS enclave, threads executing in VTL 1 are limited in terms of their ability to access VTL 0 NT APIs. Therefore, for the runtime component of SCRA to perform meaningful work, a way of working around the limited VBS enclave API surface is necessary.

An agent-based approach is implemented to expose VTL 0 facilities to the logic running in VTL 1;

these facilities are termed assists and are serviced by the SgrmBroker user mode component or by an

agent driver running in VTL 0 kernel mode (SgrmAgent.sys). The VTL 1 logic running in the enclave can

call out to these VTL 0 components with the goal of requesting assists that provide a range of facilities,

including NT kernel synchronize primitives, page mapping capabilities, and so on.

As an example of how this mechanism works, SGRA is capable of allowing the VTL 1 assertion engine to directly read VTL 0-owned physical pages. The enclave requests a mapping of an arbitrary page via an assist. The page would then be locked and mapped into the SgrmBroker VTL 0 address space (making it resident). As VBS enclaves have direct access to the host process address space, the secure logic can read directly from the mapped virtual addresses. These reads must be synchronized with the VTL 0 kernel itself. The VTL 0 resident broker agent (SgrmAgent.sys driver) is also used to perform synchronization.

## Assertion logic

As mentioned earlier, SGRA asserts system security properties at runtime. These assertions are execut- ed within the assertion engine hosted in the VBS-based enclave. Signed Lua bytecode describing the assertion logic is provided to the assertion engine during start up.

CHAPTER 9 Virtualization technologies      387


---

Assertions are run periodically. When a violation of an asserted property is discovered (that is, when the assertion "fails"), the failure is recorded and stored within the enclave. This failure will be exposed to a relying party in the runtime report that is generated and signed (with the session certificate) within the enclave.

An example of the assertion capabilities provided by SGRA are the asserts surrounding various executive process object attributes—for example, the periodic enumeration of running processes and the assertion of the state of a process's protection bits that govern protected process policies.

The flow for the assertion engine performing this check can be approximated to the following steps:

- 1. The assertion engine running within VTL 1 calls into its VTL 0 host process (SgrmBroker) to
request that an executive process object be referenced by the kernel.

2. The broker process forwards this request to the kernel mode agent (SgrmAgent), which services
the request by obtaining a reference to the requested executive process object.

3. The agent notifies the broker that the request has been serviced and passes any necessary
metadata down to the broker.

4. The broker forwards this response to the requesting VTL 1 assertion logic.

5. The logic can then elect to have the physical page backing the referenced executive process
object locked and mapped into its accessible address space; this is done by calling out of the
enclave using a similar flow as steps 1 through 4.

6. Once the page is mapped, the VTL 1 engine can read it directly and check the executive process
object protection bit against its internally held context.

7. The VTL 1 logic again calls out to VTL 0 to unwind the page mapping and kernel object reference.
## Reports and trust establishment

A WinRT-based API is exposed to allow relying parties to obtain the SGRA session certificate and the signed session and runtime reports. This API is not public and is available under NDA to vendors that are part of the Microsoft Virus Initiative (note that Microsoft Defender Advanced Threat Protection is currently the only in-box component that interfaces directly with SGRA via this API).

The flow for obtaining a trusted statement from SGRA is as follows:

- 1. A session is created between the relying party and SGRA. Establishment of the session requires

a network connection. The SgrmEnclave assertion engine (running in VTL-1) generates a public-

private key pair, and the SgrmBroker protected process retrieves the TCG log and the VBS at-

testation report, sending them to Microsoft's System Guard attestation service with the public

component of the key generated in the previous step.

2. The attestation service verifies the TCG log (from the TPM) and the VBS attestation report (as

proof that the logic is running within a VBS enclave) and generates a session report describing

the attested boot time properties of the device. It signs the public key with an SGRA attestation

service intermediate key to create a certificate that will be used to verify runtime reports.
---

- 3. The session report and the certificate are returned to the relying party. From this point, the

relying party can verify the validity of the session report and runtime certificate.

4. Periodically, the relying party can request a runtime report from SGRA using the established

session: the $GrmEnclave assertion engine generates a runtime report describing the state of

the assertions that have been run. The report will be signed using the paired private key gener-

ated during session creation and returned to the relying party (the private key never leaves

the enclave).

5. The relying party can verify the validity of the runtime report against the runtime certificate

obtained earlier and make a policy decision based on both the contents of the session report

(boot-time attested state) and the runtime report (asserted state).
SGRA provides some API that relying parties can use to attest to the state of the device at a point

in time. The API returns a runtime report that details the claims that Windows Defender System Guard

runtime attestation makes about the security posture of the system. These claims include assertions,

which are runtime measurements of sensitive system properties. For example, an app could ask

Windows Defender System Guard to measure the security of the system from the hardware-backed

enclave and return a report. The details in this report can be used by the app to decide whether it

performs a sensitive financial transaction or displays personal information.

As discussed in the previous section, a VBS-based enclave can also expose an enclave attestation report signed by a VBS-specific signing key. If Windows Defender System Guard can obtain proof that the host system is running with VSM active, it can use this proof with a signed session report to ensure that the particular enclave is running. Establishing the trust necessary to guarantee that the runtime report is authentic, therefore, requires the following:

- 1. Attesting to the boot state of the machine: the OS, hypervisor, and Secure Kernel (SK) binaries

must be signed by Microsoft and configured according to a secure policy.

2. Binding trust between the TPM and the health of the hypervisor to allow trust in the Measured

Boot Log.

3. Extracting the needed key (VSM IDKs) from the Measured Boot Log and using these to verify

the VBS enclave signature (see Chapter 12 for further details).

4. Signing of the public component of an ephemeral key-pair generated within the enclave with

a trusted Certificate Authority to issue a session certificate.

5. Signing of the runtime report with the ephemeral private key.
Networking calls between the enclave and the Windows Defender System Guard attestation service are made from VTL 0. However, the design of the attestation protocol ensures that it is resilient against tampering even over untrusted transport mechanisms.

Numerous underlying technologies are required before the chain of trust described earlier can be sufficiently established. To inform a relying party of the level of trust in the runtime report that they can expect on any particular configuration, a security level is assigned to each Windows Defender System Guard attestation service-signed session report. The security level reflects the underlying technologies

CHAPTER 9 Virtualization technologies      389


---

enabled on the platform and attributes a level of trust based on the capabilities of the platform.

Microsoft is mapping the enablement of various security technologies to security levels and will share

this when the API is published for third-party use. The highest level of trust is likely to require the fol lowing features, at the very least:

- ■ VBS-capable hardware and OEM configuration.
■ Dynamic root-of-trust measurements at boot.
■ Secure boot to verify hypervisor, NT, and SK images.
■ Secure policy ensuring Hypervisor Enforced Code Integrity (HCVI) and kernel mode code integ-
rity (KMCI), test-signing is disabled, and kernel debugging is disabled.
■ The ELAM driver is present.
## Conclusion

Windows is able to manage and run multiple virtual machines thanks to the Hyper-V hypervisor and its virtualization stack, which, combined together, support different operating systems running in a VM. Over the years, the two components have evolved to provide more optimizations and advanced features for the VMs, like nested virtualization, multiple schedulers for the virtual processors, different types of virtual hardware support, VMBus, VA-backed VMs, and so on.

Virtualization-based security provides to the root operating system a new level of protection against malware and stealthy rootkits, which are no longer able to steal private and confidential information from the root operating system's memory. The Secure Kernel uses the services supplied by the Windows hypervisor to create a new execution environment (VTL 1) that is protected and not accessible to the software running in the main OS. Furthermore, the Secure Kernel delivers multiple services to the Windows ecosystem that help to maintain a more secure environment.

The Secure Kernel also defines the Isolated User Mode, allowing user mode code to be executed in the new protected environment through trustlets, secure devices, and enlaces. The chapter ended with the analysis of System Guard Runtime Attestation, a component that uses the services exposed by the Secure Kernel to measure the workstation's execution environment and to provide strong guarantees about its integrity.

In the next chapter, we look at the management and diagnostics components of Windows and

discuss important mechanisms involved with their infrastructure: the registry, services, T ask scheduler,

Windows Management Instrumentation (WMI), kernel Event Tracing, and so on.

---

