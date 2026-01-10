## 11  ACTIVE DIRECTORY

![Figure](figures/WindowsSecurityInternals_page_371_figure_001.png)

The previous chapter described the authentication configuration of a local domain. In this chapter, we'll detail how Active Directory

stores user and group configurations on an enterprise network domain. We'll begin by inspecting the domain configuration, using various PowerShell commands that can enumerate the configured trust relationships, users, and groups. We'll then dig into the structure of Active Directory and how you can access its raw information over the network.

Once you understand how Active Directory is structured, we'll explore how Windows determines who can inspect and modify it. As you'll see, like most Windows platforms, Active Directory uses security descriptors to grant or deny access to the configuration.

---

## A Brief History of Active Directory

Prior to Windows 2000, the user configuration for an enterprise network was stored in a SAM database on the network's domain controller. The domain controller authenticated users with the Netlogon protocol, which relied on the MD4 password hash format. To modify the SAM database, you could use the SAM remote service, as described in the previous chapter. This service allowed an administrator to add or remove users and groups on the domain controller.

As enterprise networks became more complex, the SAM database format proved to be limited. Windows 2000, which overhauled enterprise networking, moved the user configuration to Active Directory and changed the primary authentication protocol from Netlogon to Kerberos.

Active Directory provides several advantages over the SAM database, as it is extensible and can store arbitrary data. For example, an administrator can store additional information with a user's configuration to represent their security clearance, and an application can check this information when granting or denying access to a resource. Active Directory also has fine-grained security, allowing administrators to delegate parts of the configuration to different users more easily than the SAM can.

Active Directory is stored locally on a domain controller, and computers in the network can access it using the Lightweight Directory Access Protocol (LDAP) , which exposes a TCP/IP network connection on port 389. LDAP derives from the more complex Directory Access Protocol (DAP) , which formed part of the X.500 directory service specification. If you're familiar with the X.509 certificate format for exchanging public key information on secure websites, some of the following concepts might seem familiar.

## Exploring an Active Directory Domain with PowerShell

Let's begin our exploration of Active Directory with a high-level look at a domain configuration. Figure 11-1 shows an example forest (of course, your configuration might differ).

---

![Figure](figures/WindowsSecurityInternals_page_373_figure_000.png)

Figure 11-1. An example Windows forest

To explore this forest, we'll run various PowerShell commands that can enumerate its domains, users, groups, and devices. If you'd like to follow along, you can find setup instructions for a similar domain configuration in Appendix A.

## The Remote Server Administration Tools

We can interact with the Active Directory server through PowerShell's ActiveDirectory module, which ships with the optional Remote Server Administration Tools (RSAT) Windows capability. By default, only domain controllers come with RSAT installed, as the commands are designed for managing the directory (which not every client system needs to do).

Therefore, you might need to install RSAT before running the example scripts in this chapter. If you're running a version of Windows older than Windows 10, version 1809, you must download RSAT from the Microsoft website. If you're using a newer version of Windows, you can install RSAT by running the commands in Listing 11-1 from an administrator PowerShell console.

Active Directory   343

---

```bash
PS> $cap_name = Get-WindowsCapability -Online | \
-Object Name -Match 'Rsat.ActiveDirectory.DS-LDS.Tools' |
PS> Add-WindowsCapability -Name $cap_name.Name -Online
```

Listing 11-1: Installing the Remote Server Administration Tools

Note that the examples in this section won't work unless you run the commands on a machine joined to a Windows enterprise network, such as the one described in Appendix A.

## Basic Forest and Domain Information

Let's start by gathering some basic information about the forest and domain we're connected to. You can follow along by executing the commands in


Listing 11-2 on a computer in the root mineral.local domain of the example forest.

```bash
♦ PS> $forest = Get-ADForest
  ♦ PS> $forest.Domains
     mineral.local
     sales.mineral.local
     engineering.mineral.local
  ♦ PS> $forest.GlobalCatalogs
     PRIMARYDC.mineral.local
     SALESDC.sales.mineral.local
     ENGDC.engineers.mineral.local
  ♦ PS> Get-ADDomain | Format-List PDCEmulator, DomainSID, DNSRoot, NetBIOSName
     PDCEmulator : PRIMARYDC.mineral.local
     DomainSID : $-1-$21-1195776225-$522706947-2538775957
     DNSRoot      : mineral.local
     NetBIOSName : MINERAL
  ♦ PS> Get-ADDomainController | Select-Object Name, Domain
     Name        Domain
     ---------        -----------------
     PRIMARYDC.mineral.local
  ♦ PS> Get-ADTrust -Filter * | Select-Object Target, Direction, TrustType
     Target                Direction        TrustType
     ---------            ---------        ---------
     engineering.mineral.local  BiDirectional  Uplevel
     sales.mineral.local       BiDirectional  Uplevel
```

Listing 11-2: Listing some basic information about the forest and domain

We first request information about the current forest using the Get-AO forest command ❶ . The returned object has many properties, but here we focus on two of them. The Domains property returns a list of the Domain Name System (DNS) names for the domains in the forest ❷ . In this example, it matches the forest in Figure 11-1. We also inspect the GlobalCatalogs property, which lists all systems that maintain a copy of the shared global catalog ❸ . We can use these to inspect the forest-level configuration.

344    Chapter 11

---

We then run the Get-ADDomain command, which returns information about the domain to which the current system is connected . Here, we select four properties. The first one, PCCcoulator , is the DNS name of the primary domain controller (PDC) emulator . The PDC, which used to be the main domain controller in the local domain, once acted as the definitive user database. (A backup domain controller served as a secondary database, in case the PDC went down.) With the introduction of Active Directory, it became possible to more evenly distribute the authentication workload without the PDC. However, Windows still gives the PDC emulator preferential treatment: for example, when you change your password, the operating system will always first try to change it on the PDC. The PDC also runs the legacy Netlogon service, for backward compatibility with older versions of Windows.

The next property is the DomainSid. This SID serves as the basis for all other user and group SIDs in the domain. It's equivalent to the machine SID we saw in Chapter 10, but it applies to the entire network. The final two properties are the DNSroot and NetBIOSName. These are the domain's root DNS name and simple domain name, which Windows keeps around for legacy support reasons.

A good example of this legacy support involves the names of users in a domain. Officially, you should refer to users with a fully qualified name, the user principal name (UPN), which takes the form alice@muneml.local . However, in the user interface you use to log in to your computer, you typically won't enter the UPN as your username; instead, you'd enter something like MINERALalice , which we refer to as a down-level logon name .

Next, we list the domain controllers on the domain the system is conected to using the Get-ADDomainController command . We're inspecting a simple domain, so Listing 11-2 contains only a single entry, PRIMARYDC . As we saw earlier, though, the forest contains multiple domains. We can enumerate the configured trust relationships using the Get-ADTrust command . The output reveals all of the trusts to be bidirectional. The third column identifies the type of each domain: Uplevel indicates that the domain is also based on Active Directory, while a value of Downlevel would represent a pre-Windows 2000 domain.

## The Users

Let's now list the user account information stored on the Active Directory server. We can do this with the Get-40User command, as shown in Listing 11-3.

```bash
PS> Get-ADUser -Filter * | Select-Object SamAccountName, Enabled, SID
SamAccountName Enabled SID
--------------------
Administrator      True S-1-5-21-1195776225-527706947-2538775957-500
Guest              False S-1-5-21-1195776225-527706947-2538775957-501
krbtgt            False S-1-5-21-1195776225-527706947-2538775957-502
bob              True S-1-5-21-1195776225-527706947-2538775957-1108
alice              True S-1-5-21-1195776225-527706947-2538775957-1110
```

Listing 11-3: Displaying the Active Directory server's users

Active Directory   345

---

Using Get-Advertiser is like using Get-Localizer, except that you need to specify a filter. In Listing 11-3 we specify * to get all users, but on a real network you'll find filtering important to reduce the output, as the Active Directory server could contain hundreds or thousands of users.

The output shows each user's plain username (in the $NAME@Name column), whether the user is enabled, and their SID. As with the local users, each SID has a common prefix that should match the domain SID from Listing 11-2.

The user's password is stored in a special write-only attribute in the Active Directory server. We can't read this password from outside the domain controller except via backups of the directory or when the directory is replicated between domain controllers.

## The Groups

To list the security groups in the Active Directory server, we can use the Get-ADGroup command (Listing 11-4).

```bash
PS> Get-ADGroup -Filter | * Select-Object SamAccountName, SID, GroupScope
SamAccountName
    SID
----------------------
-----------------
Administrators
    S-1-5-32-544
    DomainLocal
Users
    S-1-5-32-545
    DomainLocal
Guests
    S-1-5-32-546
    DomainLocal
--snip--
Enterprise Admins
    S-1-5-21-1195776225-522706947-2538775957-519
    Universal
Cert Publishers
    S-1-5-21-1195776225-522706947-2538775957-517
    DomainLocal
Domain Admins
    S-1-5-21-1195776225-522706947-2538775957-512
    Global
Domain Users
    S-1-5-21-1195776225-522706947-2538775957-513
    Global
--snip--
```

Listing 11-4: Displaying the Active Directory server's groups

Notice that the output includes both BUILTIN groups, such as Administrators, and domain groups, such as Enterprise Admins. You can easily distinguish these group types based on the domain SID used as the prefix of a group's SID. In this example, the domain SID prefix is $-1-5-21-119576025-522706947-2538775937.

The system uses the BUILTIN groups only when a user authenticates to the domain controller. For example, adding a user to the BUILTIN\


Administrators group would grant that user administrator access to the database on the domain controller, but not on any other machine in the network. On the other hand, the domain groups get added to the user's token when they authenticate, and they can be used for access checks on the local computer.

Domain groups can have three possible scopes. The global group scope is visible to the entire forest. While any domain in the forest can use the group, it contains users or groups in the defining domain only. A global group is equivalent to the group object in the SAM configuration we covered in the previous chapter. By contrast, a local local group is visible only

---

in the defining domain, but it can contain any user or group from any trusted domain. It's equivalent to the alias object in the SAM database.

The Universal group scope combines the global visibility and broad membership of the two other scopes; groups in this scope are visible to the entire forest and can contain any user or group.

To highlight the distinction between the Universal and Global group scopes, let's consider the difference between two groups, Enterprise Admins and Domain Admins. Enterprise Admins includes all the users who can manage a forest. While there should be only one instance of this group, defined in the root domain, you might want to be able to add any user across the forest as a member. Therefore, as you can see in Listing 11-4, it's a Universal group. All domains can use it, and it can contain anyone.

In contrast, Domain Admins contains users who are administrators of a single domain. Other domains might use the group as a resource if it is configured to grant them access, but it restricts its membership to the defining domain. Therefore, it's a global group. If you're managing only a single domain, the differences between these scopes aren't particularly relevant.

The SAM remote service would return DomainLocal groups when you enumerate alias objects and both Universal and global groups when you enumerate group objects. You might find it odd that the service returns Universal groups as group objects; after all, the APIs used to manipulate group object members allow you to specify a member using the domain's relative ID only, preventing you from using the SAM remote service to modify a Universal group if it has any members outside of the domain. In any case, you shouldn't really use the SAM remote service to manage an Active Directory domain.

You can list the members of an Active Directory server group using the Get-AD GroupMember command, as shown in Listing 11-5.

```bash
PS> Get-ADGroupMember -Identity Administrators | Select Name, objectClass
Name
        objectClass
-----
-----------------
Domain Admins
    group
Enterprise Admins group
Administrator
    user
PS> Get-LocalGroupMember -Name Administrators
ObjectClass Name
        PrincipalSource
----------
Group
        MINERAL\Domain Admins
        ActiveDirectory
User
        MINERAL\alice
        ActiveDirectory
User
        GRAPHTE\admin
        Local
User
        GRAPHTE\Administrator
        Local
```

Listing 11-5: Displaying Administrators group members once they've joined the domain

Here, we enumerate the members of the BUILTIN Administrators group on the domain controller. Because this is a BUILTIN group, users receive membership to the group only once they've authenticated to the domain controller.

---

However, when you join a computer to a domain, you can modify the local groups on that computer to include domain groups. For example, when we use Get-LocalGroupMember to list the members of the local BUILTIN\ Administrators group, we see that the Domain Admins group from the domain has been added as a member. This change allows all administrators in the domain to be local administrators on any computer in the domain.

## The Computers

When you join a computer to a domain, an account is created in the domain. These special user accounts grant the computer access to certain domain services before any user has authenticated to the system. The computer account is especially important for configuring the group policy, as well as for authenticating users to the system, as we'll see in Chapter 14 .

You can list the computer accounts on the Active Directory server using the Get-ADcomputer command, shown in Listing 11-6.

```bash
PS> Get-ADComputer -Filter * | Select-Object SamAccountName, Enabled, SID
SamAccountName Enabled SID
--------------------
PRIMARYDCS
True S-1-5-21-1195776225-522706947-2538775957-1000
GRAPIEITES
True S-1-5-21-1195776225-522706947-2538775957-1104
CINNABARS
True S-1-5-21-1195776225-522706947-2538775957-1105
TOPAZS
True S-1-5-21-1195776225-522706947-2538775957-1106
PYRITEAS
True S-1-5-21-1195776225-522706947-2538775957-1109
HEMATITES$
True S-1-5-21-1195776225-522706947-2538775957-1113
```

Listing 11-6: Displaying the computer account SIDs

As this output shows, the computer account names usually have a trailling dollar sign character (£), which makes it easy to differentiate computer accounts from user accounts. We can also see once again that the SIDs use the domain SID as a prefix. (The computers themselves continue to store their own separate machine SIDs in the local SAM database.)

A computer account needs a password to authenticate to the domain, and the domain-joined compute and domain controller automatically manage this password. By default, the computer generates a new complex password every 30 days and changes it on the domain controller. As the computer must change the password without user interaction, it stores the password in an LSA secret object called $MACHINE.ACC.

Listing 11-7 shows how to query a computer's LSA secret using the GetLSAPrivateData command. You'll need to run this command as an administrator. It's similar to the Get-LSAsecct command we saw in the previous chapter, except we don't need to manually open the policy and secret objects.

```bash
PS> Get-LsaPrivateData $SMACHINE.ACC | Out-HexDump -ShowAll
------------- 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  -  0123456789ABCDEF
---------------------------------------------------------------------------------
00000000:  00 00 00 01 5F 3D 25 70 36 00 13 17 41 92 57 5F 50 - ... ]%p6..A,W,P
00000010:  89 EA AA 35 03 00 00 00 00 00 00 00 00 94 B1 CD 81 - ... .5............
```

348    Chapter 11

---

```bash
0000020: 98 86 67 2A 31 17 1B E1 2F 5D 78 48 7B ED 0C 95  - ..g"1.../}x{(...
--snip--
```

Listing 11-7: Querying the $MACHINE_ACC LSA secret

The LSA obfuscates the contents of the secret object, so just reading the value isn't enough to extract the password used for the computer account.

We've performed a high-level exploration of an Active Directory server configuration. Let's now look at how the directory is configured at a low level, so we can understand how it is secured.

## Objects and Distinguished Names

Although we can use the commands in the ActiveDirectory module to access the user configuration, these commands hide the real structure of the Active Directory server, which consists of a hierarchical tree of entries, as shown in Figure 11-2.

![Figure](figures/WindowsSecurityInternals_page_379_figure_006.png)

Figure 11-2: The structure of an Active Directory server

There are a few different types of entries, but the only ones we care about are objects, which store the user configuration. To refer to an object in the tree, we use its distinguished name, which must be unique across the directory. The distinguished name is a sequence of one or more relative distinguished names separated by commas. In the Active Directory server, you're most likely to encounter the following relative distinguished name types:

C The country name

CN The common name

DC The domain component

O The organization name

Active Directory   349

---

OU The organizational unit name

57 The state or province name

For example, at the root of the directory is the domain object ❶ which has the domain name DC-mineral , DC-local . The ❸ relative distinguished name represents a domain component that is part of a DNS name. Taken together, this distinguished name represents the mineral.local DNS name of the domain.

Underneath the root object is a tree of objects that describe the configuration of the domain. I've shown only three of them in Figure 11.2 . Cn refers to a common name, a simple label for the object. The Cn-users object contains the user and group objects for the domain. The other two objects, Cn-Builtin and Cn-Computers , contain group accounts for the BUILTIN domain on the domain controller and the list of computer accounts, respectively.

To refer to the Users object, you would use its full distinguished name, ONusers,DC=minal,DC=local. Each user object could contain further objects, but it's more common for them to contain only a list of attribute values that represent the user's configuration . For example, a user object might contain the userPrincipalName attribute, representing the UPN of the user in the Active Directory server.

Each object can also contain an objectGUID attribute with a GUID that uniquely identifies the object. Although unique, the distinguished name cannot consistently identify an object, as it would change if the object were moved or renamed. The objectGUID attribute stays the same even if the distinguished name changes.

Two separate root objects store administrative information for the domain root. These are the configuration object and the schema object . The information stored in the configuration object matters to Active Directory security, and the schema object defines the directory's structure. We'll discuss both objects in more depth in later sections.

## Enumerating Directory Objects

Default installations of the Active Directory server use well-known distinguished names, configurations, and schema objects. However, an administrator can change these names or add new directories to the database. For that reason, the Active Directory server exposes a special directory entry called the Root Directory System Agent-Specific Entry (RootDSE) that contains high-level configuration for the directory.

Listing 11-8 shows how to access the RootDSE entry for the current domain using the Get-ADRootDSE command.

```bash
PS> Get-ADRootDSE | Format-List | "NamingContext"
configurationNamingContext : CN=Configuration,DC=mineral,DC=local
defaultNamingContext      : DC=mineral,DC=local
rootDomainNamingContext    : DC=mineral,DC=local
schemaNamingContext        : CN=Schema,CN=Configuration,DC=mineral,DC=local
```

Listing 11-8: Inspecting the RootDSE entry for the current domain

350    Chapter 11

---

As properties, we select the distinguished names for the naming contexts, which represent the top-level objects in the directory. Using these naming contexts, we can query objects on the Active Directory server with the

Get-ADObject command (Listing 11-9).

```bash
# PS> $root_dn = (Get-ADRootDSE).defaultNamingContext
# PS> Get-ADObject -SearchBase $root_dn -SearchScope OneLevel -Filter * | \
     Select-Object DistinguishedName, ObjectClass
     DistinguishedName                     ObjectClass
     ----------------------------- -----------------
     CN-Builtin,DC=mineral,DC=local                        builtinDomain
     CN-Computers,DC=mineral,DC=local                       container
     CN-DomainControllers,DC=mineral,DC=local           organizationalUnit
     CN-ForeignSecurityPrincipals,DC=mineral,BC-local  container
     --snip--
# PS> Get-ADObject -Identity "CN-Builtin,$root_dn" | Format-List
     DistinguishedName : CN-Builtin,DC=mineral,DC=local
     Name        : Builtin
     ObjectClass    : builtinDomain
     ObjectGUID      : 87ee263-2496-4a56-9c6e-7b4db2a60bed
# PS> Get-ADObject -Identity "CN=Builtin,$root_dn" -Properties * | Format-List
     CanonicalName    : mineral.local/Builtin
     CN                    : Builtin
     --snip--
```

Listing 11-9: Querying for the Active Directory server's objects

First we get the root domain naming context from the RootDSE ❶ . This naming context represents the distinguished name for the directory's root domain object, which we can use to query for objects.

We then use the Get-AllObject command to query the child objects of the root ❹. The command takes various options to limit the scope of the child objects to return. The first is the SearchBase parameter, which returns only the children of a certain object (in this case, only the default naming context). We've supplied the default value here, which is unnecessary, but the parameter is useful in other cases.

The second option is the SearchScope parameter, which determines how recursive the search should be. We specify OneLevel to search only the immediate children of the search base. Other values include Base, which returns only the search base object, and Subtree, which recursively searches all child objects. The Filter parameter limits the values returned. In this case, we use * to return everything.

The output includes the DistinguishedName and ObjectClass attributes . The ObjectClass attribute represents the name of the schema type, which we'll come back to in "The Schema" on page 353. We can select a specific distinguished name by specifying it as the value of the Identity parameter. The object returned contains a list of the directory object's attributes as PowerShell properties. For example, we can see the objec GUID attribute, which represents the object's unique identifier.

Active Directory      351

---

In this case, the command returns only four values. For performance reasons, it queries for a small set of attributes, as some of the attribute values can be quite large. To query for more attributes, specify the Properties parameter, passing it either a list of attribute names or * to return all attributes.

## Accessing Objects in Other Domains

What if you're on a computer in one domain of the forest and want to access the Active Directory server for another domain? You might attempt to use the distinguished name of the object you're interested in, as in Listing 11-10.

```bash
PS> Get-ADObject -Identity 'CN=Users,DC=sales,DC=mineral,DC=local'
Get-ADObject : 'Cannot find an object with identity: 'CN=Users,DC=sales,
DC=mineral,DC=local' under: 'DC=mineral,DC=local'
```

Listing 11-10: Trying to access another domain's Active Directory

As you can see, trying to access an object in another domain's Active Directory server fails; the command tries to search for a child object with the specified distinguished name and can't find it.

To view the Active Directory server from another domain, you have a couple of options, shown in Listing 11-11.

```bash
PS> $dn = 'CN:Users,DC=sales,DC=mineral,DC=local'
PS> $obj_sales = Get-ADObject -Identity $dn -Server SALES -Properties *
PS> $obj_sales.DistinguishedName
CN=users,DC=sales,DC=mineral,DC-local
PS> $obj_gc = Get-ADObject -Identity $dn -Server :3268 -Properties *
PS> $obj_gc.DistinguishedName
CN=users,DC=sales,DC=mineral,DC-local
PS> $(obj_sales | Get-Member -MemberType Property | Measure-Object).Count
28
PS> $(obj_gc | Get-Member -MemberType Property | Measure-Object).Count
25
```

Listing 11-11. Accessing the Active Directory server's objects in another domain

The first option is to explicitly specify the target domain using Get-AP Object with the Server parameter ❶. This parameter accepts the domain's simple name or DNS name, as well as the hostname of a domain controller within the domain. In this case, we specifySales, and because this domain is part of our forest, the query returns a suitable domain controller.

The second option is to query the global catalog. As Listing 11-2 showed, servers in the domain manage this catalog using data copied from other Active Directory servers. Select the global catalog by specifying the well-known port 3288 as the Server parameter ❹ . In this example, we specify no domain or server name, which selects the global catalog in the current

352    Chapter 11

---

domain by default. If you wanted to, however, you could query the global catalog in another domain by prefixing the port with its name.

One thing to keep in mind is that the global catalog contains merely a subset of the full data in the Active Directory server. If we count the number of properties returned, we see that the object contains 28 properties , whereas the global catalog version of it returns only 25. For certain object classes, the difference in property counts might be even more pronounced.

You might wonder: Why wouldn't you just query the domain directly for Active Directory information? Basically, it's a question of locality. The domain on which you're running the command might live on the other side of the world from the target domain, joined by a high-latency satellite link. Querying the target directly might be slow, expensive, or both. By contrast, the local global catalog might live on a domain controller in the next office, which offers convenience, even if it won't provide the same level of detail.

## The Schema

The Active Directory server's schema describes the classes of object that exist, the attributes those classes might contain, and the relationships between classes. Each object in the directory is assigned to one or more classes, for example, a group is of the class group. You can find an object's class in its objectClass attribute.

Each object class has a corresponding schema type. The schema can organize these types in a hierarchy, as shown in Figure 11 - 3 .

![Figure](figures/WindowsSecurityInternals_page_383_figure_006.png)

Figure 11-3: A schema hierarchy for the group, user, and computer classes

All schema class types derive from a base type, the top class ❶ and each class object's subclass0f attribute specifies the classes from which it derives. For example, the group type ❷ specifies top as its only subclass0f value.

Each class type can also include a list of the attributes that an instance of the class can contain . This list is split into mustContain, for required attributes, and maybeContain, for optional ones. In Figure 11 - 3 , for example, the mustContain attribute has the required groupType attribute, used to indicate

Active Directory     353

---

whether the group is Universal, Global, or DomainLocal. However, the member attribute, which contains the list of members of the group, is optional, as a group could have no members.

A second set of attribute lists, systemMustContain and systemMayContain, hold required and optional attributes that only the Active Directory server can modify; a normal user can't change these.

Not all class schema types are as simple as group. For example, the user class C is a subclass of organizationalPerson, which itself is a subclass of person, which in turn is a subclass of top . Each of these class schema types can contribute required and optional attributes to the final subclass object.

A class can also contain lists of auxiliary classes, defined with the

auxiliaryClass and systemAuxiliaryClass attributes . We can use these classes to add additional attributes to a schema class without making them part of the inheritance hierarchy.

Each class has an objectClassCategory attribute to define how the class can be used. It can be one of the following values:

Structural The class can be used as an object.

Abstract  The class can be used for inheritance only.

Auxiliary The class can be used as an auxiliary only.

An additional type, Class88, represents classes that were defined in the oldest LDAP specifications. Only certain system classes use this type, and new schema classes shouldn't use it.

## Inspecting the Schema

We can inspect the schema using the same tools we would use to inspect user or group objects. An administrator can also modify the schema to add new types and attributes. For example, the Exchange mail server might modify the Active Directory server on which it's installed to add additional email address attributes for user objects.

As the schema is part of the directory, we can inspect it using the

Get-ADObject command, as shown in Listing 11-12.

```bash
© PS> $schema_dn = (Get-ADObjectDSE).schemaNamingContext
© PS> Get-AODObject -SearchBase $schema_dn -SearchScope OneLevel -Filter * |
  Sort-Object Name | Select-Object Name, ObjectClass
     Name                     ObjectClass
     ----                      ---------
    ---                      ---------
© account                class$schema
     Account-Expires        attributeSchema
     Account-Name-History    attributeSchema
  --snip--
© PS> Get-AODObject -SearchBase $schema_dn -Filter {
        ObjectClass =eq "classSchema"
    } -Properties * | Sort-Object Name |
  Format-list Name, {[guid}${_schemaIDGUID}, mayContain,
    mustContain, systemMayContain, systemMustContain, auxiliaryClass,
    systemAuxiliaryClass, SubClassOf
```

---

```bash
# Name        : account
# [guid]$_.schemaIDGUID : 2628a46a-a6ad-4ae0-b854-2b12d9fe6f9e
# mayContain      : {uid, host, ou, o...}
# mustContain      : {}
# systemMayContain   : {}
# systemMustContain  : {}
# auxiliaryClass      : {}
# systemAuxiliaryClass : {}
# SubClassOf       : top
    --snip--
# PS> Get-ADObject -SearchBase $schema_dn -filter {
    LDAPDisplayName -en "uid"
} -Properties * | Format-List adminDescription, [[guid]$_.schemaIDGUID],
    attributeSyntax, OMSyntax, OObjectClass
    adminDescription      : A user ID.
# [guid]$_.schemaIDGUID : 0b0fca0-1e89-429f-901a-1413894d9f59
    attributeSyntax      : 2.5.5.12
    OMSyntax            : 64
    OObjectClass         :
```

Listing 11-12: Enumerating schema objects

We start by querying for all objects under the schema's naming context and displaying them to the shell ❶ . The output shows the name of each schema object and its object class ❷ . We can see two classes, ClassSchema and attributeSchema, which represent the schema types for object classes and attributes, respectively.

Next, we query for the schema objects and attributes again, but this time we use a filter to select only the objects whose ObjectClass attribute is equal to classSchema 0. The Filter property takes a PowerShell-style expression that can filter the returned objects based on the object's attributes. The server evaluates this filter to improve performance, as it won't return objects that don't match the filter.

Note that the filter string isn't a full PowerShell script, even though it uses a similar syntax, so you can't perform complex scripting operations in the filter. The commands in the ActiveDirectory module also support the !DAPFilter parameter, which uses the LDAP specification's somewhat less intuitive filtering syntax. (Technically, even if you use the Filter parameter, PowerShell will convert it to an LDAP filter before sending the query to the LDAP server, as Active Directory doesn't yet execute PowerShell code directly.)

The returned class objects appear in the console, where I've highlighted some of their important attributes. The first is the schemaIDGUID attribute, which represents the unique identifier for the schema type. Microsoft documents most of these schema identifiers, although an administrator can also add their own. The directory stores the schemaIDGUID attribute as an array of bytes, so we convert it to a guid object to view the value more easily.

Note that the schemaIDGUID won't match the objectGUID attribute assigned to the object. The objectGUID should be unique in the directory, but it won't

Active Directory   355

---

necessarily be uniquely global. The schemaIDGUID should have the same value as all instances of the Active Directory server.

The next four attributes represent the lists of attributes the class can contain. In this case, only mayContain, the list of optional class attributes, has any values. Each entry is identified by a name that is unique across the Active Directory server.

These lists are not exhaustive, however; in addition to these, the class could also incorporate attributes from its configured auxiliary classes (although in this example, none are listed ). It will also incorporate any attributes inherited from the parent, which you can find in the SubClassOf attribute . To get the full list of attributes a class could contain, you need to enumerate the entire inheritance chain and all auxiliary classes.

Because it's unique, we can return an attribute's schema type by specifying a particular IDAPIDisplayName attribute value. In this case, we use the first value in the attribute list, uid ❶, and display a few of the schema type's attributes, including a description of the attribute and the schema IDGUID.

## Accessing the Security Attributes

As you just witnessed, manually inspecting the schema is a convoluted process. Still, we need to understand the schema to analyze the security of the directory. For that reason, the TObjectManager module comes with some commands that return the schema's security-specific attributes. Listing 11-13 shows the simplest of these commands, Get-DsSchemaClass.

```bash
PS> Get-DsSchemaClass | Sort-Object Name
Name        SchemaId                               Attributes
----------------- ----------------------------- -----------------
account      2628a46a-a6ad-4ae0-b854-2b12d9fe6f9e 7
aCSPolicy      7561288-5301-11d1-a9c5-0000f80367c1 17
aCSResourcelimits 2e899b04-2834-13d3-91d4-0000ff87a57d4 5
aCSSubnet      77561289-5301-11d1-a9c5-0000f80367c1 26
--snlp--
```

Listing 11-13: Enumerating all schema classes

When we specify no parameters, the command looks up all class type objects from the schema and returns them. The output shows each type's LDAP name and schema identifier, as well as the total number of attributes the type can contain, including all required and system attributes.

### NOTE

Depending on the complexity of the schema and speed of the network, querying for all schema types can take a while. Once the command has downloaded the types, however, it will cache them, so you should receive a rapid response the next time you request them in the same PowerShell session.

Listing 11-14 shows how to inspect the account type using the module's commands.

356     Chapter 11

---

```bash
﻿  ~~~~~~~~~~~~~~~~~~~~~~~~~~
  PS> $cls = Get-DsSchemaClass -Name "account"
  PS> $cls | Format-List
  Name        : account
  CommonName : account
  Description : The account object class is used to define entries...
  SchemaId    : 2628a46a-a6ad-4ae0-b854-2b12d9fe6f9e
  SubClassOf  : top
  Category    : Structural
  Attributes  : {uid, host, ou, o...}
@ PS> $cls.Attributes
  Name        : Required System
  -----        --------- ---------
  uid         :      False   False
  host         :      False   False
  ou         :      False   False
  o          :      False   False
  l          :      False   False
  seeAlso     :      False   False
  description :      False   False
@ PS> $cls.Attributes | Get-DsSchemaAttribute
  Name        : SchemaId                AttributeType
  -----        ---------                ---------
  uid         :    0b0fc20-1e89-429f-901a-1413894d9f5p    String(Unicode)
  host        :    6034df71-f4a8-46cf-ab7c-chd5464b22d    String(Unicode)
  ou         :    bf9679f0-0de6-11d0-a285-00aa003049e2    String(Unicode)
  o          :    bf9679ef-0de6-11d0-a285-00aa003049e2    String(Unicode)
  l          :    bf9679a2-0de6-11d0-a285-00aa003049e2    String(Unicode)
  seeAlso    :    bf967a31-0de6-11d0-a285-00aa003049e2    Object(DS-ON)
  description  b967950-0de6-11d0-a285-00aa003049e2    String(Unicode)
@ PS> Get-DsSchemaClass -Parent $cls -Recurse
  Name SchemasId                     Attributes
  ----- ---------                     ---------
  top    bf967a7b-0de6-11d0-a285-00aa003049e2 125
```

Listing 11-14: Inspecting a single class schema type

You can specify the name of the class using either the LDAP name with the Name parameter or the schema identifier with the SchemaId parameter.

The returned object contains an Attributes property, which holds the list of all attributes for the class ❶. Rather than including separate attribute lists, the command assigns each attribute the Required and System properties to indicate the list from which they were sourced.

To get more information about the attributes, you can pipe them into the Get-CsSchemaAttribute command, which looks up the schema attribute type ❷. This command returns the LDAP name (Name) and schema identifier (SchemaId) properties, as well as a decoded attribute type (AttributeType). We can see, for example, that the uid type is a Unicode string, while the seeAlso type is a string that contains a distinguished name.

---

Finally, you can directly look up the parent class by using the Parent parameter and specifying the existing class object . You can also specify the Recourse parameter to recursively enumerate all parents. In this case, the only parent class is top, but querying a more complex class, such as user, would return several more schema classes.

## Security Descriptors

Almost any time we must secure a resource in Windows, we'll turn to security descriptors and access checking, and with Active Directory it's no different. LDAP supports authentication, and the Active Directory server uses it to create a token that represents the user. It then uses this token to determine what objects and attributes a given user can manipulate. Let's begin by discussing how to query and store security descriptors on the Active Directory server.

### Querying Security Descriptors of Directory Objects

Each directory object is assigned a security descriptor when it's created. The object stores this security descriptor as a byte array in a mandatory attribute named nSecurityDescriptor. As this attribute is defined in the top class, all object classes require it. Listing 11-15 checks the attribute schema class and shows that Required is True.

```bash
PS> (Get-DsSchemaClass top).Attributes |
Where-Object Name -Match nSecurityDescriptor
Name
------------------     Required System
------------------ ---------  -----
nSecurityDescriptor      True    True
```

Listing 11-15: Checking the nTSecurityDescriptor attribute in the top class

NOTE

The lowercase n in the nameInSecurityDescriptor might look odd, but it's correct. While LDAP name lookups are case insensitive, the names themselves are defined using lower camel case.

To read the security descriptor, the user must be granted either Read Control or Access System Security access rights on the object, depending on the parts of the security descriptor they've requested. Listing 11-16 shows two techniques for retrieving the security descriptor of an Active Directory server object.

```bash
PS> $boot_dn = (Get-ADRootDSE).defaultNamingContext
PS> $obj = Get-Identity $boot_dn -Properties "nTSecurityDescriptor"
PS> $obj.nTSecurityDescriptor.Access
ActiveDirectoryRights : ReadProperty
InheritanceType        : None
ObjectType               : 00000000-000-000-000-000-0000000000000000
InheritedObjectType    : 00000000-000-000-000-000-0000000000000000
```

---

```bash
ObjectFlags        : None
  AccessControlType    : Allow
  IdentityReference    : Everyone
  IsInherited        : False
  InheritanceFlags     : None
  PropagationFlags     : None
  --snip--
@ PS> Format-Win32SecurityDescriptor -Name $root_dn -Type Ds
  Path: DC=mineral,DC=local
  Type: DirectoryService
  Control: DaclPresent, DaclAutoInherited
  <Owner>
  - Name : BUILTIN\Administrators
  - Sid   : S-1-5-32-544
  <Group>
  - Name : BUILTIN\Administrators
  - Sid   : S-1-5-32-544
  <DACL> (Auto Inherited)
  - Type : AllowedObject
  - Name : BUILTIN(Pre-Windows 2000 Compatible Access
  - SID   : S-1-5-32-554
  - Mask  : 0x00000010
  - Access: ReadProp
  - Flags : ContainerInherit, InheritOnly
  - ObjectType: 4c164200-20c0-11d0-a768-00aa006e0529
  - InheritedObjectType: 4828cc14-1437-45bc-9b07-ad6f015e5f28
  --snip--
```

Listing 11-16: Accessing the security descriptor for the root object

The first technique queries the object's security descriptor using nfSecurityDescriptor_t. The Get-ADObject command automatically converts the security descriptor to an instance of the .NET ActiveDirectorySecurity class, so we can show its DACL using the Access property.

The second technique uses the Win32 security descriptor commands from the TObjectManager module, specifying the Ds type and the pathname as the distinguished name of the object. In this example, we use the format -win32SecurityDescriptor command to get the security descriptor and immediately format it.

When might you choose to use one technique over the other? The Win32 security descriptor commands are a better option if you have the NtObjectManager module installed, as they don't modify the information retrieved from the security descriptor. For example, you might notice that the first ACE in the DACL returned from each command isn't the same. One belongs to the Everyone user, whereas the other belongs to BUILTIN\ Pre-Windows 2000 Compatible Access.

The difference comes from the fact that the ActiveDirectorySecurity class, which the Get-ADObject command uses to return the security descriptor

Active Directory   359

---

from its attribute, automatically canonicalizes the DACL before allowing the user access to it. The canonicalization process might hide security misconfigurations. The Win32 command doesn't do any canonicalization.

Note that if you access the domain controller via the SAM remote service, you'll really be accessing the Active Directory server's user configuration, not a local SAM database. But if you inspect the security descriptors for the various supported objects, the SAM remote service won't return the Active Directory ones. Instead, the LSA will pick a security descriptor from a predefined set, choosing the one that most closely matches the one in the directory object. This is just for show, though; ultimately, any access checks will occur against the security descriptor stored in the Active Directory server.

## Assigning Security Descriptors to New Directory Objects

When we create a new Active Directory object, we can assign it a security descriptor by providing a byte array for the object's mSecurityDescriptor attribute. Listing 11-17 shows how to set this security descriptor when running PowerShell as a domain administrator. Don't run these commands in a production environment, where modifying Active Directory could have adverse effects.

```bash
#> PS> $d = New-NtSecurityDescriptor -Type DirectoryService
#> PS> Add-NtSecurityDescriptorAce $d -KnownSid BuiltInAdministrators
-Access All
#> PS> $root_dn = (Get-ADRootDSE).defaultNamingContext
#> PS> $obj = New-ADObject -Type "container" -Name "$DDEMO" -Path $root_dn
-OtherAttributes @#nTSecurityDescriptor#$d.TobyTaxer[1]) -PassThru
#> PS> Format-Wing2SecurityDescriptor -Name $obj.DistinguishedName -Type Ds
#> Path: cn=SDUENO.DL=mineral,DC=local
#> Type: DirectoryService
#> Control: DacIPresent, DacIAutoInherited
  <Owner>
    - Name : MINERAL\Domain Admins
    - Sid : S-1-5-21-146569114-2614008856-3334332795-512
  <Group>
    - Name : MINERAL\Domain Admins
    - Sid : S-1-5-21-146569114-2614008856-3334332795-512
  <DACI> (Auto Inherited)
❸ - Type : Allowed
    - Name : BUILTIN\Administrators
    - SID : S-1-5-32-5A4
    - Mask : 0x000FD1FF
    - Access: Full Access
    - Flags : None
  - Type : AllowedObject
    - Name : BUILTIN\Pre-Windows 2000 Compatible Access
    - SID : S-1-5-32-554
```

---

```bash
- Mask : 0x00000010
  - Access: ReadProp
  - Flags : ContainerInherit, InheritOnly, Inherited
  - ObjectType: 4c164200-20c0-11d0-a768-00aa006e0529
  - InheritedObjectType: 4828cc14-1437-45bc-9b07-ad6f015e5f28
  --snip--
```

Listing 11-17: Creating a new Active Directory object with a security descriptor

We first create a security descriptor containing a single ACE that grants the Administrators group full access. ❶ . We then create a new container object called SDEMO using the New-Object command ❷ , specifying the security descriptor using the $Attributes parameter.

Next, we format the new object's security descriptor. As you can see, the ACE we specified is at the top of the DACL $\blacksquare$ , but other ACEs have appeared after the one we specified $\blacksquare$ , as auto-inheritance rules apply to the DACL and SACL of the parent object. (As discussed in Chapter 6, you can specify the \aclProtected and SACLProtected security descriptor control flags to prevent inheritable ACEs from being applied to the object, but we haven't done that here.)

What if we don't specify the security descriptor value when creating the object? In that case, the object will use a default security descriptor, taken from the schema class object's defaultSecurityDescriptor attribute. Listing 11-18 shows how to manually create a new object security descriptor based on this default security descriptor attribute. This is simulating the operations the Active Directory server performs.

```bash
PS> $root_dn = (Get-ADRootDSE).defaultNamingContext
  ♦ PS> $cls = Get-DsSchemaClass -Name "container"
  ♦ PS> $parent = Get-Win32SecurityDescriptor $root_dn -Type Ds
  ♦ PS> $sd = New-NtSecurityDescriptor -Parent $parent -EffectiveToken
  -ObjectType $cls.SchemaId -Creator $cls.DefaultSecurityDescriptor
  -Type DirectoryService -AutoInherit DacAutoInherit, SaclAutoInherit
  -Container
  PS> Format-NtSecurityDescriptor $sd -Summary
  <Owner> : MINERAL\alice
  <Group> : MINERAL\Domain Users
  <DACL> (Auto Inherited)
  MINERAL\Domain Admins: (Allowed)(None)(Full Access)
  NT AUTHORITY\SYSTEM: (Allowed)(None)(Full Access)
  --snip--
  ♦ PS> $std_sd = Edit-NtSecurityDescriptor $sd -Standardize -PassThru
  ♦ PS> Compare-NtSecurityDescriptor $sd_sd $sd -Report
  WARNING: DACL ACE 1 mismatch.
  WARNING: Left : Type Allowed - Flags None - Mask 00020094 - Sid S-1-5-11
  WARNING: Right : Type Allowed - Flags None - Mask 000F01FF - Sid S-1-5-18
  WARNING: DACL ACE 2 mismatch.
  WARNING: Left : Type Allowed - Flags None - Mask 000F01FF - Sid S-1-5-18
  WARNING: Right : Type Allowed - Flags None - Mask 00020094 - Sid S-1-5-11
  False
```

Listing 11-18: Creating a new object security descriptor

Active Directory      361

---

First, we get the container schema class O. By inspecting this class's schema identifier, we can determine which object ACEs were inherited (those with an InheritedObjectType value set) and identify the default security descriptors for the class. We then get the security descriptor from the parent, which is the root domain object O.

Next, we call New-NTSecurityDescriptor, specifying the parent security descriptor, the default security descriptor, and the object type ❸. We also specify the auto-inherit flags, to automatically inherit any DACL or SACL ACEs, and use the Container parameter to identify that the security descriptor will secure a container, which ensures that it will use the correct inheritance rules. Finally, we can format the newly created security descriptor, which has auto-inherited the DACL.

The new security descriptor has the owner and group SIDs you might expect: namely, the user SID and the primary group SID of the Token object on which it is based. However, this won't always be the case. If the creator of the object is a local administrator on the Active Directory server, the server will change the owner and group SIDs to one of the following SIDs:

Domain Admins Set for any object in the default naming context under the domain root

Enterprise Admins Set for any object in the configuration naming context

Schema Admins   Set for any object in the schema naming context

Changing the owner and group SIDs to one of these values ensures that the resources across a forest have appropriate owners. For example, if Enterprise Admins weren't the default owner for configuration objects, an administrator from a different domain in the forest might create an object that an administrator in another domain wouldn't be able to access, even if they were in the correct group.

To create the final security descriptor, we must perform one last step: standardization. Security descriptor standardization is a feature introduced in Windows Server 2003, and it's turned on by default. It ensures that noninherited ACEs always appear in a binary comparison order. This contrasts with the ACL canonicalization process described in Chapter 5, which orders the ACEs based on the ACE type rather than on their binary value. Consequently, two canonical ACLs with the same ACE entries could have different ordering.

We can standardize a security descriptor using the edit-MtSecurity Descriptor command and the Standardize parameter . Note, however, that the standardized ACL form doesn't always match the canonical one. Indeed, if we compare the original canonicalized security descriptor (shown in Listing 11-16) with the standardized one, the Compare-MtSecurity Descriptor command shows two reordered ACEs . In theory this discrepancy could change the result of an access check, but in practice it's unlikely to do so, as Denied ACEs always appear before Allowed ACEs , regardless of the other ACE ordering rules in place.

---

An administrator can disable the standardization feature by setting a flag in the directory's special dshHeuristics attribute. You can query this flag using the Get-dshHeuristics PowerShell command, as shown in Listing 11-19.

```bash
PS> (Get-DsHeuristics).DontStandardizeSDs
False
```

Listing 11-19: Checking whether security descriptor standardization is enabled

If the command returns True, security descriptor standardization is disabled.

## Assigning Security Descriptors to Existing Objects

You can use the Set-#1%32SecurityDescriptor PowerShell command to change an existing object's security descriptor based on the distinguished name of the object. Listing 11-20 demonstrates this for the object CN=SomeObject, DC=mineral, DC=local. Before running the script, change this name to that of an object that exists in your Active Directory configuration.

```bash
PS> $dn = "Cn=SomeObject,DC=mineral,DC=local"
PS> $sd = New-NtSecurityDescriptor "Dn {A;GA};WD"
PS> $Set-Win32SecurityDescriptor $dn -Type Ds -SecurityDescriptor $sd
-SecurityInformation DacI
```

Listing 11-20: Setting an object's security descriptor using the Set-Win32SecurityDescriptor command

The command sends a modification request to the directory server to set the %SecurityDescriptor attribute. As discussed in Chapter 6, the user modifying the security descriptor must be granted the appropriate access rights on the object (such as writeDoc access) for the part of the security descriptor being written.

Security information flags specify which parts of the security descriptor you can modify. To get this information, request the constructed SbRights Effective attribute for the object. The Get-SdSbRightsEffective PowerShell command exposes this attribute, as shown in Listing 11-21.

```bash
PS> Get-DS0RightsEffective -DistinguishedName $dn
Owner, Group, Dac1
```

Listing 11-21: Querying for the effective security information

The output indicates that the current caller would be granted write access to the owner, group, and DACL. This result takes into account privileges such as $TakeOwnershipPrivilege, which allows a caller to modify the owner even if the security descriptor doesn't grant $writeOwner access. The directory also allows a caller to bypass certain checks using privileges; for example, it can check for $eRestorePrivilege to determine whether the caller can set arbitrary owner SIDs.

---

NOTE

To add or remove a DACL-protected flag with the Set-Win32SecurityDescriptor command, you'll need to use the ProtectedDacl or UnprotectedDacl security information flag. These flags aren't passed to the server; instead, they are set in the security descriptor control flags, which are then sent to the server.

In Listing 11-22, we build a new security descriptor for an object, deriving it from three values: the security descriptor supplied by the user, the current security descriptor, and the parent security descriptor.

```bash
PS> $curr_dn = (Get-ADRootIDSE).defaultNamingContext
  PS> $user_dn = "CN-Users,$root_dn"
  ♪ PS> $curr_sd = Get-Win32SecurityDescriptor "CN=Users,$root_dn" -Type Ds
  ♪ PS> Format-NtSecurityDescriptor $curr_sd -Summary
     <Owner> : DOMAIN\Domain Admins
     <Group> : DOMAIN\Domain Admins
     <DACL> (Auto Inherited)
     NT AUTHORITY\SYSTEM: (Allowed)(None)(Full Access)
     --snip--
  ♪ PS> $new_sd = New-NtSecurityDescriptor "D:(A;GA;J;WD)"
  ♪ PS> Edit-NtSecurityDescriptor -SecurityDescriptor $curr_sd
     -NewSecurityDescriptor $new_sd -SecurityInformation DacI
     -Flags DacIAutoInherit, SacIAutoInherit
  PS> $cls = Get-DsObjectSchemaClass $user_dn
  PS> $parent = Get-Win32SecurityDescriptor $root_dn -Type Ds
  ♪ PS> $sd = New-NtSecurityDescriptor -Parent $parent
     -ObjectType $cls.SchemaId -Creator $curr_sd -Container
     -Type DirectoryService -AutoInherit DacAItoInherit, SacIAutoInherit,
     AvoidOwnerCheck, AvoidOwnerRestriction, AvoidPrivilegeCheck
     -EffectiveToken
  ♪ PS> Edit-NtSecurityDescriptor $sd -Standardize
  PS> Format-NtSecurityDescriptor $sd -Summary
     <Owner> : DOMAIN\Domain Admins
     <Group> : DOMAIN\Domain Admins
     <DACL> (Auto Inherited)
     Everyone: (Allowed)(None)(Full Access)
     --snip--
```

Listing 11-22: Creating a new security descriptor for an object

First, we get the current security descriptor for the object. In this case I've picked the users container, as it provides an easy example ❶ , but you can choose any object in the directory. Next, we create a new security descriptor ❷ and use the Edit-NtSecurityDescriptor PowerShell command to modify the object's existing security descriptor, replacing it with the one we just created ❸ . In this command, we must specify the security information flags as well as the auto-inherit flags.

We then use the modified security descriptor as the creator security descriptor, using the parent security descriptor and the target object's class information for inheritance . We specify some additional auto-inherit

364    Chapter 11

---

flags to disable the owner check; this ensures that we set the owner value correctly based on the original security descriptor. Disabling the checks isn't a security issue because the caller must have set the Owner security information flag to change the owner, and Edit-NtSecurityDescriptor would have checked for the owner SID, preventing a user from circumventing the check.

We can now standardize the security descriptor and format it. As you can see, it now contains the Everyone ACE, matching the new security descriptor we specified. At this point, the server will also enumerate any child objects of the security descriptor we're modifying and apply any inheritance changes to the new security descriptor we've introduced.

Note that the server automatically propagates inheritable ACEs to child objects whenever a parent object's security descriptor changes. This behavior contrasts with that of files and registry keys, where it's the responsibility of the Win32 APIs to manually propagate inheritance to children. The automatic propagation introduces an interesting consequence: the server doesn't check that the user setting the security descriptor has appropriate access rights to the child object. Therefore, a user with iterleac access to an object higher in a hierarchy can set a new inheritable ACE and grant themselves access to a child object to which they didn't previously have access.

The only way to mitigate this behavior is by setting the DacProtected control flag in the object's security descriptor to block inheritance (as well as the fact that administrators should never grant writeDac access to nonadministrator users).

## Inspecting a Security Descriptor's Inherited Security

Because the security descriptors are assigned based on the object hierarchy, it's possible to locate the source of their inherited ACEs using the Search -Min32SecurityDescriptor PowerShell command. In Listing 11-23, we find the inherited ACEs for the Users container.

```bash
PS> $root_dn = (Get-ADRootUser).defaultNamingContext
PS> $user_dn = "CN-Users,$root_dn"
PS> $cls = Get-DCObjectSchemaClass -DistinguishedName $user_dn
PS> Search-Win32SecurityDescriptor -Name $user_dn -Type Ds
-ObjectType $cls.SchemaId
Name
-----------------
Access
-----------------
0
0
NT AUTHORITY\SYSTEM
-----------------
0
0
MINERAL\Domain Admins
-----------------
0
0
BUILTIN\Account Operators
-----------------
0
0
BUILTIN\Account Operators
-----------------
0
0
BUILTIN\Print Operators
-----------------
0
0
NT AUTHORITY\Authenticated Users
-----------------
0
0
BUILTIN\Account Operators
-----------------
DC=mineral,DC-local 1
BUILTIN\Pre-Windows 2000...
ReadProp
DC=mineral,DC-local 1
BUILTIN\Pre-Windows 2000...
ReadProp
DC-mineral,DC-local 1
BUILTIN\Pre-Windows 2000...
ReadProp
Listing 11-23: Searching for the source of inherited ACEs
```

Active Directory   365

---

You can use this command with Active Directory objects in almost the same way as you would use it with files. The important difference is that you must set the Type property to 0s to look up Active Directory objects on the server.

You must also specify the schema class GUID for inheritance ACEs using the ObjectType parameter; otherwise, the command might not be able to find the source ACEs at all, as they're likely to be inherited based on the object's type. In my testing, the search sometimes succeeded when I didn't specify the object type, but in most cases, the operation failed with an unrelated error.

## Access Checks

Now that we can query an object's security descriptor, we can perform an access check to determine whether it would grant a user some specific access. Active Directory designates nine type-specific access rights that directory objects can grant, in addition to the standard rights such as ReadContent and WriteAs (used to read and write, respectively, the security descriptor on the object). They are:

<table><tr><td>CreateChild</td><td>Enables creating a new child object</td></tr><tr><td>DeleteChild</td><td>Enables deleting a child object</td></tr><tr><td>List</td><td>Enables listing child objects</td></tr><tr><td>Self</td><td>Enables writing an attribute value (which the server will verify)</td></tr><tr><td>ReadProp</td><td>Enables reading an attribute value</td></tr><tr><td>WriteProp</td><td>Enables writing an attribute value</td></tr><tr><td>DeleteTree</td><td>Enables deleting a tree of objects</td></tr><tr><td>ListObject</td><td>Enables listing a specific object</td></tr><tr><td>ControlAccess</td><td>Grants access to a directory operation</td></tr></table>


Some of these access rights require more explanation than others. In the following sections, we'll walk through the various operations they represent and how they're used to determine what a user can do on the directory server. Note that the behaviors of these access rights also apply to ACEs specified in an object's SACL, meaning you should be able to take the descriptions presented here and apply them to the generation of audit events.

### Creating Objects

If a user is granted the CreateChild access right, they can create a child object for the object. The object's AllowedObject AGEs determine what kinds of child objects a user can create. Listing 11-24 shows how to grant the

CreateChild access right for a specific object type.

366    Chapter 11

---

```bash
PS> $sd = New-NtSecurityDescriptor -Type DirectoryService -Owner "SY"
-Group "SY"
D PS> Add-NtSecurityDescriptorAce $sd -KnownSid World -Type Allowed
-Access List
D PS> user = Get-DsSchemaClass -Name "user"
PS> Add-NtSecurityDescriptorAce $sd -KnownSid World -Type AllowedObject
-Access CreateChild -ObjectType $user.SchemaId
PS> Format-NtSecurityDescriptor $sd -Summary -SecurityInformation Dacl
-ResolvedObjectType
-DACL
Everyone: (Allowed)(None)(list)
Everyone: (AllowedObject)(None)(CreateChild)(OBJ:User)
D PS> Get-NtGrantedAccess $sd -ObjectType $user
CreateChild, List
D PS> $cont = Get-DsSchemaClass -Name "container"
PS> Get-NtGrantedAccess $sd -ObjectType $cont
List
```

Listing 11-24: Testing CreateChild object type access

We first create a new security descriptor and add an ACE that grants everyone list access ❶ . This ACE doesn't specify an object type, so it will apply to every user who matches the SID. Next, we get the user.schema class ❷ and use it to create a second ACE that grants CreateChild access, specifying the schema identifier as the object type.

We display the security descriptor to verify that we've created the correct ACES, passing the ResolvedObject type parameter to Format-MtSecurity Descriptor to return the directory object type's name. If you don't use this parameter, the command will print the GUID instead, which is less useful; however, note that returning these names can be quite time-consuming and might cause the command to hang.

We now request the maximum granted access for the security descriptor , specifying the schema class as the object type to check, and are granted createChild and List access. The directory server will do the same when performing the access check for the child creation operation; it will look up the schema class identifier for the object class being created and pass it to the access check API. If createChild access is granted, the operation will proceed.

Finally, we repeat the access check but instead specify the container class . This time, we're granted only List access—because we didn't pass the user class's identifier in the list of object types to check, the access check ignored the CreateChild ACE.

If an object's security descriptor contains an ACE that grants the CreateChild access right with no object type specified, the user can create any child object. However, limitations still exist. First, the user can only create new objects of structural classes; the server should reject the creation of an object from an abstract or auxiliary class. Second, each schema class has a list of possible parent classes, or superiors , stored in the posSuperiors and

Active Directory      367

---

systemPosSupriors attributes. The server will permit the creation of a child only if the parent object's class is in this list of classes.

Determining all permitted child classes can be quite complex due to the rules of class inheritance. Fortunately, the directory server also constructs the possibleInferors attribute, which lists the classes the directory will allow as children for a given schema class. You can query for these classes using the Get-DSchemaClass PowerShell command with the Inferior parameter, as shown in Listing 11-25.

```bash
PS> Get-DsSchemaClass "user" -Inferior
Name                     SchemaId                     Attributes
----------------------
ms-net-ieee-80211-GroupPolicy 1cb81863-b822-4379-9ea2-5ff7bdc6386d 3
nTFRSSubscriptions               2a132587-9373-11d1-aebc-0000f80367c1 3
classStore                       bf967a84-0de6-11d0-a285-00aa003049e2 4
ms-net-ieee-8023-GroupPolicy 99a03a6a-bb19-4446-9350-0c8b78ed2ddb 3
```

Listing 11-25: Listing inferior classes of the user_schema class

Listing 11-25 shows the four child classes allowed for a user object.


Trying to create an object of a class that isn't in the list of children will result in an error and abort the creation operation. An administrator can change this list by adding the user class to another class's possSuperiors attribute.

## ABUSING CHILD CLASSES

If a user is granted the CreateChild1d access right, there is a risk that they could configure the directory outside of the expected limits. You should assume that granting the ability to create a child means the user can set any attribute in the new object, some of which might inform security decisions made by the server or third-party applications. The user can also create new objects with inferior classes permitted.

When might the ability to create inferior classes lead to problems? As an example, I found a class added to the Active Directory server when the Exchange mail server was installed that normal users could create in existing objects in the directory. This class, in turn, had the container class as an inferior, which could contain security-critical classes such as user or group. Look u CVE-2021-34470 to read the details of this issue.

You can pipe the output of one Get-DischaClass command to another to build the full list of child classes originating from a parent:

```bash
//Copyright (c) 2016-2021, Terraform Corporation
//Licensed under MIT.
//Copyright © 2017-2021, Terraform Corporation
```

This will show what object types you could create if you had Create aMin access. Repeat the pipeline until you stop receiving new classes in the output.

---

## Deleting Objects

Three access rights control deletion: Delete, DeleteChild, and DeleteTree. Each concerns a different delete operation. The Delete access right applies only to the current object; if the object has child objects, the server will refuse to delete the object. (A client application could bypass this restriction by recursively enumerating all children and deleting them if the user had the necessary access.)

If the user is granted DeleteChild access, they can delete any immediate child object, although if that child object has its own children, the same restriction as for Delete applies. The ACE granting DeleteChild access can use the object type to restrict which of an object's classes a user can delete.

Finally, the deleteTree access right allows a user to delete an entire tree of objects, including the root object. This deletion is performed entirely on the server, using a specific tree-deletion command. The user does not need any deletion rights on the child objects if they have this right.

You can remove objects using the Remove-ADObject PowerShell command. To use the DeleteFree access right, you must specify the Recrivate parameter.

## Listing Objects

The list of access rights includes two rights for listing objects, List and

listObject. There are some differences between these. By default, if a user is not granted List access, they cannot inspect any of an object's children. However, this restriction isn't transitive; for example, if a child object grants the List access right, the user can inspect the children of that object, even though they can't list the object itself from the parent. (This means the user will need to know the name of the child object to inspect.)

ListObject access applies not to the parent but to individual objects. If a user has the ListObject access right on an object but doesn't have the List access right on the parent, the user can still list and interact with the object. By default, the Active Directory server doesn't check the ListObject access right, likely for performance reasons.

If the user were not granted List access on an object, but tried to enumerate its children, the server would need to do an access check for every child object to find out which were visible through allowing ListObject access. For directory objects with large numbers of children, this would be a very expensive operation.

You can enable this access right using a flag in the dsHeuristics attribute in the directory. Query the flag using the Get-DsHeuristics PowerShell command:

```bash
PS> (Get-DsHeuristics).DoListObject
```

If the output is True, the ListObject access right is enabled.

Active Directory   369

---

## Reading and Writing Attributes

The ReadProp and WriteProp access rights control the reading and writing, respectively, of attributes in an object. It's possible to allow the reading and writing of all of an object's attributes through an ACE with no object type. More commonly, however, an object will allow the reading of all attributes, but restrict which attributes can be written by specifying an ACE's object type as the attribute's schema identifier.

Listing 11-26 shows an example of how to implement an access check for reading and writing attributes.

```bash
﻿  ♦ PS> $sd = New-NtSecurityDescriptor -Type DirectoryService -Owner "DA"
        -Group "DA"
        ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type Allowed
        -Access ReadProp
  ♦ PS> $attr = Get-DsSchemaAttribute -Name "accountExpires"
        ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access WriteProp -ObjectType $attr.SchemaId
  ♦ PS> Get-NtGrantedAccess $d -ObjectType $attr
                ReadProp, WriteProp
  ♦ PS> $pwd = Get-DsSchemaAttribute -Name "pudLastSet"
        ♦ PS> Get-NtGrantedAccess $sd -ObjectType $pwd
                ReadProp
Listing 11-26: Testing the ReadProp and WriteProp access rights
```

We start by creating a new security descriptor with an Allowed ACE that grants ReadProp access, without specifying an object type . We then add an ACE that grants WriteProp access to only the accountExpires attribute .

Next, we perform an access check specifying that attribute's schema identifier as the object type , and we're granted both ReadProp and WriteProp access. However, if we run the access check with a different attribute type , we're granted only the general ReadProp access.

Note that the security descriptor could contain a Denied ACE to block the reading or writing of a specific attribute, even if a separate ACE enabled reading or writing of all attributes. For instance, if the Denied ACE blocked the reading of the readSet attribute we queried for here, even ReadProp access wouldn't be granted. The directory server must ensure that it specifies the exact object type for the attributes to check.

## NOTE

Even if the access check indicates that an attribute can be read or written, the directory server doesn't have to honor that decision. The directory contains several attributes that a normal user can't read or write. For example, they can't read or write user passwords, which are stored in the unicodepwd attribute that only the system is permitted to access. No amount of configuring the security descriptor should change this behavior (although a separate mechanism allows a user to write the password;

---

we'll come back to this in "Control Access Rights" on page 376). Note also that a normal user can't modify any attribute that is marked as system-only, indicated by the systemOnly attribute in the schema.

## Checking Multiple Attributes

To avoid making you send multiple requests to the directory server, LDAP supports the reading and writing of multiple attributes in a single request. However, it would be expensive to then require an access check for each of these attributes' schema identifiers before determining what you can read or write.

As I described in Chapter 7, the access check process allows you to build a tree of object types to verify multiple attributes in a single check. This tree lists each object type and what access it will be granted, enabling the directory server to quickly determine if it should grant a request. Listing 11-27 shows how to use an object type tree in an access check. It adds to the commands in Listing 11-26.

```bash
♦ PS> $user = Get-DSchemaClass -Name "user"
  PS> $obj_tree = New-ObjectTypeTree $user
  PS> Add-ObjectTypeTree -Tree $obj_tree $attr
  PS> Add-ObjectTypeTree -Tree $obj_tree $pwd
  ♦ PS> Get-NtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult |
  Format-Table Status, SpecificGrantedAccess Name
                          Status SpecificGrantedAccess Name
                          --------------------
  STATUS_SUCCESS        ReadProp user
  STATUS_SUCCESS        ReadProp, WriteProp accountExpires
  STATUS_SUCCESS        ReadProp pwdLastSet
  ♦ PS> Get-NtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult -
  -Access WriteProp | Format-Table Status, SpecificGrantedAccess, Name
                          Status SpecificGrantedAccess Name
                          --------------------
  STATUS_ACCESS_DENIED        None user
  STATUS_SUCCESS        WriteProp accountExpires
  STATUS_ACCESS_DENIED        None pwdLastSet
```

Listing 11-27: Using an object type tree to check multiple attributes

We first get the user schema class ❶ and use it to build the tree, setting the class's schema identifier as the tree's root. We then add the two attributes we want to check, accountExpires and pwdLastSet, as leaf nodes to the root, using the Add-ObjectTypeTree command. Figure 11-4 shows the structure of the final tree.

---

![Figure](figures/WindowsSecurityInternals_page_402_figure_000.png)

Figure 11-4. The object type tree for the user object and its accountExpires and padLastSet attributes

Next, we pass the tree to Get-NotGrantedAccess , making sure to specify that we want the list of all results, not the single granted-access value. The results show that only the accountExpires attribute has been granted ReadProp and WriteProp access, while the user object and pdlastSet attribute have been granted ReadProp access only.

Typically, the Active Directory server will specify an explicit access right to check for, rather than simply requesting the maximum granted access. We can test this by specifying the Access parameter with a value of

WriteProp and checking the resulting behavior ❶. The results show that the user object and its pwdLastSet attribute have been denied access, but that the accountExpires attribute is granted WriteProp access.

The fact that the object's class is specified in the tree leads to an interesting behavior, demonstrated in Listing 11-28.

```bash
PS> Add-MSecurityDescriptorForAce $d -KnownSid World -Type AllowedObject
-Access WriteProp -ObjectType $user.SchemaId
PS> Get-NTGrantedAccess $d -ObjectType $obj_tree -ResultList -PassResult |
Format-Table Status, SpecificGrantedAccess, Name
        Status SpecificGrantedAccess Name
            --------------------- ----
    STATUS_SUCCESS    ReadProp, WriteProp user
    STATUS_SUCCESS    ReadProp, WriteProp accountExpires
    STATUS_SUCCESS    ReadProp, WriteProp pwdLastDest
```

Listing 11-28: Granting WriteProp access to the schema class

As you can see, it's possible to add an ACE that grants access rights for all attributes of a specified object class. Here, we add an ACE grantting WriteProp access and specify the user class's schema identifier. When we repeat our access check, this time we find that WriteProp access is granted for all attributes in the tree.

This behavior, granting access to all attributes, is likely an emergent property of the implementation, not an intentional design decision; the Windows user interface for modifying a directory object's security descriptor can't understand the ACE and shows it as granting no specific access rights. An attacker could use this behavior to hide malicious modifications to the security descriptor from an administrator.

---

## Analyzing Property Sets

As shown in Listing 11-29, an object class can have many attributes—in the case of the user class, a total of 428 if we include the attributes of all its auxiliary classes.

```bash
PS> |Get-CsSchemaClass user -Recurse -IncludeAuxiliary |
Sort-Object SchemaID -Unique |
Select-Object -ExpandProperty(Attributes).Count
428
```

Listing 11-29: Counting attributes for the user schema class

If you wanted to grant specific access rights to all of these attributes, the DACL would quickly become unmanageable; the ACL might even run out of its allowed 64KB of space.

To partially solve this problem, the Active Directory configuration can define arbitrary property sets, which group multiple attributes together under a single GUID. It can then use this identifier as the object type in an ACE to grant or deny access to a group of attributes in one go. Property sets are just one type of extended right, which allow an administrator to add additional access rights to the directory. We'll cover the other two, control access rights and validated write access rights, in the following sections. Listing 11-30 shows how to get all the extended rights in the current directory.

```bash
PS> $config_dn = (Get-ADRootSE).configurationNamingContext
PS> $extended_dn = CN-Extended-Rights-$config_dn"
PS> Get-ADObject -SearchBase $extended_dn -SearchScope OneLevel -Filter *
-Properties * | Group-Object {
    Get-NtAccessMask $.validAccesses -AsSpecificAccess DirectoryService
}  Count Name                Group
------ --------------------------- -----------------
   60 ControlAccess             {CN=Add-GUID,CN=Extended-Rights,..,}
   15 ReadProp, WriteProp      {CN=DNS-Host-Name-Attributes,..}
   6 Self                          {CN=DS-Validated-Write-Computer,..}
```

Listing 11-30: Getting extended rights and grouping them by the validAccesses attribute

An object can specify a particular type of extended right in its valid


Accesses attribute, which stores an integer representing directory object

access rights. We convert the attribute to an access rights enumeration

using the Get-NetAccessMask PowerShell command. If the validAccesses attri bute (and thus the value in the Name column) is set to ReadProp and WriteProp,

the extended right is a property set.

To simplify the analysis of extended rights and property sets, the NutObject


Manager module implements the Get-DSExtendedRight PowerShell command, as


shown in Listing 11-31.

```bash
# PS: $attr = Get-DsSchemaAttribute -Name "accountExpires"
# PS: $prop_set = Get-DsExtendedRight -Attribute $attr
# PS: $prop_set
```

Active Directory      373

---

```bash
Name                RightsId
     ------
@ User-Account-Restrictions 4c164200-20c0-11d0-a768-00aa006e0529
@ PS> $prop_set.AppliesTo | Select-Object Name
    Name
    -----
    msDS-GroupManagedServiceAccount
    inetOrgPerson
    msDS-ManagedServiceAccount
    computer
    user
@ PS> $user = Get-DsSchemaClass user
PS> Get-DsExtendedRight -SchemaClass $user
    Name                     RightsId
    --------------------
    Allowed-To-Authenticate      68b1d179-0d15-44df-ab71-46152e79a7bc
    Email-Information        e45795b2-9455-11d1-aedb-0000f80367c1
    General-Information       59ba2f42-79a2-11b0-9020-00c04fc2d3cf
    --snip--
```

Listing 11-31: Getting the property set for an attribute and its possible schema classes

We first get the accountExpires attribute we used earlier and pass it to the Get-dsExtendAddRight command ❶. If the attribute is part of a property set, the command will return the extended right. Here, the output lists the attribute as part of the User-Account-Restrictions property set ❷.

The RightsId column provides the GUID you'd use in an ACE to allow or deny access to the object type. You can find this GUID in the schema attribute's attributeSecurityGuid attribute. Each property set also has a list of schema classes that are allowed to contain it ❸. This allows the directory server to know what object type tree it needs to build when doing an access check.

Finally, we perform the reverse operation; finding all property sets that apply to a specific schema class, user ❶.

Listing 11-32 demonstrates using a property set in an access check.

```bash
♦ PS> $d = New-NtSecurityDescriptor -Type DirectoryService
    -Owner "$v" -Group "$v"
  ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access ReadProp -ObjectType $prop_set.RightsId
  ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access WriteProp -ObjectType $attr.SchemaId
  ♦ PS> $obj_tree = New-ObjectTree -SchemaObject $user
        $ps -Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $prop_set
  ♦ PS> Get-NtGrantedAccess $d -ObjectType $prop_set -ResultList -PassResult |
      Format-Table SpecificGrantedAccess, Name
      SpecificGrantedAccess Name
        --------------------
            ReadProp user
            ReadProp User-Account-Restrictions
        ReadProp, WriteProp accountExpires
```

---

```bash
ReadProp mDS=AllowedToActOnBehalfOfOtherIdentity
ReadProp mDS=User-Account-Control-Computed
ReadProp mDS=UserPasswordExpiryTimeComputed
ReadProp pwdLastSet
ReadProp userAccountControl
ReadProp userParameters
```

Listing 11-32: Performing an access check with a property set

We build a new security descriptor to do the check ❶, and we grant ReadProp access based on the property set identifier. We also grant WriteProp access to the accountExpires attribute within that set, using the attr variable we defined in Listing 11-31 ❷.

Next, we need to build the object type tree ❸. As before, the root of the tree is the object class. We then add the property set as a child of the tree, producing the object type tree shown in Figure 11 - 5 .

![Figure](figures/WindowsSecurityInternals_page_405_figure_004.png)

Figure 11-5: The property set object type tree

This object type tree contains both the property set at level 1 and entries for each attribute in the set at level 2. This tree structure allows us to grant access based on either the property set identifier or individual attributes.

Note that the directory server implements individual attribute checks a little differently; it always uses property sets if it can, but if an attribute isn't in a property set it uses a dummy GUID, named PROSET_GUID_DEFAULT, as a placeholder. You might see this GUID in audit log entries, although the configuration's extended rights don't specify it.

We pass the object type tree and security descriptor to the access check ❶ , and since we granted the property set ReadProp access, all attributes in the set receive at least this level of access. Because we explicitly granted writeProp access to the accountExpires attribute, it receives this access right as well.

As you can see, if the security descriptor granted writeProp access to every attribute in the set, the access would propagate to the property set node at level 1. Therefore, if the server merely checked the property

Active Directory   375

---

set's granted access, it wouldn't matter if the security descriptor granted the access directly, using the property set's identifier, or instead granted access to every individual attribute in the set.

One last thing to highlight is what happens when we add a Denied ACE for attributes in a property set. Listing 11-33 shows an example.

```bash
♦ PS> $pwd = Get-DSSchemaAttribute -Name "pwdLastSet"
  ♦ PS> Add-MtSecurityDescriptorAce $sd -KnownSid World -Type DeniedObject
     -Access ReadProp -ObjectType $pwd.SchemaId
  ♦ PS> Edit-MtSecurityDescriptor $sd -CanonicalizedDoc
  ♦ PS> Get-MtGrantedAccess $ds -ObjectType $obj_tree -ResultList -PassResult |
    Format-Table SpecificGrantedAccess, Name
    SpecificGrantedAccess Name
                            ~~~~~~~~~~~~~~~~~~~~
                            @None user
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ReadProp, WriteProp accountExpires
                            ReadProp msDS-AllowedToActOrBehalfOfOtherIdentity
                            ReadProp msDS-User-Account-Control-Computed
                            ReadProp msDS-UserPasswordExpiryTimeComputed
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ReadProp userAccountControl
                            ReadProp userParameters
```

Listing 11-33: Denying access to an attribute in a property set

In this listing, we include a Denied ACE for the cmdSet attribute to restrict the ReadProp access right . You must remember to canonicalize the DACL ❸ after adding the ACE; otherwise, it won't appear at the start of the list, and the access check process will ignore it.

When we run the access check, we can see that the Denied ACE has removed ReadProp access from the pdlastSet attribute, then propagated that change to the property set and user class, removing their access as well . All other attributes in the set retain their ReadProp access. This behavior makes sense: if one of the property set's attributes is denied access, then the property set as a whole isn't granted ReadProp access.

If the property set identifier was used for the DeniedObject ACE, all attributes in the set would be denied the ReadProp access right. However, accountExpires would still be granted WriteProp access as it has a separate ACE granting it that access.

An Active Directory server administrator can add their own property sets to the configuration to extend this functionality to commonly used attributes; this reduces the complexity of object security descriptors.

## Inspecting Control Access Rights

The second type of extended right, control access rights, don't necessarily correspond to any object attribute; instead, they tell the Active Directory server whether the user can perform a particular operation. Let's start by listing a subset of the control access rights, as shown in Listing 11-34.

376    Chapter 11

---

```bash
PS> Get-DSExtendedRight | Where-Object {
     $_IsControl=and_5_Name=match "password" }
} | Select-Object Name, RightsId
-------
Name
-----------------
User-Force-Change-Password
00299570-246d-11do-a768-00aa006e0529
Unexpire-Password
ccc1dc7ad-6a6d-4a7a-8846-c04e3cc5301
Update-Password-Not-Required-Bit
280f369c-67c7-438e-098-1da6f3c6f541
User-Change-PasswordId
ab721a53-1e2f-110d-9819-00aa0040529b
```

Listing 11-34: Listing control access rights with password in the name

Using the IsControl property, we filter the output so it includes only control access rights with password in their name. The IsControl property is true if the validAccesses attribute on the extended right is set to ControlAccess.

The results include two commonly used control access rights, User-Change

-Password and User-Force-Change-Password, which allow a user to modify their user object's unicodePad write-only attribute. We can't grant this ability using WriteProp access.

The difference between these two rights is that User-Change-Password requires the user to send their old password as part of the modify operation, while User-Force-Change-Password works without requiring the old pasword. These correspond to the ChangePassword and ForcePasswordChange SAM user access rights we discussed in Chapter 10 and serve the same purpose.

To give an example of how the directory server might check for a control access right, let's assume a user wants to change another user's password. Listing 11-35 shows how the server might implement the access check for permitting the change operation.

```bash
#> PS> $sd = New-MtSecurityDescriptor -Type DirectoryService -Owner "SY"
        -Group "SY"
#> PS> $right = Get-DsExtendedRight -Name 'User-Change-Password'
#> PS> Add-MtSecurityDescriptorAccess $sd -KnownSid World -Type AllowedObject
        -Access ControlAccess -ObjectType $right.RightsId
#> PS> $user = Get-DsSchemaClass user
#> PS> $obj_tree = New-ObjectTypeTree -SchemaObject $user
#> PS> Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $right
#> PS> $force = Get-DsExtendedRight -Name 'User-Force-Change-Password'
#> PS> Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $force
#> PS> Get-MtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult |
Format-Table Status, SpecificGrantedAccess, Name
                        Status SpecificGrantedAccess Name
                        --------------------
    STATUS_ACCESS_DENIED
                None user
    STATUS_SUCCESS      ControlAccess User -Change-Password
    STATUS_ACCESS_DENIED      None User -Force-Change-Password
```

Listing 11-35: Checking for the User-Change-Password control access right

First, we create a new security descriptor, get the control access right, and add an ACE to the security descriptor granting the ControlAccess access right for User-Change-Password ❶ . Next, we query for the user schema class

Active Directory   377

---

and use it to build the object type tree ❸. We need the object class to be the root, but we make the control access right its immediate child. We also query for the User-Force-Change-Password control access right and add it to the tree ❹. If the user is granted this right, the server will allow them to force the password change even if they cannot provide the currently set password.

We then run the access check ❶ and see that the user has been granted

ControlAccess for the User-Change-Password control access right. Now the directory server can proceed with the operation.

As with other types of access, it's possible for a security descriptor to grant ControlAccess either with a non-object ACE or on the object class.

From the access check perspective, ControlAccess is granted to the control access right; the directory server doesn't necessarily know the difference. It's also possible for an administrator to extend the list of control access rights, although that normally requires a third-party application to check for the right, as the directory server won't know about it.

## Analyzing Write-Validated Access Rights

The final type of extended right is write-validated access rights. They're defined when the validAccesses attribute is set to Self. Listing 11-36 shows how to list the write-validated access rights by filtering on the

IsValidateWrite property.

```bash
PS> Get-DSExtendedRight | Where-Object IsValidDate
-------
Name
-------
Validated-MS-DS-Behavior-Version
d31a8757-2447-4545-8081-3bb610acbf2
Self-Membership
fb9679c0-00de-1160-28a5-00aa0304e92
Validated-MS-DS-Additional-DNS-Host-Name
8086791-beb9-468b-837e-f70fad59ac7
Validated-SPN
f34a6788-5306-1d1a-39c5-000f080f67c1
DS-Validated-Write-Computer
9b026da-0d3c-465c-8bee-5199d7165cba
```

Listing 11-36: Listing write-validated access rights

A write-validated access right grants a user the ability to write to certain attributes of an object, with the server verifying the new value for the attribute before it's written. As an example, if a user wants to add a new member to a group object, they will need writeProp access on the member attribute, which contains a list of distinguished names of all users and groups that are members of that group. Being granted writeProp access will allow the user to modify the member list, adding or removing user or group objects. A user without that access right might still be able to add or remove their own user account name, however, if they're granted the Self access right for the Self-Membership write-validated access right on a group object. While this operation would still modify the member attribute, the server would ensure that the added or removed value corresponds to the calling user's distinguished name and reject any other modification.

The name of the access right, Self, is likely derived from its use as a mechanism for self-group membership. Over time, its use has been expanded to cover a few additional attributes. Microsoft's Active Directory

378    Chapter 11

---

Technical Specification (MS-ADTS, available online) refers to it as RIGHT_DS _WRITE_PROPERTY_EXTENDED, which is a slightly better description.

We won't perform an example access check for write-validated access because it's the same as the check shown in Listing 11-35 for control access rights; simply change the extended right you query and check that Self access is granted. As with ControlAccess, it's possible for a non-object ACE to grant Self access without having a specific ACE for the write-validated access right.

Note that an administrator can't modify the list of write-validated access rights; this is because the directory server won't know to enforce the restriction. A third-party application can't implement this behavior, either, as its purpose is to limit the changes that can be made to the directory.

## Accessing the SELF SID

When I discussed the object type access check in Chapter 7, I also mentioned a principal SID that you can specify to replace the SELFSID in an ACE. Active Directory uses the SELFSID to grant access to resources based on whether the user making the request is the "self" in question. It extracts the SID to use as this principal SID from the object's ObjectSID attribute, used to store the SID for the user or computer account, as well as the group SID.

For example, if you want to modify a user object in the directory, the server will look up the object's security descriptor and query for the object's objectSID attribute. If the attribute is present in the object, the access check will use the value as the principal SID, along with the security descriptor. If the attribute isn't present, no principal SID will be set, and any ACE with the SELF.SID won't be evaluated. Listing 11-37 shows how to extract the objectSID attribute.

```bash
PS> $computer = Get-ADComputer -Identity $env:COMPUTERNAME
PS> $computer.SID.ToString()
S=1-5-21-1195776225-522706947-2538775957-1104
PS> Get-CsObjectSid -DistinguishedName $computer.DistinguishedName
Name        $id
----~
MINERAL\GRAPHITE$  S=1-5-21-1195776225-522706947-2538775957-1104
```

Listing 11-37: Getting a computer account's objectsID

There are multiple ways of accessing the attribute. The simplest is to use either the Get-ADComputer, Get-ADUser, or Get-ADGroup command, which will automatically extract the SID. In Listing 11-37, we get the SID for the current computer. Alternatively, if you're using Get-ADObject, you can request the object$ID attribute to access the property directly.

You can also use a command that comes with the NOTeManager module: Get-Doc01@Ccl51d, which requires the full distinguished name of the object to query. The main advantage of this command is that it returns a Sid class you can use in the access check without converting the value into the correct

Active Directory      379

---

format. You can pass the returned SID to Get-NTGrantedAccess in the Principal parameter. We'll use it in the worked example at the end of the chapter.

## Performing Additional Security Checks

In most cases the access check process grants access to the directory based on the security descriptors assigned to objects, but there are several exceptions to this. For example, the directory supports privileges such as SeRestore Privilege and SeTakeOwnershipPrivilege, for changing the components of a security descriptor. Let's discuss a few additional nonstandard checks.

### Adding Workstations to a Domain

In a default domain configuration, the Authenticated Users group is granted a special privilege on the domain controller called SetAccountPrivilege. This privilege allows any domain user to join a computer to a domain, which, at a low level, means creating a computer object.

When a user tries to create a computer object, the directory server checks whether the caller has CreateChild access for the target object. If not, it checks whether they have the SeMachineAccountPrivilege privilege. If they do, it allows the creation operation.

However, in the latter case the server limits the attributes the user can set at creation time. For example, the SeMachineAccountPrivilege privilege doesn't allow a user to set an arbitrary %SecurityDescriptor attribute; the object must use the default security descriptor. The values for attributes the user is allowed to set, like the username, must also match a fixed pattern, and the security descriptor must use the Domain Admin SID as its owner and group SIDs, limiting the user's access to the object after its creation.

An individual user can create only a fixed number of computer accounts. By default, the ns-DS:MachineAccount quota attribute in the root of the directory sets this limit to 10. To enforce this restriction during the creation of a new computer object, the server searches all existing computer objects and checks their ns-DS:CreatorSID attribute, which stores the SID of the user who created the object. The server then calculates the number of computers the caller has already added, and if it's over the quota, it rejects the request. However, if the caller has CreateChild access, the quota doesn't apply. Listing 11-38 shows how to query these values.

```bash
PS> $root_dn = (Get-ADRootDSE).defaultNamingContext
PS> $obj = Get-ADObject $root_dn -Properties 'ms-DS-MachineAccountQuota'
PS> $obj['ms-DS-MachineAccountQuota']
10
PS> Get-ADComputer -Filter * -Properties 'ms-DS-CreatorSID' | ForEach-Object {
   $creator = $_["ms-DS-CreatorSID"]
   if ($creator.Count -gt 0) {
      $sid = Get-NtSid -Sddl $creator[0]
      Write-Host $_.Name, " - ", $sid.Name
    }
}
```

---

```bash
GRAPIHTE - MINERAL\alice
TOPAZ - MINERAL\alice
PYRITE - MINERAL\bob
```

Listing 11-38: Querying the SIDs used to enforce computer account creation quotas

You can create a new computer account using the New-ADComputer command, specifying the required attributes. For example, Listing 11-39 creates the computer account DEMOCOMP with a known password.

```bash
PS> $pwd = ConvertTo-SecureString -String "Password1!!!" -AsPlainText -Force
PS> $name = "DEMCOMP"
PS> $dnsname = "$name $($Get-ADDDomain).DNSRoot"
PS> New-ADComputer -Name $name -SAMAccountName "$name '$' -DNSSHostName $dnsname
-ServicePrincipalNames "HOST$name" -AccountPassword $pwd -Enabled $true
```

Listing 11-39: Creating a new computer account in the domain

You can also create an account using the SAM remote service, as shown in Listing 11-40.

```bash
PS> $amd = Connect-SamServer -ServerName PRIMARYDC
PS> $domain = Get-SamDomain -Server $amd -User
PS> $user = New-SamUser -Domain $domain -Name 'DEMOComp3' -AccountType
Workstation
PS> $pwd = Convert-To-SecureString -String "PassWOrd1!!!" -AsPlainText -Force
PS> $user.SetPassword($pwd, $false)
```

Listing 11-40: Creating a new computer in the domain via the SAM remote service

Servers typically create an account in this way when you join a computer to a domain.

## User Delegation Rights

In a default domain configuration, the Administrators group is granted a special privilege on the domain controller: the SeEnableDelegationPrivilege privilege, which allows users to modify the Kerberos delegation settings. Specifically, it lets them do the following:

- • Set the TrustedForDelegation user account control flag.

• Set the TrustedToAuthenticateForDelegation user account control flag.

• Modify the #SDS-AllowedToDelegateTo attribute of a user or computer

object.
We'll discuss Kerberos delegation and the use of these settings in more detail in Chapter 14.

## Protected Objects

The root domain of the directory shares its domain configuration and schema with the entire forest, meaning changes to a user in other domains will eventually be replicated in the root domain. But allowing a child

Active Directory      381

---

domain to modify the domain configuration or schema is not a good idea, so the server implements a way of protecting objects from being directly modified, deleted, or moved.

Rather than storing this protection as an object attribute or an ACE, the server sets the resource manager control flag in the security descriptor to 1. The technical specification refers to this bit flag as SECURITY_PRIVATE OBJECT. If the object's security descriptor has this flag set and the object is in the schema's or configuration's naming context, then users cannot modify the object unless their owner SID belongs to the same domain as the domain controller on which the modification is being performed.

For example, most objects in the configuration are owned by the Enterprise Admins group, a Universal group defined in the root domain. So, if an object is protected, only a domain controller in the root domain can modify it directly. Listing 11-41 contains a short script that searches for protected objects in the configuration naming context by checking the resource manager control flags. No other Windows feature uses these resource manager control flags, as far as I can tell.

```bash
PS> $conf_nc = (Get-ADRootDSE).configurationNamingContext
PS> Get-ADObject -SearchBase $conf_nc -SearchScope Subtree -Filter * |
ForEachObject {
    $sd = Get-Win32SecurityDescriptor -Name $_.DistinguishedName -Type Ds
   if ($sd.RmControl -eq 1) {
        $_.DistinguishedName
```

Listing 11-41: Finding protected configuration objects

In a default installation of an Active Directory server, Listing 11-41 should output no results, as the directory shouldn't have any protected objects.

This concludes our discussion of access checking, although we'll come back to it in an expansive worked example at the end of the chapter. Next, we'll cover two final Active Directory topics: how user and device claims are stored in the directory, and how group policies are configured.

## Claims and Central Access Policies

In the preceding chapters we discussed user and device claims, how tokens store them as security attributes, and how access checks use them. Claims are especially important for enabling central access policies, as we discussed in Chapter 7 .

The domain's Active Directory server stores both claims and central access policies, and it can apply these whenever a user authenticates or a computer synchronizes its policy. Listing 11-42 shows how to query the Active Directory server for a claim using the Get-ADClaimType PowerShell command, which searches for objects of the schema class nS5-ClaimType.

---

```bash
PS> Get-ADClaimType -Filter {DisplayName =eq "Country"}
Format-list ID, ValueType, SourceAttribute, AppliesToClasses
ID                : ad:///ext/country
ValueType            : String
SourceAttribute      : CN=Text-Country,CN=Schema,CN=Configuration,...
AppliesToClasses    : {CN=User,CN=Schema,CN=Configuration,...}
```

Listing 11-42: Displaying properties of the Country claim

In this example, we find that an administrator configured the Country claim when setting up the domain; it isn't available by default. This claim represents the name of the user's country.

We show only a few of the relevant properties of the object. The first is the claim's ID, used for the security attribute in the token; in this case, it's ad://ext/country . We also show the value's type, used to determine what security attribute values to add to the token; in this case, it's a string.

The next property is the distinguished name of the schema attribute from which the value is derived. (It's possible for a claim to be derived from other data, such as values on a user's smart card, but sourcing the claim from a schema attribute is the simplest case.) When the user is authenticated, the token will construct the claim based on the attribute value from their user object; if the attribute isn't set, the claim won't be added to the token. An administrator can modify the directory schema to add new attributes from which to derive their own claims, such as a user's security clearance.

Finally, we display the list of schema classes to which this claim applies.


In this case, only the user schema class appears in the listing. If this list contained the distinguished name of the computer class, it would be a device claim, not a user claim, although claims can apply to both users and computers.

Listing 11-43 shows how to display the properties of a central access policy in the directory.

```bash
PS >$policy = Get-ADCentralAccessPolicy -Identity "Secure Room Policy"
PS >$policy | Format-List PolicyID, Members
PolicyID : $1~17-3260955821-1180564752-55083341-1617862776
Members : {CN=Secure Rule,CN=Central Access Rules,CN=Claims...}
PS >$policy.Members | ForEach-Object {Get-ADCentralAccessRule -Identity $_ }
Format-List Name, ResourceCondition, CurrentAcl
Name
   : : Secure Rule
ResourceCondition : ($BRESOURCE_Enable==1 :|
CurrentAcl
: D:\XA;F;A;W\:(@USER.ad:/ext/clearance...
```

Listing 11-43: Displaying properties of a central access policy

Administrators deploy central access policies to a domain's computers and servers based on the group policy configuration. This allows them to selectively deploy a policy to a specific subset of systems in the domain. The policy's configuration is stored in the directory, however.

Active Directory   383

---

The policy consists of two components: the policy object itself, represented by the msAuthz-CentralAccessPolicy schema class, and one or more central access rules, represented by the msAuthz-CentralAccessRule schema class.

In Listing 11-43, we first query for a specific central access policy named Secure Room Policy using the Get-AzCentralAccessPolicy PowerShell command. From the policy we can extract the policy SID, which we use to apply the policy to a resource, as well as a list of the distinguished names of each member rule.

NOTE

The Get-ADCentralAccessPolicy command differs from the Get-CentralAccessPolicy command I demonstrated in Chapter 7. The former reads all policies from the Active Directory server, whereas the latter shows only the policies configured to be enabled on the local system.

We then use the Get-4DCentralAccessRule command to get each of the policy rules. In this example, there is only one rule. We display its name, the resource condition used to determine when the rule is enabled, and the DACL, which determines the level of access a user will be granted on the resource for which the rule is applied. Refer to Chapters 5 and 7 for more information about the implementation of central access policies.

## Group Policies

On a stand-alone system, the local policy combines information from the LSA policy's configuration with various registry settings that define what applications can do. In a domain network, an administrator can configure a policy for the entire network using group policies . Domain-joined computers download these policies on a regular basis (generally, every 90 minutes by default). Computers then merge these group policies with any existing local policy settings to define the computer's overall policy.

Figure 11-6 shows how a domain network configures group policies.

![Figure](figures/WindowsSecurityInternals_page_414_figure_008.png)

Figure 11-6: The configuration of group policies

384    Chapter 11

---

The root domain and any organizational unit object can contain the gpLink attribute. An organizational unit is a directory container that represents some structure in an organization. For example, an administrator could create different organizational units for different offices, then apply different policies for computers within those organizational units.

The getLink attribute contains a list of the domain names belonging to the group policy objects applied to the organizational unit. The group policy objects themselves don't contain the actual policy settings. Instead, the object contains a @Gfc1e2sysPath attribute that represents a filepath to a policy configuration file, which contains the settings. This filepath typically points to a special network file share, SYSVOL, which contains the configuration files.

What policies to apply depends on where the computer's account object is stored in the directory. For example, in Figure 11 - 6 , the administrator has created the Servers organizational unit, then added the CINNABAR server account to that container. The organizational unit has the gLink attribute, which links to the Servers Group Policy object.

However, the organizational unit also lives in the root domain, which has its own gpl.ink attribute and assigned policy. When the CINNABAR server updates its group policy, it will discover all of these linked group policies in the parent directory hierarchy and use that information to download and apply the policies. The most specific policy takes precedence; for example, for CINNABAR , the Servers Group Policy would override conflicting settings in the Default Group Policy. The server will merge any settings that don't conflict when creating the final policy.

In Listing 11-44, we query for group policy objects on the Active Directory server.

```bash
♦ PS> Get-ADOrganizationalUnit -Filter * -Properties gpLink |
     Format-List Name, LinkedGroupPolicyObjects
     Name                : Domain Controllers
     LinkedGroupPolicyObjects : {CN={6AC1786C-016F-11D2-945F-00C04fB984F9},...}
  ♦ PS> $policy = Get-ADObject -Filter *
     ObjectClass -eq "groupPolicyContainer"
   } -Properties *
  PS> $policy | Format-List displayName, gPCFileSysPath
     displayName   : Default Domain Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{31B2F340-...}
     displayName   : Default Domain Controllers Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{6AC1786C-...}
     displayName   : Default Servers Domain Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{6B10BF70-...}
  ♦ PS> $is $policy[0].gPCFileSysPath
     Directory: \\mineral.local\sysvol\mineral.local\Policies{31B2F340-0160-...}
     Mode                LastWriteTime            Length Name
     ----                 ---------          ---------
     ----                 3/12/2023  12:56 PM              Adm
```

---

```bash
d----     3/12/2023   1:02 PM        MACHINE
  d----     4/6/2023   8:18 PM      USER
  -a----     4/6/2023   8:24 PM       22 GPT.INI
⊙ PS> $dc_policy = $policy | \
  Where-Object DisplayName -eq "Default Domain Controllers Policy"
  PS> $dc_path = $dc_policy.gCkFilePath
  PS> Get-Content "$dc_path\MACHINE\Microsoft\Windows NT\SecEdit\OptTmpl.inf" |
  Select-String "SeEnableDelegationPrivilege", "SeMachineAccountPrivilege"
⊙ SeMachineAccountPrivilege = "S-1-5-11"
  SeEnableDelegationPrivilege = "S-1-5-32-544"
```

Listing 11-44: Finding group policy objects

First, we query for organizational unit objects in the directory using the Get-ADOrganizationalUnit command and request the get-link attribute ❶ . We display the name and the list of group policy objects for each organizational unit.

We could now take the group policy object's distinguished names from the gLink attribute and manually look up each one. Instead, let's simply search for all objects of class groupPolicyContainer using the Get-AObject


PowerShell command . This shows us the name of each policy object, as well as the path to the real policy store on the SYSVOL file server.

We can also list the contents of the policy directory on the file server ❸. Depending on how complex the policy is, the file share might contain many different files. A group policy can apply to a particular machine, as well as on a per-user basis, which is why there are separate MACHINE and USER directories.

We won't discuss the configuration of group policies any further, but I recommend inspecting the files contained in the file share during your security research. Group policies can contain a wealth of information related to the configuration of computers and users in the domain. Sometimes this policy configuration includes shared passwords for user accounts or private key material. Because any user on the network can access the SIVVOL share, an attacker could extract this information to gain additional privileges on the network.

As a minor example of information leakage, you could determine which SIDs would be granted the two special privileges, SetMachineAccountPrivilege and EnableDelegationPrivilege, on a domain controller. The group policy assigned to the domain controller typically stores this privilege assignment information in the GpiTpl.inf file, which any user in the domain can access. (The LSA domain policy remote service discussed in Chapter 10 can also provide this information, but it requires administrator privileges.)

In Listing 11-44, we retrieve the Default Domain Controllers Policy ❶ , the only policy applied in our simple environment. We then extract the privileges from the file using a simple string selection. In this example, we find the default configuration: Authenticated Users is granted SetMachineAccountPrivilege , and BUILTIN Administrators is granted SetEnableDelegation Privilege ❷ .

386    Chapter 11

---

## Worked Example

In this chapter's single worked example, we'll walk through a script that checks a user's access to every object we can find in the local Active Directory server. This process is quite involved, so I've broken it into multiple sections.

### Building the Authorization Context

Throughout this chapter, we've been using the Get-NTGrantedAccess command to run the access check for a security descriptor. This command is fine for testing purposes, but it causes a subtle problem when used to check real-world security descriptors in the Active Directory server.

The command uses the \tAccessCheck system call, which uses a Token object to represent the user's identity. However, the token's group membership is based on the local system's LSA user configuration, and the domain controller is unlikely to use the same groups. For example, many security descriptors in the directory grant full access to the BUILTIN\Administrators group, but these local administrators won't necessarily also be administrators on the domain controller.

We need a way of running an access check using the groups from the domain controller. One option is to run the access check on the domain controller itself. However, that only works if we have full control over the network, which is best avoided. A second option would be to manually create a token with the necessary groups, but this would still require elevated local privileges. Finally, we could use our own implementation of the access check, such as the one we built in Chapter 7, but this risks introducing incorrect behavior.

We do have another option: Windows provides the Auth2 (authorization) API, which has a function called Auth2AccessCheck that we can use to perform an access check based on a constructed authorization context rather than a token. This API runs entirely in user mode, and the authorization context for a user can contain any groups the caller likes. If you don't want to enable auditing, the APIs also work without any elevated privileges.

A big advantage of using the Auth2 API over a custom access check implementation is that it shares code with the kernel's own access check implementation, and therefore, it should be correct. As a bonus, it's also the same API used by the Active Directory server to perform access checks, so its results should match the server's when given the correct authorization context.

We can build an authorization context for a domain user based only on information that we can extract from the domain without administrator privileges. Listing 11-45 shows how to build the authorization context.

```bash
♦ PS> function Add-Member($Set, $MemberOf) {
        foreach($name in $MemberOf) {
            if ($Set.Add($memberOf)
                $Set.Group=ADGROUP $name -Properties MemberOf
                Add-Member $Set $group:MemberOf
```

Active Directory   387

---

```bash
}
        }
    }
@ PS> function Get-UserGroupMembership($User) {
        $groups = [System.Collections.Generic.HashSet[string]]::new{
            [System.StringComparer]::OrdinalIgnoreCase
        }
    @ Add-Member $groups $User.PrimaryGroup
        Add-Member $groups $User.MemberOf
    @ $auth_users = Get-ADObject -Filter {
            ObjectClass -eq "foreignSecurityPrincipal" -and Name -eq "5-1-5-11"
        }-Properties memberOf
        Add-Member $groups $auth_users.MemberOf
    @ $groups | ForEach-Object { Get-DoObjectSid $_ }
        }
@ PS> function Get-AuthContext($username) {
   @ $user = Get-ADUser -Identity $username -Properties memberOf, primaryGroup
  -ErrorAction Continue
      if ($null -eq $user) {
        $user = Get-ADComputer -Identity $username -Properties memberOf,
  primaryGroup
      }
      $sids = Get-UserGroupMembership $user
    @ $rm = New-AuthZResourceManager
    @ $ctx = New-AuthZContext -ResourceManager $rm -Sid $user.SID.Value
    -Flags SkipTokenGroups
    @ Add-AuthZsid $ctx -KnownSid World
        Add-AuthZsid $ctx -KnownSid AuthenticatedUsers
        Add-AuthZsid $ctx -Sid $sids
        $rm.Dispose()
        $ctx
    }
@ PS> $ctx = Get-AuthContext "alice"
@ PS> $ctx.Groups
    Name                        Attributes
    ----                        ---------
    Everyone                       Enabled
  NT AUTHORITY\Authenticated Users        Enabled
  MINERAL\Domain Users            Enabled
  BUILTIN\Users                     Enabled
  BUILTIN\Pre-Windows 2000 Compatible Access  Enabled
```

Listing 11-45: Building an authorization context for the access check

In the directory, user and group objects have a member attribute that lists the distinguished names of the group objects that the user or group is a member of. We can use this list to recursively inspect the directory to find all groups. This is what the Add-Member function is doing.

388    Chapter 11

---

We then define a function to get a list of member SIDs from a user object ❸ . We need to add the root groups, which include the user's primary group ❹ and groups referenced by the memberOf attribute. We also need to add groups from SIDs that are outside the domain. These are stored as foreign security principals. In the example, we find the entry for Authenticated Users , a group that all users are a member of, and add its group memberships ❸ . We now have a list of distinguished names for group objects, which we convert to a list of SIDs that we can add to the authorization context ❹ .

Next, we build the authorization context itself. We start by querying for the user object ❶ , if that fails, we check for a computer object and get the list of SIDs the account is a member of. Then we create an AuthZ resource manager ❷ , which (as its name suggests) is used to manage resources. For example, we can use it to cache access checks between contexts.

We create the authorization context using the New-Author2Context command . We need to specify the SkipTokensGroup flag when creating the context so that only the user's SID gets added to it. Otherwise, the context will contain the list of local groups, which defeats the purpose of gathering the groups on the domain controller.

We then use the Add-Auth251d command to add the group SIDs to the context ❾, making sure to include the default World and Authenticated Users groups. Finally, we test the behavior of the functions for the user alice ❸, printing out the list of domain groups the user is a member of on the domain controller.

## THE REMOTE ACCESS CHECK PROTOCOL

The Auth2 API supports another mechanism for running an access check with the correct group list, but without running code directly on the domain controller. Computers on a domain, including the domain controller, expose a remote access check network protocol that you can connect to when creating the resource manager.

Normal users on the domain won't be able to call the protocol, which requires the calling user to be a member of either the BUILTIN\Administrators or BUILTIN\Access Control Assistance Operators group on the domain controller, making it somewhat less useful. However, you might be a member of one of these groups without even realizing it, so it's worth trying to connect to the service and perform an access check. The following commands create an authorization context with a connection to the PRIMARYDC domain controller:

```bash
PS> $m = New-Auth2ResourceManager -Server PRIMARYDC.mineral.local
PS> $ctx = New-AuthContext -ResourceManager $m -Sid (Get-NtSid)
PS> $ctx.User
------ Attributes
------ --------------------
    MINERAL\alice None
```

(continued)

Active Directory   389

---

```bash
~~~~~~~~~~~~~~~~~~~~~~~~~
  P5> $ctx.Groups
     Name                     Attributes
     ----                          -----------------
     MINERAL\Domain Users         Mandatory, EnabledByDefault, Enabled
     Everyone                   Mandatory, EnabledByDefault, Enabled
     BUILTIN\Access Control Assistance... Mandatory, EnabledByDefault, Enabled
     ----$nlp--
```

These commands could replace the entirety of Listing 11-45. To use the remote access check protocol, we specify the DNS name of the domain controller using the Server parameter of the New-Auth2ResourceManager command. We then create the Auth2 context with the SID of the user. We don't need to specify any flags, as the service will base the group list on the server running the remote access check protocol (in this case, the domain controller). We can verify the assigned user and groups to confirm that their values are based on the domain controller's local group assignment.

## Gathering Object Information

With the authorization context in hand, we can begin the access check.


We'll use the Get-Auth2GrantedAccess command, which works almost the same as Get-NetGrantedAccess but relies on the context we've created. We'll start by gathering information about the object we want to check. We need the following details:

- • The security descriptor of the object
• The object SID, if present, for the principal SID
• All schema classes, including auxiliary and child classes
• Allowed schema attributes and associated property sets
• Applicable control and write-validated access rights
Listing 11-46 implements the Get-ObjectInformation function, which gathers this information about an object based on its distinguished name.

```bash
PS> function Get-ObjectInformation($Name) {
    $schema_class = Get-DsObjectSchemaClass $Name
    $sid = Get-DsObjectSid $Name
    $all_classes = Get-DsSchemaClass $schema_class.Name -Recurse
    -IncludeAuxiliary
    $attrs = $all_classes.Attributes | Get-DsSchemaAttribute |
Sort Name -Unique
    $infs = Get-DsSchemaClass $schema_class.Name -Inferior
    $rights = $all_classes | ForEach-Object {Get-DsExtendedRight
-SchemaClass $_} |
Sort Name -Unique
    [PCustomObject]0{
        Name=$Name
        SecurityDescriptor=Get-Win32SecurityDescriptor -Name $Name -Type Ds
```

---

```bash
SchemaClass=Get-DsObjectSchemaClass $Name
        Principal=$Sid
        Attributes=$Attrs
        Inferiors=$Infs
        PropertySets=$Rights | Where-Object IsPropertySet
        ControlRight=$Rights | Where-Object IsControl
        ValidatedWrite=$Rights | Where-Object IsValidatedWritet
    }
    }
```

Listing 11-46: Implementing the Get-ObjectInformation function

We can test the function by passing it the distinguished name of the object for which we want the information, as shown in Listing 11-47.

```bash
PS> $dn_root = (Get-ADRootDSE).defaultNamingContext
PS> Get-ObjectInformation $dn_root
Name:        DC=mineral_DC=local
SchemaClass :    domainDNS
Principal      : $-1-5-21-146569114-2614008856-3334332795
Attributes      : {admiDescription, admiDisplayName...}
Inferiors       : {device, samServer, ipNetwork, organizationalUnit...}
PropertySets      : {Domain=Other-Parameters, Domain=Password}
ControlRight      : {Add-GUID, Change-PDC, Create-Inbound-Forest-Trust...}
ValidatedWrite
SecurityDescriptor : O:BAG:BAD:AI(OA;CIO;RP;4c164200-2000-11d0-...
```

Listing 11-47: Gathering object information

In this example, we request the information for the root domain object.


You could cache most of the returned information about the schema class, as only the security descriptor and object SID typically change between objects. However, for simplicity, we'll gather the information for every request.

## Running the Access Check

We now have everything we need to perform a maximum access check for an object. However, it's not as simple as passing the security descriptor and the authorization context to the Auth2 access check API and calling it a day. We must separately handle each type of resource (such as classes, attributes, control access rights, and write-validated access rights) to make sure we capture the maximum allowed access.

Listing 11-48 contains the functions to run the access check process. For simplicity, we'll focus on capturing access rights that could result in a modification of the object. However, you could easily modify the functions to capture read access, as well.

```bash
# PS> function Test-Access($ctx, $obj, $objectTree, $access) {
        Get-AuthorizedAccess -Context $ctx -ObjectType $objectTree -
            -SecurityDescriptor $obj.SecurityDescriptor -Principal $obj.Principal -
            -Access $access | Where-Object IsSuccess
```

---

```bash
PS> function Get-PropertyObjectTree($Obj) {
    $obj_tree = New-ObjectTypeTree $Obj.SchemaClass
  @ foreach($prop_set in $Obj.PropertiesSet) {
        Add-ObjectTypeTree $obj_tree $prop_set
    }
  }$fake_set = Add-ObjectTypeTree $obj_tree -PassThru
-ObjectType "771727b1-31b8-4cdf-ae62-4f69fadf89e"
    foreach($attr in $Obj.Attributes) {
        if (-not $attr.IsPropertySet) {
            Add-ObjectTypeTree $fake_set $attr
    }
    }$obj_tree
}
PS> function Get-AccessCheckResult($ctx, $Name) {
  try {
    $obj = Get-ObjectInformation $Name
    $access = Test-Access $ctx $Obj .$Obj.SchemaClass "MaximumAllowed" |
      Select-Object -ExpandProperty SpecificGrantedAccess
    @ $obj_tree = Get-PropertyObjectTree $Obj
     $write_attr = Test-Access $ctx $Obj .$Obj_tree "WriteProp" |
      $write_sets = $write_attr | Where-Object Level -eq 1 |
Select-Object -ExpandProperty Name
     $write_attr = $write_attr | Where-Object Level -eq 2 |
Select-Object -ExpandProperty Name
    @ $obj_tree = New-ObjectTypeTree
-ObjectType "771727b1-31b8-4cdf-ae62-4f69fadf89e"
    $Obj.Inferors | Add-ObjectTypeTree -Tree $Obj_tree
      $create_child = Test-Access $ctx $Obj $obj_tree "CreateChild" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
      $delete_child = Test-Access $ctx $Obj $obj_tree "DeleteChild" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    @ $control = if ($Obj.ControlRight.Count -gt 0) {
        $obj_tree = New-ObjectTypeTree -SchemaObject $Obj .$SchemaClass
        $obj.ControlRight | Add-ObjectTypeTree $Obj.tree
        Test-Access $ctx $Obj $Obj_tree "ControlAccess" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    }
    @ $write_valid = if ($Obj.ValidatedWrite.Count -gt 0) {
        $obj_tree = New-ObjectTypeTree -SchemaObject $Obj .$SchemaClass
        $obj.ValidatedWrite | Add-ObjectTypeTree $Obj.tree
        Test-Access $ctx $Obj $obj_tree "Self" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    }
    @ [PSCustomObject]@{
        Name=$Obj.Name
```

---

```bash
Access=success
        WriteAttributes=$write_attr
        WritePropertySets=$write_sets
        CreateChild#$create_child
        DeleteChild=$delete_child
        Control=$control
        WriteValidated=$write_valid
    }  catch {
        Write-Error "Error testing $Name - $."
    }
    }
```

Listing 11-48: Running the object access check

We start by defining a few helper functions. The first, Test-Access, runs the access check based on the authorization context, the security descriptor, the object type tree, and a desired access mask . The access check returns a list of results for each checked object type. We're interested only in the ones that succeeded, granting some access.

The next helper, SetPropertyObjectTree, builds the object type tree used for checking property sets and attributes. The root of the tree is the object's schema class identifier. From there, we first populate all available property sets . We then add all remaining attributes that aren't already in a property set by placing them into a separate dummy set .

We can now move on to the multiple access check functions. First we get the information for an object based on its distinguished name . We then get the maximum granted access for the object, with only the object schema class identifier as the object type. This gives us an idea of the basic rights the user will be granted, such as the ability to delete the object or modify its security descriptor.

Next, we build the tree for the property sets and attributes ❸ and run the access check using the Test-Access function. We're interested only in results that grant WriteProp access (most objects let any user read their attributes, so this information is less interesting). We split the access check results into writable property sets and writable individual attributes.

We now focus on the child classes by building the object type tree from the schema class identifier . Even though the directory server would check a single class at a time, we'll perform all the checks in one go. We run two access checks, one for CreateChild access and one for DeleteChild access.

One thing to note is that we use the dummy identifier as the root object type. If we instead used the schema class identifier for the object, the access granted to that class would propagate to all the children, potentially giving us the wrong result. Using an identifier that isn't a real schema class should enable us to avoid this outcome.

We run a similar access check for control access rights ❷ and writevalidated access rights ❸, requesting ControlAccess and Self, respectively. Finally, we package all the results into a custom object to return to the caller ❹.

Active Directory   393

---

Listing 11-49 demonstrates calling the Get-AccessCheckResult function for an Active Directory object.

```bash
PS> $dn = "C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local"
PS> $ctx = Get-AuthContext 'alice' @
PS> Get-AccessCheckResult $ctx $dn @
Name
: C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local
Access
: List, ReadProp, ListObject, ControlAccess, ReadControl
WriteAttributes
: {displayName, sAMAccountName, description, accountExpires...}
WritePropertySets : {User-Account-Restrictions, User-Logon}
CreateChild
:
DeleteChild
Control
: {Allowed-To-Authenticate, Receive-As, Send-As,...}
WriteValidated
: Validated-SPN
PS> $ctx = Get-AuthContext $dn
PS> Get-AccessCheckResult $ctx $dn @
Name
: C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local
Access
: CreateChild, DeleteChild, List, ReadProp, ListObject,...
WriteAttributes
: {StreetAddress, homePostalAddress, assistant, info...}
WritePropertySets : {Personal-Information, Private-Information}
CreateChild
: {msFVE-RecoveryInformation, ms-net-ieee-80211...}
DeleteChild
: {msFVE-RecoveryInformation, ms-net-ieee-80211...}
Control
: User-Change-Password
WriteValidated
: {DS-Validated-Write-Computer, Validated-SPN}
```

Listing 11-49: Testing the Get-AccessCheckResult function

In this example I've used the GRAPHITE computer object, but you can change this distinguished name to that of any object you want to check in the directory. We first need to get the authentication context for the user (here, $alice$ ) ❶ . This user created the GRAPHITE object and therefore has some special access other users don't have.

Next, we run the access check and display the results to the console 2 . You can see in the Access property that ControlAccess has been granted generally. This means that Alice can use any control access right unless it is explicitly denied through an ACE (a Denied ACE also applies whenever a user or computer is marked as "User cannot change password," blocking the User-Change-Password control access right).

We can see that the user has some writable attributes and property sets but can't create or delete any child objects. We additionally see the list of granted control and write-validated access rights. The control access rights are granted based on the top-level granted access, but the Validated-SPN access right must have been granted explicitly.

Next, we repeat the check using the computer account ❸ . If you compare the output with that for alice , you'll notice several differences. First, the attributes and property sets that the user can write to have changed. More importantly, the computer account can create and delete any child object. The computer account also has fewer control access rights, but more write-validated access rights.

---

You can enumerate all objects in the local Active Directory server using the Get-ADObject command, then pass each distinguished name to the Get-AccessCheckResult function to enumerate writable access across the entire directory.

This concludes our worked example. Hopefully, it has given you a better understanding of the nuts and bolts of the Active Directory server access check process. If you'd like to explore an existing implementation of the access check, the NObjectManager module provides the Get-AccessibleObject command, which checks for read access in addition to write access and caches domain information to improve performance. You can use it to run a full recursive scan of the Active Directory server for the current user with the command shown in Listing 11-50.

```bash
PS> Get-AccessibleObject -NamingContext Default -Recurse
-------    ObjectClass  UserName   Modifiable  Controllable
------    ----------------- -----------------
domain       domainDNS    MINERAL\alice False      True
Builtin      builtinDomain MINERAL\alice False      False
Computers   container    MINERAL\alice False      False
--snip--
```

Listing 11-50: Performing an access check

The tabular output indicates whether the user can modify each type of object, such as by changing its attributes or creating a child object, and whether any control access rights have been granted to the user for that object.

## Wrapping Up

We began this long chapter with a high-level overview of the information stored in Active Directory, such as the users and groups that are part of the domain, and we inspected the directory's configuration from PowerShell using the Remote Server Administration Tools.

We then dig into the Active Directory server at a lower level, starting with its schema, which defines the structure of the directory. The Active Directory server consists of hierarchical objects that can contain named values called attributes. Each object and attribute has a schema representation that defines what it can contain.

Next, we discussed how the Active Directory server secures objects through a mandatory security descriptor attribute. We looked at examples of querying the security descriptors of existing objects, as well as how to create security descriptors for new objects. We also saw how to assign security descriptors to existing objects.

Once we understood how an object's security descriptor is configured, we explored how the directory server determines what access a user has to an object and its attributes. This access check process uses unique identifiers taken from the schema representation to build object type trees. These

Active Directory  395

---

make the access check granular; able to grant a user access to only a specific attribute without requiring thousands of hardcoded checks.

The Active Directory configuration also contains two special types of access rights: control access rights and write-validated access writes. These allow users to perform special operations on an object, such as changing a user's password; they also prevent a user from modifying certain attribute values without confirmation from the server.

The access check process contains a few exceptions too. For example, a user can be granted the SeMachineAccountPrivilege privilege, which allows them to create computer objects even if no directory object grants them the necessary permission. This allows users to join their computer to a domain without needing an administrator account. However, the directory server limits what the user can do with the new computer account, to mitigate the risk of compromise.

Lastly, we went through a very quick overview of how a domain configures group policies through links to external network filesystems. We noted that this design could leak information about the configuration of users on a domain controller to users without administrative access.

We'll return to the topic of Active Directory when we discuss Kerberos authentication in Chapter 14. Keep in mind that real-world deployments of Windows domains can be extremely complex, with many more security nuances than covered here. If you'd like to know more about how Active Directory functions and the many security edge cases it presents, consult Microsoft's technical specification for Active Directory (MS-ADTS).

In the next chapter, we're going to delve into how interactive authentication is implemented on Windows. This authentication allows you to log in to a desktop and use the computer's user interface.

---

## 12

## INTERACTIVE AUTHENTICATION

![Figure](figures/WindowsSecurityInternals_page_427_figure_002.png)

When you authenticate to your Windows system, you'll usually access a login interface, enter your credentials, and be greeted

with the desktop. But quite a lot happens behind the scenes to make this authentication process work. Interactive authentication is the mechanism that converts a set of credentials into a Token object that you can use to interact with authorization systems, such as access checks.

Windows uses many types of interactive authentication for a variety of purposes. For example, it uses one type when a user creates an interactive desktop and another when the user has provided credentials to a networkfacing service. We'll begin this chapter by exploring how Windows creates your interactive desktop when you authenticate to a Windows system. We'll then cover how this interactive authentication is implemented through

---

the $pluginUser API. Finally, we'll look at the various types of interactive authentication, the differences between them, and when they might be used.

## Creating a User’s Desktop

The most common way of interacting with a Windows system is via the user interface on a desktop. Figure 12-1 summarizes the process of creating a user's desktop.

![Figure](figures/WindowsSecurityInternals_page_428_figure_003.png)

Figure 12-1: An overview of interactive desktop creation

When the Windows system starts, the session manager creates a console session, as described in Chapter 3. In this console session it starts an instance of the Winlogon process, which gathers credentials and starts the new user's processes once they're authenticated. The Winlogon process then creates the LogonUI process to display a UI. The LogonUI process reads the credentials from the user and passes them back to Winlogon.

Next, the Winlogon process sends the credentials to the LSA's LSalogfon user API to verify that they're correct . If the user has successfully authenticated, a token representing the user's identity is returned to Winlogon . The console session can then be reconfigured for the user, a process that includes creating a window station and desktop and spawning the user initialization process using the user's token .

The lsatoolmgr API directly supports the most common type of creational, a username and password pair. However, Windows allows many other local authentication factors as well, such as biometric data (for example, a scanning of the user's face) or a simple PIN. To handle these,

398    Chapter 12

---

Winlogon loads a credential provider when needed. Each provider is responsible for mapping its credential type to one that LsaLogonUser supports to get the token.

### THE SECURE ATTENTION SEQUENCE

One of the original security features in Windows NT was the secure attention sequence (SAS), which a user could invoke by pressing CTRL+DELETE. The handling of this key chord was built into the operating system, so applications couldn't block it. When the key chord was pressed, the system would notify Winlogon, which would switch the desktop to display an authentication prompt or an options menu. By making it impossible to block the SAS, Windows ensured it was safe for a user to enter their credentials into the computer.

The latest versions of Windows don't use the SAS as the Logon UI by default, although it's still a configurable option. If you're already authenticated and you press CTRL-ALT-DELETE, the system will switch to the Winlogon desktop to display the menu shown here.

![Figure](figures/WindowsSecurityInternals_page_429_figure_004.png)

## The LsaLogonUser API

We know the basics of how to create a desktop on Windows. Now let's dig into how the LsaLogCluster API implements the interactive authentication service for Winlogon and other applications on the local system. This API

Interactive Authentication  399

---

might seem quite complex, but it really requires only three pieces of information from an application to authenticate a user:

- • The logon type requested
• The security package identifier
• The user's credentials
The API uses the logon type to accommodate different authentication scenarios. Table 12-1 lists the logon types most commonly used by applications.

Table 12-1: Common Logon Types

<table><tr><td>Logon type</td><td>Description</td></tr><tr><td>Interactive</td><td>Interact with a local desktop.</td></tr><tr><td>Batch</td><td>Run as a background process, even if no desktop is available.</td></tr><tr><td>Service</td><td>Run as a system service.</td></tr><tr><td>Network</td><td>Interact with the system from a network client.</td></tr><tr><td>NetworkCleartext</td><td>Perform network authentication, but store the user&#x27;s credentials for later use.</td></tr><tr><td>NewCredentials</td><td>Clone the caller&#x27;s token and change network user credentials.</td></tr><tr><td>RemoteInteractive</td><td>Interact with a desktop via the Remote Desktop Protocol.</td></tr><tr><td>Unlock</td><td>Verify the user&#x27;s credentials for unlocking the desktop.</td></tr></table>


Unlock is a special type that Winlogon uses to verify a user's credentials on the lock screen, and it isn't typically used by applications directly. We'll come back to some of the other logon types later in the chapter.

Windows abstracts the details of authentication to a security package , which provides a standardized interface to an authentication protocol. The authentication protocol is a formal process that takes a set of credentials and verifies that they're valid. It also provides a mechanism to return information about the verified user, such as their group memberships. We also sometimes refer to a security package as a security support provider (SSP) .

We can enumerate the available security packages using the Get-LSa Package PowerShell command, as shown in Listing 12-1.

```bash
PS> Get-LsaPackage | Select-Object Name, Comment
----     Name                     Comment
----     ------
Negotiate                   Microsoft Package Negotiator ❶
NegoExtender                   NegoExtender Security Package
Kerberos                   Microsoft Kerberos v1.0
NTLM                       NTLM Security Package ❷
TSSSS                       TS Service Security Package
pku2u                       PKU2U Security Package
CloudAP                          Cloud AP Security Package
WDigest                     Digest Authentication for Windows
400      Chapter 12
```

---

```bash
Schannel
                          Schannel Security Package
Microsoft Unified Security Protocol Provider
                          Schannel Security Package
Default TLS SSP
                          Schannel Security Package
CREDSSP
                          Microsoft CredSSP Security Provider
```

Listing 12-1: Enumerating the supported security packages

Applications typically access a security package via a more generic API that is agnostic to the authentication protocol used. For example, LSalogounter works across multiple different packages by accepting a unique identifier for the package to use. A security package can also implement a network authentication protocol, which we'll cover in more depth in the following chapters.

The most widely used security packages for local authentication are Negotiate ❶ and NT LAN Manager (NTLM) ❸ . The NTLM authencation protocol was introduced in Windows NT 3.1, and it's also sometimes referred to as the Microsoft Authentication Package V1.0 in documentation. The Negotiate package can automatically select between different authentication protocols, depending on the circumstances. For example, it might select NTLM if authenticating locally to the SAM database or Kerberos when authenticating to a domain.

The supported credential types depend on the security package being used for the authentication. For example, NTLM supports only username and password credentials, whereas Kerberos supports X.509 certificates and smart card authentication in addition to a username and password.

## Local Authentication

Let's explore how the IsetaogonUser API authenticates a user in more detail.


Figure 12-2 gives an overview of this process for a user in the local SAM


database.

![Figure](figures/WindowsSecurityInternals_page_431_figure_007.png)

Figure 12-2: The local authentication process using LsaLogonUser

Due to the complexities of the L5logonUser API, it's more common for an application to use a simpler API provided by the system. For example, the logonUser API accepts a username, a domain name, a password, and the logon type and formats the parameters appropriately for the underlying security package.

---

It then forwards these parameters, including the user's credentials, to the $daemonUser API in the LSA process ❶ . The API in turn forwards the authentication request to the chosen security package, which in this case is the NTLM package implemented in the MSVL_0.DLL library.

The security package checks whether the user exists in the local SAM database. If it does, the user's password is converted to an NT hash (discussed in Chapter 10), and then it is compared against the value stored in the database ❸. If the hashes match and the user account is enabled, the authentication proceeds and the user's details, such as group membership, are read from the SAM database for the authentication process to use.

Now that the security package knows the user's group membership and account details, it can check whether the local security policy allows the user to authenticate ❸ . The main policy checks whether the logon type requested is granted an account right. Table 12-9 lists the logon types and the account rights the user must be granted in order to authenticate. Note that the NewCredential s logon type doesn't need a specific account right; we'll cover why in the "Network Credentials" box on page 407.

Table 12-2: Logon Types and Associated Allow and Deny Account Rights

<table><tr><td>Logon type</td><td>Allow account right</td><td>Deny account right</td></tr><tr><td>Interactive</td><td>SeInteractiveLogonRight</td><td>SeDenyInteractiveLogonRight</td></tr><tr><td>Batch</td><td>SeBatchLogonRight</td><td>SeDenyBatchLogonRight</td></tr><tr><td>Service</td><td>SeServiceLogonRight</td><td>SeDenyServiceLogonRight</td></tr><tr><td>Network</td><td>SeNetworkLogonRight</td><td>SeDenyNetworkLogonRight</td></tr><tr><td>NetworkCleartext</td><td>SeNetworkLogonRight</td><td>SeDenyNetworkLogonRight</td></tr><tr><td>NewCredentials</td><td>N/A</td><td>N/A</td></tr><tr><td>RemoteInteractive</td><td>SeRemoteInteractiveLogonRight</td><td>SeDenyRemoteInteractiveLogonRight</td></tr><tr><td>Unlock</td><td>The same as Interactive or RemoteInteractive</td><td>The same as Interactive or RemoteInteractive</td></tr></table>


If the user doesn't have the necessary account right granted or is explicitly denied the right, the authentication will fail. There can be other limitations on authentication, as well; for example, you could configure a user so that they're allowed to authenticate only between certain times, or even only on certain days of the week. If the user doesn't meet one of the policy requirements, the security package will reject the authentication.

If the user's credentials are valid and the policy permits them to authenticate, the LSA can create a token using the NtCreateToken system call based on the information about the user and their privileges extracted from the SAM and LSA policy databases . The application receives a handle to a token, which the user can subsequently use for impersonation or to create a new process within the limits of the assignment, as described in Chapter 4 .

---

## Domain Authentication

Authenticating a user to a domain controller is not significantly different from local authentication, but it's still worth highlighting the small distinctions. Figure 12-5 shows the domain authentication process.

![Figure](figures/WindowsSecurityInternals_page_433_figure_002.png)

Figure 12-3: The domain authentication process using LsaLogonUser

The domain authentication process starts in the same manner as local authentication. The application provides the credentials and other parameters to the LsalogonUser API running in the LSA process ❶ . At this point, it's likely that API will use the Negotiate security package to select the most appropriate security package to authenticate with.

In this example, it once again uses the NTLM security package, which is easy to understand. However, in a modern Windows network, you're more likely to find Kerberos used. Interactive authentication with Kerberos is much more complex, so I'll wait until Chapter 14 to provide details about it.

Windows also supports online authentication protocols, such as those for Microsoft and Azure Active Directory accounts. Authentication for these accounts uses the CloudAP security package, which Negotiate will select automatically if it's the best security package to use. Details of this selection process are beyond the scope of this book, although we'll cover some aspects of Negotiate in Chapter 15.

The NTLM security package once again generates the NT hash, but instead of consulting the local SAM database, it determines the domain controller for the user's domain. It then forwards the authentication request containing the user's name and NT hash to the domain controller's NetlogonSamLogon API using the Netlogon network protocol.

While Windows has deprecated the Netlogon protocol for primary domain authentication, it has not removed the protocol in the latest versions. Not removing legacy features can result in important security issues as technology becomes obsolete and security expectations change. For example, CVE-2020-1472, dubbed Zerologon , was a serious vulnerability in the Netlogon protocol that allowed unauthenticated users to compromise the entire domain network due to a flaw in the weak cryptography used by the protocol.

---

The domain controller verifies the user's credentials in the domain's user database . For modern versions of Windows, this is Active Directory, not a SAM database. The user must also be enabled for the authentication to succeed. If the hashes match, the user's information is extracted from Active Directory and returned to the client system.

Once the user's credentials have been validated, the client system can verify its local policy❶ to determine whether the user is permitted to authenticate based on the logon type and other restrictions, such as time limits. If every check succeeds, the LSA generates the token and returns it to the application❷.

## CACHED DOMAIN CREDENTIALS

What happens to a Windows system that is connected to a domain when the enterprise network is disconnected or otherwise unavailable? If authentication relies on being able to contact a domain controller over the network, how could you authenticate to the system to change the network configuration? You could ensure that every user had a separate local user account to deal with this issue, but that isn't a very satisfactory option.

To solve this problem, the LSA stores a cache of recently used domain credentials. Each time a successful domain authentication occurs, the LSA caches the credentials. The next time the user authenticates to the system, if the domain authentication fails because the domain controller is no longer accessible, the LSA can check whether the credentials used match any of the values stored in the cache. If it finds a match, it will grant access to the system. However, the LSA will also keep trying to contact the domain controller to verify the user's credentials. This is especially important for Kerberos, because without contact with the domain controller, the user won't be able to access any network resources.

I mentioned in the previous chapter that these cached credentials are stored

in the SECURITY registry hive. We won't delve into the details of this storage, as

it could easily change between versions of Windows.

### Logon and Console Sessions

Once the LSalogout API has verified the user's credentials, it can create an initial token for the user. Before it can make a call to NtCreateToken, however, the LSA must set up an associated logon session. We discussed the logon session in Chapter 4, in the context of the token's authentication ID, but it's worth going into more depth about what it contains.

Let's begin by querying the LSA for all current logon sessions using the Get-MtLogonSession PowerShell command, as shown in Listing 12-2. You should run this command as an administrator to display all the logon sessions on the system.

404     Chapter 12

---

```bash
PS> Get-NLogonSession | Sort-Object LogonId
LogonId                Username                     LogonType               SessionId
 ---------                        ---------                      ---------
----------------------
00000000-000003E4 NT AUTHORITY\NETWORK SERVICE
00000000-000003E5 NT AUTHORITY\LOCAL SERVICE
00000000-000003E7 NT AUTHORITY\SYSTEM
00000000-000006A9 Font Driver Host\UMFD-0
00000000-000006A6 Font Driver Host\UMFD-1
00000000-000005E9 Window Manager\DMV-1
00000000-00042A51 GRAPHITE\user
00000000-00042AB7 GRAPHITE\user
00000000-0004FA72 Font Driver Host\UMFD-3
00000000-00007CF2 Window Manager\DMV-3
00000000-00007CF2 Window Manager\DMV-3
```

Listing 12-2: Displaying all current logon sessions

We can see that the first two sessions are for service accounts ❸, as indicated by the logonType value. Oddly, the third session is also a service account, for the SYSTEM user, but notice that the logonType is undefined ❷. This is because the kernel creates the SYSTEM logon session before the LSA process is started, which means no authentication has taken place.

The rest of the logon sessions are for interactive accounts, as indicated by the Interactive logon type ❶ . Only one user is authenticated ❶ , the other accounts belong to system processes such as the user-mode font driver (UMFD) and the desktop window manager (DWM). We won't cover these system processes in any detail. Observe that the current user has two logon sessions. This is because of UAC, introduced in Chapter 4; we'll come back to why UAC generates two sessions in "Token Creation" on page 407.

Notice also that a SessionID is shown for each logon session, in addition to the authentication identifier (LogID) that identifies the account. This is the console session ID. It's important not to confuse the logon session and console session types. As this output shows, it's possible for a single console session to host multiple separate logon sessions, and for a single logon session to be used across multiple console sessions.

The LSA stores the console session ID originally associated with the logon session when it was created. In Listing 12-3, we query the LSA for all current console sessions with Get-ntConsoleSession. This behavior allows multiple users to share the same console and desktop.

```bash
PS> Get-NTConsoleSession
SessionId UserName
------------- ---------
0
          -----------------
Services
                          Disconnected
1
   GRAPHITE\user 315CE9425D04006A9E4#0
2
          Console
                          Connected
```

Listing 12-3: Displaying all current console sessions

The SessionName column indicates where the console session is connected. Session 0 is a Services console, meaning it's used only for system

---

services. The State column indicates the state of the UI. For session 0 this is set to Disabled, and as there is no UI displayed.

Session 1 is created on demand when the user successfully completes the interactive authentication process. The Username column identifies the authenticated user. The session state is set to Active, as this is the console session in which I ran the PowerShell command. The session name is a unique value indicating that this is a remote desktop connection.

Finally, session 2 lives on the physical console. It shows a state of connected, as it currently hosts a LogonUI in case a user tries to physically log in to the machine. However, at this point there's no authenticated user in session 2, as you can see by the absence of a Username in the listing.

Figure 12-4 summarizes the relationships between logon sessions and console sessions in this example. The console sessions are the gray boxes in the background, and the logon sessions are the white boxes in the foreground.

![Figure](figures/WindowsSecurityInternals_page_436_figure_004.png)

Figure 12-4: The console and logon sessions

Notice that console session 0 contains the service logon sessions, such as those for the local system, the network service, and the local service. The local system logon session is also used for the LogonUI process running in console session 2. At the bottom right is console session 1, which contains two user logon sessions: one for the UAC administrator and one for the filtered non-administrator.

406     Chapter 12

---

## NETWORK CREDENTIALS

One other important value stored in the logon session is the set of network

authentication credentials for the user. Storing these credentials can save the

user from having to retype them for every network service. Not all types of

logon sessions store network credentials, though; for example, the Interactive

and Batch logon types store the credentials, but the Network logon type does

not. If you want a network logon session with stored network credentials, you

can use the NetworkCredential logon type instead.

The NewCredentials logon type doesn't authenticate a new user. Instead, the LSA makes a copy of the caller's token, creates a new logon session, and uses the supplied credentials only for network authentication. This allows a user to authenticate as a different user locally and remotely. Note that this logon type doesn't verify the credentials in the call to LsaLogontr; it verifies them only when they're used. This means that if you specify the wrong credentials, LSaLogontr will return successfully but then fail at a later point, when the credentials are required.

We'll cover network authentication and how it interacts with the user's network authentication credentials in more detail in the following chapters.

### Token Creation

With a new logon session, the LSA can create the final Token object for the user. To do this, it must gather information about the token's various security properties, including the user's groups, privileges, and logon session ID, then pass these to NtCreateToken.

You might be wondering where the user's groups come from. As domain authentication is the most complex case, let's consider the groups assigned to a domain user token when Winlogon authenticates the user. (The group assignment will look similar in the local authentication process, except that the LSA will consider only local groups.) Table 12-3 shows the group assignments for the alice user.

Table 12-3: Groups Added to an Interactive Token on a Domain-Joined System

<table><tr><td>Group name</td><td>Group source</td></tr><tr><td>MINERAL\alice</td><td>Domain user account</td></tr><tr><td>MINERAL\Domain Users</td><td rowspan="3">Domain group membership</td></tr><tr><td>Authentication authority asserted identity</td></tr><tr><td>NT AUTHORITY\Claims Valid</td></tr><tr><td>MINERAL\Local Resource</td><td>Domain-local resource group membership</td></tr><tr><td>BUILTIN\Administrators</td><td rowspan="2">Local group membership</td></tr><tr><td>BUILTIN\Users</td></tr><tr><td></td><td>(continued)</td></tr><tr><td></td><td>Interactive Authentication 407</td></tr></table>


---

Table 12-3: Groups Added to an Interactive Token on a Domain-Joined System (continued)

<table><tr><td>Group name</td><td>Group source</td></tr><tr><td>NT AUTHORITY:INTERACTIVE</td><td rowspan="4">Automatic LSA groups</td></tr><tr><td>NT AUTHORITY:Authenticated Users</td></tr><tr><td>Everyone</td></tr><tr><td>Mandatory Label\High Mandatory Level</td></tr><tr><td>NT AUTHORITY:</td><td rowspan="3">Winlogon groups</td></tr><tr><td>LogonSessionId_0_6077548</td></tr><tr><td>LOCAL</td></tr></table>


As you can see, the groups added to the token come from six sources.


The first entry comes from the domain user account. (In a local authentica

scenario, the group would come from the local user account instead.)

Next are the domain group memberships. These come from the Universal and Global group scopes, discussed in the previous chapter. The alice user is a member of the first group, Domain Users. The other two groups are generated automatically when the user authenticates. The Authentication authority asserted identity group relates to a feature called Service for User (S4U), which we'll explore when we talk about Kerberos authentication in Chapter 14.

The following source includes the groups with the DomainLocal scope. These domain-local groups are marked in the token with the Resource group attribute, although the attribute doesn't affect their use in an access check. The list of domain-local resource groups a user belongs to is returned in the response from the NetLogoOnSanLogon API, known as a privilege attribute certificate (PAC). We'll also come back to the PAC in Chapter 14.

Next, any local groups the user is a member of are added to the token.


These local groups can be selected based on the domain SIDs provided


during the authentication process.

These are followed by the automatic LSA groups. Membership in the Everyone and Authenticated Users groups is granted to all authenticated tokens automatically. INTERACTIVE group membership is granted when a user is authenticated using the Interactive logon type. Table 12-4 provides a list of the SIDs added for different logon types. The LSA adds the Mandatory Label/High Mandatory LevelSID automatically if the user is considered an administrator (for example, if they're in the Administrator group or have certain high-level privileges). This sets the integrity level of the token to High . Normal users get the Medium Mandatory Level SID , while system service users (such as SYSTEM) get the System Mandatory Level SID .

Table 12-4: The SIDs Added to the Token for Each Logon T ype

<table><tr><td>Logon type</td><td>Name</td><td>SID</td></tr><tr><td>Interactive</td><td>NT AUTHORITY\INTERACTIVE</td><td>5-1-5-4</td></tr><tr><td>Batch</td><td>NT AUTHORITY\BATCH</td><td>5-1-5-3</td></tr></table>


408     Chapter 12

---

<table><tr><td>Logon type</td><td>Name</td><td>SID</td></tr><tr><td>Service</td><td>NT AUTHORITY:SERVICE</td><td>S-1-5-6</td></tr><tr><td>Network</td><td>NT AUTHORITY:NETWORK</td><td>S-1-5-2</td></tr><tr><td>NetworkCleartext</td><td>NT AUTHORITY:NETWORK</td><td>S-1-5-2</td></tr><tr><td>NewCredentials</td><td>The same as that of the original token</td><td>N/A</td></tr><tr><td rowspan="2">RemoteInteractive</td><td>NT AUTHORITY:INTERACTIVE</td><td>S-1-5-4</td></tr><tr><td>NT AUTHORITY:REMOTE INTERACTIVE LOGON</td><td>S-1-5-14</td></tr><tr><td>Unlock</td><td>The same as the logon session that is being unlocked</td><td>N/A</td></tr></table>


Providing a unique SID for each logon type allows a security descriptor to secure resources depending on the type of logon. For example, a security descriptor could explicitly deny access to the NT AUTHORITY_NETWORK SID, meaning a user authenticated from the network would be denied access to the resource, while other authenticated users would be granted access.

The sixth set of SIDs added to the token are for the groups added by Winlogon when it calls the LsaLogonUser API. The API allows a caller with $eTeVPrivilege enabled to add arbitrary group SIDs to the created token, so Winlogon adds a logon session and a LOCAL SID. This logon session SID's two RID values are the two 32-bit integers from a LUID generated by the #AttLocalLocallyUniqueID system call. You might assume that the LUID would match the one used for the logon session. However, as the SID is created before the call to the LSA that creates the logon session, this isn't possible. This SID is used to secure ephemeral resources such as the user's BaseNamedObjects directory.

## NOTE

If you don't specify a logon session SID when creating the token, the LSA will add its own for you. However, it will follow the same pattern of using a different LUID from that of the token's logon session.

As discussed in Chapter 10, the token's privileges are based on the account rights stored in the local LSA policy database. This is true even in domain authentication; however, the account rights can be modified using a domain group policy deployed to computers in the domain.

If the user is considered an administrator, UAC is enabled, and the user is authenticating with the Interactive or RemoteInteractive logon type, the LSA will first build the full token and create a new logon session, then create a second copy of the full token with a new logon session but call #filterToken to remove administrator privileges (see Chapter 4 for a more in-depth description of this). The LSA will then link the two tokens together and return the filtered token back to the caller. This behavior is why we observed two logon sessions for the same user in Listing 12-2.

You can disable the token-splitting behavior by adjusting the system's UAC settings. It's also disabled by default for the Administrator user, which

---

is always created when Windows is installed but only enabled by default on Windows Server systems. The LSA checks the last RID of the user's SID: if it's 500, which matches the Administrator user, the token won't be split.

## Using the LsaLogonUser API from PowerShell

Now that you know how the $!tokenManager API works, let's see how to access the API from the $!tokenManager PowerShell module. Unless you run PowerShell with SetcBPrivilege, some features of the API will be blocked, such as adding new group SIDs to the token, but you'll be able to create a new token if you have the user's username and password.

We access the API via the Get-htToken command and the token parameter. Listing 12-4 shows how to use Get-htToken to authenticate a new user.

```bash
PS> $password = Read-Host -AsSecureString -Prompt "Password"
Password: *********
PS> $token = Get-NToken -Logon -User user -Domain $env:COMPUTERNAME
-Password $password -LogonType Network
PS> Get-NTlogonSession -Token $token
LogonID
--------------------
-----------------
00000000-9BBFFF01 GRAPHITE\user
Network
3
```

Listing 12-4: Authenticating a user

It's best not to enter passwords on the command line. Instead, we use


Read-Host with the AsSecureString property to read the password as a secure


string:

We can then call $getAccessToken, specifying the username, the domain, and the password. (Replace the username in this example, user, with that of a valid local user.) We set the domain to the name of the local computer, indicating that we want to authenticate using a local account. You can set any logon type, but in this case we specify network, which works for all users. Whether the LSA will allow other logon types depends on the assigned account rights.

NOTE

By default, the LsaloLogger API won 't authenticate a user with an empty password outside of the physical console. If you try running the command with a user account that has an empty password, the call will fail.

The logon type also determines what type of token isalogonoller will return based on the created token's likely purpose, such as creating a new process or impersonation. Table 12-5 shows the mappings of logon type to token type. (We can freely convert between primary and impersonation tokens through duplication, so the tokens don't have to be used in the expected way.)

---

Table 12-5: Logon Types Mapped to Token Types

<table><tr><td>Logon type</td><td>Token type</td></tr><tr><td>Interactive</td><td>Primary</td></tr><tr><td>Batch</td><td>Primary</td></tr><tr><td>Service</td><td>Primary</td></tr><tr><td>Network</td><td>Impersonation</td></tr><tr><td>NetworkCleartext</td><td>Impersonation</td></tr><tr><td>NewCredentials</td><td>Primary</td></tr><tr><td>RemoteInteractive</td><td>Primary</td></tr><tr><td>Unlock</td><td>Primary</td></tr></table>


In Listing 12-4, the command returned an impersonation token. You might be wondering: Are we allowed to impersonate the token without having SetImpersonatePrivilege enabled, especially if the token belongs to a different user? The LSA sets the new token's origin ID to the caller's authentication ID, so based on the rules for impersonation covered in Chapter 4, we can, even if the token belongs to a different user.

This isn't considered a security issue, because if you know the user's password, you can already fully authenticate as that user. In Listing 12-5, we check whether the origin and authentication IDs match using the Get-NTTokenId command.

```bash
PS> Get-NtTokenId -Authentication
LUID
----
00000000-000A0908
PS> Get-NtTokenId -Token $token -Origin
LUID
00000000-000A0908
```

Listing 12-5: Comparing the authentication ID and origin ID

We query the primary token for its authentication ID, then query the new token for its origin ID. The output shows that the IDs are equal.

However, there is one restriction on impersonating the token. If the user being authenticated is an administrator, and the authentication process uses a logon type other than Interactive, the command won't return a filtered token. Instead, it will return an administrator with a high integrity level. This integrity level prevents the token from being impersonated from a Medium -level process. But because the returned token handle has write access, we can reduce the integrity level to Medium before impersonating it. We do this in Listing 12-6.

---

```bash
PS> Get-NtTokenIntegrityLevel -Token $token
High
PS> Test-NtTokenImpersonation $token
False
PS> Set-NtTokenIntegrityLevel -Token $token Medium
PS> Test-NtTokenImpersonation $token
True
```

Listing 12-6: Testing the ability to impersonate the returned token.

In this case, the token we've authenticated is a member of the Administrators group and so has a high integrity level. We try to impersonate it, and as you can see, the command returns False. We then set the token's integrity level to Medium and test impersonation again. The operation now returns True.

## Creating a New Process with a Token

If you use a logon type that returns a Primary token, you might assume that the token will enable you to create a new process. To test this, run Listing 12-7 as a non-administrator user, making sure to change the username to that of a valid account.

```bash
PS> $token = Get-NToken -Logon -User user -Domain $env:COMPUTERNAME
-Password $password -LogonType Interactive
PS> New-Win32Process cmd.exe -Token $token
Exception calling "CreateProcess": "A required privilege is not held
by the client"
```

Listing 12-7. Creating a new process with an authenticated token

You'll find that creating the new process fails. This is because the new token doesn't meet the requirements for primary token assignment described in Chapter 4. The process creation would work if the calling process had SeAssignPrimaryTokenPrivilege, which Winlogon would have; however, a normal user process doesn't have this privilege.

If you rerun the command as an administrator, though, it should succeed, even though administrators are not granted the privilege by default. Let's explore why this works. The NewWin32Process command first tries to create the process using the CreateProcessAsUser API, which runs in-process. As the calling process doesn't have SeAssignPrimaryTokenPrivilege, this operation fails.

Upon this failure, the NewWin32Process API will fall back to calling an alternative API, CreateProcessWithToken. This API isn't implemented inprocess; instead, it's implemented in a system service, the secondary logon service, which does have SeAssignPrimaryTokenPrivilege. In this case, the service will check whether the caller has Se impersonatePrivilege before creating the new process.

---

The command therefore works for administrators who are granted

SeImpersonatePrivilege. Even so, administrators shouldn't rely on Create

ProcessWithToken exclusively, because the API doesn't support many features of CreateProcessAsUser, such as inheriting arbitrary handles to the new process.

There is also a way for a non-administrator user to create a process as a different user. The secondary logon service exposes a second API, CreateProcessWithLogon, that accepts the username, domain, and password for the user to create instead of a token handle. The service authenticates the user using LSalogonUser, then uses the authenticated token with CreateProcessAsUser. As the service has SeAssignPrimaryTokenPrivilege, the process creation will succeed.

You can specify the Credential parameter when calling the New-iron3 Process command to use CreateProcessWithIlogon, as shown in Listing 12-8.

```bash
PS> $creds = Read-LsaCredential
UserName: alice
Domain: MINERAL
Password: **********
PS> $proc = New-Win32Process -CommandLine cmd.exe -Credential $creds
PS> $proc.Process.User
Name           Sid
----+
MINERAL/alice 5-1-5-21-1195776225-522706947-2538775957-1110
```

Listing 12-8: Calling CreateProcessWithLogon using New-Win32Process

Here we read the credentials for the alive user and create the new process using New-Win32Process, specifying the credentials with the Credential parameter. This will call the CreateProcessWithLogon API.

The API will return a process and thread handle to use. For example, we can query for the process user, which shows it was created with a token for the authenticated alice user.

The API doesn't allow you to specify the logon type of the user (it defaults to Interactive), but you can specify the NetCredentialsOnly flag to the


LogonFlags parameter to use the NewCredentials logon type instead.

## The Service Logon Type

Let's wrap up this chapter by talking a little more about the Service logon type. The service control manager uses this logon type to create tokens for system service processes. It will allow any user account that has been granted the $serviceLogonRight account right to authenticate.

However, the LSA also supports four well-known local service accounts that are not stored in the SAM database. We can create them using lsaglogn User by specifying the domain name as NT AUTHORITY with the Service logon type and one of the usernames in Table 12-6, which also shows the user SIDs.

Interactive Authentication   413

---

Table 12-6: Usernames and SIDs for the Service Logon Type

<table><tr><td>Username</td><td>User SID</td></tr><tr><td>IUSR</td><td>S-1-5-17</td></tr><tr><td>SYSTEM</td><td>S-1-5-18</td></tr><tr><td>LOCAL SERVICE or LocalService</td><td>S-1-5-19</td></tr><tr><td>NETWORK SERVICE or NetworkService</td><td>S-1-5-20</td></tr></table>


The SYSTEM user is the only administrator of the four users; the other three are not members of the Administrators group, but they do have highlevel privileges such as SelPersonalPrivilege, which makes them effectively equivalent to an administrator.

The USSR account represents the anonymous internet user. It's available to reduce the privileges for the Internet Information Services (IIS) web server when it's configured for anonymous authentication. When a request is made to the IIS web server with no user credentials, it will impersonate an USSR account token before opening any resources, such as files. This prevents inadvertently exposing resources remotely as a privileged user.

For these built-in service accounts, you don't need to specify a password, but you do need to call $ta@tonumber with SetchPrivilege enabled, which prevents it from being used outside of a system service. Listing 12-9 shows how to use Get-htToken to create a SYSTEM user token. Run these commands as an administrator.

```bash
PS> Get-NtToken -Logon -LogonType Service -Domain 'NT AUTHORITY' -User SYSTEM
-WithTcb
User
----------------------
GroupCount PrivilegeCount AppContainer Restricted
------------------------------------
NT AUTHORITY\SYSTEM 11
31
False
False
PS> Get-NtToken -Service System -WithTcb
User
----------------------
GroupCount PrivilegeCount AppContainer Restricted
------------------------------------
NT AUTHORITY\SYSTEM 11
31
False
False
```

Listing 12.9: Getting the SYSTEM user token

Even as an administrator you don't receive SetchbPrivileges by default, so the command supports a withTcb parameter, which automatically impersonates a token with the privilege enabled. You can also simplify the creation of a service account by using the Service parameter and specifying the name of the service user to create.

## Worked Examples

Let's walk through some examples that demonstrate how to use the various commands introduced in this chapter in security research or systems analysis.

414    Chapter 12

---

## Testing Privileges and Logon Account Rights

I mentioned in Chapter 10 that you can use the Add-NetAccountRight command to add a SID to the list of account rights. Now that we know how to authenticate a user, let's use this command to explore these account rights. In Listing 12-10, we assign privileges and logon account rights to a new user. Run these commands as an administrator.

```bash
PS> $password = Read-Host -AsSecureString -Prompt "Password"
  $password: **********
  PS> $user = New-LocalUser -Name "Test" -Password $password
  PS> $id = $user.Sid.Value
  PS> $token = Get-NtToken -Logon -User $user.Name -SecurePassword $password
  -LogonType Interactive
  PS> $token.ElevationType
  Default
  PS> $token.Close()
  PS> Add-NtAccountRight -Privilege SeDebugPrivilege -Sid $sid
  PS> $token = Get-NtToken -Logon -User $user.Name -SecurePassword $password
  -LogonType Interactive
  PS> Enable-NtTokenPrivilege -Token $token SeDebugPrivilege -PassThru
  ♦ WARNING: Couldn't set privilege SeDebugPrivilege
  PS> $token.ElevationType
  Limited
  PS> $token.Close()
  PS> $token = Get-NtToken -Logon -User $user.Name -SecurePassword $password
  -LogonType Network
  PS> Enable-NtTokenPrivilege -Token $token SeDebugPrivilege -PassThru
  Name        Luid                Enabled
  -----        -----                -----
  ♦ SeDebugPrivilege 00000000-00000014 True
  PS> $token.ElevationType
  Default
  PS> $token.Close()
  PS> Add-NtAccountRight -LogonType SeDenyInteractiveLogonRight -Sid $sid
  PS> Add-NtAccountRight -LogonType SeBatchLogonRight -Sid $sid
  PS> Get-NtToken -Logon -User $user.Name -SecurePassword $password
  -LogonType Interactive
  Get-NtToken : (0x80070569) - Logon failure: the user has not been granted
  the requested logon type at this computer.
  PS> $token = Get-NtToken -Logon -User $user.Name -SecurePassword $password
  -LogonType Batch
  PS> Get-NtTokenGroup $token | Where-Object {$_Sid.Name -eq
    "NT AUTHORITY(BATCH)"
  $id       :   S-1-5-3
  Attributes : Mandatory, EnabledByDefault, Enabled
  Enabled    : True
  Mandatory : True
```

Interactive Authentication   415

---

```bash
DenyOnly   : False
  @ Name      : NT AUTHORITY\BATCH
  P5> $token.Close()
  @ P5> Remove-NTAccountRight -Privilege SeDebugPrivilege -Sid $sid
  P5> Remove-NTAccountRight -LogonType SeDenyInteractiveLogonRight -Sid $sid
  P5> Remove-NTAccountRight -LogonType SeBatchLogonRight -Sid $sid
  P5> Remove-LocalUser $user
```

Listing 12-10: Assigning account rights to a new user

We start by creating a new user ❶ and testing that we can authenticate interactively ❷. We can do so because the user is automatically part of the BUILTIN Users group, which has $InternationalGoogleRight by default. We also check that the token hasn't been filtered for UAC by looking at the ElevationType parameter, which shows up as Default, indicating that no filtering took place.

Next, we assign the user the SeDebugPrivilege privilege ❶. This is a high-level privilege, so we should expect the LSA to perform UAC filtering. We find this to be the case when we authenticate the user: we can't enable SeDebugPrivilege, since it's been filtered ❶, and the ElevationType is now set to Limited.

However, we can instead use network authentication ❸, which isn't subject to the default UAC filtering rules. We can now enable SeDebugPrivilege ❹, and the ElevationType becomes Default once again, indicating that no filtering took place.

We then test the logon account rights. Remember that the user is granted SeInteractiveLogonRight because they are a member of the BUILTINUsers group. We can't remove that logon right without also removing them from that group, so instead we explicitly deny it to the specific user by adding their SID to the SebonyInteractiveLogonRight ❷ . Then we verify the intended behavior by trying to log on interactively ❸ , which now returns an error.

We also added the user's SID to the SetBatchLogonRight, which allows them to authenticate as a batch logon session. Normally, only members of the Administrators group receive this access right. We verify we've authenticated as a batch logon session by checking for the NT AUTHORITYBATCH group that the LSA assigns .

Finally, we clean up the account right assignments using the Remove-Wt Accountright command . This isn't strictly necessary, as the LSA will clean up the assignments when the local user is removed, but I've included the operations here to demonstrate the use of the command.

## Creating a Process in a Different Console Session

In certain scenarios, you might want to start a process inside a different console session. For example, if you're running code in a system service using session 0, you might want to show a message on the currently authenticated user's desktop.

To successfully create a process on another desktop, you need SetCb


Privilege to change a token's session ID and SetAssignPrimaryTokenPrivilege to


create the process. By default, an administrator user has neither of these

416    Chapter 12

---

privileges, so to test the example code provided here you'll need to run PowerShell as the SYSTEM user.

First run the following command as an administrator to create a shell process on your desktop with the required privileges:

```bash
PS> Start-Win32ChildProcess ((Get-NTProcess -Current).Win32ImagePath)
-RequiredPrivilegeSetPrivileges %AsSignPrimaryTokenPrivilege
```

Next, make sure that you have two users authenticated at the same time on different desktops on the same machine. If you use Fast User Switching, you'll be able to easily confirm that a process was created on each desktop.

Listing 12-11 starts by finding the console session for the new process. Run these commands as the SYSTEM user.

```bash
PS> $username = "GRAPHITEUser"
  P5> $console = Get-NtConsoleSession |
Where-Object FullyQualifiedUserName -eq $username
  PS> $token = Get-NtToken -Duplicate -TokenType Primary
  PS> Enable-NtTokenPrivilege SetichPrivilege
  PS> $token.SessionId = $console.SessionId
  PS> $cmd = "cmd.exe"|
  PS> $proc = New-Wing32Process $cmd -Token $token -Desktop "WinStao\Default"|
  -CreationFlags NewConsole
  P5> $proc.Process.SessionId -eq $console.SessionId
  True
  PS> $proc.Dispose()
  PS> $token.Close()
```

Listing 12-11: Creating a new process in a different console session

We start by selecting the console session belonging to a user named GRAPHITE,user ❶ . We then create a duplicate of our current token (which belongs to the SYSTEM user), enable SetC#Privileges , and assign the console session ID to the token ❷ .

With this new token, we can create a new process using the New-iro32 Process command, specifying the Token parameter . In this case we're creating a copy of Notepad, but you can change this process to any application you'd like by altering the command. Also note that we set the name of the window station and desktop, separated by a backslash, for the new process. Using WinS32a0 and default, respectively, ensures that we create the application on the default desktop; otherwise, the user interface would be hidden.

We can verify that we've created the process in the target session by comparing the expected session ID with the actual session ID assigned to the process . In this case, the comparison returns True , which indicates success. If you now switch back to the other user, you should find a copy of Notepad running as the SYSTEM user on the desktop.

## Authenticating Virtual Accounts

In Chapter 10, I mentioned that you can create your own SID-to-name mappings in the LSA using the Add-NSIDname command. Once you've set up a

Interactive Authentication   417

---

mapping, you can also create a new token for that SID through lsalogonUser. Listing 12-12 demonstrates run these commands as an administrator.

```bash
PS>$domain_sid = Get-NtSid "5-1-5-99" @
PS>$group_sid = Get-NtSid -BaseSid $domain_sid -RelativeIdentifier 0
PS>$user_sid = Get-NtSid -BaseSid $domain_sid -RelativeIdentifier 1
PS>$domain = "CUSTOMDOMAIN"
PS>$group = "ALL USERS"
PS>$user = "USER"
PS>$token = Invoke-NtToken -System { @
    Add-NtSidName -Domain $domain -Sid $domain_sid -Register @
    Add-NtSidName -Domain $domain -Name $group -Sid $group_sid -Register
    Add-NtSidName -Domain $domain -Name $user -Sid $user_sid -Register
    Add-NtAccountRight -Sid $user_sid -LogonType SeInteractiveLogonRight @
    Get-NtToken -Logon -Domain $domain -User $user -LogonProvider Virtual
    -LogonType Interactive @
    Remove-NtAccountRight -Sid $user_sid -LogonType SeInteractiveLogonRight @
    Remove-NtSidName -Sid $domain_sid -Unregister
}$
PS> Format-NtToken $token -User -Group
USER INFORMATION
-----------------
Name
-------   Sid
----     ----
CUSTOMDOMAIN\User 5-1-5-99-1 @
GROUP SID INFORMATION
-----------------
Name
-------   ----------------
Attributes
Mandatory Label Medium Mandatory Level Integrity, IntegrityEnabled
Everyone                Mandatory, EnabledByDefault, Enabled
BUILTIN\Users                Mandatory, EnabledByDefault, Enabled
NT AUTHORITY\INTERACTIVE      Mandatory, EnabledByDefault, Enabled
NT AUTHORITY\Authenticated Users   Mandatory, EnabledByDefault, Enabled
NT AUTHORITY\This Organization      Mandatory, EnabledByDefault, Enabled
NT AUTHORITY\LogonSessionId_0_10173   Mandatory, EnabledByDefault, Enabled, LogonId
CUSTOMDOMAIN_ALL USERS        Mandatory, EnabledByDefault, Enabled @
```

Listing 12-12: Creating a virtual account token

We start by setting up some parameters to use in later commands ❶ . We create three SIDs: the domain, a group, and a user. These values don't need to reflect real SIDs or names. We then need to add the SIDs and create a token, all of which requires SetCpbPrivilege , so we impersonate a SYSTEM token ❷ .

We register the three SIDs using the Add-AtSidName command . Note that you must specify the Register parameter; otherwise, you'll merely add the SID to the PowerShell module's name cache and won't register it with LSASS. Once we've added the SIDs, we need to grant the user SeInteractiveLogonRight so that we can authenticate them and receive a token . You could choose a different logon right, such as SeServiceLogonRight, if you wanted.

---

We can now authenticate the user via LSalogonUser by using Get-NTToken . Make sure to specify the Virtual logon provider and the Interactive logon type. You don't need to specify a password, but you can't perform the operation without SetchPrivilege.

Before we finish impersonating, we remove the logon right and then delete the domain SID ❸. Deleting the domain SID will also delete the group and user SIDs automatically.

Finally, we format the token. Now we can see that the user SID is the virtual SID we created ❸ , and that the token is automatically granted the group SID as well ❹ . Note that if we hadn't added the SID-to-name mapping for the group SID, we'd still be granted it, but the SID would not be resolvable to a name. We can now impersonate the token or use it to create a new process running under that user identity.

## Wrapping Up

As you've seen, interactive authentication, the process used to access the Windows desktop, is an extremely complicated topic. The authentication process requires a combination of a user interface, which collects the credentials, and the Winlogon process, which calls the LSA's ISalogon-user API. Once the API has validated the user's credentials, it creates a new logon session, along with a token that Winlogon can use to create the user's initial processes. The logon session can also cache the credentials so the user won't need to re-enter them to access network services.

Next, we defined the differences between local authentication and domain authentication. We only touched on how authentication works with Netlogon here, but we'll cover the more common Kerberos in Chapter 14. With an understanding of the basic authentication mechanisms in hand, we discussed how the LSA uses the user information to build a token, including how it assigns groups and privileges and how UAC results in token filtering for administrators.

We then discussed how to call the LsaologonUser API using the PowerShell module's Get-NTToken command. We saw that we can use the token returned from the API to impersonate a user, because the LSA sets the token's origin ID to the caller's authentication ID. We also saw how to create a new process as a different user via the CreateProcessWithLogon API, exposed through the New-Wmi32Process command.

Finally, we looked briefly at the Service logon type and the four accounts that the LSA predefines. The service control manager uses these for its system service processes. In the next chapter, we'll begin exploring how network authentication allows a user to authenticate to another Windows system. This will also allow us to understand the protocols used by domain authentication.

---



---

