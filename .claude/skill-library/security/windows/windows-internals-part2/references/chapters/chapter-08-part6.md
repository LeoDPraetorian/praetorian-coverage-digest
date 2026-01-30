FIGURE 8-30 Executive objects that contain kernel objects.

Details about the structure of kernel objects and how they are used to implement synchronization

are given later in this chapter. The remainder of this section focuses on how the Object Manager works

and on the structure of executive objects, handles, and handle tables. We just briefly describe how

objects are involved in implementing Windows security access checking: Chapter 7 of Part 1 thoroughly

covers that topic.

## Executive objects

Each Windows environment subsystem projects to its applications a different image of the operating system. The executive objects and object services are primitives that the environment subsystems use to construct their own versions of objects and other resources.

Executive objects are typically created either by an environment subsystem on behalf of a user application or by various components of the operating system as part of their normal operation. For example, to create a file, a Windows application calls the Windows CreateFileW function, implemented in the Windows subsystem DLL KernelBase.dll. After some validation and initialization, CreateFileW in turn calls the native Windows service NtCreateFile to create an executive file object.

---

The set of objects an environment subsystem supplies to its applications might be larger or smaller

than the set the executive provides. The Windows subsystem uses executive objects to export its own

set of objects, many of which correspond directly to executive objects. For example, the Windows

mutexes and semaphores are directly based on executive objects (which, in turn, are based on cor responding kernel objects). In addition, the Windows subsystem supplies named pipes and mailslots,

resources that are based on executive file objects. When leveraging Windows Subsystem for Linux

(WSL), its subsystem driver (Lxcore.sys) uses executive objects and services as the basis for presenting

Linux-style processes, pipes, and other resources to its applications.

Table 8-15 lists the primary objects the executive provides and briefly describes what they represent.

You can find further details on executive objects in the chapters that describe the related executive

components (or in the case of executive objects directly exported to Windows, in the Windows API ref erence documentation). You can see the full list of object types by running Winobj with elevated rights

and navigating to the ObjectTypes directory.

![Figure](figures/Winternals7thPt2_page_159_figure_002.png)

Note The executive implements a total of about 69 object types (depending on the

Windows version). Some of these objects are for use only by the executive component that

defines them and are not directly accessible by Windows APIs. Examples of these objects

include Driver, Callback, and Adapter.

TABLE 8-15 Executive objects exposed to the Windows API

<table><tr><td>Object Type</td><td>Represents</td></tr><tr><td>Process</td><td>The virtual address space and control information necessary for the execution of a set of thread objects.</td></tr><tr><td>Thread</td><td>An executable entity within a process.</td></tr><tr><td>Job</td><td>A collection of processes manageable as a single entity through the job.</td></tr><tr><td>Section</td><td>A region of shared memory (known as a file-mapping object in Windows).</td></tr><tr><td>File</td><td>An instance of an opened file or an I/O device, such as a pipe or socket.</td></tr><tr><td>Token</td><td>The security profile (security ID, user rights, and so on) of a process or a thread.</td></tr><tr><td>Event, KeyedEvent</td><td>An object with a persistent state (signaled or not signaled) that can be used for synchronization or notification. The latter allows a global key to be used to reference the underlying synchronization primitive, avoiding memory usage, making it usable in low-memory conditions by avoiding an allocation.</td></tr><tr><td>Semaphore</td><td>A counter that provides a resource gate by allowing some maximum number of threads to access the resources protected by the semaphore.</td></tr><tr><td>Mutex</td><td>A synchronization mechanism used to serialize access to a resource.</td></tr><tr><td>Timer, IRTimer</td><td>A mechanism to notify a thread when a fixed period of time elapses. The latter objects, called Idle Resilient Timers, are used by UWP applications and certain services to create timers that are not affected by Connected Standby.</td></tr><tr><td>IoCompletion, IoCompletionReserve</td><td>A method for threads to enqueue and dequeue notifications of the completion of I/O operations (known as an I/O completion port in the Windows API). The latter allows preallocation of the port to combat low-memory situations.</td></tr></table>


---




CHAPTER 8    System mechanisms      129


---

<table><tr><td>CoreMessaging</td><td>Represents a CoreMessaging IPC object that wraps an APC port with its own customized namespace and capabilities, used primarily by the modern Input Manager but also exposed to any MiniUser component on WCOS systems.</td></tr><tr><td>EnergyTracker</td><td>Exposed to the User Mode Power (UMPO) service to allow tracking and aggregation of energy usage across a variety of hardware and associating it on a per-application basis.</td></tr><tr><td>FilterCommunicationPort, FilterConnectionPort</td><td>Underlying objects backing the IBP-based interface exposed by the Filter Manager API, which allows communication between user-mode services and applications, and the mini-filters that are managed by Filter Manager, such as when using FilterSendMessage.</td></tr><tr><td>Partition</td><td>Enables the memory manager, cache manager, and executive to treat a region of physical memory as unique from a management perspective vis-à-vis the rest of system RAM, giving it its own instance of management threads, capabilities, paging, caching, etc. Used by Game Mode and Hyper-V, among others, to better distinguish the system from the underlying workloads.</td></tr><tr><td>Profile</td><td>Used by the profiling API that allows capturing time-based buckets of execution that treat anything from the Instruction Pointer (IP) all the way to low-level processor caching information stored in the PMU counters.</td></tr><tr><td>RawInputManager</td><td>Represents the object that is bound to an HID device such as a mouse, keyboard, or tablet and allows reading and managing the window manager input that is being received by it. Used by modern UI management code such as when Core Messaging is involved.</td></tr><tr><td>Session</td><td>Object that represents the memory manager&#x27;s view of an interactive user session, as well as tracks the I/O manager&#x27;s notifications around connect/disconnect/rog-off/logon for third-party driver usage.</td></tr><tr><td>Terminal</td><td>Only enabled if the terminal thermal manager (TTM) is enabled, this represents a user terminal on a device, which is managed by the user mode power manager (UMPO).</td></tr><tr><td>TerminalEventQueue</td><td>Only enabled on TTM systems, like the preceding object type, this represents events being delivered to a terminal on a device, which UMPO communicates with the kernel&#x27;s power manager about.</td></tr><tr><td>UserApcReserve</td><td>Similar to IoCompletionReserve in that it allows precreating a data structure to be reused during low-memory conditions, this object encapsulates an APC Kernel Object (KAPC) as an executive object.</td></tr><tr><td>WaitCompletionPacket</td><td>Used by the new asynchronous wait capabilities that were introduced in the user-mode Thread Pool API, this object wraps the completion of a dispatcher wait as an I/O packet that can be delivered to an I/O completion port.</td></tr><tr><td>WmiGuid</td><td>Used by the Windows Management Instrumentation (WMI) APIs when opening WMI Data blocks by GUID, either from user mode or kernel mode, such as with IoWMIOpenBlock.</td></tr></table>


![Figure](figures/Winternals7thPt2_page_161_figure_001.png)

Note Because Windows NT was originally supposed to support the OS/2 operating system, the mutex had to be compatible with the existing design of OS/2 mutual-exclusion objects, a design that required that a thread be able to abandon the object, leaving it inaccessible. Because this behavior was considered unusual for such an object, another kernel object—the mutant—was created. Eventually, OS/2 support was dropped, and the object became used by the Windows 32 subsystem under the name mutex (but it is still called mutant internally).

---

## Object structure

As shown in Figure 8-31, each object has an object header, an object body, and potentially, an object footer. The Object Manager controls the object headers and footer, whereas the owning executive components control the object bodies of the object types they create. Each object header also contains an index to a special object, called the type object, that contains information common to each instance of the object. Additionally, up to eight optional subheaders exist: The name information header, the quota information header, the process information header, the handle information header, the audit information header, the padding information header, the extended information header, and the creator information header. If the extended information header is present, this means that the object has a footer, and the header will contain a pointer to it.

![Figure](figures/Winternals7thPt2_page_162_figure_002.png)

FIGURE 8-31 Structure of an object.

### Object headers and bodies

The Object Manager uses the data stored in an object's header to manage objects without regard to their type. Table 8-16 briefly describes the object header fields, and Table 8-17 describes the fields found in the optional object subheaders.

In addition to the object header, which contains information that applies to any kind of object, the

subheaders contain optional information regarding specific aspects of the object. Note that these

structures are located at a variable offset from the start of the object header, the value of which

depends on the number of subheaders associated with the main object header (except, as mentioned

---

earlier, for creator information). For each subheader that is present, the InfoMask field is updated to reflect its existence. When the Object Manager checks for a given subheader, it checks whether the corresponding bit is set in the InfoMask and then uses the remaining bits to select the correct offset into the global ObPInfoMaskToOffset table, where it finds the offset of the subheader from the start of the object header.

TABLE 8-16 Object header fields

<table><tr><td>Field</td><td>Purpose</td></tr><tr><td>Handle count</td><td>Maintains a count of the number of currently opened handles to the object.</td></tr><tr><td>Pointer count</td><td>Maintains a count of the number of references to the object (including one reference for each handle), and the number of usage references for each handle (up to 32 for 32-bit systems, and 32,768 for 64-bit systems). Kernel-mode components can reference an object by pointer without using a handle.</td></tr><tr><td>Security descriptor</td><td>Determines who can use the object and what they can do with it. Note that unnamed objects, by definition, cannot have security.</td></tr><tr><td>Object type index</td><td>Contains the index to a type object that contains attributes common to objects of this type. The table that stores all the type objects is ObTypeIndexTable. Due to a security mitigation, this index is XORed with a dynamically generated sentinel value stored in ObHeaderCookie and the bottom 8 bits of the address of the object header itself.</td></tr><tr><td>Info mask</td><td>Bitmask describing which of the optional subheader structures described in Table 8-17 are present, except for the creator information subheader, which, if present, always precedes the object. The bitmask is converted to a negative offset by using the ObInfoMaskToOffset table, with each subheader being associated with a 1-byte index that places it relative to the other subheaders present.</td></tr><tr><td>Flags</td><td>Characteristics and object attributes for the object. See Table 8-20 for a list of all the object flags.</td></tr><tr><td>Lock</td><td>Per-object lock used when modifying fields belonging to this object header or any of its subheaders.</td></tr><tr><td>Trace Flags</td><td>Additional flags specifically related to tracing and debugging facilities, also described in Table 8-20.</td></tr><tr><td>Object Create Info</td><td>Ephemeral information about the creation of the object that is stored until the object is fully inserted into the namespace. This field converts into a pointer to the Quota Block after creation.</td></tr></table>


These offsets exist for all possible combinations of subheader presence, but because the subheaders, if present, are always allocated in a fixed, constant order, a given header will have only as many possible locations as the maximum number of subheaders that precede it. For example, because the name information subheader is always allocated first, it has only one possible offset. On the other hand, the handle information subheader (which is allocated third) has three possible locations because it might or might not have been allocated after the quota subheader, itself having possibly been allocated after the name information. Table 8-17 describes all the optional object subheaders and their locations. In the case of creator information, a value in the object header flags determines whether the subheader is present. (See Table 8-20 for information about these flags.)

---

TABLE 8-17 Optional object subheaders

<table><tr><td>Name</td><td>Purpose</td><td>Bit</td><td>Offset</td></tr><tr><td>Creator information</td><td>Links the object into a list for all the objects of the same type and records the process that created the object, along with a back trace.</td><td>0 (0x1)</td><td>ObInfoMaskToOffset[0x0]</td></tr><tr><td>Name information</td><td>Contains the object name, responsible for making an object visible to other processes for sharing and a pointer to the object directory, which provides the hierarchy structure in which the object names are stored.</td><td>1 (0x2)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0x3]</td></tr><tr><td>Handle information</td><td>Contains a database of entries for a process that has an open handle to the object (along with a per-process handle count).</td><td>2 (0x4)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0x7]</td></tr><tr><td>Quote information</td><td>Lists the resource charges levied against a process when it opens a handle to the object.</td><td>3 (0x8)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0xF]</td></tr><tr><td>Process information</td><td>Contains a pointer to the owning process if this is an exclusive object. More information on exclusive objects follows later in the chapter.</td><td>4 (0x10)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0x1F]</td></tr><tr><td>Audit information</td><td>Contains a pointer to the original security descrip-tion that was used when first creating the object. This is used for File Objects when auditing is enabled to guarantee consistency.</td><td>5 (0x20)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0x3F]</td></tr><tr><td>Extended information</td><td>Stores the pointer to the object before using the object.</td><td>6 (0x40)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0x7F]</td></tr><tr><td>Padding information</td><td>Stores nothing—empty junk space—but is used to align the object body on a cache boundary, if this was requested.</td><td>7 (0x80)</td><td>ObInfoMaskToOffset[lnfoMask &amp; 0xFF]</td></tr></table>

Each of these subheaders are optional and is present only during certain conditions, either during system boot or at object creation time. Table 8-18 describes each of these conditions.

TABLE 8-18 Conditions required for presence of object subheaders

<table><tr><td>Name</td><td>Condition</td></tr><tr><td>Creator information</td><td>The object type must have enabled the maintain type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects have this type list flag. Driver objects

---

As indicated, if the extended information header is present, an object footer is allocated at the tail of the object body. Unlike object subheaders, the footer is a statically sized structure that is preallocated for all possible footer types. There are two such footers, described in Table 8-19.

TABLE 8-19 Conditions required for presence of object footer

<table><tr><td>Name</td><td>Condition</td></tr><tr><td>Handle Revocation Information</td><td>The object must be created with ObCreateObjectEx, passing in AllowHandleRevocation in the OB_EXTENDED_CREATION_INFO structure. File and Key objects are created this way.</td></tr><tr><td>Extended User Information</td><td>The object must be created with ObCreateObjectEx, passing in AllowExtendedUserInfo in the OB_EXTENDED_CREATION_INFO structure. Silo Context objects are created this way.</td></tr></table>


Finally, a number of attributes and/or flags determine the behavior of the object during creation

time or during certain operations. These flags are received by the Object Manager whenever any new

object is being created, in a structure called the object attributes. This structure defines the object

name, the root object directory where it should be inserted, the security descriptor for the object, and

the object attribute flags. Table 8-20 lists the various flags that can be associated with an object.

![Figure](figures/Winternals7thPt2_page_165_figure_004.png)

Note When an object is being created through an API in the Windows subsystem (such as CreateEvent or CreateFile), the caller does not specify any object attributes—the subsystem DLL performs the work behind the scenes. For this reason, all named objects created through Win32 go in the BaseNamedObjects directory, either the global or persession instance, because this is the root object directory that Kernelbase.dll specifies as part of the object attributes structure. More information on BaseNamedObjects and how it relates to the per-session namespace follows later in this chapter.

TABLE 8-20 Object flags

<table><tr><td>Attributes Flag</td><td>Header Flag Bit</td><td>Purpose</td></tr><tr><td>OBJ_INHERIT</td><td>Saved in the handle table entry</td><td>Determines whether the handle to the object will be inherited by child processes and whether a process can use DuplicateHandle to make a copy.</td></tr><tr><td>OBJ_PERMANENT</td><td>PermanentObject</td><td>Defines object retention behavior related to reference counts, described later.</td></tr><tr><td>OBJ_EXCLUSIVE</td><td>ExclusiveObject</td><td>Specifies that the object can be used only by the process that created it.</td></tr><tr><td>OBJ_CASE_INSENSITIVE</td><td>Not stored, used at run time</td><td>Specifies that lookups for this object in the namespace should be case insensitive. It can be overridden by the case insensitive flag in the object type.</td></tr><tr><td>OBJ_OPENIF</td><td>Not stored, used at run time</td><td>Specifies that a create operation for this object name should result in an open, if the object exists, instead of a failure.</td></tr><tr><td>OBJ_OPENLINK</td><td>Not stored, used at run time</td><td>Specifies that the Object Manager should open a handle to the symbolic link, not the target.</td></tr><tr><td>OBJ_KERNEL_HANDLE</td><td>KernelObject</td><td>Specifies that the handle to this object should be a kernel handle (more on this later).</td></tr></table>


134     CHAPTER 8    System mechanisms


---

<table><tr><td>Attributes Flag</td><td>Header Flag Bit</td><td>Purpose</td></tr><tr><td>OBJ_FORCE_ACCESS_CHECK</td><td>Not stored, used at run time</td><td>Specifies that even if the object is being opened from kernel mode, full access checks should be performed.</td></tr><tr><td>OBJ_KERNEL_EXCLUSIVE</td><td>KernelOnlyAccess</td><td>Disables any user-mode process from opening a handle to the object; used to protect the [Device] PhysicalMemory and [Win32xSessionGlobal] section objects.</td></tr><tr><td>OBJ_IGNORE_IMPERSONATED_DEVICEMAP</td><td>Not stored, used at run time</td><td>Indicates that when a token is being impersonated, the DOS Device Map of the source user should not be used, and the current impersonating process&#x27;s DOS Device Map should be maintained for object lookup. This is a security mitigation for certain types of file-based redirection attacks.</td></tr><tr><td>OBJ_DONT_REPARSE</td><td>Not stored, used at run time</td><td>Disables any kind of reparting situation (symbolic links, NTFS reparse points, registry key redirection), and returns STATUS_REPARSE_POINT EncOUNTERED if any such situation occurs. This is a security mitigation for certain types of path redirection attacks.</td></tr><tr><td>N/A</td><td>DefaultSecurityQuota</td><td>Specifies that the object&#x27;s security descriptor is using the default 2 KB quota.</td></tr><tr><td>N/A</td><td>SingleHandleEntry</td><td>Specifies that the handle information subheader contains only a single entry and not a database.</td></tr><tr><td>N/A</td><td>NewObject</td><td>Specifies that the object has been created but not yet inserted into the object namespace.</td></tr><tr><td>N/A</td><td>DeletedInline</td><td>Specifies that the object is not being deleted through the deferred deletion worker thread but rather inline through a call to ObDereferenceObjectEx.</td></tr></table>


In addition to an object header, each object has an object body whose format and contents are unique to its object type; all objects of the same type share the same object body format. By creating an object type and supplying services for it, an executive component can control the manipulation of data in all object bodies of that type. Because the object header has a static and well-known size, the Object Manager can easily look up the object header for an object simply by subtracting the size of the header from the pointer of the object. As explained earlier, to access the subheaders, the Object Manager subtracts yet another well-known value from the pointer of the object header. For the footer, the extended information subheader is used to find the pointer to the object footer.

Because of the standardized object header, footer, and subheader structures, the Object Manager is able to provide a small set of generic services that can operate on the attributes stored in any object header and can be used on objects of any type (although some generic services don't make sense for certain objects). These generic services, some of which the Windows subsystem makes available to Windows applications, are listed in Table 8-21.

Although all of these services are not generally implemented by most object types, they typically implement at least create, open, and basic management services. For example, the I/O system implements a create file service for its file objects, and the process manager implements a create process service for its process objects.

CHAPTER 8 System mechanisms 135


---

However, some objects may not directly expose such services and could be internally created as the result of some user operation. For example, when opening a WMI Data Block from user mode, a WmiGuid object is created, but no handle is exposed to the application for any kind of close or query services. The key thing to understand, however, is that there is no single generic creation routine.

Such a routine would have been quite complicated because the set of parameters required to initialize a file object, for example, differs markedly from what is required to initialize a process object. Also, the Object Manager would have incurred additional processing overhead each time a thread called an object service to determine the type of object the handle referred to and to call the appropriate version of the service.

TABLE 8-21 Generic object services

<table><tr><td>Service</td><td>Purpose</td></tr><tr><td>Close</td><td>Closes a handle to an object, if allowed (more on this later).</td></tr><tr><td>Duplicate</td><td>Shares an object by duplicating a handle and giving it to another process (if allowed, as described later).</td></tr><tr><td>Inheritance</td><td>If a handle is marked as inheritable, and a child process is spawned with handle inheritance enabled, this behaves like duplication for those handles.</td></tr><tr><td>Make permanent/temporary</td><td>Changes the retention of an object (described later).</td></tr><tr><td>Query object</td><td>Gets information about an object&#x27;s standard attributes and other details managed at the Object Manager level.</td></tr><tr><td>Query security</td><td>Gets an object&#x27;s security descriptor.</td></tr><tr><td>Set security</td><td>Changes the protection on an object.</td></tr><tr><td>Wait for a single object</td><td>Associates a wait block with one object, which can then synchronize a thread&#x27;s execution or be associated with an I/O completion port through a wait completion packet.</td></tr><tr><td>Signal an object and wait for another</td><td>Signals the object, performing wake semantics on the dispatcher object backing it, and then waits on a single object as per above. The wake/wait operation is done atomically from the scheduler&#x27;s perspective.</td></tr><tr><td>Wait for multiple objects</td><td>Associates a wait block with one or more objects, up to a limit (64), which can then synchronize a thread&#x27;s execution or be associated with an I/O completion port through a wait completion packet.</td></tr></table>


## Type objects

Object headers contain data that is common to all objects but that can take on different values for each instance of an object. For example, each object has a unique name and can have a unique security descriptor. However, objects also contain some data that remains constant for all objects of a particular type. For example, you can select from a set of access rights specific to a type of object when you open a handle to objects of that type. The executive supplies terminate and suspend access (among others) for thread objects and read, write, append, and delete access (among others) for file objects. Another example of an object-type-specific attribute is synchronization, which is described shortly.

To conserve memory, the Object Manager stores these static, object-type-specific attributes once when creating a new object type. It uses an object of its own, a type object, to record this data. As Figure 8-32 illustrates, if the object-tracking debug flag (described in the "Windows global flags"

136      CHAPTER 8    System mechanisms


---

section later in this chapter) is set, a type object also links together all objects of the same type (in this

case, the process type), allowing the Object Manager to find and enumerate them, if necessary. This

functionality takes advantage of the creator information subheader discussed previously.

![Figure](figures/Winternals7thPt2_page_168_figure_001.png)

FIGURE 8-32 Process objects and the process type object.

## EXPERIMENT: Viewing object headers and type objects

You can look at the process object type data structure in the kernel debugger by first identifying a process object with the dx @xcrussion.Process debugger data model command:

```bash
!kxd -d -r0 #&$cursurion.Processes[4].KernelObject
#$&cursurion.Processes[4].KernelObject
             : 0xffff898f0327d300 [Type: _EPROCESS "]
```

Then execute the !object command with the process object address as the argument:

```bash
!kb<object 0xxxxff8f0f3227d300
Object: ffff89f032f7300 Type: (ffffffff89f032954e0) Process
    ObjectHeader: ffff89f032f7300 (new version)
    HandleCount: 6 PointerCount: 215645
```

Notice that on 32-bit Windows, the object header starts 0x18 (24 decimal) bytes prior to the

start of the object body, and on 64-bit Windows, it starts 0x30 (48 decimal) bytes prior—the size

of the object header itself. You can view the object header with this command:

```bash
!kds dx (nt! OBJECT_HEADER*)0xffff8f89f02372d2d0
!nt_0BJECT_HEADER)0xffff8f89f02372d2d0      : 0xffff8f89f02372d2d0 [Type: _OBJECT_HEADER *]
  (+0x000) PointerCount :   ; 214943 [Type: ...int64]
  (+0x008) HandleCount :   ; 6 [Type: ...int64]
  (+0x008) NextToFree :   ; 0x6 [Type: void *]
  (+0x010) Lock       :   [Type: _EX_PUSH_LOCK]
  (+0x018) TypeIndex    : 0x93 [Type: unsigned char]
  (+0x019) TraceFlags    : 0x0 [Type: unsigned char]
  (+0x019) { 0: 0} DblgRefTrace     : 0x0 [Type: unsigned char]
```

---

```bash
{+0x019 ( 1: 1)) DbgTracePermanent : 0x0 [Type: unsigned char]
{+0x01a} InfoMask        : 0x80 [Type: unsigned char]
{+0x01b} Flags       : 0x2 [Type: unsigned char]
{+0x01b} ( 0: 0)) NewObject    : 0x0 [Type: unsigned char]
{+0x01b} ( 1: 1)) KernelObject   : 0x1 [Type: unsigned char]
{+0x01b} ( 2: 2)) KernelOnlyAccess : 0x0 [Type: unsigned char]
{+0x01b} ( 3: 3)) ExclusiveObject  : 0x0 [Type: unsigned char]
{+0x01b} ( 4: 4)) PermanentObject : 0x0 [Type: unsigned char]
{+0x01b} ( 5: 5)) DefaultSecurityQuota : 0x0 [Type: unsigned char]
{+0x01b} ( 6: 6)) SingleHandleEntry : 0x0 [Type: unsigned char]
{+0x01b} ( 7: 7)) DeletedInline    : 0x0 [Type: unsigned char]
{+0x01c} Reserved         : 0xffff898f [Type: unsigned long]
{+0x020} ObjectCreateInfo : 0xffff8f407ee65d00 [Type: OBJECT_CREATE_INFORMATION *]
{+0x020} QuotaBlockXharged : 0xffff8047ee65d00 [Type: void *]
{+0x028} SecurityDescriptor : 0xffff704ade03b6a [Type: void *]
{+0x030} Body             : [Type: .QUAD]
TokenType        : Process
UnderlyingObject [Type: _EPROCESS]
```

Now look at the object type data structure by copying the pointer that lobject showed you earlier:

```bash
!kdx dx (nt_OBJECT_TYPE)=0xffff898f032954e0
[nt_OBJECT_TYPE]=0xffff898f032954e0      : 0xffff898f032954e0 [Type:_OBJECT_TYPE_*]
[+0x000] TypeList        [Type:_LIST_ENTRY]
[+0x010] Name            : "Process" [Type:_UNICODE_STRING]
[+0x020] DefaultObject   : 0x0 [Type: void *]
[+0x028] Index           : 0x7 [Type: unsigned char]
[+0x02c] TotalNumberOfObjects : 0x2e9 [Type: unsigned long]
[+0x030] TotalNumberOfHandles : 0x15a1 [Type: unsigned long]
[+0x034] HighWaterNumberOfObjects : 0x2f9 [Type: unsigned long]
[+0x038] HighWaterNumberOfHandles : 0x170d [Type: unsigned long]
[+0x040] TypeInfo        [Type:_OBJECT_TYPE_INITIALLIZER]
[+0x0b8] TypeLock        [Type:_EX_PUSH_LOCK]
[+0x0c0] Key            : 0x636f2750 [Type: unsigned long]
[+0x0c8] CallbackList    [Type:_LIST_ENTRY]
```

The output shows that the object type structure includes the name of the object type, tracks the total number of active objects of that type, and tracks the peak number of handles and objects of that type. The CallbackList also keeps track of any Object Manager filtering callbacks that are associated with this object type. The TypeInfo field stores the data structure that keeps attributes, flags, and settings common to all objects of the object type as well as pointers to the object type's custom methods, which we'll describe shortly:

```bash
!kldx dx((nt1_OBJECT_TYPE)*0xfffff89F8012954e0)>TypeInfo
        <(nt1_OBJECT_TYPE)*0xfffff89F8012954e0)>-TypeInfo
        [Type: _OBJECT_TYPE_INITIALIZER]
        [+0x000] Length : 0x78 [Type: unsigned short]
        [+0x002] ObjectTypeFlags : 0xcx [Type: unsigned short]
        [+0x02 (0: 0)] CaseInsensitive : 0x0 [Type: unsigned char]
        [+0x002 (1: 1)] UnnamedObjectsOnly : 0x1 [Type: unsigned char]
        [+0x02 (2: 2)] UseDefaultObject : 0x0 [Type: unsigned char]
        [+0x002 (3: 3)] SecurityRequired : 0x1 [Type: unsigned char]
        [+0x02 (4: 4)] MaintainHandleCount : 0x0 [Type: unsigned char]
        [+0x002 (5: 5)] MaintainTypeList : 0x0 [Type: unsigned char]
```

---

[113,48,671,536] [112,559,671,614] [113,628,280,644] [446,958,670,974] [533,990,727,1006]

---

<table><tr><td>Attribute</td><td>Purpose</td></tr><tr><td>Retain access</td><td>Access rights that can never be removed by any third-party Object Manager callbacks (part of the callback list described earlier).</td></tr><tr><td>Flags</td><td>Indicate whether objects must never have names (such as process objects), whether their names are case-sensitive, whether they require a security descriptor, whether they should be cache aligned (requiring a padding subheader), whether they support object-filtering callbacks, and whether a handle database (handle information subhead) is needed to store data for each object to be maintained. The use default object flag also defines the behavior for the default object field shown later in this table. Finally, the use extended parameters flag enables usage of the extended parse procedure method, described later.</td></tr><tr><td>Object type code</td><td>Used to describe the type of object this is (versus comparing with a well-known name value). File objects set this to 1, synchronization objects set this to 2, and thread objects set this to 4. This field is also used by ALPC to store handle attribute information associated with a message.</td></tr><tr><td>Invalid attributes</td><td>Specifies object attribute flag (shown earlier in Table 8-20) that are invalid for this object type.</td></tr><tr><td>Default object</td><td>Specifies the internal Object Manager event that should be used during waits for this object, if the object type creator requested one. Note that certain objects, such as file objects and ALPC port objects already contain embedded dispatcher objects; in this case, this field is a flag that indicates that the following wait object mask/offset/pointer fields should be used instead.</td></tr><tr><td>Wait object flags, pointer, offset</td><td>Allows the Object Manager to generically locate the underlying kernel dispatcher object that should be used for synchronization when one of the generic wait services shown earlier (WaitForSingleObject, etc.) is called on the object.</td></tr><tr><td>Methods</td><td>One or more routines that the Object Manager calls automatically at certain points in an object&#x27;s lifetime or in response to certain user-mode calls.</td></tr></table>


Synchronization, one of the attributes visible to Windows applications, refers to a thread's ability to synchronize its execution by waiting for an object to change from one state to another. A thread can synchronize with executive job, process, thread, file, event, semaphore, mutex, timer, and many other different kinds of objects. Yet, other executive objects don't support synchronization. An object's ability to support synchronization is based on three possibilities:

- The executive object is a wrapper for a dispatcher object and contains a dispatcher header, a
kernel structure that is covered in the section "Low-IRQL synchronization" later in this chapter.
The creator of the object type requested a default object, and the Object Manager provided one.
The executive object has an embedded dispatcher object, such as an event somewhere inside
the object body, and the object's owner supplied its offset (or pointer) to the Object Manager
when registering the object type (described in Table 8-14).
## Object methods

The last attribute in Table 8-22, methods, comprises a set of internal routines that are similar to C++ constructors and destructors—that is, routines that are automatically called when an object is created or destroyed. The Object Manager extends this idea by calling an object method in other situations as well, such as when someone opens or closes a handle to an object or when someone attempts to change the protection on an object. Some object types specify methods whereas others don’t, depending on how the object type is to be used.

140   CHAPTER 8   System mechanisms


---

When an executive component creates a new object type, it can register one or more methods with the Object Manager. Thereafter, the Object Manager calls the methods at well-defined points in the lifetime of objects of that type, usually when an object is created, deleted, or modified in some way. The methods that the Object Manager supports are listed in Table 8-23.

TABLE 8-23 Object methods

<table><tr><td>Method</td><td>When Method Is Called</td></tr><tr><td>Open</td><td>When an object handle is created, opened, duplicated, or inherited</td></tr><tr><td>Close</td><td>When an object handle is closed</td></tr><tr><td>Delete</td><td>Before the Object Manager deletes an object</td></tr><tr><td>Query name</td><td>When a thread requests the name of an object</td></tr><tr><td>Parse</td><td>When the Object Manager is searching for an object name</td></tr><tr><td>Dump</td><td>Not used</td></tr><tr><td>Okay to close</td><td>When the Object Manager is instructed to close a handle</td></tr><tr><td>Security</td><td>When a process reads or changes the protection of an object, such as a file, that exists in a secondary object namespace</td></tr></table>


One of the reasons for these object methods is to address the fact that, as you've seen, certain object operations are generic (close, duplicate, security, and so on). Fully generalizing these generic routines would have required the designers of the Object Manager to anticipate all object types. Not only would this add extreme complexity to the kernel, but the routines to create an object type are actually exported by the kernel! Because this enables external kernel components to create their own object types, the kernel would be unable to anticipate potential custom behaviors. Although this functionality is not documented for driver developers, it is internally used by Pcw.sys, DxgkmI.sys, Win32k.sys, FltMgr.sys, and others, to define WindowStation, Desktop, PcwObject, DxgkT, FilterCommunication/ ConnectionPort, NdisCmState, and other objects. Through object-method extensibility, these drivers can define routines for handling operations such as delete and query.

Another reason for these methods is simply to allow a sort of virtual constructor and destructor mechanism in terms of managing an object’s lifetime. This allows an underlying component to perform additional actions during handle creation and closure, as well as during object destruction. They even allow prohibiting handle closure and creation, when such actions are undesired—for example, the protected process mechanism described in Part 1, Chapter 3, leverages a custom handle creation method to prevent less protected processes from opening handles to more protected ones. These methods also provide visibility into internal Object Manager APIs such as duplication and inheritance, which are delivered through generic services.

Finally, because these methods also override the parse and query name functionality, they can be used to implement a secondary namespace outside of the purview of the Object Manager. In fact, this is how File and Key objects work—their namespace is internally managed by the file system driver and the configuration manager, and the Object Manager only ever sees the \REGISTRY and \Device\HarddiskVolumeN object. A little later, we'll provide details and examples for each of these methods.

---

The Object Manager only calls routines if their pointer is not set to NULL in the type initializer—with one exception: the security routine, which defaults to SeDefaultObjectMethod. This routine does not need to know the internal structure of the object because it deals only with the security descriptor for the object, and you've seen that the pointer to the security descriptor is stored in the generic object header, not inside the object body. However, if an object does require its own additional security checks, it can define a custom security routine, which again comes into play with File and Key objects that store security information in a way that's managed by the file system or configuration manager directly.

The Object Manager calls the open method whenever it creates a handle to an object, which it does

when an object is created, opened, duplicated, or inherited. For example, the WindowStation and

Desktop objects provide an open method. Indeed, the WindowStation object type requires an open

method so that Win32k.sys can share a piece of memory with the process that serves as a desktop related memory pool.

An example of the use of a close method occurs in the I/O system. The I/O manager registers a close method for the file object type, and the Object Manager calls the close method each time it closes a file object handle. This close method checks whether the process that is closing the file handle owns any outstanding locks on the file and, if so, removes them. Checking for file locks isn’t something the Object Manager itself can or should do.

The Object Manager calls a delete method, if one is registered, before it deletes a temporary object

from memory. The memory manager, for example, registers a delete method for the section object

type that frees the physical pages being used by the section. It also verifies that any internal data struc tures the memory manager has allocated for a section are deleted before the section object is deleted.

Once again, the Object Manager can't do this work because it knows nothing about the internal work ings of the memory manager. Delete methods for other types of objects perform similar functions.

The parse method (and similarly, the query name method) allows the Object Manager to relinquish control of finding an object to a secondary Object Manager if it finds an object that exists outside the Object Manager namespace. When the Object Manager looks up an object name, it suspends its search when it encounters an object in the path that has an associated parse method. The Object Manager calls the parse method, passing to it the remainder of the object name it is looking for. There are two namespaces in Windows in addition to the Object Manager's: the registry namespace, which the configuration manager implements, and the file system namespace, which the I/O manager implements with the aid of file system drivers. (See Chapter 10 for more information on the configuration manager and Chapter 6 in Part 1 for more details about the I/O manager and file system drivers.)

For example, when a process opens a handle to the object named \Device\HarddiskVolume1\docs\ resume.doc, the Object Manager traverses its name tree until it reaches the device object named HarddiskVolume1. It sees that a parse method is associated with this object, and it calls the method, passing to it the rest of the object name it was searching for—in this case, the string docs\resume.doc. The parse method for device objects is an I/O routine because the I/O manager defines the device object type and registers a parse method for it. The I/O manager's parse routine takes the name string and passes it to the appropriate file system, which finds the file on the disk and opens it.

---

The security method, which the I/O system also uses, is similar to the parse method. It is called whenever a thread tries to query or change the security information protecting a file. This information is different for files than for other objects because security information is stored in the file itself rather than in memory. The I/O system therefore must be called to find the security information and read or change it.

Finally, the okay-to-close method is used as an additional layer of protection around the malicious—or incorrect—closing of handles being used for system purposes. For example, each process has a handle to the Desktop object or objects on which its thread or threads have windows visible. Under the standard security model, it is possible for those threads to close their handles to their desktops because the process has full control of its own objects. In this scenario, the threads end up without a desktop associated with them—a violation of the windowing model. Win32k.sys registers an okay-toclose routine for the Desktop and WindowStation objects to prevent this behavior.

## Object handles and the process handle table

When a process creates or opens an object by name, it receives a handle that represents its access

to the object. Referring to an object by its handle is faster than using its name because the Object

Manager can skip the name lookup and find the object directly. As briefly referenced earlier, processes

can also acquire handles to objects by inheriting handles at process creation time (if the creator speci fies the inherit handle flag on the CreateProcess call and the handle was marked as inheritable, either

at the time it was created or afterward by using the Windows SetHandleInformation function) or by

receiving a duplicated handle from another process. (See the Windows DuplicateHandle function.)

All user-mode processes must own a handle to an object before their threads can use the object. Using handles to manipulate system resources isn't a new idea. C and C++ run-time libraries, for example, return handles to opened files. Handles serve as indirect pointers to system resources; this indirection keeps application programs from fiddling directly with system data structures.

Object handles provide additional benefits. First, except for what they refer to, there is no difference between a file handle, an event handle, and a process handle. This similarity provides a consistent interface to reference objects, regardless of their type. Second, the Object Manager has the exclusive right to create handles and to locate an object that a handle refers to. This means that the Object Manager can scrutinize every user-mode action that affects an object to see whether the security profile of the caller allows the operation requested on the object in question.

---

![Figure](figures/Winternals7thPt2_page_175_figure_000.png)

Note Executive components and device drivers can access objects directly because they are running in kernel mode and therefore have access to the object structures in system memory. However, they must declare their usage of the object by incrementing the reference count so that the object won't be deallocated while it's still being used. (See the section "Object retention" later in this chapter for more details.) To successfully make use of this object, however, device drivers need to know the internal structure definition of the object, and this is not provided for most objects. Instead, device drivers are encouraged to use the appropriate kernel APIs to modify or read information from the object. For example, although device drivers can get a pointer to the Process object (EProcess), the structure is opaque, and the P* APIs must be used instead. For other objects, the type itself is opaque (such as most executive objects that wrap a dispatcher object—for example, events or mutexes). For these objects, drivers must use the same system calls that user-mode applications end up calling (such as ZwCreateEvent) and use handles instead of object pointers.

## EXPERIMENT: Viewing open handles

Run Process Explorer and make sure the lower pane is enabled and configured to show open handles. (Click on View, Lower Pane View, and then Handles.) Then open a command prompt and view the handle table for the new Cmd.exe process. You should see an open file handle to the current directory. For example, assuming the current directory is C\Users\Public, Process Explorer shows the following:

![Figure](figures/Winternals7thPt2_page_175_figure_004.png)

Now pause Process Explorer by pressing the spacebar or selecting View, Update Speed and choosing Pause. Then change the current directory with the cd command and press F5 to refresh the display. You will see in Process Explorer that the handle to the previous current directory is closed, and a new handle is opened to the new current directory. The previous handle is highlighted in red, and the new handle is highlighted in green.

---

Process Explorer's differences-highlighting feature makes it easy to see changes in the handle table. For example, if a process is leaking handles, viewing the handle table with Process Explorer can quickly show what handle or handles are being opened but not closed. (Typically, you see a long list of handles to the same object.) This information can help the programmer find the handle leak.

Resource Monitor also shows open handles to named handles for the processes you select by checking the boxes next to their names. The figure shows the command prompt's open handles:

![Figure](figures/Winternals7thPt2_page_176_figure_002.png)

You can also display the open handle table by using the command-line Handle tool from


Sysinternals. For example, note the following partial output of Handle when examining the file


object handles located in the handle table for a Cmd.exe process before and after changing

the directory. By default, Handle filters out non-file handles unless the -a switch is used, which

displays all the handles in the process, similar to Process Explorer.

```bash
C:\Users\alone>\system\handle.exe -p 8768 -a users
NTHandle v4.22 - Handle viewer
Copyright (C) 1997-2019 Mark Russinovich
Internet mirrors - www.marc Russinovich.com
cmd.exe      - p18768 - type: File        150: C:\Users\Public
```

CHAPTER 8    System mechanisms      145


---

An object handle is an index into a process-specific handle table, pointed to by the executive process (EPROCESS) block (described in Chapter 3 of Part 1). The index is multiplied by 4 (shifted 2 bits) to make room for per-handle bits that are used by certain API behaviors—for example, inhibiting notifications on I/O completion ports or changing how process debugging works. Therefore, the first handle index is 4, the second 8, and so on. Using handle 5, 6, or 7 simply redirects to the same object as handle 4, while 9, 10, and 11 would reference the same object as handle 8.

A process's handle table contains pointers to all the objects that the process currently has opened a handle to, and handle values are aggressively reused, such that the next new handle index will reuse an existing closed handle index if possible. Handle tables, as shown in Figure 8-33, are implemented as a three-level scheme, similar to the way that the legacy x86 memory management unit implemented virtual-to-physical address translation but with a cap of 24 bits for compatibility reasons, resulting in a maximum of 16,777,215 (224-1) handles per process. Figure 8-34 describes instead the handle table entry layout on Windows. To save on kernel memory costs, only the lowest-level handle table is allocated on process creation—the other levels are created as needed. The subhandle table consists of as many entries as will fit in a page minus one entry that is used for handle auditing. For example, for 64-bit systems, a page is 4096 bytes, divided by the size of a handle table entry (16 bytes), which is 256, minus 1, which is a total of 255 entries in the lowest-level handle table. The mid-level handle table contains a full page of pointers to subhandle tables, so the number of subhandle tables depends on the size of the page and the size of a pointer for the platform. Again using 64-bit systems as an example, this gives us 4096/8, or 512 entries. Due to the cap of 24 bits, only 32 entries are allowed in the top-level pointer table. If we multiply things together, we arrive at 32*512*255 or 16,711,680 handles.

![Figure](figures/Winternals7thPt2_page_177_figure_002.png)

FIGURE 8-33 Windows process handle table architecture.

---

## EXPERIMENT: Creating the maximum number of handles

The test program Testlimit from Sysinternals has an option to open handles to an object until it cannot open any more handles. You can use this to see how many handles can be created in a single process on your system. Because handle tables are allocated from paged pool, you might run out of paged pool before you hit the maximum number of handles that can be created in a single process. To see how many handles you can create on your system, follow these steps:

- 1. Download the Testlimit executable file corresponding to the 32-bit/64-bit Windows you
need from https://docs.microsoft.com/en-us/sysinternals/downloads/testlimit.

2. Run Process Explorer, click View, and then click System Information. Then click the
Memory tab. Notice the current and maximum size of paged pool. (To display the
maximum pool size values, Process Explorer must be configured properly to access the
symbols for the kernel image, Ntskrnl.exe.) Leave this system information display run-
ning so that you can see pool utilization when you run the Testlimit program.

3. Open a command prompt.

4. Run the Testlimit program with the -h switch (do this by typing testlimit -h). When
Testlimit fails to open a new handle, it displays the total number of handles it was able
to create. If the number is less than approximately 16 million, you are probably running
out of paged pool before hitting the theoretical per-process handle limit.

5. Close the Command Prompt window; doing this kills the Testlimit process, thus closing
all the open handles.
As shown in Figure 8-34, on 32-bit systems, each handle entry consists of a structure with two 32-bit members: a pointer to the object (with three flags consuming the bottom 3 bits, due to the fact that all objects are 8-byte aligned, and these bits can be assumed to be 0), and the granted access mask (out of which only 25 bits are needed, since generic rights are never stored in the handle entry) combined with two more flags and the reference usage count, which we describe shortly.

![Figure](figures/Winternals7thPt2_page_178_figure_004.png)

FIGURE 8-34 Structure of a 32-bit handle table entry.

---

On 64-bit systems, the same basic pieces of data are present but are encoded differently. For example, 44 bits are now needed to encode the object pointer (assuming a processor with four-level paging and 48-bits of virtual memory), since objects are 16-byte aligned, and thus the bottom four bits can now be assumed to be 0. This now allows encoding the "Protect from close" flag as part of the original three flags that were used on 32-bit systems as shown earlier, for a total of four flags. Another change is that the reference usage count is encoded in the remaining 16 bits next to the pointer, instead of next to the access mask. Finally, the "No rights upgrade" flag remains next to the access mask, but the remaining 6 bits are spare, and there are still 32-bits of alignment that are also currently spare, for a total of 16 bytes. And on LA57 systems with five levels of paging, things take yet another turn, where the pointer must now be 53 bits, reducing the usage count bits to only 7.

Since we mentioned a variety of flags, let's see what these do. First, the first flag is a lock bit, indicating whether the entry is currently in use. Technically, it's called "unlocked," meaning that you should expect the bottom bit to normally be set. The second flag is the inheritance designation—that is, it indicates whether processes created by this process will get a copy of this handle in their handle tables. As already noted, handle inheritance can be specified on handle creation or later with the SetHandleInformation function. The third flag indicates whether closing the object should generate an audit message. (This flag isn't exposed to Windows—the Object Manager uses it internally.) Next, the "Protect from close" bit indicates whether the caller is allowed to close this handle. (This flag can also be set with the SetHandleInformation function.) Finally, the "No rights upgrade" bit indicates whether access rights should be upgraded if the handle is duplicated to a process with higher privileges.

These last four flags are exposed to drivers through the OBJECT_HANDLE_INFORMATION structure

that is passed in to APIs such as ObReferenceObjectByHandle, and map to OBJ_INHERIT (0x2), OBJ_

AUDIT_OBJECT_CLOSE (0x4), OBJ_PROTECT_CLOSE (0x1), and OBJ_NO_RIGHTS_UPGRADE (0x8), which

happen to match exactly with "holes" in the earlier OBJ_attribute definitions that can be set when

creating an object. As such, the object attributes, at runtime, end up encoding both specific behaviors

of the object, as well as specific behaviors of a given handle to said object.

Finally, we mentioned the existence of a reference usage count in both the encoding of the pointer

count field of the object's header, as well as in the handle table entry. This handy feature encodes a

cached number (based on the number of available bits) of preexisting references as part of each handle

entry and then adds up the usage counts of all processes that have a handle to the object into the

pointer count of the object's header. As such, the pointer count is the number of handles, kernel refer ences through ObReferenceObject, and the number of cached references for each handle.

Each time a process finishes to use an object, by dereferencing one of its handles—basically by calling any Windows API that takes a handle as input and ends up converting it into an object—the cached number of references is dropped, which is to say that the usage count decreases by 1, until it reaches 0, at which point it is no longer tracked. This allows one to infer exactly the number of times a given object has been utilized/accessed/managed through a specific process's handle.

The debugger command trueref, when executed with the -v flag, uses this feature as a way to show each handle referencing an object and exactly how many times it was used (if you count the number of consumed/dropped usage counts). In one of the next experiments, you'll use this command to gain additional insight into an object's usage.

---

System components and device drivers often need to open handles to objects that user-mode applications shouldn't have access to or that simply shouldn't be tied to a specific process to begin with. This is done by creating handles in the kernel handle table (referenced internally with the name


ObpKernelHandleTable), which is associated with the System process. The handles in this table are accessible only from kernel mode and in any process context. This means that a kernel-mode function can reference the handle in any process context with no performance impact.

The Object Manager recognizes references to handles from the kernel handle table when the high bit of the handle is set—that is, when references to kernel-handle-table handles have values greater than 0x80000000 on 32-bit systems, or 0xFFFFFFF80000000 on 64-bit systems (since handles are defined as pointers from a data type perspective, the compiler forces sign-extension).

The kernel handle table also serves as the handle table for the System and minimal processes, and as such, all handles created by the System process (such as code running in system threads) are implicitly kernel handles because the ObpKernelHandleTable symbol is set the as ObjectTable of the EPROCESS structure for these processes. Theoretically, this means that a sufficiently privileged user-mode process could use the DuplicateHandle API to extract a kernel handle out into user mode, but this attack has been mitigated since Windows Vista with the introduction of protected processes, which were described in Part 1.

Furthermore, as a security mitigation, any handle created by a kernel driver, with the previous mode set to KernelMode, is automatically turned into a kernel handle in recent versions of Windows to prevent handles from inadvertently leaking to user space applications.

## EXPERIMENT: Viewing the handle table with the kernel debugger

The !handle command in the kernel debugger takes three arguments:

```bash
!handle <handle index> <flags> <processid>
```

The handle index identifies the handle entry in the handle table. (Zero means "display all handles.") The first handle is index 4, the second 8, and so on. For example, typing handle 4 shows the first handle for the current process.

The flags you can specify are a bitmask, where bit 0 means "display only the information in the handle entry," bit 1 means "display free handles (not just used handles)," and bit 2 means "display information about the object that the handle refers to." The following command displays full details about the handle table for process ID 0x1540:

```bash
!kdo !handle 0 7 1540
PROCESS ffff898f239ac440
SessionId: 0 Cid: 1540    Feb: 1ae33d000  ParentCid: 03c0
DirBase: 21e1d0000  ObjectTable: ffffc704b46dbd40  HandleCount: 641.
Image: com.docker.service
Handle table at ffffc704b46dbd40 with 641 entries in use
0004: Object at ffffc898f239589e0  GrantedAccess: 001f0003 (Protected) (Inherits) Entry
ffffc704b45f010
```

---

```bash
Object: ffff898f239589e0 Type: (ffff898f032e2560) Event
      ObjectHeader: ffff898f239589b0 (new version)
      HandleCount: 1 PointerCount: 32764
  0008: Object: ffff898f23869770 GrantedAccess: 00000804 (Audit) Entry: ffffc704b45ff020
      Object: ffff898f23869770 Type: (ffff898f033f7220) EtwRegistration
      ObjectHeader: ffff898f23869740 (new version)
      HandleCount: 1 PointerCount: 32764
```

Instead of having to remember what all these bits mean, and convert process IDs to hexa decimal, you can also use the debugger data model to access handles through the Io_Handles namespace of a process. For example, typing dx @$currprocess.io.Handles[4] will show the first handle for the current process, including the access rights and name, while the following command displays full details about the handles in PID 5440 (that is, 0x1540):

```bash
!kds dx -r2 $!cursession.Processes[5440].Io.Handles
  $!cursession.Processes[5440].Io.Handles
  [0x4]
        Handle       : 0x4
        Type          : Event
        GrantedAccess : Delete | ReadControl | WriteDac | WriteOwner | Synch |
  QueryState | ModifyState
        Object         [Type: _OBJECT_HEADER]
        [0x7]
        Handle       : 0x8
        Type          : EtwRegistration
        GrantedAccess  : Delete | ReadControl | WriteDac | WriteOwner | Synch |
        Object         [Type: _OBJECT_HEADER]
        [0xc]
        Handle       : 0xc
        Type          : Event
        GrantedAccess  : Delete | ReadControl | WriteDac | WriteOwner | Synch |
  QueryState | ModifyState
        Object         [Type: _OBJECT_HEADER]
```

You can use the debugger data model with a LINQ predicate to perform more interesting

searches, such as looking for named section object mappings that are Read/Write:

```bash
tkd << @Cursession.Processes[5440].Io.Handles.Where(h => (h.Type == "Section") && 
    (h.GrantedAccess.MapPath)& (h.GrantedAccess.MapPath)).Select(h => h.ObjectName)
  @Cursession.Processes[5440].Io.Handles.Where(h => (h.Type == "Section") && 
    (h.GrantedAccess.MapPath)& (h.GrantedAccess.MapPath)).Select(h => h.ObjectName)
             [0x16c]        : "Cor_Private_IPCBlock_v4_5440"
             [0x170]        : "Cor_SxPublic_IPCBlock"
             [0x354]        : "windows_shell_global_counters"
             [0x3b8]        : "UrlZonesMS_DESKTOP-SVLOTPS"
             [0x680]        : "NLS_CodePage_1252_3_2_0_0"
```

---

## EXPERIMENT: Searching for open files with the kernel debugger

Although you can use Process Hacker, Process Explorer, Handle, and the OpenFiles.exe utility to search for open file handles, these tools are not available when looking at a crash dump or analyzing a system remotely. You can instead use the !devhandles command to search for handles opened to files on a specific volume. (See Chapter 11 for more information on devices, files, and volumes.)

1. First you need to pick the drive letter you are interested in and obtain the pointer to its

Device object. You can use the lobject command as shown here:

```bash
!kd> \object \Globe1??C;
Object: ffffc704ae84970 Type: (ffffffff80f3295a60) SymbolicLink
   ObjectHeader: ffffc704ae84940 (new version)
    HandleCount: 0 PointerCount: 1
    Directory Object: ffffc704ade0ca0 Name: C:
     Flags: 00000000  (local )
    Target String is `Device\HarddiskVolume3'
    Drive Letter Index is 3 (C)
```

2. Next, use the lobject command to get the Device object of the target volume name:

```bash
1 : kb\ 0object    \DeviceHandle36x0Volume1
Object: FFFF89F0820F0 Type: (FFFFFF8000Ca0750) Device
```

3. Now you can use the pointer of the Device object with the !devhandles command. Each object shown points to a file:

```bash
1kcd :!devhandles 0xFFFF89F0820DBF0
Checking handle table for process 0xFFFF89F0327d300
Kernel handle table at ffffc704ade05580 with 7047 entries in use
PROCESS ffff898f0327d300
Sessionid: none Cid: 0004 Peb: 00000000 ParentCid: 0000
    DirBase: 001ad000 ObjectTable: ffffc704ade05580 HandleCount: 7023.
    Image: System
019c: Object: ffff898F08036a0 GrantedAccess: 0012019f (Protected) (Inherits)
(Audit) Entry: fffffc704ade28670
Object: ffff898F08036a0 Type: (ffff898f02f9820) File
ObjectHeader: ffff898F0803670 (new version)
        HandleCount: 1 PointerCount: 32767
        Directory Object: 00000000 Name: $\f$extend$\r$metadata$\t$XfLog\
                    $Txflog.fbl {HarddiskVolume4}
```

Although this extension works just fine, you probably noticed that it took about 30 seconds to a minute to begin seeing the first few handles. Instead, you can use the debugger data model to achieve the same effect with a LINQ predicate, which instantly starts returning results:

```bash
lkdx <- r2 @SCussres.ProcessProcesses.Select(p => p.Io.Handle.Where(h => 
h.Type == "File").Where(f => f.Object.UnderlyingObject.DeviceObject => 
(net.DCCE.OBJG.tvF99FF8A0E200FD).Select(f => 
f.obj.OBJG.tvF99FF8A0E200FD)).)
@SCussres.ProcessProcesses.Select(p => p.Io.Handle.Where(h => h.Type == "File").
```

CHAPTER 8    System mechanisms      151


---

```bash
<xref?f => f.Object.UnderlyingObject.DeviceObject == (nt)_DEVICE_OBJECT*)
  <xref:ff8080F082D00F0).Select(f => f.Object.UnderlyingObject.FileName))
    [0x01]
    [0x19c]      : \"<xtext:SRUMetadata>STxFlog(STflog.bld\" {Type: _UNICODE_STRING}
    [0x2dc]      : \"<xtext:SRUMetadata>STf:$130:$INDEX_ALLOCATION\" {Type: _UNICODE_STRING}
    [0x2e0]      : \"<xtext:SRUMetadata>STxFlog(STflogContainer000000000000000002"
                          {Type: _UNICODE_STRING}
```

## Reserve Objects

Because objects represent anything from events to files to interprocess messages, the ability for applications and kernel code to create objects is essential to the normal and desired runtime behavior of any piece of Windows code. If an object allocation fails, this usually causes anything from loss of functionality (the process cannot open a file) to data loss or crashes (the process cannot allocate a synchronization object). Worse, in certain situations, the reporting of errors that led to object creation failure might themselves require new objects to be allocated. Windows implements two special reserve objects to deal with such situations: the User APC reserve object and the I/O Completion packet reserve object. Note that the reserve-object mechanism is fully extensible, and future versions of Windows might add other reserve object types—from a broad view, the reserve object is a mechanism enabling any kernelmode data structure to be wrapped as an object (with an associated handle, name, and security) for later use.

As was discussed earlier in this chapter, APCs are used for operations such as suspension, termination, and I/O completion, as well as communication between user-mode applications that want to provide asynchronous callbacks. When a user-mode application requests a User APC to be targeted to another thread, it uses the QueueUserApc API in KernelBase.dll, which calls the INQueueApcThread system call. In the kernel, this system call attempts to allocate a piece of pooled pool in which to store the KAPC control object structure associated with an APC. In low-memory situations, this operation fails, preventing the delivery of the APC, which, depending on what the APC was used for, could cause loss of data or functionality.

To prevent this, the user-mode application, can, on startup, use the NtAllocateReserveObject sys tem call to request the kernel to preallocate the KAPC structure. Then the application uses a different sys tem call, NtQueueApcThreadEx, that contains an extra parameter that is used to store the handle to the reserve object. Instead of allocating a new structure, the kernel attempts to acquire the reserve object (by setting its InUse bit to true) and uses it until the KAPC object is not needed anymore, at which point the reserve object is released back to the system. Currently, to prevent mismanagement of system resources by third-party developers, the reserve object API is available only internally through system calls for operating system components. For example, the RPC library uses reserved APC objects to guarantee that asynchronous callbacks will still be able to return in low-memory situations.

A similar scenario can occur when applications need failure-free delivery of an I/O completion port

message or packet. T ypically, packets are sent with the PostQueuedCompletionStatus API in KernelBase.

dll, which calls the NtSetIoCompletion API. Like the user APC, the kernel must allocate an I/O manager

structure to contain the completion-packet information, and if this allocation fails, the packet cannot

152      CHAPTER 8    System mechanisms


---

be created. With reserve objects, the application can use the NtAllocateReserveObject API on startup to have the kernel preallocate the I/O completion packet, and the NtSetIoCompletionEx system call can be used to supply a handle to this reserve object, guaranteeing a successful path. Just like User APC reserve objects, this functionality is reserved for system components and is used both by the RPC library and the Windows Peer-To-Peer BranchCache service to guarantee completion of asynchronous I/O operations.

## Object security

When you open a file, you must specify whether you intend to read or to write. If you try to write to a file that is open for read access, you get an error. Likewise, in the executive, when a process creates an object or opens a handle to an existing object, the process must specify a set of desired access rights— that is, what it wants to do with the object. It can request either a set of standard access rights (such as read, write, and execute) that apply to all object types or specific access rights that vary depending on the object type. For example, the process can request delete access or append access to a file object. Similarly, it might require the ability to suspend or terminate a thread object.

When a process opens a handle to an object, the Object Manager calls the security reference monitor, the kernel-mode portion of the security system, sending it the process's set of desired access rights. The security reference monitor checks whether the object's security descriptor permits the type of access the process is requesting. If it does, the reference monitor returns a set of granted access rights that the process is allowed, and the Object Manager stores them in the object handle it creates. How the security system determines who gets access to which objects is explored in Chapter 7 of Part 1.

Thereafter, whenever the process's threads use the handle through a service call, the Object


Manager can quickly check whether the set of granted access rights stored in the handle corresponds

to the usage implied by the object service the threads have called. For example, if the caller asked for

read access to a section object but then calls a service to write to it, the service fails.

EXPERIMENT: Looking at object security

You can look at the various permissions on an object by using either Process Hacker, Process Explorer, WinObj, WinObjEx64, or AccessChk, which are all tools from Sysinternals or opensource tools available on GitHub. Let's look at different ways you can display the access control list (ACL) for an object:

- ■ You can use WinObj or WinObjiEx64 to navigate to any object on the system, including
object directories, right-click the object, and select Properties. For example, select the
BaseNamedObjects directory, select Properties, and click the Security tab. You should
see a dialog box like the one shown next. Because WinObjiEx64 supports a wider variety of
object types, you'll be able to use this dialog on a larger set of system resources.
By examining the settings in the dialog box, you can see that the Everyone group doesn't have delete access to the directory, for example, but the SYSTEM account does (because this is where session 0 services with SYSTEM privileges will store their objects).

---

![Figure](figures/Winternals7thPt2_page_185_figure_000.png)

- ■ Instead of using WinObj or WinObjCx64, you can view the handle table of a process using
Process Explorer, as shown in the experiment "Viewing open handles" earlier in this chapter,
or using Process Hacker, which has a similar view. Look at the handle table for the Explorer.exe
process. You should notice a Directory object handle to the \Sessions\nBaseNamedObjects
directory (where n is an arbitrary session number defined at boot time. We describe the
per-session namespace shortly.) You can double-click the object handle and then click the
Security tab and see a similar dialog box (with more users and rights granted).
■ Finally, you can use AccessChk to query the security information of any object by using the
-o switch as shown in the following output. Note that using AccessChk will also show you
the integrity level of the object. (See Chapter 7 of Part 1, for more information on integrity
levels and the security reference monitor.)
```bash
C:\sysnt\accesschk -o \Sessions\.\BaseNamedObjects
Accesschk v6.13 - Reports effective permissions for securable objects
Copyright (C) 2006-2020 Mark Russinovich
Sysinternals - www.sysinternals.com
\Sessions\.\BaseNamedObjects
  Type: Directory
  RW Window Manager\DCM-1
  RW NT AUTHORITY\SYSTEM
  RW DESKTOP-SVLOT?\aione
  RW DESKTOP-SVLOT?\aione-5-1-5-5-0-841005
  RW BUILTIN\Administrators
  R Everyone
      NT AUTHORITY\RESTRICTED
```

154      CHAPTER 8   System mechanisms


---

Windows also supports Ex (Extended) versions of the APIs—CreateEventEx, CreateMutexEx, CreateSemaphoreEx—that add another argument for specifying the access mask. This makes it possible for applications to use discretionary access control lists (DACLs) to properly secure their objects without breaking their ability to use the create object APIs to open a handle to them. You might be wondering why a client application would not simply use OpenEvent, which does support a desired access argument. Using the open object APIs leads to an inherent race condition when dealing with a failure in the open call—that is, when the client application has attempted to open the event before it has been created. In most applications of this kind, the open API is followed by a create API in the failure case. Unfortunately, there is no guaranteed way to make this create operation atomic—in other words, to occur only once.

Indeed, it would be possible for multiple threads and/or processes to have executed the create API concurrently, and all attempt to create the event at the same time. This race condition and the extra complexity required to try to handle it makes using the open object APIs an inappropriate solution to the problem, which is why the Ex APIs should be used instead.

## Object retention

There are two types of objects: temporary and permanent. Most objects are temporary—that is, they remain while they are in use and are freed when they are no longer needed. Permanent objects remain until they are explicitly freed. Because most objects are temporary, the rest of this section describes how the Object Manager implements object retention—that is, retaining temporary objects only as long as they are in use and then deleting them.

Because all user-mode processes that access an object must first open a handle to it, the Object Manager can easily track how many of these processes, and which ones, are using an object. Tracking these handles represents one part of implementing retention. The Object Manager implements object retention in two phases. The first phase is called name retention, and it is controlled by the number of open handles to an object that exists. Every time a process opens a handle to an object, the Object Manager increments the open handle counter in the object's header. As processes finish using the object and close their handles to it, the Object Manager decrements the open handle counter. When the counter drops to 0, the Object Manager deletes the object's name from its global namespace. This deletion prevents processes from opening a handle to the object.

The second phase of object retention is to stop retaining the objects themselves (that is, to delete

them) when they are no longer in use. Because operating system code usually accesses objects by us ing pointers instead of handles, the Object Manager must also record how many object pointers it has

dispensed to operating system processes. As we saw, it increments a reference count for an object each

time it gives out a pointer to the object, which is called the pointer count; when kernel-mode compo nents finish using the pointer, they call the Object Manager to decrement the object’s reference count.

The system also increments the reference count when it increments the handle count, and likewise dec rements the reference count when the handle count decrements because a handle is also a reference

to the object that must be tracked.

Finally, we also described usage reference count, which adds cached references to the pointer count

and is decremented each time a process uses a handle. The usage reference count has been added

CHAPTER 8    System mechanisms      155


---

since Windows 8 for performance reasons. When the kernel is asked to obtain the object pointer from its handle, it can do the resolution without acquiring the global handle table lock. This means that in newer versions of Windows, the handle table entry described in the "Object handles and the process handle table" section earlier in this chapter contains a usage reference counter, which is initialized the first time an application or a kernel driver uses the handle to the object. Note that in this context, the verb use refers to the act of resolving the object pointer from its handle, an operation performed in kernel by APIs like the ObReferenceObjectByHandle.

Let's explain the three counts through an example, like the one shown in Figure 8-35. The image represents two event objects that are in use in a 64-bit system. Process A creates the first event, obtaining a handle to it. The event has a name, which implies that the Object Manager inserts it in the correct directory object (BaseNamedObjects, for example), assigning an initial reference count to 2 and the handle count to 1. After initialization is complete, Process A waits on the first event, an operation that allows the kernel to use (or reference) the handle to it, which assigns the handle's usage reference count to 32,767 (0x7FF in hexadecimal, which sets 15 bits to 1). This value is added to the first event object's reference count, which is also increased by one, bringing the final value to 32,770 (while the handle count is still 1).

![Figure](figures/Winternals7thPt2_page_187_figure_002.png)

FIGURE 8-35 Handles and reference counts.

Process B initializes, creates the second named event, and signals it. The last operation uses (refer ences) the second event, allowing it also to reach a reference value of 32,770. Process B then opens

the first event (allocated by process A). The operation lets the kernel create a new handle (valid only

in the Process B address space), which adds both a handle count and reference count to the first event

object, bringing its counters to 2 and 32,771. (Remember, the new handle table entry still has its usage

reference count uninitialized.) Process B, before signaling the first event, uses its handle three times:

156      CHAPTER 8    System mechanisms


---

the first operation initializes the handle's usage reference count to 32,767. The value is added to the object's reference count, which is further increased by 1 unit, and reaches the overall value of 65,539. Subsequent operations on the handle simply decreases the usage reference count without touching the object's reference count. When the kernel finishes using an object, it always dereferences its pointer, though—an operation that releases a reference count on the kernel object. Thus, after the four uses (including the signaling operation), the first object reaches a handle count of 2 and reference count of 65,535. In addition, the first event is being referenced by some kernel-mode structure, which brings its final reference count to 65,536.

When a process closes a handle to an object (an operation that causes the NTClose routine to be executed in the kernel), the Object Manager knows that it needs to subtract the handle usage reference counter from the object's reference count. This allows the correct dereference of the handle. In the example, even if Processes A and B close their handles to the first object, the object would continue to exist because its reference count will become 1 (while its handle count would be 0). However, when Process B closes its handle to the second event object, the object would be deallocated, because its reference count reaches 0.

This behavior means that even after an object's open handle reaches 0, the object's reference count might remain positive, indicating that the operating system is still using the object in some way. Ultimately, it is only when the reference count drops to 0 that the Object Manager deletes the object from memory. This deletion has to respect certain rules and also requires cooperation from the caller in certain cases. For example, because objects can be present both in paged or nonpaged pool memory (depending on the settings located in their object types), if a dereference occurs at an IQL level of DISPATCH_LEVEL or higher this dereference causes the pointer count to drop to 0, the system would crash if it attempted to immediately free the memory of a paged-pool object. (In this scenario, the Object Manager performs a deferred delete operation, queuing the operation on a worker thread running through passive level of IQL 0). We'll describe more about system worker threads later in this chapter.

Another scenario that requires deferred deletion is when dealing with Kernel Transaction Manager (KTM) objects. In some scenarios, certain drivers might hold a lock related to this object, and attempting to delete the object will result in the system attempting to acquire this lock. However, the driver might never get the chance to release its lock, causing a deadlock. When dealing with KTM objects, driver developers must use ObDereferenceObjectDeleterDelete to force deferred deletion regardless of IQL level. Finally, the I/O manager also uses this mechanism as an optimization so that certain I/Os can complete more quickly, instead of waiting for the Object Manager to delete the object.

Because of the way object retention works, an application can ensure that an object and its name remain in memory simply by keeping a handle open to the object. Programmers who write applications that contain two or more cooperating processes need not be concerned that one process might delete an object before the other process has finished using it. In addition, closing an application's object handles won't cause an object to be deleted if the operating system is still using it. For example, one process might create a second process to execute a program in the background; it then immediately closes its handle to the process. Because the operating system needs the second process to run the program, it maintains a reference to its process object. Only when the background program finishes executing does the Object Manager decrement the second process's reference count and then delete.

CHAPTER 8 System mechanisms 157


---

Because object leaks can be dangerous to the system by leaking kernel pool memory and eventually causing systemwide memory starvation—and can break applications in subtle ways—Windows includes a number of debugging mechanisms that can be enabled to monitor, analyze, and debug issues with handles and objects. Additionally, WinDbg comes with two extensions that tap into these mechanisms and provide easy graphical analysis. Table 8-24 describes them.

TABLE 8-24 Debugging mechanisms for object handles

<table><tr><td>Mechanism</td><td>Enabled By</td><td>Kernel Debugger Extension</td></tr><tr><td>Handle Tracing Database</td><td>Kernel Stack Trace systemwide and/or per-process with the User Stack Trace option checked with Gflags.exe</td><td>\!trace &lt;handle value&gt; &lt;process ID&gt;</td></tr><tr><td>Object Reference Tracing</td><td>Per-process-name(s), or per-object-type-pool-tag(s), with Gflags.exe, under Object Reference Tracing</td><td>\!trace &lt;object pointer&gt;</td></tr><tr><td>Object Reference Tagging</td><td>Drivers must call appropriate API</td><td>N/A</td></tr></table>


Enabling the handle-tracing database is useful when attempting to understand the use of each handle within an application or the system context. The Ihtrace debugger extension can display the stack trace captured at the time a specified handle was opened. After you discover a handle leak, the stack trace can pinpoint the code that is creating the handle, and it can be analyzed for a missing call to a function such as CloseHandle.

The object-reference-tracing lobtrace extension monitors even more by showing the stack trace for each new handle created as well as each time a handle is referenced by the kernel (and each time it is opened, duplicated, or inherited) and dereferenced. By analyzing these patterns, misuse of an object at the system level can be more easily debugged. Additionally, these reference traces provide a way to understand the behavior of the system when dealing with certain objects. Tracing processes, for example, display references from all the drivers on the system that have registered callback notifications (such as Process Monitor) and help detect rogue or buggy third-party drivers that might be referencing handles in kernel mode but never dereferencing them.

![Figure](figures/Winternals7thPt2_page_189_figure_005.png)

Note When enabling object-reference tracing for a specific object type, you can obtain the name of its pool tag by looking at the key member of the OBJECT_TYPE structure when using the dx command. Each object type on the system has a global variable that references this structure—for example, PsProcessType. Alternatively, you can use the lobject command, which displays the pointer to this structure.

Unlike the previous two mechanisms, object-reference tagging is not a debugging feature that must be enabled with global flags or the debugger but rather a set of APIs that should be used by devicedriver developers to reference and dereference objects, including ObReferenceObjectWithTag and ObReferenceObjectWithTag. Similar to pool tagging (see Chapter 5 in Part 1 for more information on pool tagging), these APIs allow developers to supply a four-character tag identifying each reference/dereference pair. When using the labtrace extension just described, the tag for each reference or dereference operation is also shown, which avoids solely using the call stack as a mechanism to identify where leaks or underreferences might occur, especially if a given call is performed thousands of times by the driver.

158      CHAPTER 8    System mechanisms


---

## Resource accounting

Resource accounting, like object retention, is closely related to the use of object handles. A positive open handle count indicates that some process is using that resource. It also indicates that some process is being charged for the memory the object occupies. When an object's handle count and reference count drop to 0, the process that was using the object should no longer be charged for it.

Many operating systems use a quota system to limit processes' access to system resources. However, the types of quotas imposed on processes are sometimes diverse and complicated, and the code to track the quotas is spread throughout the operating system. For example, in some operating systems, an I/O component might record and limit the number of files a process can open, whereas a memory component might impose a limit on the amount of memory that a process's threads can allocate. A process component might limit users to some maximum number of new processes they can create or a maximum number of threads within a process. Each of these limits is tracked and enforced in different parts of the operating system.

In contrast, the Windows Object Manager provides a central facility for resource accounting. Each

object header contains an attribute called quota charges that records how much the Object Manager

subtracts from a process's allotted paged and/or nonpaged pool quota when a thread in the process

opens a handle to the object.

Each process on Windows points to a quota structure that records the limits and current values

for nonpaged-pool, paged-pool, and page-file usage. These quotas default to 0 (no limit) but can be

specified by modifying registry values. (You need to add/edit NonPagedPoolQuota, PagedPoolQuota,

and PagingFileQuota under HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory

Management.) Note that all the processes in an interactive session share the same quota block (and

there's no documented way to create processes with their own quota blocks).

## Object names

An important consideration in creating a multitude of objects is the need to devise a successful system for keeping track of them. The Object Manager requires the following information to help you do so:

- ■ A way to distinguish one object from another

■ A method for finding and retrieving a particular object
The first requirement is served by allowing names to be assigned to objects. This is an extension of

what most operating systems provide—the ability to name selected resources, files, pipes, or a block of

shared memory, for example. The executive, in contrast, allows any resource represented by an object

to have a name. The second requirement, finding and retrieving an object, is also satisfied by object

names. If the Object Manager stores objects by name, it can find an object by looking up its name.

Object names also satisfy a third requirement, which is to allow processes to share objects. The executive's object namespace is a global one, visible to all processes in the system. One process can create an object and place its name in the global namespace, and a second process can open a handle to the object by specifying the object's name. If an object isn't meant to be shared in this way, its creator doesn't need to give it a name.

---

To increase efficiency, the Object Manager doesn't look up an object's name each time someone uses the object. Instead, it looks up a name under only two circumstances. The first is when a process creates a named object: the Object Manager looks up the name to verify that it doesn't already exist before storing the new name in the global namespace. The second is when a process opens a handle to a named object: The Object Manager looks up the name, finds the object, and then returns an object handle to the caller; thereafter, the caller uses the handle to refer to the object. When looking up a name, the Object Manager allows the caller to select either a case-sensitive or case-insensitive search, a feature that supports Windows Subsystem for Linux (WSL) and other environments that use casesensitive file names.

## Object directories

The object directory object is the Object Manager's means for supporting this hierarchical naming structure. This object is analogous to a file system directory and contains the names of other objects, possibly even other object directories. The object directory object maintains enough information to translate these object names into pointers to the object headers of the objects themselves. The Object Manager uses the pointers to construct the object handles that it returns to user-mode callers. Both kernel-mode code (including executive components and device drivers) and user-mode code (such as subsystems) can create object directories in which to store objects.

Objects can be stored anywhere in the namespace, but certain object types will always appear in certain directories due to the fact they are created by a specialized component in a specific way. For example, the I/O manager creates an object directory named \Driver, which contains the names of objects representing loaded non-file-system kernel-mode drivers. Because the I/O manager is the only component responsible for the creation of Driver objects (through the IoCreateDriver API), only Driver objects should exist there.

Table 8-25 lists the standard object directories found on all Windows systems and what types of objects you can expect to see stored there. Of the directories listed, only \AppContainerNamedObjects, \BaseNamedObjects, and \Global?? are generically available for use by standard Win32 or UWP applications that stick to documented APIs. (See the "Session namespace" section later in this chapter for more information.)

TABLE 8-25 Standard object directories

<table><tr><td>Directory</td><td>Types of Object Names Stored</td></tr><tr><td>\AppContainerNamedObjects</td><td>Only present under the \Sessions object directory for non-Session 0 interactive sessions, contains the named kernel objects created by Win32 or UWP APIs from within processes that are running in an App Container.</td></tr><tr><td>\ArcName</td><td>Symbolic links mapping ARC-style paths to NT-style paths.</td></tr><tr><td>\BaseNamedObjects</td><td>Global mutexes, events, semaphores, waitable timers, jobs, ALPC ports, symbolic links, and section objects.</td></tr><tr><td>\Callback</td><td>Callback objects (which only drivers can create).</td></tr></table>


---

<table><tr><td>Directory</td><td>Types of Object Names Stored</td></tr><tr><td>\Driver</td><td>Device objects whose type is not "File System Driver" or "File System Recognizer" (SERVICE_FILE_SYSTEM_DRIVER or SERVICE_RECOGNIZER_DRIVER).</td></tr><tr><td>\DriverStore(s)</td><td>Symbolic links for locations where OS drivers can be installed and managed from. Typically, at least $SYSTEM$ which points to $SYSTEMRoot$, but can contain more entries on Windows 10x devices.</td></tr><tr><td>\FileSystem</td><td>File system driver objects ($SERVICE_FILE_SYSTEM_DRIVER$) and file-system recognizer ($SERVICE_RECOGNIZER_DRIVER$) driver and device objects. The Filter Manager also creates its own device objects under the Filesystems directory.</td></tr><tr><td>\GLOBAL??</td><td>Symbolic links objects that represent MS-DOS device names ($List\Directives()$ or $DosDevices&lt;sup&gt;a&lt;/sup&gt;$) Global directories are symbolic links to this directory.</td></tr><tr><td>\KernelObjects</td><td>Contains events objects that signal kernel pool resource conditions, the completion of certain operating system tasks, as well as session objects (at least $MemoryPartition()$) for each memory partition. Also contains the mutex used to synchronize access to the $Config$ process. The $Config$ process contains dynamic symbolic links that use a custom callback to refer to the correct partition for memory and commit resource conditions, and for memory error detection.</td></tr><tr><td>\KnownDlls</td><td>Section objects for the known DLLs mapped by $SSMS$ at startup time, and a symbolic link containing the path for known DLLs.</td></tr><tr><td>\KnownDlls32</td><td>On a 64-bit Windows installation, $KnownDlls$ contains the native $64-bit$ binaries, so this directory is used instead to store $WoW6432$-bit versions of those DLLs.</td></tr><tr><td>\NLS</td><td>Section objects for mapped national language support (NLS) tables.</td></tr><tr><td>\ObjectTypes</td><td>Object type objects for each object type created by $ObCreateObjectTypeEx$.</td></tr><tr><td>\RPC Control</td><td>ALPC ports created to represent remote procedure call ($RPCP$ endpoints) when Local RPC ($OLEXXXX$) port names and unnamed endpoints ($OLEXXXXX$ where $XXXX$ is a $r$-domly generated hexadecimal value).</td></tr><tr><td>\Security</td><td>ALPC ports and events used by objects specific to the security subsystem.</td></tr><tr><td>\Sessions</td><td>Per-session namespace directory. (See the next subsection.)</td></tr><tr><td>\Silo</td><td>If at least one Windows Server Container has been created, such as by using Docker for Windows with non-VM containers, contains object directories for each $Silo$ (the $ID$ of the root job for the container), which then contain the object namespace local to that $Silo$.</td></tr><tr><td>\UMDfCommunicationPorts</td><td>ALPC ports used by the User-Mode Driver Framework ($UMDF$).</td></tr><tr><td>\VmSharedMemory</td><td>Section objects used by virtualized instances ($VAIL$) of Win32x sys and other window manager components on Windows 10X devices when launching legacy Win32 applications. Also contains the Host object directory to represent the other side of the connection.</td></tr><tr><td>\Windows</td><td>Windows subsystem ALPC ports, shared section, and window stations in the Windows object directory. Desktop Window Manager ($DWM$) also stores this section, and shared sections in this directory, for non-Session $0$ services. Finally, stores the $Themes$ service section object.</td></tr></table>

CHAPTER 8 System mechanisms 161


---

Object names are global to a single computer (or to all processors on a multiprocessor computer), but they're not visible across a network. However, the Object Manager's parse method makes it possible to access named objects that exist on other computers. For example, the I/O manager, which supplies file-object services, extends the functions of the Object Manager to remote files. When asked to open a remote file object, the Object Manager calls a parse method, which allows the I/O manager to intercept the request and deliver it to a network redirector, a driver that accesses files across the network. Server code on the remote Windows system calls the Object Manager and the I/O manager on that system to find the file object and return the information back across the network.

Because the kernel objects created by non-app-container processes, through the Win32 and UWP API, such as mutexes, events, semaphores, writable timers, and sections, have their names stored in a single object directory, no two of these objects can have the same name, even if they are of a different type. This restriction emphasizes the need to choose names carefully so that they don’t collide with other names. For example, you could prefix names with a GUID and/or combine the name with the user’s security identifier (SID)—but even that would only help with a single instance of an application per user.

The issue with name collision may seem innocuous, but one security consideration to keep in mind when dealing with named objects is the possibility of malicious object name squatting. Although object names in different sessions are protected from each other, there's no standard protection inside the current session namespace that can be set with the standard Windows API. This makes it possible for an unprivileged application running in the same session as a privileged application to access its objects, as described earlier in the object security subsection. Unfortunately, even if the object creator used a proper DACL to secure the object, this doesn't help against the squatting attack, in which the unprivileged application creates the object before the privileged application, thus denying access to the legitimate application.

Windows exposes the concept of a private namespace to alleviate this issue. It allows user-mode applications to create object directories through the CreatePrivateNamespace API and associate these directories with boundary descriptors created by the CreateBoundaryDescriptor API, which are special data structures protecting the directories. These descriptors contain SIDs describing which security principals are allowed access to the object directory. In this manner, a privileged application can be sure that unprivileged applications will not be able to conduct a denial-of-service attack against its objects. (This doesn’t stop a privileged application from doing the same, however, but this point is moot.) Additionally, a boundary descriptor can also contain an integrity level, protecting objects possibly belonging to the same user account as the application based on the integrity level of the process. (See Chapter 7 of Part 1 for more information on integrity levels.)

One of the things that makes boundary descriptors effective mitigations against squatting attacks

is that unlike objects, the creator of a boundary descriptor must have access (through the SID and

integrity level) to the boundary descriptor. Therefore, an unprivileged application can only create an

unprivileged boundary descriptor. Similarly, when an application wants to open an object in a private

namespace, it must open the namespace using the same boundary descriptor that was used to create

it. Therefore, a privileged application or service would provide a privileged boundary descriptor, which

would not match the one created by the unprivileged application.

---

EXPERIMENT: Looking at the base named objects and private objects

You can see the list of base objects that have names with the WinObj tool from Sysinternals or with WinObjEx64. However, in this experiment, we use WinObjEx64 because it supports additional object types and because it can also show private namespaces. Run WinObjex64.exe, and click the BaseNamedObjects node in the tree, as shown here:

The named objects are listed on the right. The icons indicate the object type:

<table><tr><td>— Mutexes are indicated with a stop sign.</td></tr><tr><td>— Sections (Windows file-mapping objects) are shown as memory chips.</td></tr><tr><td>— Events are shown as exclamation points.</td></tr><tr><td>— Semaphores are indicated with an icon that resembles a traffic signal.</td></tr><tr><td>— Symbolic links have icons that are curved arrows.</td></tr><tr><td>— Folders indicate object directories.</td></tr><tr><td>— Power/network plugs represent ALPC ports.</td></tr><tr><td>— Timers are shown as Clocks.</td></tr><tr><td>— Other icons such as gears, locks, and chips are used for other object types.</td></tr></table>

CHAPTER 8 System mechanisms 163


---

Now use the Extras menu and select Private Namespaces. You'll see a list, such as the one shown here:

![Figure](figures/Winternals7thPt2_page_195_figure_001.png)

For each object, you'll see the name of the boundary descriptor (for example, the Installing

mutex is part of the LoadPerf boundary), and the SID(s) and integrity level associated with it (in

this case, no explicit integrity is set, and the SID is the one for the Administrators group). Note

that for this feature to work, you must have enabled kernel debugging on the machine the tool is

running on (either locally or remotely), as WinObjEx64 uses the WinDbg local kernel debugging

driver to read kernel memory.

---

## EXPERIMENT: Tampering with single instancing

Applications such as Windows Media Player and those in Microsoft Office are common examples of single-instancing enforcement through named objects. Notice that when launching the Wmplayer.exe executable, Windows Media Player appears only once—every other launch simply results in the window coming back into focus. You can tamper with the handle list by using Process Explorer to turn the computer into a media mixer! Here's how:

1. Launch Windows Media Player and Process Explorer to view the handle table (by clicking View, Lower Pane View, and then Handles). You should see a handle whose name contains Microsoft_WMP_70_CheckForOtherInstanceMutex, as shown in the figure.

![Figure](figures/Winternals7thPt2_page_196_figure_003.png)

2. Right-click the handle and select Close Handle. Confirm the action when asked. Note that Process Explorer should be started as Administrator to be able to close a handle in another process.

3. Run Windows Media Player again. Notice that this time a second process is created.

4. Go ahead and play a different song in each instance. You can also use the Sound Mixer

in the system tray (click the Volume icon) to select which of the two processes will have

greater volume, effectively creating a mixing environment.

Instead of closing a handle to a named object, an application could have run on its own before Windows Media Player and created an object with the same name. In this scenario, Windows Media Player would never run because it would be fooled into believing it was already running on the system.

---

## Symbolic links

In certain file systems (on NTFS, Linux, and macOS systems, for example), a symbolic link lets a user create a file name or a directory name that, when used, is translated by the operating system into a different file or directory name. Using a symbolic link is a simple method for allowing users to indirectly share a file or the contents of a directory, creating a cross-link between different directories in the ordinarily hierarchical directory structure.

The Object Manager implements an object called a symbolic link object, which performs a similar function for object names in its object namespace. A symbolic link can occur anywhere within an object name string. When a caller refers to a symbolic link object's name, the Object Manager traverses its object namespace until it reaches the symbolic link object. It looks inside the symbolic link and finds a string that it substitutes for the symbolic link name. It then restarts its name lookup.

One place in which the executive uses symbolic link objects is in translating MS-DOS-style device names into Windows internal device names. In Windows, a user refers to hard disk drives using the names C, D:, and so on, and serial ports as COM1, COM2, and so on. The Windows subsystem creates these symbolic link objects and places them in the Object Manager namespace under the [Global]? directory, which can also be done for additional drive letters through the DefineDosDevice API.

In some cases, the underlying target of the symbolic link is not static and may depend on the caller's context. For example, older versions of Windows had an event in the \KernelObjects directory called LowMemoryCondition, but due to the introduction of memory partitions (described in Chapter 5 of Part 1), the condition that the event signals are now dependent on which partition the caller is running in (and should have visibility of). As such, there is now a LowMemoryCondition event for each memory partition, and callers must be redirected to the correct event for their partition. This is achieved with a special flag on the object, the lack of a target string, and the existence of a symbolic link callback executed each time the link is parsed by the Object Manager. With WinObjEx64, you can see the registered callback, as shown in the screenshot in Figure 8-36 (you could also use the debugger by doing a lobject \KernelObjects\LowMemoryCondition command and then dumping the _OBJECT_ SYMBOLIC_LINK structure with the dx command.)

![Figure](figures/Winternals7thPt2_page_197_figure_005.png)

FIGURE 8-36 The LowMemoryCondition symbolic link redirection callback.

166      CHAPTER 8    System mechanisms


---

## Session namespace

Services have full access to the global namespace, a namespace that serves as the first instance of the namespace. Regular user applications then have read-write (but not delete) access to the global namespace (minus some exceptions we explain soon.) In turn, however, interactive user sessions are then given a session-private view of the namespace known as a local namespace. This namespace provides full read/write access to the base named objects by all applications running within that session and is also used to isolate certain Windows subsystem-specific objects, which are still privileged. The parts of the namespace that are localized for each session include {DosDevices, Windows, {baseNamedObjects, and {AppContainerNamedObjects.

Making separate copies of the same parts of the namespace is known as instancing the namespace.

Instancing iDosDevices makes it possible for each user to have different network drive letters and

Windows objects such as serial ports. On Windows, the global \DosDevices directory is named

\Global?? and is the directory to which \DosDevices points, and local \DosDevices directories are

identified by the logon session ID.

The Windows directory is where Win32k.sys inserts the interactive window station created by

Winlogon, \WinSta0. A Terminal Services environment can support multiple interactive users, but each

user needs an individual version of WinSta0 to preserve the illusion that he is accessing the predefined

interactive window station in Windows. Finally, regular Win32 applications and the system create

shared objects in \BaseNamedObjects, including events, mutexes, and memory sections. If two users

are running an application that creates a named object, each user session must have a private version

of the object so that the two instances of the application don't interfere with one another by access ing the same object. If the Win32 application is running under an AppContainer, however, or is a UWP

application, then the sandboxing mechanisms prevent it from accessing \BaseNamedObjects, and the

\AppDataContainerNamedObjects object directory is used instead, which then has further subdirectories

whose names correspond to the Package SID of the AppContainer (see Chapter 7 of Part 1, for more

information on\AppDataContainer and the Windows sandboxing model).

The Object Manager implements a local namespace by creating the private versions of the four

directories mentioned under a directory associated with the user's session under \Sessions\n (where

n is the session identifier). When a Windows application in remote session two creates a named

event, for example, the Win32 subsystem (as part of the BaseGetNamedObjectDirectory API in

KernelBase.dll) transparently redirects the object's name from \BaseNamedObjects to \Sessions\2\ BaseNamedObjects, or, in the case of an AppContainer, to \Sessions\2\AppDataContainerNamedObjects>

<PackageSID>\.

One more way through which name objects can be accessed is through a security feature called Base Named Object (BNO) isolation. Parent processes can launch a child with the ProcThreadAttribute

BnoIsolation process attribute (see Chapter 3 of Part 1 for more information on a process's startup attributes), supplying a custom object directory prefix. In turn, this makes KernelBase.dll create the directory and initial set of objects (such as symbolic links) to support it, and then have NtCreateUserProcess set the prefix (and related initial handles) in the Token object of the child process (specifically, in the BnoIsolationHandleEntry field) through the data in the native version of process attribute.

---

Later, BaseNamedObjectDirectory queries the Token object to check if BNO Isolation is enabled, and if so, it appends this prefix to any named object operation, such that {Sessions}2BaseNamedObjects will, for example, become {Sessions}1BaseNamedObjectsIsolationExample. This can be used to create a sort of sandbox for a process without having to use the AppContainer functionality.

All object-manager functions related to namespace management are aware of the instanced directories and participate in providing the illusion that all sessions use the same namespace. Windows subsystem DLLs prefix names passed by Windows applications that reference objects in the \DosDevices directory with ?? (for example, C:\Windows becomes ??C:\Windows). When the Object Manager sees the special \?/ prefix, the steps it takes depend on the version of Windows, but it always relies on a field named DeviceMap in the executive process object (EPROCESS, which is described further in Chapter 3 of Part 1) that points to a data structure shared by other processes in the same session.

The DosDevicesDirectory field of the DeviceMap structure points at the Object Manager directory

that represents the process' local \DosDevices. When the Object Manager sees a reference to \?, it

locates the process' local \DosDevices by using the DosDevicesDirectory field of the DeviceMap. If the

Object Manager doesn't find the object in that directory, it checks the DeviceMap field of the directory

object. If it's valid, it looks for the object in the directory pointed to by the GlobalDosDevicesDirectory

field of the DeviceMap structure, which is always \Global??.

Under certain circumstances, session-aware applications need to access objects in the global session even if the application is running in another session. The application might want to do this to synchronize with instances of itself running in other remote sessions or with the console session (that is, session 0). For these cases, the Object Manager provides the special override \Global that an application can prefix to any object name to access the global namespace. For example, an application in session two opening an object named \GlobalApplicationInitialized is directed to \BaseNamedObjects\ ApplicationInitialized instead of \Sessions\BaseNamedObjects\ApplicationInitialized.

An application that wants to access an object in the global \DosDevices directory does not need to use the \Global prefix as long as the object doesn't exist in its local \DosDevices directory. This is because the Object Manager automatically looks in the global directory for the object if it doesn't find it in the local directory. However, an application can force checking the global directory by using \GLOBALROOT.

Session directories are isolated from each other, but as mentioned earlier, regular user applications can create a global object with the \Global prefix. However, an important security mitigation exists: Section and symbolic link objects cannot be globally created unless the caller is running in Session 0 or if the caller possesses a special privilege named create global object, unless the object's name is part of an authorized list of "unsecured names," which is stored in HKLM\SYSTEM\CurrentControlSet\ Control\Session Manager\kernel, under the ObUnsecureGlobalNames value. By default, these names are usually listed:

- • netfxcustomperfcounters.1.0

• SharedPerfIPCBlock

• Cor_Private_IPCBlock

• Cor_Public_IPCBlock_
---

EXPERIMENT: Viewing namespace instancing

You can see the separation between the session 0 namespace and other session namespaces as soon as you log in. The reason you can is that the first console user is logged in to session 1 (while services run in session 0). Run WinOBJ.exe as Administrator and click the \Sessions directory. You'll see a subdirectory with a numeric name for each active session. If you open one of these directories, you'll see subdirectories named DosDevices, Windows, AppContainerNamedObjects, and BaseNamedObjects, which are the local namespace subdirectories of the session. The following figure shows a local namespace:

Next, run Process Explorer and select a process in your session (such as Explorer.exe), and then view the handle table (by clicking View, Lower Pane View, and then Handle). You should see a handle to \Windows\Process

---

### Object filtering

Windows includes a filtering model in the Object Manager, akin to the file system minifilter model and the registry callbacks mentioned in Chapter 10. One of the primary benefits of this filtering model is the ability to use the altitude concept that these existing filtering technologies use, which means that multiple drivers can filter Object Manager events at appropriate locations in the filtering stack. Additionally, drivers are permitted to intercept calls such as NTOpenThread and NTOpenProcess and even to modify the access masks being requested from the process manager. This allows protection against certain operations on an open handle—such as preventing a piece of malware from terminating a benevolent security process or stopping a password dumping application from obtaining read memory permissions on the LSA process. Note, however, that an open operation cannot be entirely blocked due to compatibility issues, such as making task Manager unable to query the command line or image name of a process.

Furthermore, drivers can take advantage of both pre and post callbacks, allowing them to prepare

for a certain operation before it occurs, as well as to react or finalize information after the operation

has occurred. These callbacks can be specified for each operation (currently, only open, create, and

duplicate are supported) and be specific for each object type (currently, only process, thread, and

desktop objects are supported). For each callback, drivers can specify their own internal context value,

which can be returned across all calls to the driver or across a pre/post pair. These callbacks can be

registered with the ObRegisterCallbacks API and unregistered with the ObUnregisterCallbacks API—it is

the responsibility of the driver to ensure deregistration happens.

Use of the APIs is restricted to images that have certain characteristics:

- The image must be signed, even on 32-bit computers, according to the same rules set forth in
the Kernel Mode Code Signing (KMCS) policy. The image must be compiled with the /integrity-
check linker flag, which sets the IMAGE_DLLCHARACTERISTICS_FORCE_INTEGRITY value in the
PE header. This instructs the memory manager to check the signature of the image regardless of
any other defaults that might not normally result in a check.

The image must be signed with a catalog containing cryptographic per-page hashes of the
executable code. This allows the system to detect changes to the image after it has been loaded
in memory.
Before executing a callback, the Object Manager calls the MmVerifyCallbackFunction on the target

function pointer, which in turn locates the loader data table entry associated with the module owning

this address and verifies whether the LDRP_IMAGE_INTEGRITY_FORCED flag is set.

