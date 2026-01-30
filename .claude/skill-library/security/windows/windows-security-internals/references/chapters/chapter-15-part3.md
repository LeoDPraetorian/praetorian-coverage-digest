## BUILDING A WINDOWS DOMAIN NETWORK FOR TESTING

![Figure](figures/WindowsSecurityInternals_page_565_figure_001.png)

Several chapters in this book make reference to a Windows domain network you can use for testing purposes. While you don't

need to set up such a network to follow along with the chapters, you can use it to run the examples, then alter the provided commands to observe different outcomes. If you don't already have a suitable Windows domain network on hand to use for testing, this appendix will walk you through setting one up with virtual machines.

Running Windows in a virtual machine has many advantages. First, it gives you complete flexibility to configure (or misconfigure) Windows without compromising the security of your everyday installation. Virtualization platforms typically allow you to snapshot your virtual machines so you can roll them back to a known good state if something goes wrong. You can

---

also isolate network traffic to prevent it from affecting other systems on the same network. Lastly, you can use a virtual machine to run Windows in a non-Windows environment.

The domain configuration steps use PowerShell whenever possible.


Note that, unless otherwise stated, you must run all of these PowerShell


commands as an administrator user.

## The Domain Network

Figure A-1 is a diagram of the network we'll build. For more information about the structure of domain networks in general, consult Chapter 10.

![Figure](figures/WindowsSecurityInternals_page_566_figure_004.png)

Figure A-1: The domain network configuration

The network includes a forest made up of three domains. The root DNS name for the forest is mineral.local, and its two child domains are engineering .mineral.local and sales.mineral.local. To create a minimal functional domain for testing, you need only PRIMARYDC, which is the root domain controller, and GRAPHITE, a workstation joined to the domain. Anything included in dotted lines is optional. The next sections will show you how to set up the domain network and configure virtual machines for each of the Windows systems you want to include.

---

## Installing and Configuring Windows Hyper-V

We'll set up the Windows domain network using Hyper-V, which is virtualization software that comes for free on 64-bit versions of Windows Professional, Enterprise, and Education. If you're not running Windows or don't want to use Hyper-V, another good free option is Oracle's VirtualBox (https://www.virtualbox.org).

To install Hyper-V and its tools, start an administrator PowerShell console and run the following command. Make sure to restart the system after installation:

```bash
PS> Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

The next step is to configure a new network for the virtual machines, as shown in Listing A1 . This allows you to have complete control over all aspects of the network configuration for the domain network and isolates it from your real network.

```bash
PS> New-VMSwitch -Name "Domain Network" -SwitchType Internal
PS> $index = {Get-NetAdapter} |
Where-Object Name -Match "Domain Network".ifIndex
PS> New-NetIPAddress -IPAddress 192.168.99.1 -PrefixLength 24
-InterfaceIndex $index
PS> New-Netath -Name DomNAT -InternalIPInterfaceAddressPrefix 192.168.99.0/24
```

Listing A-1: Creating a new virtual machine network switch

We first create a new switch for the domain network using the New-VM Switch command, which you need to do only once during this initial configuration process. We give the switch the name "Domain Network" and set its type to Internal, which means it's a virtual network that can communicate with the virtual machine host.

Next, we need to assign the virtual network adapter that was created for the switch with an IP address. The Get-NetAdapter command lists all network adapters and finds the unique index number for the adapter for our domain network. We then assign the IP address of 192.168.99.1 to the adapter, with a subnet prefix of 24 bits (perhaps more commonly seen as the subnet mask 255.255.255.0). You're welcome to set the IP address to any value you like, but keep in mind that if you change the address, you'll also need to update it throughout the rest of this appendix.

The final step is to set up network address translation (NAT) for the IP address using the New-NetNat command. This will allow computers on the network to access the internet by setting their default gateway to the adapter’s IP address, in this case 192.168.99.1.

NOTE

This configuration doesn't set up a Dynamic Host Configuration Protocol (DHCP) server to automatically assign IP addresses to computers on the network. As the network is so small, we'll just statically assign IP addresses to the computers as we go.

Building a Windows Domain Network for Testing 537

---

## Creating the Virtual Machines

Table A-1 lists the virtual machines we'll set up, along with the operating system type and IP address for each. I'll walk through setting up the PRIMARYDC , GRAPHITE , and optional SALESDC virtual machines. The other virtual machines in the table are completely optional; if you want to create them, you can replace the specified values in the sections on setting up each virtual machine with the appropriate values from the table.

Table A-1: Virtual Machine Names and IP Addresses

<table><tr><td>Virtual machine name</td><td>Operating system</td><td>IP address</td></tr><tr><td>PRIMARYDC</td><td>Windows Server</td><td>192.168.99.10</td></tr><tr><td>GRAPHITE</td><td>Windows Professional or Enterprise</td><td>192.168.99.50</td></tr><tr><td>CINNABAR</td><td>Windows Server</td><td>192.168.99.20</td></tr><tr><td>SALESDC</td><td>Windows Server</td><td>192.168.99.110</td></tr><tr><td>GOLD</td><td>Windows Professional or Enterprise</td><td>192.168.99.150</td></tr><tr><td>ENGDCC</td><td>Windows Server</td><td>192.168.99.210</td></tr><tr><td>STEEL</td><td>Windows Professional or Enterprise</td><td>192.168.99.220</td></tr></table>


Microsoft provides trial editions of Windows Enterprise and Windows Server as virtual machines. I'd recommend using your favorite search engine to find the latest links on Microsoft's website. For each machine, install the correct Windows version and then use PowerShell to configure it.

To use Windows virtual machines with Hyper-V, you'll need the installation media and license keys for Windows Professional or Enterprise and Windows Server. A common way to get access to these is through a Microsoft Visual Studio subscription. The versions of Windows and Server you use won't matter for the topics we'll discuss.

NOTE

Server installations include a long-term service branch that comes with the Windows desktop and a more up-to-date version, called a server core version, that has only a command line. As we'll configure the server installation with PowerShell, either version will work. However, if you're more comfortable with a GUI, use the long-term service branch with a desktop instead.

Listing A-2 defines the function we'll use to do most of the work of setting up a virtual machine, New-TestVM .

```bash
PS> function New-TestVM {
    param(
        [Parameter(Mandatory)]
        [string]$VmName,
        [Parameter(Mandatory)]
        [string]$InstallerImage,
        [Parameter(Mandatory)]
        [string]$VmDirectory
    )
    }
```

---

```bash
*  #NewVM - Name $VMName -MemoryStartupBytes 2GB -Generation 2
 *  -NewVHDPath "$VMDirectory/$VMName/$VMName.vhdx" -NewVHDSizeBytes 80GB
 *  -Path "$VMDirectory" -SwitchName "Domain Network"
 *  #Set-VM - Name $VMName -ProcessorCount 2 -DynamicMemory
 *  #Add -VMSciController -VMName $VMName
 *  Add -VMDVDDrive -VMName $VMName -ControllerNumber 1 -ControllerLocation 0
 *-Path $InstallerImage
 * $vd = Get-VMDVDDrive -VMName $VMName
   Set-VMFirmware -VMName $VMName -FirstBootDevice $vdv
```

Listing A-2: Defining the New-TestVM function

The New-TestVM function takes the name of the virtual machine so it can create the path to the DVD image to install and the base directory for the virtual machine's assets. We start by calling the New-VM command to create the virtual machine . We set its memory to 4GB and create an 80GB virtual hard disk. (You can increase these sizes if you like.) We also assign the default network adapter to use the "Domain Network" switch we created in Listing A-1.

Next, we use the Set-Nrm command to configure some virtual machine options not exposed through New-VM ❶. We assign two CPUs to the virtual machine, as I find modern versions of Windows struggle with only one CPU. You can increase the number of CPUs if your base machine has many CPU cores.

We also enable dynamic memory. This allows Windows to scale the virtual machines' memory usage as needed. I've found that typically a server installation uses only around 3GB of memory when running, but it could be more, especially for clients. Dynamic memory can both increase and decrease allocated memory as needed.

Finally, we set up a DVD drive on a virtual SCSI controller and assign the DVD image to it ❸. We'll use this as the primary boot drive, so we can install the operating system from the DVD image.

We now need to create each virtual machine using the function we defined and start the installation process.

## The PRIMARYDC Server

The PRIMARYDC machine is a Windows server that will act as the root domain controller for our forest. In Listing A-3, we start by creating the virtual machine as an administrator.

```bash
PS> New-Test-VM -VmName "PRIMARYDC" -InstallerImage "C:\iso\server.iso"
  -VmDirectory "C:\"
PS> vmconnect localhost PRIMARYDC
PS> Start-VM -VmName "PRIMARYDC"
```

Listing A-3. Creating and starting the PRIMARYDC virtual machine

Building a Windows Domain Network for Testing 539

---

We install the PRIMARYDC virtual machine from the DVD image file C:\iso\erverio and create the virtual machine in the C:\cups directory. This should create a new directory under the virtual machine directory for the PRIMARYDC server's files, which allows us to separate our resources for each of our virtual machines. Next, we start the virtual machine's user interface so we can interact with the installation process, and then start the virtual machine.

Now that you can interact with the virtual machine, you can follow the installation steps as for any other Window Server installation. I won't provide detailed instructions for this, as it's mostly a case of selecting your region and the installation drive and following the default process.

When asked for the Administrator user's password during the installation, you can set anything you like, but in this book I've assumed it will be set to Password. As this is a weak password, do not expose these virtual machines to a network where untrusted users can access them. However, for testing and demonstration purposes, having easily memorable passwords is usually a good idea.

Once you've gained access to either a desktop (if using the long-term service branch version of the server) or a command line (if using the server core version), you can finish the basic setup. All subsequent PowerShell commands will be run on the VM itself, not the host. First start an administrator copy of PowerShell to run the commands in Listing A-4.

```bash
PS> $index = (Get-NetAdapter).ifindex
PS> New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.10
-PrefixLength 24 -DefaultGateway 192.168.99.1
PS> Set-DnsClientServerAddress -InterfaceIndex $index -ServerAddresses 8.8.8.8
```

Listing A-4: Setting up the PRIMARYDC virtual machine network

As the network switch we created earlier doesn't include support for DHCP, it won't automatically assign an IP address during installation. Thus, we need to set up the network with static IP addresses. Listing A-4 starts by setting the IP address of the network adapter; you should use the IP address from Table A-1 for the virtual machine you're configuring. The

DefaultGateway parameter should be the IP address you set on the host in Listing A-1 so that traffic can be routed to the external network.

You'll also need to specify a DNS server address for the network adapter. In Listing A-4 we set this to the address of the public Google DNS server, 8.8.8.8. If you know the IP address of your internet provider or another preferred DNS server, use that instead. Once we've finished setting up the domain controller, we'll no longer need this DNS server, as the domain controller has its own DNS server.

You should now be able to access an external network. At this point, you might need to activate your copy of Windows Server if you're not using a trial version. You'll also want to ensure that the copy of Windows is up to date, including all security patches. While the network will isolate the virtual machines from external networks to a degree, this doesn't mean they can't be compromised, so it's best to be certain.

540    Appendix A

---

Next, rename the computer using the Rename-Computer command, as shown in Listing A-5.

```bash
PS> Rename-Computer -NewName "PRIMARYDC" -Restart
```

Listing A-5: Renaming the computer

This name will be used on the domain network, so it helps to have memorable names. Replace PRIMARYDVD with your own name if you prefer.

Once you've renamed the computer, you need to configure the server as the domain controller for the mineral.local domain. Log in to the server as an administrator and run the commands in Listing A-6.

```bash
PS> Install-WindowFeature AD-Domain-Services
PS> Install-ADSSForest -DomainName mineral.local -DomainNetbiosName MINERAL
-InstallDns -Force
SafeModeAdministratorPassword: **********
Confirm SafeModeAdministratorPassword: **********
```

Listing A-6: Installing and configuring the Active Directory domain services

First, we install the AD-Domain-Service feature. This feature installs the Active Directory server and associated services to run the server as a domain controller. Next, we run the Install-ADDSForest command to set up the forest and create the root domain. We specify the DNS name of the domain, which in this case is mineral.local . We also specify the simple name of the domain as MINERAL and request that a local DNS server be installed. Active Directory can't work without a DNS server, and as this is an isolated network, it makes sense to run the DNS server on the domain controller server.

When setting up the forest, you'll be asked to specify a safe-mode administrator password. This password allows you to recover the Active Directory database. In such a small, non-production domain, you're unlikely to need this feature, but you should still specify a password you can remember. You're likely to see a few warnings during the installation; you can safely ignore these. Once the command has completed, the server will reboot automatically.

When it has finished rebooting you should reauthenticate to the server, but make sure to use the username MINERALAdministrator so that you can use the domain administrator account. The password for the domain administrator should be the same as the one you initially configured when installing the server. Then, start an instance of PowerShell and run the commands in Listing A-7 to do some basic user setup.

```bash
# PS> Set-ADDefaultDomainPasswordPolicy -Identity mineral.local
- MaxPasswordAge 0
# PS> $pwd = ConvertTo-SecureString -String "PasswOrdi" -AsPlainText -Force
# PS> New-ADUser -Name alice -Country USA -AccountPassword $pwd
-GivenName "Alice Bombas" -Enabled $true
# PS> $pwd = ConvertTo-SecureString -String "PasszOrdi" -AsPlainText -Force
# PS> New-ADUser -Name bob -Country JP -AccountPassword $pwd
-GivenName "Bob Cordite" -Enabled $true
```

Building a Windows Domain Network for Testing  541

---

```bash
❸ PS: New-ADGroup -Name 'Local Resource' -GroupId DomainLocal
PS: Add-ADGroupMember -Identity 'Local Resource' -Members 'alice'
PS: New-ADGroup -Name 'Universal Group' -GroupId Universal
PS: Add-ADGroupMember -Identity 'Universal Group' -Members 'bob'
PS: New-ADGroup -Name 'Global Group' -GroupId Global
PS: Add-ADGroupMember -Identity 'Global Group' -Members 'alice', 'bob'
```

Listing A-7: Configuring the domain password policy and adding users and groups

First, we set the domain's password policy to prevent passwords from expiring ❶ . There's nothing worse than coming back to your virtual machines after a few months and being faced with changing the passwords, which you immediately forget.

NOTE

Even though the default password expiry for a new domain is 42 days, Microsoft no longer recommends having forced password expiry enabled. This is because making users change their password frequently can cause more harm than good by encouraging them to use trivial passwords, so they don't forget them.

We then create two domain users, alive and bob , assigning each of them a password ❷ . We also set a few Active Directory attributes for each user: specifically, their name and country. I've summarized the values to specify in Table A-2 . Of course, you can set the names and values to anything you prefer.

Table A-2: Default Users for the Root Domain

<table><tr><td>Username</td><td>Given name</td><td>Country</td><td>Password</td></tr><tr><td>alice</td><td>Alice Bombas</td><td>USA</td><td>Password1</td></tr><tr><td>bob</td><td>Bob Cordite</td><td>JP</td><td>Password2</td></tr></table>


The final task in Listing A-7 is to create three Active Directory groups ❸ one for each group scope. We also assign the two users to a combination of these groups.

## The GRAPHITE Workstation

With the domain controller configured, we can now set up a workstation. Run the script in Listing A-8 to create the virtual machine, as we did with

PRIMARYDC .

```bash
PS> New-TestVM -VmName "GRAPHITE" -InstallerImage "C:\iso\client.iso"
-VMDirectory "C:\vm"
PS> vmconnect localhost GRAPHITE
PS> Start-VM -VmName "GRAPHITE"
```

Listing A-8: Creating and starting the GRAPHITE virtual machine

In this case, you'll use a disk image of Windows Professional or Enterprise, rather than a server installation. Any currently supported version of Windows 10 or greater is sufficient. Proceed with the installation as

---

you normally would, creating the machine's username and password. This book assumes you'll use the username admin and a password of Password, but you can pick any username and password you prefer.

Listing A-9 sets up the network, as in Listing A-4.

```bash
PS> $index = (Get-NetAdapter)-ifIndex
  -New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.50
-PrefixLength 24 -DefaultGateway 192.168.99.1
-PS> Set-DnsClientServerAddress -InterfaceIndex $index
-ServerAddresses 192.168.99.10
PS> Resolve-DnsName primarydc.mineral.local
Name
Type
TTL
Section
IPAddress
primarydc.mineral.local  A   3600  Answer
192.168.99.10
PS> Rename-Computer -NewName "GRAPHITE" -Restart
```

Listing A.9: Setting the domain DNS server and checking that it resolves

The only difference here is that we configure the DNS server to use the one we installed on the domain controller at 192.168.99.10. You can verify that the DNS server is working correctly by attempting to resolve the primaryde .mineal.local server address. You should also be able to resolve internet domain names, as the domain controller will forward the requests onward.

Again, once you've configured this network, you'll want to ensure that you've activated your Windows installation if necessary and downloaded any updates. If desired, you can rename the workstation to your chosen name before continuing.

In Listing A-10, we join the workstation to the domain.

```bash
PS> $creds = Get-Credential
PS> Add-Computer -DomainName MINERAL -Credential $creds
WARNING: The changes will take effect after you restart the computer GRAPHITE.
PS> Add-LocalGroupMember -Group 'Administrators' -Member 'MINERAL\alice'
PS> Restart-Computer
```

Listing A-10: Joining the GRAPHITE workstation to the domain

The first thing we need are the credentials for a user in the domain. As I explained in Chapter 11, this user doesn't need to be a domain administrator; it can be a normal user. For example, you can enter the credentials for the alive user when prompted by the Get-Commander command's GUI.

Next, we call the Add-Computer command to join the workstation to the MINERAL domain with the user's credentials. If this succeeds, it will print a warning telling you to restart the computer. However, don't restart it just yet; you first need to add a domain user, such as alce , to the local Administrators group using the Add-LocalGroupMember command. If you don't do this step, you'll subsequently have to authenticate to the workstation using either a domain administrator or the original local administrator account. Adding a user to this group allows you to authenticate as that user and be a local administrator. Once this is done, you can reboot.

Building a Windows Domain Network for Testing  543

---

That's all there is to setting up a workstation. You can configure the rest of the workstation's settings through the group policy on the domain controller. Once the workstation has restarted, you should be able to authenticate as any domain user.

## The SALESDC Server

The SALESD virtual machine is a Windows server that serves a domain controller for the sales.mineral.local.domain within the forest. Setting up this machine (or its sibling, ENGDC) is optional; you don't need multiple domain forests to run most of the examples in this book. However, it will allow you to test different behaviors.

Listing A-11 includes the same commands as those run for the PRIMARYDC virtual machine, with different values.

```bash
PS> New-Test-VM -VmName "SALESDC" -InstallerImage "C:\iso\server.iso"
    -VmDirectory "C:\vm"
PS> vmconnect localhost SALESDC
PS> Start-VM -VmName "SALESDC"
```

Listing A-11: Creating and starting the SALESDC virtual machine

Follow the normal installation process, and when asked for the


Administrator user's password, set it to anything you like. In this book, I've assumed it will be set to Password.

Listing A-12 configures the virtual machine's network using the DNS server on PRIMARYDC.

```bash
PS> $index = (Get-Net-Adapter).ifindex
PS> New-NetIPAddress -InterfaceIndex $index -IPAddress 192.168.99.110
-PrefixLength 24 -DefaultGateway 192.168.99.1
PS> Set-DnsClientServerAddress -InterfaceIndex $index
-ServerAddresses 192.168.99.10
PS> Rename-Computer -NewName "SALEDC" -Restart
```

Listing A-12: Setting up the SALESDC virtual machine network

It's crucial that the DNS client point to the root domain controller when creating a new domain in the forest so that you can resolve the root domain information. Once you've renamed the computer, you'll need to configure the server as the domain controller for the sales.mineral.local domain. Log in to the server as an administrator and run the commands in Listing A-13.

```bash
PS> Install-WindowFeature AD-Domain-Services
PS> Install-ADSDomain -NewDomainName Sales -ParentDomainName mineral.local
-NewDomainNetbiosName SALES -InstallDns -Credential (Get-Credential) -Force
SafeModeAdministratorPassword: **********
Confirm SafeModeAdministratorPassword: **********
```

Listing A-13: Installing and configuring the Active Directory domain services for a child domain

544    Appendix A

---

Here, you first install the AD-Domain-Services feature as before, then run the Install-ADODomain command to create a new domain in an existing forest. You'll be prompted for the safe-mode password, as with the root domain. You must also specify an administrator account in the root domain to establish the trust relationship. You can use the existing MINERAL Administrator account for this.

If this succeeds, the server should reboot. When you can reauthenticate as the SALESAdministrator user, you can verify that you've set up a trusted connection by using the Get-ADTrust command, as shown in Listing A-14.

```bash
PS> Get-ADTrust -Filter * | Select Target, Direction
Target        Direction
------        ---------
mineral.local    B3Direction1
```

Listing A-14: Verifying the trust relationship between the SALES and root domains

You should see a single entry for the root mineral.local domain. If the command fails, wait a few minutes for everything to start and retry.

At this point, you can add your own users and groups to the SALES domain, which will be separate from the root domain, although the users should be able to authenticate across domains due to the configured trust relationship. You can also install your own workstations using the steps outlined for GRAPHITE, making sure to specify the DNS server using the SALESDS IP address.

You can also create a separate engineering domain in the forest, or anything else you'd like. Just repeat these steps, changing the IP addresses and names you assign. You should then have a basic domain and forest configuration with which to run the examples in this book.

While we've configured every system you'll need for the book, you are free to configure and customize these domains further if you wish. Bear in mind that changing certain configurations, such as names or passwords, might change the input you'll need to provide in the book's examples.

---



---

## B  SDDL SID ALIAS MAPPING

![Figure](figures/WindowsSecurityInternals_page_577_figure_001.png)

Chapter 5 introduced the Security Descriptor Definition Language (SDDL) format for expressing a security descrip-

tor as a string and gave some examples of the two-character aliases that Windows supports for wellknown SDDL SIDs. While Microsoft documents the SDDL format for SIDs, it provides no single resource listing all the short SID alias strings. The only available resource is the sddl.h header in the Windows SDK. This header defines the Windows APIs a programmer can use to manipulate SDDL format strings and provides a list of short SID alias strings.

Table B-1 contains the short aliases along with the names and full SIDs that they represent. The table was extracted from the header provided with the SDK for Windows 11 (OS build 22621), which should be the canonical

---

list at the time of writing. Note that some SID aliases work only if you're connected to a domain network. You can identify these by the <DOMAIN> placeholder in the SID name, which you should replace with the name of the domain the system is connected to. Also replace the <DOMAIN> placeholder in the SDDL SID string with the unique domain SID.

Table B-1: Supported Mappings of SDDL SID Aliases to SIDs

<table><tr><td>SID alias</td><td>Name</td><td>SDDL SID</td></tr><tr><td>AA</td><td>BUILTIN\Access Control Assistance Operators</td><td>S-1-5-32-579</td></tr><tr><td>AC</td><td>APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES</td><td>S-1-15-2-1</td></tr><tr><td>AN</td><td>NT AUTHORITY\ANONYMOUS LOGON</td><td>S-1-5-7</td></tr><tr><td>AO</td><td>BUILTIN\Account Operators</td><td>S-1-5-32-548</td></tr><tr><td>AP</td><td>&lt;DOMAIN&gt;Protected Users</td><td>S-1-5-21-&lt;DOMAIN&gt; -S25</td></tr><tr><td>AS</td><td>Authentication authority asserted identity</td><td>S-1-18-1</td></tr><tr><td>AU</td><td>NT AUTHORITY\Authenticated Users</td><td>S-1-5-11</td></tr><tr><td>BA</td><td>BUILTIN\Administrators</td><td>S-1-5-32-544</td></tr><tr><td>BG</td><td>BUILTIN\Guests</td><td>S-1-5-32-546</td></tr><tr><td>BO</td><td>BUILTIN\Backup Operators</td><td>S-1-5-32-551</td></tr><tr><td>BU</td><td>BUILTIN\Users</td><td>S-1-5-32-545</td></tr><tr><td>CA</td><td>&lt;DOMAIN&gt;Cart Publishers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S17</td></tr><tr><td>CD</td><td>BUILTIN\Certificate Service DCOM Access</td><td>S-1-5-32-574</td></tr><tr><td>CG</td><td>CREATOR GROUP</td><td>S-1-3-1</td></tr><tr><td>CN</td><td>&lt;DOMAIN&gt;Cloneable Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S22</td></tr><tr><td>CO</td><td>CREATOR OWNER</td><td>S-1-1-3-0</td></tr><tr><td>CY</td><td>BUILTIN\Cryptographic Operators</td><td>S-1-5-32-569</td></tr><tr><td>DA</td><td>&lt;DOMAIN&gt;Domain Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S12</td></tr><tr><td>DC</td><td>&lt;DOMAIN&gt;Domain Computers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S15</td></tr><tr><td>DD</td><td>&lt;DOMAIN&gt;Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt; -S16</td></tr><tr><td>DG</td><td>&lt;DOMAIN&gt;Domain Guests</td><td>S-1-5-21-&lt;DOMAIN&gt; -S14</td></tr><tr><td>DU</td><td>&lt;DOMAIN&gt;Domain Users</td><td>S-1-5-21-&lt;DOMAIN&gt; -S13</td></tr><tr><td>EA</td><td>&lt;DOMAIN&gt;Enterprise Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S19</td></tr><tr><td>ED</td><td>NT AUTHORITY\ENTERPRISE DOMAIN CONTROLLERS</td><td>S-1-5-9</td></tr><tr><td>EK</td><td>&lt;DOMAIN&gt;Enterprise Key Admins</td><td>S-1-5-21-&lt;DOMAIN&gt; -S27</td></tr><tr><td>ER</td><td>BUILTIN\Event Log Readers</td><td>S-1-5-32-573</td></tr><tr><td>ES</td><td>BUILTIN\NDS Endpoint Servers</td><td>S-1-5-32-576</td></tr><tr><td>HA</td><td>BUILTIN\Hyper-V Administrators</td><td>S-1-5-32-578</td></tr><tr><td>HI</td><td>Mandatory Label\High Mandatory Level</td><td>S-1-16-12288</td></tr><tr><td>IS</td><td>BUILTIN\IS_USRS</td><td>S-1-5-32-568</td></tr></table>


---

<table><tr><td>SID alias</td><td>Name</td><td>SDDL SID</td></tr><tr><td>IU</td><td>NT AUTHORITY\INTERACTIVE</td><td>S-1-5-4</td></tr><tr><td>KA</td><td>&lt;DOMAIN&gt;Key Admins</td><td>S-1-5-21-&lt;DOMAIN&gt;-526</td></tr><tr><td>LA</td><td>&lt;DOMAIN&gt;Administrator</td><td>S-1-5-21-&lt;DOMAIN&gt;-500</td></tr><tr><td>LG</td><td>&lt;DOMAIN&gt;Guest</td><td>S-1-5-21-&lt;DOMAIN&gt;-501</td></tr><tr><td>LS</td><td>NT AUTHORITY\LOCAL SERVICE</td><td>S-1-5-19</td></tr><tr><td>LU</td><td>BUILTIN\Performance Log Users</td><td>S-1-5-32-559</td></tr><tr><td>LW</td><td>Mandatory Label\Low Mandatory Level</td><td>S-1-16-4096</td></tr><tr><td>ME</td><td>Mandatory Label\Medium Mandatory Level</td><td>S-1-16-8192</td></tr><tr><td>MP</td><td>Mandatory Label\Medium Plus Mandatory Level</td><td>S-1-16-8448</td></tr><tr><td>MS</td><td>BUILTIN\ARDS Management Servers</td><td>S-1-5-32-577</td></tr><tr><td>MU</td><td>BUILTIN\Performance Monitor Users</td><td>S-1-5-32-558</td></tr><tr><td>NO</td><td>BUILTIN\Network Configuration Operators</td><td>S-1-5-32-556</td></tr><tr><td>NS</td><td>NT AUTHORITY\NETWORK SERVICE</td><td>S-1-5-20</td></tr><tr><td>NU</td><td>NT AUTHORITY\NETWORK</td><td>S-1-5-2</td></tr><tr><td>OW</td><td>OWNER RIGHTS</td><td>S-1-3-4</td></tr><tr><td>PA</td><td>&lt;DOMAIN&gt;Group Policy Creator Owners</td><td>S-1-5-21-&lt;DOMAIN&gt;-520</td></tr><tr><td>PO</td><td>BUILTIN\Print Operators</td><td>S-1-5-32-550</td></tr><tr><td>PS</td><td>NT AUTHORITY\SELF</td><td>S-1-5-10</td></tr><tr><td>PU</td><td>BUILTIN\Power Users</td><td>S-1-5-32-547</td></tr><tr><td>RA</td><td>BUILTIN\RDS Remote Access Servers</td><td>S-1-5-32-575</td></tr><tr><td>RC</td><td>NT AUTHORITY\RESTRICTED</td><td>S-1-5-12</td></tr><tr><td>RD</td><td>BUILTIN\Remote Desktop Users</td><td>S-1-5-32-555</td></tr><tr><td>RE</td><td>BUILTIN\Replicator</td><td>S-1-5-32-552</td></tr><tr><td>RM</td><td>BUILTIN\Remote Management Users</td><td>S-1-5-32-580</td></tr><tr><td>RO</td><td>&lt;DOMAIN&gt;\Enterprise Read-only Domain Controllers</td><td>S-1-5-21-&lt;DOMAIN&gt;-498</td></tr><tr><td>RS</td><td>&lt;DOMAIN&gt;\RAS and IAS Servers</td><td>S-1-5-21-&lt;DOMAIN&gt;-553</td></tr><tr><td>RU</td><td>BUILTIN\Pre-Windows 2000 Compatible Access</td><td>S-1-5-32-554</td></tr><tr><td>SA</td><td>&lt;DOMAIN&gt;\Schema Admins</td><td>S-1-5-21-&lt;DOMAIN&gt;-518</td></tr><tr><td>SI</td><td>Mandatory Label\System Mandatory Level</td><td>S-1-16-16384</td></tr><tr><td>SD</td><td>BUILTIN\Server Operators</td><td>S-1-5-32-549</td></tr><tr><td>SS</td><td>Service asserted identity</td><td>S-1-18-2</td></tr><tr><td>SU</td><td>NT AUTHORITY\SERVICE</td><td>S-1-5-6</td></tr><tr><td>SY</td><td>NT AUTHORITY\SYSTEM</td><td>S-1-5-18</td></tr><tr><td>UD</td><td>NT AUTHORITY\USER MODE DRIVERS</td><td>S-1-5-84-0-0-0-0-0</td></tr><tr><td>WD</td><td>Everyone</td><td>S-1-1-0</td></tr><tr><td>WR</td><td>NT AUTHORITY\WRITE RESTRICTED</td><td>S-1-5-33</td></tr></table>


SDDL Sid Alias Mapping 549

---



---

## INDEX

### A

absolute security descriptors, 149-151, 164 Abstract category attribute, 354 access checks, 25, 36, 222, 265 Active Directory, 366 automating, 275-277 discretionary, 228, 241-244, 249, 259 enterprise, 249-260 handle duplication, 269-272 kernel-mode, 222-225 mandatory (MACs), 228, 230-237, 242 object type, 249-255 in PowerShell, 227-244 remote access check protocol, 389-390 sandbox token checks, 244-249, 272-274 thread process, 271-272 token, 227-228, 230, 237-241 traversal checks, 266-269 user-mode, 225 worked examples, 261-263, 277-279 access control entries (ACEs), 145, 153-156. See also names of specific ACEs access filter, 233 callback, 156 compound, 154-155, 213-214 discretionary access control lists, 145-146 finding resources with Audit ACEs, 294-295 flags, 156 flag strings mapped to, 167 mandatory label, 154, 167, 172, 201-203

normal, 154–155 object, 154–155 ordering, 158–159 security access control lists, 145–146 supported types, 153 type strings mapped to ACE types, 167 access control lists (ACLs), 151–156 ACEs, 153–156 DACIIs, 145–146, 186, 215 flag strings mapped to control flags, 166 headers, 152–153 NULL ACLs, 146 SACIIs, 144–146, 288–289, 292–293 AccessFilter ACEs, 154, 156, 167 access masks, 155 access strings mapped to, 168 closing handles, 40 converting, 38–39 displaying, 37–38 handle tables, 39–40 numeric value of, 39 generic mapping tables, 37 types of access, 36–37 access mode, 223–224 access strings for file and registry types, 169 mandatory label access strings, 172 mapped to access masks, 168 AccessSystemSecurity access right, 37, 178 access tokens, 25 AccountNotDelegated flag, 490 ACE flag strings, 167 ACEs. See access control entries; names of specific ACEs ACL flag strings, 166 ACLs. See access control lists

1

---

Active Directory, 341-396 access checks, 366-382 claims and central access policies, 382-384 domain configuration, 342-349 enterprise network domains, 301-302 group policies, 384-386 interactive authentication, 404 objects, 349-353 Objecttype GUIDs used in, 169 property hierarchy, 250-251 schema, 353-358 security descriptors, 358-366 worked examples, 387-395

Add- commands, 49-52, 59, 84, 157, 251, 309, 311, 324, 371, 389, 543, 415, 417-418

AddMember access right, 318 AddMember function, 588 Ab-Domain-Services feature, 541, 545 AdjustDefault access right, 100 AdjustGroups access right, 100 AdjustPrivileges access right, 100, 320 AdjustQuotas access right, 320 AdjustSessionId access right, 100 AdjustSystemAccess access right, 320 AdministerServer access right, 315 administrator users, 122-124 LSalogfon User API, 409-410 removing privileges, 140-141 SAM database, 326 verifying tokens, 123-124

Advanced Encryption Standard (AES), 327-332 AES keys, 470-471, 496 advanced local procedure call (ALPC) subsystem, 24, 55 AFD (Ancillary Function Driver), 47 Alarm ACEs, 154, 292 AlarmCallback ACEs, 154, 292 AlarmObject ACEs, 154, 292 aliases, 12-13, 166, 318, 548 Allowed ACEs, 153-154, 158, 167 AllowedCallback ACEs, 154, 167 AllowedCallbackObject ACEs, 154, 167 AllowedCompound ACEs, 154-155

AllowedObject ACEs, 154, 167 ALPC (advanced local procedure call) subsystem, 24, 55 Ancillary Function Driver (AFD), 47 Anonymous flag, 518 Anonymous impersonation level, 104, 106, 136 anonymous sessions, 518–519 Anonymous type, 53 Anonymous user token, 214 ANSI strings, 79 APIs AcceptSecurityContext API, 426–427 AcquireCredentialsHandle API, 424 AuthAccessCheck API, 156, 243 AuthZ API, 387, 389–390 Create APIs, 77–79, 87–90, 107, 117, 135, 298, 412–413 Data Protection API (DPAPI), 322, 516 DecryptMessage API, 440–441, 476 EncryptMessage API, 440–442 ExIsRestrictedCaller API, 272 Generic Security Services API, 476 Get APIs, 65–66, 78, 208–209, 212 ImpersonateNamedPipe API, 104 InitializeSecurityContext API, 423–424 LoadLibrary API, 65, 68 LogonUser API, 102, 401 LsaloOnSler API, 399–414 accessing from PowerShell, 410–412 creating user desktops, 398–399 domain authentication, 403–404 local authentication, 401–402 logon and console sessions, 404–406 logon types, 400 protocol transition delegation, 489 security packages, 400–401 token creation, 407–410 LsaManageSidNameMapping API, 323–324

552  Index

---

lsaOpenPolicy API, 318-319 MakeSignature API, 441-443 NtAccessCheckByType API, 249 prefix-to-subsystem mapping, 24-25 Query APIs, 430, 442 RtlDosPathNameofntPathName API, 83, 86 RtlIsSandboxToken API, 272, 274 Sam APIs, 313-316 SeAccessCheck API, 222-223 SeAccessCheckByType API, 249 SeAssignSecurityEx API, 180-182 SeCreateClientSecurity API, 484 SeImpersonateClient API, 484 SeSetSecurityDescriptorInfoEx API, 206-207 SetNamedSecurityInfo API, 208-210 SeTokenCanImpersonate API, 136 SetPrivateObjectSecurityEx API, 208 sets, 67-68 Shell, 89-91 VerifySignature API, 440-441 Win32 security APIs, 64-70, 77-80, 208-213 WinSock API, 47 AppContainer process, 120-122 Application Information service, 93 application package authority, 120 AP-REP message. See authentication protocol reply message AP-REQ (authentication protocol request) message, 494, 519-520 array type, 5 asInvoker UAC execution level, 126 AS-REP (authentication service reply) message, 459 AS-REQ (authentication service request) message, 458 AssignPrimary access right, 100 Audit ACEs, 153, 167, 294-295 AuditCallback ACEs, 154, 167 AuditCallbackObject ACEs, 154 auditing. See security auditing AuditLogAdmin access right, 319 AuditObject ACEs, 154, 167

audit policy security, 287–293 configuring global SACL, 292–293 configuring resource SACL, 288–291 authentication audit event log, 524–527 authentication protocol reply (AP-REP) message decryption, 476–477 designation, 481 Kerberos authentication in PowerShell, 468–469 Negotiate security package, 505 network service authentication, 463–464 authentication protocol request (AP-REQ) message, 494, 519–520 cross-domain authentication, 478 decryption, 469–476 designation, 481–483, 485–487 Kerberos authentication in PowerShell, 466–469 Negotiate security package, 505 network service authentication, 463–464 U2U authentication, 491–493 authentication protocol transitions, 486–487, 490 authentication service reply (AS-REP) message, 459 authentication service request (AS-REQ) message, 458 authentication tokens, 423, 500 Authencode mechanism, 54 Auth2AccessCheck function, 387 auto-inherit flags, 161, 181–182, 203, 209–210, 215 Auxiliary category attribute, 354

## B

BackgroundColor parameter, 16 BaseNamedObjects (BNO) directory, 29 console sessions, 76–77 finding object manager resource owners, 216–217 querying security descriptor and owner for, 179 Win32 APIs vs. system calls, 78

Index 553

---

bitwise operators, 6 BNO directory. See BaseNamedObjects directory

Boolean operators, 6 bool type, 5 brute-force attacks, 428-429, 465

## C

canonicalization, 84-85, 362 CBC (cipher block chaining), 330 central access policies, 255-260 access checks, 258-259 Active Directory, 382-384 claims, 255-256, 382-384 displaying, 257 enabling, 259-260 information contained in, 257 simple configuration vs., 256 ChangePassword access right, 316, 377 channel binding, 444-445 ChannelBindings buffer flag, 500 Chrome web browser, 117 cipher block chaining (CBC), 330 ciphertext-stealing mode (CTS), 466 Citrix, 77 claims Active Directory, 382-384 device, 255-256 user, 255-256 Class88 category attribute, 354 Client Server Runtime Subsystem (CSRSS), 71 CLI XML format, 20-21 CloudAP security package, 403 code Integrity, 54-55 Authenticode mechanism, 54 kernel, 24 prefix, 25 purpose of, 54 COM (Component Object Model) server processes, 93 command line parsing, 88-89 commands. See also names of specific commands accepting parameters, 9 accessing properties and methods, 9 aliases, 12-13 discovering, 10


1

executing, 9-10 line breaks, 9-10 naming conventions, 9 passing output of one to another, 9 usage examples of, 11-12

Commit state value, 50 Compare- commands, 42, 231, 233 Component Object Model (COM) server processes, 93 conditional expressions, 155, 169-171 access filter ACEs, 233-235 central access policy, 255, 257-259 infix operators for, 171 type values, 170 unary operators for, 170 Confidentiality request attribute flag, 440-441, 451 configuration manager. See registry Connect access right, 313 console sessions, 83, 416-417 creating user desktops, 398 impersonation tokens, 137 Remote Desktop Services, 74-75 separation of named objects, 76-77 session ID, 102, 405 Windows logon process, 92 constrained delegation (Service for User), 480, 484-491 Kerberos-only, 485-486, 490 protocol transition, 486-488, 490 resource-based, 489-491 constructors, 8 ContainerInherit ACE flag, 156, 167, 193-194, 202 context tracking mode, 106 ControlAccess access right, 366, 378 control access rights, 376-379, 394 control flags, 144-145, 166, 173, 182, 193-194, 215, 381 Dacl, 144-146, 166, 181-182, 194, 215 RmControlValid, 149 Sacl, 144-145, 166, 181 SelfRelative, 149-151 ServerSecurity, 213-214 TrustedforDelegation, 381, 482 TrustedToAuthenticateFor Delegation, 381


1

---

ConvertFrom- commands, 155–156, 163, 175, 502, 509 ConvertTo-NtSecurity@script command, 218 Copy- commands, 41, 107–108, 140 CreateAccount access right, 319–320 CreateAlias access right, 315 CreateChild access right, 366–368 CreateDirectories property, 267 CreateDomain access right, 313 CreateGroup access right, 315, 317 CreatePrivilege access right, 319 CreateSecret access right, 319 CreateUser access right, 315 creator security descriptors, 180 assigning during resource creation, 180–188 inheritance rules, 215 Credential Guard, 484 credential manager, 514–517 GredSSP protocol, 510–513 Critical ACE flag, 156, 167, 208 cross-domain authentication, 477–479 cryptographic derivation process, 431–433 CSSRS (Client Server Runtime Subsystem), 71 CSV files, 20 CTS (ciphertext-stealing mode), 466 CVE security issues 2014-6324, 475 2014-6349, 278 2018-0748, 184 2018-0983, 212 2019-0943, 57, 271 2020-1472 (Zeroologon), 403 2020-1509, 523 2020-17136, 225 2021-34470, 368

## D

DAC (discretionary access control), 36, 143 Dacl control flags, 144–146, 166, 181–182, 194, 215 DACLS. See discretionary access control lists Dacl security information flag, 211

DAP (Directory Access Protocol), 342 data buffer flag, 500, 502 Data Encryption Standard (DES), 332–333 Datagram Transport Layer Security (DTLS) protocol, 506 Data Protection API (DPAPI), 322, 516 DCOM Server Process Launcher, 93 Delegate flag, 483 delegation, 479–480 constrained, 480, 484–491 unconstrained, 480–484 Delegation impersonation level, 105–107 Delete access right, 36, 168, 369 DeleteChild access right, 366, 369 DeleteTree access right, 366, 369 Denied ACEs, 153–154, 158, 167, 243, 255 DeniedCallback ACEs, 154, 167 DeniedCallbackObject ACEs, 154 DeniedObject ACEs, 154, 167, 252–253, 255 DeniedCallback ACEs, 243 DES (Data Encryption Standard), 332–333 DesiredAccess parameter, 30, 36, 79 Desktop objects, 71–72 desktop window manager (DWM) process, 92, 405 DHCP (Dynamic Host Configuration Protocol), 537, 540 Diffie-Hellman key exchange, 477, 508 Directory Access Protocol (DAP), 342 Directory objects, 28, 169, 219 Disable-NTokenPrivilege command, 114 discretionary access checks, 228, 250, 241–243 discretionary access control (DAC), 36, 143 discretionary access control lists (DACLs), 145–146 control flags, 144–146, 166, 181–182, 194, 215 default, 186 inheritance rules, 215 DistinguishedName attribute, 351 distinguished names, 349–351 DLLMain function, 66

Index 555

---

DLLs, 65-69, 119 API sets, 67-68 delay loaded, 67 .DLL file extension, 69 export forwarding, 66 hijacking, 68-69 loading new libraries, 65-66 NTDL, 65-66 searching for, 68-70 untrusted, 66 viewing imported APIs, 66-67 DNS. See Domain Name System domain authentication, 300-304 domain forests, 302-304 enterprise network domains, 301-302 local authentication, 299-301 LSanLogger API, 403-404 domain forests, 302-304 global catalog, 303-304 multiple, 304 trust relationships, 303 DomainLocal group scope, 346-347 Domain Name System (DNS), 302, 344, 536 Active Directory domain configuration, 344-345 virtual machines, 540, 544 domain policy remote service, 312, 318-324 access rights, 319 account objects, 319-321 connecting to, 318-319 name lookup and mapping, 323-324 secret objects, 321-322 trusted domain objects, 322-323 domain security policies, 282 done state, 430 DOS device paths, 83-87 canonicalization, 84-85 displaying symbolic links, 83-84 DOS device map prefix, 83 maximum path lengths, 85-87 path separators, 84 path types, 84-85

double hop problem, 435 double type, 5

DPAPI (Data Protection API), 322, 516 drawing resource objects, 71 DTLS (Datagram Transport Layer Security) protocol, 506 Duplicate access right, 100 DWM (desktop window manager) process, 99, 405 Dynamic Access Control, 255 Dynamic Host Configuration Protocol (DHCP), 537, 540

## E

ECB (electronic code book), 333 Edit- commands, 158–159, 190, 364 Effective pseudo token handle, 108 effective token mode, 106 electronic code book (ECB), 333 Empty buffer flag, 500 Enabled attribute, 110, 114 EnabledByDefault attribute, 110, 114 Enable-MTokenPrivileges command, 114 enterprise access checks, 249–260 central access policy, 255–260 object type access checks, 249–255 enterprise authentication capability, 520–523 enterprise network domains, 301–302.

See also Active Directory domain controllers, 301–302 group policies, 302 EnumerateDomains access right, 313–314 Enumeratsetiers access right, 287 EPA (Extended Protection for Authentication), 444 escape characters, 7–8 Event Tracing for Windows (ETW), 292 Everyone ACEs, 365 explicit credentials, 437, 522–523 explicit token impersonation, 107 Export commands, 20, 533 exporting data to CLI XML format, 20–21 to CSV files, 20 to text files, 20 expressions, 5–8

Extended Protection for Authentication (EPA), 444 extended rights, 373–376

---

ExtendedSessionSecurity NTLM flag, 429-430


Extra buffer flag, 500

## [

FailedAccess ACE flag, 156, 168 Fast User Switching feature, 75, 417 File objects, 30, 41, 162, 169 ForceAccessCheck attribute flag, 224-225 ForcePasswordChange access right, 316 ForegroundColor parameter, 16 Format commands, 15, 27, 44, 60, 103, 159-161, 209, 359, 427 Forwardable flag, 472, 485-486, 490 Free state value, 50-51 FullName property, 9 function keyword, 13 functions, 13-14

## G

GDIJ32 library, 70-71 GenericALL access value, 37, 250-252, 254 GenericExecute access value, 37, 235 generic mapping, 39, 181 assigning security descriptors during resource creation, 181, 185 to existing resources, 206-207 kernel-mode access checks, 222 mandatory integrity level check, 235 mapping tables, 37 user-mode access checks, 225 GenericRead access value, 37, 39, 235 Generic Security Services Application Program Interface (GSSAPI), 476 GenericWrite access value, 37, 235 GetAliasMembership access right, 315 Get- commands, 7, 9-16, 26-27, 34, 37-39, 43-48, 50-51, 54, 56-57, 65-68, 72, 74, 78, 81, 83, 85-87, 93-94, 102-103, 108-110, 112-114,

147-148, 175-176, 179, 206, 208-209, 217-218, 226-229, 244-245, 257258, 261-262, 275-277, 286-287, 290, 305-306, 308, 310-312, 314-315, 317-320, 327, 344-348, 350-351, 356-357, 359, 363, 368-369, 373-374, 379, 382-384, 386, 390, 395, 400, 404-405, 411, 441, 470-471, 494-495, 543, 545

Get- functions, 140, 242, 339, 393-395, 431-433, 448, 532, 529 GetObject method, 59 GetPrivateInformation access right, 319 global catalog, 303-304, 352-353 Global group scope, 346-347 golden tickets, 462-463 Google Chrome web browser, 117 GrantedAccessMask property, 39 GroupByAddress parameter, 58 Group-Object command, 19, 58 group policies, 256-257, 409

Active Directory, 384-386 authentication to known web proxies, 521 enterprise network domains, 301-302 Group security information flag, 157, 183 GSSAPI (Generic Security Services Application Program Interface), 476 GSS _ functions, 476

## H

handles, 30, 35-42 access masks, 36-40 closing, 40 displaying handle tables, 39-40 duplicating, 40-41 duplicating unnamed, 187-188 duplication access checks, 269-272 finding open handles by name, 57 finding token handles to impersonate, 139-140 handle tables, 35

---

handles (continued) pseudo, 48, 108–109 registry, 80 windows, 73 handles property, 18–19 hash-based message authentication codes (HMACs), 429 hashtable type, 5 highestAvailable UAC execution level, 126 HKEY_CLASSES_ROOT handle, 90 Hyper-V, 47, 537–538

## |

IBM OS/2 operating system, 64, 85 Identification impersonation level, 105–106, 136 Identify request attribute flag, 519–520 identity tokens, 519–520 Id property, 14, 284 IIS (Internet Information Services) web server, 414 Image type, 53 Impersonate access right, 100, 104, 107 Impersonation impersonation level, 105 Impersonation pseudo token handle, 108 impersonation tokens, 104–107 explicit token impersonation, 107 impersonation context, 104 SQoS, 104–107 Import commands, 5, 20, 65–66 importing data, 20–21 InfoOnly parameter, 47, 314 InformationClass parameter, 43 inheritance, 215 auto-inheritance, 181 behavior, 197 dangers, 212 flags, 182, 194 parent security descriptors, 188–194

Inherit attribute flag, 42 Inherited ACE flag, 156, 158, 167, 212 InheritedObjectType GUID, 169, 203–205 InheritOnly ACE flag, 156, 167

initialization vectors, 329-330 Initialize access right, 313 InitialOwner parameter, 32, 79 input/output (I/O) manager, 24-25, 45-47 device drivers, 45 displaying device objects, 46 listing drivers, 47 opening device objects and displaying volume path, 46-47

Install- commands, 4, 545 Int64 security attribute type, 260 Integrated Windows Authentication (IWA), 424 Integrity attribute flag, 112-113 IntegrityEnabled attribute, 112 integrity levels, 102, 112, 124, 137 interactive authentication, 397-419, 458-464 AP-REP message, 464 AP-REQ message, 464 AS-REP message, 459-461 AS-REQ message, 458 creating new processes with tokens, 412-413 creating user desktops, 398-399 initial user authentication, 458-462 KDC service, 458 LsalogonUser API, 399-412 network service authentication, 465-465 pre-authentication data, 458 privilege attribute certificates, 459 Service logon type, 413-414 service principal names, 460 TGS-REP message, 461-462 TGS-REQ message, 460-461 ticket granting servers, 459 ticket granting tickets, 459 tickets, 458 worked examples, 414-419 Internet Explorer, 118-119 Internet Information Services (IIS) web server, 414 int type, 5

---

Invoke- commands, 14, 105 I/O manager, $reinput/output manager ISE (PowerShell Integrated Scripting Environment), 261 Isfiltered flag, 128, 269 Isrestricted flag, 269 IWA (Integrated Windows Authentication), 424

## J

John the Ripper, 496

## K

KDC service. See key distribution center service

Kerberoasting, 465, 495–496 Kerberos, 457–497

AP-REP message decryption, 476–477 AP-REQ message decryption, 469–476 CredSSP protocol, 512 cross-domain authentication, 477–479 delegation, 479–491 double hop problem, 435 golden tickets, 462–463 interactive authentication, 458–464 PKINIT, 477 via PowerShell, 465–469 service principal names, 443 silver tickets, 465 U2U authentication, 491–493 worked examples, 493–496 Kerberos Credential (KRBCRED), 483 Kerberos-only delegation (Service for User to Proxy), 485–486, 490 KERNEL32 library, 64–65 KERNELBASE library, 64–65 kernel-mode access checks, 222–225 access mode, 223–224 memory pointer checking, 224–225

parameters, 222 KernelObjects ODDS directory, 75 key distribution center (KDC) service cross-domain authentication, 478 decrypting AP-REQ message, 473, 475 initial user authentication, 458, 477 Kerberos-only delegation, 485 network service authentication, 463–464 protocol transition delegation, 486–487 resource-based delegation, 490 U2U authentication, 491 unconstrained delegation, 481 KeyExchange flag, 441 key version numbers, 467 KeywordsDisplayNames property, 290 KnownDtls OMSN directory, 69–70 KRB-CRED (Kerberos Credential), 483

## L

LAN Manager (LM), 306, 327 Less Privileged AppContainers (LPACs), 246 Lightweight Directory Access Protocol (LDAP), 342, 354–358, 371, 494 linked tokens, 126–129, 262 List access right, 366–367, 369 ListAccounts access right, 315 ListGroups access right, 316 ListMembers access right, 318 ListObject access right, 366, 369 LM (LAN Manager), 306, 327 local authentication, 299–301, 398 local domains, 300 LSalongüser API, 401–402 user database, 305 local call flag, 436 local domain configuration, 300, 305–311 LSA policy database, 309–312 user database, 305–309 local loopback authentication, 435–436

Index 539

---

locally unique identifiers (LUIDs), 102–103 Local Security Authority (LSA), 305, 309–324 extracting system keys, 327–328 logon account rights, 310–311 privilege account rights, 310 remote services, 311–324 Local Security Authority Subsystem (LSASS), 26, 92 creating tokens, 131–133 enumerating SIDs, 175–176 finding resources with audit ACEs, 295 linked tokens, 128 logon sessions, 102 local security policies, 282 logon account rights, 310–311, 415–416 LogonID attribute, 111, 405 logon types, 400, 402, 408–412 Network logon type, 409–411 NewCredentials logon type, 438 Service logon type, 413–414 LogonUI process, 92, 398 LongPathsEnabled value, 87 long type, 5 Lookup access right, 315 LookupDomain access right, 313–314 LookupNames access right, 319, 323 lowbox tokens, 120–122, 246–249, 273, 520–523 LPACs (Less Privileged AppContainers), 246 lParam parameter, 74 IpMuteAttributes parameter, 78 IpName parameter, 78 LSA. See Local Security Authority LSalogounter API, 399–414 accessing from PowerShell, 410–412 creating user desktops, 398–399 domain authentication, 403–404 local authentication, 401–402 logon and console sessions, 404–406 logon types, 400 protocol transition delegation, 489

_

security packages, 400-401 token creation, 407-410 LSASS. See Local Security Authority Subsystem

luaToken flag, 128, 140 LUIDs (locally unique identifiers), 102-103

## M

mandatory access checks (MACs), 228-237 access filter ACEs, 233-235 lowbox tokens, 247-248 mandatory integrity level check, 235-237 process trust level check, 231-233 mandatory access control, 102, 143 Mandatory attribute, 110 Mandatory Integrity Control (MIC), 230 mandatory integrity level check, 235-237 mandatory label ACEs, 154, 167 access strings, 172 assigning security descriptors during resource creation, 201-203 integrity level SIDs, 172 MandatoryLabel security authority, 112 mandatory policy values, 161 MapGenericRights parameter, 39 MapWrite access, 52, 58 MD4 hashes, 306, 432 MD5 hashes, 329, 431, 466 memory manager, 49-54 finding writable and executable memory, 60-61 MtVirtualMemory commands, 49-51 pagefiles, 49 prefix, 25 Section objects, 51-54 virtual memory space, 49 memory pointer checking, 224-225 message integrity codes (MICs), 425, 429, 433 message loops, 73 Microsoft Visual Studio, 261, 538

1

---

ModifyState access, 42, 270-271 Mutant objects, 29-30, 181, 187, 193 mutual authentication, 464 MutualAuth flag, 483 MutualAuthRequired flag, 469

## N

Nagle algorithm, 448 NAT (network address translation), 537 Negotiate security package, 401, 508–505 initializing, 503–505 security mechanisms, 504 specifying credentials, 504 NegotiateStream class, 445 NetCredential-only flag, 413 Netlogon protocol, 342, 403 network address translation (NAT), 537 network authentication, 421–455 credentials, 407 lowbox tokens, 520–523 NTLM network authentication, 422–438 NTLM relay attacks, 438–445 worked example, 445–454 Network Level Authentication (NLA), 511 Network logon type, 409–411 New- commands, 8, 12–13, 46, 51–53, 56, 81, 85, 88–89, 192–193, 157, 251, 273, 306–307, 309, 325, 361, 381, 389–390, 424, 500, 507, 537, 539

NewCredentials logon type, 438 New- function, 189, 232, 538–539 NewGuid static method, 8 NLA (Network Level Authentication), 511 None ACE flag, 193 NoPropagateInherit ACE flag, 156, 167, 193–194 NoRightsUpgrade flag, 188, 270–271 Notification access right, 319 Nt (Wu) prefix, 24, 29–30, 224 NtAccessCheck system calls, 225–227, 249, 254, 291 NtAdjust system calls, 110, 114–115

1

NtAllocate system calls, 49–50, 102, 409 NtChallengeResponse system call, 433 NtCloseObjectAuditAlarm system call, 291 NtCreate system calls, 29–30, 55, 77, 116, 120, 132 NTDLLE (NT Layer dynamic link library), 65–66 NtDuplicate system calls, 41, 107 NtFilterToken system call, 117 NtFreeVirtualMemory system call, 49 NT hashes, 306, 326–327, 332, 334 NtImpersonate system calls, 106–107 NTLM (NT LAN Manager) flags, 425, 427 network authentication, 422–438 authentication tokens, 423 bypassing proxy check, 523–524 cracking user passwords, 428–429 CredSSP protocol, 512 cryptographic derivation process, 431–433 explicit credentials, 437 impersonating tokens, 437–438 local administrators, 430–431 local loopback authentication, 435–436 Negotiate security package, 503–505 pass-through authentication, 434–435 variants of, 422 via PowerShell, 423–430 relay attacks, 438–445 active server challenges, 440 channel binding, 444–445 example of, 439 signing and sealing, 440–443 target names, 443 security package, 401 NtLoadDriver system call, 45, 116 NmMake system calls, 40–41 NmMapViewOfSection system call, 51 NtObjectManager module, xx, 356, 359

Index 561

---

NTOpen system calls, 100, 291 NTPrivilegeCheck system call, 115 NTQuery system calls, 30, 39, 47, 49, 126, 179–180 NtReadVirtualMemory system call, 49 NtSecurityDescriptor attribute, 558, 380 NtSetInformation system calls, 107, 128, 131–132, 135 NtSetSecurityObject system call, 905–906 NTSTATUS codes, 32–35, 77–78 NtWriteVirtualMemory system call, 49 NullSession request attribute flag, 518

## O

ObjectAccess audit category, 284-285 ObjectAttributes parameter, 30-31 OBJECT_ATTRIBUTES structure, 30-32 ObjectClass attribute, 351, 355 ObjectInherit ACE flag, 156, 167 object manager, 24, 180-181 displaying object types, 27-28 DOS device paths, 83-84 finding owners, 216-218 NTSTAUS codes, 32-35 object directories, 29 object handles, 35-42 object manager namespace, 28 automating access checks, 275-276 permanent objects, 40-41 registry, 55 traversal checking, 266-267 Win32 registry paths, 80-82 prefix, 24 system calls, 29-32 Query and Set system calls, 42-45 ObjectName parameter, 31-32, 291 objects

accessing properties, 8 attribute flags, 32 creating, 8 directories, 29 displaying, 14-17, 27 filtering, 17-19

finding shared objects, 57–59 grouping, 19 handles, 30, 35–42, 187–188 invoking methods, 8 naming, 31 permanent, 40–41 sorting, 18–19 object type access checks, 249–255 ObjectType GUID, 169, 203–205 ObjectTypes parameter, 249, 251–253 Oem NTLM flag, 427 OsAsDelegate flag, 481–483 OMNs. See object manager namespace under object manager operators, 6, 14, 18 infix, 171 unary, 170 Oracle VirtualBox, 537 organizational units, 385–386 Out- commands, 16–17, 20, 54, 60 Owner attribute, 111 owner check, 184, 240–241 Oem security information flag, 184

## P

pagefiles, 49 Paging parameter, 16 Parameter command, 11 parameters, 9, 11 parent security descriptors, 180, 182, 185-203 inheritance rules, 215 setting both creator and parent, 195-200 setting neither creator nor parent, 185-188 setting parent only, 188-195 pass-the-hash technique, 306 pass-through authentication, 434-435 PassInfo parameter, 17, 285 Password-Based Key Derivation Function 2 (PBKDFv2) algorithm, 471 password encryption keys (PEKs) decryptioning, 328-330 decrypting password hashes, 330-332

---

Path parameter, 9 PDC (primary domain controller) emulator, 345 Permanent attribute flag, 40 per-user audit policies, 285–287 PIDs (process IDs), 47–48 pipeline (l), 9 PkgParms buffer flag, 500–501 PKINIT (Public Key Initial Authentication), 477 Plug and Play (PnP) manager, 45 POSIX, 64, 85, 145 PowerShell, 3–21 configuring, 4–5 discovering commands, 10 displaying and manipulating objects, 14–17 equivalent SDK names, 38 executing commands, 9–10 exporting data, 20–21 expressions, 5–8 filtering objects, 17–19 functions, 13–14 getting help, 10–13 grouping objects, 19 Integrated Scripting Environment, 261 line breaks, xxviii modules, 4–5 operators, 6 script execution policy, 4–5 sorting objects, 18–19 string character escapes, 7–8 string interpolation, 7 style conventions for examples in book, xxvii–xxviii types, 5–6, 8 variables, 6–7 versions of, 3–4 pre-authentication data, 458–459 PreviousMode value, 223–224 primary domain controller (PDC) emulator, 345 Primary tokens, 100, 108, 133–134 Principal parameter, 249–250 print Shell verb, 90–91 printto Shell verb, 90–91

privilege attribute certificates (PACs), 408 cross-domain authentication, 478–479 decrypting AP-REQ message, 472–475 delegation, 487 golden tickets, 462 initial user authentication, 458–462 network service authentication, 464 silver tickets, 465 privilege checks, 238–239 process and thread manager, 24, 47–48 displaying processes and threads, 47–48 opening processes and threads, 48 prefix, 25 process and thread IDs, 47 process creation, 87–91 command line parsing, 88–89 Shell APIs, 89–91 process IDs (PIDs), 47–48 ProcessName property, 14, 19 Process objects, 18, 42 Process parameter, 49 Process TrustLabel ACEs, 154, 167 process trust level checks, 231–233 property sets, 251, 373–376 Protectedacl security information flag, 210–211, 364 ProtectedData class, 516 protected objects, 381–382 protected processes, 231–233 Protectedacl security information flag, 210 ProtectFromClose attribute, 42 Protect-LsaContextMessage command, 441 protocol transition delegation (Service for User to Self), 486– 488, 490 Proxy Auto-Configuration (PAC) scripts, 521 pseudo handles, 48, 108–109 Public Key Initial Authentication (PKINIT), 477

Index 563

---

## Q

Query access right, 100

QueryInformation class, 45

QueryInformation system call verb, 30

QueryLimitedInformation access right, 49, 61

QueryMiscPolicy access right, 287

QuerySource access right, 100

Query system call, 42-45

QuerySystemPolicy access right, 287

QueryUserPolicy access right, 287

QueryValue access right, 322

## R

rainbow tables, 429 RC4 encryption algorithm, 327-328, 331, 442, 466, 470 RDP (Remote Desktop Protocol), 75, 77 RDS (Remote Desktop Services), 74, 77 ReadAccount access right, 316 Read- commands, 49-51, 307, 410 ReadControl access right, 36, 178, 240-241 ReadGeneral access right, 316 ReadGroupInformation access right, 316 ReadInformation access right, 318 ReadLogon access right, 316 ReadOnly buffer flag, 501 ReadOnly protection state, 49 ReadOnlyWithChecksum buffer flag, 501 ReadOtherParameters access right, 315 ReadPasswordParameters access right, 314-315 ReadPreferences access right, 316 ReadProp access right, 366, 370 Read-TlsRecordToken function, 532 Receive- functions, 448 referral tickets, 478-479 regedit application, 80 registry (configuration manager), 24, 55-56 attachment points, 56 hives, 56 keys and values, 55-56 prefix, 25 relative distinguished names, 349-350

relative identifiers (RIDs), 26, 112

AppContainer and lowbox tokens, 120–121 cycling, 323, 336–337 mandatory integrity level checks, 235 SID structure, 146–149 user database, 306–308 relative security descriptors, 149–151, 163–164 RemainingAccess value, 229–230 remote access check protocol, 389–390 Remote Credential Guard, 513 Remote Desktop Protocol (RDP), 75, 77 Remote Desktop Services (RDS), 74, 77 remote procedure calls (RPCs), 55, 104 Remote Procedure Call Subsystem (RPCSS), 92–93 Remote Server Administration Tools (RSAT), 343–344 Remove- commands, 49–52, 56, 115, 308–309, 311, 324, 369, 416 RemoveMember access right, 318 Renewable flag, 472 requireAdministrator UAC execution level, 126 Reserve state value, 50 Reset-Win32SecurityDescriptor command, 211 Resolve- functions, 238, 240, 244 Resource attribute, 113, 408 ResourceAttribute ACEs, 154, 167 resource-based delegation, 489–491 resource manager flags, 144–145, 149 Restricted Admin node, 513–514, 525 RestrictedDkbHost class, 467–468 restricted tokens, 117–119, 244–245 return keyword, 13 RIDs. See relative identifiers RmControlWald control flag, 149 RootDirectory parameter, 31–32 Root Directory System Agent Entry (RootDE), 350

564 Index

---

RPCs (remote procedure calls), 55, 104 RSAT (Remote Server Administration Tools), 343-344

rtlNewSecurityObjectX system call, 182 Rubeus, 496

## S

S4U. See constrained delegation S4U2proxy (Service for User to Proxy), 485-486, 490 S4U2self (Service for User to Self), 486-488, 490 SvcAutoInherit auto-inherit flag, 209-210 Svc control flags, 145, 166, 181 SACLS. See security access control lists SAM. See security account manager database; security account manager remote service sandbox tokens, 117-122, 244-249 access checks, 272-274 lowbox tokens, 120-122, 246-249 restricted tokens, 117-118, 244-245 write-restricted tokens, 119 SAS (secure attention sequence), 399 SCM (service control manager), 92-93 ScopedPolicyId ACES, 154, 167 script blocks, 14, 18 SDDL format. See Security Descriptor Definition Language format SDK (software development kit), 38, 110, 112 SDkName property, 38, 161 Search-Win32SecurityDescriptor command, 212-213 SeAssignPrimaryTokenPrivilege privilege, 116 SeAuditPrivilege privilege, 116 SeBackupPrivilege privilege, 116, 123 SeBatchLogonRight account right, 311, 402, 416 SeChangeNotifyPrivilege privilege, 116, 267 setpol.msc command, 282 SeCreateTokenPrivilege privilege, 116, 123, 132

Section objects, 217 creating sections and mapping to memory, 51–52 finding shared, 57–59 finding writable, 278–279 listing mapped files with names, 53 mapping and viewing loaded images, 53–54 modifying mapped sections, 59–60 secure attention sequence (SAS), 399 secure channel, 506–510 encrypting and decrypting application data, 508–509 extracting server TLS certificates, 530–533 inspecting connection information, 508 setting up, 506–507 TLS record structure, 507 Secure Sockets Layer (SSL) protocol, 506–507 SecureString class, 507 security access control lists (SACLs), 145–146 control flags, 144–145, 166, 181 global, 292–293 resource, 288–291 security access tokens administrator users, 122–124 assigning, 133–138 converting/duplicating, 107–108 creating, 131–133 groups, 109–113 impersonation tokens, 104–107, 136–138 integrity levels, 102 primary tokens, 100–104, 133–136 privileges, 113–117 pseudo token handles, 108–109 sandbox tokens, 117–122 security attributes, 130–131, 172 Int64 security attribute type, 260 User Account Control, 124–130 worked examples, 138–141 security account manager (SAM) database, 312, 324–334 accessing through registry, 325–334

Index 565

---

security account manager (continued) pre-Active Directory enterprise network configuration, 342 security account manager (SAM) remote service, 312–318 access rights, 313 alias objects, 318 domain objects, 314 group objects, 317 user objects, 315–316 SECURITY ATTRIBUTES structure, 78–79 security auditing, 281–295 audit policy security, 287–293 security event log, 282–286 worked examples, 287–295 security authority, 147 MandatoryLabel, 112 World, 219 SecurityBuffer class, 500 security buffers, 500 with authentication context, 501–502 with signing and sealing, 502–503 SECURITY database, 324, 334–336 Security Descriptor Definition Language (SDDL) format, 26, 165–173 access strings, 168–169, 172 ACE flag strings, 167 ACL flag strings, 166 conditional expressions, 170–171 converting security descriptors to, 165 mandatory label integrity level SIDs, 172 ObjectType GUIDs used in AD, 169 security attribute SDDL type strings, 172 SID aliases, 166, 547–549 splitting components, 165 type strings mapped to ACE types, 167 SecurityDescriptor objects, 151, 157 security descriptors, 143–220 absolute and relative, 149–151 access control lists, 151–156

assigning during resource creation, 180–205 to existing resources, 205–208 components of, 144–146 converting to and from relative descriptors, 163–164 to SDDL format, 165 creating, 157–158 formatting, 159–163 inheritance behavior, 214–215 ordering ACEs, 158–159 reading, 178–179 SDDL format, 165–173 server security descriptors and compound ACEs, 213–214 SID structure, 146–149 standardization, 362 structure of, 144 Win32 security APIs, 208–213 worked examples, 173–176, 216–219 security event log, 282–286 audit events and event IDs, 282 audit policy subcategories, 284 configuring per-user audit policy, 285–286 system audit policy, 282–285 displaying category GUIDs, 284 setting policy and viewing resulting policy list, 284–285 top-level audit policy categories, 283 security identifiers (SIDs), 26–27, 81, 146–149 administrator users, 124 aliases, 166, 547–549 arbitrary owner, 184 asserted identities, 489–490 assigning tokens, 137 capability, 120–121 capability groups, 121 components of, 146–147 creating tokens, 132–133 device groups, 113 enumerating, 175–176 fixed logon sessions, 102 group, 145 integrity levels, 112

---

logon types, 408–409, 414 lowbox tokens, 120–122 machine, 306 mandatory label integrity level, 172 manually parsing binary, 175–175 owner, 145 process trust level, 231–232 pseudo token handles, 109 querying Administrators group SID, 148 replacing CREATOR OWNER and CREATOR GROUP SIDs, 200 restricted tokens, 117–118 SDDL SID atlas mapping, 547–549 SELF.SID, 249–250, 379–380 token groups, 111–113 tokens, 101 SecurityInformation flags, 178, 205–206 Dacl, 211 Group, 157, 183 Owner, 184 ProtectedDacl, 210–211, 364 ProtectedSac1, 210 UnprotectedDacl, 210–211 UnprotectedSac1, 210 security packages (security support providers), 400–401, 499–533 anonymous sessions, 518–519 authentication audit event log, 524–527 credential manager, 514–517 CredSSP, 510–513 identity tokens, 519–520 Negotiate, 401, 503–505 network authentication with lowbox token, 520–523 Remote Credential Guard, 513 Restricted Admin mode, 513–514 secure channel, 506–510 security buffers, 500–503 worked examples, 527–533

Security Quality of Service (SQoS), 32, 104–107 context tracking mode, 106 effective token mode, 106 impersonation levels, 104–106

SECURITY_QUALITY_OF_SERVICE structure, 104, 107

Security Reference Monitor (SRM), 24–27

access checks, 25 process, 221–263 use cases, 265–280 access tokens, 25 audit events, 26 components of, 25

Local Security Authority Subsystem, 26 prefix, 24 security access tokens, 99–141 security auditing, 281–295 security descriptors, 143–176 security identifiers, 26–27

SECURITY_SOOS_PRESENT flag, 107 SECURITY_SUBJECT_CONTEXT structure, 222, 272 Security Support Provider Interface (SSPI), 424, 440, 476, 500, 518 security support providers. See security packages SeDebugPrivilege privilege, 116, 123 SeDenyBatchLogonRight account right, 311, 402 SeDenyInteractiveLogonRight account right, 311, 402 SeDenyNetworkLogonRight account right, 311, 402 SeDenyRemoteInteractive account right, 402 SeDenyRemoteInteractiveLogonRight logon right, 311 SeDenyServiceLogonRight account right, 311, 402 SeEnableDelegationPrivilege privilege, 381 SeFastTraverseCheck function, 268 SeImpersonatePrivilege privilege, 116, 123 SeInteractiveLogonRight account right, 311, 402 SeIsTokenAssignableIoProcess function, 134 Select-HiddenValue function, 95–96

Index 567

---

SelectObject command, 14-15, 17 Self access right, 366, 378-379 SelfRelative control flag, 149-151 SeLoadDriverPrivilege privilege, 116, 123 SeMachineAccountPrivilege privilege, 380 Send- functions, 448-449 SeNetworkLogonRight account right, 511, 402 sequence numbers, 442 SeRelabelPrivilege privilege, 117, 123, 202, 239 SeRemoteInteractiveLogonRight account right, 311, 402 SeRestorePrivilege privilege, 116, 123, 219 ServerAdmin access right, 319 Server Message Block (SMB), 105, 422, 439-440, 442 ServerSecurity control flag, 213-214 service control manager (SCM), 92-93 Service for User. See constrained delegation Service for User to Proxy (aka S4U2proxy or Kerberosonly delegation), 485-486, 490 Service for User to Self (aka S4U2self or protocol transition delegation), 486-488, 490 Service logon type, 413-414 service principal names (SPNs), 443 authentication cross-domain, 478 with explicit credentials, 522 initial user, 460-462 Kerberos authentication in PowerShell, 466 to known web proxies, 522 network service, 463-464 U2U, 491-493 bypassing proxy check, 523-524 decrypting AP-REQ message, 469-470 delegation, 482, 484, 486, 488-490 SeSecurityPrivilege privilege, 116, 127, 287-288

SeServiceLogonRight account right, 311, 402 Session 0 Isolation feature, 76 Session Manager Subsystem (SMSS), 92 Session objects, 75 SetIakeOwnershipPrivilege privilege, 117, 123, 239 SetAuditRequirements access right, 319 SetCchPrivilege privilege, 116, 123 Set- commands, 44, 49–51, 56, 110, 135, 209–210, 286–288, 469, 486, 489, 539 SetDefaultQuotaLimits access right, 319 SetTimeZonePrivilege privilege, 115–116 SetInformation class, 30, 45 SetMixPolicy access right, 287 SetTrustedCredmanAccessPrivilege privilege, 516–517 Set system call, 42–45, 99 SetSystemPolicy access right, 287 SetUserPolicy access right, 287 SetValue access right, 322 SHA256 algorithm, 121–122 SHA384 algorithm, 508 shatter attacks, 76 $HELLT2 library, 89 Shell APIs, 89–91 shell verbs, 91 Show- commands, 60, 100, 104, 131, 162 ShowWindow parameter, 11–12 Shutdown access right, 313 sibling tokens, 134–135 SID aliases, 166, 548–549 SIDs. See security identifiers SignatureType property, 55 signing and sealing NTLM relay attacks, 440–443 security buffers, 502–503 silver tickets, 465 Simple and Protected Negotiation Mechanism (SPNEGO) protocol, 503–505 SingleHost flag, 429 SkipTokenGroups flag, 389 SMB (Server Message Block), 105, 422, 439–440, 442 SMSS (Session Manager Subsystem), 92

---

software development kit (SDK), 38, 110, 112 Sort-Object command, 18–19 split-token administrator, 124, 126, 128–129, 262 SPNEGO (Simple and Protected Negotiation Mechanism) protocol, 503–505 SPNs. See service principal names QoS. See Security Quality of Service SRM. See Security Reference Monitor SSL (Secure Sockets Layer) protocol, 506–507 SSPI (Security Support Provider Interface), 424, 440, 476, 500, 518 Start-command, 88, 276, 325 static methods, 8 Stream buffer flag, 500 StreamHeader buffer flag, 500, 509 StreamTracker buffer flag, 500, 509 strings ANSI, 79 character escapes, 7–8 double-quoted, 7 interpolation, 7 secure, 307 single-quoted, 7 wide, 79 string type, 5 Structural_category attribute, 354 SuccessfulAccess ACE flag, 156, 168 superions, 367–368 SymbolicLink objects, 28–29 SymbolicLinkTarget property, 28–29 system audit policy, 282–285, 287 system calls common verbs, 30 status codes, 34 Win32 APIs and, 77–80 system processes, 91–93 Local Security Authority Subsystem, 92 service control manager, 92–93 Session Manager Subsystem, 92 Windows logon process, 92 SystemProcessInformation class, 47

## T

TargetInfo flag, 427 TargetTypeDomain flag, 427 TargetTypeServer flag, 427 Task Scheduler service, 93 TGB (trusted computing base), 116 TCP, 446, 532 TcpClient objects, 452 TCP/IP, 47, 342 TcpListener class, 451 Terminal Services, 77 Test-AccessFilter check, 231 Test- commands, 115–116, 138, 189–190, 240–241, 243, 259, 430, 441–442 Test- functions, 230, 393 Test-MandatoryIntegrityLevel check, 231 Test-ProcessTrustLevel check, 231 TGS-REP message. See ticket granting service reply message TGS-REQ message. See ticket granting service request message TGSs. See ticket granting servers TGT-REP (ticket granting ticket reply) message, 491–493 TGT-REQ (ticket granting ticket request) message, 491–492 TGTs. See ticket granting tickets thread affinity, 73 thread IDs (TIDs), 47–48 Thread objects, 27, 48, 203 ticket granting servers (TGSs) cross-domain authentication, 478–479 decryption API-REQ message, 469 delegation, 479–482, 485 initial user authentication, 459–461 Kerberos authentication in PowerShell, 466 network service authentication, 464 ticket granting service reply (TGS-REP) message initial user authentication, 458, 461–462 Kerberos authentication in PowerShell, 466

Index  |  569

---

ticket granting service reply (continued) network service authentication, 464 ticket granting service request (TGS-REQ) message delegation, 479, 481, 485 initial user authentication, 458 Kerberos authentication in PowerShell, 466 network service authentication, 463–464 U2U authentication, 492 ticket granting ticket reply (TGT-REP) message, 491–493 ticket granting ticket request (TGTREQ) message, 491–492 ticket granting tickets (TGTs) delegation, 479–485 initial user authentication, 459–461 network service authentication, 463–464 U2U authentication, 491–493 TIDs (thread IDs), 47–48 TLS protocol. See Transport Layer Security protocol ToCharArray method, 8 token access checks, 227–228, 230, 237–241 owner check, 240–241 privilege check, 238–239 Token buffer flag, 500–502 TokenLinkedToken class, 126, 128 Token objects creating, 407–410 creating new processes with, 412–413 requesting for authenticated users, 430 Token Viewer application, 100–101, 103 Transport Layer Security (TLS) protocol channel binding, 444–445 CredSSP, 511–512 extracting certificates, 530–533 secure channel, 506–510 traversal checks, 266–269 limited checks, 267–269 $eChangeNotifyPrivilege privilege, 267

Traverse access right, 266-269 TrustAdmin access right, 319 trusted computing base (TCB), 116 TrustedForDelegation control flag, 381, 482 TrustedToAuthenticateForDelegation control flag, 381 TrustedToAuthForDelegation flag, 487-489 TrustProtected ACE flag, 156, 168 trust relationships, 303-304, 322, 477-479 TS Service Security Package (TSSSP), 511-512 Type objects, 27 types, 5, 8

## U

U2U (User-to-User) authentication, 491–493 UAC. See User Account Control UIPI (User Interface Privilege Isolation), 76, 129 UMFD (user-mode font driver) process, 92, 405 unconstrained delegation, 480–484 Unicode NTLM flag, 427 UNICODE_STRING structure, 31, 85–86 Universal group scope, 347, 354 Unprotect- commands, 441, 446, 471, 476 Unprotectedacl security information flag, 210–211 Unprotectedacl security information flag, 210 Unprotect- functions, 328–331 Update- commands, 4–5, 427–428 UPNs (user principal names), 345 UseForDenlyOnly attribute, 111–112 USER32library, 70–71 User Account Control (UAC), 93, 124–126, 409 elevation type, 126–129 execution levels, 126 filtering, 416 linked tokens, 126–129

---

querying executable manifest information, 125 UI access, 129, 138–139 virtualization, 129–130 User-Account-Restrictions property set, 374–375 User-Change-Password access right, 377–378 user delegation rights, 381 user desktop creation, 398–399 User-Force-Change-Password access right, 377–378 User Interface Privilege Isolation (UIPI), 76, 129 user-mode access checks, 225 user-mode applications, 64–96 DOS device paths, 83–87 process creation, 87–91 system processes, 91–93 Win32 APIs, 64–70, 77–80 GUI, 70–77 registry paths, 80–82 worked examples, 94–96 user-mode font driver (UMFD) process, 92, 405 user principal names (UPNs), 345 User-to-User (U2U) authentication, 491–493

## v

variables enumerating all, 7 predefined, 6-7 $VerbosePreference global variable, 454 View access right, 320 ViewAuditInformation access right, 319 ViewLocalInformation access right, 319-320 VirtualBox, 537 virtualization, 129-130, 484 VirtualizationEnabled property, 130 Visual Studio, 261, 538 VMS, 292

## W

WarningAction parameter, 276 WebClient class, 522

Where-Object command, 17–19 wide strings, 79 wildcard syntax, 10–11, 15 Win32 APIs, 64–70 loading new libraries, 65–66 searching for DLLs, 68–70 security APIs, 208–213 system calls and, 77–80 viewing imported APIs, 66–67 GUI, 70–77 console sessions, 74–77 kernel resources, 71–73 modules, 70 window messages, 73–74 registry paths, 80–82 handles, 80–81 HKEY_CLASS8_ROOT handle, 90 listing registry contents, 81–82 opening keys, 81 WIN32K driver, 70–71 Win2Path parameter, 81 WIN32Ulibrary, 70–71 window classes, 73 messages, 73–74 objects, 71–73 Windows authentication, 299–340 Active Directory, 341–396 domain authentication, 300–304 interactive authentication, 397–419 local domain configuration, 305–311 network authentication, 299, 421–455 remote LSA services, 311–324 SAM database, 324–334 SECURITY database, 334–336 worked examples, 336–339 Windows domain network, 535–545 configuration, 536 virtual machines, 538–545 Windows Hyper-V, 47, 537–538 Windows Installer service, 93 Windows kernel, 23–61

subsystems and components of, 24–56

Index 57

---

Windows kernel (continued) user-mode applications, 64–96 worked examples, 56–61 Windows operating system , xxxvii PowerShell testing environment setup, 3–21 user-mode applications, 64–96 Windows kernel, 23–56 Windows Subsystem for Linux, 64 WindowStation objects, 71–72 Windows Update service, 4, 93 Winlogon process, 75, 398–399, 408 WinRM protocol, 515 WinSock API, 47 WM_CLOSE message, 73 WM_GETTEXT message, 74 WM_TIMER message, 76 World security authority, 219 WParam parameter, 74 WriteAccount access right, 316, 318 Write- commands, 16, 49–50, 59, 291, 448, 454

WriteDac access right, 36, 205-206, 233, 235, 365

WriteGroupInformation access right, 316

WriteOtherParameters access right, 315

WriteOwner access right, 87, 117, 205, 206, 239

WritePasswordParams access right, 314

WritePreferences access right, 316

WriteProp access right, 366, 370, 372, 375, 378

write-restricted tokens, 119

write-validated access rights, 378-379

## X

X.509 certificates, 342, 505 XML, 20, 528-529

## Z

Zerologon (CVE-2020-1472) security issue, 403 Zw (Nt) prefix, 24, 29-30, 224

---

Windows Security Internals is set in New Baskerville, Futura, Dogma, and TheSamsMono Condensed.

---



---

RESOURCES

Visit https://nostarch.com/windows-security-internals for errata and more information.

More no-nonsense books from

![Figure](figures/WindowsSecurityInternals_page_605_figure_003.png)

NO STARCH PRESS

![Figure](figures/WindowsSecurityInternals_page_605_figure_005.png)

ATTACKING NETWORK PROTOCOLS

A Hacker's Guide to Capture, Analysis, and Exploitation

BY JAMES FORSHAM A Memoir of the Life of Mr James Forsham ISBN 978-1-59292-750-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_009.png)

POWERSHELL FOR SYDADINS

Workflow Automation Made Easy

BY ADAM BERTAM PhD, MHA, RN, PBA, FPMRC 978-0-12-59327-918-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_012.png)

EVADING FOR

The Deblurter is de-fo t o be used for the image deblurring.

B.MATT HAN Consultant, M.B. ISBN 978-1-7185-0354-2

![Figure](figures/WindowsSecurityInternals_page_605_figure_015.png)

HOW TO HACK LIKE A LEGEND

Breaking Windows

B) SPARC FLOW A) SPARC PIPE ISBN 978-1-7185-0150-6

![Figure](figures/WindowsSecurityInternals_page_605_figure_019.png)

PRACTICAL VULNERABILITY MANAGEMENT

A Strategic Approach to Managing Cyber Risk

JIN ANDREW MAGNUSSON 0278-5193/97/98 $20.00

![Figure](figures/WindowsSecurityInternals_page_605_figure_023.png)

PRACTICAL MALWARE ANALYSIS

The Hands-On Guide to Dissecting Malicious Software

BY MICHAL SIKORSKI AND ANDREW HONIG

800 pp., $59.99 ISBN 978-1-59527-290-4

PHONE: 800.420.7240 ok 415.863.9900

EMAIL: SALES@NOSTARCH.COM WEB: WWW.NOSTARCH.COM

---



---

![Figure](figures/WindowsSecurityInternals_page_607_figure_000.png)

Never before has the world relied so heavily on the Internet to stay connected and informed. That makes the Electronic Frontier Foundation's mission—to ensure that technology supports freedom, justice, and innovation for all people— more urgent than ever.

For over 30 years, EFF has fought for tech users through

activism, in the courts, and by developing software to overcome

obstacles to your privacy, security, and free expression. This

dedication empowers all of us through darkness. With your help

we can navigate toward a brighter digital future.

![Figure](figures/WindowsSecurityInternals_page_607_figure_003.png)

LEARN MORE AND JOIN EFF AT EFF.ORG/NO-STARCH-PRESS

---



---



---



---

A Hands-On Exploration of Windows Security

Windows Security Internals is a must-have for anyone needing to understand the Windows operating system's low-level implementations, whether to discover new vulnerabilities or protect against known ones. Developers, devops, and security researchers will all find unparalleled insight into the operating system's key elements and weaknesses, surpassing even Microsoft's official documentation.

Author James Forshaw teaches through meticulously crafted PowerShell examples that can be experimented with and modified, covering everything from basic resource security analysis to advanced techniques like using network authentication. The examples will help you actively test and manipulate system behaviors, learn how Windows secures files and the registry, re-create from scratch how the system grants access to a resource, learn how Windows implements authentication both locally and over a network, and much more.

You'll also explore a wide range of topics, such as:

- * Windows security architecture, including
both the kernel and user-mode applications

* The Windows Security Reference Monitor
(SRM), including access tokens, querying
and setting a resource's security descriptor,
and access checking and auditing
- * Interactive Windows authentication and
credential storage in the Security Account
Manager (SAM) and Active Directory

* Mechanisms of network authentication
protocols, including NTLM and Kerberos
In an era of sophisticated cyberattacks on Windows networks, mastering the operating system's complex security mechanisms is more crucial than ever. Whether you're defending against the latest cyber threats or delving into the intricacies of Windows security architecture, you'll find Windows Security Internals indispensable in your efforts to navigate the complexities of today's cybersecurity landscape.

About the Author

JAMES FORSHAW is a veteran computer security expert on Google's Project Zero team. In his more than 20 years of experience analyzing and exploiting security issues in Microsoft Windows and other products, he has discovered hundreds of publicly disclosed vulnerabilities. Forshaw frequently presents his research in blogs, at global conferences, and through innovative tooling, and his work is widely cited across the industry.

Covers Windows 10 and higher and Windows Server 2016 and higher

![Figure](figures/WindowsSecurityInternals_page_611_figure_010.png)

THE FINEST IN GEE ENTEINARTS™ www.nostarch.com

