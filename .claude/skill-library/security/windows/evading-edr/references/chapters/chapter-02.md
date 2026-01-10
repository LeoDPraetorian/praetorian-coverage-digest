## 2  FUNCTION-HOOKING DLLS

![Figure](figures/EvadingEDR_page_043_figure_001.png)

Of all the components included in modern endpoint security products, the most widely deployed are DLLs responsible for function oking , or interception. These DLLs provide

defenders with a large amount of important information related to code execution, such as the parameters passed to a function of interest and the values it returns. Today, vendors largely use this data to supplement other, more robust sources of information. Still, function hooking is an important component of EDRs. In this chapter, we'll discuss how EDRs most commonly intercept function calls and what we, as attackers, can do to interfere with them.

---

This chapter focuses heavily on the hooking of functions in a Windows file called mddll.dll, whose functionality we'll cover shortly, but modern EDRs hook other Windows functions too. The process of implementing these other hooks closely resembles the workflow described in this chapter.

## How Function Hooking Works

To understand how endpoint security products use code hooking, you must understand how code running in user mode interacts with the kernel.

This code typically leverages the Win32 API during execution to perform certain functions on the host, such as requesting a handle to another process. However, in many cases, the functionality provided via Win32 can't be completed entirely in user mode. Some actions, such as memory and object management, are the responsibility of the kernel.

To transfer execution to the kernel, x64 systems use a syscall instruction. But rather than implementing syscall instructions in every function that needs to interact with the kernel, Windows provides them via functions in nldll.dll . A function simply needs to pass the required parameters to this exported function; the function will, in turn, pass control into the kernel and then return the results of the operation. For example, Figure 2-1 demonstrates the execution flow that occurs when a user-mode application calls the Win32 API function kernel32OpenProcess() .

![Figure](figures/EvadingEDR_page_044_figure_004.png)

Figure 2-1: The flow of execution from user mode to kernel mode

To detect malicious activity, vendors often hook these Windows APIs. For example, one way that EDRs detect remote process injection is to hook the functions responsible for opening a handle to another process, allocating a region of memory, writing to the allocated memory, and creating the remote thread.

In earlier versions of Windows, vendors (and malware authors) often placed their hooks on the System Service Dispatch Table (SSDT), a table in the kernel that holds the pointers to the kernel functions used upon invocation of a syscall. Security products would overwrite these function pointers with pointers to functions in their own kernel module used to log information about the function call and then execute the target function. They would then pass the return values back to the source application.

18    Chapter 2

---

With the introduction of Windows XP in 2005, Microsoft made the decision to prevent the patching of SSDT, among a host of other critical structures, using a protection called Kernel Patch Protection (KPP), also known as PatchGuard, so this technique is not viable on modern 64-bit Windows versions. This means that traditional hooking must be done in user mode. Because the functions performing the syscalls in ntdll.dll are the last possible place to observe API calls in user mode, EDRs will often hook these functions in order to inspect their invocation and execution. Some commonly hooked functions are detailed in Table 2-1.

Table 2-1: Commonly Hooked Functions in ntdll.dll

<table><tr><td>Function names</td><td>Related attacker techniques</td></tr><tr><td>NtOpenProcess</td><td rowspan="4">Remote process injection</td></tr><tr><td>NtAllocateVirtualMemory</td></tr><tr><td>NtWriteVirtualMemory</td></tr><tr><td>NtCreateThreadEx</td></tr><tr><td>NtSuspendThread</td><td rowspan="3">Shellcode injection via asynchronous procedure call (APC)</td></tr><tr><td>NtResumeThread</td></tr><tr><td>NtQueuedAppThread</td></tr><tr><td>NtCreateSection</td><td rowspan="3">Shellcode injection via mapped memory sections</td></tr><tr><td>NtMapViewOfSection</td></tr><tr><td>NtUnmapViewOfSection</td></tr><tr><td>NtLoadDriver</td><td>Driver loading using a configuration stored in the registry</td></tr></table>


By intercepting calls to these APIs, an EDR can observe the parameters passed to the original function, as well as the value returned to the code that called the API. Agents can then examine this data to determine whether the activity was malicious. For example, to detect remote process injection, an agent could monitor whether the region of memory was allocated with readwrite-execute permissions, whether data was written to the new allocation, and whether a thread was created using a pointer to the written data.

## Implementing the Hooks with Microsoft Detours

While a large number of libraries make it easy to implement function hooks, most leverage the same technique under the hood. This is because, at its core, all function hooking involves patching unconditional jump (JMP) instructions to redirect the flow of execution from the function being hooked into the function specified by the developer of the EDR.

Microsoft Detours is one of the most commonly used libraries for implementing function hooks. Behind the scenes, Detours replaces the first few instructions in the function to be hooked with an unconditional JMP instruction that will redirect execution to a developer-defined function, also referred to as a detour . This detour function performs actions specified by the developer, such as logging the parameters passed to the target function. Then it passes execution to another function, often called a trampoline , which executes the target function and contains the instructions that were

---

originally overwritten. When the target function completes its execution, control is returned to the detour. The detour may perform additional processing, such as logging the return value or output of the original function, before returning control to the original process.

Figure 2-2 illustrates a normal process's execution compared to one with a detour. The solid arrow indicates expected execution flow, and the dashed arrow indicates hooked execution.

![Figure](figures/EvadingEDR_page_046_figure_002.png)

Figure 2-2: Normal and hooked execution paths

In this example, the EDR has opted to hook ndtl1@CreateFile(), the syscall used to either create a new I/O device or open a handle to an existing one. Under normal operation, this syscall would transition immediately to the kernel, where its kernel-mode counterpart would continue operations. With the EDR's hook in place, execution now makes a stop in the injected DLL. This dtk@ hookDtlsCreateFile() function will make the syscall on behalf of ndtl1@CreateFile(), allowing it to collect information about the parameters passed to the syscall, as well as the result of the operation.

Examining a hooked function in a debugger, such as WinDbg, clearly shows the differences between a function that has been hooked and one that hasn't. Listing 2-1 shows what an unhooked kernel32! Sleep() function looks like in WinDbg:

```bash
1:004d uf KERNELE32!sleepStub
KERNELE32!sleepStub:
00007ffa 9dfada0 48ff25695c0600 jmp   qword ptr [ KERNELE32!imp_Sleep (00007ffa 9d760a10)
KERNELE32!imp_Sleep:
00007ffa 9d760a10 d08fcc9ca7f   ror    byte ptr [rd1+7FFA9CCCh],1
00007ffa 9d760a16 0000      add byte ptr [rax],al
00007ffa 9d760a18 90             nop
00007ffa 9d760a19 f4             hit
00007ffa 9d760a1a cf             iretd
```

## Listing 2-1: The unhooked kernel32!SleepStub() function in WinDbg

This disassembly of the function shows the execution flow that we expect. When the caller invokes kernel3215leep(), the jump stub kernel3215leepStub() is executed, long-jumping (JMP) to kernel321_impSleep(), which provides the real Sleep() functionality the caller expects.

The function looks substantially different after the injection of a DLL that leverages Detours to hook it, shown in Listing 22:

20    Chapter 2

---

```bash
1:00> uf KERNEl32!51sep5tub
KERNEl32!51sep5tub:
00007fffa 9d6fad0e 09d353febf jmp 00007fffa 5d6e0178
00007fffa 9d6fad0a cc      int  3
00007fffa 9d6fad0b cc      int  3
00007fffa 9d6fad0c cc      int  3
00007fffa 9d6fad0a cc      int  3
00007fffa 9d6fad0c cc      int  3
00007fffa 9d6fad0a cc      int  3
00007fffa 9d6fad0b cc      int  3
1:00s> u 00007fffa 5d6e0178
00007fffa 5d6e0178 [f2f5f2fFFFF] jmp  qword ptr [00007fffa 5d6e0170]
00007fffa 5d6e017c cc      int  3
00007fffa 5d6e017f cc      int  3
00007fffa 5d6e0180 0000    add  byte ptr [rax],a1
00007fffa 5d6e0182 0000    add  byte ptr [rax],a1
00007fffa 5d6e0184 0000    add  byte ptr [rax],a1
00007fffa 5d6e0186 0000    add  byte ptr [rax],a1
00007fffa 5d6e0188 0000    add  byte ptr [rax],a1
```

Listing 2-2: The hooked kernel32!Sleep() function in WinDbg

Instead of a JMP to kernel321 jmp sleep(), the disassembly contains a series of JMP instructions, the second of which lands execution in trampoline64!timedSleep(), shown in Listing 2-3.

```bash
0:005> uf poi(00007ffa 5d6ee0170)
trampoline64!Tlmed5leep
  10 00007ffa 82881010 48895c2408   mov     qword ptr [rsp+8],rbx
  10 00007ffa 82881015 57        push    rdi
  10 00007ffa 82881016 4883ec20  sub    rsp,20h
  10 00007ffa 82881014 8bf9        mov     edi,ec
  10 00007ffa 8288101c 4c840d5b840000  lea     r8,[trampoline64!string' (00007ffa 828894d8)]
  10 00007ffa 82881023 33c9       xor     ecx,ecx
  10 00007ffa 82881025 488d5bc840000  lea     dxr,[trampoline64!string' (00007ffa 828894d8)]
  10 00007ffa 8288102c 41b930000000  mov     rdg,30h
  10 00007ffa 82881032 ff15f880000  call     qword ptr [trampoline64!imp_MessageBox]
  10 00007ffa 82881038 ff15ca7f0000  call     qword ptr [trampoline64!imp_GetTickCount]
  10 00007ffa 8288103e 8bcf       mov     ecx,edi
  10 00007ffa 8288103e 8bd8       mov     ebx,eax
  10 00007ffa 82881040 ff15fba06000  call     qword ptr [trampoline64!TrueSleep]
  10 00007ffa 82881042 ff15ba7f0000  call     qword ptr [trampoline64!imp_GetTickCount]
  10 00007ffa 82881048 2bc3        sub     eax,ebx
  10 00007ffa 8288104e f00fc105e8a60000 lock xadd dword ptr [trampoline64!dw5!ept],eax
  10 00007ffa 82881050 488bc5c2430  mov     rbx,qword ptr [rsp+30h]
  10 00007ffa 82881058 4883c420      add     rsp,20h
  10 00007ffa 8288105d 5f          pop     rdi
  10 00007ffa 82881061 c3          ret     _
```

Listing 2-3: The kernel32!Sleep() intercept function

To collect metrics about the hooked function's execution, this trampoline function evaluates the amount of time it sleeps, in CPU

Function-Hooking DLLs 21

---

ticks, by calling the legitimate kernel32!Sleep() function via its internal

trampoline64!TrueSleep() wrapper function. It displays the tick count in a

pop-up message.

While this is a contrived example, it demonstrates the core of what every EDR's function-hooking DLL does: proxying the execution of the target function and collecting information about how it was invoked. In this case, our EDR simply measures how long the hooked program sleeps. In a real EDR, functions important to adversary behavior, such as ntl16\NWriteVirtualMemory() for copying code into a remote process, would be proxied in the same way, but the hooking might pay more attention to the parameters being passed and the values returned.

### Injecting the DLL

A DLL that hooks functions isn't particularly useful until it is loaded into the target process. Some libraries offer the ability to spawn a process and inject the DLL through an API, but this isn't practical for EDRs, as they need the ability to inject their DLL into processes spawned by users at any time. Fortunately, Windows provides a few methods to do this.

Until Windows 8, many vendors opted to use the AppNet APIs infrastructure to load their DLLs into every interactive process (those that import user32.dll ). Unfortunately, malware authors routinely abused this technique for persistence and information collection, and it was notorious for causing system performance issues. Microsoft no longer recommends this method for DLL injection and, starting in Windows 8, prevents it entirely on systems with Secure Boot enabled.

The most commonly used technique for injecting a function-hooking DLL into processes is to leverage a driver, which can use a kernel-level feature called kernel asynchronous procedure call (KAPC) injection to insert the DLL into the process. When the driver is notified of the creation of a new process, it will allocate some of the process's memory for an APC routine and the name of the DLL to inject. It will then initialize a new APC object, which is responsible for loading the DLL into the process, and copy it into the process's address space. Finally, it will change a flag in the thread's APC state to force execution of the APC. When the process resumes its execution, the APC routine will run, loading the DLL. Chapter 5 explains this process in greater detail.

## Detecting Function Hooks

Offensive security practitioners often want to identify whether the functions they plan to use are hooked. Once they identify hooked functions, they can make a list of them and then limit, or entirely avoid, their use. This allows the adversary to bypass inspection by the EDR's function-hooking DLL, as its inspection function will never be invoked. The process of detecting hooked functions is incredibly simple, especially for the native API functions exported by mdtll.dll .

22    Chapter 2

---

Each function inside nldll.dll consists of a syscall stub. The instructions that make up this stub are shown in Listing 2-4.

```bash
mov r10, rcx
mov eax, <syscall_number>
syscall
retn
```

Listing 2-4: Syscall stub assembly instructions

You can see this stub by disassembling a function exported by mtlsl.dll in WinDbg, as shown in Listing 2-5.

```bash
0x0331  u ntldllNtAllocateVirtualMemory
ntdldllNtAllocateVirtualMemory
00007fff fe90c0b 4c8bd1      mov r10,rcx
00007fff fe90c0b b81800000    mov eax,18h
00007fff fe90c0b f60452893f67f01  test byte ptr [SharedUserData+0x308,1
00007fff fe90c0b 7503        jmp ntdldllNtAllocateVirtualMemory+0x15
00007fff fe90c0c2 0f05       syscall
00007fff fe90c0c4 c3          ret
00007fff fe90c0c5 c02e       int 2Eh
00007fff fe90c0c7 c3          ret
```

Listing 2-5: The unmodified syscall stub for ntdll!NtAllocateVirtualMemory()

In the disassembly of ntdll!NTAllocateVirtualMemory(), we see the basic building blocks of the syscall stub. The stub preserves the volatile RCX register in the R10 register and then moves the syscall number that correlates to NTAllocateVirtualMemory(), or 0x18 in this version of Windows, into EAX. Next, the TEST and conditional jump (JME) instructions following MOV are a check found in all syscall stubs. Restricted User Mode uses it when Hypervisor Code Integrity is enabled for kernel-mode code but not user-mode code. You can safely ignore it in this context. Finally, the syscall instruction is executed, transitioning control to the kernel to handle the memory allocation. When the function completes and control is given back to ntdll!NTAllocateVirtualMemory(), it simply returns.

Because the syscall stub is the same for all native APIs, any modification of it indicates the presence of a function hook. For example, Listing 2-6 shows the tampered syscall stub for the ndll1!nta!l!ateVirtualMemory() function.

```bash
0:013> u ntdllNtAllocateVirtualMemory
    ntdllNtAllocateVirtualMemory
    00007fff fe90c0b0 e5340baff      jmp 00007fff'fe4b0108
    00007fff fe90cb6 90             nop
    00007fff fe90cb6 90             nop
    00007fff fe90cb7 90             nop
    00007fff fe90cb8 0f94259893fe7f01 test byte ptr [SharedUserData+0x308],1
    00007fff fe90cc00 7503        jmp ntdllNtAllocateVirtualMemory+0x15
    00007fff fe90cc02 0f05         syscall
```

---

```bash
00007fff fe90c04 c3             ret
00007fff fe90c05 cd2e           int 2Eh
00007fff fe90c07 c3             ret
```

Listing 2-6: The hooked ntdll!NtAllocateVirtualMemory() function

Notice here that, rather than the syscall stub existing at the entry point of ntdllllAllLocaleVirtualMemory(), an unconditional JMP instruction is present. EDRs commonly use this type of modification to redirect execution flow to their hooking DLL.

Thus, to detect hooks placed by an EDR, we can simply examine functions in the copy of ndll.dll currently loaded into our process, comparing their entry-point instructions with the expected opcodes of an unmodified syscall stub. If we find a hook on a function we want to use, we can attempt to evade it using the techniques described in the next section.

## Evading Function Hooks

Of all the sensor components used in endpoint security software, function hooks are one of the most well researched when it comes to evasion. Attackers can use a myriad of methods to evade function interception, all of which generally boil down to one of the following techniques:

- • Making direct syscalls to execute the instructions of an unmodified
syscall stub

• Remapping ntdll.dll to get unhooked function pointers or overwriting
the hooked ntdll.dll currently mapped in the process

• Blocking non-Microsoft DLLs from loading in the process to prevent
the EDR's function-hooking DLL from placing its detours
This is by no means an exhaustive list. One example of a technique that doesn't fit into any of these categories is vectored exception handling, as detailed in Peter Winter-Smith's blog post "FireWalker: A New Approach to Generically Bypass User-Space EDR Hooking." Winter-Smith's technique uses a vectored exception handler (VEH) , an extension to structured exception handling that allows the developer to register their own function for which to watch and handle all exceptions in a given application. It sets the processor’s trap flag to put the program into single-step mode. On each new instruction, the evasion code generates a single-step exception on which the VEH has first right of refusal. The VEH will step over the hook placed by the EDR by updating the instruction pointer to the chunk containing the original, unmodified code.

While interesting, this technique currently only works for 32-bit applications and can adversely affect a program's performance, due to the single stepping. For these reasons, this approach to evasion remains beyond the scope of this chapter. We'll instead focus on more broadly applicable techniques.

---

## Making Direct Syscalls

By far, the most commonly abused technique for evading hooks placed on syscall.dll functions is making direct syscalls. If we execute the instructions of a syscall stub ourselves, we can mimic an unmodified function. To do so, our code must include the desired function's signature, a stub containing the correct syscall number, and an invocation of the target function. This invocation uses the signature and stub to pass in the required parameters and execute the target function in a way that the function howns won't detect. Listing 2-7 contains the first file we need to create to execute this technique.

```bash
NtAllocateVirtualMemory PROC
    mov r10, rcx
    mov eax, 0018h
        syscall,
    ret
NtAllocateVirtualMemory ENDP
```

Listing 2-7: Assembly instructions for NtAllocateVirtualMemory()

The first file in our project contains what amounts to a reimplementation of std11\ta10\cateVirtualMemory(). The instructions contained inside the sole function will fill the EAX register with the syscall number. Then, a syscall instruction is executed. This assembly code would reside in its own .asm file, and Visual Studio can be configured to compile it using the Microsoft Macro Assembler (MASM), with the rest of the project.

Even though we have our sylls stub built out, we still need a way to call it from our code. Listing 2.8 shows how we would do that.

```bash
extern_C_NTSTATUS NtAllocateVirtualMemory(
    HANDLE ProcessHandle,
        PVOID BaseAddress,
        ULONG ZeroBits,
        PULONG RegionSize,
        ULONG AllocationType,
        ULONG Protect);
```

Listing 2-8 The definition of NtAllocateVirtualMemory() to be included in the project header file

This function definition contains all the required parameters and their types, along with the return type. It should live in our header file, syscall.h, and will be included in our C source file, shown in Listing 2_9.

```bash
#include "syscall.h"
void wmain()dg
{
  LPVOID lpAllocationStart = NULL;
  ■ NtAllocateVirtualMemory(GetCurrentProcess(),
        &lpAllocationStart,
```

---

```bash
o,
        (PULONG)0x1000,
        MEM_COMMIT | MEMreserve,
        PAGE_READWRITE);
    }
```

Listing 2-9: Making a direct syscall in C

The wmain() function in this file calls NtAllocateVirtualMemory() to allocate a 0x1000-byte buffer in the current process with read-write permissions. This function is not defined in the header files that Microsoft makes available to developers, so we have to define it in our own header file. When this function is invoked, rather than calling into ntdll.dll, the assembly code we included in the project will be called, effectively simulating the behavior of an unhooked ntdll!NtAllocateVirtualMemory() without running the risk of hitting an EDR's hook.

One of the primary challenges of this technique is that Microsoft frequently changes syscall numbers, so any tooling that hardcodes these numbers may only work on specific Windows builds. For example, the syscall number for ntdll1ffCreateThreadEx() on build 1909 of Windows 10 is 0x8D. On build 20HI, the following release, it is 0xC1. This means that a tool targetting build 1909 won't work on later versions of Windows.

To help address this limitation, many developers rely on external sources to track these changes. For example, Mateusz Jurczyk of Google's Project Zero maintains a list of functions and their associated syscall numbers for each release of Windows. In December 2019, Jackson Thuraisamy published the tool SysWhispers, which gave attackers the ability to dynamically generate the function signatures and assembly code for the syscalls in their offensive tooling. Listing 2-10 shows the assembly code generated by SysWhispers when targeting the ntdll!NtCreateThreadEx() function on builds 1903 through 20H2 of Windows 10.

```bash
NtCreateThreadEx PROC
    mov rax, gs:[60h]; load PEB into RAX.
  NtCreateThreadEx Check_X_X_XXXX;  Check major version.
     cmp dword ptr [rax+118h], 10
    je  NtCreateThreadEx_Check_10_0_XXXX
    jmp  NtCreateThreadEx_SystemCall_Unknown
❸ NtCreateThreadEx Check_10_0_XXXX;
     cmp word ptr [rax+120h], 18362
    je  NtCreateThreadEx_SystemCall_10_0_18362
    cmp word ptr [rax+120h], 18363
    je  NtCreateThreadEx_SystemCall_10_0_18363
    cmp word ptr [rax+120h], 19041
    je  NtCreateThreadEx_SystemCall_10_0_19041
    cmp word ptr [rax+120h], 19042
    je  NtCreateThreadEx_SystemCall_10_0_19042
    jmp  NtCreateThreadEx_SystemCall_Unknown
  NtCreateThreadEx_SystemCall_10_0_18362; ; Windows 10.0.18362 (1903)
   ◉ mov eax, 00bdh
     jmp  NtCreateThreadEx_Epileque
```

26    Chapter 2

---

```bash
NtCreateThreadEx_SystemCall10_0_18363 ; Windows 10.0.18363 (1909)
mov eax, 00bth
jmp NtCreateThreadEx_Epilogue
NtCreateThreadEx_SystemCall10_0_19041 ; Windows 10.0.19041 (2004)
mov eax, 00c1h
jmp NtCreateThreadEx_Epilogue
NtCreateThreadEx_SystemCall10_0_19042 ; Windows 10.0.19042 (20H2)
mov eax, 00c1h
jmp NtCreateThreadEx_Epilogue
NtCreateThreadEx_SystemCall Unknown: ; Unknown/unsupported version.
ret
NtCreateThreadEx_Epilogue:
mov r10, rcx
● syscall
ret
NtCreateThreadEx_ENDB
```

Listing 2-10: The SysWhispers output for ntdll!NtCreateThreadEx()

This assembly code extracts the build number from the process environment block ❶ and then uses that value to move the appropriate syscall number into the EAX register ❷ before making the syscall ❸ . While this approach works, it requires substantial effort, as the attacker must update the syscall numbers in their dataset each time Microsoft releases a new Windows build.

## Dynamically Resolving Syscall Numbers

In December 2020, a researcher known by @modexpbug on Twitter published a blog post titled "Bypassing User-Mode Hooks and Direct Invocation of System Calls for Red Teams." The post described another function-hook evasion technique: dynamically resolving syscall numbers at runtime, which kept attackers from having to hardcode the values for each Windows build. This technique uses the following workflow to create a dictionary of function names and syscall numbers:

- 1. Get a handle to the current process's mapped ntdll.dll.

2. Enumerate all exported functions that begin with Zw to identify system
call. Note that functions prefixed with Nt (which is more commonly
seen) work identically when called from user mode. The decision to use
the Zw version appears to be arbitrary in this case.

3. Store the exported function names and their associated relative virtual
addresses.

4. Sort the dictionary by relative virtual addresses.
5. Define the syscall number of the function as its index in the dictionary
after sorting.
Using this technique, we can collect syscall numbers at runtime, insert them into the stub at the appropriate location, and then call the target functions as we otherwise would in the statically coded method.

---

## Remapping ntdll.dll

Another common technique used to evade user-mode function hooks is to load a new copy of ntdll.dll into the process, overwrite the existing hooked version with the contents of the newly loaded file, and then call the desired functions. This strategy works because the newly loaded ntdll.dll does not contain the hooks implemented in the copy loaded earlier, so when it overwrites the tainted version, it effectively cleans out all the hooks placed by the EDR. Listing 2-11 shows a rudimentary example of this. Some lines have been omitted for brevity.

```bash
int wmain()
{
   HMODULE hOldNtdll = NULL;
   MODULEINFO info = {};
   LPVOID lpBaseAddress = NULL;
   HANDLE hNewWtdll = NULL;
   HANDLE hFileMapping = NULL;
   LPVOID lpFileData = NULL;
   PIMAGE_DOS_HEADER pDosHeader = NULL;
   PIMAGE_NT_HEADER564 pTHHeader = NULL;
   hOldNtdll = GetModuleHandleW(L"ntdll");
   if (!GetModuleInformation(
       GetCurrentProcess(),
       hOldNtdll,
       &info,
       sizeof(MODULEINFO)))
   lpBaseAddress = info.lpBaseOfDll;
   hNewWtdll = CreateFileW(
       L"C:\Windows\System32\ntdll.dll",
       GENERIC_READ,
       FILE_SHARE_READ,
       NULL,
       OPEN_EXISTING,
       FILE_ATTRIBUTE_NORMAL,
       NULL;
   hFileMapping = CreateFileMappingW(
       hNewWtdll,
       NULL,
       PAGE_READONLY | SEC_IMAGE,
       0, 0, NULL);
   # lpFileData = MapViewOffile(
       hFileMapping,
       FILE_MAP_READ,
       0, 0, 0);
   pDosHeader = (PIMAGE_DOS_HEADER)lpBaseAddress;
   pTHHeader = (PIMAGE_NT_HEADER564)(ULONG_PTR)lpBaseAddress + pDosHeader->e_lfawn);
```

28    Chapter 2

---

```bash
for (int i = 0; i < pNtHeader->FileHeader.NumberOfSections; i++)
      PIMAGE_SECTION_HEADER pSection =
          (PIMAGE_SECTION_HEADER)((ULONG_PTR)IMAGE_FIRST_SECTION(pNtHeader) +
          ((ULONG_PTR)IMAGE_SIZEOF_SECTION_HEADER * i));
    }     if (!strcmp((PCHAR)pSection->Name, ".text"))
        {
          DWORD dwOldProtection = 0;
        }     VirtualProtect(
            (LPVOID)((ULONG_PTR)lpBaseAddress + pSection->VirtualAddress),
            pSection->Misc.VirtualSize,
            PAGE_EXECUTE_READWRITE,
            &dwOldProtection
        );
    }     memcpy(
            (LPVOID)((ULONG_PTR)lpBaseAddress + pSection->VirtualAddress),
            (LPVOID)((ULONG_PTR)lpFileData + pSection->VirtualAddress),
            pSection->Misc.VirtualSize
        );
        break;
    }
    }
    --snip--
```

Listing 2-11: A technique for overwriting a hooked ntdll.dll

Our code first gets the base address of the currently loaded (hooked) ntll.dll . Then we read in the contents of ntdll.dll from disk and map it into memory . At this point, we can parse the PE headers of the hooked ntllll.dll , looking for the address of the .text section ❸ , which holds the executable code in the image. Once we find it, we change the permissions of that region of memory so that we can write to it ❸ , copy in the contents of the .text section from the “ clean ” file ❸ , and revert the change to memory protection . After this sequence of events completes, the hooks originally placed by the EDR should have been removed and the developer can call whichever function from ntdll.dll they need without the fear of execution being redirected to the EDR's injected DLL.

While reading ntdll.dll from disk seems easy, it does come with a potential trade-off. This is because loading ntdll.dll into a single process multiple times is atypical behavior. Defenders can capture this activity with Sysmon, a free system-monitoring utility that provides many of the same

Function-Hooking DLLs 29

---

telemetry-collection facilities as an EDR. Almost every non-malicious process has a one-to-one mapping of process GUIDs to loads of ntdll.dll. When I queried these properties in a large enterprise environment, only approximately 0.04 percent of 37 million processes loaded ntdll.dll more than once over the course of a month.

To avoid detection based on this anomaly, you might opt to spawn a new process in a suspended state, get a handle to the unmodified ntdll.dll mapped in the new process, and copy it to the current process. From there, you could either get the function pointers as shown before, or replace the existing hooked ntdll.dll to effectively overwrite the hooks placed by the EDR. Listing 2-12 demonstrates this technique.

```bash
int wmain() {
    LPVOID pNtdll = nullptr;
    MODULEINFO mi;
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(STARTUPINFOW));
    ZeroMemory(&pi, sizeof(PROCESS_INFORMATION));
    GetModuleInformation(GetCurrentProcess(),
        GetModuleHandle(L"ntdll.dll", 0,
        0 &mi, sizeof(MODULEINFO));
    PIMAGE_DOS_HEADER hooked_dos = (PIMAGE_DOS_HEADER)mi.lpBaseOfDll;
    PIMAGE_NT_HEADERS hooked_nt =
        (PIMAGE_NT_HEADERS)((ULONG_PTR)mi.lpBaseOfDll + hooked_dos->e_lfanew);
    CreateProcess(L"C:\\Windows\\System32\notepad.exe",
        NULL, NULL, NULL, TRUE, CREATE_SUSPED,
        0 NULL, NULL, &si, &pi);
    pNtdll = HeapAlloc(GetProcessHeap(), 0, mi.SizeOfImage);
    ReadProcessMemory(pi.hProcess, (LPVOID)mi.lpBaseOfDll,
        pNtdll, mi.SizeOfImage, nullptr);
    PIMAGE_DOS_HEADER fresh_dos = (PIMAGE_DOS_HEADER)pNtdll;
    PIMAGE_NT_HEADERS fresh_nt =
        (PIMAGE_NT_HEADERS)((ULONG_PTR)pNtdll + fresh_dos->e_lfanew);
    for (WORD i = 0; i < hooked_nt->FileHeader.NumberOfSections; i++) {
        PIMAGE_SECTION_HEADER hooked_section =
            ((PIMAGE_SECTION_HEADER)((ULONG_PTR)IMAGE_FIRST_SECTION(hooked_nt) +
            ((ULONG_PTR)IMAGE_SIZE_SECTION_HEADER * i));
        if !(strcmp((PCHAR)hooked_section->Name, ".text")){
            DWORD oldProtect = 0;
            LPVOID hooked_text_section = (LPVOID)((ULONG_PTR)mi.lpBaseOfDll +
            (DWORD_PTR)hooked_section->VirtualAddress);
            LPVOID fresh_text_section = (LPVOID)((ULONG_PTR)pNtdll +
            (DWORD_PTR)hooked_section->VirtualAddress);
```

---

```bash
VirtualProtect(hooked_text_section,
            hooked_section->Misc.VirtualSize,
            PAGE_EXECUTE_READWRITE,
            &oldProtect);
        RtlCopyMemory(
            hooked_text_section,
            fresh_text_section,
            hooked_section->Misc.VirtualSize);
        VirtualProtect(hooked_text_section,
            hooked_section->Misc.VirtualSize,
            oldProtect,
            &oldProtect);
    }
    TerminateProcess(pi.hProcess, 0);
    --snip--
    return 0;
}
```

Listing 2-12: Remapping ntdll.dll in a suspended process

This minimal example first opens a handle to the copy of ntdll.dll currently mapped into our process, gets its base address, and parses its PE headers ❸ . Next, it creates a suspended process ❹ and parses the PE headers of this process's copy of ntdll.dll , which hasn't had the chance to be hooked by the EDR yet. The rest of the flow of this function is exactly the same as in the previous example, and when it completes, the hooked ntdll.dll should have been reverted to a clean state.

As with all things, there is a trade-off here as well, as our new suspended process creates another opportunity for detection, such as by a hooked ntdllntCreateProcessEx(), the driver, or the ETW provider. In my experience, it is very rare to see a program create a temporary suspended process for legitimate reasons.

## Conclusion

Function hooking is one of the original mechanisms by which an endpoint security product can monitor the execution flow of other processes. While it provides very useful information to an EDR, it is very susceptible to bypass due to inherent weaknesses in its common implementations. For that reason, most mature EDRs today consider it an auxiliary telemetry source and instead rely on more resilient sensors.

---



---

## 3

## PROCESS- AND THREAD- CREATION NOTIFICATIONS

![Figure](figures/EvadingEDR_page_059_figure_002.png)

Most modern EDR solutions rely heavily on functionality supplied through their kernel-

mode driver, which is the sensor component running in a privileged layer of the operat-

ing system, beneath the user mode. These drivers give developers the ability to leverage features that are only available inside the kernel, supplying EDRs with many of their preventive features and telemetry.

While vendors can implement a vast number of security-relevant features in their drivers, the most common one is notification callback routines. These are internal routines that take actions when a designated system event occurs.

In the next three chapters, we'll discuss how modern EDRs leverage notification callback routines to gain valuable insight into system events from the kernel. We'll also cover the evasion techniques relevant to each type of notification and its related callback routines. This chapter focuses

---

on two types of callback routines used very often in EDRs: those related to process creation and thread creation.

## How Notification Callback Routines Work

One of the most powerful features of drivers in the context of EDRs is the ability to be notified when a system event occurs. These system events might include creating or terminating new processes and threads, requesting to duplicate processes and threads, loading images, taking actions in the registry, or requesting a shutdown of the system. For example, a developer may want to know whether a process attempts to open a new handle to lsass.exe, because this is a core component of most credential-dumping techniques.

To do this, the driver registers callback routines, which essentially just say, "Let me know if this type of event occurs on the system so I can do something." As a result of these notifications, the driver can take action. Sometimes it might simply collect telemetry from the event notification. Alternatively, it might opt to do something like provide only partial access to the sensitive process, such as by returning a handle with a limited-access mask (for example, PROCESS_QUERYLIMITED_INFOATION instead of PROCESS_ALL_ACCESS).

Callback routines may be either pre-operation , occurring before the event completes, or post-operation , occurring after the operation. Preoperation callbacks are more common in EDRs, as they give the driver the ability to interfere with the event or prevent it from completing, as well as other side benefits that we'll discuss in this chapter. Post-operation callbacks are useful too, as they can provide information about the result of the system event, but they have some drawbacks. The largest of these is the fact that they're often executed in an arbitrary thread context, making it difficult for an EDR to collect information about the process or thread that started the operation.

## Process Notifications

Callback routines can notify drivers whenever a process is created or terminated on the system. These notifications happen as an integral part of the process creation or termination. You can see this in Listing 3-1, which shows the call stack for creation of a child process of emd.exe, notepad.exe, that led to the notification of registered callback routines.

To obtain this call stack, use WinDbg to set a breakpoint (bp) on nt!PspCallProcessNotifyByOutlines(), the internal kernel function that notifies drivers with registered callbacks of process-creation events. When the breakpoint is hit, the k command returns the call stack for the process under which the break occurred.

```bash
2: kdb bP ntlPspCallProcessNotifyRoutines
2: kdb g
    Breakpoint 0 hit
ntlPspCallProcessNotifyRoutines:
```

34    Chapter 3

---

```bash
ffffffff803'4940281c48895c2410   mov     dword ptr [rsp+10h],rbx
! kd> k
# Child-SP             RetAddr           Call Site
010ffeee8e7a005f00ff8ff803'494ae9c2  ntIPspCallProcessNotifyRoutines
01 0ffeee8e7a005d00  ff8ff803'4941577d  ntIPspInsertThread+0x6e8e
02 0ffeee8e7a005d00  ff8ff803'49208cb5  ntNTcCreateUserProcess+0x0dd
03 0ffeee8e7a006a90  00007ffc 74b4e664  ntIKiSystemServiceCopyEnd+0x25
04 00000d7 6215cf80  00007ffc 72478e73  ndtlNTcCreateUserProcess+0x14
05 00000d7 6215d00  00007ffc 724771a66  KERNELBASE1CreateProcessInternalW+0xef3e
06 00000d7 6215f2d0  00007ffc 747a7cbba  KERNELBASE1CreateProcessW+0x66
07 00000d7 6215f40  00007ffc 7418486  KERNEL321CreateProcessWStub+0x54
08 00000d7 6215f40  00007ffc 74185b7f  cmdExecPgm+0x262
09 00000d7 6215f50  00007ffc 7417c9bd  cmdIOWork+0x47
10 00000d7 6215f40  00007ffc 7417bea1  cmdFindDiscAndRunX+0x39d
0b 00000d7 6215f40  00007ffc 7418ebf0  cmdDispatch+0x41
0c 00000d7 6215f40  00007ffc 74188ecd  cmdmain+0x418
0d 00000d7 6215fe10  00007ffc 747a7034  cmdI__mainCRTStartup+0x14d
0e 00000d7 6215f40  00007ffc 74b02651  KERNEL321BaseThreadInitThunk+0x14
0f 00000d7 6215fe80  00000000 00000000
001dl1RtUUserThreadStart+0x21
```

Listing 3-1: A process-creation call stack

Whenever a user wants to run an executable, cmd.exe calls the cmd!ExeApp() function. In this call stack, we can see this function calling the stub used to create a new process (at output line 07). This stub ends up making the syscall for rtdllnt!CreateUserProcess(), where control is transitioned to the kernel (at 04).

Now notice that, inside the kernel, another function is executed (at 00). This function is responsible for letting every registered callback know that a process is being created.

## Registering a Process Callback Routine

To register process callback routines, EDRs use one of the following two functions: nt!PSetCreateProcess&ntifyRuneEx() or nt!PSetCreateProcess &ntifyRuneEx2(). The latter can provide notifications about non-Win32 subsystem processes. These functions take a pointer to a callback function that will perform some action whenever a new process is created or terminated. Listing 3-2 demonstrates how a callback function is registered.

```bash
NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObj, UNICODE_STRING pRegPath)
{
  NTSTATUS status = STATUS_SUCCESS;
  --snip--
   status = 0, PsSetCreateProcessNotifyRoutineEx2(
        PcCreateProcessNotifySubsystems,
        (PVOID)ProcessNotifyCallbackRoutine,
        FALSE
    );
  --snip--
```

Process-and Thread-Creation Notifications 35

---

```bash
# void ProcessNotifyCallbackRoutine{
        PEPROCESS pProcess,
        HANDLE hPid,
        PPS_CREATE_NOTIFY_INFO pInfo)
{             if (pInfo)
            {                --snip--
            }
        }
```

Listing 3-2: Registering a process-creation callback routine

This code registers the callback routine ❶ and passes three arguments to the registration function. The first, PscCreateProcessNotifySubsystems, indicates the type of process notification that is being registered. At the time of this writing, "subsystems" is the only type that Microsoft documents. This value tells the system that the callback routine should be invoked for processes created across all subsystems, including Win32 and Windows Subsystem for Linux (WSL).

The next argument defines the entry point of the callback routine to be executed when the process is created. In our example, the code points to the internal ProcessNotifyCallbackRoutine() function. When process creation occurs, this callback function will receive information about the event, which we'll discuss momentarily.

The third argument is a Boolean value indicating whether the callback routine should be removed. Because we're registering the routine in this example, the value is FALSE. When we unload the driver, we'd set this to TRUE to remove the callback from the system. After registering the callback rountine, we define the callback function itself ♦.

## Viewing the Callback Routines Registered on a System

You can use WinDbg to see a list of the process callback routines on your system. When a new callback routine is registered, a pointer to the routine is added to an array of EX_FAST_REF structures, which are 16-byte aligned pointers stored in an array at nt!PspCreateProcessObjectRoutine, as shown in Listing 3-3.

```bash
1: kd\ dg ntlpsCreateProcessNotifyRoutine
f8ff0b8f49aec4e0  ffff0b8f91c50bf  ffff0b8f 91df6c0f
ffffffff08349aec4f0  ffff0b8f9363ffc  ffff0b8f 9326fedf
ffffffff08349aec500  ffff0b8f93a9bff  ffff0b8f 933a49f
ffffffff80349aec510  ffff0b8f9353acdf  ffff0b8f 9353a9af
ffffffff80349aec520  ffff0b8f98078fc0 00000000 00000000
ffffffff80349aec530 00000000 00000000 00000000 00000000
ffffffff80349aec540 00000000 00000000 00000000 00000000
ffffffff80349aec550 00000000 00000000 00000000 00000000
```

Listing 5-3. An array of EX_FAST_REF structures containing the addresses of processcreation callback routines

36    Chapter 3

---

Listing 3-4 shows a way of iterating over this array of EX_FAST_REF structures to enumerate drivers that implement process-notification callbacks.

```bash
1: kd>dxx ((void*[@0x40]) &lt;T!Ps!CreateProcessNotifyRoutine)
.Where(a => a != 0)
.Select(a => @%getgen(#%getCallbackRoutine(a).Function))
[0]
[1]        : nt!V!CreateProcessCallback (ffffffff803 4915a2a0)
[1]        : cng!Cng!CreateProcessNotifyRoutine (ffffffff803 4a4e6d00)
[2]        : Wdf!Writer+0x45e00 (ffffffff803 4ade5e00)
[3]        : kseckdl!Kse!CreateProcessNotifyRoutine (ffffffff803 4a3ba40)
[4]        : tciip!i!CreateProcessNotifyRoutineEx (ffffffff803 4b1f1f90)
[5]        : ionate!IoRateProcess!CreateNoNotify (ffffffff803 4b95d930)
[6]        : Cl!l_PEProcess!Notify (ffffffff803 4a6a4270)
[7]        : dxgkmnl!DxgkProcess!Notify (ffffffff803 4c116b10)
[8]        : peauth+0x43c6c (ffffffff803 4d87ce00)
```

Listing 3-4: Enumerating registered process-creation callbacks

Here, we can see some of the routines registered on a default system. Note that some of these callbacks do not perform security functions. For instance, the one beginning with tcrij is used in the TCP/IP driver. However, we do see that Microsoft Defender has a callback registered: @fd11ter+0x45e00. (Microsoft doesn't publish full symbols for the WdfWriter.sys driver). Using this technique, we could locate an EDR's callback routine without needing to reverse engineer Microsoft's driver.

## Collecting Information from Process Creation

Once an EDR registers its callback routine, how does it access information? Well, when a new process is created, a pointer to a PS_CREATE_NOTIFY_INFO structure is passed to the callback. You can see the structure defined in Listing 3-5.

```bash
typedef struct _PS_CREATE_NOTIFY_INFO {
    SIZE_T           Size;
    union {
        ULONG Flags;
    struct {
        ULONG FileOpenNameAvailable : 1;
        ULONG IsSubsystemProcess : 1;
        ULONG Reserved : 30;
    };
    HANDLE                ParentProcessId;
    CLIENT_ID               CreatingThreadId;
    struct FILE_OBJECT *FileObject;
    PCUNICODE_STRING    ImageFileName;
    PCUNICODE_STRING    CommandLine;
    WISTATS             CreationStatus;
} PS_CREATE_NOTIFY_INFO, *PPS_CREATE_NOTIFY_INFO;
```

Listing 3-5: The definition of the PS_CREATE_NOTIFY_INFO structure

Process- and Thread-Creation Notifications  37

---

This structure contains a significant amount of valuable data relating to process-creation events on the system. This data includes:

ParentProcessId The parent process of the newly created process. This isn't necessarily the one that created the new process.

CreatingThreadId Handles to the unique thread and process responsible for creating the new process.

FileObject A pointer to the process's executable file object (the image on disk).

ImageFileName A pointer to a string containing the path to the newly created process's executable file.

CommandLine The command line arguments passed to the creating process.

FileOpenNameAvailable A value that specifies whether the ImageFileName member matches the filename used to open the new process's executable file.

One way that EDRs commonly interact with the telemetry returned from this notification is through Sysmon's Event ID 1, the event for process creation, shown in Figure 3-1.

![Figure](figures/EvadingEDR_page_064_figure_008.png)

Figure 3-1: Sysmon Event ID 1 showing process creation

In this event, we can see some of the information from the PS CREATE NOTIFY_INFO structure passed to Sysmon's callback routine. For example, the Image, CommandLine, and ParentProcessId properties in the event translate to the ImageFileName, CommandLine, and ParentProcessId members of the structure, respectively.

You may be wondering why there are so many more properties in this event than there are in the structure received by the callback. The driver collects these supplemental pieces of information by investigating the context of the thread under which the event was generated and expanding on members

38 Chapter 1

---

of the structure. For instance, if we know the ID of the process's parent, we can easily find the parent's image path to populate the ParentImage property.

By leveraging the data collected from this event and the associated structure, EDRs can also create internal mappings of process attributes and relationships in order to detect suspicious activity, such as Microsoft Word spawning a powerhell.exe child. This data could also provide the agent with useful context for determining whether other activity is malicious. For example, the agent could feed process command line arguments into a machine learning model to figure out whether the command's invocation is unusual in the environment.

## Thread Notifications

Thread-creation notifications are somewhat less valuable than processcreation events. They work relatively similarly, occurring during the creation process, but they receive less information. This is true despite the fact that thread creation happens substantially more often; after all, nearly every process supports multithreading, meaning that there will be more than one thread-creation notification for every process creation.

Although thread-creation callbacks pass far less data to the callback, they do provide the EDR with another datapoint against which detections can be built. Let's explore them a little further.

### Registering a Thread Callback Routine

When a thread is created or terminated, the callback routine receives three pieces of data: the ID of the process to which the thread belongs, the unique thread ID, and a Boolean value indicating whether the thread is being created. Listing 3-6 shows how a driver would register a callback routine for thread-creation events.

```bash
NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObj, UNICODE_STRING pRegPath)
{
   NTSTATUS status = STATUS_SUCCESS;
      --snip--
  ● status = PsSetCreateThreadNotifyRoutine(ThreadNotifyCallbackRoutine);
   --snip--
}
void ThreadNotifyCallbackRoutine(
      HANDLE hProcess,
      HANDLE hThread,
      BOOLEAN bCreate)
{
  ● if (bCreate)
      {       --snip--
    }
```

Listing 3-6: Registration of a thread-creation notification routine

Process-and Thread-Creation Notifications  39

---

As with process creation, an EDR can receive notifications about thread creation or termination via its driver by registering a thread-notification callback routine with either nt!PsSetCreateThreadNotifyRoutine() or the extended nt!PsSetCreateThreadNotifyRoutineEx(), which adds the ability to define the notification type.

This example driver first registers the callback routine ❶ , passing in a pointer to the internal callback function, which receives the same three pieces of data passed to process callback routines. If the Boolean indicating whether the thread is being created or terminated is TRUE , the driver performs some action defined by the developer ❷ . Otherwise, the callback would simply ignore the thread events, as thread-termination events (which occur when a thread completes its execution and returns) are generally less valuable for security monitoring.

## Detecting Remote Thread Creation

Despite providing less information than process-creation callbacks, thread-creation notifications offer the EDR data about something else callbacks can't detect: remote thread creation. Remote thread creation occurs when one process creates a thread inside another process. This technique is core to a ton of attacker tradecraft, which often relies on changing the execution context (as in going from user 1 to user 2). Listing 3-7 shows how an EDR could detect this behavior with its thread-creation callback routine.

```bash
void ThreadNotifyCallbackRoutine(
    HANDLE hProcess,
    HANDLE hThread,
    BOOLEAN bCreate)
   {  if (bCreate)
     {   ● if (PsGetCurrentProcessId() != hProcess)
        {         --snip--
        }    }
    }
```

Listing 3-7: Detecting remote thread creation

Because the notification executes in the context of the process creating the thread, developers can simply check whether the current process ID matches the one passed to the callback routine. If, not, the thread is being created remotely and should be investigated. That's it: a huge capability, provided through one or two lines of code. It doesn't get much better than that. You can see this feature implemented in real life through Sysmon's Event ID 8, shown in Figure 3 - 2 . Notice that the SourceProcessId and TargetProcessId values differ.

40 Chapter 1

---

![Figure](figures/EvadingEDR_page_067_figure_000.png)

Figure 3-2: Sysmon Event ID 8 detecting remote thread creation

Of course, remote thread creation happens under a number of legitimate circumstances. One example is child process creation. When a process is created, the first thread executes in the context of the parent process. To account for this, many EDRs simply disregard the first thread associated with a process.

Certain internal operating system components also perform legitimate remote thread creation. An example of this is Windows Error Reporting (werfault.exe) . When an error has occurred on the system, the operating system spawns werfault.exe as a child of svhost.exe (specifically, the WebSvc service) and then injects into the faulting process.

Thus, the fact that a thread was created remotely doesn't automatically make it malicious. To determine this, the EDR has to collect supplemental information, as shown in Symson Event ID 8 .

## Evading Process- and Thread-Creation Callbacks

Process and thread notifications have the most associated detections of all callback types. This is partly due to the fact that the information they provide is critical to most process-oriented detection strategies and is used by almost every commercial EDR product. They're also generally the easiest to understand. This isn't to say that they're also easy to evade. However, there is no shortage of procedures we can follow to increase our chances of slipping through the cracks somewhere.

### Command Line Tampering

Some of the most commonly monitored attributes of process-creation events are the command line arguments with which the process was invoked. Certain detection strategies are even built entirely around specific command line arguments associated with a known offensive tool or piece of malware.

EDRs can find arguments in the CommandLine member of the structure passed to a process-creation callback routine. When a process is created, its command line arguments are stored in the ProcessParameters field of

Process- and Thread-Creation Notifications     41

---

its process environment block (PEB). This field contains a pointer to an RTL_USER_PROCESS_PARAMETERS structure that contains, among other things, a UNICODE_STRING with the parameters passed to the process at invocation. Listing 3-8 shows how we could manually retrieve a process's command line arguments with WinDbg.

```bash
0:000 > ## @p@b->ProcessParameters->CommandLine.Buffer
what_t * 0x000001be 2f78290a
"C:\Windows\System32\ rundll32.exe_leadpack.dll,RegisterOCX payload.exe"
```

Listing 3-8: Retrieving parameters from the PEB with WinDbg

In this example, we extract the parameters from the current process's PEB by directly accessing the buffer member of the UNICODE_STRING, which makes up the CommandLine member of the ProcessParameters field.

However, because the PEB resides in the process's user-mode memory space and not in the kernel, a process can change attributes of its own PEB. Adam Chester's "How to Argue like Cobalt Strike" blog post details how to modify the command line arguments for a process. Before we cover this technique, you should understand what it looks like when a normal program creates a child process. Listing 3-9 contains a simple example of this behavior.

```bash
void main()
{
   STARTUPINFOW si;
   ZeroMemory(&si, sizeof(si));
   si.cb = sizeof(si);
   PROCESS_INFORMATION pi;
   ZeroMemory(&pi, sizeof(pi));
   if (!CreateProcessW(
      LC:\Windows\System32\cmd.exe",
      L"These are my sensitive arguments",
      NULL, NULL, FALSE, 0,
      NULL, NULL, &si, &pi))
   {
      WaitForSingleObject(pi.hProcess, INFINITE);
   }
   return;
}
```

Listing 3-9: Typical child-process creation

This basic implementation spawns a child process of cmd.exe with the arguments "These are my sensitive arguments." When the process is executed, any standard process-monitoring tool should see this child process and its unmodified arguments by reading them from the PEB. For example, in Figure 3-3, we use a tool called Process Hacker to extract command line parameters.

42    Chapter 3

---

![Figure](figures/EvadingEDR_page_069_figure_000.png)

Figure 3-3: Command line arguments retrieved from the PEB

As expected, cmd.exe was spawned with our string of five arguments passed to it. Let's keep this example in mind; it will serve as our benign baseline as we start trying to hide our malware.

Chester's blog post describes the following process for modifying the command line arguments used to invoke a process. First, you create the child process in a suspended state using your malicious arguments. Next, you use ntdll1NtQueryInformationProcess() to get the address of the child process's PEB, and you copy it by calling kernel32!ReadProcessMemory(). You retrieve its ProcessParameters field and overwrite the UNICODE_STRING represented by the CommandLine member pointed to by ProcessParameters with spoofed arguments. Lastly, you resume the child process.

Let's overwrite the original arguments from Listing 3-9 with the argument string "Spoofed arguments passed instead." Listing 3-10 shows this behavior in action, with the updates in bold.

```bash
void main()
{
  --snip--
   if (CreateProcessW(
      L"C:\\Windows\\System32\cmd.exe",
      L"These are my sensitive arguments",
      NULL, NULL, FALSE,
      CREATE_SUSPENDED,
      NULL, NULL, &si, &pi))
    {
      --snip--
      LPCWSTR szNewArguments = L"Spoofed arguments passed instead";
      SIZE_T ulArgumentLength = wcslen(szNewArguments) * sizeof(WCHAR);
      if (WriteProcessMemory(
          pi.hProcess,
          pParameters.CommandLine.Buffer,
          (PVOID)szNewArguments,
          ulArgumentLength,
          BulSize))
```

---

```bash
{
            ResumeThread(pi.hThread);
        }
        }
    --snip--
```

Listing 3-10: Overwriting command line arguments

When we create our process, we pass the CREATE_SUSPENDED flag to the function to start it in a suspended state. Next, we need to get the address of the process's parameters in the PEB. We've omitted this code from Listing 3-10 for brevity, but the way to do this is to use ntdll!ntQueryInformationProcess(), passing in the ProcessBasicInformation class form. This should return a PROCESS_BASIC_INFORMATION structure that contains a PebBaseAddress member.

We can then read our child process' PEB into a buffer that we allocate locally. Using this buffer, we extract the parameters and pass in the address of the PEB. Then we use ProcessParameters to copy it into another local buffer. In our code, this final buffer is called pParameters and is cast as a pointer to an RT_USER_PROCESS_PARAMETERS structure. We overwrite the existing parameters with a new string via a call to kernel32!WriteMemory(). Assuming that this all completed without error, we call kernel32!ResumeThread() to allow our suspended child process to finish initialization and begin executing.

Process Hacker now shows the spoofed argument values, as you can see in Figure 3-4.

![Figure](figures/EvadingEDR_page_070_figure_005.png)

Figure 3-4: Command line arguments overwritten with spoofed values

While this technique remains one of the more effective ways to evade detection based on suspicious command line arguments, it has a handful of limitations. One such limitation is that a process can't change its own command line arguments. This means that if we don't have control of the parent process, as in the case of an initial access payload, the process must execute with the original arguments. Additionally, the value used to overwrite the suspicious arguments in the PEB must be longer than the original value. If it is shorter, the overwrite will be incomplete, and portions of the suspicious arguments will remain. Figure 3 - 4 shows this limitation in action.

44 Chapter 3

---

![Figure](figures/EvadingEDR_page_071_figure_000.png)

Figure 3-5: Command line arguments partially overwritten

Here, we have shortened our arguments to the value "Spoofed arguments." As you can see, it replaced only part of the original arguments. The inverse is also true: if the length of the spoofed value is greater than that of the original arguments, the spoofed arguments will be truncated.

## Parent Process ID Spoofing

Nearly every EDR has some way of correlating parent-child processes on the system. This allows the agent to identify suspicious process relationships, such as Microsoft Word spawning mndll32.exe , which could indicate an attacker's initial access or their successful exploitation of a service.

Thus, in order to hide malicious behavior on the host, attackers often wish to spoof their current process's parent. If we can trick an EDR into believing that our malicious process creation is actually normal, we're substantially less likely to be detected. The most common way to accomplish this is by modifying the child's process and thread attribute list, a technique popularized by Didier Stevens in 2009. This evasion relies on the fact that, on Windows, children inherit certain attributes from parent processes, such as the current working directory and environment variables. No dependencies exist between parent and child processes; therefore, we can specify a parent process somewhat arbitrarily, as this section will cover.

To better understand this strategy, let's dig into process creation on Windows. The primary API used for this purpose is the aptly named


kernel32!CreateProcess() API. This function is defined in Listing 3-11.

```bash
BOOL CreateProcessWk(
    LPCWSTR        lpApplicationName,
    LPWSTR         lpCommandLine,
    LPSECURITY_ATTRIBUTES   lpProcessAttributes,
    LPSECURITY_ATTRIBUTES  lpThreadAttributes,
    BOOL             bInheritHandles,
    DWORD             dwCreationFlags,
    LPVOID           lpEnvironment,
    LPCWSTR        lpCurrentDirectory,
    LSTARTUPINFOW     lpStartupInfo,
    LPPROCESS_INFORMATION  lpProcessInformation
);
```

Listing 3-11: The kernel32!CreateProcess() API definition

Process- and Thread-Creation Notifications  45

---

The ninth parameter passed to this function is a pointer to a STARTUPINF0 or STARTUPINF0EX structure. The STARTUPINF0EX structure, which is defined in Listing 3-12, extends the basic startup information structure by adding a pointer to a PROC_THREAD_ATTRIBUTE_LIST structure.

```bash
typedef struct _STARTUPINFOEXA {
  STARTUPINFOA           StartupInfo;
  LPRPROC_THREAD_ATTRIBUTE_LIST  lpAttributeList;
} STARTUPINFOEXA, *LPSTARTUPINFOEXA;
```

Listing 3-12: The STARTUPINFOEX structure definition

When creating our process, we can make a call to kernel32!Initialize

ProcThreadAttributeList() to initialize the attribute list and then make a call to kernel32!UpdateProcThreadAttribute() to modify it. This allows us to set custom attributes of the process to be created. When spoofing the parent process, we're interested in the PROC_THREAD_ATTRIBUTE_PARENT_PROCESS attribute, which indicates that a handle to the desired parent process is being passed. To get this handle, we must obtain a handle to the target process, by either opening a new one or leveraging an existing one.

Listing 3-13 shows an example of process spoofing to tie all these pieces together. We'll modify the attributes of the Notepad utility so that VMware Tools appears to be its parent process.

```bash
Void SpoorParent() {
    PCHAR szChildProcess = "notepad";
    DWORD dwParentProcessId = 0; 7648;
    HANDLE hParentProcess = NULL;
    STARTUPINFOEXA si;
    PROCESS_INFOACTION pi;
    SIZE_T ulSize;
    memset(&si, 0, sizeof(STARTUPINFOEXA));
    si.StartupInfo.cb = sizeof(STARTUPINFOEXA);
  ® hParentProcess = OpenProcess(
        PROCESS_CREATE_PROCESS,
        FALSE,
        dwParentProcessId);
  ® InitializeProcThreadAttributeList(NULL, 1, 0, &ulSize);
        si.lpAttributeList =
        ® (LPPROC_THREAD_ATTRIBUTE_LIST)HeapAlloc(
            GetProcessHeap(),
            0, ulSize);
    InitializeProcThreadAttributeList(si.lpAttributeList, 1, 0, &ulSize);
  ® UpdateProcThreadAttribute(
        si.lpAttributeList,
        0,
        PROC_THREAD_ATTRIBUTE_PARENT_PROCESS,
```

46 Chapter 3

---

```bash
&hParentProcess,
        sizeof(HANDLE),
        NULL, NULL;
    CreateProcessA(NULL,
        szChildProcess,
        NULL, NULL, FALSE,
        EXTENDED_STARTUPINFO_PRESENT,
        NULL, NULL,
        &si_StartupInfo, &pi);
    CloseHandle(hParentProcess);
    DeleteProcThreadAttributeList(si.lpAttributeList);
```

Listing 3-13: An example of spoofing a parent process

We first hardcode the process ID ❶ of vmtoold.exe, our desired parent. In the real world, we might instead use logic to find the ID of the parent we'd like to spoof, but I've opted not to include this code in the example for the sake of brevity. Next, the $pffontent() function makes a call to kernel32!OpenProcess() ❷. This function is responsible for opening a new handle to an existing process with the access rights requested by the developer. In most offensive tools, you may be used to seeing this function used with arguments like PROCESS_OK_READ, to read the process's memory, or PROCESS_ALL_ACCESS, which gives us full control over the process. In this example, however, we request PROCESS_CREATE_PROCESS. We'll need this access right in order to use the target process as a parent with our eXternal startup information structure. When the function completes, we'll have a handle to vmtoold.exe with the appropriate rights.

The next thing we need to do is create and populate the PROC_THREAD ATTRIBUTE_LIST structure. To do this, we use a pretty common Windows programming trick to get the size of a structure and allocate the correct amount of memory to it. We call the function to initialize the attribute list ❶ , passing in a null pointer instead of the address of the real attribute list. However, we still pass in a pointer to a DWORD , which will hold the size required after completion. We then use the size stored in this variable to allocate memory on the heap with kernel32[HeapAlloc() ❸ ]. Now we can call the attribute list initialization function again, passing in a pointer to the heap allocation we just created.

At this point, we're ready to start spoofing. We do this by first calling the function for modifying the attribute list and passing in the attribute list itself, the flag indicating a handle to the parent process, and the handle we opened to vmtoolsd.exe . This sets vmtoolsd.exe as the parent process of whatever we create using this attribute list. The last thing we need to do with our attribute list is pass it as input to the process-creation function, specifying the child process to create and the EXENDED_STARTUPINFO_PRESENT flag. When this function is executed, notepad.exe will appear to be a child of vmtoolsd.exe in Process Hacker rather than a child of its true parent, ppid-spoof.exe (Figure 3 -6).

---

![Figure](figures/EvadingEDR_page_074_figure_000.png)

Figure 3-6: A spoofed parent process in Process Hacker

Unfortunately for adversaries, this evasion technique is relatively simple to detect in a few ways. The first is by using the driver. Remember that the structure passed to the driver on a process-creation event contains two separate fields related to parent processes: ParentProcessId and CreatingThreadId . While these two fields will point to the same process in most normal circumstances, when the parent process ID (PPID) of a new process is spoofed, the CreatingThreadId.UniqueProcess field will contain the PID of the process that made the call to the process-creation function. Listing 3-14 shows the output from a mock EDR driver captured by DbgView, a tool used to capture debug print messages.

```bash
12.67045498 Process Name: notepad.exe
12.67045593 Process ID: 7892
12.67045593 Parent Process Name: wmtoolsd.exe
12.67045593 Parent Process ID: 7028
12.67045689 Creator Process Name: ppid-spoof.exe
12.67045784 Creator Process ID: 7708
```

Listing 3-14: Capturing parent and creator process information from a driver

You can see here that the spoofed vmtoolsd.exe shows up as the parent process, but the creator (the true process that launched notepad.exe) is identified as ppid-spoof.exe.

Another approach to detecting PPID spoofing uses ETW (a topic we'll explore further in Chapter 8). F-Secure has extensively documented this technique in its “Detecting Parent PID Spoofing” blog post. This detection strategy relies on the fact that the process ID specified in the ETW event header is the creator of the process, rather than the parent process specified in the event data. Thus, in our example, defenders could use an ETW trace to capture process-creation events on the host whenever notepad.exe is spawned. Figure 3 - 7 shows the resulting event data.

![Figure](figures/EvadingEDR_page_074_figure_007.png)

Figure 3-7: A spoofed parent process in ETW event data

48 Chapter 1

---

Highlighted in Figure 3-7 is the process ID of vmtoold.exe, the spoofed parent. If you compare this to the event header, shown in Figure 3-8, you can see the discrepancy.

![Figure](figures/EvadingEDR_page_075_figure_001.png)

Figure 3.8: A creator process ID captured in an ETW event header

Note the difference in the two process IDs. While the event data had the ID of vmtoolid.exe, the header contains the ID of ppid-spool.exe, the true creator,

The information from this ETW provider isn't quite as detailed as the information provided to us by the mock EDR driver in Listing 3-14. For example, we're missing the image name for both the parent and creator processes. This is because the ETW provider doesn't derive that information for us, like the driver does. In the real world, we'd likely need to add a step to retrieve that information, by either querying the process or pulling it from another data source. Regardless, we can still use this technique as a way to detect PIPID spoofing, as we have the core piece of information needed for the strategy: mismatched parent and creator process IDs.

## Process-Image Modification

In many cases, malware wishes to evade image-based detection, or detections built on the name of the file being used to create the process. While there are many ways to accomplish this, one tactic, which we'll call process-image modification , has gained substantial traction since 2017, although prolific threat groups have used it since at least 2014. In addition to hiding the execution of the malware or tooling, this tactic could allow attackers to bypass application whitelisting, evade per-application host firewall rules, or pass security checks against the calling image before a server allows a sensitive operation to occur.

This section covers four process-image modification techniques, namely hollowing, doppelgängung, herpaderping, and ghosting, all of which achieve their goal in roughly the same way: by remapping the host process's original image with its own. These techniques also all rely on the same design decision made by Microsoft while implementing the logic for notifying registered callbacks of a process being created.

The design decision is this: process creation on Windows involves a complex set of steps, many of which occur before the kernel notifies any

Process- and Thread-Creation Notifications 49

---

drivers. As a result, attackers have an opportunity to modify the process's attributes in some way during those early steps. Here is the entire processcreation workflow, with the notification step shown in bold:

- 1. Validate parameters passed to the process-creation API.
2. Open a handle to the target image.
3. Create a section object from the target image.
4. Create and initialize a process object.
5. Allocate the PEB.
6. Create and initialize the thread object.
7. Send the process-creation notification to the registered callbacks.
8. Perform Windows subsystem-specific operations to finish initialization.
9. Start execution of the primary thread.

10. Finalize process initialization.
11. Start execution at the image entry point.
12. Return to the caller of the process-creation API.
The techniques outlined in this section take advantage of step 3, in which the kernel creates a section object from the process image. The memory manager caches this image section once it is created, meaning that the section can deviate from the corresponding target image. Thus, when the driver receives its notification from the kernel process manager, the


FileObject member of the PS_CREATE_NOTIFY_INFO structure it processes may

not point to the file truly being executed. Beyond exploiting this fact, each of the following techniques has slight variations.

## Hollowing

Hollowing is one of the oldest ways of leveraging section modification, dating back to at least 2011. Figure 3-9 shows the execution flow of this technique:

![Figure](figures/EvadingEDR_page_076_figure_005.png)

Figure 3-9: The execution flow of process hallowing

Using this technique, the attacker creates a process in a suspended state, then unmaps its image after locating its base address in the PEB. Once the unmapping is complete, the attacker maps a new image, such as

50    Chapter 3

---

the adversary's shellcode runner, to the process and aligns its section. If this succeeds, the process resumes execution.

## Doppelgängung

In their 2017 Black Hat Europe presentation "Lost in Transaction: Process Doppelgängung" Tal Liberman and Eugene Kogan introduced a new variation on process-image modification. Their technique, process doppelgängung, relies on two Windows features: Transactional NTFS (TxF) and the legacy process-creation API, ntdll1NtCreateProcessEx().

TxF is a now-deprecated method for performing filesystem actions as a single atomic operation. It allows code to easily roll back file changes, such as during an update or in the event of an error, and has its own group of supporting APIs.

The legacy process-creation API performed process creation prior to the release of Windows 10, which introduced the more robust ndllllllCreateUser Process(). While it's deprecated for normal process creation, you'll still find it used on Windows 10, in versions up to 20H2, to create minimal processes. It has the notable benefit of taking a section handle rather than a file for the process image but comes with some significant challenges. These difficulties stem from the fact that many of the process-creation steps, such as writing process parameters to the new process's address space and creating the main thread object, aren't handled behind the scenes. In order to use the legacy process-creation function, the developer must re-create those missing steps in their own code to ensure that the process can start.

Figure 3-10 shows the complex flow of process doppelgänging.

![Figure](figures/EvadingEDR_page_077_figure_006.png)

Figure 3-10: The execution flow of process doppelgänging

In their proof of concept, Liberman and Kogan first create a transaction object and open the target file with kerase321Create11ETransacted(). They then overwrite this transacted file with their malicious code, create an image section that points to the malicious code, and roll back the transaction with kerase321RollbackTransaction(). At this point, the executable has been restored to its original state, but the image section is cached with the malicious code. From here, the authors call ndll19tCreateProcessEx(), passing in the section handle as a parameter, and create the main thread pointing to the entry point of their malicious code. After these objects are created, they resume the main thread, allowing the dopeqqingaced process to execute.

Process- and Thread-Creation Notifications      51

---

## Herpaderping

Process herpadepping, invented by Johnny Shaw in 2020, leverages many of the same tricks as process doppelganging, namely its use of the legacy process-creation API to create a process from a section object. While herpadepping can evade a driver's image-based detections, its primary aim is to evade detection of the contents of the dropped executable. Figure 3 - 11 shows how this technique works.

![Figure](figures/EvadingEDR_page_078_figure_002.png)

Figure 3-11: The execution flow of process herpaderping

To perform heradepending, an attacker first writes the malicious code to be executed to disk and creates the section object, leaving the handle to the dropped executable open. They then call the legacy process-creation API, with the section handle as a parameter, to create the process object. Before initializing the process, they obscure the original executable dropped to disk using the open file handle and kerere3219Write() or a similar API. Finally, they create the main thread object and perform the remaining process spin-up tasks.

At this point, the driver's callback receives a notification, and it can scan the file's contents using the fileObject member of the structure passed to the driver on process creation. However, because the file's contents have been modified, the scanning function will retrieve bogus data. Additionally, closing the file handle will send an IRP _ M_CLEANUP 1/O control code to any filesystem minifilters that have been registered. If the minifilter wishes to scan the contents of the file, it will meet the same fate as the driver, potentially resulting in a false-negative scan result.

## Ghosting

One of the newest variations on process-image modification is process ghosting, released in June 2021 by Gabriel Landau. Process ghosting relies on the fact that Windows only prevents the deletion of files after they're mapped into an image section and doesn't check whether an associated section actually exists during the deletion process. If a user attempts to open the mapped executable to modify or delete it, Windows will return an error. If the developer marks the file for deletion and then creates the image section from the executable, the file will be deleted when the file handle is closed, but the section object will persist. This technique's execution flow is shown in Figure 3 - 12 .

52    Chapter 3

---

![Figure](figures/EvadingEDR_page_079_figure_000.png)

Figure 3-12: The process-ghosting workflow

To implement this technique in practice, malware might create an empty file on disk and then immediately put it into a delete-pending state using the mdtll\NTSetInformationFile() API. While the file is in this state, the malware can write its payload to it. Note that external requests to open the file will fail, with ERROR_DELETE_PENDING , at this point. Next, the malware creates the image section from the file and then closes the file handle, deleting the file but preserving the image section. From here, the malware follows the steps to create a new process from a section object described in previous examples. When the driver receives a notification about the process creation and attempts to access the FILE OBJECT backing the process (the structure used by Windows to represent a file object), it will receive a STATUS_FILEDeleted error, preventing the file from being inspected.

## Detection

While process-image modification has a seemingly endless number of variations, we can detect all of these using the same basic methods due to the technique's reliance on two things: the creation of an image section that differs from the reported executable, whether it is modified or missing, and the use of the legacy process-creation API to create a new, non-minimal process from the image section.

Unfortunately, most of the detections for this tactic are reactive, occurring only as part of an investigation, or they leverage proprietary tooling. Still, by focusing on the basics of the technique, we can imagine multiple potential ways to detect it. To demonstrate these methods, Aleksandra Doniec (@hasherezade) created a public proof of concept for process ghosting that we can analyze in a controlled environment. You can find this file, proc _ ghostify6.exe , at https://github.com/hasherezade/ process _ ghosting _ releases . Yes that SHA-256 hash matches the following: 8a74a522e9ea27770803c0b95df8bea4c4c17f4aa487c64a489188bfdf6855 .

First, in kernel mode, the driver could search for information related to the process's image either in the PEB or in the corresponding PROCESS structure, the structure that represents a process object in the kernel. Because the user can control the PEB, the process structure is a better

---

source. It contains process-image information in a number of locations, described in Table 3-1.

Table 3-1: Process-Image Information Contained in the EPROCESS Structure

<table><tr><td>Location</td><td>Process-image information</td></tr><tr><td>ImageFileName</td><td>Contains only the filename</td></tr><tr><td>ImageFilePointer.FileName</td><td>Contains the rooted Win32 filepath</td></tr><tr><td>SeAuditProcessCreationInfo .ImageFileName</td><td>Contains the full NT path but may not always be populated</td></tr><tr><td>ImagePathHash</td><td>Contains the hashed NT, or canonicalized, path via nt!P!CalculateProcessHash()</td></tr></table>


Drivers may query these paths by using APIs such as nt!SloateProcess ImageName() or nt!QueryInformationProcess() to retrieve the true image path, at which point they still need a way to determine whether the process has been tampered with. Despite being unreliable, the PEB provides a point of comparison. Let's walk through this comparison using WinDbg. First, we attempt to pull the image's filepath from one of the process structure's fields (Listing 3-15).

```bash
0: kd> dt nt!\EPROCESS SeAuditProcessCreationInfo $@proc
+0x5c0 SeAuditProcessCreationInfo : $SE_AUDIT_PROCESS_CREATION_INFO
0: kd> dt (nt!\OBJECT_NAME_INFORMATION *) @$proc+0x5c0
0xffff9b8f' 96880270
+0x000 Name        : _UNICODE_STRING ""
```

Listing 3-15: Pulling the filepath from SeAuditProcessCreationInfo

Interestingly, WinDbg returns an empty string as the image name. This is atypical; for example, Listing 3-16 returns what you'd expect to see in the case of an unmodified notepad.exe.

```bash
/*-+----------------------
1: kd> dt (ntlBJECT_NAME_INFORMATION *) @$pro<0x5C0
Breakpoint 0 hit
0xfffff9b8f'995e6170
             :_UNICODE_STRING
"Device\HarddiskVolume2\Windows\System32\notepad.exe"
```

Listing 3-16: The UNICODE_STRING field populated with the NT path of the image

Let's also check another member of the process structure, ImageFileName. While this field won't return the full image path, it still provides valuable information, as you can see in Listing 3-17.

```bash
0: kd\ dt ntl_EPROCESS ImageFileName @$proc
+0x5a8 ImageFileName : [15] "THFAB.tmp"
```

Listing 3-17: Reading the ImageFileName member of the EPROCESS structure

---

The returned filename should have already attracted attention, as

tmp files aren't very common executables. To determine whether image tampering might have taken place, we'll query the PEB. A few locations in the PEB will return the image path: ProcessParameters.ImagePathName and Ldr .InMemoryOrderModuleList. Let's use WinDbg to demonstrate this (Listing 3-18).

```bash
!    kdt     dt nt!\PebProcessParameters#pebep
    +0x020  ProcessParameters:   0x000001c1 c9a71b80  RTL_USER_PROCESS_PARAMETERS
!    kdt     dt nt!\RTL_USER_PROCESS_PARAMETERS ImagePathName poi(#pebep+0x20)
    +0x060  ImagePathName:   UNICODE_STRING "C:\Windows\System32\notepad.exe"
```

Listing 3-18: Extracting the process image's path from ImagePathName

As shown in the WinDbg output, the PEB reports the process image's path as C:\Windows\System32\notepad.exe. We can verify this by querying the Ldr_ImMemoryOrderModuleList field, shown in Listing 3-19.

```bash
1: kd> 1peb
PEB at 000002d609b9000
   InheritedAddressSpace:    No
     ReadImageFileExecOptions: No
     BeingDebugged:        No
       ImageBaseAddress:      00007ff60edc0000
       NtGlobalFlag:        0
       NtGlobalFlag2:       0
       Ldr:                  00007ff74c1a4c0
       Ldr.Initialized:      Yes
       Ldr.InInitializationOrderModuleList: 000001c1c9a72310, 000001c1c9aa7f50
       Ldr.InLoadOrderModuleList:      000001c1c9a72300, 000001c1c9aa8520
       Ldr.InMemoryOrderModuleList:      000001c1c9a72310, 000001c1c9aa8130
             Base Module
             0 7ff60edc0000 C:\WINDOWS\system32\notepad.exe
```

Listing 3-19: Extracting the process image’s path from InMemoryOrderModuleList

You can see here that notepad.exe is the first image in the module list . In my testing, this should always be the case. If an EDR found a mismatch like this between the image name reported in the process structures and in the PEB, it could reasonably say that some type of process-image tampering had occurred. It couldn't, however, determine which technique the attacker had used. To make that call, it would have to collect additional information.

The EDR might first try to investigate the file directly, such as by scanning its contents through the pointer stored in the process structure's ImageFilePointer field. If malware created the process by passing an image section object through the legacy process-creation API, as in the proof of concept, this member will be empty (Listing 3-20).

```bash
1: kd> dt ntl_EPOCH EPOCH ImageFilePointer @$proc
    +0x5a0 ImageFilePointer : (null)
```

Listing 3-20: The empty ImageFilePointer field

Process- and Thread-Creation Notifications 55

---

The use of the legacy API to create a process from a section is a major indicator that something weird is going on. At this point, the EDR can reasonably say that this is what happened. To support this assumption, the EDR could also check whether the process is minimal or pico (derived from a minimal process), as shown in Listing 3-21.

```bash
1: kd> dt ntl_EPROCESS Minimal PicoCreated @$proc
+0x460 PicoCreated : 0y0
+0x87c Minimal      : 0y0
```

Listing 3-21: The Minimal and PicoCreated members set to false

Another place to look for anomalies is the virtual address descriptor (VAD) tree used for tracking a process's contiguous virtual memory allocations. The VAD tree can provide very useful information about loaded modules and the permissions of memory allocations. The root of this tree is stored in the VadRoot member of the process structure, which we can't directly retrieve through a Microsoft-supplied API, but you can find a reference implementation in Blackbone, a popular driver used for manipulating memory.

To detect process-image modifications, you'll probably want to look at the mapped allocation types, which include READONLY file mappings, such as the COM+ catalog files (for example, C:\Windows\Registration\RXXXXxx\ ebb), and EXECUTE_WRITECOPY* executable files. In the VAD tree, you'll commonly see the Win32-rooted path for the process image (in other words, the executable file that backs the process as the first mapped executable). Listing 3-22 shows the truncated output of WinDbg's tvaD command.

```bash
0: kd\lvad
VAD        Commit
ffffaa207d5c88400 7 Mapped   NO_ACCESS      Pagefile section, shared commit 0x1293
ffffaa207d5c89340 6 Mapped   Exe EXECUTE.WRITECOPY \Windows\System32\notepad.exe
ffffaa207d976c90 4 Mapped   Exe EXECUTE_WRITECOPY \Windows\System32\oleacc.dll
```

Listing 3-22: The output of the !vad command in WinDbg for a normal process

The output of this tool shows mapped allocations for an unmodified


nptuple.exe process. Now let's see how they look in a ghosted process


(Listing 3-23).

```bash
0: kd\ lvad
VAD          Commit
ffffffff2a7dc96860 2 Mapped    NO_ACCESS      Pagefile section, shared commit 0x1293
ffffffff2a7dc967c0 6 Mapped Exec EXECUTE_WRITECOPY  \Users\dev\AppData\Local\Temp\THF53.tmp
ffffffff2a7dc95a00 9 Mapped Exec EXECUTE_WRITECOPY  \Windows\System32\gdj32\full.dl\
```

Listing 3-23: The output of the !vad command for a ghosted process

This mapped allocation shows the path to the .tmp file instead of the path to ./notepad.exe.

56    Chapter 3

---

Now that we know the path to the image of interest, we can investigate it further. One way to do this is to use the mdtllNTQueryInformationFile() API with the fileStandardInformation class, which will return a FILE_STANDARD_ INFORMATION structure. This structure contains the DeletePending field, which is a Boolean indicating whether the file has been marked for deletion.

Under normal circumstances, you could also pull this information from the DeletePending member of the FILE_OBJECT structure. Inside the EPDOCSS structure for the relevant process, this is pointed to by the ImageFilePointer member. In the case of the ghosted process, this pointer will be null, so the EDR can't use it. Listing 3-24 shows what a normal process's image file pointer and deletion status should look like.

```bash
2: kd> dt nt!\_EPROCESS ImageFilePointer @pproc
  +0x5a0 ImageFilePointer: 0xffffad8b a3664200 FILE_OBJECT
2: kd> dt nt!\_FILE_OBJECT DeletePending 0xffffad8b a3664200
+0x049 DeletePending: 0 ¨´
```

Listing 3-24: Normal ImageFilePointer and DeletePending members

This listing is from a notepad.exe process executed under normal conditions. In a ghosted process, the image file pointer would be an invalid value, and thus, the deletion status flag would also be invalid.

After observing the difference between a normal instance of nopad.exe and one that has been ghosted, we've identified a few indicators:

- • There will be a mismatch between the paths in the ImagePathName inside
the ProcessParameters member of the process's PEB and the ImageFileName
in its EPROCESS structure.

• The process structure's image file pointer will be null and its Minimal
and PicoCreated fields will be false .

• The filename may be atypical (this isn't a requirement, however, and
the user can control this value).
When the EDR driver receives the new process-creation structure from its process-creation callback, it will have access to the key information needed to build a detection. Namely, in the case of process ghosting, it can use ImageFileName , fileObject , and IsSubsystemProcess to identify potentially ghosted processes. Listing 3-25 shows what this driver logic could look like.

```bash
void ProcessCreationNotificationCallback(
    PEPROCESS pProcess,
    HANDLE hPic,
    PPS_CREATE_NOTIFY_INFO psNotifyInfo)
{
   if (pNotifyInfo)
{
     ¶ if (!pNotifyInfo->FileObject && !pNotifyInfo->IsSubsystemProcess)
     {
        PUNICODE_STRING pPebImage = NULL;
        PUNICODE_STRING pPebImageNtPath = NULL;
        Process_and_Thread_Creation_Notifications  57
```

---

```bash
UNICODE_STRING pProcessImageNtPath = NULL;
        ⃝ GetPebImagePath(pProcess, pPebImage);
        CovertPathToNt(pPebImage, pPebImageNtPath);
        ⃝ CovertPathToNt(psNotifyInfo->ImageFileName, pProcessImageNtPath);
        {
            --snip--
        }
    }
  --snip--
    }
```

Listing 3-25: Detecting ghosted processes with the driver

We first check whether the file pointer is null even though the process being created isn't a subsystem process ❶ , meaning it was likely created with the legacy process-creation API. Next, we use two mock helper functions ❷ to return the process image path from the PEB and convert it to the NT path. We then repeat this process using the image filename from the process structure for the newly created process ❸ . After that, we compare the image paths in the PEB and process structure. If they're not equal, we've likely found a suspicious process, and it's time for the EDR to take some action.

## A Process Injection Case Study: fork&run

Over time, shifts in attacker tradecraft have affected the importance, to EDR vendors, of detecting suspicious process-creation events. After gaining access to a target system, attackers may leverage any number of commandand-control agents to perform their post-exploitation activities. Each malware agent's developers must decide how to handle communications with the agent so that they can execute commands on the infected system. While there are numerous approaches to tackling this problem, the most common architecture is referred to as fork & run .

Fork & run works by spawning a sacrificial process into which the primary agent process injects its post-exploitation tasking, allowing the task to execute independently of the agent. This comes with the advantage of stability; if a post-exploitation task running inside the primary agent process has an unhandled exception or fault, it could cause the agent to exit. As a result, the attacker could lose access to the environment.

The architecture also streamlines the agent's design. By providing a host process and a means of injecting its post-exploitation capabilities, the developer makes it easier to integrate new features into the agent. Additionally, by keeping post-exploitation tasking contained in another

58    Chapter 3

---

process, the agent doesn't need to worry too much about cleanup and can instead terminate the sacrificial process altogether.

Leveraging forkkrun in an agent is so simple that many operators might not even realize they're using it. One of the most popular agents that makes heavy use of forkkrun is Cobalt Strike's Beacon. Using Beacon, the attacker can specify a sacrificial process, either through their Malleable profile or through Beacon's integrated commands, into which they can inject their post-exploitation capabilities. Once the target is set, Beacon will spawn this sacrificial process and inject its code whenever a post-exploitation job that requires forkkrun is queued. The sacrificial process is responsible for running the job and returning output before exiting.

However, this architecture poses a large risk to operational security. Attackers now have to evade so many detections that leveraging the builtin features of an agent like Beacon often isn't viable. Instead, many teams now use their agent only as a method for injecting their post-exploitation tooling code and maintaining access to the environment. An example of this trend is the rise of offensive tooling written in C# and primarily leveraged through Beacon's execute-assembly , a way to execute .NET assemblies in memory that makes use of fork/run under the hood.

Because of this shift in tradecraft, EDRs highly scrutinize process creation from numerous angles, ranging from the relative frequency of the parent-child relationship in the environment to whether the process's image is a .NET assembly. Yet, as EDR vendors became better at detecting the "create a process and inject into it" pattern, attackers have begun to consider spawning a new process to be highly risky and have looked for ways to avoid doing it.

One of the biggest challenges for EDR vendors came in version 4.1 of Cobalt Strike, which introduced Beacon Object Files (BOFs). BOFs are small programs written in C that are meant to be run in the agent process, avoiding fork/run entirely. Capability developers could continue to use their existing development process but leverage this new architecture to achieve the same results in a safer manner.

If attackers remove the artifacts from fork&run, EDR vendors must rely on other pieces of telemetry for their detections. Fortunately for vendors, BOFs only remove the process-creation and injection telemetry related to the sacrificial process creation. They don't do anything to hide the postexploitation tooling's artifacts, such as network traffic, filesystem interactions, or API calls. This means that, while BOFs do make detection more difficult, they are not a silver bullet.

## Conclusion

Monitoring the creation of new processes and threads is an immensely important capability for any EDR. It facilitates the mapping of parent–child relationships, the investigation of suspect processes prior to their execution, and the identification of remote thread creation. Although Windows

Process- and Thread-Creation Notifications  59

---

provides other ways to obtain this information, process- and thread-creation callback routines inside the EDR's driver are by far the most common. In addition to having a great deal of visibility into activity on the system, these callbacks are challenging to evade, relying on gaps in coverage and blind spots rather than fundamental flaws in the underlying technology.

60    Chapter 3

---

