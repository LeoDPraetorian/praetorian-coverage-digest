## Address translation

Now that you've seen how Windows structures the virtual address space, let's look at how it maps these address spaces to real physical pages. User applications and system code reference virtual addresses. This section starts with a detailed description of 32-bit x86 address translation in PAE mode (the only mode supported in recent versions of Windows) and continues with a description of the differences on the ARM and x64 platforms. The next section describes what happens when such a translation doesn't resolve to a physical memory address (page fault) and explains how Windows manages physical memory via working sets and the page frame database.

### x86 virtual address translation

The original x86 kernel supported no more than 4 GB of physical memory, based on the CPU hardware available at the time. The Intel x86 Pentium Pro processor introduced a memory-mapping mode called Physical Address Extension (PAE). With the proper chipset, the PAE mode allows 32-bit operating systems access to up to 64 GB of physical memory on current Intel x86 processors (up from 4 GB without PAE) and up to 1,024 GB of physical memory when running on x64 processors in legacy mode (although Windows currently limits this to 64 GB due to the size of the PPN database required to describe so much memory). Since then, Windows has maintained two separate x86 kernels—one that did not support PAE and one that did. Starting with Windows Vista, an x86 Windows installation always installs the PAE kernel even if the system's physical memory is not higher than 4 GB. This allows Microsoft to maintain a single x86 kernel, as the benefits of the non-PAE kernel in terms of performance and memory footprint became negligible (and is required for hardware no-execute support). Thus, we'll describe only x86 PAE address translation. Interested readers can read the relevant section in the sixth edition of this book for the non-PAE case.

CHAPTER 5     Memory management      371


---

Using data structures that the memory manager creates and maintains called page tables, the CPU translates virtual addresses into physical addresses. Each page of virtual address space is associated with a system-space structure called a page table entry (PTE), which contains the physical address to which the virtual one is mapped. For example, Figure 5-15 shows how three consecutive virtual pages might be mapped to three physically discontiguous pages on an x86 system. There may not even be any PTEs for regions that have been marked as reserved or committed but never accessed, because the page table itself might be allocated only when the first page fault occurs. (The dashed line connecting the virtual pages to the PTEs in Figure 5-15 represents the indirect relationship between virtual pages and physical memory.)

![Figure](figures/Winternals7thPt1_page_389_figure_001.png)

FIGURE 5-15 Mapping virtual addresses to physical memory (x86).

![Figure](figures/Winternals7thPt1_page_389_figure_003.png)

Note Even kernel-mode code (such as device drivers) cannot reference physical memory addresses directly, but it may do so indirectly by first creating virtual addresses mapped to them. For more information, see the memory descriptor list (MDL) support routines described in the WDK documentation.

The actual translation process and the layout of the page tables and page directories (described shortly), are determined by the CPU. The operating system must follow suit and build the structures correctly in memory for the whole concept to work. Figure 5-16 depicts a general diagram of x86 translation. The general concept, however, is the same for other architectures.

As shown in Figure 5-16, the input to the translation system consists of a 32-bit virtual address (since this is the addressable range with 32 bit) and a bunch of memory-related structures (page tables, page directories, a single page directory pointer table [PDPT], and translation lookaside buffers, all described

372    CHAPTER 5   Memory management


---

shortly). The output should be a 36-bit physical address in RAM where the actual byte is located. The number 36 comes from the way the page tables are structured and, as mentioned, dictated by the processor. When mapping small pages (the common case, shown in Figure 5-16), the least significant 12 bits from the virtual address are copied directly to the resulting physical address. 12 bits is exactly 4 KB—the size of a small page.

![Figure](figures/Winternals7thPt1_page_390_figure_001.png)

FIGURE 5-16 Virtual address translation overview.

If the address cannot be translated successfully (for example, the page may not be in physical memory but resides in a page file), the CPU throws an exception known as a page fault that indicates to the OS that the page cannot be located. Because the CPU has no idea where to find the page (page file, mapped file, or something else), it relies on the OS to get the page from wherever it's located (if possible), fix the page tables to point to it, and request that the CPU tries translation again. (Page faults are described in the section "Page files" later in this chapter.)

Figure 5-17 depicts the entire process of translating x86 virtual to physical addresses.

![Figure](figures/Winternals7thPt1_page_390_figure_005.png)

FIGURE 5-17 x86 virtual address translation.

CHAPTER 5     Memory management      373


---

The 32-bit virtual address to be translated is logically segregated into four parts. As you've seen, the lower 12 bits are used as-is to select a specific byte within a page. The translation process starts with a single PDPT per process, which resides in physical memory at all times. (Otherwise, how would the system locate it?) Its physical address is stored in the KPROCESS structure for each process. The special x86 register CR3 stores this value for the currently executing process (that is, one of its threads made the access to the virtual address). This means that when a context switch occurs on a CPU, if the new thread is running under a different process than the old thread, then the CR3 register must be loaded with the new process's page directory pointer address from its KPROCESS structure. The PDPT must be aligned on a 32-byte boundary and must furthermore reside in the first 4 GB of RAM (because CR3 on x86 is still a 32-bit register).

Given the layout in Figure 5-17, the sequence of translating a virtual address to a physical one goes

as follows:

- 1. The two most significant bits of the virtual address (bits 30 and 31) provide an index into

the PDPT. This table has four entries. The entry selected—the page directory pointer entry

(PDPE)—points to the physical address of a page directory.

2. A page directory contains 512 entries, one of which is selected by bits 21 to 29 (9 bits) from the

virtual address. The selected page directory entry (PDE) points to the physical address of a page

table.

3. A page table also contains 512 entries, one of which is selected by bits 13 to 28 (9 bits) from the

virtual address. The selected page table entry (PTE) points to the physical address of the start of

the page.

4. The virtual address offset (lower 12 bits) is added to the PTE pointed-to address to give the final

physical address requested by the caller.
Every entry value in the various tables is also called a page frame number (PFN) because it points

to a page-aligned address. Each entry is 64 bits wide—so the size of a page directory or page table is

no larger than a 4 KB page—but only 24 bits are strictly necessary to describe a 64 GB physical range

(combined with the 12 bits of the offset for an address range with a total of 36 bits). This means there

are more bits than needed for the actual PFN values.

One of the extra bits in particular is paramount to the whole mechanism: the valid bit. This bit indicates whether the PFN data is indeed valid and therefore whether the CPU should execute the procedure just outlined. If the bit is clear, however, it indicates a page fault. The CPU raises an exception and expects the OS to handle the page fault in some meaningful way. For example, if the page in question was previously written to disk, then the memory manager should read it back to a free page in RAM, fix the PTE, and tell the CPU to try again.

Because Windows provides a private address space for each process, each process has its own PDPT, page directories, and page tables to map that process's private address space. However, the page directories and page tables that describe system space are shared among all processes (and session space is shared only among processes in a session). To avoid having multiple page tables describing the same virtual memory, the page directory entries that describe system space are initialized to point

---

to the existing system page tables when a process is created. If the process is part of a session, session

space page tables are also shared by pointing the session space page directory entries to the existing

session page tables.

## Page tables and page table entries

Each PDE points to a page table. A page table is a simple array of PTEs. So, too, is a PDPT. Every page table has 512 entries and each PTE maps a single page (4 KB). This means a page table can map a 2 MB address space (512 x 4 KB). Similarly, a page directory has 512 entries, each pointing to a page table. This means a page directory can map 512 x 2 MB or 1 GB of address space. This makes sense because there are four PDPEs, which together can map the entire 32-bit 4 GB address space.

For large pages, the PDE points with 11 bits to the start of a large page in physical memory, where

the byte offset is taken for the low 21 bits of the original virtual address. This means such a PDE map ping a large page does not point to any page table.

The layout of a page directory and page table is essentially the same. You can use the kernel debugger !pte command to examine PTEs. (See the upcoming experiment "Translating addresses.") We'll discuss valid PTEs here and invalid PTEs in the section "Page fault handling." Valid PTEs have two main fields: the PFN of the physical page containing the data or of the physical address of a page in memory, and some flags that describe the state and protection of the page. (See Figure 5-18.)

![Figure](figures/Winternals7thPt1_page_392_figure_005.png)

FIGURE 5-18 Valid x86 hardware PTEs.

The bits labeled "Software" and "Reserved" in Figure 5-18 are ignored by the memory management

unit (MMU) inside the CPU regardless of whether the PTE is valid. These bits are stored and interpreted

by the memory manager. Table 5-10 briefly describes the hardware-defined bits in a valid PTE.

TABLE 5-10 PTE status and protection bits

<table><tr><td>Name of Bit</td><td>Meaning</td></tr><tr><td>Accessed</td><td>The page has been accessed.</td></tr><tr><td>Cache disabled</td><td>This disables CPU caching for that page.</td></tr><tr><td>Copy-on-write</td><td>The page is using copy-on-write (described earlier).</td></tr></table>


CHAPTER 5     Memory management      375


---

TABLE 5-10 PTE status and protection bits (continued)

<table><tr><td>Name of Bit</td><td>Meaning</td></tr><tr><td>Dirty</td><td>The page has been written to.</td></tr><tr><td>Global</td><td>Translation applies to all processes. For example, a translation buffer flush won&#x27;t affect this PTE.</td></tr><tr><td>Large page</td><td>This indicates that the PDE maps a 2 MB page. (Refer to the section &quot;Large and small pages&quot; earlier in this chapter.)</td></tr><tr><td>No execute</td><td>This indicates that code cannot execute in the page. (It can be used for data only.)</td></tr><tr><td>Owner</td><td>This indicates whether user-mode code can access the page or whether the page is limited to kernel-mode access.</td></tr><tr><td>Prototype</td><td>The PTE is a prototype PTE, which is used as a template to describe shared memory associated with section objects.</td></tr><tr><td>Valid</td><td>This indicates whether the translation maps to a page in physical memory.</td></tr><tr><td>Write through</td><td>This marks the page as write-through or, if the processor supports the page attribute table, write-combined. This is typically used to map video frame buffer memory.</td></tr><tr><td>Write</td><td>This indicates to the MMU whether the page is writable.</td></tr></table>


On x86 systems, a hardware PTE contains two bits that can be changed by the MMU: the dirty bit

and the accessed bit. The MMU sets the accessed bit whenever the page is read or written (provided

it is not already set). The MMU sets the dirty bit whenever a write operation occurs to the page. The

operating system is responsible for clearing these bits at the appropriate times. They are never cleared

by the MMU.

The x86 MMU uses a write bit to provide page protection. When this bit is clear, the page is readonly. When it is set, the page is read/write. If a thread attempts to write to a page with the write bit clear, a memory-management exception occurs. In addition, the memory manager's access fault handler (described later in the section "Page fault handling") must determine whether the thread can be allowed to write to the page (for example, if the page was really marked copy-on-write) or whether an access violation should be generated.

## Hardware versus software write bits in page table entries

The additional write bit implemented in software (refer to Table 5-10) is used to force an update of the dirty bit to be synchronized with updates to Windows memory management data. In a simple implementation, the memory manager would set the hardware write bit (bit 1) for any writable page. A write to any such page will cause the MMU to set the dirty bit in the PTE. Later, the dirty bit will tell the memory manager that the contents of that physical page must be written to backing store before the physical page can be used for something else.

In practice, on multiprocessor systems, this can lead to race conditions that are expensive to resolve. At any time, the MMUs of the various processors can set the dirty bit of any PTE that has its hardware write bit set. The memory manager must, at various times, update the process working set list to reflect the state of the dirty bit in a PTE. The memory manager uses a pushlock to synchronize access to the working set list. But on a multiprocessor system, even while one processor is holding the lock, the dirty bit might be changed by MMUs of other CPUs. This raises the possibility of missing an update to a dirty bit.

376    CHAPTER 5   Memory management


---

To avoid this, the Windows memory manager initializes both read-only and writable pages with the hardware write bit (bit 1) of their PTEs set to 0 and records the true writable state of the page in the software write bit (bit 11). On the first write access to such a page, the processor will raise a memorymanagement exception because the hardware write bit is clear, just as it would be for a true read-only page. In this case, though, the memory manager learns that the page actually is writable (via the software write bit), acquires the working set pushlock, sets the dirty bit and the hardware write bit in the PTE, updates the working set list to note that the page has been changed, releases the working set pushlock, and dismisses the exception. The hardware write operation then proceeds as usual, but the setting of the dirty bit is made to happen with the working set list pushlock held.

On subsequent writes to the page, no exceptions occur because the hardware write bit is set. The MMU will redundantly set the dirty bit, but this is benign because the "written-to" state of the page is already recorded in the working set list. Forcing the first write to a page to go through this exception handling may seem to be excessive overhead. However, it happens only once per writable page as long as the page remains valid. Furthermore, the first access to almost any page already goes through memory-management exception handling because pages are usually initialized in the invalid state (the PTE bit 0 is clear). If the first access to a page is also the first write access to the page, the dirty bit handling just described will occur within the handling of the first-access page fault, so the additional overhead is small. Finally, on both uniprocessor and multiprocessor systems, this implementation allows flushing of the translation look-aside buffer (described in the next section) without holding a lock for each page being flushed.

## Translation look-aside buffer

As you've learned, each hardware address translation requires three lookups:

- ■ One to find the right entry in the PDPT

■ One to find the right entry in the page directory (which provides the location of the page table)

■ One to find the right entry in the page table
Because doing three additional memory lookups for every reference to a virtual address would quadruple the required bandwidth to memory, resulting in poor performance, all CPUs cache address translations so that repeated accesses of the same addresses don't have to be repeatedly translated. This cache is an array of associative memory called the translation lookaside buffer (TLB). Associative memory is a vector whose cells can be read simultaneously and compared to a target value. In the case of the TLB, the vector contains the virtual-to-physical page mappings of the most recently used pages, as shown in Figure 5-19, and the type of page protection, size, attributes, and so on applied to each page. Each entry in the TLB is like a cache entry whose tag holds portions of the virtual address and whose data portion holds a physical page number, protection field, valid bit, and usually a dirty bit indicating the condition of the page to which the cached PTE corresponds. If a PTE's global bit is set (as is done by Windows for system space pages that are visible to all processes), the TLB entry isn't invalidated on process context switches.

CHAPTER 5   Memory manage

377

---

![Figure](figures/Winternals7thPt1_page_395_figure_000.png)

FIGURE 5-19  Accessing the TLB.

Frequently used virtual addresses are likely to have entries in the TLB, which provides extremely fast virtual-to-physical address translation and, therefore, fast memory access. If a virtual address isn't in the TLB, it might still be in memory, but multiple memory accesses are needed to find it, which makes the access time slightly slower. If a virtual page has been paged out of memory or if the memory manager changes the PTE, the memory manager is required to explicitly invalidate the TLB entry. If a process accesses it again, a page fault occurs, and the memory manager brings the page back into memory (if needed) and re-creates its PTE (which then results in an entry for it in the TLB).

## EXPERIMENT: Translating addresses

To clarify how address translation works, this experiment shows an example of translating a virtual address on an x86 PAE system using the available tools in the kernel debugger to examine the PDPT, page directories, page tables, and PTEs. In this example, you'll work with a process that has virtual address 0x3166004, currently mapped to a valid physical address. In later examples, you'll see how to follow address translation for invalid addresses with the kernel debugger.

First convert 0x3166004 to binary and break it into the three fields used to translate an address.


In binary, 0x3166004 is 11.0001.0110.0110.0000.0000.0100. Breaking it into the component fields


yields the following:

```bash
31 30 29           21 20             12 11             0
 00 00.0011.000  1.0110.0110 0000.0000.0100
Page Directory
Pointer
Index (0)
```

---

To start the translation process, the CPU needs the physical address of the process's PDPT. This

is found in the CR3 register while a thread in that process is running. You can display this address

by looking at the DiBase field in the output of the !process command, as shown here:

```bash
!tkd  | process - 0
PROCESS 99aa3040  SessionId: 2  Cid: 1690    Feb: 03159000  ParentCid: 0920
  DirBase: 01024800  ObjectTable: b3b386c0  HandleCount: <Data Not Accessible>
  Image = windbg.exe
```

The DiBase field shows that the PDPT is at physical address 0x1024800. As shown in the

preceding illustration, the PDPT index field in the sample virtual address is 0. Therefore, the PDPT

entry that contains the physical address of the relevant page directory is the first entry in the

PDPT, at physical address 0x1024800.

The kernel debugger !pte command displays the PDE and PTE that describe a virtual address, as shown here:

```bash
!kds !pte 3166004
                          VA 03166004
  PDE at C06000C0        PTE at C0018830
contains 0000000056238867 contains 800000000056E61867
pfn 56238    ----DA--UWEv    pfn 5de61    ----DA--UvV
```

The debugger does not show the PDPT, but it is easy to display given its physical address:

```bash
1kd×1dq 01024800 L4
# 1024800 00000000'33c88801 00000000'53c9801
# 1024810 00000000'53c8a01 00000000'53c8d801
```

Here we have used the debugger extension command !daq. This is similar to the dq command (display as quadtwords—64 bit values) but lets us examine memory by physical rather than virtual address. Because we know the PDPT is only four entries long, we added the L 4 length argument to keep the output uncluttered.

As illustrated, the PDPT index (the two most significant bits) from the sample virtual address equal 0, so the PDPT entry you want is the first displayed quadword. PDPT entries have a format similar to PDEs and PTEs, so you can see that this one contains a PFN of 0x53c88 (always pagealigned), for a physical address of 0x53c88000. That's the physical address of the page directory.

The !pte output shows the PDE address 0xC06000CC0 as a virtual address, not physical. On x86 systems, the first process page directory starts at virtual address 0xC0600000. In this case, the PDE address is 0xC0—that is, 8 bytes (the size of an entry) times 24 added to the page directory start address. Therefore, the page directory index field of the sample virtual address is 24. That means you're looking at the 25th PDE in the page directory.

The PDE provides the PFN of the needed page table. In this example, the PFN is 0x56238, so

the page table starts at physical address 0x56238000. To this the MMU will add the page table

index field (0x166) from the virtual address multiplied by 8 (the size of a PTE in bytes). The result ing physical address of the PTE is 0x56238B30.

---

The debugger shows that this PTE is at virtual address 0xC0018B30. Notice that the byte offset portion (0x830) is the same as that from the physical address, as is always the case in address translation. Because the memory manager maps page tables starting at 0xC0000000, adding 0x830 to 0xC0018000 (the 0x18 is entry 24 as you've seen) yields the virtual address shown in the kernel debugger output: 0xC0018B30. The debugger shows that the PFN field of the PTE is 0x5D6E1.

Finally, you can consider the byte offset from the original address. As described, the MMU concatenates the byte offset to the PFN from the PTE, giving a physical address of 0x5DE61004. This is the physical address that corresponds to the original virtual address of 0x3166004...at the moment.

The flags bits from the PTE are interpreted to the right of the PFN number. For example, the PTE that describes the page being referenced has flags of --DA--UI--V. Here, A stands for accessed (the page has been read), U for user-mode accessible (as opposed to kernel-mode accessible only), w for writable page (rather than just readable), and V for valid (the PTE represents a valid page in physical memory).

To confirm the calculation of the physical address, look at the memory in question via both its

virtual and its physical addresses. First, using the debugger's dd (display dwords) command on

the virtual address, you see the following:

```bash
1kds dd 316004\ L 10
03166004    00000034    00000006    00003020    00000004e
03166014    00000000    00020020    0000a000    000000014
```

And with the !dd command on the physical address just computed, you see the same contents:

```bash
1kd. 1dd 5DE61004 L 10
#SE61004 00000034 00000006 #0003020 0000004e
#SE61004 00000030 0002002 0000a00 00000014
```

You could similarly compare the displays from the virtual and physical addresses of the PTE

and PDE.

## x64 virtual address translation

Address translation on x64 is similar to x86, but with a fourth level added. Each process has a top-level extended page directory called the page map level 4 table that contains the physical locations of 512 third-level structures, called page directory pointers. The page parent directory is analogous to the x86 PAE PDPT, but there are 512 of them instead of just one, and each page parent directory is an entire page containing 512 entries instead of just four. Like the PDPT, the page parent directory's entries contain the physical locations of second-level page directories, each of which in turn contains 512 entries providing the locations of the individual page tables. Finally, the page tables, each of which contains 512 page table entries, contain the physical locations of the pages in memory. All the "physical locations" in the preceding description are stored in these structures as PFNs.

380    CHAPTER 5   Memory management


---

Current implementations of the x64 architecture limit virtual addresses to 48 bits. The components

that make up this 48-bit virtual address and the connection between the components for translation

purposes are shown in Figure 5-20, and the format of an x64 hardware PTE is shown in Figure 5-21.

![Figure](figures/Winternals7thPt1_page_398_figure_001.png)

FIGURE 5-20 x64 address translation.

![Figure](figures/Winternals7thPt1_page_398_figure_003.png)

FIGURE 5-21 x64 hardware PTE.

## ARM virtual address translation

Virtual address translation on ARM 32-bit processors uses a single page directory with 1,024 entries, each 32 bits in size. The translation structures are shown in Figure 5-22.

CHAPTER 5     Memory management      381


---

![Figure](figures/Winternals7thPt1_page_399_figure_000.png)

FIGURE 5-22 ARM virtual address translation structures.

Every process has a single page directory, with its physical address stored in the TBTR register (similar to the CR3 x86/x64 register). The 10 most significant bits of the virtual address select a PDE that may point to one of 1,024 page tables. A specific PTE is selected by the next 10 bits of the virtual address. Each valid PTE points to the start of a page in physical memory, where the offset is given by the lower 12 bits of the address (just as in the x86 and x64 cases). The scheme in Figure 5-22 suggests that the addressable physical memory is 4 GB because each PTE is smaller (32 bits) than the x86/x64 case (64 bits), and indeed only 20 bits are used for the PFN. ARM processors do support a PAE mode (similar to x86), but Windows does not use this functionality. Future Windows versions may support the ARM 64-bit architecture, which will alleviate the physical address limitations as well as dramatically increase the virtual address space for processes and the system.

Curiously, the layout of valid PTE, PDE, and large page PDE are not the same. Figure 5-23 shows the layout of a valid PTE for ARMv7, currently used by Windows. For more information, consult the official ARM documentation.

![Figure](figures/Winternals7thPt1_page_399_figure_004.png)

FIGURE 5-23 ARM valid PTE layout.

382    CHAPTER 5   Memory management


---

## Page fault handling

Earlier, you saw how address translations are resolved when the PTE is valid. When the PTE valid bit is clear, this indicates that the desired page is for some reason not currently accessible to the process. This section describes the types of invalid PTEs and how references to them are resolved.

![Figure](figures/Winternals7thPt1_page_400_figure_002.png)

Note Only the 32-bit x86 PTE formats are detailed in this section. PTEs for 64-bit and ARM systems contain similar information, but their detailed layout is not presented.

A reference to an invalid page is called a page fault. The kernel trap handler (see the section "Trap dispatching" in Chapter 8 in Part 2) dispatches this kind of fault to the memory manager fault handler function, MmAccessFau1t, to resolve. This routine runs in the context of the thread that incurred the fault and is responsible for attempting to resolve the fault (if possible) or raise an appropriate exception. These faults can be caused by a variety of conditions, as listed in Table 5-11.

TABLE 5-11 Reasons for access faults

<table><tr><td>Reason for Fault</td><td>Result</td></tr><tr><td>Corrupt PTE/PDE</td><td>Bug-check (crash) the system with code 0x1A (MEMORY_MANAGEMENT).</td></tr><tr><td>Accessing a page that isn&#x27;t resident in memory but is on disk in a page file or a mapped file</td><td>Allocate a physical page and read the desired page from disk and into the relevant working set.</td></tr><tr><td>Accessing a page that is on the standby or modified list</td><td>Transition the page to the relevant process, session, or system working set.</td></tr><tr><td>Accessing a page that isn&#x27;t committed (for example, reserved address space or address space that isn&#x27;t allocated)</td><td>Access violation exception.</td></tr><tr><td>Accessing a page from user mode that can be accessed only in kernel mode</td><td>Access violation exception.</td></tr><tr><td>Writing to a page that is read-only</td><td>Access violation exception.</td></tr><tr><td>Accessing a demand-zero page</td><td>Add a zero-filled page to the relevant working set.</td></tr><tr><td>Writing to a guard page</td><td>Guard-page violation (if there is a reference to a user-mode stack, perform automatic stack expansion).</td></tr><tr><td>Writing to a copy-on-write page</td><td>Make a process-private (or session-private) copy of the page and use it to replace the original in the process, session, or system working set.</td></tr><tr><td>Writing to a page that is valid but hasn&#x27;t been written to the current backing store copy</td><td>Set the dirty bit in the PTE.</td></tr><tr><td>Executing code in a page that is marked as no execute</td><td>Access violation exception.</td></tr><tr><td>PTE permissions don&#x27;t match enclave permissions (see the section &quot;Memory enclaces&quot; later in this chapter and the Windows SDK documentation for the CreateEnClave function)</td><td>User mode: access violation exception. Kernel mode: bug-check with code 0x50 (PAGE_FAULT_IN_NOTPARED_AREA).</td></tr></table>


The following section describes the four basic kinds of invalid PTEs that are processed by the access

fault handler. Following that is an explanation of a special case of invalid PTEs, called prototype PTEs,

which are used to implement shareable pages.

CHAPTER 5     Memory management      383


---

## Invalid PTEs

If the valid bit of a PTE encountered during address translation is zero, the PTE represents an invalid

page—one that will raise a memory-management exception, or page fault, upon reference. The MMU

ignores the remaining bits of the PTE, so the operating system can use these bits to store information

about the page that will assist in resolving the page fault.

The following list details the four kinds of invalid PTEs and their structure. These are often referred

to as software PTEs because they are interpreted by the memory manager rather than the MMU. Some

of the flags are the same as those for a hardware PTE, as described in Table 5-10, and some of the bit

fields have either the same or similar meanings to corresponding fields in the hardware PTE.

- ■ Page file The desired page resides within a paging file. As illustrated in Figure 5-24, 4 bits in
the PTE indicate in which of 16 possible page files the page resides, and 32 bits provide the page
number within the file. The pager initiates an in-page operation to bring the page into memory
and make it valid. The page file offset is always non-zero and never all ones (that is, the very first
and last pages in the page file are not used for paging) to allow for other formats, described next.
![Figure](figures/Winternals7thPt1_page_401_figure_004.png)

FIGURE 5-24 A PTE representing a page in a page file.

- ■ Demand zero This PTE format is the same as the page file PTE shown in the previous entry
but the page file offset is zero. The desired page must be satisfied with a page of zeroes. The
pager looks at the zero page list. If the list is empty, the pager takes a page from the free list and
zeroes it. If the free list is also empty, it takes a page from one of the standby lists and zeroes it.
■ Virtual Address Descriptor This PTE format is the same as the page file PTE shown previous-
ly but in this case the page file offset field is all one. This indicates a page whose definition and
backing store, if any, can be found in the process's Virtual Address Descriptor (VAD) tree. This
format is used for pages that are backed by sections in mapped files. The pager finds the VAD
that defines the virtual address range encompassing the virtual page and initiates an in-page
operation from the mapped file referenced by the VAD. (VADs are described in more detail in
the section "Virtual address descriptors" later in this chapter.)
■ Transition The transition bit is one. The desired page is in memory on either the standby,
modified, or modified-no-write list or not on any list. The pager will remove the page from
the list (if it is on one) and add it to the process working set. This is known as a soft page fault
because no I/O is involved.
■ Unknown The PTE is zero or the page table doesn't yet exist. (The PDE that would provide
the physical address of the page table contains zero.) In both cases, the memory manager must

CHAPTER 5 Memory management

From the Library of M
---

examine the VADs to determine whether this virtual address has been committed. If so, page tables are built to represent the newly committed address space. If not—that is, if the page is reserved or hasn't been defined at all—the page fault is reported as an access violation exception.

## Prototype PTEs

If a page can be shared between two processes, the memory manager uses a software structure

called prototype page table entries (prototype PTEs) to map these potentially shared pages. For page file-backed sections, an array of prototype PTEs is created when a section object is first created. For

mapped files, portions of the array are created on demand as each view is mapped. These prototype

PTEs are part of the segment structure (described in the section "Section objects" later in this chapter).

When a process first references a page mapped to a view of a section object (recall that VADs are created only when the view is mapped), the memory manager uses the information in the prototype PTE to fill in the real PTE used for address translation in the process page table. When a shared page is made valid, both the process PTE and the prototype PTE point to the physical page containing the data. To track the number of process PTEs that reference a valid shared page, a counter in its PFN database entry is incremented. Thus, the memory manager can determine when a shared page is no longer referenced by any page table and thus can be made invalid and moved to a transition list or written out to disk.

When a shareable page is invalidated, the PTE in the process page table is filled in with a special PTE that points to the prototype PTE that describes the page, as shown in Figure 5-25. Thus, when the page is accessed, the memory manager can locate the prototype PTE using the information encoded in this PTE, which in turn describes the page being referenced.

![Figure](figures/Winternals7thPt1_page_402_figure_005.png)

FIGURE 5-25 Structure of an invalid PTE that points to the prototype PTE.

A shared page can be in one of six different states, as described by the prototype PTE:

- ●  Active/valid  The page is in physical memory because of another process that accessed it.

●  Transition  The desired page is in memory on the standby or modified list (or not on any list).

●  Modified-no-write  The desired page is in memory and on the modified-no-write list. (Refer
to Table 5-11)

●  Demand zero  The desired page should be satisfied with a page of zeroes.

●  Page file  The desired page resides within a page file.

●  Mapped file  The desired page resides within a mapped file.
---

Although the format of these prototype PTEs is the same as that of the real PTEs described earlier, the prototype PTEs aren't used for address translation. They are a layer between the page table and the PFN database and never appear directly in page tables.

By having all the accessors of a potentially shared page point to a prototype PTE to resolve faults, the memory manager can manage shared pages without needing to update the page tables of each process sharing the page. For example, a shared code or data page might be paged out to disk at some point. When the memory manager retrieves the page from disk, it needs only to update the prototype PTE to point to the page's new physical location. The PTEs in each of the processes sharing the page remain the same, with the valid bit clear and still pointing to the prototype PTE. Later, as processes reference the page, the real PTE will get updated.

Figure 5-26 illustrates two virtual pages in a mapped view. One is valid and the other is invalid. As shown, the first page is valid and is pointed to by the process PTE and the prototype PTE. The second page is in the paging file—the prototype PTE contains its exact location. The process PTE (and any other processes with that page mapped) points to this prototype PTE.

![Figure](figures/Winternals7thPt1_page_403_figure_003.png)

FIGURE 5-26 Prototype page table entries.

## In-paging I/O

In-paging I/O occurs when a read operation must be issued to a file (paging or mapped) to satisfy a

page fault. Also, because page tables are themselves pageable, the processing of a page fault can incur

additional I/O if necessary when the system is loading the page table page that contains the PTE or the

prototype PTE that describes the original page being referenced.

The in-page I/O operation is synchronous—that is, the thread waits on an event until the I/O completes—and isn't interruptible by asynchronous procedure call (APC) delivery. The pager uses a special modifier in the I/O request function to indicate paging I/O. Upon completion of paging I/O, the I/O system triggers an event, which wakes up the pager and allows it to continue in-page processing.

While the paging I/O operation is in progress, the faulting thread doesn't own any critical memory management synchronization objects. Other threads within the process can issue virtual memory

386    CHAPTER 5   Memory management


---

functions and handle page faults while the paging I/O takes place. But there are a few interesting

conditions that the pager must recognize when the I/O completes are exposed:

- Another thread in the same process or a different process could have faulted the same page
(called a collided page fault and described in the next section).

The page could have been deleted and remapped from the virtual address space.

The protection on the page could have changed.

The fault could have been for a prototype PTE, and the page that maps the prototype PTE could
be out of the working set.
The pager handles these conditions by saving enough state on the thread's kernel stack before

the paging I/O request such that when the request is complete, it can detect these conditions and, if

necessary, dismiss the page fault without making the page valid. When and if the faulting instruction is

reissued, the pager is again invoked and the PTE is reevaluated in its new state.

## Collided page faults

The case when another thread in the same process or a different process faults a page that is currently being in-paged is known as a collided page fault. The pager detects and handles collided page faults optimally because they are common occurrences in multithreaded systems. If another thread or process faults the same page, the pager detects the collided page fault, noticing that the page is in transition and that a read is in progress. (This information is in the PFN database entry.) In this case, the pager may issue a wait operation on the event specified in the PFN database entry. Alternatively, it can choose to issue a parallel I/O to protect the file systems from deadlocks. (The first I/O to complete “wins,” and the others are discarded.) This event was initialized by the thread that first issued the I/O needed to resolve the fault.

When the I/O operation completes, all threads waiting on the event have their wait satisfied. The

first thread to acquire the PFN database lock is responsible for performing the in-page completion

operations. These operations consist of checking I/O status to ensure that the I/O operation completed

successfully, clearing the read-in-progress bit in the PFN database, and updating the PTE.

When subsequent threads acquire the PFN database lock to complete the collided page fault, the

pager recognizes that the initial updating has been performed because the read-in-progress bit is clear

and checks the in-page error flag in the PFN database element to ensure that the in-page I/O completed

successfully. If the in-page error flag is set, the PTE isn't updated, and an in-page error exception is

raised in the faulting thread.

## Clustered page faults

The memory manager prefetches large clusters of pages to satisfy page faults and populate the system

cache. The prefetch operations read data directly into the system's page cache instead of into a work ing set in virtual memory. Therefore, the prefetched data does not consume virtual address space, and

the size of the fetch operation is not limited to the amount of virtual address space that is available.

CHAPTER 5   Memory manage

387

---

Also, no expensive TLB-flushing inter-processor interrupt (IPI) is needed if the page will be repurposed. The prefetched pages are put on the standby list and marked as in transition in the PTE. If a prefetched page is subsequently referenced, the memory manager adds it to the working set. However, if it is never referenced, no system resources are required to release it. If any pages in the prefetched cluster are already in memory, the memory manager does not read them again. Instead, it uses a dummy page to represent them so that an efficient single large I/O can still be issued, as shown in Figure 5-27.

![Figure](figures/Winternals7thPt1_page_405_figure_001.png)

FIGURE 5-27 Usage of dummy page during virtual-address-to-physical-address mapping in an MDL.

In the figure, the file offsets and virtual addresses that correspond to pages A, Y, Z, and B are logically contiguous, although the physical pages themselves are not necessarily contiguous. Pages A and B are nonresident, so the memory manager must read them. Pages Y and Z are already resident in memory, so it is not necessary to read them. (In fact, they might already have been modified since they were last read in from their backing store, in which case it would be a serious error to overwrite their contents.) However, reading pages A and B in a single operation is more efficient than performing one read for page A and a second read for page B. Therefore, the memory manager issues a single read request that comprises all four pages (A, Y, Z, and B) from the backing store. Such a read request includes as many pages as it makes sense to read, based on the amount of available memory, the current system usage, and so on.

When the memory manager builds the MDL that describes the request, it supplies valid pointers to pages A and B. However, the entries for pages Y and Z point to a single system-wide dummy page X.


The memory manager can fill the dummy page X with the potentially stale data from the backing store because it does not make X visible. However, if a component accesses the Y and Z offsets in the MDL, it sees the dummy page X instead of Y and Z.

The memory manager can represent any number of discarded pages as a single dummy page, and

that page can be embedded multiple times in the same MDL or even in multiple concurrent MDLs that

are being used for different drivers. Consequently, the contents of the locations that represent the

discarded pages can change at any time. (See Chapter 6 for more on MDLs.)

---

## Page files

Page files store modified pages that are still in use by some process but have had to be written to disk because they were unmapped or memory pressure resulted in a trim. Page file space is reserved when the pages are initially committed, but the actual optimally clustered page file locations cannot be chosen until pages are written out to disk.

When the system boots, the Session Manager process (Smss.exe) reads the list of page files to open by examining the HKLM\SYSTEM\CurrentControlSet\Control\SessionManager\Memory Management\ PagingFiles registry value. This multistring registry value contains the name, minimum size, and maximum size of each paging file. Windows supports up to 16 paging files on x86 and x64 and up to 2 page files on ARM. On x86 and x64 systems, each page file can be up to 16 TB in size, while the maximum is 4 GB on ARM systems. Once open, the page files can't be deleted while the system is running because the System process maintains an open handle to each page file.

Because the page file contains parts of process and kernel virtual memory, for security reasons, the system can be configured to clear the page file at system shutdown. T o enable this, set the ClearPageFileAtShutdown registry value in the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\ Memory Management key to 1. Otherwise, after shutdown, the page file will contain whatever data happened to have been paged out while the system was up. This data could then be accessed by someone who gained physical access to the machine.

If the minimum and maximum paging file sizes are both zero (or not specified), this indicates a

system-managed paging file. Windows 7 and Server 2008 R2 used a simple scheme based on RAM size

alone as follows:

- ■ Minimum size Set to the amount of RAM or 1 GB, whichever is larger

■ Maximum size Set to 3 * RAM or 4 GB, whichever is larger
These settings are not ideal. For example, today's laptops and desktop machines can easily have 32 GB or 64 GB of RAM, and server machines can have hundreds of gigabytes of RAM. Setting the initial page file size to the size of RAM may result in a considerable loss of disk space, especially if disk sizes are relatively small and based on solid-state device (SSD). Furthermore, the amount of RAM in a system is not necessarily indicative of the typical memory workload on that system.

The current implementation uses a more elaborate scheme to derive a "good" minimum page file size based not only on RAM size, but also on page file history usage and other factors. As part of pagefile creation and initialization, Smss.exe calculates page file minimum sizes based on four factors, stored in global variables:

- ■ RAM (SmpDesiredPFSizeBasedOnRAM) This is the recommended page file size based on RAM.

■ Crash dump (SmpDesiredPFSizeForCrashDump) This is the recommended page file size

needed to be able to store a crash dump.

■ History (SmpDesiredPFSizeBasedOnHistory) This is the recommended page file size based on

usage history. Smss.exe uses a timer that triggers once an hour and records the page file usage.
---

- ■ Apps (SmpDesiredPFSizeForApps) This is the recommended page file for Windows apps.

■ These values are computed as shown in T
able 5-12.
TABLE 5-12 Base calculation for page file size recommendation

<table><tr><td>Recommendation Base</td><td>Recommended Page File Size</td></tr><tr><td>RAM</td><td>If RAM &lt;= 1 GB, then size = 1 GB. If RAM &gt; 1 GB, then add 1/8 GB for every extra gigabyte of RAM, up to a maximum of 32 GB.</td></tr><tr><td>Crash dump</td><td>If a dedicated dump file is configured, then no page file is required for storing a dump file, and the size is 0. You can configure this for a dedicated dump file by adding the value DatedCuedumpFile in the HKLM\System\CurrentControlSet\Control\CrashControl key.) If the dump type configured is set to Automatic (the default), then: If RAM size is 1 GB, then size = 1 GB. Otherwise, size = 2/3 GB = 1/8 GB for each extra gigabyte above 4 GB, capped to 32 GB. If there was a recent crash for which the page file was not large enough, then recommended-ed size is increased to RAM size or 32 GB, whichever is smaller. If a full dump is configured, returned size = RAM size plus additional information size present in a dump file. If a kernel dump is configured, then size = RAM.</td></tr><tr><td>History</td><td>If enough samples have been logged, returns the 90th percentile as the recommended size. Otherwise, returns the size based on RAM (above).</td></tr><tr><td>Apps</td><td>If it&#x27;s a server, return zero. The recommended size is based on a factor that the Process Lifecycle Manager (PLM) uses to determine when to terminate an app. Current factor is 2.3 * RAM, which was considered with RAM = 1 GB (rough minimum for mobile devices). The recommended size (based on the mentioned factor) is around 2.5 GB. If this is more than RAM, RAM is subtracted. Otherwise, zero is returned.</td></tr></table>


The maximum page file size for a system-managed size is set at three times the size of RAM or 4 GB, whichever is larger. The minimum (initial) page file size is determined as follows:

■ If it's the first system-managed page file, then the base size is set based on page file history (refer to Table 5-12). Otherwise, the base size is based on RAM.

■ If it's the first system-managed page file:

- • If the base size is smaller than the computed page file size for apps (SmpDesiredPFSize-


ForApps), then set the new base as the size computed for apps (refer to Table 5-12).

• If the (new) base size is smaller than the computed size for crash dumps (SmpDesiredPf-

SizeForCrashDump), then set the new base to be the size computed for crash dumps.
## EXPERIMENT: Viewing page files

To view the list of page files, look in the registry at the PagingFiles value in the HKLM\SYSTEM\ CurrentControlSet\Control\Session Manager\Memory Management key. This entry contains the paging file configuration settings modified through the Advanced System Settings dialog box. To access these settings, follow these steps:

1. Open Control Panel.

---

2. Click System and Security and then click System. This opens the System Properties dialog box, which you can also access by right-clicking on Computer in Explorer and selecting Properties.

3. Click Advanced System Settings.

4. In the Performance area, click Settings. This opens the Performance Options dialog

box.

5. Click the Advanced tab.

6. In the Virtual Memory area, click Change.

## EXPERIMENT: Viewing page file recommended sizes

To view the actual variables calculated in Table 5-12, follow these steps (this experiment was done using an x86 Windows 10 system):

1. Start local kernel debugging

2. Locate Smss.exe processes:

```bash
!tkd> process 0 0 smss.exe
PROCESS 8e54bc40  SessionId: none  Cid: 0130    Peb: 02bab000  ParentCid: 0004
        DirBase: bffe0020  ObjectTable: 8a767640  HandleCount: <Data Not
        Accessible>
        Image: smss.exe
PROCESS 9985bc40  SessionId: 1  Cid: 01d4    Peb: 02f9c000  ParentCid: 0130
        DirBase: bffe0080  ObjectTable: 00000000  HandleCount: 0.      0.
        Image: smss.exe
PROCESS a122dc40  SessionId: 2  Cid: 02a8    Peb: 02fcd000  ParentCid: 0130
        DirBase: bffe0320  ObjectTable: 00000000  HandleCount: 0.      0.
        Image: smss.exe
```

3. Locate the first one (with a session ID of none), which is the master Smss.exe. (Refer to Chapter 2 for more details.)

4. Switch the debugger context to that process:

```bash
!kd> ./process /r p @e54bc40
Implicit process is now 8e54bc40
Loading User Symbols
..
```

5. Show the four variables described in the previous section. (Each one is 64 bits in size.)

```bash
Tkb-dq smsslSmDepredPFSIsizeBasedOnRAM L1
00974cd0 00000000^4fff1a0
```

CHAPTER 5     Memory management      391


---

```bash
1kd-gsms.speechDesiredPFSizeBasedOnHistory L1
00974cd8 00000000A05a24700
1kd-gsms.speechDesiredPFSizeForCrashDump L1
00974cc8 0000000011ffec55
1kd-gsms.speechDesiredPFSizeForApps L1
00974ce0 0000000010000000
```

6. Because there is a single volume (C:) on this machine, a single page file would be created. Assuming it wasn't specifically configured, it would be system managed. You can look at the actual file size of C:\PageFile.Sys on disk or use the \vm debugger command:

```bash
!kb: \m 1
Page File: \??:C:\pagefile.sys
Current:      524288 Kb  Free Space:   524280 Kb
Minimum:     524288 Kb  Maximum:    8324476 Kb
Page File: \??:C:\swapfile.sys
Current:      262144 Kb  Free Space:   262136 Kb
Minimum:     262144 Kb  Maximum:    4717900 Kb
No Name for Paging File
Current:      11469744 Kb  Free Space:  11443108 Kb
Minimum:    11469744 Kb  Maximum:    11469744 Kb
...
```

Notice the minimum size of C:\PageFile.sys (524288 KB). (We'll discuss the other page file

entries in the next section). According to the variables, SmpDes1redPfSizeForCrashDump is the

largest, so must be the determining factor (0x1FFCED55 = 524211 KB), which is very close to the

listed value. (Page file sizes round up to multiple of 64 MB.)

To add a new page file, Control Panel uses the internal NtCreatePagingFile system service defined

in Ntdll.dll. (This requires the SeCreatePageFilePrivilege.) Page files are always created as non compressed files, even if the directory they are in is compressed. Their names are PageFile.sys (except

some special ones described in the next section). They are created in the root of partitions with the

Hidden file attribute so they are not immediately visible. To keep new page files from being deleted, a

handle is duplicated into the System process so that even after the creating process closes the handle

to the new page file, a handle is nevertheless always open to it.

## The swap file

In the UWP apps world, when an app goes to the background—for example, it is minimized—the threads in that process are suspended so that the process does not consume any CPU. The private physical memory used by the process can potentially be reused for other processes. If memory pressure is high, the private working set (physical memory used by the process) may be swapped out to disk to allow the physical memory to be used for other processes.

Windows 8 added another page file called a swap file. It is essentially the same as a normal page file

but is used exclusively for UWP apps. It's created on client SKUs only if at least one normal page file

was created (the normal case). Its name is SwapFile.sys and it resides in the system root partition—for

example, C:\SwapFile.Sys.

392    CHAPTER 5   Memory management


---

After the normal page files are created, the HKLM\System\CurrentControlSet\Control\Session Manager\Memory Management registry key is consulted. If a DWORD value named SwapFileControl1 exists and its value is zero, swap file creation is aborted. If a value named SwapFile11e exists, it's read as a string with the same format as a normal page file, with a filename, an initial size, and a maximum size. The difference is that a value of zero for the sizes is interpreted as no swap file creation. These two registry values do not exist by default, which results in the creation of a SwapFile.sys file on the system root partition with a minimum size of 16 MB on fast (and small) disks (for example, SSD) or 256 MB on slow (or large SSD) disks. The maximum size of the swap file is set to 1.5 * RAM or 10 percent of the system root partition size, whichever is smaller. See Chapter 7 in this book and Chapter 8, "System mechanisms," and Chapter 9, "Management mechanisms," in Part 2 for more on UWP apps.

![Figure](figures/Winternals7thPt1_page_410_figure_001.png)

Note The swap file is not counted against the maximum page files supported.

## The virtual page file

The I'm debugger command hints at another page file called "No Name for Paging File." This is a virtual page file. As the name suggests, it has no actual file, but is used indirectly as the backing store for memory compression (described later in this chapter in the section "Memory compression"). It is large, but its size is set arbitrarily as not to run out of free space. The invalid PTEs for pages that have been compressed point to this virtual page file and allow the memory compression store to get to the compressed data when needed by interpreting the bits in the invalid PTE leading to the correct store, region, and index.

## EXPERIMENT: Viewing swap file and virtual page file information

The !v debugger command shows the information on all page files, including the swap file and the virtual page file:

```bash
Tkd> !vm 1
Page File:  ??:C:\pagefile.sys
Current:      524288 Kb  Free Space:   524280 Kb
Minimum:     524288 Kb  Maximum:    8324476 Kb
Page File:  ??:C:\swapfile.sys
Current:      262144 Kb  Free Space:   262136 Kb
Minimum:     262144 Kb  Maximum:    4717900 Kb
No Name for Paging File
Current:      11469744 Kb  Free Space:  11443108 Kb
Minimum:     11469744 Kb  Maximum:    11469744 Kb
```

On this system, the swap file minimum size is 256 MB, as the system is a Windows 10 virtual machine. (The VHD behind the disk is considered a slow disk.) The maximum size of the swap file is about 4.5 GB, as the RAM on the system is 3 GB and disk partition size is 64 GB (the minimum of 4.5 GB and 6.4 GB).

CHAPTER 5   Memory manage

393


---

