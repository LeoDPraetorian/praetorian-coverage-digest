## 7 THE ACCESS CHECK PROCESS

![Figure](figures/WindowsSecurityInternals_page_251_figure_001.png)

We've covered the first two components of the SRM: the security access token and the security descriptor. Now we'll define its final

component: the access check process, which accepts the token and the security descriptor and applies a fixed set of rules to determine whether an application can access a resource.

We'll start by discussing the APIs you can call to perform an access check. Then we'll take a deep dive into the implementation of the access check inside the Windows kernel, detailing how this check processes the different parts of the security descriptor and Token object to generate a final granted access value for the resource. In doing so, we'll develop our own basic implementation of the access check process using a PowerShell script.

---

## Running an Access Check

When a caller attempts to open a resource, the kernel performs an access check based on the caller's identity. The API used to run the access check depends on whether it's being called from kernel mode or user mode. Let's start by describing the kernel-mode API.

### Kernel-Mode Access Checks

The SeAccessCheck API implements the access check process in kernel mode.

It accepts the following parameters:

1

Security descriptor The security descriptor to use for the check; must contain both owner and group SIDs.

Security subject context The primary and impersonation tokens for the caller

Desired access An access mask for the access requested by the caller.

Access mode The caller's access mode, set to either UserMode or KernelMode

Generic mapping The type-specific generic mapping

The API returns four values:

Granted access An access mask for the access the user was granted

Access status code An NT status code indicating the result of the access check

Privileges Any privileges used during the access check

Success code A Boolean value; if TRUE, the access check succeeded

If the access check succeeds, the API will set the granted access to the desired access parameter, the success code to true, and the access status code to STATUS_SUCCESS. However, if any bit in the desired access is not granted, it will set the granted access to 0, the success code to false, and the access status code to STATUS_ACCESS_DENIED.

You might wonder why the API bothers returning the granted access value if all bits in the desired access must be granted for this value to indicate a success. The reason is that this behavior supports the MaxunmAllowed access mask bit, which the caller can set in the desired access parameter. If the bit is set and the access check grants at least one access, the API returns STATUS_SUCCESS, setting the granted access to the maximum allowed access.

The security subject context parameter is a pointer to a SECURITY \_SUBJECT_CONTEXT structure containing the caller's primary token and any impersonation token of the caller's thread. Typically, kernel code will use the kernel API SecCaptureSubjectContext to initialize the structure and gather the correct tokens for the current caller. If the impersonation token is captured, it must be at Impersonation level or above; otherwise, the API will fail and the access status code will be set to STATUS_BAD_IMPERSONATION_LEVEL .

222 Chapter 7

---

Note that the call to SeAccessCheck might not occur in the thread that made the original resource request. For example, the check might have been delegated to a background thread in the System process. The kernel can capture the subject context from the original thread and then pass that context to the thread that calls SeAccessCheck, to ensure that the access check uses the correct identity.

## The Access Mode

The access-mode parameter has two possible values, UserMode and KernelMode.

If you pass UserRole to this parameter, all access checks will continue as normal. However, if you pass KernelMode, the kernel will disable all access checks. Why would you want to call SeAccessCheck without enforcing any security? Well, usually, you won't directly call the API with the KernelMode value. Instead, the parameter will be set to the value of the calling thread's

PreviousMode parameter, which is stored in the thread's kernel object structure. When you call a system call from a user-mode application, the PreviousMode value is set to UserRole and passed to any API that needs the

AccessMode set.

Therefore, the kernel normally enforces all access checks. Figure 7-1 shows the described behavior with a user-mode application calling the NtCreate@Mutant system call.

![Figure](figures/WindowsSecurityInternals_page_253_figure_004.png)

Even though the thread calling SeAccessCheck in Figure 7-1 is executing kernel code, the thread's PreviousMode value reflects the fact that the call was started from UserMode . Therefore, the AccessMode parameter specified to

SeAccessCheck will be UserMode , and the kernel will enforce the access check.

The most common way of transitioning the thread's PreviousMode value from UserRole to KernelMode is for the existing kernel code to call a system call via its 20 form: for example, 20CreateMutAnt . When such a call is made, the system call dispatch correctly identifies that the previous execution occurred in the kernel and sets PreviousMode to KernelMode. Figure 7-2 shows the transition of the thread's PreviousMode from UserRole to KernelMode.

The Access Check Process 223

---

![Figure](figures/WindowsSecurityInternals_page_254_figure_000.png)

Figure 72: A thread's PreviousMode value being set to KernelMode after a call to $\lambda$ CreateMutant

In Figure 7 - 2 , the user-mode application calls a hypothetical kernel system call, NtSomeOtherCall , that internally calls ZcCreateMutant . The code executing in the NtSomeOtherCall function runs with the PreviousMode value set to UserMode . However, once it calls ZcCreateMutant , the mode changes to KernelMode for the duration of the system call. In this case, because ZcCreateMutant would call SeAccessCheck to determine whether the caller had access to a Mutant object, the API would receive the AccessMode set to KernelMode , disabling access checking.

This behavior could introduce a security issue if the hypothetical

NtSomeOtherCall allowed the user-mode application to influence where the

Mutant object was created. Once the access check is disabled, it might be possible to create or modify the #mutant in a location that the user would not normally be allowed to access.

## Memory Pointer Checking

The access-mode parameter has a second purpose: when UserMode is specified, the kernel will check any pointers passed as parameters to a kernel API to ensure that they do not point to kernel memory locations. This is an important security restriction; it prevents an application in user mode from forcing a kernel API to read or write to kernel memory it should not have access to.

Specifying kernel Mode disables these pointer checks at the same time as it disables the access checking. This mixing of behavior can introduce security issues; a kernel-mode driver might want to disable only pointer checking but inadvertently disable access checking as well.

How a caller can indicate these different uses of the access-mode parameter depends on the kernel APIs being used. For example, you can sometimes specify two AccessMode values, one for the pointer checking and one for the access checking. A more common method is to specify a flag to the call; for example, the OBJECT_ATTRIBUTES structure passed to system calls has a flag called ForceAccessCheck that disables pointer checking but leaves access checking enabled.

If you're analyzing a kernel driver, it's worth paying attention to the use of Zw APIs in which the ForceAccess check flag is not set. If a non-administrator user can control the target object manager path for the call, then there's

224 Chapter 7

---

likely to be a security vulnerability. For example, CVE-2020-17136 is a vulnerability in a kernel driver responsible for implementing the Microsoft OneDrive remote filesystem. The issue occurred because the API that the driver exposed to the Explorer shell did not set the forceAccess flag when creating a cloud-based file. Because of that, a user calling the APIs in the kernel driver could create an arbitrary file anywhere they wanted on the filesystem, allowing them to gain administrator privileges.

## User-Mode Access Checks

To support user-mode applications, the kernel exposes its access check implementation through the NtAccessCheck system call. This system call uses the same access check algorithm as the SeAccessCheck API; however, it's tailored to the unique behavior of user-mode callers. The parameters for the system call are as follows:

Security descriptor The security descriptor to use for the check; must contain owner and group SIDs

Client token A handle to an impersonation token for the caller

Desired access An access mask for the access requested by the caller.

Generic mapping The type-specific generic mapping

The API returns four values:

Granted access An access mask for the access the user was granted

Access status code An NT status code indicating the result of the access check

Privileges Any privileges used during the access check

NT success code A separate NT status code indicating the status of the system call

You'll notice that some of the parameters present in the kernel API are missing here. For example, there is no reason to specify the access mode, as it will always be set to the caller's mode (UserMode, for a user-mode caller). Also, the caller's identity is now a handle to an impersonation token rather than a subject context. This handle must have jQuery access to be used for the access check. If you want to perform the access check against a primary token, you'll need to duplicate that token to an impersonation token first.

Another difference is that the impersonation token used in user mode can be as low as Identification level. The reason for this disparity is that the system call is designed for user services that want to check a caller's permissions, and it's possible that the caller will have granted access to an Identification-level token; this condition must be accounted for.

The system call also returns an additional NT status code instead of the Boolean value returned by the kernel API. The return value indicates whether there was a problem with the parameters passed to the system call. For example, if the security descriptor doesn't have both the owner and group SIDs set, the system call will return STATUS_INVALID_SECURITY_DESCR.

The Access Check Process 225

---

## The Get-NtGrantedAccess PowerShell Command

We can use the %tAccessCheck system call to determine the caller's granted access based on a security descriptor and an access token. The PowerShell module wraps the call to %tAccessCheck with the Get-NTGrantedAccess command, as shown in Listing 7-1.

```bash
⃝ PS> $d = New-NtSecurityDescriptor -EffectiveToken -Type Mutant
  ⃝ PS> Format-NtSecurityDescriptor $d -Summary
     <Owner> : GRAPHITE\user
     <Group> : GRAPHITE\None
     <DACL>
     GRAPHITE\user: (Allowed)(None)(Full Access)
     NT AUTHORITY\SYSTEM: (Allowed)(None)(Full Access)
     NT AUTHORITY\LogonSessionId_0_795805: (Allowed)(None)(ModifyState...)
  ⃝ PS> Get-NtGrantedAccess $d -AsString
     Full Access
  ⃝ PS> Get-NtGrantedAccess $d -Access ModifyState -AsString
     ModifyState
  ⃝ PS> Clear-NtSecurityDescriptorDacI $d
  ⃝ PS> Format-NtSecurityDescriptor $d -Summary
     <Owner> : GRAPHITE\user
     <Group> : GRAPHITE\None
     <DACL> - <EMPTY>
  ⃝ PS> Get-NtGrantedAccess $d -AsString
  ⃝ ReadControl\WriteDac
```

Listing 7-1: Determining the caller's granted access

We start by creating the default security descriptor using the Effective Token parameter ❶ , and we confirm that it is correct by formatting it. In simplistic terms, the system call will check this security descriptor's DACL for an Allowed ACE that matches one of the token's SIDs; if such an ACE exists, it will grant the access mask. As the first ACE in the DACL grants the current user SID Full Access, we'd expect the result of the check to also grant Full Access.

We then call Get-NetGrantedAccess, passing it the security descriptor . We don't specify an explicit token, so it uses the current effective token. We also do not specify an access mask, which means that the command checks MaximumAllowed access, converting the result to a string. It returns Full Access, as we expected based on the DACL.

Next, we test the Get-NTGrantedAccess command when supplied an explicit access mask using the Access parameter @ . The command will work out the access mask enumeration for the security descriptor's type to allow us to specify type-specific values. We requested to check for %d%fyState, so we receive only that access. For example, if we were opening a handle to a %ntan object, then the handle's access mask would grant only %d%fyState.

---

Finally, to test an access denied case, we remove all the ACEs from the DACL . If there is no Allowed ACE, then no access should be granted. But when we run get-GruntedAccess again, we get a surprise: we were granted ReadControl and WriteBack access instead of nothing . To understand why we received these access levels, we need to dig into the internals of the access check process. We'll do so in the next section.

## The Access Check Process in PowerShell

The access check process in Windows has changed substantially since the first version of Windows NT. This evolution has resulted in a complex set of algorithms that calculate what access a user is granted based on the combination of the security descriptor and the token. The flowchart in Figure 7-3 shows the major components of the access check process.

![Figure](figures/WindowsSecurityInternals_page_257_figure_003.png)

Figure 7-3: The access check process

The Access Check Process 227

---

The first step is to combine the token, the security descriptor, and the desired access mask. The access check process then uses this information in the following three main checks to determine whether access should be granted or denied:

Mandatory access check Denies access to resources when the token does not meet a set policy

Token access check Grants access based on the token's owner and privileges

Discretionary access check Grants or denies access based on the DACL.

To explore these steps in more detail, let's write a basic implementation of the access check process in PowerShell. This PowerShell implementation won't replace the Get-htGrantedAccess command, as, for simplicity, it won't check for maximum allowed access and might not include newer features. Even so, having an implementation that you can analyze and debug can help you gain a greater understanding of the overall process.

The implementation of the access check is quite complex; therefore, we'll build it in stages. You can access the full implementation in the chapter7

\_access_check_impl.psml script included with the book's example code. To use the script, import it as a module with this command:

```bash
_________________________________________________________________
PS> Import-Module .\chapter7_access_check_impl.ps1
```

## Defining the Access Check Function

The module exports a single top-level function to perform the access check, Get-PSGrantedAccess, shown in Listing 7-2.

```bash
function Get-PSGrantedAccess {
    $param(
        $Token = (Get-NtToken -{Effective -Pseudo},
        $SecurityDescriptor,
        $GenericMapping,
        $DesiredAccess
    )
    # $context = @{
        Token = $Token
        SecurityDescriptor = $SecurityDescriptor
        GenericMapping = $GenericMapping
        RemainingAccess = Get-NtAccessMask $DesiredAccess
        Privileges = @()
    }
    ## Test-MandatoryAccess defined below.
    # if (!(Test-MandatoryAccess $context)) {
        return Get-AccessResult STATUS_ACCESS_DENIED
    }
```

---

```bash
# Get-TokenAccess defined below.
  Resolve-TokenAccess $context.
  # if (Test-NTAccessMask $context.RemainingAccess -Empty) {
     # return Get-AccessResult STATUS_SUCCESS $context.Privileges
$DesiredAccess
}  # if (Test-NTAccessMask $context.RemainingAccess AccessSystemSecurity) {
      return Get-AccessResult STATUS_PRIVILEGE_NOT_HELD
    }
  Get-DiscretionaryAccess $context
  # if (Test-NTAccessMask $context.RemainingAccess -Empty) {
      return Get-AccessResult STATUS_SUCCESS $context.Privileges
$DesiredAccess
}  # return Get-AccessResult STATUS_ACCESS_DENIED
}
```

Listing 7-2. The top-level access check function

The function accepts the four parameters we defined earlier in the chapter: a token, the security descriptor, the type's generic mapping, and the desired access. If the caller doesn't specify a token, we'll use their effective token for the rest of the access check.

The first task the function tackles is building a context that represents the current state of the access check process . The most important property used here is RemainingAccess. We initially set this property to the DesiredAccess parameter, then remove bits from the property as they're granted during the access check process.

The rest of the function follows the flowchart in Figure 7-3. First it performs the mandatory access check . We'll describe what this check does in the next section. If the check fails, then the function completes with STATUS_SUCCESS DENIED. To simplify the code, the full script defines a helper function, Get-AccessResult, to build the result of the access check. Listing 7-3 shows this function definition.

```bash
function Get-AccessResult {
    param(
        $status,
        $Privileges = @(),
        $GrantedAccess = 0
    )
    $props = @{
        Status = Get-NtStatus -Name $status -PassStatus
        GrantedAccess = $GrantedAccess
        Privileges = $Privileges
    }
    return [PSCustomObject]$props
}
Listing 7.3: Implementing the Get-AccessResult helper function
                     The Access Check Process  229
```

---

Next, the token access check updates the RemainingAccess property in the context . If RemainingAccess becomes empty, then we can conclude we've been granted all access rights and can return STATUS_SUCCESS . If it's not empty, we make a second check: if the caller requested AccessSystemSecurity and the token didn't grant that right, this check fails .

Finally, we perform the discretionary access check. As with the token access check, we check the RemainingAccess property: if it's empty, the caller has received all the accesses they've requested ❶ ; otherwise, they've been denied access❼ . With that overview in mind, let's delve into the details of each check in turn.

## Performing the Mandatory Access Check

Windows Vista introduced a feature called Mandatory Integrity Control (MIC) that uses the token's integrity level and the mandatory label ACE to control resource access based on a general policy. MIC is a type of mandatory access check (MAC). The key behavior of a MAC is that it cannot grant access to a resource; it can only deny access. If the caller requests more access than the policy permits, the access check will immediately deny access, and if the MAC denies access, the DACL will never be checked. Because there is no way for a non-privileged user to circumvent the check, it's considered mandatory.

In the latest versions of Windows, the access check process performs two additional mandatory checks along with MIC. These checks implement similar behavior, so we'll group them together. Listing 7-4 defines the Test-MandatoryAccess function we called in Listing 7-2.

```bash
function Test-MandatoryAccess {
    param($Context)
   ## Test-ProcessTrustLevel is defined below.
   if (!(Test-ProcessTrustLevel $Context)) {
      return $false
   }
   ## Test-AccessFilter is defined below.
   if (!(Test-AccessFilter $Context)) {
      return $false
   }
   ## Test-MandatoryIntegrityLevel is defined below.
   if (!(Test-MandatoryIntegrityLevel $Context)) {
      return $false
   }
   return $true
}
```

Listing 7-4: Implementing the Test-MandatoryAccess function

230 Chapter 7

---

This function performs three checks: Test-ProcessTrustLevel, Test-AccessFilter, and Test-Mandatory IntegrityLevel. If any of these checks fails, then the entire access check process fails, returning STATUS_ACCESS_DENIED. Let's detail each check in turn.

## The Process Trust Level Check

Windows Vista introduced protected processes, which are processes that even an administrator can't manipulate and compromise. The original purpose of protected processes was to protect media content. However, Microsoft has since expanded them to cover a range of uses, such as protecting antivirus services and virtual machines.

A token can be assigned a process trust level SID . This SID depends on the protection level of a protected process and is assigned when such a process is created. To restrict access to a resource, the access check process determines whether the token's SID is equally or more trusted than a trust level SID in the security descriptor.

When one SID is considered equally or more trusted than another, it's said to dominate . To check whether one process trust level SID dominates another, you can call the RtlSidDonominatesForTrust API or the Compare-NtSid command with the Dominates parameter. Listing 7-5 translates the algorithm for checking the process trust level, which is stored in a process trust label ACE, into PowerShell.

```bash
function Test-ProcessTrustLevel {
    param($Context)
  @ $trust_level = Get-NtTokenSid $Token -TrustLevel
   if ($null -eq $trust_level) {
        $trust_level = Get-NtSsid -TrustType None -TrustLevel None
    }
  @ $access = Get-NtAccessMask 0xFFFFFFF
     $sacl = Get-NtSecurityDescriptorSacl $Context.SecurityDescriptor
      foreach($ace in $sacl) {
       @ if ($ace.IsProcessTrustLabelAce -or $ace.IsInheritOnly) {
         continue
    }
     @ if (!(Compare-NtSsid $trust_level .$ace.Sid -Dominates)) {
         $access = Get-NtAccessMask $ace
       }
       break
    }
  $access = Grant-NtAccessMask $access AccessSystemSecurity
  @ return Test-NtAccessMask $access $Context.RemainingAccess -All
}
```

Listing 7-5: The process trust level check algorithm

---

To check the process trust level, we need to query the SID for the current token 1 . If the token does not have a trust level SID, then we define the lowest possible SID. Next, we initialize an access mask to all bits set 6 .

We then enumerate the values in the SACL, checking any process trust label ACE other than InheritOnly ❸ . When we find a relevant ACE, we compare its SID to the SID queried for the token ❹ . If the ACE SID dominates, then the token has a lower protection level, and the access mask is set to the value from the ACE.

Finally, we compare the access mask to the remaining access the caller requested 6 . If all the bits in the access mask are present in the remaining access, then the function returns True , which indicates that the process trust level check succeeded. Note that the check always adds AccessSystemSecurity , regardless of the mask in the ACE.

Let's test the behavior of the process trust label ACE. Rather than create a new protected process, we'll use the process trust level SID of the anonymous user's token for the access check. To simplify testing, we'll define a helper function that we can reuse. This function in Listing 7-6 will create a default security descriptor that grants access to both the current user and the anonymous user. Whenever we need a security descriptor for a test, we can call this function and use the returned value.

```bash
PS> function New-BaseSD {
  $owner = Get-NtSsid -KnownSid LocalSystem
  $sd = New-NTSecurityDescriptor -Owner $owner -Group $owner -Type Mutant
  Add-NtSecurityDescriptorAce $sd -KnownSid Anonymous -Access GenericAll
  $sd = Get-NtSsid
  Add-NtSecurityDescriptorAce $sd -Sid $sd -Access GenericAll
  Set-NtSecurityDescriptorIntegrityLevel $sd Untrusted
  Edit-NtSecurityDescriptor $sd -MapGeneric
  return $sd
```

Listing 7-6. Defining a helper function for testing

The New-Base50 function creates a basic security descriptor with the owner and group set to the SYSTEM user. It then adds an Allowed ACE for the anonymous and current user SIDs, granting them full access. It also sets the mandatory label to the untrusted integrity level (you'll learn why the integrity level is important in "The Mandatory Integrity Level Check" on page 255). Finally, it maps any generic access to mutant type-specific access. Let's now test the process trust label, as shown in Listing 7-7.

```bash
0 PS> $sd = New-BaseSD
PS> $trust_sid = Get-NtToken -TrustType ProtectedLight -TrustLevel Windows
PS> Add-NtSecurityDescriptorAce $sd -Type ProcessTrustLabel
-Access ModifyState -Sid $trust_sid
PS> Get-NtGrantedAccess $sd -AsString
0 ModifyState
0 PS> $token = Get-NtToken -Anonymous
PS> $anon trust_sid = Get-NtTokenSid -Token $token -TrustLevel
```

232 Chapter 7

---

```bash
PS> Compare-NtSid $anon_trust_sid $trust_sid -Dominates
  ⦓ True
  PS> Get-NtGrantedAccess $sd -Token $token -AsString
  ⦓ Full Access
```

Listing 7-7: Testing the process trust label ACE

First, we create our base security descriptor and add a process trust label, granting ModifyState access only to tokens whose process trust level does not dominate the process trust label ❶ . When we run the access check, we see that the effective token, which doesn't have any process trust level, gets ModifyState access only ❷ , indicating that the process trust label is being enforced.

Next, we get a handle to an anonymous user's token using Get-NToken, query its process trust level SID, and compare it to the SID we added to the security descriptor ❶ . The call to Compare-NSid returns True ❶ , which indicates the token's process trust level SID dominates the one in the security descriptor. To confirm this, we run the access check and find that the anonymous user's token is granted Full Access ❸ , which means the process trust label did not limit its access.

You might wonder whether you could impersonate the anonymous token to bypass the process trust label. Remember that in user mode we're calling NetAccessCheck, which takes only a single token handle, but that the kernel's SetAccessCheck takes both a primary token and an impersonation token. Before the kernel verifies the process trust label, it checks both tokens and chooses the one with the lower trust level. Therefore, if the impersonation token is trusted but your primary token is untrusted, the effective trust level will be untrusted.

Windows applies a secondary security check when assigning the process trust label ACE to a resource. While you need only writebac access to set the process trust label, you cannot change or remove the ACE if your effective trust level does not dominate the label's trust level. This prevents you from setting a new, arbitrary process trust label ACE. Microsoft uses this ability to check certain files related to Windows applications for modifications and verify that the files were created by a protected process.

## The Access Filter ACE

The second mandatory access check is the access filter ACE. It works in a similar manner to the process trust label ACE, except that instead of using a process trust level to determine whether to apply a restricting access mask, it uses a conditional expression that evaluates to either True or False. If the conditional evaluates to False , the ACE's access mask limits the maximum granted access for the access check; if it evaluates to True , the access filter is ignored.

You can have multiple access filter ACEs in the SACL. Every conditional expression that evaluates to False removes more of the access mask. Therefore, if you match one ACE but don't match a second ACE that restricts to GenericRead, you'll get a maximum access of GenericRead. We can express this logic in a PowerShell function, as shown in Listing 7-8.

---

```bash
function Test-AccessFilter {
    param($Context)
    $access = Get-NtAccessMask 0xFFFFFFF
    $sacl = Get-NtSecurity@scriptorSacl $Context.SecurityDescriptor
    foreach($sacl) {
        if ($sacl.IsAccessFilterAce -or $sacl.IsInheritOnly) {
            continue
        }            ⋒ if (!(Test-NtAccessCondition $sacl -Token $token)) {
            ⋒ $access = $access -band $sacl.Mask
        }
    }            $access = Grant-NtAccessMask $access AccessSystemSecurity
    ⋒ return Test-NtAccessMask $access $Context.RemainingAccess -All
        }
```

Listing 7-8. The access filter check algorithm

This algorithm resembles the one we implemented to check the process trust level. The only difference is that we check a conditional expression rather than the SID ❶ . The function supports multiple access filter ACEs; for each matching ACE, the access mask is bitwise ANDed with the final access mask, which starts with all access mask bits set ❸ . As the masks are ANDed, each ACE can only remove access, not add it. Once we've checked all the ACEs, we check the remaining access to determine whether the check succeeded or failed ❹ .

In Listing 7-9, we check the behavior of the access filter algorithm to ensure it works as expected.

```bash
PS> $sd = New-BaseSD
  0> Add-NtSecurityDescriptorAce $sd -Type AccessFilter -KnownSid World
     -Access ModifyState -Condition "Exists TSA://ProcUnique" -MapGeneric
  PS> Format-NtSecurityDescriptor $sd -Summary -SecurityInformation AccessFilter
  <Access Filters>
    Everyone: (AccessFilter)(None)(ModifyState)(Exists TSA://ProcUnique)
  > PS> Show-NtTokenEffective -SecurityAttributes
     SECURITY ATTRIBUTES
     --------------------
     Name        Flags                ValueType Values
     ---------      ---------          ---------
     TSA://ProcUnique NonInheritable, Unique UInt64   {187, 365588953}
  PS> Get-NtGrantedAccess $sd -AsString
  0 Full Access
  PS> Use-NtObject($token = Get-NtToken -Anonymous) {
    Get-NtGrantedAccess $sd -Token $token -AsString
  } ModifyState
  Listing 7.9. Testing the access filter ACE
```

---

We add the access filter ACE to the security descriptor with the conditional expression "Exists TSA://ProcName" ❶ . The expression checks whether the TSA://ProcName security attribute is present in the token. For a normal user, this check should always return True; however, the attribute doesn't exist in the anonymous user's token. We set the mask to ModifyState and the SID to the Everyone group. Note that the SID isn't verified, so it can have any value, but using the Everyone group is conventional.

We can check the current effective token's security attributes using ShowNTokenEffective ❸. Getting the maximum access for the effective token results in Full Access ❹, meaning the access filter check passes without restricting access. However, when we repeat this using the anonymous user's token, the access filter check fails and the access is restricted to ModifyState only ❸.

To set an access filter, you need only write@ac access. So, what's to prevent a user removing the filter? Obviously, the access filter shouldn't grant write@ac access in the first place, but if it does, you can limit any changes to a protected process trust level. To do this, set the ACE SID to a process trust level SID, and set the TrustProtected ACE flag. Now a caller with a lower process trust level won't be able to remove or modify the access filter ACE.

## The Mandatory Integrity Level Check

Finally, we'll implement the mandatory integrity level check. In the SACL, a mandatory label ACE's SID represents the security descriptor's integrity level. Its mask, which expresses the mandatory policy, combines the NoReadUp, NoWriteUp, and NoExecuteUp policies to determine the maximum access the system can grant the caller based on the GenericRead, GenericWrite, and GenericExecute values from the generic mapping structure.

To determine whether to enforce the policy, the check compares the integrity level SIDs of the security descriptor and token. If the token's SID dominates the security descriptor's, then no policy is enforced and any access is permitted. However, if the token's SID doesn't dominate, then any access requested outside of the value for the policy causes the access check to fail with STATUS_ACCESS_DENIED .

Calculating whether one integrity level SID dominates another is much simpler than calculating the equivalent value for the process trust level SID. To do so, we extract the last RID from each SID and compare these as numbers. If one integrity level SID's RID is greater than or equal to the other, it dominates.

However, calculating the access mask for the policy based on the generic mapping is much more involved, as it requires a consideration of shared access rights. We won't implement the code for calculating the access mask, as we can use an option on Get-NtAccessMask to calculate it for us.

In Listing 7-10, we implement the mandatory integrity level check.

The Access Check Process 235

---

```bash
function Test-MandatoryIntegrityLevel {
    param($Context)
    $token = $Context.Token
    $sd = $Context.SecurityDescriptor
    $mapping = $Context.GenericMapping
  @$policy = Get-NtTokenMandatoryPolicy -Token $token
    if ((;$policy -band "NoWriteUp") -eq 0) {
        return $true
    }
    if ($sd.HasMandatoryLabelAce) {
        $ace = $sd.GetMandatoryLabel()
        $sd_il_sid = $ace.Sid
      @$access = Get-NtAccessMask $ace.Mask -GenericMapping $mapping
    } else {
      @$sd_il_sid = Get-NtSid -IntegrityLevel Medium
        $access = Get-NtAccessMask -MandatoryLabelPolicy NoWriteUp
-GenericMapping $genericMapping
    }
  @ if (Test-NtTokenPrivilege -Token $token $token SeRelabelPrivilege) {
      $access = Grant-NtAccessMask $access WriteOwner
    }
  @$il_sid = Get-NtTokenSid -Token $token -Integrity
    if (Compare-NtSid $il_sid -$sd_il_sid -Dominates) {
      return $true
    }
    return Test-NtAccessMask $access $Context.RemainingAccess -All
```

Listing 7-10: The mandatory integrity level check algorithm

We start by checking the token's mandatory policy ❶. In this case, we check whether the NoWrapIt flag is set. If the flag is not set, then we disable integrity level checking for this token and return True. This flag is rarely turned off, however, and it requires SetcbPrivatele to disable, so in almost all cases the integrity level check will continue.

Next, we need to capture the security descriptor's integrity level and mandatory policy from the mandatory label ACE. If the ACE exists, we extract these values and map the policy to the maximum access mask using Get-NtAccessMask . If the ACE doesn't exist, the algorithm uses a Medium integrity level and a NoIntegrity policy by default .

If the token has the SebelabelPrivilege privilege, we add the writeOwner access back to the maximum access, even if the policy removed it . This allows a caller with SebelabelPrivilege enabled to change the security descriptor's mandatory integrity label ACE.

We then query the token's integrity level SID and compare it to the security descriptor's 9 . If the token's SID dominates, then the check passes

236 Chapter 7

---

and allows any access. Otherwise, the calculated policy access mask must grant the entirety of the remaining access mask requested. Note that we don't treat AccessSystemSecurity differently here, as we did in the process trust level and access filter checks. We remove it if the policy contains NoWritetop, the default for all resource types.

Let's verify the behavior of the mandatory integrity level check in the real access check process (Listing 7-11).

```bash
PS> $d = New-BaseSD
  PS> Format-NtSecurityDescriptor $sd -SecurityInformation label -Summary
  <Mandatory Label>
  ^Mandatory Label\Untrusted Mandatory Level: (MandatoryLabel)(None)(NoWriteUp)
  PS> Use-NtObject($token = Get-NtToken -Anonymous) {
      Format-NtToken $token -Integrity
       Get-NtGrantedAccess $sd -Token $token -AsString
  }
  | INTEGRITY_LEVEL
  --------------------
  ^Untrusted
  Full Access
  ^PS> Remove-NtSecurityDescriptorIntegrityLevel $sd
  PS> Use-NtObject($token = Get-NtToken -Anonymous) {
      Get-NtGrantedAccess $sd -Token $token -AsString
  }
```

### Listing 7.11: Testing the mandatory label ACE

We first create a security descriptor and check its mandatory integrity label. We can see that it's set to the !trusted integrity level, which is the lowest level, and that its policy is NOTWITHDRAW . We then get the maximum access for the anonymous user's token, which we can see has an integrity level of

!trusted 2. As this integrity level matches the security descriptor's integrity level, the token is allowed full access.

To test access mask restrictions, we remove the mandatory label ACE from the security descriptor so that the access check will default to the Medium integrity level ❹. Running the check again, we now get ModifyState| ReadControl|Synchronize ❹, which is the Mutant object's full access without the GenericWrite access mask.

This concludes the implementation of the mandatory access check. We've seen that this algorithm is really composed of three separate checks for the process trust level, the access filter, and the integrity level. Each check can only deny access; it never grants additional access.

## Performing the Token Access Check

The second main check, the token access check, uses properties of the caller's token to determine whether to grant certain access rights. More specifically, it checks for any special privileges, as well as for the owner of the security descriptor.

The Access Check Process 237

---

Unlike the mandatory access check, the token access check can grant access to a resource if it has removed all bits from the token's access mask. Listing 7-12 implements the top-level Result-TokenAccess function.

```bash
Function Result-TokenAccess {
    param($Context)
   Resolve-TokenPrivilegeAccess $Context
   if (Test-NTAccessMask $Context.RemainingAccess -Empty) {
      return
   }
   return Resolve-TokenOwnerAccess $Context
}
```

Listing 7-12: The token access check algorithm

The check is simple. First we check the token's privileges using a function we'll define next, Resolve-TokenPrivilegesAccess, passing it the current context. If certain privileges are enabled, this function modifies the token's remaining access; if the remaining access is empty, meaning no access remains to be granted, we can return immediately. We then call Resolve -TokenOwnerAccess, which checks whether the token owns the resource and can also update RemainingAccess. Let's dig into these individual checks.

## The Privilege Check

The privilege check (Listing 7-13) determines whether the Token object has three different privileges enabled. For each one, if the privilege is enabled we grant an access mask and the bits from the remaining access.

```bash
function Resolve-TokenPrivilegeAccess {
    param($Context)
    $token = $Context.Token
    $access = $Context.RemainingAccess
  ♦ if ((Test-NtAccessMask $access AccessSystemSecurity) -and
        (Test-NtTokenPrivilege -Token $token SeSecurityPrivilege)) {
      $access = Revoke-NtAccessMask $access AccessSystemSecurity
      $Context.Privileges += "SeSecurityPrivilege"
    }
  ♦ if ((Test-NtAccessMask $access WriteOwner) -and
        (Test-NtTokenPrivilege -Token $token SeTakeOwnershipPrivilege)) {
      $access = Revoke-NtAccessMask $access WriteOwner
      $Context.Privileges += "SeTakeOwnershipPrivilege"
    }
  ♦ if ((Test-NtAccessMask $access WriteOwner) -and
        (Test-NtTokenPrivilege -Token $token SeRelabelPrivilege)) {
      $access = Revoke-NtAccessMask $access WriteOwner
      $Context.Privileges += "SeRelabelPrivilege"
    }
```

---

```bash
* $Context.RemainingAccess = $access
 * }
```

Listing 7.13: The token privilege access check algorithm

First, we check whether the caller has requested AccessSystemSecurity; if so, and if SeSecurityPrivilege is enabled, we remove AccessSystemSecurity from the remaining access. We also update the list of privileges we've used so that we can return it to the caller.

Next, we perform similar checks for $SetOwnershipPrivilege and $eRelabelPrivilege and remove $fileOwner from the remaining access if they're enabled. Lastly, we update the RemainingAccess value with the final access mask.

Granting WriteOwner access to both SeTakeOwnershipPrivilege and

SeRelabelPrivilege makes sense from the kernel's perspective, as you need

WriteOwner access to modify the owner SID and integrity level. However, this implementation also means that a token with only SeRelabelPrivilege can take ownership of the resource, which we might not always intend. Fortunately, even administrators don't get SeRelabelPrivilege by default, making this a minor issue.

Let's check this function against the real access check process. Run the script in Listing 7-14 as an administrator.

```bash
| PS> $owner = Get-MtSid -KnownSid Null
  | PS> $sd = New-MtSecurityDescriptor -Type Mutant -Owner $owner
     -Group $owner -EmptyDacI
  | PS> Enable-MtTokenPrivilege SeTakeOwnershipPrivilege
  | PS> Get-NtGrantedAccess $sd -Access WriteOwner -PassResult
     Status           Granted Access Privileges
     ---------          --------------------
  | STATUS_SUCCESS        WriteOwner      SeTakeOwnershipPrivilege
  | PS> Disable-NtTokenPrivilege SeTakeOwnershipPrivilege
  | PS> Get-NtGrantedAccess $sd -Access WriteOwner -PassResult
     Status           Granted Access Privileges
     ---------          --------------------
  | STATUS_ACCESS_DENIED  None                NONE
```

Listing 7.14: Testing the token privilege check

We start by creating a security descriptor that should grant no access to the current user ❶ . We then enable SeTakeOwnershipPrivilege ❷ . Next, we request an access check for WriteOwner access and specify the PassResult parameter, which outputs the full access check result ❸ . The result shows that the access check succeeded, granting WriteOwner access, but also that the check used the SeTakeOwnershipPrivilege ❹ . To verify that we weren't granted WriteOwner access for another reason, we disable the privilege ❸ and rerun the check. This time, it denies us access ❺ .

---

## The Owner Check

The owner check exists to grant ReadControl and Writebac access to the owner of the resource, even if the DACL doesn't grant that owner any other access. The purpose of this check is to prevent a user from locking themselves out of their own resources. If they accidentally change the DACL so that they no longer have access, they can still use Writebac access to return the DACL to its previous state.

The check compares the owner SID in the security descriptor with all enabled token groups (not just the token owner), granting access if a match is found. We demonstrated this behavior at the start of this chapter, in Listing 7-1. In Listing 7-15, we implement the Resolve-TokenOwnerAccess function.

```bash
function Resolve-TokenOwnerAccess {
    param($Context)
    $token = $Context.Token
    $sd = $Context.SecurityDescriptor
    $sd_owner = Get-NtSecurityDescriptorOwner $sd
  if (!(Test-NtTokenGroup -Token $token -Sid $sd_owner.Sid)) {
        return
    }
  @ $sids = Select-NtSecurityDescriptorAce $sd
  -KnownSid OwnerRights -First -AclType Dacl
   if ($sids.Count -gt 0) {
        return
    }
    $access = $Context.RemainingAccess
  @ $Context.RemainingAccess = Revoke-NtAccessMask $access ReadControl,
WriteDac
    }
```

Listing 7.15: The token owner access check algorithm

We use Test-NTokenGroup to check whether the security descriptor's owner SID is an enabled member of the token ❶ . If the owner SID is not a member, we simply return. If it is a member, the code then needs to check whether there are any OWNER_RIGHTS SIDs (5-13-4) in the DACL ❷ . If there are, then we don't follow the default process; instead, we rely on the DACL check to grant access to the owner. Finally, if both checks pass, we can remove ReadControl and WriteBac from the remaining access ❸ .

In Listing 7-16, we verify this behavior in the real access check process.

```bash
♦ PS> $owner = Get-NTSid -KnownSid World
  ♦ PS> $sd = New-NTSecurityDescriptor -Owner $owner -Group $owner
  -Type mutant -EmptyDoc1
  ♦ PS> Get-NTGrantedAccess $sd
  ♦ ReadControl, WriteDoc
```

240 Chapter 7

---

```bash
# PS\ Add-NtSecurityDescriptorAce $sd -KnownSid OwnerRights -Access ModifyState
PS> Get-NtGrantedAccess $sd
# ModifyState
```

Listing 7-16: Testing the token owner check

We start by creating a security descriptor with the owner and group set to Everyone ❶ . We also create a security descriptor with an empty DACL, which means the access check process will consider only the owner check when calculating the granted access. When we run the access check, we get ReadControl and WriteDac ❷ .

We then add a single ACE with the OWNER RIGHTS SID ❸. This disables the default owner access and causes the access check to grant only the access specified in the ACE (in this case, ModifyState). When we run the access check again, we now find that the only granted access is ModifyState ❹ and that we no longer have ReadControl or WriteDac access.

This concludes the token access check. As we demonstrated, the algorithm can grant certain access rights to a caller before any significant processing of the security descriptor takes place. This is primarily to allow users to maintain access to their own resources and for administrators to take ownership of other users' files. Now let's continue to the final check.

## Performing the Discretionary Access Check

We've relied on the behavior of the DACL for a few of our tests. Now we'll explore exactly how the DACL check works. Checking the DACL may seem simple, but the devil is in the details. Listing 7-17 implements the algorithm.

```bash
function Get-DiscretionaryAccess {
    param($Context)
    $token = $Context.Token
    $sd = $Context.SecurityDescriptor
    $access = $Context.RemainingAccess
    $resource_attrs = $null
    if ($sd.ResourceAttributes.Count -gt 0) {
        $resource_attrs = $sd.ResourceAttributes.ResourceAttribute
    }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }            }
  }
```

---

```bash
$continue_check = $true
      switch($ace.Type) {
        "Allowed" {
          ° if (Test-NtTokenGroup -Token $token $sid) {
            $access = Revoke-NtAccessMask $ace.$face
          }
        }
        "Denied" {
          ° if (Test-NtTokenGroup -Token $token $sid -DenyOnly) {
            if (Test-NtAccessMask $access $ace.$mask) {
                $continue_check = $false
          }
        }
      }
      "AllowedCompound" {
        $server_sid = Get-AceSid $ace -Owner $owner
        ° if ((Test-NtTokenGroup -Token $token $sid)
- and (Test-NtTokenGroup -Sid $server.sid)) {
            $access = Revoke-NtAccessMask $access $ace.$mask
          }
        "AllowedCallback" {
          ° if ((Test-NtTokenGroup -Token $token $sid)
-and (Test-NtAccessCondition $ace -Token $token
-ResourceAttributes $resource $attr)) {
                $access = Revoke-NtAccessMask $access $ace.$mask
          }
        }
    }
```

Listing 7-17: The discretionary access check algorithm

We begin by checking whether the DACL is present; if it is, we check whether it's a NULL ACL. ❶ If there is no DACL or only a NULL ACL, there is no security to enforce, so the function clears the remaining access and returns, granting the token any access to the resource that the mandatory access check hasn't restricted.

Once we've confirmed that there is a DACL to check, we can enumerate each of its ACEs ❸ . If an ACE is InheritOnly , it won't take part in the check, so we ignore it ❸ . Next, we need to map the SID in the ACE to the SID we're checking using a helper function we'll define next, Get-AceSid ❸ . This function converts the OWNER RIGHTSID for the ACE to the current security descriptor's owner, as shown in Listing 7-18.

---

```bash
function Get-AceSid {
    param(
        $Ace,
        $Owner
    )
    $sid = $Ace.Sid
    if (Compare-NtSid $sid -KnownSid OwnerRights) {
        $sid = $Owner.Sid
    }
    return $sid
}
```

Listing 7-18: The implementation of Get-AceSid

With the SID in hand, we can now evaluate each ACE based on its type. For the simplest type, Allowed, we check whether the SID is in the token's Enabled groups. If so, we grant the access represented by the ACE's mask and can remove those bits from the remaining access .

For the Denied type, we also check whether the SID is in the token's groups; however, this check must include both fnabled and denyonly groups, so we pass the DenyOnly parameter . Note that it's possible to configure the token's user SID as a DenyOnly group as well, and Test-NTokenGroup takes this into account. A Denied ACE doesn't modify the remaining access; instead, the function compares the mask against the current remaining access, and if any bit of remaining access is also set in the mask, then the function denies that access and immediately returns the remaining access.

The final two ACE types we cover are variations on the Allowed type. The first, AllowedCompound, contains the additional server SID. To perform this check, the function compares both the normal SID and the server SID with the caller token's groups, as these values might be different . (Note that the server SID should be mapped to the owner if the OWNER RIGHTS SID is used.) The ACE condition is met only if both SIDs are enabled.

Finally, we check the AllowedCallback ACE type. To do so, we again check the SID, as well as whether a conditional expression matches the token using Test+ModeCondition 0. If the expression returns True, the ACE condition is met, and we remove the mask from the remaining access. To fully implement the conditional check, we also need to pass in any resource attributes from the security descriptor (I'll describe resource attributes in more detail in “The Central Access Policy” on page 255). Notice that we're intentionally not checking DenyCallback. This is because the kernel does not support DenyCallback ACEs, although the user mode-only AuthzAccessCheck API does.

After we've processed the ACE, we check the remaining access ❹ . If the remaining access is empty, we've been granted the entire requested access and can stop processing ACEs. This is why we have a canonical ACL ordering, as discussed in Chapter 5 ; if Denied ACEs were placed after Allowed

---

ACEs, the remaining access could become empty, and the loop might exit before ever checking a Denied ACE.

Lastly, this function sets the RemainingAccess $\Phi$ . If the value of Remaining Access is non-empty, the access check fails with STATUS_ACCESS_DENIED. Therefore, an empty DACL blocks all access; if there are no ACEs, the RemainingAccess never changes, so it won't be empty at the end of the function.

We've now covered all three access checks, and you should have a better understanding of their structure. However, there is more to the access check process. In the next section, we'll discuss how this process supports the implementation of sandboxes.

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

250 Chapter 7

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

256 Chapter 7

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

We build a new security descriptor using the owner, group, and SACL from the original security descriptor but the DACL from the rule's security descriptor ❸ . If the rule applies, we do another discretionary access check for the DesiredAccess ❹ . After this check, we remove any bits that we weren't granted from the effective \_ access variable ❸ .

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

262 Chapter 7

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

8

## OTHER ACCESS CHECKING USE CASES

![Figure](figures/WindowsSecurityInternals_page_295_figure_002.png)

Access checks determine what access a caller should have when opening a kernel resource. However, we sometimes perform

them for other reasons, as they can serve as additional security checks. This chapter details some examples of using access checks as a secondary security mechanism.

We'll start by looking at traversal checking, which determines whether a caller has access to a hierarchy of resources. Next, we'll discuss how access checks are used when a handle is duplicated. We'll also consider how an access check can limit access to kernel information, such as process listings, from sandboxed applications. Finally, I'll describe some additional PowerShell commands that automate the access checking of resources.

---

## Traversal Checking

When accessing a hierarchical set of resources, such as an object directory tree, the user must traverse the hierarchy until they reach the target resource. For every directory or container in the hierarchy, the system performs an access check to determine whether the caller can proceed to the next container. This check is called a traversal check , and it's performed whenever code looks up a path inside the I/O manager or object manager. For example, Figure 8-1 shows the traversal checks needed to access an OMNS object using the path ABCQRSXYZOBJ .

![Figure](figures/WindowsSecurityInternals_page_296_figure_002.png)

Figure 8-1: Traversal checks required to access OBJ

As you can see, three access checks must be performed before we can access OBJ. Each access check extracts the security descriptor from the container and then checks the type-specific access to see if traversal is allowed. Both the OMNS and file directories can grant or deny Traverse access. If, for example, QRS denied Traverse access to the caller, the traversal check would fail, as shown in Figure 8 - 2 .

![Figure](figures/WindowsSecurityInternals_page_296_figure_005.png)

Figure 8-2: Traversal checks blocked at QRS

Even if the caller would pass the access checks for XYZ and OBf , because QRS now denies access via the traversal check, it's no longer possible for them to access OBf using the ABC(QRS)XYZOBJ path.

The traversal check prevents a user from accessing their resources if any parent container denies Traverse access. This is unexpected behavior— why shouldn't a user be able to access their own resources? It also introduces a performance concern. If a user must have access to every parent container to access their files, then the kernel must expend time and effort performing an access check for each container, when all that matters security-wise is whether the user has access to the resource they want to open.

266 Chapter 8

---

## The SeChangeNotifyPrivilege Privilege

To make the traversal check behavior closer to how you might expect it to work and reduce the performance impact, the SRM defines the $ChangeNotifyPrivilege privilege, which almost every Token object has enabled by default. When this privilege is enabled, the system bypasses the entire traversal check and lets users access resources that an inaccessible parent would otherwise block. In Listing 8-1, we verify the privilege's behavior using OMNS directory objects.

```bash
PS> $path = "\BaseNamedObjects\ABC\ORS\XYZ\OBJ"
  PS> $os = New-NtMutant $path -CreateDirectories
  PS> Enable-NtTokenPrivilege SeChangeNotifyPrivilege
  PS> Test-NtObject $path
  True
  PS> $sd = New-NtSecurityDescriptor -EmptyDac1
  PS> Set-NtSecurityDescriptor "\BaseNamedObjects\ABC\ORS" $sd Dac1
  PS> Test-NtObject $path
  @ True
  @ PS> Disable-NtTokenPrivilege SeChangeNotifyPrivilege
  PS> Test-NtObject $path
  False
  @ PS> Test-NtObject "OBJ" -Root $os[1]
  True
```

Listing 8-1: Testing SeChangeNotifyPrivilege to bypass traversal checks

We first create a Mutant object and all its parent directories, automating the directory creation by using the CreateDirectories property . We ensure the privilege is enabled and then use the Test-NotObject command to check whether the Mutant object can be opened. In the output, we can see we're able to open the Mutant object.

We then set a security descriptor with an empty DACL on the QRS directory . This should block all access to the directory object, including Traverse access. But when we check our access again, we see that we can still access the Mutant object because we have the SeChangeNotifyPrivilege privilege enabled .

We now disable the privilege and try again to open the Mutant object ❸ . This time, the directory traversal fails. Without the SeChangeNotifyPrivilege privilege or access to the QRS directory, we can no longer open the Mutant object. However, our final check demonstrates that if we have access to a parent after QRS , such as XYZ , we can access the Mutant object via a relative open by using the directory as the Root parameter ❹ .

## Limited Checks

The kernel contains an additional performance improvement for traversal checks. If the SearchNetPrivilegesPrivilege is disabled, the kernel will

Other Access Checking Use Cases 267

---

call the SefastTraverseCheck function, which performs a more limited check instead of a full access check. For completeness, I have reimplemented the SefastTraverseCheck function in PowerShell so that we can explore its behavior in more detail. Listing 8-2 shows the implementation.

```bash
function Get-FastTraverseCheck {
    Param(
        @ $TokenFlags,
        $SecurityDescriptor,
        $AccessMask
    )
    @ if ($SecurityDescriptor.DaclNull) {
        return $true
    }
    @ if (($TokenFlags -band "IsFiltered, IsRestricted") -ne 0) {
        return $false
    }
    $sid = Get-Ntsid -KnownSid World
    foreach($ace in $SecurityDescriptor.Dacl) {
        @ if ($ace.IsInheritedOnly -or !$ace.IsAccessGranted($AccessMask)) {
            continue
        }
        @ if ($ace.IsDeniedAce) {
            return $false
        }
        @ if ($ace.IsAllowedAce -and $ace.Sid -eq $sid) {
            return $true
        }
    @ return $false
}
```

Listing 8-2: A PowerShell implementation of SeFastTraverseCheck

First, we define the three parameters the function takes: the token's flags, a directory object's security descriptor, and the Traverse access rights to check . We specify the access rights because the object manager and the I/O manager use this function for Directory and File objects, and the value of the Traverse access right differs between the two object types; specifying the access as a parameter allows the check function to handle both cases.

Next, we check whether the security descriptor's DACL is NULL, granting access if it is 0. We follow this with a check on two token flags ❸. If the flags indicate that the token is filtered or restricted, then the fast check fails. The kernel copies these flags from the caller's Token object. We can get the flags from user mode using the Flags property on a Token object, as shown in Listing 8-3.

```bash
PS> $token = Get-NtToken -Pseudo -Primary
PS> $token.Flags
VirtualizeAllowed, IsFiltered, NotLow
```

268 Chapter 8

---

```bash
PS> $token.ElevationType
Limited
```

### Listing 8-3: Querying token flags

Notice that the flags include IsFiltered . If you're not running in a restricted token sandbox, why would this flag be set? Querying the token elevation type shows that it's Limited , which means it's the default token for a UAC administrator. To convert the full administrator token to the default token, LSASS uses the NtFilterToken system, which will set the IsFiltered flag but not IsRestricted , as it's only removing groups, not adding restricted SIDs. This means that while a UAC-admin running code as the default user can never pass the fast traversal check, a normal user could. This behavior doesn't have any security implication, but it does mean that if SeChangeNotifyPrivilege is disabled, resource lookup performance will suffer.

The final check in Listing 8-3 consists of enumerating the DACL's ACEs. If the ACE is inherit-only or doesn't contain the required Traverse access mask, it's skipped . If it's a denied ACE, the fast traverse check fails . ♘ and the ACE's SID is not checked at all. Finally, if the ACE is an Allowed ACE and the SID equals the Everyone group's SID, the fast check succeeds . If there are no more ACEs, the check fails .

Note that this fast check doesn't consider whether the caller's token has the Everyone group enabled. This is because typically the only way to remove the Everyone group would be to filter the token. The big exception to this is the anonymous token, which doesn't have any groups but is also not filtered in any way.

Now let's turn to another use for the access check: considering the granted access when assigning a duplicated handle.

## Handle Duplication Access Checks

The system always performs an access check when creating or opening a kernel resource that returns a handle. But what about when that handle is duplicated? In the simplest case, when the new handle has the same granted access mask as the original one, the system won't perform any checks. It's also possible to drop some parts of the granted access mask, and doing so won't trigger an additional access check either. However, if you want to add additional access rights to the duplicated handle, the kernel will query the security descriptor from the object and perform a new access check to determine whether to allow the access.

When you duplicate a handle, you must specify both the source and destination process handles, and the access check occurs in the context of the destination process. This means the access check considers the destination process's primary token, not the source process's, which could be an issue if a privileged process tried to duplicate a handle to a less privileged process with additional access. Such an operation would fail with Access Denied.

Listing 8-4 demonstrates this handle duplication access check behavior.

Other Access Checking Use Cases 269

---

```bash
PS> $d$ = New-NtSecurityDescriptor -EmptyDacI
  @ PS> $m$ = New-NtMutant -Access ModifyState, ReadControl -SecurityDescriptor $d$
  @ PS> Use-NtObject($m2 = Copy-NtObject -Object $m) {
        $m2.GrantedAccess
    }
  ModifyState, ReadControl
  PS> $mask = Get-NtAccessMask -MutantAccess ModifyState
  @ PS> Use-NtObject($m2 = Copy-NtObject -Object $m -DesiredAccessMask $mask) {
        $m2.GrantedAccess
    }
  ModifyState
  @ PS> Use-NtObject($m2 = Copy-NtObject -Object $m -DesiredAccess GenericAll) {
        $m2.GrantedAccess
    }
  Copy-NtObject : (0x0000022) {Access Denied}
  A process has requested access to an object, ...
```

Listing 8-4: Testing the handle duplication access check behavior

We first create a new Mutant object with an empty DACL and request only ModifyState and ReadControl access on the handle ❶ . This will block all users from accessing the object, except for the owner, who can be granted ReadControl and WriteBac access thanks to the owner check described in the previous chapter. We test the duplication by requesting the same access, which the new handle returns ❷ .

Next, we request ModifyState access only . As the %start's DACL is empty, this access right wouldn't be granted during an access check, and because we get ModifyState on the new handle, we know that no access check took place. Finally, we try to increase our access by requesting GenericAll access . An access check must now take place, as we're requesting greater access rights than the handle currently has. This check results in an Access Denied error.

If we hadn't set a security descriptor when creating the mutant, there would be no security associated with the object, and this last check would have succeeded, granting full access. As mentioned in Chapter 2, you need to be careful when duplicating unnamed handles to less privileged processes if you're dropping access; the destination process might be able to replicate the handle to one with more access. In Listing 8-5, we test the #DuplicateObject NoRightsUpgrade flag to see how it affects handle duplication access checking.

```bash
PS> $m = New-NTMutant -Access ModifyState
PS> Use-NtObject($m2 = Copy-NtObject -Object $m -DesiredAccess GenericAll) {
   $m2.GrantedAccess
ModifyState, Delete, ReadControl, WriteDoc, WriteOwner, Synchronize
PS> Use-NtObject($m2 = Copy-NtObject -Object $m -NoRightsUpgrade) {
   Use-NtObject($m3 = Copy-NtObject -Object $m2 -DesiredAccess GenericAll) {}
```

270 Chapter 8

---

```bash
Copyright (c) 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059, 2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069, 2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087, 2088, 2089, 2090, 2091, 2092, 2093, 2094, 2095, 2096, 2097, 2098, 2099, 2100, 2101, 2102, 2103, 2104, 2105, 2106, 2107, 2108, 2109, 2110, 2111, 2112, 2113, 2114, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134, 2135, 2136, 2137, 2138, 2139, 2140, 2141, 2142, 2143, 2144, 2145, 2146, 2147, 2148, 2149, 2150, 2151, 2152, 2153, 2154, 2155, 2156, 2157, 2158, 2159, 2160, 2161, 2162, 2163, 2164, 2165, 2166, 2167, 2168, 2169, 2170, 2171, 2172, 2173, 2174, 2175, 2176, 2177, 2178, 2179, 2180, 2181, 2182, 2183, 2184, 2185, 2186, 2187, 2188, 2189, 2190, 2191, 2192, 2193, 2194, 2195, 2196, 2197, 2198, 2199, 2200, 2201, 2202, 2203, 2204, 2205, 2206, 2207, 2208, 2209, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218, 2219, 2220, 2221, 2222, 2223, 2224, 2225, 2226, 2227, 2228, 2229, 2230, 2231, 2232, 2233, 2234, 2235, 2236, 2237, 2238, 2239, 2240, 2241, 2242, 2243, 2244, 2245, 2246, 2247, 2248, 2249, 2250, 2251, 2252, 2253, 2254, 2255, 2256, 2257, 2258, 2259, 2260, 2261, 2262, 2263, 2264, 2265, 2266, 2267, 2268, 2269, 2270, 2271, 2272, 2273, 2274, 2275, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283, 2284, 2285, 2286, 2287, 2288, 2289, 2290, 2291, 2292, 2293, 2294, 2295, 2296, 2297, 2298, 2299, 2300, 2301, 2302, 2303, 2304, 2305, 2306, 2307, 2308, 2309, 2310, 2311, 2312, 2313, 2314, 2315, 2316, 2317, 2318, 2319, 2320, 2321, 2322, 2323, 2324, 2325, 2326, 2327, 2328, 2329, 2330, 2331, 2332, 2333, 2334, 2335, 2336, 2337, 2338, 2339, 2340, 2341, 2342, 2343, 2344, 2345, 2346, 2347, 2348, 2349, 2350, 2351, 2352, 2353, 2354, 2355, 2356, 2357, 2358, 2359, 2360, 2361, 2362, 2363, 2364, 2365, 2366, 2367, 2368, 2369, 2370, 2371, 2372, 2373, 2374, 2375, 2376, 2377, 2378, 2379, 2380, 2381, 2382, 2383, 2384, 2385, 2386, 2387, 2388, 2389, 2390, 2391, 2392, 2393, 2394, 2395, 2396, 2397, 2398, 2399, 2400, 2401, 2402, 2403, 2404, 2405, 2406, 2407, 2408, 2409, 2410, 2411, 2412, 2413, 2414, 2415, 2416, 2417, 2418, 2419, 2420, 2421, 2422, 2423, 2424, 2425, 2426, 2427, 2428, 2429, 2430, 2431, 2432, 2433, 2434, 2435, 2436, 2437, 2438, 2439, 2440, 2441, 2442, 2443, 2444, 2445, 2446, 2447, 2448, 2449, 2450, 2451, 2452, 2453, 2454, 2455, 2456, 2457, 2458, 2459, 2460, 2461, 2462, 2463, 2464, 2465, 2466, 2467, 2468, 2469, 2470, 2471, 2472, 2473, 2474, 2475, 2476, 2477, 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487, 2488, 2489, 2490, 2491, 2492, 2493, 2494, 2495, 2496, 2497, 2498, 2499, 2500, 2501, 2502, 2503, 2504, 2505, 2506, 2507, 2508, 2509, 2510, 2511, 2512, 2513, 2514, 2515, 2516, 2517, 2518, 2519, 2520, 2521, 2522, 2523, 2524, 2525, 2526, 2527, 2528, 2529, 2530, 2531, 2532, 2533, 2534, 2535, 2536, 2537, 2538, 2539, 2540, 2541, 2542, 2543, 2544, 2545, 2546, 2547, 2548, 2549, 2550, 2551, 2552, 2553, 2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572, 2573, 2574, 2575, 2576, 2577, 2578, 2579, 2580, 2581, 2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593, 2594, 2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604, 2605, 2606, 2607, 2608, 2609, 2610, 2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2620, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 2632, 2633, 2634, 2635, 2636, 2637, 2638, 2639, 2640, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 2674, 2675, 2676, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699,
```

### Listing 8-5: Testing the NtDuplicateObject NoRightsUpgrade flag

We start by creating an unnamed Mutant object, which will have no associated security descriptor. We request the initial handle with ModifyState access only. However, our attempt to duplicate a new handle with GenericAll access succeeds, granting us complete access.

Now we test the NoRightsUpgrade flag. Because we don't specify any access mask, the handle will be duplicated with ModifyState access. With the new handle, we then perform another duplication, this time requesting Genericall access. We can observe that the handle duplication fails. This isn't due to an access check; instead, it's because of a flag set on the handle entry in the kernel indicating that any request for more access should fail immediately. This prevents the handle from being used to gain additional access rights.

The incorrect handling of duplicate handles can lead to vulnerabilities; for example, CVE-2019-0943, an issue I discovered in a privileged service responsible for caching the details of font files on Windows. The service duplicated a Section object handle to a sandbox process with read-only access. However, the sandbox process could convert the handle back to a writable section handle, and the section could be mapped into memory as writable. This allowed the sandbox process to modify the state of the privileged service and escape the sandbox. Windows fixed the vulnerability by duplicating the handle using the @lightweight flag.

## THE THREAD PROCESS CONTEXT

Every thread is associated with a process. Normally, when an access check occurs, the kernel extracts the Process object from the calling thread's object structure and uses it to look up the primary token for the access check. But the thread has a second Process object associated with it: the current process context, which indicates the process in which the thread is currently executing code.

Normally, these objects are the same; however, the kernel sometimes

switches the current process context to another process to save time during

certain tasks, such as handle or virtual memory access. When a process switch

has occurred, any access check on the thread will look up the primary token of

the switched-to process rather than the token belonging to the process associ ated with the thread. Handle duplication operations make use of this process

context switch: the kernel first queries the source process's handle table, then

switches this process context for the calling thread to the destination process to

create the new handle in that process's handle table.

(continued)

---

A process can abuse this behavior to duplicate a handle with more access to a less privileged process. If you call the NTDuplicateObject system call while impersonating your own token with access to the object, when the access check runs it will capture the SECURITY_SUBJECT_CONTEXT for the thread, setting the primary token for the destination process. Crucially, though, it also sets the impersonation token to the identity being impersonated. The result is that the access check will run against the caller's impersonation token rather than the destination process's primary token. This allows a handle to be duplicated with additional granted access rights even if the destination process's primary token could not pass an access check for those rights. You probably shouldn't rely on this behavior in practice, though; it's an implementation detail and might be subject to change.

The access checks that occur during traversal checking and handle duplication are typically hidden from view, but both relate to the security of an individual resource. Next, we'll discuss how access checks limit the information we can extract and the operations we can perform for a group of resources. These restrictions occur based on the caller's token, regardless of the individual access set for those resources.

## Sandbox Token Checks

Beginning in Windows 8, Microsoft has tried to make it harder to compromise the system by escaping sandbox token restrictions. This is especially important for software such as web browsers and document readers, which process untrusted content from the internet.

The kernel implements two APIs that use an access check to determine whether the caller is in a sandbox: fxsRestrictedCaller , introduced in Windows 8, and RtlTxSnailboxToken , introduced in Windows 10. These APIs produce equivalent results; the difference between them is that

fxsRestrictedCaller checks the token of the caller, while RtlTxSnailboxToken checks a specified Token object that doesn't have to be the caller's.

Internally, these APIs perform an access check for the token and grant access only if the token is not in a sandbox. Listing 8-6 shows a reimplementation of this access check in PowerShell.

```bash
PS> $type = New-NTType -Name "sandbox" -GenericRead 0x20000
-Genericall 0xf10001
PS> $sd = New-NtSecurityDescriptor -NullDacl -Owner "SY" -Group "SY"
-Type $type
PS> Set-NtSecurityDescriptorIntegrityLevel $sd Medium -Policy NoReadUp
PS> Get-NtGrantedAccess -SecurityDescriptor $sd -Access 0x20000 -PassResult
Status             Granted Access Privileges
---------- -------------------------------
STATUS SUCCESS           GenericRead    NONE
```

272 Chapter 8

---

```bash
PS> Use-NTObject($token = Get-NTToken -Duplicate -IntegrityLevel Low) {
    Get-NTGrantedAccess -SecurityDescriptor $sd -Access 0x20000
    -Token $token -PassResult
}
Status                 Granted Access Privileges
---------------------------------------
STATUS_ACCESS_DENIED None        NONE
```

Listing 8-6: An access check for a sandbox token

First, we need to define a dummy kernel object type using the New-NType command. This allows us to specify the generic mapping for the access check. We specify only the GenericRead and GenericAll values, as write and execute access are not important in this context. Note that the new type is local to PowerShell; the kernel doesn't know anything about it.

We then define a security descriptor with a NULL DACL and the owner and group SIDs set to the SYSTEM user. The use of a NULL DACL will deny access to lowbox tokens, as described in the previous chapter, but not to any other sandbox token type, such as restricted tokens.

To handle other token types, we add a Medium mandatory label ACE with a NoReadUp policy. As a result, any token with an integrity level lower than Medium will be denied access to the mask specified in the generic mapping's GenericRead field. Lowbox tokens ignore the Medium mandatory label, but we've covered these tokens using the NULL DACL. Note that this security descriptor doesn't consider restricted tokens with a Medium integrity level to be sandbox tokens. It's not clear if this is an intentional oversight or a bug in the implementation.

We can now perform an access check with the Get-NT@rainedAccess command, using the current, non-sandboxed token. The access check succeeds, granting us GenericRead access. If we repeat the check with a token that has a low integrity level, the system denies us access, indicating that the token is sandboxed.

Behind the scenes, the kernel APIs call the SeAccessCheck API, which will return an error if the caller has an Identification-level impersonation token. Therefore, the kernel will consider some impersonation tokens to be sandboxed even if the implementation in Listing 8-6 would indicate otherwise.

When either API indicates that the caller is sandboxed, the kernel changes its behavior to do the following:

- • List only processes and threads that can be directly accessed.

• Block access to loaded kernel modules.
• Enumerate open handles and their kernel object addresses.
• Create arbitrary file and object manager symbolic links.

• Create a new restricted token with more access.
For example, in Listing 8-7, we query for handles while impersonating a low integrity level token and are denied access.

---

```bash
PS> Invoke-NtToken -Current -IntegrityLevel low {
        Get-NtHandle -ProcessId $pid
Get-NtHandle : (0x0000022) - {Access Denied}
A process has requested access to an object, ...
```

Listing 8-7: Querying for handle information while impersonating a Low integrity level token

While only kernel-mode code can access ExIsRestrictedCalled, you can access RtlIsSandboxToken in user mode, as it's also exported in NTDLL. This allows you to query the kernel using a token handle to find out whether the kernel thinks it is a sandbox token. The RtlIsSandboxToken API exposes its result in the Token object's IsSandbox property, as shown in Listing 8-8.

```bash
PS> Use-NtObject($token = Get-NtToken) {
    $token.IsSandbox
}
False
PS> Use-NtObject($token = Get-NtToken -Duplicate -IntegrityLevel Low) {
   $token.IsSandbox
}
True
```

Listing 8-8: Checking the sandbox status of tokens

The Process object returned by Get-MProcess has an I5sandboxToken property. Internally, this property opens the process's token and calls I5sandbox. We can use this property to easily discover which processes are sandboxed, by using the script in Listing 8-9, for example.

```bash
PS> Use-NObject(&ps = Get-NtProcess -FilterScript {$._IsSandboxToken}) {
    $ps | For-Object { Write-Host "$(_.ProcessId) $($_.Name)" }
}
7128 StartMenuExperienceHost.exe
7584 TextInputHost.exe
4928 SearchApp.exe
7732 ShellExperienceHost.exe
1072 Microsoft.Photos.exe
7992 YourPhone.exe
```

Listing 8-9: Enumerating all sandboxed processes for the current user

These sandbox checks are an important feature for limiting information disclosure and restricting dangerous functionality such as symbolic links, which improve an attacker's chances of escaping the sandbox and gaining additional privileges. For example, blocking access to the handle table prevents the disclosure of kernel object addresses that could be used to exploit kernel memory corruption vulnerabilities.

We've now covered three uses of the access check for purposes not related to opening a resource. We'll finish this chapter by describing some commands that simplify access checking over a range of individual resources.

274 Chapter B

---

## Automating Access Checks

The previous chapter provided a worked example that used Get-migrated Access to determine the granted access for a collection of kernel objects. If you want to check a different type of resource, such as files, you'll need to modify that script to use file commands.

Because checking for the granted access across a range of resources is such a useful operation, the PowerShell module comes with several commands to automate the process. The commands are designed to allow you to quickly assess the security attack surface of available resources on a Windows system. They all start with Get-Accessible, and you can use Get-Command to list them, as shown in Listing 8-10.

```bash
PS> Get-Command Get-Accessible* | Format-Wide
Get-AccessibleAlpPort
Get-AccessibleEventTrace
Get-AccessibleHandle
Get-AccessibleNamedPipe
Get-AccessibleProcess
Get-AccessibleService
Get-AccessibleWindowStation
Get-AccessibleMnf
```

Listing 8-10: Listing the Get-Accessible\* commands

We'll come back to some of these commands in later chapters. Here, we'll focus on the Get-AccessibleObject command, which we can use to automate access checking over the entire OMNS. The command lets you specify an OMNS path to check, then enumerates the OMNS and reports either the maximum granted access or whether a specific access mask can be granted.

You can also specify what tokens to use for the access check. The command can source tokens from the following list:

- • Token objects

• Process objects

• Process names

• Process IDs
• Process command lines
If you specify no options when running the command, it will use the current primary token. It will then enumerate all objects based on an OMNS path and perform an access check for every token specified. If the access check succeeds, then the command generates a structured object containing the details of the result. Listing 8-11 shows an example.

```bash
PS> Get-AccessibleObject -Path "\""
TokenId Access                     Name
----------                ---------
CS856B9 GenericExecute|GenericRead  \
```

Listing 8-11: Getting accessible objects from the OMNS root

Other Access Checking Use Cases 275

---

Here, we run the command against the root of the OMNS, and we receive three columns in the output:

TokenId The unique identifier of the token used for the access check

Access The granted access, mapped to generic access rights

Name The name of the checked resource

We can use the tokenId to distinguish the results for the different tokens specified to the command.

This output is only a subset of the result produced by the Get-Accessible

Object command. You can extract the rest of the information using commands like format-list. You can also display the copy of the security descriptor used to perform the access check with the Format-NtSecurityDescriptor

PowerShell command, as shown in Listing 8-12.

```bash
PS> Get-AccessibleObject -Path \ | Format-NtSecurityDescriptor -Summary
<Owner> : BUILTIN\Administrators
<Group> : NT AUTHORITYSYSTEM
<DACL>
Everyone: (Allowed)(None)(Query|Traverse|ReadControl)
NT AUTHORITYSYSTEM: (Allowed)(None)(Full Access)
BUILTIN\Administrators: (Allowed)(None)(Full Access)
NT AUTHORITYRESTRICTED: (Allowed)(None)(Query|Traverse|ReadControl)
```

Listing 8-12: Displaying the security descriptor used for the access check

As we've run the command against a directory here, you might wonder if it will also list the objects contained within the directory. By default, no; the command opens the path as an object and does an access check. If you want to recursively check all objects in the directory, you need to specify the

recurse parameter. The Get-AccessibleObject command also accepts a Depth parameter you can use to specify the maximum recursive depth. If you run a recursive check as a non-administrator user, you might see a lot of warnings, as in Listing 8-13.

```bash
PS> Get-AccessibleObject -Path \| "~=Reuse"
WARNING: Couldn't access \PendingRenameMutex - Status: STATUS_ACCESS_DENIED
WARNING: Couldn't access \ObjectTypes - Status: STATUS_ACCESS_DENIED
===snip==
```

Listing 8-13: Warnings when recursively enumerating objects

You can turn off the warnings by setting the warningAction parameter to Ignore, but keep in mind that they're trying to tell you something. For the command to work, it needs to open each object and query its security descriptor. From user mode, this requires passing the access check during the opening; if you don't have permission to open an object for ReadControl access, the command can't perform an access check. For better results, you can run the command as an administrator, and for the best results, run it as the SYSTEM user by using the Start- Win32ChildProcess command to start a SYSTEM PowerShell shell.

---

By default, the command will perform the access check using the caller's token. But if you're running the command as an administrator, you probably won't want this behavior, as almost all resources will allow administrators full access. Instead, consider specifying arbitrary tokens to check against the resource. For example, when run as a UAC administrator, the following command recursively opens the resources using the administrator token but performs the access check with the non-administrator token from the Explorer process:

```bash
PS> Get-AccessibleObject -Path \ -ProcessName explorer.exe -Recurse
```

It's common to want to filter the list of objects to check. You could run the access check against all the objects and then filter the list afterward, but this would require a lot of work that you'll then just throw away. To save you some time, the Get-AccessibleObject command supports multiple filter parameters:

TypeFilter A list of NT type names to check

Filter A name filter used to restrict which objects are opened; can contain wildcards

Include A name filter used to determine which results to include in the output

Exclude A name filter used to determine which results to exclude from the output

Access An access mask used to limit the output to only objects with specific granted access

For example, the following command will find all the Mutant objects that can be opened with genericAll access:

```bash
PS> Get-AccessibleObject -Path \ -TypeFilter Mutant -Access GenericAll
-Recurse
```

By default, the Access parameter requires that all access be granted before outputting a result. You can modify this by specifying AllowPartial Access, which will output any result that partially matches the specified access. If you want to see all results regardless of the granted access, specify AllowEmptyAccess.

## Worked Examples

Let's wrap up with some worked examples that use the commands you've learned about in this chapter.

### Simplifying an Access Check for an Object

In the previous chapter, we used the Get-NGrantedAccess command to automate an access check against kernel objects and determine their maximum

Other Access Checking Use Cases 277

---

granted access. To accomplish this, we first needed to query for an object's security descriptor. We then passed this value to the command along with the type of kernel object to check.

If you have a handle to an object, you can simplify the call to the Get-NTGrantedAccess command by specifying the object with the Object parameter, as shown in Listing 8-14.

```bash
PS> $key = Get-NTkey HKLM\Software -Win32Path -Access ReadControl
PS> Get-NTGrantedAccess -Object $key
QueryValue, EnumerateSubKeys, Notify, ReadControl
```

Listing 8-14: Running an access check on an object

Using the object parameter eliminates the need to manually extract the security descriptor from the object and will automatically select the correct generic mapping structure for the kernel object type. This reduces the risk that you'll make mistakes when performing an object access check.

## Finding Writable Section Objects

The system uses Section objects to share memory between processes. If a privileged process sets a weak security descriptor, it might be possible for a less privileged process to open and modify the contents of the section. This can lead to security issues if that section contains trusted parameters that can trick the privileged process into performing privileged operations.

I identified a vulnerability of this class, CVE-2014-6349, in Internet Explorer's sandbox configuration. The configuration incorrectly secured a shared Section object, allowing sandboxed Internet Explorer processes to open it and disable the sandbox entirely. I discovered this issue by performing an access check for Maptrite access on all named Section objects. Once I had identified all sections with this access right, I manually determined whether any of them were exploitable from the sandbox. In Listing 8-15 , we automate the discovery of writable sections using the Get-AccessibleObject command.

```bash
♦ PS> $access = Get-NtAccessMask -SectionAccess MapWrite -AsGenericAccess
  ♦ PS> $objs = NtObject($token = Get-NtToken -Duplicate
    -IntegrityLevel Low) {
      ♦ Get-AccessibleObject -Win32Path "\" -Recurse -Token $token
    -TypeFilter Section -Access $access
  ♦ PS> $objs | ForEach-Object {
      ♦ Use-NtObject($sect = Get-NtSection -Path $_.Name) {
        Use-NtObject($map = Add-NtSection $sect -Protection ReadWrite
      -ViewSize 4096) {
        Write-Host "$($sect.FullPath)"
        Out-HexDump -ShowHeader -ShowAscii -HideRepeating -Buffer $map |
  Out-Host
    }
    }
```

278 Chapter 8

---

```bash
\Sessions\1\BaseNamedObjects\windows_ie_global_counters
00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F - 0123456789ABCDEFG
----------------------
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

Listing 8-15: Enumerating writable Section objects for a Low integrity level token

We start by calculating the access mask for the MapWrite access and converting it into a generic access enumeration ❶ . The Get-AccessibleObject command takes only generic access, as it doesn't know ahead of time what objects you're likely to want to check for. We then duplicate the current user's token and set its integrity level to Low , producing a simple sandbox ❷ .

We pass the token and access mask to Get-AccessibleObject, performing a recursive check in the user's BaseNamedObjects directory by specifying a single path separator to the Win32Path parameter . The results returned from the command should contain only sections that can be opened for MapWrite access.

Finally, we enumerate the list of discovered sections, displaying their names and the initial contents of any discovered writable Section object. We open each named section, map up to the first 4,096 bytes into memory, and then output the contents as a hex dump. We map the section as writable, as it's possible the Section object's security descriptor grants M#write access but that the section was created read-only. In this case, mapping ReadWrite will fail with an error.

You can use this script as is to find noteworthy writable sections. You don't have to use a sandbox token; it can be interesting to see the sections available for a normal user that are owned by privileged processes. You can also use this as a template for performing the same check for any other kernel object type.

## Wrapping Up

In this chapter, we looked at some examples of the uses of access checking outside of opening a resource. We first considered traversal checks, which are used to determine if a user can traverse a hierarchical list of containers, such as object directories. Then we discussed how access checks are used when handles are duplicated between processes, including how this can create security issues if the object has no name or security descriptor configured.

Next, we explored how an access check can be used to determine if a caller's token is sandboxed. The kernel does this to limit access to information or certain operations, to make it more difficult to exploit specific classes of security vulnerabilities. Finally, we saw how to automate access checks for various resource types with Get-Accessible commands. We looked

Other Access Checking Use Cases 279

---

at the basic parameters common to all commands and how to use them to enumerate accessible named kernel objects.

That's the end of our examination of the access check process. In the next chapter, we'll cover the last remaining responsibility of the SRM: security auditing.

---
