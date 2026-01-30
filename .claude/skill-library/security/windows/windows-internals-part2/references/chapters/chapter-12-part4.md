## Conclusion

In this chapter, we examined the detailed steps involved in starting and shutting down Windows (both normally and in error cases). A lot of new security technologies have been designed and implemented with the goal of keeping the system safe even in its earlier startup stages and rendering it immune from a variety of external attacks. We examined the overall structure of Windows and the core system mechanisms that get the system going, keep it running, and eventually shut it down, even in a fast way.

---

## APPENDIX  Contents of Windows Internals, Seventh Edition, Part 1

Introduction......xi

Chapter 1 Concepts and tools......1 Windows operating system versions......1 Windows 10 and future Windows versions......3 Windows 10 and OneCore......3 Foundation concepts and terms......4 Windows API......4 Services, functions, and routines......7 Processes......8 Threads......18 Jobs......20 Virtual memory......21 Kernel mode vs. user mode......23 Hypervisor......27 Firmware......29 Terminal Services and multiple sessions......29 Objects and handles......30 Security......31 Registry......32 Unicode......33 Digging into Windows internals......35 Performance Monitor and Resource Monitor......36 Kernel debugging......38 Windows Software Development Kit.......43 Windows Driver Kit......43 Sysinternals tools......44 Conclusion......44

851


---

Chapter 2 System architecture......45 Requirements and design goals......45 Operating system model......46 Architecture overview......47 Portability......50 Symmetric multiprocessing......51 Scalability......53 Differences between client and server versions......54 Checked build......57 Virtualization-based security architecture overview......59 Key system components......61 Environment subsystems and subsystem DLLs......62 Other subsystems......68 Executive......72 Kernel......75 Hardware abstraction layer......79 Device drivers......82 System processes......88 Conclusion......99

Chapter 3 Processes and jobs......101 Creating a process......101 CreateProcess* functions arguments......102 Creating Windows modern processes.......103 Creating other kinds of processes......104 Process internals......105 Protected processes......113 Protected Process Light (PPL)......115 Third-party PPL support......119 Minimal and Pico processes......120 Minimal processes......120 Pico processes......121 Trustlets (secure processes)......123 Trustlet structure......123

852     Contents of Windows Internals, Part 1, 7th Edition


---

Trustlet policy metadata......124 Trustlet attributes......125 System built-in Trustlets......125 Trustlet identity......126 Isolated user-mode services......127 Trustlet-accessible system calls......128 Flow of CreateProcess......129 Stage 1: Converting and validating parameters and flags......131 Stage 2: Opening the image to be executed......135 Stage 3: Creating the Windows executive process object......138 Stage 4: Creating the initial thread and its stack and context......144 Stage 5: Performing Windows subsystem-specific initialization......146 Stage 6: Starting execution of the initial thread......148 Stage 7: Performing process initialization in the context of the new process......148 Terminating a process......154 Image loader......155 Early process initialization......157 DLL name resolution and redirection......160 Loaded module database......164 Import parsing......168 Post-import process initialization......170 SwitchBack......171 API Sets......173 Jobs......176 Job limits......177 Working with a job......178 Nested jobs......179 Windows containers (server silos)......183 Conclusion......191

Chapter 4 Threads......193 Creating threads......193 Thread internals......194

Contents of Windows Internals, Part 1, 7th Edition     853


---

Data structures......194 Birth of a thread......206 Examining thread activity......207 Limitations on protected process threads......212 Thread scheduling......214 Overview of Windows scheduling......214 Priority levels......215 Thread states......223 Dispatcher database......228 Quantum......231 Priority boosts......238 Context switching......255 Scheduling scenarios......256 Idle threads......260 Thread suspension......264 (Deep) freeze......264 Thread selection......266 Multiprocessor systems......268 Thread selection on multiprocessor systems......283 Processor selection......284 Heterogeneous scheduling (big LITTLE)......286 Group-based scheduling......287 Dynamic fair share scheduling......289 CPU rate limits......292 Dynamic processor addition and replacement......295 Worker factories (thread pools)......297 Worker factory creation......298 Conclusion......300

Chapter 5 Memory management......301 Introduction to the memory manager......301 Memory manager components......302 Large and small pages......303 Examining memory usage......305

854      Contents of Windows Internals, Part 1, 7th Edition


---

Internal synchronization......308 Services provided by the memory manager......309 Page states and memory allocations......310 Commit charge and commit limit......313 Locking memory......314 Allocation granularity......314 Shared memory and mapped files......315 Protecting memory......317 Data Execution Prevention......319 Copy-on-write......321 Address Windowing Extensions......323 Kernel-mode heaps (system memory pools)......324 Pool sizes......325 Monitoring pool usage......327 Look-aside lists......331 Heap manager......332 Process heaps......333 Heap types......334 The NT heap......334 Heap synchronization......334 The low-fragmentation heap......335 The segment heap......336 Heap security features......341 Heap debugging features......342 Pageheap......343 Fault-tolerant heap......347 Virtual address space layouts......348 x86 address space layouts......349 x86 system address space layout......352 x86 session space......353 System page table entries......355 ARM address space layout......356 64-bit address space layout......357 x64 virtual addressing limitations......359 Dynamic system virtual address space management......359

Contents of Windows Internals, Part 1, 7th Edition     855


---

System virtual address space quotas......364 User address space layout......365 Address translation......371 x86 virtual address translation......371 Translation look-aside buffer......377 x64 virtual address translation......380 ARM virtual address translation......381 Page fault handling......383 Invalid PTEs......384 Prototype PTEs......385 In-paging I/O......386 Collided page faults......387 Clustered page faults......387 Page files......389 Commit charge and the system commit limit......394 Commit charge and page file size......397 Stacks......398 User stacks......399 Kernel stacks......400 DPC stack......401 Virtual address descriptors......401 Process VADs......402 Rotate VADs......403 NUMA......404 Section objects......405 Working sets......412 Demand paging......413 Logical prefetcher and ReadyBoot......413 Placement policy......416 Working set management......417 Balance set manager and swapper......421 System working sets......422 Memory notification events......423

856     Contents of Windows Internals, Part 1, 7th Edition


---

Page frame number database......425 Page list dynamics......428 Page priority......436 Modified page writer and mapped page writer......438 PFN data structures......440 Page file reservation......443 Physical memory limits......446 Windows client memory limits......447 Memory compression......449 Compression illustration......450 Compression architecture......453 Memory partitions......456 Memory combining......459 The search phase......460 The classification phase......461 The page combining phase......462 From private to shared PTE......462 Combined pages release......464 Memory enclaves......467 Programmatic interface......468 Memory enclave initializations......469 Enclave construction......469 Loading data into an enclave......471 Initializing an enclave......472 Proactive memory management (SuperFetch)......472 Components......473 Tracing and logging......474 Scenarios......475 Page priority and rebalancing......476 Robust performance......478 ReadyBoost......479 ReadyDrive......480 Process reflection......480 Conclusion......482

Contents of Windows Internals, Part 1, 7th Edition     857


---

Chapter 6   I/O system      483

I/O system components......483 The I/O manager......485 Typical I/O processing......486 Interrupt Request Levels and Deferred Procedure Calls......488 Interrupt Request Levels......488 Deferred Procedure Calls......490 Device drivers......492 Types of device drivers......492 Structure of a driver......498 Driver objects and device objects......500 Opening devices......507 I/O processing......510 Types of I/O......511 I/O request packets......513 I/O request to a single-layered hardware-based driver......525 I/O requests to layered drivers......533 Thread-agnostic I/O......536 I/O cancellation......537 I/O completion ports......541 I/O prioritization......546 Container notifications......552 Driver Verifier......552 I/O-related verification options......554 Memory-related verification options......555 The Plug and Play manager......559 Level of Plug and Play support......560 Device enumeration......561 Device stacks......563 Driver support for Plug and Play......569 Plug-and-play driver installation......571 General driver loading and installation......575 Driver loading......575 Driver installation......577

858      Contents of Windows Internals, Part 1, 7th Edition


---

The Windows Driver Foundation ......578 Kernel-Mode Driver Framework ......579 User-Mode Driver Framework......587 The power manager......590 Connected Standby and Modern Standby......594 Power manager operation......595 Driver power operation......596 Driver and application control of device power......599 Power management framework......600 Power availability requests......602 Conclusion......603

Chapter 7 Security 605 Security ratings......605 Trusted Computer System Evaluation Criteria......605 The Common Criteria......607 Security system components......608 Virtualization-based security......611 Credential Guard......612 Device Guard......617 Protecting objects......619 Access checks......621 Security identifiers......625 Virtual service accounts......646 Security descriptors and access control......650 Dynamic Access Control......666 The AuthZ API......666 Conditional ACEs......667 Account rights and privileges......668 Account rights......669 Privileges......670 Super privileges......675 Access tokens of processes and threads......677

Contents of Windows Internals, Part 1, 7th Edition     859


---

Security auditing......677 Object access auditing......679 Global audit policy......682 Advanced Audit Policy settings......683 AppContainers......684 Overview of UWP apps......685 The AppContainer......687 Logon......710 Winlogon initialization......711 User logon steps......713 Assured authentication......718 Windows Biometric Framework......719 Windows Hello......721 User Account Control and virtualization......722 File system and registry virtualization......722 Elevation......729 Exploit mitigations......735 Process-mitigation policies......735 Control Flow Integrity......740 Security assertions......752 Application Identification......756 AppLocker......757 Software Restriction Policies......762 Kernel Patch Protection......764 PatchGuard......765 HyperGuard......768 Conclusion......770

Index......771

---

## Index

### SYMBOLS

\ (root directory), 692

### NUMBERS

32-bit handle table entry, 147 64-bit DiT view, 34-35

### A

AAM (Application Activation Manager), 244 ACL (access control list), displaying, 153–154 ACM (authenticated code module), 805–806 Iacpirqarb command, 49 ActivationObject object, 129 ActivityReference object, 129 address-based pushlocks, 201 address-based waits, 202–203 ADK (Windows Assessment and Deployment Kit), 421 administrative command prompt, opening, 253, 261 AeDebug and AeDebugProtected root keys, WER (Windows Error Reporting), 540 AES (Advanced Encryption Standard), 711 allocators, ReFS (Resilient File System), 743–745 ALPC (Advanced Local Procedure Call), 209 lapc command, 224 ALPC message types, 211 ALPC ports, 129, 212–214 ALPC worker thread, 118 APC level, 40, 43, 62, 63, 65 Iacpirqarb command, 48


1

APCs (asynchronous procedure calls), 61-66 APIC, and PIC (Programmable Interrupt Controller), 37-38 APIC (Advanced Programmable Interrupt Controller), 35-36 !apc command, 37 APIC Timer, 67 APIs, 690 \AppContainer NamedObjects directory, 160 AppContainers, 243-244 AppExecution aliases, 263-264 apps, activating through command line, 261-262. See also packaged applications APT (Advanced Persistent Threats), 781 !arbiter command, 48 architectural system service dispatching, 92-95 \ArcName directory, 160 ARM32 simulation on ARM 64 platforms, 115 assembly code, 2 associative cache, 13 atomic execution, 207 attributes, resident and nonresident, 667-670 auto-expand pushlocks, 201 Autorun tool, 837 autosart services startup, 451-457 AWE (Address Windowing Extension), 201

### B

B+ Tree physical layout, RefS (Resilient File System), 742-743 background tasks and Broker Infrastructure, 256-258

---

Background Broker Infrastructure

Background Broker Infrastructure, 244, 256–258 backing up encrypted files, 716–717 bad-cluster recovery, NTFS recovery support, 703–706. See also clusters bad-cluster remapping, NTFS, 633 base named objects, looking at, 163–164. See also objects BaseNamedObjects directory, 160 BCD (Boot Configuration Database), 392, 398–399 BCD library for boot operations, 790–792 BCD options Windows hypervisor loader (Hvloader), 796–797 Windows OS Loader, 792–796 bcdedit command, 398–399 BI (Background Broker Infrastructure), 244, 256–258 BI (Broker Infrastructure), 238 BindFlt (Windows Bind minifilter driver), 248 BitLocker encryption offload, 717–718 recovery procedure, 801 turning on, 804 block volumes, DAX (Direct Access Disks), 728–730 BNO (Base Named Object) Isolation, 167 BOOLEAN status, 208 boot application, launching, 800–801 Boot Manager BCD objects, 798 overview, 785–799 and trusted execution, 805 boot menu, 799–800 boot process. See also Modern boot menu BIOS, 781 driver loading in safe mode, 848–849 hibernation and Fast Startup, 840–844 hypervisor loader, 811–813 images start automatically, 837 kernel and executive subsystems, 818–824

kernel initialization phase 1, 824-829 Measured Boot, 801-805 ReadyBoot, 835-836 safe mode, 847-850 Secure Boot, 781-784 Secure Launch, 816-818 shutdown, 837-840 Smss, Crss, Wininit, 830-835 trusted execution, 805-807 UEFI, 777-781 VSM (Virtual Secure Mode) startup policy, 813-816 Windows OS Loader, 808-810 WinRE (Windows Recovery Environment), 845 boot status file, 850 Bootim.exe command, 832 booting from iSCSI, 811 B PB (boot parameter block), 657 BTB (Branch Target Buffer), 11 bugcheck, 40

## C

C-states and timers, 76 cache copying to and from, 584 forcing to write through to disk, 595 cache coherency, 568–569 cache data structures, 576–582 cache manager in action, 591–594 centralized system cache, 567 disk I/O accounting, 600–601 features, 566–567 lazy writer, 622 mapping views of files, 573 memory manager, 567 memory partitions support, 571–572 NTFS MFT working set enhancements read-ahead thread, 622–623 recoverable file system support, 570

862     Index

---

commands

stream-based caching, 569 virtual block caching, 569 write-back cache with lazy write, 589 cache size, 574-576 cache virtual memory management, 572-573 cache-aware pushblocks, 200-201 caches and storage memory, 10 caching with DMA (direct memory access) interfaces, 584-585 with mapping and pinning interfaces, 584 caching and file systems disks, 565 partitions, 565 sectors, 565 volumes, 565-566 \Callback directory, 160 cd command, 144, 832 CDFS legacy format, 602 CEA (Common Event Aggregator), 238 Centennial applications, 246-249, 261 CFG (Control Flow Integrity), 343 Chain of Trust, 783-784 change journal file, NTFS on-disk structure, 675-679 change logging, NTFS, 637-638 check-disk and fast repair, NTFS recovery support, 707-710 checkpoint records, NTFS recovery support, 698 lchksvctbl command, 103 CHPE (Compile Hybrid Executable) bitmap, 115-118 CIM (Common Information Model), WMI (Windows Management Instrumentation), 488-495 CLFS (common logging file system), 403-404 Clipboard User Service, 472 clock time, 57 cloning ReFS files, 755 Close method, 141 clusters. See also bad-cluster recovery

defined, 566

NTFS on-disk structure, 655–656

cmd command, 253, 261, 275, 289, 312, 526, 832

COM-hosted task, 479, 484–486

command line, activating apps through, 261–262

Command Prompt, 833, 845

commands

!acpiirqarb, 49

!apc, 224

!acpiirqarb, 48

!apic, 37

!arbiter, 48

bcdedit, 398–399

Bootim.exe, 832

cd, 144, 832

!chksvctbl, 103

cmd, 253, 261, 275, 289, 312, 526, 832

db, 102

defrag.exe, 646

!devhandles, 151

!devnode, 49

!devobj, 48

dg, 7–8

dps, 102–103

dt, 7–8

dtrace, 527

.dumpdebug, 547

dx, 7, 35, 46, 137, 150, 190

enimtag, 547

eventvmr, 288, 449

!lexqueue, 83

fsutil resource, 693

futil storagereserve findById, 687

g, 124, 241

Get-FileStorageTier, 649

Get-VMPnemController, 737

!handle, 149

!idt, 34, 38, 46

!ioapic, 38

!irql, 41

Index 863


---

commands

commands (continued) k, 485 link.exe/dump/loadconfig, 379 !locks, 198 msinfo32, 312, 344 notepad.exe, 405 !object, 137-138, 151, 223 perfmon, 505, 519 !pic, 37 !process, 190 !qlocks, 176 !reg openkeys, 417 regedit.exe, 468, 484, 542 Runas, 397 Set-PhysicalDisk, 774 taskschd.msc, 479, 484 !thread, 75, 190 tss, 8 Wberntest, 491 wnfdump, 237 committing a transaction, 697 Composition object, 129 compressing nonsparse data, 673-674 sparse data, 671-672 compression and ghosting, RefS (Resilient File System), 769-770 compression and sparse files, NTFS, 637 condition variables, 205-206 connection ports, dumping, 223-224 container compaction, RefS (Resilient File System), 766-769 container isolation, support for, 626 contiguous file, 643 copying to and from cache, 584 encrypted files, 717 CoreMessaging object, 130 corruption record, NTFS recovery support, 708 CoverageSampler object, 129

CPL (Code Privilege Level), 6 CPU branch predictor, 11–12 CPU cache(s), 9–10, 12–13 crash dump files, WER (Windows Error Reporting), 543–548 crash dump generation, WER (Windows Error Reporting), 548–551 crash report generation, WER (Windows Error Reporting), 538–542 crashes, consequences of, 421 critical sections, 203–204 CS (Code Segment), 31 CSSrs, 830–835, 838–840

## D

data compression and sparse files, NTFS, 670-671 data redundancy and fault tolerance, 629-630 data streams, NTFS, 631-632 data structures, 184-189 DAX (Direct Access Disks). See also disks block volumes, 728-730 cached and noncached I/O in volume, 723-724 driver model, 721-722 file system filter driver, 730-731 large and huge pages support, 732-735 mapping executable images, 724-728 overview, 720-721 virtual PMs and storage spaces support, 736-739 volumes, 722-724 DAX file alignment, 733-735 DAX mode I/Os, flushing, 731 db command, 102 /debug switch, FsTool, 734 debugger breakpoints, 87-88 objects, 241-242 !pte extension, 735 !trueuf command, 148

---

enclave configuration, dumping

debugging. See also user-mode debugging object handles, 158 trustlets, 374–375 WoW64 in ARM64 environments, 122–124 decryption process, 715–716 defrag.exe command, 646 defragmentation, NTFS, 643–645 Delete method, 141 Dependency Mini Repository, 255 Desktop object, 129 Idevhandlevars command, 151 \Device directory, 161 device shims, 564 Idevnode command, 49 Idevobj command, 48 dg command, 4, 7–8 Directory object, 129 disk I/Os, counting, 601 disks, defined, 565. See also DAX (Direct Access Disks) dispatcher routine, 121 DLLs Hvloader.dll, 811 IUM (Isolated User Mode), 371–372 Ntevt.dll, 497 for Wow64, 104–105 DMA (Direct Memory Access), 50, 584–585 DMTF, WMI (Windows Management Instrumentation), 486, 489 DPC (dispatch or deferred procedure call) interrupts, 54–61, 71. See also software interrupts DPC Watchdog, 59 dps (dump pointer symbol) command, 102–103 drive-letter name resolution, 620 \Driver directory, 161 driver loading in safe mode, 848–849 driver objects, 451 driver shims, 560–563 \DriverStore(s) directory, 161 dt command, 7, 47

DTrace (dynamic tracing) ETW provider, 533–534 FBT (Function Boundary Tracing) provider, 531–533 initialization, 529–530 internal architecture, 528–534 overview, 525–527 PID (Process) provider, 531–533 symbol server, 535 syscall provider, 530 type library, 534–535 dtrace command, 527 .dump command, LiveKd, 545 dump files, 546–548 Dump method, 141 .dumpdebug command, 547 Duplicate object service, 136 DVRT (Dynamic Value Relocation Table), 23–24, 26 dx command, 7, 35, 46, 137, 150, 190 Dxgk* objects, 129 dynamic memory, tracing, 532–533 dynamic partitioning, NTFS, 646–647

## E

EFI (Extensible Firmware Interface), 777 EFS (Encrypting File System) architecture, 712 BitLocker encryption offload, 717–718 decryption process, 715–716 described, 640 first-time usage, 713–715 information and key entries, 713 online support, 719–720 overview, 710–712 recovery agents, 714 EFS information, viewing, 716 EIP program counter, 8 envelope configuration, dumping, 379–381

Index 865


---

encrypted files

encrypted files backing up, 716-717 copying, 717 encrypting file data, 714-715 encryption NTFS, 640 encryption support, online, 719-720 EnergyTracker object, 130 enhanced timers, 78-81. See also timers /enum command-line parameter, 786 .enuntag command, 547 Error Reporting. See WER (Windows Error Reporting) ETL file, decoding, 514-515 ETW (Event Tracing for Windows). See also tracing dynamic memory architecture, 500 consuming events, 512-515 events decoding, 513-515 Global logger and autologgers, 521 and high-frequency timers, 68-70 initialization, 501-502 listing processes activity, 510 logger thread, 511-512 overview, 499-500 providers, 506-509 providing events, 509-510 security, 522-525 security registry key, 503 sessions, 502-506 system loggers, 516-521 ETW provider, DTrace (dynamic tracing), 533-534 ETW providers, enumerating, 508 ETW sessions default security descriptor, 523-524 enumerating, 504-506 ETW_GUID_ENTRY data structure, 507 ETW_REG_ENTRY, 507 EtwConsumer object, 129 EtwRegistration object, 129 Event Log provider DLL, 497

Event object, 128

Event Viewer tool, 288

eventvwr command, 288, 449

ExAllocatePool function, 26

exception dispatching, 85–91

executive mutexes, 196–197

executive objects, 126–130

executive resources, 197–199

exFAT, 606

explicit file I/O, 619–622

export thunk, 117

lequeuxe command, 83

## F

F5 key, 124, 397 fast I/O, 585–586. See also I/O system fast mutexes, 196–197 fast repair and check-disk, NTFS recovery support, 707–710 Fast Startup and hibernation, 840–844 FAT12, FAT16, FAT32, 603–606 FAT64, 606 Fault Reporting process, WER (Windows Error Reporting), 540 fault tolerance and data redundancy, NTFS, 629–630 FCB (File Control Block), 571 FCB Headers, 201 feature settings and values, 22–23 FEK (File Encryption Key), 711 file data, encrypting, 714–715 file names, NTFS on-disk structure, 664–666 file namespaces, 664 File object, 128 file record numbers, NTFS on-disk structure, 660 file records, NTFS on-disk structure, 661–663 file system drivers, 583 file system formats, 566 file system interfaces, 582–585 File System Virtualization, 248

---

HKEY_PERFORMANCE_TEXT

file systems CDFS, 602 data-scan sections, 624–625 drivers architecture, 608 exFAT, 606 explicit file I/O, 619–622 FAT12, FAT16, FAT32, 603–606 filter drivers, 626 filter drivers and minifilters, 623–626 filtering named pipes and mailslots, 625 FSDs (file system drivers), 608–617 mapped page writers, 622 memory manager, 622 NTFS file system, 606–607 operations, 618 Process Monitor, 627–628 ReFS (Resilient File System), 608 remote FSDs, 610–617 reparse point behavior, 626 UDF (Universal Disk Format), 603 \FileSystem directory, 161 fill buffers, 17 Filter Manager, 626 FilterCommunicationPort object, 130 FilterConnectionPort object, 130 Flags, 132 flushing mapped files, 595–596 Foreshadow (LITF) attack, 16 fragmented file, 643 FSCTL (file system control) interface, 688 FSDs (file system drivers), 608–617 FsTool, /debug switch, 734 fsutil resource command, 693 fsutil storagereserve findById command, 687

## G

g command, 124, 241 gadgets, 15 GDI/User objects, 126-127. See also user-mode debugging

GDT (Global Descriptor Table), 2–5 Get-FileStorageT er command, 649 Get-VMPmemController command, 737 Gffx.exe, 554–557 GIT (Generic Interrupt Timer), 67 $\GLOBAL?? directory, 161 global flags, 554–557 global namespace, 167 GPA (guest physical address), 17 GPIO (General Purpose Input Output), 51 GSIV (global system interrupt vector), 32, 51 guarded mutexes, 196–197 GUI thread, 96

## H

HAM (Host Activity Manager), 244, 249-251 handle command, 149 Handle count, 132 handle lists, single instancing, 165 handle tables, 146, 149-150 handles creating maximum number of, 147 viewing, 144-145 hard links, NTFS, 634 hardware indirect branch controls, 21-23 hardware interrupt processing, 32-35 hardware side-channel vulnerabilities, 9-17 hibernation and Fast Startup, 840-844 high-IRQL synchronization, 172-177 hive handles, 410 hives. See also registry loading, 421 loading and unloading, 408 reorganization, 414-415 HKEY_CLASSES_ROOT, 397-398 HKEY_CURRENT_CONFIG, 400 HKEY_CURRENT_USER subkeys, 395 HKEY_LOCAL_MACHINE, 398-400 HKEY_PERFORMANCE_DATA, 401 HKEY_PERFORMANCE_TEXT, 401

In

From the LI

---

HKEY_USERS

HKEY_USERS, 396

HKLMSYSTEM\CurrentControlSet\Control\ SafeBoot registry key, 848

HPET (High Performance Event Timer), 67

hung program screen, 838

HungAppTimeout, 839

HVCI (Hypervisor Enforced Code Integrity), 358

hybrid code address range table, dumping,

117–118

hybrid shutdown, 843–844

hypercalls and hypervisor TLFS (Top Level

Functional Specification), 299–300

Hyper-V schedulers. See also Windows

hypervisor

classic, 289–290

core, 291–294

overview, 287–289

root scheduler, 294–298

SMT system, 292

hypervisor debugger, connecting, 275–277

hypervisor loader boot module, 811–813

## |

IBPS (Indirect Branch Predictor Barrier), 22, 25 IBRS (Indirect Branch Restricted Speculation), 21–22, 25 IDT (interrupt dispatch table), 32–35 lidt command, 34, 38, 46 images starting automatically, 837 Import Optimization and Retpoline, 23–26 indexing facility, NTFS, 633, 679–680 Info mask, 132 Inheritance object service, 136 integrated scheduler, 294 interlocked operations, 172 interrupt control flow, 45 interrupt dispatching hardware interrupt processing, 32–35 overview, 32 programmable interrupt controller architecture, 35–38

software IRQLs (interrupt request levels), 38–50 interrupt gate, 32 interrupt internals, examining, 46–50 interrupt objects, 43–50 interrupt steering, 52 interrupt vectors, 42 interrupts affinity and priority, 52–53 latency, 50 masking, 39 I/O system, components of, 652. See also Fast I/O IOAPIC (I/O Advanced Programmable Interrupt Controller), 32, 36 Iioapic command, 38 IoCompletion object, 128 IoCompletionReserve object, 128 Ionescu, Alex, 28 IRPs (I/O request packets), 567, 583, 585, 619, 621–624, 627, 718 IRQ affinity policies, 53 IRQ priorities, 53 IRQL (interrupt request levels), 347–348. See also software IRQLs (interrupt request levels) lirq command, 41 IRTimer object, 128 iSCSI, booting from, 811 isolation, NTFS on-disk structure, 689–690 ISR (interrupt service routine), 31 IST (Interrupt Stack Table), 7–9 IUM (Isolated User Mode) overview, 371–372 SDF (Secure Driver Framework), 376 secure companions, 376 secure devices, 376–378 SGRA (System Guard Runtime attestation), 386–390 trustlets creation, 372–375 VBS-based enclaves, 378–386

---

local procedure call

## J

jitted blocks, 115, 117 jitting and execution, 121–122 Job object, 128

## K

k command, 485 Kali Linus, 247 KeBugCheckEx system function, 32 KEK (Key Exchange Key), 783 kernel. See also Secure Kernel

dispatcher objects, 179-181 objects, 126 spinlocks, 174 synchronization mechanisms, 179 kernel addresses, mapping, 20 kernel debugger

!handle extension, 125 !locks command, 198 searching for open files with, 151-152 viewing handle table with, 149-150 kernel logger, tracing TCP/IP activity with, 519-520 Kernel Patch Protection, 24 kernel reports, WER (Windows Error Reporting), 551 kernel shims

database, 559-560 device shims, 564 driver shims, 560-563 engine initialization, 557-559 shim database, 559-560 witnessing, 561-563 kernel-based system call dispatching, 97 kernel-mode debugging events, 240 \KernelObjects directory, 161 Key object, 129 keyed events, 194-196 KeyedEvent object, 128 KilsrThunk, 33


1

KINTERPUIT object, 44, 46 \KnownDlls directory, 161 \KnownDlls32 directory, 161 KPCR (Kernel Processor Control Region), 4 KPCRB fields, timer processing, 72 KPTI (Kernel Page Table Isolation), 18 KTM (Kernel Transaction Manager), 157, 688 KVA Shadow, 18–21

## L

LTF (Foreshadow) attack, 16 LAPIC (Local Advanced Programmable Interrupt Controllers), 32 lazy jitter, 119 lazy segment loading, 6 lazy writing disabling, 595 and write-back caching, 589–595 LBA (logical block address), 589 LCNs (logical cluster numbers), 656–658 leak detections, RefS (Resilient File System), 761–762 leases, 614–615, 617 LFENCE, 23 LFS (log file service), 652, 695–697 line-based versus message signaled-based interrupts, 50–66 link tracking, NTFS, 639 link.exe tool, 117, 379 link.exe/dump/loadconfig command, 379 LiveKd., dump command, 545 load ports, 17 loader issues, troubleshooting, 556–557 Loader Parameter block, 819–821 local namespace, 167 local procedure call ALPC direct event attribute, 222 ALPC port ownership, 220 asynchronous operation, 214–215 attributes, 216–217 blobs, handles, and resources, 217–218

In

From the LI

---

local procedure call

local procedure call (continued) connection model, 210–212 debugging and tracing, 222–224 handle passing, 218–219 message model, 212–214 overview, 209–210 performance, 220–221 power management, 221 security, 219–220 views, regions, and sections, 215–216 Lock, 132 !locks command, kernel debugger, 198 log record types, NTFS recovery support, 697–699 $LOGGED_UTILITY_STREAM attribute, 663 logging implementation, NTFS on-disk structure, 693 Low-IRQL synchronization. See also synchronization address-based waits, 202–203 condition variables, 205–206 critical sections, 203–204 data structures, 184–194 executive resources, 197–202 kernel dispatcher objects, 179–181 keyed events, 194–196 mutexes, 196–197 object-less waiting (thread alerts), 183–184 overview, 177–179 run once initialization, 207–208 signalling objects, 181–183 (SRW) Slim Reader/Writer locks, 206–207 user-mode resources, 205 LRC parity and RAID 6, 773 LSASS (Local Security Authority Subsystem Service) process, 453, 465 LSN (logical sequence number), 570

## M

mailslots and named pipes, filtering, 625 Make permanent/temporary object service, 136

mapped files, flushing, 595–596 mapping and pinning interfaces, caching with, 584 masking interrupts, 39 MBEC (Mode Base Execution Controls), 93 MDL (Memory Descriptor List), 220 MDS (Microarchitectural Data Sampling), 17 Measured Boot, 801–805 media mixer, creating, 165 Meltdown attack, 14, 18 memory, sharing, 171 memory hierarchy, 10 memory manager modified and mapped page writer, 622 overview, 567 page fault handler, 622–623 memory partitions support, 571–572 metadata defined, 566, 570 metadata logging, NTFS recovery support, 695 MFT (Master File Table) NTFS metadata files in, 657 NTFS on-disk structure, 656–660 record for small file, 661 MFT file records, 668–669 MFT records, compressed file, 674 Microsoft Incremental linker (llink.exe)), 117 minifilter driver, Process Monitor, 627–628 Minstore architecture, RefS (Resilient File System), 740–742 Minstore I/O, RefS (Resilient File System), 746–748 Minstore write-ahead logging, 758 Modern Application Model, 249, 251, 262 modern boot menu, 832–833. See also boot process MOF (Managed Object Format), WMI (Windows Management Instrumentation), 488–495 MPS (Multiprocessor Specification), 35 Msconfig utility, 837

870      Index

---

NTFS recovery support

MSI (message signaled interrupts), 50-66 msinfo32 command, 312, 344 MSRs (model specific registers), 92 Mutex object, 128 mutexes, fast and guarded, 196-197 mutual exclusion, 170

## N

named pipes and mailslots, filtering, 625 namespace instancing, viewing, 169 \NLS directory, 161 nonarchitectural system service dispatching, 96-97 nonsparse data, compressing, 673-674 notepad.exe command, 405 notifications. See WNF (Windows Notification Facility) NT kernel, 18-19, 22 Ntldr version list, 106 Ntevt.dll, 497 NTFS bad-cluster recovery, 703-706 NTFS file system advanced features, 630 change logging, 637-638 compression and sparse files, 637 data redundancy, 629-630 data streams, 631-632 data structures, 654 defragmentation, 643-646 driver, 652-654 dynamic bad-cluster remapping, 633 dynamic partitioning, 646-647 encryption, 640 fault tolerance, 629-630 hard links, 634 high-end requirements, 628 indexing facility, 633 link tracking, 639 metadata files in MFT, 657 overview, 606-607 per-user volume quotas, 638-639

POSIX deletion, 641–643 recoverability, 629 recoverable file system support, 570 and related components, 653 security, 629 support for tiered volumes, 647–651 symbolic links and junctions, 634–636 Unicode-based names, 633 NTFS files, attributes for, 662–663 NTFS information, viewing, 660 NTFS MFT working set enhancements, 571 NTFS on-disk structure attributes, 667–670 change journal file, 675–679 clusters, 655–656 consolidated security, 682–683 data compression and sparse files, 670–674 on-disk implementation, 691–693 file names, 664–666 file record numbers, 660 file records, 661–663 indexing, 679–680 isolation, 689–690 logging implementation, 693 master file table, 656–660 object IDs, 681 overview, 654 quota tracking, 681–682 reparse points, 684–685 sparse files, 675 Storage Reserves and reservations, 685–688 transaction support, 688–689 transactional APIs, 690 tunneling, 666–667 volumes, 655 NTFS recovery support analysis pass, 700 bad clusters, 703–706 check-disk and fast repair, 707–710 design, 694–695 LFS (log file service), 695–697

Index 871


---

NTFS recovery support

NTFS recovery support (continued) log record types, 697-699 metadata logging, 695 recovery, 699-700 redo pass, 701 self-healing, 706-707 undo pass, 701-703 NTFS reservations and Storage Reserves, 685-688 Ntoskrnl and Winload, 818 NVMe (Non-volatile Memory disk), 565

## O

Iobject command, 137-138, 151, 223 Object Create Info, 132 object handles, 146, 158 object IDs, NTFS on-disk structure, 681 Object Manager executive objects, 127-130 overview, 125-127 resource accounting, 159 symbolic links, 166-170 Object type index, 132 object-less waiting (thread alerts), 183-184 objects. See also base named objects; private objects; reserve objects directories, 160-165 filtering, 170 flags, 134-135 handles and process handle table, 143-152 headers and bodies, 131-136 methods, 140-143 names, 159-160 reserves, 152-153 retention, 155-158 security, 153-155 services, 136 signalling, 181-183 structure, 131 temporary and permanent, 155 types, 126, 136-140

Index

ObjectTypes directory, 161 ODBC (Open Database Connectivity), WMI (Windows Management Instrumentation), 488 Okay to close method, 141 on-disk implementation, NTFS on-disk structure, 691-693 open files, searching for, 151-152 open handles, viewing, 144-145 Open method, 141 Openfiles/query command, 126 oplocks and FSDs, 611-612, 616 Optimize Drives tool, 644-645 OS/2 operating system, 130 out-of-order execution, 10-11

## P

packaged applications. See also apps activation, 259-264 BI (Background Broker Infrastructure), 256-258 bundles, 265 Centennial, 246-249 Dependency Mini Repository, 255 Host Activity Manager, 249-251 overview, 243-245 registration, 265-266 scheme of lifecycle, 250 setup and startup, 258 State Repository, 251-254 UWP, 245-246 page table, ReFS (Resilient File System), 745-746 PAN (Privileged Access Neven), 57 Parse method, 141 Partition object, 130 partitions caching and file systems, 565 defined, 565 Pc Reset, 845 PCIDs (Process-Context Identifiers), 20 

---

ReFS (Resilient File System)

PEB (process environment block), 104 per-file cache data structures, 579–582 perfmon command, 505, 519 per-user volume quotas, NTFS, 638–639 PFN database, physical memory removed from, 286 PIC (Programmable Interrupt Controller), 35–38 lpc command, 37 pinning and mapping interfaces, caching with, 584 pinning the bucket, RefS (Resilient File System), 743 PIT (Programmable Interrupt Timer), 66–67 PM (persistent memory), 736 Pointer count field, 132 pop thunk, 117 POSIX deletion, NTFS, 641–643 PowerRequest object, 129 private objects, looking at, 163–164. See also objects Proactive Scan maintenance task, 708–709 lprocessing command, 190 Process Explorer, 58, 89–91, 144–145, 147, 153–154, 165 169 Process Monitor, 591–594, 627–628, 725–728 Process object, 128, 137 processor execution model, 2–9 processor selection, 73–75 processor traps, 33 Profile object, 130 PSM (Process State Manager), 244 lpte extension of debugger, 735 PTEs (Page table entries), 16, 20 push thunk, 117 pushlocks, 200–202

## Q

Iqlocks command, 176

Query name method, 141

Query object service, 136

Query security object service, 136

queued spinlocks, 175-176 quota tracking, NTFS on-disk structure, 681-682

## R

RAID 6 and LRC parity, 773 RAM (Random Access Memory), 9-11 RawInputManager object, 130 RDCL (Rogue Data Cache load), 14 Read (R) access, 615 read-ahead and write-behind cache manager disk I/O accounting, 600-601 disabling lazy writing, 595 dynamic memory, 599-600 enhancements, 588-589 flushing mapped files, 595-596 forcing cache to write through disk, 595 intelligent read-ahead, 587-588 low-priority lazy writes, 598-599 overview, 586-587 system threads, 597-598 write throttling, 596-597 write-back caching and lazy writing, 589-594 reader/writer spinlocks, 176-177 ReadyBoost driver service settings, 810 ReadyBoot, 835-836 Reconciler, 419-420 recoverability, NTFS, 629 recoverable file system support, 570 recovery, NTFS recovery support, 699-700. See also WinRE (Windows Recovery Environment) redo pass, NTFS recovery support, 701 ReFS (Resilient File System) allocators, 743-745 architecture's scheme, 749 B+ tree physical layout, 742-743 compression and ghosting, 769-770 container compaction, 766-769

---

ReFS (Resilient File System)

ReFS (Resilient File System) (continued) data integrity scanner, 760 on-disk structure, 751–752 file integrity streams, 760 files and directories, 750 file's block cloning and spare VDL, 754–757 leak detections, 761–762 Minstore architecture, 740–742 Minstore I/O, 746–748 object IDs, 752–753 overview, 608, 739–740, 748–751 page table, 745–746 pinning the bucket, 743 recovery support, 759–761 security and change journal, 753–754 SMR (shingled magnetic recording) volumes, 762–766 snapshot support through HyperV, 756–757 tiered volumes, 764–766 write-through, 757–758 zap and salvage operations, 760 ReFS files, cloning, 755 Ireg openkeys command, 417 regedit.exe command, 468, 484, 542 registered file systems, 613–614 registry. See also hives application hives, 402–403 cell data types, 411–412 cell maps, 413–414 CLFS (common logging file system), 403–404 data types, 393–394 differencing hives, 424–425 filtering, 422 hive structure, 411–413 hives, 406–408 HKEY_CLASSES_ROOT, 397–398 HKEY_CURRENT_CONFIG, 400 HKEY_CURRENT_USER subkeys, 395 HKEY_LOCAL_MACHINE, 398–400 HKEY_PERFORMANCE_DATA, 401 HKEY_PERFORMANCE_TEXT, 401

HKEY_USERS, 396

HKLM\SYSTEM\CurrentControlSet\Control\ SafeBoot key, 848

incremental logging, 419-421

key control blocks, 417-418

logical structure, 394-401

modifying, 392-393

monitoring activity, 404

namespace and operation, 415-418

namespace redirection, 423

optimizations, 425-426

Process Monitor, 405-406

profile loading and unloading, 397

Reconciler, 419-420

remote BCD editing, 398-399

reorganization, 414-415

root keys, 394-395

ServiceGroupOrder key, 452

stable storage, 418-421

startup and process, 408-414

symbolic links, 410

TxR (Transactional Registry), 403-404

usage, 392-393

User Profiles, 396

viewing and changing, 391-392

virtualization, 422-425

RegistryTransaction object, 129

reparse points, 626, 684-685

reserve objects, 152-153. See also objects

resident and nonresident attributes, 667-670

resource manager information, querying,

692-693

Resource Monitor, 145

Restricted User Mode, 93

Retpoline and Import optimization, 23-26

RH (Read-Handle) access, 615

RISC (Reduced Instruction Set Computing), 113

root directory (\), 692

\RPC Control directory, 161

RSA (Rivest-Shamir-Adleman) public key

algorithm, 711

874      Index

---

side-channel attacks

RTC (Real Time Clock), 66-67 run once initialization, 207-208 Runos command, 397 runtime drivers, 24 RW (Read-Write) access, 615 RWH (Read-Write-Handle) access, 615

## S

safe mode, 847-850 SCM (Service Control Manager) network drive letters, 450 overview, 446-449 and Windows services, 426-428 SCM Storage driver model, 722 SCP (service control program), 426-427 SDB (shim database), 559-560 SDF (Secure Driver Framework), 376 searching for open files, 151-152 SEB (System Events Broker), 226, 238 second-chance notification, 88 Section object, 128 sectors

caching and file systems, 565 and clusters on disk, 566 defined, 565 secure boot, 781-784 Secure Kernel. See also kernel

APs (application processors) startup, 362-363 control over hypercalls, 349 hot patching, 368-371 HVCI (Hypervisor Enforced Code Integrity), 358 memory allocation, 367-368 memory manager, 363-368 NAR data structure, 365 overview, 345 page identity/secure PFN database, 366-367 secure intercepts, 348-349 secure IRQLs, 347-348

secure threads and scheduling, 356-358 Syscall selector number, 354 trustlet for normal call, 354 UEFI runtime virtualization, 358-360 virtual interrupts, 345-348 VSM startup, 360-363 VSM system calls, 349-355 Secure Launch, 816-818 security consolidation, NTFS on-disk structure, 682-683 Security descriptor field, 132 \Security directory, 161 Security method, 141 security reference monitor, 153 segmentation, 2-6 self-healing, NTFS recovery support, 706-707 Semaphore object, 128 service control programs, 450-451 service database, organization of, 447 service descriptor tables, 100-104 ServiceGroupOrder registry key, 452 services logging, enabling, 448-449 session namespace, 167-169 Session object, 130 \Sessions directory, 161 Set security object service, 136 \setbootorder command-line parameter, 788 Set-PhysicalDisk command, 774 SGRA (System Guard Runtime attestation), 386-390 SGX, 16 shadow page tables, 18-20 shim database, 559-560 shutdown process, 837-840 SID (security identifier), 162 side-channel attacks LITF (Foreshadow), 16 MDS (Microarchitectural Data Sampling), 17 Meltdown, 14 Spectre, 14-16 SSB (speculative store bypass), 16

Index 875


---

Side-channel mitigations in Windows

Side-channel mitigations in Windows hardware indirect branch controls, 21–23 KVA Shadow, 18–21 Retpoline and import optimization, 23–26 STIPB pairing, 26–30 Signal an object and wait for another service, 136 Sihost process, 834 ISilo directory, 161 SKINIT and Secure Launch, 816, 818 SkTool, 28–29 SLAT (Second Level Address Translation) table, 17 SMAP (Supervisor Mode Access Protection), 57, 93 SMB protocol, 614–615 SMP (symmetric multiprocessing), 171 SMR (shingled magnetic recording) volumes, 762–763 SMR disks tiers, 765–766 Smss user-mode process, 830–835 SMT system, 292 software interrupts. See also DPC (dispatch or deferred procedure call) interrupts APCs (asynchronous procedure calls), 61–66 DPC (dispatch or deferred procedure call), 54–61 overview, 54 software IRQLs (interrupt request levels), 38– 50. See also IRQL (interrupt request levels) Spaces. See Storage Spaces sparse data, compressing, 671–672 sparse files and data compression, 670–671 NTFS on-disk structure, 675 Spectre attack, 14–16 SpecuCheck tool, 28–29 SpeculationControl PowerShell script, 28 spinlocks, 172–177 Spot Verifier service, NTFS recovery support, 708 spurious traps, 31 SQLite databases, 252 SRW (Slim Read Writer) Locks, 178, 195, 205–207

SSB (speculative store bypass), 16 SSBD (Speculative Store Bypass Disable), 22 SSD (solid-state disk), 565, 644–645 SSD volume, retrimming, 646 Startup Recovery tool, 846 Startup Repair, 845 State Repository, 251–252 state repository, witnessing, 253–254 STIBP (Single Thread Indirect Branch Predictors), 22, 25–30 Storage Reserves and NTFS reservations, 685–688 Storage Spaces internal architecture, 771–772 overview, 770–771 services, 772–775 store buffers, 17 stream-based caching, 569 structured exception handling, 85 Svchost service splitting, 467–468 symbolic links, 166 symbolic links and junctions, NTFS, 634–637 SymbolicLink object, 129 symmetric encryption, 711 synchronization. See also Low-IRQL synchronization High-IRQL, 172–177 keyed events, 194–196 overview, 170–171 syscall instruction, 92 system call numbers, mapping to functions and arguments, 102–103 system call security, 99–100 system call table compaction, 101–102 system calls and exception dispatching, 122 system crashes, consequences of, 421 System Image Recover, 845 SYSTEM process, 19–20 System Restore, 845 system service activity, viewing, 104 system service dispatch table, 96

876     Index


---

trap dispatching

system service dispatcher, locating, 94–95 system service dispatching, 98 system service handling architectural system service dispatching, 92–95 overview, 91 system side-channel mitigation status, querying, 28–30 system threads, 597–598 system times, listing, 74–75. See also times system worker threads, 81–85

T

take state segments, 6–9 Task Manager, starting, 832 Task Scheduler boot task master key, 487 COM interfaces, 486 initialize, 477–481 initialize, 476–481 task scheduling and UBP, 475–481 taskschd.msc command, 479, 484 TBOOT module, 806 TCP/IP activity, tracing with kernel logger, 519–520 Terminal object, 30 TerminalEventQueue object, 130 thread alerts (object-less waiting), 183–184 thread command, 75, 90 thread-local register effect, 4. See also Windows threads thunk kernel routines, 33 tethered volumes. See also volumes creating maximum order of, 774–775 support for, 647–651 Time Broker, 256

time coalescing, 76–77 timer expiration, 70–72 timer granularity, 67–70 timer lists, 71 Timer object, 128 timer processing, 66 timer queuing behaviors, 73 timer serialization, 73 timer initialization, 75–76 timer types and intervals, 66–67 and node collection indices, 79 times. See also enhanced timers, system times high frequency, 68–70 high resolution, 80 TLB flushing algorithm, 18, 20–21, 272 TmEn object, 129 TmRm object, 129 TmTm object, 129 TmTx object, 129 Token object, 128 TPM (Trusted Platform Module), 785, 800–801 TPM measurements, invalidating, 803–805 TpWorkerFactory object, 129 TR (Task Register), 6, 32 Trace Flags field, 132 tracing dynamic memory, 532–533. See also DTrace (dynamic tracing); ETW (Event Tracing for Windows) transaction support, NTFS on-disk structure, 688–689 transactional APIs, NTFS on-disk structure, 690 transactions committing, 697 undoing, 702 transition stack, 18 trap dispatching exception dispatching, 82–91 interrupt dispatching, 32–50 line-based interrupts, 50–56 message signaled-based interrupts, 50–66

Index 877


---

trap dispatching

trap dispatching (continued) overview, 30–32 system service handling, 91–104 system worker threads, 81–85 timer processing, 66–81 TRIM commands, 645 troubleshooting Windows loader issues, 556–557 ltrunef debugger command, 148 trusted execution, 805–807 trustlets creation, 372–375 debugging, 374–375 secure devices, 376–378 Secure Kernel and, 345 secure system calls, 354 VBS-based enclaves, 378 in VTL 1, 371 Windows hypervisor on ARM64, 314–315 TSS (Task State Segment), 6–9 .tss command, 8 tunneling, NTFS on-disk structure, 666–667 TxF APIs, 688–690 STXF_DATA attribute, 691–692 TXT (Trusted Execution Technology), 801, 805–807, 816 type initializer fields, 139–140 type objects, 131, 136–140

## U

UBPM (Unified Background Process Manager), 481-486 UDF (Universal Disk Format), 603 UEFI boot, 777-781 UEFI runtime virtualization, 358-363 UMDF (User-Mode Driver Framework), 209 \UMDFCommunicationPorts directory, 161 undo pass, NTFS recovery support, 701-703 unexpected traps, 31 Unicode-based names, NTFS, 633 user application crashes, 537-542

User page tables, 18 UserAppReserve object, 130 user-issued system call dispatching, 98 user-mode debugging. See also debugging; GDI/User objects kernel support, 239–240 native support, 240–242 Windows subsystem support, 242–243 user-mode resources, 205 UWP (Universal Windows Platform) and application hives, 402 application model, 244 bundles, 265 and SEB (System Event Broker), 238 services to apps, 243 UWP applications, 245–246, 259–260

## V

VACBs (virtual address control blocks), 572, 576–578, 581–582 VBO (virtual byte offset), 589 VBR (volume boot record), 657 VBS (virtualization-based security) detecting, 344 overview, 340 VSM (Virtual Secure Mode), 340–344 VTLs (virtual trust levels), 340–342 VCNs (virtual cluster numbers), 656–658, 669–672 VHPMEM image, creating and mounting, 737–739 virtual block caching, 569 virtual PMs architecture, 736 virtualization stack deferred commit, 339 EPF (enlightened page fault), 339 explained, 269 hardware support, 329–335 hardware-accelerated devices, 332–335 memory access hints, 338 memory-zeroing enlightments, 338

---

Windows hypervisor

overview, 315 paravirtualized devices, 331 nng buffer, 327-329 V.D. backed virtual machines, 336-340 VIDs (Virtual Infrastructure Driver), 317 virtual IDE controller, 330 VM (virtual machine), 318-322 VM manager service and worker process, 315-316 VM Worker process, 318-322, 330 VMBs, 323-329 VMME process, 339-340 VmNEM.exe (virtual machine manager service), 315-316 VM (View Manager), 244 VMENTER event, 268 VMEXIT event, 330-331 VMSharedMemory directory, 161 VMXROOT mode, 268 volumes. See also tiered volumes caching and file structure, 565-566 defined, 565-566 NTFS on-disk structure, 565 setting options, 566 VMX (Virtual Secure Mode) overview, 340-344 startup policy, 813-816 system calls, 349-355 VTLs (virtual trust levels), 340-342

W

wait block states, 186 wait data structures, 189 wait for a single object service, 136 wait for multiple objects service, 136 wait queues, 190-194 WaitCompletionPacket object, 130 wait time, 57 Wberetest command, 491

Wxfs (Windows Container Isolation minifier driver), 248 Wcnfs (Windows Container Name Virtualization minifier driver), 248 WDK (Windows Driver Kit), 392 WER (Windows Error Reporting) ALPC (advanced local procedure call), 299 AeDebug and AeDebugProtected root keys, 540 crash dump files, 543-548 crash dump generation, 548-551 crash report generation, 538-542 dialog box, 541 Fault Reporting process, 540 implementation, 536 kernel reports, 551 kernel-mode (system) crashes, 543-551 overview, 535-537 process hang detection, 551-553 registry settings, 539-540 snapshot creation, 538 user application crashes, 537-542 user interface, 542 Windows 10 Creators Update (RS2), 571 Windows API, executive objects, 128-130 Windows Bind minifier driver, (BindFit) 248 Windows Boot Manager, 785-799 BCD objects, 798 Windows directory, 161 Windows hypervisor. See also Hyper-V schedules

am (Address Manager), 275, 277 architectural stack, 268 on ARM64, 313-314 boot virtual processor, 277-279 child partitions, 269-270, 323 dynamic memory, 285-287 emulation of VT-x virtualization extensions, 309-310

enlightenment, 272

Index 879


---

Windows hypervisor

Windows hypervisor (continued) execution vulnerabilities, 282 Hyperclear mitigation, 283 intercepts, 300–301 memory manager, 279–287 nested address translation, 310–313 nested virtualization, 307–313 overview, 267–268 partitions, processes, threads, 269–273 partitions physical address space, 281–282 PFN database, 286 platform API and EXO partitions, 304–305 private address spaces/memory zones, 284 process data structure, 271 processes and threads, 271 root partition, 270, 277–279 SLAT table, 281–282 startup, 274–279 SynIC (synthetic interrupt controller), 301–304 thread data structure, 271 VAL (VMX virtualization abstraction layer), 274, 279 VID driver, 272 virtual processor, 278 VM (Virtualization Manager), 278 VM_VP data structure, 278 VTLs (virtual trust levels), 281 Windows hypervisor loader (Hvloader), BCD options, 796–797 Windows loader issues, troubleshooting, 556–557 Windows Memory Diagnostic Tool, 845 Windows OS Loader, 792–796, 808–810 Windows PowerShell, 774 Windows services accounts, 433–446 applications, 426–433 autostart startup, 451–457 boot and last known good, 460–462 characteristics, 429–433

Clipboard User Service, 472 control programs, 450–451 delayed autostart, 457–458 failures, 462–463 groupings, 466 interactive services/session 0 isolation, 444–446 local service account, 436 local system account, 434–435 network service account, 435 packaged services, 473 process, 428 protected services, 474–475 Recovery options, 463 running services, 436 running with least privilege, 437–439 SCM (Service Control Manager), 426, 446–450 SCP (service control program), 426 Service and Driver Registry parameters, 429–432 service isolation, 439–443 Service SIDs, 440–441 shared processes, 465–468 shutdown, 464–465 startup errors, 459–460 Svchost service splitting, 467–468 tags, 468–469 triggered-start, 457–459 user services, 469–473 virtual service account, 443–444 window stations, 445 Windows threads, viewing user start address for, 89–91. See also thread-local register effect WindowStation object, 129 Wininit, 831–835 Winload, 792–796, 808–810 Winlogan, 831–834, 838 WinObjEx64 tool, 125 WinRE (Windows Recovery Environment), 845–846. See also recovery

880     Index

---

XTA cache

WMI (Windows Management Instrumentation) architecture, 487–488 CIM (Common Information Model), 488–495 class association, 493–494 Control Properties, 498 DMTF, 486, 489 implementation, 496–497 Managed Object Format Language, 489–495 MOF (Managed Object Format), 488–495 namespace, 493 ODBC (Open Database Connectivity), 488 overview, 486–487 providers, 488–489, 497 scripts to manage systems, 495 security, 498 System Control commands, 497 WmiGuid object, 130 WmiPrvSE creation, viewing, 496 WNF (Windows Notification Facility) event aggregation, 237–238 features, 224–225 publishing and subscription model, 236–237 state names and storage, 233–237 users, 226–232 WNF state names, dumping, 237 wnfdump command, 237 WnfDump utility, 226, 237 WoW64 (Windows-on-Windows) ARM, 113–114 ARM32 simulation on ARM 64 platforms, 115

core, 106-109 debugging in ARM64, 122-124 exception dispatching, 113 file system redirection, 109-110 memory models, 114 overview, 104-106 registry redirection, 110-111 system calls, 112 user-mode core, 108-109 X86 simulation on AMD64 platforms, 759-751 X86 simulation on ARM64 platforms, 115-125 write throttling, 596-597 write-back caching and lazy writing, 589-595 write-behind and read-ahead. See read-ahead and write-behind WSL (Windows Subsystem for Linux), 64, 128

## X

x64 systems, 2–4 viewing GDT on, 4–5 viewing TSS and IST on, 8–9 x86 simulation in ARM64 platforms, 115–124 x86 systems, 3, 35, 94–95, 101–102 exceptions and interrupt numbers, 86 Retpoline code sequence, 23 viewing GDT on, 5 viewing TSSs on, 7–8 XML descriptor, Task Scheduler, 479–481 XPERF tool, 504 XTA cache, 118–120

Index 881


