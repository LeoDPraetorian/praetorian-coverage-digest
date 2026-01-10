## 13  CASE STUDY: A DETECTION- AWARE ATTACK

![Figure](figures/EvadingEDR_page_265_figure_001.png)

So far, we've covered the design of EDRs, the logic of their components, and the internal workings of their sensors. Still, we've missed one critical piece of the puzzle:

how to apply this information in the real world. In this final chapter, we'll systematically analyze the actions we'd like to take against target systems and determine our risk of being detected.

We'll target a fictional company, Binford Tools, inventor of the Binford 6100 left-handed screwdriver. Binford has asked us to identify an attack path from a compromised user workstation to a database holding the proprietary design information for the 6100. We're to be as stealthy as possible so that the company can see what its EDR is able to detect. Let's get started.

---

## The Rules of Engagement

Binford's environment consists only of hosts running up-to-date versions of the Windows operating system, and all authentication is controlled through on-premises Active Directory. Each host has a generic EDR deployed and running, and we aren't allowed to disable, remove, or uninstall it at any point.

Our point of contact has agreed to provide us with a target email address, which an employee (whom we'll refer to as the white cell ) will monitor, clicking whatever links we send to them. However, they won't add any rule explicitly allowing our payloads past their EDR. This will let us spend less time on social engineering and more time assessing technical detective and preventive measures.

Additionally, every employee at Binford has local administrator rights to their workstation, lowering the strain on Binford's understaffed help desk. Binford has asked that we leverage this fact during the operation so that they can use the results of the engagement to drive a change to their policy.

## Initial Access

We begin by selecting our phishing method. We need fast and direct access to the target's workstation, so we opt to deliver a payload. Threat intelligence reporting at the time of the engagement tells us that the manufacturing sector is experiencing an uptick in malware dropped using Excel Add-In (XLI) files. Attackers have routinely abused XLI files, which allow developers to create high-performance Excel worksheet functions, to establish a foothold through phishing.

To mimic attacks Binford may respond to in the future, we opt to use this format as our payload. XLL files are really just DLLs that are required to export an xla$\to\open() function (and, ideally, its complement, xla$\to\close()), so we can use a simple shellcode runner to speed up the development process.

## Writing the Payload

Already, we must make a detection-related design decision. Should the shellcode be run locally, in the excel.exe process, where it will be tied to the lifetime of that process, or should it be run remotely? If we created our own host process and injected into it, or if we targeted an existing process, our shellcode could live longer but have a higher risk of detection due to excel.exe spawning a child process and the artifacts of remote process injection being present.

As we can always phish more later, we'll opt to use the local runner and avoid prematurely tripping any detections. Listing 13-1 shows what our XLL payload code looks like.

---

```bash
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
BOOL APIENTRY DllMain( HMODULE hModule,
                          DWORD   ul_reason_for_call,
                          LPVOID  lpReserved
                          )
{
    switch (ul_reason_for_call)
    {
    case DLL_PROCESS_ATTACH:
    case DLL_THREAD_ATTACH:
    case DLL_THREAD_DETACH:
    case DLL_PROCESS_DETACH:
        break;
    }
    return TRUE;
}
extern "C"
__declspec(dllexport) short __stdcall xlAutoOpen()
{
  const char shellcode[] = --snip--
    const size_t lenShellcode = sizeof(shellcode);
    char decodedShellcode[lenShellcode];
  const char key[] = "specter";
    int j = 0;
    for (int i = 0; i < lenShellcode; i++)
    {
        if (j == sizeof(key) - i)
        {
            j = 0;
        }
  const decodedShellcode[i] = shellcode[i] ^ key[j];
    j++;
  }
  PVOID runIt = VirtualAlloc(0,
        lenShellcode,
        MEM_COMMIT,
        PAGE_READWRITE);
    if (runIt == NULL)
        {
        return 1;
    }
  @ memcpy(runIt,
        decodedShellcode,
        lenShellcode);
```

Case Study: A Detection-Aware Attack 241

---

```bash
DWORD oldProtect = 0;
  © VirtualProtect(runIt,
        lenShellcode,
        PAGE_EXECUTE_READ,
        &oldProtect);
  © CreateThread(NULL,
        NULL,
        (LPTHREAD_START_ROUTINE)runIt,
        NULL,
        NULL);
    Sleep(1337);
    return 0;
}
```

Listing 13-1: The XLI payload source code

This local shellcode runner is similar to many DLL-based payloads. The exported x!uto0pen() function begins with a chunk of shellcode (truncated for brevity) ❶ that has been XOR-encrypted using the string specter as the key ❷ . The first action this function takes is decrypting the shellcode using this symmetric key ❸ . Next, it creates a memory allocation tagged with read-write permissions using kernel32!f!eatureU1ac() ❹ and then copies the decrypted shellcode into it ❸ ahead of execution. The function then changes the memory permissions of the new buffer to tag it as executable ❸ . Finally, the pointer to the buffer is passed to kernel32!f!eatureThread() , which executes the shellcode in a new thread ❸ still under the context of exec.exe .

## Delivering the Payload

We'll assume that Binford's inbound mail-filtering system allows XLL files to reach users' inboxes, and we send our file to the white cell. Because the XLL needs to be run from disk, the white cell will download it to the internal host on which the EDR is deployed.

When the white cell executes the XLL, a few things will happen. First, excel.exe will be started with the path to the XLL passed in as a parameter. The EDR almost certainly collects this information from its driver's process creation callback routine (though the Microsoft-Windows-Kernel-Process ETW provider can provide most of the same information). The EDR may have a generic detection built around the execution of XLL files, which the process command line could trigger, causing an alert.

Additionally, the EDR's scanner may conduct an on-access scan of the XLL file. The EDR will collect attributes of the file, assess its contents, and attempt to decide whether the content should be allowed to run. Let's say that we did such a great job obfuscating our payload that the shellcode and associated runner inside weren't detected by the scanner.

We're not in the clear yet, though. Remember that most EDRs are deployed in multiple large environments and process large amounts of data. With this perspective, EDRs can assess the global uniqueness of a file,

242   Chapter 13

---

meaning how many times it has seen the file in the past. Because we crafted this payload ourselves and it contains shellcode tied to our infrastructure, it most likely hasn't been seen before.

Luckily, this isn't the end of the road by any stretch of the imagination. Users write new Word documents all the time. They generate reports for their organization and doodle in Paint during the third hour of meetings on "cross-functional synergy to meet key quarterly metrics." If EDRs flagged every single unique file they came across, they would create an untenable amount of noise. While our global uniqueness may trigger some type of alert, it probably isn't severe enough to kick off an investigation and won't come into play unless the security operations center (SOC) responds to a higher-severity alert related to our activity.

## Executing the Payload

Since we haven't been blocked yet, exec.exe will load and process our XLL.


As soon as our XLL is loaded, it will hit the DLL_PROCESS_ATTACH reason code, which triggers the execution of our shellcode runner.

When our parent excel.exe process was spawned, the EDR injected its DLL, which hooked key functions unknown to us at this point. We didn't use syscalls or include any logic to remap these hooked DLLs in excel.exe, so we'll have to pass through these hooks and hope we don't get caught. Thankfully, many of the functions commonly hooked by EDRs focus on remote process injection, which doesn't affect us, as we're not spawning a child process to inject into.

We also happen to know that this EDR makes use of the MicrosoftWindows-Threat-Intelligence ETV provider, so our activities will be subject to monitoring by those sensors on top of the EDR vendor's own function hooks. Let's examine the riskiness of the functions we call in our payload:

### kernel32lVirtualAlloc()

Since this is the standard local-memory-allocation function in Windows and doesn't allow for remote allocations (as in, memory being allocated in another process), its use likely won't be scrutinized in isolation. Additionally, because we aren't allocating read-write-execute memory, a common default for malware developers, we've mitigated pretty much all the risk that we can.

### memcpy()

Similar to the previous function, memcpy() is a widely used function and isn't subject to much scrutiny.

### kernel32!VirtualProtect()

This is where things become riskier for us. Because we have to convert the protections for our allocation from read-write to readexecute, this step is unfortunately unavoidable. Since we've passed the desired protection level as a parameter to this function, EDRs can trivially identify this technique via function hooking. Additionally,

Case Study: A Detection-Aware Attack 243

---

the ntETWlogProtectExecVm() sensor will detect the changes in protection state and notify consumers of the Microsoft-Windows-ThreatIntelligence ETW provider.

### kernel32!CreateThread()

In isolation, this function doesn't present much of a risk, as it is the standard way of creating new threads in multithreaded Win32 applications. However, since we've performed the previous three actions, which, combined, may indicate the presence of malware on the system, its use may be the proverbial straw that breaks the camel's back in terms of causing an alert to fire. Unfortunately for us, we don't really have many options to avoid its use, so we'll just stick with it and hope that if we've gotten this far, our shellcode will execute.

This shellcode runner technique could be optimized in plenty of ways, but compared to the textbook kernel32!CreateRemoteThread()-based approach to remote process injection, it's not too bad. If we assume that these indicators fly under the radar of the EDR's sensors, our agent shellcode will execute and begin its process of communicating back to our commandand-control infrastructure.

## Establishing Command and Control

Most malicious agents establish command and control in similar ways. The first message the agent sends to the server is a check-in saying "I'm a new agent running on host X!" When the server receives this check-in, it will reply "Hello agent on host X! Sleep for this period of time, then message me again for tasking." The agent then idles for the time specified by the server, after which it messages it again saying "Back again. This time I'm ready to do some work." If the operator has specified tasking for the agent, the server will pass that information along in some format understood by the agent, and the agent will execute the task. Otherwise, the server will tell the agent to sleep and try again later.

How do command-and-control agents evade network-based detection? Most of the time, the communication happens over HTTPS, the favorite channel of most operators because it lets their messages blend in with the high volume of traffic commonly flowing to the internet over TCP port 443 on most workstations. To use this protocol (and its less-secure sister, HTTP), the communication must follow certain conventions.

For example, a request must have a Uniform Resource Identifier (URI) path for both GET requests, used for retrieving data, and POST requests, used for sending data. While these URIs don't technically have to be the same in each request, many commercial command-and-control frameworks reuse one static URI path. Additionally, the agent and server must have an agreed-upon communication protocol that rides on top of HTTPS. This means that their messages generally follow a similar pattern. For instance, the lengths of check-in requests and polls for tasking will likely be static. They may also be sent at fixed intervals.

244    Chapter 13

---

All of this is to say that, even when command-and-control traffic attempts to blend in among the noise, it still generates strong indicators of beaconing activity. An EDR developer who knows what to look for can use these to pick out the malicious traffic from the benign, probably using the network filter driver and ETW providers such as Microsoft-Windows-WeiBO and MicrosoftWindows-DNS-Client. While the contents of HTTPS messages are encrypted, many important details remain readable, such as the URI paths, headers, message lengths, and the time at which the message was sent.

Knowing this, how do we set up our command and control? Our HTTPS channel uses the domain blahfordtools.com. We purchased this domain a few weeks before the operation, set up DNS to point to a DigitalOcean virtual private server (VPS), and configured an NGINX web server on the VPS to use a LetsEncrypt SSL certificate. GET requests will be sent to the /home/ catalog endpoint and POST requests to /search?q=6100 , which will hopefully blend into normal traffic generated when browsing a tool manufacturer's site. We set our default sleep interval to five minutes to allow us to quickly task the agent without being overly noisy, and we use a jitter of 20 percent to add some variability between request times.

This command-and-control strategy might seem insecure; after all, we're using a newly registered, typo-squared domain hosted on a cheap VPS. But let's consider what the EDR's sensors can actually capture:

- • A suspicious process making an outbound network connection
• Anomalous DNS lookups
Notably missing is all the weirdness related to our infrastructure and indicators of beaconing.

Although the EDR's sensors can collect the data required to determine that the compromised host is connecting to a newly registered, uncategorized domain pointing to a sketchy VPS, actually doing this would mean performing a ton of supporting actions, which could negatively affect system performance.

For example, to track domain categorization, the EDR would need to reach out to a reputation-monitoring service. To get registration information, it would need to query the registrar. Doing all of this for all connections made on the target system would be hard. For that reason, EDR agents typically offload these responsibilities to the central EDR server, which performs the lookups asynchronously and uses the results to fire off alerts if needed.

The indicators of beaconing are missing for nearly the same reasons. If our sleep interval were something like 10 seconds with 10 percent jitter, detecting the beaconing could be as simple as following a rule like this one: "If this system makes more than 10 requests to a website with nine to 11 seconds between each request, fire an alert." But when the sleep interval is five minutes with 20 percent jitter, the system would have to generate an alert anytime the endpoint made more than 10 requests to a website with four to six minutes between each request, which would require maintaining the rolling state of every outbound network connection for between 40 minutes and one hour. Imagine how many websites you visit on a daily basis, and you can see why this function is better suited for the central server.

Case Study: A Detection-Aware Attack 245

---

### Evading the Memory Scanner

The last big threat to the initial access phase of the engagement (as well as any future stages in which we spawn an agent) is the EDR's memory scanner. Like the file scanner, this component seeks to detect the presence of malware on the system using static signatures. Instead of reading the file from disk and parsing its contents, it scans the file after it has been mapped into memory. This allows the scanner to assess the content of the file after it has been de-obfuscated so that it can be passed to the CPU for execution. In the case of our payload, this means our decrypted agent shellcode will be present in memory; the scanner needs only to find it and identify it as malicious.

Some agents include functionality to obscure the presence of the agent in memory during periods of inactivity. These techniques have varying levels of efficacy, and a scanner could still detect the shellcode by catching the agent between one of these sleep periods. Even so, custom shellcode and custom agents are generally harder to detect through static signatures. We'll assume that our bespoke, handcrafted, artisanal command-and-control agent was novel enough to avoid being flagged by the memory scanner.

At this point, everything has worked in our favor: our initial beaonding didn't fire off an alert worthy of the SOC's attention. We've established access to the target system and can begin our post-compromise activities.

## Persistence

Now that we're inside the target environment, we need to make sure we can survive a technical or human-induced loss of connection. At this stage of the operation, our access is so fragile that if something were to happen to our agent, we'd have to start over from the beginning. Therefore, we need to set up some form of persistence that will establish a new command-andcontrol connection if things go south.

Persistence is a tricky thing. There are an overwhelming number of options at our disposal, each with pros and cons. Generally speaking, we're evaluating the following metrics when choosing a persistence technique:

Reliability The degree of certainty that the persistence technique will trigger our action (for example, launching a new command-and-control agent).

Predictability The degree of certainty about when the persistence will trigger

Required permissions The level of access required to set up this persistence mechanism

Required user or system behaviors Any actions that must occur on the system for our persistence to fire, such as a system reboot or a user going idle

---

Detection risks The understood risk of detection inherent to the technique

Let's use the creation of scheduled tasks as an example. Table 13-1 shows how the technique would perform using our metrics. Things seem great initially. Scheduled tasks run like a Rolex and are incredibly easy to set up. The first issue we encounter is that we need local administrator rights to create a new scheduled task, as the associated directory, C:\Windows\System32\Tasks\, can't be accessed by standard users.

Table 13-1: Evaluating Scheduled Tasks as a Persistence Mechanism

<table><tr><td>Metric</td><td>Evaluation</td></tr><tr><td>Reliability</td><td>Highly reliable</td></tr><tr><td>Predictability</td><td>Highly predictable</td></tr><tr><td>Required permissions</td><td>Local administrator</td></tr><tr><td>Required user or system behaviors</td><td>System must be connected to the network at the time of the trigger</td></tr><tr><td>Detection risks</td><td>Very high</td></tr></table>


The biggest issue for us, though, is the detection risk. Attackers have abused scheduled tasks for decades. It would be fair to say that any EDR agent worth its weight would be able to detect the creation of a new scheduled task. As a matter of fact, MITRE's ATT & CK evaluations , a capability-validation process that many vendors participate in every year, uses scheduled-task creation as one of its test criteria for APT3, an advanced persistent threat group attributed to China's Ministry of State Security (MSS). Because remaining stealthy is one of our big goals, this technique is off the table for us.

What persistence mechanism should we choose? Well, nearly every EDR vendor's marketing campaign claims that it covers most cataloged ATT & CK techniques. ATT & CK is a collection of known attacker techniques that we understand well and are tracking. But what about the unknowns the techniques about which we are mostly ignorant? A vendor can't guarantee coverage of these; nor can they be assessed against them. Even if an EDR has the ability to detect these uncatalogued techniques, it might not have the detection logic in place to make sense of the telemetry generated by them.

To lower our likelihood of detection, we can research, identify, and develop these "known unknowns." To that end, let's use shell preview handlers , a persistence technique that I along with my colleague Emily Leidy, published research about in a blog post, "Life Is Pale: Persistence via Preview Handlers." Preview handlers install an application that renders a preview of a file with a specific extension when viewed in Windows Explorer. In our case, the application we register will be our malware, and it will kick off a new command-and-control agent. This process is done almost entirely in the registry; we'll create new keys that register a COM server. Table 13 - 2 evaluates this technique's riskiness.

Case Study: A Detection-Aware Attack 247

---

Table 13-2: Evaluating Shell Preview Handlers as a Persistence Mechanism

<table><tr><td>Metric</td><td>Evaluation</td></tr><tr><td>Reliability</td><td>Highly reliable</td></tr><tr><td>Predictability</td><td>Unpredictable</td></tr><tr><td>Required permissions</td><td>Standard user</td></tr><tr><td>Required user or system behaviors</td><td>User must browse the target file type in Explorer with the preview pane enabled, or the search indexer must process the file</td></tr><tr><td>Detection risks</td><td>Currently low but trivial to detect</td></tr></table>


As you can see, these "known unknowns" tend to trade strengths in some areas for weaknesses in others. Preview handlers require fewer permissions and are harder to detect (though detection is still possible, as their installation requires very specific registry changes to be made on the host). However, they are less predictable than scheduled tasks due to userinteraction requirements. For operations in which detection isn't a significant concern, reliability and usability may trump the other factors.

Say we use this persistence mechanism. In the EDR, sensors are now hard at work collecting telemetry related to the hijacked preview handlers. We had to drop a DLL containing a runner for our backup agent to disk from excel.exe, so the scanner will probably give it a thorough examination, assuming that Excel writing a new DLL isn't suspect enough. We also had to create a ton of registry keys, which the driver's registry-notification callback routine will handle.

Also, the registry-related telemetry our actions generate can be a little difficult to manage. This is because COM object registration can be tricky to pick out from the large volume of registry data, and because it can be challenging to differentiate a benign COM object registration from a malicious one. Additionally, while the EDR can monitor the creation of the new preview-handler registry-key value, as it has a standard format and location, this requires performing a lookup between the class identifier written as the value and the COM object registration associated with that class identifier, which isn't feasible at the sensor level.

Another detection risk is our manual enablement of Explorer's preview pane. This isn't crazy behavior on its own. Users can manually enable or disable the preview pane at any time through their file browser. It can also be enabled across the enterprise via a group policy object. In both of these instances, the process making the change (for example, explorer.exe in the case of manual enablement) is known, meaning that a detection targeting atypical processes setting this registry value may be possible. For excel.exe to make this change would be very much out of the ordinary.

Finally, Explorer has to load our DLL whenever the persistence is triggered. This DLL won't be signed by Microsoft (or likely signed at all). The driver's image-load callback notification routine will be responsible for detecting this DLL being loaded and can investigate the signature, along with other metadata about the image, to tip off the agent to the fact that a

---

piece of malware is about to be mapped into Explorer's address space. Of course, we could mitigate some of this risk by signing our DLL with a valid code-signing certificate, but this is beyond the reach of many threat actors, both real and simulated.

We'll make a trade-off in predictability in favor of lowering our detection risk. We choose to install a preview handler for the .doxc file extension by dropping our handler DLL to disk, performing the requisite COM registration, and manually enabling Explorer's preview pane in the registry if it is not already enabled.

## Reconnaissance

Now that we've established persistence, we can afford to start taking more risks. The next thing we need to figure out is how to get to where we need to go. This is when you must think the hardest about detection because you'll generate vastly different indicators based on what you're doing and how you do it.

We'll need a way to run reconnaissance tooling without detection.


One of my favorite tools for performing local reconnaissance is Seatbelt, a host-based situational awareness tool written by Lee Christensen and Will Schroeder. It can enumerate a ton of information about the current system, including the running processes, mapped drives, and amount of time the system has been online.

A common way to run Seatbelt is to use built-in features of the commandand-control agent, such as Cobalt Strike Beacon's execute-assembly, to execute its .NET assembly in memory. Typically, this involves spawning a sacrificial process, loading the .NET common language runtime into it, and instructing it to run a specified .NET assembly with provided arguments.

This technique is substantially less detection prone than trying to drop the tool onto the target's filesystem and executing it from there, but it's not without risk. In fact, the EDR could catch us in a whole slew of ways:

### Child Process Creation

The EDR's process-creation callback routine could detect the creation of the sacrificial process. If the child of the parent process is atypical, it could trigger an alert.

### Abnormal Module Loading

The sacrificial process spawned by the parent may not typically load the common language runtime if it is an unmanaged process. This may tip off the EDR's image-load callback routine that in-memory .NET tradecraft is being used.

### Common Language Runtime ETW Events

Whenever the common language runtime is loaded and run, it emits events through the Microsoft-Windows-DotNETRuntime ETV provider. This allows EDRs that consume its events to identify key pieces

Case Study: A Detection-Aware Attack 249

---

of information related to the assemblies executing on the system, such as their namespace, class and method names, and Platform Invoke signatures.

### Antimalware Scan Interface

If we've loaded version 4.8 or later of the .NET common language runtime, AMSI becomes a concern for us. AMSI will inspect the contents of our assembly, and each registered provider will have the opportunity to determine whether its contents are malicious.

### Common Language Runtime Hooks

While the technique isn't directly covered in this book, many EDRs use hooks on the common language runtime to intercept certain execution paths, inspect parameters and return values, and optionally block them. For example, EDRs commonly monitor reflection, the .NET feature that enables the manipulation of loaded modules, among other things. An EDR that hooks the common language runtime in this way may be able to see things that AMSI alone couldn't and detect tempering with the loaded amsi.dll.

### Tool-Specific Indicators

The actions our tooling takes after being loaded can generate additional indicators. Seabelt, for instance, queries many registry keys.

In short, most vendors know how to identify the execution of .NET assemblies in memory. Thankfully for us, there are some alternative procedures, as well as tradecraft decisions we can make, that can limit our exposure.

An example of this is the InlineExecute-Assembly Beacon object file, an open source plug-in for Cobalt Strike's Beacon that allows operators to do everything that the normal execute-assembly module allows but without the requirement of spawning a new process. On the tradecraft side, if our current process is managed (as in, is .NET), then loading the common language runtime would be expected behavior. Couple these with bypasses for AMSI and the .NET Runtime .ETW provider and we've limited our detection risk down to any hooks placed into the common language runtime and the indicators unique to the tool, which can be addressed independently. If we implement these tradecraft and procedural changes, we're in a decent spot to be able to run Seabat.

## Privilege Escalation

We know that we need to expand our access to other hosts in Binford's environment. We also know, from our point of contact, that our current user has low privileges and hasn't been granted administrative access to remote systems. Remember, though, that Binford grants all domain users

250    Chapter 13

---

local administrator rights on their designated workstation so that they can install applications without overburdening their helpdesk team. All of this means that we won't be able to move around the network unless we can get into the context of another user, but we also have options for how to do that.

To take on the identity of another user, we could extract credentials from LSASS. Unfortunately, opening a handle to LSASS with PROCESS_VM _READ rights can be a death sentence for our operation when facing a modern EDR. There are many ways to get around opening a handle with these rights, such as stealing a handle opened by another process or opening a handle with PROCESS_DUP_HANDLE rights and then changing the requested rights when calling kernel32!DuplicateHandle(). However, we're still running in excel.exe (or explore.exe, if our persistence mechanism has fired), and opening a new process handle may cause further investigation to occur, if it doesn't generate an alert outright.

If we want to act as another user but don't want to touch LSASS, we still have plenty of options, especially since we're local administrators.

## Getting a List of Frequent Users

One of my favorite ways is to target users who I know log in to the system. To view the available users, we can run Seatbelt's log@events module, which tells us which users have logged on recently. This will generate some indicators related to Seatbelt's default namespace, classes, and method names, but we can simply change those prior to compilation of the assembly. Once we get the results from Seatbelt, we can also check the subdirectories under C:/Users using dir or an equivalent directory-listing utility to see which users have a home folder on the system.

Our execution of the LogEvents module returns multiple login events from the user TTAYLOR.ADMIN@BINFORD.COM over the past 10 days. We can assume from the name that this user is an administrator to something, though we're not quite sure to what.

## Hijacking a File Handler

Here are two methods for targeting users of the system on which you're operating: backdooring a .Jnk file on the user's desktop for an application they frequently open, such as a browser, and hijacking a file handler for the target user through registry modification. Both techniques rely on the creation of new files on the host. However, the use of .Jnk files has been covered extensively in public reporting, so there are likely detections around their creation. File-handler hijacks have gotten less attention. Therefore, their use may pose a smaller risk to the security of our operation.

For readers unfamiliar with this technique, let's cover the relevant background information. Windows needs to know which applications open files with certain extensions. For instance, by default, the browser opens .pdf files, though users can change this setting. These extension-to-application mappings are stored in the registry, under HKLM:\Software\Classes (for handlers

Case Study: A Detection-Aware Attack 251

---

registered for the whole system and $HKU\subset SID\subset SOFTWARE\subset Classes$ for peruser registrations.

By changing the handler for a specific file extension to a program that we implement, we can get our code to execute in the context of the user who opened the hijacked file type. Then we can open the legitimate application to fool the user into thinking everything is normal. To make this work, we must create a tool that first runs our agent shellcode and then proxies the path of the file to be opened to the original file handler.

The shellcode runner portion can use any method of executing our agent code and as such will inherit the indicators unique to that execution method. This is the same as was the case with our initial access payload, so we won't cover the details of that again. The proxying portion can be as simple as calling kene32!CreateProcess() on the intended file handler and passing in the arguments received from the operating system when the user attempts to open the file. Depending on the target of the hijack, this can create an abnormal parent-child process relationship, as our malicious intermediary handler will be the parent of the legitimate handler. In other cases, such as .accountpicture-ms files, the handler is a DLL that is loaded into explorer.exe, making it so that the child process could look like a child of explorer.exe rather than another executable.

## Choosing a File Extension

Because we're still running in excel.exe, the modification of arbitrary filehandler binaries may seem odd to an EDR monitoring the registry events. Excel is, however, directly responsible for certain file extensions, such as .xlsx and .csv. If detection is a concern, it's best to choose a handler that is appropriate for the context.

Unfortunately for us, Microsoft has implemented measures to limit our ability to change the handler associated with certain file extensions via direct registry modification; it checks hashes that are unique to each app and user. We can enumerate these protected file extensions by looking for registry keys with @erchoice subkeys containing a value called %ash. Among these protected file extensions are Office file types ( like .xlsx and .docx), .pdf, .txt, and .msh4, to name a few. If we want to hijack Excel-related file extensions, we need to somehow figure out the algorithm that Microsoft uses to create these hashes and reimplement it ourselves.

Thankfully, GitHub user "default-username-was-already-taken" offers a PowerShell version of the necessary hashing algorithm, SetFileAssoc.ps1. Working with PowerShell can be tricky; it's subject to high levels of scrutiny by ANSI, script-block logging, and consumers monitoring the associated ETW provider. Sometimes the mere fact of powershell.exe spawning can trigger an alert for a suspicious process.

Thus, we'll aim to use PowerShell in the safest way possible, with the least risk of exposure. Let's take a closer look at how the execution of this script on the target might get us caught and see what we can mitigate.

252    Chapter 13

---

## Modifying the PowerShell Script

If you review the script yourself, you'll see that it isn't too alarming; it appears to be a standard administrative tool. The script first sets up a P!Invoke signature for the adap32!ReqQueryInfoKey() function and adds a custom C# class called HashFuncs. It defines a few helper functions that interact with the registry, enumerate users, and calculate the UserChoice hash. The final block executes the script, setting the new file handler and hash for the specified file extension.

This means we won't need to modify much. The only things we need to worry about are some of the static strings, as those are what sensors will capture. We can remove a vast majority of them, as they're included for debugging purposes. The rest we can rename, or mangle. These strings include the contents of variables, as well as the names of the variables, functions, namespaces, and classes used throughout the script. All of these values are fully under our control, so we can change them to whatever we want.

We do need to be careful with what we change these values to, though. EDRs can detect script obfuscation by looking at the entropy, or randomness, of a string. In a truly random string, the characters should all receive equal representation. In the English language, the five most common letters are E, T, A, O, and I; less commonly used letters include Z, X, and Q. Renaming our strings to values like z0f0xu5 and xy123 could alert an EDR to the presence of high-entropy strings. Instead, we can simply use English words, such as eagle and oatmeal , to perform our string replacement.

## Executing the PowerShell Script

The next decision we need to make is how we're going to execute this PowerShell script. Using Cobalt Strike Beacon as an example agent, we have a few options readily available to us in our command-and-control agent:

- 1. Drop the file to disk and execute it directly with powershell.exe.

2. Execute the script in memory using a download cradle and powershell.exe.

3. Execute the script in memory using Unmanaged PowerShell (powerpick)
in a sacrificial process.

4. Inject Unmanaged PowerShell into a target process and execute the
script in memory (psinject).
Option 1 is the least preferable, as it involves activities that Excel would rarely perform. Option 2 is slightly better because we no longer have to drop the script onto the host's filesystem, but it introduces highly suspicious indicators, both in the network artifacts generated when we request the script from the payload-hosting server and in the invocation of powershell.exe by Excel with a script downloaded from the internet.

Option 3 is slightly better than the previous two but isn't without its own risks. Spawning a child process is always dangerous, especially when

Case Study: A Detection-Aware Attack 253

---

combined with code injection. Option 4 is not much better, as it drops the requirement of creating a child process but still necessitates opening a handle to an existing process and injecting code into it.

If we consider options 1 and 2 to be off the table because we don't want Excel spawning powershell.exe , we're left deciding between options 3 and 4. There is no right answer, but I find the risk of using a sacrificial process – more palatable than the risk of injecting into another one. The sacrificial process will terminate as soon as our script completes its execution, removing persistent artifacts, including the loaded DLLs and the in-memory PowerShell script, from the host. If we were to inject into another process, those indicators could remain loaded in the host process even after our script completes. So, we'll use option 3.

Next, we need to decide what our hijack should target. If we wanted to expand our access indiscriminately, we'd want to hijack an extension for the entire system. However, we're after the user TTAYLOR ADMIN. Since we have local administrator rights on the current system, we can modify the registry keys of a specific user through the HKU hive, assuming we know the user's security identifier (SID).

Thankfully, there's a way to get the SID from Seatbelt's logontevents module. Each 4624 event contains the user's SID in the SubjectUserSid field. Seatbelt comments out this attribute in the code to keep the output clear, but we can simply uncomment that line and recompile the tool to get that information without needing to run anything else.

## Building the Malicious Handler

With all the requisite information collected we can hijack the handler for the .xlsx file extension for only this user. The first thing we need to do is create the malicious handler. This simple application will execute our shellcode and then open the intended file handle, which should open the file selected by the user in a way they'd expect. This file will need to be written to the target filesystem, so we know we're going to be scanned, either at the time we upload it or on its first invocation based on the configuration of the EDR's minifilter. To mitigate some of this risk, we can obfuscate the evil handler in a way that will hopefully allow us to fly under the radar.

The first big issue we'll need to conceal is the huge blob of agent shellcode hanging out in our file. If we don't obfuscate this, a mature scanner will quickly identify our handler as malicious. One of my favorite ways to obscure these agent shellcode blobs is called environmental keying . The general gist is that you encrypt the shellcode using a symmetric key derived from some attribute unique to the system or context under which you'll be running. This can be anything from the target's internal domain name to the serial number of the hard drive inside the system.

In our case, we're targeting the user TAYLAOR.ADMIN@BINFORD .COM , so we use their username as our key. Because we want the key to be difficult to brute-force should our payload fall into the hands of an incident responder, we pad it out to 32 characters by repeating the string.

254    Chapter 13

---

making our symmetric key the following: T{TAYLOR.ADMIN@RINFORD


COMT{TAYLOR. We could also combine it with other attributes, such as the system's current IP address, to add some more variation to the string.

Back on our payload development system, we generate the agent shellcode and encrypt it using a symmetric key algorithm—say, AES-256— along with our key. We then replace the non-obfuscated shellcode with the encrypted blob. Next, we need to add key-derivation and decryption functions. To get our key, our payload needs to query the executing user's name. There are simple ways to do this, but bear in mind that the more simplistic the derivation method, the easier it will be for a skilled analyst to reverse the logic. The more obscure the method of identifying the user's name, the better; I'll leave finding a suitable strategy as an exercise to the reader. The decryption function is much more straightforward. We simply pad the key out to 32 bytes and then pass the encrypted shellcode and key through a standard AES-256 decryption implementation, then save the decrypted results.

Now here comes the trick. Only our intended user should be able to decrypt the payload, but we have no guarantees that it won't fall into the hands of Binford's SOC or managed security service providers. To account for this possibility, we can use a tamper sensor , which works like this. If decryption works as expected, the decrypted buffer will be filled with known contents we can hash. If the wrong key is used, the resultant buffer will be invalid, causing a hash mismatch. Our application can take the hash of the decrypted buffer before executing it and notify us if it detects a hash mismatch. This notification could be a POST request to a web server or something as subtle as changing the timestamp of a specific file on the system we monitor. We can then initiate a full infrastructure teardown so that incident responders can't start hitting our infrastructure or simply collect information about the failure and adjust accordingly.

Since we know we'll deploy this payload on only one host, we opt for the timestamp-monitoring approach. The implementation of this method is irrelevant and has a very low detection footprint; we merely change the timestamp of some file hidden deep in some directory and then use a persistent daemon to watch it for changes and to notify us if it detects something.

Now we need to figure out the location of the legitimate handler so that we can proxy requests to open .xlsx files to it. We can pull this from the registry for a specific user if we know their SID, which our modified copy of Seatbelt told us is S-1.5-21-48f6b6549-6d70726f76-656d656e7-1032 for TTYLATOR.ADWIN@BINFORD.COM. We query the xlsx value in HKU: S-1.5-21-48f6b6549-6d70726f76-656d656e7-1032!SOFTWARE\Microsoft\ Windows\Current\VersionExtensions, which returns C:\Program Files (x86)\ Microsoft\Office\Office16\EXCEL.EXE. Back in our handler, we write a quick function to call kernel32[CreateProcess() with the path to the real excel.exe, passing along the first parameter, which will be the path to the .xlsx file to open. This should execute after our shellcode runner but should not wait for it to complete so that the agent being spawned is apparent to the user.

Case Study: A Detection-Aware Attack 255

---

## Compiling the Handler

When it comes to compiling our handler, there are a couple of things we need to do to avoid detection. These include:

Removing or mangling all string constants This will reduce the chance that signatures will trigger or be created based on strings used in our code.

Disabling the creation of program database (PDB) files These files include the symbols used for debugging our application, which we won't need on our target. They can leak information about our build environment, such as the path at which the project was compiled.

Populating image details By default, our compiled handler will contain only basic information when inspected. To make things look a little bit more realistic, we can populate the publisher, version, copyright information, and other details you'd see after opening the Details tab in the file's properties.

Of course, we could take additional measures to further protect our handler, such as using LLVM to obfuscate the compiled code and signing the .exe with a code-signing certificate. But because the risk of this technique being detected is already pretty low and we have some protections in place, we'll save those measures for another time.

Once we've compiled our handler with these optimizations and tested it in a lab environment that mimics the Binford system, we'll be ready to deploy it.

## Registering the Handler

Registering a file or protocol handler may seem relatively simple at face value; you overwrite the legitimate handler with a path to your own. Is that it? Not quite. Nearly every file handler is registered with a programmatic identifier (ProgID), a string used to identify a COM class. To follow this standard, we need to either register our own ProgID or hijack an existing one.

Hijacking an existing ProgID can be risky, as it may break some functionality on the system and tip the user off that something is wrong, so this probably isn't the right strategy in this case. We could also look for an abandoned ProgID: one that used to be associated with some software installed on the system. Sometimes, when the software is removed, its uninstaller fails to delete the associated COM registration. However, finding these is relatively rare.

Instead, we'll opt to register our own ProgID. It's hard for an EDR to monitor the creation of all registry keys and all values being set at scale, so the odds are good that our malicious ProgID registration will go unnoticed. Table 13-3 shows the basic changes we'll need to make under the target user's registry hive.

---

Table 13-3: Keys to Be Created for Handler Registration

<table><tr><td>Key</td><td>Value</td><td>Description</td></tr><tr><td>SOFTWARE\Classes\Excel.WorkBook.16\CLSID</td><td>{ICE29631-7A1E-4A36-8C04-AFCDCD716A178}</td><td>Provides the ProgID-to-CLSID mapping</td></tr><tr><td>SOFTWARE\Classes\CLSID\1CE29631-7A1E-4A36-8C04-AFCDCD716A178\ProgID</td><td>Excel\WorkBook.16</td><td>Provides the CLSID-to-ProgID mapping</td></tr><tr><td>SOFTWARE\Classes\CLSID\1CE29631-7A1E-4A36-8C04-AFCDCD716A178\Proprov32</td><td>C:\path\to\our\handler.dll</td><td>Specifies the path to our malicious handler</td></tr></table>


Before deploying our changes to the live target, we can validate them in a lab environment using the PowerShell commands shown in Listing 13-2.

```bash
PS > $type = [Type]::GetTypeFromProgId("Excel.Workbook.16")
PS > $obj = [Activator]::CreateInstance($type)
PS > $obj.GetMembers()
```

Listing 13-2: Validating COM object registration

We get the type associated with our ProgID and then pass it to a function that creates an instance of a COM object. The last command shows the methods supported by our server as a final sanity check. If everything worked correctly, we should see the methods we implemented in our COM server returned to us via this newly instantiated object.

## Deploying the Handler

Now we can upload the handler to the target's filesystem. This executable can be written to any location the user has access to. Your inclination may be to hide it deep in some folder unrelated to Excel's operation, but this could end up looking odd when it's executed.

Instead, hiding it in plain sight might be our best option. Since we're an admin on this system, we can write to the directory in which the real version of Excel is installed. If we place our file alongside excel.exe and name it something innocuous, it may look less suspicious.

As soon as we drop our file to disk, the EDR will subject it to scanning. Hopefully, the protections we put in place mean it isn't deemed malicious (though we might not know this until it is executed). If the file isn't immediately quarantined, we can proceed by making the registry changes.

Making changes in the registry can be fairly safe depending on what is being modified. As discussed in Chapter 5, registry callback notifications might have to process thousands upon thousands of registry events per second. Thus, they must limit what they monitor. Most EDRs monitor only keys associated with specific services, as well as subkeys and values, like the RunAsPPL value, which controls whether LSASS is launched as a protected process. This works out well for us, because while we know that our actions will generate telemetry, we won't touch any of the keys that are likely to be monitored.

Case Study: A Detection-Aware Attack 257

---

That said, we should change as little as possible. Our PowerShell script will modify the values shown in Table 13-4 under the target user's registry hive.

Table 13-4: Registry Keys Modified During Handler Registration

<table><tr><td>Registry key</td><td>Operation</td></tr><tr><td>SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.\xlsx\UserChoice</td><td>Delete</td></tr><tr><td>SOFTWARE\Microsoft\Windows\CurrentVersion\Explore\FileExts\.\xlsx\UserChoice</td><td>Create</td></tr><tr><td>SOFTWARE\Microsoft\Windows\CurrentVersion\Explore\FileExts\.\xlsx\UserChoice\Hash</td><td>Set value</td></tr><tr><td>SOFTWARE\Microsoft\Windows\CurrentVersion\Explore\FileExts\.\xlsx\UserChoice\Progress</td><td>Set value</td></tr></table>


As soon as these registry changes are made, our handler should be functional on the system. Whenever the user next opens a .xlsx file, our handler will be invoked via the common language runtime, execute our shellcode, and then open the real Excel to allow the user to interact with the spreadsheet. When our agent checks in with our command-andcontrol infrastructure, we should see it come through as TAYLOR.ADM@ BINFORD.COM , elevating our privileges to what appears to be an administrator account on Binford's Active Directory domain, all without opening a handle to LSAS:

## Lateral Movement

Now that our agent is running on what we suspect to be a privileged account, we need to discover what kind of access we have in the domain. Rather than throwing SharpHound around to collect information (an activity that has become more difficult to do successfully), we can perform more surgical examination to figure out how we can move to another host.

You might think that lateral movement, or expanding our access to the environment, must involve deploying more agents on more hosts. However, this can add a ton of new indicators that we may not need. Take PdExecbased lateral movement, for example, in which a service binary containing agent shellcode is copied to the target system and a service targeting that newly copied binary is created and started, initiating a new callback. This would involve generating a network logon event, as well as creating a new file, registry keys for the associated service, a new process, and a network connection to either our command-and-control infrastructure or our compromised hosts.

The question then becomes: do we absolutely need to deploy a new agent, or are there other ways to get what we need?

258    Chapter 13

---

## Finding a Target

One of the first places to start looking for lateral movement targets is the list of established network connections on the current host. This approach has a few benefits. First, it doesn't require network scanning. Second, it can help you understand the environment's firewall configuration, because if there is an established connection from the host to another system, it's safe to assume that a firewall rule allowed it. Lastly, it can let us blend in. Since our compromised system has connected to the hosts in the list at least once, a new connection might seem less anomalous than one to a system with which the host has never communicated.

Since we accepted the risk of using Seatbelt previously, we can use it again. The TopConnections module lists the existing connections between our host and others in the network, as shown in Listing 13-3.

```bash
====== TcpConnections ======
  Local Address        Foreign Address    State    PID     Service        ProcessName
  0.0.0.0:135        0.0.0.0:0      LISTEN  768   RpcSs       svhost.exe
  0.0.0.0:445        0.0.0.0:0      LISTEN  4       System         svhost.exe
  0.0.0.0:3389        0.0.0.0:0      LISTEN  992   TermService   svhost.exe
  0.0.0.0:49664       0.0.0.0:0      LISTEN  448       Wininit.exe
  0.0.0.0:49665       0.0.0.0:0      LISTEN  1012      EventLog    svhost.exe
  0.0.0.0:49666       0.0.0.0:0      LISTEN  944       Schedule    svhost.exe
  0.0.0.0:49669       0.0.0.0:0      LISTEN  1952      Spoiler    spoolsv.exe
  0.0.0.0:49670       0.0.0.0:0      LISTEN  548       Netlogon    lsass.exe
  0.0.0.0:49696       0.0.0.0:0      LISTEN  548       lsass.exe
  0.0.0.0:49698       0.0.0.0:0      LISTEN  1672      PolicyAgent   svhost.exe
  0.0.0.0:49722       0.0.0.0:0      LISTEN  540       services.exe
  10.1.10.101:139        0.0.0.0:0      LISTEN  4       System         edge.exe
  10.1.10.101:51308    52.225.18.44:443   ESTAB   984       edge.exe
  10.1.10.101:59024    34.206.39.153:80   ESTAB   984       edge.exe
  10.1.10.101:51308    50.62.194.59:443   ESTAB   984       edge.exe
  10.1.10.101:54892    10.1.10.5:49458   ESTAB   2544       agent.exe
  10.1.10.101:65532    10.10.10.48:445   ESTAB   4       System Ⓡ
```

Listing 13-3: Enumerating network connections with Seatbelt

This output can sometimes be overwhelming due to the sheer volume of connections some systems make. We can prune this list a bit by removing connections we're not interested in. For example, we can remove any HTTP and HTTPS connections, as we'd most likely need to provide a username and password to access these servers; we have access to a token belonging to TTAYLOR .ADMB@INFBORD.COM but not the user's password. We can also remove any loopback connections, as this won't help us expand our access to new systems in the environment. That leaves us with a substantially smaller list.

From here, we notice multiple connections to internal hosts over arbitrarily high ports, indicative of RPC traffic. There are likely no firewalls between us and the hosts, as explicit rules for these ports are very rare, but figuring out the nature of the protocol is tricky if we don't have GUI access to the host.

Case Study: A Detection-Aware Attack 259

---

There is also a connection to an internal host over TCP port 445. which is virtually always an indication of remote file-share browsing using SMB. SMB can use our token for authentication and won't always require us to enter credentials. Furthermore, we can leverage the file-sharing functionality to browse the remote system without deploying a new agent. That sounds like exactly what we're after!

## Enumerating Shares

Assuming this is a traditional SMB connection, we now need to find the name of the share being accessed. The easy answer, especially if we assume that we're an administrator, is to mount the C$share. This will allow us to browse the operating system volume as if we were in the root of the C: drive.

However, in enterprise environments, shared drives are rarely accessed in this way. Shared folders are much more common. Unfortunately for us, enumerating these shares isn't as simple as just listing out the contents of \10.1.10.48 . There are plenty of ways to get this information, though. Let's explore some of them:

Using the net view command. Requires us to launch net.exe on the host, which an EDR's process-creation sensors highly scrutinize

Running Get-SmShare in PowerShell - Built-in PowerShell cmdlet that works both locally and remotely but requires us to invoke powershell.exe

Running Get-WeiObject $in2Share' in PowerShell Similar to the previous cmdlet but queries for shares over WMI

Running SharpWNL.exe action= query query= ""select * from win32

share" "   Functionally the same as the previous PowerShell example but uses a .NET assembly, which allows us to operate using executeassembly and its equivalents

Using Seatbelt.exe network shares Nearly identical to $barpWMT; uses the win32_Share_WMT class to query the shares on a remote system.

These are just a few examples, and there are pros and cons to each. Since we've already put in the work to obfuscate Scatbelt and know that it works well in this environment, we can use it again here. Most EDRs work on a process-centric model, meaning that they track activity based on processes. Like our initial access, we'll be running in excel.exe and, if needed, set our spaonto process to the same image as it was previously. When we enumerate remote shares on 10.1.10.48 , Scatbelt generates the output shown in Listing 13-4 .

```bash
====== NetworkShares ======
  Name                : FIN
  Path                : C:\Shares\FIN
  Description            :
  Type                : Disk Drive
  Name                : ENG
  Path                : C:\Shares\ENG
```

260    Chapter 13

---

```bash
Description        :               :
    Type                : Disk Drive
    Name                : IT
    Path                : C:\Shares\IT
    Description          :               :
    Type                : Disk Drive
  --snip--
[*] Completed collection in 0.121 seconds
```

Listing 13-4: Enumerating network shares with Seatbelt

The information tells us a few things about the target system. First, we have the ability to browse C$ , which indicates that either we were granted read access to their filesystem volume, or, more likely, we have administrative access to the host. Read access to C$ allows us to enumerate things such as installed software and users' files. These both can provide valuable context about how the system is used and who uses it.

The other network shares are more interesting than CS, though. They look like they belong to various business units inside Binford; FIN could stand for Finance, ENG for Engineering, IT for Information Technology, MKT for Marketing, and so on. ENG could be a good target based on our stated objectives.

However, there are detection risks to finding out for sure. When we list the contents of a remote share, a few things happen. First, a network connection is established with the remote server. The EDR's network filter driver will monitor this, and because it is an SMB client connection, the Microsoft-Windows-SMBClient ETW provider comes into play as well. Our client will authenticate to the remote system, creating an event through the ETW provider Microsoft-Windows-Security-Auditing (as well as an event ID 5140, indicating that a network share was accessed, in the security event log) on the remote system. If a system access control list (SACL) , a type of access control list used to audit access requests made for an object, is set on the shared folder or files within, an event will be generated via the MicrosoftWindows-Security-Auditing ETW provider (as well as an event ID 4663) when the contents of the shared folder are accessed.

Remember, though, that the fact that telemetry was generated on the host doesn't necessarily mean that it was captured. In my experience, EDRs monitor almost none of what I mentioned in the preceding paragraph. They might monitor the authentication event and network, but we're using an already-established network connection to the SMB server, meaning browsing the ENG share could allow us to blend in with the normal traffic coming from this system, lessening the likelihood of detection due to an anomalous access event.

This is not to say that we'll blend in so much that there is no risk at all. Our user may not typically browse the ENG share, making any access event anomalous at the file level. There may be non-EDR controls, such as dataloss prevention software or a canary facilitated through the SACL. We have

Case Study: A Detection-Aware Attack 261

---

to measure the reward of this share potentially holding Binford's crown jewels against the risk of detection posed by our browsing.

All signs are pointing to this drive holding what we're after, so we start recursively listing the subdirectories of the ENG share and find \\0.1.10.48\,

ENG\Products\6100.3d\scrawler_v42.stl , a stereolithography file commonly used by design applications in the mechanical engineering world. In order to verify that this file is the 3D model for the Binford 6100 left-handed scrawler, we'll need to expfiltrate it and open it in an application capable of processing .stl files.

## File Exfiltration

The last step of our attack is pulling Binford's crown jewels out of its environment. Oddly, of everything we've done in this operation, this has the lowest likelihood of detection by the EDR despite having the highest impact to the environment. To be fair, it isn't really the EDR's domain. Still, sensors could detect our data exfiltration, so we should remain thoughtful in our approach.

There are many ways to exfiltrate data from a system. Choosing a technique depends on a number of factors, such as the data's location, contents, and size. Another factor to consider is how fault tolerant the data format is; if we don't receive the full contents of the file, is it still workable? A text file is a good example of a very fault-tolerant file type, as missing half of the file means we're simply missing half of the text in the document. On the other hand, images are generally not fault tolerant, because if we're missing some portion of the picture, we generally won't be able to reconstruct it in any meaningful way.

Lastly, we should consider how quickly we need the data. If we need it soon and all at once, we typically inherit a higher risk of detection than if we exfiltrate the file slowly because the volume of data transmitted across the network boundary, where security monitoring is likely to be implemented, will be higher in a given timeframe.

In our operation, we can afford to take more risk because we're not interested in staying embedded in the environment for much longer. Through our reconnaissance against the ENG share, we see that the .siff file is 4MB, which isn't excessive compared to other types of files. Since we have a high risk tolerance and are working with a small file, let's take the easy route and exfilter the data over our command-and-control channel.

Even though we're using HTTPS, we should still protect the contents of the data. Assume the contents of any message that we send will be subjected to inspection by a security product. When it comes to exfiltrating files specifically, one of our biggest concerns is the file signature, or magic bytes, at the beginning of the file used to uniquely identify the file type. For .sll files, this signature is 73 6F 6C 69 64.

Thankfully, there are many ways to obfuscate the type of file we're exfiltrating, ranging from encrypting the contents of the file to simply trimming off the magic bytes before transmitting the file and then appending them again after the file is received. For human-readable file types, I prefer

262    Chapter 13

---

encryption, since there may be monitoring in place for a specific string in an outbound connection request. For other types of files, I'll usually either remove, mangle, or falsify the magic bytes for the file if detection at this stage is a concern.

When we're ready to exfilterate the file, we can use our agent's built-in download functionality to send it over our established command-and-control channel. When we do this, we are going to make a request to open the file so that we can read its contents into memory. When this happens, the EDR's filesystem minifilter driver will receive a notification and may look at certain attributes associated with the event, such as who the requestor is. Since the organization itself would have to build a detection from this data, the likelihood of an EDR having a detection here is relatively low.

Once we've read the contents of the file into our agent's address space, we can close the handle to the file and start the transfer. Transmitting data over HTTP or HTTPS channels will cause related ETW providers to emit events, but these typically don't include the message contents if the channel is secure, as with HTTPS. So, we shouldn't have any issue getting our design plans out. Once we have the file downloaded, we simply add back the magic bytes and open the file in the 3D modeling software of choice (Figure 13 - 1 ).

![Figure](figures/EvadingEDR_page_289_figure_003.png)

Figure 13-1 The Binford 6100 left-handed screwdriver

## Conclusion

We've completed the engagement objective: accessing the design information for Binford's revolutionary product (pun intended). While executing this operation, we used our knowledge of an EDR's detection methods to make educated choices about how to move through the environment.

Bear in mind that the path we took may not have been the best (or only) way to reach the objective. Could we have outpaced Binford's

Case Study: A Detection-Aware Attack 263

---

defenders without considering the noise we were making? What if we decided not to work through Active Directory and instead used a cloudbased file-hosting application, such as SharePoint, to locate the design information? Each of these approaches significantly alters the ways in which Binford could detect us.

After reading this book, you should be armed with the information you need to make these strategic choices on your own. Tread carefully, and good luck.

264    Chapter 13

---

## APPENDIX  AUXILIARY SOURCES

![Figure](figures/EvadingEDR_page_291_figure_001.png)

Modern EDRs sometimes make use of less popular components not covered in this book so far. These auxiliary telemetry urces can provide immense value to the

EDR, offering access to data that would otherwise be unavailable from other sensors.

Because these data sources are uncommon, we won't take a deep dive into their inner workings. Instead, this appendix covers some examples of them, how they work, and what they can offer an EDR agent. This is by no means an exhaustive list, but it shines a light on some of the more niche components you may encounter during your research.

### Alternative Hooking Methods

This book has shown the value of intercepting function calls, inspecting the parameters passed to them, and observing their return values. The most prevalent method of hooking function calls at the time of this writing relies

---

on injecting a DLL into the target process and modifying the execution flow of another DLL's exported functions, such as those of ntdll.dll , forcing execution to pass through the EDR's DLL. However, this method is trivial to bypass due to weaknesses inherent in its implementation (see Chapter 2).

Other, more robust methods of intercepting function calls exist, such as using the Microsoft-Windows-Threat-Intelligence ETW provider to indirectly intercept certain syscalls in the kernel, but these have their own limitations. Having multiple techniques for achieving the same effect provides advantages for defenders, as one method may work better in some contexts than others. For this reason, some vendors have leveraged alternative hooking methods in their products to augment their ability to monitor calls to suspicious functions.

"In a 2015 Recon talk titled "Esoteric Hooks," Alex Ionescu expounded on some of these techniques. A few mainstream EDR vendors have implemented one of the methods he outlines: Nirvana hooks. Where gardenvariety function hooking works by intercepting the function's caller, this technique intercepts the point at which the syscall returns to user mode from the kernel. This allows the agent to identify syscalls that didn't originate from a known location, such as the copy of ntdll.dll mapped into a process's address space. Thus, it can detect the use of manual syscalls, a technique that has become relatively common in offensive tools in recent years.

There are a few notable downsides to this hooking method, though.

First, it relies on an undocumented PROCESS_INFORMATION_CLASS and associated structure being passed to NtSetInformationProcess() for each process the product wishes to monitor. Because it isn't formally supported, Microsoft may modify its behavior or disable it entirely at any time. Additionally, the developer must identify the source of the call by capturing the return context and correlating it to a known good image in order to detect manual syscall invocation. Lastly, this hooking method is simple to evade, as adversaries can remove the hook from their process by nulling out the callback via a call to NtSetInformationProcess(), similarly to how the security process initially placed it.

Even if Nirvana hooks are relatively easy to evade, not every adversary has the capability to do so, and the telemetry they provide might still be valuable. Vendors can employ multiple techniques to provide the coverage they desire.

## RPC Filters

Recent attacks have rekindled interest in RPC tradecraft. Lee Christensen's PrinterBug and topotam's PetriPotam exploits, for example, have proven their utility in Windows environments. In response, EDR vendors have begun paying attention to emerging RPC tradecraft in hopes of detecting and preventing their use.

RPC traffic is notoriously difficult to work with at scale. One way EDRs can monitor it is by using RPC filters. These are essentially firewall rules based on RPC interface identifiers, and they're simple to create and deploy using

266    Appendix

---

built-in system utilities. For example, Listing A-1 demonstrates how to ban all inbound DCSync traffic to the current host using netsh.exe interactively. An EDR could deploy this rule on all domain controllers in an environment.

```bash
netsh> rpc filter
netsh rpc filter> add rule layer=um actiontype=block
Ok.
netsh rpc filter: add condition field=if uuid matchtype=equal \
data=e3514235-4b06-11d1-ab04-0cc04fczdcd2
Ok.
netsh rpc filter> add filter
FilterKey: 64377823-cff4-11ec-967c-000c29760114
Ok.
netsh rpc filter> show filter
Listing all RPC Filters.
----------------------
filterKey: 64377823-cff4-11ec-967c-000c29760114
displayData.name: RPCFilter
displayData.description: RPC Filter
filterId: 0x12794
layerKey: um
weight: type: FWP_EMPTY Value: Empty
action.type: block
numFilterConditions: 1
filterCondition[0]
      fieldKey: lf_uuid
      matchType: FWP_MATCH_EQUAL
          conditionValue: Type: FWP_BYTE_ARRAY16_TYPE Value: e3514235 11d14b06 c00004ab d2dcc2af
```

Listing A-1. Adding and listing RPC filters using netsh

These commands add a new RPC filter that specifically blocks any communications using the Directory Replication Service RPC interface (which has the GUID $3514225-4806-1D31-AB04-0004FC0D02). Once the filter is installed via the add filter command, it is live on the system, prohibiting DCSync.

Whenever the RPC filter blocks a connection, the Microsoft-WindowsRPC provider will emit an ETW similar to the one shown in Listing A-2.

```bash
An RPC call was blocked by an RPC firewall filter.
ProcessName: lsss.exe
InterfaceUuid: e3514235-4b06-11d1-a04c-004cf2cd2d
RpcFilterKey: 6377823-cf1a-11ec-967c-0029760114
```

Listing A-2. An ETW event showing activity blocked by a filter

While this event is better than nothing, and defenders could theoretically use it to build detections, it lacks much of the context needed for a robust detection. For example, the principal that issued the request and the direction of traffic (as in, inbound or outbound) are not immediately clear, making it difficult to filter events to help tune a detection.

Auxiliary Sources      267

---

A better option may be to consume a similar event from the MicrosoftWindows-Security-Auditing Secure ETV provider. Since this provider is protected, standard applications can't consume from it. It is, however, fed into the Windows Event Log, where it populates Event ID 5157 whenever the base filtering engine component of the Windows Filtering Platform blocks a request. Listing A-3 contains an example of Event ID 5157. You can see how much more detailed it is than the one emitted by Microsoft-Windows-RPC.

```bash
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
<System>
    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994
        -A6BA-3f3b80328c30D}"/>
    <EventID>5157c/EventID>
    <Version>1c/Version>
    <Level>0c/Level>
    <Task>12810c/Task>
    <Opcode>0c/Opcode>
    <Keywords>0x801000000000000</Keywords>
    <TimeCreated SystemTime="2022-05-10T12:19:09.6927526002" />
    <EventRecordID>11289563c/EventRecordID>
    <Correlation />
    <execution ProcessID="4" ThreadID="3444" />
    <Channel>Security</Channel>
    <Computer>sun.milkyway.lab</Computer>
    <Security />
</System>
<EventData>
    <Data Name="ProcessID">644</Data>
    <Data Name="Application">device\harddiskvolume2\windows\system32\lsas.exe</Data>
    <Data Name="Direction">%314592</Data>
    <Data Name="SourceAddress">192.168.1.20</Data>
    <Data Name="SourcePort">62749</Data>
    <Data Name="DestAddress">192.168.1.15</Data>
    <Data Name="DestPort">49667c</Data>
    <Data Name="Protocol">6x</Data>
    <Data Name="FilterRID">75664</Data>
    <Data Name="LayerName">%314610c</Data>
    <Data Name="LayerRID">46c</Data>
    <Data Name="RemoteUserID">5>1-0-0c</Data>
    <Data Name="RemoteMachineID">5>1-0-0c</Data>
</EventData>
</Event>
```

Listing A-3: An event manifest for the Microsoft-Windows-Security-Auditing Secure ETW provider

While this event contains much more data, it also has some limitations. Notably, although the source and destination ports are included, the interface ID is missing, making it difficult to determine whether the event is related to the filter that blocks DCSync attempts or another filter entirely. Additionally, this event operates inconsistently across Windows versions, generating correctly in some and completely missing in others. Therefore, some defenders might prefer to use the less-enriched but more consistent RPC event as their primary data source.

268    Appendix

---

## Hypervisors

Hypervisors virtualize one or more guest operating systems, then act as an intermediary between the guest and either the hardware or the base operating system, depending on the hypervisor's architecture. This intermediary position provides EDRs with a unique opportunity for detection.

### How Hypervisors Work

The inner workings of a hypervisor are relatively simple once you understand a few core concepts. Windows runs code at several rings; the code running in a higher ring, such as ring 3 for user mode, is less privileged than code running at a lower one, such as ring 0 for the kernel. Root mode, where the hypervisor resides, operates at ring 0, the lowest architecturally supported privilege level, and limits the operations that the guest, or nonroot mode system, can perform. Figure A-1 shows this process.

![Figure](figures/EvadingEDR_page_295_figure_004.png)

Figure A-1. The operation of VMEKIT and VMEINTER

When a virtualized guest system attempts to execute an instruction or perform some action that the hypervisor must handle, a VMEXIT instruction occurs. When this happens, control transitions from the guest to the hypervisor. The Virtual Machine Control Structure (VMCS) preserves the state of the processor for both the guest and the hypervisor so that it can be restored later. It also keeps track of the reason for the VMEXIT. One VMCS exists for each logical processor of the system, and you can read more about them in volume 3C of the Intel Software Developer's Manual.

### NOTE

For the sake of simplicity, this brief explanation covers the operation of a hypervisor based on Intel VT-x, as Intel CPUs remain the most popular at the time of this writing.

When the hypervisor enters root-mode operation, it may emulate, modify, and log the activity based on the reason for the VMEXIT . These exits may occur for many common reasons, including instructions such as RDMSR , for reading model-specific registers, and CPUID , which returns information about the processor. After the completion of the root-mode operation, execution is transferred back to non-root-mode operation via a VMRESUME instruction, allowing the guest to continue.

There are two types of hypervisors. Products such as Microsoft's Hyper-V and VMware's ESX are what we call Type I hypervisors. This means the hypervisor runs on the bare metal system, as shown in Figure A-2.

Audialry Sources 269

---

![Figure](figures/EvadingEDR_page_296_figure_000.png)

Figure A-2: A Type 1 hypervisor architecture

The other kind of hypervisor, Type 2 , runs in an operating system installed on the bare metal system. Examples of these include VMware's Workstation and Oracle's VirtualBox. The Type 2 architecture is shown in Figure A-3 .

![Figure](figures/EvadingEDR_page_296_figure_003.png)

Figure A-3: A Type 2 hypervisor architecture

Type 2 hypervisors are interesting because they can virtualize a system that is already running. Thus, rather than requiring the end user to log in to their system, start an application such as VMware Workstation, launch a virtual machine, log in to the virtual machine, and then do their work from that virtual machine, their host is the virtual machine. This makes the hypervisor layer transparent to the user (and resident attackers) while allowing the EDR to collect all the telemetry available.

Most EDRs that implement a hypervisor take the Type 2 approach. Even so, they must follow a complicated series of steps to virtualize an existing system. Full hypervisor implementation is far beyond the scope of this book. If this topic interests you, both Daax Rynd and Sina Karvandi have excellent resources for implementing your own.

## Security Use Cases

A hypervisor can provide visibility into system operations at a layer deeper than nearly any other sensor. Using one, an endpoint security product can detect attacks missed by the sensors in other rings, such as the following:

### Virtual Machine Detection

Some malware attempts to detect that it is running in a virtual machine by issuing a CPUID instruction. Since this instruction causes a WEXBIT, the hypervisor has the ability to choose what to return to the caller, allowing it to trick the malware into thinking it isn't running in a VM.

---

## Syscall Interception

A hypervisor can potentially leverage the Extended Feature Enable Register (EFER) function to exit on each syscall and emulate its operation.

## Control Register Modification

A hypervisor can detect the modification of bits in a control register (such as the SMEP bit in the CRt register), which is behavior that could be part of an exploit. Additionally, the hypervisor can exit when a control register is changed, allowing it to inspect the guest execution context to identify things such as token-stealing attacks.

## Memory Change Tracing

A hypervisor can use the page-modification log in conjunction with Extended Page Tables (EPT) to track changes to certain regions of memory.

## Branch Tracing

A hypervisor can leverage the last branch record, a set of registers used to trace branches, interrupts, and exceptions, along with EPT to trace the execution of the program beyond monitoring its syscalls.

## Evading the Hypervisor

One of the difficult things about operating against a system onto which a vendor has deployed a hypervisor is that, by the time you know you're in a virtual machine, you've likely already been detected. Thus, malware developers commonly use virtual-machine-detection functions, such as CPU instructions or sleep acceleration, prior to executing their malware. If the malware finds that it is running in a virtual machine, it may opt to terminate or merely do something benign.

Another option available to attackers is unloading the hypervisor. In the case of Type 2 hypervisors, you might be able to interact with the driver via an I/O control code, by changing the boot configuration, or by directly stopping the controlling service in order to cause the hypervisor to devirtualize the processors and unload, preventing its ability to monitor future actions. To date, there are no public reports of a real-world adversary employing these techniques.

---



---

## INDEX

### A

access mask, 67–68 AcquireFileForMTCreateSection callback, 105 address space layout randomization (ASLR), 87 advaþi ETW functions, 146–149, 211, 253 agent design, 9–11 advanced, 11 basic, 9 intermediate, 10 alertable state, 86–87, 90 algorithmic encoding, 185 altitude, 106 of popular EDRs, 108 Alvarez, Victor, 175 AMSI, 144, 183, 250 checking the trust level for, 190 creating a new session of, 187 initializing, 189 patching, 197–199 scanning the buffer of, 187–189 AMSI Attribute enumeration, 194–195 amsiCAMSiAntimalware::Scan() function, 192 amsi.dll, 189 AMSI scan result values, 188 Ancarani, Riccardo, 118 anonymous pipes, 118 Antimalware Scan Interface. See AMSI anti-transomware, 11, 117 antivirus scanning engine, 172 AppInIt_011s infrastructure, 22 APT3, 247 Arbitrary Code Guard (ACG), 91 assembly GUID, 180 aïllbé4.sys, 235 ATT&CK evaluations, 247 Awesome Procedures on Cypher, 222

### B

bustion, 85 BDCB_CALLBACK_TYPE enumeration, 204 BDCB_CLASSIFICATION enumeration, 206 BDCB_IMAGE_INFORMATION structure, 204, 206 BdcbStatusUpdate events, 204 values of, 206–207 Beacon executing PowerShell with, 253 memory allocation, 234 named pipes, 117–118 postexploitation with, 249–250 beaconing, 11, 13, 85, 125, 142, 245–246 Beacon Object File (BOF), 59, 250 Bifrost, 8–9 BitLocker, 213 Blackbone, 56 BloodHound, 166, 222 Blue Screen of Death, 88 bootkits, 212–213 Boot Manager, 213, 229 bootmgrfi.sfl, 213 boot-start service, 210 boundary-oriented architecture, 124 Batus, Sergey, 215 breakpoint (bp), 34, 83, 167 Bring Your Own Vulnerable Driver (BYOD), 212 brittle detections, 7 Bundesamt für Sicherheit in der Informationsstechnik (BSI), 206 bypasses, types of, 12

### C

CALLBACK_ENTRY_ITEM structure, 65 CallTreeToJSON.py, 222 canary file, 117

---

Chester, Adam, 42–43, 91, 166 choke point, 124 Christensen, Lee, 249, 266 Giholas, Pierre, 74 ci1g_cliOptions overwriting, 101 classify callouts, 135 chr.dll, 80, 166–167, 169 Cobalt Strike, 59, 80, 104, 117–118, 151, 234, 249–250, 253 Cobalt Strike Beacon. See Beacon Coburn, Ceri, 199 Code Integrity, 81–82 Code Signing EKU, 208, 230 command and control, establishing, 244–245 command line tampering, 41–45 common language runtime, 80, 164, 167 COMplus_effInEnabled environment variable, 165 COM server, 193, 247–248, 257 conditional jump, 23 ConsoleCtrlHandler() routine, 158 Control Flow Guard (CFG), 189–190 ConvertFromStd5String cmdlet, 145–146 countersignature, 202–203, 210 CREATE_SUSPENDED flag, 44 CreatingThreadField field, 37–38, 48 Cryptography API: Next Generation (CNG), 206 Cypher, 222–223, 226

## D

dbghelpMiniDumpwriteDump() function, 116, 181 debugging symbols, 256 debug registers, 199 default-username-was-alreadytaken, 252 DefenderCheck, 178-179 Delpy, Benjamin, 100 detections, 4 detour function, 19-22 Detrahere, 201 DigitalOcean, 245 dnSpy, 179-180, 186 download crawle, 185, 253

Driver Signature Enforcement, 169, 212 Duggan, Daniel, 198

## E

Early Launch Antimalware. See ELAM early-launch drivers registry hive, 205 Early Launch EKU, 208 Early-Launch load-order group, 211 edges, 222 ELAM, 202, 205, 209 callback routines, 203–206 developing, 203 loading a driver, 208–212 load order, 210–212 object identifiers, 209 performance requirements, 205 signatures, 205 registration, 229 Elastic detection rules, 8 Empire, 184 encryption, 185 endpoint-based network monitoring, 124–125 Enhanced Key Usage (EKU) extensions, 208, 229 entropy, 253 enumerating shares, 260–262 environmental keying, 254 EProcess5 structure, 53–54, 57, 227 process-image information of, 55 ESPecter bootstrap, 212–213 ETW, 143–144, 146–147, 149, 151, 155, 157–158 consumers, 151 controllers, 149 emitting events, 146 locating event sources, 147 processing events, 158 providers, 144 sensors, 221, 225 starting a trace session, 155 stopping a trace session, 157 ETWinEnabled registry key value, 165 ETW_REG_ENTRY structure, 165, 235–236 EtWi. See Microsoft-Windows-ThreatIntelligence EtWin sensor prefs, 221 evading funtion hooks, 24

274      Index

---

evading memory scanners, 246 evading network filters, 139–142 evading object callbacks, 68–69 events.h, 159 EVENT_DESCRIPTOR structure, 158 EVENT_ENABLE parameters, 154 event ID 4663, 261 event ID 5140, 261 event object, 158 EVENT_RECORD structure, 158 members of, 158–169

Event Tracing for Windows. See ETW Excel Add-On (XLI) files, 240, 242–243

execute-assembly Beacon command, 59, 118 EX_FAST_REF structures, 36 Extended Validation (EV) certificate, 212

## F

Fast I/O, 105 fault tolerance, 262 file detections, 116–117 file-digest algorithm, 210, 250 file exfiltration, 262–263 file handler, hijacking a, 251–258 file signature, 262 FileStandardInformation class, 57 filesystem canaries, 116–117 filesystem minifilter drivers, 103, 106, 108, 114–116, 118 activating, 114–115 altitudes of, 119 architecture, 106–108 callback routines, 106, 110, 113–114 detecting adversary tradecraft, 116–118 evading, 118–120 FLT structures, 111–114 load-order groups, 107 managing, 115–116 unloading, 113, 119 writing, 108–110 filesystem stack, 104–106 filter manager, 104 FilterUnhookCallback callback, 114 FindETWProviderImage, 147

firmware rootkits, 212 Fix, Berndt, 172 FLT _ CALLBACK _ DATA structure, 111, 121 important members of, 111–112 FLTFL _ REGISTRATION structure, 109 fields of, 109–115 FltLib, 116 fltime.exe, 116, 118 fltmgr! minifiler functions, 108, 113–115, 121, 128–129 fltmgr.sysx, 105 fork&run, 58–59, 91, 199 F-PROT, 172 FRISK Software, 172 FSFilter Activity Monitor, 107 FSFilter Anti-Virus, 107 function hooks detecting, 22–24 evading, 24 FWP _ MATCH _ TYPE enumeration, 131 FWP _ structures, 130–131, 134, 136 FwpsCalloutClassify@nt callout function, 135 FWPS structures, 129, 135–139 fwpcu!t! filter engine functions, 130 FWP _ VALUE _ structure, 136

## G

GenerateFileNameCallback function, 114 Get-SmShare PowerShell command, 260 Get-WmiObject PowerShell command, 260 Ghidra, 221 global uniqueness, 243 Golchikov, Andrey, 165 Graeber, Matt, 197 Green, Benjamin, 74 gTunnel, 85–86

## H

Hall, Dylan, 169 HAMSICONTEXT handle, 191-192 HAMSSESSION handle, 191, 193 handle duplication, 63-64, 68 hardware breakpoint, 199 hijacking a file handler, 251-258 HKU hive, 254

Index   275

---

hThemAll.cpp, 77


Hypervisor-Protected Code Integrity


(HVCI), 101

## |

IAntimalware interface, 189 IAntimalwareProvider::Scan(), 192 IDA, 221-222 IMAGE_INFO structure, 81 image-load notifications, 79 collecting information, 81 evading, 84 regarding a callback routine, 80 viewing signature levels, 80-82 Impacket, 84 INF file, 115 InfinityHook, 169 initial access, 240-246 InlineExecute-Assembly Beacon object file, 250 interrupt request levels, 88 Interrupt Request Packets (IRPs), 105 Invoke-Expression PowerShell command, 185 I/O completion port, 75-76 iorate_sys, 208 IROL_NOT_LESS_OR_EQUAL bug check, 88

## J

jitter, 245

JiP instruction, 19

JiE instruction, 23

Johnson, Jonathan, 12

## K

KAPC_ENVIRONMENT enumeration, 89 KAPC injection, 22, 79, 86-91 mitigation of, 90 registration functions, 89-90 Keyberoasting, 8, 13 kernel32j functions, 9 allocating memory on the heap, 47 creating a base service, 233-234 creating a process, 45 creating a remote thread, 244 creating a transaction object, 51 duplicating a handle, 73, 251 installing an ELAM certificate, 232


1

loading a library, 87 locking a file, 110 mapping a portion of a file, 83 opening a process, 18, 47 placing a thread in an alertable state, 86 populating a process attribute list, 46 reading process memory, 43 resuming a suspended thread, 44 rolling back a transaction, 51 setting a process mitigation policy, 91 writing process memory, 44 kernel address space layout randomization (KASLR), 236 kernel asynchronous procedure call (KAPC) injection, 22, 79, 86–91 Kernel Driver Utility (KDU), 169 kernel-mode driver, 5, 9–11, 33 Kernel Patch Protection (KPP), 19 key derivation, 255 known unknowns, 247–248 Kogan, Eugene, 51 Korkin, Igor, 165

## L

Landau, Gabriel, 52 language emulation, 184–185, 197 lateral movement, 124, 258–262 layered network drivers, 125 legacy filters, 104–106 Leidy, Emily, 247 LetsEncrypt SSL certificate, 245 lha.sys, 235 Liberman, Tal, 51 LIST _ ENTR structure, 65 living-off-the-land, 184 LLVM, 256 loading an ELAM driver, 208–212 logman, 149–151 luis.exe, 34, 67–69, 71–73

## M

magic bytes, 262–263 maillots, 103–104, 116 major functions and their purposes, 110

---

makecert.exe, 208–210 Malleable profile, 59, 117 Managed Object Format (MOF), 146 manifests, 146 Marnerides, Angelos K., 74 Matrosov, Alex, 213 Measured Boot, 206–207, 213 measurements, 213 memcpy() function, 169, 243 memory scanner, evading, 246 Metasploit, 84 Michael, Duane, 186 Microsoft Defender, 115 AMSI provider, 186 ELAM, 205 filters, 141 minifilter, 115 object callback routines, 66 process protection, 228 ruleset, 177 scanning, 173 Microsoft Defender for Endpoint (MDE), 215 Microsoft Defender IOfaceAntivirus, 186 Microsoft Detours, 19 MICROSOFTELAMCERTIFICATEINFO ELAM driver resource, 229 Microsoft Macro Assembler (MASM), 25 Microsoft Virus Initiative (MVI), 202 Microsoft-Windows-DNS-Client, 245 Microsoft-Windows-DotNETRuntime, 144, 151, 155, 162, 164, 166, 249 Microsoft Windows Early Launch Antimalware Publisher, 202 Microsoft-Windows-Kernel-Process, 242, 245 Microsoft-Windows-Security-Auditing, 261, 268 Microsoft-Windows-SecurityMitigations sensors, 221 Microsoft-Windows-SMBClient, 261 Microsoft-Windows-ThreatIntelligence, 219 consuming events, 226 ETW provider, 216 evasion, 234–237 event sources, 221 sensors, 221

参考文献

Microsoft-Windows-WeiO, 14, 145, 245 Minidrv, 100–101, 207–208 Minikat, 7, 68–69, 72–73, 180–181, 207 minifilter. See filesystems minifilter drivers Ministry of State Security (China), 247 @modelexblog, 27 mojo, 117 MQW instruction, 236 MgClient.dll, 192–193 MpQwiz.dll, 186, 190–191 msf.sys, 104 msfengp.exe, 228 mssefl.sys, 212 map.sys, 208 mutexcs, 69, 71, 114

## N

@n4rlb, 212 named pipes, 103 detections, 117-118 NDIS, 125-126 interaction between types of drivers, 126 types, 125 Neo4j, 221-223 NET_BUFFER structure, 138 net.exe, 260 NetFilter toolkit, 212 netsh command, 139-140 network-based monitoring, 124-125 Network Driver Interface Specification. See NDIS network filter drivers, 123 callouts, 128 detecting adversary tradecraft, 135 evading, 139-142 filter arbitration, 127 filter engine, 127 legacy driver types, 125 network intrusion detection system (NIDS), 124 NewSelfSignedCertificate cmdlet, 230 New Technology File System (NTFS), 105 nodes, 222 NonPagedPool memory, 88 notification callback routines, 33-34 npfs.sys, 103

Index: 277

---

ntddkk.h header, 82 ntdll.dll, 22–31, 83, 86–87 commonly hooked functions, 19 getting function pointers, 168–169 remapping, 28–31 ntdll functions allocating virtual memory, 23 creating a file, 20 creating a process, 31, 35, 51 creating a thread, 26 loading a DLL, 87 querying an image, 57 querying an object, 71 querying a process, 43 querying system information, 67, 237 registering an ETW event, 147 setting a file for deletion, 53 writing an ETW event, 167 ntEfw functions ETW providers enabling, 216 registering, 217 non-data requests, collecting information about, 105 nfs.sys, 103–104, 106 NObjectManager, 140–141 Get-FacAllOut cmdlet, 141 Get-FacFilter cmdlet, 140 nt!_OBJECT_TYPE structure, 65–66 ntoskr.exe, 101, 148, 222, 226

## 0

obfuscation, 119, 172, 185, 197 object callbacks, 62 evading, 68–69 structures, 62–63, 66–68, 73 object manager, 61 objects, 61 ObjectType structure, 63–64, 67 supported values, 63 on-access scanning, 173–174 on-demand scanning, 173 OperationRegistrationCount member, 62, 64 optional callbacks, 114 OriginalDesiredAccess member, 68

1

## P

PagedPool memory, 88 page hashes, 210 Palntir, 165 ParentImage property, 39 ParentProcessId field, 38, 48 parent process spoofing, 47 PatchGuard, 19, 169 patching, 19, 165, 167–169 payloads delivering, 242 encryption, 242 writing, 240 PEB, 42 returning the image path from, 55 PebBaseAddress member, 44 PerfView, 219 persistence, 246–249 metrics, 246–247 PFLT_FILTER filter pointer, 115 pico, 56 Plug and Play manager, 207 post-operation callbacks, 34, 113–114 PPL, 227 pre-operation callbacks, 34, 110–113 supported values, 112–113 privilege escalation, 250 ProcDump, 68 PROCESS_ALL_ACCESS right, 68 ProcessBasicInformation information class, 44 process callback routine, registering, 35–36 PROCESS_CREATE_PROCESS right, 47 process doppelgänging, 51 PROCESS_DUP_HANDLE right, 251 process environment block (PEB), 42–44, 50, 53–58 Process Explorer, xiii, 73, 227, 234 process ghosting, 52–53, 57 Process Hacker, 42, 44, 47–48 process herpderping, 52 process hollowing, 50 process-image modification, 49–58 detecting, 53–57 doppelgänging, 51 ghosting, 52

参考文献

---

herpadeeping, 52 hollowing, 50 process notifications, 34–39 creation events, collecting information from, 37–39 registering, 35–36 viewing callbacks, 36–37 ProcessParameters PEB field, 42–44, 55, 57 process protections, 227–228 PROCESS_QUERY_INFORMATION right, 72 PROCESS VM_READ right, 47, 68–69, 71 ProgID, 256–257 programmatic identifier, 256 protected processes, 227–228 Protected Process Light (PPL), 227 Proxifier, 85 Proxychains, 85 proxying architecture, 84–85 PsExec, 5, 258

## Q

quote, 213

## R

real-time consumer, 151 real-time protection, 173–174 reconnaissance, 249–250 reflection, 197, 250 REGHANDLE parameter, 149, 217, 235–236 registering a boot-start callback routine, 203–204 registering an image callback routine, 80 registering a process callback routine, 35–36 registering a registry callback routine, 92–93 registering a thread callback routine, 39–40 RegistrationContext member, 62 registry notifications, 79, 91, 95–96 evading, 96 mitigating performance challenges, 95 registering a callback, 92–95 REG_NOTIFY_CLASS registry class, 92–94, 96 remapping ntidll.dll, 28–31

remote thread creation, detecting, 40-41 ResourceFileName registry key value, 147 RFC 3161, 210 robust detections, 7 Rodionov, Eugene, 213 Roedig, Utz, 74 Rubeus, 181 rulesets, 174-175 rules of engagement, 240

## S

sacrificial process, 14, 58–59, 91, 118, 249, 253–254 Saha, Upayan, 235 scanner, 171 evading, 179–181 rulesets, 174–175 scanning models, 172–173 schedsvc.dll, 148 scheduled tasks, 247–248 Schroeder, Will, 172, 249 Seabat, 151, 164, 249–251, 254–255, 259–261 sechost! trace functions 146, 149, 151, 155 Secure Boot, 22 Secure EWTO, 11, 226–227, 268 security descriptor, 130, 134, 141, 145–146 Security Events Component Minifilter, 212 self-describing events, 146 SetoadDriverPrivilege token privilege, 100, 118 sensors, 3–4 ServiceGroupOrder, 211 Set-FileAssoc.fss, 252 srgmgtem.sys, 211 SharpHound, 166, 258 shell preview handlers, 247–248 shims, 126 shutdown handlers, 201 sigmoid.exe, 209–210, 230 SMB, 260–261 socks command, 84 software restriction policy, 81 STARTUPINFO structure, 46

Index 279

---

STATUS_FILE, DELETED error, 53 STATUS_VIRUS_INFECTED failure status, 121 string mangling, 253, 256 string obfuscation, 197 SubjectUserSid field, 254 Such, Jose Miguel, 74 Suhanov, Maxim, 213 syscall, 18–20 dynamically resolving, 27 making direct, 25–27 Sysmon, 38, 40–41, 118–120 SysmonDrv, 118–120 system access control list (SACL), 145, 261 System Guard Runtime Monitor, 212 SystemHandleInformation information class, 70 System.Management.Automation.dll, 186 System Service Dispatch Table (SSDT), 18–19, 218, 221 SysWhispers, 26–27

## T

tamper sensor, 255 tbsiTbsi_Revoke_Attestation() function, 207 tepid_sys, 126 tepp6_sys, 126 tdhl ETW functions, 159, 161–163 telemetry, 2 auxiliary sources of, 266–271 types collected, 9–12 Teodorescu, Claudiu, 165 TEST instruction, 23 thread callback routine, registering, 39–40 thread notifications, 39 ThreatIntProviderGuid GUID, 217 threat names, 178 Thuraisamy, Jackson, 26 Time-Stamp Protocol, 210 To-Be-Signed (TBS) hash, 230–231 Trace Data Helper (TDH) APIs, 146–147, 159 TRACE_EVENT_INFO structure, 160 TRACEHANDLE parameter, 153, 156, 165–166 TraceLogging, 146–147

1

trace sessions, 149-150, 165-166 trampoline, 19 Transactional NTFS (TxF), 51 transport protocol stack, 125 trap flag, 24 Truncer, Chris, 172 Trusted Boot, 202 Trusted Platform Module (TPM), 206-207, 213 tunneling, 84-86

## U

unconditional jump, 19 Uniform Resource Identifier (URI), 244 UserChoice hash, 252–253

## v

Vazarkar, Rohan, 222 vectored exception handler (VEH), 24, 199 Veil, 172 Vienna virus, 172 VirTool, 178 virtual address descriptor (VAD) tree, 56 VirusTotal, 174–175

## W

WdBoot, 211 wdboot.sys, 206 WdFilter, 115 WdFilter.sys, 37, 66 wdm.h, 110 WebClient class, 185 werfault.exe, 41 WerSvc, 41 WEVE_TEMPLATE, 147 WFP, 123, 126-128, 134, 142, 268 architecture, 126-127 base filtering engine, 127 benefits, 126 callout drivers, 128 implementing, 128-134 default filter security descriptor, 134 filter arbitration, 127-128 filter conflict, 142 filter engine, 127-128 FWPM structures, 130-131, 134, 136 .

---

layers and sublayers, 127 weight, 127 white ccl, 240, 242 whoami project, 186 Win32k, 215 Win32_SecurityDescriptorHelper WMI class, 146 Windows bootloader, 211 Windows Error Reporting, 41 Windows Filtering Platform. See WFP Windows firewall, 126, 134 Windows Hardware Quality Labs (WHQL), 212 Windows Software Trace Preprocessor (WPP), 146 Windows Subsystem for Linux (WSL), 36 winload.efi, 211 Winter-Smith, Peter, 24 WNODE_HEADER structure, 153

WPP_INT Tracing macro, 146 Wright, Mike, 172 WS2_32!send() function, 126

## X

XLL files, 240, 242-243 functions of, 240, 242 Xperf, 149

## Y

YARA format, 174–178 alternatives, 176 conditions, 177 jumps, 176 rules, 175–177 wildcards, 176–177

## Z

Zacinto rootkit, 201 Zhang, jiajie, 74

Index 281

---



---

Evading EDR is set in New Baskerville, Futura, Dogma, and TheSansMono Condensed.

---



---

## RESOURCES

Visit https://nostarch.com/evading-edr for errata and more information.

### More no-nonsense books from

![Figure](figures/EvadingEDR_page_311_figure_003.png)

NO STARCH PRESS

![Figure](figures/EvadingEDR_page_311_figure_005.png)

THE ART OF 64-BIT ASSEMBLY, VOLUME I

x86-64, Machine Organization and Programming

BY RANDAL HYDE 1,002 pt., 1964 852-516-0105

![Figure](figures/EvadingEDR_page_311_figure_009.png)

THE GHIDRA BOOK

The Definitive Guide

BY CHRIS EAGLE AND KARA NANCE

608 pp., $59.99 ISBN 978-1-7815-0102-7

![Figure](figures/EvadingEDR_page_311_figure_013.png)

ROOTKITS AND BOOTKS

Creating Modern Malware and Genuine Anti-Bot Software

ALEX MACHONE, EUGENE NAGORSKI, and YAHUA ZHU 448 rue,54005

![Figure](figures/EvadingEDR_page_311_figure_016.png)

HOW TO HACK LIKE A LEGEND

Breaking Windows

BY SPARC FLOW AUGMENTED RESOLUTION 1978-17185-0104-8

![Figure](figures/EvadingEDR_page_311_figure_019.png)

ATTACKING NETWORK

PROTOCOLS

A Hacker's Guide to Capture, Analysis, and Exploitation

JAMES FORMAL 6813 1325 6970 1-877-51-99277500

![Figure](figures/EvadingEDR_page_311_figure_023.png)

CYBERJUTSU Cybersecurity for the Modern Ninja

BY BEN MCGARTY

RESEARCH ARTICLE

07-07-2018 17:15:45

PHONE:

800.420.7240 由 415.863.9900

EMAIL:

SALES@NOSTARCH.COM

WEB:

WWW.NOSTARCH.COM

---



---

![Figure](figures/EvadingEDR_page_313_figure_000.png)

Never before has the world relied so heavily on the Internet to stay connected and informed. That makes the Electronic Frontier Foundation's mission—to ensure that technology supports freedom, justice, and innovation for all people— more urgent than ever.

For over 30 years, EFF has fought for tech users through

activism, in the courts, and by developing software to overcome

obstacles to your privacy, security, and free expression. This

dedication empowers all of us through darkness. With your help

we can navigate toward a brighter digital future.

![Figure](figures/EvadingEDR_page_313_figure_003.png)

LEARN MORE AND JOIN EFF AT EFF.ORG/NO-STARCH-PRESS

---



---

Outsmart the Sentinel

"Unparalleled technical depth and remarkable industry insights."

—Andy Robbins, co-creator of BloodHound

Evading EDR dives deep into the world of endpoint detection and response (EDR) systems. Crafted for security professionals, this definitive guide unravels the layers of EDR, detailing how it functions, detects, and protects. It's not just about understanding the system but also about mastering the art of evading it.

You'll journey through the architectural heart of EDR agents, demystifying their components and capabilities. Discover how they intercept function calls to trace potential malware and navigate the kernel to explore EDR's advanced monitoring techniques. Learn the power of Windows native user-mode logging and how EDRs monitor file loads, handle requests, and even detect early-boot malware.

You'll also delve into:

- → Function-Hooking DLLs: How EDRs detect
malware through user-mode function
interception

→ Kernel Intricacies: From process creation
to object handle requests, the core of
EDR's monitoring prowess

→ Filesystem and Network Monitoring: The
techniques behind tracking filesystem
activity and spotting suspicious network
traffic
- Advanced Scanning: A look at
integrated scanning technologies,
beyond conventional methods
Early Launch Dynamics: Early-boot
malware detection and the intricacies
of ELAM drivers
Niche Sensors: The lesser-known tools
that enrich EDR's toolkit
From leveraging the Windows Filtering Platform to uncovering the dynamics of the Microsoft-Windows-Threat-Intelligence ETW, each chapter is a master class in itself, culminating with a real-world simulation or a red team operation aiming for stealth.

Arm yourself with the knowledge of EDR systems, because understanding the sentinel is the first step to bypassing it.

## About the Author

Matt Hand has spent his entire career in offensive security, leading operations targeting some of the largest organizations in the world. He is a subject matter expert on evasion tradecraft and is passionate about improving security for all.

![Figure](figures/EvadingEDR_page_315_figure_012.png)

THE FINEST IN GEEK ENTERTAINMENT" nostarch.com

