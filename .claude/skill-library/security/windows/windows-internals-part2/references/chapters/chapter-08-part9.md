## Windows Notification Facility

The Windows Notification Facility, or WNF, is the core underpinning of a modern registrationless publisher/subscriber mechanism that was added in Windows 8 as a response to a number of architectural deficiencies when it came to notifying interested parties about the existence of some action, event, or state, and supplying a data payload associated with this state change.

To illustrate this, consider the following scenario: Service A wants to notify potential clients B, C, and D that the disk has been scanned and is safe for write access, as well as the number of bad sectors (if any) that were detected during the scan. There is no guarantee that B, C, D start after A—in fact, there's a good chance they might start earlier. In this case, it is unsafe for them to continue their execution, and they should wait for A to execute and report the disk is safe for write access. But if A isn't even running yet, how does one wait for it in the first place?

---

A typical solution would be for B to create an event "CAN_I_WAIT_FOR_A_YET" and then have A look for this event once started, create the "A_SAYS_DISK_IS_SAFE" event and then signal "CAN_I_WAIT_ FOR_A_YET," allowing B to know it's now safe to wait for "A_SAYS_DISK_IS_SAFE". In a single client scenario, this is feasible, but things become even more complex once we think about C and D, which might all be going through this same logic and could raise the creation of the "CAN_I_WAIT_FOR_A_YET" event, at which point they would open the existing event (in our example, created by B) and wait on it to be signaled. Although this can be done, what guarantees that this event is truly created by B? Issues around malleus "squatting" of the name and denial of service attacks around the name now arise. Ultimately, a safe protocol can be designed, but this requires a lot of complexity for the developer(s) of A, B, C, and D— and we haven't even discussed how to get the number of bad sectors.

WNF features

The scenario described in the preceding section is a common one in operating system design—and the correct pattern for solving it clearly shouldn’t be left to individual developers. Part of a job of an operating system is to provide simple, scalable, and performant solutions to common architectural challenges such as these, and this is what WNF aims to provide on modern Windows platforms, by providing:

■ The ability to define a state name that can be subscribed to, or published to by arbitrary processes, secured by a standard Windows security descriptor (with a DACL and SACL)

■ The ability to associate such a state name with a payload of up to 4 KB, which can be retrieved along with the subscription to a change in the state (and published with the change)

■ The ability to persist state data even between reboots, such that consumers may be able to see previously published data, if they were not yet running

■ The ability to assign state change timestamps to each state name, such that consumers can know, even across reboots, if new data was published at some point without the consumer being active (and whether within an interactive session ID, a server silo (container), a given user token/SID, or exist within an individual process)

■ The ability to assign scope to each state name, such that multiple instances of the same state name can exist either within an interactive session ID, a server silo (container), a given user token/SID, or exist within an individual process.

■ Finally, the ability to do all of the publishing and consuming of WNF state names while crossing the kernel/user boundary, such that components can interact with each other on either side.

CHAPTER 8 System mechanisms 225


---

## WNF users

As the reader can tell, providing all these semantics allows for a rich set of services and kernel components to leverage WNF to provide notifications and other state change signals to hundreds of clients (which could be as fine-grained as individual APIs in various system libraries to large scale processes). In fact, several key system components and infrastructure now use WNF, such as

- ■ The Power Manager and various related components use WNF to signal actions such as clos-
ing and opening the lid, battery charging state, turning the monitor off and on, user presence
detection, and more.
■ The Shell and its components use WNF to track application launches, user activity, lock screen
behavior, taskbar behavior, Cortana usage, and Start menu behavior.
■ The System Events Broker (SEB) is an entire infrastructure that is leveraged by UWP applications
and brokers to receive notifications about system events such as the audio input and output.
■ The Process Manager uses per-process temporary WNF state names to implement the wake
channel that is used by the Process Lifetime Manager (PLM) to implement part of the mechanism
that allows certain events to force-wake processes that are marked for suspension (deep freeze).
Enumerating all users of WNF would take up this entire book because more than 6000 different well-known state names are used, in addition to the various temporary names that are created (such as the per-process wake channels). However, a later experiment showcases the use of the wnfdump utility part of the book tools, which allows the reader to enumerate and interact with all of their system's WNF events and their data. The Windows Debugging Tools also provide a !wnf extension that is shown in a future experiment and can also be used for this purpose. Meanwhile, the Table 8-31 explains some of the key WNF state name prefixes and their uses. You will encounter many Windows components and codenames across a vast variety of Windows SKUs, from Windows Phone to XBOX, exposing the richness of the WNF mechanism and its pervasiveness.

TABLE 8-31 WNF state name prefixes

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>9P</td><td>2</td><td>Plan 9 Redirector</td></tr><tr><td>A2A</td><td>1</td><td>App-to-App</td></tr><tr><td>AAD</td><td>2</td><td>Azure Active Directory</td></tr><tr><td>AA</td><td>3</td><td>Assigned Access</td></tr><tr><td>ACC</td><td>1</td><td>Accessibility</td></tr><tr><td>ACHK</td><td>1</td><td>Boot Disk Integrity Check (Autochk)</td></tr><tr><td>ACT</td><td>1</td><td>Activity</td></tr><tr><td>AFD</td><td>1</td><td>Ancillary Function Driver (Winsock)</td></tr><tr><td>AI</td><td>9</td><td>Application Install</td></tr><tr><td>AOW</td><td>1</td><td>Android-on-Windows (Deprecated)</td></tr><tr><td>ATP</td><td>1</td><td>Microsoft Defender ATP</td></tr></table>


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>AUDC</td><td>15</td><td>Audio Capture</td></tr><tr><td>AVA</td><td>1</td><td>Voice Activation</td></tr><tr><td>AVLC</td><td>3</td><td>Volume Limit Change</td></tr><tr><td>BCST</td><td>1</td><td>App Broadcast Service</td></tr><tr><td>BI</td><td>16</td><td>Broker Infrastructure</td></tr><tr><td>BLTH</td><td>14</td><td>Bluetooth</td></tr><tr><td>BMP</td><td>2</td><td>Background Media Player</td></tr><tr><td>BOOT</td><td>3</td><td>Boot Loader</td></tr><tr><td>BRI</td><td>1</td><td>Brightness</td></tr><tr><td>BSC</td><td>1</td><td>Browser Configuration (Legacy IE, Deprecated)</td></tr><tr><td>CAM</td><td>66</td><td>Capability Access Manager</td></tr><tr><td>CAPS</td><td>1</td><td>Central Access Policies</td></tr><tr><td>CCTL</td><td>1</td><td>Call Control Broker</td></tr><tr><td>CDP</td><td>17</td><td>Connected Devices Platform (Project &quot;Rome&quot;/Application Handoff)</td></tr><tr><td>CELL</td><td>78</td><td>Cellular Services</td></tr><tr><td>CERT</td><td>2</td><td>Certificate Cache</td></tr><tr><td>CFCL</td><td>3</td><td>Flight Configuration Client Changes</td></tr><tr><td>CI</td><td>4</td><td>Code Integrity</td></tr><tr><td>CLIP</td><td>6</td><td>Clipboard</td></tr><tr><td>CMFC</td><td>1</td><td>Configuration Management Feature Configuration</td></tr><tr><td>CMPT</td><td>1</td><td>Compatibility</td></tr><tr><td>CNET</td><td>10</td><td>Cellular Networking (Data)</td></tr><tr><td>CONT</td><td>1</td><td>Containers</td></tr><tr><td>CSC</td><td>1</td><td>Client Side Caching</td></tr><tr><td>CSHL</td><td>1</td><td>Composable Shell</td></tr><tr><td>CSH</td><td>1</td><td>Custom Shell Host</td></tr><tr><td>CXH</td><td>6</td><td>Cloud Experience Host</td></tr><tr><td>DBA</td><td>1</td><td>Device Broker Access</td></tr><tr><td>DSCP</td><td>1</td><td>Diagnostic Log CSP</td></tr><tr><td>DEP</td><td>2</td><td>Deployment (Windows Setup)</td></tr><tr><td>DEVM</td><td>3</td><td>Device Management</td></tr><tr><td>DICT</td><td>1</td><td>Dictionary</td></tr><tr><td>DISK</td><td>1</td><td>Disk</td></tr><tr><td>DISP</td><td>2</td><td>Display</td></tr><tr><td>DMF</td><td>4</td><td>Data Migration Framework</td></tr></table>


CHAPTER 8    System mechanisms      227


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>DNS</td><td>1</td><td>DNS</td></tr><tr><td>DO</td><td>2</td><td>Delivery Optimization</td></tr><tr><td>DSM</td><td>2</td><td>Device State Manager</td></tr><tr><td>DUMP</td><td>2</td><td>Crash Dump</td></tr><tr><td>DUSM</td><td>2</td><td>Data Usage Subscription Management</td></tr><tr><td>DWM</td><td>9</td><td>Desktop Window Manager</td></tr><tr><td>DXGK</td><td>2</td><td>DirectX Kernel</td></tr><tr><td>DX</td><td>24</td><td>DirectX</td></tr><tr><td>EAP</td><td>1</td><td>Extensible Authentication Protocol</td></tr><tr><td>EDGE</td><td>4</td><td>Edge Browser</td></tr><tr><td>EDP</td><td>15</td><td>Enterprise Data Protection</td></tr><tr><td>EDU</td><td>1</td><td>Education</td></tr><tr><td>EFS</td><td>2</td><td>Encrypted File Service</td></tr><tr><td>EMS</td><td>1</td><td>Emergency Management Services</td></tr><tr><td>ENTR</td><td>86</td><td>Enterprise Group Policies</td></tr><tr><td>EOA</td><td>8</td><td>Ease of Access</td></tr><tr><td>ETW</td><td>1</td><td>Event Tracing for Windows</td></tr><tr><td>EXEC</td><td>6</td><td>Execution Components (Thermal Monitoring)</td></tr><tr><td>FCON</td><td>1</td><td>Feature Configuration</td></tr><tr><td>FDBK</td><td>1</td><td>Feedback</td></tr><tr><td>FLTN</td><td>1</td><td>Flighting Notifications</td></tr><tr><td>FLT</td><td>2</td><td>Filter Manager</td></tr><tr><td>FLYT</td><td>1</td><td>Flight ID</td></tr><tr><td>FOD</td><td>1</td><td>Features on Demand</td></tr><tr><td>FSRL</td><td>2</td><td>File System Runtime (FsRtl)</td></tr><tr><td>FVE</td><td>15</td><td>Full Volume Encryption</td></tr><tr><td>GC</td><td>9</td><td>Game Core</td></tr><tr><td>GIP</td><td>1</td><td>Graphics</td></tr><tr><td>GLOB</td><td>3</td><td>Globalization</td></tr><tr><td>GPOL</td><td>2</td><td>Group Policy</td></tr><tr><td>HAM</td><td>1</td><td>Host Activity Manager</td></tr><tr><td>HAS</td><td>1</td><td>Host Attestation Service</td></tr><tr><td>HOLO</td><td>32</td><td>Holographic Services</td></tr><tr><td>HPM</td><td>1</td><td>Human Presence Manager</td></tr><tr><td>HVL</td><td>1</td><td>Hypervisor Library (Hvl)</td></tr></table>


228     CHAPTER 8   System mechanisms


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>HYPV</td><td>2</td><td>Hyper-V</td></tr><tr><td>IME</td><td>4</td><td>Input Method Editor</td></tr><tr><td>MSN</td><td>7</td><td>Immersive Shell Notifications</td></tr><tr><td>IMS</td><td>1</td><td>Entitlements</td></tr><tr><td>INPUT</td><td>5</td><td>Input</td></tr><tr><td>IOT</td><td>2</td><td>Internet of Things</td></tr><tr><td>ISM</td><td>4</td><td>Input State Manager</td></tr><tr><td>IUIS</td><td>1</td><td>Immersive UI Scale</td></tr><tr><td>KSR</td><td>2</td><td>Kernel Soft Reboot</td></tr><tr><td>KSV</td><td>5</td><td>Kernel Streaming</td></tr><tr><td>LANG</td><td>2</td><td>Language Features</td></tr><tr><td>LED</td><td>1</td><td>LED Alert</td></tr><tr><td>LFS</td><td>12</td><td>Location Framework Service</td></tr><tr><td>LIC</td><td>9</td><td>Licensing</td></tr><tr><td>LM</td><td>7</td><td>License Manager</td></tr><tr><td>LOC</td><td>3</td><td>Geolocation</td></tr><tr><td>LOGN</td><td>8</td><td>Logon</td></tr><tr><td>MAPS</td><td>3</td><td>Maps</td></tr><tr><td>MBAE</td><td>1</td><td>MBAE</td></tr><tr><td>MM</td><td>3</td><td>Memory Manager</td></tr><tr><td>MON</td><td>1</td><td>Monitor Devices</td></tr><tr><td>MRT</td><td>5</td><td>Microsoft Resource Manager</td></tr><tr><td>MSA</td><td>7</td><td>Microsoft Account</td></tr><tr><td>MSHL</td><td>1</td><td>Minimal Shell</td></tr><tr><td>MUR</td><td>2</td><td>Media UI Request</td></tr><tr><td>MU</td><td>1</td><td>Unknown</td></tr><tr><td>NASV</td><td>5</td><td>Natural Authentication Service</td></tr><tr><td>NCB</td><td>1</td><td>Network Connection Broker</td></tr><tr><td>NDIS</td><td>2</td><td>Kernel NDIS</td></tr><tr><td>NFC</td><td>1</td><td>Near Field Communication (NFC) Services</td></tr><tr><td>NGC</td><td>12</td><td>Next Generation Crypto</td></tr><tr><td>NLA</td><td>2</td><td>Network Location Awareness</td></tr><tr><td>NLM</td><td>6</td><td>Network Location Manager</td></tr><tr><td>NLS</td><td>4</td><td>Nationalization Language Services</td></tr></table>

CHAPTER 8 System mechanisms

229


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>NPSM</td><td>1</td><td>Now Playing Session Manager</td></tr><tr><td>NSI</td><td>1</td><td>Network Store Interface Service</td></tr><tr><td>OLIC</td><td>4</td><td>OS Licensing</td></tr><tr><td>OBE</td><td>4</td><td>Out-Of-Box-Experience</td></tr><tr><td>OSWN</td><td>8</td><td>OS Storage</td></tr><tr><td>OS</td><td>2</td><td>Base OS</td></tr><tr><td>OVRD</td><td>1</td><td>Window Override</td></tr><tr><td>PAY</td><td>1</td><td>Payment Broker</td></tr><tr><td>PDM</td><td>2</td><td>Print Device Manager</td></tr><tr><td>PFG</td><td>2</td><td>Pen First Gesture</td></tr><tr><td>PHNL</td><td>1</td><td>Phone Line</td></tr><tr><td>PHNP</td><td>3</td><td>Phone Private</td></tr><tr><td>PHN</td><td>2</td><td>Phone</td></tr><tr><td>PMEM</td><td>1</td><td>Persistent Memory</td></tr><tr><td>PNPA-D</td><td>13</td><td>Plug-and-Play Manager</td></tr><tr><td>PO</td><td>54</td><td>Power Manager</td></tr><tr><td>PROV</td><td>6</td><td>Runtime Provisioning</td></tr><tr><td>PS</td><td>1</td><td>Kernel Process Manager</td></tr><tr><td>PTI</td><td>1</td><td>Push to Install Service</td></tr><tr><td>RDR</td><td>1</td><td>Kernel SMB Redirector</td></tr><tr><td>RM</td><td>3</td><td>Game Mode Resource Manager</td></tr><tr><td>RPCF</td><td>1</td><td>RPC Firewall Manager</td></tr><tr><td>RTDS</td><td>2</td><td>Runtime Trigger Data Store</td></tr><tr><td>RTSC</td><td>2</td><td>Recommended Troubleshooting Client</td></tr><tr><td>SBS</td><td>1</td><td>Secure Boot State</td></tr><tr><td>SCH</td><td>3</td><td>Secure Channel (SChannel)</td></tr><tr><td>SCM</td><td>1</td><td>Service Control Manager</td></tr><tr><td>SDO</td><td>1</td><td>Simple Device Orientation Change</td></tr><tr><td>SEB</td><td>61</td><td>System Events Broker</td></tr><tr><td>SFA</td><td>1</td><td>Secondary Factor Authentication</td></tr><tr><td>SHEL</td><td>138</td><td>Shell</td></tr><tr><td>SHR</td><td>3</td><td>Internet Connection Sharing (ICS)</td></tr><tr><td>SIDX</td><td>1</td><td>Search Indexer</td></tr><tr><td>SIO</td><td>2</td><td>Sign-In Options</td></tr></table>


230      CHAPTER 8    System mechanisms


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>SYKD</td><td>2</td><td>SkyDrive (Microsoft OneDrive)</td></tr><tr><td>SMSR</td><td>3</td><td>SMS Router</td></tr><tr><td>SMSS</td><td>1</td><td>Session Manager</td></tr><tr><td>SMS</td><td>1</td><td>SMS Messages</td></tr><tr><td>SPAC</td><td>2</td><td>Storage Spaces</td></tr><tr><td>SPCH</td><td>4</td><td>Speech</td></tr><tr><td>SPI</td><td>1</td><td>System Parameter Information</td></tr><tr><td>SPLT</td><td>4</td><td>Servicing</td></tr><tr><td>SRC</td><td>1</td><td>System Radio Change</td></tr><tr><td>SRP</td><td>1</td><td>System Replication</td></tr><tr><td>SRT</td><td>1</td><td>System Restore (Windows Recovery Environment)</td></tr><tr><td>SRUM</td><td>1</td><td>Sleep Study</td></tr><tr><td>SRV</td><td>2</td><td>Service Message Block (SMB/CIFS)</td></tr><tr><td>STOR</td><td>3</td><td>Storage</td></tr><tr><td>SUPP</td><td>1</td><td>Support</td></tr><tr><td>SYNC</td><td>1</td><td>Phone Synchronization</td></tr><tr><td>SYS</td><td>1</td><td>System</td></tr><tr><td>TB</td><td>1</td><td>Time Broker</td></tr><tr><td>TEAM</td><td>4</td><td>TeamOS Platform</td></tr><tr><td>TEL</td><td>5</td><td>Microsoft Defender ATP Telemetry</td></tr><tr><td>TETH</td><td>2</td><td>Tethering</td></tr><tr><td>THME</td><td>1</td><td>Themes</td></tr><tr><td>TKBN</td><td>24</td><td>Touch Keyboard Broker</td></tr><tr><td>TKBR</td><td>3</td><td>Token Broker</td></tr><tr><td>TMCN</td><td>1</td><td>Tablet Mode Control Notification</td></tr><tr><td>TOPE</td><td>1</td><td>Touch Event</td></tr><tr><td>TPM</td><td>9</td><td>Trusted Platform Module (TPM)</td></tr><tr><td>TZ</td><td>6</td><td>Time Zone</td></tr><tr><td>UBPM</td><td>4</td><td>User Mode Power Manager</td></tr><tr><td>UDA</td><td>1</td><td>User Data Access</td></tr><tr><td>UDM</td><td>1</td><td>User Device Manager</td></tr><tr><td>UMDF</td><td>2</td><td>User Mode Driver Framework</td></tr><tr><td>UMGR</td><td>9</td><td>User Manager</td></tr><tr><td>USB</td><td>8</td><td>Universal Serial Bus (USB) Stack</td></tr></table>

CHAPTER 8 System mechanisms 231


---

<table><tr><td>Prefix</td><td># of Names</td><td>Usage</td></tr><tr><td>USO</td><td>16</td><td>Update Orchestrator</td></tr><tr><td>UTS</td><td>2</td><td>User Trusted Signals</td></tr><tr><td>UUS</td><td>1</td><td>Unknown</td></tr><tr><td>UWF</td><td>4</td><td>Unified Write Filter</td></tr><tr><td>VAN</td><td>1</td><td>Virtual Area Networks</td></tr><tr><td>VPN</td><td>1</td><td>Virtual Private Networks</td></tr><tr><td>VTSV</td><td>2</td><td>Vault Service</td></tr><tr><td>WAAS</td><td>2</td><td>Windows-as-a-Service</td></tr><tr><td>WBIO</td><td>1</td><td>Windows Biometrics</td></tr><tr><td>WCDS</td><td>1</td><td>Wireless LAN</td></tr><tr><td>WCM</td><td>6</td><td>Windows Connection Manager</td></tr><tr><td>WDAG</td><td>2</td><td>Windows Defender Application Guard</td></tr><tr><td>WDSC</td><td>1</td><td>Windows Defender Security Settings</td></tr><tr><td>WEBA</td><td>2</td><td>Web Authentication</td></tr><tr><td>WER</td><td>3</td><td>Windows Error Reporting</td></tr><tr><td>WFAS</td><td>1</td><td>Windows Firewall Application Service</td></tr><tr><td>WFDN</td><td>3</td><td>WiFi Display Connect (MiraCast)</td></tr><tr><td>WFS</td><td>5</td><td>Windows Family Safety</td></tr><tr><td>WHTP</td><td>2</td><td>Windows HTTP Library</td></tr><tr><td>WIFI</td><td>15</td><td>Windows Wireless Network (WiFi) Stack</td></tr><tr><td>WIL</td><td>20</td><td>Windows Instrumentation Library</td></tr><tr><td>WNS</td><td>1</td><td>Windows Notification Service</td></tr><tr><td>WOF</td><td>1</td><td>Windows Overlay Filter</td></tr><tr><td>WOSC</td><td>9</td><td>Windows One Setting Configuration</td></tr><tr><td>WPN</td><td>5</td><td>Windows Push Notifications</td></tr><tr><td>WSC</td><td>1</td><td>Windows Security Center</td></tr><tr><td>WSL</td><td>1</td><td>Windows Subsystem for Linux</td></tr><tr><td>WSQM</td><td>1</td><td>Windows Software Quality Metrics (SQM)</td></tr><tr><td>WUA</td><td>6</td><td>Windows Update</td></tr><tr><td>WWAN</td><td>5</td><td>Wireless Wire Area Network (WWAN) Service</td></tr><tr><td>XBOX</td><td>116</td><td>XBOX Services</td></tr></table>


---

## WNF state names and storage

WNF state names are represented as random-looking 64-bit identifiers such as 0xAC41491908517835 and then defined to a friendly name using C preprocessor macros such as WNF_AUDC_CAPTURE_ACTIVE. In reality, however, these numbers are used to encode a version number (1), a lifetime (persistent versus temporary), a scope (process-instanced, container-instanced, user-instanced, session-instanced, or machine-instanced), a permanent data flag, and, for well-known state names, a prefix identifying the owner of the state name followed by a unique sequence number. Figure 8-41 below shows this format.

![Figure](figures/Winternals7thPt2_page_264_figure_002.png)

FIGURE 8-41 Format of a WNF state name.

As mentioned earlier, state names can be well-known, which means that they are preprovisioned for arbitrary out-of-order use. WNF achieves this by using the registry as a backing store, which will encode the security descriptor, maximum data size, and type ID (if any) under the HKLM\SYSTEM\ CurrentControlSet\Control\Notifications registry key. For each state name, the information is stored under a value matching the 64-bit encoded WNF state name identifier.

Additionally, WNF state names can also be registered as persistent, meaning that they will remain registered for the duration of the system's uptime, regardless of the registrar's process lifetime. This mimics permanent objects that were shown in the "Object Manager" section of this chapter, and similarly, the SeCreatePermanentPrivilege privilege is required to register such state names. These WNF state names also live in the registry, but under the HKLM\SOFTWARE\Microsoft\Windows NT\ CurrentVersion\VolatileNotifications key, and take advantage of the registry's volatile flag to simply disappear once the machine is rebooted. You might be confused to see "volatile" registry keys being used for "persistent" WNF data—keep in mind that, as we just indicated, the persistence here is within a boot session (versus attached to process lifetime, which is what WNF calls temporary, and which we'll see later).

Furthermore, a WNF state name can be registered as permanent, which endows it with the ability to persist even across reboots. This is the type of "persistence" you may have been expecting earlier. This is done by using yet another registry key, this time without the volatile flag set, present at HKLM\SOFTWARE\Microsofts\NT\CurrentVersionNotifications. Suffixe it to say, the SeCreatePermanentPrivilege is needed for this level of persistence as well. For these types of WNF states, there is an additional registry key found below the hierarchy, called Data, which contains, for each 64-bit encoded WNF state name identifier, the last change stamp, and the binary data. Note that if the WNF state name was never written to on your machine, the latter information might be missing.

---

## Experiment: View WNF state names and data in the registry

In this experiment, you use the Registry Editor to take a look at the well-known WNF names as well as some examples of permanent and persistent names. By looking at the raw binary registry data, you will be able to see the data and security descriptor information.

Open Registry Editor and navigate to the HKEY_LOCAL_MACHINE\SYSTEM\

CurrentControlSet\Control\Notifications key.

Take a look at the values you see, which should look like the screenshot below.

![Figure](figures/Winternals7thPt2_page_265_figure_004.png)

Double-click the value called 4950C3E43BC0875 (WNF_SBS_UPDATE_AVAILABLE), which

opens the raw registry data binary editor.

Note how in the following figure, you can see the security descriptor (the highlighted binary data, which includes the SIDS 1-5-18), as well as the maximum data size (0 bytes).

---

Finally, if you want to see some examples of permanent WNF state, use the Registry Editor to go to the HKEY_LOCAL_MACHINES\SOFTWARE\Microsoft\Windows\NT\CurrentVersion\Remarks\ Data key, and look at the value 41BB1D29A3BC0C75 (WNF_DSM\DEAPM\NTP)\textsuperscript{1} An example is shown in the following figure, in which you can see the last application that was installed on this system (MicrosoftWindows\UndockedDevKit).

Finally, a completely arbitrary state name can be registered as a temporary name. Such names have a few distinctions from what was shown so far. First, because their names are not known in advance, they do require the consumers and producers to have some way of passing the identifier between each other. Normally, whoever attempts to consume the state data first or to produce state data instead up internally creating and/or using the matching registry key to store the data. However, with temporary WNF state names, this isn’t possible because the name is based on a monotonically increasing sequence number.

CHAPTER 8 System mechanisms 235


---

Second, and related to this fact, no registry keys are used to encode temporary state names—they are tied to the process that registered a given instance of a state name, and all the data is stored in kernel pool only. These types of names, for example, are used to implement the per-process wake channels described earlier. Other uses include power manager notifications, and direct service triggers used by the SCM.

## WNF publishing and subscription model

When publishers leverage WNF, they do so by following a standard pattern of registering the state name (in the case of non-well-known state names) and publishing some data that they want to expose. They can also choose not to publish any data but simply provide a 0-byte buffer, which serves as a way to "light up" the state and signals the subscribers anyway, even though no data was stored.

Consumers, on the other hand, use WNF's registration capabilities to associate a callback with a

given WNF state name. Whenever a change is published, this callback is activated, and, for kernel

mode, the caller is expected to call the appropriate WNF API to retrieve the data associated with the

state name. (The buffer size is provided, allowing the caller to allocate some pool, if needed, or perhaps

choose to use the stack.) For user mode, on the other hand, the underlying WNF notification mecha nism inside of Ntll.dll takes care of allocating a heap-backed buffer and providing a pointer to this

data directly to the callback registered by the subscriber.

In both cases, the callback also provides the change stamp, which acts as a unique monotonic sequence number that can be used to detect misses published data (if a subscriber was inactive, for some reason, and the publisher continued to produce changes). Additionally, a custom context can be associated with the callback, which is useful in C++ situations to tie the static function pointer to its class.

![Figure](figures/Winternals7thPt2_page_267_figure_005.png)

Note WNF provides an API for querying whether a given WNF state name has been reg istered yet (allowing a consumer to implement special logic if it detects the producer must

not yet be active), as well as an API for querying whether there are any subscriptions cur rently active for a given state name (allowing a publisher to implement special logic such as

perhaps delaying additional data publication, which would override the previous state data).

WNF manages what might be thousands of subscriptions by associating a data structure with each kernel and/or user-mode subscription and tying all the subscriptions for a given WNF state name together. This way, when a state name is published to, the list of subscriptions is parsed, and, for user mode, a delivery payload is added to a linked list followed by the signaling of a per-process notification event—this instructs the WNF delivery code in Ndtll.dll to call the API to consume the payload (and any other additional delivery payloads that were added to the list in the meantime). For kernel mode, the mechanism is simpler—the callback is synchronously executed in the context of the publisher.

Note that it's also possible to subscribe to notifications in two modes: data-notification mode, and meta-notification mode. The former does what one might expect—executing the callback when new data has been associated with a WNF state name. The latter is more interesting because it sends notifications when a new consumer has become active or inactive, as well as when a publisher has terminated (in the case of a volatile state name, where such a concept exists).

---

Finally, it's worth pointing out that user-mode subscriptions have an additional wrinkle: Because Ntdll.dll manages the WNF notifications for the entire process, it's possible for multiple components (such as dynamic libraries/DLLs) to have requested their own callback for the same WNF state name (but for different reasons and with different contexts). In this situation, the Ntdll.dll library needs to associate registration contexts with each module, so that the per-process delivery payload can be translated into the appropriate callback and only delivered if the requested delivery mode matches the notification type of the subscriber.

## Experiment: Using the WnfDump utility to dump WNF state names

In this experiment, you use one of the book tools (WnfDump) to register a WNF subscription to

the WNF_SHEL_DESKTOP_APPLICATION_STARTED state name and the WNF_AUDC_RENDER

state name.

Execute wnfdump on the command line with the following flags:

```bash
-i WNF_SHEL_DESKTOP_APPLICATION_STARTED -v
```

The tool displays information about the state name and reads its data, such as shown in the

following output:

```bash
C:\wnfdump.exe -i WNF_SHEL_DESKTOP_APPLICATION_STARTED -v
WNF_State Name                     |   S   | L   | P  | AC  | N  | CurSize  | MaxSize
-------------------------------------------------
WNF_SHEL_DESKTOP_APPLICATION_STARTED        |   S  | W  | N  | Rw  | I    |    28    |    512
65 00 3A 00 6E 00 6F 00-74 00 65 00 70 00 61 00 e.:n.o.t.o.p.a.
64 00 2E 00 65 00 78 00-65 00 00 00 d.:d..x.e..e.
```

Because this event is associated with Explorer (the shell) starting desktop applications, you will see one of the last applications you double-clicked, used the Start menu or Run menu for, or, in general, anything that the ShellExecute API was used on. The change stamp is also shown, which will end up a counter of how many desktop applications have been started this way since booting this instance of Windows (as this is a persistent, but not permanent, event).

Launch a new desktop application such as Paint by using the Start menu and try the wndump command again. You should see the change stamp incremented and new binary data shown.

## WNF event aggregation

Although WNF on its own provides a powerful way for clients and services to exchange state information and be notified of each other's statuses, there may be situations where a given client/subscriber is interested in more than a single WNF state name.

For example, there may be a WNF state name that is published whenever the screen backlight

is off, another when the wireless card is powered off, and yet another when the user is no longer

physically present. A subscriber may want to be notified when all of these WNF state names have

---

been published—yet another may require a notification when either the first two or the latter has been published.

Unfortunately, the WNF system calls and infrastructure provided by Ntll.dll for user-mode clients (and equally, the API surface provided by the kernel) only operate on single WNF state names. Therefore, the kinds of examples given would require manual handling through a state machine that each subscriber would need to implement.

To facilitate this common requirement, a component exists both in user mode as well as in kernel

mode that handles the complexity of such a state machine and exposes a simple API: the Common

Event Aggregator (CEA) implemented in CEA SYS for kernel-mode callers and EventAggregation dll

for user-mode callers. These libraries export a set of APIs (such as EaCreateAggregatedEvent and

EaSignalAggregatedEvent), which allow an interrupt-type behavior (a start callback while a WNF state

is true, and a stop callback once the WNF state is false) as well as the combination of conditions with

operators such as AND, OR, or NOT.

Users of CEA include the USB Stack as well as the Windows Driver Foundation (WDF), which exposes a framework callback for WNF state name changes. Further, the Power Delivery Coordinator (Pdc.sys) uses CEA to build power state machines like the example at the beginning of this subsection. The Unified Background Process Manager (UBPM) described in Chapter 9 also relies on CEA to implement capabilities such as starting and stopping services based on low power and/or idle conditions.

Finally, WNF is also integral to a service called the System Event Broker (SEB), implemented in SystemEventsBroker.dll and whose client library lives in SystemEventsBrokerClient.dll. The latter exports APIs such as SebRegisterPrivateEvent, SebQueryEventData, and SebSignalEvent, which are then passed through an RPC interface to the service. In user mode, SEB is a cornerstone of the Universal Windows Platform (UWP) and the various APIs that interrogate system state, and services that trigger themselves based on certain state changes that WNF exposes. Especially on OneCore-derived systems such as Windows Phone and XBOX (which, as was shown earlier, make up more than a few hundred of the wellknown WNF state names), SEB is a central powerhouse of system notification capabilities, replacing the legacy role that the Window Manager provided through messages such as WM_DEVICEARRIVAL,

WM_SESSIONENDCHANGE, WM_POWER, and others.

SEB pipes into the Broker Infrastructure (BI) used by UWP applications and allows applications, even

when running under an AppContainer, to access WNF events that map to systemwide state. In turn, for

WinRT applications, the Windows.ApplicationModel.Background namespace exposes a SystemTrigger

class, which implements IBackgroundTrigger, that pipes into the SEB's RPC services and C++ API, for

certain well-known system events, which ultimately transforms to WNF_SEB_XXX event state names.

It serves as a perfect example of how something highly undocumented and internal, such as WNF, can

ultimately be at the heart of a high-level documented API for Modern UWP application development.

SEB is only one of the many brokers that UWP exposes, and at the end of the chapter, we cover back ground tasks and the Broker Infrastructure in full detail.

---

## User-mode debugging

Support for user-mode debugging is split into three different modules. The first one is located in the executive itself and has the prefix Dbgk, which stands for Debugging Framework. It provides the necessary internal functions for registering and listening for debug events, managing the debug object, and packaging the information for consumption by its user-mode counterpart. The user-mode component that talks directly to Dbgk is located in the native system library, Ntdll.dll, under a set of APIs that begin with the prefix DbgUi. These APIs are responsible for wrapping the underlying debug object implementation (which is opaque), and they allow all subsystem applications to use debugging by wrapping their own APIs around the DbgUi implementation. Finally, the third component in user-mode debugging belongs to the subsystem DLLs. It is the exposed, documented API (located in KernelBase.dll for the Windows subsystem) that each subsystem supports for performing debugging of other applications.

### Kernel support

The kernel supports user-mode debugging through an object mentioned earlier: the debug object. It provides a series of system calls, most of which map directly to the Windows debugging API, typically accessed through the DbgUi layer first. The debug object itself is a simple construct, composed of a series of flags that determine state, an event to notify any waiters that debugger events are present, a doubly linked list of debug events waiting to be processed, and a fast mutex used for locking the object. This is all the information that the kernel requires for successfully receiving and sending debugger events, and each debugged process has a debug port member in its executive process structure pointing to this debug object.

Once a process has an associated debug port, the events described in Table 8-32 can cause a debug event to be inserted into the list of events.

Apart from the causes mentioned in the table, there are a couple of special triggering cases outside

the regular scenarios that occur at the time a debugger object first becomes associated with a pro cess. The first create process and create thread messages will be manually sent when the debugger is

attached, first for the process itself and its main thread and followed by create thread messages for all

the other threads in the process. Finally, load dll events for the executable being debugged, starting

with Ntdll.dll and then all the current DLLs loaded in the debugged process will be sent. Similarly, if a

debugger is already attached, but a cloned process (fork) is created, the same events will also be sent

for the first thread in the clone (as instead of just Ntdll.dll, all other DLLs are also present in the cloned

address space).

There also exists a special flag that can be set on a thread, either during creation or dynamically, called hide from debugger. When this flag is turned on, which results in the HideFromDebugger flag in the TEB to be set, all operations done by the current thread, even if the debug port has a debug port, will not result in a debugger message.

---

TABLE 8-32 Kernel-mode debugging events

<table><tr><td>Event Identifier</td><td>Meaning</td><td>Triggered By</td></tr><tr><td>DbgKmExceptionApi</td><td>An exception has occurred.</td><td>KiDispatchException during an exception that occurred in user mode.</td></tr><tr><td>DbgKmCreateThreadApi</td><td>A new thread has been created.</td><td>Startup of a user-mode thread.</td></tr><tr><td>DbgKmCreateProcessApi</td><td>A new process has been created.</td><td>Startup of a user-mode thread that is the first thread in the process, if the CreateReported flag is not already set in ERPROCESS.</td></tr><tr><td>DbgKmExitThreadApi</td><td>A thread has exited.</td><td>Death of a user-mode thread, if the ThreadInserted flag is set in ETHREAD.</td></tr><tr><td>DbgKmExitProcessApi</td><td>A process has exited.</td><td>Death of a user-mode thread that was the last thread in the process, if the ThreadInserted flag is set in ETHREAD.</td></tr><tr><td>DbgKmLoadDllApi</td><td>A DLL was loaded.</td><td>NtMapViewOfSection when the section is an image file (could be an EXE as well), if the SuppressDebugMsg flag is not set in the TEB.</td></tr><tr><td>DbgKmUnloadDllApi</td><td>A DLL was unloaded.</td><td>NtUnmapViewOfSection when the section is an image file (could be an EXE as well), if the SuppressDebugMsg flag is not set in the TEB.</td></tr><tr><td>DbgKmErrorReportApi</td><td>A user-mode exception must be forwarded to WER.</td><td>This special case message is sent over ALPC, not the debug object, if the DbgKmExceptionApi message returned DBG_EXCEPTION_NOT_HANDLED, so that WER can now take over exception processing.</td></tr></table>


Once a debugger object has been associated with a process, the process enters the deep freeze state

that is also used for UWP applications. As a reminder, this suspends all threads and prevents any new

remote thread creation. At this point, it is the debugger's responsibility to start requesting that debug

events be sent through. Debuggers usually request that debug events be sent back to user mode by

performing a wait on the debug object. This call loops the list of debug events. As each request is re moved from the list, its contents are converted from the internal DBGK structure to the native structure

that the next layer up understands. As you'll see, this structure is different from the Win32 structure as

well, and another layer of conversion has to occur. Even after all pending debug messages have been

processed by the debugger, the kernel does not automatically resume the process. It is the debugger's

responsibility to call the ContinueDebugEvent function to resume execution.

Apart from some more complex handling of certain multithreading issues, the basic model for

the framework is a simple matter of producers—code in the kernel that generates the debug events

in the previous table—and consumers—the debugger waiting on these events and acknowledging

their receipt.

## Native support

Although the basic protocol for user-mode debugging is quite simple, it's not directly usable by Windows applications—instead, it's wrapped by the DbgUi functions in Ntdll.dll. This abstraction is required to allow native applications, as well as different subsystems, to use these routines (because code inside Ntdll.dll has no dependencies). The functions that this component provides are mostly analogous to the Windows API functions and related system calls. Internally, the code also provides the functionality required to create a debug object associated with the thread. The handle to a debug

240    CHAPTER 8   System mechanisms


---

object that is created is never exposed. It is saved instead in the thread environment block (TEB) of the

debugger thread that performs the attachment. (For more information on the TEB, see Chapter 4 of

Part 1.) This value is saved in the DbgSsReserved[T] field.

When a debugger attaches to a process, it expects the process to be broken into—that is, an int 3 (bpbreakpoint) operation should have happened, generated by a thread injected into the process. If this didn't happen, the debugger would never actually be able to take control of the process and would merely see debug events flying by. Ntll.dll is responsible for creating and injecting that thread into the target process. Note that this thread is created with a special flag, which the kernel sets on the TEB, which results in the SkipThreadAttach flag to be set, avoiding DLL_THREAD_ATTACH notifications and TLS slot usage, which could cause unwanted side effects each time a debugger would break into the process.

Finally, Ntllcld1 also provides APIs to convert the native structure for debug events into the structure that the Windows API understands. This is done by following the conversions in Table 8-33.

TABLE 8-33 Native to Win32 conversions

<table><tr><td>Native State Change</td><td>Win32 State Change</td><td>Details</td></tr><tr><td>DbgCreateThreadStateChange</td><td>CREATE_THREAD_DEBUG_EVENT</td><td rowspan="4">IplimageName is always NULL, and fUnicode is always TRUE.</td></tr><tr><td>DbgCreateProcessStateChange</td><td>CREATE_PROCESS_DEBUG_EVENT</td></tr><tr><td>DbgExitThreadStateChange</td><td>EXIT_THREAD_DEBUG_EVENT</td></tr><tr><td>DbgExitProcessStateChange</td><td>EXIT_PROCESS_DEBUG_EVENT</td></tr><tr><td>DbgExceptionStateChange</td><td>OUTPUT_DEBUG_STRING_EVENT</td><td>Determination is based on the Exception Code (which can be DBG_PRINTEXCEPTION_C / DBG_PRINTEXCEPTION_WIDE_C, DBG_RIPEXCEPTION, or something else).</td></tr><tr><td>DbgBreakPointStateChange</td><td>RIP_EVENT, or EXCEPTION_DEBUG_EVENT</td><td rowspan="3">fUnicode is always TRUE</td></tr><tr><td>DbgSingleStepStateChange</td><td>LOAD_DLL_DEBUG_EVENT</td></tr><tr><td>DbgLoadDllStateChange</td><td>UNLOAD_DLL_DEBUG_EVENT</td></tr><tr><td>DbgUnloadDllStateChange</td><td>UNLOAD_DLL_DEBUG_EVENT</td><td>fUnicode is always TRUE</td></tr></table>


## EXPERIMENT: Viewing debugger objects

Although you've been using WinDbg to do kernel-mode debugging, you can also use it to debug user-mode programs. Go ahead and try starting Notepad.exe with the debugger attached using these steps:

- 1. Run WinDbg, and then click File, Open Executable.

2. Navigate to the \Windows\System32\ directory and choose Notepad.exe.

3. You're not going to do any debugging, so simply ignore whatever might come up.

You can type g in the command window to instruct WinDbg to continue executing

Notepad.
Now run Process Explorer and be sure the lower pane is enabled and configured to show

open handles. (Select View, Lower Pane View, and then Handles.) You also want to look at un named handles, so select View, Show Unnamed Handles And Mappings.

CHAPTER 8    System mechanisms      241


---

Next, click the Windbg.exe (or EngHost.exe, if you're using the WinDbg Preview) process

and look at its handle table. You should see an open, unnamed handle to a debug object. (You

can organize the table by Type to find this entry more readily.) You should see something like

the following:

![Figure](figures/Winternals7thPt2_page_273_figure_001.png)

You can try right-clicking the handle and closing it. Notepad should disappear, and the

following message should appear in WinDbg:

```bash
ERROR: WaitForEvent failed, NTSTATUS 0x0000354
This usually indicates that the debugger has been
killed out from underneath the debugger.
You can use .tlist to see if the debugger still exists.
```

In fact, if you look at the description for the NTSTATUS code given, you will find the text: "An attempt to do an operation on a debug port failed because the port is in the process of being deleted," which is exactly what you've done by closing the handle.

As you can see, the native DbgUi interface doesn't do much work to support the framework except

for this abstraction. The most complicated task it does is the conversion between native and Win32

debugger structures. This involves several additional changes to the structures.

## Windows subsystem support

The final component responsible for allowing debuggers such as Microsoft Visual Studio or WinDbg to debug user-mode applications is in KernelBase.dll. It provides the documented Windows APIs. Apart from this trivial conversion of one function name to another, there is one important management job that this side of the debugging infrastructure is responsible for: managing the duplicated file and thread handles.

Recall that each time a load DLL event is sent, a handle to the image file is duplicated by the kernel

and handed off in the event structure, as is the case with the handle to the process executable dur ing the create process event. During each wait call, KernelBase.dll checks whether this is an event that

242      CHAPTER 8   System mechanisms


---

results in a new duplicated process and/or thread handles from the kernel (the two create events). If so, it allocates a structure in which it stores the process ID, thread ID, and the thread and/or process handle associated with the event. This structure is linked into the first DbgSSReserved array index in the TEB, where we mentioned the debug object handle is stored. Likewise, KernelBase.dll also checks for exit events. When it detects such an event, it "marks" the handles in the data structure.

Once the debugger is finished using the handles and performs the continue call, KernelBase.dll

parses these structures, looks for any handles whose threads have exited, and closes the handles for

the debugger. Otherwise, those threads and processes would never exit because there would always be

open handles to them if the debugger were running.

