![Figure](figures/Winternals7thPt1_page_001_figure_000.png)

Windows Internals

7 SEventh EDITION

Part 1 System architecture, processes, threads, memory management, and more

Professional

![Figure](figures/Winternals7thPt1_page_001_figure_005.png)

![Figure](figures/Winternals7thPt1_page_001_figure_006.png)

Pavel Yosifovich

Alex Ionescu

Mark E. Russinovich David A. Solomon

---

![Figure](figures/Winternals7thPt1_page_002_figure_000.png)

Windows Internals Seventh Edition

Part 1

System architecture, processes, threads, memory management, and more

Pavel Yosifovich, Alex Ionescu, Mark E. Russinovich, and David A. Solomon

---

To my family—my wife Idr and our children Danielle, Amit, and Yoav— thank you for your patience and encouragement during this demanding work.

Pavel Yosifovich

To my parents, who guided and inspired me to follow my dreams, and to my family, who stood by me all those countless nights.

Alex Ionescu

To our parents, who guided and inspired us to follow our dreams.

Mark E. Russinovich and David A. Solomon

PUBLISHED BY

Microsoft Press A division of Microsoft Corporation One Microsoft Way Redmond, Washington 98052-6399

Copyright © 2017 by Pavel Yosifovich, Alex Ionescu, Mark E. Russinovich and David A. Solomon

All rights reserved. No part of the contents of this book may be reproduced or transmitted in any form or by any means without the written permission of the publisher.

Library of Congress Control Number: 2014951935

ISBN: 978-0-7356-8418-8

Printed and bound in the United States of America.

First Printing

Microsoft Press books are available through booksellers and distributors worldwide. If you need support related to this book, email Microsoft Press Support at mspinput@microsoft.com. Please tell us what you think of this book at https://aka.ms/tellpress.

This book is provided "as-is" and expresses the author's views and opinions. The views, opinions and information expressed in this book, including URL and other Internet website references, may change without notice.

Some examples depicted herein are provided for illustration only and are fictitious. No real association or connection is intended or should be inferred.

Microsoft and the trademarks listed at https://www.microsoft.com on the "Trademarks" webpage are trademarks of the Microsoft group of companies. All other marks are property of their respective owners.

Acquisitions Editor: Devon Musgrave

Editorial Production: Polymath Publishing

Technical Reviewer: Christophe Nasarre

Layout Services: Shawn Morningstar

Indexing Services: Kelly Talbot Editing Services

Proofreading Services: Corina Lebegioara

Cover: Twist Creative • Seattle

---

## Contents

Introduction......xi

Chapter 1 Concepts and tools......1 Windows operating system versions......1 Windows 10 and future Windows versions......3 Windows 10 and OneCore......3 Foundation concepts and terms......4 Windows API......4 Services, functions, and routines......7 Processes......8 Threads......18 Jobs......20 Virtual memory......21 Kernel mode vs. user mode......23 Hypervisor......27 Firmware......29 Terminal Services and multiple sessions......29 Objects and handles......30 Security......31 Registry......32 Unicode......33 Digging into Windows internals......35 Performance Monitor and Resource Monitor......36 Kernel debugging......38 Windows Software Development Kit......43 Windows Driver Kit......43 Sysinternals tools......44 Conclusion......44

Chapter 2 System architecture......45 Requirements and design goals......45 Operating system model......46 Architecture overview......47 Portability......50 Symmetric multiprocessing......51 Scalability......53 Differences between client and server versions......54 Checked build......57 Virtualization-based security architecture overview......59

---

Key system components......61 Environment subsystems and subsystem DLLs......62 Other subsystems......68 Executive......72 Kernel......75 Hardware abstraction layer......79 Device drivers......82 System processes......88 Conclusion......99

Chapter 3 Processes and jobs 101 Creating a process......101 CreateProcess' functions arguments......102 Creating Windows modern processes......103 Creating other kinds of processes......104 Process internals......105 Protected processes......113 Protected Process Light (PPL)......115 Third-party PPL support......119 Minimal and Pico processes......120 Minimal processes......120 Pico processes......121 Trustlets (secure processes)......123 Trustlet structure......123 Trustlet policy metadata......124 Trustlet attributes......125 System built-in Trustlets......125 Trustlet identity......126 Isolated user-mode services......127 Trustlet-accessible system calls......128 Flow of CreateProcess......129 Stage 1: Converting and validating parameters and flags......131 Stage 2: Opening the image to be executed......135 Stage 3: Creating the Windows executive process object......138 Stage 4: Creating the initial thread and its stack and context......144 Stage 5: Performing Windows subsystem-specific initialization......146 Stage 6: Starting execution of the initial thread......148 Stage 7: Performing process initialization in the context of the new process......148 Terminating a process......154 Image loader......155 Early process initialization......157 DLL name resolution and redirection......160 Loaded module database......164 Import parsing......168 Post-import process initialization......170

iv Contents

---

SwitchBack API Sets 171

Jobs 176

Job limits 177

Working with a job. 178

Nested jobs 179

Windows containers (server silos) 183

Conclusion 191

Chapter 4 Threads 193

Creating threads 193

Thread internals 194

Data structures 194

Birth of a thread 206

Examining thread activity 207

Limitations on protected process threads 212

Thread scheduling 214

Overview of Windows scheduling 214

Priority levels 215

Thread states 223

Dispatcher database 228

Quantum 231

Priority boots 238

Context switching 255

Scheduling scenarios 256

Idle threads 260

Thread suspension 264

(Deep) freeze 266

Thread selection 266

Multiprocessor systems 268

Thread selection on multiprocessor systems 283

Processor selection 284

Heterogeneous scheduling (big LITTLE) 286

Group-based scheduling 287

Dynamic fair share scheduling 289

CPU rate limits 292

Dynamic processor addition and replacement 295

Worker factories (thread pools) 297

Worker factory creation 298

Conclusion 300

Chapter 5 Memory management 301

Introduction to the memory manager 301

Memory manager components 302

Large and small pages 303

Contents v


---

Examining memory usage......305 Internal synchronization......308 Services provided by the memory manager......309 Page states and memory allocations......310 Commit charge and commit limit......313 Locking memory......314 Allocation granularity......314 Shared memory and mapped files......315 Protecting memory......317 Data Execution Prevention......319 Copy-on-write......321 Address Windowing Extensions......323 Kernel-mode heaps (system memory pools)......324 Pool sizes......325 Monitoring pool usage......327 Look-aside lists......331 Heap manager......332 Process heaps......333 Heap types......334 The NT heap......334 Heap synchronization......334 The low-fragmentation heap......335 The segment heap......336 Heap security features......341 Heap debugging features......342 Pageheap......343 Fault-tolerant heap......347 Virtual address space layouts......348 x86 address space layouts......349 x86 system address space layout......352 x86 session space......353 System page table entries......355 ARM address space layout......356 64-bit address space layout......357 x64 virtual addressing limitations......359 Dynamic system virtual address space management......359 System virtual address space quotas......364 User address space layout......365 Address translation......371 x86 virtual address translation......371 Translation look-aside buffer......377 x64 virtual address translation......380 ARM virtual address translation......381 Page fault handling......383 Invalid PTEs......384 Prototype PTEs......385

ⅵ     Contents


---

In-paging I/O. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

Contents   vii


---

Initializing an enclave......472 Proactive memory management (SuperFetch)......472 Components......473 Tracing and logging......474 Scenarios......475 Page priority and rebalancing......476 Robust performance......478 ReadyBoost......479 ReadyDrive......480 Process reflection......480 Conclusion......482

Chapter 6 I/O system I/O system components......483 The I/O manager......485 Typical I/O processing......486 Interrupt Request Levels and Deferred Procedure Calls......488 Interrupt Request Levels......488 Deferred Procedure Calls......490 Device drivers......492 Types of device drivers......492 Structure of a driver......498 Driver objects and device objects......500 Opening devices......507 I/O processing......510 Types of I/O......511 I/O request packets......513 I/O request to a single-layered hardware-based driver......525 I/O requests to layered drivers......533 Thread-agnostic I/O......536 I/O cancellation......537 I/O completion ports......541 I/O prioritization......546 Container notifications......552 Driver Verifier......552 I/O-related verification options......554 Memory-related verification options......555 The Plug and Play manager......559 Level of Plug and Play support......560 Device enumeration......561 Device stacks......563 Driver support for Plug and Play......569 Plug-and-play driver installation......571 General driver loading and installation......575 Driver loading......575 Driver installation......577

viii Contents


---

The Windows Driver Foundation......578 Kernel-Mode Driver Framework......579 User-Mode Driver Framework......587 The power manager......590 Connected Standby and Modern Standby......594 Power manager operation......595 Driver power operation......596 Driver and application control of device power......599 Power management framework......600 Power availability requests......602 Conclusion......603

Chapter 7 Security Security ratings......605 Trusted Computer System Evaluation Criteria......605 The Common Criteria......607 Security system components......608 Virtualization-based security......611 Credential Guard......612 Device Guard......617 Protecting objects......619 Access checks......621 Security identifiers......625 Virtual service accounts......646 Security descriptors and access control......650 Dynamic Access Control......666 The AuthZ API......667 Conditional ACEs......667 Account rights and privileges......668 Account rights......669 Privileges......670 Super privileges......675 Access tokens of processes and threads......677 Security auditing......677 Object access auditing......679 Global audit policy......682 Advanced Audit Policy settings......683 AppContainers......684 Overview of UWP apps......685 The AppContainer......687 Logon......710 Winlogon initialization......711 User logon steps......713 Assured authentication......718 Windows Biometric Framework......719 Windows Hello......721

Contents ix


---

User Account Control and virtualization......722 File system and registry virtualization......722 Elevation......729 Exploit mitigations......735 Process-mitigation policies......735 Control Flow Integrity......740 Security assertions......752 Application identification......756 AppLocker......757 Software Restriction Policies......762 Kernel Patch Protection......764 PatchGuard......765 HyperGuard......768 Conclusion......770

Index......771

X      Contents


---

## Introduction

Windows Internals, Seventh Edition is intended for advanced computer professionals (developers, security researchers, and system administrators) who want to understand how the core components of the Microsoft Windows 10 and Windows Server 2016 operating systems work internally. With this knowledge, developers can better comprehend the rationale behind design choices when building applications specific to the Windows platform. Such knowledge can also help developers debug complex problems. System administrators can benefit from this information as well, because understanding how the operating system works "under the hood" facilitates an understanding of the performance behavior of the system and makes troubleshooting system problems much easier when things go wrong. Security researchers can figure out how software applications and the operating system can misbehave and be misused, causing undesirable behavior, while also understanding the mitigations and security features modern Windows offers against such scenarios. After reading this book, you should have a better understanding of how Windows works and why it behaves as it does.

### History of the book

This is the seventh edition of a book that was originally called Inside Windows NT (Microsoft Press, 1992), written by Helen Custer (prior to the initial release of Microsoft Windows NT 3.1). Inside Windows NT was the first book ever published about Windows NT and provided key insights into the architecture and design of the system. Inside Windows NT, Second Edition (Microsoft Press, 1998) was written by David Solomon. It updated the original book to cover Windows NT 4.0 and had a greatly increased level of technical depth.

Inside Windows 2000, Third Edition (Microsoft Press, 2000) was authored by David Solomon and Mark Russinovich. It added many new topics, such as startup and shutdown, service internals, registry internals, file-system drivers, and networking. It also covered kernel changes in Windows 2000, such as the Windows Driver Model (WDM), Plug and Play, power management, Windows Management Instrumentation (WMI), encryption, the job object, and Terminal Services. Windows Internals, Fourth Edition (Microsoft Press, 2004) was the Windows XP and Windows Server 2003 update and added more content focused on helping IT professionals make use of their knowledge of Windows internals, such as using key tools from Windows Sysinternals and analyzing crash dumps.

Windows Internals, Fifth Edition (Microsoft Press, 2009) was the update for Windows Vista and Windows Server 2008. It saw Marc Russinovich move on to a full-time job.

xi

---

Microsoft (where he is now the Azure CTO) and the addition of a new co-author, Alex

Ionescu. New content included the image loader, user-mode debugging facility, Advanced

Local Procedure Call (ALPC), and Hyper-V. The next release, Windows Internals, Sixth

Edition (Microsoft Press, 2012), was fully updated to address the many kernel changes

in Windows 7 and Windows Server 2008 R2, with many new hands-on experiments to

reflect changes in the tools as well.

## Seventh edition changes

Since this book's last update, Windows has gone through several releases, coming up

to Windows 10 and Windows Server 2016. Windows 10 itself, being the current going forward name for Windows, has had several releases since its initial release to manufac turing (RTM). Each is labeled with a four-digit version number indicating the year and

month of release, such as Windows 10, version 1703, which was completed in March 2017.

This implies that Windows has gone through at least six versions since Windows 7 (at the

time of this writing).

Starting with Windows 8, Microsoft began a process of OS convergence, which is beneficial from a development perspective as well as for the Windows engineering team. Windows 8 and Windows Phone 8 had converged kernels, with modern app convergence arriving in Windows 8.1 and Windows Phone 8.1. The convergence story was complete with Windows 10, which runs on desktops/laptops, servers, XBOX One, phones (Windows Mobile 10), HoloLens, and various Internet of Things (IoT) devices.

With this grand unification completed, the time was right for a new edition of the series, which could now finally catch up with almost half a decade of changes in what will now be a more stable kernel architecture going forward. As such, this latest book covers aspects of Windows from Windows 8 to Windows 10, version 1703. Additionally, this edition welcomes Pavel Yosifovich as its new co-author.

## Hands-on experiments

Even without access to the Windows source code, you can glean much about Windows internals from the kernel debugger, tools from Sysinternals, and the tools developed specifically for this book. When a tool can be used to expose or demonstrate some aspect of the internal behavior of Windows, the steps for trying the tool yourself are listed in special “EXPERIMENT” sections. These appear throughout the book, and we encourage you to try them as you’re reading. Seeing visible proof of how Windows works internally will make much more of an impression on you than just reading about it will.

---

## Topics not covered

Windows is a large and complex operating system. This book doesn't cover everything relevant to Windows internals but instead focuses on the base system components. For example, this book doesn't describe COM+, the Windows distributed object-oriented programming infrastructure, or the Microsoft .NET framework, the foundation of managed code applications. Because this is an "internals" book and not a user, programming, or system-administration book, it doesn't describe how to use, program, or configure Windows.

## A warning and a caveat

Because this book describes undocumented behavior of the internal architecture and the

operation of the Windows operating system (such as internal kernel structures and func tions), this content is subject to change between releases.

By 'subject to change,' we don't necessarily mean that details described in this book will change between releases, but you can't count on them not changing. Any software that uses these undocumented interfaces, or insider knowledge about the operating system, might not work on future releases of Windows. Even worse, software that runs in kernel mode (such as device drivers) and uses these undocumented interfaces might experience a system crash when running on a newer release of Windows, resulting in potential loss of data to users of such software.

In short, you should never use any internal Windows functionality, registry key, behavior, API, or other undocumented detail mentioned in this book during the development of any kind of software designed for end-user systems, or for any other purpose other than research and documentation. Always check with the Microsoft Software Development Network (MSDN) for official documentation on a particular topic first.

## Assumptions about you

The book assumes the reader is comfortable with working on Windows at a power-user

level, and has a basic understanding of operating system and hardware concepts, such

as CPU registers, memory, processes, and threads. Basic understanding of functions,

pointers, and similar C programming language constructs is beneficial in some sections.

---

## Organization of this book

The book is divided into two parts (as was the sixth edition), the first of which you're holding in your hands.

- ● Chapter 1, "Concepts and tools," provides a general introduction to Windows
internals concepts and introduces the main tools used throughout the book. It's
critical to read this chapter first, as it provides the necessary background needed
for the rest of the book.
● Chapter 2, "System architecture," shows the architecture and main components
that comprise Windows and discusses them in some depth. Several of these con-
cepts are dealt with in greater detail in subsequent chapters.
● Chapter 3, "Processes and jobs," details how processes are implemented in
Windows and the various ways of manipulating them. Jobs are also discussed
as a means for controlling a set of processes and enabling Windows Container
support.
● Chapter 4, "Threads," details how threads are managed, scheduled, and other-
wise manipulated in Windows.
● Chapter 5, "Memory management," shows how the memory manager uses physi-
cal and virtual memory, and the various ways that memory can be manipulated
and used by processes and drivers alike.
● Chapter 6, "I/O system," shows how the I/O system in Windows works and
integrates with device drivers to provide the mechanisms for working with I/O
peripherals.
● Chapter 7, "Security," details the various security mechanisms built into Windows,
including mitigations that are now part of the system to combat exploits.
## Conventions

The following conventions are used in this book:

- ■ Boldface type is used to indicate text that you type as well as interface items that
you are instructed to click or buttons that you are instructed to press.

■ Italic type is used to indicate new terms.

■ Code elements appear in a monospaced font.
---

- ■ The first letters of the names of dialog boxes and dialog box elements are
capitalized—for example, the Save As dialog box.
■ Keyboard shortcuts are indicated by a plus sign (+) separating the key names.
For example, Ctrl+Alt+Delete mean that you press Ctrl, Alt, and Delete keys at
the same time.
## About the companion content

We have included companion content to enrich your learning experience. The companion

content for this book can be downloaded from the following page:

https://aka.ms/winint7ed/downloads

We have also placed the source code for the tools written specifically for this book at https://github.com/zodiacoin/windowsinternals.

## Acknowledgments

First, thanks to Pavel Yosifovich for joining us on this project. His involvement with the

book was crucial to its release, and his many nights spent studying Windows details and

writing about six releases' worth of changes is the reason this book exists.

This book wouldn't contain the depth of technical detail or the level of accuracy it has without the review, input, and support of key members of the Microsoft Windows development team and other experts at Microsoft. Therefore, we want to thank the following people, who provided technical review and/or input to the book, or were simply a source of support and help to the authors: Akila Srinivasan, Alessandro Piotli, Andrea Allievi, Andy Luhrs, Arun Kishan, Ben Hillis, Bill Messmer, Chris Kleynhans, Deepu Thomas, Eugene Bak, Jason Shirk, Jeremy Cox, Joe Bialek, John Lambert, John Lento, Jon Berry, Kai Hsu, Ken Johnson, Landy Wang, Logan Gabriel, Luke Kim, Matt Miller, Matthew Woolman, Mehmet Iyigun, Michelle Bergeron, Minsang Kim, Mohamed Mansour, Nate Warfield, Neeraj Singh, Nick Judge, Pavel Lebedynskiy, Rich Turner, Saruhan Karademir, Simon Pope, Stephen Finnigan, and Stephan Hufnagel.

We would like to again thank Ilifak Guilhanov of Hex-Rays (http://www.hex-rays.com)

for the IDA Pro Advanced and Hex-Rays licenses they granted to Alex Ionescu more than

a decade ago, so that he could speed up his reverse engineering of the Windows kernel,

and for the continued support and development of decompiler features which make

writing such a book possible without source code access.

---

Finally, the authors would like to thank the great staff at Microsoft Press who have been behind turning this book into a reality. Devon Musgrave served his last tour as our acquisitions editor, while Kate Shoup oversaw the title as its project editor. Shawn Morningstar, Kelly Talbot, and Corina Lebegoira also contributed to the quality of this book.

## Errata and book support

We have made every effort to ensure the accuracy of this book and its companion con tent. Any errors that have been reported since this book was published are listed on our

Microsoft Press site at:

https://aka.ms/winint7ed/errata

If you find an error that is not already listed, you can report it to us through the same

page.

If you need additional support, email Microsoft Press Book Support at mspinput@ microsoft.com.

Please note that product support for Microsoft software is not offered through the addresses above.

## We want to hear from you

At Microsoft Press, your satisfaction is our top priority and your feedback our most valuable asset. Please tell us what you think of this book at:

https://aka.ms/tellpress

The survey is short, and we read every one of your comments and ideas. Thanks in advance for your input!

## Stay in touch

Let's keep the conversation going! We're on Twitter: @MicrosoftPress.

---

