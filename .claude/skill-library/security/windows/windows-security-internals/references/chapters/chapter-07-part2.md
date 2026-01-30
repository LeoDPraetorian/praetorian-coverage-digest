## Sandboxing

In Chapter 4, we covered two types of sandbox tokens: restricted and lowbox. These sandbox tokens modify the access check process by adding more checks. Let's discuss each token type in more detail, starting with restricted tokens.

### Restricted Tokens

Using a restricted token affects the access check process by introducing a second owner and a discretionary access check against the list of restricted SIDs. In Listing 7-19, we modify the owner SID check in the Resolve-Token OwnerAccess function to account for this.

```bash
if (!(Test-NtTokenGroup -Token $token -Sid $sd_owner.Sid)) {
      return
    }
  if ($token.Restricted -and
  !(Test-NtTokenGroup -Token $token -Sid $sd_owner.Sid -Restricted)) {
      return
    }
```

Listing 7-19: The modified Get-TokenOwner access check for restricted tokens

We first perform the existing SID check ❶ . If the owner SID isn't in the list of token groups, then we don't grant ReadControl or WriteDac access. Next is the additional check ❷ : if the token is restricted, then we check the list of restricted SIDs for the owner SID and grant the token ReadControl and WriteDac access only if the owner SID is in both the main group list and the restricted SID list.

We'll follow the same pattern for the discretionary access check, although for simplicity, we'll add a Boolean Restricted switch parameter to the Get-DiscretionaryAccess function and pass it to any call to Test-MtTokenGroup. For example, we can modify the allowed ACE check implemented in Listing 7-17, so it looks as shown in Listing 7-20.

---

```bash
"Allowed" {
   if (Test-NtTokenGroup -Token $token $sid -Restricted:$Restricted) {
      $access = Revoke-NtAccessMask $access $ace.Mask
    }
  }
```

Listing 7-20: The modified Allowed ACE type for restricted tokens

In Listing 7-20, we set the Restricted parameter to the value of a parameter passed into Get-DiscretionaryAccess. We now need to modify the Get-PSGrantedAccess function defined in Listing 7-2 to call Get-DiscretionaryAccess twice for a restricted token (Listing 7-21).

```bash
# $RemainingAccess = $Context.RemainingAccess
Get-DiscretionaryAccess $Context
# $success = Test-NTAccessMask $Context.RemainingAccess -Empty
# if ($success -and $Token.Restricted) {
   # if (!$token.WriteRestricted -or
     (Test-NTAccessMask $RemainingAccess -WriteRestricted $GenericMapping)) {
        $Context.RemainingAccess = $RemainingAccess
       # Get-DiscretionaryAccess $Context -Restricted
        $success = Test-NTAccessMask $Context.RemainingAccess -Empty
    }
# if ($success) {
     return Get-AccessResult STATUS_SUCCESS $Context.Privileges $DesiredAccess
}
   return Get-AccessResult STATUS_ACCESS_DENIED
```

Listing 7-21: The Get-PSGrantedAccess function modified to account for restricted tokens

We first capture the existing RemainingAccess value ❶ , as the discretionary access check will modify it and we want to repeat that check a second time. We then run the discretionary access check and save the result in a variable ❷ . If this first check succeeded and the token is restricted, we must perform a second check ❸ . We also need to consider whether the token is write restricted and whether the remaining access includes write access ❹ . We look for write access by checking the passed generic mapping. (Note that the owner checks doesn't perform a write check, so in theory it could grant the token writeAccess access, which is considered a form of write access.)

Next we run the check again, this time with the Restricted parameter to indicate that the restricted SIDs should be checked ❸. If this second check also passes, we set the $success variable to True and grant access to the resource ❸.

Keep in mind that the restricted SID check applies to both Allowed and Denied ACE types. This means that if the DACL contains a Denied ACE that references a SID in the restricted SID list, the function will deny access, even if the SID isn't in the normal group list.

---

## Lowbox Tokens

The access check process for a lowbox token resembles that for a restricted token. A lowbox token can contain a list of capability SIDs used to perform a second check, like the check we performed with the list of restricted SIDs. Likewise, if the access check process doesn't grant access through both normal and capability checks, the access check fails. However, the lowbox token's access check contains some subtle differences:

- • It will consider the token's package SID in addition to its list of capabil-
ity SIDs.
• The checked capability SIDs must have the enabled attribute flag set to
be considered active.
• The check applies only to Allowed ACE types, not to Denied ACE types.
• NULL DACLs do not grant full access.
In addition, two special package SIDs will match any token's package SID for the purposes of the package SID check:

- • ALL APPLICATION PACKAGES (s-1-15-2-1)
• ALL RESTRICTED APPLICATION PACKAGES (s-1-15-2-2)
Checking for the ALL APPLICATION PACKAGES SID during the package SID check can be disabled if the token used for the access check has the WINNT_NOALLAPPPKG security attribute set to a single value of 1. In this case, the package SID check will only consider the ALL RESTRICTED APPLICATION PACKAGES SID. If the security attribute isn't present or is set to 0, the access check considers both special package SIDs. Microsoft refers to processes with this security attribute as running a Less Privileged AppContainer (LPAC).

Because setting a token's security attribute requires the SetchPrivilege privilege, the process creation APIs have an option for adding the WIN// NOALLAPPPPG security attribute to a new process's token. Listing 7-22 shows a basic implementation of the lowbox access check for Allowed ACE types. You should add this code to the discretionary access check in Listing 7-17, in the locations indicated in the comments.

```bash
## Add to start of Get-DiscretionaryAccess.
$ac_access = $context.DesiredAccess
if (!{$token.AppContainer} {
    $ac_access = Get-NtAccessMask 0
}
## Replace the Allowed case in the ACE switch statement.
"Allowed" {
   if (Test-NtTokenGroup -Token $token -$id -Restricted:$Restricted) {
     } $access = Revoke-NtAccessMask $access $ace.Mask
   } else {
     } if ($Restricted) {
         break
     }
```

---

```bash
⃝if (Test-NtTokenGroup -Token $token $sid -Capability) {
         ⃝$ac_access = Revoke-NtAccessMask $ac_access $ace.Mask
        }
        }
  ## Add at end of ACE loop.
  ⃝$effective_access = $access -bor $ac_access
```

Listing 7-22: An implementation of the lowbox access check for AIlowed ACEs

The first test verifies whether the SID is in the token's group list. If it finds the SID in the group list, it removes the mask from the remaining access check ❶ . If the group test fails, we check whether it's a package or capability SID. We must ensure that we're not checking whether we're in the restricted SID mode ❷ , as this mode doesn't define lowbox checks.

Our check for the capability SIDs includes the package SID and the ALL APPLICATION PACKAGESID . ❸ If we find a match, we remove the mask from the remaining access ❹ . However, we need to maintain separate remaining access values for normal SIDs and AppContainer SIDs. Therefore, we create two variables, $access and $ac _ access. We initialize the $ac _ access variable to the value of the original DesiredAccess , not the current remaining access, as we won't grant owner rights such as writeAccess unless the SID also matches an Allowed package or capability SID ACE. We also modify the loop's exit condition to consider both remaining access values ❹ ; they must both be empty before we exit.

Next, we'll add some additional checks to better isolate AppContainer processes from existing low integrity level sandboxes, such as Internet Explorer's protected mode. The first change we implement affects the mandatory access check. If the check fails for a lowbox token, we then check the security descriptor's integrity level a second time. If the integrity level is less than or equal to Medium , we assume that the check succeeds. This is even though lowbox tokens have a low integrity level, as demonstrated in Chapter 4 , which would normally prevent write access to the resource. This behavior allows a more privileged application to grant a lowbox token access to a resource while blocking low integrity level sandboxes.

Listing 7-23 demonstrates this behavior.

```bash
♦ PS> $sd = New-NtSecurityDescriptor -Owner "BA" -Group "BA" -Type Mutant
PS> Add-NtSecurityDescriptorAce $sd -KnownSid World -Access GenericAll
PS> Add-NtSecurityDescriptorAce $sd -KnownSid AllApplicationPackages
-Access GenericAll
PS> Edit-NtSecurityDescriptor $sd -MapGeneric
♦ PS> Set-NtSecurityDescriptorIntegrityLevel $sd Medium
PS> Use-NtObject($token = Get-NtToken -Duplicate -IntegrityLevel Low) {
        Get-NtGrantedAccess $sd -Token $token -AsString
} ♦ ModifyState|ReadControl|Synchronize
```

---

```bash
PS: $id = Get-NtSid -PackageName "mandatory_access_lowbox_check" 
PS: Use-NTObject($token = Get-NtToken -LowBox -PackageSid $id) {
        Get-NtGrantedAccess $sd -Token $token -AsString
@ Full Access
```

Listing 7-23: The behavior of a mandatory access check against a lowbox token

We start by building a security descriptor that grants GenericAll access for the Everyone and ALL APPLICATION PACKAGES groups ❶ . We also set an explicit integrity level of Medium ❸ , although this isn't necessary, as Medium is the default for security descriptors without a mandatory label ACE. We then perform an access check using a low integrity level token, and we receive only read access to the security descriptor ❸ . Next, we try the access check again with a lowbox token; although the token's integrity level is still low , the token is granted full Access ❹ .

The second change we implement is that if the DACL contains a package SID we deny access to the low integrity level token, regardless of the security descriptor's integrity level or DACL. This mechanism blocks access to resources that are assigned the default DACL, as the package SID is added to the default DACL when a lowbox token is created. Listing 7-24 tests this behavior.

```bash
#  PS$ sid = Get-NtSid -PackageName "package_sid_low_il_test"
#  PS$token = Get-NtToken -LowBox -PackageSide $sid
#  PS$sd = New-NtSecurityDescriptor -Token $token -Type Mutant
#  PS$fmt = Format-NtSecurityDescriptor $sd -Summary -SecurityInformation Dacl, Label
#  <ACL>
#  GRAPHITEUser: (Allowed)(None)(Full Access)
#  NT AUTHORITYSYSTEM: (Allowed)(None)(Full Access)
#  NTAUTHORITYLOGONSessionId_0_109260: (Allowed)(None)(ModifyState|...)
#  package_sid_low_il_test: (Allowed)(None)(Full Access)
#  <Mandatory Label>
#  Mandatory Label\Low Mandatory Level: (MandatoryLabel)(None)(NoWriteUp)
#  PS$Get-NtGrantedAccess $sd -Token $token -AsString
#  Full Access
#  PS$token.Close()
#  PS$low_token = Get-NtToken -Duplicate -IntegrityLevel Low
#  PS$Get-NtGrantedAccess $sd -Token $low_token -AsString
#  None
```

Listing 7-24: Verifying the behavior of the package SID for Low integrity level tokens

We start by creating a lowbox token ❶ . The token does not have any added capability SIDs, only the package SID. Next, we build a default security descriptor from the lowbox token ❷ . When inspecting the entries in the security descriptor, we see that the current user SID ❸ and the package SID ❹ have been granted Full Access . As a lowbox token has Low integrity

---

level, the security descriptor inheritance rules require the integrity level to be added to the security descriptor ❸.

We then request the granted access for the security descriptor based on the lowbox token and receive Full Access ⃝ . Next, we create a duplicate of the current token but set its integrity level to Low . We now get a granted access of None ⃝ , even though we expected to receive full Access based on the integrity level ACE in the security descriptor. In this case, the presence of the package SID in the security descriptor blocked access.

One final thing to note: as the sandbox access checks are orthogonal, it's possible to create a lowbox token from a restricted token, causing both lowbox checks and restricted SID checks to occur. The resulting access is the most restrictive of all, making for a stronger sandbox primitive.

## Enterprise Access Checks

Enterprise deployments of Windows often perform some additional access checks. You won't typically need these checks on stand-alone installations of Windows, but you should still understand how they modify the access check process if present.

### The Object Type Access Check

For simplicity's sake, one thing I intentionally removed from the discretionary access check algorithm was the handling of object ACEs. To support object ACEs, you must use a different access check API: either

SeAccessCheckByType in kernel mode or the NTAccessCheckByType system call. These APIs introduce two additional parameters to the access check process:

Principal A SID used to replace the SELFSID in ACEs ObjectTypes A list of GUIDs that are valid for the check

The Principal is easy to define: when we're processing the DACL and we encounter an ACE's SID that's set to the SELFSID (0-1-5 10), we replace the SID with a value from the Principal parameter. (Microsoft introduced the SELFSID for use in Active Directory; we'll discuss its purpose in more detail in Chapter 11.) Listing 7-25 shows an adjusted version of the Get-AceID function that takes this into account. You'll also have to modify the Get-PS GrantedAccess function to receive the Principal parameter by adding it to the $Context value.

```bash
function Get-AceSid (
    Param (
        $Ace,
        $Owner,
        $Principal
    )
```

---

```bash
$id = $Acre.Sid
   if ((Compare-NtSid $sid -KnownSid OwnerRights) {
       $id = $Owner
   }  if ((Compare-NtSid $sid -KnownSid Self) -and ($null -NE $Principal)) {
       $id = $Principal
   }
   return $id
}
```

Listing 7-25: Adding the principal SID to the Get-AceSid function Listing 7-26 tests the behavior of the Principal SID

```bash
# PS> $owner = Get-NtSid -KnownSid localSystem
# PS> $sd = New-NtSecurityDescriptor -Owner $owner -Group $owner -Type Mutant
# PS> Add-NtSecurityDescriptorAce $sd -KnownSid Self -Access GenericAll
# -MapGeneric
# PS> Get-NtGrantedAccess $sd -AsString
# None
# PS> $principal = Get-NtSid
# PS> Get-NtGrantedAccess $sd -Principal $principal -AsString
# Full Access
```

Listing 7-26: Testing the Principal SID replacement

We start by creating a security descriptor with the owner and group set to the SYSTEM-user SID and a single ALLOWED ACE that grants the SELFSID GenericAll access ❶ . Based on the access-checking rules, this should not grant the user any access to the resource. We can confirm that this is the case with a call to Get-mTGantedAccess ❷ .

Next, we get the effective token's user SID and pass it in the Principal parameter to Get-MigratedAccess ❶. The DACL check will then replace the SELFSID with the Principal SID, which matches the current user and therefore grants Full Access. This check replaces SIDs in the DACL and SACL only; setting SELFS as the owner SID won't grant any access.

The other parameter, ObjectTypes, is much trickier to implement. It provides a list of GUIDs that are valid for the access check process. Each GUID represents the type of an object to be accessed; for example, you might have a GUID associated with a computer object and a different one for a user object.

Each GUID also has an associated level, turning the list into a hierarchical tree. Each node maintains its own remaining access, which it initializes to the main RemainingAccess value. Active Directory uses this hierarchy to implement a concept of properties and property sets, as shown in Figure 7-4.

250    Chapter 7

---

![Figure](figures/WindowsSecurityInternals_page_281_figure_000.png)

Figure 7-4: Active Directory-style properties

Each node in Figure 7-4 shows the name we've given it, a portion of the ObjectType GUID, and the current RemainingAccess value (in this case,


GenericAll). Level 0 corresponds to the top-level object, of which there can be only one in the list. At level 1 are the property sets, here numbered 1 and 2. Below each property set, at level 2, are the individual properties.

Setting up the object types in a hierarchy enables us to configure a security descriptor to grant access to multiple properties using a single ACE by setting the access on the property set. If we grant a property set some access, we also grant that access to all properties contained in that set. Conversely, if we deny access to a single property, the deny status will propagate up the tree and deny access to the entire property set and object as a whole.

Let's consider a basic implementation of object type access. The code in Listing 7-27 relies on an ObjectTypes property added to the access context. We can generate the values for this parameter using the New-ObjectTypeTree and Add-ObjectTypeTree commands, whose use we'll cover on page 254.

Listing 7-27 shows the access check implementation for the AllowedObject ACE type. Add it to the ACE enumeration code from Listing 7-17.

```bash
"AllowedObject" {
  } if (!(Test-NtTokenGroup -Token $token $sid)) {
      break
    }
  } if ($null -eq $Context.ObjectTypes -or $null -eq $ace.ObjectType) {
      break
    }
  } $object_type = Select-ObjectTypeFree $Context.ObjectTypes
   if ($null -eq $object_type) {
      break
    }
```

---

```bash
Bvoke-ObjectTypeTreeAccess $object_type $ace.Mask
  $access = Revoke-NtAccessMask $access $ace.Mask
}
```

Listing 7-27: An implementation of the AllowedObject ACE access check algorithm

We start with the SID check ❶ . If the SIDs don't match, we don't process the ACE. Next, we check whether the ObjectTypes property exists in the context and whether the ACE defines an ObjectType ❷ (the ObjectType on the ACE is optional). Again, if these checks fail, we ignore the ACE. Finally, we check whether there is an entry in the ObjectTypes parameter for the ObjectType GUID ❸ .

If all checks pass, we consider the ACE for the access check. First we revoke the access from the entry in the tree of objects . This removes the access not only from the ObjectType entry we found but also from any children of that entry. We also revoke the access we're maintaining for this function.

Let's apply this behavior to the tree shown in Figure 7-4. If the


AllowObject ACE grants GenericAll access to property set 1, the new tree will look like the one in Figure 7-5.

![Figure](figures/WindowsSecurityInternals_page_282_figure_005.png)

Figure 7-5: The object type tree after access is granted to property set 1

As the GenericAll access has been removed from the RemainingAccess for property set 1, it's also been removed for properties X and Y. These nodes now have an empty RemainingAccess. Note that for Allowed ACEs only the main RemainingAccess matters, as the tree's purpose is to handle Denied ACEs correctly. This means that not every object type must have a RemainingAccess of 0 for the access check to succeed.

Now let's handle the DmediaObject ACE. Add the code in Listing 7-28 to the existing ACE enumeration code in Listing 7-17.

---

```bash
"DeniedObject"
  ● if (!((Test-NtTokenGroup -Token $token $sid -DenyOnly)) {
      break
  }
  ● if ($null -ne $context.ObjectTypes) {
      if ($null -eq $ace.ObjectType) {
          break;
      }
      $object_type = Select-ObjectTypeTree $context.ObjectTypes
$ace.ObjectType
      if ($null -eq $object_type) {
          break
      }
  ● if (Test-NtAccessMask $object_type.RemainingAccess $ace.Mask) {
          $continue_check = $false
          break
  }
  ● if (Test-NtAccessMask $access $ace.Mask) {
          $continue_check = $false
      }
  }
```

Listing 7-28: An implementation of the DeniedObject ACE access check algorithm

As usual, we begin by checking all ACEs with the DeniedObject type 1 . If the check passes, we next check the ObjectTypes context property 2 . When we handled the AllNewObject ACE, we stopped the check if the ObjectType property was missing. However, we handle the DeniedObject ACEs differently. If there is no ObjectTypes property, the check will continue as if it were a normal Denied ACE, by considering the main RemainingAccess 4 .

If the ACE's access mask contains bits in the RemainingAccess, we deny access . If this check passes, we check the value against the main RemainingAccess. This demonstrates the purpose of maintaining the tree: if the Denied ACE matched property X in Figure 7 - 5 , the denied mask would have no effect. However, if the Denied ACE matched property Z, then that object type, and by association property set 2 and the root object type, would be denied as well. Figure 7 - 6 demonstrates this; you can see that those nodes are all now denied, even though the property set 1 branch is still allowed.

---

![Figure](figures/WindowsSecurityInternals_page_284_figure_000.png)

Figure 7-6: The object type tree after denying access to property Z

The NT@accessCheckByType system call returns a single status and granted access for the entire list of object types, reflecting the access specified at the root of the object type tree. Therefore, in the case of Figure 7-6, the whole access check would fail.

To figure out which particular object types failed the access check, you can use the %AccessCheckByTypeResultList system call, which returns a status and the granted access for every entry in the object type list. Listing 7-29 shows how you can use this system call by specifying the ResultList parameter to Get-NTGrantedAccess.

```bash
# PS> $tree = New-ObjectTypeTree (New-Guid) -Name "Object"
# PS> $set_t = Add-ObjectTypeTree $tree (New-Guid) -Name "Property Set 1"
    -PassThru
# PS> $set_2 = Add-ObjectTypeTree $tree (New-Guid) -Name "Property Set 2"
    -PassThru
# PS> Add-ObjectTypeTree $set_1 (New-Guid) -Name "Property X"
# PS> Add-ObjectTypeTree $set_1 (New-Guid) -Name "Property Y"
# PS> $prop_z = New-Guid
# PS> Add-ObjectTypeTree $set_2 $prop_z -Name "Property Z"
# PS>
$owner = Get-NtSld -KnownSid localSystem
# PS> $sd = New-NtSecurityDescriptor -Owner $owner -Group $owner -Type Mutant
# PS> Add-NtSecurityDescriptorAce $sd -KnownSid World -Access WriteOwner
    -MapGeneric -Type DeniedObject -ObjectType $prop_z
# PS> Add-NtSecurityDescriptorAce $sd -KnownSid World
    -Access ReadControl, WriteOwner -MapGeneric
# PS> Edit-NtSecurityDescriptor $sd -CanonicalizeDacI
# PS> Get-NtGrantedAccess $sd -PassResult -ObjectType $tree
    -Access ReadControl, WriteOwner | Format-Table Status, SpecificGrantedAccess,
    Name
            Status      SpecificGrantedAccess    Name
            ---------------------------        -----
# STATUS_ACCESS_DENIED
                            None    Object
```

---

```bash
0 PS> Get-NTGrantedAccess $d -PassResult -ResultList -ObjectType $tree
    -Access ReadControl, WriteOwner | Format-Table Status, SpecificGrantedAccess,
  Name
               ◦ Status        SpecificGrantedAccess      Name
                -----------------                ---------                -----
STATUS_ACCESS_DENIED        ReadControl Object
      STATUS_SUCCESS  ReadControl, WriteOwner Property Set 1
      STATUS_SUCCESS  ReadControl, WriteOwner Property X
      STATUS_SUCCESS  ReadControl, WriteOwner Property P
    STATUS_ACCESS_DENIED        ReadControl Property Set 2
    STATUS_ACCESS_DENIED        ReadControl Property Z
```

Listing 7.29: Example showing the difference between normal and list results

We start by building the object type tree to match the tree in Figure 7-4 ❶ . We don't care about the specific GUID values except for that of property Z, which we'll need for the DeniedObject ACE, so we generate random GUIDs. Next, we build the security descriptor, creating an ACE that denies ReadControl access to property Z ❶ . We also include a non-object ACE to grant ReadControl and WrittenOver access.

We first run the access check with the object type tree but without the ResultSet parameter, requesting both ReadContent and WriteOver access ❸. We use the Denied ACE, as it matches an ObjectType GUID in the object type tree. As we expected, this causes the access check process to return STATUS ACCESS_DENIED, with None as the granted access ❹.

When we execute the access check again, this time with ResultSet, we receive a list of access check results . The top-level object entry still indicates that access was denied, but access was granted to property set 1 and its children . This result corresponds to the tree shown in Figure 7-6. Also note that the entries for which access was denied don't show an empty granted access; instead, they indicate that ReadControl access would have been granted if the request had succeeded. This is an artifact of how the access check is implemented under the hood and almost certainly shouldn't be used.

## The Central Access Policy

The central access policy, a feature added in Windows 8 and Windows Server 2012 for use in enterprise networks, is the core security mechanism behind a Windows feature called Dynamic Access Control . It relies on device and user claim attributes in the token.

We talked briefly about user and device claims in Chapter 4, when discussing the conditional expression format. A user claim is a security attribute added to the token for a specific user. For example, you might have a claim that represents the country in which a user is employed. You can sync the value of the claim with values stored in Active Directory so that if the user, say, moves to another country, their user claim will update the next time they authenticate.

A device claim belongs to the computer used to access the resource. For example, a device claim might indicate whether the computer is located in a secure room or is running a specific version of Windows. Figure 7-7 shows a

The Access Check Process 255

---

common use of a central access policy: restricting access to files on a server in an enterprise network.

![Figure](figures/WindowsSecurityInternals_page_286_figure_001.png)

Figure 7-7. A central access policy on a file server

This central access policy contains one or more security descriptors that the access check will consider in addition to a file's security descriptor. The final granted access is the most restrictive result of the access checks. While not strictly necessary, the additional security descriptors can rely on user and device claims in AllowedCallback ACEs to determine the granted access. The enterprise's Kerberos authentication must be configured to support the claims in order to send them over the network. We'll come back to Kerberos authentication in Chapter 14.

You might wonder how using a central access policy differs from simply configuring the security of the files to use the device and user claims. The main difference is that it's managed centrally using policies in the enterprise domain group policy. This means an administrator can change the central access policy in one place to update it across the enterprise.

A second difference is that the central access policy works more like a mandatory access control mechanism. For example, a user might typically be able to modify the security descriptor for the file; however, the central access policy could restrict their access or block it outright if, for example, the user moved to a new country or used a different computer not accounted for in the rules.

256    Chapter 7

---

We won't discuss how to configure a central access policy, as that topic is more appropriate for a book on Windows enterprise management. Instead, we'll explore how it's enforced by the kernel's access check process. The Windows registry stores the central access policy when the computer's group policy is updated, and you can find the key at the following location: HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa\ CentralizedAccessPolicies.

There can be more than one configured policy, each containing the following information:

- ● The name and description of the policy

● A SID that uniquely identifies the policy

● One or more policy rules
In turn, each policy rule contains the following information:

- • The name and description of the rule
• A conditional expression that determines when the rule should be
enforced

• The security descriptor to use in the central access policy access check
• An optional staging security descriptor used to test new policy rules
You can use the Get-CentralAccessPolicy PowerShell command to display the list of policies and rules. For most Windows systems, the command won't return any information. To see results like those in Listing 7-30, you'll need to join a domain that is configured to use a central access policy.

```bash
PS> Get-CentralAccessPolicy
Name                CapId                Description
----                ---------             ---------
Secure Room Policy S-1-17-3260955821-1180564752-... Only for Secure Computers
Main Policy        S-1-17-76010919-1187351633-...
PS> $rules = Get-CentralAccessPolicy | Select-Object -ExpandProperty Rules
PS> $rules | Format-Table
Name                Description AppliesTo
------------------ ---------
Secure Rule Secure!    @RESOURCE.EnableSecure == 1
Main Rule  NotSecure!
PS> $sd = $rules[0].SecurityDescriptor
PS> Format-MtSecurityDescriptor $sd -Type File -SecurityInformation Dacl
<DACL> (Auto Inherit Requested)
- Type   : AllowedCallback
- Name   : Everyone
- SID   : S-1-1-0
- Mask   : 0x001F01FF
- Access : Full Access
- Flags  : None
- Condition: @USER.ad://ext/clearance == "TS/ST3" &&
                          @DEVICE.ad://ext/location = "Secure"
```

Listing 7-30: Displaying the central access policy

The Access Check Process 257

---

Here, when we run Get-CentralAccessPolicy we see two policies, Secure Room Policy and Main Policy. Each policy has a CapID SID and a Rules property, which we can expand to see the individual rules. The output table contains the following fields: Name, Description, and AppliesTo, which is a conditional expression used to select whether the rule should be enforced. If the AppliesTo field is empty, the rule will always be enforced. The AppliesTo field for the Secure Rule selects on a resource attribute, which we'll come back to in Listing 7-32.

Let's display the security descriptor for this rule. The DACL contains a single AllowedCallback ACE that grants full access to the Everyone group if the condition matches. In this case, the clearance user claim must be set to the value 15/53, and the device claim location must be set to Secure.

We'll walk through a basic implementation of the central access policy access check to better understand what the policy is being used for. Add the code in Listing 7-31 to the end of the Get-PKGrantedAccess function from Listing 7-2.

```bash
# if (!$success) {
    return Get-AccessResult STATUS_ACCESS_DENIED
  }
# $capid = $SecurityDescriptor.ScopedPolicyId
if ($null -eq $capid) {
    return Get-AccessResult STATUS_SUCCESS $Context.Privileges -$DesiredAccess
} #policy = Get-CentralAccessPolicy -CapId $capid.Sid
if ($null -eq $policy){
    return Get-AccessResult STATUS_SUCCESS $Context.Privileges -$DesiredAccess
} #effective access = -$DesiredAccess
foreach($rule in $policy.Rules) {
    if ($rule.AppliesTo -ne "") {
        $resource_attrs = $null
        if ($sd.ResourceAttributes.Count -gt 0) {
            $resource_attrs = $sd.ResourceAttributes.ResourceAttribute
    }     #if (!(Test-NtAceCondition -Token $Token -Condition $rule.AppliesTo
  -ResourceAttribute $resource_attrs)) {
        continue
    }
    }$new_sd = Copy-NtSecurityDescriptor $SecurityDescriptor
  @ Set-NtSecurityDescriptorDacI $rule.Sd.DacI
    $Context.SecurityDescriptor = $new_sd
    $Context.RemainingAccess = -$DesiredAccess
  @ Get-DiscretionaryAccess $Context
  @ $effective_access = $effective_access -band (-bnot $Context.RemainingAccess)
}
```

---

```bash
# if (Test-MtAccessMask $effective_access -Empty) {
    return Get-AccessResult STATUS_ACCESS_DENIED
}  ♦return Get-AccessResult STATUS_SUCCESS $Context.Privileges $effective_access
```

Listing 7-31: The central access policy check

Listing 7-31 begins immediately after the discretionary access check. If this check fails, the $success variable will be false, and we should return STATUS_ACCESS_DENIED ❶. To start the process of enforcing a central access policy, we need to query the ScopedPolicyId ACE from the SACL ❷. If there is no ScopedPolicyId ACE, we can return success. We also return success if there is no central access policy with a CapId that matches the ACE's SID ❸.

Within the central access policy check, we first set the effective access to the original DesiredAccess ❸ . We'll use the effective access to determine how much of the DesiredAccess we can grant after processing all the policy rules. Next, we check the AppliesTo conditional expression for each rule. If there is no value, the rule applies to all resources and tokens. If there is a conditional expression, we must check it using Test-NotAnAction , passing any resource attributes from the security descriptor ❸ . If the test doesn't pass, the check should skip to the next rule.

We build a new security descriptor using the owner, group, and SACL from the original security descriptor but the DACL from the rule's security descriptor ❸ . If the rule applies, we do another discretionary access check for the DesiredAccess ❹ . After this check, we remove any bits that we weren't granted from the effective _ access variable ❸ .

Once we've checked all the applicable rules, we test whether the effective access is empty. If it is, the central access policy has not granted the token any access, so we return STATUS_ACCESS_DENIED ❸. Otherwise, we return success, but we return only the remaining effective access that grants less access than the result of the first access check ❹.

While most central access policies are designed to check files, we can modify any resource type to enforce a policy. To enable it for another resource, we need to do two things: set a scoped policy ID ACE with the SID of the policy to enable, and add any resource attribute ACEs to match the

AppliesTo condition, if there is one. We perform these tasks in Listing 7-32.

```bash
P5> $sd = New-NTSecurityDescriptor
  P5> $attr = New-NTSecurityAttribute "EnableSecure" -LongValue 1
  P5> Add-NTSecurityDescriptorAce $d -Type ResourceAttribute -Sid "WD"
     -SecurityAttribute $attr -Flags ObjectInherit, ContainerInherit
  P5> $capid = "5-1-17-3260955821-1180564752-1365479606-2616254494"
  P5> Add-NTSecurityDescriptorAce $d -Type ScopedPolicyId -Sid $capid
     -Flags ObjectInherit, ContainerInherit
  P5> Format-NTSecurityDescriptor $d -SecurityInformation Attribute, Scope
     Type: Generic
     Control: SacLPresent
     <Resource Attributes>
     - Type : ResourceAttribute
     - Name : Everyone
     The Access Check Process    25
```

---

```bash
- SID  : S-1-1-0
  - Mask  : 0x00000000
  - Access: Full Access
  - Flags : ObjectInherit, ContainerInherit
  - Attribute: "EnableSecure",T1,0x0,1
  <Scoped Policy ID>
  - Type  : ScopedPolicyId
  - Name  : S-1-17-3260955821-1180564752-1365479606-2616254494
  - SID  : S-1-17-3260955821-1180564752-1365479606-2616254494
  - Mask  : 0x00000000
  - Access: Full Access
  - Flags : ObjectInherit, ContainerInherit
  < PS> Enable-NtTokenPrivilege  SeSecurityPrivilege
  < PS> Set-Win32SecurityByDescriptor $d MACHINE\SOFTWARE\PROTECTED
  < Type RegistryKey - SecurityInformation Scope, Attribute
```

Listing 7-32: Enabling the Secure Room Policy for a registry key

The first thing we need to do is add a resource attribute ACE to satisfy the AppliesTo condition for the Secure Rule. We create a security attribute object with the name EnableSecure and a single Int64 value of 1 . We add this security attribute to an ACE of type ResourceAttribute in the security descriptor's SACL . We then need to set the SID of the central access policy, which we can get from the output of the Get-CentralAccessPolicy command in a ScopedOutlyAdd ACE . We can format the security descriptor to check that the ACEs are correct.

We now set the two ACEs to the resource. In this case, the resource we'll pick is a registry key ❶ . Note that you must have previously created this registry key for the operation to succeed. The SecurityInformation parameter must be set to Scope and Attribute. As we observed in Chapter 5, to set the ScopedPolicyId ACE, we need AccessSystemSecurity access, which means we need to first enable SecSecurityPrivilege ❸ .

If you access the registry key, you should find the policy to be enforced. Note that because the central access policy is configured for use with filesystems, the access mask in the security descriptor might not work correctly with other resources, such as registry keys. You could manually configure the attributes in Active Directory if you really wanted to support this behavior.

One final thing to mention is that central access policy rules support specifying a staging security descriptor as well as the normal security descriptor. We can use this staging security descriptor to test an upcoming security change before deploying it widely. The staging security descriptor is checked in the same way as the normal security descriptor, except the result of the check is used only to compare against the real granted access, and an audit log is generated if the two access masks differ.

---

## Worked Examples

Let's finish with some worked examples using the commands you've learned about in this chapter.

### Using the Get-PSGrantedAccess Command

Throughout this chapter, we've built our own implementation of the access check process: the Get-PsGrantedAccess command. In this section, we'll explore the use of this command. You can retrieve the module containing it from the chapter_7_access_check_impl.psml file included with the online additional materials for this book.

Because Get-PSGrantedAccess is a simple implementation of the access check, it's missing some features, such as support for calculating maximum access. However, it can still help you understand the access check process. You can, for example, use a PowerShell debugger in the PowerShell Integrated Scripting Environment (ISE) or Visual Studio Code to step through the access check and see how it functions based on different input.

Run the commands in Listing 7-33 as a non-administrator split-token user.

```bash
#! PS> Import-Module ".\chapter_7_access_check_impl.pshtml"
#! PS> $sd = New-NtSecurityDescriptor "0:SYG:SYD:(A;|GR;;\WD)"
  -Type File -MapGeneric
  -PS $type = Get-NtType File
  -PS $desired_access = Get-NtAccessMask -FileAccess GenericRead
  -MapGenericRights
#! PS> Get-PSGrantedAccess -SecurityDescriptor $sd
  -GenericMapping $type.GenericMapping -DesiredAccess $desired_access
  Status        Privileges        ------------------------
  ---------        -----------------
  STATUS_SUCCESS        {}
  #179785
#! PS> $desired_access = Get-NtAccessMask -FileAccess WriteOwner
  PS> Get-PSGrantedAccess -SecurityDescriptor $sd
  -GenericMapping $type.GenericMapping -DesiredAccess $desired_access
  Status        Privileges        ------------------------
  ---------        -----------------
  STATUS_ACCESS_DENIED {}
  #1
#! PS> $token = Get-NtToken -Linked
#! PS> Enable-NtTokenPrivilege -Token $token SeTakeOwnershipPrivilege
  PS> Get-PSGrantedAccess -Token $token -SecurityDescriptor $sd
  -GenericMapping $type.GenericMapping -DesiredAccess $desired_access
  Status        Privileges        ------------------------
  STATUS_SUCCESS        {SeTakeOwnershipPrivilege} $24288
```

Listing 7-33: Using the Get-PSGrantedAccess command

First, we import the module containing the Get-PsdGrantedAccess command. The import assumes the module file is saved in your current directory; if it's not, modify the path as appropriate. We then build a restrictive

The Access Check Process 261

---

security descriptor, granting read access to the Everyone group and nobody else ❷.

Next, we call Get-PSGrantedAccess, requesting GenericRead access along with the File object type's generic mapping . We don't specify a Token parameter, which means the check will use the caller's effective token. The command returns STATUS_SUCCESS, and the granted access matches the desired access we originally passed to it.

Then we change the desired access to writeOwner access only ❸ . Based on the restrictive security descriptor, only the owner of the security descriptor, which was set to the SYSTEM user, should be granted this access. When we rerun the access check, we get STATUS_ACCESS_DENIED and no granted access ❹ .

To show how we can bypass these restrictions, we query for the caller's linked token . As described in Chapter 4 , UAC uses the linked token to expose the full administrator token. This command won't work unless you're running the script as a split-token administrator. However, we can enable the SetokOwnershipPrivilege privilege on the linked token , which should bypass the owner check for @titleOwner . The access check should now return STATUS_SUCCESS and grant the desired access . The Privileges column shows that SetokOwnershipPrivilege was used to grant the access right.

As mentioned, it's worth running this script in a debugger and stepping into Get-PSGrantedAccess to follow along with the access check process so that you understand it better. I also recommend trying different combinations of values in the security descriptor.

## Calculating Granted Access for Resources

If you really need to know the granted access of a resource, you're better off using the Get-htGrantAccess command over the PowerShell implementation we've developed. Let's see how we can use this command to get the granted access for a list of resources. In Listing 7-4, we'll take the script we used in Chapter 6 to find the owners of objects and calculate the full granted access.

```bash
PS> function Get-NameAndGrantedAccess {
        [CmdletBinding()]
        param(
            [parameter(Mandatory, ValueFromPipeline)]
        $Entry,
            [parameter(Mandatory)]
        $Root
        )
        PROCESS {
        $sd = Get-NtSecurityDescriptor -Path $Entry.Name -Root $Root
-TypeName $Entry.NtTypeName -ErrorAction SilentlyContinue
        if ($snull -ne $sd) {
          0 $granted_access = Get-NtGrantedAccess -SecurityDescriptor $sd
            if (!Test-NtAccessMask $granted_access -Empty)) {
              $props = @{
```

262    Chapter 7

---

```bash
Name = $Entry.Name;
        NtTypeName = $Entry.NtTypeName
        GrantedAccess = $Granted_access
        }
        New-Object -TypeName PSObject -Prop $props
    }
    }
}
PS> Use-NtObject($dir = Get-NtDirectory \BaseNamedObjects) {
   Get-NtDirectoryEntry $dir | Get-NameAndGrantedAccess -Root $dir
}$
Name                     NtTypeName  GrantedAccess
...
-
$MO:8924:120:WinError_03_p0      Semaphore      QueryState, ModifyState, ...
CLR PerfMon DoneEnumEvent      Event        QueryState, ModifyState, ...
msys-2.055-1888ae2e0d056aa    Directory      Query, Traverse, ...
SyncRootManagerRegistryUpdateEvent Event       QueryState, ModifyState, ...
--snip--
Listing 7-34: Enumerating objects and getting their granted access
```

In this modified version of the script created in Listing 6-37, instead of merely checking the owner SID, we call Get-NTGrantedAccess with the security descriptor ❶ . This should retrieve the granted access for the caller. Another strategy would have been to check the granted access for any impersonation token at the Identification level with Query access on the handle, then pass it as the Token parameter. In the next chapter, we'll explore an easier way to do large-scale access checking without having to write your own scripts.

## Wrapping Up

In this chapter, we detailed the implementation of the access check process in Windows at length. This included describing the operating system's mandatory access checks, token owner and privilege checks, and discretionary access checks. We also built our own implementation of the access check process to enable you to better understand it.

Next, we covered how the two types of sandboxing tokens (restricted and lowbox) affect the access check process to restrict resource access. Finally, we discussed object type checking and central access policies, important features of enterprise security for Windows.

---



---

