# OCI Service Integration Patterns

**Comprehensive patterns for integrating with core Oracle Cloud Infrastructure services.**

Source: Official Oracle Documentation, OCI SDK repositories, research synthesis

---

## Object Storage Service

### Overview

Object Storage is a regional service for storing large amounts of unstructured data as objects. Objects are organized into buckets with strong consistency and high durability.

**Key Features:**

- Regional service (data stays in selected region)
- Strong consistency (immediate read-after-write)
- Pre-authenticated requests for temporary access
- Versioning and lifecycle policies
- Multipart upload for large objects (>100MB)

### SDK Patterns

**Go:**

```go
import (
    "context"
    "github.com/oracle/oci-go-sdk/v65/common"
    "github.com/oracle/oci-go-sdk/v65/objectstorage"
)

// Initialize client
provider := common.DefaultConfigProvider()
client, err := objectstorage.NewObjectStorageClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// Get namespace (required for all operations)
namespaceRequest := objectstorage.GetNamespaceRequest{}
namespace, err := client.GetNamespace(context.Background(), namespaceRequest)
if err != nil {
    return err
}

// Upload object
file, _ := os.Open("data.json")
defer file.Close()

putRequest := objectstorage.PutObjectRequest{
    NamespaceName: namespace.Value,
    BucketName:    common.String("my-bucket"),
    ObjectName:    common.String("data.json"),
    PutObjectBody: file,
    ContentType:   common.String("application/json"),
}

_, err = client.PutObject(context.Background(), putRequest)
if err != nil {
    return err
}

// Download object
getRequest := objectstorage.GetObjectRequest{
    NamespaceName: namespace.Value,
    BucketName:    common.String("my-bucket"),
    ObjectName:    common.String("data.json"),
}

response, err := client.GetObject(context.Background(), getRequest)
if err != nil {
    return err
}
defer response.Content.Close()

// Read object content
data, _ := io.ReadAll(response.Content)
```

**Python:**

```python
from oci import config
from oci.object_storage import ObjectStorageClient

# Initialize client
config = config.from_file()
client = ObjectStorageClient(config)

# Get namespace
namespace = client.get_namespace().data

# Upload object
with open('data.json', 'rb') as file:
    client.put_object(
        namespace_name=namespace,
        bucket_name='my-bucket',
        object_name='data.json',
        put_object_body=file,
        content_type='application/json'
    )

# Download object
response = client.get_object(
    namespace_name=namespace,
    bucket_name='my-bucket',
    object_name='data.json'
)

with open('downloaded.json', 'wb') as file:
    for chunk in response.data.raw.stream(1024 * 1024, decode_content=False):
        file.write(chunk)
```

### Pre-Authenticated Requests (PAR)

Generate temporary URLs for object access without authentication:

**Go:**

```go
parRequest := objectstorage.CreatePreauthenticatedRequestRequest{
    NamespaceName: namespace.Value,
    BucketName:    common.String("my-bucket"),
    CreatePreauthenticatedRequestDetails: objectstorage.CreatePreauthenticatedRequestDetails{
        Name:       common.String("temp-access"),
        ObjectName: common.String("data.json"),
        AccessType: objectstorage.CreatePreauthenticatedRequestDetailsAccessTypeObjectRead,
        TimeExpires: &common.SDKTime{Time: time.Now().Add(24 * time.Hour)},
    },
}

parResponse, err := client.CreatePreauthenticatedRequest(context.Background(), parRequest)
// Use parResponse.AccessUri for temporary access
```

### Multipart Upload (Large Files)

For objects >100MB, use multipart upload:

**Python:**

```python
from oci.object_storage.transfer.upload_manager import UploadManager

upload_manager = UploadManager(client, allow_parallel_uploads=True)

# Automatically handles multipart for large files
upload_manager.upload_file(
    namespace_name=namespace,
    bucket_name='my-bucket',
    object_name='large-file.iso',
    file_path='/path/to/large-file.iso'
)
```

---

## Compute Service

### Overview

OCI Compute provides virtual machines and bare metal instances for running applications.

**Instance Types:**

- **Bare Metal**: Dedicated physical servers (highest performance)
- **Virtual Machines**: Standard, DenseIO, Optimized shapes
- **Flexible Shapes**: Customize OCPUs and memory independently

### SDK Patterns

**Go:**

```go
import (
    "github.com/oracle/oci-go-sdk/v65/core"
    "github.com/oracle/oci-go-sdk/v65/common"
)

// Initialize client
provider := common.DefaultConfigProvider()
client, err := core.NewComputeClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// List instances
listRequest := core.ListInstancesRequest{
    CompartmentId: common.String("ocid1.compartment.oc1..xxxxx"),
}

instances, err := client.ListInstances(context.Background(), listRequest)
if err != nil {
    return err
}

for _, instance := range instances.Items {
    fmt.Printf("Instance: %s, State: %s\n", *instance.DisplayName, instance.LifecycleState)
}

// Launch instance
launchRequest := core.LaunchInstanceRequest{
    LaunchInstanceDetails: core.LaunchInstanceDetails{
        AvailabilityDomain: common.String("US-ASHBURN-AD-1"),
        CompartmentId:      common.String("ocid1.compartment.oc1..xxxxx"),
        Shape:              common.String("VM.Standard2.1"),
        DisplayName:        common.String("my-instance"),
        ImageId:            common.String("ocid1.image.oc1..xxxxx"),
        SubnetId:           common.String("ocid1.subnet.oc1..xxxxx"),
        CreateVnicDetails: &core.CreateVnicDetails{
            AssignPublicIp: common.Bool(true),
            SubnetId:       common.String("ocid1.subnet.oc1..xxxxx"),
        },
        Metadata: map[string]string{
            "ssh_authorized_keys": publicKey,
        },
    },
}

response, err := client.LaunchInstance(context.Background(), launchRequest)
if err != nil {
    return err
}

fmt.Printf("Launched instance: %s\n", *response.Instance.Id)
```

**Python:**

```python
from oci.core import ComputeClient
from oci.core.models import LaunchInstanceDetails, CreateVnicDetails

# Initialize client
config = config.from_file()
client = ComputeClient(config)

# List instances
instances = client.list_instances(
    compartment_id='ocid1.compartment.oc1..xxxxx'
).data

for instance in instances:
    print(f"Instance: {instance.display_name}, State: {instance.lifecycle_state}")

# Launch instance
launch_details = LaunchInstanceDetails(
    availability_domain='US-ASHBURN-AD-1',
    compartment_id='ocid1.compartment.oc1..xxxxx',
    shape='VM.Standard2.1',
    display_name='my-instance',
    image_id='ocid1.image.oc1..xxxxx',
    subnet_id='ocid1.subnet.oc1..xxxxx',
    create_vnic_details=CreateVnicDetails(
        assign_public_ip=True,
        subnet_id='ocid1.subnet.oc1..xxxxx'
    ),
    metadata={
        'ssh_authorized_keys': public_key
    }
)

response = client.launch_instance(launch_details)
print(f"Launched instance: {response.data.id}")
```

### Instance Actions

**Start/Stop/Reboot instances:**

```go
// Stop instance
stopRequest := core.InstanceActionRequest{
    InstanceId: common.String(instanceId),
    Action:     core.InstanceActionActionStop,
}
client.InstanceAction(context.Background(), stopRequest)

// Start instance
startRequest := core.InstanceActionRequest{
    InstanceId: common.String(instanceId),
    Action:     core.InstanceActionActionStart,
}
client.InstanceAction(context.Background(), startRequest)
```

### Waiting for Instance State

```go
// Wait for instance to reach RUNNING state
waiterRequest := core.GetInstanceRequest{
    InstanceId: common.String(instanceId),
}

_, err = client.GetInstance(context.Background(), waiterRequest)
if err != nil {
    return err
}

// Poll until RUNNING
for {
    response, _ := client.GetInstance(context.Background(), waiterRequest)
    if response.LifecycleState == core.InstanceLifecycleStateRunning {
        break
    }
    time.Sleep(5 * time.Second)
}
```

---

## Virtual Cloud Network (VCN)

### Overview

VCN is a software-defined private network in OCI. Provides network isolation, routing, security, and connectivity.

**Key Components:**

- **VCN**: Regional private network (CIDR block)
- **Subnets**: Subdivisions of VCN (public or private)
- **Route Tables**: Define traffic routing rules
- **Security Lists**: Subnet-level firewall rules
- **Network Security Groups (NSGs)**: Instance-level security
- **Gateways**: Internet Gateway, NAT Gateway, Service Gateway, DRG

### SDK Patterns

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/core"

// Initialize VCN client
provider := common.DefaultConfigProvider()
client, err := core.NewVirtualNetworkClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// Create VCN
createVcnRequest := core.CreateVcnRequest{
    CreateVcnDetails: core.CreateVcnDetails{
        CidrBlock:     common.String("10.0.0.0/16"),
        CompartmentId: common.String("ocid1.compartment.oc1..xxxxx"),
        DisplayName:   common.String("my-vcn"),
        DnsLabel:      common.String("myvcn"),
    },
}

vcnResponse, err := client.CreateVcn(context.Background(), createVcnRequest)
if err != nil {
    return err
}

vcnId := vcnResponse.Vcn.Id

// Create subnet
createSubnetRequest := core.CreateSubnetRequest{
    CreateSubnetDetails: core.CreateSubnetDetails{
        CidrBlock:     common.String("10.0.1.0/24"),
        CompartmentId: common.String("ocid1.compartment.oc1..xxxxx"),
        VcnId:         vcnId,
        DisplayName:   common.String("public-subnet"),
        DnsLabel:      common.String("public"),
    },
}

subnetResponse, err := client.CreateSubnet(context.Background(), createSubnetRequest)
if err != nil {
    return err
}

// Create Internet Gateway
createIgwRequest := core.CreateInternetGatewayRequest{
    CreateInternetGatewayDetails: core.CreateInternetGatewayDetails{
        CompartmentId: common.String("ocid1.compartment.oc1..xxxxx"),
        IsEnabled:     common.Bool(true),
        VcnId:         vcnId,
        DisplayName:   common.String("internet-gateway"),
    },
}

igwResponse, err := client.CreateInternetGateway(context.Background(), createIgwRequest)
if err != nil {
    return err
}
```

**Python:**

```python
from oci.core import VirtualNetworkClient
from oci.core.models import CreateVcnDetails, CreateSubnetDetails, CreateInternetGatewayDetails

# Initialize client
config = config.from_file()
client = VirtualNetworkClient(config)

# Create VCN
vcn_details = CreateVcnDetails(
    cidr_block='10.0.0.0/16',
    compartment_id='ocid1.compartment.oc1..xxxxx',
    display_name='my-vcn',
    dns_label='myvcn'
)

vcn = client.create_vcn(vcn_details).data

# Create subnet
subnet_details = CreateSubnetDetails(
    cidr_block='10.0.1.0/24',
    compartment_id='ocid1.compartment.oc1..xxxxx',
    vcn_id=vcn.id,
    display_name='public-subnet',
    dns_label='public'
)

subnet = client.create_subnet(subnet_details).data

# Create Internet Gateway
igw_details = CreateInternetGatewayDetails(
    compartment_id='ocid1.compartment.oc1..xxxxx',
    is_enabled=True,
    vcn_id=vcn.id,
    display_name='internet-gateway'
)

igw = client.create_internet_gateway(igw_details).data
```

### Network Security Groups (NSGs)

Recommended over security lists for granular, instance-level security:

```python
from oci.core.models import CreateNetworkSecurityGroupDetails, AddNetworkSecurityGroupSecurityRulesDetails, SecurityRule

# Create NSG
nsg_details = CreateNetworkSecurityGroupDetails(
    compartment_id=compartment_id,
    vcn_id=vcn_id,
    display_name='web-servers-nsg'
)

nsg = client.create_network_security_group(nsg_details).data

# Add ingress rule (allow HTTP)
security_rules = AddNetworkSecurityGroupSecurityRulesDetails(
    security_rules=[
        SecurityRule(
            direction='INGRESS',
            protocol='6',  # TCP
            source='0.0.0.0/0',
            tcp_options=oci.core.models.TcpOptions(
                destination_port_range=oci.core.models.PortRange(min=80, max=80)
            )
        )
    ]
)

client.add_network_security_group_security_rules(nsg.id, security_rules)
```

---

## IAM (Identity and Access Management)

### Overview

IAM controls access to OCI resources through users, groups, policies, and compartments.

**Key Concepts:**

- **Compartments**: Logical containers for organizing resources
- **Users**: Individual identities
- **Groups**: Collections of users
- **Policies**: Rules defining what groups can do in which compartments
- **Dynamic Groups**: Groups of resources (instances, functions)

### SDK Patterns

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/identity"

// Initialize IAM client
provider := common.DefaultConfigProvider()
client, err := identity.NewIdentityClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// List users
listUsersRequest := identity.ListUsersRequest{
    CompartmentId: common.String(tenancyId),
}

users, err := client.ListUsers(context.Background(), listUsersRequest)
if err != nil {
    return err
}

// Create user
createUserRequest := identity.CreateUserRequest{
    CreateUserDetails: identity.CreateUserDetails{
        CompartmentId: common.String(tenancyId),
        Name:          common.String("john.doe@example.com"),
        Description:   common.String("Developer account"),
        Email:         common.String("john.doe@example.com"),
    },
}

userResponse, err := client.CreateUser(context.Background(), createUserRequest)
```

### Policy Management

```python
from oci.identity import IdentityClient
from oci.identity.models import CreatePolicyDetails

client = IdentityClient(config)

# Create policy
policy_details = CreatePolicyDetails(
    compartment_id=compartment_id,
    name='developers-policy',
    description='Allow developers to manage compute',
    statements=[
        'Allow group Developers to manage instance-family in compartment Dev',
        'Allow group Developers to use virtual-network-family in compartment Dev',
        'Allow group Developers to read object-family in compartment Dev'
    ]
)

policy = client.create_policy(policy_details).data
```

---

## Block Volume Service

### Overview

Block Volumes provide persistent storage for compute instances. Can be attached/detached dynamically.

**Features:**

- Up to 32 TB per volume
- Encrypted at rest by default
- Backup and cloning support
- Volume groups for consistency

### SDK Patterns

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/core"

// Create block volume
createVolumeRequest := core.CreateVolumeRequest{
    CreateVolumeDetails: core.CreateVolumeDetails{
        CompartmentId:      common.String(compartmentId),
        AvailabilityDomain: common.String("US-ASHBURN-AD-1"),
        DisplayName:        common.String("data-volume"),
        SizeInGBs:          common.Int64(100),
    },
}

volumeResponse, err := blockStorageClient.CreateVolume(context.Background(), createVolumeRequest)

// Attach volume to instance
attachRequest := core.AttachVolumeRequest{
    AttachVolumeDetails: core.AttachIScsiVolumeDetails{
        InstanceId: common.String(instanceId),
        VolumeId:   volumeResponse.Volume.Id,
    },
}

attachResponse, err := computeClient.AttachVolume(context.Background(), attachRequest)
```

---

## Best Practices

### Regional Architecture

- **Co-locate resources**: Keep compute, storage, and networking in same region for:
  - Zero data transfer costs
  - Lower latency
  - Simplified management

### High Availability

- **Multiple Availability Domains**: Distribute resources across ADs in regions that have them
- **Fault Domains**: Use within single-AD regions for resiliency
- **Regional Subnets**: Span all ADs automatically

### Cost Optimization

- **Free intra-region networking**: Use private IPs for communication
- **Right-size shapes**: Start small, scale up as needed
- **Flexible shapes**: Adjust OCPUs/memory independently
- **Reserved instances**: 20-50% savings for predictable workloads

### Security

- **Least privilege IAM policies**: Grant minimum required permissions
- **NSGs over security lists**: More granular, easier to manage
- **Instance principals**: Eliminate credential storage
- **VCN flow logs**: Enable for auditing

---

## References

- **Official Docs**: [Overview of Core Services](https://docs.oracle.com/en-us/iaas/Content/services.htm)
- **Object Storage**: [Object Storage Documentation](https://docs.oracle.com/en-us/iaas/Content/Object/home.htm)
- **Compute**: [Compute Service Documentation](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)
- **VCN**: [Networking Documentation](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)
- **IAM**: [Identity and Access Management](https://docs.oracle.com/en-us/iaas/Content/Identity/home.htm)
- **SDK Examples**: [OCI Go SDK Examples](https://github.com/oracle/oci-go-sdk/tree/master/example)
