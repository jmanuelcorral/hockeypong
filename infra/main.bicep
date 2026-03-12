@description('Name of the App Service web app')
param appName string = 'hockeypong'

@description('Location for all resources')
param location string = resourceGroup().location

@description('App Service Plan SKU')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v2'
  'P2v2'
  'P3v2'
])
param skuName string = 'B1'

@description('Node.js version for the runtime stack')
param nodeVersion string = '20-lts'

// App Service Plan (Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// App Service (Web App)
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      alwaysOn: true
      webSocketsEnabled: true
      http20Enabled: false // WebSocket upgrade doesn't work with HTTP/2 on Azure
      appCommandLine: 'node src/server/index.js'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '0' // Deploy via zip, not run-from-package for WebSocket compatibility
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false' // We install deps before deployment
        }
      ]
    }
  }
}

@description('The default hostname of the web app')
output webAppHostname string = webApp.properties.defaultHostName

@description('The resource ID of the web app')
output webAppResourceId string = webApp.id

@description('The name of the web app')
output webAppName string = webApp.name
