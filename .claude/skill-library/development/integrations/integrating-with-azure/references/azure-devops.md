# Azure DevOps Pipeline Patterns

CI/CD pipeline configuration for Azure DevOps with YAML syntax and best practices.

---

## Basic Pipeline Structure

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - docs/*
      - README.md

pool:
  vmImage: "ubuntu-latest"

variables:
  buildConfiguration: "Release"

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: UseDotNet@2
            inputs:
              version: "8.x"

          - task: DotNetCoreCLI@2
            inputs:
              command: "restore"

          - task: DotNetCoreCLI@2
            inputs:
              command: "build"
              arguments: "--configuration $(buildConfiguration)"

          - task: DotNetCoreCLI@2
            inputs:
              command: "test"
              arguments: '--configuration $(buildConfiguration) --collect:"XPlat Code Coverage"'

          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: "Cobertura"
              summaryFileLocation: "$(Agent.TempDirectory)/**/coverage.cobertura.xml"

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProduction
        environment: "production"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: "MyAzureConnection"
                    appName: "myWebApp"
                    package: "$(Pipeline.Workspace)/drop/*.zip"
```

---

## Authentication

### Service Connection (Recommended)

**Federated credential** (no secrets):

```yaml
- task: AzureCLI@2
  inputs:
    azureSubscription: "MyServiceConnection" # Configured in Azure DevOps
    scriptType: "bash"
    scriptLocation: "inlineScript"
    inlineScript: |
      az account show
```

### Service Principal (Legacy)

Environment variables configured in pipeline:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

---

## Related Documentation

- [Service Principal](service-principal.md) - Service principal configuration
- For complete pipeline examples, see: `.claude/.output/research/2026-01-04-211427-azure-integration/` (search for "Azure DevOps")
