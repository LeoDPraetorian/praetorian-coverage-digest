8

## OTHER ACCESS CHECKING  USE CASES

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

266    Chapter 8

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

Other Access Checking Use Cases    267

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

268    Chapter 8

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

Other Access Checking Use Cases     269

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

270    Chapter 8

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

272    Chapter 8

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

274    Chapter B

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

Listing 8-10: Listing the Get-Accessible* commands

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

Other Access Checking Use Cases    277

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

278    Chapter 8

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

Other Access Checking Use Cases    279

---

at the basic parameters common to all commands and how to use them to enumerate accessible named kernel objects.

That's the end of our examination of the access check process. In the next chapter, we'll cover the last remaining responsibility of the SRM: security auditing.

---

