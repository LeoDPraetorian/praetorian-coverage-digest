## Stage 3: Creating the Windows executive process object

At this point, NtCreateItUserProcess has opened a valid Windows executable file and created a sec tion object to map it into the new process address space. Next, it creates a Windows executive process

object to run the image by calling the internal system function PspAllocateProcess. Creating the

executive process object (which is done by the creating thread) involves the following sub-stages:

- 3A. Setting up the EPROCESS object

3B. Creating the initial process address space

3C. Initializing the kernel process structure (KPROCESS)

3D. Concluding the setup of the process address space

3E. Setting up the PEB

3F. Completing the setup of the executive process object
![Figure](figures/Winternals7thPt1_page_155_figure_004.png)

Note The only time there won't be a parent process is during system initialization (when the System process is created). After that point, a parent process is always required to provide a security context for the new process.

## Stage 3A: Setting up the EPROCESS object

This sub-stage involves the following steps:

- 1. Inherit the affinity of the parent process unless it was explicitly set during process creation

(through the attribute list).

2. Choose the ideal NUMA node that was specified in the attribute list, if any.

3. Inherit the I/O and page priority from the parent process. If there is no parent process, the

default page priority (5) and I/O priority (Normal) are used.

4. Set the new process exit status to STATUS_PENDING.
---

5. Choose the hard error processing mode selected by the attribute list. Otherwise, inherit the parent's processing mode if none was given. If no parent exists, use the default processing mode, which is to display all errors.

6. Store the parent process ID in the InheritedFromUniqueProcessId field in the new process object.

7. Query the Image File Execution Options (IFEO) key to check if the process should be mapped with large pages (UseLargePages value in the IFEO key), unless the process is to run under Wow64, in which case large pages will not be used. Also, query the key to check if NTDLL has been listed as a DLL that should be mapped with large pages within this process.

8. Query the performance options key in IEF0 (PerfOptions), if it exists, which may consist of any number of the following possible values: IoPriority, PagePriority, CpuPriorityClass, and WorkingSetLimitInKB.

9. If the process would run under Wow64, then allocate the Wow64 auxiliary structure (EWOWPROCESS) and set it in the Wow64PROCESS structure.

10. If the process is to be created inside an AppContainer (in most cases a LowBox. (See Chapter 7 for appContainers.)

11. Attempt to acquire all the privileges required for creating the process. Choosing the process with large pages, assigning a token to the new process, mapping the process with large pages, and creating the appropriate privilege.

12. Create the process's primary access token (a duplicate of its parent's primary token). New processes inherit the security profile of their parents. If the CreateProcessAsUser function is being used to specify a different access token for the new process, the token is then changed appropriately. This change might happen only if the parent token's integrity level dominates the integrity level of the access token, and if the access token is a true child or sibling of the parent token. Note that if the parent has the SeAssignPrimaryToken privilege, this will bypass these checks.

13. The session ID of the new process token is now checked to determine if this is a cross-session create. If so, the parent process temporarily attaches to the target session to correctly process quota and address space creation.

14. Set the new process's quota block to the address of its parent's quota block. If the process was created through CreateProcessAsUser, this step won't occur. Instead, the default quota is created or a quota matching the user's profile is selected.

15. The process minimum and maximum working set sizes are set to the values of PspMinimum WorkingSet and PspMaximumWorkingSet, respectively. These values can be overridden if performance options were specified in the PerfOptions key part of Image File Execution Options, in which case the maximum working set is taken from there. Note that the default working set limits are soft limits and are essentially hints, while the PerfOptions working set maximum is a hard limit. (That is, the working set will not be allowed to grow past that number.)

CHAPTER 3 Process and jobs 139


---

- 16. Initialize the address space of the process. (See stage 3B.) Then detach from the target session if
it was different.

17. The group affinity for the process is now chosen if group-affinity inheritance was not used.
The default group affinity will either inherit from the parent if NUMA node propagation was
set earlier (the group owning the NUMA node will be used) or be assigned round-robin. If the
system is in forced group-awareness mode and group 0 was chosen by the selection algorithm,
group 1 is chosen instead, as long as it exists.

18. Initialize the KPROCESS part of the process object. (See Stage 3C.)

19. The token for the process is now set.

20. The process's priority class is set to normal unless the parent was using idle or the Below Normal
process priority class, in which case the parent's priority is inherited.

21. The process handle table is initialized. If the inherit handles flag is set for the parent process,
any inheritable handles are copied from the parent's object handle table into the new process.
(For more information about object handle tables, see Chapter 8 in Part 2.) A process attribute
can also be used to specify only a subset of handles, which is useful when you are using

CreateProcessAsUser to restrict which objects should be inherited by the child process.

22. If performance options were specified through the PerfOptions key, these are now applied.
The PerfOptions key includes overrides for the working set limit, I/O priority, page priority,
and CPU priority class of the process.

23. The final process priority class and the default quantum for its threads are computed and set.

24. The various mitigation options provided in the IFEO key (as a single 64-bit value named
Mitigation) are read and set. If the process is under an AppContainer, add the TreatAs-
AppContainer mitigation flag.

25. All other mitigation flags are now applied.
## Stage 3B: Creating the initial process address space

The initial process address space consists of the following pages:

- ■ Page directory (it's possible there'll be more than one for systems with page tables more than
two levels, such as x86 systems in PAE mode or 64-bit systems)

■ Hyperspace page

■ VAD bitmap page

■ Working set list
---

To create these pages, the following steps are taken:

- 1. Page table entries are created in the appropriate page tables to map the initial pages.

2. The number of pages is deducted from the kernel variable MmTotalCommittedPages and

added to MmProcessCommit.

3. The system-wide default process minimum working set size (PsMinimumWorkingSet) is

deducted from MmResidentAvailablePages.

4. The page table pages for the global system space (that is, other than the process-specific

pages we just described, and except session-specific memory) are created.
## Stage 3C: Creating the kernel process structure

The next stage of PsAppAllocateProcess is the initialization of the KPROCESS structure (the Pcb member

of the EPROCESS). This work is performed by KeInitIaIizeProcess, which does the following:

- 1. The doubly linked list, which connects all threads part of the process (initially empty), is initialized.

2. The initial value (or reset value) of the process default quantum (which is described in more de-
tail in the "Thread scheduling" section in Chapter 4) is hard-coded to 6 until it is initialized later
(by PspComputeQuantumAndPriority).
![Figure](figures/Winternals7thPt1_page_158_figure_005.png)

Note The default initial quantum differs between Windows client and server systems. For more information on thread quantums, turn to the discussion in the section "Thread scheduling" in Chapter 4.

- 3. The process's base priority is set based on what was computed in stage 3A.

4. The default processor affinity for the threads in the process is set, as is the group affinity. The

group affinity was calculated in stage 3A or inherited from the parent.

5. The process-swapping state is set to resident.

6. The thread seed is based on the ideal processor that the kernel has chosen for this process

(which is based on the previously created process's ideal processor, effectively randomizing this

in a round-robin manner). Creating a new process will update the seed in KeNodeBlock (the

initial NUMA node block) so that the next new process will get a different ideal processor seed.

7. If the process is a secure process (Windows 10 and Server 2016), then its secure ID is created

now by calling Hv1CreateSecureProcess.
## Stage 3D: Concluding the setup of the process address space

Setting up the address space for a new process is somewhat complicated, so let's look at what's involved one step at a time. To get the most out of this section, you should have some familiarity with the internals of the Windows memory manager, described in Chapter 5.

CHAPTER 3   Processes and jobs      141


---

The routine that does most of the work in setting the address space is MmInitializeProcess AddressSpace. It also supports cloning an address space from another process. This capability was

useful at the time to implement the POSIX fork system call. It may also be leveraged in the future to

support other Unix-style fork (this is how fork is implemented in Windows Subsystem for Linux in

Redstone 1). The following steps do not describe the address space cloning functionality, but rather

focus on normal process address space initialization.

- 1. The virtual memory manager sets the value of the process's last trim time to the current time.
The working set manager (which runs in the context of the balance set manager system thread)
uses this value to determine when to initiate working set trimming.

2. The memory manager initializes the process's working set list. Page faults can now be taken.
3. The section (created when the image file was opened) is now mapped into the new process's
address space, and the process section base address is set to the base address of the image.

4. The Process Environment Block (PEB) is created and initialized (see the section stage 3E).
5. Ntddll.dll is mapped into the process. If this is a Wow64 process, the 32-bit Ntddll.dll is also
mapped.

6. A new session, if requested, is now created for the process. This special step is mostly imple-
mented for the benefit of the Session Manager (Smss) when initializing a new session.

7. The standard handles are duplicated and the new values are written in the process parameters
structure.

8. Any memory reservations listed in the attribute list are now processed. Additionally, two flags
allow the bulk reservation of the first 1 or 16 MB of the address space. These flags are used
internally for mapping, for example, real-mode vectors and ROM code (which must be in the
low ranges of virtual address space, where normally the heap or other process structures could
be located).

9. The user process parameters are written into the process, copied, and fixed up (that is, they are
converted from absolute form to a relative form so that a single memory block is needed).

10. The affinity information is written into the PEB.

11. The MinWin API redirection set is mapped into the process and its pointer is stored in the PEB.

12. The process unique ID is now determined and stored. The kernel does not distinguish between
unique process and thread IDs and handles. The process and thread IDs (handles) are stored in
a global handle table (PspCidTable) that is not associated with any process.

13. If the process is secure (that is, it runs in IUM), the secure process is initialized and associated
with the kernel process object.
---

## Stage 3E: Setting up the PEB

NtCreateUserProcess calls MmCreatePeb, which first maps the system-wide National Language Support (NLS) tables into the process's address space. It next calls MmCreatePebTok to allocate a page for the PEB and then initializes a number of fields, most of them based on internal variables that were configured through the registry, such as MmHeap* values, MmCriticalSectionTimeout, and MmMinimumStackCommitInBytes. Some of these fields can be overridden by settings in the linked executable image, such as the Windows version in the PE header or the affinity mask in the load configuration directory of the PE header.

If the image header characteristics IMAGE_FILE_UP_SYSTEM_ONLY flag is set (indicating that the image can run only on a uniprocessor system), a single CPU (MM0Rat InGInl processorNumber) is chosen for all the threads in this new process to run on. The selection process is performed by simply cycling through the available processors. Each time this type of image is run, the next processor is used. In this way, these types of images are spread evenly across the processors.

## Stage 3F: Completing the setup of the executive process object

Before the handle to the new process can be returned, a few final setup steps must be completed, which are performed by PspInsertProcess and its helper functions:

- 1. If system-wide auditing of processes is enabled (because of either local policy settings or group
policy settings from a domain controller), the process's creation is written to the Security event
log.

2. If the parent process was contained in a job, the job is recovered from the job level set of the
parent and then bound to the session of the newly created process. Finally, the new process is
added to the job.

3. The new process object is inserted at the end of the Windows list of active processes (PsActive-
ProcessHead). Now the process is accessible via functions like EnumProcesses and OpenProcess.

4. The process debug port of the parent process is copied to the new child process unless the
NoDebugInherit flag is set (which can be requested when creating the process). If a debug port
was specified, it is attached to the new process.

5. Job objects can specify restrictions on which group or groups the threads within the processes
part of a job can run on. Therefore, PspInsertProcess must make sure the group affinity asso-
ciated with the process would not violate the group affinity associated with the job. An interest-
ing secondary issue to consider is if the job's permissions grant access to modify the process's
affinity permissions, because a lesser-privileged job object might interfere with the affinity
requirements of a more privileged process.

6. Finally, PspInsertProcess creates a handle for the new process by calling ObOpenObject-
ByPointer, and then returns this handle to the caller. Note that no process-creation callback
is sent until the first thread within the process is created, and the code always sends process
callbacks before sending object managed-based callbacks.
---

## Stage 4: Creating the initial thread and its stack and context

At this point, the Windows executive process object is completely set up. It still has no thread, however, so it can't do anything yet. It's now time to start that work. Normally, the PspCreateThread routine is responsible for all aspects of thread creation and is called by NtCreateThread when a new thread is being created. However, because the initial thread is created internally by the kernel without usermode input, the two helper routines that PspCreateThread relies on are used instead: PspAllocateThread and PspInsertThread. PspAllocateThread handles the actual creation and initialization of the executive thread object itself, while PspInsertThread handles the creation of the thread handle and security attributes and the call to KeStartThread to turn the executive object into a schedulable thread on the system. However, the thread won't do anything yet. It is created in a suspended state and isn't resumed until the process is completely initialized (as described in stage 5).

![Figure](figures/Winternals7thPt1_page_161_figure_002.png)

Note The thread parameter (which can't be specified in CreateProcess but can be specified in CreateThread) is the address of the PEB. This parameter will be used by the initialization code that runs in the context of this new thread (as described in stage 6).

PspAllocateThread performs the following steps:

- 1. It prevents user-mode scheduling (UMS) threads from being created in Wow64 processes, as
well as preventing user-mode callers from creating threads in the system process.

2. An executive thread object is created and initialized.

3. If energy estimation is enabled for the system (always disabled for XBOX), then it allocates and
initializes a THREAD_ENERGY_VALUES structure pointed to by the ETHREAD object.

4. The various lists used by LPC, I/O Management, and the Executive are initialized.

5. The thread's creation time is set, and its thread ID (TID) is created.

6. Before the thread can execute, it needs a stack and a context in which to run, so these are set
up. The stack size for the initial thread is taken from the image; there's no way to specify an-
other size. If this is a Wow64 process, the Wow64 thread context will also be initialized.

7. The thread environment block (TEB) is allocated for the new thread.

8. The user-mode thread start address is stored in the ETHREAD (in the StartAddress field).
This is the system-supplied thread startup function in Ndtll.dll (RtlUserThreadStart). The
user's specified Windows start address is stored in the ETHREAD in a different location
(the Win32StartAddress field) so that debugging tools such as Process Explorer can display
the information.

9. KeInitThread is called to set up the KTHREAD structure. The thread's initial and current base
priorities are set to the process's base priority, and its affinity and quantum are set to that of the
process. KeInitThread next allocates a kernel stack for the thread and initializes the machine-
dependent hardware context for the thread, including the context, trap, and exception frames.

APTER 3 Processes and jobs

From the Library of M
---

The thread's context is set up so that the thread will start in kernel startup. Finally, KeInitThread sets the thread's state to Initialized and returns to PspAllocateThread.

10. If this is a UMS thread, PspUmsInitThread is called to initialize the UMS state.

Once that work is finished, NtCreateUserProcess calls PspInsertThread to perform the following steps:

1. The thread ideal processor is initialized if it was specified using an attribute.

2. The thread group affinity is initialized if it was specified using an attribute.

3. If the process is part of a job, a check is made to ensure that the thread's group affinity does not violate job limitations (described earlier).

4. Checks are made to ensure that the process hasn't already been terminated, that the thread hasn't already been terminated, or that the thread hasn't even been able to start running. If any of these are true, thread creation will fail.

5. If the thread is part of a secure process (LUM), then the secure thread object is created and initialized.

6. The KTHREAD part of the thread object is initialized by calling KeStartThread. This involves inheriting scheduler settings from the owner process, setting the ideal node and processor, updating the group affinity, setting the base and dynamic priorities (by copying from the process), setting the thread quantum, and inserting the thread in the process list maintained by KPROCESS (a separate list from one in EPROCESS).

7. If the process is in a deep freeze (meaning no threads are allowed to run, including new threads), then this thread is frozen as well.

8. On non-x86 systems, if the thread is the first in the process (and the process is not the idle process), then the process is inserted into another system-wide list of processes maintained by the global variable KiProcessListHead.

9. The thread count in the process object is incremented, and the owner process's I/O priority and page priority are inherited. If this is the highest number of threads the process has ever had, the thread count high watermark is updated as well. If this was the second thread in the process, the primary token is frozen (that is, it can no longer be changed).

10. The thread is inserted in the process's thread list, and the thread is suspended if the creating process requested it.

11. The thread object is inserted into the process handle table.

12. If it's the first thread created in the process (that is, the operation happened as part of a CreateProcess* call), any registered callbacks for process creation are called. Then any registered thread callbacks are called. If any callback vetoes the creation, it will fail and return an appropriate status to the caller.

CHAPTER 3 Processes and jobs 145


---

13. If a job list was supplied (using an attribute) and this is the first thread in the process, then the process is assigned to all of the jobs in the job list.

14. The thread is readied for execution by calling KeReadyThread. It enters the deferred ready

state. (See Chapter 4 for more information on thread states.)

## Stage 5: Performing Windows subsystem-specific initialization

Once NtCreateUserProcess returns with a success code, the necessary executive process and thread objects have been created. CreateProcessInternalW then performs various operations related to Windows subsystem-specific operations to finish initializing the process.

1. Various checks are made for whether Windows should allow the executable to run. These checks include validating the image version in the header and checking whether Windows application certification has blocked the process (through a group policy). On specialized editions of Windows Server 2012 R2, such as Windows Storage Server 2012 R2, additional checks are made to see whether the application imports any disallowed APIs.

2. If software restriction policies dictate, a restricted token is created for the new process. Afterward, the application-compatible database is queried to see whether an entry exists in either the registry or system application database for the process. Compatibility shims will not be applied at this point; the information will be stored in the PEB once the initial thread starts executing (stage 6).

3. CreateProcessInternalW calls some internal functions (for non-protected processes) to get

SxS information (see the section "DLL name resolution and redirection" later in this chapter

for more information on side-by-side) such as manifest files and DLL redirection paths, as well

as other information such as whether the media on which the EXE resides is removable and

installer detection flags. For immersive processes, it also returns version information and target

platform from the package manifest.

4. A message to the Windows subsystem is constructed based on the information collected to be

sent to Cxssr. The message includes the following information:

- ● Path name and SxS path name

● Process and thread handles

● Section handle

● The access token handle

● Media information

● AppCompat and shim data

● Immersive process information

● The PEB address

● Various flags such as whether it’s a protected process or whether it is required to run elevated

ER 3 Processes and jobs

From the Library of
---

- • A flag indicating whether the process belongs to a Windows application (so that Css can

determine whether to show the startup cursor)

• UI language information

• DLL redirection and .local flags (discussed in the "Image loader" section later in this chapter)

• Manifest file information
When it receives this message, the Windows subsystem performs the following steps:

- 1. CsrCreateProcess duplicates a handle for the process and thread. In this step, the usage count
of the process and the thread is incremented from 1 (which was set at creation time) to 2.

2. The Cssr process structure (CSR_PROCESS) is allocated.

3. The new process's exception port is set to be the general function port for the Windows subsys-
tem so that the Windows subsystem will receive a message when a second-chance exception
occurs in the process. (For further information on exception handling, see Chapter 8 in Part 2.)

4. If a new process group is to be created with the new process serving as the root (CREATE_NEW_
PROCESS_GROUP flag in CreateProcess), then it's set in CSR_PROCESS. A process group is useful
for sending a control event to a set of processes sharing a console. See the Windows SDK docu-
mentation for CreateProcess and GenerateConsoleCtrlEvent for more information.

5. The Cssr thread structure (CSR_THREAD) is allocated and initialized.

6. CsrCreateThread inserts the thread in the list of threads for the process.

7. The count of processes in this session is incremented.

8. The process shutdown level is set to 0x280, the default process shutdown level. (See SetProcess-
ShutdownParameters in the Windows SDK documentation for more information.)

9. The new Cssr process structure is inserted into the list of Windows subsystem--wide processes.
After Css has performed these steps, CreateProcessInternalW checks whether the process was run elevated (which means it was executed through She'llExecute and elevated by the AppInfo service after the consent dialog box was shown to the user). This includes checking whether the process was a setup program. If it was, the process's token is opened, and the virtualization flag is turned on so that the application is virtualized. (See the information on UAC and virtualization in Chapter 7) If the application contained elevation shims or had a requested elevation level in its manifest, the process is destroyed and an elevation request is sent to the AppInfo service.

Note that most of these checks are not performed for protected processes. Because these processes must have been designed for Windows Vista or later, there's no reason they should require elevation, virtualization, or application-compatibility checks and processing. Additionally, allowing mechanisms such as the shim engine to use its usual hooking and memory-patching techniques on a protected process would result in a security hole if someone could figure how to insert arbitrary shims that modify the behavior of the protected process. Additionally, because the shim engine is installed by the parent process, which might not have access to its child protected process, even legitimate shimming cannot work.

CHAPTER 3   Processes and jobs      147


---

## Stage 6: Starting execution of the initial thread

At this point, the process environment has been determined, resources for its threads to use have been allocated, the process has a thread, and the Windows subsystem knows about the new process. Unless the caller specified the CREATE_SUSPENDED flag, the initial thread is now resumed so that it can start running and perform the remainder of the process-initialization work that occurs in the context of the new process (stage 7).

## Stage 7: Performing process initialization in the context of the new process

The new thread begins life running the kernel-mode thread startup routine K1StartUserThread.

K1StartUserThread lowers the thread's JRQL level from deferred procedure call (DPC) level to APC

level and then calls the system initial thread routine, PsUserThreadStartup. The user-specified

thread start address is passed as a parameter to this routine. PsUserThreadStartup performs the

following actions:

- 1. It installs an exception chain on x86 architecture. (Other architectures work differently in this
regard, see Chapter 8 in Part 2.)

2. It lowers IRQL to PASSIVE_LEVEL (0, which is the only IRQL user code is allowed to run at).
3. It disables the ability to swap the primary process token at runtime.
4. If the thread was killed on startup (for whatever reason), it's terminated and no further action is
taken.

5. It sets the locale ID and the ideal processor in the TEB, based on the information present in
kernel-mode data structures, and then it checks whether thread creation actually failed.

6. It calls DbgkCreateThread, which checks whether image notifications were sent for the new
process. If they weren't, and notifications are enabled, an image notification is sent first for the
process and then for the image load of Ndtll.dll.
![Figure](figures/Winternals7thPt1_page_165_figure_005.png)

Note This is done in this stage rather than when the images were first mapped because the process ID (which is required for the kernel callouts) is not yet allocated at that time.

7. Once those checks are completed, another check is performed to see whether the process is a debugger. If it is and if debugger notifications have not been sent yet, then a create process message is sent through the debug object (if one is present) so that the process startup debug event (CREATE_PROCESS_DEBUG_INFO) can be sent to the appropriate debugger process. This is followed by a similar thread startup debug event and by another debug event for the image load of Ntll.dll. DbgkCreateThread then waits for a reply from the debugger (via the ContiueDebugEvent function).

---

- 8. It checks whether application prefetching is enabled on the system and, if so, calls the prefetcher
(and Superfetch) to process the prefetch instruction file (if it exists) and prefetch pages refer-
enced during the first 10 seconds the last time the process ran. (For details on the prefetcher
and Superfetch, see Chapter 5.)

9. It checks whether the system-wide cookie in the SharedUserData structure has been set up. If
it hasn't, it generates it based on a hash of system information such as the number of interrupts
processed, DPC deliveries, page faults, interrupt time, and a random number. This system-wide
cookie is used in the internal decoding and encoding of pointers, such as in the heap manager
to protect against certain classes of exploitation. (For more information on the heap manager
security, see Chapter 5.)

10. If the process is secure (IUM process), then a call is made to Hv1StartSecureThread that trans-
fers control to the secure kernel to start thread execution. This function only returns when the
thread exits.

11. It sets up the initial thunk context to run the image-loader initialization routine (LdrInitialize-
Thunk in Ntdll.dll), as well as the system-wide thread startup stub (RtlUserThreadStart in
Ntdll.dll). These steps are done by editing the context of the thread in place and then issuing
an exit from system service operation, which loads the specially crafted user context. The
LdrInitializeThunk routine initializes the loader, the heap manager, NLS tables, thread-local
storage (TLS) and fiber-local storage (FLS) arrays, and critical section structures. It then loads
any required DLLs and calls the DLL entry points with the DLL_PROCESS_ATTACH function code.
Once the function returns, NConsume restores the new user context and returns to user mode.

Thread execution now truly starts.

RtlUserThreadStart uses the address of the actual image entry point and the start parameter and

calls the application's entry point. These two parameters have also already been pushed onto the stack

by the kernel. This complicated series of events has two purposes:

- ■ It allows the image loader inside Ntdll.dll to set up the process internally and behind the scenes
so that other user-mode code can run properly. (Otherwise, it would have no heap, no thread-
local storage, and so on.)

■ Having all threads begin in a common routine allows them to be wrapped in exception handling
so that if they crash, Ntdll.dll is aware of that and can call the unhandled exception filter inside
Kernel32.dll. It is also able to coordinate thread exit on return from the thread's start routine
and to perform various cleanup work. Application developers can also call SetUnhandled-

ExceptionFilter to add their own unhandled exception-handling code.
## EXPERIMENT: Tracing process startup

Now that we've looked in detail at how a process starts up and the different operations required to begin executing an application, we're going to use Process Monitor to look at some of the file I/O and registry keys that are accessed during this process.

---

Although this experiment will not provide a complete picture of all the internal steps we've described, you'll be able to see several parts of the system in action, notably prefetch and Superfetch, image-file execution options and other compatibility checks, and the image loader's DLL mapping.

We'll look at a very simple executable—Notepad.exe—and launch it from a Command Prompt window (Cmd.exe). It's important that we look both at the operations inside Cmd.exe and those inside Notepad.exe. Recall that a lot of the user-mode work is performed by CreateProcessInternalW, which is called by the parent process before the kernel has created a new process object.

To set things up correctly, follow these steps:

1. Add two filters to Process Monitor: one for Cmd.exe and one for Notepad.exe. These are the only two processes you should include. Be sure you don't have any currently running instances of these two processes so that you know you're looking at the right events. The filter window should look like this:

![Figure](figures/Winternals7thPt1_page_167_figure_004.png)

2. Make sure event logging is currently disabled (open the File and deselect Capture

Events) and then start the command prompt.

3. Enable event logging (open the File menu and choose Event Logging, press Ctrl+H, or click the magnifying glass icon on the toolbar) and then type Notepad.exe and press Enter. On a typical Windows system, you should see anywhere between 500 and 3,500 events appear.

4. Stop capture and hide the Sequence and Time of Day columns so that you can focus your

attention on the columns of interest. Your window should look similar to the one shown

in the following screenshot.

As described in stage 1 of the CreateProcess flow, one of the first things to notice is that just before the process is started and the first thread is created, Cmd.exe does a registry read at HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\ Notepad.exe. Because there were no image-execution options associated with Notepad.exe, the process was created as is.

150 CHAPTER 3 Processes and jobs


---

![Figure](figures/Winternals7thPt1_page_168_figure_000.png)

As with this and any other event in Process Monitor's log, you can see whether each part of the process-creation flow was performed in user mode or kernel mode, and by which routines, by looking at the stack of the event. T o do this, double-click the RegOpenKey event and switch to the Stack tab. The following screenshot shows the standard stack on a 64-bit Windows 10 machine:

![Figure](figures/Winternals7thPt1_page_168_figure_002.png)

CHAPTER 3 Processes and jobs     151


---

This stack shows that you already reached the part of process creation performed in kernel

mode (through NtCreateUserProcess) and that the helper routine PspAllocateProcess is

responsible for this check.

Going down the list of events after the thread and process have been created, you will notice

three groups of events:

- ■ A simple check for application-compatible flags, which will let the user-mode process-
creation code know if checks inside the application-compatible database are required
through the shim engine.

■ Multiple reads to SxS (search for Side-By-Side), Manifest, and MUI/Language keys, which
are part of the assembly framework mentioned earlier.

■ File I/O to one or more .sdb files, which are the application-compatible databases on
the system. This I/O is where additional checks are done to see if the shim engine needs to
be invoked for this application. Because Notepad is a well-behaved Microsoft program, it
doesn't require any shims.
The following screenshot shows the next series of events, which happen inside the Notepad process itself. These are actions initiated by the user-mode thread startup wrapper in kernel mode, which performs the actions described earlier. The first two are the Notepad.exe and Ndtll. dll image load debug notification messages, which can be generated only now that code is running inside Notepad's process context and not inside the context for the command prompt.

![Figure](figures/Winternals7thPt1_page_169_figure_004.png)

152    CHAPTER 3   Processes and jobs


---

Next, the prefetcher kicks in, looking for a prefect database file that has already been generated for Notepad. (For more information on the prefetcher, see Table 5.) On a system where Notepad has already been run at least once, this database will exist, and the prefetcher will begin executing the commands specified inside it. If this is the case, scrolling down, you will see multiple DLLs being read and queried. Unlike typical DLL loading, which is done by the usermode image loader by looking at the import tables or when an application manually loads a DLL, these events are being generated by the prefetcher, which is already aware of the libraries that Notepad will require. Typical image loading of the DLLs required happens next, and you will see events similar to the ones shown here:

This is a story about a man who lives in the real world and whose daily life revolves on the events of his family and his dog--a story of a man who's life is a series of trues.

These are now being generated from code running inside user mode, which was called once the kernel-mode wrapper function finished its work. Therefore, these are the first events coming from LdrInitializeProcess, which is called with LdrInitializeThuk for the first thread in the process. You can confirm this on your own by looking at the stack of these events— for example, the kernel32.dll image load event, which is shown in the following screenshot.

Further events are generated by this routine and its associated helper functions that you finally react events generated by the WinMain function inside Notepad, which is where code under the developer's control is now being executed. Describing in detail all the events and usermode components that come into play during process execution would fill this entire chapter, so exploration of any further events is left as an exercise for the reader.

CHAPTER 3 Processes and jobs 153


---

![Figure](figures/Winternals7thPt1_page_171_figure_000.png)

## Terminating a process

A process is a container and a boundary. This means resources used by one process are not automatically visible in other processes, so some inter-process communication mechanism needs to be used to pass information between processes. Therefore, a process cannot accidentally write arbitrary bytes on another process's memory. That would require explicit call to a function such as WriteProcessMemory. However, to get that to work, a handle with the proper access mask (PROCESS_VM_WRITE) must be opened explicitly, which may or may not be granted. This natural isolation between processes also means that if some exception happens in one process, it will have no effect on other processes. The worst that can happen is that same process would crash, but the rest of the system stays intact.

A process can exit gracefully by calling the ExitProcess function. For many processes—depending on linker settings—the process startup code for the first thread calls ExitProcess on the process's behalf when the thread returns from its main function. The term gracefully means that DLLs loaded into the process get a chance to do some work by getting notified of the process exit using a call to their DllMain function with DLL_PROCESS_DETACH.

ExitProcess can be called only by the process itself asking to exit. An ungraceful termination of a process is possible using the TerminateProcess function, which can be called from outside the process. (For example, Process Explorer and T ask Manager use it when so requested.) T erminateProcess requires a handle to the process that is opened with the PROCESS_TERMINATE access mask, which may or may not be granted. This is why it's not easy (or it's impossible) to terminate some processes (for example, Csrss)—the handle with the required access mask cannot be obtained by the requesting user.

154   CHAPTER 3  Processes and jobs


---

The meaning of ungraceful here is that DLLs don't get a chance to execute code (DLL_PROCESS_DETACH

is not sent) and all threads are terminated abruptly. This can lead to data loss in some cases—for example,

if a file cache has no chance to flush its data to the target file.

In whatever way a process ceases to exist, there can never be any leaks. That is, all process's private

memory is freed automatically by the kernel, the address space is destroyed, all handles to kernel

objects are closed, etc. If open handles to the process still exist (the EPROCESS structure still exists), then

other processes can still gain access to some process-management information, such as the process

exit code (GetExitCodeProcess). Once these handles are closed, the EPROCESS is properly destroyed,

and there's truly nothing left of the process.

That being said, if third party drivers make allocations in kernel memory on behalf of a process— say, due to an IOCTL or merely due to a process notification—it is their responsibility to free any such pool memory on their own. Windows does not track or clean-up process-owned kernel memory (except for memory occupied by objects due to handles that the process created). This would typically be done through the IRP_MJ_CLOSE or IRP_MJ_CLEANUP notification to tell the driver that the handle to the device object has been closed, or through a process termination notification. (see Chapter 6, "I/O system," for more on IOCTLs.)

## Image loader

As we've just seen, when a process is started on the system, the kernel creates a process object to

represent it and performs various kernel-related initialization tasks. However, these tasks do not result

in the execution of the application, merely in the preparation of its context and environment. In fact,

unlike drivers, which are kernel-mode code, applications execute in user mode. So most of the actual

initialization work is done outside the kernel. This work is performed by the image loader, also internally

referred to as Ldr.

The image loader lives in the user-mode system DLL Ntdll.dll and not in the kernel library. Therefore, it behaves just like standard code that is part of a DLL, and it is subject to the same restrictions in terms of memory access and security rights. What makes this code special is the guarantee that it will always be present in the running process (Ntdll.dll is always loaded) and that it is the first piece of code to run in user mode as part of a new process.

Because the loader runs before the actual application code, it is usually invisible to users and developers. Additionally, although the loader's initialization tasks are hidden, a program typically does interact with its interfaces during the run time of a program—for example, whenever loading or unloading a DLL or querying the base address of one. Some of the main tasks the loader is responsible for include:

- ■ Initializing the user-mode state for the application, such as creating the initial heap and setting

up the thread-local storage (TLS) and fiber-local storage (FLS) slots.

■ Parsing the import table (IAT) of the application to look for all DLLs that it requires (and then

recursively parsing the IAT of each DLL), followed by parsing the export table of the DLLs to

make sure the function is actually present. (Special forwarder entries can also redirect an export

to yet another DLL)
---

- ■ Loading and unloading DLLs at run time, as well as on demand, and maintaining a list of all
loaded modules (the module database).

■ Handling manifest files, needed for Windows Side-by-Side (SxS) support, as well as Multiple
Language User Interface (MUI) files and resources.

■ Reading the application compatibility database for any shims, and loading the shim engine DLL
if required.

■ Enabling support for API Sets and API redirection, a core part of the One Core functionality that
allows creating Universal Windows Platform (UWP) applications.

■ Enabling dynamic runtime compatibility mitigations through the SwitchBack mechanism as well
as interfacing with the shim engine and Application Verifier mechanisms.
As you can see, most of these tasks are critical to enabling an application to actually run its code. Without them, everything from calling external functions to using the heap would immediately fail. After the process has been created, the loader calls the NtContinue special native API to continue execution based on an exception frame located on the stack, just as an exception handler would. This exception frame, built by the kernel as we saw in an earlier section, contains the actual entry point of the application. Therefore, because the loader doesn't use a standard call or jump into the running application, you'll never see the loader initialization functions as part of the call tree in a stack trace for a thread.

EXPERIMENT: Watching the image loader

In this experiment, you'll use global flags to enable a debugging feature called loader snaps. This allows you to see debug output from the image loader while debugging application startup.

- 1. From the directory where you've installed WinDbg, launch the Gflags.exe application,
and then click the Image File tab.

2. In the Image field, type Notepad.exe, and then press the Tab key. This should enable
the various options. Select the Show Loader Snaps option and then click OK or Apply.

3. Now launch WinDbg, open the File menu, choose Open Executable, and navigate to
c:\windows\system32\notepad.exe to launch it. You should see a couple of screens of
debug information similar to that shown here:
```bash
0f64-2090 @ 02405218 - LdrdInitializeProcess - INFO: Beginning execution of
notepad.exe (C:\Windows\notepad.exe)
    Current directory: C:\Program Files (x86)\Windows Kits\10\Debuggers\
    Package directories: (null)
0f64-2090 @ 02405218 - LdrDockDll - ENTER: DLL name: KERNEL32.DLL
0f64-2090 @ 02405218 - LdrDockDLLInternal - ENTER: DLL name: KERNEL32.DLL
0f64-2090 @ 02405218 - LdrFindKnownDll - ENTER: DLL name: KERNEL32.DLL
0f64-2090 @ 02405218 - LdrFindKnownDll - RETURN: Status: 0x00000000
```

---

```bash
0f64+2090 @ 02405218 - LdrpMinimalMapModule - ENTER: DLL name: C:\WINDOWS\
System32\KERNEL32.DLL
ModLoad: 00007FFF$fb4b0000 00007FFF$fb55d000 C:\WINDOWS\System32\KERNEL32.DLL
0f64+2090 @ 02405218 - LdrpMinimalMapModule - RETURN: Status: 0x00000000
0f64+2090 @ 02405218 - LdrpPreprocessDtlName - INFO: DLL api-ms-win-core-
rtsupport-11-2-0.dtl was redirected to C:\WINDOWS\System32\ntdll1.dl by API set
0f64+2090 @ 02405218 - LdrpFindKnownDll - ENTER: DLL name: KERNELBASE.dll
0f64+2090 @ 02405218 - LdrpFindKnownDll - RETURN: Status: 0x00000000
0f64+2090 @ 02405218 - LdrpMinimalMapModule - ENTER: DLL name: C:\WINDOWS\
System32\KERNELBASE.dll
ModLoad: 00007FFF$fb890000 00007FFF$8dc6000 C:\WINDOWS\System32\KERNELBASE.dll
0f64+2090 @ 02405218 - LdrpMinimalMapModule - RETURN: Status: 0x00000000
0f64+2090 @ 02405218 - LdrpPreprocessDtlName - INFO: DLL api-ms-win-
eventing-provider-11-1-0.dll was redirected to C:\WINDOWS\System32\
kernelbase.dll by API set
0f64+2090 @ 02405218 - LdrpPreprocessDtlName -INFO: DLL api-ms-win-core-
apquery-11-1-0.dll was redirected to C:\WINDOWS\System32\ntdll1.dtl by API set
```

4. Eventually, the debugger breaks somewhere inside the loader code, at a location where

the image loader checks whether a debugger is attached and fires a breakpoint. If you

press the g key to continue execution, you will see more messages from the loader, and

Notepad will appear.

5. Try interacting with Notepad and see how certain operations invoke the loader. A good experiment is to open the Save/Open dialog box. That demonstrates that the loader not only runs at startup, but continuously responds to thread requests that can cause delayed loads of other modules (which can then be unloaded after use).

## Early process initialization

Because the loader is present in Ntdll.dll, which is a native DLL that's not associated with any particular subsystem, all processes are subject to the same loader behavior (with some minor differences). Earlier, we took a detailed look at the steps that lead to the creation of a process in kernel mode, as well as some of the work performed by the Windows function CreateProcess. Here, we'll cover all the other work that takes place in user mode, independent of any subsystem, as soon as the first user-mode instruction starts execution.

When a process starts, the loader performs the following steps:

- 1. It checks if LdrProcessInitiallization is already set to 1 or if the SkipJpLoaderInit flag is set in the
TEB. In this case, skip all initialization and wait three seconds for someone to call LdrProcess-

InitializationComplete. This is used in cases where process reflection is used by Windows
Error Reporting, or other process fork attempts where loader initialization is not needed.

2. It sets the LdrInitState to 0, meaning that the loader is uninitialized. Also set the PEB's

ProcessInitialization flag to 1 and the TEB's RanProcessInit to 1
CHAPTER 3 Processes and jobs 157


---

- 3. It initializes the loader lock in the PEB.

4. It initializes the dynamic function table, used for unwind/exception support in JIT code.

5. It initializes the Mutable Read Only Heap Section (MRDATA), which is used to store security-

relevant global variables that should not be modified by exploits (see Chapter 7 for more

information).

6. It initializes the loader database in the PEB.

7. It initializes the National Language Support (NLS, for internationalization) tables for the process.

8. It builds the image path name for the application.

9. It captures the SEH exception handlers from the .pdata section and builds the internal exception

tables.

10. It captures the system call thanks for the five critical loader functions: NtCreateSection,

NtOpenFile, NtQueryAttributesFile, NtOpenSection, and NtMapViewOfSection.

11. It reads the mitigation options for the application (which are passed in by the kernel through the

LdrSystemDllInitBlock exported variable). These are described in more detail in Chapter 7.

12. It queries the Image File Execution Options (IIFO) registry key for the application. This will

include options such as the global flags (stored in GlobalFlags), as well as heap-debugging

options (DisableHeapOutside, ShutdownFlags, and FrontEndHeapDebugOptions), loader

settings (UnloadEventTraceDepth, MaxLoaderThreads, UseImpersonatedDeviceMap), ETW

settings (TracingFlags). Other options include MinimumStackCommitInBytes and MaxDead-

ActivationContexts. As part of this work, the Application Verifier package and related Verifier

DLLs will be initialized and Control Flow Guard (CFG) options will be read from CFGOptions.

13. It looks inside the executable's header to see whether it is a .NET application (specified by the

presence of a .NET-specific image directory) and if it's a 32-bit image. It also queries the kernel

to verify if this is a Wow64 process. If needed, it handles a 32-bit IL-only image, which does not

require Wow64.

14. It loads any configuration options specified in the executable's Image Load Configuration

Directory. These options, which a developer can define when compiling the application, and

which the compiler and linker also use to implement certain security and mitigation features

such as CFG, control the behavior of the executable.

15. It minimally initializes FLS and TLS.

16. It sets up debugging options for critical sections, creates the user-mode stack trace database

if the appropriate global flag was enabled, and queries StackTraceDatabaseSizeInMb from

the Image File Execution Options.

17. It initializes the heap manager for the process and creates the first process heap. This will use

various load configuration, image file execution, global flags, and executable header options to

set up the required parameters.

CHAPTER 3 Processes and jobs

From the Library of I
---

18. It enables the Terminate process on heap corruption mitigation if it's turned on.

19. It initializes the exception dispatch log if the appropriate global flag has enabled this.

20. It initializes the thread pool package, which supports the Thread Pool API. This queries and

takes into account NUMA information.

21. It initializes and converts the environment block and parameter block, especially as needed to

support WoW64 processes.

22. It opens the \KnownDlls object directory and builds the known DLL path. For a Wow64 process,

\KnownDlls32 is used instead.

23. For store applications, it reads the Application Model Policy options, which are encoded in the

WIN://SPK and WP://SKUID claims of the token (see the "AppContainers" section in Chapter 7

for more information).

24. It determines the process's current directory, system path, and default load path (used when

loading images and opening files), as well as the rules around default DLL search order.

This includes reading the current policy settings for Universal (UWP) versus Desktop Bridge

(Centennial) versus Silverlight (Windows Phone 8) packaged applications (or services).

25. It builds the first loader data table entry for Ntdll.dll and inserts it into the module database.

26. It builds the unwind history table.

27. It initializes the parallel loader, which is used to load all the dependencies (which don't have

cross-dependencies) using the thread pool and concurrent threads.

28. It builds the next loader data table entry for the main executable and inserts it into the module

database.

29. If needed, it relocates the main executable image.

30. If enabled, it initializes Application Verifier.

31. It initializes the Wow64 engine if this is a Wow64 process. In this case, the 64-bit loader will

finish its initialization, and the 32-bit loader will take control and re-start most of the operations

we've just described up until this point.

32. If this is a .NET image, it loads Mscore.dll (.Net runtime shim), and retrieves the

main executable entry point (.CoExExMain), overwriting the exception record to set this as the

entry point instead of the regular main function.

33. It initializes the TLS slots of the process.

34. For Windows subsystem applications, it manually loads Kernel32.dll and Kernelbase.dll, regard less of actual imports of the process. As needed, it uses these libraries to initialize the SRP/SAFE

(Software Restriction Policies) mechanisms, as well as capture the Windows subsystem thread

initialization thunk function. Finally, it resolves any API Set dependencies that exist specifically

between these two libraries.

CHAPTER 3 Processes and jobs 159


---

- 35. It initializes the shim engine and parses the shim database.

36. It enables the parallel image loader, as long as the core loader functions scanned earlier do not

have any system call hooks or "detours" attached to them, and based on the number of loader

threads that have been configured through policy and image file execution options.

37. It sets the LdrInitState variable to 1, meaning "import loading in progress."
At this point, the image loader is ready to start parsing the import table of the executable belonging

to the application and start loading any DLLs that were dynamically linked during the compilation of

the application. This will happen both for .NET images, which will have their imports processed by call ing into the .NET runtime, as well as for regular images. Because each imported DLL can also have its

own import table, this operation, in the past, continued recursively until all DLLs had been satisfied and

all functions to be imported have been found. As each DLL was loaded, the loader kept state informa tion for it and built the module database.

In newer versions of Windows, the loader instead builds a dependency map ahead of time, with specific nodes that describe a single DLL and its dependency graph, building out separate nodes that can be loaded in parallel. At various points when serialization is needed, the thread pool worker queue is "drained," which services as a synchronization point. One such point is before calling all the DLL initialization routines of all the static imports, which is one of the last stages of the loader. Once this is done, all the static TLS initializers are called. Finally, for Windows applications, in between these two steps, the Kernel32 thread initialization thunk function (BaseThread1InThread) is called at the beginning, and the Kernel32 post-process initialization routine is called at the end.

## DLL name resolution and redirection

Name resolution is the process by which the system converts the name of a PE-format binary to a physical file in situations where the caller has not specified or cannot specify a unique file identity. Because the locations of various directories (the application directory, the system directory, and so on) cannot be hardcoded at link time, this includes the resolution of all binary dependencies as well as LoadLibrary operations in which the caller does not specify a full path.

When resolving binary dependencies, the basic Windows application model locates files in a search path—a list of locations that is searched sequentially for a file with a matching base name—although various system components override the search path mechanism in order to extend the default application model. The notion of a search path is a holdover from the era of the command line, when an application's current directory was a meaningful notion; this is somewhat anachronistic for modern GUI applications.

However, the placement of the current directory in this ordering allowed load operations on system

binaries to be overridden by placing malicious binaries with the same base name in the application's

current directory, a technique often known as binary planting. T o prevent security risks associated with

this behavior, a feature known as safe DLL search mode was added to the path search computation and

is enabled by default for all processes. Under safe search mode, the current directory is moved behind

the three system directories, resulting in the following path ordering:

---

- 1. The directory from which the application was launched

2. The native Windows system directory (for example, C:\Windows\System32)

3. The 16-bit Windows system directory (for example, C:\Windows\System)

4. The Windows directory (for example, C:\Windows)

5. The current directory at application launch time

6. Any directories specified by the %PATH% environment variable
The DLL search path is recomputed for each subsequent DLL load operation. The algorithm used to compute the search path is the same as the one used to compute the default search path, but the application can change specific path elements by editing the %PATH% variable using the SetEnvironmentVariable API, changing the current directory using the SetCurrentDirectory API, or using the SetD1Directory API to specify a DLL directory for the process. When a DLL directory is specified, the directory replaces the current directory in the search path and the loader ignores the safe DLL search mode setting for the process.

Callers can also modify the DLL search path for specific load operations by supplying the LOAD_ WITH_ALTERED_SEARCH_PATH flag to the LoadLibraryEx API. When this flag is supplied and the DLL name supplied to the API specifies a full path string, the path containing the DLL file is used in place of the application directory when computing the search path for the operation. Note that if the path is a relative path, this behavior is undefined and potentially dangerous. When Desktop Bridge (Centennial) applications load, this flag is ignored.

Other flags that applications can specify to LoadLibraryEx include LOAD_LIBRARY_SEARCH_DLL,

LOAD_DLR, LOAD_LIBRARY_SEARCH_APPLICATION_DIR, LOAD_LIBRARY_SEARCH_SYSTEM32, and LOAD_

LIBRARY_SEARCH_USER_DIRS, in place of the LOAD_WITH_ALTERED_SEARCH_PATH flag. Each of these

modifies the search order to only search the specific directory (or directories) that the flag references,

or the flags can be combined as desired to search multiple locations. For example, combining the appli cation, system32, and user directories results in LOAD_LIBRARY_SEARCH_DEFAULT_DIRS. Furthermore,

these flags can be globally set using the SetDefaultDirectorForces API, which will affect all library

loads from that point on.

Another way search-path ordering can be affected is if the application is a packaged application or if it is not a packaged service or legacy Silverlight 8.0 Windows Phone application. In these conditions, the DLL search order will not use the traditional mechanism and APIs, but will rather be restricted to the package-based graph search. This is also the case when the LoadPackagedLibraryEx API is used instead of the regular LoadLibraryEx function. The package-based graph is computed based on the <PackageDependency> entries in the UWP application's manifest file's <Dependencies> section, and guarantees that no arbitrary DLLs can accidentally load in the package.

Additionally, when a packaged application is loaded, as long as it is not a Desktop Bridge application, all application-configurable DLL search path ordering APIs, such as the ones we saw earlier, will be disabled, and only the default system behavior will be used (in combination with only looking through package dependencies for most UWP applications as per the above).

CHAPTER 3 Processes and jobs      161


---

Unfortunately, even with safe search mode and the default path searching algorithms for legacy

applications, which always include the application directory first, a binary might still be copied from

its usual location to a user-accessible location (for example, from c:\windows\system32\notepad.exe

into c:\temp\notepad.exe, an operation that does not require administrative rights). In this situation,

an attacker can place a specifically crafted DLL in the same directory as the application, and due to the

ordering above, it will take precedence over the system DLL. This can then be used for persistence or

otherwise affecting the application, which might be privileged (especially if the user, unaware of the

change, is elevating it through UAC). To defend against this, processes and/or administrators can use a

process-mitigation policy (see Chapter 7 for more information on these) called Prefer System32 Images,

which inverts the order above between points 1 and 2, as the name suggests.

## DLL name redirection

Before attempting to resolve a DLL name string to a file, the loader attempts to apply DLL name redirection rules. These redirection rules are used to extend or override portions of the DLL namespace— which normally corresponds to the Win32 file system namespace—to extend the Windows application model. In order of application, these are:

- ■MinWin API Set redirection The API set mechanism is designed to allow different versions
or editions of Windows to change the binary that exports a given system API in a manner that is
transparent to applications, by introducing the concept of contracts. This mechanism was briefly
touched upon in Chapter 2, and will be further explained in a later section.

●.LOCAL redirection The .LOCAL redirection mechanism allows applications to redirect all
loads of a specific DLL base name, regardless of whether a full path is specified, to a local copy
of the DLL in the application directory—either by creating a copy of the DLL with the same base
name followed by .local (for example, MyLibrary.dll.local) or by creating a file folder with the
name .local under the application directory and placing a copy of the local DLL in the folder
(for example, C:\MyApp\LOCAL\MyLibrary.dll). DLLs redirected by the .LOCAL mechanism are
handled identically to those redirected by $x$. (See the next bullet point.) The loader honors
.LOCAL redirection of DLLs only when the executable does not have an associated manifest,
either embedded or external. It's not enabled by default. To enable it globally, add the DWORD
value DevOver->Enable in the base IFOE key (HKL\Software\Microsoft\WindowsNT\Cu-
rrentVersion\Image File Execution Options) and set it to 1.

■ Fusion (SxS) redirection Fusion (also referred to as side-by-side, or SxS) is an extension to the
Windows application model that allows components to express more detailed binary depen-
dency information (usually versioning information) by embedding binary resources known
as manifests. The Fusion mechanism was first used so that applications could load the correct
version of the Windows common controls package (comctl32.dll) after that binary was split into
different versions that could be installed alongside one another; other binaries have since been
versioned in the same fashion. As of Visual Studio 2005, applications built with the Microsoft
linker use Fusion to locate the appropriate version of the C runtime libraries, while Visual Studio
2015 and later use API Set redirection to implement the idea of the universal CRT.
---

The Fusion runtime tool reads embedded dependency information from a binary's resource section using the Windows resource loader, and it packages the dependency information into lookup structures known as activation contexts. The system creates default activation contexts at the system and process level at boot and process startup time, respectively; in addition, each thread has an associated activation context stack, with the activation context structure at the top of the stack considered active. The per-thread activation context stack is managed both explicitly, via the ActivateActCtx and DeactivateActCtx APIs, and implicitly by the system at certain points, such as when the DLL main routine of a binary with embedded dependency information is called. When a Fusion DLL name redirection lookup occurs, the system searches for redirection information in the activation context at the head of the thread's activation context stack, followed by the process and system activation contexts; if redirection information is present, the file identity specified by the activation context is used for the load operation.

■ Known DLL redirection Known DLLs is a mechanism that maps specific DLL base names to files in the system directory, preventing the DLL from being replaced with an alternate version in a different location.

One edge case in the DLL path search algorithm is the DLL versioning check performed on 64bit and WoW64 applications. If a DLL with a matching base name is located but is subsequently determined to have been compiled for the wrong machine architecture—for example, a 64bit image in a 32-bit application—the loader ignores the error and resumes the path search operation, starting with the path element after the one used to locate the incorrect file. This behavior is designed to allow applications to specify both 64-bit and 32-bit entries in the global %PATH% environment variable.

## EXPERIMENT: Observing DLL load search order

You can use Sysinternals Process Monitor tool to watch how the loader searches for DLLs. When the loader attempts to resolve a DLL dependency, you will see it perform CreateFile calls to probe each location in the search sequence until either it finds the specified DLL or the load fails.

Here's the capture of the loader's search for the OneDrive.exe executable. To re-create the

experiment, do the following:

- 1. If the OneDrive is running, close it from its tray icon. Make sure to close all Explorer
windows that are looking at OneDrive content.

2. Open Process Monitor and add filters to show just the process OneDrive.exe. Optionally,
show only the operation for CreateFile.

3. Go to %LocalAppData%\Microsoft\OneDrive and launch OneDrive.exe or OneDrive

Personal.cmd (which launches OneDrive.exe as "personal" rather than "business").

You should see something like the following (note that OneDrive is a 32 bit process,

here running on a 64 bit system):
---

![Figure](figures/Winternals7thPt1_page_181_figure_000.png)

Here are some of the calls shown as they relate to the search order described previously:

- ■ KnownDlls DLLs load from the system location (ole32.dll in the screenshot).
■ LoggingPlatform.Dll is loaded from a version subdirectory, probably because OneDrive
calls SetDllDirectory to redirect searches to the latest version (17.3.6743.1212 in the screen-
shot).
■ The MSVCRI20.dll (MSVC run time version 12) is searched for in the executable's directory,
and is not found. Then it's searched in the version subdirectory, where it's located.
■ The Wsock32.Dll (WinSock) is searched in the executable's path, then in the version subdi-
rectory, and finally located in the system directory (SysWow64). Note that this DLL is not a
KnownDll.
