@description('Base name used for all resources')
param appName string = 'hockeypong'

@description('Location for all resources')
param location string = resourceGroup().location

// Azure Container Registry — Basic SKU (cheapest), admin enabled for ACI pull
// ACI is NOT defined here — it's created/updated by the CI/CD workflow via
// `az container create`, which avoids the chicken-and-egg problem on first
// deploy (ACR is empty until the workflow pushes an image).
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('${appName}acr', '-', '')
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

@description('ACR login server URL')
output acrLoginServer string = acr.properties.loginServer

@description('ACR name')
output acrName string = acr.name
