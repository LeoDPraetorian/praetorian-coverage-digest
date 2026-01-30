## Delayed autostart services

Delayed autostart services enable Windows to cope with the growing number of services that are

being started when a user logs on, which bogs down the boot-up process and increases the time

before a user is able to get responsiveness from the desktop. The design of autostart services was

primarily intended for services required early in the boot process because other services depend on

them, a good example being the RPC service, on which all other services depend. The other use was to

allow unattended startup of a service, such as the Windows Update service. Because many autostart

---

services fall in this second category, marking them as delayed autostart allows critical services to start faster and for the user's desktop to be ready sooner when a user logs on immediately after booting. Additionally, these services run in background mode, which lowers their thread, I/O, and memory priority. Configuring a service for delayed autostart requires calling the ChangeServiceConfig2 API. You can check the state of the flag for a service by using the QC option of sc.exe.

![Figure](figures/Winternals7thPt2_page_489_figure_001.png)

Note If a nondelayed autostart service has a delayed autostart service as one of its

dependencies, the delayed autostart flag is ignored and the service is started immediately

to satisfy the dependency.

## Triggered-start services

Some services need to be started on demand, after certain system events occur. For that reason,


Windows 7 introduced the concept of triggered-start service. A service control program can use the

ChangeServiceConfig2 API (by specifying the SERVICE_CONFIG_TRIGGER_INFO information level) for

configuring a demand-start service to be started (or stopped) after one or more system events occur.


Examples of system events include the following:

- ■ A specific device interface is connected to the system.
■ The computer joins or leaves a domain.
■ A TCP/IP port is opened or closed in the system firewall.
■ A machine or user policy has been changed.
■ An IP address on the network TCP/IP stack becomes available or unavailable.
■ A RPC request or Named pipe packet arrives on a particular interface.
■ An ETW event has been generated in the system.
The first implementation of triggered-start services relied on the Unified Background Process Manager (see the next section for details). Windows 8.1 introduced the Broker Infrastructure, which had the main goal of managing multiple system events targeted to Modern apps. All the previously listed events have been thus begun to be managed by mainly three brokers, which are all parts of the Broker Infrastructure (with the exception of the Event Aggregation): Desktop Activity Broker, System Event Broker, and the Event Aggregation. More information on the Broker Infrastructure is available in the "Packaged applications" section of Chapter 8.

After the first phase of ScAutoStartServices is complete (which usually starts critical services listed in the HKLM\SYSTEM\CurrentControlSet\Control\EarlyStartServices registry value), the SCM calls ScRegisterServicesForTriggerAction, the function responsible in registering the triggers for each triggered-start service. The routine cycles between each Win32 service located in the SCM database. For each service, the function generates a temporary WNF state name (using the NtCreateWnfStateName

---

native API), protected by a proper security descriptor, and publishes it with the service status stored as state data. (WNF architecture is described in the "Windows Notification Facility" section of Chapter 8.) This WNF state name is used for publishing services status changes. The routine then queries all the service triggers from the TriggerInfo registry key, checking their validity and bailing out in case no triggers are available.

![Figure](figures/Winternals7thPt2_page_490_figure_001.png)

Note The list of supported triggers, described previously, together with their parameters, is documented at https://docs.microsoft.com/en-us/windows/win32/api/winsvc/ms-winsvcservice_trigger.

If the check succeeded, for each trigger the SCM builds an internal data structure containing all the trigger information (like the targeted service name, SID, broker name, and trigger parameters) and determines the correct broker based on the trigger type: external devices events are managed by the System Events broker, while all the other types of events are managed by the Desktop Activity broker. The SCM at this stage is able to call the proper broker registration routine. The registration process is private and depends on the broker: multiple private WNF state names (which are broker specific) are generated for each trigger and condition.

The Event Aggregation broker is the glue between the private WNF state names published by the

two brokers and the Service Control Manager. It subscribes to all the WNF state names corresponding

to the triggers and the conditions (by using the RtlSubscribeWifiStateChangeNotification API). When

enough WNF state names have been signaled, the Event Aggregation calls back the SCM, which can

start or stop the triggered start service.

Differently from the WNF state names used for each trigger, the SCM always independently publishes

a WNF state name for each Win32 service whether or not the service has registered some triggers. This

is because an SCP can receive notification when the specified service status changes by invoking the

NotifyServiceStatusChange API, which subscribes to the service's status WNF state name. Every time the

SCM raises an event that changes the status of a service, it publishes new state data to the "service status

change" WNF state, which wakes up a thread running the status change callback function in the SCP.

## Startup errors

If a driver or a service reports an error in response to the SCM's startup command, the ErrorControl value of the service's registry key determines how the SCM reacts. If the ErrorControl value is SERVICE_ ERROR_IGNORE (0) or the ErrorControl value isn't specified, the SCM simply ignores the error and continues processing service startups. If the ErrorControl value is SERVICE_ERROR_NORMAL (1), the SCM writes an event to the system Event Log that says, "The <service name> service failed to start due to the following error." The SCM includes the textual representation of the Windows error code that the service returned to the SCM as the reason for the startup failure in the Event Log record. Figure 10-18 shows the Event Log entry that reports a service startup error.

CHAPTER 10    Management, diagnostics, and tracing     459


---

![Figure](figures/Winternals7thPt2_page_491_figure_000.png)

FIGURE 10-18 Service startup failure Event Log entry.

If a service with an ErrorControl value of SERVICE_ERROR_SEVERE (2) or SERVICE_ERROR_CRITICAL (3) reports a startup error, the SCM logs a record to the Event Log and then calls the internal function ScRevertToLastKnownGood. This function checks whether the last known good feature is enabled, and, if so, switches the system's registry configuration to a version, named last known good, with which the system last booted successfully. Then it restarts the system using the NtShutdownSystem system service, which is implemented in the executive. If the system is already booting with the last known good configuration, or if the last known good configuration is not enabled, the SCM does nothing more than emit a log event.

## Accepting the boot and last known good

Besides starting services, the system charges the SCM with determining when the system's registry configuration, HKLM\SYSTEM\CurrentControlSet, should be saved as the last known good control set. The CurrentControlSet key contains the Services key as a subkey, so CurrentControlSet includes the registry representation of the SCM database. It also contains the Control key, which stores many kernelmode and user-mode subsystem configuration settings. By default, a successful boot consists of a successful startup of autostart services and a successful user logon. A boot fails if the system halts because a device driver crashes the system during the boot or if an autostart service with an ErrorControl value of SERVICE_ERROR_SEVERE or SERVICE_ERROR_CRITICAL reports a startup error.

The last known good configuration feature is usually disabled in the client version of Windows. It can be enabled by setting the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\ Configuration Manager\LastKnownGood\Enabled registry value to 1. In Server SKUs of Windows, the value is enabled by default.

The SCM knows when it has completed a successful startup of the autostart services, but Winlogon (%SystemRoot%\System32Winlogon.exe) must notify it when there is a successful logon. Winlogon invokes the NotifyBootConfigStatus function when a user logs on, and NotifyBootConfigStatus sends a

---

message to the SCM. Following the successful start of the autostart services or the receipt of the mes sage from NotifyBootConfigStatus (whichever comes last), if the last known good feature is enabled, the

SCM calls the system function NtInitializeRegistry to save the current registry startup configuration.

Third-party software developers can supersede Winlogon's definition of a successful logon with their own definition. For example, a system running Microsoft SQL Server might not consider a boot successful until after SQL Server is able to accept and process transactions. Developers impose their definition of a successful boot by writing a boot-verification program and installing the program by pointing to its location on disk with the value stored in the registry key HKLM\SYSTEM\ CurrentControlSet\ControlBootVerificationProgram. In addition, a boot-verification program's installation must disable Winlogon's call to NotifyBootConfigStatus by setting HKLM\SOFTWARE\Microsoft\ Windows NT\CurrentVersion\Winlogon\ReportBootOk to 0. When a boot-verification program is installed, the SCM launches it after finishing autostart services and waits for the program's call to

NotifyBootConfigStatus before saving the last known good control set.

Windows maintains several copies of CurrentControlSet, and CurrentControlSet is really a symbolic registry link that points to one of the copies. The control sets have names in the form HKLM\SYSTEM\ ControlSetnnn, where nnn is a number such as 001 or 002. The HKLM\SYSTEM\Select key contains values that identify the role of each control set. For example, if CurrentControlSet points to ControlSet001, the Current value under Select has a value of 1. The LastKnownGood value under Select contains the number of the last known good control set, which is the control set last used to boot successfully. Another value that might be on your system under the Select key is Failed, which points to the last control set for which the boot was deemed unsuccessful and aborted in favor of an attempt at booting with the last known good control set. Figure 10-19 displays a Windows Server system's control sets and Select values.

NtinitiateRegistry takes the contents of the last known good control set and synchronizes it with that of the CurrentControlSet key's tree. If this was the system's first successful boot, the last known good won't exist, and the system will create a new control set for it. If the last known good tree exists, the system simply updates it with differences between it and CurrentControlSet.

![Figure](figures/Winternals7thPt2_page_492_figure_004.png)

FIGURE 10-19 Control set selection key on Windows Server 2019.

CHAPTER 10    Management, diagnostics, and tracing     461


---

Last known good is helpful in situations in which a change to CurrentControlSet, such as the modification of a system performance-tuning value under HKLM\SYSTEM\Control or the addition of a service or device driver, causes the subsequent boot to fail. Figure 10-20 shows the Startup Settings of the modern boot menu. Indeed, when the Last Known Good feature is enabled, and the system is in the boot process, users can select the Startup Settings choice in the Troubleshoot section of the modern boot menu (or in the Windows Recovery Environment) to bring up another menu that lets them direct the boot to use the last known good control set. (In case the system is still using the Legacy boot menu, users should press F8 to enable the Advanced Boot Options.) As shown in the figure, when the Enable Last Known Good Configuration option is selected, the system boots by rolling the system's registry configuration back to the way it was the last time the system booted successfully. Chapter 12 describes in more detail the use of the Modern boot menu, the Windows Recovery Environment, and other recovery mechanisms for troubleshooting system startup problems.

![Figure](figures/Winternals7thPt2_page_493_figure_001.png)

FIGURE 10-20 Enabling the last known good configuration.

## Service failures

A service can have optional FailureActions and FailureCommand values in its registry key that the SCM records during the service's startup. The SCM registers with the system so that the system signals the SCM when a service process exits. When a service process terminates unexpectedly, the SCM determines which services ran in the process and takes the recovery steps specified by their failure-related registry values. Additionally, services are not only limited to requesting failure actions during crashes or unexpected service termination, since other problems, such as a memory leak, could also result in service failure.

---

If a service enters the SERVICE_STOPPED state and the error code returned to the SCM is not ERROR_SUCCESS, the SCM checks whether the service has the FailureActionsOnNonCrashFailureS flag set and performs the same recovery as if the service had crashed. To use this functionality, the service must be configured via the ChangeServiceConfig2 API or the system administrator can use the Sc.exe utility with the FailureFlag parameter to set FailureActionsOnNonCrashFailureS to 1. The default value being 0, the SCM will continue to restart the service as on earlier versions of Windows for all services.

Actions that a service can configure for the SCM include restarting the service, running a program, and rebooting the computer. Furthermore, a service can specify the failure actions that take place the time from the service process fails, the second time, and subsequently times, and it can indicate a delay period that the SCM waits before restarting the service asks to be restarted. You can easily manage the recovery actions for a service using the Recovery tab of the service's Properties dialog box in the Services MMC snap-in, as shown in Figure 10-21.

FIGURE 10-21 Service Recovery options.

Note that in case the next failure action is to reboot the computer, the SCM, after starting the service, marks the hosting process as critical by invoking the NTSetInformationProcess native API with the ProcessBreakOnTermination information class. A critical process, if terminated unexpectedly, crashes the system with the CRITICAL_PROCESS_DEAD bugcheck (as already explained in Part 1, Chapter 2, "System architecture."

CHAPTER 10   Management, diagnostics, and tracing      463


---

## Service shutdown

When Winlogon calls the Windows ExitWindowsEx function, ExitWindowsEx sends a message to Csrss, the Windows subsystem process, to invoke Csrss's shutdown routine. Csrss loops through the active processes and notifies them that the system is shutting down. For every system process except the SCM, Csrss waits up to the number of seconds specified in milliseconds by HKCUI(Control Panel), Desktop|WaitToKillTimeout (which defaults to 5 seconds) for the process to exit before moving on to the next process. When Csrss encounters the SCM process, it also notifies it that the system is shutting down but employs a timeout specific to the SCM. Csrss recognizes the SCM using the process ID Csrss saved when the SCM registered with Csrss using the RegisterServicesProcess function during its initialization. The SCM's timeout differs from that of other processes because Csrss knows that the SCM communicates with services that need to perform cleanup when they shut down, so an administrator might need to tune only the SCM's timeout. The SCM's timeout value in milliseconds resides in the HKLM\SYSTEM\ CurrentControlSet\Control\WaitToKillServiceTimeout registry value, and it defaults to 20 seconds.

The SCM's shutdown handler is responsible for sending shutdown notifications to all the services that requested shutdown notification when they initialized with the SCM. The SCM function ScShutdownAllServices first queries the value of the HKLM\SYSTEM\CurrentControlSet\Control\ ShutdownTimeout (by setting a default of 20 seconds in case the value does not exists). It then loops through the SCM services database. For each service, it unregisters eventual service triggers and determines whether the service desires to receive a shutdown notification, sending a shutdown command (SERVICE_CONTROL_SHUTDOWN) if that is the case. Note that all the notifications are sent to services in parallel by using thread pool work threads. For each service to which it sends a shutdown command, the SCM records the value of the service's wait hint, a value that a service also specifies when it registers with the SCM. The SCM keeps track of the largest wait hint it receives (in case the maximum calculated wait hint is below the Shutdown timeout specified by the ShutdownTimeout registry value, the shutdown timeout is considered as maximum wait hint). After sending the shutdown messages, the SCM waits either until all the services it notified of shutdown exit or until the time specified by the largest wait hint passes.

While the SCM is busy telling services to shut down and waiting for them to exit, Cssrs waits

for the SCM to exit. If the wait hint expires without all services exiting, the SCM exits, and Cssrs

continues the shutdown process. In case Cssrs wait ends without the SCM having exited (the

WaitToKillServiceTimeout time expired), Cssrs kills the SCM and continues the shutdown process. Thus,

services that fail to shut down in a timely manner are killed. This logic lets the system shut down with

the presence of services that never complete a shutdown as a result of flawed design, but it also means

that services that require more than 5 seconds will not complete their shutdown operations.

Additionally, because the shutdown order is not deterministic, services that might depend on other

services to shut down first (called shutdown dependencies) have no way to report this to the SCM and

might never have the chance to clean up either.

To address these needs, Windows implements preshutdown notifications and shutdown ordering

to combat the problems caused by these two scenarios. A preshutdown notification is sent to a service

that has requested it via the SetServiceStatus API (through the SERVICE_ACCEPT_PRESHUTDOWN ac cepted control) using the same mechanism as shutdown notifications. Preshutdown notifications are

sent before Wininit exits. The SCM generally waits for them to be acknowledged.

---

The idea behind these notifications is to flag services that might take a long time to clean up (such as database server services) and give them more time to complete their work. The SCM sends a progress query request and waits 10 seconds for a service to respond to this notification. If the service does not respond within this time, it is killed during the shutdown procedure; otherwise, it can keep running as long as it needs, as long as it continues to respond to the SCM.

Services that participate in the preshutdown can also specify a shutdown order with respect to

other preshutdown services. Services that depend on other services to shut down first (for example,

the Group Policy service needs to wait for Windows Update to finish) can specify their shutdown de pendencies in the HKLM\SYSTEM\CurrentControlSet\Control\PreshutdownOrder registry value.

## Shared service processes

Running every service in its own process instead of having services share a process whenever possible

wastes system resources. However, sharing processes means that if any of the services in the process

has a bug that causes the process to exit, all the services in that process terminate.

Of the Windows built-in services, some run in their own process and some share a process with other services. For example, the LSASS process contains security-related services—such as the Security Accounts Manager (SamSs) service, the Net Logon (Netlogon) service, the Encrypting File System (EFS) service, and the Crypto Next Generation (CNG) Key Isolation (KeyIso) service.

There is also a generic process named Service Host (SvcHost - %SystemRoot%\System32\SvcHost.

exe) to contain multiple services. Multiple instances of SvcHost run as different processes. Services

that run in SvcHost processes include T elephony (TapiSrv), Remote Procedure Call (RpcSs), and Remote

Access Connection Manager (RasMan). Windows implements services that run in SvcHost as DLLs and

includes an ImagePath definition of the form %SystemRoot%\System32\svchost.exe -k netvscs in the

service's registry key. The service's registry key must also have a registry value named ServiceID under

a Parameters subkey that points to the service's DLL file.

All services that share a common SvcHost process specify the same parameter (-k netsvrs in the example in the preceding paragraph) so that they have a single entry in the SCM's image database. When the SCM encounters the first service that has a SvcHost ImagePath with a particular parameter during service startup, it creates a new image database entry and launches a SvcHost process with the parameter. The parameter specified with the -k switch is the name of the service group. The entire command line is parsed by the SCM while creating the new shared hosting process. As discussed in the "Service

logon" section, in case another service in the database shares the same ImagePath value, its service SID will be added to the new hosting process's group SIDs list.

The new SvCHost process takes the service group specified in the command line and looks for a value having the same name under HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Svchost. SvCHost reads the contents of the value, interpreting it as a list of service names, and notifies the SCM that it's hosting those services when SvCHost registers with the SCM.

When the SCM encounters another shared service (by checking the service type value) during service startup with an ImagePath matching an entry it already has in the image database, it doesn't launch a second process but instead just sends a start command for the service to the SvHost it

CHAPTER 10    Management, diagnostics, and tracing     465


---

already started for that ImagePath value. The existing SvcHost process reads the ServiceDll parameter

in the service's registry key, enables the new service group SID in its token, and loads the DLL into its

process to start the service.

Table 10-12 lists all the default service groupings on Windows and some of the services that are registered for each of them.

TABLE 10-12 Major service groupings

<table><tr><td>Service Group</td><td>Services</td><td>Notes</td></tr><tr><td>LocalService</td><td>Network Store Interface, Windows Diagnostic Host, Windows Time, COM + Event System, HTTP Auto Proxy Service, Software Protection Platform UI Notification, Thread Order Service, LDDT Discovery, SSL FDP Host, WebClient</td><td>Services that run in the local service account and make use of the network on various ports or have no network usage at all (and hence no restrictions).</td></tr><tr><td>LocalServiceAndNoImpersonation</td><td>UPnP and SSDP, Smart Card, TPM, Font Cache, Function Discovery, AppID, qWAVE, Windows Connect Now, Media Center Extender, Adaptive Brightness</td><td>Services that run in the local service account and make use of the network on a fixed set of ports. Services run with a write-restricted token.</td></tr><tr><td>LocalServiceNetworkRestricted</td><td>DHCP, Event Logger, Windows Audio, NetBIOS, Security Center, Parental Controls, HomeGroup Provider</td><td>Services that run in the local service account and make use of the network on a fixed set of ports.</td></tr><tr><td>LocalServiceNoNetwork</td><td>Diagnostic Policy Engine, Base Filtering Engine, Performance Logging and Alerts, Windows Firewall, WWAN AutoConfig</td><td>Services that run in the local service account but make no use of the network at all. Services run with a write-restricted token.</td></tr><tr><td>LocalSystemNetworkRestricted</td><td>DWM, WDI System Host, Network Connections, Distributed Link Tracking, Windows Audio Endpoint, Wired/WLAN AutoConfig, Pnp-X, HID Access Control Manager, ActiveWork Service, Superfetch, Portable Device Enumerator, HomeGroup Listener, Tablet Input, Program Compatibility, Offline Files</td><td>Services that run in the local system account and make use of the network on a fixed set of ports.</td></tr><tr><td>NetworkService</td><td>Cryptographic Services, DHCP Client, Terminal Services, WorkStation, Network Access Protection, NLA, DNS Client, Telephony, Windows Event Collector, WinRM</td><td>Services that run in the network service account and make use of the network on various ports (or have no enforced network restrictions).</td></tr><tr><td>NetworkServiceAndNoImpersonation</td><td>KTM for DTC</td><td>Services that run in the network service account and make use of the network on a fixed set of ports. Services run with a write-restricted token.</td></tr><tr><td>NetworkServiceNetworkRestricted</td><td>IPSec Policy Agent</td><td>Services that run in the network service account and make use of the network on a fixed set of ports.</td></tr></table>


---

## Svchost service splitting

As discussed in the previous section, running a service in a shared host process saves system resources but has the big drawback that a single unhandled error in a service obliges all the other services shared in the host process to be killed. To overcome this problem, Windows 10 Creators Update (RS2) has introduced the Svchost Service splitting feature.

When the SCM starts, it reads three values from the registry representing the services global commit limits (divided in: low, medium, and hard caps). These values are used by the SCM to send "low resources" messages in case the system runs under low-memory conditions. It then reads the Svchost Service split threshold value from the HKLM\SYSTEM\CurrentControlSet\Control\SvcHostSpltThresholdInKB registry value. The value contains the minimum amount of system physical memory (expressed in KB) needed to enable Svchost Service splitting (the default value is 3.5 GB on client systems and around 3.7 GB on server systems). The SCM then obtains the value of the total system physical memory using the GlobalMemoryStatusEx API and compares it with the threshold previously read from the registry. If the total physical memory is above the threshold, it enables Svchost service splitting (by setting an internal global variable).

Svchost service splitting, when active, modifies the behavior in which SCM starts the host Svchost process of shared services. As already discussed in the "Service start" section earlier in this chapter, the SCM does not search for an existing image record in its database if service splitting is allowed for a service. This means that, even though a service is marked as sharable, it is started using its private hosting process (and its type is changed to SERVICE_WIN32_OWN_PROCESS). Service splitting is allowed only if the following conditions apply:

- ■ Svchost Service splitting is globally enabled.
■ The service is not marked as critical. A service is marked as critical if its next recovery action
specifies to reboot the machine (as discussed previously in the "Service failures" section).
■ The service host process name is Svchost.exe.
■ Service splitting is not explicitly disabled for the service through the SvcHostSpltDisable registry
value in the service control key.
Memory manager's technologies like Memory Compression and Combining help in saving as much of the system working set as possible. This explains one of the motivations behind the enablement of Svchost service splitting. Even though many new processes are created in the system, the memory manager assures that all the physical pages of the hosting processes remain shared and consume as little system resources as possible. Memory combining, compression, and memory sharing are explained in detail in Chapter 5 of Part 1.

---

### EXPERIMENT: Playing with Svchost service splitting

In case you are using a Windows 10 workstation equipped with 4 GB or more of memory, when you open the Task Manager, you may notice that a lot of Svchost.exe process instances are currently executing. As explained in this section, this doesn't produce a memory waste problem, but you could be interested in disabling Svchost splitting. First, open Task Manager and count how many svchost process instances are currently running in the system. On a Windows 10 May 2019 Update (19H1) system, you should have around 80 Svchost process instances. You can easily count them by opening an administrative PowerShell window and typing the following command:

```bash
(get-process -Name "svchost" | measure).Count
```

On the sample system, the preceding command returned 85.

Open the Registry Editor (by typing regedit.exe in the Cortana search box) and navigate to the HKLM\SYSTEM\CurrentControlSet\Control key. Note the current value of the SvcHostSplitThresholdInKB DWORD value. To globally disable Svchost service splitting, you should modify the registry value by setting its data to 0. (You change it by double-clicking the registry value and entering 0.) After modifying the registry value, restart the system and repeat the previous step: counting the number of Svchost process instances. The system now runs with much fewer of them.

```bash
PS C:\> (get-process -Name "svchost" | measure).Count
43
```

To return to the previous behavior, you should restore the previous content of the

SvcHostSplitThresholdInKB registry value. By modifying the DWORD value, you can also fine-tune

the amount of physical memory needed by Svchost splitting for correctly being enabled.

## Service tags

One of the disadvantages of using service-hosting processes is that accounting for CPU time and usage, as well as for the usage of resources by a specific service is much harder because each service is sharing the memory address space, handle table, and per-process CPU accounting numbers with the other services that are part of the same service group. Although there is always a thread inside the service-hosting process that belongs to a certain service, this association might not always be easy to make. For example, the service might be using worker threads to perform its operation, or perhaps the start address and stack of the thread do not reveal the service's DLL name, making it hard to figure out what kind of work a thread might be doing and to which service it might belong.

Windows implements a service attribute called the service tag (not to be confused with the driver

tag), which the SCM generates by calling ScGenerateServiceTag when a service is created or when the

service database is generated during system boot. The attribute is simply an index identifying the ser vice. The service tag is stored in the SubProcessTag field of the thread environment block (TEB) of each

thread (see Chapter 3 of Part I for more information on the TEB) and is propagated across all threads

that a main service thread creates (except threads created indirectly by thread-pool APIs).

---

Although the service tag is kept internal to the SCM, several Windows utilities, like Netstat.exe (a utility you can use for displaying which programs have opened which ports on the network), use undocumented APIs to query service tags and map them to service names. Another tool you can use to look at service tags is SctagQuery from Winsider Seminars & Solutions Inc. (www.winsiders.com/ tools/sctagquery.htm). It can query the SCM for the mappings of every service tag and display them either systemwide or per-process. It can also show you to which services all the threads inside a service-hosting process belong. (This is conditional on those threads having a proper service tag associated with them.) This way, if you have a runaway service consuming lots of CPU time, you can identify the culprit service in case the thread start address or stack does not have an obvious service DLL associated with it.

## User services

As discussed in the "Running services in alternate accounts" section, a service can be launched using the account of a local system user. A service configured in that way is always loaded using the specified user account, regardless of whether the user is currently logged on. This could represent a limitation in multiuser environments, where a service should be executed with the access token of the currently logged-on user. Furthermore, it can expose the user account at risk because malicious users can potentially inject into the service process and use its token to access resources they are not supposed to (being able also to authenticate on the network).

Available from Windows 10 Creators Update (RS2), User Services allow a service to run with the

token of the currently logged-on user. User services can be run in their own process or can share a

process with one or more other services running in the same logged-on user account as for standard

services. They are started when a user performs an interactive logon and stopped when the user logs

off. The SCM internally supports two additional type flags—SERVICE_USER_SERVICE (64) and SERVICE_

USERSERVICE_INSTANCE (128)—which identify a user service template and a user service instance.

One of the states of the Winlogon finite-state machine (see Chapter 12 for details on Winlogon

and the boot process) is executed when an interactive logon has been initiated. The state creates the

new user's logon session, window station, desktop, and environment; maps the HKEY_CURRENT_USER

registry hive; and notifies the logon subscribers (LogonUI and User Manager). The User Manager

service (Usermgr.dll) through RPC is able to call into the SCM for delivering the WTS_SESSION_LOGON

session event.

The SCM processes the message through the ScCreateUserServicesForUser function, which calls

back into the User Manager for obtaining the currently logged-on user's token. It then queries the list

of user template services from the SCM database and, for each of them, generates the new name of

the user instance service.

---

## EXPERIMENT: Witnessing user services

A kernel debugger can easily show the security attributes of a process's token. In this experiment, you need a Windows 10 machine with a kernel debugger enabled and attached to a host (a local debugger works, too). In this experiment, you choose a user service instance and analyze its hosting process's token. Open the Services tool by typing its name in the Cortana search box. The application shows standard services and also user services instances (even though it erroneously displays Local System as the user account), which can be easily identified because they have a local unique ID (LUID, generated by the User Manager) attached to their displayed names. In the example, the Connected Device User Service is displayed by the Services application as Connected Device User Service_55d01:

![Figure](figures/Winternals7thPt2_page_501_figure_002.png)

If you double-click the identified service, the tool shows the actual name of the user service instance (CDPUserSvc_55d01 in the example). If the service is hosted in a shared process, like the one chosen in the example, you should use the Registry Editor to navigate in the service root key of the user service template, which has the same name as the instance but without the LUID (the user service template name is CDPUserSvc in the example). As explained in the "Viewing privileges required by services" experiment, under the Parameters subkey, the Service DLL name is stored. The DLL name should be used in Process Explorer for finding the correct hosting process ID (or you can simply use Task Manager in the latest Windows 10 versions).

After you have found the PID of the hosting process, you should break into the kernel debugger and type the following commands (by replacing the <ServicePid> with the PID of the service's hosting process):

```bash
!process <ServicePid> 1
```

---

The debugger displays several pieces of information, including the address of the associated

security token object:

```bash
Kd: 0> !process OnS936 1
Searching for Process with Cid == 1730
PROCESS ffffel0646205080
SessionId: 2 Cid: 1730   Feb: 81ebbd1000  ParentCid: 0344
DirBase: 8fe39002  ObjectTable: ffffaf387c2826340  HandleCount: 313.
Image: svchost.exe
    VadRoot ffffel064629c340 Vads 108 Clone 0 Private 962. Modified 214. Locked 0.
    DeviceMap ffffaf387be1341a0
    Token                     ffffaf387c2bcd060
    ElapsedTime                00:35:29.441
    ...
    <Output omitted for space reasons>
```

To show the security attributes of the token, you just need to use the !token command followed by the address of the token object (which internally is represented with a TOKEN data structure) returned by the previous command. You should easily confirm that the process is hosting a user service by seeing the WIN://ScmUserService security attribute, as shown in the following output:

```bash
0: kd> !token ffffda387cb2bdc060
  _TOKEN 0xffffa387cb2bdc060
TS Session ID: D2
User: S-1-5-21-725390342-1520761410-3673083892-1001
User Groups:
00 S-1-5-21-725390342-1520761410-3673083892-513
    Attributes - Mandatory Default Enabled
... <Output omitted for space reason> ...
OriginatingLogonSession: 3e7
PackageSid: (null)
CapabilityCount: 0     Capabilities: 0x0000000000000000
LowboxNumberEntry: 0x0000000000000000
Security Attributes:
00 Claim Name   : WN://SCMUserService
    Claim Flags: 0x40 - UNKNOWN
    Value Type  : CLAIM_SECURITY_ATTRIBUTE_TYPE_UINT64
    Value Count: 1
    Value[0] : 0
01 Claim Name   : TSA://ProcUnique
    Claim Flags: 0x41 - UNKNOWN
    Value Type  : CLAIM_SECURITY_ATTRIBUTE_TYPE_UINT64
    Value Count: 2
    Value[0] : 102
    Value[1] : 352550
```

Process Hacker, a system tool similar to Process Explorer and available at https://processhacker. sourceforge.io/ is able to extract the same information.

CHAPTER 10    Management, diagnostics, and tracing     471


---

As discussed previously, the name of a user service instance is generated by combining the original name of the service and a local unique ID (LUID) generated by the User Manager for identifying the user's interactive session (internally called context ID). The context ID for the interactive logon session is stored in the volatile HKLM\SOFTWARE\Microsoft\Windows NT\ CurrentVersionWinlogon\VolatileUserMgrKey <Session ID><User SID> contextLuid registry value, where <Session ID> and <User SID> identify the logon session ID and the user SID. If you open the Registry Editor and navigate to this key, you will find the same context ID value as the one used for generating the user service instance name.

Figure 10-22 shows an example of a user service instance, the Clipboard User Service, which is run using the token of the currently logged-on user. The generated context ID for session 1 is 0x3a182, as shown by the User Manager volatile registry key (see the previous experiment for details). The SCM then calls ScCreateService, which creates a service record in the SCM database. The new service record represents a new user service instance and is saved in the registry as for normal services. The service security descriptor, all the dependent services, and the triggers information are copied from the user service template to the new user instance service.

![Figure](figures/Winternals7thPt2_page_503_figure_002.png)

FIGURE 10-22 The Clipboard User Service instance running in the context ID 0x3a182.

---

The SCM registers the eventual service triggers (see the "Triggered-start services" section earlier in this chapter for details) and then starts the service (if its start type is set to SERVICE_AUTO_START). As discussed in the "Service logon" section, when SCM starts a process hosting a user service, it assigns the token of the current logged-on user and the WIN://ScmUserService security attribute used by the SCM to recognize that the process is really hosting a service. Figure 10-23 shows that, after a user has logged in to the system, both the instance and template subkeys are stored in the root services key representing the same user service. The instance subkey is deleted on user logoff and ignored if it's still present at system startup time.

![Figure](figures/Winternals7thPt2_page_504_figure_001.png)

FIGURE 10-23 User service instance and template registry keys.

## Packaged services

As briefly introduced in the "Service logon" section, since Windows 10 Anniversary Update (RSI), the Service Control Manager has supported packaged services. A packaged service is identified through the SERVICE_PKT_SERVICE (512) flag set in its service type. Packaged services have been designed mainly to support standard Win32 desktop applications (which may run with an associated service) converted to the new Modern Application Model. The Desktop App Converter is indeed able to convert a Win32 application to a Centennial app, which runs in a lightweight container, internally called Helium. More details on the Modern Application Model are available in the "Packaged application" section of Chapter 8.

When starting a packaged service, the SCM reads the package information from the registry, and, as for standard Centennial applications, calls into the AppsInfo service. The latter verifies that the package information exists in the state repository and the integrity of all the application package files. It then stamps the new service's host process token with the correct security attributes. The process is then launched in a suspended state using CreateProcessAsUser API (including the Package Full Name attribute) and a Helium container is created, which will apply registry redirection and Virtual File System (VFS) as for regular Centennial applications.

CHAPTER 10  Management, diagnostics, and tracing  473


---

## Protected services

Chapter 3 of Part 1 described in detail the architecture of protected processes and protected processes light (PPL). The Windows 8.1 Service Control Manager supports protected services. At the time of this writing, a service can have four levels of protection: Windows, Windows light, Antimalware light, and App. A service control program can specify the protection of a service using the ChangeServiceConfig2 API (with the SERVICE_CONFIG_LAUNCH_PROTECTED information level). A service's main executable (or library in the case of shared services) must be signed properly for running as a protected service, following the same rules as for protected processes (which means that the system checks the digital signature's EKU and root certificate and generates a maximum signer level, as explained in Chapter 3 of Part 1).

A service's hosting process launched as protected guarantees a certain kind of protection with respect to other unprotected processes. They can't acquire some access rights while trying to access a protected service's hosting process, depending on the protection level. (The mechanism is identical to standard protected processes. A classic example is a nonprotected process not being able to inject any kind of code in a protected service.)

Even processes launched under the SYSTEM account can't access a protected process. However, the SCM should be fully able to access a protected service's hosting process. So, Wininit.exe launches the SCM by specifying the maximum user-mode protection level: WinTcb Light. Figure 10-24 shows the digital signature of the SCM main executable, services.exe, which includes the Windows TCB Component EKU (1.3.6.1.4.3110.3.23).

![Figure](figures/Winternals7thPt2_page_505_figure_004.png)

FIGURE 10-24 The Service Control Manager main executable (service.exe) digital certificate.

---

The second part of protection is brought by the Service Control Manager. While a client requests an action to be performed on a protected service, the SCM calls the SCcheckServiceProtectedProcess routine with the goal to check whether the caller has enough access rights to perform the requested action on the service. Table 10-13 lists the denied operations when requested by a nonprotected process on a protected service.

TABLE 10-13 List of denied operations while requested from nonprotected client

<table><tr><td>Involved API Name</td><td>Operation</td><td>Description</td></tr><tr><td>ChangeServiceConfig[2]</td><td>Change Service Configuration</td><td>Any change of configuration to a protected service is denied.</td></tr><tr><td>SetServiceObjectSecurity</td><td>Set a new security descriptor to a service</td><td>Application of a new security descriptor to a protected service is denied. (It could lower the service attack surface.)</td></tr><tr><td>DeleteService</td><td>Delete a Service</td><td>Nonprotected process can&#x27;t delete a protected service.</td></tr><tr><td>ControlService</td><td>Send a control code to a service</td><td>Only service-defined control code and SERVICE_CONTROL_INTERROGATE are allowed for nonprotected callers. SERVICE_CONTROL_STOP is allowed for any protection level except for Antimalware.</td></tr></table>


The ScCheckServiceProtectedProcess function looks up the service record from the caller-specified service handle and, in case the service is not protected, always grants access. Otherwise, it impersonates the client process token, obtains its process protection level, and implements the following rules:

- ■ If the request is a STOP control request and the target service is not protected at Antimalware level, grant the access (Antimalware protected services are not stoppable by non-protected processes).
■ In case the TrustedInstaller service SID is present in the client's token groups or is set as the token user, the SCM grants access regarding the client's process protection.
■ Otherwise, it calls RtlTestProtectedAccess, which performs the same checks implemented for protected processes. The access is granted only if the client process has a compatible protection level with the target service. For example, a Windows protected process can always operate on all protected service levels, while an antimalware PPL can only operate on Antimalware and app protected services.
Noteworthy is that the last check described is not executed for any client process running with the TrustedInstaller virtual service account. This is by design. When Windows Update installs an update, it should be able to start, stop, and control any kind of service without requiring itself to be signed with a strong digital signature (which could expose Windows Update to an undesired attack surface).

## Task scheduling and UBPM

Various Windows components have traditionally been in charge of managing hosted or background

tasks as the operating system has increased in complexity in features, from the Service Control

Manager, described earlier, to the DCOM Server Launcher and the WMI Provider—all of which are also

CHAPTER 10    Management, diagnostics, and tracing     475


---

responsible for the execution of out-of-process, hosted code. Although modern versions of Windows use the Background Broker Infrastructure to manage the majority of background tasks of modern applications (see Chapter 8 for more details), the Task Scheduler is still the main component that manages Win32 tasks. Windows implements a Unified Background Process Manager (UBPM), which handles tasks managed by the Task Scheduler.

The Task Scheduler service (Schedule) is implemented in the Schedsvc.dll library and started in a shared Svchost process. The Task Scheduler service maintains the tasks database and hosts UBPM which starts and stops tasks and manages their actions and triggers. UBPM uses the services provided by the Desktop Activity Broker (DAB), the System Events Broker (SEB), and the Resource Manager for receiving notification when tasks' triggers are generated. (DAB and SEB are both hosted in the System Events Broker service, whereas Resource Manager is hosted in the Broker Infrastructure service.) Both the Task Scheduler and UBPM provide public interfaces exposed over RPC. External applications can use COM objects to attach to those interfaces and interact with regular Win32 tasks.

## The Task Scheduler

The Task Scheduler implements the task store, which provides storage for each task. It also hosts the Scheduler idle service, which is able to detect when the system enters or exits the idle state, and the Event trap provider, which helps the Task Scheduler to launch a task upon a change in the machine state and provides an internal event log triggering system. The Task Scheduler also includes another component, the UBPM Proxy, which collects all the tasks' actions and triggers, converts their descriptors to a format that UBPM can understand, and sends them to UBPM.

An overview of the Task Scheduler architecture is shown in Figure 10-25. As highlighted by the picture, the Task Scheduler works deeply in collaboration with UBPM (both components run in the Task Scheduler service, which is hosted by a shared Svchost.exe process). UBPM manages the task's states and receives notification from SEB, DAB, and Resource Manager through WNF states.

![Figure](figures/Winternals7thPt2_page_507_figure_005.png)

FIGURE 10-25 The Task Scheduler architecture.

476 CHAPTER 10 Management, diagnostics, and tracing


---

The Task Scheduler has the important job of exposing the server part of the COM Task Scheduler APIs. When a Task Control program invokes one of those APIs, the Task Scheduler COM API library (TaskSched.dll) is loaded in the address space of the application by the COM engine. The library requests services on behalf of the Task Control Program to the Task Scheduler through RPC interfaces.

In a similar way, the Task Scheduler WMI provider (Schedprov.dll) implements COM classes and methods able to communicate with the Task Scheduler COM API library. Its WMI classes, properties, and events can be called from Windows PowerShell through the ScheduledTasks cmdlet (documented at https://docs.microsoft.com/en-us/powershell/module/scheduledtasks/). Note that the Task Scheduler includes a Compatibility plug-in, which allows legacy applications, like the AT command, to work with the Task Scheduler. In the May 2019 Update edition of Windows 10 (19H1), the AT tool has been declared deprecated, and you should instead use schtasks.exe.

## Initialization

When started by the Service Control Manager, the Task Scheduler service begins its initialization procedure. It starts by registering its manifest-based ETW event provider (that has the DE7B24EA-73C84A09-985D-5BDADCFA9D17 global unique ID). All the events generated by the Task Scheduler are consumed by UBCM. It then initializes the Credential store, which is a component used to securely access the user credentials stored by the Credential Manager and the Task store. The latter checks that all the XML task descriptors located in the Task store's secondary shadow copy (maintained for compatibility reasons and usually located in %SystemRoot%\System32\Tasks path) are in sync with the task descriptors located in the Task store cache. The Task store cache is represented by multiple registry keys, with the root being HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ScheduleTaskCache.

The next step in the Task Scheduler initialization is to initialize UBPM. The Task Scheduler service uses the UbpmInitialize API exported from UBPM.dll for starting the core components of UBPM. The function registers an ETW consumer of the Task Scheduler's event provider and connects to the Resource Manager. The Resource Manager is a component loaded by the Process State Manager (Pmsrv.dll, in the context of the Broker Infrastructure service), which drives resource-wise policies based on the machine state and global resource usage. Resource Manager helps UBPM to manage maintenance tasks. These types of tasks run only in particular system states, like when the workstation CPU usage is low, when game mode is off, the user is not physically present, and so on. UBPM initialization code then retrieves the WNF state names representing the task's conditions from the System Event Broker: AC power, Idle Workstation, IP address or network available, Workstation switching to Battery power. (Those conditions are visible in the Conditions sheet of the Create Task dialog box of the Task Scheduler MMC plug-in.)

UBPM initializes its internal thread pool worker threads, obtains system power capabilities, reads a list of the maintenance and critical task actions (from the HKLM\System\CurrentControlSet\Control\ Ubpm registry key and group policy settings) and subscribes to system power settings notifications (in that way UBPM knows when the system changes its power state).

The execution control returns to the Task Scheduler, which finally registers the global RPC interfaces of both itself and UBCM. Those interfaces are used by the Task Scheduler API client-side DLL (Taskschidl) to provide a way for client processes to interact via the Task Scheduler via the Task Scheduler COM interfaces, which are documented at https://docs.microsoft.com/en-us/windows/win32/api/taskschidl/.

CHAPTER 10    Management, diagnostics, and tracing     477


---

After the initialization is complete, the Task store enumerates all the tasks that are installed in the system and starts each of them. Tasks are stored in the cache in four groups: Boot, logon, plain, and Maintenance task. Each group has an associated subkey, called Index Group Tasks key, located in the Task store's root registry key (HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\ TaskCache, as introduced previously). Inside each Index Tasks group key is one subkey per each task, identified through a global unique identifier (GUID). The Task Scheduler enumerates the names of all the group's subkeys, and, for each of them, opens the relative Task's master key, which is located in the Tasks subkey of the Task store's root registry key. Figure 10-26 shows a sample boot task, which has the {OC7DBA27-9828-49F1-979C.AD73CAD290B} GUID. The task GUID is listed in the figure as one of the first entries in the Boot index group key. The figure also shows the master Task key, which stores binary data in the registry to entirely describe the task.

![Figure](figures/Winternals7thPt2_page_509_figure_001.png)

FIGURE 10-26 A boot task master key.

The task's master key contains all the information that describes the task. Two properties of the task are the most important: Triggers, which describe the conditions that will trigger the task, and Actions, which describe what happen when the task is executed. Both properties are stored in binary registry values (named "Triggers" and "Actions," as shown in Figure 10-26). The Task Scheduler first reads the hash of the entire task descriptor (stored in the Hash registry value); then it reads all the task's configuration data and the binary data for triggers and actions. After parsing this data, it adds each identified trigger and action descriptor to an internal list.

---

The Task Scheduler then recalculates the SHA256 hash of the new task descriptor (which includes all the data read from the registry) and compares it with the expected value. If the two hashes do not match, the Task Scheduler opens the XML file associated with the task contained in the store's shadow copy (the %SystemRoot%\System32\Tasks folder), parses its data and recalculates a new hash, and finally replaces the task descriptor in the registry. Indeed, tasks can be described by binary data included in the registry and also by an XML file, which adhere to a well-defined schema, documented at https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-schema.

## EXPERIMENT: Explore a task’s XML descriptor

Task descriptors, as introduced in this section, are stored by the Task store in two formats: XML file and in the registry. In this experiment, you will peek at both formats. First, open the Task Scheduler applet by typing taskschd.msc in the Cortana search box. Expand the Task Scheduler Library node and all the subnodes until you reach the MicrosoftWindows folder. Explore each subnode and search for a task that has the Actions tab set to Custom Handler. The action type is used for describing COM-hosted tasks, which are not supported by the Task Scheduler applet. In this example, we consider the ProcessMemoryDiagnosticEvents, which can be found under the MemoryDiagnostics folder, but any task with the Actions set to Custom Handler works well:

![Figure](figures/Winternals7thPt2_page_510_figure_003.png)

Open an administrative command prompt window (by typing CMD in the Cortana search

box and selecting Run As Administrator), then type the following command (replacing the task

path with the one of your choice):

```bash
schtasks /query /tn "Microsoft\Windows\MemoryDiagnostic\ProcessMemoryDiagnosticEvents" /xml
```

---

The output shows the task's XML descriptor, which includes the Task's security descriptor

(used to protect the task for being opened by unauthorized identities), the task's author and de scription, the security principal that should run it, the task settings, and task triggers and actions:

```bash
<?xml version="1.0" encoding="UTF-16"?>
  <Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Version1.0</Version>
    <SecurityDescriptor>D:P(A;;FA;;BA)(A;;FA;;SY)(A;;FR;;AU)</SecurityDescriptor>
    <AuthorS>{{%SystemRoot%system32MemoryDiagnostic.dll,-600</Author>
    <Description>{{%SystemRoot%system32MemoryDiagnostic.dll,-603</Description>
    <URL>Microsoft.Windows\MemoryDiagnostic\ProcessMemoryDiagnosticUtils<URL>
  </RegistrationInfo>
  <Principals>
    <Principal id="LocalAdmin">
      <GroupId>S-1-S-32-544</GroupId>
      <RunLevel>HighestAvailable</RunLevel>
  </Principal>
  </Principals>
  <Settings>
    <AllowHardTerminate>false</AllowHardTerminate>
    <DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries>
    <StopFioingOnBatteries>true</StopFioingOnBatteries>
    <Enabled>false</Enabled>
    <executionTimeLimit>PTHi</executionTimeLimit>
    <Hidden>true</Hidden>
    <MultipleInstancesPolicy>InIgnoreNew</MultipleInstancesPolicy>
    <StartWhenNotAvailable>true</StartWhenAvailable>
    <RunOnlyIfIdle>true</RunOnlyIfIdle>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>true</RestartOnIdle>
    </IdleSettings>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
  </Settings>
  <Triggers>
    <EventTriggers>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Pa
    th="System"&gt;{{SystemProvider@Name='Microsoft-Windows-WER-SystemErrorReporting'\
    and (EventID=1000 or EventID=1001 or EventID=1006)]]&lt;/Select&gt;&lt;/Query&gt;&lt;/
    QueryList&gt;</Subscription>
    </EventTrigger>
    ... [cut for space reasons] . . .
  </Triggers>
  <Actions Context="LocalAdmin">
    <ComHandler>
      <ClassId>{816E74A-B39F-46D8-ADCD-7BED477880A3}</ClassId>
      <Data>{{DATA[Event]]}</Data>
    </ComHandler>
  </Actions>
  </Task>
```

---

In the case of the ProcessMemoryDiagnosticEvents task, there are multiple ETW triggers (which allow the task to be executed only when certain diagnostics events are generated. Indeed, the trigger descriptors include the ETW query specified in XPath format). The only registered action is a ComHandler, which includes just the CLSID (class ID) of the COM object representing the task. Open the Registry Editor and navigate to the HKEY_LOCAL_MACHINES\SOFTWARE\Classes\CLSID key. Select Find... from the Edit menu and copy and paste the CLSID located after the ClassID XML tag of the task descriptor (with or without the curly brackets). You should be able to find the DLL that implements the ITaskHandler interface representing the task, which will be hosted by the Task Host client application (Taskhostw.exe, described later in the "Task host client" section):

![Figure](figures/Winternals7thPt2_page_512_figure_001.png)

If you navigate in the HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\ TaskCacheTasks registry key, you should also be able to find the GUID of the task descriptor stored in the Task store cache. To find it, you should search using the task's URI. Indeed, the task's GUID is not stored in the XML configuration file. The data belonging to the task descriptor in the registry is identical to the one stored in the XML configuration file located in the store's shadow copy (%systemroot%\System32\Tasks\Microsoft.Windows\MemoryDiagnostic\ ProcessMemoryDiagnosticEvents). Only the binary format in which it is stored changes.

Enabled tasks should be registered with UBPM. The Task Scheduler calls the RegisterTask function

of the Ubpm Proxy, which first connects to the Credential store, for retrieving the credential used to

start the task, and then processes the list of all actions and triggers (stored in an internal list), convert ing them in a format that UBPM can understand. Finally, it calls the UbpmTriggerConsumerRegister API

exported from UBPM.dll. The task is ready to be executed when the right conditions are verified.

## Unified Background Process Manager (UBPM)

Traditionally, UBMV was mainly responsible in managing tasks/ life cycles and states (start, stop, enable/ disable, and so on) and to provide notification and triggers support. Windows 8.1 introduced the Broker infrastructure and moved all the triggers and notifications management to different brokers that can

CHAPTER 10    Management, diagnostics, and tracing     481


---

be used by both Modern and standard Win32 applications. Thus, in Windows 10, UBP M acts as a proxy for standard Win32 T asks' triggers and translates the trigger consumers request to the correct broker.


UBPM is still responsible for providing COM APIs available to applications for the following:

- ■ Registering and unregistering a trigger consumer, as well as opening and closing a handle to one

■ Generating a notification or a trigger

■ Sending a command to a trigger provider
Similar to the Task Scheduler architecture, U BPM is composed of various internal components: Task

Host server and client, COM-based T ask Host library, and Event Manager.

## T ask host server

When one of the System brokers raises an event registered by a UBPM trigger consumer (by publishing a WNF state change), the UbpmTriggerArrived callback function is executed. UBPM searches the internal list of a registered task's triggers (based on the WNF state name) and, when it finds the correct one, processes the task's actions. At the time of this writing, only the Launch Executable action is supported. This action supports both hosted and nonhosted executables. Nonhosted executables are regular Win32 executables that do not directly interact with UBPM; hosted executables are COM classes that directly interact with UBPM and need to be hosted by a task host client process. After a host-based executable (taskhostw.exe) is launched, it can host different tasks, depending on its associated token. (Host-based executables are very similar to shared Svchost services.)

Like SCM, UBPM supports different types of logon security tokens for task's host processes. The

$UppTokenGetTokenForTask function is able to create a new token based on the account information

stored in the task descriptor. The security token generated by UBPM for a task can have one of the following owners: a registered user account, Virtual Service account, Network Service account, or Local

Service account. Unlike SCM, UBPM fully supports interactive tokens. UBPM uses services exposed by

the User Manager (Usermgr.dll) to enumerate the currently active interactive sessions. For each session,

it compares the User SID specified in the task's descriptor with the owner of the interactive session. If

the two match, UBPM duplicates the token attached to the interactive session and uses it to log on the

new executable. As a result, interactive tasks can run only with a standard user account. (Noninteractive

tasks can run with all the account types listed previously.)

After the token has been generated, UBPM starts the task's host process. In case the task is a hosted COM task, the UbpnFindHost function searches inside an internal list of Taskhost.exe (task host client) process instances. If it finds a process that runs with the same security context of the new task, it simply sends a Start Task command (which includes the COM task's name and CLSID) through the task host local RPC connection and waits for the first response. The task host client process and UBPM are connected through a static RPC channel (named ubpmtaskhostchannel) and use a connection protocol similar to the one implemented in the SCM.

---

If a compatible client process instance has not been found, or if the task's host process is a regular non-COM executable, UBCM builds a new environment block, parses the command line, and creates a new process in a suspended state using the CreateProcessAsUser API. UBCM runs each task's host process in a Job object, which allows it to quickly set the state of multiple tasks and fine-tune the resources allocated for background tasks. UBCM searches inside an internal list for Job objects containing host processes belonging to the same session ID and the same type of tasks (regular, critical, COM-based, or non-hosted). If it finds a compatible Job, it simply assigns the new process to the Job (by using the

AssignProcessToJobObject API). Otherwise, it creates a new one and adds it to its internal list.

After the Job object has been created, the task is finally ready to be started: the initial process's

thread is resumed. For COM-hosted tasks, UBPM waits for the initial contact from the task host client

(performed when the client wants to open a RPC communication channel with UBPM, similar to the

way in which Service control applications open a channel to the SCM) and sends the Start Task com mand. UBPM finally registers a wait callback on the task's host process, which allow it to detect when a

task host's process terminates unexpectedly.

## Task Host client

The Task Host client process receives commands from UBPM (Task Host Server) living in the Task Scheduler service. At initialization time, it opens the local RPC interface that was created by UBPM during its initialization and loops forever, waiting for commands to come through the channel. Four commands are currently supported, which are sent over the T askHostSendResponseReceive Command RPC API:

- ● Stopping the host
● Starting a task
● Stopping a task
● Terminating a task
All task-based commands are internally implemented by a generic COM task library, and they essentially result in the creation and destruction of COM components. In particular, hosted tasks are COM objects that inherit from the ITaskHandler interface. The latter exposes only four required methods, which correspond to the different task's state transitions: Start, Stop, Pause, and Resume. When UBPM sends the command to start a task to its client host process, the latter (Taskhostw.exe) creates a new thread for the task. The new task worker thread uses the CoCreateInstance function to create an instance of the ITaskHandler COM object representing the task and calls its Start method. UBPM knows exactly which CLSID (class unique ID) identifies a particular task: The task's CLSID is stored by the Task store in the task's configuration and is specified at task registration time. Additionally, hosted tasks use the functions exposed by the ITaskHandlerStatus COM interface to notify UBPM of their current execution state. The interface uses RPCs to call UbpmReportTaskStatus and report the new state back to UBPM.

---

## EXPERIMENT: Witnessing a COM-hosted task

In this experiment, you witness how the task host client process loads the COM server DLL that

implements the task. For this experiment, you need the Debugging tools installed on your

system. (You can find the Debugging tools as part of the Windows SDK, which is available at the

https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk/) You will enable the

task start's debugger breakpoint by following these steps:

1. You need to set up Windbg as the default post-mortem debugger. (You can skip this

step if you have connected a kernel debugger to the target system.) T o do that, open an

administrative command prompt and type the following commands:

```bash
cd "C:\Program Files (x86)\Windows Kits\10\Debuggers\x64\
windbox.exe /I
```

Note that C:\Program Files \x60\Windows Kits\10\Debuggers\x64-is the path of the Debugging tools, which can change depending on the debugger's version and the setup program.

2. Windbg should run and show the following message, confirming the success of

the operation:

![Figure](figures/Winternals7thPt2_page_515_figure_006.png)

3. After you click on the OK button, WinDbg should close automatically.

4. Open the Task Scheduler applet (by typing taskschd.msc in the command prompt).

5. Note that unless you have a kernel debugger attached, you can't enable the initial task's

breakpoint on noninteractive tasks; otherwise, you won't be able to interact with the

debugger window, which will be spawned in another noninteractive session.

6. Looking at the various tasks (refer to the previous experiment, "Explore a task's XML descriptor" for further details), you should find an interactive COM task (named CacheTask) under the \Microsoft\Windows\Winwin\textbf{Title}. Remember that the task's

Actions page should show Custom Handler; otherwise the task is not COM task.

7. Open the Registry Editor (by typing regedit in the command prompt window) and navigate to the following registry key: HKLM\SOFTWARE\Microsoft\Windows NT\ CurrentVersion\Schedule.

8. Right-click the Schedule key and create a new registry value by selecting Multi-String

Value from the New menu.

---

9. Name the new registry value as EnableDebuggerBreakForTaskStart. To enable the initial task breakpoint, you should insert the full path of the task. In this case, the full path is \MicrosoftWindowsWininetCacheTask. In the previous experiment, the task path has been referred as the task's URI.

10. Close the Registry Editor and switch back to the Task Scheduler.

11. Right-click the CacheTask task and select Run.

12. If you have configured everything correctly, a new WinDbg window should appear.

13. Configure the symbols used by the debugger by selecting the Symbol File Path item

from the File menu and by inserting a valid path to the Windows symbol server (see

https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/microsoft public-symbols for more details).

14. You should be able to peek at the call stack of the Taskhostw.exe process just before

it was interrupted using the k command:

```bash
0:000> # Child-SP
# Child-SP      RetAddr     Call Site
00000007a10a7f610 00007ff6 0b0337a8 taskhostw!ComTaskMgrBase:[ComTaskMgr]:^Sta
rtComTask+0x2c4
01 0000007a10a7f60 00007ff6 0b033621 taskhostw!StartComTask+0x58
02 0000007a10a7f9d0 00007ff6 0b033191 taskhostw!UbpTaskHostWaitForCommands+0x2d1
3 0000007a10a7f00 00007ff6 0b035659 taskhostw!WWinMain+0xcl
04 0000007a10a7f6b0 00007fff 39487bd4 taskhostw!__wmainCRTStartup+0x1c9
05 0000000a10a7fc20 00007fff 39aeeddd 0KERNEL32!BaseThreadIntThunk+0x14
06 00000007a10a7fc50 00000000 00000000 nddl!It!UseThreadStart+0x21
```

15. The stack shows that the task host client has just been spawned by UBPM and has received the Start command requesting to start a task.

16. In the Windbg console, insert the ~. command and press Enter. Note the current executing thread ID.

17. You should now put a breakpoint on the CoCreateInstance COM API and resume the

execution, using the following commands:

```bash
bp combase!CoCreateInstance
g
```

18. After the debugger breaks, again insert the -- command in the Windbg console, press

Enter, and note that the thread ID has completely changed.

19. This demonstrates that the task host client has created a new thread for executing the

task entry point. The documented CoCreateInstance function is used for creating a single

COM object of the class associated with a particular CLSID, specified as a parameter. Two

GUIDs are interesting for this experiment: the GUID of the COM class that represents the

Task and the interface ID of the interface implemented by the COM object.

---

20. In 64-bit systems, the calling convention defines that the first four function parameters

are passed through registers, so it is easy to extract those GUIDs:

```bash
0:004+ dt combase\CLSID\0rx
(035b920-0c47-461f-98f4-5e83cd89148)
 +0x000 Data1                     : 0x35b920
 +0x004 Data2                     : 0xac7
 +0x006 Data3                     : 0x461f
 +0x008 Data4                     : [8] ????
0:004+ dt combase\IID @r9
(839d762-5121-4009-9234-f40d19394f04)
 +0x000 Data1                     : 0x839d762
 +0x004 Data2                     : 0x5121
 +0x006 Data3                     : 0x4009
 +0x008 Data4                     : [8] ????
```

As you can see from the preceding output, the COM server CLSID is 0358b920-0ac7-61f98f4-58e32cd89148. You can verify that it corresponds to the GUID of the only COM action

located in the XML descriptor of the "CacheTask" task (see the previous experiment for details).

The requested interface ID is {"839d7762-5121-4009-9234-4f0df19394f04", which correspond to

the GUID of the COM task handler action interface (ITaskHandler).

## Task Scheduler COM interfaces

As we have discussed in the previous section, a COM task should adhere to a well-defined interface, which is used by UBPm to manage the state transition of the task. While UBPm decides when to start the task and manages all of its state, all the other interfaces used to register, remove, or just manually start and stop a task are implemented by the Task Scheduler in its client-side DLL (Tasksch.dll).

ITaskService is the central interface by which clients can connect to the Task Scheduler and perform

multiple operations, like enumerate registered tasks; get an instance of the T ask store (represented by

the ITaskFolder COM interface), and enable, disable, delete, or register a task and all of its associated

triggers and actions (by using the ITaskDefinition COM interface). When a client application invokes for

the first time a T ask Scheduler APIs through COM, the system loads the T ask Scheduler client-side DLL

(T askschd.dll) into the client process's address space (as dictated by the COM contract: T ask Scheduler

COM objects live in an in- proc COM server). The COM APIs are implemented by routing requests

through RPC calls into the Task Scheduler service, which processes each request and forwards it to

UBPM if needed. The T ask Scheduler COM architecture allows users to interact with it via scripting

languages like PowerShell (through the ScheduledT asks cmdlet) or VBScript.

