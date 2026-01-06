# OCI Integration Best Practices

**Comprehensive best practices for security, cost optimization, and reliability in Oracle Cloud Infrastructure integrations.**

Source: Official Oracle Documentation, OCI Best Practices Framework, Research Synthesis

---

## Security Best Practices

### 1. Authentication and Authorization

#### Use Instance/Resource Principals in Production

**❌ AVOID:**

```go
// API keys hardcoded or in application code
provider, _ := common.NewConfigurationProviderFromFile("~/.oci/config", "DEFAULT")
```

**✅ PREFER:**

```go
// Instance principals (no credentials stored)
provider, err := auth.InstancePrincipalConfigurationProvider()
```

**Why:** Instance/resource principals eliminate credential storage, provide automatic rotation, and reduce attack surface.

#### Implement Least Privilege IAM Policies

**❌ Too Broad:**

```
Allow group Developers to manage all-resources in tenancy
```

**✅ Specific:**

```
Allow group Developers to manage instance-family in compartment Dev
Allow group Developers to use virtual-network-family in compartment Dev
Allow group Developers to read object-family in compartment Dev where target.bucket.name='dev-data'
```

**Best Practices:**

- Grant minimum required permissions
- Use compartments for resource isolation
- Define dynamic groups with specific matching rules
- Regularly audit and revoke unused permissions

#### Rotate API Keys Regularly

**Schedule:**

- Minimum: Every 90 days
- Recommended: Every 30-60 days
- High security: Every 15-30 days

**Rotation Process:**

1. Generate new key pair
2. Upload new public key to OCI Console
3. Test applications with new key
4. Update all applications
5. Delete old key only after verification

#### Secure Configuration Files

```bash
# Set restrictive permissions
chmod 600 ~/.oci/config
chmod 600 ~/.oci/oci_api_key.pem

# Never commit credentials
echo ".oci/" >> .gitignore
echo "*.pem" >> .gitignore
```

#### Enable MFA

- **Console access**: Require MFA for all users
- **API access**: Use instance principals or session tokens
- **Admin accounts**: Always enable MFA

### 2. Network Security

#### Use NSGs Over Security Lists

**Security Lists (subnet-level):**

- Applied to all resources in subnet
- Less granular control
- Harder to audit

**Network Security Groups (instance-level):**

- Applied to specific resources
- More granular control
- Easier to manage and audit

**Example:**

```python
from oci.core.models import CreateNetworkSecurityGroupDetails, SecurityRule

# Create NSG for web servers
nsg = client.create_network_security_group(
    CreateNetworkSecurityGroupDetails(
        compartment_id=compartment_id,
        vcn_id=vcn_id,
        display_name='web-servers-nsg'
    )
).data

# Add specific rules
client.add_network_security_group_security_rules(
    nsg.id,
    AddNetworkSecurityGroupSecurityRulesDetails(
        security_rules=[
            SecurityRule(
                direction='INGRESS',
                protocol='6',  # TCP
                source='0.0.0.0/0',
                tcp_options=TcpOptions(
                    destination_port_range=PortRange(min=443, max=443)
                ),
                description='Allow HTTPS from internet'
            )
        ]
    )
)
```

#### Disable Unrestricted Access

**❌ Never Allow:**

```
# Security List - DO NOT USE
Ingress rule: 0.0.0.0/0 -> 0.0.0.0/0 (all ports)
Ingress rule: 0.0.0.0/0 -> TCP/22 (SSH)
Ingress rule: 0.0.0.0/0 -> TCP/3389 (RDP)
```

**✅ Always:**

- Restrict SSH/RDP to specific IP ranges (bastion hosts, VPN)
- Use bastion hosts for secure access
- Enable VCN flow logs for auditing

#### Enable VCN Flow Logs

```python
# Enable flow logs on subnet
client.update_subnet(
    subnet_id=subnet_id,
    update_subnet_details=UpdateSubnetDetails(
        freeform_tags={'FlowLogsEnabled': 'true'}
    )
)
```

**Benefits:**

- Network traffic visibility
- Security incident investigation
- Compliance auditing
- Troubleshooting connectivity issues

### 3. Data Protection

#### Encrypt Data at Rest

**Block Volumes:**

- Encrypted by default with Oracle-managed keys
- Use customer-managed keys (CMEK) for sensitive data

**Object Storage:**

- Server-side encryption enabled by default
- Use OCI Vault for CMEK

#### Encrypt Data in Transit

**✅ Always use HTTPS:**

```go
// SDK automatically uses HTTPS
client, err := objectstorage.NewObjectStorageClientWithConfigurationProvider(provider)
// All API calls use TLS 1.2+
```

**For custom applications:**

- Use TLS 1.2 or higher
- Validate SSL certificates
- Don't disable certificate validation

#### Use OCI Vault for Secrets

**❌ AVOID:**

```go
// Secrets in environment variables or config files
apiKey := os.Getenv("API_KEY")
dbPassword := "hardcoded-password"
```

**✅ USE OCI Vault:**

```python
from oci.key_management import KmsVaultClient
from oci.secrets import SecretsClient

# Retrieve secret from Vault
secrets_client = SecretsClient(config)
secret_bundle = secrets_client.get_secret_bundle(secret_id=secret_id)

# Decode secret content
import base64
secret_value = base64.b64decode(secret_bundle.data.secret_bundle_content.content).decode('utf-8')
```

---

## Cost Optimization Best Practices

### 1. Leverage Free Tier

**Always-Free Resources:**

- **Compute**: 2 AMD VMs (1/8 OCPU, 1 GB memory each)
- **Block Storage**: 200 GB total
- **Object Storage**: 20 GB
- **Archive Storage**: 20 GB
- **Load Balancer**: 1 LB (10 Mbps)
- **Outbound Data Transfer**: 10 TB per month

**Use for:**

- Development environments
- Testing
- Small production workloads
- Proof of concepts

### 2. Right-Size Compute Shapes

**Start Small, Scale Up:**

```python
# Start with smallest shape
launch_details = LaunchInstanceDetails(
    shape='VM.Standard.E4.Flex',
    shape_config=LaunchInstanceShapeConfigDetails(
        ocpus=1,
        memory_in_gbs=4
    ),
    # ... other details
)

# Monitor usage and adjust
```

**Flexible Shapes:**

- Adjust OCPUs and memory independently
- Pay only for what you use
- Scale up/down without recreating instances

**Cost Comparison:**
| Shape | OCPUs | Memory | Monthly Cost |
|-------|-------|--------|--------------|
| VM.Standard2.1 | 1 | 15 GB | $50 |
| VM.Standard.E4.Flex (1 OCPU, 4 GB) | 1 | 4 GB | $25 |
| Savings: 50% with flexible shapes |

### 3. Use Reserved Instances

**Savings:**

- 1-year commitment: 20-30% discount
- 3-year commitment: 40-50% discount

**When to use:**

- Predictable, steady-state workloads
- Production databases
- Always-on application servers

**Example:**

```
Standard pricing: $100/month × 12 months = $1,200/year
Reserved (1-year): $80/month × 12 months = $960/year
Savings: $240/year (20%)
```

### 4. Optimize Data Transfer Costs

#### Free Intra-Region Networking

**✅ Always use private IPs within region:**

```go
// Use private IP for communication within region
privateIP := instance.PrimaryPrivateIp

// Connect via private network (free)
url := fmt.Sprintf("http://%s:8080/api", *privateIP)
```

**❌ Avoid public IPs for intra-region:**

```go
// Public IP communication incurs charges
publicIP := instance.PublicIp
url := fmt.Sprintf("http://%s:8080/api", *publicIP)
```

**Cost Impact:**

- Private IP traffic: **Free**
- Public IP traffic: **$0.0085/GB** (inter-AD) to **$0.05/GB** (egress)

#### Leverage Free Egress Allowance

- **10 TB free per month** of data egress
- Plan deployments to maximize intra-region communication
- Use CDN/edge caching to reduce origin egress

### 5. Implement Auto-Scaling

```python
from oci.autoscaling import AutoScalingClient
from oci.autoscaling.models import CreateAutoScalingConfigurationDetails

# Create auto-scaling policy
autoscaling_client.create_auto_scaling_configuration(
    CreateAutoScalingConfigurationDetails(
        compartment_id=compartment_id,
        policies=[
            # Scale up when CPU > 80%
            AutoScalingPolicy(
                capacity=Capacity(initial=2, min=2, max=10),
                rules=[
                    Rule(
                        metric=Metric(
                            metric_type='CPU_UTILIZATION',
                            threshold=PerformanceMetric(operator='GT', value=80)
                        ),
                        action=Action(type='CHANGE_COUNT_BY', value=2)
                    )
                ]
            )
        ]
    )
)
```

**Benefits:**

- Scale up during peak demand
- Scale down during off-hours
- Pay only for what you need

### 6. Delete Unused Resources

**Common waste sources:**

- Stopped instances (still billed for boot volumes)
- Detached block volumes
- Unused VCNs and gateways (NAT Gateway, DRG)
- Old snapshots and backups

**Automated Cleanup:**

```python
# Find and delete old snapshots
import datetime

cutoff_date = datetime.datetime.now() - datetime.timedelta(days=90)

for snapshot in client.list_volume_backups(compartment_id=compartment_id).data:
    if snapshot.time_created < cutoff_date:
        client.delete_volume_backup(volume_backup_id=snapshot.id)
```

### 7. Use Resource Tagging

**Track costs by:**

- Project
- Team
- Environment (dev, staging, prod)
- Cost center

```python
# Tag resources during creation
launch_details = LaunchInstanceDetails(
    # ... other details
    freeform_tags={
        'Project': 'WebApp',
        'Team': 'Engineering',
        'Environment': 'Production',
        'CostCenter': 'CC-1234'
    }
)

# Filter cost reports by tags in OCI Console
```

### 8. Monitor and Alert on Costs

**Set up budget alerts:**

```
OCI Console → Budgets → Create Budget
- Set monthly budget limit
- Configure email alerts at 50%, 80%, 100%
- Review spending weekly
```

**Use Cost Analysis:**

- Identify top spending resources
- Compare month-over-month trends
- Forecast future costs

---

## Reliability Best Practices

### 1. High Availability Architecture

#### Use Multiple Availability Domains

**For regions with 3 ADs:**

```go
// Launch instances across ADs
ads := []string{
    "US-ASHBURN-AD-1",
    "US-ASHBURN-AD-2",
    "US-ASHBURN-AD-3",
}

for _, ad := range ads {
    launchInstance(ad, compartmentId, subnetId)
}
```

#### Use Fault Domains (Single-AD Regions)

```python
# Distribute across fault domains
fault_domains = ['FAULT-DOMAIN-1', 'FAULT-DOMAIN-2', 'FAULT-DOMAIN-3']

for fd in fault_domains:
    client.launch_instance(
        LaunchInstanceDetails(
            availability_domain=ad,
            fault_domain=fd,
            # ... other details
        )
    )
```

#### Use Regional Subnets

**✅ Regional (spans all ADs):**

```python
subnet = CreateSubnetDetails(
    cidr_block='10.0.1.0/24',
    vcn_id=vcn_id,
    # No availability_domain specified = regional
)
```

**❌ AD-specific:**

```python
subnet = CreateSubnetDetails(
    cidr_block='10.0.1.0/24',
    vcn_id=vcn_id,
    availability_domain='US-ASHBURN-AD-1'  # Tied to single AD
)
```

### 2. Implement Health Checks

**Load Balancer Health Checks:**

```python
from oci.load_balancer.models import HealthCheckerDetails

health_checker = HealthCheckerDetails(
    protocol='HTTP',
    url_path='/health',
    port=8080,
    return_code=200,
    retries=3,
    timeout_in_millis=3000,
    interval_in_millis=10000
)
```

**Application Health Endpoints:**

```go
// Implement health check endpoint
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    // Check database connectivity
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    // Check dependencies
    if err := checkDependencies(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
})
```

### 3. Enable Backups and Disaster Recovery

**Automated Backups:**

```python
# Enable automatic backups for block volumes
client.create_volume_backup_policy_assignment(
    CreateVolumeBackupPolicyAssignmentDetails(
        asset_id=volume_id,
        policy_id=backup_policy_id  # Bronze, Silver, or Gold
    )
)

# Bronze: Monthly backups, 12-month retention
# Silver: Weekly backups, 4-week retention
# Gold: Daily backups, 7-day retention
```

**Cross-Region Replication:**

```python
# Copy boot volume backup to different region
client.copy_boot_volume_backup(
    boot_volume_backup_id=backup_id,
    copy_boot_volume_backup_details=CopyBootVolumeBackupDetails(
        destination_region='us-phoenix-1',
        display_name='DR-backup'
    )
)
```

### 4. Monitor and Alert

**Enable Monitoring:**

```python
from oci.monitoring import MonitoringClient
from oci.monitoring.models import PostMetricDataDetails, MetricDataDetails

# Post custom metrics
monitoring_client.post_metric_data(
    PostMetricDataDetails(
        metric_data=[
            MetricDataDetails(
                namespace='custom_app',
                name='request_latency',
                dimensions={'region': 'us-ashburn-1'},
                datapoints=[
                    Datapoint(
                        timestamp=datetime.now(),
                        value=123.45
                    )
                ]
            )
        ]
    )
)
```

**Create Alarms:**

```
OCI Console → Monitoring → Alarms → Create Alarm
- Metric: CPUUtilization
- Threshold: > 80%
- Duration: 5 minutes
- Notification: Email/PagerDuty
```

### 5. Use Circuit Breakers

Prevent cascade failures when dependencies fail:

```go
import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "OCI-API",
    MaxRequests: 3,
    Interval:    time.Minute,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})

result, err := cb.Execute(func() (interface{}, error) {
    return client.GetInstance(ctx, request)
})
```

---

## Operational Best Practices

### 1. Use Infrastructure as Code

**Terraform:**

```hcl
resource "oci_core_instance" "app_server" {
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.compartment_id
  shape               = "VM.Standard.E4.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 8
  }

  source_details {
    source_type = "image"
    source_id   = var.instance_image_ocid
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.app_subnet.id
    assign_public_ip = false
  }
}
```

**Benefits:**

- Version-controlled infrastructure
- Reproducible deployments
- Easier disaster recovery
- Team collaboration

### 2. Implement Structured Logging

```go
import "github.com/sirupsen/logrus"

log := logrus.WithFields(logrus.Fields{
    "service":      "oci-integration",
    "operation":    "LaunchInstance",
    "compartment":  compartmentId,
    "region":       region,
    "request_id":   requestId,
})

log.Info("Launching instance")
log.WithError(err).Error("Launch failed")
```

### 3. Document API Request IDs

Always log OCI request IDs for troubleshooting:

```python
try:
    response = client.list_instances(compartment_id=compartment_id)
except ServiceError as e:
    logger.error(
        f"API call failed: {e.message}",
        extra={'opc_request_id': e.request_id}
    )
```

**Use request IDs when opening Oracle support tickets.**

### 4. Test Failure Scenarios

- Simulate instance failures (terminate, restart)
- Test network failures (security list changes)
- Practice disaster recovery procedures
- Test auto-scaling triggers
- Verify backup/restore processes

---

## Summary Checklist

**Security:**

- [ ] Use instance/resource principals in production
- [ ] Implement least privilege IAM policies
- [ ] Enable MFA for console access
- [ ] Rotate API keys regularly (≤90 days)
- [ ] Use NSGs instead of security lists
- [ ] Enable VCN flow logs
- [ ] Encrypt sensitive data with OCI Vault

**Cost:**

- [ ] Use free tier for dev/test
- [ ] Right-size compute shapes (start small)
- [ ] Use reserved instances for predictable workloads
- [ ] Communicate via private IPs (free intra-region)
- [ ] Implement auto-scaling
- [ ] Delete unused resources
- [ ] Tag all resources for cost tracking
- [ ] Set up budget alerts

**Reliability:**

- [ ] Deploy across multiple ADs/fault domains
- [ ] Use regional subnets
- [ ] Implement health checks
- [ ] Enable automated backups
- [ ] Configure cross-region DR
- [ ] Set up monitoring and alerts
- [ ] Use circuit breakers for API calls

**Operations:**

- [ ] Use infrastructure as code (Terraform)
- [ ] Implement structured logging
- [ ] Document request IDs
- [ ] Test failure scenarios regularly

---

## References

- **Official Docs**: [OCI Best Practices Framework](https://docs.oracle.com/en/solutions/oci-best-practices/)
- **Security**: [Security Best Practices](https://docs.oracle.com/en-us/iaas/Content/Security/Reference/configuration_security.htm)
- **Networking**: [VCN Best Practices](https://docs.oracle.com/en/solutions/oci-best-practices-networking/)
- **Cost**: [Cost Optimization FAQ](https://redresscompliance.com/oracle-oci-cost-optimization-faq/)
- **Trend Micro**: [OCI Best Practice Rules](https://www.trendmicro.com/cloudoneconformity/knowledge-base/oci/)
