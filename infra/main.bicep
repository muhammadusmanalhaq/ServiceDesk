param location string = resourceGroup().location
param deployApp bool = false
param appName string = 'ca-servicedesk-api'
param imageName string = 'mcr.microsoft.com/dotnet/aspnet:8.0'

var uniqueSuffix = uniqueString(resourceGroup().id)
var kvName = 'kv-sd-${uniqueSuffix}'

// 1. Log Analytics Workspace
// COST SAFETY: daily cap of 0.1 GB (100 MB) prevents unexpected ingestion charges.
// The Azure for Students free tier grants 5 GB/month. At 100 MB/day we stay well within that.
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-servicedesk-${uniqueSuffix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    workspaceCapping: {
      dailyQuotaGb: json('0.1') // 100 MB/day hard cap
    }
  }
}

// 1.5. Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-servicedesk-${uniqueSuffix}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// 2. Container Apps Environment (Consumption plan — workloadProfiles omitted = Consumption tier, no fixed cost)
// minReplicas: 0 on the Container App below ensures scale-to-zero.
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-servicedesk-${uniqueSuffix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// 3. User-Assigned Managed Identity for the API
resource apiIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${appName}'
  location: location
}

// 4. Azure Key Vault (Using modern RBAC authorization)
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// 5. Grant the Managed Identity "Key Vault Secrets User" over the Key Vault
var keyVaultSecretsUserRole = '4633458b-17de-408a-b874-0445c86b69e6' // Built-in Azure Role ID
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, apiIdentity.id, keyVaultSecretsUserRole)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRole)
    principalId: apiIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// 5.5 Storage Account for Attachments
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stsd${uniqueSuffix}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
  }
}

// 6. Container App (Deployed ONLY when deployApp == true)
resource apiApp 'Microsoft.App/containerApps@2023-05-01' = if (deployApp) {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${apiIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      secrets: [
        {
          name: 'db-connection-default'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/ConnectionStrings--Default'
          identity: apiIdentity.id
        }
        {
          name: 'db-connection-system'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/ConnectionStrings--System'
          identity: apiIdentity.id
        }
        {
          name: 'jwt-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/Jwt--Key'
          identity: apiIdentity.id
        }
        {
          name: 'appinsights-connection'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/ApplicationInsights--ConnectionString'
          identity: apiIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: imageName
          env: [
            {
              name: 'ConnectionStrings__Default'
              secretRef: 'db-connection-default'
            }
            {
              name: 'ConnectionStrings__System'
              secretRef: 'db-connection-system'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://0.0.0.0:8080'
            }
            {
              name: 'Jwt__Key'
              secretRef: 'jwt-key'
            }
            {
              name: 'Jwt__Issuer'
              value: 'servicedesk-api'
            }
            {
              name: 'Jwt__Audience'
              value: 'servicedesk-ui'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection'
            }
            {
              name: 'Storage__ConnectionString'
              value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0 // Scale to zero!
        maxReplicas: 1
      }
    }
  }
  dependsOn: [
    kvRoleAssignment // Wait for identity to get Key Vault access before booting the app
  ]
}

output keyVaultName string = keyVault.name
output appInsightsConnectionString string = applicationInsights.properties.ConnectionString
