# Hockey Pong Infrastructure

Azure infrastructure and deployment configuration for Hockey Pong.

## Files

- **`main.bicep`** — Azure infrastructure definition (App Service + Plan)
- **`main.bicepparam`** — Default parameter values
- **`../.github/workflows/deploy.yml`** — CI/CD pipeline

## Architecture

- **App Service Plan:** Linux B1 SKU (supports WebSockets + alwaysOn)
- **Web App:** Node.js 20 LTS runtime
- **Region:** East US 2 (configurable)
- **WebSockets:** Enabled (required for multiplayer)
- **HTTP/2:** Disabled (incompatible with WebSocket upgrade)
- **AlwaysOn:** Enabled (prevents cold starts)

## Setup

### 1. Create Azure Service Principal

```bash
# Replace {subscription-id} and {resource-group-name} with your values
az ad sp create-for-rbac \
  --name "hockeypong-deploy" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group-name} \
  --sdk-auth
```

Copy the entire JSON output.

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret:

1. **`AZURE_CREDENTIALS`** — Paste the service principal JSON from step 1
2. **`AZURE_SUBSCRIPTION_ID`** — Your Azure subscription ID
3. **`AZURE_RG`** — Resource group name (e.g., `hockeypong-rg`)

### 3. Deploy

Push to `main` branch or manually trigger the workflow:

```bash
git add .
git commit -m "Add Azure infrastructure"
git push origin main
```

Or manually trigger from GitHub Actions tab → "Deploy to Azure" → Run workflow.

## Local Deployment (Manual)

### Deploy Infrastructure

```bash
# Create resource group
az group create --name hockeypong-rg --location eastus2

# Deploy Bicep template
az deployment group create \
  --resource-group hockeypong-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

### Deploy Application

```bash
# Build deployment package
npm ci --omit=dev
zip -r deploy.zip src/ package.json package-lock.json node_modules/

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group hockeypong-rg \
  --name hockeypong \
  --src deploy.zip
```

## Configuration

Edit `main.bicepparam` to change defaults:

```bicep
using './main.bicep'

param appName = 'my-custom-name'  // Change web app name
param skuName = 'B2'              // Upgrade to B2 for more resources
```

## Monitoring

- **Azure Portal:** View logs, metrics, and WebSocket connections
- **Log Stream:** `az webapp log tail --name hockeypong --resource-group hockeypong-rg`
- **Health Check:** Visit `https://hockeypong.azurewebsites.net/health` (if implemented)

## Troubleshooting

### WebSocket connections failing
- Verify WebSockets are enabled: Azure Portal → App Service → Configuration → General settings
- Check HTTP/2 is **disabled** (breaks WebSocket upgrade)
- Verify alwaysOn is **enabled** (prevents cold starts)

### Deployment fails
- Check GitHub Actions logs for error messages
- Verify all three GitHub secrets are configured correctly
- Ensure service principal has Contributor role on resource group

### App not starting
- Check logs: `az webapp log tail --name hockeypong --resource-group hockeypong-rg`
- Verify Node.js version: App Service → Configuration → General settings
- Ensure startup command: `node src/server/index.js`

## Cost

- **B1 App Service Plan:** ~$13/month
- **Bandwidth:** First 100 GB free, then $0.087/GB

To reduce costs:
- Use Free tier (F1) for development (no WebSocket alwaysOn, expect cold starts)
- Stop App Service when not in use: `az webapp stop --name hockeypong --resource-group hockeypong-rg`
