# Azure Cost Optimization

Strategies for optimizing Azure costs while maintaining performance and reliability.

---

## Azure Cost Management

### Monitor Costs

```bash
# View current month costs
az consumption usage list \
  --start-date $(date -u -d "1 month ago" +%Y-%m-%d) \
  --end-date $(date -u +%Y-%m-%d)

# Cost by resource group
az consumption usage list \
  --query "value | group_by(@, 'resourceGroup') | [*].{resourceGroup: key, cost: sum([].pretaxCost)}"
```

### Set Budget Alerts

```bash
az consumption budget create \
  --budget-name monthly-budget \
  --amount 1000 \
  --category Cost \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --notifications \
    ActualThreshold=80 \
    ContactEmails="devops@example.com" \
    ContactRoles="Owner,Contributor"
```

---

## Optimization Strategies

### 1. Right-Size Resources

- Use Azure Advisor recommendations
- Monitor CPU/memory utilization
- Downsize overprovisioned resources

### 2. Reserved Instances

**For predictable workloads** (1 or 3 year commitment):

- VMs: Up to 72% savings
- SQL Database: Up to 55% savings
- Cosmos DB: Up to 65% savings

```bash
az reservations reservation-order list
```

### 3. Auto-Scaling

```bash
# App Service auto-scale
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource myAppService \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Scale rule: CPU > 70%
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name myAppService-autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

### 4. Cleanup Unused Resources

```bash
# Find unattached disks
az disk list --query "[?managedBy==null]"

# Find unused public IPs
az network public-ip list --query "[?ipConfiguration==null]"

# Delete unattached resources
```

### 5. Use Spot VMs

Up to 90% savings for interruptible workloads.

### 6. Optimize Storage

- Use appropriate storage tiers (Hot, Cool, Archive)
- Enable lifecycle management
- Clean up old snapshots

---

## Application Insights Cost Optimization

### Adaptive Sampling (10-20% in production)

```python
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatioBased

configure_azure_monitor(
    connection_string=connection_string,
    sampler=ParentBasedTraceIdRatioBased(0.1)  # 10% sampling
)
```

**Savings**: Reduce telemetry costs by 80-90% while preserving statistical accuracy.

---

## Related Documentation

- [Monitoring](monitoring.md) - Application Insights configuration
- For detailed cost analysis, see research: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`
