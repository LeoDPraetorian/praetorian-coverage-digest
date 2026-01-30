## Loaded module database

The loader maintains a list of all modules (DLLs as well as the primary executable) that have been loaded by a process. This information is stored in the PEB—namely, in a substructure identified by Ldr and called PEB_LDR_DATA. In the structure, the loader maintains three doubly linked lists, all containing the same information but ordered differently (either by load order, memory location, or initialization order). These lists contain structures called loader data table entries (LDR_DATA_TABLE_ENTRY) that store information about each module.

164   CHAPTER 3   Processes and jobs


---

Additionally, because lookups in linked lists are algorithmically expensive (being done in linear time), the loader also maintains two red-black trees, which are efficient binary lookup trees. The first is sorted by base address, while the second is sorted by the hash of the module's name. With these trees, the searching algorithm can run in logarithmic time, which is significantly more efficient and greatly speeds up process-creation performance in Windows 8 and later. This makes them harder to locate by shell code, unlike the linked lists, is not accessible in the PEB. This makes layout randomization (ASLR) is enabled. (See Chapter 5 for more on ASLR.)

Table 3-9 Fields in a loader data entry

<table><tr><td>Field</td><td>Meaning</td></tr><tr><td>BaseAddressIndexNode</td><td>Links this entry as a node in the Red-Black Tree sorted by base address.</td></tr><tr><td>BaseNameHashValue</td><td>The name of the module itself, without the full path. The second field stores its hash using RtlHashtCodeString.</td></tr><tr><td>DdagNode/NodeModuleLink</td><td>A pointer to the data structure tracking the distributed dependency graph (DDAG), which parallelizes dependency loading through the worker thread pool. The second field links the structure with the LDR_DATA_TABLE_ENTRAs associated with it (part of the same graph).</td></tr><tr><td>DllBase</td><td>Holds the base address at which the module was loaded.</td></tr><tr><td>EntryPoint</td><td>Contains the initial routine of the module (such as DllMain).</td></tr><tr><td>EntryPointActivationContext</td><td>Contains the SxS/Fusion activation context when calling initializers.</td></tr><tr><td>Flags</td><td>Loader state flags for this module (see Table 3-10 for a description of the flags).</td></tr><tr><td>ForwarderLinks</td><td>A linked list of modules that were loaded as a result of export table forwards from the module.</td></tr><tr><td>FullDllName</td><td>The fully qualified path name of the module.</td></tr><tr><td>HashLinks</td><td>A linked list used during process startup and shutdown for quicker lookup.</td></tr><tr><td>ImplicitPathOptions</td><td>Used to store path lookup flags that can be set with the LdrSetImplicitPathOptions API or that are inherited based on the DLL path.</td></tr><tr><td>List Entry Links</td><td>Links this entry into each of the three ordered lists part of the loader database.</td></tr><tr><td>LoadContext</td><td>Pointer to the current load information for the DLL. Typically NULL unless actively loaded.</td></tr><tr><td>ObsoleteLoadCount</td><td>A reference count for the module that is, how many times it has been moved to the DDAG node structure instead.</td></tr><tr><td>LoadReason</td><td>Contains an enumeration value that explains why this DLL was loaded (dynamically, as a forwarder, as a delay-load dependency, etc.).</td></tr><tr><td>LoadTime</td><td>Stores the system time value when this module was being loaded.</td></tr><tr><td>MappingInfoIndexNode</td><td>Links this entry as a node in the red-black tree sorted by the hash of the name.</td></tr><tr><td>OriginalBase</td><td>Stores the original base address (set by the linker) of this module, before ASLR or relocations, enabling faster processing of relocated import entries.</td></tr></table>

Continue...

CHAPTER 3 Processes and jobs 165


---

TABLE 3-9 Fields in a loader data table entry (continued)

<table><tr><td>Field</td><td>Meaning</td></tr><tr><td>ParentDllBase</td><td>In case of static (or forwarder, or delay-load) dependencies, stores the address of the DLL that has a dependency on this one.</td></tr><tr><td>SigningLevel</td><td>Stores the signature level of this image (see Chapter 8, Part 2, for more information on the Code Integrity infrastructure).</td></tr><tr><td>SizeOfImage</td><td>The size of the module in memory.</td></tr><tr><td>SwitchBackContext</td><td>Used by SwitchBack (described later) to store the current Windows context GUID associated with this module, and other data.</td></tr><tr><td>TimeDateStamp</td><td>A time stamp written by the linker when the module was linked, which the loader obtains from the module&#x27;s image PE header.</td></tr><tr><td>TlsIndex</td><td>The thread local storage slot associated with this module.</td></tr></table>


One way to look at a process's loader database is to use WinDbg and its formatted output of the

PEB. The next experiment shows you how to do this and how to look at the LDR_DATA_TABLE_ENTRY

structures on your own.

EXPERIMENT: Dumping the loaded modules database

Before starting the experiment, perform the same steps as in the previous two experiments

to launch Notepad.exe with WinDbg as the debugger. When you get to the initial breakpoint

(where you've been instructed to type g until now), follow these instructions:

1. You can look at the PEB of the current process with the !peb command. For now, you're interested only in the Ldr data that will be displayed.

```bash
0:000s !peb
PEB at 000000dd4c901000
    InheritedAddressSpace:   No
    ReadImageFileExecOptions: No
    BeingDebugged:         Yes
    ImageBaseAddress:        00007ff720b60000
    Ldr                  00007ffe855d23a0
    Ldr.Initialized:       Yes
    Ldr.InInitializationOrderModuleList: 0000022815d23d30 000022815d2430
    Ldr.InLoadOrderModuleList:     0000022815d23ee0 0000022815d1240
    Ldr.InMemoryOrderModuleList:     0000022815d23ef0 0000022815d31250
        Base TimeStamp        Module
        7ff720b60000 5789986a Jul 16 05:14:02 2016 C:\WINDOWS\System32\
notepad.exe
7ffe85480000 5825887f Nov 11 10:59:43 2016 C:\WINDOWS,System32\
ntdll.dll
7ffe84bd0000 57899a29 Jul 16 05:21:29 2016 C:\WINDOWS\System32\
KERNEL32.DLL
7ffe823c0000 582588e6 Nov 11 11:01:26 2016 C:\WINDOWS\System32\
KERNELBASE.dll
...
```

---

2. The address shown on the Ldr line is a pointer to the PEB_DLR_DATA structure described earlier. Notice that WinDbg shows you the address of the three lists, and dumps the initialization order list for you, displaying the full path, time stamp, and base address of each module.

3. You can also analyze each module entry on its own by going through the module list and then dumping the data at each address, formatted as a LDR_DATA_TABLE_ENTRY structure. Instead of doing this for each entry, however, WinDbg can do most of the work by using the !list extension and the following syntax:

!list -x "dt ntdll1\LR_DR_DATA_TABLE_ENTRY" @@C++(&@%peb->Ldr>InLoadOrderModuleList)

4. You should then see the entries for each module:

0x0000 InLoadOrderLinks : _LIST_ENTRY [ 0x00000228'15d23d10 0x00007fff'855d23b0 ] +0x010 InMemoryOrderLinks : _LIST_ENTRY [ 0x00000228'15d23d10 0x00007ffe'855d23c0 ] +0x020 InInitializationOrderLinks : _LIST_ENTRY [ 0x00000000'00000000 0x00000000'00000000 ] +0x030 DllBase : 0x00007fff'20b60000 Void +0x038 EntryPoint : 0x00007fff'20b787d0 Void +0x040 SizeOfImage : 0x41000 +0x048 FullDllName : _UNICODE_STRING "C:\Windows\System32\tenpad. exe" +0x058 BaseDllName : _UNICODE_STRING "notepad.exe" +0x068 FlagGroup : [4] "???" +0x068 Flags : 0xa2cc

Although this section covers the user-mode loader in Ntdll.dll, note that the kernel also employs its own loader for drivers and dependent DLLs, with a similar loader entry structure called KLDRL_DATA_ TABLE_ENTRY instead. Likewise, the kernel-mode loader has its own database of such entries, which is directly accessible through the PsaLoadedModuleList global data variable. To dump the kernel's loaded module database, you can use a similar !list command as shown in the preceding experiment by replacing the pointer at the end of the command with !t!PsaLoadedModuleList and using the new structure/ module name: !list -x "dt nt!_kldr_data_table_entry" nt!PsLoadedModuleList

Looking at the list in this raw format gives you some extra insight into the loader's internals, such as the F1ags field, which contains state information that !peb on its own would not show you. See Table 3-10 for their meaning. Because both the kernel and user-mode loaders use this structure, the meaning of the flags is not always the same. In this table, we explicitly cover the user-mode flags only (some of which may exist in the kernel structure as well).

CHAPTER 3 Processes and jobs 167


---

TABLE 3-10 Loader data table entry flags

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>Packaged Binary (0x1)</td><td>This module is part of a packaged application (it can only be set on the main module of an AppX package).</td></tr><tr><td>Marked for Removal (0x2)</td><td>This module will be unloaded as soon as all references (such as from an executing worker thread) are dropped.</td></tr><tr><td>Image DLL (0x4)</td><td>This module is an image DLL (and not a data DLL or executable).</td></tr><tr><td>Load Notifications Sent (0x8)</td><td>Registered DLL notification callouts were notified of this image already.</td></tr><tr><td>Telemetry Entry Processed (0x10)</td><td>Telemetry data has already been processed for this image.</td></tr><tr><td>Process Static Import (0x20)</td><td>This module is a static import of the main application binary.</td></tr><tr><td>In Legacy Lists (0x40)</td><td>This image entry is in the loader&#x27;s doubly linked lists.</td></tr><tr><td>In Indexes (0x80)</td><td>This image entry is in the loader&#x27;s red-black trees.</td></tr><tr><td>Shim DLL (0x100)</td><td>This image entry represents a DLL part of the shim engine/application compatibility database.</td></tr><tr><td>In Exception Table (0x200)</td><td>This module&#x27;s .pdata exception handlers have been captured in the loader&#x27;s inverted function table.</td></tr><tr><td>Load In Progress (0x800)</td><td>This module is currently being loaded.</td></tr><tr><td>Load Config Processed (0x1000)</td><td>This module&#x27;s image load configuration directory has been found and processed.</td></tr><tr><td>Entry Processed (0x2000)</td><td>The loader has fully finished processing this module.</td></tr><tr><td>Protect Delay Load (0x4000)</td><td>Control Flow Guard features for this binary have requested the protection of the delay-load IAT. See chapter 7 for more information.</td></tr><tr><td>Process Attach Called (0x20000)</td><td>The DLL_PROCESS_ATTACH notification has already been sent to the DLL.</td></tr><tr><td>Process Attach Failed (0x40000)</td><td>The DllMain routine of the DLL has failed the DLL_PROCESS_ATTACH notification.</td></tr><tr><td>Don&#x27;t Call for Threads (0x80000)</td><td>Do not send DLL_THREAD_ATTACH/DETACH notifications to this DLL. Can be set with D! sab1Thread.libaryCalls.</td></tr><tr><td>COR Deferred Validate (0x100000)</td><td>The Common Object Runtime (COR) will validate this .NET image at a later time.</td></tr><tr><td>COR Image (0x200000)</td><td>This module is a .NET application.</td></tr><tr><td>Don&#x27;t Relocate (0x400000)</td><td>This image should not be relocated or randomized.</td></tr><tr><td>COR IL Only (0x80000)</td><td>This is a .NET intermediate-language (IL)-only library, which does not contain native assembly code.</td></tr><tr><td>Compat Database Processed (0x40000000)</td><td>The shim engine has processed this DLL.</td></tr></table>


## Import parsing

Now that we've explained the way the loader keeps track of all the modules loaded for a process, you can continue analyzing the startup initialization tasks performed by the loader. During this step, the loader will do the following:

168    CHAPTER 3   Processes and jobs


---

- 1. Load each DLL referenced in the import table of the process's executable image.

2. Check whether the DLL has already been loaded by checking the module database. If it doesn't
find it in the list, the loader opens the DLL and maps it into memory.

3. During the mapping operation, the loader first looks at the various paths where it should at-
tempt to find this DLL, as well as whether this DLL is a known DLL, meaning that the system has
already loaded it at startup and provided a global memory mapped file for accessing it. Certain
deviations from the standard lookup algorithm can also occur, either through the use of a local
file (which forces the loader to use DLLs in the local path) or through a manifest file, which can
specify a redirected DLL to use to guarantee a specific version.

4. After the DLL has been found on disk and mapped, the loader checks whether the kernel has
loaded it somewhere else—this is called relocation. If the loader detects relocation, it parses
the relocation information in the DLL and performs the operations required. If no relocation
information is present, DLL loading fails.

5. The loader then creates a loader data table entry for this DLL and inserts it into the database.

6. After a DLL has been mapped, the process is repeated for this DLL to parse its import table and
all its dependencies.

7. After each DLL is loaded, the loader parses the IAT to look for specific functions that are being
imported. Usually this is done by name, but it can also be done by ordinal (an index number).
For each name, the loader parses the export table of the imported DLL and tries to locate a
match. If no match is found, the operation is aborted.

8. The import table of an image can also be bound. This means that at link time, the developers
already assigned static addresses pointing to imported functions in external DLLs. This removes
the need to do the lookup for each name, but it assumes that the DLLs the application will use
will always be located at the same address. Because Windows uses address space randomiza-
tion (see Chapter 5 for more information on ASLR), this is usually not the case for system ap-
plications and libraries.

9. The export table of an imported DLL can use a forwarder entry, meaning that the actual func-
tion is implemented in another DLL. This must essentially be treated like an import or depen-
dency, so after parsing the export table, each DLL referenced by a forwarder is also loaded and
the loader goes back to step 1.
After all imported DLLs (and their own dependencies, or imports) have been loaded, all the required imported functions have been looked up and found, and all forwarders also have been loaded and processed, the step is complete: All dependencies that were defined at compile time by the application and its various DLLs have now been fulfilled. During execution, delayed dependencies (called delay load), as well as run-time operations (such as calling LoadLibrary) can call into the loader and essentially repeat the same tasks. Note, however, that a failure in these steps will result in an error launching the application if they are done during process startup. For example, attempting to run an application that requires a function that isn’t present in the current version of the operating system can result in a message similar to the one in Figure 3-12.

CHAPTER 3 Processes and jobs     169


---

![Figure](figures/Winternals7thPt1_page_187_figure_000.png)

FIGURE 3-12 The dialog box shown when a required (imported) function is not present in a DLL.

## Post-import process initialization

After the required dependencies have been loaded, several initialization tasks must be performed to fully finalize launching the application. In this phase, the loader will do the following:

- 1. These steps begin with the LdrInitState variable set to 2, which means imports have loaded.

2. The initial debugger breakpoint will be hit when using a debugger such as WinDbg. This is

where you had to type g to continue execution in earlier experiments.

3. Check if this is a Windows subsystem application, in which case the BaseThreadInitThunk

function should've been captured in the early process initialization steps. At this point, it is

called and checked for success. Similarly, the TermsrvGetWindowsD1rectoryvl function, which

should have been captured earlier (if on a system which supports terminal services), is now

called, which resets the System and Windows directories path.

4. Using the distributed graph, recurse through all dependencies and run the initializers for all of

the images' static imports. This is the step that calls the D1Main routine for each DLL (allowing

each DLL to perform its own initialization work, which might even include loading new DLLs

at run time) as well as processes the TLS initializers of each DLL. This is one of the last steps in

which loading an application can fail. If all the loaded DLLs do not return a successful return

code after finishing their D1Main routines, the loader aborts starting the application.

5. If the image uses any TLS slots, call its TLS initializer.

6. Run the post-initialization shim engine callback if the module is being shimmed for application

compatibility.

7. Run the associated subsystem DLL post-process initialization routine registered in the PEB. For

Windows applications, this does Terminal Services-specific checks, for example.

8. At this point, write an ETW event indicating that the process has loaded successfully.

9. If there is a minimum stack commit, touch the thread stack to force an in-page of the committed

pages.

10. Set LdrInitState to 3, which means initialization done. Set the PEB's ProcessInitializing

field back to 0. Then, update the LdrpProcessInitialized variable.

CHAPTER 3 Processes and jobs

From the Library of
---

## SwitchBack

As each new version of Windows fixes bugs such as race conditions and incorrect parameter validation checks in existing API functions, an application-compatibility risk is created for each change, no matter how minor. Windows makes use of a technology called SwitchBack, implemented in the loader, which enables software developers to embed a GUID specific to the Windows version they are targeting in their executable's associated manifest.

For example, if a developer wants to take advantage of improvements added in Windows 10 to a given

API, she would include the Windows 10 GUID in her manifest, while if a developer has a legacy applica tion that depends on Windows 7-specific behavior, she would put the Windows 7 GUID in the manifest

instead.

SwitchBack parses this information and correlates it with embedded information in SwitchBackcompatible DLLs (in the .sb_data image section) to decide which version of an affected API should be called by the module. Because SwitchBack works at the loaded-module level, it enables a process to have both legacy and current DLLs concurrently calling the same API, yet observing different results.

## SwitchBack GUIDs

Windows currently defines GUIDs that represent compatibility settings for every version from Windows

Vista:

- • (e2011457-1546-43c5-a5fe-008dee03d3f0) for Windows Vista

• (35138b9a-5d96-4fbd-8e2d-a2440225f93a) for Windows 7

• (4a2f28e3-53b9-4441-ba9-c-d69d4a4a6e38) for Windows 8

• {1f676c76-80e1-4239-95bb-83d0f6d0da78} for Windows 8.1

• (8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a) for Windows 10
These GUIDs must be present in the application's manifest file under the <SupportedOS> element in the ID attribute in a compatibility attribute entry. (If the application manifest does not contain a GUID, Windows Vista is chosen as the default compatibility mode.) Using Task Manager, you can enable an Operating System Context column in the Details tab, which will show if any applications are running with a specific OS context (an empty value usually means they are operating in Windows 10 mode). Figure 3-13 shows an example of a few such applications, which are operating in Windows Vista and Windows 7 modes, even on a Windows 10 system.

Here is an example of a manifest entry that sets compatibility for Windows 10:

```bash
<compatibility xmlns="urn:schemas-microsoft-com:capability.v1">
<application>
  <!-- Windows 10 -->
  <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}" />
</application>
</compatibility>
```

CHAPTER 3 Processes and jobs      171


---

![Figure](figures/Winternals7thPt1_page_189_figure_000.png)

FIGURE 3-13 Some processes that run with compatibility modes.

## SwitchBack compatibility modes

As a few examples of what SwitchBack can do, here's what running under the Windows 7 context affects:

- ■ RPC components use the Windows thread pool instead of a private implementation.

■ DirectDraw Lock cannot be acquired on the primary buffer.

■ Blitting on the desktop is not allowed without a clipping window.

■ A race condition in GetOverlappedResult is fixed.

■ Calls to CreateFile are allowed to pass a "downgrade" flag to receive exclusive open to a file

even when the caller does not have write privilege, which causes NtCreateFile not to receive

the FILE_DISALLOW_EXCLUSIVE flag.
Running in Windows 10 mode, on the other hand, subtly affects how the Low Fragmentation Heap

(LFH) behaves, by forcing LFH sub-segments to be fully committed and padding all allocations with

a header block unless the Windows 10 GUID is present. Additionally, in Windows 10, using the Raise

Exception on Invalid Handle Close mitigation (see Chapter 7 for more information) will result in

CCloseHandle and RegCloseKey respecting the behavior. On the other hand, on previous operating

systems, if the debugger is not attached, this behavior will be disabled before calling NtClose, and

then re-enabled after the call.

---

As another example, the Spell Checking Facility will return NULL for languages which don't have a spell checker, while it returns an "empty" spell checker on Windows 8.1. Similarly, the implementation of the function IShellLn := Res31 will return E_INVALIDARG when operating in Windows 8 compatibility mode when given a relative path, but will not contain this check in Windows 7 mode.

Furthermore, calls to GetVersionEx or the equivalent functions in NTDll such as RtlVerifyVersionInfo will return the maximum version number that corresponds to the SwitchBack Context GUID that was specified.

![Figure](figures/Winternals7thPt1_page_190_figure_002.png)

Note: These APIs have been deprecated, and calls to GetVersion16 onX will return 6.2 on all versions of Windows 8 and later a higher Switch Back GUI is not provided.

### SwitchBack behavior

Whenever a Windows API is affected by changes that might break compatibility, the function's entry code calls the SbSwi tchProcedure to invoke the SwitchBack logic. It passes along a pointer to the

SwitchBack module table, which contains information about the SwitchBack mechanisms employed in the module. The table also contains a pointer to an array of entries for each SwitchBack point. This table contains a description of each branch-point that identifies it with a symbolic name and a comprehensive description, along with an associated mitigation tag. Typically, there will be several branch-points in a module, one for Windows Vista behavior, one for Windows 7 behavior, etc.

For each branch-point, the required SwitchBack context is given—it is this context that determines which of the two (or more) branches is taken at runtime. Finally, each of these descriptors contains a function pointer to the actual code that each branch should execute. If the application is running with the Windows 10 GUID, this will be part of its SwitchBack context, and the SbSelectProcedure API, upon parsing the module table, will perform a match operation. It finds the module entry descriptor for the context and proceeds to call the function pointer included in the descriptor.

SwitchBack uses ETW to trace the selection of given SwitchBack contexts and branch-points and feeds the data into the Windows API (Application Impact T elemetry) logger. This data can be periodically collected by Microsoft to determine the extent to which each compatibility entry is being used, identify the applications using it (a full stack trace is provided in the log), and notify third-party vendors.

As mentioned, the compatibility level of the application is stored in its manifest. At load time, the loader parses the manifest file, creates a context data structure, and caches it in the pHinData member of the PEB. This context data contains the associated compatibility GUIDs that this process is executing under and determines which version of the branch-points in the called APIs that employ SwitchBack will be executed.

## API Sets

While SwitchBack uses API redirection for specific application-compatibility scenarios, there is a much more pervasive redirection mechanism used in Windows for all applications, called API Sets. Its purpose

CHAPTER 3 Processes and jobs 173


---

is to enable fine-grained categorization of Windows APIs into sub-DLLs instead of having large multipurpose DLLs that span nearly thousands of APIs that might not be needed on all types of Windows systems today and in the future. This technology, developed mainly to support the refactoring of the bottom-most layers of the Windows architecture to separate it from higher layers, goes hand in hand with the breakdown of Kernel32.dll and Adap32.dll (among others) into multiple, virtual DLL files.

For example, Figure 3-14 shows a screenshot of Dependency Walker where Kernel32.dll, which is a core Windows library, imports from many other DLLs, beginning with API-MS-WIN. Each of these DLLs contains a small subset of the APIs that Kernel32 normally provides, but together they make up the entire API surface exposed by Kernel32.dll. The CORE-STRING library, for instance, provides only the Windows base string functions.

![Figure](figures/Winternals7thPt1_page_191_figure_002.png)

FIGURE 3-14 API sets for kernel32.dll.

In splitting functions across discrete files, two objectives are achieved. First, doing this allows future

applications to link only with the API libraries that provide the functionality that they need. Second, if

Microsoft were to create a version of Windows that did not support, for example, localization (say, a

non-user-facing, English-only embedded system), it would be possible to simply remove the sub-DLL

and modify the API Set schema. This would result in a smaller Kernel32 binary, and any applications

that ran without requiring localization would still run.

---

With this technology, a "base" Windows system called MinWin is defined (and, at the source level, built), with a minimum set of services that includes the kernel, core drivers (including file systems, basic system processes such as CSRSS and the Service Control Manager, and a handful of Windows services). Windows Embedded, with its Platform Builder, provides what might seem to be a similar technology, as system builders are able to remove select "Windows components," such as the shell, or the network stack. However, removing components from Windows leaves dangling dependencies—code paths that, if exercised, would fail because they depend on the removed components. MinWin's dependencies, on the other hand, are entirely self-contained.

When the process manager initializes, it calls the PspInitializeApiSetMap function, which is responsible for creating a section object of the API Set redirection table, which is stored in %SystemRoot%\System32\ApiSetSchema.dll. The DLL contains no executable code, but it has a section called .apiSet that contains API Set mapping data that maps virtual API Set DLLs to logical DLLs that implement the APIs. Whenever a new process starts, the process manager maps the section object into the process's address space and sets the ApiSetMap field in the process's PEB to point to the base address where the section object was mapped.

In turn, the loader's LdrAppMyFileNameRedirection function, which is normally responsible for the .local and SxS/Fusion manifest redirection that was mentioned earlier, also checks for API Set redirection data whenever a new import library that has a name starting with API- loads (either dynamically or statically). The API Set table is organized by library with each entry describing in which logical DLL the function can be found, and that DLL is what gets loaded. Although the schema data is a binary format, you can dump its strings with the Sysinternals Strings tool to see which DLLs are currently defined:

```bash
C:\Windows\System32\strings_apsetschema.dll
...
api-ms-oncoreuap-print-render-l1-1-0
printrenderapihost.dllapi-ms-oncoreuap-settingssync-status-l1-1-0
settingsynccore.dll
api-ms-win-apppmodel-identity-l1-2-0
kernel.appcore.dllapi-ms-win-apppmodel-runtime-internal-l1-1-3
api-ms-win-apppmodel-runtime-l1-1-2
api-ms-win-apppmodel-state-l1-1-2
api-ms-win-apppmodel-state-l1-2-0
api-ms-win-apppmodel-unlock-l1-1-0
api-ms-win-base-bootconfig-l1-1-0
advapi32.dllapi-ms-win-base-util-l1-1-0
api-ms-win-composition-redirection-l1-1-0
...
api-ms-win-core-com-mid!proxystub-l1-1-0
api-ms-win-core-com-private-l1-1-1
api-ms-win-core-comm-l1-1-0
api-ms-win-core-console-ansi-l2-1-0
api-ms-win-core-console-l1-1-0
api-ms-win-core-console-l2-1-0
api-ms-win-core-crt-l1-1-0
api-ms-win-core-crt-l2-1-0
api-ms-win-core-datetime-l1-1-2
api-ms-win-core-debug-l1-1-2
api-ms-win-core-debug-minidump-l1-1-0
```

CHAPTER 3 Processes and jobs   175


---

```bash
...
api-ms-win-core-firmware-11-1-0
api-ms-win-core-guard-11-1-0
api-ms-win-core-handle-11-1-0
api-ms-win-core-heap-11-1-0
api-ms-win-core-heap-11-2-0
api-ms-win-core-heap-12-1-0
api-ms-win-core-heap-obsolete-11-1-0
api-ms-win-core-interlocked-11-1-1
api-ms-win-core-interlocked-11-2-0
api-ms-win-core-io-11-1-1
api-ms-win-core-job-11-1-0
...
```

## Jobs

A job is a nameable, sealurable kernel object that allows control of one or more processes as a group. A job object's basic function is to allow groups of processes to be managed and manipulated as a unit. A process can be a member of any number of jobs, although the typical case is just one. A process's association with a job object can't be broken, and all processes created by the process and its descendants are associated with the same job object (unless child processes are created with the CREATE_BREAKAWAY_FROM_JOB flag and the job itself has not restricted it). The job object also records basic accounting information for all processes associated with the job and for all processes that were associated with the job but have since terminated.

Jobs can also be associated with an I/O completion port object, which other threads might be waiting for, with the Windows GetLastErrorCompletionStatus function or by using the Thread Pool API (the native function T pAllotJobNotification). This allows interested parties (typically the job creator) to monitor for limit violations and events that could affect the job's security, such as a new process being created or a process abnormally exiting.

Jobs play a significant role in a number of system mechanisms, enumerated here:

- ■ They manage modern apps (UWP processes), as discussed in more detail in Chapter 9 in Part 2.
In fact, every modern app is running under a job. You can verify this with Process Explorer, as
described in the "Viewing the job object" experiment later in this chapter.
■ They are used to implement Windows Container support, through a mechanism called server
silo, covered later in this section.
■ They are the primary way through which the Desktop Activity Moderator (DAM) manages
throttling, timer virtualization, timer freezing, and other idle-inducing behaviors for Win32
applications and services. The DAM is described in Chapter 8 in Part 2.
■ They allow the definition and management of scheduling groups for dynamic fair-share
scheduling (DFSS), which is described in Chapter 4.
176    CHAPTER 3   Processes and jobs


---

They allow for the specification of a custom memory partition, which enables usage of the Memory Partitioning API described in Chapter 5. They serve as a key enabler for features such as Run As (Secondary Logon), Application Boxing, and Program Compatibility Assistant. They provide part of the security sandbox for applications such as Google Chrome and Microsoft Office Document Converter, as well as mitigation from denial-of-service (DoS) attacks through Windows Management Instrumentation (WMI) requests.

Job limits

The following are some of the CPU-, memory-, and I/O-related limits you can specify for a job:

Maximum number of active processes This limits the number of concurrently existing processes in the job. If this limit is reached, new processes that should be assigned to the job are blocked from creation.

Job-wide user-mode CPU time limit This limits the maximum amount of user-mode CPU time that the processes in the job can consume (including processes that have run and exited). Once this limit is reached, by default all the processes in the job are terminated with an error code and no new processes can be created in the job (unless the limit is reset). The job object is signaled, so any threads waiting for the job will be released. You can change this default behavior with a call to SetInformationJobObject to set the EndOfJobTimeAction member of the JOBBJECT_END_OF_JOB_TIME_INFORMATION structure passed with the JobObjectEndOfJobTimeInformation information class and request a notification to be sent through the job's completion port instead.

Per-process user-mode CPU time limit This allows each process in the job to accumulate only a fixed maximum amount of user-mode CPU time. When the maximum is reached, the process terminates (with no chance to clean up).

Job processor affinity This sets the processor affinity mask for each process in the job. (Individual threads can alter their affinity to any subset of the job affinity, but processes can't alter their process affinity setting.)

Job group affinity This sets a list of groups to which the processes in the job can be assigned. Any affinity changes are then subject to the group selection imposed by the limit. This is treated as a group-aware version of the job processor affinity limit (legacy), and prevents that limit from being used.

Job process priority class This sets the priority class for each process in the job. Threads can't increase their priority relative to the class (as they normally can). Attempts to increase thread priority are ignored. (No error is returned on calls to SetThreadPriority, but the increase doesn't occur.)

CHAPTER 3 Processes and jobs 177


---

- Default working set minimum and maximum This defines the specified working set mini-
mum and maximum for each process in the job. (This setting isn't job-wide. Each process has its
own working set with the same minimum and maximum values.)

• Process and job committed virtual memory limit This defines the maximum amount of
virtual address space that can be committed by either a single process or the entire job.

• CPU rate control This defines the maximum amount of CPU time that the job is allowed to
use before it will experience forced throttling. This is used as part of the scheduling group sup-
port described in Chapter 4.

• Network bandwidth rate control This defines the maximum outgoing bandwidth for the
entire job before throttling takes effect. It also enables setting a differentiated services code
point (DSCP) tag for QoS purposes for each network packet sent by the job. This can only be set
for one job in a hierarchy, and affects the job and any child jobs.

• Disk I/O bandwidth rate control This is the same as network bandwidth rate control, but is
applied to disk I/O instead, and can control either bandwidth itself or the number of I/O opera-
tions per second (IOPS). It can be set either for a particular volume or for all volumes on the
system.
For many of these limits, the job owner can set specific thresholds, at which point a notification will be sent (or, if no notification is registered, the job will simply be killed). Additionally, rate controls allow for tolerance ranges and tolerance intervals—for example, allowing a process to go beyond 20 percent of its network bandwidth limit for up to 10 seconds every 5 minutes. These notifications are done by queuing an appropriate message to the I/O completion port for the job. (See the Windows SDK documentation for the details.)

Finally, you can place user-interface limits on processes in a job. Such limits include restricting

processes from opening handles to windows owned by threads outside the job, reading and/or writing

to the clipboard, and changing the many user-interface system parameters via the Windows System ParamsInfo function. These user-interface limits are managed by the Windows subsystem GDI/

USER driver. Win32k sys, and are enforced through one of the special callouts that it registers with the

process manager, the job callout. You can grant access for all processes in a job to specific user handles

(for example, window handle) by calling the USERand!eGrantAccess function; this can only be called

by a process that is not part of the job in question (naturally).

## Working with a job

A job object is created using the CreateJobObject API. The job is initially created empty of any

process. T o add a process to a job, call the AssignProcessToJobObject, which can be called multiple

times to add processes to the job or even to add the same process to multiple jobs. This last option

creates a nested job, described in the next section. Another way to add a process to a job is to manually

specify a handle to the job object by using the PS_CP_JOB_LTST process-creation attribute described

earlier in this chapter. One or more handles to job objects can be specified, which will all be joined.

178    CHAPTER 3   Processes and jobs


---

The most interesting API for jobs is SetInformationJobObject, which allows the setting of the

various limits and settings mentioned in the previous section, and contains internal information classes

used by mechanisms such as Containers (Silo), the DAM, or Windows UWP applications. These values

can be read back with QueryInformationJobObject, which can provide interested parties with the

limits set on a job. It's also necessary to call in case limit notifications have been set (as described in

the previous section) in order for the caller to know precisely which limits were violated. Another

sometimes-useful function is TerminateJobObject, which terminates all processes in the job (as if

TerminateProcess were called on each process).

## Nested jobs

Until Windows 7 and Windows Server 2008 R2, a process could only be associated with a single job, which made jobs less useful than they could be, as in some cases an application could not know in advance whether a process it needed to manage happened to be in a job or not. Starting with Windows 8 and Windows Server 2012, a process can be associated with multiple jobs, effectively creating a job hierarchy.

A child job holds a subset of processes of its parent job. Once a process is added to more than one job, the system tries to form a hierarchy, if possible. A current restriction is that jobs cannot form a hierarchy if any of them sets any UI limits (SetInformationJobObject with JobObjectBasicUIRestrictions argument).

Job limits for a child job cannot be more permissive than its parent, but they can be more restrictive. For example, if a parent job sets a memory limit of 100 MB for the job, any child job cannot set a higher memory limit (such requests simply fail). A child job can, however, set a more restrictive limit for its processes (and any child jobs it has), such as 80 MB. Any notifications that target the I/O completion port of a job will be sent to the job and all its ancestors. (The job itself does not have to have an I/O completion port for the notification to be sent to ancestor jobs.)

Resource accounting for a parent job includes the aggregated resources used by its direct managed

processes and all processes in child jobs. When a job is terminated (TerminateJobObject), all processes

in the job and in child jobs are terminated, starting with the child jobs at the bottom of the hierarchy.

Figure 3-15 shows four processes managed by a job hierarchy.

![Figure](figures/Winternals7thPt1_page_196_figure_006.png)

FIGURE 3-15   A job hierarchy.

---

To create this hierarchy, processes should be added to jobs from the root job. Here are a set of steps

to create this hierarchy:

- 1. Add process P1 to job 1.

2. Add process P1 to job 2. This creates the first nesting.

3. Add process P2 to job 1.

4. Add process P2 to job 3. This creates the second nesting.

5. Add process P3 to job 2.

6. Add process P4 to job 1.
## EXPERIMENT: Viewing the job object

You can view named job objects with the Performance Monitor tool. (Look for the Job Object

and Job Object Details categories.) You can view unnamed jobs with the kernel debugger !job

or dt !nt!_ejob commands.

To see whether a process is associated with a job, you can use the kernel debugger !process

command or Process Explorer. Follow these steps to create and view an unnamed job object:

1. From the command prompt, use the runas command to create a process running the command prompt (Cmd.exe). For example, type runas /user-<domain>×<username>.cmd.

2. You'll be prompted for your password. Enter your password, and a Command Prompt window will appear. The Windows service that executes runas commands creates an unnamed job to contain all processes (so that it can terminate these processes at logoff time).

3. Run Process Explorer, open the Options menu, choose Configure Colors, and check the Jobs entry. Notice that the Cmd.exe process and its child ConHost.exe process are highlighted as part of a job, as shown here:

![Figure](figures/Winternals7thPt1_page_197_figure_008.png)

4. Double click the Cmd.exe or ConHost.Exe process to open its properties dialog box.

Then click the Job tab to see information about the job this process is part of.

---

![Figure](figures/Winternals7thPt1_page_198_figure_000.png)

5. From the command prompt, run Notepad.exe.

6. Open Notepad's process and look at the Job tab. Notepad is running under the same job. This is because cmd.exe does not use the CREATE_BREAKAWAY_FROM_JOB creation flag. In the case of nested jobs, the Job tab shows the processes in the direct job this process belongs to and all processes in child jobs.

7. Run the kernel debugger on the live system and type the !process command to find the

notepad.exe and show its basic info:

```bash
!kd> !process 0 1 notepad.exe
PROCESS fffffe001eacf2080
    SessionId: 1 Cid: 3078    Peb: 7F4113b000  ParentCid: 05dc
        DirBase: 4878b3000 ObjectTable: fffffe0015b89fd80 HandleCount: 188.
        Image: notepad.exe
    ...
        BasePriority               8
        CommitCharge                671
        Job                          fffffe00189aec460
```

8. Note the Job pointer, which is non-zero. T o get a summary of the job, type the !job

debugger command:

```bash
!kds !job ffffe00189aec460
Job at ffffe00189aec460
  Basic Accounting Information
  TotalUserTime:           0x0x
  TotalKernelTime:         0x0x
  TotalCycleTime:          0x0x
  ThisPeriodTotalUserTime:  0x0x
  ThisPeriodTotalKernelTime:  0x0x
  TotalPageFaultCount:       0x0x
  TotalProcesses:          0x3
  ActiveProcesses:         0x3
```

---

```bash
FreezeCount:        0
  BackgroundCount:     0
  TotalTerminatedProcesses: 0x0
  PeakJobMemoryUsed:      0x10db
  PeakProcessMemoryUsed:     0xa56
  Job Flags
Limit Information (LimitFlags: 0x0)
Limit Information (EffectiveLimitFlags: 0x0)
```

9. Notice the ActiveProcesses member set to 3 (cmd.exe, conhost.exe, and notepad.exe).

You can use flag 2 after the !job command to see a list of the processes that are part of

the job:

```bash
!kds: !job fffffe00189aec460 2
...
Processes assigned to this job:
    PROCESS ffff8188084dd780
        SessionId: 1 Cid: 5720    Peb: 43bedb6000 ParentCid: 13cc
        DirBase: 707460600  ObjectTable: ffffbe0dc4e3a040 HandleCount:
<Data Not Accessible>      Image: cmd.exe
    PROCESS ffff8188ea077540
        SessionId: 1 Cid: 30ec    Peb: dd7f17c000 ParentCid: 5720
        DirBase: 75a183000  ObjectTable: ffffbe0dafb79040 HandleCount:
<Data Not Accessible>      Image: conhost.exe
    PROCESS ffff6e001eaef2080
        SessionId: 1 Cid: 3078    Peb: 7f4113b000 ParentCid: 05dc
        DirBase: 4878b3000  ObjectTable: ffffc0015b89fd80 HandleCount: 188.
        Image: notepad.exe
```

10. You can also use the dt command to display the job object and see the additional fields

shown about the job, such as its member level and its relations to other jobs in case of

nesting (parent job, siblings, and root job):

```bash
!kdt dt nt_ejob fffe00189aec460
    +0x000 Event        :  ..KEVENT
    +0x018 JobLinks      :  ..LIST_ENTRY [ 0xffff001'8d93e548 -
0xffff001'fd30f8d8
    +0x028 ProcessListHead :  ..LIST_ENTRY [ 0xffff001'8c4924f0 -
0xffff001'eaef24f0
    +0x038 JobLock       :  ..RESOURCE
    +0x0a0 TotalUserTime :  ..LARGE_INTEGER 0x0
    +0x0a0 TotalKernelTime :  ..LARGE_INTEGER 0x2625a
    +0x0b0 TotalCycleTime :  ..LARGE_INTEGER 0xc9e03d
    ...
    +0x0d4 TotalProcesses  :  4
    +0x0d8 ActiveProcesses :  3
    +0x0dc TotalTerminatedProcesses : 0
```

---

```bash
''''
+0x428 ParentJob        : (null)
+0x430 RootJob         : 0xffff001'89aec460 _EJOB
''''
+0x518 EnergyValues    : 0xffff001'89aec988 _PROCESS_ENERGY_VALUES
+0x520 SharedCommitCharge : 0x5e8
```

## Windows containers (server silos)

The rise of cheap, ubiquitous cloud computing has led to another major Internet revolution, in which building online services and/or back-end servers for mobile applications is as easy as clicking a button on one of the many cloud providers. But as competition among cloud providers has increased, and as the need to migrate from one to another, or even from a cloud provider to a datacenter, or from a datacenter to a high-end personal server, has grown, it has become increasingly important to have portable back ends, which can be deployed and moved around as needed without the costs associated with running them in a virtual machine.

It is to satisfy this need that technologies such as Docker were created. These technologies essentially allow the deployment of an "application in a box" from one Linux distribution to another without worrying about the complicated deployment of a local installation or the resource consumption of a virtual machine. Originally a Linux-only technology, Microsoft has helped bring Docker to Windows 10 as part of the Anniversary Update. It can work in two modes:

- ■ By deploying an application in a heavyweight, but fully isolated, Hyper-V container, which is
supported on both client and server scenarios

■ By deploying an application in a lightweight, OS-isolated, server silo container, which is
currently supported only in server scenarios due to licensing reasons
This latter technology, which we will investigate in this section, has resulted in deep changes in the

operating system to support this capability. Note that, as mentioned, the ability for client systems to

create server silo containers exists, but is currently disabled. Unlike a Hyper-V container, which lever ages a true virtualized environment, a server silo container provides a second "instance" of all user node components while running on top of the same kernel and drivers. At the cost of some security,

this provides a much more lightweight container environment.

### Job objects and silos

The ability to create a silo is associated with a number of undocumented subclasses as part of the

SetJobObjectInformation API. In other words, a silo is essentially a super-job, with additional rules

and capabilities beyond those we've seen so far. In fact, a job object can be used for the isolation and

resource management capabilities we've looked at as well as used to create a silo. Such jobs are called

hybrid jobs by the system.

---

In practice, job objects can actually host two types of silos: application silos (which are currently used

to implement the Desktop Bridge are not covered in this section, and are left for Chapter 9 in Part 2)

and server silos, which are the ones used for Docker container support.

## Silo isolation

The first element that defines a server silo is the existence of a custom object manager root directory object (\). (The object manager is discussed in Chapter 8 in Part 2.) Even though we have not yet learned about this mechanism, suffice it to say that all application-visible named objects (such as files, registry keys, events, mutexes, RPC ports, and more) are hosted in a root namespace, which allows applications to create, locate, and share these objects among themselves.

The ability for a server silo to have its own root means that all access to any named object can be controlled. This is done in one of three ways:

- By creating a new copy of an existing object to provide an alternate access to it from within the

silo

By creating a symbolic link to an existing object to provide direct access to it

By creating a brand-new object that only exists within the silo, such as the ones a containerized

application would use
This initial ability is then combined with the Virtual Machine Compute (Vmcompute) service (used by Docker), which interacts with additional components to provide a full isolation layer:

- ■ A base Windows image (WIM) file called base OS This provides a separate copy of the
operating system. At this time, Microsoft provides a Server Core image as well as a Nano Server
image.
■ The Ntdll.dll library of the host OS This overrides the one in the base OS image. This is
due to the fact that, as mentioned, server silos leverage the same host kernel and drivers, and
because Ntdll.dll handles system calls, it is the one user-mode component that must be reused
from the host OS.
■ A sandbox virtual file system provided by the Wcifs.sys filter driver This allows tempo-
rary changes to be made to the file system by the container without affecting the underlying
NTFS drive, and which can be wiped once the container is shut down.
■ A sandbox virtual registry provided by the VReg kernel component This allows for the
provision of a temporary set of registry hives (as well as another layer of namespace isolation, as
the object manager root namespace only isolates the root of the registry, not the registry hives
themselves).
■ The Session Manager (Smss.exe) This is now used to create additional service sessions or
console sessions, which is a new capability required by the container support. This extends
Smss to handle not only additional user sessions, but also sessions needed for each container
launched.
APITER 3 Processes and jobs
From the Library of I
---

The architecture of such containers with the preceding components is shown in Figure 3-16.

![Figure](figures/Winternals7thPt1_page_202_figure_001.png)

FIGURE 3-16 Containers architecture.

## Silo isolation boundaries

The aforementioned components provide the user-mode isolation environment. However, as the host


Ntdll.dll component is used, which talks to the host kernel and drivers, it is important to create addi tional isolation boundaries, which the kernel provides to differentiate one silo from another. As such,

each server silo will contain its own isolated:

- ■ Micro shared user data (SILO_USER_SHARED_DATA in the symbols) This contains the custom
system path, session ID, foreground PID, and product type/suite. These are elements of the
original KUSER_SHARED_DATA that cannot come from the host, as they reference information
relevant to the host OS image instead of the base OS image, which must be used instead. Vari-
ous components and APIs were modified to read the silo shared data instead of the user shared
data when they look up such data. Note that the original KUSER_SHARED_DATA remains at its
usual address with its original view of the host details, so this is one way that host state "leaks"
inside container state.
■ Object directory root namespace This has its own \SystemRoot symlink, \Device directory
(which is how all user-mode components access device drivers indirectly), device map and DOS
device mappings (which is how user-mode applications access network mapped drivers, for
example), \Sessions directory, and more.
■ API Set mapping This is based on the API Set schema of the base OS WIM, and not the one
stored on the host OS file system. As you've seen, the loader uses API Set mappings to deter-
mine which DLL, if any, implements a certain function. This can be different from one SKU to
another, and applications must see the base OS SKU, not the host's.
---

- ■ Logon session This is associated with the SYSTEM and Anonymous local unique ID (LUID), plus
the LUID of a virtual service account describing the user in the silo. This essentially represents the
token of the services and application that will be running inside the container service session
created by SMss. For more information on LUIDs and logon sessions, see Chapter 7.
■ ETW tracing and logger contexts These are for isolating ETW operations to the silo and not
exposing or leaking states between the containers and/or the host OS itself. (See Chapter 9 in
Part 2 for more on ETW.)
## Silo contexts

While these are the isolation boundaries provided by the core host OS kernel itself, other components

inside the kernel, as well as drivers (including third party), can add contextual data to silos by using

the PSCreateSiloContext API to set custom data associated with a silo or by associating an existing

object with a silo. Each such silo context will utilize a silo slot index that will be inserted in all running,

and future, server silos, storing a pointer to the context. The system provides 32 built-in system-wide

storage slot indexes, plus 256 expansion slots, providing lots of extensibility options.

As each server silo is created, it receives its own silo-local storage (SLS) array, much like a thread has thread-local storage (TLS). Within this array, the different entries will correspond to slot indices that have been allocated to store silo contexts. Each silo will have a different pointer at the same slot index, but will always store the same context at that index. (For example, driver "Foo" will own index 5 in all silos, and can use it to store a different pointer/context in each silo.) In some cases, built-in kernel components, such as the object manager, security reference monitor (SRM), and Configuration Manager use some of these slots, while other slots are used by inbox drivers (such as the Ancillary Function Driver for Winsock, Afd.sys).

Just like when dealing with the server silo shared user data, various components and APIs have been updated to access data by getting it from the relevant silo context instead of what used to be a global kernel variable. As an example, because each container will now host its own Lsass.exe process, and since the kernel's SRM needs to own a handle to the Lsass.exe process (see Chapter 7 for more information on Lsass and the SRM), this can no longer be a singleton stored in a global variable. As such, the handle is now accessed by the SRM through querying the silo context of the active server silo, and getting the variable from the data structure that is returned.

This leads to an interesting question: What happens with the Lsass.exe that is running on the host


OS itself? How will the SRM access the handle, as there's no server silo for this set of processes and

session (that is, session 0 itself)? To solve this conundrum, the kernel now implements a root host silo.

In other words, the host itself is presumed to be part of a silo as well! This isn't a silo in the true sense of

the word, but rather a clever trick to make querying silo contexts for the current silo work, even when

there is no current silo. This is implemented by storing a global kernel variable called P$hostSilo Globals, which has its own Silo Local Storage Array, as well as other silo contexts used by built-in

kernel components. When various silo APIs are called with a NULL pointer, this "NULL" is instead treated

as "no silo-i.e., use the host silo."

---

## EXPERIMENT: Dumping SRM silo context for the host silo

As shown, even though your Windows 10 system may not be hosting any server silos, especially if it is a client system, a host silo still exists, which contains the silo-aware isolated contexts used by the kernel. The Windows Debugger has an extension, lsilo, which can be used with the -g Host parameters as follows: lsilo -g Host. You should see output similar to the one below:

```bash
!kbd !silo -g Host
Server silo globals fffff801b73bc580:
                          Default Error Port: ffffb30f25b48080
                          ServiceSessionId :    0
                          Root Directory   :   00007fff0000000  ''
                          State        :    Running
```

In your output, the pointer to the silo globals should be hyperlinked, and clicking it will result

in the following command execution and output:

```bash
!kds dx = r1 {"(%1_ESERVERSILO_GLOBALS *)0xffffff801b73bc580)}
(*(%1_ESERVERSILO_GLOBALS *)0xffffff801b73bc580)                [Type: _
ESERVERSILO_GLOBALS]
    [+0x000]      ObS1oState        [Type: _OBP_SILODRIVERSTATE]
    [+0x2e0]      SeS1oState        [Type: _SEP_SILOSTATE]
    [+0x310]      SeMmS1oState       [Type: _SEP_RM_LSA_CONNECTION_STATE]
    [+0x360]      CmS1oState        : 0xfffff308870931b0 [Type: _CMP_SILO_CONTEXT *]
    [+0x368]      EtwSiloState       : 0xffffff30f236c4000 [Type: _ETW_SILODRIVERSTATE *]
...
```

Now click the SeRmS1loState field, which will expand to show you, among other things, a pointer to the Lsas.exe process.

```bash
!kdx = dx - r1((tkntrlmgrl)_SEP_RM_LSA_CONNECTION_STATE *)0xffffff8017b3c890)
((tkntrlmgrl)_SEP_RM_LSA_CONNECTION_STATE ) 0xffffff8017b3c890)
0xffffff8017b3c890 Type: [SEP_RM_LSA_CONNECTION_STATE *]
 [-0x000] LsaProcessHandle : 0xffffff80000870 [Type: void *]
 [-0x008] LsaCommandPortHandle : 0xffffff8F000087c [Type: void *]
 [-0x010] SepRmThreadHandle : 0x0 [Type: void *]
 [-0x018] RmCommandPortHandle : 0xffffff8f0000874 [Type: void *]
```

## Silo monitors

If kernel drivers have the capability to add their own silo contexts, how do they first know what silos are executing, and what new silos are created as containers are launched? The answer lies in the silo monitor facility, which provides a set of APIs to receive notifications whenever a server silo is created and/ or terminated (PSRegisterSiloMonitor, PStartSiloMonitor, PSUnregisterSiloMonitor), as well as notifications for any already-existing silos. Then, each silo monitor can retrieve its own slot index by calling PGetSiloMonitorContextSlot, which it can then use with the PInsertSiloContext, PReplaceSiloContext, and PRemoveSiloContext functions as needed. Additional slots can be allocated with PAllocSiloContextSlot, but this would be needed only if a component would wish to store two contexts for some reason. Additionally, drivers can also use the PInsertPermanentSiloContext or

CHAPTER 3 Processes and jobs      187


---

PSMakeSiloContextPermanent APIs to use "permanent" silo contexts, which are not reference counted

and are not tied to the lifetime of the server silo or the number of silo context getters. Once inserted, such

silo contexts can be retrieved with PSGetSiloContext and/or PGetPermanentSiloContext.

## EXPERIMENT: Silo monitors and contexts

To understand how silo monitors are used, and how they store silo contexts, let's take a look at the Ancillary Function Driver for Winsock (Afd.sys) and its monitor. First, let's dump the data structure that represents the monitor. Unfortunately, it is not in the symbol files, so we must do this as raw data.

```bash
!kds: dps poi(afd!AfdPodMonitor)
    ffffe387'a79fc120  ffffe387'a7d760c0
    ffffe387'a79fc128  ffffe387'a7b54b60
    ffffe387'a79fc130  00000009'0000101
    ffffe387'a79fc138  ffffee807'be4be510 afd!AfdPodSiloCreateCallback
    ffffe387'a79fc140  ffffee807'be4bee40 afd!AfdPodSiloTerminateCallback
```

Now get the slot (9 in this example) from the host silo. Silo stores their SLS in a field called Storage, which contains an array of data structures (slot entries), each storing a pointer, and some flags. We are multiplying the index by 2 to get the offset of the right slot entry, then accessing the second field (+1) to get the pointer to the context pointer.

```bash
!kd- r? @t0 = (nt1_ESERVERSIO_GLOBALS)*@0masm(nt1PsHostSiloGlobals)
!kd- ?? ((void**@)@t0->Storage)[9 * 2 + 1]
void ** 0xffff988f*ab185941
```

Note that the permanent flag (0x2) is ORed into the pointer, mask it out, and then use the

!object extension to confirm that this is truly a silo context.

```bash
1kb!__object((FFFFF88fa8b15941 & -2)
Object: ffff9ff8fa8b15940 Type: (FFFFf88faac9f20) PsSi1oContextNonPaged
```

## Creation of a server silo

When a server silo is created, a job object is first used, because as mentioned, silos are a feature of job objects. This is done through the standard CreateJobObject API, which was modified as part of the Anniversary Update to now have an associated job ID, or JID. The JID comes from the same pool of numbers as the process and thread ID (PID and TID), which is the client ID (CID) table. As such, a JID is unique among not only other jobs, but also other processes and threads. Additionally, a container GUID is automatically created.

Next, the SetInformationJobObject API is used, with the create silo information class. This results

in the S1To flag being set inside of the EJOB executive object that represents the job, as well as the allocation of the SLS slot array we saw earlier in the Storage member of EJOB. At this point, we have an

application silo.

---

After this, the root object directory namespace is created with another information class and call to SetInformationJobObject. This new class requires the trusted computing base (TCB) privilege. As silos are normally created only by the Vmcompute service, this is to ensure that virtual object namespaces are not used maliciously to confuse applications and potentially break them. When this namespace is created, the object manager creates or opens a new Silos directory under the real host root (\) and appends the JID to create a new virtual root (e.g., \Silos148\). It then creates the Kernel1Objects, ObjectTypes, GLOBALROOT, and DosDevices objects. The root is then stored as a silo context with whatever slot index is in PsObjectDirectorySiloContextSlot, which was allocated by the object manager at boot.

The next step is to convert this silo into a server silo, which is done with yet another call to Set InformationJobObject and another information class. The PspConvertSiloToServerSilo function

in the kernel now runs, which initializes the ESERVERSILO_GLOBALS structure we saw earlier as part of

the experiment dumping the PSpHostSiloGlobalS with the silo command. This initializes the silo

shared user data, API Set mapping, SystemRoot, and the various silo contexts, such as the one used

by the SRM to identify the Lsass.exe process. While conversion is in progress, silo monitors that have

registered and started their callbacks will now receive a notification, such that they can add their own

silo context data.

The final step, then, is to "boot up" the server silo by initializing a new service session for it. You can think of this as session 0, but for the server silo. This is done through an ALPC message sent to Smss


SmApl Port, which contains a handle to the job object created by Vmcompute, which has now become a server silo job object. Just like when creating a real user session, Smss will clone a copy of itself, except this time, the clone will be associated with the job object at creation time. This will attach this new


Smss copy to all the containerized elements of the server silo. Smss will believe this is session 0, and will perform its usual duties, such as launching Cssr.exe, Wininit.exe, Lsass.exe, etc. The "boot-up" process will continue as normal, with Wininit.exe then launching the Service Control Manager (Services.exe), which will then launch all the automatic start services, and so on. New applications can now execute in the server silo, which will run with a logon session associated with a virtual service account LUID, as described earlier.

## Ancillary functionality

You may have noticed that the short description we've seen so far would obviously not result in this

"boot" process actually succeeding. For example, as part of its initialization, it will want to create a

named pipe called ntsvc, which will require communicating with \Device\NamedPipe, or as Services.

exe sees it, \Silos\UID\Device\NamedPipe. But no such device object exists!

As such, in order for device driver access to function, drivers must be enlightened and register their

own silo monitors, which will then use the notifications to create their own per-silo device objects. The

kernel provides an API, PSetattachSilloToCurrentThread (and matching PSetattachSilloFromCurrent Thread), which temporarily sets the S1 to field of the ETHEAD object to the passed-in job object. This

will cause all access, such as that to the object manager, to be treated as if it were coming from the silo.

The named pipe driver, for example, can use this functionality to then create a NamedPipe object under

the \Device namespace, which will now be part of SilosVJD.

CHAPTER 3 Processes and jobs 189


---

Another question is this: If applications launch in essentially a "service" session, how can they be interactive and process input and output? First, it is important to note that there is no GUI possible or permitted when launching under a Windows container, and attempting to use Remote Desktop (RDP) to access a container will also be impossible. As such, only command-line applications can execute. But even such applications normally need an "interactive" session. So how can those function? The secret lies in a special host process, CExecSvc.exe, which implements the container execution service. This service uses a named pipe to communicate with the Docker and Vmcompute services on the host, and is used to launch the actual containerized applications in the session. It is also used to emulate the console functionality that is normally provided by Conhost.exe, piping the input and output through the named pipe to the actual command prompt (or PowerShell) window that was used in the first place to execute the docker command on the host. This service is also used when using commands such as docker cp to transfer files from or to the container.

## Container template

Even if we take into account all the device objects that can be created by drivers as silos are created, there are still countless other objects, created by the kernel as well as other components, with which services running in session 0 are expected to communicate, and vice-versa. In user mode, there is no silo monitor system that would somehow allow components to support this need, and forcing every driver to always create a specialized device object to represent each silo wouldn't make sense.

If a silo wants to play music on the sound card, it shouldn't have to use a separate device object to represent the exact same sound card as every other silo would access, as well as the host itself. This would only be needed if, say, per-silo object sound isolation was required. Another example is AFD. Although it does use a silo monitor, this is to identify which user-mode service hosts the DNS client that it needs to talk to service kernel-mode DNS requests, which will be per-silo, and not to create separate \Silos\ID\Device\Adf objects, as there is a single network/Winsock stack in the system.

Beyond drivers and objects, the registry also contains various pieces of global information that must be visible and exist across all silos, which the VReg component can then provide sandboxing around.

To support all these needs, the silo namespace, registry, and file system are defined by a specialized

container template file, which is located in %SystemRoot%\System32\Containers\wsc.def by default,

once the Windows Containers feature is enabled in the Add/Remove Windows Features dialog box.

This file describes the object manager and registry namespace and rules surrounding it, allowing the

definition of symbolic links as needed to the true objects on the host. It also describes which job object,

volume mount points, and network isolation policies should be used. In theory, future uses of silo ob jects in the Windows operating system could allow different template files to be used to provide other

kinds of containerized environments. The following is an excerpt from wsc.def on a system for which

containers are enabled:

---

<!--- This is a silo definition file for cmdserver.exe --> <container> <namespace> <ob shadow="false"> <symlink name="FileSystem" path=\"FileSystem\" scope=\"Global\" /> <symlink name="PdcPort" path=\"PdcPort\" scope=\"Global\" /> <symlink name="SeRmCommandPort" path=\"SeRmCommandPort\" scope=\"Global\" /> <symlink name="Registry" path=\"Registry\" scope=\"Global\" /> <symlink name="Driver" path=\"Driver\" scope=\"Global\" /> <symlink name="BaseNamedObjects" cloned=\"BaseNamedObjects\" shadow=\"False"/> <symlink name=\"GLOBAL\"" clone=\"GLOBAL"?\" shadow=\"False"/> <--- Needed to map directories from the host --> <symlink name="ContainerMappedDirectories" path=\"\ ContainerMappedDirectories\" scope=\"Local\" /> </a> <a> <a> <a> <a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </a> </

---

This page intentionally left blank


---

