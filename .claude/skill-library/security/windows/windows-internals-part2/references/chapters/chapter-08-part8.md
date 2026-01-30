## Advanced local procedure call

All modern operating systems require a mechanism for securely and efficiently transferring data between one or more processes in user mode, as well as between a service in the kernel and clients in user mode. T ypically, UNIX mechanisms such as maildirs, files, named pipes, and sockets are used for portability, whereas in other cases, developers can use OS-specific functionality, such as the ubiquitous window messages used in Win32 graphical applications. In addition, Windows also implements an internal IPC mechanism called Advanced (or Asynchronous) Local Procedure Call, or ALPC, which is a high-speed, scalable, and secured facility for message passing arbitrary-size messages.

![Figure](figures/Winternals7thPt2_page_240_figure_002.png)

Note ALPC is the replacement for an older IPC mechanism initially shipped with the very first kernel design of Windows NT, called LPC, which is why certain variables, fields, and functions might still refer to "LPC" today. Keep in mind that LPC is now emulated on top of ALPC for compatibility and has been removed from the kernel (legacy system calls still exist, which get wrapped into ALPC calls).

Although it is internal, and thus not available for third-party developers, ALPC is widely used in various parts of Windows:

- ●  Windows applications that use remote procedure call (RPC), a documented API, indirectly use
ALPC when they specify local-RPC over the ncalrpc transport, a form of RPC used to communi-
cate between processes on the same system. This is now the default transport for almost all RPC
clients. In addition, when Windows drivers leverage kernel-mode RPC, this implicitly uses ALPC
as well as the only transport permitted.
●  Whenever a Windows process and/or thread starts, as well as during any Windows subsystem
operation, ALPC is used to communicate with the subsystem process (CSRSS). All subsystems
communicate with the session manager (SMSS) over ALPC.
●  When a Windows process raises an exception, the kernel's exception dispatcher communicates
with the Windows Error Reporting (WER) Service by using ALPC. Processes also can communi-
cate with WER on their own, such as from the unhandled exception handler. (WER is discussed
later in Chapter 10.)
●  Winlogon uses ALPC to communicate with the local security authentication process, LSASS.
●  The security reference monitor (an executive component explained in Chapter 7 of Part 1) uses
ALPC to communicate with the LSASS process.
●  The user-mode power manager and power monitor communicate with the kernel-mode power
manager over ALPC, such as whenever the LCD brightness is changed.
●  The User-Mode Driver Framework (UMDF) enables user-mode drivers to communicate with the
kernel-mode reflector driver by using ALPC.
---

- The new Core Messaging mechanism used by CoreUI and modern UWP UI components use

ALPC to both register with the Core Messaging Registrar, as well as to send serialized message

objects, which replace the legacy Win32 window message model.

The Isolated LSASS process, when Credential Guard is enabled, communicates with LSASS by

using ALPC. Similarly, the Secure Kernel transmits trustlet crash dump information through

ALPC to WER.

As you can see from these examples, ALPC communication crosses all possible types of secu-

rity boundaries—from unprivileged applications to the kernel, from VTL 1 trustlets to VTL 0

services, and everything in between. Therefore, security and performance were critical require-

ments in its design.
## Connection model

Typically, ALPC messages are used between a server process and one or more client processes of that server. An ALPC connection can be established between two or more user-mode processes or between a kernel-mode component and one or more user-mode processes, or even between two kernel-mode components (albeit this would not be the most efficient way of communicating). ALPC exposes a single executive object called the port object to maintain the state needed for communication. Although this is just one object, there are several kinds of ALPC ports that it can represent:

- ■ Server connection port A named port that is a server connection request point. Clients can
connect to the server by connecting to this port.

■ Server communication port An unnamed port a server uses to communicate with one of its
clients. The server has one such port per active client.

■ Client communication port An unnamed port each client uses to communicate with its server.

■ Unconnected communication port An unnamed port a client can use to communicate
locally with itself. This model was abolished in the move from LPC to ALPC but is emulated for
Legacy LPC for compatibility reasons.
ALPC follows a connection and communication model that's somewhat reminiscent of BSD socket programming. A server first creates a server connection port (NtAlpcCreatePort), whereas a client attempts to connect to it (NtAlpcConnectPort). If the server was in a listening state (by using NtAlpcSendWaitReceivePort), it receives a connection request message and can choose to accept it (NtAlpcAcceptConnectPort). In doing so, both the client and server communication ports are created, and each respective endpoint process receives a handle to its communication port. Messages are then sent across this handle (still by using NtAlpcSendWaitReceivePort), which the server continues to receive by using the same API. Therefore, in the simplest scenario, a single server thread sits in a loop calling NtAlpcSendWaitReceivePort and receives with connection requests, which it accepts, or messages, which it handles and potentially responds to. The server can differentiate between messages by reading the PORT_HEADER structure, which sits on top of every message and contains a message type. The various message types are shown in Table 8-30.

---

TABLE 8-30 ALPC message types

<table><tr><td>Type</td><td>Meaning</td></tr><tr><td>LPC_REQUEST</td><td>A normal ALPC message, with a potential synchronous reply</td></tr><tr><td>LPC_REPLY</td><td>An ALPC message datagram, sent as an asynchronous reply to a previous datagram</td></tr><tr><td>LPC_DATAGRAM</td><td>An ALPC message datagram, which is immediately released and cannot be synchro-nously replied to</td></tr><tr><td>LPC_LOST_REPLY</td><td>Deprecated, used by Legacy LPC Reply API</td></tr><tr><td>LPC_PORT_CLOSED</td><td>Sent whenever the last handle of an ALPC port is closed, notifying clients and servers that the other side is gone</td></tr><tr><td>LPC_CLIENT_DIED</td><td>Sent by the process manager (PspExitThread) using Legacy LPC to the registered termi-nation port(s) of the thread and the registered exception port of the process</td></tr><tr><td>LPC_EXCEPTION</td><td>Sent by the User-Mode Debugging Framework (DbgForwardException) to the excep-tion port through Legacy LPC</td></tr><tr><td>LPC_DEBUG_EVENT</td><td>Deprecated, used by the legacy user-mode debugging services when these were part of the Windows subsystem</td></tr><tr><td>LPC_ERROR_EVENT</td><td>Sent whenever a hard error is generated from user-mode (NtRaiseHardError) and sent using Legacy LPC to exception port of the target thread, if any, otherwise to the error port, typically owned by CSRSS</td></tr><tr><td>LPC_CONNECTION_REQUEST</td><td>An ALPC message that represents an attempt by a client to connect to the server's con-nection port</td></tr><tr><td>LPC_CONNECTION_REPLY</td><td>The internal message that is sent by a server when it calls NtAlpcAcceptConnectPort to accept a client's connection request</td></tr><tr><td>LPC_CANCELLED</td><td>The received reply by a client or server that was waiting for a message that has now been canceled</td></tr><tr><td>LPC_UNREGISTER_PROCESS</td><td>Sent by the process manager when the exception port for the current process is swapped to a different one, allowing the owner (typically CSRSS) to unregister its data structures for the thread switching port to a different one</td></tr></table>

The server can also deny the connection, either for security reasons or simply due to protocol or versioning issues. Because clients can send a custom payload with a connection request, this is usually used by various services to ensure that the correct client, or only one client, is talking to the server. If any anomalies are found, the server can reject the connection and, optionally, return a payload containing information on why the client was rejected (allowing the client to take corrective action, if possible, or for debugging purposes).

Once a connection is made, a connection information structure (actually, a blob, as we describe shortly) stores the linkage between all the different ports, as shown in Figure 8-40.

CHAPTER 8 System mechanisms 211


---

![Figure](figures/Winternals7thPt2_page_243_figure_000.png)

FIGURE 8-40 Use of ALPC ports.

## Message model

Using ALPC, a client and thread using blocking messages each take turns performing a loop around the

NtAlpcSendWaitReceivePort system call, in which one side sends a request and waits for a reply while

the other side does the opposite. However, because ALPC supports asynchronous messages, it's pos sible for either side not to block and choose instead to perform some other runtime task and check for

messages later (some of these methods will be described shortly). ALPC supports the following three

methods of exchanging payloads sent with a message:

- ■ A message can be sent to another process through the standard double-buffering mecha-
nism, in which the kernel maintains a copy of the message (copying it from the source process),
switches to the target process, and copies the data from the kernel's buffer. For compatibility, if
legacy LPC is being used, only messages of up to 256 bytes can be sent this way, whereas ALPC
can allocate an extension buffer for messages up to 64 KB.
■ A message can be stored in an ALPC section object from which the client and server processes
map views. (See Chapter 5 in Part 1 for more information on section mappings.)
An important side effect of the ability to send asynchronous messages is that a message can be canceled—for example, when a request takes too long or if the user has indicated that they want to cancel the operation it implements. ALPC supports this with the NetAlpcCancelMessage system call.

---

An ALPC message can be on one of five different queues implemented by the ALPC port object:

- ■ Main queue A message has been sent, and the client is processing it.
■ Pending queue A message has been sent and the caller is waiting for a reply, but the reply
has not yet been sent.
■ Large message queue A message has been sent, but the caller's buffer was too small to
receive it. The caller gets another chance to allocate a larger buffer and request the message
payload again.
■ Canceled queue A message that was sent to the port but has since been canceled.
■ Direct queue A message that was sent with a direct event attached.
Note that a sixth queue, called the wait queue, does not link messages together; instead, it links all the threads waiting on a message.

## EXPERIMENT: Viewing subsystem ALPC port objects

You can see named ALPC port objects with the WinObj tool from Sysinternals or WinObjEx64 from GitHub. Run one of the two tools elevated as Administrator and select the root directory. A gear icon identifies the port objects in WinObj, and a power plug in WinObjEx64, as shown here (you can also click on the Type field to easily sort all the objects by their type):

![Figure](figures/Winternals7thPt2_page_244_figure_005.png)

CHAPTER 8    System mechanisms      213


---

You should see the ALPC ports used by the power manager, the security manager, and other internal Windows services. If you want to see the ALPC port objects used by RPC, you can select the \RPC Control directory. One of the primary users of ALPC, outside of Local RPC, is the Windows subsystem, which uses ALPC to communicate with the Windows subsystem DLLs that are present in all Windows processes. Because CSRSS loads once for each session, you will find its ALPC port objects under the appropriate \Sessions\X\Windows directory, as shown here:

![Figure](figures/Winternals7thPt2_page_245_figure_001.png)

## Asynchronous operation

The synchronous model of ALPC is tied to the original LPC architecture in the early NT design and is similar to other blocking IPC mechanisms, such as Mach ports. Although it is simple to design, a blocking IPC algorithm includes many possibilities for deadlock, and working around those scenarios creates complex code that requires support for a more flexible asynchronous (nonblocking) model. As such, ALPC was primarily designed to support asynchronous operation as well, which is a requirement for scalable RPC and other uses, such as support for pending I/O in user-mode drivers. A basic feature of ALPC, which wasn't originally present in LPC, is that blocking calls can have a timeout parameter. This allows legacy applications to avoid certain deadlock scenarios.

However, ALPC is optimized for asynchronous messages and provides three different models for

asynchronous notifications. The first doesn't actually notify the client or server but simply copies the

data payload. Under this model, it's up to the implementor to choose a reliable synchronization meth od. For example, the client and the server can share a notification event object, or the client can poll for

data arrival. The data structure used by this model is the ALPC completion list (not to be confused with

---

the Windows I/O completion port). The ALPC completion list is an efficient, nonblocking data struc ture that enables atomic passing of data between clients, and its internals are described further in the

upcoming “Performance” section.

The next notification model is a waiting model that uses the Windows completion-port mechanism (on top of the ALPC completion list). This enables a thread to retrieve multiple payloads at once, control the maximum number of concurrent requests, and take advantage of native completion-port functionality. The user-mode thread pool implementation provides internal APIs that processes use to manage ALPC messages within the same infrastructure as worker threads, which are implemented using this model. The RPC system in Windows, when using Local RPC (over ncalrpc), also makes use of this functionality to provide efficient message delivery by taking advantage of this kernel support, as does the kernel mode RPC runtime in Msrpc.sys.

Finally, because drivers can run in arbitrary context and typically do not like creating dedicated system threads for their operation, ALPC also provides a mechanism for a more basic, kernel-based notification using executive callback objects. A driver can register its own callback and context with NtSetInformationAlpcPort, after which it will get called whenever a message is received. The Power Dependency Coordinator (Pdc sys) in the kernel employs this mechanism for communicating with its clients, for example. It's worth noting that using an executive callback object has potential advantages—but also security risks—in terms of performance. Because the callbacks are executed in a blocking fashion (once signaled), and inline with the signaling code, they will always run in the context of an ALPC message sender (that is, inline with a user-mode thread calling NtaIpcSendWaitReceivePort). This means that the kernel component can have the chance to examine the state of its client without the cost of a context switch and can potentially consume the payload in the context of the sender.

The reason these are not absolute guarantees, however (and this becomes a risk if the implementor is unaware), is that multiple clients can send a message to the port at the same time and existing messages can be sent by a client before the server registers its executive callback object. It's also possible for another client to send yet another message while the server is still processing the first message from a different client. In all these cases, the server will run in the context of one of the clients that sent a message but may be analyzing a message sent by a different client. The server should distinguish this situation (since the Client ID of the sender is encoded in the PORT_HEADER of the message) and attach/ analyze the state of the correct server (which now has a potential context switch cost).

## Views, regions, and sections

Instead of sending message buffers between their two respective processes, a server and client can choose a more efficient data-passing mechanism that is at the core of the memory manager in Windows: the section object. (More information is available in Chapter 5 in Part 1.) This allows a piece of memory to be allocated as shared and for both client and server to have a consistent, and equal, view of this memory. In this scenario, as much data as can fit can be transferred, and data is merely copied into one address range and immediately available in the other. Unfortunately, shared-memory communication, such as LPC traditionally provided, has its share of drawbacks, especially when considering security ramifications. For one, because both client and server must have access to the shared memory, an unprivileged client can use this to corrupt the server's shared memory and even build executable

CHAPTER 8    System mechanisms      215


---

payloads for potential exploits. Additionally, because the client knows the location of the server's data, it can use this information to bypass ASLRI protections. (See Chapter 5 in Part 1 for more information.)

ALPC provides its own security on top of what's provided by section objects. With ALPC, a specific ALPC section object must be created with the appropriate NTAlpcCreatePortSection API, which creates the correct references to the port, as well as allows for automatic section garbage collection. (A manual API also exists for deletion.) As the owner of the ALPC section object begins using the section, the allocated chunks are created as ALPC regions, which represent a range of used addresses within the section and add an extra reference to the message. Finally, within a range of shared memory, the clients obtain views to this memory, which represents the local mapping within their address space.

Regions also support a couple of security options. First, regions can be mapped either using

a secure mode or an unsecure mode. In the secure mode, only two views (mappings) are allowed

to the region. This is typically used when a server wants to share data privately with a single cli ent process. Additionally, only one region for a given range of shared memory can be opened from

within the context of a given port. Finally, regions can also be marked with write-access protec tion, which enables only one process context (the server) to have write access to the view (by using

MmSecureVirtualMemoryAgainstWrites). Other clients, meanwhile, will have read-only access only.

These settings mitigate many privilege-escalation attacks that could happen due to attacks on shared

memory, and they make ALPC more resilient than typical IPC mechanisms.

## Attributes

ALPC provides more than simple message passing; it also enables specific contextual information to be added to each message and have the kernel track the validity, lifetime, and implementation of that information. Users of ALPC can assign their own custom context information as well. Whether it's system-managed or user-managed, ALPC calls this data attributes. There are seven attributes that the kernel manages:

- ■ The security attribute, which holds key information to allow impersonation of clients, as well as
advanced ALPC security functionality (which is described later).
■ The data view attribute, responsible for managing the different views associated with the
regions of an ALPC section. It is also used to set flags such as the auto-release flag, and when
replying, to unmap a view manually.
■ The context attribute, which allows user-managed context pointers to be placed on a port, as
well as on a specific message sent across the port. In addition, a sequence number, message ID,
and callback ID are stored here and managed by the kernel, which allows uniqueness, message-
based hashing, and sequencing to be implemented by users of ALPC.
■ The handle attribute, which contains information about which handles to associate with the
message (which is described in more detail later in the "Handle passing" section).
■ The token attribute, which can be used to get the Token ID, Authentication ID, and Modified ID
of the message sender, without using a full-blown security attribute (but which does not, on its
own, allow impersonation to occur).

CHAPTER 8 System mechanisms


---

- The direct attribute, which is used when sending direct messages that have a synchronization

object associated with them (described later in the "Direct event" section).

The work-on-behalf-of attribute, which is used to encode a work ticket used for better power

management and resource management decisions (see the "Power management" section later).
Some of these attributes are initially passed in by the server or client when the message is sent and

converted into the kernel's own internal ALPC representation. If the ALPC user requests this data back,

it is exposed back securely. In a few cases, a server or client can always request an attribute, because it

is ALPC that internally associates it with a message and always makes it available (such as the context

or token attributes). By implementing this kind of model and combining it with its own internal handle

table, described next, ALPC can keep critical data opaque between clients and servers while still main taining the true pointers in kernel mode.

To define attributes correctly, a variety of APIs are available for internal ALPC consumers, such as

AlpInitializeMessageAttribute and AlpGetMessageAttribute.

## Blobs, handles, and resources

Although the ALPC subsystem exposes only one Object Manager object type (the port), it internally must manage a number of data structures that allow it to perform the tasks required by its mechanisms. For example, ALPC needs to allocate and track the messages associated with each port, as well as the message attributes, which it must track for the duration of their lifetime. Instead of using the Object Manager's routines for data management, ALPC implements its own lightweight objects called blobs. Just like objects, blobs can automatically be allocated and garbage collected, reference tracked, and locked through synchronization. Additionally, blobs can have custom allocation and deallocation callbacks, which let their owners control extra information that might need to be tracked for each blob. Finally, ALPC also uses the executive's handle table implementation (used for objects and PIDs/TIDs) to have an ALPC-specific handle table, which allows ALPC to generate private handles for blobs, instead of using pointers.

In the ALPC model, messages are blobs, for example, and their constructor generates a message ID, which is itself a handle into ALPC's handle table. Other ALPC blobs include the following:

- ■ The connection blob, which stores the client and server communication ports, as well as the
server connection port and ALPC handle table.
■ The security blob, which stores the security data necessary to allow impersonation of a client.
It stores the security attribute.
■ The section, region, and view blobs, which describe ALPC's shared-memory model. The view
blob is ultimately responsible for storing the data view attribute.
■ The reserve blob, which implements support for ALPC Reserve Objects. (See the "Reserve
objects" section earlier in this chapter.)
■ The handle data blob, which contains the information that enables ALPC's handle attribute support.
---

Because blobs are allocated from pageable memory, they must carefully be tracked to ensure their

deletion at the appropriate time. For certain kinds of blobs, this is easy: for example, when an ALPC

message is freed, the blob used to contain it is also deleted. However, certain blobs can represent

numerous attributes attached to a single ALPC message, and the kernel must manage their lifetime

appropriately. For example, because a message can have multiple views associated with it (when many

clients have access to the same shared memory), the views must be tracked with the messages that

reference them. ALPC implements this functionality by using a concept of resources. Each message

is associated with a resource list, and whenever a blob associated with a message (that isn't a simple

pointer) is allocated, it is also added as a resource of the message. In turn, the ALPC library provides

functionality for looking up, flushing, and deleting associated resources. Security blobs, reserve blobs,

and view blobs are all stored as resources.

## Handle passing

A key feature of Unix Domain Sockets and Mach ports, which are the most complex and most used IPC mechanisms on Linux and macOS, respectively, is the ability to send a message that encodes a file descriptor which will then be duplicated in the receiving process, granting it access to a UNIX-style file (such as a pipe, socket, or actual file system location). With ALPC, Windows can now also benefit from this model, with the handle attribute exposed by ALPC. This attribute allows a sender to encode an object type, some information about how to duplicate the handle, and the handle index in the table of the sender. If the handle index matches the type of object the sender is claiming to send, a duplicated handle is created, for the moment, in the system (kernel) handle table. This first part guarantees that the sender truly is sending what it is claiming, and that at this point, any operation the sender might undertake does not invalidate the handle or the object beneath it.

Next, the receiver requests exposing the handle attribute, specifying the type of object they expect.

If there is a match, the kernel handle is duplicated once more, this time as a user-mode handle in the

table of the receiver (and the kernel copy is now closed). The handle passing has been completed, and

the receiver is guaranteed to have a handle to the exact same object the sender was referencing and of

the type the receiver expects. Furthermore, because the duplication is done by the kernel, it means a

privileged server can send a message to an unprivileged client without requiring the latter to have any

type of access to the sending process.

This handle-passing mechanism, when first implemented, was primarily used by the Windows subsystem (CSSRS), which needs to be made aware of any child processes created by existing Windows processes, so that they can successfully connect to CSSRS when it is their turn to execute, with CSSRS already knowing about their creation from the parent. It had several issues, however, such as the inability to send more than a single handle (and certainly not more than one type of object). It also forced receivers to always receive any handle associated with a message on the port without knowing ahead of time if the message should have a handle associated with it to begin with.

To rectify these issues, Windows 8 and later now implement the indirect handle passing mechanism, which allows sending multiple handles of different types and allows receivers to manually retrieve handles on a per-message basis. If a port accepts and enables such indirect handles (non-RPC-based ALPC servers typically do not use indirect handles), handles will no longer be automatically duplicated based

---

on the handle attribute passed in when receiving a new message with NtAlpcSendWaitReceivePortinstead, ALPC clients and servers will have to manually query how many handles a given message contains, allocate sufficient data structures to receive the handle values and their types, and then request the duplication of all the handles, parsing the ones that match the expected types (while closing/dropping unexpected ones) by using NtAlpcQueryInformationMessage and passing in the received message.

This new behavior also introduces a security benefit—instead of handling being automatically duplicated as soon as the caller specifies a handle attribute with a matching type, they are only duplicated when requested on a per-message basis. Because a server might expect a handle for message A, but not necessarily for all other messages, nonindirect handles can be problematic if the server doesn’t think of closing any possible handle even while parsing message B or C. With indirect handles, the server would never call NTAlpcQueryInformationMessage for such messages, and the handles would never be duplicated (or necessitate closing them).

Due to these improvements, the ALPC handle-passing mechanism is now exposed beyond just the limited use-cases described and is integrated with the RPC runtime and IDL compiler. It is now possible to use the system_handle(sh_type) syntax to indicate more than 20 different handle types that the RPC runtime can marshal from a client to a server (or vice-versa). Furthermore, although ALPC provides the type checking from the kernel's perspective, as described earlier, the RPC runtime itself also does additional type checking—for example, while both named pipes, sockets, and actual files are all "File Objects" (and thus handles of type "File"), the RPC runtime can do marshalling and unmarshalling checks to specifically detect whether a Socket handle is being passed when the IDL file indicates system_handle(sh_pipe), for example (this is done by calling APIs such as GetFileAttribute, GetDeviceType, and so on).

This new capability is heavily leveraged by the AppContainer infrastructure and is the key way

through which the WinRT API transfers handles that are opened by the various brokers (after do ing capability checks) and duplicated back into the sandboxed application for direct use. Other

RPC services that leverage this functionality include the DNS Client, which uses it to populate the

ai_resolutionhandle field in the GetAdminGex API.

## Security

ALPC implements several security mechanisms, full security boundaries, and mitigations to prevent attacks in case of generic IPC parsing bugs. At a base level, ALPC port objects are managed by the same Object Manager interfaces that manage object security, preventing nonprivileged applications from obtaining handles to server ports with ACL. On top of that, ALPC provides a SID-based trust model, inherited from the original LPC design. This model enables clients to validate the server they are connecting to by relying on more than just the port name. With a secured port, the client process submits to the kernel the SID of the server process it expects on the side of the endpoint. At connection time, the kernel validates that the client is indeed connecting to the expected server, mitigating namespace squatting attacks where an untrusted server creates a port to spoof a server.

ALPC also allows both clients and servers to atomically and uniquely identify the thread and process

responsible for each message. It also supports the full Windows impersonation model through the

CHAPTER 8    System mechanisms      219


---

NtAlpc1pimpersonateClientThread API. Other APIs give an ALPC server the ability to query the SIDs asso ciated with all connected clients and to query the LUID (locally unique identifier) of the client's security

token (which is further described in Chapter 7 of Part 1).

### ALPC port ownership

The concept of port ownership is important to ALPC because it provides a variety of security guarantees to interested clients and servers. First and foremost, only the owner of an ALPC connection port can accept connections on the port. This ensures that if a port handle were to be somehow duplicated or inherited into another process, it would not be able to legitimately accept incoming connections. Additionally, when handle attributes are used (direct or indirect), they are always duplicated in the context of the port owner process, regardless of who may be currently parsing the message.

These checks are highly relevant when a kernel component might be communicating with a client

using ALPC—the kernel component may currently be attached to a completely different process (or

even be operating as part of the System process with a system thread consuming the ALPC port mes sages), and knowledge of the port owner means ALPC does not incorrectly rely on the current process.

Conversely, however, it may be beneficial for a kernel component to arbitrarily accept incoming connections on a port regardless of the current process. One poignant example of this issue is when an executive callback object is used for message delivery. In this scenario, because the callback is synchronously called in the context of one or more sender processes, whereas the kernel connection port was likely created while executing in the System context (such as in WebDriver), there would be a mismatch between the current process and the port owner process during the acceptance of the connection. ALPC provides a special port attribute flag—which only kernel callers can use—that marks a connection port as a system port; in such a case, the port owner checks are ignored.

Another important use case of port ownership is when performing server SID validation checks if

a client has requested it, as was described in the “Security” section. This validation is always done by

checking against the token of the owner of the connection port, regardless of who may be listening for

messages on the port at this time.

## Performance

ALPC uses several strategies to enhance performance, primarily through its support of completion lists, which were briefly described earlier. At the kernel level, a completion list is essentially a user Memory Descriptor List (MDL) that's been probed and locked and then mapped to an address. (For more information on MDLS, see Chapter 5 in Part 1.) Because it's associated with an MDL (which tracks physical pages), when a client sends a message to a server, the payload copy can happen directly at the physical level instead of requiring the kernel to double-buffer the message, as is common in other IPC mechanisms.

The completion list itself is implemented as a 64-bit queue of completed entries, and both user mode and kernel-mode consumers can use an interlocked compare-exchange operation to insert and

remove entries from the queue. Furthermore, to simplify allocations, once an MDL has been initialized,

a bitmap is used to identify available areas of memory that can be used to hold new messages that are

still being queued. The bitmap algorithm also uses native lock instructions on the processor to provide

---

atomic allocation and deallocation of areas of physical memory that can be used by completion lists.


Completion lists can be set up with NTAllocInformationPort.

A final optimization worth mentioning is that instead of copying data as soon as it is sent, the kernel sets up the payload for a delayed copy, capturing only the needed information, but without any copying. The message data is copied only when the receiver requests the message. Obviously, if shared memory is being used, there's no advantage to this method, but in asynchronous, kernel-buffer message passing, this can be used to optimize cancellations and high-traffic scenarios.

## Power management

As we've seen previously, when used in constrained power environments, such as mobile platforms,

Windows uses a number of techniques to better manage power consumption and processor availabil ity, such as by doing heterogenous processing on architectures that support it (such as ARM64's big,

LITTLE) and by implementing Connected Standby as a way to further reduce power on user systems

when under light use.

To play nice with these mechanisms, ALPC implements two additional features: the ability for ALPC clients to push wake references onto their ALPC server's wake channel and the introduction of the Work On Behalf Of Attribute. The latter is an attribute that a sender can choose to associate with a message when it wants to associate the request with the current work ticket that it is associated with, or to create a new work ticket that describes the sending thread.

Such work tickets are used, for example, when the sender is currently part of a Job Object (either due to being in a Silo/Windows Container or by being part of a heterogenous scheduling system and/ or Connected Standby system) and their association with a thread will cause various parts of the system to attribute CPU cycles, I/O request packets, disk/network bandwidth attribution, and energy estimation to be associated to the "behalf" of thread and not the acting thread.

Additionally, foreground priority donation and other scheduling steps are taken to avoid big.LITTLE priority inversion issues, where an RPC thread is stuck on the small core simply by virtue of being a background service. With a work ticket, the thread is forcibly scheduled on the big core and receives a foreground boost as a donation.

Finally, wake references are used to avoid deadlock situations when the system enters a connected

standby (also called Modern Standby) state, as was described in Chapter 6 of Part 1, or when a UWP

application is targeted for suspension. These references allow the lifetime of the process owning the

ALPC port to be pinned, preventing the force suspend/deep freeze operations that the Process Lifetime

Manager (PLM) would attempt (or the Power Manager, even for Win32 applications). Once the mes sage has been delivered and processed, the wake reference can be dropped, allowing the process to

be suspended if needed. (Recall that termination is not a problem because sending a message to a

terminated process/closed port immediately wakes up the sender with a special PORT_CLOSED reply,

instead of blocking on a response that will never come.)

---

## ALPC direct event attribute

Recall that ALPC provides two mechanisms for clients and servers to communicate: requests, which are bidirectional, requiring a response, and datagrams, which are unidirectional and can never be synchronously replied to. A middle ground would be beneficial—a datagram-type message that cannot be replied to but whose receipt could be acknowledged in such a way that the sending party would know that the message was acted upon, without the complexity of having to implement response processing. In fact, this is what the direct event attribute provides.

By allowing a sender to associate a handle to a kernel event object (through CreateEvent) with the


ALPC message, the direct event attribute captures the underlying KEVENT and adds a reference to it,

tacking it onto the KALPC_MESSAGE structure. Then, when the receiving process gets the message,

it can expose this direct event attribute and cause it to be signaled. A client could either have a Wait

Completion Packet associated with an I/O completion port, or it could be in a synchronous wait call

such as with WaitForSingleObject on the event handle and would now receive a notification and/or wait

satisfaction, informing it of the message's successful delivery.

This functionality was previously manually provided by the RPC runtime, which allows clients calling RpcAsyncInitializeHandle to pass in RpcNotificationT ypeEvent and associate a HANDLE to an event

object with an asynchronous RPC message. Instead of forcing the RPC runtime on the other side to

respond to a request message, such that the RPC runtime on the sender's side would then signal the

event locally to signal completion, ALPC now captures it into a Direct Event attribute, and the message

is placed on a Direct Message Queue instead of the regular Message Queue. The ALPC subsystem will

signal the message upon delivery, efficiently in kernel mode, avoiding an extra hop and context-switch.

## Debugging and tracing

On checked builds of the kernel, ALPC messages can be logged. All ALPC attributes, blobs, message zones, and dispatch transactions can be individually logged, and undocumented Jalpc in WinDbg can dump the logs. On retail systems, IT administrators and troubleshooters can enable the ALPC events of the NT kernel logger to monitor ALPC messages. (Event Tracing for Windows, also known as ETW, is discussed in Chapter 10.) ETW events do not include payload data, but they do contain connection, disconnection, and send/receive and wait/unblock information. Finally, even on retail systems, certain Jalpc commands obtain information on ALPC ports and messages.

---

EXPERIMENT: Dumping a connection port

In this experiment, you use the CSRSS API port for Windows processes running in Session 1, which is the typical interactive session for the console user. Whenever a Windows application launches, it connects to CSRSS's API port in the appropriate session.

1. Start by obtaining a pointer to the connection port with the !object command:

```bash
!kds: !Object\Sessions\1\Windows\ApiPort
Object: ffff80f8172b2df0 Type: (ffff89f8f03f9da0) ALPC Port
    ObjectHeader: ffff80f8172b2dcd (new version)
    HandleCount: 1   PointerCount: 7898
    Directory Object: fffffc704bd10c0e Name: ApiPort
```

2. Dump information on the port object itself with !alpc /p. This will confirm, for example, that CSRSS is the owner.

```bash
!kds :!alpc /P ffff898f172b2df0
Port ffff898f172b2df0
Type                : ALPC_CONNECTION_PORT
CommunicationInfo        : ffff7c04adfd5d10
ConnectionPort         : ffff898f172b2df0 (ApiPort), Connections
ClientCommunicationPort : 0000000000000000
ServerCommunicationPort : 0000000000000000
OwnerProcess          : ffff898f17481140 (cssr.exe), Connections
SequenceNo             : 0x0023BE45 (2342469)
CompletionPort       : 0000000000000000
CompletionList        : 0000000000000000
ConnectionPending      : No
ConnectionRefused       : No
Disconnected           : No
Closed             : No
FlushOnClose          : Yes
ReturnExtendedInfo      : No
Waitable            : No
Security             : Static
Wow64CompletionList : No
5 thread(s) are waiting on the port:
    THREAD ffff898f3353b080  Cid 0288.2538  Tue: 00000090bce88000
    Win32Thread: ffff898f40cde60 WAIT
    THREAD ffff898f31aa080  Cid 0288.19ac  Tue: 0000009bcfe000
    Win32Thread: ffff898f3558a40 WAIT
    THREAD ffff898f91c3080  Cid 0288.060c  Tue: 00000090bcff1000
    Win32Thread: ffff898f17c5f70  WAIT
    THREAD ffff898f91f74130c  Cid 0288.0298  Tue: 00000090bcfd7000
    Win32Thread: ffff898f1736ef0 WAIT
    THREAD ffff898f91fe5e208  Cid 0288.0590  Tue: 00000090bcfe900
    Win32Thread: ffff898f173f82a0 WAIT
    THREAD ffff898f3353b080  Cid 0288.2538  Tue: 00000090bce88000
    Win32Thread: ffff898f340cde60 WAIT
```

---

```bash
Main queue is empty.
Direct message queue is empty.
Large message queue is empty.
Pending queue is empty.
Canceled queue is empty.
```

3. You can see what clients are connected to the port, which includes all Windows processes running in the session, with the undocumented !alpfc /lpc command, or, with a newer version of WinDbg, you can simply click the Connections link next to the ApiPort name. You will also see the server and client communication ports associated with each connection and any pending messages on any of the queues.

```bash
1kcd !alpc /lpc ff8f98f032cbdf0
ffffffff8f02bd6bf(AllPort) 0. l31 connections
ffffffff8f071a00 0 --ffffffff8f06ba0d0 0 ffff89f17470080("winit.exe")
ffffffff8f171fdd0 0 --ffffffff8f577a0ab 0 ffff89f17ec240c"services.exe"
ffffffff8f171fda0 0 --ffffffff8f57112ed0 0 ffff89f17da200c("iss.exe")
ffffffff8f02772b 0 --ffffffff8f06272cd 0 ffff89f1753b400c"svchost.exe"
ffffffff8f06a702d0 0 --ffffffff8f04d5980 0 ffff89f1753e30c"svchost.exe"
ffffffff8f031a3dc 0 --ffffffff8f04a70070 0 ffff89f1754020c"fontdrvhost.ex"
ffffffff8f056d6cd 0 --ffffffff8f17520de0 0 ffff89f17588440c"svchost.exe"
ffffffff8f97157ab0 0 --ffffffff8f1757b980 0 ffff89f17ca100c"svchost.exe"
```

4. Note that if you have other sessions, you can repeat this experiment on those sessions

also (as well as with session 0, the system session). You will eventually get a list of all the

Windows processes on your machine.

