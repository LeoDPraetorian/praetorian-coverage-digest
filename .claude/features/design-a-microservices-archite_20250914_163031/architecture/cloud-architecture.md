# AWS Cloud Infrastructure Architecture for Microservices Platform

## Executive Summary

This architecture defines a hybrid serverless/container approach on AWS, leveraging EKS for orchestration, Fargate for cost-effective containerization, and service mesh for zero-trust security. The design optimizes for 1000 RPS per service, <200ms response times, and cost efficiency through strategic workload placement.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet Gateway                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    Application Load Balancer                    │
│                    (Multi-AZ, WAF Enabled)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                      API Gateway v2                            │
│              (Rate Limiting, Authentication)                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    EKS Cluster (Multi-AZ)                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Fargate     │  │   Fargate     │  │   EC2 Nodes   │      │
│  │  Workloads    │  │  Workloads    │  │ (Spot + On-D) │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                    Istio Service Mesh                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     Data Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  DynamoDB   │  │   Neo4j     │  │    Redis    │            │
│  │ (Per-Svc)   │  │  Neptune    │  │  ElastiCache│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## EKS Cluster Design and Configuration

### 1. Cluster Architecture

```yaml
# EKS Cluster Configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: chariot-microservices-cluster
  region: us-east-1
  version: "1.30"

# Enable logging for security and monitoring
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]

# VPC configuration for multi-AZ deployment
vpc:
  cidr: "10.0.0.0/16"
  enableDnsHostnames: true
  enableDnsSupport: true
  
  # NAT Gateway configuration (one per AZ for HA)
  nat:
    gateway: HighlyAvailable
  
  # Dedicated subnets for different workload types
  subnets:
    private:
      us-east-1a:
        cidr: "10.0.1.0/24"
      us-east-1b:
        cidr: "10.0.2.0/24"
      us-east-1c:
        cidr: "10.0.3.0/24"
    public:
      us-east-1a:
        cidr: "10.0.101.0/24"
      us-east-1b:
        cidr: "10.0.102.0/24"
      us-east-1c:
        cidr: "10.0.103.0/24"

# Fargate profiles for serverless containers
fargateProfiles:
  - name: default
    selectors:
      - namespace: default
        labels:
          workload-type: serverless
  - name: microservices
    selectors:
      - namespace: microservices
        labels:
          compute-type: fargate
  - name: system
    selectors:
      - namespace: kube-system
      - namespace: istio-system

# Managed node groups for workloads requiring EC2
managedNodeGroups:
  - name: spot-workers
    instanceTypes: 
      - m6i.large
      - m6i.xlarge
      - m5.large
      - m5.xlarge
    spot: true
    desiredCapacity: 3
    minSize: 1
    maxSize: 20
    volumeSize: 50
    ssh:
      allow: false
    labels:
      workload-type: "batch-processing"
      cost-optimization: "spot"
    taints:
      - key: "spot-instance"
        value: "true"
        effect: "NoSchedule"
  
  - name: on-demand-workers
    instanceTypes:
      - m6i.large
    desiredCapacity: 2
    minSize: 1
    maxSize: 10
    volumeSize: 50
    ssh:
      allow: false
    labels:
      workload-type: "critical-services"
      cost-optimization: "on-demand"

# IAM configuration
iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: aws-load-balancer-controller
        namespace: kube-system
      wellKnownPolicies:
        awsLoadBalancerController: true
    - metadata:
        name: external-dns
        namespace: kube-system
      wellKnownPolicies:
        externalDNS: true
    - metadata:
        name: cluster-autoscaler
        namespace: kube-system
      wellKnownPolicies:
        autoScaler: true

# Add-ons for enhanced functionality
addons:
  - name: vpc-cni
    version: latest
    configurationValues: |-
      env:
        ENABLE_PREFIX_DELEGATION: "true"
        ENABLE_POD_ENI: "true"
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
  - name: aws-efs-csi-driver
    version: latest
```

### 2. Resource Allocation Strategy

```yaml
# Resource allocation for different service types
resources:
  critical_services:
    cpu: "1000m"
    memory: "2Gi"
    replicas:
      min: 3
      max: 100
    compute_type: "fargate"
    
  standard_services:
    cpu: "500m"
    memory: "1Gi"
    replicas:
      min: 2
      max: 50
    compute_type: "fargate"
    
  batch_processing:
    cpu: "2000m"
    memory: "4Gi"
    replicas:
      min: 1
      max: 20
    compute_type: "ec2_spot"
```

## Fargate vs EC2 Deployment Strategies

### 1. Workload Classification Matrix

| Workload Type | Compute Platform | Rationale | Cost Impact |
|---------------|------------------|-----------|-------------|
| **API Services** | Fargate | Predictable load, auto-scaling, no server management | 15-20% premium for operational simplicity |
| **Background Jobs** | EC2 Spot | Long-running, fault-tolerant, cost-sensitive | 60-90% cost reduction |
| **Real-time Processing** | EC2 On-Demand | Low latency requirements, consistent performance | Baseline cost for guaranteed capacity |
| **Batch Analytics** | EC2 Spot + Fargate | Mixed workload optimization | Optimal cost-performance ratio |

### 2. Deployment Decision Tree

```yaml
# Automated workload placement rules
placement_rules:
  api_services:
    - if: "rps > 500 AND latency_requirement < 200ms"
      then: "fargate"
      reason: "Predictable scaling, managed infrastructure"
    
  background_jobs:
    - if: "execution_time > 15min AND fault_tolerant = true"
      then: "ec2_spot"
      reason: "Cost optimization for long-running tasks"
    
  real_time:
    - if: "latency_requirement < 50ms"
      then: "ec2_on_demand"
      reason: "Consistent performance, no cold starts"
```

### 3. Fargate Configuration for Microservices

```yaml
# Optimized Fargate task definition
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: microservice
    image: microservice:latest
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
    env:
    - name: AWS_REGION
      value: "us-east-1"
    - name: ENABLE_WARM_POOLS
      value: "true"
  
  # Fargate-specific annotations
  metadata:
    annotations:
      eks.amazonaws.com/compute-type: fargate
      eks.amazonaws.com/fargate-profile: microservices
```

## Load Balancing and Auto-scaling Patterns

### 1. Multi-Layer Load Balancing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Application Load Balancer                     │
│  Features:                                                      │
│  - SSL Termination                                             │
│  - WAF Integration                                             │
│  - Health Checks                                               │
│  - Geographic Routing                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    API Gateway v2                              │
│  Features:                                                      │
│  - Rate Limiting (1000 RPS per service)                       │
│  - Request/Response Transformation                             │
│  - Authentication & Authorization                              │
│  - API Versioning                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                 Istio Ingress Gateway                          │
│  Features:                                                      │
│  - Service Mesh Entry Point                                   │
│  - mTLS Enforcement                                           │
│  - Traffic Splitting                                          │
│  - Circuit Breaking                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│               Service Mesh Load Balancing                      │
│  - Envoy Proxy Load Balancing                                 │
│  - Health-based Routing                                       │
│  - Locality-aware Routing                                     │
│  - Retry & Timeout Policies                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Horizontal Pod Autoscaler (HPA) Configuration

```yaml
# HPA configuration for microservices
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: microservice-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: microservice
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: "800"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 3. Vertical Pod Autoscaler (VPA) for Resource Optimization

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: microservice-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: microservice
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: microservice
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      controlledResources: ["cpu", "memory"]
```

### 4. Cluster Autoscaler Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.30.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/chariot-microservices-cluster
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --max-node-provision-time=15m
        env:
        - name: AWS_REGION
          value: us-east-1
```

## Network Architecture with VPC Design

### 1. VPC Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     VPC (10.0.0.0/16)                          │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   AZ-1a         │  │   AZ-1b         │  │   AZ-1c         │ │
│  │                 │  │                 │  │                 │ │
│  │ Public Subnet   │  │ Public Subnet   │  │ Public Subnet   │ │
│  │ 10.0.101.0/24   │  │ 10.0.102.0/24   │  │ 10.0.103.0/24   │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │ │
│  │ │    ALB      │ │  │ │    ALB      │ │  │ │    ALB      │ │ │
│  │ │  NAT GW     │ │  │ │  NAT GW     │ │  │ │  NAT GW     │ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │ │
│  │                 │  │                 │  │                 │ │
│  │ Private Subnet  │  │ Private Subnet  │  │ Private Subnet  │ │
│  │ 10.0.1.0/24     │  │ 10.0.2.0/24     │  │ 10.0.3.0/24     │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │ │
│  │ │EKS Nodes    │ │  │ │EKS Nodes    │ │  │ │EKS Nodes    │ │ │
│  │ │Fargate Pods │ │  │ │Fargate Pods │ │  │ │Fargate Pods │ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │ │
│  │                 │  │                 │  │                 │ │
│  │ Database Subnet │  │ Database Subnet │  │ Database Subnet │ │
│  │ 10.0.11.0/24    │  │ 10.0.12.0/24    │  │ 10.0.13.0/24    │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │ │
│  │ │  DynamoDB   │ │  │ │  Neptune    │ │  │ │ElastiCache  │ │ │
│  │ │  Endpoints  │ │  │ │   Cluster   │  │ │  Cluster    │ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Security Groups Configuration

```yaml
# EKS Control Plane Security Group
control_plane_sg:
  ingress:
    - protocol: tcp
      port: 443
      source: worker_nodes_sg
      description: "HTTPS API access from worker nodes"
    - protocol: tcp
      port: 443
      source: bastion_sg
      description: "kubectl access from bastion"
  
  egress:
    - protocol: all
      destination: "0.0.0.0/0"
      description: "All outbound traffic"

# Worker Nodes Security Group
worker_nodes_sg:
  ingress:
    - protocol: tcp
      port_range: 1025-65535
      source: control_plane_sg
      description: "Pod communication from control plane"
    - protocol: tcp
      port_range: 1025-65535
      source: worker_nodes_sg
      description: "Inter-pod communication"
    - protocol: tcp
      port: 22
      source: bastion_sg
      description: "SSH access from bastion"
  
  egress:
    - protocol: all
      destination: "0.0.0.0/0"
      description: "All outbound traffic"

# Database Security Group
database_sg:
  ingress:
    - protocol: tcp
      port: 8182  # Neptune
      source: worker_nodes_sg
      description: "Neptune access from EKS"
    - protocol: tcp
      port: 6379  # Redis
      source: worker_nodes_sg
      description: "Redis access from EKS"
  
  egress: []  # No outbound traffic needed
```

### 3. Service Mesh Network Policies

```yaml
# Istio network policies for zero-trust
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: microservices
spec:
  mtls:
    mode: STRICT

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: microservice-authz
  namespace: microservices
spec:
  selector:
    matchLabels:
      app: microservice
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/microservices/sa/service-account"]
  - to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
```

## Service Mesh Implementation (Istio)

### 1. Istio Installation and Configuration

```yaml
# Istio operator configuration for production
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: control-plane
spec:
  values:
    global:
      meshID: chariot-mesh
      network: chariot-network
      
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2048Mi
          limits:
            cpu: 1000m
            memory: 4096Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10
          
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1024Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10
        service:
          type: LoadBalancer
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
            
    egressGateways:
    - name: istio-egressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1024Mi
```

### 2. Traffic Management Configuration

```yaml
# Virtual Service for microservice routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: microservice-vs
spec:
  hosts:
  - microservice.chariot.local
  gateways:
  - microservice-gateway
  http:
  - match:
    - uri:
        prefix: /v1/
    route:
    - destination:
        host: microservice
        port:
          number: 80
      weight: 90
    - destination:
        host: microservice-canary
        port:
          number: 80
      weight: 10
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 10s

---
# Destination Rule for load balancing
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: microservice-dr
spec:
  host: microservice
  trafficPolicy:
    loadBalancer:
      simple: LEAST_CONN
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    circuitBreaker:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

### 3. Security Policies

```yaml
# mTLS enforcement
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: microservices
spec:
  mtls:
    mode: STRICT

---
# JWT validation
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: microservices
spec:
  selector:
    matchLabels:
      app: microservice
  jwtRules:
  - issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX"
    jwksUri: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json"

---
# Authorization policies
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: microservice-authz
  namespace: microservices
spec:
  selector:
    matchLabels:
      app: microservice
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]
  - to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
  - when:
    - key: request.headers[authorization]
      values: ["Bearer *"]
```

## Data Layer Architecture

### 1. DynamoDB Per-Service Isolation

```yaml
# DynamoDB table configuration per microservice
dynamodb_tables:
  user_service:
    table_name: "UserService-${env}"
    partition_key: "pk"
    sort_key: "sk"
    billing_mode: "PAY_PER_REQUEST"
    point_in_time_recovery: true
    encryption_at_rest: true
    
  asset_service:
    table_name: "AssetService-${env}"
    partition_key: "pk"
    sort_key: "sk"
    billing_mode: "PAY_PER_REQUEST"
    global_secondary_indexes:
      - index_name: "GSI1"
        partition_key: "gsi1pk"
        sort_key: "gsi1sk"
    
  vulnerability_service:
    table_name: "VulnerabilityService-${env}"
    partition_key: "pk"
    sort_key: "sk"
    billing_mode: "PROVISIONED"
    read_capacity: 100
    write_capacity: 100
    auto_scaling:
      target_utilization: 70
      min_capacity: 10
      max_capacity: 1000
```

### 2. Neptune Graph Database Configuration

```yaml
# Neptune cluster for relationship mapping
neptune_cluster:
  cluster_identifier: "chariot-graph-${env}"
  engine: "neptune"
  engine_version: "1.3.0.0"
  instance_class: "db.r6g.large"
  instance_count: 3
  backup_retention_period: 7
  preferred_backup_window: "03:00-04:00"
  preferred_maintenance_window: "sun:04:00-sun:05:00"
  
  # Enable audit logging
  enable_cloudwatch_logs_exports:
    - "audit"
  
  # VPC configuration
  db_subnet_group_name: "neptune-subnet-group"
  vpc_security_group_ids:
    - "${database_security_group_id}"
    
  # Encryption
  storage_encrypted: true
  kms_key_id: "alias/neptune-encryption"
```

### 3. ElastiCache Redis Configuration

```yaml
# Redis cluster for caching and session management
elasticache_replication_group:
  replication_group_id: "chariot-cache-${env}"
  description: "Redis cluster for microservices"
  
  # Engine configuration
  engine: "redis"
  engine_version: "7.0"
  parameter_group_name: "default.redis7"
  
  # Cluster configuration
  num_cache_clusters: 3
  cache_node_type: "cache.r6g.large"
  port: 6379
  
  # High availability
  automatic_failover_enabled: true
  multi_az_enabled: true
  
  # Security
  transit_encryption_enabled: true
  at_rest_encryption_enabled: true
  auth_token: "${redis_auth_token}"
  
  # Backup configuration
  snapshot_retention_limit: 7
  snapshot_window: "03:00-04:00"
  
  # Subnet and security
  subnet_group_name: "redis-subnet-group"
  security_group_ids:
    - "${cache_security_group_id}"
```

## Cost Optimization Recommendations

### 1. Compute Cost Optimization

```yaml
cost_optimization_strategies:
  fargate_optimization:
    # Right-size Fargate tasks based on actual usage
    resource_monitoring:
      enabled: true
      recommendations: "weekly"
    
    # Use Fargate Spot for fault-tolerant workloads
    spot_allocation:
      batch_jobs: 80%
      background_tasks: 70%
      development_workloads: 90%
    
  ec2_optimization:
    # Mixed instance types for node groups
    spot_allocation: 70%
    instance_types:
      - "m6i.large"
      - "m5.large"
      - "m5a.large"
      - "m5n.large"
    
    # Scheduled scaling for predictable workloads
    scheduled_scaling:
      business_hours:
        schedule: "0 8 * * 1-5"
        desired_capacity: 10
      off_hours:
        schedule: "0 20 * * 1-5"
        desired_capacity: 3
```

### 2. Storage Cost Optimization

```yaml
storage_optimization:
  s3_lifecycle_policies:
    objects:
      - transition_to_ia: 30  # days
      - transition_to_glacier: 90  # days
      - expire: 2555  # 7 years
    
    logs:
      - transition_to_ia: 7   # days
      - transition_to_glacier: 30  # days
      - expire: 365  # 1 year
  
  ebs_optimization:
    volume_type: "gp3"  # 20% cheaper than gp2
    volume_monitoring: true
    unused_volume_cleanup: true
  
  dynamodb_optimization:
    billing_mode: "PAY_PER_REQUEST"  # For variable workloads
    reserved_capacity: true  # For predictable workloads
    table_classes:
      archive_data: "STANDARD_INFREQUENT_ACCESS"
```

### 3. Network Cost Optimization

```yaml
network_optimization:
  vpc_endpoints:
    # Eliminate NAT Gateway costs for AWS services
    services:
      - "s3"
      - "dynamodb"
      - "ecr.api"
      - "ecr.dkr"
      - "logs"
      - "monitoring"
    cost_savings: "60-80%"  # vs NAT Gateway
  
  cloudfront_distribution:
    # Reduce data transfer costs
    enabled: true
    cache_behaviors:
      static_content: "1 year"
      api_responses: "5 minutes"
    price_class: "PriceClass_100"  # US/Europe only
```

### 4. Monitoring and Alerts for Cost Control

```yaml
cost_monitoring:
  aws_budgets:
    - name: "EKS-Cluster-Budget"
      limit: 5000  # USD
      threshold: 80  # percent
      notification_email: "ops@chariot.com"
    
    - name: "Fargate-Compute-Budget"
      limit: 2000  # USD
      threshold: 85  # percent
      
  cloudwatch_alarms:
    - metric: "EstimatedCharges"
      threshold: 100  # USD daily
      action: "sns:cost-alert"
      
  cost_anomaly_detection:
    enabled: true
    sensitivity: "HIGH"
    notification_email: "finance@chariot.com"
```

### 5. Reserved Capacity and Savings Plans

```yaml
cost_commitments:
  compute_savings_plans:
    # 1-year commitment for predictable workloads
    term: "1year"
    payment_option: "No Upfront"
    commitment: "$1000/month"
    expected_savings: "17%"
  
  rds_reserved_instances:
    # Neptune reserved instances
    instance_class: "db.r6g.large"
    instance_count: 2
    term: "1year"
    expected_savings: "40%"
  
  elasticache_reserved_nodes:
    node_type: "cache.r6g.large"
    node_count: 2
    term: "1year"
    expected_savings: "43%"
```

## Performance Optimization

### 1. Latency Optimization Targets

```yaml
performance_targets:
  api_response_times:
    p50: "<100ms"
    p90: "<200ms"
    p99: "<500ms"
  
  throughput_targets:
    per_service: "1000 RPS"
    total_cluster: "10000 RPS"
  
  resource_utilization:
    cpu: "70%"
    memory: "80%"
    network: "60%"
```

### 2. Caching Strategy

```yaml
caching_layers:
  application_cache:
    # Redis for application-level caching
    ttl: "300s"  # 5 minutes
    hit_ratio_target: "90%"
    
  api_gateway_cache:
    # API Gateway response caching
    ttl: "60s"   # 1 minute
    cache_key_parameters:
      - "user_id"
      - "account_id"
      
  cloudfront_cache:
    # CDN for static assets
    ttl: "86400s"  # 24 hours
    compression: true
```

## Disaster Recovery and Business Continuity

### 1. Multi-AZ Deployment Strategy

```yaml
disaster_recovery:
  rto: "15 minutes"    # Recovery Time Objective
  rpo: "5 minutes"     # Recovery Point Objective
  
  backup_strategy:
    dynamodb:
      point_in_time_recovery: true
      cross_region_backup: true
    
    neptune:
      automated_backup: true
      backup_retention: 7  # days
      
    application_data:
      s3_cross_region_replication: true
      versioning: true
```

### 2. Health Checks and Monitoring

```yaml
health_monitoring:
  application_health:
    endpoint: "/health"
    interval: "30s"
    timeout: "5s"
    healthy_threshold: 2
    unhealthy_threshold: 3
    
  infrastructure_health:
    cloudwatch_metrics: true
    custom_metrics: true
    alerting_thresholds:
      cpu: "80%"
      memory: "85%"
      disk: "80%"
      network_errors: "1%"
```

## Security Considerations

### 1. Zero-Trust Network Architecture

```yaml
zero_trust_implementation:
  network_policies:
    default_deny: true
    explicit_allow: true
    
  service_authentication:
    mtls: "mandatory"
    jwt_validation: true
    api_key_rotation: "90 days"
    
  encryption:
    in_transit: "TLS 1.3"
    at_rest: "AES-256"
    key_management: "AWS KMS"
```

### 2. Compliance and Auditing

```yaml
compliance_controls:
  logging:
    api_calls: true
    data_access: true
    configuration_changes: true
    
  audit_trail:
    cloudtrail: true
    vpc_flow_logs: true
    dns_query_logs: true
    
  data_protection:
    pii_encryption: true
    data_classification: true
    retention_policies: true
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- VPC and network setup
- EKS cluster deployment
- Basic Fargate profiles
- Security groups and IAM roles

### Phase 2: Service Mesh (Weeks 5-8)
- Istio installation and configuration
- mTLS implementation
- Traffic management setup
- Security policies deployment

### Phase 3: Data Layer (Weeks 9-12)
- DynamoDB table creation
- Neptune cluster setup
- Redis cluster deployment
- Data migration planning

### Phase 4: Application Migration (Weeks 13-20)
- Lambda to container migration
- Service-by-service deployment
- Load testing and optimization
- Performance tuning

### Phase 5: Optimization (Weeks 21-24)
- Cost optimization implementation
- Monitoring and alerting setup
- Documentation and training
- Go-live preparation

## Cost Estimation

### Monthly Infrastructure Costs (Production)

| Component | Configuration | Monthly Cost (USD) |
|-----------|---------------|-------------------|
| **EKS Control Plane** | 1 cluster | $73 |
| **Fargate Compute** | 20 vCPU, 40GB RAM avg | $1,200 |
| **EC2 Spot Instances** | 10 x m5.large (70% spot) | $320 |
| **Application Load Balancer** | 2 ALBs | $45 |
| **NAT Gateway** | 3 AZs | $135 |
| **DynamoDB** | Pay-per-request, 1M ops/day | $300 |
| **Neptune** | 3 x db.r6g.large | $1,350 |
| **ElastiCache** | 3 x cache.r6g.large | $480 |
| **Data Transfer** | 1TB/month | $90 |
| **CloudWatch Logs** | 100GB/month | $50 |
| **S3 Storage** | 1TB standard | $23 |
| **VPC Endpoints** | 6 endpoints | $45 |
| **KMS Keys** | 10 keys | $10 |
| **Total** | | **$4,121** |

### Cost Optimization Potential

- **Spot Instances**: 60% savings on compute = $192/month
- **VPC Endpoints**: 70% NAT Gateway savings = $95/month
- **Reserved Instances**: 40% database savings = $732/month
- **Compute Savings Plan**: 17% Fargate savings = $204/month
- **Total Potential Savings**: $1,223/month (30% reduction)

### Optimized Monthly Cost: $2,898

This architecture provides a robust, scalable, and cost-effective foundation for the microservices platform while meeting all performance and security requirements.